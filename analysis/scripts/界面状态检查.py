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
  A7 新建效果：新建 → 加层 → 改名 → 复制 → 勾同一批星 → 保存 → 刷新 → 打开：层、名字、参数、同一批星都在
  P1 参数栏改版（用户 10-02 19:41 #3：参数和备注太多、没有分类、难找）：6 大类（运动 / 星头 / 尾迹 / 特效 / 环境 / 输出），每一节都归进一类；
     参数名短（≤ 12 字），长说明进悬停提示 + 底部说明条；节说明默认收起；搜索；「只看改过的」；多层时每一层的参数也一样
  U1 撤销 / 重做：单层改两步 → Ctrl+Z 两次一步步回去 → Ctrl+Shift+Z 重做；多层改一层 → 撤销只回这一层、只重烘这一层、贴图和参数一致；
     切到别的效果后撤销不会改到新效果；资产栏有撤销 / 重做按钮
  B1 滑杆和拖动同一套规则（走查 B10–B12）：滑杆改燃烧，序列时长跟着变（和拖燃烧结束一样）；滑杆改引线层的「火花停」，接力的锦层点火跟着动；
     改点火时入点跟着内容走；「恢复」回到打开时的版本（AI 版），不是花型模板默认
  V1 版本只留一套（走查 B8）：工具页没有「版本与回滚」「派生配方」；导出时在资产栏「版本」里自动存一份（每个效果最多 3 份），能选回来、不串到别的效果
  X1 导出方案（4.2.12）：层页头选「PC：GPU 光点 / 手机：序列」→ 层记住、参数已变、交付页那一层写光点、引擎回放那一层画光点；撤销能回到序列；
     光点大小 / 亮度（4.2.15）只在选光点时出现，改了导出跟着变，改回 1 层里不留字段
  G1 待我验收的「最新导出」按导出时间取（4.2.12：任务号字面排序时 HN2E9 排在 HN2E12 后面，误判未就绪）
  L1 HN2 闭环（只在 --real）：改一层立刻切层 → 保存 → 刷新 → 打开这个版本 → 导出 PC + 手机：参数、贴图、文件名、两套 cascade、缩放抖动
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


