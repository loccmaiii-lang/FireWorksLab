#!/usr/bin/env python3
"""B07：尾缀从地上出来、档位隔点、小平台加密、张力 / 方向 / 大小 / 颜色（跨年秀 22，用户 10-15 11:14）。

用户 10-15 11:14：「不要等比拉长尾缀的方案」「中低配置更应该用间隔的办法输出，这样看起来播放范围不会变，而且也有效降低overdraw」
「出一个版本的B07，目标把评分优化到8分以上」；01:36「小平台的节奏数量可以更加频繁一些……数量有些太少了」
「之前定的升空尾缀提的太高了……线条还是从地上出来好一点」。评分表见 协作/编排B06_评分与B07方案.md。

底稿同 B06（B03 修订2 → B04 小平台，不换 Tiny → 收窄 3 改 P2 / P4 / P6），在扇之前做下面几件，最后照旧 B06 的扇 + B05 的名字 / 手游 6 种：
  ① 尾缀从地上出来：所有 dz → 0（dz 是整组尾缀 + 花一起抬，见 tool/workbench/src/director-model.mjs heightVariant）。
     高差没了以后挤的地方用构图解决，不靠抬高：
       - 9 点大号整排（整排 9 / 金墙 / 白墙）→ 城垛：偶数点大号不动，奇数点换同一种的中号（金芒菊·大 → 金芒菊，银彩菊没有中号 → 银冠菊放大 144 m 那个中号）；
       - P 排小号和 B 排小号同一刻（A/B 间隔 17 那种之字）：B 排缩到 ×0.6（≈ 54 m，B01 原设计「B 点 ⌀50 小花」）。
  ② 主排方向：「里→外」占 70 % → 按段轮换 左→右 / 右→左 / 外→里 / 齐发 / 里→外，相邻两波不重样（入口、墙、主角、倒计时这些 tier=all 的不动）。
  ③ 大小随机：小 / 中号的排每个点从 ×0.92 / ×1.0 / ×1.08 里挑（大号 ×0.92 / ×1.0），同一排按大小拆成几个片段（splitOf 同一排，时刻不变）。
     用子模板里花条目的 EffectScale 做（UE-14 实测整朵等比，所有发射器一起缩放，不存在「星头和火花对不上」）。
  ④ 颜色：B 排小号（只上 PC 的叠层二排 / 低位 8）和它上面同一刻的 P 排同色系时换成对比色（金上配银 / 绿 / 橙，银上配金 / 橙 / 绿）。
  ⑤ 张力：终章最后一段（金墙）下面加一排 B 点小号，让终章峰值压过高潮 II；白色收束收成 9 → 3 → 2 → 主角（白墙 7 只留 P2 / P4 / P6，白墙 5 只留 P2 / P6），
     这一段的扇只用轻的一组。
  ⑥ 小平台加密：每 1–2 小节一组（按段），开花踩起音，点位交替（同一点 2.6 s 内不重复），用现成 7 种变体。
  ⑦ 档位「隔点」（用户的想法）+ 看密度：
       - 一排点数 n：奇数取 0、2、4…（两端都留）；偶数左右各从外往里隔一个（8 → B0 B2 B5 B7，6 → B1 B3 B4 B6，4 → 两端）；≤ 3 点不减。
       - 中配：这一刻天上很空（同屏面积 < 门槛）的排三档都按「中配 = 全部、低配 = 隔一次」；其余「中配 = 隔一次、低配 = 隔两次」（9 → 5 → 3）。
       - 叠层（B 排小号）低配不放；扇中配全放、低配不放（宪章 R8）；小平台中配隔一次、低配隔两次。
       - tier=all（入口、墙、主角、倒计时）三档全放，同以前。
     验收：中 / 低配的同屏面积峰值不高于 B06 的同档（overdraw 不比 B06 差），每排两端在中配里都还在。

用法：python3 -I analysis/scripts/编排B07.py [--name B07] [--out-dir 协作/编排B01] [--seed 20261015]
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


B06 = _load('b06', '编排B06.py')
B04, B05, b, ovl = B06.B04, B06.B05, B06.b, B06.ovl
q1 = b.q1
# 点灭星（一闪一闪）、爆裂星（噼啪碎响）质感本身就和菊类不同，单独算一类，不当「同色」去换
COLOR = {'SC': 'silver', 'SS': 'silver', 'ST': 'strobe', 'SCM': 'silver', 'GR': 'gold', 'GRL': 'gold', 'GS': 'gold', 'GY': 'gold', 'GC': 'gold',
         'CR': 'crackle', 'GK': 'gold', 'GKH': 'gold', 'LM': 'green', 'GP': 'green', 'CL': 'lime', 'CLL': 'lime', 'OG': 'orange', 'ML': 'orange',
         'MLL': 'orange', 'PW': 'purple'}
CONTRAST = {'gold': ['SC', 'LM', 'OG'], 'silver': ['GC', 'OG', 'LM'], 'lime': ['SC', 'OG'], 'green': ['SC', 'GC'], 'orange': ['SC', 'LM'], 'purple': ['SC', 'GC'],
            'strobe': ['GC', 'OG'], 'crackle': ['SC', 'LM']}
M_OF = {'GRL': 'GR', 'CLL': 'CL', 'MLL': 'ML', 'SS': 'SCM'}      # 城垛：奇数点换同一种的中号（银彩菊没有中号 → 银冠菊 144 m）
HERO = {'GK', 'GKH'}


def sec_of(plan, t):
    s = [x for x in plan['sections'] if x['start'] <= t + 1e-6]
    return s[-1]['id'] if s else plan['sections'][0]['id']


def tpl_of(c):
    return b.TPL[c['templateId'].split('__K')[0]]


def tid(sp, k):
    base = b.SPECIES[sp][0]
    return base if abs(k - 1) < 1e-9 else f'{base}__K{round(k * 100)}'


def root_of(c, by):
    r = c
    while r.get('splitOf') and r['splitOf'] in by:
        r = by[r['splitOf']]
    return r['id']


def rows(cues):
    """一排 = 原片段 + 拆出来的半排（splitOf）+ 只上手游的替身（standinOf）"""
    by = {c['id']: c for c in cues}
    g = defaultdict(list)
    for c in cues:
        key = root_of(by[c['standinOf']], by) if c.get('standinOf') in by else root_of(c, by)
        g[key].append(c)
    return g, by


def retime(e, H):
    rise, life = e['burst'] - e['launch'], e['end'] - e['burst']
    e['launch'] = q1(H - rise)
    e['burst'] = round(e['launch'] + rise, 6)
    e['end'] = round(e['burst'] + life, 6)
    e['H'] = round(H, 4)


# ① 尾缀从地上出来
def flatten(cues):
    n = Counter()
    for c in cues:
        for e in c['events']:
            if e.get('dz'):
                n[c['size']] += 1
                e['dz'] = 0.0
    return dict(n)


def castle(cues):
    """9 点大号整排 → 城垛：奇数点换中号（同一刻开花，起飞按中号尾缀提前）"""
    g, by = rows(cues)
    log = []
    for key, rs in g.items():
        pc = [c for c in rs if c.get('mobile') != 'only']
        pts = {e['point'] for c in pc for e in c['events']}
        if len(pts) < 7 or any(c['size'] != 'L' for c in pc) or any(c['sp'] in HERO for c in pc):
            continue
        for c in pc:
            odd = [e for e in c['events'] if int(e['point'][1:]) % 2]
            if not odd:
                continue
            msp = M_OF.get(c['sp'])
            if not msp:
                continue
            if len(odd) != len(c['events']):        # 偶 / 奇混在一个片段里：把奇数点拆出来
                new = copy.deepcopy(c)
                new.update(id=c['id'] + 'o', splitOf=key, mobile=False)
                new['events'] = [copy.deepcopy(e) for e in odd]
                c['events'] = [e for e in c['events'] if not int(e['point'][1:]) % 2]
                c['points'] = [e['point'] for e in c['events']]
                cues.append(new)
                c = new
            k = c.get('sizeK') or 1.0
            mt = b.TPL[b.SPECIES[msp][0]]
            old = c['sp']
            c.update(sp=msp, templateId=tid(msp, k if msp != 'SCM' else 1.0), size='M', sizeK=k if msp != 'SCM' else 1.0,
                     label=f"{b.SPECIES[msp][1]}（城垛·奇数点中号）", mobile=False)
            c['points'] = [e['point'] for e in c['events']]
            for e in c['events']:
                H = e['burst']
                e['launch'] = q1(H - mt['rise'])
                e['burst'] = round(e['launch'] + mt['rise'], 6)
                e['end'] = round(e['burst'] + mt['life'], 6)
            log.append(dict(row=key, cue=c['id'], t=round(min(e['burst'] for e in c['events']), 2), fromSp=old, toSp=msp, points=c['points']))
    return log


def zigzag_small(cues):
    """P 排小号和 B 排小号同一刻开（之字）：B 排缩到 ×0.6"""
    log = []
    ps = [c for c in cues if c['group'] == 'P' and c['size'] == 'S' and c.get('mobile') != 'only']
    for c in cues:
        if c['group'] != 'B' or c['size'] != 'S':
            continue
        t = min(e['burst'] for e in c['events'])
        if any(abs(min(e['burst'] for e in p['events']) - t) <= 1.0 for p in ps):
            c['sizeK'] = 0.6
            c['templateId'] = tid(c['sp'], 0.6)
            log.append(dict(cue=c['id'], t=round(t, 2), sp=c['sp']))
    return log


# ② 主排方向
ORDERS = ['left', 'outside-in', 'right', 'together', 'center-out']


def rank_of(pts, order):
    xs = sorted(pts, key=b.px)
    if order == 'together':
        return {p: 0 for p in pts}
    if order == 'left':
        return {p: i for i, p in enumerate(xs)}
    if order == 'right':
        return {p: i for i, p in enumerate(reversed(xs))}
    dist = sorted({round(abs(b.px(p))) for p in pts})
    if order == 'center-out':
        return {p: dist.index(round(abs(b.px(p)))) for p in pts}
    if order == 'outside-in':
        return {p: len(dist) - 1 - dist.index(round(abs(b.px(p)))) for p in pts}
    raise ValueError(order)


def orders(cues, rng):
    g, by = rows(cues)
    cand = []
    for key, rs in g.items():
        root = by[key]
        if (root['group'] != 'P' or root['layer'] != 'main' or root.get('tier') == 'all' or root['size'] not in 'SML'
                or root['section'] == 'B01_S0' or root['order'] != 'center-out' or any(c['sp'] in HERO for c in rs)):
            continue
        pts = {e['point'] for c in rs if c.get('mobile') != 'only' for e in c['events']}
        if len(pts) < 4:
            continue
        cand.append((min(e['burst'] for e in root['events']), key, rs, pts))
    cand.sort()
    mains = sorted(min(e['burst'] for e in c['events']) for c in cues if c['group'] == 'P' and c['size'] in 'LM' and c.get('mobile') != 'only' and not c.get('splitOf'))
    log, prev, sec_prev = [], None, None
    for t, key, rs, pts in cand:
        root = by[key]
        if root['section'] != sec_prev:
            seq = ORDERS[:]
            rng.shuffle(seq)
            sec_prev = root['section']
        nxt = next((x for x in mains if x > t + 0.5), 9e9)
        # 后面 3.8 s 内还有一排中 / 大号：只用齐发 / 里→外，免得两端晚开、开在下一排同一点还亮着的花上（高差去掉后没有高低能错开）
        allow = ['together', 'center-out'] if nxt - t < 3.8 and root['size'] in 'LM' else ORDERS
        pick = next((o for o in seq + ORDERS if o != prev and o in allow), 'center-out')
        seq.remove(pick) if pick in seq else None
        if not seq:
            seq = ORDERS[:]
            rng.shuffle(seq)
        prev = pick
        if pick == 'center-out':
            log.append(dict(row=key, t=round(t, 2), order=pick))
            continue
        gap = root.get('gap') or 0.1
        rk = rank_of(pts, pick)
        H0 = min(e.get('H', e['burst']) for e in root['events'])
        for c in rs:
            c['order'] = pick
            for e in c['events']:
                if e['point'] in rk:
                    retime(e, H0 + rk[e['point']] * gap)
        log.append(dict(row=key, t=round(t, 2), order=pick))
    return log


# ③ 大小随机
def sizes(cues, rng):
    g, by = rows(cues)
    heroes = [(e['burst'], e['burst'] + 0.75 * (e['end'] - e['burst'])) for c in cues if c['sp'] in HERO and c.get('mobile') != 'only' for e in c['events']]
    log, add = [], []
    for key, rs in g.items():
        for c in rs:
            t0 = min(e['burst'] for e in c['events'])
            if any(a <= t0 <= z for a, z in heroes):      # 主角还亮着时不放大（高差去掉后靠大小拉开）
                continue
            if (c['size'] not in 'SML' or c.get('tier') == 'all' or c['sp'] in HERO or c['section'] == 'B01_S0'
                    or c.get('mobile') == 'only' or len(c['events']) < 3 or c.get('sizeK') == 0.6):
                continue
            ks = [0.92, 1.0] if c['size'] == 'L' else [0.92, 1.0, 1.08]
            pick = {e['point']: rng.choice(ks) for e in c['events']}
            groups = defaultdict(list)
            for e in c['events']:
                groups[pick[e['point']]].append(e)
            keep = max(groups, key=lambda k: (len(groups[k]), -abs(k - (c.get('sizeK') or 1.0))))
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


# ④ 颜色
def contrast(cues):
    """B 排小号（一排一个颜色）和同一刻 P 排的主色同色系 → 换对比色（轮着用）"""
    ps = [c for c in cues if c['group'] == 'P' and c['size'] in 'SML' and c.get('mobile') != 'only']
    log, turn = [], Counter()
    for c in sorted(cues, key=lambda c: min(e['burst'] for e in c['events'])):
        if c['group'] != 'B' or c['size'] != 'S' or c.get('mobile') == 'only':
            continue
        t = min(e['burst'] for e in c['events'])
        w = Counter()
        for p in ps:
            if abs(min(e['burst'] for e in p['events']) - t) <= 1.2:
                w[COLOR[p['sp']]] += len(p['events']) * {'L': 3, 'M': 2, 'S': 1}[p['size']]
        if not w:
            continue
        dom = w.most_common(1)[0][0]
        if COLOR[c['sp']] != dom:
            continue
        opts = CONTRAST[dom]
        new = opts[turn[dom] % len(opts)]
        turn[dom] += 1
        old = c['sp']
        k = c.get('sizeK') or 1.0
        life = b.life_of(new)
        c.update(sp=new, templateId=tid(new, k), label=b.SPECIES[new][1])
        for e in c['events']:
            e['end'] = round(e['burst'] + life, 6)
        log.append(dict(cue=c['id'], t=round(t, 2), over=dom, fromSp=old, toSp=new))
    return log


def lit_end(e):
    return e['burst'] + 0.75 * (e['end'] - e['burst'])


def brow_complement(cues):
    """B 排小号接 B 排小号，同一批点还亮着：前一排隔点留一半，后一排放另一半（之字交替）"""
    rs = sorted((c for c in cues if c['group'] == 'B' and c['size'] == 'S' and c.get('mobile') != 'only'), key=lambda c: min(e['burst'] for e in c['events']))
    log = []
    for i, r in enumerate(rs):
        for q in rs[:i]:
            if not q['events'] or not r['events']:
                continue
            qe = {e['point']: e for e in q['events']}
            hit = [e['point'] for e in r['events'] if e['point'] in qe and lit_end(qe[e['point']]) - (e['burst'] + 0.3) > 0.3]
            if not hit:
                continue
            keep_q = set(thin([e['point'] for e in q['events']])) if len(q['events']) >= 6 else {e['point'] for e in q['events']}
            q['events'] = [e for e in q['events'] if e['point'] in keep_q]
            q['points'] = [e['point'] for e in q['events']]
            r['events'] = [e for e in r['events'] if e['point'] not in keep_q]
            r['points'] = [e['point'] for e in r['events']]
            log.append(dict(first=q['id'], then=r['id'], t=round(min(e['burst'] for e in r['events']), 2) if r['events'] else None, firstKeeps=q['points'], thenKeeps=r['points']))
    cues[:] = [c for c in cues if c['events']]
    return log


# ⑤ 张力
def coda(cues, plan):
    """白色收束 9 → 3 → 2 → 主角；终章金墙下面加一排 B 点小号"""
    log = []
    by = {c['id']: c for c in cues}
    for c in cues:
        if c['section'] != 'B01_S13' or c['group'] != 'P' or c['size'] != 'L' or c['sp'] in HERO:
            continue
        w = c.get('wave') or ''
        keep = {'白墙7': {'P2', 'P4', 'P6'}, '白墙5': {'P2', 'P6'}}.get(w)
        if keep is None:
            continue
        before = [e['point'] for e in c['events']]
        c['events'] = [e for e in c['events'] if e['point'] in keep]
        c['points'] = [e['point'] for e in c['events']]
        log.append(dict(cue=c['id'], wave=w, before=before, after=c['points']))
    cues[:] = [c for c in cues if c['events']]
    # 金墙下面一排 B 点小号（银冠菊，金上配银）
    wall = next((c for c in cues if c.get('wave') == '金墙' and not c.get('splitOf') and c.get('mobile') != 'only'), None)
    if wall:
        H0 = min(e['burst'] for e in wall['events']) + 0.2
        sp = 'SC'
        t = b.TPL[b.SPECIES[sp][0]]
        pts = [f'B{i}' for i in range(8)]
        rk = rank_of(pts, 'outside-in')
        ev = []
        for p in sorted(pts, key=b.px):
            H = H0 + rk[p] * 0.1
            launch = q1(H - t['rise'])
            ev.append(dict(point=p, launch=launch, burst=round(launch + t['rise'], 6), end=round(launch + t['rise'] + t['life'], 6), dz=0.0, H=round(H, 4)))
        c = dict(id='B07_C900', section=wall['section'], sp=sp, templateId=tid(sp, 1.0), size='S', group='B', points=[e['point'] for e in ev], order='outside-in', gap=0.1,
                 layer='extra', tier='trim', label=b.SPECIES[sp][1], name=f"终章 · 金墙二排 · {b.SPECIES[sp][1]}", wave='金墙二排', events=ev, H0=round(H0, 4),
                 sizeK=1.0, mobile=False)
        cues.append(c)
        log.append(dict(cue=c['id'], t=round(H0, 2), added='金墙下面 B 点一排银冠菊（外→里）'))
    return log


# ⑥ 小平台加密
PER_BARS = {'B01_S1': 2, 'B01_S3': 2, 'B01_S4': 2, 'B01_S5': 2, 'B01_S6': 1, 'B01_S7': 2, 'B01_S8': 2, 'B01_S9': 2, 'B01_S10': 1, 'B01_S11': 1,
            'B01_S12': 1, 'B01_S13': 3}
F7 = [f'F{i}' for i in range(7)]
PLAT_PATTERNS = [   # (点, 次序, 间隔, 变体)
    (['F0', 'F2', 'F4', 'F6'], 'left', 0.2, ('FS1A', 'FS1B')),
    (['F1', 'F3', 'F5'], 'center-out', 0.2, ('FS3A', 'FS3B')),
    (['F0', 'F6'], 'together', 0.0, ('FC2A', 'FC2B')),
    (F7, 'right', 0.1, ('FS1A', 'FS1B')),
    (['F2', 'F4'], 'together', 0.0, ('FS3A', 'FS3B')),
    (['F1', 'F3', 'F5'], 'outside-in', 0.2, ('FC2A', 'FC2B')),
    (['F0', 'F3', 'F6'], 'together', 0.0, ('FV4',)),
    (F7, 'left', 0.1, ('FS1A', 'FS1B')),
    (['F0', 'F2', 'F4', 'F6'], 'center-out', 0.15, ('FC2A', 'FC2B')),
    (['F3'], 'together', 0.0, ('FS3A', 'FS3B')),
]


def platform(cues, plan, grid, rng):
    have = [min(e['burst'] for e in c['events']) for c in cues if c['size'] == 'X']
    used = defaultdict(list)                   # 点 → 开花时刻
    for c in cues:
        if c['size'] == 'X':
            for e in c['events']:
                used[e['point']].append(e['burst'])
    secs = {s['id']: s for s in plan['sections']}
    zero_bar = int((plan['audio']['zeroShowS'] - plan['bar0S']) // plan['barS']) + 1
    last_bar = int((203.0 - plan['bar0S']) // plan['barS'])
    log, nid, pi, since = [], 0, 0, defaultdict(lambda: 99)
    for k in range(zero_bar, last_bar):
        t_bar = plan['bar0S'] + k * plan['barS']
        sid = sec_of(plan, t_bar + 0.1)
        if sid == 'B01_S0' or any(a - 0.05 <= t_bar <= z for a, z in b.QUIET):
            continue
        per = PER_BARS.get(sid, 2)
        since[sid] += 1
        if since[sid] < per:
            continue
        if any(abs(h - t_bar - plan['barS'] / 4) < plan['barS'] * 0.9 for h in have):
            continue
        # 开花落在这一小节前半里起音最强的八分音符
        k0 = grid.k(t_bar)
        kb = max(range(k0, k0 + 4), key=lambda x: (grid.strength(x), -x))
        burst0 = grid.t(kb)
        placed = None
        for j in range(len(PLAT_PATTERNS)):
            pts, order, gap, vars_ = PLAT_PATTERNS[(pi + j) % len(PLAT_PATTERNS)]
            if any(abs(burst0 - x) < 2.6 for p in pts for x in used[p]):
                continue
            placed = (pts, order, gap, vars_[rng.randrange(len(vars_))])
            pi = (pi + j + 1) % len(PLAT_PATTERNS)
            break
        if not placed:
            continue
        pts, order, gap, code = placed
        fid = next(x['id'] for x in b.FRONTF['flowers'] if x['code'] == code)
        t = b.TPL[fid]
        rk = rank_of(pts, order)
        ev = []
        for p in sorted(pts, key=b.px):
            H = burst0 + rk[p] * gap
            launch = q1(H - (t['rise'] or 0.0))
            ev.append(dict(point=p, launch=launch, burst=round(launch + (t['rise'] or 0.0), 6), end=round(launch + t['recipeDuration'], 6), dz=0.0, H=round(H, 4)))
        if min(e['launch'] for e in ev) < plan['audio']['zeroShowS'] - 0.05:
            continue
        nid += 1
        zh = b.SPECIES[code][1]
        c = dict(id=f'B07_P{nid:02d}', section=sid, sp=code, templateId=fid, size='X', group='F', points=[e['point'] for e in ev], order=order, gap=gap,
                 layer='extra', tier='trim', label=zh, name=f"{secs[sid]['name']} · {zh}", wave='小平台·前台小花', events=ev, H0=round(burst0, 4), mobile=True)
        cues.append(c)
        have.append(min(e['burst'] for e in ev))
        for e in ev:
            used[e['point']].append(e['burst'])
        since[sid] = 0
        log.append(dict(cue=c['id'], t=round(burst0, 2), section=secs[sid]['name'], sp=code, points=c['points'], order=order))
    return log


# ⑦ 档位隔点 + 看密度
def thin(pts):
    xs = sorted(pts, key=b.px)
    n = len(xs)
    if n <= 3:
        return xs
    if n % 2:
        return xs[::2]
    h = n // 2
    return xs[:h][::2] + list(reversed(list(reversed(xs[h:]))[::2]))


def area_series(cues, tier, platform='pc'):
    """同屏面积（球花直径平方之和，按大号 230 m 归一）随时间的峰值；亮着 = 开花到寿命 75 %"""
    ev = []
    for c in cues:
        if c['size'] not in 'SMLX':
            continue
        if platform == 'pc' and c.get('mobile') == 'only':
            continue
        if platform == 'mobile' and c.get('mobile') is False:
            continue
        if c['size'] == 'X':
            f = next(x for x in b.FRONTF['flowers'] if x['code'] == c['sp'])
            d2 = sum(fl['diameter'] ** 2 for fl in f['flowers'])
        else:
            d2 = ((tpl_of(c)['diameter'] or b.DIA[c['size']]) * (c.get('sizeK') or 1.0)) ** 2
        pts = None if tier == 'high' else set(c['profiles'][tier])
        for e in c['events']:
            if pts is not None and e['point'] not in pts:
                continue
            life = e['end'] - e['burst']
            ev.append((e['burst'], d2 / 230 ** 2))
            ev.append((e['burst'] + 0.75 * life, -d2 / 230 ** 2))
    ev.sort()
    cur = peak = 0.0
    at = 0.0
    for t, v in ev:
        cur += v
        if cur > peak:
            peak, at = cur, t
    return round(peak, 2), round(at, 2)


def load_at(cues, t):
    s = 0.0
    for c in cues:
        if c['size'] not in 'SML' or c.get('mobile') == 'only':
            continue
        d2 = ((tpl_of(c)['diameter'] or b.DIA[c['size']]) * (c.get('sizeK') or 1.0)) ** 2
        for e in c['events']:
            if e['burst'] <= t < e['burst'] + 0.75 * (e['end'] - e['burst']):
                s += d2 / 230 ** 2
    return s


def mobile_busy(cues, thr):
    """修订1（复核第 5 条：手游中配同屏面积比 B06 高，多出来的全是小平台）：手游中配球花已经很满（≥ thr 个大号当量）的那一刻，小平台那一点不放"""
    lit = []
    for c in cues:
        if c['size'] not in 'SML' or c.get('mobile') not in ('only', True):
            continue
        d2 = ((tpl_of(c)['diameter'] or b.DIA[c['size']]) * (c.get('sizeK') or 1.0)) ** 2 / 230 ** 2
        pts = set(c['profiles']['medium'])
        lit += [(e['burst'], e['burst'] + 0.75 * (e['end'] - e['burst']), d2) for e in c['events'] if e['point'] in pts]
    out = []
    for c in cues:
        if c.get('mobile') != 'only' or c['size'] != 'X':
            continue
        def peak(e):                            # 这朵小花亮着（开花到寿命 75 %）期间球花面积的最大值
            z0 = e['burst'] + 0.75 * (e['end'] - e['burst'])
            ts = [e['burst']] + [a for a, z, d in lit if e['burst'] < a < z0]
            return max(sum(d for a, z, d in lit if a <= t < z) for t in ts)
        drop = {e['point'] for e in c['events'] if e['point'] in c['profiles']['medium'] and peak(e) >= thr}
        if drop:
            c['profiles']['medium'] = [p for p in c['profiles']['medium'] if p not in drop]
            out.append(dict(cue=c['id'], t=round(min(e['burst'] for e in c['events']), 2), dropped=sorted(drop)))
    return out


def tier_ends(cues):
    """回归账本（用户 11:14「看起来播放范围不会变」）：一排 = 同一 root 的所有片段（按尺寸拆的子片段、城垛半排、手游替身）合起来；
    中 / 低配只要这一排还放，最左、最右两个点都在"""
    g, by = rows(cues)
    bad = []
    for key, rs in g.items():
        if rs[0]['size'] == 'F':
            continue
        for plat, ok in (('pc', (False, True)), ('mobile', ('only', True))):
            sel = [c for c in rs if c.get('mobile') in ok]
            for grp in ('P', 'B', 'F'):
                hi = {e['point'] for c in sel if c['group'] == grp for e in c['events']}
                if len(hi) < 4:
                    continue
                xs = sorted(hi, key=b.px)
                for t in ('medium', 'low'):
                    lo = sorted({p for c in sel if c['group'] == grp for p in c['profiles'][t]}, key=b.px)
                    if lo and (lo[0] != xs[0] or lo[-1] != xs[-1]):
                        bad.append(dict(row=key, platform=plat, tier=t, group=grp, high=xs, kept=lo))
    return dict(rule='一排（同 root 合起来）≥ 4 点时，中 / 低配还放就要留最左、最右', violations=len(bad), list=bad[:20])


def split_shared(cues):
    """修订1（复核第 5 条）：PC + 手游共用的球花片段拆成「PC 照旧 + 手游替身」，手游中 / 低配按手游自己那一排的点隔。
    原来共用片段跟 PC 的隔法（中配 P0 / 2 / 4 / 6 / 8），手游 M / L 本来就只放偶数点，等于中配一个不减，手游中配面积反而比 B06 高。"""
    add = []
    for c in cues:
        if c.get('mobile') is True and c['size'] in 'SML':
            m = copy.deepcopy(c)
            m.update(id=c['id'] + 'm5', mobile='only', standinOf=c['id'])
            c['mobile'] = False
            add.append(m)
    cues.extend(add)
    return [m['id'] for m in add]


def tiers(cues, sparse):
    g, by = rows(cues)
    log = Counter()
    for key, rs in g.items():
        root = by[key]
        for c in rs:
            if c.get('tier') == 'all':
                c['profiles'] = {'medium': list(c['points']), 'low': list(c['points'])}
        if root.get('tier') == 'all':
            log['all'] += 1
            continue
        if root['size'] == 'F':
            for c in rs:
                c['profiles'] = {'medium': list(c['points']), 'low': []}
            log['fan'] += 1
            continue
        pc_pts = {e['point'] for c in rs if c.get('mobile') != 'only' for e in c['events']}
        mob_pts = {e['point'] for c in rs if c.get('mobile') == 'only' for e in c['events']}
        t0 = min(e['burst'] for c in rs for e in c['events'])
        is_sparse = root['size'] in 'SML' and load_at(cues, t0 + 0.4) < sparse
        med = set(pc_pts) if is_sparse else set(thin(pc_pts))
        low = set(thin(pc_pts)) if is_sparse else set(thin(thin(pc_pts)))
        mmed = set(mob_pts) if is_sparse else set(thin(mob_pts))
        mlow = set(thin(mob_pts)) if is_sparse else set(thin(thin(mob_pts)))
        if root['layer'] == 'extra' and root['size'] != 'X':
            low, mlow = set(), set()
        for c in rs:
            M, L = (mmed, mlow) if c.get('mobile') == 'only' else (med, low)
            c['profiles'] = {'medium': [p for p in c['points'] if p in M], 'low': [p for p in c['points'] if p in L]}
        log['sparse' if is_sparse else 'thin'] += 1
    return dict(log)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=str(ROOT / '协作/编排B01/逻辑方案_B03r2m.json'))
    ap.add_argument('--name', default='B07')
    ap.add_argument('--out-dir', default=str(ROOT / '协作/编排B01'))
    ap.add_argument('--seed', type=int, default=20261015)
    ap.add_argument('--sparse', type=float, default=5.0, help='同屏面积（大号朵数当量）低于它算「天上很空」，中配不减')
    ap.add_argument('--strict-fans', action='store_true', help='修订1：扇同时亮着多短都算叠（复核第 8 条）')
    ap.add_argument('--mobile-busy', type=float, default=0.0, help='修订1：手游中配球花同屏面积 ≥ 这个值时，那一刻的小平台不放（0 = 不用）')
    a = ap.parse_args()
    plan = json.loads(Path(a.base).read_text(encoding='utf-8'))
    b.BAR0, b.OFFSET = plan['bar0S'], plan['musicOffsetS']
    b.QUIET = [(b.T(k), b.T(k + 1) - 0.1) for k in (41, 65, 96)]
    rng = random.Random(a.seed)
    grid = B06.Grid(plan)
    cues, plat = B06.base_cues(plan)
    log = dict(base='B03 修订2 → B04 小平台（不换 Tiny）', trio=B06.trio(cues))
    log['dzFlattened'] = flatten(cues)
    log['coda'] = coda(cues, plan)              # 先收白色收束（白墙 7 / 5 去掉奇数点），再拆城垛
    log['castle'] = castle(cues)
    log['zigzagSmall'] = zigzag_small(cues)
    log['orders'] = orders(cues, rng)
    log['contrast'] = contrast(cues)            # 一排一个颜色（换色会改寿命，所以在之字交替前）
    log['bRows'] = brow_complement(cues)
    log['sizes'] = sizes(cues, rng)
    log['platform'] = platform(cues, plan, grid, rng)
    cues.sort(key=lambda c: (min(e['launch'] for e in c['events']), c['id']))
    # 扇：同 B06；白色收束只用轻的一组
    orig = B06.fan_slots

    def slots(cs):
        out = orig(cs)
        for s in out:
            if s['section'] == 'B01_S13':
                s['heavy'] = False
        return out
    B06.fan_slots = slots
    if a.strict_fans:                           # 修订1（独立复核第 8 条）：两把扇同时亮着多短都算（B06 原来不到 0.2 s 不算）
        B06.MIN_SHARED = 0.0
    cues, log['fans'], fslots = B06.place_fans(cues, plan, a.seed)
    B06.fan_slots = orig
    if a.mobile_busy:
        log['splitShared'] = split_shared(cues)
    log['tiers'] = tiers(cues, a.sparse)
    mid = dict(plan, cues=cues)
    cues5, log5 = B05.build(mid)
    for c in cues5:                             # 手游小平台（分裂星）低配照 B04 不放，弱机不加负担
        if c.get('mobile') == 'only' and c['size'] == 'X':
            c['profiles']['low'] = []
    if a.mobile_busy:
        log['mobileBusy'] = mobile_busy(cues5, a.mobile_busy)
    log5['mobileRule'] = B05.mobile_rule(cues5)
    log5['mobileScale'] = B05.scale_table(cues5)
    base_rel = Path(a.base).resolve()
    out = dict(plan, revision=f"{a.name}_ground_trails_interval_tiers_platform_dense_orders_sizes_colors_from_{plan['revision']}", generator='analysis/scripts/编排B07.py',
               cues=cues5, b05=log5, b07=log, base=str(base_rel.relative_to(ROOT)) if base_rel.is_relative_to(ROOT) else base_rel.name)
    od = Path(a.out_dir)
    od.mkdir(parents=True, exist_ok=True)
    lp = od / f'逻辑方案_{a.name}.json'
    lp.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    # 体检
    gpu, read_at = B05.census_gpu()
    model = B05.apply_census(gpu)
    ck = B05.run_checks(out, cues5)
    ck['gpuModel'] = dict(source=str(B05.CENSUS.relative_to(ROOT)), readAt=read_at, **model)
    ck['b05'], ck['b07'] = log5, log
    rep = ovl.report(lp)
    ck['overlap'] = {k: v for k, v in rep.items() if k != 'pc'}
    ck['overlap']['pcList'] = rep['pc']
    b06p = ROOT / '协作/编排B01/逻辑方案_B06.json'
    b06 = json.loads(b06p.read_text(encoding='utf-8'))
    rb = ovl.report(b06p)
    ck['overlapBase'] = dict(file='协作/编排B01/逻辑方案_B06.json', pcIncidents=rb['pcIncidents'], byKind=rb['byKind'],
                             mobile={k: dict(incidents=v['incidents'], totalGapS=v['totalGapS']) for k, v in rb['mobile'].items()})
    ck['fanAudit'] = dict(B07=B06.audit(cues5, out, 'B07'), B06=B06.audit(b06['cues'], b06, 'B06'))
    ck['tierEnds'] = tier_ends(cues5)
    ck['shares'] = {f'{p}-{t}': B06.shares(cues5, p, t) for p in ('pc', 'mobile') for t in ('high', 'medium', 'low')}
    ck['area'] = {f'{v}-{p}-{t}': area_series(cs, t, p) for v, cs in (('B07', cues5), ('B06', b06['cues'])) for p in ('pc', 'mobile') for t in ('high', 'medium', 'low')}
    ck['score'] = scorecard(out, cues5, b06)
    (od / f'体检_{a.name}.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')
    fa = ck['fanAudit']
    print(json.dumps(dict(revision=out['revision'], cues=len(cues5), dz=log['dzFlattened'], castle=len(log['castle']), zigzag=len(log['zigzagSmall']), coda=log['coda'],
                          bRows=[(x['t'], x['firstKeeps'], x['thenKeeps']) for x in log['bRows']],
                          orders=dict(Counter(x['order'] for x in log['orders'])), sizes=len(log['sizes']), contrast=len(log['contrast']), platformAdded=len(log['platform']),
                          tiersLog=log['tiers'], tiers={k: v['events'] for k, v in ck['tiers'].items()}, mobile={k: v['events'] for k, v in ck['b02']['mobileTiers'].items()},
                          gpu=ck['gpu']['peak'], gpuAt=ck['gpu']['peakAt'], gpuTiers={k: v['gpuPeakPerS'] for k, v in ck['tiers'].items()}, beatLock=ck['beatLock'],
                          tierNesting=ck['tierNesting']['ok'], mobileRuleViolations=len(log5['mobileRule']['violations']),
                          overlap=dict(pc=ck['overlap']['pcIncidents'], byKind=ck['overlap']['byKind'], mobile={k: v['incidents'] for k, v in ck['overlap']['mobile'].items()},
                                       mobileGapS={k: v['totalGapS'] for k, v in ck['overlap']['mobile'].items()}),
                          overlapB06=ck['overlapBase']['pcIncidents'], fanClash=fa['B07']['clashPairs'], fanClashB06=fa['B06']['clashPairs'], fanUnplaced=sum(1 for x in log['fans'] if not x.get('placed')),
                          tierEnds=ck['tierEnds']['violations'], mobileBusy=len(log.get('mobileBusy', [])), area=ck['area'], score=ck['score']), ensure_ascii=False, indent=1))


def scorecard(out, cues, b06):
    """B06 评分表里每一项对应的可量指标（同一把尺量 B06 / B07）"""
    import bisect

    def stats(plan, cs):
        pc = [c for c in cs if c.get('mobile') != 'only']
        balls = [(e['burst'], c) for c in pc if c['size'] in 'SML' for e in c['events']]
        ev = sorted(t for t, _ in balls)
        peak = {}
        for s in plan['sections']:             # 修订1：段内开花、任意 4 s 窗（和独立复核同一口径；原来窗口起点只到段尾前 1 s，终章少数 2 朵）
            inside = [t for t in ev if s['start'] <= t < s['end']]
            peak[s['name']] = max((bisect.bisect_left(inside, t + 4) - i for i, t in enumerate(inside)), default=0)
        sec = {s['name']: s for s in plan['sections']}
        coda_s = sec['白色收束']
        coda_L = sum(1 for t, c in balls if coda_s['start'] <= t < coda_s['end'] and c['size'] == 'L') / (coda_s['end'] - coda_s['start'])
        mains = [c for c in pc if c['size'] in 'SML' and c['layer'] == 'main' and not c.get('splitOf')]
        co = sum(1 for c in mains if c['order'] == 'center-out') / max(1, len(mains))
        dz_up = sum(1 for c in pc if c['size'] in 'SML' for e in c['events'] if e['dz'] > 0.5) / max(1, len(balls))
        X = sorted(min(e['launch'] for e in c['events']) for c in pc if c['size'] == 'X')   # 修订1：按起飞算（原来按开花，V 形无花尾缀开花 = 起飞，空档少算 1.4 s）
        span = [t for t in X if t > 16.2]
        gaps = [round(z - a, 1) for a, z in zip(span, span[1:])]
        col = Counter(COLOR.get(c['sp'], 'other') for c in pc if c['size'] in 'SML' for e in c['events'])
        tot = sum(col.values())
        same_layer = 0
        for c in pc:
            if c['group'] == 'B' and c['size'] == 'S':
                t0 = min(e['burst'] for e in c['events'])
                w = Counter()
                for p in pc:
                    if p['group'] == 'P' and p['size'] in 'SML' and abs(min(e['burst'] for e in p['events']) - t0) <= 1.2:
                        w[COLOR[p['sp']]] += len(p['events']) * {'L': 3, 'M': 2, 'S': 1}[p['size']]
                same_layer += bool(w) and w.most_common(1)[0][0] == COLOR[c['sp']]
        return dict(peak4s=dict(climaxII=peak['高潮 II'], finale=peak['终章']), codaLperS=round(coda_L, 2), centerOutShare=round(co, 2),
                    trailsLifted=round(dz_up, 2), platformCues=len(X), platformMaxGapS=max(gaps) if gaps else None,
                    silverGoldShare=round((col['silver'] + col['gold'] + col['strobe'] + col['crackle']) / tot, 2), sameColorLayers=same_layer,
                    sizeVersions=len({c.get('sizeK') or 1.0 for c in pc if c['size'] in 'SML'}))
    return dict(B06=stats(b06, b06['cues']), B07=stats(out, cues))


if __name__ == '__main__':
    main()
