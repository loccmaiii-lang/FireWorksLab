#!/usr/bin/env python3
"""编排候选 A：《汪洋与浩渺》跨年烟花秀逻辑方案生成器（df.choreography-proposal/1）。

只写逻辑：哪个分组、哪个槽位（固定子模板的占位）、在音乐第几秒的重音、点间顺序、点间隔、三档点集。
不写 launch、不写 recipeKey、不写任何 rise / 缩放 / 束数（这些在固定子模板里，由用户保存的版本决定）。
所有编排层时间（锚点、点间隔、点位偏移）都是 0.1 s 的整数倍，内部用「十分之一秒整数」计算，避免浮点误差。

输入：analysis/music/汪洋与浩渺_分析.json（analysis/scripts/音乐分析.py 从 WAV 检测，待试听）
输出：协作/编排demo/候选A/{proposal.json, 预览展开.json, cue表.csv, 检查报告.json}

用法：python3 analysis/scripts/编排候选A.py [--offset 5]
"""
import argparse
import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '协作' / '编排demo' / '候选A'
MUSIC = json.loads((ROOT / 'analysis/music/汪洋与浩渺_分析.json').read_text(encoding='utf-8'))
KICKS = MUSIC['kickOnsetsMusicS']
MUSIC_DUR = MUSIC['durationMusicS']

ap = argparse.ArgumentParser()
ap.add_argument('--offset', type=float, default=5.0, help='showTime = musicTime + offset（候选 5；旧规范 10）')
ARGS = ap.parse_args()
OFFSET_T = round(ARGS.offset * 10)  # 十分之一秒
assert OFFSET_T % 10 == 0, '偏移取整数秒，保证 0.1 s 量化在音乐时间与演出时间下一致'

BAR0, BARP = 0.18, 1.6216  # 拟合的小节网格：bar(k) = 0.18 + 1.6216·k（音乐时间）
SRC_DET = '本机检测待试听'
SRC_USER = '用户给定'
SRC_USER_DET = '用户给定+检测'

# ───────────────────────── 点位（0 起）─────────────────────────
PX = [-374.79, -288.19, -196.59, -100.0, 0.0, 100.0, 196.59, 288.19, 374.79]
BX = [-331.49, -244.89, -148.3, -50.0, 50.0, 148.3, 244.89, 331.49]
FX = [-69, -46, -23, 0, 23, 46, 69]
N = {'P': 9, 'B': 8, 'F': 7}
XS = {'P': PX, 'B': BX, 'F': FX}
ALL = {g: list(range(n)) for g, n in N.items()}
EVEN_P, ODD_P = [0, 2, 4, 6, 8], [1, 3, 5, 7]

# ───────────────────────── 槽位（占位，recipeKey 全空）─────────────────────────
# size：S/M/L = 球花名义直径 90/150/230 m（用户 10-08）；前台 24/30/32/40 m、彗星 8 m（用户 10-08）
SLOTS = {
    'S_SILVER': dict(group='P', kind='ball', size='S', name='小·银菊', hue='silver'),
    'S_LIME': dict(group='P', kind='ball', size='S', name='小·青柠', hue='lime'),
    'S_SPLIT': dict(group='P', kind='ball', size='S', name='小·金裂星', hue='gold'),
    'M_GOLD': dict(group='P', kind='ball', size='M', name='中·金芒菊', hue='gold'),
    'M_SILVER': dict(group='P', kind='ball', size='M', name='中·银白金芒菊', hue='silver'),
    'M_GREEN': dict(group='P', kind='ball', size='M', name='中·金蕊青柠', hue='lime'),
    'M_MULTI': dict(group='P', kind='ball', size='M', name='中·多重菊', hue='gold'),
    'L_SILVER': dict(group='P', kind='ball', size='L', name='大·银彩菊', hue='silver'),
    'L_WILLOW': dict(group='P', kind='ball', size='L', name='大·金垂柳', hue='gold'),
    'FAN_GOLD': dict(group='B', kind='fan', size='fan', name='金锦冠扇形', hue='gold', beams='约11筒（FanGold.md）',
                     variants=['CENTER', 'MID', 'OUTER_L', 'OUTER_R']),
    'FAN_RED5': dict(group='B', kind='fan', size='fan', name='红彗星扇形·5束', hue='red', beams='5'),
    'FAN_SILVER13': dict(group='B', kind='fan', size='fan', name='银灰扇形·13束', hue='silver', beams='13'),
    'F_COMET': dict(group='F', kind='front', size='F8', name='前台·短彗星', hue='silver', diameterM=8),
    'F_CRACKLE': dict(group='F', kind='front', size='F24', name='前台·短爆裂', hue='gold', diameterM=24),
    'F_LIME': dict(group='F', kind='front', size='F30', name='前台·小青柠', hue='lime', diameterM=30),
    'F_SILVER': dict(group='F', kind='front', size='F32', name='前台·小银菊', hue='silver', diameterM=32),
    'F_GOLD': dict(group='F', kind='front', size='F40', name='前台·小金花', hue='gold', diameterM=40),
}
FAN_FAMILY = ('FAN_GOLD', 'FAN_RED5', 'FAN_SILVER13')
# 占位可见时长（仅用于并发估计，真值来自固定子模板）
LIFE_S = {'S': 4.0, 'M': 6.0, 'L': 8.0, 'fan': 3.0, 'F8': 2.5, 'F24': 2.5, 'F30': 3.0, 'F32': 3.0, 'F40': 3.0}
# 升空尾缀的占位升空时长（秒）：取自 spec/尺寸标定.json 的设计 rise_s，只用于预览画尾缀和「调用时间 ≥ 0」检查；
# 真值 D 来自固定子模板，实测前不写进 cue（cue 里的 launchShowS / callShowS 保持空）。扇形即发，没有尾缀。
RISE_S = {'S_SILVER': 2.0, 'S_LIME': 3.5, 'S_SPLIT': 3.5, 'M_GOLD': 5.0, 'M_SILVER': 5.0, 'M_GREEN': 5.0, 'M_MULTI': 5.0,
          'L_SILVER': 8.0, 'L_WILLOW': 8.0, 'F_COMET': 1.8, 'F_CRACKLE': 1.7, 'F_LIME': 1.6, 'F_SILVER': 1.7, 'F_GOLD': 1.8}


for _k, _v in SLOTS.items():
    if _v['kind'] == 'fan':
        _v['tail'] = dict(has=False, note='扇形即发，没有升空尾缀')
    else:
        _v['tail'] = dict(has=True, inSubTemplate=True, previewRiseS=RISE_S[_k],
                          tailOnly=(_k == 'F_COMET'),
                          note='升空尾缀写在固定子模板里；previewRiseS 只是预览示意，真值 D 待固定子模板')


def fam_of(slot):
    """槽位家族：去掉 /扇形位置版本 和 @版本后缀（@A/@B = 高低版本；@1…@5 = 限额分道版本）。"""
    return slot.split('/')[0].split('@')[0]


def fan_variant(group, i):
    """金锦冠扇形四个固定版本按位置取（按名字 Center/Mid/OuterL/OuterR 推测，待用户确认）。"""
    n = N[group]
    if i == 0:
        return 'OUTER_L'
    if i == n - 1:
        return 'OUTER_R'
    return 'CENTER' if crank(group, i) == 0 or (n % 2 and crank(group, i) <= 1) else 'MID'


# ───────────────────────── 工具 ─────────────────────────
def T(x):
    return int(round(x * 10))


def S(t):
    return t / 10


def crank(group, i):
    """离中心的排名；镜像点同排名。P 中心 P4；B/F 的中心：B3/B4 一对、F3。"""
    n = N[group]
    d = abs(i - (n - 1) / 2) - (0.5 if n % 2 == 0 else 0)
    return int(round(d))


def raw_bar(k, beat=0):
    return BAR0 + BARP * k + BARP / 4 * beat


def snap_kick(t, tol=0.12):
    near = min(KICKS, key=lambda x: abs(x - t))
    if abs(near - t) <= tol:
        return near, True
    return t, False


def order_ranks(group, pts, order):
    """返回 {点: 排名}；排名相同的点同一时刻（只允许镜像对）。"""
    if order == 'LR':
        key = {p: (p,) for p in pts}
    elif order == 'RL':
        key = {p: (-p,) for p in pts}
    elif order == 'CO':
        key = {p: (crank(group, p),) for p in pts}
    elif order == 'OC':
        key = {p: (-crank(group, p),) for p in pts}
    elif order == 'ALT_IN':  # 两头相向交替：最外层先、左先右后，最后落在中心
        key = {p: (-crank(group, p), p) for p in pts}
    elif order == 'ONE':
        key = {p: (0,) for p in pts}
    else:
        raise ValueError(order)
    uniq = sorted(set(key.values()))
    idx = {k: i for i, k in enumerate(uniq)}
    return {p: idx[key[p]] for p in pts}


TIER_TABLE = {
    'P': {'medium': [[0, 2, 4, 6, 8], [1, 3, 4, 5, 7]], 'low': [[2, 4, 6], [1, 4, 7], [0, 4, 8], [3, 4, 5]]},
    'B': {'medium': [[0, 3, 4, 7], [1, 2, 5, 6]], 'low': [[3, 4], [1, 6], [2, 5], [0, 7]]},
    'F': {'medium': [[0, 2, 3, 4, 6], [0, 1, 3, 5, 6]], 'low': [[1, 3, 5], [2, 3, 4], [0, 3, 6]]},
}
PHASE = {'P': 0, 'B': 0, 'F': 0}


