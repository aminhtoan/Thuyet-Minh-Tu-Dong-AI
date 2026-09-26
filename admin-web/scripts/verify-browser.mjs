// Optional browser smoke check. Requires Vite on 127.0.0.1:5174 and a separate
// temporary Chrome profile with remote debugging on 127.0.0.1:9223.
// Uses Node's built-in WebSocket and the Chrome DevTools Protocol.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as pause } from 'node:timers/promises';

const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const target = targets.find((item) => item.type === 'page');
assert.ok(target, 'A temporary browser page must be available.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let sequence = 0;
const pending = new Map();
const exceptions = [];
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
  if (!message.id) return;
  const request = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function wait(expression, label) {
  const deadline = Date.now() + 20000;
  while (true) {
    try { if (await evaluate('Boolean(' + expression + ')')) return; }
    catch (error) {
      if (!/context|navigated|closed/i.test(error.message)) throw error;
    }
    if (Date.now() > deadline) throw new Error('Timed out: ' + label + '\n' + JSON.stringify({ exceptions, page: await evaluate('document.body.innerText') }));
    await pause(100);
  }
}
const button = (label) => "[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===" + JSON.stringify(label) + ')';
async function click(label) {
  await wait(button(label) + ' && !' + button(label) + '.disabled', 'enabled ' + label);
  await evaluate(button(label) + '.click()');
}

try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Network.enable');
  const apiRequests = [];
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Network.requestWillBeSent' && message.params.request.url.includes('/api/')) apiRequests.push(message.params.request.url);
  });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/login' });
  await wait("document.querySelector('#email')", 'login');
  await click('Đăng nhập quản trị');
  await wait("document.querySelector('[role=alert]')", 'empty form validation');
  await evaluate("document.querySelector('#email').value='admin@example.com';document.querySelector('#password').value='demo-only'");
  await click('Đăng nhập quản trị');
  await wait("location.pathname==='/dashboard' && document.querySelectorAll('.stat-card').length===4", 'mock login dashboard');
  assert.equal(await evaluate('localStorage.length + sessionStorage.length'), 0);
  assert.equal(await evaluate("document.querySelector('input[type=password]')"), null);
  for (const route of ['/dashboard','/users','/projects','/jobs','/languages','/voices','/logs','/settings']) {
    await evaluate("[...document.querySelectorAll('.desktop-sidebar a')].find(a=>a.getAttribute('href')===" + JSON.stringify(route) + ").click()");
    await wait("location.pathname===" + JSON.stringify(route) + " && document.querySelector('.desktop-sidebar a[aria-current=page]')?.getAttribute('href')===" + JSON.stringify(route), 'route ' + route);
    assert.equal(await evaluate("document.querySelector('.desktop-sidebar a[aria-current=page]').getAttribute('href')"), route);
    assert.equal(await evaluate("document.querySelector('.coming-soon')"), null);
    if (route === '/users') await wait("document.querySelectorAll('.customer-table tbody tr').length===10", 'customer list');
    if (route === '/projects' || route === '/jobs') await wait("document.querySelectorAll('.operation-table tbody tr').length===10", 'operation list');
    await send('Page.reload');
    await pause(300);
    await wait("document.querySelector('h1') && location.pathname===" + JSON.stringify(route), 'refresh ' + route);
    for (const width of [1920,1440,1366,1024,768,375]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false }); await pause(50);
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'), 'overflow ' + route + ' ' + width);
    }
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 768, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate("document.querySelector('.menu-button').click()");
  await wait("document.querySelector('dialog').open", 'drawer open');
  assert.ok(await evaluate("document.querySelector('dialog').contains(document.activeElement)"));
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await wait("!document.querySelector('dialog').open", 'Escape closes drawer');
  await evaluate("document.querySelector('.menu-button').click()");
  await evaluate("[...document.querySelectorAll('dialog a')].find(a=>a.getAttribute('href')==='/users').click()");
  await wait("location.pathname==='/users' && !document.querySelector('dialog').open", 'drawer navigation');
  await wait("document.querySelectorAll('.customer-table tbody tr').length===10", 'customer list after drawer');
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.customer-statistics .stat-card strong')].map(x=>x.textContent)"), ['14','10','4','9']);
  await evaluate("const e=document.querySelector('.customer-search input');const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;s.call(e,'nguyễn văn');e.dispatchEvent(new Event('input',{bubbles:true}))");
  await wait("document.querySelectorAll('.customer-table tbody tr').length===1", 'customer search');
  assert.ok(await evaluate("document.querySelector('.customer-table').innerText.includes('Nguyễn Văn An')"));
  await evaluate("document.querySelector('.customer-table a').click()");
  await wait("location.pathname==='/users/kh-001' && document.querySelector('.profile-list')", 'customer detail');
  assert.equal(await evaluate("document.querySelector('.desktop-sidebar a[aria-current=page]').getAttribute('href')"), '/users');
  assert.equal(await evaluate("document.querySelectorAll('.project-summary .stat-card').length"), 4);
  await click('Khóa tài khoản');
  await wait("document.querySelector('.confirm-dialog').open", 'block confirmation');
  await click('Hủy');
  await wait("!document.querySelector('.confirm-dialog').open", 'cancel confirmation');
  await click('Khóa tài khoản'); await evaluate("document.querySelector('.confirm-dialog .button--danger').click()");
  await wait("document.body.innerText.includes('Đã khóa tài khoản khách hàng.')", 'block success');
  assert.ok(await evaluate("document.querySelector('.page-header').innerText.includes('Mở khóa tài khoản')"));
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/users/kh-khong-co' });
  await wait("document.body.innerText.includes('Không tìm thấy khách hàng')", 'customer not found');
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/projects' });
  await wait("document.querySelectorAll('.operation-table tbody tr').length===10", 'project list');
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.stat-card strong')].map(x=>x.textContent)"), ['18','7','2','2']);
  await evaluate("document.querySelector('.operation-table a').click()");
  await wait("location.pathname==='/projects/project-001' && document.body.innerText.includes('Tổng quan dự án')", 'project detail');
  assert.equal(await evaluate("document.querySelector('.desktop-sidebar a[aria-current=page]').getAttribute('href')"), '/projects');
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/projects/missing' });
  await wait("document.body.innerText.includes('Không tìm thấy dự án')", 'project not found');
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/jobs/job-003' });
  await wait("document.body.innerText.includes('Chi tiết lỗi')", 'failed job detail');
  await click('Thử lại'); await evaluate("document.querySelector('.confirm-dialog .button--primary').click()");
  await wait("document.body.innerText.includes('Đã đưa công việc trở lại hàng đợi.')", 'retry job');
  assert.ok(await evaluate("document.body.innerText.includes('Đang chờ xử lý')"));
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/jobs/job-002' });
  await wait("document.body.innerText.includes('Hủy công việc')", 'processing job detail');
  await click('Hủy công việc'); await evaluate("document.querySelector('.confirm-dialog .button--danger').click()");
  await wait("document.body.innerText.includes('Đã hủy công việc xử lý.')", 'cancel job');
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/jobs/missing' });
  await wait("document.body.innerText.includes('Không tìm thấy công việc')", 'job not found');
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/languages' });
  await wait("document.querySelectorAll('tbody tr').length===6", 'languages list');
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.stat-card strong')].map(x=>x.textContent)"), ['6','4','2','12']);
  await click('Thêm ngôn ngữ');
  await wait("document.querySelector('.system-dialog[open]')", 'add language dialog');
  await evaluate("document.querySelector('.system-dialog .button--primary').click()");
  await wait("document.querySelector('.system-dialog [role=alert]')", 'language validation');
  await click('Hủy');
  await evaluate("[...document.querySelectorAll('tbody tr button')].find(x=>x.textContent.trim()==='Tắt').click()");
  await wait("[...document.querySelectorAll('dialog h2')].some(x=>x.textContent.includes('Tắt ngôn ngữ'))", 'disable language dialog');
  await evaluate("document.querySelector('dialog .button--danger').click()");
  await wait("document.body.innerText.includes('Đã tắt ngôn ngữ.')", 'disable language');
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/voices' });
  await wait("document.querySelectorAll('tbody tr').length===12", 'voices list');
  await evaluate("[...document.querySelectorAll('tbody button')].find(x=>x.textContent.trim()==='Nghe thử').click()");
  await wait("document.body.innerText.includes('dịch vụ TTS được tích hợp')", 'honest voice preview');
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/logs' });
  await wait("document.querySelectorAll('tbody tr').length===10", 'logs list');
  assert.equal(await evaluate("document.querySelectorAll('thead th').length"), 6);
  await click('Xem chi tiết');
  await wait("document.querySelector('.log-dialog[open]')", 'log detail');
  assert.equal(await evaluate("/password|token|ip address/i.test(document.querySelector('.log-dialog').innerText)"), false);
  await click('Đóng');
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/settings' });
  await wait("document.body.innerText.includes('Thông tin hệ thống')", 'settings');
  assert.ok(await evaluate("['Backend','Database','AI Services'].every(x=>document.body.innerText.includes(x)) && (document.body.innerText.match(/Chưa kết nối/g)||[]).length>=3"));
  assert.equal(await evaluate("/OPENAI_API_KEY|JWT_SECRET|MongoDB password/i.test(document.body.innerText)"), false);
  await send('Page.navigate', { url: 'http://127.0.0.1:5174/' });
  await wait("location.pathname==='/dashboard' && document.querySelectorAll('.stat-card').length===4", 'root redirect');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }); await pause(150);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(path.join(tmpdir(), 's13-admin-dashboard.png'), Buffer.from(shot.data, 'base64'));

  assert.equal(await evaluate("document.querySelectorAll('.recent-projects tbody tr').length"), 5);
  assert.equal(await evaluate("document.querySelectorAll('.processing-jobs tbody tr').length"), 5);
  assert.equal(await evaluate("document.querySelectorAll('.recent-activity li').length"), 6);
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.stat-card strong')].map(x=>x.textContent)"), ['128','246','8','3']);
  assert.ok(await evaluate("[...document.querySelectorAll('[role=progressbar]')].every(x=>x.getAttribute('aria-label') && Number(x.getAttribute('aria-valuenow'))>=0 && Number(x.getAttribute('aria-valuenow'))<=100)"));
  assert.equal(await evaluate("/S12|S13|MOCK PREVIEW|ADMIN · DEMO/.test(document.querySelector('.admin-shell').innerText)"), false);
  await evaluate("document.querySelector('.recent-projects a').click()");
  await wait("location.pathname==='/projects' && document.querySelector('.operation-list-card')", 'project overview link');
  await evaluate("history.back()");
  await wait("document.querySelector('.processing-jobs a')", 'back to dashboard');
  await evaluate("document.querySelector('.processing-jobs a').click()");
  await wait("location.pathname==='/jobs' && document.querySelector('.operation-list-card')", 'job overview link');
  await evaluate("history.back()");
  await wait("document.querySelector('.dashboard-content')", 'dashboard restored');
  const scenario = "import('/src/mocks/adminDashboardScenario.ts')";
  await evaluate(scenario + ".then(m=>{m.adminDashboardScenario.mode='error';m.adminDashboardScenario.latencyMs=700;})");
  await click('Làm mới');
  await wait("document.querySelector('.dashboard-content[aria-busy=true]')", 'refresh retains data while busy');
  await wait("document.querySelector('.dashboard-error')", 'load error');
  assert.ok(await evaluate("document.body.innerText.includes('Không thể tải bảng điều khiển')"));
  await evaluate(scenario + ".then(m=>{m.adminDashboardScenario.mode='success';})");
  await click('Thử lại');
  await wait("document.querySelector('.dashboard-skeleton')", 'retry skeleton');
  await wait("document.querySelectorAll('.stat-card').length===4", 'retry successful');
  await evaluate(scenario + ".then(m=>{m.adminDashboardScenario.mode='empty';})");
  await click('Làm mới');
  await wait("document.querySelectorAll('.dashboard-empty').length===3", 'empty dashboard sections');
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.stat-card strong')].map(x=>x.textContent)"), ['0','0','0','0']);
  assert.ok(await evaluate("document.querySelector('.workload-summary').textContent.includes('0')"));
  await evaluate(scenario + ".then(m=>{m.adminDashboardScenario.mode='success';m.adminDashboardScenario.latencyMs=1500;})");
  await click('Làm mới');
  await evaluate("[...document.querySelectorAll('.desktop-sidebar a')].find(a=>a.getAttribute('href')==='/users').click()");
  await wait("location.pathname==='/users' && document.querySelector('.customer-list-card')", 'leave during load');
  await pause(1600);
  assert.equal(await evaluate("document.querySelector('.dashboard-content')"), null);
  await evaluate(scenario + ".then(m=>{m.adminDashboardScenario.latencyMs=350;})");
  console.log('PASS: S13 stats/projects/jobs/activity/progress, navigation, refresh busy state, error/retry, skeleton, zero-data sections, unmount cancellation.');

  await send('Page.navigate', { url: 'http://127.0.0.1:5174/login' });
  await wait("document.querySelector('#email')", 'login reload');
  assert.equal(await evaluate("document.querySelector('#password').value"), '');
  for (const width of [1440,768,375]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false }); await pause(50);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth'), 'login overflow');
  }
  assert.deepEqual(exceptions, []);
  assert.deepEqual(apiRequests, []);
  console.log('PASS: login validation/navigation/no storage, all routes + refresh, active navigation, six viewport widths, drawer focus/Escape/navigation, root redirect, no runtime exceptions or API requests.');
  console.log('Screenshot: ' + path.join(tmpdir(), 's13-admin-dashboard.png'));
} finally { socket.close(); }
