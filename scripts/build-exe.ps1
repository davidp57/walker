#Requires -Version 5.1
<#
.SYNOPSIS
    Build the standalone Walker .exe (CHR-009).

.DESCRIPTION
    Builds the frontend static files, then runs PyInstaller against walker.spec to produce
    a single-file console-mode Windows executable at dist/walker.exe. This is the local
    equivalent of what .github/workflows/cd-exe.yml runs on a Windows CI runner for a
    tagged release.

    Requires Node (for the frontend build) and the `build-exe` optional dependency group
    (PyInstaller) installed in the active Python environment:
        pip install -e ".[build-exe]"

.EXAMPLE
    .\scripts\build-exe.ps1
#>

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host '-> Building the frontend (npm ci + build)...' -ForegroundColor Cyan
Push-Location (Join-Path $repoRoot 'frontend')
try {
    npm ci
    npm run build
} finally { Pop-Location }

Write-Host '-> Running PyInstaller...' -ForegroundColor Cyan
Push-Location $repoRoot
try {
    pyinstaller walker.spec --noconfirm
} finally { Pop-Location }

Write-Host ''
Write-Host 'Done.' -ForegroundColor Green
Write-Host "  -> $repoRoot\dist\walker.exe"
