#!/usr/bin/env python3
"""分镜（长冈式）（对话框22，10-11 12:05 起）：按用户给的 8 张长冈 2025 凤凰截图量出来的构图词汇，
翻成我们舞台（P0–P8 间距 100 m + B 点 8 个，17 点线；S 90 / M 150 / L 230 / 主角 280 m）的同比例正面图。
截图量法：视频区宽 ≈ 1617 px，对应 17 点线 ≈ 775 m，约 0.6 m/px；P 点间距 ≈ 166 px = 100 m；17 个地面扇间距 ≈ 83 px。
输出：
  协作/跨年秀编排宪章_图/分镜_长冈式.png   九个时刻按演出顺序 + 能量条
  协作/跨年秀编排宪章_图/长冈对照_上|下.png  长冈截图 | 我们的同类时刻，8 行
  协作/跨年秀编排宪章_图/分镜数据.json       每格的朵数、尾缀、GPU 发射器估计
长冈截图缩成 jpg 放 协作/跨年秀编排宪章_图/长冈参考/（来源：AQUA Geo Graphic《長岡花火 復興祈願フェニックス 2025》，用户截图，仅作内部对照）。
示意图，不是 UE 回放；颜色只表示「银白 A / 金 B / 色 C / 主角」，不是素材色。"""
import json
import math
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, Polygon
from PIL import Image

