# 按 Cascade 模块值算发射器 / 粒子系统的保守包围盒（组件本地坐标，cm）。只读分析，不连 UE。
#
# 模型（每个发射器、每个寿命采样 T、每个时刻 t）：
#   位置 = 出生位置 p0 + F(t)·初速 w0 + G(t)·加速度 a  （线性阻力 k(相对寿命)，F/G 由阻力积出来）
#        或（Velocity/Life 设 Absolute）= p0 + ∫ 曲线速度 dt
#   面片：以粒子位置为心、半径 = 面片角点到粒子位置的最远距离（含 Pivot、Size By Life、Size By Speed、Camera Offset）
# 两类量分开：
#   A（跟组件一起缩放 / 旋转）：出生位置、局部速度、面片大小；
#   C（世界固定、不缩放）：Const Acceleration（bAlwaysInWorldSpace）等世界空间的加速度 / 速度——重力不跟 EffectScale 缩，
#     也不跟导演的倾斜（Roll / Pitch）转。本地盒 = A + R⁻¹·C / s，s、R 取导演表里这个资源用到的范围两端。
#   世界空间发射器的出生位置 / 速度，引擎里跟不跟组件缩放没核实（UE-14 尾缀量到是跟的），两种都算、取并集。
import math
from cascade_model import Dist, ref, short, iv_mul, iv_add, rot_matrix, world_to_local, AX

NSTEP = 160
INF = float('inf')

SUPPORTED = {
    'ParticleModuleLifetime', 'ParticleModuleSize', 'ParticleModuleSizeMultiplyLife', 'ParticleModuleSizeScaleBySpeed',
    'ParticleModuleLocation', 'ParticleModuleLocationPrimitiveSphere', 'ParticleModuleLocationEmitter',
    'ParticleModuleVelocity', 'ParticleModuleVelocityCone', 'ParticleModuleVelocityOverLifetime',
    'ParticleModuleAccelerationConstant', 'ParticleModuleAcceleration', 'ParticleModuleAccelerationDrag',
    'ParticleModulePivotOffset', 'ParticleModuleCameraOffset', 'ParticleModuleEventReceiverSpawn', 'ParticleModuleTrailSource',
    'ParticleModuleVectorFieldLocal', 'ParticleModuleWindDirectionalSource',
    # 不影响位置 / 大小的
    'ParticleModuleColor', 'ParticleModuleColor_Seeded', 'ParticleModuleColorOverLife', 'ParticleModuleColorScaleOverLife',
    'ParticleModuleParameterDynamic', 'ParticleModuleSubUV', 'ParticleModuleRotation', 'ParticleModuleRotationRate',
    'ParticleModuleOrientationAxisLock', 'ParticleModuleLight', 'ParticleModuleEventGenerator', 'ParticleModuleSpawnPerUnit',
}


def cone_axis_extent(direction, half_angle, axis_vec):
    """单位速度在锥（方向 D、半角 θ）里时，沿 axis 方向分量的 (最小, 最大)。"""
    d = direction
    n = math.sqrt(sum(x * x for x in d)) or 1.0
    d = tuple(x / n for x in d)
    c = max(-1.0, min(1.0, sum(a * b for a, b in zip(d, axis_vec))))
    alpha = math.acos(c)
    mx = math.cos(max(0.0, alpha - half_angle))
    mn = -math.cos(max(0.0, (math.pi - alpha) - half_angle))
    return mn, mx


def box_rotate(Rm, box, to_local=True):
    """把一个轴对齐盒（[(lo,hi)]*3，世界）转到局部，取 8 个角的外包盒。"""
    corners = []
    for x in box[0]:
        for y in box[1]:
            for z in box[2]:
                v = (x, y, z)
                corners.append(world_to_local(Rm, v) if to_local else v)
    return [(min(c[i] for c in corners), max(c[i] for c in corners)) for i in range(3)]


