"""升空尾缀 · 物理模型（第二代，2026-09-29）

用户反馈（09-29）：之前的尾缀都是「一条线 + 周围一些粒子 + 头上一个光点」，不对。
按实拍（尾缀A/B/C 远景、尾缀3.0_A 近景跟拍、十六寸永丰）量出来的规律重做，原理见 analysis/升空尾缀_物理.md。

模型在「地面坐标」（三维，z 向上）里算，不是随弹体坐标：
- 弹体：竖直方向二次阻力弹道 v(t) = √(g/k)·tan(atan(v0√(k/g)) − √(gk)t)，横向按实拍量的倾斜；
  弹体本身有小幅摆动（尾缀B 0.2–0.35 m、尾缀A 0.7 m，波长 30–40 m），这就是尾迹上「冻住」的大波浪。
- 曲导（昇り竜的火药筒）从出膛一直烧到开花，向后喷：
    火焰：星头后面一小段燃气焰（泪滴形，长度随速度变长）,
    火粉：极多、极小、寿命 0.1–0.3 s 的细火花 → 星头后的连续白热段,
    金火星：木炭颗粒，一簇一簇喷出（燃烧不均匀），对数正态粒径，寿命 ∝ 粒径²，燃烧期温度稳定、快烧完才变橙变暗，闪烁,
    落火：少量大颗，寿命长，下坠快，零星掉在尾迹下方。
- 火星出生时带弹体速度减去喷出速度（相对弹体向后）+ 横向散开；线性阻力（小颗停得快）、重力、风、冻结湍流（随高度变的横风）。
- 相机：侧面正交（远景对照 尾缀B）、仰拍跟拍透视（近景质感对照 尾缀3.0_A）；快门内细分，高速的星头和刚喷出的火星被拖成短线。

用法：
  python trail_phys.py B             # 对尾缀B（远景）+ 尾缀3.0_A（近景质感），出对照图和数值到 analysis/replica/
"""
import os, sys, json, math
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
G = 9.81

# ---------------------------------------------------------------------------------------------
# 参数。单位：米、秒、开尔文。出处见 升空尾缀_物理.md 第 3 节（尾缀B 实测 + 自动逼近）
BASE = dict(
    # 弹道（尾缀B：出膛 77.5 m/s，k = 0.002 /m，飞行 4.46 s 开花，高 188 m；横向 x = a·z + b·z²）
    v0=77.5, k=0.002, T=4.46, lean=(-0.0092, -0.00073),
    wob=0.2, wob_lam=(30.0, 45.0, 65.0),                      # 弹体摆动振幅（m）与波长（m）
    # 弹体自转：曲导装在弹体侧面，弹一转、喷口方向跟着转 → 火星出膛时带一个旋转的横向速度 → 尾迹上细碎的螺旋小波纹
    spin=dict(f=9.0, amp=1.8),                                  # 转速 Hz、横向速度 m/s
    # 空气：风（m/s，x 向）、冻结湍流（均方根 m/s、波长范围 m）、单颗随机漂移（m/s）
    wind=-1.7, turb=0.15, turb_lam=(4.0, 45.0), jit=0.042,
    # 火焰：长度 = l0 + lv·v（m），半宽（m），亮度
    flame=dict(l0=1.2, lv=0.04, w=0.1, I=1.5),
    # 火星种群：rate 每秒颗数；puff 每簇平均颗数；life 中位寿命 s；lsig 寿命对数标准差；jet 相对弹体向后喷出速度 m/s；
    #   cone 横向散开 m/s；kd 中位阻力 1/s（小颗更大）；T0 初温 K；Tend 熄灭温度；pt 降温曲线指数；pm 亮度随燃尽下降的指数（<1：烧到最后才暗）；
    #   I 亮度；tw 闪烁幅度；r 发光半径 m
    pops=[
        dict(name='火粉', rate=12000, puff=1, life=0.22, lsig=0.35, jet=22, cone=1.2, kd=18, T0=2550, Tend=2000, pt=3.0, I=0.0074, tw=0.0, r=0.012),
        dict(name='金火星', rate=2000, puff=2, life=1.95, lsig=0.446, jet=18, cone=1.2, kd=12, T0=2350, Tend=1350, pt=1.0, pm=0.446, I=0.0414, tw=0.35, r=0.04),
        dict(name='落火', rate=14, puff=1, life=2.2, lsig=0.25, jet=12, cone=1.5, kd=3.5, T0=2150, Tend=1250, pt=3.0, I=0.8, tw=0.25, r=0.05),
    ],
    E=38.85,                      # 远景对照的相机曝光（尾缀B）
    E_close=150.0,                # 近景对照（尾缀3.0_A，另一发更大的弹，仅看结构）
    seed=7,
)
PRESETS = {'B': BASE}


