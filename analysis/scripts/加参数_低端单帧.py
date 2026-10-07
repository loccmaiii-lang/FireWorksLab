"""4.9.29 低端包 / 单帧（对话框23，用户 10-07 09:41「我还希望有一个单帧导出功能，与单帧溶解图功能」、09:54、12:40「单独一份低端包，贴图名尾巴加_MB」）。
参数名称表 / 发射器表各加 7 行（outLow / lowPick / lowAt / lowSize / lowJit / lowMaps / lowSuffix），放在「单束随机感」后面。
BASE、SCHEMA 已手改（10_types.js）。可以重复跑：已经做过的跳过。
（只读结果行 info:lowAtNow「单帧取的时刻」是手加的，名称表 / 发射器表各 1 行）
用法：python3 analysis/scripts/加参数_低端单帧.py
4.9.35（用户 10-07 18:50「低端这个分类应该不需要，直接合入产物表里」）：outLow 删了，这个脚本作废（再跑会把 outLow 加回去），留着只当记录。
"""
import csv, io, json, pathlib, sys
sys.exit('4.9.35 起 outLow 已删（低端并进产物表），这个脚本作废')
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
NOTE = '4.9.29（对话框23，用户 10-07 09:41 / 09:54 / 12:40）加。单层存在效果参数里（导出方案的键，改了不重烘大面片），多层存在层上（L.out.low、L.lowPick…，层页头「导出方案」）。缺省「不出」：以前的素材包逐字不变。'
CHECK = '68_lowframe.js lowOf / bakeLow / fwlLow / lowFiles / drawLowLayer；67_fwlcombo.js 导出；80_render.js 低端平台；40_gl.js FS_LOW；61_naming.js 低端命名；79_workbench.js 产物表低端列'
NEW = [
    dict(key='outLow', cn='低端导出', en='Low-end Export', unit='', rng='', default='不出', cat='引擎字段',
         desc='低端包（cascade_low.json，贴图名末尾加 _MB）里这一层怎么出：单帧（一张图 + Size By Life / Alpha，配功能图）/ 序列（和手机同一张贴图）/ 不出。',
         updown='选单帧：低端机把贴图再压一档时整张给一个画面，比 4×4 序列清楚；没有序列的动态，靠 Size By Life、Alpha 和功能图。',
         ue='单帧 = 1 × 1 格的序列材质（灰度 + Ramp，帧号 0）；彩色单帧和功能图随包（extras），溶解材质对上以后再接'),
    dict(key='lowPick', cn='单帧取哪一刻', en='Single Frame Pick', unit='', rng='', default='某一帧', cat='引擎字段',
         desc='某一帧 = 时间轴上的一刻（缺省自动取花开得最大那一刻）；长曝光 = 入点到出点之间每个像素取最亮，一整朵带尾迹的「太阳」。',
         updown='某一帧：干净，像定格；长曝光：尾迹全在，更满更亮。两种在引擎回放里能并排比。', ue='只影响单帧贴图'),
    dict(key='lowAt', cn='单帧时刻', en='Single Frame Time', unit='s', rng='0–30', default='0', cat='引擎字段',
         desc='单帧取的时刻（从爆点算）；0 = 自动：花开得最大的那一刻。右栏有「用时间轴现在的时刻」。',
         updown='调早：花还小、更亮；调晚：花更大、尾迹更长。', ue='只影响单帧贴图；Size By Life 从开花长到这一刻'),
    dict(key='lowSize', cn='单帧贴图大小', en='Single Frame Size', unit='px', rng='512 / 1024 / 2048', default='1024', cat='引擎字段',
         desc='单帧贴图边长（一整张就是一个画面）；功能图最大 512。', updown='调大：更清楚，显存更多。', ue='贴图尺寸'),
    dict(key='lowJit', cn='溶解错落', en='Dissolve Jitter', unit='', rng='0–1', default='0.3', cat='引擎字段',
         desc='溶解图里，按 2 × 2 像素一小块给熄灭时刻加一点随机：0 = 完全按模拟（每个像素最后亮着的时刻），1 = 很碎。',
         updown='调大：消失时更像一颗颗火星错落地灭；调小：更整齐地从里往外退。', ue='只影响功能图'),
    dict(key='lowMaps', cn='功能图', en='Feature Maps', unit='', rng='D / C / A', default='D + C + A', cat='引擎字段',
         desc='合并成一张的功能图：D 溶解（每个像素最后亮着的时刻）、C 轮廓（单帧有内容的地方外扩 3 像素）、A 出现顺序（第一次亮的时刻）；按 D → R、C → G、A → B 放。',
         updown='少勾一种，这张图就少一个通道。', ue='一张线性贴图（不勾 sRGB），每个通道放什么写在 cascade_low.json 的 extras'),
    dict(key='lowSuffix', cn='功能图后缀', en='Feature Map Suffix', unit='', rng='', default='（空 = 按勾的 D / C / A）', cat='引擎字段',
         desc='功能图文件名的后缀，你填（例：溶解 + 轮廓 = DC）；空 = 按勾的几种自动拼。只要字母和数字，最多 8 个。',
         updown='', ue='贴图名 / UE 资产名 …_1x1_01_<后缀>'),
]

rows = json.loads(NAMES_J.read_text(encoding='utf-8'))
eml = json.loads(EMIT_J.read_text(encoding='utf-8'))
log = []
have = {r['key'] for r in rows}
at = max(i for i, r in enumerate(rows) if r['key'] == 'unitRandom') + 1
for n, p in enumerate([p for p in NEW if p['key'] not in have]):
    rows.insert(at + n, {'sec': '导出方案', 'key': p['key'], 'old': '（4.9.29 新加）', 'module_cn': '烘焙输出', 'module_en': 'Bake Output', 'en': p['en'], 'en_niagara': False, 'cn': p['cn'],
                         'desc': p['desc'], 'updown': p['updown'], 'unit': p['unit'], 'range': p['rng'], 'default': p['default'], 'random': '',
                         'ue': p['ue'], 'tag': '烘焙输出', 'note': NOTE, 'check': CHECK, 'family': '烘焙输出', 'id': f"4929-{NEW.index(p) + 1:02d}-{p['key']}", 'tier': 'core'})
    log.append('名称表 +' + p['key'])
P = eml['参数']; haveE = {r['key'] for r in P}
new = [{'id': f"4929-{NEW.index(p) + 1:02d}-{p['key']}", 'sec': '导出方案', 'key': p['key'], '全名': p['cn'], '发射器': '输出', '模块': '导出方案', '名': p['cn'], '类别': p['cat'], '单位': p['unit']}
       for p in NEW if p['key'] not in haveE]
if new:
    at = max(i for i, r in enumerate(P) if r['key'] == 'unitRandom') + 1
    P[at:at] = new; log += ['发射器表 +' + r['key'] for r in new]
NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
buf = io.StringIO(); w = csv.writer(buf, lineterminator='\r\n'); w.writerow(hdr)
for r in rows: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
NAMES_C.write_bytes(('﻿' + buf.getvalue().rstrip('\r\n')).encode('utf-8'))
EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
print('\n'.join(log) or '已经做过')
