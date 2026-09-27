"""升空尾缀按实拍逐项拟合：
  python trail_fit.py S|M|L [轮数]
实拍：参考视频若干时刻，拉直后测亮度 / 宽度 / 颗粒 / 亮点 / 颜色 / 摆动沿长度的分布（trailkit）；
模拟：rise_trail 渲染循环的 4 个相位，按项目材质着色（渐变图 × 亮度），缩放到与实拍相同的像素长度后用同一套测量。
渐变图直接从实拍取：按亮度分档，统计每档的颜色。
结果：analysis/replica/尾缀_<档>_拟合.json（参数）+ _对照.jpg（实拍 | 模拟，原始像素尺度）
"""
import os, sys, json, math, copy
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import trailkit as K
import rise_trail as R

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
REFS = {'S': [('vidio/2.0/尾缀C.mp4', [0.8, 1.1, 1.4, 1.7])],
        'M': [('vidio/2.0/尾缀B.mp4', [2.2, 2.8, 3.4, 4.0])],
        'L': [('vidio/2.0/尾缀A.mp4', [2.4, 3.0, 3.6, 4.2])]}
PHASES = [0, 16, 32, 48]


def ref_side(key):
    profs, strips, cols = [], [], []
    for path, ts in REFS[key]:
        bg, fr, fps = K.read_frames(os.path.join(ROOT, path), ts)
        for t in ts:
            sig = K.signal(fr[t], bg); h, sig = K.find_head(sig); st, line = K.straighten(sig, h)
            p = K.profile(st, line); profs.append(p); strips.append(st)
            Y = st.sum(2); m = Y > 0.02 * np.percentile(Y[:p['L']], 99.5)
            u = np.clip(Y / np.percentile(Y[:p['L']], 99.5), 0, 1)
            cols.append((u[m], st[m]))
    # 渐变图：亮度分 24 档，每档平均颜色（线性，按最大通道归一）
    u = np.concatenate([c[0] for c in cols]); rgb = np.concatenate([c[1] for c in cols])[:, ::-1]   # BGR → RGB
    ramp = np.zeros((256, 3)); centers, vals = [], []
    for b in range(24):
        sel = (u >= b / 24) & (u < (b + 1) / 24 + (b == 23))
        if sel.sum() < 30: continue
        c = rgb[sel].mean(0); centers.append((b + 0.5) / 24); vals.append(c / c.max())
    centers = np.array(centers); vals = np.array(vals)
    x = np.linspace(0, 1, 256)
    for ch in range(3): ramp[:, ch] = np.interp(x, centers, vals[:, ch])
    ramp[:8] *= np.linspace(0, 1, 8)[:, None]
    avg = {k: np.mean([p[k] for p in profs], 0).tolist() if isinstance(profs[0][k], list) else float(np.mean([p[k] for p in profs])) for k in profs[0]}
    return dict(prof=avg, profs=profs, strips=strips, ramp=ramp, L=int(np.mean([p['L'] for p in profs])))


def sim_images(C, V, ramp):
    """模拟：4 个相位的彩色线性图（星头在上）与曝光"""
    fr = [R.render(C, V, f / R.FPS) for f in PHASES]
    E = R.expo_of(fr, int(C['top'] / C['H'] * R.CH)) * C.get('expo_scale', 1.0)
    out = []
    for f in fr:
        v = np.clip(1 - np.exp(-f * E), 0, 1)
        img = ramp[np.clip((v * 255).astype(int), 0, 255)] * v[..., None]          # 项目材质：渐变图(v) × v
        out.append(img.astype(np.float32))
    return out, E


