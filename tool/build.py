#!/usr/bin/env python3
"""把 src/ 下的样式、页面和脚本拼成单文件 FireworkBaker.html（直接双击打开即可用）。"""
import glob, os, re
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, 'src')
css = open(os.path.join(src, 'style.css'), encoding='utf-8').read()
css = ''.join(open(os.path.join(here, 'design-system', f), encoding='utf-8').read() for f in ('tokens.css', 'components.css')) + '\n' + css
body = open(os.path.join(src, 'body.html'), encoding='utf-8').read()
# 烟花工坊 5.0（对话框9 S）：js/95_shell*.js 是外壳，只进 tool/烟花工坊.html，不进 FireworkBaker.html
_jsf = sorted(glob.glob(os.path.join(src, 'js', '*.js')))
shell_js_files = [f for f in _jsf if os.path.basename(f).startswith('95_shell')]
js = ''.join(open(f, encoding='utf-8').read() for f in _jsf if f not in shell_js_files)
js = open(os.path.join(here, 'shared', 'cascade_events.js'), encoding='utf-8').read() + '\n' + js
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
<!-- 4.9.16 默认缩略图（本机渲染，analysis/scripts/渲染缩略图_截图法.py --ingest 生成；缺了用示意图） -->
<script src="data/thumbs.js"></script>
<!-- 4.9.51 尺寸标定表（spec/尺寸标定.json 生成；缺了照原大导出） -->
<script src="data/size_spec.js"></script>
<script>
'use strict';
{js}</script>
</body>
</html>
'''
open(os.path.join(here, 'FireworkBaker.html'), 'w', encoding='utf-8').write(html)
print('built', len(html), 'bytes', ver.group(1) if ver else '')

# 4.4.3（排查计划第 1 步）：构建完跑静态检查，有错误构建失败（html 已经写出来，退出码 1）
#   tool/lint/js_lint.mjs —— 整段脚本的 no-undef / no-redeclare / 已删掉的名字（Node 自带的 acorn；没有 node 只提示不失败）
#   analysis/scripts/静态核对.py —— 页面元素 id ↔ 脚本引用、参数名称表 ↔ 发射器表
import shutil, subprocess, sys
bad = False
node = shutil.which('node')
if node:
    r = subprocess.run([node, '--expose-internals', os.path.join(here, 'lint', 'js_lint.mjs'), os.path.join(here, 'FireworkBaker.html')], capture_output=True, text=True)
    print(r.stdout.strip()); bad |= r.returncode != 0
    if r.returncode not in (0, 1): print(r.stderr.strip())
else:
    print('⚠ 没有 node：跳过脚本静态检查（云端改 tool/src 时必须有）')
r = subprocess.run([sys.executable, os.path.join(here, '..', 'analysis', 'scripts', '静态核对.py')], capture_output=True, text=True)
print(r.stdout.strip()); bad |= r.returncode != 0

# ---------------------------------------------------------------------
# 烟花工坊 5.0（对话框9 S，2026-11-05）：再合成一个单文件 tool/烟花工坊.html = 烘焙器 + 外壳 + 导入模块。
#   双击打开（file://）就能用：tool/data/*.js 内嵌进来，不依赖本地服务，不引外网资源。FireworkBaker.html 照旧，不带外壳。
#   外壳：tool/src/shell/shell.css、shell.html、js/95_shell*.js（单独一个 <script>，在烘焙器脚本后面：一边出错不拖垮另一边）。
#   制作区还是 4.9 界面（body.html 里没有 v3.7 的 #shell 槽位）时外壳在页面上自己搭顶栏和状态栏（shell/shell_fb.css 的 body.sh-fb 部分）。
#   导入模块（接口 tool/importer/API_5.0.md）：tool/importer/dist/fwl-importer.js（真）→ fwl-importer.mock.js（本机替身），有哪个用哪个，都没有时外壳写「导入模块未加载」；
#   包在一个函数里（顶层名字不和烘焙器撞），window.__FWL_IMPORTER_KIND 告诉外壳用的是哪个（替身时顶栏 UE 的悬停提示写「导入模块：替身」）。
def _rd(*parts):
    return open(os.path.join(*parts), encoding='utf-8').read()
def _inl(code):     # 内嵌进 <script> 时不能出现 </script 和 <!--
    return code.replace('</script', '<\\/script').replace('<!--', '<\\!--')
shell_dir = os.path.join(src, 'shell')
if os.path.isdir(shell_dir):
    imp_dir = os.path.join(here, 'importer', 'dist')
    imp = next(((k, p) for k, p in (('real', os.path.join(imp_dir, 'fwl-importer.js')), ('mock', os.path.join(imp_dir, 'fwl-importer.mock.js'))) if os.path.exists(p)), ('none', ''))
    fb = 'id="shell"' not in body
    wcss = css + '\n' + _rd(shell_dir, 'shell_fb.css') + '\n' + _rd(shell_dir, 'shell.css')   # 兜底样式总是带上：布局只在 body.sh-fb 起作用，组件类两种界面都用
    shell_js = ''.join(open(f, encoding='utf-8').read() for f in shell_js_files)
    data_js = ''
    for f in ('review.js', 'standard.js', 'thumbs.js', 'size_spec.js'):
        p = os.path.join(here, 'data', f)
        if os.path.exists(p):
            data_js += f'<script>/* tool/data/{f}（内嵌） */\n' + _inl(_rd(p)) + '\n</script>\n'
    imp_block = ('<!-- FWL-IMPORTER-BEGIN ' + imp[0] + ' -->\n'
                 + f"<script>window.__FWL_IMPORTER_KIND = '{imp[0]}';</script>\n"
                 + ('<script>(function () {\n' + _inl(_rd(imp[1])) + '\n}).call(window);</script>\n' if imp[1] else '')
                 + "<script>if (!window.FWLImporter && !window.__FWL_IMPORTER_ERR) window.__FWL_IMPORTER_ERR = '导入模块未加载';</script>\n"
                 + '<!-- FWL-IMPORTER-END -->\n')
    whtml = f'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>烟花工坊</title>
<style>
{wcss}</style>
</head>
<body>
{body}
{_rd(shell_dir, 'shell.html')}
{data_js}{imp_block}<script>
'use strict';
{_inl(js)}</script>
<script>
{_inl(shell_js)}</script>
</body>
</html>
'''
    open(os.path.join(here, '烟花工坊.html'), 'w', encoding='utf-8').write(whtml)
    print('built 烟花工坊.html', len(whtml), 'bytes；导入模块', imp[0], '；制作区', '4.9 界面（外壳兜底样式）' if fb else 'v3.7 槽位')
    # 外壳脚本也过一遍 lint（和烘焙器脚本接成一段查，外壳读烘焙器的 VERSION、UPDATES、repoDir 等名字要找得到）
    if node and shell_js:
        import tempfile
        with tempfile.TemporaryDirectory() as td:
            tf = os.path.join(td, 'workshop_lint.html')
            open(tf, 'w', encoding='utf-8').write('<html><body>\n' + ''.join(f'<script src="data/{f}"></script>\n' for f in ('review.js', 'standard.js', 'thumbs.js', 'size_spec.js')) + "<script>\n'use strict';\n" + js + '\n' + shell_js + '</script>\n</body></html>\n')
            r = subprocess.run([node, '--expose-internals', os.path.join(here, 'lint', 'js_lint.mjs'), tf], capture_output=True, text=True)
            print('外壳 lint：' + (r.stdout.strip() or 'ok')); bad |= r.returncode != 0
            if r.returncode not in (0, 1): print(r.stderr.strip())

if bad:
    print('构建完成，但静态检查有错误（见上）'); sys.exit(1)

# Private local deployment is a separate, gitignored sidecar, never public HTML.
from local_delivery.prepare_local import prepare
if prepare(here):
    print('本机导入组件已部署（不进入公共 HTML / Git）')
