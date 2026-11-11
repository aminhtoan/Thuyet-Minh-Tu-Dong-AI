import { randomUUID } from 'node:crypto';
import type { EventEmitter } from 'node:events';
import {consumeGrant,type FenceGrant} from './authorization.js';
export type Counter = 'activeOperations' | 'providerCalls' | 'pendingApprovals';
export class DrainRuntime {
  constructor(private readonly registrationCoverage: 'UNPROVEN' | 'SYNTHETIC_CLOSED_WORLD' = 'UNPROVEN') {}
  private phase: 'RUNNING'|'MAINTENANCE'|'DRAINING'|'FENCED' = 'RUNNING';
  private generation=0;
  private fence: {secret:string;processBootId:string;drainOperationId:string;deploymentIdentity:string;containerIdentity:string;activityRevision:number;fenceGeneration:number;expiration:number;profileDigest?:string;deploymentOperationId?:string;imageId?:string;project?:string;service?:string}|null=null;
  verifiedContainer(profileDigest:string){return this.fence?.profileDigest===profileDigest?this.fence.containerIdentity:undefined;}
  private fenceConsumed=false;
  private shutdownAuthorized=false;
  private shutdownState:'NONE'|'AUTHORIZED'|'CLEANING'|'SAFE'|'FAILED'='NONE';
  authorizeShutdown(token:unknown,identity:string,containerIdentity:string){
    if(!this.consumeFence(token,identity,containerIdentity))return false;
    this.shutdownAuthorized=true;this.shutdownState='AUTHORIZED';return true;
  }
  async shutdownFenced(cleanup:()=>Promise<void>,timeoutMs=5000){
    if(this.phase!=='FENCED'||!this.shutdownAuthorized||this.shutdownState!=='AUTHORIZED')throw Error('FENCED_SHUTDOWN_NOT_AUTHORIZED');
    if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw Error('INVALID_SHUTDOWN_TIMEOUT');
    this.shutdownState='CLEANING';
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{await Promise.race([Promise.resolve().then(cleanup),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('SHUTDOWN_CLEANUP_TIMEOUT')),timeoutMs);})]);this.shutdownState='SAFE';}
    catch(error){this.shutdownState='FAILED';throw error;}
    finally{if(timer)clearTimeout(timer);}
  }
  runSync<T>(action:()=>T):T{const leave=this.begin();try{return action();}finally{leave();}}
  private assertNotFenced(){if(this.phase==='FENCED')throw Error('PROCESS_FENCED');}
  startDraining(){this.assertNotFenced();if(!this.closed)throw Error('ADMISSION_OPEN');this.phase='DRAINING';return this.snapshot();}
  establishFence(database:{connected:boolean;activeJobs:number;unresolvedAttempts:number}|null,identity:string,containerIdentity:string,expectedRevision:number,grant?:FenceGrant){
    // No await between checking quiescence and committing terminal registration closure.
    // Production remains blocked until ALL side-effect entry points register first.
    if(this.phase!=='DRAINING'||!containerIdentity||!this.certificate(database,identity,expectedRevision))return null;
    const authorization=consumeGrant(grant,this.snapshot(),identity,containerIdentity);
    if(this.registrationCoverage!=='SYNTHETIC_CLOSED_WORLD'&&!authorization)return null;
    this.phase='FENCED';this.generation++;
    this.fenceConsumed=false;
    this.fence={secret:randomUUID()+randomUUID(),processBootId:this.bootId,drainOperationId:this.operationId!,deploymentIdentity:identity,containerIdentity,activityRevision:this.revision,fenceGeneration:this.generation,expiration:Math.min(Date.now()+10000,authorization?.expiresAt??Infinity),...(authorization?{profileDigest:authorization.profileDigest,deploymentOperationId:authorization.operationId,imageId:authorization.imageId,project:authorization.project,service:authorization.service}:{})};
    return {...this.fence};
  }
  validateFence(token:unknown,identity:string,containerIdentity:string){
    const s=this.snapshot();
    return !!this.fence&&!this.fenceConsumed&&this.phase==='FENCED'&&JSON.stringify(token)===JSON.stringify(this.fence)&&this.fence.expiration>Date.now()&&this.fence.deploymentIdentity===identity&&this.fence.containerIdentity===containerIdentity&&s.activityRevision===this.fence.activityRevision&&s.coverageComplete&&s.observerKnown&&!s.activeBusinessRequests&&!s.activeOperations&&!s.unrecoverableLiveDrafts&&!s.pendingStoreOperations;
  }
  consumeFence(token:unknown,identity:string,containerIdentity:string){if(!this.validateFence(token,identity,containerIdentity))return false;this.fenceConsumed=true;return true;}
  readonly bootId = randomUUID();
  private closed = false;
  private operationId: string | null = null;
  private requests = 0;
  private counts = { activeOperations: 0, providerCalls: 0, pendingApprovals: 0 };
  private observers = new Map<string, () => { liveDrafts: number; pending: number }>();
  private revision = 0;
  private entryPoints = new Map<string, boolean>();
  private coverageProfile: string | null = null;
  private issuedCertificateId: string | null = null;
  private issuedCertificateJson: string | null = null;
  activateNormalCoverage() { this.coverageProfile = 'NORMAL_HTTP_V1'; this.registerEntryPoint('normal-http',true); }
  registerEntryPoint(name: string, covered: boolean) { this.assertNotFenced();this.entryPoints.set(name,covered);this.revision++; }
  begin(kind: Counter = 'activeOperations') {
    this.assertNotFenced();
    this.revision++; this.counts[kind]++;
    if(kind!=='activeOperations')this.counts.activeOperations++;
    let done=false;
    return ()=>{if(done)return;done=true;this.revision++;this.counts[kind]--;if(kind!=='activeOperations')this.counts.activeOperations--;};
  }
  close() { if (!this.closed) { this.closed = true; this.phase='MAINTENANCE'; this.operationId = randomUUID();this.revision++; } return this.snapshot(); }
  open() { this.assertNotFenced();this.phase='RUNNING';this.closed = false; this.operationId = null;this.revision++; }
  get admissionClosed() { return this.closed; }
  enterRequest() { this.assertNotFenced();if(this.closed)throw Error('ADMISSION_CLOSED');this.requests++;this.revision++; let done = false; return () => { if (!done) { done = true; this.requests--;this.revision++; } }; }
  async track<T>(kind: Counter, action: () => PromiseLike<T> | T): Promise<T> {
    const leave=this.begin(kind);
    try { return await action(); }
    finally { leave(); }
  }
  observe(id: string, callback: () => { liveDrafts: number; pending: number }) { this.assertNotFenced();this.observers.set(id, callback); }
  snapshot() {
    let unrecoverableLiveDrafts = 0, pendingStoreOperations = 0, observerKnown = true;
    try { for (const observer of this.observers.values()) {
      const state = observer();
      if (!Number.isSafeInteger(state.liveDrafts) || state.liveDrafts < 0 || !Number.isSafeInteger(state.pending) || state.pending < 0) throw Error();
      unrecoverableLiveDrafts += state.liveDrafts; pendingStoreOperations += state.pending;
    } } catch { observerKnown = false; }
    return { state:this.phase,shutdownState:this.shutdownState,fenceGeneration:this.generation,fencingCoverage:this.fence?.profileDigest?'SIGNED_SYNTHETIC_HTTP_V1':this.registrationCoverage,fencingProfileDigest:this.fence?.profileDigest??null,bootId: this.bootId, drainOperationId: this.operationId, admissionClosed: this.closed,
      activityRevision:this.revision,coverageProfile:this.coverageProfile,
      coverageComplete:this.coverageProfile==='NORMAL_HTTP_V1' && [...this.entryPoints.values()].every(Boolean),
      activeBusinessRequests: this.requests, ...this.counts, unrecoverableLiveDrafts, pendingStoreOperations, observerKnown };
  }
  certificate(database: {connected:boolean;activeJobs:number;unresolvedAttempts:number}|null, identity: string|undefined, expectedRevision: number) {
    const state=this.snapshot();
    if(!state.coverageComplete||!state.observerKnown||!state.admissionClosed||!state.drainOperationId||state.activityRevision!==expectedRevision||
      state.activeBusinessRequests||state.activeOperations||state.providerCalls||state.pendingApprovals||state.pendingStoreOperations||state.unrecoverableLiveDrafts||
      !identity||!database?.connected||database.activeJobs!==0||database.unresolvedAttempts!==0)return null;
    const observedAt=Date.now();
    this.issuedCertificateId=randomUUID();
    const certificate={certificateId:this.issuedCertificateId,processBootId:this.bootId,drainOperationId:state.drainOperationId,deploymentIdentity:identity,
      activityRevision:state.activityRevision,coverageProfile:state.coverageProfile,coverageComplete:true,observedAt:new Date(observedAt).toISOString(),expiresAt:new Date(observedAt+10000).toISOString(),database};
    this.issuedCertificateJson=JSON.stringify(certificate);return certificate;
  }
  accepts(certificate: ReturnType<DrainRuntime['certificate']>, identity: string) {
    if(!certificate||JSON.stringify(certificate)!==this.issuedCertificateJson||certificate.certificateId!==this.issuedCertificateId||certificate.processBootId!==this.bootId||certificate.deploymentIdentity!==identity||Date.parse(certificate.expiresAt)<=Date.now())return false;
    const s=this.snapshot();return s.admissionClosed&&s.coverageComplete&&s.observerKnown&&s.drainOperationId===certificate.drainOperationId&&s.activityRevision===certificate.activityRevision&&
      !s.activeBusinessRequests&&!s.activeOperations&&!s.pendingStoreOperations&&!s.unrecoverableLiveDrafts;
  }
}
export const drainRuntime = new DrainRuntime();
export const detached = <T>(work:()=>PromiseLike<T>|T)=>drainRuntime.track('activeOperations',work);
export function createTrackedResource<T extends EventEmitter>(create:()=>T):T {
  const leave=drainRuntime.begin();
  try{const resource=create();resource.once('close',leave);return resource;}catch(error){leave();throw error;}
}
export function holdUntilClose(emitter: EventEmitter) {
  const leave=drainRuntime.begin(); emitter.once('close',leave); return leave;
}
export function trackedObject<T extends object>(object: T, kind: Counter, runtime:DrainRuntime=drainRuntime): T {
  return new Proxy(object, { get(target, key, receiver) {
    const value = Reflect.get(target, key, receiver);
    return typeof value === 'function' ? (...args: unknown[]) => runtime.track(kind, () => Reflect.apply(value, target, args)) : value;
  } });
}
