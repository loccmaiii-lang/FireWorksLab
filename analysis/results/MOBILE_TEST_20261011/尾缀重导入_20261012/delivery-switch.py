# 只读：真实 8034 交付页，把 PC 包处理方式切到「更新同名」，看两包检查结果。不确认、不执行。
import asyncio, json, sys
sys.path.insert(0, 'F:/FireWorksLab/analysis/scripts')
from playwright.async_api import async_playwright
from browser_runtime import launch_async
async def main():
    async with async_playwright() as p:
        b = await launch_async(p); ctx = await b.new_context(viewport={'width': 1600, 'height': 1000}); pg = await ctx.new_page()
        await pg.goto('http://127.0.0.1:8034/baker'); await pg.wait_for_timeout(7000)
        await pg.click('#deliveryOpen'); await pg.wait_for_timeout(12000)
        fr = next(f for f in pg.frames if 'delivery-host' in f.url)
        st = lambda: fr.evaluate("JSON.stringify(Object.values(FwImporter.deliveryState()).flatMap(x=>x.rows).map(r=>({p:r.platform,mode:r.mode,as:r.as,state:r.state,ps:r.assets.ps,errs:r.errs})))")
        print('切换前', json.dumps(json.loads(await st()), ensure_ascii=False, indent=1)[:1500])
        await fr.evaluate("""(()=>{const s=document.getElementById('fwimp-mode');s.value='update';s.dispatchEvent(new Event('change',{bubbles:true}));})()""")
        await pg.wait_for_timeout(1500)
        await fr.evaluate("FwImporter.preview()")
        for _ in range(120):
            await pg.wait_for_timeout(1000)
            if not await fr.evaluate("Workbench.busy"): break
        print('切换后', json.dumps(json.loads(await st()), ensure_ascii=False, indent=1)[:3000])
        await pg.screenshot(path='delivery-repro/4_switch.png')
        await b.close()
asyncio.run(main())
