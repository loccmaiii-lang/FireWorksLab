# -*- coding: utf-8 -*-
"""
星头 / 光晕径向剖面诊断（相机渲染，2026-10-09）
输入：输入/我们_FC7R截图.png、输入/参考A_金菊红头.jpg、输入/参考B_红环绿芯.jpg
输出：剖面对比.png、核模型对比.png、剖面.json

量什么（都是无量纲，避开两张图比例尺不同）：
  - r50 / r10：亮度（扣背景）降到峰值 50% / 10% 的半径（像素）
  - 形状 r10/r50：高斯 = 1.82；Moffat β=2 ≈ 2.0；β=1.5 ≈ 2.6；平顶圆盘 + 高斯会 < 1.6
  - 平顶 rp/r50：亮度 ≥ 95% 峰值的半径 / r50（平顶越大越像「实心球」）
  - 饱和度随半径：中心（r=0）、r50、2·r50 处 (max-min)/max。实拍「热核」= 中心低饱和（发白）、外圈高饱和
  - 线性亮度拟合 Moffat(α, β) 和高斯(σ)，比较残差：谁更像真实点光源
  - 星间雾：两颗相邻星中点的亮度（扣天空）/ 星头峰值
"""
import json, math, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(HERE, '输入')

def load(name):
    a = np.asarray(Image.open(os.path.join(IN, name)).convert('RGB')).astype(np.float64) / 255.0
    return a

def srgb2lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def lum(a):
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]

def box(img, k):
    if k <= 1: return img
    p = k // 2
    pad = np.pad(img, p, mode='edge')
    c = np.cumsum(np.cumsum(pad, 0), 1)
    c = np.pad(c, ((1, 0), (1, 0)))
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)

def refine(L, x, y, r=8):
    h, w = L.shape
    x0, x1, y0, y1 = max(0, x - r), min(w, x + r + 1), max(0, y - r), min(h, y + r + 1)
    sub = box(L, 3)[y0:y1, x0:x1]
    j = np.unravel_index(np.argmax(sub), sub.shape)
    # 亮度加权质心（平顶时 argmax 不稳）
    m = sub >= sub.max() * 0.9
    yy, xx = np.mgrid[y0:y1, x0:x1]
    return float((xx[m] * sub[m]).sum() / sub[m].sum()), float((yy[m] * sub[m]).sum() / sub[m].sum())

def detect_red(a, thr=0.55, mind=9, isol=9, need_red=True, limit=60, region=None):
    """实拍：找红色星头。亮度局部极大 + 外圈偏红；邻近 isol 像素内无更亮的星（干净剖面）"""
    L = lum(a); Ls = box(L, 3)
    h, w = L.shape
    cand = []
    for y in range(4, h - 4):
        row = Ls[y]
        for x in range(4, w - 4):
            v = row[x]
            if v < thr: continue
            win = Ls[y - 2:y + 3, x - 2:x + 3]
            if v < win.max(): continue
            cand.append((v, x, y))
    cand.sort(reverse=True)
    picked = []
    for v, x, y in cand:
        if region and not (region[0] <= x < region[1] and region[2] <= y < region[3]): continue
        if any((x - px) ** 2 + (y - py) ** 2 < mind ** 2 for _, px, py in picked): continue
        picked.append((v, x, y))
    out = []
    for v, x, y in picked:
        # 外圈 3–5 像素的颜色
        yy, xx = np.mgrid[-6:7, -6:7]; rr = np.hypot(xx, yy); ring = (rr >= 3) & (rr <= 5)
        y0, x0 = y - 6, x - 6
        if y0 < 0 or x0 < 0 or y0 + 13 > h or x0 + 13 > w: continue
        patch = a[y0:y0 + 13, x0:x0 + 13]
        R, G, B = patch[..., 0][ring].mean(), patch[..., 1][ring].mean(), patch[..., 2][ring].mean()
        red = R - max(G, B)
        if need_red and red < 0.18: continue
        if any((x - px) ** 2 + (y - py) ** 2 < isol ** 2 and pv > v * 0.5 for pv, px, py in picked if (px, py) != (x, y)): continue
        out.append((x, y, v, red))
        if len(out) >= limit: break
    return out

