@echo off
cd /d "%~dp0"

if not exist ".venv\Scripts\activate.bat" (
    echo Virtualenv not found at .venv - run scripts\deploy-local.ps1 first.
    pause
    exit /b 1
)

echo Starting Walker on http://localhost:8000
echo Close this window (or Ctrl-C) to stop it.
echo.

call .venv\Scripts\activate.bat
uvicorn walker.api.app:app --port 8000
