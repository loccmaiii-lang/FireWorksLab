"""引线层 + 锦火星层原型（4.0 期间的实验，不进 tool/src；验证后交 4.0 负责人移植）。

一个三维模拟（每颗星：二次阻力 + 重力），画成两层，位置完全来自同一批星：
  O 层「引线」：星从点火到换药（tSwitch）走过的轨迹画成一条**连续的线**。线上每一点的亮度只看它的「年龄」
       （那一段是多久以前烧出来的）：I = oBright · exp(-age/oTau)。线的长短、亮度分布、颜色都是直接参数，
       不由随机火花的寿命 / 冷却去凑，所以不会断、不会从中心挤成一团。
  G 层「锦」：换药以后的轨迹画成淡的金线（gLine）+ 一颗颗离散火星（延迟后闪亮，锦 / 辉星的特征）。
       火星从星的位置出生、继承一点速度、很快被阻力停住、慢慢下落。

两种相机：'below' = 沿重力方向看（和实拍 尾缀3.0_A 一样从下往上仰拍，只用于考卷对照）；
          'side'  = 侧面平视（交付用：游戏里的视角）。同一个模拟。
所有长度单位：米；时间：秒（开花 = 0）。
"""
import numpy as np, cv2

G = 9.81

DEFAULT = dict(
    seed=7, stars=220, v0=250.0, vt=20.0, speedJit=3.0, starJit=0.35,   # starJit：每颗星亮度对数离散（近大远小、药量差）      # 速度离散 %（薄球壳）
    tSwitch=1.22, tSwitchJit=0.10,                             # 换药时刻（开花后秒）及离散（秒，正态 σ）
    tEnd=4.6, tEndJit=0.35,                                    # 星烧完
    # O 层（橙引线）
    oTau=1.5, oEmber=0.0, oEmberTau=2.5, oRise=0.1, oIgn=0.25,   # oEmber：暗长余烬占比（木炭火花：亮的短燃 + 暗的长余烬）
    oBright=1.0, oBack=0.0,   # oIgn：引药点着后发射率爬升的时间（按发射时刻，不按年龄）
      # oRise：火花刚离开星时还没烧旺，亮度按 1-exp(-age/oRise) 升起
     oDrift=0.0, oFall=2.0, oWidth=0.55,  # oWidth：线宽高斯 σ（交付像素）
    oFade=0.25,                                                 # 换药后整条橙线额外衰减时间常数（秒）：引药烧完、余光退去
    # G 层（锦）
    gLine=0.35, gTau=0.45, gWidth=0.55,
    sparkRate=70.0, sparkInherit=1.0, sparkBack=40.0, sparkDragT=0.45, sparkFall=3.5,
    sparkDelay=0.18, sparkDelayJit=0.6, sparkFlash=0.05, sparkGlow=0.10, sparkBright=1.6, sparkSize=0.75,
    sparkLife=1.1,                                              # 火星从出生到闪完的最长时间
)


class Shell:
    def __init__(self, P=None, dt=1 / 1200, T=None):
        self.P = P = {**DEFAULT, **(P or {})}
        rng = np.random.default_rng(P['seed'])
        n = int(P['stars'])
        # 均匀球面方向（斐波那契 + 小抖动）
        i = np.arange(n) + 0.5
        phi = np.arccos(1 - 2 * i / n); th = np.pi * (1 + 5 ** 0.5) * i
        d = np.stack([np.cos(th) * np.sin(phi), np.cos(phi), np.sin(th) * np.sin(phi)], 1)
        d += rng.normal(0, 0.02, d.shape); d /= np.linalg.norm(d, axis=1, keepdims=True)
        v0 = P['v0'] * (1 + rng.normal(0, P['speedJit'] / 100, n))
        self.T = T or (P['tEnd'] + P['tEndJit'] * 3 + 0.2)
        steps = int(self.T / dt) + 1
        self.dt = dt
        pos = np.zeros((steps, n, 3), np.float32); vel = np.zeros((steps, n, 3), np.float32)
        p = np.zeros((n, 3)); v = d * v0[:, None]
        c = G / P['vt'] ** 2                       # 二次阻力：dv/dt = g - c|v|v（终端速度 vt）
        g = np.array([0, -G, 0])
        for k in range(steps):
            pos[k] = p; vel[k] = v
            # 半隐式（大速度时稳定）
            sp = np.linalg.norm(v, axis=1, keepdims=True)
            v = (v + g * dt) / (1 + c * sp * dt)
            p = p + v * dt
        self.pos, self.vel = pos, vel
        self.tS = np.clip(P['tSwitch'] + rng.normal(0, P['tSwitchJit'], n), 0.3, None)
        self.tE = P['tEnd'] + rng.normal(0, P['tEndJit'], n)
        self.n = n
        self.bj = np.exp(P['starJit'] * rng.normal(0, 1, n))
        # 锦火星：每颗星换药后按泊松出生（时间预先抽好，帧间一致）
        sp_t, sp_s, sp_d = [], [], []
        for s in range(n):
            dur = max(0.0, self.tE[s] - self.tS[s]); k = rng.poisson(P['sparkRate'] * dur)
            tt = np.sort(rng.uniform(self.tS[s], self.tS[s] + dur, k))
            sp_t.append(tt); sp_s.append(np.full(k, s)); sp_d.append(P['sparkDelay'] * np.exp(P['sparkDelayJit'] * rng.normal(0, 1, k)))
        self.sp_t = np.concatenate(sp_t); self.sp_s = np.concatenate(sp_s).astype(int); self.sp_d = np.concatenate(sp_d)
        self.sp_ph = rng.uniform(0.6, 1.4, len(self.sp_t))     # 每颗火星亮度离散

    def idx(self, t):
        return np.clip(np.round(np.asarray(t) / self.dt).astype(int), 0, self.pos.shape[0] - 1)


