"""球形A / 球形D 核时间、球形C / 青柠星 重做（对话框新花型，用户 2026-10-07 19:48）。
  1.球形A，球形D效果基本通过，我略微调整就可以用了，帮我重新导入；
  2.球形C是一个绿芯入+橙引转银辉星，现在形态不太对；你重新核对再调整一遍配方帮我重新导一遍；
  3.青柠星是一个橙引+延迟起势的星（从橙到柠绿），以上几个都帮我对着参考重新调匹配时间节点，帮我放到待验收
从上一版条目（analysis/迭代/条目.json 的 QA19 / QD13 / QC11 / QN11 各层）出发，只改下面写明的键；原理见 analysis/原理/球形C.md、青柠星.md（2026-10-07 重写一节）。
  python3 analysis/scripts/球形与青柠.py [--expo 曝光.json ...] [--status] [--jobs export|check]
出：analysis/原理/条目_球形与青柠.json（QA20 / QD14 / QC12 / QN12，每个是组合，层条目 -1 / -2 / -3）。不要手改条目（改这里重跑）。
"""
import argparse, collections, copy, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'analysis' / '迭代' / '条目.json'
OUT = ROOT / 'analysis' / '原理' / '条目_球形与青柠.json'
STATUS = ROOT / '协作' / '状态清单.json'
DATE = '2026-10-07'
LOOK = ['开花后同一秒和实拍比（左栏条目点开有实拍对照）：几个时间节点（变色、点火、熄灭）对不对', '引擎回放 + 游戏内大小：连续播放顺不顺、层和层对得上', '哪一段还差，直接说哪一秒']

NEUTRAL = {'ramp0': '#000000', 'ramp1': '#4a4a52', 'ramp2': '#c8c8d0', 'ramp3': '#ffffff'}

# ---- 每个效果：(新号, 原组合, 名字, 每层 [(原层, 新层名, 参数改动, 颜色改动)], 说明) ----
# 参数改动里 None = 删掉这个键（回到花型默认）
FX = []

# 球形A：效果不动，只核时间节点（看 NFQ1 的同一秒对照后填）
FX.append(dict(id='QA20', src='QA19', key='qiuxing_a', name='球形A · 核时间（QA19 参数）', en='QiuxingA40', layers=[
    ('QA19-1', '尾巴层', dict(sparkStop=2.05), {}),     # 实拍 +2.3 s 还有细金尾（原来 +1.9 s 停、+2.2 前后没了）
    ('QA19-2', '星头层', dict(headDimUntil=1.75, starBrightCurve='0:1, 0.4:1, 0.45:2.5, 0.62:2.5, 0.66:1, 1:1'),     # QA20E1 烘焙回放：+1.88 s 实拍一圈洋红星头，导出里看不到（洋红本身暗，贴在金尾上）→ 粉的那段（+1.6–2.4 s）星头亮 2.5 倍     # 实拍 +1.7 s 外圈星头开始变粉、+1.8 s 已经很明显（原来 +1.85 s 才亮起来）
     dict(stages=[[0, '#ff7a40'], [0.28, '#fff0c8'], [1.6, '#ff2d8a'], [2.05, '#ff5aa8'], [2.4, '#f4f0ff']])),     # 粉 1.65 → 1.6、银白 2.5 → 2.4（实拍 +2.4 s 已转银白）
], note='QA19 的效果不动（用户 19:48「基本通过，我略微调整就可以用了」），只对着实拍核时间节点：星头变粉 1.65 → 1.6 s、星头亮起 1.85 → 1.75 s、转银白 2.5 → 2.4 s、金尾停 1.9 → 2.05 s（实拍 +2.3 s 还有细金尾）；粉头那段（+1.6–2.4 s）星头亮 2.5 倍——洋红本身暗，贴在亮金尾上导出里看不见，实拍这一圈洋红星头很醒目。按 4.9.31 重新导出。'))

