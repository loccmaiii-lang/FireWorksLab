"""升空尾缀的测量：实拍和模拟用同一套代码。

- ref_frame(video, t)      读原始分辨率的一帧，线性化后扣背景（开头几帧中值），找星头
- straighten(sig, head)    沿尾迹中心线逐行拉直成竖条（星头在顶端），并返回中心线
- profile(strip, line)     沿长度 24 段：亮度占比、宽度、颗粒度、亮点密度、颜色；中心线的大/小尺度摆动
所有长度都除以尾迹长度（亮度累积到 97% 的位置），和拍摄距离、分辨率无关。
"""
import numpy as np, cv2

NB = 24


def lin(bgr):
    return (bgr.astype(np.float32) / 255.0) ** 2.2


def read_frames(path, t_list):
    """背景 = 整段均匀取 15 帧的中值（尾迹在移动，中值里没有它；片头就有尾迹的视频也适用）"""
    cap = cv2.VideoCapture(path); fps = cap.get(5) or 30; N = int(cap.get(7)); want = {int(round(t * fps)): t for t in t_list}
    pick = set(np.linspace(0, N - 1, 15).astype(int).tolist())
    bgs, out, i = [], {}, 0
    while True:
        ok, f = cap.read()
        if not ok: break
        if i in pick: bgs.append(lin(f))
        if i in want: out[want[i]] = lin(f)
        i += 1
    return np.median(np.stack(bgs), 0), out, fps


def signal(f, bg):
    """扣背景后的线性 RGB 信号；再减掉大尺度（被照亮的烟、天空渐变）"""
    s = np.clip(f - bg, 0, None)
    return np.clip(s - cv2.GaussianBlur(s, (0, 0), 25), 0, None)


