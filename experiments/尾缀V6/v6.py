"""升空尾缀 V6（对话框7，4.0 期间的实验；不进 tool/src）。

分层（同一条弹道）：
  Head   星头 + 白热段：1 个粒子，Velocity 对齐，无缝循环序列（只含燃气焰 + 火粉柱），面片中心 = 星头（不依赖 pivot_offset）。
         运动用 Cascade 原生：Initial Velocity + Drag（线性）+ Const Acceleration（重力），参数按用户标定拟合（弹道.py），开花时仍在上升。
  Sparks 金火星：GPU 粒子（手机 CPU），世界坐标。出生位置 = 星头轨迹（Initial Location 按发射器时间的曲线），
         初速 = 弹体速度 − 向后喷出 + 随机散开；各自寿命 / 阻力；风 = 阻力 × 风速（Const Acceleration）；
         颜色随寿命：出喷口白热 → 金 → 快烧完变橙变暗，带闪烁（Color Over Life 关键帧）。停在空中、各自错落熄灭——不需要消散序列。
  Embers 落火：少量大颗、长寿命、阻力小、下坠快、闪得更明显（参考里那些亮暗不一的大亮点）。
所有数值单位按 Cascade（cm、cm/s、s）。物理参数来自 analysis/scripts/trail_phys.py 各档配方（对实拍校过）。
"""
import os, sys, json, math, numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'analysis', 'scripts'))
import trail_phys as TP
G = 9.81
TRAJ = json.load(open(os.path.join(HERE, '弹道.json')))
NAMES = {'S': 'RiseTrailV6_S', 'M': 'RiseTrailV6_M', 'L': 'RiseTrailV6_L'}

# 每档的可调量（视觉 / 引擎预算），物理量取配方
OPTS = {
    'S': dict(rate=900, rate_m=160, ember_k=2.0, size=(60, 200), ember_size=(200, 340), head_w=3.2, I=2.5, ember_I=6.0),
    'M': dict(rate=1300, rate_m=220, ember_k=2.0, size=(70, 260), ember_size=(240, 400), head_w=4.5, I=2.5, ember_I=6.0),
    'L': dict(rate=1800, rate_m=300, ember_k=2.0, size=(90, 320), ember_size=(300, 480), head_w=6.5, I=2.5, ember_I=6.0),
}
FPS = 30


def traj(key):
    t = TRAJ[key]; return t['v0'], t['D'], t['T']


TRAJ_OVERRIDE = {}   # 对照用：{'M': 'B_ref'} → 中档发射器套用尾缀B 实拍弹道


def head_path(v0, D, T, fps=60):
    """Cascade 的单粒子怎么走：每 tick v += a·dt；v *= (1 − D·dt)；x += v·dt（UE4 CPU 粒子的更新顺序）。
    返回按时间的 (t, z, vz)（米），用来给金火星的出生位置 / 初速曲线取样——和星头粒子一致。"""
    dt = 1 / fps; v = v0; z = 0.0; ts, zs, vs = [0.0], [0.0], [v0]
    for i in range(int(math.ceil(T * fps)) + 2):
        v += -G * dt; v *= (1 - D * dt); z += v * dt
        ts.append((i + 1) * dt); zs.append(z); vs.append(v)
    return np.array(ts), np.array(zs), np.array(vs)


def recipe(key):
    P = TP.preset(key); pops = {q['name']: q for q in P['pops']}; return P, pops


def bb(T):
    c = TP.bb_rgb(T) / TP.bb_lum(T); return c / c.max()


def engine_tone(lin, gain=1.0):
    """烘焙器的引擎显示约定（素材页 tone 'baker'、导出效果）：1 − e^(−4·x)，gamma 2.2 → 0..1"""
    return np.clip(1 - np.exp(-4 * gain * lin), 0, 1) ** (1 / 2.2)


