"""4.9.21 效果 › 整体调整（对话框23，用户 10-06 21:51「就按照之前的全局风格帮我加回去，放在效果层里，类似一个最后的全局调整」，选「每层一份」）
+ 删「放大的中心」prePivot（用户 21:51 问入点前「先从下往上生长」，选「一律绕爆点」）。
- 参数名称表 / 发射器表各加 6 行（adjTailLen / adjSparkSize / adjSpread / adjHeadSize / adjSparkBright / adjTwinkle），放在「尾迹外形」前面；
- 粗细随机 tailJit、亮肩 tailShoulder、泪滴星头 headTear 在发射器表里挪到「效果 › 整体调整」（含义不变，只改面板位置和短名）；
- 删 prePivot 两张表的行；「效果」发射器的模块表加「整体调整」。
BASE、SCHEMA 已手改（10_types.js）。可以重复跑：已经做过的跳过。
用法：python3 analysis/scripts/加参数_整体调整.py
"""
import csv, io, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
SEC = '整体调整'
NOTE = '4.9.21（对话框23，用户 10-06 21:51「就按照之前的全局风格帮我加回去，放在效果层里，类似一个最后的全局调整」）加：照 4.1.1 全局风格层，每层一份；1 = 原样（不进新代码）。只给人手调，AI 拟合 / 配方保持 1（参数宪章第 3 条例外 2）。'
CHECK = '10_types.js fxP / ADJ_DEF；入口：20_sim.js Sim、40_gl.js buildTrack、50_bake.js bake / makeRenderer、30_plan.js measure / plan、48_render40.js 实时模拟、80_render.js 多层实时、79_curves.js sparkTailEnd、79_workbench.js layerEndOf、67_fwlcombo.js dotsES'
ADJ = [
    dict(key='adjTailLen', cn='尾长（整体倍数）', short='尾长', en='Tail Length Scale', rng='0.3–3',
         desc='这一层的火花寿命和余烬寿命一起乘这个数：整条尾迹（含余烬暗长线）一起变长 / 变短。',
         updown='调大：尾迹更长、拖得更久；调小：尾迹变短。1 = 原样。',
         ue='只影响烘焙出的贴图（等于把「火花寿命」「余烬寿命」乘这个数再烘）；余烬设了「熄灭时刻」的到那一刻照样灭'),
    dict(key='adjSparkSize', cn='尾缀粗细（整体倍数）', short='尾缀粗细', en='Sparkler Size Scale', rng='0.3–3',
         desc='这一层的火花大小乘这个数；余烬（× 余烬大小）、分叉火花（× 分叉火花大小倍数）按比例跟着变。',
         updown='调大：火花颗粒更粗、尾迹更饱满（4.0 下也更亮）；调小：更细更暗。1 = 原样。',
         ue='只影响烘焙出的贴图（等于把「火花大小」乘这个数再烘）'),
    dict(key='adjSpread', cn='尾缀散布（整体倍数）', short='尾缀散布', en='Sparkler Spread Scale', rng='0.3–3',
         desc='这一层的火花速度随机乘这个数：火花离开星时向四周散得更开或更收。',
         updown='调大：尾迹更宽、更松散；调小：火花贴着星的轨迹，尾迹更细。1 = 原样。',
         ue='只影响烘焙出的贴图（等于把「火花速度随机」乘这个数再烘）'),
    dict(key='adjHeadSize', cn='星头大小（整体倍数）', short='星头大小', en='Head Size Scale', rng='0.3–3',
         desc='这一层的星头大小乘这个数（千轮 / 分裂子星跟着主星大小的也跟着变）。',
         updown='调大：星头更大更醒目；调小：星头更细。1 = 原样。',
         ue='只影响烘焙出的贴图；导出成 GPU 光点时光点直径也乘'),
    dict(key='adjSparkBright', cn='火花亮度（整体倍数）', short='火花亮度', en='Sparkler Brightness Scale', rng='0.3–3',
         desc='这一层的火花亮度（含余烬）乘这个数，只改明暗不改形状。',
         updown='调大：尾迹整体更亮、容易过曝发白；调小：更暗。1 = 原样。',
         ue='只影响烘焙出的贴图（等于把「火花亮度」乘这个数再烘）'),
    dict(key='adjTwinkle', cn='闪烁（整体倍数）', short='闪烁', en='Sparkler Flicker Scale', rng='0–3',
         desc='这一层的火花闪烁乘这个数；乘完最多到 1（再大亮度会出负数）。',
         updown='调大：火花忽明忽暗更明显；调小：更平滑，0 = 不闪。1 = 原样。',
         ue='只影响烘焙出的贴图（等于把「火花闪烁」乘这个数再烘）'),
]
MOVE = {'tailJit': '粗细随机', 'tailShoulder': '亮肩', 'headTear': '泪滴星头'}

