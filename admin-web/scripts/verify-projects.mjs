// Projects acceptance: real page and modal; all HTTP reads intercepted, writes denied.
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
const profile = path.resolve('node_modules/.cache', `projects-browser-${process.pid}`);
mkdirSync(profile, { recursive: true });
let entrySource = '';
const server = await createServer({ configFile: false, plugins: [react(), {
  name: 'isolated-projects-fixture',
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
  import { AdminProjectsPage } from '/src/pages/AdminProjectsPage.tsx';
  import { AdminAppShell } from '/src/components/layout/AdminAppShell.tsx';
  import '/src/styles/global.css'; import '/src/styles/admin-shell.css';
  window.fixtureCalls=[]; window.fixtureDelay=250; window.fixtureEmpty=false; window.fixtureFail=false;
  const rows=Array.from({length:1000},(_,i)=>({id:'project-'+i,name:'Project '+String(i).padStart(4,'0'),user:{id:'u',fullName:'Editor',email:'editor@example.test'},sourceLanguage:'vi',targetLanguages:['en','ja'],description:'Museum',media:{originalName:'Museum.mp4',mediaType:i%2?'AUDIO':'VIDEO',mimeType:'video/mp4',fileSize:1000,duration:60},status:['TRANSLATING','COMPLETED','FAILED','COMPLETED'][i%4],progress:100,narrationApproval:{status:i%4===3?'ALL_APPROVED':'NONE_APPROVED',approved:i%4===3?2:0,total:2},createdAt:'2026-01-01',updatedAt:'2026-01-02'}));
  window.fetch=async(url,init={})=>{
    const u=new URL(url,location.origin);const q=Object.fromEntries(u.searchParams);
    window.fixtureCalls.push({method:init.method||'GET',path:u.pathname,query:q});
    if((init.method||'GET')!=='GET')throw Error('WRITES_DENIED');
    if(u.pathname.endsWith('/narrations'))return new Response(JSON.stringify({success:true,data:{narrations:[{id:'n1',languageCode:'en',languageName:'English',voiceName:'Kore',duration:60,fileSize:1024,speed:1,isApproved:false,audioUrl:location.origin+'/__fixture-audio.wav'},{id:'n2',languageCode:'ja',languageName:'Japanese',voiceName:'Fenrir',duration:60,fileSize:1024,speed:1,isApproved:true,audioUrl:location.origin+'/__fixture-audio.wav'}]}}));
    if(u.pathname!=='/api/admin/projects')throw Error('UNEXPECTED_REQUEST_BLOCKED');
    const fail=window.fixtureFail,empty=window.fixtureEmpty;
    await new Promise(r=>setTimeout(r,q.search==='slow'?600:window.fixtureDelay));
    if(fail)return new Response(JSON.stringify({success:false,error:{code:'TEST_ERROR',message:'Offline'}}),{status:500});
    const items=empty?[]:rows.filter(x=>(!q.search||x.name.includes(q.search))&&(!q.status||x.status===q.status)&&(!q.mediaType||x.media.mediaType===q.mediaType));
    const page=Number(q.page),limit=Number(q.limit),total=items.length;
    return new Response(JSON.stringify({success:true,data:{items:items.slice((page-1)*limit,page*limit),summary:{total:1000,processing:250,failed:250,completed:500},pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}}}),{status:200});
  };
  const h=React.createElement;
  ReactDOM.createRoot(document.getElementById('root')).render(h(MemoryRouter,{initialEntries:['/projects']},h(Routes,null,h(Route,{element:h(AdminAppShell)},h(Route,{path:'/projects',element:h(AdminProjectsPage)})))));
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
  const search='#project-search';
  const waitReady=()=>wait("!!document.querySelector('.projects-table tbody tr') && !document.querySelector('.projects-page [aria-busy=true]')");
  const key=async(value,code,vk,modifiers=0)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:value,code,windowsVirtualKeyCode:vk,modifiers,...(value==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key:value,code,windowsVirtualKeyCode:vk,modifiers});};
  const type=async(value)=>{await evaluate(`document.querySelector('${search}').focus();document.querySelector('${search}').select()`);await send('Input.insertText',{text:value});};
  const select=async(index,value)=>evaluate(`(()=>{const s=document.querySelectorAll('.projects-filters select')[${index}];s.value='${value}';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const clickText=async(text)=>evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);
  await waitReady();
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.projects-table td')).fontSize"),'14px');
  assert.equal(await evaluate("document.querySelector('#approve-project-project-0').disabled"),true);
  assert.equal(await evaluate("document.querySelector('#approve-project-project-1').disabled"),false);
  assert.ok(await evaluate("document.querySelector('.projects-table tbody tr').querySelector('[role=progressbar]').getAttribute('aria-valuenow')==='100'"));
  await evaluate(`window.searchBefore=document.querySelector('${search}');void 0`);
  await type('Project');await wait("!!document.querySelector('.projects-table-skeleton')");
  assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);await waitReady();
  assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);
  await select(0,'COMPLETED');await waitReady();assert.equal(await evaluate("window.fixtureCalls.at(-1).query.status"),'COMPLETED');
  await select(1,'AUDIO');await waitReady();assert.equal(await evaluate("window.fixtureCalls.at(-1).query.mediaType"),'AUDIO');
  await evaluate("document.querySelector('button[aria-label=\"Trang 2\"]').click()");await waitReady();assert.equal(await evaluate("window.fixtureCalls.at(-1).query.page"),'2');
  assert.ok(await evaluate("document.querySelectorAll('.admin-pagination button').length<=11"));
  await type('slow');await pause(50);await type('Project');await waitReady();await pause(650);
  assert.ok(await evaluate("document.querySelector('.projects-table tbody').textContent.includes('Project')"));
  await evaluate("window.fixtureOpener=document.querySelector('.projects-row-actions button:not(:disabled)');window.fixtureOpener.focus();window.fixtureOpener.click()");
  await wait("document.querySelector('.admin-dialog')?.open && !!document.querySelector('.narration-item')");
  assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"),'Đóng cửa sổ');
  await key('Tab','Tab',9,8);assert.equal(await evaluate("document.activeElement.closest('.narration-modal__footer')!==null"),true);
  await key('Tab','Tab',9);assert.equal(await evaluate("document.activeElement.classList.contains('narration-modal__close-btn')"),true);
  await key('Escape','Escape',27);await wait("!document.querySelector('.admin-dialog')");assert.equal(await evaluate('document.activeElement===window.fixtureOpener'),true);
  await evaluate("window.fixtureOpener.click()");await wait("document.querySelector('.admin-dialog')?.open");
  await evaluate("document.querySelector('.narration-modal__close-btn').click()");await wait("!document.querySelector('.admin-dialog')");
  assert.equal(await evaluate('document.activeElement===window.fixtureOpener'),true);
  for(const width of [375,768,1024,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'page overflow '+width);
    assert.ok(await evaluate("document.querySelector('.projects-filters input').getBoundingClientRect().width<=innerWidth"));
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(path.resolve(`node_modules/.cache/projects-ui-${width}.png`),Buffer.from(shot.data,'base64'));
    await evaluate("window.fixtureOpener=document.querySelector('.projects-row-actions button:not(:disabled)');window.fixtureOpener.focus();window.fixtureOpener.click()");
    await wait("document.querySelector('.admin-dialog')?.open && !!document.querySelector('.narration-item')");
    assert.ok(await evaluate("document.querySelector('.admin-dialog').getBoundingClientRect().width<=innerWidth"));
    await key('Escape','Escape',27);await wait("!document.querySelector('.admin-dialog')");
  }
  await evaluate('window.fixtureFail=true');await type('Offline');await wait("!!document.querySelector('.admin-error-state')");assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);
  await evaluate('window.fixtureFail=false');await clickText('Thử lại');await wait("document.querySelector('.empty-state h2')?.textContent==='Không tìm thấy dự án phù hợp.'");
  assert.equal(await evaluate("window.fixtureCalls.at(-1).query.search"),'Offline');
  await evaluate('window.fixtureEmpty=true');await clickText('Đặt lại');await wait("document.querySelector('.empty-state h2')?.textContent==='Chưa có dự án nào.'");
  assert.equal(await evaluate("window.fixtureCalls.every(c=>c.method==='GET'&&c.path.startsWith('/api/admin/projects'))"),true);
  console.log('PASS: projects search/status/media/page, focus/loading, stale reads, distinct states, status100 remains uncompleted, approval gating, real modal keyboard/focus, four widths; intercepted GET only.');

} finally {
  socket?.close(); browser?.kill(); await server.close();
}
