"""万彩千轮（PrismWheels）单元序列：一颗小球从炸开到熄灭，每种颜色一套。

星点的发光方式用用户认可的 C/D 色光（analysis/replica/万彩千轮_色光CD/复现说明.md，V11 D_Soft 公式、逐粒点位），
在静态点位上加运动：
  - 张开：星点从球心飞到点位，速度按阻力衰减；
  - 快门拖影：张开快时是短线，慢下来是点；
  - 亮度：炸开时略亮，按逐粒 death 先后熄灭；
  - 下落不烘进贴图，交给粒子的 Const Acceleration（面片可以随机旋转）。

版本（--set）：
  PW1：颜色用 C/D 包里的颜色（青碧 / 玫红 / 蓝紫 / 橙金），不变色；
  PW2：颜色按实拍 万彩千轮A/B 测得：炸开后约 1 秒是本色（青绿 / 银白 / 淡黄 / 珊瑚红），
       然后整颗球变金色，熄灭前转橙（见 计划.md「PW2 颜色」）。

每个版本两套贴图，给引擎对比「帧数够不够」：
  A 自然色：RGB（sRGB），2048²，4×4 = 16 帧，单格 512；颜色就是贴图本身；
  B 灰度 + Ramp：RGBA 接力，2048²，每通道 4×4、共 64 帧，单格 512；输出 = Ramp(v) × v。
    B 的 Ramp 只能表示「亮度 → 颜色」，表示不了「时间 → 颜色」，所以 PW2 的变色在 B 里要靠 Color Over Life（见参数表）。

用法：python analysis/scripts/prism_unit.py --set PW2 [输出目录]
"""
import json, math, os, sys, time
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'analysis', 'replica', '万彩千轮_色光CD')
BASE = 'T_EFX_FireWorks_PrismWheels'


def hex_lin(h):
    c = np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return c / c.max()


# 每个版本：颜色（index = 贴图序号，layout = 用哪一套点位 stars_k），时间轴
SETS = {
    'PW1': dict(life=2.2, full=0.9, die0=1.05, die1=1.0, fade=0.22, t_end=2.1,
                colors=[dict(name='青碧', index='01', layout=0), dict(name='玫红', index='02', layout=1),
                        dict(name='蓝紫', index='03', layout=2), dict(name='橙金', index='04', layout=3)]),
    # 实拍 万彩千轮B：炸开后 0–1.0 s 本色，约 1.0 s 起 0.15 s 内变金（实拍金段 #fec85e–#fbf39e，按显示亮度取偏亮的 #ffe08a），1.4–2.4 s 陆续熄灭，熄灭前转橙
    'PW2': dict(life=2.6, full=0.9, die0=1.4, die1=0.9, fade=0.28, t_end=2.5,
                change=(1.0, 0.12, 0.15), gold='#ffe08a', ember='#ffa24a',
                colors=[dict(name='青绿', index='01', layout=0, hex='#46feb4'), dict(name='银白', index='02', layout=1, hex='#fff1ea'),
                        dict(name='淡黄', index='03', layout=2, hex='#f6e877'), dict(name='珊瑚红', index='04', layout=3, hex='#ff4a36')]),
}

LOOK = dict(b=1.44, p=0.48, w=2.0, n=2.0, h=0.045)   # V11 D_Soft
TAU = 0.14; SHUTTER = 1 / 60; FLASH_T = 0.05; BOOST = 0.4
CELL = 512; SS = 1024


def smooth(x): x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)


