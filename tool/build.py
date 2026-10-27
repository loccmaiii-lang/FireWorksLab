#!/usr/bin/env python3
"""把 src/ 下的样式、页面和脚本拼成单文件 FireworkBaker.html（直接双击打开即可用）。

python3 tool/build.py           内部版 tool/FireworkBaker.html（默认，行为不变）
python3 tool/build.py --team    对外精简版 tool/烟花烘焙器_对外版.html（5.0.0-a1，team/external 分支）：TEAM_MODE = true——
                                不加载 review.js / standard.js、不嵌更新记录、加载 data/team_cases.js（案例），内部协作字样换掉；
                                打包成给同事的离线包用 tool/team/打包对外版.py
"""
import glob, os, re, sys
TEAM = '--team' in sys.argv[1:]
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, 'src')
css = open(os.path.join(src, 'style.css'), encoding='utf-8').read()
css = ''.join(open(os.path.join(here, 'design-system', f), encoding='utf-8').read() for f in ('tokens.css', 'components.css')) + '\n' + css
body = open(os.path.join(src, 'body.html'), encoding='utf-8').read()
js = ''.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(src, 'js', '*.js'))))
js = open(os.path.join(here, 'shared', 'cascade_events.js'), encoding='utf-8').read() + '\n' + js
ver = re.search(r"const VERSION = '([^']+)'", js)
# 仓库根目录的 更新记录.md（最新在上）→ UPDATES，烘焙器顶栏「更新记录」里显示
import json
upd = []
up = os.path.join(here, '..', '更新记录.md')
if os.path.exists(up) and not TEAM:     # 对外版不嵌更新记录（内部的待办 / 本机路径）
    for sec in re.split(r'^## ', open(up, encoding='utf-8').read(), flags=re.M)[1:21]:
        title, _, text = sec.partition('\n'); upd.append({'title': title.strip(), 'body': text.strip()})
js = 'const UPDATES = ' + json.dumps(upd, ensure_ascii=False) + ';\n' + js
# 5.0.0-a1 对外精简模式（team/external）：整段脚本共用一个常量，模块里按 TEAM_MODE 分支（默认 false = 内部版，行为不变）
js = 'const TEAM_MODE = ' + ('true' if TEAM else 'false') + ';\n' + js
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
# 4.4：发射器表（参数归哪个发射器 / 模块、面板上的短名）→ PEMIT，参数面板按「发射器 → 模块 → 参数」排
ef = os.path.join(here, '..', 'analysis', '命名', '发射器表.json')
if os.path.exists(ef):
    ed = json.load(open(ef, encoding='utf-8'))
    pe = {'E': [{'n': e['名'], 'en': e['en'], 'lv': e['级'], 'what': e['说明'], 'mods': e['模块']} for e in ed['发射器']],
          'P': {r['id']: [r['发射器'], r['模块'], r['名'], i, r.get('类别', ''), r.get('单位', '')] for i, r in enumerate(ed['参数'])}}     # 4.9.5 类别 + 单位（参数宪章第 1 条），说明条里显示
else:
    pe = {'E': [], 'P': {}}
js = 'const PEMIT = ' + json.dumps(pe, ensure_ascii=False, separators=(',', ':')) + ';\n' + js
js = 'const PMODULES = ' + (json.dumps(json.load(open(mf, encoding='utf-8')), ensure_ascii=False, separators=(',', ':')) if os.path.exists(mf) else '[]') + ';\n' + js
# 4.9.51 尺寸标定表（spec/尺寸标定.json，编排对话框维护，用户 10-09 00:27）→ tool/data/size_spec.js（window.SIZE_SPEC；缺了 = 不按标定，照原大导出）
sz = os.path.join(here, '..', 'spec', '尺寸标定.json')
if os.path.exists(sz):
    _spec = json.load(open(sz, encoding='utf-8'))
    open(os.path.join(here, 'data', 'size_spec.js'), 'w', encoding='utf-8').write('// 由 tool/build.py / review_to_baker.py 从 spec/尺寸标定.json 生成，别手改\nwindow.SIZE_SPEC = ' + json.dumps(_spec, ensure_ascii=False) + ';\n')
