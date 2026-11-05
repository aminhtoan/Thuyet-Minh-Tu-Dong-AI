// Jobs acceptance: real page with isolated GET fixtures; all other requests denied.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const browserPath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);
assert.ok(browserPath, 'Chrome or Edge must already be installed');
const profile = path.resolve('node_modules/.cache', `visit-layout-browser-${process.pid}`);
mkdirSync(profile, { recursive: true });
let entrySource = '';
const server = await createServer({ configFile: false, plugins: [react(), {
  name: 'isolated-visit-layout-fixture',
  resolveId(id) { if (id === '/__navigation-entry.jsx') return '\0navigation-fixture'; },
  load(id) { if (id === '\0navigation-fixture') return entrySource; },
}], server: { host: '127.0.0.1', port: 0 }, appType: 'custom' });
server.middlewares.use(async (req, res, next) => {
  if (req.url !== '/__navigation-test') return next();
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div>
  <script type="module">
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import { MemoryRouter, Routes, Route } from 'react-router-dom';
  import { AdminVisitQrPage } from '/src/pages/AdminVisitQrPage.tsx';
  import { AdminAppShell } from '/src/components/layout/AdminAppShell.tsx';
  import '/src/styles/global.css'; import '/src/styles/admin-shell.css';
  window.fixtureCalls=[];window.fixtureFail=false;window.fixtureEmpty=false;
  const visitRows=Array.from({length:40},(_,i)=>({id:'q'+i,source:'qr_scan',ipAddress:'192.0.2.'+i,deviceType:'mobile',os:'Android',browser:'Chrome',createdAt:'2026-01-01T10:00:00Z'}));
  const profiles=Array.from({length:15},(_,i)=>({id:'v'+i,visitorId:'v'+i,visitorCode:'V'+i,ipAddress:'192.0.2.'+i,deviceType:'mobile',os:'Android',browser:'Chrome',totalScans:i+1,totalListens:i+2,language:'English',languageCode:'en',lastListenedAt:'2026-01-01T10:00:00Z',firstVisitAt:'2026-01-01T10:00:00Z',lastVisitAt:'2026-01-01T10:00:00Z'}));
  window.fetch=async(url,init={})=>{
    const u=new URL(url,location.origin),q=Object.fromEntries(u.searchParams);const call={method:init.method||'GET',path:u.pathname,query:q,aborted:false,resolved:false};window.fixtureCalls.push(call);
    init.signal?.addEventListener('abort',()=>{call.aborted=true});
    if(call.method!=='GET'||u.pathname!=='/api/admin/visit-qr')throw Error('REQUEST_DENIED');
    const fail=window.fixtureFail,empty=window.fixtureEmpty;
    await new Promise(r=>setTimeout(r,q.search==='slow'||q.search==='slow-error'?800:200));call.resolved=true;
    if(fail||q.search==='slow-error')return new Response(JSON.stringify({success:false,error:{code:'TEST',message:'Offline'}}),{status:500});
    const items=empty?[]:visitRows.filter(x=>!q.search||x.ipAddress.includes(q.search));const page=+q.page,limit=+q.limit;
    const data={items:items.slice((page-1)*limit,page*limit),summary:{totalListens:88,listenStats:{total:88,web:50,mobile:38},today:12,todayUnique:7,total:250,totalUnique:90},pagination:{page,limit,total:items.length,totalPages:Math.ceil(items.length/limit)},topVisitors:empty?[]:profiles,visitors:empty?[]:profiles};
    return new Response(JSON.stringify({success:true,data}));
  };
  const h=React.createElement;
  ReactDOM.createRoot(document.getElementById('root')).render(h(MemoryRouter,{initialEntries:['/visit-qr']},h(Routes,null,h(Route,{element:h(AdminAppShell)},h(Route,{path:'/visit-qr',element:h(AdminVisitQrPage)})))));
  </script></body></html>`;
  entrySource = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  const page = html.replace(/<script type="module">[\s\S]*?<\/script>/, '<script type="module" src="/__navigation-entry.jsx"></script>');
  try { res.setHeader('Content-Type', 'text/html'); res.end(await server.transformIndexHtml(req.url, page)); }
  catch { res.statusCode = 500; res.end('FIXTURE_FAILED'); }
});
let browser, socket;
try {
  // Prebundle through the normal package imports before opening the fixture.
  await server.listen();
  const address = server.httpServer.address();
  browser = spawn(browserPath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-networking', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  const activePort = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; !existsSync(activePort) && i < 100; i++) await pause(100);
  assert.ok(existsSync(activePort), 'Browser debugging port');
  const port = readFileSync(activePort, 'utf8').split('\n')[0];
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const entry = pending.get(message.id); if (!entry) return;
    pending.delete(message.id); clearTimeout(entry.timer);
    if (message.error) entry.reject(Error(message.error.message)); else entry.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.text);
    return r.result.value;
  };
  const wait = async expression => {
    for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await pause(100); }
    throw Error(`Browser condition timed out: ${expression}; focus=${await evaluate('document.activeElement?.outerHTML')}`);
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${address.port}/__navigation-test` });
  await wait("!!document.querySelector('.visit-page')");
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const key=async(value,code,vk,modifiers=0)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:value,code,windowsVirtualKeyCode:vk,modifiers,...(value==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key:value,code,windowsVirtualKeyCode:vk,modifiers});};
  const ready=()=>wait("!!document.querySelector('.visit-qr-table tbody tr') && !document.querySelector('.visit-page [aria-busy=true]')");
  const change=async(selector,value)=>evaluate(`(()=>{const x=document.querySelector(${JSON.stringify(selector)});const proto=x.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(x,${JSON.stringify(value)});x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const toggle="button[aria-controls='visit-advanced-filters']";
  await ready();
  assert.equal(await evaluate("[...document.querySelectorAll('.visit-qr-stats .stat-card strong')].map(x=>x.textContent).join(',')"),'88,12,7,250,90');
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(toggle)}).getAttribute('aria-expanded')`),'false');
  assert.equal(await evaluate("document.querySelector('#visit-advanced-filters').hidden"),true);
  for(const width of [375,768,1024,1280,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await evaluate('scrollTo(0,0)');
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'overflow '+width);
    assert.ok(await evaluate("document.querySelector('.visit-qr-stats').getBoundingClientRect().bottom<=document.querySelector('.visit-controls').getBoundingClientRect().top"));
    assert.equal(await evaluate("new Set([...document.querySelectorAll('.visit-qr-stats .stat-card')].map(x=>x.getBoundingClientRect().height)).size"),1,'equal height '+width);
    if(width>=1280){
      assert.equal(await evaluate("new Set([...document.querySelectorAll('.visit-qr-stats .stat-card')].map(x=>x.getBoundingClientRect().top)).size"),1,'five KPI row');
      assert.equal(await evaluate("new Set([...document.querySelectorAll('.visit-qr-filters :is(input,select)')].map(x=>x.getBoundingClientRect().top)).size"),1,'primary filters row');
    }
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(path.resolve(`node_modules/.cache/visit-layout-${width}.png`),Buffer.from(shot.data,'base64'));
  }
  await evaluate(`document.querySelector(${JSON.stringify(toggle)}).focus()`);await key('Enter','Enter',13);
  assert.equal(await evaluate("document.querySelector('#visit-advanced-filters').hidden"),false);
  await evaluate("document.querySelector('#visit-advanced-filters select').focus()");
  await change('#visit-advanced-filters select','Android');await wait("!!document.querySelector('.visit-page [aria-busy=true]')");assert.equal(await evaluate("document.activeElement===document.querySelector('#visit-advanced-filters select')"),true);await ready();assert.equal(await evaluate('window.fixtureCalls.at(-1).query.os'),'Android');
  await change('#visit-advanced-filters input[type=date]','2026-01-01');await ready();
  await change('#visit-advanced-filters label:last-child input','2026-01-31');await ready();
  assert.equal(await evaluate('window.fixtureCalls.at(-1).query.startDate'),'2026-01-01');
  assert.equal(await evaluate('window.fixtureCalls.at(-1).query.endDate'),'2026-01-31');
  const calls=await evaluate('window.fixtureCalls.length');
  await evaluate(`document.querySelector(${JSON.stringify(toggle)}).click()`);
  assert.equal(await evaluate('window.fixtureCalls.length'),calls,'collapse does not fetch/reset');
  assert.equal(await evaluate("document.querySelector('#visit-advanced-filters').hidden"),true);
  assert.ok(await evaluate("document.querySelector('.visit-advanced-count').textContent.includes('3')"));
  await evaluate(`document.querySelector(${JSON.stringify(toggle)}).click()`);
  assert.equal(await evaluate("document.querySelector('#visit-advanced-filters select').value"),'Android');
  assert.equal(await evaluate("document.querySelector('#visit-advanced-filters input').value"),'2026-01-01');
  await evaluate(`document.querySelector(${JSON.stringify(toggle)}).click()`);
  await change('.visit-qr-filters select','qr_scan');await ready();assert.equal(await evaluate('window.fixtureCalls.at(-1).query.source'),'qr_scan');
  await change('.visit-qr-filters label:last-child select','mobile');await ready();assert.equal(await evaluate('window.fixtureCalls.at(-1).query.deviceType'),'mobile');
  await evaluate("document.querySelector('.visit-qr-filters label:last-child select').focus()");await key('Tab','Tab',9);
  assert.equal(await evaluate(`document.activeElement===document.querySelector(${JSON.stringify(toggle)})`),true);
  await key('Tab','Tab',9,8);assert.equal(await evaluate("document.activeElement.value"),'mobile');
  for(const [index,value] of [[0,'7'],[1,'14'],[2,'30'],[3,undefined]]){
    await evaluate(`document.querySelectorAll('.visitor-tab-btn')[${index}].focus()`);await key('Enter','Enter',13);await ready();
    assert.equal(await evaluate('window.fixtureCalls.at(-1).query.visitorDays'),value);
    assert.equal(await evaluate('window.fixtureCalls.at(-1).query.startDate'),'2026-01-01');
    assert.equal(await evaluate('window.fixtureCalls.at(-1).query.os'),'Android');
    assert.equal(await evaluate(`document.querySelectorAll('.visitor-tab-btn')[${index}].getAttribute('aria-pressed')`),'true');
  }
  await evaluate("window.searchBefore=document.querySelector('#visit-search');window.searchBefore.focus();void 0");await send('Input.insertText',{text:'192.0.2.'});
  await wait("!!document.querySelector('.visit-page [aria-busy=true]')");assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);await ready();assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);
  assert.equal(await evaluate('window.fixtureCalls.at(-1).query.search'),'192.0.2.');
  await evaluate("[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Làm mới').click()");await ready();
  assert.equal(await evaluate('window.fixtureCalls.at(-1).query.startDate'),'2026-01-01');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});assert.ok(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"));
  assert.equal(await evaluate("[...document.querySelectorAll('.visit-qr-stats .stat-card strong')].map(x=>x.textContent).join(',')"),'88,12,7,250,90');
  assert.ok(await evaluate("window.fixtureCalls.every(c=>c.method==='GET'&&c.path==='/api/admin/visit-qr')"));
  console.log('PASS: five unchanged KPI before compact filters, desktop row/equal heights, five widths, advanced keyboard/retain values/active count, independent listen periods, all GET filter params, refresh/focus/reduced motion; fixture only.');

} finally {
  socket?.close(); browser?.kill(); await server.close();
}
