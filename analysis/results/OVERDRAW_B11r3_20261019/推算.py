#!/usr/bin/env python3
"""overdraw 推算（烟花编排（22）-本机，2026-10-19）：按封板导演表 + T22 读回的面片大小 / 寿命 + 用户机位，算每个时刻画面上半透明面片叠了几层。

不是 UE 的 Shader Complexity 实测（编辑器视口不吃控制台 viewmode，见 看法.md）。做法：
- 机位：overdraw 实测那次读回的视口位置 / 朝向；视场角按编辑器默认水平 90°（没读到，推断）；画面 2199×1140（实测截图尺寸）。
- 点位：P0–P8 用 B09 实放读回的世界坐标；B 点取相邻两个 P 点的中点；F 点按设计坐标放在 P4 的局部坐标里（沿 P3→P5、朝相机），比 P 低 100 m（设计值）。
- 每朵花的每个发射器：LOD0 开着的，在 [开花 + 延迟, 开花 + 延迟 + 寿命] 内算一张正方形、朝相机的面片，边长 = 读回面片（已含表 EffectScale）× 导演缩放；Zoom 取景按最大面片算（偏大）。尾缀（*Trail*）不算。
- 栅格 440×228，统计每格叠几层；同时给每一刻「面片面积之和 ÷ 画面面积」。
用法：python -X utf8 -I analysis/results/OVERDRAW_B11r3_20261019/推算.py <一张表> <标定.json> <实测运行 json> <输出目录>
"""
import json
import math
import re
import sys
from pathlib import Path

import numpy as np

table, calib, runj, outd = sys.argv[1:5]
ROOT = Path(__file__).resolve().parents[3]
OUT = Path(outd)
OUT.mkdir(parents=True, exist_ok=True)
d = json.loads(Path(table).read_text(encoding='utf-8'))
cal = json.loads(Path(calib).read_text(encoding='utf-8'))
run = json.loads(Path(runj).read_text(encoding='utf-8'))
W, H, GW, GH = 2199, 1140, 440, 228
FOV = math.radians(90)

# —— 机位 ——
cam = run['before']['camera']
num = lambda s, k: float(re.search(k + r'=([-\d.]+)', s).group(1))
C = np.array([num(cam['out_CameraLocation'], 'X'), num(cam['out_CameraLocation'], 'Y'), num(cam['out_CameraLocation'], 'Z')]) / 100
pitch, yaw = math.radians(num(cam['out_CameraRotation'], 'Pitch')), math.radians(num(cam['out_CameraRotation'], 'Yaw'))
fwd = np.array([math.cos(pitch) * math.cos(yaw), math.cos(pitch) * math.sin(yaw), math.sin(pitch)])
right = np.array([-math.sin(yaw), math.cos(yaw), 0.0])
up = np.cross(right, fwd) * -1 if np.cross(right, fwd)[2] < 0 else np.cross(right, fwd)

# —— 点位：设计坐标 → 世界 ——
real = {p['pointId']: np.array([p['location']['X'], p['location']['Y'], p['location']['Z']]) / 100 for p in json.loads((ROOT / 'analysis/results/B09_DIRECTOR_20261017/实际点位.json').read_text(encoding='utf-8'))['points']}
dfshow = next(Path(table).parent.glob('NewYearFireWorks_v01-B11修订3*.dfshow'))
design = {p['id']: p for p in json.loads(dfshow.read_text(encoding='utf-8'))['payload']['doc']['points']}
ids = [f'P{i}' for i in range(9)]
a = np.array([complex(design[i]['x'], design[i]['y']) for i in ids])
b = np.array([complex(real[i][0], real[i][1]) for i in ids])
A = np.vstack([a, np.ones_like(a)]).T
(sr, tr), *_ = np.linalg.lstsq(A, b, rcond=None)
fit_err = float(np.abs(A @ np.array([sr, tr]) - b).max())
zP = float(np.mean([real[i][2] for i in ids]))
world = {k: real[k] for k in ids}                                  # P 点用实测世界坐标
for i in range(8):                                                 # B 点在相邻两个 P 点中间（设计也是）
    world[f'B{i}'] = (real[f'P{i}'] + real[f'P{i + 1}']) / 2
ex = (real['P5'] - real['P3']); ex[2] = 0; ex /= np.linalg.norm(ex)
ey = np.array([-ex[1], ex[0], 0.0])
if (C - real['P4']) @ ey < 0:
    ey = -ey                                                       # 设计 Y 朝观众 = 朝相机
for k, p in design.items():
    if k.startswith('F'):
        world[k] = real['P4'] + p['x'] * ex + p['y'] * ey + np.array([0, 0, p['z'] - 150])
grp_prefix = {'P': 'P', 'B': 'B', 'F': 'F'}

# —— 每个 ResourceId 的发射器面片 / 时间 ——
em_of = {}
for rid, rec in cal['rows']['pc'].items():
    s = rec.get('system')
    if not s or 'Trail' in rid:
        continue
    ems = []
    for e in s['emitters']:
        if not e['enabledLOD0'] or not e['planeM']:
            continue
        lt = e['lifetime']
        life = None
        if lt:
            life = lt.get('value') if lt['kind'] == 'const' else (lt.get('max') if lt['kind'] in ('uniform', 'range?') else None)
        if not life:
            life = e['duration'] or 0
        if life <= 0 or e['planeM'] < 1:
            continue
        ems.append((e['name'], e['planeM'], e['delay'] or 0, life))
    em_of[rid] = ems