async def a7(p, b):
    """新建效果（4.2.7，走查 B18）：新建 → 选第一层 → 加一层（现有效果的层）→ 改名 → 复制 → 勾同一批星 → 保存 → 刷新 → 左栏打开：
    层数、层名、每层参数、同一批星、名字都在；改一层不带着复制出来的那层变（除非勾了同一批星）"""
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
    pg = await ctx.new_page(); errs = []; answers = ['金锦冠测试']
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept(answers[0] if d.type == 'prompt' else None)))
    await pg.add_init_script("window.requestAnimationFrame = () => 0;")
    try:
        for rnd in range(2):
            await pg.goto(HTML, wait_until='load', timeout=0)
            await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
            if not REAL: await pg.evaluate(FAKE)
            if rnd == 0:
                await pg.evaluate("(() => { window.__opening = true; $('#newRecipe').click(); const c = [...document.querySelectorAll('#pkGrid .pk-card')].find(x => x.textContent.includes('菊') && !x.textContent.includes('锦冠')); c.click(); setTimeout(() => window.__opening = false, 2500); return 0; })()")
                await idle(pg); await pg.wait_for_timeout(800); await idle(pg)
                r0 = await pg.evaluate("({ key: lib.key, n: state.layers.length, name: $('#abName').textContent })")
                if not str(r0['key']).startswith('my:') or r0['n'] != 1: return False, '新建没打开我的效果：' + json.dumps(r0, ensure_ascii=False)
                # 加一层：现有效果的层（引菊 → 锦 的第 1 层）
                await pg.evaluate("(() => { window.__opening = true; $('#myAdd').click(); setTimeout(() => { pk.cat = 'fx'; pkRender(); const c = [...document.querySelectorAll('#pkGrid .pk-card')].find(x => x.textContent.includes('引菊')); c.click(); setTimeout(() => window.__opening = false, 2500); }, 50); return 0; })()")
                await idle(pg); await pg.wait_for_timeout(800); await idle(pg)
                answers[0] = '中心'
                await pg.evaluate("myRenameLayer(0); 0")
                await pg.evaluate("(() => { window.__opening = true; Promise.resolve(myDupLayer(0)).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
                # 改第 1 层（中心）的星数：复制出来的第 2 层不能跟着变
                await set_layer_param(pg, 0, 'stars', 123); await idle(pg)
                indep = await pg.evaluate("[layerEntryOf(state.layers[0]).P.stars, layerEntryOf(state.layers[1]).P.stars]")
                # 勾「同一批星」：第 1、2 层
                await pg.evaluate("selectComboLayer(0); mySetLinked(0, 1, true); 0"); await idle(pg)
                await set_layer_param(pg, 0, 'v0', 77); await idle(pg)
                linked = await pg.evaluate("[layerEntryOf(state.layers[0]).P.v0, layerEntryOf(state.layers[1]).P.v0]")
                answers[0] = '金锦冠测试'
                await pg.evaluate("selectComboLayer(-1); wbSave(false).then(() => 0)"); await pg.wait_for_timeout(800)
                before = await pg.evaluate("({ id: lib.my.id, titles: state.layers.map((L, i) => layerName(i)), stars: state.layers.map(L => layerEntryOf(L).P.stars), links: myLinksLid().length, n: state.layers.length })")
            else:
                await pg.evaluate(f"(() => {{ window.__opening = true; const it = [...document.querySelectorAll('#libBody .li')].find(x => x.dataset.key === 'my:{before['id']}'); it.click(); setTimeout(() => window.__opening = false, 3000); return 0; }})()")
                await idle(pg); await pg.wait_for_timeout(800); await idle(pg)
                after = await pg.evaluate("({ key: lib.key, name: $('#abName').textContent, titles: state.layers.map((L, i) => layerName(i)), stars: state.layers.map(L => layerEntryOf(L).P.stars), links: (state.links || []).length, n: state.layers.length })")
                bad = []
                if indep[0] == indep[1]: bad.append(f'复制的层跟着变了 {indep}')
                if linked[0] != 77 or linked[1] != 77: bad.append(f'同一批星没联动 {linked}')
                if after['n'] != before['n'] or after['titles'] != before['titles']: bad.append(f"刷新后层不对 {after['titles']} ≠ {before['titles']}")
                if after['stars'] != before['stars']: bad.append(f"刷新后参数不对 {after['stars']} ≠ {before['stars']}")
                if after['links'] != 1: bad.append('刷新后同一批星没了')
                if after['name'] != '金锦冠测试': bad.append('名字不对：' + after['name'])
                return not bad, ('；'.join(bad) or f"{after['n']} 层 {after['titles']}、星数 {after['stars']}、同一批星 ✓、复制的层独立 ✓") + ('' if not errs else ' · 页面错误：' + errs[0][:200])
    finally:
        await ctx.close()


PULSE_JS = r"""(c) => { // 和 回放检查.py zoom_pulse 同一口径：同一帧停着的几个 tick 里 Size By Life 的变化（%）
  const cv = (d, u) => { if ('const' in d) return d.const; const k = d.curve; if (u <= k[0][0]) return k[0][1]; for (let i = 1; i < k.length; i++) if (u <= k[i][0]) { const a = (u - k[i-1][0]) / Math.max(1e-9, k[i][0] - k[i-1][0]), x = k[i-1][1], y = k[i][1]; return Array.isArray(x) ? x.map((v, j) => v + (y[j] - v) * a) : x + (y - x) * a; } return k[k.length-1][1]; };
  let worst = 0;
  for (const e of c.emitters) { const mods = {}; for (const m of e.modules) if (!m.preRoll) mods[m.m] = m; const sb = mods.SizeByLife, dp = mods.DynamicParameter; if (!sb || !dp) continue;
    const life = mods.Lifetime ? cv(mods.Lifetime.Lifetime, 0) : e.required.duration_s, n = Math.max(1, Math.floor(life * 30 + 1e-6)); let i = 0;
    const fr = [], sz = []; for (let t = 0; t < n; t++) { const u = Math.min(1, (t + .5) / 30 / life); fr.push(Math.floor(cv(dp.params.frame, u))); const v = cv(sb.LifeMultiplier, u); sz.push(Math.max(v[0], v[1])); }
    while (i < n) { let j = i; while (j + 1 < n && fr[j + 1] === fr[i]) j++; if (j > i) { const seg = sz.slice(i, j + 1); worst = Math.max(worst, (Math.max(...seg) / Math.min(...seg) - 1) * 100); } i = j + 1; } }
  return +worst.toFixed(3); }"""


async def l1(p, b):
    """HN2 闭环（用户 23:34：修完 A1–A6 用 HN2 走一遍）：改一层后立刻切层 → 保存 → 刷新 → 打开这个版本 → 导出 PC + 手机。
    只在 --real（真烘焙）时跑：要真的贴图才能导出。查：版本参数在、贴图是新参数烘的、文件名按命名规则、两套 cascade.json、缩放抖动 0、取景收紧过。"""
    if not REAL: return None, '要真烘焙（--real，本机显卡任务里跑）'
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('闭环检查')))
    try:
        for rnd in range(2):
            await pg.goto(HTML, wait_until='load', timeout=0)
            await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
            if rnd == 0:
                await open_effect(pg, 'hiki_nishiki')
                ai = await pg.evaluate("layerEntryOf(state.layers[0]).P.burn"); want = round(ai + 0.1, 3)
                await set_layer_param(pg, 0, 'burn', want)
                await pg.evaluate("selectComboLayer(1); 0")              # 改完马上切层（A4 那条路）
                await idle(pg); await pg.wait_for_timeout(1500); await idle(pg)
                baked = await pg.evaluate("layerEntryOf(state.layers[0]).bake.srcP.burn")
                await pg.evaluate("selectComboLayer(-1); wbSave(true).then(() => 0)"); await pg.wait_for_timeout(800)
                sid = await pg.evaluate("wb.src.kind === 'mine' ? wb.src.id : null")
                if not sid: return False, '保存没有成功'
            else:
                await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openMine('ef:hiki_nishiki', '{sid}')).finally(() => window.__opening = false); return 0; }})()")
                await idle(pg); await pg.wait_for_timeout(1500); await idle(pg)
                got = await pg.evaluate("({ burn: layerEntryOf(state.layers[0]).P.burn, src: wb.src.kind, key: lib.key })")
                files = await pg.evaluate("""(async () => { const fs = await comboPackFiles('HikiNishiki', state.layers); const c = fs.find(f => f[0] === 'cascade.json'), cm = fs.find(f => f[0] === 'cascade_mobile.json');
                  const dec = x => JSON.parse(new TextDecoder().decode(x[1]));
                  return { names: fs.map(f => f[0]), pc: c ? dec(c) : null, mob: cm ? dec(cm) : null, fitted: state.layers.map(L => { const e = layerEntryOf(L); return e && e.bake.meta.fitted ? e.bake.meta.fitted.mode : null; }) }; })()""")
                pulse = [await pg.evaluate(PULSE_JS, files['pc']) if files['pc'] else None, await pg.evaluate(PULSE_JS, files['mob']) if files['mob'] else None]
                names = files['names']
                bad = []
                if abs(got['burn'] - want) > 1e-9: bad.append(f"版本里的 burn {got['burn']}（应为 {want}）")
                if abs(baked - want) > 1e-9: bad.append(f"切层后贴图是按 burn {baked} 烘的")
                if got['src'] != 'mine': bad.append('刷新后没打开这个版本')
                if not files['pc'] or not files['mob']: bad.append('缺 cascade.json / cascade_mobile.json')
                tex = [n for n in names if n.endswith('.png')]
                if not any(n.startswith('T_EFX_FireWorks_HikiNishiki_Hiki_') for n in tex) or not any(n.startswith('T_EFX_FireWorks_HikiNishiki_Nishiki_') for n in tex): bad.append('贴图文件名不按命名规则：' + '、'.join(tex[:6]))
                if any(v is None or v > 0.2 for v in pulse): bad.append(f'缩放抖动 {pulse}')
                await pg.evaluate(f"(() => {{ const all = store.get('mySaves', {{}}); all['ef:hiki_nishiki'] = (all['ef:hiki_nishiki'] || []).filter(s => s.id !== '{sid}'); store.set('mySaves', all); return 0; }})()")   # 收拾：删掉检查用的版本
                why = '；'.join(bad) or f"版本 burn {got['burn']} ✓、切层后贴图按新参数 ✓、{len(tex)} 张贴图按命名规则 ✓、PC + 手机 cascade ✓、缩放抖动 {pulse} ✓、取景收紧 {files['fitted']}"
                return not bad, why + ('' if not errs else ' · 页面错误：' + errs[0][:200])
    finally:
        await ctx.close()