# ---------------------------------------------------------------------------------------------
def _modes(lam, n, amp_exp, seed):
    r = np.random.default_rng(seed); L = np.exp(np.linspace(np.log(lam[0]), np.log(lam[-1]), n))
    a = L ** amp_exp; a = a / np.sqrt(0.5 * (a * a).sum()); return L, a, r.uniform(0, 2 * np.pi, n)


def wobble(P, z, axis=0, d=False):
    """弹体摆动（随高度），axis 0 = x（画面左右），1 = y（纵深）"""
    L, a, ph = _modes(P['wob_lam'], len(P['wob_lam']), 0.0, P['seed'] * 13 + 1 + 7 * axis)
    z = np.asarray(z, np.float64)[..., None]; k = 2 * np.pi / L
    return P['wob'] * ((a * k * np.cos(k * z + ph)).sum(-1) if d else (a * np.sin(k * z + ph)).sum(-1))


def turb(P, z, axis=0):
    """冻结湍流：随高度变化的横风（Kolmogorov：速度幅度 ∝ 波长^(1/3)）"""
    L, a, ph = _modes(P['turb_lam'], 9, 1 / 3, P['seed'] * 17 + 3 + 11 * axis)
    z = np.asarray(z, np.float64)[..., None]; return P['turb'] * (a * np.sin(2 * np.pi * z / L + ph)).sum(-1)


def shell(P, s):
    """飞行时刻 s（出膛为 0）→ 位置 (x, y, z)、速度 (vx, vy, vz)"""
    s = np.asarray(s, np.float64)
    if P.get('const_v'):                                         # 烘焙星头序列用：匀速直线上升（随弹体坐标里是稳态，可以无缝循环）
        z = P['const_v'] * s; o = np.zeros_like(s)
        return np.stack([o, o, z], -1), np.stack([o, o, np.full_like(s, P['const_v'])], -1)
    k, v0 = P['k'], P['v0']; a = math.atan(v0 * math.sqrt(k / G)); w = math.sqrt(G * k)
    ph = np.clip(a - w * s, -1.5, 1.5)
    z = np.log(np.cos(ph) / math.cos(a)) / k; vz = math.sqrt(G / k) * np.tan(ph)
    la, lb = P['lean']
    x = la * z + lb * z * z + wobble(P, z, 0); vx = (la + 2 * lb * z + wobble(P, z, 0, True)) * vz
    y = wobble(P, z, 1); vy = wobble(P, z, 1, True) * vz
    return np.stack([x, y, z], -1), np.stack([vx, vy, vz], -1)


# 黑体：相机 RGB 近似（610 / 550 / 465 nm 三个波长的普朗克辐射，6500 K 归一为白）
_LAM = np.array([610e-9, 550e-9, 465e-9])
def _planck(T): T = np.asarray(T, np.float64)[..., None]; return 1 / (_LAM ** 5 * (np.exp(1.4388e-2 / (_LAM * np.maximum(T, 300))) - 1))
_W65 = _planck(6500.0)
def bb_rgb(T): return _planck(T) / _W65
def bb_lum(T): return bb_rgb(T) @ np.array([0.2126, 0.7152, 0.0722])


