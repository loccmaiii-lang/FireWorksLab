"""宪章遗漏 1（对话框21 排队，用户 10-06 09:40「按推荐」；汇总_要你定的.md 第 2 节 #4）：输出栏收口。
- 「直接调」模块：PC 怎么出、手机怎么出、入点、出点、贴图宽 × 高、格子（列 × 行）、曝光、留边 —— 9 个；
- 「算出来的」模块：输出概况 + 帧率（每帧停几个 tick，新参数 holdTicks，0 = 自动）、贴图张数（pageTarget）、单格（outCell），灰字显示算出来的值，改了就用你填的；
- 其余输出设置留在原来的模块里（大面片 / 分段时默认收起），旧帧数模式和 Zoom 照旧在「旧（待删）」。
一次改 4 处：10_types.js（BASE + SCHEMA）、参数名称表.json / .csv、发射器表.json。幂等，可以重复跑。
用法：python3 analysis/scripts/输出收口_4.9.5.py
"""
import csv, io, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
TYPES_JS = ROOT / 'tool' / 'src' / 'js' / '10_types.js'
NAMES_J = ROOT / 'analysis' / '命名' / '参数名称表.json'
NAMES_C = ROOT / 'analysis' / '命名' / '参数名称表.csv'
EMIT_J = ROOT / 'analysis' / '命名' / '发射器表.json'
SEC = '输出：帧数 · 格子 · 贴图（导出）'
DIRECT = ['outPC', 'outMobile', 'cutIn', 'cutOut', 'info:specBox', 'exposure', 'cellPad']      # 规格框里是贴图宽 × 高、列 × 行（4 个控件）
CALC = ['info:outSummary', 'holdTicks', 'pageTarget', 'outCell']


