"""界面状态检查（走查 4.2 A1–A6：会做错东西的状态切换）：真页面 + 假烘焙，几十秒跑完，云端就能跑

为什么用假烘焙：这里查的是「参数 / 版本 / 身份 / 重烘排队」这些状态对不对，不看像素。
假烘焙按真的取景 + 取帧计划（measure + plan）造一个烘焙结果，记下每次烘的参数，不碰显卡，所以快、而且结果可以逐项断言。

用法：python3 analysis/scripts/界面状态检查.py [--only A1,A4] [--out 结果.json] [--html 别的版本的 FireworkBaker.html] [--real]
  --real：不用假烘焙，真的烘（本机显卡任务 type "smoke" + "state": true 时这样跑，等待时间放长）
每项：pass / fail + 说明；有不过的项退出码 1。
  A1 新建效果不继承上一个效果的身份（资产栏名字、版本归属、导出名）（4.3 组合编辑器去掉了，改查「＋ 新建效果」）
  A2 4.3：以前组合编辑器里存的版本，打开烘焙器后搬进「我的效果」，能打开、层和参数都在；改了保存、刷新后还在
  A3 同一个效果里两层用同一个模板：改一层不带着另一层变
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
  K1 按需烘焙（4.2.16，用户 10-03 12:59「abc 一起做」）：自动烘焙关时改参数不烘、贴图标旧；切到引擎回放 / 按 B 才烘（手动烘做收紧取景）；
     烘到一半参数又变，这次直接丢掉（不等烘完再烘一遍）；自动烘焙开时改完自动烘、不收紧；多层导出不会拿到旧贴图；开关记住
  K2 按需烘焙 · 真烘焙（只在 --real）：真的显卡烘焙烘到一半改参数 → 这次作废、最后的贴图是最新参数、没有页面错误；自动烘焙关时按 B 烘到最新并收紧取景
  R1 「恢复到打开时」（单层）把被接力带动的另一层也恢复（10-03 复现：恢复第 1 层后第 2 层的延时点火还停在被带动的位置）
  C1 曲线视图（4.2.18，只读）：单层 / 多层选中层，时间轴下面有 亮度 / 亮着的星 / 火花生成 / 火花寿命 / 星速度 / 颜色 六条；
     改「火花起势」火花生成曲线的上升变慢、旧曲线留作对照；改「渐隐」亮度曲线末段变；悬停参数高亮对应曲线；开关、悬停都不触发烘焙；多层没选层时给提示
  S1 4.3.2 收尾：子花那几个「负数 = 默认」的参数是「用默认」勾选（H16）；只剩 GPU 模拟内核、存档 / 旧母版的 CPU 换成 GPU（H12）；物理尾缀过顶后按下落段算、开花晚于到顶有提示（E11③ / H15②）
  S2 4.3.3 新建效果：打开就在第 1 层的参数上；加的层是这个效果自己的一份，改了不动原条目；保存再打开还在；不写「AI 版」
  S3 4.3.4 后：打开菊 / 空白发射器 / 升空尾缀，第一眼的参数、尾缀各层的火花模块、空白发射器的「+ 火花」看得见（分组不能默认全收起）
  N1 4.3 新参数面板（预览开关）：默认关 = 原样；打开后按模块排、名字来自参数命名表、英文名开关、看得见的参数一个不少、
     「××随机」收在本体参数的「随机」下（点开才出、记住）、不起作用的参数变灰写原因（菊：点火时刻随机；牡丹：火花寿命）、
     搜索认新名 / 旧名 / 英文名、说明条第一行「English · 中文 — 说明」；关掉回到原样
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

# 真烘焙（--real）时只记录每次烘焙用的参数（U1 等要看「最后一次烘的是什么」），不替换烘焙本身
REC = r"""(() => {
  window.__bakes = [];
  const ob = bake;
  bake = async (P, scale, onProg) => { const Pc = structuredClone(P); const b = await ob(P, scale, onProg); window.__bakes.push({ P: Pc, at: performance.now() }); return b; };
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
    await pg.evaluate(REC if REAL else FAKE)
    return ctx, pg, errs


async def open_effect(pg, key):
    await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openEffect(EFFS().find(e => e.key === {json.dumps(key)}))).finally(() => window.__opening = false); return 0; }})()")
    await idle(pg)


async def new_effect(pg, key='kiku'):
    # 和用户点左下「＋ 新建效果」→ 选第一层同一个入口（myCreate 会问名字，对话框答「检查版本」）
    await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(myCreate({json.dumps(key)})).finally(() => window.__opening = false); return 0; }})()")
    await idle(pg)


async def set_layer_param(pg, i, key, val):
    await pg.evaluate(f"(() => {{ selectComboLayer({i}); state.P[{json.dumps(key)}] = {json.dumps(val)}; onParam(); return 0; }})()")


async def a1(pg):
    await open_effect(pg, 'hiki_nishiki')
    await new_effect(pg, 'kiku')
    r = await pg.evaluate("({ key: wbKey(), effect: lib.effect ? lib.effect.key : null, name: $('#abName').textContent, deliv: delivName(), review: lib.review ? lib.review.id : null })")
    bad = []
    if r['effect']: bad.append(f"lib.effect 还是 {r['effect']}")
    if not str(r['key']).startswith('my:'): bad.append(f"版本归属 {r['key']}（应为 my:…）")
    if r['name'] != '检查版本': bad.append(f"资产栏名字「{r['name']}」")
    if r['review']: bad.append(f"审阅条目还是 {r['review']}")
    if 'HikiNishiki' in r['deliv'] or 'HN2' in r['deliv']: bad.append(f"导出名 {r['deliv']}")
    return not bad, '；'.join(bad) or json.dumps(r, ensure_ascii=False)


OLD_SAVE = r"""(() => {
  const d = defaultsFor('kiku'), e = defaultsFor('botan');
  const snap = { kind: 'combo', name: '八重芯变色菊', layers: [
    { id: null, type: 'kiku', L: { scale: 1, delay: 0, rate: 1, mirror: false }, P: { ...derive(structuredClone(d.P)), stars: 77 }, M: structuredClone(d.M) },
    { id: null, type: 'botan', L: { scale: 0.5, delay: 0, rate: 1, mirror: false }, P: derive(structuredClone(e.P)), M: structuredClone(e.M) }] };
  const all = store.get('mySaves', {}); all.combo = [{ id: 'old1', name: '旧编辑器版本', at: '2026-10-03 12:00', snap }]; store.set('mySaves', all); store.set('myEffects', {});
  return 0; })()"""


