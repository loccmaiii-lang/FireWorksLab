# -*- coding: utf-8 -*-
"""Blender（用户认可的光感：万彩千轮 C/D 色光、银彩菊原生渲染）vs 烘焙器 FC8R：星头在不同半径上的亮度、饱和度、明度。
  python Blender对照.py  → Blender对照.json、Blender对照.png
口径：显示空间 8 位图；每颗星取方位角中位数剖面；半径用各自的 r50（亮度降到峰值一半）归一，所以不怕两边比例尺不同。
关键量：
  - 光晕可见度 L(k·r50)/L(0)，k = 2 / 4 / 8（扣背景）
  - 光晕的颜色：k·r50 处的饱和度 (max−min)/max 和明度 max（明度低 = 暗红 / 发黑；饱和高 + 明度够 = 鲜艳的彩色光晕）
"""
import json, math, os
import numpy as np
from PIL import Image
import importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('prof', os.path.join(HERE, '星头剖面.py')); P = importlib.util.module_from_spec(spec); spec.loader.exec_module(P)


def load(p): return np.asarray(Image.open(os.path.join(HERE, p)).convert('RGB')).astype(np.float64) / 255


def heads_by(a, key, n, mind, thr):
    """key：每像素打分（亮度 / 红度），7×7 平均后取局部最大，互相隔 mind 像素"""
    k = P.box(key, 5); h, w = k.shape; L = P.lum(a)
    c = sorted(((k[y, x], x, y) for y in range(10, h - 10) for x in range(10, w - 10) if k[y, x] > thr and k[y, x] >= k[y - 3:y + 4, x - 3:x + 4].max()), reverse=True)
    out = []
    for v, x, y in c:
        if all((x - u) ** 2 + (y - q) ** 2 >= mind ** 2 for u, q in out): out.append((x, y))
        if len(out) >= n: break
    return [P.refine(L, x, y, 4) for x, y in out]


def profile(a, heads, rmax, bg=None):
    rows = []
    for cx, cy in heads:
        r, Pp = P.radial(a, cx, cy, rmax, step=0.5)
        if len(r) < 10: continue
        b = bg if bg is not None else np.nanmedian(Pp[int(len(r) * .85):], 0)
        Ld = P.lum(Pp) - P.lum(b[None])[0]; pk = Ld[:2].max()
        if pk <= 0.05: continue
        i = np.where(Ld < 0.5 * pk)[0]
        if not len(i) or i[0] == 0: continue
        j = i[0]; r50 = r[j - 1] + (0.5 * pk - Ld[j - 1]) * (r[j] - r[j - 1]) / (Ld[j] - Ld[j - 1] + 1e-12)
        rec = dict(x=cx, y=cy, r50=float(r50), peak=float(pk))
        for k in (1, 2, 3, 4, 6, 8):
            q = int(np.argmin(np.abs(r - k * r50)))
            if abs(r[q] - k * r50) > 1.0: continue
            c = Pp[q]; mx, mn = c.max(), c.min()
            rec[f'vis{k}'] = float(max(Ld[q], 0) / pk); rec[f'sat{k}'] = float((mx - mn) / (mx + 1e-9)); rec[f'val{k}'] = float(mx)
        rec['r'] = (r / r50).tolist(); rec['L'] = (np.clip(Ld, 1e-4, None) / pk).tolist(); rec['S'] = ((Pp.max(1) - Pp.min(1)) / (Pp.max(1) + 1e-9)).tolist(); rec['V'] = Pp.max(1).tolist()
        rows.append(rec)
    return rows


def summ(rows):
    o = {'n': len(rows), 'r50': round(float(np.median([x['r50'] for x in rows])), 2)}
    for k in (1, 2, 3, 4, 6, 8):
        for m in ('vis', 'sat', 'val'):
            v = [x[f'{m}{k}'] for x in rows if f'{m}{k}' in x]
            if v: o[f'{m}{k}'] = round(float(np.median(v)), 3)
    return o


def main():
    S = {}
    # 万彩千轮 C_Soft（用户 09-28 认可的色光）：右上格 = 玫红
    pc = load('Blender参考/万彩千轮_C_Soft_右上格.png')
    hp = heads_by(pc, P.lum(pc), 30, 40, 0.25)
    S['万彩千轮C 玫红'] = profile(pc, hp, 44, bg=np.zeros(3))
    # 银彩菊 V02 原生（用户截图那版）：外层粉头（头上接线，剖面会带一点线）
    sv = load('Blender参考/银彩菊_2.65.png')
    red = sv[..., 0] - np.maximum(sv[..., 1], sv[..., 2]) * 0.6
    hs = heads_by(sv, P.lum(sv) * (red > 0.25), 40, 14, 0.45)
    S['银彩菊 粉头'] = profile(sv, hs, 14, bg=np.zeros(3))
    # 烘焙器 FC8R（引擎回放，1 纹素 = 1 像素）
    f8 = load('FC8R_定稿/FC8R_export_px_1.80.png')[:-40]
    rd = P.box(f8[..., 0] - f8[..., 1], 7)
    h8 = heads_by(f8, rd, 7, 25, 0.25)
    S['FC8R 引擎回放'] = profile(f8, h8, 40)
    out = {k: summ(v) for k, v in S.items()}
    json.dump(out, open(os.path.join(HERE, 'Blender对照.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for k, v in out.items(): print(k, v)
    plot(S, out)


def plot(S, out):
    import matplotlib; matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
    for fn in ['Microsoft YaHei', 'SimHei']:
        if any(fn in f.name for f in font_manager.fontManager.ttflist): plt.rcParams['font.sans-serif'] = [fn]; break
    plt.rcParams['axes.unicode_minus'] = False
    bg, fg = '#15171c', '#e6e6e6'
    fig, axs = plt.subplots(1, 3, figsize=(17, 5.2), facecolor=bg)
    cols = {'万彩千轮C 玫红': '#ff4fa0', '银彩菊 粉头': '#c78bff', 'FC8R 引擎回放': '#ffb347'}
    xr = np.linspace(0, 8, 200)
    for name, rows in S.items():
        for key, ax in zip(('L', 'S', 'V'), axs):
            ys = np.array([np.interp(xr, x['r'], x[key], right=np.nan) for x in rows])
            ax.plot(xr, np.nanmedian(ys, 0), color=cols[name], lw=2.2, label=f"{name}（{len(rows)} 颗）")
    for ax, t, yl in zip(axs, ('亮度（扣背景、峰值 = 1，对数）', '饱和度 (max−min)/max', '明度 max(R,G,B)'), (None, (0, 1.02), (0, 1.02))):
        ax.set_facecolor('#1d2027'); ax.tick_params(colors=fg); [s.set_color('#555') for s in ax.spines.values()]
        ax.set_title(t, color=fg); ax.set_xlabel('r / r50', color=fg); ax.set_xlim(0, 8)
        if yl: ax.set_ylim(*yl)
        ax.legend(fontsize=8.5, facecolor='#1d2027', labelcolor=fg, edgecolor='#555')
    axs[0].set_yscale('log'); axs[0].set_ylim(3e-3, 1.5)
    fig.suptitle('星头：Blender（你认可的光感）vs 烘焙器 FC8R —— 半径归一后的亮度 / 颜色', color=fg, fontsize=13)
    fig.tight_layout(); fig.savefig(os.path.join(HERE, 'Blender对照.png'), dpi=100, facecolor=bg)


if __name__ == '__main__':
    main()
