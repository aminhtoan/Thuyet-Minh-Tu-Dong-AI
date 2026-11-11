[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ReleaseId,
      [Parameter(Mandatory=$true)][ValidateSet('customer-web','admin-web')][string]$Service,
      [ValidateSet('Good','Bad')][string]$Kind='Good')
. "$PSScriptRoot/Frontend-Operations.ps1"
$lock = Enter-LocalLock
try {
    Assert-LocalDocker
    $release = Read-Release $ReleaseId
    $current = Get-S396Running $Service
    $key = if ($Service -eq 'customer-web') { 'customer' } else { 'admin' }
    $base = @($release.Manifest.images | Where-Object {$_.service -eq $key})[0]
    if ($current.Image -ne $base.id) { throw 'SYNTHETIC_BUILD_REQUIRES_ORIGINAL_RELEASE' }
    $id = [Guid]::NewGuid().ToString('N')
    $dir = Join-Path $script:StateRoot "candidates/$id"
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    $dockerfile = @(('FROM ' + $base.tag), ('LABEL localcd.synthetic.base="' + $base.id + '"'), ('LABEL localcd.synthetic.operation="' + $id + '"'))
    if ($Kind -eq 'Bad') {
        # Deliberately healthy process with a broken HTTP contract, no app/UI change.
        'server { listen 8080; location / { return 503; } }' | Set-Content -LiteralPath (Join-Path $dir 'broken.conf') -Encoding ASCII
        $dockerfile += @('COPY broken.conf /etc/nginx/conf.d/default.conf','HEALTHCHECK --interval=2s --timeout=2s CMD true')
    }
    $dockerfile | Set-Content -LiteralPath (Join-Path $dir 'Dockerfile') -Encoding ASCII
    $tag = 'narration-s396-synthetic-' + $key + ':' + $id
    Invoke-Docker -DockerArgs @('build','--network=none','-t',$tag,$dir)
    if ((Invoke-Docker -DockerArgs @('image','inspect',$base.tag,'--format','{{.Id}}')) -ne $base.id) { throw 'BASE_TAG_CHANGED_DURING_BUILD' }
    $imageId = Invoke-Docker -DockerArgs @('image','inspect',$tag,'--format','{{.Id}}')
    $backend = @($release.Manifest.images | Where-Object {$_.service -eq 'backend'})[0]
    [ordered]@{schema='S396_FRONTEND_CANDIDATE_V1';releaseId=$ReleaseId;service=$Service;kind=$Kind;compatibility='SYNTHETIC_CONFIG_ONLY_V1';baseImageId=$base.id;backendImageId=$backend.id;imageId=$imageId;tag=$tag;dockerfileHash=(Get-FileHash -LiteralPath (Join-Path $dir 'Dockerfile') -Algorithm SHA256).Hash} |
        ConvertTo-Json | Set-Content -LiteralPath (Join-Path $dir 'manifest.json') -Encoding UTF8
    Write-Output "CANDIDATE_MANIFEST=$(Join-Path $dir 'manifest.json')"
} finally { $lock.Dispose() }