def find_head(sig, thr_frac=0.25, xr=None):
    """尾迹 = 纵向最长的亮连通块（火星间隙用膨胀连起来）；星头 = 它的最高点。
    同时把信号限制在这个连通块附近，去掉地面灯光、别的烟花、噪点。返回 (星头, 清理后的信号)"""
    y = sig.sum(2); yb = cv2.GaussianBlur(y, (0, 0), 1.5)
    thr = np.percentile(yb, 99.99) * thr_frac
    m = (yb > thr * 0.12).astype(np.uint8)
    if xr is not None: m[:, :xr[0]] = 0; m[:, xr[1]:] = 0
    md = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 21)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(md, connectivity=8)
    k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_HEIGHT] * (st[1:, cv2.CC_STAT_HEIGHT] > 2 * st[1:, cv2.CC_STAT_WIDTH])))
    comp = (lab == k)
    ys, xs = np.nonzero(comp & (yb > thr)) if (comp & (yb > thr)).any() else np.nonzero(comp)
    i = np.argmin(ys); y0 = ys[i]; sel = ys < y0 + 6
    keep = cv2.dilate(comp.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(np.float32)
    return (float(np.median(xs[sel])), float(y0)), sig * keep[..., None]


def straighten(sig, head, maxlen=900, half=40):
    """从星头往下逐行找中心线（亮度加权，窗口跟随），拉直成 (maxlen, 2*half+1, 3) 的竖条"""
    H, W, _ = sig.shape; hx, hy = head; Y = sig.sum(2)
    cx = hx; line = []
    for r in range(maxlen):
        yy = int(hy) - 3 + r
        if yy >= H: line.append(np.nan); continue
        x0, x1 = int(max(0, cx - 18)), int(min(W, cx + 19)); row = Y[yy, x0:x1]
        if row.sum() > 1e-4:
            c = x0 + (row * np.arange(len(row))).sum() / row.sum(); cx = 0.7 * cx + 0.3 * c
        line.append(cx)
    line = np.array(line); ok = ~np.isnan(line)
    line[~ok] = np.interp(np.nonzero(~ok)[0], np.nonzero(ok)[0], line[ok]) if ok.any() else hx
    ls = cv2.GaussianBlur(line.reshape(-1, 1).astype(np.float32), (1, 0), 4).ravel()
    strip = np.zeros((maxlen, 2 * half + 1, 3), np.float32)
    for r in range(maxlen):
        yy = int(hy) - 3 + r
        if yy >= H: break
        xs = ls[r] + np.arange(-half, half + 1)
        for c in range(3): strip[r, :, c] = np.interp(xs, np.arange(W), sig[yy, :, c], left=0, right=0)
    return strip, line


def trail_length(strip):
    rs = strip.sum((1, 2)); cs = np.cumsum(rs)
    return int(np.searchsorted(cs, 0.97 * cs[-1])) + 1


def profile(strip, line, L=None):
    L = L or trail_length(strip)
    Y = strip.sum(2); half = (strip.shape[1] - 1) / 2; xs = np.arange(strip.shape[1]) - half
    tot = Y[:L].sum() + 1e-9; out = dict(L=L, I=[], w=[], grain=[], peaks=[], rg=[], bg=[], lev=[])
    p995 = np.percentile(Y[:L], 99.5) + 1e-9
    # 颗粒度：亮度图减去其沿长度方向的平滑（尺度 = 3% 长度）后的能量占比；亮点：局部极大值个数
    sm = cv2.GaussianBlur(Y, (0, 0), max(1.0, 0.03 * L))
    dil = cv2.dilate(Y, np.ones((5, 5), np.uint8))
    pk = (Y >= dil) & (Y > 0.08 * np.percentile(Y[:L], 99.5))
    for b in range(NB):
        a, e = int(b * L / NB), max(int((b + 1) * L / NB), int(b * L / NB) + 1)
        seg = Y[a:e]; s = seg.sum() + 1e-9
        out['I'].append(float(s / tot * NB))
        out['w'].append(float(np.sqrt((seg.sum(0) * xs ** 2).sum() / s) / L))
        out['grain'].append(float(np.abs(seg - sm[a:e]).sum() / s))
        out['peaks'].append(float(pk[a:e].sum() / max(1, e - a) * L / 100))
        vis = seg[seg > 0.05 * p995]                                  # 看上去有多亮：可见像素的 80 分位 / 全条 99.5 分位（含相机饱和）
        out['lev'].append(float(min(1.0, np.percentile(vis, 80) / p995)) if vis.size > 3 else 0.0)
        rgb = strip[a:e].reshape(-1, 3).sum(0) + 1e-9
        out['rg'].append(float(rgb[2] / rgb[1])); out['bg'].append(float(rgb[0] / rgb[1]))   # BGR：R/G、B/G
    c = line[:L] - cv2.GaussianBlur(line[:L].reshape(-1, 1).astype(np.float32), (1, 0), max(2, 0.25 * L)).ravel()
    big = cv2.GaussianBlur(line[:L].reshape(-1, 1).astype(np.float32), (1, 0), max(2, 0.06 * L)).ravel()
    big = big - np.linspace(big[0], big[-1], len(big))
    small = line[:L] - cv2.GaussianBlur(line[:L].reshape(-1, 1).astype(np.float32), (1, 0), max(1.5, 0.02 * L)).ravel()
    out['wave_big'] = float(np.std(big) / L); out['wave_small'] = float(np.std(small) / L)
    out['head_w'] = float(np.sqrt((Y[:max(3, int(0.02 * L))].sum(0) * xs ** 2).sum() / (Y[:max(3, int(0.02 * L))].sum() + 1e-9)) / L)
    return out


def render_strip(img):
    """把模拟的彩色线性图（星头在顶端中间）当作「信号」直接拉直"""
    return img


def loss(pr, ps, w=None):
    w = dict(w or dict(I=3, w=3, grain=2, peaks=1, col=2, wave=2))
    f = lambda k: np.array(pr[k]); g = lambda k: np.array(ps[k])
    L = 0; parts = {}
    parts['I'] = float(np.mean((f('I') - g('I')) ** 2)); parts['w'] = float(np.mean(((f('w') - g('w')) / (np.mean(f('w')) + 1e-6)) ** 2))
    parts['grain'] = float(np.mean((f('grain') - g('grain')) ** 2)); parts['peaks'] = float(np.mean((np.log((f('peaks') + .3) / (g('peaks') + .3))) ** 2))
    parts['col'] = float(np.mean((f('rg') - g('rg')) ** 2 + (f('bg') - g('bg')) ** 2))
    if 'lev' in pr and 'lev' in ps: parts['lev'] = float(np.mean((f('lev') - g('lev')) ** 2)); w.setdefault('lev', 4)
    parts['wave'] = float((np.log((pr['wave_big'] + 1e-3) / (ps['wave_big'] + 1e-3))) ** 2 * 0.3 + (np.log((pr['wave_small'] + 1e-3) / (ps['wave_small'] + 1e-3))) ** 2 * 0.3)
    for k, v in parts.items(): L += w.get(k, 1) * v
    return L, parts
