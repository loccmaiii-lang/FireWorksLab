"""标定两层 Ramp 的色相端点（线性空间）：让引擎公式合成后的色度（减天空底色）= 实拍。
橙层：0.5–1.1 s 三个带的 G/R、B/R；金层：1.9–2.1 s 中、外带（橙层色相固定）。只改颜色，不改模拟。
结果写回 yinxian.RAMP（打印出来，手动确认后写进代码）。"""
import sys, os, json, numpy as np
from scipy.optimize import minimize
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import yinxian as Y, 考卷 as K
HERE = os.path.dirname(os.path.abspath(__file__))
ref = json.load(open(os.path.join(HERE, '考卷', '参考指标.json')))['时刻']
P = json.load(open(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '定稿参数.json')))
W = 900; ppm = P.get('_ppm', 3.0); sh = Y.Shell(P)
TO = [0.5, 0.7, 0.9, 1.1]; TG = [1.9, 2.0, 2.1]
L = {t: Y.render(sh, t, 'below', W, W, ppm, W / 2, W / 2) for t in TO + TG + [1.0]}
Rr = {}
def expo_for():
    O, Gm = L[1.0]; target = ref['1.0']['线亮度中位']; lo, hi = 1e-3, 100.0
    for _ in range(14):
        e = (lo * hi) ** 0.5; im = Y.compose(O, Gm, e, 1.0); R = Rr.setdefault(1.0, K.radius(im, W / 2, W / 2, W / 2 - 2))
        v = K.measure(im, W / 2, W / 2, R)['线亮度中位'] or 0
        lo, hi = (e, hi) if v < target else (lo, e)
    return (lo * hi) ** 0.5
EXPO = {}
def err(layer, times, bands):
    e = EXPO.get(layer) or EXPO.setdefault(layer, expo_for()) if layer == 'G' else expo_for(); s = 0.0
    for t in times:
        im = Y.compose(*L[t], e, t); R = Rr.setdefault(t, K.radius(im, W / 2, W / 2, W / 2 - 2)); m = K.measure(im, W / 2, W / 2, R)
        for b in bands:
            a, r = m['颜色'][b], ref[str(t)]['颜色'][b]
            if a is None or r is None: s += 1; continue
            s += (a['G/R'] - r['G/R']) ** 2 + (a['B/R'] - r['B/R']) ** 2
    return s
def setp(layer, x):
    g0, b0, g1, b1 = np.clip(x, 0.0, 1.0)
    Y.RAMP[layer] = {'lo': [1.0, float(g0), float(b0)], 'hi': [1.0, float(g1), float(b1)]}
for layer, times, bands in [x for x in (('O', TO, ('内', '中', '外')), ('G', TG, ('中', '外'))) if x[0] in os.environ.get('LAYERS', 'OG')]:
    x0 = np.array(Y.RAMP[layer]['lo'][1:] + Y.RAMP[layer]['hi'][1:])
    f = lambda x: (setp(layer, x), err(layer, times, bands))[1]
    r = minimize(f, x0, method='Nelder-Mead', options={"maxiter": 70, 'xatol': 2e-3, 'fatol': 1e-5})
    setp(layer, r.x); print(layer, '误差', round(r.fun, 5), Y.RAMP[layer], flush=True)
json.dump(Y.RAMP, open(os.path.join(HERE, '考卷', 'Ramp标定.json'), 'w'), ensure_ascii=False, indent=1)
