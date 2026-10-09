# -*- coding: utf-8 -*-
"""按烘焙器链路（光点核 → 1−e^−x 编码（可 gamma）→ 材质 Ramp(v)·v·4 → 显示 1−e^−x + γ2.2）模拟一颗星头，
换「光点核 / Ramp / 编码 / 曝光」，和 Blender 万彩千轮 C（用户认可的色光）的剖面比。
  python 光感模拟.py → 光感模拟.json、光感模拟.png
"""
import json, math, os, itertools
import numpy as np
import importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('k', os.path.join(HERE, '核模型模拟.py')); K = importlib.util.module_from_spec(spec); spec.loader.exec_module(K)
spec2 = importlib.util.spec_from_file_location('bc', os.path.join(HERE, 'Blender对照.py')); BC = importlib.util.module_from_spec(spec2); spec2.loader.exec_module(BC)
SKY = K.SKY
hl = K.hex_lin


def field(W, H, ppm, L, ss=3):
    ys, xs = np.mgrid[0:H * ss, 0:W * ss]
    px = (xs + .5) / ss - W / 2; py = (ys + .5) / ss - H / 2; d = np.hypot(px, py)
    r = L['size'] * .5 * ppm; I = L['I']
    s = r / 2; core = math.pi * r * r * np.exp(-d * d / (2 * s * s)) / (2 * math.pi * s * s)       # 渐变亮核（coreProfile 1）
    hf = L.get('hf', 0); halo = 0
    if hf > 0:
        E = math.pi * r * r * hf / (1 - hf)
        sh = L.get('shape', 'gauss')
        if sh == 'gauss':
            sg = r * L['hR']; win = 1 - np.clip((d / sg - 3.5) / .5, 0, 1); halo = E * np.exp(-d * d / (2 * sg * sg)) / (2 * math.pi * sg * sg) * win
        elif sh == 'moffat':
            al = r * L['hR']; be = L['beta']; win = 1 - np.clip((d / al - 5) / 1, 0, 1)
            halo = E * (be - 1) / (math.pi * al * al) * (1 + (d / al) ** 2) ** (-be) * win
        elif sh == 'multi':      # 多层柔光：几个高斯（宽度 × 能量份额），总能量 = E
            for k, w in L['layers']:
                sg = r * L['hR'] * k; win = 1 - np.clip((d / sg - 3.5) / .5, 0, 1)
                halo = halo + E * w * np.exp(-d * d / (2 * sg * sg)) / (2 * math.pi * sg * sg) * win
    x = I * (core + halo)
    return x.reshape(H, ss, W, ss).mean((1, 3))


def shade(x, expo, ramp, G=1.0):
    v = np.minimum((1 - np.exp(-x * expo)) ** (1 / G), 253 / 255)
    v = np.floor(v * 255 + 0.5) / 255        # 8 位贴图
    return K.ramp(v, [hl(c) for c in ramp]) * v[..., None] * 4


def display(E): return np.clip(1 - np.exp(-(E + SKY)), 0, 1) ** (1 / 2.2)


def measure(img):
    H, W = img.shape[:2]
    rows = BC.profile(img, [(W / 2 - .5, H / 2 - .5)], min(W, H) / 2 - 2, bg=display(np.zeros(3)))
    return rows[0] if rows else None


RAMP_FC8 = ('#000000', '#3a0608', '#ff1416', '#ffc8cc')
# 「彩色低端」Ramp：暗处就是饱和的正红（不是近黑的暗红），只有最亮那段到白——像 Blender 的「光晕 = 星的颜色 × 亮度」
RAMP_SAT = ('#ff1010', '#ff1010', '#ff3020', '#ffd8d0')
RAMP_SAT2 = ('#e00808', '#ff1410', '#ff4a30', '#fff0ea')
MULTI = [(0.6, 0.12), (1.5, 0.30), (3.0, 0.33), (5.5, 0.25)]   # 近晕 → 远晕，宽度倍数（× 光晕半径）与能量份额，仿万彩千轮 V11 的 near / soft6 / soft14 / soft23


def run(cfg, ppm=4.0, W=200):
    L = dict(cfg); x = field(W, W, ppm, L)
    img = display(shade(x, cfg.get('expo', 1), cfg['ramp'], cfg.get('G', 1)))
    return img, measure(img)


CASES = {
    'FC8R 现状': dict(size=1.4, I=3, hf=.6, hR=2.8, shape='gauss', ramp=RAMP_FC8, expo=6),
    '① 只换彩色 Ramp': dict(size=1.4, I=3, hf=.6, hR=2.8, shape='gauss', ramp=RAMP_SAT, expo=6),
    '② 彩色 Ramp + 降曝光': dict(size=1.4, I=3, hf=.6, hR=2.8, shape='gauss', ramp=RAMP_SAT, expo=1.5),
    '③ ② + 多层柔光': dict(size=1.0, I=3, hf=.7, hR=2.0, shape='multi', layers=MULTI, ramp=RAMP_SAT, expo=1.5),
    '④ ③ + 编码 γ2.2': dict(size=1.0, I=3, hf=.7, hR=2.0, shape='multi', layers=MULTI, ramp=RAMP_SAT, expo=1.0, G=2.2),
    '⑤ 幂律 + 彩色 Ramp': dict(size=1.0, I=3, hf=.7, hR=1.5, shape='moffat', beta=1.6, ramp=RAMP_SAT, expo=1.5),
}