def color_curve(T0, Tb, tc_rel, Tend, pt, pm, tw, I, n=24, seed=0, boost=0.0, boost_u=0.08, peak=8.0):
    """Color Over Life（相对寿命 0–1）关键帧：颜色 = 黑体色（出喷口 T0 → tc 内降到 Tb → 快烧完降到 Tend），
    亮度 = 相对 Tb 的亮度比（开方压缩、不超过 peak 倍）× 燃尽 (1−u)^pm × 闪烁 × 白热增亮；整条曲线按寿命 30% 处的亮度 = I 归一。
    这样不同温度 / 不同层的亮度在同一个量级（引擎里 HDR 倍数 1–十几），不会出现几百的自发光。返回 [[u, [r,g,b]], ...]"""
    r = np.random.default_rng(seed); keys = []
    us = np.unique(np.concatenate([np.linspace(0, 1, n), [0.02, 0.05, 0.3]]))
    vals = []
    for u in us:
        T = Tb + (T0 - Tb) * math.exp(-u / max(tc_rel, 1e-3)) - (Tb - Tend) * u ** pt
        lum = min(peak, math.sqrt(TP.bb_lum(T) / TP.bb_lum(Tb)))
        b = float(lum) * max(0.0, 1 - u) ** pm * (1 + tw * (r.uniform(-1, 1) if 0.03 < u < 0.97 else 0)) * min(1.0, u / 0.02 if u > 0 else 0) * (1 + boost * math.exp(-u / boost_u))
        vals.append((u, T, b))
    ref = [b for u, T, b in vals if abs(u - 0.3) < 1e-9][0] or 1.0
    for u, T, b in vals:
        c = bb(T) * (I * b / ref)
        keys.append([round(float(u), 4), [round(float(x), 4) for x in c]])
    keys[-1][1] = [0.0, 0.0, 0.0]
    return keys


