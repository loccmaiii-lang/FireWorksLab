"""4.9.17 每簇星数随机 / 簇方向随机（对话框新花型，用户 10-06 19:27「按照你推荐的前两个继续迭代」）：参数名称表 / 发射器表各加 2 行。
BASE、SCHEMA 已手改（10_types.js）。可以重复跑：已经加过的跳过。
用法：python3 analysis/scripts/加参数_簇随机.py
"""
import csv, io, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
NOTE = '4.9.17（对话框新花型，用户 10-06 19:27「按照你推荐的前两个继续迭代」）加：只在「星的排布 = 分簇」时出现、起作用；用自己的随机数（种子跟「随机种子」），0 = 不进新代码。'
NEW = [
    dict(key='clusterStarsJit', cn='每簇星数随机', en='Cluster Stars Variation', unit='%', rng='0–100', default='0',
         desc='各簇分到的星数不再一样多：每簇的份额 ×（1 ± 这个比例）随机（最少 5%），总星数不变。手工装药每一撮不一样多。',
         updown='调大：有的簇粗、有的簇稀；0 = 星平均分到各簇（星数 ÷ 簇数）。改「随机种子」换一种分法。', short='星数随机', u2='%', random='均匀：每簇份额 × (1 + 数值% × (2u − 1))，u 均匀 0–1，最少 5%，再按份额把总星数分下去；种子 = 随机种子', check='20_sim.js clusterDirs：份额最大余数法凑整，各簇轮流分配'),
    dict(key='clusterDirJit', cn='簇方向随机', en='Cluster Direction Jitter', unit='°', rng='0–30', default='0',
         desc='每簇的中心方向在这个半角的锥里随机偏一点（按立体角均匀），整套不再完全对称。在倾斜、整套簇转角之后偏。',
         updown='调大：束的方向更乱；0 = 完全对称。改「随机种子」换一种偏法。', short='方向随机', u2='°', random='均匀（按立体角）：每簇中心方向在半角 = 数值° 的锥里取一个；种子 = 随机种子', check='20_sim.js clusterDirs：中心方向在半角锥里均匀取'),
]
rows = json.loads(NAMES_J.read_text(encoding='utf-8')); have = {(r['sec'], r['key']) for r in rows}
eml = json.loads(EMIT_J.read_text(encoding='utf-8')); haveE = {r['key'] for r in eml['参数'] if r.get('sec') == '形状'}
added = 0
for n, p in enumerate(NEW):
    rid = f"4917-{n:02d}-{p['key']}"
    if ('形状', p['key']) not in have:
        at = max(i for i, r in enumerate(rows) if r['sec'] == '形状' and r['key'].startswith('cluster')) + 1
        rows.insert(at, {'sec': '形状', 'key': p['key'], 'old': p['cn'], 'module_cn': '形状', 'module_en': 'Initial Location', 'en': p['en'], 'en_niagara': False, 'cn': p['cn'],
                         'desc': p['desc'], 'updown': p['updown'], 'unit': p['unit'], 'range': p['rng'], 'default': p['default'], 'random': p['random'],
                         'ue': '只影响烘焙出的贴图；单束、GPU 光点照旧按球面', 'tag': '烟花特性', 'note': NOTE, 'check': p['check'], 'family': '空中礼花', 'id': rid, 'tier': 'more'})
        added += 1
    if p['key'] not in haveE:
        at = max(i for i, r in enumerate(eml['参数']) if r.get('sec') == '形状' and str(r['key']).startswith('cluster')) + 1
        eml['参数'].insert(at, {'id': rid, 'sec': '形状', 'key': p['key'], '全名': p['cn'], '发射器': '星', '模块': '形状', '名': p['short'], '类别': '物理量', '单位': p['u2']})
NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
buf = io.StringIO(); w = csv.writer(buf, lineterminator='\r\n'); w.writerow(hdr)
for r in rows: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
NAMES_C.write_bytes(('﻿' + buf.getvalue().rstrip('\r\n')).encode('utf-8'))
EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'名称表 +{added}')
