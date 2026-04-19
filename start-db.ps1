# start-db.ps1
# Starts the PostgreSQL server on D: and verifies the cantonix database.
# Run this once before `npm run dev` in the backend.

$pgBin  = "D:\pgsql\bin"
$pgData = "D:\pgdata"
$pgLog  = "D:\pgdata\pg.log"

# Check if already running
$status = & "$pgBin\pg_ctl.exe" -D $pgData status 2>&1
if ($status -match "server is running") {
    Write-Host "✓ PostgreSQL already running" -ForegroundColor Green
} else {
    Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
    & "$pgBin\pg_ctl.exe" -D $pgData -l $pgLog start
    Start-Sleep -Seconds 2
    Write-Host "✓ PostgreSQL started" -ForegroundColor Green
}

# Verify cantonix DB
$check = & "$pgBin\psql.exe" -U postgres -d cantonix -c "SELECT COUNT(*) FROM users;" 2>&1
if ($check -match "\d+") {
    Write-Host "✓ cantonix database OK" -ForegroundColor Green
} else {
    Write-Host "✗ cantonix database not found — run: psql -U postgres -c 'CREATE DATABASE cantonix'" -ForegroundColor Red
}

Write-Host "`nReady. Start the backend with: cd backend; npm run dev" -ForegroundColor Cyan
