// Host-side, check-only consumer. Docker daemon metadata is independent of Backend JSON.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
export function docker(args,input){
 const r=spawnSync('docker',args,{input,encoding:'utf8',timeout:15000,windowsHide:true});
 if(r.error||r.status!==0)throw Error('DOCKER_METADATA_OR_CONTROL_UNAVAILABLE');return r.stdout.trim();
}
export function inspect(id){const c=JSON.parse(docker(['inspect',id]))[0];return {id:c.Id,imageId:c.Image,project:c.Config.Labels['com.docker.compose.project'],service:c.Config.Labels['com.docker.compose.service'],startedAt:c.State.StartedAt,running:c.State.Running,hostname:c.Config.Hostname};}
export function compareLive(expected,before,after,live){
 for(const c of [before,after])for(const key of ['id','imageId','project','service','startedAt'])if(c[key]!==expected[key])throw Error('DOCKER_IDENTITY_MISMATCH');
 if(!before.running||!after.running||before.hostname!==after.hostname||live.deploymentIdentity!==before.hostname||!live.bootId||live.bootId!==expected.bootId||!Number.isSafeInteger(live.fenceGeneration)||live.fenceGeneration<0||(expected.fenceGeneration!==undefined&&live.fenceGeneration!==expected.fenceGeneration))throw Error('LIVE_IDENTITY_MISMATCH');
 return {status:'LIVE_IDENTITY_MATCHED_CHECK_ONLY',replacementAllowed:false,bootId:live.bootId,fenceGeneration:live.fenceGeneration,state:live.state};
}
export function observe(expected){
 if(!/^[a-f0-9]{64}$/.test(expected.id)||!/^sha256:[a-f0-9]{64}$/.test(expected.imageId)||expected.project!=='narration-s396-c8'||expected.service!=='backend')throw Error('WRONG_SYNTHETIC_SCOPE');
 const context=docker(['context','inspect','--format','{{.Endpoints.docker.Host}}']);if(!context.startsWith('npipe:'))throw Error('LOCAL_DOCKER_REQUIRED');
 const before=inspect(expected.id);
 for(const key of ['id','imageId','project','service','startedAt'])if(before[key]!==expected[key])throw Error('DOCKER_IDENTITY_MISMATCH');
 const program="(async()=>{const r=await fetch('http://127.0.0.1:9091/maintenance/status',{headers:{authorization:'Bearer '+process.env.MAINTENANCE_CONTROL_TOKEN},signal:AbortSignal.timeout(5000)});if(r.status!==200)throw Error('CONTROL_UNAVAILABLE');const b=await r.json();console.log(JSON.stringify({bootId:b.bootId,deploymentIdentity:b.deploymentIdentity,fenceGeneration:b.fenceGeneration,state:b.state,admissionClosed:b.admissionClosed}));})().catch(()=>{process.exitCode=1});";
 const live=JSON.parse(docker(['exec','-i',expected.id,'node','--input-type=commonjs'],program));
 const after=inspect(expected.id);
 // First enrollment observes boot ID but does NOT create production authorization.
 const enrolled={...expected,bootId:expected.bootId??live.bootId,fenceGeneration:expected.fenceGeneration??live.fenceGeneration};
 return {expected:enrolled,before,after,live,verification:compareLive(enrolled,before,after,live)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=observe(JSON.parse(readFileSync(process.argv[2],'utf8')));writeFileSync(process.argv[3],JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.verification));}
 catch(e){console.error(e.message);process.exitCode=1;}
}
