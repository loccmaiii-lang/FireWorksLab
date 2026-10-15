# 资源规范统一 · 第 1 步干跑：按新现场只读读回（raw_crawl.json 等）算四项的现值和打算改成的值。
# 只读分析，不连 UE、不写 UE。输出 ../干跑.json（../干跑.md 由 report.py 写）。
import json, glob, re, math, collections
import gzip as _gz, os as _os

def _load(name):
    return json.load(open(name, encoding='utf-8')) if _os.path.exists(name) else json.load(_gz.open(name + '.gz', 'rt', encoding='utf-8'))


from cascade_model import Ctx, Dist, ref, short
from bounds import system_bounds, EmitterModel

RAW = _load('raw_crawl.json')
ROWS = json.load(open('resourcefx_30.json', encoding='utf-8'))
REFS = json.load(open('referencers.json', encoding='utf-8'))
PKGS = json.load(open('baker_packages.json', encoding='utf-8'))
O = RAW['objects']
ctx = Ctx(O)
FIRE = '/Game/MaterialLib/Materials/FX/Parent/Fire/M_EFX_FlipBookSuperPack_FireBase_Unlit.M_EFX_FlipBookSuperPack_FireBase_Unlit'
TARGET_ED = 0.98

# ---------- 行 → 系统 ----------
sys_rows = collections.defaultdict(list)
for side in ('pc', 'mobile'):
    for r in ROWS[side]:
        for k in ('FxSP', 'FxSP_Low', 'FxSP_High'):
            v = r.get(k)
            if v and v != 'None':
                sys_rows[v].append({'side': side, 'row': r['_row_name'], 'resourceId': r['ResourceId'], 'slot': k})

# ---------- 编排里用到的缩放 / 倾斜（B08 修订7 一张表，16.0.43） ----------
show_file = glob.glob('../../../../FXtools/节目/NewYearFireWorks_v01/导演表-B08修订7*一张表.json')[0]
SHOW = json.load(open(show_file, encoding='utf-8'))
use = collections.defaultdict(lambda: {'n': 0, 'smin': 9, 'smax': 0, 'tilt': 0.0})
for st in SHOW['EffectSubTemplates']:
    for e in st['Entries']:
        u = use[e['FXResourceId']]
        s = e['EffectScale']
        rr = e.get('RandomScaleRatio') or 0
        u['n'] += 1
        u['smin'] = min(u['smin'], min(s['X'], s['Y'], s['Z']) * (1 - rr))
        u['smax'] = max(u['smax'], max(s['X'], s['Y'], s['Z']) * (1 + rr))
        ro, rnd = e['RotationOffset'], e['RandomRotationRange']
        u['tilt'] = max(u['tilt'], abs(ro['Pitch']) + abs(rnd['Pitch']), abs(ro['Roll']) + abs(rnd['Roll']))


def fan_like(name):
    return bool(re.search(r'Fan|Comet_Layers|Silver_Layers|Silver3_Layers', name))


def skyrocket(name):
    return 'Skyrocket' in name


def scale_tilt(sys_path):
    name = sys_path.split('.')[-1]
    ids = {x['resourceId'] for x in sys_rows[sys_path]}
    used = [use[i] for i in ids if i in use]
    s_lo = min([0.8] + [u['smin'] for u in used])
    s_hi = max([1.6] + [u['smax'] for u in used])
    tilt = max([0.0] + [u['tilt'] for u in used])
    why = 'B08 修订7 实际用到' if used else '当前编排没用到，按缺省'
    if fan_like(name):
        tilt = max(tilt, 50.0)
        why += '；扇按 ±50° 倾斜算'
    if skyrocket(name):
        tilt = max(tilt, 30.0)
        why += '；窜天猴按 ±30° 倾斜算'
    if tilt > 0 and not fan_like(name) and not skyrocket(name):
        tilt = math.ceil(tilt / 5) * 5
    return (round(s_lo, 3), round(s_hi, 3)), tilt, why, [{'resourceId': i, **use[i]} for i in ids if i in use]


# ---------- 烘焙器包索引 ----------
pkg_names = collections.defaultdict(list)
for p in PKGS['packages']:
    for k in ('system', 'name'):
        if p.get(k):
            pkg_names[p[k]].append(p)