async def a2_same(p, b):
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('检查版本')))
    await pg.add_init_script("window.requestAnimationFrame = () => 0;")
    bad, info = [], {}
    try:
        for rnd in range(3):
            await pg.goto(HTML, wait_until='load', timeout=0)
            await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
            if not REAL: await pg.evaluate(FAKE)
            if rnd == 0: await pg.evaluate(OLD_SAVE); continue          # 模拟 4.2.x 的浏览器里组合编辑器存过一个版本
            mig = await pg.evaluate("(() => { const r = Object.values(myAll()).find(x => x.name === '组合编辑器 · 旧编辑器版本'); return { id: r ? r.id : null, left: !!(store.get('mySaves', {}).combo), li: r ? !![...document.querySelectorAll('#libBody .li')].find(x => x.dataset.key === 'my:' + r.id) : false }; })()")
            if not mig['id']: bad.append('旧的组合编辑器版本没搬进「我的效果」'); break
            if rnd == 1 and mig['left']: bad.append('mySaves 里旧的 combo 还在（会每次都搬一遍）')
            if not mig['li']: bad.append('左栏「我的效果」里没有它')
            await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openMyEffect({json.dumps(mig['id'])})).finally(() => window.__opening = false); return 0; }})()")
            await idle(pg); await pg.wait_for_timeout(500); await idle(pg)
            r = await pg.evaluate("({ key: lib.key, tab: state.tab, n: state.layers.length, stars: state.layers.map(L => { const e = layerEntryOf(L); return e && e.P.stars; }) })")
            info[f'第 {rnd} 次打开'] = r
            if r['tab'] != 'combo' or r['n'] != 2 or r['stars'][0] != 77: bad.append(f'打开后层或参数不对：{r}'); break
            if rnd == 1:
                await set_layer_param(pg, 1, 'stars', 55); await idle(pg)
                await pg.evaluate("selectComboLayer(-1); wbSave(false).then(() => 0)"); await pg.wait_for_timeout(800)
            elif r['stars'][1] != 55: bad.append(f'改了第 2 层保存、刷新后星数是 {r["stars"][1]}（应为 55）')
    finally:
        await ctx.close()
    return not bad, ('；'.join(bad) or json.dumps(info, ensure_ascii=False)) + ('' if not errs else ' 错误：' + errs[0][:200])


