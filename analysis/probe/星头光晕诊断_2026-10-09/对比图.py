# -*- coding: utf-8 -*-
"""FC7R（用户截图）→ FC8R（烘焙器引擎回放截图）→ 实拍，一张图对比（整排、星头放大、指标）。输出 对比_FC7R_FC8R_实拍.png"""
import json, os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
for fn in ['Microsoft YaHei', 'SimHei']:
    if any(fn in f.name for f in font_manager.fontManager.ttflist): plt.rcParams['font.sans-serif'] = [fn]; break
plt.rcParams['axes.unicode_minus'] = False
bg, fg = '#15171c', '#e6e6e6'
L = lambda p: np.asarray(Image.open(os.path.join(HERE, p)).convert('RGB'))
old = L('输入/我们_FC7R截图.png'); new = L('FC8R_定稿/FC8R_export_px_1.10.png'); new2 = L('FC8R_定稿/FC8R_export_px_1.80.png')
refA = L('输入/参考A_金菊红头.jpg'); refB = L('输入/参考B_红环绿芯.jpg'); game = L('FC8R_定稿/FC8R_export_game_1.80.png')
fig = plt.figure(figsize=(16, 10.5), facecolor=bg)
fig.text(0.012, 0.975, '红彗星扇：FC7R（改前）→ FC8R（正红星头 + 炭金尾）→ 实拍', color=fg, fontsize=15, va='top')
def show(rect, im, title, interp='nearest'):
    ax = fig.add_axes(rect); ax.imshow(im, interpolation=interp); ax.axis('off'); ax.set_title(title, color=fg, fontsize=10, loc='left')
show([0.01, 0.56, 0.37, 0.36], old[150:330, 90:700], '改前 FC7R（你的截图）：3.5 m 粉球 + 粉雾带、玫红')
show([0.39, 0.56, 0.30, 0.36], new[180:420, 100:400], '改后 FC8R · 引擎回放 1.10 s（1 纹素 = 1 像素）')
show([0.70, 0.56, 0.29, 0.36], new2[90:330, 30:470], '改后 FC8R · 引擎回放 1.80 s')
# 星头放大（各取一颗，按各自尺度放到差不多大）
def crop(im, cx, cy, h): return im[max(0, cy - h):cy + h, max(0, cx - h):cx + h]
show([0.01, 0.20, 0.16, 0.30], crop(old, 414, 205, 34), '改前星头')
show([0.18, 0.20, 0.16, 0.30], crop(new2, 262, 140, 28), '改后星头（FC8R）')
show([0.35, 0.20, 0.16, 0.30], refA[60:200, 270:410], '实拍 A：金尾 + 红头')
show([0.52, 0.20, 0.16, 0.30], refB[690:800, 600:710], '实拍 B：红星')
live = L('FC8R_定稿/FC8R_live_px_1.80.png')
show([0.69, 0.20, 0.30, 0.30], live[90:330, 30:470], '改后 · 实时模拟 1.80 s（和引擎回放一致）')
# 指标表
d = json.load(open(os.path.join(HERE, '剖面.json'), encoding='utf-8'))
o = json.load(open(os.path.join(HERE, '输入', '我们_FC7R截图_剖面.json'), encoding='utf-8'))
n1 = json.load(open(os.path.join(HERE, 'FC8R_定稿', 'FC8R_export_px_1.10_剖面.json'), encoding='utf-8'))
n2 = json.load(open(os.path.join(HERE, 'FC8R_定稿', 'FC8R_export_px_1.80_剖面.json'), encoding='utf-8'))
hu = json.load(open(os.path.join(HERE, '头尾比与色相.json'), encoding='utf-8'))
A, B = d['参考A']['summary'], d['参考B']['summary']
def f(x, k): v = x.get(k); return '—' if v is None else f'{v:.2f}'
rows = [['形状 r10/r50（实拍 1.8–2.0）', f(o['summary'], 'shape_r10_r50'), f(n1['summary'], 'shape_r10_r50') + ' / ' + f(n2['summary'], 'shape_r10_r50'), f'{A["shape_r10_r50"]["median"]:.2f}', f'{B["shape_r10_r50"]["median"]:.2f}'],
        ['远尾 r3%/r50', f(o['summary'], 'tail_r03_r50'), f(n1['summary'], 'tail_r03_r50') + ' / ' + f(n2['summary'], 'tail_r03_r50'), f'{A["tail_r03_r50"]["median"]:.2f}', f'{B["tail_r03_r50"]["median"]:.2f}'],
        ['2·r50 处饱和度', f(o['summary'], 'sat_2r50'), f(n1['summary'], 'sat_2r50') + ' / ' + f(n2['summary'], 'sat_2r50'), f'{A["sat_2r50"]["median"]:.2f}', f'{B["sat_2r50"]["median"]:.2f}'],
        ['星间雾（越小越好）', f'{o["星间雾_中位"]:.3f}', f'{n1["星间雾_中位"]:.3f} / {n2["星间雾_中位"]:.3f}', '≈0', '烟'],
        ['星头色相（0° = 正红）', f'{o["r50色相_中位"]:.0f}°', f'{n1["r50色相_中位"]:.0f}° / {n2["r50色相_中位"]:.0f}°', f'{hu["参考A"]["r50色相°_中位"]:.0f}°', f'{hu["参考B"]["r50色相°_中位"]:.0f}°']]
ax = fig.add_axes([0.01, 0.01, 0.98, 0.17]); ax.axis('off')
tb = ax.table(cellText=rows, colLabels=['指标', '改前 FC7R', '改后 FC8R（1.10 s / 1.80 s）', '实拍 A', '实拍 B'], loc='center', cellLoc='center', bbox=[0, 0, 1, 1])
tb.auto_set_font_size(False); tb.set_fontsize(10)
for (i, j), c in tb.get_celld().items():
    c.set_facecolor('#1d2027' if i else '#2a2e38'); c.set_edgecolor('#444'); c.get_text().set_color(fg)
fig.savefig(os.path.join(HERE, '对比_FC7R_FC8R_实拍.png'), dpi=100, facecolor=bg)
print('ok')
