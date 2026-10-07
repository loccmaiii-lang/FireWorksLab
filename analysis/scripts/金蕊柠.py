"""金蕊柠（金蕊青柠星）：逐帧拆解后用现有花型分层调（对话框新花型，用户 2026-10-07 23:02）。
  「之前有个金蕊青柠星的参考，可以重新拆解帧数，用现有的模板进行分层调试，给我出一个模板，起名尽量用3字，每个名字能看到结构与颜色造型」
原理（逐时刻、层、颜色、半径比）：analysis/原理/金蕊青柠星.md。参考：vidio/2.0/金蕊青柠星_B.mp4（A 同一种玉，作对照）。
四层 = 两个模拟各拆两层（一个发射器只有一条颜色曲线，头尾异色就拆成同一模拟的两层）：
  外层（亲星）：橙引尾（只画火花）+ 柠点星（只画星头，延迟起势）
  芯（金蕊）：  金菊蕊（金色木炭尾，开头过亮发白 → 金 → 橙）+ 红点蕊（芯星的星头，+1 s 起转粉红）
  python3 analysis/scripts/金蕊柠.py [--expo 曝光.json ...] [--status] [--jobs export|look --tag N]
出：analysis/原理/条目_金蕊柠.json（组合 JQ<n>，层条目 -1 … -4）。不要手改条目（改这里重跑）。
"""
import argparse, collections, copy, json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
BASE_SRC = ROOT / 'analysis' / '原理' / '条目_球形与青柠.json'     # 每层的完整参数从青柠星 QN12-1 起（同一套分层星做法），只改下面写明的键
OUT = ROOT / 'analysis' / '原理' / '条目_金蕊柠.json'
STATUS = ROOT / '协作' / '状态清单.json'
DATE = '2026-10-07'
KEY = 'jinrui_ning'
VER = 'JQ2'
NAME = '金蕊柠 · 金菊芯 + 橙引转柠点星'
EN = 'GoldCoreLime'
LAYER_EN = ['LeadTail', 'LimeStar', 'GoldCore', 'RedCore']
VIDEO = 'vidio/2.0/金蕊青柠星_B.mp4'
VMETA = {'v': 7, 't0': 0.167, 'cx': 0.641, 'cy': 0.343, 'half': 0.23, 'aspect': 1.7778}     # 开花 = 视频 0.167 s（第 5 帧）；花心按 +2.2 / +2.7 s 亮部重心
LOOK = ['开花后同一秒和实拍比（左栏条目点开有实拍对照）：橙引什么时候收、柠绿星头什么时候亮起来、金芯什么时候转橙、几时熄灭', '引擎回放 + 游戏内大小：四层叠起来顺不顺、芯和外层大小比例', '哪一段还差，直接说哪一秒']
WARM = {'ramp0': '#000000', 'ramp1': '#7a2a08', 'ramp2': '#ff8a3a', 'ramp3': '#fff0d0'}
GOLD = {'ramp0': '#000000', 'ramp1': '#8a3a10', 'ramp2': '#ffc979', 'ramp3': '#fff6e8'}
NEUTRAL = {'ramp0': '#000000', 'ramp1': '#4a4a52', 'ramp2': '#c8c8d0', 'ramp3': '#ffffff'}

# 外层（亲星）：同一个模拟。初速 / 终端速度按实拍花径（横向）和 +1.0 s 的比拟合：+0.53 / 2.07 / 3.0 s ≈ 0.68 / 1.29 / 1.42（JQ1 的 150 / 18 后段多长 8–10%）；
# 开头几帧实拍量到的是橙尾（星头还暗着），比星的真实位置小，不按它拟。星数按 +2.6 s 数到的光点（约 470–520 个）
OUTER = dict(seed=23, stars=520, v0=230, vt=15, grav=0.5, speedJit=2, dirJit=1.5, burn=3.85, burnJit=4, fade=0.1, lastFlare=0, ignDelay=0, burstR0=0)
# 芯：同一个模拟。芯外缘（星头）+0.3 / 0.53 / 0.9 / 1.27 / 1.53 / 1.8 s ≈ 外层 +1.0 s 的 0.24 / 0.36 / 0.47 / 0.55 / 0.57 / 0.59，+1.3 s 以后基本不再张大、不往下坠 → 初速 85、终端速度 11.5、重力 0.5
CORE = dict(seed=31, stars=300, v0=85, vt=11.5, grav=0.5, speedJit=8, dirJit=1.5, burn=2.15, burnJit=6, lastFlare=0, ignDelay=0.06, ignJit=10, burstR0=0)

