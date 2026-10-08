"""4.9.48 星头 / 火花形状与随机、粗细按米重理（对话框23，用户 10-08 15:56 / 16:1x / 16:2x，参数变更记录 2026-10-08 一条）。
参数名称表 / 发射器表：加 10 行（星头 8 个放在 headSize 后面，火花 2 个放在 sparkSize 后面），改 6 行的名字 / 位置（sparkSize、sparkSpread、tailJit、adjSparkSize、adjSpread、tailWidth）。
BASE、SCHEMA 已手改（10_types.js）。可以重复跑：已经做过的跳过 / 覆盖成同样的值。
用法：python3 analysis/scripts/加参数_星头形状.py
"""
import csv, io, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
NOTE = '4.9.48（对话框23，用户 10-08 15:56「它的亮核就不是所有都是圆形的……星头大小还无法随机」，16:2x 选拖影亮结 / 边缘起伏 / 双核 / 六边形）加；默认 0 = 以前逐像素不变。'
CHECK = '20_sim.js headShapeOf / headShapePush；41_particles40.js hexFS40 / spkStretchVS40；W33'
HEAD = dict(sec='炭头（星头）', module_cn='星头', module_en='Head', emitter='星', after='headSize')
SPARK = dict(sec='尾缀（炭火火花）', module_cn='火花', module_en='Sparkler (Child Emitter)', emitter='火花', after='sparkSize')
NEW = [
    (HEAD, dict(key='headSizeJit', cn='星头大小随机', short='大小随机', en='Head Size Random', unit='', rng='0–1', default='0',
        desc='每颗星的星头一个固定的大小倍数（对数正态，σ = 0.6 × 这个数），平均大小不变：有的星头大、有的小。',
        updown='调大：星头大小差得更多（1 时大约 0.3–3 倍）。', ue='序列 / 单束烘进贴图；GPU 光点放宽 Initial Size 的范围')),
    (HEAD, dict(key='headStretch', cn='星头拉长', short='拉长', en='Head Stretch', unit='', rng='0–3', default='0',
        desc='星头沿运动方向拉成短拖影，长度 = 这个数 × 星的速度 × 1/30 s（1 = 30 fps 一帧的相机拖影），拖在星的后面；跑得快拉得长、慢下来变圆。总光量不变：拉得越长，面亮度越低。',
        updown='调大：开花时星头像一条条短线，后段变回圆点。', ue='烘进贴图（GPU 光点没有）')),
    (HEAD, dict(key='headStretchJit', cn='星头拉长随机', short='拉长随机', en='Head Stretch Random', unit='', rng='0–1', default='0',
        desc='每颗星的拉长一个固定倍数（对数正态，σ = 0.6 × 这个数）：有的拖得长、有的短。拉长 > 0 才起作用。', updown='调大：长短差得更多。', ue='烘进贴图')),
    (HEAD, dict(key='headKnots', cn='拖影亮结', short='拖影亮结', en='Streak Knots', unit='', rng='0–1', default='0',
        desc='拖影里的亮度一节一节不匀（像星燃烧时喷一下、暗一下），每颗星不同、随时间走。拉长 > 0 才起作用。', updown='调大：节更明显。', ue='烘进贴图')),
    (HEAD, dict(key='headLumpy', cn='星头边缘起伏', short='边缘起伏', en='Head Lumpiness', unit='', rng='0–1', default='0',
        desc='亮核边上贴 3–6 个小鼓包，离中心的远近和大小随时间慢慢变：近看是毛边的一块，不是正圆。', updown='调大：鼓包伸得更出去。', ue='烘进贴图')),
    (HEAD, dict(key='headDouble', cn='双核星头', short='双核', en='Double Core', unit='', rng='0–1', default='0',
        desc='这么多比例的星，亮核由两个错开的小核拼成（第二个核错开 0.45–0.85 个直径，方向慢慢转），像两个点挤在一起。', updown='调大：这样的星更多。', ue='烘进贴图')),
    (HEAD, dict(key='headHex', cn='六边形星头', short='六边形', en='Hexagon Head', unit='', rng='0–1', default='0',
        desc='亮核从圆（0）变到六边形（1），面积不变；像镜头光圈拍出来的样子，这一层所有亮点（星头、爆裂小闪）同一个朝向。亮核小于 3 个像素时看不出来。',
        updown='调大：边角更明显。', ue='烘进贴图')),
    (HEAD, dict(key='headHexRot', cn='六边形转角', short='六边形转角', en='Hexagon Rotation', unit='°', rng='0–60', default='0',
        desc='六边形的朝向（0 = 上下是平边）。六边形 > 0 才起作用。', updown='', ue='烘进贴图')),
    (SPARK, dict(key='sparkStretch', cn='火花拉长', short='拉长', en='Sparkler Stretch', unit='', rng='0–3', default='0',
        desc='每粒火花沿飞行方向拉成小椭圆，长度 = 这个数 × 火花速度 × 1/30 s（1 = 30 fps 一帧的相机拖影），拖在后面；总光量不变。分叉火花不拉。',
        updown='调大：刚喷出、跑得快的火花拉成细线，停下来的仍是圆点。', ue='烘进贴图')),
    (SPARK, dict(key='sparkStretchJit', cn='火花拉长随机', short='拉长随机', en='Sparkler Stretch Random', unit='', rng='0–1', default='0',
        desc='每粒火花的拉长一个倍数（对数正态，σ = 0.6 × 这个数）。火花拉长 > 0 才起作用。', updown='调大：长短差得更多。', ue='烘进贴图')),
]
# 改名 / 挪位置：名称表字段、发射器表字段
RENAME = {
    'sparkSize': ({'cn': '颗粒大小', 'desc': '每粒火花颗粒的直径（米，4.0 渲染下是亮核直径）：决定颗粒感；线条有多宽看「线条宽度」。'}, {'全名': '颗粒大小', '名': '颗粒大小'}),
    'sparkSpread': ({'cn': '线条宽度', 'en': 'Sparkler Line Width', 'unit': 'm', 'range': '0–8',
                     'desc': '尾迹线条有多宽（米）：约 2/3 的火花在这么宽里。存的是火花向旁边散开的速度（m/s），右栏按阻力和寿命换成米显示和输入：宽度 = 2 × 散开速度 × (1 − e^(−阻力 × 寿命)) ÷ 阻力；改阻力 / 寿命时宽度跟着变。',
                     'updown': '调大：线条更宽、更松。', 'random': '正态：x / y / z 每轴 σ = 散开速度 m/s，每粒火花独立，加在继承速度上。'},
                    {'全名': '线条宽度', '模块': '大小', '名': '线条宽度', '单位': 'm'}),
    'tailJit': ({}, {'发射器': '火花', '模块': '大小', '名': '大小随机'}),
    'adjSparkSize': ({'cn': '颗粒大小（整体倍数）'}, {'全名': '颗粒大小（整体倍数）', '名': '颗粒大小 ×'}),
    'adjSpread': ({'cn': '线条宽度（整体倍数）'}, {'全名': '线条宽度（整体倍数）', '名': '线条宽度 ×'}),
    'tailWidth': ({'desc': '旧（4.9.48 起）：整条尾迹的横向粗细倍数，散开 × 这个数、颗粒 × √这个数；和「线条宽度」「颗粒大小」重了，新做的用那两个米数。你的效果里用着的照常算。', 'range': '0.05–10'},
                  {'类别': '旧（待删）'}),
}

