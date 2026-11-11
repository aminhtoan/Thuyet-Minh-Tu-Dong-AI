$ErrorActionPreference='Stop'
. "$PSScriptRoot/Backend-SafetyGate.ps1"
function New-TestJournal {return [ordered]@{schema='S396_BACKEND_GATE_V1';operationId=('a'*32);state='PREPARED';events=@('PREPARED');containerId='synthetic';imageId='synthetic';certificateHash='synthetic';manifestHash='synthetic'}}
$script:passed=0
function Assert-Test($Name,[scriptblock]$Run){& $Run; $script:passed++;Write-Output "PASS $Name"}
Assert-Test 'valid verification never grants replacement without fence' {
 $j=New-TestJournal;$r=Invoke-BackendGateChecks $j {} {param($j)}
 if($r.replacementAllowed -or $r.status -ne 'BLOCKED' -or $j.state -ne 'BLOCKED_NO_FENCE'){throw 'UNSAFE_GATE'}
}
foreach($reason in @('EXPIRED','REVISION_CHANGED','RESTART','IDENTITY_MISMATCH','CONTROL_UNAVAILABLE','DELAY_BEYOND_TTL','ADMISSION_OPEN')) {
 Assert-Test $reason {
  $script:n=0;$caught=$false
  try{Invoke-BackendGateChecks (New-TestJournal) {$script:n++;if($script:n -eq 2){throw $reason}} {param($j)}|Out-Null}catch{$caught=$true}
  if(-not $caught){throw 'NOT_BLOCKED'}
 }
}
Assert-Test 'concurrent deployment uses same exclusive lock as upgrade and rollback' {
 $l=Enter-LocalLock
 try{$caught=$false;try{$second=Enter-LocalLock;$second.Dispose()}catch{$caught=$true};if(-not $caught){throw 'LOCK_NOT_EXCLUSIVE'}}finally{$l.Dispose()}
}
Assert-Test 'incomplete journal rejected' {
 $j=New-TestJournal;$caught=$false;try{Assert-BackendGateJournal $j}catch{$caught=$true};if(-not $caught){throw 'JOURNAL_ACCEPTED'}
}
Assert-Test 'journal write failure aborts verification' {
 $caught=$false;try{Invoke-BackendGateChecks (New-TestJournal) {throw 'MUST_NOT_VERIFY'} {param($j)throw 'WRITE_FAILED'}|Out-Null}catch{$caught=$_.Exception.Message -eq 'WRITE_FAILED'};if(-not $caught){throw 'WRITE_NOT_FAIL_CLOSED'}
}
Assert-Test 'race after second verification cannot invoke replacement' {
 $script:revision=0;$j=New-TestJournal
 $r=Invoke-BackendGateChecks $j {} {param($j)if($j.state -eq 'SECOND_VERIFIED'){$script:revision++}}
 if($script:revision -ne 1 -or $r.replacementAllowed){throw 'RACE_UNSAFE'}
}
Write-Output "TOTAL $script:passed PASS (coordination unit tests; injected failures are not Docker observations)"