def _perp(u):
    """与单位向量 u 垂直的两个单位向量"""
    e1 = np.cross(u, np.array([0.0, 1.0, 0.0])); e1 /= np.linalg.norm(e1, axis=-1, keepdims=True) + 1e-12
    return e1, np.cross(u, e1)


def emit(P, t_range=None):
    """所有火星一次生成：出生时刻、种群、寿命、初速（三维）、阻力、空气速度、闪烁"""
    r = np.random.default_rng(P['seed']); out = []; t0, t1 = t_range or (0.0, P['T'])
    for pi, q in enumerate(P['pops']):
        n_puff = r.poisson(q['rate'] / q['puff'] * (t1 - t0))
        tp = np.sort(r.uniform(t0, t1, n_puff))
        m = np.maximum(1, r.poisson(q['puff'], n_puff)) if q['puff'] > 1 else np.ones(n_puff, int)
        tb = np.repeat(tp, m) + (r.uniform(0, 0.012, m.sum()) if q['puff'] > 1 else 0)
        pid = np.repeat(np.arange(n_puff), m); keep = tb < t1; tb, pid = tb[keep], pid[keep]; N = len(tb)
        # 一簇共用一个喷出方向扰动（燃烧不均匀，一股一股喷）
        dq = r.normal(0, 1, (n_puff, 2))[pid] * 0.7 + r.normal(0, 1, (N, 2)) * 0.7
        lnz = r.normal(0, 1, N); life = q['life'] * np.exp(q['lsig'] * lnz)
        size = np.exp(0.5 * q['lsig'] * lnz)                    # 粒径（相对中位）：寿命 ∝ 粒径²
        p, v = shell(P, tb); sp = np.linalg.norm(v, axis=-1, keepdims=True); u = v / sp
        e1, e2 = _perp(u)
        jet = q['jet'] * (0.75 + 0.5 * r.random(N))[:, None]
        sp_ = P.get('spin', {'f': 0, 'amp': 0}); ang = 2 * np.pi * sp_['f'] * tb
        v0 = v - jet * u + q['cone'] * (dq[:, :1] * e1 + dq[:, 1:] * e2) + sp_['amp'] * (np.cos(ang)[:, None] * e1 + np.sin(ang)[:, None] * e2)
        air = np.stack([P['wind'] + turb(P, p[:, 2], 0) + r.normal(0, P['jit'], N),
                        turb(P, p[:, 2], 1) + r.normal(0, P['jit'], N), np.zeros(N)], -1)
        out.append(dict(pop=np.full(N, pi), tb=tb, p0=p, v0=v0, kd=q['kd'] / size, air=air, life=life, size=size,
                        T0=q['T0'] + r.normal(0, 60, N), Tend=np.full(N, float(q['Tend'])), pt=np.full(N, float(q['pt'])), pm=np.full(N, float(q.get('pm', 1.0))),
                        I=np.full(N, float(q['I'])), tw=np.full(N, float(q['tw'])), twf=r.uniform(7, 16, N), twp=r.uniform(0, 6.28, N)))
    return {k: np.concatenate([o[k] for o in out]) for k in out[0]}


def spark_state(S, t):
    """飞行时刻 t：dv/dt = −k(v − air) − g ⇒ 解析解。返回位置、速度、亮度（相对）、温度"""
    a = t - S['tb']; idx = np.nonzero((a >= 0) & (a < S['life']))[0]; a = a[idx]; k = S['kd'][idx]
    e = np.exp(-k * a); s1 = (1 - e) / k
    vt = S['air'][idx].copy(); vt[:, 2] -= G / k                # 终端速度
    p = S['p0'][idx] + vt * a[:, None] + (S['v0'][idx] - vt) * s1[:, None]
    v = vt + (S['v0'][idx] - vt) * e[:, None]
    u = a / S['life'][idx]
    # 木炭火星：燃烧期温度基本不变（扩散控制燃烧），快烧完才降温；发光面积 ∝ d²，d² 随时间线性变小（d² 燃烧律）
    T = S['T0'][idx] - (S['T0'][idx] - S['Tend'][idx]) * u ** S['pt'][idx]
    ign = np.clip(a / 0.03, 0, 1)                               # 出筒 30 ms 内点燃
    tw = 1 + S['tw'][idx] * np.sin(S['twf'][idx] * a * 6.283 + S['twp'][idx]) * np.sin(S['twf'][idx] * 0.37 * a * 6.283 + 1.3 * S['twp'][idx])
    I = S['I'][idx] * S['size'][idx] ** 2 * np.clip(1 - u, 0, 1) ** S['pm'][idx] * ign * tw * bb_lum(T) / bb_lum(2350.0)
    return dict(idx=idx, p=p, v=v, I=I, T=T, pop=S['pop'][idx], size=S['size'][idx], age=a)


