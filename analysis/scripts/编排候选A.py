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
        slots=None, snap=True, lead=0.0, macro=None, cid=None, weight='support'):
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
    )
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


# ───────────────────────── 节目 ─────────────────────────
SECTIONS = []


def section(sid, name, role, bar_a, bar_b, note, music_a=None, music_b=None):
    ma = music_a if music_a is not None else raw_bar(bar_a)
    mb = music_b if music_b is not None else raw_bar(bar_b)
    SECTIONS.append(dict(id=sid, name=name, role=role, barStart=bar_a, barEnd=bar_b,
                         musicStartS=round(ma, 1), musicEndS=round(mb, 1),
                         showStartS=round(ma + ARGS.offset, 1), showEndS=round(mb + ARGS.offset, 1), note=note))


# S0 倒计时（演出时间锚点；音乐在倒计时 5 进入）
section('S0', '倒计时', '铺垫', 0, 3, '演出 0–10 s；音乐在倒计时 5 缓缓升起；0 点（演出 10.0 s）开花', music_a=-ARGS.offset, music_b=10 - ARGS.offset)
cdn = dict(sec='S0', group='F', order='ONE', gap=0.0, src=SRC_USER, weight='key')
cue(pts=[3], slot='F_COMET', show=2.0, intent='T-8 中心一发彗星：点火', **cdn)
cue(pts=[2, 4], slot='F_COMET', show=3.0, intent='T-7 向两侧扩一格', **cdn)
cue(pts=[1, 5], slot='F_COMET', show=4.0, intent='T-6 再扩', **cdn)
cue(pts=[0, 6], slot='F_COMET', show=5.0, intent='T-5 到边；音乐在此刻进入', **cdn)
cue(pts=[0, 6], slot='F_CRACKLE', show=6.0, intent='T-4 边上小爆裂：折返', **cdn)
cue(pts=[1, 5], slot='F_CRACKLE', show=7.0, intent='T-3 向中心收', **cdn)
cue(pts=[2, 4], slot='F_CRACKLE', show=8.0, intent='T-2 收', **cdn)
cue(pts=[3], slot='F_SILVER', show=9.0, intent='T-1 中心银菊：收到一点，留 1 秒静', **cdn)

# S1 开场（bars 3–9）
section('S1', '开场', '释放', 3, 10, '倒计时 0 点大开花，随后前台低位问答，坝顶小花隔小节出现，bar 9 一次小抬升')
cue('S1', 'P', 'M_GOLD', None, 'CO', 0.1, k=3, intent='0 点开花：金芒菊九点从中心向两侧排开', src=SRC_USER, snap=False, weight='key')
cue('S1', 'B', 'FAN_GOLD', None, 'CO', 0.1, k=3, lead=0.2, intent='扇形里→外，晚 0.2 s 跟在球花之后', snap=False, weight='key')
cue('S1', 'F', 'F_GOLD', None, 'CO', 0.1, k=3, lead=0.1, intent='前台小金花里→外回应', snap=False, weight='key')
cue('S1', 'F', 'F_COMET', None, 'LR', 0.2, k=4, intent='前台彗星左→右扫一遍（低位回应）')
cue('S1', 'F', 'F_COMET', None, 'RL', 0.2, k=5, intent='回扫，右→左')
cue('S1', 'P', 'S_SILVER', [3, 4, 5], 'CO', 0.2, k=6, intent='坝顶中间三点小银菊，第一次回到坝顶')
cue('S1', 'F', 'F_LIME', None, 'CO', 0.2, k=7, intent='前台青柠里→外')
cue('S1', 'P', 'S_LIME', [1, 4, 7], 'CO', 0.2, k=8, intent='坝顶三点小青柠，宽间距')
cue('S1', 'P', 'M_SILVER', None, 'CO', 0.1, k=9, intent='句尾小抬升：银白金芒菊九点')
cue('S1', 'B', 'FAN_SILVER13', None, 'CO', 0.2, k=9, beat=2, intent='首次银灰扇里→外，接在抬升之后')

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
cue('S3', 'P', 'S_SPLIT', None, 'CO', 0.1, k=21, intent='重音：金裂星九点', weight='key')
cue('S3', 'F', 'F_GOLD', None, 'CO', 0.1, k=21, lead=0.2, intent='前台跟一圈小金花')
cue('S3', 'F', 'F_LIME', None, 'OC', 0.2, k=22, intent='前台外→内')
cue('S3', 'P', 'S_LIME', [1, 4, 7], 'LR', 0.3, k=23, intent='三点小青柠左→右慢扫')
cue('S3', 'F', 'F_COMET', None, 'LR', 0.1, k=24, beat=2, intent='快速左→右一串，引到下一段')