LAYERS = [
    # (层名, 花型, 模拟, 参数, 颜色)
    ('橙引尾', 'botan', OUTER, dict(fade=0.03, flash=0.6, headSize=0.8, headBright=0.02, sparkRate=900, sparkStart=0, sparkStop=0.55, sparkLife=0.32, sparkLifeJit=20,     # JQ1：+1.0 s 还剩一圈暗红尾（实拍 +0.9 s 收完）→ 早停 0.07 s
                                  sparkSpread=0.22, sparkInherit=0.1, sparkBright=5, T0=2150, cooling=0.22, duration=1.3),
     dict(stages=[[0, '#ff6a1a']], xw=0.15, headInt=3.0, **WARM)),
    ('柠点星', 'botan', OUTER, dict(flash=0, headSize=1.7, headBright=1.6, sparkRate=0, duration=4.5,
                                  starBrightCurve='0:0.03, 0.08:0.05, 0.115:0.6, 0.155:1, 1:1'),     # 起势：+0.31 s 起星头从暗亮起来，+0.44 s 一半多、+0.6 s 全亮（JQ1 +0.6 s 还看不出星头）；JQ1 光点比实拍小 → 1.7
     dict(stages=[[0, '#ffc070'], [0.45, '#fff2b0'], [0.78, '#eaff7a']], xw=0.2, headInt=1.4, **NEUTRAL)),     # 刚亮起来是淡暖白，+0.8 s 起柠绿
    ('金菊蕊', 'kiku', CORE, dict(flash=0, fade=0.25, headSize=0.75, headBright=0.6, sparkRate=260, sparkRateEnd=0.5, sparkStart=0, sparkStop=2.0, sparkLife=0.6, sparkLifeJit=30,
                                 sparkSpread=0.5, sparkInherit=0.05, sparkGrav=0.3, sparkDrag=3, sparkBright=1.5, T0=2300, cooling=0.25, duration=2.9),     # 火花几乎不跟星走、寿命长 → 从芯心到星头一根根金丝
     dict(stages=[[0, '#fff6dc'], [1.0, '#ffd27a'], [1.55, '#ffa040'], [1.95, '#ff7a28']], xw=0.3, headInt=2.0, **GOLD)),     # 实拍 +2.07 s 已经是橙红（JQ1 还偏金）→ 各段早 0.1–0.15 s
    ('红点蕊', 'botan', CORE, dict(flash=0, fade=0.3, headSize=1.2, headBright=1.6, sparkRate=0, duration=2.6),     # JQ1：金丝里看不到粉红点 → 大一点、亮一点
     dict(stages=[[0, '#fff0d0'], [0.9, '#ff4f6e']], xw=0.25, headInt=2.5, **NEUTRAL)),     # 前 1 s 埋在过亮的金芯里，+1.1 s 起芯的外缘一圈粉红点
]
NOTE = ('用户 23:02：金蕊青柠星重新逐帧拆、用现有花型分层调、出一个模板。逐帧（开花 = 视频 B 0.167 s）：外层是分层星——开花到 +0.4 s 一团橙色放射尾（橙引），'
        '+0.35 s 起尾巴尖上的星头从暗亮起来（起势），+0.8 s 转柠绿、橙尾 +0.9 s 前后收完，柠绿光点亮度不减，+3.4–3.9 s 陆续熄灭；'
        '芯是金色木炭尾的小菊（金蕊）：+0.15 s 点着，+0.4–1.3 s 过亮发白，+1.4 s 起金、+1.9 s 转橙、+2.5 s 收完；芯星的星头 +1.1 s 起一圈粉红点、+2.2 s 前后灭。'
        '芯 +1.3 s 以后不再张大（约外层最终的 0.38）。')


def build(expo):
    base = next(e for e in json.loads(BASE_SRC.read_text(encoding='utf-8'))['entries'] if e['id'] == 'QN12-1')['p']
    entries, ids = [], []
    for i, (title, typ, sim, pm, mm) in enumerate(LAYERS):
        eid = f'{VER}-{i + 1}'; ids.append(eid)
        p = copy.deepcopy(base); p.pop('exposure', None); p.pop('starBrightCurve', None); p.pop('starSizeCurve', None)
        p.update(sim); p.update(pm)
        if eid in expo: p['exposure'] = expo[eid]
        m = copy.deepcopy(mm); m.setdefault('tailInt', 1)
        entries.append({'id': eid, 'date': DATE, 'name': f'{NAME} · {title}', 'base': typ, 'tags': f'{NAME} {eid} 金蕊青柠星', 'p': p, 'm': m, 'note': NOTE, 'video': VIDEO})
    combos = [{'id': VER, 'date': DATE, 'name': NAME, 'layers': [{'m': 'rep:' + eid, 'scale': 1, 'delay': 0} for eid in ids],
               'layerNames': [l[0] for l in LAYERS], 'note': NOTE, 'look': LOOK, 'tags': NAME + ' ' + VER + ' 金蕊青柠星', 'video': VIDEO, 'vmeta': VMETA}]
    doc = {'说明': '金蕊柠（金蕊青柠星，对话框新花型，用户 2026-10-07 23:02）。由 analysis/scripts/金蕊柠.py 生成，不要手改。', 'entries': entries, 'combos': combos}
    OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding='utf-8')
    print('→', OUT.relative_to(ROOT), len(entries), '层')


