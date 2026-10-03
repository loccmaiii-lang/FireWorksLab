"""升空尾缀：小 / 中 / 大 三档，速度朝向面片用的「循环 + 消散」两张序列贴图 + Cascade 参数表 + 预览。

做法（与烘焙器同一套物理和亮度口径）：
- 在「随弹体直线上升的坐标系」里渲染：星头在面片上端，横向按曲导摆动（螺旋投影）来回摆；
  火花从星头处喷出，带一部分弹体速度 + 随机散开，线性阻力 + 重力，按黑体冷却变暗。
- 相机快门拖影按世界坐标算（火花在空中几乎不动，是清晰的点；星头在高速移动，被拖成一小段亮线）。
- 循环：火花编号取模、摆动周期整除循环周期 → 第 0 帧和第 64 帧完全相同，无缝。
- 消散：从循环第 0 帧的状态开始，停止喷火花、星头熄灭（开花盖住），已有火花继续飞、冷却、熄灭；
  面片改为固定在开花点（世界坐标），所以消散第 0 帧 = 循环第 0 帧，接力无跳变。
- 贴图：2048×1024，16 列 × 1 行，单格 128×1024（1:8），RGBA 接力（R 满了接 G、B、A），灰度线性。
用法：python rise_trail.py [输出目录]（默认 samples/）
"""
import os, sys, json, math
import numpy as np, cv2
from PIL import Image

G = 9.81
FPS = 30
COLS, ROWS, CW, CH, PAD = 16, 1, 128, 1024, 2
LOOP_F, FADE_F = 64, 32
SS = 2                      # 超采样
SHUTTER, NSUB = 1 / 40, 6   # 相机快门（与烘焙器定帧渲染一致）

# ---------------------------------------------------------------------------------------------
# 三档参数。population：(名称, 每秒个数, 平均寿命 s, 继承弹体速度, 散开 m/s, 阻力 1/s, 重力倍率, 初温 K, 冷却, 粒径 m, 亮度)
TRAILS = {
    'S': dict(name='小 · 简单礼花（参考 尾缀C、青柠星升空）', H_apex=120, vt=35, H=26.0, top=1.4,
              head=dict(core=0.08, halo=0.20, halo_i=0.12, I=1.0, flick=0.10),
              wave=[(8, 0.06, 0.0)],                       # (每个循环的周期数, 振幅 m, 相位)
              pops=[('细火花', 2200, 0.26, 0.12, 0.8, 4.0, 0.3, 2450, 0.50, 0.07, 0.030),
                    ('粗火花', 520, 0.50, 0.10, 1.4, 3.5, 0.5, 2080, 0.35, 0.07, 0.10)],
              ramp=[(0.0, '#000000'), (0.12, '#5a1a02'), (0.30, '#b8460c'), (0.50, '#f08a2c'), (0.70, '#ffc464'), (0.86, '#fff0c8'), (1.0, '#ffffff')]),
    'M': dict(name='中 · 金芒菊级（参考 尾缀B）', H_apex=200, vt=45, H=46.0, top=2.2,
              head=dict(core=0.13, halo=0.32, halo_i=0.18, I=0.8, flick=0.06),
              wave=[(5, 0.35, 0.0), (2, 0.18, 1.3)],
              pops=[('细火花', 2600, 0.66, 0.10, 0.45, 3.0, 0.2, 2480, 0.40, 0.10, 0.022),
                    ('粗火花', 45, 0.72, 0.08, 1.2, 3.0, 0.4, 2150, 0.38, 0.16, 0.12)],
              ramp=[(0.0, '#000000'), (0.12, '#3a2414'), (0.30, '#8a6446'), (0.50, '#d8c2a2'), (0.70, '#f6ead6'), (0.86, '#fffaf0'), (1.0, '#ffffff')]),
    'L': dict(name='大 · 四尺玉级（参考 尾缀A、鸿巢四尺玉升空）', H_apex=600, vt=90, H=120.0, top=5.0,
              head=dict(core=0.45, halo=1.6, halo_i=0.25, I=1.0, flick=0.08),
              wave=[(4, 1.1, 0.0), (2, 0.7, 2.1), (7, 0.35, 0.7)],
              pops=[('细火花', 5000, 0.50, 0.18, 0.9, 2.6, 0.2, 2500, 0.42, 0.30, 0.030),
                    ('中火花', 1500, 0.80, 0.14, 1.2, 2.2, 0.3, 2300, 0.42, 0.30, 0.030),
                    ('粗火花', 260, 1.00, 0.12, 2.2, 2.0, 0.4, 2080, 0.35, 0.36, 0.20)],
              ramp=[(0.0, '#000000'), (0.12, '#5a1a02'), (0.30, '#b8500e'), (0.50, '#f29a34'), (0.70, '#ffd27a'), (0.86, '#fff4d6'), (1.0, '#ffffff')]),
}
TLOOP = LOOP_F / FPS


