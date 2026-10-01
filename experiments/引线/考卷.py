"""引菊 → 锦 的考卷：在实拍和模拟上用同一套代码量「开花后同一秒」的指标。

做法：以爆点为中心展开成极坐标图 (r, θ)，放射线变成竖条：
  - 半径 R：角向覆盖率 ≥ 30% 的最大半径（只用上下两个扇区，左右在后段出画）
  - 径向亮度分布 I(r/R)：线上的光沿长度怎么分布（中心空不空、外端亮不亮）
  - 连续性：相邻半径的角向亮度剖面相关系数（连续的放射线 → 高；断成碎点 → 低）
  - 线数：0.6R 处角向剖面的峰数（成团 → 少且宽；太多碎点 → 多）
  - 颜色：按 r/R 分带的线像素色度 (r, g) = R/(R+G+B), G/(R+G+B) 与「金色占比」
  - 闪点：线像素沿径向的高频能量占比（平滑直线 → 低；锦的颗粒火星 → 高）
所有量都在「交付分辨率」上量：图先缩放到 R(1.0 s) = R_CELL 像素（512 格 Zoom 取景约 230 px）。

用法：
  python3 考卷.py ref            量实拍，写 参考指标.json + 参考展开图
  python3 考卷.py img <图> <cx> <cy> <R> [t]   量一张图（模拟或反例）
"""
import sys, os, json, glob
import numpy as np, cv2

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
VIDEO = os.path.join(ROOT, 'vidio', '3.0', '尾缀3.0_A.mp4')
T_BURST = 4.63            # 视频秒：开花白闪第一帧 4.634（30 fps，±17 ms）
R_CELL = 230.0            # 交付分辨率下 +1.0 s 的半径像素（512 格、Zoom 取景）
RC_CORE = 40              # 爆点亮核排除半径（交付像素）：实拍的亮核是升空尾缀残头 + 白火花，属于另一件素材
N_THETA = 720
SECTORS = [(-150, -30), (30, 150)]   # 上、下扇区（度，0 = 向右，y 向下为正）


def polar(img, cx, cy, rmax, nr):
    """img: float32 HxWx3 (0–255)。返回 (nr, N_THETA, 3)。"""
    th = np.linspace(-np.pi, np.pi, N_THETA, endpoint=False)
    r = np.linspace(0, rmax, nr)
    X = (cx + r[:, None] * np.cos(th)[None, :]).astype(np.float32)
    Y = (cy + r[:, None] * np.sin(th)[None, :]).astype(np.float32)
    return cv2.remap(img, X, Y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(-1, -1, -1))


def sector_mask():
    th = np.degrees(np.linspace(-np.pi, np.pi, N_THETA, endpoint=False))
    m = np.zeros(N_THETA, bool)
    for a, b in SECTORS: m |= (th >= a) & (th <= b)
    return m


def lum(p):
    return p.max(-1)


