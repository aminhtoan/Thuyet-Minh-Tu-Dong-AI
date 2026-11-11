[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ReleaseId)
. "$PSScriptRoot/Acceptance-Helpers.ps1"
$lock = Enter-LocalLock
try {
    $release = Read-Release $ReleaseId
    $mongoId = Assert-S396ExistingMongo $release
    if ($release.Manifest.knownGood) { throw 'NOT_FIRST_DEPLOYMENT' }
    foreach ($service in @('backend','customer-web','admin-web')) {
        $existing = @(Invoke-Docker -DockerArgs @('ps','-aq','--filter','label=com.docker.compose.project=narration-s396-local','--filter',"label=com.docker.compose.service=$service"))
        if ($existing.Count) { throw 'FIRST_RESUME_ONLY: application container already exists; never replace it.' }
    }
    foreach ($port in @(5180,5181)) {
        if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) { throw "PORT_IN_USE $port" }
    }
    & "$PSScriptRoot/Test-MongoTransaction.ps1" -ReleaseId $ReleaseId
    if (-not $?) { throw 'TRANSACTION_TEST_FAILED' }
    $check = @'
const d = db.getSiblingDB('s396_local_cd');
for (const name of ['users','projects','narrations','results','translations','translationattempts','processingjobs']) {
  if (d.getCollection(name).countDocuments({}) !== 0) throw Error('NOT_EMPTY_BUSINESS_DATABASE');
}
print('FIRST_DEPLOY_DATABASE_PASS');
'@
    $result = Invoke-DockerInput @('exec','-i',$mongoId,'mongosh','--quiet','--file','/dev/stdin') $check
    if ($result -notmatch 'FIRST_DEPLOY_DATABASE_PASS') { throw 'DATABASE_IDENTITY_UNCERTAIN' }
    # The only existing application is MongoDB; no Backend process/RAM draft can
    # exist in this project. --no-recreate protects the existing MongoDB resource.
    Invoke-LocalCompose $release @('up','-d','--no-build','--pull','never','--no-recreate','--wait','--wait-timeout','180','backend','customer-web','admin-web')
    & "$PSScriptRoot/Test-Smoke.ps1" -ReleaseId $ReleaseId
    if (-not $?) { throw 'SMOKE_FAILED' }
} finally { $lock.Dispose() }
