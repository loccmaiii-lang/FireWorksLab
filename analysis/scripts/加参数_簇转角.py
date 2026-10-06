"""4.9.16 整套簇转角（对话框新花型，用户 10-06 17:57「2.可以加这个参数」）：参数名称表 / 发射器表各加 1 行（clusterRoll），
簇数下限 2 → 1、每簇张角上限 45 → 90 两行的范围跟着改。BASE、SCHEMA 已手改（10_types.js）。可以重复跑：已经加过的跳过。
用法：python3 analysis/scripts/加参数_簇转角.py
"""
import csv, io, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
NOTE = '4.9.16（对话框新花型，用户 10-06 17:57「可以加这个参数」）加：只在「星的排布 = 分簇」时出现、起作用。'
P = dict(key='clusterRoll', old='整套簇转角', cn='整套簇转角', en='Cluster Roll', unit='°', rng='-180–180', default='0',
         desc='「倾斜」以后，整套簇在画面里绕看的方向转多少度（逆时针为正）。看的方向固定（烘出来的面片是固定视角），所以要哪几簇朝上、朝两边，用它摆。',
         updown='0 = 不转；90 = 原来朝上的簇转到左边。一簇 + 张角 90° 时就是一个半球，转角定这半球朝哪边（染分：两层各一半，转角差 180°）。',
         short='转角', u2='°', check='20_sim.js clusterDirs：倾斜后绕 z 轴转')
rows = json.loads(NAMES_J.read_text(encoding='utf-8')); have = {(r['sec'], r['key']) for r in rows}
eml = json.loads(EMIT_J.read_text(encoding='utf-8')); haveE = {r['key'] for r in eml['参数'] if r.get('sec') == '形状'}
added = 0
rid = f"4916-00-{P['key']}"
if ('形状', P['key']) not in have:
    at = max(i for i, r in enumerate(rows) if r['sec'] == '形状' and r['key'] == 'clusterCone') + 1
    rows.insert(at, {'sec': '形状', 'key': P['key'], 'old': P['old'], 'module_cn': '形状', 'module_en': 'Initial Location', 'en': P['en'], 'en_niagara': False, 'cn': P['cn'],
                     'desc': P['desc'], 'updown': P['updown'], 'unit': P['unit'], 'range': P['rng'], 'default': P['default'], 'random': '',
                     'ue': '只影响烘焙出的贴图；单束、GPU 光点照旧按球面', 'tag': '烟花特性', 'note': NOTE, 'check': P['check'], 'family': '空中礼花', 'id': rid, 'tier': 'more'})
    added += 1
if P['key'] not in haveE:
    at = max(i for i, r in enumerate(eml['参数']) if r.get('sec') == '形状' and r['key'] == 'clusterCone') + 1
    eml['参数'].insert(at, {'id': rid, 'sec': '形状', 'key': P['key'], '全名': P['cn'], '发射器': '星', '模块': '形状', '名': P['short'], '类别': '物理量', '单位': P['u2']})
for r in rows:      # 范围跟着 SCHEMA 改
    if r['sec'] == '形状' and r['key'] == 'clusterN' and r['range'] == '2–40':
        r['range'] = '1–40'; r['note'] += ' 4.9.16 下限 2 → 1（一簇 + 张角 90° + 转角 = 任意方向的半球）。'
    if r['sec'] == '形状' and r['key'] == 'clusterCone' and r['range'] == '0–45':
        r['range'] = '0–90'; r['note'] += ' 4.9.16 上限 45 → 90（90 = 半球）。'
NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
buf = io.StringIO(); w = csv.writer(buf, lineterminator='\r\n'); w.writerow(hdr)
for r in rows: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
NAMES_C.write_bytes(('﻿' + buf.getvalue().rstrip('\r\n')).encode('utf-8'))
EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'名称表 +{added}')
