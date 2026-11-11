import test from 'node:test';
import assert from 'node:assert/strict';
import {drainRuntime,DrainRuntime} from '../src/maintenance/runtime.js';
test('actual QR redirect holds operation through direct VisitQR write and response',async(t)=>{
 const {Visitor}=await import('../src/models/Visitor.js');
 const {VisitQR}=await import('../src/models/VisitQR.js');
 const {redirectVisitQR}=await import('../src/controllers/analytics.controller.js');
 const before=drainRuntime.snapshot().activeOperations;
 let release!:(value:unknown)=>void,entered!:()=>void;
 const pending=new Promise<void>(r=>{entered=r;});let redirected=false;
 t.mock.method(Visitor,'findOneAndUpdate',async()=>null);
 t.mock.method(VisitQR,'create',()=>{assert.ok(drainRuntime.snapshot().activeOperations>before);entered();return new Promise(resolve=>{release=resolve;});});
 const work=redirectVisitQR({query:{target:'http://example.test/result'},headers:{},ip:'127.0.0.1'} as never,{redirect:(status:number,target:string)=>{assert.equal(status,302);assert.equal(target,'http://example.test/result');redirected=true;}} as never,()=>{});
 try{await pending;assert.ok(drainRuntime.snapshot().activeOperations>before);assert.equal(redirected,false);release({});await work;assert.equal(redirected,true);assert.equal(drainRuntime.snapshot().activeOperations,before);}
 finally{release?.({});await work;}
});
test('Mongoose disconnect failure cannot become shutdown SAFE',async(t)=>{
 const {default:mongoose}=await import('mongoose');
 const r=new DrainRuntime('SYNTHETIC_CLOSED_WORLD');r.activateNormalCoverage();r.close();r.startDraining();
 const token=r.establishFence({connected:true,activeJobs:0,unresolvedAttempts:0},'d','c',r.snapshot().activityRevision)!;
 assert.ok(r.authorizeShutdown(token,'d','c'));
 t.mock.method(mongoose,'disconnect',async()=>{throw Object.assign(Error('synthetic-driver-failure'),{name:'MongoNetworkError'});});
 await assert.rejects(r.shutdownFenced(()=>mongoose.disconnect()));
 assert.equal(r.snapshot().shutdownState,'FAILED');assert.ok(r.admissionClosed);
});