def measure(img, cx, cy, R, thr=None):
    """img 已在交付分辨率；R = 当前半径（像素）。返回指标 dict。"""
    R = max(R, 20.0)
    img = img.astype(np.float32)
    nr = int(R * 1.15) + 1
    P = polar(img, cx, cy, R * 1.15, nr)
    S = sector_mask()
    valid = (P[..., 0] >= 0)
    L = lum(np.clip(P, 0, 255))
    bg = np.percentile(L[valid & S[None, :]], 20)
    Lb = np.clip(L - bg, 0, None)
    if thr is None: thr = max(12.0, 0.18 * np.percentile(Lb[: nr][:, S], 99))
    out = {}
    # 径向分布（按 r/R 10 带，扇区内平均亮度，归一到最大）
    bands = np.linspace(0, 1.1, 12)
    prof = []
    for i in range(11):
        a, b = int(bands[i] * R), max(int(bands[i + 1] * R), int(bands[i] * R) + 1)
        seg = Lb[a:b][:, S]; v = valid[a:b][:, S]
        prof.append(float(seg[v].mean()) if v.any() else float('nan'))
    pm = np.nanmax(prof) or 1
    out['径向分布'] = [round(x / pm, 3) for x in prof]
    # 连续性：0.25R–0.95R，相邻半径（间隔 2 px）角向剖面相关
    cors = []
    for r in range(int(0.25 * R), int(0.95 * R) - 2, 2):
        a = Lb[r, S]; b = Lb[r + 2, S]
        if a.std() > 1e-3 and b.std() > 1e-3: cors.append(np.corrcoef(a, b)[0, 1])
    out['连续性'] = round(float(np.mean(cors)), 3) if cors else None
    # 断点率：沿每条线（角向峰位）径向走，亮度低于阈值的比例（0.3R–0.9R）
    r6 = int(0.6 * R); a = cv2.GaussianBlur(Lb[r6 - 2:r6 + 3].mean(0)[None, :], (1, 3), 0)[0]
    peaks = [i for i in range(1, N_THETA - 1) if S[i] and a[i] >= a[i - 1] and a[i] > a[i + 1] and a[i] > thr]
    out['线数_0.6R_扇区'] = len(peaks)
    gaps = []
    for i in peaks:
        col = Lb[int(0.3 * R):int(0.9 * R), max(0, i - 1):i + 2].max(1)
        gaps.append(float((col < 0.35 * a[i]).mean()))
    out['断点率'] = round(float(np.mean(gaps)), 3) if gaps else None
    # 峰宽（成团 → 宽）：峰的半高全宽，单位 = 角向采样点
    widths = []
    for i in peaks:
        h = a[i] / 2; l = i; rr = i
        while l > 0 and a[l] > h: l -= 1
        while rr < N_THETA - 1 and a[rr] > h: rr += 1
        widths.append(rr - l)
    out['峰宽中位'] = float(np.median(widths)) if widths else None
    # 颜色（分带：内 0.2–0.5R、中 0.5–0.8R、外 0.8–1.0R）
    col = {}
    for name, a0, b0 in [('内', .2, .5), ('中', .5, .8), ('外', .8, 1.0)]:
        seg = np.clip(P[int(a0 * R):int(b0 * R)][:, S], 0, 255); l = Lb[int(a0 * R):int(b0 * R)][:, S]
        m = l > thr
        if m.sum() < 20: col[name] = None; continue
        px = seg[m]; s = px.sum(1, keepdims=True) + 1e-3; ch = px / s   # BGR
        rr_, gg_ = float(ch[:, 2].mean()), float(ch[:, 1].mean())
        gold = float(((ch[:, 1] / np.maximum(ch[:, 2], 1e-3)) > 0.80).mean())   # G/R > 0.8 视为金（橙约 0.45–0.7）
        col[name] = {'r': round(rr_, 3), 'g': round(gg_, 3), 'G/R': round(gg_ / max(rr_, 1e-3), 3), '金占比': round(gold, 3)}
    out['颜色'] = col
    # 闪点：线像素沿径向高频能量占比
    # 内 / 中段亮度比：内段避开爆点亮核（实拍里是升空尾缀的残头 + 白色火花，属于另一件素材；交付尺度半径约 40 px），
    # 模拟和实拍用同一个排除半径
    a0 = max(int(0.15 * R), RC_CORE); a1 = int(0.4 * R)
    if a1 - a0 >= 6:
        inn = Lb[a0:a1][:, S][valid[a0:a1][:, S]].mean(); mid = Lb[int(0.5 * R):int(0.8 * R)][:, S][valid[int(0.5 * R):int(0.8 * R)][:, S]].mean()
        out['内中比'] = round(float(inn / max(mid, 1e-6)), 3)
    else: out['内中比'] = None
    seg = Lb[int(0.3 * R):max(int(0.95 * R), int(0.3 * R) + 10)][:, S]
    sm = cv2.GaussianBlur(seg, (1, 9), 0, sigmaY=2.5)
    m = sm > thr
    out['闪点'] = round(float((np.abs(seg - sm)[m]).mean() / max(sm[m].mean(), 1e-3)), 3) if m.sum() > 50 else None
    seg = Lb[int(0.3 * R):int(0.95 * R)][:, S]; m = seg > thr
    out['线亮度中位'] = round(float(np.median(seg[m])), 1) if m.sum() > 50 else None
    out['阈值'] = round(float(thr), 1)
    return out


