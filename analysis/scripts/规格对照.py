"""一个效果的几档规格（号数）放在一起：每档自动曝光 + 定帧对照（对话框新花型，2026-10-07，金芒菊规格）。

  python analysis/scripts/规格对照.py --ids JMG03,JMG05,JMG10,JMG20,JMG30,JMG40 --ref JM4-40 --out 目录
曝光：每档 autoExposure40（和「自动曝光」同一算法）× 参照条目的「手调 / 自动」比（JM4-40 用的 0.2 是在自动值上压过的，各档保持同样的压法）。
出：曝光.json（{条目: 曝光}，另附自动值）、规格对照_各自取景.jpg（每档 4 个时刻，各自固定取景）、规格对照_同一比例.jpg（同一米数比例、整段 45% 处，看大小差多少）。
"""
import argparse, asyncio, base64, io, json, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'
FR = [0.12, 0.3, 0.5, 0.75]

JS_EXPO = r"""async (id) => { const { P } = replicaPM(id); const r = await autoExposure40(P); return { auto: r.value, cur: +P.exposure || null, dur: +P.duration,
  R: (+P.burstR0 || 0) + reachOf(P.v0, P.vt, P.burn), name: REPLICA_BY_ID[id].name || id }; }"""
JS_STILLS = r"""async (a) => { const { P, M } = replicaPM(a.id); if (a.expo) P.exposure = a.expo;
  const times = a.fr.map(f => +(f * P.duration).toFixed(3));
  const r = a.half ? await renderStills40(P, M, { times: [a.at * P.duration], px: a.px, half: a.half, cx: 0, cy: -a.half * 0.12 }) : await renderStills40(P, M, { times, px: a.px });
  return r.map(x => ({ t: x.t, png: x.png })); }"""


def font(sz):
    from PIL import ImageFont
    for fp in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc'):
        if pathlib.Path(fp).exists(): return ImageFont.truetype(fp, sz)
    return ImageFont.load_default()


async def run(a):
    from browser_runtime import launch_async, verify_renderer
    from playwright.async_api import async_playwright
    from PIL import Image, ImageDraw
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    png = lambda s: Image.open(io.BytesIO(base64.b64decode(s.split(',', 1)[1]))).convert('RGB')
    ids = [x for x in a.ids.split(',') if x]
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page(viewport={'width': 1000, 'height': 800})
        await pg.goto(HTML.resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof replicaPM === "function"', timeout=0)
        ren = verify_renderer(await pg.evaluate("(()=>{const g=document.createElement('canvas').getContext('webgl2');const x=g&&g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'?'})()"))
        await pg.evaluate('state.stillBusy = true')
        info = {i: await pg.evaluate(JS_EXPO, i) for i in [a.ref] + ids if i}
        k = (info[a.ref]['cur'] / info[a.ref]['auto']) if a.ref and info[a.ref]['cur'] and info[a.ref]['auto'] else 1
        ex = {i: round(info[i]['auto'] * k, 4) for i in ids}
        for i in [a.ref] + ids: print(i, info[i], '→', ex.get(i), flush=True)
        (out / '曝光.json').write_text(json.dumps({**ex, '_auto': {i: info[i]['auto'] for i in info}, '_k': k, '_renderer': ren}, ensure_ascii=False, indent=1), encoding='utf-8')
        own = {i: await pg.evaluate(JS_STILLS, {'id': i, 'fr': FR, 'px': a.px, 'expo': ex.get(i)}) for i in ([a.ref] if a.ref else []) + ids}
        half = max(info[i]['R'] for i in ids) * 1.25
        same = {i: (await pg.evaluate(JS_STILLS, {'id': i, 'fr': FR, 'px': a.px, 'expo': ex.get(i), 'half': half, 'at': 0.45}))[0] for i in ids}
        await b.close()
    ft = font(15); px = a.px
    rows = list(own.items()); sh = Image.new('RGB', (190 + px * len(FR), 30 + px * len(rows)), (10, 11, 15)); g = ImageDraw.Draw(sh)
    for j, f in enumerate(FR): g.text((190 + j * px + 6, 6), f'整段 {f:.0%}', fill=(233, 180, 95), font=ft)
    for r_, (i, fr) in enumerate(rows):
        g.text((6, 30 + r_ * px + px // 2 - 30), f"{info[i]['name'][:14]}\n{i} · 直径 {2 * info[i]['R']:.0f} m\n整段 {info[i]['dur']:.1f} s", fill=(220, 210, 180), font=ft)
        for j, x in enumerate(fr): sh.paste(png(x['png']), (190 + j * px, 30 + r_ * px))
    sh.save(out / '规格对照_各自取景.jpg', quality=86)
    W = px * len(ids); sh2 = Image.new('RGB', (W, px + 50), (10, 11, 15)); g2 = ImageDraw.Draw(sh2)
    for j, i in enumerate(ids):
        sh2.paste(png(same[i]['png']), (j * px, 0)); g2.text((j * px + 6, px + 6), f"{info[i]['name'][4:16]} · {2 * info[i]['R']:.0f} m", fill=(220, 210, 180), font=ft)
    g2.text((6, px + 28), f'同一比例：画面半宽 {half:.0f} m、各自整段 45% 处', fill=(150, 150, 150), font=ft)
    sh2.save(out / '规格对照_同一比例.jpg', quality=86)
    print('→', out)
    return 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--ids', required=True); ap.add_argument('--ref', default=''); ap.add_argument('--out', required=True); ap.add_argument('--px', type=int, default=300)
    raise SystemExit(asyncio.run(run(ap.parse_args())))
