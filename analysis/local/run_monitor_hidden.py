"""供 pythonw.exe 使用的 GPU 监控入口；原 PowerShell 流程保持不变。"""
import argparse
import os
from pathlib import Path
import subprocess
import sys
import traceback


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    parser = argparse.ArgumentParser(description=__doc__, allow_abbrev=False)
    parser.add_argument('-StateDir', required=True)
    options, _ = parser.parse_known_args(argv)
    state_dir = Path(options.StateDir)
    state_dir.mkdir(parents=True, exist_ok=True)
    powershell = Path(os.environ['SystemRoot']) / 'System32/WindowsPowerShell/v1.0/powershell.exe'
    command = [str(powershell), '-NoProfile', '-NonInteractive', '-ExecutionPolicy',
               'Bypass', '-WindowStyle', 'Hidden', '-File',
               str(Path(__file__).with_name('run_monitor.ps1')), *argv]
    # pythonw 本身没有控制台；子进程也从创建时就不分配窗口，而非启动后再隐藏。
    # 单独存启动诊断，避免与 run_monitor.ps1 正在追加的 launcher.log 争用文件。
    with (state_dir / 'hidden-launcher.log').open('a', encoding='utf-8') as log:
        try:
            return subprocess.run(command, stdin=subprocess.DEVNULL, stdout=log,
                                  stderr=subprocess.STDOUT,
                                  creationflags=subprocess.CREATE_NO_WINDOW).returncode
        except OSError:
            traceback.print_exc(file=log)
            return 1


if __name__ == '__main__':
    sys.exit(main())
