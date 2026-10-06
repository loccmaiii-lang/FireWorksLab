"""4.9.15 分簇（对话框新花型，用户 10-06 15:35「用B」）：参数名称表 / 发射器表各加 3 行，「开花图案」那行的说明补上「分簇」。
BASE、SCHEMA 已手改（10_types.js）。可以重复跑：已经加过的键跳过。
用法：python3 analysis/scripts/加参数_分簇_4.9.15.py
"""
import csv, io, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
NOTE = '4.9.15（对话框新花型，用户 10-06 15:35「用B」）加：只在「星的排布 = 分簇」时出现、起作用。原理 analysis/原理/多层花型库.md 1c。'
NEW = [
    dict(key='clusterLayout', old='簇的排法', cn='簇的排法', en='Cluster Layout', unit='', rng='', default='cube（立方：6 轴 + 8 角）',
         desc='分簇时星集中在哪几个方向：立方 = 6 个轴向 + 8 个角共 14 簇；6 轴；8 角；正二十面体 12 簇；一圈 N 簇（在画面平面里，正对着看）；球面均匀 N 簇。看的方向固定（画面 = 水平 / 竖直平面），「倾斜」绕水平轴转整套。',
         updown='选项。立方顺着轴看：4 个轴向簇在画面里最长，8 个角簇两两重叠在对角线上、略短（√(2/3)），对着 / 背着镜头的 2 簇缩进中心——参考图 1 的「4 长 4 短」就是这样。',
         short='排法', u2='选项', check='20_sim.js clusterCenters'),
    dict(key='clusterN', old='簇数', cn='簇数', en='Cluster Count', unit='', rng='2–40', default='8',
         desc='「一圈 N 簇」「球面均匀 N 簇」时有几簇；其它排法簇数固定（立方 14、6 轴 6、8 角 8、正二十面体 12）。星按顺序轮流分到各簇，每簇星数 ≈ 星数 ÷ 簇数。',
         updown='调大：簇多、每簇星少、越来越像均匀球；调小：几大束。', short='簇数', u2='1', check='20_sim.js clusterCenters / clusterDirs'),
    dict(key='clusterCone', old='每簇张角（半角）', cn='每簇张角', en='Cluster Cone Angle', unit='°', rng='0–45', default='8',
         desc='每一簇星飞出去散开的锥的半角：簇里的星方向在这个锥里按立体角均匀分布（再加上「方向随机」）。',
         updown='调大：每束线散成扇面、簇之间的空隙变小；调小：每簇收成一根粗线。', short='张角', u2='°', check='20_sim.js clusterDirs：cosθ 在 [cos 张角, 1] 均匀'),
]
rows = json.loads(NAMES_J.read_text(encoding='utf-8')); have = {(r['sec'], r['key']) for r in rows}
eml = json.loads(EMIT_J.read_text(encoding='utf-8')); haveE = {r['key'] for r in eml['参数'] if r.get('sec') == '形状'}
new_rows = []
for n, p in enumerate(NEW):
    if ('形状', p['key']) in have: continue
    rid = f"4915-{n:02d}-{p['key']}"
    new_rows.append({'sec': '形状', 'key': p['key'], 'old': p['old'], 'module_cn': '形状', 'module_en': 'Initial Location', 'en': p['en'], 'en_niagara': False, 'cn': p['cn'],
                     'desc': p['desc'], 'updown': p['updown'], 'unit': p['unit'], 'range': p['rng'], 'default': p['default'], 'random': '',
                     'ue': '只影响烘焙出的贴图；单束、GPU 光点照旧按球面', 'tag': '烟花特性', 'note': NOTE, 'check': p['check'], 'family': '空中礼花', 'id': rid, 'tier': 'more'})
    if p['key'] not in haveE:
        eml['参数'].append({'id': rid, 'sec': '形状', 'key': p['key'], '全名': p['cn'], '发射器': '星', '模块': '形状', '名': p['short'], '类别': '物理量', '单位': p['u2']})
for r in rows:      # 「开花图案」那行补上分簇
    if r['sec'] == '形状' and r['key'] == 'pattern' and r['cn'] == '开花图案' and '分簇' not in r['range']:
        r['range'] += ' / 分簇'
        r['desc'] = r['desc'].rstrip('。') + '；或分簇（星集中在几个对称方向，每簇一束，4.9.15）。'
        r['ue'] = r['ue'].replace('单束只能用球 / 半球', '单束只能用球 / 半球（分簇也不行）')
if new_rows: rows += new_rows
NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
# csv 整张按 json 重写（「开花图案」那行也要更新）；格式照旧：BOM + CRLF + 末尾无换行
buf = io.StringIO(); w = csv.writer(buf, lineterminator='\r\n'); w.writerow(hdr)
for r in rows: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
NAMES_C.write_bytes(('﻿' + buf.getvalue().rstrip('\r\n')).encode('utf-8'))
EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'名称表 +{len(new_rows)}')
