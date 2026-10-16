# 用干跑的同一个模块模型（采集/bounds.py）预测：UE 每帧动态包围盒（只算 CPU 发射器；GPU 发射器在动态盒里只占组件原点一点）
# 在给定情形（缩放 s、Pitch p、Roll r）下应该落在哪个世界范围里（相对组件原点，cm）。
# UE 动态盒 = 粒子中心位置 ± 粒子尺寸（按最大边长当立方体往外扩），所以这里用「纯位置盒 ± 最大边长」。
# 实测动态盒超出这个预测 = 模型低估了运动（速度 / 阻力 / 重力 / 矢量场），要查；在预测里面 = 模型和 UE 对得上。
import json, gzip, os, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), '采集'))
from cascade_model import Ctx, ref, rot_matrix, local_to_world
from bounds import EmitterModel, INF

raw = json.load(gzip.open(os.path.join(os.path.dirname(HERE), '采集', 'raw_crawl.json.gz'), 'rt', encoding='utf-8'))
ctx = Ctx(raw['objects'])


def aabb_world(Rm, s, box):
    cs = []
    for x in box[0]:
        for y in box[1]:
            for z in box[2]:
                cs.append(local_to_world(Rm, (x * s, y * s, z * s)))
    return [(min(c[i] for c in cs), max(c[i] for c in cs)) for i in range(3)]


def predict(sys_path, cases):
    sp = ctx.P(sys_path)
    ems = [EmitterModel(ctx, sys_path, ref(e)) for e in sp.get('Emitters', []) if ref(e)]
    order = sorted(ems, key=lambda e: 1 if any(c in e.classes for c in ('ParticleModuleLocationEmitter', 'ParticleModuleEventReceiverSpawn')) or e.typedata == 'ParticleModuleTypeDataRibbon' else 0)
    mats = [(s, rot_matrix(p, 0, r)) for s, p, r in cases]
    pos_cache = {}
    pred = [[(INF, -INF)] * 3 for _ in cases]
    for e in order:
        if not e.enabled or not e.spawns:
            continue
        src = None
        for c, p, _ in e.modlist[0]:
            if c == 'ParticleModuleLocationEmitter':
                src = p.get('EmitterName')
            elif c == 'ParticleModuleEventReceiverSpawn' and not p.get('bUsePSysLocation'):
                gen = [x for x in ems if p.get('EventName') in x.events_out]
                src = gen[0].name if gen else None
            elif c == 'ParticleModuleTrailSource':
                src = p.get('SourceName')
        per_case_pb = [None] * len(cases)
        szmax = 0.0
        for ms in e.modlist:
            P = e.params(ms)
            T0, T1 = P['T']
            for T in sorted(set([T0, (T0 + T1) / 2, T1])):
                ser = e.series(P, T)
                szmax = max(szmax, max(row['sz'] for row in ser))
                for ci, (s, Rm) in enumerate(mats):
                    sb = pos_cache.get((src, ci)) if src else None
                    for unscaled in ((False, True) if not e.local else (False,)):
                        _, pb = e.case_box(P, ser, s, Rm, unscaled, sb)
                        cur = per_case_pb[ci]
                        per_case_pb[ci] = pb if cur is None else [(min(cur[i][0], pb[i][0]), max(cur[i][1], pb[i][1])) for i in range(3)]
        for ci, (s, Rm) in enumerate(mats):
            pb = per_case_pb[ci]
            if pb is None:
                continue
            old = pos_cache.get((e.name, ci))
            pos_cache[(e.name, ci)] = pb if not old else [(min(old[i][0], pb[i][0]), max(old[i][1], pb[i][1])) for i in range(3)]
            if e.typedata == 'ParticleModuleTypeDataGpu':
                continue
            w = aabb_world(Rm, s, pb)
            pad = szmax * s
            pred[ci] = [(min(pred[ci][i][0], w[i][0] - pad), max(pred[ci][i][1], w[i][1] + pad)) for i in range(3)]
    return [None if p[0][0] == INF else p for p in pred]


if __name__ == '__main__':
    cfg = json.load(open(os.path.join(HERE, 'measure_cfg.json'), encoding='utf-8'))
    only = set(sys.argv[1:])
    out = []
    for x in cfg:
        if only and x['name'] not in only:
            continue
        lo, hi = x['scale']
        t = x['tilt'] or 0
        angs = [(0, 0)] + ([(t, 0), (-t, 0), (0, t), (0, -t)] if t else [])
        cases = [(s, p, r) for s in (lo, hi) for p, r in angs]
        pr = predict(x['system'], cases)
        plan = [(a, b) for a, b in zip(x['min'], x['max'])]
        for (s, p, r), pd in zip(cases, pr):
            out.append({'name': x['name'], 'system': x['system'], 's': s, 'pitch': p, 'roll': r, 'life': x['life'],
                        'planWorld': aabb_world(rot_matrix(p, 0, r), s, plan), 'predUEDyn': pd})
    json.dump(out, open(os.path.join(HERE, 'measure_cases.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(len(out), 'cases')
