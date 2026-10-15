#!/usr/bin/env python3
"""编排 B08（跨年秀（22），2026-10-15 22:30）：B07 修订1 → 低配限峰、小平台降高放大、同时同高两层、同档按种类大小、时间错开 / 两种交替。

用户 10-15 19:23 / 22:02：
- 「小的烟花太小了，很小气；高度也比较高」「可以不要新出尾缀了嘛，直接缩放行不行」→ 前台小花.json trailScale 0.65、花 36–44 m、对称一对 ±15–22°（数据，不在本文件）；
- 「图4的比例有点怪，中型的完全把小的盖住了」→ 同一刻同高度的 P 排 / B 排小号之字：P 排挂现有中尾缀（新尾缀.json Up210）、B 排 ×0.8（原 ×0.6）；
- 「所有90m的，也有90~110的组别种类区分」「如果不行可以变得更小，譬如90~100这样也可以」→ 小号按种类 90–100，中 / 大号不放大（修订1：每点随机不再叠乘底稿大小版本）；
- 「颜色上现在确实有些太一致了……或者爆开的时间再错开一些」→ 三分之一小号排两种花交替；齐发排每点错开 0 / 0.1 / 0.2 s；一半「里→外」放慢；
- 「B05的性能测试回来了……低配960……两个峰值，到1了之后……降分辨率，贴图会变糊30秒……这几个峰值需要调整下数量」→ PC 低配限峰（cap_low：亮着的浓密金菊面积、1 s 内开花面积两个上限；修订1 换掉原「2 s 开花负担」），墙 / 入口在低配也允许隔点。

用法：python3 -I analysis/scripts/编排B08.py [--cap-dense 4.0 --cap-burst 0（0 = 不用全场 S 上限）]
"""
import argparse
import copy
import importlib.util
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'analysis/scripts' / file)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


B07 = _load('b07', '编排B07.py')
B06, B05, b, ovl = B07.B06, B07.B05, B07.b, B07.ovl
q1, rows, tid, retime, rank_of, thin, tpl_of, HERO = B07.q1, B07.rows, B07.tid, B07.retime, B07.rank_of, B07.thin, B07.tpl_of, B07.HERO

# 同档按种类的基准直径（m，名义值；真实花径大多没在 UE 量过，B08 实机测量回来再校）
SPECIES_DIA = {'CR': 100, 'GC': 100, 'ST': 95, 'SC': 95, 'OG': 90, 'LM': 90,
               'GS': 150, 'ML': 150, 'PW': 150, 'GR': 150, 'GY': 150, 'GP': 150, 'CL': 150}   # 中号不放大：放到 155–160 时和下面小号「两排同高」、和后一排「后压前」多 2–4 处（体检）
NOMINAL = {'S': 90, 'M': 150}
# 两种交替：偶数点原花、奇数点换一个不同色系的同档小号
# 换上去的花寿命不比原花长 0.5 s 以上（长寿命的会盖住后面同高的排，例：23.7 s 金裂星配小青柠 6.6 s，把之字 B 排盖住）；爆裂星、彩千轮没有合适的就不换
# 换上去的都是非银金色系（橙 / 绿 / 紫），银金占比只降不升
PARTNER = {'SC': 'OG', 'ST': 'OG', 'GC': 'OG', 'LM': 'OG',
           'GR': 'GP', 'GY': 'PW', 'GS': 'ML', 'CL': 'ML'}   # 中号：金配绿 / 紫 / 橙（多重菊）
# 低配限峰（960 Translucency 峰）。修订1（10-15 23:10，独立复核第 1 轮）：原「2 s 内开花 × 种类权重」模型和 B05 实测排序反了 6 / 17 对
#   （白墙 4.32 实测 0.6 ms、64 s 2.26 实测 0.95 ms），改成两个量 + 一处单独压；修订2（10-15 23:35，第 2 轮）：点火 / 主角那一刻的排不隔、小平台花算进 S、读数放进 B05_READINGS。
#   ① 亮着的浓密金菊面积 A：金曜菊 / 金蕊青柠 / 金芒菊 / 金锦菊（含大号），开花到寿命 75 %，Σ(直径/230)²。
#      B05 低配：实测 ≥ 0.95 ms 的 182.6 / 189 s 是 5.1 / 8.7；≤ 0.65 ms 的都 ≤ 3.85；0.76 ms 的 18.3 s（点火）3.24 → 上限 3.3。
#   ② 1 s 内开花的面积 S（所有球花 + 小平台花，不含扇）：64.3 s 那个峰 A 只有 2.0，是 9 朵同时开（5 大 + 4 中，S = 6.2）；上限 5.0。
#      S 的区分力很弱：B05 白墙 S 7.6 读数只有 0.62 ms。但白墙和 189 s 都在 182.6 s 那个 1.04 ms 峰之后 30 s 内，
#      用户说到 1 ms 后会降分辨率 30 s，这两个读数可能偏低（推断）→ 不能据此说点灭类便宜，所以 S 把银彩菊也算进去，当作保险。
#   ③ 64.3 s 这个峰两个量都解释不了（59 s 内容几乎一样只有 0.6 ms），所以那一刻单独压到 B05 的 60 % 以下（A 2.0 → 1.3、S 6.2 → 3.7，±2 s 闭区间）。
#   不隔：倒计时、点火（17 s 前开花的排）、主角和主角前后 1 s 内开花的排（主角那一刻的宽度靠两边收边）。
#   修订3（10-15 23:55，用户 10-15 23:48「只要不超过1ms就可以了，也不用减的太厉害……譬如在0.8左右就差不多……构图有点丑」）：
#     A 上限 4.0（B05：3.85 → 0.6 ms、3.24 → 0.76、5.06 → 1.04，按读数插值约 0.8 ms）；不再用全场 S 上限（区分力弱，它造成了大部分刀口）；
#     64.3 s 只压到 S ≤ 4.7（B05 6.2，按比例约 0.8 ms）；低配后一排和前一排同点同心叠的，在中配点里换一组（destack_low）。
#   这些都是从一张截图拟的（读数见 B05_READINGS，时刻 ±2 s、数值 ±0.05 ms），真实开销等实机测量（派活 T09）。
DENSE = {'GY', 'CL', 'CLL', 'GR', 'GRL', 'GS'}
LOCAL_CAPS = [(64.3, 'burst', 4.7)]
# B05 低配、PerfDog 远距离段 Translucency 曲线（用户 10-15 22:02 截图，作者目读；时刻 = 演出秒，±2 s；ms ±0.05）
B05_READINGS = [(5, .22), (16, .3), (18.3, .76), (22, .4), (28.9, .6), (34.5, .65), (40, .45), (50, .32), (59, .6), (65.3, .95), (75, .35), (90, .3),
                (110.8, .52), (120, .45), (125, .6), (140, .35), (148.6, .65), (164.8, .55), (173, .6), (182.6, 1.04), (189, .95), (191.7, .65),
                (195, .62), (199.3, .65), (208, .3)]
