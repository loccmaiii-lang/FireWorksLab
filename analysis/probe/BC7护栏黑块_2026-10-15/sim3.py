import numpy as np, subprocess
exec(open('sim.py').read().split('cases = {}')[0])
X = [field(260, s) for s in (1, 2, 3, 4)]
def bw(v, Wr):     # Wr 宽 Ramp、最后一格黑、双线性（Clamp），u = v/255
    return np.clip(v.astype(np.float32) / 255 * Wr - (Wr - 1.5), 0, 1)
res = {}
for cap in (253, 251, 250, 248):
    img = np.stack([np.round(np.minimum(1 - np.exp(-x), cap / 255) * 255).astype(np.uint8) for x in X], -1)
    d = run(img, 0); res[cap] = (img, d)
    print(f'封顶 {cap}: Ramp 256 宽 发黑≥25% {(bw(d,256)>=0.25).mean()*100:.3f}% · Ramp 1024 宽 {(bw(d,1024)>=0.25).mean()*100:.3f}% · Ramp 4096 宽 {(bw(d,4096)>=0.25).mean()*100:.4f}%（解码 =255 的像素）')
# 示意图：R 通道一块 96×96，橙色 Ramp，最后一格黑
from PIL import Image
def ramp_rgb(v, Wr):
    u = v.astype(np.float32) / 255
    base = np.stack([np.clip(u * 1.6, 0, 1), np.clip(u * 1.1 - 0.15, 0, 1) * 0.85 + 0.1 * u, np.clip(u * 1.4 - 0.6, 0, 1) * 0.8], -1)
    k = 1 - bw(v, Wr)[..., None]
    return (base * k * 255).astype(np.uint8)
img, d = res[253]; c0 = img[..., 0]; cd = d[..., 0]
# 找发黑最多的 96×96 块
best, by, bx = -1, 0, 0
for y in range(0, H - 96, 16):
    for x in range(0, W - 96, 16):
        n = (bw(cd[y:y+96, x:x+96], 256) >= 0.25).sum()
        if n > best: best, by, bx = n, y, x
img2, d2 = res[250]
tiles = [ramp_rgb(c0[by:by+96, bx:bx+96], 256), ramp_rgb(cd[by:by+96, bx:bx+96], 256), ramp_rgb(d2[by:by+96, bx:bx+96, 0], 4096)]
pan = np.concatenate([np.pad(np.kron(t, np.ones((5, 5, 1), np.uint8)), ((4, 4), (4, 4), (0, 0)), constant_values=40) for t in tiles], 1)
Image.fromarray(pan).save('../bc7_黑块示意.png'); print('块', by, bx, '发黑像素', best)
