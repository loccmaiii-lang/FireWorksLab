"""候选对比：几个候选配方（多层模板 + 每层改动）整朵花渲染出来，用打点（同一把尺子）和实拍逐项比，出差距表 + 放大对照图
（对话框新花型，用户 2026-10-08 08:58 方法的第 6–7 步：合层、调整体质感、比对）。

  python3 analysis/scripts/候选对比.py --mt kinzuiLime --ref <实拍 打点.json> \
      --variant "现在:" --variant "甲:L1.sparkRate=1800;L2.headSize=1.5;L2.M.headInt=1.2" ... \
      [--times 0.33,0.47,0.6,0.8,1.2,1.5,1.8,2.0,2.3,3.0,3.8] [--px 1100] --out <目录>

- 改动写法：L<层号>.<参数>=<值>，颜色那边写 L2.M.ramp2=#aabbcc、L2.M.headInt=1.2；stages 写 L2.M.stages=0:#ffc070|0.45:#fff2b0|0.78:#eaff7a。
- 渲染：烘焙器 mtRenderLayers（所有层叠在一起，和实时模拟同一套渲染 + 色调映射），按实拍同一时刻外层半径缩放到同一像素尺度，再按实拍的口径量（点 / 线纹理 / 跟踪以外的全部）。
- 出：<目录>/候选.json、差距.md（每项：实拍 / 每个候选；最后一行总差距）、对照_<t>.jpg（实拍和每个候选同一秒、整朵 + 放大局部）。本机显卡跑。
"""
import argparse, asyncio, base64, json, math, os, sys
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import importlib
D = importlib.import_module('打点')
HTML = os.path.join(ROOT, 'tool', 'FireworkBaker.html')


def parse_variant(s):
    name, _, body = s.partition(':'); mods = {}
    for kv in [x for x in body.split(';') if x.strip()]:
        k, v = kv.split('=', 1); k = k.strip(); v = v.strip()
        if k.endswith('M.stages'): v = [[float(a), b] for a, b in (x.split(':', 1) for x in v.split('|'))]
        else:
            try: v = float(v)
            except ValueError: pass
        mods[k] = v
    return name.strip(), mods


JS = r"""async (o) => {
  const L = mtLayers(o.id).map(x => ({ P: { ...x.P }, M: { ...x.M }, delay: x.delay || 0, headInt: x.headInt }));
  for (const [k, v] of Object.entries(o.mods || {})) {
    const m = /^L(\d+)\.(M\.)?(.+)$/.exec(k); if (!m) continue; const l = L[+m[1] - 1]; if (!l) continue;
    if (m[2]) { if (m[3] === 'headInt') l.headInt = v; else l.M[m[3]] = v; } else l.P[m[3]] = v;
  }
  for (const l of L) { l.P = derive(l.P); l.M = normalizeM(l.M, l.P.type); }
  const P0 = L[1] ? L[1].P : L[0].P, R0 = reachOf(P0.v0, P0.vt, P0.burn);
  const out = await mtRenderLayers(L, { times: o.times, px: o.px, half: R0 * 1.35, cy: -R0 * 0.05 });
  return out.map(s => ({ t: s.t, png: s.png }));
}"""


