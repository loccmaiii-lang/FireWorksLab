# -*- coding: utf-8 -*-
"""
按烘焙器 4.9.x 的光点核与显示链路（41_particles40.js / 40_gl.js / 80_render.js）在 Python 里复现星头，
再换参数 / 换核，看星头剖面怎么变。只是原型，不是烘焙器输出。

复现的链路（每层）：
  x = I · (core + halo)              core = 实心圆盘像素覆盖（coreProfile 0）或 σ=r/2 高斯（coreProfile 1）
                                     halo = π r² · hf/(1−hf) · 高斯(σ = haloR · r)，4σ 处收尾
  v = min(1 − exp(−x·曝光), 253/255) 序列贴图编码（encGamma 1）
  E = Ramp_lin(v) · v · 4 · headInt  材质（合并模式）
显示：(1 − exp(−(ΣE + 天空)))^(1/2.2)   FS_POST，预览光晕关

方案：
  现状    FC7R-1 光晕层 headSize 3.5 m / haloFrac .85 / haloR 3.5 + FC7R-2 星头 0.6 m（haloFrac 默认 .22）
  P0      只改参数（现有能力）：光晕层 headSize 1.0、coreProfile 1、haloFrac .30、haloR 3、headBright 3
  P1      新核原型：小高斯亮核 + Moffat(β=2) 光晕（幂律尾巴），能量占比 15%
  P1+红   P1 + 锶红 Ramp（B≈G，不偏玫红）
"""
import json, math, os
import numpy as np
from PIL import Image
import importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('prof', os.path.join(HERE, '星头剖面.py'))
prof = importlib.util.module_from_spec(spec); spec.loader.exec_module(prof)

def hex_lin(h):
    h = h.lstrip('#'); c = np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def ramp(v, R):
    v = np.clip(v, 0, 1)[..., None]
    a = np.where(v < .3, R[0] + (R[1] - R[0]) * (v / .3), 0)
    b = np.where((v >= .3) & (v < .65), R[1] + (R[2] - R[1]) * ((v - .3) / .35), 0)
    c = np.where(v >= .65, R[2] + (R[3] - R[2]) * ((v - .65) / .35), 0)
    return a + b + c

SKY = np.array([.0032, .0038, .009])
RAMP_GLOW = [hex_lin(c) for c in ('#000000', '#4a0618', '#e8205e', '#ff7aa6')]   # FC7R-1
RAMP_COMET = [hex_lin(c) for c in ('#000000', '#5a0820', '#ff3a72', '#ffe8f0')]  # FC7R-2
RAMP_RED = [hex_lin(c) for c in ('#000000', '#3a0500', '#ff2410', '#ffe0d6')]    # 锶红提案

def field(W, H, ppm, heads, layer, ss=4):
    """一层光点的线性 x（贴图编码前）。heads: [(xm, ym)]，单位米；画面中心 = (0,0)"""
    ys, xs = np.mgrid[0:H * ss, 0:W * ss]
    px = (xs + .5) / ss - W / 2; py = (ys + .5) / ss - H / 2
    x = np.zeros_like(px, dtype=np.float64)
    r = layer['size'] * .5 * ppm; I = layer['I']
    for hx, hy in heads:
        d = np.hypot(px - hx * ppm, py - hy * ppm)
        kind = layer.get('kind', 'disc')
        if kind == 'disc':
            core = (d <= r).astype(float)
        elif kind == 'grad':            # coreProfile 1：σ = r/2，总量 π r²
            s = r / 2; core = math.pi * r * r * np.exp(-d * d / (2 * s * s)) / (2 * math.pi * s * s)
        halo = 0
        hf = layer.get('hf', 0)
        if hf > 0 and layer.get('halo', 'gauss') == 'gauss':
            sg = r * max(1, layer.get('hR', 3)); rad = d / sg
            win = 1 - np.clip((rad - 3.5) / .5, 0, 1) ** 2 * (3 - 2 * np.clip((rad - 3.5) / .5, 0, 1))
            halo = math.pi * r * r * hf / (1 - hf) * np.exp(-d * d / (2 * sg * sg)) / (2 * math.pi * sg * sg) * win
        elif hf > 0 and layer['halo'] == 'moffat':
            al = layer['alpha'] * ppm; be = layer['beta']
            halo = math.pi * r * r * hf / (1 - hf) * (be - 1) / (math.pi * al * al) * (1 + (d / al) ** 2) ** (-be)
        x += I * (core + halo)
    # 超采样平均（FS_PACK 线性平均）
    return x.reshape(H, ss, W, ss).mean((1, 3))

