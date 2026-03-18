# =============================================================================
# VenuePlus — Rebuild for Network Access
#
# Run this if tablets/phones on the same WiFi need to access the POS.
# Rebuilds the POS image with venueplus.local baked in as the API URL.
# Takes ~5 minutes. Run as Administrator.
# =============================================================================

#Requires -RunAsAdministrator

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   VenuePlus — Network Rebuild" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This rebuilds the POS image so tablets and phones" -ForegroundColor White
Write-Host "on the same WiFi can access the POS via venueplus.local." -ForegroundColor White
Write-Host ""
Write-Host "This will take approximately 5 minutes." -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne 'y') { exit 0 }

# ── Check .env.docker.local exists ───────────────────────────────────────────

if (-not (Test-Path ".env.docker.local")) {
    Write-Host ""
    Write-Host "Creating .env.docker.local from template..." -ForegroundColor Cyan
    Copy-Item ".env.docker" ".env.docker.local"
    Write-Host "Edit .env.docker.local with your values, then re-run rebuild.ps1." -ForegroundColor Yellow
    exit 0
}

# ── Patch NEXT_PUBLIC_API_URL in .env.docker.local ───────────────────────────

$envFile = ".env.docker.local"
$content = Get-Content $envFile -Raw

if ($content -match "NEXT_PUBLIC_API_URL") {
    $content = $content -replace "NEXT_PUBLIC_API_URL=.*", "NEXT_PUBLIC_API_URL=http://venueplus.local:4000/api/v1"
} else {
    $content += "`nNEXT_PUBLIC_API_URL=http://venueplus.local:4000/api/v1"
}

if ($content -match "CORS_ORIGINS") {
    $content = $content -replace "CORS_ORIGINS=.*", "CORS_ORIGINS=http://localhost:3001,http://venueplus.local:3001"
} else {
    $content += "`nCORS_ORIGINS=http://localhost:3001,http://venueplus.local:3001"
}

Set-Content $envFile $content
Write-Host "Updated .env.docker.local with venueplus.local URLs." -ForegroundColor Green

# ── Build and start ───────────────────────────────────────────────────────────

Write-Host ""
Write-Host "Building images (this takes a few minutes)..." -ForegroundColor Cyan

docker compose -f docker-compose.build.yml --env-file .env.docker.local up --build -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "   Build complete!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "   POS Terminal : http://venueplus.local:3001" -ForegroundColor White
    Write-Host ""
    Write-Host "   Devices on the same WiFi can now access the POS" -ForegroundColor White
    Write-Host "   at http://venueplus.local:3001" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Build failed. Check the error above." -ForegroundColor Red
}
