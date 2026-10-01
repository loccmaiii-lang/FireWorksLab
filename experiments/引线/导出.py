"""引菊 → 锦：导出素材包（按 spec/cascade_params_v1.md 的 fwl.cascade/1；侧面平视 = 游戏视角）。

一个包两层（同一模拟）：
  O 引线（橙）、G 锦（金线 + 火星）。每层按帧计划分段，每段一张 2048（PC：4×4 格 × RGBA = 64 帧，单格 512）
  或 1024（手机：4×4 × RGBA = 64 帧，单格 256），每段一个发射器（delay = 该段第一帧时刻）。
  取景：Zoom（面片中心固定在爆点，Size By Life 随开花放大），面片边长 = 2H(t)。
  颜色：灰度贴图 + 每层自己的 Ramp（材质公式 ramp(v)·v·ColorOverLife，和 回放检查.py 一致）。
  帧号曲线：每帧在它的时刻开始显示（30 fps 段 / 15 fps 段），最后一个值 = 帧数 − 0.01。
  快门：每帧在 ±0.3 帧间隔内取 3 个子样平均（时间抗锯齿；锦火星的闪光不会忽有忽无）。

用法：python3 导出.py <输出目录> [参数 JSON 文件]
"""
import sys, os, json, math, hashlib, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import yinxian as Y
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'HikiNishiki'           # 引菊 → 锦
PLAT = {'pc': dict(cell=512, grid=4, tex=2048), 'mobile': dict(cell=256, grid=4, tex=1024)}
PAD = 2                        # 格子留边（清零），回放检查.py 会自己找
SUB = 3                        # 快门子样
SHUTTER = 0.6

# 帧计划：(开始秒, 结束秒, fps)；每层按内容自动截头尾，见 plan_layer
SCHED = {'O': [(0.0, 1.25, 30), (1.25, 9.0, 15)], 'G': [(0.0, 3.1, 30), (3.1, 12.0, 15)]}


def times_from(sched, t0, t1):
    ts = []
    for a, b, fps in sched:
        t = max(a, t0)
        # 对齐到该段的网格
        k = math.ceil((t - a) * fps - 1e-6); t = a + k / fps
        while t < min(b, t1) - 1e-9: ts.append((round(t, 5), fps)); t += 1 / fps
    return ts


def layer_img(sh, layer, t, H, cell, sub=SUB, fps=30):
    """渲一层一帧（快门子样平均：该帧间隔的 SHUTTER 倍，居中），视野 [-H, H]²（米，侧面），中心 = 爆点。"""
    ppm = (cell / 2) / H; acc = None
    for j in range(sub):
        ts = t + ((j + 0.5) / sub - 0.5) * SHUTTER / fps if sub > 1 else t
        O, G = Y.render(sh, max(ts, 0.0), 'side', cell, cell, ppm, cell / 2, cell / 2, ss=2, which=layer)
        im = O if layer == 'O' else G
        acc = im if acc is None else acc + im
    return acc / sub


def extent(sh, layer, t, thr):
    """内容到爆点的最大距离（米）：先用很大的视野低分辨率渲，量亮于 thr 的像素。"""
    Hbig = 260.0; cell = 200
    im = layer_img(sh, layer, t, Hbig, cell, sub=1)
    ys, xs = np.nonzero(im > thr)
    if not len(xs): return 0.0
    d = np.hypot(xs - cell / 2, ys - cell / 2).max() * (2 * Hbig / cell)
    return float(d)


def plan_layer(sh, layer, expo):
    """找该层有内容的时段，并给每帧定视野 H(t)（单调不减，留 8% 边）。"""
    thr = 0.02 / expo                          # 灰度约 2/255 以下算没有
    probe = times_from(SCHED[layer], 0.0, 12.0)
    alive = []; ext = {}
    for t, fps in probe:
        e = extent(sh, layer, t, thr); ext[t] = e
        if e > 0: alive.append(t)
    t0, t1 = min(alive), max(alive) + 0.04
    frames = [(t, f) for t, f in times_from(SCHED[layer], t0 - 0.05, t1)]
    # 视野：插值 ext，取后缀最大值让它单调不减（Zoom 面片只放大），再留 8%
    kt = np.array(sorted(ext)); kv = np.array([ext[t] for t in kt])
    e = np.interp([t for t, _ in frames], kt, kv)
    H = np.maximum.accumulate(np.maximum(e * 1.12, e + 4.0))   # 留边：12%，开花初期至少 4 m（低分辨率量不准）
    return frames, H