class EmitterModel:
    def __init__(self, ctx, sys_path, em_path):
        self.ctx = ctx
        self.path = em_path
        ep = ctx.P(em_path)
        self.name = ep.get('EmitterName')
        self.lods = [ref(x) for x in ep.get('LODLevels', [])]
        self.notes = []
        self.unsupported = []
        self.enabled = False
        self.spawns = False
        self.events_out = []
        self.depends = None  # ('LocationEmitter'|'Event'|'Trail', 源发射器名)
        self.load()

    def mods(self, lod):
        lp = self.ctx.P(lod)
        out = []
        for m in lp.get('Modules', []):
            p = ref(m)
            if not p:
                continue
            pr = self.ctx.P(p)
            if pr.get('bEnabled') is False:
                continue
            out.append((short(self.ctx.cls(p)), pr, p))
        return out

    def load(self):
        ctx = self.ctx
        lod0 = self.lods[0] if self.lods else None
        if not lod0:
            self.notes.append('没有 LOD')
            return
        lp = ctx.P(lod0)
        self.enabled = any(ctx.P(l).get('bEnabled') for l in self.lods)
        rq = ctx.P(ref(lp.get('RequiredModule')))
        self.rq = rq
        self.local = bool(rq.get('bUseInLocalSpace'))
        self.align = rq.get('ScreenAlignment')
        self.uvflip = rq.get('UVFlippingMode')
        self.material = ref(rq.get('Material'))
        td = ref(lp.get('TypeDataModule'))
        self.typedata = short(ctx.cls(td)) if td else None
        org = rq.get('EmitterOrigin') or {}
        self.origin = tuple(float(org.get(a, 0)) for a in AX)
        er = rq.get('EmitterRotation') or {}
        self.erot = (float(er.get('Pitch', 0)), float(er.get('Yaw', 0)), float(er.get('Roll', 0)))
        if any(abs(x) > 1e-3 for x in self.erot):
            self.notes.append('EmitterRotation 非零 %s（按角点旋转处理）' % (self.erot,))
        sp = ctx.P(ref(lp.get('SpawnModule')))
        rate = Dist(ctx, sp.get('Rate'), 'Rate') if sp.get('Rate') else None
        bursts = sp.get('BurstList') or []
        self.burst_total = sum(max(int(b.get('Count', 0)), 0) for b in bursts)
        self.rate_max = rate.rng()[1] if rate and rate.ok else 0.0
        rrate = Dist(ctx, rq.get('SpawnRate'), 'SpawnRate') if rq.get('SpawnRate') else None
        if rrate and rrate.ok:
            self.rate_max = max(self.rate_max, rrate.rng()[1])
        self.burst_total += sum(max(int(b.get('Count', 0)), 0) for b in (rq.get('BurstList') or []))
        self.duration = float(rq.get('EmitterDuration') or 0)
        self.loops = int(rq.get('EmitterLoops') or 0)
        self.max_draw = rq.get('MaxDrawCount') if rq.get('bUseMaxDrawCount') else None
        self.modlist = []
        for lod in self.lods:
            if ctx.P(lod).get('bEnabled') is False and lod != lod0:
                continue
            self.modlist.append(self.mods(lod))
        if not self.modlist:
            self.modlist = [self.mods(lod0)]
        self.classes = [c for c, _, _ in self.modlist[0]]
        self.spawns = (self.burst_total > 0 or self.rate_max > 0 or 'ParticleModuleEventReceiverSpawn' in self.classes
                       or 'ParticleModuleSpawnPerUnit' in self.classes)
        for c, p, _ in self.modlist[0]:
            if c == 'ParticleModuleEventGenerator':
                for ev in p.get('Events') or []:
                    self.events_out.append(ev.get('CustomName'))
        for ms in self.modlist:
            for c, _, _ in ms:
                if c not in SUPPORTED and c not in self.unsupported:
                    self.unsupported.append(c)
        if self.typedata == 'ParticleModuleTypeDataRibbon':
            self.notes.append('Ribbon：位置按源发射器粒子的路径 + 自身运动')
        elif self.typedata and self.typedata not in ('ParticleModuleTypeDataGpu',):
            self.unsupported.append(self.typedata)

    # ---- 单个 LOD 的运动参数 ----
    def params(self, ms):
        ctx = self.ctx
        P = {'T': [0.0, 0.0], 'p0': [(0.0, 0.0)] * 3, 'w0': [(0.0, 0.0)] * 3, 'w0w': [(0.0, 0.0)] * 3,
             'radial': 0.0, 'aL': [(0.0, 0.0)] * 3, 'aW': [(0.0, 0.0)] * 3, 'drag': [], 'volabs': None, 'volabsW': False,
             'volmul': [], 'size0': [0.0, 0.0], 'sbl': [], 'sbs': (1.0, 1.0), 'pivot': (-0.5, -0.5), 'camoff': 0.0,
             'vf': 0.0, 'wind': False, 'notes': [], 'has_life': False}
        p0 = [(0.0, 0.0)] * 3
        for c, p, path in ms:
            if c == 'ParticleModuleLifetime':
                d = Dist(ctx, p.get('Lifetime'))
                if d.ok:
                    lo, hi = d.rng()
                    P['T'][0] += max(lo, 0)
                    P['T'][1] += max(hi, 0)
                    P['has_life'] = True
                    P['notes'] += d.notes
            elif c == 'ParticleModuleSize':
                d = Dist(ctx, p.get('StartSize'))
                if d.ok:
                    P['size0'][0] = max(P['size0'][0], max(abs(x) for x in d.rng(0)))
                    P['size0'][1] = max(P['size0'][1], max(abs(x) for x in d.rng(1 if d.n() > 1 else 0)))
                    P['notes'] += d.notes
            elif c == 'ParticleModuleSizeMultiplyLife':
                d = Dist(ctx, p.get('LifeMultiplier'))
                if d.ok:
                    P['sbl'].append((d, bool(p.get('MultiplyX', True)), bool(p.get('MultiplyY', True))))
            elif c == 'ParticleModuleSizeScaleBySpeed':
                ms_ = p.get('MaxScale') or {}
                P['sbs'] = (max(1.0, float(ms_.get('X', 1))), max(1.0, float(ms_.get('Y', 1))))
            elif c == 'ParticleModuleLocation':
                d = Dist(ctx, p.get('StartLocation'))
                if d.ok:
                    p0 = [iv_add(p0[i], d.rng(i)) for i in range(3)]
                    P['notes'] += d.notes
            elif c == 'ParticleModuleLocationPrimitiveSphere':
                r = Dist(ctx, p.get('StartRadius'))
                rmax = max(abs(x) for x in r.rng()) if r.ok else 0.0
                sl = Dist(ctx, p.get('StartLocation'))
                for i, a in enumerate(AX):
                    lo = -rmax if p.get('Negative_' + a, True) else 0.0
                    hi = rmax if p.get('Positive_' + a, True) else 0.0
                    off = sl.rng(i) if sl.ok else (0.0, 0.0)
                    p0[i] = iv_add(p0[i], iv_add((lo, hi), off))
                    if p.get('Velocity'):
                        vs = Dist(ctx, p.get('VelocityScale'))
                        vsr = vs.rng() if vs.ok else (0.0, 0.0)
                        P['w0'][i] = iv_add(P['w0'][i], iv_mul((lo, hi), vsr))
            elif c == 'ParticleModuleVelocity':
                d = Dist(ctx, p.get('StartVelocity'))
                key = 'w0w' if p.get('bInWorldSpace') else 'w0'
                if d.ok:
                    P[key] = [iv_add(P[key][i], d.rng(i)) for i in range(3)]
                    P['notes'] += d.notes
                rd = Dist(ctx, p.get('StartVelocityRadial'))
                if rd.ok:
                    P['radial'] += max(abs(x) for x in rd.rng())
            elif c == 'ParticleModuleVelocityCone':
                ang = Dist(ctx, p.get('Angle'))
                vel = Dist(ctx, p.get('Velocity'))
                th = min(math.pi, max(abs(x) for x in ang.rng()) * math.pi) if ang.ok else math.pi
                sp = max(abs(x) for x in vel.rng()) if vel.ok else 0.0
                dv = p.get('Direction') or {'X': 0, 'Y': 0, 'Z': 1}
                D = tuple(float(dv.get(a, 0)) for a in AX)
                key = 'w0w' if p.get('bInWorldSpace') else 'w0'
                for i in range(3):
                    e = tuple(1.0 if j == i else 0.0 for j in range(3))
                    mn, mx = cone_axis_extent(D, th, e)
                    P[key][i] = iv_add(P[key][i], (mn * sp, mx * sp))
            elif c == 'ParticleModuleVelocityOverLifetime':
                d = Dist(ctx, p.get('VelOverLife'))
                if d.ok:
                    if p.get('Absolute'):
                        P['volabs'] = d
                        P['volabsW'] = bool(p.get('bInWorldSpace'))
                    else:
                        P['volmul'].append(d)
            elif c == 'ParticleModuleAccelerationConstant':
                a = p.get('Acceleration') or {}
                v = tuple(float(a.get(x, 0)) for x in AX)
                key = 'aW' if (p.get('bAlwaysInWorldSpace', True) or not self.local) else 'aL'
                P[key] = [iv_add(P[key][i], (v[i], v[i])) for i in range(3)]
            elif c == 'ParticleModuleAcceleration':
                d = Dist(ctx, p.get('Acceleration'))
                key = 'aW' if (p.get('bAlwaysInWorldSpace', True) or not self.local) else 'aL'
                if d.ok:
                    P[key] = [iv_add(P[key][i], d.rng(i)) for i in range(3)]
            elif c == 'ParticleModuleAccelerationDrag':
                d = Dist(ctx, p.get('DragCoefficientRaw'))
                if d.ok:
                    P['drag'].append(d)
            elif c == 'ParticleModulePivotOffset':
                pv = p.get('PivotOffset') or {}
                P['pivot'] = (float(pv.get('X', 0)) - 0.5, float(pv.get('Y', 0)) - 0.5)
            elif c == 'ParticleModuleCameraOffset':
                d = Dist(ctx, p.get('CameraOffset'))
                if d.ok:
                    P['camoff'] += max(abs(x) for x in d.rng())
            elif c == 'ParticleModuleVectorFieldLocal':
                P['vf'] += abs(float(p.get('Intensity') or 0))
                P['notes'].append('矢量场：力度按场值 ≤ 1 × Intensity 估（场值读不到）')
            elif c == 'ParticleModuleWindDirectionalSource':
                P['wind'] = True
                P['notes'].append('受风源影响（风力读不到，未计）')
        # EmitterOrigin
        p0 = [iv_add(p0[i], (self.origin[i], self.origin[i])) for i in range(3)]
        P['p0'] = p0
        if not P['has_life'] or P['T'][1] <= 0:
            P['notes'].append('寿命 0 = 不死；按发射器时长 %.2f s 估' % max(self.duration, 1.0))
            P['T'] = [max(self.duration, 1.0)] * 2
        return P

    def series(self, P, T):
        """寿命 T 时逐时刻：A 的 lo/hi、世界固定部分系数（F 区间、G 区间、VOL 世界积分）、面片半径。"""
        n = NSTEP
        dt = T / n
        # 阻力系数 k(τ) 区间
        def k_at(tau):
            lo = hi = 0.0
            for d in P['drag']:
                a, b = d.at(tau)
                lo += max(min(a, b), 0.0)
                hi += max(a, b, 0.0)
            return lo, hi

        def m_at(tau, i):
            lo = hi = 1.0
            for d in P['volmul']:
                lo, hi = iv_mul((lo, hi), d.at(tau, i))
            return lo, hi
        phi = [1.0, 1.0]  # (阻力大 → 小 φ, 阻力小 → 大 φ)
        wg = [0.0, 0.0]   # 单位加速度下的速度
        F = [[0.0, 0.0] for _ in range(3)]
        G = [[0.0, 0.0] for _ in range(3)]
        V = [[0.0, 0.0] for _ in range(3)]  # Absolute VOL 积分
        out = []
        for s in range(n + 1):
            t = s * dt
            tau = t / T if T > 0 else 0.0
            # 面片半径
            sx, sy = P['size0']
            mx_lo = mx_hi = my_lo = my_hi = 1.0
            mx, my = 1.0, 1.0
            for d, ux, uy in P['sbl']:
                if ux:
                    mx *= max(abs(v) for v in d.at(tau, 0))
                if uy:
                    my *= max(abs(v) for v in d.at(tau, 1 if d.n() > 1 else 0))
            SX = sx * mx * P['sbs'][0]
            SY = sy * my * P['sbs'][1]
            SYe = max(SX, SY) if self.align != 'PSA_Velocity' else SY
            px, py = P['pivot']
            rad = math.hypot(SX * max(abs(px), abs(1 + px)), SYe * max(abs(py), abs(1 + py))) + P['camoff']
            if P['volabs'] is not None:
                A = [iv_add(P['p0'][i], (V[i][0], V[i][1])) for i in range(3)]
            else:
                A = []
                for i in range(3):
                    v = iv_add(P['w0'][i], (-P['radial'], P['radial']))
                    a = iv_add(iv_mul(tuple(F[i]), v), iv_mul(tuple(G[i]), P['aL'][i]))
                    A.append(iv_add(P['p0'][i], a))
            out.append({'t': t, 'A': A, 'F': [tuple(f) for f in F], 'G': [tuple(g) for g in G],
                        'V': [tuple(v) for v in V], 'r': rad, 'sz': max(SX, SY)})
            if s == n:
                break
            klo, khi = k_at(tau)
            for i in range(3):
                mlo, mhi = m_at(tau, i)
                F[i][0] += min(mlo * phi[0], mlo * phi[1]) * dt
                F[i][1] += max(mhi * phi[0], mhi * phi[1]) * dt
                G[i][0] += min(mlo * wg[0], mlo * wg[1]) * dt
                G[i][1] += max(mhi * wg[0], mhi * wg[1]) * dt
                if P['volabs'] is not None:
                    a, b = P['volabs'].at(tau, i)
                    V[i][0] += min(a, b) * dt
                    V[i][1] += max(a, b) * dt
            phi = [phi[0] * math.exp(-khi * dt), phi[1] * math.exp(-klo * dt)]
            wg = [wg[0] + (1 - khi * wg[0]) * dt, wg[1] + (1 - klo * wg[1]) * dt]
        return out

    def case_box(self, P, ser, s, Rm, unscaled_motion, src_box=None):
        """一个 (缩放 s, 旋转 R) 情形下这个发射器的本地盒（含面片半径）和纯位置盒。"""
        lo = [INF] * 3
        hi = [-INF] * 3
        plo = [INF] * 3
        phi_ = [-INF] * 3
        # 世界固定的部分：世界速度 w0w、世界加速度 aW、世界 VOL
        vfa = P['vf']
        for row in ser:
            Cw = []
            for i in range(3):
                c = iv_mul(row['F'][i], P['w0w'][i])
                c = iv_add(c, iv_mul(row['G'][i], iv_add(P['aW'][i], (-vfa, vfa))))
                if P['volabs'] is not None and P['volabsW']:
                    c = iv_add(c, row['V'][i])
                Cw.append(c)
            Cl = box_rotate(Rm, Cw)
            A = row['A']
            if P['volabs'] is not None and P['volabsW']:
                A = P['p0']
            for i in range(3):
                a0, a1 = A[i]
                if unscaled_motion:
                    # 世界空间发射器：出生位置 / 速度不跟组件缩放时，本地 = 位置 / s
                    a0, a1 = a0 / s, a1 / s
                c0, c1 = Cl[i][0] / s, Cl[i][1] / s
                x0, x1 = a0 + c0, a1 + c1
                if src_box is not None:
                    x0 += src_box[i][0]
                    x1 += src_box[i][1]
                plo[i] = min(plo[i], x0)
                phi_[i] = max(phi_[i], x1)
                lo[i] = min(lo[i], x0 - row['r'])
                hi[i] = max(hi[i], x1 + row['r'])
        return [(lo[i], hi[i]) for i in range(3)], [(plo[i], phi_[i]) for i in range(3)]


