"""4.9.53 光晕形状（对话框相机渲染，用户 10-09 18:29「先改正红，然后尾缀是炭金，然后按顺序测试」，参数变更记录 2026-10-09 一条）。
参数名称表 / 发射器表：在 haloR 后面加 haloShape、haloBeta 两行（类别跟同一节的 haloFrac / haloR 一样）。
BASE、SCHEMA 已手改（10_types.js）。可以重复跑：已经加过的跳过。
用法：python3 analysis/scripts/加参数_光晕形状.py
"""
import csv, io, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
NOTE = '4.9.53（对话框相机渲染，用户 10-09 18:29「按顺序测试」= 诊断方案 P2）加；缺省 0 = 高斯，以前逐像素不变。诊断 analysis/probe/星头光晕诊断_2026-10-09/诊断.md。'
CHECK = '05_quality.js qualityOf；41_particles40.js moffatFS40 / moffatProgram40；基准回归'
NEW = [
    dict(key='haloShape', cn='光晕形状', short='光晕形状', en='Halo Shape', unit='', rng='0 高斯 / 1 幂律', default='0',
         desc='光晕的径向分布：高斯（兼容，以前的样子）或幂律（Moffat，像真实镜头拍亮点：亮核外一圈很快变暗、再拖一条长而淡的尾巴）。能量占比、半径倍数含义不变。',
         updown='切到幂律：同样的占比下，光晕贴着亮核更亮、远处更淡更长，不再像一团雾。'),
    dict(key='haloBeta', cn='光晕幂律指数', short='幂律指数', en='Halo Power Index', unit='', rng='1.2–6', default='2.2',
         desc='幂律光晕 (1 + r²/α²)^−β 里的 β：越小尾巴越长越亮，越大越接近高斯。实拍红星头量出来 1.8–3.4。光晕形状 = 幂律才起作用。',
         updown='调小：光晕拖得更远；调大：光晕收在亮核边上。'),
]
rows = json.loads(NAMES_J.read_text(encoding='utf-8'))
eml = json.loads(EMIT_J.read_text(encoding='utf-8'))
log = []
have = {r['key'] for r in rows}
src = next(r for r in rows if r['key'] == 'haloR')
for i, p in enumerate(NEW):
    if p['key'] in have: continue
    at = max(j for j, r in enumerate(rows) if r['key'] in ['haloR'] + [q['key'] for q in NEW]) + 1
    rows.insert(at, {'sec': src['sec'], 'key': p['key'], 'old': '（4.9.53 新加）', 'module_cn': src['module_cn'], 'module_en': src['module_en'], 'en': p['en'], 'en_niagara': False, 'cn': p['cn'],
                     'desc': p['desc'], 'updown': p['updown'], 'unit': p['unit'], 'range': p['rng'], 'default': p['default'], 'random': '',
                     'ue': '只影响烘焙出的贴图（UE 的 Bloom 另算）', 'tag': '烘焙器专有', 'note': NOTE, 'check': CHECK, 'family': src.get('family', '烘焙输出'),
                     'id': f"4953-{i + 1:02d}-{p['key']}", 'tier': 'more'})
    have.add(p['key']); log.append('名称表 +' + p['key'])
PE = eml['参数']; haveE = {r['key'] for r in PE}
srcE = next(r for r in PE if r['key'] == 'haloR')
for i, p in enumerate(NEW):
    if p['key'] in haveE: continue
    at = max(j for j, r in enumerate(PE) if r['key'] in ['haloR'] + [q['key'] for q in NEW]) + 1
    PE.insert(at, {'id': f"4953-{i + 1:02d}-{p['key']}", 'sec': srcE['sec'], 'key': p['key'], '全名': p['cn'], '发射器': srcE['发射器'], '模块': srcE['模块'], '名': p['short'],
                   '类别': srcE.get('类别', '引擎字段'), '单位': p['unit']})
    haveE.add(p['key']); log.append('发射器表 +' + p['key'])
NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
nl = '\r\n' if '\r\n' in raw else '\n'
buf = io.StringIO(); w = csv.writer(buf, lineterminator=nl); w.writerow(hdr)
for r in rows: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
NAMES_C.write_bytes(('\ufeff' + buf.getvalue().rstrip('\r\n')).encode('utf-8'))
EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
print('\n'.join(log) or '已经做过')