# S4 推进 II（bars 25–32）
section('S4', '推进 II', '推进', 25, 33, '中号球花登场，金色扇形第一次沿坝顶左→右、右→左来回扫，bar 29 金芒菊九点，bar 32 收紧')
cue('S4', 'P', 'M_GOLD', [2, 4, 6], 'CO', 0.2, k=25, intent='中号三点起步')
cue('S4', 'F', 'F_GOLD', None, 'CO', 0.2, k=25, beat=2, intent='前台应答')
cue('S4', 'B', 'FAN_GOLD', None, 'LR', 0.2, k=26, intent='金扇第一次左→右扫过坝顶')
cue('S4', 'P', 'M_SILVER', [1, 3, 5, 7], 'LR', 0.2, k=27, intent='银白金芒菊四点左→右')
cue('S4', 'B', 'FAN_GOLD', None, 'RL', 0.2, k=28, intent='金扇右→左回扫')
cue('S4', 'P', 'M_GOLD', None, 'CO', 0.1, k=29, intent='金芒菊九点', weight='key')
cue('S4', 'F', 'F_SILVER', None, 'OC', 0.1, k=29, beat=2, intent='前台外→内')
xsweep('S4', 30, 0, 'FAN_RED5', 0.2, 'A', intent='红彗星扇对扫：P 排左→右 + B 排右→左')
cue('S4', 'P', 'M_MULTI', EVEN_P, 'OC', 0.2, k=31, beat=2, intent='多重菊五点外→内')
cue('S4', 'F', 'F_GOLD', None, 'OC', 0.1, k=32, intent='前台外→内收紧，下一小节释放')

# S5 高潮 I（bars 33–40）
section('S5', '高潮 I', '释放', 33, 41, '第一次大释放：金银交错的中号球花 + 银灰扇对扫往返；bar 40 大号银菊三点悬在随后的静里')
cue('S5', 'P', 'M_GOLD', None, 'CO', 0.1, k=33, slots=alt('M_GOLD', 'M_SILVER'), intent='高潮 I：金银交错九点里→外', weight='key')
xsweep('S5', 33, 2, 'FAN_SILVER13', 0.2, 'A', intent='银灰扇对扫，第一程')
cue('S5', 'F', 'F_SILVER', None, 'CO', 0.1, k=33, intent='前台银菊里→外')
xsweep('S5', 34, 2, 'FAN_SILVER13', 0.2, 'B', intent='银灰扇对扫，反向回程')
cue('S5', 'P', 'M_GREEN', EVEN_P, 'LR', 0.2, k=35, intent='金蕊青柠五点左→右')
cue('S5', 'F', 'F_LIME', None, 'RL', 0.2, k=35, beat=2, intent='前台反向回应')
cue('S5', 'P', 'M_MULTI', ODD_P, 'RL', 0.2, k=36, intent='多重菊四点右→左')
cue('S5', 'F', 'F_COMET', None, 'CO', 0.1, k=36, beat=2, intent='前台彗星里→外')
cue('S5', 'B', 'FAN_GOLD', None, 'CO', 0.2, k=37, intent='金扇里→外')
cue('S5', 'P', 'M_GOLD', [3, 4, 5], 'CO', 0.2, k=37, beat=2, intent='中间三点金芒菊')
cue('S5', 'B', 'FAN_GOLD', None, 'OC', 0.2, k=38, intent='金扇外→内（两头相向）')
cue('S5', 'P', 'M_SILVER', None, 'OC', 0.1, k=39, intent='银白金芒菊九点外→内', weight='key')
cue('S5', 'F', 'F_SILVER', None, 'OC', 0.1, k=39, intent='前台外→内')
cue('S5', 'P', 'L_SILVER', [1, 4, 7], 'CO', 0.2, k=40, intent='最强鼓点前的大号三点：收在静里', weight='key')

