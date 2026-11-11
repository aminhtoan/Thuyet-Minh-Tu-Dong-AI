. "$PSScriptRoot/Acceptance-Helpers.ps1"
function Save-FrontendJournal($Journal) {
    $dir = Join-Path $script:StateRoot 'journals'
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $file = Join-Path $dir ($Journal.operationId + '.json')
    $Journal.updatedUtc = [DateTime]::UtcNow.ToString('o')
    $tmp = $file + '.tmp'
    $Journal | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $tmp -Encoding UTF8
    Move-Item -LiteralPath $tmp -Destination $file -Force
}
function Add-FrontendEvent($Journal,[string]$State) {
    $Journal.state = $State
    $Journal.events = @($Journal.events) + @([ordered]@{state=$State;utc=[DateTime]::UtcNow.ToString('o')})
    Save-FrontendJournal $Journal
}
function Get-S396Running([string]$Service) {
    $ids = @(Invoke-Docker -DockerArgs @('ps','-q','--filter','label=com.docker.compose.project=narration-s396-local','--filter',"label=com.docker.compose.service=$Service"))
    if ($ids.Count -ne 1) { throw 'RUNNING_SERVICE_IDENTITY_UNKNOWN' }
    return (Invoke-Docker -DockerArgs @('inspect',$ids[0]) | ConvertFrom-Json)[0]
}
function Assert-NoActiveFrontendJobs([string]$Json) {
    $data = $Json | ConvertFrom-Json
    if ($null -eq $data.activeJobs -or $null -eq $data.businessRows) { throw 'RUNTIME_STATE_UNKNOWN' }
    if ([int]$data.activeJobs -ne 0) { throw 'ACTIVE_JOBS_BLOCK_UPGRADE' }
    if ([int]$data.businessRows -ne 0) { throw 'SYNTHETIC_EMPTY_ENVIRONMENT_REQUIRED' }
}
function Assert-CompletedFrontendJournal($Journal) {
    if ($Journal.state -notin @('PROMOTED','ROLLED_BACK')) { throw 'UNFINISHED_DEPLOYMENT_REQUIRES_REVIEW' }
}
function Get-FrontendSafety($Release) {
    $mongo = Assert-S396ExistingMongo $Release
    $backend = Get-S396Running 'backend'
    $expected = @($Release.Manifest.images | Where-Object { $_.service -eq 'backend' })[0]
    if ($backend.Image -ne $expected.id -or $backend.State.Health.Status -ne 'healthy') { throw 'BACKEND_RELEASE_UNKNOWN' }
    if (@($backend.NetworkSettings.Networks.PSObject.Properties).Count -ne 1 -or -not $backend.NetworkSettings.Networks.PSObject.Properties['narration-s396-isolated']) { throw 'BACKEND_NETWORK_UNSAFE' }
    foreach ($entry in @('GEMINI_API_KEY=','GOOGLE_API_KEY=','OPENAI_API_KEY=','GROUP_TRANSLATION_ENABLED=false','CUSTOMER_TRANSLATION_ENABLED=false')) {
        if ($entry -notin $backend.Config.Env) { throw 'SYNTHETIC_AI_DISABLED_REQUIRED' }
    }
    $program = @'
const d=db.getSiblingDB('s396_local_cd');
const activeJobs=d.processingjobs.countDocuments({status:{$in:['QUEUED','PROCESSING']}});
let businessRows=0;
for(const name of ['users','projects','narrations','translations','results','translationattempts'])businessRows+=d.getCollection(name).countDocuments({});
const fixture=d.s396_acceptance.findOne({_id:'s396-committed-sentinel'});
if(!fixture||fixture.version!==1||fixture.value!=='synthetic-persistence')throw Error('SYNTHETIC_FIXTURE_REQUIRED');
print(JSON.stringify({activeJobs,businessRows,fixture:{_id:fixture._id,value:fixture.value,version:fixture.version}}));
'@
    $json = (Invoke-DockerInput @('exec','-i',$mongo,'mongosh','--quiet','--file','/dev/stdin') $program).Trim()
    Assert-NoActiveFrontendJobs $json
    $media = @'
const fs=require('fs'),c=require('crypto');
console.log(c.createHash('sha256').update(fs.readFileSync('/data/uploads/.s396-persistence-sentinel')).digest('hex'));
'@
    $hash = (Invoke-DockerInput @('exec','-i',$backend.Id,'node','--input-type=commonjs') $media).Trim()
    if ($hash -ne (Get-TextHash 'S396 local synthetic sentinel')) { throw 'MEDIA_SENTINEL_INVALID' }
    $m = (Invoke-Docker -DockerArgs @('inspect',$mongo) | ConvertFrom-Json)[0]
    return [ordered]@{backendId=$backend.Id;backendImage=$backend.Image;backendStarted=$backend.State.StartedAt;mongoId=$m.Id;mongoStarted=$m.State.StartedAt;mediaHash=$hash;databaseHash=(Get-TextHash $json);backendMounts=($backend.Mounts | ConvertTo-Json -Depth 10 -Compress);mongoMounts=($m.Mounts | ConvertTo-Json -Depth 10 -Compress)}
}
function Assert-SafetyUnchanged($Before,$After) {
    foreach ($key in @('backendId','backendImage','backendStarted','mongoId','mongoStarted','mediaHash','databaseHash','backendMounts','mongoMounts')) {
        if ($Before.$key -ne $After.$key) { throw "CORE_OR_DATA_CHANGED: $key" }
    }
}
function Test-FrontendEndpoint([string]$Service) {
    $item = Get-S396Running $Service
    $port = if ($Service -eq 'customer-web') { 5180 } else { 5181 }
    $nets = @($item.NetworkSettings.Networks.PSObject.Properties.Name | Sort-Object)
    if (($nets -join ',') -ne 'narration-s396-frontend,narration-s396-isolated') { throw 'FRONTEND_TOPOLOGY_INVALID' }
    $binding = @($item.NetworkSettings.Ports.'8080/tcp')
    if ($binding.Count -ne 1 -or $binding[0].HostIp -ne '127.0.0.1' -or [int]$binding[0].HostPort -ne $port) { throw 'FRONTEND_LOOPBACK_INVALID' }
    for ($i=0;$i -lt 35;$i++) {
        $status = Invoke-Docker -DockerArgs @('inspect',$item.Id,'--format','{{.State.Health.Status}}')
        if ($status -eq 'healthy') { break }
        if ($i -eq 34) { throw 'FRONTEND_HEALTH_TIMEOUT' }
        Start-Sleep -Seconds 1
    }
    foreach ($path in @('/','/login','/projects/s396-upgrade-check','/api/health')) {
        $r = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port$path" -TimeoutSec 8
        if ($r.StatusCode -ne 200) { throw 'FRONTEND_HTTP_FAILED' }
        if ($path -eq '/api/health') {
            $data = $r.Content | ConvertFrom-Json
            if (-not $data.success -or $data.data.database -ne 'connected') { throw 'PROXY_API_INCOMPATIBLE' }
        } elseif ($r.Content -notmatch '<html') { throw 'SPA_INCOMPATIBLE' }
    }
    foreach ($case in @(@('/api/s396-absent',404),@('/api/admin/users',401))) {
        $status = 0; $body = ''; $contentType = ''
        try { $null = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port$($case[0])" -TimeoutSec 8 }
        catch {
            if (-not $_.Exception.Response) { throw }
            $response = $_.Exception.Response; $status = [int]$response.StatusCode
            $contentType = $response.ContentType
            $reader = New-Object IO.StreamReader($response.GetResponseStream())
            try { $body = $reader.ReadToEnd() } finally { $reader.Dispose() }
        }
        if ($status -ne $case[1] -or $body -match '<html' -or $contentType -notmatch 'application/json') { throw 'API_ERROR_ROUTING_INVALID' }
    }
}
function Assert-FrontendPlan($Current,$Candidate,$Release) {
    if ($Candidate.schema -ne 'S396_FRONTEND_CANDIDATE_V1' -or $Candidate.releaseId -ne $Release.Manifest.releaseId -or $Candidate.service -notin @('customer-web','admin-web')) { throw 'CANDIDATE_MANIFEST_INVALID' }
    if ($Candidate.baseImageId -ne $Current.Image -or $Candidate.backendImageId -ne @($Release.Manifest.images | Where-Object {$_.service -eq 'backend'})[0].id) { throw 'API_COMPATIBILITY_BASE_MISMATCH' }
    if ($Candidate.compatibility -ne 'SYNTHETIC_CONFIG_ONLY_V1') { throw 'API_COMPATIBILITY_UNVERIFIED' }
    $image = (Invoke-Docker -DockerArgs @('image','inspect',$Candidate.imageId) | ConvertFrom-Json)[0]
    if ($image.Id -ne $Candidate.imageId -or $image.Config.Labels.'localcd.synthetic.base' -ne $Candidate.baseImageId) { throw 'CANDIDATE_IMAGE_IDENTITY_INVALID' }
    if ($Current.State.Health.Status -ne 'healthy') { throw 'CURRENT_RELEASE_NOT_HEALTHY' }
}
function Restore-Frontend($Journal,$Release) {
    # A manual rollback of a successfully promoted B requires B still passes
    # smoke; an automatic failed-candidate recovery uses the exact recorded ID.
    Assert-SafetyUnchanged $Journal.before (Get-FrontendSafety $Release)
    $old = (Invoke-Docker -DockerArgs @('inspect',$Journal.oldContainerId) | ConvertFrom-Json)[0]
    if ($old.Image -ne $Journal.oldImageId -or $old.State.Running) { throw 'ROLLBACK_OLD_CONTAINER_INVALID' }
    Add-FrontendEvent $Journal 'ROLLBACK_PREPARED'
    $candidate = (Invoke-Docker -DockerArgs @('inspect',$Journal.candidateContainerId) | ConvertFrom-Json)[0]
    if ($candidate.Image -ne $Journal.candidateImageId -or $candidate.Name.TrimStart('/') -ne $Journal.originalName) { throw 'ROLLBACK_CANDIDATE_CHANGED' }
    if ($candidate.State.Running) { Invoke-Docker -DockerArgs @('stop',$candidate.Id) | Out-Null }
    Add-FrontendEvent $Journal 'CANDIDATE_STOPPED'
    Invoke-Docker -DockerArgs @('rename',$candidate.Id,($Journal.originalName + '-failed-' + $Journal.operationId)) | Out-Null
    Invoke-Docker -DockerArgs @('rename',$old.Id,$Journal.originalName) | Out-Null
    Invoke-Docker -DockerArgs @('start',$old.Id) | Out-Null
    Add-FrontendEvent $Journal 'OLD_RESTORED_VERIFYING'
    Test-FrontendEndpoint $Journal.service
    Assert-SafetyUnchanged $Journal.before (Get-FrontendSafety $Release)
    Add-FrontendEvent $Journal 'ROLLED_BACK'
}