async def a3(pg):
    await new_effect(pg, 'botan')
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(myAddLayerFrom('botan')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r0 = await pg.evaluate("state.layers.map(L => layerEntryOf(L).P.stars)")
    await set_layer_param(pg, 0, 'stars', 55); await idle(pg)
    r = await pg.evaluate("({ same: layerEntryOf(state.layers[0]) === layerEntryOf(state.layers[1]), stars: state.layers.map(L => layerEntryOf(L).P.stars) })")
    ok = len(r0) == 2 and not r['same'] and r['stars'][0] == 55 and r['stars'][1] == r0[1]
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


# 4.3：只有一个面板（没有新旧开关）。「看得见」= 没被藏、所在的模块 / 「更多」都是打开的（关着的 <details> 里的行 offsetParent 也不是 null，不能用它判断）
P1_SHOWN = r"""const shown = el => { if (!el || el.hidden || el.closest('[hidden]')) return false; for (let d = el.parentElement && el.parentElement.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) if (!d.open) return false; return true; };"""
P1_STATE = r"""(() => { const host = $('#params'); """ + P1_SHOWN + r"""
  const grps = [...host.querySelectorAll('details.pgrp')].filter(g => !g.hidden), secs = [...host.querySelectorAll('details.sec')];
  const rows = panelRows.filter(([r]) => r._lab != null && shown(r)), labs = rows.map(([r, it]) => ({ k: Array.isArray(it) ? it[0] : it.sel || it.text, t: r._lab }));
  const more = [...host.querySelectorAll('details.mod')].filter(d => !d.hidden && d._more && !d._more.hidden).map(d => ({ m: d._mod, open: d._more.open, txt: d._more.querySelector('summary').textContent, n: [...d._more.children].filter(c => c.tagName !== 'SUMMARY' && !c.hidden).length }));
  return { tools: !!host.querySelector('.ptools input[type=search]') && !!host.querySelector('.ptools input[type=checkbox]'), toggle: !!host.querySelector('[data-v43]'),
    groups: grps.map(g => g.dataset.g), orphan: secs.filter(d => !d.closest('.pgrp')).map(d => d.querySelector('summary').textContent),
    hintsShown: [...host.querySelectorAll('details.sec > p.hint')].filter(p => shown(p)).length, more,
    labs, long: labs.filter(x => x.t.length > 12).map(x => x.t), noName: panelRows.filter(([r, it]) => r._lab != null && !r._nm).map(([r, it]) => Array.isArray(it) ? it[0] : it.sel || it.text) }; })()"""
P1_SEARCH = r"""(q) => { const i = $('#params .ptools input[type=search]'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })); """ + P1_SHOWN + r"""
  return panelRows.filter(([r, it]) => Array.isArray(it) && shown(r)).map(([r, it]) => it[0]); }"""
P1_CHANGED = r"""(on) => { const c = $('#params .ptools input[type=checkbox]'); if (c.checked !== on) c.click(); """ + P1_SHOWN + r"""
  return panelRows.filter(([r, it]) => Array.isArray(it) && shown(r)).map(([r, it]) => it[0]); }"""


async def p1(pg):
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    st = await pg.evaluate(P1_STATE)
    if not st['tools']: bad.append('没有搜索框 / 「只看改过的」')
    if st['toggle']: bad.append('还有新旧面板开关（4.3 只有一个面板）')
    if st['groups'][:3] != ['发射', '运动', '外观'] or st['groups'][-1:] != ['输出'] or '层' in st['groups']: bad.append(f"大类不对：{st['groups']}")
    if st['orphan']: bad.append(f"没归类的节：{st['orphan'][:4]}")
    if st['hintsShown']: bad.append(f"模块说明默认展开了 {st['hintsShown']} 段")
    if st['long']: bad.append(f"参数名太长 {len(st['long'])} 个：{st['long'][:3]}")
    if st['noName']: bad.append(f"参数没有命名表里的名字：{st['noName'][:5]}")
    # 第一眼 ≤ 30 项（需求重梳 2026-10-03 第 3 条）；其余在模块里的「更多 N 项」，默认收起
    info['第一眼参数'] = len(st['labs']); info['参数名平均字数'] = round(sum(len(x['t']) for x in st['labs']) / max(1, len(st['labs'])), 1)
    if len(st['labs']) > 30: bad.append(f"打开菊第一眼就有 {len(st['labs'])} 项（要 ≤ 30）")
    sp = next((m for m in st['more'] if m['m'] == '火花'), None); info['火花 更多'] = sp
    if not sp or sp['open'] or not sp['n'] or sp['txt'] != f"更多 {sp['n']} 项": bad.append(f'火花模块的「更多」不对：{sp}')
    if any(x['k'] == 'sparkRateEnd' for x in st['labs']): bad.append('「末段生成率」（更多）第一眼就看得到')
    if not bad:
        r = await pg.evaluate(P1_SEARCH, '粗细')
        if 'tailWidth' not in r or 'stars' in r: bad.append(f'搜「粗细」结果不对：{r[:6]}')
        info['搜粗细'] = r
        r = await pg.evaluate(P1_SEARCH, '末段生成')
        if 'sparkRateEnd' not in r: bad.append(f'搜「末段生成」没把「更多」里的末段生成率翻出来：{r[:6]}')
        r = await pg.evaluate(P1_SEARCH, '')
        if 'stars' not in r or 'sparkRateEnd' in r: bad.append(f'清空搜索后没回到原样：{r[:8]}')
        r = await pg.evaluate(P1_CHANGED, True)
        if r: bad.append(f'没改过任何参数，「只看改过的」还显示 {r[:4]}')
        await pg.evaluate("(() => { state.P.sparkRateEnd = (+state.P.sparkRateEnd || 0) + 0.2; onParam(); return 0; })()"); await idle(pg)
        r = await pg.evaluate(P1_CHANGED, True)
        if r != ['sparkRateEnd']: bad.append(f'改了末段生成率后「只看改过的」显示 {r[:4]}（应为 sparkRateEnd，在「更多」里也要翻出来）')
        await pg.evaluate(P1_CHANGED, False)
        h = await pg.evaluate("(() => { panelHelp(panelRows.find(([r, it]) => it[0] === 'tailWidth')[0]); return $('#pHelp').textContent; })()")
        if '横向散开' not in h: bad.append(f'「尾迹粗细」底部说明条没出完整说明：「{h[:40]}」')
    if not bad:     # 多层效果：选中某一层时右栏也是同一套
        await open_effect(pg, 'hiki_nishiki')
        await pg.evaluate("(() => { selectComboLayer(1); return 0; })()"); await idle(pg)
        st = await pg.evaluate(P1_STATE)
        if not st['tools'] or st['orphan'] or not st['groups'] or st['noName']: bad.append(f"多层效果里第 2 层的面板不对：工具 {st['tools']}、没归类 {st['orphan'][:3]}、没名字 {st['noName'][:3]}")
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
    ai = await pg.evaluate("state.P.burn"); tpl = await pg.evaluate("defaultsFor(state.P.type).P.burn")
    await pg.evaluate("(() => { state.P.burn = +(state.P.burn + 0.5).toFixed(2); onParam(); return 0; })()"); await idle(pg)
    await pg.evaluate("$('#btnReset').click(); 0"); await idle(pg)
    rb = await pg.evaluate("state.P.burn"); info['恢复'] = {'AI 版': ai, '模板': tpl, '恢复后': rb}
    if abs(rb - ai) > 1e-9: bad.append(f'「恢复」后燃烧 {rb}（打开时的 AI 版是 {ai}，模板默认 {tpl}）')
    return not bad, '；'.join(bad) or json.dumps(info, ensure_ascii=False)


async def v1(pg):
    bad, info = [], {}
    secs = await pg.evaluate("[...document.querySelectorAll('#pIter details.sec > summary')].map(x => x.textContent.trim())")
    old = [x for x in secs if x in ('版本与回滚', '派生配方', 'A/B 分屏对比', '实拍 / 实机截图对比', '数值测量对比')]
    if old: bad.append(f'工具页还有去掉的东西：{old}')
    if '导入 / 导出 JSON' not in secs: bad.append(f'工具页没有「导入 / 导出 JSON」：{secs}')
    btn = await pg.evaluate("['toolImport', 'toolExport', 'toolImportRecipe'].filter(i => !document.getElementById(i))")
    if btn: bad.append(f'工具页少了按钮 {btn}')
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
    if '尾迹' not in r['note']: bad.append(f"有尾迹的层选光点没提示：{r['note'][:60]}")
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


# ---- 4.2.16 按需烘焙 ----
K1_FAKE = r"""(() => {
  window.__k = { done: [], aborted: 0, refine: 0 };
  const chk = { clipFrames: [], edgeFrames: [], chanUse: [true, true, true, true], emptyMid: [], similar: 0, seam: null, maxClip: 0 };
  bake = async (P, scale, onProg) => {
    const Pc = structuredClone(P), fm = measure(Pc), pl = plan(Pc, fm), pages = splitPlan40(pl);
    try { for (let i = 1; i <= 8; i++) { if (onProg) onProg(i / 8); await new Promise(r => setTimeout(r, 60)); } }
    catch (e) { window.__k.aborted++; throw e; }
    const parts = pages.map(meta => ({ P: Pc, form: Pc.form, N: 4, NH: 4, cw: 1, chh: 1, scale: 1, fm, head: { dispose() { } }, tail: null,
      meta: { ...meta, check: chk, lightKeys: [[0, 1], [1, 0]], darkTail: 0, frameMaxes: [], quality: qualityOf(Pc), expoH: 1, expoT: 1, bakeMs: 1, sparkSlots: 0 } }));
    parts.forEach((b, i) => b.next = parts[i + 1]); parts[0].meta.plan = pl; parts[0].srcP = Pc;
    window.__k.done.push({ stars: Pc.stars, burn: Pc.burn }); return parts[0];
  };
  refineBake = async b => { window.__k.refine++; for (let s = b; s; s = s.next) s.meta.fitted = { mode: 'none' }; return null; };
  return 0;
})()"""
SETTLE = "!state.baking && !(state.layerQueue && state.layerQueue.size) && !state.refineDue && !(state.layerRefine && state.layerRefine.size) && $('#busy').hidden && !window.__opening"


async def settle(pg, ms=20000):
    t0 = time.time()
    while time.time() - t0 < ms / 1000:
        await pg.wait_for_timeout(250)
        if await pg.evaluate(SETTLE):
            await pg.wait_for_timeout(900)          # 防抖 / 收紧排队（0.38 / 0.7 s）都过了还是静的才算
            if await pg.evaluate(SETTLE): return True
    return False


async def k1(pg):
    bad, info = [], {}
    have = await pg.evaluate("typeof setAutoBake === 'function' && typeof bakeNow === 'function' && !!document.getElementById('bakeNow') && !!document.getElementById('staleBar')")
    if not have: return False, '还没有按需烘焙（setAutoBake / bakeNow / #bakeNow / #staleBar）'
    await pg.evaluate(K1_FAKE)
    # 单层
    await open_effect(pg, 'jinmangju'); await settle(pg)
    # 4.3（渲染基础问题 F3）：待验收的候选打开时在引擎回放；下面先切回实时模拟再测
    v = await pg.evaluate("state.view"); info['打开候选时的视图'] = v
    if v != 'export': bad.append(f'待验收候选打开时不在引擎回放（{v}）')
    await pg.click('#viewSeg button[data-view=live]'); await settle(pg)
    await pg.evaluate("setAutoBake(false); 0")
    n0 = await pg.evaluate("__k.done.length")
    await pg.evaluate("state.P.stars = (state.P.stars || 100) + 7; onParam(); 0"); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("({ n: __k.done.length, stale: bakeStale(), btn: $('#bakeNow').textContent, bar: !$('#staleBar').hidden, want: state.P.stars })")
    info['自动烘焙关 · 改参数'] = r
    if r['n'] != n0: bad.append(f"自动烘焙关时改参数还是烘了（{r['n'] - n0} 次）")
    if not r['stale']: bad.append('改了参数，贴图没标「旧」')
    if r['bar']: bad.append('实时模拟视图不该出「贴图是旧的」横条')
    rf0 = await pg.evaluate("__k.refine")
    await pg.click('#viewSeg button[data-view=export]'); await settle(pg)
    r = await pg.evaluate("({ n: __k.done.length, last: __k.done[__k.done.length - 1], stale: bakeStale(), bar: !$('#staleBar').hidden, refine: __k.refine })")
    info['切到引擎回放'] = r
    if r['n'] != n0 + 1 or r['last']['stars'] != info['自动烘焙关 · 改参数']['want']: bad.append(f"切到引擎回放没按新参数烘一次：{r}")
    if r['stale'] or r['bar']: bad.append('烘完还标着旧')
    if r['refine'] <= rf0: bad.append('手动烘（切视图）没做收紧取景')
    await pg.evaluate("state.P.stars += 5; onParam(); 0"); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("({ n: __k.done.length, bar: !$('#staleBar').hidden, txt: $('#staleBar').textContent, want: state.P.stars })")
    info['引擎回放里改参数'] = r
    if r['n'] != n0 + 1: bad.append('引擎回放视图里改参数也自动烘了')
    if not r['bar']: bad.append('引擎回放视图里贴图旧了，没有横条提示')
    await pg.evaluate("document.activeElement && document.activeElement.blur(); 0"); await pg.keyboard.press('b'); await settle(pg)
    r = await pg.evaluate("({ n: __k.done.length, last: __k.done[__k.done.length - 1], bar: !$('#staleBar').hidden })")
    info['按 B'] = r
    if r['n'] != n0 + 2 or r['last']['stars'] != info['引擎回放里改参数']['want'] or r['bar']: bad.append(f"按 B 没烘到最新：{r}")
    # 自动烘焙开：改完自动烘、不收紧；烘到一半又改 → 丢掉这次
    await pg.evaluate("setAutoBake(true); 0")
    n1, rf1, ab1 = await pg.evaluate("[__k.done.length, __k.refine, __k.aborted]")
    await pg.evaluate("state.P.stars += 3; onParam(); 0"); await pg.wait_for_timeout(650)
    await pg.evaluate("state.P.stars += 2; onParam(); 0"); await settle(pg)
    r = await pg.evaluate("({ n: __k.done.length, last: __k.done[__k.done.length - 1], aborted: __k.aborted, refine: __k.refine, want: state.P.stars, stale: bakeStale() })")
    info['自动烘焙开 · 烘到一半又改'] = r
    if r['aborted'] <= ab1: bad.append('烘到一半参数又变，旧的那次没丢掉（等它烘完了）')
    if r['n'] != n1 + 1 or r['last']['stars'] != r['want']: bad.append(f"自动烘焙：应只完整烘一次、按最新参数（完成 {r['n'] - n1} 次）")
    if r['refine'] != rf1: bad.append('自动烘焙也做了收紧取景（应只在手动烘 / 导出时做）')
    if r['stale']: bad.append('自动烘完还标着旧')
    # 多层：自动烘焙关时改一层，导出拿到的是新参数
    await pg.evaluate("setAutoBake(false); 0")
    await open_effect(pg, 'hiki_nishiki'); await settle(pg)
    n2 = await pg.evaluate("__k.done.length")
    old = await pg.evaluate("layerEntryOf(state.layers[0]).P.burn")
    await set_layer_param(pg, 0, 'burn', round(old + 0.2, 3)); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("({ n: __k.done.length, baked: layerEntryOf(state.layers[0]).bake.P.burn, stale: bakeStale() })")
    info['多层 · 自动烘焙关 · 改第 1 层'] = r
    if r['n'] != n2: bad.append('多层：自动烘焙关时改一层还是烘了')
    if not r['stale']: bad.append('多层：改了一层没标旧')
    r = await pg.evaluate("(async () => { const x = await comboLayerBakes(state.layers); const b = x.layers[0].b.P.burn; x.own.forEach(disposeBake); return { b, want: layerEntryOf(state.layers[0]).P.burn, stale: bakeStale() }; })()")
    info['多层导出'] = r
    if abs(r['b'] - r['want']) > 1e-9: bad.append(f"多层导出拿到了旧贴图（{r['b']} vs 参数 {r['want']}）")
    pref = await pg.evaluate("store.get('autoBake', null)")
    if pref is not False: bad.append(f'开关没记住（{pref}）')
    await pg.evaluate("setAutoBake(true); 0")
    return not bad, json.dumps(info, ensure_ascii=False) if not bad else '；'.join(bad) + ' ｜ ' + json.dumps(info, ensure_ascii=False)


async def k2(pg):
    if not REAL: return None, '要真烘焙（--real，本机显卡任务里跑）'
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    t0 = time.time()
    await pg.evaluate("Object.assign(state.P, { texW: 1024, texH: 1024 }); onParam(); 0"); await idle(pg); one = time.time() - t0
    # 烘到一半改参数：在第一次进度回调（0 < p < 1）里改，保证真的「烘到一半」（本机显卡烘得快，按时间估会改在烘完之后）
    await pg.evaluate("""(() => { window.__ab = 0; window.__hit = 0; const ob = bake;
      bake = async (P, s, onProg) => { try { return await ob(P, s, p => { if (!window.__hit && p > 0 && p < 1) { window.__hit = 1; state.P.stars += 4; onParam(); } return onProg && onProg(p); }); }
        catch (e) { if (e && e.abort) window.__ab++; throw e; } }; return 0; })()""")
    await pg.evaluate("state.P.stars += 9; onParam(); 0"); await idle(pg)
    r = await pg.evaluate("({ want: state.P.stars, baked: state.bake && state.bake.P.stars, aborted: window.__ab, hit: window.__hit, err: state.bakeError && state.bakeError.message })")
    info['一次烘焙秒数（含 0.38 s 防抖）'] = round(one, 2); info['烘到一半改参数'] = r
    if r['baked'] != r['want']: bad.append(f"最后的贴图不是最新参数（{r['baked']} vs {r['want']}）")
    if r['err']: bad.append('烘焙报错：' + r['err'])
    if not r['hit']: bad.append('烘焙没有中间进度（没法在烘到一半时改参数）')
    elif not r['aborted']: bad.append('烘到一半改参数，这次烘焙没作废')
    await pg.evaluate("setAutoBake(false); state.P.stars += 2; onParam(); 0"); await pg.wait_for_timeout(1500)
    r = await pg.evaluate("({ want: state.P.stars, baked: state.bake.P.stars, stale: bakeStale() })"); info['自动烘焙关 · 改参数'] = r
    if r['baked'] == r['want'] or not r['stale']: bad.append('自动烘焙关时改参数还是烘了 / 没标旧')
    await pg.evaluate("document.activeElement && document.activeElement.blur(); 0"); await pg.keyboard.press('b'); await idle(pg)
    r = await pg.evaluate("({ want: state.P.stars, baked: state.bake.P.stars, fitted: !!(state.bake.meta && state.bake.meta.fitted), stale: bakeStale() })"); info['按 B'] = r
    if r['baked'] != r['want'] or r['stale']: bad.append('按 B 没烘到最新')
    if not r['fitted']: bad.append('按 B 没做收紧取景')
    await pg.evaluate("setAutoBake(true); 0")
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def r1(pg):
    await open_effect(pg, 'hiki_nishiki'); await pg.wait_for_timeout(900); await idle(pg)
    o = await pg.evaluate("state.layers.map(L => { const P = layerEntryOf(L).P; return [P.burn, P.sparkStop, P.ignDelay]; })")
    await pg.evaluate("selectComboLayer(0); 0"); await idle(pg)
    await pg.evaluate("setTimingParam('burn', 1.0); 0"); await idle(pg)
    m = await pg.evaluate("state.layers.map(L => { const P = layerEntryOf(L).P; return [P.burn, P.sparkStop, P.ignDelay]; })")
    await pg.evaluate("resetToOpened(); 0"); await idle(pg)
    r = await pg.evaluate("state.layers.map(L => { const P = layerEntryOf(L).P; return [P.burn, P.sparkStop, P.ignDelay]; })")
    moved = abs(m[1][2] - o[1][2]) > 1e-6
    ok = moved and all(abs(a - b) < 1e-9 for x, y in zip(o, r) for a, b in zip(x, y))
    return ok, json.dumps({'打开时': o, '改第 1 层燃烧 1.0 后': m, '恢复第 1 层后': r}, ensure_ascii=False)


async def wait_curves(pg, ms=15000):
    t0 = time.time()
    while time.time() - t0 < ms / 1000:
        # 检查里关了绘制循环（requestAnimationFrame = 0），时间轴由 stageTick 建：这里手动走一拍
        if await pg.evaluate("typeof curveInfo === 'function' && (stage2.last = 0, stageTick(curDuration()), curvesTick(), curveInfo().ready)"): return True
        await pg.wait_for_timeout(150)
    return False


def rise_time(a, dt):
    """火花生成曲线：从第一次 > 0 到第一次 ≥ 一半最大值用了多久（秒）"""
    m = max(a) if a else 0
    if m <= 0: return None
    i0 = next(i for i, v in enumerate(a) if v > 0); i1 = next(i for i, v in enumerate(a) if v >= m / 2)
    return (i1 - i0) * dt


async def c1(pg):
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    await pg.evaluate("curvesShow(true); 0")
    if not await wait_curves(pg): return False, '单层（菊）曲线没出来：' + json.dumps(await pg.evaluate("typeof curveInfo === 'function' ? curveInfo() : null"), ensure_ascii=False)
    r = await pg.evaluate("curveInfo()"); info['菊'] = {k: r[k] for k in ('lanes', 'ms', 'max')}
    if r['lanes'] != ['light', 'lit', 'spark', 'life', 'speed', 'color']: bad.append(f"曲线条目 {r['lanes']}")
    dom = await pg.evaluate("[...document.querySelectorAll('#tlCurves .cvl')].map(l => [l.dataset.k, l.querySelector('canvas') ? l.querySelector('canvas').width : 0])")
    if len(dom) != 6 or any(w <= 0 for _, w in dom): bad.append(f'曲线画布 {dom}')
    if r['ms'] > 400: bad.append(f"算一次曲线 {r['ms']} ms（太慢）")
    # 渐隐：末段亮度变
    d0 = await pg.evaluate("curveData()"); f0 = await pg.evaluate("state.P.fade")
    await pg.evaluate("state.P.fade = %s; onParam(); 0" % (0 if f0 > 0.2 else 0.6)); await pg.wait_for_timeout(500); await wait_curves(pg)
    d1 = await pg.evaluate("curveData()")
    n = len(d0['light']); tail = range(int(n * 0.45), int(n * 0.75))
    diff = max(abs(d0['light'][i] - d1['light'][i]) for i in tail) if n else 0
    info['渐隐 末段亮度差'] = round(diff, 3)
    if diff < 0.05: bad.append('改渐隐，亮度曲线末段没变')
    if not d1.get('base'): bad.append('改了参数，没有留「打开时」的曲线作对照')
    # 开关、悬停不烘焙（先等上面改渐隐引起的烘焙烘完：--real 时烘焙烘完才记一次，不等会把它算到开关 / 悬停头上）
    await idle(pg); nb = await pg.evaluate("window.__bakes.length")
    await pg.evaluate("curvesShow(false); stage2.last = 0; stageTick(curDuration()); 0"); await pg.wait_for_timeout(300)
    off = await pg.evaluate("document.querySelectorAll('#tlCurves .cvl').length")
    await pg.evaluate("curvesShow(true); 0"); await wait_curves(pg)
    await pg.evaluate("panelHelp(panelRows.find(r => Array.isArray(r[1]) && r[1][0] === 'sparkRate')[0]); 0"); await pg.wait_for_timeout(200)
    hot = await pg.evaluate("[...document.querySelectorAll('#tlCurves .cvl.hot')].map(l => l.dataset.k)")
    help_ = await pg.evaluate("$('#pHelp').textContent")
    await pg.evaluate("panelHelp(null); 0")
    info['悬停火花数量'] = hot
    if off: bad.append('关掉曲线后还在')
    if hot != ['spark']: bad.append(f'悬停「火花数量」高亮的是 {hot}（应为 spark）')
    if '火花生成' not in help_: bad.append('悬停说明里没指到「火花生成」曲线')
    await pg.wait_for_timeout(800); await idle(pg)
    if await pg.evaluate("window.__bakes.length") != nb: bad.append('开关曲线 / 悬停触发了烘焙')
    # 多层：没选层 → 提示；选金锦层，改火花起势 → 上升变慢
    await open_effect(pg, 'hiki_nishiki'); await pg.wait_for_timeout(600); await idle(pg)
    await pg.evaluate("selectComboLayer(-1); stage2.last = 0; stageTick(curDuration()); curvesTick(); 0"); await pg.wait_for_timeout(600)
    hint = await pg.evaluate("$('#tlCurves') ? $('#tlCurves').textContent : ''")
    if '选' not in hint: bad.append(f'多层没选层时没有提示（{hint[:40]}）')
    li = await pg.evaluate("state.layers.findIndex(L => { const P = layerEntryOf(L).P; return +P.ignDelay > 0.5 && +P.sparkRate > 0; })")
    if li < 0: return False, '找不到金锦层'
    await pg.evaluate(f"selectComboLayer({li}); 0"); await idle(pg); await wait_curves(pg)
    a = await pg.evaluate("curveData()"); r0 = rise_time(a['spark'], a['dt'])
    await pg.evaluate("state.P.sparkRamp = 0.4; state.P.sparkRampJit = 0; onParam(); 0"); await pg.wait_for_timeout(500); await wait_curves(pg)
    b_ = await pg.evaluate("curveData()"); r1 = rise_time(b_['spark'], b_['dt'])
    x0 = await pg.evaluate("curveInfo().x0"); want = await pg.evaluate(f"+state.layers[{li}].delay / curDuration()")
    info['金锦层'] = {'起势 0 上升': r0, '起势 0.4 上升': r1, 'x0': x0, '层延迟比例': want}
    if r0 is None or r1 is None or r1 - r0 < 0.12: bad.append(f'火花起势 0.4 s，火花生成曲线上升没变慢（{r0} → {r1}）')
    if x0 is None or abs(x0 - want) > 1e-3: bad.append(f'曲线没按层延迟放到总时间上（{x0} vs {want}）')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def n1(pg):
    """4.3 面板：模块顺序、命名表的名字、随机折叠、不起作用变灰、说明条、搜索（新名 / 英文名；旧名不再认）、英文名开关、烟花特性开了才展开"""
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    lab = "(k) => { const x = panelRows.find(([r, it]) => (Array.isArray(it) ? it[0] : it.sel) === k); return x ? x[0]._lab : null; }"
    on = await pg.evaluate("({ groups: [...document.querySelectorAll('#params details.pgrp')].filter(d => !d.hidden).map(d => d.dataset.g), mods: [...document.querySelectorAll('#params details.mod')].filter(d => !d.hidden).map(d => d._mod), burn: (%s)('burn'), v0: (%s)('v0'), fx: (document.querySelector('#params details.mod[data-x]') || [...document.querySelectorAll('#params details.mod')].find(d => d._mod === '烟花特性') || {}).open })" % (lab, lab))
    info['打开'] = on
    # 模块按 Cascade 发射器从上到下（analysis/命名/模块表.json）：发射 → 运动 → 外观 → 输出
    if on['groups'][:3] != ['发射', '运动', '外观'] or '寿命' not in on['mods'] or '火花' not in on['mods'] or '阻力重力' not in on['mods']: bad.append(f"没按模块排：{on['groups']} {on['mods']}")
    for old in ('受力', '外观', '尾迹'):
        if old in on['mods']: bad.append(f'还有旧模块「{old}」')
    want = await pg.evaluate("[pnameOf('开花与燃烧', 'burn').cn, pnameOf('开花与燃烧', 'v0').cn, pnameOf('开花与燃烧', 'burn').en]")
    if on['burn'] != want[0] or on['v0'] != want[1]: bad.append(f"名字不是命名表里的：{on['burn']} / {on['v0']}（表：{want[:2]}）")
    if on['fx']: bad.append('菊没开任何烟花特性，「烟花特性」模块却默认展开')
    folded = await pg.evaluate("panelRows.filter(([r]) => r._randOf).map(([r, it]) => it[0])"); info['收起的随机'] = folded
    if 'burnJit' not in folded or 'speedJit' not in folded: bad.append(f'寿命随机 / 初速随机没收到本体下面：{folded}')
    # 随机：点开 / 收起
    r = await pg.evaluate("(() => { const b = panelRows.find(([r, it]) => it[0] === 'burn')[0], j = panelRows.find(([r, it]) => it[0] === 'burnJit')[0]; const h0 = j.hidden; b.querySelector('.rndb').click(); const h1 = j.hidden, next = b.nextElementSibling === j; return { h0, h1, next, txt: b.querySelector('.rndb').textContent, stored: !!store.get('pRandOpen', {}).burn }; })()")
    info['随机'] = r
    if not r['h0'] or r['h1'] or not r['next'] or not r['stored']: bad.append(f'寿命随机折叠不对：{r}')
    # 不起作用：菊没有点火延迟 → 点火延迟随机变灰写原因
    r = await pg.evaluate("(() => { const b = panelRows.find(([r, it]) => it[0] === 'ignDelay')[0]; if (b.querySelector('.rndb') && !pview.ropen.ignDelay) b.querySelector('.rndb').click(); const j = panelRows.find(([r, it]) => it[0] === 'ignJit')[0]; panelHelp(j); return { inert: j.classList.contains('inert'), why: j._inert, help: $('#pHelp').textContent }; })()")
    info['菊 点火延迟随机'] = {k: r[k] for k in ('inert', 'why')}
    if not r['inert'] or '点火延迟' not in (r['why'] or '') or '现在不起作用' not in r['help']: bad.append(f'菊的点火延迟随机没标不起作用：{r}')
    if 'Ignition' not in r['help'] or '·' not in r['help']: bad.append('说明条第一行不是「English · 中文」')
    # 4.3 新加的不起作用：前段亮度 = 1 时「前段结束」变灰
    r = await pg.evaluate("(() => { const x = panelRows.find(([r, it]) => it[0] === 'headDimUntil'); return x ? { inert: x[0].classList.contains('inert'), why: x[0]._inert, dim: state.P.headDim } : null; })()")
    info['菊 前段结束'] = r
    if not r or not r['inert'] or '前段亮度' not in (r['why'] or ''): bad.append(f'前段亮度 = 1 时「前段结束」没标不起作用：{r}')
    # 说明条：寿命
    h = await pg.evaluate("(() => { panelHelp(panelRows.find(([r, it]) => it[0] === 'burn')[0]); return $('#pHelp').textContent; })()")
    if not h.startswith(want[2] + ' · ' + want[0]): bad.append(f'说明条第一行：{h[:40]}')
    for w in ('调大', 'UE'):
        if w not in h: bad.append(f'说明条没有「{w}」')
    if '旧名' in h: bad.append('说明条还写「旧名」')
    # 搜索：英文名、新名字找得到；旧名字（燃烧时间）不再认
    SR = "(q) => { const i = $('#params .ptools input[type=search]'); i.value = q; i.dispatchEvent(new Event('input')); return panelRows.filter(([r]) => !r.hidden).map(([r, it]) => it[0]); }"
    for q, k in (('Lifetime', 'burn'), ('寿命', 'burn'), ('Spawn Burst', 'stars')):
        r = await pg.evaluate(SR, q)
        if k not in r: bad.append(f'搜「{q}」找不到 {k}（{r[:6]}）')
    r = await pg.evaluate(SR, '燃烧时间')
    if 'burn' in r: bad.append('搜旧名「燃烧时间」还能找到寿命（4.3 不认旧名）')
    await pg.evaluate("(() => { const i = $('#params .ptools input[type=search]'); i.value = ''; i.dispatchEvent(new Event('input')); return 0; })()")
    # 英文名开关
    await pg.evaluate("document.querySelector('#params [data-en]').click(); 0"); await pg.wait_for_timeout(200)
    en = await pg.evaluate("(%s)('burn')" % lab)
    if en != want[2]: bad.append(f'英文名开关：寿命显示「{en}」')
    await pg.evaluate("document.querySelector('#params [data-en]').click(); 0")
    # 牡丹：没有火花 → 火花寿命变灰
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('botan')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("(() => { const x = panelRows.find(([r, it]) => it[0] === 'sparkLife'); return x ? { inert: x[0].classList.contains('inert'), why: x[0]._inert, rate: state.P.sparkRate } : null; })()")
    info['牡丹 火花寿命'] = r
    if not r or not r['inert']: bad.append(f'牡丹（火花 0）的火花寿命没标不起作用：{r}')
    # 爆裂星：烟花特性一打开就展开，爆裂范围 / 速度在里面
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('crackle')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("(() => { const d = [...document.querySelectorAll('#params details.mod')].find(d => d._mod === '烟花特性'); const has = k => { const x = panelRows.find(([r, it]) => it[0] === k); return !!x && !x[0].hidden && d.contains(x[0]); }; return { open: !!d && d.open, R: has('crackleR'), V: has('crackleV') }; })()")
    info['爆裂星 烟花特性'] = r
    if not r['open'] or not r['R'] or not r['V']: bad.append(f'爆裂星的烟花特性没自动展开 / 没有爆裂范围、爆裂速度：{r}')
    # 升空尾缀：一个入口，档位在「发射器」里
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('trailM')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("(() => { const x = panelRows.find(([r, it]) => it.sel === '_trailTier'); return x ? { mod: x[0].closest('details.mod') && x[0].closest('details.mod')._mod, lab: x[0]._lab, hidden: x[0].hidden, mods: [...document.querySelectorAll('#params details.mod')].filter(d => !d.hidden).map(d => d._mod) } : null; })()")
    info['尾缀档位'] = r
    if not r or r['mod'] != '发射器' or r['hidden'] or not r['lab']: bad.append(f'升空尾缀的档位不在「发射器」里：{r}')
    elif any(m in r['mods'] for m in ('受力', '外观', '尾迹')): bad.append(f"升空尾缀还有旧模块：{r['mods']}")
    # 空白发射器（需求重梳 2026-10-03 第 6 条）：只有星；「+ 火花」加上火花模块（生成率按菊的模板）、「去掉」回到 0
    MODS = "(() => ({ mods: [...document.querySelectorAll('#params details.mod')].filter(d => !d.hidden).map(d => d._mod), add: [...document.querySelectorAll('#params [data-addmod]')].map(b => b.dataset.addmod), rate: state.P.sparkRate, pm: state.P.mods }))()"
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('blank')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r0 = await pg.evaluate(MODS)
    await pg.evaluate("document.querySelector('#params [data-addmod=\"火花\"]').click(); 0"); await idle(pg)
    r1 = await pg.evaluate(MODS)
    await pg.evaluate("[...document.querySelectorAll('#params details.mod')].find(d => d._mod === '火花').querySelector('.modrm').click(); 0"); await idle(pg)
    r2 = await pg.evaluate(MODS)
    info['空白发射器'] = {'打开': r0, '加火花': r1, '去掉': r2}
    if any(m in r0['mods'] for m in ('火花', '尾迹外形', '烟花特性')) or r0['rate'] != 0 or sorted(r0['add']) != sorted(['火花', '尾迹外形', '烟花特性']) or '星头' not in r0['mods']: bad.append(f'空白发射器打开时不对：{r0}')
    if '火花' not in r1['mods'] or not r1['rate'] or '火花' in r1['add']: bad.append(f'加「火花」不对：{r1}')
    if '火花' in r2['mods'] or r2['rate'] != 0 or '火花' not in r2['add']: bad.append(f'去掉「火花」不对：{r2}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


# N2（4.3 清理清单 B1 / B2）：每个花型的每个参数都在命名表里有名字；命名表的名字、说明和模块说明里不再出现词汇表「不用」的词
OLD_WORDS = ['炭头', '火星', '火粉', '光丝', '长尾', '小割', '离散', '燃烧时间', '炸开', '尾巴', '旧名']
N2_SCAN = r"""(OLD) => { const miss = {}, hits = [];
  for (const t of Object.keys(TYPES)) { const P = defaultsFor(t).P;
    for (const sec of SCHEMA) { if (sec.show && !sec.show(P)) continue;
      for (const it of sec.items) { const k = Array.isArray(it) ? it[0] : it.sel || it.text; if (!k) continue;
        if (!pnameOf(sec.sec, k, Array.isArray(it) ? (typeof it[1] === 'function' ? it[1](P) : it[1]) : it.label)) (miss[t] = miss[t] || new Set()).add(k); } } }
  for (const r of PNAMES) for (const f of ['cn', 'desc', 'updown', 'note', 'random', 'mcn']) { const v = r[f] || ''; for (const w of OLD) if (v.includes(w)) hits.push(`${r.key}.${f}：${w}`); }
  for (const m of (typeof PMODULES !== 'undefined' ? PMODULES : [])) for (const w of OLD) if ((m.what || '').includes(w) || m.cn.includes(w)) hits.push(`模块 ${m.cn}：${w}`);
  for (const sec of SCHEMA) for (const w of OLD) if ((sec.hint || '').includes(w)) hits.push(`节说明 ${sec.sec}：${w}`);
  const out = {}; for (const t in miss) out[t] = [...miss[t]];
  return { miss: out, hits, types: Object.keys(TYPES).length, rows: PNAMES.length }; }"""


async def n2(pg):
    r = await pg.evaluate(N2_SCAN, OLD_WORDS)
    bad = []
    if r['miss']: bad.append('没有命名表名字的参数：' + '；'.join(f'{t} {v[:4]}' for t, v in list(r['miss'].items())[:4]))
    if r['hits']: bad.append(f"还有旧词 {len(r['hits'])} 处：{r['hits'][:5]}")
    return not bad, '；'.join(bad) or f"{r['types']} 个花型的参数都有名字（命名表 {r['rows']} 行）、没有旧词"


S1_JS = r'''async () => {
  const out = {}, bad = [];
  // H16：「负数 = 默认」的参数是「用默认」勾选
  await openType('senrin'); await new Promise(r => setTimeout(r, 300));
  const rowOf = k => (panelRows.find(([r, it]) => Array.isArray(it) && it[0] === k) || [])[0];
  for (const [k, want] of [['subKeep', 0.35], ['subGrav', +state.P.grav], ['subFlash', +(state.P.flash * 0.3).toFixed(3)], ['subSpeedJit', +state.P.speedJit]]) {
    const row = rowOf(k); if (!row) { bad.push(k + ' 没有这一行'); continue; }
    const cb = row.querySelector('.adef input'), rg = row.querySelector('input[type=range]'), num = row.querySelector('.num');
    if (!cb) { bad.push(k + ' 没有「用默认」勾选'); continue; }
    const r = { on: cb.checked, dis: rg.disabled, min: +rg.min, shown: +num.value };
    cb.checked = false; cb.dispatchEvent(new Event('change')); r.off = { v: state.P[k], dis: rg.disabled };
    cb.checked = true; cb.dispatchEvent(new Event('change')); r.back = state.P[k];
    out[k] = r;
    if (!(r.on && r.dis && r.min >= 0)) bad.push(k + ' 打开时没勾上 / 滑杆没变灰 / 下限还是负数 ' + JSON.stringify(r));
    if (Math.abs(r.shown - want) > 0.011 * Math.max(1, Math.abs(want))) bad.push(`${k} 勾着时显示 ${r.shown}，默认的实际值是 ${want}`);
    if (!(Math.abs(r.off.v - want) < 1e-6 && !r.off.dis)) bad.push(`${k} 去掉勾后 = ${r.off.v}（应从默认实际值 ${want} 开始、滑杆可调）`);
    if (r.back !== -1) bad.push(`${k} 再勾上后 = ${r.back}（应存 -1）`);
  }
  // H12：只剩 GPU 模拟内核
  out.engineSelect = !!document.querySelector('#x-engine');
  out.stored = storedParams({ type: 'kiku', engine: 'cpu', renderVer: 40 }).engine;
  importParams({ params: { type: 'kiku', stars: 120 } }, 'old.json'); out.imported = state.P.engine;
  if (out.engineSelect) bad.push('还有「模拟内核」选择');
  if (out.stored !== 'gpu' || out.imported !== 'gpu') bad.push(`存档 / 旧母版没换成 GPU（${out.stored} / ${out.imported}）`);
  // E11③：物理尾缀过顶后按下落段（tanh）算，速度不超过终端速度、位置连续
  const tp = Object.keys(TYPES).find(t => TYPES[t].p && TYPES[t].p.form === 'phys');
  if (tp) {
    const P = { ...defaultsFor(tp).P, type: tp }, pt = new PhysTrail(P), ta = pt.ba / pt.bw, vt = Math.sqrt(G / P.phK);
    const a = pt.shell(ta - 1e-4), b = pt.shell(ta + 1e-4), c = pt.shell(ta + 40);
    out.phys = { type: tp, ta: +ta.toFixed(3), dz: +(b.z - a.z).toFixed(5), vzLate: +c.vz.toFixed(2), vt: +vt.toFixed(2) };
    if (Math.abs(b.z - a.z) > 0.01) bad.push('物理尾缀到顶前后位置不连续 ' + JSON.stringify(out.phys));
    if (!(c.vz < 0 && Math.abs(c.vz) <= vt * 1.001)) bad.push('物理尾缀过顶 40 s 后下落速度超过终端速度 ' + JSON.stringify(out.phys));
    out.lateWarn = physStats({ ...P, phT: +(ta + 1).toFixed(2) }).includes('开花晚于到顶');
    if (!out.lateWarn) bad.push('开花晚于到顶没有提示（H15②）');
  } else bad.push('找不到物理尾缀模板');
  return { ok: !bad.length, bad, out };
}'''


async def s1(pg):
    """4.3.2 收尾：「用默认」勾选（H16）、只剩 GPU 模拟内核（H12）、物理尾缀过顶后弹道 + 开花晚于到顶提示（E11③ / H15②）"""
    r = await pg.evaluate(S1_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)


async def s2(p, b):
    """4.3.3（用户 10-04 11:56）：新建效果 → 选牡丹模板 → 加引菊 → 锦的引菊层：打开就在第 1 层的参数上（不是「整体」）；
    每层的模拟参数能改，改的是这个效果自己的一份（原条目、原效果不变）；保存再打开还在"""
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('检查新建' if d.type == 'prompt' else None)))
    await pg.goto(HTML, wait_until='domcontentloaded', timeout=0); await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
    await pg.evaluate(REC if REAL else FAKE); await pg.evaluate('state.playing = false')
    bad, info = [], {}
    rows = "(() => [...document.querySelectorAll('#params .sl')].filter(r => r.offsetParent && !r.querySelector('input[type=range]').disabled).map(r => r._lab || r.querySelector('.k').textContent))()"
    await pg.click('#newRecipe'); await pg.wait_for_timeout(500)
    await pg.evaluate("(() => { pk.cat = 'all'; pkRender(); const c = [...document.querySelectorAll('#pkGrid .pk-card')].find(x => x.querySelector('.nm').textContent.startsWith('牡丹')); c.click(); return 0; })()")
    await pg.wait_for_timeout(1500); await idle(pg)
    info['新建后'] = await pg.evaluate(f"({{ sel: state.comboSel, type: state.P.type, n: state.layers.length, rows: {rows}.length }})")
    if info['新建后']['sel'] != 0 or info['新建后']['type'] != 'botan': bad.append(f"新建后没停在第 1 层的参数上（{info['新建后']}）")
    if info['新建后']['rows'] < 8: bad.append(f"新建后看得到的参数只有 {info['新建后']['rows']} 个")
    await pg.evaluate("(() => { $('#myAdd').click(); setTimeout(() => { pk.cat = 'fx'; pkRender(); const c = [...document.querySelectorAll('#pkGrid .pk-card')].find(x => x.textContent.includes('引菊') && x.textContent.includes('HN2-O')); c.click(); }, 50); return 0; })()")
    await pg.wait_for_timeout(2500); await idle(pg)
    o0 = await pg.evaluate("replicaPM('HN2-O').P.stars")
    info['加层后'] = await pg.evaluate(f"({{ sel: state.comboSel, n: state.layers.length, own: state.layers.map(L => !!(layerEntryOf(L) || {{}}).own), rows: {rows}.length, stars: state.P.stars }})")
    if info['加层后']['sel'] != 1 or not all(info['加层后']['own']): bad.append(f"加层后没选新层或层不是自己的一份（{info['加层后']}）")
    await pg.evaluate("state.P.stars = 77; refreshPanelValues(); onParam(); 0"); await pg.wait_for_timeout(600); await idle(pg)
    info['改星数'] = await pg.evaluate("({ layer: layerEntryOf(state.layers[1]).P.stars, orig: replicaPM('HN2-O').P.stars, other: state.layers.map(L => layerEntryOf(L).P.stars) })")
    if info['改星数']['layer'] != 77 or info['改星数']['orig'] != o0: bad.append(f"改星数没改到这一层或改到了原条目（{info['改星数']}，原来 {o0}）")
    await pg.evaluate("mySave(false)"); await pg.wait_for_timeout(800)
    rid = await pg.evaluate("lib.my.id")
    await pg.evaluate(f"openType('kiku')"); await pg.wait_for_timeout(1000); await idle(pg)
    await pg.evaluate(f"openMyEffect('{rid}')"); await pg.wait_for_timeout(1500); await idle(pg)
    info['再打开'] = await pg.evaluate("({ sel: state.comboSel, stars: state.layers.map(L => layerEntryOf(L).P.stars), label: typeof srcLabel === 'function' ? srcLabel() : '' })")
    if info['再打开']['stars'][1] != 77: bad.append(f"保存再打开第 2 层星数不是 77（{info['再打开']}）")
    if 'AI 版' in info['再打开']['label']: bad.append(f"自己的效果写着「{info['再打开']['label']}」")
    if errs: bad.append('页面错误：' + errs[0][:150])
    await ctx.close()
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


