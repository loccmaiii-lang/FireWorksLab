"""对尾缀B 的 V6 参数逼近（Nelder-Mead，对数尺度）：可见长度、过曝段、宽度、偏暖，五个时刻。只调看得见的量，弹道 / 物理不动。"""
import os, sys, json, numpy as np
from scipy.optimize import minimize
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import 对照 as C
KEYS = {'boost': (0.2, 6), 'boost_u': (0.05, 0.5), 'tc': (0.2, 1.5), 'T0': (2500, 3600), 'head_col': (1, 15), 'life_k': (0.8, 2.0), 'lat_k': (0.3, 1.2)}
x0 = {'boost': 2.5, 'boost_u': 0.2, 'tc': 0.7, 'T0': 3300, 'head_col': 8.0, 'life_k': 1.35, 'lat_k': 0.55}
FIX = {'tw': 0.15}
log = []
def unpack(z): return {k: float(np.clip(np.exp(v), *KEYS[k])) for k, v in zip(KEYS, z)}
def loss(z):
    o = {**FIX, **unpack(z)}; r = C.run('/tmp/_fit', o, scales=('native',), save=False)['native']['rows']
    e = 0.0
    for x in r:
        a, b = x['实拍'], x['模拟']
        if not b: e += 10; continue
        e += ((b['len_m'] - a['len_m']) / 30) ** 2 + ((b['sat_m'] - a['sat_m']) / 15) ** 2 + ((b['width_m'] - a['width_m']) / 0.15) ** 2 + ((b['warm'] - a['warm']) / 0.06) ** 2
    log.append((e, o)); print(round(e, 2), {k: round(v, 3) for k, v in o.items()}, flush=True); return e
z0 = np.log([x0[k] for k in KEYS])
r = minimize(loss, z0, method='Nelder-Mead', options={'maxfev': int(sys.argv[1]) if len(sys.argv) > 1 else 45, 'xatol': 0.02, 'fatol': 0.05})
best = min(log, key=lambda x: x[0]); json.dump({'最好': best[1], '损失': best[0]}, open(os.path.join(HERE, '对照', '拟合结果.json'), 'w'), ensure_ascii=False, indent=1)
print('最好', best)
