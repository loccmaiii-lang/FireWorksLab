"""
八重芯变色菊 · 离线物理模拟 + HDR 渲染
输出：UE SubUV 序列帧图集（加色混合，黑底）、单帧序列、预览视频

单位：米、秒。相机正对爆点，近似正交投影（带轻微透视）。
"""
import math, os, sys, subprocess
import numpy as np
from scipy.ndimage import gaussian_filter
from PIL import Image

SEED = 20260926
G = 9.81

# ---------------- 礼花配方（5 号玉尺度） ----------------
# 线性 RGB 焰色：锶红、钡绿、钠/钙金、白
STRONTIUM_RED = (1.00, 0.045, 0.02)
BARIUM_GREEN  = (0.30, 1.00, 0.20)
GOLD_CORE     = (1.00, 0.72, 0.30)
SILVER_WHITE  = (0.85, 0.90, 1.00)

SHELL = dict(
    life=2.55,              # 星体燃烧时间（消え口）
    life_jitter=0.012,      # 寿命离散度：越小熄灭越齐
    layers=[
        # n 星数, v0 初速 m/s, 颜色前/后, 变色时刻, 是否带炭火尾, 亮度
        dict(n=150, v0=150.0, c0=STRONTIUM_RED, c1=BARIUM_GREEN, chg=0.50, tail=True,  I=1.0),
        dict(n=70,  v0=62.0,  c0=GOLD_CORE,     c1=SILVER_WHITE, chg=0.56, tail=False, I=0.85),
    ],
    drag_c=0.030,           # 星体二次阻力系数：终端速度 ≈ sqrt(g/c) ≈ 18 m/s
    spark_rate=95.0,        # 每颗星每秒剥落的炭火火花
)

# ---------------- 黑体颜色 ----------------
def blackbody_rgb(T):
    """Tanner Helland 近似，返回线性 RGB（0..1）"""
    T = np.asarray(T, dtype=np.float64) / 100.0
    r = np.where(T <= 66, 255.0, 329.698727446 * np.power(np.maximum(T - 60, 1e-6), -0.1332047592))
    g = np.where(T <= 66, 99.4708025861 * np.log(np.maximum(T, 1e-6)) - 161.1195681661,
                 288.1221695283 * np.power(np.maximum(T - 60, 1e-6), -0.0755148492))
    b = np.where(T >= 66, 255.0, np.where(T <= 19, 0.0,
                 138.5177312231 * np.log(np.maximum(T - 10, 1e-6)) - 305.0447927307))
    rgb = np.stack([r, g, b], -1).clip(0, 255) / 255.0
    return np.power(rgb, 2.2)  # sRGB → 近似线性


