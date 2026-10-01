"""单条线的亮度沿半径分布（只在线上取样，去掉了线条汇聚 / 覆盖率的几何影响）。"""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import 考卷 as K
def profile(img, cx, cy, R, nb=10):
    P = K.polar(img.astype(np.float32), cx, cy, R * 1.05, int(R * 1.05)); S = K.sector_mask()
    L = np.clip(P, 0, 255).max(-1); v = P[..., 0] >= 0; bg = np.percentile(L[v & S[None, :]], 20); Lb = np.clip(L - bg, 0, None)
    r6 = int(0.6 * R); a = Lb[r6 - 2:r6 + 3].mean(0); thr = 0.3 * np.percentile(a[S], 95)
    peaks = [i for i in range(1, K.N_THETA - 1) if S[i] and a[i] >= a[i - 1] and a[i] > a[i + 1] and a[i] > thr]
    prof = np.zeros(nb); cnt = np.zeros(nb)
    for i in peaks:
        col = Lb[:, max(0, i - 1):i + 2].max(1)
        for b in range(nb):
            seg = col[int(b / nb * R):int((b + 1) / nb * R)]
            if len(seg): prof[b] += seg.mean(); cnt[b] += 1
    p = prof / np.maximum(cnt, 1); return p / p[5:8].mean(), len(peaks)
if __name__ == '__main__':
    ref = json.load(open('考卷/参考指标.json')); sc = ref['到交付分辨率缩放']
    for t in (0.5, 1.0):
        im, _ = K.ref_frames([t])[t]; cx, cy = ref['放射中心_1080'][str(t)]
        small = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
        p, n = profile(small, cx * sc, cy * sc, ref['时刻'][str(t)]['半径_交付']); print('ref', t, n, p.round(2))
    for f in sys.argv[1:]:
        for t in (0.5, 1.0):
            im = cv2.imread(f.format(t)); R = K.radius(im, 450, 450, 448); p, n = profile(im, 450, 450, R); print('sim', f.format(t), n, p.round(2))
