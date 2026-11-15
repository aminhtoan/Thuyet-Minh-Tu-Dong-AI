# Existing, machine-local S42.4 stack only. No build, deployment or resource creation.
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][ValidateSet('Start','Stop','Status','Logs')][string]$Action,
    [ValidateSet('All','mongodb','backend','customer-web','admin-web')][string]$Service = 'All',
    [ValidateRange(1,500)][int]$Tail = 50,
    [ValidateRange(30,600)][int]$HealthTimeoutSeconds = 180
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$project = 'narration-s424-acceptance'
$runId = 's424-20261115t215313'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$state = Join-Path $repo "infra/local-cd/.state/s424-acceptance/$runId"
$services = @('mongodb','backend','customer-web','admin-web')

function Invoke-LocalDocker([string[]]$DockerArgs) {
    # Capture diagnostics instead of leaking inspect/environment data on failures.
    $binary = (Get-Command docker.exe -CommandType Application -ErrorAction Stop).Source
    $previousPreference = $ErrorActionPreference
    try {
        # Native stderr also contains normal Docker logs on Windows PowerShell 5.1.
        $ErrorActionPreference = 'Continue'
        $output = & $binary @DockerArgs 2>&1
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($code -ne 0) { throw ('DOCKER_COMMAND_FAILED: ' + $DockerArgs[0]) }
    return $output
}
function Read-DockerObject([string[]]$DockerArgs) {
    $items = @(((Invoke-LocalDocker $DockerArgs) -join "`n") | ConvertFrom-Json)
    if ($items.Count -ne 1) { throw 'EXPECTED_ONE_DOCKER_OBJECT' }
    return $items[0]
}
function Assert-LocalPath([string]$Path) {
    $cursor = [IO.Path]::GetFullPath($Path)
    while ($cursor) {
        if (-not (Test-Path -LiteralPath $cursor)) { throw 'LOCAL_EVIDENCE_MISSING' }
        if ((Get-Item -LiteralPath $cursor).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'EVIDENCE_LINK_REJECTED' }
        $parent = Split-Path $cursor
        if ($parent -eq $cursor) { break }; $cursor = $parent
    }
}
function Assert-LocalEngine {
    if ($env:DOCKER_HOST -or $env:DOCKER_CONTEXT) { throw 'DOCKER_TARGET_OVERRIDE_REJECTED' }
    $endpoint = Invoke-LocalDocker @('context','inspect','--format','{{.Endpoints.docker.Host}}')
    if ($endpoint -notmatch '^npipe:/{4}\./pipe/') { throw 'LOCAL_DOCKER_DESKTOP_REQUIRED' }
    if ((Invoke-LocalDocker @('info','--format','{{.OSType}}')) -ne 'linux') { throw 'LINUX_ENGINE_REQUIRED' }
}
function Read-AcceptedEvidence {
    $manifestPath = Join-Path $state 'manifest.json'
    $journalPath = Join-Path $state 'resume-20261115T221015782.json'
    Assert-LocalPath $manifestPath; Assert-LocalPath $journalPath
    $m = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $j = Get-Content -LiteralPath $journalPath -Raw | ConvertFrom-Json
    if ($m.schema -ne 'S424_ACCEPTANCE_V1' -or $m.project -ne $project -or $m.runId -ne $runId -or $m.status -ne 'BUILT' -or
        $j.schema -ne 'S424_RESUME_V1' -or $j.runId -ne $runId -or $j.status -ne 'PASS' -or
        (Get-FileHash -LiteralPath $manifestPath).Hash -ne $j.manifestSha256) { throw 'ACCEPTANCE_EVIDENCE_MISMATCH' }
    foreach ($step in @('PREFLIGHT','MONGO_PRIMARY','MONGO_HEALTH','BACKEND_HEALTH','customer-web_HEALTH','admin-web_HEALTH','FINAL_SAFETY')) {
        if (@($j.steps | Where-Object { $_.step -eq $step -and $_.result -eq 'PASS' }).Count -ne 1) { throw 'ACCEPTANCE_STEP_UNPROVEN' }
    }
    if (@($m.images).Count -ne 3 -or @($j.containersBefore).Count -ne 4 -or @($j.containersAfter).Count -ne 4 -or @($j.resourcesBefore).Count -ne 4) { throw 'EVIDENCE_RESOURCE_COUNT' }
    $images = @{ backend=$m.images[0].id; 'customer-web'=$m.images[1].id; 'admin-web'=$m.images[2].id; mongodb=$m.mongoId }
    $containers = @{}
    foreach ($name in $services) {
        $before = @($j.containersBefore | Where-Object { $_.service -eq $name })
        $after = @($j.containersAfter | Where-Object { $_.service -eq $name })
        if ($before.Count -ne 1 -or $after.Count -ne 1 -or $before[0].id -notmatch '^[a-f0-9]{64}$' -or
            $before[0].id -ne $after[0].id -or $before[0].image -ne $images[$name] -or $after[0].image -ne $images[$name] -or
            $after[0].health -ne 'healthy') { throw 'EVIDENCE_CONTAINER_IDENTITY' }
        $containers[$name] = $before[0]
    }
    if (@($containers.Values.id | Sort-Object -Unique).Count -ne 4) { throw 'DUPLICATE_CONTAINER_IDENTITY' }
    # Preserve the original snapshot, including its old init script; never apply a hotfix here.
    $snapshot = Join-Path $state 'snapshot'
    if (@($m.files).Count -ne 557) { throw 'SNAPSHOT_COUNT' }
    foreach ($file in $m.files) {
        $path = [IO.Path]::GetFullPath((Join-Path $snapshot $file.path))
        if (-not $path.StartsWith($snapshot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'SNAPSHOT_PATH_ESCAPE' }
        Assert-LocalPath $path
        if ((Get-FileHash -LiteralPath $path).Hash.ToLowerInvariant() -ne $file.sha256) { throw 'SNAPSHOT_CHANGED' }
    }
    return @{ containers=$containers; resources=$j.resourcesBefore }
}
function Assert-OwnedContainer($Evidence, [string]$Name) {
    if ($Name -notin $services) { throw 'UNEXPECTED_SERVICE' }
    $before = $Evidence.containers[$Name]
    $r = Read-DockerObject @('inspect',$before.id)
    $l = $r.Config.Labels
    if ($r.Id -ne $before.id -or $r.Image -ne $before.image -or $l.'com.docker.compose.project' -ne $project -or
        $l.'com.docker.compose.service' -ne $Name -or $l.'acceptance.run' -ne $runId -or $l.'acceptance.scope' -ne 'S424') { throw 'CONTAINER_OWNERSHIP_MISMATCH' }
    if ([IO.Path]::GetFullPath($l.'com.docker.compose.project.config_files') -ne
        [IO.Path]::GetFullPath((Join-Path $state 'snapshot/infra/local-cd/acceptance/compose.yaml'))) { throw 'COMPOSE_SOURCE_MISMATCH' }
    $nets = @($r.NetworkSettings.Networks.PSObject.Properties.Name | Sort-Object)
    $wanted = if ($Name -in @('mongodb','backend')) { @("$project-isolated") } else { @("$project-frontend","$project-isolated") }
    if (($nets -join ',') -ne ($wanted -join ',')) { throw 'CONTAINER_NETWORK_MISMATCH' }
    if (($r.Mounts | ConvertTo-Json -Depth 7 -Compress) -cne ($before.mounts | ConvertTo-Json -Depth 7 -Compress) -or
        ($r.HostConfig.PortBindings | ConvertTo-Json -Depth 5 -Compress) -cne ($before.ports | ConvertTo-Json -Depth 5 -Compress)) { throw 'MOUNT_OR_PORT_MISMATCH' }
    if ($Name -eq 'backend') {
        if ('MONGODB_URI=mongodb://mongodb:27017/s424_acceptance?replicaSet=s424rs' -cnotin $r.Config.Env -or
            'UPLOAD_DIR=/data/uploads' -cnotin $r.Config.Env -or 'GROUP_TRANSLATION_ENABLED=false' -cnotin $r.Config.Env -or
            'CUSTOMER_TRANSLATION_ENABLED=false' -cnotin $r.Config.Env) { throw 'LOCAL_BACKEND_CONFIG_MISMATCH' }
        foreach ($key in @('GEMINI_API_KEY','GOOGLE_API_KEY','OPENAI_API_KEY')) {
            if ("$key=" -cnotin $r.Config.Env -or @($r.Config.Env | Where-Object { $_.StartsWith($key+'=') }).Count -ne 1) { throw 'AI_KEY_NOT_EMPTY' }
        }
    }
    if ($Name -eq 'mongodb' -and ($r.Config.Cmd -join '|') -ne 'mongod|--replSet|s424rs|--bind_ip_all|--setParameter|diagnosticDataCollectionEnabled=false') { throw 'LOCAL_MONGO_CONFIG_MISMATCH' }
    return $r
}
function Assert-OwnedStack($Evidence) {
    $actual = @(Invoke-LocalDocker @('ps','-aq','--no-trunc','--filter',"label=com.docker.compose.project=$project") | Sort-Object)
    if (($actual -join ',') -ne (@($Evidence.containers.Values.id | Sort-Object) -join ',')) { throw 'PROJECT_CONTAINER_SET_CHANGED' }
    foreach ($entry in $Evidence.resources) {
        $old = $entry.metadata
        if ($entry.kind -notin @('volume','network') -or $old.Name -notin @("$project-database","$project-media","$project-isolated","$project-frontend")) { throw 'UNEXPECTED_EVIDENCE_RESOURCE' }
        $r = Read-DockerObject @($entry.kind,'inspect',$old.Name)
        if (($r.Labels | ConvertTo-Json -Compress) -cne ($old.Labels | ConvertTo-Json -Compress) -or $r.Driver -ne $old.Driver) { throw 'RESOURCE_OWNERSHIP_MISMATCH' }
        if ($entry.kind -eq 'network') {
            if ($r.Id -ne $old.Id -or $r.Internal -ne $old.Internal) { throw 'NETWORK_REPLACED' }
            foreach ($member in $r.Containers.PSObject.Properties.Name) { if ($member -notin $Evidence.containers.Values.id) { throw 'UNKNOWN_NETWORK_MEMBER' } }
        } elseif ($r.CreatedAt -ne $old.CreatedAt -or $r.Mountpoint -ne $old.Mountpoint -or
                  ($r.Options | ConvertTo-Json -Compress) -cne ($old.Options | ConvertTo-Json -Compress)) { throw 'VOLUME_REPLACED' }
    }
    $result = @{}
    foreach ($name in $services) { $result[$name] = Assert-OwnedContainer $Evidence $name }
    return $result
}
function Wait-LocalHealth($Evidence, [string]$Name) {
    $deadline = [DateTime]::UtcNow.AddSeconds($HealthTimeoutSeconds)
    do {
        $r = Assert-OwnedContainer $Evidence $Name
        if ($r.State.Status -ne 'running') { throw ('SERVICE_NOT_RUNNING: ' + $Name) }
        if ($r.State.Health.Status -eq 'healthy') { return }
        if ($r.State.Health.Status -ne 'starting') { throw ('SERVICE_UNHEALTHY: ' + $Name) }
        Start-Sleep -Seconds 2
    } while ([DateTime]::UtcNow -lt $deadline)
    throw ('HEALTH_TIMEOUT: ' + $Name)
}
function Assert-FreeFrontendPort([string]$Name) {
    $port = if ($Name -eq 'customer-web') { 5280 } else { 5281 }
    $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop)
    if (@($listeners | Where-Object { $_.LocalPort -eq $port }).Count) { throw 'FRONTEND_PORT_IN_USE' }
}
function Invoke-StartExisting($Evidence) {
    $rows = Assert-OwnedStack $Evidence
    foreach ($name in $services) {
        if ($rows[$name].State.Status -notin @('running','created','exited')) { throw 'UNSUPPORTED_CONTAINER_STATE' }
        if ($name -in @('customer-web','admin-web') -and $rows[$name].State.Status -ne 'running') { Assert-FreeFrontendPort $name }
    }
    foreach ($name in $services) {
        $rows = Assert-OwnedStack $Evidence
        $r = $rows[$name]
        if ($r.State.Status -in @('created','exited')) { Invoke-LocalDocker @('start',$r.Id) | Out-Null }
        elseif ($r.State.Status -ne 'running') { throw 'CONTAINER_STATE_CHANGED' }
        Wait-LocalHealth $Evidence $name
        Write-Output ("$name HEALTHY")
    }
}
function Invoke-StopExisting($Evidence) {
    $rows = Assert-OwnedStack $Evidence
    foreach ($name in $services) { if ($rows[$name].State.Status -notin @('running','created','exited')) { throw 'UNSUPPORTED_CONTAINER_STATE' } }
    # Explicit local shutdown, NOT a drain certificate or a safe deployment gate.
    # Docker may SIGKILL after the deadline; never report that as graceful success.
    foreach ($name in @('customer-web','admin-web','backend','mongodb')) {
        $rows = Assert-OwnedStack $Evidence
        $r = $rows[$name]
        if ($r.State.Status -eq 'running') {
            $seconds = if ($name -in @('backend','mongodb')) { '120' } else { '30' }
            Invoke-LocalDocker @('stop','--timeout',$seconds,$r.Id) | Out-Null
            $r = Assert-OwnedContainer $Evidence $name
            if ($r.State.Status -ne 'exited' -or $r.State.OOMKilled -or $r.State.ExitCode -notin @(0,143)) { throw ('STOP_NOT_GRACEFUL: ' + $name) }
        } elseif ($r.State.Status -notin @('created','exited')) { throw 'CONTAINER_STATE_CHANGED' }
        Write-Output ("$name STOPPED (or already inactive)")
    }
}
function Protect-LogLine([string]$Line) {
    foreach ($pattern in @('(?i)mongodb(?:\+srv)?://\S+', '\bAIza[\w-]{25,}', '\bsk-[A-Za-z0-9_-]{20,}',
        '(?i)\bBearer\s+\S+', '\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',
        '(?i)["'']?(?:password|secret|token|api[_-]?key|authorization)[\w-]*["'']?\s*[:=]\s*("[^"]*"|''[^'']*''|\S+)')) {
        $Line = [regex]::Replace($Line,$pattern,'[REDACTED]')
    }
    return $Line
}

Assert-LocalPath $state
Assert-LocalEngine
# Same lock as Build/resume; open only, never create a missing evidence/lock file.
$lockPath = Join-Path (Split-Path $state) 'operation.lock'
Assert-LocalPath $lockPath
$lock = [IO.File]::Open($lockPath,'Open','ReadWrite','None')
try {
    $evidence = Read-AcceptedEvidence
    $rows = Assert-OwnedStack $evidence
    switch ($Action) {
        'Start' { Invoke-StartExisting $evidence }
        'Stop' { Invoke-StopExisting $evidence }
        'Status' {
            foreach ($name in $services) {
                $r = $rows[$name]
                $health = if ($r.State.Status -eq 'running') { $r.State.Health.Status } else { 'not-running' }
                $ports = if ($name -eq 'customer-web') { '127.0.0.1:5280 -> 8080' } elseif ($name -eq 'admin-web') { '127.0.0.1:5281 -> 8080' } else { 'no host port' }
                [pscustomobject]@{ Service=$name; ContainerId=$r.Id; ImageId=$r.Image; State=$r.State.Status; Health=$health; Ports=$ports }
            }
        }
        'Logs' {
            $selected = if ($Service -eq 'All') { $services } else { @($Service) }
            foreach ($name in $selected) {
                $r = Assert-OwnedContainer $evidence $name
                Write-Output ("--- $name (last $Tail lines; redacted) ---")
                Invoke-LocalDocker @('logs','--tail',[string]$Tail,$r.Id) | ForEach-Object { Protect-LogLine ([string]$_) }
            }
        }
    }
} finally { $lock.Dispose() }
