"""升空尾缀：烘焙器里的三档配方 vs 实拍（尾缀C / B / A），逐项测量并自动逼近。
  python trail_calib.py S|M|L [轮数] [起点覆盖 json]
渲染用网页烘焙器本身（只烘循环、1/4 分辨率，测量前缩放到实拍的像素长度）；测量用 trailkit：
沿长度的亮度分布、宽度、颗粒度、亮点密度、颜色、摆动，外加「尾迹长度（米）」贴近三档标准。
输出：analysis/replica/尾缀_<档>_配方.json（参数覆盖）、_对照.jpg（实拍 4 帧 | 烘焙器 4 帧）、_数值.json

火花本身按真实尺寸画小（贴图里清晰）；实拍的镜头模糊 / 压缩单独用「相机模糊」_psf（实拍像素）模拟，
只在和实拍比较时加上，不进贴图。火花尺寸有上限，防止拟合把镜头模糊当成火花大小（那样贴图会糊）。
"""
import os, sys, json, math, base64, io, copy, time
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import trailkit as K
import trail_fit as TF
from compare import SimSession

ROOT = TF.ROOT
KEY = {'S': 'trailS', 'M': 'trailM', 'L': 'trailL'}
TARGET_LEN = {'S': 20.0, 'M': 40.0, 'L': 90.0}
PHASES = [0, 16, 32, 48]
RAMP_POS = [0, 0.3, 0.65, 1]


def hex_lin(h):
    c = np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float64) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def ramp_table(M):
    C = [hex_lin(M[k]) for k in ('ramp0', 'ramp1', 'ramp2', 'ramp3')]; x = np.linspace(0, 1, 256)
    return np.stack([np.interp(x, RAMP_POS, [c[ch] for c in C]) for ch in range(3)], 1)


def cells(png_b64, meta, frames):
    im = np.array(Image.open(io.BytesIO(base64.b64decode(png_b64))).convert('RGBA')).astype(np.float32) / 255
    cw = meta['N'] // meta['cols']; rows = meta['per'] // meta['cols']; chh = im.shape[0] // rows; out = []
    for f in frames:
        c, k = divmod(f, meta['per']); col, row = k % meta['cols'], k // meta['cols']; out.append(im[row * chh:(row + 1) * chh, col * cw:(col + 1) * cw, c])
    return out


def colorize(v, ramp):
    return (ramp[np.clip((v * 255).astype(int), 0, 255)] * v[..., None]).astype(np.float32)


def sim_side(res, Lref, ramp, psf=0.7, st_kw=None):
    st_kw = st_kw or {}
    profs, strips = [], []
    for v in cells(res['loop'], res['meta'], PHASES):
        img = colorize(v, ramp)[..., ::-1]           # → BGR（与实拍同一套函数）
        pad = np.zeros((img.shape[0] + 60, img.shape[1] + 160, 3), np.float32); pad[30:30 + img.shape[0], 80:80 + img.shape[1]] = img
        h, sig = K.find_head(pad); st, line = K.straighten(sig, h, **{**st_kw, 'maxlen': pad.shape[0] - int(h[1]) - 1})
        L0 = K.trail_length(st); s = Lref / max(L0, 1)
        img2 = cv2.GaussianBlur(cv2.resize(pad, None, fx=s, fy=s, interpolation=cv2.INTER_AREA), (0, 0), psf)
        big = np.zeros((max(img2.shape[0], 1000), img2.shape[1] + 120, 3), np.float32); big[:img2.shape[0], 60:60 + img2.shape[1]] = img2
        h, sig = K.find_head(big); st, line = K.straighten(sig, h, **st_kw)
        profs.append(K.profile(st, line)); strips.append(st)
    avg = {k: np.mean([p[k] for p in profs], 0).tolist() if isinstance(profs[0][k], list) else float(np.mean([p[k] for p in profs])) for k in profs[0]}
    return dict(prof=avg, strips=strips)


# 火花真实尺寸的上限（米）：再大就是把镜头模糊算进了火花，贴图会糊
SIZE_CAP = {'trFSize': (.008, .03), 'trMSize': (.01, .04), 'trCSize': (.012, .05), 'trHeadSize': (.03, .12)}
FIT_KEYS = [('trFRate', 'mul', .3, 50, 80000), ('trFLife', 'mul', .2, .03, 2), ('trFSpread', 'mul', .3, .02, 6), ('trFSize', 'mul', .25, *SIZE_CAP['trFSize']), ('trFBright', 'mul', .3, .001, .5),
            ('trMRate', 'mul', .3, 0, 30000), ('trMLife', 'mul', .2, .05, 3), ('trMSpread', 'mul', .3, .02, 8), ('trMSize', 'mul', .25, *SIZE_CAP['trMSize']), ('trMBright', 'mul', .3, .001, .5),
            ('trCRate', 'mul', .3, 0, 10000), ('trCLife', 'mul', .2, .05, 4), ('trCSpread', 'mul', .3, .02, 10), ('trCSize', 'mul', .25, *SIZE_CAP['trCSize']), ('trCBright', 'mul', .3, .001, 1),
            ('trInh', 'add', .05, 0, .8), ('trDrag', 'mul', .25, .3, 10), ('trHeadSize', 'mul', .25, *SIZE_CAP['trHeadSize']), ('trHeadBright', 'mul', .3, .05, 4), ('trHaloBright', 'mul', .35, .01, 1),
            ('trTwist', 'mul', .35, .005, 6), ('trWiggle', 'mul', .35, .005, 1), ('trTwistLag', 'add', .1, 0, 1.2), ('shutter', 'add', .15, .05, 1), ('trIgnite', 'add', .04, 0, .6), ('trCool', 'mul', .2, .3, 2),
            ('_psf', 'add', .3, .4, 4), ('_psf3', 'add', .3, .3, 3)]


