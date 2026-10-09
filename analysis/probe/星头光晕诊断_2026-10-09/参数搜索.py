# -*- coding: utf-8 -*-
"""
在复现的烘焙器链路里搜：只用现有参数（P0：圆盘 / 渐变亮核 + 高斯光晕）和 幂律光晕核原型（P1：渐变亮核 + Moffat），
各自最多能把星头剖面拉到离实拍多近。目标 = 参考 A / B 中位：r10/r50≈1.9、r95/r50≈0.48、2·r50 饱和≈0.78、星间雾≈0。
尺度：用户截图 5.4 px/m；r50 目标 4.8 px（≈0.9 m，星头直径 : 尾宽 ≈ 2.4，参考A）。
"""
import itertools, json, math, os
import numpy as np
import importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('k', os.path.join(HERE, '核模型模拟.py')); K = importlib.util.module_from_spec(spec); spec.loader.exec_module(K)
P = K.prof
PPM = 5.4; W, H = 140, 48; SP = 14.8
TGT = dict(tail=2.5, shape=1.92, plateau=0.48, r50=4.8, sat2=0.78)
COMET = dict(size=0.6, I=2.2, hf=.22, hR=3, kind='disc', ramp=K.RAMP_COMET)

def evaluate(glow):
    heads = [(-SP / 2, 0.0), (SP / 2, 0.0)]
    E = K.shade(K.field(W, H, PPM, heads, glow, ss=2), 1.0, glow['ramp']) + K.shade(K.field(W, H, PPM, heads, COMET, ss=2), 1.0, K.RAMP_COMET)
    img = K.display(E)
    cx, cy = W / 2 + heads[1][0] * PPM - .5, H / 2 - .5
    r, Pp = P.radial(img, cx, cy, 22)
    sky = K.display(np.zeros(3))
    m = P.metrics(r, Pp, sky)
    L = P.lum(img); s0 = P.lum(sky[None])[0]
    m['haze'] = float((L[int(H / 2), int(W / 2)] - s0) / max(L[int(round(cy)), int(round(cx))] - s0, 1e-6))
    return m

def loss(m):
    if not all(np.isfinite([m['r50'], m['r10'], m['r95']])): return 1e9
    t = m['tail_r03_r50'] if m['tail_r03_r50'] is not None and np.isfinite(m['tail_r03_r50']) else 5.0
    return ((t - TGT['tail']) / .2) ** 2 + ((m['shape_r10_r50'] - TGT['shape']) / .1) ** 2 + ((m['plateau_rp_r50'] - TGT['plateau']) / .08) ** 2 + \
           ((m['r50'] - TGT['r50']) / 1.0) ** 2 + (m['haze'] / .01) ** 2 + ((m['sat_2r50'] - TGT['sat2']) / .12) ** 2

def search(space, build):
    best = []
    for vals in itertools.product(*space.values()):
        g = build(dict(zip(space.keys(), vals)))
        m = evaluate(g); l = loss(m)
        best.append((l, dict(zip(space.keys(), vals)), {k: m[k] for k in ('r50', 'shape_r10_r50', 'tail_r03_r50', 'plateau_rp_r50', 'sat_c', 'sat_2r50', 'haze')}))
    best.sort(key=lambda x: x[0])
    return best[:5]

def main():
    out = {}
    # P0：现有参数（headSize、coreProfile、haloFrac ≤ .85、haloR 1–8、headBright）
    sp0 = dict(kind=['disc', 'grad'], size=[0.8, 1.2, 1.6, 2.2], I=[1.5, 3, 6, 12], hf=[0.1, 0.2, 0.35, 0.5, 0.7], hR=[2, 3, 4.5, 6, 8])
    b0 = search(sp0, lambda v: dict(size=v['size'], I=v['I'], hf=v['hf'], hR=v['hR'], kind=v['kind'], ramp=K.RAMP_GLOW))
    # P1：幂律光晕（Moffat），α 用米
    sp1 = dict(size=[0.4, 0.7, 1.0], I=[3, 6, 12, 24, 48], hf=[0.08, 0.15, 0.25, 0.4], alpha=[0.25, 0.45, 0.7, 1.0, 1.4], beta=[1.5, 1.8, 2.2, 2.8])
    b1 = search(sp1, lambda v: dict(size=v['size'], I=v['I'], hf=v['hf'], kind='grad', halo='moffat', alpha=v['alpha'], beta=v['beta'], ramp=K.RAMP_GLOW))
    cur = evaluate(K.CFG['现状 FC7R'][0])
    out['目标'] = TGT
    out['现状'] = dict(loss=round(loss(cur), 2), m={k: round(cur[k], 3) for k in ('r50', 'shape_r10_r50', 'tail_r03_r50', 'plateau_rp_r50', 'sat_c', 'sat_2r50', 'haze')})
    out['P0_只改参数_前5'] = [dict(loss=round(l, 2), 参数=p, 指标={k: round(v, 3) for k, v in m.items()}) for l, p, m in b0]
    out['P1_幂律核_前5'] = [dict(loss=round(l, 2), 参数=p, 指标={k: round(v, 3) for k, v in m.items()}) for l, p, m in b1]
    json.dump(out, open(os.path.join(HERE, '参数搜索.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('现状', out['现状'])
    for k in ('P0_只改参数_前5', 'P1_幂律核_前5'):
        print(k)
        for x in out[k][:3]: print('  ', x)

if __name__ == '__main__':
    main()
