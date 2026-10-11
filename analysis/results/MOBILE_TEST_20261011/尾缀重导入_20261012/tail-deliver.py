# 用烘焙器（8034/baker，和用户同一条路）把重导的尾缀交付到「指定目录 · 自动检查」。
# --dry：只打开条目、设英文名和尺寸档，打印将要导出的名字 / 倍数，不导出。
import asyncio, json, sys
sys.path.insert(0, 'F:/FireWorksLab/analysis/scripts')
from playwright.async_api import async_playwright
from browser_runtime import launch_async
PLAN = [('RT6S', 'RiseTrail', 'cls:h:dam:150'), ('RT6M', 'RiseTrail', 'cls:h:dam:210'), ('RT6L', 'RiseTrail', 'cls:h:dam:330'), ('RT6L', 'RiseTrail_Hero', 'cls:h:dam:400')]
DRY = '--dry' in sys.argv
ONLY = [a for a in sys.argv[1:] if not a.startswith('--')]
async def setup(pg, entry, en, size):
    await pg.evaluate("id => openReview(FW_REVIEW_LIST.find(e => e.id === id))", entry)
    await pg.wait_for_function("window.__fw && window.__fw.idle() && !state.baking", timeout=0)
    await pg.wait_for_timeout(1500)
    return await pg.evaluate("""([en, size]) => { setPackNames(wbKey(), en, []);
        const o = sizeSpecKeyNow(), k = sizePickKey(o); store.set('sizeSpecPick', { [k]: size });
        const sp = exportScalePlan(state.P);
        return { wbKey: wbKey(), effect: lib.effect && lib.effect.key, review: lib.review && lib.review.id, type: state.P.type, safeName: safeName(),
                 base: packNamesFor(wbKey(), lib.effect, 1, safeName(), state.P.type).base, k: sp.k, spec: sp.spec && sp.spec.name, line: sizeSpecLine(false),
                 dest: [...document.getElementById('deliveryDestination').options].map(o => o.value + ':' + o.text), destNow: document.getElementById('deliveryDestination').value }; }""", [en, size])
async def main():
    async with async_playwright() as p:
        b = await launch_async(p); ctx = await b.new_context(viewport={'width': 1920, 'height': 1200}); pg = await ctx.new_page()
        pg.on('pageerror', lambda e: print('pageerror', str(e)[:300]))
        await pg.goto('http://127.0.0.1:8034/baker'); await pg.wait_for_timeout(8000)
        out = []
        for entry, en, size in PLAN:
            key = entry + ':' + en
            if ONLY and key not in ONLY and entry not in ONLY: continue
            info = await setup(pg, entry, en, size); print(json.dumps(info, ensure_ascii=False))
            if DRY: continue
            await pg.evaluate("document.getElementById('deliveryDestination').value = 'directory'")
            before = await pg.evaluate("fetch('/api/resources').then(r => r.json()).then(j => (j.resources || []).map(r => r.deliveryId))")
            await pg.evaluate("exportMaster()")
            await pg.wait_for_timeout(3000)
            await pg.wait_for_function("window.__fw && window.__fw.idle() && !document.getElementById('busy')?.classList.contains('on')", timeout=0, polling=2000)
            for _ in range(60):
                res = await pg.evaluate("fetch('/api/resources').then(r => r.json()).then(j => j.resources || [])")
                new = [r for r in res if r['deliveryId'] not in before]
                if new: break
                await pg.wait_for_timeout(2000)
            r = new[-1] if new else None
            print('交付', key, r and {k: r[k] for k in ('name', 'deliveryId', 'revisionId', 'directory')}, r and [f['path'] if isinstance(f, dict) else f for f in r['files']][:14])
            out.append({'key': key, 'size': size, 'receipt': r})
            await pg.wait_for_timeout(15000)
            st = await pg.evaluate("document.getElementById('deliveryStatus')?.textContent")
            print('  状态', st)
            await pg.click('#deliveryMake') if await pg.is_visible('#deliveryMake') else None
            await pg.wait_for_timeout(1000)
        if out: json.dump(out, open('tail-deliver-result.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        await b.close()
asyncio.run(main())