B05_PEAKS = [(64.3, 0.95), (182.6, 1.04), (189.0, 0.95)]


def ensure_pc_only(c, cues, by):
    """PC + 手游共用的片段先拆出手游替身（手游照原样），这一步只改 PC 那份"""
    if c.get('mobile') is not True:
        return None
    m = copy.deepcopy(c)
    m.update(id=c['id'] + 'm5', mobile='only', standinOf=c['id'])
    c['mobile'] = False
    cues.append(m)
    by[m['id']] = m
    return m['id']


def zigzag_tiers(cues):
    """P 排小号和 B 排小号同一刻开（之字）：P 排挂中尾缀开到 +210 m（上下两层），B 排 ×0.8"""
    by = {c['id']: c for c in cues}
    ps = [c for c in cues if c['group'] == 'P' and c['size'] == 'S' and c.get('mobile') != 'only' and c['section'] != 'B01_S0']
    log = []
    rise = b.NEWT['trails']['Up210']['riseS']
    for c in list(cues):
        if c['group'] != 'B' or c['size'] != 'S' or c.get('mobile') == 'only':
            continue
        t = min(e['burst'] for e in c['events'])
        hit = [p for p in ps if abs(min(e['burst'] for e in p['events']) - t) <= 1.0]
        if not hit:
            continue
        c['sizeK'] = 0.8
        c['templateId'] = tid(c['sp'], 0.8)
        c['zig'] = True
        for p in hit:
            if p.get('trail') == 'Up210':
                continue
            standin = ensure_pc_only(p, cues, by)
            p['trail'] = 'Up210'
            for e in p['events']:
                life = e['end'] - e['burst']
                e['launch'] = q1(e['burst'] - rise)
                e['burst'] = round(e['launch'] + rise, 6)
                e['end'] = round(e['burst'] + life, 6)
            log.append(dict(t=round(t, 2), up=p['id'], upSp=p['sp'], low=c['id'], lowSp=c['sp'], standin=standin))
    return log


def mix_species(cues, rng):
    """三分之一的小号 / 中号排（P 排、B 排）：奇数位换一个不同色系的同档花（同一刻、同尾缀）"""
    g, by = rows(cues)
    cand = []
    for key, rs in g.items():
        root = by[key]
        if (root['group'] not in 'PB' or root['size'] not in 'SM' or root.get('tier') == 'all'
                or root['section'] == 'B01_S0' or root.get('trail') or root['sp'] not in PARTNER or root.get('zig')):
            continue
        pc = [c for c in rs if c.get('mobile') != 'only']
        pts = {e['point'] for c in pc for e in c['events']}
        if len(pts) < 4 or any(c['sp'] != root['sp'] for c in pc):
            continue
        cand.append((min(e['burst'] for e in root['events']), key, pc, pts))
    cand.sort()
    log = []
    for i, (t, key, pc, pts) in enumerate(cand):
        if i % 3 != 1:
            continue
        xs = sorted(pts, key=b.px)
        odd = set(xs[1::2])
        for c in pc:
            ensure_pc_only(c, cues, by)
            ev = [e for e in c['events'] if e['point'] in odd]
            if not ev:
                continue
            new_sp = PARTNER[c['sp']]
            new = copy.deepcopy(c)
            life = b.life_of(new_sp)
            new.update(id=c['id'] + 'x', splitOf=key, sp=new_sp, templateId=tid(new_sp, c.get('sizeK') or 1.0), label=b.SPECIES[new_sp][1], mobile=False)
            new['events'] = [copy.deepcopy(e) for e in ev]
            for e in new['events']:
                e['end'] = round(e['burst'] + life, 6)
            new['points'] = [e['point'] for e in new['events']]
            c['events'] = [e for e in c['events'] if e['point'] not in odd]
            c['points'] = [e['point'] for e in c['events']]
            cues.append(new)
            log.append(dict(t=round(t, 2), row=key, cue=c['id'], sp=c['sp'], partner=new_sp, points=new['points']))
    cues[:] = [c for c in cues if c['events']]
    return log


