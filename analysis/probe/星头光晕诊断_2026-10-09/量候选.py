# -*- coding: utf-8 -*-
"""量一张烘焙器截图（星头取景.py 的 1 纹素 = 1 像素图）的星头，和实拍 A / B 用同一口径比。
  python 量候选.py <截图.png> [<截图2.png> ...]   → 打印 + 写 <截图>_剖面.json
指标同 星头剖面.py：r10/r50、r3%/r50、r95/r50、饱和度（中心 / r50 / 2·r50）、r50 色相、星间雾；再加尾巴颜色（按亮度分档的色相 / 饱和度，和实拍 A 的金尾比）。"""
import json, math, os, sys
import numpy as np
import importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('prof', os.path.join(HERE, '星头剖面.py')); P = importlib.util.module_from_spec(spec); spec.loader.exec_module(P)
from PIL import Image


def hue(rgb):
    r, g, b = rgb; mx, mn = max(rgb), min(rgb)
    if mx - mn < 1e-6: return float('nan')
    h = ((g - b) / (mx - mn) % 6) if mx == r else (((b - r) / (mx - mn) + 2) if mx == g else ((r - g) / (mx - mn) + 4))
    return (h * 60 + 180) % 360 - 180


def tail_bins(a, exclude=None):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; mx = a.max(-1); mn = a.min(-1); d = mx - mn + 1e-9
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = d / (mx + 1e-9); L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if exclude is not None: L = np.where(exclude, -1, L)
    out = []
    for lo, hi in [(0.15, 0.3), (0.3, 0.5), (0.5, 0.7), (0.7, 0.9)]:
        m = (h > 8) & (h < 60) & (L >= lo) & (L < hi) & (s > 0.25)
        out.append(dict(L=f'{lo}-{hi}', n=int(m.sum()), hue=round(float(np.median(h[m])), 1) if m.sum() else None, sat=round(float(np.median(s[m])), 2) if m.sum() else None))
    return out


def measure(path):
    a = P.load_abs(path) if hasattr(P, 'load_abs') else np.asarray(Image.open(path).convert('RGB')).astype(np.float64) / 255.0
    a = a[:-40] if a.shape[0] > 200 else a      # 去掉底下的说明字
    # 红星头：「红度」R − G 的 7×7 平均取局部最大（金尾 R − G ≈ 0.4，红光晕 ≈ 0.7），互相隔 ≥ 25 像素，最多 7 颗；中心再按亮度找
    red = P.box(a[..., 0] - a[..., 1], 7); L = P.lum(a); h, w = red.shape
    cand = sorted(((red[y, x], x, y) for y in range(8, h - 8, 1) for x in range(8, w - 8, 1) if red[y, x] > 0.25 and red[y, x] >= red[y - 3:y + 4, x - 3:x + 4].max()), reverse=True)
    heads = []
    for v, x, y in cand:
        if all((x - u) ** 2 + (y - q) ** 2 >= 25 ** 2 for u, q in heads): heads.append((x, y))
        if len(heads) >= int(os.environ.get('NHEADS', 7)): break
    heads = [P.refine(L, x, y, 6) for x, y in heads]
    R = sorted(P.analyse('cand', a, heads, 18), key=lambda m: m['m']['x'])
    S = P.summ(R)
    # 星间雾：相邻星头连线中点（按 x 排序）
    sky = np.median(a[5:40, 5:120].reshape(-1, 3), 0)
    hz = P.haze_between(a, [(m['m']['x'], m['m']['y']) for m in R], sky) if len(R) > 1 else []
    hues = [hue(m['m']['r50_rgb']) for m in R]
    # 尾巴颜色：去掉星头周围 3·r50
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]; ex = np.zeros(a.shape[:2], bool)
    for m in R: ex |= np.hypot(xx - m['m']['x'], yy - m['m']['y']) < 3 * max(2, m['m']['r50'])
    out = dict(file=os.path.basename(path), heads=len(R), summary={k: v['median'] for k, v in S.items()},
               星间雾_中位=round(float(np.median(hz)), 3) if hz else None, r50色相_中位=round(float(np.nanmedian(hues)), 1) if hues else None,
               尾巴颜色=tail_bins(a, ex))
    return out


if __name__ == '__main__':
    refA = np.asarray(Image.open(os.path.join(HERE, '输入', '参考A_金菊红头.jpg')).convert('RGB')).astype(np.float64) / 255
    d = json.load(open(os.path.join(HERE, '剖面.json'), encoding='utf-8'))
    print('参考A', {k: v['median'] for k, v in d['参考A']['summary'].items() if k in ('r50', 'shape_r10_r50', 'tail_r03_r50', 'plateau_rp_r50', 'sat_c', 'sat_r50', 'sat_2r50')}, '尾巴', tail_bins(refA))
    print('参考B', {k: v['median'] for k, v in d['参考B']['summary'].items() if k in ('r50', 'shape_r10_r50', 'tail_r03_r50', 'plateau_rp_r50', 'sat_c', 'sat_r50', 'sat_2r50')})
    for p in sys.argv[1:]:
        o = measure(p)
        json.dump(o, open(os.path.splitext(p)[0] + '_剖面.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        s = o['summary']
        print(o['file'], f"星头 {o['heads']} 颗", {k: s.get(k) for k in ('r50', 'shape_r10_r50', 'tail_r03_r50', 'plateau_rp_r50', 'sat_c', 'sat_r50', 'sat_2r50')},
              '星间雾', o['星间雾_中位'], 'r50色相', o['r50色相_中位'], '尾巴', o['尾巴颜色'])