# ---------------- 模拟 ----------------
class Sim:
    def __init__(self, seed=SEED):
        self.rng = np.random.default_rng(seed)
        rng = self.rng
        # 整个球体随机旋转
        a, b, c = rng.uniform(0, 2 * np.pi, 3)
        Rz = np.array([[np.cos(a), -np.sin(a), 0], [np.sin(a), np.cos(a), 0], [0, 0, 1]])
        Rx = np.array([[1, 0, 0], [0, np.cos(b), -np.sin(b)], [0, np.sin(b), np.cos(b)]])
        Ry = np.array([[np.cos(c), 0, np.sin(c)], [0, 1, 0], [-np.sin(c), 0, np.cos(c)]])
        Rm = Rz @ Rx @ Ry

        P, V, C0, C1, CHG, LIFE, TAIL, INT = [], [], [], [], [], [], [], []
        ga = np.pi * (3 - np.sqrt(5))
        for L in SHELL["layers"]:
            n = L["n"]
            i = np.arange(n) + 0.5
            y = 1 - 2 * i / n
            r = np.sqrt(1 - y * y)
            th = i * ga
            d = np.stack([np.cos(th) * r, y, np.sin(th) * r], -1)
            d = d + rng.normal(0, 0.025, d.shape)            # 装填误差 ~1.5°
            d /= np.linalg.norm(d, axis=1, keepdims=True)
            d = d @ Rm.T
            sp = L["v0"] * rng.normal(1.0, 0.03, n)
            V.append(d * sp[:, None])
            P.append(np.zeros((n, 3)))
            C0.append(np.tile(L["c0"], (n, 1)))
            C1.append(np.tile(L["c1"], (n, 1)))
            CHG.append(SHELL["life"] * L["chg"] * rng.normal(1, 0.01, n) if L["chg"] else np.full(n, 1e9))
            LIFE.append(SHELL["life"] * rng.normal(1, SHELL["life_jitter"], n))
            TAIL.append(np.full(n, L["tail"]))
            INT.append(np.full(n, L["I"]))
        self.p = np.concatenate(P); self.v = np.concatenate(V)
        self.c0 = np.concatenate(C0); self.c1 = np.concatenate(C1)
        self.chg = np.concatenate(CHG); self.life = np.concatenate(LIFE)
        self.tail = np.concatenate(TAIL); self.I = np.concatenate(INT)
        self.flick = np.ones(len(self.p))
        self.t = 0.0
        # 火花池
        self.sp_p = np.zeros((0, 3)); self.sp_v = np.zeros((0, 3))
        self.sp_age = np.zeros(0); self.sp_life = np.zeros(0); self.sp_T0 = np.zeros(0)

    def step(self, h):
        rng = self.rng
        alive = self.t < self.life
        # 星体：二次阻力 + 重力
        sp = np.linalg.norm(self.v, axis=1, keepdims=True)
        self.v += (-SHELL["drag_c"] * sp * self.v + np.array([0, -G, 0])) * h
        self.p += self.v * h
        # 星体亮度闪烁（燃烧不稳定）
        self.flick = np.clip(self.flick + rng.normal(0, 0.9, len(self.flick)) * math.sqrt(h) * 2, 0.7, 1.15)

        # 炭火火花剥落
        emit = alive & self.tail
        k = rng.poisson(SHELL["spark_rate"] * h, emit.sum())
        if k.sum() > 0:
            idx = np.repeat(np.nonzero(emit)[0], k)
            m = len(idx)
            sub = rng.uniform(0, 1, m)[:, None]   # 在本步内的随机时刻，避免"成串"
            pos = self.p[idx] - self.v[idx] * h * sub
            vel = self.v[idx] * rng.uniform(0.05, 0.35, (m, 1)) + rng.normal(0, 2.5, (m, 3))
            self.sp_p = np.concatenate([self.sp_p, pos])
            self.sp_v = np.concatenate([self.sp_v, vel])
            self.sp_age = np.concatenate([self.sp_age, sub[:, 0] * h])
            self.sp_life = np.concatenate([self.sp_life, rng.lognormal(np.log(0.55), 0.45, m)])
            self.sp_T0 = np.concatenate([self.sp_T0, rng.normal(2050, 120, m)])

        # 火花：线性阻力（轻），重力，冷却
        if len(self.sp_p):
            self.sp_v += (-2.2 * self.sp_v + np.array([0, -G, 0])) * h
            self.sp_p += self.sp_v * h
            self.sp_age += h
            keep = self.sp_age < self.sp_life
            if not keep.all():
                self.sp_p = self.sp_p[keep]; self.sp_v = self.sp_v[keep]
                self.sp_age = self.sp_age[keep]; self.sp_life = self.sp_life[keep]; self.sp_T0 = self.sp_T0[keep]
        self.t += h

    # 当前时刻的发光体（位置、线性 RGB 辐亮度）
    def emitters(self):
        rng = self.rng
        t = self.t
        # 星头
        alive = t < self.life
        mix = np.clip((t - self.chg) / 0.07, 0, 1)[:, None]   # 变色约 70ms 过渡
        col = self.c0 * (1 - mix) + self.c1 * mix
        # 点燃瞬间的亮度爬升 + 熄灭前的最后一亮
        ign = np.clip(t / 0.06, 0, 1)
        last = 1 + 0.35 * np.exp(-((self.life - t) / 0.05) ** 2)
        hi = (self.I * self.flick * ign * last * alive)[:, None] * col * 60.0
        # 火花：黑体冷却
        if len(self.sp_p):
            u = self.sp_age / self.sp_life
            T = self.sp_T0 * (1 - 0.42 * u)
            s_col = blackbody_rgb(T)
            glow = ((T - 900) / 1150).clip(0, None) ** 3
            twinkle = rng.uniform(0.4, 1.4, len(T))
            s_rad = (glow * twinkle)[:, None] * s_col * 2.6
        else:
            s_rad = np.zeros((0, 3))
        return self.p[alive], hi[alive], self.sp_p, s_rad


