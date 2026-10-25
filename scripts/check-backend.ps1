$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
& node (Join-Path $PSScriptRoot 'check-persistence.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Persistence conventions check failed' }
$projects = @('id', 'mail', 'i18n', 'person', 'restrictions', 'gateway', 'person-worker', 'libs/id-context', 'libs/request-observability', 'libs/dynamic-properties', 'libs/dotabuff-integration', 'libs/lettify-integration')
foreach ($project in $projects) {
    Push-Location (Join-Path $projectRoot "backend/$project")
    try {
        & ./gradlew.bat --no-daemon --max-workers=2 build
        if ($LASTEXITCODE -ne 0) { throw "Build failed: $project" }
    } finally {
        Pop-Location
    }
}
