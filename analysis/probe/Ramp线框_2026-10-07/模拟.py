# Ramp 贴图 Wrap / Clamp 在颜色 ×30 下的差别（对话框21，2026-10-07）
# 用归档里的 RGBA 接力序列（PW3 第 G 通道一格），按烘焙器材质公式 color = ramp(v) * v * K 模拟：
#   序列图双线性放大 4 倍 → Ramp（256 宽，sRGB 存）按 Wrap / Clamp 双线性取样 → ×30 → ACES 近似 → sRGB。
# 跑法：python3 analysis/probe/Ramp线框_2026-10-07/模拟.py <中文字体.ttc>
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
SRC = '归档/results/PW3/T_EFX_FireWorks_PrismWheels_UnitRGBA_4x4_01.png'
o = np.asarray(Image.open(SRC)).astype(np.float32) / 255
def h2l(h):
    c = np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
Rc = [h2l(x) for x in ['#000000', '#7a1e04', '#ffa53a', '#fff3dc']]; P = [0, .3, .65, 1]     # MAT_BASE 缺省 Ramp
def rampc(v):
    for i in range(1, 4):
        if v <= P[i]: k = (v - P[i - 1]) / (P[i] - P[i - 1]); return Rc[i - 1] + (Rc[i] - Rc[i - 1]) * k
    return Rc[3]
W = 256
def s8(x): x = np.clip(x, 0, 1); return np.round(255 * np.where(x <= 0.0031308, 12.92 * x, 1.055 * x ** (1 / 2.4) - 0.055))
def lin(x): x = x / 255; return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)
tex = np.array([lin(s8(rampc(i / (W - 1)))) for i in range(W)])
def mip(t, lv):
    for _ in range(lv): t = (t[0::2] + t[1::2]) / 2
    return t
def sample(u, wrap, t):
    n = len(t); x = u * n - 0.5; i0 = np.floor(x).astype(int); f = (x - i0)[..., None]; i1 = i0 + 1
    if wrap: i0 %= n; i1 %= n
    else: i0 = np.clip(i0, 0, n - 1); i1 = np.clip(i1, 0, n - 1)
    return t[i0] * (1 - f) + t[i1] * f
def up(a, s):
    h, w = a.shape; ys = (np.arange(h * s) + 0.5) / s - 0.5; xs = (np.arange(w * s) + 0.5) / s - 0.5
    y0 = np.clip(np.floor(ys).astype(int), 0, h - 1); x0 = np.clip(np.floor(xs).astype(int), 0, w - 1)
    y1 = np.clip(y0 + 1, 0, h - 1); x1 = np.clip(x0 + 1, 0, w - 1)
    fy = np.clip(ys - np.floor(ys), 0, 1)[:, None]; fx = np.clip(xs - np.floor(xs), 0, 1)[None, :]
    return (a[y0][:, x0] * (1 - fx) + a[y0][:, x1] * fx) * (1 - fy) + (a[y1][:, x0] * (1 - fx) + a[y1][:, x1] * fx) * fy
aces = lambda x: np.clip((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0, 1)
srgb = lambda x: np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(x, 1 / 2.4) - 0.055)
v = up(o[512:672, 528:688, 1], 4); bg = np.array([0.022] * 3)
f = ImageFont.truetype(sys.argv[1], 26) if len(sys.argv) > 1 else None
S = v.shape[0]; img = Image.new('RGB', (S * 3 + 20, S + 50)); d = ImageDraw.Draw(img)
for i, (lab, wrap, lv) in enumerate([('Ramp 改成 Clamp（修好）', False, 0), ('Ramp 默认 Wrap', True, 0), ('Wrap + 有 Mip', True, 3)]):
    c = sample(v, wrap, mip(tex, lv)) * v[..., None] * 30 + bg
    img.paste(Image.fromarray((srgb(aces(c)) * 255).astype(np.uint8)), (i * (S + 10), 50))
    d.text((i * (S + 10) + 10, 10), lab + ' · 颜色 ×30', fill=(255, 230, 120), font=f)
img.save('Ramp线框_模拟.png')
