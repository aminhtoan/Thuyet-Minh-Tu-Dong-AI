import test from 'node:test';
import assert from 'node:assert/strict';
import {compareLive,docker} from '../staging/live-attestation.mjs';
import {validateProfile} from '../staging/coverage-profile.mjs';
import {digestFile} from '../staging/coverage-profile.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath,URL} from 'node:url';
import {resolve} from 'node:path';
import {buildScope} from '../staging/runtime-scope.mjs';
import {traceEffects} from '../staging/call-path-proof.mjs';
test('reviewed profile rejects source, graph, new path and missing evidence',()=>{
 const profile={files:{'a.ts':'a','<graph>':'g'},graphDigest:'g',paths:[{key:'write',classification:'PROVEN',caller:'c',registration:'r',completion:'end',test:'negative'}]};
 assert.equal(validateProfile(profile,profile.files,['write']).status,'REVIEWED_SOURCE_PROFILE');
 for(const current of [{'a.ts':'changed','<graph>':'g'},{...profile.files,'new.ts':'x'},{'a.ts':'a','<graph>':'changed'}])assert.equal(validateProfile(profile,current,['write']).status,'BLOCKED');
 assert.equal(validateProfile({...profile,paths:[{key:'new',classification:'UNPROVEN'}]},profile.files,['write']).status,'BLOCKED');
 assert.equal(validateProfile({...profile,paths:[]},profile.files,['write']).status,'BLOCKED');
});
test('independent metadata rejects wrong image/container/project/service and stale process',()=>{
 const expected={id:'c',imageId:'i',project:'p',service:'backend',startedAt:'s',bootId:'b'};
 const metadata={...expected,running:true,hostname:'deployment'};
 const live={deploymentIdentity:'deployment',bootId:'b',fenceGeneration:0,state:'RUNNING'};
 assert.equal(compareLive(expected,metadata,metadata,live).replacementAllowed,false);
 for(const key of ['id','imageId','project','service','startedAt'])assert.throws(()=>compareLive(expected,{...metadata,[key]:'wrong'},metadata,live));
 assert.throws(()=>compareLive(expected,metadata,metadata,{...live,bootId:'old'}));
 assert.throws(()=>compareLive({...expected,fenceGeneration:1},metadata,metadata,{...live,fenceGeneration:2}));
});
test('missing Docker metadata fails closed without any container mutation',()=>{
 assert.throws(()=>docker(['inspect','narration-c8-deliberately-nonexistent-read-only-target']),/DOCKER_METADATA_OR_CONTROL_UNAVAILABLE/);
});
test('unsigned C8 review rejects changed runtime source after authorization integration',()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url));
 const profile=JSON.parse(readFileSync(resolve(root,'infra/local-cd/coverage-profile-c8.json'),'utf8'));
 const graph=buildScope(resolve(root,'backend/src'));
 const current={};for(const path of Object.keys(profile.files))if(path!=='<graph>')current[path]=digestFile(resolve(root,path));
 for(const row of graph.files)current['backend/src/'+row.path]=digestFile(resolve(root,'backend/src',row.path));
 current['<graph>']=digestFile(resolve(root,'infra/local-cd/backend-runtime-scope.json'));
 const paths=graph.files.flatMap(row=>traceEffects(readFileSync(resolve(root,'backend/src',row.path),'utf8'),row.path).filter(p=>p.classification==='CALLER_BOUNDARY_PROOF_REQUIRED').map(p=>row.path+':'+p.line+':'+p.call));
 assert.equal(paths.length,23);const result=validateProfile(profile,current,paths);
 assert.equal(result.status,'BLOCKED');assert.ok(result.blockers.some(reason=>reason.startsWith('SOURCE_CHANGED:')));assert.equal(result.replacementAllowed,false);assert.equal(profile.runtimeAuthorization,false);
 for(const row of profile.paths)assert.ok(readFileSync(resolve(root,row.test),'utf8').length>0);
});
