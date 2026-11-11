[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ReleaseId)
. "$PSScriptRoot/Acceptance-Helpers.ps1"
Assert-LocalDocker
$release = Read-Release $ReleaseId
foreach ($image in $release.Manifest.images) {
    $service = switch ($image.service) { 'backend' { 'backend' }; 'customer' { 'customer-web' }; 'admin' { 'admin-web' }; default { throw 'UNKNOWN_SERVICE' } }
    $ids = @(Invoke-LocalCompose $release @('ps','-q',$service))
    if ($ids.Count -ne 1) { throw 'EXPECTED_ONE_RUNNING_SERVICE_INSTANCE' }
    if ((Invoke-Docker -DockerArgs @('inspect',$ids[0],'--format','{{.Image}}')) -ne $image.id) { throw 'RUNNING_RELEASE_IMAGE_MISMATCH' }
    if ($service -eq 'backend') { $backendId = [string]$ids[0] }
}
foreach ($port in @(5180,5181)) {
    foreach ($path in @('/','/login','/projects/s396-smoke-route','/local-ready','/api/health')) {
        $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port$path" -TimeoutSec 15
        if ($response.StatusCode -ne 200) { throw "SMOKE_HTTP_FAILED: $port $path" }
        if ($path -eq '/api/health') {
            $body = $response.Content | ConvertFrom-Json
            if (-not $body.success -or $body.data.database -ne 'connected') { throw 'DATABASE_NOT_READY' }
        } elseif ($path -ne '/local-ready' -and $response.Content -notmatch '<html') { throw 'SPA_FALLBACK_FAILED' }
    }
    try {
        Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/api/s396-missing-endpoint" -TimeoutSec 15 | Out-Null
        throw 'API_MUST_NOT_FALLBACK_TO_HTML'
    } catch {
        if (-not $_.Exception.Response -or [int]$_.Exception.Response.StatusCode -ne 404) { throw }
    }
    try {
        Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$port/api/admin/users" -TimeoutSec 15 | Out-Null
        throw 'ADMIN_MUST_REQUIRE_AUTH'
    } catch {
        if (-not $_.Exception.Response -or [int]$_.Exception.Response.StatusCode -ne 401) { throw }
    }
}
Invoke-LocalCompose $release @('exec','-T','backend','node','staging/healthcheck.mjs') | Out-Null
$js = 'const f=require("fs"),c=require("crypto"),p="/data/uploads/.s396-persistence-sentinel"; if(!f.existsSync(p))f.writeFileSync(p,"S396 local synthetic sentinel",{flag:"wx"}); console.log(c.createHash("sha256").update(f.readFileSync(p)).digest("hex"));'
$hash = Invoke-DockerInput @('exec','-i',$backendId,'node','--input-type=commonjs') $js
$expected = Get-TextHash 'S396 local synthetic sentinel'
if ($hash.Trim() -ne $expected) { throw 'PERSISTENCE_SENTINEL_MISMATCH' }
$release.Manifest.knownGood = $true
$release.Manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath (Join-Path $release.Directory 'manifest.json') -Encoding UTF8
Write-Output 'SMOKE PASS (HTTP, auth guard, runtime, storage sentinel). Restart/replacement persistence and rollback are not proven by this smoke alone.'
