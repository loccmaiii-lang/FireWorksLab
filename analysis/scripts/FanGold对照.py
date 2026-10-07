"""金锦冠扇形 FanGold：和实拍按「出膛后同一秒」对照 + 每层自动曝光（对话框FanGold；用户 2026-10-07 17:02「云端实在太慢了，直接排任务到本机回传」）。

  python analysis/scripts/FanGold对照.py --entry FG1 --out 目录 [--variants '{"名字": {"参数": 值, "M.ramp1": "#..."}}'] [--times 0.3,0.9,1.6,2.2] [--px 360]
每个变体（"原样" = 条目原值）对组合的每一层改同样的参数，出：
  <目录>/<变体>.jpg  上排实拍（整张竖画面）、中排模拟（同比例：出膛点 (390,1080) px、30.5 px/m）、下排模拟全景（整面扇）
  <目录>/曝光.json   {变体: {层条目: autoExposure40}}（和烘焙器「自动曝光」同一算法）；对照图按这个曝光画
  <目录>/一览.jpg    所有变体的中排拼在一起
各层按组合里的延迟叠加（mtRenderLayers，和烘焙器多层预览同一条渲染路径）。
"""
import argparse, asyncio, base64, io, json, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'
VIDEO = ROOT / 'vidio' / 'FanGold.mp4'
S, VW, VH, BX, BY = 30.5, 720, 1280, 390, 1080     # 实拍 px/m、画面、出膛点

JS_LAYERS = r"""(id) => { const e = FW_REVIEW_LIST.find(x => x.id === id); if (!e || e.kind !== 'combo') return null;
  return { t0: (e.vmeta || {}).t0, layers: e.layerIds.map((lid, i) => ({ id: lid, delay: +(e.combo.layers[i] || {}).delay || 0, scale: +(e.combo.layers[i] || {}).scale || 1 })) }; }"""
JS_EXPO = r"""async (a) => { const { P } = replicaPM(a.id); Object.assign(P, a.mods); return (await autoExposure40(P)).value; }"""
JS_RENDER = r"""async (a) => { const layers = a.layers.map(L => { const { P, M } = replicaPM(L.id); Object.assign(P, a.mods, { exposure: a.expo[L.id] || P.exposure }); Object.assign(M, a.mmods);
  return { P, M, delay: L.delay, scale: L.scale, headInt: M.headInt != null ? +M.headInt : 1 }; });
  return (await mtRenderLayers(layers, { times: a.times, px: a.px, half: a.half, cy: a.cy })).map(x => ({ t: x.t, png: x.png })); }"""


def font(sz):
    from PIL import ImageFont
    for fp in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc'):
        if pathlib.Path(fp).exists(): return ImageFont.truetype(fp, sz)
    return ImageFont.load_default()


def ref_frames(t0, times, h):
    import cvcompat  # noqa: F401  Windows 中文路径
    import cv2
    from PIL import Image
    cap = cv2.VideoCapture(str(VIDEO)); fps = cap.get(cv2.CAP_PROP_FPS); out = []
    if not cap.isOpened(): raise IOError('打不开参考视频 ' + str(VIDEO))
    for t in times:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(round((t0 + t) * fps))); ok, f = cap.read()
        if not ok: raise IOError(f'参考视频读帧失败：出膛后 {t}')
        out.append(Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB)).resize((int(round(h * VW / VH)), h)))
    cap.release(); return out


