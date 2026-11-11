[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ReleaseId,
      [Parameter(Mandatory=$true)][ValidateSet('customer-web','admin-web','backend')][string]$Service,
      [string]$CandidateManifest)
. "$PSScriptRoot/Frontend-Operations.ps1"
if ($Service -eq 'backend') { throw 'BACKEND_UPGRADE_BLOCKED: process drain/RAM drafts cannot be proved. No bypass.' }
$lock = Enter-LocalLock
$journal = $null
try {
    Assert-LocalDocker
    $release = Read-Release $ReleaseId
    if (-not $release.Manifest.knownGood) { throw 'BASE_RELEASE_NOT_SMOKE_VERIFIED' }
    $candidate = Get-Content -LiteralPath $CandidateManifest -Raw | ConvertFrom-Json
    if ($candidate.service -ne $Service) { throw 'SERVICE_MISMATCH' }
    $current = Get-S396Running $Service
    Assert-FrontendPlan $current $candidate $release
    Test-FrontendEndpoint $Service
    $before = Get-FrontendSafety $release
    # An unfinished journal must be investigated, not blindly replayed.
    $dir = Join-Path $script:StateRoot 'journals'
    if (Test-Path $dir) { foreach ($file in Get-ChildItem $dir -Filter '*.json') {
        $prior = Get-Content $file.FullName -Raw | ConvertFrom-Json
        Assert-CompletedFrontendJournal $prior
    } }
    $op = [Guid]::NewGuid().ToString('N')
    $journal = [ordered]@{schema='S396_FRONTEND_JOURNAL_V1';operationId=$op;service=$Service;releaseId=$ReleaseId;state='PREPARED';events=@();updatedUtc='';before=$before;originalName=$current.Name.TrimStart('/');oldContainerId=$current.Id;oldImageId=$current.Image;retainedName=($current.Name.TrimStart('/')+'-retained-'+$op);candidateImageId=$candidate.imageId;candidateContainerId='';candidateManifestHash=(Get-FileHash -LiteralPath $CandidateManifest -Algorithm SHA256).Hash;failure=''}
    Add-FrontendEvent $journal 'PREPARED'
    Invoke-Docker -DockerArgs @('stop',$current.Id) | Out-Null
    Add-FrontendEvent $journal 'OLD_STOPPED'
    Invoke-Docker -DockerArgs @('rename',$current.Id,$journal.retainedName) | Out-Null
    Add-FrontendEvent $journal 'OLD_RETAINED'
    $port = if ($Service -eq 'customer-web') { '5180' } else { '5181' }
    $id = Invoke-Docker -DockerArgs @('create','--name',$journal.originalName,'--network','narration-s396-isolated','--network-alias',$Service,'--publish',('127.0.0.1:'+ $port + ':8080'),'--read-only','--tmpfs','/tmp','--tmpfs','/var/cache/nginx','--tmpfs','/var/run','--label','com.docker.compose.project=narration-s396-local','--label',"com.docker.compose.service=$Service",'--label',"localcd.operation=$op",$candidate.imageId)
    $journal.candidateContainerId = [string]$id
    Add-FrontendEvent $journal 'CANDIDATE_CREATED'
    Invoke-Docker -DockerArgs @('network','connect','narration-s396-frontend',$id) | Out-Null
    Invoke-Docker -DockerArgs @('start',$id) | Out-Null
    Add-FrontendEvent $journal 'CANDIDATE_VERIFYING'
    Test-FrontendEndpoint $Service
    Assert-SafetyUnchanged $before (Get-FrontendSafety $release)
    Add-FrontendEvent $journal 'PROMOTED'
    Write-Output "PROMOTED operation=$op image=$($candidate.imageId)"
} catch {
    if ($journal) {
        $journal.failure = $_.Exception.Message
        Add-FrontendEvent $journal 'FAILED'
        if ($journal.candidateContainerId) {
            try { Restore-Frontend $journal $release; Write-Output "EXPECTED_CANDIDATE_FAILURE_ROLLED_BACK operation=$($journal.operationId)" }
            catch { Add-FrontendEvent $journal 'RECOVERY_BLOCKED'; throw }
        }
        # No cleanup if failure occurred before a candidate ID was journaled.
    }
    throw
} finally { $lock.Dispose() }
