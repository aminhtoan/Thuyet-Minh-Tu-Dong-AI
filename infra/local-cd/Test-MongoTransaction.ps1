[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ReleaseId)
. "$PSScriptRoot/Acceptance-Helpers.ps1"
$release = Read-Release $ReleaseId
$mongoId = Assert-S396ExistingMongo $release
$program = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'transaction-test.js'))
$result = Invoke-DockerInput @('exec','-i',$mongoId,'mongosh','--quiet','--file','/dev/stdin') $program
if ($result -notmatch 'TRANSACTION_COMMIT_PASS' -or $result -notmatch 'TRANSACTION_ABORT_PASS') { throw 'TRANSACTION_RESULT_MISSING' }
Write-Output $result
