# Only stubs are used below. No Docker process, database or deployment runs.
. "$PSScriptRoot/Common.ps1"
$script:FoundBackend = $false
$script:ActiveJobCount = 0
$script:Captured = @()
function Invoke-Docker {
    param([string[]]$DockerArgs)
    $script:Captured = $DockerArgs
    if ($DockerArgs[0] -eq 'ps') { if ($script:FoundBackend) { return 'synthetic-container-id' }; return }
    return 'MOCK_ONLY'
}
function Assert-Throws([scriptblock]$Action, [string]$Pattern) {
    $caught = $false
    try { & $Action } catch { if ($_.Exception.Message -notmatch $Pattern) { throw }; $caught = $true }
    if (-not $caught) { throw 'EXPECTED_GUARD_DID_NOT_BLOCK' }
}
$script:Fixture = Join-Path $PSScriptRoot ('.state/guard-test-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $script:Fixture | Out-Null
try {
    $r = @{Directory=$script:Fixture;Manifest=@{images=@(@{tag='b:test'},@{tag='c:test'},@{tag='a:test'})}}
    $envFile = Join-Path $script:Fixture 'images.properties'
    @('LOCALCD_BACKEND_IMAGE=b:test','LOCALCD_CUSTOMER_IMAGE=c:test','LOCALCD_ADMIN_IMAGE=a:test') | Set-Content -LiteralPath $envFile -Encoding ASCII
    $null = Invoke-LocalCompose $r @('config','--quiet')
    if ($script:Captured[0] -ne 'compose' -or $script:Captured[-1] -ne '--quiet') { throw 'ARGUMENT_ARRAY_CORRUPTED' }
    'LOCALCD_BACKEND_IMAGE=unexpected' | Set-Content -LiteralPath $envFile -Encoding ASCII
    Assert-Throws { Invoke-LocalCompose $r @('up') } 'IMAGE_ENV_FILE_MISMATCH'
    function Invoke-LocalCompose($Release,[string[]]$ComposeArgs) { return [string]$script:ActiveJobCount }
    Assert-QuiescentOrFresh $r
    $script:FoundBackend = $true
    Assert-Throws { Assert-QuiescentOrFresh $r } 'RAM draft/admission state'
    $script:ActiveJobCount = 1
    Assert-Throws { Assert-QuiescentOrFresh $r } 'QUEUED/PROCESSING'
    if ((Get-TextHash 'abc') -ne 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') { throw 'HASH_INVALID' }
    Write-Output 'PASS: argument arrays, image-tag binding, cold-only gate, RAM-draft fail-closed, active-job block and SHA256 (all Docker/DB mocked).'
} finally {
    Remove-Item -LiteralPath (Join-Path $script:Fixture 'images.properties')
    # Nonrecursive: removes only the empty test directory created above.
    [IO.Directory]::Delete($script:Fixture,$false)
}
