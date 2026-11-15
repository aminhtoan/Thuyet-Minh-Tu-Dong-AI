[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][ValidateSet('Build','Preflight')][string]$Stage,
    [Parameter(Mandatory=$true)][ValidatePattern('^s424-[a-z0-9][a-z0-9-]{0,47}\z')][string]$RunId
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$project = 'narration-s424-acceptance'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$stateRoot = Join-Path $repo 'infra/local-cd/.state/s424-acceptance'
$state = Join-Path $stateRoot $RunId
$snapshot = Join-Path $state 'snapshot'
$imageKeys = @('S424_BACKEND_IMAGE','S424_CUSTOMER_IMAGE','S424_ADMIN_IMAGE','S424_MONGO_IMAGE','S424_RUN_ID')
function Docker([string[]]$DockerArgs) {
    $value = & docker.exe @DockerArgs
    if ($LASTEXITCODE -ne 0) { throw ('DOCKER_FAILED: ' + ($DockerArgs | Select-Object -First 3) -join ' ') }
    return $value
}
function Assert-NoLinks([string]$Path) {
    $cursor = [IO.Path]::GetFullPath($Path)
    while ($cursor) {
        if ((Test-Path -LiteralPath $cursor) -and ((Get-Item -LiteralPath $cursor).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'FILESYSTEM_LINK_REJECTED' }
        $parent = Split-Path $cursor
        if ($parent -eq $cursor) { break }; $cursor = $parent
    }
}
function Hash([string]$Path) { return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function Assert-Engine {
    if ($env:DOCKER_HOST -or $env:DOCKER_CONTEXT -or $env:COMPOSE_FILE -or $env:COMPOSE_PROJECT_NAME -or $env:COMPOSE_ENV_FILES) { throw 'INHERITED_DOCKER_OR_COMPOSE_TARGET_REJECTED' }
    foreach ($key in $imageKeys) { if ([Environment]::GetEnvironmentVariable($key)) { throw 'INHERITED_ACCEPTANCE_OVERRIDE_REJECTED' } }
    $endpoint = Docker @('context','inspect','--format','{{.Endpoints.docker.Host}}')
    if ($endpoint -notmatch '^npipe:/{4}\./pipe/') { throw 'LOCAL_DOCKER_DESKTOP_REQUIRED' }
    if ((Docker @('info','--format','{{.OSType}}')) -ne 'linux') { throw 'LINUX_ENGINE_REQUIRED' }
}
function Assert-FreshResources {
    $containers = @(Docker @('ps','-aq','--filter',"label=com.docker.compose.project=$project"))
    $names = @(Docker @('ps','-a','--format','{{.Names}}'))
    if ($containers.Count -or @($names | Where-Object { $_ -like "$project*" }).Count) { throw 'ACCEPTANCE_CONTAINER_EXISTS: no adoption or replacement' }
    foreach ($kind in @('volume','network')) {
        $names = @(Docker @($kind,'ls','--format','{{.Name}}'))
        if (@($names | Where-Object { $_ -like "$project*" }).Count) { throw 'ACCEPTANCE_RESOURCE_EXISTS: no reuse or deletion' }
    }
    try { $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop) }
    catch { throw 'PORT_OBSERVATION_FAILED' }
    if (@($listeners | Where-Object { $_.LocalPort -in @(5280,5281) }).Count) { throw 'ACCEPTANCE_PORT_IN_USE' }
}
function Image-Tags {
    return @('backend','customer','admin') | ForEach-Object { "narration-s424-${_}:$RunId" }
}
function Assert-NewTags {
    $existing = @(Docker @('image','ls','--format','{{.Repository}}:{{.Tag}}'))
    foreach ($tag in @(Image-Tags)) { if ($tag -in $existing) { throw 'IMAGE_TAG_EXISTS: never overwrite' } }
}
function Assert-NewTagsForCurrent([string]$Tag) {
    if ($Tag -notin @(Image-Tags)) { throw 'UNEXPECTED_IMAGE_TAG' }
    $existing = @(Docker @('image','ls','--format','{{.Repository}}:{{.Tag}}'))
    if ($Tag -in $existing) { throw 'IMAGE_TAG_EXISTS: never overwrite' }
}
function Compose-Config([string[]]$Properties) {
    $map = Join-Path $state 'images.properties'
    Assert-NoLinks $map
    $actual = (Get-Content -LiteralPath $map -Raw).Replace("`r`n","`n").TrimEnd()
    if ($actual -cne ($Properties -join "`n")) { throw 'IMAGE_MAP_CHANGED' }
    $json = Docker @('compose','--env-file',$map,'-p',$project,'-f',(Join-Path $snapshot 'infra/local-cd/acceptance/compose.yaml'),'config','--format','json')
    return ($json -join "`n") | ConvertFrom-Json
}
function Assert-Keys($Object, [string[]]$Allowed) {
    foreach ($property in $Object.PSObject.Properties) { if ($property.Name -notin $Allowed) { throw ('UNEXPECTED_COMPOSE_FIELD: ' + $property.Name) } }
}
function Assert-Config($Config, [string[]]$Ids) {
    if ($Config.name -ne $project) { throw 'PROJECT_MISMATCH' }
    Assert-Keys $Config @('name','services','networks','volumes')
    Assert-Keys $Config.services @('mongodb','backend','customer-web','admin-web')
    if (@($Config.services.PSObject.Properties).Count -ne 4) { throw 'EXPECTED_FOUR_SERVICES' }
    $services = @('backend','customer-web','admin-web','mongodb')
    for ($i=0; $i -lt $services.Count; $i++) {
        $service = $Config.services.($services[$i])
        Assert-Keys $service @('image','command','entrypoint','labels','volumes','tmpfs','networks','healthcheck','init','environment','depends_on','stop_grace_period','ports','read_only')
        if ($service.PSObject.Properties['entrypoint'] -and $null -ne $service.entrypoint) { throw 'ENTRYPOINT_OVERRIDE_FORBIDDEN' }
        if ($service.image -ne $Ids[$i] -or $service.labels.'acceptance.scope' -ne 'S424' -or $service.labels.'acceptance.run' -ne $RunId) { throw 'SERVICE_IDENTITY_MISMATCH' }
        $expectedNetworks = if ($i -in @(0,3)) { @('isolated') } else { @('frontend','isolated') }
        if ((@($service.networks.PSObject.Properties.Name | Sort-Object) -join ',') -ne ($expectedNetworks -join ',')) { throw 'SERVICE_NETWORK_MISMATCH' }
        $ports = @(); if ($service.PSObject.Properties['ports']) { $ports = @($service.ports) }
        if ($i -in @(0,3)) { if ($ports.Count) { throw 'CORE_HOST_PORT_FORBIDDEN' } }
        else {
            if ($ports.Count -ne 1 -or $ports[0].host_ip -ne '127.0.0.1' -or $ports[0].target -ne 8080 -or [string]$ports[0].published -ne [string](5279+$i) -or $ports[0].protocol -ne 'tcp') { throw 'FRONTEND_PORT_MISMATCH' }
            if (-not $service.read_only) { throw 'FRONTEND_MUST_BE_READONLY' }
        }
    }
    Assert-Keys $Config.networks @('isolated','frontend')
    foreach ($name in @('isolated','frontend')) {
        $net = $Config.networks.$name
        Assert-Keys $net @('name','driver','internal','labels','ipam')
        if ($net.PSObject.Properties['ipam'] -and @($net.ipam.PSObject.Properties).Count) { throw 'CUSTOM_IPAM_FORBIDDEN' }
        if ($net.name -ne "$project-$name" -or $net.driver -ne 'bridge' -or $net.labels.'acceptance.scope' -ne 'S424' -or $net.labels.'acceptance.run' -ne $RunId) { throw 'NETWORK_IDENTITY_MISMATCH' }
    }
    if (-not $Config.networks.isolated.internal) { throw 'INTERNAL_NETWORK_REQUIRED' }
    Assert-Keys $Config.volumes @('database','media')
    foreach ($name in @('database','media')) {
        $volume = $Config.volumes.$name
        Assert-Keys $volume @('name','labels')
        if ($volume.name -ne "$project-$name" -or $volume.labels.'acceptance.scope' -ne 'S424' -or $volume.labels.'acceptance.run' -ne $RunId) { throw 'VOLUME_IDENTITY_MISMATCH' }
    }
    $expectedEnvironment = @{
        NODE_ENV='production'; PORT='8080'; UPLOAD_DIR='/data/uploads';
        MONGODB_URI='mongodb://mongodb:27017/s424_acceptance?replicaSet=s424rs';
        JWT_ACCESS_SECRET='s424-synthetic-access-not-for-production'; JWT_REFRESH_SECRET='s424-synthetic-refresh-not-for-production';
        JWT_ACCESS_EXPIRES_IN='15m'; JWT_REFRESH_EXPIRES_IN='1d';
        CORS_ORIGINS='http://127.0.0.1:5280,http://127.0.0.1:5281';
        GEMINI_API_KEY=''; GOOGLE_API_KEY=''; OPENAI_API_KEY=''; CUSTOMER_TRANSLATION_ENABLED='false'; GROUP_TRANSLATION_ENABLED='false'
    }
    Assert-Keys $Config.services.backend.environment @($expectedEnvironment.Keys)
    foreach ($key in $expectedEnvironment.Keys) { if ([string]$Config.services.backend.environment.$key -cne $expectedEnvironment[$key]) { throw 'BACKEND_ENVIRONMENT_MISMATCH' } }
    $mongo = $Config.services.mongodb
    if (($mongo.command -join '|') -ne 'mongod|--replSet|s424rs|--bind_ip_all|--setParameter|diagnosticDataCollectionEnabled=false') { throw 'MONGO_COMMAND_MISMATCH' }
    foreach ($name in @('backend','customer-web','admin-web','mongodb')) {
        $service = $Config.services.$name
        if ($name -ne 'backend' -and $service.PSObject.Properties['environment']) { throw 'UNEXPECTED_SERVICE_ENVIRONMENT' }
        if ($name -ne 'mongodb' -and $service.PSObject.Properties['command'] -and $null -ne $service.command) { throw 'COMMAND_OVERRIDE_FORBIDDEN' }
        $mounts = @(); if ($service.PSObject.Properties['volumes']) { $mounts = @($service.volumes) }
        $expectedCount = if ($name -eq 'mongodb') { 2 } elseif ($name -eq 'backend') { 1 } else { 0 }
        if ($mounts.Count -ne $expectedCount) { throw 'UNEXPECTED_MOUNT' }
        foreach ($mount in $mounts) {
            if ($mount.type -eq 'bind') {
                $expected = [IO.Path]::GetFullPath((Join-Path $snapshot 'infra/local-cd/acceptance/mongo-init.js'))
                if ($name -ne 'mongodb' -or [IO.Path]::GetFullPath($mount.source) -ne $expected -or $mount.target -ne '/opt/s424/mongo-init.js' -or -not $mount.read_only) { throw 'HOST_MOUNT_FORBIDDEN' }
                Assert-NoLinks $expected
            } elseif ($mount.type -eq 'volume') {
                $volumeName = if ($name -eq 'mongodb') { 'database' } else { 'media' }
                $destination = if ($name -eq 'mongodb') { '/data/db' } else { '/data/uploads' }
                if ($mount.source -ne $volumeName -or $mount.target -ne $destination) { throw 'VOLUME_MOUNT_MISMATCH' }
            } else { throw 'MOUNT_TYPE_FORBIDDEN' }
        }
    }
}
function Properties([string[]]$Ids) {
    return @("S424_BACKEND_IMAGE=$($Ids[0])","S424_CUSTOMER_IMAGE=$($Ids[1])","S424_ADMIN_IMAGE=$($Ids[2])","S424_MONGO_IMAGE=$($Ids[3])","S424_RUN_ID=$RunId")
}
function Assert-Snapshot($Manifest) {
    $paths = @($Manifest.files | ForEach-Object { $_.path })
    $actual = @(Get-ChildItem -LiteralPath $snapshot -Recurse -File | ForEach-Object { $_.FullName.Substring($snapshot.Length+1).Replace('\','/') })
    if ((($paths | Sort-Object) -join '|') -cne (($actual | Sort-Object) -join '|')) { throw 'SNAPSHOT_FILE_SET_CHANGED' }
    foreach ($row in $Manifest.files) {
        $file = [IO.Path]::GetFullPath((Join-Path $snapshot $row.path))
        if (-not $file.StartsWith($snapshot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'SNAPSHOT_PATH_ESCAPE' }
        Assert-NoLinks $file
        if ((Hash $file) -ne $row.sha256) { throw 'SNAPSHOT_HASH_MISMATCH' }
    }
}
Assert-NoLinks $stateRoot
Assert-Engine
Assert-FreshResources
if ($Stage -eq 'Preflight' -and -not (Test-Path -LiteralPath $state -PathType Container)) { throw 'BUILD_MANIFEST_REQUIRED' }
if ($Stage -eq 'Build' -and (Test-Path -LiteralPath $state)) { throw 'RUN_ALREADY_EXISTS: retain evidence and choose a new RunId' }
if ($Stage -eq 'Build') { New-Item -ItemType Directory -Force -Path $stateRoot | Out-Null }
$lockMode = if ($Stage -eq 'Build') { [IO.FileMode]::OpenOrCreate } else { [IO.FileMode]::Open }
$lock = [IO.File]::Open((Join-Path $stateRoot 'operation.lock'),$lockMode,'ReadWrite','None')
try {
    Assert-FreshResources
    if ($Stage -eq 'Build') {
        Assert-NewTags
        if (Test-Path -LiteralPath $state) { throw 'RUN_ALREADY_EXISTS' }
        New-Item -ItemType Directory -Path $state | Out-Null
        $files = @(& git -C $repo -c core.quotePath=false ls-files --cached --others --exclude-standard)
        if ($LASTEXITCODE -ne 0) { throw 'GIT_FILES_FAILED' }
        $rows = @()
        foreach ($path in ($files | Sort-Object -Unique)) {
            if ($path -match '(^|/)(\.env[^/]*|node_modules|uploads|\.git|\.state|\.expo|dist|build|cache|tmp|scratch)(/|$)' -or $path -match '(?i)(secret|credential|id_rsa|id_ed25519)|\.(pem|key|pfx|p12|tsbuildinfo|log|mp3|mp4|wav|mov|m4a)$') { continue }
            $include = $path -match '^(frontend-web|admin-web)/(src/|public/|[^/]+\.(json|ts|js|mjs|html|css)$)' -or
                $path -match '^backend/(src/|staging/(runtime-checks|preflight|healthcheck)\.mjs$|Dockerfile$|\.dockerignore$|package(-lock)?\.json$|tsconfig\.json$)' -or
                $path -in @('scripts/customer-design-sync.mjs','design/customer/tokens.json','frontend-mobile/src/theme/tokens.ts','infra/local-cd/nginx.conf','infra/local-cd/synthetic-v1/frontend.Dockerfile','infra/local-cd/acceptance/compose.yaml','infra/local-cd/acceptance/mongo-init.js')
            if (-not $include) { continue }
            $source = Join-Path $repo $path
            if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { continue }
            Assert-NoLinks $source
            if ([IO.Path]::GetExtension($path) -in @('.ts','.tsx','.js','.mjs','.json','.yaml','.html','.css')) {
                $text = [IO.File]::ReadAllText($source)
                if ($text -match 'AIza[\w-]{25,}|\bsk-[A-Za-z0-9]{24,}|\bgh[pousr]_[\w]{20,}|-----BEGIN .*PRIVATE KEY|mongodb(?:\+srv)?://[^\s/]+:[^\s@]+@') { throw 'POSSIBLE_SOURCE_SECRET: review source without logging contents' }
            }
            $destination = Join-Path $snapshot $path
            New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null
            Copy-Item -LiteralPath $source -Destination $destination
            $rows += [ordered]@{path=$path;sha256=(Hash $destination)}
        }
        foreach ($required in @('backend/Dockerfile','backend/package-lock.json','backend/staging/preflight.mjs','infra/local-cd/acceptance/compose.yaml','infra/local-cd/acceptance/mongo-init.js','infra/local-cd/synthetic-v1/frontend.Dockerfile')) {
            if (-not (Test-Path -LiteralPath (Join-Path $snapshot $required))) { throw 'REQUIRED_SNAPSHOT_INPUT_MISSING' }
        }
        $head = (& git -C $repo rev-parse HEAD).Trim(); if ($LASTEXITCODE -ne 0) { throw 'GIT_HEAD_FAILED' }
        $mongo = ((Docker @('image','inspect','mongo:8.0.17')) -join "`n" | ConvertFrom-Json)[0]
        # Vendor Mongo image may be shared read-only; S39.6 application images are never selected.
        $images = @(); $tags = @(Image-Tags)
        $provisional = @($tags) + @($mongo.Id)
        Properties $provisional | Set-Content -LiteralPath (Join-Path $state 'images.properties') -Encoding ASCII
        Assert-Config (Compose-Config (Properties $provisional)) $provisional
        $manifest = [ordered]@{schema='S424_ACCEPTANCE_V1';runId=$RunId;project=$project;head=$head;status='BUILDING';files=$rows;images=@();mongoId=$mongo.Id;createdUtc=[DateTime]::UtcNow.ToString('o')}
        $manifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $state 'manifest.json') -Encoding UTF8
        for ($i=0; $i -lt 3; $i++) {
            Assert-NewTagsForCurrent $tags[$i]
            $argsForBuild = @('build','--label','acceptance.scope=S424','--label',"acceptance.run=$RunId",'--label',"org.opencontainers.image.revision=$head",'-t',$tags[$i])
            if ($i -eq 0) { $argsForBuild += @('-f',(Join-Path $snapshot 'backend/Dockerfile'),(Join-Path $snapshot 'backend')) }
            else { $app = if ($i -eq 1) { 'frontend-web' } else { 'admin-web' }; $argsForBuild += @('-f',(Join-Path $snapshot 'infra/local-cd/synthetic-v1/frontend.Dockerfile'),'--build-arg',"APP=$app",'--build-arg','MUSEUM_URL=http://127.0.0.1:5280/',$snapshot) }
            Docker $argsForBuild | Out-Host
            $image = ((Docker @('image','inspect',$tags[$i])) -join "`n" | ConvertFrom-Json)[0]
            $images += [ordered]@{tag=$tags[$i];id=$image.Id}
            $manifest.images = $images
            $manifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $state 'manifest.json') -Encoding UTF8
        }
        $ids = @($images | ForEach-Object { $_.id }) + @($mongo.Id)
        $manifest = [ordered]@{schema='S424_ACCEPTANCE_V1';runId=$RunId;project=$project;head=$head;status='BUILT';files=$rows;images=$images;mongoId=$mongo.Id;createdUtc=[DateTime]::UtcNow.ToString('o')}
        Assert-Snapshot $manifest
        Properties $ids | Set-Content -LiteralPath (Join-Path $state 'images.properties') -Encoding ASCII
        Assert-Config (Compose-Config (Properties $ids)) $ids
        $manifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $state 'manifest.json') -Encoding UTF8
        Properties $ids | Set-Content -LiteralPath (Join-Path $state 'images.properties') -Encoding ASCII
        Write-Output "BUILD PASS: $state (no deployment performed)"
    } else {
        Assert-NoLinks $state
        $manifest = Get-Content -LiteralPath (Join-Path $state 'manifest.json') -Raw | ConvertFrom-Json
        if ($manifest.schema -ne 'S424_ACCEPTANCE_V1' -or $manifest.runId -ne $RunId -or $manifest.project -ne $project -or $manifest.status -ne 'BUILT' -or @($manifest.images).Count -ne 3) { throw 'INVALID_BUILD_MANIFEST' }
        Assert-Snapshot $manifest
        $tags = @(Image-Tags)
        for ($i=0; $i -lt 3; $i++) {
            $image = ((Docker @('image','inspect',$tags[$i])) -join "`n" | ConvertFrom-Json)[0]
            if ($manifest.images[$i].tag -ne $tags[$i] -or $image.Id -ne $manifest.images[$i].id -or $image.Config.Labels.'acceptance.run' -ne $RunId -or $image.Config.Labels.'acceptance.scope' -ne 'S424') { throw 'IMAGE_IDENTITY_MISMATCH' }
        }
        $mongo = ((Docker @('image','inspect','mongo:8.0.17')) -join "`n" | ConvertFrom-Json)[0]
        if ($mongo.Id -ne $manifest.mongoId) { throw 'MONGO_IMAGE_CHANGED' }
        $ids = @($manifest.images | ForEach-Object { $_.id }) + @($mongo.Id)
        $properties = @(Properties $ids)
        $actual = (Get-Content -LiteralPath (Join-Path $state 'images.properties') -Raw).Replace("`r`n","`n").TrimEnd()
        if ($actual -cne ($properties -join "`n")) { throw 'IMAGE_MAP_CHANGED' }
        Assert-Config (Compose-Config $properties) $ids
        Assert-FreshResources
        Write-Output "PREFLIGHT PASS: $state (point-in-time only; no up/smoke/cleanup performed)"
    }
} finally { $lock.Dispose() }