def cap_sizes(over, P0):
    """起点里超出上限的火花尺寸压回上限；亮度按面积守恒不用改（高斯点总能量与尺寸无关）"""
    o = dict(over)
    for k, (lo, hi) in SIZE_CAP.items(): o[k] = round(min(hi, max(lo, o.get(k, P0[k]))), 5)
    o.setdefault('_psf', 1.2)
    return o


# 质感参考（tex='3.0A'）：造型（亮度沿长度分布、摆动、长度）仍对各档原来的实拍，
# 质感（粗细、颗粒、亮点密度、颜色、看上去多亮）对尾缀3.0_A 的 4K 画面，在它的像素尺度上测
W_SHAPE = dict(I=3, w=0, wave=2, grain=0, peaks=0, col=0, lev=0)
W_TEX = dict(I=0, w=3, wave=0, grain=2, peaks=2, col=2, lev=4)


def main(size, rounds=2, start=None, log=print, s=None, out=None, cap=True, tex=None, scale=0.25):
    """s：已打开的 SimSession（本地任务共用一个浏览器）；out：输出目录（默认 analysis/replica）；
    tex：'3.0A' 时质感对尾缀3.0_A；scale：烘焙倍率（质感对 4K 实拍时用 1）"""
    ref = TF.ref_side(size); Lref = ref['L']
    ref3 = None
    if tex:
        import trail_ref3 as R3; ref3 = R3.ref_side(); ST3 = R3.STRAIGHT
    own = s is None
    if own: s = SimSession()
    pg = s.pg
    over = (json.load(open(start, encoding='utf-8')) if isinstance(start, str) else dict(start)) if start else {}
    base = pg.evaluate(f"defaultsFor('{KEY[size]}')"); Mr = dict(base['M']); Mr.update(over.get('_ramp', {})); ramp = ramp_table(Mr)
    P0 = dict(base['P']); P0.setdefault('trTwistLag', 0.35); P0['_psf'] = 1.2; P0['_psf3'] = 1.0
    keys = [k for k in FIT_KEYS if tex or k[0] != '_psf3']
    if cap: over = cap_sizes(over, P0)

    def ev(o):
        res = pg.evaluate(f"__fw.trailBake('{KEY[size]}', {json.dumps({k: v for k, v in o.items() if not k.startswith('_')})}, {scale}, true)")
        S = sim_side(res, Lref, ramp, o.get('_psf', 1.2))
        if ref3 is None: L, parts = K.loss(ref['prof'], S['prof'])
        else:
            S['tex'] = sim_side(res, ref3['L'], ramp, o.get('_psf3', 1.0), ST3)
            L1, p1 = K.loss(ref['prof'], S['prof'], W_SHAPE); L2, p2 = K.loss(ref3['prof'], S['tex']['prof'], W_TEX)
            L = L1 + L2; parts = {**{k: v for k, v in p1.items() if W_SHAPE.get(k, 1)}, **{'质感_' + k: v for k, v in p2.items() if W_TEX.get(k, 1)}}
        ln = res['meta']['trailLen']; parts['len'] = float(np.log(ln / TARGET_LEN[size]) ** 2); L += 2 * parts['len']
        return L, parts, S, res
    cur = dict(over); best, parts, S, res = ev(cur)
    log(f'[{size}] 起点 {best:.4f} ' + ' '.join(f'{k}={v:.4f}' for k, v in parts.items()) + f" 长 {res['meta']['trailLen']:.1f} m")
    st = {k[0]: k[2] for k in FIT_KEYS}
    for rnd in range(rounds):
        imp = False
        for k, kind, _, lo, hi in keys:
            c = cur.get(k, P0.get(k, 0))
            if kind == 'mul' and c == 0: continue
            for sg in (1, -1):
                v = c * (1 + st[k]) ** sg if kind == 'mul' else c + sg * st[k]; v = min(hi, max(lo, v))
                if abs(v - c) < 1e-9: continue
                o = dict(cur); o[k] = round(v, 5)
                try: L, pa, S2, r2 = ev(o)
                except Exception as e: log(f'  {k} 出错 {e}'); continue
                if L < best:
                    cur, best, parts, S, res, imp = o, L, pa, S2, r2, True
                    log(f'  第{rnd + 1}轮 {k} → {v:.4g}  {L:.4f}  长 {r2["meta"]["trailLen"]:.1f} m'); break
        if not imp:
            for k in st: st[k] *= 0.5
    log(f'[{size}] 结束 {best:.4f} ' + ' '.join(f'{k}={v:.4f}' for k, v in parts.items()))
    out = out or os.path.join(ROOT, 'analysis', 'replica'); os.makedirs(out, exist_ok=True)
    json.dump(cur, open(os.path.join(out, f'尾缀_{size}_配方.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({'差距': round(best, 4), '分项': {k: round(v, 4) for k, v in parts.items()}, '尾迹长度m': res['meta']['trailLen'], '实拍': ref['prof'], '烘焙器': S['prof']},
              open(os.path.join(out, f'尾缀_{size}_数值.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=float)
    TF.sheet(ref, S, os.path.join(out, f'尾缀_{size}_对照.jpg'))
    if ref3 is not None:
        TF.sheet(ref3, S['tex'], os.path.join(out, f'尾缀_{size}_质感对照.jpg'))
        json.dump({'实拍': ref3['prof'], '烘焙器': S['tex']['prof']}, open(os.path.join(out, f'尾缀_{size}_质感数值.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=float)
    if own: s.close()
    return cur, best

if __name__ == '__main__':
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 2, sys.argv[3] if len(sys.argv) > 3 else None, log=lambda m: print(m, flush=True))
