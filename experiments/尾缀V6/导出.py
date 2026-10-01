"""V6 导出：小 / 中 / 大，每档一个素材包目录：
  T_<名>_Head.png（PC 2048×512）/ _Head_M.png（手机 1024×256）、_Head_Ramp.png、_Head_Cutout.png、cascade.json（PC：GPU 火星）、cascade_mobile.json（手机：CPU 火星，数量少、点大一些）
  预览：引擎回放_<档>.jpg（按 cascade.json 逐 tick 模拟，侧面平视、游戏比例 1.05 m/像素，整段升空 + 开花后余烬）、近看_<档>.jpg（星头附近 0.12 m/像素）
用法：python3 导出.py [S M L] [--opts 拟合结果.json]"""
import os, sys, json, math, numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import v6, head as HD
TP = v6.TP


def tone(lin, E=1.0):
    """引擎显示约定（和烘焙器素材页 / 导出效果同一公式）：1 − e^(−4·x)，gamma 2.2；E 只给近看图用（默认 1 = 不加）"""
    return (v6.engine_tone(lin, E) * 255).astype(np.uint8)


def preview(key, cj, d, E=None):
    T = cj['source']['trajectory']['T']; H_m = cj['source']['trajectory']['H']
    sim = v6.simulate(cj, T + 3.0, fps=30); get = HD.cell_reader(d, key)
    mpp = 1.05; W = 120; Hp = int((H_m + 40) / mpp); org = (W / 2, Hp - 10)
    ts = list(np.round(np.linspace(0.4, T, 6), 2)) + [round(T + 0.8, 2), round(T + 1.8, 2)]
    imgs = [v6.render_frame(sim, cj, t, W, Hp, mpp, org, head_img=get) for t in ts]
    E = 1.0
    tiles = []
    for t, im in zip(ts, imgs):
        tl = tone(im, E)[..., ::-1].copy(); cv2.putText(tl, f'{t:.1f}s', (4, 18), 0, 0.5, (255, 255, 0), 1); tiles.append(tl)
    sheet = np.hstack(tiles); sheet = cv2.resize(sheet, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST)
    cv2.imwrite(os.path.join(d, f'引擎回放_{key}.jpg'), sheet, [cv2.IMWRITE_JPEG_QUALITY, 90])
    # 近看：星头附近（随星头取景），0.12 m/像素，60 m 高
    near = []
    for t in np.round(np.linspace(0.8, T - 0.2, 4), 2):
        hs = v6.head_state(cj, t); zc = hs['p'][2] / 100; mppn = 0.12; Wn, Hn = 260, 520
        org_n = (Wn / 2, Hn * 0.12 + zc / mppn)
        im = v6.render_frame(sim, cj, t, Wn, Hn, mppn, org_n, head_img=get)
        tl = tone(im)[..., ::-1].copy(); cv2.putText(tl, f'{t:.1f}s', (4, 18), 0, 0.5, (255, 255, 0), 1); near.append(tl)
    cv2.imwrite(os.path.join(d, f'近看_{key}.jpg'), np.hstack(near), [cv2.IMWRITE_JPEG_QUALITY, 90])
    return E


def export(key, opts=None):
    if opts: v6.OPTS[key] = {**v6.OPTS[key], **{k: v for k, v in opts.items() if k != 'head_col'}}
    d = os.path.join(HERE, '素材包', v6.NAMES[key]); info = HD.bake(key, d)
    if opts and 'head_col' in opts: info['col'] = opts['head_col']
    for plat in ('pc', 'mobile'):
        cj = v6.build(key, plat, info)
        json.dump(cj, open(os.path.join(d, 'cascade.json' if plat == 'pc' else 'cascade_mobile.json'), 'w'), ensure_ascii=False, indent=1)
    cj = json.load(open(os.path.join(d, 'cascade.json')))
    E = preview(key, cj, d)
    return d, cj


if __name__ == '__main__':
    args = sys.argv[1:]; opts = None
    if '--opts' in args: i = args.index('--opts'); opts = json.load(open(args[i + 1])); opts = opts.get('最好', opts); del args[i:i + 2]
    for k in args or ['S', 'M', 'L']:
        d, cj = export(k, opts)
        print(k, d, [(e['name'], e['gpu'], e['required']['duration_s']) for e in cj['emitters']])