# ---------------- 渲染 ----------------
class Cam:
    def __init__(self, res, width_m=235.0, cy=0.40, dist=650.0):
        self.res = res; self.s = res / width_m; self.cy = cy; self.dist = dist
    def project(self, p):
        k = self.dist / (self.dist - p[:, 2])
        x = self.res * 0.5 + p[:, 0] * k * self.s
        y = self.res * self.cy - p[:, 1] * k * self.s
        return x, y

def splat(buf, x, y, rgb):
    """双线性溅射，保证亚像素运动平滑"""
    H, W, _ = buf.shape
    x0 = np.floor(x - 0.5).astype(np.int64); y0 = np.floor(y - 0.5).astype(np.int64)
    fx = (x - 0.5) - x0; fy = (y - 0.5) - y0
    flat = buf.reshape(-1, 3)
    for dx, dy, w in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)),
                      (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        xi = x0 + dx; yi = y0 + dy
        ok = (xi >= 0) & (xi < W) & (yi >= 0) & (yi < H)
        if not ok.any(): continue
        lin = yi[ok] * W + xi[ok]
        for c in range(3):
            flat[:, c] += np.bincount(lin, weights=rgb[ok, c] * w[ok], minlength=H * W)

def render(res, fps, n_frames, t0=0.0, shutter=0.7, h=1 / 600, cb=None):
    sim = Sim()
    cam = Cam(res)
    px = res / 512.0
    frames = []
    ft = 1.0 / fps
    # 预先推进到 t0
    while sim.t < t0 - 1e-9: sim.step(h)
    for f in range(n_frames):
        heads = np.zeros((res, res, 3)); sparks = np.zeros((res, res, 3))
        t_start = t0 + f * ft
        t_open = t_start + shutter * ft
        n = 0
        while sim.t < t_start + ft - 1e-9:
            sim.step(h)
            if sim.t <= t_open + 1e-9:
                hp, hr, spp, spr = sim.emitters()
                if len(hp):
                    x, y = cam.project(hp); splat(heads, x, y, hr)
                if len(spp):
                    x, y = cam.project(spp); splat(sparks, x, y, spr)
                n += 1
        # 能量守恒：分辨率越高，单像素辐亮度越低；以 512 为基准归一
        norm = px * px / max(n, 1)
        heads *= norm; sparks *= norm
        # 星头：核心 + 近场光晕（空气中的散射），大范围 bloom 留给引擎
        hdr = gaussian_filter(heads, (0.75 * px, 0.75 * px, 0)) \
            + 0.10 * gaussian_filter(heads, (3.0 * px, 3.0 * px, 0)) \
            + gaussian_filter(sparks, (0.45 * px, 0.45 * px, 0))
        # 爆炸闪光（开花瞬间的白光）
        tm = t_start + 0.5 * shutter * ft
        if tm < 0.25:
            yy, xx = np.mgrid[0:res, 0:res]
            d2 = (xx - res * 0.5) ** 2 + (yy - res * 0.40) ** 2
            fl = 3.2 * np.exp(-tm / 0.045) * np.exp(-d2 / (2 * (17 * px) ** 2))
            hdr += fl[..., None] * np.array([1.0, 0.92, 0.8])
        # 序列末尾 0.3 秒收尾，保证最后一帧全黑、循环无跳变
        t_end = n_frames * ft
        hdr *= np.clip((t0 + t_end - t_start - ft) / 0.3, 0, 1)
        frames.append(hdr.astype(np.float32))
        if cb: cb(f)
    return frames

# 编码：线性 HDR → 软肩 → sRGB 8bit（UE 中纹理勾 sRGB，材质里乘强度还原 HDR）
def encode(hdr, exposure=1.0):
    x = 1.0 - np.exp(-hdr * exposure)
    x = np.clip(x, 0, 1)
    s = np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(x, 1 / 2.4) - 0.055)
    return (s * 255 + 0.5).astype(np.uint8)

