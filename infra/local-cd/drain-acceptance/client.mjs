import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const token=process.env.MAINTENANCE_CONTROL_TOKEN;
const headers={authorization:'Bearer '+token,'content-type':'application/json'};
let calls=0;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function control(path,method='GET',body){
 if(++calls%15===0)await pause(10500);
 const r=await fetch('http://127.0.0.1:9091/maintenance/'+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(6000)});
 return {http:r.status,body:await r.json()};
}
const fixture=async action=>{const r=await fetch('http://127.0.0.1:9092/'+action,{method:'POST',headers});assert.equal(r.status,200);};
await control('close','POST');
let ready=await control('status');assert.equal(ready.body.status,'READY');
await writeFile('/tmp/drain-b3-certificate.json',JSON.stringify(ready.body.certificate));
assert.equal((await control('verify','POST',ready.body.certificate)).body.status,'VERIFIED');
console.log('PASS quiescent certificate + same-process verification + TTL='+ (Date.parse(ready.body.certificate.expiresAt)-Date.parse(ready.body.certificate.observedAt)));
assert.equal((await fetch('http://127.0.0.1:8080/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,503);
for(const kind of ['provider','ffmpeg','cleanup','draft','unknown']){
 await fixture(kind+'-start');const s=await control('status');assert.equal(s.body.status,'BLOCKED');assert.equal(s.body.certificate,null);
 console.log('PASS '+kind+' BLOCKED');await fixture(kind+'-end');await pause(30);
 assert.equal((await control('status')).body.status,'READY');
}
await control('open','POST');
const request=fetch('http://127.0.0.1:8080/api/acceptance-hold');await pause(100);
await control('close','POST');assert.equal((await control('status')).body.status,'BLOCKED');
await fixture('http-end');await request;console.log('PASS active HTTP BLOCKED');await pause(30);
ready=await control('status');assert.equal(ready.body.status,'READY');
await fixture('activity');assert.equal((await control('verify','POST',ready.body.certificate)).body.status,'BLOCKED');console.log('PASS activity revision invalidation');
ready=await control('status');assert.equal(ready.body.status,'READY');await pause(10500);
assert.equal((await control('verify','POST',ready.body.certificate)).body.status,'BLOCKED');console.log('PASS expired certificate rejected');
ready=await control('status');await writeFile('/tmp/drain-b3-certificate.json',JSON.stringify(ready.body.certificate));
console.log('ALL_SYNTHETIC_LIFETIMES_PASS boot='+ready.body.bootId+' deployment='+ready.body.deploymentIdentity);