def flame_pts(P, t, n=48):
    """星头火焰：沿速度反方向的一串点（泪滴：头部最亮、向后变细变暗）。返回 位置 (n,3)、权重、半宽 m"""
    if t < 0 or t > P['T']: return None
    p, v = shell(P, t); sp = float(np.linalg.norm(v)); u = v / sp
    f = P['flame']; L = f['l0'] + f['lv'] * sp
    s = (np.arange(n) + 0.5) / n
    fl = 1 + 0.12 * math.sin(t * 37.0) * math.sin(t * 11.3 + 0.7)
    w = np.exp(-3.0 * s) * (1 - np.exp(-s * 18)); w = w / w.sum() * f['I'] * fl
    return p[None] - u[None] * (s * L)[:, None], w, f['w'] * (0.55 + 0.9 * s)


# ---------------------------------------------------------------------------------------------
class Cam:
    """mode='side'：侧面正交，ppm 像素/米，(ox, oy) = 出膛点像素；
    mode='persp'：透视，相机在 pos（米），每个子帧对准星头（跟拍），F = 焦距（像素），星头落在 (ox, oy)；
    mode='shell'：随弹体（星头固定在 (ox, oy)，画面 y 轴 = 速度方向），正交 ppm —— 烘焙星头火焰序列用。
    shutter 秒、nsub 细分；psf 像素（镜头模糊）"""
    def __init__(self, mode, W, H, ox, oy, ppm=1.0, pos=(0, -60, 1.5), F=1000.0, shutter=1 / 50, nsub=6, psf=1.0):
        self.__dict__.update(mode=mode, W=W, H=H, ox=ox, oy=oy, ppm=ppm, pos=np.array(pos, float), F=F, shutter=shutter, nsub=nsub, psf=psf)

    def project(self, P, pts, ts, t_aim=None):
        """pts (N,3) → 像素 (px, py) 和该点的像素/米"""
        if self.mode == 'side':
            return self.ox + pts[:, 0] * self.ppm, self.oy - pts[:, 2] * self.ppm, np.full(len(pts), self.ppm)
        hp, hv = shell(P, min(max(ts if t_aim is None else t_aim, 0), P['T']))
        if self.mode == 'shell':
            u = hv / np.linalg.norm(hv); e1 = np.array([u[2], 0, -u[0]]); e1 /= np.linalg.norm(e1)
            d = pts - hp; return self.ox + (d @ e1) * self.ppm, self.oy - (d @ u) * self.ppm, np.full(len(pts), self.ppm)
        f = hp - self.pos; f /= np.linalg.norm(f); r = np.cross(f, [0, 0, 1.0]); r /= np.linalg.norm(r); up = np.cross(r, f)
        d = pts - self.pos; zc = np.maximum(d @ f, 0.5)
        return self.ox + self.F * (d @ r) / zc, self.oy - self.F * (d @ up) / zc, self.F / zc


def _splat(img, px, py, w):
    """双线性累加（img: H×W×C，w: N×C）"""
    H, W = img.shape[:2]; x0 = np.floor(px).astype(int); y0 = np.floor(py).astype(int); fx = px - x0; fy = py - y0
    for dx, dy, ww in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
        xi, yi = x0 + dx, y0 + dy; ok = (xi >= 0) & (xi < W) & (yi >= 0) & (yi < H)
        np.add.at(img, (yi[ok], xi[ok]), w[ok] * ww[ok, None])


