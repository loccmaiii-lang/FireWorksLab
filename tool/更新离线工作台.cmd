@echo off
chcp 65001 >nul
python -X utf8 "%~dp0workbench\release.py" --deploy-only
if errorlevel 1 (
  echo 更新失败，请保留原离线文件并查看上方原因。
  pause
  exit /b 1
)
echo 更新完成；原浏览器页面刷新即可，个人节目不会被覆盖。
pause
