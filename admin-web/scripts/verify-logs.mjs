// Logs acceptance: real page with isolated GET fixtures; all other requests denied.
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
const profile = path.resolve('node_modules/.cache', `logs-browser-${process.pid}`);
mkdirSync(profile, { recursive: true });
let entrySource = '';
const server = await createServer({ configFile: false, plugins: [react(), {
  name: 'isolated-logs-fixture',
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
  import { AdminLogsPage } from '/src/pages/AdminLogsPage.tsx';
  import { AdminAppShell } from '/src/components/layout/AdminAppShell.tsx';
  import '/src/styles/global.css'; import '/src/styles/admin-shell.css';
  window.fixtureCalls=[]; window.fixtureDelay=250; window.fixtureEmpty=false; window.fixtureFail=false;
  const rows=Array.from({length:1000},(_,i)=>({id:'log-'+i,actor:i%2?{id:'u',fullName:'Editor '+i,role:'ADMIN'}:null,action:'EVENT_'+i,entityType:i%2?'Project':'User',entityId:'entity-'+i,description:'Museum event '+String(i).padStart(4,'0')+' '+('Long detail <script> text & preserved. '+String(i)+'\\n').repeat(100),createdAt:'2026-01-01T10:00:00Z'}));
  window.fixtureRows=rows;
  window.fetch=async(url,init={})=>{
    const u=new URL(url,location.origin);const q=Object.fromEntries(u.searchParams);
    const call={method:init.method||'GET',path:u.pathname,query:q,aborted:false,resolved:false};window.fixtureCalls.push(call);
    init.signal?.addEventListener('abort',()=>{call.aborted=true});
    if(call.method!=='GET'||u.pathname!=='/api/admin/logs')throw Error('REQUEST_DENIED');
    const fail=window.fixtureFail,empty=window.fixtureEmpty;
    // Intentionally ignore AbortSignal so obsolete success/error still arrives.
    await new Promise(r=>setTimeout(r,q.search==='slow'||q.search==='slow-error'?800:window.fixtureDelay));
    call.resolved=true;
    if(fail||q.search==='slow-error')return new Response(JSON.stringify({success:false,error:{code:'TEST_ERROR',message:'Offline'}}),{status:500});
    const items=empty?[]:rows.filter(x=>(!q.search||x.description.includes(q.search))&&(!q.entityType||x.entityType===q.entityType)&&(!q.role||x.actor?.role===q.role));
    const page=Number(q.page),limit=Number(q.limit),total=items.length;
    return new Response(JSON.stringify({success:true,data:{items:items.slice((page-1)*limit,page*limit),pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}}}),{status:200});
  };
  const h=React.createElement;
  ReactDOM.createRoot(document.getElementById('root')).render(h(MemoryRouter,{initialEntries:['/logs']},h(Routes,null,h(Route,{element:h(AdminAppShell)},h(Route,{path:'/logs',element:h(AdminLogsPage)})))));
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
  await wait("!!document.querySelector('input[type=search]')");
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const search='#log-search';
  const waitReady=()=>wait("!!document.querySelector('.logs-table tbody tr') && !document.querySelector('.logs-page [aria-busy=true]')");
  const key=async(value,code,vk,modifiers=0)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:value,code,windowsVirtualKeyCode:vk,modifiers,...(value==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key:value,code,windowsVirtualKeyCode:vk,modifiers});};
  const type=async(value)=>{await evaluate(`document.querySelector('${search}').focus();document.querySelector('${search}').select()`);await send('Input.insertText',{text:value});};
  const select=async(index,value)=>evaluate(`(()=>{const s=document.querySelectorAll('.logs-filters select')[${index}];s.value='${value}';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const clickText=async(text)=>evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);
  await waitReady();
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.logs-table td')).fontSize"),'14px');
  assert.ok(await evaluate("document.querySelector('.logs-description').textContent.length<=161"));
  await evaluate(`window.searchBefore=document.querySelector('${search}');void 0`);
  await type('Museum');await wait("!!document.querySelector('.logs-table-placeholder')");
  assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);
  await waitReady();assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);
  await select(0,'PROJECT');await waitReady();assert.equal(await evaluate("window.fixtureCalls.at(-1).query.entityType"),'Project');
  await select(1,'ADMIN');await waitReady();assert.equal(await evaluate("window.fixtureCalls.at(-1).query.role"),'ADMIN');
  await select(2,'7');await waitReady();assert.equal(await evaluate("window.fixtureCalls.at(-1).query.days"),'7');
  await evaluate("document.querySelector('button[aria-label=\"Trang 2\"]').click()");await waitReady();assert.equal(await evaluate("window.fixtureCalls.at(-1).query.page"),'2');
  assert.ok(await evaluate("document.querySelectorAll('.admin-pagination button').length<=11"));
  for(const stale of ['slow','slow-error']){
    await type(stale);await wait(`window.fixtureCalls.at(-1).query.search==='${stale}'`);
    await type('Museum');await waitReady();
    await wait(`window.fixtureCalls.findLast(c=>c.query.search==='${stale}').resolved`);
    assert.equal(await evaluate(`window.fixtureCalls.findLast(c=>c.query.search==='${stale}').aborted`),true);
    assert.ok(await evaluate("!!document.querySelector('.logs-table tbody tr') && !document.querySelector('.admin-error-state')"));
  }
  const open=async()=>{
    await evaluate("window.openerButton=document.querySelector('.logs-table tbody button');window.openerButton.focus();window.openerButton.click()");
    await wait("document.querySelector('.admin-dialog')?.open");
  };
  await open();
  assert.equal(await evaluate("document.activeElement.classList.contains('logs-detail-content')"),true);
  assert.equal(await evaluate("[...document.querySelectorAll('.logs-detail-content dd')].at(-1).textContent===window.fixtureRows[1].description"),true);
  assert.equal(await evaluate("document.querySelector('.logs-detail-content script')===null"),true);
  await key('Tab','Tab',9,8);assert.equal(await evaluate("document.activeElement.tagName"),'BUTTON');
  await key('Tab','Tab',9);assert.equal(await evaluate("document.activeElement.classList.contains('logs-detail-content')"),true);
  await key('Escape','Escape',27);await wait("!document.querySelector('.admin-dialog')");assert.equal(await evaluate('document.activeElement===window.openerButton'),true);
  for(const width of [375,768,1024,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
    await evaluate('scrollTo(0,0)');
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'page overflow '+width);
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(path.resolve(`node_modules/.cache/logs-ui-${width}.png`),Buffer.from(shot.data,'base64'));
    await open();
    assert.ok(await evaluate("document.querySelector('.admin-dialog').getBoundingClientRect().width<=innerWidth"));
    assert.ok(await evaluate("document.querySelector('.logs-detail-content').scrollHeight>document.querySelector('.logs-detail-content').clientHeight"));
    assert.ok(await evaluate("document.querySelector('.admin-dialog').scrollWidth<=document.querySelector('.admin-dialog').clientWidth"));
    await key('Escape','Escape',27);await wait("!document.querySelector('.admin-dialog')");
  }
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.ok(await evaluate("parseFloat(getComputedStyle(document.querySelector('.logs-filters input')).transitionDuration)<=0.00001"));
  await evaluate('window.fixtureFail=true');await type('Offline');await wait("!!document.querySelector('.admin-error-state')");assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);
  await evaluate('window.fixtureFail=false');await clickText('Thử lại');await wait("document.querySelector('.empty-state h2')?.textContent==='Không tìm thấy nhật ký phù hợp.'");
  assert.equal(await evaluate("window.fixtureCalls.at(-1).query.search"),'Offline');
  await evaluate('window.fixtureEmpty=true');await clickText('Đặt lại');await wait("document.querySelector('.empty-state h2')?.textContent==='Chưa có nhật ký hệ thống.'");
  assert.equal(await evaluate("window.fixtureCalls.every(c=>c.method==='GET'&&c.path==='/api/admin/logs')"),true);
  console.log('PASS: logs search/category/role/days/page, stable focus/loading, stale success/error ignored, dialog Tab/ShiftTab/Escape/focus return, exact long text, four widths and reduced motion; fixture GET only.');

} finally {
  socket?.close(); browser?.kill(); await server.close();
}
