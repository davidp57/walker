#Requires -Version 5.1
<#
.SYNOPSIS
    Launch the Walker backend (FastAPI) and frontend (Vite) together for development.

.DESCRIPTION
    Applies database migrations, then starts uvicorn with --reload on :8000 and the Vite
    dev server on :5173 (Vite proxies /api to the backend). Both share this console, so
    Ctrl-C stops them gracefully; a taskkill backstop cleans up any stragglers.

    Run from anywhere:  .\scripts\dev.ps1
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$py = Join-Path $root '.venv\Scripts\python.exe'

if (-not (Test-Path $py)) {
    throw "Virtualenv not found at $py. Create it (python -m venv .venv), activate it, then run 'pip install -e .[dev]'."
}

Write-Host '-> Applying database migrations (alembic upgrade head)...' -ForegroundColor Cyan
Push-Location $root
try { & $py -m alembic upgrade head } finally { Pop-Location }

Write-Host '-> Starting backend (uvicorn :8000) + frontend (Vite :5173)...' -ForegroundColor Cyan
$backend = Start-Process -PassThru -NoNewWindow -WorkingDirectory $root -FilePath $py `
    -ArgumentList '-m', 'uvicorn', 'walker.api.app:app', '--reload', '--port', '8000'
$frontend = Start-Process -PassThru -NoNewWindow -WorkingDirectory $root -FilePath 'npm.cmd' `
    -ArgumentList '--prefix', 'frontend', 'run', 'dev', '--', '--port', '5173', '--strictPort'

Write-Host ''
Write-Host '  Backend  -> http://localhost:8000  (JSON API)' -ForegroundColor Green
Write-Host '  Frontend -> http://localhost:5173  (SPA; proxies /api -> :8000)' -ForegroundColor Green
Write-Host '  Press Ctrl-C to stop both.' -ForegroundColor DarkGray
Write-Host ''

try {
    while (-not ($backend.HasExited -or $frontend.HasExited)) { Start-Sleep -Milliseconds 500 }
} finally {
    foreach ($proc in @($backend, $frontend)) {
        if ($proc -and -not $proc.HasExited) { taskkill /T /F /PID $proc.Id 2>$null | Out-Null }
    }
    Write-Host 'Stopped backend + frontend.' -ForegroundColor Cyan
}
