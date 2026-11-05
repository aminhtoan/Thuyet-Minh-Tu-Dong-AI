// Isolated real-browser acceptance: real Sidebar + Router, no auth or Backend.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const browserPath = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);
assert.ok(browserPath, 'Chrome or Edge must already be installed');
const profile = path.resolve('node_modules/.cache', `navigation-browser-${process.pid}`);
mkdirSync(profile, { recursive: true });
let entrySource = '';
const server = await createServer({ configFile: false, plugins: [react(), {
  name: 'isolated-navigation-fixture',
  resolveId(id) { if (id === '/__navigation-entry.jsx') return '\0navigation-fixture'; },
  load(id) { if (id === '\0navigation-fixture') return entrySource; },
}], server: { host: '127.0.0.1', port: 0 }, appType: 'custom' });
server.middlewares.use(async (req, res, next) => {
  if (req.url !== '/__navigation-test') return next();
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div>
  <script type="module">
  import React from 'react';
  import ReactDOM from 'react-dom/client';
  import { MemoryRouter, useNavigate, useLocation } from 'react-router-dom';
  import { AdminSidebar } from '/src/components/layout/AdminSidebar.tsx';
  import '/src/styles/global.css'; import '/src/styles/admin-shell.css';
  const h=React.createElement;
  function App(){const go=useNavigate(), location=useLocation();return h('div',{className:'admin-shell'},
    h('aside',{className:'sidebar desktop-sidebar'},h(AdminSidebar)),
    h('dialog',{id:'test-drawer',className:'drawer'},h(AdminSidebar,{onNavigate:()=>document.querySelector('dialog').close()})),
    h('main',{className:'shell-body'},h('button',{id:'open-drawer',onClick:()=>document.querySelector('dialog').showModal()},'Menu'),
    h('output',{id:'route'},location.pathname),...['/dashboard','/languages','/voices','/users/example'].map(route=>h('button',{'data-route':route,key:route,onClick:()=>go(route)},route))));}
  ReactDOM.createRoot(document.getElementById('root')).render(h(MemoryRouter,{initialEntries:['/languages']},h(App)));
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
  await wait("!!document.querySelector('.desktop-sidebar button[aria-expanded]')");
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const selector = '.desktop-sidebar button[aria-expanded]';
  assert.equal(await evaluate(`document.querySelector('${selector}').getAttribute('aria-expanded')`), 'true');
  assert.equal(await evaluate("document.querySelector('.desktop-sidebar [aria-current=page]').getAttribute('href')"), '/languages');
  await evaluate(`document.querySelector('${selector}').focus()`);
  assert.equal(await evaluate(`document.activeElement === document.querySelector('${selector}')`), true);
  for (const [key, code, expected] of [['Enter', 'Enter', 'false'], [' ', 'Space', 'true']]) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, text: key === 'Enter' ? '\r' : ' ', windowsVirtualKeyCode: key === 'Enter' ? 13 : 32 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: key === 'Enter' ? 13 : 32 });
    await wait(`document.querySelector('${selector}').getAttribute('aria-expanded') === '${expected}'`);
  }
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate('document.activeElement.getAttribute("href")'), '/languages');
  for (const route of ['/voices', '/dashboard', '/languages', '/users/example']) {
    await evaluate(`document.querySelector('[data-route="${route}"]').click()`);
    await wait(`document.querySelector('#route').textContent === '${route}'`);
    assert.equal(await evaluate("document.querySelector('.desktop-sidebar [aria-current=page]').getAttribute('href')"), route.startsWith('/users/') ? '/users' : route);
    assert.equal(await evaluate(`document.querySelector('${selector}').getAttribute('aria-expanded')`), String(['/languages', '/voices'].includes(route)));
  }
  assert.equal(await evaluate("new Set([...document.querySelectorAll('[aria-controls]')].map(e=>e.getAttribute('aria-controls'))).size"), 2);
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 900, deviceScaleFactor: 1, mobile: false });
  await evaluate("document.querySelector('#open-drawer').click()");
  await wait("document.querySelector('dialog').open");
  await evaluate("document.querySelector('dialog button[aria-expanded]').focus()");
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', windowsVirtualKeyCode: 13 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await wait("document.querySelector('dialog button[aria-expanded]').getAttribute('aria-expanded') === 'true'");
  await evaluate("document.querySelector('dialog a[href=\"/voices\"]').click()");
  await wait("!document.querySelector('dialog').open && document.querySelector('#route').textContent === '/voices'");
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'));
  console.log('PASS: real-browser Enter/Space/Tab, auto-open, active detail routes, unique IDs, 375px drawer navigation; no Backend requests.');
} finally {
  socket?.close(); browser?.kill(); await server.close();
}
