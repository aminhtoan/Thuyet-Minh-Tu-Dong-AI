Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:PackageRoot = $PSScriptRoot
$script:RepoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$script:StateRoot = Join-Path $PSScriptRoot '.state'
function Invoke-Docker {
    param([Parameter(ValueFromRemainingArguments=$true)][string[]]$DockerArgs)
    $result = & docker @DockerArgs
    if ($LASTEXITCODE -ne 0) { throw ('DOCKER_FAILED: ' + ($DockerArgs | Select-Object -First 3) -join ' ') }
    return $result
}
function Get-TextHash([string]$Value) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Value)))).Replace('-','').ToLowerInvariant() }
    finally { $sha.Dispose() }
}
function Enter-LocalLock {
    New-Item -ItemType Directory -Force -Path $script:StateRoot | Out-Null
    return [IO.File]::Open((Join-Path $script:StateRoot 'operation.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
}
function Assert-LocalDocker {
    if ($env:DOCKER_HOST -or $env:DOCKER_CONTEXT) { throw 'INHERITED_DOCKER_TARGET_REJECTED' }
    $endpoint = Invoke-Docker -DockerArgs @('context','inspect','--format','{{.Endpoints.docker.Host}}')
    if ($endpoint -notmatch '^npipe:/{4}\./pipe/') { throw 'LOCAL_WINDOWS_DOCKER_DESKTOP_REQUIRED' }
    if ((Invoke-Docker -DockerArgs @('info','--format','{{.OSType}}')) -ne 'linux') { throw 'LINUX_CONTAINERS_REQUIRED' }
}
function Read-Release([string]$ReleaseId) {
    if ($ReleaseId -notmatch '^sha-[a-f0-9]{12}-[a-f0-9]{12}$') { throw 'INVALID_RELEASE_ID' }
    $dir = Join-Path $script:StateRoot $ReleaseId
    $manifest = Get-Content -LiteralPath (Join-Path $dir 'manifest.json') -Raw | ConvertFrom-Json
    if ($manifest.releaseId -ne $ReleaseId -or $manifest.schema -ne 'S396_LOCAL_V1') { throw 'INVALID_MANIFEST' }
    foreach ($image in $manifest.images) {
        $actual = Invoke-Docker -DockerArgs @('image','inspect',$image.tag,'--format','{{.Id}}')
        if ($actual -ne $image.id) { throw 'IMAGE_ID_MISMATCH' }
    }
    foreach ($row in $manifest.files) {
        $file = [IO.Path]::GetFullPath((Join-Path (Join-Path $dir 'snapshot') $row.path))
        $prefix = [IO.Path]::GetFullPath((Join-Path $dir 'snapshot')) + [IO.Path]::DirectorySeparatorChar
        if (-not $file.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)) { throw 'SNAPSHOT_PATH_INVALID' }
        if ((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $row.sha256) { throw 'SNAPSHOT_CHANGED' }
    }
    return @{ Directory = $dir; Manifest = $manifest }
}
function Invoke-LocalCompose($Release, [string[]]$ComposeArgs) {
    foreach ($name in @('LOCALCD_BACKEND_IMAGE','LOCALCD_CUSTOMER_IMAGE','LOCALCD_ADMIN_IMAGE')) {
        if ([Environment]::GetEnvironmentVariable($name)) { throw 'REMOVE_INHERITED_LOCALCD_IMAGE_OVERRIDE' }
    }
    $compose = Join-Path $Release.Directory 'snapshot/infra/local-cd/compose.yaml'
    $envFile = Join-Path $Release.Directory 'images.properties'
    $expected = @(('LOCALCD_BACKEND_IMAGE=' + $Release.Manifest.images[0].tag),
        ('LOCALCD_CUSTOMER_IMAGE=' + $Release.Manifest.images[1].tag),
        ('LOCALCD_ADMIN_IMAGE=' + $Release.Manifest.images[2].tag)) -join "`n"
    $actual = (Get-Content -LiteralPath $envFile -Raw).Replace("`r`n","`n").TrimEnd()
    if ($actual -ne $expected) { throw 'IMAGE_ENV_FILE_MISMATCH' }
    return Invoke-Docker -DockerArgs (@('compose','--env-file',$envFile,'-p','narration-s396-local','-f',$compose) + $ComposeArgs)
}
function Assert-QuiescentOrFresh($Release) {
    $containers = @(Invoke-Docker -DockerArgs @('ps','-aq','--filter','label=com.docker.compose.project=narration-s396-local','--filter','label=com.docker.compose.service=backend'))
    if ($containers.Count -eq 0) { return }
    # Observe jobs read-only, but never mistake zero jobs for proof of no RAM drafts.
    try {
        $js = 'const d=db.getSiblingDB("s396_local_cd"); print(d.processingjobs.countDocuments({status:{$in:["QUEUED","PROCESSING"]}}));'
        $count = Invoke-LocalCompose $Release @('exec','-T','mongodb','mongosh','--quiet','--eval',$js)
        if ([int]($count | Select-Object -Last 1) -gt 0) { throw 'ACTIVE_JOBS' }
    } catch { throw 'DEPLOY_BLOCKED: cannot prove no QUEUED/PROCESSING jobs in isolated database.' }
    throw 'DEPLOY_BLOCKED: RAM draft/admission state is not observable through existing APIs. Upgrade/rollback requires a separately reviewed maintenance procedure; no bypass switch is provided.'
}
