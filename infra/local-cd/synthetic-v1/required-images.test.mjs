import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareMongoImage,MONGO_IMAGE} from './required-images.mjs';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const image='sha256:'+'a'.repeat(64);
const ok={status:0,stdout:image,stderr:''};
const missing={status:1,stdout:'',stderr:'No such image: mongo:8.0.17'};
test('cold cache pulls exact MongoDB version and verifies image before use',()=>{
 const calls=[],results=[missing,{status:0,stdout:'downloaded',stderr:''},ok];
 const prepared=prepareMongoImage(args=>{calls.push(args);return results.shift();});
 assert.equal(prepared.id,image);assert.equal(prepared.pulled,true);
 assert.deepEqual(calls,[['image','inspect',MONGO_IMAGE,'--format','{{.Id}}'],['pull','mongo:8.0.17'],['image','inspect',MONGO_IMAGE,'--format','{{.Id}}']]);
});
test('valid cached image requires no pull or container mutation',()=>{
 const calls=[];const p=prepareMongoImage(args=>{calls.push(args);return ok;});assert.equal(p.pulled,false);assert.equal(calls.length,1);
});
test('pull failure or timeout stops preparation without a latest fallback',()=>{
 for(const failure of [{status:1,stdout:'',stderr:'manifest unknown'},{status:null,error:{code:'ETIMEDOUT'},stdout:'',stderr:''}]){
  const calls=[];assert.throws(()=>prepareMongoImage(args=>{calls.push(args);return calls.length===1?missing:failure;}),error=>{assert.match(error.message,/MONGO_IMAGE_PULL_FAILED/);assert.match(error.details,/manifest unknown|ETIMEDOUT/);return true;});
  assert.equal(calls.length,2);assert.deepEqual(calls[1],['pull','mongo:8.0.17']);
 }
});
test('reported pull success is insufficient unless the exact image can be inspected',()=>{
 const results=[missing,{status:0,stdout:'',stderr:''},missing];assert.throws(()=>prepareMongoImage(()=>results.shift()),/MONGO_IMAGE_UNAVAILABLE_AFTER_PREPARATION/);
});
test('runner pull failure exits before build/deploy and preserves logs and empty cleanup scope',()=>{
 const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../../..');
 const runId='guard-pull-'+randomBytes(4).toString('hex'),dir=resolve(root,'infra/local-cd/.state/synthetic-v1',runId);mkdirSync(dir,{recursive:true});
 const trace=resolve(dir,'docker-calls.json'),hook=resolve(dir,'fake-docker.mjs');
 writeFileSync(hook,`import cp from 'node:child_process';import {syncBuiltinESMExports} from 'node:module';import {writeFileSync} from 'node:fs';const original=cp.spawnSync,calls=[];cp.spawnSync=(binary,args,options)=>{if(binary!=='docker')return original(binary,args,options);calls.push(args);writeFileSync(${JSON.stringify(trace)},JSON.stringify(calls));if(args[0]==='info')return {status:0,stdout:'linux',stderr:''};if(args[0]==='ps'||args[1]==='ls')return {status:0,stdout:'',stderr:''};if(args[0]==='image')return {status:1,stdout:'',stderr:'No such image: mongo:8.0.17'};if(args[0]==='pull')return {status:1,stdout:'',stderr:'manifest unknown'};throw Error('UNEXPECTED_DOCKER_COMMAND');};syncBuiltinESMExports();`);
 // Runner refuses an existing run directory. Keep the fixture hook in a separate sibling.
 const actualId=runId+'-run',actualDir=resolve(root,'infra/local-cd/.state/synthetic-v1',actualId);
 const child=spawnSync(process.execPath,['--import',pathToFileURL(hook).href,resolve(here,'run.mjs'),'run','--run-id',actualId],{encoding:'utf8',windowsHide:true});
 assert.equal(child.status,1);assert.match(child.stderr,/MONGO_IMAGE_PULL_FAILED/);
 const state=JSON.parse(readFileSync(resolve(actualDir,'state.json'),'utf8'));
 assert.equal(state.result,'FAIL');assert.deepEqual(state.projects,[]);assert.ok(state.events.some(e=>e.kind==='MONGO_IMAGE_FAILED'));assert.ok(!state.events.some(e=>e.kind==='DEPLOYING'));
 assert.match(readFileSync(resolve(actualDir,'mongo-image.log'),'utf8'),/manifest unknown/);
 const calls=JSON.parse(readFileSync(trace,'utf8'));assert.ok(!calls.some(args=>['build','compose','rm','stop','restart'].includes(args[0])));
 writeFileSync(trace,'[]');
 const cleanup=spawnSync(process.execPath,['--import',pathToFileURL(hook).href,resolve(here,'run.mjs'),'cleanup','--state',resolve(actualDir,'state.json')],{encoding:'utf8',windowsHide:true});
 assert.equal(cleanup.status,0);const cleaned=JSON.parse(readFileSync(resolve(actualDir,'state.json'),'utf8'));assert.equal(cleaned.cleaned,true);assert.equal(cleaned.result,'FAIL');assert.deepEqual(JSON.parse(readFileSync(trace,'utf8')),[]);
});
