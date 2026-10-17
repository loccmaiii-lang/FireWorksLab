# 只读分析（不连 UE）：用 26 的模块模型（../采集/bounds.py）在 10-17 重读的模块值上算几个系统的盒，和现在的固定盒比。
# 模块模型只是下限参考：26 在 10-16 实测过 UE 的 CPU 动态盒会比它大（爆裂星 +35%），所以「模型都装不下」= 现盒一定偏小。
# 网格粒子（金垂柳 4.0）bounds.py 不支持，单独按静态网格包围算：任意朝向下顶点离发射点最远 ≤ (|Origin| + SphereRadius) × Size。
# 用法：python bounds_some.py → 盒子复核.json
import json, math, sys, pathlib
here = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(here.parent / '采集'))
from cascade_model import Ctx  # noqa: E402
from bounds import system_bounds  # noqa: E402

import gzip
raw = json.load(gzip.open(here / 'raw_some.json.gz', 'rt', encoding='utf8'))
now = json.load(open(sorted(here.glob('现状_*Z.json'))[-1], encoding='utf8'))
cur = {s['system']: s for s in now['systems']}
ctx = Ctx(raw['objects'])
# 缩放 / 倾斜前提照 26 的 D5（用户 10-16 05:18 按推荐）：扇 ±50°、其余不倾斜，缩放 0.8–1.6
CASES = {
    'P_EFX_FireWorks_FanSilver_01_HD': ((0.8, 1.6), 50.0),
    'P_EFX_FireWorks_Comet_Layers_HD': ((0.8, 1.6), 50.0),
    'P_EFX_FireWorks_Comet_Layers_M': ((0.8, 1.6), 50.0),
    'P_EFX_FireWorks_Silver_Layers_S_HD': ((0.8, 1.6), 50.0),
    'P_EFX_FireWorks_RiseTrail_Hero_HD': ((0.8, 1.6), 0.0),
    'P_EFX_FireWorks_RiseTrail_Hero_M': ((0.8, 1.6), 0.0),
    'P_EFX_FireWorks_RiseTrail_L_HD': ((0.8, 1.6), 0.0),
    'P_EFX_FireWork_PrismWheels_HD': ((0.8, 1.6), 0.0),
}
out = {'note': '模块模型（下限参考），单位 cm，组件本地；cur = UE 里现在的固定盒', 'systems': []}


def covers(box, need):
    return all(box[i] <= need[i][0] and box[i + 3] >= need[i][1] for i in range(3))


for sp in raw['systems']:
    name = sp.split('.')[-1]
    c = cur.get(sp, {})
    box = c.get('box')
    rec = {'name': name, 'cur': box}
    if name in CASES:
        sr, tilt = CASES[name]
        r = system_bounds(ctx, sp, sr, tilt, margin=0.10)
        rec.update(model_raw=r['raw'], model_plus10=r['final'], s_range=sr, tilt=tilt,
                   unsupported=sorted({u for e in r['emitters'] for u in (e.get('unsupported') or [])}),
                   emitters=[{'emitter': e['emitter'], 'gpu': e.get('gpu'), 'box': e.get('box'), 'skipped': e.get('skipped'), 'notes': e.get('notes')} for e in r['emitters']])
        if r['raw'] and box:
            rec['curCoversModelRaw'] = covers(box, r['raw'])
            rec['curCoversModelPlus10'] = covers(box, r['final'])
    else:
        # 网格粒子：找 TypeDataMesh + Size
        ems = []
        for e in ctx.P(sp).get('Emitters', []):
            ep = ctx.P(e['path'])
            lod = ctx.P(ep['LODLevels'][0]['path'])
            td = lod.get('TypeDataModule')
            mods = [raw['objects'][m['path']] for m in lod.get('Modules', [])]
            size = [m for m in mods if m['class'].endswith('ParticleModuleSize')]
            smax = size[0]['properties']['StartSize']['MaxValueVec']['X'] if size else None
            if td and td['class'].endswith('TypeDataMesh'):
                mesh = raw['objects'][td['path']]['properties']['Mesh']['path']
                eb = raw['meshes'][mesh]['ExtendedBounds']
                o = eb['Origin']; ext = eb['BoxExtent']; R = eb['SphereRadius']
                olen = math.sqrt(o['X'] ** 2 + o['Y'] ** 2 + o['Z'] ** 2)
                axis_max = max(abs(o['X']) + ext['X'], abs(o['Y']) + ext['Y'], abs(o['Z']) + ext['Z'])
                ems.append({'emitter': ep['EmitterName'], 'mesh': mesh.split('.')[-1], 'sizeMax': smax,
                            'radiusUpper_cm': round((olen + R) * smax), 'radiusLower_cm': round(axis_max * smax),
                            'why': '任意朝向（MeshFaceCameraWithRoll + 随机 Roll）顶点离发射点 ≤ (|Origin|+SphereRadius)×Size；下限 = 包围盒最远轴向'})
            else:
                ems.append({'emitter': ep['EmitterName'], 'note': '非网格，见 L2_Dots 手算'})
        rec['mesh'] = ems
    out['systems'].append(rec)
    print(name, 'cur', box, '| model+10%', rec.get('model_plus10'), '| covers raw/+10%', rec.get('curCoversModelRaw'), rec.get('curCoversModelPlus10'), '| mesh', [(m.get('emitter'), m.get('radiusLower_cm'), m.get('radiusUpper_cm')) for m in rec.get('mesh', [])], '| unsupported', rec.get('unsupported'))
# 金垂柳建议盒：网格（任意朝向半径上限，三轴都取）∪ GPU 金点（模块模型），再按 26 的口径（中心不动、半边 ×1.1、10 cm 向外取整）；
# 出生绕世界 Z 随机角（金垂柳 4.0 待做）→ X / Y 取对称同值。
def plus10(lo, hi):
    c = (lo + hi) / 2
    h = (hi - lo) / 2 * 1.1
    return (math.floor((c - h) / 10) * 10, math.ceil((c + h) / 10) * 10)


for rec in out['systems']:
    if not rec['name'].startswith('P_EFX_FireWorks_GoldKamuro'):
        continue
    R = max(m.get('radiusUpper_cm') or 0 for m in rec['mesh'])
    raw_u = [(-R, R)] * 3
    sp = [s for s in raw['systems'] if s.endswith(rec['name'])][0]
    dots = system_bounds(ctx, sp, (0.8, 1.6), 0.0)
    for e in dots['emitters']:
        if e.get('gpu') and e.get('box'):
            raw_u = [(min(raw_u[i][0], e['box'][i][0]), max(raw_u[i][1], e['box'][i][1])) for i in range(3)]
            rec['dotsBox'] = e['box']
    xy = max(abs(v) for v in raw_u[0] + raw_u[1])
    raw_u = [(-xy, xy), (-xy, xy), raw_u[2]]
    rec['suggest'] = [plus10(*a) for a in raw_u]
    rec['suggestWhy'] = '网格任意朝向半径上限 ∪ GPU 金点模块模型；X/Y 对称；+10%'
    print(rec['name'], '建议盒 cm', rec['suggest'])
json.dump(out, open(here / '盒子复核.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