def fast_cont(gray, cx, cy, R):
    """找中心用的快速连续性：只用亮度、0.3–0.9R 每 3 px 一圈。"""
    th = np.linspace(-np.pi, np.pi, 720, endpoint=False); r = np.arange(int(0.3 * R), int(0.9 * R), 3)
    X = (cx + r[:, None] * np.cos(th)).astype(np.float32); Y = (cy + r[:, None] * np.sin(th)).astype(np.float32)
    P = cv2.remap(gray, X, Y, cv2.INTER_LINEAR)[:, sector_mask()]
    P = P - P.mean(1, keepdims=True); n = np.linalg.norm(P, axis=1) + 1e-6
    return float(((P[1:] * P[:-1]).sum(1) / (n[1:] * n[:-1])).mean())


def radius(img, cx, cy, rmax):
    img = img.astype(np.float32); nr = int(rmax)
    P = polar(img, cx, cy, rmax, nr); S = sector_mask()
    L = lum(np.clip(P, 0, 255)); v = P[..., 0] >= 0
    bg = np.percentile(L[v & S[None, :]], 20); Lb = np.clip(L - bg, 0, None)
    thr = max(15.0, 0.15 * np.percentile(Lb[:, S], 99.5))
    # 角向覆盖率（每个角度在 ±3 px 半径内有没有亮像素）
    on = cv2.dilate((Lb > thr).astype(np.uint8), np.ones((7, 1), np.uint8)) > 0
    cov = on[:, S].mean(1)
    idx = np.nonzero(cov >= 0.30)[0]
    return float(idx.max()) if len(idx) else 0.0


def ref_frames(times, scale=0.5):
    cap = cv2.VideoCapture(VIDEO); fps = cap.get(cv2.CAP_PROP_FPS); out = {}
    for t in times:
        f = int(round((T_BURST + t) * fps)); cap.set(cv2.CAP_PROP_POS_FRAMES, f); ok, im = cap.read()
        if ok: out[t] = (cv2.resize(im, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA), f / fps - T_BURST)
    return out


def ref_center(im):
    g = im.max(2).astype(np.float32); g = cv2.GaussianBlur(g, (0, 0), 6)
    _, _, _, mx = cv2.minMaxLoc(g); return mx


