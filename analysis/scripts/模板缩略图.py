"""花型库模板在 4.0 渲染下的定帧对照 + 缩略图（4.0-f）

用法：python3 analysis/scripts/模板缩略图.py [kiku botan ...] [--out 目录] [--thumbs]
  默认：所有空中模板（按当前默认版本 = 新建模板时用户看到的样子，含 EXPOSURE40 曝光），每个 4 个时刻，拼成一张总表 <out>/模板总表.jpg
  --thumbs：同时把第 2 个时刻（开花后约 35%）缩成 160×160，写进 tool/src/js/16_thumbs.js（只替换这些花型，尾缀 / 地面的不动）
"""
import argparse, asyncio, base64, io, json, pathlib, re, sys, time
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from browser_runtime import chromium_options, verify_renderer
from PIL import Image, ImageDraw, ImageFont
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'
FRACS = [0.15, 0.35, 0.6, 0.85]

JS = r"""
async (a) => { const d = defaultsFor(a.type); const P = { ...d.P };
  if (familyOf(P.type) !== 'aerial') return { skip: true };
  const r = await renderStills(P, d.M, { times: a.fracs.map(f => f * P.duration), px: a.px });
  return { renderVer: renderVersion(P), exposure: P.exposure, duration: P.duration, pngs: r.map(x => x.png) }; }
"""


def font(sz):
    for fp in ('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'C:/Windows/Fonts/msyh.ttc'):
        if pathlib.Path(fp).exists(): return ImageFont.truetype(fp, sz)
    return ImageFont.load_default()


async def main(types, out, px, thumbs):
    from playwright.async_api import async_playwright
    out.mkdir(parents=True, exist_ok=True); res = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(**chromium_options())
        pg = await b.new_page(viewport={'width': 1200, 'height': 900})
        await pg.goto(HTML.resolve().as_uri() + '?fast', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof TYPES !== "undefined"', timeout=0)
        verify_renderer(await pg.evaluate("(()=>{const g=document.createElement('canvas').getContext('webgl2');const x=g&&g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'?'})()"))
        names = await pg.evaluate('TYPE_NAMES')
        if not types: types = await pg.evaluate("Object.keys(TYPES).filter(t => familyOf(t) === 'aerial')")
        for t in types:
            t0 = time.time(); r = await pg.evaluate(JS, {'type': t, 'fracs': FRACS, 'px': px})
            if r.get('skip'): continue
            ims = [Image.open(io.BytesIO(base64.b64decode(s.split(',')[1]))).convert('RGB') for s in r['pngs']]
            for i, im in enumerate(ims): im.save(out / f'{t}_{i}.png')
            res[t] = dict(name=names.get(t, t), renderVer=r['renderVer'], exposure=r['exposure'], duration=r['duration'], ims=ims)
            print(t, r['renderVer'], r['exposure'], f'{time.time() - t0:.0f}s', flush=True)
        await b.close()
    f = font(18); W = 150 + px * len(FRACS); sheet = Image.new('RGB', (W, 28 + px * len(res)), (10, 11, 15)); g = ImageDraw.Draw(sheet)
    for i, fr in enumerate(FRACS): g.text((150 + i * px + 6, 4), f'{fr:.0%} 时长', fill=(233, 180, 95), font=f)
    for r_, (t, v) in enumerate(res.items()):
        g.text((6, 28 + r_ * px + px // 2 - 20), f"{v['name']}\n{t} · {v['renderVer']}\n曝光 ×{v['exposure']}", fill=(220, 210, 180), font=f)
        for i, im in enumerate(v['ims']): sheet.paste(im, (150 + i * px, 28 + r_ * px))
    sheet.save(out / '模板总表.jpg', quality=88); print('→', out / '模板总表.jpg')
    if thumbs:
        P = ROOT / 'tool' / 'src' / 'js' / '16_thumbs.js'; s = P.read_text(encoding='utf-8')
        for t, v in res.items():
            buf = io.BytesIO(); v['ims'][1].resize((160, 160), Image.LANCZOS).save(buf, 'JPEG', quality=82)
            url = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()
            s2, n = re.subn(rf'"{t}": "data:image/[^"]*"', f'"{t}": "{url}"', s)
            s = s2 if n else s.replace('const THUMBS = {', f'const THUMBS = {{"{t}": "{url}", ', 1)
        P.write_text(s, encoding='utf-8'); print('缩略图已写入', P)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('types', nargs='*'); ap.add_argument('--out', default=str(ROOT / 'analysis' / 'probe' / '4.0-f_模板'))
    ap.add_argument('--px', type=int, default=320); ap.add_argument('--thumbs', action='store_true')
    a = ap.parse_args(); asyncio.run(main(a.types, pathlib.Path(a.out), a.px, a.thumbs))
