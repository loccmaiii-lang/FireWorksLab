"""调用原标准检查，仅写本实验结果，避免污染正式检查表。"""
from pathlib import Path
import sys,asyncio,importlib.util,shutil
R=Path(__file__).resolve().parents[2];O=R/'analysis/results/CS3_Layers';B=R/'analysis/local/CS3-Layers'
sys.path[:0]=[str(R/'analysis/local/CS3-runtime'),str(R/'analysis/scripts'),str(R/'analysis/local')]
import browser_runtime
async def headless(p):return await p.chromium.launch(channel='msedge',headless=True,**browser_runtime.chromium_options())
browser_runtime.launch_async=headless
spec=importlib.util.spec_from_file_location('standard',R/'analysis/scripts/标准检查.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
m.ROOT=B;m.probe.HTML=R/'tool/FireworkBaker.html'
from job_lock import ProcessLock,gpu_lock_path
with ProcessLock(gpu_lock_path(R)):asyncio.run(m.run(['CSLRC','CSLRS'],False))
shutil.copy2(B/'analysis/probe/标准检查/标准检查.json',O/'标准检查.json')
