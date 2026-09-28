"""升空尾缀第三版：从烘焙器导出的贴图做每档的单独预览视频、实拍对照视频和三档强弱对比图。
  python trail_video.py <导出目录>        （目录下是 RiseTrail_S / _M / _L 三个子目录，里面是烘焙器导出的文件）
着色与烘焙器预览相同：颜色 = 渐变图(v) × v × 引擎亮度倍数 × 4，再 1 − e^(−x) 色调映射 + 轻微泛光，夜空底色。
每档输出：
  <档>_预览_消散2.1s.mp4 / _消散3.2s.mp4：① 随体特写：循环 3 圈后接消散（左：整条，中：星头附近放大）；② 引擎播放：面片沿弹道上升、到顶接消散
  <档>_实拍对照.mp4：左实拍（跟着星头、扣掉天空），右贴图；前 4 s 上升循环，后面消散（消散的实拍参考 = 青柠星开花后的尾迹）
三档：升空尾缀_三档对比.jpg（同一世界比例、各自的引擎亮度；下排拉到同样高度看造型）
"""
import os, sys, json, math, glob
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cvcompat  # noqa: F401  Windows 中文路径

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FONT_P = next((f for f in ['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc'] if os.path.exists(f)), None)
font = lambda n: ImageFont.truetype(FONT_P, n) if FONT_P else None
NAMES = {'S': '小 · 简单礼花', 'M': '中 · 金芒菊级', 'L': '大 · 四尺玉级'}
FPS = 30


class Trail:
    def __init__(self, d, key):
        name = f'RiseTrail_{key}'; self.key = key
        self.meta = json.load(open(os.path.join(d, f'{name}.json'), encoding='utf-8'))
        self.tr = self.meta['trail']; tex = self.meta['texture']
        self.cols, self.per, self.F = tex['cols'], tex['cols'] * tex['rows'], tex['frames']
        rd = lambda f: np.array(Image.open(os.path.join(d, f)).convert('RGBA')).astype(np.float32) / 255
        self.loop = rd(f'T_{name}_Loop.png'); self.fade = {30: rd(f'T_{name}_Fade30.png'), 20: rd(f'T_{name}_Fade20.png')}
        r = np.array(Image.open(os.path.join(d, f'T_{name}_Ramp.png')).convert('RGB'))[0].astype(np.float32) / 255
        self.ramp = np.where(r <= 0.04045, r / 12.92, ((r + 0.055) / 1.055) ** 2.4)
        self.gain = 4.0 * self.meta['params']['trBright']
        self.W, self.H = self.meta['spriteSizeCm'][0] / 100, self.meta['spriteSizeCm'][1] / 100
        P = self.meta['params']; self.P = P

    def cell(self, tex, f):
        cw = tex.shape[1] // self.cols; rows = self.per // self.cols; chh = tex.shape[0] // rows; c, k = divmod(int(f), self.per)
        col, row = k % self.cols, k // self.cols
        return tex[row * chh:(row + 1) * chh, col * cw:(col + 1) * cw, c]

    def color(self, v):
        return self.ramp[np.clip((v * 255).astype(int), 0, 255)] * v[..., None] * self.gain


