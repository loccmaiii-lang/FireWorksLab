"""核对当前工作树的 HTTP 测试入口；--start 仅启动缺失的所需服务。"""
import argparse
import hashlib
import http.client
import json
import socket
import sys
from pathlib import Path

PORTS = {'baker': 8034, 'workbench': 8025}
ROOT = Path(__file__).resolve().parents[2]


def get(port, path):
    # 固定 loopback、无代理、不跟随重定向；不读取 /api/session。
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=3)
    try:
        connection.request('GET', path, headers={'Cache-Control': 'no-cache'})
        response = connection.getresponse()
        if response.status != 200:
            raise RuntimeError(f'{port}{path} HTTP {response.status}，停止测试。')
        body = response.read(64 * 1024 * 1024 + 1)
        if len(body) > 64 * 1024 * 1024:
            raise RuntimeError('测试页面超过读取上限。')
        return body
    finally:
        connection.close()


def listening(port):
    try:
        with socket.create_connection(('127.0.0.1', port), timeout=1):
            return True
    except ConnectionRefusedError:
        return False
    # 权限拒绝／超时不是“没启动”，不得据此另启服务。


def verify(tool, root=ROOT, release=False):
    port = PORTS[tool]
    path = '/api/health' if tool == 'baker' else '/__fwl_health'
    try:
        health = json.loads(get(port, path))
    except (ValueError, RuntimeError) as error:
        raise RuntimeError(f'{port}已占用但身份未验证（旧版服务或无关服务）；不替换、不换端口。{error}') from error
    if not isinstance(health, dict):
        raise RuntimeError(f'{port}健康响应不是服务对象；保留现有进程并停止测试。')
    expected = (root / ('tool/workbench' if tool == 'workbench' else 'tool')).resolve()
    key, kind = ('toolRoot', 'df.local-delivery/1') if tool == 'baker' else ('root', 'df.workbench-dev/1')
    if health.get('format') != kind or not isinstance(health.get(key), str):
        raise RuntimeError(f'{port}缺少可核实的服务格式／根目录；请由服务负责人正常重启对应旧服务，不自动关闭。')
    actual = Path(health[key]).resolve()
    if actual != expected:
        raise RuntimeError(f'{port}属于另一工作树：{actual}；预期 {expected}。保留现有服务并停止相关测试。')
    page = '/baker' if tool == 'baker' else '/'
    html = get(port, page)
    if tool == 'baker':
        expected_bytes = (root / 'tool/FireworkBaker.html').read_bytes()
        if hashlib.sha256(html).digest() != hashlib.sha256(expected_bytes).digest():
            raise RuntimeError('8034/baker 与当前工作树成品字节不同，不能验收此版本。')
    elif not all(marker in html for marker in ('<title>烟花编排工作台</title>'.encode(), b'/@vite/client', b'/src/main.jsx')):
        raise RuntimeError('8025页面不是预期的编排开发入口。')
    if release and tool == 'workbench':
        if get(port, '/release/') != (root / 'tool/烟花编排工作台.html').read_bytes():
            raise RuntimeError('8025/release/ 与当前工作树离线成品字节不同。')
    return f'http://127.0.0.1:{port}{page} · 根目录 {actual}'


def start(tool, root=ROOT):
    import launcher
    if tool == 'baker':
        launcher.ensure_baker(root / 'tool')
    else:
        cfg = launcher.options()
        # 不沿用另一 worktree 的 devPath；只使用本脚本所属仓库。
        cfg['devPath'] = root / 'tool/workbench'
        launcher.ensure_dev(cfg)


def ensure(tool, allow_start=False, root=ROOT, release=False):
    port = PORTS[tool]
    reused = listening(port)
    if not reused:
        if not allow_start:
            raise RuntimeError(f'{port}未启动；加 --start 使用现有启动器，仅启动所需服务。')
        start(tool, root)
    return ('复用 ' if reused else '启动 ') + verify(tool, root, release)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tool', required=True, choices=['baker', 'workbench', 'both'])
    parser.add_argument('--start', action='store_true')
    parser.add_argument('--release', action='store_true', help='编排最终成品测试时另核对 /release/ 字节')
    args = parser.parse_args(argv)
    errors = []
    for tool in (PORTS if args.tool == 'both' else [args.tool]):
        try:
            print(ensure(tool, args.start, release=args.release), flush=True)
        except (OSError, ValueError, RuntimeError, http.client.HTTPException) as error:
            errors.append(f'{tool}：{error}')
    for error in errors:
        print(error, file=sys.stderr)
    return 1 if errors else 0


if __name__ == '__main__':
    raise SystemExit(main())