P1_STATE = r"""(() => { const host = $('#params'), vis = el => !!el && !el.hidden && !!el.offsetParent && !el.closest('[hidden]');
  const grps = [...host.querySelectorAll('.pgrp')], secs = [...host.querySelectorAll('details.sec')];
  const labs = [...host.querySelectorAll('.sl')].filter(vis).map(r => { const k = r.querySelector('.k'), t = [...k.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim(); return { id: r.querySelector('input[type=range]').id, t, title: k.title }; });
  return { tools: !!host.querySelector('.ptools input[type=search]') && !!host.querySelector('.ptools input[type=checkbox]'),
    groups: grps.map(g => g.dataset.g), orphan: secs.filter(d => !d.closest('.pgrp')).map(d => d.querySelector('summary').textContent),
    hintsShown: [...host.querySelectorAll('details.sec > p.hint')].filter(vis).length,
    labs, long: labs.filter(x => x.t.length > 12).map(x => x.t), help: ($('#pHelp') || {}).textContent || null }; })()"""
P1_SEARCH = r"""(q) => { const i = $('#params .ptools input[type=search]'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true }));
  const vis = el => !!el && !el.hidden && !!el.offsetParent && !el.closest('[hidden]');
  return [...$('#params').querySelectorAll('.sl')].filter(vis).map(r => r.querySelector('input[type=range]').id.replace(/^p-|-\d+$/g, '')); }"""