# 球形D：同上
FX.append(dict(id='QD14', src='QD13', key='qiuxing_d', name='球形D · 核时间（QD13 参数）', en='QiuxingD40', layers=[
    ('QD13-1', '外层尾巴', {}, {}),
    ('QD13-2', '外层星头', dict(burn=5.4, fade=0.2, sparkRateEnd=0.15, sparkBright=0.15, starBrightCurve='0:1, 0.15:1, 0.2:3, 0.46:3, 0.5:1, 1:1',
                               starSizeCurve='0:1, 0.15:1, 0.2:2, 0.46:2, 0.5:1, 1:1'),     # QD14E2：绿星头亮了还是太小（星头 0.35 m）→ 绿的那段大 2 倍     # QD14E1：+1.74 s 实拍满天亮绿星头，导出里很淡 → 绿的那段（+1.1–2.6 s）星头亮 3 倍；银尾再压一点     # 实拍 +4.3 s 开始变暗、+5.3 s 前后没了（原来 +5 s 还很亮：银色短尾越到后面越密）；银尾压一点，前面的绿星相对亮一些
     {}),
    ('QD13-3', '芯', dict(burn=1.8, fade=0.25, sparkStop=1.45, sparkRateEnd=0.3), {}),     # QD14E2：+1.74 s 还亮的是芯的小火花（星头已经暗了）→ 火花 +1.45 s 停、越到后面越稀     # QD14E1：+1.74 s 芯还很亮（实拍已经淡了）→ +1.35 s 开始暗、+1.8 s 没了     # 实拍芯 +1.5 s 还亮、+1.5 → 1.8 s 暗掉（原来 +1.2 s 就开始暗）
], note='QD13 的效果不动（用户 19:48「基本通过，我略微调整就可以用了」），只对着实拍核时间节点：外层星头 +4.3 s 开始暗、+5.3 s 没了（燃烧 5 → 5.4、淡出 0.25 → 0.2），银色短尾越到后面越稀（生成率末段 ×1.3 → ×0.15、亮度 0.3 → 0.15）；绿星那段（+1.1–2.6 s）星头亮 3 倍——实拍 +1.7 s 满天亮绿星头，导出里很淡。芯 +1.35 s 开始暗、+1.8 s 没了（芯的小火花 +1.45 s 停）；绿星那段星头也大 2 倍。按 4.9.31 重新导出。'))

# 球形C：绿芯入 + 橙引转银辉星（三层：芯 / 外层橙引 / 外层银辉星，外层两层同一个模拟）
C_OUT = dict(seed=11, stars=300, v0=300, vt=20, grav=0.5, speedJit=10, dirJit=1.5, burn=3.3, burnJit=30, fade=0.08, lastFlare=0, ignDelay=None)
FX.append(dict(id='QC12', src='QC11', key='qiuxing_c', name='球形C · 绿芯入 + 橙引转银辉星', en='QiuxingC40', layers=[
    ('QC11-1', '芯（绿）', dict(stars=420, v0=100, vt=13, grav=0.5, speedJit=12, burn=2.1, burnJit=8, fade=0.3, flash=0.6, headSize=1.35, headBright=1,
                               sparkRate=0, sparkStop=0, ignDelay=0.12, ignJit=10),
     dict(stages=[[0, '#ffd9a8'], [0.2, '#fffbe8'], [0.42, '#a6ff52']], xw=0.18, headInt=4)),
    ('QC11-2', '外层 · 橙引', dict(C_OUT, headSize=0.9, headBright=0.05, flash=1, sparkRate=520, sparkStart=0, sparkStop=0.26, sparkLife=0.18, sparkSpread=0.3,
                                 sparkInherit=0.12, sparkBright=2.5, T0=2150, cooling=0.3, glitter=0, duration=1.0),
     dict(stages=[[0, '#ff7a2a']], xw=0.1, headInt=1, **NEUTRAL)),
    ('QC11-2', '外层 · 银辉星', dict(C_OUT, headSize=1.0, headBright=0.9, flash=0, headDim=0.02, headDimUntil=0.45, sparkRate=170, sparkStart=0.42, sparkStop=2.2,
                                  sparkLife=0.32, sparkLifeJit=40, sparkSpread=0.9, sparkInherit=0.15, sparkBright=1.6, sparkGrav=1.2, T0=2900, cooling=0.25,
                                  glitter=1, glitterDelay=0.1, glitterDim=0.95, glitterPeak=8, duration=5.2,
                                  starBrightCurve='0:1, 0.6:1, 0.7:6, 1:6', starSizeCurve='0:1, 0.6:1, 0.7:1.6, 1:1.6'),     # QC12E1：后段暖金光点还是太暗太小 → 亮 6 倍、大 1.6 倍     # NFQ2：+2.2 s 以后实拍是一颗颗亮的暖金光点，模拟太暗太小 → 辉星火花停了以后星头亮 2.2 倍
     dict(stages=[[0, '#fbeaff'], [1.95, '#fff1d6'], [2.5, '#ffc274']], xw=0.3, headInt=1.4, **NEUTRAL)),     # 微带粉的银白；实拍 +2.17 s 已经偏暖
], note='用户 19:48：球形C 是「绿芯入 + 橙引转银辉星」。按实拍重拆三层：芯（青柠绿光点，+0.25 s 前后整团发白、+0.45 起绿，+1.7 开始暗、+2.2 没了）；外层是同一批星的两层——'
        '橙引（开花到 +0.26 s 橙色短放射尾）和银辉星（+0.45 s 起星头亮起来、后面拖一串一闪一闪的银色火花，+2.2 s 火花停、星头转暖金 → 橙，+2.4–3.9 s 一颗颗灭）。'
        '外层初速 300 m/s、终端速度 20 m/s（花径按实拍 +0.5 / +1.0 / +2.3 s 的比例对过），芯终端速度 13 m/s（+1.0 s 以后基本不再张大，最终约外层的 1/3）。'))

