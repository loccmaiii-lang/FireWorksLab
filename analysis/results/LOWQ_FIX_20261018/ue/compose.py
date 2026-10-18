# 低画质对比拼图（本机同步检测 10-18）：只裁切 + 整倍最近邻放大，不调色、不锐化。
# 用法：python compose.py <rise_dir> <gold_dir> <out_dir>
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont
rise_dir, gold_dir, out_dir = sys.argv[1:4]
F = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 22); FS = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 17)
def load(d, f): return np.asarray(Image.open(os.path.join(d, f)).convert('RGB'))
def label(img, text, xy, font=F, fill=(235, 235, 235)): ImageDraw.Draw(img).text(xy, text, font=font, fill=fill)
def stream(d):
    p = os.path.join(d, 'stream.json')
    return {s['file']: s for s in json.load(open(p, encoding='utf-8'))} if os.path.exists(p) else {}

# ---------- 升空：每张图找 6 条尾缀的星头（从左到右 L 现状 / NoMip / NoMip+1024、M 同），裁星头附近 ----------
COLS = ['L 现状', 'L NoMip', 'L NoMip+1024', 'M 现状', 'M NoMip', 'M NoMip+1024']
def heads(a):
    lum = a.max(axis=2).astype(np.int32); mask = lum > 150
    xs = np.where(mask.any(axis=0))[0]
    if not len(xs): return []
    runs, s, p = [], xs[0], xs[0]
    for x in xs[1:]:
        if x - p > 25: runs.append((s, p)); s = x
        p = x
    runs.append((s, p)); out = []
    for s, e in runs:
        sub = mask[:, s:e + 1]; ys = np.where(sub.any(axis=1))[0]
        if sub.sum() < 12: continue
        y0 = ys[0]; row = np.where(sub[y0:y0 + 6].any(axis=0))[0]
        out.append((s + int(row.mean()), int(y0)))
    return out
def rise_sheet(times, name, cw=96, ch=128, k=3, bg=False):
    st = stream(rise_dir); rows = []
    # bg：远机位画面下方有地面灯光，找星头时先减去各帧逐像素最小值（灯不动、尾缀在动）；裁图仍用原图
    B = np.min([load(rise_dir, f) for f in sorted(os.listdir(rise_dir)) if f.startswith('t0')], axis=0).astype(np.int16) if bg else None
    for t in times:
        f = 't%05d' % int(t * 1000); a = load(rise_dir, f); hs = heads(np.clip(a.astype(np.int16) - B, 0, 255) if bg else a)
        cells = [None] * 6
        if len(hs) == 6: idx = range(6)
        elif len(hs) == 3 and t > 4.2: idx = range(3)
        else: idx = []
        for i, (x, y) in zip(idx, hs): cells[i] = a[max(0, y - 24):max(0, y - 24) + ch, max(0, x - cw // 2):max(0, x - cw // 2) + cw]
        rows.append((t, cells, st.get(f, {})))
    W, H = cw * k, ch * k; img = Image.new('RGB', (150 + 6 * (W + 8), 44 + len(rows) * (H + 8)), (18, 18, 22))
    for j, c in enumerate(COLS): label(img, c, (150 + j * (W + 8) + 8, 8))
    for i, (t, cells, s) in enumerate(rows):
        y = 44 + i * (H + 8); label(img, '%.1f s' % t, (12, y + 8))
        lv = s.get('T_EFX_FireWorks_RiseTrail_L_Loop_16x1_01_HD')
        if lv: label(img, '正式图 ' + lv.split('/')[0], (12, y + 40), FS, (170, 170, 170))
        for j, c in enumerate(cells):
            if c is None or not c.size: continue
            tile = Image.fromarray(np.ascontiguousarray(c)).resize((c.shape[1] * k, c.shape[0] * k), Image.NEAREST)
            img.paste(tile, (150 + j * (W + 8), y))
    img.save(os.path.join(out_dir, name), quality=88); return img.size

# ---------- 金芒菊：三朵固定屏幕位置（现状 / NoMip / NoMip+1024） ----------
def gold_centers(a):     # 用刚绽放（三朵都已出现、还没长大）那帧的亮区外框中心；画面下方的地面灯光不算
    lum = a.max(axis=2) > 60; ys, xs = np.where(lum)
    cs = []
    for lo, hi in [(0, 810), (810, 1110), (1110, 1920)]:
        m = (xs >= lo) & (xs < hi) & (ys > 200) & (ys < 950)
        cs.append(((int(xs[m].min()) + int(xs[m].max())) // 2, (int(ys[m].min()) + int(ys[m].max())) // 2) if m.sum() > 20 else None)
    return cs
def gold_sheet(times, name, half=170, k=1, zoom=None):
    st = stream(gold_dir); ref = load(gold_dir, 't00200'); cs = gold_centers(ref)
    S = 2 * half * k; img = Image.new('RGB', (150 + 3 * (S + 8), 44 + len(times) * (S + 8)), (18, 18, 22))
    for j, c in enumerate(['金芒菊 现状（流送）', 'NoMip', 'NoMip+1024']): label(img, c, (150 + j * (S + 8) + 8, 8))
    for i, t in enumerate(times):
        f = 't%05d' % int(t * 1000); a = load(gold_dir, f); y = 44 + i * (S + 8)
        s = st.get(f, {}); age = s.get('age', t); label(img, '%.2f s' % age, (12, y + 8))
        lv = s.get('T_EFX_FireWorks_GoldRayChry_4x4_01_HD')
        if lv: label(img, '正式图 ' + lv.split('/')[0], (12, y + 40), FS, (255, 190, 120) if lv.startswith('128') else (170, 170, 170))
        for j, c in enumerate(cs):
            if c is None: continue
            cx, cy = c; tile = a[cy - half:cy + half, cx - half:cx + half]
            img.paste(Image.fromarray(np.ascontiguousarray(tile)).resize((tile.shape[1] * k, tile.shape[0] * k), Image.NEAREST), (150 + j * (S + 8), y))
    img.save(os.path.join(out_dir, name), quality=88); return img.size

os.makedirs(out_dir, exist_ok=True)
if len(sys.argv) > 4 and sys.argv[4] == 'far':     # 约 800 m 连续帧：看 NoMip 远处闪不闪（第三个参数不用）
    print(rise_sheet([3.8, 3.85, 3.9, 3.95, 5.0, 5.05, 5.1, 5.15, 6.8], '升空_800m连续帧_低档.jpg', cw=40, ch=56, k=5, bg=True)); sys.exit()
print(rise_sheet([1.0, 2.5, 3.8, 5.0, 6.0, 6.8, 7.3], '升空_现状对NoMip_低档.jpg'))
print(gold_sheet([0.05, 0.1, 0.15, 0.2, 0.5, 2.0], '金芒菊_绽放流送对NoMip_低档.jpg', half=150, k=1))
print(gold_sheet([0.05, 0.1, 0.15, 0.2], '金芒菊_绽放局部放大_低档.jpg', half=60, k=3))