# S6 留白 II（bars 41–47）
section('S6', '留白 II', '留白', 41, 48, 'bar 41 能量骤降，第一小节什么都不放；之后前台与坝顶单发 / 小对，bar 46 一对中心扇形')
cue('S6', 'F', 'F_LIME', None, 'CO', 0.2, k=42, intent='前台青柠里→外，打破静')
cue('S6', 'P', 'S_LIME', [2, 6], 'CO', 0.1, k=44, intent='坝顶一对小青柠')
cue('S6', 'F', 'F_SILVER', [2, 4], 'CO', 0.1, k=44, beat=2, intent='前台一对')
cue('S6', 'B', 'FAN_GOLD', [3, 4], 'CO', 0.1, k=46, intent='中心一对金扇')
cue('S6', 'F', 'F_COMET', None, 'LR', 0.2, k=47, beat=2, intent='前台左→右 pickup')

# S7 推进 III（bars 48–59）
section('S7', '推进 III', '推进', 48, 60, '三个四小节：每四小节坝顶球花一次、扇形一次、前台一次，颜色与扫向轮换，bar 57 重音')
cue('S7', 'P', 'M_GOLD', ODD_P, 'CO', 0.2, k=48, intent='坝顶四点金芒菊')
cue('S7', 'F', 'F_GOLD', None, 'CO', 0.2, k=48, beat=2, intent='前台里→外')
cue('S7', 'B', 'FAN_RED5', None, 'LR', 0.2, k=49, intent='红彗星扇左→右')
cue('S7', 'P', 'M_GREEN', EVEN_P, 'RL', 0.2, k=50, intent='金蕊青柠五点右→左')
xsweep('S7', 51, 2, 'FAN_RED5', 0.2, 'B', intent='红彗星扇对扫：P 排右→左 + B 排左→右')
cue('S7', 'P', 'M_MULTI', None, 'CO', 0.1, k=52, intent='多重菊九点')
cue('S7', 'F', 'F_SILVER', None, 'CO', 0.1, k=52, beat=2, intent='前台里→外')
cue('S7', 'B', 'FAN_GOLD', None, 'LR', 0.2, k=53, beat=2, intent='金扇左→右')
cue('S7', 'P', 'S_SPLIT', [0, 2, 6, 8], 'OC', 0.2, k=54, intent='外侧四点金裂星')
xsweep('S7', 55, 2, 'FAN_GOLD', 0.2, 'B', intent='金扇对扫')
cue('S7', 'P', 'M_SILVER', ODD_P, 'LR', 0.2, k=56, intent='银白金芒菊四点左→右')
cue('S7', 'F', 'F_LIME', None, 'LR', 0.2, k=56, beat=2, intent='前台左→右')
cue('S7', 'P', 'M_GOLD', None, 'CO', 0.1, k=57, slots=alt('M_GOLD', 'M_GREEN'), intent='重音：金与金蕊青柠交错九点', weight='key')
cue('S7', 'B', 'FAN_GOLD', None, 'OC', 0.2, k=58, intent='金扇外→内，向中心收')
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
section('S9', '高潮 II', '释放', 66, 82, '用户给定 1:47 入口：大号金垂柳三点 + 金芒菊六点同时里→外；之后每四小节：球花 / 对扫 / 回应 / 收拢，bar 81 金墙收尾', )
cue('S9', 'P', 'M_GOLD', None, 'CO', 0.1, k=66, slots=lambda p: 'L_WILLOW' if p in (1, 4, 7) else 'M_GOLD',
    intent='高潮 II 入口（穿过风暴）：金垂柳 P1/P4/P7 + 金芒菊其余，里→外', src=SRC_USER_DET, weight='key')
