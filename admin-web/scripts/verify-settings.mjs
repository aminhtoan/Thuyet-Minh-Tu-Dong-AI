// Settings acceptance: real page with isolated GET fixtures; all other requests denied.
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
const profile = path.resolve('node_modules/.cache', `settings-browser-${process.pid}`);
mkdirSync(profile, { recursive: true });
let entrySource = '';
const server = await createServer({ configFile: false, plugins: [react(), {
  name: 'isolated-settings-fixture',
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
  import { AdminSettingsPage } from '/src/pages/AdminSettingsPage.tsx';
  import { AdminAppShell } from '/src/components/layout/AdminAppShell.tsx';
  import '/src/styles/global.css'; import '/src/styles/admin-shell.css';
  window.fixtureCalls=[];window.fixtureFail=true;window.fixtureDelay=200;
  window.fixtureValue={editable:false,environment:'development',upload:{maxSizeMb:0,supportedMediaTypes:['video/mp4','audio/wav']},authentication:{accessTokenTtl:'',refreshTokenTtl:null},processing:{mode:'synchronous',ffmpegBinarySource:'configured-path',ffprobeBinarySource:'system-path',sttProviderConfigured:false,translationProviderConfigured:true,ttsProviderConfigured:false},apiKey:'DO_NOT_RENDER_UNKNOWN',database:{uri:'mongodb://DO_NOT_RENDER_NESTED'}};
  window.fetch=async(url,init={})=>{
    const u=new URL(url,location.origin);const call={method:init.method||'GET',path:u.pathname,aborted:false};window.fixtureCalls.push(call);
    init.signal?.addEventListener('abort',()=>{call.aborted=true});
    if(call.method!=='GET'||u.pathname!=='/api/admin/settings')throw Error('REQUEST_DENIED');
    const fail=window.fixtureFail,value=window.fixtureValue;
    await new Promise(r=>setTimeout(r,window.fixtureDelay));
    return fail?new Response(JSON.stringify({success:false,error:{code:'FIXTURE_ERROR',message:'DO_NOT_RENDER_ERROR_SECRET'}}),{status:500}):new Response(JSON.stringify({success:true,data:{settings:value}}));
  };
  const h=React.createElement;
  ReactDOM.createRoot(document.getElementById('root')).render(h(MemoryRouter,{initialEntries:['/settings']},h(Routes,null,h(Route,{element:h(AdminAppShell)},h(Route,{path:'/settings',element:h(AdminSettingsPage)}),h(Route,{path:'/dashboard',element:h('p',null,'Fixture placeholder')})))));
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
  await wait("!!document.querySelector('.settings-page')");
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const key=async(value,code,vk)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:value,code,windowsVirtualKeyCode:vk,...(value==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key:value,code,windowsVirtualKeyCode:vk});};
  const ready=()=>wait("!!document.querySelector('.settings-grid dd') && !document.querySelector('.settings-page [aria-busy=true]')");
  const remount=async()=>{
    await evaluate("document.querySelector('a[href=\"/dashboard\"]').click()");await wait("!document.querySelector('.settings-page')");
    await evaluate("document.querySelector('a[href=\"/settings\"]').click()");await wait("!!document.querySelector('.settings-page')");
  };
  await wait("!!document.querySelector('.admin-error-state')");
  assert.ok(await evaluate("!document.querySelector('.settings-page').textContent.includes('DO_NOT_RENDER')"));
  await evaluate("window.fixtureFail=false;document.querySelector('.admin-error-state button').focus()");await key('Enter','Enter',13);
  await wait("!!document.querySelector('.settings-page [aria-busy=true]')");await ready();
  assert.equal(await evaluate("document.querySelectorAll('.settings-grid > section').length"),4);
  assert.ok(await evaluate("document.querySelector('.settings-page').textContent.includes('0 MB')"));
  assert.ok(await evaluate("document.querySelector('.settings-page').textContent.includes('Chưa cấu hình')"));
  assert.ok(await evaluate("document.querySelector('.settings-page').textContent.includes('Chuỗi rỗng')"));
  assert.ok(await evaluate("document.querySelector('.settings-page').textContent.includes('Không có dữ liệu')"));
  assert.ok(await evaluate("!document.querySelector('.settings-page').textContent.includes('DO_NOT_RENDER')"));
  assert.equal(await evaluate("document.querySelectorAll('.settings-page :is(input,select,textarea,button)').length"),0);
  for(const width of [375,768,1024,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await evaluate('scrollTo(0,0)');
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'overflow '+width);
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(path.resolve(`node_modules/.cache/settings-ui-${width}.png`),Buffer.from(shot.data,'base64'));
  }
  await evaluate("window.fixtureValue.environment='long-value-'.repeat(100);window.fixtureValue.upload.supportedMediaTypes={apiKey:'DO_NOT_RENDER_OBJECT'};window.fixtureValue.processing.ffmpegBinarySource='mongodb://DO_NOT_RENDER_URI';window.fixtureValue.authentication.accessTokenTtl='Bearer DO_NOT_RENDER_TOKEN'");
  await remount();await ready();
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  assert.ok(await evaluate("!document.querySelector('.settings-page').textContent.includes('DO_NOT_RENDER')"));
  assert.ok(await evaluate("!document.querySelector('.settings-page').textContent.includes('[object Object]')"));
  for(const value of [null,{}, {editable:false}, {apiKey:'DO_NOT_RENDER_ONLY_SECRET'}]){
    await evaluate(`window.fixtureValue=${JSON.stringify(value)}`);await remount();
    await wait("!!document.querySelector('.settings-page .empty-state')");
    assert.ok(await evaluate("!document.querySelector('.settings-grid') && !document.querySelector('[aria-busy=true]')"));
    assert.ok(await evaluate("!document.querySelector('.settings-page').textContent.includes('DO_NOT_RENDER')"));
  }
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.ok(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"));
  assert.ok(await evaluate("window.fixtureCalls.every(c=>c.method==='GET'&&c.path==='/api/admin/settings')"));
  console.log('PASS: settings GET-only loading/error/retry via keyboard, empty/null, four groups, false/zero/empty string, malformed nested values, secrets omitted/redacted, four widths and reduced motion.');

} finally {
  socket?.close(); browser?.kill(); await server.close();
}