def baker_of(sys_path):
    n = sys_path.split('.')[-1]
    m = re.match(r'P_EFX_FireWorks?_(.+?)(_HD|_M)?$', n)
    base = m.group(1) if m else n
    cands = pkg_names.get(base, []) + pkg_names.get(base + '_M', []) + pkg_names.get(base + '_Mobile', [])
    return [{'file': c['file'], 'tool': c['tool'], 'platform': c['platform']} for c in cands][:6]


# ---------- 材质 ----------
def chain_of(mi):
    out = []
    cur = mi
    while cur and O.get(cur):
        out.append(cur)
        cur = ref(ctx.P(cur).get('Parent'))
    return out


root_params = {}
for root in RAW['roots']:
    pkg = root.split('.')[0]
    names = {}
    for p, o in O.items():
        if o and p.startswith(pkg + '.') and short(o['class']) == 'MaterialExpressionScalarParameter':
            names[o['properties'].get('ParameterName')] = o['properties'].get('DefaultValue')
    root_params[root] = names


def scalar_override(mi_path, name):
    for v in ctx.P(mi_path).get('ScalarParameterValues') or []:
        nm = (v.get('ParameterInfo') or {}).get('Name') or v.get('ParameterName')
        if nm == name:
            return v.get('ParameterValue')
    return None


in_scope_sys = {s.split('.')[0] for s in RAW['systems']}
materials = []
mat_users = collections.defaultdict(list)


def emitters_of(s):
    return [EmitterModel(ctx, s, ref(e)) for e in ctx.P(s).get('Emitters', []) if ref(e)]


EMS = {s: emitters_of(s) for s in RAW['systems']}
for s, ems in EMS.items():
    for e in ems:
        if e.material:
            mat_users[e.material].append({'system': s.split('.')[-1], 'emitter': e.name})

for mi in RAW['materials']:
    ch = chain_of(mi)
    root = ch[-1] if ch else None
    is_inst = short((O.get(mi) or {}).get('class')) == 'MaterialInstanceConstant'
    rp = root_params.get(root, {})
    has = 'EmissiveDissolve' in rp
    cur, src = None, None
    for c in ch[:-1]:
        v = scalar_override(c, 'EmissiveDissolve')
        if v is not None:
            cur, src = v, ('本实例覆盖' if c == mi else '上级实例覆盖 ' + c.split('.')[-1])
            break
    if cur is None and has:
        cur, src = rp['EmissiveDissolve'], '继承母材质缺省'
    pow_ = None
    for c in ch[:-1]:
        v = scalar_override(c, 'EmissiveDissolvePow')
        if v is not None:
            pow_ = v
            break
    if pow_ is None and 'EmissiveDissolvePow' in rp:
        pow_ = rp['EmissiveDissolvePow']
    outside = [x for x in REFS['materials'].get(mi, []) if x not in in_scope_sys and not x.split('/')[-1].startswith('MI_')]
    rec = {'material': mi, 'name': mi.split('.')[-1], 'instance': is_inst, 'chain': [c.split('.')[-1] for c in ch], 'root': root,
           'rootIsFireBase': root == FIRE, 'rootHasParam': has, 'current': cur, 'currentSource': src, 'pow': pow_,
           'usedBy': mat_users.get(mi, []), 'usedOutsideScope': [x.split('/')[-1] for x in outside]}
    if not is_inst:
        rec['plan'], rec['why'] = None, '不是材质实例（发射器直接用母材质），不动'
    elif not has:
        rec['plan'], rec['why'] = None, '母材质没有 EmissiveDissolve，跳过'
    elif root != FIRE:
        rec['plan'], rec['why'] = 'ask', '有这个参数但母材质不是 FireBase_Unlit，列出来问'
    elif outside:
        rec['plan'], rec['why'] = 'ask', '范围外的特效也在用这个实例（%d 个），改了会一起变，问用户' % len(outside)
    elif cur is not None and abs(float(cur) - TARGET_ED) < 1e-6:
        rec['plan'], rec['why'] = None, '已经是 0.98'
    else:
        rec['plan'], rec['why'] = TARGET_ED, '改实例覆盖 %s → 0.98（母材质不动）' % (cur,)
    materials.append(rec)

