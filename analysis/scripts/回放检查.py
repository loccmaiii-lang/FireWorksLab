"""导出贴图的回放检查（按引擎的播法，不是实时模拟）：进「待我验收」前必须做（CLAUDE.md「进入待我验收的条件」第 3 条）。

读素材包里的 cascade.json（格子、帧数、帧号曲线、Size By Life、Color Over Life）+ 序列贴图（RGBA 接力）+ Ramp，
按 Cascade 的方式在几个时刻合成画面（多个素材包 / 一个包里多个发射器 = 组合各层，按各自的面片大小和 delay_s 叠加），并自动检查：
  - 引擎取帧：按 30 fps 逐 tick 播放（帧号 = floor(Dynamic Parameter 曲线)），显示到的帧占比、一次最多跳几帧、有没有回跳
  - 裁切：内容碰到格子内圈（先找出打包时清零的留边，再量留边以内 2 像素一圈的亮度占比；以前量的是被清零的最外圈，永远是 0）
  - 曝光：灰度到顶（≥ 250）的像素占比
  - 缩放抖动（4.2.3）：同一帧贴图停着的几个 tick 里 Size By Life 不许变（否则换帧时花缩回去、一胀一缩）
  - 画面占比（4.2.3，只记录）：每帧可见内容（≥ 3/255）包围盒占格子的比例 fill_med / fill_p10，全段并集 fill_union
  - 空帧（中间的空帧、末尾的空帧分开数）、中心抖动（只对 Zoom 取景判：固定取景面片不动，画面不可能整体抖；亮部中心偏离前后两帧按时间连线的距离，按 512 格换算；相邻帧中心移动另记 center_jump_*，只作参考——固定取景时花下垂，中心本来就会走）
及格线（LIMITS，照抄 协作/标准.md 2.3；--limits '{"jump_px512": 4}' 可以按效果放宽 / 收紧，放宽要在说明里写理由）
用法：
  python3 analysis/scripts/回放检查.py <输出图.jpg> <素材包目录1> [<素材包目录2> ...] [--delay 0,0.9] [--times 0.1,0.3,0.5,0.7,0.9] [--fps 30] [--limits JSON]
  python3 analysis/scripts/回放检查.py --pulse <cascade.json> ...    只查缩放抖动（不需要贴图）
输出：<输出图.jpg>（上面一行是组合，下面每层一行）+ 同名 .json（检查数值 + 每层 pass + 总 pass）；有不过的项时退出码 1
"""
import json, os, sys
import numpy as np

LIMITS = {                     # 数值照 协作/标准.md 第 2.3 节（标准由用户定；这里只照抄）
    'shown_frac': 0.90,        # 30 fps 下显示到的帧 ≥ 90%
    'back_jumps': 0,           # 帧号不许往回跳
    'edge_band': 2,            # 内圈宽度（留边以内 2 像素）
    'edge_frac': 0.005,        # 一帧里内圈亮度占全帧 ≥ 0.5% 算碰边
    'edge_frames': 0,          # 碰边的帧数上限
    'saturated': 0.02,         # 最亮一帧里灰度到顶的像素占比上限（2%）
    'empty_mid': 0,            # 中间空帧（有内容的帧之间夹着的全黑帧）
    'empty_tail': 0,           # 末尾全黑帧（应裁掉、缩短寿命）
    'jump_px512': 3.0,         # 中心抖动：亮部中心偏离「前后两帧按时间连成的直线」多少（格子像素，换算到 512 格）
    'zoom_pulse_pct': 0.2,     # 缩放抖动（4.2.3）：同一帧贴图停在屏幕上的几个 tick 里，面片大小最多变多少 %（标准 2.3「不抖」）
}
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


