"""尾缀3.0 质感参考：vidio/3.0/尾缀3.0_A.mp4（4K 竖拍，跟拍上升）。
用户指定它的「粒子效果与质感」为目标（2026-09-28）：星头后白热段、密集清晰的短竖线火星、白金色、末段闪点。

取上升中段（第 24–72 帧，尾迹约 650–1450 像素长）。这段是仰拍，尾迹下段离镜头近、被放大：
造型一律不从这里取，只取与透视无关的质感量（trailkit.tex_profile）；
背景用大尺度模糊估计（手持跟拍，时间中值不可用）；中心线平滑加大，避免 4K 下逐行抖动把火星剪成锯齿。
返回与 trail_fit.ref_side 相同的结构：{'prof', 'L', 'strips'}。
"""
import os, sys, json, tempfile
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import trailkit as K

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VIDEO = 'vidio/3.0/尾缀3.0_A.mp4'
FRAMES = [24, 32, 40, 48, 56, 64, 72]   # 尾迹 650–1450 像素：细节足、仰角透视比刚出膛时轻
STRAIGHT = dict(maxlen=2400, half=160, smooth=40, win=60)


def frame_signal(f):
    """背景：1/8 缩小后先做开运算（去掉比 ~120 像素窄的亮结构，也就是尾迹本身），再模糊放大。
    直接模糊会把白热段的光晕算进背景，扣完之后白热段不再是平的过曝"""
    L = K.lin(f); sm = cv2.resize(L, None, fx=.125, fy=.125, interpolation=cv2.INTER_AREA)
    sm = cv2.morphologyEx(sm, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    bg = cv2.resize(cv2.GaussianBlur(sm, (0, 0), 4), (L.shape[1], L.shape[0]))
    return np.clip(L - bg, 0, None), L


def raw_sat(Lraw, h, line, strip, Lp):
    """沿同一条中心线看原始画面：可见像素里有多少是过曝的（任一通道 ≥ 0.98），分 3 段"""
    ls = cv2.GaussianBlur(line.reshape(-1, 1).astype(np.float32), (1, 0), STRAIGHT['smooth']).ravel()
    top = Lraw.max(2); H, W = top.shape; half = STRAIGHT['half']; hx, hy = h
    Y = strip.sum(2); p995 = np.percentile(Y[:Lp], 99.5); out = []
    for z in range(K.NZ):
        a, e = int(z * Lp / K.NZ), int((z + 1) * Lp / K.NZ); n = s = 0
        for r in range(a, e):
            yy = int(hy) - 3 + r
            if yy >= H: break
            xs = np.clip(np.round(ls[r] + np.arange(-half, half + 1)).astype(int), 0, W - 1); m = Y[r] > 0.05 * p995
            n += m.sum(); s += (top[yy, xs][m] >= 0.98).sum()
        out.append(float(s / max(1, n)))
    return out


def ref_side():
    cache = os.path.join(tempfile.gettempdir(), 'fw_ref3A_v6.npz')
    if os.path.exists(cache):
        d = np.load(cache, allow_pickle=True); return d['ref'].item()
    cap = cv2.VideoCapture(os.path.join(ROOT, VIDEO)); i = 0; profs, strips = [], []
    while i <= max(FRAMES):
        ok, f = cap.read()
        if not ok: break
        if i in FRAMES:
            sg, Lraw = frame_signal(f); h, sig = K.find_head(sg); st, line = K.straighten(sig, h, **STRAIGHT)
            p = K.profile(st, line); p['tex'] = K.tex_profile(st, p['L']); p['tex']['sat'] = raw_sat(Lraw, h, line, st, p['L'])
            profs.append(p); strips.append(st.astype(np.float16))
        i += 1
    Lr = int(np.median([p['L'] for p in profs]))
    avg = {k: np.mean([p[k] for p in profs], 0).tolist() if isinstance(profs[0][k], list) else float(np.mean([p[k] for p in profs])) for k in profs[0] if k != 'tex'}
    avg['L'] = Lr
    avg['tex'] = {k: np.mean([p['tex'][k] for p in profs], 0).tolist() for k in profs[0]['tex']}
    ref = {'prof': avg, 'L': Lr, 'strips': [s[:int(Lr * 1.3)].astype(np.float32) for s in strips[:4]]}
    np.savez_compressed(cache, ref=np.array(ref, dtype=object))
    return ref


if __name__ == '__main__':
    r = ref_side(); p = r['prof']
    print('L', r['L'], {k: (round(v, 4) if not isinstance(v, list) else [round(x, 3) for x in v[::3]]) for k, v in p.items()})