def run_ref(outdir):
    times = [round(0.1 * k, 1) for k in range(2, 25)]
    fr = ref_frames(times)
    res = {'视频': 'vidio/3.0/尾缀3.0_A.mp4', '开花视频秒': T_BURST, '缩放': '1080 宽', '时刻': {}}
    # 中心：0.2–1.0 s 的亮核位置中位（开花后爆点基本不动）
    cs = np.array([ref_center(fr[t][0]) for t in times if t <= 1.0]); cx0, cy0 = np.median(cs, 0)
    # 亮核是升空尾缀的残头，不是放射中心：每个时刻在亮核附近找「线最径向」的点（连续性最大），手机有轻微漂移
    cen = {}; cx, cy = cx0, cy0
    for t in times:
        im = fr[t][0]; R0 = radius(im, cx, cy, 900); gray = im.max(2).astype(np.float32)
        best = None
        for step, span in ((4, 40), (1, 4)):
            bx, by = (cx, cy) if best is None else best[1:]
            for dx in range(-span, span + 1, step):
                for dy in range(-span, span + 1, step):
                    c = fast_cont(gray, bx + dx, by + dy, R0)
                    if best is None or c > best[0]: best = (c, bx + dx, by + dy)
        cx, cy = best[1], best[2]; cen[t] = (float(cx), float(cy))
    # 0.5 s 以前花太小、线太短，找中心不稳：用 0.5–0.7 s 的中心（爆点不动，手机只轻微漂移）
    c0 = np.median([cen[t] for t in times if 0.5 <= t <= 0.7], 0)
    for t in times:
        if t < 0.5: cen[t] = (float(c0[0]), float(c0[1]))
    res['中心_1080'] = [float(cx0), float(cy0)]; res['放射中心_1080'] = {str(t): cen[t] for t in times}
    Rs = {t: radius(fr[t][0], *cen[t], 900) for t in times}
    # 1.3 s 以后上下也接近出画：用 0.2–1.2 s 拟合 R(t) = A(1 - e^{-kt}) 外推（只作颜色分带用）
    ts = np.array([t for t in times if t <= 1.2]); rs = np.array([Rs[t] for t in ts])
    ts = np.array([t for t in times if t <= 2.0]); rs = np.array([Rs[t] for t in ts])
    best = None
    for k in np.linspace(0.5, 8, 301):
        F = np.stack([1 - np.exp(-k * ts), ts], 1); coef, *_ = np.linalg.lstsq(F, rs, rcond=None); e = ((F @ coef - rs) ** 2).sum()
        if best is None or e < best[0]: best = (e, coef, k)
    _, (A, c), k = best
    Rf = lambda t: A * (1 - np.exp(-k * t)) + c * t
    res['半径拟合'] = {'A': round(A, 1), 'k': round(k, 3), 'c': round(c, 1), '说明': 'R(t)=A(1-e^{-kt})+c·t，1080 宽像素，0.2–2.0 s 实测拟合（阻力减速 + 终端速度漂移）'}
    R1 = Rf(1.0); sc = R_CELL / R1
    res['到交付分辨率缩放'] = round(sc, 4)
    os.makedirs(outdir, exist_ok=True)
    for t in times:
        im, ta = fr[t]; Rfit = Rs[t] if t <= 2.0 else Rf(t)
        small = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
        cx, cy = cen[t]; m = measure(small, cx * sc, cy * sc, Rfit * sc)
        m['实际秒'] = round(ta, 3); m['半径_实测_1080'] = Rs[t]; m['半径_交付'] = round(Rfit * sc, 1)
        res['时刻'][str(t)] = m
        if t in (0.4, 0.8, 1.2, 1.6, 2.0):
            P = polar(small.astype(np.float32), cx * sc, cy * sc, Rfit * sc * 1.15, int(Rfit * sc * 1.15))
            cv2.imwrite(os.path.join(outdir, f'展开_{t:.1f}.png'), np.clip(P, 0, 255).astype(np.uint8))
            cv2.imwrite(os.path.join(outdir, f'交付尺度_{t:.1f}.png'), small)
    json.dump(res, open(os.path.join(outdir, '参考指标.json'), 'w'), ensure_ascii=False, indent=1)
    return res


if __name__ == '__main__':
    if sys.argv[1] == 'ref':
        r = run_ref(os.path.join(HERE, '考卷'))
        for t, m in r['时刻'].items():
            c = m['颜色']; print(t, m['半径_实测_1080'], m['半径_交付'], '连续', m['连续性'], '断', m['断点率'], '线', m['线数_0.6R_扇区'], '宽', m['峰宽中位'], '闪', m['闪点'],
                  ' '.join(f"{k}:{v['G/R'] if v else '-'}/{v['金占比'] if v else '-'}" for k, v in c.items()), m['径向分布'][:10])
    elif sys.argv[1] == 'img':
        im = cv2.imread(sys.argv[2]); cx, cy, R = map(float, sys.argv[3:6])
        print(json.dumps(measure(im, cx, cy, R), ensure_ascii=False, indent=1))


