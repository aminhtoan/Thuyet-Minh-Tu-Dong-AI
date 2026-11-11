[CmdletBinding()]
param()
. "$PSScriptRoot/Common.ps1"
$lock = Enter-LocalLock
try {
    Assert-LocalDocker
    Invoke-Docker -DockerArgs @('version','--format','{{.Server.Version}}') | Out-Null
    $head = (& git -C $script:RepoRoot rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'GIT_FAILED' }
    $status = @(& git -C $script:RepoRoot status --porcelain)
    $paths = @(& git -C $script:RepoRoot -c core.quotePath=false ls-files --cached --others --exclude-standard)
    if ($LASTEXITCODE -ne 0) { throw 'GIT_FILES_FAILED' }
    $work = Join-Path $script:StateRoot ('snapshot-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $work | Out-Null
    $rows = @()
    foreach ($path in ($paths | Sort-Object -Unique)) {
        if ($path -match '(^|/)(\.env[^/]*|node_modules|uploads|dist|build|\.git|\.state|scratch|cache|tmp)(/|$)' -or $path -match '\.(pem|key|pfx|p12|tsbuildinfo)$') { continue }
        $include = $path -match '^(frontend-web|admin-web)/(src/|public/|[^/]+\.(json|ts|js|mjs|html|css)$)' -or
            $path -match '^backend/(src/|staging/(runtime-checks|preflight|healthcheck)\.mjs$|Dockerfile$|\.dockerignore$|package(-lock)?\.json$|tsconfig\.json$)' -or
            $path -eq 'scripts/customer-design-sync.mjs' -or $path -eq 'design/customer/tokens.json' -or
            $path -eq 'frontend-mobile/src/theme/tokens.ts' -or $path -match '^infra/local-cd/[^/]+$'
        if (-not $include) { continue }
        $source = Join-Path $script:RepoRoot $path
        if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { continue }
        if ((Get-Item -LiteralPath $source).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'SOURCE_LINK_REJECTED' }
        $target = Join-Path $work $path
        New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
        Copy-Item -LiteralPath $source -Destination $target
        $rows += [ordered]@{path=$path;sha256=(Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()}
    }
    if ($rows.Count -eq 0) { throw 'EMPTY_SNAPSHOT' }
    $hash = Get-TextHash ($rows | ConvertTo-Json -Compress)
    $id = 'sha-' + $head.Substring(0,12) + '-' + $hash.Substring(0,12)
    $dir = Join-Path $script:StateRoot $id
    if (Test-Path -LiteralPath $dir) { throw 'RELEASE_EXISTS: retain existing manifest/images; no overwrite.' }
    New-Item -ItemType Directory -Path $dir | Out-Null
    Move-Item -LiteralPath $work -Destination (Join-Path $dir 'snapshot')
    $snapshot = Join-Path $dir 'snapshot'
    $images = @()
    foreach ($app in @('backend','customer','admin')) {
        $tag = 'narration-local-' + $app + ':' + $id
        if ($app -eq 'backend') {
            Invoke-Docker -DockerArgs @('build','--label',"org.opencontainers.image.revision=$head",'--label',"localcd.source.sha256=$hash",'-t',$tag,(Join-Path $snapshot 'backend'))
        } else {
            $folder = if ($app -eq 'customer') { 'frontend-web' } else { 'admin-web' }
            Invoke-Docker -DockerArgs @('build','--label',"org.opencontainers.image.revision=$head",'--label',"localcd.source.sha256=$hash",'--build-arg',"APP=$folder",'-f',(Join-Path $snapshot 'infra/local-cd/frontend.Dockerfile'),'-t',$tag,$snapshot)
        }
        $images += [ordered]@{service=$app;tag=$tag;id=(Invoke-Docker -DockerArgs @('image','inspect',$tag,'--format','{{.Id}}'))}
    }
    $manifest = [ordered]@{schema='S396_LOCAL_V1';releaseId=$id;head=$head;dirty=($status.Count -gt 0);gitStatus=$status;sourceHash=$hash;files=$rows;images=$images;knownGood=$false;createdUtc=[DateTime]::UtcNow.ToString('o')}
    $manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $dir 'manifest.json') -Encoding UTF8
    @("LOCALCD_BACKEND_IMAGE=$($images[0].tag)","LOCALCD_CUSTOMER_IMAGE=$($images[1].tag)","LOCALCD_ADMIN_IMAGE=$($images[2].tag)") | Set-Content -LiteralPath (Join-Path $dir 'images.properties') -Encoding ASCII
    Write-Output "BUILT $id; dirty=$($manifest.dirty). This is a local snapshot, not proof that this exact source passed GitHub CI."
} finally { $lock.Dispose() }
