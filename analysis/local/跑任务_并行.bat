@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."
echo === 1/3 拉取最新任务 ===
git pull --rebase --autostash
echo === 2/3 3 个进程同时跑（会弹出 3 个浏览器窗口，跑完自动关闭）===
python analysis\local\run_jobs.py --workers=3 %*
echo === 3/3 上传结果（含烘焙器迭代区）===
git add analysis/results tool/data
git commit -m "本地并行跑完 %date% %time%"
git pull --rebase --autostash
git push
pause
