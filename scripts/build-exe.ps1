#Requires -Version 5.1
<#
.SYNOPSIS
    Build the standalone Walker artifacts (CHR-009, TEC-021).

.DESCRIPTION
    Builds the frontend static files, then runs PyInstaller against walker.spec to produce the
    standalone Windows program in one or both packagings:

      onefile  ->  dist/walker.exe                     one file, nothing to unpack
      onedir   ->  dist/walker/ + dist/<name>.zip      walker.exe beside its dependencies

    Both are published (TEC-021). A onefile executable unpacks its own appended archive and runs
    code from it at startup, which an antivirus heuristic cannot tell apart from a packer —
    Defender quarantined the v1.14.0 walker.exe on exactly that behavior. The onedir build does no
    self-extraction, so it gives the user something else to try. Neither is immune.

    This is the local equivalent of what .github/workflows/cd-exe.yml runs on a Windows CI runner
    for a tagged release.

    Requires Node (for the frontend build) and the `build-exe` optional dependency group
    (PyInstaller) installed in the active Python environment:
        pip install -e ".[build-exe]"

.PARAMETER Mode
    Which packaging to build: onefile, onedir, or both (default).

.PARAMETER SkipFrontend
    Reuse the existing frontend/dist instead of rebuilding it. Only for quick iteration on the
    packaging itself — a release must always build the frontend.

.EXAMPLE
    .\scripts\build-exe.ps1
    .\scripts\build-exe.ps1 -Mode onedir -SkipFrontend
#>

[CmdletBinding()]
param(
    [ValidateSet('onefile', 'onedir', 'both')]
    [string]$Mode = 'both',
    [switch]$SkipFrontend
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

if ($SkipFrontend) {
    Write-Host '-> Skipping the frontend build (reusing frontend/dist).' -ForegroundColor Yellow
} else {
    Write-Host '-> Building the frontend (npm ci + build)...' -ForegroundColor Cyan
    Push-Location (Join-Path $repoRoot 'frontend')
    try {
        npm ci
        npm run build
    } finally { Pop-Location }
}

$modes = if ($Mode -eq 'both') { @('onefile', 'onedir') } else { @($Mode) }
$outputs = @()

Push-Location $repoRoot
try {
    foreach ($m in $modes) {
        Write-Host "-> Running PyInstaller ($m)..." -ForegroundColor Cyan
        $env:WALKER_BUILD_MODE = $m
        try {
            pyinstaller walker.spec --noconfirm
            if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed for mode '$m' (exit $LASTEXITCODE)." }
        } finally { Remove-Item Env:WALKER_BUILD_MODE -ErrorAction SilentlyContinue }

        if ($m -eq 'onefile') {
            $outputs += (Join-Path $repoRoot 'dist\walker.exe')
        } else {
            # Zipping dist/walker (not its contents) keeps a single top-level folder inside the
            # archive, so unzipping never scatters files across the user's Downloads.
            $versionLine = Select-String -Path (Join-Path $repoRoot 'pyproject.toml') -Pattern '^version = "(.+)"'
            $version = $versionLine.Matches[0].Groups[1].Value
            $zip = Join-Path $repoRoot "dist\walker-$version-windows.zip"
            Remove-Item $zip -Force -ErrorAction SilentlyContinue
            Compress-Archive -Path (Join-Path $repoRoot 'dist\walker') -DestinationPath $zip
            $outputs += $zip
        }
    }
} finally { Pop-Location }

Write-Host ''
Write-Host 'Done.' -ForegroundColor Green
foreach ($o in $outputs) {
    $size = [math]::Round((Get-Item $o).Length / 1MB, 2)
    Write-Host "  -> $o  ($size MB)"
}
