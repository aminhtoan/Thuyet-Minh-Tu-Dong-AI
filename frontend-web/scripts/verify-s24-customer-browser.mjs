import assert from 'node:assert/strict';
import { setTimeout as pause } from 'node:timers/promises';

const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const target = targets.find((item) => item.type === 'page');
assert.ok(target, 'Không tìm thấy Chrome page qua cổng 9223.');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
let id = 0;
const pending = new Map();
const exceptions = [];
socket.addEventListener('message', ({ data }) => { const message = JSON.parse(data); if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text); if (!message.id) return; const request = pending.get(message.id); pending.delete(message.id); if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result); });
const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); socket.send(JSON.stringify({ id: requestId, method, params })); });
async function evaluate(expression) { const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails)); return response.result.value; }
async function wait(expression, label) { const deadline = Date.now() + 20_000; while (!await evaluate(`Boolean(${expression})`)) { if (Date.now() > deadline) throw new Error(`Hết thời gian chờ: ${label}`); await pause(100); } }
const setInput = (selector, value) => evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const email = `s2421-${Date.now()}@example.test`;
const password = `Disposable-${Date.now()}-A1!`;
let projectIds = [];
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:5173/register' }); await wait("location.pathname==='/register'&&document.querySelector('input[autocomplete=name]')", 'register');
  await setInput('input[autocomplete="name"]', 'S24 Disposable Customer'); await setInput('input[type="email"]', email);
  const passwords = await evaluate("[...document.querySelectorAll('input[type=password]')].length"); assert.equal(passwords, 2);
  await evaluate(`(()=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;for(const element of document.querySelectorAll('input[type=password]')){setter.call(element,${JSON.stringify(password)});element.dispatchEvent(new Event('input',{bubbles:true}));}document.querySelector('form').requestSubmit();})()`);
  await wait("location.pathname==='/login'&&document.querySelector('input[type=email]')", 'register completion');
  await setInput('input[type="email"]', email); await setInput('input[type="password"]', password); await evaluate("document.querySelector('form').requestSubmit()");
  await wait("location.pathname==='/dashboard'", 'login completion');
  assert.ok(await evaluate("JSON.parse(sessionStorage.getItem('customer-session')).accessToken.length>20"));

  projectIds = await evaluate(`(async()=>{const session=JSON.parse(sessionStorage.getItem('customer-session'));const ids=[];for(let index=1;index<=11;index++){const response=await fetch('http://localhost:8080/api/projects',{method:'POST',headers:{authorization:'Bearer '+session.accessToken,'content-type':'application/json'},body:JSON.stringify({name:'S24.2.1 phân trang '+String(index).padStart(2,'0'),description:'Dữ liệu kiểm thử disposable',sourceLanguage:'vi'})});const body=await response.json();if(!response.ok)throw new Error(body.error?.message);ids.push(body.data.project.id);}return ids;})()`);
  assert.equal(projectIds.length, 11);
  const crudMedia = await evaluate(`(async()=>{const token=JSON.parse(sessionStorage.getItem('customer-session')).accessToken;const projectId=${JSON.stringify(projectIds[0])};const headers={authorization:'Bearer '+token};const update=await fetch('http://localhost:8080/api/projects/'+projectId,{method:'PATCH',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({description:'Đã cập nhật qua browser smoke'})});const buffer=new ArrayBuffer(2044);const view=new DataView(buffer);const text=(offset,value)=>[...value].forEach((character,index)=>view.setUint8(offset+index,character.charCodeAt(0)));text(0,'RIFF');view.setUint32(4,2036,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,2000,true);const form=new FormData();form.append('file',new File([buffer],'s2421.wav',{type:'audio/wav'}));const upload=await fetch('http://localhost:8080/api/projects/'+projectId+'/media',{method:'POST',headers,body:form});const detail=await fetch('http://localhost:8080/api/projects/'+projectId,{headers});const media=await fetch('http://localhost:8080/api/projects/'+projectId+'/media',{headers});return [update.status,upload.status,detail.status,media.status];})()`);
  assert.deepEqual(crudMedia, [200, 201, 200, 200]);
  await send('Page.navigate', { url: 'http://localhost:5173/projects?q=S24.2.1%20ph%C3%A2n%20trang' });
  await wait("document.querySelectorAll('.project-card').length===10", 'page one');
  assert.ok(await evaluate("document.body.textContent.includes('Trang 1 / 2')"));
  await evaluate("[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Trang sau').click()");
  await wait("location.search.includes('page=2')&&document.querySelectorAll('.project-card').length===1", 'page two');
  await evaluate(`(()=>{const input=document.querySelector('.project-filters input');const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'S24.2.1 phân trang 01');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await wait("!location.search.includes('page=2')&&document.querySelectorAll('.project-card').length===1", 'search resets page');

  const oldRefresh = await evaluate(`(()=>{const session=JSON.parse(sessionStorage.getItem('customer-session'));session.accessToken='invalid';sessionStorage.setItem('customer-session',JSON.stringify(session));return session.refreshToken;})()`);
  await send('Page.navigate', { url: 'http://localhost:5173/projects?q=S24.2.1%20ph%C3%A2n%20trang' });
  await wait("document.querySelectorAll('.project-card').length===10", 'automatic access-token refresh');
  assert.notEqual(await evaluate("JSON.parse(sessionStorage.getItem('customer-session')).refreshToken"), oldRefresh);

  const checks = await evaluate(`(async()=>{const token=JSON.parse(sessionStorage.getItem('customer-session')).accessToken;const headers={authorization:'Bearer '+token};const projectId=${JSON.stringify(projectIds[0])};const paths=['/projects/'+projectId,'/projects/'+projectId+'/transcript','/projects/'+projectId+'/translations','/projects/'+projectId+'/narrations','/projects/'+projectId+'/results','/voices'];const statuses=[];for(const path of paths)statuses.push((await fetch('http://localhost:8080/api'+path,{headers})).status);return statuses;})()`);
  assert.deepEqual(checks, [200, 404, 200, 200, 200, 200]);

  await evaluate(`(async()=>{const token=JSON.parse(sessionStorage.getItem('customer-session')).accessToken;for(const projectId of ${JSON.stringify(projectIds)})await fetch('http://localhost:8080/api/projects/'+projectId,{method:'DELETE',headers:{authorization:'Bearer '+token}});})()`);
  projectIds = [];
  await send('Page.navigate', { url: 'http://localhost:5173/settings' }); await wait("document.body.textContent.includes('Đăng xuất')", 'settings');
  await evaluate("[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Đăng xuất').click()"); await wait("location.pathname==='/login'", 'logout');
  assert.equal(await evaluate("sessionStorage.getItem('customer-session')"), null);
  assert.deepEqual(exceptions, []);
  console.log('PASS: register/login/logout, refresh rotation, server pagination/search reset, project create/list/retrieval/delete, empty artifact retrieval and voice catalog.');
} finally {
  if (projectIds.length) await evaluate(`(async()=>{const raw=sessionStorage.getItem('customer-session');if(!raw)return;const token=JSON.parse(raw).accessToken;for(const projectId of ${JSON.stringify(projectIds)})await fetch('http://localhost:8080/api/projects/'+projectId,{method:'DELETE',headers:{authorization:'Bearer '+token}});})()`).catch(()=>{});
  socket.close();
}
