"""多层花型模板定帧回归（4.9.16，对话框新花型）：同一模板在新旧两个烘焙器里用 mtRenderStills 出同一秒的定帧，逐像素比。
4.9.16 把 mtRenderStills 拆成 mtRenderLayers（任意层），多层模板走同一段代码、缩放 / 倍率都是 1，应逐像素相同。

用法：python analysis/scripts/多层模板回归.py --old 旧版.html [--ids shinKiku,yaeBlueBotan] [--out 目录]
退出码 0 = 全部逐像素相同。输出 <out>/多层模板回归.json / .md + 每个模板一张「旧 | 新 | 差 ×8」。
"""
import argparse, asyncio, base64, io, json, pathlib, sys
import numpy as np
from PIL import Image
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
ROOT = HERE.parents[1]
JS = r"""async (a) => { if (typeof MULTI_BY_ID === 'undefined' || !MULTI_BY_ID[a.id]) return null;
  const r = await mtRenderStills(a.id, { times: a.times, px: a.px }); return { ver: VERSION, png: r.map(x => x.png), times: r.map(x => x.t) }; }"""


async def render(html, ids, times, px):
    from browser_runtime import launch_async
    from playwright.async_api import async_playwright
    out = {}
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page(viewport={'width': 1000, 'height': 800})
        await pg.goto(pathlib.Path(html).resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof MULTI_TYPES !== "undefined"', timeout=0)
        for i in ids: out[i] = await pg.evaluate(JS, {'id': i, 'times': times, 'px': px}); print(' ', pathlib.Path(html).name, i, flush=True)
        await b.close()
    return out


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--old', required=True); ap.add_argument('--new', default=str(ROOT / 'tool' / 'FireworkBaker.html'))
    ap.add_argument('--ids', default='shinKiku,yaeHenka,yaeBlueBotan,colorSenrin,mieKamuroSaki'); ap.add_argument('--times', default='0.4,1.3,2.6'); ap.add_argument('--px', type=int, default=256)
    ap.add_argument('--out', default=str(ROOT / 'analysis' / 'probe' / '多层模板' / '回归'))
    a = ap.parse_args(); out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    ids, times = a.ids.split(','), [float(x) for x in a.times.split(',')]
    old = asyncio.run(render(a.old, ids, times, a.px)); new = asyncio.run(render(a.new, ids, times, a.px))
    im = lambda u: np.asarray(Image.open(io.BytesIO(base64.b64decode(u.split(',', 1)[1]))).convert('RGB'), dtype=np.int16)
    rows, ok = [], True
    for i in ids:
        o, n = old.get(i), new.get(i)
        if not o or not n: rows.append({'id': i, 'missing': True}); continue
        ds, strip = [], []
        for t, uo, un in zip(n['times'], o['png'], n['png']):
            A, B = im(uo), im(un); d = np.abs(A - B); ds.append({'t': t, 'max': int(d.max()), 'frac': round(float((d.max(axis=2) > 0).mean()), 5)})
            strip.append(np.concatenate([A, B, np.clip(d * 8, 0, 255)], axis=1))
        Image.fromarray(np.concatenate(strip, axis=0).astype(np.uint8)).save(out / f'{i}.png')
        same = all(x['max'] == 0 for x in ds); ok &= same
        rows.append({'id': i, 'old': o['ver'], 'new': n['ver'], 'stills': ds, 'same': same}); print('✅' if same else '❌', i, json.dumps(ds), flush=True)
    (out / '多层模板回归.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
    L = ['# 多层模板定帧回归', '', '| 模板 | 旧 → 新 | 定帧（秒：最大差 / 不一样的像素比例） | 结论 |', '| --- | --- | --- | --- |']
    for r in rows:
        if r.get('missing'): L.append(f"| {r['id']} | — | 旧版或新版没有 | — |"); continue
        L.append(f"| {r['id']} | {r['old']} → {r['new']} | " + '；'.join(f"{x['t']} s：{x['max']} / {x['frac']}" for x in r['stills']) + f" | {'逐像素相同' if r['same'] else '**有变化**'} |")
    (out / '多层模板回归.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
    sys.exit(0 if ok else 1)


main()
