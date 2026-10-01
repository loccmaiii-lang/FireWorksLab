"""在考卷及格线上做有界随机搜索 + 坐标细化（只调少数连续量，范围限在物理上说得通的区间）。
损失 = 每条硬指标「超出容差的量 / 容差」之和。结果写 搜索结果.json。"""
import sys, os, json, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import 评分 as S, 考卷 as K
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = {"_ppm": 3.0, "speedJit": 8, "oRise": 0.1, "gTau": 0.5, "sparkLife": 1.2}
PREV = os.environ.get('PREVF') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '考卷', '搜索结果.json')
if os.environ.get('ONLY'):   # 只搜一部分量，其余用上次的最好值
    _b = json.load(open(PREV)); BASE = {**(_b['最好'] if '最好' in _b else _b)}
EXTRA = {'oLife': (0.3, 1.5), 'oLifeJit': (0.05, 0.4), 'oLifeSpeedExp': (0.0, 1.0), 'speedJit': (3, 20), 'oSpread': (0.0, 8.0), 'oProf0': (0.05, 1.0), 'oProf1': (0.1, 1.0), 'oProfTip': (0.2, 1.2), 'expoMul': (0.3, 3.0), 'oRise': (0.0, 0.35), 'oGrainT': (0.005, 0.08), 'oGrain': (0.0, 0.8), 'oEmber': (0.0, 0.4), 'oEmberTau': (1.0, 4.0), 'stars': (200, 320), 'oSpeedExp': (0.0, 1.0), 'oWidth': (0.45, 1.3), 'gWidth': (0.45, 1.3), 'sparkSize': (0.5, 1.3)}
SPACE = {  # 名称: (下限, 上限)
    'oTau': (0.15, 1.5), 'oIgn': (0.12, 0.35), 'oFade': (0.3, 1.5), 'gLine': (0.1, 0.8),
    'sparkBright': (15, 80), 'sparkRate': (150, 600), 'tSwitch': (1.1, 1.35), 'tSwitchJit': (0.05, 0.25), 'sparkBack': (30, 90)}
if os.environ.get('ONLY'):
    keep = os.environ['ONLY'].split(',')
    SPACE = {**{k: v for k, v in SPACE.items() if k in keep}, **{k: v for k, v in EXTRA.items() if k in keep}}
ref = json.load(open(os.path.join(HERE, '考卷', '参考指标.json')))['时刻']
def loss(P):
    ok, rows, info, res, expo = S.score({**BASE, **P})
    L = 0.0; V = 0.0
    for code, name, (a, b), f, how, tol in K.RULES:
        if os.environ.get('RULES') and code not in os.environ['RULES'].split(','): continue
        for t, m in res.items():
            tt = float(t)
            if not (a - 1e-9 <= tt <= b + 1e-9): continue
            r = dict(ref[t]); r['_Rratio'] = ref[t]['半径_实测_1080'] / ref['1.0']['半径_实测_1080']
            r['_亮度比'] = (ref[t]['线亮度中位'] or 0) / ref['1.0']['线亮度中位']
            try: x, y = f(m), f(r)
            except (TypeError, KeyError): L += 5; continue
            for xi, yi in zip(x if isinstance(x, list) else [x], y if isinstance(y, list) else [y]):
                if xi is None or yi is None: L += 5; continue
                d = {'ge': yi - tol - xi, 'le': xi - yi - tol, 'abs': abs(xi - yi) - tol, 'rel': abs(xi - yi) - tol * yi}[how]
                sc = tol * (yi if how == 'rel' else 1)
                V += max(0.0, d) / sc; L += 0.05 * abs(xi - yi) / sc     # 先看超标量 V，全过以后再往中间靠（L）
    if os.environ.get('RULES'): ok = V == 0
    return (0.0 if ok else 100.0) + V + L, ok          # 全过的一定排在没全过的前面
rng = np.random.default_rng(int(sys.argv[1]) if len(sys.argv) > 1 else 0)
log = []; best = None
start = {'oTau': 0.9, 'oIgn': 0.22, 'oFade': 1.0, 'gLine': 0.3, 'sparkBright': 40, 'sparkRate': 300, 'tSwitch': 1.2, 'tSwitchJit': 0.18, 'sparkBack': 60}
if os.environ.get('ONLY'): start = {k: (BASE[k] if k in BASE else float(np.mean(SPACE[k]))) for k in SPACE}
if os.environ.get('START'): start.update(json.loads(os.environ['START']))
cands = [start] + [{k: float(rng.uniform(*v)) for k, v in SPACE.items()} for _ in range(int(sys.argv[2]) if len(sys.argv) > 2 else 24)]
for P in cands:
    L, ok = loss(P); log.append((L, ok, P))
    if best is None or L < best[0]: best = (L, ok, P)
    print(round(L, 2), ok, {k: round(v, 3) for k, v in P.items()}, flush=True)
# 坐标细化：每个量 ×(0.85, 1.15)，三轮
P = dict(best[2]); L0 = best[0]
for rnd in range(int(os.environ.get('ROUNDS', 3))):
    for k, (lo, hi) in SPACE.items():
        for f in (0.85, 1.15):
            Q = dict(P); Q[k] = float(np.clip(P[k] * f, lo, hi)); L, ok = loss(Q)
            if L < L0: P, L0 = Q, L; print('细化', rnd, k, round(L, 2), ok, flush=True)
OUT = os.environ.get('OUT', os.path.join(HERE, '考卷', '搜索结果.json'))
json.dump({'最好': {**BASE, **P}, '损失': L0, '记录': [(l, o, p) for l, o, p in log]}, open(OUT, 'w'), ensure_ascii=False, indent=1)
print('最好', round(L0, 3), P)
