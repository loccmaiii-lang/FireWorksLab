#!/usr/bin/env python3
"""静态核对（排查计划第 1 步，对话框15，2026-10-04）：不开浏览器、纯文本的交叉核对，build.py 每次构建都跑。

1. 页面元素 id：tool/src/body.html 和脚本里造出来的 id（id="…"、.id = '…'）↔ 脚本里用到的 $('#…') / getElementById / querySelector('#…')。
   用到了却哪里都没有 → 错误（点了没反应、或者整段报错）；body.html 里有、脚本从不碰 → 只提示。
2. 两张命名表：参数名称表.json 的 id 不重复；发射器表.json 每一行都对得上名称表的 id（反过来名称表每一行都在发射器表里）；
   发射器、模块都在发射器表上半的定义里。对不上 → 错误（面板上那一行会掉进「其它」或找不到名字）。
3. 参数归属在浏览器里才查得全（SCHEMA 的显示条件要跑）：界面状态检查 P1 / N2 管。

  python3 analysis/scripts/静态核对.py        退出码 0 = 没有错误
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'tool' / 'src'
errors, warns = [], []

# ---- 1. id ----
body = (SRC / 'body.html').read_text(encoding='utf-8')
js = {p.name: p.read_text(encoding='utf-8') for p in sorted((SRC / 'js').glob('*.js'))}
defined = set(re.findall(r'\bid="([\w-]+)"', body))
made = set()
for name, s in js.items():
    made |= set(re.findall(r'\bid=\\?"([\w-]+)\\?"', s)) | set(re.findall(r"\bid='([\w-]+)'", s))
    made |= set(re.findall(r"\.id\s*=\s*['\"]([\w-]+)['\"]", s))
    made |= set(re.findall(r"setAttribute\(\s*['\"]id['\"]\s*,\s*['\"]([\w-]+)['\"]", s))
dyn_prefix = set()
for s in js.values():      # id="p-${k}" 这类拼出来的：记前缀，用到时按前缀放过
    dyn_prefix |= set(re.findall(r'\bid="([\w-]*)\$\{', s)) | set(re.findall(r"\bid\s*=\s*`([\w-]*)\$\{", s)) | set(re.findall(r"\.id\s*=\s*`([\w-]*)\$\{", s))
    dyn_prefix |= set(re.findall(r"\.id\s*=\s*'([\w-]+)'\s*\+", s))
used = {}
for name, s in js.items():
    for rx in (r"\$\(\s*'#([\w-]+)", r'\$\(\s*"#([\w-]+)', r"getElementById\(\s*'([\w-]+)'", r'getElementById\(\s*"([\w-]+)"',
               r"querySelector(?:All)?\(\s*'#([\w-]+)", r'querySelector(?:All)?\(\s*"#([\w-]+)', r"querySelector(?:All)?\(\s*`#([\w-]+)"):
        for m in re.finditer(rx, s):
            used.setdefault(m.group(1), []).append(f'{name}:{s[:m.start()].count(chr(10)) + 1}')
for i, where in sorted(used.items()):
    if i in defined or i in made or any(p and i.startswith(p) for p in dyn_prefix): continue
    errors.append(f'id「#{i}」脚本里用到（{", ".join(where[:3])}），body.html 和脚本里都没有这个元素')
alljs = '\n'.join(js.values())
for i in sorted(defined):
    if i not in used and f"'{i}'" not in alljs and f'"{i}"' not in alljs and f'#{i}' not in alljs and f'#{i}' not in (SRC / 'style.css').read_text(encoding='utf-8'):
        warns.append(f'body.html 里的 #{i} 脚本和样式都没用到')

# ---- 2. 命名表 ----
NM = ROOT / 'analysis' / '命名'
rows = json.loads((NM / '参数名称表.json').read_text(encoding='utf-8'))
ids = [r['id'] for r in rows]
for i in sorted({i for i in ids if ids.count(i) > 1}): errors.append(f'参数名称表 id「{i}」重复')
et = json.loads((NM / '发射器表.json').read_text(encoding='utf-8'))
E = {e['名']: e for e in et['发射器']}
eids = [r['id'] for r in et['参数']]
for i in sorted({i for i in eids if eids.count(i) > 1}): errors.append(f'发射器表 id「{i}」重复')
for r in et['参数']:
    if r['id'] not in set(ids): errors.append(f'发射器表「{r["id"]}」在参数名称表里没有')
    e = E.get(r['发射器'])
    if not e: errors.append(f'发射器表「{r["id"]}」的发射器「{r["发射器"]}」没定义')
    elif r['模块'] not in e['模块']: errors.append(f'发射器表「{r["id"]}」的模块「{r["模块"]}」不在「{r["发射器"]}」的模块列表里')
    if not str(r.get('名', '')).strip(): errors.append(f'发射器表「{r["id"]}」没有短名')
for i in ids:
    if i not in set(eids): errors.append(f'参数名称表「{i}」不在发射器表里（面板上会掉进「其它」）')
for e in et['发射器']:
    used_m = {r['模块'] for r in et['参数'] if r['发射器'] == e['名']}
    for m in e['模块']:
        if m not in used_m: warns.append(f'发射器「{e["名"]}」的模块「{m}」没有参数')

for e in errors: print('❌ ' + e)
if '--warn' in sys.argv:
    for w in warns: print('⚠ ' + w)
print(f'静态核对：{len(errors)} 个错误、{len(warns)} 个提示{"（--warn 看提示）" if warns and "--warn" not in sys.argv else ""}')
sys.exit(1 if errors else 0)
