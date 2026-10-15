import numpy as np
from PIL import Image, ImageDraw, ImageFont
r = np.random.default_rng(3); N = 64
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
x = np.zeros((N, N), np.float32)
for _ in range(40):
    cx, cy, s, a = r.uniform(0, N), r.uniform(0, N), r.uniform(1.2, 4), r.uniform(0.3, 6)
    x += a * np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * s * s))
old = np.round((1 - np.exp(-x)) * 255).astype(np.float32)                         # 4.9.31 以前：不封顶，最亮到 255
new = np.round(np.minimum(1 - np.exp(-x), 253 / 255) * 255).astype(np.float32)    # 现在：封顶 253
def ramp_tex(guard, W=256):
    u = np.arange(W) / (W - 1)
    c = np.stack([np.clip(u * 1.5, 0, 1), np.clip(u * 1.25 - 0.25, 0, 1), np.clip(u * 1.6 - 0.75, 0, 1)], -1) ** 1.2
    if guard: c[-1] = 0
    return c
def up(img, k):     # 双线性放大（显卡对序列图的取样）
    n = img.shape[0]; t = (np.arange(n * k) + 0.5) / k - 0.5
    i0 = np.clip(np.floor(t).astype(int), 0, n - 1); i1 = np.clip(i0 + 1, 0, n - 1); f = np.clip(t - np.floor(t), 0, 1)
    a = img[i0][:, i0] * (1 - f)[None] + img[i0][:, i1] * f[None]; b = img[i1][:, i0] * (1 - f)[None] + img[i1][:, i1] * f[None]
    return a * (1 - f)[:, None] + b * f[:, None]
def lookup(v, R, wrap):     # 材质按 u = v 双线性查 Ramp
    W = R.shape[0]; p = v * W - 0.5; i0 = np.floor(p).astype(int); f = (p - i0)[..., None]
    if wrap: a, b = R[i0 % W], R[(i0 + 1) % W]
    else: a, b = R[np.clip(i0, 0, W - 1)], R[np.clip(i0 + 1, 0, W - 1)]
    return a * (1 - f) + b * f
def render(seq, guard, wrap, gain):
    v = up(seq, 8) / 255; c = lookup(v, ramp_tex(guard), wrap) * v[..., None] * gain     # 发光 × 透明度 v（半透明叠加的近似）
    return (np.clip(c, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)
cells = [
  ('旧序列（不封顶）+ 末格黑 Ramp', render(old, True, False, 1.6)),
  ('旧序列 + 末格不黑 Ramp', render(old, False, False, 1.6)),
  ('现在的序列（封顶 253）+ 末格黑 Ramp', render(new, True, False, 1.6)),
  ('×30 · 末格黑 · 像 Wrap 那样漏', render(new, True, True, 30)),
  ('×30 · 末格不黑 · 像 Wrap 那样漏', render(new, False, True, 30)),
  ('×30 · 末格不黑 · Clamp 不漏', render(new, False, False, 30)),
]
S = cells[0][1].shape[0]; pad = 8; top = 34
can = Image.new('RGB', (3 * (S + pad) + pad, 2 * (S + top + pad) + pad), (24, 24, 28)); d = ImageDraw.Draw(can)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', 18)
except Exception:
    import glob; fs = glob.glob('/usr/share/fonts/**/*CJK*', recursive=True) + glob.glob('/usr/share/fonts/**/*Hei*', recursive=True); font = ImageFont.truetype(fs[0], 18) if fs else ImageFont.load_default()
for k, (t, im) in enumerate(cells):
    cx, cy = pad + (k % 3) * (S + pad), pad + (k // 3) * (S + top + pad)
    d.text((cx, cy + 4), t, fill=(230, 230, 230), font=font); can.paste(Image.fromarray(im), (cx, cy + top))
can.save('Ramp末格_复现.png'); print(can.size, 'old>=254:', (old >= 254).mean(), 'new max', new.max())
