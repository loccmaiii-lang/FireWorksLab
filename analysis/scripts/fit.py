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
          ('subDelay', 'mul', .12, .1, 5), ('subStars', 'mul', .25, 3, 200), ('subSpeed', 'mul', .2, 3, 200), ('subBurn', 'mul', .15, .1, 5), ('subJit', 'add', 10, 0, 80),
          ('emberBright', 'mul', .3, .01, 1.5), ('emberLife', 'mul', .2, .3, 8), ('emberFrac', 'add', .08, 0, .9), ('keepFrac', 'add', .05, .02, 1),
          ('afterBurn', 'mul', .15, .2, 8), ('ignDelay', 'add', .05, 0, 3), ('speedJit', 'add', 4, 0, 40), ('subSpeedJit', 'add', 2, 0, 30), ('subVt', 'mul', .2, 2, 60),
          ('_psf', 'add', .3, 0, 4), ('_gain', 'mul', .25, .3, 5)]
# 清晰度：火花 / 星头尺寸有上限，防止拟合把实拍的镜头模糊当成火花大小（那样贴图会糊）；模糊交给 _psf
SIZE_CAP = {'headSize': (0.1, 0.8), 'sparkSize': (0.05, 0.5)}


def _split(k):
    """多层组合的参数写成 "<层号>.<键>"（例 "0.v0"、"1.M.headInt"）；单层直接写键。
    "*.<键>"：所有有这个键的层一起改；"0+1.<键>"：只有这几层一起改（同一批星的几层共用初速、星数、燃烧时长时用，保证轨迹不分开）"""
    a, _, b = k.partition('.')
    if a == '*' and b: return ('*', b)
    if '+' in a and b and all(x.isdigit() for x in a.split('+')): return (tuple(int(x) for x in a.split('+')), b)   # "0+1.stars"：这几层一起改
    return (int(a), b) if a.isdigit() and b else (None, k)


def _all(P, kk):
    return [j for j, L in enumerate(P.get('layers') or []) if (kk[2:] in (L.get('M') or {}) if kk.startswith('M.') else kk in L['P'])]


def _get(P, M, k):
    i, kk = _split(k)
    if i == '*': j = _all(P, kk)[0]; return _get(P, M, f'{j}.{kk}')
    if isinstance(i, tuple): return _get(P, M, f'{i[0]}.{kk}')
    if i is not None:
        L = P['layers'][i]; return L['M'][kk[2:]] if kk.startswith('M.') else L['P'][kk]
    return M[k[2:]] if k.startswith('M.') else P[k]


def _fix_duration(P):
    if 'burn' in P and 'duration' in P: P['duration'] = max(P['duration'], P['burn'] * 1.4 + 0.5 + (P.get('ignDelay') or 0))


def _put(P, M, k, v):
    i, kk = _split(k)
    if i == '*' or isinstance(i, tuple):
        for j in (_all(P, kk) if i == '*' else i): P, M = _put(P, M, f'{j}.{kk}', v)
        return P, M
    if i is not None:
        P = dict(P); P['layers'] = [dict(L) for L in P['layers']]
        L = P['layers'][i]; L['P'] = dict(L['P']); L['M'] = dict(L.get('M') or {})
        if kk.startswith('M.'): L['M'][kk[2:]] = v
        else: L['P'][kk] = v
        _fix_duration(L['P']); return P, M
    P, M = dict(P), dict(M)
    if k.startswith('M.'): M[k[2:]] = v
    else: P[k] = v
    _fix_duration(P)
    return P, M


def _has(P, M, k):
    i, kk = _split(k)
    if i == '*': return bool(_all(P, kk))
    if isinstance(i, tuple): return all(_has(P, M, f'{j}.{kk}') for j in i)
    if i is not None:
        if not P.get('layers') or i >= len(P['layers']): return False
        L = P['layers'][i]; return kk[2:] in (L.get('M') or {}) if kk.startswith('M.') else kk in L['P']
    return k[2:] in M if k.startswith('M.') else k in P


def run_fit(V, s, P, M, prefix, params=None, rounds=3, fast=None, log=print, camera=False, caps=None, weights=None):
    """V：实拍（video_side 的结果）；s：SimSession。返回 (P, M, 差距, S)
    camera：True 时加相机模糊 / 曝光（_psf / _gain）一起拟合，并给火花尺寸加上限（caps 可覆盖 SIZE_CAP）"""
    fast = (s.mode == 'soft') if fast is None else fast      # 有显卡时每次都用完整画质
    P = dict(P); cap = {}
    layered = bool(P.get('layers'))
    if camera:
        P.setdefault('_psf', 1.0); P.setdefault('_gain', 1.0)
        cap = {**SIZE_CAP, **(caps or {})}
        for k, (lo, hi) in cap.items():
            if layered:     # 不带层号的上下限对每一层都生效；"1.stars" 这样的只管那一层
                i, kk = _split(k)
                for j in (range(len(P['layers'])) if i in (None, '*') else i if isinstance(i, tuple) else [i]):
                    if i is None and f'{j}.{kk}' in cap: continue     # 这一层有自己的上下限（例 "1.headSize"），通用的不管它
                    if _has(P, M, f'{j}.{kk}'): P, M = _put(P, M, f'{j}.{kk}', min(hi, max(lo, _get(P, M, f'{j}.{kk}'))))
            elif k in P: P[k] = min(hi, max(lo, P[k]))
        if params is not None: params = list(params) + [k for k in ('_psf', '_gain') if k not in params]
    BY = {p[0]: p for p in PARAMS}
    if params is None: params = [p[0] for p in PARAMS]
    PR = []
    for k in params:
        i, kk = _split(k)
        if kk not in BY or not _has(P, M, k): continue
        _, kind, st, lo, hi = BY[kk]
        lo, hi = cap.get(k, cap.get(kk, (lo, hi))) if (k in cap or kk in cap) else (lo, hi)
        PR.append((k, kind, st, lo, hi))

    def ev(P, M):
        S = s.side(P, M, V['R'], fast=fast); L, parts = score(V, S, weights); return L, S, parts
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
