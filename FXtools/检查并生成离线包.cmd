@echo off
chcp 65001 >nul
cd /d "%~dp0..\tool\workbench"
python -X utf8 release.py
if errorlevel 1 echo 生成未完成，请查看上面的提示；首次开发请先运行 npm ci。
pause