def pick_tier(group, pts, table_set):
    sel = [p for p in pts if p in table_set]
    if sel:
        return sel
    best = min(crank(group, p) for p in pts)  # 回退：最靠中心的一排（镜像成对保留）
    return [p for p in pts if crank(group, p) == best]


# ───────────────────────── cue 构造 ─────────────────────────
CUES = []
_cid = {}


def cue(sec, group, slot, pts, order, gap, k=None, beat=0, t=None, show=None, intent='', src=SRC_DET,
        slots=None, snap=True, lead=0.0, macro=None, cid=None, weight='support', comp=None, layer=None):
    """gap、lead 用秒（必须是 0.1 的整数倍）。pts 为 None 表示整组。"""
    pts = list(ALL[group]) if pts is None else list(pts)
    assert abs(gap * 10 - round(gap * 10)) < 1e-9 and abs(lead * 10 - round(lead * 10)) < 1e-9
    snapped = None
    if show is not None:  # 演出时间锚点（倒计时）
        h_show = T(show)
        h_music = h_show - OFFSET_T
    else:
        raw = raw_bar(k, beat) if t is None else t
        if snap:
            s, hit = snap_kick(raw)
            if hit:
                snapped = s
            raw = s
        h_music = T(raw) + T(lead)
        h_show = h_music + OFFSET_T
    ranks = order_ranks(group, pts, order)
    g = T(gap)
    offs = {f'{group}{p}': ranks[p] * g for p in pts}
    # 槽位：整条同一槽位，或逐点指定
    if slot in ('FAN_GOLD',):
        slotmap = {f'{group}{p}': f'FAN_GOLD/{fan_variant(group, p)}' for p in pts}
    elif slots:
        slotmap = {f'{group}{p}': slots[p] if isinstance(slots, dict) else slots(p) for p in pts}
    else:
        slotmap = None
    sec_n = _cid.get(sec, 0) + 1
    _cid[sec] = sec_n
    PHASE[group] += 1
    ph = PHASE[group] - 1
    tiers = {
        'high': list(pts),
        'medium': pick_tier(group, pts, TIER_TABLE[group]['medium'][ph % len(TIER_TABLE[group]['medium'])]),
        'low': pick_tier(group, pts, TIER_TABLE[group]['low'][ph % len(TIER_TABLE[group]['low'])]),
    }
    c = dict(
        id=cid or f'A_{sec}_{sec_n:02d}', section=sec, bar=k, beat=beat if k is not None else None, intent=intent,
        group=group, slot=slot, slotByPoint=slotmap, recipeKey=None,
        anchorMusicS=S(h_music), anchorShowS=S(h_show), anchorSource=src, snappedToKickS=snapped,
        alignedEntryIndex=None, launchShowS=None,
        order=order, pointGapS=gap,
        pointOffsetsS={q: S(v) for q, v in offs.items()},
        spanS=S(max(offs.values())),
        pointsByTier={tn: [f'{group}{p}' for p in v] for tn, v in tiers.items()},
        weight=weight, macro=macro,
        comp=(dict(comp, layer=layer) if comp else None),
        callShowS=None, callFormula='H − D（D 来自固定子模板，未绑定）',
    )
    c['tailPreviewRiseS'] = max([RISE_S.get(fam_of((slotmap or {}).get(f'{group}{p}', slot)), 0.0) for p in pts]) if SLOTS[fam_of(slot)]['kind'] != 'fan' else 0.0
    CUES.append(c)
    return c


def xsweep(sec, k, beat, slot, gap, dirn='A', intent='', src=SRC_DET):
    """对扫：同一扇形槽位、同一锚点，P 排与 B 排反向同扫（A：P 左→右、B 右→左；B：反之）。"""
    mid = f'X{k}.{beat}'
    po, bo = ('LR', 'RL') if dirn == 'A' else ('RL', 'LR')
    a = cue(sec, 'P', slot, None, po, gap, k=k, beat=beat, intent=intent, src=src, macro=dict(name='X', id=mid, leg='P-' + po))
    b = cue(sec, 'B', slot, None, bo, gap, k=k, beat=beat, intent=intent, src=src, macro=dict(name='X', id=mid, leg='B-' + bo))
    return a, b


def alt(even_slot, odd_slot, pts=None):
    """奇偶点交错：偶数点 even_slot、奇数点 odd_slot。"""
    return lambda p: even_slot if p % 2 == 0 else odd_slot


def row17(sec, k, beat, slot, order, gap=0.2, lead=0.0, intent='', src=SRC_DET, comp=None, weight='support', snap=True):
    """17 点连扫：坝顶 P 排 + B 排看成一条 17 点的线（x 从左到右 P0 B0 P1 B1 … B7 P8），同方向、同槽位。
    P 排 gap、B 排 gap 且晚 gap/2：P、B 交替，整条线上每 gap/2（常用 0.1 s）一发。
    LR/RL：沿线一发接一发；CO：从 P4 起，B3/B4 镜像对、P3/P5 … 向两端；OC：反过来两头相向。
    P 点能否放扇形待本机确认；不能时只保留 B 排（见方案文档「待确认」）。"""
    assert round(gap * 10) % 2 == 0, '17 点连扫的 gap 必须是 0.2 的整数倍（B 排晚 gap/2 才仍是 0.1 的倍数）'
    half = round(gap / 2, 1)
    mid = f'R{k}.{beat}'
    a = cue(sec, 'P', slot, None, order, gap, k=k, beat=beat, intent=intent, src=src, lead=lead, snap=snap, weight=weight,
            macro=dict(name='ROW17', id=mid, leg='P-' + order), comp=comp, layer='fan')
    b = cue(sec, 'B', slot, None, order, gap, k=k, beat=beat, intent=intent, src=src, lead=round(lead + half, 1), snap=snap, weight=weight,
            macro=dict(name='ROW17', id=mid, leg='B-' + order), comp=comp, layer='fan')
    return a, b


_comp_seq = {}


def new_comp(name, k, beat=0):
    n = _comp_seq.get((name, k, beat), 0) + 1
    _comp_seq[(name, k, beat)] = n
    return dict(name=name, id=f'{name}_{k}' + (f'.{beat}' if beat else ''))


def ver_ab(fam):
    """相邻点调用同一花型的 A / B 两个高低版本（B 比 A 高，由用户在固定子模板里做）：偶数点 A，奇数点 B。"""
    return lambda p: f'{fam}@A' if p % 2 == 0 else f'{fam}@B'


# ───────────────────────── 节目 ─────────────────────────
SECTIONS = []


def section(sid, name, role, bar_a, bar_b, note, music_a=None, music_b=None):
    ma = music_a if music_a is not None else raw_bar(bar_a)
    mb = music_b if music_b is not None else raw_bar(bar_b)
    SECTIONS.append(dict(id=sid, name=name, role=role, barStart=bar_a, barEnd=bar_b,
                         musicStartS=round(ma, 1), musicEndS=round(mb, 1),
                         showStartS=round(ma + ARGS.offset, 1), showEndS=round(mb + ARGS.offset, 1), note=note))


# ───────────────────────── 构图（对回计划书：开场三层 / 三点压顶 / 金色满层 / 白墙连波）─────────────────────────
# 每个高潮不是单排，而是几层叠在一起：
#   高排  M/L 九点，A/B 高低版本交错（相邻点高低差由两个固定子模板版本提供）
#   压顶  大号 L 三点 P0/P4/P8，比高排晚 0.5 s 开，罩在最上面（计划书 ⑤ 三点压顶）
#   中排  M 九点垫在 L 下面（金墙）
#   低排  小号 4–5 点，低位（S_SILVER 约 80 m；S_SPLIT 约 150 m），晚 0.2–0.5 s
#   扇形  17 点连扫（P、B 交替每 0.1 s 一发）铺底
#   前台  里→外
#   连波  L 九点一波接一波（计划书 ⑨ 白墙），下一波的尾缀在上一波开花时已经在升
SRC_AUTH = '编排者定'
LAYER_NAME = dict(high='高排', mid='中排', crown='压顶', low='低排', fan='扇形', front='前台', wave='连波', dam='坝顶', all='')


def Hi(slot, slots=None, order='CO', gap=0.1, lead=0.0, pts=None, beat=None):
    return dict(layer='high', group='P', slot=slot, slots=slots, order=order, gap=gap, lead=lead, pts=pts, beat=beat)


def Mid(slot, slots=None, order='CO', gap=0.1, lead=0.3, pts=None, beat=None):
    return dict(layer='mid', group='P', slot=slot, slots=slots, order=order, gap=gap, lead=lead, pts=pts, beat=beat)


def Crown(slot, order='CO', gap=0.2, lead=0.5, pts=(0, 4, 8), beat=None):
    return dict(layer='crown', group='P', slot=slot, slots=None, order=order, gap=gap, lead=lead, pts=list(pts), beat=beat)


def Low(slot, pts, order='CO', gap=0.2, lead=0.2, beat=None):
    return dict(layer='low', group='P', slot=slot, slots=None, order=order, gap=gap, lead=lead, pts=list(pts), beat=beat)


def Fan(slot, order='CO', gap=0.2, lead=0.1, beat=None):
    return dict(layer='fan', group='PB', slot=slot, slots=None, order=order, gap=gap, lead=lead, pts=None, beat=beat)