async def run(a):
    from browser_runtime import launch_async, verify_renderer
    from playwright.async_api import async_playwright
    from PIL import Image, ImageDraw
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    times = [float(x) for x in a.times.split(',')]; px = a.px
    variants = {'原样': {}}; variants.update(json.loads(a.variants) if a.variants else {})
    png = lambda s: Image.open(io.BytesIO(base64.b64decode(s.split(',', 1)[1]))).convert('RGB')
    F, Fs = font(15), font(12)
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page(viewport={'width': 1000, 'height': 800})
        await pg.goto(HTML.resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof replicaPM === "function" && typeof mtRenderLayers === "function"', timeout=0)
        ren = verify_renderer(await pg.evaluate("(()=>{const g=document.createElement('canvas').getContext('webgl2');const x=g&&g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'?'})()"))
        print('渲染器', ren, flush=True)
        info = await pg.evaluate(JS_LAYERS, a.entry)
        if not info: raise RuntimeError('找不到组合条目 ' + a.entry)
        refs = ref_frames(info['t0'], times, px)
        cw = refs[0].width
        # 同比例视图：正方形 42 m（画面高），中心 x = 0；裁出实拍画面那一段（出膛点左 390 px、右 330 px）
        half_v = VH / 2 / S; cy_v = (BY - VH / 2) / S; x0 = int(round((half_v - BX / S) / (2 * half_v) * px))
        expo_all, rows_all = {}, []
        for name, mods in variants.items():
            pm = {k: v for k, v in mods.items() if not k.startswith('M.')}; mm = {k[2:]: v for k, v in mods.items() if k.startswith('M.')}
            expo = {}
            for L in info['layers']:
                expo[L['id']] = round(await pg.evaluate(JS_EXPO, {'id': L['id'], 'mods': pm}), 4)
            expo_all[name] = expo; print(name, '曝光', expo, flush=True)
            base = dict(layers=info['layers'], mods=pm, mmods=mm, expo=expo, times=times)
            vid = [png(r['png']) for r in await pg.evaluate(JS_RENDER, dict(base, px=px, half=half_v, cy=cy_v))]
            wide = [png(r['png']) for r in await pg.evaluate(JS_RENDER, dict(base, px=px, half=34, cy=17))]
            vid = [im.crop((x0, 0, x0 + cw, px)) for im in vid]
            W = 110 + max(cw, px) * len(times); colw = max(cw, px)
            sheet = Image.new('RGB', (W, 30 + px * 3), (14, 15, 20)); d = ImageDraw.Draw(sheet)
            d.text((6, 6), f'{a.entry} · {name}  {json.dumps(mods, ensure_ascii=False)[:150]}', fill=(233, 180, 95), font=Fs)
            for r, (lab, row) in enumerate([('实拍', refs), ('模拟 同比例', vid), ('模拟 全景', wide)]):
                d.text((6, 30 + r * px + px // 2), lab, fill=(220, 210, 180), font=F)
                for c, im in enumerate(row): sheet.paste(im, (110 + c * colw, 30 + r * px))
            for c, t in enumerate(times): d.text((110 + c * colw + 4, 30 + 4), f'出膛后 {t:.2f} s', fill=(255, 220, 150), font=Fs)
            sheet.save(out / f'{name}.jpg', quality=90); rows_all.append((name, vid))
        (out / '曝光.json').write_text(json.dumps(expo_all, ensure_ascii=False, indent=1), encoding='utf-8')
        await b.close()
    colw = rows_all[0][1][0].width
    sheet = Image.new('RGB', (110 + colw * len(times), 30 + px * (len(rows_all) + 1)), (14, 15, 20)); d = ImageDraw.Draw(sheet)
    for c, im in enumerate(refs): sheet.paste(im, (110 + c * colw, 30))
    d.text((6, 30 + px // 2), '实拍', fill=(220, 210, 180), font=F)
    for r, (name, row) in enumerate(rows_all):
        d.text((6, 30 + (r + 1) * px + px // 2), name, fill=(220, 210, 180), font=F)
        for c, im in enumerate(row): sheet.paste(im, (110 + c * colw, 30 + (r + 1) * px))
    for c, t in enumerate(times): d.text((110 + c * colw + 4, 8), f'出膛后 {t:.2f} s', fill=(255, 220, 150), font=Fs)
    sheet.save(out / '一览.jpg', quality=90)
    print('写好', out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--entry', default='FG1'); ap.add_argument('--out', required=True)
    ap.add_argument('--variants', default=''); ap.add_argument('--times', default='0.3,0.9,1.6,2.2,2.8'); ap.add_argument('--px', type=int, default=360)
    asyncio.run(run(ap.parse_args()))