cue('S9', 'B', 'FAN_GOLD', None, 'CO', 0.1, k=66, intent='扇形里→外', src=SRC_USER_DET, weight='key')
cue('S9', 'F', 'F_GOLD', None, 'CO', 0.1, k=66, lead=0.1, intent='前台小金花', src=SRC_USER_DET, weight='key')
xsweep('S9', 67, 0, 'FAN_GOLD', 0.2, 'A', intent='金扇对扫，第一程')
cue('S9', 'P', 'M_SILVER', None, 'OC', 0.1, k=68, intent='银白金芒菊九点外→内（收拢）')
cue('S9', 'F', 'F_SILVER', None, 'OC', 0.1, k=68, intent='前台外→内')
cue('S9', 'B', 'FAN_GOLD', None, 'LR', 0.2, k=68, beat=2, intent='金扇左→右')
cue('S9', 'P', 'M_MULTI', None, 'CO', 0.1, k=69, intent='多重菊九点')
cue('S9', 'F', 'F_LIME', None, 'CO', 0.1, k=69, beat=2, intent='前台里→外')
xsweep('S9', 70, 0, 'FAN_RED5', 0.2, 'B', intent='红彗星扇对扫：反向')
cue('S9', 'P', 'M_GOLD', None, 'OC', 0.1, k=71, slots=lambda p: 'L_SILVER' if p in (0, 8) else 'M_GOLD',
    intent='大号银菊在两翼 P0/P8，其余金芒菊，外→内', weight='key')
cue('S9', 'F', 'F_GOLD', None, 'OC', 0.1, k=71, intent='前台外→内')
cue('S9', 'B', 'FAN_RED5', None, 'RL', 0.1, k=72, intent='红彗星扇右→左快扫（0.7 s）')
cue('S9', 'P', 'M_GOLD', None, 'CO', 0.1, k=73, intent='高频峰：金芒菊九点', weight='key')
cue('S9', 'B', 'FAN_GOLD', None, 'CO', 0.1, k=73, lead=0.1, intent='扇形里→外')
cue('S9', 'F', 'F_GOLD', None, 'CO', 0.1, k=73, lead=0.1, intent='前台里→外')
cue('S9', 'F', 'F_SILVER', [2, 3, 4], 'CO', 0.2, k=74, intent='小回落：前台中间三点')
cue('S9', 'P', 'M_GREEN', EVEN_P, 'LR', 0.2, k=75, intent='金蕊青柠五点左→右')
cue('S9', 'P', 'M_SILVER', ODD_P, 'RL', 0.2, k=76, intent='银白金芒菊四点右→左')
cue('S9', 'F', 'F_LIME', None, 'LR', 0.2, k=76, beat=2, intent='前台左→右')
xsweep('S9', 77, 2, 'FAN_SILVER13', 0.2, 'A', intent='银灰扇对扫')
cue('S9', 'P', 'M_MULTI', None, 'OC', 0.1, k=78, intent='多重菊九点外→内')
cue('S9', 'F', 'F_CRACKLE', None, 'CO', 0.1, k=78, beat=2, intent='前台爆裂里→外')
cue('S9', 'P', 'L_SILVER', [2, 4, 6], 'CO', 0.2, k=79, intent='大号银菊三点')
cue('S9', 'B', 'FAN_GOLD', None, 'CO', 0.2, k=79, beat=2, intent='金扇里→外')
xsweep('S9', 80, 2, 'FAN_GOLD', 0.2, 'B', intent='金扇对扫：反向')
cue('S9', 'P', 'L_WILLOW', None, 'CO', 0.1, k=81, intent='金墙：金垂柳九点里→外，高潮 II 收尾', weight='key')
cue('S9', 'B', 'FAN_GOLD', None, 'CO', 0.1, k=81, lead=0.1, intent='扇形里→外', weight='key')
cue('S9', 'F', 'F_GOLD', None, 'CO', 0.1, k=81, lead=0.1, intent='前台里→外', weight='key')

