. "$PSScriptRoot/Frontend-Operations.ps1"
function Expect-Block([scriptblock]$Action,[string]$Pattern) {
    $blocked = $false
    try { & $Action } catch { if ($_.Exception.Message -notmatch $Pattern) { throw }; $blocked=$true }
    if (-not $blocked) { throw 'GUARD_DID_NOT_BLOCK' }
}
Assert-NoActiveFrontendJobs '{"activeJobs":0,"businessRows":0}'
Expect-Block { Assert-NoActiveFrontendJobs '{"activeJobs":1,"businessRows":0}' } 'ACTIVE_JOBS'
Expect-Block { Assert-NoActiveFrontendJobs '{"activeJobs":0,"businessRows":1}' } 'SYNTHETIC_EMPTY'
Expect-Block { Assert-NoActiveFrontendJobs '{}' } 'activeJobs|UNKNOWN'
Expect-Block { Assert-NoActiveFrontendJobs 'not-json' } 'JSON|Invalid|Unexpected'
Expect-Block { & "$PSScriptRoot/Upgrade-Local.ps1" -ReleaseId synthetic -Service backend } 'BACKEND_UPGRADE_BLOCKED'
Expect-Block { & "$PSScriptRoot/Rollback-Local.ps1" -ReleaseId synthetic -Service backend } 'BACKEND_ROLLBACK_BLOCKED'
foreach ($state in @('PREPARED','OLD_STOPPED','OLD_RETAINED','CANDIDATE_CREATED','FAILED','RECOVERY_BLOCKED')) {
    Expect-Block { Assert-CompletedFrontendJournal @{state=$state} } 'UNFINISHED_DEPLOYMENT'
}
Assert-CompletedFrontendJournal @{state='PROMOTED'}
Assert-CompletedFrontendJournal @{state='ROLLED_BACK'}
Write-Output 'GUARDS PASS: active job, unknown/malformed state, business data and Backend upgrade/rollback all fail closed; no Docker/database mutation.'
