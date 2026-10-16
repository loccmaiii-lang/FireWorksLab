# 从 干跑.json + 原始读回（采集/raw_crawl.json.gz）生成第 2 步的写入清单 targets.json。
# 用户 10-16 05:18「可以改」，D1–D5 按干跑推荐：
#   D2 金锦冠扇 4 个材质实例改，另外 3 个共用实例不动；D3 窜天猴 sku 6 个系统不动；
#   D4 金裂星（Combo_HD）L1_Main RandomFlipUV → RandomFlipUOnly，其余 14 个手设翻转保留。
import json, gzip, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
dry = json.load(open(os.path.join(ROOT, '干跑.json'), encoding='utf-8'))
raw = json.load(gzip.open(os.path.join(ROOT, '采集', 'raw_crawl.json.gz'), 'rt', encoding='utf-8'))
O = raw['objects']
P = lambda p: (O.get(p) or {}).get('properties', {})
ref = lambda v: v.get('path') if isinstance(v, dict) else None

D2_YES = {'MI_EFX_FireWorks_FanGold_Central_01_HD', 'MI_EFX_FireWorks_FanGold_Middle_01_HD',
          'MI_EFX_FireWorks_FanGold_OuterLeft_01_HD', 'MI_EFX_FireWorks_FanGold_OuterRight_01_HD'}
D4_YES = {('P_EFX_FireWorks_Combo_HD', 'L1_Main')}

systems = []
for s in dry['systems']:
    if not s['_change']:
        continue
    sp = P(s['system'])
    bb = s['bounds']['plan']
    rec = {'system': s['system'], 'name': s['name'], 'platform': s['platform'],
           'before': {'bUseFixedRelativeBoundingBox': sp.get('bUseFixedRelativeBoundingBox'),
                      'FixedRelativeBoundingBox': sp.get('FixedRelativeBoundingBox')},
           'bounds': {'min': bb['min'], 'max': bb['max']}, 'emitters': []}
    emitter_paths = [ref(e) for e in sp.get('Emitters', [])]
    for e in s['emitters']:
        align = e['alignPlan'] if e.get('alignPlan') == 'PSA_FacingCameraPosition' else None
        uv = None
        if e.get('uvPlan') == 'RandomFlipUOnly':
            uv = 'RandomFlipUOnly'
        elif e.get('uvPlan') == 'ask' and (s['name'], e['emitter']) in D4_YES:
            uv = 'RandomFlipUOnly'
        if not align and not uv:
            continue
        ep = P(e['path'])
        reqs = []
        for li, l in enumerate(ep.get('LODLevels', [])):
            rq = ref(P(ref(l)).get('RequiredModule'))
            rp = P(rq)
            reqs.append({'lod': li, 'required': rq, 'before': {'ScreenAlignment': rp.get('ScreenAlignment'), 'UVFlippingMode': rp.get('UVFlippingMode')}})
        rec['emitters'].append({'emitter': e['emitter'], 'index': emitter_paths.index(e['path']), 'path': e['path'],
                                'set': {k: v for k, v in (('ScreenAlignment', align), ('UVFlippingMode', uv)) if v},
                                'lods': reqs})
    systems.append(rec)

materials = []
for m in dry['materials']:
    if m['plan'] == 0.98 or (m['plan'] == 'ask' and m['name'] in D2_YES):
        mp = P(m['material'])
        over = [x for x in mp.get('ScalarParameterValues', []) if (x.get('ParameterInfo') or {}).get('Name') == 'EmissiveDissolve']
        materials.append({'material': m['material'], 'name': m['name'], 'root': m['root'], 'beforeValue': m['current'],
                          'beforeSource': m['currentSource'], 'beforeOverride': over, 'set': {'EmissiveDissolve': 0.98},
                          'usedOutsideScope': m.get('usedOutsideScope', [])})

out = {'format': 'df.resource-spec-targets/1', 'note': '用户 10-16 05:18「可以改」；D1–D5 按干跑推荐', 'systems': systems, 'materials': materials,
       'counts': {'systems': len(systems), 'materials': len(materials),
                  'align': sum(1 for s in systems for e in s['emitters'] if 'ScreenAlignment' in e['set']),
                  'uv': sum(1 for s in systems for e in s['emitters'] if 'UVFlippingMode' in e['set']),
                  'requiredModules': sum(len(e['lods']) for s in systems for e in s['emitters'])}}
json.dump(out, open(os.path.join(HERE, 'targets.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(out['counts'], ensure_ascii=False))
