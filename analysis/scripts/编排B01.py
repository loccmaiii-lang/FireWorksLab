#!/usr/bin/env python3
"""编排 B01（对话框22，2026-10-11）：按长冈排布逻辑，用我们的音乐小节重新排的整场逻辑方案。

输入  FXtools/节目/NewYearFireWorks_v01/…R04….dfshow   取点位、20 个基础资源对应的 22 个固定子模板（不改）、音乐
      analysis/music/汪洋与浩渺_高潮分析.json           逐小节响度 / 起音 / 鼓点
输出  协作/编排B01/逻辑方案.json      每个 cue（片段）：花型、点位、每点开花时刻 / 高度偏移、三档点集，给 编排B01_编译.mjs
      协作/编排B01/体检.json          对拍、同屏代数、接力、领奏、GPU 发射器 / 秒、三档数量
      协作/编排B01/总览.png、关键时刻.png   示意图（不是 UE 回放）
用法  python3 -I analysis/scripts/编排B01.py [--density 2]

排布规则（长冈 8 张截图 + 我们的音乐，详见 协作/编排B01_长冈式.md 第 1 节）：
  R1 一波 = 一整排（P0–P8 九点，或 P+B 十七点）同族花在 ≤0.4 s 内连成一带；R2 每波开花时下一波尾缀已在升（同屏三代）；
  R3 叠层：顶排大、二排小而低（B 点），底下铺扇形；R4 过渡 = 小中花 A / B 间隔，一点一发；
  R5 每段 A 领 / B 接 / C 插，同种不连续超过 2 波（墙除外），每种花都有一次领奏；
  R6 段落入口给一波最大的，随后 1–2 波余波；进入新大段前留一小节空（只剩尾缀升）；R7 强度靠 S→M→L 台阶，终章 L 墙（金→白）。
"""
import argparse
import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTDIR = ROOT / '协作/编排B01'
BASE = ROOT / 'FXtools/节目/NewYearFireWorks_v01/NewYearFireWorks_v01-R04时间规范修正.dfshow'
MUSIC = ROOT / 'analysis/music/汪洋与浩渺_高潮分析.json'
CACHE = ROOT / 'analysis/music/.base_cache_B01.json'

BAR0, BAR = 5.18, 1.6216           # 小节 k 起点 = 5.18 + 1.6216 k（演出秒，偏移 +5）
OFFSET = 5.0
GRID = 0.1
GPU_BUDGET = 200                    # 同一秒新起的 GPU 发射器：软上限（暂定）；
GPU_HARD = 234                      # 硬上限 = 24 实测干净的最大值（78 束 × 3 = 234 无截断，104 束 = 312 大量截断）


def T(bar, beat=0.0):
    return BAR0 + BAR * bar + beat * BAR / 4


def q1(x):
    return round(round(x / GRID) * GRID, 6)


# ———— 基础库（只读 R04 节目里的 22 个固定子模板和点位） ————
def load_base():
    if CACHE.exists() and CACHE.stat().st_mtime > BASE.stat().st_mtime:
        return json.loads(CACHE.read_text(encoding='utf-8'))
    d = json.loads(BASE.read_text(encoding='utf-8'))
    doc = d['payload']['doc']
    base = {
        'points': [{k: p[k] for k in ('id', 'x', 'y', 'z', 'zone', 'yaw')} for p in doc['points']],
        'templates': {t['id']: {k: t.get(k) for k in ('id', 'name', 'kind', 'diameter', 'burstZ', 'flightHeight', 'rise', 'life', 'recipeDuration', 'subTemplateRef', 'color', 'shape')} for t in doc['templateLibrary']},
        'subs': {s['key']: {'category': s['category'], 'entries': [{'res': e['native']['FXResourceId'], 'off': e['native']['LocalTimeOffset'], 'roll': e['native']['RotationOffset']['Roll']} for e in s['entries']]} for s in doc['subTemplateLibrary']},
    }
    CACHE.write_text(json.dumps(base, ensure_ascii=False), encoding='utf-8')
    return base


BASEJ = load_base()
PT = {p['id']: p for p in BASEJ['points']}
TPL = BASEJ['templates']
SUB = BASEJ['subs']
P9 = [f'P{i}' for i in range(9)]
B8 = [f'B{i}' for i in range(8)]

# ———— 花型缩写 → R03 花型（22 个固定子模板之一）；GPU 发射器数来自 24 的 资源发射器数.json（LOD0 启用） ————
SPECIES = {
    # S 90 m（尾缀 GPU 6）
    'SC': ('R03_SilverChry', '小银菊', 'S', '#d9e2f2', 0),
    'GC': ('R03_GoldCrackle', '金裂星', 'S', '#f0c24a', 2),
    'CR': ('R03_Crackle', '爆裂星', 'S', '#f4e4b0', 0),
    'LM': ('R03_Lime', '小青柠', 'S', '#7fd16a', 1),
    'OG': ('R03_OrangeGlitter', '橙辉星', 'S', '#f19a4a', 0),
    'ST': ('R03_Strobe', '点灭星', 'S', '#ffffff', 5),
    # M 150 m（尾缀 GPU 2）
    'GP': ('R03_GreenPeony', '绿牡丹', 'M', '#59c46e', 1),
    'GS': ('R03_GoldSpark', '金锦菊', 'M', '#f3c540', 0),
    'PW': ('R03_PrismWheels', '彩千轮', 'M', '#d36ad6', 1),
    'GY': ('R03_GoldChry', '金曜菊', 'M', '#f0b429', 2),
    'CL': ('R03_GoldCoreLime', '金蕊青柠星', 'M', '#c9d94a', 0),
    'GR': ('R03_GoldRayChry', '金芒菊', 'M', '#f7d26b', 0),
    'ML': ('R03_MultiLayerChry', '多重菊', 'M', '#e28a5b', 1),
    # L 230 m（尾缀 GPU 6）
    'GK': ('R03_GoldKamuro', '金垂柳', 'L', '#e8b94a', 0),
    'SS': ('R03_SilverStrobeChry', '银彩菊', 'L', '#e8eefc', 0),
    # 扇形（B 点）
    'R1': ('R03_Red1', '红彗星·单束', 'F', '#e8695a', 0),
    'R5': ('R03_Red5', '红彗星·五束', 'F', '#e8695a', 0),
    'R9': ('R03_Red9', '红彗星·九束左扫', 'F', '#e8695a', 0),
    'R9R': ('R03_Red9R', '红彗星·九束右扫', 'F', '#e8695a', 0),
    'S5': ('R03_Silver5', '银星·五束窄扇', 'F', '#aab8d8', 0),
    'S9': ('R03_Silver9', '银星·九束展开', 'F', '#aab8d8', 0),
    'S13': ('R03_Silver13', '银星·十三束宽扇', 'F', '#aab8d8', 0),
}
TID2SP = {v[0]: k for k, v in SPECIES.items()}
FAN_PTS = {'S5': ['B1', 'B3', 'B4', 'B6'], 'S9': ['B1', 'B3', 'B4', 'B6'], 'S13': ['B3', 'B4']}
TAIL_GPU = {'S': 6, 'M': 2, 'L': 6}
BEAM_GPU = {'R': 1, 'S': 3}          # 红彗星 FanComet 1 / 束，银扇 FanSilver 3 / 束
REL_H = {'S': 190.08, 'M': 265.12, 'L': 410.21}   # 资源自带的开花高度（相对发射点）；目标 150 / 210 / 330，见说明