def build(key, plat='pc', head_tex=None):
    """生成 fwl.cascade/1（dict）。head_tex：星头序列贴图信息（bake_head 的返回）。"""
    v0, D, T = traj(TRAJ_OVERRIDE.get(key, key)); P, pops = recipe(key); o = OPTS[key]; gq, eq = pops['金火星'], pops['落火']
    ts, zs, vs = head_path(v0, D, T)
    gpu = plat == 'pc'; rate_pc = o['rate'] * o.get('rate_k', 1.0); rate = rate_pc if gpu else o['rate_m']; sz_mul = 1.0 if gpu else 1.45
    I_mul = 1.0 if gpu else min(3.0, max(1.0, rate_pc / o['rate_m'] / sz_mul ** 2))   # 手机：数量少、点大 → 总光量和 PC 一致（亮度 ∝ 数量 × 颜色 × 面积）
    # 曲线关键帧（按发射器时间秒）：每 0.1 s 一个
    kt = np.arange(0, T + 1e-6, 0.1); kt = np.append(kt, T) if kt[-1] < T - 1e-6 else kt
    zc = np.interp(kt, ts, zs); vc = np.interp(kt, ts, vs)
    wob = P.get('wob', 0.3)
    xw = TP.wobble(P, zc, 0)                                          # 弹体摆动（大波浪，冻在空中）
    if o.get('lean'): la, lb = P['lean']; xw = xw + la * zc + lb * zc * zc    # 弹道倾斜（只在对照实拍时打开；游戏里竖直）
    jet = gq['jet'] * o.get('jet_k', 1.0)
    life_med, lsig = gq['life'] * o.get('life_k', 1.0), gq['lsig']; life = [max(0.4, life_med * math.exp(-1.1 * lsig)), min(4.5, life_med * math.exp(1.1 * lsig))]   # 寿命范围限在 0.4–4.5 s
    kd = gq['kd'] * o.get('kd_k', 1.0); drag = [kd * math.exp(-0.5 * lsig), kd * math.exp(0.5 * lsig)]   # 30 fps 下 D·dt 要小（Cascade 每 tick 乘 1−D·dt，太大会按 tick 结团）
    wind = P['wind']; spin_amp = P.get('spin', {}).get('amp', 2.7); cone = gq['cone']
    tc_rel = o.get('tc', gq.get('tc', 0.4)) / life_med
    loc_curve = [[round(float(t), 3), [round(float(x * 100), 1), 0.0, round(float(z * 100), 1)]] for t, z, x in zip(kt, zc, xw)]
    vel_curve = [[round(float(t), 3), [0.0, 0.0, round(float((v - jet) * 100), 1)]] for t, v in zip(kt, vc)]
    lat = (cone + spin_amp) * o.get('lat_k', 1.0)
    rate_curve = [[0.0, rate], [round(T, 3), rate], [round(T + 0.001, 3), 0], [round(T + 20, 3), 0]]
    if o.get('pulse', 0) > 0:                                          # 喷射脉动：药柱颗粒 / 自转使火星一团一团喷出 → 尾迹上亮团 + 空隙（Spawn Rate 曲线，均值不变）
        rp = np.random.default_rng(31); hz = o.get('pulse_hz', 7.0); tk = [0.0]
        while tk[-1] < T: tk.append(tk[-1] + rp.uniform(0.6, 1.4) / (2 * hz))
        tk = np.array(tk[:-1] + [T]); s = o['pulse']; mul = np.exp(s * rp.standard_normal(len(tk)) - s * s / 2); mul /= mul.mean()
        rate_curve = [[round(float(t), 3), round(float(rate * m), 1)] for t, m in zip(tk, mul)] + [[round(T + 0.001, 3), 0], [round(T + 20, 3), 0]]
    dur = round(T + life[1] + 0.3, 3)
    sparks = {
        'name': 'Sparks', 'material': 'dot', 'gpu': gpu,
        'required': {'screen_alignment': 'Square', 'duration_s': dur, 'loops': 1, 'delay_s': 0},
        'spawn': {'rate': {'curve': rate_curve}},
        'modules': [
            {'m': 'Lifetime', 'Lifetime': {'uniform': [round(life[0], 3), round(life[1], 3)]}},
            {'m': 'InitialLocation', 'StartLocation': {'curve': loc_curve}},
            {'m': 'SphereLocation', 'StartRadius': {'const': 40.0}, 'SurfaceOnly': False, 'Velocity': False},
            {'m': 'InitialVelocity', 'StartVelocity': {'curve': vel_curve}},
            {'m': 'InitialVelocity', 'StartVelocity': {'uniform': [[-lat * 100, -lat * 100, -0.25 * jet * 100], [lat * 100, lat * 100, 0.25 * jet * 100]]}},
            {'m': 'Drag', 'DragCoefficientRaw': {'uniform': [round(drag[0], 3), round(drag[1], 3)]}},
            {'m': 'ConstAcceleration', 'Acceleration': [round(kd * wind * 100, 1), 0.0, -981.0]},
            {'m': 'InitialSize', 'StartSize': {'uniform': [[o['size'][0] * sz_mul, o['size'][0] * sz_mul, 1], [o['size'][1] * sz_mul, o['size'][1] * sz_mul, 1]]}},
            {'m': 'SizeByLife', 'LifeMultiplier': {'curve': [[0, [1, 1, 1]], [0.7, [0.92, 0.92, 1]], [1, [0.55, 0.55, 1]]]}, 'MultiplyX': True, 'MultiplyY': True, 'MultiplyZ': False},
            {'m': 'ColorOverLife', 'ColorOverLife': {'curve': color_curve(o.get('T0', gq['T0']), gq.get('Tb', 2300), tc_rel, gq['Tend'], gq['pt'], o.get('pm', gq.get('pm', 0.45)), o.get('tw', gq['tw']), o['I'] * I_mul, n=48, seed=11, boost=o.get('boost', 0.0), boost_u=o.get('boost_u', 0.08))}, 'AlphaOverLife': {'const': 1}},
        ]}
    # 落火：大颗、长寿、阻力小（3.5/s）→ 下坠快；闪得明显
    elife = [eq['life'] * 0.75, eq['life'] * 1.6]; edrag = [eq['kd'] * 0.7, eq['kd'] * 1.3]
    evel = [[round(float(t), 3), [0.0, 0.0, round(float((v - eq['jet']) * 100), 1)]] for t, v in zip(kt, vc)]
    erate = eq['rate'] * o.get('ember_k', 1.0) * (1.0 if gpu else 0.6)
    embers = {
        'name': 'Embers', 'material': 'dot', 'gpu': gpu,
        'required': {'screen_alignment': 'Square', 'duration_s': round(T + elife[1] + 0.3, 3), 'loops': 1, 'delay_s': 0},
        'spawn': {'rate': {'curve': [[0.0, 0], [0.4, erate], [round(T, 3), erate], [round(T + 0.001, 3), 0], [round(T + 20, 3), 0]]}},
        'modules': [
            {'m': 'Lifetime', 'Lifetime': {'uniform': [round(elife[0], 3), round(elife[1], 3)]}},
            {'m': 'InitialLocation', 'StartLocation': {'curve': loc_curve}},
            {'m': 'SphereLocation', 'StartRadius': {'const': 60.0}, 'SurfaceOnly': False, 'Velocity': False},
            {'m': 'InitialVelocity', 'StartVelocity': {'curve': evel}},
            {'m': 'InitialVelocity', 'StartVelocity': {'uniform': [[-(eq['cone'] + spin_amp) * 100, -(eq['cone'] + spin_amp) * 100, -0.3 * eq['jet'] * 100], [(eq['cone'] + spin_amp) * 100, (eq['cone'] + spin_amp) * 100, 0.3 * eq['jet'] * 100]]}},
            {'m': 'Drag', 'DragCoefficientRaw': {'uniform': [round(edrag[0], 3), round(edrag[1], 3)]}},
            {'m': 'ConstAcceleration', 'Acceleration': [round(eq['kd'] * wind * 100, 1), 0.0, -981.0]},
            {'m': 'InitialSize', 'StartSize': {'uniform': [[o['ember_size'][0] * sz_mul, o['ember_size'][0] * sz_mul, 1], [o['ember_size'][1] * sz_mul, o['ember_size'][1] * sz_mul, 1]]}},
            {'m': 'SizeByLife', 'LifeMultiplier': {'curve': [[0, [1, 1, 1]], [0.8, [0.85, 0.85, 1]], [1, [0.5, 0.5, 1]]]}, 'MultiplyX': True, 'MultiplyY': True, 'MultiplyZ': False},
            {'m': 'ColorOverLife', 'ColorOverLife': {'curve': color_curve(eq['T0'], eq['T0'] - 150, 0.2, eq['Tend'], eq['pt'], 0.6, 0.55, o['ember_I'] * I_mul, n=30, seed=23)}, 'AlphaOverLife': {'const': 1}},
        ]}
    out = {'format': 'fwl.cascade/1', 'name': NAMES[key], 'platform': plat,
           'source': {'tool': 'experiments/尾缀V6（对话框7）', 'export': f'{NAMES[key]}@{plat}', 'trajectory': TRAJ[key]},
           'materials': {'dot': {'role': 'soft_dot'}},
           'system': {'preview_distance_cm': 80000, 'preview_warmup_s': 0.0},
           'emitters': [sparks, embers]}
    if head_tex:
        ht = head_tex[plat]
        # 星头面片：长度随速度缩放（火粉柱长 ≈ 速度 × 火粉寿命），面片中心 = 星头
        vref = head_tex['v_ref']; Lref = head_tex['len_m']
        sb = [[round(float(t / T), 4), [1.0, round(float(max(0.25, v / vref)), 4), 1.0]] for t, v in zip(kt[::3], vc[::3])]
        if sb[-1][0] < 1: sb.append([1.0, [1.0, round(float(max(0.25, vc[-1] / vref)), 4), 1.0]])
        nloop = T * FPS / ht['frames']
        fcur = []; k = 0
        while k * ht['frames'] / FPS < T:                                # 循环：每圈 0 → frames−0.01
            a = k * ht['frames'] / FPS / T; b = min(1.0, (k + 1) * ht['frames'] / FPS / T)
            fcur.append([round(a, 5), 0.0]); fcur.append([round(b - 1e-4, 5), round((b - a) * T * FPS - 0.01, 2)]); k += 1
        out['textures'] = {'head': {'file': ht['file'], 'class': 'flipbook', 'cols': ht['cols'], 'rows': ht['rows'], 'channels': 4, 'frames': ht['frames']},
                           'head_ramp': {'file': head_tex['ramp'], 'class': 'ramp'},
                           'head_cut': {'file': ht['cutout'], 'class': 'cutout'}}
        out['materials']['head'] = {'role': 'flipbook_rgba', 'textures': {'main': 'head', 'ramp': 'head_ramp'}, 'scalars': {'rows': ht['rows'], 'cols': ht['cols']}}
        out['emitters'].insert(0, {
            'name': 'Head', 'material': 'head', 'gpu': False,
            'required': {'screen_alignment': 'Velocity', 'duration_s': round(T, 3), 'loops': 1, 'delay_s': 0, 'cutout': 'head_cut', 'max_draw_count': 1},
            'spawn': {'rate': {'const': 0}, 'bursts': [[0, 1]]},
            'modules': [
                {'m': 'Lifetime', 'Lifetime': {'const': round(T, 3)}},
                {'m': 'InitialSize', 'StartSize': {'const': [round(o['head_w'] * 100, 1), round(2 * Lref * 100, 1), 1]}},
                {'m': 'InitialVelocity', 'StartVelocity': {'const': [0, 0, round(v0 * 100, 1)]}},
                {'m': 'Drag', 'DragCoefficientRaw': {'const': round(D, 5)}},
                {'m': 'ConstAcceleration', 'Acceleration': [0.0, 0.0, -981.0]},
                {'m': 'SizeByLife', 'LifeMultiplier': {'curve': sb}, 'MultiplyX': False, 'MultiplyY': True, 'MultiplyZ': False},
                {'m': 'DynamicParameter', 'params': {'frame': {'curve': fcur}}},
                {'m': 'ColorOverLife', 'ColorOverLife': {'curve': [[0, [head_tex['col']] * 3], [1, [head_tex['col']] * 3]]}, 'AlphaOverLife': {'const': 1}},
            ]})
    return out