# ---------- 发射器：朝向 / 翻转 ----------
ROUND = ('MI_EFX_Spark_16', 'MI_EFX_Glow_', 'MI_EFX_Spark_09', 'MI_EFX_Spark_15')


def mat_root(mi):
    ch = chain_of(mi) if mi else []
    return ch[-1] if ch else None


def tex_params(mi):
    out = {}
    for c in chain_of(mi)[:-1] if mi else []:
        for v in ctx.P(c).get('TextureParameterValues') or []:
            nm = (v.get('ParameterInfo') or {}).get('Name')
            val = ref(v.get('ParameterValue'))
            if nm and nm not in out and val:
                out[nm] = val
    return out


def size_info(e):
    """面片横竖：StartSize X/Y 和 Size By Life X/Y 是否处处相等，最大宽高比。
    Square / FacingCameraPosition 本来就只认 X（这批资产里很多 FCP 发射器 StartSize.Y = 0 照样显示），按方形算。"""
    P = e.params(e.modlist[0])
    sx, sy = P['size0']
    if e.align in ('PSA_Square', 'PSA_FacingCameraPosition', 'PSA_FacingCameraDistanceBlend'):
        return True, 1.0, [round(sx, 1), round(sy, 1)], P['pivot']
    same = abs(sx - sy) < 1e-3
    worst = (sy / sx) if sx > 0 else None
    for d, ux, uy in P['sbl']:
        for t, comp in d.keys:
            a = comp[0][1] if ux else 1.0
            b = (comp[1][1] if d.n() > 1 else comp[0][1]) if uy else 1.0
            if abs(a - b) > 1e-3:
                same = False
            if a > 0 and sx > 0:
                r = (sy * b) / (sx * a)
                worst = r if worst is None or abs(math.log(max(r, 1e-6))) > abs(math.log(max(worst, 1e-6))) else worst
    return same, (round(worst, 3) if worst else None), [round(sx, 1), round(sy, 1)], P['pivot']