Q = {'EQuality_VeryLow': 0, 'EQuality_Low': 1, 'EQuality_Medium': 2, 'EQuality_High': 3, 'EQuality_Epic': 4}
ok = lambda f, plat, tier: not f or (not (f.get('PlatformFlags') is not None and not (f['PlatformFlags'] & plat)) and not (f.get('MinQualityLevel') is not None and Q.get(f['MinQualityLevel'], 0) > tier))
subs = {s['TemplateName']: s for s in d['EffectSubTemplates']}
tpls = {t['TemplateName']: t for t in d['EffectTemplates']}


def planes(tier):
    out = []
    for g in d['EffectScheduleGroups']:
        for s in g['Slots']:
            if not ok(s.get('Filter'), 12, tier):
                continue
            t = tpls[s['TemplateName']]
            if not ok(t.get('Filter'), 12, tier):
                continue
            for e in t['Entries']:
                if not ok(e.get('Filter'), 12, tier) or not e.get('SubTemplateName'):
                    continue
                pt = world.get(f'{grp_prefix[g["GroupName"]]}{e.get("SlotIndex")}')
                if pt is None:
                    continue
                for x in subs[e['SubTemplateName']]['Entries']:
                    rid = x.get('FXResourceId')
                    if not ok(x.get('Filter'), 12, tier) or rid not in em_of:
                        continue
                    sc = (x.get('EffectScale') or {}).get('X', 1) * (e.get('EffectScale') or {}).get('X', 1)
                    off = np.array([(e.get('PositionOffset') or {}).get(k, 0) + (x.get('PositionOffset') or {}).get(k, 0) for k in 'XYZ']) / 100
                    t0 = s['StartTime'] + e['LocalTimeOffset'] + x['LocalTimeOffset']
                    for name, pm, dl, life in em_of[rid]:
                        out.append((t0 + dl, t0 + dl + life, pt + np.array([0, 0, off[2]]), pm * sc, rid, name))
    return out


def raster(active, min_size=0):
    g = np.zeros((GH, GW), dtype=np.int16)
    tanh = math.tan(FOV / 2)
    area = 0.0
    for (_, _, P, size, _, _) in active:
        if size < min_size:
            continue
        v = P - C
        z = float(v @ fwd)
        if z <= 1:
            continue
        x, y = float(v @ right) / z / tanh, float(v @ up) / z / tanh * (W / H)
        hs = size / 2 / z / tanh
        x0, x1 = int((x - hs + 1) / 2 * GW), int(math.ceil((x + hs + 1) / 2 * GW))
        y0, y1 = int((1 - (y + hs * W / H)) / 2 * GH), int(math.ceil((1 - (y - hs * W / H)) / 2 * GH))
        area += (x1 - x0) * (y1 - y0) / (GW * GH)
        x0, x1, y0, y1 = max(0, x0), min(GW, x1), max(0, y0), min(GH, y1)
        if x0 < x1 and y0 < y1:
            g[y0:y1, x0:x1] += 1
    return g, area


report = dict(method=__doc__.split('用法')[0].strip(), camera=dict(locationM=C.round(1).tolist(), pitchDeg=round(math.degrees(pitch), 2), yawDeg=round(math.degrees(yaw), 2), fovDeg='90（推断）'),
              pointFitMaxErrM=round(fit_err, 1), tiers={})
measured = {round(ev['moment'], 1): ev for ev in run['events']}
for tname, tier in (('高', 3), ('中', 2), ('低', 0)):
    ps = planes(tier)
    series = []
    for k in range(0, 2200):
        T = k / 10
        act = [p for p in ps if p[0] <= T < p[1]]
        if not act:
            series.append((T, 0, 0.0, 0.0, 0, 0))
            continue
        g, area = raster(act)
        gb, _ = raster(act, 60)                                   # 只算 ≥ 60 m 的大面片（花本体），扇 / 小平台的小片不算
        series.append((T, int(gb.max()), round(float((gb >= 4).mean() * 100), 2), round(area, 2), len(act), round(float(g.mean()), 3)))
    top = sorted(series, key=lambda s: (-s[1], -s[3]))[:12]   # s = (t, 大面片最多叠几层, 大面片 ≥4 层占画面 %, 面片面积和 ÷ 画面, 面片数, 全部面片平均叠层)
    top_area = sorted(series, key=lambda s: -s[3])[:12]
    report['tiers'][tname] = dict(planes=len(ps), maxLayers=max(s[1] for s in series), maxAreaFrac=max(s[3] for s in series),
                                 topByLayers=[dict(t=s[0], bigLayers=s[1], pctGe4=s[2], areaFrac=s[3], planes=s[4]) for s in top],
                                 topByArea=[dict(t=s[0], bigLayers=s[1], pctGe4=s[2], areaFrac=s[3], planes=s[4]) for s in top_area],
                                 atMeasured=[dict(t=m, bigLayers=next(s for s in series if abs(s[0] - round(m, 1)) < 0.05)[1], areaFrac=next(s for s in series if abs(s[0] - round(m, 1)) < 0.05)[3]) for m in sorted(measured)] if tname == '高' else None)
    np.save(OUT / f'序列_{tname}.npy', np.array([(s[0], s[1], s[2], s[3], s[4]) for s in series]))
(OUT / '推算.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
for t, v in report['tiers'].items():
    print(t, 'planes', v['planes'], 'maxBigLayers', v['maxLayers'], 'maxArea', v['maxAreaFrac'], 'top', [(x['t'], x['bigLayers'], x['areaFrac']) for x in v['topByLayers'][:6]], 'topArea', [(x['t'], x['areaFrac'], x['bigLayers']) for x in v['topByArea'][:6]])
print('fitErr', fit_err, 'camera', report['camera'])
print('measured', report['tiers']['高']['atMeasured'])