def ramp_png(path, layer):
    """256×8 sRGB Ramp：第 i 列 = ramp_lin(i/255)（线性，最亮通道 = 1）转 sRGB。"""
    v = np.linspace(0, 1, 256); lin = Y.ramp_lin(v, layer)
    srgb = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(np.clip(lin, 0, 1), 1 / 2.4) - 0.055)
    img = np.repeat((np.clip(srgb, 0, 1) * 255 + 0.5).astype(np.uint8)[None], 8, 0)
    Image.fromarray(img).save(path)


def pack(frames_v, plat):
    """把 ≤64 帧灰度（cell×cell，0–1）按 RGBA 接力装进一张贴图。"""
    p = PLAT[plat]; g, c = p['grid'], p['cell']
    tex = np.zeros((p['tex'], p['tex'], 4), np.uint8)
    for i, v in enumerate(frames_v):
        ch, k = divmod(i, g * g); r, col = divmod(k, g)
        q = (np.clip(v, 0, 1) * 255 + 0.5).astype(np.uint8)
        q[:PAD] = 0; q[-PAD:] = 0; q[:, :PAD] = 0; q[:, -PAD:] = 0
        tex[r * c:(r + 1) * c, col * c:(col + 1) * c, ch] = q
    return tex


def cutout(frames_v, size=512):
    u = np.zeros_like(frames_v[0])
    for v in frames_v: u = np.maximum(u, v)
    m = (u >= 3 / 255).astype(np.uint8) * 255
    m = cv2.resize(m, (size, size), interpolation=cv2.INTER_AREA)
    m = cv2.dilate((m > 0).astype(np.uint8) * 255, np.ones((7, 7), np.uint8))
    return m


CACHE = {}


