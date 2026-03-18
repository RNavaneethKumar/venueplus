# VenuePlus — Update to latest images
# Usage: .\update.ps1

Write-Host ""
Write-Host "Updating VenuePlus..." -ForegroundColor Cyan

docker compose pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to pull images. Check your internet connection." -ForegroundColor Red
    exit 1
}

docker compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Updated and running at http://venueplus.local:3001" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Failed to restart. Run 'docker compose logs' for details." -ForegroundColor Red
}
