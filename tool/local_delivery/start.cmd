@echo off
cd /d "%~dp0"
set "FWL_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%FWL_PYTHON%" (
  "%FWL_PYTHON%" launcher.py %*
) else (
  python launcher.py %*
)
if errorlevel 1 pause
