[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ReleaseId)
. "$PSScriptRoot/Acceptance-Helpers.ps1"
$lock = Enter-LocalLock
function Wait-OwnedHealthy([string]$Id) {
    for ($i=0; $i -lt 45; $i++) {
        $status = Invoke-Docker -DockerArgs @('inspect',$Id,'--format','{{.State.Health.Status}}')
        if ($status -eq 'healthy') { return }
        Start-Sleep -Seconds 1
    }
    throw 'HEALTH_TIMEOUT_AFTER_RESTART'
}
try {
    $release = Read-Release $ReleaseId
    $mongoId = Assert-S396ExistingMongo $release
    $owned = @{}
    $before = @{}
    foreach ($service in @('mongodb','backend','customer-web','admin-web')) {
        $ids = @(Invoke-LocalCompose $release @('ps','-q',$service))
        if ($ids.Count -ne 1) { throw 'EXPECTED_ONE_RUNNING_SERVICE' }
        $owned[$service] = [string]$ids[0]
        $before[$service] = (Invoke-Docker -DockerArgs @('inspect',$ids[0]) | ConvertFrom-Json)[0]
    }
    foreach ($image in $release.Manifest.images) {
        $service = switch ($image.service) { 'backend' {'backend'}; 'customer' {'customer-web'}; 'admin' {'admin-web'} }
        if ($before[$service].Image -ne $image.id) { throw 'RESTART_IMAGE_MISMATCH' }
    }
    foreach ($entry in @('GEMINI_API_KEY=','GOOGLE_API_KEY=','OPENAI_API_KEY=','GROUP_TRANSLATION_ENABLED=false','CUSTOMER_TRANSLATION_ENABLED=false')) {
        if ($entry -notin $before['backend'].Config.Env) { throw 'RESTART_REQUIRES_AI_DISABLED' }
    }
    $mediaProgram = @'
const fs=require('fs'),crypto=require('crypto');
if(process.getuid()===0)throw Error('ROOT_FORBIDDEN');
console.log(crypto.createHash('sha256').update(fs.readFileSync('/data/uploads/.s396-persistence-sentinel')).digest('hex'));
'@
    $mediaBefore = (Invoke-DockerInput @('exec','-i',$owned['backend'],'node','--input-type=commonjs') $mediaProgram).Trim()
    if ($mediaBefore -ne (Get-TextHash 'S396 local synthetic sentinel')) { throw 'MEDIA_FIXTURE_INVALID' }
    $dbProgram = @'
const d=db.getSiblingDB('s396_local_cd');
if(!db.hello().isWritablePrimary||db.hello().setName!=='s396rs')throw Error('PRIMARY_REQUIRED');
for(const name of ['users','projects','processingjobs','translationattempts','narrations','results'])
 if(d.getCollection(name).countDocuments({})!==0)throw Error('SYNTHETIC_EMPTY_BUSINESS_DB_REQUIRED');
const row=d.s396_acceptance.findOne({_id:'s396-committed-sentinel'});
if(!row||row.version!==1||row.value!=='synthetic-persistence')throw Error('DB_FIXTURE_INVALID');
print(JSON.stringify({_id:row._id,value:row.value,version:row.version}));
'@
    # Quiescence is provable only for this empty synthetic environment with AI
    # disabled; this is NOT an upgrade/drain bypass for real projects or drafts.
    $dbBefore = (Invoke-DockerInput @('exec','-i',$mongoId,'mongosh','--quiet','--file','/dev/stdin') $dbProgram).Trim()
    Invoke-Docker -DockerArgs @('stop',$owned['customer-web'],$owned['admin-web']) | Out-Null
    $dbRecheck = (Invoke-DockerInput @('exec','-i',$mongoId,'mongosh','--quiet','--file','/dev/stdin') $dbProgram).Trim()
    if ($dbRecheck -ne $dbBefore) { throw 'DATA_CHANGED_WHILE_DRAINING' }
    Invoke-Docker -DockerArgs @('stop',$owned['backend']) | Out-Null
    Invoke-Docker -DockerArgs @('restart',$mongoId) | Out-Null
    Wait-OwnedHealthy $mongoId
    $dbAfter = (Invoke-DockerInput @('exec','-i',$mongoId,'mongosh','--quiet','--file','/dev/stdin') $dbProgram).Trim()
    if ($dbAfter -ne $dbBefore) { throw 'DATABASE_PERSISTENCE_FAILED' }
    Invoke-Docker -DockerArgs @('start',$owned['backend']) | Out-Null
    Wait-OwnedHealthy $owned['backend']
    $mediaAfter = (Invoke-DockerInput @('exec','-i',$owned['backend'],'node','--input-type=commonjs') $mediaProgram).Trim()
    if ($mediaAfter -ne $mediaBefore) { throw 'MEDIA_PERSISTENCE_FAILED' }
    Invoke-Docker -DockerArgs @('start',$owned['customer-web'],$owned['admin-web']) | Out-Null
    Wait-OwnedHealthy $owned['customer-web']
    Wait-OwnedHealthy $owned['admin-web']
    foreach ($service in $owned.Keys) {
        $after = (Invoke-Docker -DockerArgs @('inspect',$owned[$service]) | ConvertFrom-Json)[0]
        if ($after.Id -ne $before[$service].Id -or $after.Image -ne $before[$service].Image) { throw 'UNEXPECTED_RECREATE_OR_RELEASE_CHANGE' }
        if (($after.Mounts | ConvertTo-Json -Depth 10 -Compress) -ne ($before[$service].Mounts | ConvertTo-Json -Depth 10 -Compress)) { throw 'VOLUME_IDENTITY_CHANGED' }
    }
    & "$PSScriptRoot/Test-Smoke.ps1" -ReleaseId $ReleaseId
    if (-not $?) { throw 'POST_RESTART_SMOKE_FAILED' }
    [ordered]@{releaseId=$ReleaseId;status='PASS';mediaSha256=$mediaAfter;databaseSha256=(Get-TextHash $dbAfter);sameContainerIds=$true;sameImages=$true;sameMounts=$true;utc=[DateTime]::UtcNow.ToString('o')} |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $release.Directory 'restart-acceptance.json') -Encoding UTF8
    Write-Output "RESTART_PERSISTENCE_PASS media=$mediaAfter database=$(Get-TextHash $dbAfter)"
} finally { $lock.Dispose() }
