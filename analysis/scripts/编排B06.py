#!/usr/bin/env python3
"""B06：低层回 150 m、扇重排（不叠、跟拍、不重复）、P2 / P4 / P6 三朵等大（跨年秀 22，用户 10-15 01:04）。

用户 01:04：「80m的低矮效果不是很好，构图很差，以及扇形会有重叠，而且扇形的点位播放与顺序还有节奏很呆板，经常重复播放，没有对节奏与变化」
「这个上面大的右边两个小的也很丑，你可以试试小的不要再P3和P5放，放到P2与P6，大小与P4的差不多大」「把day版也一起改了」。

底稿 = B03 修订2（用户 10-13 22:55 认）→ B04 的小平台前台小花（不换 Tiny）→ 下面三件 → B05 的名字和手游 6 种（编排B05.build）：
  ① 坝顶低层不用 80 m：B 点小号球花留 B03 修订2 的 S 尾缀（开花 150 m + 原 dz），等于 B04 的 --no-tiny；Low80 这根尾缀 B06 不用。
  ② 「P4 大 + P3 / P5 中」（蓄势收窄的「3」）→ P2 / P4 / P6 三朵同一种大号金芒菊、同一大小；两侧比中间低 20 m（拱形），
     晚 P4 0.1 s（里→外）。P2 / P6 是偶数点，手游也放（和白墙 7 的手游三朵同样排法）。
  ③ 扇整套重排。旧扇的时刻（M / L 尾缀起飞 = 托底，用户 10-11 14:08 R8）当「扇位」，0.9 s 内挤在一起的几组并成一个扇位；
     每个扇位从 21 种扇形里挑一个（下面 FIG：重 11 种、轻 10 种），挑法：
       - 这一波有大号 / 主角或这一小节响（≥ -8.5 dB）用「重」的一组，否则「轻」的一组；
       - 和这一波球花的方向一致的优先（里→外 / 外→里 / 左→右 / 右→左 / 齐发）；这一小节起音多（≥ 4）优先多步的，少就优先齐发的；
       - 前两个扇位用过的扇形不用；颜色（银 / 红）和上一个扇位换着来；同一扇形里束型随机挑（种子固定，重编结果不变）。
     时刻跟拍：第一步落在托底时刻前后各一个八分音符里起音最强的那个（踩不上就取最近的），后面几步落在曲子的起音 / 底鼓上
     （analysis/music/汪洋与浩渺_分析.json 的 onsets / kickOnsets，±70 ms 算踩上；八分音符网格 = 小节 / 8），再取 0.1 s 网格。
     不叠：两把扇同时亮（出束到寿命 75 %）、横向距离 < 两边半宽之和 + 12 m 就算叠（半宽 = 束长 × sin 最大倾角；
     束长按预览值银 65 / 红 75 m、UE 没量）→ 换下一个扇形，都不行挪一拍，再不行这个扇位不放。所以宽扇（九束红 / 十三束银）只隔点放，
     相邻点只放五束银扇或单束红。空小节（41 / 65 / 96）不放；倒计时不放。
档位：扇按 tier_points（≥ 6 点中配去两端；叠层低配不出；≤ 2 点三档全放），和以前一样。扇不上手游。

用法：python3 -I analysis/scripts/编排B06.py [--base 逻辑方案_B03r2m.json] [--name B06] [--out-dir 协作/编排B01] [--seed 20261015]
      python3 -I analysis/scripts/编排B06.py --fan-audit 逻辑方案_B05.json     # 只用同一把尺量一份逻辑方案的扇（叠 / 对拍 / 重复）
"""
import argparse
import bisect
import copy
import importlib.util
import json
import math
import random
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'analysis/scripts' / file)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


B04 = _load('b04', '编排B04.py')
B05 = _load('b05', '编排B05.py')
b = B05.b
ovl = B05.ovl
q1 = b.q1
SONG = json.loads((ROOT / 'analysis/music/汪洋与浩渺_分析.json').read_text(encoding='utf-8'))

# —— 扇的几何（预览值；UE 没量） ——
REACH = {'R': b.BEAM_EST['beamReachM']['P_EFX_FireWorks_FanComet_01'], 'S': b.BEAM_EST['beamReachM']['P_EFX_FireWorks_FanSilver_01']}
MARGIN = 12.0          # 两把扇之间至少留的空（m）
LITF = 0.75            # 亮着 = 出束到寿命的 75 %（同 编排重叠体检.py 的「还亮着」）
MIN_SHARED = 0.2       # 同时亮着不到 0.2 s 不算叠
FANS = ('R1', 'R5', 'R9', 'R9R', 'S5', 'S9', 'S13')


