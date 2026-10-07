"""4.9.34 扇面 N 簇 + 簇依次出膛（对话框FanGold，用户 10-07 18:40「OK，你可以认领增加制作」）：参数名称表 / 发射器表各加 2 行（clusterFan、clusterSweep）。
BASE、SCHEMA、CLUSTER_LAYOUTS 已手改（10_types.js）。可以重复跑：已经加过的跳过。
用法：python3 analysis/scripts/加参数_扇面簇.py
"""
import csv, io, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
NOTE = '4.9.34（对话框FanGold，用户 10-07 18:40 批）加：只在「星的排布 = 分簇」时出现、起作用；缺省不进新代码。'
PS = [
    dict(key='clusterFan', cn='扇面总张角', en='Cluster Fan Angle', unit='°', rng='0–180', default='90', short='扇面张角', u2='°',
         desc='「簇的排法 = 扇面 N 簇」时，N 簇在画面平面里均分的总张角，居中朝上（第 0 簇在最左）。扇形组合一排筒的张开角度。',
         updown='大 = 扇面张得开；90 = 左右各 45°。整排再斜过去用「整套簇转角」。', check='20_sim.js clusterCenters fan'),
    dict(key='clusterSweep', cn='簇依次出膛', en='Cluster Sweep', unit='s', rng='-2–2', default='0', short='依次出膛', u2='s',
         desc='第 k 簇比第 0 簇晚 k / (簇数 − 1) × |值| 秒出发；出发前星停在原点、不亮、不出火花，开花闪光和「开花时」的自定义发射器跟着各簇出发时刻。负数 = 从最后一簇倒着来。扇形组合引线串联、逐筒出膛。',
         updown='0 = 所有簇同时；0.38 = 一排在 0.38 s 内从左扫到右；−0.38 = 从右扫到左。', check='20_sim.js clusterDirs 第 5 位 = 出发时刻、Sim step 跳过没出发的星'),
]
rows = json.loads(NAMES_J.read_text(encoding='utf-8')); have = {(r['sec'], r['key']) for r in rows}
eml = json.loads(EMIT_J.read_text(encoding='utf-8')); haveE = {r['key'] for r in eml['参数'] if r.get('sec') == '形状'}
added = 0
for k, P in enumerate(PS):
    rid = f"4934-0{k}-{P['key']}"
    if ('形状', P['key']) not in have:
        at = max(i for i, r in enumerate(rows) if r['sec'] == '形状' and r['key'] in ('clusterN', 'clusterFan')) + 1
        rows.insert(at, {'sec': '形状', 'key': P['key'], 'old': P['cn'], 'module_cn': '形状', 'module_en': 'Initial Location', 'en': P['en'], 'en_niagara': False, 'cn': P['cn'],
                         'desc': P['desc'], 'updown': P['updown'], 'unit': P['unit'], 'range': P['rng'], 'default': P['default'], 'random': '',
                         'ue': '只影响烘焙出的贴图；单束、GPU 光点照旧按球面', 'tag': '烟花特性', 'note': NOTE, 'check': P['check'], 'family': '空中礼花', 'id': rid, 'tier': 'more'})
        added += 1
    if P['key'] not in haveE:
        at = max(i for i, r in enumerate(eml['参数']) if r.get('sec') == '形状' and r['key'] in ('clusterN', 'clusterFan')) + 1
        eml['参数'].insert(at, {'id': rid, 'sec': '形状', 'key': P['key'], '全名': P['cn'], '发射器': '星', '模块': '形状', '名': P['short'], '类别': '物理量', '单位': P['u2']})
NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
buf = io.StringIO(); w = csv.writer(buf, lineterminator='\n'); w.writerow(hdr)
for r in rows: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
NAMES_C.write_bytes(('﻿' + buf.getvalue().rstrip('\n')).encode('utf-8'))
EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'名称表 +{added}')