SIG_BINS = np.array([0.0, 0.7, 1.4, 2.8, 5.6, 11.2, 22.4])   # 按屏幕上的发光半径分层（像素），每层一次高斯模糊


def render(P, S, t, cam, rgb=True, flame=True, sparks=True, pops=None):
    """飞行时刻 t 的一帧（线性辐亮度，未曝光）。rgb=False → 单通道（烘焙灰度用）"""
    C = 3 if rgb else 1; H, W = cam.H, cam.W; lay = np.zeros((len(SIG_BINS), H, W, C), np.float32)
    aim = t if cam.mode == 'shell' else None                   # 随弹体：整个快门都以帧中点的星头为参照
    for j in range(cam.nsub):
        ts = t + ((j + 0.5) / cam.nsub - 0.5) * cam.shutter
        if sparks:
            st = spark_state(S, ts)
            if pops is not None: m = np.isin(st['pop'], pops); st = {k: (v[m] if isinstance(v, np.ndarray) else v) for k, v in st.items()}
            if len(st['I']):
                col = bb_rgb(st['T']) / bb_lum(st['T'])[:, None] if rgb else np.ones((len(st['I']), 1))
                px, py, s = cam.project(P, st['p'], ts, aim)
                rr = np.array([q['r'] for q in P['pops']])[st['pop']] * st['size'] * s
                b = np.clip(np.searchsorted(SIG_BINS, rr) - 1, 0, len(SIG_BINS) - 1)
                w = st['I'][:, None] * col / cam.nsub
                for bi in np.unique(b): m = b == bi; _splat(lay[bi], px[m], py[m], w[m])
        fp = flame_pts(P, ts) if flame else None
        if fp is not None:
            pts, fw, fwd = fp; T = 2600.0; col = (bb_rgb(T) / bb_lum(T)) if rgb else np.ones(1)
            px, py, s = cam.project(P, pts, ts, aim)
            b = np.clip(np.searchsorted(SIG_BINS, fwd * s) - 1, 0, len(SIG_BINS) - 1)
            w = fw[:, None] * col[None] / cam.nsub
            for bi in np.unique(b): m = b == bi; _splat(lay[bi], px[m], py[m], w[m])
    img = np.zeros((H, W, C), np.float32)
    for bi, sg in enumerate(SIG_BINS):
        if not lay[bi].any(): continue
        s2 = math.hypot(cam.psf, sg)
        img += cv2.GaussianBlur(lay[bi], (0, 0), s2).reshape(H, W, C) if s2 > 0.3 else lay[bi]
    return img


# ---------------------------------------------------------------------------------------------
#  远景对照：尾缀B（固定机位，2560×1440，0.306 m/像素）
REFB = dict(video='vidio/2.0/尾缀B.mp4', t0=0.742, ppm=1 / 0.306, launch=(1934.6, 1045.0), crop=(1700, 330, 2100, 1090))


def load_ref(ref, times):
    cap = cv2.VideoCapture(os.path.join(ROOT, ref['video'])); fps = cap.get(5) or 30; x0, y0, x1, y1 = ref['crop']
    want = {int(round(t * fps)): t for t in times}; bgs, out, i = [], {}, 0
    while True:
        ok, f = cap.read()
        if not ok: break
        c = f[y0:y1, x0:x1]
        if i < 8: bgs.append(c.astype(np.float32))
        if i in want: out[want[i]] = c.astype(np.float32)
        i += 1
    return np.median(bgs, 0), out


def to_lin(bgr8): return (np.clip(bgr8, 0, 255) / 255.0) ** 2.2
def to_srgb8(lin): return (np.clip(lin, 0, 1) ** (1 / 2.2) * 255 + 0.5).astype(np.uint8)
def composite(bg8, sig_rgb, E): return to_srgb8(to_lin(bg8) + E * sig_rgb[..., ::-1])


