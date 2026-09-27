@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."
pip install -r analysis\local\requirements.txt
python analysis\local\run_jobs.py --check
pause
