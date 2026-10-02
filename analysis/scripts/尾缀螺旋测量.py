"""升空尾缀：从远景实拍量「螺旋」的证据（对话框11，2026-10-02）。

量三样东西：
1. 星头逐帧轨迹 z(t)、x(t)：弹体速度、星头本身有没有周期性横摆（= 弹体自己走螺旋）。
2. 临开花那一帧，尾迹逐行中心线 x(z)：去掉慢弯后的波浪，局部波长 λ(z)、幅度。
3. 把每个高度 z 换算成「火星在那里出生时弹体的速度 V」，看 λ 是不是 ∝ V
   （λ = V / f：f 不变 → 喷口 / 弹体按固定转速转圈；λ 不随 V 变 → 别的原因）。

用法：python3 analysis/scripts/尾缀螺旋测量.py [M|L|S] [--out 目录]
"""
import sys, os, json, math, argparse
import numpy as np, cv2
from scipy.ndimage import gaussian_filter1d
from scipy.signal import find_peaks

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
MPP = 0.4545
REFS = {   # 与 trail_phys.py 的 REFS 相同（t0 = 出膛在视频里的时刻）
    'M': dict(video='vidio/2.0/尾缀B.mp4', t0=0.759, launch=(1936.3, 1045.0), crop=(1700, 330, 2100, 1090), bg='first'),
    'L': dict(video='vidio/2.0/尾缀A.mp4', t0=0.598, launch=(1668.1, 1225.0), crop=(1420, 420, 1820, 1200), bg='first'),
    'S': dict(video='vidio/2.0/尾缀C.mp4', t0=-2.216, launch=(1665.0, 1225.0), crop=(1440, 560, 1840, 1200), bg='min'),
}


def load(ref):
    cap = cv2.VideoCapture(os.path.join(ROOT, ref['video'])); x0, y0, x1, y1 = ref['crop']; fr = []
    while True:
        ok, f = cap.read()
        if not ok: break
        fr.append(f[y0:y1, x0:x1].astype(np.float32))
    fr = np.array(fr)
    bg = np.median(fr[:8], 0) if ref['bg'] == 'first' else np.percentile(fr[::3], 25, axis=0)
    return fr, bg


def signal(f, bg):
    d = np.clip(f - bg, 0, None).sum(2)
    return cv2.GaussianBlur(d, (0, 0), 0.8)


def main_comp(d, thr=40):
    m = (d > thr).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(m, np.ones((9, 5), np.uint8)), 8)
    if n < 2: return None
    k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    return (lab == k) & (m > 0)


def head_track(fr, bg, ref, gate_x=6.0, gate_up=9.0, gate_dn=2.0, thr=25):
    """逐帧星头：从出膛点附近起跟，之后只在上一帧位置的小窗口里找最上面的亮行（避免画面里别的亮东西）。
    尾缀C 开拍时已在空中：起点取第一帧最大连通块的顶端。"""
    x0, y0 = ref['crop'][:2]; lx, ly = ref['launch']; out = []; prev = None; vz = 0.0; miss = 0
    for i, f in enumerate(fr):
        d = signal(f, bg); t = i / 30.0 - ref['t0']
        Z = (ly - y0 - np.arange(d.shape[0]))[:, None] * MPP; X = (np.arange(d.shape[1]) + x0 - lx)[None, :] * MPP
        if prev is None:
            if t < 0 and ref['t0'] > 0: continue
            if ref['t0'] > 0: win = (Z > 2) & (Z < 60) & (np.abs(X) < 15)
            else:
                mm = main_comp(d, thr)
                if mm is None: continue
                win = mm
        else:
            g = 1 + min(miss, 2); zp, xp = prev[1] + vz / 30.0 * g, prev[2]
            win = (Z > zp - gate_dn * g) & (Z < zp + gate_up * g) & (np.abs(X - xp) < gate_x * g)
        m = (d > thr) & win
        if prev is not None and m.sum() >= 3:
            # 尾迹连续：只要和上一帧星头下方那段尾迹连在一起的连通块（画面里别的烟花不会连上）
            lab = cv2.connectedComponents(cv2.dilate((d > thr).astype(np.uint8), np.ones((5, 3), np.uint8)), connectivity=8)[1]
            py = int(round(ly - y0 - (prev[1] - 3) / MPP)); px = int(round(prev[2] / MPP + lx - x0))
            py = min(max(py, 0), d.shape[0] - 1); sub = lab[max(0, py - 6):py + 7, max(0, px - 8):px + 9]
            ids = [v for v in np.unique(sub) if v > 0]
            if ids: m = m & np.isin(lab, ids)
        if m.sum() < 3:
            miss += prev is not None; continue
        ys, xs = np.nonzero(m); top = ys.min(); rows = slice(top, top + 4)
        w = d[rows] * m[rows]; cx = (w.sum(0) * np.arange(w.shape[1])).sum() / w.sum()
        cur = (t, (ly - y0 - top) * MPP, (cx + x0 - lx) * MPP, i)
        if prev is not None: vz = 0.6 * vz + 0.4 * (cur[1] - prev[1]) * 30.0 / (1 + miss)
        prev = cur; out.append(cur); miss = 0
    return np.array(out)


