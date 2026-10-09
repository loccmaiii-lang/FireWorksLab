"""4.9.57 火花形状 / 亮度随机（对话框相机渲染，用户 10-09 23:20「每个火花粒子都要有强烈的发光感，同时边缘锐利、轮廓清晰……粒子形状为不规则多边形（每个粒子形态各异）」，参数变更记录 2026-10-09 一条）。
参数名称表 / 发射器表：在 sparkStretchJit 后面加 sparkShape、sparkShapeIrr、sparkShapeSpin、sparkBrightJit 四行（发射器 = 火花，模块 = 大小 / 外观）。
BASE、SCHEMA 已手改（10_types.js）。可以重复跑：已经加过的跳过。
用法：python3 analysis/scripts/加参数_火花形状.py
"""
import csv, io, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
NOTE = '4.9.57（对话框相机渲染，用户 10-09 23:20）加；缺省圆 / 不随机 = 以前逐像素不变。依据 analysis/probe/星头光晕诊断_2026-10-09/诊断.md 第 8 节（Blender R4 火花 = 随机朝向的小多面体、平面自发光削顶、无运动模糊）。'
CHECK = '41_particles40.js polyVS40 / polyCov40 / spkPolyProgram40；40_gl.js drawSparksGPU；基准回归'
AFTER = 'sparkStretchJit'
NEW = [
    dict(key='sparkShape', cn='火花形状', short='形状', en='Sparkler Shape', unit='', rng='0 圆 / 1 不规则多边形', default='0',
         desc='每粒火花画成什么形状：圆（以前），或不规则多边形——每粒 4–7 条边、顶点远近和间隔随机、朝向随机，像 Blender 里随机朝向的小碎块；边缘按像素 4 × 4 取样，锐利不糊。总光量和同直径的圆一样。亮核半径不到 0.6 像素时形状看不出来，照旧按圆算。',
         updown='切到多边形：近看每粒是一块有棱角的亮片，形状各不相同。', ue='烘进贴图（GPU 光点没有）'),
    dict(key='sparkShapeIrr', cn='多边形不规则程度', short='不规则', en='Sparkler Shape Irregularity', unit='', rng='0–1', default='0.6',
         desc='0 = 正多边形；越大顶点离中心的远近、顶点之间的间隔差得越多，形状越像碎片。火花形状 = 多边形才起作用。', updown='调大：棱角更乱、更像碎屑。', ue='烘进贴图'),
    dict(key='sparkShapeSpin', cn='多边形翻转', short='翻转', en='Sparkler Shape Spin', unit='圈/s', rng='0–3', default='0.5',
         desc='每粒火花一边飞一边转，转速在 ± 这么多圈 / 秒里随机（每粒固定），所以同一粒的轮廓在帧之间慢慢变。火花形状 = 多边形才起作用。', updown='调大：闪烁感更强（轮廓变得快）。', ue='烘进贴图'),
    dict(key='sparkBrightJit', cn='火花亮度随机', short='亮度随机', en='Sparkler Brightness Random', unit='', rng='0–1.5', default='0',
         desc='每粒火花一个固定的亮度倍数（对数正态，σ = 这个数，均值 1）：有的很亮、有的暗。和「火花闪烁」（随时间变）不同，这个跟着这粒火花一辈子。Blender 的 R4 火花是 0.3–1.8 倍。', updown='调大：亮暗差得更多，亮的那些更显眼。', ue='烘进贴图'),
]
rows = json.loads(NAMES_J.read_text(encoding='utf-8'))
eml = json.loads(EMIT_J.read_text(encoding='utf-8'))
log = []
have = {r['key'] for r in rows}
src = next(r for r in rows if r['key'] == AFTER)
for i, p in enumerate(NEW):
    if p['key'] in have: continue
    at = max(j for j, r in enumerate(rows) if r['key'] in [AFTER] + [q['key'] for q in NEW]) + 1
    rows.insert(at, {'sec': src['sec'], 'key': p['key'], 'old': '（4.9.53 新加）', 'module_cn': src['module_cn'], 'module_en': src['module_en'], 'en': p['en'], 'en_niagara': False, 'cn': p['cn'],
                     'desc': p['desc'], 'updown': p['updown'], 'unit': p['unit'], 'range': p['rng'], 'default': p['default'], 'random': '',
                     'ue': p['ue'], 'tag': '烘焙器专有', 'note': NOTE, 'check': CHECK, 'family': src.get('family', '烘焙输出'),
                     'id': f"4956-{i + 1:02d}-{p['key']}", 'tier': 'more'})
    have.add(p['key']); log.append('名称表 +' + p['key'])
PE = eml['参数']; haveE = {r['key'] for r in PE}
srcE = next(r for r in PE if r['key'] == AFTER)
for i, p in enumerate(NEW):
    if p['key'] in haveE: continue
    at = max(j for j, r in enumerate(PE) if r['key'] in [AFTER] + [q['key'] for q in NEW]) + 1
    PE.insert(at, {'id': f"4956-{i + 1:02d}-{p['key']}", 'sec': srcE['sec'], 'key': p['key'], '全名': p['cn'], '发射器': srcE['发射器'], '模块': srcE['模块'], '名': p['short'],
                   '类别': srcE.get('类别', '引擎字段'), '单位': p['unit'] or '1'})
    haveE.add(p['key']); log.append('发射器表 +' + p['key'])
for r in PE:
    if r['key'] in [q['key'] for q in NEW] and not r.get('单位'): r['单位'] = '1'; log.append('发射器表 单位 ' + r['key'])
NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
nl = '\r\n' if '\r\n' in raw else '\n'
buf = io.StringIO(); w = csv.writer(buf, lineterminator=nl); w.writerow(hdr)
for r in rows: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
NAMES_C.write_bytes(('\ufeff' + buf.getvalue().rstrip('\r\n')).encode('utf-8'))
EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
print('\n'.join(log) or '已经做过')
