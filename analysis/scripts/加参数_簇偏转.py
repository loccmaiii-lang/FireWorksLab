"""4.9.19 整套簇偏转（对话框新花型，用户 10-06 20:04「加」——回答「要不要加绕竖直轴转」）：参数名称表 / 发射器表各加 1 行（clusterYaw），放在「整套簇转角」前面。
BASE、SCHEMA 已手改（10_types.js）。可以重复跑：已经加过的跳过。
用法：python3 analysis/scripts/加参数_簇偏转.py
"""
import csv, io, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
NOTE = '4.9.19（对话框新花型，用户 10-06 20:04「加」）加：只在「星的排布 = 分簇」时出现、起作用；缺省 0 不进新代码。'
P = dict(key='clusterYaw', cn='整套簇偏转（绕竖直轴）', en='Cluster Yaw', unit='°', rng='-180–180', default='0',
         desc='整套簇先绕竖直轴转多少度（从上往下看逆时针为正），再按「倾斜」绕水平轴、按「整套簇转角」绕看的方向转。三个一起，整套簇能摆到任意 3D 角度。',
         updown='0 = 不转；45 = 立方排法从「顺着一根轴看」转成「对着两个面中间看」，画面里簇的长短、几簇重叠都会变。', short='偏转', u2='°', check='20_sim.js clusterDirs：先绕 y 转，再倾斜（x）、转角（z）')
rows = json.loads(NAMES_J.read_text(encoding='utf-8')); have = {(r['sec'], r['key']) for r in rows}
eml = json.loads(EMIT_J.read_text(encoding='utf-8')); haveE = {r['key'] for r in eml['参数'] if r.get('sec') == '形状'}
added = 0; rid = f"4919-00-{P['key']}"
if ('形状', P['key']) not in have:
    at = min(i for i, r in enumerate(rows) if r['sec'] == '形状' and r['key'] == 'clusterRoll')
    rows.insert(at, {'sec': '形状', 'key': P['key'], 'old': P['cn'], 'module_cn': '形状', 'module_en': 'Initial Location', 'en': P['en'], 'en_niagara': False, 'cn': P['cn'],
                     'desc': P['desc'], 'updown': P['updown'], 'unit': P['unit'], 'range': P['rng'], 'default': P['default'], 'random': '',
                     'ue': '只影响烘焙出的贴图；单束、GPU 光点照旧按球面', 'tag': '烟花特性', 'note': NOTE, 'check': P['check'], 'family': '空中礼花', 'id': rid, 'tier': 'more'})
    added += 1
if P['key'] not in haveE:
    at = min(i for i, r in enumerate(eml['参数']) if r.get('sec') == '形状' and r['key'] == 'clusterRoll')
    eml['参数'].insert(at, {'id': rid, 'sec': '形状', 'key': P['key'], '全名': P['cn'], '发射器': '星', '模块': '形状', '名': P['short'], '类别': '物理量', '单位': P['u2']})
NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
buf = io.StringIO(); w = csv.writer(buf, lineterminator='\r\n'); w.writerow(hdr)
for r in rows: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
NAMES_C.write_bytes(('﻿' + buf.getvalue().rstrip('\r\n')).encode('utf-8'))
EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
print(f'名称表 +{added}')
