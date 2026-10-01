"""V6 的引擎等价预览 vs 尾缀B 实拍（中档，套用尾缀B 弹道的线性阻力逼近），同一套量法（trail_phys.metrics）。
两种比例：game = 1.05 m/像素（1080p、约 1 km 外）；native = 0.4545 m/像素（视频原比例）。
用法：python3 对照.py [输出前缀] [--opts JSON]"""
import os, sys, json, math, numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import v6, head as HD
TP = v6.TP
def run(prefix, opts=None, head_col=None, scales=('native', 'game'), save=True):
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
        sigs = [v6.render_frame(sim, cj, t - ref['t0'], W, H, mpp, (ox, oy), head_img=get) for t in times]
        reals = [cv2.resize(real[t], (W, H), interpolation=cv2.INTER_AREA) if f != 1 else real[t] for t in times]
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
    res = run(pre, opts)
    for sc, r in res.items():
        print(sc, 'E', round(r['E'], 3))
        for x in r['rows']:
            a, b = x['实拍'], x['模拟']; print('  t', x['t'], '长', a['len_m'], b['len_m'], '| 过曝', a['sat_m'], b['sat_m'], '| 宽', a['width_m'], b['width_m'], '| 暖', a['warm'], b['warm'], '| 亮', a['flux'], b['flux'])
