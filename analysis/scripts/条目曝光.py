"""条目各层的自动曝光（和右栏「建议曝光（按最亮时刻）」同一个算法 autoExposure40）（对话框新花型，2026-10-07）。
  python3 analysis/scripts/条目曝光.py <输出.json> <层条目号> [<层条目号> ...]
输出 {条目号: 曝光}，另附 _cur（条目里现在写的）、_renderer。云端软件渲染很慢，放本机显卡跑。出错退出码 2。
"""
import asyncio, json, pathlib, sys
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
HTML = HERE.parents[1] / 'tool' / 'FireworkBaker.html'


async def run(out, ids):
    from browser_runtime import launch_async, verify_renderer
    from playwright.async_api import async_playwright
    res, cur = {}, {}
    async with async_playwright() as p:
        b = await launch_async(p); pg = await b.new_page(viewport={'width': 1000, 'height': 800})
        await pg.goto(HTML.resolve().as_uri() + '?fast&autobake=0', wait_until='domcontentloaded', timeout=0)
        await pg.wait_for_function('window.__fw && typeof autoExposure40 === "function" && typeof replicaPM === "function"', timeout=0)
        ren = verify_renderer(await pg.evaluate("(()=>{const g=document.createElement('canvas').getContext('webgl2');const x=g&&g.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'?'})()"))
        await pg.evaluate('state.stillBusy = true')
        for i in ids:
            r = await pg.evaluate("async (id) => { const { P } = replicaPM(id); const r = await autoExposure40(P); return { v: r.value, cur: +P.exposure }; }", i)
            res[i] = round(r['v'], 4) if r['v'] else None; cur[i] = r['cur']; print(i, r, flush=True)
        await b.close()
    pathlib.Path(out).write_text(json.dumps({**res, '_cur': cur, '_renderer': ren}, ensure_ascii=False, indent=1), encoding='utf-8')
    return 0


if __name__ == '__main__':
    try: code = asyncio.run(run(sys.argv[1], sys.argv[2:]))
    except Exception:
        import traceback; traceback.print_exc(); code = 2
    raise SystemExit(code)
