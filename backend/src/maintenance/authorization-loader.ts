import {lstat,readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {SyntheticRuntimeAuthority,digest,type BuildIdentity,type ReviewedApproval,type Signed} from './authorization.js';
// Provisioned by a trusted host as root-owned read-only files. No request/env key override.
export async function loadSyntheticRuntimeAuthority():Promise<SyntheticRuntimeAuthority|undefined>{
 try{
  if(process.platform!=='linux'||process.getuid?.()===0)return undefined;
  const dir='/run/s396-fencing';
  for(const path of [dir,dir+'/trust.json',dir+'/approval.json','/app/fencing-build.json']){
   const stat=await lstat(path);if(stat.isSymbolicLink()||stat.uid!==0||(stat.mode&0o022)!==0)throw Error('UNTRUSTED_AUTHORIZATION_FILES');
  }
  const trust=JSON.parse(await readFile(dir+'/trust.json','utf8')) as {approvalKey:string;attestationKey:string};
  const approval=JSON.parse(await readFile(dir+'/approval.json','utf8')) as Signed<ReviewedApproval>;
  const build=JSON.parse(await readFile('/app/fencing-build.json','utf8')) as BuildIdentity&{artifacts:Record<string,string>};
  const artifacts:Record<string,string>={};
  async function walk(path:string,prefix=''){for(const item of await readdir(path,{withFileTypes:true})){if(item.isSymbolicLink())throw Error('UNMEASURED_ARTIFACT');if(item.isDirectory())await walk(join(path,item.name),prefix+item.name+'/');else if(item.name.endsWith('.js'))artifacts[prefix+item.name]=createHash('sha256').update(await readFile(join(path,item.name))).digest('hex');}}
  await walk('/app/dist');
  if(digest(artifacts)!==build.artifactDigest||digest(build.artifacts)!==build.artifactDigest)throw Error('BUILD_ARTIFACT_CHANGED');
  return new SyntheticRuntimeAuthority(approval,trust.attestationKey,trust.approvalKey,build);
 }catch{return undefined;} // Missing approval/build/trust is blocked, never an enable switch.
}
