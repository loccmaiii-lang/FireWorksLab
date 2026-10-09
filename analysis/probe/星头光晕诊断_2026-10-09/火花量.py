# -*- coding: utf-8 -*-
"""量火花粒子（原像素，不缩放）：只取周围 isol 像素内没有更亮火花的孤立火花。
  python 火花量.py <图> [x0,y0,x1,y1] [<图> roi ...]   → 打印 + 火花量.json（追加）
每颗火花：
  - 核宽 r50：亮度降到峰值一半的半径（像素）
  - 边缘宽：亮度从 80 % 到 30 % 峰值走了几像素（越小越锐利；10 % 会被外裙盖住）
  - 平顶：峰值是否削顶（≥ 0.95）+ 削顶像素数（发光感：核心发白一片）
  - 外裙：r50 外 1–3 像素的平均亮度 / 峰值（有没有一圈光）
  - 不规则：50 % 轮廓半径随方位角的变异系数（0 = 正圆）
  - 孤立火花数 / 1000 像素²：火花分不分得开
"""
import json, math, os, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))


def lum(a): return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def sparks(a, roi=None, thr=0.35, isol=5, rmax=7):
    L = lum(a); h, w = L.shape
    x0, y0, x1, y1 = roi or (0, 0, w, h)
    bg = np.percentile(L[y0:y1, x0:x1], 20)
    out = []
    for y in range(max(y0, rmax), min(y1, h - rmax)):
        row = L[y]
        for x in range(max(x0, rmax), min(x1, w - rmax)):
            v = row[x]
            if v < thr: continue
            win = L[y - isol:y + isol + 1, x - isol:x + isol + 1]
            if v < win.max() - 1e-6: continue
            # 孤立：窗口里除了自己这一团，没有别的亮峰（> 0.6 峰值的像素都要和中心连着）
            m = win > 0.5 * (v - bg) + bg
            from collections import deque
            seen = np.zeros_like(m); q = deque([(isol, isol)]); seen[isol, isol] = True
            while q:
                i, j = q.popleft()
                for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ii, jj = i + di, j + dj
                    if 0 <= ii < m.shape[0] and 0 <= jj < m.shape[1] and m[ii, jj] and not seen[ii, jj]: seen[ii, jj] = True; q.append((ii, jj))
            if (m & ~seen).any(): continue
            if seen[0].any() or seen[-1].any() or seen[:, 0].any() or seen[:, -1].any(): continue
            pk = v - bg
            sub = L[y - rmax:y + rmax + 1, x - rmax:x + rmax + 1] - bg
            yy, xx = np.mgrid[-rmax:rmax + 1, -rmax:rmax + 1]; rr = np.hypot(xx, yy)
            # 方位角 16 个方向上的 50 % / 90 % / 10 % 半径（沿射线双线性取样）
            r50s, r90s, r10s = [], [], []
            for k in range(16):
                t = 2 * math.pi * k / 16; c, s_ = math.cos(t), math.sin(t)
                prof = []
                for rs in np.arange(0, rmax, 0.25):
                    px, py = rmax + rs * c, rmax + rs * s_
                    i0, j0 = int(py), int(px); fy, fx = py - i0, px - j0
                    if i0 + 1 >= sub.shape[0] or j0 + 1 >= sub.shape[1]: break
                    prof.append(sub[i0, j0] * (1 - fx) * (1 - fy) + sub[i0, j0 + 1] * fx * (1 - fy) + sub[i0 + 1, j0] * (1 - fx) * fy + sub[i0 + 1, j0 + 1] * fx * fy)
                prof = np.array(prof); rs_ = np.arange(len(prof)) * 0.25
                def cross(f):
                    idx = np.where(prof < f * pk)[0]
                    return float(rs_[idx[0]]) if len(idx) else float('nan')
                r50s.append(cross(.5)); r90s.append(cross(.8)); r10s.append(cross(.3))
            r50 = np.nanmedian(r50s)
            if not np.isfinite(r50) or r50 <= 0: continue
            ring = (rr > r50 + 1) & (rr <= r50 + 3)
            out.append(dict(x=x, y=y, peak=float(v), clip=bool(v >= 0.95), clip_px=int(((L[y - rmax:y + rmax + 1, x - rmax:x + rmax + 1]) >= 0.95).sum()),
                            r50=float(r50), edge=float(np.nanmedian(np.array(r10s) - np.array(r90s))), skirt=float(max(0, sub[ring].mean()) / pk),
                            irr=float(np.nanstd(r50s) / r50), fp=int((sub >= 0.5 * pk).sum())))
    area = (x1 - x0) * (y1 - y0)
    return out, len(out) / area * 1000


def summ(rows, dens):
    if not rows: return dict(n=0)
    f = lambda k: round(float(np.median([r[k] for r in rows])), 3)
    return dict(n=len(rows), 孤立火花每千像素=round(dens, 2), 核宽r50=f('r50'), 边缘宽=f('edge'), 外裙=f('skirt'), 不规则=f('irr'), 半峰面积=f('fp'),
                削顶比例=round(float(np.mean([r['clip'] for r in rows])), 2), 峰值=f('peak'))


if __name__ == '__main__':
    args = sys.argv[1:]; res = {}
    i = 0
    while i < len(args):
        p = args[i]; roi = None
        if i + 1 < len(args) and args[i + 1].count(',') == 3: roi = tuple(int(v) for v in args[i + 1].split(',')); i += 1
        a = np.asarray(Image.open(p if os.path.isabs(p) else os.path.join(HERE, p)).convert('RGB')).astype(np.float64) / 255
        rows, d = sparks(a, roi); res[p] = summ(rows, d); print(p, res[p]); i += 1
    fp = os.path.join(HERE, '火花量.json')
    old = json.load(open(fp, encoding='utf-8')) if os.path.exists(fp) else {}
    old.update(res); json.dump(old, open(fp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
