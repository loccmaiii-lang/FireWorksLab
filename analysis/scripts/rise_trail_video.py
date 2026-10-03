"""升空尾缀（实拍取材版）：直接从参考视频里取尾迹，做成速度朝向面片用的「循环 + 消散」序列。

循环：
  逐帧跟踪星头（亚像素），按星头运动方向把画面转正（尾迹朝下），以星头为锚点裁出细长条；
  扣背景、去噪、只保留尾迹连通块；按尾迹长度做轻微统一缩放（上升中尾迹会慢慢变长）；
  转成线性亮度灰度；最后 K 帧与开头交叉淡化，首尾无缝。
  有重复帧的视频（尾缀C 每 3 帧重复 1 帧、尾缀A 后半段丢帧）先去重，按实际独立帧率播放。
消散（实拍里开花后的尾迹，见 青柠星.mp4）：
  从上升结束那一帧开始：星头立即熄灭；白热部分 0.15 s 内褪成橙色；火星按「离星头越远越早灭」逐颗熄灭
  （上端最新的火星能留 2–3 s），同时缓慢冷却变暗变红、略微下坠、轻微闪烁。
颜色：渐变图直接从实拍统计（按亮度分档求平均颜色），项目材质 颜色 = 渐变图(v) × v 即可还原。
贴图：2048×512，32 列 × 1 行，单格 64×512（1:8），RGBA 接力（每通道 32 帧），灰度线性。
用法：python rise_trail_video.py [输出目录]（默认 samples/）
"""
import os, sys, json, math
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import trailkit as K
import rise_trail as R

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
COLS, CW, CH, PAD = 32, 64, 512, 2
TOP = 0.05            # 星头距格子顶端（占格高）
SPEC = {
    'S': dict(name='小 · 简单礼花（取材 尾缀C）', video='vidio/2.0/尾缀C.mp4', frames=(6, 82), K=4, H_apex=120, vt=35, H_m=24.0, fade_s=3.5),
    'M': dict(name='中 · 金芒菊级（取材 尾缀B）', video='vidio/2.0/尾缀B.mp4', frames=(56, 152), K=5, H_apex=200, vt=45, H_m=44.0, fade_s=3.5),
    'L': dict(name='大 · 四尺玉级（取材 尾缀A）', video='vidio/2.0/尾缀A.mp4', frames=(60, 200), K=5, H_apex=600, vt=90, H_m=96.0, fade_s=3.8),
}


def read_all(path):
    cap = cv2.VideoCapture(path); fps = cap.get(5) or 30; N = int(cap.get(7)); pick = set(np.linspace(0, N - 1, 15).astype(int).tolist())
    fr, bgs, i = [], [], 0
    while True:
        ok, f = cap.read()
        if not ok: break
        if i in pick: bgs.append(K.lin(f))
        fr.append(f); i += 1
    return fr, np.median(np.stack(bgs), 0), fps


def head_subpix(sig, h):
    Y = sig.sum(2); x0, y0 = int(h[0]), int(h[1]); r = 7
    win = Y[max(0, y0 - 2):y0 + r, max(0, x0 - r):x0 + r + 1]
    m = win > 0.5 * win.max(); yy, xx = np.nonzero(m); w = win[m]
    return (max(0, x0 - r) + (xx * w).sum() / w.sum(), max(0, y0 - 2) + (yy * w).sum() / w.sum())


def luminance(sig_bgr):
    return 0.0722 * sig_bgr[..., 0] + 0.7152 * sig_bgr[..., 1] + 0.2126 * sig_bgr[..., 2]