def species_base(cues):
    """小号按种类定基准大小（baseK = 种类直径 ÷ 名义直径，sizes_b08 在它上面做每点随机）；倒计时、主角、之字 B 排、手游替身不动；
    B 排小号同一刻上面有 P 排中 / 大号的也不放大（放大了和上面那排同高叠，体检「两排同高」多 2 处）。
    修订1：底稿里每个片段已有大小版本（×0.92 / 1 / 1.08，B01 §11），sizes_b08 不再乘它（原来叠出 0.85 / 1.17）；
    sizes_b08 不处理的排（墙、< 3 点）= 原版本 × 种类基准。"""
    n = Counter()
    upper = [min(e['burst'] for e in c['events']) for c in cues if c['group'] == 'P' and c['size'] in 'ML' and c.get('mobile') != 'only']
    for c in cues:
        if (c['size'] not in NOMINAL or c['sp'] not in SPECIES_DIA or c['section'] == 'B01_S0' or c['sp'] in HERO
                or c.get('zig') or c.get('mobile') == 'only'):
            continue
        if c['group'] == 'B' and c['size'] == 'S' and any(abs(min(e['burst'] for e in c['events']) - t) <= 1.0 for t in upper):
            n['skipUnderUpper'] += 1
            continue
        f = SPECIES_DIA[c['sp']] / NOMINAL[c['size']]
        if abs(f - 1) < 1e-9:
            continue
        k = round((c.get('sizeK') or 1.0) * f, 2)
        c['sizeK'], c['templateId'], c['baseK'] = k, tid(c['sp'], k), round(f, 3)
        n[c['sp']] += len(c['events'])
    return dict(n)


def sizes_b08(cues, rng):
    """同 B07 的每点随机（小 / 中 ×0.92 / 1 / 1.08，大 ×0.92 / 1），乘在种类基准 baseK 上（不乘底稿的片段大小版本）"""
    g, by = rows(cues)
    heroes = [(e['burst'], e['burst'] + 0.75 * (e['end'] - e['burst'])) for c in cues if c['sp'] in HERO and c.get('mobile') != 'only' for e in c['events']]
    log, add = [], []
    for key, rs in g.items():
        for c in rs:
            t0 = min(e['burst'] for e in c['events'])
            if any(a <= t0 <= z for a, z in heroes):
                continue
            if (c['size'] not in 'SML' or c.get('tier') == 'all' or c['sp'] in HERO or c['section'] == 'B01_S0'
                    or c.get('mobile') == 'only' or len(c['events']) < 3 or c.get('zig')):
                continue
            base = c.get('baseK') or 1.0
            ks = [round(base * x, 2) for x in ([0.92, 1.0] if c['size'] == 'L' else [0.92, 1.0, 1.08])]
            pick = {e['point']: rng.choice(ks) for e in c['events']}
            groups = defaultdict(list)
            for e in c['events']:
                groups[pick[e['point']]].append(e)
            keep = max(groups, key=lambda k: (len(groups[k]), -abs(k - base)))
            for k, es in groups.items():
                if k == keep:
                    continue
                new = copy.deepcopy(c)
                new.update(id=f"{c['id']}k{round(k * 100)}", splitOf=key, sizeK=k, templateId=tid(c['sp'], k))
                new['events'] = es
                new['points'] = [e['point'] for e in es]
                new.pop('standinOf', None)
                add.append(new)
            c['events'] = groups[keep]
            c['points'] = [e['point'] for e in c['events']]
            c['sizeK'] = keep
            c['templateId'] = tid(c['sp'], keep)
            log.append(dict(cue=c['id'], sizes={str(k): len(v) for k, v in sorted(groups.items())}))
    cues.extend(add)
    return log


def jitter(cues, rng):
    """齐发排：每个点开花随机错开 0 / 0.1 / 0.2 s；里→外排：每隔一排步距 0.1 → 0.15 s（扫得慢一点）"""
    g, by = rows(cues)
    cand = []
    for key, rs in g.items():
        root = by[key]
        if (root['group'] not in 'PB' or root['size'] not in 'SML' or root.get('tier') == 'all' or root['section'] == 'B01_S0'
                or any(c['sp'] in HERO for c in rs)):
            continue
        cand.append((min(e['burst'] for e in root['events']), key, rs, root))
    cand.sort()
    log, co = Counter(), 0
    for t, key, rs, root in cand:
        order = root.get('order')
        if order == 'together':
            pts = sorted({e['point'] for c in rs for e in c['events']}, key=b.px)
            off = {p: rng.choice([0.0, 0.1, 0.2]) for p in pts}
            for c in rs:
                for e in c['events']:
                    retime(e, e.get('H', e['burst']) + off[e['point']])
            log['together'] += 1
        elif order == 'center-out' and root['group'] == 'P':
            co += 1
            if co % 2:
                continue
            pts = {e['point'] for c in rs for e in c['events']}
            if len(pts) < 5:
                continue
            rk = rank_of(pts, 'center-out')
            H0 = min(e.get('H', e['burst']) for c in rs for e in c['events'] if rk[e['point']] == 0)
            for c in rs:
                c['gap'] = 0.15
                for e in c['events']:
                    retime(e, H0 + rk[e['point']] * 0.15)
            log['centerOutSlow'] += 1
    return dict(log)


def area(c):
    """球花 (直径/230)²；小平台、扇 0"""
    if c['size'] in 'FX':
        return 0.0
    d = (tpl_of(c)['diameter'] or b.DIA[c['size']]) * (c.get('sizeK') or 1.0)
    return d * d / 230 ** 2


def _windows(kind, e):
    if kind == 'dense':
        return e['burst'], e['burst'] + 0.75 * (e['end'] - e['burst'])
    return e['burst'], e['burst'] + 1.0


def _weight(kind, c):
    if kind == 'dense':
        return area(c) if c['sp'] in DENSE else 0.0
    if c['size'] == 'X':                     # 小平台：一组里几朵花的面积（36–44 m，一朵约 0.03）
        f = next(x for x in b.FRONTF['flowers'] if x['code'] == c['sp'])
        return sum(fl['diameter'] ** 2 for fl in f['flowers']) / 230 ** 2
    return area(c)


def load_series(cues, kind, plat='pc', tier='low', dt=0.1, T=216.0):
    """kind = 'dense'：亮着的浓密金菊面积 A；'burst'：1 s 内开花的面积 S"""
    n = int(T / dt) + 1
    h = [0.0] * n
    for c in cues:
        mob = c.get('mobile')
        if (plat == 'pc' and mob == 'only') or (plat == 'mobile' and mob is False):
            continue
        w = _weight(kind, c)
        if not w:
            continue
        pts = None if tier == 'high' else set(c['profiles'][tier])
        for e in c['events']:
            if pts is not None and e['point'] not in pts:
                continue
            a, z = _windows(kind, e)
            for i in range(max(0, int(round(a / dt))), min(n, int(round(z / dt)))):
                h[i] += w
    return h


