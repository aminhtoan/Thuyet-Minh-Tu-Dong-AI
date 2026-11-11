[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ReleaseId)
. "$PSScriptRoot/Common.ps1"
$lock = Enter-LocalLock
try {
    Assert-LocalDocker
    $release = Read-Release $ReleaseId
    Invoke-LocalCompose $release @('config','--quiet') | Out-Null
    Assert-QuiescentOrFresh $release
    $existing = @(Invoke-Docker -DockerArgs @('ps','-aq','--filter','label=com.docker.compose.project=narration-s396-local'))
    if ($existing.Count) { throw 'COLD_DEPLOY_ONLY: existing project resources require review.' }
    foreach ($port in @(5180,5181)) {
        if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) { throw "PORT_IN_USE: $port" }
    }
    $volumes = @(Invoke-Docker -DockerArgs @('volume','ls','--format','{{.Name}}'))
    if ('narration-s396-database' -in $volumes -or 'narration-s396-media' -in $volumes) { throw 'EXISTING_VOLUME_REQUIRES_REVIEW: never silently reuse data.' }
    foreach ($name in @('narration-s396-database','narration-s396-media')) {
        Invoke-Docker -DockerArgs @('volume','create','--label','localcd.scope=S396',$name) | Out-Null
    }
    Invoke-LocalCompose $release @('up','-d','--no-build','--pull','never','--wait','--wait-timeout','180')
    & "$PSScriptRoot/Test-Smoke.ps1" -ReleaseId $ReleaseId
    if (-not $?) { throw 'SMOKE_FAILED' }
    Write-Output 'LOCAL DEPLOY PASSED. No auto rollback/cleanup; preserve volumes and evidence on failure.'
} finally { $lock.Dispose() }