def tone(lin, sky=None, bloom=True):
    if bloom: lin = lin + 0.2 * (0.5 * cv2.GaussianBlur(lin, (0, 0), 3) + 0.32 * cv2.GaussianBlur(lin, (0, 0), 10) + 0.18 * cv2.GaussianBlur(lin, (0, 0), 30))
    if sky is not None: lin = lin + sky
    return (np.clip(1 - np.exp(-lin), 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)


def night(h, w):
    g = np.linspace(0, 1, h)[:, None, None]
    return np.broadcast_to(np.array([.0032, .0038, .009]) * (1 - g) + np.array([.0011, .0013, .0032]) * g, (h, w, 3)).astype(np.float32).copy()


def put_text(img, items):
    im = Image.fromarray(img); d = ImageDraw.Draw(im)
    for (x, y), s, n, col in items: d.text((x, y), s, fill=col, font=font(n))
    return np.array(im)


def lin_y(meta_fit, t):
    k, v0 = meta_fit['k'], meta_fit['v0']; e = math.exp(-k * t); return (v0 + 9.81 / k) * (1 - e) / k - 9.81 * t / k


def size_y(keys, u):
    xs = [a for a, _ in keys]; ys = [b for _, b in keys]; return float(np.interp(u, xs, ys))


def preview(tr, fade_fps, out):
    """① 随体特写：循环 3 圈 + 消散；② 引擎播放：沿弹道上升 + 消散"""
    Wv, Hv = 1080, 1920; F = tr.F; Tp = tr.tr['loopSeconds']; T = tr.tr['riseSeconds']; fEnd = tr.tr['relayLoopFrame']
    nA = int(3 * Tp * FPS); nAf = int(F / fade_fps * FPS); nB = int(T * FPS); nBf = nAf
    vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*'mp4v'), FPS, (Wv, Hv))
    fit = tr.tr['riseFit']; keys = tr.tr['riseSizeByLifeY']; hb = tr.tr['pivotHead']
    title = f'升空尾缀 {NAMES[tr.key]} · 消散 {fade_fps} fps（{F / fade_fps:.1f} s）'
    ch = tr.loop.shape[0]; top = 150; dispH = Hv - top - 60; s_full = dispH / ch
    zoomRows = int(ch * 0.34); s_zoom = dispH / zoomRows
    for i in range(nA + nAf):
        if i < nA: v = tr.cell(tr.loop, int(i / FPS * F / Tp) % F); stage = f'上升循环（第 {i // int(Tp * FPS) + 1}/3 圈，第 {int(i / FPS * F / Tp) % F + 1}/{F} 帧）'
        else: j = min(F - 1, int((i - nA) / FPS * fade_fps)); v = tr.cell(tr.fade[fade_fps], j); stage = f'开花后消散（第 {j + 1}/{F} 帧，接在循环第 {fEnd + 1} 帧之后）'
        lin = tr.color(v)
        full = cv2.resize(lin, (max(2, int(lin.shape[1] * s_full)), dispH), interpolation=cv2.INTER_AREA)
        zm = cv2.resize(lin[:zoomRows], (int(lin.shape[1] * s_zoom), dispH), interpolation=cv2.INTER_CUBIC)
        fr = night(Hv, Wv); x = 60
        fr[top:top + dispH, x:x + full.shape[1]] += full; x2 = x + full.shape[1] + 80
        fr[top:top + dispH, x2:x2 + zm.shape[1]] += zm
        o = tone(fr)
        o = put_text(o, [((40, 30), title, 34, (240, 205, 140)), ((40, 80), '① 随体特写（贴图原样，镜头跟着星头）· ' + stage, 24, (200, 200, 210)),
                         ((x, top - 34), '整条', 22, (170, 170, 180)), ((x2, top - 34), f'星头附近放大 {s_zoom:.1f}×（贴图 {lin.shape[1]} px 宽）', 22, (170, 170, 180))])
        vw.write(cv2.cvtColor(o, cv2.COLOR_RGB2BGR))
    # ② 引擎播放：世界坐标，镜头不动；整段弹道放进画面
    Hw = fit['H'] * 1.12; ppm = (Hv - 200) / Hw; ground = Hv - 60
    for i in range(nB + nBf):
        t = i / FPS; fr = night(Hv, Wv)
        if t <= T:
            f = int((t % Tp) / Tp * F) % F; v = tr.cell(tr.loop, f); y = lin_y(fit, t); sy = size_y(keys, t / T); stage = f'上升 {t:.2f}/{T:.2f} s · 帧 {f + 1} · Size By Life Y {sy:.2f}'
        else:
            j = min(F - 1, int((t - T) * fade_fps)); v = tr.cell(tr.fade[fade_fps], j); y = lin_y(fit, T); sy = keys[-1][1]; stage = f'消散 {t - T:.2f} s · 帧 {j + 1}'
        w = max(2, int(round(tr.W * ppm))); h = max(2, int(round(tr.H * sy * ppm)))
        spr = cv2.resize(tr.color(v), (w, h), interpolation=cv2.INTER_AREA)
        hy = ground - y * ppm; y0 = int(round(hy - (1 - hb) * h)); x0 = Wv // 2 - w // 2
        ya, yb = max(0, y0), min(Hv, y0 + h)
        if yb > ya: fr[ya:yb, x0:x0 + w] += spr[ya - y0:yb - y0]
        o = tone(fr)
        o = put_text(o, [((40, 30), title, 34, (240, 205, 140)), ((40, 80), '② 引擎播放（面片沿拟合弹道上升，速度朝向；镜头不动）· ' + stage, 24, (200, 200, 210)),
                         ((40, ground + 10), f'地面 · 开花高度 {fit["H"]:.0f} m', 20, (150, 150, 160))])
        cv2.line(o, (0, ground), (Wv, ground), (60, 60, 70), 1)
        vw.write(cv2.cvtColor(o, cv2.COLOR_RGB2BGR))
    vw.release()