def rise_of(sp):
    return TPL[SPECIES[sp][0]]['rise'] or 0.0


def life_of(sp):
    return TPL[SPECIES[sp][0]]['life'] or 0.0


def size_of(sp):
    return SPECIES[sp][2]


def fan_beams(sp):
    return SUB[TPL[SPECIES[sp][0]]['subTemplateRef']]['entries']


def px(pid):
    return PT[pid]['x']


# ———— 点位次序 ————
def ranks(pts, order):
    if order == 'together':
        return {p: 0 for p in pts}
    xs = sorted(pts, key=px)
    if order == 'L':
        return {p: i for i, p in enumerate(xs)}
    if order == 'R':
        return {p: i for i, p in enumerate(reversed(xs))}
    dist = sorted({round(abs(px(p))) for p in pts})
    if order == 'out':
        return {p: dist.index(round(abs(px(p)))) for p in pts}
    if order == 'in':
        return {p: len(dist) - 1 - dist.index(round(abs(px(p)))) for p in pts}
    raise ValueError(order)


WB_ORDER = {'together': 'together', 'L': 'left', 'R': 'right', 'out': 'center-out', 'in': 'outside-in'}


def dz_pattern(pts, name, amp=25.0):
    xs = sorted(pts, key=px)
    n = len(xs)
    out = {}
    for i, p in enumerate(xs):
        if name in (None, 'flat', 0):
            v = 0.0
        elif name == 'arch':            # 中间高两头低
            v = amp * math.cos(px(p) / 375.0 * math.pi / 2) - amp * 0.35
        elif name == 'valley':
            v = -(amp * math.cos(px(p) / 375.0 * math.pi / 2) - amp * 0.35)
        elif name == 'wave':            # 起伏 ±amp（长冈 1:20 环形排）
            v = amp * math.sin(i / max(1, n - 1) * 2.5 * math.pi)
        elif name == 'zigU':
            v = amp
        elif name == 'zigD':
            v = -amp
        elif name == 'stairL':          # 从左到右慢慢抬
            v = amp * (i / max(1, n - 1) * 2 - 1)
        elif name == 'stairR':
            v = -amp * (i / max(1, n - 1) * 2 - 1)
        else:
            raise ValueError(name)
        out[p] = round(max(-30.0, min(30.0, v)), 1)
    return out


# ———— 演出容器 ————
class Show:
    def __init__(self, density=2):
        self.cues = []
        self.sections = []
        self.density = density
        self.cur = None

    def section(self, sid, name, bar0, bar1, lead, relay, accent, note=''):
        s = dict(id=sid, name=name, bar0=bar0, bar1=bar1, start=round(T(bar0), 3), end=round(T(bar1), 3), lead=lead, relay=relay, accent=accent, note=note)
        self.sections.append(s)
        self.cur = s
        return s

    def cue(self, sp, pts, H0, order='together', gap=0.0, dz=None, layer='main', tier='trim', label='', amp=25.0, keep_all=False, wave=None):
        """一个 cue = 一种花型 + 一组点 + 每点开花时刻 H = H0 + rank*gap。
        layer: main 主排 / extra 叠层（低档先去掉）；tier: all 三档都全点 / trim 中档去外两点、低档隔点"""
        tid, cn, size, col, gpu_body = SPECIES[sp]
        pts = [p for p in pts]
        if sp in FAN_PTS:   # 银扇每束 3 个 GPU 发射器，整排 8 把会爆预算：限制点位（24 实测 234 干净 / 312 截断）
            pts = [p for p in pts if p in FAN_PTS[sp]] or list(FAN_PTS[sp])
        rk = ranks(pts, order)
        dzm = dz_pattern(pts, dz, amp) if not isinstance(dz, dict) else dz
        rise = rise_of(sp)
        events = []
        for p in sorted(pts, key=px):
            H = H0 + rk[p] * gap
            launch = q1(H - rise)
            if launch < 0:
                launch = 0.0
            burst = round(launch + rise, 6)
            events.append(dict(point=p, launch=launch, burst=burst, end=round(burst + life_of(sp), 6), dz=dzm.get(p, 0.0), H=round(H, 4)))
        cid = f'B01_C{len(self.cues) + 1:03d}'
        c = dict(id=cid, section=self.cur['id'], sp=sp, templateId=tid, size=size, group=pts[0][0], points=[e['point'] for e in events],
                 order=WB_ORDER[order] if order in WB_ORDER else 'source', gap=gap, layer=layer, tier='all' if keep_all else tier,
                 label=label or cn, name=f"{self.cur['name']} · {label or cn}", wave=wave, events=events, H0=round(H0, 4))
        c['profiles'] = tier_points(c)
        self.cues.append(c)
        return c

    # —— 几种波（词汇） ——
    def row9(self, sp, H0, order='out', gap=0.1, dz='flat', **kw):
        return [self.cue(sp, P9, H0, order, gap, dz, wave='整排9', **kw)]

    def zig17(self, spP, spB, H0, order='out', gap=0.1, amp=25.0, **kw):
        """P 点一种、点间 B 点另一种，一点一发；P 点略高、B 点略低（B 点用 S 90 暂代 ⌀50 小花）"""
        a = self.cue(spP, P9, H0, order, gap, 'zigU', amp=amp, wave='A/B间隔17', **kw)
        b = self.cue(spB, B8, H0, order, gap, 'zigD', amp=amp, wave='A/B间隔17', **kw)
        return [a, b]

    def stack(self, spTop, spUnder, H0, order='out', gap=0.1, dz='arch', under_delay=0.4, fan=None, fan_H=0.0, **kw):
        out = [self.cue(spTop, P9, H0, order, gap, dz, wave='叠层', **kw)]
        out.append(self.cue(spUnder, B8, H0 + under_delay, order, gap, 'flat', layer='extra', wave='叠层二排'))
        if fan:
            out.append(self.cue(fan, B8, H0 + fan_H, order, gap, None, layer='extra', wave='扇形铺底'))
        return out

    def castle(self, spL, spM, H0, order='out', gap=0.1, dz='flat', **kw):
        evens = [f'P{i}' for i in (0, 2, 4, 6, 8)]
        odds = [f'P{i}' for i in (1, 3, 5, 7)]
        return [self.cue(spL, evens, H0, order, gap, dz, wave='城垛L', **kw), self.cue(spM, odds, H0, order, gap, dz, wave='城垛M', **kw)]

    def low8(self, sp, H0, order='out', gap=0.1, dz='flat', **kw):
        return [self.cue(sp, B8, H0, order, gap, dz, wave='低位8', **kw)]

    def fans(self, sp, pts, H0, order='out', gap=0.1, **kw):
        kw.setdefault('layer', 'extra')
        return [self.cue(sp, pts, H0, order, gap, None, wave='扇形', **kw)]