def peaks(h, dt=0.1, k=6, span=3.0):
    out, s = [], int(span / dt)
    for i, v in enumerate(h):
        if v > 0 and v == max(h[max(0, i - s):i + s + 1]) and (not out or i * dt - out[-1][1] > span):
            out.append((round(v, 2), round(i * dt, 1)))
    return sorted(out, reverse=True)[:k]


def at_peaks(cues, tier='low'):
    """B05 实测峰附近（±2 s，曲线读数的时刻误差）的 A / S 最大值"""
    hs = {k: load_series(cues, k, 'pc', tier) for k in ('dense', 'burst')}
    return {f'{t}': {k: round(max(h[max(0, int((t - 2) / 0.1)):int((t + 2) / 0.1) + 1]), 2) for k, h in hs.items()} for t, _ in B05_PEAKS}


def readings_check(cues):
    """B05 低配：每个读数时刻前 2 s 到当时（闭区间）的 A / S 最大值，和读数比高低（差 > 0.1 ms 的读数对）"""
    hs = {k: load_series(cues, k, 'pc', 'low') for k in ('dense', 'burst')}
    rows_ = [dict(t=t, ms=ms, **{k: round(max(h[max(0, int(round((t - 2) / 0.1))):int(round(t / 0.1)) + 1]), 2) for k, h in hs.items()}) for t, ms in B05_READINGS]
    out = dict(readings=rows_)
    for k in ('dense', 'burst'):
        same = rev = 0
        for x in rows_:
            for y in rows_:
                if x['ms'] > y['ms'] + 0.1:
                    if x[k] > y[k]:
                        same += 1
                    elif x[k] < y[k]:
                        rev += 1
        out[k] = dict(sameOrder=same, reversed=rev)
    return out


def cap_low(cues, caps, dt=0.1):
    """PC 低配：亮着的浓密金菊面积 ≤ caps['dense']，1 s 内开花面积 ≤ caps['burst']。超了就把那一刻贡献最大的一排在低配里再隔一次
    （两端留；3 点留两端；只剩两端换中间一朵），墙 / 入口也可以隔（性能优先，用户 22:02）；倒计时、主角不动。"""
    g, by = rows(cues)
    root_of = {c['id']: key for key, rs in g.items() for c in rs}
    hero_t = [e['burst'] for c in cues if c['sp'] in HERO and c.get('mobile') != 'only' for e in c['events']]
    keep_rows = {key for key, rs in g.items()
                 if min(e['burst'] for c in rs for e in c['events']) < 17.0                       # 倒计时、点火
                 or any(abs(e['burst'] - h) <= 1.0 for c in rs for e in c['events'] for h in hero_t)}   # 主角和它前后 1 s 的收边
    cons = [(kind, cap, None) for kind, cap in caps.items()] + [(kind, cap, (t0 - 2.0, t0 + 2.0)) for t0, kind, cap in LOCAL_CAPS]
    stuck, log, blocked = set(), [], {n: set() for n in range(len(cons))}
    for _ in range(800):
        worst = None
        for n, (kind, cap, win) in enumerate(cons):
            h = load_series(cues, kind, 'pc', 'low', dt)
            idx = [j for j in range(len(h)) if j not in blocked[n] and (win is None or win[0] <= j * dt <= win[1])]
            i = max(idx, key=lambda j: h[j])
            if h[i] > cap + 1e-9 and (worst is None or h[i] / cap > worst[0]):
                worst = (h[i] / cap, kind, i, h[i], n)
        if worst is None:
            break
        _, kind, i, val, n = worst
        t = i * dt
        contrib = defaultdict(float)
        for c in cues:
            if c.get('mobile') == 'only':
                continue
            w = _weight(kind, c)
            if not w:
                continue
            if kind == 'burst' and c['sp'] not in DENSE:   # 挑先隔哪一排：同样面积先隔浓密金菊（白墙实测便宜）
                w *= 0.5
            low = set(c['profiles']['low'])
            for e in c['events']:
                a, z = _windows(kind, e)
                if e['point'] in low and a - 1e-9 <= t < z:
                    contrib[root_of[c['id']]] += w
        done = False
        for key, v in sorted(contrib.items(), key=lambda kv: -kv[1]):
            rs = [c for c in g[key] if c.get('mobile') != 'only']
            if key in stuck or key in keep_rows or by[key]['section'] == 'B01_S0' or any(c['sp'] in HERO for c in rs):
                continue
            wall = by[key].get('tier') == 'all'
            for grp in ('P', 'B', 'F'):
                U = sorted({p for c in rs if c['group'] == grp for p in c['profiles']['low']}, key=b.px)
                if len(U) >= 4:
                    keep = set(thin(U))
                elif len(U) == 3:
                    keep = {U[0], U[-1]}
                elif len(U) == 2:                   # 只剩两端两朵：换成中配里最靠中间的一朵（墙也一样，性能优先；免得剩一朵孤零零在最边上）
                    med = {p for c in rs if c['group'] == grp for p in c['profiles']['medium']}
                    mid = min(med or U, key=lambda p: abs(b.px(p)))
                    keep = {mid} if abs(b.px(mid)) < 150 else set()   # 中间没有点（例如只有两端的收边）：低配这一排不放
                elif len(U) == 1 and not wall:      # 只剩一朵：低配不放这一排
                    keep = set()
                else:
                    continue
                for c in rs:
                    if c['group'] == grp:
                        c['profiles']['low'] = [p for p in c['points'] if p in keep and p in c['profiles']['medium']]
                t0 = min(e['burst'] for c in rs for e in c['events'])
                log.append(dict(t=round(t, 1), kind=kind, load=round(val, 2), row=key, rowBurst=round(t0, 2), sp=by[key]['sp'], before=U, after=sorted(keep, key=b.px)))
                done = True
                break
            if done:
                break
            stuck.add(key)
        if not done:
            log.append(dict(t=round(t, 1), kind=kind, load=round(val, 2), stuck=True, rows=sorted(contrib)))
            blocked[n].update(range(max(0, i - 10), i + 11))
    return log