def extract(key):
    S = SPEC[key]; fr, bg, fps = read_all(os.path.join(ROOT, S['video']))
    a, b = S['frames']; raw = []
    prev = None
    for i in range(a, min(b, len(fr))):
        if prev is not None and np.array_equal(fr[i], prev): continue
        prev = fr[i]
        sig = K.signal(K.lin(fr[i]), bg); h, sig = K.find_head(sig); h = head_subpix(sig, h)
        if raw and np.hypot(*(np.array(h) - raw[-1]['h'])) < 0.3: continue               # 星头没动 = 重复帧
        st, line = K.straighten(sig, h); L = K.trail_length(st)
        rr = np.arange(3, max(8, int(0.6 * L))); slope = np.polyfit(rr, line[rr], 1)[0]   # 每向下 1 像素，中心线横移多少
        # 只留星头附近一块（省内存）
        x0, y0 = max(0, int(h[0]) - 320), max(0, int(h[1]) - 120)
        raw.append(dict(i=i, t=i / fps, sig=sig[y0:y0 + 1000, x0:x0 + 640].copy(), off=np.array([x0, y0], np.float64), h=np.array(h), L=L, slope=slope))
        del sig
    n = len(raw); span = raw[-1]['t'] - raw[0]['t']; fps_eff = (n - 1) / span
    # 星头轨迹平滑（二次拟合），速度方向 → 旋转角；尾迹长度平滑 → 统一缩放
    t = np.array([r['t'] for r in raw]); hx = np.array([r['h'][0] for r in raw]); hy = np.array([r['h'][1] for r in raw])
    # 转正角度：按尾迹本身的走向（尾迹沿过去的轨迹，比星头瞬时速度更能把整条尾迹装进细长面片）
    sl = np.polyval(np.polyfit(t, [r['slope'] for r in raw], 2), t)
    Ls = np.convolve(np.pad([r['L'] for r in raw], 4, mode='edge'), np.ones(9) / 9, mode='valid')
    Lmed = float(np.median(Ls))
    Hc = Lmed * 1.12 / (1 - TOP); Wc = Hc / 8; sc = (CH - 2 * PAD) / Hc
    frames, colstats = [], []
    for k, r in enumerate(raw):
        ang = -math.atan(sl[k])                               # 让尾迹竖直向下
        s = sc * Lmed / Ls[k]
        ca, sa = math.cos(ang), math.sin(ang)
        # 输出像素 (u, v) → 源像素：以星头为原点，先缩放再旋转
        cx, cy = (CW - 2 * PAD) / 2, TOP * (CH - 2 * PAD)
        M = np.array([[ca / s, -sa / s, 0], [sa / s, ca / s, 0]], np.float64)
        M[:, 2] = (r['h'] - r['off']) - M[:, :2] @ np.array([cx, cy])
        crop = cv2.warpAffine(r['sig'], M, (CW - 2 * PAD, CH - 2 * PAD), flags=cv2.INTER_AREA | cv2.WARP_INVERSE_MAP, borderValue=0)
        frames.append(crop)
    # 底边 6% 柔和收边（尾迹最末的零星火星不在格子边上被硬切）
    ramp_edge = np.clip((CH - 2 * PAD - 1 - np.arange(CH - 2 * PAD)) / (0.06 * (CH - 2 * PAD)), 0, 1)[:, None, None]
    frames = [c * ramp_edge for c in frames]
    Y = [luminance(c) for c in frames]
    allY = np.concatenate([y.ravel() for y in Y]); ref = np.percentile(allY[allY > 0], 99.7)
    noise = np.percentile(allY[allY > 0], 50) * 0.5
    V = [np.clip((y - noise) / (ref - noise), 0, 1) for y in Y]
    # 渐变图：按 v 分档统计实拍颜色（线性，按最大通道归一）
    u = np.concatenate([v.ravel() for v in V]); rgb = np.concatenate([c.reshape(-1, 3)[:, ::-1] for c in frames])
    ramp = np.zeros((256, 3)); cen, val = [], []
    for bb in range(32):
        sel = (u > bb / 32) & (u <= (bb + 1) / 32)
        if sel.sum() < 40: continue
        c = np.median(rgb[sel], 0); c = c / c.max(); lum = c.mean(); c = np.clip(lum + (c - lum) * 1.2, 0, None); cen.append((bb + .5) / 32); val.append(c / c.max())
    x = np.linspace(0, 1, 256)
    for ch in range(3): ramp[:, ch] = np.interp(x, cen, np.array(val)[:, ch])
    return dict(V=V, fps=fps_eff, n=n, Lmed=Lmed, ramp=ramp, head=((CW - 2 * PAD) / 2, TOP * (CH - 2 * PAD)), L_px=Lmed * sc)


