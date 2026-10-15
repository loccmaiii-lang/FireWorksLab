# 只读分析用：把 GPUECli 读回的 Cascade 对象（raw_crawl.json）解析成分布、模块，
# 并按模块值算每个发射器整个寿命里能到的范围（保守包络，cm，组件本地坐标）。
# 不连 UE、不写任何东西。
import math

AX = ('X', 'Y', 'Z')


def short(c):
    return (c or '').split('.')[-1]


class Ctx:
    def __init__(self, objects):
        self.O = objects

    def P(self, path):
        o = self.O.get(path)
        return (o or {}).get('properties', {})

    def cls(self, path):
        return short((self.O.get(path) or {}).get('class'))


def ref(v):
    return v.get('path') if isinstance(v, dict) and v.get('_type') == 'object_ref' else None


def _vec(v):
    return tuple(float(v.get(a, 0)) for a in AX)


LOCK = {'EDVLF_XY': ((1, 0),), 'EDVLF_XZ': ((2, 0),), 'EDVLF_YZ': ((2, 1),), 'EDVLF_XYZ': ((1, 0), (2, 0))}


class Dist:
    """一个 Cascade 分布。keys = [(时间, ((lo,hi) 每个分量))]；时间对曲线有意义。"""

    def __init__(self, ctx, raw, label=''):
        self.label = label
        self.notes = []
        self.param = None
        self.cls = None
        self.keys = None
        self.interp_nonlinear = False
        obj_path = ref(raw.get('Distribution')) if isinstance(raw, dict) else None
        o = ctx.O.get(obj_path) if obj_path else None
        if not o:
            # 没有分布对象：退回 Raw 结构里的 MinValue / MaxValue（查找表范围）
            lo, hi = (raw or {}).get('MinValue'), (raw or {}).get('MaxValue')
            if lo is None:
                self.keys = None
                self.notes.append('分布读不到')
                return
            self.keys = [(0.0, ((float(lo), float(hi)),) * 3)]
            self.cls = 'RawRange'
            self.notes.append('用查找表范围')
            return
        c = short(o['class'])
        p = o['properties']
        self.cls = c
        if c == 'DistributionFloatConstant':
            v = float(p.get('Constant', 0))
            self.keys = [(0.0, ((v, v),))]
        elif c == 'DistributionFloatUniform':
            self.keys = [(0.0, ((float(p.get('Min', 0)), float(p.get('Max', 0))),))]
        elif c == 'DistributionFloatConstantCurve':
            pts = (p.get('ConstantCurve') or {}).get('Points') or []
            self.keys = [(float(q['InVal']), ((float(q['OutVal']), float(q['OutVal'])),)) for q in pts] or [(0.0, ((0.0, 0.0),))]
            self.interp_nonlinear = any(q.get('InterpMode') not in ('CIM_Linear', 'CIM_Constant') for q in pts)
        elif c == 'DistributionFloatParticleParameter':
            vals = [float(p.get(k, 0)) for k in ('MinOutput', 'MaxOutput', 'Constant')]
            self.keys = [(0.0, ((min(vals), max(vals)),))]
            self.param = p.get('ParameterName')
            self.notes.append('实例参数 %s（取输出范围和缺省值的并集）' % self.param)
        elif c == 'DistributionVectorConstant':
            v = _vec(p.get('Constant') or {})
            self.keys = [(0.0, tuple((x, x) for x in v))]
            self._lock(p)
        elif c == 'DistributionVectorUniform':
            lo, hi = _vec(p.get('Min') or {}), _vec(p.get('Max') or {})
            comp = [(min(a, b), max(a, b)) for a, b in zip(lo, hi)]
            mf = p.get('MirrorFlags')
            mfl = mf if isinstance(mf, list) else [mf] * 3
            for i, f in enumerate(mfl[:3]):
                if f == 'EDVMF_Mirror':
                    a, b = comp[i]
                    comp[i] = (min(a, -b), max(b, -a))
            self.keys = [(0.0, tuple(comp))]
            self._lock(p)
        elif c == 'DistributionVectorConstantCurve':
            pts = (p.get('ConstantCurve') or {}).get('Points') or []
            self.keys = [(float(q['InVal']), tuple((x, x) for x in _vec(q['OutVal']))) for q in pts] or [(0.0, ((0, 0),) * 3)]
            self.interp_nonlinear = any(q.get('InterpMode') not in ('CIM_Linear', 'CIM_Constant') for q in pts)
            self._lock(p)
        elif c == 'DistributionVectorParticleParameter':
            comp = []
            for a in AX:
                vals = [float((p.get(k) or {}).get(a, 0)) for k in ('MinOutput', 'MaxOutput', 'Constant')]
                comp.append((min(vals), max(vals)))
            self.keys = [(0.0, tuple(comp))]
            self.param = p.get('ParameterName')
            self.notes.append('实例参数 %s（取输出范围和缺省值的并集）' % self.param)
        else:
            lo, hi = (raw or {}).get('MinValue'), (raw or {}).get('MaxValue')
            self.notes.append('不认识的分布 %s，用查找表范围' % c)
            if lo is None:
                self.keys = None
            else:
                self.keys = [(0.0, ((float(lo), float(hi)),) * 3)]
        if self.interp_nonlinear:
            self.notes.append('曲线有非线性关键点（按折线近似，另加 5% 余量）')

    def _lock(self, p):
        # 引擎按 LockedAxes 锁轴（bLockAxes 是旧字段，PostLoad 后不再看），所以不管 bLockAxes。
        rules = LOCK.get(p.get('LockedAxes'))
        if not rules:
            return
        new = []
        for t, comp in self.keys:
            comp = list(comp)
            for dst, src in rules:
                comp[dst] = comp[src]
            new.append((t, tuple(comp)))
        self.keys = new

    @property
    def ok(self):
        return self.keys is not None

    def n(self):
        return len(self.keys[0][1]) if self.keys else 0

    def rng(self, i=0):
        """整个定义域上第 i 个分量的 (最小, 最大)。"""
        lo = min(k[1][i][0] for k in self.keys)
        hi = max(k[1][i][1] for k in self.keys)
        if self.interp_nonlinear:
            span = max(abs(lo), abs(hi)) * 0.05
            lo, hi = lo - span, hi + span
        return lo, hi

    def at(self, t, i=0):
        """时间 t 处第 i 个分量的 (lo, hi)（折线插值，两端夹住）。"""
        ks = self.keys
        if len(ks) == 1 or t <= ks[0][0]:
            return ks[0][1][i]
        if t >= ks[-1][0]:
            return ks[-1][1][i]
        for (t0, v0), (t1, v1) in zip(ks, ks[1:]):
            if t0 <= t <= t1:
                u = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
                a = v0[i][0] + (v1[i][0] - v0[i][0]) * u
                b = v0[i][1] + (v1[i][1] - v0[i][1]) * u
                return (a, b)
        return ks[-1][1][i]

    def summary(self):
        if not self.keys:
            return None
        return {'cls': self.cls, 'keys': len(self.keys), 'range': [self.rng(i) for i in range(self.n())],
                'param': self.param, 'notes': self.notes}


def iv_mul(a, b):
    xs = [a[0] * b[0], a[0] * b[1], a[1] * b[0], a[1] * b[1]]
    return (min(xs), max(xs))


def iv_add(a, b):
    return (a[0] + b[0], a[1] + b[1])


def rot_matrix(pitch, yaw, roll):
    """UE FRotator → 3x3（列 = 局部 X/Y/Z 在世界里的方向），度。"""
    cp, sp = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))
    cy, sy = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    cr, sr = math.cos(math.radians(roll)), math.sin(math.radians(roll))
    # UE FRotationMatrix
    X = (cp * cy, cp * sy, sp)
    Y = (sr * sp * cy - cr * sy, sr * sp * sy + cr * cy, -sr * cp)
    Z = (-(cr * sp * cy + sr * sy), cy * sr - cr * sp * sy, cr * cp)
    return (X, Y, Z)


def world_to_local(Rm, v):
    """世界向量 → 局部（R 的转置）。"""
    return tuple(sum(Rm[i][k] * v[k] for k in range(3)) for i in range(3))


def local_to_world(Rm, v):
    return tuple(sum(Rm[k][i] * v[k] for k in range(3)) for i in range(3))
