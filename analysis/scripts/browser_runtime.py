"""Shared browser settings for bake validation; never silently claim software is GPU.

FW_BROWSER_EXECUTABLE selects an existing Chromium. FW_RENDER=soft explicitly
selects software; Windows defaults to D3D11, Linux to software rendering.
"""
import os
import platform


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
