"""火花发射器补全（对话框FanGold，用户 2026-10-09 21:48「同类没发现的问题与你建议我补的我都要」）：参数名称表 / 发射器表加 7 行。
审查 analysis/原理/火花发射审查_2026-10-09.md；参数变更记录 2026-10-09 一条。BASE、SCHEMA 已手改（10_types.js）。可以重复跑：已经加过的跳过。
用法：python3 analysis/scripts/加参数_火花发射器.py
"""
import csv, io, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
NOTE = '火花发射器补全（对话框FanGold，用户 10-09 21:48 批）：缺省 = 以前的行为（逐像素不变）。只在空中花型起作用。'
SPK = '尾缀（炭火火花）'
# (sec, 插在哪个 key 后面, 发射器, 模块, 短名, 类别, 单位, 名称表字段)
PS = [
    (SPK, 'sparkRate', '火花', '生成', '生成方式', '物理量', '选项', dict(
        key='sparkRateBy', cn='火花生成方式', en='Sparkler Spawn Mode', module_en='Spawn Rate / Spawn Per Unit', en_niagara=True, unit='', rng='每秒 / 每米', default='每秒',
        desc='每秒：每颗星每秒出「火花密度」颗（燃烧速度恒定，星快的地方每米少、线稀）；每米：星每走 1 m 出「每米火花数」颗（线一样密）。',
        updown='每秒 = 物理上的燃烧；每米 = 想要一条匀的线时用。', ue='Niagara：Spawn Rate / Spawn Per Unit；只影响烘焙出的贴图',
        check='20_sim.js sparkPerMOf、step 里 Poisson(每米 × 速度 × h)；40_gl.js buildTrackRun 路程贴图 uLen、VS_SPK lenAt / timeAtLen')),
    (SPK, 'sparkRateBy', '火花', '生成', '每米火花数', '物理量', '个/m', dict(
        key='sparkPerM', cn='每米火花数', en='Sparkler Spawn Per Unit', module_en='Spawn Per Unit', en_niagara=True, unit='个/m', rng='0–100', default='5',
        desc='「生成方式 = 每米」时，星每走 1 m 出几颗火花（子星 / 载体尾按它们的生成率比例缩放）。这时「火花密度」「末段火花密度」不用。',
        updown='调大：线更密更亮；调小：稀成一粒粒。', ue='Niagara：Spawn Per Unit · Spawn Spacing 的倒数；只影响烘焙出的贴图',
        check='20_sim.js sparkPerMOf；40_gl.js info 第 3 位 = 这颗星的每米火花数')),
    (SPK, 'sparkInherit', '火花', '初速', '向后喷速度', '物理量', 'm/s', dict(
        key='sparkJet', cn='火花向后喷速度', en='Sparkler Jet Speed', module_en='Add Velocity In Cone', en_niagara=True, unit='m/s', rng='0–200', default='0',
        desc='火花相对星往运动反方向喷出的速度（燃气把火粉往后吹），叠在「跟随星体」和速度随机（线条宽度）上。0 = 不喷（以前）。',
        updown='调大：火花一出来就往后冲、尾巴根部拉开；配锥角做出一出来就张开的扫帚形。', ue='Niagara：Add Velocity In Cone（方向 = −星速度）；只影响烘焙出的贴图',
        check='20_sim.js jetDir、step；40_gl.js VS_SPK uJet / uJetC')),
    (SPK, 'sparkJet', '火花', '初速', '喷射锥角', '物理量', '°', dict(
        key='sparkJetCone', cn='火花喷射锥角', en='Sparkler Jet Cone Angle', module_en='Add Velocity In Cone', en_niagara=True, unit='°', rng='0–90', default='0',
        desc='向后喷的方向在正后方这个半角的锥里随机（按立体角大致均匀）。0 = 正后方。',
        updown='调大：根部张得更开（扫帚 / 喷口形）；0 = 只往正后方。', ue='Niagara：Add Velocity In Cone · Cone Angle；只影响烘焙出的贴图',
        check='20_sim.js jetDir；40_gl.js VS_SPK')),
    (SPK, 'sparkJetCone', '火花', '形状', '起始半径', '物理量', 'm', dict(
        key='sparkSpawnR', cn='火花起始半径', en='Sparkler Spawn Radius', module_en='Shape Location', en_niagara=True, unit='m', rng='0–30', default='0',
        desc='火花在以星心为中心、这个半径的球里均匀出生。0 = 星心一点（以前）。和自定义发射器的「起始半径」同一个意思（那个是球面）。',
        updown='调大：尾巴根部一出来就粗；0 = 从一点出来、越往后越粗。', ue='Niagara：Shape Location（Sphere）· Sphere Radius；只影响烘焙出的贴图',
        check='20_sim.js sparkSpawnRAt；40_gl.js VS_SPK uSpR')),
    (SPK, 'sparkSpawnR', '火花', '形状', '跟星头大小', '物理量', '×', dict(
        key='sparkSpawnHead', cn='火花起始半径跟星头', en='Sparkler Spawn Radius × Head', module_en='Shape Location', en_niagara=False, unit='×', rng='0–3', default='0',
        desc='起始半径再加上 这个倍数 × 星头半径（这颗星此刻画的星头：星头大小、子星 × 0.8、星头大小随机、星头 / 子星大小随寿命）。1 = 火花从星头圆片里出来；星头大了根部跟着粗。',
        updown='0 = 不跟（以前）；1 = 根部和星头一样粗；> 1 = 比星头还粗。', ue='只影响烘焙出的贴图',
        check='20_sim.js sparkHeadBase / sparkHeadWin / sparkSpawnRAt；40_gl.js uInfo 第 2 格 + uCvHsS / uCvHsU')),
    ('形状', 'clusterSweep', '星', '形状', '筒距', '物理量', 'm', dict(
        key='clusterGap', cn='扇面筒距', en='Cluster Fan Tube Spacing', module_en='Initial Location', en_niagara=False, unit='m', rng='0–20', default='0',
        desc='「簇的排法 = 扇面 N 簇」时相邻两簇的出发点隔多远：第 k 簇在扇面基线上 x = (k − (N − 1)/2) × 筒距（第 0 簇在最左），和簇方向一样跟着偏转 / 倾斜 / 转角。开花闪光（筒口火）挪到各簇出发点。0 = 都从一点出（以前）。',
        updown='0 = 一点；0.5–2 m = 真实筒排；近景底部不再汇成一点。', ue='只影响烘焙出的贴图；单束、GPU 光点照旧',
        check='20_sim.js clusterDirs 方向数组 .o、Sim 构造挪出发点和闪光')),
]
rows = json.loads(NAMES_J.read_text(encoding='utf-8')); have = {(r['sec'], r['key']) for r in rows}
eml = json.loads(EMIT_J.read_text(encoding='utf-8')); haveE = {(r.get('sec'), r['key']) for r in eml['参数']}
added = 0
for k, (sec, after, emi, mod, short, cat, unit2, P) in enumerate(PS):
    rid = f"fanspk-{k:02d}-{P['key']}"
    if (sec, P['key']) not in have:
        at = max(i for i, r in enumerate(rows) if r['sec'] == sec and r['key'] == after) + 1
        rows.insert(at, {'sec': sec, 'key': P['key'], 'old': P['cn'], 'module_cn': emi if sec == SPK else '形状', 'module_en': P['module_en'], 'en': P['en'], 'en_niagara': P['en_niagara'], 'cn': P['cn'],
                         'desc': P['desc'], 'updown': P['updown'], 'unit': P['unit'], 'range': P['rng'], 'default': P['default'], 'random': '',
                         'ue': P['ue'], 'tag': '烟花特性', 'note': NOTE, 'check': P['check'], 'family': '空中礼花', 'id': rid, 'tier': 'more'})
        have.add((sec, P['key'])); added += 1
    if (sec, P['key']) not in haveE:
        at = max(i for i, r in enumerate(eml['参数']) if r.get('sec') == sec and r['key'] == after) + 1
        eml['参数'].insert(at, {'id': rid, 'sec': sec, 'key': P['key'], '全名': P['cn'], '发射器': emi, '模块': mod, '名': short, '类别': cat, '单位': unit2})
        haveE.add((sec, P['key']))
NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
buf = io.StringIO(); w = csv.writer(buf, lineterminator='\n'); w.writerow(hdr)
for r in rows: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
NAMES_C.write_bytes(('﻿' + buf.getvalue().rstrip('\n')).encode('utf-8'))
EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'名称表 +{added}')
