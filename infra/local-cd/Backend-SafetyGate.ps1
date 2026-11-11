# Check-only coordination. No stop/create/recreate/replace callback exists here.
. "$PSScriptRoot/Common.ps1"
function Assert-BackendGateJournal($Journal) {
    if ($Journal.schema -ne 'S396_BACKEND_GATE_V1' -or $Journal.state -ne 'SECOND_VERIFIED' -or
        $Journal.operationId -notmatch '^[a-f0-9]{32}$' -or
        ($Journal.events -join ',') -ne 'PREPARED,FIRST_VERIFIED,SECOND_VERIFIED' -or
        -not $Journal.containerId -or -not $Journal.imageId -or -not $Journal.certificateHash -or -not $Journal.manifestHash) {
        throw 'INCOMPLETE_GATE_JOURNAL'
    }
}
function Invoke-BackendGateChecks {
    param($Journal,[scriptblock]$Verify,[scriptblock]$Persist)
    # Verify is invoked twice, but even the second result is not a fencing token.
    & $Persist $Journal
    & $Verify | Out-Null
    $Journal.state='FIRST_VERIFIED'; $Journal.events+= 'FIRST_VERIFIED'; & $Persist $Journal
    & $Verify | Out-Null
    $Journal.state='SECOND_VERIFIED'; $Journal.events+= 'SECOND_VERIFIED'; & $Persist $Journal
    Assert-BackendGateJournal $Journal
    $Journal.state='BLOCKED_NO_FENCE'; $Journal.events+= 'BLOCKED_NO_FENCE'; & $Persist $Journal
    return [pscustomobject]@{status='BLOCKED';verification='VERIFIED';replacementAllowed=$false;reason='NO_ATOMIC_PROCESS_DOCKER_FENCE';operationId=$Journal.operationId}
}
