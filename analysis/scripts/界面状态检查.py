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
  P1 4.4 参数面板按发射器分（用户 10-04 16:17 / 17:13）：发射器标签（效果 / 星 / 火花 / … / 输出 / 全部），打开菊默认只看「星」（≤ 30 项）；
     每一行都在发射器表里、没有「更多」；星的寿命叫「燃烧时间」；搜索 / 只看改过的跨发射器、标签上标改过几项；点标签换页、记住；
     说明条点参数名才换（鼠标移过去不换）；多层时每一层的参数也一样
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
  S1 4.3.2 收尾：子花那几个「负数 = 默认」的参数是联动（H16；4.9.0 起是链条）；只剩 GPU 模拟内核、存档 / 旧母版的 CPU 换成 GPU（H12）；物理尾缀过顶后按下落段算、开花晚于到顶有提示（E11③ / H15②）
  S2 4.3.3 新建效果：打开就在第 1 层的参数上；加的层是这个效果自己的一份，改了不动原条目；保存再打开还在；不写「AI 版」
  S3 4.4：打开菊 / 空白发射器 / 升空尾缀，默认页的参数、各发射器标签（星 / 火花 / 尾缀各层…）、空白发射器的「+ 火花」看得见；模块开合、选的标签记得住
  N1 4.4 面板：发射器 → 模块的顺序、短名来自发射器表、英文名开关、「××随机」收在本体参数的「随机」下（点开才出、记住）、
     不起作用的参数变灰写原因（菊：点火延迟随机；牡丹：火花寿命）、搜索认短名 / 全名 / 英文名 / 模块名、说明条第一行「English · 中文 — 说明」、
     爆裂星的「爆裂」发射器、尾缀档位在「效果 › 规格」、空白发射器「+ 火花」/「去掉」
  S4 4.4：旧搜索 / 只看改过的时点发射器标签 = 清掉筛选、换到那一页，不改配方；「全部」把发射器都排出来
  E1 5.0 第 2 步（4.7.0）：一套物理——空中类火花按实际年龄冷却、结尾等火花自然灭完，「结尾」「冷却方式」开关删了；模板序列时长盖到火花灭完；缺省固定机位 + 匀速帧（4.4.3 的火花闪烁频率照查）
  X2 4.4.2：单层效果（牡丹）也有导出方案（4.4.3 加：点灭星的光点 Color Over Life 是方波、菊没有）：PC 序列 / 单束 / GPU 光点 / 不出、手机 序列 / 不出；选光点后 cascade.json 是 GPU 光点、引擎回放画光点；多层效果的层里不显示（在层页头选）
  N3 排查第 1 步：SCHEMA ↔ 默认值 ↔ 参数名称表 ↔ 发射器表 ↔ INERT / RAND_OF / SPARK_KEYS / PHASE_KEY / TIMING_KEYS / BLANK_MODS 对得上
  W2 4.5.3：左栏没有「我的版本」「已通过」（通过的进「我的效果」最上面）、我的效果每项没有删除；出点提示 + 一键清除；没烘时时间轴按新时长；远段面片上移
  R6 4.5.1 升空尾缀 RT6 近段 + 远段：缺省关 = RT5；开了贴图有粗 / 中 / 细、GPU 按档预算（上限一起降、降掉的回贴图）、贴图 + GPU = 出生率；交接权重相加 = 1；闪烁层；远看直径光量不变；
     TrailFar 导出、没有 RiseFade、命名 Loop + Far；近段贴图曝光 k → RiseLoop Color Over Life × 1 / k²；面板；4.5.2 分层看（近段 / 远段 / 每个 GPU 层开关、双击只看、全部恢复）
  R5 4.4.5 升空尾缀 RT5 选项：缺省旧做法；物理弹道到设定高度、第 1 秒减速够猛、星头光晕跟弹道（Velocity Over Life）；GPU 兼容（无 Acceleration、≤ 2 个 Initial Velocity）、
     GPU 粒子上限、细 / 中火花进贴图、H4 新口径和温度偏移无关；循环层长度起步不伸到发射点以下；面板「弹道」在星头 › 弹道、选物理后升空时间藏起
  W1 4.5.0 工作台快改：时间轴无发射器行 / 曲线、精简布局收层轨道；时长跟随 / 粘连开关；AI 效果保存 = 派生成我的效果、能加层；存模板 → 花型库能打开；
     删除不弹框、能撤销；AI 效果从左栏隐藏；只还原一个发射器、回到模板默认
  W3 4.5.8（9 处 bug + 5 条小修，用户 10-05 21:40 / 21:55）：删效果撤销连版本一起回来；连删两个都能撤销；删层进 Ctrl+Z、不弹框；删当前模板后顶栏不剩「更新模板」；
     多层某层新参数烘焙失败时导出拦住；显示强度 0 导出也是 0；关自动烘焙时同一批星的层马上同步；内置效果「暂时不联动」不带进我的效果；组合说明按最终贴图写；
     贴图结尾全黑被裁掉要写明；换版本前先存草稿；浏览器存不进去要报错（读坏了先备份）；尾缀 S / M / L 模板导出 GPU 安全写法；子花继承标签写对
  W4 4.6.0（5.0 第 1 步）：每个发射器都列 9 个标准模块（没参数的写跟谁 / 为什么没有）；爆裂 / 开花闪光 / 子花 / 点灭 / 余烬 / 分叉火花 / 辉星以前写死的数变成参数且真起作用；
     「＋ 加发射器」：加、改、在模拟里生成光点 / 星、曲线几行时刻→值、去掉；「游戏内大小」按真实米数（四尺玉 1000 m 占 1/3，别的按真实大小）
  W5 4.8.0（5.0 第 3 步一部分）：星 / 子星 / 火花 / 余烬 / 分叉火花 / 爆裂 / 开花闪光都有「大小 / 亮度随寿命」曲线行（几行 时刻:倍数），空 = 不乘；填了真起作用（模拟里的星头、小闪、闪光；火花着色器的曲线参数接上）
  W6 4.8.1（走查 20-05）：导出可以取消（进度条旁「取消」，上次结果还在）；导出没做完再点导出不会叠第二个
  W7 4.9.0（5.0 第 3 步，Q1「物理给默认，每个值都能改」+ 参数表「删」）：联动的值都有链条——接着时灰字显示算出来的值、直接改就断开存你填的数、点链条接回去存哨兵值，
     模拟按哨兵值算出来和按算出来的数填进去一样；旧（待删）参数这个效果没用上时收进模块底下的「旧（待删）」开关、用着的照常显示带「旧」，搜索找得到；所有花型打开时参数值不变
  W8 4.9.1（交互宪章 5 身份条）：顶栏有名字、来源、版本；改了参数标「● 没保存」；自己的效果导出后标「素材包 ✓」、再改标「素材包要重导」；
     AI 待验收效果（就绪的）标「素材包 ✓」；自动烘焙关时改参数，顶栏写「贴图是旧的」不写「烘焙中…」
  W9 4.9.2（梳理 6.2 / 6.4、隐性耦合 T01）：改一个时刻、别的时刻被规则推着走时提示「跟着变了：× a → b s」；数值超出滑杆范围时数值框标出来并写明照样起作用；
     单束导出菜单写明贴图里的星不受力、随机关了；预览设置里能开关「预览泛光（引擎里没有）」，不触发烘焙
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


# 4.9.4：起名 / 改名 / 确认换成应用内对话框（askSaveName / askText / askConfirm），不再弹浏览器原生框。
# 检查里直接替换成自动回答：名字用 window.__ans（没设就用对话框里的默认名），确认一律「是」。原生 dialog 监听留着兜底。
def ask_stub(ans=None):
    a = json.dumps(ans, ensure_ascii=False) if ans is not None else 'null'
    return "window.__ans = " + a + "; window.askSaveName = async (t, n, init) => (window.__ans != null ? window.__ans : init); window.askConfirm = async () => true; 0"


async def fresh(p, b):
    ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: asyncio.ensure_future(d.accept('检查版本')))
    await pg.add_init_script("window.requestAnimationFrame = () => 0;")
    await pg.goto(HTML, wait_until='load', timeout=0)
    await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
    await pg.evaluate(REC if REAL else FAKE)
    await pg.evaluate(ask_stub('检查版本'))
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
            await pg.evaluate(ask_stub('检查版本'))
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
            await pg.evaluate(ask_stub(answers[0]))
            if rnd == 0:
                await pg.evaluate("(() => { window.__opening = true; $('#newRecipe').click(); const c = [...document.querySelectorAll('#pkGrid .pk-card')].find(x => x.textContent.includes('菊') && !x.textContent.includes('锦冠')); c.click(); setTimeout(() => window.__opening = false, 2500); return 0; })()")
                await idle(pg); await pg.wait_for_timeout(800); await idle(pg)
                r0 = await pg.evaluate("({ key: lib.key, n: state.layers.length, name: $('#abName').textContent })")
                if not str(r0['key']).startswith('my:') or r0['n'] != 1: return False, '新建没打开我的效果：' + json.dumps(r0, ensure_ascii=False)
                # 加一层：现有效果的层（引菊 → 锦 的第 1 层）
                await pg.evaluate("(() => { window.__opening = true; $('#myAdd').click(); setTimeout(() => { pk.cat = 'fx'; pkRender(); const c = [...document.querySelectorAll('#pkGrid .pk-card')].find(x => x.textContent.includes('引菊')); c.click(); setTimeout(() => window.__opening = false, 2500); }, 50); return 0; })()")
                await idle(pg); await pg.wait_for_timeout(800); await idle(pg)
                answers[0] = '中心'
                await pg.evaluate("(async () => { window.__ans = '中心'; await myRenameLayer(0); return 0; })()")
                await pg.evaluate("(() => { window.__opening = true; Promise.resolve(myDupLayer(0)).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
                # 改第 1 层（中心）的星数：复制出来的第 2 层不能跟着变
                await set_layer_param(pg, 0, 'stars', 123); await idle(pg)
                indep = await pg.evaluate("[layerEntryOf(state.layers[0]).P.stars, layerEntryOf(state.layers[1]).P.stars]")
                # 勾「同一批星」：第 1、2 层
                await pg.evaluate("selectComboLayer(0); mySetLinked(0, 1, true); 0"); await idle(pg)
                await set_layer_param(pg, 0, 'v0', 77); await idle(pg)
                linked = await pg.evaluate("[layerEntryOf(state.layers[0]).P.v0, layerEntryOf(state.layers[1]).P.v0]")
                answers[0] = '金锦冠测试'
                await pg.evaluate("window.__ans = '金锦冠测试'; selectComboLayer(-1); wbSave(false).then(() => 0)"); await pg.wait_for_timeout(800)
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
            await pg.evaluate(ask_stub('闭环检查'))     # 4.5.0：保存 = 存成我的效果（起名对话框直接用这个名）
            if rnd == 0:
                await open_effect(pg, 'hiki_nishiki')
                ai = await pg.evaluate("layerEntryOf(state.layers[0]).P.burn"); want = round(ai + 0.1, 3)
                await set_layer_param(pg, 0, 'burn', want)
                await pg.evaluate("selectComboLayer(1); 0")              # 改完马上切层（A4 那条路）
                await idle(pg); await pg.wait_for_timeout(1500); await idle(pg)
                baked = await pg.evaluate("layerEntryOf(state.layers[0]).bake.srcP.burn")
                await pg.evaluate("selectComboLayer(-1); wbSave(true).then(() => 0)"); await idle(pg)
                sid = await pg.evaluate("lib.my ? lib.my.id : null")
                if not sid: return False, '保存没有成功（4.5.0：AI 效果保存 = 存成我的效果）'
            else:
                await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openMyEffect('{sid}')).finally(() => window.__opening = false); return 0; }})()")
                await idle(pg); await pg.wait_for_timeout(1500); await idle(pg)
                got = await pg.evaluate("({ burn: layerEntryOf(state.layers[0]).P.burn, src: lib.my ? 'mine' : wb.src.kind, key: lib.key })")
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
                await pg.evaluate(f"(() => {{ myDelete('{sid}'); return 0; }})()")   # 收拾：删掉检查用的效果
                why = '；'.join(bad) or f"版本 burn {got['burn']} ✓、切层后贴图按新参数 ✓、{len(tex)} 张贴图按命名规则 ✓、PC + 手机 cascade ✓、缩放抖动 {pulse} ✓、取景收紧 {files['fitted']}"
                return not bad, why + ('' if not errs else ' · 页面错误：' + errs[0][:200])
    finally:
        await ctx.close()


# 4.3：只有一个面板（没有新旧开关）。「看得见」= 没被藏、所在的模块 / 「更多」都是打开的（关着的 <details> 里的行 offsetParent 也不是 null，不能用它判断）
P1_SHOWN = r"""const shown = el => { if (!el || el.hidden || el.closest('[hidden]')) return false; for (let d = el.parentElement && el.parentElement.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) if (!d.open) return false; return true; };"""
P1_STATE = r"""(() => { const host = $('#params'); """ + P1_SHOWN + r"""
  const secs = [...host.querySelectorAll('details.sec')];
  const rows = panelRows.filter(([r]) => r._lab != null && shown(r)), labs = rows.map(([r, it]) => ({ k: Array.isArray(it) ? it[0] : it.sel || it.text, t: r._lab, e: r._x && r._x.e }));
  const on = host.querySelector('.etabs .on');
  return { tools: !!host.querySelector('.ptools input[type=search]') && !!host.querySelector('.ptools input[type=checkbox]'), toggle: !!host.querySelector('[data-v43]'),
    tabs: [...host.querySelectorAll('.etabs [data-e]')].filter(b => !b.hidden).map(b => b.dataset.e), on: on ? on.dataset.e : '',
    egrps: [...host.querySelectorAll('section.egrp')].filter(g => !g.hidden).map(g => g.dataset.g),
    orphan: secs.filter(d => !d.closest('section.egrp')).map(d => d.querySelector('summary').textContent),
    unmapped: panelRows.filter(([r]) => r._x && !(r._x.i < 9999)).map(([r, it]) => Array.isArray(it) ? it[0] : it.sel || it.text),
    more: host.querySelectorAll('details.more').length, hintsShown: [...host.querySelectorAll('details.sec > p.hint')].filter(p => shown(p)).length,
    labs, long: labs.filter(x => x.t.length > 12).map(x => x.t), noName: panelRows.filter(([r, it]) => r._lab != null && !r._nm).map(([r, it]) => Array.isArray(it) ? it[0] : it.sel || it.text) }; })()"""
P1_SEARCH = r"""(q) => { const i = $('#params .ptools input[type=search]'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })); """ + P1_SHOWN + r"""
  return panelRows.filter(([r, it]) => Array.isArray(it) && shown(r)).map(([r, it]) => it[0]); }"""
P1_CHANGED = r"""(on) => { const c = $('#params .ptools input[type=checkbox]'); if (c.checked !== on) c.click(); """ + P1_SHOWN + r"""
  return panelRows.filter(([r, it]) => Array.isArray(it) && shown(r)).map(([r, it]) => it[0]); }"""