# ───────────────────────── 及格线（先定后调；改要写原因）─────────────────────────
# 硬指标：与相机几何无关，必须全过。参考指标：受实拍机位（手机在发射点附近仰拍、有倾斜）影响，只报告不调。
def _ir(p):
    p = np.array(p); return p[1:4].mean() / max(p[5:8].mean(), 1e-6)
def _edge(p):
    p = np.array(p); return p[9] / max(p[5:8].mean(), 1e-6)
RULES = [
    # (编号, 名称, 时刻范围, 取值函数, 比较方式, 容差)
    ('H1', '线连续（不碎）', (0.4, 1.6), lambda m: m['连续性'], 'ge', 0.02),
    ('H2', '断点率', (0.4, 1.6), lambda m: m['断点率'], 'le', 0.05),
    ('H3', '线数（±25%）', (0.5, 1.6), lambda m: m['线数_0.6R_扇区'], 'rel', 0.25),
    ('H4', '不成团（峰宽）', (0.5, 1.6), lambda m: m['峰宽中位'], 'le', 2.0),
    ('H5', '中心不过亮（内 / 中段亮度比，避开爆点亮核）', (0.5, 1.3), lambda m: m['内中比'], 'abs', 0.25),
    ('H6', '展开节奏 R(t)/R(1.0)', (0.3, 1.2), lambda m: m['_Rratio'], 'abs', 0.06),
    ('H7a', '橙色（各带 G/R）', (0.4, 1.1), lambda m: [m['颜色'][k]['G/R'] for k in ('内', '中', '外')], 'abs', 0.04),
    ('H7b', '转金（各带 G/R）', (1.3, 2.1), lambda m: [m['颜色'][k]['G/R'] for k in ('内', '中', '外')], 'abs', 0.06),
    ('H8a', '橙段平滑（闪点）', (0.4, 1.1), lambda m: m['闪点'], 'abs', 0.015),
    ('H8b', '锦段颗粒（闪点）', (1.3, 2.1), lambda m: m['闪点'], 'abs', 0.025),
]
INFO = [
    ('I1', '外缘 / 中段亮度比', lambda m: _edge(m['径向分布'])),
    ('I2', '线亮度中位（曝光已按 +1.0 s 对齐）', lambda m: m['线亮度中位']),
]


def grade(sim, ref):
    """sim, ref: {时刻字符串: 指标}；sim 里要有 '_Rratio'（= R(t)/R(1.0)）。返回 (全过?, 逐条结果)。"""
    out = []; ok_all = True
    for code, name, (a, b), f, how, tol in RULES:
        bad = []
        for t, m in sim.items():
            tt = float(t)
            if not (a - 1e-9 <= tt <= b + 1e-9) or t not in ref: continue
            r = dict(ref[t]); r['_Rratio'] = ref[t]['半径_实测_1080'] / ref['1.0']['半径_实测_1080']
            try:
                x, y = f(m), f(r)
            except (TypeError, KeyError):
                bad.append((t, '缺', None)); continue
            xs = x if isinstance(x, list) else [x]; ys = y if isinstance(y, list) else [y]
            for xi, yi in zip(xs, ys):
                if xi is None or yi is None: bad.append((t, xi, yi)); continue
                good = {'ge': xi >= yi - tol, 'le': xi <= yi + tol, 'abs': abs(xi - yi) <= tol, 'rel': abs(xi - yi) <= tol * yi}[how]
                if not good: bad.append((t, round(xi, 3), round(yi, 3)))
        out.append({'编号': code, '项目': name, '通过': not bad, '不过的时刻 (模拟, 参考)': bad[:6]})
        ok_all &= not bad
    info = []
    for code, name, f in INFO:
        info.append({'编号': code, '项目': name, '模拟': {t: round(float(f(m)), 3) for t, m in sim.items() if f(m) is not None},
                     '参考': {t: round(float(f(ref[t])), 3) for t in sim if t in ref and f(ref[t]) is not None}})
    return ok_all, out, info