# S10 转场（bars 82–100）
section('S10', '转场', '推进', 82, 101, '高潮后回落到中号球花；bar 86 与 bar 99 两处小静；bar 89 / 93 / 95 三个小峰逐步加高，最后在 bar 100 前台 pickup 引进终章')
cue('S10', 'F', 'F_SILVER', None, 'CO', 0.2, k=82, intent='回落：前台里→外')
cue('S10', 'B', 'FAN_GOLD', [3, 4], 'CO', 0.1, k=83, intent='中心一对金扇')
cue('S10', 'P', 'M_GREEN', [1, 4, 7], 'CO', 0.3, k=84, intent='金蕊青柠三点，宽间隔')
cue('S10', 'F', 'F_LIME', None, 'LR', 0.2, k=84, beat=2, intent='前台左→右')
cue('S10', 'P', 'M_GOLD', EVEN_P, 'CO', 0.2, k=85, intent='金芒菊五点里→外')
cue('S10', 'B', 'FAN_RED5', None, 'RL', 0.2, k=85, beat=2, intent='红彗星扇右→左')
cue('S10', 'F', 'F_COMET', [3], 'ONE', 0, k=86, intent='小静：一发中心彗星', weight='key')
cue('S10', 'P', 'M_SILVER', ODD_P, 'OC', 0.2, k=87, intent='银白金芒菊四点外→内')
cue('S10', 'F', 'F_SILVER', None, 'CO', 0.2, k=87, beat=2, intent='前台里→外')
xsweep('S10', 88, 0, 'FAN_GOLD', 0.2, 'A', intent='金扇对扫')
cue('S10', 'P', 'M_GOLD', None, 'CO', 0.1, k=89, slots=alt('M_GOLD', 'M_MULTI'), intent='小峰一：金芒菊与多重菊交错九点', weight='key')
cue('S10', 'F', 'F_GOLD', None, 'CO', 0.1, k=89, lead=0.1, intent='前台小金花')
cue('S10', 'B', 'FAN_GOLD', None, 'OC', 0.2, k=90, intent='金扇外→内（两头相向）')
cue('S10', 'F', 'F_COMET', None, 'RL', 0.2, k=90, beat=2, intent='前台右→左')
cue('S10', 'P', 'M_MULTI', EVEN_P, 'OC', 0.2, k=91, beat=2, intent='多重菊五点外→内')
xsweep('S10', 92, 2, 'FAN_SILVER13', 0.3, 'B', intent='银灰扇慢对扫（间隔 0.3 s）')
cue('S10', 'P', 'M_SILVER', None, 'CO', 0.1, k=93, intent='小峰二：银白金芒菊九点', weight='key')
cue('S10', 'F', 'F_SILVER', None, 'OC', 0.1, k=93, intent='前台外→内')
cue('S10', 'B', 'FAN_SILVER13', None, 'CO', 0.2, k=94, beat=2, intent='银灰扇里→外（接在慢对扫之后，同色）')
cue('S10', 'F', 'F_COMET', None, 'LR', 0.1, k=94, beat=3, intent='前台快速一串')
cue('S10', 'P', 'L_WILLOW', [2, 4, 6], 'CO', 0.2, k=95, intent='小峰三：大号金垂柳三点（高频峰）', weight='key')
cue('S10', 'B', 'FAN_GOLD', None, 'LR', 0.2, k=95, beat=2, intent='金扇左→右')
cue('S10', 'P', 'M_GOLD', EVEN_P, 'LR', 0.2, k=96, intent='金芒菊五点左→右')
cue('S10', 'F', 'F_GOLD', None, 'RL', 0.2, k=96, beat=2, intent='前台右→左')
cue('S10', 'P', 'M_GREEN', None, 'CO', 0.1, k=97, intent='金蕊青柠九点', weight='key')
xsweep('S10', 97, 2, 'FAN_GOLD', 0.2, 'A', intent='金扇对扫')
cue('S10', 'F', 'F_LIME', None, 'OC', 0.2, k=98, intent='前台外→内')
cue('S10', 'F', 'F_SILVER', [3], 'ONE', 0, k=99, intent='小静：一发中心银菊', weight='key')
cue('S10', 'F', 'F_COMET', None, 'LR', 0.1, k=100, beat=2, intent='pickup：前台快速一串')
cue('S10', 'P', 'S_SILVER', None, 'OC', 0.1, k=100, beat=3, intent='两头相向收拢，贴着终章入口', snap=False)