def bloom_preview(hdr):
    """仅用于预览视频：模拟引擎的 Bloom"""
    b = 0.06 * gaussian_filter(hdr, (6, 6, 0)) + 0.035 * gaussian_filter(hdr, (22, 22, 0)) \
        + 0.02 * gaussian_filter(hdr, (60, 60, 0))
    return hdr + b


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    out = "kiku_out"; os.makedirs(out, exist_ok=True)

    if mode in ("test",):
        fr = render(512, 20, 64, cb=None)
        for i in (1, 6, 14, 26, 40, 50, 52, 58):
            Image.fromarray(encode(fr[i])).save(f"{out}/test_{i:02d}.png")
        print("peak", [float(np.percentile(fr[i], 99.95)) for i in (6, 26, 50)])

    if mode in ("atlas", "all"):
        N, R = 64, 512
        fr = render(R, 20, N, cb=lambda f: print("atlas", f, flush=True) if f % 8 == 0 else None)
        os.makedirs(f"{out}/frames", exist_ok=True)
        atlas = np.zeros((R * 8, R * 8, 3), np.uint8)
        for i, hdr in enumerate(fr):
            im = encode(hdr)
            Image.fromarray(im).save(f"{out}/frames/T_Kiku_Yaeshin_{i:03d}.png")
            r, c = divmod(i, 8)
            atlas[r * R:(r + 1) * R, c * R:(c + 1) * R] = im
        Image.fromarray(atlas).save(f"{out}/T_Kiku_Yaeshin_8x8_4K.png", optimize=True)
        Image.fromarray(atlas).resize((2048, 2048), Image.LANCZOS).save(f"{out}/T_Kiku_Yaeshin_8x8_2K.png", optimize=True)
        np.save(f"{out}/_atlas_frames_peak.npy", np.array([float(f.max()) for f in fr]))

    if mode in ("preview", "all"):
        R, fps, N = 1024, 60, 216
        tmp = f"{out}/_pv"; os.makedirs(tmp, exist_ok=True)
        yy = np.linspace(0, 1, R)[:, None, None]
        sky = (np.array([0.0015, 0.0018, 0.0045]) * (1 - yy) + np.array([0.004, 0.005, 0.012]) * yy)
        sky = np.broadcast_to(sky, (R, R, 3))
        lead = 18  # 开花前留 0.3 秒黑场
        blank = encode(sky, 1.0)
        for i in range(lead):
            Image.fromarray(blank).save(f"{tmp}/{i:04d}.png")
        def cb(f):
            if f % 24 == 0: print("preview", f, flush=True)
        fr = render(R, fps, N - lead, cb=cb)
        for i, hdr in enumerate(fr):
            img = encode(bloom_preview(hdr) + sky, 1.0)
            Image.fromarray(img).save(f"{tmp}/{i + lead:04d}.png")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", f"{tmp}/%04d.png",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-movflags", "+faststart",
                        f"{out}/Kiku_Yaeshin_preview.mp4"], check=True)
        print("done preview")