def make_loop(V, Kx):
    """在可用帧里找一段：第 s+N+j 帧与第 s+j 帧（j < K）最像，交叉淡化后首尾无缝、重影最少"""
    n = len(V); best = None
    for N in range(32, 65, 8):
        for s0 in range(0, n - N - Kx + 1):
            e = np.mean([np.abs(V[s0 + N + j] - V[s0 + j]).mean() for j in range(Kx)]) * (1 + 0.004 * (64 - N))
            if best is None or e < best[0]: best = (e, s0, N)
    _, s0, N = best; out = []
    for i in range(N):
        if i < Kx:
            w = (i + 0.5) / Kx; out.append(V[s0 + i] * w + V[s0 + i + N] * (1 - w))
        else: out.append(V[s0 + i])
    return out


def make_fade(base, fps, dur, L_px, head, seed=3):
    """消散：base = 上升结束那一帧（线性亮度 0–1）"""
    rng = np.random.default_rng(seed); h, w = base.shape
    n = int(math.ceil(dur * fps))
    yy = np.arange(h)[:, None] * np.ones((1, w)); d = np.clip((yy - head[1]) / L_px, 0, 1.2)
    nz = cv2.GaussianBlur(rng.random((h, w)).astype(np.float32), (0, 0), 1.6); nz = (nz - nz.min()) / (np.ptp(nz) + 1e-6)
    tw = cv2.GaussianBlur(rng.random((h, w)).astype(np.float32), (0, 0), 1.6); tw = (tw - tw.min()) / (np.ptp(tw) + 1e-6)
    t_ext = 0.8 + (dur * 0.97 - 0.8) * np.clip(1 - d, 0, 1) ** 0.6 * (0.55 + 0.9 * nz)   # 实拍：开花后约 1 s 内整条还在；之后离开花点越远越早灭，逐颗随机
    hot = np.clip(base - 0.55, 0, None); warm = base - hot
    headmask = np.exp(-(((np.arange(w)[None] - head[0]) / 9.0) ** 2 + ((np.arange(h)[:, None] - head[1]) / 10.0) ** 2))
    dots = cv2.GaussianBlur(rng.random((h, w)).astype(np.float32), (0, 0), 1.2); dots = np.clip((dots - np.percentile(dots, 55)) / (np.ptp(dots) * 0.25), 0, 1)
    frames = []
    for f in range(n):
        tau = f / fps
        alive = np.clip((t_ext - tau) / 0.12, 0, 1)
        cool = math.exp(-tau / 3.5)
        flick = 1 + 0.22 * np.sin(2 * math.pi * (1.5 + 2.5 * tw) * tau + 6.28 * nz) * min(1, tau / 0.3)
        brk = min(1.0, tau / 0.6)                                   # 连续的亮线逐渐碎成一颗颗火星
        img = (warm * cool * alive * flick + hot * math.exp(-tau / 0.15)) * ((1 - brk) + brk * np.clip(0.45 + 0.9 * dots, 0, 1.2))
        if f > 0: img = img * (1 - headmask * min(1, f / 2))
        # 缓慢下坠 + 扩散
        dy = 0.5 * 0.025 * L_px * tau * tau
        Mt = np.float32([[1, 0, 0], [0, 1, dy]])
        img = cv2.warpAffine(img.astype(np.float32), Mt, (w, h), flags=cv2.INTER_LINEAR, borderValue=0)
        sg = 0.2 + 0.2 * tau
        img = cv2.GaussianBlur(img, (0, 0), sg) if sg > 0.3 else img
        frames.append(np.clip(img, 0, 1))
    return frames


def pack(frames):
    tex = np.zeros((CH, CW * COLS, 4), np.uint8)
    for f, img in enumerate(frames):
        c, k = divmod(f, COLS)
        tex[PAD:CH - PAD, k * CW + PAD:(k + 1) * CW - PAD, c] = np.round(np.clip(img, 0, 1) * 255).astype(np.uint8)
    return tex


def fx(v, d=2): return f'{v:.{d}f}'


