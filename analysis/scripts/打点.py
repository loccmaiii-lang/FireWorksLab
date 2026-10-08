"""打点：把一发烟花的画面逐帧拆成「点 / 线 / 团」，每样量成范围（对话框新花型，用户 2026-10-08 08:58 的方法）。

用户原话（节选）：「对着拆好的帧的细节进行打点……先打点确认点或线数量与角度，粗细范围，密集范围，长短范围，明暗变化范围，
点灭状态就记录每个点的闪动频率（你每个点都有编号）……分层，记录参考视频每层转变节点……最后再比对」。

**同一把尺子**：实拍视频、我们导出的素材包、烘焙器渲染图都用这里同一套算法量，差距才有意义（绝对值有偏差——比如投影后重叠的线会少数——
两边偏差一样，差距照样可比）。每个量第一次用之前先在合成图上验（`selftest`：已知答案）。

量什么（每个时刻）：
  点（星头 / 光点）：位置、编号（跟踪时）、总光量、峰值（是否过曝）、大小（FWHM）、拉长比和方向（拖影是否顺着径向）、
                     核心颜色、光晕颜色、光晕 / 核心亮度比、离中心的距离（r / R）、颜色类
  线（放射尾）：     条数、角度、起止（r / R）、长度、宽度（px）、连续性（断不断）、成串程度（沿线亮度起伏）、
                     沿线亮度梯度（靠星头那端 / 靠里那端）、里外颜色、下垂（水平方向的线往下弯多少）
  团（芯、光晕）：   径向亮度分布、过曝半径
  时间：             跟踪编号点的亮度序列 → 闪烁幅度 / 频率 / 灭的比例；颜色变化时刻、出现 / 消失时刻的分布 → 层的转变节点
结果都给分布（p10 / 中位 / p90），不是一个数。

用法：
  python3 analysis/scripts/打点.py selftest [--out 目录]
  python3 analysis/scripts/打点.py ref <视频> --t0 <开花秒> --cx <0–1> --cy <0–1> [--times 0.3,0.4 | --step 0.0667 --t1 4]
                                       [--track 2.2:3.2 ...] [--mpp 0.4545] [--split auto|0.55] --out <目录>
  python3 analysis/scripts/打点.py pack <素材包目录> --times ... [--match <ref 的 打点.json>] [--track ...] --out <目录>   （本机：要素材包）
  python3 analysis/scripts/打点.py img <图...> --cx 像素 --cy 像素 --times ... --out <目录>          （黑底渲染图，一张一个时刻）
  python3 analysis/scripts/打点.py compare <参考 打点.json> <我们 打点.json> --out <差距.md>
输出：<目录>/打点.json、<目录>/叠图_<t>.jpg（点按颜色类圈出、编号，线画出来；放大局部）。
"""
import argparse, json, math, os, sys
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
try: import cvcompat  # noqa: F401  Windows：cv2 读写中文路径（本机任务）
except Exception: pass

# 颜色类（色相按 HSV 度数；饱和度低于 0.22 算白）
HUES = [('红', 345, 15), ('橙', 15, 38), ('金黄', 38, 62), ('柠绿', 62, 95), ('绿', 95, 160), ('青', 160, 200), ('蓝', 200, 255), ('紫', 255, 290), ('粉', 290, 345)]


def hue_class(rgb):
    r, g, b = [float(x) for x in rgb]; mx = max(r, g, b); mn = min(r, g, b)
    if mx <= 1e-6: return '暗', 0.0, 0.0
    s = (mx - mn) / mx
    if s < 0.22: return '白', 0.0, s
    if mx == r: h = (60 * (g - b) / (mx - mn)) % 360
    elif mx == g: h = 60 * (b - r) / (mx - mn) + 120
    else: h = 60 * (r - g) / (mx - mn) + 240
    for name, a, z in HUES:
        if (a <= h < z) if a < z else (h >= a or h < z): return name, h, s
    return '红', h, s


def to_lin(x):
    """0–255 的 sRGB → 线性光（0–255 量程）：颜色在线性光里相减 / 取色相，天空的蓝才不会把星的颜色带偏"""
    x = np.asarray(x, np.float32) / 255; return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4) * 255


def q(a, ps=(10, 50, 90)):
    a = np.asarray([x for x in a if x is not None and np.isfinite(x)], float)
    if not len(a): return None
    return [round(float(np.percentile(a, p)), 3) for p in ps]


# ---------------- 取帧 ----------------
def video_frames(path, t0, box=None):
    """所有「不重复」的帧（很多实拍是 30 帧容器、每帧重复一次），时间按开花起算；box = (x0, y0, x1, y1) 像素，只留花附近（省内存）"""
    try: import cvcompat  # noqa: F401  Windows 中文路径
    except Exception: pass
    cap = cv2.VideoCapture(path); fps = cap.get(cv2.CAP_PROP_FPS) or 30; out = []; prev = None; i = 0
    while True:
        ok, f = cap.read()
        if not ok: break
        if box: f = np.ascontiguousarray(f[box[1]:box[3], box[0]:box[2]])
        g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
        if prev is None or np.abs(g - prev).mean() > 0.3: out.append((i / fps - t0, f)); prev = g
        i += 1
    cap.release()
    eff = (len(out) - 1) / max(1e-6, out[-1][0] - out[0][0]) if len(out) > 1 else fps
    return out, fps, eff


# ---------------- 尺度 ----------------
def bright_mask(v, thr): return v > thr


def radius_of(v, cx, cy, thr=40):
    """外层半径（px）：去掉大范围的光（天空被照亮、光晕）以后的亮部，横向跨度（左右 3–97 分位）的一半；
    只看中心上下 0.6 R 的横带（竖直方向会混进升空尾迹和下坠）"""
    d = np.clip(v - cv2.GaussianBlur(v, (0, 0), 15), 0, None)
    ys, xs = np.nonzero(d > thr)
    if len(xs) < 30: return None
    rr = np.hypot(xs - cx, ys - cy); keep = rr < np.percentile(rr, 99.5); xs, ys, rr = xs[keep], ys[keep], rr[keep]
    r0 = np.percentile(rr, 98); band = np.abs(ys - cy) < 0.6 * r0
    if band.sum() < 20: band = np.ones_like(band)
    return float((np.percentile(xs[band], 97) - np.percentile(xs[band], 3)) / 2)


# ---------------- 点 ----------------
def detect_points(raw, sig, cx, cy, R, rmax=1.5, noise=None, lin=None):
    """星头 / 光点：平滑后的局部极大值，比周围一圈亮得多；每个点在 11×11 窗口里量光量、大小、拉长、颜色、光晕"""
    v = sig.max(2); vs = cv2.GaussianBlur(v, (0, 0), 0.8)
    if noise is None: noise = 4.0
    k5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)); mx = cv2.dilate(vs, k5)
    b13 = cv2.blur(vs, (13, 13)); b7 = cv2.blur(vs, (7, 7)); ring = (b13 * 169 - b7 * 49) / 120
    cand = (vs >= mx) & (vs > max(6 * noise, 18)) & (vs > 1.35 * ring + 3 * noise)
    H, W = v.shape; yy, xx = np.nonzero(cand)
    d = np.hypot(xx - cx, yy - cy); keep = d < rmax * R; yy, xx = yy[keep], xx[keep]
    pts = []; w = 5
    gy, gx = np.mgrid[-w:w + 1, -w:w + 1]; rr = np.hypot(gx, gy)
    for y, x in zip(yy, xx):
        if y < w or x < w or y >= H - w or x >= W - w: continue
        win = v[y - w:y + w + 1, x - w:x + w + 1]; bg = np.median(np.concatenate([win[0], win[-1], win[:, 0], win[:, -1]]))
        a = np.clip(win - bg, 0, None); a[rr > w] = 0
        tot = a.sum()
        if tot <= 0: continue
        mx_ = (a * gx).sum() / tot; my_ = (a * gy).sum() / tot
        cxx = (a * (gx - mx_) ** 2).sum() / tot; cyy = (a * (gy - my_) ** 2).sum() / tot; cxy = (a * (gx - mx_) * (gy - my_)).sum() / tot
        tr = cxx + cyy; det = cxx * cyy - cxy ** 2; disc = math.sqrt(max(0.0, tr * tr / 4 - det))
        l1, l2 = tr / 2 + disc, max(1e-3, tr / 2 - disc)
        ang = 0.5 * math.atan2(2 * cxy, cxx - cyy)       # 长轴方向
        rad = math.atan2(y - cy, x - cx); dev = abs(((ang - rad) + math.pi / 2) % math.pi - math.pi / 2)     # 长轴和径向的夹角（0 = 顺着径向）
        csrc = lin if lin is not None else sig      # 颜色按线性光取（实拍：线性光里减去天空）
        core = csrc[y - 1:y + 2, x - 1:x + 2].reshape(-1, 3).mean(0)
        # 径向亮度（按亚像素中心，0.5 px 一格）：核心大小 = 降到峰值一半的半径 × 2；光晕 = 半宽 2 倍以外的能量占比（和烘焙器「光晕能量占比」同一个意思）
        W2 = 7
        if y < W2 or x < W2 or y >= H - W2 or x >= W - W2: continue
        big = v[y - W2:y + W2 + 1, x - W2:x + W2 + 1] - bg; gy2, gx2 = np.mgrid[-W2:W2 + 1, -W2:W2 + 1]; d = np.hypot(gx2 - mx_, gy2 - my_)
        nb = 2 * W2; prof = np.array([big[(d >= i * 0.5) & (d < i * 0.5 + 0.5)].mean() if ((d >= i * 0.5) & (d < i * 0.5 + 0.5)).any() else 0 for i in range(nb)])
        pk_ = max(1e-6, prof[:2].max()); below = np.nonzero(prof < 0.5 * pk_)[0]
        hw = 0.5 * (below[0] - 0.5 + (prof[below[0] - 1] - 0.5 * pk_) / max(1e-6, prof[below[0] - 1] - prof[below[0]])) if len(below) and below[0] > 0 else 0.5
        fw = max(0.5, 2 * hw)
        inside = np.clip(big, 0, None)[d <= W2].sum(); corepart = np.clip(big, 0, None)[d <= 2 * hw].sum()
        halo_ratio = float(max(0.0, inside - corepart) / max(1e-6, inside))
        r1 = max(1.5, 2 * hw); r2 = min(W2, 2.0 * r1)
        sw = csrc[y - W2:y + W2 + 1, x - W2:x + W2 + 1]; ann = (d >= r1) & (d <= r2)
        halo = sw[ann].mean(0) if ann.any() else core
        edge = d >= W2 - 1.0; own = np.clip(core - np.median(sw[edge], 0), 0, None) if edge.any() else core     # 点自己的颜色：中心减掉周围底光（亮芯 / 光晕上的点不被底光染色）
        satur = bool(raw[y, x].max() >= 250)
        # 线中间的亮点（不是星头）：顺着长轴前后 3 px 还和它差不多亮 → 线的一部分
        ca, sa = math.cos(ang), math.sin(ang); pk0 = vs[y, x]
        along = [vs[int(round(y + k * sa)), int(round(x + k * ca))] for k in (-3, 3) if 0 <= int(round(y + k * sa)) < H and 0 <= int(round(x + k * ca)) < W]
        on_line = bool(math.sqrt(l1 / l2) > 1.5 and along and min(along) > 0.55 * pk0)
        core = core[::-1]; halo = halo[::-1]; own = own[::-1]      # BGR → RGB
        cls, h, s = hue_class(halo if halo.max() > (2 if lin is not None else 8) else core)
        pts.append(dict(x=round(float(x + mx_), 2), y=round(float(y + my_), 2), r=round(float(np.hypot(x - cx, y - cy) / R), 3), flux=round(float(tot), 1), peak=round(float(vs[y, x]), 1),
                        sat=satur, fwhm=round(fw, 2), elong=round(math.sqrt(l1 / l2), 2), dev=round(math.degrees(dev), 1),
                        core=[round(float(c), 1) for c in core], halo=[round(float(c), 1) for c in halo], own=[round(float(c), 1) for c in own], halo_ratio=None if halo_ratio is None else round(halo_ratio, 3),
                        cls=cls, hue=round(h, 1), satu=round(s, 3), glare=bool(ring[y, x] > 200), on_line=on_line))
        pts[-1]['grp'] = color_group(pts[-1])
    # 合并太近的（< 2.5 px），留亮的
    pts.sort(key=lambda p: -p['flux']); out = []
    for p in pts:
        if all((p['x'] - o['x']) ** 2 + (p['y'] - o['y']) ** 2 > 6.25 for o in out[-400:]): out.append(p)
    return out


