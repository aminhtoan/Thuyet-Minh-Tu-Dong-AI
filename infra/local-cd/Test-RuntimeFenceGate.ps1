[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ContainerId,
 [Parameter(Mandatory=$true)][string]$ExpectedImageId,
 [Parameter(Mandatory=$true)][string]$ExpectedStartedAt,
 [Parameter(Mandatory=$true)][string]$ExpectedOperationId,
 [Parameter(Mandatory=$true)][string]$ExpectedProfileDigest,
 [Parameter(Mandatory=$true)][string]$TokenFile)
. "$PSScriptRoot/Acceptance-Helpers.ps1"
$lock=Enter-LocalLock
try {
 Assert-LocalDocker
 if($ContainerId -notmatch '^[a-f0-9]{64}$' -or $ExpectedImageId -notmatch '^sha256:[a-f0-9]{64}$' -or $ExpectedProfileDigest -notmatch '^[a-f0-9]{64}$'){throw 'INVALID_EXPECTED_IDENTITY'}
 $before=(Invoke-Docker -DockerArgs @('inspect',$ContainerId)|ConvertFrom-Json)[0]
 if($before.Id -ne $ContainerId -or $before.Image -ne $ExpectedImageId -or $before.State.StartedAt -ne $ExpectedStartedAt -or -not $before.State.Running -or $before.Config.Labels.'com.docker.compose.project' -ne 'narration-s396-c10' -or $before.Config.Labels.'com.docker.compose.service' -ne 'backend'){throw 'WRONG_SYNTHETIC_IDENTITY'}
 $text=Get-Content -LiteralPath $TokenFile -Raw -Encoding UTF8
 $token=$text|ConvertFrom-Json
 if($token.containerIdentity -ne $ContainerId -or $token.imageId -ne $ExpectedImageId -or $token.deploymentOperationId -ne $ExpectedOperationId -or $token.profileDigest -ne $ExpectedProfileDigest -or $token.project -ne 'narration-s396-c10' -or $token.service -ne 'backend' -or $token.fenceGeneration -lt 1 -or $token.expiration -le [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()){throw 'FENCE_OWNER_OR_PROFILE_MISMATCH'}
 $encoded=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($text))
 $program=@"
(async()=>{const fence=JSON.parse(Buffer.from('$encoded','base64'));const r=await fetch('http://127.0.0.1:9091/maintenance/verify-fence',{method:'POST',headers:{authorization:'Bearer '+process.env.MAINTENANCE_CONTROL_TOKEN,'content-type':'application/json'},body:JSON.stringify(fence),signal:AbortSignal.timeout(5000)});const b=await r.json();if(r.status!==200||b.status!=='VERIFIED'||b.bootId!==fence.processBootId||b.profileDigest!==fence.profileDigest)throw Error('LIVE_FENCE_REJECTED');console.log('VERIFIED_CHECK_ONLY');})().catch(()=>{console.error('FENCE_VERIFICATION_FAILED');process.exitCode=1});
"@
 Invoke-DockerInput @('exec','-i',$ContainerId,'node','--input-type=commonjs') $program|Out-Null
 $after=(Invoke-Docker -DockerArgs @('inspect',$ContainerId)|ConvertFrom-Json)[0]
 if($after.Id -ne $before.Id -or $after.Image -ne $before.Image -or $after.State.StartedAt -ne $before.State.StartedAt){throw 'IDENTITY_CHANGED_DURING_VERIFICATION'}
 Write-Output 'VERIFIED_CHECK_ONLY: replacementAllowed=false; no shutdown or replacement action'
} finally {$lock.Dispose()}
