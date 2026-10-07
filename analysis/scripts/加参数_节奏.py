"""4.9.30 效果 › 整体调整 › 节奏（对话框新花型，用户 10-07 13:31「1.加……5.现在这个节奏就是我测试进游戏的功能，不能等之后做」；方案 协作/方案_节奏_2026-10-07.md）
- 参数名称表 / 发射器表各加 2 行：tempo（物理量，×）、info:tempoInfo（只读结果行：整段 / 帧数 / 平均 fps / 整段想要几秒 / 试算），放在「整体调整」最前面。
BASE、SCHEMA 已手改（10_types.js），换算在 tool/src/js/12_tempo.js。可以重复跑：已经做过的跳过。
用法：python3 analysis/scripts/加参数_节奏.py
"""
import csv, io, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
SEC = '整体调整'
NOTE = '4.9.30（对话框新花型，用户 10-07 12:58「有些预设你做出来的我想要一个整体快一些的，我要调好多参数」、13:31「1.加」）加：整个效果一个值，多层所有空中层一起；直接改写存的参数（和号数一样）。参数宪章第 3 条例外 3。'
CHECK = '12_tempo.js retimeP / retimeM / applyTempo；10_types.js applyShellNo 末尾 retimeShellKeys；70_ui.js 滑杆 tempo 分支、info 行 tempoInfo；检查 analysis/scripts/节奏检查.py'
NEW = [
    dict(key='tempo', id='4930-01-tempo', cn='节奏（整体快慢）', short='节奏', en='Tempo', unit='×', rng='0.3–3', default='1', cat='物理量',
         desc='同一朵花放快 / 放慢：时刻和时长 ÷ 倍数、速度 × 倍数、重力 × 倍数²、频率 / 生成率 / 线性阻力 × 倍数，变色时刻跟着；大小、形状、颜色、亮度不变。整个效果一个值：多层时所有空中层一起换算，层的开始时间跟着。',
         updown='调大：整朵更快放完（整段更短，贴图张数不变时帧率更高、下坠也更快）；调小：更慢、更长（帧率更低）。1 = 原样，改回 1 就换算回去。',
         ue='不直接写进引擎：换算后重新烘焙，序列帧按新的整段重排；导出的寿命、延迟、速度、阻力、加速度跟着新参数算'),
    dict(key='info:tempoInfo', id='4930-02-info:tempoInfo', cn='节奏：整段与帧率', short='整段与帧率', en='Tempo Result', unit='', rng='', default='—', cat='只读',
         desc='只读：现在的节奏、整段几秒、这一层烘了几帧几张、平均几 fps；可以直接填「整段想要几秒」、点几个常用节奏，或试算几档节奏下的帧数 / 张数 / 最慢 fps / 每帧最多跳几像素（不烘，只排帧）。',
         updown='不能调（只显示结果；按钮改的是上面的「节奏」）。', ue='不写进引擎（结果预览）'),
]
rows = json.loads(NAMES_J.read_text(encoding='utf-8'))
eml = json.loads(EMIT_J.read_text(encoding='utf-8'))
log = []
have = {r['key'] for r in rows}
at = min(i for i, r in enumerate(rows) if r['sec'] == SEC)
n = 0
for p in NEW:
    if p['key'] in have: continue
    rows.insert(at + n, {'sec': SEC, 'key': p['key'], 'old': p['cn'], 'module_cn': SEC, 'module_en': 'Global Adjust', 'en': p['en'], 'en_niagara': False, 'cn': p['cn'],
                         'desc': p['desc'], 'updown': p['updown'], 'unit': p['unit'], 'range': p['rng'], 'default': p['default'], 'random': '',
                         'ue': p['ue'], 'tag': '通用', 'note': NOTE, 'check': CHECK, 'family': '空中礼花', 'id': p['id'], 'tier': 'core'})
    n += 1; log.append('名称表 +' + p['key'])
P = eml['参数']; haveE = {r['key'] for r in P}
new = [{'id': p['id'], 'sec': SEC, 'key': p['key'], '全名': p['cn'], '发射器': '效果', '模块': SEC, '名': p['short'], '类别': p['cat'], '单位': p['unit']} for p in NEW if p['key'] not in haveE]
if new:
    at = min(i for i, r in enumerate(P) if r.get('sec') == SEC)
    P[at:at] = new; log += ['发射器表 +' + r['key'] for r in new]
for e in eml['发射器']:
    if e['名'] == '效果' and '节奏' not in e.get('说明', ''):
        e['说明'] = e.get('说明', '') + '；节奏（整体快慢，整个效果一个值）'; log.append('效果 说明 +节奏')
NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
buf = io.StringIO(); w = csv.writer(buf, lineterminator='\r\n'); w.writerow(hdr)
for r in rows: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
NAMES_C.write_bytes(('﻿' + buf.getvalue().rstrip('\r\n')).encode('utf-8'))
EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
print('\n'.join(log) or '已经做过')
