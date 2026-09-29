"""升空尾缀 · 物理模型 → 引擎素材（第二代，2026-09-29）

物理模型（trail_phys.py）是地面坐标里的真实过程；进 Cascade 时拆成两层，两层都按物理规律摆放：

1. 星头白热段 Head（1 个粒子，速度朝向面片）：燃气焰 + 火粉（寿命 0.1–0.3 s 的细火花）。
   在「随弹体坐标」里匀速上升时是稳态的，所以烘成一段无缝循环（火粉按周期复制，自转频率取整）；
   长度随弹体速度变：Size By Life 的 Y 按速度曲线缩放（出膛长、到顶短）。
2. 金火星簇 Puff（世界坐标，按出生时刻落在弹道上）：一簇 = 同一瞬间喷出的一小团木炭火星（粒径对数正态，按分位取样），
   贴图里是这一团火星自己的散开、闪烁、燃尽（大颗烧得久、小颗先灭）；这一团整体怎么动交给 Cascade：
   Initial Location = 弹道位置（曲线，按发射器时间取），Initial Velocity = 弹体速度 − 喷出速度（曲线 ± 随机），
   Drag = 空气阻力，Acceleration = 重力 + 阻力 × 风（按高度的横风，曲线）。所以尾迹在空中不动、随风慢慢漂、有冻住的波浪。

输出（analysis/results/<任务号>/）：
  T_EFX_FireWorks_RiseTrail_Head_16x1_01.png、T_EFX_FireWorks_RiseTrail_Puff_4x4_01.png（2048，RGBA 接力，线性灰度）
  T_EFX_FireWorks_RiseTrail_Ramp.png、RiseTrail_Cascade参数.txt、RiseTrail.json、preview.js、预览.jpg、对照图与数值
用法：python trail_phys_bake.py [任务号，默认 TP1]
"""
import os, sys, json, math, io, base64
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import trail_phys as T

NAME = 'RiseTrail'; TEX = 2048
PFX = 'T_EFX_FireWorks_'


def tn(part, L=None, idx=1): return f"{PFX}{NAME}{'_' + part if part else ''}{f'_{L[0]}x{L[1]}' if L else ''}_{idx:02d}"


def pack(frames, cols, rows, chans=4):
    """帧列表（每帧 ch×cw 的 uint8）→ RGBA 接力图集：先填满 R 的所有格子，再 G、B、A；格子行优先，左上为第 0 帧"""
    ch, cw = frames[0].shape; per = cols * rows; out = np.zeros((rows * ch, cols * cw, chans), np.uint8)
    for f, im in enumerate(frames):
        c, k = divmod(f, per); r, q = divmod(k, cols); out[r * ch:(r + 1) * ch, q * cw:(q + 1) * cw, c] = im
    return out


def auto_E(frames, target=0.92, pct=99.8):
    v = np.concatenate([f[f > 1e-7].ravel() for f in frames]); p = np.percentile(v, pct) if len(v) else 1.0
    return float(-math.log(1 - target) / p)


def enc(x, E): return np.clip(np.round((1 - np.exp(-E * x)) * 255), 0, 255).astype(np.uint8)


def saw_keys(T_life, fps, F):
    """循环帧号曲线（按相对寿命）：帧 = (u·T·fps) mod F，锯齿形，每圈一段"""
    n = T_life * fps / F; keys = [[0.0, 0.0]]; c = 1
    while c < n:
        u = c / n; keys += [[round(u - 1e-4, 5), round(F - 1e-3, 3)], [round(u, 5), 0.0]]; c += 1
    keys.append([1.0, round((n - (c - 1)) * F, 3)]); return keys


