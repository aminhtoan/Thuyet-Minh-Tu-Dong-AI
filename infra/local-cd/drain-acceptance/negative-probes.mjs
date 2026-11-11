import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const mode=process.argv[2],headers={authorization:'Bearer '+process.env.MAINTENANCE_CONTROL_TOKEN,'content-type':'application/json'};
if(mode==='database-down'){
 const r=await fetch('http://127.0.0.1:9091/maintenance/status',{headers,signal:AbortSignal.timeout(6000)});const b=await r.json();
 assert.equal(b.status,'BLOCKED');assert.equal(b.certificate,null);assert.ok(b.reasons.includes('DATABASE_UNKNOWN'));
 console.log('PASS database observation failure BLOCKED');
}else if(mode==='restart'){
 const old=JSON.parse(await readFile('/tmp/drain-b3-certificate.json','utf8'));
 let b;
 for(let i=0;i<30;i++){try{const r=await fetch('http://127.0.0.1:9091/maintenance/status',{headers,signal:AbortSignal.timeout(1000)});b=await r.json();break;}catch{await new Promise(r=>setTimeout(r,100));}}
 assert.ok(b);assert.notEqual(b.bootId,old.processBootId);
 assert.ok(Date.parse(old.expiresAt)>Date.now(),'restart test must reject before old certificate expires');
 const r=await fetch('http://127.0.0.1:9091/maintenance/verify',{method:'POST',headers,body:JSON.stringify(old)});
 assert.equal(r.status,409);assert.equal((await r.json()).status,'BLOCKED');
 console.log('PASS pre-expiry old certificate rejected after restart; oldBoot='+old.processBootId+' newBoot='+b.bootId);
}else throw Error('UNKNOWN_TEST');