def export(out, P, expo_hint=None):
    os.makedirs(out, exist_ok=True); CACHE.clear()
    sh = Y.Shell(P)
    # 曝光：和考卷同一个（考卷按实拍 +1.0 s 线亮度对齐、线亮度已与分辨率无关），保证导出的贴图就是考过的那个画面
    import 试渲 as T
    _, expo, _ = T.run('/tmp/_expo', P, [1.0], save=False)
    if expo_hint is not None: expo = expo_hint
    plans = {}
    # 用最终曝光重新定有内容的时段
    for L in ('O', 'G'): plans[L] = plan_layer(sh, L, expo)
    meta = {'name': NAME, 'expo': expo, 'layers': {}}
    for plat in ('pc', 'mobile'):
        p = PLAT[plat]; per = p['grid'] ** 2 * 4
        emitters = []; textures = {}; materials = {}
        for L, label in (('O', 'Hiki'), ('G', 'Nishiki')):
            fr, H = plans[L]
            rp = f'T_{NAME}_{label}_Ramp.png'
            ramp_png(os.path.join(out, rp), L)
            textures[f'ramp_{L}'] = {'file': rp, 'class': 'ramp'}
            nseg = math.ceil(len(fr) / per)
            for sidx in range(nseg):
                seg = fr[sidx * per:(sidx + 1) * per]; Hs = H[sidx * per:(sidx + 1) * per]
                key0 = (L, sidx)
                if plat == 'pc':
                    gain = 1.0 if L == 'O' else Y.G_GAIN
                    vs = [1 - np.exp(-layer_img(sh, L, t, h, p['cell'], fps=f) * expo * gain) for (t, f), h in zip(seg, Hs)]
                    CACHE[key0] = vs
                else:   # 手机：同一批帧按面积缩到 256（同一模拟、同一曝光；检查单独做）
                    vs = [cv2.resize(v.astype(np.float32), (p['cell'], p['cell']), interpolation=cv2.INTER_AREA) for v in CACHE[key0]]
                suf = '' if plat == 'pc' else '_M'
                tn = f'T_{NAME}_{label}_{chr(65 + sidx)}{suf}.png'; cn = f'T_{NAME}_{label}_{chr(65 + sidx)}{suf}_Cutout.png'
                Image.fromarray(pack(vs, plat), 'RGBA').save(os.path.join(out, tn))
                Image.fromarray(cutout(vs)).save(os.path.join(out, cn))
                key = f'{L}{sidx}'
                textures['seq_' + key] = {'file': tn, 'class': 'flipbook', 'cols': p['grid'], 'rows': p['grid'], 'channels': 4, 'frames': len(seg)}
                textures['cut_' + key] = {'file': cn, 'class': 'cutout'}
                materials[key] = {'role': 'flipbook_rgba', 'textures': {'main': 'seq_' + key, 'ramp': f'ramp_{L}'}, 'scalars': {'rows': p['grid'], 'cols': p['grid']}}
                T0 = seg[0][0]; T1 = seg[-1][0] + 1 / seg[-1][1]; D = T1 - T0
                # 帧号曲线：每段 fps 变化处一个关键点
                kp = [[0.0, 0.0]]
                for i in range(1, len(seg)):
                    if seg[i][1] != seg[i - 1][1]: kp.append([round((seg[i][0] - T0) / D, 5), float(i)])
                kp.append([1.0, round(len(seg) - 0.01, 2)])
                Hmax = float(max(Hs))
                sz = [[round((t - T0) / D, 5), [round(h / Hmax, 4)] * 2 + [1.0]] for (t, _), h in zip(seg, Hs)]
                # Size 曲线精简：只留拐点（线性插值误差 < 0.3%）
                keep = [sz[0]]
                for i in range(1, len(sz) - 1):
                    a, b = keep[-1], sz[i + 1]; u = (sz[i][0] - a[0]) / max(b[0] - a[0], 1e-9)
                    if abs(a[1][0] + (b[1][0] - a[1][0]) * u - sz[i][1][0]) > 0.003: keep.append(sz[i])
                keep.append([1.0, sz[-1][1]])
                emitters.append({
                    'name': f'{label}_{chr(65 + sidx)}', 'material': key, 'gpu': False,
                    'required': {'screen_alignment': 'Rectangle', 'duration_s': round(D, 4), 'loops': 1, 'delay_s': round(T0, 4), 'cutout': 'cut_' + key, 'max_draw_count': 1},
                    'spawn': {'rate': {'const': 0}, 'bursts': [[0, 1]]},
                    'modules': [
                        {'m': 'Lifetime', 'Lifetime': {'const': round(D, 4)}},
                        {'m': 'InitialSize', 'StartSize': {'const': [round(2 * Hmax * 100, 2), round(2 * Hmax * 100, 2), 1.0]}},
                        {'m': 'InitialLocation', 'StartLocation': {'const': [0.0, 0.0, 0.0]}},
                        {'m': 'SizeByLife', 'LifeMultiplier': {'curve': keep}, 'MultiplyX': True, 'MultiplyY': True, 'MultiplyZ': False},
                        {'m': 'DynamicParameter', 'params': {'frame': {'curve': kp}}},
                        {'m': 'ColorOverLife', 'ColorOverLife': {'curve': [[0.0, [Y.COL if L == 'O' else Y.COL_G] * 3], [1.0, [Y.COL if L == 'O' else Y.COL_G] * 3]]}, 'AlphaOverLife': {'const': 1}},
                    ]})
                meta['layers'].setdefault(plat, []).append({'emitter': emitters[-1]['name'], 'frames': len(seg), 't0': T0, 't1': T1,
                                                            'fps': sorted({f for _, f in seg}), 'H_m': [round(float(Hs[0]), 1), round(Hmax, 1)]})
        fp = hashlib.sha1(json.dumps(P, sort_keys=True).encode()).hexdigest()[:8]
        cj = {'format': 'fwl.cascade/1', 'name': NAME, 'platform': plat,
              'source': {'tool': 'experiments/引线 原型（对话框7，4.0 期间；未进烘焙器）', 'export': f'{NAME}@{fp}'},
              'textures': textures, 'materials': materials,
              'system': {'preview_distance_cm': 100000, 'preview_warmup_s': 0.0}, 'emitters': emitters}
        json.dump(cj, open(os.path.join(out, 'cascade.json' if plat == 'pc' else 'cascade_mobile.json'), 'w'), ensure_ascii=False, indent=1)
    meta['params'] = P; meta['fingerprint'] = fp
    json.dump(meta, open(os.path.join(out, '导出清单.json'), 'w'), ensure_ascii=False, indent=1)
    return meta


if __name__ == '__main__':
    out = sys.argv[1]
    P = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else json.load(open(os.path.join(HERE, '考卷', '搜索结果.json')))['最好']
    if '最好' in P: P = P['最好']
    m = export(out, P)
    print(json.dumps(m['layers'], ensure_ascii=False, indent=1)); print('expo', m['expo'])
