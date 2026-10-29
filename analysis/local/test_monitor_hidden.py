"""验证后台入口连同计算子进程均不分配控制台。"""
import base64
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

import run_monitor_hidden


@unittest.skipUnless(os.name == 'nt', '需要 Windows 的 pythonw 与 PowerShell')
class HiddenMonitorTests(unittest.TestCase):
    def test_windowless_chain_keeps_arguments_logs_and_exit_code(self):
        pythonw = Path(sys.executable).with_name('pythonw.exe')
        self.assertTrue(pythonw.is_file())
        with tempfile.TemporaryDirectory(prefix='FWL 后台 ') as directory:
            root = Path(directory)
            launcher = root / 'run_monitor_hidden.py'
            shutil.copyfile(run_monitor_hidden.__file__, launcher)
            (root / 'probe.py').write_text(
                'import ctypes\nprint("child_console=" + str(ctypes.windll.kernel32.GetConsoleWindow()))\n',
                encoding='utf-8')
            # 替身只检查控制台与参数，不访问队列、显卡或用户工程。
            (root / 'run_monitor.ps1').write_text(r'''
param([string]$StateDir, [string]$Python, [string]$Label)
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class ConsoleProbe { [DllImport("kernel32.dll")] public static extern IntPtr GetConsoleWindow(); }'
Write-Output ('parent_console=' + [ConsoleProbe]::GetConsoleWindow().ToInt64())
Write-Output ('label=' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Label)))
& $Python (Join-Path $PSScriptRoot 'probe.py')
Write-Error 'expected diagnostic' -ErrorAction Continue
exit 7
''', encoding='utf-8-sig')
            label = '中文 参数 & apostrophe\' 保留'
            result = subprocess.run(
                [str(pythonw), str(launcher), '-StateDir', str(root / '状态'),
                 '-Python', sys.executable, '-Label', label],
                creationflags=subprocess.CREATE_NO_WINDOW, timeout=30,
            )
            self.assertEqual(result.returncode, 7)
            output = (root / '状态' / 'hidden-launcher.log').read_text(
                encoding='utf-8', errors='replace')
            self.assertIn('parent_console=0', output)
            self.assertIn('child_console=0', output)
            self.assertIn('label=' + base64.b64encode(label.encode()).decode(), output)
            self.assertIn('expected diagnostic', output)


if __name__ == '__main__':
    unittest.main()
