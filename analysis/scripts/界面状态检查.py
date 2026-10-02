"""界面状态检查（走查 4.2 A1–A6：会做错东西的状态切换）：真页面 + 假烘焙，几十秒跑完，云端就能跑

为什么用假烘焙：这里查的是「参数 / 版本 / 身份 / 重烘排队」这些状态对不对，不看像素。
假烘焙按真的取景 + 取帧计划（measure + plan）造一个烘焙结果，记下每次烘的参数，不碰显卡，所以快、而且结果可以逐项断言。

用法：python3 analysis/scripts/界面状态检查.py [--only A1,A4] [--out 结果.json] [--html 别的版本的 FireworkBaker.html] [--real]
  --real：不用假烘焙，真的烘（本机显卡任务 type "smoke" + "state": true 时这样跑，等待时间放长）
每项：pass / fail + 说明；有不过的项退出码 1。
  A1 组合编辑器不继承上一个效果的身份（资产栏名字、版本归属、导出名）
  A2 编辑器里存的版本刷新后能打开，非条目层的参数也恢复
  A3 同一预设里两层用同一个默认母版：改一层不带着另一层变
  A4 改完一层马上切到别的层：这一层的重烘不丢（贴图和参数一致）
  A5 切到别的效果：没保存的改动自动存成草稿，回来能选
  A6 切走再回来：带改动的状态不能被当成 AI 版基准（要么回到 AI 版，要么亮「参数已变」）
"""
import argparse, asyncio, json, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from browser_runtime import launch_async

ROOT = pathlib.Path(__file__).resolve().parents[2]
HTML = (ROOT / 'tool' / 'FireworkBaker.html').as_uri() + '?fast'

FAKE = r"""(() => {
  window.__bakes = [];
  const chk = { clipFrames: [], edgeFrames: [], chanUse: [true, true, true, true], emptyMid: [], similar: 0, seam: null, maxClip: 0 };
  bake = async (P, scale, onProg) => {
    if (!['master', 'segments'].includes(P.form)) throw new Error('假烘焙只造大面片 / 分段；「' + P.form + '」要真烘焙（--real）');
    const Pc = structuredClone(P), fm = measure(Pc), pl = plan(Pc, fm), pages = typeof splitPlan40 === 'function' ? splitPlan40(pl) : [pl];
    const parts = pages.map(meta => ({ P: Pc, form: Pc.form, N: 4, NH: 4, cw: 1, chh: 1, scale: 1, fm, head: { dispose() { } }, tail: null,
      meta: { ...meta, check: chk, lightKeys: [[0, 1], [1, 0]], darkTail: 0, frameMaxes: [], quality: qualityOf(Pc), expoH: 1, expoT: 1, bakeMs: 1, sparkSlots: 0 } }));
    parts.forEach((b, i) => b.next = parts[i + 1]);
    window.__bakes.push({ P: Pc, at: performance.now() });
    if (onProg) onProg(1);
    await new Promise(r => setTimeout(r, 40));
    return parts[0];
  };
  bakeMobileFor = async b => null;
  return 0;
})()"""

IDLE = "window.__fw.idle() && !state.baking && !(state.layerQueue && state.layerQueue.size) && $('#busy').hidden && !window.__opening"


REAL = False


async def idle(pg, ms=None):
    ms = ms or (240000 if REAL else 20000)
    t0 = time.time()
    while time.time() - t0 < ms / 1000:
        if await pg.evaluate(IDLE): await pg.wait_for_timeout(250); return True
        await pg.wait_for_timeout(150)
    return False


async def fresh(p, b):
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('检查版本')))
    await pg.add_init_script("window.requestAnimationFrame = () => 0;")
    await pg.goto(HTML, wait_until='load', timeout=0)
    await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
    if not REAL: await pg.evaluate(FAKE)
    return ctx, pg, errs


async def open_effect(pg, key):
    await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openEffect(EFFS().find(e => e.key === {json.dumps(key)}))).finally(() => window.__opening = false); return 0; }})()")
    await idle(pg)


async def open_editor(pg, preset=0):
    # 和用户点「工具 → 组合编辑器」同一个入口（左栏工具组的那一项）
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openComboEditor()).finally(() => window.__opening = false); return 0; })()")
    await idle(pg)
    if preset is not None:
        await pg.evaluate(f"Promise.resolve(applyCombo(structuredClone(COMBOS[{preset}]))).then(() => 0)"); await idle(pg)


