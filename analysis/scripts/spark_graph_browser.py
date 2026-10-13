"""本任务校验的无窗口GPU启动适配，复用原标准与回归脚本。"""
from pathlib import Path
import sys,runpy
R=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(R/'analysis/local/SparkGraph/runtime'))
sys.path.insert(0,str(R/'analysis/scripts'))
import browser_runtime
async def launch(p):return await p.chromium.launch(channel='msedge',headless=True,**browser_runtime.chromium_options())
browser_runtime.launch_async=launch
script=sys.argv.pop(1)
sys.argv[0]=str(R/'analysis/scripts'/script)
runpy.run_path(sys.argv[0],run_name='__main__')
