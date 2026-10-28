"""4.9.125「显示这层」（对话框9，用户 10-28 10:00「你让我定的显示这层参数可以加」）：
普通花型 7 个发射器、升空尾缀（循环层 + 粒子）9 个、升空尾缀（V5 序列）5 个，每个一行「显示这层」（1 显示 / 0 隐藏）。
- 参数名称表 / 发射器表各加 21 行，节 = 「显示这层」，归在各自发射器的「生成」（星头 → 亮度、发射口 → 闪光：它们没有「生成」模块）；
- 类别 = 引擎字段（决定导出里有没有这个发射器 / 贴图里有没有这一类），单位 1。
BASE、SCHEMA 已手改（10_types.js）。可以重复跑：已经加过的跳过。
用法：python3 analysis/scripts/加参数_显示这层.py
"""
import csv, io, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
SEC = '显示这层'
NOTE = '4.9.125（对话框9，用户 10-28 10:00「你让我定的显示这层参数可以加」）加：和粒子图「显示这层」同一个意思（10-27 20:37「看不见就不导出」）。缺省 1，旧效果逐字节不变；面板上不单独占一行 = 右栏树上的眼睛。'
# key, 发射器, 模块, 英文, 家族, 隐藏时去掉什么, 代码位置
ROWS = [
    ('showStar', '星', '生成', 'Show Stars', '空中礼花', '星头（含熄灭前闪亮、落水闪光）不画；火花、爆裂、自定义发射器照样从星上出来；GPU 光点不出', '20_sim.js Sim.gather；67_fwlcombo.js dotVis / dotsCount'),
    ('showSpark', '火花', '生成', 'Show Sparks', '空中礼花', '火花（含子弹尾）不画；余烬、分叉火花照样出', '20_sim.js gather；40_gl.js VS_SPK uHideSEB'),
    ('showEmber', '余烬', '生成', 'Show Embers', '空中礼花', '余烬不画（普通火花不变：余烬还是从火花里分出来，比例不变）', '20_sim.js gather；40_gl.js VS_SPK uHideSEB'),
    ('showBranch', '分叉火花', '生成', 'Show Branch Sparks', '空中礼花', '分叉出来的小火花不画（母火花照样分叉）', '40_gl.js VS_SPK uHideSEB'),
    ('showCrackle', '爆裂', '生成', 'Show Crackle', '空中礼花', '星熄灭时的爆裂小闪不画', '20_sim.js gather'),
    ('showSub', '子花', '生成', 'Show Sub Burst', '空中礼花', '子星、子星的火花、子花开花闪光都不画（子弹照样开花）', '20_sim.js gather / Sparks.hd；40_gl.js buildTrackRun 子星生成率 0'),
    ('showFlash', '开花闪光', '生成', 'Show Burst Flash', '空中礼花', '开花闪光不画，单独导出的 Flash 发射器也不出', '20_sim.js gather；67_fwlcombo.js flashES'),
    ('rtShowHead', '星头', '亮度', 'Show Head', '升空尾缀', '星头（亮核 + 短焰）和星头光晕不画、不导出', '47_risetail.js rtHeadPts / rtBuildES'),
    ('rtShowA', '白热火花', '生成', 'Show White Powder', '升空尾缀', '白热段的细火花不画（循环层贴图里没有）', '47_risetail.js rtPowderI'),
    ('rtShowF', '细火花', '生成', 'Show Fine Sparks', '升空尾缀', '细火花：贴图里那份和 GPU 那份都不出（别的档 GPU 份额不变）', '47_risetail.js rtTexDraw / rtBuildES'),
    ('rtShowM', '中火花', '生成', 'Show Mid Sparks', '升空尾缀', '中火花（含闪烁层）：贴图里那份和 GPU 那份都不出', '47_risetail.js rtTexDraw / rtBuildES'),
    ('rtShowC', '粗火花', '生成', 'Show Coarse Sparks', '升空尾缀', '粗火花：贴图里那份和 GPU 那份都不出（末段爆亮另算）', '47_risetail.js rtTexDraw / rtBuildES'),
    ('rtShowE', '落火', '生成', 'Show Falling Embers', '升空尾缀', '落火：GPU 发射器和贴图里的落火都不出', '47_risetail.js rtTexDraw / rtBuildES'),
    ('rtShowSmoke', '烟带', '生成', 'Show Smoke', '升空尾缀', '烟带发射器不出', '47_risetail.js rtBuildES'),
    ('rtShowPop', '爆亮', '生成', 'Show Spark Pops', '升空尾缀', '末段爆亮发射器不出', '47_risetail.js rtBuildES'),
    ('rtShowLaunch', '发射口', '闪光', 'Show Launch', '升空尾缀', '发射口闪光和发射口火花不出', '47_risetail.js rtBuildES'),
    ('trShowHead', '星头', '亮度', 'Show Head', '升空尾缀', '星头（核心 + 光晕）不画', '42_trail.js drawTrailHead'),
    ('trShowF', '白热火花', '生成', 'Show White Sparks', '升空尾缀', '白热细火花不画', '42_trail.js makeTrailRenderer'),
    ('trShowM', '金火花', '生成', 'Show Gold Sparks', '升空尾缀', '金色火花不画', '42_trail.js makeTrailRenderer'),
    ('trShowC', '橙色火花', '生成', 'Show Orange Sparks', '升空尾缀', '橙色大火花不画', '42_trail.js makeTrailRenderer'),
    ('trShowW', '丝状火花', '生成', 'Show Streak Sparks', '升空尾缀', '星头丝火花不画', '42_trail.js makeTrailRenderer'),
]
rows = json.loads(NAMES_J.read_text(encoding='utf-8'))
eml = json.loads(EMIT_J.read_text(encoding='utf-8'))
log = []
have = {(r['sec'], r['key']) for r in rows}
haveE = {r['key'] for r in eml['参数']}
for n, (key, em, mod, en, fam, what, check) in enumerate(ROWS):
    rid = f'49125-{n + 1:02d}-{key}'
    if (SEC, key) not in have:
        rows.append({'sec': SEC, 'key': key, 'old': em + '：显示这层', 'module_cn': mod, 'module_en': 'Visibility', 'en': en, 'en_niagara': False, 'cn': em + '：显示这层',
                     'desc': f'关了 = 「{em}」不画、不烘、不导出；参数都留着，再打开照旧。{what}。', 'updown': '1 = 显示（缺省）；0 = 隐藏。和右栏树上这一行的眼睛是同一个开关（Ctrl+Z 撤销）。',
                     'unit': '1', 'range': '0 / 1', 'default': '1', 'random': '', 'ue': '引擎字段：关了时导出包里没有这个发射器（贴图里也没有这一类）', 'tag': '通用', 'note': NOTE, 'check': check,
                     'family': fam, 'id': rid, 'tier': 'core'})
        log.append('名称表 +' + key)
    if key not in haveE:
        eml['参数'].append({'id': rid, 'sec': SEC, 'key': key, '全名': em + '：显示这层', '发射器': em, '模块': mod, '名': '显示这层', '类别': '引擎字段', '单位': '1'})
        log.append('发射器表 +' + key)
NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
# CSV 只往后追加这一节缺的行（CSV 本身比 JSON 少一些旧行、换行是 \n：整张重写会带出一大片无关改动）
raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
haveC = {(r[0], r[1]) for r in csv.reader(io.StringIO(raw)) if len(r) > 1}
buf = io.StringIO(); w = csv.writer(buf, lineterminator='\n')
for r in rows:
    if r['sec'] == SEC and (r['sec'], r['key']) not in haveC: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
if buf.getvalue(): NAMES_C.write_bytes(('﻿' + (raw if raw.endswith('\n') else raw + '\n') + buf.getvalue()).encode('utf-8'))
EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
print('\n'.join(log) or '已经做过')