P1_CHANGED = r"""(on) => { const c = $('#params .ptools input[type=checkbox]'); if (c.checked !== on) c.click();
  const vis = el => !!el && !el.hidden && !!el.offsetParent && !el.closest('[hidden]');
  return [...$('#params').querySelectorAll('.sl')].filter(vis).map(r => r.querySelector('input[type=range]').id.replace(/^p-|-\d+$/g, '')); }"""


async def p1(pg):
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    st = await pg.evaluate(P1_STATE)
    G = {'运动', '星头', '尾迹', '特效', '环境', '输出'}
    if not st['tools']: bad.append('没有搜索框 / 「只看改过的」')
    if not st['groups'] or set(st['groups']) - G: bad.append(f"大类不对：{st['groups']}")
    if st['orphan']: bad.append(f"没归类的节：{st['orphan'][:4]}")
    if st['hintsShown']: bad.append(f"节说明默认展开了 {st['hintsShown']} 段")
    if st['long']: bad.append(f"参数名太长 {len(st['long'])} 个：{st['long'][:3]}")
    info['参数名平均字数'] = round(sum(len(x['t']) for x in st['labs']) / max(1, len(st['labs'])), 1); info['可见参数'] = len(st['labs'])
    if not bad:
        r = await pg.evaluate(P1_SEARCH, '粗细')
        if 'tailWidth' not in r or 'stars' in r: bad.append(f'搜「粗细」结果不对：{r[:6]}')
        info['搜粗细'] = r
        r = await pg.evaluate(P1_SEARCH, '')
        if 'stars' not in r: bad.append('清空搜索后参数没回来')
        r = await pg.evaluate(P1_CHANGED, True)
        if r: bad.append(f'没改过任何参数，「只看改过的」还显示 {r[:4]}')
        await pg.evaluate("(() => { state.P.stars = state.P.stars + 10; onParam(); return 0; })()"); await idle(pg)
        r = await pg.evaluate(P1_CHANGED, True)
        if r != ['stars']: bad.append(f'改了星数后「只看改过的」显示 {r[:4]}（应为 stars）')
        await pg.evaluate(P1_CHANGED, False)
        await pg.hover('#params .sl:has(input[id^="p-tailWidth-"]) .k')
        h = await pg.evaluate("($('#pHelp') || {}).textContent || ''")
        if '横向散开' not in h: bad.append(f'悬停「尾迹粗细」底部说明条没出完整说明：「{h[:40]}」')
    if not bad:     # 多层效果：选中某一层时右栏也是同一套
        await open_effect(pg, 'hiki_nishiki')
        await pg.evaluate("(() => { selectComboLayer(1); return 0; })()"); await idle(pg)
        st = await pg.evaluate(P1_STATE)
        if not st['tools'] or st['orphan'] or not st['groups']: bad.append(f"多层效果里第 2 层的参数没用新版：工具 {st['tools']}、没归类 {st['orphan'][:3]}")
    return not bad, '；'.join(bad) or json.dumps(info, ensure_ascii=False)