def fan_geo(sp):
    beams = b.fan_beams(sp)
    roll = max(abs(x['roll']) for x in beams)
    hw = REACH[sp[0]] * math.sin(math.radians(roll)) if roll else 6.0      # 单束：按 6 m 粗
    offs = [x['off'] for x in beams]
    return dict(hw=round(hw, 1), off0=min(offs), off1=max(offs), life=b.life_of(sp), beams=len(beams))


GEO = {sp: fan_geo(sp) for sp in FANS}
COLOR = {sp: 'red' if sp[0] == 'R' else 'silver' for sp in FANS}
A4, O4 = ['B0', 'B2', 'B4', 'B6'], ['B1', 'B3', 'B5', 'B7']

# —— 扇形（21 种）：steps = [[(点, 束型), …], …]；gap = 相邻两步隔几个八分音符（最少, 最多）；dir 跟球花方向对 ——
#    束型写成元组 = 这一扇形里随机挑一个（全扇形同一个）
FIG = {
    # 重：大号 / 主角 / 响的小节
    'wideAlt':   dict(zh='隔点宽扇齐开', pool='H', dir='together', gap=(0, 0), steps=lambda r, x: [[(p, 'S13') for p in r.choice([A4, O4])]]),
    'wingsIn':   dict(zh='两翼合拢', pool='H', dir='in', gap=(0, 0), steps=lambda r, x: [[('B0', 'R9'), ('B2', 'R9'), ('B5', 'R9R'), ('B7', 'R9R')]]),
    'wingsOut':  dict(zh='两翼展开', pool='H', dir='out', gap=(0, 0), steps=lambda r, x: [[('B0', 'R9R'), ('B2', 'R9R'), ('B5', 'R9'), ('B7', 'R9')]]),
    'chaseLR':   dict(zh='隔点追·左→右', pool='H', dir='left', gap=(1, 2), steps=lambda r, x: [[(p, 'R9')] for p in A4]),
    'chaseRL':   dict(zh='隔点追·右→左', pool='H', dir='right', gap=(1, 2), steps=lambda r, x: [[(p, 'R9R')] for p in reversed(O4)]),
    'centerOut': dict(zh='中心外扩', pool='H', dir='out', gap=(2, 4), steps=lambda r, x: [[('B3', 'S9'), ('B4', 'S9')], [('B1', 'R9R'), ('B6', 'R9')]]),
    'pressIn':   dict(zh='外→里压阵', pool='H', dir='in', gap=(1, 2), sp=('S9', 'R5'),
                      steps=lambda r, x: [[('B0', x), ('B7', x)], [('B2', x), ('B5', x)], [('B3', x), ('B4', x)]]),
    'redAlt':    dict(zh='隔点红扇齐开', pool='H', dir='together', gap=(0, 0), sp=('R5', 'R9'), steps=lambda r, x: [[(p, x) for p in r.choice([A4, O4])]]),
    'wideLR':    dict(zh='宽扇隔点走·左→右', pool='H', dir='left', gap=(1, 2), steps=lambda r, x: [[(p, 'S13')] for p in A4]),
    'wideRL':    dict(zh='宽扇隔点走·右→左', pool='H', dir='right', gap=(1, 2), steps=lambda r, x: [[(p, 'S13')] for p in reversed(O4)]),
    'silverWings': dict(zh='两翼银扇', pool='H', dir='together', gap=(0, 0), steps=lambda r, x: [[(p, 'S9') for p in ('B0', 'B2', 'B5', 'B7')]]),
    # 轻：中号 / 安静的小节
    'centerPair': dict(zh='中间一对', pool='L', dir='together', gap=(0, 0), sp=('S5', 'R5', 'S9'), steps=lambda r, x: [[('B3', x), ('B4', x)]]),
    'endPair':    dict(zh='两端一对', pool='L', dir='together', gap=(0, 0), sp=('S9', 'R5', 'S13'), steps=lambda r, x: [[('B0', x), ('B7', x)]]),
    'in4':        dict(zh='外→里', pool='L', dir='in', gap=(1, 2), steps=lambda r, x: [[('B0', 'S5'), ('B7', 'S5')], [('B1', 'S5'), ('B6', 'S5')], [('B2', 'S5'), ('B5', 'S5')], [('B3', 'S5'), ('B4', 'S5')]]),
    'out4':       dict(zh='里→外', pool='L', dir='out', gap=(1, 2), steps=lambda r, x: [[('B3', 'S5'), ('B4', 'S5')], [('B2', 'S5'), ('B5', 'S5')], [('B1', 'S5'), ('B6', 'S5')], [('B0', 'S5'), ('B7', 'S5')]]),
    'midPair':    dict(zh='中段一对', pool='L', dir='together', gap=(0, 0), sp=('S5', 'R1'), steps=lambda r, x: [[('B2', x), ('B5', x)]]),
    'walkLR':     dict(zh='逐点走·左→右', pool='L', dir='left', gap=(1, 1), steps=lambda r, x: [[(f'B{i}', 'S5')] for i in range(8)]),
    'walkRL':     dict(zh='逐点走·右→左', pool='L', dir='right', gap=(1, 1), steps=lambda r, x: [[(f'B{i}', 'S5')] for i in reversed(range(8))]),
    'rain':       dict(zh='单束红雨', pool='L', dir='scatter', gap=(1, 1), steps=lambda r, x: [[(p, 'R1')] for p in rain_order(r)]),
    'altSwap':    dict(zh='隔点交替', pool='L', dir='together', gap=(2, 4), steps=lambda r, x: [[(p, 'S5') for p in A4], [(p, 'S5') for p in O4]]),
    'alt4':       dict(zh='隔点四把', pool='L', dir='together', gap=(0, 0), sp=('R5', 'S9'), steps=lambda r, x: [[(p, x) for p in r.choice([A4, O4])]]),
}
DIR_OF_ORDER = {'center-out': 'out', 'outside-in': 'in', 'left': 'left', 'L': 'left', 'right': 'right', 'R': 'right', 'together': 'together', 'source': 'together', 'out': 'out', 'in': 'in'}
DIR_CN = {'out': '里→外', 'in': '外→里', 'left': '左→右', 'right': '右→左', 'together': '齐发', 'scatter': '散点'}