def zoom_pulse(e, fps=30):
    """缩放抖动（4.2.3，用户 2026-10-03 00:25「除了固定镜头，或多或少都会有点抖」）：
    引擎按 fps 逐 tick 播，帧号 = floor(Dynamic Parameter 曲线)；同一帧贴图停在屏幕上的那几个 tick 里，面片大小（Size By Life）不该变——
    贴图不动、面片在长，换下一帧时花又缩回去，就是一胀一缩。返回 (最大变化 %, [(帧号, %), …] 最差的 5 帧)。
    入点前放大（preRoll）是故意让第 0 帧从小放大，不算。没有 Size By Life（固定取景）= 0。"""
    mods = {m['m']: m for m in e['modules'] if not m.get('preRoll')}
    pre = any(m.get('preRoll') for m in e['modules'])
    sb, dp = mods.get('SizeByLife'), mods.get('DynamicParameter')
    if not sb or not dp: return 0.0, []
    life = float(curve(mods['Lifetime']['Lifetime'], 0)) if 'Lifetime' in mods else float(e['required']['duration_s'])
    n = max(1, int(np.floor(life * fps + 1e-6)))
    us = [min(1.0, (i + 0.5) / fps / life) for i in range(n)]
    fr = [int(np.floor(float(curve(dp['params']['frame'], u)))) for u in us]
    sz = [float(np.max(np.asarray(curve(sb['LifeMultiplier'], u), float)[:2])) for u in us]
    worst = []; i = 0
    while i < n:
        j = i
        while j + 1 < n and fr[j + 1] == fr[i]: j += 1
        if j > i and not (pre and fr[i] == 0):
            seg = sz[i:j + 1]; worst.append((fr[i], round((max(seg) / max(1e-9, min(seg)) - 1) * 100, 3)))
        i = j + 1
    worst.sort(key=lambda q: -q[1])
    return (worst[0][1] if worst else 0.0), worst[:5]


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

    def pad(self):
        """打包时清零的留边：所有帧都为 0 的最外圈数，最多 8（烘焙器「格子留边」上限）；再往里的空白是取景留的空，不算留边"""
        if hasattr(self, '_pad'): return self._pad
        acc = np.zeros((self.chh, self.cw), np.float32)
        for f in range(self.frames): acc = np.maximum(acc, self.cell(f))
        k = 0
        while k < 8 and acc[k].max() == 0 and acc[-1 - k].max() == 0 and acc[:, k].max() == 0 and acc[:, -1 - k].max() == 0: k += 1
        self._pad = k; return k

    def ticks(self, fps=30):
        """引擎按 fps 逐 tick 取帧：寿命内每个 tick 的帧号"""
        n = max(1, int(np.floor(self.life * fps + 1e-6)))
        return [self.frame_at(min(1.0, (i + 0.5) / fps / self.life)) for i in range(n)]

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


