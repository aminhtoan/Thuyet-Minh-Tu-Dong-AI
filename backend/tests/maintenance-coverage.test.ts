import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { DrainRuntime, drainRuntime, detached, holdUntilClose } from '../src/maintenance/runtime.js';
import { trackedStorage } from '../src/maintenance/resources.js';
import { GroupDraftStore } from '../src/services/translation/group-draft-store.js';
import { instrumentRouter } from '../src/maintenance/http.js';
import express from 'express';
import { createDrainControl } from '../src/maintenance/control.js';
import { once } from 'node:events';
import { trackedReadStream } from '../src/maintenance/resources.js';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const database={connected:true,activeJobs:0,unresolvedAttempts:0};
const cert=(r:DrainRuntime)=>r.certificate(database,'synthetic-container',r.snapshot().activityRevision);

test('synthetic certified quiescence, unknown entry point/database and process identity guards',async()=>{
 const r=new DrainRuntime();r.close();assert.equal(cert(r),null);
 r.activateNormalCoverage();const issued=cert(r);assert.ok(issued);assert.equal(r.accepts(issued,'synthetic-container'),true);
 assert.equal(r.accepts(issued,'different-container'),false);
 assert.equal(new DrainRuntime().accepts(issued,'synthetic-container'),false);
 r.open();assert.equal(r.accepts(issued,'synthetic-container'),false);
 r.close();assert.equal(r.accepts(issued,'synthetic-container'),false);
 const before=r.snapshot().activityRevision;const end=r.begin();end();
 assert.equal(r.certificate(database,'synthetic-container',before),null);
 assert.equal(r.certificate(null,'synthetic-container',r.snapshot().activityRevision),null);
 assert.equal(r.certificate({...database,activeJobs:1},'synthetic-container',r.snapshot().activityRevision),null);
 assert.equal(r.certificate({...database,unresolvedAttempts:1},'synthetic-container',r.snapshot().activityRevision),null);
 r.registerEntryPoint('unknown-worker',false);assert.equal(cert(r),null);
});

test('delayed detached audit write, child/stream close and provider/approval lifetime block certificates',async()=>{
 drainRuntime.activateNormalCoverage();drainRuntime.close();
 let resolve!:()=>void;
 const pending=detached(()=>new Promise<void>(r=>{resolve=r;}));
 assert.equal(cert(drainRuntime),null);resolve();await pending;
 for(const kind of ['providerCalls','pendingApprovals'] as const){const end=drainRuntime.begin(kind);assert.equal(cert(drainRuntime),null);end();}
 const stream=new EventEmitter();holdUntilClose(stream);
 stream.emit('end');assert.equal(cert(drainRuntime),null);
 stream.emit('close');assert.ok(cert(drainRuntime));
 drainRuntime.open();
});

test('storage callbacks keep cleanup counted and RAM draft blocks until normal expiry',async()=>{
 drainRuntime.activateNormalCoverage();drainRuntime.close();
 let callback!:()=>void;
 const storage=trackedStorage({_handleFile(_req,_file,cb){callback=()=>cb(null,{});},_removeFile(_req,_file,cb){callback=()=>cb(null);}});
 storage._removeFile({} as never,{} as never,()=>{});
 assert.equal(cert(drainRuntime),null);callback();assert.ok(cert(drainRuntime));
 let now=0;const store=new GroupDraftStore(()=>now,1000,50,()=>()=>{});
 store.restore({expiresAt:new Date(1000).toISOString(),draftId:'synthetic',ownerId:'u',projectId:'p'} as never);
 assert.equal(cert(drainRuntime),null);now=2000;assert.ok(cert(drainRuntime));drainRuntime.open();
});

test('same-process control issues a certificate only after confirmed quiescence',async()=>{
 drainRuntime.activateNormalCoverage();drainRuntime.close();
 const token='synthetic-control-token-for-coverage-123456';
 const server=createDrainControl(token,async()=>database,'synthetic-container');
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const response=await fetch('http://127.0.0.1:'+(server.address() as {port:number}).port+'/maintenance/status',{headers:{authorization:'Bearer '+token}});
  const body=await response.json();assert.equal(body.status,'READY');assert.ok(body.certificate);assert.equal(drainRuntime.accepts(body.certificate,'synthetic-container'),true);
  const verify=async(certificate:unknown)=>fetch('http://127.0.0.1:'+(server.address() as {port:number}).port+'/maintenance/verify',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(certificate)});
  const accepted=await verify(body.certificate);assert.equal(accepted.status,200);assert.equal((await accepted.json()).replacementAllowed,false);
  assert.equal((await verify({...body.certificate,expiresAt:new Date(Date.now()+60000).toISOString()})).status,409);
  drainRuntime.open();assert.equal((await verify(body.certificate)).status,409);
 }finally{drainRuntime.open();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
});

test('actual media stream preserves bytes and blocks drain until descriptor closes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'drain-stream-'));
 try{
  await writeFile(join(dir,'synthetic.bin'),'synthetic-media');
  drainRuntime.activateNormalCoverage();drainRuntime.close();
  const stream=trackedReadStream(join(dir,'synthetic.bin'));
  assert.equal(cert(drainRuntime),null);
  const chunks:Buffer[]=[];stream.on('data',chunk=>chunks.push(Buffer.from(chunk)));
  await once(stream,'close');
  assert.equal(Buffer.concat(chunks).toString(),'synthetic-media');assert.ok(cert(drainRuntime));
 }finally{drainRuntime.open();await rm(dir,{recursive:true,force:true});}
});

test('route installed after instrumentation is unknown and cannot certify',()=>{
 const router=express.Router();router.get('/known',(_req,res)=>res.end());instrumentRouter(router);
 drainRuntime.activateNormalCoverage();drainRuntime.close();assert.ok(cert(drainRuntime));
 router.get('/unknown',(_req,res)=>res.end());assert.equal(cert(drainRuntime),null);
 drainRuntime.open();
});
