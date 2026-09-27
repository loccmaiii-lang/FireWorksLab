"""一次试几组参数改动，各出一张对照图：python3 variants.py <视频> <起点json> <前缀> <改动json {名字: {参数: 值, "M": {...}}}>"""
import sys, json
sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from compare import *
video, start, prefix, vj = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
j = json.load(open(start)); P0, M0 = j['P'], j['M']
V = video_side(video); s = SimSession()
for name, d in json.load(open(vj)).items():
    dd = dict(d); Mo = dd.pop('M', {}); P = dict(P0); P.update(dd); M = dict(M0); M.update(Mo)
    S = s.side(P, M, V['R']); L, parts = score(V, S)
    cs = curves(S)
    print(name, round(L,4), {k: round(v,4) for k,v in parts.items()}, 'coh', [round(at(cs['coh'],u),3) for u in KEYU], flush=True)
    sheet(V, S, f'{prefix}_{name}.jpg')
    json.dump({'P': P, 'M': M, 'loss': L}, open(f'{prefix}_{name}.json','w'), ensure_ascii=False)
s.close()