# ───────────────────────── 引擎等价模拟（按 cascade.json 逐 tick 算，和 Cascade CPU 粒子同一更新顺序） ─────────────────────────
def _curve(c, t):
    if 'const' in c: return np.array(c['const'], float)
    if 'curve' in c:
        ks = c['curve']; xs = [k[0] for k in ks]; ys = np.array([k[1] for k in ks], float)
        if ys.ndim == 1: return np.interp(t, xs, ys)
        return np.stack([np.interp(t, xs, ys[:, i]) for i in range(ys.shape[1])], -1)
    raise ValueError(c)


def _sample(c, n, rng, t=None):
    """出生时取值：const / uniform（逐分量独立，Cascade 默认）/ curve（按发射器时间 t）"""
    if 'uniform' in c:
        lo, hi = np.array(c['uniform'][0], float), np.array(c['uniform'][1], float)
        return lo + (hi - lo) * rng.random((n,) + lo.shape)
    v = _curve(c, t if t is not None else 0.0)
    return np.broadcast_to(v, (n,) + np.shape(v)).copy() if np.ndim(v) else np.full(n, float(v))


def simulate(cj, t_end, fps=30, seed=1, emitters=('Sparks', 'Embers')):
    """返回 {发射器名: 每帧粒子状态列表}，每帧 dict(p (N,3) cm, size (N,) cm, col (N,3), age, life)。"""
    rng = np.random.default_rng(seed); out = {}
    for e in cj['emitters']:
        if e['name'] not in emitters: continue
        M = {}
        for m in e['modules']: M.setdefault(m['m'], []).append(m)
        dt = 1 / fps; acc = 0.0; P = dict(p=np.zeros((0, 3)), v=np.zeros((0, 3)), age=np.zeros(0), life=np.zeros(0), size=np.zeros(0), drag=np.zeros(0))
        frames = []; t = 0.0
        a_const = np.array(M['ConstAcceleration'][0]['Acceleration'], float) if 'ConstAcceleration' in M else np.zeros(3)
        while t < t_end - 1e-9:
            # 更新（Cascade CPU：加速度 → 阻力 → 位置）
            P['v'] += a_const * dt; P['v'] *= (1 - P['drag'] * dt)[:, None]; P['p'] += P['v'] * dt; P['age'] += dt
            alive = P['age'] < P['life']; P = {k: v[alive] for k, v in P.items()}
            # 出生（UE4：先 Update 已有粒子，再 Spawn；本 tick 出生的粒子按 SpawnTime 往前推 v·Δt，分布在这一 tick 的路径上）
            r = float(_curve(e['spawn']['rate'], t)); acc += r * dt; n = int(acc); acc -= n
            if n > 0:
                frac = (np.arange(n) + rng.random(n)) / n              # 在本 tick 内的出生时刻
                tb = t + frac * dt
                loc = np.zeros((n, 3))
                for m in M.get('InitialLocation', []): loc += np.array([_curve(m['StartLocation'], x) for x in tb])
                for m in M.get('SphereLocation', []):
                    rad = float(_curve(m['StartRadius'], t)); d = rng.normal(0, 1, (n, 3)); d /= np.linalg.norm(d, axis=1, keepdims=True)
                    loc += d * (rad * (1.0 if m.get('SurfaceOnly') else rng.random((n, 1)) ** (1 / 3)))
                vel = np.zeros((n, 3))
                for m in M.get('InitialVelocity', []):
                    c = m['StartVelocity']; vel += np.array([_curve(c, x) for x in tb]) if 'curve' in c else _sample(c, n, rng)
                life = _sample(M['Lifetime'][0]['Lifetime'], n, rng).reshape(n)
                size = _sample(M['InitialSize'][0]['StartSize'], n, rng)[:, 0]
                drag = _sample(M['Drag'][0]['DragCoefficientRaw'], n, rng).reshape(n) if 'Drag' in M else np.zeros(n)
                age0 = (1 - frac) * dt                                    # 出生后到本 tick 结束已过的时间
                loc += vel * age0[:, None]
                P = {k: np.concatenate([P[k], v]) for k, v in dict(p=loc, v=vel, age=age0, life=life, size=size, drag=drag).items()}
            t += dt
            u = P['age'] / P['life']
            col = _curve(M['ColorOverLife'][0]['ColorOverLife'], u) if len(u) else np.zeros((0, 3))
            sbl = _curve(M['SizeByLife'][0]['LifeMultiplier'], u)[..., 0] if 'SizeByLife' in M and len(u) else np.ones(len(u))
            frames.append(dict(t=t, p=P['p'].copy(), size=P['size'] * sbl, col=np.atleast_2d(col) if len(u) else np.zeros((0, 3)), age=P['age'].copy(), life=P['life'].copy()))
        out[e['name']] = frames
    return out


