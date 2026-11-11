import {createHash,createPublicKey,verify} from 'node:crypto';
export type Signed<T>={payload:T;signature:string};
export type BuildIdentity={buildId:string;sourceDigest:string;graphDigest:string;artifactDigest:string;expectedPaths:string[]};
export type ReviewedApproval=BuildIdentity&{scope:'S396_SYNTHETIC_HTTP_V1';project:'narration-s396-c10';service:'backend';imageId:string;reviewer:string;expiresAt:number;paths:{key:string;classification:string;registration:string;completion:string;test:string}[]};
export type HostAttestation={profileDigest:string;operationId:string;nonce:string;issuedAt:number;expiresAt:number;containerId:string;imageId:string;project:string;service:string;bootId:string;deploymentIdentity:string;drainOperationId:string;activityRevision:number;fenceGeneration:number};
type State={bootId:string;drainOperationId:string|null;activityRevision:number;fenceGeneration:number;admissionClosed:boolean};
export const canonical=(value:unknown):string=>{
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 return '{'+Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}';
};
export const digest=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
const grants=new WeakMap<object,HostAttestation>();
export type FenceGrant=object;
export function consumeGrant(grant:FenceGrant|undefined,state:State,identity:string,container:string){
 if(!grant)return null;const c=grants.get(grant);
 if(!c||c.expiresAt<=Date.now()||c.bootId!==state.bootId||c.drainOperationId!==state.drainOperationId||c.activityRevision!==state.activityRevision||c.fenceGeneration!==state.fenceGeneration+1||c.deploymentIdentity!==identity||c.containerId!==container||!state.admissionClosed)return null;
 grants.delete(grant);return {...c};
}
export class SyntheticRuntimeAuthority{
 readonly profileDigest:string;
 private readonly seen=new Set<string>();
 private readonly owners=new Map<string,string>();
 private readonly approval:ReviewedApproval;
 constructor(approval:Signed<ReviewedApproval>,private readonly attestationKey:string,approvalKey:string,build:BuildIdentity){
  // Independent reviewer and Docker-controller roles; no self-signed request key.
  if(!approvalKey.startsWith('-----BEGIN PUBLIC KEY-----')||!attestationKey.startsWith('-----BEGIN PUBLIC KEY-----'))throw Error('PUBLIC_TRUST_KEYS_REQUIRED');
  const reviewer=createPublicKey(approvalKey),controller=createPublicKey(attestationKey);
  if(reviewer.asymmetricKeyType!=='ed25519'||controller.asymmetricKeyType!=='ed25519'||reviewer.export({type:'spki',format:'der'}).equals(controller.export({type:'spki',format:'der'}))||!verify(null,Buffer.from(canonical(approval.payload)),reviewer,Buffer.from(approval.signature,'base64')))throw Error('PROFILE_SIGNATURE_INVALID');
  const p=structuredClone(approval.payload);
  if(p.scope!=='S396_SYNTHETIC_HTTP_V1'||p.project!=='narration-s396-c10'||p.service!=='backend'||!p.reviewer||!Number.isSafeInteger(p.expiresAt)||p.expiresAt<=Date.now()||!/^sha256:[a-f0-9]{64}$/.test(p.imageId))throw Error('PROFILE_APPROVAL_INVALID');
  for(const key of ['buildId','sourceDigest','graphDigest','artifactDigest'] as const)if(!build[key]||p[key]!==build[key])throw Error('PROFILE_BUILD_MISMATCH');
  for(const key of ['sourceDigest','graphDigest','artifactDigest'] as const)if(!/^[a-f0-9]{64}$/.test(build[key]))throw Error('BUILD_DIGEST_INVALID');
  const expected=new Set(build.expectedPaths);
  if(!expected.size||expected.size!==build.expectedPaths.length||p.paths.length!==expected.size||canonical([...p.expectedPaths].sort())!==canonical([...expected].sort()))throw Error('PROFILE_PATH_SET_INVALID');
  for(const path of p.paths){if(!expected.delete(path.key)||!['PROVEN','EXCLUDED_WITH_EVIDENCE'].includes(path.classification)||!path.registration||!path.completion||!path.test)throw Error('FENCING_COVERAGE_UNPROVEN');}
  this.approval=p;this.profileDigest=digest(p);
 }
 authorize(envelope:Signed<HostAttestation>,state:State,identity:string):FenceGrant|null{
  try{
   const c=structuredClone(envelope.payload),p=this.approval,now=Date.now();
   if(p.expiresAt<=now||!verify(null,Buffer.from(canonical(c)),this.attestationKey,Buffer.from(envelope.signature,'base64')))return null;
   if(c.profileDigest!==this.profileDigest||c.project!==p.project||c.service!==p.service||c.imageId!==p.imageId||!/^[a-f0-9]{64}$/.test(c.containerId)||!c.nonce||!c.operationId||!Number.isSafeInteger(c.issuedAt)||!Number.isSafeInteger(c.expiresAt)||c.issuedAt>now||c.expiresAt<=now||c.expiresAt>p.expiresAt||c.expiresAt-c.issuedAt>10000||this.seen.has(c.nonce)||this.seen.size>=1024)return null;
   if(c.bootId!==state.bootId||c.drainOperationId!==state.drainOperationId||c.activityRevision!==state.activityRevision||c.fenceGeneration!==state.fenceGeneration+1||c.deploymentIdentity!==identity||!state.admissionClosed)return null;
   const owner=this.owners.get(c.drainOperationId);if(owner&&owner!==c.operationId)return null;
   this.owners.set(c.drainOperationId,c.operationId);
   this.seen.add(c.nonce);const grant={};grants.set(grant,c);return grant;
  }catch{return null;}
 }
}
