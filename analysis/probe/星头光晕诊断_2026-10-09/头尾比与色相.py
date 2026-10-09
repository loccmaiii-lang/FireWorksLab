# -*- coding: utf-8 -*-
"""星头直径 : 紧挨星头的尾巴宽度；星头 r50 / 2·r50 处色相。复用 星头剖面.py 的检测结果（剖面.json）。"""
import json, math, os
import numpy as np
import importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('prof', os.path.join(HERE, '星头剖面.py')); P = importlib.util.module_from_spec(spec); spec.loader.exec_module(P)

def bilinear(a, x, y):
    h, w = a.shape[:2]; x = np.clip(x, 0, w - 1.001); y = np.clip(y, 0, h - 1.001)
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int); fx, fy = x - x0, y - y0
    return (a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy) + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy)

def tail_dir(L, cx, cy, rad, toward=None):
    """在半径 rad 的圆上找最亮方向（尾巴）；toward 给了就只在朝那个方向 ±70° 内找"""
    best = None
    for k in range(360):
        t = math.radians(k)
        if toward is not None:
            d = (t - toward + math.pi) % (2 * math.pi) - math.pi
            if abs(d) > math.radians(70): continue
        v = bilinear(L, np.array([cx + rad * math.cos(t)]), np.array([cy + rad * math.sin(t)]))[0]
        if best is None or v > best[0]: best = (v, t)
    return best[1]

def fwhm_across(L, cx, cy, t, dist, half=14):
    px, py = cx + dist * math.cos(t), cy + dist * math.sin(t)
    nx, ny = -math.sin(t), math.cos(t)
    s = np.linspace(-half, half, 4 * half + 1)
    prof = bilinear(L, px + s * nx, py + s * ny)
    bg = np.percentile(prof, 10); pk = prof.max(); hm = bg + (pk - bg) / 2
    above = np.where(prof >= hm)[0]
    if len(above) == 0: return None
    # 只取包含峰值的连续段
    i0 = int(np.argmax(prof)); l = i0; r = i0
    while l > 0 and prof[l - 1] >= hm: l -= 1
    while r < len(prof) - 1 and prof[r + 1] >= hm: r += 1
    return float((r - l + 1) * (s[1] - s[0]))

def hue_deg(rgb):
    r, g, b = rgb; mx, mn = max(rgb), min(rgb)
    if mx - mn < 1e-6: return float('nan')
    if mx == r: h = (g - b) / (mx - mn) % 6
    elif mx == g: h = (b - r) / (mx - mn) + 2
    else: h = (r - g) / (mx - mn) + 4
    return float(h * 60)

def main():
    d = json.load(open(os.path.join(HERE, '剖面.json'), encoding='utf-8'))
    ours = P.load('我们_FC7R截图.png'); refA = P.load('参考A_金菊红头.jpg'); refB = P.load('参考B_红环绿芯.jpg')
    out = {}
    for name, img, per, origin in [('我们', ours, d['我们']['per'], (414, 520)), ('参考A', refA, d['参考A']['per'], (330, 480))]:
        L = P.lum(img); ratios = []; tw = []
        for m in per:
            cx, cy, r50 = m['x'], m['y'], m['r50']
            toward = math.atan2(origin[1] - cy, origin[0] - cx)
            t = tail_dir(L, cx, cy, 2.5 * r50, toward)
            w = fwhm_across(L, cx, cy, t, 3.0 * r50, half=max(8, int(2 * r50)))
            if w and w > 0.8:
                ratios.append(2 * r50 / w); tw.append(w)
        out[name] = dict(头径比尾宽_中位=round(float(np.median(ratios)), 2) if ratios else None, n=len(ratios), 尾宽px_中位=round(float(np.median(tw)), 2) if tw else None)
    for name in ('我们', '参考A', '参考B'):
        per = d[name]['per']
        h50 = [hue_deg(m['r50_rgb']) for m in per]
        out.setdefault(name, {})['r50色相°_中位'] = round(float(np.nanmedian([(h + 180) % 360 - 180 for h in h50])), 1)
        out[name]['r50_rgb_中位'] = [round(float(x), 3) for x in np.median([m['r50_rgb'] for m in per], 0)]
        bg = np.median([m['bg_rgb'] for m in per], 0)
        out[name]['外圈rgb_中位'] = [round(float(x), 3) for x in bg]
        out[name]['外圈色相°'] = round((hue_deg(bg) + 180) % 360 - 180, 1)
    json.dump(out, open(os.path.join(HERE, '头尾比与色相.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == '__main__':
    main()