async def set_layer_param(pg, i, key, val):
    await pg.evaluate(f"(() => {{ selectComboLayer({i}); state.P[{json.dumps(key)}] = {json.dumps(val)}; onParam(); return 0; }})()")


async def a1(pg):
    await open_effect(pg, 'hiki_nishiki')
    await open_editor(pg, 0)
    r = await pg.evaluate("({ key: wbKey(), effect: lib.effect ? lib.effect.key : null, name: $('#abName').textContent, deliv: delivName(), review: lib.review ? lib.review.id : null })")
    bad = []
    if r['effect']: bad.append(f"lib.effect 还是 {r['effect']}")
    if r['key'] != 'combo': bad.append(f"版本归属 {r['key']}（应为 combo）")
    if r['name'] != '组合编辑器': bad.append(f"资产栏名字「{r['name']}」")
    if r['review']: bad.append(f"审阅条目还是 {r['review']}")
    if 'HikiNishiki' in r['deliv'] or 'HN2' in r['deliv']: bad.append(f"导出名 {r['deliv']}")
    return not bad, '；'.join(bad) or json.dumps(r, ensure_ascii=False)


async def a2_same(p, b):
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('检查版本')))
    await pg.add_init_script("window.requestAnimationFrame = () => 0;")
    for rnd in range(2):
        await pg.goto(HTML, wait_until='load', timeout=0)
        await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
        if not REAL: await pg.evaluate(FAKE)
        if rnd == 0:
            await open_editor(pg, 0)
            await set_layer_param(pg, 1, 'stars', 77); await idle(pg)
            await pg.evaluate("selectComboLayer(-1); wbSave(true); 0"); await pg.wait_for_timeout(300)
            sid = await pg.evaluate("wb.src.kind === 'mine' ? wb.src.id : null")
            if not sid: await ctx.close(); return False, '保存没有成功'
        else:
            item = await pg.evaluate(f"(() => {{ const it = [...document.querySelectorAll('#libBody .li')].find(x => x.dataset.key === 'mine:combo:{sid}'); if (!it) return false; window.__opening = true; Promise.resolve(openMine('combo', '{sid}')).finally(() => window.__opening = false); return true; }})()")
            if not item: await ctx.close(); return False, '刷新后左栏没有这个版本（mine:combo:…）'
            await idle(pg); await pg.wait_for_timeout(500); await idle(pg)
            r = await pg.evaluate("({ key: lib.key, tab: state.tab, n: state.layers.length, stars: state.layers.map(L => { const e = layerEntryOf(L); return e && e.P.stars; }), src: wb.src })")
            await ctx.close()
            ok = r['tab'] == 'combo' and r['n'] == 2 and r['stars'][1] == 77 and r['src'].get('kind') == 'mine'
            return ok, json.dumps(r, ensure_ascii=False) + ('' if not errs else ' 错误：' + errs[0][:200])


async def a3(pg):
    await open_editor(pg, 1)      # 三重芯变色菊：菊 + 牡丹 + 牡丹
    r0 = await pg.evaluate("state.layers.map(L => layerEntryOf(L).P.stars)")
    await set_layer_param(pg, 1, 'stars', 55); await idle(pg)
    r = await pg.evaluate("({ same: layerEntryOf(state.layers[1]) === layerEntryOf(state.layers[2]), stars: state.layers.map(L => layerEntryOf(L).P.stars) })")
    ok = not r['same'] and r['stars'][1] == 55 and r['stars'][2] == r0[2]
    return ok, json.dumps({'before': r0, **r}, ensure_ascii=False)


