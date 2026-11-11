import test from 'node:test';
import assert from 'node:assert/strict';
import {DrainRuntime} from '../src/maintenance/runtime.js';
const db={connected:true,activeJobs:0,unresolvedAttempts:0};
function ready(){const r=new DrainRuntime('SYNTHETIC_CLOSED_WORLD');r.activateNormalCoverage();r.close();r.startDraining();return r;}
function fence(r:DrainRuntime){return r.establishFence(db,'deployment','container',r.snapshot().activityRevision);}
test('state transitions, terminal admission and RUNNING behavior',()=>{
 const r=new DrainRuntime('SYNTHETIC_CLOSED_WORLD');assert.equal(r.snapshot().state,'RUNNING');const done=r.begin();done();r.close();assert.equal(r.snapshot().state,'MAINTENANCE');r.startDraining();assert.equal(r.snapshot().state,'DRAINING');r.activateNormalCoverage();assert.ok(fence(r));assert.equal(r.snapshot().state,'FENCED');assert.throws(()=>r.open());assert.throws(()=>r.enterRequest());assert.throws(()=>r.begin());assert.throws(()=>r.registerEntryPoint('unknown',false));assert.throws(()=>r.observe('late',()=>({liveDrafts:0,pending:0})));
});
test('active operations, providers and FFmpeg resource registrations block fence',()=>{
 for(const kind of ['activeOperations','providerCalls','pendingApprovals'] as const){const r=ready();const leave=r.begin(kind);assert.equal(fence(r),null);leave();assert.ok(fence(r));}
});
test('draft, unknown coverage and failed database prevent fence',()=>{
 const r=ready();let drafts=1;r.observe('draft',()=>({liveDrafts:drafts,pending:0}));assert.equal(fence(r),null);drafts=0;r.registerEntryPoint('unknown',false);assert.equal(fence(r),null);r.registerEntryPoint('unknown',true);assert.equal(r.establishFence(null,'deployment','container',r.snapshot().activityRevision),null);assert.ok(fence(r));
});
test('both atomic orderings: registration first blocks fence; fence first rejects registration',async()=>{
 const r=ready();const done=r.begin();assert.equal(fence(r),null);done();await Promise.resolve();assert.ok(fence(r));let sideEffect=false;await assert.rejects(r.track('providerCalls',()=>{sideEffect=true;}));assert.equal(sideEffect,false);
});
test('token binds boot, identity, generation, expiry and is single-consumption',()=>{
 const r=ready(),t=fence(r)!;assert.ok(t);assert.equal(r.validateFence(t,'other','container'),false);assert.equal(r.validateFence(t,'deployment','other'),false);assert.equal(ready().validateFence(t,'deployment','container'),false);assert.equal(r.validateFence({...t,fenceGeneration:99},'deployment','container'),false);assert.equal(r.validateFence({...t,expiration:0},'deployment','container'),false);assert.equal(r.consumeFence(t,'deployment','container'),true);assert.equal(r.consumeFence(t,'deployment','container'),false);assert.throws(()=>r.open());
});
test('real token expiration does not reopen admission or permit new work',()=>{
 const r=ready(),t=fence(r)!;const now=Date.now;try{Date.now=()=>t.expiration+1;assert.equal(r.validateFence(t,'deployment','container'),false);assert.throws(()=>r.open());assert.throws(()=>r.begin());}finally{Date.now=now;}
});
test('production coverage never inferred from drain certificate or normal HTTP profile',()=>{
 const r=new DrainRuntime();r.activateNormalCoverage();r.close();r.startDraining();assert.ok(r.certificate(db,'deployment',r.snapshot().activityRevision));assert.equal(fence(r),null);assert.equal(r.snapshot().state,'DRAINING');
});
