[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ReleaseId,
      [ValidateSet('backend','customer-web','admin-web')][string]$Service='backend',
      [string]$OperationId)
. "$PSScriptRoot/Frontend-Operations.ps1"
if ($Service -eq 'backend') { throw 'BACKEND_ROLLBACK_BLOCKED: no process drain proof. No bypass.' }
$lock = Enter-LocalLock
try {
    Assert-LocalDocker
    $release = Read-Release $ReleaseId
    if ($OperationId -notmatch '^[a-f0-9]{32}$') { throw 'INVALID_OPERATION_ID' }
    $journal = Get-Content -LiteralPath (Join-Path $script:StateRoot "journals/$OperationId.json") -Raw | ConvertFrom-Json
    if ($journal.releaseId -ne $ReleaseId -or $journal.service -ne $Service -or $journal.state -ne 'PROMOTED') { throw 'ROLLBACK_JOURNAL_INVALID' }
    $current = Get-S396Running $Service
    if ($current.Id -ne $journal.candidateContainerId -or $current.Image -ne $journal.candidateImageId) { throw 'CURRENT_CANDIDATE_CHANGED' }
    Test-FrontendEndpoint $Service
    Assert-SafetyUnchanged $journal.before (Get-FrontendSafety $release)
    Restore-Frontend $journal $release
    Write-Output "ROLLED_BACK operation=$OperationId image=$($journal.oldImageId)"
} finally { $lock.Dispose() }
