// Optional browser smoke check. Requires Vite on 127.0.0.1:5175 and a separate
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
  while (!await evaluate('Boolean(' + expression + ')')) {
    if (Date.now() > deadline) throw new Error('Timed out: ' + label);
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
  await send('Page.navigate', { url: 'http://127.0.0.1:5175/dashboard' });
  await wait("document.querySelector('.dashboard-hero')", 'dashboard');
  for (const width of [1920, 1440, 1366, 1024, 768, 375]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await pause(180);
    assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), 'dashboard overflow ' + width);
    assert.equal(await evaluate("document.querySelectorAll('.quick-action').length"), 4);
    assert.equal(await evaluate("document.querySelectorAll('.stat-card').length"), 4);
    if (width === 1440) {
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      await writeFile(path.join(tmpdir(), 's115-dashboard.png'), Buffer.from(shot.data, 'base64'));
      console.log('Screenshot: ' + path.join(tmpdir(), 's115-dashboard.png'));
    }
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate("(()=>{const input=document.querySelector('.topbar__search input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'aN gIaNg');input.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await evaluate("document.querySelector('.topbar__search').requestSubmit()");
  await wait("location.pathname==='/projects' && document.querySelectorAll('.project-card').length===1", 'global search');
  assert.ok(await evaluate("document.querySelector('.project-card').textContent.includes('An Giang')"));
  await evaluate("[...document.querySelectorAll('a')].find(a=>a.getAttribute('href')==='/projects/new').click()");
  await wait("document.querySelector('#media-file')", 'upload route');
  await evaluate("(()=>{const input=document.querySelector('.upload-fields input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Visual regression');input.dispatchEvent(new Event('input',{bubbles:true}));const select=document.querySelector('#source-language');select.value='vi';select.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await evaluate("(()=>{const buffer=new ArrayBuffer(2044);const view=new DataView(buffer);const str=(offset,s)=>[...s].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));str(0,'RIFF');view.setUint32(4,2036,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,2000,true);const transfer=new DataTransfer();transfer.items.add(new File([buffer],'regression.wav',{type:'audio/wav'}));const input=document.querySelector('#media-file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await click('Upload & Continue');
  await wait("document.body.textContent.includes('Upload complete')", 'mock upload completion');
  await evaluate("document.querySelector('.upload-feedback a').click()");
  await wait("location.pathname==='/projects'", 'upload continue');
  for (const route of ['/projects', '/projects/new', '/history', '/projects/project-009/transcript', '/projects/project-009/translation', '/projects/project-009/voice', '/projects/project-009/generate', '/projects/project-001/result']) {
    await evaluate('history.pushState({},"",' + JSON.stringify(route) + ');window.dispatchEvent(new PopStateEvent("popstate"))');
    await pause(400);
    for (const width of [1440, 1024, 768, 375]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false }); await pause(80);
      assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth'), route + ' overflow ' + width);
    }
  }
  assert.deepEqual(exceptions, []);
  console.log('PASS: six dashboard widths, existing counts/actions, global search, New Project/upload/continue, workflow page responsive checks.');
} finally { socket.close(); }