def cascade_txt(key, S, D, bl, sk, hb, name, f_end, Wm, Hm, V_bake):
    fps, NL, NF = D['fps'], D['NL'], D['NF']; T = bl['T']; TL = NL / fps
    saw = []; k = 0
    while k * TL < T - 1e-6:
        a = k * TL / T; b = min(1.0, (k + 1) * TL / T); fr = min(1, (T - k * TL) / TL) * NL
        saw.append((a, 0.0)); saw.append((b - 1e-4 if b < 1 else 1.0, fr - 0.01 if b < 1 else fr)); k += 1
    lines = lambda keys: '\n'.join(f'  {fx(u, 4)}      {fx(v, 3)}' for u, v in keys)
    last = sk[-1][1]; chans = 'RGBA'[:math.ceil(NF / COLS)]
    return f"""升空尾缀 {key}：{S['name']}
================================================================
取材：{S['video']} 实拍尾迹逐帧转正、裁切、去背景（独立帧率 {fx(fps, 1)} fps）；消散按 青柠星.mp4 里开花后尾迹的消失方式合成

【贴图】
T_{name}_Loop.png  循环 {NL} 帧（{fx(TL, 3)} s）：RGBA 接力，每通道 {COLS} 帧，用到 {'RGBA'[:math.ceil(NL / COLS)]}
T_{name}_Fade.png  消散 {NF} 帧（{fx(NF / fps, 3)} s）：RGBA 接力，每通道 {COLS} 帧，用到 {chans}（最后一个通道没填满的格子是空的）
两张都是 2048×512，{COLS} 列 × 1 行，单格 {CW}×{CH}（1:8），格子四周留空 {PAD} 像素；灰度线性
导入：sRGB 关闭，压缩 BC7
T_{name}_Ramp.png：渐变图 256×8（sRGB），从实拍统计：暗 = 冷却的橙红火星，亮 = 白热段和星头
播放帧率 {fx(fps, 2)} 帧/秒（实拍的独立帧率；帧号曲线已按它算好）

【材质实例】
项目现有的 RGBA 序列帧材质，列 = {COLS}，行 = 1，Ramp = T_{name}_Ramp；循环、消散各一个材质实例（只换贴图）

【弹道】
真实（二次阻力）：出膛 {fx(bl['v0'], 1)} m/s，{fx(T, 2)} s 到达 {S['H_apex']} m
Cascade 线性阻力拟合：Initial Velocity Z = {bl['v0l'] * 100:.0f} cm/s；Drag = {fx(bl['k'], 3)}；Const Acceleration Z = −981 cm/s²（高度误差 {fx(bl['err'], 1)} m）
面片长度 {fx(Hm, 1)} m 对应上升速度 {fx(V_bake, 1)} m/s 时的尾迹；速度不同时靠 Size By Life 的 Y 缩放

【发射器 1：上升循环】
Required：Material = 循环材质实例；Screen Alignment = Velocity；Emitter Duration = {fx(T, 3)} s；Emitter Loops = 1
  Pivot Offset：星头在贴图里距底边 {fx(hb * 100, 1)}% 处。默认 (−0.5, −0.5) 是面片中心；把 Y 改为 {fx(-(1 - hb), 3)}，
  若星头跑到另一端就改为 {fx(-hb, 3)}。以编辑器里星头落在粒子位置、尾巴拖在后面为准
Spawn：Rate = 0；Burst Count = 1，Time = 0；Lifetime = {fx(T, 3)} s
Initial Size：X = {Wm * 100:.0f} cm，Y = {Hm * 100:.0f} cm
Initial Velocity：Z = {bl['v0l'] * 100:.0f} cm/s；Drag：Drag Coefficient = {fx(bl['k'], 3)}；Const Acceleration：Z = −981 cm/s²
Size By Life（Y 单独；X 保持 1）
  相对时间    Y 倍数
{lines(sk)}
Dynamic Parameter：帧号通道（按导入配置，实测第 0 通道）= 帧号（锯齿，Linear；每 {fx(TL, 3)} s 从 0 走到 {NL}）
  相对时间    帧号
{lines(saw)}
Color Over Life：白色常量（颜色全由 Ramp 给），Alpha = 1；亮度倍数按项目曝光调
摆动：实拍里的扭动已经在贴图里，不需要 Orbit

【发射器 2：消散（接在发射器 1 后面）】
Required：Material = 消散材质实例；Screen Alignment = Velocity；Emitter Delay = {fx(T, 3)} s；Emitter Duration = {fx(NF / fps, 3)} s；Loops = 1
  Pivot Offset：同发射器 1
Spawn：Burst Count = 1，Time = 0；Lifetime = {fx(NF / fps, 3)} s
Initial Location：Z = {S['H_apex'] * 100:.0f} cm（开花点）
Initial Velocity：Z = 1 cm/s（只用来给面片定方向；不要 Drag、Const Acceleration）。斜着发射时改成与上升末段相同的方向
Initial Size：X = {Wm * 100:.0f} cm，Y = {Hm * last * 100:.0f} cm（= 发射器 1 最后的 Y 倍数 {fx(last, 3)} × {Hm * 100:.0f} cm）
Dynamic Parameter：帧号通道（按导入配置，实测第 0 通道）= 帧号（Linear）
  0.0000      0.000
  1.0000      {NF:.3f}
Color Over Life：同发射器 1
接力：发射器 1 在 {fx(T, 3)} s 结束时播到循环第 {f_end} 帧；消散第 0 帧就是这一帧，之后星头熄灭、火星从下往上逐颗熄灭。
  改了 Lifetime 或帧号曲线，要按新的结束帧重新生成消散贴图（rise_trail_video.py 里改 H_apex / vt 重跑）。
"""