rows = json.loads(NAMES_J.read_text(encoding='utf-8'))
eml = json.loads(EMIT_J.read_text(encoding='utf-8'))
log = []
have = {r['key'] for r in rows}
for i, (G, p) in enumerate(NEW):
    if p['key'] in have: continue
    at = max(j for j, r in enumerate(rows) if r['key'] in [G['after']] + [q['key'] for g2, q in NEW if g2 is G]) + 1
    rows.insert(at, {'sec': G['sec'], 'key': p['key'], 'old': '（4.9.48 新加）', 'module_cn': G['module_cn'], 'module_en': G['module_en'], 'en': p['en'], 'en_niagara': False, 'cn': p['cn'],
                     'desc': p['desc'], 'updown': p['updown'], 'unit': p['unit'], 'range': p['rng'], 'default': p['default'], 'random': '',
                     'ue': p['ue'], 'tag': '烘焙器专有', 'note': NOTE, 'check': CHECK, 'family': '空中礼花', 'id': f"4948-{i + 1:02d}-{p['key']}", 'tier': 'more'})
    have.add(p['key']); log.append('名称表 +' + p['key'])
PE = eml['参数']; haveE = {r['key'] for r in PE}
for i, (G, p) in enumerate(NEW):
    if p['key'] in haveE: continue
    at = max(j for j, r in enumerate(PE) if r['key'] in [G['after']] + [q['key'] for g2, q in NEW if g2 is G]) + 1
    PE.insert(at, {'id': f"4948-{i + 1:02d}-{p['key']}", 'sec': G['sec'], 'key': p['key'], '全名': p['cn'], '发射器': G['emitter'], '模块': '大小', '名': p['short'], '类别': '物理量', '单位': p['unit'] or '1'})
    haveE.add(p['key']); log.append('发射器表 +' + p['key'])
for k, (nr, er) in RENAME.items():
    for r in rows:
        if r['key'] == k:
            for a, b in nr.items():
                if r.get(a) != b: r[a] = b; log.append(f'名称表 {k}.{a}')
    for r in PE:
        if r['key'] == k:
            for a, b in er.items():
                if r.get(a) != b: r[a] = b; log.append(f'发射器表 {k}.{a}')
NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
nl = '\r\n' if '\r\n' in raw else '\n'
buf = io.StringIO(); w = csv.writer(buf, lineterminator=nl); w.writerow(hdr)
for r in rows: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
NAMES_C.write_bytes(('﻿' + buf.getvalue().rstrip('\r\n')).encode('utf-8'))
EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
print('\n'.join(log) or '已经做过')
