[CmdletBinding()]
param()
. "$PSScriptRoot/Common.ps1"
foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1') {
    $tokens = $null; $parseErrors = $null
    [System.Management.Automation.Language.Parser]::ParseFile($file.FullName,[ref]$tokens,[ref]$parseErrors) | Out-Null
    if ($parseErrors.Count) { throw "POWERSHELL_SYNTAX: $($file.Name)" }
}
# Config rendering only: never creates networks, images, containers or volumes.
$json = Invoke-Docker -DockerArgs @('compose','--env-file','NUL','-f',(Join-Path $PSScriptRoot 'compose.yaml'),'config','--format','json')
$config = ($json -join "`n") | ConvertFrom-Json
if (@($config.services.PSObject.Properties).Count -ne 4) { throw 'EXPECTED_FOUR_SERVICES' }
if (-not $config.networks.isolated.internal) { throw 'NETWORK_MUST_BE_INTERNAL' }
if ($config.networks.frontend.driver -ne 'bridge') { throw 'FRONTEND_BRIDGE_REQUIRED' }
foreach ($name in @('backend','mongodb')) {
    $nets = @($config.services.$name.networks.PSObject.Properties.Name)
    if ($nets.Count -ne 1 -or $nets[0] -ne 'isolated') { throw 'PRIVATE_SERVICE_EXTERNAL_NETWORK' }
}
foreach ($name in @('backend','mongodb')) {
    if ($config.services.$name.PSObject.Properties['ports']) { throw 'PRIVATE_SERVICE_PUBLISHES_PORT' }
}
foreach ($pair in @(@('customer-web',5180),@('admin-web',5181))) {
    $ports = @($config.services.($pair[0]).ports)
    if ($ports.Count -ne 1 -or $ports[0].host_ip -ne '127.0.0.1' -or [int]$ports[0].published -ne $pair[1]) { throw 'PORT_SCOPE_INVALID' }
}
foreach ($v in @('database','media')) {
    if (-not $config.volumes.$v.external -or $config.volumes.$v.name -notlike 'narration-s396-*') { throw 'VOLUME_SCOPE_INVALID' }
}
if ($config.services.backend.environment.MONGODB_URI -ne 'mongodb://mongodb:27017/s396_local_cd?replicaSet=s396rs') { throw 'MONGODB_ISOLATION_INVALID' }
foreach ($key in @('GEMINI_API_KEY','GOOGLE_API_KEY','OPENAI_API_KEY')) {
    if ($config.services.backend.environment.$key -ne '') { throw 'REAL_API_KEY_FORBIDDEN' }
}
$nginx = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'nginx.conf') -Raw
if (($nginx.ToCharArray() | Where-Object { $_ -eq '{' }).Count -ne ($nginx.ToCharArray() | Where-Object { $_ -eq '}' }).Count) { throw 'NGINX_UNBALANCED_BLOCKS' }
if ($nginx -notmatch 'location \^~ /api/' -or $nginx -notmatch 'proxy_intercept_errors off;' -or $nginx -notmatch 'try_files \$uri \$uri/ /index.html;') { throw 'NGINX_ROUTING_CONTRACT_INVALID' }
$dockerfile = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'frontend.Dockerfile') -Raw
foreach ($required in @('node:22.23.3-bookworm-slim','npm ci','VITE_API_BASE_URL=/api','frontend-mobile/src/theme/tokens.ts','nginx.conf')) {
    if (-not $dockerfile.Contains($required)) { throw "FRONTEND_BUILD_INPUT_MISSING: $required" }
}
$ignore = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'frontend.Dockerfile.dockerignore') -Raw
foreach ($excluded in @('**/.env','**/.env.*','**/node_modules/**','**/uploads/**')) {
    if (-not $ignore.Contains($excluded)) { throw 'BUILD_EXCLUSIONS_MISSING' }
}
Write-Output 'PASS: PowerShell AST, Compose schema/ports/network/volumes/synthetic config, static Dockerfile/Nginx routing checks.'
Write-Output 'NOT RUN: image build, nginx -t, replica-set initialization, container startup, smoke, persistence and rollback.'
