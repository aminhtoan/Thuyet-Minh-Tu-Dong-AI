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
const profile = path.resolve('node_modules/.cache', `jobs-browser-${process.pid}`);
mkdirSync(profile, { recursive: true });
let entrySource = '';
const server = await createServer({ configFile: false, plugins: [react(), {
  name: 'isolated-jobs-fixture',
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
  import { AdminJobsPage } from '/src/pages/AdminJobsPage.tsx';
  import { AdminAppShell } from '/src/components/layout/AdminAppShell.tsx';
  import '/src/styles/global.css'; import '/src/styles/admin-shell.css';
  window.fixtureCalls=[]; window.fixtureDelay=250; window.fixtureEmpty=false; window.fixtureFail=false;
  const rows=Array.from({length:1000},(_,i)=>({id:'6aea02a2dffc2cd1'+String(i).padStart(8,'0'),project:{id:'p'+i,name:'Museum '+String(i).padStart(4,'0')},customer:{id:'u',fullName:'Editor'},type:['TRANSCRIPTION','TRANSLATION','TTS','VIDEO_PROCESSING'][i%4],status:['PROCESSING','COMPLETED','FAILED','QUEUED','CANCELLED'][i%5],progress:100,targetLanguage:'en',createdAt:'2026-01-01',updatedAt:'2026-01-02',startedAt:i%5===3?null:'2026-01-01T10:00:00Z',completedAt:i%5===1?'2026-01-01T10:02:00Z':null}));
  window.fetch=async(url,init={})=>{
    const u=new URL(url,location.origin);const q=Object.fromEntries(u.searchParams);
    window.fixtureCalls.push({method:init.method||'GET',path:u.pathname,query:q});
    if((init.method||'GET')!=='GET'||u.pathname!=='/api/admin/jobs')throw Error('REQUEST_DENIED');
    const fail=window.fixtureFail,empty=window.fixtureEmpty;
    await new Promise(r=>setTimeout(r,q.search==='slow'?600:window.fixtureDelay));
    if(fail)return new Response(JSON.stringify({success:false,error:{code:'TEST_ERROR',message:'Offline'}}),{status:500});
    const items=empty?[]:rows.filter(x=>(!q.search||x.project.name.includes(q.search)||x.id.includes(q.search))&&(!q.status||x.status===q.status)&&(!q.type||x.type===q.type));
    const page=Number(q.page),limit=Number(q.limit),total=items.length;
    return new Response(JSON.stringify({success:true,data:{items:items.slice((page-1)*limit,page*limit),summary:{queued:200,processing:200,failed:200,completed:200,cancelled:200},pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}}}),{status:200});
  };
  const h=React.createElement;
  ReactDOM.createRoot(document.getElementById('root')).render(h(MemoryRouter,{initialEntries:['/jobs']},h(Routes,null,h(Route,{element:h(AdminAppShell)},h(Route,{path:'/jobs',element:h(AdminJobsPage)})))));
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
  const search='#job-search';
  const waitReady=()=>wait("!!document.querySelector('.jobs-table tbody tr') && !document.querySelector('.jobs-page [aria-busy=true]')");
  const key=async(value,code,vk,modifiers=0)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:value,code,windowsVirtualKeyCode:vk,modifiers,...(value==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key:value,code,windowsVirtualKeyCode:vk,modifiers});};
  const type=async(value)=>{await evaluate(`document.querySelector('${search}').focus();document.querySelector('${search}').select()`);await send('Input.insertText',{text:value});};
  const select=async(index,value)=>evaluate(`(()=>{const s=document.querySelectorAll('.jobs-filters select')[${index}];s.value='${value}';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const clickText=async(text)=>evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);
  await waitReady();
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.jobs-table td')).fontSize"),'14px');
  assert.equal(await evaluate("document.querySelector('.jobs-progress-note')!==null"),true);
  assert.equal(await evaluate("document.querySelectorAll('.jobs-statistics .stat-card').length"),4);
  assert.equal(await evaluate("document.querySelector('.jobs-table tbody tr [role=progressbar]').getAttribute('aria-valuenow')"),'100');
  await evaluate("document.querySelector('.jobs-id summary').focus()");await key('Enter','Enter',13);
  assert.equal(await evaluate("document.querySelector('.jobs-id details').open"),true);
  assert.equal(await evaluate("document.querySelector('.jobs-id code').textContent"),'6aea02a2dffc2cd100000000');
  await key('Tab','Tab',9);assert.equal(await evaluate("document.activeElement.classList.contains('jobs-view')"),true);
  await evaluate(`window.searchBefore=document.querySelector('${search}');void 0`);
  await type('Museum');await wait("!!document.querySelector('.jobs-table-skeleton')");
  assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);
  assert.equal(await evaluate("document.querySelectorAll('.jobs-statistics .stat-card').length"),4);
  await waitReady();assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);
  await select(0,'TRANSLATION');await waitReady();assert.equal(await evaluate("window.fixtureCalls.at(-1).query.type"),'TRANSLATION');
  await select(1,'COMPLETED');await waitReady();assert.equal(await evaluate("window.fixtureCalls.at(-1).query.status"),'COMPLETED');
  await evaluate("document.querySelector('button[aria-label=\"Trang 2\"]').click()");await waitReady();assert.equal(await evaluate("window.fixtureCalls.at(-1).query.page"),'2');
  assert.ok(await evaluate("document.querySelectorAll('.admin-pagination button').length<=11"));
  await type('slow');await pause(50);await type('Museum');await waitReady();await pause(650);
  assert.ok(await evaluate("document.querySelector('.jobs-table tbody').textContent.includes('Museum')"));
  for(const width of [375,768,1024,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'page overflow '+width);
    assert.ok(await evaluate("document.querySelector('.jobs-filters input').getBoundingClientRect().width<=innerWidth"));
    await evaluate("document.querySelector('.admin-data-table-scroll').focus()");
    assert.equal(await evaluate("document.activeElement.getAttribute('role')"),'region');
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(path.resolve(`node_modules/.cache/jobs-ui-${width}.png`),Buffer.from(shot.data,'base64'));
  }
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.equal(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"),true);
  assert.ok(await evaluate("parseFloat(getComputedStyle(document.querySelector('.jobs-filters input')).transitionDuration)<=0.00001"));
  await evaluate('window.fixtureFail=true');await type('Offline');await wait("!!document.querySelector('.admin-error-state')");assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);
  await evaluate('window.fixtureFail=false');await clickText('Thử lại');await wait("document.querySelector('.empty-state h2')?.textContent==='Không tìm thấy công việc phù hợp.'");
  assert.equal(await evaluate("window.fixtureCalls.at(-1).query.search"),'Offline');
  await evaluate('window.fixtureEmpty=true');await clickText('Đặt lại');await wait("document.querySelector('.empty-state h2')?.textContent==='Chưa có công việc xử lý.'");
  assert.equal(await evaluate("window.fixtureCalls.every(c=>c.method==='GET'&&c.path==='/api/admin/jobs')"),true);
  console.log('PASS: jobs search/type/status/page, stable toolbar and KPI, focus/loading, stale reads, distinct states, status100, keyboard full ID disclosure, four widths, reduced motion; fixture GET only.');

} finally {
  socket?.close(); browser?.kill(); await server.close();
}
