@echo off
set "FWL_HTTP_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%FWL_HTTP_PYTHON%" (
  "%FWL_HTTP_PYTHON%" -X utf8 "%~dp0launcher.py" %*
) else (
  python -X utf8 "%~dp0launcher.py" %*
)
if errorlevel 1 pause