def centerline(d, mm, top, bot, half=7):
    """逐行亮度加权中心（亚像素），只在平滑路径 ±half 像素内取，避免旁边的散火星（向量化）"""
    ys = np.arange(top, bot + 1); D = d[top:bot + 1] * mm[top:bot + 1]; X = np.arange(d.shape[1])[None, :]
    s = D.sum(1); cx = np.where(s > 0, (D * X).sum(1) / np.maximum(s, 1e-9), np.nan)
    ok = ~np.isnan(cx)
    if ok.sum() < 5: return ys, cx, s
    sm = np.interp(ys, ys[ok], gaussian_filter1d(cx[ok], 15))
    R = d[top:bot + 1] - np.median(d[top:bot + 1], 1, keepdims=True)
    R = np.clip(R, 0, None) * (np.abs(X - sm[:, None]) <= half)
    w = R.sum(1); cx = np.where(w > 0, (R * X).sum(1) / np.maximum(w, 1e-9), np.nan)
    return ys, cx, w


def analyse(key, out_dir):
    ref = REFS[key]; fr, bg = load(ref); H = head_track(fr, bg, ref)
    t, z, xh = H[:, 0], H[:, 1], H[:, 2]
    # 星头速度：z(t) 平滑后差分
    zs = gaussian_filter1d(z, 2); v = np.gradient(zs, t)
    res = dict(key=key, frames=len(fr), head=dict(t=t.round(3).tolist(), z=z.round(2).tolist(), x=xh.round(3).tolist(), v=v.round(2).tolist()))
    # 星头横摆：去掉二次趋势后的残差和频谱
    p = np.polyfit(t, xh, 3); r = xh - np.polyval(p, t)
    res['head_wobble_rms_m'] = round(float(r.std()), 3)
    if len(r) > 16:
        F = np.abs(np.fft.rfft(r * np.hanning(len(r)))); fq = np.fft.rfftfreq(len(r), d=np.median(np.diff(t)))
        k = 1 + int(np.argmax(F[1:])); res['head_wobble_peak_hz'] = round(float(fq[k]), 2)
    # 尾迹最长的一帧（临开花前）
    lengths = []
    for i in range(len(fr)):
        mm = main_comp(signal(fr[i], bg))
        if mm is None: lengths.append(0); continue
        ys = np.nonzero(mm)[0]; lengths.append(ys.max() - ys.min())
    best = {}
    for tag, i in (('longest', int(np.argmax(lengths))), ('last_head', int(H[-1, 3]))):
        d = signal(fr[i], bg); mm = main_comp(d); ys_, _ = np.nonzero(mm); top, bot = ys_.min(), ys_.max()
        ys, cx, w = centerline(d, mm, top, bot)
        zrow = (ref['launch'][1] - ref['crop'][1] - ys) * MPP; xrow = cx * MPP
        ok = ~np.isnan(xrow) & (w > np.percentile(w[w > 0], 20))
        zr, xr = zrow[ok], xrow[ok]
        # 去慢弯：60 m 高斯 → 剩下的是波浪
        sig_px = 30 / MPP / 2.355 * 2
        slow = gaussian_filter1d(xr, sig_px); wave = gaussian_filter1d(xr - slow, 1.5)
        # 峰谷 → 局部半波长
        pk, _ = find_peaks(wave, prominence=0.12); tr, _ = find_peaks(-wave, prominence=0.12)
        ex = np.sort(np.r_[pk, tr]); seg = []
        for a, b in zip(ex[:-1], ex[1:]):
            if (a in pk) != (b in pk):
                zm = 0.5 * (zr[a] + zr[b]); half = abs(zr[a] - zr[b]); amp = 0.5 * abs(wave[a] - wave[b])
                # 这一段火星出生时弹体速度：星头经过 zm 的时刻
                if zm <= z.max():
                    te = float(np.interp(zm, zs, t)); ve = float(np.interp(te, t, v)); age = float(t[min(len(t) - 1, np.searchsorted(H[:, 3], i))] - te)
                else: te, ve, age = None, None, None
                seg.append(dict(z=round(zm, 1), lam=round(2 * half, 1), amp=round(amp, 2), t_emit=None if te is None else round(te, 2),
                                v_emit=None if ve is None else round(ve, 1), age=None if age is None else round(age, 2)))
        best[tag] = dict(frame=i, t=round(i / 30 - ref['t0'], 2), top_z=round(float(zr.max()), 1), bot_z=round(float(zr.min()), 1),
                         wave_rms=round(float(wave.std()), 3), segments=seg, z=zr.round(2).tolist(), x=xr.round(3).tolist(), wave=wave.round(3).tolist())
    res['trail'] = best
    os.makedirs(out_dir, exist_ok=True)
    json.dump(res, open(os.path.join(out_dir, f'螺旋测量_{key}.json'), 'w'), ensure_ascii=False)
    return res


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('keys', nargs='*', default=['M', 'L', 'S'])
    ap.add_argument('--out', default=os.path.join(ROOT, 'analysis', 'results', '尾缀螺旋'))
    a = ap.parse_args()
    for k in a.keys:
        r = analyse(k, a.out)
        print(f"== {k}: 星头横摆 rms {r['head_wobble_rms_m']} m，峰值 {r.get('head_wobble_peak_hz')} Hz；v {r['head']['v'][0]}→{r['head']['v'][-1]} m/s，t {r['head']['t'][0]}→{r['head']['t'][-1]} s")
        for tag, b in r['trail'].items():
            print(f"  [{tag}] 帧 {b['frame']} t={b['t']} s  z {b['bot_z']}–{b['top_z']} m  波浪 rms {b['wave_rms']} m")
            for s in b['segments']: print('    ', s)


