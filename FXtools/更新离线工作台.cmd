@echo off
chcp 65001 >nul
cd /d "%~dp0.."
python -X utf8 tool\workbench\release.py --deploy-only
if errorlevel 1 echo 更新未完成，请查看上面的提示。原个人节目不会被覆盖。
pause
