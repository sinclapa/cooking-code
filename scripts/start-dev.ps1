<#
.SYNOPSIS
  Start the full local dev stack: Azurite, Azure Functions host, Astro dev server, and SWA proxy.
.DESCRIPTION
  Launches all services hidden in the background, waits for each to be ready, then opens
  the app in the browser. Run stop-dev.ps1 to shut everything down.
  Logs are written to .dev-logs/.
#>
param(
  [string]$OpenPath = "/blog/getting-started-with-claude"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root    = Split-Path $PSScriptRoot -Parent
$pidFile = Join-Path $root ".dev-pids"
$logDir  = Join-Path $root ".dev-logs"
$funcExe = "$env:USERPROFILE\.swa\core-tools\v4\func.exe"

# ── Guard: already running ────────────────────────────────────────────────────
if (Test-Path $pidFile) {
  Write-Host "Dev environment may already be running. Run .\scripts\stop-dev.ps1 first." -ForegroundColor Yellow
  exit 1
}

# ── Helpers ───────────────────────────────────────────────────────────────────
# Wait for a pattern in either the .log or .err file for a service.
function Wait-Log([string]$LogFile, [string]$Pattern, [int]$TimeoutSec = 40) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $errFile = [System.IO.Path]::ChangeExtension($LogFile, '.err')
  while ((Get-Date) -lt $deadline) {
    foreach ($f in @($LogFile, $errFile)) {
      if ((Test-Path $f) -and (Get-Content $f -Raw -ErrorAction SilentlyContinue) -match [regex]::Escape($Pattern)) {
        return $true
      }
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

# Starts a command in a hidden pwsh window and returns the spawned process.
# Clears stale .log/.err files first so Wait-Log only sees fresh output.
function Start-BgProcess([string]$Name, [string]$Command, [string]$WorkDir) {
  $stdOut = Join-Path $logDir "$Name.log"
  $stdErr = Join-Path $logDir "$Name.err"
  Remove-Item $stdOut, $stdErr -ErrorAction SilentlyContinue
  $proc = Start-Process -PassThru -WindowStyle Hidden `
    -FilePath "pwsh" `
    -ArgumentList "-NonInteractive", "-NoProfile", "-Command", $Command `
    -WorkingDirectory $WorkDir `
    -RedirectStandardOutput $stdOut `
    -RedirectStandardError  $stdErr
  return $proc
}

# ── Setup ─────────────────────────────────────────────────────────────────────
New-Item -ItemType Directory -Force $logDir                      | Out-Null
New-Item -ItemType Directory -Force (Join-Path $root ".azurite") | Out-Null

# ── Pre-flight: func.exe ──────────────────────────────────────────────────────
if (-not (Test-Path $funcExe)) {
  Write-Host ""
  Write-Host "  func.exe not found. Run this once to download it:" -ForegroundColor Yellow
  Write-Host "    npx swa start --api-location api" -ForegroundColor Cyan
  Write-Host "  Press Ctrl+C once it starts, then re-run this script." -ForegroundColor Yellow
  Write-Host ""
  exit 1
}

$pids = @{}

Write-Host ""
Write-Host "  Starting local dev environment..." -ForegroundColor Cyan
Write-Host ""

# ── Clear any stale processes on required ports ───────────────────────────────
foreach ($port in @(10000, 4321, 7071, 4280)) {
  Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}
Start-Sleep -Milliseconds 500

# ── 1. Azurite ────────────────────────────────────────────────────────────────
Write-Host "  [1/5] Azurite..." -NoNewline
$p = Start-BgProcess "azurite" "npx azurite --location .azurite" $root
$pids["azurite"] = $p.Id
if (-not (Wait-Log (Join-Path $logDir "azurite.log") "successfully listening" 30)) {
  Write-Host " FAILED" -ForegroundColor Red
  Write-Host "        See: $logDir\azurite.err" -ForegroundColor DarkGray
  exit 1
}
Write-Host " ready  [:10000]" -ForegroundColor Green

# ── 2. Build API ──────────────────────────────────────────────────────────────
Write-Host "  [2/5] Building API..." -NoNewline
Push-Location (Join-Path $root "api")
npm run build 2>&1 | Out-Null
Pop-Location
Write-Host " done" -ForegroundColor Green

# ── 3. Astro dev server ───────────────────────────────────────────────────────
Write-Host "  [3/5] Astro dev server..." -NoNewline
$p = Start-BgProcess "astro" "npm run dev" $root
$pids["astro"] = $p.Id
if (-not (Wait-Log (Join-Path $logDir "astro.log") "watching for file changes" 60)) {
  Write-Host " FAILED" -ForegroundColor Red
  Write-Host "        See: $logDir\astro.err" -ForegroundColor DarkGray
  exit 1
}
Write-Host " ready  [:4321]" -ForegroundColor Green

# ── 4. Azure Functions host ───────────────────────────────────────────────────
Write-Host "  [4/5] Azure Functions host..." -NoNewline
$funcCmd = "& '$funcExe' start --javascript"
$p = Start-BgProcess "func" $funcCmd (Join-Path $root "api")
$pids["func"] = $p.Id
if (-not (Wait-Log (Join-Path $logDir "func.log") "localhost:7071" 40)) {
  Write-Host " FAILED" -ForegroundColor Red
  Write-Host "        See: $logDir\func.err" -ForegroundColor DarkGray
  exit 1
}
Write-Host " ready  [:7071]" -ForegroundColor Green

# ── 5. SWA proxy ─────────────────────────────────────────────────────────────
Write-Host "  [5/5] SWA emulator..." -NoNewline
$swaCmd = "npx swa start http://localhost:4321 --api-devserver-url http://localhost:7071"
$p = Start-BgProcess "swa" $swaCmd $root
$pids["swa"] = $p.Id
if (-not (Wait-Log (Join-Path $logDir "swa.log") "emulator started at" 40)) {
  Write-Host " FAILED" -ForegroundColor Red
  Write-Host "        See: $logDir\swa.err" -ForegroundColor DarkGray
  exit 1
}
Write-Host " ready  [:4280]" -ForegroundColor Green

# ── Save PIDs ─────────────────────────────────────────────────────────────────
$pids | ConvertTo-Json | Set-Content $pidFile

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  All services running!" -ForegroundColor Green
Write-Host ""
Write-Host "  App   http://localhost:4280" -ForegroundColor Cyan
Write-Host "  API   http://localhost:7071/api/feedback" -ForegroundColor Cyan
Write-Host "  Logs  $logDir" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Run .\scripts\stop-dev.ps1 to stop everything." -ForegroundColor DarkGray
Write-Host ""

Start-Process "http://localhost:4280$OpenPath"