def radial(a, cx, cy, rmax, step=0.5, stat='median'):
    h, w = a.shape[:2]
    R = int(math.ceil(rmax)) + 1
    x0, x1, y0, y1 = int(cx) - R, int(cx) + R + 1, int(cy) - R, int(cy) + R + 1
    x0c, y0c, x1c, y1c = max(0, x0), max(0, y0), min(w, x1), min(h, y1)
    sub = a[y0c:y1c, x0c:x1c]
    yy, xx = np.mgrid[y0c:y1c, x0c:x1c]
    rr = np.hypot(xx + 0.5 - cx - 0.5, yy + 0.5 - cy - 0.5)
    bins = np.arange(0, rmax + step, step)
    prof = []
    for i in range(len(bins) - 1):
        m = (rr >= bins[i]) & (rr < bins[i + 1])
        if i == 0: m = rr < max(step, 0.75)
        if m.sum() == 0: prof.append([np.nan] * a.shape[2]); continue
        vals = sub[m]
        prof.append(np.median(vals, 0) if stat == 'median' else vals.mean(0))
    rc, pa = (bins[:-1] + step / 2), np.array(prof)
    ok = np.all(np.isfinite(pa), 1)
    return rc[ok], pa[ok]

def metrics(r, P, bg_rgb):
    """P：显示空间 RGB 剖面。返回无量纲指标"""
    Ld = lum(P)
    bg = lum(bg_rgb[None])[0]
    s = np.clip(Ld - bg, 0, None); pk = s[0] if s[0] >= s[:3].max() * 0.98 else s[:3].max()
    def cross(fr):
        for i in range(len(s)):
            if s[i] < fr * pk:
                if i == 0: return r[0]
                r0, r1, v0, v1 = r[i - 1], r[i], s[i - 1], s[i]
                return float(r0 + (fr * pk - v0) * (r1 - r0) / (v1 - v0 + 1e-12))
        return float('nan')
    r50, r20, r10, r03 = cross(0.5), cross(0.2), cross(0.1), cross(0.03)
    rp = cross(0.95)
    def sat_at(rq):
        i = int(np.argmin(np.abs(r - rq)))
        c = np.clip(P[i] - bg_rgb * 0.0, 0, 1)
        mx, mn = c.max(), c.min()
        return float((mx - mn) / (mx + 1e-9))
    return dict(peak=float(pk + bg), r95=rp, r50=r50, r20=r20, r10=r10,
                shape_r10_r50=float(r10 / r50) if r50 > 0 else None, tail_r03_r50=float(r03 / r50) if r50 > 0 else None, r03=r03,
                plateau_rp_r50=float(rp / r50) if r50 > 0 else None,
                sat_c=sat_at(0), sat_r50=sat_at(r50), sat_2r50=sat_at(2 * r50),
                center_rgb=[round(float(x), 3) for x in P[0]], r50_rgb=[round(float(x), 3) for x in P[int(np.argmin(np.abs(r - r50)))]])

def fit_models(r, Plin, bg_lin, clip_lin=0.85):
    """线性亮度拟合：Moffat A(1+(r/α)²)^-β 与 高斯 A·exp(-r²/2σ²)；剔除削顶像素（实拍核心削顶）"""
    y = lum(Plin) - lum(bg_lin[None])[0]
    ok = np.isfinite(y) & (lum(Plin) < clip_lin) & (y > 0)
    rr, yy = r[ok], y[ok]
    if len(rr) < 5: return None
    wts = 1.0 / np.maximum(yy, 1e-3)  # 对数域近似：相对误差
    best_m, best_g = None, None
    for al in np.geomspace(0.3, 30, 60):
        for be in np.linspace(0.6, 6, 55):
            f = (1 + (rr / al) ** 2) ** (-be)
            A = (wts * f * yy).sum() / ((wts * f * f).sum() + 1e-12)
            e = np.sqrt((wts * (yy - A * f) ** 2).sum() / wts.sum()) / (yy.max() + 1e-9)
            if best_m is None or e < best_m[0]: best_m = (e, al, be, A)
    for sg in np.geomspace(0.3, 40, 120):
        f = np.exp(-rr ** 2 / (2 * sg * sg))
        A = (wts * f * yy).sum() / ((wts * f * f).sum() + 1e-12)
        e = np.sqrt((wts * (yy - A * f) ** 2).sum() / wts.sum()) / (yy.max() + 1e-9)
        if best_g is None or e < best_g[0]: best_g = (e, sg, A)
    # 对数残差（看尾巴）：只看 y 在 [2%, 60%] 峰值的点
    sel = (yy > 0.02 * yy.max()) & (yy < 0.6 * yy.max())
    def logres(f):
        if sel.sum() < 3: return None
        return float(np.sqrt(np.mean((np.log(yy[sel]) - np.log(np.maximum(f[sel], 1e-9))) ** 2)))
    fm = best_m[3] * (1 + (rr / best_m[1]) ** 2) ** (-best_m[2])
    fg = best_g[2] * np.exp(-rr ** 2 / (2 * best_g[1] ** 2))
    return dict(moffat_alpha=float(best_m[1]), moffat_beta=float(best_m[2]), moffat_err=float(best_m[0]), moffat_logres=logres(fm),
                gauss_sigma=float(best_g[1]), gauss_err=float(best_g[0]), gauss_logres=logres(fg), n=int(len(rr)))

