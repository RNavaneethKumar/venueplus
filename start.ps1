# VenuePlus - Start
# Usage: .\start.ps1

Write-Host ""
Write-Host "Starting VenuePlus..." -ForegroundColor Cyan
docker compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Running at http://venueplus.local:3001" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Failed to start. Run 'docker compose logs' for details." -ForegroundColor Red
}