def score(m, tgt):
    e = 0
    for k in (2, 3, 4, 6, 8):
        if f'vis{k}' in m and f'vis{k}' in tgt: e += (math.log(max(m[f'vis{k}'], 1e-3)) - math.log(tgt[f'vis{k}'])) ** 2
        if f'sat{k}' in m and f'sat{k}' in tgt: e += 4 * (m[f'sat{k}'] - tgt[f'sat{k}']) ** 2
    if 'val1' in m: e += 4 * (m['val1'] - tgt['val1']) ** 2
    return e


def main():
    tgt = json.load(open(os.path.join(HERE, 'Blender对照.json'), encoding='utf-8'))['万彩千轮C 玫红']
    out = {}; imgs = {}
    for k, c in CASES.items():
        img, m = run(c); imgs[k] = img
        out[k] = {kk: round(v, 3) for kk, v in m.items() if not isinstance(v, list)}; out[k]['score'] = round(score(m, tgt), 3)
        print(f"{k:<16}", {kk: out[k].get(kk) for kk in ('r50', 'vis2', 'vis4', 'vis8', 'sat2', 'sat4', 'val1', 'val2', 'score')})
    # 搜一下：多层柔光 + 彩色 Ramp 的曝光 / 占比 / 半径
    best = []
    for size, hf, hR, expo, ramp in itertools.product([0.8, 1.0, 1.3], [0.5, 0.65, 0.8], [1.2, 1.6, 2.0, 2.6], [0.8, 1.2, 1.8, 2.6], [RAMP_SAT, RAMP_SAT2]):
        c = dict(size=size, I=3, hf=hf, hR=hR, shape='multi', layers=MULTI, ramp=ramp, expo=expo)
        img, m = run(c, W=160)
        if m: best.append((score(m, tgt), c, m))
    best.sort(key=lambda z: z[0])
    out['搜索前 5（多层柔光 + 彩色 Ramp）'] = [dict(score=round(s, 3), 参数={k: v for k, v in c.items() if k != 'layers'}, 指标={kk: round(v, 3) for kk, v in m.items() if not isinstance(v, list) and kk[:3] in ('vis', 'sat', 'val', 'r50')}) for s, c, m in best[:5]]
    for z in out['搜索前 5（多层柔光 + 彩色 Ramp）'][:3]: print(z)
    c = best[0][1]; imgs['⑥ 搜索最佳'] = run(c)[0]; m = run(c)[1]
    out['⑥ 搜索最佳'] = {kk: round(v, 3) for kk, v in m.items() if not isinstance(v, list)}
    json.dump(dict(目标_万彩千轮C=tgt, 结果=out), open(os.path.join(HERE, '光感模拟.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    plot(imgs, tgt)


def plot(imgs, tgt):
    import matplotlib; matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib import font_manager
    for fn in ['Microsoft YaHei', 'SimHei']:
        if any(fn in f.name for f in font_manager.fontManager.ttflist): plt.rcParams['font.sans-serif'] = [fn]; break
    plt.rcParams['axes.unicode_minus'] = False
    bg, fg = '#15171c', '#e6e6e6'
    from PIL import Image
    pc = np.asarray(Image.open(os.path.join(HERE, 'Blender参考/万彩千轮_C_Soft_右上格.png')).convert('RGB')).astype(float) / 255
    n = len(imgs) + 1; fig = plt.figure(figsize=(3.0 * n, 7.2), facecolor=bg)
    ax = fig.add_axes([0.005, 0.42, 1 / n - 0.01, 0.52]); ax.imshow(pc[340:400, 500:560], interpolation='nearest'); ax.axis('off'); ax.set_title('万彩千轮 C（Blender）', color=fg, fontsize=10)
    for i, (k, im) in enumerate(imgs.items()):
        h = im.shape[0] // 2; c = im[h - 40:h + 40, h - 40:h + 40]
        ax = fig.add_axes([(i + 1) / n + 0.005, 0.42, 1 / n - 0.01, 0.52]); ax.imshow(c, interpolation='nearest'); ax.axis('off'); ax.set_title(k, color=fg, fontsize=10)
    ax = fig.add_axes([0.05, 0.07, 0.9, 0.3]); ax.set_facecolor('#1d2027')
    d = json.load(open(os.path.join(HERE, 'Blender对照.json'), encoding='utf-8'))
    ks = [1, 2, 3, 4, 6, 8]
    ax.plot(ks, [tgt.get(f'vis{k}', np.nan) for k in ks], 'o-', color='#ffffff', lw=2.5, label='万彩千轮 C（目标）')
    for k, im in imgs.items():
        m = measure(im); ax.plot(ks, [m.get(f'vis{q}', np.nan) for q in ks], '.-', lw=1.5, label=k)
    ax.set_yscale('log'); ax.set_ylim(1e-3, 1); ax.set_xlabel('r / r50', color=fg); ax.set_ylabel('光晕亮度 / 峰值', color=fg); ax.tick_params(colors=fg)
    [s.set_color('#555') for s in ax.spines.values()]; ax.legend(fontsize=8, ncol=4, facecolor='#1d2027', labelcolor=fg, edgecolor='#555')
    fig.savefig(os.path.join(HERE, '光感模拟.png'), dpi=100, facecolor=bg)


if __name__ == '__main__':
    main()
