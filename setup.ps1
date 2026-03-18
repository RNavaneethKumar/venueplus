# ==============================================================================
# VenuePlus - First-time Setup
# Run once as Administrator: Right-click -> "Run with PowerShell as Administrator"
# ==============================================================================

#Requires -RunAsAdministrator

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "    $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   VenuePlus Setup for Windows" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# -- 1. Check Docker -----------------------------------------------------------

Write-Step "Checking Docker..."

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Fail "Docker not found."
    Write-Fail "Install Docker Desktop from https://www.docker.com/products/docker-desktop"
    Write-Fail "Then re-run this script."
    exit 1
}

$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker is installed but not running. Start Docker Desktop and try again."
    exit 1
}

Write-OK "Docker is ready."

# -- 2. Add venueplus.local to hosts file --------------------------------------

Write-Step "Configuring venueplus.local hostname..."

$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$hostsContent = Get-Content $hostsPath -Raw

if ($hostsContent -match "venueplus\.local") {
    Write-Warn "venueplus.local already in hosts file - skipping."
} else {
    Add-Content $hostsPath "`r`n127.0.0.1`tvenueplus.local"
    Write-OK "Added venueplus.local -> 127.0.0.1."
}

# -- 3. Pull latest images -----------------------------------------------------

Write-Step "Pulling latest VenuePlus images from Docker Hub..."

docker compose pull
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Failed to pull images. Check your internet connection."
    exit 1
}

Write-OK "Images pulled."

# -- 4. Start services ---------------------------------------------------------

Write-Step "Starting VenuePlus..."

docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Failed to start containers. Check the error above."
    exit 1
}

# -- 5. Wait for API health check ----------------------------------------------

Write-Step "Waiting for API to be ready..."

$maxAttempts = 20
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts -and -not $ready) {
    Start-Sleep -Seconds 3
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -eq 200) { $ready = $true }
    } catch {}
    Write-Host "    Waiting... ($attempt/$maxAttempts)" -NoNewline
    Write-Host "`r" -NoNewline
}

if ($ready) {
    Write-OK "API is healthy."
} else {
    Write-Warn "API health check timed out - it may still be starting. Check with: docker compose logs api"
}

# -- Done ----------------------------------------------------------------------

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   VenuePlus is ready!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "   POS Terminal : http://venueplus.local:3001" -ForegroundColor White
Write-Host "   API          : http://venueplus.local:4000" -ForegroundColor White
Write-Host ""
Write-Host "   Daily use:" -ForegroundColor Gray
Write-Host "     Start  ->  .\start.ps1" -ForegroundColor Gray
Write-Host "     Stop   ->  .\stop.ps1" -ForegroundColor Gray
Write-Host "     Update ->  .\update.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "   NOTE: For tablets/phones on the same WiFi," -ForegroundColor Yellow
Write-Host "   run rebuild.ps1 once (takes ~5 min)." -ForegroundColor Yellow
Write-Host ""
