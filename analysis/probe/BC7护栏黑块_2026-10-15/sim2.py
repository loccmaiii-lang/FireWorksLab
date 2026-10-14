import numpy as np, subprocess
exec(open('sim.py').read().split('cases = {}')[0])
X = [field(260, s) for s in (1, 2, 3, 4)]
for cap in (253, 251, 249, 247, 245, 241):
    img = np.stack([np.round(np.minimum(1 - np.exp(-x), cap / 255) * 255).astype(np.uint8) for x in X], -1)
    d = run(img, 0)
    hit = (d >= 254).mean(axis=(0, 1)) * 100; over = (d.astype(int) - img.astype(int)).max()
    sat = (img == cap)
    print(f'封顶 {cap}: 解码 ≥254 的像素（R/G/B/A）{np.round(hit, 3)} %；封顶像素里 ≥254 的 {((d >= 254) & sat).sum() / sat.sum() * 100:.3f} %；最多往上冒 {over}')