def glow(T):
    g = np.clip((T - 900.0) / 1150.0, 0, None); return g ** 3


def hsh(i, salt):
    """确定性伪随机 [0,1)：按火花编号（取模后）生成，保证循环"""
    x = (np.asarray(i, np.uint64) * np.uint64(2654435761) + np.uint64(salt) * np.uint64(97531)) & np.uint64(0xFFFFFFFF)
    x ^= x >> np.uint64(15); x = (x * np.uint64(2246822519)) & np.uint64(0xFFFFFFFF); x ^= x >> np.uint64(13)
    x = (x * np.uint64(3266489917)) & np.uint64(0xFFFFFFFF); x ^= x >> np.uint64(16)
    return x.astype(np.float64) / 4294967296.0


def gauss(i, salt):
    u1 = np.maximum(hsh(i, salt), 1e-9); u2 = hsh(i, salt + 7)
    return np.sqrt(-2 * np.log(u1)) * np.cos(2 * np.pi * u2)


# ---------------------------------------------------------------------------------------------
def head_x(C, t):
    """星头横向摆动（弹体自旋 + 曲导偏心推力 → 螺旋，侧面看是正弦叠加）"""
    x = np.zeros_like(np.asarray(t, np.float64)); vx = np.zeros_like(x)
    for n, A, ph in C['wave']:
        w = 2 * np.pi * n / TLOOP; x = x + A * np.sin(w * t + ph); vx = vx + A * w * np.cos(w * t + ph)
    return x, vx


def sparks_at(C, V, ts, t_frame, stop=None):
    """返回 [(x, y, I, 粒径)]：ts = 快门子帧的世界时刻；画面坐标 y 以 t_frame 时的星头为 0（向上为正）。
    stop：停止喷火花的时刻（消散），此后的火花不存在；画面锚在 stop 时的星头（世界坐标）"""
    out = []
    anchor = V * (stop if stop is not None else t_frame)
    for pi, (nm, rate, L, inh, spr, k, gm, T0, cool, size, bright) in enumerate(C['pops']):
        Lmax = L * 1.3
        N = max(1, int(round(rate * TLOOP))); rate = N / TLOOP      # 每个循环整数颗，保证无缝
        i1 = math.floor(ts * rate) if stop is None else math.floor(min(ts, stop) * rate)
        i0 = math.floor((ts - Lmax) * rate) - 1
        i = np.arange(i0, i1 + 1, dtype=np.int64)
        key = (i % N).astype(np.uint64) + np.uint64(pi * 1000003)
        te = (i + hsh(key, 1)) / rate
        ok = te <= (ts if stop is None else min(ts, stop))
        a = ts - te; life = L * np.clip(np.exp(0.28 * gauss(key, 3)), 0.55, 1.3)
        ok &= (a >= 0) & (a < life)
        i, key, te, a, life = i[ok], key[ok], te[ok], a[ok], life[ok]
        if len(i) == 0: continue
        hx, hvx = head_x(C, te)
        vx = inh * hvx + spr * gauss(key, 5); vy = inh * V + spr * gauss(key, 9)
        x0, y0 = hx, V * te
        e = (1 - np.exp(-k * a)) / k; gy = -G * gm
        x = x0 + vx * e
        y = y0 + (vy - gy / k) * e + gy / k * a
        T = (T0 + 90 * gauss(key, 11)) * (1 - cool * a / life)
        x_ = a / life; I = glow(T) * bright * (0.7 + 0.6 * hsh(key, 13)) * np.clip((1 - x_) / 0.3, 0, 1) ** 1.5   # 寿命最后 30% 渐暗熄灭
        out.append((x, y - anchor, I, size))
    return out