def Front(slot, order='CO', gap=0.1, lead=0.3, pts=None, beat=None):
    return dict(layer='front', group='F', slot=slot, slots=None, order=order, gap=gap, lead=lead, pts=pts, beat=beat)


def stack(sec, k, name, layers, beat=0, src=SRC_DET, snap=True, note=''):
    """叠层构图：同一小节同一拍，几层按各自的 lead 先后开；每层一条（或 P+B 两条）cue，都带同一个 comp.id。"""
    cm = new_comp(name, k, beat)
    for ly in layers:
        b = beat if ly['beat'] is None else ly['beat']
        lab = f"{note} · {LAYER_NAME[ly['layer']]}"
        key = 'key' if ly['layer'] in ('high', 'crown', 'fan', 'wave') else 'support'
        if ly['layer'] == 'fan':
            row17(sec, k, b, ly['slot'], ly['order'], ly['gap'], lead=ly['lead'], intent=lab + '：17 点连扫（P、B 交替）',
                  src=src, comp=cm, weight=key, snap=snap)
        else:
            cue(sec, ly['group'], ly['slot'], ly['pts'], ly['order'], ly['gap'], k=k, beat=b, lead=ly['lead'], slots=ly['slots'],
                comp=cm, layer=ly['layer'], src=src, snap=snap, weight=key, intent=lab)
    return cm