# ---------------------------------------------------------------------------------------------
def bake_head(P, v_ref=50.0, F=64, fps=30, cols=16, rows=1, ss=2, log=print):
    Tp = F / fps
    Q = json.loads(json.dumps(P)); Q.update(const_v=v_ref, turb=0.0, wind=0.0, wob=0.0)
    Q['spin'] = dict(Q['spin']); Q['spin']['f'] = round(P['spin']['f'] * Tp) / Tp       # 自转整圈数/周期 → 无缝
    Q['pops'] = [dict(P['pops'][0])]
    S0 = T.emit(Q, (0.0, Tp)); life_max = float(S0['life'].max()); K = int(math.ceil(life_max / Tp)) + 1
    parts = []
    for k in range(-1, K + 1):                                    # 同一批火粉按周期前后复制：t 和 t+Tp 的画面完全一样
        S = {kk: v.copy() for kk, v in S0.items()}; S['tb'] = S['tb'] - k * Tp; S['p0'][:, 2] -= v_ref * k * Tp; parts.append(S)
    S = {kk: np.concatenate([p[kk] for p in parts]) for kk in S0}
    # 取景：先大画布低分辨率量内容范围（亮度 99.5%）
    pr = 20.0; Wp, Hp = 160, 800
    acc = np.zeros((Hp, Wp), np.float32)
    for i in range(6):
        cam = T.Cam('shell', Wp, Hp, Wp / 2, 20, ppm=pr, shutter=1 / 60, nsub=4, psf=0.5)
        acc = np.maximum(acc, T.render(Q, S, Tp + i * Tp / 6, cam, rgb=False)[..., 0])
    rows_c = np.cumsum(acc.sum(1)); L = (np.searchsorted(rows_c, 0.995 * rows_c[-1]) - 20) / pr + 0.3
    colsum = acc.sum(0)
    order = np.argsort(np.abs(np.arange(Wp) - Wp / 2)); cs = np.cumsum(colsum[order]); half = (np.abs(np.arange(Wp) - Wp / 2)[order][np.searchsorted(cs, 0.995 * cs[-1])] + 2) / pr
    cw, chh = TEX // cols, TEX // rows
    top = 0.25                                                   # 星头上方留 0.25 m（火焰尖、光晕）
    ppm = min(chh / (L + top), cw / (2 * half))
    Wm, Hm = cw / ppm, chh / ppm
    log(f'  星头段：长 {L:.1f} m（v={v_ref:.0f} m/s）半宽 {half:.2f} m → 面片 {Wm:.2f} × {Hm:.2f} m，{ppm:.0f} 像素/米')
    frames = []
    for f in range(F):
        cam = T.Cam('shell', cw * ss, chh * ss, cw * ss / 2, top * ppm * ss, ppm=ppm * ss, shutter=1 / 60, nsub=8, psf=0.6 * ss)
        im = T.render(Q, S, Tp + f * Tp / F, cam, rgb=False)[..., 0]
        frames.append(cv2.resize(im, (cw, chh), interpolation=cv2.INTER_AREA))
    E = auto_E(frames, 0.92, 99.8)
    # 长度随速度：L(v) = 火焰 (l0 + lv·v) + 火粉段 (≈ v·τ)
    fl = P['flame']; tau = max(0.02, (L - fl['l0'] - fl['lv'] * v_ref) / v_ref)
    Lv = lambda v: fl['l0'] + fl['lv'] * v + v * tau
    return dict(frames=[enc(x, E) for x in frames], E=E, ppm=ppm, wh=[Wm, Hm], pivot=[0.5, top / Hm], L=L, v_ref=v_ref, Lv=Lv, Tp=Tp, fps=fps, F=F, cols=cols, rows=rows)