# S11 终章（bars 101–117）
section('S11', '终章', '释放', 101, 118, '全场最高能量；四个四小节，每段开头一堵墙（银 → 金 → 银 → 金），墙之间扇形对扫、中号球花、前台回应；最后三小节银墙三程（不同高度版本）')
cue('S11', 'P', 'L_SILVER', None, 'CO', 0.1, k=101, intent='终章入口：银墙九点里→外', weight='key')
cue('S11', 'B', 'FAN_GOLD', None, 'CO', 0.1, k=101, lead=0.1, intent='扇形里→外', weight='key')
cue('S11', 'F', 'F_SILVER', None, 'CO', 0.1, k=101, lead=0.1, intent='前台银菊', weight='key')
xsweep('S11', 102, 0, 'FAN_GOLD', 0.2, 'A', intent='金扇对扫')
cue('S11', 'P', 'M_GOLD', None, 'OC', 0.1, k=103, slots=alt('M_GOLD', 'M_SILVER'), intent='金银交错九点外→内')
cue('S11', 'F', 'F_GOLD', None, 'OC', 0.1, k=103, intent='前台外→内')
xsweep('S11', 104, 0, 'FAN_SILVER13', 0.2, 'B', intent='银灰扇对扫：反向')
cue('S11', 'F', 'F_COMET', None, 'LR', 0.1, k=104, beat=2, intent='前台快速一串')
cue('S11', 'P', 'L_WILLOW', None, 'CO', 0.1, k=105, intent='金墙九点里→外', weight='key')
cue('S11', 'B', 'FAN_SILVER13', None, 'OC', 0.1, k=105, lead=0.1, intent='银灰扇外→内（金墙配银扇，与上一程同色）', weight='key')
cue('S11', 'F', 'F_GOLD', None, 'CO', 0.1, k=105, lead=0.1, intent='前台里→外')
cue('S11', 'B', 'FAN_RED5', None, 'LR', 0.2, k=106, intent='红彗星扇左→右')
cue('S11', 'F', 'F_SILVER', None, 'RL', 0.2, k=106, beat=2, intent='前台右→左')
cue('S11', 'P', 'M_MULTI', None, 'CO', 0.1, k=107, intent='多重菊九点')
cue('S11', 'F', 'F_LIME', None, 'CO', 0.1, k=107, beat=2, intent='前台里→外')
xsweep('S11', 108, 0, 'FAN_GOLD', 0.2, 'A', intent='金扇对扫')
cue('S11', 'F', 'F_COMET', None, 'RL', 0.1, k=108, beat=2, intent='前台快速一串')
cue('S11', 'P', 'L_SILVER', None, 'OC', 0.1, k=109, intent='银墙九点外→内（收拢）', weight='key')
cue('S11', 'B', 'FAN_GOLD', None, 'CO', 0.1, k=109, lead=0.1, intent='金扇里→外（接在金扇对扫之后，同色）', weight='key')
cue('S11', 'P', 'M_GREEN', None, 'CO', 0.1, k=110, slots=alt('M_GREEN', 'M_GOLD'), intent='金蕊青柠与金芒菊交错')
cue('S11', 'F', 'F_LIME', None, 'OC', 0.2, k=110, beat=2, intent='前台外→内')
xsweep('S11', 111, 0, 'FAN_RED5', 0.2, 'B', intent='红彗星扇对扫：反向')
cue('S11', 'P', 'S_SPLIT', None, 'LR', 0.1, k=112, beat=2, intent='金裂星九点快速左→右（0.8 s 扫完）')
cue('S11', 'F', 'F_CRACKLE', None, 'CO', 0.1, k=112, beat=2, intent='前台爆裂里→外')
cue('S11', 'P', 'L_WILLOW', None, 'CO', 0.1, k=113, intent='金墙九点', weight='key')
cue('S11', 'B', 'FAN_GOLD', None, 'CO', 0.1, k=113, lead=0.1, intent='扇形里→外', weight='key')
cue('S11', 'F', 'F_GOLD', None, 'CO', 0.1, k=113, lead=0.1, intent='前台')
cue('S11', 'F', 'F_SILVER', None, 'OC', 0.1, k=114, intent='小凹：只留前台外→内（能量略落）')
cue('S11', 'P', 'L_SILVER', None, 'CO', 0.1, k=115, intent='银墙第一程（低版本）', weight='key')
cue('S11', 'P', 'L_SILVER', None, 'OC', 0.1, k=116, intent='银墙第二程（中版本）外→内', weight='key')
cue('S11', 'B', 'FAN_GOLD', None, 'LR', 0.1, k=116, beat=2, intent='金扇快速左→右 0.7 s')
cue('S11', 'P', 'L_SILVER', None, 'CO', 0.1, k=117, intent='银墙第三程（高版本）', weight='key')
cue('S11', 'B', 'FAN_GOLD', None, 'RL', 0.1, k=117, beat=2, intent='金扇快速右→左 0.7 s')
cue('S11', 'F', 'F_SILVER', None, 'CO', 0.1, k=117, intent='前台银菊')

