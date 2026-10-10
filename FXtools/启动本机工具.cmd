@echo off
chcp 65001 >nul
cd /d "%~dp0.."
python -X utf8 tool\local_http\launcher.py
if errorlevel 1 pause
