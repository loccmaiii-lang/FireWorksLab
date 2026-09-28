"""万彩千轮（PrismWheels）单元序列：一颗小球从炸开到熄灭，4 种颜色各一套。

色光用用户认可的 C/D（analysis/replica/万彩千轮_色光CD/复现说明.md，V11 D_Soft 公式与逐粒数据），
在它的静态点位上加上运动：
  - 张开：星点从球心沿各自方向飞到认可的点位，速度按阻力衰减（tau），t_full 秒时到达认可点位；
  - 快门拖影：快门时间内的位置平均，张开快时是短线，慢下来是点；
  - 亮度：炸开时略亮，按逐粒的 death 先后熄灭；
  - 下落不烘进贴图，交给粒子的 Const Acceleration（这样面片可以随机旋转）。

两套输出，给引擎对比「帧数够不够」：
  A 自然色：RGB（sRGB），2048²，4×4 = 16 帧，单格 512；用 RGB 序列材质，颜色就是贴图本身；
  B 灰度 + Ramp：RGBA 接力，2048²，每通道 4×4、共 64 帧，单格 512；用现有 RGBA 序列材质，
    输出 = Ramp(v) × v，v = 亮度^(1/2.2)，Ramp 按自然色反推，所以 B 与 A 颜色一致。

用法：python analysis/scripts/prism_unit.py [输出目录]
"""
import json, math, os, sys, time
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'analysis', 'replica', '万彩千轮_色光CD')
BASE = 'T_EFX_FireWorks_PrismWheels'
COLORS = ['青碧', '玫红', '蓝紫', '橙金']          # stars_0..3 = _01.._04（与 2x2 图集的 01 左上、02 右上、03 左下、04 右下一致）

# ---- 色光：V11 D_Soft（复现说明.md） ----
LOOK = dict(b=1.44, p=0.48, w=2.0, n=2.0, h=0.045)
# ---- 运动 ----
LIFE = 2.2            # 粒子寿命（秒）
TAU = 0.14            # 张开的阻力时间常数
T_FULL = 0.9          # 到达认可点位的时刻
SHUTTER = 1 / 60      # 快门（拖影长度）
FLASH_T = 0.05        # 炸开闪光衰减
BOOST = 0.4           # 刚炸开时的额外亮度
DIE0, DIE1, DIE_FADE = 1.05, 1.0, 0.22   # 熄灭时刻 = DIE0 + death × DIE1，渐隐 DIE_FADE 秒
CELL = 512            # 输出单格
SS = 1024             # 渲染单格（公式的原生坐标，2× 超采样）


def smooth(x): x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)


def expand(t):
    """张开比例：0 → 1（T_FULL 时 = 1）"""
    return (1 - math.exp(-max(t, 0) / TAU)) / (1 - math.exp(-T_FULL / TAU))


def load_stars(k):
    d = json.load(open(os.path.join(SRC, f'stars_{k}.json'), encoding='utf-8'))
    P = np.array([s['pixel'] for s in d]); X = np.array([s['xyz'] for s in d])
    A = np.c_[X, np.ones(len(X))]
    c = np.array([np.linalg.lstsq(A, P[:, 0], rcond=None)[0][3], np.linalg.lstsq(A, P[:, 1], rcond=None)[0][3]])
    off = P - c
    # 缩放使最外面的星加上光晕仍在格子内
    kfit = min(1.0, (SS / 2 - 40) / np.linalg.norm(off, axis=1).max())
    return d, off * kfit, kfit


def frame_times(F, gamma):
    t0, t1 = 0.012, 2.1
    return [t0 + (t1 - t0) * (i / (F - 1)) ** gamma for i in range(F)]


def star_brightness(t, death):
    if t <= 0: return 0.0
    up = min(1.0, t / 0.03)
    b = up * (1 + BOOST * math.exp(-t / 0.12))
    td = DIE0 + death * DIE1
    return b * (1 - float(smooth((t - td) / DIE_FADE)))


_HK = {}


def halo_kernel(s):
    key = id(s)
    if key not in _HK:
        L = LOOK; sg = s['sigma']; rw = int(math.ceil(85 * sg + 3))
        d = np.arange(-rw, rw + 1, dtype=np.float64)
        r2 = d[None, :] ** 2 + d[:, None] ** 2
        G = lambda m: np.exp(-0.5 * r2 / (sg * m) ** 2)
        _HK[key] = {'rw': rw, 'r': np.sqrt(r2), 'no': L['h'] * G(L['n']) + 0.003 * G(8),
                    'soft': 0.022 * G(6) + 0.006 * G(14) + 0.0014 * G(23)}
    return _HK[key]


