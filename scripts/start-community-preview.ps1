param([switch]$Built, [switch]$EmptyStates)

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskLogs = Join-Path ([IO.Path]::GetTempPath()) 'persons-community-preview'
New-Item -ItemType Directory -Path $taskLogs -Force | Out-Null
$taskPorts = @(3000, 3001, 3002, 4310)
$taskBusy = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in $taskPorts }
if ($taskBusy) {
    throw 'Preview ports 3000, 3001, 3002 or 4310 are already in use. Existing processes were preserved.'
}
$taskNode = (Get-Command node).Source
& $taskNode (Join-Path $taskRoot 'frontend/person/tools/create-feed-preview-media.ts')
if ($LASTEXITCODE -ne 0) {
    throw 'Unable to create local feed review media.'
}
if ($Built) {
    @('id', 'person-admin', 'person') | ForEach-Object {
        $taskServerCheck = Join-Path $taskRoot "frontend/$_/.next/standalone/frontend/$_/server.js"
        if (-not (Test-Path -LiteralPath $taskServerCheck)) {
            throw "Build $_ before using -Built."
        }
    }
}
$taskProcesses = @()
$env:PREVIEW_EMPTY_CONTENT = "$($EmptyStates.IsPresent)".ToLowerInvariant()
$taskApi = Start-Process -FilePath $taskNode -ArgumentList @('tools/preview-api.ts') -WorkingDirectory (Join-Path $taskRoot 'frontend/person') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskLogs 'api.stdout.log') -RedirectStandardError (Join-Path $taskLogs 'api.stderr.log') -PassThru
$taskProcesses += @{ name = 'preview-api'; pid = $taskApi.Id; startedAt = $taskApi.StartTime.ToUniversalTime().ToString('o') }
$env:APP_ENV = 'dev'
$env:COMMUNITY_PREVIEW = 'true'
$env:ID_BASE_URL = 'http://localhost:4310'
$env:PERSON_BASE_URL = 'http://localhost:4310'
$env:DYNAMIC_PROPERTIES_BASE_URL = 'http://localhost:4310'
$env:I18N_BASE_URL = 'http://localhost:4310'
$env:ASSET_BASE_URL = 'http://localhost:4310/assets'
$env:ID_PUBLIC_URL = 'http://localhost:3000'
$env:ADMIN_PUBLIC_URL = 'http://localhost:3001'
$env:PERSON_PUBLIC_URL = 'http://localhost:3002'
$env:PROJECT_INTERNAL_JWT_SECRET = 'local-community-preview-secret-at-least-thirty-two-characters'
$env:HOSTNAME = '127.0.0.1'
@(@{ name = 'id'; port = 3000 }, @{ name = 'person-admin'; port = 3001 }, @{ name = 'person'; port = 3002 }) | ForEach-Object {
    $taskApp = $_
    $env:PUBLIC_URL = "http://localhost:$($taskApp.port)"
    $env:PORT = "$($taskApp.port)"
    $taskAppRoot = Join-Path $taskRoot "frontend/$($taskApp.name)"
    $taskArguments = @('tools/next.ts', 'dev', '--hostname', '127.0.0.1', '--port', "$($taskApp.port)")
    if ($Built) {
        $taskStandalone = Join-Path $taskAppRoot ".next/standalone/frontend/$($taskApp.name)"
        $taskServer = Join-Path $taskStandalone 'server.js'
        if (-not (Test-Path -LiteralPath $taskServer)) {
            throw "Build $($taskApp.name) before using -Built."
        }
        $taskStatic = Join-Path $taskStandalone '.next/static'
        New-Item -ItemType Directory -Force -Path $taskStatic | Out-Null
        Copy-Item -Path (Join-Path $taskAppRoot '.next/static/*') -Destination $taskStatic -Recurse -Force
        if (Test-Path -LiteralPath (Join-Path $taskAppRoot 'public')) {
            Copy-Item -LiteralPath (Join-Path $taskAppRoot 'public') -Destination $taskStandalone -Recurse -Force
        }
        $taskArguments = @($taskServer)
        [IO.File]::WriteAllText((Join-Path $taskAppRoot '.next/standalone/package.json'), '{"type":"commonjs"}')
    }
    $taskProcess = Start-Process -FilePath $taskNode -ArgumentList $taskArguments -WorkingDirectory $taskAppRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskLogs "$($taskApp.name).stdout.log") -RedirectStandardError (Join-Path $taskLogs "$($taskApp.name).stderr.log") -PassThru
    $taskProcesses += @{ name = $taskApp.name; pid = $taskProcess.Id; startedAt = $taskProcess.StartTime.ToUniversalTime().ToString('o') }
}
$taskProcesses | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskLogs 'processes.json')
Write-Output 'Preview: http://localhost:3002/ru/people'
Write-Output 'Feed: http://localhost:3002/ru/feed'
Write-Output 'Privacy: http://localhost:3002/ru/privacy'
Write-Output 'Terms: http://localhost:3002/ru/terms'
Write-Output 'Mock admin sign-in: http://localhost:4310/session'
Write-Output 'ID: http://localhost:3000/ru'
