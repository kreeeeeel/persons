$ErrorActionPreference = 'Stop'
$taskState = Join-Path ([IO.Path]::GetTempPath()) 'persons-community-preview/processes.json'
if (-not (Test-Path -LiteralPath $taskState)) {
    Write-Output 'No saved preview processes.'
    return
}
Get-Content -LiteralPath $taskState -Raw | ConvertFrom-Json | ForEach-Object {
    $taskRecord = $_
    $taskProcess = Get-Process -Id $taskRecord.pid -ErrorAction SilentlyContinue
    $taskExpectedStart = ([datetime]$taskRecord.startedAt).ToUniversalTime()
    if ($taskProcess -and $taskProcess.ProcessName -eq 'node' -and $taskProcess.StartTime.ToUniversalTime() -eq $taskExpectedStart) {
        & taskkill.exe /PID $taskProcess.Id /T /F
        if ($LASTEXITCODE -ne 0) {
            throw "Unable to stop preview process $($taskRecord.name)."
        }
    }
}