def main():
    src = TYPES_JS.read_text(encoding='utf-8')
    if 'holdTicks:' not in src.split('const SCHEMA = [', 1)[0]:
        src = src.replace("frameBudget: 'fixed', pageTarget: 1,", "frameBudget: 'fixed', pageTarget: 1, holdTicks: 0,", 1)
    old_pt = "['pageTarget', '先放进几张贴图（放不下自动加）', '张', 1, 8, 1, P => usesTickPlan40(P) && (P.frameBudget || 'motion') === 'motion'],"
    if old_pt in src:
        src = src.replace(old_pt, "['pageTarget', '贴图张数（至少几张；放不下自动加）', '张', 1, 8, 1, P => usesTickPlan40(P) && ['motion', 'fixed'].includes(P.frameBudget || 'motion')],\n"
                          "    ['holdTicks', '每帧停几个 tick（0 = 自动：放得下的最快）', 'tick', 0, 3, 1, P => usesTickPlan40(P) && (P.frameBudget || 'motion') === 'fixed'],     // 4.9.5 输出栏收口：固定机位的帧率可以手动定", 1)
    if "{ info: 'specMore' }" not in src:
        src = src.replace("    { info: 'specBox' },\n", "    { info: 'specBox' },\n    { info: 'specMore' },\n", 1)
    TYPES_JS.write_text(src, encoding='utf-8')

    rows = json.loads(NAMES_J.read_text(encoding='utf-8')); have = {(r['sec'], r['key']) for r in rows}
    tmpl = next(r for r in rows if r['key'] == 'pageTarget')
    new_rows = []
    if (SEC, 'holdTicks') not in have:
        new_rows.append({**tmpl, 'key': 'holdTicks', 'old': '每帧停几个 tick（0 = 自动：放得下的最快）', 'en': 'Hold Ticks Per Frame', 'cn': '每帧停几个 tick',
            'desc': '固定机位 + 匀速帧时，每一帧在引擎里停几个 tick（30 fps 下 1 = 30 fps、2 = 15 fps、3 = 10 fps）。0 = 自动：取放得下的最快那档（放不下 10 fps 就加贴图张数）。',
            'updown': '调大：帧率低、帧少、省贴图；调小：更流畅、帧多，可能多一张贴图', 'unit': 'tick', 'range': '0–3', 'default': '0',
            'ue': '帧号曲线的斜率（Dynamic Parameter 帧号一条直线），cascade.json 的帧数 / 张数跟着变', 'note': '4.9.5（宪章遗漏 1，输出栏收口）加：以前固定机位的帧率只能自动定。0 = 自动，和以前一样。',
            'check': '31_plan40.js plan40 fixed 分支；70_ui.js AUTO_DEF holdTicks', 'id': '495-holdTicks', 'tier': 'core'})
    if (SEC, 'info:specMore') not in have:
        spec = next(r for r in rows if r['key'] == 'info:specBox')
        new_rows.append({**spec, 'key': 'info:specMore', 'old': '（规格框第二部分：通道、输出、编码、取帧、取景）', 'en': 'More Texture Settings', 'cn': '贴图其它设置',
            'desc': '一组下拉：通道接力、星头火花合并或分开、灰度编码、取帧方式、面片取景（Zoom 是旧（待删））。', 'note': '4.9.5（宪章遗漏 1）：贴图宽高、列 × 行搬到「直接调」，剩下的放这里。', 'id': '495-info:specMore'})
    if new_rows:
        rows += new_rows; NAMES_J.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
        raw = NAMES_C.read_bytes().decode('utf-8-sig'); hdr = next(csv.reader(io.StringIO(raw)))
        buf = io.StringIO(); w = csv.writer(buf, lineterminator='\r\n')
        for r in new_rows: w.writerow([('True' if r.get(h) is True else 'False' if r.get(h) is False else r.get(h, '')) for h in hdr])
        NAMES_C.write_bytes(('﻿' + raw.rstrip('\r\n') + '\r\n' + buf.getvalue().rstrip('\r\n')).encode('utf-8'))

    eml = json.loads(EMIT_J.read_text(encoding='utf-8')); P = eml['参数']
    ids = {p['id'] for p in P}
    if '495-holdTicks' not in ids: P.append({'id': '495-holdTicks', 'sec': SEC, 'key': 'holdTicks', '全名': '每帧停几个 tick', '发射器': '输出', '模块': '算出来的', '名': '每帧停', '类别': '引擎字段', '单位': 'tick'})
    if '495-info:specMore' not in ids: P.append({'id': '495-info:specMore', 'sec': SEC, 'key': 'info:specMore', '全名': '贴图其它设置', '发射器': '输出', '模块': '贴图', '名': '贴图其它设置', '类别': '只读', '单位': ''})
    for p in P:
        if p['发射器'] != '输出': continue
        if p['key'] in DIRECT: p['模块'] = '直接调'
        if p['key'] in CALC: p['模块'] = '算出来的'
        if p['key'] == 'info:specBox': p['名'] = '贴图宽 × 高 · 格子'; p['全名'] = '贴图宽 × 高 · 列 × 行'
        if p['key'] == 'pageTarget': p['名'] = '贴图张数'
        if p['key'] == 'outCell': p['名'] = '单格'
    # 「直接调」「算出来的」按上面的顺序排在输出这一段最前面（面板里同一模块按表里的先后排）
    out = [p for p in P if p['发射器'] == '输出']; first = P.index(out[0])
    rank = {k: i for i, k in enumerate(DIRECT + CALC)}
    head = sorted([p for p in out if p['key'] in rank and p['模块'] in ('直接调', '算出来的')], key=lambda p: rank[p['key']])
    rest = [p for p in out if p not in head]
    others = [p for p in P if p['发射器'] != '输出']
    eml['参数'] = others[:first] + head + rest + others[first:]
    for e in eml['发射器']:
        if e['名'] == '输出':
            e['模块'] = ['直接调', '算出来的'] + [m for m in e['模块'] if m not in ('直接调', '算出来的')]
            e['说明'] = '怎么烘成贴图、导出：最上面「直接调」9 个（PC / 手机怎么出、入点、出点、贴图宽高、格子、曝光、留边），「算出来的」灰字（帧率、张数、单格，改了就用你填的）；别的设置在下面（默认收起）——不改效果本身'
    EMIT_J.write_text(json.dumps(eml, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'名称表 +{len(new_rows)}；输出：直接调 {sum(1 for p in eml["参数"] if p["模块"] == "直接调")} 行，算出来的 {sum(1 for p in eml["参数"] if p["模块"] == "算出来的")} 行')


main()
