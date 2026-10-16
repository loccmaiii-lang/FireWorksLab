# 给 UE 里的实测准备每个系统的参数：打算写的盒、缩放两端、倾斜、CPU 面片最大边长（UE 动态盒按它往外扩）、整个效果多长。
import json, gzip, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), '采集'))
from cascade_model import Ctx, ref
from bounds import EmitterModel
raw = json.load(gzip.open(os.path.join(os.path.dirname(HERE), '采集', 'raw_crawl.json.gz'), 'rt', encoding='utf-8'))
ctx = Ctx(raw['objects'])
dry = {s['name']: s for s in json.load(open(os.path.join(os.path.dirname(HERE), '干跑.json'), encoding='utf-8'))['systems']}
t = json.load(open(os.path.join(HERE, 'targets.json'), encoding='utf-8'))
out = []
for s in t['systems']:
    d = dry[s['name']]
    sp = ctx.P(s['system'])
    cpu_sz = 0.0
    cpu_any = False
    gpu_any = False
    life = 0.0
    for e in [EmitterModel(ctx, s['system'], ref(x)) for x in sp.get('Emitters', [])]:
        if not e.enabled or not e.spawns:
            continue
        rq = ctx.P(ref(ctx.P(ref(ctx.P(e.path)['LODLevels'][0])).get('RequiredModule')))
        P = e.params(e.modlist[0])
        loops = rq.get('EmitterLoops') or 1
        life = max(life, (rq.get('EmitterDelay') or 0) + (rq.get('EmitterDuration') or 0) * loops + P['T'][1])
        if e.typedata == 'ParticleModuleTypeDataGpu':
            gpu_any = True
            continue
        cpu_any = True
        for T in sorted(set(P['T'])):
            for row in e.series(P, T):
                cpu_sz = max(cpu_sz, row['sz'])
    out.append({'name': s['name'], 'system': s['system'], 'min': s['bounds']['min'], 'max': s['bounds']['max'],
                'scale': d['bounds']['scaleRange'], 'tilt': d['bounds']['tiltDeg'], 'cpuMaxSize': round(cpu_sz, 1),
                'cpu': cpu_any, 'gpu': gpu_any, 'life': round(min(life, 20.0), 2),
                'approx': bool(d['bounds']['approx'] or d['bounds']['unsupported'])})
json.dump(out, open(os.path.join(HERE, 'measure_cfg.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(out), 'systems; tilt', sum(1 for x in out if x['tilt']), '; gpu-only', [x['name'] for x in out if not x['cpu']], '; max life', max(x['life'] for x in out))