def render(C, V, t, stop=None, head_on=True):
    """一帧（单格，超采样后缩小），返回浮点亮度图"""
    W, H, top = C['H'] / 8, C['H'], C['top']
    w, h = (CW - 2 * PAD) * SS, (CH - 2 * PAD) * SS
    ppm = h / H
    layers = {}
    for j in range(NSUB):
        ts = t - SHUTTER + (j + 0.5) * SHUTTER / NSUB
        for x, y, I, size in sparks_at(C, V, ts, t, stop):
            px = w / 2 + x * ppm; py = top * ppm - y * ppm
            m = (px >= 0) & (px < w - 1) & (py >= 0) & (py < h - 1)
            buf = layers.setdefault(size, np.zeros((h, w), np.float64))
            # 双线性落点
            px, py, I = px[m], py[m], I[m] / NSUB
            x0 = np.floor(px).astype(int); y0 = np.floor(py).astype(int); fx = px - x0; fy = py - y0
            for dx, dy, ww in ((0, 0, (1 - fx) * (1 - fy)), (1, 0, fx * (1 - fy)), (0, 1, (1 - fx) * fy), (1, 1, fx * fy)):
                np.add.at(buf, (y0 + dy, x0 + dx), I * ww)
        if head_on:
            hx, _ = head_x(C, np.array([ts]))
            hy = V * ts - (V * (stop if stop is not None else t))
            px = w / 2 + hx[0] * ppm; py = top * ppm - hy * ppm
            hd = C['head']; fl = 1 + hd['flick'] * math.sin(2 * math.pi * 11 * ts / TLOOP) * math.sin(2 * math.pi * 3 * ts / TLOOP + 1)
            buf = layers.setdefault(('head',), np.zeros((h, w), np.float64))
            yy, xx = np.mgrid[0:h, 0:w]
            r2 = ((xx - px) ** 2 + (yy - py) ** 2) / ppm ** 2
            buf += (hd['I'] * np.exp(-r2 / (2 * hd['core'] ** 2)) + hd['halo_i'] * hd['I'] * np.exp(-r2 / (2 * hd['halo'] ** 2))) * fl / NSUB
    img = np.zeros((h, w), np.float64)
    for key, buf in layers.items():
        if key == ('head',): img += buf; continue
        sg = max(0.6, key * 0.5 * ppm)          # 粒径 → 高斯半径（像素）
        img += cv2.GaussianBlur(buf, (0, 0), sg) * (2 * math.pi * sg * sg)     # 单颗火花峰值 = 它的亮度，与粒径无关
    # 格子边缘柔和收边，防止渗到相邻格
    ex = np.clip(np.minimum(np.arange(w), w - 1 - np.arange(w)) / (0.06 * w), 0, 1)
    ey = np.clip((h - 1 - np.arange(h)) / (0.02 * h), 0, 1)
    img *= ey[:, None] * ex[None, :]
    return cv2.resize(img, (CW - 2 * PAD, CH - 2 * PAD), interpolation=cv2.INTER_AREA)


# ---------------------------------------------------------------------------------------------
def fit_frame(C, V):
    """取景：先用大面片渲几帧，量出内容在星头下方多远、左右多宽，再把面片收紧到内容（留 4%），保持 1:8"""
    C = dict(C); H0 = C['H'] * 1.6; C['H'] = H0
    fr = [render(C, V, f / FPS) for f in range(0, LOOP_F, 8)]
    E = expo_of(fr, int(C['top'] / H0 * CH)); h, w = fr[0].shape; ppm = h / H0
    m = np.max([(1 - np.exp(-f * E)) > 5 / 255 for f in fr], 0)
    rows = np.nonzero(m.any(1))[0]; cols = np.nonzero(m.any(0))[0]
    below = rows.max() / ppm - C['top']; half = max(abs(cols.min() - w / 2), abs(cols.max() - w / 2)) / ppm
    C['H'] = max((C['top'] + below) * 1.04, 8 * 2 * half * 1.08)
    return C