async def u1(pg):
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg); await pg.wait_for_timeout(900)
    btn = await pg.evaluate("!!$('#abUndo') && !!$('#abRedo')")
    if not btn: bad.append('资产栏没有撤销 / 重做按钮')
    s0 = await pg.evaluate("({ stars: state.P.stars, burn: state.P.burn })")
    await pg.evaluate("(() => { state.P.stars += 20; onParam(); return 0; })()"); await pg.wait_for_timeout(900); await idle(pg)
    await pg.evaluate("(() => { state.P.burn = +(state.P.burn + 0.4).toFixed(2); onParam(); return 0; })()"); await pg.wait_for_timeout(900); await idle(pg)
    await pg.mouse.click(700, 400)      # 焦点不在输入框里
    await pg.keyboard.press('Control+z'); await idle(pg); await pg.wait_for_timeout(300)
    s1 = await pg.evaluate("({ stars: state.P.stars, burn: state.P.burn, baked: window.__bakes.length ? window.__bakes[window.__bakes.length - 1].P.burn : null })")
    await pg.keyboard.press('Control+z'); await idle(pg); await pg.wait_for_timeout(300)
    s2 = await pg.evaluate("({ stars: state.P.stars, burn: state.P.burn })")
    await pg.keyboard.press('Control+Shift+z'); await idle(pg); await pg.wait_for_timeout(300)
    s3 = await pg.evaluate("({ stars: state.P.stars, burn: state.P.burn })")
    info['单层'] = [s0, s1, s2, s3]
    if not (s1['burn'] == s0['burn'] and s1['stars'] == s0['stars'] + 20): bad.append(f'第一次撤销没回到改燃烧时间之前：{s1}')
    if s1['baked'] is None or abs(s1['baked'] - s0['burn']) > 1e-9: bad.append(f"撤销后没按撤回的参数重烘（最后一次烘 burn={s1['baked']}）")
    if s2 != s0: bad.append(f'第二次撤销没回到最初：{s2}（应为 {s0}）')
    if not (s3['stars'] == s0['stars'] + 20 and s3['burn'] == s0['burn']): bad.append(f'重做不对：{s3}')
    # 多层：改第 2 层，撤销只动这一层
    await open_effect(pg, 'hiki_nishiki'); await pg.wait_for_timeout(900); await idle(pg)
    L0 = await pg.evaluate("layerEntryOf(state.layers[0]).P.stars"); L1 = await pg.evaluate("layerEntryOf(state.layers[1]).P.burn")
    n0 = await pg.evaluate("state.layers.length")
    await set_layer_param(pg, 1, 'burn', round(L1 + 0.27, 3)); await pg.wait_for_timeout(900); await idle(pg)
    nb = await pg.evaluate("window.__bakes.length")
    await pg.mouse.click(700, 400); await pg.keyboard.press('Control+z'); await idle(pg); await pg.wait_for_timeout(600); await idle(pg)
    r = await pg.evaluate("(() => { const e0 = layerEntryOf(state.layers[0]), e1 = layerEntryOf(state.layers[1]); return { n: state.layers.length, s0: e0.P.stars, b1: e1.P.burn, baked1: e1.bake && e1.bake.P.burn, bakes: window.__bakes.slice(%d).map(x => x.P.burn) }; })()" % 0)
    r['新烘'] = (await pg.evaluate("window.__bakes.length")) - nb
    info['多层'] = r
    if abs(r['b1'] - L1) > 1e-9: bad.append(f"多层撤销后第 2 层 burn={r['b1']}（应为 {L1}）")
    if r['baked1'] is None or abs(r['baked1'] - L1) > 1e-9: bad.append(f"第 2 层贴图没按撤回的参数重烘（{r['baked1']}）")
    if r['s0'] != L0 or r['n'] != n0: bad.append('撤销动到了别的层 / 层数')
    if r['新烘'] > 1: bad.append(f"撤销一层重烘了 {r['新烘']} 次（应只烘这一层）")
    # 切到别的效果：撤销不能改到新效果
    await pg.evaluate("(() => { selectComboLayer(1); state.P.burn = +(state.P.burn + 0.2).toFixed(2); onParam(); return 0; })()"); await pg.wait_for_timeout(900); await idle(pg)
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('botan')).finally(() => window.__opening = false); return 0; })()"); await idle(pg); await pg.wait_for_timeout(900)
    b0 = await pg.evaluate("JSON.stringify(state.P)")
    await pg.mouse.click(700, 400); await pg.keyboard.press('Control+z'); await idle(pg); await pg.wait_for_timeout(300)
    if await pg.evaluate("JSON.stringify(state.P)") != b0: bad.append('切到别的效果后按撤销，新效果的参数被改了')
    return not bad, '；'.join(bad) or json.dumps(info, ensure_ascii=False)


SLIDE = r"""([k, dv]) => { const el = document.querySelector(`#params input[type=range][id^="p-${k}-"]`); if (!el) return null;
  const v = +(+el.value + dv).toFixed(3); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); return v; }"""