def analyse(tag, a, heads, rmax, bg_r=None):
    lin = srgb2lin(a)
    res = []
    for (x, y) in heads:
        cx, cy = refine(lum(a), int(round(x)), int(round(y)), 5)
        r, P = radial(a, cx, cy, rmax)
        r2, Pl = radial(lin, cx, cy, rmax)
        # 背景：剖面最外 20% 的中位数（实拍天空 / 我们的天空 + 雾）
        n = len(r); bg = np.nanmedian(P[int(n * 0.8):], 0); bgl = np.nanmedian(Pl[int(n * 0.8):], 0)
        m = metrics(r, P, bg); fm = fit_models(r2, Pl, bgl)
        m.update(dict(x=round(cx, 1), y=round(cy, 1), bg_rgb=[round(float(v), 3) for v in bg]))
        if fm: m.update(fm)
        if not (np.isfinite(m['r50']) and np.isfinite(m['r10']) and m['r50'] > 0): continue
        res.append(dict(m=m, r=r.tolist(), P=P.tolist(), Pl=Pl.tolist()))
    return res

def summ(rs, keys=('r50', 'r10', 'shape_r10_r50', 'tail_r03_r50', 'plateau_rp_r50', 'sat_c', 'sat_r50', 'sat_2r50', 'moffat_beta', 'moffat_logres', 'gauss_logres')):
    out = {}
    for k in keys:
        v = [x['m'].get(k) for x in rs if x['m'].get(k) is not None and np.isfinite(x['m'].get(k))]
        if v: out[k] = dict(median=round(float(np.median(v)), 3), p25=round(float(np.percentile(v, 25)), 3), p75=round(float(np.percentile(v, 75)), 3), n=len(v))
    return out

def haze_between(a, pts, sky_rgb):
    """相邻星中点的亮度（扣天空）/ 两星峰值均值"""
    L = lum(a); sky = lum(np.array(sky_rgb)[None])[0]; out = []
    pts = sorted(pts)
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        mx, my = int(round((x0 + x1) / 2)), int(round((y0 + y1) / 2))
        mid = np.median(L[my - 2:my + 3, mx - 2:mx + 3])
        p = (box(L, 3)[int(y0), int(x0)] + box(L, 3)[int(y1), int(x1)]) / 2
        out.append(float((mid - sky) / max(p - sky, 1e-6)))
    return out