async def p1(pg):
    """4.4 参数面板：发射器标签（效果 / 星 / 火花 / … / 输出 / 全部）一次看一个；每一行都在发射器表里；没有「更多」；搜索 / 只看改过的跨发射器"""
    bad, info = [], {}
    await pg.evaluate("(() => { store.set('pEmitTab', {}); pview.ready = false; pviewInit(); window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    st = await pg.evaluate(P1_STATE)
    info['标签'] = st['tabs']; info['默认'] = st['on']
    if not st['tools']: bad.append('没有搜索框 / 「只看改过的」')
    if st['toggle']: bad.append('还有新旧面板开关（4.3 只有一个面板）')
    if st['tabs'][:3] != ['效果', '星', '火花'] or st['tabs'][-2:] != ['输出', '全部']: bad.append(f"发射器标签不对：{st['tabs']}")
    if st['on'] != '星' or st['egrps'] != ['星']: bad.append(f"打开菊默认不是只看「星」：标签 {st['on']}，显示 {st['egrps']}")
    if st['orphan']: bad.append(f"没归进发射器的模块：{st['orphan'][:4]}")
    if st['unmapped']: bad.append(f"发射器表里没有的参数：{st['unmapped'][:5]}")
    if st['more']: bad.append(f"还有「更多」{st['more']} 处（4.4 不再藏参数）")
    if st['hintsShown']: bad.append(f"模块说明默认展开了 {st['hintsShown']} 段")
    if st['long']: bad.append(f"参数名太长 {len(st['long'])} 个：{st['long'][:3]}")
    if st['noName']: bad.append(f"参数没有命名表里的名字：{st['noName'][:5]}")
    info['第一眼参数'] = len(st['labs']); info['参数名平均字数'] = round(sum(len(x['t']) for x in st['labs']) / max(1, len(st['labs'])), 1)
    if len(st['labs']) > 30: bad.append(f"打开菊「星」一页就有 {len(st['labs'])} 项（要 ≤ 30）")
    if any(x['e'] != '星' for x in st['labs']): bad.append(f"「星」一页里有别的发射器的参数：{[x for x in st['labs'] if x['e'] != '星'][:3]}")
    burn = next((x['t'] for x in st['labs'] if x['k'] == 'burn'), None); info['星的寿命叫'] = burn
    if burn != '燃烧时间': bad.append(f'星的寿命显示「{burn}」（用户 10-04 改回「燃烧时间」）')
    if not bad:
        r = await pg.evaluate(P1_SEARCH, '粗细')
        if 'tailWidth' not in r or 'stars' in r: bad.append(f'搜「粗细」（在火花发射器里，当前看的是星）结果不对：{r[:6]}')
        info['搜粗细'] = r
        r = await pg.evaluate(P1_SEARCH, '末段生成')
        if 'sparkRateEnd' not in r: bad.append(f'搜「末段生成」没找到末段生成率：{r[:6]}')
        r = await pg.evaluate(P1_SEARCH, '')
        if 'stars' not in r or 'sparkRateEnd' in r: bad.append(f'清空搜索后没回到「星」一页：{r[:8]}')
        r = await pg.evaluate(P1_CHANGED, True)
        if r: bad.append(f'没改过任何参数，「只看改过的」还显示 {r[:4]}')
        await pg.evaluate("(() => { state.P.sparkRateEnd = (+state.P.sparkRateEnd || 0) + 0.2; onParam(); return 0; })()"); await idle(pg)
        r = await pg.evaluate(P1_CHANGED, True)
        if r != ['sparkRateEnd']: bad.append(f'改了末段生成率后「只看改过的」显示 {r[:4]}（应为 sparkRateEnd，跨发射器也要翻出来）')
        await pg.evaluate(P1_CHANGED, False)
        n = await pg.evaluate("(+(document.querySelector('#params .etabs [data-e=\"火花\"] .et-n') || {}).textContent || 0)")
        if n != 1: bad.append(f'「火花」标签上没标改过 1 项（{n}）')
        # 点标签换发射器
        r = await pg.evaluate("(() => { document.querySelector('#params .etabs [data-e=\"火花\"]').click(); " + P1_SHOWN + " return { on: document.querySelector('#params .etabs .on').dataset.e, rows: panelRows.filter(([r, it]) => Array.isArray(it) && shown(r)).map(([r, it]) => it[0]), saved: store.get('pEmitTab', {}).aerial }; })()")
        info['点火花'] = {'on': r['on'], 'n': len(r['rows']), 'saved': r['saved']}
        if r['on'] != '火花' or 'sparkSize' not in r['rows'] or 'stars' in r['rows'] or r['saved'] != '火花': bad.append(f'点「火花」标签不对：{info["点火花"]}')
        # 4.5.0 说明（用户 10-05 #9）：停 1.5 s 才淡入、移开消失；点参数名钉住，移开不消失，Esc 解除
        hv = "(() => { const h = $('#pHelp'); return { on: h.classList.contains('on'), pin: h.classList.contains('pinned'), txt: h.classList.contains('on') ? h.textContent : '' }; })()"
        nm = "panelRows.find(([r, it]) => it[0] === 'tailWidth')[0].querySelector('.k')"
        await pg.evaluate(f"(() => {{ helpHide(true); {nm}.dispatchEvent(new PointerEvent('pointerenter')); }})()"); await pg.wait_for_timeout(500)
        a = await pg.evaluate(hv); await pg.wait_for_timeout(1300); b = await pg.evaluate(hv)
        await pg.evaluate(f"{nm}.dispatchEvent(new PointerEvent('pointerleave'))"); await pg.wait_for_timeout(500); c = await pg.evaluate(hv)
        await pg.evaluate(f"{nm}.click()"); await pg.evaluate(f"{nm}.dispatchEvent(new PointerEvent('pointerleave'))"); await pg.wait_for_timeout(500); d = await pg.evaluate(hv)
        await pg.keyboard.press('Escape'); e = await pg.evaluate(hv)
        info['说明'] = {'0.5s': a['on'], '1.8s': b['on'], '移开': c['on'], '点了移开': [d['on'], d['pin']], 'Esc': e['on']}
        if a['on']: bad.append('鼠标停 0.5 s 说明就出来了（应停 1.5 s）')
        if not b['on'] or '横向散开' not in b['txt']: bad.append(f'鼠标停 1.8 s 说明没出来或不是「粗细」的：{b}')
        if c['on']: bad.append('鼠标移开说明没消失')
        if not d['on'] or not d['pin']: bad.append(f'点参数名没钉住（移开就没了）：{d}')
        if e['on']: bad.append('钉住后按 Esc 没关掉')
        await pg.evaluate("selectEmitTab('星'); 0")
    if not bad:     # 多层效果：选中某一层时右栏也是同一套
        await open_effect(pg, 'hiki_nishiki')
        await pg.evaluate("(() => { selectComboLayer(1); return 0; })()"); await idle(pg)
        st = await pg.evaluate(P1_STATE)
        if not st['tools'] or st['orphan'] or not st['egrps'] or st['noName']: bad.append(f"多层效果里第 2 层的面板不对：工具 {st['tools']}、没归类 {st['orphan'][:3]}、没名字 {st['noName'][:3]}")
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
    # 4.5.0（用户 10-05 #14）：打开效果不换视图，页面打开时是实时模拟（4.3 曾让候选一打开就切引擎回放）
    v = await pg.evaluate("state.view"); info['打开候选时的视图'] = v
    if v != 'live': bad.append(f'打开待验收候选后不在实时模拟（{v}）')
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


async def n1(pg):
    """4.4 面板：发射器 → 模块的顺序、短名来自发射器表、随机折叠、不起作用变灰、说明条、搜索（短名 / 全名 / 英文名 / 模块名）、英文名开关、空白发射器加 / 去掉"""
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    await pg.evaluate("selectEmitTab('全部'); 0")
    lab = "(k) => { const x = panelRows.find(([r, it]) => (Array.isArray(it) ? it[0] : it.sel) === k); return x ? x[0]._lab : null; }"
    on = await pg.evaluate("({ emit: [...document.querySelectorAll('#params section.egrp')].filter(d => !d.hidden).map(d => d.dataset.g), mods: [...document.querySelectorAll('#params details.mod')].filter(d => !d.hidden).map(d => d._key), burn: (%s)('burn'), v0: (%s)('v0') })" % (lab, lab))
    info['打开'] = {'emit': on['emit']}
    if on['emit'][:3] != ['效果', '星', '火花'] or on['emit'][-1:] != ['输出']: bad.append(f"发射器顺序不对：{on['emit']}")
    for k in ('星›生成', '星›初速', '星›受力', '星›寿命', '火花›生成', '火花›寿命', '火花›受力'):
        if k not in on['mods']: bad.append(f'没有模块「{k}」')
    if on['mods'].index('星›生成') > on['mods'].index('星›寿命'): bad.append('星的模块顺序不对（生成应在寿命前）')
    for old in ('阻力重力', '烟花特性', '尾迹外形'):
        if any(m.endswith('›' + old) for m in on['mods']): bad.append(f'还有旧模块「{old}」')
    want = await pg.evaluate("[PEMIT.P[pnameOf('开花与燃烧', 'burn').id][2], PEMIT.P[pnameOf('开花与燃烧', 'v0').id][2], pnameOf('开花与燃烧', 'burn').en]")
    if on['burn'] != want[0] or on['v0'] != want[1] or want[0] != '燃烧时间': bad.append(f"名字不是发射器表里的：{on['burn']} / {on['v0']}（表：{want[:2]}）")
    # 所有短名和名称表全名不一样的行（例：火花 › 寿命 › 「寿命」，全名「火花寿命」）：面板上必须是短名
    sh = await pg.evaluate("(() => { const out = { n: 0, bad: [] }; for (const [r, it] of panelRows) { const nm = r._nm, x = nm && nm.id ? PEMIT.P[nm.id] : null; if (!x || !x[2] || x[2] === nm.cn) continue; out.n++; if (r._lab !== x[2]) out.bad.push([nm.key, r._lab, x[2]]); } return out; })()")
    info['短名'] = sh['n']
    if sh['n'] < 10 or sh['bad']: bad.append(f"面板名字不是发射器表的短名（{len(sh['bad'])} / {sh['n']}）：{sh['bad'][:4]}")
    folded = await pg.evaluate("panelRows.filter(([r]) => r._randOf).map(([r, it]) => it[0])"); info['收起的随机'] = folded
    if 'burnJit' not in folded or 'speedJit' not in folded: bad.append(f'燃烧时间随机 / 初速随机没收到本体下面：{folded}')
    r = await pg.evaluate("(() => { const b = panelRows.find(([r, it]) => it[0] === 'burn')[0], j = panelRows.find(([r, it]) => it[0] === 'burnJit')[0]; const h0 = j.hidden; b.querySelector('.rndb').click(); const h1 = j.hidden, next = b.nextElementSibling === j; return { h0, h1, next, txt: b.querySelector('.rndb').textContent, stored: !!store.get('pRandOpen', {}).burn }; })()")
    info['随机'] = r
    if not r['h0'] or r['h1'] or not r['next'] or not r['stored']: bad.append(f'燃烧时间随机折叠不对：{r}')
    r = await pg.evaluate("(() => { const b = panelRows.find(([r, it]) => it[0] === 'ignDelay')[0]; if (b.querySelector('.rndb') && !pview.ropen.ignDelay) b.querySelector('.rndb').click(); const j = panelRows.find(([r, it]) => it[0] === 'ignJit')[0]; panelHelp(j); return { inert: j.classList.contains('inert'), why: j._inert, help: $('#pHelp').textContent }; })()")
    info['菊 点火延迟随机'] = {k: r[k] for k in ('inert', 'why')}
    if not r['inert'] or '点火延迟' not in (r['why'] or '') or '现在不起作用' not in r['help']: bad.append(f'菊的点火延迟随机没标不起作用：{r}')
    if 'Ignition' not in r['help'] or '·' not in r['help']: bad.append('说明条第一行不是「English · 中文」')
    r = await pg.evaluate("(() => { const x = panelRows.find(([r, it]) => it[0] === 'headDimUntil'); return x ? { inert: x[0].classList.contains('inert'), why: x[0]._inert, dim: state.P.headDim } : null; })()")
    info['菊 前段结束'] = r
    if not r or not r['inert'] or '前段亮度' not in (r['why'] or ''): bad.append(f'前段亮度 = 1 时「前段结束」没标不起作用：{r}')
    h = await pg.evaluate("(() => { panelHelp(panelRows.find(([r, it]) => it[0] === 'burn')[0]); return $('#pHelp').textContent; })()")
    full = await pg.evaluate("pnameOf('开花与燃烧', 'burn').cn")
    if not h.startswith(want[2] + ' · ' + full): bad.append(f'说明条第一行：{h[:40]}')
    for w in ('调大', 'UE', '星 › 寿命'):
        if w not in h: bad.append(f'说明条没有「{w}」')
    SR = "(q) => { const i = $('#params .ptools input[type=search]'); i.value = q; i.dispatchEvent(new Event('input')); return panelRows.filter(([r]) => !r.hidden).map(([r, it]) => it[0]); }"
    for q, k in (('Lifetime', 'burn'), ('燃烧时间', 'burn'), ('寿命', 'sparkLife'), ('Spawn Burst', 'stars')):
        r = await pg.evaluate(SR, q)
        if k not in r: bad.append(f'搜「{q}」找不到 {k}（{r[:6]}）')
    await pg.evaluate("(() => { const i = $('#params .ptools input[type=search]'); i.value = ''; i.dispatchEvent(new Event('input')); return 0; })()")
    await pg.evaluate("document.querySelector('#params [data-en]').click(); 0"); await pg.wait_for_timeout(200)
    en = await pg.evaluate("(%s)('burn')" % lab)
    if en != want[2]: bad.append(f'英文名开关：燃烧时间显示「{en}」')
    await pg.evaluate("document.querySelector('#params [data-en]').click(); 0")
    # 牡丹：没有火花 → 火花寿命变灰
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('botan')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("(() => { const x = panelRows.find(([r, it]) => it[0] === 'sparkLife'); return x ? { inert: x[0].classList.contains('inert'), why: x[0]._inert, rate: state.P.sparkRate } : null; })()")
    info['牡丹 火花寿命'] = r
    if not r or not r['inert']: bad.append(f'牡丹（火花 0）的火花寿命没标不起作用：{r}')
    # 爆裂星：「爆裂」发射器里有数量 / 延迟 / 范围 / 速度
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('crackle')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("(() => { selectEmitTab('爆裂'); const g = document.querySelector('#params section.egrp[data-g=\"爆裂\"]'); const has = k => { const x = panelRows.find(([r, it]) => it[0] === k); return !!x && !x[0].hidden && !!g && g.contains(x[0]); }; return { shown: !!g && !g.hidden, N: has('crackle'), R: has('crackleR'), V: has('crackleV') }; })()")
    info['爆裂星 爆裂'] = r
    if not all(r.values()): bad.append(f'爆裂星的「爆裂」发射器不对：{r}')
    # 升空尾缀：一个入口，档位在「效果 › 规格」里
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('trailM')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("(() => { selectEmitTab('全部'); const x = panelRows.find(([r, it]) => it.sel === '_trailTier'); return x ? { mod: x[0].closest('details.mod') && x[0].closest('details.mod')._key, lab: x[0]._lab, hidden: x[0].hidden, emit: [...document.querySelectorAll('#params section.egrp')].filter(d => !d.hidden).map(d => d.dataset.g) } : null; })()")
    info['尾缀档位'] = r
    if not r or r['mod'] != '效果›规格' or r['hidden'] or not r['lab']: bad.append(f'升空尾缀的档位不在「效果 › 规格」里：{r}')
    elif not all(e in r['emit'] for e in ('星头', '白热火花', '金火花', '橙色火花', '丝状火花')): bad.append(f"升空尾缀的发射器不全：{r['emit']}")
    # 空白发射器：只有星；「+ 火花」加上火花发射器（生成率按菊的模板）、「去掉」回到 0
    MODS = "(() => ({ tabs: [...document.querySelectorAll('#params .etabs [data-e]')].filter(b => !b.hidden).map(b => b.dataset.e), add: [...document.querySelectorAll('#params [data-addmod]')].map(b => b.dataset.addmod), rm: [...document.querySelectorAll('#params [data-rmmod]')].map(b => b.dataset.rmmod), rate: state.P.sparkRate, pm: state.P.mods }))()"
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('blank')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r0 = await pg.evaluate(MODS)
    await pg.evaluate("document.querySelector('#params [data-addmod=\"火花\"]').click(); 0"); await idle(pg)
    r1 = await pg.evaluate(MODS)
    await pg.evaluate("document.querySelector('#params [data-rmmod=\"火花\"]').click(); 0"); await idle(pg)
    r2 = await pg.evaluate(MODS)
    info['空白发射器'] = {'打开': r0, '加火花': r1, '去掉': r2}
    if '火花' in r0['tabs'] or r0['rate'] != 0 or sorted(r0['add']) != sorted(['火花', '尾迹外形', '烟花特性']) or '星' not in r0['tabs']: bad.append(f'空白发射器打开时不对：{r0}')
    if '火花' not in r1['tabs'] or not r1['rate'] or '火花' in r1['add'] or '火花' not in r1['rm']: bad.append(f'加「火花」不对：{r1}')
    if '火花' in r2['tabs'] or r2['rate'] != 0 or '火花' not in r2['add']: bad.append(f'去掉「火花」不对：{r2}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


# N2（4.3 清理清单 B1 / B2）：每个花型的每个参数都在命名表里有名字；命名表的名字、说明和模块说明里不再出现词汇表「不用」的词
OLD_WORDS = ['炭头', '火星', '火粉', '光丝', '长尾', '小割', '离散', '炸开', '尾巴', '旧名']     # 「燃烧时间」10-04 用户改回，不再算旧词
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
  // H16：「负数 = 默认」的参数（4.9.0 起是链条：接着 = 灰字显示算出来的值、滑杆照样能拖；点链条断开 / 接回）
  await openType('senrin'); await new Promise(r => setTimeout(r, 300));
  const rowOf = k => (panelRows.find(([r, it]) => Array.isArray(it) && it[0] === k) || [])[0];
  for (const [k, want] of [['subKeep', 0.35], ['subGrav', +state.P.grav], ['subFlash', +(state.P.flash * 0.3).toFixed(3)], ['subSpeedJit', +state.P.speedJit]]) {
    const row = rowOf(k); if (!row) { bad.push(k + ' 没有这一行'); continue; }
    const bt = row.querySelector('.chain'), rg = row.querySelector('input[type=range]'), num = row.querySelector('.num');
    if (!bt) { bad.push(k + ' 没有链条'); continue; }
    const r = { on: bt.getAttribute('aria-pressed') === 'true', dis: rg.disabled, min: +rg.min, shown: +num.value };
    bt.click(); r.off = { v: state.P[k], dis: rg.disabled, on: bt.getAttribute('aria-pressed') === 'true' };
    bt.click(); r.back = state.P[k];
    out[k] = r;
    if (!(r.on && !r.dis && r.min >= 0)) bad.push(k + ' 打开时链条没接着 / 滑杆不能拖 / 下限还是负数 ' + JSON.stringify(r));
    if (Math.abs(r.shown - want) > 0.011 * Math.max(1, Math.abs(want))) bad.push(`${k} 接着时显示 ${r.shown}，算出来的值是 ${want}`);
    if (!(Math.abs(r.off.v - want) < 1e-6 && !r.off.dis && !r.off.on)) bad.push(`${k} 断开后 = ${r.off.v}（应固定在算出来的 ${want}、滑杆可调）`);
    if (r.back !== -1) bad.push(`${k} 再接回去后 = ${r.back}（应存 -1）`);
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
    await pg.evaluate(REC if REAL else FAKE); await pg.evaluate('state.playing = false'); await pg.evaluate(ask_stub('检查新建'))
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
  // 4.4：打开菊 / 空白 / 升空尾缀，默认那一页的参数看得见；各发射器标签点了就看得见它的模块；模块收起和选的标签重建面板后记得住
  const out = {}, bad = [];
  const shown = el => { if (!el || !el.offsetParent) return false; for (let a = el.parentElement, c = el; a; c = a, a = a.parentElement) { if (a.hidden) return false; if (a.tagName === 'DETAILS' && !a.open && c.tagName !== 'SUMMARY') return false; } return true; };
  const vis = () => [...document.querySelectorAll('#params .sl')].filter(shown).length;
  const tabOk = async e => { const b = document.querySelector(`#params .etabs [data-e="${e}"]`); if (!b || b.hidden) return false; b.click(); await new Promise(r => setTimeout(r, 30));
    const g = document.querySelector(`#params section.egrp[data-g="${e}"]`); return !!g && !g.hidden && [...g.querySelectorAll(':scope > details.mod')].some(d => shown(d.querySelector('summary'))) && [...g.querySelectorAll('.sl')].some(shown); };
  for (const [t, need, emits] of [['kiku', 15, ['星', '火花', '余烬', '爆裂']], ['blank', 8, ['星']], ['trailM', 4, ['星头', '白热火花', '金火花', '橙色火花', '丝状火花']]]) {
    store.set('pEmitTab', {}); pview.tab = {};
    await openType(t); await new Promise(r => setTimeout(r, 400));
    const n = vis(), m = {}; for (const e of emits) m[e] = await tabOk(e);
    out[t] = { sliders: n, emits: m };
    if (n < need) bad.push(`${t} 默认一页看得见的参数只有 ${n} 个（应 ≥ ${need}）`);
    for (const [k, v] of Object.entries(m)) if (!v) bad.push(`${t} 的「${k}」发射器点了看不见`);
    if (t === 'blank') { const b = document.querySelector('#blankAdd [data-addmod="火花"]'); out.blankAdd = shown(b); if (!out.blankAdd) bad.push('空白发射器的「+ 火花」看不见'); }
  }
  // 手动收起模块、选的标签：重建面板后记得住
  await openType('kiku'); await new Promise(r => setTimeout(r, 300)); selectEmitTab('火花');
  const mod = [...document.querySelectorAll('#params section.egrp[data-g="火花"] > details.mod')].find(d => !d.hidden), key = mod._key;
  mod.querySelector('summary').click(); await new Promise(r => setTimeout(r, 20));
  const savedClosed = store.get('pModOpen', {})[key] === false;
  buildMasterPanel(); await new Promise(r => setTimeout(r, 20));
  const rebuilt = [...document.querySelectorAll('#params details.mod')].find(d => d._key === key), keptClosed = !rebuilt.open, keptTab = (document.querySelector('#params .etabs .on') || {}).dataset.e === '火花';
  rebuilt.querySelector('summary').click(); await new Promise(r => setTimeout(r, 20));
  const savedOpen = store.get('pModOpen', {})[key] === true;
  out.memory = { key, savedClosed, keptClosed, savedOpen, keptTab };
  if (!savedClosed || !keptClosed || !savedOpen) bad.push('手动收起 / 展开模块后没有记住，重建面板会恢复默认');
  if (!keptTab) bad.push('重建面板后没停在刚选的「火花」');
  selectEmitTab('星');
  return { ok: !bad.length, bad, out };
}"""


async def s3(pg):
    """4.4：打开菊 / 空白发射器 / 升空尾缀，默认页和各发射器标签的参数可访问、空白的「+ 火花」可达、模块开合和标签记得住"""
    await pg.evaluate("store.set('pModOpen', {}); store.set('pEmitTab', {}); pview.ready = false; pviewInit(); 0")     # 没有存过展开状态的新用户
    r = await pg.evaluate(S3_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)


S4_JS = r"""async () => {
  // 4.4：旧搜索 / 只看改过的 / 收起的模块不能把参数藏得找不回来：点发射器标签 = 清掉筛选、换到那一页；不改配方
  const out = {}, bad = [], wait = () => new Promise(r => setTimeout(r, 30));
  const saved = { mopen: structuredClone(store.get('pModOpen', {})), changed: store.get('pChanged', false), q: pview.q, tab: structuredClone(store.get('pEmitTab', {})) };
  const snapshot = () => JSON.stringify([state.P, state.M, state.gen]);
  const shown = el => { if (!el || !el.offsetParent) return false; for (let a = el.parentElement, c = el; a; c = a, a = a.parentElement) { if (a.hidden) return false; if (a.tagName === 'DETAILS' && !a.open && c.tagName !== 'SUMMARY') return false; } return true; };
  try {
    await openType('kiku'); await new Promise(r => setTimeout(r, 400));
    selectEmitTab('星');
    pview.changed = true; store.set('pChanged', true); pview.q = '没有匹配的旧搜索'; buildMasterPanel(); await wait();
    const tabsShown = [...document.querySelectorAll('#params .etabs [data-e]')].filter(b => !b.hidden).map(b => b.dataset.e), before = snapshot();
    document.querySelector('#params .etabs [data-e="火花"]').click(); await wait();
    const g = document.querySelector('#params section.egrp[data-g="火花"]');
    out.spark = { tabsWhileFiltered: tabsShown.includes('火花'), filtersCleared: !pview.q && !pview.changed && !$('#params .ptools input[type=search]').value, shown: !!g && !g.hidden,
      rows: [...g.querySelectorAll('.sl')].filter(shown).length, recipeUnchanged: snapshot() === before, onlyThis: [...document.querySelectorAll('#params section.egrp')].filter(x => !x.hidden).length === 1 };
    for (const [k, v] of Object.entries(out.spark)) if (!v) bad.push('火花找回失败：' + k);
    document.querySelector('#params .etabs [data-e="全部"]').click(); await wait();
    out.all = { emitters: [...document.querySelectorAll('#params section.egrp')].filter(x => !x.hidden).length };
    if (out.all.emitters < 5) bad.push('「全部」没把发射器都排出来：' + out.all.emitters);
  } finally {
    store.set('pModOpen', saved.mopen); store.set('pChanged', saved.changed); store.set('pEmitTab', saved.tab); pview.ready = false; pviewInit(); pview.q = saved.q; buildMasterPanel();
  }
  return { ok: !bad.length, bad, out };
}"""


async def s4(pg):
    r = await pg.evaluate(S4_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)


E1_JS = r"""async () => {
  // 5.0 第 2 步（4.7.0，用户 10-05 19:40「全按推荐」、21:55「直接开 5.0」）：一套物理——空中类火花只按实际年龄冷却（老的先暗）、结尾等火花自然灭完；
  // 「结尾」「冷却方式」两个旧 / 新开关从面板删掉；花型模板的序列时长盖到最后一批火花；帧计划缺省固定机位 + 匀速帧、Zoom 缺省关
  const out = {}, bad = [];
  await openType('kiku'); await new Promise(r => setTimeout(r, 300));
  const endMul = () => { const pl = displayPlan40(state.P); return +frameFade40(pl, (pl.t0 || 0) + pl.duration - 0.05, false).toFixed(3); };
  const pl = displayPlan40(state.P);
  out.defaults = { noFade: !!pl.noEndFade, endMul: endMul(), fb: state.P.frameBudget, zoom: state.P.zoom, mode: pl.budget && pl.budget.mode, holds: pl.budget ? [pl.budget.holdMin, pl.budget.holdMax] : null };
  if (!out.defaults.noFade || out.defaults.endMul !== 1) bad.push('结尾还在整体淡出：' + JSON.stringify(out.defaults));
  if (out.defaults.fb !== 'fixed' || out.defaults.zoom !== 'off' || out.defaults.mode !== 'fixed') bad.push('缺省不是固定机位 + 匀速帧：' + JSON.stringify(out.defaults));
  if (!out.defaults.holds || out.defaults.holds[0] !== out.defaults.holds[1]) bad.push('匀速帧：每帧停的 tick 数不一样：' + JSON.stringify(out.defaults.holds));
  out.sel = ['endMode', 'coolMode'].filter(k => panelRows.some(([r, it]) => it.sel === k));
  if (out.sel.length) bad.push('面板上还有旧 / 新开关：' + out.sel);
  const e = sparkTailEnd(state.P); out.end = { dur: state.P.duration, spark: e };
  if (e > state.P.duration + 0.051) bad.push('菊模板的序列时长没盖住最后一批火花：' + JSON.stringify(out.end));
  // 冷却：空中类着色器按实际年龄（uCoolAbs = 1），不管存档里的 coolMode
  const pr = particleProgram40('spk'); out.coolAbs = !!pr.u.uCoolAbs;
  // 4.4.3 E6：火花闪烁频率在「火花 › 亮度」、跟着闪烁收在随机下面；闪烁 0 时不显示，> 0 显示；缺省 0
  const tw = () => { const x = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'twinkleHz'); return x ? { at: x[0]._x.e + '›' + x[0]._x.m, rand: x[0]._randOf, vis: itemVisible(x[1], state.P) } : null; };
  out.twHz = { def: +state.P.twinkleHz, on: tw() }; const tw0 = state.P.twinkle; state.P.twinkle = 0; out.twHz.off = tw(); state.P.twinkle = tw0;
  if (out.twHz.def !== 0 || !out.twHz.on || out.twHz.on.at !== '火花›亮度' || out.twHz.on.rand !== 'sparkBright' || !out.twHz.on.vis || out.twHz.off.vis) bad.push('火花闪烁频率不对：' + JSON.stringify(out.twHz));
  selectEmitTab('星');
  return { ok: !bad.length, bad, out };
}"""


async def e1(pg):
    """5.0 第 2 步：一套物理（按实际年龄冷却、自然灭完，旧 / 新开关删了）、模板序列时长盖到火花灭完、缺省固定机位 + 匀速帧"""
    r = await pg.evaluate(E1_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)


R5_JS = r"""async () => {
  // 4.4.5 RT5（用户 10-04 14:58 / 17:27 / 17:41 UE 反馈）：物理弹道、循环层长度跟尾迹、GPU 兼容、中火花进贴图、贴图亮度口径、GPU 粒子上限。缺省 = 旧做法
  const out = {}, bad = [];
  await openType('tailL'); await new Promise(r => setTimeout(r, 300));
  const P0 = derive(structuredClone(state.P));
  out.defaults = ['rtBall', 'rtLoopSize', 'rtGpuSafe', 'rtMTex', 'rtTexCal', 'rtGpuMax'].map(k => +P0[k]);
  // 4.5.8（用户 10-05 21:40 小修 4）：尾缀 S / M / L 模板缺省改 GPU 安全写法（rtGpuSafe 1），其余照旧
  if (out.defaults.some((v, i) => v !== (i === 2 ? 1 : 0))) bad.push('缺省不对（除 GPU 兼容 = 1 外应是旧做法）：' + out.defaults);
  const ES0 = rtBuildES(P0); if (ES0.emitters.some(e => e.gpu && e.accelCurve)) bad.push('缺省（GPU 安全写法）GPU 火花不该再写乱流 Acceleration');
  const ESo = rtBuildES({ ...P0, rtGpuSafe: 0 }); if (!ESo.emitters.some(e => e.gpu && e.accelCurve)) bad.push('旧做法（GPU 兼容 0）GPU 火花应该还有乱流 Acceleration');
  // 物理弹道
  const Q = { ...P0, rtBall: 1 }, b = rtBallistic(Q), sp = t => { const v = b.vel(t); return Math.hypot(v[0], v[2]); };
  out.phys = { v0: +b.v0.toFixed(1), T: +b.T.toFixed(2), H: +b.H.toFixed(1), want: Q.rtH, s1: +sp(1).toFixed(1), vb: +b.vb.toFixed(2) };
  if (!b.quad || Math.abs(b.H - Q.rtH) > 0.01 * Q.rtH || Math.abs(b.vb - Q.rtVb) > 0.05) bad.push('物理弹道没到设定的开花高度 / 速度：' + JSON.stringify(out.phys));
  if (!(sp(1) < 0.8 * b.v0)) bad.push('物理弹道第 1 秒减速不够（平方阻力应该前段减速猛）：' + JSON.stringify(out.phys));
  const lin = rtBallistic(P0); out.lin = { v0: +lin.v0.toFixed(1), s1: +Math.hypot(...[0, 2].map(i => lin.vel(1)[i])).toFixed(1) };
  if (Math.abs(rtDuration(Q) - (b.T + (rtDuration(P0) - P0.rtT))) > 0.02) bad.push('物理弹道的总时长没按算出来的升空时间');
  // 星头光晕按 Velocity Over Life 走，和弹道重合
  const ESq = rtBuildES(Q), hg = ESq.emitters.find(e => e.name === 'HeadGlow');
  if (hg) { const tab = esSpawn({ emitters: [hg] })[0], q = tab.list[0], pos = [0, 0, 0]; esPos(q, [0, 0, 0], b.T * 0.6, pos); const want = b.pos(b.T * 0.6);
    out.glow = [+pos[2].toFixed(1), +want[2].toFixed(1)]; if (Math.abs(pos[2] - want[2]) > 0.01 * Math.max(10, want[2])) bad.push('星头光晕没跟着物理弹道：' + out.glow);
    const j = esFwlEmitter(hg, false, 1).modules.map(m => m.m); if (!j.includes('VelocityOverLife') || j.includes('Drag')) bad.push('星头光晕导出模块不对：' + j); }
  // GPU 兼容 + 上限 + 中火花进贴图
  const Z = { ...Q, rtGpuSafe: 1, rtFTex: 1, rtMTex: 1, rtGpuMax: 800 }, ESz = rtBuildES(Z);
  out.gpu = ESz.gpuEst; out.emit = ESz.emitters.map(e => e.name);
  for (const e of ESz.emitters) { if (!e.gpu) continue; const m = esFwlEmitter(e, false, 1).modules; const nv = m.filter(x => x.m === 'InitialVelocity').length;
    if (m.some(x => x.m === 'Acceleration')) bad.push(e.name + ' GPU 还写了 Acceleration'); if (nv > 2) bad.push(e.name + ' 有 ' + nv + ' 个 Initial Velocity'); }
  if (ESz.emitters.some(e => e.name === 'SparksFine' || e.name === 'SparksMid')) bad.push('细 / 中火花全进贴图了，还有 GPU 发射器：' + out.emit);
  if (!(ESz.gpuEst.est <= 800)) bad.push('GPU 粒子估算超上限：' + JSON.stringify(ESz.gpuEst));
  const LI = rtLoopInfo(Z), CL = rtTexClasses(Z, LI); out.tex = CL.map(C => C.k);
  if (out.tex.join() !== 'F,M') bad.push('贴图火花档不对：' + out.tex);
  // H4 口径：新口径燃烧温度处 = 0.01 × 亮度，温度偏移只改曲线形状（几个百分点），不再整体 ×7.5；旧口径照旧
  const cal = (dT, c) => { const C = rtTexClasses({ ...Z, rtTexCal: c, rtTexI: 100, rtFdT: dT }, LI).find(c => c.k === 'F'); return Math.max(...C.lum.filter(([u]) => u > 0.3 && u < 0.7).map(k => k[1])); };
  out.cal = [+cal(0, 1).toFixed(3), +cal(-400, 1).toFixed(3), +cal(-400, 0).toFixed(3)];
  if (out.cal[1] / out.cal[0] > 1.25 || out.cal[0] / out.cal[1] > 1.25 || out.cal[0] > 2) bad.push('新口径下温度偏移还在改贴图火花亮度：' + out.cal);
  if (!(out.cal[2] > 5 * out.cal[1])) bad.push('旧口径（缺省）变了：' + out.cal);
  // 循环层长度：起步很短、不伸到发射点以下，长满后不低于最短
  const sk = rtLoopSizeKeys({ ...Q, rtLoopMin: 0.15 }, b, b.v0, 300, 290); out.sk = [sk[0][1], Math.max(...sk.map(k => k[1])), sk[sk.length - 1][1]];
  if (!(sk[0][1] < 0.05) || !(out.sk[1] <= 1) || !(sk[sk.length - 1][1] >= 0.149)) bad.push('循环层长度曲线不对：' + out.sk);
  for (const [u, v] of sk) { const z = Math.hypot(...[0, 2].map(i => b.pos(u * b.T)[i] - b.pos(0)[i])); if (v * 290 > z + 3 * (+Q.rtHeadSize || 0.5) + 0.5) { bad.push(`循环层第 ${(u * b.T).toFixed(2)} s 伸到发射点以下：${(v * 290).toFixed(0)} m > ${z.toFixed(0)} m`); break; } }
  // 面板：选物理后升空时间藏起来、终端速度和结果行出来
  const row = panelRows.find(([r, it]) => it.sel === 'rtBall'); if (!row) bad.push('面板没有「弹道」选项'); else {
    out.where = row[0]._x.e + '›' + row[0]._x.m; if (out.where !== '星头›弹道') bad.push('「弹道」不在星头 › 弹道：' + out.where);
    const s = row[0].querySelector('select'); s.value = '1'; s.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 200));
    const vis = k => { const x = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === k); return x ? itemVisible(x[1], state.P) : null; };
    out.panel = { rtT: vis('rtT'), rtVt: vis('rtVt'), info: ((document.querySelector('#params [data-info=ballInfo]') || {}).textContent || '').slice(0, 40), dur: state.P.duration };
    if (out.panel.rtT !== false || out.panel.rtVt !== true || !/物理弹道/.test(out.panel.info)) bad.push('选物理弹道后面板不对：' + JSON.stringify(out.panel));
    s.value = '0'; s.dispatchEvent(new Event('change')); }
  selectEmitTab('星');
  return { ok: !bad.length, bad, out };
}"""


async def r5(pg):
    """4.4.5 RT5：升空尾缀的物理弹道、循环层长度、GPU 兼容、中火花进贴图、贴图亮度口径（H4）、GPU 粒子上限都在，缺省 = 旧做法"""
    r = await pg.evaluate(R5_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)


R6_JS = r"""async () => {
  // 4.5.1 RT6（用户 10-05 01:28「合并渲染再加 800 个 cascade 粒子」、14:35「近段 RT4 主体循环 + 远段一次性大量粒子序列 + ≤ 800 GPU」）
  const out = {}, bad = [];
  const e = entryById('RT6L') || entryById('RT5L'), d = defaultsFor(e.base), P5 = derive({ ...d.P, ...e.p, rtFar: 0, rtGpuDisp: 0, rtGpuGain: 1, rtNearExpo: 1 });     // 左栏只放当前版本：有 RT6 用 RT6 的参数（关掉近段 + 远段 = RT5 的做法）
  // 缺省（rtFar 0）= RT5：贴图只有细 / 中、没有近段权重、没有闪烁层
  out.def = { far: +P5.rtFar, tex: rtTexClasses(P5, rtLoopInfo(P5)).map(C => C.k).join(), nw: rtNearW(P5) === null, em: rtBuildES(P5).emitters.map(x => x.name) };
  if (out.def.far !== 0 || out.def.tex !== 'F,M' || !out.def.nw || out.def.em.includes('SparksTwinkle')) bad.push('缺省不是 RT5 的做法：' + JSON.stringify(out.def));
  // 近段 + 远段：贴图有粗火花；GPU 三档 = 预算；贴图 + GPU = 出生率（一颗不多一颗不少）
  const chk = (Z, tag) => {
    const LI = rtLoopInfo(Z), CL = rtTexClasses(Z, LI), ES = rtBuildES(Z), sp = rtGpuSplit(Z), o = { tex: CL.map(C => C.k).join(), est: ES.gpuEst.est, f: +sp.f.toFixed(3), cls: {} };
    for (const [k, nm] of [['F', 'SparksFine'], ['M', 'SparksTwinkle'], ['C', 'SparksCoarse']]) {
      const R = +Z['rt' + k + 'Rate'], C = CL.find(c => c.k === k), em = ES.emitters.find(x => x.name === nm), L = +Z['rt' + k + 'Life'];
      const g = em ? em.spawn[0][1] : 0,     /* 4.5.4 近段 + 远段时 GPU 出生率是常数（不跟脉动） */ tx = C ? C.rate : 0, alive = g * sp.pk * L;
      o.cls[k] = { R, tex: +tx.toFixed(1), gpu: +g.toFixed(1), alive: Math.round(alive), budget: +Z['rtGpu' + k] };
      if (Math.abs(tx + g - R) > Math.max(1.5 / LI.Tl, 0.005 * R)) bad.push(`${tag} ${k} 档贴图 + GPU ≠ 出生率：${tx.toFixed(1)} + ${g.toFixed(1)} ≠ ${R}`);
      if (sp.f >= 1 && Math.abs(alive - Math.min(+Z['rtGpu' + k], R * sp.pk * L)) > 0.03 * Math.max(10, +Z['rtGpu' + k])) bad.push(`${tag} ${k} 档 GPU 同时活着 ${alive.toFixed(0)} ≠ 预算 ${Z['rtGpu' + k]}`);
    }
    if (o.tex !== 'F,M,C') bad.push(tag + ' 贴图火花档应该是细 / 中 / 粗：' + o.tex);
    if (+Z.rtGpuMax > 0 && !(ES.gpuEst.est <= +Z.rtGpuMax * 1.001)) bad.push(tag + ' GPU 估算超上限：' + JSON.stringify(ES.gpuEst));
    return o;
  };
  const Z = { ...P5, rtFar: 1 };
  out.far = chk(Z, '近段 + 远段');
  out.cap = chk({ ...Z, rtGpuMax: 400 }, '上限 400');
  if (!(out.cap.f < 1)) bad.push('上限 400 时 GPU 应该一起降：' + out.cap.f);
  // 交接权重：近段 + 远段 = 1，交接前全在近段、交接完全在远段
  const nw = rtNearW(Z), [a0, a1] = rtNearA(Z); out.w = [0, a0, (a0 + a1) / 2, a1, 3].map(a => +nw(a).toFixed(3));
  if (out.w[0] !== 1 || out.w[1] !== 1 || Math.abs(out.w[2] - 0.5) > 0.01 || out.w[3] !== 0 || out.w[4] !== 0) bad.push('近段权重不对：' + out.w);
  // 闪烁层：Color Over Life 中段一亮一暗；远看直径：尺寸放大、光量（中心亮度 × 尺寸²）不变
  const ESz = rtBuildES(Z), tw = ESz.emitters.find(x => x.name === 'SparksTwinkle');
  if (!tw) bad.push('没有闪烁层 SparksTwinkle'); else { const lum = tw.col.filter(([u]) => u > 0.2 && u < 0.75).map(([, c]) => rtLum(c)); let alt = 0; for (let i = 2; i < lum.length; i++) if ((lum[i] - lum[i - 1]) * (lum[i - 1] - lum[i - 2]) < 0) alt++; out.twAlt = alt; if (alt < 2) bad.push('闪烁层没有一亮一暗：' + lum.map(x => x.toFixed(2))); }
  const ESd = rtBuildES({ ...Z, rtGpuDisp: 2 }), c0 = ESz.emitters.find(x => x.name === 'SparksCoarse'), c1 = ESd.emitters.find(x => x.name === 'SparksCoarse');
  const lt = x => Math.max(...x.col.map(([u, c]) => rtLum(c) * (x.stretchLife ? esCurve(x.stretchLife, u) : 1))) * ((x.size[0] + x.size[1]) / 2) ** 2;     // 光量 = 中心亮度 × 宽 × 高（拉长的 Y 再 × 拉长倍数）
  out.disp = { size: [c0.size, c1.size].map(s => +((s[0] + s[1]) / 2).toFixed(2)), light: [+lt(c0).toFixed(4), +lt(c1).toFixed(4)] };
  if (Math.abs(out.disp.size[1] - 2) > 0.01 || Math.abs(out.disp.light[1] / out.disp.light[0] - 1) > 0.02) bad.push('远看直径不对（尺寸 = 2 m、光量不变）：' + JSON.stringify(out.disp));
  // 导出：有远段时 cascade.json 多 TrailFar（速度朝向竖直面片、帧号曲线、立在发射点上）、命名多一张 Far
  const ball = rtBallistic(Z), LIz = rtLoopInfo(Z), F = 64, keys = [...Array(F).keys()].map(f => [+(f / F).toFixed(4), f]).concat([[1, F - 0.01]]);
  const fa = { t0: 0.8, Dtot: ball.T + 3, Df: 3.8, Fr: 48, Fd: 16, cols: 16, rows: 1, F, cx: 1, cz: 200, vz: 0.5, HX: 15, HY: 215, Ww: 30, Wh: 430, keys };
  const Lf = layoutOf({ ...Z, cols: 16, rows: 1, chans: 4 }), meta = { L: Lf, far: fa };
  const lay = { L: layoutOf(Z), T: ball.T, Tl: LIz.Tl, nRev: LIz.nRev, Ww: 10, Wh: 100, hb: 0.9, sizeKeysRise: [[0, 0.1], [1, 0.2]], grow: true, fadeSeconds: 1, fadeFps: 20, ball: { ...ball, pos: undefined, vel: undefined }, nearA: [a0, a1], gpuSplit: rtGpuSplit(Z), nearExpo: 0.8 };
  const b = { form: 'emitset', P: Z, es: ESz, meta: lay, fades: [], far: { meta, P: { ...Z, cols: 16, rows: 1, chans: 4 } } };     // 近段 + 远段：开花后归远段，没有消散层
  const j = fwlEmitSet('T', b, defaultsFor('tailL').M, false), tf = j.emitters.find(x => x.name === 'TrailFar'), rl = j.emitters.find(x => x.name === 'RiseLoop');
  const j1 = fwlEmitSet('T', { ...b, meta: { ...lay, nearExpo: 1 } }, defaultsFor('tailL').M, false), rl1 = j1.emitters.find(x => x.name === 'RiseLoop');
  const cl = x => x.modules.find(q => q.m === 'ColorOverLife').ColorOverLife.curve[0][1][0];
  out.exp = { em: j.emitters.map(x => x.name).slice(0, 4), tex: Object.keys(j.textures), sheets: namingSheets(b).map(x => x[0]), nearComp: +(cl(rl) / cl(rl1)).toFixed(3) };
  if (j.emitters.some(x => x.name === 'RiseFade') || j.textures.fade) bad.push('近段 + 远段时不该有 RiseFade：' + out.exp.em);
  if (Math.abs(out.exp.nearComp - 1 / 0.64) > 0.01) bad.push('近段贴图曝光 0.8 时 RiseLoop 的 Color Over Life 应该 × 1 / 0.64：' + out.exp.nearComp);
  if (!tf) bad.push('cascade.json 没有 TrailFar'); else {
    const mods = Object.fromEntries(tf.modules.map(x => [x.m, x])); out.exp.far = { align: tf.required.screen_alignment, delay: tf.required.delay_s, life: mods.Lifetime.Lifetime.const, size: mods.InitialSize.StartSize.const, loc: mods.InitialLocation.StartLocation.const, vel: mods.InitialVelocity.StartVelocity.const, keys: mods.DynamicParameter.params.frame.curve.length };
    if (out.exp.far.vel[2] !== 50) bad.push('TrailFar 向上初速应该 = 远段上移速度 0.5 m/s = 50 cm/s（UE 里 1 cm/s 定不住朝向）：' + out.exp.far.vel);
    if (tf.required.screen_alignment !== 'Velocity' || Math.abs(tf.required.delay_s - 0.8) > 1e-6 || mods.InitialSize.StartSize.const[1] !== 43000 || mods.InitialLocation.StartLocation.const[2] !== 20000 || mods.DynamicParameter.params.frame.curve.length !== F + 1 || j.textures[j.materials[tf.material].textures.main].file.indexOf('_Far') < 0)
      bad.push('TrailFar 导出不对：' + JSON.stringify(out.exp.far)); }
  if (out.exp.sheets.join() !== 'Loop,Far') bad.push('命名应该是循环层 + 远段：' + out.exp.sheets);
  // 4.5.4 曲线点数（用户 10-05 19:31「没变化就 2 个点，有变化的加几个变化的点」）：GPU / 软圆点发射器出生率 2 个点、出生位置 / 初速十几个点、星头光晕颜色几个点；远段帧号曲线几个拐点
  out.keys = Object.fromEntries(j.emitters.filter(x => x.material === 'dot').map(x => [x.name, [x.spawn.rate.curve ? x.spawn.rate.curve.length : 0, ...['InitialLocation', 'InitialVelocity', 'ColorOverLife'].map(m => { const q = x.modules.find(y => y.m === m); const v = q && (q.StartLocation || q.StartVelocity || q.ColorOverLife); return v && v.curve ? v.curve.length : 0; })]]));
  for (const [nm, [sp, lo, ve, co]] of Object.entries(out.keys)) if (sp > 2 || lo > 40 || ve > 40 || co > 16) bad.push(`${nm} 曲线点太多（出生率 / 位置 / 初速 / 颜色）：${[sp, lo, ve, co]}`);
  { const ball2 = rtBallistic(Z), fa2 = rtLayoutFar(Z, ball2, rtLoopInfo(Z)); out.farKeys = fa2.keys.length; out.farFade = +(fa2.Fd / fa2.Df).toFixed(2);
    if (fa2.keys.length > 12) bad.push('远段帧号曲线点太多：' + fa2.keys.length);
    if (fa2.Fd / fa2.Df < 7.5 - 1e-6 && fa2.Fd < fa2.F / 2) bad.push('远段开花后帧率低于 7.5 fps：' + out.farFade);
    let okF = true; for (let f = 0; f < fa2.F; f++) { const u = ((fa2.times[f] - fa2.dur[f] / 2) + fa2.dur[f] * 0.5) / fa2.Dtot; if (Math.floor(evalKeys(fa2.keys, u) + 1e-6) !== f) { okF = false; out.farBad = [f, u, evalKeys(fa2.keys, u)]; break; } }
    if (!okF) bad.push('远段帧号曲线和每帧烘焙时刻对不上：' + out.farBad); }
  // 面板：「贴图怎么分」在火花共用 › 贴图；选近段 + 远段后旧的「烘进贴图的比例」藏起来、交接年龄 / GPU 颗数出来
  await openType('tailL'); await new Promise(r => setTimeout(r, 300));
  const row = panelRows.find(([r, it]) => it.sel === 'rtFar'); if (!row) bad.push('面板没有「贴图怎么分」'); else {
    out.where = row[0]._x.e + '›' + row[0]._x.m; if (out.where !== '火花共用›贴图') bad.push('「贴图怎么分」不在火花共用 › 贴图：' + out.where);
    const vis = k => { const x = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === k); return x ? itemVisible(x[1], state.P) : null; };
    const s = row[0].querySelector('select'); s.value = '1'; s.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 200));
    out.panel = { rtFTex: vis('rtFTex'), rtNearA0: vis('rtNearA0'), rtGpuC: vis('rtGpuC'), rtGpuDisp: vis('rtGpuDisp') };
    if (out.panel.rtFTex !== false || out.panel.rtNearA0 !== true || out.panel.rtGpuC !== true || out.panel.rtGpuDisp !== true) bad.push('选近段 + 远段后面板不对：' + JSON.stringify(out.panel));
    s.value = '0'; s.dispatchEvent(new Event('change')); }
  // 4.5.2 分层看（用户 10-05 17:39「没法单独看近段、远段和 GPU 粒子层」）：工具条一排近段 / 远段 / 每个 GPU 层 + 颗数；关掉远段 → 远段 0 颗、HUD 写着；「全部」恢复
  Object.assign(state.P, { rtFar: 1 }); state.gen++; const v0 = state.view, t0 = state.t; state.view = 'live'; state.t = 3; ensureTargets();
  try {
    renderEmitLive(); const bar = document.querySelector('#rtLayerBar'), keys = [...bar.querySelectorAll('[data-k]')].map(x => x.dataset.k), n0 = hudText;
    bar.querySelector('[data-k="far"]').click(); renderEmitLive(); const n1 = hudText, offCls = bar.querySelector('[data-k="far"]').classList.contains('off');
    bar.querySelector('[data-k="far"]').dispatchEvent(new MouseEvent('dblclick')); renderEmitLive(); const n2 = hudText;
    bar.querySelector('[data-all]').click(); renderEmitLive(); const n3 = hudText;
    out.layers = { keys, off: offCls, hud: [n0, n1, n2, n3].map(h => (h.match(/近段 [\d,]+ \+ 远段 [\d,]+/) || [''])[0]) };
    const num = (h, w) => +((h.match(new RegExp(w + ' ([\\d,]+)')) || [0, '-1'])[1].replace(/,/g, ''));
    if (!['near', 'far', 'SparksCoarse', 'SparksTwinkle', 'SparksFine'].every(k => keys.includes(k))) bad.push('分层看没有近段 / 远段 / GPU 层：' + keys);
    if (!(num(n0, '远段') > 0) || num(n1, '远段') !== 0 || !offCls || !/分层看/.test(n1)) bad.push('关掉远段不对：' + JSON.stringify(out.layers));
    if (num(n2, '近段') !== 0 || !(num(n2, '远段') > 0)) bad.push('双击远段应该只看远段：' + JSON.stringify(out.layers));
    if (/分层看/.test(n3) || !(num(n3, '近段') > 0)) bad.push('「全部」没恢复：' + JSON.stringify(out.layers));
  } finally { state.P.rtFar = 0; state.gen++; state.view = v0; state.t = t0; rtShow.off.clear(); }
  selectEmitTab('星');
  return { ok: !bad.length, bad, out };
}"""


async def r6(pg):
    """4.5.1 RT6：近段 + 远段（rtFar）缺省关 = RT5；开了：粗 / 中 / 细都进贴图、GPU 按档预算（含上限一起降）、贴图 + GPU = 出生率；交接权重相加 = 1；
    闪烁层带闪烁；远看直径光量不变；cascade.json 多 TrailFar、命名多 Far；面板「贴图怎么分」"""
    r = await pg.evaluate(R6_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)


async def w1(pg):
    """4.5.0 工作台快改（用户 10-05 01:28 / 02:25）：时间轴没有发射器行和曲线、精简布局收起层轨道；AI 效果调了保存 = 存成我的效果（派生）、能加层；
    单层存模板 → 花型库「我的模板」、能打开；删除不弹框、6 秒内能撤销；AI 效果能从左栏隐藏；只还原一个发射器 / 回到模板默认；时长跟随 / 同一时刻粘连两个开关"""
    bad, info = [], {}
    await pg.evaluate("window.askSaveName = async (t, n, init) => '检查 · ' + init; 0")       # 起名对话框：直接用默认名
    # 1 时间轴、精简布局
    await open_effect(pg, 'hiki_nishiki'); await idle(pg)
    r = await pg.evaluate("(() => { stage2.tlSig = ''; buildTlBars(); return { tle: document.querySelectorAll('#tlBars .tle, #tlBars .tle-box').length, curves: !!document.querySelector('#tlCurves'), rows: document.querySelectorAll('#tlBars .tlb').length, opts: [...document.querySelectorAll('#tlBars [data-tlopt]')].map(c => c.dataset.tlopt) }; })()")
    info['时间轴'] = r
    if r['tle'] or r['curves']: bad.append(f'时间轴还有发射器行 / 曲线：{r}')
    if r['rows'] != 2: bad.append(f"引菊 → 锦应该两条层轨道：{r['rows']}")
    if r['opts'] != ['follow', 'glue']: bad.append(f"时间轴下面没有「时长跟着走 / 同一时刻一起动」两个开关：{r['opts']}")
    r = await pg.evaluate("(() => { const p0 = { ...panels }; setPanels({ side: false, right: false }); const hid = getComputedStyle($('#tlBars')).display === 'none'; setPanels(p0); const back = getComputedStyle($('#tlBars')).display !== 'none'; return { hid, back }; })()")
    info['精简布局'] = r
    if not r['hid'] or not r['back']: bad.append(f'精简布局没收起 / 恢复层轨道：{r}')
    # 2 开关：时长跟随 / 粘连
    r = await pg.evaluate("""(async () => { selectComboLayer(0); const P = state.P, P2 = layerEntryOf(state.layers[1]).P, d0 = P.duration, i0 = P2.ignDelay, s0 = P.sparkStop;
      state.followOff = false; state.glueOff = false; setTimingParam('sparkStop', +(s0 + 0.2).toFixed(2)); const on = { dur: P.duration, ign2: P2.ignDelay };
      setTimingParam('sparkStop', s0); const back = { dur: P.duration, ign2: P2.ignDelay };
      state.followOff = true; state.glueOff = true; setTimingParam('sparkStop', +(s0 + 0.2).toFixed(2)); const off = { dur: P.duration, ign2: P2.ignDelay };
      setTimingParam('sparkStop', s0); state.followOff = false; state.glueOff = false;
      return { d0, i0, s0, on, back, off }; })()""")
    info['开关'] = r
    if abs(r['on']['ign2'] - (r['i0'] + 0.2)) > 0.011 or not (r['on']['dur'] > r['d0']): bad.append(f'开着跟随 / 粘连时，改引线火花停锦层点火 / 时长没跟着动：{r}')
    if abs(r['off']['dur'] - r['back']['dur']) > 1e-6 or abs(r['off']['ign2'] - r['back']['ign2']) > 1e-6: bad.append(f'关掉跟随 / 粘连后，改火花停还是带着时长或锦层点火动了：{r}')
    await idle(pg)
    # 3 派生成我的效果 + 加层
    r = await pg.evaluate("""(async () => { selectComboLayer(1); state.P.sparkLife = +(state.P.sparkLife + 0.3).toFixed(2); onParam(); const n0 = state.layers.length;
      const rec = await wbDeriveMine(); if (!rec) return null; const my = !!lib.my, n1 = state.layers.length, sl = layerEntryOf(state.layers[1]).P.sparkLife;
      await myAddLayerFrom('botan'); return { my, from: lib.my && lib.my.from && lib.my.from.name, n0, n1, n2: state.layers.length, sl, id: rec.id, links: (lib.my.links || []).length }; })()""")
    await idle(pg)
    info['派生'] = r
    if not r or not r['my'] or r['n1'] != r['n0'] or r['n2'] != r['n0'] + 1: bad.append(f'保存 AI 效果没变成我的效果 / 加不了层：{r}')
    elif not r['from'] or r['links'] < 1: bad.append(f'派生出来的效果没记来源 / 同一批星：{r}')
    # 4 存模板 → 花型库 → 打开
    t = await pg.evaluate("""(async () => { selectComboLayer(0); await saveLayerAsTemplate(); const ts = Object.values(tplAll()); const t = ts[ts.length - 1];
      pk.mode = 'open'; const items = pkItems().filter(i => i.cat === 'mytpl').map(i => i.key); openTemplate(t.id);
      return { n: ts.length, id: t.id, type: t.type, inPicker: items.includes('tpl:' + t.id), tpl: !!lib.tpl, key: lib.key, stars: state.P.stars, want: t.P.stars, del: $('#abDel').hidden ? '' : $('#abDel').title }; })()""")
    await idle(pg)
    info['模板'] = t
    if not t['inPicker'] or not t['tpl'] or t['stars'] != t['want']: bad.append(f'存的模板没出现在花型库 / 打不开：{t}')
    # 5 删除能撤销（模板、我的效果）
    r = await pg.evaluate(f"""(async () => {{ removeTemplate('{t['id']}'); const gone = !tplAll()['{t['id']}']; document.querySelector('#undoToast button').click(); const back = !!tplAll()['{t['id']}'];
      removeMyFx('{r['id'] if r else ''}'); const g2 = !myAll()['{r['id'] if r else ''}']; document.querySelector('#undoToast button').click(); await new Promise(z => setTimeout(z, 50)); const b2 = !!myAll()['{r['id'] if r else ''}'];
      return {{ gone, back, g2, b2 }}; }})()""")
    info['删除撤销'] = r
    if not all(r.values()): bad.append(f'删除 / 撤销不对：{r}')
    # 6 还原：只还原一个发射器、回到模板默认
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(() => { const d = defaultsFor('kiku').P; state.P.sparkLife = +(state.P.sparkLife + 0.5).toFixed(2); state.P.v0 = +(state.P.v0 + 20).toFixed(1); onParam(); refreshVisibility();
      resetScope('火花'); const a = { sl: state.P.sparkLife, v0: state.P.v0 }; resetToDefaults(); return { a, b: { v0: state.P.v0 }, d: { sl: d.sparkLife, v0: d.v0 } }; })()""")
    info['还原'] = r
    if abs(r['a']['sl'] - r['d']['sl']) > 1e-6 or abs(r['a']['v0'] - r['d']['v0']) < 1: bad.append(f'只还原「火花」不对（火花寿命该回去、初速不该动）：{r}')
    if abs(r['b']['v0'] - r['d']['v0']) > 1e-6: bad.append(f'回到模板默认后初速没回去：{r}')
    # 7 AI 效果从左栏隐藏、撤销
    await open_effect(pg, 'jinmangju'); await idle(pg)
    r = await pg.evaluate("""(() => { hideCurrentEffect(); const hid = !document.querySelector('#libBody .li[data-key="ef:jinmangju"]'); document.querySelector('#undoToast button').click(); const back = !!document.querySelector('#libBody .li[data-key="ef:jinmangju"]'); return { hid, back }; })()""")
    info['隐藏'] = r
    if not r['hid'] or not r['back']: bad.append(f'从左栏隐藏 / 撤销不对：{r}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def w2(pg):
    """4.5.3（用户 10-05 18:02）：左栏没有「我的版本」「已通过」组，通过的效果在「我的效果」最上面；我的效果每项没有「删除」（删除在资产栏 ⋯）；
    设了出点时「火花灭完」写明出点在哪、能一键清除；自动烘焙关、改了序列时长还没烘时，时间轴按新的时长画（不停在旧贴图的长度）；远段面片上移时贴图内容补回（引擎回放位置 = 世界位置）"""
    bad, info = [], {}
    r = await pg.evaluate("""(() => { renderLib(); const g = [...document.querySelectorAll('#libBody details.lg')].map(d => d.className.replace('lg lg-', ''));
      const my = document.querySelector('#libBody details.lg-myfx'), passed = FW_EFFECTS.filter(ef => ef.阶段 === '已通过' || ef.已通过版).map(ef => 'ef:' + ef.key);
      const keys = my ? [...my.querySelectorAll('.li')].map(x => x.dataset.key) : [];
      return { groups: g, passed, inMy: passed.filter(k => keys.includes(k)).length, first: keys.slice(0, passed.length), del: my ? [...my.querySelectorAll('.li .li-act button')].filter(b => b.textContent === '删除').length : -1 }; })()""")
    info['左栏'] = r
    if 'mine' in r['groups'] or 'passed' in r['groups']: bad.append(f"左栏还有「我的版本」/「已通过」组：{r['groups']}")
    if r['inMy'] != len(r['passed']) or sorted(r['first']) != sorted(r['passed']): bad.append(f'通过的效果没排在「我的效果」最上面：{r}')
    if r['del']: bad.append(f"我的效果里每项还有「删除」：{r['del']}")
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('crackle')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(async () => { const P = state.P; P.cutOut = 2.83; P.duration = 9; onParam(); refreshVisibility(); await new Promise(z => setTimeout(z, 100));
      const box = document.querySelector('#params [data-info=endInfo]'), txt = box ? box.textContent : '', btn = box && box.querySelector('[data-cutclear]');
      if (btn) btn.click(); await new Promise(z => setTimeout(z, 100)); return { txt: txt.slice(0, 90), btn: !!btn, after: state.P.cutOut }; })()""")
    info['出点'] = r
    if not r['btn'] or '出点在 2.83' not in r['txt'] or r['after'] != 0: bad.append(f'设了出点时没说清楚 / 清除不了：{r}')
    await idle(pg)
    r = await pg.evaluate("""(() => { setAutoBake(false); const b0 = state.bake ? bakeTotal(state.bake) : null; state.P.duration = 7; onParam();
      const x = curLayerBakes()[0], sp = layerSpans(x); setAutoBake(true); return { bake: b0, end: sp && sp.end }; })()""")
    info['时间轴'] = r
    if not r['end'] or abs(r['end'] - 7) > 1e-6: bad.append(f'改了序列时长、还没烘时，时间轴没按新的时长画：{r}')
    await idle(pg)
    r = await pg.evaluate("""(() => { const ball = { T: 5 }, fa = { t0: 0.8, Dtot: 10, F: 64, keys: [[0, 0], [1, 63.99]], cx: 0, cz: 100, vz: 0.5, Ww: 20, Wh: 400 };
      const s = rtFarStateAt({ far: { meta: { far: fa } } }, 4.8); return { z: s && s.z }; })()""")
    info['远段上移'] = r
    if not r['z'] or abs(r['z'] - (100 + 0.5 * 4)) > 1e-6: bad.append(f'引擎回放里远段面片没按上移速度走：{r}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def w3(pg):
    """4.5.8：那 9 处 bug（协作/筛查/汇总_要你定的.md §6）+ 5 条小修（协作/5.0_需求梳理.md §6.7）。每项先在 4.5.7 上失败，再修到通过"""
    bad, info = [], {}
    cur = ["?"]
    async def ev(js):
        try: return await pg.evaluate(js)
        except Exception as e: raise RuntimeError(f"{cur[0]}：{str(e)[:300]}")
    await pg.evaluate("window.askSaveName = async (t, n, init) => '检查 · ' + init; window.__confirms = 0; window.confirm = () => { window.__confirms++; return true; }; window.__flashes = []; const _f = flash; flash = (m, e) => { window.__flashes.push([String(m), !!e]); return _f(m, e); }; 0")
    clicks = "(async () => { for (const b of [...document.querySelectorAll('#undoToast button')]) { b.click(); await new Promise(z => setTimeout(z, 80)); } return 0; })()"
    cur[0] = '20-01'
    # 20-01 删当前打开的我的效果：撤销后版本也回来
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(myCreate('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await ev("""(async () => { const id = lib.my.id, key = 'my:' + id; const all = wbAll(); all[key] = [{ id: 'v1', name: '检查版本 1', at: wbNow(), snap: wbSnap() }, { id: 'draft', name: '草稿', draft: true, at: wbNow(), snap: wbSnap() }]; store.set('mySaves', all);
      removeMyFx(id); const gone = !myAll()[id], n0 = (wbAll()[key] || []).length; return { id, key, gone, n0 }; })()""")
    await idle(pg); await pg.evaluate(clicks); await idle(pg)
    r2 = await ev(f"(() => ({{ back: !!myAll()['{r['id']}'], n1: (wbAll()['{r['key']}'] || []).length, open: lib.key }}))()")
    info['20-01'] = {**r, **r2}
    if not r2['back'] or r2['n1'] != 2: bad.append(f'20-01 删当前我的效果后撤销，版本没一起回来：{info["20-01"]}')
    cur[0] = '20-02'
    # 20-02 连删两个模板，两个都能撤销
    r = await ev("""(async () => { const a = { id: 'tA' + Date.now().toString(36), name: '检查模板 A', type: 'kiku', P: structuredClone(defaultsFor('kiku').P), M: structuredClone(defaultsFor('kiku').M), at: wbNow() };
      const b = { ...structuredClone(a), id: a.id + 'b', name: '检查模板 B' }; tplPut(a); tplPut(b); removeTemplate(a.id); removeTemplate(b.id);
      const gone = !tplAll()[a.id] && !tplAll()[b.id], btns = document.querySelectorAll('#undoToast button').length; return { a: a.id, b: b.id, gone, btns }; })()""")
    await pg.evaluate(clicks)
    r2 = await ev(f"(() => ({{ a: !!tplAll()['{r['a']}'], b: !!tplAll()['{r['b']}'] }}))()")
    info['20-02'] = {**r, **r2}
    if not (r['gone'] and r2['a'] and r2['b']): bad.append(f'20-02 连删两个模板，没有两个都能撤销：{info["20-02"]}')
    cur[0] = '20-04'
    # 20-04 删当前打开的模板：顶栏不再是「更新模板」
    r = await ev(f"""(async () => {{ openTemplate('{r['a']}'); await new Promise(z => setTimeout(z, 300)); const before = !$('#abUpdTpl').hidden; removeTemplate('{r['a']}'); await new Promise(z => setTimeout(z, 300));
      return {{ before, tpl: !!lib.tpl, upd: !$('#abUpdTpl').hidden, key: lib.key }}; }})()""")
    await idle(pg)
    info['20-04'] = r
    if r['tpl'] or r['upd']: bad.append(f'20-04 删了当前模板，顶栏还认它 / 还显示「更新模板」：{r}')
    cur[0] = '20-03'
    # 20-03 删层进 Ctrl+Z、不弹确认框
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(myCreate('kiku')).then(() => myAddLayerFrom('botan')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    await pg.wait_for_timeout(900)
    r = await ev("""(async () => { selectComboLayer(1); state.P.stars = 77; onParam(); await new Promise(z => setTimeout(z, 900)); const c0 = window.__confirms, n0 = state.layers.length;
      myDelLayer(1); await new Promise(z => setTimeout(z, 900)); const n1 = state.layers.length; await undoStep(-1); await new Promise(z => setTimeout(z, 300));
      const n2 = state.layers.length, st = n2 > 1 ? layerEntryOf(state.layers[1]).P.stars : null; return { n0, n1, n2, st, confirms: window.__confirms - c0 }; })()""")
    await idle(pg)
    info['20-03'] = r
    if r['confirms'] or r['n1'] != r['n0'] - 1 or r['n2'] != r['n0'] or r['st'] != 77: bad.append(f'20-03 删层没进 Ctrl+Z（或还弹确认框）：{r}')
    cur[0] = '19-C03'
    # 19-C03 关自动烘焙：同一批星的层马上同步（不等源层烘完）
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(myCreate('kiku')).then(() => myAddLayerFrom('kiku')).then(() => { mySetLinked(0, 1, true); return mySave(false); }).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    await pg.wait_for_timeout(900)
    r = await ev("""(async () => { setAutoBake(false); selectComboLayer(0); state.P.v0 = +(state.P.v0 + 13).toFixed(1); onParam();
      const a = state.P.v0, b = layerEntryOf(state.layers[1]).P.v0; setAutoBake(true); return { a, b }; })()""")
    await idle(pg)
    info['19-C03'] = r
    if abs(r['a'] - r['b']) > 1e-9: bad.append(f'19-C03 关自动烘焙时同一批星的层没马上同步：{r}')
    cur[0] = '19-C04'
    # 19-C04 内置效果里「暂时不联动」不带进我的效果
    r = await ev("""(async () => { const id = lib.my.id; state.linkOff = true; await openMyEffect(id); await new Promise(z => setTimeout(z, 600));
      selectComboLayer(0); state.P.v0 = +(state.P.v0 + 7).toFixed(1); onParam(); await new Promise(z => setTimeout(z, 200));
      return { off: !!state.linkOff, a: state.P.v0, b: layerEntryOf(state.layers[1]).P.v0 }; })()""")
    await idle(pg)
    info['19-C04'] = r
    if abs(r['a'] - r['b']) > 1e-9: bad.append(f'19-C04 内置效果关了联动，打开我的效果后勾着的同一批星不联动：{r}')
    cur[0] = '19-C01'
    # 19-C01 某层按新参数烘焙失败：导出要拦住，不拿旧贴图
    r = await ev("""(async () => { const ob = bake; bake = async (P, ...a) => { if (P.stars === 66) throw new Error('检查：故意烘焙失败'); return ob(P, ...a); };
      selectComboLayer(1); state.P.stars = 66; onParam(); await new Promise(z => setTimeout(z, 1500)); let err = '';
      try { await comboLayerBakes(state.layers); } catch (e) { err = e.message || String(e); } bake = ob; state.P.stars = 77; onParam(); return { err }; })()""")
    await idle(pg)
    info['19-C01'] = r
    if not r['err']: bad.append(f'19-C01 有一层新参数烘焙失败，导出没拦住（会拿旧贴图）：{r}')
    cur[0] = '19-C05'
    # 19-C05 组合说明按最终贴图写（导出过程中贴图变了，说明跟着变）
    r = await ev("""(async () => { const oz = makeZip, od = download, oc = comboPackFiles; let got = null;
      comboPackFiles = async (name, layers) => { for (const L of layers) { const e = layerEntryOf(L); e.bake.meta.Ww = 12.34; } return []; };
      makeZip = async files => { got = files; return new Blob([]); }; download = () => 0;
      try { await exportCombo(); } finally { makeZip = oz; download = od; comboPackFiles = oc; }
      const f = got && got.find(([n]) => n.endsWith('_组合说明.json')); if (!f) return { json: null };
      const j = JSON.parse(new TextDecoder().decode(f[1])); return { cm: j.layers.map(l => l.spriteSizeCm && l.spriteSizeCm[0]), sc: state.layers.map(L => L.scale) }; })()""")
    info['19-C05'] = r
    if not r.get('cm') or any(abs(c - 1234 * s) > 0.6 for c, s in zip(r['cm'], r['sc'])): bad.append(f'19-C05 组合说明没按导出时最终的贴图写：{r}')
    cur[0] = '19-C02'
    # 19-C02 显示强度 0：导出的 Color Over Life 也是 0
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await ev("""(() => { const M = { ...state.M, headInt: 0, tailInt: 0 }; const c = fwlCascade('Chk', state.bake, M);
      const col = c.emitters.flatMap(e => e.modules.filter(m => m.m === 'ColorOverLife').map(m => m.ColorOverLife.curve)); const mx = Math.max(0, ...col.flat().map(k => Math.max(...k[1])));
      return { n: col.length, max: mx }; })()""")
    info['19-C02'] = r
    if not r['n'] or r['max'] > 0: bad.append(f'19-C02 显示强度 0，导出的 Color Over Life 不是 0：{r}')
    cur[0] = '小修 1'
    # 小修 1：贴图结尾全黑被裁掉，「火花灭完」那行要写明
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('crackle')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await ev("""(async () => {
      const b = state.bake; if (!b) return { txt: 'no bake' }; b.meta.trim = { reqEnd: 9, end: 2.73, t0: 0 }; state.P.duration = 9; refreshVisibility(); await new Promise(z => setTimeout(z, 100));
      const box = document.querySelector('#params [data-info=endInfo]'); return { txt: box ? box.textContent.slice(0, 160) : '' }; })()""")
    await idle(pg)
    info['小修1'] = r
    if '全黑' not in r['txt'] or '2.73' not in r['txt']: bad.append(f'小修 1：结尾全黑帧被裁掉，「火花灭完」那行没写明：{r}')
    cur[0] = '小修 2'
    # 小修 2：换版本前先存草稿
    await open_effect(pg, 'jinmangju'); await idle(pg)
    r = await ev("""(async () => { let n = 0; while (!wb.sig && n++ < 100) await new Promise(z => setTimeout(z, 100)); const list = wbList(); list.push({ id: 'vchk', name: '检查版本', at: wbNow(), snap: wbSnap() }); wbPut(list);
      selectComboLayer(0); state.P.stars = 211; onParam(); await new Promise(z => setTimeout(z, 300)); await wbLoad('vchk'); await new Promise(z => setTimeout(z, 300));
      const d = wbList().find(x => x.draft); return { draft: !!d, stars: d ? (d.snap.P ? d.snap.P.stars : d.snap.layers[0].P.stars) : null }; })()""")
    await idle(pg)
    info['小修2'] = r
    if not r['draft'] or r['stars'] != 211: bad.append(f'小修 2：换版本前没把没保存的改动存成草稿：{r}')
    cur[0] = '小修 3'
    # 小修 3：浏览器存不进去要报错（不能说「已保存」）；读坏了先备份原文
    r = await ev("""(async () => { const os = Storage.prototype.setItem; window.__flashes = [];
      Storage.prototype.setItem = function (k, v) { if (String(k).startsWith('fwb.myEffects')) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; } return os.call(this, k, v); };
      let ok = null; try { ok = store.set('myEffects', { x: 1 }); } finally { Storage.prototype.setItem = os; }
      const errFlash = window.__flashes.some(([m, e]) => e && /存不进|没存上|保存失败/.test(m));
      localStorage.setItem('fwb.myTemplates', '{坏的'); const v = store.get('myTemplates', {}); const bak = Object.keys(localStorage).some(k => k.startsWith('fwb.myTemplates.坏') || k.startsWith('fwb.myTemplates.corrupt'));
      localStorage.removeItem('fwb.myTemplates'); return { ok, errFlash, bak }; })()""")
    info['小修3'] = r
    if r['ok'] is not False or not r['errFlash']: bad.append(f'小修 3：浏览器存不进去时没报错：{r}')
    if not r['bak']: bad.append(f'小修 3：读坏了没先备份原文（下次保存会把整张表覆盖）：{r}')
    cur[0] = '小修 4'
    # 小修 4：尾缀 S / M / L 模板默认 GPU 安全写法
    r = await ev("(() => ({ s: defaultsFor('tailS').P.rtGpuSafe, m: defaultsFor('tailM').P.rtGpuSafe, l: defaultsFor('tailL').P.rtGpuSafe }))()")
    info['小修4'] = r
    if not (r['s'] == 1 and r['m'] == 1 and r['l'] == 1): bad.append(f'小修 4：尾缀 S / M / L 模板导出还是 GPU 写 Acceleration 的旧写法：{r}')
    cur[0] = '小修 5'
    # 小修 5：子花继承标签写对（十字 0.25）
    r = await ev("(() => { for (const sec of SCHEMA) for (const it of sec.items) if (Array.isArray(it) && it[0] === 'subKeep') return typeof it[1] === 'function' ? it[1](state.P) : it[1]; return ''; })()")
    info['小修5'] = r
    if '0.25' not in r: bad.append(f'小修 5：子花继承标签没写十字排布 0.25：{r}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def w4(pg):
    """4.6.0（5.0 第 1 步，用户 10-05 20:22「每一个子发射器拥有的参数都是全的」）"""
    bad, info = [], {}
    STD = ['生成', '形状', '初速', '受力', '寿命', '大小', '颜色', '亮度', '闪烁']
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('crackle')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(() => { const out = {}; for (const e of ['星', '火花', '余烬', '分叉火花', '爆裂', '开花闪光']) { const g = document.querySelector(`#params section.egrp[data-g="${e}"]`);
      out[e] = g ? [...g.querySelectorAll(':scope > details.mod > summary')].map(x => x.firstChild.textContent.trim()) : null; } return out; })()""")
    info['模块'] = r
    for e, ms in r.items():
        if not ms or [m for m in STD if m not in ms]: bad.append(f'「{e}」没有列全 9 个模块：{ms}')
        elif [m for m in ms if m in STD] != STD: bad.append(f'「{e}」9 个模块顺序不对：{ms}')
    # 爆裂 / 开花闪光的新参数真起作用（模拟里的小闪）
    r = await pg.evaluate("""(() => { const P = derive({ ...structuredClone(state.P), crackle: 12, crackleSize: 2, crackleSizeJit: 0, crackleBright: 5, crackleBrightJit: 0, crackleLife: 0.2, crackleTau: 0.05, flashR: 10, flashSize: 1 });
      const s = new Sim(P); for (let i = 0; i < Math.ceil((P.burn + 1.5) / H_STEP); i++) s.step(H_STEP);
      const cr = s.flashes.filter(f => f.abs != null), fl = s.flashes[0]; const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
      return { n: cr.length, sig: +avg(cr.map(f => f.sig)).toFixed(3), abs: +avg(cr.map(f => f.abs)).toFixed(3), cut: cr[0] && cr[0].cut, tau: cr[0] && cr[0].tau, flashSig: fl.sig }; })()""")
    info['爆裂 / 开花闪光'] = r
    if not r['n'] or abs(r['sig'] - 2) > 1e-6 or abs(r['abs'] - 5) > 1e-6 or r['cut'] != 0.2 or r['tau'] != 0.05: bad.append(f'爆裂的大小 / 亮度 / 寿命 / 衰减参数没起作用：{r}')
    if abs(r['flashSig'] - 10) > 1e-6: bad.append(f'开花闪光半径没起作用：{r}')
    r = await pg.evaluate("""(() => { const row = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'flashR'), bt = row && row[0].querySelector('.chain'); return { row: !!row, chain: !!bt, on: !!bt && bt.getAttribute('aria-pressed') === 'true' }; })()""")
    info['开花闪光半径跟初速'] = r
    if not (r['row'] and r['chain'] and r['on']): bad.append(f'开花闪光半径没有链条（跟初速）：{r}')
    # 子花：子星大小 / 亮度
    r = await pg.evaluate("""(() => { const P = derive({ ...structuredClone(defaultsFor('senrin').P), type: 'senrin', subSize: 2.5, subBright: 0.4 }); const s = new Sim(P);
      for (let i = 0; i < Math.ceil((P.subDelay + 0.3) / H_STEP); i++) s.step(H_STEP); const k = s.all.filter(x => x.kind === 2); return { n: k.length, sz: k[0] && k[0].sz, I: k[0] && k[0].I }; })()""")
    info['子花'] = r
    if not r['n'] or r['sz'] != 2.5 or abs(r['I'] - 0.4) > 1e-9: bad.append(f'子星大小 / 亮度没起作用：{r}')
    # 火花 / 余烬 / 分叉 / 辉星的着色器参数都接上了
    r = await pg.evaluate("(() => { const pr = particleProgram40('spk'); return ['uInhA', 'uT0J', 'uEmbDk', 'uEmbFa', 'uBrL', 'uBrV', 'uBrKd', 'uBrT', 'uBrB', 'uBrS', 'uGlW', 'uGlPk', 'uGlDim'].filter(k => !pr.u[k]); })()")
    info['着色器参数缺'] = r
    if r: bad.append(f'火花着色器里这些参数没接上：{r}')
    # ＋ 加发射器
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(async () => { const b = document.querySelector('#exAdd'); if (!b) return { btn: false }; b.click(); await new Promise(z => setTimeout(z, 300));
      const g = document.querySelector('#params section.egrp[data-g="自定义 1"]'), tab = document.querySelector('#params .etabs [data-e="自定义 1"]');
      return { btn: true, on: state.P.x1On, tab: !!tab && !tab.hidden, sel: tab && tab.classList.contains('on'), vis: !!g && !g.hidden, mods: g ? [...g.querySelectorAll(':scope > details.mod > summary')].map(x => x.firstChild.textContent.trim()) : [] }; })()""")
    info['加发射器'] = r
    if not r.get('btn') or r.get('on') != 1 or not r.get('tab') or not r.get('vis'): bad.append(f'「＋ 加发射器」没加出「自定义 1」：{r}')
    elif [m for m in STD if m not in r['mods']]: bad.append(f'「自定义 1」没有列全 9 个模块：{r["mods"]}')
    r = await pg.evaluate("""(() => { const P = derive({ ...structuredClone(state.P), x1On: 1, x1Event: 'death', x1N: 5, x1Kind: 'dot', x1BrightCurve: '0:1, 0.5:2, 1:0' }); const s = new Sim(P);
      for (let i = 0; i < Math.ceil((P.burn * 1.4 + 0.2) / H_STEP); i++) s.step(H_STEP); const n = s.exDots.length, bh = new Float32Array(4 * 200000), bt = new Float32Array(4 * 4);
      const P0 = derive({ ...structuredClone(state.P), x1On: 0 }), s0 = new Sim(P0); for (let i = 0; i < Math.ceil((P.burn * 1.4 + 0.2) / H_STEP); i++) s0.step(H_STEP);
      const [nh] = s.gather(bh, bt), [nh0] = s0.gather(new Float32Array(4 * 200000), bt);
      const P2 = derive({ ...P, x1Kind: 'star', x1Spark: 50, x1Size: 1.7 }), s2 = new Sim(P2); for (let i = 0; i < Math.ceil((P.burn * 1.4 + 0.2) / H_STEP); i++) s2.step(H_STEP);
      const k7 = s2.all.filter(x => x.kind === 7); return { stars: P.stars, dots: n, drawn: nh - nh0, k7: k7.length, k7sz: k7[0] && k7[0].sz, curve: parseCurve(P.x1BrightCurve), mid: lifeCurveAt(parseCurve(P.x1BrightCurve), 0.25) }; })()""")
    info['自定义 1 模拟'] = r
    if r['dots'] < r['stars'] * 4 or r['drawn'] <= 0: bad.append(f'「自定义 1」星熄灭时没生成 / 没画光点：{r}')
    if r['k7'] < r['stars'] * 4 or r['k7sz'] is None: bad.append(f'「自定义 1」选「星」时没生成星：{r}')
    if not r['curve'] or len(r['curve']) != 3 or abs(r['mid'] - 1.5) > 1e-9: bad.append(f'曲线「时刻:值」没按几行点算：{r}')
    r = await pg.evaluate("""(async () => { selectEmitTab('自定义 1'); const row = panelRows.find(([r, it]) => it.curve === 'x1SizeCurve'); if (!row) return { row: false }; const inp = row[0].querySelector('input');
      inp.value = '0:1, 1:0.2'; inp.dispatchEvent(new Event('change')); await new Promise(z => setTimeout(z, 100)); const t = row[0].querySelector('.cv-keys').textContent;
      exRemoveSlot(1); await new Promise(z => setTimeout(z, 200)); const tab = document.querySelector('#params .etabs [data-e="自定义 1"]');
      return { row: true, val: state.P.x1SizeCurve, keys: t, off: state.P.x1On, tab: !!tab && !tab.hidden }; })()""")
    info['曲线 / 去掉'] = r
    if not r.get('row') or r.get('val') != '0:1, 1:0.2' or '2 个点' not in r.get('keys', ''): bad.append(f'曲线输入不对：{r}')
    if r.get('off') != 0 or r.get('tab'): bad.append(f'「去掉这个发射器」没去掉：{r}')
    # 游戏内大小：真实米数
    r = await pg.evaluate("(() => { const k = gamePixelsPerMeter({}, 300, 1080, 1000), k2 = gamePixelsPerMeter({}, 780, 1080, 1000), old = gamePixelsPerMeter({ screenFrac: 1 / 3 }, 300, 1080, 1000); return { same: Math.abs(k - k2) < 1e-12, yon: +(780 * k2).toFixed(3), d300: +(300 * k).toFixed(3), old300: +(300 * old).toFixed(3) }; })()")
    info['游戏内大小'] = r
    if not r['same'] or abs(r['yon'] - 360) > 1e-6 or abs(r['d300'] - 360 * 300 / 780) > 1e-3 or abs(r['old300'] - 360) > 1e-6: bad.append(f'游戏内大小不是真实米数（四尺玉 1000 m 占 1/3）：{r}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def w5(pg):
    """4.8.0：每个发射器的大小 / 亮度按寿命曲线"""
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('crackle')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(() => { const want = ['starSizeCurve', 'starBrightCurve', 'sparkSizeCurve', 'sparkBrightCurve', 'emberBrightCurve', 'branchBrightCurve', 'crackleSizeCurve', 'crackleBrightCurve', 'flashBrightCurve', 'subSizeCurve', 'subBrightCurve'];
      const rows = new Map(panelRows.filter(([r, it]) => it.curve).map(([r, it]) => [it.curve, r._x ? r._x.e + '›' + r._x.m : '?'])); return { miss: want.filter(k => !rows.has(k)), where: Object.fromEntries(rows), def: want.map(k => state.P[k]).filter(v => v) }; })()""")
    info['曲线行'] = r
    if r['miss']: bad.append(f'这些曲线行没有：{r["miss"]}')
    if r['def']: bad.append(f'曲线缺省不是空：{r["def"]}')
    r = await pg.evaluate("""(() => { const run = q => { const P = derive({ ...structuredClone(state.P), crackle: 6, ...q }), s = new Sim(P); const T = P.burn * 0.5;
        for (let i = 0; i < Math.ceil(T / H_STEP); i++) s.step(H_STEP); const st = s.stars.find(x => x.alive && x.kind === 0); return { I: st ? s.headI(st) : null }; };
      const a = run({}), b = run({ starBrightCurve: '0:0.25, 1:0.25' });
      const c = (q => { const P = derive({ ...structuredClone(state.P), crackle: 6, crackleSizeJit: 0, crackleBrightJit: 0, ...q }), s = new Sim(P); for (let i = 0; i < Math.ceil((P.burn * 1.3 + 0.5) / H_STEP); i++) s.step(H_STEP);
        const f = s.flashes.find(f => f.crk); if (!f) return null; s.t = f.t0 + f.cut * 0.5; const bh = new Float32Array(4 * 400000), [nh] = s.gather(bh, new Float32Array(8)); for (let i = 0; i < nh; i++) if (Math.abs(bh[i * 4] - f.x) < 1e-3 && Math.abs(bh[i * 4 + 1] - f.y) < 1e-3) return { I: bh[i * 4 + 2], sz: bh[i * 4 + 3] }; return 'notfound'; });
      return { star: [a.I, b.I], crk: [c({}), c({ crackleBrightCurve: '0:2, 1:2', crackleSizeCurve: '0:3, 1:3' })] }; })()""")
    info['模拟'] = r
    if not (r['star'][0] and r['star'][1] and abs(r['star'][1] / r['star'][0] - 0.25) < 1e-6): bad.append(f'星头亮度随寿命没起作用：{r["star"]}')
    k = r['crk']
    if not (isinstance(k[0], dict) and isinstance(k[1], dict) and abs(k[1]['I'] / k[0]['I'] - 2) < 1e-6 and abs(k[1]['sz'] / k[0]['sz'] - 3) < 1e-6): bad.append(f'爆裂小闪大小 / 亮度随寿命没起作用：{k}')
    r = await pg.evaluate("(() => { const pr = particleProgram40('spk'); return ['uCvSpS[0]', 'uCvSpSN', 'uCvSpB[0]', 'uCvSpBN', 'uCvEmB[0]', 'uCvEmBN', 'uCvBrB[0]', 'uCvBrBN'].filter(k => !pr.u[k]); })()")
    info['着色器缺'] = r
    if r: bad.append(f'火花着色器里曲线参数没接上：{r}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


async def w6(pg):
    """4.8.1：导出可以取消、不叠两个"""
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(async () => { window.__fl = []; const of = flash; flash = (m, e) => { window.__fl.push([String(m), !!e]); return of(m, e); };
      const ob = bakeFinal, orf = refineBake, od = download; let dl = 0; download = () => { dl++; };
      bakeFinal = async (P, sc, onProg) => { for (let i = 0; i <= 40; i++) { onProg && onProg(i / 40); await new Promise(z => setTimeout(z, 25)); } return ob(P, sc); };
      refineBake = async () => null; const keep = state.bake; state.bake = null;
      const run = exportMaster(); await new Promise(z => setTimeout(z, 120));
      const btn = document.querySelector('#busy .busy-cancel'), shown = !!btn && !btn.hidden;
      await exportMaster(); const blocked = window.__fl.some(([m, e]) => e && /正在导出/.test(m));
      if (btn) btn.click(); await run; const cancelled = window.__fl.some(([m, e]) => e && /已取消/.test(m));
      const after = { on: busyJob.on, hidden: $('#busy').hidden };
      bakeFinal = ob; refineBake = orf; download = od; flash = of; state.bake = keep;
      return { shown, blocked, cancelled, dl, after }; })()""")
    bad = []
    if not r['shown']: bad.append('导出时进度条旁没有「取消」')
    if not r['blocked']: bad.append('导出没做完再点导出，没拦住')
    if not r['cancelled'] or r['dl'] or r['after']['on'] or not r['after']['hidden']: bad.append(f'点了取消没停下 / 停下后状态没复原：{r}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(r, ensure_ascii=False)


W7_JS = r'''async () => {
  const bad = [], out = {};
  const rowOf = k => (panelRows.find(([r, it]) => Array.isArray(it) && it[0] === k) || [])[0];
  // 链条：每个联动的值；senrin 有子花，rtVt / rtFadeFps 在升空尾缀
  const fams = { senrin: ['subKeep', 'subSpeedJit', 'subGrav', 'subFlash', 'flashR', 'subSize', 'subBright', 'subFlashR', 'subVt'], tailM: ['rtFadeFps', 'rtVt'] };
  for (const [t, ks] of Object.entries(fams)) {
    await openType(t); await new Promise(r => setTimeout(r, 200));
    if (t === 'tailM') { state.P.rtBall = 1; buildMasterPanel(); onParam(); }     // 终端速度只在平方阻力弹道时有
    for (const k of ks) {
      const row = rowOf(k), a = AUTO_DEF[k]; if (!row || !a) { bad.push(`${t} ${k} 没有这一行 / 不在联动表`); continue; }
      if (row.hidden && !(state.P.rtBall === 1 && k === 'rtVt')) { /* 当前发射器标签外的行是藏着的，不影响 */ }
      const bt = row.querySelector('.chain'), num = row.querySelector('.num'), rg = row.querySelector('input[type=range]'), tx = (row.querySelector('.adef-t') || {}).textContent || '';
      const P0 = structuredClone(state.P), v0 = state.P[k], want = a[1](state.P);
      const r = { linked: bt && bt.getAttribute('aria-pressed') === 'true', gray: row.classList.contains('adef-on'), dis: rg.disabled || num.disabled, shown: +num.value, want, tx };
      if (!bt) { bad.push(`${t} ${k} 没有链条`); continue; }
      if (!autoLinked(k, v0)) { out[t + '.' + k] = { note: '这个模板填了数（断开）', v0 }; state.P[k] = a[3]; onParam(); row._refresh(); r.linked = bt.getAttribute('aria-pressed') === 'true'; r.shown = +num.value; r.gray = row.classList.contains('adef-on'); }
      if (!r.linked || !r.gray || r.dis) bad.push(`${t} ${k} 接着时链条 / 灰字 / 能拖不对 ${JSON.stringify(r)}`);
      if (Math.abs(r.shown - want) > 0.051 * Math.max(1, Math.abs(want))) bad.push(`${t} ${k} 接着时显示 ${r.shown}，算出来是 ${want}`);
      // 直接输入 → 断开，存你填的数
      const typed = +(Math.max(a[0], want) * 1.5 + 1).toFixed(2); num.value = String(typed); num.dispatchEvent(new Event('change'));
      r.typed = { v: state.P[k], linked: bt.getAttribute('aria-pressed') === 'true', tx: (row.querySelector('.adef-t') || {}).textContent };
      if (Math.abs(r.typed.v - typed) > 1e-9 || r.typed.linked || !/跟着算是/.test(r.typed.tx)) bad.push(`${t} ${k} 直接输入没断开 / 没存你填的数 ${JSON.stringify(r.typed)}`);
      bt.click(); r.relink = { v: state.P[k], linked: bt.getAttribute('aria-pressed') === 'true' };
      if (r.relink.v !== a[3] || !r.relink.linked) bad.push(`${t} ${k} 点链条没接回去 ${JSON.stringify(r.relink)}`);
      bt.click(); r.unlink = { v: state.P[k], linked: bt.getAttribute('aria-pressed') === 'true' };
      if (Math.abs(r.unlink.v - Math.max(a[0], want)) > 1e-9 || r.unlink.linked) bad.push(`${t} ${k} 点链条断开没固定在算出来的值 ${JSON.stringify(r.unlink)}`);
      state.P = derive(P0); buildMasterPanel(); onParam();
      out[t + '.' + k] = Object.assign(out[t + '.' + k] || {}, { want: +(+want).toFixed(3), ok: true });
    }
  }
  // 联动 = 填进算出来的数：子花的几项按哨兵值和按算出来的数模拟，子星一模一样
  { const base = derive({ ...structuredClone(defaultsFor('senrin').P), type: 'senrin' }), fill = { ...structuredClone(base) };
    for (const k of ['subKeep', 'subSpeedJit', 'subGrav', 'subSize', 'subBright', 'subVt']) fill[k] = AUTO_DEF[k][1](base);
    const run = P => { const s = new Sim(derive(P)); for (let i = 0; i < Math.ceil((P.subDelay + 0.6) / H_STEP); i++) s.step(H_STEP); return s.all.filter(x => x.kind === 2).slice(0, 6).map(x => [x.x, x.y, x.z, +x.sz > 0 ? x.sz : P.headSize, x.I].map(v => +(+v).toFixed(4)).join(',')).join(' '); };
    const a = run(base), b = run(fill); out.sub = a === b; if (a !== b) bad.push('子花按「跟着算」和按算出来的数模拟不一样'); }
  // 旧（待删）：菊没用上的收起来、模块底下有开关；搜索能找到；用着的照常显示带「旧」
  await openType('kiku'); await new Promise(r => setTimeout(r, 200)); selectEmitTab('火花');
  const L = k => (panelRows.find(([r, it]) => (Array.isArray(it) ? it[0] : it.sel) === k) || [])[0];
  const pinch = L('tailPinchHead'), sw = pinch && pinch.closest('details').querySelector('.oldb');
  out.kiku = { pinchHidden: pinch && pinch.hidden, tag: !!(pinch && pinch.querySelector('.old-tag')), btn: sw && !sw.hidden ? sw.textContent : null };
  if (!pinch || !pinch.hidden || !out.kiku.tag || !out.kiku.btn) bad.push('菊的「星头端收尖」（旧）没收起来 / 没「旧」标记 / 模块底下没开关 ' + JSON.stringify(out.kiku));
  if (sw) { sw.click(); out.kiku.open = !pinch.hidden; sw.click(); out.kiku.closed = pinch.hidden; if (!out.kiku.open || !out.kiku.closed) bad.push('「旧（待删）」开关点了不显示 / 再点不收起 ' + JSON.stringify(out.kiku)); }
  const q = document.querySelector('#params .ptools input[type=search]'); q.value = '收尖'; q.dispatchEvent(new Event('input')); out.kiku.search = !pinch.hidden; q.value = ''; q.dispatchEvent(new Event('input'));
  if (!out.kiku.search) bad.push('搜「收尖」找不到收起来的旧参数');
  state.P.tailPinchHead = 0.4; onParam(); out.kiku.inUse = !pinch.hidden; state.P.tailPinchHead = 0; onParam();
  if (!out.kiku.inUse) bad.push('填了「星头端收尖」以后它还收着（用着的旧参数应照常显示）');
  // 所有花型打开时参数值不变（链条、收起只是界面）
  const changed = [];
  for (const t of Object.keys(TYPES)) { if (t === 'blank') continue; const d = derive({ ...structuredClone(defaultsFor(t).P), type: t }); await openType(t); const P = state.P;
    for (const k of Object.keys(AUTO_DEF).concat(Object.keys(LEGACY))) if (String(P[k]) !== String(d[k])) changed.push(`${t}.${k} ${d[k]}→${P[k]}`); }
  out.changed = changed.slice(0, 8); if (changed.length) bad.push('打开花型时联动 / 旧参数的值变了：' + changed.slice(0, 5).join('；'));
  return { ok: !bad.length, bad, out };
}'''


async def w7(pg):
    """4.9.0：链条（Q1）+ 旧（待删）收起"""
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate(W7_JS)
    return r['ok'], ('；'.join(r['bad']) + ' ｜ ' if r['bad'] else '') + json.dumps(r['out'], ensure_ascii=False)[:900]


async def w8(pg):
    """4.9.1：身份条"""
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    rd = "(() => { wbSync(); return { name: $('#abIdName').textContent, chips: [...document.querySelectorAll('#abIdChips .idc')].map(c => c.textContent), hidden: $('#abId').hidden, ab: $('#abState').textContent }; })()"
    r = await pg.evaluate(rd); info['菊'] = r
    if r['hidden'] or '菊' not in r['name'] or '花型模板' not in r['chips'] or '原始' not in r['chips']: bad.append(f'菊打开时身份条不对：{r}')
    await pg.evaluate("(() => { bakeMode.auto = false; state.P.stars += 3; onParam(); return 0; })()"); await pg.wait_for_timeout(900)
    r = await pg.evaluate(rd); info['改了'] = r
    if '● 没保存' not in r['chips']: bad.append(f'改了参数，身份条没标「没保存」：{r}')
    if '烘焙中' in r['ab'] or '贴图是旧的' not in r['ab']: bad.append(f"自动烘焙关时改参数，顶栏写的是「{r['ab']}」（应写贴图是旧的）")
    await pg.evaluate("(() => { wbAutoExport('检查'); return 0; })()")
    r = await pg.evaluate(rd); info['导出后'] = r['chips']
    if '素材包 ✓' not in r['chips']: bad.append(f'导出后身份条没标素材包一致：{r}')
    await pg.evaluate("(() => { state.P.stars += 2; onParam(); return 0; })()")
    r = await pg.evaluate(rd); info['导出后又改'] = r['chips']
    if '素材包要重导' not in r['chips']: bad.append(f'导出后又改，身份条没标「素材包要重导」：{r}')
    await pg.evaluate("(() => { state.P.stars -= 5; onParam(); bakeMode.auto = null; return 0; })()")
    key = await pg.evaluate("(() => { const ef = EFFS().find(f => f.阶段 === '待验收' && f.待验收版 && effReady(f).ok); return ef ? ef.key : null; })()")
    if key:
        await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openEffect(EFFS().find(e => e.key === {json.dumps(key)}))).finally(() => window.__opening = false); return 0; }})()"); await idle(pg)
        r = await pg.evaluate(rd); info['AI ' + key] = r['chips']
        if not any(c.startswith('AI · ') for c in r['chips']) or '素材包 ✓' not in r['chips']: bad.append(f'就绪的待验收效果身份条不对：{r}')
    else: bad.append('找不到就绪的待验收效果')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)[:900]


async def w9(pg):
    """4.9.2：时间约束提示、超出滑杆范围、单束说明"""
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(() => { const fl = []; const of = flash; flash = (m, e, ms) => { fl.push(String(m)); return of(m, e, ms); };
      const P = state.P, b = +P.burn; setTimingParam('sparkStop', +(b * 0.6).toFixed(2)); stage2.tnote = null;     // 先把火花停止时刻打开（填一个数），再往后推
      setTimingParam('sparkStop', +(b + 0.8).toFixed(2)); const a1 = { burn: +P.burn, stop: +P.sparkStop, msg: fl.slice(-1)[0] || '' };
      stage2.tnote = null; setTimingParam('burn', +(b * 0.5).toFixed(2)); const a2x = 0; const a2 = { burn: +P.burn, stop: +P.sparkStop, msg: fl.slice(-1)[0] || '' };
      flash = of; return { b, a1, a2 }; })()""")
    info['时间约束'] = r
    if not (r['a1']['burn'] > r['b'] + 1e-6 and '燃烧时间' in r['a1']['msg'] and '跟着变了' in r['a1']['msg']): bad.append(f"火花停止时刻推后、燃烧时间被推着走，没提示：{r['a1']}")
    if not ('火花停止时刻' in r['a2']['msg'] and '跟着变了' in r['a2']['msg']): bad.append(f"燃烧时间缩短、火花停止时刻被收回来，没提示：{r['a2']}")
    r = await pg.evaluate("""(() => { const x = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'crackle'); if (!x) return null; const row = x[0], num = row.querySelector('.num'), max = +row.querySelector('input[type=range]').max;
      num.value = String(max * 2.5); num.dispatchEvent(new Event('change')); const o = { v: state.P.crackle, max, over: row.classList.contains('over'), tip: num.title };
      num.value = String(max / 2); num.dispatchEvent(new Event('change')); o.back = row.classList.contains('over'); state.P.crackle = 0; onParam(); row._refresh(); return o; })()""")
    info['超出滑杆'] = r
    if not r or not r['over'] or '照样起作用' not in r['tip'] or r['back'] or abs(r['v'] - r['max'] * 2.5) > 1e-6: bad.append(f'数值超出滑杆范围没标出来 / 没写明：{r}')
    r = await pg.evaluate("(() => { renderUnitMenu(); return $('#abUnitMenu').textContent; })()")
    if '不受力' not in r: bad.append('单束导出菜单没写明贴图里的星不受力、随机关了')
    r = await pg.evaluate("""(() => { const d = $('#previewSettings'), c = $('#previewBloomChk'); if (!c) return null; const g0 = state.gen, b0 = !!+state.P.previewBloom;
      d.open = true; d.dispatchEvent(new Event('toggle')); const shown = c.checked === b0; c.checked = !b0; c.dispatchEvent(new Event('change'));
      const o = { shown, after: +state.P.previewBloom, want: b0 ? 0 : 1, gen: state.gen - g0, label: c.closest('label').textContent };
      c.checked = b0; c.dispatchEvent(new Event('change')); d.open = false; return o; })()""")
    info['预览泛光'] = r
    if not r or not r['shown'] or r['after'] != r['want'] or r['gen'] or '引擎里没有' not in r['label']: bad.append(f'预览设置里的「预览泛光」不对（要能开关、不触发烘焙、写明引擎里没有）：{r}')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)[:900]