def rain_order(r):
    """单束红雨：8 个点打乱，但相邻两步不落在相邻点（看着是「雨」不是「走」）"""
    for _ in range(200):
        o = [f'B{i}' for i in range(8)]
        r.shuffle(o)
        if all(abs(int(a[1]) - int(c[1])) > 1 for a, c in zip(o, o[1:])):
            return o
    return ['B0', 'B4', 'B1', 'B5', 'B2', 'B6', 'B3', 'B7']


# —— 拍点：八分音符网格 + 曲子的起音 / 底鼓 ——
class Grid:
    def __init__(self, plan):
        self.bar0, self.bar = plan['bar0S'], plan['barS']
        self.e8 = self.bar / 8
        off = plan['musicOffsetS']
        self.on = sorted(t + off for t in SONG['onsetsMusicS'])
        self.kick = sorted(t + off for t in SONG['kickOnsetsMusicS'])

    @staticmethod
    def _near(xs, t, tol=0.07):
        i = bisect.bisect_left(xs, t)
        return any(0 <= j < len(xs) and abs(xs[j] - t) <= tol for j in (i - 1, i))

    def t(self, k):
        return self.bar0 + k * self.e8

    def k(self, t):
        return round((t - self.bar0) / self.e8)

    def strength(self, k):
        t = self.t(k)
        s = 2.0 * self._near(self.kick, t) + 1.0 * self._near(self.on, t)
        s += 0.6 if k % 8 == 0 else 0.3 if k % 2 == 0 else 0.0
        return s

    def hit(self, t):
        """这一时刻踩没踩上曲子的起音 / 底鼓（±70 ms）"""
        return self._near(self.kick, t) or self._near(self.on, t)