def tier_points(c):
    """三档点集：高 = 全部；中 = 去最外两点；低 = 以中心点为准隔点留；叠层（extra）低档不出。
    all = 入口 / 主角 / 倒计时，三档全点。"""
    xs = sorted(c['points'], key=px)
    if c['tier'] == 'all' or len(xs) <= 2:
        return {'medium': xs[:], 'low': xs[:]}
    med = xs[1:-1] if len(xs) >= 6 else xs[:]
    ci = min(range(len(xs)), key=lambda i: abs(px(xs[i])))
    low = [p for i, p in enumerate(xs) if (i - ci) % 2 == 0]
    if c['layer'] == 'extra':
        low = []
    return {'medium': med, 'low': low}


# ═══════════════════════════ 曲谱：按我们这首歌的小节排 ═══════════════════════════
def build(density=2):
    S = Show(density)
    d = density
    h = lambda bar, beat=0: T(bar, beat)

    # —— 0 倒计时 0–10（用户 10-09：烟花倒计时，P0+P8 起每秒一对往里；0 点从 P4 向外） ——
    S.section('B01_S0', '倒计时', 0, 3, 'SC', 'R1', 'S5', '前 4 秒红彗星单束从两端往里（B0+B7 → B3+B4），随后小银菊从 P0+P8 起每秒一对往里到 P4，第 9 秒银扇预告，0 点（10.0 s）从 P4 向外绽放')
    for i, (a, b) in enumerate([('B0', 'B7'), ('B1', 'B6'), ('B2', 'B5'), ('B3', 'B4')]):
        S.cue('R1', [a, b], float(i), 'together', 0.0, None, tier='all', label=f'倒计时红彗星 {10 - i}', wave='倒计时')
    for i, pr in enumerate([('P0', 'P8'), ('P1', 'P7'), ('P2', 'P6'), ('P3', 'P5'), ('P4',)]):
        S.cue('SC', list(pr), float(4 + i), 'together', 0.0, None, tier='all', label=f'倒计时小银菊 {6 - i}', wave='倒计时')
    S.cue('S5', ['B3', 'B4'], 9.0, 'together', 0.0, None, tier='all', layer='main', label='倒计时银扇 1', wave='倒计时')

    # —— 1 开场高潮 b3–b8（长冈 0:22→0:25：预告再整排高潮） ——
    S.section('B01_S1', '开场高潮', 3, 9, 'GR', 'SC', 'ST', '10.0 s 整排叠层高潮：顶排金芒菊 M×9 + 二排小银菊 S×8（B 点，低 75 m）+ 银扇铺底；随后一小节一波，小银菊 / 红彗星 / 点灭星接力')
    S.stack('GR', 'SC', h(3), 'out', 0.1, 'arch', 0.4, fan='S5', fan_H=0.0, keep_all=True)
    S.row9('SC', h(4), 'L', 0.2, 'wave')
    S.fans('R9', B8, h(5), 'L', 0.2)
    if d >= 2:
        S.row9('GC', h(5, 2), 'out', 0.1, 'flat')
    S.row9('GR', h(6), 'out', 0.1, 'arch')
    S.zig17('SC', 'ST', h(7), 'out', 0.1)
    S.stack('GS', 'SC', h(8), 'out', 0.1, 'arch', 0.4, fan='S5', fan_H=0.0)

    # —— 2 连续展开 b9–b16（长冈 1:20 环形排：金环 + 色芯，高低起伏 ±30 m） ——
    S.section('B01_S2', '连续展开', 9, 17, 'GY', 'LM', 'CL', '金曜菊领；③ 环形排 26.0 s：金曜菊与金蕊青柠星隔点交替成一圈、高低起伏 ±25 m、银扇铺底；小青柠低排接力')
    S.row9('GY', h(9), 'out', 0.1, 'arch')
    S.low8('LM', h(10), 'L', 0.2)
    S.row9('GY', h(11), 'in', 0.1, 'arch')
    if d >= 2:
        S.row9('SC', h(11, 2), 'out', 0.1, 'flat')
    S.zig17('LM', 'SC', h(12), 'out', 0.1)
    # ③ 环形排
    evens = [f'P{i}' for i in (0, 2, 4, 6, 8)]
    odds = [f'P{i}' for i in (1, 3, 5, 7)]
    ring_dz = dz_pattern(P9, 'wave', 25.0)
    S.cue('GY', evens, h(13), 'out', 0.1, {p: ring_dz[p] for p in evens}, wave='环形排', tier='all')
    S.cue('CL', odds, h(13), 'out', 0.1, {p: ring_dz[p] for p in odds}, wave='环形排色芯', tier='all')
    S.fans('S5', B8, h(13), 'out', 0.1)
    S.low8('OG', h(14), 'R', 0.2)
    S.row9('CL', h(15), 'out', 0.1, 'valley')
    S.stack('GY', 'LM', h(16), 'out', 0.1, 'arch', 0.4, fan='R5', fan_H=0.0)

    # —— 3 密集问答 b17–b24（长冈 2:14：17 点一点一发，A / B 间隔；问答 = 左半 / 右半） ——
    S.section('B01_S3', '密集问答', 17, 25, 'SC', 'GS', 'OG', '小银菊领 17 点一点一发，金锦菊接，橙辉星 / 小青柠 / 绿牡丹插；左半问右半答')
    S.zig17('SC', 'OG', h(17), 'out', 0.1)
    left = [f'P{i}' for i in range(5)]
    right = [f'P{i}' for i in range(5, 9)]
    S.cue('GS', left, h(18), 'L', 0.1, 'stairL', wave='问', label='金锦菊·问（左半）', amp=20.0)
    S.cue('GS', right, h(18, 2), 'L', 0.1, 'stairL', wave='答', label='金锦菊·答（右半）', amp=20.0)
    S.zig17('SC', 'LM', h(19), 'out', 0.1)
    S.row9('GS', h(20), 'out', 0.1, 'arch')
    S.low8('OG', h(20, 2), 'out', 0.1)
    S.zig17('SC', 'ST', h(21), 'out', 0.1)
    S.row9('GP', h(22), 'together', 0.0, 'wave')
    S.zig17('SC', 'OG', h(23), 'out', 0.1)
    S.stack('GS', 'SC', h(24), 'out', 0.1, 'arch', 0.4, fan='R5', fan_H=0.0)

    # —— 4 往返扫射 b25–b32（长冈 4:11：自左向右一格格开；红彗星 / 银扇对扫） ——
    S.section('B01_S4', '往返扫射', 25, 33, 'GR', 'GS', 'SC', '金芒菊整排左→右扫（0.3 s / 点）④ 50.6 s 右→左回扫；红彗星 / 银扇在 B 排来回追')
    S.fans('R9', B8, h(25), 'L', 0.2)
    S.row9('GR', h(26), 'L', 0.3, 'arch')
    S.low8('SC', h(26) + 0.3, 'L', 0.3, layer='extra')
    S.fans('S9', B8, h(27), 'R', 0.2)
    S.row9('GR', h(28), 'R', 0.3, 'arch', keep_all=True)
    S.low8('GC', h(28) + 0.3, 'R', 0.3, layer='extra')
    S.fans('S9', B8, h(28), 'R', 0.2)
    S.row9('SC', h(29), 'out', 0.1, 'flat')
    S.low8('LM', h(29, 2), 'in', 0.1)
    S.row9('GS', h(30), 'L', 0.3, 'arch')
    S.low8('LM', h(30) + 0.3, 'L', 0.3, layer='extra')
    S.zig17('GS', 'SC', h(31), 'out', 0.1)
    S.fans('S5', B8, h(32), 'out', 0.1)

    # —— 5 第一次抬升 + 高潮 I b33–b40（⑤ 城垛：L 五点 + M 四点） ——
    S.section('B01_S5', '第一次抬升', 33, 41, 'SS', 'GS', 'ML', '银彩菊领：⑤ 58.7 s 城垛 L×5 + M×4；高潮 I（60.3–71.7）每小节叠层、墙、扫交替')
    S.castle('SS', 'GR', h(33), 'out', 0.1, 'flat', keep_all=True)
    S.fans('S5', B8, h(33), 'out', 0.1)
    S.stack('GS', 'SC', h(34), 'out', 0.1, 'arch', 0.4, fan='R5', fan_H=0.0, keep_all=True)
    S.zig17('ML', 'ST', h(35), 'out', 0.1)
    S.row9('GS', h(36), 'out', 0.1, 'arch')
    S.fans('S9', B8, h(36), 'out', 0.1)
    if d >= 2:
        S.low8('CR', h(36, 2), 'out', 0.1)
    S.castle('SS', 'ML', h(37), 'out', 0.1, 'flat')
    S.row9('GR', h(38), 'L', 0.2, 'arch')
    S.row9('SS', h(39), 'out', 0.1, 'flat', keep_all=True)
    S.castle('SS', 'GR', h(40), 'out', 0.1, 'flat', keep_all=True)
    S.low8('SC', h(40), 'out', 0.1, layer='extra')
    S.fans('S5', B8, h(40), 'out', 0.1)

    # —— 6 低位密奏 b41–b48（呼吸：第一小节全空，只放 B 排小花） ——
    S.section('B01_S6', '低位密奏', 41, 49, 'ST', 'GC', 'CR', '点灭星领、金裂星接：高潮后掉下来，只放低位 S 排；第 41 小节（71.7 s）全空')
    S.low8('ST', h(42), 'out', 0.1)
    S.low8('GC', h(43), 'L', 0.2)
    S.row9('SC', h(44), 'out', 0.1, 'flat')
    if d >= 2:
        S.low8('CR', h(44, 2), 'out', 0.1)
    S.zig17('ST', 'GC', h(45), 'out', 0.1)
    S.low8('ST', h(46), 'R', 0.2)
    S.row9('GC', h(47), 'in', 0.1, 'flat')
    S.stack('GY', 'CR', h(48), 'out', 0.1, 'arch', 0.4)

    # —— 7 第二次递进 A b49–b56 ——
    S.section('B01_S7', '第二次递进 A', 49, 57, 'CL', 'SC', 'PW', '金蕊青柠星领，小银菊 / 橙辉星接，彩千轮插')
    S.row9('CL', h(49), 'out', 0.1, 'arch')
    S.zig17('SC', 'LM', h(50), 'out', 0.1)
    S.row9('CL', h(51), 'in', 0.1, 'arch')
    S.low8('OG', h(52), 'L', 0.2)
    S.fans('S5', B8, h(52), 'out', 0.1)
    S.row9('PW', h(53), 'together', 0.0, 'wave')
    S.stack('CL', 'SC', h(54), 'out', 0.1, 'arch', 0.4)
    S.castle('SS', 'CL', h(55), 'out', 0.1, 'flat')
    S.fans('R9R', B8, h(56), 'R', 0.2)
    if d >= 2:
        S.row9('SC', h(56, 2), 'out', 0.1, 'flat')

    # —— 8 蓄势 b57–b64（收窄 9→7→5→3→1；第 65 小节静默，只留尾缀在升） ——
    S.section('B01_S8', '蓄势收窄', 57, 65, 'GS', 'GC', 'ML', '17 点→9→7→5→3→1 逐小节收窄，64 小节鼓点进红彗星五束；65 小节（110.6 s）无爆点，高潮 II 入口的 L / M / S 尾缀在黑里升')
    S.zig17('GS', 'SC', h(57), 'out', 0.1)
    S.row9('ML', h(58), 'out', 0.1, 'arch')
    S.castle('SS', 'GS', h(59), 'out', 0.1, 'flat')
    S.cue('GR', [f'P{i}' for i in range(1, 8)], h(60), 'out', 0.1, 'arch', wave='收窄7', tier='all')
    S.cue('GS', [f'P{i}' for i in range(2, 7)], h(61), 'out', 0.1, 'arch', wave='收窄5', tier='all')
    S.fans('S5', ['B2', 'B3', 'B4', 'B5'], h(61), 'out', 0.1)
    S.cue('GR', ['P3', 'P4', 'P5'], h(62), 'out', 0.1, 'flat', wave='收窄3', tier='all')
    S.cue('GR', ['P4'], h(63), 'together', 0.0, 'flat', wave='收窄1', tier='all')
    S.fans('R5', ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'], h(64), 'out', 0.1, tier='all', layer='main')

    # —— 9 高潮 II b66–b81（⑥ 入口：城垛 + 主角金垂柳；其后每小节两波） ——
    S.section('B01_S9', '高潮 II', 66, 82, 'ML', 'CL', 'PW', '112.2 s（用户 1:47）静默一小节后回归：⑥ 城垛 + 主角金垂柳（P4）+ 银彩菊压两翼 + 多重菊嵌谷 + 小银菊铺低；多重菊领，金蕊青柠星接，彩千轮插；72 / 80 / 81 小节为鼓点重击')
    S.cue('GK', ['P4'], h(66), 'together', 0.0, 'flat', wave='主角', label='主角 金垂柳（P4）', keep_all=True)
    S.cue('SS', ['P0', 'P2', 'P6', 'P8'], h(66), 'out', 0.1, 'flat', wave='城垛L', keep_all=True)
    S.cue('ML', ['P1', 'P3', 'P5', 'P7'], h(66), 'out', 0.1, 'flat', wave='城垛M', keep_all=True)
    S.cue('SC', B8, h(66) + 0.4, 'out', 0.1, 'flat', wave='叠层二排', layer='extra')
    S.fans('S9', B8, h(66), 'out', 0.1)
    S.stack('CL', 'ST', h(67), 'out', 0.1, 'arch', 0.4, fan='S5', fan_H=0.0)
    S.row9('ML', h(68), 'out', 0.1, 'arch')
    S.low8('GC', h(68, 2), 'in', 0.1)
    S.castle('SS', 'CL', h(69), 'out', 0.1, 'flat')
    S.low8('SC', h(69, 2), 'out', 0.1)
    S.row9('GY', h(70), 'out', 0.1, 'arch')
    S.fans('R9', B8, h(70), 'L', 0.2)
    S.low8('LM', h(70, 2), 'out', 0.1)
    S.zig17('PW', 'OG', h(71), 'out', 0.1)
    S.row9('SS', h(72), 'out', 0.1, 'flat', keep_all=True)
    S.fans('S9', B8, h(72), 'out', 0.1)
    S.row9('GS', h(73), 'L', 0.2, 'arch')
    S.low8('GC', h(73, 2), 'R', 0.1)
    S.row9('ML', h(74), 'R', 0.2, 'arch')
    S.row9('CL', h(75), 'out', 0.1, 'valley')
    S.low8('ST', h(75, 2), 'out', 0.1)
    S.castle('GK', 'ML', h(76), 'out', 0.1, 'flat')
    S.stack('GY', 'SC', h(77), 'out', 0.1, 'arch', 0.4, fan='S5', fan_H=0.0)
    S.row9('PW', h(78), 'together', 0.0, 'wave')
    S.low8('LM', h(78, 2), 'out', 0.1)
    S.zig17('GS', 'ST', h(79), 'out', 0.1)
    S.row9('GR', h(80), 'out', 0.1, 'arch')
    S.low8('GC', h(80, 2), 'out', 0.1)
    S.fans('S5', B8, h(80), 'out', 0.1)
    S.castle('SS', 'GR', h(81), 'out', 0.1, 'flat', keep_all=True)
    S.low8('SC', h(81), 'out', 0.1, layer='extra')
    S.fans('S13', ['B2', 'B3', 'B4', 'B5'], h(81), 'out', 0.1)

    # —— 10 转场 A b82–b88（长冈 2:14 的 A / B 间隔；彩千轮领） ——
    S.section('B01_S10', '转场铺色 A', 82, 89, 'SC', 'LM', 'PW', '高潮 II 之后降一档：17 点一点一发，小银菊 / 小青柠 / 橙辉星 / 点灭星轮换，彩千轮 144.6 s 领一波')
    S.zig17('SC', 'LM', h(83), 'out', 0.1)
    S.low8('ST', h(84), 'L', 0.2)
    S.zig17('OG', 'SC', h(85), 'out', 0.1)
    S.row9('PW', h(86), 'out', 0.1, 'wave')
    S.low8('SC', h(86), 'out', 0.1, layer='extra')
    S.zig17('SC', 'ST', h(87), 'out', 0.1)
    S.row9('GP', h(88), 'out', 0.1, 'arch')

    # —— 11 转场 B b89–b96（绿牡丹领一波；b96 呼吸） ——
    S.section('B01_S11', '转场铺色 B', 89, 97, 'GP', 'GC', 'OG', '绿牡丹 154.4 s 领；金裂星接；第 96 小节（160.9 s）全空，为终章前奏的尾缀让路')
    S.stack('GP', 'SC', h(89), 'out', 0.1, 'arch', 0.4)
    S.zig17('GS', 'OG', h(90), 'out', 0.1)
    S.row9('PW', h(91), 'in', 0.1, 'wave')
    S.fans('R5', B8, h(91), 'out', 0.1)
    S.row9('GP', h(92), 'together', 0.0, 'wave')
    S.low8('LM', h(92), 'out', 0.1, layer='extra')
    S.castle('SS', 'GP', h(93), 'out', 0.1, 'flat')
    S.row9('CL', h(94), 'R', 0.2, 'arch')
    S.stack('GY', 'ST', h(95), 'out', 0.1, 'arch', 0.4, fan='S5', fan_H=0.0)

    # —— 12 终章 b97–b118（长冈 5:22–5:32：金墙 → 垂柳墙 → 白墙） ——
    S.section('B01_S12', '终章', 97, 119, 'GK', 'GY', 'SS', '97 小节（162.5 s，全曲最响的一小节）起前奏；102 小节（170.6 s）起整段最亮；⑧ 175.4 s 三主角垂柳墙；186.8–194.9 s 金墙三波；196.5 s 白墙')
    S.castle('GK', 'CL', h(97), 'out', 0.1, 'flat', keep_all=True)
    S.low8('SC', h(97), 'out', 0.1, layer='extra')
    S.fans('S5', B8, h(97), 'out', 0.1)
    S.row9('GY', h(98), 'out', 0.1, 'arch')
    S.zig17('SC', 'ST', h(99), 'out', 0.1)
    S.row9('ML', h(100), 'L', 0.2, 'arch')
    S.stack('GR', 'GC', h(101), 'out', 0.1, 'arch', 0.4, fan='S5', fan_H=0.0)
    # 102 终章入口
    S.row9('SS', h(102), 'out', 0.1, 'flat', keep_all=True)
    S.low8('GC', h(102) + 0.4, 'out', 0.1, layer='extra')
    S.fans('S5', B8, h(102), 'out', 0.1)
    S.stack('CL', 'ST', h(103), 'out', 0.1, 'arch', 0.4)
    S.row9('GK', h(104), 'L', 0.3, 'flat')
    # ⑧ 三主角垂柳墙
    S.cue('GK', ['P2', 'P4', 'P6'], h(105), 'out', 0.1, 'flat', wave='三主角', label='三主角 金垂柳（P2 P4 P6）', keep_all=True)
    S.cue('SS', ['P0', 'P8'], h(105), 'together', 0.0, 'flat', wave='三主角收边', label='银彩菊收边（P0 P8）', keep_all=True)
    S.low8('SC', h(105) + 0.4, 'out', 0.1, layer='extra')
    S.row9('PW', h(106), 'out', 0.1, 'wave')
    if d >= 2:
        S.low8('OG', h(106, 2), 'out', 0.1)
    S.zig17('GS', 'LM', h(107), 'out', 0.1)
    S.castle('SS', 'ML', h(108), 'out', 0.1, 'flat')
    S.fans('R9', B8, h(108), 'L', 0.2)
    S.stack('GY', 'GC', h(109), 'out', 0.1, 'arch', 0.4)
    S.row9('SS', h(110), 'R', 0.3, 'flat')
    S.row9('CL', h(111), 'together', 0.0, 'wave')
    S.low8('SC', h(111), 'out', 0.1, layer='extra')
    # 186.8–194.9 金墙
    S.row9('GK', h(112), 'out', 0.1, 'flat', keep_all=True)
    S.row9('GR', h(113), 'out', 0.1, 'arch')
    S.low8('GC', h(113, 2), 'out', 0.1)
    S.row9('GK', h(114), 'in', 0.1, 'flat', keep_all=True)
    S.stack('GY', 'GC', h(115), 'out', 0.1, 'arch', 0.4, fan='S5', fan_H=0.0)
    S.row9('GK', h(116), 'out', 0.1, 'flat', keep_all=True)
    S.castle('GK', 'GR', h(117), 'out', 0.1, 'flat', keep_all=True)
    S.fans('S13', ['B2', 'B3', 'B4', 'B5'], h(117), 'out', 0.1)
    S.low8('GC', h(117), 'out', 0.1, layer='extra')
    # 118 终和弦：白墙
    S.row9('SS', h(118), 'out', 0.1, 'flat', keep_all=True)
    S.fans('S13', ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'], h(118), 'out', 0.1)

    # —— 13 白色收束 b119–b125 + 余韵 ——
    S.section('B01_S13', '白色收束', 119, 128, 'SS', 'SC', 'GK', '银彩菊白墙每小节一波 9→9→7→7→5→5→3 逐波收窄，对应音乐渐弱；最后一发金垂柳悬着熄灭')
    for k, pts in zip(range(119, 126), [9, 9, 7, 7, 5, 5, 3]):
        sel = [f'P{i}' for i in range(4 - pts // 2, 5 + pts // 2)]
        S.cue('SS', sel, h(k), 'out', 0.1, 'flat', wave=f'白墙{pts}', tier='all', label=f'白墙 {pts} 点')
    S.cue('GK', ['P4'], h(125, 2) + 0.2, 'together', 0.0, 'flat', wave='主角', label='余韵 金垂柳（P4）', keep_all=True)

    return S


# ═══════════════════════════ 体检 ═══════════════════════════
DIA = {'S': 90, 'M': 150, 'L': 230}


def all_events(S):
    out = []
    for c in S.cues:
        for e in c['events']:
            out.append(dict(cue=c['id'], section=c['section'], sp=c['sp'], size=c['size'], layer=c['layer'], wave=c['wave'], **e))
    return out


def gpu_points(S, tier='high'):
    """(时刻, GPU 发射器数)：尾缀在 launch，花本体在 burst，扇形每束在 launch + 束偏移"""
    pts = []
    for c in S.cues:
        keep = set(c['points']) if tier == 'high' else set(c['profiles'][tier])
        for e in c['events']:
            if e['point'] not in keep:
                continue
            if c['size'] == 'F':
                gpu = BEAM_GPU['R' if c['sp'].startswith('R') else 'S']
                for b in fan_beams(c['sp']):
                    pts.append((e['launch'] + b['off'], gpu))
            else:
                pts.append((e['launch'], TAIL_GPU[c['size']]))
                if SPECIES[c['sp']][4]:
                    pts.append((e['burst'], SPECIES[c['sp']][4]))
    return sorted(pts)


def window_max(pts, width=1.0):
    ts = [t for t, _ in pts]
    best, arg, over = 0, 0, []
    j = 0
    run = 0
    cum = []
    for i, (t, g) in enumerate(pts):
        cum.append(g if not cum else cum[-1] + g)
    import bisect
    series = []
    for i, (t, g) in enumerate(pts):
        k = bisect.bisect_left(ts, t + width)
        tot = cum[k - 1] - (cum[i - 1] if i else 0)
        series.append((t, tot))
        if tot > best:
            best, arg = tot, t
    return best, arg, series


def checks(S):
    ev = all_events(S)
    res = {}
    # 1 数量
    balls = [e for e in ev if e['size'] != 'F']
    fans = [e for e in ev if e['size'] == 'F']
    res['events'] = dict(total=len(ev), balls=len(balls), fans=len(fans), cues=len(S.cues), bySize={k: sum(1 for e in balls if e['size'] == k) for k in 'SML'})
    tiers = {}
    for tier in ('high', 'medium', 'low'):
        n = nb = nf = 0
        for c in S.cues:
            keep = set(c['points']) if tier == 'high' else set(c['profiles'][tier])
            k = sum(1 for e in c['events'] if e['point'] in keep)
            n += k
            if c['size'] == 'F':
                nf += k
            else:
                nb += k
        gp = gpu_points(S, tier)
        tiers[tier] = dict(events=n, balls=nb, fans=nf, gpuPeakPerS=window_max(gp)[0] if gp else 0)
    res['tiers'] = tiers
    # 2 GPU
    gp = gpu_points(S, 'high')
    best, arg, series = window_max(gp)
    over, hard = [], []
    last = -9
    lasth = -9
    for t, tot in series:
        if tot > GPU_BUDGET and t - last > 1.0:
            over.append(dict(t=round(t, 2), gpu=tot))
            last = t
        if tot > GPU_HARD and t - lasth > 1.0:
            hard.append(dict(t=round(t, 2), gpu=tot))
            lasth = t
    res['gpu'] = dict(soft=GPU_BUDGET, hard=GPU_HARD, peak=best, peakAt=round(arg, 2), softOver=len(over), hardOver=len(hard), softList=over[:40], hardList=hard)
    # 3 对拍：每个 cue 第一发开花对最近 1/4 小节拍线
    beat = BAR / 4
    dev = []
    for c in S.cues:
        if c['size'] == 'F':
            t0 = min(e['launch'] for e in c['events'])
        else:
            t0 = min(e['burst'] for e in c['events'])
        k = round((t0 - BAR0) / beat)
        dev.append(abs(t0 - (BAR0 + k * beat)))
    res['beatLock'] = dict(within0_1=round(sum(1 for x in dev if x <= 0.1) / len(dev), 3), within0_15=round(sum(1 for x in dev if x <= 0.15) / len(dev), 3), cues=len(dev))
    # 强拍：每小节第一拍 (beat%4==0)
    strong = 0
    for c in S.cues:
        t0 = min(e['burst'] if c['size'] != 'F' else e['launch'] for e in c['events'])
        k = round((t0 - BAR0) / BAR)
        if abs(t0 - (BAR0 + k * BAR)) <= 0.1:
            strong += 1
    res['strongBeat'] = round(strong / len(S.cues), 3)
    # 4 整排 / 同屏代数
    full = [c for c in S.cues if c['size'] != 'F' and len(c['points']) >= 7 and c['layer'] == 'main' and c['wave'] not in ('倒计时',)]
    waves = defaultdict(list)
    for c in full:
        waves[round(min(e['burst'] for e in c['events']), 1)].append(c)
    gens = []
    allball = [c for c in S.cues if c['size'] != 'F']
    for t0, cs in sorted(waves.items()):
        inflight = set()
        for c in allball:
            if any(e['launch'] <= t0 < e['burst'] for e in c['events']) and c not in cs:
                inflight.add(c['id'])
        gens.append((t0, len(inflight)))
    res['generations'] = dict(fullWaves=len(waves), meanTailsInFlightCues=round(sum(g for _, g in gens) / max(1, len(gens)), 2),
                              fullWavesWithNextTails=sum(1 for _, g in gens if g >= 1), share=round(sum(1 for _, g in gens if g >= 1) / max(1, len(gens)), 3))
    # 5 接力：同种主排整排连续出现不超过 2 次（墙除外）
    seq = []
    for c in sorted(full, key=lambda c: min(e['burst'] for e in c['events'])):
        seq.append((round(min(e['burst'] for e in c['events']), 1), c['sp'], c['section']))
    runs = []
    run = 1
    for i in range(1, len(seq)):
        if seq[i][1] == seq[i - 1][1] and seq[i][2] == seq[i - 1][2]:
            run += 1
            if run > 2 and seq[i][1] not in ('SS', 'GK'):
                runs.append(dict(t=seq[i][0], sp=seq[i][1], run=run))
        else:
            run = 1
    res['relayViolations'] = runs
    # 6 领奏：每种球花有没有一次整排
    lead = {}
    for sp, v in SPECIES.items():
        if SPECIES[sp][2] == 'F':
            continue
        ts = sorted({round(min(e['burst'] for e in c['events']), 1) for c in full if c['sp'] == sp})
        lead[sp] = dict(name=SPECIES[sp][1], fullWaves=len(ts), firstAt=ts[0] if ts else None)
    res['lead'] = lead
    res['leadMissing'] = [sp for sp, v in lead.items() if v['fullWaves'] == 0]
    # 7 段内领奏占比
    share = {}
    for s in S.sections:
        cs = [c for c in S.cues if c['section'] == s['id'] and c['size'] != 'F' and c['layer'] == 'main']
        tot = sum(len(c['events']) for c in cs)
        cnt = defaultdict(int)
        for c in cs:
            cnt[c['sp']] += len(c['events'])
        share[s['id']] = dict(name=s['name'], lead=s['lead'], leadShare=round(cnt.get(s['lead'], 0) / tot, 2) if tot else 0, top=sorted(cnt.items(), key=lambda kv: -kv[1])[:3])
    res['sectionShare'] = share
    # 8 静默小节：爆点数
    quiet = {}
    for k in (41, 65, 96):
        a, b = T(k), T(k + 1) - 0.1
        quiet[f'bar{k}'] = dict(span=[round(a, 2), round(b, 2)], bursts=sum(1 for e in ev if a <= e['burst'] < b and e['size'] != 'F'),
                                fanStarts=sum(1 for e in ev if e['size'] == 'F' and a <= e['launch'] < b),
                                tailsRising=sum(1 for e in ev if e['size'] != 'F' and e['launch'] < b and e['burst'] > a))
    res['quietBars'] = quiet
    # 9 时间网格与高度
    off = [e for e in ev if abs(e['launch'] * 10 - round(e['launch'] * 10)) > 1e-6]
    res['grid'] = dict(offGridLaunch=len(off), maxAbsDz=max(abs(e['dz']) for e in ev), minLaunch=min(e['launch'] for e in ev), lastEnd=round(max(e['end'] for e in ev), 2))
    # 10 同屏
    ts = [i * 0.5 for i in range(int(res['grid']['lastEnd'] * 2) + 2)]
    alive = []
    for t in ts:
        alive.append(sum(1 for e in balls if e['burst'] <= t < e['end']))
    res['aliveBodies'] = dict(peak=max(alive), peakAt=ts[alive.index(max(alive))], mean=round(sum(alive) / len(alive), 1))
    bysp = {}
    for sp in SPECIES:
        if SPECIES[sp][2] == 'F':
            continue
        al = [sum(1 for e in balls if e['sp'] == sp and e['burst'] <= t < e['end']) for t in ts]
        bysp[sp] = dict(name=SPECIES[sp][1], peak=max(al), peakAt=ts[al.index(max(al))] if max(al) else None)
    res['aliveBySpecies'] = bysp
    # 11 每小节波数（密度）
    perbar = defaultdict(int)
    for c in S.cues:
        if c['size'] != 'F' and c['layer'] == 'main' and len(c['points']) >= 4:
            perbar[int((min(e['burst'] for e in c['events']) - BAR0) // BAR)] += 1
    res['barsWithWave'] = len(perbar)
    return res


# ═══════════════════════════ 图 ═══════════════════════════
def make_figs(S, ck):
    import numpy as np
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib.patches import Circle, Rectangle
    plt.rcParams['font.sans-serif'] = ['Noto Sans CJK SC', 'WenQuanYi Zen Hei', 'DejaVu Sans']
    plt.rcParams['axes.unicode_minus'] = False
    OUTDIR.mkdir(parents=True, exist_ok=True)
    mus = json.loads(MUSIC.read_text(encoding='utf-8'))
    ev = all_events(S)
    dur = ck['grid']['lastEnd']
    # —— 总览 ——
    fig, ax = plt.subplots(4, 1, figsize=(20, 11), sharex=True, gridspec_kw={'height_ratios': [1.2, 1.5, 1.4, 1.0]})
    bars = mus['bars']
    ax[0].plot([b['startShowS'] for b in bars], [b['rmsDb'] for b in bars], color='#334', lw=1.4)
    ax[0].fill_between([b['startShowS'] for b in bars], [b['rmsDb'] for b in bars], -40, color='#889', alpha=.25)
    ax[0].set_ylabel('响度 dB'); ax[0].set_ylim(-26, -5)
    for a in ax:
        for s in S.sections:
            a.axvline(s['start'], color='#c33', lw=.6, alpha=.5)
    for s in S.sections:
        ax[0].text((s['start'] + s['end']) / 2, -5.6, s['name'], ha='center', va='top', fontsize=8.5, color='#600')
    ax[0].set_title('B01 总览：音乐响度（上）· 每小节开花数（中上）· 同屏花数（中下）· GPU 发射器 / 秒（下）；红线 = 段落', loc='left', fontsize=11)
    nb = int(dur // BAR) + 3
    cnt = {k: np.zeros(nb) for k in 'SML'}
    fan = np.zeros(nb)
    for e in ev:
        if e['size'] == 'F':
            k = int((e['launch'] - BAR0) // BAR)
            if 0 <= k < nb: fan[k] += 1
        else:
            k = int((e['burst'] - BAR0) // BAR)
            if 0 <= k < nb: cnt[e['size']][k] += 1
    xs = [BAR0 + BAR * k for k in range(nb)]
    bot = np.zeros(nb)
    for k, col in (('S', '#9db7e8'), ('M', '#f0c24a'), ('L', '#e07a5f')):
        ax[1].bar(xs, cnt[k], bottom=bot, width=BAR * .9, color=col, align='edge', label=f'{k} 球花')
        bot += cnt[k]
    ax[1].step(xs, fan, where='post', color='#2a9d8f', lw=1.2, label='扇形')
    ax[1].set_ylim(0, 30); ax[1].legend(loc='upper left', ncol=4, fontsize=8); ax[1].set_ylabel('每小节开花数')
    tsx = np.arange(0, dur, 0.5)
    alive = [sum(1 for e in ev if e['size'] != 'F' and e['burst'] <= t < e['end']) for t in tsx]
    ax[2].fill_between(tsx, alive, color='#f4a261', alpha=.7); ax[2].set_ylabel('同屏花本体数')
    gp = gpu_points(S, 'high')
    _, _, series = window_max(gp)
    ax[3].plot([t for t, _ in series], [v for _, v in series], color='#6a4c93', lw=.9)
    ax[3].axhline(GPU_BUDGET, color='r', ls='--', lw=1); ax[3].text(1, GPU_BUDGET + 5, f'暂定预算 {GPU_BUDGET}', color='r', fontsize=8)
    ax[3].set_ylabel('1 s 内新起 GPU 发射器'); ax[3].set_xlabel('演出秒（音乐 + 5）'); ax[3].set_xlim(0, dur + 2)
    plt.tight_layout()
    plt.savefig(OUTDIR / '总览.png', dpi=110); plt.close()

    # —— 关键时刻 ——
    moments = [(10.9, '② 开场高潮 10.0 s'), (26.9, '③ 环形排 26.0 s'), (51.6, '④ 回扫 50.6 s'), (60.0, '⑤ 城垛 58.7 s'),
               (66.2, '高潮 I 中段 65 s'), (76.0, '低位密奏 76 s'), (100.0, '蓄势 99 s'), (114.5, '⑥ 入口 112.2 s'),
               (140.9, '转场 A/B 间隔 139.8 s'), (176.6, '⑧ 三主角 175.4 s'), (188.2, '金墙 186.8 s'), (198.2, '白墙 196.5 s')]
    fig, axs = plt.subplots(4, 3, figsize=(21, 20))
    for a, (t, title) in zip(axs.flat, moments):
        snapshot(a, S, t, title)
    plt.tight_layout()
    plt.savefig(OUTDIR / '关键时刻.png', dpi=100); plt.close()


def snapshot(ax, S, t, title):
    from matplotlib.patches import Circle, Rectangle, Polygon
    ax.add_patch(Rectangle((-450, -90), 900, 90, fc='#ececea', ec='#bdbdb0', lw=1))
    for p, v in PT.items():
        if p[0] in 'PB':
            ax.plot(v['x'], 0, marker='^' if p[0] == 'P' else '.', color='k' if p[0] == 'P' else '#888', ms=5 if p[0] == 'P' else 4)
    n = {'tail': 0, 'body': 0, 'fan': 0}
    for c in S.cues:
        col = SPECIES[c['sp']][3]
        for e in c['events']:
            x = px(e['point'])
            if c['size'] == 'F':
                age = t - e['launch']
                life = max(b['off'] for b in fan_beams(c['sp'])) + 2.4
                if 0 <= age < life:
                    n['fan'] += 1
                    for b in fan_beams(c['sp']):
                        a_ = age - b['off']
                        if a_ < 0: continue
                        ang = math.radians(b['roll'] * 1.0)
                        L = min(80, 140 * a_) * (1 - a_ / life * .6)
                        ax.plot([x, x + L * math.sin(ang)], [2, 2 + L * math.cos(ang)], color=col, lw=1.1, alpha=max(.15, 1 - a_ / life))
                continue
            rise = rise_of(c['sp'])
            Hb = REL_H[c['size']] + e['dz']
            if e['launch'] <= t < e['burst']:
                p_ = (t - e['launch']) / rise
                h_ = Hb * (1 - (1 - p_) ** 2)
                ax.plot([x, x], [max(0, h_ - 70), h_], color='#ffd27a', lw=1.6, alpha=.95)
                ax.plot(x, h_, marker='o', ms=2.4, color='#fff2c4')
                n['tail'] += 1
            elif e['burst'] <= t < e['end']:
                age = t - e['burst']
                life = life_of(c['sp'])
                d_ = DIA[c['size']] * (1 - math.exp(-age / 0.45))
                al = max(.07, 1 - (age / life) ** 1.4) * .85
                ax.add_patch(Circle((x, Hb), d_ / 2, fc=col, ec=col, lw=1.0, alpha=al * .35))
                ax.add_patch(Circle((x, Hb), d_ / 2, fc='none', ec=col, lw=1.3, alpha=al))
                if c['sp'] == 'GK':
                    ax.add_patch(Polygon([(x - d_ * .45, Hb - d_ * .1), (x + d_ * .45, Hb - d_ * .1), (x + d_ * .34, Hb - d_ * (.55 + .35 * min(1, age / 3))), (x - d_ * .34, Hb - d_ * (.55 + .35 * min(1, age / 3)))], fc=col, ec='none', alpha=al * .4))
                n['body'] += 1
    ax.set_facecolor('#0d1020')
    ax.set_xlim(-480, 480); ax.set_ylim(-95, 640); ax.set_aspect('equal'); ax.set_xticks([]); ax.set_yticks([])
    ax.set_title(f'{title}  t={t:.1f}s  花 {n["body"]} · 尾缀 {n["tail"]} · 扇 {n["fan"]}', fontsize=11, loc='left')
    ax.plot([380, 480], [610, 610], color='w', lw=1.2); ax.text(430, 618, '100 m', ha='center', color='w', fontsize=8)


# ═══════════════════════════ 导出 ═══════════════════════════
def export(S, ck):
    OUTDIR.mkdir(parents=True, exist_ok=True)
    dur = max(math.ceil((OFFSET + 210.8108125) * 10) / 10, math.ceil(ck['grid']['lastEnd'] * 10) / 10)
    out = dict(format='df.choreography-proposal/2', revision='B01_NAGAOKA_LOGIC', status='logic_compiled_by_编排B01_编译.mjs_UE_unverified',
               generator='analysis/scripts/编排B01.py', density=S.density, musicOffsetS=OFFSET, barS=BAR, bar0S=BAR0, duration=dur,
               sections=S.sections, cues=S.cues)
    (OUTDIR / '逻辑方案.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    (OUTDIR / '体检.json').write_text(json.dumps(ck, ensure_ascii=False, indent=1), encoding='utf-8')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--density', type=int, default=2)
    ap.add_argument('--no-figs', action='store_true')
    a = ap.parse_args()
    S = build(a.density)
    ck = checks(S)
    export(S, ck)
    if not a.no_figs:
        make_figs(S, ck)
    print(json.dumps({k: ck[k] for k in ('events', 'tiers', 'gpu', 'beatLock', 'strongBeat', 'generations', 'relayViolations', 'leadMissing', 'quietBars', 'grid', 'aliveBodies', 'barsWithWave', 'aliveBySpecies')}, ensure_ascii=False, indent=1))
