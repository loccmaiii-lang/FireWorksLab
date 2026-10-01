"""V6 的引擎等价预览 vs 尾缀B 实拍（中档，套用尾缀B 弹道的线性阻力逼近），同一套量法（trail_phys.metrics）。
两种比例：game = 1.05 m/像素（1080p、约 1 km 外）；native = 0.4545 m/像素（视频原比例）。
用法：python3 对照.py [输出前缀] [--opts JSON] [--engine [--k 1]]
--engine：按烘焙器的引擎显示约定（1 − e^(−4·x)）合成，不拟合相机曝光；改为在游戏比例下拟合火星 / 落火的亮度倍数 k（Color Over Life × k），
         让总亮度和实拍一致 —— k 是素材本身的亮度（会写进 cascade.json），不是相机效果。"""
import os, sys, json, math, numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import v6, head as HD
TP = v6.TP
def run(prefix, opts=None, head_col=None, scales=('native', 'game'), save=True, engine=False, k_fixed=None):
    base = dict(v6.OPTS['M']); v6.OPTS['M'] = {**base, 'lean': True, **(opts or {})}
    v6.TRAJ_OVERRIDE['M'] = 'B_ref'
    hdir = os.path.join(HERE, '素材包', 'RiseTrailV6_M'); info = json.load(open(os.path.join(hdir, 'RiseTrailV6_M_head.json')))
    if head_col or (opts or {}).get('head_col'): info['col'] = head_col or opts['head_col']
    cj = v6.build('M', 'pc', info); v6.TRAJ_OVERRIDE.clear(); v6.OPTS['M'] = base
    ref = TP.REFS['M']; times = ref['times']; bg8, real = TP.load_ref(ref, times)
    sim = v6.simulate(cj, max(times) - ref['t0'] + 0.05, fps=30)
    get = HD.cell_reader(hdir, 'M')
    res = {}; rows_img = []
    for sc in scales:
        mpp = TP.MPP if sc == 'native' else 1.05; f = TP.MPP / mpp
        bgs = cv2.resize(bg8, None, fx=f, fy=f, interpolation=cv2.INTER_AREA) if f != 1 else bg8
        H, W = bgs.shape[:2]; ox = (ref['launch'][0] - ref['crop'][0]) * f; oy = (ref['launch'][1] - ref['crop'][1]) * f
        reals = [cv2.resize(real[t], (W, H), interpolation=cv2.INTER_AREA) if f != 1 else real[t] for t in times]
        if engine:
            dots = [v6.render_frame(sim, cj, t - ref['t0'], W, H, mpp, (ox, oy)) for t in times]
            la, lb = v6.recipe('M')[0]['lean']; hx = lambda z: la * z + lb * z * z
            heads = [v6.render_frame(sim, cj, t - ref['t0'], W, H, mpp, (ox, oy), head_img=get, dots=False, head_x=hx) for t in times]
            comp = lambda h, d, k: TP.to_srgb8(TP.to_lin(bgs) + (1 - np.exp(-4 * (h + k * d)))[..., ::-1])
            if k_fixed is not None: res['k'] = k_fixed
            elif sc == 'game' or 'k' not in res:
                def flk(k): return np.median([TP.metrics(bgs, comp(h, d, k).astype(np.float32), sc=mpp)['flux'] / max(TP.metrics(bgs, r, sc=mpp)['flux'], 1e-3) for h, d, r in zip(heads, dots, reals)])
                lo, hi = 1e-4, 1e3
                for _ in range(28):
                    k = (lo * hi) ** 0.5; lo, hi = (k, hi) if flk(k) < 1 else (lo, k)
                res['k'] = (lo * hi) ** 0.5
            k = res['k']; rr = []
            for t, h, d, r in zip(times, heads, dots, reals):
                simg = comp(h, d, k); mr = TP.metrics(bgs, r, sc=mpp); ms = TP.metrics(bgs, simg.astype(np.float32), sc=mpp)
                rr.append(dict(t=t, 实拍=mr, 模拟=ms)); rows_img.append((sc, r.astype(np.uint8), simg))
            res[sc] = dict(E=4.0, k=k, rows=rr); continue
        sigs = [v6.render_frame(sim, cj, t - ref['t0'], W, H, mpp, (ox, oy), head_img=get) for t in times]
        # 曝光：让总亮度（flux）中位数和实拍一致
        def fl(E): return np.median([TP.metrics(bgs, TP.composite(bgs, s, E).astype(np.float32), sc=mpp)['flux'] / max(TP.metrics(bgs, r, sc=mpp)['flux'], 1e-3) for s, r in zip(sigs, reals)])
        lo, hi = 1e-3, 1e5
        for _ in range(30):
            E = (lo * hi) ** 0.5; lo, hi = (E, hi) if fl(E) < 1 else (lo, E)
        E = (lo * hi) ** 0.5
        rr = []
        for t, s, r in zip(times, sigs, reals):
            simg = TP.composite(bgs, s, E); mr = TP.metrics(bgs, r, sc=mpp); ms = TP.metrics(bgs, simg.astype(np.float32), sc=mpp)
            rr.append(dict(t=t, 实拍=mr, 模拟=ms)); rows_img.append((sc, r.astype(np.uint8), simg))
        res[sc] = dict(E=E, rows=rr)
    if save:
        for sc in scales:
            ims = [x for x in rows_img if x[0] == sc]
            top = np.hstack([x[1] for x in ims]); bot = np.hstack([x[2] for x in ims])
            img = np.vstack([top, np.full((4, top.shape[1], 3), 255, np.uint8), bot])
            if sc == 'game': img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST)
            cv2.imwrite(f'{prefix}_{sc}.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 92])
        json.dump(res, open(prefix + '.json', 'w'), ensure_ascii=False, indent=1, default=float)
    return res
if __name__ == '__main__':
    pre = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '对照', 'B')
    os.makedirs(os.path.dirname(pre), exist_ok=True)
    opts = json.loads(sys.argv[sys.argv.index('--opts') + 1]) if '--opts' in sys.argv else None
    res = run(pre, opts, engine='--engine' in sys.argv, k_fixed=float(sys.argv[sys.argv.index('--k') + 1]) if '--k' in sys.argv else None, scales=('game', 'native') if '--engine' in sys.argv else ('native', 'game'))
    if 'k' in res: print('火星亮度倍数 k', round(res.pop('k'), 4))
    for sc, r in res.items():
        print(sc, 'E', round(r['E'], 3))
        for x in r['rows']:
            a, b = x['实拍'], x['模拟']; print('  t', x['t'], '长', a['len_m'], b['len_m'], '| 过曝', a['sat_m'], b['sat_m'], '| 宽', a['width_m'], b['width_m'], '| 暖', a['warm'], b['warm'], '| 亮', a['flux'], b['flux'])