def destack_low(cues):
    """低配错开叠点（用户 10-15 23:48「构图有点丑」）：低配里后一排开在前一排还亮着的同一个点、同一档大小、同一根尾缀上（同心叠），
    就在这一排中配的点里换一组：点数不变，先少叠，再保宽度（和还亮着的花合起来最左到最右），再拉开间距。倒计时、点火、主角和收边不动。"""
    import itertools
    g, by = rows(cues)
    hero_t = [e['burst'] for c in cues if c['sp'] in HERO and c.get('mobile') != 'only' for e in c['events']]
    order = sorted(g, key=lambda k: min(e['burst'] for c in g[k] for e in c['events']))
    log = []
    for key in order:
        rs = [c for c in g[key] if c.get('mobile') != 'only' and c['size'] in 'LM' and c['group'] == 'P']
        if not rs or by[key]['section'] == 'B01_S0' or any(c['sp'] in HERO for c in rs):
            continue
        t0 = min(e['burst'] for c in rs for e in c['events'])
        if t0 < 17.0 or any(abs(t0 - h) <= 1.0 for h in hero_t):
            continue
        size, trail = rs[0]['size'], rs[0].get('trail')
        U = sorted({p for c in rs for p in c['profiles']['low']}, key=b.px)
        M = sorted({p for c in rs for p in c['profiles']['medium']}, key=b.px)
        if len(U) < 1 or len(M) <= len(U):
            continue
        occ, lit = set(), set()
        for c in cues:
            if c.get('mobile') == 'only' or c['size'] in 'FX' or c['group'] != 'P' or c in rs:
                continue
            low = set(c['profiles']['low'])
            for e in c['events']:
                if e['point'] in low and e['burst'] < t0 + 0.3 and e['burst'] + 0.75 * (e['end'] - e['burst']) > t0 + 0.5:
                    lit.add(e['point'])
                    if c['size'] == size and c.get('trail') == trail:
                        occ.add(e['point'])
        coll0 = len(set(U) & occ)
        if not coll0:
            continue

        def score(T):
            xs = sorted(b.px(p) for p in set(T) | lit)
            own = sorted(b.px(p) for p in T)
            gap = min((y - x for x, y in zip(own, own[1:])), default=999)
            sym = -abs(sum(own) / len(own))
            return (-len(set(T) & occ), xs[-1] - xs[0], gap, sym)
        best = max(itertools.combinations(M, len(U)), key=score)
        sc = score(best)
        if sc[0] <= -coll0 or (sc[0] < 0 and sc[3] < -50):   # 没少叠，或者还叠着又歪到一边：不换
            continue
        keep = set(best)
        for c in rs:
            c['profiles']['low'] = [p for p in c['points'] if p in keep and p in c['profiles']['medium']]
        log.append(dict(t=round(t0, 2), row=key, sp=by[key]['sp'], before=U, after=sorted(keep, key=b.px), occupied=sorted(occ, key=b.px)))
    return log


def coda_b08(cues, plan, full=True):
    """收尾（用户 10-16 00:28「最后那个三二一的数量收尾我觉得有点淡……大号金垂柳做的不是很好，导致单独显示金垂柳会很尴尬」）：
    白墙 7 / 5 不再收成 3 / 2（照原排点数）；最后的主角金垂柳换成满宽收尾——P4 金芒菊大 + 其余 8 点银彩菊大一起开，下面 B 排一排银冠菊。
    金墙二排照 B07。full=False 时完全照 B07（9 → 3 → 2 → 主角）。"""
    if not full:
        return B07.coda(cues, plan)
    saved = {c['id']: [dict(e) for e in c['events']] for c in cues if c['section'] == 'B01_S13' and c.get('wave') in ('白墙7', '白墙5')}
    log = B07.coda(cues, plan)
    by = {c['id']: c for c in cues}
    for cid, ev in saved.items():                       # 白墙 7 / 5 回到原排
        c = by.get(cid)
        if c is None:
            continue
        c['events'] = ev
        c['points'] = [e['point'] for e in ev]
    log.append(dict(restored=sorted(saved), note='白墙 7 / 5 不收窄'))
    hero = max((c for c in cues if c['section'] == 'B01_S13' and c['sp'] in HERO and c.get('mobile') != 'only'),
               key=lambda c: min(e['burst'] for e in c['events']), default=None)
    gr = next((c for c in cues if c['sp'] == 'GRL' and c['size'] == 'L' and c.get('mobile') != 'only'), None)
    ss = next((c for c in cues if c['sp'] == 'SS' and c['size'] == 'L' and c.get('wave') == '白墙9'), None)
    if hero is None or gr is None or ss is None:
        log.append(dict(finale='没找到主角 / 金芒菊大 / 银彩菊大，收尾没改'))
        return log
    e0 = hero['events'][0]
    H, rise = e0['burst'], e0['burst'] - e0['launch']
    hero.update(sp='GRL', templateId=gr['templateId'], sizeK=gr.get('sizeK', 1.0), label=gr.get('label'), name=f"{hero.get('name', '')} → 收尾金芒菊大", wave='收尾')
    for e in hero['events']:
        e['end'] = round(e['burst'] + b.life_of('GRL'), 6)
    pts = [f'P{i}' for i in range(9) if i != 4]
    rk = rank_of(pts + ['P4'], 'center-out')
    ev = []
    for p in sorted(pts, key=b.px):
        h = H + rk[p] * 0.05
        launch = q1(h - rise)
        ev.append(dict(point=p, launch=launch, burst=round(launch + rise, 6), end=round(launch + rise + b.life_of('SS'), 6), dz=0.0, H=round(h, 4)))
    wall = copy.deepcopy(ss)
    wall.update(id='B08_C990', points=[e['point'] for e in ev], events=ev, order='center-out', gap=0.05, wave='收尾', name='白色收束 · 收尾满宽 · 银彩菊大',
                H0=round(H, 4), tier='all')
    wall.pop('splitOf', None)
    cues.append(wall)
    sc = b.TPL[b.SPECIES['SC'][0]]
    bev = []
    rkb = rank_of([f'B{i}' for i in range(8)], 'center-out')
    for i in range(8):
        p = f'B{i}'
        h = H + 0.2 + rkb[p] * 0.05
        launch = q1(h - sc['rise'])
        bev.append(dict(point=p, launch=launch, burst=round(launch + sc['rise'], 6), end=round(launch + sc['rise'] + sc['life'], 6), dz=0.0, H=round(h, 4)))
    cues.append(dict(id='B08_C991', section='B01_S13', sp='SC', templateId=tid('SC', 1.0), size='S', group='B', points=[e['point'] for e in bev], order='center-out', gap=0.05,
                     layer='extra', tier='all', label=b.SPECIES['SC'][1], name='白色收束 · 收尾二排 · 银冠菊', wave='收尾二排', events=bev, H0=round(H + 0.2, 4), sizeK=1.0, mobile=False))
    log.append(dict(finale=round(H, 2), hero=hero['id'], now='P4 金芒菊大 + P0–P8 其余银彩菊大 + B 排银冠菊，满宽一起开（不再单独一朵金垂柳）'))
    return log