def render_cell(stars, off, kfit, t):
    """返回 SS×SS×3 线性 raw"""
    L = LOOK; raw = np.zeros((SS, SS, 3), np.float64); c = SS / 2
    yy, xx = _YX
    # 炸开闪光（小白团，很快衰减）
    fl = 3.0 * math.exp(-t / FLASH_T)
    if fl > 1e-3:
        r2 = (xx + 0.5 - c) ** 2 + (yy + 0.5 - c) ** 2
        raw += (fl * np.exp(-0.5 * r2 / 5.0 ** 2) + 0.25 * fl * np.exp(-0.5 * r2 / 18.0 ** 2))[..., None] * np.array([1.0, 0.95, 0.85])
    for s, o in zip(stars, off):
        a = s['amplitude'] * star_brightness(t, s['death'])
        if a < 1e-4: continue
        sg = s['sigma']   # 星点宽度不随布局缩放（保持认可的锐度）
        col = np.array(s['color']); hot = np.array(s['hot'])
        # 快门内的采样位置
        e1, e0 = expand(t), expand(t - SHUTTER)
        d_px = np.linalg.norm(o) * abs(e1 - e0)
        ns = int(np.clip(math.ceil(d_px / 0.7), 1, 40))
        es = [e0 + (e1 - e0) * (j + 0.5) / ns for j in range(ns)] if ns > 1 else [e1]
        ang = math.atan2(o[1], o[0]) if ns > 1 else s['angle']
        asp = max(s['aspect'], 1.0) if ns == 1 else s['aspect']
        # 窄项（主体 + 白芯）逐采样
        rw = int(math.ceil(sg * L['b'] * asp * 6 + 3))
        for e in es:
            px, py = c + o[0] * e, c + o[1] * e
            x0, x1 = max(0, int(px) - rw), min(SS, int(px) + rw + 1); y0, y1 = max(0, int(py) - rw), min(SS, int(py) + rw + 1)
            if x0 >= x1 or y0 >= y1: continue
            dx = xx[y0:y1, x0:x1] + 0.5 - px; dy = yy[y0:y1, x0:x1] + 0.5 - py
            u = dx * math.cos(s['angle']) + dy * math.sin(s['angle']); v = -dx * math.sin(s['angle']) + dy * math.cos(s['angle'])
            body = np.exp(-0.5 * ((u / (sg * L['b'] * s['aspect'])) ** 2 + (v / (sg * L['b'])) ** 2))
            pin = L['w'] * np.exp(-0.5 * (dx * dx + dy * dy) / (sg * L['p']) ** 2)
            raw[y0:y1, x0:x1] += (a / len(es)) * (body[..., None] * hot + pin[..., None])
        # 宽项（近晕、外晕、柔光）只在快门中点算一次；核按星预先算好，只平移
        e = es[len(es) // 2]; px, py = c + o[0] * e, c + o[1] * e
        K = halo_kernel(s)
        rw = K['rw']; ix, iy = int(px), int(py)
        x0, x1 = max(0, ix - rw), min(SS, ix + rw + 1); y0, y1 = max(0, iy - rw), min(SS, iy + rw + 1)
        if x0 >= x1 or y0 >= y1: continue
        sl = (slice(y0 - (iy - rw), y1 - (iy - rw)), slice(x0 - (ix - rw), x1 - (ix - rw)))
        R = max(12, min(px, py, SS - px, SS - py) - 12)
        edge = smooth((R - K['r'][sl]) / (R * 0.30))
        halo = K['no'][sl] + K['soft'][sl] * edge
        raw[y0:y1, x0:x1] += a * halo[..., None] * col
    return raw


def downsample(raw):
    k = SS // CELL
    return raw.reshape(CELL, k, CELL, k, 3).mean(axis=(1, 3))


def tonemap(raw):
    return raw / (1 + raw.max(axis=2, keepdims=True))


def srgb_enc(m):
    return np.where(m <= 0.0031308, m * 12.92, 1.055 * np.power(np.maximum(m, 0), 1 / 2.4) - 0.055)


_YX = np.mgrid[0:SS, 0:SS]
DITHER = np.random.default_rng(902144).random((CELL, CELL, 1))


def to_byte(v):
    return np.clip(np.floor(v * 255 + DITHER), 0, 255).astype(np.uint8)


def ue_pts(keys):
    return '(' + ','.join(f'(InVal={u:.6f},OutVal={v:.6f},ArriveTangent=0.000000,LeaveTangent=0.000000,InterpMode=CIM_Linear)' for u, v in keys) + ')'


def run(out, log=print):
    os.makedirs(out, exist_ok=True)
    tA, tB = frame_times(16, 1.7), frame_times(64, 1.5)
    meta = {'life': LIFE, 'A': {'frames': 16, 'times': tA}, 'B': {'frames': 64, 'times': tB}, 'colors': {}}
    cache = {}
    for k, cname in enumerate(COLORS):
        stars, off, kfit = load_stars(k)
        idx = f'{k + 1:02d}'
        log(f'{cname}（_{idx}）：{len(stars)} 颗星，布局缩放 {kfit:.3f}')
        mapsA, mapsB = [], []
        for t in tA: mapsA.append(tonemap(downsample(render_cell(stars, off, kfit, t))))
        for t in tB: mapsB.append(tonemap(downsample(render_cell(stars, off, kfit, t))))
        # A：自然色 4×4
        atlas = np.zeros((4 * CELL, 4 * CELL, 3), np.uint8)
        for f, m in enumerate(mapsA):
            b = to_byte(srgb_enc(m)); b[m.max(axis=2) < 1e-6] = 0
            r, cc = divmod(f, 4); atlas[r * CELL:(r + 1) * CELL, cc * CELL:(cc + 1) * CELL] = b
        Image.fromarray(atlas).save(os.path.join(out, f'{BASE}_Unit_4x4_{idx}.png'), optimize=True)
        # B：灰度 RGBA 接力（R 0–15、G 16–31、B 32–47、A 48–63），每通道 4×4
        gray = np.zeros((4 * CELL, 4 * CELL, 4), np.uint8)
        hist_w = np.zeros(256); hist_c = np.zeros((256, 3))
        for f, m in enumerate(mapsB):
            M = m.max(axis=2); v = np.power(M, 1 / 2.2)
            vb = to_byte(v[..., None])[..., 0]; vb[M < 1e-6] = 0
            ch, cell = divmod(f, 16); r, cc = divmod(cell, 4)
            gray[r * CELL:(r + 1) * CELL, cc * CELL:(cc + 1) * CELL, ch] = vb
            ok = M > 1e-5; hue = m[ok] / M[ok][:, None]; bins = vb[ok]
            np.add.at(hist_w, bins, M[ok]); np.add.at(hist_c, bins, hue * M[ok][:, None])
        Image.fromarray(gray, 'RGBA').save(os.path.join(out, f'{BASE}_UnitRGBA_4x4_{idx}.png'), optimize=True)
        # Ramp：Ramp(v) × v = 自然色 → Ramp(v) = 色相 × v^1.2
        hue = np.zeros((256, 3)); have = hist_w > 0
        hue[have] = hist_c[have] / hist_w[have][:, None]
        xs = np.arange(256)
        for j in range(3): hue[:, j] = np.interp(xs, xs[have], hue[have, j])
        ker = np.exp(-0.5 * (np.arange(-6, 7) / 3.0) ** 2); ker /= ker.sum()
        hue = np.stack([np.convolve(np.pad(hue[:, j], 6, mode='edge'), ker, 'valid') for j in range(3)], 1)
        hue /= hue.max(axis=1, keepdims=True)
        vv = xs / 255.0
        ramp = hue * np.power(vv, 1.2)[:, None]
        rb = np.clip(np.round(srgb_enc(ramp) * 255), 0, 255).astype(np.uint8)
        Image.fromarray(np.repeat(rb[None], 8, 0)).save(os.path.join(out, f'{BASE}_UnitRGBA_Ramp_{idx}.png'))
        # Cutout：所有帧叠在一起的一张轮廓，512²（A、B 共用）
        occ = np.zeros((CELL, CELL), bool)
        for m in mapsA + mapsB: occ |= m.max(axis=2) >= 3 / 255
        import cv2
        occ = cv2.dilate(occ.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
        cut = (occ * 255).astype(np.uint8)
        Image.fromarray(np.dstack([cut] * 4), 'RGBA').save(os.path.join(out, f'{BASE}_Unit_Cutout_{idx}.png'))
        # 统计：相邻帧的最大位移（输出像素）
        def maxdisp(ts):
            rr = np.linalg.norm(off, axis=1).max() * CELL / SS
            return [rr * abs(expand(ts[i + 1]) - expand(ts[i])) for i in range(len(ts) - 1)]
        meta['colors'][cname] = {'index': idx, 'stars': len(stars), 'layoutScale': round(kfit, 4), 'cutoutCover': round(float(occ.mean()), 3),
                                 'radiusFrac': round(float(np.linalg.norm(off, axis=1).max() / (SS / 2)), 4)}
        cache[cname] = (mapsA, mapsB, rb)
        meta['A']['maxDisp'] = [round(x, 1) for x in maxdisp(tA)]
        meta['B']['maxDisp'] = [round(x, 1) for x in maxdisp(tB)]
    json.dump(meta, open(os.path.join(out, 'PrismWheels_Unit.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return meta, cache


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'analysis', 'results', 'PW1')
    t0 = time.time(); run(out); print(f'完成 {time.time() - t0:.0f}s')
