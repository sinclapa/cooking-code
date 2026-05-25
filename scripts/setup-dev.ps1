<#
.SYNOPSIS
  One-time setup for the local dev environment.
.DESCRIPTION
  Installs npm dependencies, scaffolds config files, and downloads func.exe.
  Safe to re-run — all steps are idempotent.
  After this completes, use start-dev.ps1 / stop-dev.ps1 for daily work.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root    = Split-Path $PSScriptRoot -Parent
$funcExe = "$env:USERPROFILE\.swa\core-tools\v4\func.exe"

Write-Host ""
Write-Host "  Setting up local dev environment..." -ForegroundColor Cyan
Write-Host ""

# ── 1. Root npm install ───────────────────────────────────────────────────────
Write-Host "  [1/6] Installing root dependencies..." -NoNewline
Push-Location $root
npm install --silent
Pop-Location
Write-Host " done" -ForegroundColor Green

# ── 2. API npm install ────────────────────────────────────────────────────────
Write-Host "  [2/6] Installing API dependencies..." -NoNewline
Push-Location (Join-Path $root "api")
npm install --silent
Pop-Location
Write-Host " done" -ForegroundColor Green

# ── 3. .env ───────────────────────────────────────────────────────────────────
Write-Host "  [3/6] .env..." -NoNewline
$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Write-Host " already exists — skipping" -ForegroundColor DarkGray
} else {
  Copy-Item (Join-Path $root ".env.example") $envFile
  Write-Host " created from .env.example" -ForegroundColor Green
}

# ── 4. api/local.settings.json ────────────────────────────────────────────────
Write-Host "  [4/6] api/local.settings.json..." -NoNewline
$localSettings = Join-Path $root "api\local.settings.json"
if (Test-Path $localSettings) {
  Write-Host " already exists — skipping" -ForegroundColor DarkGray
} else {
  @{
    IsEncrypted = $false
    Values      = [ordered]@{
      AzureWebJobsStorage            = "UseDevelopmentStorage=true"
      FUNCTIONS_WORKER_RUNTIME       = "node"
      AZURE_STORAGE_CONNECTION_STRING = "UseDevelopmentStorage=true"
      TABLE_ENV                      = "local"
    }
  } | ConvertTo-Json | Set-Content $localSettings
  Write-Host " created" -ForegroundColor Green
}

# ── 5. .azurite directory ─────────────────────────────────────────────────────
Write-Host "  [5/6] .azurite directory..." -NoNewline
New-Item -ItemType Directory -Force (Join-Path $root ".azurite") | Out-Null
Write-Host " ready" -ForegroundColor Green

# ── 6. Download func.exe via SWA CLI ─────────────────────────────────────────
Write-Host "  [6/6] func.exe..." -NoNewline
if (Test-Path $funcExe) {
  Write-Host " already present — skipping" -ForegroundColor DarkGray
} else {
  Write-Host " downloading (this takes a minute)..." -NoNewline
  $swaLog = Join-Path $root ".dev-logs\swa-setup.log"
  New-Item -ItemType Directory -Force (Split-Path $swaLog) | Out-Null
  $proc = Start-Process -PassThru -WindowStyle Hidden `
    -FilePath "pwsh" `
    -ArgumentList "-NonInteractive", "-NoProfile", "-Command",
      "npx --yes @azure/static-web-apps-cli start --api-location api" `
    -WorkingDirectory $root `
    -RedirectStandardOutput $swaLog `
    -RedirectStandardError  "$swaLog.err"

  $deadline = (Get-Date).AddSeconds(120)
  while ((Get-Date) -lt $deadline) {
    if (Test-Path $funcExe) { break }
    Start-Sleep -Milliseconds 500
  }
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue

  if (Test-Path $funcExe) {
    Write-Host " done" -ForegroundColor Green
  } else {
    Write-Host " FAILED" -ForegroundColor Red
    Write-Host "        func.exe not found after 120s. Check .dev-logs\swa-setup.log" -ForegroundColor DarkGray
    exit 1
  }
}

Write-Host ""
Write-Host "  Setup complete. Run .\scripts\start-dev.ps1 to start." -ForegroundColor Green
Write-Host ""
