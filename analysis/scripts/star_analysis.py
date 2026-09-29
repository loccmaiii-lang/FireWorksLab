"""花型实拍的逐帧「配方分析」：把一段单发礼花的视频拆成能直接对应到烘焙器参数的物理量。

量什么（全部按帧，时间以开花为 0）：
- 开花时刻、爆点；爆点随时间的下坠（重力 + 整体漂移）
- 星头：局部极大值检测 → 个数 N(t)、半径 R(t)（星头到中心距离的 95 分位）、径向分布（外圈 20% 半径里星头占比：球壳 vs 实心球）
- 颜色：星头芯（最亮像素）和尾巴（亮部里离星头远的像素）分别的 RGB、色相；颜色随时间的变化 → 变色时刻、变色宽度
- 尾巴：亮部面积 / 星头数（每颗星拖了多少亮像素）、沿径向的细长度 → 有没有火花尾、多长
- 星头大小（亮度加权半宽）、亮度分布
- 燃烧结束：N(t) 从峰值掉到 50% / 10% 的时刻 → 平均燃烧时长和离散
- 由 R(t) 拟合初速和终端速度：二次阻力 R(t) = ln(1 + g·v0·t / vt²) · vt² / g（开花后几秒内重力对半径影响小）

比例尺：同一台相机（尾缀 / 青柠星 / 金蕊青柠星 / 万彩千轮 2.0 这一批）是 0.4545 m/像素（2560×1440，见 升空尾缀_物理.md）；其它视频给 --mpp。

用法：python star_analysis.py <视频> [--roi x0 y0 x1 y1（画面比例）] [--t0 秒 --t1 秒] [--mpp 米/像素] [--out 目录]
输出：<out>/分析.json、<out>/分析.jpg（时间线：个数、半径、颜色、尾巴、径向分布）
"""
import os, sys, json, math, argparse
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
G = 9.81


def read(path, roi=None, t0=0.0, t1=1e9):
    cap = cv2.VideoCapture(path); fps = cap.get(5) or 30; out = []; i = 0
    while True:
        ok, f = cap.read()
        if not ok: break
        t = i / fps; i += 1
        if t < t0 or t > t1: continue
        if roi:
            H, W = f.shape[:2]; f = f[int(roi[1] * H):int(roi[3] * H), int(roi[0] * W):int(roi[2] * W)]
        out.append((t, f))
    return out, fps


def hue_of(bgr):
    b, g, r = [float(x) for x in bgr]
    h = cv2.cvtColor(np.uint8([[[min(255, b), min(255, g), min(255, r)]]]), cv2.COLOR_BGR2HSV)[0, 0]
    return float(h[0]) * 2, float(h[1]) / 255


