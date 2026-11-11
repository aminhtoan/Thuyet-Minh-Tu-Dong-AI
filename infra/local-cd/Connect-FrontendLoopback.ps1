[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ReleaseId)
. "$PSScriptRoot/Acceptance-Helpers.ps1"
$lock = Enter-LocalLock
try {
    $release = Read-Release $ReleaseId
    $null = Assert-S396ExistingMongo $release
    $before = @()
    foreach ($service in @('backend','mongodb','customer-web','admin-web')) {
        $ids = @(Invoke-LocalCompose $release @('ps','-q',$service))
        if ($ids.Count -ne 1) { throw 'EXPECTED_ONE_EXISTING_HEALTHY_SERVICE' }
        $item = (Invoke-Docker -DockerArgs @('inspect',$ids[0]) | ConvertFrom-Json)[0]
        if ($item.State.Health.Status -ne 'healthy') { throw 'SERVICE_NOT_HEALTHY' }
        if ($service -ne 'mongodb') {
            $key = switch ($service) { 'backend' {'backend'}; 'customer-web' {'customer'}; 'admin-web' {'admin'} }
            $image = @($release.Manifest.images | Where-Object { $_.service -eq $key })
            if ($image.Count -ne 1 -or $item.Image -ne $image[0].id) { throw 'RELEASE_IMAGE_MISMATCH' }
        }
        $before += $item
    }
    foreach ($name in @('customer-web','admin-web')) {
        $item = @($before | Where-Object { $_.Config.Labels.'com.docker.compose.service' -eq $name })[0]
        $port = if ($name -eq 'customer-web') { '5180' } else { '5181' }
        $binding = @($item.HostConfig.PortBindings.'8080/tcp')
        if ($binding.Count -ne 1 -or $binding[0].HostIp -ne '127.0.0.1' -or $binding[0].HostPort -ne $port) { throw 'UNEXPECTED_PORT_BINDING' }
        $published = @($item.NetworkSettings.Ports.'8080/tcp')
        if (-not $published.Count -and (Get-NetTCPConnection -State Listen -LocalPort ([int]$port) -ErrorAction SilentlyContinue)) { throw 'HOST_PORT_CONFLICT' }
    }
    $baselineFile = Join-Path $release.Directory 'loopback-before.json'
    if (Test-Path -LiteralPath $baselineFile) { throw 'LOOPBACK_ACCEPTANCE_ALREADY_STARTED: inspect existing evidence before retry.' }
    $before | Select-Object Id,Image,State,Mounts,NetworkSettings | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $baselineFile -Encoding UTF8
    $existing = @(Invoke-Docker -DockerArgs @('network','ls','--format','{{.Name}}'))
    if ('narration-s396-frontend' -in $existing) { throw 'FRONTEND_NETWORK_ALREADY_EXISTS: requires separate inspection.' }
    $networkId = Invoke-Docker -DockerArgs @('network','create','--driver','bridge','--label','localcd.scope=S396','--label','localcd.role=frontend','narration-s396-frontend')
    foreach ($name in @('customer-web','admin-web')) {
        $item = @($before | Where-Object { $_.Config.Labels.'com.docker.compose.service' -eq $name })[0]
        # Do not recreate/delete containers or touch backend/database. Docker can
        # activate the existing loopback bindings on attaching a bridge endpoint.
        Invoke-Docker -DockerArgs @('network','connect','narration-s396-frontend',$item.Id)
    }
    foreach ($item in $before) {
        $after = (Invoke-Docker -DockerArgs @('inspect',$item.Id) | ConvertFrom-Json)[0]
        if ($after.Id -ne $item.Id -or $after.Image -ne $item.Image -or $after.State.StartedAt -ne $item.State.StartedAt) { throw 'CONTAINER_CHANGED_UNEXPECTEDLY' }
        if (($after.Mounts | ConvertTo-Json -Depth 10 -Compress) -ne ($item.Mounts | ConvertTo-Json -Depth 10 -Compress)) { throw 'MOUNTS_CHANGED_UNEXPECTEDLY' }
    }
    [ordered]@{releaseId=$ReleaseId;networkId=$networkId;method='connect-existing-frontends-only';utc=[DateTime]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $release.Directory 'loopback-topology.json') -Encoding UTF8
    Write-Output 'Frontend bridge attached; no container restarted/recreated. HTTP acceptance must follow.'
} finally { $lock.Dispose() }
