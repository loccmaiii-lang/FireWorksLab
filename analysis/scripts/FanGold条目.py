"""金锦冠扇形 FanGold 的条目（对话框FanGold）：生成 analysis/原理/条目_FanGold.json，不要手改 JSON（改这里重跑）。

用户 2026-10-07 16:05「一簇一簇的（参考昨天新作的那个分簇功能做的案例）」+ 参考图 4 个箭头。
结构（原理 analysis/原理/FanGold.md）：
  4 簇 = 4 层（同一套参数，只差方向、种子、延迟）。每层「星的排布 = 分簇 · 一圈 1 簇」，整套簇转角定这一簇朝哪边
  （和「染分牡丹」同一个做法：一圈 1 簇默认朝正上，转角逆时针为正）；层延迟做左 → 右扫射（实拍每排约 0.38 s 扫完）。
  每颗星 = 锦冠金尾彗星：二次阻力减速到顶（约 1.9 s），烧完在顶上爆裂（噼啪）。
用法：python3 analysis/scripts/FanGold条目.py [版本号，缺省 FG1]
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'analysis', '原理', '条目_FanGold.json')

DATE = '2026-10-07'
VIDEO = 'vidio/FanGold.mp4'

# 一簇的星（4 层共用）。单位：m、m/s、s
# 用户 16:53：「一簇（组）里面有多个束（条）细的组合而成，每一束都有类似 RT 尾缀那样的细火星 + 白热火花 / 闪烁火花 / 星头光晕组合而成」
#   → 每簇 18 条细线；每条 = 主火花（细火星）+ 自定义发射器 1（白热火花）+ 自定义发射器 2（闪烁火花）+ 星头亮核光晕，同一层、同一条 Ramp。
BASE = {
    'renderVer': 40,
    'duration': 4.4,
    # 星：分簇 · 一圈 1 簇（朝正上），转角在每层里给
    'stars': 18, 'pattern': 'cluster', 'clusterLayout': 'ring', 'clusterN': 1, 'clusterCone': 9, 'clusterDirJit': 2, 'tilt': 0,
    # 弹道：出膛 105 m/s、终端速度 11 m/s（二次阻力）→ 0.3 s 到顶高 55 %、0.8 s 86 %、1.65 s 到顶约 28 m（实拍「冲上去再吊住」）
    'v0': 105, 'vt': 11, 'grav': 1, 'speedJit': 5, 'dirJit': 1.0, 'massLoss': 0,
    'burn': 1.85, 'burnJit': 4, 'fade': 0.35, 'lastFlare': 0,
    # 星头：亮核 + 光晕
    'headBright': 0.6, 'headSize': 0.35,
    # 细火星（主火花）：细、小、寿命有长有短；出生时热（白）、冷下来变金。一部分延迟闪光
    'sparkRate': 260, 'sparkLife': 1.5, 'sparkLifeJit': 50, 'sparkSpread': 0.15, 'sparkInherit': 0.05, 'sparkDrag': 2.5, 'sparkGrav': 0.25,
    'T0': 2350, 'cooling': 0.35, 'sparkSize': 0.12, 'sparkBright': 1,
    'glitter': 0.25, 'glitterDelay': 0.4, 'glitterPeak': 3,
    # 白热火花（自定义发射器 1，星燃烧时沿路）：很多、很短、很亮 → 星头后面一段白热（星快时长、到顶时短）
    'x1On': 1, 'x1Event': 'trail', 'x1Kind': 'dot', 'x1Rate': 140, 'x1V': 1.5, 'x1VJit': 50, 'x1Inh': 0.12, 'x1Grav': 0, 'x1Drag': 6,
    'x1Life': 0.16, 'x1LifeJit': 30, 'x1Size': 0.16, 'x1SizeJit': 30, 'x1Bright': 1.6, 'x1BrightJit': 30, 'x1BrightCurve': '0:1, 1:0', 'x1Flick': 0,
    # 闪烁火花（自定义发射器 2，沿路少量）：稍大、带闪烁，散在金线两边（闪烁 6 Hz，≤ 0.4 × 帧率）
    'x2On': 1, 'x2Event': 'trail', 'x2Kind': 'dot', 'x2Rate': 30, 'x2V': 2.5, 'x2VJit': 50, 'x2Inh': 0.05, 'x2Grav': 0.3, 'x2Drag': 2.5,
    'x2Life': 0.9, 'x2LifeJit': 40, 'x2Size': 0.2, 'x2SizeJit': 30, 'x2Bright': 1.0, 'x2BrightJit': 40, 'x2BrightCurve': '0:1, 0.7:0.8, 1:0', 'x2Flick': 1, 'x2FlickHz': 6,
    # 顶上的爆裂：每颗星一团细噼啪，0.1–0.5 s 内炸完，离星 2.4 m 内
    'crackle': 36, 'crackleDelay': 0.3, 'crackleR': 2.4, 'crackleV': 1.5, 'crackleSize': 0.15, 'crackleBright': 1.6,
    # 出膛闪光（开花闪光 = 筒口火）
    'flash': 0.35, 'flashR': 1.5,
    'exposure': 2.0,
}
M = {'stages': [[0, '#ffffff']], 'xw': 0.06, 'ramp0': '#000000', 'ramp1': '#7a3a0e', 'ramp2': '#f0b45e', 'ramp3': '#fff4e4', 'headInt': 1, 'tailInt': 1}

# 各版本在 BASE 上改什么（旧版本留着，直到被取代的结果搬进 归档/）
VERSIONS = {
    'FG1': {},
    # FGV1 / FGE-FG1 本机看过（17:30）：一簇多条细线对了；尾巴 1.6 s 就只剩上半截（实拍到 2.8 s 整条线还在、变银白）→ 火花寿命 1.5 → 2.6、冷却 0.35 → 0.22；
    # 更密（每簇 22 条、火花 300/s）；冠带偏小偏暗 → 爆裂 50 个、范围 3 m、亮度 2.4；白热段 0.22 s；时长跟着火花寿命 4.4 → 5.2 s
    'FG2': {'duration': 5.2, 'stars': 22, 'sparkRate': 300, 'sparkLife': 2.6, 'sparkLifeJit': 40, 'cooling': 0.22, 'x1Life': 0.22,
            'crackle': 50, 'crackleR': 3.0, 'crackleBright': 2.4, 'crackleSize': 0.18},
    # FGV2 / FGE-FG2 看过（18:00）：整条线留到 2.8 s 对了；再长一点更像（寿命 3.0）；星烧到过了顶点（1.65 s）才炸，线头往下勾 → 燃烧 1.85 → 1.7；
    # 冠带还是比实拍小、暗（实拍是一整条白色噼啪带）→ 爆裂 64 个、范围 3.4 m、亮度 3.2、小闪 0.22 m
    'FG3': {'duration': 5.6, 'stars': 22, 'sparkRate': 300, 'sparkLife': 3.0, 'sparkLifeJit': 40, 'cooling': 0.22, 'x1Life': 0.22, 'burn': 1.7,
            'crackle': 64, 'crackleR': 3.4, 'crackleBright': 3.2, 'crackleSize': 0.22, 'crackleDelay': 0.32},
}

# 4 簇：左外、左内、右内、右外。转角逆时针为正（+ = 偏左）；延迟 = 左 → 右扫射
LAYERS = [
    ('ClusterL2', '左外簇', +30, 0.00, 11),
    ('ClusterL1', '左内簇', +10, 0.10, 23),
    ('ClusterR1', '右内簇', -10, 0.20, 37),
    ('ClusterR2', '右外簇', -30, 0.30, 53),
]
# 实拍取景（vmeta，按画面高归一化）：出膛点 (390, 1080) px、中间那簇顶上约 853 px = 28 m → 30.5 px/m；
# 时刻对照用的那一排在 7.80 s 出膛（左 → 右扫射，和这里的层延迟同方向）
VMETA = {'t0': 7.80, 'cx': 390 / 720, 'cy': (1080 - 15 * 30.5) / 1280, 'half': 0.22}


def build(VER, over):
    ents, lays = [], []
    for i, (en, cn, roll, delay, seed) in enumerate(LAYERS):
        lid = f'{VER}-{i + 1}'
        p = dict(BASE, **over, clusterRoll=roll, seed=seed)
        ents.append({'id': lid, 'date': DATE, 'name': f'金锦冠扇形 · {cn}', 'base': 'kamuro', 'hidden': True,
                     'tags': f'FanGold 金锦冠扇形 分簇 {cn} {lid}', 'p': p, 'm': dict(M),
                     'note': f'{cn}：一簇 {p["stars"]} 条细金线（细火星 + 白热火花 + 闪烁火花 + 星头光晕），张角（半角）{BASE["clusterCone"]}°，整套簇转角 {roll:+d}°（逆时针为正），比第一簇晚 {delay:.2f} s 出膛。'})
        lays.append({'m': f'rep:{lid}', 'scale': 1, 'delay': delay})
    combo = {'id': VER, 'date': DATE, 'name': '金锦冠扇形 FanGold · 4 簇', 'layers': lays, 'layerNames': [x[1] for x in LAYERS],
             'video': VIDEO, 'burst_t': VMETA['t0'], 'vmeta': VMETA,
             'tags': f'FanGold 金锦冠扇形 分簇 扇形 {VER}',
             'note': '地面扇形组合的一排：4 簇（左外 / 左内 / 右内 / 右外，方向 +30 / +10 / −10 / −30°），每簇 ' + str(BASE['stars'] if not over.get('stars') else over['stars']) + ' 条细金线（每条 = 细火星 + 白热火花 + 闪烁火花 + 星头光晕），'
                     '左 → 右每簇晚 0.1 s 出膛（扫射）；星减速到顶约 1.9 s 烧完，在顶上爆裂（噼啪）。原理 analysis/原理/FanGold.md。',
             'look': ['一簇一簇的：4 簇分得开、每簇是一撮几乎平行的金线', '扫射：左 → 右先后出膛', '顶上爆裂连成一条冠带', '引擎回放 + 游戏内大小']}
    return ents, combo


def main():
    ents, combos = [], []
    for v, over in VERSIONS.items():
        e, c = build(v, over); ents += e; combos.append(c)
    out = {'说明': '金锦冠扇形 FanGold（对话框FanGold，用户 2026-10-07 16:05「一簇一簇的」）。由 analysis/scripts/FanGold条目.py 生成，不要手改。',
           'entries': ents, 'combos': combos}
    json.dump(out, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('写好', OUT, '：', ' / '.join(VERSIONS), '共', len(ents), '层')


if __name__ == '__main__':
    main()
