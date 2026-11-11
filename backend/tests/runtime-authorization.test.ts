import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,randomUUID} from 'node:crypto';
import {SyntheticRuntimeAuthority,canonical,type Signed,type ReviewedApproval,type HostAttestation,type BuildIdentity} from '../src/maintenance/authorization.js';
import {DrainRuntime,drainRuntime} from '../src/maintenance/runtime.js';
import {createDrainControl} from '../src/maintenance/control.js';
import {once} from 'node:events';
const db={connected:true,activeJobs:0,unresolvedAttempts:0};
function setup(){
 const reviewer=generateKeyPairSync('ed25519'),controller=generateKeyPairSync('ed25519');
 const publicKey=(key:typeof reviewer)=>key.publicKey.export({type:'spki',format:'pem'}).toString();
 const signed=<T>(payload:T,key=reviewer):Signed<T>=>({payload,signature:sign(null,Buffer.from(canonical(payload)),key.privateKey).toString('base64')});
 const build:BuildIdentity={buildId:'fixture-build',sourceDigest:'1'.repeat(64),graphDigest:'2'.repeat(64),artifactDigest:'3'.repeat(64),expectedPaths:['write','cleanup']};
 const profile:ReviewedApproval={...build,scope:'S396_SYNTHETIC_HTTP_V1',project:'narration-s396-c10',service:'backend',reviewer:'offline-test-reviewer',imageId:'sha256:'+'a'.repeat(64),expiresAt:Date.now()+60000,paths:build.expectedPaths.map(key=>({key,classification:'PROVEN',registration:'pre-register',completion:'finally',test:'fixture-negative'}))};
 const create=(p=signed(profile),b=build)=>new SyntheticRuntimeAuthority(p,publicKey(controller),publicKey(reviewer),b);
 const authority=create();const r=new DrainRuntime();r.activateNormalCoverage();r.close();r.startDraining();
 const attest=(patch:Partial<HostAttestation>={})=>signed<HostAttestation>({profileDigest:authority.profileDigest,operationId:'fixture-deploy-operation',nonce:randomUUID(),issuedAt:Date.now(),expiresAt:Date.now()+5000,containerId:'b'.repeat(64),imageId:profile.imageId,project:profile.project,service:profile.service,bootId:r.bootId,deploymentIdentity:'deployment',drainOperationId:r.snapshot().drainOperationId!,activityRevision:r.snapshot().activityRevision,fenceGeneration:1,...patch},controller);
 return {r,authority,attest,profile,build,signed,create};
}
test('signed independent profile and host attestation fence UNPROVEN runtime only for exact bound build',()=>{
 const {r,authority,attest}=setup(),e=attest();const grant=authority.authorize(e,r.snapshot(),'deployment');assert.ok(grant);
 const fence=r.establishFence(db,'deployment',e.payload.containerId,r.snapshot().activityRevision,grant!);assert.ok(fence);assert.equal(fence.profileDigest,authority.profileDigest);assert.equal(fence.deploymentOperationId,'fixture-deploy-operation');assert.throws(()=>r.begin());assert.throws(()=>r.open());assert.equal(authority.authorize(e,r.snapshot(),'deployment'),null);
});
test('profile tamper, wrong build, missing path, duplicate and UNKNOWN require new trusted approval',()=>{
 const s=setup();const envelope=s.signed(s.profile);envelope.payload={...s.profile,reviewer:'tampered'};assert.throws(()=>s.create(envelope));
 for(const key of ['buildId','sourceDigest','graphDigest','artifactDigest'] as const)assert.throws(()=>s.create(s.signed(s.profile),{...s.build,[key]:'wrong'}));
 assert.throws(()=>s.create(s.signed({...s.profile,expiresAt:Date.now()-1})));
 for(const paths of [s.profile.paths.slice(1),[s.profile.paths[0]!,s.profile.paths[0]!],s.profile.paths.map(p=>({...p,classification:'UNKNOWN'}))])assert.throws(()=>s.create(s.signed({...s.profile,paths})));
});
test('wrong controller identity, stale assertion, owner revision, boot or generation fails closed',()=>{
 const s=setup();for(const patch of [{containerId:'spoof'},{imageId:'sha256:'+'c'.repeat(64)},{project:'wrong'},{service:'wrong'},{profileDigest:'wrong'},{expiresAt:Date.now()-1},{issuedAt:Date.now()-20000},{bootId:'old'},{deploymentIdentity:'wrong'},{activityRevision:999},{fenceGeneration:2},{drainOperationId:'wrong'}])assert.equal(s.authority.authorize(s.attest(patch),s.r.snapshot(),'deployment'),null);
 const e=s.attest();e.payload.operationId='tampered-owner';assert.equal(s.authority.authorize(e,s.r.snapshot(),'deployment'),null);
});
test('active work/draft/unknown/database failure cannot fence; grant is not a boolean bypass',()=>{
 for(const reason of ['work','draft','unknown','database']){
  const s=setup();let done=()=>{};
  if(reason==='work')done=s.r.begin();if(reason==='draft')s.r.observe('draft',()=>({liveDrafts:1,pending:0}));if(reason==='unknown')s.r.registerEntryPoint('unknown',false);
  const e=s.attest(),grant=s.authority.authorize(e,s.r.snapshot(),'deployment');
  assert.equal(s.r.establishFence(reason==='database'?null:db,'deployment',e.payload.containerId,s.r.snapshot().activityRevision,grant??undefined),null);done();
 }
 const s=setup();assert.equal(s.r.establishFence(db,'deployment','b'.repeat(64),s.r.snapshot().activityRevision,{}),null);
});
test('race after attestation, restart and signed replay cannot create a second permission',()=>{
 const s=setup(),e=s.attest(),grant=s.authority.authorize(e,s.r.snapshot(),'deployment')!;
 const leave=s.r.begin();leave();assert.equal(s.r.establishFence(db,'deployment',e.payload.containerId,s.r.snapshot().activityRevision,grant),null);
 assert.equal(s.authority.authorize(e,s.r.snapshot(),'deployment'),null);
 assert.equal(s.authority.authorize(s.attest({operationId:'different-owner'}),s.r.snapshot(),'deployment'),null);
 const next=new DrainRuntime();next.activateNormalCoverage();next.close();next.startDraining();assert.equal(s.authority.authorize(s.attest(),next.snapshot(),'deployment'),null);
});
test('authenticated loopback control integrates reviewed profile and host signature without shutdown',async()=>{
 const s=setup();drainRuntime.activateNormalCoverage();drainRuntime.close();
 const state=drainRuntime.snapshot();
 const envelope=s.attest({bootId:state.bootId,drainOperationId:state.drainOperationId!,activityRevision:state.activityRevision});
 const secret='fixture-control-auth-not-real-123456789';
 const server=createDrainControl(secret,async()=>db,'deployment',undefined,s.authority);
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const url='http://127.0.0.1:'+(server.address() as {port:number}).port;
 const headers={authorization:'Bearer '+secret,'content-type':'application/json'};
 try{
  const response=await fetch(url+'/maintenance/fence',{method:'POST',headers,body:JSON.stringify(envelope)});
  assert.equal(response.status,200);const body=await response.json();assert.equal(body.status,'FENCED');assert.equal(body.replacementAllowed,false);
  assert.equal(body.fence.imageId,s.profile.imageId);assert.equal(body.fence.profileDigest,s.authority.profileDigest);assert.equal(drainRuntime.snapshot().fencingCoverage,'SIGNED_SYNTHETIC_HTTP_V1');
  const verified=await fetch(url+'/maintenance/verify-fence',{method:'POST',headers,body:JSON.stringify(body.fence)});
  assert.equal(verified.status,200);assert.equal((await verified.json()).profileDigest,s.authority.profileDigest);
  assert.equal((await fetch(url+'/maintenance/open',{method:'POST',headers})).status,409);
  assert.equal((await fetch(url+'/maintenance/fence',{method:'POST',headers,body:JSON.stringify(envelope)})).status,409);
  assert.throws(()=>drainRuntime.begin());
 }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
