"""Shared browser settings for bake validation; never silently claim software is GPU.

FW_BROWSER_EXECUTABLE selects an existing Chromium. FW_RENDER=soft explicitly
selects software; Windows defaults to D3D11, Linux to software rendering.
"""
import os
import platform
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import urlopen


def validation_url(value='', default=None):
    """门禁支持已授权的 HTTP 入口；保留原有本地文件用法。"""
    local_default = 'http://127.0.0.1:8034/baker' if platform.system() == 'Windows' else default
    target = str(value or os.environ.get('FW_GATE_HTML') or local_default or '')
    parts = urlsplit(target)
    if parts.scheme not in ('http', 'https', 'file'):
        parts = urlsplit(Path(target).resolve().as_uri())
    query = parse_qsl(parts.query, keep_blank_values=True)
    if not any(key == 'fast' for key, _ in query):
        query.append(('fast', ''))
    return urlunsplit(parts._replace(query=urlencode(query)))


def verify_validation_source(url, expected):
    """HTTP 必须提供待测成品，避免临时副本误测另一个版本。"""
    if urlsplit(url).scheme not in ('http', 'https'):
        return
    with urlopen(url, timeout=15) as response:
        actual = response.read()
    normalize = lambda data: data.replace(b'\r\n', b'\n').replace(b'\r', b'\n')
    if normalize(actual) != normalize(Path(expected).read_bytes()):
        raise RuntimeError('HTTP 页面与待测 FireworkBaker.html 不一致，请同步服务后重试：' + url)


def chromium_options():
    mode = os.environ.get('FW_RENDER', 'soft' if platform.system() == 'Linux' else 'gpu')
    args = ['--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding']
    if mode == 'soft':
        args += ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    elif platform.system() == 'Windows':
        args += ['--use-angle=d3d11']
    opts = {'args': args}
    if os.environ.get('FW_BROWSER_EXECUTABLE'):
        opts['executable_path'] = os.environ['FW_BROWSER_EXECUTABLE']
    return opts


def verify_renderer(renderer):
    software = any(s in renderer.lower() for s in ('swiftshader', 'llvmpipe', 'software', 'basic render'))
    expected_gpu = os.environ.get('FW_RENDER', 'soft' if platform.system() == 'Linux' else 'gpu') == 'gpu'
    if expected_gpu and software:
        raise RuntimeError('Requested GPU but browser selected software: ' + renderer)
    return renderer


async def launch_async(p):
    """异步 playwright 启动浏览器：Windows / 显卡机器先用装好的 Chrome / Edge（有窗口才走显卡，和本机任务运行器一样），不行再用自带的"""
    if platform.system() == 'Windows' or os.environ.get('FW_RENDER') == 'gpu':
        for ch in ('chrome', 'msedge'):
            try: return await p.chromium.launch(channel=ch, headless=False, **chromium_options())
            except Exception: pass
    return await p.chromium.launch(**chromium_options())
