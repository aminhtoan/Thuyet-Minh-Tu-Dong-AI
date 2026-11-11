// Evidence from a trusted local Docker controller is required, not environment/body claims.
// Validation is check-only: no container mutation or shutdown authorization.
export function verifyIdentityEvidence(expected,before,after,live){
 const fail=reason=>({status:'BLOCKED',replacementAllowed:false,reason});
 if(!/^[a-f0-9]{64}$/.test(expected.containerId)||!/^sha256:[a-f0-9]{64}$/.test(expected.imageId)||!expected.project||!expected.startedAt||!expected.challenge||!expected.bootId||!Number.isSafeInteger(expected.generation))return fail('EXPECTED_IDENTITY_INCOMPLETE');
 for(const observed of [before,after]){
  if(observed.id!==expected.containerId||observed.imageId!==expected.imageId||observed.project!==expected.project||observed.startedAt!==expected.startedAt||observed.running!==true)return fail('DOCKER_IDENTITY_MISMATCH');
 }
 if(!live||live.challenge!==expected.challenge||live.bootId!==expected.bootId||live.fenceGeneration!==expected.generation||live.deploymentIdentity!==before.hostname||live.state!=='FENCED'||live.admissionClosed!==true)return fail('LIVE_PROCESS_IDENTITY_MISMATCH');
 return {status:'IDENTITY_MATCHED_CHECK_ONLY',replacementAllowed:false};
}
