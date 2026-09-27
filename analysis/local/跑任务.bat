@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."
echo === 1/3 拉取最新任务 ===
git pull
echo === 2/3 本地渲染对照（会弹出一个浏览器窗口，跑完自动关闭）===
python analysis\local\run_jobs.py %*
echo === 3/3 上传结果 ===
git add analysis/results
git commit -m "本地跑完 %date% %time%"
git push
pause
