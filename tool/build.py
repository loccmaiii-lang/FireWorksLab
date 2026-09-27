#!/usr/bin/env python3
"""把 src/ 下的样式、页面和脚本拼成单文件 FireworkBaker.html（直接双击打开即可用）。"""
import glob, os, re
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, 'src')
css = open(os.path.join(src, 'style.css'), encoding='utf-8').read()
body = open(os.path.join(src, 'body.html'), encoding='utf-8').read()
js = ''.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(src, 'js', '*.js'))))
ver = re.search(r"const VERSION = '([^']+)'", js)
html = f'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>烟花母版烘焙器</title>
<style>
{css}</style>
</head>
<body>
{body}
<script>
'use strict';
{js}</script>
</body>
</html>
'''
open(os.path.join(here, 'FireworkBaker.html'), 'w', encoding='utf-8').write(html)
print('built', len(html), 'bytes', ver.group(1) if ver else '')
