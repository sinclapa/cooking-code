<#
.SYNOPSIS
  Stop all local dev services started by start-dev.ps1.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "SilentlyContinue"

$root    = Split-Path $PSScriptRoot -Parent
$pidFile = Join-Path $root ".dev-pids"

Write-Host ""
Write-Host "  Stopping local dev environment..." -ForegroundColor Cyan
Write-Host ""

# ── Kill saved pwsh wrapper processes and their trees ─────────────────────────
if (Test-Path $pidFile) {
  $saved = Get-Content $pidFile | ConvertFrom-Json
  foreach ($entry in $saved.PSObject.Properties) {
    $wrapperPid = [int]$entry.Value
    if (Get-Process -Id $wrapperPid -ErrorAction SilentlyContinue) {
      taskkill /PID $wrapperPid /T /F 2>&1 | Out-Null
    }
  }
  Remove-Item $pidFile -Force
}

# ── Kill any process still listening on the known dev ports ───────────────────
# (catches orphaned children whose pwsh wrapper already exited)
$ports   = @(10000, 4321, 7071, 4280)
$stopped = @()

foreach ($port in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
  foreach ($conn in $conns) {
    $ownerPid = $conn.OwningProcess
    if ($ownerPid -and $ownerPid -notin $stopped) {
      $name = (Get-Process -Id $ownerPid -ErrorAction SilentlyContinue)?.Name ?? "pid $ownerPid"
      taskkill /PID $ownerPid /T /F 2>&1 | Out-Null
      Write-Host "  Killed $name on :$port" -ForegroundColor Green
      $stopped += $ownerPid
    }
  }
}

if ($stopped.Count -eq 0) {
  Write-Host "  No services were running on ports $($ports -join ', ')." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "  Done." -ForegroundColor Green
Write-Host ""