def _drift(v, a, inherit, tau, fall, back=0.0):
    """火花出生速度 = 星速度 × inherit − back × 星运动方向（向后喷出），按 tau 被阻力停住；
    之后以 fall m/s 的终端速度下落（向 -y）。星慢下来以后 back 比星速还大，火花在空中其实是往回（往中心）飘的。"""
    k = 1 - np.exp(-a / tau)
    vh = v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-6)
    d = (v * inherit - vh * back) * (tau * k)[..., None]
    tf = max(fall / G, 1e-3)
    d[..., 1] -= fall * (a - tf * (1 - np.exp(-a / tf)))
    return d


CAM_D = 300.0   # 考卷相机：在爆点正下方 CAM_D 米处仰拍（尾缀3.0_A 从发射点附近拍，尺玉开花高度约 300 m）


def project(p, cam):
    if cam == 'below':                                     # 透视仰拍：离相机近（下方、往下落）的星显得大
        k = CAM_D / np.maximum(CAM_D + p[..., 1], 1.0)
        return p[..., 0] * k, p[..., 2] * k, k * k           # 亮度按距离平方反比
    one = np.ones(p.shape[:-1])
    if cam == 'below_ortho': return p[..., 0], p[..., 2], one
    return p[..., 0], -p[..., 1], one                      # 侧面：屏幕 y 向下