async def x2(pg):
    """4.4.2（用户 10-04 21:17）：单层效果（牡丹模板）也有「导出方案」：输出 › 导出方案里 PC 能选 GPU 光点 / 单束 / 不出，手机能选不出；选光点后 cascade.json 是一个 GPU 光点发射器、引擎回放画光点、说明写有尾迹没了"""
    bad, info = [], {}
    await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('botan')).finally(() => window.__opening = false); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(() => { selectEmitTab('输出'); const x = panelRows.find(([r, it]) => it.sel === 'outPC'); if (!x) return null; const s = x[0].querySelector('select');
      return { mod: x[0]._x.e + '›' + x[0]._x.m, shown: !x[0].hidden, opts: [...s.options].map(o => o.value) }; })()""")
    info['牡丹'] = r
    if not r or r['mod'] != '输出›导出方案' or not r['shown'] or r['opts'] != ['seq', 'unit', 'dots', 'off']: return False, f'单层的导出方案不对：{r}'
    await pg.evaluate("(() => { const s = panelRows.find(([r, it]) => it.sel === 'outPC')[0].querySelector('select'); s.value = 'dots'; s.dispatchEvent(new Event('change')); return 0; })()"); await idle(pg)
    r = await pg.evaluate("""(() => { const so = singleOut(state.P), b = state.bake, pc = b ? fwlCombo('T', [{ L: singleLayer(state.P, state.M), b, i: 0, dots: true }], false) : null;
      const dot = panelRows.find(([r, it]) => Array.isArray(it) && it[0] === 'dotSize');
      return { so, em: pc ? pc.emitters.map(e => [e.name, e.gpu, pc.materials[e.material].role]) : null, dotRow: !!dot && !dot[0].hidden, note: ((document.querySelector('#params [data-info=schemeNote]') || {}).textContent || ''), n: dotsCount(state.P) }; })()""")
    info['选光点'] = r
    if r['so'] != {'pc': 'dots', 'mobile': 'seq'}: bad.append(f"方案没记住：{r['so']}")
    if r['em'] != [['L1_Dots', True, 'soft_dot']]: bad.append(f"cascade.json 不是一个 GPU 光点发射器：{r['em']}")
    if not r['dotRow']: bad.append('选了光点，没出现光点大小 / 亮度')
    if 'GPU 光点' not in r['note']: bad.append(f"导出说明没写 GPU 光点：{r['note'][:60]}")
    # 引擎回放（云端快速模式不真画）：单层 PC 按光点画、手机按序列；光点数 = 模拟里会亮的星
    r = await pg.evaluate("(() => { const so = singleOut(state.P), v = dotVis(state.P); return { pc: so.pc, mobile: so.mobile, n: singleDotsTables(state.P, state.M, state.bake)[0].list.length, lit: v ? v.n : 0 }; })()")
    info['引擎回放'] = r
    if r['pc'] != 'dots' or r['mobile'] != 'seq' or not r['n'] or r['n'] != r['lit']: bad.append(f'引擎回放的光点不对：{r}')
    await pg.evaluate("(() => { state.P.outPC = 'seq'; buildMasterPanel(); onParam(); selectEmitTab('星'); return 0; })()"); await idle(pg)
    # 4.4.4 点灭：光点的 Color Over Life 写成方波（以前按相对寿命平均掉了、不闪）；不点灭的花型照旧。
    # 亮的时间占比 ≈ 点灭占空比（以前取整对不上时亮边拖成斜坡、亮得晚）
    r = await pg.evaluate("""(() => { const flips = t => { const d = defaultsFor(t, 40, true), P = derive({ ...structuredClone(d.P), type: t }), e = dotsES({ ...d.M, delay: 0, rate: 1, scale: 1 }, P, d.M, null);
        const l = e.col.map(([u, c]) => c[0] + c[1] + c[2]); let n = 0; for (let i = 1; i < l.length; i++) if (Math.max(l[i], l[i - 1]) > 0.05 && Math.abs(l[i] - l[i - 1]) > 0.5 * Math.max(l[i], l[i - 1])) n++;
        let on = 0, m = 0; if (+P.strobeHz > 0) { const v0 = dotVis({ ...P, strobeHz: 0 }), env = [[0, v0.alpha[0][1]], ...v0.alpha, [1, v0.alpha[v0.alpha.length - 1][1]]], u0 = +P.strobeStart || 0;
          for (let i = 0; i < 2000; i++) { const u = u0 + (1 - u0) * (i + .5) / 2000, en = esCurve(env, u); if (en < 1e-3) continue; m++; if (esCurve(e.ak, u) > en * 0.8) on++; } }
        return { n, on: m ? +(on / m).toFixed(3) : null, duty: +P.strobeDuty || 0.35 }; };
      return { strobe: flips('strobe'), kiku: flips('kiku') }; })()""")
    info['光点点灭'] = r
    if r['strobe']['n'] < 10: bad.append(f"点灭星的光点 Color Over Life 没有亮灭（翻转 {r['strobe']['n']} 次）")
    elif abs(r['strobe']['on'] - r['strobe']['duty']) > 0.06: bad.append(f"点灭星的光点亮的时间占比 {r['strobe']['on']}，和占空比 {r['strobe']['duty']} 对不上")
    if r['kiku']['n'] > 4: bad.append(f"菊（不点灭）的光点亮度曲线多出了亮灭（翻转 {r['kiku']['n']} 次）")
    # 多层效果里不显示（多层在层页头选）
    await open_effect(pg, 'hiki_nishiki'); await idle(pg)
    r = await pg.evaluate("(() => { selectComboLayer(1); const x = panelRows.find(([r, it]) => it.sel === 'outPC'); return x ? !x[0].hidden : false; })()")
    if r: bad.append('多层效果的层里也显示了单层的导出方案（多层应在层页头选）')
    return not bad, ('；'.join(bad) + ' ｜ ' if bad else '') + json.dumps(info, ensure_ascii=False)


N3_JS = r"""(() => {
  // 排查计划第 1 步：SCHEMA ↔ BASE / 花型默认值 ↔ 参数名称表 ↔ 发射器表 ↔ INERT / RAND_OF / SPARK_KEYS / PHASE_KEY / TIMING_KEYS / BLANK_MODS，缺一边就报
  const bad = [], keys = new Set(), items = [];
  for (const sec of SCHEMA) for (const it of sec.items) { const k = Array.isArray(it) ? it[0] : it.sel || it.text || it.curve || (it.info ? 'info:' + it.info : ''); if (!k) continue; keys.add(k); items.push([sec, it, k]); }
  const types = Object.keys(TYPES), D = types.map(t => defaultsFor(t).P);
  for (const [sec, it, k] of items) {
    if (!k.startsWith('info:') && k !== '_trailTier' && !(k in BASE) && !D.some(P => P[k] !== undefined)) bad.push(`「${sec.sec}」的 ${k} 没有默认值（BASE 和所有花型模板都没有）`);
    const nm = pnameOf(sec.sec, k, Array.isArray(it) ? (typeof it[1] === 'function' ? '' : it[1]) : it.label);
    if (!nm) { bad.push(`「${sec.sec}」的 ${k} 在参数名称表里没有`); continue; }
    if (!PEMIT.P[nm.id]) bad.push(`${k}（${nm.id}）在发射器表里没有`);
  }
  const has = (k, where) => { if (!keys.has(k)) bad.push(`${where} 里的 ${k} 不是面板参数`); };
  for (const [ks] of INERT) ks.forEach(k => has(k, 'INERT'));
  for (const [k, b] of Object.entries(RAND_OF)) { has(k, 'RAND_OF'); has(b, 'RAND_OF'); }
  SPARK_KEYS.forEach(k => has(k, 'SPARK_KEYS')); Object.keys(PHASE_KEY).forEach(k => has(k, 'PHASE_KEY')); [...TIMING_KEYS].forEach(k => has(k, 'TIMING_KEYS'));
  for (const [m, x] of Object.entries(BLANK_MODS)) for (const k of [...Object.keys(x.add || {}), ...Object.keys(x.off || {})]) if (!(k in BASE)) bad.push(`BLANK_MODS「${m}」的 ${k} 不在 BASE 里`);
  const used = new Set(items.map(([sec, it, k]) => { const nm = pnameOf(sec.sec, k, Array.isArray(it) ? (typeof it[1] === 'function' ? '' : it[1]) : it.label); return nm && nm.id; }));
  const SPEC_BOX = ['texW', 'texH', 'cols', 'rows', 'chans', 'outMode', 'encGamma', 'frameMode', 'zoom'];     // 规格框（#specBox）里的控件，不在 SCHEMA
  const orphan = PNAMES.filter(r => !used.has(r.id) && !SPEC_BOX.includes(r.key)).map(r => r.id);
  return { bad, n: items.length, orphan };
})()"""


async def n3(pg):
    """排查计划第 1 步：SCHEMA 每一项都有默认值、名称表的名字、发射器表的归属；INERT / RAND_OF / SPARK_KEYS / PHASE_KEY / TIMING_KEYS 里的键都是面板参数；名称表里没有对不上 SCHEMA 的行"""
    r = await pg.evaluate(N3_JS)
    bad = list(r['bad']) + ([f"参数名称表里有 {len(r['orphan'])} 行对不上面板：{r['orphan'][:6]}"] if r['orphan'] else [])
    return not bad, '；'.join(bad[:8]) or f"{r['n']} 项面板参数：默认值、名字、发射器归属、规则表都对得上"


async def main():
    global HTML, REAL
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--out', default=''); ap.add_argument('--html', default=''); ap.add_argument('--real', action='store_true')
    a = ap.parse_args(); only = set(x for x in a.only.split(',') if x); REAL = a.real
    if a.html: HTML = pathlib.Path(a.html).resolve().as_uri() + '?fast'
    from playwright.async_api import async_playwright
    res = []
    async with async_playwright() as p:
        b = await launch_async(p)
        for name, fn, own in [('A1', a1, False), ('A2', a2_same, True), ('A3', a3, False), ('A4', a4, False), ('A5', a5, False), ('A6', a6, False), ('A7', a7, True), ('P1', p1, False), ('U1', u1, False), ('B1', b1, False), ('V1', v1, False), ('X1', x1, False), ('G1', g1, False), ('K1', k1, False), ('K2', k2, False), ('R1', r1, False), ('N1', n1, False), ('N2', n2, False), ('S1', s1, False), ('S2', s2, True), ('S3', s3, False), ('S4', s4, False), ('E1', e1, False), ('X2', x2, False), ('N3', n3, False), ('R5', r5, False), ('R6', r6, False), ('W1', w1, False), ('W2', w2, False), ('W3', w3, False), ('W4', w4, False), ('W5', w5, False), ('W6', w6, False), ('W7', w7, False), ('W8', w8, False), ('W9', w9, False), ('L1', l1, True)]:
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