async def a4(pg):
    await open_effect(pg, 'hiki_nishiki')
    old = await pg.evaluate("layerEntryOf(state.layers[0]).P.burn")
    new = round(old + 0.31, 3)
    await set_layer_param(pg, 0, 'burn', new)
    await pg.evaluate("selectComboLayer(1); 0")          # 防抖 380 ms 还没到就切走
    await idle(pg); await pg.wait_for_timeout(600); await idle(pg)
    r = await pg.evaluate("(() => { const e = layerEntryOf(state.layers[0]); return { p: e.P.burn, baked: e.bake && e.bake.P.burn }; })()")
    # 第二种：烘到一半切走
    old2 = await pg.evaluate("layerEntryOf(state.layers[1]).P.burn")
    await set_layer_param(pg, 1, 'burn', round(old2 + 0.17, 3))
    await pg.wait_for_timeout(450)                         # 防抖过了、正在烘
    await pg.evaluate("selectComboLayer(0); 0")
    await idle(pg); await pg.wait_for_timeout(600); await idle(pg)
    r2 = await pg.evaluate("(() => { const e = layerEntryOf(state.layers[1]); return { p: e.P.burn, baked: e.bake && e.bake.P.burn }; })()")
    ok = abs(r['p'] - new) < 1e-9 and r['baked'] is not None and abs(r['baked'] - new) < 1e-9 and r2['baked'] is not None and abs(r2['baked'] - r2['p']) < 1e-9
    return ok, json.dumps({'切层前没开烘': r, '烘到一半切层': r2}, ensure_ascii=False)


async def a5(pg):
    await open_effect(pg, 'jinmangju')
    await pg.wait_for_timeout(1500); await idle(pg)
    await pg.evaluate("state.P.stars = (state.P.stars || 100) + 13; onParam(); 0"); await idle(pg)
    want = await pg.evaluate("state.P.stars")
    await open_effect(pg, 'hongchao')
    drafts = await pg.evaluate("(store.get('mySaves', {})['ef:jinmangju'] || []).filter(s => s.draft).map(s => ({ name: s.name, stars: s.snap && s.snap.P && s.snap.P.stars }))")
    await open_effect(pg, 'jinmangju'); await pg.wait_for_timeout(1500); await idle(pg)
    opt = await pg.evaluate("[...$('#abSrc').options].map(o => o.textContent)")
    ok = any(d['stars'] == want for d in drafts) and any('草稿' in o for o in opt)
    return ok, json.dumps({'草稿': drafts, '版本选项': opt}, ensure_ascii=False)


async def a6(pg):
    await open_effect(pg, 'hiki_nishiki'); await pg.wait_for_timeout(1500); await idle(pg)
    ai = await pg.evaluate("layerEntryOf(state.layers[0]).P.burn")
    await set_layer_param(pg, 0, 'burn', round(ai + 0.23, 3)); await idle(pg)
    await pg.evaluate("selectComboLayer(-1); 0")
    await open_effect(pg, 'jinmangju'); await pg.wait_for_timeout(800); await idle(pg)
    await open_effect(pg, 'hiki_nishiki'); await pg.wait_for_timeout(2500); await idle(pg)
    r = await pg.evaluate("({ burn: layerEntryOf(state.layers[0]).P.burn, chg: !$('#abChg').hidden, gate: gateReasons(), src: wb.src.kind })")
    clean = abs(r['burn'] - ai) < 1e-9
    ok = clean or (r['chg'] and len(r['gate']) > 0)
    return ok, json.dumps({'AI 版 burn': ai, **r}, ensure_ascii=False)


async def main():
    global HTML, REAL
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--out', default=''); ap.add_argument('--html', default=''); ap.add_argument('--real', action='store_true')
    a = ap.parse_args(); only = set(x for x in a.only.split(',') if x); REAL = a.real
    if a.html: HTML = pathlib.Path(a.html).resolve().as_uri() + '?fast'
    from playwright.async_api import async_playwright
    res = []
    async with async_playwright() as p:
        b = await launch_async(p)
        for name, fn, own in [('A1', a1, False), ('A2', a2_same, True), ('A3', a3, False), ('A4', a4, False), ('A5', a5, False), ('A6', a6, False)]:
            if only and name not in only: continue
            t0 = time.time()
            try:
                if own: ok, why = await fn(p, b); errs = []
                else:
                    ctx, pg, errs = await fresh(p, b)
                    ok, why = await fn(pg); await ctx.close()
            except Exception as e: ok, why, errs = False, f'异常：{e}', []
            if errs: why += ' · 页面错误：' + errs[0][:200]
            res.append({'item': name, 'pass': bool(ok), 'why': why, 'sec': round(time.time() - t0, 1)})
            print(('✅' if ok else '❌'), name, why, f'（{res[-1]["sec"]} s）', flush=True)
        await b.close()
    if a.out: json.dump(res, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sys.exit(0 if all(r['pass'] for r in res) else 1)

asyncio.run(main())