systems = []
for s in RAW['systems']:
    name = s.split('.')[-1]
    ems = EMS[s]
    seqs = [e for e in ems if e.enabled and e.spawns and mat_root(e.material) == FIRE]
    has_events = any(e.events_out for e in ems) or any('ParticleModuleEventReceiverSpawn' in e.classes for e in ems)
    dots_layer = any(re.match(r'L\d+_(Dots|Unit)', e.name or '') for e in ems if e.enabled)
    asym = fan_like(name) or skyrocket(name)
    gamemode = any(r['row'].startswith('跨年烟花3.0_窜天猴sku') for r in sys_rows[s])
    texsets = collections.Counter()
    for e in seqs:
        tp = tex_params(e.material)
        main = tuple(sorted(v for k, v in tp.items() if 'ramp' not in k.lower()))
        texsets[main] += 1
    shared_tex = any(n >= 2 for n in texsets.values())
    erecs = []
    for e in ems:
        rec = {'emitter': e.name, 'path': e.path, 'enabled': e.enabled, 'spawns': e.spawns, 'lods': len(e.lods),
               'gpu': e.typedata == 'ParticleModuleTypeDataGpu', 'typedata': e.typedata, 'material': (e.material or '').split('.')[-1],
               'materialRoot': (mat_root(e.material) or '').split('.')[-1], 'local': e.local,
               'align': e.align, 'uvflip': e.uvflip, 'particles': {'burst': e.burst_total, 'rateMax': e.rate_max}}
        # --- 3 朝向 ---
        axis_lock = 'ParticleModuleOrientationAxisLock' in e.classes
        is_seq = mat_root(e.material) == FIRE
        few = e.burst_total <= 2 and e.rate_max == 0
        same, aspect, size0, pivot = (None, None, None, (-0.5, -0.5))
        try:
            same, aspect, size0, pivot = size_info(e)
        except Exception as ex:
            rec['sizeError'] = str(ex)
        rec['size'] = {'start': size0, 'square': same, 'aspectYoverX': aspect, 'pivotInternal': [round(pivot[0], 4), round(pivot[1], 4)]}
        big = is_seq and few and e.align not in ('PSA_Velocity',) and not axis_lock and e.typedata in (None, 'ParticleModuleTypeDataGpu') \
            and (size0 and max(size0) >= 1500)
        if not e.enabled:
            a_plan, a_why = None, '发射器关着，不动'
        elif e.align == 'PSA_Velocity':
            a_plan, a_why = None, 'Velocity 对齐（尾巴 / 火花），不改'
        elif axis_lock:
            a_plan, a_why = None, '有 Orientation Axis Lock（扇束 / 尾缀柱），不改'
        elif e.typedata == 'ParticleModuleTypeDataRibbon':
            a_plan, a_why = None, 'Ribbon，不改'
        elif not is_seq:
            a_plan, a_why = None, '不是序列材质（光点 / 闪光 / 火花），不改'
        elif not few:
            a_plan, a_why = None, '序列材质但一次出 %d 颗 / 速率 %.0f，不是「一两个大粒子」的大序列，不改' % (e.burst_total, e.rate_max)
        elif not big:
            a_plan, a_why = None, '序列但面片小（%s cm），不算大序列，不改' % size0
        elif e.align == 'PSA_FacingCameraPosition':
            a_plan, a_why = None, '已是 FacingCameraPosition'
        else:
            a_plan = 'PSA_FacingCameraPosition'
            a_why = '大序列 %s → FacingCameraPosition' % e.align
        if gamemode and a_plan:
            a_plan, a_why = None, '窜天猴 sku（玩法道具，不是演出），这批不动，问用户'
        if a_plan and same is False:
            a_plan = 'ask'
            a_why += '；横竖不同（Y/X 最大 %s）——FacingCameraPosition 只认 X（推断），改了会被压成方形，先问用户 / 编辑器确认' % aspect
            rec['needsXYCheck'] = True
        rec['alignPlan'], rec['alignWhy'] = a_plan, a_why
        rec['bigSequence'] = bool(big)
        # --- 4 翻转 ---
        round_dot = any((e.material or '').split('.')[-1].startswith(x) for x in ROUND)
        reasons = []
        if asym:
            reasons.append('扇 / 窜天猴：左右不对称或斜喷是设计')
        if has_events and (e.events_out or 'ParticleModuleEventReceiverSpawn' in e.classes or 'ParticleModuleLocationEmitter' in e.classes):
            reasons.append('有事件生成 / 接收或跟随别的发射器出生')
        if is_seq and len(seqs) >= 2:
            reasons.append('同一系统 %d 个序列层要对准（同一模拟 / 多层花型）' % len(seqs))
        if is_seq and dots_layer:
            reasons.append('同一模拟拆出的光点 / 单束层要对准')
        if not is_seq and dots_layer and re.match(r'L\d+_(Dots|Unit)', e.name or ''):
            reasons.append('光点 / 单束层和序列同一模拟')
        if is_seq and shared_tex:
            reasons.append('和同系统别的发射器共用同一张序列')
        if e.typedata == 'ParticleModuleTypeDataRibbon':
            reasons.append('Ribbon（UV 翻转不适用）')
        if is_seq and abs(pivot[0] + 0.5) > 0.01:
            reasons.append('Pivot 横向不在中心（%.3f），翻转会把画面挪位' % (pivot[0] + 0.5))
        if gamemode:
            u_plan, u_why = None, '窜天猴 sku（玩法道具，不是演出）这批不动（现 %s），问用户' % e.uvflip
        elif not e.enabled:
            u_plan, u_why = None, '发射器关着，不动'
        elif e.typedata == 'ParticleModuleTypeDataRibbon':
            u_plan, u_why = None, 'Ribbon，不动'
        elif reasons:
            want = 'None'
            if e.uvflip == 'None':
                u_plan, u_why = None, '保持 None：' + '；'.join(reasons)
            else:
                u_plan, u_why = 'ask', '现在是手设的 %s，按口径应 None（%s）→ 问用户，默认不动' % (e.uvflip, '；'.join(reasons))
        else:
            if e.uvflip == 'RandomFlipUOnly':
                u_plan, u_why = None, '已是 RandomFlipUOnly'
            else:
                u_plan = 'RandomFlipUOnly'
                u_why = '没有要对准的层 → RandomFlipUOnly（现 %s）' % e.uvflip
                if e.uvflip not in (None, 'None'):
                    u_plan = 'ask'
                    u_why += '；现在是手设的 %s（V 也翻 = 上下颠倒），按口径改 U Only → 问用户，推荐按口径改' % e.uvflip
                    rec['changesHandSet'] = True
                if round_dot:
                    u_why += '；圆点 / 光晕贴图，翻了看不出'
                if rec['gpu']:
                    u_why += '；GPU：引擎着色器支持 UV 翻转（ParticleGPUSpriteVertexFactory），实播未看'
        rec['uvPlan'], rec['uvWhy'] = u_plan, u_why
        erecs.append(rec)
    # --- 2 包围盒 ---
    sr, tilt, why, used = scale_tilt(s)
    bb = system_bounds(ctx, s, sr, tilt)
    sp = ctx.P(s)
    cur_box = sp.get('FixedRelativeBoundingBox') or {}
    cur = {'fixed': sp.get('bUseFixedRelativeBoundingBox'),
           'min': [cur_box.get('Min', {}).get(a) for a in 'XYZ'], 'max': [cur_box.get('Max', {}).get(a) for a in 'XYZ']}
    approx = sorted({n for em in bb['emitters'] for n in em.get('notes', [])
                     if any(k in n for k in ('矢量场', '风', '不死', '不认识', '读不到', '非线性', '没算出'))})
    unsup = sorted({u for em in bb['emitters'] for u in em.get('unsupported', [])})
    if gamemode:
        b_plan, b_why = 'ask', ('窜天猴 sku（ResourceFX 类型 GAMEMODE，玩法道具）：很可能挂在会飞的物体上，世界空间的拖尾粒子会留在身后，'
                                '按静止算的盒（约 %s m）比作者现在手设的还小，改了可能被提前剔掉 → 这批不动，问用户' %
                                (' / '.join('%d..%d' % (round(a / 100), round(b / 100)) for a, b in bb['final']) if bb['final'] else '—'))
    elif bb['final'] is None:
        b_plan, b_why = None, '没有会出粒子的发射器，算不出'
    else:
        b_plan = {'bUseFixedRelativeBoundingBox': True, 'min': [b[0] for b in bb['final']], 'max': [b[1] for b in bb['final']]}
        b_why = '按模块算（%s；缩放 %.2f–%.2f，倾斜 ±%g°），+10%% 余量' % (why, sr[0], sr[1], tilt)
        if unsup:
            b_why += '；有没建模的模块 %s' % unsup
        if approx:
            b_why += '；近似：' + '；'.join(approx)
    disabled = [em['emitter'] for em in bb['emitters'] if em.get('skipped') == '关着']
    systems.append({
        'system': s, 'name': name, 'rows': sys_rows[s], 'platform': 'mobile' if s.startswith('/Game/Effects/') else 'pc', 'gamemode': gamemode,
        'baker': baker_of(s), 'usedInShow': used, 'emitters': erecs,
        'bounds': {'current': cur, 'plan': b_plan, 'why': b_why, 'raw': bb['raw'], 'scaleRange': sr, 'tiltDeg': tilt,
                   'perEmitter': [{k: em.get(k) for k in ('emitter', 'enabled', 'spawns', 'local', 'gpu', 'box', 'skipped', 'source', 'unsupported', 'notes')} for em in bb['emitters']],
                   'disabledNotCounted': disabled, 'approx': approx, 'unsupported': unsup},
        'referencedBy': REFS['systems'].get(s, []), 'tableRows': REFS['tableRows'].get(s, []),
    })

json.dump({'systems': systems, 'materials': materials, 'show': show_file.split('/')[-1].split('\\')[-1],
           'fireBase': FIRE}, open('analysis.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# 简报
cnt = collections.Counter()
for s in systems:
    if s['bounds']['plan']:
        cnt['bounds'] += 1
    for e in s['emitters']:
        if e['alignPlan']:
            cnt['align'] += 1
        if e.get('needsXYCheck'):
            cnt['xy'] += 1
        if e['uvPlan'] == 'RandomFlipUOnly':
            cnt['uv'] += 1
        if e['uvPlan'] == 'ask':
            cnt['uvask'] += 1
for m in materials:
    cnt['mat_' + str(m['plan'])] += 1
print(dict(cnt))