def main(outdir):
    for key, S in SPEC.items():
        name = f'RiseTrail_{key}'; d = os.path.join(outdir, name); os.makedirs(d, exist_ok=True)
        D = extract(key)
        loop = make_loop(D['V'], S['K']); NL = len(loop); fps = D['fps']
        C = dict(H_apex=S['H_apex'], vt=S['vt']); bl = R.ballistic(C)
        V_bake = float(np.interp(0.35 * bl['T'], bl['t'], bl['v']))
        f_end = int((bl['T'] % (NL / fps)) * fps) % NL
        fade = make_fade(loop[f_end], fps, S['fade_s'], D['L_px'], D['head'])
        D.update(NL=NL, NF=len(fade))
        Image.fromarray(pack(loop), 'RGBA').save(os.path.join(d, f'T_{name}_Loop.png'))
        Image.fromarray(pack(fade), 'RGBA').save(os.path.join(d, f'T_{name}_Fade.png'))
        ramp_srgb = np.clip(D['ramp'], 0, 1) ** (1 / 2.2)
        Image.fromarray(np.round(np.repeat(ramp_srgb[None], 8, 0) * 255).astype(np.uint8), 'RGB').save(os.path.join(d, f'T_{name}_Ramp.png'))
        Hm = S['H_m']; Wm = Hm / 8
        Lref = (D['L_px'] / (CH - 2 * PAD)) * Hm / V_bake          # 尾迹「可见时长」≈ 长度 / 速度
        sk = R.size_keys(C, V_bake, bl, Lref)
        hb = 1 - (TOP * (CH - 2 * PAD) + PAD) / CH
        open(os.path.join(d, f'{name}_Cascade参数.txt'), 'w', encoding='utf-8').write(cascade_txt(key, S, D, bl, sk, hb, name, f_end, Wm, Hm, V_bake))
        seam = float(np.abs(loop[-1] - loop[0]).mean() * 255); step = float(np.mean([np.abs(loop[i + 1] - loop[i]).mean() for i in range(NL - 1)]) * 255)
        meta = dict(fps=round(fps, 3), loop_frames=NL, fade_frames=len(fade), relay_loop_frame=f_end, rise_T=round(bl['T'], 3), H=Hm, W=Wm, hb=hb,
                    H_apex=S['H_apex'], v0_lin=bl['v0l'], cols=COLS, cw=CW, ch=CH, drag=bl['k'], size_keys_y=sk, seam_step=round(seam, 2), mean_step=round(step, 2), source=S['video'])
        json.dump(meta, open(os.path.join(d, f'{name}_检查.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        # 旧版（程序生成）遗留的文件名不同，这里不删；以本次输出为准
        print(key, {k: meta[k] for k in ['fps', 'loop_frames', 'fade_frames', 'relay_loop_frame', 'seam_step', 'mean_step']}, flush=True)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'samples'))
