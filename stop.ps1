# VenuePlus — Stop
# Usage: .\stop.ps1

Write-Host ""
Write-Host "Stopping VenuePlus..." -ForegroundColor Cyan
docker compose down

if ($LASTEXITCODE -eq 0) {
    Write-Host "Stopped." -ForegroundColor Green
    Write-Host ""
}