def point_stats(pts, sel=None):
    P0 = [p for p in pts if (sel is None or sel(p))]; P = [p for p in P0 if not p.get('on_line')]
    if not P: return dict(n=0, n_on_line=len(P0))
    fl = [p['flux'] for p in P if not p['glare']]
    st = dict(n=len(P), n_on_line=len(P0) - len(P), n_sat=sum(p['sat'] for p in P), flux=q(fl), flux_spread=None, fwhm=q([p['fwhm'] for p in P if not p['glare']]),
              elong=q([p['elong'] for p in P if not p['glare']]), halo_ratio=q([p['halo_ratio'] for p in P if not p['glare']]),
              r=q([p['r'] for p in P]), cls={})
    if len(fl) > 8: st['flux_spread'] = round(float(np.percentile(fl, 90) / max(1e-6, np.percentile(fl, 10))), 2)
    el = [p for p in P if p['elong'] > 1.4 and not p['glare']]
    st['streak_frac'] = round(len(el) / len(P), 3)
    st['streak_radial'] = round(float(np.mean([p['dev'] < 25 for p in el])), 3) if el else None     # 拉长的点有多少是顺着径向（拖影）
    for p in P: st['cls'][p['cls']] = st['cls'].get(p['cls'], 0) + 1
    st['cls'] = {k: round(v / len(P), 3) for k, v in sorted(st['cls'].items(), key=lambda kv: -kv[1])}
    cs = [p['core'] for p in P if not p['glare']]; hs = [p['halo'] for p in P if not p['glare']]
    if cs:
        c = np.mean(cs, 0); h = np.mean(hs, 0); st['core_rgb'] = [round(float(x), 1) for x in c]; st['halo_rgb'] = [round(float(x), 1) for x in h]
        st['core_cls'] = hue_class(c)[0]; st['halo_cls'] = hue_class(h)[0]; st['core_sat'] = round(hue_class(c)[2], 3); st['halo_sat'] = round(hue_class(h)[2], 3)
    return st


# 点按颜色分组（用户 2026-10-08 14:25：芯边淡紫点在金丝外面一圈往外飞，以前点只按里 / 外分区，淡紫点和金丝上的亮点、投影进来的外层星混在一起，只比了大小）
GROUPS = ('白', '淡紫', '金橙', '柠绿', '其它')
def color_group(p):
    """线性光 RGB：点自己的颜色（中心减周围底光；实拍还减了天空），核心过曝就看光晕。白 = 三个通道都接近；淡紫 / 粉 = 蓝、红都不比绿弱；金橙 = 红明显大于绿；柠绿 = 绿最大且远大于蓝"""
    c = np.asarray(p['halo'] if p.get('sat') else p.get('own', p['core']), float); m = c.max()
    if m < 2 and not p.get('sat'): c = np.asarray(p['core'], float); m = c.max()
    if m < 2: return '其它'
    r, g, b = c / m
    if min(r, g, b) >= 0.82: return '白'
    if b >= 0.9 * g and r >= 0.7 * g: return '淡紫'
    if r >= 1.15 * g and g >= 0.9 * b: return '金橙'
    if g >= 0.95 * r and g >= 1.2 * b: return '柠绿'
    return '其它'


def group_stats(pts):
    """每个颜色组：个数、离中心距离 r / R（p10 / 中位 / p90）、大小、亮度"""
    out = {}
    for gname in GROUPS:
        P = [p for p in pts if not p.get('on_line') and not p['glare'] and p.get('grp', color_group(p)) == gname]
        if P: out[gname] = dict(n=len(P), r=q([p['r'] for p in P]), fwhm=q([p['fwhm'] for p in P]), flux=q([p['flux'] for p in P]))
    return out


# ---------------- 线 ----------------
def polar(img, cx, cy, Rp, NR, A):
    """极坐标展开（行 = 角度，列 = 半径）。WARP_FILL_OUTLIERS + 夹到原图范围：不加时 OpenCV 偶尔把画面外的格子留成未初始化的内存（巨大的数）"""
    src = np.ascontiguousarray(img, dtype=np.float32)
    P = cv2.warpPolar(src, (NR, A), (float(cx), float(cy)), Rp, cv2.WARP_POLAR_LINEAR | cv2.WARP_FILL_OUTLIERS | cv2.INTER_LINEAR)
    return np.clip(np.nan_to_num(P, nan=0.0, posinf=0.0, neginf=0.0), 0, float(src.max()) if src.size else 0)