def side_cam(ref, nsub=6):
    x0, y0, x1, y1 = ref['crop']
    return Cam('side', x1 - x0, y1 - y0, ref['launch'][0] - x0, ref['launch'][1] - y0, ppm=ref['ppm'], shutter=1 / 40, nsub=nsub, psf=0.9)


def metrics(bg8, fr8):
    """实拍和模拟同一套量法：可见长度、过曝段长度、横向宽度（m，按行亮度加权标准差的中位数）、总亮度"""
    d = np.clip(fr8.astype(np.float32) - bg8, 0, None).sum(2); d = cv2.GaussianBlur(d, (0, 0), 1.0)
    m = d > 45
    if m.sum() < 10: return None
    n, lab, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(m.astype(np.uint8), np.ones((9, 5), np.uint8)), 8)
    k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); mm = (lab == k) & m; ys, xs = np.nonzero(mm)
    top, bot = ys.min(), ys.max()
    sat = (fr8.min(2) > 225) & (lab == k); sy = np.nonzero(sat.any(1))[0]
    wid = []
    for y in range(top, bot + 1, 3):
        row = d[y] * (lab[y] == k); s = row.sum()
        if s > 0: c = (row * np.arange(len(row))).sum() / s; wid.append(math.sqrt(max(0, (row * (np.arange(len(row)) - c) ** 2).sum() / s)))
    sc = 0.306
    cs = sat.sum(1); cs = cs[cs > 0]                              # 过曝芯的粗细（每行过曝像素数的中位数）
    return dict(top=int(top), len_m=round(float(bot - top) * sc, 1), sat_m=round(float((sy.max() - top) if len(sy) else 0) * sc, 1),
                core_px=float(np.median(cs)) if len(cs) else 0.0,
                width_m=round(float(np.median(wid)) * sc, 2) if wid else 0, flux=round(float(d[mm].sum()) / 1e4, 1))


def band_profile(bg8, fr8, top, cx_path, nb=26, bin_px=13, half=22):
    """沿尾迹从星头往下每 4 m 一段的亮度"""
    d = np.clip(fr8.astype(np.float32) - bg8, 0, None).sum(2); out = np.zeros(nb)
    for b in range(nb):
        s = 0.0
        for y in range(top + b * bin_px, min(top + (b + 1) * bin_px, d.shape[0])):
            c = int(round(cx_path(y))); s += d[y, max(0, c - half):c + half].sum()
        out[b] = s / bin_px
    return out


