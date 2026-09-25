// Optional browser smoke check. Requires Vite on 127.0.0.1:5175 and a separate
// temporary Chrome profile with remote debugging on 127.0.0.1:9223.
// Uses Node's built-in WebSocket and the Chrome DevTools Protocol.
import assert from 'node:assert/strict';
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
const overall = "document.querySelector('.processing-panel [role=progressbar]').getAttribute('aria-valuenow')";

try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5175/projects/project-009/transcript' });
  await click('Generate Transcript');
  await wait("document.querySelectorAll('textarea').length===10", 'transcript');
  await click('Save Transcript');
  await click('Continue to Translation');
  await wait("location.pathname.endsWith('/translation')", 'translation route');
  await click('Translate');
  await wait("document.querySelectorAll('textarea').length===10", 'translation');
  await click('Save Translation');
  await click('Continue to Voice / TTS');
  await wait('document.querySelector(\'[aria-label="Select Jenny voice"]\')', 'voices');
  await evaluate('document.querySelector(\'[aria-label="Select Jenny voice"]\').click()');
  await evaluate("(()=>{const input=document.querySelector('#speech-speed'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'1.2');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()");
  await click('Save Configuration');
  await click('Continue to Generate');
  await wait("document.querySelector('.generation-summary')", 'generation summary');
  assert.ok(await evaluate("document.querySelector('.generation-summary').textContent.includes('Jenny')"));
  assert.ok(await evaluate("document.querySelector('.generation-summary').textContent.includes('1.2x')"));
  assert.ok(await evaluate("location.search.includes('language=en')"));
  assert.ok(await evaluate(button('Generate Video') + '.disabled'));
  await evaluate("document.querySelector('.generation-confirmation input').click()");
  await evaluate(button('Generate Video') + '.click();' + button('Generate Video') + '?.click()');
  await wait("document.querySelector('.processing-stage--processing')", 'narration processing');
  assert.ok(await evaluate(button('Edit Voice') + '.disabled'));
  await wait('Number(' + overall + ')>0', 'progress advances');
  await click('Cancel Processing');
  await wait("document.body.textContent.includes('Processing Cancelled')", 'cancelled');
  const cancelledProgress = await evaluate(overall);
  await pause(600);
  assert.equal(await evaluate(overall), cancelledProgress);
  await click('Restart Generation');
  await wait("document.body.textContent.includes('All demo stages completed')", 'completion');
  assert.equal(await evaluate(overall), '100');
  assert.ok(await evaluate(button('View Result') + '.disabled'));
  assert.equal(await evaluate("document.querySelectorAll('[download]').length"), 0);
  console.log('PASS: S7 -> S8 -> S9 -> S10, summary, confirmation, processing, cancel/restart, completion and disabled result');

  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 900, deviceScaleFactor: 1, mobile: false });
  await pause(200);
  assert.ok(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'));
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.generation-layout')).gridTemplateColumns.split(' ').length"), 1);
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await pause(200);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.generation-layout')).gridTemplateColumns.split(' ').length"), 2);
  console.log('PASS: 375px stacked layout and 1280px two-column layout without horizontal overflow');

  await evaluate("import('/src/features/processing/mockProcessingScenario.ts').then(m=>{m.mockProcessingScenario.failFirstAttemptAt='media'})");
  await click('Edit Voice');
  await click('Continue to Generate');
  await wait("document.querySelector('.generation-confirmation input')", 'new session');
  await evaluate("document.querySelector('.generation-confirmation input').click()");
  await click('Generate Video');
  await wait("document.querySelector('.processing-stage--failed')", 'simulated media failure');
  assert.ok(await evaluate("document.querySelector('.processing-outcome').textContent.includes('Video Processing')"));
  await click('Retry Processing');
  await wait("document.body.textContent.includes('All demo stages completed')", 'successful retry');
  assert.equal(await evaluate("document.querySelectorAll('.processing-stage--failed').length"), 0);
  console.log('PASS: deterministic failure, readable stage/reason, retry clears errors and completes');
  await evaluate("import('/src/features/processing/mockProcessingScenario.ts').then(m=>{m.mockProcessingScenario.failFirstAttemptAt=null})");
  await evaluate("import('/src/features/processing/processingService.ts').then(m=>{window.__s10OriginalCreate=m.processingService.createSession;m.processingService.createSession=(...args)=>{const session=window.__s10OriginalCreate(...args);window.__s10Session=session;return session;};})");
  await click('Edit Voice');
  await click('Continue to Generate');
  await wait("document.querySelector('.generation-confirmation input')", 'navigation cleanup session');
  await evaluate("document.querySelector('.generation-confirmation input').click()");
  await click('Generate Video');
  await wait('Number(' + overall + ')>0', 'processing before navigation');
  await evaluate('document.querySelector(\'[href="/projects"]\').click()');
  await wait("location.pathname==='/projects'", 'navigation away');
  const frozenSnapshot = await evaluate('JSON.stringify(window.__s10Session.getStatus())');
  await pause(600);
  assert.equal(await evaluate('JSON.stringify(window.__s10Session.getStatus())'), frozenSnapshot);
  await evaluate('history.back()');
  await wait("document.querySelector('.generation-confirmation input')", 'return to fresh Generate session');
  assert.equal(await evaluate(overall), '0');
  assert.ok(await evaluate(button('Generate Video') + '.disabled'));
  await evaluate("import('/src/features/processing/processingService.ts').then(m=>{m.processingService.createSession=window.__s10OriginalCreate;delete window.__s10OriginalCreate;delete window.__s10Session;})");
  console.log('PASS: sidebar navigation disposes processing, progress stops, return starts a fresh waiting session');
  assert.deepEqual(exceptions, []);
  console.log('PASS: no uncaught browser runtime exceptions');
} finally {
  socket.close();
}
