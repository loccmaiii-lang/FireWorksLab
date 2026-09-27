"""坐标下降拟合：每次改一个参数、渲染、和实拍比差距，变好就保留。
参数可以是 P 的键，或 'M.headInt'（整体亮度）。
用法：python fit.py <视频> <起点json {P,M}> <输出前缀> [只调这些参数的 json 列表] [轮数]
输出：<前缀>_best.json / <前缀>_best.jpg（每次变好时更新）"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from compare import video_side, SimSession, score, sheet

# (参数, 改法, 初始步长, 下限, 上限)
PARAMS = [('burstR0', 'add', 10, 0, 300), ('v0', 'mul', .15, 5, 600), ('vt', 'mul', .2, 4, 80), ('grav', 'mul', .25, .1, 3), ('stars', 'mul', .25, 3, 1200),
          ('sparkRate', 'mul', .3, 10, 3000), ('sparkLife', 'mul', .25, .1, 4), ('sparkInherit', 'add', .1, 0, .9), ('cooling', 'add', .1, .05, .8),
          ('burn', 'mul', .08, .3, 12), ('fade', 'add', .12, 0, .9), ('sparkSpread', 'mul', .35, .05, 15), ('headSize', 'mul', .3, .1, 6), ('sparkSize', 'mul', .3, .05, 2),
          ('sparkDrag', 'mul', .3, 0.1, 8), ('sparkGrav', 'add', .1, 0, 3), ('M.headInt', 'mul', .25, .1, 4), ('headBright', 'mul', .35, .02, 3),
          ('sparkBright', 'mul', .3, .1, 3), ('sparkRateEnd', 'add', .15, 0, 2),
          ('subDelay', 'mul', .12, .1, 5), ('subStars', 'mul', .25, 3, 200), ('subSpeed', 'mul', .2, 3, 200), ('subBurn', 'mul', .15, .1, 5), ('subJit', 'add', 10, 0, 80)]


def _get(P, M, k): return M[k[2:]] if k.startswith('M.') else P[k]


def _put(P, M, k, v):
    P, M = dict(P), dict(M)
    if k.startswith('M.'): M[k[2:]] = v
    else: P[k] = v
    if 'burn' in P and 'duration' in P: P['duration'] = max(P['duration'], P['burn'] * 1.4 + 0.5)
    return P, M


def run_fit(V, s, P, M, prefix, params=None, rounds=3, fast=None, log=print):
    """V：实拍（video_side 的结果）；s：SimSession。返回 (P, M, 差距, S)"""
    fast = (s.mode == 'soft') if fast is None else fast      # 有显卡时每次都用完整画质
    PR = [p for p in PARAMS if (params is None or p[0] in params) and (p[0].startswith('M.') and p[0][2:] in M or p[0] in P)]

    def ev(P, M):
        S = s.side(P, M, V['R'], fast=fast); L, parts = score(V, S); return L, S, parts
    best, S, parts = ev(P, M)
    log(f"起点 差距 {best:.4f} " + ' '.join(f'{k}={float(v):.4f}' for k, v in parts.items()) + f" 渲染 {S['render_s']}s")
    st = {p[0]: p[2] for p in PR}; n = 0
    for rnd in range(rounds):
        imp = False
        for k, kind, _, lo, hi in PR:
            for sg in (1, -1):
                c = _get(P, M, k); v = c * (1 + st[k]) ** sg if kind == 'mul' else c + sg * st[k]
                v = min(hi, max(lo, v))
                if v == c: continue
                P2, M2 = _put(P, M, k, v)
                L, S2, pa = ev(P2, M2); n += 1
                if L < best:
                    P, M, best, S, parts, imp = P2, M2, L, S2, pa, True
                    log(f"  第{rnd + 1}轮 {k} → {v:.3f}  差距 {L:.4f}")
                    json.dump({'P': P, 'M': M, 'loss': best}, open(prefix + '_best.json', 'w', encoding='utf-8'), ensure_ascii=False)
                    sheet(V, S, prefix + '_best.jpg')
                    break
        if not imp:
            for k in st: st[k] *= 0.5
    log(f"拟合结束：试了 {n} 组，差距 {best:.4f}")
    return P, M, best, S


if __name__ == '__main__':
    video, start, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
    params = json.load(open(sys.argv[4], encoding='utf-8')) if len(sys.argv) > 4 else None
    rounds = int(sys.argv[5]) if len(sys.argv) > 5 else 3
    j = json.load(open(start, encoding='utf-8'))
    V = video_side(video); s = SimSession()
    try: run_fit(V, s, j['P'], j['M'], prefix, params, rounds, log=lambda m: print(m, flush=True))
    finally: s.close()