def compare_B(P, out_path, times=(1.5, 2.5, 3.5, 4.5, 5.1)):
    ref = REFB; bg8, real = load_ref(ref, times); cam = side_cam(ref); W = cam.W
    S = emit(P); tr, ts, rows = [], [], []
    for t in times:
        sim = composite(bg8, render(P, S, t - ref['t0'], cam), P['E'])
        mr, ms = metrics(bg8, real[t]), metrics(bg8, sim.astype(np.float32))
        rows.append(dict(t=t, 实拍=mr, 模拟=ms)); tr.append(real[t].astype(np.uint8)); ts.append(sim)
    top, bot = np.hstack(tr), np.hstack(ts)
    img = np.vstack([top, np.full((6, top.shape[1], 3), 255, np.uint8), bot])
    for i, t in enumerate(times): cv2.putText(img, f'{t:.1f}s', (i * W + 8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.putText(img, 'REAL', (8, top.shape[0] - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    cv2.putText(img, 'SIM', (8, img.shape[0] - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    cv2.imwrite(out_path, img, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return rows


def fit_B(P, times=(1.5, 2.5, 3.5, 4.5, 5.1), iters=60, log=print, keys=None):
    """自动逼近（Nelder–Mead，对数尺度）：沿尾迹的亮度分布 + 过曝段长度 + 可见长度 + 宽度"""
    from scipy.optimize import minimize
    ref = REFB; bg8, real = load_ref(ref, times); cam = side_cam(ref, nsub=4)
    def cxp(y):
        z = (cam.oy - y) / cam.ppm; la, lb = P['lean']; return cam.ox + (la * z + lb * z * z) * cam.ppm
    R = {t: (lambda m: (m, np.log1p(band_profile(bg8, real[t], m['top'], cxp))))(metrics(bg8, real[t])) for t in times}
    keys = keys or [('E',), ('pops', 1, 'life'), ('pops', 1, 'lsig'), ('pops', 1, 'cone'), ('pops', 0, 'I'), ('pops', 0, 'life'), ('pops', 2, 'I')]
    def get(Q, k):
        for x in k[:-1]: Q = Q[x]
        return Q, k[-1]
    def apply(x):
        Q = json.loads(json.dumps(P))
        for xi, k in zip(x, keys): o, kk = get(Q, k); o[kk] = o[kk] * math.exp(xi)
        return Q
    def loss(x):
        Q = apply(x); S = emit(Q); L = 0
        for t in times:
            sim = composite(bg8, render(Q, S, t - ref['t0'], cam), Q['E']).astype(np.float32)
            m, (mr, pr) = metrics(bg8, sim), R[t]
            if m is None: return 1e3
            ps = np.log1p(band_profile(bg8, sim, mr['top'], cxp))
            L += np.mean((ps - pr) ** 2) + 0.5 * ((m['sat_m'] - mr['sat_m']) / 20) ** 2 + ((m['len_m'] - mr['len_m']) / 40) ** 2 + ((m['width_m'] - mr['width_m']) / 0.12) ** 2 + ((m['core_px'] - mr['core_px']) / 1.0) ** 2
        return L / len(times)
    x0 = np.zeros(len(keys)); best = [loss(x0), x0]; log(f'起点 {best[0]:.4f}')
    def cb(x):
        v = loss(x)
        if v < best[0]: best[0], best[1] = v, x.copy(); log(f'  {v:.4f} ' + ' '.join(f'{"/".join(map(str, k))}×{math.exp(xi):.3f}' for k, xi in zip(keys, x)))
    simplex = np.vstack([x0] + [x0 + 0.3 * np.eye(len(keys))[i] for i in range(len(keys))])
    minimize(loss, x0, method='Nelder-Mead', callback=cb, options=dict(maxiter=iters, initial_simplex=simplex, xatol=1e-3, fatol=1e-4))
    return apply(best[1]), best[0]


# ---------------------------------------------------------------------------------------------
#  近景质感对照：尾缀3.0_A（4K 竖拍，从发射点附近仰拍跟拍）。透视相机：离发射点 D 米、1.5 m 高；
#  拉直后和实拍用同一套量法、同一套显示（trail_fit.sheet）
def close_side(P, ref3, D=40.0, times=(1.3, 1.7, 2.1, 2.5), psf=2.2):
    import trailkit as K, trail_ref3 as R3, trail_calib as TC
    S = emit(P); Lr = ref3['L']; sat = float(np.mean(ref3['prof']['tex']['sat'])); out = []; F = 3000.0
    for t in times:
        for it in range(4):
            H = int(Lr * 1.6 + 200); W = 1400
            cam = Cam('persp', W, H, W / 2, 100, pos=(0, -D, 1.5), F=F, shutter=1 / 50, nsub=10, psf=psf)
            img = TC.camera_clip(render(P, S, t, cam)[..., ::-1].astype(np.float32), sat)
            h, sig = K.find_head(img); st, line = K.straighten(sig, h, **{**R3.STRAIGHT, 'maxlen': H - int(h[1]) - 1})
            L0 = K.trail_length(st)
            if abs(L0 / Lr - 1) < 0.04: break
            F *= Lr / max(L0, 1)
        out.append(st[:int(Lr * 1.3)] if st.shape[0] >= int(Lr * 1.3) else np.vstack([st, np.zeros((int(Lr * 1.3) - st.shape[0],) + st.shape[1:], np.float32)]))
    return dict(strips=out, F=F)


def compare_close(P, out_path, D=40.0):
    import trail_ref3 as R3, trail_fit as TF
    ref3 = R3.ref_side(); S = close_side(P, ref3, D=D); TF.sheet(ref3, S, out_path); return S['F']


#  近景画面对照（不拉直）：实拍 尾缀3.0_A 的 4 个时刻 | 模拟透视跟拍（相机离发射点 D 米、1.5 m 高）
REF3 = dict(video='vidio/3.0/尾缀3.0_A.mp4', times=(0.3, 1.0, 2.0, 3.0), t_launch=-0.8, crop=(600, 300, 1500, 2900), head_y=1360)


def camera_look(sig, E, halo=0.06, halo_r=60, psf=2.5):
    """对照用的相机：曝光 → 镜头光晕（过曝部分的大范围散射）→ 截断。贴图里不加这些"""
    x = cv2.GaussianBlur(sig * E, (0, 0), psf)
    x = x + halo * cv2.GaussianBlur(np.clip(x - 1, 0, None) + 0.15 * x, (0, 0), halo_r)
    return np.clip(x, 0, 1)


def compare_close2(P, out_path, D=35.0, F=2600.0, E=None, scale=0.5):
    x0, y0, x1, y1 = REF3['crop']; W, H = x1 - x0, y1 - y0
    cap = cv2.VideoCapture(os.path.join(ROOT, REF3['video'])); fps = cap.get(5) or 30
    want = {int(round(t * fps)): t for t in REF3['times']}; real = {}; i = 0
    while len(real) < len(want):
        ok, f = cap.read()
        if not ok: break
        if i in want: real[want[i]] = f[y0:y1, x0:x1]
        i += 1
    S = emit(P); E = E or P.get('E_close', 1.0); sims = []
    for t in REF3['times']:
        cam = Cam('persp', W, H, W / 2, REF3['head_y'] - y0, pos=(0, -D, 1.5), F=F, shutter=1 / 50, nsub=12, psf=1.2)
        img = camera_look(render(P, S, t - REF3['t_launch'], cam), E)
        sims.append(to_srgb8(img)[..., ::-1])
    rs = lambda im: cv2.resize(im, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    top = np.hstack([rs(real[t]) for t in REF3['times']]); bot = np.hstack([rs(s) for s in sims])
    img = np.hstack([top, np.full((top.shape[0], 8, 3), 90, np.uint8), bot])
    cv2.imwrite(out_path, img, [cv2.IMWRITE_JPEG_QUALITY, 90])


def close_preset(P):
    """近景对照用：尾缀3.0_A 那一发几乎竖直、风小（远景 尾缀B 的倾斜和风不适用）；
    它是更大的弹（曲导更粗、喷得更开）：火粉 ×60、火焰 ×30、金火星 ×8，散开 3 / 4 m/s"""
    Q = json.loads(json.dumps(P)); Q['lean'] = (0, 0); Q['wind'] = -0.5
    Q['pops'][0]['I'] *= 60; Q['flame']['I'] *= 30; Q['pops'][1]['I'] *= 8; Q['pops'][0]['cone'] = 3.0; Q['pops'][1]['cone'] = 4.0; return Q


def run_compare(P, out_prefix):
    rows = compare_B(P, out_prefix + '_远景对照.jpg')
    compare_close2(close_preset(P), out_prefix + '_近景对照.jpg', D=80, F=7000, E=P['E_close'], scale=0.25)
    json.dump(dict(说明='尾缀B 固定机位远景：实拍 vs 模拟，同一套量法（可见长度、过曝段长度、横向宽度 m、总亮度）', 远景=rows),
              open(out_prefix + '_数值.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return rows


if __name__ == '__main__':
    key = sys.argv[1] if len(sys.argv) > 1 else 'B'
    for r in run_compare(PRESETS[key], os.path.join(ROOT, 'analysis', 'replica', f'尾缀物理_{key}')): print(r)