def wall(sec, k0, n=8, src=SRC_DET):
    """白墙连波（计划书 ⑨）：L 九点一小节一波，奇偶波里→外 / 外→里交替；五条分道版本（@1–@5）轮流：同一分道的两波相隔 5 小节 ≈ 8.1 s，
    不短于占位寿命 8 s，每条分道同时在场不超过 9，躲开单资源 10 的限额（限额作用域本机还没测）；偶数波拍 2 加一次金扇 17 点连扫（LR / RL 交替），奇数波拍 2 前台回应。"""
    cm = new_comp('WALL', k0)
    for i in range(n):
        k = k0 + i
        lane = i % 5 + 1
        cue(sec, 'P', 'L_SILVER', None, 'CO' if i % 2 == 0 else 'OC', 0.1, k=k, slots=lambda p, lane=lane: f'L_SILVER@{lane}',
            comp=cm, layer='wave', src=src, weight='key', intent=f'白墙第 {i + 1}/{n} 波 · 分道 @{lane}（下一波的尾缀在这一波开花时已在升）')
        if i % 2 == 0:
            row17(sec, k, 2, 'FAN_GOLD', 'LR' if (i // 2) % 2 == 0 else 'RL', 0.2, comp=cm, src=src,
                  intent=f'白墙第 {i + 1} 波 · 金扇 17 点连扫')
        else:
            cue(sec, 'F', 'F_SILVER', None, 'CO' if (i // 2) % 2 == 0 else 'OC', 0.1, k=k, beat=2, comp=cm, layer='front', src=src,
                intent=f'白墙第 {i + 1} 波 · 前台回应')
    return cm


# S0 倒计时：烟花倒计时（演出时间锚点；音乐在倒计时 5 进入）
section('S0', '倒计时', '铺垫', 0, 3, '演出 0–10 s，用烟花倒计时：坝顶 P0+P8 起，每秒一对向里放到 P4（T-8…T-4）；B 扇形 + 前台再向里一轮（T-3…T-1）；0 点从 P4 向外绽放。音乐在倒计时 5 缓缓升起', music_a=-ARGS.offset, music_b=10 - ARGS.offset)
cm0 = new_comp('COUNTDOWN', 0)
cdn = dict(sec='S0', order='ONE', gap=0.0, src=SRC_AUTH, weight='key', comp=cm0)
for sh, pts in [(2.0, [0, 8]), (3.0, [1, 7]), (4.0, [2, 6]), (5.0, [3, 5])]:
    cue(group='P', slot='S_SILVER', pts=pts, show=sh, layer='dam',
        intent=f'T-{10 - int(sh)} 坝顶 P{pts[0]} + P{pts[1]} 各放一发小银菊，往里' + ('；音乐在这一刻进入' if sh == 5.0 else ''), **cdn)
cue(group='P', slot='S_SPLIT', pts=[4], show=6.0, layer='dam', intent='T-4 坝顶收到中心 P4：一发金裂星', **cdn)
for sh, bp, fp in [(7.0, [0, 7], [0, 6]), (8.0, [1, 6], [1, 5]), (9.0, [2, 5], [2, 4])]:
    cue(group='B', slot='FAN_SILVER13', pts=bp, show=sh, layer='fan', intent=f'T-{10 - int(sh)} 坝顶扇形 B{bp[0]} + B{bp[1]} 银灰扇，往里', **cdn)
    cue(group='F', slot='F_SILVER', pts=fp, show=sh, layer='front', intent=f'T-{10 - int(sh)} 前台 F{fp[0]} + F{fp[1]} 小银菊，往里', **cdn)

# S1 开场（bars 3–9）
section('S1', '开场', '释放', 3, 10, '0 点开场三层（高排银白 A/B 高低交错 + 低排小银菊 + 17 点金扇连扫 + 前台），随后前台低位问答，坝顶小花隔小节出现，bar 9 一次小抬升')
stack('S1', 3, 'OPEN3', [Hi('M_SILVER', slots=ver_ab('M_SILVER')), Low('S_SILVER', [1, 3, 5, 7], lead=0.2),
                         Fan('FAN_GOLD', lead=0.1), Front('F_GOLD', lead=0.3)], note='0 点开场三层', src=SRC_USER, snap=False)
cue('S1', 'F', 'F_COMET', None, 'LR', 0.2, k=4, intent='前台彗星左→右扫一遍（低位回应）')
cue('S1', 'F', 'F_COMET', None, 'RL', 0.2, k=5, intent='回扫，右→左')
cue('S1', 'P', 'S_SILVER', [3, 4, 5], 'CO', 0.2, k=6, intent='坝顶中间三点小银菊，第一次回到坝顶')
cue('S1', 'F', 'F_LIME', None, 'CO', 0.2, k=7, intent='前台青柠里→外')
cue('S1', 'P', 'S_LIME', [1, 4, 7], 'CO', 0.2, k=8, intent='坝顶三点小青柠，宽间距')
stack('S1', 9, 'LIFT', [Hi('M_SILVER', slots=ver_ab('M_SILVER')), Low('S_SILVER', [1, 3, 5, 7], lead=0.2),
                        Fan('FAN_SILVER13', lead=0.0, beat=2)], note='句尾小抬升')

# S2 留白 I（bars 10–16）
section('S2', '留白 I', '留白', 10, 17, '能量落到 2–3 dB，只留前台单发 / 双发，让眼睛歇一下，bar 16 前台外→内做 pickup')
cue('S2', 'F', 'F_SILVER', [3], 'ONE', 0, k=10, intent='一发中心小银菊，其后空', weight='key')
cue('S2', 'F', 'F_LIME', [2, 4], 'CO', 0.1, k=12, intent='两侧一对')
cue('S2', 'F', 'F_SILVER', [1, 5], 'CO', 0.1, k=14, intent='再外一对')
cue('S2', 'F', 'F_COMET', None, 'OC', 0.2, k=16, beat=2, intent='外→内 pickup，引到推进')

# S3 推进 I（bars 17–24）
section('S3', '推进 I', '推进', 17, 25, '鼓点回来，坝顶偶数 / 奇数点交替做小花，前台逐小节回应，bar 21 小金裂星是重音')
cue('S3', 'P', 'S_LIME', EVEN_P, 'CO', 0.2, k=17, intent='坝顶偶数点小青柠')
cue('S3', 'F', 'F_COMET', None, 'RL', 0.2, k=18, intent='前台回应')
cue('S3', 'P', 'S_SILVER', ODD_P, 'OC', 0.2, k=19, intent='坝顶奇数点小银菊外→内')
cue('S3', 'F', 'F_SILVER', None, 'CO', 0.2, k=20, intent='前台里→外')
stack('S3', 21, 'LAYER3', [Hi('S_SPLIT'), Low('S_SILVER', [0, 2, 4, 6, 8], lead=0.2), Front('F_GOLD', lead=0.2)], note='重音：金裂星带低排')
cue('S3', 'F', 'F_LIME', None, 'OC', 0.2, k=22, intent='前台外→内')
cue('S3', 'P', 'S_LIME', [1, 4, 7], 'LR', 0.3, k=23, intent='三点小青柠左→右慢扫')
cue('S3', 'F', 'F_COMET', None, 'LR', 0.1, k=24, beat=2, intent='快速左→右一串，引到下一段')

# S4 推进 II（bars 25–32）
section('S4', '推进 II', '推进', 25, 33, '中号球花登场，金扇 17 点连扫左→右、右→左来回，bar 29 中排 + 低排，bar 32 收紧')
cue('S4', 'P', 'M_GOLD', [2, 4, 6], 'CO', 0.2, k=25, intent='中号三点起步')
cue('S4', 'F', 'F_GOLD', None, 'CO', 0.2, k=25, beat=2, intent='前台应答')
row17('S4', 26, 0, 'FAN_GOLD', 'LR', 0.2, intent='金扇 17 点连扫：左→右，P、B 交替每 0.1 s 一发')
cue('S4', 'P', 'M_SILVER', [1, 3, 5, 7], 'LR', 0.2, k=27, intent='银白金芒菊四点左→右')
row17('S4', 28, 0, 'FAN_GOLD', 'RL', 0.2, intent='金扇 17 点连扫：右→左回扫')
stack('S4', 29, 'LAYER3', [Hi('M_GOLD', slots=ver_ab('M_GOLD')), Low('S_SPLIT', [0, 2, 4, 6, 8], lead=0.3), Front('F_SILVER', 'OC', lead=0.5)], note='金芒菊九点带低排')
xsweep('S4', 30, 0, 'FAN_RED5', 0.2, 'A', intent='红彗星扇对扫：P 排左→右 + B 排右→左')
cue('S4', 'P', 'M_MULTI', EVEN_P, 'OC', 0.2, k=31, beat=2, intent='多重菊五点外→内')
cue('S4', 'F', 'F_GOLD', None, 'OC', 0.1, k=32, intent='前台外→内收紧，下一小节释放')

# S5 高潮 I（bars 33–40）
section('S5', '高潮 I', '释放', 33, 41, '第一次大释放：三点压顶 + 高排金银交错 + 低排 + 银灰扇 17 点连扫 + 前台；之后对扫、连扫往返；bar 39 预抬升，bar 40 大号银菊三点悬在随后的静里')
stack('S5', 33, 'CROWN', [Hi('M_GOLD', slots=alt('M_GOLD', 'M_SILVER')), Crown('L_SILVER'), Low('S_SILVER', [1, 3, 5, 7], lead=0.2),
                          Fan('FAN_SILVER13', lead=0.1), Front('F_SILVER', lead=0.3)], note='高潮 I：三点压顶')
xsweep('S5', 34, 2, 'FAN_SILVER13', 0.2, 'A', intent='银灰扇对扫')
cue('S5', 'P', 'M_GREEN', EVEN_P, 'LR', 0.2, k=35, intent='金蕊青柠五点左→右')
cue('S5', 'F', 'F_LIME', None, 'RL', 0.2, k=35, beat=2, intent='前台反向回应')
cue('S5', 'P', 'M_MULTI', ODD_P, 'RL', 0.2, k=36, intent='多重菊四点右→左')
cue('S5', 'F', 'F_COMET', None, 'CO', 0.1, k=36, beat=2, intent='前台彗星里→外')
row17('S5', 37, 0, 'FAN_GOLD', 'CO', 0.2, intent='金扇 17 点连扫：里→外')
cue('S5', 'P', 'M_GOLD', [3, 4, 5], 'CO', 0.2, k=37, beat=2, intent='中间三点金芒菊')
row17('S5', 38, 0, 'FAN_GOLD', 'OC', 0.2, intent='金扇 17 点连扫：外→里（两头相向）')
stack('S5', 39, 'LAYER3', [Hi('M_SILVER', slots=ver_ab('M_SILVER'), order='OC'), Low('S_SILVER', [0, 2, 4, 6, 8], 'OC', lead=0.2),
                           Front('F_SILVER', 'OC', lead=0.1)], note='预抬升：银白九点带低排')
cue('S5', 'P', 'L_SILVER', [1, 4, 7], 'CO', 0.2, k=40, intent='最强鼓点前的大号三点：收在静里', weight='key')

# S6 留白 II（bars 41–47）
section('S6', '留白 II', '留白', 41, 48, 'bar 41 能量骤降，第一小节什么都不放；之后前台与坝顶单发 / 小对，bar 46 一对中心扇形')
cue('S6', 'F', 'F_LIME', None, 'CO', 0.2, k=42, intent='前台青柠里→外，打破静')
cue('S6', 'P', 'S_LIME', [2, 6], 'CO', 0.1, k=44, intent='坝顶一对小青柠')
cue('S6', 'F', 'F_SILVER', [2, 4], 'CO', 0.1, k=44, beat=2, intent='前台一对')
cue('S6', 'B', 'FAN_GOLD', [3, 4], 'CO', 0.1, k=46, intent='中心一对金扇')
cue('S6', 'F', 'F_COMET', None, 'LR', 0.2, k=47, beat=2, intent='前台左→右 pickup')

# S7 推进 III（bars 48–59）
section('S7', '推进 III', '推进', 48, 60, '三个四小节：每四小节坝顶球花一次、扇形一次、前台一次，颜色与扫向轮换；bar 57 金色满层是重音')
cue('S7', 'P', 'M_GOLD', ODD_P, 'CO', 0.2, k=48, intent='坝顶四点金芒菊')
cue('S7', 'F', 'F_GOLD', None, 'CO', 0.2, k=48, beat=2, intent='前台里→外')
row17('S7', 49, 0, 'FAN_RED5', 'LR', 0.2, intent='红彗星扇 17 点连扫：左→右')
cue('S7', 'P', 'M_GREEN', EVEN_P, 'RL', 0.2, k=50, intent='金蕊青柠五点右→左')
xsweep('S7', 51, 2, 'FAN_RED5', 0.2, 'B', intent='红彗星扇对扫：P 排右→左 + B 排左→右')
cue('S7', 'P', 'M_MULTI', None, 'CO', 0.1, k=52, intent='多重菊九点')
cue('S7', 'F', 'F_SILVER', None, 'CO', 0.1, k=52, beat=2, intent='前台里→外')
cue('S7', 'B', 'FAN_GOLD', None, 'LR', 0.2, k=53, beat=2, intent='金扇 B 排左→右')
cue('S7', 'P', 'S_SPLIT', [0, 2, 6, 8], 'OC', 0.2, k=54, intent='外侧四点金裂星')
xsweep('S7', 55, 2, 'FAN_GOLD', 0.2, 'B', intent='金扇对扫')
cue('S7', 'P', 'M_SILVER', ODD_P, 'LR', 0.2, k=56, intent='银白金芒菊四点左→右')
cue('S7', 'F', 'F_LIME', None, 'LR', 0.2, k=56, beat=2, intent='前台左→右')
stack('S7', 57, 'GOLD_FULL', [Hi('M_GOLD', slots=alt('M_GOLD', 'M_GREEN')), Low('S_SPLIT', [0, 2, 4, 6, 8], lead=0.3),
                              Fan('FAN_GOLD', lead=0.1), Front('F_GOLD', lead=0.2)], note='重音：金色满层')
cue('S7', 'B', 'FAN_GOLD', None, 'OC', 0.2, k=58, intent='金扇 B 排外→内，向中心收')
cue('S7', 'F', 'F_COMET', None, 'LR', 0.1, k=59, beat=2, intent='前台快速一串 pickup')

# S8 蓄势（bars 60–65）
section('S8', '蓄势', '推进', 60, 66, '点数越来越窄、越来越靠中心；鼓点七连落在前台 F0→F6 外→内交替；之后 1.6 s 空白，等 107.2 的入口')
cue('S8', 'F', 'F_SILVER', [3], 'ONE', 0, k=60, intent='中心单发', weight='key')
cue('S8', 'P', 'S_SILVER', [4], 'ONE', 0, k=60, beat=2, intent='坝顶中心单发')
cue('S8', 'B', 'FAN_GOLD', [3, 4], 'CO', 0.1, k=61, intent='中心一对金扇')
cue('S8', 'P', 'M_GOLD', [3, 4, 5], 'CO', 0.2, k=62, intent='中间三点金芒菊')
cue('S8', 'F', 'F_GOLD', None, 'CO', 0.1, k=63, intent='前台里→外')
roll = [104.0, 104.3, 104.5, 104.8, 105.1, 105.3, 105.6]  # 七连 kick：103.979 … 105.604（四舍五入到 0.1）
for i, (p, tt) in enumerate(zip([0, 6, 1, 5, 2, 4, 3], roll)):
    cue('S8', 'F', 'F_CRACKLE' if p != 3 else 'F_SILVER', [p], 'ONE', 0, t=tt, snap=False,
        intent=f'鼓点七连第 {i + 1} 下（外→内交替，落在中心）', cid=f'A_S8_R{i + 1}', weight='key')

# S9 高潮 II（bars 66–81）
section('S9', '高潮 II', '释放', 66, 82, '用户给定 1:47 入口：五层满构图（高排金芒菊 A/B 交错 + 大号金垂柳三点压顶 + 低排金裂星 + 17 点金扇连扫 + 前台）；之后每四小节：连扫 / 对扫 / 收拢 / 压顶，bar 73 金色满层，bar 81 金墙（大号金垂柳 + 中排）收尾')
stack('S9', 66, 'FULL5', [Hi('M_GOLD', slots=ver_ab('M_GOLD')), Crown('L_WILLOW'), Low('S_SPLIT', [0, 2, 4, 6, 8], lead=0.3),
                          Fan('FAN_GOLD', lead=0.1), Front('F_GOLD', lead=0.3)], note='高潮 II 入口（穿过风暴）：五层满构图', src=SRC_USER_DET)
xsweep('S9', 67, 0, 'FAN_GOLD', 0.2, 'A', intent='金扇对扫，第一程')
stack('S9', 68, 'LAYER3', [Hi('M_SILVER', slots=ver_ab('M_SILVER'), order='OC'), Low('S_SILVER', [0, 2, 4, 6, 8], 'OC', lead=0.2),
                           Front('F_SILVER', 'OC', lead=0.1)], note='收拢：银白九点外→内')
row17('S9', 68, 2, 'FAN_GOLD', 'LR', 0.2, intent='金扇 17 点连扫：左→右')
cue('S9', 'P', 'M_MULTI', None, 'CO', 0.1, k=69, intent='多重菊九点')
cue('S9', 'F', 'F_LIME', None, 'CO', 0.1, k=69, beat=2, intent='前台里→外')
xsweep('S9', 70, 2, 'FAN_RED5', 0.2, 'B', intent='红彗星扇对扫：反向')
stack('S9', 71, 'CROWN', [Hi('M_GOLD', slots=ver_ab('M_GOLD'), order='OC'), Crown('L_SILVER', order='OC'), Front('F_GOLD', 'OC', lead=0.2)],
      note='三点压顶：外→内')
cue('S9', 'F', 'F_COMET', None, 'RL', 0.1, k=72, intent='前台彗星右→左快扫（0.6 s），把红扇和下一小节的金色满层隔开')
stack('S9', 73, 'GOLD_FULL', [Hi('M_GOLD', slots=ver_ab('M_GOLD')), Low('S_SPLIT', [0, 2, 4, 6, 8], lead=0.3),
                              Fan('FAN_GOLD', lead=0.1), Front('F_GOLD', lead=0.2)], note='高频峰：金色满层')
cue('S9', 'F', 'F_SILVER', [2, 3, 4], 'CO', 0.2, k=74, intent='小回落：前台中间三点')
cue('S9', 'P', 'M_GREEN', EVEN_P, 'LR', 0.2, k=75, intent='金蕊青柠五点左→右')
cue('S9', 'P', 'M_SILVER', ODD_P, 'RL', 0.2, k=76, intent='银白金芒菊四点右→左')
cue('S9', 'F', 'F_LIME', None, 'LR', 0.2, k=76, beat=2, intent='前台左→右')
xsweep('S9', 77, 2, 'FAN_SILVER13', 0.2, 'A', intent='银灰扇对扫')
cue('S9', 'P', 'M_MULTI', None, 'OC', 0.1, k=78, intent='多重菊九点外→内')
cue('S9', 'F', 'F_CRACKLE', None, 'CO', 0.1, k=78, beat=2, intent='前台爆裂里→外')
cue('S9', 'P', 'L_SILVER', [2, 4, 6], 'CO', 0.2, k=79, intent='大号银菊三点')
row17('S9', 79, 2, 'FAN_GOLD', 'CO', 0.2, intent='金扇 17 点连扫：里→外')
xsweep('S9', 80, 2, 'FAN_GOLD', 0.2, 'B', intent='金扇对扫：反向')
stack('S9', 81, 'GOLD_WALL', [Hi('L_WILLOW'), Mid('M_GOLD', slots=ver_ab('M_GOLD'), lead=0.3),
                              Low('S_SPLIT', [0, 2, 4, 6, 8], lead=0.5), Fan('FAN_GOLD', lead=0.1), Front('F_GOLD', lead=0.3)],
      note='金墙：大号金垂柳九点 + 中排，高潮 II 收尾')

# S10 转场（bars 82–100）
section('S10', '转场', '推进', 82, 101, '高潮后回落到中号球花；bar 86 与 bar 99 两处小静；bar 89 / 93 / 95 三个小峰逐步加高（bar 95 中排 + 压顶 + 扇形），最后在 bar 100 前台 pickup 引进终章')
cue('S10', 'F', 'F_SILVER', None, 'CO', 0.2, k=82, intent='回落：前台里→外')
cue('S10', 'B', 'FAN_GOLD', [3, 4], 'CO', 0.1, k=83, intent='中心一对金扇')
cue('S10', 'P', 'M_GREEN', [1, 4, 7], 'CO', 0.3, k=84, intent='金蕊青柠三点，宽间隔')
cue('S10', 'F', 'F_LIME', None, 'LR', 0.2, k=84, beat=2, intent='前台左→右')
cue('S10', 'P', 'M_GOLD', EVEN_P, 'CO', 0.2, k=85, intent='金芒菊五点里→外')
cue('S10', 'B', 'FAN_RED5', None, 'RL', 0.2, k=85, beat=2, intent='红彗星扇 B 排右→左')
cue('S10', 'F', 'F_COMET', [3], 'ONE', 0, k=86, intent='小静：一发中心彗星', weight='key')
cue('S10', 'P', 'M_SILVER', ODD_P, 'OC', 0.2, k=87, intent='银白金芒菊四点外→内')
cue('S10', 'F', 'F_SILVER', None, 'CO', 0.2, k=87, beat=2, intent='前台里→外')
xsweep('S10', 88, 0, 'FAN_GOLD', 0.2, 'A', intent='金扇对扫')
cue('S10', 'P', 'M_GOLD', None, 'CO', 0.1, k=89, slots=alt('M_GOLD', 'M_MULTI'), intent='小峰一：金芒菊与多重菊交错九点', weight='key')
cue('S10', 'F', 'F_GOLD', None, 'CO', 0.1, k=89, lead=0.1, intent='前台小金花')
cue('S10', 'B', 'FAN_GOLD', None, 'OC', 0.2, k=90, intent='金扇 B 排外→内（两头相向）')
cue('S10', 'F', 'F_COMET', None, 'RL', 0.2, k=90, beat=2, intent='前台右→左')
cue('S10', 'P', 'M_MULTI', EVEN_P, 'OC', 0.2, k=91, beat=2, intent='多重菊五点外→内')
xsweep('S10', 92, 2, 'FAN_SILVER13', 0.3, 'B', intent='银灰扇慢对扫（间隔 0.3 s）')
cue('S10', 'P', 'M_SILVER', None, 'CO', 0.1, k=93, intent='小峰二：银白金芒菊九点', weight='key')
cue('S10', 'F', 'F_SILVER', None, 'OC', 0.1, k=93, intent='前台外→内')
cue('S10', 'B', 'FAN_SILVER13', None, 'CO', 0.2, k=94, beat=2, intent='银灰扇 B 排里→外（接在慢对扫之后，同色）')
cue('S10', 'F', 'F_COMET', None, 'LR', 0.1, k=94, beat=3, intent='前台快速一串')
stack('S10', 95, 'PEAK3', [Mid('M_GOLD', slots=None, lead=0.0, pts=EVEN_P, order='CO', gap=0.2), Crown('L_WILLOW', pts=(2, 4, 6), lead=0.3),
                           Fan('FAN_GOLD', lead=0.1, beat=2)], note='小峰三（高频峰）：中排 + 大号压顶 + 金扇')
cue('S10', 'P', 'M_GOLD', EVEN_P, 'LR', 0.2, k=96, intent='金芒菊五点左→右')
cue('S10', 'F', 'F_GOLD', None, 'RL', 0.2, k=96, beat=2, intent='前台右→左')
cue('S10', 'P', 'M_GREEN', None, 'CO', 0.1, k=97, intent='金蕊青柠九点', weight='key')
xsweep('S10', 97, 2, 'FAN_GOLD', 0.2, 'A', intent='金扇对扫')
cue('S10', 'F', 'F_LIME', None, 'OC', 0.2, k=98, intent='前台外→内')
cue('S10', 'F', 'F_SILVER', [3], 'ONE', 0, k=99, intent='小静：一发中心银菊', weight='key')
cue('S10', 'F', 'F_COMET', None, 'LR', 0.1, k=100, beat=2, intent='pickup：前台快速一串')
cue('S10', 'P', 'S_SILVER', None, 'OC', 0.1, k=100, beat=3, intent='两头相向收拢，贴着终章入口', snap=False)

# S11 终章（bars 101–117）
section('S11', '终章', '释放', 101, 118, '全场最高能量：bar 101 五层满构图入口；金扇连扫；bar 105 金墙（大号金垂柳 + 中排 + 低排 + 银灰扇 + 前台）；bar 109 金色压顶；bar 110–117 白墙连波 8 波（每小节一波，下一波的尾缀在上一波开花时已在升），金扇连扫与前台在波间回应')
stack('S11', 101, 'FULL5', [Hi('M_SILVER', slots=ver_ab('M_SILVER')), Crown('L_SILVER'), Low('S_SILVER', [1, 3, 5, 7], lead=0.2),
                            Fan('FAN_GOLD', lead=0.1), Front('F_SILVER', lead=0.3)], note='终章入口：五层满构图')
row17('S11', 102, 0, 'FAN_GOLD', 'LR', 0.2, intent='金扇 17 点连扫：左→右')
cue('S11', 'P', 'M_GOLD', None, 'OC', 0.1, k=103, slots=alt('M_GOLD', 'M_SILVER'), intent='金银交错九点外→内')
cue('S11', 'F', 'F_GOLD', None, 'OC', 0.1, k=103, intent='前台外→内')
xsweep('S11', 104, 0, 'FAN_SILVER13', 0.2, 'B', intent='银灰扇对扫：反向')
cue('S11', 'F', 'F_COMET', None, 'LR', 0.1, k=104, beat=2, intent='前台快速一串')
stack('S11', 105, 'GOLD_WALL', [Hi('L_WILLOW'), Mid('M_GOLD', slots=ver_ab('M_GOLD'), lead=0.3), Low('S_SPLIT', [0, 2, 4, 6, 8], lead=0.5),
                                Fan('FAN_SILVER13', 'OC', lead=0.1), Front('F_GOLD', lead=0.3)], note='金墙（配银灰扇）')
row17('S11', 106, 0, 'FAN_SILVER13', 'LR', 0.2, intent='银灰扇 17 点连扫：左→右（接在金墙的银灰扇之后，同色）')
cue('S11', 'F', 'F_SILVER', None, 'RL', 0.2, k=106, beat=2, intent='前台右→左')
cue('S11', 'P', 'M_MULTI', None, 'CO', 0.1, k=107, intent='多重菊九点')
cue('S11', 'F', 'F_LIME', None, 'CO', 0.1, k=107, beat=2, intent='前台里→外')
xsweep('S11', 108, 0, 'FAN_GOLD', 0.2, 'A', intent='金扇对扫')
cue('S11', 'F', 'F_COMET', None, 'RL', 0.1, k=108, beat=2, intent='前台快速一串')
stack('S11', 109, 'FULL5', [Hi('M_GOLD', slots=ver_ab('M_GOLD')), Crown('L_WILLOW'), Low('S_SPLIT', [0, 2, 4, 6, 8], lead=0.3),
                            Fan('FAN_GOLD', lead=0.1), Front('F_GOLD', lead=0.3)], note='白墙之前的金色压顶')
wall('S11', 110, 8)

# S12 收束（bars 118–128）
section('S12', '收束', '收束', 118, 126, '终章能量降下来的一刻放最后的金墙（间隔拉宽到 0.2 s，像落雨）；之后越来越疏，bar 124 中心一发收尾；bar 125 起淡出')
stack('S12', 118, 'GOLD_WALL', [Hi('L_WILLOW', gap=0.2), Fan('FAN_GOLD', gap=0.4, lead=0.2), Front('F_GOLD', gap=0.2, lead=0.2)],
      note='最后的金墙：间隔拉宽')
cue('S12', 'F', 'F_GOLD', None, 'LR', 0.2, k=119, intent='落雨：前台左→右')
cue('S12', 'P', 'M_GOLD', [2, 4, 6], 'CO', 0.3, k=120, intent='坝顶三点金芒菊，间隔 0.3 s')
cue('S12', 'F', 'F_SILVER', None, 'CO', 0.2, k=121, intent='前台里→外')
cue('S12', 'P', 'S_SILVER', ODD_P, 'CO', 0.2, k=122, intent='坝顶四点小银菊')
cue('S12', 'F', 'F_LIME', None, 'OC', 0.2, k=123, intent='前台外→内')
cue('S12', 'P', 'L_WILLOW', [4], 'ONE', 0, k=124, intent='收尾：中心一发大号金垂柳', weight='key')
cue('S12', 'B', 'FAN_GOLD', [3, 4], 'CO', 0.1, k=124, lead=0.1, intent='中心一对金扇', weight='key')
cue('S12', 'F', 'F_GOLD', [3], 'ONE', 0, k=124, lead=0.1, intent='前台中心小金花', weight='key')


# ───────────────────────── 锚点表 ─────────────────────────
ANCHORS = [
    dict(id='AN01', musicS=0.0, label='音乐从零渐入（淡入约 3 s）', source=SRC_USER, note='用户 10-09 17:14：倒计时 10→5 之间音乐开始缓缓升起；候选取倒计时 5（演出 5.0 s）为音乐 0 s'),
    dict(id='AN02', musicS=5.0, label='倒计时 0 点：第一次开花', source=SRC_USER, note='音乐 5.04 为第 3 小节强拍（检测），取 5.0；若偏移改回 10，则落在演出 15.0 s，倒计时段全部无音乐'),
    dict(id='AN03', musicS=53.7, label='第一次能量抬升（bar 33）', source=SRC_DET, note='kick 53.708；其后 rms 约 +2 dB、高频 ×2，待试听'),
    dict(id='AN04', musicS=65.0, label='最强 kick 之一，随后 66.7 骤降', source=SRC_DET, note='kick 65.039 强度 45.8；bar 41（66.7 s）rms 回到 4 dB'),
    dict(id='AN05', musicS=104.0, label='鼓点七连（103.98→105.60），随后 1.6 s 空白', source=SRC_DET, note='7 个 kick 间隔 0.28 s；之后到 107.207 没有 kick，待试听'),
    dict(id='AN06', musicS=107.2, label='高潮 II 入口（用户 1:47，「穿过风暴」前鼓点）', source=SRC_USER_DET, note='用户给定 1:47；检测到 kick 107.207 恰为 bar 66 强拍，其后 16 小节持续高能量'),
    dict(id='AN07', musicS=118.6, label='高频峰（bar 73）', source=SRC_DET, note='高频能量全曲前列'),
    dict(id='AN08', musicS=131.5, label='高潮 II 末 kick 峰（bar 81），133.2 起能量回落', source=SRC_DET, note='kick 强度 47.5，随后 rms 下降 5 dB'),
    dict(id='AN09', musicS=144.5, label='小峰一（bar 89）', source=SRC_DET, note='kick 43，rms 12.3 dB'),
    dict(id='AN10', musicS=154.2, label='小峰二/三（bar 95、97）', source=SRC_DET, note='高频 2.19，bar 97 rms 13 dB'),
    dict(id='AN11', musicS=164.0, label='终章入口（bar 101）', source=SRC_DET, note='kick 163.979；高频 2.35 为全曲最高'),
    dict(id='AN12', musicS=189.9, label='终章能量最高（bar 117），191.5 起回落', source=SRC_DET, note='rms 13.7 dB；bar 118 回到 10 dB'),
    dict(id='AN13', musicS=201.3, label='尾声最后一个 kick（bar 124），202.9 起淡出', source=SRC_DET, note='kick 201.271；205 s 以后接近静音'),
]
for a in ANCHORS:
    a['showS'] = round(a['musicS'] + ARGS.offset, 1)


# ───────────────────────── 校验 ─────────────────────────
def is_tenth(x):
    return abs(x * 10 - round(x * 10)) < 1e-9


def run_checks():
    rep = {}
    errs = []

    # 1) 0.1 s 量化
    bad = []
    for c in CUES:
        vals = [c['anchorMusicS'], c['anchorShowS'], c['pointGapS'], c['spanS']] + list(c['pointOffsetsS'].values())
        if not all(is_tenth(v) for v in vals):
            bad.append(c['id'])
    rep['量化0.1s'] = dict(ok=not bad, bad=bad)
    errs += bad
    # 最小间隔：非零间隔 ≥ 0.1
    small = [c['id'] for c in CUES for v in c['pointOffsetsS'].values() if 0 < v < 0.1]
    rep['无0.0x间隔'] = dict(ok=not small, bad=small)
    errs += small

    # 2) 点位 0 起、容量
    badpt = []
    for c in CUES:
        for tn, pts in c['pointsByTier'].items():
            for p in pts:
                if p[0] != c['group'] or not (0 <= int(p[1:]) < N[c['group']]):
                    badpt.append((c['id'], p))
    rep['点位0起且不越界'] = dict(ok=not badpt, bad=badpt)
    errs += badpt

    # 3) 无 launch / recipeKey
    rk = [c['id'] for c in CUES if c['launchShowS'] is not None or c['recipeKey'] is not None]
    rep['launch与recipeKey全空'] = dict(ok=not rk, bad=rk)
    errs += rk

    # 4) 同一 cue 内同时刻点数：≤2 且必须镜像（否则就是「齐发」）
    simul = []
    for c in CUES:
        if c['order'] == 'ONE' and len(c['pointsByTier']['high']) <= 2:
            continue
        by = {}
        for q, v in c['pointOffsetsS'].items():
            by.setdefault(v, []).append(int(q[1:]))
        for v, ps in by.items():
            if len(ps) > 2:
                simul.append((c['id'], v, ps))
            elif len(ps) == 2 and ps[0] + ps[1] != N[c['group']] - 1:
                simul.append((c['id'], v, ps))
    rep['无齐发(同刻≤镜像一对)'] = dict(ok=not simul, bad=simul)
    errs += simul

    # 5) 三档：非空、对称、被保留点的时刻不变（构造上成立，这里查对称）
    asym = []
    for c in CUES:
        for tn in ('medium', 'low'):
            ps = [int(p[1:]) for p in c['pointsByTier'][tn]]
            if not ps:
                asym.append((c['id'], tn, '空'))
                continue
            full = set(int(p[1:]) for p in c['pointsByTier']['high'])
            sym_full = all((N[c['group']] - 1 - p) in full for p in full)
            if sym_full and not all((N[c['group']] - 1 - p) in ps for p in ps):
                asym.append((c['id'], tn, ps))
    rep['三档非空且对称'] = dict(ok=not asym, bad=asym)
    errs += asym

    # 6) 三档轮换：每个点在中/低档都被用到
    use = {tn: {g: [0] * N[g] for g in N} for tn in ('medium', 'low')}
    for c in CUES:
        for tn in ('medium', 'low'):
            for p in c['pointsByTier'][tn]:
                use[tn][c['group']][int(p[1:])] += 1
    unused = [(tn, g, i) for tn in use for g in use[tn] for i, v in enumerate(use[tn][g]) if v == 0]
    rep['三档每点都有出场'] = dict(ok=not unused, bad=unused, 次数=use)
    errs += unused

    # 7) 扇形同色规则：相隔 < 1.0 s 的扇形 cue 必须同一家族
    fans = []
    for c in CUES:
        if c['slot'] in FAN_FAMILY:
            a = c['anchorMusicS']
            fans.append((a, a + c['spanS'], c['slot'], c['id']))
    fans.sort()
    clash = []
    for i in range(len(fans)):
        for j in range(i + 1, len(fans)):
            if fans[j][0] - fans[i][1] >= 1.0:
                continue
            if fans[i][2] != fans[j][2]:
                clash.append((fans[i][3], fans[j][3]))
    rep['扇形1s内同色'] = dict(ok=not clash, bad=clash)
    errs += clash

    # 8) 扇形顺序覆盖
    fo = {}
    for c in CUES:
        if c['slot'] in FAN_FAMILY:
            key = c['macro']['name'] + ':' + c['order'] if c['macro'] else c['order']
            fo[key] = fo.get(key, 0) + 1
    rep['扇形顺序覆盖'] = dict(ok=all(k in fo for k in ('LR', 'RL', 'CO', 'OC', 'X:LR', 'X:RL')), 次数=fo)
    if not rep['扇形顺序覆盖']['ok']:
        errs.append('扇形顺序覆盖')

    # 9) 时间范围
    last = max(c['anchorMusicS'] + c['spanS'] for c in CUES)
    rep['时间范围'] = dict(ok=0 <= min(c['anchorShowS'] for c in CUES) and last < MUSIC_DUR, 最晚音乐时间=last)

    # 10) 并发（占位时长）：按槽位家族
    ev = []
    for c in CUES:
        for q, off in c['pointOffsetsS'].items():
            slot = (c['slotByPoint'] or {}).get(q, c['slot'])
            fam = fam_of(slot)
            ev.append((c['anchorMusicS'] + off, fam, SLOTS[fam]['size']))
    # 并发：按槽位家族；金锦冠扇形另按位置版本（CENTER/MID/OUTER）拆开估计
    ev2 = []
    for c in CUES:
        for q, off in c['pointOffsetsS'].items():
            slot = (c['slotByPoint'] or {}).get(q, c['slot'])
            ev2.append((c['anchorMusicS'] + off, slot))
    conc = {}
    keys = set(slot for _, slot in ev2) | set(fam_of(slot) for _, slot in ev2)
    for key in sorted(keys):
        fam = fam_of(key)
        pts = sorted(t for t, sl in ev2 if sl == key or (fam_of(sl) == key))
        if not pts:
            continue
        life = LIFE_S[SLOTS[fam]['size']]
        mx = max(sum(1 for u in pts if t - 1e-9 <= u < t + life) for t in pts)
        conc[key] = {'最多同时在场': mx, '占位寿命s': life, '按限额10需要的版本数': -(-mx // 10)}
    over = [f for f, v in conc.items() if v['最多同时在场'] > 10 and '/' not in f and '@' not in f]
    over_ver = [f for f, v in conc.items() if v['最多同时在场'] > 10 and ('@' in f)]
    rep['并发(占位寿命)'] = dict(ok=True, 超过10的槽位=over, 分道版本仍超过10=over_ver, 明细=conc,
                              说明='寿命是占位估值，限额作用域也未实测；只用来提示该拆版本，不当结论')

    # 11) 段落密度（点次/小节），只描述
    dens = {}
    for sec in SECTIONS:
        n = sum(len(c['pointsByTier']['high']) for c in CUES if c['section'] == sec['id'])
        bars = max(1, sec['barEnd'] - sec['barStart'])
        dens[sec['id']] = dict(cue=sum(1 for c in CUES if c['section'] == sec['id']), 点次=n, 小节=bars, 点次每小节=round(n / bars, 1))
    rep['段落密度(描述)'] = dens

    # 12) 倒计时：烟花倒计时——坝顶 P0+P8 起每秒一对向里到 P4，再 B / F 向里一轮，0 点从 P4 向外绽放
    cd = [c for c in CUES if c['section'] == 'S0']
    pcd = sorted((c for c in cd if c['group'] == 'P'), key=lambda c: c['anchorShowS'])
    seq = [[int(p[1:]) for p in c['pointsByTier']['high']] for c in pcd]
    steps = [c['anchorShowS'] for c in pcd]
    inward_p = (seq[:1] == [[0, 8]] or seq[:1] == [[8, 0]]) and all(
        max(a) - min(a) > max(b) - min(b) or len(b) == 1 for a, b in zip(seq, seq[1:])) and seq[-1] == [4]
    one_per_s = all(abs((b - a) - 1.0) < 1e-9 for a, b in zip(steps, steps[1:]))
    bloom = [c for c in CUES if c['section'] == 'S1' and c['anchorShowS'] == 10.0]
    bloom_p = [c for c in bloom if c['group'] == 'P' and c['pointOffsetsS'].get('P4') == 0.0]
    first_h = min(c['anchorShowS'] for c in cd)
    musicin = [c for c in cd if c['anchorShowS'] == ARGS.offset]
    rep['倒计时'] = dict(ok=all(is_tenth(c['anchorShowS']) and c['anchorShowS'] == int(c['anchorShowS']) for c in cd)
                      and inward_p and one_per_s and bool(bloom_p) and bool(musicin),
                      坝顶步进=[(st, sq) for st, sq in zip(steps, seq)], 向里=inward_p, 每秒一步=one_per_s,
                      开花从P4起=bool(bloom_p), 音乐进入时有倒计时发=bool(musicin), 开花演出时间=10.0, 第一发H=first_h)
    errs += [] if rep['倒计时']['ok'] else ['倒计时']

    # 13) 17 点连扫 ROW17：P、B 两条同方向同槽位；合在一条 17 点线上每 gap/2 一发，间隔完全均匀
    xs = {**{f'P{i}': PX[i] for i in range(9)}, **{f'B{i}': BX[i] for i in range(8)}}
    rows = {}
    for c in CUES:
        if c['macro'] and c['macro']['name'] == 'ROW17':
            rows.setdefault(c['macro']['id'], []).append(c)
    bad17 = []
    for rid, cs in rows.items():
        g = {c['group']: c for c in cs}
        if set(g) != {'P', 'B'} or g['P']['slot'] != g['B']['slot'] or g['P']['order'] != g['B']['order'] or g['P']['pointGapS'] != g['B']['pointGapS']:
            bad17.append((rid, '腿不配对')); continue
        gap, order = g['P']['pointGapS'], g['P']['order']
        times = {}
        for c in cs:
            for q, off in c['pointOffsetsS'].items():
                times[q] = round(c['anchorShowS'] + off, 1)
        if order in ('LR', 'RL'):
            ordq = sorted(times, key=lambda q: xs[q], reverse=(order == 'RL'))
            ds = [round(times[b] - times[a], 1) for a, b in zip(ordq, ordq[1:])]
            if len(times) != 17 or any(abs(d - gap / 2) > 1e-9 for d in ds):
                bad17.append((rid, order, ds))
        else:  # CO / OC：按 |x| 分层，层间隔 gap/2
            lv = {}
            for q, t in times.items():
                lv.setdefault(round(abs(xs[q]), 0), set()).add(t)
            lvs = sorted(lv, reverse=(order == 'OC'))
            ts = [sorted(lv[a]) for a in lvs]
            flat = [x[0] for x in ts]
            ds = [round(b - a, 1) for a, b in zip(flat, flat[1:])]
            if any(len(x) != 1 for x in ts) or any(d < gap / 2 - 1e-9 for d in ds) or len(times) != 17:
                bad17.append((rid, order, ds))
    rep['17点连扫'] = dict(ok=not bad17 and len(rows) >= 8, 条数=len(rows), bad=bad17,
                        说明='P 排与 B 排合成一条 17 点线，LR/RL 每 gap/2 一发且间隔完全均匀；CO/OC 按 |x| 分层、镜像对同刻')
    errs += [] if rep['17点连扫']['ok'] else ['17点连扫']

    # 14) 尾缀：球花 / 前台都有尾缀元数据；调用时间只记公式；占位升空不会让调用时间早于 0
    no_tail = [k for k, v in SLOTS.items() if 'tail' not in v]
    early = []
    for c in CUES:
        for q, off in c['pointOffsetsS'].items():
            sl = (c['slotByPoint'] or {}).get(q, c['slot'])
            r = RISE_S.get(fam_of(sl), 0.0)
            if c['anchorShowS'] + off - r < -1e-9:
                early.append((c['id'], q, round(c['anchorShowS'] + off - r, 1)))
    badcall = [c['id'] for c in CUES if c['callShowS'] is not None]
    rep['尾缀'] = dict(ok=not no_tail and not early and not badcall, 缺尾缀元数据=no_tail, 调用早于0=early, callShowS非空=badcall,
                     说明='尾缀在固定子模板里；cue 只写开花时刻 H，调用时间=H−D 待绑定；占位升空仅用于预览与「调用时间≥0」检查')
    errs += [] if rep['尾缀']['ok'] else ['尾缀']

    # 15) 构图分层：每个叠层构图至少 3 层；FULL5 / CROWN 必有压顶
    cmp_layers = {}
    for c in CUES:
        if c['comp'] and c['comp']['name'] not in ('COUNTDOWN',):
            cmp_layers.setdefault(c['comp']['id'], set()).add(c['comp']['layer'])
    thin = [(i, sorted(v)) for i, v in cmp_layers.items() if len(v) < 3]
    no_crown = [i for i, v in cmp_layers.items() if (i.startswith('FULL5') or i.startswith('CROWN')) and 'crown' not in v]
    rep['构图分层'] = dict(ok=not thin and not no_crown, 构图数=len(cmp_layers), 不足三层=thin, 缺压顶=no_crown,
                        层数={i: sorted(v) for i, v in cmp_layers.items()})
    errs += [] if rep['构图分层']['ok'] else ['构图分层']

    rep['_errors'] = errs
    return rep


# ───────────────────────── 输出 ─────────────────────────
def main():
    OUT.mkdir(parents=True, exist_ok=True)
    CUES.sort(key=lambda c: (c['anchorShowS'], c['group']))
    rep = run_checks()
    for sec in SECTIONS:
        sec['cueCount'] = sum(1 for c in CUES if c['section'] == sec['id'])
    # 段落平均 rms
    for sec in SECTIONS:
        if sec['id'] == 'S0':
            sec['meanRmsDb'] = None
            continue
        sel = [p['rmsDb'] for p in MUSIC['perSecond'] if sec['musicStartS'] <= p['musicS'] < sec['musicEndS']]
        sec['meanRmsDb'] = round(sum(sel) / len(sel), 1) if sel else None

    vers = {}
    for c in CUES:
        for sl in set((c['slotByPoint'] or {c['group']: c['slot']}).values()):
            if '@' in sl:
                vers.setdefault(fam_of(sl), set()).add(sl.split('@')[1])
    for fam, v in vers.items():
        SLOTS[fam]['versions'] = dict(used=sorted(v), note='@A/@B = 高低两个固定子模板版本（B 比 A 高，相邻点交错）；@1…@5 = 内容相同、资源不同的分道版本（躲限额）。版本由用户在固定子模板里做，这里只引用名字')

    proposal = dict(
        format='df.choreography-proposal/1',
        candidateRevision='A2（2026-10-09 18:33 反馈后：补尾缀、烟花倒计时、分层高潮构图、17 点连扫）',
        status='draft_requires_local_recipe_and_audio_validation',
        candidate='A',
        title='《汪洋与浩渺》跨年烟花秀 · 候选 A',
        generatedBy='analysis/scripts/编排候选A.py',
        pointNumbering=0,
        musicOffsetS=ARGS.offset,
        musicOffsetNote='候选取 5：倒计时 5 时音乐进入，0 点落在音乐 5.0 s（第 3 小节强拍）。旧规范是 10（showTime = musicTime + 10，音乐在 0 点才开始）。待用户确认，改偏移只需重跑生成器。',
        tailNote='每个球花 / 前台花槽位都含升空尾缀（slots[*].tail，写在固定子模板里）。cue 只写开花时刻 H；调用时间 = H − D，D 待固定子模板，callShowS 保持空。预览里的尾缀按 previewRiseS 示意。扇形即发，没有尾缀。',
        layerNote='高潮由几层叠成：高排 / 中排 / 压顶（L 三点 P0 P4 P8）/ 低排 / 扇形（17 点连扫）/ 前台 / 连波。同一构图的各条 cue 共用 comp.id，层名在 comp.layer。',
        assumptions=['P 点能放扇形（17 点连扫、对扫都依赖；不能时只保留 B 排，见方案文档）', '金锦冠扇 CENTER/MID/OUTER_L/OUTER_R 四个版本按位置取（按名字推测）', '@A/@B（高低）、@1…@5（分道）版本由用户在固定子模板里提供'],
        timeQuantumS=0.1,
        timeQuantumNote='编排层锚点、点间隔、点位偏移一律是 0.1 s 的整数倍，最小非零 0.1 s；不使用 0.0x',
        musicDurationS=MUSIC_DUR,
        showDurationS=round(MUSIC_DUR + ARGS.offset, 1),
        lyricsStatus='未识别（本环境没有语音识别）；段落名只来自能量/鼓点检测，歌词语境待试听',
        groups={g: dict(capacity=N[g], points=[dict(id=f'{g}{i}', x=XS[g][i]) for i in range(N[g])]) for g in N},
        slots=SLOTS,
        sections=SECTIONS,
        anchors=ANCHORS,
        tierTables=TIER_TABLE,
        cues=CUES,
        checks={k: v for k, v in rep.items() if k != '_errors'},
    )
    (OUT / 'proposal.json').write_text(json.dumps(proposal, ensure_ascii=False, indent=1), encoding='utf-8')

    # 预览展开：逐点逐时刻（演出时间），带档位掩码 1=高 2=中 4=低
    events = []
    for c in CUES:
        for q, off in c['pointOffsetsS'].items():
            slot = (c['slotByPoint'] or {}).get(q, c['slot'])
            fam = fam_of(slot)
            ver = slot.split('@')[1] if '@' in slot else None
            mask = 1
            if q in c['pointsByTier']['medium']:
                mask |= 2
            if q in c['pointsByTier']['low']:
                mask |= 4
            sd = SLOTS[fam]
            events.append(dict(t=round(c['anchorShowS'] + off, 1), m=round(c['anchorMusicS'] + off, 1), g=c['group'],
                               p=int(q[1:]), slot=slot, kind=sd['kind'], size=sd['size'], hue=sd['hue'], cue=c['id'],
                               sec=c['section'], tier=mask, ord=c['order'], x=(c['macro'] or {}).get('name'),
                               rise=RISE_S.get(fam, 0.0), ver=ver, comp=(c['comp'] or {}).get('id'), layer=(c['comp'] or {}).get('layer')))
    events.sort(key=lambda e: (e['t'], e['g'], e['p']))
    energy = [dict(m=p['musicS'], db=p['rmsDb'], k=p['kick'], h=p['high']) for p in MUSIC['perSecond']]
    cues_pv = []
    for c in CUES:
        fam = fam_of(c['slot'])
        ps = []
        for q, off in c['pointOffsetsS'].items():
            mk = 1 | (2 if q in c['pointsByTier']['medium'] else 0) | (4 if q in c['pointsByTier']['low'] else 0)
            ps.append([int(q[1:]), off, mk])
        cues_pv.append(dict(id=c['id'], sec=c['section'], g=c['group'], slot=c['slot'], ord=c['order'], t=c['anchorShowS'],
                            span=c['spanS'], kind=SLOTS[fam]['kind'], hue=SLOTS[fam]['hue'], intent=c['intent'],
                            x=(c['macro'] or {}).get('name'), mid=(c['macro'] or {}).get('id'), gap=c['pointGapS'], src=c['anchorSource'], ps=ps,
                            comp=(c['comp'] or {}).get('id'), layer=(c['comp'] or {}).get('layer'), rise=c['tailPreviewRiseS']))
    order_counts = {}
    for c in CUES:
        if c['slot'] in FAN_FAMILY:
            mn = (c['macro'] or {}).get('name')
            key = ('对扫:' if mn == 'X' else '连扫:' if mn == 'ROW17' else '') + c['order']
            order_counts[key] = order_counts.get(key, 0) + 1
    preview = dict(version='候选A', offsetS=ARGS.offset, showDurationS=round(MUSIC_DUR + ARGS.offset, 1),
                   points={g: [dict(id=f'{g}{i}', x=XS[g][i]) for i in range(N[g])] for g in N},
                   sections=SECTIONS, anchors=ANCHORS, slots=SLOTS, energy=energy, events=events, cues=cues_pv,
                   conc=rep['并发(占位寿命)']['明细'], orderCounts=order_counts,
                   countdown=[dict(t=c['anchorShowS'], pts=c['pointsByTier']['high'], slot=c['slot']) for c in CUES if c['section'] == 'S0'],
                   comps=sorted({(c['comp']['id'], c['comp']['name']) for c in CUES if c['comp']}))
    (OUT / '预览展开.json').write_text(json.dumps(preview, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    with open(OUT / 'cue表.csv', 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow(['cue', '段落', '小节', '拍', '意图', '组', '槽位', '逐点槽位', '顺序', '点间隔s', '音乐s', '演出s', '跨度s', '锚点来源',
                    '贴靠kick', '高档点集', '中档点集', '低档点集', '对扫/连扫标记', '构图', '层', '占位升空s(示意)', '调用时间'])
        for c in CUES:
            sbp = ' '.join(f'{q}={s}' for q, s in (c['slotByPoint'] or {}).items()) if c['slot'] != 'FAN_GOLD' else '按位置取 CENTER/MID/OUTER'
            w.writerow([c['id'], c['section'], c['bar'], c['beat'], c['intent'], c['group'], c['slot'], sbp, c['order'], c['pointGapS'],
                        c['anchorMusicS'], c['anchorShowS'], c['spanS'], c['anchorSource'], c['snappedToKickS'] or '',
                        ' '.join(c['pointsByTier']['high']), ' '.join(c['pointsByTier']['medium']), ' '.join(c['pointsByTier']['low']),
                        (c['macro'] or {}).get('id', ''), (c['comp'] or {}).get('id', ''), LAYER_NAME.get((c['comp'] or {}).get('layer'), ''),
                        c['tailPreviewRiseS'], 'H−D（待绑定）'])
    (OUT / '检查报告.json').write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding='utf-8')

    # 预览页：模板 + 预览展开.json
    tpl = ROOT / 'analysis' / 'templates' / 'choreography-candidate-a.html'
    if tpl.exists():
        data = (OUT / '预览展开.json').read_text(encoding='utf-8')
        (OUT / '候选A动画.html').write_text(tpl.read_text(encoding='utf-8').replace('__PREVIEW_DATA__', data), encoding='utf-8')
    ok = not rep['_errors']
    print(f"cue {len(CUES)}，点次 {len(events)}，偏移 {ARGS.offset}，校验 {'通过' if ok else '有问题'}")
    for k, v in rep.items():
        if k.startswith('_'):
            continue
        if isinstance(v, dict) and 'ok' in v:
            print(('  ✅ ' if v['ok'] else '  ❌ ') + k, '' if v['ok'] else str(v.get('bad'))[:300])
    print('  段落密度', json.dumps(rep['段落密度(描述)'], ensure_ascii=False))
    print('  并发超过 10：', rep['并发(占位寿命)']['超过10的槽位'])
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