def cmp_expo(tr, refs):
    """对照视频的显示曝光：实拍是 8 位相机画面（亮段过曝）。贴图按同样的口径曝光——
    选一个倍数，使可见像素（>20/255）的 80 分位与实拍相同。只影响对照视频的显示，不改贴图。"""
    tgt = np.median([np.percentile(r.max(2)[r.max(2) > 20], 80) for r in refs[:30]])
    lin0 = [tr.color(tr.cell(tr.loop, f)) / tr.gain for f in range(0, tr.F, 8)]
    best, bk = 1e9, 1.0
    for k in np.geomspace(0.5, 400, 120):
        d = [(np.clip(l * k, 0, 1) ** (1 / 2.2) * 255).max(2) for l in lin0]
        p = np.median([np.percentile(x[x > 20], 80) if (x > 20).sum() > 10 else 0 for x in d])
        if abs(p - tgt) < best: best, bk = abs(p - tgt), k
    return bk


def compare(tr, out, refs, fref):
    """左：实拍（跟着星头、扣掉天空）；右：贴图（同样放大到同一显示高度）"""
    Wv, Hv = 1080, 1500; F = tr.F; Tp = tr.tr['loopSeconds']; n1 = len(refs); n2 = len(fref)
    vw = cv2.VideoWriter(out, cv2.VideoWriter_fourcc(*'mp4v'), FPS, (Wv, Hv)); dispH = Hv - 170
    for i in range(n1 + n2):
        fr = np.zeros((Hv, Wv, 3), np.uint8); fr[:] = (18, 18, 24)
        r = refs[i] if i < n1 else fref[i - n1]
        rr = cv2.resize(r, (int(r.shape[1] * dispH / r.shape[0]), dispH), interpolation=cv2.INTER_CUBIC)
        if i < n1: v = tr.cell(tr.loop, int(i / FPS * F / Tp) % F)
        else: v = tr.cell(tr.fade[20], min(F - 1, int((i - n1) / FPS * 20)))
        lin = tr.color(v) / tr.gain
        if i == 0: tr._cmpk = cmp_expo(tr, refs)                        # 和实拍同样的「相机曝光」：可见像素的 80 分位亮度对齐（实拍的星头、亮段是过曝的）
        o = (np.clip(lin * tr._cmpk, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)
        # 贴图里尾迹更长（留到最暗的火星）：按「星头到 97% 亮度」的长度对齐实拍
        oo = cv2.resize(o, (int(o.shape[1] * dispH * 1.0 / o.shape[0]), dispH), interpolation=cv2.INTER_AREA)
        x1 = 200; x2 = 620
        fr[120:120 + dispH, x1:x1 + rr.shape[1]] = rr; fr[120:120 + dispH, x2:x2 + oo.shape[1]] = oo
        fr = put_text(fr, [((40, 24), f'升空尾缀 {NAMES[tr.key]} · 实拍对照', 32, (240, 205, 140)),
                           ((x1 - 40, 80), '实拍' + ('（尾缀' + {'S': 'C', 'M': 'B', 'L': 'A'}[tr.key] + '）' if i < n1 else '（青柠星开花后）'), 22, (200, 200, 210)),
                           ((x2 - 20, 80), '贴图（烘焙器）', 22, (200, 200, 210)), ((40, Hv - 40), '上升循环' if i < n1 else '开花后消散（20 fps 版）', 22, (170, 170, 180))])
        vw.write(cv2.cvtColor(fr, cv2.COLOR_RGB2BGR))
    vw.release()


def strength(trs, out):
    """同一世界比例 + 各自亮度（上排）；拉到同样高度看造型（下排）"""
    Hm = max(t.H for t in trs.values()); ppm = 1500 / Hm
    sprs, same = [], []
    for k in 'SML':
        t = trs[k]; lin = t.color(t.cell(t.loop, 0))
        sprs.append(cv2.resize(lin, (max(2, int(t.W * ppm)), int(t.H * ppm)), interpolation=cv2.INTER_AREA))
        same.append(cv2.resize(lin, (max(2, int(lin.shape[1] * 1500 / lin.shape[0])), 1500), interpolation=cv2.INTER_AREA))
    cw = max(260, max(x.shape[1] for x in sprs + same) + 40)
    def row(xs):
        cols = []
        for x in xs:
            col = night(1600, cw); h, w = x.shape[:2]; col[40:40 + h, cw // 2 - w // 2:cw // 2 - w // 2 + w] += x; cols.append(tone(col))
        return np.hstack(cols)
    top = row(sprs); bot = row(same); img = np.vstack([top, np.full((20, top.shape[1], 3), 40, np.uint8), bot])
    items = []
    for i, k in enumerate('SML'):
        t = trs[k]; items.append(((i * cw + 10, 8), f'{NAMES[k]}', 20, (240, 205, 140)))
        items.append(((i * cw + 10, 1560), f'{t.W:.1f}×{t.H:.0f} m ×{t.P["trBright"]}', 18, (190, 190, 200)))
        items.append(((i * cw + 10, 1628), '拉到同样高度', 18, (190, 190, 200)))
    img = put_text(img, items)
    Image.fromarray(img).save(out, quality=92)


def ref_frames(k, RC):
    """实拍跟踪帧（慢：逐帧找星头、拉直），存一份缓存在系统临时目录"""
    import tempfile
    cache = os.path.join(tempfile.gettempdir(), f'fw_reftrack_{k}.npz')
    if os.path.exists(cache): return list(np.load(cache)['refs'])
    refs, _ = RC.ref_track(k, int(4 * FPS), FPS); np.savez_compressed(cache, refs=np.stack(refs)); return refs


def main(d, sizes='SML', previews=True, log=print):
    trs = {k: Trail(os.path.join(d, f'RiseTrail_{k}'), k) for k in sizes}
    import rise_trail_compare as RC
    fref = RC.fade_ref(int(3.2 * FPS), FPS)
    for k, t in trs.items():
        if previews:
            for fps in (30, 20):
                preview(t, fps, os.path.join(d, f'升空尾缀_{k}_预览_消散{64 / fps:.1f}s.mp4'))
        compare(t, os.path.join(d, f'升空尾缀_{k}_实拍对照.mp4'), ref_frames(k, RC), fref)
        log(f'{k} 视频 ok')
    if len(trs) == 3: strength(trs, os.path.join(d, '升空尾缀_三档对比.jpg'))

if __name__ == '__main__':
    main(sys.argv[1])