async def b1(pg):
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r0 = await pg.evaluate("({ d: state.P.duration, end: layerEndOf(state.P) })")
    await pg.evaluate(SLIDE, ['burn', 1.0]); await idle(pg)
    r1 = await pg.evaluate("({ d: state.P.duration, end: layerEndOf(state.P) })")
    info['滑杆改燃烧'] = [r0, r1]
    if abs((r1['d'] - r0['d']) - (r1['end'] - r0['end'])) > 0.02: bad.append(f"滑杆把燃烧 +1 s 后序列时长 {r0['d']} → {r1['d']}（拖动时会跟着加 {r1['end'] - r0['end']:.2f} s）")
    await pg.evaluate("(() => { state.P.cutIn = 0.6; onParam(); buildMasterPanel(); return 0; })()"); await idle(pg)
    await pg.evaluate(SLIDE, ['ignDelay', 0.3]); await idle(pg)
    c = await pg.evaluate("state.P.cutIn"); info['点火 +0.3 后入点'] = c
    if abs(c - 0.9) > 0.011: bad.append(f'点火推后 0.3 s，入点还在 {c}（应跟着到 0.9）')
    await open_effect(pg, 'hiki_nishiki')
    await pg.evaluate("selectComboLayer(0); 0"); await idle(pg)
    g0 = await pg.evaluate("({ stop: layerEntryOf(state.layers[0]).P.sparkStop, ign1: layerEntryOf(state.layers[1]).P.ignDelay })")
    await pg.evaluate(SLIDE, ['sparkStop', 0.2]); await idle(pg); await pg.wait_for_timeout(600); await idle(pg)
    g1 = await pg.evaluate("(() => { const e1 = layerEntryOf(state.layers[1]); return { stop: layerEntryOf(state.layers[0]).P.sparkStop, ign1: e1.P.ignDelay, baked1: e1.bake && e1.bake.P.ignDelay }; })()")
    info['接力'] = [g0, g1]
    if abs((g1['ign1'] - g0['ign1']) - (g1['stop'] - g0['stop'])) > 0.011: bad.append(f"滑杆把引线火花停 +0.2，锦层点火 {g0['ign1']} → {g1['ign1']}（拖动时会一起动）")
    elif g1['baked1'] is None or abs(g1['baked1'] - g1['ign1']) > 1e-9: bad.append('锦层点火跟着动了，但没有重烘')
    await open_effect(pg, 'jinmangju'); await pg.wait_for_timeout(900); await idle(pg)     # 打开后等烘焙稳定、记下「打开时」的样子（wbArm）
    ai = await pg.evaluate("state.P.burn"); tpl = await pg.evaluate("defaultsFor(state.P.type, renderVersion(state.P)).P.burn")
    await pg.evaluate("(() => { state.P.burn = +(state.P.burn + 0.5).toFixed(2); onParam(); return 0; })()"); await idle(pg)
    await pg.evaluate("$('#btnReset').click(); 0"); await idle(pg)
    rb = await pg.evaluate("state.P.burn"); info['恢复'] = {'AI 版': ai, '模板': tpl, '恢复后': rb}
    if abs(rb - ai) > 1e-9: bad.append(f'「恢复」后燃烧 {rb}（打开时的 AI 版是 {ai}，模板默认 {tpl}）')
    return not bad, '；'.join(bad) or json.dumps(info, ensure_ascii=False)


async def v1(pg):
    bad, info = [], {}
    secs = await pg.evaluate("[...document.querySelectorAll('#pIter details.sec > summary')].map(x => x.textContent.trim())")
    old = [x for x in secs if x in ('版本与回滚', '派生配方')]
    if old: bad.append(f'工具页还有旧的版本系统：{old}')
    hooks = await pg.evaluate("({ single: typeof exportMaster === 'function' && exportMaster.toString().includes('wbAutoExport'), combo: typeof exportCombo === 'function' && exportCombo.toString().includes('wbAutoExport'), fn: typeof wbAutoExport === 'function' })")
    if not all(hooks.values()): bad.append(f'导出时没有存进资产栏版本：{hooks}')
    if not bad:
        await open_effect(pg, 'jinmangju'); await pg.wait_for_timeout(900); await idle(pg)
        b0 = await pg.evaluate("state.P.burn")
        for i in range(4):
            await pg.evaluate(f"(() => {{ state.P.burn = +({b0} + {i + 1} * 0.1).toFixed(2); onParam(); return 0; }})()"); await idle(pg)
            await pg.evaluate("wbAutoExport('test'); 0")
        r = await pg.evaluate("(() => { const l = wbList(); return { auto: l.filter(s => s.auto).map(s => [s.name, s.snap.P.burn]), opts: [...$('#abSrc').options].map(o => o.textContent) }; })()")
        info['导出时'] = r
        if len(r['auto']) != 3: bad.append(f"导出时自动存了 {len(r['auto'])} 份（应只留最近 3 份）")
        if r['auto'] and abs(r['auto'][-1][1] - round(b0 + 0.4, 2)) > 1e-9: bad.append(f"最近一份导出存的燃烧 {r['auto'][-1][1]}（应为 {round(b0 + 0.4, 2)}）")
        first = await pg.evaluate("(() => { const s = wbList().filter(s => s.auto)[0]; $('#abSrc').value = s.id; $('#abSrc').dispatchEvent(new Event('change')); return s.snap.P.burn; })()"); await idle(pg)
        cur = await pg.evaluate("state.P.burn")
        if abs(cur - first) > 1e-9: bad.append(f'选回「导出时」那一份，燃烧 {cur}（应为 {first}）')
        await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
        n = await pg.evaluate("wbList().filter(s => s.auto).length")
        if n: bad.append(f'菊模板的版本里出现了金芒菊的导出存档 {n} 份')
    return not bad, '；'.join(bad) or json.dumps(info, ensure_ascii=False)