def write_status(jobs=None):
    d = json.loads(STATUS.read_text(encoding='utf-8'), object_pairs_hook=collections.OrderedDict)
    e = next((x for x in d['effects'] if x['key'] == KEY), None)
    if e is None:
        e = collections.OrderedDict([('key', KEY), ('名', '金蕊柠（金蕊青柠星）'), ('负责', '对话框新花型（用户 10-07 23:02）'), ('阶段', '制作中'), ('参考', ['vidio/2.0/金蕊青柠星_B.mp4', 'vidio/2.0/金蕊青柠星.mp4']),
                                     ('主条目', VER), ('工作版', VER), ('进度', {'计算': False, 'AI自检': False, '素材导出': False, '用户验收': False}),
                                     ('说明', '芯入り：金色木炭尾的芯（金蕊）+ 外层分层星（橙引 → 柠绿光点）。原理 analysis/原理/金蕊青柠星.md；生成 analysis/scripts/金蕊柠.py。'),
                                     ('下一步', '对话框新花型：逐帧拆好了，四层（橙引尾 / 柠点星 / 金菊蕊 / 红点蕊）对着实拍调，调好写成多层花型模板。'),
                                     ('导出任务', []), ('英文名', EN), ('层英文名', LAYER_EN)])
        d['effects'].append(e)
    e['主条目'] = VER; e['工作版'] = VER
    if jobs: e['导出任务'] = (e.get('导出任务') or []) + [j for j in jobs if j not in (e.get('导出任务') or [])]
    STATUS.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


def write_jobs(what, tag):
    J = ROOT / 'analysis' / 'jobs'
    if what == 'export':
        jid = f'{VER}E{tag}'
        (J / f'{jid}.json').write_text(json.dumps({'id': jid, 'type': 'export', 'effect': KEY, 'entry': VER, 'name': EN, 'priority': 6,
            'note': f'对话框新花型（用户 10-07 23:02）：{NAME}。导出 + 回放检查 + 烘焙回放。'}, ensure_ascii=False, indent=1), encoding='utf-8')
        print('任务：', jid); return [jid]
    if what == 'look':     # 曝光 + 和实拍同一秒（实时模拟口径）
        jid = f'NFJL{tag}'
        steps = [{'name': '自动曝光：四层', 'script': '条目曝光.py', 'args': ['{out}/曝光.json'] + [f'{VER}-{i + 1}' for i in range(len(LAYERS))], 'must': False, 'ok': [0], 'timeout': 1200},
                 {'name': f'{VER} 和实拍同一秒', 'script': '时刻对照.py', 'args': [VER, f'{{out}}/{VER}.jpg', '--times', '0.2,0.33,0.47,0.6,0.8,1.0,1.27,1.53,1.8,2.07,2.33,2.6,3.0,3.4,3.7', '--px', '300'],
                  'must': False, 'ok': [0], 'timeout': 900}]
        (J / f'{jid}.json').write_text(json.dumps({'id': jid, 'type': 'script', 'priority': 6, 'name': f'金蕊柠 {VER}：四层自动曝光 + 和实拍同一秒对照', 'steps': steps}, ensure_ascii=False, indent=1), encoding='utf-8')
        print('任务：', jid); return []


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--expo', nargs='*'); ap.add_argument('--status', action='store_true'); ap.add_argument('--jobs'); ap.add_argument('--tag', default='1')
    a = ap.parse_args(); expo = {}
    for f in a.expo or []: expo.update({k: v for k, v in json.loads(pathlib.Path(f).read_text(encoding='utf-8')).items() if not k.startswith('_')})
    if OUT.exists() and not a.expo:     # 没给曝光：保留上一次写进条目的曝光（层号相同的）
        for e in json.loads(OUT.read_text(encoding='utf-8'))['entries']:
            if 'exposure' in e['p']: expo.setdefault(e['id'], e['p']['exposure'])
    build(expo)
    ids = write_jobs(a.jobs, a.tag) if a.jobs else None
    if a.status or ids: write_status(ids)