def detect_lines(img1, cx, cy, R, r0=0.12, r1=1.2, min_len=0.08, noise=4.0, color=None):
    """放射线：极坐标展开（行 = 角度，列 = 半径），每个半径上找角向的峰，沿半径连起来成一条线"""
    Rp = r1 * R; A = int(max(360, 2 * math.pi * R)); NR = int(Rp)
    P = polar(img1, cx, cy, Rp, NR, A)     # (A, NR)
    Pc = polar(color, cx, cy, Rp, NR, A) if color is not None else None
    Ps = cv2.GaussianBlur(P, (1, 3), 0.7)
    j0 = int(r0 * R); ridges = []; active = []
    thr0 = max(6 * noise, 15)
    for j in range(j0, NR):
        col = Ps[:, j]; lo = np.minimum(np.roll(col, 3), np.roll(col, -3))
        pk = np.nonzero((col > np.roll(col, 1)) & (col >= np.roll(col, -1)) & (col > thr0) & (col - lo > 0.25 * col))[0]
        arc = 2 * math.pi * (j + 0.5) / A    # 1 个角度格在这个半径上多少像素
        new_active = []; used = set()
        for rd in active:
            if j - rd['jlast'] > 3: ridges.append(rd); continue
            if len(pk) == 0: new_active.append(rd); continue
            dd = np.abs(((pk - rd['alast']) + A / 2) % A - A / 2)
            k = int(np.argmin(dd))
            if dd[k] <= max(2.0, 1.5 / max(arc, 1e-3)) and k not in used:
                used.add(k); a = int(pk[k]); rd['js'].append(j); rd['as'].append(a); rd['I'].append(float(col[a]))
                half = col[a] / 2; l = a; r = a
                while col[(l - 1) % A] > half and a - l < 30: l -= 1
                while col[(r + 1) % A] > half and r - a < 30: r += 1
                rd['w'].append((r - l + 1) * arc)
                if Pc is not None: rd['c'].append(Pc[a, j].tolist())
                rd['alast'] = a; rd['jlast'] = j
            new_active.append(rd)
        for k, a in enumerate(pk):
            if k in used: continue
            half = col[a] / 2; l = a; r = a
            while col[(l - 1) % A] > half and a - l < 30: l -= 1
            while col[(r + 1) % A] > half and r - a < 30: r += 1
            new_active.append(dict(js=[j], as_=None, **{'as': [int(a)]}, I=[float(col[a])], w=[(r - l + 1) * arc], c=[Pc[a, j].tolist()] if Pc is not None else [], alast=int(a), jlast=j))
        active = new_active
    ridges += active
    out = []
    for rd in ridges:
        js = np.array(rd['js']); L = (js[-1] - js[0] + 1)
        if L < min_len * R or len(js) < 4: continue
        I = np.array(rd['I']); n = len(I); third = max(1, n // 3)
        sm = np.convolve(I, np.ones(5) / 5, 'same') if n >= 7 else I
        bead = float(np.std(I[2:-2] / np.maximum(1e-6, sm[2:-2]))) if n >= 7 else None
        ang = np.array(rd['as']) * 360.0 / A; drift = float(((ang[-1] - ang[0]) + 180) % 360 - 180)
        th = math.radians(np.median(ang)); x0 = cx + js[0] * math.cos(th); y0 = cy + js[0] * math.sin(th)
        # 下垂：用靠里那三分之一定线的方向，外推到外端，外端比外推的低多少（图像 y 向下为正）÷ 线长；只算水平方向的线（|cos| > 0.7）
        horiz = abs(math.cos(th)) > 0.7
        sag = None
        if horiz and n >= 9:
            phis = np.radians(ang); xs = cx + js * np.cos(phis); ys = cy + js * np.sin(phis)
            k3 = max(3, n // 3); A_ = np.polyfit(xs[:k3], ys[:k3], 1) if np.ptp(xs[:k3]) > 1 else None
            if A_ is not None: sag = float((ys[-1] - np.polyval(A_, xs[-1])) / L)
        c_in = np.mean(rd['c'][:third], 0).tolist() if rd['c'] else None; c_out = np.mean(rd['c'][-third:], 0).tolist() if rd['c'] else None
        out.append(dict(angle=round(float(np.median(ang)), 1), r0=round(js[0] / R, 3), r1=round(js[-1] / R, 3), len=round(L / R, 3), len_px=int(L),
                        width=round(float(np.median(rd['w'])), 2), cont=round(n / L, 3), bead=None if bead is None else round(bead, 3),
                        grad=round(float(I[-third:].mean() / max(1e-6, I[:third].mean())), 3), I=round(float(np.median(I)), 1),
                        drift=round(drift, 2), sag=None if sag is None else round(sag, 4),
                        c_in=None if c_in is None else hue_class(c_in)[0], c_out=None if c_out is None else hue_class(c_out)[0],
                        h_in=None if c_in is None else round(hue_class(c_in)[1], 1), h_out=None if c_out is None else round(hue_class(c_out)[1], 1),
                        x0=round(x0, 1), y0=round(y0, 1), x1=round(cx + js[-1] * math.cos(th), 1), y1=round(cy + js[-1] * math.sin(th), 1)))
    return out


def line_texture(img1, cx, cy, R, color=None, r1=1.45):
    """密的放射线（成百条叠在一起、一根根分不开）按纹理量：线带在哪、多厚（≈ 线长）、线多粗、多少条、沿半径连不连续、成不成串、亮度和颜色里外怎么变。
    极坐标展开后，每个半径上沿角度做高通（减掉 ~9° 的滑动平均），线就是高通里的峰"""
    Rp = r1 * R; A = int(max(720, 2 * math.pi * R)); NR = int(Rp)
    P = polar(img1, cx, cy, Rp, NR, A)
    ang = np.arange(A) * 360.0 / A; keep = ~((ang > 60) & (ang < 120))       # 正下方（升空尾迹）不要
    Pk = P[keep]; w = max(5, A // 40) | 1
    hp = Pk - cv2.blur(Pk, (1, w), borderType=cv2.BORDER_REFLECT)
    E = hp.std(0); M = Pk.mean(0)
    j0 = int(0.08 * R)
    if E[j0:].max() <= 1e-6 or M[j0:].max() <= 1e-6: return dict(n=0)
    # 线带：角向平均亮度降到峰值一半的里外半径（密线时每条线都从星头往里拖，线带厚度 ≈ 线长）
    Ms = np.convolve(M, np.ones(9) / 9, 'same'); jM = j0 + int(np.argmax(Ms[j0:])); half = 0.5 * Ms[jM]
    a_ = jM; b_ = jM
    while a_ > j0 and Ms[a_ - 1] >= half: a_ -= 1
    while b_ < NR - 1 and Ms[b_ + 1] >= half: b_ += 1
    Es = np.convolve(E, np.ones(9) / 9, 'same'); jm = a_ + int(np.argmax(Es[a_:b_ + 1]))      # 线最清楚的半径（在线带里）
    arc = 2 * math.pi * jm / A
    prof = hp[:, jm]; f = np.fft.rfft(prof - prof.mean()); ac = np.fft.irfft(f * np.conj(f), n=len(prof)); ac = ac / max(1e-9, ac[0])
    lag = next((i for i in range(1, 60) if ac[i] <= 0.5), 60); width = math.sqrt(2) * lag * arc
    ps = np.convolve(prof, [0.25, 0.5, 0.25], 'same'); sd = ps.std()
    pk = np.nonzero((ps > np.roll(ps, 1)) & (ps >= np.roll(ps, -1)) & (ps > 0.5 * sd))[0]
    n = int(round(len(pk) * 360.0 / (keep.sum() * 360.0 / A)))
    def coh(step):
        d = 0
        while 0 <= jm + (d + 1) * step < NR and d < NR:
            c = np.corrcoef(prof, hp[:, jm + (d + 1) * step])[0, 1]
            if not np.isfinite(c) or c < 0.5: break
            d += 1
        return d
    cin, cout = coh(-1), coh(1)
    beads, grads, cin_, cout_ = [], [], [], []
    Pc = polar(color, cx, cy, Rp, NR, A)[keep] if color is not None else None
    L = b_ - a_ + 1; th = max(1, L // 3)
    for a in pk[:400]:
        seg = Pk[max(0, a - 1):a + 2, a_:b_ + 1].max(0)
        if len(seg) >= 9:
            sm = np.convolve(seg, np.ones(7) / 7, 'same'); beads.append(float(np.std(seg[3:-3] / np.maximum(1e-6, sm[3:-3]))))
            grads.append(float(seg[-th:].mean() / max(1e-6, seg[:th].mean())))
        if Pc is not None: cin_.append(Pc[a, a_:a_ + th].mean(0)); cout_.append(Pc[a, b_ - th + 1:b_ + 1].mean(0))
    hc = lambda c: (hue_class(c)[0], round(hue_class(c)[1], 1), round(hue_class(c)[2], 3)) if c is not None else None
    bd = texture_bend(img1, cx, cy, R, max(0.06, a_ / R), b_ / R) if (b_ - a_) / R >= 0.1 else None
    return dict(**({k: bd[k] for k in ('tilt', 'tilt_c', 'bend', 'bend0', 'rad_dx', 'rad_dy')} if bd else {}),
                n=n, r_in=round(a_ / R, 3), r_out=round(b_ / R, 3), thick=round(L / R, 3), r_peak=round(jm / R, 3), width_px=round(width, 2),
                coh_in=round(cin / R, 3), coh_out=round(cout / R, 3), bead=round(float(np.median(beads)), 3) if beads else None,
                grad=round(float(np.median(grads)), 3) if grads else None, contrast=round(float(E[jm] / max(1e-6, M[jm])), 3), level=round(float(M[jm]), 1),
                c_in=hc(np.mean(cin_, 0)) if cin_ else None, c_out=hc(np.mean(cout_, 0)) if cout_ else None)


def texture_bend(v, cx, cy, R, r0, r1, sect=40):
    """密线弯不弯（用户 2026-10-08 14:25：「白芯还是有重力」，以前密线只量位置 / 粗细 / 成串，没量弯曲）。
    结构张量求每个像素的线方向；
      rad_dx / rad_dy：所有线反向延长最集中的那一点（放射中心）相对给定中心的偏移（/R，图像向下为正）——中心估偏了会让直线看起来「歪」，先把它分出来；
      tilt：左右两侧（±sect°）线方向和径向（相对放射中心）的夹角，往下为正（°）；
      bend：外半圈 tilt − 里半圈 tilt（°）——重力让线越往外越往下弯，中心偏差不会随半径变大，这一项只认弯曲。
    正下方 60–120°（升空尾迹）不算。"""
    g = cv2.GaussianBlur(np.asarray(v, np.float32), (0, 0), 1.0)
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    Jxx = cv2.GaussianBlur(gx * gx, (0, 0), 2.5); Jyy = cv2.GaussianBlur(gy * gy, (0, 0), 2.5); Jxy = cv2.GaussianBlur(gx * gy, (0, 0), 2.5)
    ang = 0.5 * np.arctan2(2 * Jxy, Jxx - Jyy) + np.pi / 2
    coh = np.sqrt((Jxx - Jyy) ** 2 + 4 * Jxy ** 2) / (Jxx + Jyy + 1e-6)
    H, W = g.shape; yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); rr = np.hypot(xx - cx, yy - cy) / R
    th0 = np.degrees(np.arctan2(yy - cy, xx - cx)); ring = (rr > r0) & (rr < r1) & ~((th0 > 60) & (th0 < 120))
    if ring.sum() < 200: return None
    thr = 0.15 * np.percentile(g[ring], 99); m = ring & (coh > 0.25) & (g > thr)
    if m.sum() < 200: return None
    w = (coh * g)[m]; px, py = xx[m], yy[m]; ux, uy = np.cos(ang[m]), np.sin(ang[m]); nx, ny = -uy, ux
    A = np.array([[np.sum(w * nx * nx), np.sum(w * nx * ny)], [np.sum(w * nx * ny), np.sum(w * ny * ny)]])
    b = np.array([np.sum(w * nx * (nx * px + ny * py)), np.sum(w * ny * (nx * px + ny * py))])
    try: c = np.linalg.solve(A, b)
    except np.linalg.LinAlgError: c = np.array([cx, cy])
    if np.hypot(c[0] - cx, c[1] - cy) > 0.25 * R: c = np.array([cx, cy])     # 解出来离谱（线太少 / 太乱）就不信
    def tilts(ccx, ccy, sel_r=None):
        th = np.arctan2(yy - ccy, xx - ccx); rr2 = np.hypot(xx - ccx, yy - ccy) / R; out = []
        for side, c0 in ((1, 0.0), (-1, np.pi)):
            sel = m & (np.abs(((th - c0) + np.pi) % (2 * np.pi) - np.pi) < np.radians(sect))
            if sel_r is not None: sel &= (rr2 >= sel_r[0]) & (rr2 < sel_r[1])
            if sel.sum() < 40: continue
            d = ((ang[sel] - th[sel]) + np.pi / 2) % np.pi - np.pi / 2
            out.append(side * float(np.degrees(np.average(d, weights=(coh * g)[sel]))))
        return float(np.mean(out)) if out else None
    mid = 0.5 * (r0 + r1); ti, to = tilts(c[0], c[1], (r0, mid)), tilts(c[0], c[1], (mid, r1))
    ti0, to0 = tilts(cx, cy, (r0, mid)), tilts(cx, cy, (mid, r1))
    t_ = tilts(cx, cy); tc = tilts(c[0], c[1])
    r3 = lambda x: None if x is None else round(x, 2)
    # bend0：按给定中心算的「外半圈 − 里半圈」——放射中心会把一部分下垂吸收掉，所以两样都给；中心偏 e 带来的误差约 e / r外 − e / r里（中心偏 0.05 R 时芯区约 −6°）
    return dict(tilt=r3(t_), tilt_c=r3(tc), bend=r3(to - ti) if ti is not None and to is not None else None, bend0=r3(to0 - ti0) if ti0 is not None and to0 is not None else None,
                rad_dx=round(float((c[0] - cx) / R), 3), rad_dy=round(float((c[1] - cy) / R), 3))


def line_stats(lines, R, exclude=None):
    L = [l for l in lines if not (exclude and exclude(l))]
    if not L: return dict(n=0)
    long = [l for l in L if l['len'] >= 0.15]
    st = dict(n=len(L), n_long=len(long), len=q([l['len'] for l in L]), width_px=q([l['width'] for l in L]), cont=q([l['cont'] for l in L]),
              bead=q([l['bead'] for l in L]), grad=q([l['grad'] for l in L]), r0=q([l['r0'] for l in L]), r1=q([l['r1'] for l in L]),
              sag=q([l['sag'] for l in L if l['sag'] is not None]), drift=q([abs(l['drift']) for l in L]))
    cin = {}; cout = {}
    for l in L:
        if l['c_in']: cin[l['c_in']] = cin.get(l['c_in'], 0) + 1
        if l['c_out']: cout[l['c_out']] = cout.get(l['c_out'], 0) + 1
    st['c_in'] = {k: round(v / len(L), 2) for k, v in sorted(cin.items(), key=lambda kv: -kv[1])[:3]}
    st['c_out'] = {k: round(v / len(L), 2) for k, v in sorted(cout.items(), key=lambda kv: -kv[1])[:3]}
    # 角度分布：数线有没有明显的簇（分簇 / 万華鏡），按 36 个扇区数，最大 / 平均
    hist = np.histogram([l['angle'] for l in L], bins=36, range=(0, 360))[0]
    st['angle_clump'] = round(float(hist.max() / max(1e-6, hist.mean())), 2)
    return st


# ---------------- 团 ----------------
def radial_profile(v, cx, cy, R, raw=None, nb=26, rmax=1.3, skip_down=True):
    H, W = v.shape; yy, xx = np.mgrid[0:H, 0:W]; r = np.hypot(xx - cx, yy - cy) / R; ang = np.degrees(np.arctan2(yy - cy, xx - cx))
    m = r < rmax
    if skip_down: m &= ~((ang > 60) & (ang < 120))     # 正下方（升空尾迹）不算
    bins = np.linspace(0, rmax, nb + 1); idx = np.digitize(r[m], bins) - 1; vals = v[m]
    prof = [round(float(vals[idx == i].mean()), 1) if (idx == i).any() else 0.0 for i in range(nb)]
    sat_r = None; white_r = None
    if raw is not None:
        s = (raw.max(2) >= 250) & m
        if s.any(): sat_r = round(float(np.percentile(r[s], 90)), 3)
        # 白芯有多大（2026-10-08）：又亮又不饱和的像素（显示值 max > 200、min / max > 0.6）在 0.9 R 以内的 90 分位半径——
        # 橙引、柠绿星头是饱和色，不算进去；只看芯那一团白 / 淡黄白
        mx = raw.max(2).astype(np.float32); mn = raw.min(2).astype(np.float32); w = (mx > 200) & (mn > 0.6 * mx) & m & (r < 0.9)
        if w.sum() > 30: white_r = round(float(np.percentile(r[w], 90)), 3)
    return dict(bins=[round(float(b), 3) for b in bins[:-1]], mean=prof, sat_r90=sat_r, white_r90=white_r)


# ---------------- 一个时刻 ----------------
def measure(raw, sig, cx, cy, R, warm=True, noise=4.0, lin=None):
    """一个时刻的原始打点：点、线（暖色 / 亮）、径向分布"""
    v = sig.max(2)
    pts = detect_points(raw, sig, cx, cy, R, noise=noise, lin=lin)
    lines = {}
    if warm:
        wsig = np.clip(sig[..., 2] - sig[..., 0], 0, None) if sig.shape[2] == 3 else v      # BGR：R − B（橙引、金丝尾）
        lines['暖色线'] = detect_lines(wsig, cx, cy, R, r1=1.45, noise=noise, color=(lin if lin is not None else sig)[..., ::-1])
    lines['亮线'] = detect_lines(v, cx, cy, R, r1=1.45, noise=noise, color=(lin if lin is not None else sig)[..., ::-1])
    tex = {}
    if warm: tex['暖色线'] = line_texture(wsig, cx, cy, R, color=(lin if lin is not None else sig)[..., ::-1])
    tex['亮线'] = line_texture(v, cx, cy, R, color=(lin if lin is not None else sig)[..., ::-1])
    L_ = lin if lin is not None else sig
    tex['橙线'] = line_texture(np.clip(L_[..., 2] - L_[..., 1], 0, None), cx, cy, R, color=L_[..., ::-1])      # 偏橙红的线（R − G）：橙引尾（金黄 / 白的芯在这个通道里很弱，分得开）
    tex['绿线'] = line_texture(np.clip(L_[..., 1] - L_[..., 2], 0, None), cx, cy, R, color=L_[..., ::-1])      # 偏绿的线（G − R）：青绿细线（星后面被照亮的烟）
    return pts, lines, radial_profile(v, cx, cy, R, raw), tex


def summarize(pts, lines, prof, R, split, tex=None, center=None):
    """按里（芯）/ 外（亲星）分区汇总；线按外端在不在分界里面分"""
    reg = {'全部': None}
    if split: reg = {'里（芯）': (lambda p, s=split: p['r'] < s), '外（亲星）': (lambda p, s=split: p['r'] >= s)}
    ps = {k: point_stats(pts, sel) for k, sel in reg.items()}
    down = lambda l: 60 < l['angle'] < 120     # 正下方是升空尾迹
    ls = {}
    for k, L in lines.items():
        if split:
            ls[k + '·里'] = line_stats([l for l in L if l['r1'] < split], R, exclude=down)
            ls[k + '·外'] = line_stats([l for l in L if l['r1'] >= split], R, exclude=down)
        ls[k] = line_stats(L, R, exclude=down)
    ce = [p['r'] for p in pts if not p.get('on_line') and not p['glare'] and p['r'] < 0.8 and p.get('grp', color_group(p)) != '柠绿']
    # 外壳中心相对测量中心的竖直偏移（/R，往下为正）：外层点 y 的 2–98% 中点。实拍的测量中心是按芯定的，渲染图是按整朵亮部定的——
    # 「放射中心偏移」要减掉它才能两边比（芯的线是不是从外壳中心放射出来）
    shell_dy = None
    if center is not None:
        ys = [p['y'] for p in pts if not p.get('on_line') and not p['glare'] and p['r'] > max(0.7, split or 0)]
        if len(ys) >= 30: shell_dy = round(float(((np.percentile(ys, 2) + np.percentile(ys, 98)) / 2 - center[1]) / R), 3)
    return dict(R_px=round(R, 1), split=split, points=ps, by_color=group_stats(pts), core_ext=dict(n=len(ce), r=q(ce)) if ce else dict(n=0), shell_dy=shell_dy, lines=ls, texture=tex or {}, profile=prof)


def fix_radius(ts, Rs):
    """半径随时间平滑变大：比前一个可信值大 30% 以上（0.15 s 内）的当成被照亮的天空 / 烟，按前后可信值插值"""
    ks = [t for t in ts if Rs.get(t)]; good = []; last = None
    for t in ks:
        if last is None or Rs[t] <= 1.3 * Rs[last] or t - last > 0.15: good.append(t); last = t
    out = dict(Rs)
    for t in ks:
        if t in good: continue
        lo = max([g for g in good if g < t], default=None); hi = min([g for g in good if g > t], default=None)
        if lo is not None and hi is not None: out[t] = Rs[lo] + (Rs[hi] - Rs[lo]) * (t - lo) / (hi - lo)
        elif lo is not None: out[t] = Rs[lo]
    return out


def smooth_split(ts, sp):
    """各时刻自动分界在时间上取中值、补空：芯出现以后才有分界；中间偶尔没找到的按两边插值"""
    idx = [i for i, x in enumerate(sp) if x]
    if not idx: return sp
    out = list(sp)
    for i in range(idx[0], len(sp)):
        win = [sp[j] for j in range(max(idx[0], i - 2), min(len(sp), i + 3)) if sp[j]]
        out[i] = round(float(np.median(win)), 3) if win else out[i - 1]
    return out


def auto_split(rs):
    """点离中心距离（r / R）的分布里有两个峰（芯 + 外层）就取中间的谷，没有就 None"""
    rs = np.asarray(rs)
    if len(rs) < 40: return None
    h, e = np.histogram(rs, bins=24, range=(0, 1.2)); hs = np.convolve(h, [1, 2, 1], 'same') / 4
    pk = [i for i in range(1, 23) if hs[i] >= hs[i - 1] and hs[i] >= hs[i + 1] and hs[i] > 0.04 * len(rs)]
    if len(pk) < 2: return None
    a, b = pk[0], pk[-1]; v = a + int(np.argmin(hs[a:b + 1]))
    if hs[v] > 0.6 * min(hs[a], hs[b]): return None
    return round(float((e[v] + e[v + 1]) / 2), 3)


# ---------------- 跟踪 ----------------
def track(frames, max_d=4.0):
    """frames = [(t, cx, cy, R, pts)]；按径向放大预测下一帧位置，最近邻配对 → 编号"""
    tracks = []; act = []
    for t, cx, cy, R, pts in frames:
        P = np.array([[p['x'], p['y']] for p in pts]) if pts else np.zeros((0, 2)); used = set(); nxt = []
        for tr in act:
            t_, x_, y_, R_ = tr['last']
            k = R / max(1e-6, R_); px = cx + (x_ - tr['c'][0]) * k; py = cy + (y_ - tr['c'][1]) * k
            if len(P):
                d = np.hypot(P[:, 0] - px, P[:, 1] - py); d[list(used)] = 1e9; j = int(np.argmin(d))
                if d[j] <= max_d:
                    used.add(j); p = pts[j]; tr['seq'].append((t, p['flux'], p['hue'], p['satu'], p['cls'], p['fwhm'], p['r'], p['x'] - cx, p['y'] - cy, R, p.get('grp'))); tr['last'] = (t, p['x'], p['y'], R); tr['c'] = (cx, cy); nxt.append(tr); continue
            tr['miss'] += 1
            if tr['miss'] <= 1: nxt.append(tr)
            else: tracks.append(tr)
        for j, p in enumerate(pts):
            if j in used: continue
            nxt.append(dict(id=len(tracks) + len(nxt) + 1, seq=[(t, p['flux'], p['hue'], p['satu'], p['cls'], p['fwhm'], p['r'], p['x'] - cx, p['y'] - cy, R, p.get('grp'))], last=(t, p['x'], p['y'], R), c=(cx, cy), miss=0))
        act = nxt
    tracks += act
    for i, tr in enumerate(tracks): tr['id'] = i + 1
    return tracks


def track_stats(tracks, min_len=6):
    """闪烁：去掉慢变化后的亮度起伏（对数标准差）、过零次数 → 频率、灭的比例（低于中位 25%）"""
    T = [tr for tr in tracks if len(tr['seq']) >= min_len]
    if not T: return dict(n=0)
    amp, freq, off = [], [], []
    for tr in T:
        s = np.array(tr['seq'], dtype=object); t = s[:, 0].astype(float); f = np.maximum(1e-3, s[:, 1].astype(float))
        lf = np.log(f); trend = np.convolve(lf, np.ones(5) / 5, 'same') if len(lf) >= 7 else np.full_like(lf, lf.mean())
        d = (lf - trend)[2:-2] if len(lf) >= 7 else lf - lf.mean()
        amp.append(float(np.std(d))); off.append(float(np.mean(f < 0.25 * np.median(f))))
        if np.std(d) < 0.08: continue      # 起伏小于约 8% 的不算闪（周期图只剩噪声，峰在奈奎斯特附近乱跳）
        # 频率：去掉慢变化后做周期图（采样不一定均匀），取最高峰；奈奎斯特 = 有效帧率 / 2
        tt = t[2:-2] if len(lf) >= 7 else t; dt = np.median(np.diff(t)) if len(t) > 1 else 1 / 15; fs = np.linspace(0.3, 0.5 / max(1e-3, dt), 120)
        pw = [abs(np.sum(d * np.exp(-2j * np.pi * f_ * tt))) for f_ in fs]; freq.append(float(fs[int(np.argmax(pw))]))

    return dict(n=len(T), flicker_amp=q([100 * (math.exp(a) - 1) for a in amp]), flicker_frac=round(len(freq) / len(T), 3), flicker_hz=q(freq) if freq else None, off_frac=q(off), len=q([len(tr['seq']) for tr in T]))


def track_kin(tracks, min_len=6):
    """跟踪到的每颗点怎么动（用户 14:25：「不是说好了打点跟踪吗」——以前跟踪只量了闪烁）：
      vr：相对外层半径往外跑多快（r / R 的斜率，/s；> 0 = 比外层还往外，< 0 = 落后）；
      ay：竖直加速度（/R/s²，往下为正；重力让星往下坠）——按颜色组分开。"""
    by = {}
    for tr in tracks:
        if len(tr['seq']) < min_len or len(tr['seq'][0]) < 11: continue
        s = tr['seq']; t = np.array([x[0] for x in s]); r = np.array([x[6] for x in s]); y = np.array([x[8] for x in s]); Rm = float(np.median([x[9] for x in s]))
        gs = [x[10] for x in s if x[10]]; gname = max(set(gs), key=gs.count) if gs else '其它'
        vr = float(np.polyfit(t, r, 1)[0]); ay = float(2 * np.polyfit(t - t.mean(), y, 2)[0] / max(1e-6, Rm))
        by.setdefault(gname, []).append((vr, ay))
    return {g: dict(n=len(v), vr=q([a for a, _ in v]), ay=q([b for _, b in v])) for g, v in by.items()}


# ---------------- 叠图 ----------------
CLS_BGR = {'红': (60, 60, 255), '橙': (40, 140, 255), '金黄': (60, 220, 255), '柠绿': (80, 255, 190), '绿': (80, 255, 80), '青': (255, 255, 80), '蓝': (255, 120, 60), '紫': (255, 80, 200), '粉': (200, 120, 255), '白': (255, 255, 255), '暗': (120, 120, 120)}


def overlay(raw, pts, lines, cx, cy, R, path, half=1.2, px=900, ids=None, title=''):
    H, W = raw.shape[:2]; h = int(half * R); x0, y0 = int(max(0, cx - h)), int(max(0, cy - h)); x1, y1 = int(min(W, cx + h)), int(min(H, cy + h))
    s = px / max(1, (x1 - x0)); img = cv2.resize(raw[y0:y1, x0:x1], (int((x1 - x0) * s), int((y1 - y0) * s)), interpolation=cv2.INTER_LANCZOS4)
    img = (img.astype(np.float32) * 0.75).astype(np.uint8)
    for name, col in (('暖色线', (0, 165, 255)), ('亮线', (255, 255, 0))):
        for l in (lines or {}).get(name, []):
            if l['len'] < 0.12: continue
            cv2.line(img, (int((l['x0'] - x0) * s), int((l['y0'] - y0) * s)), (int((l['x1'] - x0) * s), int((l['y1'] - y0) * s)), col, 1, cv2.LINE_AA)
    for i, p in enumerate(pts):
        if p.get('on_line'): continue
        X, Y = int((p['x'] - x0) * s), int((p['y'] - y0) * s); r = max(3, int(p['fwhm'] * s * 0.9))
        cv2.circle(img, (X, Y), r, CLS_BGR.get(p['cls'], (255, 255, 255)), 1, cv2.LINE_AA)
        if ids is not None and i in ids: cv2.putText(img, str(ids[i]), (X + r, Y - r), 0, 0.33, (230, 230, 230), 1)
    put_text(img, title, (6, 4)); cv2.imwrite(path, img, [cv2.IMWRITE_JPEG_QUALITY, 88])


def put_text(img, text, xy):
    try:
        from PIL import Image, ImageDraw, ImageFont
        for fp in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc'):
            if os.path.exists(fp):
                im = Image.fromarray(img[..., ::-1]); ImageDraw.Draw(im).text(xy, text, fill=(255, 220, 120), font=ImageFont.truetype(fp, 16)); img[:] = np.array(im)[..., ::-1]; return
    except Exception: pass
    cv2.putText(img, text.encode('ascii', 'ignore').decode(), (xy[0], xy[1] + 14), 0, 0.5, (120, 220, 255), 1)


# ---------------- 来源：实拍 ----------------
def run_ref(a):
    cap = cv2.VideoCapture(a.video); W0, H0 = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)); cap.release()
    X, Y, h = a.cx * W0, a.cy * H0, int(a.crop * H0)
    box = (int(max(0, X - h)), int(max(0, Y - h)), int(min(W0, X + h)), int(min(H0, Y + h)))     # 只留花附近（半边 crop × 画面高）
    frames, fps, eff = video_frames(a.video, a.t0, box)
    cx, cy = X - box[0], Y - box[1]
    bg = frames[0][1].astype(np.float32)
    for t, f in frames[1:3]:
        if t < -0.05: bg = np.minimum(bg, f.astype(np.float32))      # 开花前的天空（取最暗，去掉弹体）
    sky = np.median(bg.reshape(-1, 3), 0)
    noise = float(np.median(np.abs(cv2.cvtColor(bg.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32) - cv2.GaussianBlur(cv2.cvtColor(bg.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 3)))) * 1.48 + 1.0
    bgl = to_lin(bg)
    def prep(f):
        sig = np.clip(f.astype(np.float32) - bg, 0, None); lin = np.clip(to_lin(f) - bgl, 0, None); return f, sig, lin
    return frames, fps, eff, cx, cy, prep, dict(source='ref', video=os.path.relpath(a.video, ROOT), t0=a.t0, cx=a.cx, cy=a.cy, crop_box=box, fps=fps, fps_eff=round(eff, 2),
                                              mpp=a.mpp, sky_bgr=[round(float(x), 1) for x in sky], noise=round(noise, 2)), noise


# ---------------- 来源：素材包（本机） ----------------
def render_pack(dirs, t, px):
    import importlib; rc = importlib.import_module('回放检查')
    packs = []
    for d in dirs:
        c = json.load(open(os.path.join(d, 'cascade.json'), encoding='utf-8'))
        packs += [rc.Pack(d, i) for i in range(len(c['emitters']))]
    world = max(max(p.size(u).max() + 2 * max(map(abs, p.offset(u))) for u in np.linspace(0, 1, 21)) for p in packs) * 1.05
    from PIL import Image
    acc = np.zeros((px, px, 3), np.float32)
    for p in packs:
        age = t - p.delay
        if not (0 <= age <= p.life): continue
        u = age / p.life; v = p.cell(p.frame_at(u)); w, h = p.size(u) / world * px; w, h = max(2, int(round(w))), max(2, int(round(h)))
        im = np.array(Image.fromarray((v * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), np.float32) / 255
        ox, oz = p.offset(u); col = p.rgb(im, u); x0, y0 = (px - w) // 2 + int(round(ox / world * px)), (px - h) // 2 - int(round(oz / world * px))
        xa, ya, xb, yb = max(0, x0), max(0, y0), min(px, x0 + w), min(px, y0 + h)
        acc[ya:yb, xa:xb] += col[ya - y0:yb - y0, xa - x0:xb - x0]
    rgb = (np.clip(1 - np.exp(-acc), 0, 1) ** (1 / 2.2) * 255)
    return np.ascontiguousarray(rgb[..., ::-1]).astype(np.uint8)       # BGR，和视频同一种


# ---------------- 主流程 ----------------
def times_of(a, frames=None):
    if a.times: return [float(x) for x in a.times.split(',')]
    if frames is not None: return [t for t, _ in frames if a.tmin <= t <= a.t1]
    n = int((a.t1 - a.tmin) / a.step) + 1; return [round(a.tmin + i * a.step, 4) for i in range(n)]


def windows(a): return [tuple(float(x) for x in w.split(':')) for w in (a.track or [])]


def main_measure(a):
    os.makedirs(a.out, exist_ok=True); res = dict(frames=[], tracks={})
    if a.mode == 'ref':
        frames, fps, eff, cx0, cy0, prep, meta, noise = run_ref(a); res['meta'] = meta
        pick = lambda t: min(frames, key=lambda f: abs(f[0] - t))
        get = lambda t: (pick(t)[0], *prep(pick(t)[1]), cx0, cy0)       # (t, raw, sig, lin, cx, cy)
        all_t = [f[0] for f in frames]
    elif a.mode == 'pack':
        noise = 1.0; ref = json.load(open(a.match, encoding='utf-8')) if a.match else None
        px = a.px
        if ref:      # 和实拍同一像素尺度：按参考某一时刻的外层半径换算渲染边长
            fr = [f for f in ref['frames'] if f['t'] >= 1.0] or ref['frames']; tm, Rm = fr[0]['t'], fr[0]['R_px']
            img = render_pack(a.packs, tm, px); v = img.max(2).astype(np.float32); Rr = radius_of(v, px / 2, px / 2, 30)
            if Rr: px = int(round(px * Rm / Rr))
        res['meta'] = dict(source='pack', packs=[os.path.relpath(p, ROOT) for p in a.packs], px=px, matched_to=a.match)
        def get(t):
            img = render_pack(a.packs, t, px); return t, img, img.astype(np.float32), to_lin(img), px / 2, px / 2
        all_t = [round(i / 30, 4) for i in range(int(a.t1 * 30) + 1)]
    else:
        imgs = a.images; noise = 1.0; res['meta'] = dict(source='img', images=imgs)
        ts = [float(x) for x in a.times.split(',')]
        def get(t):
            img = cv2.imread(imgs[ts.index(t)]); return t, img, img.astype(np.float32), to_lin(img), a.cx, a.cy
        all_t = ts
    TT = times_of(a, [(t, None) for t in all_t] if a.mode != 'pack' else None)
    def radius(raw, sig, lin, cx, cy):
        """半径：亮部横向跨度；点够多时不超过星头距离 95 分位的 1.15 倍（被照亮的天空 / 烟会把亮部撑大）"""
        Rp = radius_of(sig.max(2), cx, cy, max(30, 8 * noise))
        H_ = raw.shape[0]; P0 = detect_points(raw, sig, cx, cy, 0.3 * H_, noise=noise, lin=None)
        d = [math.hypot(p['x'] - cx, p['y'] - cy) for p in P0 if not p.get('on_line')]
        if len(d) >= 50: Rq = 1.15 * float(np.percentile(d, 95)); Rp = min(Rp, Rq) if Rp else Rq
        return Rp
    Rs = {}
    for t in TT:
        tt, raw, sig, lin, cx, cy = get(t); Rs[t] = a.R or radius(raw, sig, lin, cx, cy)
    Rs = fix_radius(TT, Rs)
    keep = []
    for t in TT:
        tt, raw, sig, lin, cx, cy = get(t); R = Rs[t]
        if not R: continue
        pts, lines, prof, tex = measure(raw, sig, cx, cy, R, noise=noise, lin=lin)
        sp = float(a.split) if a.split and a.split != 'auto' else auto_split([p['r'] for p in pts if not p['glare'] and not p.get('on_line')])
        keep.append([tt, cx, cy, R, pts, lines, prof, sp, raw if not a.no_overlay else None, tex])
    sps = smooth_split([k[0] for k in keep], [k[7] for k in keep]) if a.split == 'auto' else [k[7] for k in keep]
    for k, sp in zip(keep, sps):
        tt, cx, cy, R, pts, lines, prof, _, raw, tex = k
        rep = summarize(pts, lines, prof, R, sp, tex, center=(cx, cy)); rep['t'] = round(tt, 4); res['frames'].append(rep)
        if raw is not None: overlay(raw, pts, lines, cx, cy, R, os.path.join(a.out, f'叠图_{tt:.2f}.jpg'), half=1.45, title=f'+{tt:.2f}s  点 {len(pts)}  R {R:.0f}px  分界 {sp}')
        o = rep['points'].get('外（亲星）') or rep['points'].get('全部'); i_ = rep['points'].get('里（芯）') or {}; tw = tex.get('暖色线', {})
        print(f"+{tt:.2f}s R {R:.0f}px 分界 {sp} 外点 {o.get('n')} 里点 {i_.get('n', '-')} 暖色线带 {tw.get('r_in')}–{tw.get('r_out')} 宽 {tw.get('width_px')} 条 {tw.get('n')}", flush=True)
        k[8] = None
    spm = [(k[0], sp) for k, sp in zip(keep, sps) if sp]
    sp_at = lambda t: min(spm, key=lambda x: abs(x[0] - t))[1] if spm else None
    for w in windows(a):
        raw_seq = []
        for t in [x for x in all_t if w[0] <= x <= w[1]]:
            tt, raw, sig, lin, cx, cy = get(t); raw_seq.append([tt, cx, cy, a.R or radius(raw, sig, lin, cx, cy), raw, sig, lin])
        fx = fix_radius([x[0] for x in raw_seq], {x[0]: x[3] for x in raw_seq})      # 和上面一样：半径突然大很多的按前后插值
        for x in raw_seq: x[3] = fx.get(x[0], x[3])
        seq = [(tt, cx, cy, R, detect_points(raw, sig, cx, cy, R, noise=noise, lin=lin)) for tt, cx, cy, R, raw, sig, lin in raw_seq if R]
        seq = [(tt, cx, cy, R, [p for p in P if not p.get('on_line')]) for tt, cx, cy, R, P in seq]
        trs = track(seq); sp = sp_at((w[0] + w[1]) / 2)
        st = {'全部': track_stats(trs)}; kin = track_kin(trs)
        if sp:
            st['里'] = track_stats([tr for tr in trs if np.median([x[6] for x in tr['seq']]) < sp]); st['外'] = track_stats([tr for tr in trs if np.median([x[6] for x in tr['seq']]) >= sp])
        # 出现 / 消失：窗口里中途出现、中途消失的轨迹各占多少（星的点亮、熄灭分布）
        t_first = [tr['seq'][0][0] for tr in trs if len(tr['seq']) >= 3]; t_last = [tr['seq'][-1][0] for tr in trs if len(tr['seq']) >= 3]
        res['tracks'][f'{w[0]}:{w[1]}'] = dict(frames=len(seq), split=sp, stats=st, kin=kin, born=q([t for t in t_first if t > seq[0][0] + 0.01]), died=q([t for t in t_last if t < seq[-1][0] - 0.01]))
        print(f'跟踪 {w}: {len(seq)} 帧、{len(trs)} 条轨迹 → {json.dumps(st, ensure_ascii=False)}', flush=True)
    json.dump(res, open(os.path.join(a.out, '打点.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('→', os.path.join(a.out, '打点.json'))


# ---------------- 对比 ----------------
KEYS = [('外（亲星）', 'points', 'flux_spread', '星与星亮度差（p90/p10）'), ('外（亲星）', 'points', 'fwhm', '星头大小 FWHM（px）'), ('外（亲星）', 'points', 'halo_ratio', '光晕 / 核心亮度比'),
        ('外（亲星）', 'points', 'elong', '拉长比'), ('外（亲星）', 'points', 'halo_sat', '光晕饱和度'), ('外（亲星）', 'points', 'core_sat', '核心饱和度'),
        ('暖色线', 'lines', 'n_long', '暖色长线条数'), ('暖色线', 'lines', 'len', '暖色线长（/R）'), ('暖色线', 'lines', 'width_px', '暖色线宽（px）'),
        ('暖色线', 'lines', 'bead', '暖色线成串（沿线起伏）'), ('暖色线', 'lines', 'grad', '暖色线 外段/内段亮度'), ('暖色线', 'lines', 'sag', '暖色线下垂（/长度）')]


def compare(a):
    A = json.load(open(a.a, encoding='utf-8')); B = json.load(open(a.b, encoding='utf-8')); rows = ['| 时刻 | 量 | 参考 | 我们 |', '| --- | --- | --- | --- |']
    for fa in A['frames']:
        fb = min(B['frames'], key=lambda f: abs(f['t'] - fa['t']))
        if abs(fb['t'] - fa['t']) > 0.04: continue
        for reg, kind, key, label in KEYS:
            def get(F):
                d = F[kind].get(reg) if kind == 'points' else F[kind].get(reg)
                if d is None and kind == 'points': d = F['points'].get('全部')
                return None if d is None else d.get(key)
            va, vb = get(fa), get(fb)
            if va is None and vb is None: continue
            rows.append(f"| +{fa['t']:.2f}s | {label} | {va} | {vb} |")
    open(a.out, 'w', encoding='utf-8').write('\n'.join(rows) + '\n'); print('→', a.out)


# ---------------- 自检：合成图（已知答案） ----------------
def synth(seed=1, n=300, R=250, fwhm=3.0, fwhm_jit=0.2, flux_sigma=0.5, halo=0.0, halo_w=3.0, lines=0, line_len=0.45, line_w=1.6, bead=0.0, sag=0.0, lgrad=0.0, size=700, color=(200, 255, 90), lcolor=(255, 140, 40), shell=(0.85, 1.0)):     # 颜色按 RGB 写
    rng = np.random.default_rng(seed); img = np.zeros((size, size, 3), np.float32); cx = cy = size / 2
    yy, xx = np.mgrid[0:size, 0:size]
    truth = dict(n=n, flux_spread=float(math.exp(2 * 1.2816 * flux_sigma)), fwhm=fwhm, lines=lines, line_len=line_len, line_w=line_w)
    for i in range(lines):     # 放射线：从 (r1 − len) 到 r1，沿线可成串，可下垂
        th = rng.uniform(0, 2 * math.pi); r1 = R * rng.uniform(0.9, 1.0); r0 = r1 - line_len * R
        for s in np.linspace(r0, r1, int(3 * (r1 - r0))):
            u = (s - r0) / (r1 - r0); x = cx + s * math.cos(th); y = cy + s * math.sin(th) + sag * line_len * R * u * u
            a = (1.0 if bead <= 0 else (0.5 + 0.5 * math.cos(2 * math.pi * s / 6)) ** (bead * 4)) * ((1 - lgrad) + lgrad * 2 * u)
            sg = line_w / 2.355; x0, y0 = int(x), int(y)
            if 3 <= x0 < size - 3 and 3 <= y0 < size - 3:
                g = np.exp(-((xx[y0 - 3:y0 + 4, x0 - 3:x0 + 4] - x) ** 2 + (yy[y0 - 3:y0 + 4, x0 - 3:x0 + 4] - y) ** 2) / (2 * sg * sg)) * 70 * a / 3
                img[y0 - 3:y0 + 4, x0 - 3:x0 + 4] += g[..., None] * np.array(lcolor[::-1], np.float32)[None, None] / 255
    for i in range(n):         # 点：球壳投影
        v = rng.normal(size=3); v /= np.linalg.norm(v); rr = R * rng.uniform(*shell); x = cx + rr * v[0]; y = cy + rr * v[1]
        f = 900 * math.exp(rng.normal(0, flux_sigma)); fw = fwhm * math.exp(rng.normal(0, fwhm_jit)); sg = fw / 2.355
        x0, y0 = int(x), int(y); k = 9
        if not (k <= x0 < size - k and k <= y0 < size - k): continue
        X = xx[y0 - k:y0 + k + 1, x0 - k:x0 + k + 1] - x; Y = yy[y0 - k:y0 + k + 1, x0 - k:x0 + k + 1] - y; d2 = X * X + Y * Y
        g = (1 - halo) * np.exp(-d2 / (2 * sg * sg)) / (2 * math.pi * sg * sg) + halo * np.exp(-d2 / (2 * (sg * halo_w) ** 2)) / (2 * math.pi * (sg * halo_w) ** 2)
        img[y0 - k:y0 + k + 1, x0 - k:x0 + k + 1] += (f * g)[..., None] * np.array(color[::-1], np.float32)[None, None] / 255
    img += rng.normal(0, 2.0, img.shape).astype(np.float32)
    return np.clip(img, 0, 255).astype(np.uint8), cx, cy, R, truth


def selftest(a):
    os.makedirs(a.out, exist_ok=True); ok = True; rows = []
    def chk(name, got, want, tol):
        nonlocal ok; good = got is not None and abs(got - want) <= tol; ok &= good; rows.append(f"{'✅' if good else '❌'} {name}: 量到 {got}，答案 {want}（容差 ±{tol}）"); print(rows[-1])
    # 1. 点：数量（稀疏，不重叠为主）、亮度离散、大小
    for fs in (0.2, 0.5):
        img, cx, cy, R, tr = synth(seed=3, n=220, flux_sigma=fs, shell=(0.3, 1.0))
        pts = detect_points(img, img.astype(np.float32), cx, cy, R, noise=2.0); st = point_stats(pts)
        chk(f'点数（离散 {fs}）', st['n'], tr['n'], 0.15 * tr['n']); chk(f'亮度差 p90/p10（离散 {fs}）', st['flux_spread'], round(tr['flux_spread'], 2), 0.25 * tr['flux_spread'])
        chk(f'大小 FWHM 中位（离散 {fs}）', st['fwhm'][1], tr['fwhm'], 0.6)
    # 2. 光晕：光晕能量越多，光晕 / 核心比越大（单调）
    hr = []
    for h in (0.0, 0.4, 0.8):
        img, cx, cy, R, _ = synth(seed=4, n=150, halo=h, shell=(0.3, 1.0)); hr.append(point_stats(detect_points(img, img.astype(np.float32), cx, cy, R, noise=2.0))['halo_ratio'][1])
    good = hr[0] < hr[1] < hr[2]; ok &= good; rows.append(f"{'✅' if good else '❌'} 光晕 / 核心比随光晕能量单调：{hr}"); print(rows[-1])
    # 3. 线：条数、长度、宽度；成串比连续的起伏大；下垂量得出来
    for ll, lw in ((0.45, 1.6), (0.25, 2.6)):
        img, cx, cy, R, tr = synth(seed=5, n=0, lines=60, line_len=ll, line_w=lw)
        L = detect_lines(np.clip(img[..., 2].astype(np.float32) - img[..., 0], 0, None), cx, cy, R, noise=2.0); st = line_stats(L, R)
        chk(f'线条数（长 {ll}）', st['n_long'] if ll > 0.3 else st['n'], 60, 12); chk(f'线长中位（长 {ll}）', st['len'][1], ll, 0.08); chk(f'线宽中位（宽 {lw}）', st['width_px'][1], lw, 0.8)
    bd = []
    for b in (0.0, 1.0):
        img, cx, cy, R, _ = synth(seed=6, n=0, lines=50, bead=b); L = detect_lines(np.clip(img[..., 2].astype(np.float32) - img[..., 0], 0, None), cx, cy, R, noise=2.0); bd.append(line_stats(L, R)['bead'][1])
    good = bd[1] > bd[0] * 1.5; ok &= good; rows.append(f"{'✅' if good else '❌'} 成串的线起伏比连续的大：{bd}"); print(rows[-1])
    sg = []
    for s in (0.0, 0.25):
        img, cx, cy, R, _ = synth(seed=7, n=0, lines=60, sag=s); L = detect_lines(np.clip(img[..., 2].astype(np.float32) - img[..., 0], 0, None), cx, cy, R, noise=2.0); sg.append(line_stats(L, R)['sag'])
    good = sg[1] is not None and sg[0] is not None and sg[1][1] > sg[0][1] + 0.03; ok &= good; rows.append(f"{'✅' if good else '❌'} 下垂量得出来：不垂 {sg[0]}，垂 {sg[1]}"); print(rows[-1])
    # 3b. 密的线（几百条叠在一起）：按纹理量线带厚度 ≈ 线长、线宽、成串、亮度梯度
    tw = lambda img: line_texture(np.clip(img[..., 2].astype(np.float32) - img[..., 0], 0, None), 350, 350, 250, color=img[..., ::-1].astype(np.float32))
    for ll, lw in ((0.45, 2.5), (0.25, 4.0)):
        img, cx, cy, R, _ = synth(seed=9, n=0, lines=260, line_len=ll, line_w=lw); T = tw(img)
        chk(f'密线带厚度 ≈ 线长（{ll}）', T['thick'], ll, 0.1); chk(f'密线线宽（{lw}）', T['width_px'], lw, 1.2)
    t0 = tw(synth(seed=10, n=0, lines=260)[0]); t1 = tw(synth(seed=10, n=0, lines=260, bead=1.0)[0])
    good = t1['bead'] > 1.5 * t0['bead']; ok &= good; rows.append(f"{'✅' if good else '❌'} 密线成串：连续 {t0['bead']}，成串 {t1['bead']}"); print(rows[-1])
    g0 = tw(synth(seed=11, n=0, lines=260, lgrad=0.0)[0]); g1 = tw(synth(seed=11, n=0, lines=260, lgrad=0.8)[0])
    good = g1['grad'] > g0['grad'] * 1.5; ok &= good; rows.append(f"{'✅' if good else '❌'} 密线外端亮：均匀 {g0['grad']}，外端亮 {g1['grad']}"); print(rows[-1])
    # 4. 闪烁：一组点按已知频率 / 幅度闪，跟踪后量出来
    rng = np.random.default_rng(8); base = [(rng.uniform(150, 550), rng.uniform(150, 550)) for _ in range(80)]; frames = []
    for i in range(30):
        t = i / 15; pts = []
        for j, (x, y) in enumerate(base):
            amp = 0.4 if j < 40 else 0.0; f = 900 * (1 + amp * math.sin(2 * math.pi * 3 * t + j))
            pts.append(dict(x=x + 0.3 * i, y=y, flux=f, hue=80, satu=0.6, cls='柠绿', fwhm=3, r=0.8))
        frames.append((t, 350, 350, 250, pts))
    trs = track(frames); s1 = track_stats([tr for tr in trs if tr['seq'] and tr['id'] <= 40 or False]) if False else None
    flick = [tr for tr in trs if len(tr['seq']) >= 25]
    a1 = track_stats(flick[:40]); a0 = track_stats(flick[40:])
    good = len(flick) >= 78 and a1['flicker_amp'][1] > 15 and a0['flicker_amp'][1] < 3 and 2 <= a1['flicker_hz'][1] <= 4.5
    ok &= good; rows.append(f"{'✅' if good else '❌'} 跟踪 + 闪烁：轨迹 {len(flick)}/80；闪的那组幅度 {a1['flicker_amp']}% 频率 {a1['flicker_hz']} Hz（答案 3 Hz），不闪的那组 {a0['flicker_amp']}%"); print(rows[-1])
    # 5.（2026-10-08 用户 14:25 后补）密线弯曲：直线 0、往下垂的越垂越大；中心估偏只算到「放射中心偏移」里，不算弯
    bends = []
    for sg_ in (0.0, 0.1, 0.25):
        img, cx, cy, R, _ = synth(seed=12, n=0, lines=400, line_len=0.45, sag=sg_); bends.append(texture_bend(img.max(2).astype(np.float32), cx, cy, R, 0.55, 1.0))
    good = abs(bends[0]['bend']) < 1.5 and bends[1]['bend'] > 2.5 and bends[2]['bend'] > bends[1]['bend'] + 1.5 and bends[2]['rad_dy'] < -0.08
    ok &= good; rows.append(f"{'✅' if good else '❌'} 密线弯曲（下垂 0 / 0.1 / 0.25）：弯 {[b['bend'] for b in bends]}°，放射中心偏 {[b['rad_dy'] for b in bends]} R"); print(rows[-1])
    img, cx, cy, R, _ = synth(seed=12, n=0, lines=400, line_len=0.45); img = np.roll(img, 12, axis=0); b = texture_bend(img.max(2).astype(np.float32), cx, cy, R, 0.55, 1.0)
    chk('中心估偏 12 px：放射中心偏移（/R）', b['rad_dy'], round(12 / R, 3), 0.015); chk('中心估偏 12 px：弯曲（°）', b['bend'], 0.0, 1.5)
    # 6. 点按颜色分组：淡紫点在外圈（0.5–0.6 R 球壳）、金点在里（0.25–0.42 R），分组后各自的 r 分得开
    i1, cx, cy, R, _ = synth(seed=13, n=160, shell=(0.5, 0.6), color=(235, 190, 255)); i2, _, _, _, _ = synth(seed=14, n=160, shell=(0.25, 0.42), color=(255, 150, 40))
    img = np.clip(i1.astype(np.int32) + i2.astype(np.int32), 0, 255).astype(np.uint8)
    gs = group_stats(detect_points(img, img.astype(np.float32), cx, cy, R, noise=2.0))
    lv, gd = gs.get('淡紫', {}), gs.get('金橙', {})
    good = lv.get('n', 0) > 100 and gd.get('n', 0) > 100 and lv['r'][2] > 0.54 and gd['r'][2] < 0.44 and lv['r'][2] > gd['r'][2] + 0.1
    ok &= good; rows.append(f"{'✅' if good else '❌'} 点按颜色分组：淡紫 {lv.get('n')} 个 r {lv.get('r')}（答案 p90 ≈ 0.58），金橙 {gd.get('n')} 个 r {gd.get('r')}（≈ 0.41）"); print(rows[-1])
    # 7. 跟踪运动学：一组点比外层往外跑（vr = +0.05 /s），一组往下坠（ay = 0.2 R/s²）
    rng = np.random.default_rng(15); P0 = [(rng.uniform(0, 2 * math.pi), rng.uniform(0.3, 0.8)) for _ in range(60)]; frames = []
    for i in range(24):
        t = i / 15; pts = []
        for j, (th, r0) in enumerate(P0):
            out_ = j < 30; r = r0 + (0.05 * t if out_ else 0.0); x = 350 + 250 * r * math.cos(th); y = 350 + 250 * r * math.sin(th) + (0 if out_ else 0.5 * 0.2 * 250 * t * t)
            pts.append(dict(x=x, y=y, flux=900, hue=80, satu=0.6, cls='柠绿', fwhm=3, r=math.hypot(x - 350, y - 350) / 250, grp='淡紫' if out_ else '柠绿'))
        frames.append((t, 350, 350, 250, pts))
    kn = track_kin(track(frames))
    chk('跟踪：往外跑的那组 vr（/s）', (kn.get('淡紫') or {}).get('vr', [None] * 3)[1], 0.05, 0.01); chk('跟踪：下坠的那组 ay（R/s²）', (kn.get('柠绿') or {}).get('ay', [None] * 3)[1], 0.2, 0.03)
    chk('跟踪：往外跑的那组不坠 ay', (kn.get('淡紫') or {}).get('ay', [None] * 3)[1], 0.0, 0.03)
    img, cx, cy, R, _ = synth(seed=3, n=220, flux_sigma=0.5, lines=40, shell=(0.3, 1.0))
    pts = detect_points(img, img.astype(np.float32), cx, cy, R, noise=2.0); L = {'暖色线': detect_lines(np.clip(img[..., 2].astype(np.float32) - img[..., 0], 0, None), cx, cy, R, noise=2.0, color=img[..., ::-1].astype(np.float32))}
    overlay(img, pts, L, cx, cy, R, os.path.join(a.out, '自检叠图.jpg'), title='自检：合成图')
    open(os.path.join(a.out, '自检.md'), 'w', encoding='utf-8').write('# 打点自检（合成图，已知答案）\n\n' + '\n'.join('- ' + r for r in rows) + '\n')
    print('全部通过' if ok else '有不通过'); return 0 if ok else 1


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('mode', choices=['selftest', 'ref', 'pack', 'img', 'compare'])
    ap.add_argument('video', nargs='?'); ap.add_argument('rest', nargs='*')
    ap.add_argument('--t0', type=float, default=0); ap.add_argument('--cx', type=float); ap.add_argument('--cy', type=float); ap.add_argument('--R', type=float)
    ap.add_argument('--times'); ap.add_argument('--tmin', type=float, default=0.1); ap.add_argument('--t1', type=float, default=4.0); ap.add_argument('--step', type=float, default=0.0667)
    ap.add_argument('--track', action='append'); ap.add_argument('--mpp', type=float); ap.add_argument('--split'); ap.add_argument('--out', default='.')
    ap.add_argument('--match'); ap.add_argument('--px', type=int, default=1024); ap.add_argument('--crop', type=float, default=0.42); ap.add_argument('--no-overlay', action='store_true')
    a = ap.parse_args()
    if a.mode == 'selftest': sys.exit(selftest(a))
    if a.mode == 'compare': a.a, a.b = a.video, a.rest[0]; compare(a); sys.exit(0)
    if a.mode == 'pack': a.packs = [a.video] + a.rest
    if a.mode == 'img': a.images = [a.video] + a.rest
    main_measure(a)
