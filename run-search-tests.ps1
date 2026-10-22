# Run search tests against live COS2
# Usage: .\run-search-tests.ps1

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  COS2 SEARCH TESTS (LIVE)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Set to live mode
$env:TEST_TARGET = "live"

# Run tests
Write-Host "Starting tests...`n" -ForegroundColor Yellow
npm test -- tests/search/search.spec.ts --workers=1

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Tests complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