def ballistic(C):
    """真实弹道（二次阻力）与 Cascade 线性阻力拟合"""
    vt, Ha = C['vt'], C['H_apex']
    v0 = vt * math.sqrt(math.exp(2 * G * Ha / vt ** 2) - 1); th = math.atan(v0 / vt); T = vt / G * th
    t = np.linspace(0, T, 400)
    y = vt ** 2 / G * np.log(np.cos(th - G * t / vt) / math.cos(th)); v = vt * np.tan(th - G * t / vt)
    best = None
    for k in np.linspace(0.02, 3, 600):
        # y = (v0l + g/k)(1-e^-kt)/k - g t/k，v0l 线性最小二乘
        e = (1 - np.exp(-k * t)) / k; b = y + G / k * t - G / k * e
        v0l = float((e * b).sum() / (e * e).sum()); yl = v0l * e + G / k * e - G / k * t
        err = float(np.sqrt(((yl - y) ** 2).mean()))
        if best is None or err < best[0]: best = (err, k, v0l)
    return dict(v0=v0, T=T, t=t, y=y, v=v, k=best[1], v0l=best[2], err=best[0])


def expo_of(frames, top_px):
    """曝光：火花部分（去掉星头附近）的 99.5 分位 → 0.85；与烘焙器同样的 1 − e^(−x·E) 映射"""
    vals = np.concatenate([f[top_px * 3:].ravel() for f in frames]); vals = vals[vals > 1e-6]
    p = np.percentile(vals, 99.5); return -math.log(1 - 0.85) / p


def pack(frames, E):
    tex = np.zeros((CH * ROWS, CW * COLS, 4), np.uint8); per = COLS * ROWS
    for f, img in enumerate(frames):
        c, k = divmod(f, per); col, row = k % COLS, k // COLS
        v = np.clip(1 - np.exp(-img * E), 0, 1)
        tex[row * CH + PAD: row * CH + CH - PAD, col * CW + PAD: col * CW + CW - PAD, c] = np.round(v * 255).astype(np.uint8)
    return tex


def hexrgb(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float64) / 255


def ramp_img(stops, n=256):
    x = np.linspace(0, 1, n); cols = np.stack([np.interp(x, [s[0] for s in stops], [hexrgb(s[1])[c] for s in stops]) for c in range(3)], 1)
    return cols


def colorize(v, ramp):
    """与项目材质相同的口径：颜色 = 渐变图(v) × v（线性空间），再转 sRGB 显示"""
    lin = (ramp ** 2.2)[np.clip((v * 255).astype(int), 0, 255)] * v[..., None]
    return np.clip(lin * 1.6, 0, 1) ** (1 / 2.2)


def size_keys(C, V, bl, Lref):
    """面片长度随时间：尾迹长度 = 星头现在高度 − Lref 秒前的高度；与烘焙速度下的长度之比"""
    t, y = bl['t'], bl['y']; T = bl['T']; out = []
    for u in np.linspace(0, 1, 11):
        tt = u * T; y1 = np.interp(tt, t, y); y0 = np.interp(max(0, tt - Lref), t, y)
        out.append((u, float(np.clip((y1 - y0) / (V * Lref), 0.35, 2.0))))
    return out


def fx(v, d=2): return f'{v:.{d}f}'