plt.rcParams['font.sans-serif'] = ['Noto Sans CJK SC', 'WenQuanYi Zen Hei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '协作/跨年秀编排宪章_图'
UP = Path('/root/.claude/uploads/939512b4-3ecd-54c7-9b03-f37c4e606309')

P = lambda i: (i - 4) * 100          # P0..P8
B = lambda j: (j - 3.5) * 100        # B0..B7（P 点之间）
PTS17 = [-400 + 50 * k for k in range(17)]
DIA = {'S': 90, 'M': 150, 'L': 230, 'H': 280, 'F': 50}
ROLE = {  # 边色, 填色
    'A': ('#5d78b4', '#e9eefa'),   # 银白
    'B': ('#c99a00', '#fbf0c4'),   # 金
    'C': ('#2fae85', '#e3f6ee'),   # 色（绿 / 青柠 / 橙）
    'H': ('#b8860b', '#f6e3a1'),   # 主角
    'W': ('#7f8fb0', '#f1f3fa'),   # 白墙
}
# 尾缀与花本体的 GPU 发射器数（24 的资源发射器数.json，LOD0 启用）：尾缀 L 6 / M 2 / S 6；花本体见 GPU_FLOWER
GPU_TAIL = {'L': 6, 'M': 2, 'S': 6, 'H': 6, 'F': 6}
GPU_FLOWER = {'金曜菊': 2, '多重菊': 1, '点灭星': 5, '小青柠': 1, '绿牡丹': 1, '金爆裂': 2, '金芒菊': 0, '银彩菊': 0, '金垂柳': 0, '小银菊': 0, '金蕊青柠星': 0}


def stage(ax):
    ax.add_patch(Rectangle((-450, -120), 900, 120, fc='#ececea', ec='#bdbdb0', lw=1))
    for x in PTS17:
        ax.plot(x, 0, marker='^' if x % 100 == 0 else '.', color='k' if x % 100 == 0 else '#888', ms=4)


def fans(ax, kind='gold', strength=1.0):
    col = {'gold': '#d9a400', 'silver': '#8fa0c0', 'comet': '#e0a060'}[kind]
    for x0 in PTS17:
        for a in (-34, -17, 0, 17, 34):
            h = 75 * strength
            ax.plot([x0, x0 + .8 * h * math.sin(math.radians(a))], [2, 2 + h * math.cos(math.radians(a))], color=col, lw=0.9, alpha=.75)


def comet_fans(ax):
    """17 个低位彗星扇：窄锥，上升中"""
    for x0 in PTS17:
        for a in (-7, 0, 7):
            ax.plot([x0, x0 + 14 * math.sin(math.radians(a))], [2, 88], color='#e0a060', lw=1.1, alpha=.85)
        ax.plot(x0, 90, marker='o', ms=2.2, color='#f0c070')


def tails(ax, xs, h, col='#8b97b8', dash=':'):
    for x in xs:
        ax.plot([x, x], [2, h], color=col, lw=1.1, ls=dash, alpha=.9)
        ax.plot(x, h, marker='o', ms=2.6, color=col)


def flower(ax, x, d, h, role, ring=False, alpha=.85, droop=False, core=None):
    ec, fc = ROLE[role]
    if droop:
        ax.add_patch(Polygon([(x - d * .48, h - d * .1), (x + d * .48, h - d * .1), (x + d * .36, h - d * .95), (x - d * .36, h - d * .95)], fc=fc, ec='none', alpha=.45 * alpha))
    ax.add_patch(Circle((x, h), d / 2, fc='none' if ring else fc, ec=ec, lw=1.4, alpha=alpha))
    if ring:
        ax.add_patch(Circle((x, h), d / 2 * .97, fc=fc, ec='none', alpha=.35 * alpha))
    if core:
        ax.add_patch(Circle((x, h), d * .2, fc=ROLE[core][1], ec=ROLE[core][0], lw=1.0, alpha=alpha))


def wrap(text, n):
    out = []
    for para in text.split('\n'):
        while len(para) > n:
            out.append(para[:n]); para = para[n:]
        out.append(para)
    return '\n'.join(out)


def spec_top(spec):
    top = 150
    for it_ in spec.get('items', []):
        top = max(top, it_['h'] + DIA[it_['k']] * it_.get('s', 1) / 2)
    return max(top, max([t[1] for t in spec.get('tails', [])] + [0])) + 55


def draw(ax, spec, fs=1.0, note=True, wrapn=38, ytop=None):
    stage(ax)
    f = spec.get('fans')
    if f == 'comet':
        comet_fans(ax)
    elif f:
        fans(ax, *f)
    for t in spec.get('tails', []):
        tails(ax, *t)
    order = {'H': 0, 'L': 1, 'M': 2, 'S': 3, 'F': 4}
    top = 150
    for it_ in sorted(spec.get('items', []), key=lambda t: order[t['k']]):
        d = DIA[it_['k']] * it_.get('s', 1)
        flower(ax, it_['x'], d, it_['h'], it_['r'], it_.get('ring', False), it_.get('a', .85), it_['k'] == 'H', it_.get('core'))
        top = max(top, it_['h'] + d / 2)
    top = max(top, max([t[1] for t in spec.get('tails', [])] + [0])) + 55
    top = ytop or top
    ax.set_xlim(-520, 520); ax.set_ylim(-125, top); ax.set_aspect('equal'); ax.axis('off')
    ax.set_title(spec['title'], fontsize=10.5 * fs, loc='left', fontweight='bold', x=0.0)
    ax.plot([380, 480], [top - 25, top - 25], color='k', lw=1); ax.text(430, top - 15, '100 m', ha='center', fontsize=7 * fs)
    if note:
        ax.text(-515, -135, wrap(spec['note'], wrapn), fontsize=7.8 * fs, va='top', color='#333', linespacing=1.35)


def stats(spec):
    n = {k: 0 for k in 'SMLHF'}
    for it in spec.get('items', []):
        if it.get('a', .85) >= .6 and not it.get('faint'):
            n[it['k']] += 1
    tl = spec.get('tails_count', {k: n[k] for k in 'SMLH'})
    gpu_tail = sum(GPU_TAIL[k] * v for k, v in tl.items())
    gpu_flower = sum(spec.get('gpu_flowers', {}).values())
    return dict(flowers=sum(n.values()), **{f'n{k}': v for k, v in n.items()}, tails=sum(tl.values()), gpuTail=gpu_tail, gpuFlower=gpu_flower, gpuWave=gpu_tail + gpu_flower)


def it(x, k, h, r, **kw):
    return dict(x=x, k=k, h=h, r=r, **kw)


# ———— 八种构图（长冈截图量出来的）→ 我们的数 ————
# 长冈 0:25 量值：顶排 9 朵 d 114–162 m、中心 +200~+243 m；二排 9 朵金 d ≈ 80 m、+117~+153 m；三排暗小花 d ≈ 50 m、+90 m；17 扇
H_TOP = [242, 230, 222, 219, 201, 207, 201, 204, 219]
H_2ND = [117, 129, 135, 144, 120, 126, 135, 150, 153]
DX_2ND = [13, 5, -25, -14, 7, 0, -8, -9, -45]
# 长冈 1:20 量值：顶排 9 朵环形、高低起伏 +177~+249 m
H_RING = [201, 249, 240, 192, 192, 177, 204, 213, 210]
# 长冈 4:11 量值：顶排 +135~+198 m；右侧三朵已转成金色垂落
H_SWEEP = [156, 198, 186, 147, 150, 135, 165, 195, 177]

S1 = dict(id=1, t='0:07.4', ref='0:22', title='① 0:07.4 预告（长冈 0:22）',
          fans='comet', tails=[([P(i) for i in range(9)], 150)], items=[],
          tails_count={'M': 9}, gpu_flowers={'彗星扇 17 组×5 束': 85},
          note='17 个低位彗星扇升起（窄锥、约 90 m）+ 9 条中号尾缀升向 +210 m。\n预告 = 尾缀自己，不用另外放东西；开花在 2.6 s 后的小节第一拍（演出 10.0 s）')
S2 = dict(id=2, t='0:10.0', ref='0:25', title='② 0:10.0 开场高潮（长冈 0:25）',
          fans=('gold', 1.0), tails=[],
          items=[it(P(i), 'M', H_TOP[i], 'A') for i in range(9)] + [it(P(i) + DX_2ND[i], 'S', H_2ND[i], 'B') for i in range(9)] +
                [it(B(j) + (8 if j % 2 else -8), 'F', 88 + (12 if j % 2 else -6), 'A', a=.35, faint=True) for j in range(8)],
          tails_count={'M': 9, 'S': 9}, gpu_flowers={},
          note='顶排 M 九点（银白，150 m，+200~+240，间距 1.5×）+ 二排 S 九点（金，90 m，+120~+150，与顶排同柱略错）\n+ 三排暗小花（⌀50，+90，余辉）+ 17 个金扇铺底。计划书「开场三层」的原样')
S3 = dict(id=3, t='0:26', ref='1:20', title='③ 0:26 环形排（长冈 1:20）',
          fans=('gold', 1.15), tails=[([P(i) for i in range(9)], 90)],
          items=[it(P(i), 'M', H_RING[i], 'B', ring=True, core='C') for i in range(9)],
          tails_count={'M': 9}, gpu_flowers={'金曜菊×9': 18},
          note='M 九点一排，金环 + 色芯（金蕊青柠星 / 多重菊 / 金曜菊），高低起伏 ±35 m 像波浪；\n17 个金扇铺底；下一波 9 条尾缀已升到 +90 m（每小节一波，叠着放）')
S4 = dict(id=4, t='0:50', ref='4:11', title='④ 0:50 往返扫波（长冈 4:11）',
          fans=None, tails=[([B(j) for j in range(8)], 70)],
          items=[it(P(i), 'M', H_SWEEP[i], 'B') for i in range(6)] + [it(P(i), 'M', 125, 'B', a=.3, faint=True) for i in (6, 7, 8)],
          tails_count={'M': 8}, gpu_flowers={},
          note='同一排 M 自左向右一格一格开（每点 0.28 s，计划书「往返扫射」），左 6 朵亮、右 3 朵已转成淡金垂落，\n下一遍的 8 条尾缀从点间升起：同时有三代在天上')
S5 = dict(id=5, t='0:59', ref=None, title='⑤ 0:59 第一次抬升（高潮 I）',
          fans=('gold', 1.0), tails=[([P(i) for i in range(9)], 100)],
          items=[it(P(i), 'L', 330, 'W') for i in (0, 2, 4, 6, 8)] + [it(P(i), 'M', 210, 'B') for i in (1, 3, 5, 7)],
          tails_count={'L': 5, 'M': 4}, gpu_flowers={},
          note='你选过的「城垛」：L 五点 +330 一朵朵排开 + M 四点 +210 嵌在谷里；17 个金扇铺底，下一波尾缀在升。\n（这一格沿用上一版 ③，你喜欢）')
S6 = dict(id=6, t='1:52.2', ref=None, title='⑥ 1:52.2 高潮 II 入口（你的 1:47）',
          fans=('gold', 1.2), tails=[([P(i) for i in range(9)], 100)],
          items=[it(P(4), 'H', 400, 'H')] + [it(P(i), 'L', 330, 'W') for i in (0, 2, 6, 8)] + [it(P(i), 'M', 210, 'B') for i in (1, 3, 5, 7)] +
                [it(B(j), 'S', 90, 'C') for j in range(8)],
          tails_count={'H': 1, 'L': 4, 'M': 4, 'S': 8}, gpu_flowers={},
          note='「城垛」+ 主角：中心换成金垂柳 280 m（+400），L 四点压两翼（间距 200 m，与主角叠 55 m），M 四点嵌谷，\nS 八点铺低（B 点 +90）；前面静默 1 小节，这一拍整条线一起炸。不再是 3 个 L 孤零零')
S7 = dict(id=7, t='2:20', ref='2:14', title='⑦ 2:20 转场 · A/B 间隔（长冈 2:14）',
          fans=None, tails=[(PTS17, 55)],
          items=[it(P(i), 'S', 105 + (10 if i % 2 else -5), 'A') for i in range(9)] + [it(B(j), 'S', 85, 'C', s=.56) for j in range(8)],
          tails_count={'S': 17}, gpu_flowers={},
          note='17 个点一点一发，同一高度：P 点 A（银白，S 90）、点间 B（色，S 的 56% 缩小版 ⌀50）轮换，每朵一条短尾缀；\n下一小节换 A/C、B/C……（过渡就是中、小烟花交替）；⌀50 是新增固定子模板，没有它就用 S 90 放低一层')
S8 = dict(id=8, t='2:55', ref='5:27', title='⑧ 2:55 垂柳墙（长冈 5:27）',
          fans=None, tails=[(PTS17, 140, '#8aa0d6')],
          items=[it(-250, 'H', 400, 'H'), it(0, 'H', 430, 'H'), it(250, 'H', 400, 'H'), it(P(0), 'L', 330, 'B', a=.8), it(P(8), 'L', 330, 'B', a=.8)],
          tails_count={'H': 3, 'L': 2, 'M': 17}, gpu_flowers={},
          note='主角金垂柳 280 m ×3（间距 250 m，叠 30 m，+400 / +430 / +400）+ 两端 L 金收边，垂裙连成一整面；\n整条 17 个点的下一波尾缀（蓝白）已在升。主角是「整面墙」，不是一朵孤花')
S9 = dict(id=9, t='3:16', ref='5:22', title='⑨ 3:16 满墙：金（终章）→ 白（收束 8 波）',
          fans=None, tails=[([P(i) for i in range(9)], 120, '#8b97b8')],
          items=[it(P(i), 'L', 250 if i % 2 else 210, 'W', ring=False) for i in range(9)],
          tails_count={'L': 9}, gpu_flowers={},
          note='L 九点一排，直径 / 间距 2.3×，叠成一整面，中心 +210 / +250 交错（长冈 5:22、5:32 量到墙心 ≈ +200~230，\n与计划书「中档升空 +210」一致；放到 +330 会在尾缀上方悬出一道空隙）；终章配金、收束配银白；每 1.5 s 一波 × 8')
SPECS = [S1, S2, S3, S4, S5, S6, S7, S8, S9]


def energy_strip(ax):
    d = json.load(open(ROOT / 'analysis/music/汪洋与浩渺_高潮分析.json'))
    bars = d['bars']
    t = [b['startShowS'] + .8 for b in bars]
    r = np.array([b['rmsDb'] for b in bars])
    ax.plot(t, np.convolve(r, np.ones(3) / 3, mode='same'), color='#2a5db0', lw=1.6)
    ax.set_ylim(-16, -6); ax.set_xlim(0, 216)
    for (a, b, c, n) in ((60.3, 71.7, '#f6ddcc', '高潮 I'), (112.2, 138.2, '#dbe8f7', '高潮 II'), (170.6, 198.2, '#fbe9a6', '终章 · 主高潮')):
        ax.axvspan(a, b, color=c, alpha=.8, lw=0); ax.text((a + b) / 2, -6.6, n, ha='center', va='top', fontsize=8.5)
    ax.axvspan(110.6, 112.2, color='#999', alpha=.6, lw=0)
    for s in SPECS:
        h, m = s['t'].split(':'); x = int(h) * 60 + float(m)
        ax.axvline(x, color='#c0392b', lw=1); ax.text(x, -15.2 if s['id'] != 1 else -12.6, str(s['id']), color='#c0392b', ha='center', fontsize=10, fontweight='bold', bbox=dict(boxstyle='circle,pad=.15', fc='white', ec='#c0392b', lw=1))
    ax.set_yticks([]); ax.set_xlabel('演出时间（s）= 音乐时间 + 5；灰条 = 1:47 前的 1 小节静默', fontsize=8)
    ax.set_title('《汪洋与浩渺》响度（逐小节）与九个构图时刻', fontsize=9.5, loc='left')


def storyboard():
    fig = plt.figure(figsize=(14.5, 15.2))
    gs = fig.add_gridspec(4, 3, height_ratios=[.26, 1, 1, 1], hspace=.34, wspace=.06)
    ax = fig.add_subplot(gs[0, :]); energy_strip(ax)
    for k, s in enumerate(SPECS):
        a = fig.add_subplot(gs[1 + k // 3, k % 3]); draw(a, s, fs=.92, wrapn=36, ytop=max(spec_top(x) for x in SPECS[(k // 3) * 3:(k // 3) * 3 + 3]))
    fig.suptitle('分镜 · 长冈式（按演出先后；17 点线、S 90 / M 150 / L 230 / 主角 280 m，100 m 比例尺，示意，不是 UE 回放）', fontsize=13, fontweight='bold', x=0.02, ha='left', y=.995)
    fig.savefig(OUT / '分镜_长冈式.png', dpi=100, facecolor='white', bbox_inches='tight'); plt.close(fig)


# 截图：视频区在 2000 px 宽显示里的 x 范围（我目测）
CROP = {'0:22': (233, 1802), '0:25': (228, 1845), '1:20': (221, 1782), '2:14': (213, 1812), '4:11': (220, 1758), '5:22': (232, 1792), '5:27': (231, 1785), '5:32': (232, 1827)}
FILES = {'0:22': '1af5602f', '0:25': 'eea3e751', '1:20': '81053752', '2:14': '7b751348', '4:11': '8edcb8e6', '5:22': 'f8a40e5b', '5:27': '8c06a240', '5:32': 'dffbf2b9'}
PAIRS = [('0:22', 1), ('0:25', 2), ('1:20', 3), ('2:14', 7), ('4:11', 4), ('5:22', 9), ('5:27', 8), ('5:32', 9)]
WHITE = dict(S9, title='⑨ 白墙（收束）：同构图换银白', note='同 ⑨ 金墙：L 九点 +210 / +250 交错，换银白；每 1.5 s 一波 × 8，墙下一排尾缀接着升')


def crop_ref():
    d = OUT / '长冈参考'; d.mkdir(exist_ok=True)
    ims = {}
    for t, f in FILES.items():
        im = Image.open(UP / f'{f}-image.png').convert('RGB')
        s = im.size[0] / 2000
        x0, x1 = CROP[t]
        c = im.crop((int(x0 * s), int(12 * s), int(x1 * s), int(628 * s)))
        c = c.resize((1200, int(1200 * c.size[1] / c.size[0])), Image.LANCZOS)
        c.save(d / f'长冈2025_{t.replace(":", "m")}s.jpg', quality=84)
        ims[t] = c
    return ims


def compare(ims):
    for name, rows in (('上', PAIRS[:4]), ('下', PAIRS[4:])):
        fig, axs = plt.subplots(len(rows), 2, figsize=(14.5, 4.1 * len(rows)), gridspec_kw=dict(width_ratios=[1.35, 1.0], wspace=.03, hspace=.38))
        for r, (t, i) in enumerate(rows):
            a0, a1 = axs[r]
            a0.imshow(ims[t]); a0.axis('off'); a0.set_title(f'长冈 2025 · {t}', fontsize=11, loc='left', fontweight='bold')
            spec = WHITE if (t == '5:32') else SPECS[i - 1]
            draw(a1, spec, fs=.95, note=True, wrapn=44)
        fig.suptitle(f'长冈截图 | 我们的同类时刻（{name}）', fontsize=13, fontweight='bold', x=0.02, ha='left', y=.995)
        fig.savefig(OUT / f'长冈对照_{name}.png', dpi=100, facecolor='white', bbox_inches='tight'); plt.close(fig)


if __name__ == '__main__':
    storyboard()
    compare(crop_ref())
    data = {s['title']: stats(s) for s in SPECS}
    (OUT / '分镜数据.json').write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    for k, v in data.items():
        print(k, v)
