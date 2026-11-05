// Voices acceptance: real page with isolated GET fixtures; all other requests denied.
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
const profile = path.resolve('node_modules/.cache', `catalog-browser-${process.pid}`);
mkdirSync(profile, { recursive: true });
let entrySource = '';
const server = await createServer({ configFile: false, plugins: [react(), {
  name: 'isolated-catalog-fixture',
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
  import { AdminVoicesPage } from '/src/pages/AdminVoicesPage.tsx'; import { AdminLanguagesPage } from '/src/pages/AdminLanguagesPage.tsx';
  import { AdminAppShell } from '/src/components/layout/AdminAppShell.tsx';
  import '/src/styles/global.css'; import '/src/styles/admin-shell.css';
  window.fixtureCalls=[]; window.fixtureDelay=300; window.failLanguages=true; window.failVoices=false;window.emptyLanguages=false;window.emptyVoices=false;
  const languages=[{id:'en',code:'en',name:'English',nativeName:'English',isActive:true,voiceCount:2},{id:'vi',code:'vi',name:'Vietnamese',nativeName:'Vietnamese',isActive:false,voiceCount:1}];
  const voices=[{id:'v1',name:'Kore',language:{id:'en'},gender:'FEMALE',provider:'gemini',providerVoiceId:'Kore',description:'Museum voice',isActive:true},{id:'v2',name:'Fenrir',language:{id:'en',code:'en',name:'English from API'},gender:'MALE',provider:'gemini',providerVoiceId:'Fenrir',description:'Narration',isActive:true},{id:'v3',name:'Unknown voice',language:null,gender:'NEUTRAL',provider:'custom',providerVoiceId:'custom-id',description:'No language supplied',isActive:false}];
  window.fetch=async(url,init={})=>{
    const u=new URL(url,location.origin),lang=u.pathname==='/api/admin/languages';
    const call={method:init.method||'GET',path:u.pathname,aborted:false,resolved:false};window.fixtureCalls.push(call);
    init.signal?.addEventListener('abort',()=>{call.aborted=true});
    if(call.method!=='GET'||!['/api/admin/languages','/api/admin/voices'].includes(u.pathname))throw Error('REQUEST_DENIED');
    const fail=lang?window.failLanguages:window.failVoices,empty=lang?window.emptyLanguages:window.emptyVoices;
    await new Promise(r=>setTimeout(r,window.fixtureDelay));call.resolved=true;
    if(fail)return new Response(JSON.stringify({success:false,error:{code:'FIXTURE_ERROR',message:'Read failed'}}),{status:500});
    return new Response(JSON.stringify({success:true,data:lang?{languages:empty?[]:languages}:{voices:empty?[]:voices}}));
  };
  const h=React.createElement;
  ReactDOM.createRoot(document.getElementById('root')).render(h(MemoryRouter,{initialEntries:['/voices']},h(Routes,null,h(Route,{element:h(AdminAppShell)},h(Route,{path:'/voices',element:h(AdminVoicesPage)}),h(Route,{path:'/languages',element:h(AdminLanguagesPage)})))));
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
  const search='input[type=search]';
  const key=async(value,code,vk,modifiers=0)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:value,code,windowsVirtualKeyCode:vk,modifiers,...(value==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key:value,code,windowsVirtualKeyCode:vk,modifiers});};
  const type=async(value)=>{await evaluate(`document.querySelector('${search}').focus();document.querySelector('${search}').select()`);await send('Input.insertText',{text:value});};
  const clickText=async(text)=>evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);
  const navigate=async(route)=>{await evaluate(`document.querySelector('a[href="${route}"]').click()`);await wait(`!!document.querySelector('.${route==='/voices'?'voices':'languages'}-page')`);};
  const ready=()=>wait("!!document.querySelector('.catalog-table tbody tr') && !document.querySelector('[aria-busy=true]')");
  await evaluate('window.searchBefore=document.querySelector("input[type=search]");void 0');
  await type('Kore');
  await ready();
  assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);
  assert.equal(await evaluate("document.querySelectorAll('.catalog-table tbody tr').length"),1);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.catalog-table td')).fontSize"),'14px');
  await wait("!!document.querySelector('.catalog-supplementary button')");
  assert.ok(await evaluate("document.querySelector('.catalog-table tbody').textContent.includes('en')"));
  assert.ok(await evaluate("!document.querySelector('.catalog-table tbody').textContent.includes('English')"));
  await type('Fenrir');await ready();assert.equal(await evaluate("document.querySelector('.catalog-language').textContent"),'English from API');await type('Kore');await ready();
  const voicesBefore=await evaluate("window.fixtureCalls.filter(c=>c.path==='/api/admin/voices').length");
  await evaluate('window.failLanguages=false');await clickText('Thử lại ngôn ngữ');
  await wait("document.querySelector('.catalog-language')?.textContent==='English'");
  assert.equal(await evaluate("window.fixtureCalls.filter(c=>c.path==='/api/admin/voices').length"),voicesBefore);
  await type('No match');await wait("!!document.querySelector('.empty-state')");assert.ok(await evaluate("document.querySelector('.empty-state h2').textContent.includes('phù hợp')"));
  await type('');await ready();
  assert.ok(await evaluate("document.querySelector('.catalog-table tbody').textContent.includes('custom')"));
  assert.ok(await evaluate("document.querySelector('.catalog-table tbody').textContent.includes('Chưa có thông tin ngôn ngữ')"));
  assert.equal(await evaluate("document.querySelector('audio')"),null);
  for(const route of ['/languages','/voices']){
    await navigate(route);await ready();
    const calls=await evaluate('window.fixtureCalls.length');await type(route==='/languages'?'English':'Kore');await ready();
    assert.equal(await evaluate('window.fixtureCalls.length'),calls,'search remains local');
    for(const width of [375,768,1024,1440]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await evaluate('scrollTo(0,0)');
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'overflow '+route+width);
      await evaluate('document.querySelector(".admin-data-table-scroll").focus()');
      assert.equal(await evaluate('document.activeElement.getAttribute("role")'),'region');
      const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(path.resolve(`node_modules/.cache/catalog-${route.slice(1)}-${width}.png`),Buffer.from(shot.data,'base64'));
    }
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await type('');await key('Tab','Tab',9);
    assert.equal(await evaluate('document.activeElement.classList.contains("admin-data-table-scroll")'),true);
    assert.ok(await evaluate('parseFloat(getComputedStyle(document.querySelector("input[type=search]")).transitionDuration)<=0.00001'));
  }
  await navigate('/languages');await ready();
  await evaluate('window.failVoices=true');await navigate('/voices');await wait("!!document.querySelector('.admin-error-state')");
  assert.ok(await evaluate("!document.querySelector('.catalog-supplementary')"));
  const langsBefore=await evaluate("window.fixtureCalls.filter(c=>c.path==='/api/admin/languages').length");
  await type('Kore');await evaluate('window.failVoices=false');await clickText('Thử lại');await ready();
  assert.equal(await evaluate("document.querySelector('input[type=search]').value"),'Kore');
  assert.equal(await evaluate("window.fixtureCalls.filter(c=>c.path==='/api/admin/languages').length"),langsBefore);
  await evaluate('window.failLanguages=true');await navigate('/languages');await wait("!!document.querySelector('.admin-error-state')");
  await type('English');await evaluate('window.failLanguages=false');await clickText('Thử lại');await ready();
  assert.equal(await evaluate("document.querySelector('input[type=search]').value"),'English');
  // An obsolete failure and success resolve after a new route instance; both are ignored.
  for(const fail of [true,false]){
    await evaluate(`window.fixtureDelay=900;window.failVoices=${fail}`);await navigate('/voices');
    await wait("window.fixtureCalls.at(-1).path==='/api/admin/languages'");
    await navigate('/languages');await evaluate('window.fixtureDelay=100;window.failVoices=false');await navigate('/voices');await ready();
    await pause(1000);assert.ok(await evaluate("!!document.querySelector('.voices-page .catalog-table') && !document.querySelector('.voices-page .admin-error-state')"));
    assert.ok(await evaluate("window.fixtureCalls.some(c=>c.path==='/api/admin/voices'&&c.aborted&&c.resolved)"));
  }
  await evaluate('window.emptyLanguages=true;window.emptyVoices=true');
  await navigate('/languages');await wait("!!document.querySelector('.empty-state')");
  assert.equal(await evaluate("document.querySelector('.empty-state h2').textContent"),'Chưa có ngôn ngữ.');
  await navigate('/voices');await wait("!!document.querySelector('.empty-state')");
  assert.equal(await evaluate("document.querySelector('.empty-state h2').textContent"),'Chưa có giọng đọc.');
  assert.ok(await evaluate("window.fixtureCalls.every(c=>c.method==='GET'&&['/api/admin/languages','/api/admin/voices'].includes(c.path))"));
  console.log('PASS: languages/voices independent failures and retry, local search, stable focus/loading, stale responses on route remount ignored, empty/no results, four widths, keyboard, reduced motion; fixture GET only.');

} finally {
  socket?.close(); browser?.kill(); await server.close();
}
