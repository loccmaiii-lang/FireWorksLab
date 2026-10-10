"""Start or reuse the loopback delivery service, then open the baker."""
import argparse
import json
import subprocess
import sys
import time
import webbrowser
from prepare_local import prepare
from pathlib import Path
from urllib.request import urlopen

FORMAT = 'df.local-delivery/1'
DEFAULT_SETUP = Path.home() / '.fireworkslab' / 'delivery-launcher.json'


def resolve_options(setup, config, importer):
    path = Path(setup)
    saved = json.loads(path.read_text(encoding='utf-8')) if path.is_file() else {}
    if not isinstance(saved, dict):
        raise ValueError('本机启动配置必须是对象')
    config = config or saved.get('configPath') or str(Path.home() / '.fireworkslab' / 'delivery-settings.json')
    importer = importer or saved.get('importerPath')
    if not isinstance(config, str) or (importer is not None and not isinstance(importer, str)):
        raise ValueError('本机启动路径无效')
    return config, importer


def probe(port):
    try:
        with urlopen(f'http://127.0.0.1:{port}/api/health', timeout=0.6) as response:
            result = json.load(response)
        return result if result.get('format') == FORMAT else None
    except (OSError, ValueError):
        return None


def ensure_service(config, importer, port, timeout=10):
    url = f'http://127.0.0.1:{port}/baker'
    status = probe(port)
    if status:
        if importer and not status.get('importerAvailable'):
            raise RuntimeError('已有服务未配置导入器，请关闭该服务后重新运行启动入口。')
        return url
    if importer and not Path(importer).is_file():
        raise ValueError('本机独立导入器文件不存在，请核对本机启动配置。')
    config = Path(config).resolve()
    config.parent.mkdir(parents=True, exist_ok=True)
    args = [sys.executable, str(Path(__file__).with_name('service.py')), '--port', str(port), '--config', str(config)]
    if importer:
        args += ['--importer', str(Path(importer).resolve())]
    with (config.parent / 'delivery-server.log').open('ab') as log:
        process = subprocess.Popen(args, cwd=str(Path(__file__).parent), stdout=log, stderr=subprocess.STDOUT,
                                   creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError('本机服务启动失败；请查看配置目录中的 delivery-server.log。')
        if probe(port):
            return url
        time.sleep(0.1)
    process.terminate()
    raise RuntimeError('本机服务连接超时；本次子进程已停止，现有服务未修改。')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8034)
    parser.add_argument('--setup', default=str(DEFAULT_SETUP))
    parser.add_argument('--config')
    parser.add_argument('--importer')
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args(argv)
    config, importer = resolve_options(args.setup, args.config, args.importer)
    prepare(Path(__file__).resolve().parent.parent, importer, args.setup)
    url = ensure_service(config, importer, args.port)
    print('已连接烘焙器：' + url, flush=True)
    if not args.no_browser:
        webbrowser.open(url, new=2)
    return url


if __name__ == '__main__':
    main()