def analyze(path, roi=None, t0=0.0, t1=1e9, mpp=0.4545, log=print):
    frames, fps = read(path, roi, t0, t1)
    L = [f.astype(np.float32) for _, f in frames]
    Y = [f.max(2) for f in L]
    bg = np.median(np.stack(Y[:3]), 0); bgc = np.median(np.stack(L[:3]), 0)
    # 开花：亮部像素数第一次超过峰值 10%，且之后持续 → 取亮部最集中的那帧的重心
    cnt = []
    for y in Y:
        d = np.clip(y - bg, 0, None); d = np.clip(d - cv2.GaussianBlur(d, (0, 0), 15), 0, None); cnt.append(int((d > 40).sum()))
    cnt = np.array(cnt); ip = int(np.argmax(cnt)); ib = next(i for i in range(ip + 1) if cnt[i] > 0.1 * cnt[ip])
    rows = []; center = None
    for i in range(ib, len(frames)):
        t = frames[i][0] - frames[ib][0]
        d = np.clip(Y[i] - bg, 0, None); d2 = np.clip(d - cv2.GaussianBlur(d, (0, 0), 15), 0, None)
        m = d2 > 40
        if m.sum() < 5: rows.append(dict(t=t, n=0)); continue
        # 最大连通块群（膨胀后）= 这一发；去掉角落里的别的东西
        md = cv2.dilate(m.astype(np.uint8), np.ones((25, 25), np.uint8))
        nl, lab, st, _ = cv2.connectedComponentsWithStats(md, 8)
        k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); m &= (lab == k)
        ys, xs = np.nonzero(m); w = d2[ys, xs]
        c = (float((xs * w).sum() / w.sum()), float((ys * w).sum() / w.sum()))
        if center is None or t < 0.4: center = c if center is None else (0.7 * np.array(center) + 0.3 * np.array(c)).tolist()
        # 星头：3×3 局部极大值，亮度够、且是个小圆点（比周围 5 像素处亮 1.5 倍以上）
        mx = cv2.dilate(d2, np.ones((7, 7), np.uint8)); ring = cv2.blur(d2, (11, 11))
        hy, hx = np.nonzero((d2 >= mx) & (d2 > 70) & (d2 > 1.6 * ring) & m)
        cx, cy = c
        rr = np.hypot(hx - cx, hy - cy); Rm = np.hypot(xs - cx, ys - cy)
        # 半径用横向跨度（左右 3–97 分位的一半）：竖直方向会混进升空尾迹和下坠，横向不会
        src_x = hx if len(hx) > 20 else xs
        R95 = float((np.percentile(src_x, 97) - np.percentile(src_x, 3)) / 2)
        outer = float(np.mean(rr > 0.8 * R95)) if len(rr) > 5 else 0.0
        # 颜色：星头芯（极大值点 3×3 平均）与尾巴（亮部里离所有星头 ≥ 5 像素的像素）
        sig = np.clip(L[i] - bgc, 0, None)
        if len(hx):
            head = np.mean([sig[max(0, y - 1):y + 2, max(0, x - 1):x + 2].reshape(-1, 3).mean(0) for y, x in zip(hy[:400], hx[:400])], 0)
            hm = np.zeros(m.shape, np.uint8); hm[hy, hx] = 1; near = cv2.dilate(hm, np.ones((11, 11), np.uint8)) > 0
        else: head = np.zeros(3); near = np.zeros(m.shape, bool)
        tail_m = m & ~near; tail = sig[tail_m].mean(0) if tail_m.any() else np.zeros(3)
        # 尾巴细长度：亮部像素的径向 / 切向分布比（尾巴沿径向拉长）
        ang = np.arctan2(ys - cy, xs - cx)
        rows.append(dict(t=round(t, 3), n=int(len(hx)), R_px=round(R95, 1), outer=round(outer, 3), area=int(m.sum()), tail_px_per_star=round(float(tail_m.sum()) / max(1, len(hx)), 1),
                         head_bgr=[round(float(v), 1) for v in head], tail_bgr=[round(float(v), 1) for v in tail], head_hue=hue_of(head)[0] if len(hx) else None,
                         tail_hue=hue_of(tail)[0] if tail_m.any() else None, peak=round(float(np.percentile(d2[hy, hx], 50)) if len(hx) else 0, 1), cx=round(cx, 1), cy=round(cy, 1)))
    # ---- 汇总成物理量 ----
    T = np.array([r['t'] for r in rows]); N = np.array([r.get('n', 0) for r in rows], float); R = np.array([r.get('R_px', np.nan) for r in rows], float) * mpp
    iN = int(np.nanargmax(N)); Nmax = float(N[iN])
    t50 = next((T[i] for i in range(iN, len(T)) if N[i] < 0.5 * Nmax), T[-1]); t10 = next((T[i] for i in range(iN, len(T)) if N[i] < 0.1 * Nmax), T[-1])
    # 半径拟合：只用星数还多的时段（到 t50 为止）
    from scipy.optimize import least_squares
    ok = (T > 0.05) & (T < t50) & np.isfinite(R)
    def Rm(p, t): v0, vt = p; c = G / vt ** 2; return np.log1p(c * v0 * t) / c
    fit = least_squares(lambda p: Rm(p, T[ok]) - R[ok], [80, 25], bounds=([5, 3], [400, 200])) if ok.sum() > 4 else None
    v0, vt = (float(fit.x[0]), float(fit.x[1])) if fit is not None else (None, None)
    # 变色：星头色相随时间，找最大跳变
    hh = [(r['t'], r['head_hue']) for r in rows if r.get('head_hue') is not None and r.get('n', 0) > 0.2 * Nmax]
    ch = None
    if len(hh) > 4:
        th, hv = np.array(hh).T; hv = np.unwrap(np.radians(hv)); hv = np.degrees(hv)
        dv = np.abs(np.diff(np.convolve(hv, np.ones(3) / 3, 'same'))); j = int(np.argmax(dv[1:-1])) + 1
        ch = dict(t=round(float(th[j]), 2), from_hue=round(float(np.median(hv[:max(1, j - 1)])) % 360, 0), to_hue=round(float(np.median(hv[j + 2:])) % 360, 0) if j + 2 < len(hv) else None)
    # 下坠：爆点重心在后半段的下移（像素 → 米）
    cys = [(r['t'], r['cy']) for r in rows if r.get('n', 0) > 0.3 * Nmax]
    drop = None
    if len(cys) > 5:
        tc, yc = np.array(cys).T; p = np.polyfit(tc, yc, 2); drop = dict(accel_mps2=round(2 * p[0] * mpp, 2), note='重心的下坠加速度（正 = 向下），重力减去阻力后的净效果')
    summ = dict(video=os.path.relpath(path, ROOT), roi=roi, mpp=mpp, burst_t=round(frames[ib][0], 3), stars_peak=int(Nmax), stars_peak_t=round(float(T[iN]), 2),
                burn_t50=round(float(t50), 2), burn_t10=round(float(t10), 2), radius_max_m=round(float(np.nanmax(R)), 1), v0=v0 and round(v0, 1), vt=vt and round(vt, 1),
                color_change=ch, center_drop=drop)
    log(json.dumps(summ, ensure_ascii=False))
    return summ, rows, frames, ib