rows = json.loads(NAMES_J.read_text(encoding='utf-8'))
eml = json.loads(EMIT_J.read_text(encoding='utf-8'))
log = []
# 1 名称表：加 6 行（尾迹外形前面）、删 prePivot
have = {(r['sec'], r['key']) for r in rows}
at = min(i for i, r in enumerate(rows) if r['sec'] == '尾迹外形')
for n, p in enumerate(ADJ):
    if (SEC, p['key']) in have: continue
    rows.insert(at + n, {'sec': SEC, 'key': p['key'], 'old': p['cn'], 'module_cn': SEC, 'module_en': 'Global Adjust', 'en': p['en'], 'en_niagara': False, 'cn': p['cn'],
                         'desc': p['desc'], 'updown': p['updown'], 'unit': '×', 'range': p['rng'], 'default': '1', 'random': '',
                         'ue': p['ue'], 'tag': '通用', 'note': NOTE, 'check': CHECK, 'family': '空中礼花', 'id': f"4921-{n + 1:02d}-{p['key']}", 'tier': 'core'})
    log.append('名称表 +' + p['key'])
n0 = len(rows); rows = [r for r in rows if r['key'] != 'prePivot']
if len(rows) != n0: log.append('名称表 −prePivot')
# 2 发射器表：加 6 行、挪 3 行到「效果 › 整体调整」、删 prePivot
P = eml['参数']; haveE = {r['key'] for r in P}
new = [{'id': f"4921-{n + 1:02d}-{p['key']}", 'sec': SEC, 'key': p['key'], '全名': p['cn'], '发射器': '效果', '模块': SEC, '名': p['short'], '类别': '物理量', '单位': '×'}
       for n, p in enumerate(ADJ) if p['key'] not in haveE]
moved = []
for r in list(P):
    if r['key'] in MOVE and (r['发射器'], r['模块']) != ('效果', SEC):
        r['发射器'], r['模块'], r['名'] = '效果', SEC, MOVE[r['key']]; moved.append(r); P.remove(r); log.append('发射器表 挪 ' + r['key'])
if new or moved:
    at = min(i for i, r in enumerate(P) if r.get('sec') == '尾迹外形')
    P[at:at] = new + sorted(moved, key=lambda r: list(MOVE).index(r['key']))
    log += ['发射器表 +' + r['key'] for r in new]
n0 = len(P); eml['参数'] = P = [r for r in P if r['key'] != 'prePivot']
if len(P) != n0: log.append('发射器表 −prePivot')
for e in eml['发射器']:
    if e['名'] == '效果':
        if SEC not in e['模块']: e['模块'].append(SEC); log.append('效果 模块 +整体调整')
        e['说明'] = '整个效果共用：规格、时长、随机种子、环境（风、湍流）；最后的整体调整（尾长、粗细、亮度……每层一份）'
NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
buf = io.StringIO(); w = csv.writer(buf, lineterminator='\r\n'); w.writerow(hdr)
for r in rows: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
NAMES_C.write_bytes(('﻿' + buf.getvalue().rstrip('\r\n')).encode('utf-8'))
EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
print('\n'.join(log) or '已经做过')