def system_bounds(ctx, sys_path, s_range, tilt_deg, margin=0.10):
    sp = ctx.P(sys_path)
    ems = [EmitterModel(ctx, sys_path, ref(e)) for e in sp.get('Emitters', []) if ref(e)]
    by_name = {}
    for e in ems:
        by_name.setdefault(e.name, []).append(e)
    # 情形：缩放两端 × 倾斜网格（pitch × roll）
    s_lo, s_hi = s_range
    angs = [0.0] if tilt_deg <= 0 else [-tilt_deg, -tilt_deg / 2, 0.0, tilt_deg / 2, tilt_deg]
    cases = [(s, rot_matrix(p, 0, r), (p, r)) for s in (s_lo, s_hi) for p in angs for r in angs]
    per = []
    union = [(INF, -INF)] * 3
    pos_cache = {}
    order = sorted(ems, key=lambda e: 1 if any(c in e.classes for c in ('ParticleModuleLocationEmitter', 'ParticleModuleEventReceiverSpawn')) or e.typedata == 'ParticleModuleTypeDataRibbon' else 0)
    for e in order:
        info = {'emitter': e.name, 'path': e.path, 'enabled': e.enabled, 'spawns': e.spawns, 'local': getattr(e, 'local', None),
                'gpu': e.typedata == 'ParticleModuleTypeDataGpu', 'typedata': e.typedata, 'unsupported': e.unsupported,
                'notes': list(e.notes)}
        if not e.enabled or not e.spawns:
            info['skipped'] = '关着' if not e.enabled else '不生成粒子'
            per.append(info)
            continue
        boxes = []
        src = None
        for c, p, _ in e.modlist[0]:
            if c == 'ParticleModuleLocationEmitter':
                src = ('LocationEmitter', p.get('EmitterName'))
            elif c == 'ParticleModuleEventReceiverSpawn' and not p.get('bUsePSysLocation'):
                gen = [x for x in ems if p.get('EventName') in x.events_out]
                src = ('Event', gen[0].name if gen else None)
            elif c == 'ParticleModuleTrailSource':
                src = ('Trail', p.get('SourceName'))
        for ms in e.modlist:
            P = e.params(ms)
            info['notes'] += [x for x in P['notes'] if x not in info['notes']]
            T0, T1 = P['T']
            Ts = sorted(set([T0, (T0 + T1) / 2, T1]))
            for T in Ts:
                ser = e.series(P, T)
                for ci, (s, Rm, ang) in enumerate(cases):
                    sb = None
                    if src:
                        sb = pos_cache.get((src[1], ci))
                        if sb is None:
                            info['notes'].append('依赖的源发射器 %s 没算出位置，按 0 计' % (src[1],))
                    for unscaled in ((False, True) if not e.local else (False,)):
                        b, pb = e.case_box(P, ser, s, Rm, unscaled, sb)
                        boxes.append((ci, b, pb))
        if src:
            info['source'] = {'kind': src[0], 'emitter': src[1]}
        eb = [(min(b[1][i][0] for b in boxes), max(b[1][i][1] for b in boxes)) for i in range(3)]
        # 每个情形的纯位置盒（给依赖它的发射器用）
        for ci in range(len(cases)):
            pbs = [b[2] for b in boxes if b[0] == ci]
            if pbs:
                cur = [(min(x[i][0] for x in pbs), max(x[i][1] for x in pbs)) for i in range(3)]
                old = pos_cache.get((e.name, ci))
                if old:
                    cur = [(min(old[i][0], cur[i][0]), max(old[i][1], cur[i][1])) for i in range(3)]
                pos_cache[(e.name, ci)] = cur
        info['box'] = eb
        union = [(min(union[i][0], eb[i][0]), max(union[i][1], eb[i][1])) for i in range(3)]
        per.append(info)
    if union[0][0] == INF:
        return {'emitters': per, 'raw': None, 'final': None}
    final = []
    for lo, hi in union:
        c = (lo + hi) / 2
        h = (hi - lo) / 2 * (1 + margin)
        final.append((math.floor((c - h) / 10) * 10, math.ceil((c + h) / 10) * 10))
    return {'emitters': per, 'raw': union, 'final': final, 'cases': len(cases), 's_range': s_range, 'tilt_deg': tilt_deg}