def main():
    ours = load('我们_FC7R截图.png'); refA = load('参考A_金菊红头.jpg'); refB = load('参考B_红环绿芯.jpg')
    # 我们：7 颗星头（截图上手点的大概位置，refine 找质心）
    ours_guess = [(163, 226), (234, 193), (329, 177), (414, 201), (506, 176), (568, 229), (642, 276)]
    ours_heads = [refine(lum(ours), x, y, 8) for x, y in ours_guess]
    # 实拍：自动找红色、周围干净的星头
    detB = detect_red(refB, thr=0.55, mind=8, isol=10, region=(0, 736, 150, 1100))
    detA = detect_red(refA, thr=0.55, mind=8, isol=10, region=(0, 736, 0, 1000))
    headsB = [(x, y) for x, y, v, red in detB][:40]
    headsA = [(x, y) for x, y, v, red in detA][:25]
    R_ours = analyse('ours', ours, ours_heads, 40)
    R_A = analyse('refA', refA, headsA, 16)
    R_B = analyse('refB', refB, headsB, 16)
    sky_ours = np.median(ours[20:60, 40:120].reshape(-1, 3), 0)
    haze_o = haze_between(ours, ours_heads, sky_ours)
    out = dict(
        说明='显示空间（sRGB 8 位）量；拟合在线性亮度上、剔除削顶像素。r 单位 = 各自图片像素，形状指标无量纲。',
        我们=dict(heads=len(R_ours), summary=summ(R_ours), per=[x['m'] for x in R_ours], 星间雾比=[round(v, 3) for v in haze_o], 天空rgb=[round(float(v), 3) for v in sky_ours]),
        参考A=dict(heads=len(R_A), summary=summ(R_A), per=[x['m'] for x in R_A]),
        参考B=dict(heads=len(R_B), summary=summ(R_B), per=[x['m'] for x in R_B]),
    )
    # 星距：参考 B 红环上星的最近邻距离
    def nn(pts):
        d = []
        for i, (x, y) in enumerate(pts):
            dd = [math.hypot(x - u, y - v) for j, (u, v) in enumerate(pts) if j != i]
            if dd: d.append(min(dd))
        return float(np.median(d)) if d else None
    out['我们']['最近星距px'] = nn(ours_heads)
    allB = [(x, y) for x, y, v, red in detect_red(refB, thr=0.5, mind=6, isol=0, region=(100, 650, 150, 650), limit=200)]
    out['参考B']['红环最近星距px'] = nn(allB)
    def curves(R):
        cs = []
        for x in R:
            m = x['m']; r = np.array(x['r']); Pp = np.array(x['P']); L = lum(Pp); bg = lum(np.array(m['bg_rgb'])[None])[0]
            s_ = np.clip(L - bg, 1e-4, None); s_ = s_ / max(s_[:3].max(), 1e-6)
            cs.append(dict(x=[round(float(v), 3) for v in r / m['r50']], y=[round(float(v), 5) for v in s_]))
        return cs
    out['我们']['per_curves'] = curves(R_ours); out['参考A']['per_curves'] = curves(R_A); out['参考B']['per_curves'] = curves(R_B)
    with open(os.path.join(HERE, '剖面.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    plot(ours, refA, refB, R_ours, R_A, R_B, ours_heads, headsA, headsB)
    print(json.dumps({k: (v['summary'] if isinstance(v, dict) and 'summary' in v else None) for k, v in out.items() if k != '说明'}, ensure_ascii=False, indent=1))
    print('星间雾比(我们):', out['我们']['星间雾比'], ' 最近星距 我们/参考B:', out['我们']['最近星距px'], out['参考B']['红环最近星距px'])

def plot(ours, refA, refB, R_ours, R_A, R_B, ho, ha, hb):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
    for fn in ['Microsoft YaHei', 'SimHei', 'Noto Sans CJK SC']:
        if any(fn in f.name for f in font_manager.fontManager.ttflist):
            plt.rcParams['font.sans-serif'] = [fn]; break
    plt.rcParams['axes.unicode_minus'] = False
    bgc = '#15171c'; fg = '#e6e6e6'
    fig = plt.figure(figsize=(16, 10), facecolor=bgc)
    def ax_style(ax):
        ax.set_facecolor('#1d2027'); ax.tick_params(colors=fg); [s.set_color('#555') for s in ax.spines.values()]
        ax.xaxis.label.set_color(fg); ax.yaxis.label.set_color(fg); ax.title.set_color(fg)
    # 上排：星头放大（各取 4 颗，按各自 r50 缩放到同样视野 ±4·r50）
    def crops(a, R, k=4):
        out = []
        for x in sorted(R, key=lambda q: -q['m']['peak'])[:k]:
            m = x['m']; s = max(3, int(round(4 * m['r50'])))
            cx, cy = int(round(m['x'])), int(round(m['y']))
            c = a[max(0, cy - s):cy + s + 1, max(0, cx - s):cx + s + 1]
            out.append((c, m))
        return out
    rows = [('我们 FC7R', crops(ours, R_ours)), ('参考A 红头', crops(refA, R_A)), ('参考B 红星', crops(refB, R_B))]
    for i, (name, cs) in enumerate(rows):
        for j, (c, m) in enumerate(cs):
            ax = fig.add_axes([0.02 + j * 0.075, 0.70 - i * 0.215 + 0.0, 0.07, 0.2]); ax.imshow(np.clip(c, 0, 1), interpolation='nearest'); ax.axis('off')
            ax.set_title(f'{name}\nr50={m["r50"]:.1f}px' if j == 0 else f'r50={m["r50"]:.1f}px', color=fg, fontsize=8)
    # 右：亮度剖面（扣背景、归一）vs r/r50，对数
    ax = fig.add_axes([0.36, 0.55, 0.30, 0.40]); ax_style(ax)
    cols = {'我们 FC7R': '#ff5c9a', '参考A 红头': '#ffb347', '参考B 红星': '#ff3b30'}
    for name, R in [('我们 FC7R', R_ours), ('参考A 红头', R_A), ('参考B 红星', R_B)]:
        for k, x in enumerate(R):
            m = x['m']; r = np.array(x['r']); P = np.array(x['P']); L = lum(P); bg = lum(np.array(m['bg_rgb'])[None])[0]
            s = np.clip(L - bg, 1e-4, None); s = s / max(s[:3].max(), 1e-6)
            ax.plot(r / m['r50'], s, color=cols[name], alpha=0.25 if name != '我们 FC7R' else 0.7, lw=1, label=name if k == 0 else None)
    xr = np.linspace(0, 6, 200)
    ax.plot(xr, np.exp(-np.log(2) * xr ** 2), '--', color='#8ab4f8', lw=1.5, label='高斯（同 r50）')
    for be, ls in [(1.5, ':'), (2.5, '-.')]:
        k_ = math.sqrt(2 ** (1 / be) - 1)
        ax.plot(xr, (1 + (xr * k_) ** 2) ** (-be), ls, color='#b0e57c', lw=1.2, label=f'Moffat β={be}（同 r50，线性）')
    ax.set_yscale('log'); ax.set_ylim(5e-3, 1.5); ax.set_xlim(0, 6); ax.set_xlabel('r / r50'); ax.set_ylabel('显示亮度（扣背景、峰值=1）')
    ax.set_title('星头径向剖面（显示空间）'); ax.legend(fontsize=8, facecolor='#1d2027', labelcolor=fg, edgecolor='#555')
    # 右下：饱和度 vs r/r50
    ax = fig.add_axes([0.36, 0.07, 0.30, 0.38]); ax_style(ax)
    for name, R in [('我们 FC7R', R_ours), ('参考A 红头', R_A), ('参考B 红星', R_B)]:
        for k, x in enumerate(R):
            m = x['m']; r = np.array(x['r']); P = np.array(x['P'])
            sat = (P.max(1) - P.min(1)) / (P.max(1) + 1e-9)
            sel = r <= 4 * m['r50']
            ax.plot((r / m['r50'])[sel], sat[sel], color=cols[name], alpha=0.25 if name != '我们 FC7R' else 0.7, lw=1, label=name if k == 0 else None)
    ax.set_xlim(0, 4); ax.set_ylim(0, 1.02); ax.set_xlabel('r / r50'); ax.set_ylabel('饱和度 (max-min)/max')
    ax.set_title('颜色随半径：实拍中心发白、外圈饱和'); ax.legend(fontsize=8, facecolor='#1d2027', labelcolor=fg, edgecolor='#555')
    # 最右：指标表
    ax = fig.add_axes([0.69, 0.07, 0.30, 0.88]); ax.axis('off')
    def med(R, k):
        v = [x['m'].get(k) for x in R if x['m'].get(k) is not None and np.isfinite(x['m'].get(k))]
        return float(np.median(v)) if v else float('nan')
    lines = ['指标（中位数）           我们   参考A  参考B']
    for k, lab in [('r50', 'r50 像素'), ('shape_r10_r50', '形状 r10/r50'), ('plateau_rp_r50', '平顶 r95/r50'), ('sat_c', '中心饱和度'), ('sat_r50', 'r50 处饱和度'), ('sat_2r50', '2·r50 饱和度'), ('moffat_beta', 'Moffat β'), ('moffat_logres', 'Moffat 对数残差'), ('gauss_logres', '高斯 对数残差')]:
        lines.append(f'{lab:<16}{med(R_ours, k):>8.2f}{med(R_A, k):>7.2f}{med(R_B, k):>7.2f}')
    lines += ['', f'样本：我们 {len(R_ours)} 颗、参考A {len(R_A)} 颗、参考B {len(R_B)} 颗', '',
              '读法：', '· 形状：高斯 1.82；Moffat β=2.5 约 1.9，β=1.5 约 2.4',
              '  平顶圆盘+宽高斯 → r95 大、颈部陡、尾巴是一整团', '· 平顶 r95/r50：实心球 → 接近 1；点光源 → 小',
              '· 中心饱和度低 = 削顶发白（热核）', '· 对数残差小的模型更像']
    ax.text(0, 1, '\n'.join(lines), va='top', ha='left', color=fg, fontsize=10)
    fig.savefig(os.path.join(HERE, '剖面对比.png'), dpi=110, facecolor=bgc)

if __name__ == '__main__':
    main()