# 青柠星：橙引 + 延迟起势（橙 → 柠绿），两层同一个模拟
FX.append(dict(id='QN12', src='QN11', key='qingning', name='青柠星 · 橙引 + 延迟起势（橙 → 柠绿）', en='Qingning40', layers=[
    ('QN11-1', '橙引（只画火花）', dict(burn=3.15, sparkRate=900, sparkStop=0.62, sparkLife=0.32, sparkLifeJit=30, sparkSpread=0.22, sparkInherit=0.1, sparkBright=5, T0=2150,
                                    cooling=0.22, headBright=0.02, flash=0.6, duration=1.3),
     dict(stages=[[0, '#ff6a1a']], xw=0.15, headInt=3.0, ramp1='#7a2a08', ramp2='#ff8a3a', ramp3='#fff0d0')),     # QN12E2：橙引还是偏暗偏褐（灰色渐变图把橙压成褐）→ 暖色渐变图、显示强度 3     # QN12E1：橙引比实拍暗、偏褐 → 显示强度 1.2 → 2
    ('QN11-2', '柠绿星头（延迟起势）', dict(headSize=1.5, headBright=1.6, sparkRate=0, flash=0, burn=3.15,
                                         starBrightCurve='0:0.03, 0.14:0.05, 0.22:0.45, 0.31:1, 1:1'),     # NFQ2：+0.6 s 模拟星头已经全亮，实拍还是橙尾为主 → 起势晚 0.05 s
     dict(stages=[[0, '#ff7a30'], [0.5, '#eaff7a']], xw=0.25, headInt=1.4)),     # 柠绿再饱和一点
], note='用户 19:48：青柠星是「橙引 + 延迟起势的星（从橙到柠绿）」。按实拍时间节点：开花到 +0.4 s 是一团橙色放射尾（橙引，星头看不见）；+0.4 s 起星头从外圈开始亮起来、'
        '+0.95 s 全部变成大颗的柠绿星（起势用「星头亮度随寿命」从 0.05 升到 1：+0.45 → +0.95 s）；橙尾 +0.62 s 停、+0.95 s 前后收完；柠绿星亮度不减，+3.0–3.3 s 集中熄灭。'
        '花径随时间的比例和实拍对过（初速 140 m/s、终端速度 18.6 m/s，和 QN11 一样）。'))