def head_state(cj, t):
    """星头粒子在 t 的位置 / 速度 / 面片尺寸 / 帧号（同样按 Cascade 逐 tick 积分，30 fps）"""
    e = [x for x in cj['emitters'] if x['name'] == 'Head']
    if not e: return None
    e = e[0]; M = {m['m']: m for m in e['modules']}; T = e['required']['duration_s']
    if t < 0 or t >= T: return None
    v0 = np.array(M['InitialVelocity']['StartVelocity']['const'], float); D = M['Drag']['DragCoefficientRaw']['const']; a = np.array(M['ConstAcceleration']['Acceleration'], float)
    dt = 1 / 30; v = v0.copy(); p = np.zeros(3); s = 0.0
    while s < t - 1e-9: v += a * dt; v *= (1 - D * dt); p += v * dt; s += dt
    u = t / T; sz = np.array(M['InitialSize']['StartSize']['const'], float) * _curve(M['SizeByLife']['LifeMultiplier'], u)
    f = int(np.floor(float(_curve(M['DynamicParameter']['params']['frame'], u))))
    return dict(p=p, v=v, size=sz, frame=f, col=float(_curve(M['ColorOverLife']['ColorOverLife'], u)[0]))


def render_frame(sim, cj, t, W, H, mpp, origin, head_img=None, tone=None, dots=True, head_x=None):
    """侧面平视（x 向右、z 向上），mpp 米/像素，origin = 发射点像素。返回线性 RGB（不曝光），单位和引擎一致：像素值 = Σ 颜色 × 贴图值。
    火星：soft_dot 当作高斯点（σ = 面片尺寸 / 4，中心值 = Color Over Life）；比一个像素小时按总光量守恒摊开（σ 至少 0.5 像素）。
    星头：按帧号取贴图格子 × Ramp × 颜色，按面片尺寸贴在星头（Velocity 对齐，竖直）。
    显示按烘焙器的引擎约定：1 − e^(−4·x)，再 gamma 2.2（和素材页、导出效果同一个公式）。"""
    img = np.zeros((H, W, 3), np.float32)
    for name, frames in (sim.items() if dots else ()):
        fr = min(frames, key=lambda f: abs(f['t'] - t))
        if not len(fr['size']): continue
        px = origin[0] + fr['p'][:, 0] / 100 / mpp; py = origin[1] - fr['p'][:, 2] / 100 / mpp
        st = fr['size'] / 100 / mpp / 4; sig = np.maximum(st, 0.5)
        w = fr['col'] * (2 * np.pi * st * st)[:, None]           # 总光量 = 中心值 × 2πσ²（像素）
        for lo, hi in ((0, 0.75), (0.75, 1.4), (1.4, 2.8), (2.8, 6), (6, 50)):
            m = (sig >= lo) & (sig < hi)
            if not m.any(): continue
            lay = np.zeros_like(img); TP._splat(lay, px[m], py[m], w[m]); img += cv2.GaussianBlur(lay, (0, 0), max(0.5 * (lo + hi), 0.5))
    hs = head_state(cj, t)
    if hs is not None and head_img is not None:
        cell = head_img(hs['frame'])                             # (h, w, 3) 线性 RGB（已含 Ramp × v）
        hw = max(2, int(round(hs['size'][0] / 100 / mpp))); hh = max(4, int(round(hs['size'][1] / 100 / mpp)))
        c = cv2.resize(cell, (hw, hh), interpolation=cv2.INTER_AREA) * hs['col']
        hx = hs['p'][0] / 100 + (head_x(hs['p'][2] / 100) if head_x else 0.0)   # head_x：只在对照实拍时用（弹道倾斜）
        cx = origin[0] + hx / mpp; cy = origin[1] - hs['p'][2] / 100 / mpp
        x0 = int(round(cx - hw / 2)); y0 = int(round(cy - hh / 2))
        xa, ya = max(0, x0), max(0, y0); xb, yb = min(W, x0 + hw), min(H, y0 + hh)
        if xb > xa and yb > ya: img[ya:yb, xa:xb] += c[ya - y0:yb - y0, xa - x0:xb - x0]
    return img