# S12 收束（bars 118–128）
section('S12', '收束', '收束', 118, 126, '终章能量降下来的一刻放最后的金墙（拉宽到 0.2 s 一格，像落雨）；之后越来越疏，bar 124 中心一发收尾；bar 125 起淡出')
cue('S12', 'P', 'L_WILLOW', None, 'CO', 0.2, k=118, intent='最后的金墙：金垂柳九点，间隔拉宽', weight='key')
cue('S12', 'B', 'FAN_GOLD', None, 'CO', 0.2, k=118, intent='扇形里→外，间隔拉宽', weight='key')
cue('S12', 'F', 'F_GOLD', None, 'CO', 0.2, k=118, intent='前台里→外', weight='key')
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
            fam = slot.split('/')[0]
            ev.append((c['anchorMusicS'] + off, fam, SLOTS[fam]['size']))
    # 并发：按槽位家族；金锦冠扇形另按位置版本（CENTER/MID/OUTER）拆开估计
    ev2 = []
    for c in CUES:
        for q, off in c['pointOffsetsS'].items():
            slot = (c['slotByPoint'] or {}).get(q, c['slot'])
            ev2.append((c['anchorMusicS'] + off, slot))
    conc = {}
    keys = set(slot for _, slot in ev2) | set(slot.split('/')[0] for _, slot in ev2)
    for key in sorted(keys):
        fam = key.split('/')[0]
        pts = sorted(t for t, sl in ev2 if sl == key or (sl.split('/')[0] == key))
        if not pts:
            continue
        life = LIFE_S[SLOTS[fam]['size']]
        mx = max(sum(1 for u in pts if t - 1e-9 <= u < t + life) for t in pts)
        conc[key] = {'最多同时在场': mx, '占位寿命s': life, '按限额10需要的版本数': -(-mx // 10)}
    over = [f for f, v in conc.items() if v['最多同时在场'] > 10 and '/' not in f]
    rep['并发(占位寿命)'] = dict(ok=True, 超过10的槽位=over, 明细=conc,
                              说明='寿命是占位估值，限额作用域也未实测；只用来提示该拆版本，不当结论')

    # 11) 段落密度（点次/小节），只描述
    dens = {}
    for sec in SECTIONS:
        n = sum(len(c['pointsByTier']['high']) for c in CUES if c['section'] == sec['id'])
        bars = max(1, sec['barEnd'] - sec['barStart'])
        dens[sec['id']] = dict(cue=sum(1 for c in CUES if c['section'] == sec['id']), 点次=n, 小节=bars, 点次每小节=round(n / bars, 1))
    rep['段落密度(描述)'] = dens

    # 12) 倒计时
    cd = [c for c in CUES if c['section'] == 'S0']
    rep['倒计时'] = dict(ok=all(is_tenth(c['anchorShowS']) and c['anchorShowS'] == int(c['anchorShowS']) for c in cd)
                      and any(c['section'] == 'S1' and c['anchorShowS'] == 10.0 for c in CUES),
                      cue=len(cd), 开花演出时间=10.0)
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

    proposal = dict(
        format='df.choreography-proposal/1',
        status='draft_requires_local_recipe_and_audio_validation',
        candidate='A',
        title='《汪洋与浩渺》跨年烟花秀 · 候选 A',
        generatedBy='analysis/scripts/编排候选A.py',
        pointNumbering=0,
        musicOffsetS=ARGS.offset,
        musicOffsetNote='候选取 5：倒计时 5 时音乐进入，0 点落在音乐 5.0 s（第 3 小节强拍）。旧规范是 10（showTime = musicTime + 10，音乐在 0 点才开始）。待用户确认，改偏移只需重跑生成器。',
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
            fam = slot.split('/')[0]
            mask = 1
            if q in c['pointsByTier']['medium']:
                mask |= 2
            if q in c['pointsByTier']['low']:
                mask |= 4
            sd = SLOTS[fam]
            events.append(dict(t=round(c['anchorShowS'] + off, 1), m=round(c['anchorMusicS'] + off, 1), g=c['group'],
                               p=int(q[1:]), slot=slot, kind=sd['kind'], size=sd['size'], hue=sd['hue'], cue=c['id'],
                               sec=c['section'], tier=mask, ord=c['order'], x=(c['macro'] or {}).get('name')))
    events.sort(key=lambda e: (e['t'], e['g'], e['p']))
    energy = [dict(m=p['musicS'], db=p['rmsDb'], k=p['kick'], h=p['high']) for p in MUSIC['perSecond']]
    cues_pv = []
    for c in CUES:
        fam = c['slot'].split('/')[0]
        ps = []
        for q, off in c['pointOffsetsS'].items():
            mk = 1 | (2 if q in c['pointsByTier']['medium'] else 0) | (4 if q in c['pointsByTier']['low'] else 0)
            ps.append([int(q[1:]), off, mk])
        cues_pv.append(dict(id=c['id'], sec=c['section'], g=c['group'], slot=c['slot'], ord=c['order'], t=c['anchorShowS'],
                            span=c['spanS'], kind=SLOTS[fam]['kind'], hue=SLOTS[fam]['hue'], intent=c['intent'],
                            x=(c['macro'] or {}).get('name'), gap=c['pointGapS'], src=c['anchorSource'], ps=ps))
    order_counts = {}
    for c in CUES:
        if c['slot'] in FAN_FAMILY:
            key = ('对扫:' if c['macro'] else '') + c['order']
            order_counts[key] = order_counts.get(key, 0) + 1
    preview = dict(version='候选A', offsetS=ARGS.offset, showDurationS=round(MUSIC_DUR + ARGS.offset, 1),
                   points={g: [dict(id=f'{g}{i}', x=XS[g][i]) for i in range(N[g])] for g in N},
                   sections=SECTIONS, anchors=ANCHORS, slots=SLOTS, energy=energy, events=events, cues=cues_pv,
                   conc=rep['并发(占位寿命)']['明细'], orderCounts=order_counts,
                   countdown=[dict(t=c['anchorShowS'], pts=c['pointsByTier']['high'], slot=c['slot']) for c in CUES if c['section'] == 'S0'])
    (OUT / '预览展开.json').write_text(json.dumps(preview, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    with open(OUT / 'cue表.csv', 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow(['cue', '段落', '小节', '拍', '意图', '组', '槽位', '逐点槽位', '顺序', '点间隔s', '音乐s', '演出s', '跨度s', '锚点来源',
                    '贴靠kick', '高档点集', '中档点集', '低档点集', '对扫标记'])
        for c in CUES:
            sbp = ' '.join(f'{q}={s}' for q, s in (c['slotByPoint'] or {}).items()) if c['slot'] != 'FAN_GOLD' else '按位置取 CENTER/MID/OUTER'
            w.writerow([c['id'], c['section'], c['bar'], c['beat'], c['intent'], c['group'], c['slot'], sbp, c['order'], c['pointGapS'],
                        c['anchorMusicS'], c['anchorShowS'], c['spanS'], c['anchorSource'], c['snappedToKickS'] or '',
                        ' '.join(c['pointsByTier']['high']), ' '.join(c['pointsByTier']['medium']), ' '.join(c['pointsByTier']['low']),
                        (c['macro'] or {}).get('id', '')])
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