def cascade_txt(key, C, V, bl, sk, hb, name, f_end):
    W, H = C['H'] / 8, C['H']; T = bl['T']
    n_loops = T / TLOOP; saw = []
    k = 0
    while k * TLOOP < T - 1e-6:
        a = k * TLOOP / T; b = min(1.0, (k + 1) * TLOOP / T); fr = min(1, (T - k * TLOOP) / TLOOP) * LOOP_F
        saw.append((a, 0.0)); saw.append((b - 1e-4 if b < 1 else 1.0, fr - 0.01 if b < 1 else fr * 1.0)); k += 1
    lines = lambda keys: '\n'.join(f'  {fx(u, 4)}      {fx(v, 3)}' for u, v in keys)
    last = sk[-1][1]
    return f"""升空尾缀 {key}：{C['name']}
================================================================

【贴图】
T_{name}_Loop.png  循环（{LOOP_F} 帧，{fx(TLOOP, 3)} s）：RGBA 接力，R 第 0–15 帧、G 16–31、B 32–47、A 48–63
T_{name}_Fade.png  消散（{FADE_F} 帧，{fx(FADE_F / FPS, 3)} s）：RGBA 接力，每个通道 16 帧，用到 {'RGBA'[:FADE_F // 16]}（其余通道空）
两张都是 2048×1024，{COLS} 列 × {ROWS} 行，单格 {CW}×{CH}（1:8），格子四周留空 {PAD} 像素；灰度线性
导入：sRGB 关闭，压缩 BC7
T_{name}_Ramp.png：渐变图 256×8（sRGB），暗 → 亮 = 冷却的火花 → 高温火花 → 星头
按 {FPS} fps 播放（帧号每秒 +{FPS}）

【材质实例】
项目现有的 RGBA 序列帧材质，列 = {COLS}，行 = {ROWS}，Ramp = T_{name}_Ramp；循环、消散各一个材质实例（只换贴图）

【弹道】
真实（二次阻力）：出膛 {fx(bl['v0'], 1)} m/s，{fx(T, 2)} s 到达 {C['H_apex']} m
Cascade 线性阻力拟合：Initial Velocity Z = {bl['v0l'] * 100:.0f} cm/s；Drag = {fx(bl['k'], 3)}；Const Acceleration Z = −981 cm/s²（高度误差 {fx(bl['err'], 1)} m）
贴图按上升速度 {fx(V, 1)} m/s 烘焙（约全程 35% 处的速度）；速度不同时尾迹长度靠 Size By Life 的 Y 缩放

【发射器 1：上升循环】
Required：Material = 循环材质实例；Screen Alignment = Velocity；Emitter Duration = {fx(T, 3)} s；Emitter Loops = 1
  Pivot Offset：星头在贴图里距底边 {fx(hb * 100, 1)}% 处。默认 (−0.5, −0.5) 是面片中心；把 Y 改为 {fx(-(1 - hb), 3)}，
  若星头跑到另一端就改为 {fx(-hb, 3)}。以编辑器里星头落在粒子位置、尾巴拖在后面为准
Spawn：Rate = 0；Burst Count = 1，Time = 0
Lifetime = {fx(T, 3)} s
Initial Size：X = {W * 100:.0f} cm，Y = {H * 100:.0f} cm
Initial Velocity：Z = {bl['v0l'] * 100:.0f} cm/s；Drag：Drag Coefficient = {fx(bl['k'], 3)}；Const Acceleration：Z = −981 cm/s²
Size By Life（Y 单独；X 保持 1）：尾迹长度跟着速度变（出膛快 → 长；到顶慢 → 短）
  相对时间    Y 倍数
{lines(sk)}
Dynamic Parameter：帧号通道（按导入配置，实测第 0 通道）= 帧号（锯齿，Linear；每 {fx(TLOOP, 3)} s 从 0 走到 {LOOP_F}，约 {fx(n_loops, 1)} 个循环）
  相对时间    帧号
{lines(saw)}
Color Over Life：白色常量（颜色全由 Ramp 给），Alpha = 1；亮度倍数按项目曝光调
摆动：已烘焙在贴图里（星头在面片上端左右摆、尾迹是波浪），不需要 Orbit

【发射器 2：消散（接在发射器 1 后面）】
Required：Material = 消散材质实例；Screen Alignment = Velocity；Emitter Delay = {fx(T, 3)} s；Emitter Duration = {fx(FADE_F / FPS, 3)} s；Loops = 1
  Pivot Offset：同发射器 1
Spawn：Burst Count = 1，Time = 0；Lifetime = {fx(FADE_F / FPS, 3)} s
Initial Location：Z = {C['H_apex'] * 100:.0f} cm（开花点，与发射器 1 到顶位置相同）
Initial Velocity：Z = 1 cm/s（只用来给面片定方向，几乎不动；不要 Drag、Const Acceleration）
Initial Size：X = {W * 100:.0f} cm，Y = {H * last * 100:.0f} cm（= 发射器 1 最后一个 Y 倍数 {fx(last, 3)} × {H * 100:.0f} cm，两段长度一致）
Dynamic Parameter：帧号通道（按导入配置，实测第 0 通道）= 帧号（Linear）
  0.0000      0.000
  1.0000      {FADE_F:.3f}
Color Over Life：同发射器 1
接力：发射器 1 在 {fx(T, 3)} s 结束时正好播到循环第 {f_end} 帧；消散贴图第 0 帧就是这一帧的画面，
  之后停止喷火花、已有火花继续冷却熄灭，所以两段接上没有跳变。改了 Lifetime 或帧号曲线的话，消散贴图要重新烘焙。

【overdraw】
面片 {fx(W, 1)} × {fx(H, 1)} m（1:8 细长条，只有一个粒子），格子内容占比见预览
"""


