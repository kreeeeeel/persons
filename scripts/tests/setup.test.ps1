$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$testRoot = Join-Path $repositoryRoot ('.build/setup-test-' + [Guid]::NewGuid().ToString('N'))
$scriptDirectory = Join-Path $testRoot 'scripts'
$runtime = (Get-Process -Id $PID).Path
$fixture = Join-Path $testRoot '.env'
New-Item -ItemType Directory -Path $scriptDirectory -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $repositoryRoot 'scripts/setup.ps1') -Destination $scriptDirectory

function Invoke-Setup {
    & $runtime -NoProfile -File (Join-Path $scriptDirectory 'setup.ps1')
    if ($LASTEXITCODE -ne 0) { throw 'Setup failed.' }
}

function Assert-NewSettings {
    $lines = [System.IO.File]::ReadAllLines($fixture)
    @('PROJECT_GATEWAY_JWT_SECRET', 'REDIS_PASSWORD') | ForEach-Object {
        $key = $_
        $entries = @($lines | Where-Object { $_.StartsWith("$key=") })
        if ($entries.Count -ne 1 -or $entries[0].Substring($key.Length + 1).Length -lt 32) {
            throw "Missing, short or duplicate setting: $key"
        }
    }
}

try {
    $original = @('DB_PASSWORD=keep-this-value', 'SMTP_PASSWORD="preserve = and spaces"', 'PROJECT_GATEWAY_JWT_SECRET=')
    [System.IO.File]::WriteAllLines($fixture, $original)
    Invoke-Setup
    Assert-NewSettings
    $updated = [System.IO.File]::ReadAllLines($fixture)
    if ($updated -notcontains $original[0] -or $updated -notcontains $original[1]) {
        throw 'Setup replaced an existing credential.'
    }
    $firstHash = (Get-FileHash -LiteralPath $fixture).Hash
    Invoke-Setup
    if ((Get-FileHash -LiteralPath $fixture).Hash -ne $firstHash) { throw 'Repeated setup changed credentials.' }
    Remove-Item -LiteralPath $fixture
    Invoke-Setup
    Assert-NewSettings
    Write-Output 'setup: existing credentials, empty-key replacement, idempotency and fresh bootstrap passed.'
} finally {
    if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture }
    Remove-Item -LiteralPath (Join-Path $scriptDirectory 'setup.ps1')
    Remove-Item -LiteralPath $scriptDirectory
    Remove-Item -LiteralPath $testRoot
}