def timeline_img(rows, summ, path):
    """时间线图：个数、半径、外圈占比、尾巴像素/星、星头与尾巴的颜色条"""
    W, H = 1200, 520; img = np.full((H, W, 3), 24, np.uint8); T = [r['t'] for r in rows]; tm = max(T) or 1
    X = lambda t: int(60 + (W - 80) * t / tm)
    def plot(key, y0, h, col, scale=None, label=''):
        v = np.array([r.get(key) if r.get(key) is not None else np.nan for r in rows], float); s = scale or (np.nanmax(v) or 1)
        pts = [(X(t), int(y0 + h - h * min(1, x / s))) for t, x in zip(T, v) if np.isfinite(x)]
        for a, b in zip(pts, pts[1:]): cv2.line(img, a, b, col, 2)
        cv2.putText(img, f'{label} (max {s:.3g})', (64, y0 + 14), 0, 0.45, col, 1)
    plot('n', 10, 110, (120, 220, 255), label='stars N'); plot('R_px', 10, 110, (120, 255, 140), label='R px')
    plot('outer', 130, 90, (255, 180, 120), 1.0, 'outer 20% share'); plot('tail_px_per_star', 130, 90, (200, 120, 255), label='tail px/star')
    for i, r in enumerate(rows):
        for k, (key, y0) in enumerate((('head_bgr', 250), ('tail_bgr', 330))):
            c = np.array(r.get(key) or [0, 0, 0], float); c = c / max(1.0, c.max()) * 255
            cv2.rectangle(img, (X(r['t']), y0), (X(r['t']) + max(2, (W - 80) // len(rows)), y0 + 70), tuple(int(x) for x in c), -1)
    cv2.putText(img, 'head color', (4, 290), 0, 0.4, (220, 220, 220), 1); cv2.putText(img, 'tail color', (4, 370), 0, 0.4, (220, 220, 220), 1)
    for s in range(int(tm) + 1): cv2.line(img, (X(s), 410), (X(s), 420), (200, 200, 200), 1); cv2.putText(img, f'{s}s', (X(s) - 8, 438), 0, 0.45, (200, 200, 200), 1)
    txt = f"burst {summ['burst_t']}s  peak N {summ['stars_peak']}  R max {summ['radius_max_m']} m  v0 {summ['v0']}  vt {summ['vt']}  burn t50 {summ['burn_t50']} t10 {summ['burn_t10']}"
    cv2.putText(img, txt, (10, 480), 0, 0.5, (240, 240, 240), 1)
    if summ.get('color_change'): cv2.putText(img, f"color change at {summ['color_change']}", (10, 505), 0, 0.5, (240, 240, 240), 1)
    cv2.imwrite(path, img)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('video'); ap.add_argument('--roi', nargs=4, type=float); ap.add_argument('--t0', type=float, default=0); ap.add_argument('--t1', type=float, default=1e9)
    ap.add_argument('--mpp', type=float, default=0.4545); ap.add_argument('--out')
    a = ap.parse_args(); out = a.out or os.path.join(ROOT, 'analysis', 'replica', '分析', os.path.splitext(os.path.basename(a.video))[0]); os.makedirs(out, exist_ok=True)
    summ, rows, _, _ = analyze(a.video, a.roi, a.t0, a.t1, a.mpp)
    json.dump(dict(汇总=summ, 逐帧=rows), open(os.path.join(out, '分析.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    timeline_img(rows, summ, os.path.join(out, '分析.jpg'))