DATA_SCRIPTS = '''<!-- 迭代区数据（git pull 后刷新即更新；缺了也能用） -->
<script src="data/review.js"></script>
<!-- 标准检查结果（analysis/scripts/标准检查.py 生成；缺了也能用） -->
<script src="data/standard.js"></script>
<!-- 4.9.16 默认缩略图（本机渲染，analysis/scripts/渲染缩略图_截图法.py --ingest 生成；缺了用示意图） -->
<script src="data/thumbs.js"></script>
<!-- 4.9.51 尺寸标定表（spec/尺寸标定.json 生成；缺了照原大导出） -->
<script src="data/size_spec.js"></script>''' if not TEAM else '''<!-- 对外版：默认缩略图、尺寸标定表、案例（tool/team/build_cases.py 生成；缺了也能用，没有案例组） -->
<script src="data/thumbs.js"></script>
<script src="data/size_spec.js"></script>
<script src="data/team_cases.js"></script>'''
html = f'''<!doctype html>
<html lang="zh-CN"{' class="team-mode"' if TEAM else ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{'烟花烘焙器 · 对外版' if TEAM else '烟花母版烘焙器'}</title>
<style>
{css}</style>
</head>
<body>
{body}
{DATA_SCRIPTS}
<script>
'use strict';
{js}</script>
</body>
</html>
'''
def team_scrub(t):
    """对外版：注释和参数说明里的内部协作字样（对话框编号 / 名字）换成中性写法；UI 里的「对话框」（弹窗）改叫「弹窗」。"""
    t = re.sub(r'编排对话框', '编排', t)
    t = re.sub(r'对话框(?:\d+|[A-Za-z][A-Za-z0-9]*|新花型|相机渲染|手游编排)', '内部', t)
    return t.replace('对话框', '弹窗')
out_name = '烟花烘焙器_对外版.html' if TEAM else 'FireworkBaker.html'
if TEAM:
    html = team_scrub(html)
    if not os.path.exists(os.path.join(here, 'data', 'team_cases.js')):
        print('⚠ 没有 tool/data/team_cases.js：对外版没有案例组（先跑 python3 tool/team/build_cases.py）')
open(os.path.join(here, out_name), 'w', encoding='utf-8').write(html)
print('built', out_name, len(html), 'bytes', ver.group(1) if ver else '')

# 4.4.3（排查计划第 1 步）：构建完跑静态检查，有错误构建失败（html 已经写出来，退出码 1）
#   tool/lint/js_lint.mjs —— 整段脚本的 no-undef / no-redeclare / 已删掉的名字（Node 自带的 acorn；没有 node 只提示不失败）
#   analysis/scripts/静态核对.py —— 页面元素 id ↔ 脚本引用、参数名称表 ↔ 发射器表
import shutil, subprocess, sys
bad = False
node = shutil.which('node')
if node:
    r = subprocess.run([node, '--expose-internals', os.path.join(here, 'lint', 'js_lint.mjs'), os.path.join(here, out_name)], capture_output=True, text=True)
    print(r.stdout.strip()); bad |= r.returncode != 0
    if r.returncode not in (0, 1): print(r.stderr.strip())
else:
    print('⚠ 没有 node：跳过脚本静态检查（云端改 tool/src 时必须有）')
r = subprocess.run([sys.executable, os.path.join(here, '..', 'analysis', 'scripts', '静态核对.py')], capture_output=True, text=True)
print(r.stdout.strip()); bad |= r.returncode != 0
if bad:
    print('构建完成，但静态检查有错误（见上）'); sys.exit(1)

# Private local deployment is a separate, gitignored sidecar, never public HTML.
if TEAM: sys.exit(0)     # 对外版不部署本机导入组件（导入走包里的导入器，离线）
from local_delivery.prepare_local import prepare
if prepare(here):
    print('本机导入组件已部署（不进入公共 HTML / Git）')
