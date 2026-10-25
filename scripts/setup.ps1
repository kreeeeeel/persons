$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'
function New-Secret {
    $bytes = New-Object byte[] 48
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    [Convert]::ToBase64String($bytes)
}
if (Test-Path -LiteralPath $envPath) {
    $existing = [System.IO.File]::ReadAllLines($envPath)
    $newKeys = @('PROJECT_GATEWAY_JWT_SECRET', 'REDIS_PASSWORD')
    $missing = @($newKeys | Where-Object { -not ($existing -match "^$_=.+$") })
    if ($missing.Count -gt 0) {
        $preserved = @($existing | Where-Object {
            $line = $_
            -not ($missing | Where-Object { $line.StartsWith("$_=") })
        })
        $updates = @($missing | ForEach-Object { "$_=$(New-Secret)" })
        [System.IO.File]::WriteAllLines($envPath, $preserved + $updates, [System.Text.UTF8Encoding]::new($false))
        Write-Host 'Added missing gateway/cache credentials; existing settings were kept.'
    } else {
        Write-Host '.env already exists; existing settings were kept.'
    }
    exit 0
}
$settings = @(
    "DB_PASSWORD=$(New-Secret)",
    "MINIO_ROOT_USER=persons",
    "MINIO_ROOT_PASSWORD=$(New-Secret)",
    "ID_PEPPER=$(New-Secret)",
    "ID_JWT_SECRET=$(New-Secret)",
    "PROJECT_INTERNAL_JWT_SECRET=$(New-Secret)",
    "PROJECT_GATEWAY_JWT_SECRET=$(New-Secret)",
    "REDIS_PASSWORD=$(New-Secret)",
    'PERSONS_ADMIN_EMAIL=',
    'YANDEX_CLIENT_ID=',
    'YANDEX_CLIENT_SECRET=',
    'YANDEX_REDIRECT_URI=http://localhost:3000/api/oauth/yandex/callback',
    'PUBLIC_ID_URL=http://localhost:3000',
    'PUBLIC_ADMIN_URL=http://localhost:3001',
    'PUBLIC_PERSON_URL=http://localhost:3002',
    'SMTP_HOST=mailpit',
    'SMTP_PORT=1025',
    'SMTP_USER=',
    'SMTP_PASSWORD=',
    'SMTP_AUTH=false',
    'SMTP_STARTTLS=false',
    'SMTP_STARTTLS_REQUIRED=false',
    'MAIL_FROM=Персонажи <hello@persons.local>'
)
[System.IO.File]::WriteAllLines($envPath, $settings, [System.Text.UTF8Encoding]::new($false))
Write-Host 'Created .env with local credentials. Set PERSONS_ADMIN_EMAIL before registering the administrator.'