S3_JS = r"""async () => {
  // 4.3.4 后（用户 10-04 13:26「参数栏好像丢了一部分，尾缀火星什么都不见了」）：打开一个花型，第一眼的参数要看得见
  const out = {}, bad = [];
  // 收起的 <details> 里的东西 offsetParent 不一定是 null（新版 Chrome 用 content-visibility 藏），按祖先 details 是否展开判断
  const shown = el => { if (!el || !el.offsetParent) return false; for (let a = el.parentElement, c = el; a; c = a, a = a.parentElement) { if (a.hidden) return false; if (a.tagName === 'DETAILS' && !a.open && c.tagName !== 'SUMMARY') return false; } return true; };
  const vis = () => [...document.querySelectorAll('#params .sl')].filter(shown).length;
  const modVis = m => [...document.querySelectorAll('#params details.mod')].some(d => d._mod === m && shown(d.querySelector('summary')));
  for (const [t, need, mods] of [['kiku', 15, ['星头', '火花', '初速']], ['blank', 8, ['星头', '初速']], ['trailM', 10, ['白热火花', '金火花', '橙色火花', '丝状火花']]]) {
    await openType(t); await new Promise(r => setTimeout(r, 400));
    const n = vis(), m = Object.fromEntries(mods.map(x => [x, modVis(x)]));
    out[t] = { sliders: n, mods: m, groups: [...document.querySelectorAll('#params details.pgrp')].filter(g => !g.hidden).map(g => g.dataset.g + (g.open ? '▾' : '▸')) };
    if (n < need) bad.push(`${t} 打开后看得见的参数只有 ${n} 个（应 ≥ ${need}）`);
    for (const [k, v] of Object.entries(m)) if (!v) bad.push(`${t} 的「${k}」模块看不见`);
    if (t === 'blank') { const b = document.querySelector('#blankAdd [data-addmod="火花"]'); out.blankAdd = shown(b); if (!out.blankAdd) bad.push('空白发射器的「+ 火花」看不见'); }
  }
  return { ok: !bad.length, bad, out };
}"""


