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
const profile = path.resolve('node_modules/.cache', `overview-browser-${process.pid}`);
mkdirSync(profile, { recursive: true });
let entrySource = '';
const server = await createServer({ configFile: false, plugins: [react(), {
  name: 'isolated-overview-fixture',
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
  import { AdminDashboardPage } from '/src/pages/AdminDashboardPage.tsx'; import { AdminVisitQrPage } from '/src/pages/AdminVisitQrPage.tsx';
  import { AdminAppShell } from '/src/components/layout/AdminAppShell.tsx';
  import '/src/styles/global.css'; import '/src/styles/admin-shell.css';
  window.fixtureCalls=[];window.fixtureFail=false;window.fixtureEmpty=false;
  const visitRows=Array.from({length:40},(_,i)=>({id:'q'+i,source:'qr_scan',ipAddress:'192.0.2.'+i,deviceType:'mobile',os:'Android',browser:'Chrome',createdAt:'2026-01-01T10:00:00Z'}));
  const profiles=Array.from({length:15},(_,i)=>({id:'v'+i,visitorId:'v'+i,visitorCode:'V'+i,ipAddress:'192.0.2.'+i,deviceType:'mobile',os:'Android',browser:'Chrome',totalScans:i+1,totalListens:i+2,language:'English',languageCode:'en',lastListenedAt:'2026-01-01T10:00:00Z',firstVisitAt:'2026-01-01T10:00:00Z',lastVisitAt:'2026-01-01T10:00:00Z'}));
  window.fetch=async(url,init={})=>{
    const u=new URL(url,location.origin),q=Object.fromEntries(u.searchParams);const call={method:init.method||'GET',path:u.pathname,query:q,aborted:false,resolved:false};window.fixtureCalls.push(call);
    init.signal?.addEventListener('abort',()=>{call.aborted=true});
    if(call.method!=='GET'||!['/api/admin/dashboard','/api/admin/visit-qr'].includes(u.pathname))throw Error('REQUEST_DENIED');
    const fail=window.fixtureFail,empty=window.fixtureEmpty;
    await new Promise(r=>setTimeout(r,q.search==='slow'||q.search==='slow-error'?800:200));call.resolved=true;
    if(fail||q.search==='slow-error')return new Response(JSON.stringify({success:false,error:{code:'TEST',message:'Offline'}}),{status:500});
    const dashboard={stats:{totalCustomers:9,totalProjects:31,processing:2,failed:9,totalListens:88,listenStats:{total:88,web:50,mobile:38}},jobSummary:{queued:3,processing:4,failed:28,completedToday:15},generatedAt:'2026-01-01T10:00:00Z',recentProjects:empty?[]:[{id:'p',name:'Museum project',user:{id:'u',fullName:'Editor'},sourceLanguage:'vi',targetLanguages:['en'],status:'FAILED',progress:100,updatedAt:'2026-01-01T10:00:00Z'}],processingJobs:empty?[]:[{id:'j',project:{id:'p',name:'Museum project'},type:'TRANSCRIPTION',status:'PROCESSING',progress:100,updatedAt:'2026-01-01T10:00:00Z'}],recentActivities:empty?[]:[{id:'a',description:'Fixture activity',entityType:'Project',createdAt:'2026-01-01T10:00:00Z'}],listenAnalytics:{topAudios:empty?[]:[{projectId:'p',title:'Museum audio',languageCode:'en',languageName:'English',count:12,web:7,mobile:5}],topLanguages:empty?[]:[{code:'en',name:'English',count:12,percentage:60,web:7,mobile:5}]}};
    const items=empty?[]:visitRows.filter(x=>!q.search||x.ipAddress.includes(q.search));const page=+q.page,limit=+q.limit;
    const data=u.pathname.endsWith('/dashboard')?dashboard:{items:items.slice((page-1)*limit,page*limit),summary:{totalListens:88,listenStats:{total:88,web:50,mobile:38},today:12,todayUnique:7,total:250,totalUnique:90},pagination:{page,limit,total:items.length,totalPages:Math.ceil(items.length/limit)},topVisitors:empty?[]:profiles,visitors:empty?[]:profiles};
    return new Response(JSON.stringify({success:true,data}));
  };
  const h=React.createElement;
  ReactDOM.createRoot(document.getElementById('root')).render(h(MemoryRouter,{initialEntries:['/dashboard']},h(Routes,null,h(Route,{element:h(AdminAppShell)},h(Route,{path:'/dashboard',element:h(AdminDashboardPage)}),h(Route,{path:'/visit-qr',element:h(AdminVisitQrPage)}),h(Route,{path:'/projects',element:h('p',null,'Fixture projects destination')}),h(Route,{path:'/jobs',element:h('p',null,'Fixture jobs destination')})))));
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
  await wait("!!document.querySelector('.dashboard-page')");
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const key=async(value,code,vk)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:value,code,windowsVirtualKeyCode:vk,...(value==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key:value,code,windowsVirtualKeyCode:vk});};
  const click=async(text)=>evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);
  const navigate=async(route)=>evaluate(`document.querySelector('a[href="${route}"]').click()`);
  const visitReady=()=>wait("!!document.querySelector('.visit-qr-table tbody tr') && !document.querySelector('.visit-page [aria-busy=true]')");
  await wait("!!document.querySelector('.dashboard-content')");
  assert.equal(await evaluate("document.querySelectorAll('.dashboard-content .stat-card').length"),5);
  assert.equal(await evaluate("[...document.querySelectorAll('.dashboard-content .stat-card strong')].map(x=>x.textContent).join(',')"),'9,31,2,9,88');
  assert.ok(await evaluate("document.querySelector('.recent-projects tbody').textContent.includes('Thất bại')"));
  assert.equal(await evaluate("document.querySelector('.processing-jobs [role=progressbar]').getAttribute('aria-valuenow')"),'100');
  for(const target of ['/projects','/jobs']){
    await evaluate(`document.querySelector('.dashboard-grid a[href="${target}"]').focus()`);await key('Enter','Enter',13);
    await wait(`document.body.textContent.includes('Fixture ${target.slice(1)} destination')`);await navigate('/dashboard');await wait("!!document.querySelector('.dashboard-content')");
  }
  for(const route of ['/dashboard','/visit-qr']){
    await navigate(route);await wait(route==='/dashboard'?"!!document.querySelector('.dashboard-content')":"!!document.querySelector('.visit-qr-table tbody tr')");
    for(const width of [375,768,1024,1440]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await evaluate('scrollTo(0,0)');
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'overflow '+route+width);
      const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(path.resolve(`node_modules/.cache/overview-${route.slice(1)}-${width}.png`),Buffer.from(shot.data,'base64'));
    }
  }
  assert.equal(await evaluate("document.querySelectorAll('.visit-qr-stats .stat-card').length"),5);
  assert.equal(await evaluate("[...document.querySelectorAll('.visit-qr-stats .stat-card strong')].map(x=>x.textContent).join(',')"),'88,12,7,250,90');
  assert.ok(await evaluate("document.querySelector('.visit-page').textContent.includes('IP duy nhất')"));
  await evaluate("window.searchBefore=document.querySelector('#visit-search');window.searchBefore.focus();void 0");await send('Input.insertText',{text:'192.0.2.'});
  await wait("!!document.querySelector('.visit-page [aria-busy=true]')");assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);await visitReady();
  assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);
  const type=async(value)=>{await evaluate("window.searchBefore.focus();window.searchBefore.select()");await send('Input.insertText',{text:value});};
  for(const stale of ['slow','slow-error']){
    await type(stale);await wait(`window.fixtureCalls.at(-1).query.search==='${stale}'`);await type('192.0.2.');await visitReady();
    await wait(`window.fixtureCalls.findLast(c=>c.query.search==='${stale}').resolved`);
    assert.equal(await evaluate(`window.fixtureCalls.findLast(c=>c.query.search==='${stale}').aborted`),true);
    assert.equal(await evaluate("document.querySelector('.visit-page .admin-error-state')"),null);
  }
  await evaluate("window.periodBefore=document.querySelector('.visitor-tab-btn');window.periodBefore.focus()");await key('Enter','Enter',13);
  await wait("window.fixtureCalls.at(-1).query.visitorDays==='7'");assert.equal(await evaluate('document.activeElement===window.periodBefore'),true);await visitReady();
  assert.equal(await evaluate("window.periodBefore.getAttribute('aria-pressed')"),'true');
  await evaluate("(()=>{const x=document.querySelector('input[type=date]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(x,'2026-01-01');x.dispatchEvent(new Event('input',{bubbles:true}));x.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await wait("window.fixtureCalls.at(-1).query.startDate==='2026-01-01'");await visitReady();
  await evaluate("document.querySelector('.visit-qr-pagination button:last-child').click()");await wait("window.fixtureCalls.at(-1).query.page==='2'");await visitReady();
  const beforeLanguage=await evaluate('window.fixtureCalls.length');
  await evaluate("(()=>{const x=document.querySelector('#visitor-lang-filter');x.value='zh';x.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await wait("!!document.querySelector('.visitor-frequency-card .visit-qr-empty')");assert.equal(await evaluate('window.fixtureCalls.length'),beforeLanguage);
  await evaluate("(()=>{const x=document.querySelector('#visitor-lang-filter');x.value='en';x.dispatchEvent(new Event('change',{bubbles:true}));})()");
  // Existing read-only tables remain keyboard-scrollable.
  await evaluate("document.querySelector('.visit-qr-table-scroll').focus()");assert.equal(await evaluate("document.activeElement.getAttribute('role')"),'region');
  await evaluate('window.fixtureFail=true');await type('Offline');await wait("!!document.querySelector('.visit-page .admin-error-state')");assert.equal(await evaluate('document.activeElement===window.searchBefore'),true);
  await evaluate('window.fixtureFail=false');await click('Thử lại');await wait("!!document.querySelector('.visit-qr-empty') && !document.querySelector('[aria-busy=true]')");
  await evaluate('window.fixtureEmpty=true');await click('Đặt lại');await wait("document.querySelector('.visit-qr-empty')?.textContent.includes('Chưa có lượt quét QR nào')");
  await navigate('/dashboard');await wait("!!document.querySelector('.dashboard-content')");assert.ok(await evaluate("document.querySelector('.top-audios-card').textContent.includes('Chưa có dữ liệu')"));
  await evaluate('window.fixtureFail=true');await click('Làm mới');await wait("!!document.querySelector('.dashboard-error')");
  await evaluate('window.fixtureFail=false');await click('Thử lại');await wait("!!document.querySelector('.dashboard-content')");
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  assert.ok(await evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches"));
  assert.ok(await evaluate("window.fixtureCalls.every(c=>c.method==='GET'&&['/api/admin/dashboard','/api/admin/visit-qr'].includes(c.path))"));
  console.log('PASS: overview KPI values, honest status100, navigation by keyboard, four widths, stable filters/focus, period filter, stale success/error ignored, loading/error/retry/empty, reduced motion; intercepted GET only.');

} finally {
  socket?.close(); browser?.kill(); await server.close();
}