def extra_fan_slots(cues, have, limit=40):
    """高 / 中配多一些扇（用户 10-16 00:28「左右摆的效果有点少……评估一下能不能加」）：P 排中 / 大号每次起飞前后 2 s 内没有扇位的，补一个扇位
    （宪章 R8「每一波 M / L 起飞时，B 点同发扇」）；倒计时、点火前、主角那一刻不补。扇位里放哪种、放不放得下照 B06（同时亮着的扇不叠）。"""
    hero_t = [e['burst'] for c in cues if c['sp'] in HERO for e in c['events']]
    anchors = [s['anchor'] for s in have]
    seen = {}
    for c in cues:
        if c['group'] != 'P' or c['size'] not in 'ML' or c.get('mobile') == 'only' or c['section'] == 'B01_S0' or c['sp'] in HERO:
            continue
        key = c.get('splitOf') or c['id']
        t = min(e['launch'] for e in c['events'])
        if key not in seen or t < seen[key][0]:
            seen[key] = (t, c)
    out = []
    for t, c in sorted(seen.values(), key=lambda x: x[0]):
        if t < 17.5 or any(abs(t - a) <= 2.0 for a in anchors) or any(abs(min(e['burst'] for e in c['events']) - h) <= 1.5 for h in hero_t):
            continue
        info = B06.bar_info(t)
        out.append(dict(anchor=t, section=c['section'], old=[], oldEvents=0, baseOf=[c['id']], heavy=c['size'] == 'L' or info['rmsDb'] >= b.HEAVY_DB,
                        dir=B06.DIR_OF_ORDER.get(c.get('order'), 'together'), onsets=info['onsets'], kicks=info['kicks'], rmsDb=info['rmsDb'], hero=False, zero=False, extra=True))
        anchors.append(t)
        if len(out) >= limit:
            break
    return out


SWEEPS = ('chaseLR', 'chaseRL', 'walkLR', 'walkRL')


def sweep_slots(cues, plan, gap_min=3.0, step=3.0, limit=30):
    """高 / 中配补「左右摆」：扇全部排完后，找没有扇亮着 ≥ gap_min 秒的空档（点火后、安静小节外、主角前后 2 s 外），每 step 秒放一个扫扇位
    （只许隔点追 / 逐点走，左→右、右→左轮换）。放不放得下照 B06（同时亮着的扇不叠）。"""
    lit = sorted((e['launch'], e['launch'] + 0.75 * (e['end'] - e['launch'])) for c in cues if c['size'] == 'F' and c.get('mobile') != 'only' for e in c['events'])
    hero_t = [e['burst'] for c in cues if c['sp'] in HERO for e in c['events']]
    end = max(e['burst'] for c in cues if c['size'] != 'F' for e in c['events']) - 4.0
    out, t, i, cover = [], plan['audio']['zeroShowS'] + 1.0, 0, 0.0
    free = []
    cur = t
    for a0, a1 in lit:
        if a1 <= cur:
            continue
        if a0 > cur:
            free.append((cur, a0))
        cur = max(cur, a1)
    free.append((cur, end))
    k = 0
    for a0, a1 in free:
        x = a0 + 0.5
        while a1 - x >= gap_min - 0.5 and len(out) < limit:
            info = B06.bar_info(x)
            if not B06.in_quiet(x) and not any(abs(x - h) <= 2.0 for h in hero_t):
                sec = next((c['section'] for c in sorted(cues, key=lambda c: abs(min(e['launch'] for e in c['events']) - x))), 'B01_S1')
                out.append(dict(anchor=x, section=sec, old=[], oldEvents=0, baseOf=[], heavy=False, dir=('left', 'right')[k % 2], onsets=info['onsets'], kicks=info['kicks'],
                                rmsDb=info['rmsDb'], hero=False, zero=False, sweep=True))
                k += 1
            x += step
    return out


