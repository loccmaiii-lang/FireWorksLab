"""实拍 / 模拟 通用测量工具（两边用同一套代码，避免口径不一致）

- read_video(path, scale)       逐帧读入（缩小后），返回 [(t, rgb)]
- find_burst(frames)            找开花时刻、爆点、燃烧结束、最终半径
- measure(rgb, bg, center, R)   单帧：半径、尾缀长度（占半径）、星点数、亮度、主色
- crop(rgb, center, half, px)   以爆点为中心、按最终半径归一化裁图
"""
import cv2
import numpy as np


def read_video(path, scale=0.5, t0=0.0, t1=1e9):
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    out, i = [], 0
    while True:
        ok, f = cap.read()
        if not ok:
            break
        t = i / fps
        i += 1
        if t < t0 or t > t1:
            continue
        if scale != 1:
            f = cv2.resize(f, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        out.append((t, cv2.cvtColor(f, cv2.COLOR_BGR2RGB)))
    return out, fps


def gray(rgb):
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)


def star_mask(rgb, bg):
    """亮部掩码：扣背景后再减去大尺度模糊（去掉被烟花照亮的天空、地面这种大片泛光），阈值 = max(25, 0.25 × 99.9 分位)"""
    d = gray(rgb) - bg
    d = np.clip(d - cv2.GaussianBlur(d, (0, 0), 12), 0, None)
    p = np.percentile(d, 99.9)
    thr = max(25.0, 0.25 * p)
    return d, d > thr, thr


def find_burst(frames, bg_frames=3):
    """开花时刻 = 亮部像素数第一次猛增；爆点 = 该帧亮部中心；燃烧结束 = 像素数跌破峰值 15%"""
    bg = np.median(np.stack([gray(f) for _, f in frames[:bg_frames]]), 0)
    cnt = []
    for _, f in frames:
        d, m, _ = star_mask(f, bg)
        cnt.append(int(m.sum()))
    cnt = np.array(cnt, np.float32)
    # 用最大连通块的扩张判断开花：取像素数的峰值，往前找第一次超过峰值 10% 的帧
    ip = int(np.argmax(cnt))
    i0 = next(i for i in range(ip + 1) if cnt[i] > 0.1 * cnt[ip])
    d, m, _ = star_mask(frames[min(i0 + 1, len(frames) - 1)][1], bg)
    ys, xs = np.nonzero(m)
    w = d[ys, xs]
    center = (float((xs * w).sum() / w.sum()), float((ys * w).sum() / w.sum()))
    ie = next((i for i in range(ip, len(cnt)) if cnt[i] < 0.15 * cnt[ip]), len(cnt) - 1)
    return dict(bg=bg, i0=i0, ip=ip, ie=ie, t0=frames[i0][0], tp=frames[ip][0], te=frames[ie][0], center=center, cnt=cnt)


