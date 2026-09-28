"""尾缀3.0 质感参考：vidio/3.0/尾缀3.0_A.mp4（4K 竖拍，跟拍上升）。
用户指定它的「粒子效果与质感」为目标（2026-09-28）：星头后白热段、密集清晰的短竖线火星、白金色、末段闪点。

取上升早段（第 16–40 帧，尾迹约 1400–1750 像素长，细节最足）；
背景用大尺度模糊估计（手持跟拍，时间中值不可用）；中心线平滑加大，避免 4K 下逐行抖动把火星剪成锯齿。
返回与 trail_fit.ref_side 相同的结构：{'prof', 'L', 'strips'}。
"""
import os, sys, json, tempfile
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import trailkit as K

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
VIDEO = 'vidio/3.0/尾缀3.0_A.mp4'
FRAMES = [16, 20, 24, 28, 32, 36, 40]
STRAIGHT = dict(maxlen=2400, half=160, smooth=40, win=60)


def frame_signal(f):
    L = K.lin(f)
    bg = cv2.resize(cv2.GaussianBlur(cv2.resize(L, None, fx=.125, fy=.125), (0, 0), 6), (L.shape[1], L.shape[0]))
    return np.clip(L - bg, 0, None)


def ref_side():
    cache = os.path.join(tempfile.gettempdir(), 'fw_ref3A_v3.npz')
    if os.path.exists(cache):
        d = np.load(cache, allow_pickle=True); return d['ref'].item()
    cap = cv2.VideoCapture(os.path.join(ROOT, VIDEO)); i = 0; profs, strips = [], []
    while i <= max(FRAMES):
        ok, f = cap.read()
        if not ok: break
        if i in FRAMES:
            h, sig = K.find_head(frame_signal(f)); st, line = K.straighten(sig, h, **STRAIGHT)
            p = K.profile(st, line); profs.append(p); strips.append(st.astype(np.float16))
        i += 1
    Lr = int(np.median([p['L'] for p in profs]))
    avg = {k: np.mean([p[k] for p in profs], 0).tolist() if isinstance(profs[0][k], list) else float(np.mean([p[k] for p in profs])) for k in profs[0]}
    avg['L'] = Lr
    ref = {'prof': avg, 'L': Lr, 'strips': [s[:int(Lr * 1.3)].astype(np.float32) for s in strips[:4]]}
    np.savez_compressed(cache, ref=np.array(ref, dtype=object))
    return ref


if __name__ == '__main__':
    r = ref_side(); p = r['prof']
    print('L', r['L'], {k: (round(v, 4) if not isinstance(v, list) else [round(x, 3) for x in v[::3]]) for k, v in p.items()})
