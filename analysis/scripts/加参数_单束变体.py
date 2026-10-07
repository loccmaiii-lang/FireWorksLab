"""4.9.28 单束变体数 / 随机感（对话框23，用户 10-07 09:20「这些效果要对粗细、长短或多个不同种子一起组合，提升随机感，降低随机感」，
11:45 选「变体数 + 随机感（推荐）」）。参数名称表 / 发射器表各加 2 行（unitVariants / unitRandom），放在「光点亮度」后面。
BASE、SCHEMA 已手改（10_types.js）。可以重复跑：已经做过的跳过。
用法：python3 analysis/scripts/加参数_单束变体.py
"""
import csv, io, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
NOTE = '4.9.28（对话框23，用户 10-07 09:20「同时这些效果要对粗细、长短或多个不同种子一起组合，提升随机感，降低随机感」；11:45 选「变体数 + 随机感」）加。单层存在效果参数里（导出方案的键，改了不重烘大面片、只重烘单束），多层存在层上（L.unitVariants / L.unitRandom，层页头「导出方案」）。缺省 1 / 0 = 以前那一张，cascade.json 逐字不变。'
CHECK = '67_fwlcombo.js unitVarOf / unitVarPs / bakeUnitSet / fwlUnit；80_render.js drawUnitLayer；40_gl.js VS_UNIT（uId0、uSJ）；61_naming.js namingSheets；79_workbench.js 产物表 / 层页头'
NEW = [
    dict(key='unitVariants', cn='单束变体数', en='Unit Variants', unit='张', rng='1–4', default='1', cat='引擎字段',
         desc='PC 出单束时，这一层烘几张单束贴图：每张换一个种子（火花纹路不同），星数平分，每张一个发射器。',
         updown='调大：星和星之间更不一样（贴图、材质、发射器各多一份，粒子总数不变）；1 = 以前那一张。',
         ue='每张一个 CPU 发射器（Unit、Unit_V2…），贴图序号 01…04'),
    dict(key='unitRandom', cn='单束随机感', en='Unit Randomness', unit='', rng='0–1', default='0', cat='引擎字段',
         desc='① 几张单束之间粗细（火花大小、星头大小 × 1 ± 0.4 × 本值）和长短（尾长 × 1 ± 0.35 × 本值）拉开多少；② Cascade 里每颗星的大小随机（宽 ± 25 % × 本值、长 ± 20 % × 本值），一张也有用。',
         updown='调大：粗细、长短更参差、更自然；0 = 每颗星一样大。',
         ue='Initial Size 改成均匀分布（宽 / 长各自随机，未经 UE 验证）；变体之间的粗细、长短烘在贴图里'),
]

rows = json.loads(NAMES_J.read_text(encoding='utf-8'))
eml = json.loads(EMIT_J.read_text(encoding='utf-8'))
log = []
have = {r['key'] for r in rows}
at = max(i for i, r in enumerate(rows) if r['key'] == 'dotBright') + 1
for n, p in enumerate([p for p in NEW if p['key'] not in have]):
    rows.insert(at + n, {'sec': '导出方案', 'key': p['key'], 'old': '（4.9.28 新加）', 'module_cn': '烘焙输出', 'module_en': 'Bake Output', 'en': p['en'], 'en_niagara': False, 'cn': p['cn'],
                         'desc': p['desc'], 'updown': p['updown'], 'unit': p['unit'], 'range': p['rng'], 'default': p['default'], 'random': '',
                         'ue': p['ue'], 'tag': '烘焙输出', 'note': NOTE, 'check': CHECK, 'family': '烘焙输出', 'id': f"4928-{NEW.index(p) + 1:02d}-{p['key']}", 'tier': 'core'})
    log.append('名称表 +' + p['key'])
P = eml['参数']; haveE = {r['key'] for r in P}
new = [{'id': f"4928-{NEW.index(p) + 1:02d}-{p['key']}", 'sec': '导出方案', 'key': p['key'], '全名': p['cn'], '发射器': '输出', '模块': '导出方案', '名': p['cn'], '类别': p['cat'], '单位': p['unit']}
       for p in NEW if p['key'] not in haveE]
if new:
    at = max(i for i, r in enumerate(P) if r['key'] == 'dotBright') + 1
    P[at:at] = new; log += ['发射器表 +' + r['key'] for r in new]
NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
buf = io.StringIO(); w = csv.writer(buf, lineterminator='\r\n'); w.writerow(hdr)
for r in rows: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
NAMES_C.write_bytes(('﻿' + buf.getvalue().rstrip('\r\n')).encode('utf-8'))
EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
print('\n'.join(log) or '已经做过')