def bar_info(t):
    k = max(0, min(len(b._MUS) - 1, int((t - b.BAR0) // b.BAR)))
    return b._MUS[k]


def lit(ev):
    g = GEO[ev['sp']]
    return ev['t'] + g['off0'], ev['t'] + g['off1'] + LITF * g['life']


def clash(e1, e2):
    a0, a1 = lit(e1)
    b0, b1 = lit(e2)
    if min(a1, b1) - max(a0, b0) < MIN_SHARED:
        return False
    dx = abs(b.PT[e1['point']]['x'] - b.PT[e2['point']]['x'])
    return dx < GEO[e1['sp']]['hw'] + GEO[e2['sp']]['hw'] + MARGIN


def fan_events(cues):
    return [dict(t=e['launch'], point=e['point'], sp=c['sp'], cue=c['id']) for c in cues if c['size'] == 'F' for e in c['events']]


def audit(cues, plan, label=''):
    """同一把尺量扇：叠（同时亮、横向挤）、对拍、扇形重复"""
    g = Grid(plan)
    ev = sorted(fan_events(cues), key=lambda x: x['t'])
    pairs, by = [], defaultdict(set)
    for i, e in enumerate(ev):
        for f in ev[i + 1:]:
            if f['t'] - e['t'] > 6:
                break
            if clash(e, f):
                pairs.append((e, f))
                by[(e['cue'], f['cue'])].add(round(max(e['t'], f['t']), 1))
    same_pt = sum(1 for e, f in pairs if e['point'] == f['point'])
    starts = sorted({round(e['t'], 1) for e in ev})
    hits = sum(1 for t in starts if g.hit(t))
    cue_starts = [min(e['launch'] for e in c['events']) for c in cues if c['size'] == 'F']
    seq = []                                   # 一个扇位（B06：同一 F 编号；旧版：一个片段）一个「扇形」
    for c in sorted((c for c in cues if c['size'] == 'F'), key=lambda c: min(e['launch'] for e in c['events'])):
        key = c['id'].rstrip('abc') if c.get('figure') else c['id']
        shape = c.get('figure') or f"{c['sp']}·{''.join(sorted(e['point'][1] for e in c['events']))}"
        if seq and seq[-1][0] == key:
            continue
        seq.append((key, shape))
    rep = sum(1 for a, z in zip(seq, seq[1:]) if a[1] == z[1])
    shapes = Counter(x[1] for x in seq)
    full8 = sum(1 for c in cues if c['size'] == 'F' and len({e['point'] for e in c['events']}) == 8 and len({e['launch'] for e in c['events']}) > 1
                and max(e['launch'] for e in c['events']) - min(e['launch'] for e in c['events']) <= 0.8)
    return dict(label=label, fanCues=len(cue_starts), fanEvents=len(ev), clashPairs=len(pairs), clashSamePoint=same_pt, clashCuePairs=len(by),
                clashList=[dict(a=a, b=z, t=sorted(ts)) for (a, z), ts in sorted(by.items(), key=lambda kv: min(kv[1]))][:60],
                distinctLaunchTimes=len(starts), onBeatOrOnset=round(hits / max(1, len(starts)), 3),
                slots=len(seq), consecutiveSameShape=rep, distinctShapes=len(shapes), topShapes=shapes.most_common(5), eightPointSweeps=full8,
                bySpecies=dict(Counter(e['sp'] for e in ev)))


# —— ① 低层不换（B04 --no-tiny）+ 小平台前台小花 ——
def base_cues(plan):
    cues = copy.deepcopy(plan['cues'])
    plat = B04.platform(cues, True)
    cues.sort(key=lambda c: (min(e['launch'] for e in c['events']), c['id']))
    return cues, plat


def base_regression(plan):
    """B04 的 Tiny 版用同一套函数重做一遍，应和 逻辑方案_B04.json 逐条相同（证明底稿走的是同一条路）"""
    cues = copy.deepcopy(plan['cues'])
    B04.low_layer(cues)
    B04.platform(cues, True)
    cues.sort(key=lambda c: (min(e['launch'] for e in c['events']), c['id']))
    ref = json.loads((ROOT / '协作/编排B01/逻辑方案_B04.json').read_text(encoding='utf-8'))['cues']
    strip = lambda cs: [{k: v for k, v in c.items() if not (c['size'] == 'X' and k in ('label', 'name'))} for c in cs]   # 小平台标签 B05 改过名（XS → Tiny）
    return strip(cues) == strip(ref)


# —— ② P4 大 + P3 / P5 中 → P2 / P4 / P6 三朵等大 ——
def trio(cues):
    by = {c['id']: c for c in cues}
    log = []
    for c in cues:
        top = by.get(c.get('splitOf'))
        if (c['size'] != 'M' or c['group'] != 'P' or c.get('mobile') == 'only' or not top or top['size'] != 'L'
                or sorted(e['point'] for e in c['events']) != ['P3', 'P5'] or [e['point'] for e in top['events']] != ['P4']):
            continue
        te = top['events'][0]
        rise, life = te['burst'] - te['launch'], te['end'] - te['burst']
        dz = max(0.0, te['dz'] - 20.0)
        launch = q1(te['launch'] + 0.1)
        old = dict(points=[e['point'] for e in c['events']], sp=c['sp'], size=c['size'], dz=[e['dz'] for e in c['events']], burst=c['events'][0]['burst'])
        c.update(sp=top['sp'], templateId=top['templateId'], size='L', sizeK=top.get('sizeK', 1.0), mobile=True, points=['P2', 'P6'],
                 label=f"{b.SPECIES[top['sp']][1]}（P2 P6，和 P4 一样大）", name=c['name'].split(' · ')[0] + f" · {b.SPECIES[top['sp']][1]}（P2 P6，和 P4 一样大）",
                 events=[dict(point=p, launch=launch, burst=round(launch + rise, 6), end=round(launch + rise + life, 6), dz=dz, H=round(te['H'] + 0.1, 4)) for p in ('P2', 'P6')],
                 profiles={'medium': ['P2', 'P6'], 'low': ['P2', 'P6']}, trio=True)
        log.append(dict(cue=c['id'], with_=top['id'], t=round(te['burst'], 2), before=old,
                        after=dict(points=['P2', 'P6'], sp=top['sp'], size='L', dz=[dz, dz], burst=round(launch + rise, 3), centerDz=te['dz'])))
    return log


# —— ③ 扇 ——
def fan_slots(cues):
    """旧扇的时刻当扇位：0.9 s 内挤在一起的并成一个（同一波的托底扇 + 扇组常常叠在同一刻同一点上）"""
    by = {c['id']: c for c in cues}
    fans = sorted((c for c in cues if c['size'] == 'F'), key=lambda c: min(e['launch'] for e in c['events']))
    groups = []
    for c in fans:
        t = min(e['launch'] for e in c['events'])
        if groups and t - groups[-1]['t1'] <= 0.9:
            groups[-1]['fans'].append(c)
            groups[-1]['t1'] = max(groups[-1]['t1'], t)
        else:
            groups.append(dict(fans=[c], t0=t, t1=t))
    out = []
    for g in groups:
        base = [c for c in g['fans'] if c.get('baseOf')]
        anchor = min(min(e['launch'] for e in c['events']) for c in (base or g['fans']))
        waves = [by[i] for c in base for i in c['baseOf'] if i in by]
        lead = max(waves, key=lambda w: ({'L': 3, 'M': 2, 'S': 1}.get(w['size'], 0), len(w['events'])), default=None)
        info = bar_info(anchor)
        heavy = (any(w['size'] == 'L' for w in waves) or any(c['sp'] == 'S13' for c in g['fans']) or info['rmsDb'] >= b.HEAVY_DB
                 or not out)                                                  # 点火那一下
        out.append(dict(anchor=anchor, section=g['fans'][0]['section'], old=[c['id'] for c in g['fans']], oldEvents=sum(len(c['events']) for c in g['fans']),
                        baseOf=[w['id'] for w in waves], heavy=heavy, dir=DIR_OF_ORDER.get(lead['order'], 'together') if lead else 'together',
                        onsets=info['onsets'], kicks=info['kicks'], rmsDb=info['rmsDb'], hero=any(w['sp'] in ('GK', 'GKH') for w in waves), zero=not out))
    return out


def step_times(grid, anchor, n, gap, exact=False):
    """第一步：托底时刻前后一个八分音符里最强的；之后每步在 [gap0, gap1] 个八分音符后找最强的"""
    k0 = grid.k(anchor)
    if exact:
        ts = [anchor]
        k = k0
    else:
        cand = [k0, k0 - 1, k0 + 1]
        k = max(cand, key=lambda x: (grid.strength(x), -abs(grid.t(x) - anchor)))
        ts = [grid.t(k)]
    for _ in range(n - 1):
        lo, hi = gap
        k = max(range(k + lo, k + hi + 1), key=lambda x: (grid.strength(x), -x))
        ts.append(grid.t(k))
    return ts


def in_quiet(t):
    return any(a <= t <= z for a, z in b.QUIET)


def fig_color(k):
    sps = [sp for st in FIG[k]['steps'](random.Random(0), (FIG[k].get('sp') or (None,))[0]) for _, sp in st]
    return Counter(COLOR[sp] for sp in sps).most_common(1)[0][0]


def choose(slot, rng, recent, last_color, used, used_sec):
    pool = 'H' if slot['heavy'] else 'L'
    names = [k for k, v in FIG.items() if v['pool'] == pool and k not in recent]
    busy = slot['onsets'] >= 4

    def w(k):
        f = FIG[k]
        x = 1.0
        if f['dir'] == slot['dir']:
            x *= 3.0                                            # 和这一波球花同方向
        multi = f['gap'] != (0, 0)
        x *= 2.0 if multi == busy else 1.0                      # 起音多 → 多步；少 → 齐发
        if not f.get('sp') and fig_color(k) != last_color:
            x *= 2.0                                            # 和上一个扇位换颜色
        x *= 0.6 ** used_sec[(slot['section'], k)] * 0.85 ** used[k]   # 用过的少用（同一段更少）
        return x
    order = []
    names = names[:]
    while names:                               # 按权重抽签排个先后（种子固定）
        tot = sum(w(k) for k in names)
        r, acc = rng.random() * tot, 0.0
        for k in names:
            acc += w(k)
            if r <= acc:
                order.append(k)
                names.remove(k)
                break
    if slot.get('zero') and 'centerOut' in order:      # 点火那一下：金芒菊从 P4 往外开，扇也从中间往外
        order.remove('centerOut')
        order.insert(0, 'centerOut')
    out = []
    for k in order:
        f = FIG[k]
        opts = list(f.get('sp', (None,)))
        rng.shuffle(opts)
        opts.sort(key=lambda s: s is not None and COLOR[s] == last_color)   # 和上一个扇位换颜色
        out += [(k, x) for x in opts]
    return out


def place_fans(cues, plan, seed):
    grid = Grid(plan)
    secs = {s['id']: s for s in plan['sections']}
    slots = fan_slots(cues)
    keep = [c for c in cues if c['size'] != 'F']
    rng = random.Random(seed)
    placed, new, log, recent, last_color = [], [], [], [], None
    used, used_sec = Counter(), Counter()
    for i, s in enumerate(slots):
        done = None
        exact = s['anchor'] < plan['audio']['zeroShowS'] + 0.5          # 点火那一下不挪
        for shift in (0, 2, -2, 4):                                      # 都不行就挪一拍（2 个八分音符）
            anchor = s['anchor'] + shift * grid.e8
            for k, x in choose(s, rng, recent, last_color, used, used_sec):
                f = FIG[k]
                steps = f['steps'](rng, x)
                ts = step_times(grid, anchor, len(steps), f['gap'] if len(steps) > 1 else (0, 0), exact=exact and shift == 0)
                ev = [dict(t=q1(t), point=p, sp=sp) for st, t in zip(steps, ts) for p, sp in st]
                if any(in_quiet(e['t']) or e['t'] < plan['audio']['zeroShowS'] - 0.05 for e in ev):
                    continue
                if any(clash(e, f2) for j, e in enumerate(ev) for f2 in ev[j + 1:]) or any(clash(e, p) for e in ev for p in placed):
                    continue
                done = (k, x, ev, shift)
                break
            if done:
                break
        if not done:
            log.append(dict(slot=i, anchor=round(s['anchor'], 2), section=s['section'], placed=None, old=s['old']))
            continue
        k, x, ev, shift = done
        placed += ev
        recent = (recent + [k])[-2:]
        used[k] += 1
        used_sec[(s['section'], k)] += 1
        cols = Counter(COLOR[e['sp']] for e in ev)
        last_color = cols.most_common(1)[0][0]
        f = FIG[k]
        wave = ('托底扇·' if s['baseOf'] else '扇组·') + f['zh']
        for j, sp in enumerate(sorted({e['sp'] for e in ev}, key=lambda z: min(e['t'] for e in ev if e['sp'] == z))):
            es = sorted((e for e in ev if e['sp'] == sp), key=lambda e: (e['t'], b.px(e['point'])))
            life = b.life_of(sp)
            cid = f'B06_F{i + 1:02d}' + ('' if j == 0 else 'abc'[j - 1])
            label = f"{f['zh']} · {b.SPECIES[sp][1]}"
            c = dict(id=cid, section=s['section'], sp=sp, templateId=b.SPECIES[sp][0], size='F', group='B', points=[e['point'] for e in es],
                     order='source', gap=0.0, layer='extra', tier='trim', label=label, name=f"{secs[s['section']]['name']} · {label}", wave=wave,
                     events=[dict(point=e['point'], launch=e['t'], burst=e['t'], end=round(e['t'] + life, 6), dz=0.0, H=e['t']) for e in es],
                     H0=min(e['t'] for e in es), sizeK=1.0, mobile=False, figure=f['zh'], dir=f['dir'], baseOf=s['baseOf'], slotOf=s['old'])
            c['profiles'] = {'medium': [p for p in c['points'] if p not in ('B0', 'B7')], 'low': []}   # 宪章 R8：中配去最外两点、低配不出
            new.append(c)
        log.append(dict(slot=i, anchor=round(s['anchor'], 2), section=s['section'], heavy=s['heavy'], waveDir=DIR_CN.get(s['dir']), onsets=s['onsets'],
                        placed=f['zh'], species=sorted({e['sp'] for e in ev}), steps=len({e['t'] for e in ev}), events=len(ev), shiftBeats=shift / 2,
                        times=sorted({e['t'] for e in ev}), onBeat=[grid.hit(t) for t in sorted({e['t'] for e in ev})], old=s['old'], oldEvents=s['oldEvents']))
    out = keep + new
    out.sort(key=lambda c: (min(e['launch'] for e in c['events']), c['id']))
    return out, log, slots


# —— 占比（用户 01:04「每个效果用的比例」「每个尺寸用的比例」）——
NEW_NAME = {'小银菊': '银冠菊'}      # 坝顶的「小银菊」= 2814 SilverChry，10-14 改名银冠菊（小平台的小银菊是 2801，另算）
def shares(cues, platform='pc', tier='high'):
    def on(c):
        if platform == 'pc':
            return c.get('mobile') != 'only'
        return c.get('mobile') is not False
    sp, sz, n = Counter(), Counter(), 0
    for c in cues:
        if not on(c):
            continue
        k = len(c['events']) if tier == 'high' else sum(1 for e in c['events'] if e['point'] in c['profiles'][tier])
        if not k:
            continue
        if c['size'] in 'SML':
            name = b.SPECIES[c['sp']][1]
            fam = b.fam(c['sp']) if hasattr(b, 'fam') else c['sp']
            zh = b.SPECIES[fam][1] if fam in b.SPECIES else name
            if c['sp'] in ('GK', 'GKH'):
                zh, size = '金垂柳（主角）', '主角'
            else:
                size = {'S': '小号', 'M': '中号', 'L': '大号'}[c['size']]
                zh = zh.replace('·中（手游）', '').replace('·大', '').replace('（手游）', '')
                zh = NEW_NAME.get(zh, zh)
            if c.get('trail') in ('Low80', 'Tiny'):
                size = '低层 80 m'
            sp[zh] += k
            sz[size] += k
        elif c['size'] == 'X':
            f = next(f for f in b.FRONTF['flowers'] if f['code'] == c['sp'])
            src = f['flowers'][0]['src'] if f['flowers'] else None
            sp['小平台·' + (b.FRONTF['flowerSources'][src]['zh'] if src else 'V形尾缀（不开花）')] += k
            sz['小平台'] += k
        elif c['size'] == 'F':
            sz['扇'] += k
            sp['扇·' + b.SPECIES[c['sp']][1]] += k
    balls = sum(v for k, v in sz.items() if k not in ('扇', '小平台'))
    pct = lambda v, tot: round(100 * v / tot, 1) if tot else 0
    ball_sp = {k: v for k, v in sp.items() if not k.startswith(('扇·', '小平台·'))}
    return dict(platform=platform, tier=tier, balls=balls, fans=sz.get('扇', 0), platformEvents=sz.get('小平台', 0),
                bySize={k: dict(events=v, pctOfBalls=pct(v, balls) if k not in ('扇', '小平台') else None) for k, v in sorted(sz.items(), key=lambda kv: -kv[1])},
                bySpecies={k: dict(events=v, pctOfBalls=pct(v, balls)) for k, v in sorted(ball_sp.items(), key=lambda kv: -kv[1])},
                fansBySpecies={k: v for k, v in sorted(sp.items(), key=lambda kv: -kv[1]) if k.startswith('扇·')},
                platformBySpecies={k: v for k, v in sorted(sp.items(), key=lambda kv: -kv[1]) if k.startswith('小平台·')})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=str(ROOT / '协作/编排B01/逻辑方案_B03r2m.json'))
    ap.add_argument('--name', default='B06')
    ap.add_argument('--out-dir', default=str(ROOT / '协作/编排B01'))
    ap.add_argument('--seed', type=int, default=20261015)
    ap.add_argument('--fan-audit', help='只量一份逻辑方案的扇')
    a = ap.parse_args()
    if a.fan_audit:
        p = json.loads(Path(a.fan_audit).read_text(encoding='utf-8'))
        b.BAR0, b.OFFSET = p['bar0S'], p['musicOffsetS']
        print(json.dumps(audit(p['cues'], p, Path(a.fan_audit).name), ensure_ascii=False, indent=1))
        return
    plan = json.loads(Path(a.base).read_text(encoding='utf-8'))
    b.BAR0, b.OFFSET = plan['bar0S'], plan['musicOffsetS']
    b.QUIET = [(b.T(k), b.T(k + 1) - 0.1) for k in (41, 65, 96)]
    regress = base_regression(plan)
    cues, plat = base_cues(plan)
    log6 = dict(baseSameAsB04Path=regress, lowLayer='B 点小号球花留 S 尾缀 150 m（B03 修订2 的 dz），不换 80 m', platform=len(plat))
    log6['trio'] = trio(cues)
    cues, log6['fans'], slots = place_fans(cues, plan, a.seed)
    # B05：名字 + 手游 6 种
    mid = dict(plan, cues=cues)
    cues5, log5 = B05.build(mid)
    log5['mobileRule'] = B05.mobile_rule(cues5)
    log5['mobileScale'] = B05.scale_table(cues5)
    base_rel = Path(a.base).resolve()
    out = dict(plan, revision=f"{a.name}_lowlayer150_fans_rebeat_trioP2P6_mobile6_from_{plan['revision']}", generator='analysis/scripts/编排B06.py', cues=cues5,
               b05=log5, b06=log6, base=str(base_rel.relative_to(ROOT)) if base_rel.is_relative_to(ROOT) else base_rel.name)
    od = Path(a.out_dir)
    od.mkdir(parents=True, exist_ok=True)
    lp = od / f'逻辑方案_{a.name}.json'
    lp.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    # 体检
    gpu, read_at = B05.census_gpu()
    model = B05.apply_census(gpu)
    ck = B05.run_checks(out, cues5)
    ck['gpuModel'] = dict(source=str(B05.CENSUS.relative_to(ROOT)), readAt=read_at, **model)
    ck['b05'] = log5
    ck['b06'] = log6
    rep = ovl.report(lp)
    ck['overlap'] = {k: v for k, v in rep.items() if k != 'pc'}
    ck['overlap']['pcList'] = rep['pc']
    b05p = ROOT / '协作/编排B01/逻辑方案_B05.json'
    rb = ovl.report(b05p)
    ck['overlapBase'] = dict(file='协作/编排B01/逻辑方案_B05.json', pcIncidents=rb['pcIncidents'], byKind=rb['byKind'],
                             mobile={k: dict(incidents=v['incidents'], totalGapS=v['totalGapS']) for k, v in rb['mobile'].items()})
    b05 = json.loads(b05p.read_text(encoding='utf-8'))
    ck['fanAudit'] = dict(B06=audit(cues5, out, 'B06'), B05=audit(b05['cues'], b05, 'B05'),
                          geometry={k: dict(halfWidthM=v['hw'], lifeS=v['life'], beams=v['beams']) for k, v in GEO.items()}, marginM=MARGIN,
                          figureLibrary=len(FIG), figuresUsed=dict(Counter(x['placed'] for x in log6['fans'] if x['placed'])), slots=len(slots),
                          slotsDropped=[x for x in log6['fans'] if not x['placed']])
    ck['shares'] = {f'{p}-{t}': shares(cues5, p, t) for p in ('pc', 'mobile') for t in ('high', 'medium', 'low')}
    ck['sharesB05'] = {f'{p}-high': shares(b05['cues'], p, 'high') for p in ('pc', 'mobile')}
    (od / f'体检_{a.name}.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    fa = ck['fanAudit']
    print(json.dumps(dict(revision=out['revision'], cues=len(cues5), baseSameAsB04Path=regress, trio=[(x['cue'], x['t']) for x in log6['trio']],
                          tiers={k: v['events'] for k, v in ck['tiers'].items()}, mobile={k: v['events'] for k, v in ck['b02']['mobileTiers'].items()},
                          gpu=ck['gpu']['peak'], gpuAt=ck['gpu']['peakAt'], fanAliveGpu=ck['fanSummary']['aliveGpuPeak'], beatLock=ck['beatLock'], tierNesting=ck['tierNesting']['ok'],
                          mobileRuleViolations=len(log5['mobileRule']['violations']),
                          overlap=dict(pc=ck['overlap']['pcIncidents'], byKind=ck['overlap']['byKind'], mobile={k: v['incidents'] for k, v in ck['overlap']['mobile'].items()},
                                       mobileGapS={k: v['totalGapS'] for k, v in ck['overlap']['mobile'].items()}),
                          overlapB05=dict(pc=ck['overlapBase']['pcIncidents'], mobile={k: v['incidents'] for k, v in ck['overlapBase']['mobile'].items()}),
                          fans={k: {kk: fa[k][kk] for kk in ('slots', 'fanEvents', 'clashPairs', 'clashSamePoint', 'onBeatOrOnset', 'consecutiveSameShape', 'distinctShapes', 'topShapes', 'eightPointSweeps')} for k in ('B06', 'B05')},
                          figures=fa['figuresUsed'], slots=fa['slots'], dropped=len(fa['slotsDropped'])), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