# ---------------------------------------------------------------------------------------------
#  第二种量法：按火星出生时刻 t_emit 重排，多帧叠加后看频谱（转速恒定 → 在 t_emit 上是固定频率）
def stack_by_emit(key, t_burst=None, detrend_s=0.5, dt=1 / 120):
    ref = REFS[key]; fr, bg = load(ref); H = head_track(fr, bg, ref)
    zs_all = gaussian_filter1d(H[:, 1], 2); k_end = int(np.argmax(zs_all)) if t_burst is None else int(np.searchsorted(H[:, 0], t_burst))
    H = H[:max(8, k_end)]; t, z = H[:, 0], H[:, 1]; zs = np.maximum.accumulate(gaussian_filter1d(z, 2)); v = np.gradient(zs, t)
    grid = np.arange(t[0], t[-1], dt); acc = np.zeros(len(grid)); cnt = np.zeros(len(grid))
    zacc = {}; amp_age = []
    for row in H:
        i = int(row[3]); d = signal(fr[i], bg); mm = main_comp(d)
        if mm is None: continue
        ys_, _ = np.nonzero(mm); ys, cx, w = centerline(d, mm, ys_.min(), ys_.max())
        zr = (ref['launch'][1] - ref['crop'][1] - ys) * MPP; ok = ~np.isnan(cx) & (w > 0) & (zr < row[1] - 2) & (zr > zs[0] + 1)
        if ok.sum() < 30: continue
        te = np.interp(zr[ok], zs, t); xr = cx[ok] * MPP; o = np.argsort(te); te, xr = te[o], xr[o]
        u = np.unique(te, return_index=True)[1]; te, xr = te[u], xr[u]
        if te[-1] - te[0] < 4 * detrend_s: continue
        g = (grid >= te[0]) & (grid <= te[-1]); xg = np.interp(grid[g], te, xr)
        res = xg - gaussian_filter1d(xg, detrend_s / dt / 2.355 * 2)
        acc[g] += res; cnt[g] += 1
        age = row[0] - grid[g]
        for a0 in np.arange(0, 2.0, 0.25):
            m = (age >= a0) & (age < a0 + 0.25)
            if m.sum() > 20: amp_age.append((a0 + 0.125, float(res[m].std())))
    m = cnt >= 3; sig = np.where(m, acc / np.maximum(cnt, 1), 0)
    gg = grid[m]; ss = sig[m]
    # 频谱（t_emit 域）
    W = np.hanning(len(ss)); F = np.abs(np.fft.rfft((ss - ss.mean()) * W)) ** 2; fq = np.fft.rfftfreq(len(ss), dt)
    band = (fq > 0.8) & (fq < 15); kpk = np.argmax(F * band)
    # 同一段信号放到 z 域再看一次（λ 恒定假设）
    zg = np.interp(gg, t, zs); zu = np.linspace(zg[0], zg[-1], len(zg)); sz = np.interp(zu, zg, ss)
    Fz = np.abs(np.fft.rfft((sz - sz.mean()) * np.hanning(len(sz)))) ** 2; kz = np.fft.rfftfreq(len(sz), zu[1] - zu[0])
    bz = (kz > 1 / 120) & (kz < 1 / 3); kzp = np.argmax(Fz * bz)
    def sharp(P, band):   # 峰值功率占带内功率的比例（越大越「一个频率」）
        p = P[band]; return float(p.max() / p.sum())
    aa = {}
    for a, s in amp_age: aa.setdefault(round(a, 3), []).append(s)
    return dict(key=key, t_emit=[round(float(gg[0]), 2), round(float(gg[-1]), 2)], v=[round(float(np.interp(gg[0], t, v)), 1), round(float(np.interp(gg[-1], t, v)), 1)],
                peak_hz=round(float(fq[kpk]), 2), sharp_t=round(sharp(F, band), 3), peak_lambda_m=round(float(1 / kz[kzp]), 1), sharp_z=round(sharp(Fz, bz), 3),
                wave_rms_m=round(float(ss.std()), 3), amp_vs_age={k: round(float(np.median(v)), 3) for k, v in sorted(aa.items())},
                spectrum_t=dict(f=fq[band].round(3).tolist(), p=(F[band] / F[band].max()).round(4).tolist()),
                series=dict(t=gg.round(4).tolist(), x=ss.round(4).tolist()), head=dict(t=t.round(3).tolist(), z=zs.round(2).tolist(), v=v.round(2).tolist()))


