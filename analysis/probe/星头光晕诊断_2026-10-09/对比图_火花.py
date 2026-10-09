# -*- coding: utf-8 -*-
"""FC9R → FC10R 火花 vs Blender FanSilver R4（用户认可）。整排 + 火花放大 ×10 + 指标。输出 对比_FC10R_火花.png"""
import json, os, importlib.util
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('h', os.path.join(HERE, '火花量.py')); H = importlib.util.module_from_spec(spec); spec.loader.exec_module(H)
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
for fn in ['Microsoft YaHei', 'SimHei']:
    if any(fn in f.name for f in font_manager.fontManager.ttflist): plt.rcParams['font.sans-serif'] = [fn]; break
plt.rcParams['axes.unicode_minus'] = False
bg, fg = '#15171c', '#e6e6e6'
L = lambda p: np.asarray(Image.open(os.path.join(HERE, p)).convert('RGB'))


def win(p, roi, W=48):
    a = L(p).astype(float) / 255; rows, d = H.sparks(a, roi); pts = np.array([(r['x'], r['y']) for r in rows]); best = None
    for x, y in pts:
        x0, y0 = int(x - W / 2), int(y - W / 2); n = ((pts[:, 0] >= x0) & (pts[:, 0] < x0 + W) & (pts[:, 1] >= y0) & (pts[:, 1] < y0 + W)).sum()
        if best is None or n > best[0]: best = (n, x0, y0)
    _, x0, y0 = best; return np.kron(L(p)[y0:y0 + W, x0:x0 + W], np.ones((10, 10, 1), dtype=np.uint8)), H.summ(rows, d)


fig = plt.figure(figsize=(17, 11), facecolor=bg)
fig.text(0.012, 0.978, '红彗星扇火花：FC9R（上一版）→ FC10R（不规则多边形、削顶发白、锐利）vs Blender FanSilver R4', color=fg, fontsize=15, va='top')
def show(rect, im, title):
    ax = fig.add_axes(rect); ax.imshow(im, interpolation='nearest'); ax.axis('off'); ax.set_title(title, color=fg, fontsize=10.5, loc='left')
show([0.01, 0.50, 0.32, 0.42], L('FC9R_定稿/FC9R_export_px_1.10.png')[150:470, 70:450], 'FC9R · 引擎回放 1.10 s（1 纹素 = 1 像素）')
show([0.34, 0.50, 0.32, 0.42], L('FC10R_定稿/FC10R_export_px_1.10.png')[150:470, 70:450], 'FC10R · 引擎回放 1.10 s（光晕层和 FC9R 逐字节相同）')
show([0.67, 0.50, 0.32, 0.42], L('FC10R_定稿/FC10R_live_px_1.10.png')[150:470, 70:450], 'FC10R · 实时模拟 1.10 s')
m = {}
for i, (t, p, r) in enumerate([('FC9R 火花 ×10', 'FC9R_定稿/FC9R_export_px_1.80.png', (0, 0, 520, 480)), ('FC10R 火花 ×10', 'FC10R_定稿/FC10R_export_px_1.80.png', (0, 0, 520, 480)),
                               ('FanSilver R4（Blender）×10', 'Blender参考/FanSilver_R3R4_用户截图.png', (384, 300, 768, 1060))]):
    im, s = win(p, r); m[t] = s; show([0.01 + i * 0.165, 0.05, 0.155, 0.38], im, t)
rows = [[lab] + [('—' if s.get(k) is None else (f"{s[k]:.2f}" if isinstance(s[k], float) else str(s[k]))) for s in m.values()] for lab, k in
        [('孤立火花（颗）', 'n'), ('核宽 r50（像素）', '核宽r50'), ('边缘宽 80→30 %（像素，越小越锐）', '边缘宽'), ('外裙 / 峰值（发光的一圈）', '外裙'), ('削顶发白的比例', '削顶比例'), ('轮廓不规则', '不规则')]]
ax = fig.add_axes([0.51, 0.05, 0.48, 0.38]); ax.axis('off')
tb = ax.table(cellText=rows, colLabels=['1.80 s，原像素量', 'FC9R', 'FC10R', 'R4（Blender）'], loc='upper left', cellLoc='center', bbox=[0, 0.3, 1, 0.7])
tb.auto_set_font_size(False); tb.set_fontsize(10)
for (i, j), c in tb.get_celld().items(): c.set_facecolor('#1d2027' if i else '#2a2e38'); c.set_edgecolor('#444'); c.get_text().set_color(fg)
ax.text(0, 0.24, 'FC9R 的火花挤成一根连续的金线（孤立火花 4 颗、没有一颗削顶）；FC10R 每粒分得开、核心削顶发白、边缘 1 像素过渡。\n'
        'R4 是单根彗星的近景（约 34 像素 / 米），火花更密、更大；这里是整排扇（约 4 纹素 / 米），所以每粒只有 2–4 像素，\n多边形的棱角要放大才看得清（见 诊断.md 第 8 节）。', color=fg, fontsize=9.5, va='top')
fig.savefig(os.path.join(HERE, '对比_FC10R_火花.png'), dpi=100, facecolor=bg)
json.dump(m, open(os.path.join(HERE, 'FC10R_定稿', '火花量.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok')