def build(expo):
    src = json.loads(SRC.read_text(encoding='utf-8'))
    E = {e['id']: e for e in src['entries']}; C = {c['id']: c for c in src['combos']}
    entries, combos = [], []
    for fx in FX:
        c0 = C[fx['src']]; ids = []
        for i, (lid, title, pm, mm) in enumerate(fx['layers']):
            e0 = E[lid]; eid = f"{fx['id']}-{i + 1}"; ids.append(eid)
            p = copy.deepcopy(e0['p']); m = copy.deepcopy(e0['m'])
            for k, v in pm.items():
                if v is None: p.pop(k, None)
                else: p[k] = v
            m.update(mm)
            if eid in expo: p['exposure'] = expo[eid]
            entries.append({'id': eid, 'date': DATE, 'name': f"{fx['name']} · {title}", 'base': e0.get('base'), 'tags': f"{fx['name']} {eid}",
                            'p': p, 'm': m, 'note': fx['note'], 'video': c0.get('video')})
        L0 = c0['layers']
        combos.append({'id': fx['id'], 'date': DATE, 'name': fx['name'],
                       'layers': [dict({'m': 'rep:' + eid, 'scale': (L0[min(i, len(L0) - 1)] or {}).get('scale', 1), 'delay': 0},
                                       **({'out': L0[i]['out']} if i < len(L0) and L0[i].get('out') else {})) for i, eid in enumerate(ids)],
                       'layerNames': [t for _, t, _, _ in fx['layers']], 'note': fx['note'], 'look': LOOK, 'tags': fx['name'] + ' ' + fx['id'],
                       'video': c0.get('video'), 'vmeta': c0.get('vmeta')})
    doc = {'说明': '球形A / D 核时间、球形C / 青柠星重做（对话框新花型，用户 2026-10-07 19:48）。由 analysis/scripts/球形与青柠.py 生成，不要手改。', 'entries': entries, 'combos': combos}
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding='utf-8')
    print('→', OUT.relative_to(ROOT), len(entries), '层', len(combos), '组合')


def write_status(jobs=None):
    d = json.loads(STATUS.read_text(encoding='utf-8'), object_pairs_hook=collections.OrderedDict)
    for e in d['effects']:
        for fx in FX:
            if e['key'] == fx['key']:
                e['工作版'] = fx['id']; e['主条目'] = fx['id']
                if fx['id'] == 'QC12': e['层英文名'] = ['Core', 'Lead', 'Glitter']     # 三层：芯 / 外层橙引 / 外层银辉星
                if jobs: e['导出任务'] = (e.get('导出任务') or []) + [j for j in jobs if j.startswith(fx['id'] + 'E') and j not in (e.get('导出任务') or [])]
    STATUS.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def write_jobs(what, tag):
    J = ROOT / 'analysis' / 'jobs'; ids = []
    for fx in FX:
        if what == 'export':
            jid = f"{fx['id']}E{tag}"; ids.append(jid)
            (J / f'{jid}.json').write_text(json.dumps({'id': jid, 'type': 'export', 'effect': fx['key'], 'entry': fx['id'], 'name': fx['en'], 'priority': 6,
                'note': f"对话框新花型（用户 10-07 19:48）：{fx['name']}。导出 + 回放检查 + 烘焙回放。"}, ensure_ascii=False, indent=1), encoding='utf-8')
    print('任务：', ids); return ids


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--expo', nargs='*'); ap.add_argument('--status', action='store_true'); ap.add_argument('--jobs'); ap.add_argument('--tag', default='1')
    a = ap.parse_args(); expo = {}
    for f in a.expo or []: expo.update({k: v for k, v in json.loads(pathlib.Path(f).read_text(encoding='utf-8')).items() if not k.startswith('_')})
    if OUT.exists() and not a.expo:     # 没给曝光：保留上一次写进条目的曝光
        for e in json.loads(OUT.read_text(encoding='utf-8'))['entries']:
            if 'exposure' in e['p']: expo.setdefault(e['id'], e['p']['exposure'])
    build(expo)
    ids = write_jobs(a.jobs, a.tag) if a.jobs else None
    if a.status or ids: write_status(ids)
