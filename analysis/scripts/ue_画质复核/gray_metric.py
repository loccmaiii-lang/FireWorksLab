# 量化：每根尾缀（列）里「中等亮度却低饱和」的灰白像素数，和总亮像素数；只统计，不改图
import sys, os, json
import numpy as np
from PIL import Image
res = {}
for tag in ['cap-low', 'cap-high']:
    folder = os.path.join(os.path.dirname(__file__), tag)
    out = {}
    for f in sorted(x for x in os.listdir(folder) if x.startswith('t') and x.endswith('.png')):
        a = np.asarray(Image.open(os.path.join(folder, f)).convert('RGB')).astype(float)
        mx = a.max(-1); mn = a.min(-1); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
        row = []
        for i in range(5):
            cx = 784 + 88 * i  # 五根尾缀列中心（1920 宽画面）
            sl = (slice(300, 700), slice(cx - 40, cx + 40))
            m, s = mx[sl], sat[sl]
            bright = int((m > 40).sum())
            gray = int(((m > 40) & (m < 230) & (s < 0.35)).sum())
            hue_px = a[sl][(m > 40) & (m < 230)]
            # 平均 G/R 比：橙色约 0.4–0.7，灰白接近 1
            gr = float((hue_px[:, 1] / np.maximum(hue_px[:, 0], 1)).mean()) if len(hue_px) else None
            row.append({'bright': bright, 'gray': gray, 'G/R': None if gr is None else round(gr, 3)})
        out[f[:-4]] = row
    res[tag] = out
json.dump(res, open(os.path.join(os.path.dirname(__file__), 'gray-metric.json'), 'w'), indent=1)
labels = ['A修前', 'B只修Ramp', 'C已保存', 'D已保存+Ramp', 'E无全分辨率']
for tag in res:
    print('==', tag, '  每格：灰白像素 / 亮像素 (平均G/R)')
    for t, row in res[tag].items():
        if t in ('t01000',): continue
        print(t, ' | '.join(f"{labels[i]} {c['gray']:4d}/{c['bright']:5d} ({c['G/R']})" for i, c in enumerate(row)))