def shade(x, expo, R, headInt=1.0):
    v = np.minimum(1 - np.exp(-x * expo), 253 / 255)
    return ramp(v, R) * v[..., None] * 4 * headInt

def display(E):
    c = 1 - np.exp(-(E + SKY)); return np.clip(c, 0, 1) ** (1 / 2.2)

def scene(cfg, ppm, W, H, spacing=14.8, n=3):
    heads = [((i - (n - 1) / 2) * spacing, 0.0) for i in range(n)]
    E = 0
    for L in cfg:
        E = E + shade(field(W, H, ppm, heads, L), L.get('expo', 1.0), L['ramp'], L.get('hi', 1.0))
    return display(E), heads

CFG = {
    '现状 FC7R': [
        dict(size=3.5, I=1.6, hf=.85, hR=3.5, kind='disc', ramp=RAMP_GLOW),
        dict(size=0.6, I=2.2, hf=.22, hR=3, kind='disc', ramp=RAMP_COMET),
    ],
    # 参数搜索.py 的 P0 第 1 名：coreProfile 1、headSize 0.8、headBright 12、haloFrac .35、haloR 2
    'P0 只改参数': [
        dict(size=0.8, I=12, hf=.35, hR=2.0, kind='grad', ramp=RAMP_GLOW),
        dict(size=0.6, I=2.2, hf=.22, hR=3, kind='disc', ramp=RAMP_COMET),
    ],
    # 参数搜索.py 的 P1：渐变亮核 0.7 m + Moffat 光晕 α 1.0 m、β 2.2、能量 0.4
    'P1 幂律光晕核': [
        dict(size=0.7, I=24, hf=.40, kind='grad', halo='moffat', alpha=1.0, beta=2.2, ramp=RAMP_GLOW),
        dict(size=0.6, I=2.2, hf=.22, hR=3, kind='disc', ramp=RAMP_COMET),
    ],
    'P1 + 锶红': [
        dict(size=0.7, I=24, hf=.40, kind='grad', halo='moffat', alpha=1.0, beta=2.2, ramp=RAMP_RED),
        dict(size=0.6, I=2.2, hf=.22, hR=3, kind='disc', ramp=[hex_lin(c) for c in ('#000000', '#4a0800', '#ff4a30', '#fff0ea')]),
    ],
}

def measure(img, heads, ppm, W, H):
    cx, cy = W / 2 + heads[1][0] * ppm - .5, H / 2 + heads[1][1] * ppm - .5
    r, P = prof.radial(img, cx, cy, 40)
    bg = np.nanmedian(P[int(len(r) * .8):], 0)
    m = prof.metrics(r, P, bg)
    rl, Pl = prof.radial(prof.srgb2lin(img), cx, cy, 40)
    fm = prof.fit_models(rl, Pl, np.nanmedian(Pl[int(len(rl) * .8):], 0)); m.update(fm or {})
    # 星间雾：两星中点 / 星头峰值（扣天空）
    L = prof.lum(img); sky = prof.lum(display(np.zeros(3))[None])[0]
    mx = int(round(W / 2 + (heads[0][0] + heads[1][0]) / 2 * ppm)); my = int(round(H / 2))
    m['haze'] = float((L[my, mx] - sky) / max(L[int(round(cy)), int(round(cx))] - sky, 1e-6))
    m['r'] = r.tolist(); m['P'] = P.tolist()
    return m