async def x1(pg):
    bad, info = [], {}
    await open_effect(pg, 'hiki_nishiki'); await pg.wait_for_timeout(900); await idle(pg)
    await pg.evaluate("selectComboLayer(1); 0"); await idle(pg)
    has = await pg.evaluate("!!document.querySelector('#lhOut select[data-out=pc]')")
    if not has: return False, '层页头没有导出方案'
    await pg.select_option('#lhOut select[data-out=pc]', 'dots'); await pg.wait_for_timeout(900)
    r = await pg.evaluate("({ out: state.layers[1].out || null, chg: !$('#abChg').hidden, note: $('#lhOutNote').textContent, undo: !$('#abUndo').disabled })")
    info['选了光点'] = r
    if not r['out'] or r['out'].get('pc') != 'dots': bad.append(f"层没记住方案：{r['out']}")
    if not r['chg']: bad.append('改了方案「参数已变」没亮')
    if '尾巴' not in r['note']: bad.append(f"有尾巴的层选光点没提示：{r['note'][:60]}")
    # 4.2.15 光点大小 / 亮度：只在选光点时出现；改了导出的发射器跟着变，回到 1 层里不留字段
    SZ = "(() => { const xs = state.layers.map(L => ({ L, b: layerEntryOf(L).bake })); const pc = fwlCombo('T', comboEntries(xs, false), false), e = pc.emitters.find(e => e.layer === 2); return e ? e.modules.find(m => m.m === 'InitialSize').StartSize.uniform : null; })()"
    s0 = await pg.evaluate(SZ)
    vis = await pg.evaluate("(() => { const d = $('#lhDots'); return !!d && !d.hidden && !!d.querySelector('input[id$=dotSize]') && !!d.querySelector('input[id$=dotBright]'); })()")
    if not vis: bad.append('选了光点，层页头没出现光点大小 / 亮度')
    else:
        await pg.fill('#lhDots input[id$=dotSize] ~ input.num', '2'); await pg.press('#lhDots input[id$=dotSize] ~ input.num', 'Enter'); await pg.wait_for_timeout(200)
        s2 = await pg.evaluate(SZ); info['光点大小 1 → 2'] = [s0, s2, await pg.evaluate("state.layers[1].dotSize")]
        if not (s0 and s2 and abs(s2[0][0] / s0[0][0] - 2) < 0.02): bad.append(f'光点大小改成 2，导出的大小没翻倍：{s0} → {s2}')
        await pg.fill('#lhDots input[id$=dotSize] ~ input.num', '1'); await pg.press('#lhDots input[id$=dotSize] ~ input.num', 'Enter'); await pg.wait_for_timeout(200)
        if await pg.evaluate("'dotSize' in state.layers[1]"): bad.append('光点大小改回 1，层里还留着 dotSize')
    # 4.2.15 光点个数 = 模拟里会亮的星数（引菊 → 锦两层炭头亮度都是 0 → 0 颗，层页头要提示）；另拿第 1 层把炭头亮度临时设成 1 查画得出来
    dr = await pg.evaluate("(() => { selectComboLayer(-1); const pc = state.layers.map(comboLayerDraw); state.platform = 'mobile'; const mb = state.layers.map(comboLayerDraw); state.platform = 'pc'; const n = (i, o) => { const L = { ...state.layers[i], out: { pc: 'dots', mobile: 'seq' } }, e0 = layerEntryOf(state.layers[i]), e = o ? { P: { ...e0.P, ...o } } : e0, v = dotVis(e.P); return [dotsTables(e, L)[0].list.length, v ? v.n : 0, e.P.stars]; }; return { pc, mb, l2: n(1), l1: n(0, { headBright: 1 }) }; })()")
    info['引擎回放'] = dr
    if dr['pc'][1] != 'dots' or dr['mb'][1] != 'seq': bad.append(f"引擎回放第 2 层：PC {dr['pc'][1]}、手机 {dr['mb'][1]}（应为光点 / 序列）")
    for k in ('l1', 'l2'):
        if dr[k][0] != dr[k][1]: bad.append(f"引擎回放光点数 {dr[k][0]}（模拟里会亮的星 {dr[k][1]}）")
    if not dr['l1'][1]: bad.append(f"第 1 层（炭头亮度设 1）模拟里没有亮的星：{dr['l1']}")
    if not dr['l2'][1] and '星头不发光' not in r['note']: bad.append('第 2 层星头不发光，层页头没提示')
    await pg.evaluate("toggleDeliv(true); 0"); await pg.wait_for_timeout(200)
    dv = await pg.evaluate("$('#delivView').textContent"); await pg.evaluate("toggleDeliv(false); 0")
    if 'GPU 光点' not in dv: bad.append('交付页没写第 2 层是 GPU 光点')
    cas = await pg.evaluate("(() => { const xs = state.layers.map(L => ({ L, b: layerEntryOf(L).bake })); const pc = fwlCombo('T', comboEntries(xs, false), false); return pc.emitters.filter(e => e.layer === 2).map(e => [e.name, e.gpu, pc.materials[e.material].role]); })()")
    info['PC 第 2 层发射器'] = cas
    if cas != [['L2_Dots', True, 'soft_dot']]: bad.append(f'cascade.json 第 2 层不是一个 GPU 光点发射器：{cas}')
    await pg.mouse.click(700, 400); await pg.keyboard.press('Control+z'); await idle(pg); await pg.wait_for_timeout(300)
    o = await pg.evaluate("state.layers[1].out || null")
    if o and o.get('pc') == 'dots': bad.append('撤销没回到序列')
    # 4.2.13 单束
    await pg.evaluate("selectComboLayer(1); 0"); await idle(pg)
    u = await pg.evaluate("(() => { const opt = document.querySelector('#lhOut select[data-out=pc] option[value=unit]'); return { has: !!opt, disabled: opt ? opt.disabled : null, allowed: unitAllowed(layerEntryOf(state.layers[1]).P) }; })()")
    info['单束选项'] = u
    if not u['has']: bad.append('PC 方案里没有单束')
    elif u['allowed']:
        await pg.select_option('#lhOut select[data-out=pc]', 'unit'); await pg.wait_for_timeout(300)
        r2 = await pg.evaluate("({ out: state.layers[1].out, note: $('#lhOutNote').textContent, draw: comboLayerDraw(state.layers[1]) })")
        info['选了单束'] = r2
        if r2['draw'] != 'unit' or '单束' not in r2['note']: bad.append(f'选单束后：{r2}')
    return not bad, '；'.join(bad) or json.dumps(info, ensure_ascii=False)


