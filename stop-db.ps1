# stop-db.ps1
# Gracefully stops the PostgreSQL server.

$pgBin  = "D:\pgsql\bin"
$pgData = "D:\pgdata"

Write-Host "Stopping PostgreSQL..." -ForegroundColor Yellow
& "$pgBin\pg_ctl.exe" -D $pgData stop -m fast
Write-Host "✓ PostgreSQL stopped" -ForegroundColor Green
