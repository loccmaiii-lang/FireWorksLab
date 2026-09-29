"""按时间窗测星的颜色（线性光：先把 sRGB 转线性再扣天空，取星头周围一圈没过曝的像素 → 发光本身的颜色）。
用法：python star_colors.py <视频> <roi x0 y0 x1 y1> <开花时刻 s> 窗1起 窗1止 [窗2起 窗2止 ...]
输出每个窗的 #rrggbb（最大通道归一）"""
import sys, numpy as np, cv2
sys.path.insert(0, __import__('os').path.dirname(__file__)); import star_analysis as A


def colors(video, roi, tb, wins, t_range=None):
    frames, fps = A.read(video, roi, *(t_range or (0, 1e9)))
    lin = lambda f: (f.astype(np.float32) / 255) ** 2.2
    bgl = np.median(np.stack([lin(f) for _, f in frames[:3]]), 0); out = []
    for w0, w1 in wins:
        acc = []
        for t, f in frames:
            a = t - tb
            if not (w0 <= a <= w1): continue
            L = lin(f); sig = np.clip(L - bgl, 0, None); Y = sig.max(2); raw = f.max(2)
            mx = cv2.dilate(Y, np.ones((7, 7), np.uint8)); hd = ((Y >= mx) & (Y > 0.08)).astype(np.uint8)
            ring = (cv2.dilate(hd, np.ones((9, 9), np.uint8)) > 0) & ~(cv2.dilate(hd, np.ones((3, 3), np.uint8)) > 0)
            m = ring & (Y > 0.02) & (raw < 245)
            if m.sum() < 50: m = (Y > 0.03) & (raw < 245)
            acc.append(sig[m])
        v = np.concatenate(acc) if acc else np.zeros((1, 3))
        c = np.median(v, 0); c = c / max(c.max(), 1e-6); rgb = c[::-1]
        s = np.where(rgb <= 0.0031308, 12.92 * rgb, 1.055 * np.clip(rgb, 0, 1) ** (1 / 2.4) - 0.055)
        out.append(('#' + ''.join(f'{int(round(x * 255)):02x}' for x in s), [round(float(x), 3) for x in rgb], int(len(v))))
    return out


if __name__ == '__main__':
    v = sys.argv[1]; roi = list(map(float, sys.argv[2:6])); tb = float(sys.argv[6]); w = list(map(float, sys.argv[7:]))
    for r in colors(v, roi, tb, list(zip(w[::2], w[1::2]))): print(r)
