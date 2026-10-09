# -*- coding: utf-8 -*-
"""在 光感模拟.py 的链路上搜：光晕形状（高斯 / 多层柔光）× Ramp 低端（暗红 / 饱和红）× 编码（线性 / γ2.2）× 曝光、占比、半径。
目标 = 万彩千轮 C 剖面；另罚「8 位最低一档在显示上的亮度」（> 0.04 就会看到一圈圈色阶）。→ 光感搜索.json"""
import itertools, json, math, os
import numpy as np
import importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('s', os.path.join(HERE, '光感模拟.py')); S = importlib.util.module_from_spec(spec); spec.loader.exec_module(S)
tgt = json.load(open(os.path.join(HERE, 'Blender对照.json'), encoding='utf-8'))['万彩千轮C 玫红']
RAMPS = {
  '暗红起（FC8R）': ('#000000', '#3a0608', '#ff1416', '#ffc8cc'),
  '黑起饱和红': ('#000000', '#d80a0a', '#ff2a18', '#ffe4dc'),
  '黑起亮饱和红': ('#000000', '#ff1010', '#ff4028', '#fff0ea'),
}
def step_vis(ramp, G):
    s = 1 / 255; v = s
    out = S.K.ramp(np.array([v]), [S.hl(c) for c in ramp])[0] * v * 4
    return float(S.display(out).max())
rows = []
for (rn, ramp), G, shape, size, hf, hR, expo in itertools.product(RAMPS.items(), [1.0, 2.2], ['gauss', 'multi'], [0.8, 1.2], [0.6, 0.8], [1.2, 1.8, 2.6], [0.6, 1.0, 1.6, 2.6, 4.0]):
    c = dict(size=size, I=3, hf=hf, hR=hR, shape=shape, layers=S.MULTI, ramp=ramp, expo=expo, G=G)
    img, m = S.run(c, W=160)
    if not m: continue
    sv = step_vis(ramp, G); sc = S.score(m, tgt) + (max(0, sv - 0.04) / 0.02) ** 2
    rows.append(dict(score=round(sc, 3), ramp=rn, G=G, shape=shape, size=size, hf=hf, hR=hR, expo=expo, 最低档显示=round(sv, 3),
                     **{k: round(m[k], 3) for k in ('r50', 'vis2', 'vis4', 'vis8', 'sat2', 'sat4', 'val1') if k in m}))
rows.sort(key=lambda r: r['score'])
best = {}
for r in rows:
    k = (r['ramp'], r['G'], r['shape'])
    if k not in best: best[k] = r
json.dump(dict(目标=tgt, 各组合最佳=list(best.values()), 前10=rows[:10]), open(os.path.join(HERE, '光感搜索.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for r in sorted(best.values(), key=lambda r: r['score']): print(r)
