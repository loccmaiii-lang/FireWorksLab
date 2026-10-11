# 烘焙器资源交付 → 导入器：接收交付、两包设为「更新同名」（主角尾缀新建）、检查；--execute 时确认名称并执行导入（写 UE）。
# 一次只处理一个交付；UE 调用全部由导入器顺序发出。
import asyncio, json, sys, time
sys.path.insert(0, 'F:/FireWorksLab/analysis/scripts')
from playwright.async_api import async_playwright
from browser_runtime import launch_async
EXEC = '--execute' in sys.argv
NAMES = [a for a in sys.argv[1:] if not a.startswith('--')] or ['RiseTrail_S', 'RiseTrail_M', 'RiseTrail_L', 'RiseTrail_Hero_L']
STATE = "JSON.stringify(Object.values(FwImporter.deliveryState()).flatMap(x=>x.rows).filter(r=>r.id).map(r=>({id:r.id,p:r.platform,mode:r.mode,as:r.as,state:r.state,label:r.label,ps:r.assets.ps,n:Object.keys(r.assets||{}).length,done:r.completedAssetKeys.length,errs:r.errs,backup:r.backup,progress:r.importProgress})))"
async def idle(fr, pg, limit=1800):
    for _ in range(limit):
        if not await fr.evaluate("Workbench.busy"): return True
        await pg.wait_for_timeout(1000)
    return False
async def main():
    async with async_playwright() as p:
        b = await launch_async(p); ctx = await b.new_context(viewport={'width': 1600, 'height': 1000}); pg = await ctx.new_page()
        await pg.goto('http://127.0.0.1:8034/baker'); await pg.wait_for_timeout(7000)
        await pg.click('#deliveryOpen'); await pg.wait_for_timeout(10000)
        fr = next(f for f in pg.frames if 'delivery-host' in f.url)
        res = await pg.evaluate("fetch('/api/resources').then(r => r.json()).then(j => j.resources)")
        report = {}
        for name in NAMES:
            r = [x for x in res if x['name'] == name][-1]
            await idle(fr, pg)
            out = await fr.evaluate("id => FwDeliveryBridge.accept(window.__res.find(r => r.deliveryId === id))", r['deliveryId']) if False else None
            # 走宿主的 accept（与用户点选资源同一路径）
            await pg.evaluate("id => DeliveryWorkspace && 0", r['deliveryId'])
            await pg.evaluate("""async id => { const rs = (await (await fetch('/api/resources')).json()).resources; const r = rs.find(x => x.deliveryId === id);
                const btn = [...document.querySelectorAll('#deliveryList .delivery-resource')].find(b => b.querySelector('b')?.textContent === r.name && b.querySelector('small')?.textContent.startsWith(r.revisionId.slice(0,8)));
                if (btn) btn.click(); else throw Error('资源按钮不在列表：' + r.name); }""", r['deliveryId'])
            await pg.wait_for_timeout(3000); await idle(fr, pg)
            rows = [x for x in json.loads(await fr.evaluate(STATE)) if x['as'].startswith(name)]
            hero = name == 'RiseTrail_Hero_L'
            pc = next(x for x in rows if x['p'] == 'pc')
            if not hero and pc['mode'] != 'update':
                await fr.evaluate("""id => { document.querySelector('#fwimp-list [data-id="'+id+'"] .fw-item-name').click(); const s = document.getElementById('fwimp-mode'); s.value = 'update'; s.dispatchEvent(new Event('change', {bubbles: true})); }""", pc['id'])
                await pg.wait_for_timeout(800); await idle(fr, pg)
                await fr.evaluate("FwImporter.preview()"); await pg.wait_for_timeout(1500); await idle(fr, pg)
            rows = [x for x in json.loads(await fr.evaluate(STATE)) if x['as'].startswith(name)]
            for x in rows: print(name, x['p'], x['mode'], x['as'], x['state'], x['label'], x['ps'].split('/')[-1], '资产', x['n'], '错误', x['errs'][:6])
            report[name] = {'check': rows}
            if EXEC and all(x['state'] == 'ready' for x in rows) and len(rows) == 2:
                await fr.evaluate("FwImporter.reviewNames()"); await pg.wait_for_timeout(800)
                await fr.evaluate("FwImporter.confirmNames()"); await pg.wait_for_timeout(800)
                t = time.time(); print(name, '执行导入…', flush=True)
                await fr.evaluate("FwImporter.execute()"); await pg.wait_for_timeout(2000); ok = await idle(fr, pg, 3600)
                rows = [x for x in json.loads(await fr.evaluate(STATE)) if x['as'].startswith(name)]
                for x in rows: print(name, x['p'], '→', x['state'], x['label'], '完成', x['done'], '/', x['n'], '错误', x['errs'][:4], flush=True)
                print(name, f'用时 {time.time()-t:.0f} 秒', 'idle', ok)
                report[name]['after'] = rows
                log = await fr.evaluate("document.getElementById('wb-log')?.innerText || document.querySelector('.log, #log')?.innerText || ''")
                open(f'tail-import-{name}.log', 'w', encoding='utf-8').write(log)
                await pg.wait_for_timeout(4000)
            elif EXEC: print(name, '未全部检查通过，不执行')
        json.dump(report, open('tail-import-' + ('exec' if EXEC else 'check') + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        await pg.screenshot(path='delivery-repro/5_tail_import.png')
        await b.close()
asyncio.run(main())