async def s3(pg):
    """4.3.4 后：打开菊 / 空白发射器 / 升空尾缀，第一眼的参数、模块（尾缀各层的火花）、空白发射器的「+ 火花」都看得见（分组不能默认全收起）"""
    await pg.evaluate("store.set('pModOpen', {}); 0")     # 没有存过展开状态的新用户
    r = await pg.evaluate(S3_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)


async def main():
    global HTML, REAL
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--out', default=''); ap.add_argument('--html', default=''); ap.add_argument('--real', action='store_true')
    a = ap.parse_args(); only = set(x for x in a.only.split(',') if x); REAL = a.real
    if a.html: HTML = pathlib.Path(a.html).resolve().as_uri() + '?fast'
    from playwright.async_api import async_playwright
    res = []
    async with async_playwright() as p:
        b = await launch_async(p)
        for name, fn, own in [('A1', a1, False), ('A2', a2_same, True), ('A3', a3, False), ('A4', a4, False), ('A5', a5, False), ('A6', a6, False), ('A7', a7, True), ('P1', p1, False), ('U1', u1, False), ('B1', b1, False), ('V1', v1, False), ('X1', x1, False), ('G1', g1, False), ('K1', k1, False), ('K2', k2, False), ('R1', r1, False), ('C1', c1, False), ('N1', n1, False), ('N2', n2, False), ('S1', s1, False), ('S2', s2, True), ('S3', s3, False), ('L1', l1, True)]:
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
