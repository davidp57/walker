#Requires -Version 5.1
<#
.SYNOPSIS
    Set up (or update) a standalone Walker instance, fully isolated from any other checkout.

.DESCRIPTION
    Clones (or updates) a branch into -Path with its own venv, node_modules, built frontend, and
    SQLite database — nothing is shared with any other working copy of this repo. The frontend is
    built once as static files (`frontend/dist`), which the backend serves directly (ADR-0003), so
    the result runs as a single `uvicorn` process on one port: no --reload, no Vite dev server, no
    file-watching. It only changes when you re-run this script.

    This does not start the server — it prints the two commands to do that yourself.

.PARAMETER Path
    Target directory. Created (via git clone) if missing; if it already holds a checkout, it is
    updated in place instead (git pull + reinstall + rebuild + migrate).

.PARAMETER Branch
    Branch to deploy. Defaults to 'develop'.

.EXAMPLE
    .\scripts\deploy-local.ps1 -Path C:\dev\walker-run
#>

param(
    [Parameter(Mandatory)] [string]$Path,
    [string]$Branch = 'develop'
)

$ErrorActionPreference = 'Stop'
$repoUrl = 'git@github.com:davidp57/walker.git'

if (Test-Path (Join-Path $Path '.git')) {
    Write-Host "-> Updating the existing checkout at $Path..." -ForegroundColor Cyan
    Push-Location $Path
    try {
        git fetch origin
        git checkout $Branch
        git pull origin $Branch
    } finally { Pop-Location }
} else {
    Write-Host "-> Cloning $repoUrl ($Branch) into $Path..." -ForegroundColor Cyan
    git clone --branch $Branch $repoUrl $Path
}

Push-Location $Path
try {
    Write-Host '-> Setting up the Python virtualenv...' -ForegroundColor Cyan
    if (-not (Test-Path '.venv')) { python -m venv .venv }
    & '.\.venv\Scripts\python.exe' -m pip install --upgrade pip
    & '.\.venv\Scripts\python.exe' -m pip install -e .

    Write-Host '-> Building the frontend (npm ci + build)...' -ForegroundColor Cyan
    Push-Location frontend
    try {
        npm ci
        npm run build
    } finally { Pop-Location }

    Write-Host '-> Applying database migrations...' -ForegroundColor Cyan
    & '.\.venv\Scripts\python.exe' -m alembic upgrade head
} finally { Pop-Location }

Write-Host ''
Write-Host 'Done. To run it:' -ForegroundColor Green
Write-Host "  cd $Path"
Write-Host '  .\.venv\Scripts\Activate.ps1'
Write-Host '  uvicorn walker.api.app:app --port 8000'
Write-Host ''
Write-Host '  -> http://localhost:8000  (serves the API and the built SPA on one port)' -ForegroundColor Green
Write-Host ''
Write-Host "To pick up newer changes later, just re-run this script against the same -Path." -ForegroundColor DarkGray
