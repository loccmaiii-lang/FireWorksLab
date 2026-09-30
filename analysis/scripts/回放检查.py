"""导出贴图的回放检查（按引擎的播法，不是实时模拟）：进「待我验收」前必须做（CLAUDE.md「进入待我验收的条件」第 3 条）。

读素材包里的 cascade.json（格子、帧数、帧号曲线、Size By Life、Color Over Life）+ 序列贴图（RGBA 接力）+ Ramp，
按 Cascade 的方式在几个时刻合成画面（多个素材包 = 组合各层，按各自的面片大小和延迟叠加），并自动检查：
  - 裁切：内容碰到格子边（每帧格子最外 2 像素的亮度占比）
  - 曝光：灰度到顶（≥ 250）的像素占比
  - 空帧、帧间跳变（相邻帧亮部中心移动的像素数）
  - 组合：各层的面片中心 / 大小（错位）
用法：
  python3 analysis/scripts/回放检查.py <输出图.jpg> <素材包目录1> [<素材包目录2> ...] [--delay 0,0.9] [--times 0.1,0.3,0.5,0.7,0.9]
输出：<输出图.jpg>（上面一行是组合，下面每层一行）+ 同名 .json（检查数值）
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw


def curve(c, u):
    """fwl.cascade/1 的曲线：{"const": v} 或 {"curve": [[t, v], ...]}（线性）"""
    if 'const' in c: return np.array(c['const'], float) if isinstance(c['const'], list) else float(c['const'])
    pts = c['curve']; ts = [p[0] for p in pts]; vs = [np.array(p[1], float) if isinstance(p[1], list) else float(p[1]) for p in pts]
    if u <= ts[0]: return vs[0]
    for i in range(1, len(ts)):
        if u <= ts[i]:
            a = (u - ts[i - 1]) / max(1e-9, ts[i] - ts[i - 1]); return vs[i - 1] + (vs[i] - vs[i - 1]) * a
    return vs[-1]


def srgb_to_lin(x): return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


class Pack:
    def __init__(self, d, ei=0):
        self.d = d; cj = os.path.join(d, 'cascade.json'); self.c = json.load(open(cj, encoding='utf-8'))
        self.e = self.c['emitters'][ei]; self.label = os.path.basename(d) + ('' if len(self.c['emitters']) == 1 else ' · ' + self.e['name'])
        self.delay = float(self.e['required'].get('delay_s', 0))
        mat = (self.c.get('materials') or {}).get(self.e.get('material'), {}); tk = (mat.get('textures') or {}).get('main') or 'seq'
        seq = self.c['textures'][tk]; self.cols, self.rows, self.ch, self.frames = seq['cols'], seq['rows'], seq.get('channels', 1), seq['frames']
        self.tex = np.array(Image.open(os.path.join(d, seq['file'])).convert('RGBA' if self.ch == 4 else 'L'), np.float32) / 255
        if self.tex.ndim == 2: self.tex = self.tex[..., None]
        rp = self.c['textures'].get('ramp'); self.ramp = None
        if rp and os.path.exists(os.path.join(d, rp['file'])):
            r = np.array(Image.open(os.path.join(d, rp['file'])).convert('RGB'), np.float32) / 255; self.ramp = srgb_to_lin(r[r.shape[0] // 2])
        self.mods = {m['m']: m for m in self.e['modules']}
        self.life = float(curve(self.mods['Lifetime']['Lifetime'], 0)) if 'Lifetime' in self.mods else self.e['required']['duration_s']
        H, W = self.tex.shape[:2]; self.cw, self.chh = W // self.cols, H // self.rows

    def cell(self, f):
        per = self.cols * self.rows; c, k = f // per, f % per; x, y = (k % self.cols) * self.cw, (k // self.cols) * self.chh
        return self.tex[y:y + self.chh, x:x + self.cw, min(c, self.tex.shape[2] - 1)]

    def frame_at(self, u):
        dp = self.mods.get('DynamicParameter')
        f = float(curve(dp['params']['frame'], u)) if dp else u * self.frames
        return int(min(self.frames - 1, max(0, np.floor(f))))

    def color(self, u):
        col = self.mods.get('ColorOverLife'); return np.array(curve(col['ColorOverLife'], u), float) if col else np.ones(3)

    def size(self, u):
        s0 = np.array(curve(self.mods['InitialSize']['StartSize'], 0), float)[:2] if 'InitialSize' in self.mods else np.array([1000., 1000.])
        sb = self.mods.get('SizeByLife'); m = np.array(curve(sb['LifeMultiplier'], u), float)[:2] if sb else np.ones(2)
        return s0 * m       # 面片宽高（cm）

    def rgb(self, v, u):
        """材质：ramp(v) · v · Color Over Life（和烘焙器「导出效果」同一公式，不含曝光倍数）"""
        if self.ramp is not None:
            idx = np.clip((v * (len(self.ramp) - 1)).astype(int), 0, len(self.ramp) - 1); base = self.ramp[idx]
        else: base = np.repeat(v[..., None], 3, -1)
        return base * v[..., None] * self.color(u)[None, None, :] * 4.0     # 4.0 = 材质里的自发光倍数（和烘焙器 uK 一致）


def ref_frames(ref, ts, px):
    """实拍同一时刻（开花起算）：ref = {video, t0, cx, cy, half}（烘焙器条目的 vmeta），按亮部外框取正方形"""
    import cvcompat  # Windows 中文视频路径；读取失败不能拿黑图充当参考。
    import cv2
    cap = cv2.VideoCapture(ref['video']); out = []
    try:
        if not cap.isOpened(): raise IOError('打不开参考视频：' + ref['video'])
        fps = cap.get(cv2.CAP_PROP_FPS)
        if not np.isfinite(fps) or fps <= 0: raise IOError('参考视频帧率无效：' + ref['video'])
        for t in ts:
            frame = int(round((ref['t0'] + t) * fps))
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame); ok, f = cap.read()
            if not ok: raise IOError(f'参考视频读帧失败：开花后 {t:.3f}s，第 {frame} 帧，{ref["video"]}')
            H, W = f.shape[:2]; h = ref.get('half', 0.3) * H * 1.15; cx, cy = ref.get('cx', 0.5) * W, ref.get('cy', 0.5) * H
            x0, y0 = int(max(0, cx - h)), int(max(0, cy - h)); x1, y1 = int(min(W, cx + h)), int(min(H, cy + h))
            if x1 <= x0 or y1 <= y0: raise ValueError('参考裁切区域无效')
            out.append(np.array(Image.fromarray(cv2.cvtColor(f[y0:y1, x0:x1], cv2.COLOR_BGR2RGB)).resize((px, px), Image.BILINEAR)))
        return out
    finally:
        cap.release()


def check(packs, out, delays=None, times=(0.1, 0.3, 0.5, 0.7, 0.9), px=360, ref=None, times_s=None):
    delays = delays or [0.0] * len(packs)
    delays = [d + p.delay for p, d in zip(packs, delays)]
    T = max(d + p.life for p, d in zip(packs, delays))
    span = T
    if ref:
        import cvcompat
        import cv2
        cap = cv2.VideoCapture(ref['video'])
        try:
            if not cap.isOpened(): raise IOError('打不开参考视频：' + ref['video'])
            fps = cap.get(cv2.CAP_PROP_FPS); count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
            if fps <= 0 or count <= 0: raise IOError('参考视频时长无效')
            span = min(T, (count - 1) / fps - ref['t0'])
            if span <= 0: raise ValueError('参考没有开花后的帧')
        finally: cap.release()
    samples = list(times_s) if times_s is not None else [fr * span for fr in times]
    if any(t < 0 or t > span + 1e-6 for t in samples): raise ValueError('采样超出素材或参考有效时间')
    world = max(max(p.size(u).max() for u in np.linspace(0, 1, 21)) for p in packs) * 1.05     # 画面边长（cm）
    rep = dict(total_s=round(T, 3), sample_times_s=samples, sample_span_s=span, layers=[])
    rows = [[] for _ in range(len(packs) + 1)]
    for p in packs:   # 逐帧自动检查
        edge, sat, empty, jumps, last = [], [], 0, [], None
        for f in range(p.frames):
            c = p.cell(f); tot = c.sum() + 1e-9
            b = np.concatenate([c[:2].ravel(), c[-2:].ravel(), c[:, :2].ravel(), c[:, -2:].ravel()]); edge.append(float(b.sum() / tot))
            sat.append(float((c >= 250 / 255).mean())); m = c > 0.08
            if not m.any(): empty += 1; continue
            if m.sum() < 400: last = None; continue       # 亮部太少（开头 / 末尾零星几颗）不算跳变
            ys, xs = np.nonzero(m); cen = (xs.mean(), ys.mean())
            if last is not None: jumps.append(float(np.hypot(cen[0] - last[0], cen[1] - last[1])))
            last = cen
        rep['layers'].append(dict(pack=p.label, frames=p.frames, grid=f'{p.cols}x{p.rows}x{p.ch}', cell_px=[p.cw, p.chh], life_s=round(p.life, 3),
                                  edge_max=round(max(edge), 4), edge_frames_over_2pct=int(sum(e > 0.02 for e in edge)), saturated_max=round(max(sat), 4),
                                  empty_frames=empty, center_jump_max_px=round(max(jumps), 2) if jumps else 0))
    for t in samples:
        acc = np.zeros((px, px, 3), np.float32)
        for li, (p, d) in enumerate(zip(packs, delays)):
            lay = np.zeros((px, px, 3), np.float32); age = t - d
            if 0 <= age <= p.life:
                u = age / p.life; v = p.cell(p.frame_at(u)); w, h = p.size(u) / world * px
                w, h = max(2, int(round(w))), max(2, int(round(h)))
                im = np.array(Image.fromarray((v * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), np.float32) / 255
                col = p.rgb(im, u); x0, y0 = (px - w) // 2, (px - h) // 2
                xa, ya, xb, yb = max(0, x0), max(0, y0), min(px, x0 + w), min(px, y0 + h)
                lay[ya:yb, xa:xb] += col[ya - y0:yb - y0, xa - x0:xb - x0]
            acc += lay; rows[li + 1].append(lay)
        rows[0].append(acc)
    def tone(a): return (np.clip(1 - np.exp(-a * 1.5), 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)
    refs = ref_frames(ref, samples, px) if ref else None
    if refs: rows.insert(0, refs)
    W = px * len(samples); H = px * len(rows)
    sheet = Image.new('RGB', (W + 110, H + 22), (14, 15, 20)); dr = ImageDraw.Draw(sheet)
    from PIL import ImageFont
    font = None
    for fp in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc', 'C:/Windows/Fonts/msyh.ttc'):
        if os.path.exists(fp): font = ImageFont.truetype(fp, 13); break
    names = (['实拍'] if refs else []) + ['组合'] + [p.label for p in packs]
    for r, row in enumerate(rows):
        dr.text((4, 22 + r * px + px // 2), names[r][:14] if font else ('combo' if r == 0 else f'layer {r}'), fill=(220, 210, 180), font=font)
        for c, a in enumerate(row): sheet.paste(Image.fromarray(a if a.dtype == np.uint8 else tone(a)), (110 + c * px, 22 + r * px))
    for c, t in enumerate(samples): dr.text((110 + c * px + 4, 4), f'开花后 {t:.3f}s', fill=(233, 180, 95), font=font)
    sheet.save(out, quality=88)
    json.dump(rep, open(os.path.splitext(out)[0] + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return rep


if __name__ == '__main__':
    args = sys.argv[1:]; delays = None; times = (0.1, 0.3, 0.5, 0.7, 0.9)
    if '--delay' in args: i = args.index('--delay'); delays = [float(x) for x in args[i + 1].split(',')]; del args[i:i + 2]
    if '--times' in args: i = args.index('--times'); times = tuple(float(x) for x in args[i + 1].split(',')); del args[i:i + 2]
    ref = None
    if '--ref' in args: i = args.index('--ref'); ref = json.loads(args[i + 1]); del args[i:i + 2]      # {"video":..., "t0":..., "cx":..., "cy":..., "half":...}
    sep = '--separate' in args
    if sep: args.remove('--separate')
    out, dirs = args[0], args[1:]
    packs = []
    for d in dirs:
        n = len(json.load(open(os.path.join(d, 'cascade.json'), encoding='utf-8'))['emitters'])
        packs += [Pack(d, i) for i in range(n)]
    if sep:     # 各发射器各自的时间线（例：尾缀的上升循环、消散），不叠加
        base = os.path.splitext(out)[0]; r = []
        for i, p in enumerate(packs): r.append(check([p], f'{base}_{i + 1}.jpg', None, times))
    else: r = check(packs, out, delays, times, ref=ref)
    print(json.dumps(r, ensure_ascii=False, indent=1))
