#!/usr/bin/env python3
"""编排 B08（跨年秀（22），2026-10-15 22:30）：B07 修订1 → 低配限峰、小平台降高放大、同时同高两层、同档按种类大小、时间错开 / 两种交替。

用户 10-15 19:23 / 22:02：
- 「小的烟花太小了，很小气；高度也比较高」「可以不要新出尾缀了嘛，直接缩放行不行」→ 前台小花.json trailScale 0.65、花 36–44 m、对称一对 ±15–22°（数据，不在本文件）；
- 「图4的比例有点怪，中型的完全把小的盖住了」→ 同一刻同高度的 P 排 / B 排小号之字：P 排挂现有中尾缀（新尾缀.json Up210）、B 排 ×0.8（原 ×0.6）；
- 「所有90m的，也有90~110的组别种类区分」「如果不行可以变得更小，譬如90~100这样也可以」→ 小号按种类 90–100，中 / 大号不放大（修订1：每点随机不再叠乘底稿大小版本）；
- 「颜色上现在确实有些太一致了……或者爆开的时间再错开一些」→ 三分之一小号排两种花交替；齐发排每点错开 0 / 0.1 / 0.2 s；一半「里→外」放慢；
- 「B05的性能测试回来了……低配960……两个峰值，到1了之后……降分辨率，贴图会变糊30秒……这几个峰值需要调整下数量」→ PC 低配限峰（cap_low：亮着的浓密金菊面积、1 s 内开花面积两个上限；修订1 换掉原「2 s 开花负担」），墙 / 入口在低配也允许隔点。

用法：python3 -I analysis/scripts/编排B08.py [--cap-dense 3.2 --cap-burst 6.0]
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
# 低配限峰（960 Translucency 峰）。修订1（10-15 23:30，独立复核第 1 轮）：原「2 s 内开花 × 种类权重」模型和 B05 实测排序反了 6 / 17 对
#   （白墙 4.32 实测 0.6 ms、64 s 2.26 实测 0.95 ms），改成两个约束，都按 B05 低配远距离段 25 个读数核过（曲线从截图读，±0.05 ms、时刻 ±2 s）：
#   ① 亮着的浓密金菊面积 A：金曜菊 / 金蕊青柠 / 金芒菊 / 金锦菊（含大号），开花到寿命 75 %，Σ(直径/230)²。
#      B05 实测 ≥ 0.95 ms 的 182.6 / 189 s 是 5.1 / 8.7；≤ 0.65 ms 的都 ≤ 3.85；0.76 ms 的 18.3 s 是 3.2 → 上限 3.2。
#      银彩菊白墙亮着的面积 15.2 只有 0.62 ms → 点灭类不算进 A。
#   ② 1 s 内开花的面积 S（所有球花，含银彩菊，不含小平台、扇）：64.3 s 那个峰 A 只有 2.0、解释不了，它是 9 朵同时开（5 大 + 4 中，S = 6.7）；
#      184.6 s 金芒菊大 ×9 是 9.0；16.4 s 金芒菊中 ×9（S = 3.8）只有 0.76 → 上限 5.0（取中间）。超了先隔浓密金菊那排（同样面积，点灭类按一半挑），
#      代价：白墙一波 9 朵在低配还是会隔到 5 朵（白墙实测是安全的）。
#   这两个都是从一张截图拟的，排序上 B05 的 25 个读数只有 64.3 / 59 s 一对解释不了（内容几乎一样，0.95 / 0.6 ms）。真实开销等实机测量（派活 T09）。
#   ③ 64.3 s 这个峰两个量都解释不了（59 s 内容几乎一样只有 0.6 ms），所以那一刻单独压到 B05 的 60 % 以下（A 2.21 → 1.3、S 6.22 → 3.7，±2 s）。
DENSE = {'GY', 'CL', 'CLL', 'GR', 'GRL', 'GS'}
LOCAL_CAPS = [(64.3, 'dense', 1.3), (64.3, 'burst', 3.7)]
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


def cap_low(cues, caps, dt=0.1):
    """PC 低配：亮着的浓密金菊面积 ≤ caps['dense']，1 s 内开花面积 ≤ caps['burst']。超了就把那一刻贡献最大的一排在低配里再隔一次
    （两端留；3 点留两端；只剩两端换中间一朵），墙 / 入口也可以隔（性能优先，用户 22:02）；倒计时、主角不动。"""
    g, by = rows(cues)
    root_of = {c['id']: key for key, rs in g.items() for c in rs}
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
            if key in stuck or by[key]['section'] == 'B01_S0' or any(c['sp'] in HERO for c in rs):
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=str(ROOT / '协作/编排B01/逻辑方案_B03r2m.json'))
    ap.add_argument('--name', default='B08')
    ap.add_argument('--out-dir', default=str(ROOT / '协作/编排B01'))
    ap.add_argument('--seed', type=int, default=20261015)
    ap.add_argument('--sparse', type=float, default=5.0)
    ap.add_argument('--cap-dense', type=float, default=3.2, help='PC 低配亮着的浓密金菊面积上限（B05 实测 0.76 ms 时 3.2、≥ 0.95 ms 时 5.1 / 8.7）')
    ap.add_argument('--cap-burst', type=float, default=5.0, help='PC 低配 1 s 内开花面积上限（B05 64.3 s 0.95 ms 时 6.7、184.6 s 9.0；16.4 s 0.76 ms 时 3.8）')
    a = ap.parse_args()
    plan = json.loads(Path(a.base).read_text(encoding='utf-8'))
    b.BAR0, b.OFFSET = plan['bar0S'], plan['musicOffsetS']
    b.QUIET = [(b.T(k), b.T(k + 1) - 0.1) for k in (41, 65, 96)]
    rng = random.Random(a.seed)
    grid = B06.Grid(plan)
    cues, plat = B06.base_cues(plan)
    log = dict(base='B03 修订2 → B04 小平台（不换 Tiny）', trio=B06.trio(cues))
    log['dzFlattened'] = B07.flatten(cues)
    log['coda'] = B07.coda(cues, plan)
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
        for s in out:
            if s['section'] == 'B01_S13':
                s['heavy'] = False
        return out
    B06.fan_slots = slots
    B06.MIN_SHARED = 0.0
    cues, log['fans'], fslots = B06.place_fans(cues, plan, a.seed)
    B06.fan_slots = orig
    log['splitShared'] = B07.split_shared(cues)
    log['tiers'] = B07.tiers(cues, a.sparse)
    log['capLow'] = cap_low(cues, {'dense': a.cap_dense, 'burst': a.cap_burst})
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
    ck['heavy'] = dict(rule='PC 低配：亮着的浓密金菊面积 A（金曜菊 / 金蕊青柠 / 金芒菊 / 金锦菊，开花到寿命 75 %%，Σ(直径/230)²）≤ %.1f；1 s 内开花面积 S（所有球花）≤ %.1f。按 B05 低配实测曲线（截图读）定，推断' % (a.cap_dense, a.cap_burst),
                       dense=sorted(DENSE), b05Peaks=B05_PEAKS,
                       **{f'{v}-{t}': dict(dense=peaks(load_series(cs, 'dense', 'pc', t)), burst=peaks(load_series(cs, 'burst', 'pc', t))) for v, cs in vs for t in ('high', 'medium', 'low')},
                       atB05Peaks={v: at_peaks(cs) for v, cs in vs})
    ck['score'] = B07.scorecard(out, cues5, prev['B07'])   # 键名沿用 B07 的 B06 / B07：这里 B06 = B07 修订1、B07 = B08
    (od / f'体检_{a.name}.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    fa = ck['fanAudit']
    print(json.dumps(dict(revision=out['revision'], cues=len(cues5), zigzag=log['zigzagTiers'], mix=len(log['mix']), speciesBase=log['speciesBase'], sizes=len(log['sizes']),
                          jitter=log['jitter'], platformAdded=len(log['platform']), capLow=len(log['capLow']), capLowStuck=[x for x in log['capLow'] if x.get('stuck')],
                          tiers={k: v['events'] for k, v in ck['tiers'].items()}, mobile={k: v['events'] for k, v in ck['b02']['mobileTiers'].items()},
                          gpu=ck['gpu']['peak'], gpuTiers={k: v['gpuPeakPerS'] for k, v in ck['tiers'].items()}, beatLock=ck['beatLock'],
                          tierNesting=ck['tierNesting']['ok'], mobileRuleViolations=len(log5['mobileRule']['violations']),
                          overlap=dict(pc=ck['overlap']['pcIncidents'], mobile={k: v['incidents'] for k, v in ck['overlap']['mobile'].items()}),
                          fanClash=fa['B08']['clashPairs'], fanUnplaced=sum(1 for x in log['fans'] if not x.get('placed')), tierEnds=ck['tierEnds']['violations'],
                          mobileBusy=len(log['mobileBusy']), area=ck['area'], heavy={k: {kk: vv[0] if vv else None for kk, vv in v.items()} for k, v in ck['heavy'].items() if '-' in k}, atB05Peaks=ck['heavy']['atB05Peaks'], score=ck['score']), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