def bake_puff(P, n=14, F=64, cols=4, rows=4, ss=2, log=print, seed=11, r_tex=0.012):
    """r_tex：贴图里每颗火星的发光半径（m）。实物 0.5–1 mm，远看就是一个点；近景里的大光斑是相机过曝 + 光晕，不烘进贴图"""
    g = P['pops'][1]; r = np.random.default_rng(seed)
    from scipy.stats import norm
    z = norm.ppf((np.arange(n) + 0.5) / n); r.shuffle(z)                  # 按分位取样：一簇就代表整个粒径分布
    life = g['life'] * np.exp(g['lsig'] * z); size = np.exp(0.5 * g['lsig'] * z); kd = g['kd'] / size
    D = float(min(life.max(), 3.2))                                 # 最后一两颗大火星烧到 4 s 以上时很暗：截到 3.2 s，格子留给有东西的帧
    ang = r.uniform(0, 2 * np.pi, n); vr = g['cone'] * np.abs(r.normal(0, 1, n)) + 0.3
    v0 = np.stack([np.cos(ang) * vr, np.sin(ang) * vr], -1)               # 相对这一簇中心的横向速度（喷口散开）
    j = r.normal(0, P['jit'], (n, 2)) * 1.0                                # 单颗随机漂移
    T0 = g['T0'] + r.normal(0, 60, n); twf = r.uniform(7, 16, n); twp = r.uniform(0, 6.28, n)
    def state(t):
        a = np.full(n, t); e = np.exp(-kd * a); s1 = (1 - e) / kd
        p = v0 * s1[:, None] + j * a[:, None]
        u = np.clip(a / life, 0, 1); alive = a < life
        Tb = g.get('Tb', g['T0']); Tk = Tb + (T0 - Tb) * np.exp(-a / g.get('tc', 1e3)) - (Tb - g['Tend']) * u ** g['pt']
        tw = 1 + g['tw'] * np.sin(twf * a * 6.283 + twp) * np.sin(twf * 0.37 * a * 6.283 + 1.3 * twp)
        I = g['I'] * size ** 2 * (1 - u) ** g.get('pm', 1.0) * np.clip(a / 0.03, 0, 1) * tw * T.bb_lum(Tk) / T.bb_lum(2350.0) * alive
        return p, I, Tk
    ext = max(np.abs(state(t)[0][state(t)[1] > 0]).max(initial=0) for t in np.linspace(0, D, 20))
    half = ext + 3 * r_tex * 1.6 + 0.03
    cw, chh = TEX // cols, TEX // rows; ppm = cw / (2 * half)
    log(f'  金火星簇：{n} 颗，寿命 {life.min():.2f}–{life.max():.2f} s（簇 {D:.2f} s），半径 {half:.2f} m，{ppm:.0f} 像素/米')
    frames, samples = [], []
    for f in range(F):
        t = (f + 0.5) / F * D; W = cw * ss; img = np.zeros((W, W), np.float32)
        for sub in range(4):
            ts = t + (sub / 4 - 0.375) * (D / F) * 0.5
            p, I, Tk = state(ts)
            m = I > 0
            if not m.any(): continue
            px = W / 2 + p[m, 0] * ppm * ss; py = W / 2 - p[m, 1] * ppm * ss
            for sg in np.unique(np.round(r_tex * size[m] * ppm * ss, 1)):
                mm = np.round(r_tex * size[m] * ppm * ss, 1) == sg
                lay = np.zeros((W, W, 1), np.float32); T._splat(lay, px[mm], py[mm], (I[m][mm] / 4)[:, None])
                img += cv2.GaussianBlur(lay[..., 0], (0, 0), max(0.6, float(sg)))
            samples.append((I[m], Tk[m]))
        frames.append(cv2.resize(img, (cw, chh), interpolation=cv2.INTER_AREA))
    # 逐帧曝光：火星越烧越暗，统一曝光的话后半段只剩 0–10 的灰度（8 位不够）。每帧单独按 99.8 分位 → 0.92 曝光，
    # 再用 Color Over Life 乘回去（颜色倍数 = E0 / E_f）。曝光只增不减、最多 ×60，逐帧平滑
    Ef = np.array([auto_E([x], 0.92, 99.8) if (x > 1e-7).any() else np.nan for x in frames]); E0 = Ef[0]
    Ef = np.where(np.isnan(Ef), np.nanmax(Ef), Ef); Ef = np.maximum.accumulate(np.clip(Ef, E0, 60 * E0))
    Ef = np.exp(np.convolve(np.pad(np.log(Ef), 3, mode='edge'), np.ones(7) / 7, 'valid'))
    return dict(frames=[enc(x, e) for x, e in zip(frames, Ef)], E=float(E0), Ef=Ef.tolist(), ppm=ppm, size=2 * half, D=D, n=n, F=F, cols=cols, rows=rows, samples=samples, kd=g['kd'])


def ramp_from_physics(Pp, E_ref=None):
    """渐变图 4 个色标（位置 0 / 0.3 / 0.65 / 1，项目材质的约定）：编码值越高 = 火星越热 = 越白。
    按黑体颜色取：v=1 → 2500 K（黄白），0.65 → 2150 K（金），0.3 → 1750 K（橙），0 → 1350 K（暗红）"""
    Ts = [1350, 1750, 2150, 2500]; out = []
    for Tk in Ts:
        c = T.bb_rgb(Tk); c = c / c.max(); out.append([round(float(x), 4) for x in c])
    return out


