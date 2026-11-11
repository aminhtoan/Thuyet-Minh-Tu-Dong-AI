import { createServer, type Server } from 'node:http';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { drainRuntime } from './runtime.js';
import type {SyntheticRuntimeAuthority,Signed,HostAttestation} from './authorization.js';
export type DatabaseObservation = { connected: boolean; activeJobs: number; unresolvedAttempts: number };
export function createDrainControl(token: string, database: () => Promise<DatabaseObservation>, identity?: string, attestedContainerIdentity?:string,authority?:SyntheticRuntimeAuthority): Server {
  if (Buffer.byteLength(token) < 32) throw Error('MAINTENANCE_TOKEN_TOO_SHORT');
  let busy = false;
  let windowStart = Date.now(), requests = 0;
  return createServer(async (req, res) => {
    res.setHeader('content-type','application/json'); res.setHeader('cache-control','no-store');
    const reply = (status: number, body: unknown) => { res.writeHead(status); res.end(JSON.stringify(body)); };
    const supplied = Buffer.from(req.headers.authorization ?? ''); const expected = Buffer.from('Bearer ' + token);
    if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { reply(401,{code:'CONTROL_UNAUTHORIZED'}); return; }
    if (Date.now() - windowStart > 10000) { windowStart=Date.now(); requests=0; }
    if (++requests > 20) { reply(429,{code:'CONTROL_RATE_LIMIT'}); return; }
    if (busy) { reply(429,{code:'CONTROL_BUSY'}); return; }
    if(req.method==='POST'&&req.url==='/maintenance/authorize-shutdown'){
      const container=attestedContainerIdentity??(authority?drainRuntime.verifiedContainer(authority.profileDigest):undefined);
      if(!identity||!container){reply(409,{status:'BLOCKED',code:'CONTAINER_IDENTITY_UNATTESTED'});return;}
      busy=true;
      try{let body='';for await(const chunk of req){body+=String(chunk);if(Buffer.byteLength(body)>4096)throw Error();}
        const valid=drainRuntime.authorizeShutdown(JSON.parse(body),identity,container);
        reply(valid?200:409,{status:valid?'AUTHORIZED':'BLOCKED',shutdownSafe:false});
      }catch{reply(400,{status:'BLOCKED',code:'SHUTDOWN_AUTHORIZATION_INVALID'});}finally{busy=false;}return;
    }
    if (req.method === 'POST' && req.url === '/maintenance/close') { reply(200,drainRuntime.close()); return; }
    if (req.method === 'POST' && req.url === '/maintenance/open') { if(drainRuntime.snapshot().state==='FENCED'){reply(409,{status:'BLOCKED',code:'TERMINAL_FENCE'});return;}drainRuntime.open(); reply(200,{admissionClosed:false,bootId:drainRuntime.bootId}); return; }
    if(req.method==='POST'&&req.url==='/maintenance/fence'){
      if(authority&&identity){
        busy=true;
        try{
          let body='';for await(const chunk of req){body+=String(chunk);if(Buffer.byteLength(body)>16384)throw Error();}
          const envelope=JSON.parse(body) as Signed<HostAttestation>;
          const before=drainRuntime.snapshot();let timer:ReturnType<typeof setTimeout>|undefined;
          let db:DatabaseObservation;
          try{db=await Promise.race([database(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('TIMEOUT')),3000);})]);}finally{if(timer)clearTimeout(timer);}
          const grant=authority.authorize(envelope,drainRuntime.snapshot(),identity);
          if(grant&&drainRuntime.snapshot().state==='MAINTENANCE')drainRuntime.startDraining();
          const fence=grant?drainRuntime.establishFence(db,identity,envelope.payload.containerId,before.activityRevision,grant):null;
          reply(fence?200:409,fence?{status:'FENCED',replacementAllowed:false,fence}:{status:'BLOCKED',code:'RUNTIME_AUTHORIZATION_REJECTED'});
        }catch{reply(409,{status:'BLOCKED',code:'RUNTIME_AUTHORIZATION_REJECTED'});}finally{busy=false;}
        return;
      }
      // No endpoint/caller can assert complete registration coverage. Docker identity
      // attestation and all-entry-point fencing remain unproven in this profile.
      if(drainRuntime.admissionClosed&&drainRuntime.snapshot().state!=='FENCED')drainRuntime.startDraining();
      reply(409,{status:'BLOCKED',replacementAllowed:false,state:drainRuntime.snapshot().state,code:'FENCING_COVERAGE_UNPROVEN'});return;
    }
    if(req.method==='POST'&&req.url==='/maintenance/verify-fence'){
      busy=true;
      try{let text='';for await(const chunk of req){text+=String(chunk);if(Buffer.byteLength(text)>4096)throw Error();}const fence=JSON.parse(text) as ReturnType<typeof drainRuntime.establishFence>;
        const container=authority?drainRuntime.verifiedContainer(authority.profileDigest):undefined;
        const valid=!!identity&&!!container&&drainRuntime.validateFence(fence,identity,container);
        reply(valid?200:409,{status:valid?'VERIFIED':'BLOCKED',replacementAllowed:false,bootId:drainRuntime.bootId,profileDigest:valid?authority?.profileDigest:null});
      }catch{reply(409,{status:'BLOCKED'});}finally{busy=false;}return;
    }
    const verify=req.method==='POST'&&req.url==='/maintenance/verify';
    if (!verify && (req.method !== 'GET' || req.url !== '/maintenance/status')) { reply(404,{code:'NOT_FOUND'}); return; }
    busy = true;
    try {
      let submitted: ReturnType<typeof drainRuntime.certificate> = null;
      if(verify){
        try{let text='';for await(const chunk of req){text+=String(chunk);if(Buffer.byteLength(text)>4096)throw Error();}submitted=JSON.parse(text);}
        catch{reply(400,{status:'BLOCKED',code:'CERTIFICATE_BODY_INVALID'});return;}
      }
      const before=drainRuntime.snapshot();
      let db: DatabaseObservation | null = null;
      let timer: ReturnType<typeof setTimeout>|undefined;
      try { db = await Promise.race([database(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('TIMEOUT')),3000);timer.unref();})]); } catch { /* fail closed */ }
      finally {if(timer)clearTimeout(timer);}
      const state = drainRuntime.snapshot();
      const dbKnown = !!db && db.connected && Number.isSafeInteger(db.activeJobs) && db.activeJobs >= 0 && Number.isSafeInteger(db.unresolvedAttempts) && db.unresolvedAttempts >= 0;
      const coverageComplete = state.coverageComplete;
      if(verify){
        const valid=dbKnown&&db?.activeJobs===0&&db?.unresolvedAttempts===0&&before.activityRevision===state.activityRevision&&!!identity&&drainRuntime.accepts(submitted,identity);
        reply(valid?200:409,{status:valid?'VERIFIED':'BLOCKED',replacementAllowed:false,bootId:state.bootId,drainOperationId:state.drainOperationId,activityRevision:state.activityRevision,deploymentIdentity:identity??null});return;
      }
      const certificate=drainRuntime.certificate(dbKnown?db:null,identity,before.activityRevision);
      reply(200,{...state, database: dbKnown ? db : {connected:false,state:'UNKNOWN'}, coverageComplete,
        deploymentIdentity: identity ?? null, status:certificate?'READY':'BLOCKED',
        reasons: [...(!state.admissionClosed?['ADMISSION_OPEN']:[]),...(!dbKnown?['DATABASE_UNKNOWN']:[]),
          ...(!state.observerKnown?['RAM_UNKNOWN']:[]),
          ...(state.activeBusinessRequests || state.activeOperations || state.pendingStoreOperations ? ['OPERATIONS_ACTIVE'] : []),
          ...(state.unrecoverableLiveDrafts ? ['LIVE_RAM_DRAFTS'] : []),
          ...(db?.activeJobs ? ['JOBS_ACTIVE'] : []), ...(db?.unresolvedAttempts ? ['ATTEMPTS_UNRESOLVED'] : []),
          ...(!coverageComplete?['COVERAGE_INCOMPLETE']:[]),...(!identity?['DEPLOYMENT_IDENTITY_UNKNOWN']:[]),
          ...(before.activityRevision!==state.activityRevision?['ACTIVITY_CHANGED_DURING_OBSERVATION']:[])],
        certificate, observationId:randomUUID(), observedAt:new Date().toISOString()});
    } finally { busy=false; }
  });
}