class Unit:
    def __init__(self, cfg, col):
        self.cfg, self.col = cfg, col
        d = json.load(open(os.path.join(SRC, f"stars_{col['layout']}.json"), encoding='utf-8'))
        P = np.array([s['pixel'] for s in d]); X = np.array([s['xyz'] for s in d])
        A = np.c_[X, np.ones(len(X))]
        c = np.array([np.linalg.lstsq(A, P[:, 0], rcond=None)[0][3], np.linalg.lstsq(A, P[:, 1], rcond=None)[0][3]])
        off = P - c
        self.kfit = min(1.0, (SS / 2 - 40) / np.linalg.norm(off, axis=1).max())
        self.off = off * self.kfit; self.stars = d
        rng = np.random.default_rng(int(col['index']) * 7919)
        if 'hex' in col:   # 实拍颜色：同一颗球内每颗星色相、明暗略有差别
            base = hex_lin(col['hex'])
            for s in d:
                j = base * (1 + rng.normal(0, 0.06, 3)); j = np.clip(j, 0, None); j /= j.max()
                s['_c1'] = j; s['_chg'] = cfg['change'][0] + rng.uniform(-cfg['change'][1], cfg['change'][1])
            self.gold, self.ember = hex_lin(cfg['gold']), hex_lin(cfg['ember'])
        self.hk = {}

    def expand(self, t):
        return (1 - math.exp(-max(t, 0) / TAU)) / (1 - math.exp(-self.cfg['full'] / TAU))

    def star_color(self, s, t):
        """返回 (color 光晕色, hot 主体色)"""
        if '_c1' not in s: return np.array(s['color']), np.array(s['hot'])
        c = s['_c1']
        k = float(smooth((t - s['_chg']) / self.cfg['change'][2]))
        c = c * (1 - k) + self.gold * k
        td = self.cfg['die0'] + s['death'] * self.cfg['die1']
        e = float(smooth((t - (td - 0.2)) / 0.4)) * k
        c = c * (1 - e) + self.ember * e
        return c, c * 0.65 + 0.35

    def brightness(self, s, t):
        if t <= 0: return 0.0
        b = min(1.0, t / 0.03) * (1 + BOOST * math.exp(-t / 0.12))
        td = self.cfg['die0'] + s['death'] * self.cfg['die1']
        return b * (1 - float(smooth((t - td) / self.cfg['fade'])))

    def kernel(self, s):
        key = id(s)
        if key not in self.hk:
            L = LOOK; sg = s['sigma']; rw = int(math.ceil(85 * sg + 3))
            d = np.arange(-rw, rw + 1, dtype=np.float64); r2 = d[None, :] ** 2 + d[:, None] ** 2
            G = lambda m: np.exp(-0.5 * r2 / (sg * m) ** 2)
            self.hk[key] = {'rw': rw, 'r': np.sqrt(r2), 'no': L['h'] * G(L['n']) + 0.003 * G(8), 'soft': 0.022 * G(6) + 0.006 * G(14) + 0.0014 * G(23)}
        return self.hk[key]

    def render(self, t):
        L = LOOK; raw = np.zeros((SS, SS, 3)); c = SS / 2; yy, xx = _YX
        fl = 3.0 * math.exp(-t / FLASH_T)
        if fl > 1e-3:
            r2 = (xx + 0.5 - c) ** 2 + (yy + 0.5 - c) ** 2
            raw += (fl * np.exp(-0.5 * r2 / 5.0 ** 2) + 0.25 * fl * np.exp(-0.5 * r2 / 18.0 ** 2))[..., None] * np.array([1.0, 0.95, 0.85])
        for s, o in zip(self.stars, self.off):
            a = s['amplitude'] * self.brightness(s, t)
            if a < 1e-4: continue
            sg = s['sigma']; col, hot = self.star_color(s, t)
            e1, e0 = self.expand(t), self.expand(t - SHUTTER)
            ns = int(np.clip(math.ceil(np.linalg.norm(o) * abs(e1 - e0) / 0.7), 1, 40))
            es = [e0 + (e1 - e0) * (j + 0.5) / ns for j in range(ns)] if ns > 1 else [e1]
            rw = int(math.ceil(sg * L['b'] * s['aspect'] * 6 + 3))
            ca, sa = math.cos(s['angle']), math.sin(s['angle'])
            for e in es:
                px, py = c + o[0] * e, c + o[1] * e
                x0, x1 = max(0, int(px) - rw), min(SS, int(px) + rw + 1); y0, y1 = max(0, int(py) - rw), min(SS, int(py) + rw + 1)
                if x0 >= x1 or y0 >= y1: continue
                dx = xx[y0:y1, x0:x1] + 0.5 - px; dy = yy[y0:y1, x0:x1] + 0.5 - py
                u = dx * ca + dy * sa; v = -dx * sa + dy * ca
                body = np.exp(-0.5 * ((u / (sg * L['b'] * s['aspect'])) ** 2 + (v / (sg * L['b'])) ** 2))
                pin = L['w'] * np.exp(-0.5 * (dx * dx + dy * dy) / (sg * L['p']) ** 2)
                raw[y0:y1, x0:x1] += (a / len(es)) * (body[..., None] * hot + pin[..., None])
            e = es[len(es) // 2]; px, py = c + o[0] * e, c + o[1] * e
            K = self.kernel(s); rw = K['rw']; ix, iy = int(px), int(py)
            x0, x1 = max(0, ix - rw), min(SS, ix + rw + 1); y0, y1 = max(0, iy - rw), min(SS, iy + rw + 1)
            if x0 >= x1 or y0 >= y1: continue
            sl = (slice(y0 - (iy - rw), y1 - (iy - rw)), slice(x0 - (ix - rw), x1 - (ix - rw)))
            R = max(12, min(px, py, SS - px, SS - py) - 12)
            halo = K['no'][sl] + K['soft'][sl] * smooth((R - K['r'][sl]) / (R * 0.30))
            raw[y0:y1, x0:x1] += a * halo[..., None] * col
        k = SS // CELL
        raw = raw.reshape(CELL, k, CELL, k, 3).mean(axis=(1, 3))
        return raw / (1 + raw.max(axis=2, keepdims=True))


_YX = np.mgrid[0:SS, 0:SS]
DITHER = np.random.default_rng(902144).random((CELL, CELL, 1))


def srgb_enc(m): return np.where(m <= 0.0031308, m * 12.92, 1.055 * np.power(np.maximum(m, 0), 1 / 2.4) - 0.055)
def to_byte(v): return np.clip(np.floor(v * 255 + DITHER), 0, 255).astype(np.uint8)


def frame_times(cfg, F, gamma):
    t0, t1 = 0.012, cfg['t_end']
    return [t0 + (t1 - t0) * (i / (F - 1)) ** gamma for i in range(F)]


def run(set_id, out, log=print):
    import cv2
    cfg = SETS[set_id]; os.makedirs(out, exist_ok=True)
    tA, tB = frame_times(cfg, 16, 1.7), frame_times(cfg, 64, 1.5)
    meta = {'set': set_id, 'life': cfg['life'], 'A': {'frames': 16, 'times': tA}, 'B': {'frames': 64, 'times': tB}, 'colors': {}}
    for col in cfg['colors']:
        u = Unit(cfg, col); idx = col['index']
        log(f"{col['name']}（_{idx}）：{len(u.stars)} 颗星")
        mapsA = [u.render(t) for t in tA]; mapsB = [u.render(t) for t in tB]
        atlas = np.zeros((4 * CELL, 4 * CELL, 3), np.uint8)
        for f, m in enumerate(mapsA):
            b = to_byte(srgb_enc(m)); b[m.max(axis=2) < 1e-6] = 0
            r, q = divmod(f, 4); atlas[r * CELL:(r + 1) * CELL, q * CELL:(q + 1) * CELL] = b
        Image.fromarray(atlas).save(os.path.join(out, f'{BASE}_Unit_4x4_{idx}.png'), optimize=True)
        gray = np.zeros((4 * CELL, 4 * CELL, 4), np.uint8); hw = np.zeros(256); hc = np.zeros((256, 3))
        for f, m in enumerate(mapsB):
            M = m.max(axis=2); vb = to_byte(np.power(M, 1 / 2.2)[..., None])[..., 0]; vb[M < 1e-6] = 0
            ch, cell = divmod(f, 16); r, q = divmod(cell, 4)
            gray[r * CELL:(r + 1) * CELL, q * CELL:(q + 1) * CELL, ch] = vb
            if tB[f] < cfg.get('change', (9,))[0] - 0.1:   # Ramp 只取本色段（变色交给 Color Over Life）
                ok = M > 1e-5; np.add.at(hw, vb[ok], M[ok]); np.add.at(hc, vb[ok], m[ok] / M[ok][:, None] * M[ok][:, None])
        Image.fromarray(gray, 'RGBA').save(os.path.join(out, f'{BASE}_UnitRGBA_4x4_{idx}.png'), optimize=True)
        hue = np.zeros((256, 3)); have = hw > 0; xs = np.arange(256)
        hue[have] = hc[have] / hw[have][:, None]
        for j in range(3): hue[:, j] = np.interp(xs, xs[have], hue[have, j])
        ker = np.exp(-0.5 * (np.arange(-6, 7) / 3.0) ** 2); ker /= ker.sum()
        hue = np.stack([np.convolve(np.pad(hue[:, j], 6, mode='edge'), ker, 'valid') for j in range(3)], 1)
        hue /= hue.max(axis=1, keepdims=True)
        if 'change' in cfg: hue[:] = 1.0   # 会变色的版本：Ramp 用中性白，颜色全交给 Color Over Life
        ramp = hue * np.power(xs / 255.0, 1.2)[:, None]
        Image.fromarray(np.repeat(np.clip(np.round(srgb_enc(ramp) * 255), 0, 255).astype(np.uint8)[None], 8, 0)).save(os.path.join(out, f'{BASE}_UnitRGBA_Ramp_{idx}.png'))
        occ = np.zeros((CELL, CELL), np.uint8)
        for m in mapsA + mapsB: occ |= (m.max(axis=2) >= 3 / 255).astype(np.uint8)
        occ = cv2.dilate(occ, np.ones((7, 7), np.uint8))
        Image.fromarray(np.dstack([occ * 255] * 4).astype(np.uint8), 'RGBA').save(os.path.join(out, f'{BASE}_Unit_Cutout_{idx}.png'))
        rr = np.linalg.norm(u.off, axis=1).max()
        meta['colors'][col['name']] = {'index': idx, 'stars': len(u.stars), 'cutoutCover': round(float(occ.mean()), 3), 'radiusFrac': round(float(rr / (SS / 2)), 4)}
        md = lambda ts: [round(rr * CELL / SS * abs(u.expand(ts[i + 1]) - u.expand(ts[i])), 1) for i in range(len(ts) - 1)]
        meta['A']['maxDisp'], meta['B']['maxDisp'] = md(tA), md(tB)
    json.dump(meta, open(os.path.join(out, 'PrismWheels_Unit.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return meta


if __name__ == '__main__':
    a = sys.argv[1:]; sid = 'PW2'
    if '--set' in a: i = a.index('--set'); sid = a[i + 1]; del a[i:i + 2]
    out = a[0] if a else os.path.join(ROOT, 'analysis', 'results', sid)
    t0 = time.time(); run(sid, out); print(f'完成 {time.time() - t0:.0f}s')
