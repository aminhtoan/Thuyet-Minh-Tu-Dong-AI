[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ContainerId,
      [Parameter(Mandatory=$true)][string]$ExpectedImageId,
      [Parameter(Mandatory=$true)][string]$ExpectedStartedAt,
      [Parameter(Mandatory=$true)][string]$CertificateFile,
      [switch]$RequireFence)
. "$PSScriptRoot/Acceptance-Helpers.ps1"
Assert-LocalDocker
if($ContainerId -notmatch '^[a-f0-9]{64}$' -or $ExpectedImageId -notmatch '^sha256:[a-f0-9]{64}$'){throw 'INVALID_IDENTITY'}
$before=(Invoke-Docker -DockerArgs @('inspect',$ContainerId)|ConvertFrom-Json)[0]
if($before.Id-ne $ContainerId -or $before.Image-ne $ExpectedImageId -or $before.State.StartedAt-ne $ExpectedStartedAt -or -not $before.State.Running){throw 'CONTAINER_IMAGE_OR_PROCESS_MISMATCH'}
if($before.Config.Labels.'com.docker.compose.project'-ne 'narration-s396-drain-b3'){throw 'WRONG_ACCEPTANCE_PROJECT'}
if(@($before.NetworkSettings.Networks.PSObject.Properties).Count-ne 1 -or -not $before.NetworkSettings.Networks.PSObject.Properties['narration-s396-drain-b3-isolated']){throw 'WRONG_NETWORK_SCOPE'}
$text=Get-Content -LiteralPath $CertificateFile -Raw
$certificate=$text|ConvertFrom-Json
if($certificate.deploymentIdentity-ne $before.Config.Hostname -or [DateTime]::Parse($certificate.expiresAt).ToUniversalTime()-le [DateTime]::UtcNow){throw 'CERTIFICATE_IDENTITY_OR_EXPIRY_INVALID'}
$encoded=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($text))
$program=@"
(async()=>{const certificate=JSON.parse(Buffer.from('$encoded','base64').toString());const r=await fetch('http://127.0.0.1:9091/maintenance/verify',{method:'POST',headers:{authorization:'Bearer '+process.env.MAINTENANCE_CONTROL_TOKEN,'content-type':'application/json'},body:JSON.stringify(certificate),signal:AbortSignal.timeout(5000)});const b=await r.json();if(r.status!==200||b.status!=='VERIFIED'||b.bootId!==certificate.processBootId||b.activityRevision!==certificate.activityRevision||b.drainOperationId!==certificate.drainOperationId||b.deploymentIdentity!==certificate.deploymentIdentity)throw Error('LIVE_CERTIFICATE_REJECTED');console.log(JSON.stringify({status:'VERIFIED',replacementAllowed:false,bootId:b.bootId,drainOperationId:b.drainOperationId,activityRevision:b.activityRevision}));})().catch(e=>{console.error(e.message);process.exit(1)});
"@
$result=Invoke-DockerInput @('exec','-i',$ContainerId,'node','--input-type=commonjs') $program
if($RequireFence){
    # The audited normal-server profile cannot attest closed-world registration.
    # Do not promote a drain certificate into a fencing authorization.
    throw 'FENCING_COVERAGE_UNPROVEN: no attested FENCED token consumer; replacement blocked'
}
$after=(Invoke-Docker -DockerArgs @('inspect',$ContainerId)|ConvertFrom-Json)[0]
if($after.Id-ne $before.Id -or $after.Image-ne $before.Image -or $after.State.StartedAt-ne $before.State.StartedAt){throw 'IDENTITY_CHANGED_DURING_VERIFICATION'}
Write-Output $result
Write-Output 'CHECK_ONLY: no replacement capability/action exists in this consumer.'
