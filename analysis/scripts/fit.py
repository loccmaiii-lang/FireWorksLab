"""坐标下降拟合：每次改一个参数、渲染、和实拍比差距，变好就保留。
参数可以是 P 的键，或 'M.headInt'（整体亮度）。拟合时用快速渲染（少几个时刻、快门子帧 4），约 50 秒一轮评估。
用法：python3 fit.py <视频> <起点json {P,M}> <输出前缀> [只调这些参数的 json 列表]
输出：<前缀>_best.json / <前缀>_best.jpg（每次变好时更新）"""
import sys, json, time, numpy as np
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from compare import *
video, start, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
PR = [('burstR0','add',10,0,300),('v0','mul',.15,5,600),('vt','mul',.2,4,80),('grav','mul',.25,.1,3),('stars','mul',.25,20,1200),
      ('sparkRate','mul',.3,10,3000),('sparkLife','mul',.25,.1,4),('sparkInherit','add',.1,0,.9),('cooling','add',.1,.05,.8),
      ('burn','mul',.08,.3,12),('fade','add',.12,0,.9),('sparkSpread','mul',.35,.05,15),('headSize','mul',.3,.1,6),('sparkSize','mul',.3,.05,2),
      ('sparkDrag','mul',.3,0.1,8),('sparkGrav','add',.1,0,3),('M.headInt','mul',.25,.1,4),('headBright','mul',.35,.02,3),('sparkBright','mul',.3,.1,3),('sparkRateEnd','add',.15,0,2)]
if len(sys.argv) > 4: PR = [p for p in PR if p[0] in json.load(open(sys.argv[4]))]
j = json.load(open(start)); P, M = j['P'], j['M']
V = video_side(video); s = SimSession()
def get(P, M, k): return M[k[2:]] if k.startswith('M.') else P[k]
def put(P, M, k, v):
    P, M = dict(P), dict(M)
    if k.startswith('M.'): M[k[2:]] = v
    else: P[k] = v
    P['duration'] = max(P['duration'], P['burn'] * 1.4 + 0.5); return P, M
def ev(P, M):
    S = s.side(P, M, V['R'], fast=True); L, parts = score(V, S); return L, S, parts
best, S, parts = ev(P, M); print('start', round(best,4), {k: round(float(v),4) for k,v in parts.items()}, S['render_s'], flush=True)
st = {p[0]: p[2] for p in PR}; n = 0
for rnd in range(4):
    imp = False
    for k, kind, _, lo, hi in PR:
        for sg in (1, -1):
            c = get(P, M, k); v = c * (1 + st[k]) ** sg if kind == 'mul' else c + sg * st[k]
            v = min(hi, max(lo, v))
            if v == c: continue
            P2, M2 = put(P, M, k, v)
            L, S2, pa = ev(P2, M2); n += 1
            if L < best:
                P, M, best, S, parts, imp = P2, M2, L, S2, pa, True
                print(' ', rnd, k, round(v, 3), round(L, 4), {a: round(float(b), 4) for a, b in pa.items()}, flush=True)
                json.dump({'P': P, 'M': M, 'loss': best}, open(prefix + '_best.json', 'w'), ensure_ascii=False)
                sheet(V, S, prefix + '_best.jpg')
                break
    if not imp:
        for k in st: st[k] *= 0.5
print('done', n, round(best, 4), flush=True)
s.close()
