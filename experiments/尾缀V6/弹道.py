"""弹道：Cascade 原生的线性阻力 + 重力（dv/dt = -D·v - g），解析解；按用户标定（时长 T、高度 H、开花时仍上升 v_end）反求出膛速度 v0、阻力 D。
用户 2026-10-01 标定：小 3.5 s / 180–200 m，中 5 s / 250–280 m，大 8 s / 400–420 m。取中间值。
大档 8 s 到 410 m：就算没有阻力，开花末速也只能 ≤ 12 m/s（大弹在顶点附近开花），取 6 m/s。"""
import math, json, numpy as np
G = 9.81
def z_of(t, v0, D):
    if D < 1e-9: return v0 * t - 0.5 * G * t * t
    return (v0 + G / D) * (1 - math.exp(-D * t)) / D - G * t / D
def v_of(t, v0, D):
    if D < 1e-9: return v0 - G * t
    return (v0 + G / D) * math.exp(-D * t) - G / D
def fit(T, H, v_end):
    """给定 T、H、v_end，解 v0、D（二分 D：v_end 约束定 v0，再看高度）"""
    def v0_for(D): return (v_end + G / D) * math.exp(D * T) - G / D if D > 1e-9 else v_end + G * T
    lo, hi = 1e-6, 3.0
    for _ in range(200):
        D = 0.5 * (lo + hi); z = z_of(T, v0_for(D), D)
        if z > H: hi = D
        else: lo = D
    D = 0.5 * (lo + hi); return v0_for(D), D
SIZES = {'S': dict(T=3.5, H=190.0, v_end=18.0), 'M': dict(T=5.0, H=265.0, v_end=20.0), 'L': dict(T=8.0, H=410.0, v_end=6.0)}
if __name__ == '__main__':
    out = {}
    for k, s in SIZES.items():
        v0, D = fit(**s); out[k] = dict(s, v0=round(v0, 3), D=round(D, 5))
        print(k, s, 'v0 %.1f m/s  D %.4f /s' % (v0, D), ' v(1/2/3 s)=', [round(v_of(t, v0, D), 1) for t in (1, 2, 3)], 'z(T)=%.1f' % z_of(s['T'], v0, D))
    # 对照：尾缀B 实拍（二次阻力 v0 122.2, k 0.00247, 开花 4.44 s）用线性阻力逼近，看星头高度误差
    k, v0q = 0.00247, 122.2; a = math.atan(v0q * math.sqrt(k / G)); w = math.sqrt(G * k)
    ts = np.linspace(0, 4.44, 45); zq = np.log(np.cos(a - w * ts) / math.cos(a)) / k; vq = math.sqrt(G / k) * np.tan(a - w * ts)
    best = None
    for D in np.linspace(0.05, 1.0, 951):
        for v0 in np.linspace(100, 160, 121):
            e = np.mean([(z_of(t, v0, D) - z) ** 2 for t, z in zip(ts[::4], zq[::4])])
            if best is None or e < best[0]: best = (e, v0, D)
    e, v0b, Db = best
    err = max(abs(z_of(t, v0b, Db) - z) for t, z in zip(ts, zq))
    print('尾缀B 线性阻力逼近：v0 %.1f D %.3f  高度最大误差 %.2f m（实拍到顶 %.1f m）  开花末速 %.1f / 实拍 %.1f m/s' % (v0b, Db, err, zq[-1], v_of(4.44, v0b, Db), vq[-1]))
    out['B_ref'] = dict(T=4.44, H=round(float(zq[-1]), 2), v0=round(v0b, 3), D=round(Db, 5), max_err_m=round(err, 2))
    json.dump(out, open('弹道.json', 'w'), ensure_ascii=False, indent=1)
