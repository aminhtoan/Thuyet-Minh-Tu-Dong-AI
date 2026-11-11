import test from 'node:test';
import assert from 'node:assert/strict';
import {DrainRuntime,drainRuntime,trackedObject} from '../src/maintenance/runtime.js';
import {scheduleCapability,type Scheduler} from '../src/maintenance/scheduled.js';
import {GroupDraftStore} from '../src/services/translation/group-draft-store.js';
const db={connected:true,activeJobs:0,unresolvedAttempts:0};
function ready(){const r=new DrainRuntime('SYNTHETIC_CLOSED_WORLD');r.activateNormalCoverage();r.close();r.startDraining();return r;}
const fence=(r:DrainRuntime)=>r.establishFence(db,'d','c',r.snapshot().activityRevision);
function deferred(){let resolve!:()=>void;const promise=new Promise<void>(r=>{resolve=r;});return {promise,resolve};}
test('pending timer prevents fence; cancellation prevents later callback',()=>{
 const r=ready();let fire!:()=>void,sideEffects=0;
 const cancel=scheduleCapability(run=>{fire=run;return ()=>{};},()=>{sideEffects++;},1,r);
 assert.equal(fence(r),null);cancel();assert.ok(fence(r));fire();assert.equal(sideEffects,0);
});
test('running timer retains operation through async cleanup even if cancelled',async()=>{
 const r=ready(),wait=deferred();let fire!:()=>void;
 const scheduler:Scheduler=run=>{fire=run;return ()=>{};};
 const cancel=scheduleCapability(scheduler,()=>wait.promise,1,r);fire();cancel();assert.equal(fence(r),null);
 wait.resolve();await new Promise(resolve=>setImmediate(resolve));assert.ok(fence(r));
});
test('timer registration after fence cannot schedule side effects',()=>{
 const r=ready();assert.ok(fence(r));let scheduled=false;
 assert.throws(()=>scheduleCapability(()=>{scheduled=true;return ()=>{};},()=>{},1,r));assert.equal(scheduled,false);
});
test('failed schedule releases counter; callback error invalidates coverage',()=>{
 const r=ready();assert.throws(()=>scheduleCapability(()=>{throw Error('scheduler');},()=>{},1,r));assert.equal(r.snapshot().activeOperations,0);
 let fire!:()=>void;scheduleCapability(run=>{fire=run;return ()=>{};},()=>{throw Error('callback');},1,r);
 assert.throws(fire);assert.equal(fence(r),null);assert.equal(r.snapshot().coverageComplete,false);
});
test('repository-style direct writes and transaction callback retain operation until settlement',async()=>{
 const r=ready(),wait=deferred();let writes=0;
 const collection=trackedObject({async write(){writes++;await wait.promise;return 7;},async transaction(callback:()=>Promise<void>){await callback();}},'activeOperations',r);
 const pending=collection.write();assert.equal(writes,1);assert.ok(r.snapshot().activeOperations>0);
 assert.equal(fence(r),null);
 wait.resolve();assert.equal(await pending,7);
 const transaction=deferred();const run=collection.transaction(()=>transaction.promise);assert.ok(r.snapshot().activeOperations>0);
 transaction.resolve();await run;assert.equal(r.snapshot().activeOperations,0);assert.ok(fence(r));await assert.rejects(collection.write());assert.equal(writes,1);
});
test('late callback must re-register and is rejected by terminal coordinator',async()=>{
 const r=ready();assert.ok(fence(r));let write=false;
 await assert.rejects(r.track('activeOperations',()=>{write=true;}));assert.equal(write,false);
 // This tests the required callback boundary, not proof of SDK internals.
});
test('startup/CLI/unknown entry point never becomes production fencing proof',()=>{
 for(const entry of ['startup','shutdown','cli','new-entry']){const r=ready();r.registerEntryPoint(entry,false);assert.equal(fence(r),null);}
});
test('GROUPS restore timer retains registration after logical expiry until callback cleanup',()=>{
 let now=0,fire!:()=>void;
 const before=drainRuntime.snapshot().activeOperations;
 const store=new GroupDraftStore(()=>now,1000,50,(callback,delay)=>scheduleCapability(run=>{fire=run;return ()=>{};},callback,delay));
 store.restore({draftId:'capability-timer',ownerId:'u',projectId:'p',expiresAt:new Date(1000).toISOString()} as never);
 assert.equal(store.get('capability-timer','u','p').draftId,'capability-timer');
 assert.equal(drainRuntime.snapshot().activeOperations,before+1);
 now=2000;assert.equal(drainRuntime.snapshot().activeOperations,before+1);fire();
 assert.equal(drainRuntime.snapshot().activeOperations,before);
});
test('actual source-language service registers before session and retains failed transaction cleanup',async()=>{
 const {default:mongoose}=await import('mongoose');
 const {Project}=await import('../src/models/Project.js');
 const {updateProjectSource}=await import('../src/services/source-language.service.js');
 const originalSession=mongoose.startSession,originalFind=Project.findOne;
 const cleanup=deferred(),entered=deferred();const before=drainRuntime.snapshot().activeOperations;
 mongoose.startSession=(async()=>{
  assert.ok(drainRuntime.snapshot().activeOperations>before);
  return {withTransaction:async(work:()=>Promise<unknown>)=>work(),endSession:async()=>{entered.resolve();await cleanup.promise;}};
 }) as never;
 Project.findOne=(()=>({session:async()=>null})) as never;
 try{
  const work=updateProjectSource('p','u',{});
  const rejected=assert.rejects(work,(error:unknown)=>!!error&&typeof error==='object'&&'code' in error&&error.code==='PROJECT_NOT_FOUND');await entered.promise;
  assert.ok(drainRuntime.snapshot().activeOperations>before);cleanup.resolve();await rejected;
  assert.equal(drainRuntime.snapshot().activeOperations,before);
 }finally{cleanup.resolve();mongoose.startSession=originalSession;Project.findOne=originalFind;}
});
