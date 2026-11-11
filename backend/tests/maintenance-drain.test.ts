import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Server } from 'node:http';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { DrainRuntime, drainRuntime } from '../src/maintenance/runtime.js';
import { businessAdmission, instrumentRouter } from '../src/maintenance/http.js';
import { createDrainControl } from '../src/maintenance/control.js';
import { GroupDraftStore } from '../src/services/translation/group-draft-store.js';

const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(r=>{resolve=r;}); return {promise,resolve}; };
async function start(server: Server) { server.listen(0,'127.0.0.1'); await once(server,'listening'); return 'http://127.0.0.1:'+(server.address() as {port:number}).port; }
async function stop(server: Server) { await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve())); }

test('maintenance closes new requests but existing async handler and provider finish normally', async () => {
  drainRuntime.open();
  const done=deferred(), entered=deferred(); const router=express.Router();
  router.get('/work',async (_req,res)=>{entered.resolve();await drainRuntime.track('providerCalls',()=>done.promise);res.json({ok:true});});
  router.get('/health',(_req,res)=>{res.json({ok:true});});
  instrumentRouter(router);
  const app=express(); app.use(businessAdmission);app.use('/api',router);
  const actual=await import('node:http').then(({createServer})=>createServer(app));
  const url=await start(actual);
  try {
    const ongoing=fetch(url+'/api/work'); await entered.promise;
    drainRuntime.close();
    assert.equal((await fetch(url+'/api/work')).status,503);
    assert.equal((await fetch(url+'/api/health')).status,200);
    assert.equal(drainRuntime.snapshot().providerCalls,1);
    assert.ok(drainRuntime.snapshot().activeOperations>0);
    done.resolve(); assert.equal((await ongoing).status,200);
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(drainRuntime.snapshot().providerCalls,0);
    drainRuntime.open();
    assert.equal((await fetch(url+'/api/work')).status,200);
    assert.equal((await fetch(url+'/api/maintenance/status')).status,404);
  } finally { done.resolve();drainRuntime.open();await stop(actual); }
});

test('RAM drafts and pending approval remain visible until expiry/settlement without content exposure', async () => {
  let now=100;
  const store=new GroupDraftStore(()=>now,1000,50,()=>()=>{});
  const before=drainRuntime.snapshot().unrecoverableLiveDrafts;
  store.restore({draftId:'draft',ownerId:'u',projectId:'p',expiresAt:new Date(1000).toISOString()} as never);
  assert.equal(drainRuntime.snapshot().unrecoverableLiveDrafts,before+1);
  const wait=deferred(); const approval=store.approve('draft',()=>wait.promise);
  assert.equal(drainRuntime.snapshot().pendingApprovals,1);
  wait.resolve();await approval;
  assert.equal(drainRuntime.snapshot().pendingApprovals,0);
  now=2000;
  assert.equal(drainRuntime.snapshot().unrecoverableLiveDrafts,before);
  const runtime=new DrainRuntime(); runtime.observe('unknown',()=>{throw Error('PRIVATE_TRANSCRIPT');});
  assert.equal(runtime.snapshot().observerKnown,false);
  assert.ok(!JSON.stringify(runtime.snapshot()).includes('PRIVATE_TRANSCRIPT'));
});

test('client disconnect does not remove unfinished operation/provider counters or cancel the work', async () => {
  drainRuntime.open();
  const done=deferred(), entered=deferred(), completed=deferred();
  const router=express.Router();
  router.get('/long',async (_req,res)=>{entered.resolve();await drainRuntime.track('providerCalls',()=>done.promise);completed.resolve();res.end('done');});
  instrumentRouter(router);
  const app=express();app.use(businessAdmission);app.use('/api',router);
  const server=await import('node:http').then(({createServer})=>createServer(app));
  const url=await start(server);
  try {
    const request=httpRequest(url+'/api/long',{agent:false});
    request.on('error',()=>{});request.end();
    await entered.promise;request.destroy();
    drainRuntime.close();
    assert.equal(drainRuntime.snapshot().providerCalls,1);
    assert.ok(drainRuntime.snapshot().activeOperations>0);
    done.resolve();await completed.promise;await new Promise(r=>setImmediate(r));
    assert.equal(drainRuntime.snapshot().providerCalls,0);
  } finally {done.resolve();drainRuntime.open();await stop(server);}
});

test('internal authenticated loopback control observes live process but never certifies incomplete coverage', async () => {
  let unavailable=false;
  const token='synthetic-control-token-not-real-123456789';
  const server=createDrainControl(token,async()=>{if(unavailable)throw Error('secret database uri');return {connected:true,activeJobs:0,unresolvedAttempts:0};},'synthetic-container');
  const url=await start(server), headers={authorization:'Bearer '+token};
  try {
    assert.equal((await fetch(url+'/maintenance/status')).status,401);
    const close=await fetch(url+'/maintenance/close',{method:'POST',headers});assert.equal(close.status,200);
    const shutdown=await fetch(url+'/maintenance/authorize-shutdown',{method:'POST',headers});assert.equal(shutdown.status,409);assert.equal((await shutdown.json()).code,'CONTAINER_IDENTITY_UNATTESTED');
    const fence=await fetch(url+'/maintenance/fence',{method:'POST',headers});assert.equal(fence.status,409);assert.equal((await fence.json()).code,'FENCING_COVERAGE_UNPROVEN');
    const body=await (await fetch(url+'/maintenance/status',{headers})).json();
    assert.equal(body.bootId,drainRuntime.bootId);assert.ok(body.drainOperationId);
    assert.equal(body.deploymentIdentity,'synthetic-container');assert.equal(body.status,'BLOCKED');assert.equal(body.certificate,null);
    unavailable=true;
    const unknown=await (await fetch(url+'/maintenance/status',{headers})).json();
    assert.ok(unknown.reasons.includes('DATABASE_UNKNOWN'));assert.ok(!JSON.stringify(unknown).includes('secret database uri'));
    await fetch(url+'/maintenance/open',{method:'POST',headers});assert.equal(drainRuntime.admissionClosed,false);
    for(let i=0;i<21;i++)await fetch(url+'/maintenance/status',{headers});
    assert.equal((await fetch(url+'/maintenance/status',{headers})).status,429);
  } finally {drainRuntime.open();await stop(server);}
});