def _choose_sweep(orig):
    def f(slot, rng, recent, last_color, used, used_sec):
        res = orig(slot, rng, recent, last_color, used, used_sec)
        if slot.get('sweep'):
            want = [k for k in SWEEPS if B06.FIG[k]['dir'] == slot['dir']] + [k for k in SWEEPS if B06.FIG[k]['dir'] != slot['dir']]
            res = [(k, x) for k in want for (k2, x) in [(k, None)]]
        return res
    return f


LIGHT_FANS = {'S5', 'R5', 'R1'}


def low_fans(cues, max_events=16, a_max=3.0):
    """低配留一点轻扇（用户 10-16 00:28「为什么不留点扇形给坝顶」）：只用 5 束银 / 5 束红 / 单束红，那一刻低配浓密金菊面积 ≤ 3.0、
    离 B05 实测峰 3 s 以外，中配的点隔一个留；全场最多 max_events 发（B05 低配 16 把）。"""
    h = load_series(cues, 'dense', 'pc', 'low')
    fans = sorted((c for c in cues if c['size'] == 'F' and c.get('mobile') != 'only' and c['sp'] in LIGHT_FANS), key=lambda c: min(e['launch'] for e in c['events']))
    n, log, last = 0, [], -99.0
    for c in fans:
        t = min(e['launch'] for e in c['events'])
        if t < 17.0 or t - last < 6.0 or any(abs(t - pk) <= 3.0 for pk, _ in B05_PEAKS):
            continue
        win = h[max(0, int((t - 2) / 0.1)):int((t + 4) / 0.1) + 1]
        if win and max(win) > a_max:
            continue
        med = sorted(c['profiles']['medium'], key=b.px)
        keep = med[::2] if len(med) > 2 else med
        k = sum(1 for e in c['events'] if e['point'] in keep)
        if not k or n + k > max_events:
            continue
        c['profiles']['low'] = [p for p in c['points'] if p in keep]
        n += k
        last = t
        log.append(dict(t=round(t, 2), cue=c['id'], sp=c['sp'], low=c['profiles']['low']))
    return log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=str(ROOT / '协作/编排B01/逻辑方案_B03r2m.json'))
    ap.add_argument('--name', default='B08')
    ap.add_argument('--out-dir', default=str(ROOT / '协作/编排B01'))
    ap.add_argument('--seed', type=int, default=20261015)
    ap.add_argument('--sparse', type=float, default=5.0)
    ap.add_argument('--cap-dense', type=float, default=4.0, help='PC 低配亮着的浓密金菊面积上限（B05 实测点火 0.76 ms 时 3.24、≥ 0.95 ms 时 5.1 / 8.7）')
    ap.add_argument('--cap-burst', type=float, default=0.0, help='PC 低配 1 s 内开花面积上限（B05 64.3 s 0.95 ms 时 6.7、184.6 s 9.0；16.4 s 0.76 ms 时 3.8）')
    ap.add_argument('--extra-fans', type=int, default=40, help='高 / 中配补扇位个数上限（0 = 照修订4）')
    ap.add_argument('--sweeps', type=int, default=30, help='高 / 中配在没扇的空档补扫扇位个数上限（0 = 不补）')
    ap.add_argument('--low-fans', type=int, default=16, help='低配轻扇最多几发（0 = 低配不放扇）')
    ap.add_argument('--coda-b07', action='store_true', help='收尾照 B07（9 → 3 → 2 → 主角）')
    ap.add_argument('--destack', action='store_true', help='低配同心叠换点（修订3 用过，修订4 起默认不用）')
    a = ap.parse_args()
    plan = json.loads(Path(a.base).read_text(encoding='utf-8'))
    b.BAR0, b.OFFSET = plan['bar0S'], plan['musicOffsetS']
    b.QUIET = [(b.T(k), b.T(k + 1) - 0.1) for k in (41, 65, 96)]
    rng = random.Random(a.seed)
    grid = B06.Grid(plan)
    cues, plat = B06.base_cues(plan)
    log = dict(base='B03 修订2 → B04 小平台（不换 Tiny）', trio=B06.trio(cues))
    log['dzFlattened'] = B07.flatten(cues)
    log['coda'] = coda_b08(cues, plan, full=not a.coda_b07)
    log['castle'] = B07.castle(cues)
    log['zigzagTiers'] = zigzag_tiers(cues)
    log['orders'] = B07.orders(cues, rng)
    log['contrast'] = B07.contrast(cues)
    log['bRows'] = B07.brow_complement(cues)
    log['mix'] = mix_species(cues, random.Random(a.seed + 8))
    log['speciesBase'] = species_base(cues)
    log['sizes'] = sizes_b08(cues, rng)
    log['jitter'] = jitter(cues, random.Random(a.seed + 18))
    log['platform'] = B07.platform(cues, plan, grid, rng)
    cues.sort(key=lambda c: (min(e['launch'] for e in c['events']), c['id']))
    orig = B06.fan_slots

    def slots(cs):
        out = orig(cs)
        if a.extra_fans:
            out = sorted(out + extra_fan_slots(cs, out, a.extra_fans), key=lambda s: s['anchor'])
        for s in out:
            if s['section'] == 'B01_S13':
                s['heavy'] = False
        return out
    B06.fan_slots = slots
    B06.MIN_SHARED = 0.0
    base_cues = copy.deepcopy(cues)
    cues, log['fans'], fslots = B06.place_fans(cues, plan, a.seed)
    if a.sweeps:                                   # 第二遍：空档里补扫扇，再整体重排一次
        extra = sweep_slots(cues, plan, limit=a.sweeps)
        ochoose = B06.choose
        B06.choose = _choose_sweep(ochoose)
        B06.fan_slots = lambda cs: sorted(slots(cs) + extra, key=lambda s: s['anchor'])
        cues, log['fans'], fslots = B06.place_fans(base_cues, plan, a.seed)
        B06.choose = ochoose
        log['sweepSlots'] = len(extra)
    B06.fan_slots = orig
    log['splitShared'] = B07.split_shared(cues)
    log['tiers'] = B07.tiers(cues, a.sparse)
    log['capLow'] = cap_low(cues, {k: v for k, v in (('dense', a.cap_dense), ('burst', a.cap_burst)) if v > 0})
    log['lowFans'] = low_fans(cues, a.low_fans) if a.low_fans else []
    log['destackLow'] = destack_low(cues) if a.destack else []   # 修订4：默认不用（119.4 s 换点后 P0 / P8 银彩菊 120 s 就熄，低配宽度窄了 40 % 约 2 s；复核第 3 轮）
    mid = dict(plan, cues=cues)
    cues5, log5 = B05.build(mid)
    for c in cues5:
        if c.get('mobile') == 'only' and c['size'] == 'X':
            c['profiles']['low'] = []
    log['mobileBusy'] = B07.mobile_busy(cues5, 6.0)
    log5['mobileRule'] = B05.mobile_rule(cues5)
    log5['mobileScale'] = B05.scale_table(cues5)
    base_rel = Path(a.base).resolve()
    out = dict(plan, revision=f"{a.name}_lowcap_platform40_tiers_species_jitter_from_{plan['revision']}", generator='analysis/scripts/编排B08.py',
               cues=cues5, b05=log5, b08=log, base=str(base_rel.relative_to(ROOT)) if base_rel.is_relative_to(ROOT) else base_rel.name)
    od = Path(a.out_dir)
    od.mkdir(parents=True, exist_ok=True)
    lp = od / f'逻辑方案_{a.name}.json'
    lp.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    gpu, read_at = B05.census_gpu()
    model = B05.apply_census(gpu)
    ck = B05.run_checks(out, cues5)
    ck['gpuModel'] = dict(source=str(B05.CENSUS.relative_to(ROOT)), readAt=read_at, **model)
    ck['b05'], ck['b08'] = log5, log
    rep = ovl.report(lp)
    ck['overlap'] = {k: v for k, v in rep.items() if k != 'pc'}
    ck['overlap']['pcList'] = rep['pc']
    prev = {v: json.loads((ROOT / f'协作/编排B01/逻辑方案_{v}.json').read_text(encoding='utf-8')) for v in ('B05', 'B07')}
    ck['fanAudit'] = dict(B08=B06.audit(cues5, out, 'B08'), B07=B06.audit(prev['B07']['cues'], prev['B07'], 'B07'))
    ck['tierEnds'] = B07.tier_ends(cues5)
    ck['shares'] = {f'{p}-{t}': B06.shares(cues5, p, t) for p in ('pc', 'mobile') for t in ('high', 'medium', 'low')}
    ck['area'] = {f'{v}-{p}-{t}': B07.area_series(cs, t, p) for v, cs in (('B08', cues5), ('B07', prev['B07']['cues']), ('B05', prev['B05']['cues']))
                  for p in ('pc', 'mobile') for t in ('high', 'medium', 'low')}
    vs = (('B08', cues5), ('B07修订1', prev['B07']['cues']), ('B05', prev['B05']['cues']))
    ck['heavy'] = dict(rule='PC 低配：亮着的浓密金菊面积 A（金曜菊 / 金蕊青柠 / 金芒菊 / 金锦菊，开花到寿命 75 %%，Σ(直径/230)²）≤ %.1f；1 s 内开花面积 S（所有球花 + 小平台）全场上限 %s；局部 %s。按 B05 低配实测曲线（截图读）定，推断' % (a.cap_dense, a.cap_burst or '不用', LOCAL_CAPS),
                       dense=sorted(DENSE), b05Peaks=B05_PEAKS,
                       **{f'{v}-{t}': dict(dense=peaks(load_series(cs, 'dense', 'pc', t)), burst=peaks(load_series(cs, 'burst', 'pc', t))) for v, cs in vs for t in ('high', 'medium', 'low')},
                       atB05Peaks={v: at_peaks(cs) for v, cs in vs}, b05Readings=readings_check(prev['B05']['cues']))
    ck['score'] = B07.scorecard(out, cues5, prev['B07'])   # 键名沿用 B07 的 B06 / B07：这里 B06 = B07 修订1、B07 = B08
    (od / f'体检_{a.name}.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    fa = ck['fanAudit']
    print(json.dumps(dict(revision=out['revision'], cues=len(cues5), zigzag=log['zigzagTiers'], mix=len(log['mix']), speciesBase=log['speciesBase'], sizes=len(log['sizes']),
                          jitter=log['jitter'], platformAdded=len(log['platform']), capLow=len(log['capLow']), lowFans=log['lowFans'], coda=log['coda'][-1:], fansPlaced=sum(1 for x in log['fans'] if x.get('placed')), destackLow=log['destackLow'], capLowStuck=[x for x in log['capLow'] if x.get('stuck')],
                          tiers={k: v['events'] for k, v in ck['tiers'].items()}, mobile={k: v['events'] for k, v in ck['b02']['mobileTiers'].items()},
                          gpu=ck['gpu']['peak'], gpuTiers={k: v['gpuPeakPerS'] for k, v in ck['tiers'].items()}, beatLock=ck['beatLock'],
                          tierNesting=ck['tierNesting']['ok'], mobileRuleViolations=len(log5['mobileRule']['violations']),
                          overlap=dict(pc=ck['overlap']['pcIncidents'], mobile={k: v['incidents'] for k, v in ck['overlap']['mobile'].items()}),
                          fanClash=fa['B08']['clashPairs'], fanUnplaced=sum(1 for x in log['fans'] if not x.get('placed')), tierEnds=ck['tierEnds']['violations'],
                          mobileBusy=len(log['mobileBusy']), area=ck['area'], heavy={k: {kk: vv[0] if vv else None for kk, vv in v.items()} for k, v in ck['heavy'].items() if '-' in k}, atB05Peaks=ck['heavy']['atB05Peaks'], score=ck['score']), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