def lin2srgb8(c): c = np.clip(c, 0, 1); return np.round(np.where(c <= 0.0031308, 12.92 * c, 1.055 * c ** (1 / 2.4) - 0.055) * 255).astype(np.uint8)


def ramp_png(stops):
    x = np.linspace(0, 1, 256); pos = [0, 0.3, 0.65, 1]
    row = np.stack([np.interp(x, pos, [s[i] for s in stops]) for i in range(3)], -1)
    return Image.fromarray(np.repeat(lin2srgb8(row)[None], 16, 0), 'RGB')


def _png_b64(im):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); return 'data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()


# ---------------------------------------------------------------------------------------------
def curves(P, n=24):
    """按发射器时间的曲线：弹道位置、速度（Cascade 的 X / Z；Y = 0）"""
    ts = np.linspace(0, P['T'], n); p, v = T.shell(P, ts)
    return ts, p, v


def main(job='TP1', size='M', log=print):
    global NAME
    P = T.PRESETS[size]; ref = T.REFS[size]; NAME = 'RiseTrail' + size; szn = T.SIZES[size]
    out = os.path.join(T.ROOT, 'analysis', 'results', job); os.makedirs(out, exist_ok=True)
    log('烘焙星头白热段…'); H = bake_head(P, log=log)
    log('烘焙金火星簇…'); U = bake_puff(P, log=log)
    ramp = ramp_from_physics(P)
    files = {}
    LH, LU = (H['cols'], H['rows']), (U['cols'], U['rows'])
    atlH = pack(H['frames'], *LH); atlU = pack(U['frames'], *LU)
    fH, fU, fR = tn('Head', LH) + '.png', tn('Puff', LU) + '.png', tn('Ramp') + '.png'
    Image.fromarray(atlH, 'RGBA').save(os.path.join(out, fH)); Image.fromarray(atlU, 'RGBA').save(os.path.join(out, fU))
    ramp_png(ramp).save(os.path.join(out, fR))
    # ---- 引擎参数 ----
    g = P['pops'][1]; e = P['pops'][2]
    ts, pos, vel = curves(P)
    sp = np.linalg.norm(vel, axis=1); u = vel / sp[:, None]
    jet = g['jet']; pv = vel - jet * u                                   # 火星簇初速 = 弹体速度 − 喷出速度（沿弹道向后）
    wind = np.array([P['wind'] + float(T.turb(P, z, 0)) for z in pos[:, 2]])
    kd = g['kd']; acc = np.stack([kd * wind, np.zeros_like(wind), np.full_like(wind, -T.G)], -1)
    puff_rate = g['rate'] / U['n']                                       # 每秒几簇
    head_len = np.array([H['Lv'](max(5.0, s)) for s in sp]) / H['Lv'](H['v_ref'])
    # 亮度换算：贴图值 ≈ E_tex × 辐亮度 / ppm_tex²；两层按同一口径（相对实拍的曝光）换成 Color Over Life 的倍数
    ppmB = ref['ppm']; k_tone = 1.0
    colH = P['E'] * (H['ppm'] / ppmB) ** 2 / H['E'] / k_tone; colU = P['E'] * (U['ppm'] / ppmB) ** 2 / U['E'] / k_tone
    lifeU = [round(U['D'] * 0.85, 3), round(U['D'] * 1.1, 3)]
    # 金火星簇的 Color Over Life：逐帧曝光的补偿（帧 f 在相对寿命 (f+0.5)/F 处）
    colU_keys = [[0, [round(colU, 4)] * 3]] + [[round((f + 0.5) / U['F'], 4), [round(colU * U['E'] / U['Ef'][f], 5)] * 3] for f in range(0, U['F'], 4)] + [[1, [round(colU * U['E'] / U['Ef'][-1], 5)] * 3]]
    man_emit = [
        dict(name='星头白热段', index='01', life=[P['T'], P['T']], bursts=[[0, 1]], sphere={'r': 0, 'vel': 0}, drag=0, accel=[0, 0, 0], size=[1, 1], rot=False, seed=1,
             align='velocity', velLife=[[round(t / P['T'], 4), [round(float(v[0]), 3), 0, round(float(v[2]), 3)]] for t, v in zip(ts, vel)],
             tex={'主体': dict(file=fH, mode='gray', ramp=fR, cols=LH[0], rows=LH[1], chans=4, frames=H['F'], keys=saw_keys(P['T'], H['fps'], H['F']),
                               col=[[0, [round(colH, 4)] * 3], [1, [round(colH, 4)] * 3]], tone='baker', gamma=1, wh=[round(H['wh'][0], 3), round(H['wh'][1], 3)],
                               whKeys=[[round(t / P['T'], 4), [1, round(float(s), 3)]] for t, s in zip(ts, head_len)], pivot=H['pivot'])}),
        dict(name='金火星簇', index='02', life=lifeU, spawn=dict(rate=round(puff_rate, 2), t0=0, t1=P['T']), seed=2,
             locCurve=[[round(float(t), 4), [round(float(p[0]), 3), 0, round(float(p[2]), 3)]] for t, p in zip(ts, pos)],
             velCurve=[[round(float(t), 4), [round(float(v[0]), 3), 0, round(float(v[2]), 3)]] for t, v in zip(ts, pv)], velJit=0.25,
             dragRange=[round(kd * 0.7, 2), round(kd * 1.4, 2)], accCurve=[[round(float(t), 4), [round(float(a[0]), 3), 0, round(float(a[2]), 3)]] for t, a in zip(ts, acc)],
             size=[round(U['size'] * 0.85, 3), round(U['size'] * 1.15, 3)], rot=True,
             tex={'主体': dict(file=fU, mode='gray', ramp=fR, cols=LU[0], rows=LU[1], chans=4, frames=U['F'], keys=[[0, 0], [1, U['F'] - 0.001]],
                               col=colU_keys, tone='baker', gamma=1)}),
    ]
    zmax = float(pos[:, 2].max()); xs = pos[:, 0]
    view = round(zmax * 1.12, 1); center = [round(float(xs.mean()), 2), round(zmax * 0.5, 1)]
    man = dict(title=f"升空尾缀 · {szn['name']}（物理 v1，对照 {szn['ref']}）", duration=round(P['T'] + U['D'] + 0.3, 2), view=view, center=center, variants={'A': '物理模型 v1'},
               emitters=man_emit, note='星头白热段（速度朝向、长度随速度）+ 金火星簇（世界坐标，按出生时刻落在弹道上，随风漂、在空中不动）。')
    # preview.js：每个通道一张灰度图（缩小到 1024）
    images = {}
    for fn, atl in ((fH, atlH), (fU, atlU)):
        for ci, c in enumerate('RGBA'):
            im = Image.fromarray(atl[..., ci], 'L').resize((1024, 1024), Image.BOX); images[fn + '#' + c] = _png_b64(im)
    images[fR] = _png_b64(ramp_png(ramp).resize((256, 1)))
    # 实拍取景：和模拟同一个世界坐标框（出膛点像素、0.4545 m/像素），烘焙器里并排时两边比例一致、时间对齐出膛
    Wv, Hv = 2560, 1440; mpp = 1 / ref['ppm']
    json.dump(dict(t0=ref['t0'], cx=round((ref['launch'][0] + center[0] / mpp) / Wv, 4), cy=round((ref['launch'][1] - center[1] / mpp) / Hv, 4),
                   half=round(view / 2 / mpp / Hv, 4), aspect=round(Wv / Hv, 4)), open(os.path.join(out, 'vmeta.json'), 'w'))
    open(os.path.join(out, 'preview.js'), 'w', encoding='utf-8').write('FW_ASSET_LOADED(' + json.dumps(job) + ', ' + json.dumps({'manifest': man, 'images': images}, ensure_ascii=False, default=float) + ');\n')
    meta = dict(name=NAME, tool='trail_phys_bake.py（物理模型第二代）', params=P,
                head=dict(file=fH, cols=LH[0], rows=LH[1], channels=4, frames=H['F'], fps=H['fps'], loopSeconds=round(H['Tp'], 4), refSpeed=H['v_ref'], lengthAtRef_m=round(H['L'], 2),
                          spriteSizeCm=[round(H['wh'][0] * 100, 1), round(H['wh'][1] * 100, 1)], pivotUV=[0.5, round(H['pivot'][1], 4)], encodeE=H['E'], colorScale=colH,
                          frameCurve=saw_keys(P['T'], H['fps'], H['F']), sizeByLifeY=[[round(t / P['T'], 4), round(float(s), 3)] for t, s in zip(ts, head_len)],
                          velocityOverLife=[[round(t / P['T'], 4), [round(float(v[0]) * 100, 1), 0, round(float(v[2]) * 100, 1)]] for t, v in zip(ts, vel)]),
                puff=dict(file=fU, cols=LU[0], rows=LU[1], channels=4, frames=U['F'], seconds=round(U['D'], 3), sparksPerPuff=U['n'], spawnRate=round(puff_rate, 2),
                          spriteSizeCm=round(U['size'] * 100, 1), life=lifeU, encodeE=U['E'], colorScale=colU, colorOverLife=colU_keys, drag=[round(kd * 0.7, 2), round(kd * 1.4, 2)],
                          initialLocationCm=[[round(float(t), 4), [round(float(p[0]) * 100, 1), 0, round(float(p[2]) * 100, 1)]] for t, p in zip(ts, pos)],
                          initialVelocityCm=[[round(float(t), 4), [round(float(v[0]) * 100, 1), 0, round(float(v[2]) * 100, 1)]] for t, v in zip(ts, pv)],
                          accelerationCm=[[round(float(t), 4), [round(float(a[0]) * 100, 1), 0, round(float(a[2]) * 100, 1)]] for t, a in zip(ts, acc)]),
                ramp=dict(file=fR, stops=[[p, s] for p, s in zip([0, 0.3, 0.65, 1], ramp)]))
    json.dump(meta, open(os.path.join(out, f'{NAME}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=float)
    open(os.path.join(out, f'{NAME}_Cascade参数.txt'), 'w', encoding='utf-8').write(cascade_txt(P, meta))
    # 对照图 + 数值（远景 尾缀B、近景 尾缀3.0_A）
    rows = T.run_compare(P, os.path.join(out, '尾缀物理'))
    preview_jpg(P, os.path.join(out, '预览.jpg'), ref)
    json.dump(dict(差距=None, 远景=rows), open(os.path.join(out, '数值.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(dict(job=job, ok=True), open(os.path.join(out, 'done.json'), 'w'))
    log(f'完成 → {out}（preview.js {os.path.getsize(os.path.join(out, "preview.js")) / 1e6:.1f} MB）')
    return out


def preview_jpg(P, path, ref, t=None):
    """缩略图：左 实拍，右 物理模型（同一取景）"""
    t = t or ref['times'][len(ref['times']) // 2]; bg8, real = T.load_ref(ref, (t,)); cam = T.side_cam(ref)
    sim = T.composite(bg8, T.render(P, T.emit(P), t - ref['t0'], cam), P['E'])
    x0, y0, x1, y1 = ref['crop']; H = y1 - y0; W = x1 - x0; s = min(W, H)
    cx = int(cam.ox - 20); cy = int(cam.oy - 0.55 * H)
    a = max(0, min(W - s, cx - s // 2)); b = max(0, min(H - s, cy - s // 2))
    img = np.hstack([real[t].astype(np.uint8)[b:b + s, a:a + s], sim[b:b + s, a:a + s]])
    cv2.imwrite(path, img, [cv2.IMWRITE_JPEG_QUALITY, 90])


def cascade_txt(P, m):
    h, p = m['head'], m['puff']
    fmt = lambda keys: '\n'.join(f'      {k[0]:>7}  →  {k[1]}' for k in keys)
    return f"""升空尾缀 · 物理模型 v1（{NAME}）Cascade 参数表
======================================================
原理：analysis/升空尾缀_物理.md。一句话：礼花弹飞行中一直在烧的曲导（昇り竜）向后喷出火焰和大量木炭火星；
火星一离开弹体就被空气拦住，停在原地慢慢燃尽、随风漂——所以尾迹是「弹体走过的路」上一串停在空中的火星，
不是跟着弹体走的一条线。弹体越飞越慢，尾迹就越来越短、越来越密。

粒子系统：P_{NAME}（放在发射炮口，局部空间关闭 = 世界坐标）。时间 0 = 出膛，{P['T']:.2f} s 开花（和开花特效接上）。
所有「随时间的曲线」都是按发射器时间（EmitterTime）取值的 Constant Curve（Cascade 的 Initial 类模块在出生时按发射器时间取曲线）。
长度单位：厘米。

------------------------------------------------------
发射器 01：星头白热段（{h['file']}）
------------------------------------------------------
  Required
    Material            现有灰度 RGBA 接力材质（帧号 = Dynamic Parameter 第 3 通道，不混合）
    Screen Alignment    PSA_Velocity（面片长边沿速度）
    Emitter Duration    {P['T']:.2f}，Loops 1
    Pivot Offset        星头在贴图里距底边 {(1 - h['pivotUV'][1]) * 100:.1f}% 处。默认 (−0.5, −0.5) 是面片中心；把 Y 改为 {-h['pivotUV'][1]:.4f}
                        （反了就用 {-(1 - h['pivotUV'][1]):.4f}），X 保持 −0.5
  Spawn                 Burst：时间 0，1 个；Rate 0
  Lifetime              {P['T']:.2f}
  Initial Size          ({h['spriteSizeCm'][0]}, {h['spriteSizeCm'][1]}, 1)  cm（参考速度 {h['refSpeed']} m/s 时的长度 {h['lengthAtRef_m']} m）
  Size By Life（Y 按速度缩放，X 固定 1；出膛长、到顶短）
{fmt(h['sizeByLifeY'])}
  Velocity/Life（Absolute ✓，cm/s，弹道速度：二次空气阻力减速）
{fmt(h['velocityOverLife'])}
  Dynamic Parameter 第 3 通道 = 帧号（循环 {h['frames']} 帧 / {h['loopSeconds']} s，{h['fps']} fps，锯齿曲线）
{fmt(h['frameCurve'])}
  Color Over Life       ({h['colorScale']:.3f}, {h['colorScale']:.3f}, {h['colorScale']:.3f}) 全程不变（颜色由渐变图给）

------------------------------------------------------
发射器 02：金火星簇（{p['file']}）
------------------------------------------------------
  一簇 = 同一瞬间喷出的 {p['sparksPerPuff']} 颗木炭火星（贴图里已按粒径分布散开、闪烁、大颗后灭）。
  Required
    Screen Alignment    PSA_Square；Emitter Duration {P['T']:.2f}，Loops 1
  Spawn                 Rate {p['spawnRate']} /s（Rate Scale 1），只在 0–{P['T']:.2f} s 内
  Lifetime              Uniform {p['life'][0]} – {p['life'][1]} s
  Initial Size          Uniform {round(p['spriteSizeCm'] * 0.85, 1)} – {round(p['spriteSizeCm'] * 1.15, 1)} cm
  Initial Rotation      Uniform 0 – 1（整圈随机）
  Initial Location（按发射器时间 = 弹体此刻所在位置，cm）
{fmt(p['initialLocationCm'])}
  Initial Velocity（按发射器时间 = 弹体速度 − 喷出速度 {P['pops'][1]['jet']} m/s，Uniform：Min = 0.75 ×，Max = 1.25 ×，cm/s）
{fmt(p['initialVelocityCm'])}
  Drag                  Uniform {p['drag'][0]} – {p['drag'][1]}（火星一出来就被空气拦住）
  Acceleration（按发射器时间：X = 阻力 × 该高度的横风，Z = 重力；cm/s²）
{fmt(p['accelerationCm'])}
  Dynamic Parameter 第 3 通道 = 帧号：相对寿命 0 → 0，1 → {p['frames'] - 1}（{p['frames']} 帧 / {p['seconds']} s）
  Color Over Life（三个通道相同；贴图逐帧曝光，这条曲线把亮度乘回去，所以后半段越来越大）
{fmt(p['colorOverLife'])}

------------------------------------------------------
渐变图（{m['ramp']['file']}，位置 0 / 0.3 / 0.65 / 1，线性 RGB）
  {m['ramp']['stops']}
  编码值越高 = 火星越热越白；暗的一头是快燃尽的橙红火星。

注意
- 两张贴图都是 2048×2048、RGBA 接力（R 填满再 G、B、A）、线性灰度，BC7。
- GPU 粒子模式如果 Initial Location / Initial Velocity 的曲线不按发射器时间取值，改成 CPU 粒子（每秒约 {p['spawnRate']:.0f} 个，同屏约 {p['spawnRate'] * p['seconds']:.0f} 个）。
"""


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'TP1', sys.argv[2] if len(sys.argv) > 2 else 'M')