class Canvas:
    def __init__(self, w, h, ppm, cx, cy, ss=2):
        self.ss = ss; self.w, self.h = w * ss, h * ss; self.ppm = ppm * ss; self.cx, self.cy = cx * ss, cy * ss
        self.buf = np.zeros(self.h * self.w, np.float64)

    def splat(self, x, y, wgt):
        X = x * self.ppm + self.cx; Y = y * self.ppm + self.cy
        x0 = np.floor(X).astype(int); y0 = np.floor(Y).astype(int); fx = X - x0; fy = Y - y0
        for dx, dy, ww in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
            xx = x0 + dx; yy = y0 + dy; m = (xx >= 0) & (xx < self.w) & (yy >= 0) & (yy < self.h)
            np.add.at(self.buf, yy[m] * self.w + xx[m], (wgt * ww)[m])

    def image(self, sigma_px):
        im = self.buf.reshape(self.h, self.w).astype(np.float32)
        s = max(sigma_px * self.ss, 0.5)
        im = cv2.GaussianBlur(im, (0, 0), s)
        return cv2.resize(im, (self.w // self.ss, self.h // self.ss), interpolation=cv2.INTER_AREA) * (self.ss * self.ss) / self.ss


def _line(cv, sh, t, cam, e0, e1, wfun, drift):
    """沿每颗星 [e0, e1] 的轨迹画连续线：按屏幕上 ≤ 0.3 px 一个采样点，权重 = 亮度 × 线段长度（像素）。"""
    P = sh.P
    ks = sh.idx(e0); ke = sh.idx(e1)
    for s in range(sh.n):
        a, b = ks[s], ke[s]
        if b <= a: continue
        k = np.arange(a, b + 1)
        p = sh.pos[k, s].astype(np.float64); v = sh.vel[k, s].astype(np.float64)
        age = t - k * sh.dt
        p = p + _drift(v, age, *drift)
        x, y, br = project(p, cam)
        seg = np.hypot(np.diff(x), np.diff(y)) * cv.ppm
        # 稀疏的地方插值加密
        m = max(1, int(np.ceil(seg.max() / 0.3))) if len(seg) else 1
        if m > 1:
            u = np.linspace(0, len(x) - 1, (len(x) - 1) * m + 1)
            x = np.interp(u, np.arange(len(x)), x); y = np.interp(u, np.arange(len(y)), y); age = np.interp(u, np.arange(len(age)), age); br = np.interp(u, np.arange(len(br)), br)
            seg = np.hypot(np.diff(x), np.diff(y)) * cv.ppm
        # 权重按「发射时间」分配（每秒烧出的火花一样多）：星飞得快的那段（开花初期、靠近中心）火花铺得稀、看起来暗，
        # 星慢下来以后（靠近星头）铺得密、看起来亮——这就是实拍里线外段比内段亮的原因。
        wt = np.full(len(x), sh.dt / m)
        cv.splat(x, y, wfun(age, s) * wt * br * 1000.0)


def render(sh, t, cam, w, h, ppm, cx, cy, ss=2, which='OG'):
    """返回 (O, G) 两层线性亮度图（交付像素）；which 只渲其中一层时另一层返回 0。"""
    P = sh.P
    if which == 'O': return _render_O(sh, t, cam, w, h, ppm, cx, cy, ss), np.zeros((h, w), np.float32)
    if which == 'G': return np.zeros((h, w), np.float32), _render_G(sh, t, cam, w, h, ppm, cx, cy, ss)
    return _render_O(sh, t, cam, w, h, ppm, cx, cy, ss), _render_G(sh, t, cam, w, h, ppm, cx, cy, ss)


def _render_O(sh, t, cam, w, h, ppm, cx, cy, ss):
    P = sh.P
    # O 层：点火 → 换药之间的轨迹
    cvO = Canvas(w, h, ppm, cx, cy, ss)
    e1 = np.minimum(t, sh.tS); e0 = np.zeros(sh.n)
    def wO(age, s):
        post = max(0.0, t - sh.tS[s]); e = t - age
        ign = np.clip(e / max(P['oIgn'], 1e-4), 0, 1) ** 2 * (3 - 2 * np.clip(e / max(P['oIgn'], 1e-4), 0, 1))
        return ign * sh.bj[s] * P['oBright'] * ((1 - P['oEmber']) * np.exp(-age / P['oTau']) + P['oEmber'] * np.exp(-age / P['oEmberTau'])) * (1 - np.exp(-np.maximum(age, 0) / max(P['oRise'], 1e-4))) * np.exp(-post / P['oFade']) * (t < sh.tE[s] + 0.5)
    _line(cvO, sh, t, cam, e0, e1, wO, (P['oDrift'], 0.3, P['oFall'], P['oBack']))
    return cvO.image(P['oWidth'])


def _render_G(sh, t, cam, w, h, ppm, cx, cy, ss):
    P = sh.P
    # G 层：换药之后的淡金线 + 离散火星
    cvG = Canvas(w, h, ppm, cx, cy, ss)
    e0 = sh.tS; e1 = np.minimum(t, sh.tE)
    def wG(age, s): return sh.bj[s] * P['gLine'] * np.exp(-age / P['gTau'])
    _line(cvG, sh, t, cam, e0, e1, wG, (P['sparkInherit'], P['sparkDragT'], P['sparkFall'], P['sparkBack']))
    Gl = cvG.image(P['gWidth'])
    cvS = Canvas(w, h, ppm, cx, cy, ss)
    born = sh.sp_t; a = t - born; m = (a >= 0) & (a < P['sparkLife'])
    if m.any():
        k = sh.idx(born[m]); s = sh.sp_s[m]; aa = a[m]; dd = sh.sp_d[m]
        p = sh.pos[k, s].astype(np.float64) + _drift(sh.vel[k, s].astype(np.float64), aa, P['sparkInherit'], P['sparkDragT'], P['sparkFall'], P['sparkBack'])
        # 亮度：出生时一点余光（glow，很快变暗），延迟 dd 后闪一下（sparkFlash 秒的高斯）
        I = P['sparkGlow'] * np.exp(-aa / 0.08) + P['sparkBright'] * np.exp(-0.5 * ((aa - dd) / P['sparkFlash']) ** 2)
        x, y, br = project(p, cam)
        cvS.splat(x, y, I * sh.sp_ph[m] * sh.bj[s] * br)
    S = cvS.image(P['sparkSize'])
    return Gl + S


# 颜色（只用于预览 / 考卷合成；素材里是灰度 + Ramp + Color Over Life）
RAMP_O = np.array([[0, 0, 0], [150, 78, 22], [243, 140, 44], [255, 190, 110]], np.float32)   # RGB，按灰度 0, .35, .75, 1
RAMP_G = np.array([[0, 0, 0], [140, 95, 45], [214, 165, 92], [252, 236, 190]], np.float32)
RAMP_X = np.array([0, .35, .75, 1.0])


def tone(L, expo):
    return 1 - np.exp(-L * expo)


def ramp(g, R):
    out = np.stack([np.interp(g, RAMP_X, R[:, c]) for c in range(3)], -1)
    return out


def compose(O, Gm, expo):
    """加色叠加两层（和引擎里两个发射器叠加一样），返回 BGR uint8。"""
    c = ramp(tone(O, expo), RAMP_O) + ramp(tone(Gm, expo), RAMP_G)
    return np.clip(c[..., ::-1], 0, 255).astype(np.uint8)
