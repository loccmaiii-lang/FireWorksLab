"""4.0 花型库模板的推荐固定曝光

用法：python3 analysis/scripts/模板曝光.py [kiku botan ...]
调用烘焙器的 autoExposure40（燃烧段 5 个时刻，取最亮的一刻，99.8% 分位 → 0.96），和「建议曝光」按钮完全一致。
结果打印成 JS 表，抄进 tool/src/js/10_types.js 的 EXPOSURE40（模板默认值；用户调过的曝光不受影响）。
"""
import argparse, asyncio, json, math, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from browser_runtime import chromium_options, verify_renderer
ROOT = HERE.parents[1]
HTML = ROOT / 'tool' / 'FireworkBaker.html'

JS = r"""
async (t) => { const d = defaultsFor(t, 40); if (familyOf(t) !== 'aerial') return { skip: familyOf(t) };
  const r = await autoExposure40(d.P); return { cell: displayPlan40(derive({ ...d.P })).L.cellW, value: r.value, per: r.per }; }
"""

async def main(types, times):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await p.chromium.launch(**chromium_options())
        pg = await b.new_page(viewport={'width': 1200, 'height': 800})
        await pg.goto(HTML.resolve().as_uri() + '?fast', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof TYPES !== "undefined"', timeout=0)
        verify_renderer(await pg.evaluate("(()=>{const g=document.createElement('canvas').getContext('webgl2');const x=g&&g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'?'})()"))
        if not types: types = await pg.evaluate("Object.keys(TYPES).filter(t => familyOf(t) === 'aerial')")
        res = {}
        for t in types:
            r = await pg.evaluate(JS, t)
            if r.get('skip') or not r.get('value'): continue
            g = r['value']; res[t] = round(g, 2 if g < 1 else 1)
            print(t, r['cell'], [round(x, 2) if x else None for x in r['per']], '→', res[t], flush=True)
        await b.close()
    print('const EXPOSURE40 = ' + json.dumps(res) + ';')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('types', nargs='*')
    a = ap.parse_args(); asyncio.run(main(a.types, None))