async def g1(pg):
    r = await pg.evaluate("""(() => { const ef = EFFS().find(e => e.key === 'hiki_nishiki'), e = entryById(ef.待验收版 || ef.主条目), cur = entryVer(e);
      const fake = { ...ef, exports: [{ job: 'X10', entry: e.id, ver: cur, time: '2026-10-03 03:13', check: { passed: true } }, { job: 'X9', entry: e.id, ver: 'old', time: '2026-10-02 18:42', check: { passed: true } }] };
      const r = effReady(fake); return { exJob: r.ex && r.ex.job, why: r.why }; })()""")
    ok = r['exJob'] == 'X10' and not any('导出' in w for w in r['why'])
    return ok, json.dumps(r, ensure_ascii=False)


async def main():
    global HTML, REAL
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--out', default=''); ap.add_argument('--html', default=''); ap.add_argument('--real', action='store_true')
    a = ap.parse_args(); only = set(x for x in a.only.split(',') if x); REAL = a.real
    if a.html: HTML = pathlib.Path(a.html).resolve().as_uri() + '?fast'
    from playwright.async_api import async_playwright
    res = []
    async with async_playwright() as p:
        b = await launch_async(p)
        for name, fn, own in [('A1', a1, False), ('A2', a2_same, True), ('A3', a3, False), ('A4', a4, False), ('A5', a5, False), ('A6', a6, False), ('A7', a7, True), ('P1', p1, False), ('U1', u1, False), ('B1', b1, False), ('V1', v1, False), ('X1', x1, False), ('G1', g1, False), ('L1', l1, True)]:
            if only and name not in only: continue
            t0 = time.time()
            try:
                if own: ok, why = await fn(p, b); errs = []
                else:
                    ctx, pg, errs = await fresh(p, b)
                    ok, why = await fn(pg); await ctx.close()
            except Exception as e: ok, why, errs = False, f'异常：{e}', []
            if errs: why += ' · 页面错误：' + errs[0][:200]
            if ok is None: print('⏭', name, why, flush=True); continue          # 这一项只在真烘焙时跑
            res.append({'item': name, 'pass': bool(ok), 'why': why, 'sec': round(time.time() - t0, 1)})
            print(('✅' if ok else '❌'), name, why, f'（{res[-1]["sec"]} s）', flush=True)
        await b.close()
    if a.out: json.dump(res, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sys.exit(0 if all(r['pass'] for r in res) else 1)

asyncio.run(main())
