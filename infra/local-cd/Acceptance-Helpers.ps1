. "$PSScriptRoot/Common.ps1"
function Invoke-DockerInput([string[]]$DockerArgs, [string]$InputText) {
    # Windows PowerShell 5.1 legacy native argument passing strips embedded JS
    # quotes. Send program text over stdin instead; arguments contain no JS.
    $encoded = foreach ($arg in $DockerArgs) {
        '"' + ([regex]::Replace([regex]::Replace($arg,'(\\*)"','$1$1\"'),'(\\+)$','$1$1')) + '"'
    }
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = (Get-Command docker -ErrorAction Stop).Source
    $info.Arguments = $encoded -join ' '
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $info
    try {
        if (-not $process.Start()) { throw 'DOCKER_INPUT_START_FAILED' }
        $out = $process.StandardOutput.ReadToEndAsync()
        $err = $process.StandardError.ReadToEndAsync()
        $process.StandardInput.Write($InputText)
        $process.StandardInput.Close()
        if (-not $process.WaitForExit(60000)) { $process.Kill(); throw 'DOCKER_INPUT_TIMEOUT' }
        if ($process.ExitCode -ne 0) { throw ('DOCKER_INPUT_FAILED: ' + $err.Result + $out.Result) }
        return $out.Result
    } finally { $process.Dispose() }
}
function Assert-S396ExistingMongo($Release) {
    Assert-LocalDocker
    $ids = @(Invoke-LocalCompose $Release @('ps','-q','mongodb'))
    if ($ids.Count -ne 1) { throw 'EXPECTED_EXISTING_S396_MONGO' }
    $mongo = (Invoke-Docker -DockerArgs @('inspect',$ids[0]) | ConvertFrom-Json)[0]
    if ($mongo.Config.Image -ne 'mongo:8.0.17' -or $mongo.State.Health.Status -ne 'healthy') { throw 'MONGO_IDENTITY_OR_HEALTH_INVALID' }
    if ($mongo.Config.Labels.'com.docker.compose.project' -ne 'narration-s396-local') { throw 'MONGO_PROJECT_INVALID' }
    $net = (Invoke-Docker -DockerArgs @('network','inspect','narration-s396-isolated') | ConvertFrom-Json)[0]
    if (-not $net.Internal -or @($mongo.NetworkSettings.Networks.PSObject.Properties).Count -ne 1 -or -not $mongo.NetworkSettings.Networks.PSObject.Properties['narration-s396-isolated']) { throw 'NETWORK_ISOLATION_INVALID' }
    $mount = @($mongo.Mounts | Where-Object { $_.Destination -eq '/data/db' })
    if ($mount.Count -ne 1 -or $mount[0].Name -ne 'narration-s396-database') { throw 'MONGO_VOLUME_INVALID' }
    foreach ($name in @('narration-s396-database','narration-s396-media')) {
        $v = (Invoke-Docker -DockerArgs @('volume','inspect',$name) | ConvertFrom-Json)[0]
        if ($v.Labels.'localcd.scope' -ne 'S396') { throw 'VOLUME_SCOPE_INVALID' }
    }
    return [string]$ids[0]
}