async def render(a, variants):
    from playwright.async_api import async_playwright
    from browser_runtime import launch_async
    res = {}
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page(viewport={'width': 1200, 'height': 900})
        await pg.goto('file://' + os.path.abspath(HTML).replace('\\', '/') + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof mtLayers === "function" && typeof mtRenderLayers === "function"', timeout=0)
        res['_renderer'] = await pg.evaluate("(()=>{const g=document.createElement('canvas').getContext('webgl2');const x=g&&g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'?'})()")
        for name, mods in variants:
            res[name] = await pg.evaluate(JS, dict(id=a.mt, mods=mods, times=a.times, px=a.px)); print(name, '→', len(res[name]), '张', flush=True)
        await b.close()
    return res


def center_of(v):
    ys, xs = np.nonzero(v > 30)
    if len(xs) < 30: return v.shape[1] / 2, v.shape[0] / 2
    return (np.percentile(xs, 2) + np.percentile(xs, 98)) / 2, (np.percentile(ys, 2) + np.percentile(ys, 98)) / 2


def measure_render(png, Rref):
    img = cv2.imdecode(np.frombuffer(base64.b64decode(png.split(',')[1]), np.uint8), cv2.IMREAD_COLOR)
    v = img.max(2).astype(np.float32); cx, cy = center_of(v); Rr = D.radius_of(v, cx, cy, 20)
    if not Rr: return None, img, (cx, cy, 0)
    k = Rref / Rr
    if abs(k - 1) > 0.02:
        img = cv2.resize(img, (int(round(img.shape[1] * k)), int(round(img.shape[0] * k))), interpolation=cv2.INTER_AREA if k < 1 else cv2.INTER_LINEAR)
        cx, cy = cx * k, cy * k
    sig = img.astype(np.float32); lin = D.to_lin(img)
    pts, lines, prof, tex = D.measure(img, sig, cx, cy, Rref, noise=1.0, lin=lin)
    sp = D.auto_split([p['r'] for p in pts if not p['glare'] and not p.get('on_line')])
    rep = D.summarize(pts, lines, prof, Rref, sp, tex); rep['scale'] = round(k, 3)
    return rep, img, (cx, cy, Rref)


# ---- 比哪些（层、时刻、量）----
def P_(f, reg):
    P = f['points']; return P.get(reg) or P.get('全部') or {}
def T_(f, ch): return (f.get('texture') or {}).get(ch) or {}
def mid(x): return x[1] if isinstance(x, list) and len(x) > 1 else x
def hue_of(rgb):
    if not rgb: return None
    return D.hue_class(rgb)[1]
CHECKS = [
    ('橙引尾', '线带里端 r/R', [0.47, 0.6, 0.8], lambda f: T_(f, '橙线').get('r_in'), 'r'),
    ('橙引尾', '线带外端 r/R', [0.47, 0.6, 0.8], lambda f: T_(f, '橙线').get('r_out'), 'r'),
    ('橙引尾', '线宽 px', [0.33, 0.47, 0.6], lambda f: T_(f, '橙线').get('width_px'), 'r'),
    ('橙引尾', '成串（沿线起伏）', [0.33, 0.47, 0.6, 0.8], lambda f: T_(f, '橙线').get('bead'), 'r'),
    ('橙引尾', '外段 / 内段亮度', [0.33, 0.47, 0.6, 0.8], lambda f: T_(f, '橙线').get('grad'), 'r'),
    ('橙引尾', '对比度（线和线之间分得多开）', [0.33, 0.47, 0.6, 0.8], lambda f: T_(f, '橙线').get('contrast'), 'r'),
    ('橙引尾', '里段色相°', [0.33, 0.6], lambda f: (T_(f, '橙线').get('c_in') or [None, None])[1], 'h'),
    ('橙引尾', '外段色相°', [0.33, 0.6], lambda f: (T_(f, '橙线').get('c_out') or [None, None])[1], 'h'),
    ('柠点星', '星头个数', [1.2, 2.0, 3.0, 3.8], lambda f: P_(f, '外（亲星）').get('n'), 'r'),
    ('柠点星', '星与星亮度差 p90/p10', [1.2, 2.0, 3.0], lambda f: P_(f, '外（亲星）').get('flux_spread'), 'r'),
    ('柠点星', '大小 FWHM px', [1.2, 2.0, 3.0, 3.8], lambda f: mid(P_(f, '外（亲星）').get('fwhm')), 'r'),
    ('柠点星', '光晕能量占比', [1.2, 2.0, 3.0], lambda f: mid(P_(f, '外（亲星）').get('halo_ratio')), 'r'),
    ('柠点星', '拉长比', [1.2, 2.0, 3.0], lambda f: mid(P_(f, '外（亲星）').get('elong')), 'r'),
    ('柠点星', '核心饱和度', [1.2, 2.0, 3.0], lambda f: P_(f, '外（亲星）').get('core_sat'), 'r'),
    ('柠点星', '光晕饱和度', [1.2, 2.0, 3.0], lambda f: P_(f, '外（亲星）').get('halo_sat'), 'r'),
    ('柠点星', '光晕色相°', [1.2, 2.0, 3.0], lambda f: hue_of(P_(f, '外（亲星）').get('halo_rgb')), 'h'),
    ('青绿细线', '线带亮度', [1.5, 2.0, 2.3], lambda f: T_(f, '绿线').get('level'), 'r'),
    ('金菊蕊', '线带外端 r/R', [1.2, 1.8, 2.3], lambda f: T_(f, '暖色线').get('r_out'), 'r'),
    ('金菊蕊', '成串（沿线起伏）', [1.2, 1.8, 2.3], lambda f: T_(f, '暖色线').get('bead'), 'r'),
    ('金菊蕊', '对比度', [1.2, 1.8, 2.3], lambda f: T_(f, '暖色线').get('contrast'), 'r'),
    ('金菊蕊', '里段色相°', [1.2, 1.8, 2.3], lambda f: (T_(f, '暖色线').get('c_in') or [None, None])[1], 'h'),
    ('红点蕊', '大小 FWHM px', [1.5, 2.0], lambda f: mid(P_(f, '里（芯）').get('fwhm')), 'r'),
    ('红点蕊', '光晕能量占比', [1.5, 2.0], lambda f: mid(P_(f, '里（芯）').get('halo_ratio')), 'r'),
]


def gap(ref, val, kind):
    if ref is None or val is None: return None
    if kind == 'h': d = abs((val - ref + 180) % 360 - 180); return d / 30.0
    if ref <= 0 or val <= 0: return None
    return abs(math.log(val / ref))


def ref_crop(meta, t, Rref, size):
    """实拍同一时刻：和渲染一样按外层半径取 1.35 R 的方块"""
    path = os.path.join(ROOT, meta['video']); cap = cv2.VideoCapture(path); fps = cap.get(cv2.CAP_PROP_FPS) or 30
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(round((meta['t0'] + t) * fps))); ok, f = cap.read(); cap.release()
    if not ok: return np.zeros((size, size, 3), np.uint8)
    H, W = f.shape[:2]; X, Y = meta['cx'] * W, meta['cy'] * H; h = 1.35 * Rref
    c = f[int(max(0, Y - h)):int(min(H, Y + h)), int(max(0, X - h)):int(min(W, X + h))]
    return cv2.resize(c, (size, size), interpolation=cv2.INTER_AREA)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--mt', required=True); ap.add_argument('--ref', required=True); ap.add_argument('--variant', action='append', required=True)
    ap.add_argument('--times', default='0.33,0.47,0.6,0.8,1.2,1.5,1.8,2.0,2.3,3.0,3.8'); ap.add_argument('--px', type=int, default=1100); ap.add_argument('--out', required=True)
    a = ap.parse_args(); a.times = [float(x) for x in a.times.split(',')]; os.makedirs(a.out, exist_ok=True)
    ref = json.load(open(a.ref if os.path.isabs(a.ref) else os.path.join(ROOT, a.ref), encoding='utf-8'))
    rf = lambda t: min(ref['frames'], key=lambda f: abs(f['t'] - t))
    variants = [parse_variant(v) for v in a.variant]
    shots = asyncio.run(render(a, variants)); ren = shots.pop('_renderer', '?')
    res = dict(mt=a.mt, ref=a.ref, renderer=ren, variants={n: dict(mods=m, frames=[]) for n, m in variants})
    crops = {}
    for name, _ in variants:
        for s in shots[name]:
            R = rf(s['t'])['R_px']; rep, img, (cx, cy, _) = measure_render(s['png'], R)
            if rep: rep['t'] = s['t']; res['variants'][name]['frames'].append(rep)
            h = int(1.35 * R); x0, y0 = int(cx - h), int(cy - h)
            pad = cv2.copyMakeBorder(img, h, h, h, h, cv2.BORDER_CONSTANT, value=(0, 0, 0)); c = pad[y0 + h:y0 + 3 * h, x0 + h:x0 + 3 * h]
            crops.setdefault(s['t'], {})[name] = cv2.resize(c, (480, 480), interpolation=cv2.INTER_AREA)
    # 差距表
    names = [n for n, _ in variants]
    md = [f'# 候选对比：mt:{a.mt}（实拍 = {os.path.basename(os.path.dirname(a.ref))}；渲染器 {ren[:40]}）', '',
          '每格：实拍 → 候选的值；差距按 |ln(候选 / 实拍)|（色相按 30° 记 1）；总差距 = 各项平均，越小越像。亮度类（线带亮度）两边曝光口径不同，只看随时间的走势。', '',
          '| 层 | 量 | 时刻 | 实拍 | ' + ' | '.join(names) + ' |', '| --- | --- | --- | --- |' + ' --- |' * len(names)]
    tot = {n: [] for n in names}; per_layer = {}
    for layer, label, ts, fn, kind in CHECKS:
        for t in ts:
            rv = fn(rf(t)) if abs(rf(t)['t'] - t) < 0.05 else None
            row = [layer, label, f'+{t:.2f}', 'None' if rv is None else f'{rv:.3g}']
            for n in names:
                fr = [f for f in res['variants'][n]['frames'] if abs(f['t'] - t) < 0.02]
                vv = fn(fr[0]) if fr else None; g = gap(rv, vv, kind)
                if g is not None and label != '线带亮度': tot[n].append(g); per_layer.setdefault((n, layer), []).append(g)
                row.append('—' if vv is None else f"{vv:.3g}" + (f'（{g:.2f}）' if g is not None else ''))
            md.append('| ' + ' | '.join(row) + ' |')
    md += ['', '| 总差距 | ' + ' | '.join(f'{n}: {np.mean(tot[n]):.3f}' for n in names if tot[n]) + ' |', '']
    layers = sorted(set(l for (_, l) in per_layer), key=lambda l: [c[0] for c in CHECKS].index(l))
    md += ['| 层 | ' + ' | '.join(names) + ' |', '| --- |' + ' --- |' * len(names)]
    for l in layers: md.append(f'| {l} | ' + ' | '.join(f"{np.mean(per_layer[(n, l)]):.3f}" if (n, l) in per_layer else '—' for n in names) + ' |')
    open(os.path.join(a.out, '差距.md'), 'w', encoding='utf-8').write('\n'.join(md) + '\n')
    json.dump(res, open(os.path.join(a.out, '候选.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    # 对照图：每个时刻一张，上排整朵（实拍 + 各候选），下排放大右上四分之一
    from PIL import Image, ImageDraw, ImageFont
    font = None
    for fp in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc'):
        if os.path.exists(fp): font = ImageFont.truetype(fp, 18); break
    for t, row in sorted(crops.items()):
        R = rf(t)['R_px']; cols = [('实拍', ref_crop(ref['meta'], rf(t)['t'], R, 480))] + [(n, row[n]) for n in names if n in row]
        sheet = Image.new('RGB', (480 * len(cols), 960 + 26), (14, 16, 22)); dr = ImageDraw.Draw(sheet)
        for i, (n, im) in enumerate(cols):
            rgb = Image.fromarray(cv2.cvtColor(im, cv2.COLOR_BGR2RGB)); sheet.paste(rgb, (480 * i, 26))
            z = rgb.crop((240, 60, 420, 240)).resize((480, 480), Image.LANCZOS); sheet.paste(z, (480 * i, 26 + 480))
            dr.text((480 * i + 6, 3), f'{n}  +{t:.2f}s', fill=(255, 220, 120), font=font)
        sheet.save(os.path.join(a.out, f'对照_{t:.2f}.jpg'), quality=86)
    print('→', os.path.join(a.out, '差距.md'))


if __name__ == '__main__':
    main()
