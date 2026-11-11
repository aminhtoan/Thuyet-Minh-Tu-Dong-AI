[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ManifestFile,
      [Parameter(Mandatory=$true)][string]$CertificateFile)
. "$PSScriptRoot/Backend-SafetyGate.ps1"
$lock=Enter-LocalLock
$journal=$null
$journalFile=$null
try {
    Assert-LocalDocker
    $manifest=Get-Content -LiteralPath $ManifestFile -Raw|ConvertFrom-Json
    if($manifest.schema -ne 'S396_BACKEND_GATE_MANIFEST_V1' -or $manifest.project -ne 'narration-s396-drain-b3') {throw 'WRONG_GATE_MANIFEST_SCOPE'}
    $manifestHash=(Get-FileHash -LiteralPath $ManifestFile -Algorithm SHA256).Hash
    $certificateHash=(Get-FileHash -LiteralPath $CertificateFile -Algorithm SHA256).Hash
    $dir=Join-Path $script:StateRoot 'backend-gate-journals'
    New-Item -ItemType Directory -Force -Path $dir|Out-Null
    foreach($file in Get-ChildItem -LiteralPath $dir -Filter '*.json') {
        $prior=Get-Content -LiteralPath $file.FullName -Raw|ConvertFrom-Json
        # A failed/unfinished gate requires investigation; it is never resumed.
        if($prior.schema -ne 'S396_BACKEND_GATE_V1' -or $prior.state -ne 'BLOCKED_NO_FENCE' -or ($prior.events -join ',') -ne 'PREPARED,FIRST_VERIFIED,SECOND_VERIFIED,BLOCKED_NO_FENCE') {throw 'PRIOR_GATE_JOURNAL_INCOMPLETE'}
        if($prior.certificateHash -eq $certificateHash){throw 'CERTIFICATE_REUSE'}
    }
    $journal=[ordered]@{schema='S396_BACKEND_GATE_V1';operationId=[guid]::NewGuid().ToString('N');state='PREPARED';events=@('PREPARED');containerId=$manifest.containerId;imageId=$manifest.imageId;startedAt=$manifest.startedAt;manifestHash=$manifestHash;certificateHash=$certificateHash;replacementAllowed=$false;failure='';updatedUtc=''}
    $journalFile=Join-Path $dir ($journal.operationId+'.json')
    $persist={param($j) $j.updatedUtc=[DateTime]::UtcNow.ToString('o');$bytes=[Text.Encoding]::UTF8.GetBytes(($j|ConvertTo-Json -Depth 8));$stream=[IO.File]::Open($journalFile,'Create','Write','None');try{$stream.Write($bytes,0,$bytes.Length);$stream.Flush($true)}finally{$stream.Dispose()}}
    $verify={
        if((Get-FileHash -LiteralPath $ManifestFile -Algorithm SHA256).Hash -ne $manifestHash -or (Get-FileHash -LiteralPath $CertificateFile -Algorithm SHA256).Hash -ne $certificateHash){throw 'INPUT_CHANGED'}
        & "$PSScriptRoot/Test-DrainConsumer.ps1" -ContainerId $manifest.containerId -ExpectedImageId $manifest.imageId -ExpectedStartedAt $manifest.startedAt -CertificateFile $CertificateFile -RequireFence
    }
    Invoke-BackendGateChecks -Journal $journal -Verify $verify -Persist $persist|ConvertTo-Json -Compress
} catch {
    if($journal -and $journalFile){$journal.state='FAILED';$journal.failure='GATE_VALIDATION_FAILED';$journal.events+='FAILED';& $persist $journal}
    throw
} finally {$lock.Dispose()}
