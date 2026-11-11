import test from 'node:test';
import assert from 'node:assert/strict';
import {DrainRuntime,drainRuntime} from '../src/maintenance/runtime.js';
import {GroupDraftStore} from '../src/services/translation/group-draft-store.js';
const db={connected:true,activeJobs:0,unresolvedAttempts:0};
function fenced(){const r=new DrainRuntime('SYNTHETIC_CLOSED_WORLD');r.activateNormalCoverage();r.close();r.startDraining();const token=r.establishFence(db,'deployment','container',r.snapshot().activityRevision)!;return {r,token};}
test('correct owner authorizes one terminal cleanup, no business work or reopen',async()=>{
 const {r,token}=fenced();assert.equal(r.authorizeShutdown(token,'deployment','container'),true);
 let cleaned=false;await r.shutdownFenced(async()=>{assert.throws(()=>r.begin());assert.throws(()=>r.open());cleaned=true;});
 assert.ok(cleaned);assert.equal(r.snapshot().shutdownState,'SAFE');assert.ok(r.admissionClosed);
 await assert.rejects(r.shutdownFenced(async()=>{}));assert.equal(r.authorizeShutdown(token,'deployment','container'),false);
});
test('wrong owner, identity, generation or unauthenticated SIGTERM cannot authorize cleanup',async()=>{
 const {r,token}=fenced();let cleaned=false;
 assert.equal(r.authorizeShutdown(token,'wrong','container'),false);
 assert.equal(r.authorizeShutdown({...token,fenceGeneration:99},'deployment','container'),false);
 assert.equal(r.authorizeShutdown(token,'deployment','other'),false);
 await assert.rejects(r.shutdownFenced(async()=>{cleaned=true;}));assert.equal(cleaned,false);assert.ok(r.admissionClosed);
});
test('cleanup failure and timeout never report safe; timeout does not cancel pending cleanup',async()=>{
 for(const timeout of [false,true]){
  const {r,token}=fenced();r.authorizeShutdown(token,'deployment','container');let settle!:()=>void;
  const pending=new Promise<void>(resolve=>{settle=resolve;});
  await assert.rejects(r.shutdownFenced(async()=>{if(timeout)await pending;else throw Error('cleanup');},10));
  assert.equal(r.snapshot().shutdownState,'FAILED');assert.ok(r.admissionClosed);settle();await pending;
  assert.equal(r.snapshot().shutdownState,'FAILED');
 }
});
test('cleanup remains pending and admission closed until actual completion',async()=>{
 const {r,token}=fenced();r.authorizeShutdown(token,'deployment','container');let done!:()=>void;
 const wait=new Promise<void>(resolve=>{done=resolve;});const shutdown=r.shutdownFenced(()=>wait);
 assert.equal(r.snapshot().shutdownState,'CLEANING');assert.throws(()=>r.runSync(()=>{}));done();await shutdown;
 assert.equal(r.snapshot().shutdownState,'SAFE');
});
test('actual GROUPS public mutation methods cannot enter after FENCED',async()=>{
 const r=new DrainRuntime('SYNTHETIC_CLOSED_WORLD');const store=new GroupDraftStore(()=>0,1000,50,()=>()=>{},r);
 r.activateNormalCoverage();r.close();r.startDraining();assert.ok(r.establishFence(db,'d','c',r.snapshot().activityRevision));
 assert.throws(()=>store.restore({draftId:'new'} as never),/PROCESS_FENCED/);
 assert.throws(()=>store.get('x','u','p'),/PROCESS_FENCED/);
 assert.throws(()=>store.approve('x',async()=>{}),/PROCESS_FENCED/);
 await assert.rejects(store.preview('k','s',async()=>({} as never)),/PROCESS_FENCED/);
});
test('actual Auth direct write registers before invocation and holds until write settles',async()=>{
 const {User}=await import('../src/models/User.js');const {updateDisplayName}=await import('../src/services/auth.service.js');
 const original=User.findOneAndUpdate;let finish!:(value:null)=>void;
 const before=drainRuntime.snapshot().activeOperations;
 User.findOneAndUpdate=(()=>{assert.ok(drainRuntime.snapshot().activeOperations>before);return new Promise<null>(resolve=>{finish=resolve;});}) as never;
 try{const work=updateDisplayName('u','Name');const rejected=assert.rejects(work,(e:unknown)=>!!e&&typeof e==='object'&&'code' in e&&e.code==='INVALID_TOKEN');
 assert.ok(drainRuntime.snapshot().activeOperations>before);finish(null);await rejected;assert.equal(drainRuntime.snapshot().activeOperations,before);
 }finally{User.findOneAndUpdate=original;}
});