def measure(rgb, bg, center, R=None):
    d, m, thr = star_mask(rgb, bg)
    ys, xs = np.nonzero(m)
    res = dict(n=int(m.sum()))
    if len(xs) < 20:
        return dict(res, r98=0, tail=0, tail75=0, heads=0, lum=float(d.sum()), hue=None)
    cx, cy = center
    dx, dy = xs - cx, ys - cy
    rr = np.hypot(dx, dy)
    r98 = float(np.percentile(rr, 98))
    Rn = R or r98
    # 尾缀：连通块沿主轴的长度（只取大致沿径向的细长块）
    n, lab, st, cen = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    lens = []
    for k in range(1, n):
        area = st[k, cv2.CC_STAT_AREA]
        if area < 6 or area > 0.05 * len(xs):
            continue
        yy, xx = np.nonzero(lab[st[k, 1]:st[k, 1] + st[k, 3], st[k, 0]:st[k, 0] + st[k, 2]] == k)
        if len(xx) < 6:
            continue
        pts = np.stack([xx + st[k, 0], yy + st[k, 1]], 1).astype(np.float32)
        mu = pts.mean(0)
        cov = np.cov((pts - mu).T)
        ev, evec = np.linalg.eigh(cov)
        L = 2 * np.sqrt(3 * max(ev[1], 0))      # 均匀线段：长度 = 2√(3λ)
        W = 2 * np.sqrt(3 * max(ev[0], 0)) + 1
        if L < 3 * W:
            continue
        rad = mu - np.array([cx, cy])
        rn = np.linalg.norm(rad)
        if rn < 1e-3:
            continue
        cosang = abs(float(np.dot(evec[:, 1], rad / rn)))
        if cosang < 0.8:
            continue
        lens.append(L)
    tail = float(np.median(lens) / Rn) if lens else 0.0
    tail75 = float(np.percentile(lens, 75) / Rn) if lens else 0.0
    # 星头：局部最亮点
    dil = cv2.dilate(d, np.ones((5, 5), np.uint8))
    heads = int(((d >= dil) & (d > 2 * thr)).sum())
    # 主色：亮部加权平均色相
    col = rgb[ys, xs].astype(np.float32)
    wgt = d[ys, xs]
    c = (col * wgt[:, None]).sum(0) / wgt.sum()
    return dict(res, r98=r98, tail=tail, tail75=tail75, ntails=len(lens), heads=heads, lum=float(d.sum()), rgb=[int(v) for v in c])


def streak(rgb, bg, center, R):
    """与阈值无关的「尾缀」度量（结构张量）：
    coh   = 亮痕的方向一致性（0 = 圆点，1 = 细长直线），按亮度加权；尾缀越长越连续越接近 1
    align = 亮痕方向与径向的一致程度（1 = 全部沿径向放射，下垂弯曲会变小）
    conc  = 最亮 2% 像素占总亮度的比例（全是亮点时高，亮度分布在长尾缀上时低）
    统计范围：0.15R–1.2R（去掉中心烟团和闪光）；平滑尺度 = 0.02R，与分辨率无关"""
    img = gray(rgb) - (bg if bg is not None else 0)
    img = np.clip(img - cv2.GaussianBlur(img, (0, 0), 12), 0, None)
    gx = cv2.Sobel(img, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(img, cv2.CV_32F, 0, 1, ksize=3)
    sg = max(1.0, R * 0.02)
    Jxx = cv2.GaussianBlur(gx * gx, (0, 0), sg); Jyy = cv2.GaussianBlur(gy * gy, (0, 0), sg); Jxy = cv2.GaussianBlur(gx * gy, (0, 0), sg)
    coh = np.sqrt((Jxx - Jyy) ** 2 + 4 * Jxy ** 2) / (Jxx + Jyy + 1e-6)
    ang = 0.5 * np.arctan2(2 * Jxy, Jxx - Jyy) + np.pi / 2
    H, W = img.shape; yy, xx = np.mgrid[0:H, 0:W]; rx = xx - center[0]; ry = yy - center[1]; rn = np.hypot(rx, ry) + 1e-6
    align = np.abs(np.cos(ang) * rx / rn + np.sin(ang) * ry / rn)
    w = img * (rn > 0.15 * R) * (rn < 1.2 * R)
    if w.sum() <= 0:
        return dict(coh=0.0, align=0.0, conc=1.0)
    cw = coh * w
    flat = np.sort(img[(rn > 0.15 * R) & (rn < 1.2 * R)].ravel())[::-1]
    k = max(1, int(0.02 * np.count_nonzero(flat)))
    return dict(coh=float(cw.sum() / w.sum()), align=float((align * cw).sum() / max(cw.sum(), 1e-6)), conc=float(flat[:k].sum() / max(flat.sum(), 1e-6)))


def crop(rgb, center, half, px=480):
    cx, cy = center
    M = np.float32([[px / (2 * half), 0, px / 2 - cx * px / (2 * half)], [0, px / (2 * half), px / 2 - cy * px / (2 * half)]])
    return cv2.warpAffine(rgb, M, (px, px), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_REPLICATE)
