"""复用固定本机服务，不重新构建工具或修改个人草稿。"""
import argparse
import importlib.util
import json
import shutil
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path
from urllib.request import urlopen
from service import DEFAULT_SETUP, FORMAT, options


def read_url(url):
    with urlopen(url, timeout=1) as response:
        return response.read(65536)


def suite_ready():
    try:
        return json.loads(read_url('http://127.0.0.1:8036/health')).get('format') == FORMAT
    except (OSError, ValueError):
        return False


def dev_ready():
    try:
        html = read_url('http://127.0.0.1:8025/').decode('utf-8')
        return '<title>烟花编排工作台</title>' in html and '/src/main.jsx' in html and '/@vite/client' in html
    except (OSError, UnicodeError):
        return False


def port_busy(port):
    with socket.socket() as client:
        client.settimeout(0.5)
        return client.connect_ex(('127.0.0.1', port)) == 0


def ensure_process(port, ready, command, cwd, logfile):
    if ready():
        return '复用'
    if port_busy(port):
        raise RuntimeError(f'{port}被其他服务占用；不会关闭现有进程。')
    logfile.parent.mkdir(parents=True, exist_ok=True)
    with logfile.open('ab') as log:
        child = subprocess.Popen(command, cwd=cwd, stdout=log, stderr=subprocess.STDOUT,
                                 creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    deadline = time.monotonic() + 12
    while time.monotonic() < deadline:
        if child.poll() is not None:
            raise RuntimeError(f'{port}启动失败，见 {logfile}')
        if ready():
            return '启动'
        time.sleep(0.1)
    child.terminate()
    raise RuntimeError(f'{port}连接超时，本次启动进程已停止；见 {logfile}')


def ensure_baker(tool_root):
    directory = tool_root / 'local_delivery'
    # 复用现有启动器，不调用prepare或重新生成私有文件页面。
    sys.path.insert(0, str(directory))
    try:
        spec = importlib.util.spec_from_file_location('df_delivery_launcher', directory / 'launcher.py')
        launcher = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(launcher)
        config, importer = launcher.resolve_options(launcher.DEFAULT_SETUP, None, None)
        if not launcher.probe(8034) and port_busy(8034):
            raise RuntimeError('8034被其他服务占用；不会关闭现有进程。')
        return launcher.ensure_service(config, importer, 8034)
    finally:
        sys.path.pop(0)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--setup', default=str(DEFAULT_SETUP))
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args(argv)
    cfg = options(args.setup)
    tool_root = Path(__file__).resolve().parents[1]
    errors = []
    for name, action in (
        ('烘焙器', lambda: ensure_baker(tool_root)),
        ('特效工作台', lambda: ensure_process(8036, suite_ready,
            [sys.executable, '-X', 'utf8', str(Path(__file__).with_name('service.py')), '--setup', str(Path(args.setup).resolve())],
            str(Path(__file__).parent), Path.home() / '.fireworkslab/local-http-tools.log')),
        ('编排工作台', lambda: ensure_dev(cfg)),
    ):
        try:
            print(name + '：' + action(), flush=True)
        except (OSError, ValueError, RuntimeError) as error:
            errors.append(name + '：' + str(error))
    for error in errors:
        print(error, file=sys.stderr)
    if suite_ready() and not args.no_browser:
        webbrowser.open('http://127.0.0.1:8036/', new=2)
    return 1 if errors else 0


def ensure_dev(cfg):
    if dev_ready():
        return '复用 http://127.0.0.1:8025/'
    if port_busy(8025):
        raise RuntimeError('8025被其他服务占用；不会关闭现有进程。')
    source = cfg['devPath']
    vite = source / 'node_modules/vite/bin/vite.js'
    node = cfg['nodePath'] or shutil.which('node')
    if not vite.is_file() or not node:
        raise RuntimeError('本机8025源码或Node未配置，请核对local-http-tools.json；离线HTML仍可使用。')
    return ensure_process(8025, dev_ready, [str(node), str(vite), '--host', '127.0.0.1', '--port', '8025', '--strictPort'],
                          str(source), Path.home() / '.fireworkslab/choreography-dev.log') + ' http://127.0.0.1:8025/'


if __name__ == '__main__':
    raise SystemExit(main())