def sim_side(C, V, ramp, Lref):
    profs, strips = [], []
    for img in sim_images(C, V, ramp)[0]:
        pad = np.zeros((img.shape[0] + 60, img.shape[1] + 120, 3), np.float32); pad[30:30 + img.shape[0], 60:60 + img.shape[1]] = img[..., ::-1]
        h, sig = K.find_head(pad); st, line = K.straighten(pad, h, maxlen=pad.shape[0] - int(h[1]) - 1)
        L0 = K.trail_length(st); s = Lref / max(L0, 1)
        img2 = cv2.resize(pad, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        img2 = cv2.GaussianBlur(img2, (0, 0), 0.7)                                   # 相机的轻微模糊
        big = np.zeros((max(img2.shape[0], 1000), img2.shape[1] + 120, 3), np.float32); big[:img2.shape[0], 60:60 + img2.shape[1]] = img2
        h, sig = K.find_head(big); st, line = K.straighten(sig, h)
        profs.append(K.profile(st, line)); strips.append(st)
    avg = {k: np.mean([p[k] for p in profs], 0).tolist() if isinstance(profs[0][k], list) else float(np.mean([p[k] for p in profs])) for k in profs[0]}
    return dict(prof=avg, strips=strips)


# 可拟合的参数：(路径, 改法, 步长, 下限, 上限)；路径 ('pops', i, j) 指 pops[i] 的第 j 项
POP_IDX = dict(rate=1, life=2, inh=3, spr=4, k=5, size=9, bright=10, cool=8)


def param_list(C):
    PL = []
    for i in range(len(C['pops'])):
        for nm, j in POP_IDX.items():
            kind, st, lo, hi = {'rate': ('mul', .3, 50, 20000), 'life': ('mul', .2, .05, 3), 'inh': ('add', .06, 0, .9), 'spr': ('mul', .25, .05, 8),
                                'k': ('mul', .25, .3, 10), 'size': ('mul', .25, .02, 1.5), 'bright': ('mul', .3, .002, 2), 'cool': ('add', .08, .05, .9)}[nm]
            PL.append((('pops', i, j), kind, st, lo, hi))
    for nm, kind, st, lo, hi in [('core', 'mul', .25, .02, 2), ('halo', 'mul', .25, .05, 5), ('halo_i', 'mul', .3, .01, 1.5), ('I', 'mul', .3, .05, 5)]:
        PL.append((('head', nm), kind, st, lo, hi))
    PL.append((('wave_scale',), 'mul', .35, .02, 5))
    PL.append((('shutter',), 'mul', .4, 1 / 500, 1 / 24))
    PL.append((('expo_scale',), 'mul', .35, .05, 5))
    return PL


def get(C, p):
    if p[0] == 'pops': return C['pops'][p[1]][p[2]]
    if p[0] == 'head': return C['head'][p[1]]
    return C.get(p[0], R.SHUTTER if p[0] == 'shutter' else 1.0)


def put(C, p, v):
    C = copy.deepcopy(C)
    if p[0] == 'pops': C['pops'][p[1]][p[2]] = v
    elif p[0] == 'head': C['head'][p[1]] = v
    else: C[p[0]] = v
    return C


def apply_extra(C):
    """wave_scale、shutter 落到渲染用的字段上"""
    C2 = copy.deepcopy(C)
    ws = C.get('wave_scale', 1.0); C2['wave'] = [(n, A * ws, ph) for n, A, ph in C['wave_base']]
    R.SHUTTER = C.get('shutter', 1 / 40)
    return C2


def fit(key, rounds=3, log=print):
    ref = ref_side(key)
    C = copy.deepcopy(R.TRAILS[key]); C['pops'] = [list(p) for p in C['pops']]; C['wave_base'] = list(C['wave']); C.setdefault('wave_scale', 1.0); C.setdefault('shutter', 1 / 40)
    bl = R.ballistic(C); V = float(np.interp(0.35 * bl['T'], bl['t'], bl['v']))
    C['H'] = C['H'] * 1.3   # 拟合期间留足空间，最后再收紧

    def ev(C):
        S = sim_side(apply_extra(C), V, ref['ramp'], ref['L']); L, parts = K.loss(ref['prof'], S['prof']); return L, parts, S
    best, parts, S = ev(C); log(f'[{key}] 起点 {best:.4f} ' + ' '.join(f'{k}={v:.4f}' for k, v in parts.items()))
    PL = param_list(C); st = {p[0]: p[2] for p in PL}
    for rnd in range(rounds):
        imp = False
        for path, kind, _, lo, hi in PL:
            for sg in (1, -1):
                c = get(C, path); v = c * (1 + st[path]) ** sg if kind == 'mul' else c + sg * st[path]
                v = min(hi, max(lo, v))
                if v == c: continue
                C2 = put(C, path, v)
                try: L, pa, S2 = ev(C2)
                except Exception as e: continue
                if L < best:
                    C, best, parts, S, imp = C2, L, pa, S2, True
                    log(f'  第{rnd + 1}轮 {path} → {v:.4g}  {L:.4f}'); break
        if not imp:
            for k in st: st[k] *= 0.5
    log(f'[{key}] 结束 {best:.4f} ' + ' '.join(f'{k}={v:.4f}' for k, v in parts.items()))
    return C, V, ref, S, best, parts


def sheet(ref, S, path, title=''):
    """实拍 4 个时刻 | 模拟 4 个相位，拉直后原始像素尺度，同一曝光"""
    def show(st, L):
        Y = st.sum(2); k = np.percentile(Y[:L], 99.5) / 3 + 1e-9
        return (np.clip(st / k, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)
    H = int(max(ref['L'] * 1.25, 200))
    a = [show(s, ref['L'])[:H] for s in ref['strips']]; b = [show(s, ref['L'])[:H] for s in S['strips']]
    sep = np.full((H, 6, 3), 50, np.uint8); gap = np.full((H, 30, 3), 90, np.uint8)
    img = np.hstack(sum([[x, sep] for x in a], []) + [gap] + sum([[x, sep] for x in b], []))
    img = cv2.resize(img, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_NEAREST)
    cv2.imwrite(path, img)


if __name__ == '__main__':
    key = sys.argv[1]; rounds = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    C, V, ref, S, best, parts = fit(key, rounds, log=lambda m: print(m, flush=True))
    out = os.path.join(ROOT, 'analysis', 'replica')
    C['ramp_lin'] = ref['ramp'].tolist(); C['fit_loss'] = best
    json.dump(C, open(os.path.join(out, f'尾缀_{key}_拟合.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sheet(ref, S, os.path.join(out, f'尾缀_{key}_对照.jpg'))