def check(packs, out, delays=None, times=(0.1, 0.3, 0.5, 0.7, 0.9), px=360, ref=None, times_s=None, fps=30, limits=None):
    lim = {**LIMITS, **(limits or {})}
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
        pad = p.pad(); band = int(lim['edge_band'])
        edge, sat, cm, jumps, last = [], [], [], [], None
        fills, ubox = [], None     # 画面占比（4.2.3，只记录不判）：每帧可见内容（≥ 3/255）包围盒占格子（扣留边）的比例，取横竖较大的那个
        jf, cens = [], []      # 诊断：跳变最大的几帧（帧号, 像素）；每帧亮部中心（512 格像素）
        for f in range(p.frames):
            c = p.cell(f); tot = c.sum() + 1e-9; cm.append(float(c.max()))
            inner = c[pad:c.shape[0] - pad, pad:c.shape[1] - pad]
            b = np.concatenate([inner[:band].ravel(), inner[-band:].ravel(), inner[band:-band, :band].ravel(), inner[band:-band, -band:].ravel()])
            edge.append(float(b.sum() / tot)); sat.append(float((c >= 250 / 255).mean()))
            vis = inner >= 3 / 255
            if vis.any():
                ys, xs = np.nonzero(vis); bx = [xs.min(), xs.max(), ys.min(), ys.max()]
                fills.append(max((bx[1] - bx[0] + 1) / inner.shape[1], (bx[3] - bx[2] + 1) / inner.shape[0]))
                ubox = bx if ubox is None else [min(ubox[0], bx[0]), max(ubox[1], bx[1]), min(ubox[2], bx[2]), max(ubox[3], bx[3])]
            m = c > 0.08
            if m.sum() < 400 * (p.cw * p.chh) / 256 ** 2: last = None; continue       # 亮部太少（开头 / 末尾零星几颗，中心是噪声）不算跳变；400 像素是按 256 格定的，按格子面积换算
            ys, xs = np.nonzero(m); cen = (xs.mean(), ys.mean()); cens.append([f, round(cen[0] * 512 / p.cw, 1), round(cen[1] * 512 / p.chh, 1), int(m.sum())])
            if last is not None: jumps.append(float(np.hypot(cen[0] - last[0], cen[1] - last[1])) * 512 / p.cw); jf.append(f)
            last = cen
        lit = [i for i, v in enumerate(cm) if v > 1.5 / 255]      # 和烘焙器裁帧同一口径：最亮像素 ≤ 1/255 才算空帧（引擎里自发光 ×4，2–3/255 的暗火星看得见）
        empty_tail = p.frames - 1 - lit[-1] if lit else p.frames
        mid_list = [i for i in range(lit[0], lit[-1]) if cm[i] <= 1.5 / 255] if lit else []
        empty_mid = len(mid_list)
        zoom = 'SizeByLife' in p.mods and not p.mods['SizeByLife'].get('preRoll')      # 入点前放大（preRoll）只在入点前停在第 0 帧放大，入点后仍是固定取景；固定取景：面片位置、大小都不变，画面不可能整体抖；中心移动全是内容自己在动（子花开、下垂），抖动项不适用
        tk = p.ticks(fps); steps = np.diff(tk) if len(tk) > 1 else np.array([0])
        # 中心抖动（标准 2.3「不抖」）：固定取景时花自己在长大、下垂，中心本来就会走；要抓的是走得不平滑的那一下。
        # 每帧在引擎里第一次出现的 tick 当作它的时刻；每帧中心和「前一帧、后一帧按时间连线」在这一帧时刻的位置比，差多少就是抖多少。
        first_tick = {}
        for i, fr in enumerate(tk): first_tick.setdefault(fr, i)
        cpos = {c[0]: (c[1], c[2]) for c in cens}     # 已经是 512 格像素
        jit, jitf = [], []
        for c0, c1, c2 in zip(cens, cens[1:], cens[2:]):
            a, b, d = c0[0], c1[0], c2[0]
            if not (b == a + 1 and d == b + 1) or a not in first_tick or b not in first_tick or d not in first_tick: continue
            n0, n1, n2 = c0[3], c1[3], c2[3]
            if max(n0, n1, n2) > 1.3 * min(n0, n1, n2): continue    # 亮部面积一下变了 30% 以上 = 内容本身在变（子花开、星熄灭），不算画面抖
            ta, tb, td = first_tick[a], first_tick[b], first_tick[d]
            u = (tb - ta) / max(1e-9, td - ta)
            qx = cpos[a][0] + (cpos[d][0] - cpos[a][0]) * u; qy = cpos[a][1] + (cpos[d][1] - cpos[a][1]) * u
            jit.append(float(np.hypot(cpos[b][0] - qx, cpos[b][1] - qy))); jitf.append(b)
        # 真循环（帧号锯齿曲线）：从最后几帧回到开头几帧是循环接缝，不算回跳（对话框11，2026-10-02：升空尾缀循环层）
        tka = np.asarray(tk); wrap = (steps < 0) & (tka[:-1] >= p.frames - 3) & (tka[1:] <= 2) if len(tk) > 1 else np.array([False])
        shown = len(set(tk)); back = int(((steps < 0) & ~wrap).sum()); loop_wraps = int(wrap.sum())
        L = dict(pack=p.label, frames=p.frames, grid=f'{p.cols}x{p.rows}x{p.ch}', cell_px=[p.cw, p.chh], life_s=round(p.life, 3), pad_px=pad,
                 ticks=len(tk), shown=shown, shown_frac=round(shown / p.frames, 3), max_skip=int(steps.max()) if len(steps) else 0, back_jumps=back, loop_wraps=loop_wraps,
                 edge_max=round(max(edge), 4), edge_frames=int(sum(e > lim['edge_frac'] for e in edge)), saturated_max=round(max(sat), 4),
                 empty_mid=empty_mid, empty_tail=empty_tail, center_jump_max_px512=round(max(jumps), 2) if jumps else 0,
                 centers=cens,
                 center_jump_top=[[jf[i], round(jumps[i], 2)] for i in np.argsort(jumps)[::-1][:5]] if jumps else [],
                 center_jitter_px512=round(max(jit), 2) if jit else 0, jitter_applies=zoom, empty_mid_frames=mid_list,
                 center_jitter_top=[[jitf[i], round(jit[i], 2)] for i in np.argsort(jit)[::-1][:5]] if jit else [],
                 fill_union=round(max((ubox[1] - ubox[0] + 1) / (p.cw - 2 * pad), (ubox[3] - ubox[2] + 1) / (p.chh - 2 * pad)), 3) if ubox else 0,
                 fill_med=round(float(np.median(fills)), 3) if fills else 0, fill_p10=round(float(np.percentile(fills, 10)), 3) if fills else 0,
                 fill_frames=[round(float(v), 2) for v in fills])
        fails = []
        if L['shown_frac'] < lim['shown_frac']: fails.append(f"{fps} fps 只显示 {shown}/{p.frames} 帧")
        if back > lim['back_jumps']: fails.append(f'帧号回跳 {back} 次')
        if L['edge_frames'] > lim['edge_frames']: fails.append(f"{L['edge_frames']} 帧碰到格子内圈")
        if L['saturated_max'] > lim['saturated']: fails.append(f"过曝像素 {L['saturated_max'] * 100:.1f}%")
        if empty_mid > lim['empty_mid']: fails.append(f'中间空帧 {empty_mid}')
        if empty_tail > lim['empty_tail']: fails.append(f'末尾空帧 {empty_tail}')
        if zoom and L['center_jitter_px512'] > lim['jump_px512']: fails.append(f"中心抖动 {L['center_jitter_px512']} px（512 格）")
        L['zoom_pulse_pct'], L['zoom_pulse_top'] = zoom_pulse(p.e, fps)
        if L['zoom_pulse_pct'] > lim['zoom_pulse_pct']: fails.append(f"缩放抖动 {L['zoom_pulse_pct']}%（同一帧停着时面片在变大小）")
        L['pass'] = not fails; L['fails'] = fails
        rep['layers'].append(L)
    rep['limits'] = lim; rep['fps'] = fps; rep['pass'] = all(L['pass'] for L in rep['layers'])
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
    if args and args[0] == '--pulse':      # 只查缩放抖动：python3 回放检查.py --pulse <cascade.json> ...（不用贴图）
        bad = 0
        for f in args[1:]:
            for e in json.load(open(f, encoding='utf-8'))['emitters']:
                mx, top = zoom_pulse(e); ok = mx <= LIMITS['zoom_pulse_pct']; bad += not ok
                print(f"{'✅' if ok else '❌'} {os.path.basename(f)} · {e['name']}：缩放抖动 {mx}%  最差 {top}")
        sys.exit(1 if bad else 0)
    if '--delay' in args: i = args.index('--delay'); delays = [float(x) for x in args[i + 1].split(',')]; del args[i:i + 2]
    if '--times' in args: i = args.index('--times'); times = tuple(float(x) for x in args[i + 1].split(',')); del args[i:i + 2]
    ref = None
    if '--ref' in args: i = args.index('--ref'); ref = json.loads(args[i + 1]); del args[i:i + 2]      # {"video":..., "t0":..., "cx":..., "cy":..., "half":...}
    fps = 30; limits = None
    if '--fps' in args: i = args.index('--fps'); fps = float(args[i + 1]); del args[i:i + 2]
    if '--limits' in args: i = args.index('--limits'); limits = json.loads(args[i + 1]); del args[i:i + 2]
    sep = '--separate' in args
    if sep: args.remove('--separate')
    out, dirs = args[0], args[1:]
    packs = []
    for d in dirs:
        n = len(json.load(open(os.path.join(d, 'cascade.json'), encoding='utf-8'))['emitters'])
        packs += [Pack(d, i) for i in range(n)]
    if sep:     # 各发射器各自的时间线（例：尾缀的上升循环、消散），不叠加
        base = os.path.splitext(out)[0]; r = []
        for i, p in enumerate(packs): r.append(check([p], f'{base}_{i + 1}.jpg', None, times, fps=fps, limits=limits))
        ok = all(x['pass'] for x in r)
    else: r = check(packs, out, delays, times, ref=ref, fps=fps, limits=limits); ok = r['pass']
    print(json.dumps(r, ensure_ascii=False, indent=1))
    sys.exit(0 if ok else 1)