def main():
    out = {}
    PPM_SHOT = 5.4    # 用户截图：星距 80 px / 14.8 m
    PPM_GAME = 1080 / 3 / 780   # 游戏内大小 1000 m、1080p：0.46 px/m
    W, H = 240, 90
    imgs = {}
    for k, cfg in CFG.items():
        img, heads = scene(cfg, PPM_SHOT, W, H)
        m = measure(img, heads, PPM_SHOT, W, H)
        g, _ = scene(cfg, PPM_GAME, 40, 16, n=7)
        imgs[k] = (img, g)
        out[k] = {kk: (round(v, 3) if isinstance(v, float) else v) for kk, v in m.items() if kk not in ('r', 'P', 'center_rgb', 'r50_rgb')}
        out[k]['_r'] = m['r']; out[k]['_P'] = m['P']
        F = lambda q: float('nan') if m.get(q) is None else m[q]
        print(f"{k:<12} r50={F('r50'):.2f}px  r10/r50={F('shape_r10_r50'):.2f}  r95/r50={F('plateau_rp_r50'):.2f}  "
              f"sat c/r50/2r50={m['sat_c']:.2f}/{m['sat_r50']:.2f}/{m['sat_2r50']:.2f}  moffatβ={F('moffat_beta'):.1f}  "
              f"log残差 M/G={F('moffat_logres'):.2f}/{F('gauss_logres'):.2f}  星间雾={m['haze']:.3f}")
    json.dump({k: {kk: vv for kk, vv in v.items() if not kk.startswith('_')} for k, v in out.items()},
              open(os.path.join(HERE, '核模型模拟.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    figure(imgs, out)

def bright_row(base, ppm, W, H, gains=(0.25, 1, 4)):
    """同一配置、三颗星亮度 ×0.25 / ×1 / ×4：看「越亮看起来越大」"""
    heads = [((i - 1) * 14.8, 0.0) for i in range(3)]
    E = 0
    for L in base:
        x = 0
        for g, h in zip(gains, heads):
            x = x + K_field(W, H, ppm, [h], {**L, 'I': L['I'] * g})
        E = E + shade(x, 1.0, L['ramp'])
    return display(E)

def K_field(*a): return field(*a)

def med_curve(curves, xr):
    ys = []
    for c in curves:
        r = np.array(c['x']); y = np.array(c['y'])
        ys.append(np.interp(xr, r, y, right=np.nan))
    return np.nanmedian(np.array(ys), 0)

def figure(imgs, out):
    import matplotlib; matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
    for fn in ['Microsoft YaHei', 'SimHei']:
        if any(fn in f.name for f in font_manager.fontManager.ttflist): plt.rcParams['font.sans-serif'] = [fn]; break
    plt.rcParams['axes.unicode_minus'] = False
    bgc, fg = '#15171c', '#e6e6e6'
    shot = prof.load('我们_FC7R截图.png'); refB = prof.load('参考B_红环绿芯.jpg'); refA = prof.load('参考A_金菊红头.jpg')
    d = json.load(open(os.path.join(HERE, '剖面.json'), encoding='utf-8'))
    names = list(CFG.keys())
    fig = plt.figure(figsize=(17, 12.5), facecolor=bgc)
    fig.text(0.01, 0.985, '星头 / 光晕：截图实测、实拍、烘焙器链路复现（Python 原型，非烘焙器输出）', color=fg, fontsize=14, va='top')
    # 第 1 列：截图同尺度 5.4 px/m
    col1 = [('用户截图（烘焙器实测）', shot[187:277, 115:355])] + [(k, imgs[k][0]) for k in names]
    for i, (t, im) in enumerate(col1):
        ax = fig.add_axes([0.01, 0.80 - i * 0.155, 0.27, 0.135]); ax.imshow(np.clip(im, 0, 1), interpolation='nearest', aspect='auto'); ax.axis('off')
        ax.set_title(t + ('' if i == 0 else '（模拟，截图同尺度 5.4 px/m）'), color=fg, fontsize=9.5, loc='left')
    # 第 2 列：实拍 + 亮度 ×0.25/1/4
    ax = fig.add_axes([0.295, 0.80, 0.155, 0.135]); ax.imshow(refB[690:790, 450:630], interpolation='nearest', aspect='equal'); ax.axis('off'); ax.set_title('参考B 红星（实拍）', color=fg, fontsize=9.5, loc='left')
    ax = fig.add_axes([0.295, 0.645, 0.155, 0.135]); ax.imshow(refA[70:170, 150:330], interpolation='nearest', aspect='equal'); ax.axis('off'); ax.set_title('参考A 红头（实拍）', color=fg, fontsize=9.5, loc='left')
    for i, k in enumerate(['P0 只改参数', 'P1 幂律光晕核']):
        im = bright_row(CFG[k][:1], 5.4, 240, 90)
        ax = fig.add_axes([0.295, 0.49 - i * 0.155, 0.155, 0.135]); ax.imshow(np.clip(im, 0, 1), interpolation='nearest', aspect='equal'); ax.axis('off')
        ax.set_title(f'{k}：亮度 ×0.25 / ×1 / ×4', color=fg, fontsize=9.5, loc='left')
    # 游戏内 1000 m
    for i, k in enumerate(names):
        ax = fig.add_axes([0.295, 0.17 - i * 0.042, 0.155, 0.034]); ax.imshow(np.clip(imgs[k][1], 0, 1), interpolation='nearest', aspect='auto'); ax.axis('off')
        ax.text(-0.02, 0.5, k, color=fg, fontsize=7.5, ha='right', va='center', transform=ax.transAxes)
    fig.text(0.295, 0.215, '游戏内大小 1000 m · 1080p（0.46 px/m，7 颗一排，最近邻放大）', color=fg, fontsize=9)
    # 剖面
    ax = fig.add_axes([0.52, 0.53, 0.46, 0.40]); ax.set_facecolor('#1d2027')
    xr = np.linspace(0, 6, 300)
    # 实拍：参考 B 每颗淡线
    for x in d['参考B']['per']:
        pass
    cols = ['#ff5c9a', '#ffd166', '#7bd88f', '#ff6a3d']
    for c, k in zip(cols, names):
        r = np.array(out[k]['_r']); P = np.array(out[k]['_P']); L = prof.lum(P); s = np.clip(L - L[-1], 1e-4, None); s /= s[:3].max()
        ax.plot(r / out[k]['r50'], s, color=c, lw=2.2, label=k)
    for nm, ls in [('参考A', '-.'), ('参考B', ':')]:
        mc = med_curve(d[nm]['per_curves'], xr)
        ax.plot(xr, mc, ls, color='#dddddd', lw=1.8, label=f'{nm} 实拍中位剖面（{len(d[nm]["per_curves"])} 颗）')
    ax.plot(xr, np.exp(-np.log(2) * xr ** 2), '--', color='#8ab4f8', lw=1, label='纯高斯（同 r50）')
    ax.set_yscale('log'); ax.set_ylim(5e-3, 1.5); ax.set_xlim(0, 6)
    ax.set_xlabel('r / r50（各自半峰半径归一）', color=fg); ax.set_ylabel('显示亮度（扣背景、峰值 = 1）', color=fg); ax.tick_params(colors=fg)
    [sp.set_color('#555') for sp in ax.spines.values()]
    ax.set_title('星头径向剖面：现状 = 平顶 + 断崖 + 一整圈雾底座', color=fg); ax.legend(fontsize=8.5, facecolor='#1d2027', labelcolor=fg, edgecolor='#555')
    # 表
    ax = fig.add_axes([0.52, 0.05, 0.46, 0.40]); ax.axis('off')
    hdr = ['', 'r50 px', 'r10/r50', 'r3%/r50', '2·r50 饱和', '星间雾', 'r50 色相']
    hue = json.load(open(os.path.join(HERE, '头尾比与色相.json'), encoding='utf-8'))
    def H(rgb):
        r, g, b = rgb; mx, mn = max(rgb), min(rgb)
        if mx - mn < 1e-6: return float('nan')
        h = ((g - b) / (mx - mn) % 6) if mx == r else ((b - r) / (mx - mn) + 2 if mx == g else (r - g) / (mx - mn) + 4)
        return (h * 60 + 180) % 360 - 180
    rows = []
    ds, dA, dB = d['我们']['summary'], d['参考A']['summary'], d['参考B']['summary']
    rows.append(['截图实测', f"{ds['r50']['median']:.1f}", f"{ds['shape_r10_r50']['median']:.2f}", f"{ds['tail_r03_r50']['median']:.2f}", f"{ds['sat_2r50']['median']:.2f}", f"{np.median(d['我们']['星间雾比']):.3f}", f"{hue['我们']['r50色相°_中位']:.0f}°"])
    rows.append(['参考A 实拍', '—', f"{dA['shape_r10_r50']['median']:.2f}", f"{dA['tail_r03_r50']['median']:.2f}", f"{dA['sat_2r50']['median']:.2f}", '≈0（黑天）', f"{hue['参考A']['r50色相°_中位']:.0f}°"])
    rows.append(['参考B 实拍', '—', f"{dB['shape_r10_r50']['median']:.2f}", f"{dB['tail_r03_r50']['median']:.2f}", f"{dB['sat_2r50']['median']:.2f}", '烟（有结构）', f"{hue['参考B']['r50色相°_中位']:.0f}°"])
    for k in names:
        o = out[k]; P = np.array(out[k]['_P']); r = np.array(out[k]['_r']); i50 = int(np.argmin(np.abs(r - o['r50'])))
        t = o.get('tail_r03_r50'); t = '—' if t is None or not np.isfinite(t) else f'{t:.2f}'
        rows.append([k + '（模拟）', f"{o['r50']:.1f}", f"{o['shape_r10_r50']:.2f}", t, f"{o['sat_2r50']:.2f}", f"{o['haze']:.3f}", f"{H(P[i50]):.0f}°"])
    tb = ax.table(cellText=rows, colLabels=hdr, loc='upper left', cellLoc='center', colLoc='center', bbox=[0, 0.42, 1, 0.58])
    tb.auto_set_font_size(False); tb.set_fontsize(9.5)
    for (i, j), c in tb.get_celld().items():
        c.set_facecolor('#1d2027' if i else '#2a2e38'); c.set_edgecolor('#444'); c.get_text().set_color(fg)
    notes = ['读法', '· r10/r50：高斯 1.82；实拍 1.8–2.0（幂律尾巴）；越小越像「实心球」', '· r3%/r50：远处尾巴有多长；— = 3% 以下被雾底座吃掉，量不出',
             '· 星间雾：相邻两星中点 / 星头峰值。现状 ≈ 8%，连成一条粉带', '· 色相：0° 正红，负 = 偏玫红 / 品红', '· 模拟「现状」的 r50 9.4 px、雾 0.078 与截图实测 9.5 px、0.08 对上 → 复现可信；',
             '  断崖比截图陡（模拟里没有快门拖影和截图缩放）']
    ax.text(0, 0.38, '\n'.join(notes), va='top', ha='left', color=fg, fontsize=9.5)
    fig.savefig(os.path.join(HERE, '核模型对比.png'), dpi=105, facecolor=bgc)

if __name__ == '__main__':
    main()
