# 256 宽「护栏」Ramp（对话框21，2026-10-07）：第 0–254 格和烘焙器 rampPixels 完全一样，第 255 格放黑。
# 材质按 Wrap 读 Ramp 时，v≈0 混到的是第 255 格（黑）→ 不出线；代价：序列图必须封顶 ≤ 253/255（254、255 会混到黑格）。
# 跑法：python3 护栏Ramp.py <输出.png> <ramp0> <ramp1> <ramp2> <ramp3>
import sys, numpy as np
from PIL import Image
out = sys.argv[1]; hexes = sys.argv[2:6]; W = 256; POS = [0, .3, .65, 1]
def h2l(h):
    n = int(h[1:], 16); c = np.array([(n >> 16) & 255, (n >> 8) & 255, n & 255]) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
C = [h2l(h) for h in hexes]
def ramp_at(v):
    for i in range(1, 4):
        if v <= POS[i]: k = (v - POS[i - 1]) / (POS[i] - POS[i - 1]); return C[i - 1] + (C[i] - C[i - 1]) * k
    return C[3]
def srgb8(c):
    c = np.clip(c, 0, 1); return np.round(255 * np.clip(np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(c, 1 / 2.4) - 0.055), 0, 1))
row = np.array([srgb8(ramp_at(x / (W - 1))) for x in range(W)], np.uint8); row[W - 1] = 0
img = np.zeros((8, W, 4), np.uint8); img[..., :3] = row[None]; img[..., 3] = 255
Image.fromarray(img, 'RGBA').save(out); print(out)
