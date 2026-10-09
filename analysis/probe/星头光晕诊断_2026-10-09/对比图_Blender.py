# -*- coding: utf-8 -*-
"""FC8R → FC9R（烘焙器引擎回放）vs Blender 里认可的光感（万彩千轮 C、FanComet R4、银彩菊 V02），一张图。输出 对比_FC9R_Blender.png"""
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
k3 = lambda a: np.kron(a, np.ones((3, 3, 1), dtype=np.uint8))
f8 = L('FC8R_定稿/FC8R_export_px_1.80.png'); f9 = L('FC9R_定稿/FC9R_export_px_1.80.png'); f9w = L('FC9R_定稿/FC9R_export_fit_1.80.png')
r4 = L('Blender参考/FanComet_R4_头部同尺度对照.jpg'); sv = L('Blender参考/银彩菊_2.65.png'); pc = L('Blender参考/万彩千轮_C_Soft_右上格.png')
fig = plt.figure(figsize=(17, 11), facecolor=bg)
fig.text(0.012, 0.978, '红彗星扇 FC9R：照 Blender 里你认可的光感（多层柔光 + 饱和红光晕 + 小白芯）', color=fg, fontsize=15, va='top')
def show(rect, im, title):
    ax = fig.add_axes(rect); ax.imshow(im, interpolation='nearest'); ax.axis('off'); ax.set_title(title, color=fg, fontsize=10.5, loc='left')
show([0.01, 0.50, 0.40, 0.42], f9w[60:420, 40:480], 'FC9R · 引擎回放 1.80 s（适应窗口）')
show([0.43, 0.50, 0.18, 0.42], k3(f8[80:230, 180:330]), 'FC8R（上一版）星头放大 ×3')
show([0.62, 0.50, 0.18, 0.42], k3(f9[80:230, 180:330]), 'FC9R 星头放大 ×3')
show([0.81, 0.50, 0.18, 0.42], r4[90:360, 440:710], 'FanComet R4（Blender，你认可的头部光感）')
show([0.01, 0.05, 0.18, 0.40], k3(sv[60:210, 380:530]), '银彩菊 V02（Blender）×3')
show([0.20, 0.05, 0.18, 0.40], np.kron(pc[330:410, 490:570], np.ones((5, 5, 1), dtype=np.uint8)), '万彩千轮 C（Blender）×5')
m = json.load(open(os.path.join(HERE, 'FC9R_定稿', '量.json'), encoding='utf-8'))
def g(k, q): v = m[k]['光晕'].get(q) if k != '目标 万彩千轮C' else m[k].get(q); return '—' if v is None else f'{v:.2f}'
rows = [[lab] + [g(k, q) for k in ('FC8R 1.80', 'FC9R 1.80', 'FC9R 实时 1.80', '目标 万彩千轮C')] for lab, q in
        [('光晕 2·r50 处（亮度 / 峰值）', 'vis2'), ('光晕 4·r50 处', 'vis4'), ('光晕 6·r50 处', 'vis6'), ('4·r50 处饱和度', 'sat4')]]
rows.append(['星间雾', f"{m['FC8R 1.80']['星间雾']:.3f}", f"{m['FC9R 1.80']['星间雾']:.3f}", f"{m['FC9R 实时 1.80']['星间雾']:.3f}", '≈0.05（多颗密布）'])
rows.append(['星头色相（0° 正红）', f"{m['FC8R 1.80']['星头色相']:.0f}°", f"{m['FC9R 1.80']['星头色相']:.0f}°", f"{m['FC9R 实时 1.80']['星头色相']:.0f}°", '玫红（实拍红星 −8…−2°）'])
ax = fig.add_axes([0.40, 0.05, 0.59, 0.38]); ax.axis('off')
tb = ax.table(cellText=rows, colLabels=['', 'FC8R 引擎回放', 'FC9R 引擎回放', 'FC9R 实时模拟', '万彩千轮 C（Blender）'], loc='upper left', cellLoc='center', bbox=[0, 0.25, 1, 0.75])
tb.auto_set_font_size(False); tb.set_fontsize(10)
for (i, j), c in tb.get_celld().items(): c.set_facecolor('#1d2027' if i else '#2a2e38'); c.set_edgecolor('#444'); c.get_text().set_color(fg)
ax.text(0, 0.18, 'FC8R 的光晕到 4·r50 就没了（0.01），而且外圈发灰（饱和 0.36）；FC9R 近晕 + 远晕一路拖到 6·r50、颜色一直是饱和的红，和万彩千轮 C 同一个形状。\n'
        '尾巴回到 FC8R 那套炭金（颜色和实拍金菊对上过），亮肩收小，头比尾亮。', color=fg, fontsize=10, va='top')
fig.savefig(os.path.join(HERE, '对比_FC9R_Blender.png'), dpi=100, facecolor=bg)
print('ok')
