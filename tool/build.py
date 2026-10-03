#!/usr/bin/env python3
"""把 src/ 下的样式、页面和脚本拼成单文件 FireworkBaker.html（直接双击打开即可用）。"""
import glob, os, re
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, 'src')
css = open(os.path.join(src, 'style.css'), encoding='utf-8').read()
body = open(os.path.join(src, 'body.html'), encoding='utf-8').read()
js = ''.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(src, 'js', '*.js'))))
ver = re.search(r"const VERSION = '([^']+)'", js)
# 仓库根目录的 更新记录.md（最新在上）→ UPDATES，烘焙器顶栏「更新记录」里显示
import json
upd = []
up = os.path.join(here, '..', '更新记录.md')
if os.path.exists(up):
    for sec in re.split(r'^## ', open(up, encoding='utf-8').read(), flags=re.M)[1:21]:
        title, _, text = sec.partition('\n'); upd.append({'title': title.strip(), 'body': text.strip()})
js = 'const UPDATES = ' + json.dumps(upd, ensure_ascii=False) + ';\n' + js
# 4.3：参数命名全表（analysis/命名/参数名称表.json，唯一来源）→ PNAMES，参数面板按它显示新名字 / 说明 / 模块
pn = []
nf = os.path.join(here, '..', 'analysis', '命名', '参数名称表.json')
if os.path.exists(nf):
    for r in json.load(open(nf, encoding='utf-8')):
        pn.append({k: r.get(f, '') for k, f in (('sec', 'sec'), ('key', 'key'), ('old', 'old'), ('cn', 'cn'), ('en', 'en'), ('mcn', 'module_cn'), ('men', 'module_en'),
                                                ('desc', 'desc'), ('ud', 'updown'), ('rnd', 'random'), ('ue', 'ue'), ('tag', 'tag'), ('note', 'note'), ('tier', 'tier'), ('id', 'id'), ('unit', 'unit'))})
js = 'const PNAMES = ' + json.dumps(pn, ensure_ascii=False, separators=(',', ':')) + ';\n' + js
# 4.3：模块表（模块的中英文、默认展开、放什么）→ PMODULES，面板模块的说明和默认展开按它
mf = os.path.join(here, '..', 'analysis', '命名', '模块表.json')
js = 'const PMODULES = ' + (json.dumps(json.load(open(mf, encoding='utf-8')), ensure_ascii=False, separators=(',', ':')) if os.path.exists(mf) else '[]') + ';\n' + js
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
<!-- 迭代区数据（git pull 后刷新即更新；缺了也能用） -->
<script src="data/review.js"></script>
<!-- 标准检查结果（analysis/scripts/标准检查.py 生成；缺了也能用） -->
<script src="data/standard.js"></script>
<script>
'use strict';
{js}</script>
</body>
</html>
'''
open(os.path.join(here, 'FireworkBaker.html'), 'w', encoding='utf-8').write(html)
print('built', len(html), 'bytes', ver.group(1) if ver else '')