# ---------------------------------------------------------------------------------------------
#  第三种（最终用）：星头用已拟合的二次阻力弹道（trail_phys 第 3 节：v0、k 与比例一起拟合；和逐帧跟踪差约 1 m），
#  不再受画面里别的烟花干扰。再沿出生时刻滑动窗口量局部频率：转速恒定 → 频率不随弹体速度变；波长恒定 → 频率 ∝ 速度。
BALLISTIC = {'M': (122.0, 0.0025, 4.44), 'L': (119.0, 0.0024, None), 'S': (97.0, 0.0027, None)}   # v0 m/s、k 1/m、开花 s


def traj(key, t):
    v0, k, _ = BALLISTIC[key]; g = 9.81; a = math.atan(v0 * math.sqrt(k / g)); th = a - math.sqrt(g * k) * np.asarray(t, float)
    return np.log(np.cos(th) / math.cos(a)) / k, math.sqrt(g / k) * np.tan(th)


def stack_model(key, detrend_s=0.6, dt=1 / 120, win_s=1.2):
    ref = REFS[key]; fr, bg = load(ref); tb = BALLISTIC[key][2]
    tg = np.linspace(0, 8, 4001); zg, vg = traj(key, tg)
    grid = np.arange(0.15, (tb or 8), dt); acc = np.zeros(len(grid)); acc2 = np.zeros(len(grid)); cnt = np.zeros(len(grid)); amp_age = {}
    for i, f in enumerate(fr):
        t = i / 30.0 - ref['t0']
        if t < 0.6 or (tb and t > tb): continue
        zh = float(traj(key, t)[0]); d = signal(f, bg); mm = main_comp(d)
        if mm is None: continue
        ys_, _ = np.nonzero(mm); ys, cx, w = centerline(d, mm, ys_.min(), ys_.max())
        zr = (ref['launch'][1] - ref['crop'][1] - ys) * MPP; ok = ~np.isnan(cx) & (w > 0) & (zr < zh - 3) & (zr > 3)
        if ok.sum() < 40: continue
        te = np.interp(zr[ok], zg, tg); xr = cx[ok] * MPP; o = np.argsort(te); te, xr = te[o], xr[o]
        u = np.unique(te, return_index=True)[1]; te, xr = te[u], xr[u]
        if te[-1] - te[0] < 3 * detrend_s: continue
        g = (grid >= te[0]) & (grid <= te[-1]); xg = np.interp(grid[g], te, xr)
        res = xg - gaussian_filter1d(xg, detrend_s / dt / 2.355 * 2)
        acc[g] += res; acc2[g] += res ** 2; cnt[g] += 1
        age = t - grid[g]
        for a0 in np.arange(0, 2.5, 0.25):
            mk = (age >= a0) & (age < a0 + 0.25)
            if mk.sum() > 15: amp_age.setdefault(round(a0 + 0.125, 3), []).append(float(res[mk].std()))
    m = cnt >= 3; gg = grid[m]; ss = acc[m] / cnt[m]
    # 帧间一致性：同一出生时刻在不同帧里量到的偏移是否一致（一致 = 真波浪，不是逐帧噪声）
    consist = float(np.mean(ss ** 2) / np.mean(acc2[m] / cnt[m]))
    # 整段频谱
    W = np.hanning(len(ss)); F = np.abs(np.fft.rfft((ss - ss.mean()) * W, 8 * len(ss))) ** 2; fq = np.fft.rfftfreq(8 * len(ss), dt)
    band = (fq > 0.5) & (fq < 12); kpk = np.argmax(F * band)
    # 滑动窗口局部频率
    loc = []; n = int(win_s / dt)
    for s0 in range(0, len(ss) - n, n // 4):
        seg = ss[s0:s0 + n]; Fs = np.abs(np.fft.rfft((seg - seg.mean()) * np.hanning(n), 16 * n)) ** 2; fs = np.fft.rfftfreq(16 * n, dt)
        b = (fs > 0.5) & (fs < 12); kk = np.argmax(Fs * b); tc = float(gg[s0 + n // 2])
        loc.append(dict(t=round(tc, 2), v=round(float(traj(key, tc)[1]), 1), f=round(float(fs[kk]), 2), lam=round(float(traj(key, tc)[1] / fs[kk]), 1), amp=round(float(seg.std() * math.sqrt(2)), 2)))
    return dict(key=key, t_emit=[round(float(gg[0]), 2), round(float(gg[-1]), 2)], peak_hz=round(float(fq[kpk]), 2), consist=round(consist, 2),
                wave_rms_m=round(float(ss.std()), 3), local=loc, amp_vs_age={k: round(float(np.median(v)), 3) for k, v in sorted(amp_age.items())},
                series=dict(t=gg.round(4).tolist(), x=ss.round(4).tolist()), spectrum=dict(f=fq[band][::4].round(3).tolist(), p=(F[band] / F[band].max())[::4].round(4).tolist()))
