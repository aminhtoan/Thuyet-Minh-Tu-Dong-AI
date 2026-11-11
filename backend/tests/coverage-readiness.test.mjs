import test from 'node:test';
import assert from 'node:assert/strict';
import {traceEffects,requireReviewedPaths} from '../staging/call-path-proof.mjs';
import {verifyIdentityEvidence} from '../staging/identity-attestation.mjs';
test('missing/new path and write before registration stay blocked',()=>{
 for(const source of ['User.create({}); runtime.begin();','User.updateOne({},{});']){
  const paths=traceEffects(source);assert.equal(paths.length,1);
  const result=requireReviewedPaths(paths,[]);assert.equal(result.status,'BLOCKED');assert.ok(result.blockers.some(b=>b.reason==='MISSING_CALL_PATH'));
  assert.equal(paths[0].classification,'CALLER_BOUNDARY_PROOF_REQUIRED');
 }
});
test('lexical guard is evidence, but a late callback is not assumed awaited',()=>{
 assert.equal(traceEffects("runtime.track('activeOperations',async()=>{await User.create({});});")[0].classification,'LEXICAL_BOUNDARY_FOUND');
 const paths=traceEffects("runtime.track('activeOperations',async()=>{void promise.then(()=>User.create({}));});");
 assert.equal(paths[0].classification,'CALLBACK_COMPLETION_PROOF_REQUIRED');assert.equal(requireReviewedPaths(paths,[]).status,'BLOCKED');
});
function fixture(){const expected={containerId:'a'.repeat(64),imageId:'sha256:'+'b'.repeat(64),project:'synthetic',startedAt:'start',challenge:'fresh-test-challenge',bootId:'boot',generation:1};
 const docker={id:expected.containerId,imageId:expected.imageId,project:expected.project,startedAt:expected.startedAt,running:true,hostname:'deployment'};
 const live={challenge:expected.challenge,bootId:'boot',fenceGeneration:1,deploymentIdentity:'deployment',state:'FENCED',admissionClosed:true};return {expected,docker,live};}
test('matching independent Docker and live evidence is still check-only',()=>{const {expected,docker,live}=fixture();const r=verifyIdentityEvidence(expected,docker,docker,live);assert.equal(r.status,'IDENTITY_MATCHED_CHECK_ONLY');assert.equal(r.replacementAllowed,false);});
test('self claims cannot override wrong Docker container/image or restart',()=>{
 for(const key of ['id','imageId','startedAt','project']){const {expected,docker,live}=fixture();assert.equal(verifyIdentityEvidence(expected,{...docker,[key]:'spoof'},docker,live).status,'BLOCKED');}
});
test('old boot, challenge, generation, deployment or reopened admission rejected',()=>{
 for(const patch of [{bootId:'old'},{challenge:'replayed'},{fenceGeneration:2},{deploymentIdentity:'spoof'},{admissionClosed:false}]){const {expected,docker,live}=fixture();assert.equal(verifyIdentityEvidence(expected,docker,docker,{...live,...patch}).status,'BLOCKED');}
});
