"""条目体检：左栏每个条目挨个打开，看打不打得开、要多久、有没有报错（用户 2026-10-03：查哪些旧条目渲染不出来 / 卡）

用法：
  python3 analysis/scripts/条目体检.py [--real] [--only ef:,rv:] [--limit 600] [--out 体检.json]
默认用假烘焙（和 界面状态检查.py 同一个：按真的取景 / 取帧计划造结果，不碰显卡）——查的是数据 / 代码层面打不打得开、
实时模拟要算多少步（CPU 预跑耗时 = 卡不卡的主要来源）；--real 真烘焙（本机显卡任务里跑），再量烘焙耗时和实时模拟帧间隔。
每个条目：ok / 报错 / 超时，打开秒数，CPU 预跑秒数（measure），帧数、贴图张数；结果按「有问题的在前」排。
"""
import argparse, asyncio, json, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from browser_runtime import launch_async
with open(pathlib.Path(__file__).resolve().parent / '界面状态检查.py', encoding='utf-8') as f:
    src = f.read(); i = src.index('FAKE = r"""') + len('FAKE = r"""'); j = src.index('"""', i); FAKE = src[i:j]

ROOT = pathlib.Path(__file__).resolve().parents[2]
HTML = (ROOT / 'tool' / 'FireworkBaker.html').as_uri() + '?fast'
KEYS = r"""[...document.querySelectorAll('#libBody .li')].map(x => ({ key: x.dataset.key, name: (x.querySelector('b') || x).textContent.trim().slice(0, 40) })).filter(x => /^(ef|rv|rep|type):/.test(x.key))"""
OPEN = r"""(k) => { window.__opening = true; window.__err = null; const t0 = performance.now(); window.__t0 = t0;
  let p;
  try {
    if (k.startsWith('ef:')) p = openEffect(EFFS().find(e => 'ef:' + e.key === k));
    else if (k.startsWith('rv:')) p = openReview(FW_REVIEW_LIST.find(e => 'rv:' + e.id === k));
    else if (k.startsWith('rep:')) p = openFormal(REPLICA_BY_ID[k.slice(4)]);
    else if (k.startsWith('type:')) p = openType(k.slice(5));
  } catch (e) { window.__err = String(e && e.stack || e); }
  Promise.resolve(p).catch(e => { window.__err = String(e && e.stack || e); }).finally(() => { window.__opening = false; window.__t1 = performance.now(); });
  return 0; }"""
IDLE = "!window.__opening && !state.baking && (!state.dirty || state.failedGen === state.gen) && !(state.layerQueue && state.layerQueue.size) && $('#busy').hidden"
INFO = r"""(() => { const combo = state.tab === 'combo', bs = combo ? state.layers.map(L => { const e = layerEntryOf(L); return e && e.bake; }) : [state.bake];
  const parts = bs.filter(Boolean).flatMap(b => bakeParts(b));
  const Ps = combo ? state.layers.map(L => { const e = layerEntryOf(L); return e && e.P; }).filter(Boolean) : [state.P];
  let mt = 0; for (const P of Ps) { const t0 = performance.now(); try { measure(P); } catch (e) { } mt += performance.now() - t0; }
  return { tab: state.tab, layers: combo ? state.layers.length : 1, frames: parts.reduce((n, s) => n + s.meta.L.F, 0), pages: parts.length,
    missing: bs.filter(b => !b).length, measureS: +(mt / 1000).toFixed(2), duration: +Math.max(...Ps.map(P => +P.duration || 0)).toFixed(2),
    err: window.__err, bakeErr: state.bakeError && state.bakeError.message || null, openS: window.__t1 ? +((window.__t1 - window.__t0) / 1000).toFixed(2) : null }; })()"""


async def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--real', action='store_true'); ap.add_argument('--only', default=''); ap.add_argument('--limit', type=float, default=0); ap.add_argument('--out', default='')
    a = ap.parse_args(); pref = tuple(x for x in a.only.split(',') if x)
    from playwright.async_api import async_playwright
    res = []
    async with async_playwright() as p:
        b = await launch_async(p); ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script("window.requestAnimationFrame = () => 0;" if not a.real else "")
        await pg.goto(HTML, wait_until='load', timeout=0)
        await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
        if not a.real: await pg.evaluate(FAKE)
        await pg.evaluate("Object.keys(lib.open).forEach(k => lib.open[k] = true); lib.histOpen = new Proxy({}, { get: () => true }); renderLib(); 0")
        items = await pg.evaluate(KEYS)
        seen = set(); items = [x for x in items if not (x['key'] in seen or seen.add(x['key']))]
        if pref: items = [x for x in items if x['key'].startswith(pref)]
        print(len(items), '个条目', flush=True)
        T0 = time.time()
        for it in items:
            if a.limit and time.time() - T0 > a.limit * 60: print('到时间上限，停'); break
            n0 = len(errs); t0 = time.time()
            await pg.evaluate(OPEN, it['key'])
            to = 300 if a.real else 60; ok = False
            while time.time() - t0 < to:
                await pg.wait_for_timeout(200)
                if await pg.evaluate(IDLE): ok = True; break
            info = await pg.evaluate(INFO)
            r = {**it, 'sec': round(time.time() - t0, 1), 'timeout': not ok, 'pageErrors': errs[n0:][:3], **info}
            fake_skip = not a.real and any('假烘焙只造' in str(x) for x in [r['err'], r['bakeErr'], *r['pageErrors']])
            r['status'] = '跳过（要真烘焙）' if fake_skip else '超时' if not ok else '报错' if (r['err'] or r['pageErrors'] or r['bakeErr']) else '缺贴图' if r['missing'] else 'ok'
            res.append(r)
            print(('✅' if r['status'] == 'ok' else '⏭' if r['status'].startswith('跳过') else '❌'), r['key'], r['name'], r['status'], f"{r['sec']} s · 预跑 {r['measureS']} s · {r['frames']} 帧 / {r['pages']} 张",
                  (r['err'] or r['bakeErr'] or (r['pageErrors'][0] if r['pageErrors'] else ''))[:160], flush=True)
            if not ok:     # 卡住了：换一页继续
                await pg.close(); pg = await ctx.new_page(); errs.clear(); pg.on('pageerror', lambda e: errs.append(str(e)))
                await pg.add_init_script("window.requestAnimationFrame = () => 0;" if not a.real else "")
                await pg.goto(HTML, wait_until='load', timeout=0); await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
                if not a.real: await pg.evaluate(FAKE)
        await b.close()
    res.sort(key=lambda r: (r['status'] == 'ok', -r['measureS']))
    out = a.out or str(ROOT / 'analysis' / 'probe' / '条目体检.json')
    json.dump(res, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    bad = [r for r in res if r['status'] not in ('ok', '跳过（要真烘焙）')]
    print(f'\n{len(res)} 个条目，{len(bad)} 个有问题 → {out}')
    sys.exit(1 if bad else 0)

asyncio.run(main())
