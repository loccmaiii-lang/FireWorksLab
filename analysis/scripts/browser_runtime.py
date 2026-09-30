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
