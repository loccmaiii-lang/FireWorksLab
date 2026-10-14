import numpy as np, subprocess, sys
rng = np.random.default_rng(7)
W = H = 512
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
def field(n, seed):
    r = np.random.default_rng(seed); x = np.zeros((H, W), np.float32)
    for _ in range(n):
        cx, cy, s, a = r.uniform(0, W), r.uniform(0, H), r.uniform(1.5, 9), r.uniform(0.5, 30)
        x += a * np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * s * s))
    return x
def enc(x, gamma=1.0): return np.round(np.minimum((1 - np.exp(-x)) ** (1 / gamma), 253 / 255) * 255).astype(np.uint8)
def black_w(v):     # 256 宽 Ramp、第 255 格黑、双线性：u = v/255
    u = v.astype(np.float32) / 255 * 256
    return np.clip(u - 254.5, 0, 1)
def run(img, uber, perc=0):
    img.tofile('in.raw'); subprocess.run(['./bc7rt', 'in.raw', 'out.raw', str(W), str(H), str(uber), str(perc)], check=True)
    return np.fromfile('out.raw', np.uint8).reshape(H, W, 4)
cases = {}
F = [enc(field(260, s)) for s in (1, 2, 3, 4)]
cases['RGBA 接力（4 个通道不同帧）'] = np.stack(F, -1)
cases['只用 R（GBA = 0）'] = np.stack([F[0], np.zeros_like(F[0]), np.zeros_like(F[0]), np.zeros_like(F[0])], -1)
cases['RGB 接力 + A 满 255'] = np.stack([F[0], F[1], F[2], np.full_like(F[0], 255)], -1)
for name, img in cases.items():
    for uber in (0, 2):
        d = run(img, uber)
        for c in range(4 if 'RGBA' in name else 1):
            o, v = img[..., c].astype(int), d[..., c].astype(int)
            sat = o == 253
            bw = black_w(v)
            err = np.abs(v - o)
            print(f'{name} uber{uber} 通道{"RGBA"[c]}: 封顶像素 {sat.mean()*100:.1f}% · 解码 ≥254 {(v>=254).mean()*100:.2f}%（其中原本 253 的 {((v>=254)&sat).sum()/max(1,sat.sum())*100:.1f}%） · 发黑 ≥25% 的像素 {(bw>=0.25).mean()*100:.2f}% · 误差 均 {err.mean():.2f} / 最大 {err.max()}')