def main(outdir):
    global FADE_F
    for key, C in TRAILS.items():
        name = f'RiseTrail_{key}'
        d = os.path.join(outdir, name); os.makedirs(d, exist_ok=True)
        bl = ballistic(C)
        V = float(np.interp(0.35 * bl['T'], bl['t'], bl['v']))
        C = fit_frame(C, V)
        loop = [render(C, V, f / FPS) for f in range(LOOP_F)]
        E = expo_of(loop, int(C['top'] / C['H'] * CH))
        f_end = int((bl['T'] % TLOOP) * FPS) % LOOP_F   # 上升结束（开花）时循环正好播到第 f_end 帧
        tb = f_end / FPS
        fade = []
        for f in range(4 * COLS * ROWS):
            img = render(C, V, tb + f / FPS, stop=tb, head_on=(f == 0)); fade.append(img)
            if f >= COLS * ROWS - 1 and (f + 1) % (COLS * ROWS) == 0 and (1 - np.exp(-img * E)).max() < 1.5 / 255: break
        FADE_F = len(fade)
        Image.fromarray(pack(loop, E), 'RGBA').save(os.path.join(d, f'T_{name}_Loop.png'))
        Image.fromarray(pack(fade, E), 'RGBA').save(os.path.join(d, f'T_{name}_Fade.png'))
        ramp = ramp_img(C['ramp'])
        Image.fromarray(np.round(np.repeat(ramp[None], 8, 0) * 255).astype(np.uint8), 'RGB').save(os.path.join(d, f'T_{name}_Ramp.png'))
        Lref = max(p[2] for p in C['pops'])
        sk = size_keys(C, V, bl, Lref)
        hb = 1 - (C['top'] + PAD * C['H'] / (CH - 2 * PAD)) / C['H']
        open(os.path.join(d, f'{name}_Cascade参数.txt'), 'w', encoding='utf-8').write(cascade_txt(key, C, V, bl, sk, hb, name, f_end))
        # 检查：无缝（循环第 0 帧 vs 第 64 帧）、接力（消散第 0 帧 vs 循环第 0 帧）
        seam = float(np.abs(1 - np.exp(-render(C, V, LOOP_F / FPS) * E) - (1 - np.exp(-loop[0] * E))).mean() * 255)
        relay = float(np.abs((1 - np.exp(-fade[0] * E)) - (1 - np.exp(-loop[f_end] * E))).mean() * 255)
        fill = float(np.mean([(1 - np.exp(-f * E) > 2 / 255).any(1).mean() for f in loop]))
        meta = dict(V_bake=round(V, 2), rise_T=round(bl['T'], 3), v0=round(bl['v0'], 1), exposure=float(E), seam_mean_abs=round(seam, 3), relay_mean_abs=round(relay, 3), rows_with_content=round(fill, 3),
                    H=C['H'], W=C['H'] / 8, hb=hb, H_apex=C['H_apex'], v0_lin=bl['v0l'], drag=bl['k'], size_keys_y=sk, relay_loop_frame=f_end, loop_frames=LOOP_F, fade_frames=FADE_F, fps=FPS, ramp=C['ramp'])
        json.dump(meta, open(os.path.join(d, f'{name}_检查.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(key, meta, flush=True)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'samples'))
