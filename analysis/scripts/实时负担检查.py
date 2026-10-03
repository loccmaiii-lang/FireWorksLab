#!/usr/bin/env python3
"""实时负担检查（对话框2，2026-10-03；用户 17:28：①打开制作中的效果烘一会儿白屏 ②四尺玉 / 金芒菊实时模拟一顿一顿）

  M1 内存：打开每个效果、实时模拟走几帧以后，显存（纹理字节）≤ 400 MB、JS 堆 ≤ 600 MB、每张星轨道纹理 ≤ 64 MB；
     待验收 / 已通过的效果星轨道时间分辨率不变（不改它们的样子）
  M2 实时模拟按显卡负担调快门子样本：负担（每个子样本要画的火花数 × 子样本数）超出预算时少画几个子样本、HUD 写明；
     预算按实际帧时间自动升降；烘焙中实时模拟让出显卡（子样本压到最少）；烘焙本身的子样本不受影响
  M4 打开效果时同一份参数的整段预跑（measure）和星轨道（buildTrack）只真算一次：实时模拟的取景 / 镜头 / 范围、烘焙、收紧共用（10-03 SMOKE16：片贝、鸿巢打开时主线程一停几秒，就是这几样各算一遍）
  M5 单层实时模拟的超采样画布有上限：高分屏（画布约 2000 px）+ 4×4 超采样（球形A 的层是 qSS 4）以前一张 8000² 的 16 位浮点画布 512 MB，现在边长 ≤ 4096
  M6 实时模拟不倒回（4.2.22）：实时模拟一帧里不做快照 / 恢复、物理步数 ≈ 只往前走的量（以前每帧倒回重走快门窗口，5 倍物理步 + 每帧深拷贝几百颗星）；
     「回推」画出来的星头和精确倒回的那一帧差别很小（平均像素差 < 1/255、不一样的像素 < 2%）；烘焙 / 定帧不走这条路
  M3 显卡上下文丢失（显存不够 / 驱动超时重置）：不再白屏不说话，画面上写原因和怎么办，渲染循环停下不刷错误
  M7 烘焙不挡实时模拟（4.2.23，对话框15；SMOKE18：打开鸿巢后头 5 秒约 3 秒没画面、引菊→锦约 2 秒）：
     ① 烘焙一次只交一小批显卡活（每批的快门子样本数按实测速度定，检查里强制每批 1 个），批与批之间回到页面、并等显卡做完（fence）；
        以前每 8 帧才让出一次 → 一个任务里交了 8 帧 × 全部子样本
     ② 分批烘出来的贴图和不分批（bakePace.on = false）逐字节相同
     ③ 烘完的自检（analyze：每帧扫一遍整张贴图）不再一口气占住页面：2048² 一页里最长的一个任务 < 200 ms（以前 1–3 s）
     ④ 4.2.25（SMOKE19：4.2.23 打开引菊→锦 45 s / 超时）：等显卡的那一下有固定延迟时（这里模拟每个 fence 至少 17 ms 才报完成，
        像浏览器按帧刷新状态），分批烘焙不能被拖成「一帧一个子样本」：总时长 ≤ 不分批的 2 倍 + 1 s

  云端没有显卡：画图换成空操作，只量内存、子样本数和逻辑。真实帧率要本机任务（SMOKE / 条目体检）看。
"""
import argparse, asyncio, json, re, sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from browser_runtime import chromium_options

ROOT = pathlib.Path(__file__).resolve().parents[2]
HTML = (ROOT / 'tool' / 'FireworkBaker.html').as_uri() + '?fast'
FAKE = re.search(r'FAKE = r"""(.*?)"""', (ROOT / 'analysis' / 'scripts' / '界面状态检查.py').read_text(encoding='utf-8'), re.S).group(1)
GPU = r"""(() => {
  const g = gl, live = new Map(); window.__gpu = { cur: 0, peak: 0, maxTex: 0 };
  const bpp = (f, type) => ({ [g.RGBA16F]: 8, [g.RGBA32F]: 16, [g.RGBA8]: 4, [g.R32F]: 4, [g.RG16F]: 4 })[f] || (type === g.FLOAT ? 16 : 4);
  const oT = g.texImage2D.bind(g), oD = g.deleteTexture.bind(g);
  g.texImage2D = function (...a) { const tex = g.getParameter(g.TEXTURE_BINDING_2D); if (a.length >= 8 && typeof a[3] === 'number') { const b = a[3] * a[4] * bpp(a[2], a[7]), o = live.get(tex) || 0; live.set(tex, b);
    __gpu.cur += b - o; __gpu.peak = Math.max(__gpu.peak, __gpu.cur); __gpu.maxTex = Math.max(__gpu.maxTex, b); } return oT(...a); };
  g.deleteTexture = function (t) { __gpu.cur -= live.get(t) || 0; live.delete(t); return oD(t); };
  window.__draws = 0; const oB = drawParticleBatch; drawParticleBatch = (n, m) => { window.__draws += n; };      // 不真画（云端软件渲染太慢），记画了多少
  hazeSamples40 = () => {}; packCell40 = () => {}; shadeView40 = () => {}; post = () => {};
  return 0; })()"""
# 不改样子：这些效果的星轨道时间步（dt）应和改之前一样
KEEP = ['jinmangju', 'hongchao', 'hiki_nishiki', 'qingning']


async def page(p, opts, stub=True, fake=True):
    b = await p.chromium.launch(**opts)
    ctx = await b.new_context(viewport={'width': 1200, 'height': 800}); pg = await ctx.new_page()
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
    await pg.add_init_script("window.requestAnimationFrame = () => 0;")
    await pg.goto(HTML, wait_until='load', timeout=0); await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
    if fake: await pg.evaluate(FAKE)
    if stub: await pg.evaluate(GPU)
    return b, pg, errs


async def open_eff(pg, k):
    await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openEffect(EFFS().find(e => e.key === {json.dumps(k)}))).finally(() => window.__opening = false); return 0; }})()")
    for _ in range(80):
        await pg.wait_for_timeout(250)
        if await pg.evaluate("!window.__opening && !state.baking && !(state.layerQueue && state.layerQueue.size)"): break


FRAMES = r"""async (n) => { state.view = 'live'; let now = 1000; lastT = now; let hp = performance.memory.usedJSHeapSize;
  for (let i = 0; i < n; i++) { now += 1000 / 60; state.t = 0.5 + i * 0.25; loop(now); hp = Math.max(hp, performance.memory.usedJSHeapSize); await new Promise(r => setTimeout(r, 0)); }
  const tr = Object.entries(live).filter(([k, s]) => s && s.R40 && s.R40.track).map(([k, s]) => [k, s.R40.track.nStars, s.R40.track.Ns, +s.R40.track.dt.toFixed(6)]);
  return { heapMB: Math.round(hp / 1e6), gpuMB: Math.round(__gpu.peak / 1e6), maxTexMB: Math.round(__gpu.maxTex / 1e6), tracks: tr }; }"""


async def m1(p, opts, effs, base):
    bad, info = [], {}
    for k in effs:
        b, pg, errs = await page(p, opts)
        try:
            await open_eff(pg, k); r = await pg.evaluate(FRAMES, 12); info[k] = r
            if r['gpuMB'] > 400: bad.append(f"{k} 显存 {r['gpuMB']} MB")
            if r['heapMB'] > 600: bad.append(f"{k} JS 堆 {r['heapMB']} MB")
            if r['maxTexMB'] > 64: bad.append(f"{k} 一张纹理 {r['maxTexMB']} MB")
            if errs: bad.append(f'{k} 页面错误 {errs[0]}')
            if k in base and base[k] != [x[3] for x in r['tracks']]: bad.append(f"{k} 星轨道时间步变了 {base[k]} → {[x[3] for x in r['tracks']]}（会改样子）")
        finally: await b.close()
    return not bad, bad, info


async def m2(p, opts):
    bad, info = [], {}
    b, pg, errs = await page(p, opts)
    try:
        await open_eff(pg, 'hongchao')
        # 自动化里默认不压（检查要和烘焙一致）；打开自动、把预算设小 → 子样本变少、HUD 写明；烘焙路径不受影响
        r0 = await pg.evaluate("(() => { state.view = 'live'; state.t = 3; window.__draws = 0; let now = 2000; lastT = now; loop(now + 16); return { draws: __draws, cap: liveCtl.lastCap, full: liveCtl.lastFull, hud: $('#hud').textContent }; })()")
        info['默认'] = r0
        if r0['cap'] and r0['cap'] < r0['full']: bad.append(f"自动化里默认就压了子样本：{r0}")
        r1 = await pg.evaluate("(() => { liveCtl.auto = true; liveCtl.budget = 3e6; window.__draws = 0; let now = 3000; lastT = now; loop(now + 16); return { draws: __draws, cap: liveCtl.lastCap, full: liveCtl.lastFull, hud: $('#hud').textContent }; })()")
        info['预算 3M'] = r1
        if not (r1['cap'] and r1['cap'] < r1['full']): bad.append(f'预算小了子样本没少：{r1}')
        if not r0['draws'] or r1['draws'] > r0['draws'] * 0.6: bad.append(f"画的量没明显少：{r0['draws']} → {r1['draws']}")
        if '子样本' not in r1['hud']: bad.append(f"HUD 没写明：{r1['hud']}")
        # 帧时间慢 → 预算自动降；快 → 回升
        r2 = await pg.evaluate("(() => { liveCtl.budget = 2e7; liveCtl.ema = 0.08; liveCtl.lastAdj = 0; liveAdapt(performance.now()); const a = liveCtl.budget; liveCtl.ema = 0.012; liveCtl.lastAdj = 0; liveAdapt(performance.now()); return [a, liveCtl.budget]; })()")
        info['自动升降'] = r2
        if not (r2[0] < 2e7 and r2[1] > r2[0]): bad.append(f'预算没跟帧时间升降：{r2}')
        # 烘焙中：让出显卡
        r3 = await pg.evaluate("(() => { liveCtl.budget = 1e9; state.baking = true; window.__draws = 0; let now = 4000; lastT = now; loop(now + 16); const o = { cap: liveCtl.lastCap, full: liveCtl.lastFull }; state.baking = false; return o; })()")
        info['烘焙中'] = r3
        if not (r3['cap'] and r3['cap'] <= 3): bad.append(f'烘焙中实时模拟没让出显卡：{r3}')
        # 烘焙本身不受影响（drawFrameSamples40 在烘焙里用满子样本）
        r4 = await pg.evaluate("""(() => { liveCtl.budget = 1e6; const e = layerEntryOf(state.layers[0]), P = e.P, pl = displayPlan40(P), R = makeRenderer(P, 'burst'); const q = qualityOf(P);
            let n = 0; const oD = R.draw; R.draw = (...a) => { n++; }; const t = 6, [a, b] = shutterWindow(P, pl, t); drawFrameSamples40(P, pl, R, t, frameView40(pl, t), 100); R.dispose();
            return { n, want: clamp(Math.ceil((b - a) * q.hz), 1, q.maxSub) }; })()""")
        info['烘焙子样本'] = r4
        if r4['n'] != r4['want']: bad.append(f'烘焙 / 定帧的子样本被压了：{r4}')
        if errs: bad.append('页面错误 ' + errs[0])
    finally: await b.close()
    return not bad, bad, info


async def m3(p, opts):
    bad, info = [], {}
    b, pg, errs = await page(p, opts)
    try:
        await open_eff(pg, 'jinmangju')
        await pg.evaluate("(() => { const x = gl.getExtension('WEBGL_lose_context'); x.loseContext(); return 0; })()"); await pg.wait_for_timeout(300)
        r = await pg.evaluate("(() => { let now = 5000; lastT = now; for (let i = 0; i < 5; i++) loop(now += 16); const o = $('#glLost'); return { shown: !!o && !o.hidden, txt: o ? o.textContent : '' }; })()")
        info['丢失后'] = {'shown': r['shown'], 'txt': r['txt'][:80]}
        if not r['shown'] or '刷新' not in r['txt']: bad.append(f'上下文丢失没有提示：{r}')
        if len(errs) > 2: bad.append(f'丢失后刷错误：{len(errs)} 条，{errs[0]}')
    finally: await b.close()
    return not bad, bad, info


async def m4(p, opts):
    bad, info = [], {}
    b, pg, errs = await page(p, opts)
    try:
        await pg.evaluate("""(() => { window.__mt = { measure: [], track: [] };
          const om = measure; measure = P => { const t = performance.now(), r = om(P); __mt.measure.push([P.stars, Math.round(performance.now() - t)]); return r; };
          const ob = buildTrack; buildTrack = P => { const t = performance.now(), r = ob(P); __mt.track.push([P.stars, Math.round(performance.now() - t)]); return r; };
          return 0; })()""")
        await open_eff(pg, 'hongchao'); await pg.evaluate(FRAMES, 3)
        r = await pg.evaluate("__mt")
        slow = lambda a: [x for x in a if x[1] > 60]       # 真算的（缓存命中是几毫秒）
        info = {'measure 调用 / 真算': [len(r['measure']), len(slow(r['measure']))], 'buildTrack 调用 / 真算': [len(r['track']), len(slow(r['track']))],
                'measure 总 ms': sum(x[1] for x in r['measure']), 'buildTrack 总 ms': sum(x[1] for x in r['track'])}
        if len(slow(r['measure'])) > 2: bad.append(f"两层的整段预跑真算了 {len(slow(r['measure']))} 次（应 ≤ 2）")
        if len(slow(r['track'])) > 2: bad.append(f"两层的星轨道真算了 {len(slow(r['track']))} 次（应 ≤ 2）")
        if errs: bad.append('页面错误 ' + errs[0])
    finally: await b.close()
    return not bad, bad, info


async def m5(p, opts):
    bad, info = [], {}
    b = await p.chromium.launch(**opts)
    try:
        ctx = await b.new_context(viewport={'width': 1700, 'height': 1250}, device_scale_factor=2); pg = await ctx.new_page()
        await pg.add_init_script("window.requestAnimationFrame = () => 0;")
        await pg.goto(HTML, wait_until='load', timeout=0); await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
        await pg.evaluate(FAKE); await pg.evaluate(GPU)
        await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()")
        for _ in range(40):
            await pg.wait_for_timeout(250)
            if await pg.evaluate("!window.__opening && !state.baking"): break
        r = await pg.evaluate("(() => { state.P.qSS = 4; state.exportResolution = false; state.view = 'live'; let now = 1000; lastT = now; loop(now += 16); loop(now += 16); const s = live.A40; return { canvas: canvas.width, ss: s && s.samples40 ? [s.samples40.w, s.samples40.h] : null, maxTexMB: Math.round(__gpu.maxTex / 1e6), gpuMB: Math.round(__gpu.peak / 1e6) }; })()")
        info = r
        if not r['ss']: bad.append('没有画单层实时模拟')
        elif max(r['ss']) > 4096: bad.append(f"超采样画布 {r['ss']}（画布 {r['canvas']}，4×4）")
    finally: await b.close()
    return not bad, bad, info


async def m6(p, opts):
    bad, info = [], {}
    b, pg, errs = await page(p, opts)
    try:
        await open_eff(pg, 'hongchao')
        r = await pg.evaluate("""async () => { window.__c = { snap: 0, restore: 0, steps: 0 };
          const oS = Sim.prototype.snapshot; Sim.prototype.snapshot = function () { __c.snap++; return oS.call(this); };
          const oR = simRestore; simRestore = (a, b) => { __c.restore++; return oR(a, b); };
          const oT = Sim.prototype.step; Sim.prototype.step = function (h) { __c.steps++; return oT.call(this, h); };
          state.view = 'live'; state.playing = true; state.speed = 1; state.t = 1; let now = 1000; lastT = now; loop(now += 16); loop(now += 16);
          __c.snap = 0; __c.restore = 0; __c.steps = 0; for (let i = 0; i < 30; i++) { loop(now += 1000 / 60); await new Promise(r => setTimeout(r, 0)); }
          return { snap: __c.snap, restore: __c.restore, stepsPerFrame: +(__c.steps / 30).toFixed(1), layers: state.layers.length, want: +(2 * (1000 / 60) / 1000 / H_STEP).toFixed(1) }; }""")
        info['实时 30 帧'] = r
        if r['snap'] or r['restore']: bad.append(f"实时模拟还在快照 / 恢复：{r}")
        if r['stepsPerFrame'] > r['want'] * 1.5 + 2: bad.append(f"每帧物理步 {r['stepsPerFrame']}（只往前走应约 {r['want']}）")
    finally: await b.close()
    # 回推 vs 精确：单层菊，同一时刻画一格，比像素（真画，不打桩）
    b, pg, errs = await page(p, opts, stub=False)
    try:
        await pg.evaluate("(() => { window.__opening = true; Promise.resolve(openType('kiku')).finally(() => window.__opening = false); return 0; })()")
        for _ in range(40):
            await pg.wait_for_timeout(250)
            if await pg.evaluate("!window.__opening && !state.baking"): break
        r = await pg.evaluate("""async () => { window.__gb = 0; const oG = Sim.prototype.gatherBack; Sim.prototype.gatherBack = function (...a) { __gb++; return oG.apply(this, a); };
          const P = derive({ ...structuredClone(state.P), engine: 'gpu' }), pl = displayPlan40(P), px = 192, q = qualityOf(P);
          gl.activeTexture(gl.TEXTURE0); const samples = new Target(px * q.ss, px * q.ss, gl.RGBA16F), cell = new Target(px, px, gl.RGBA16F);
          const read = () => { const a = new Float32Array(px * px * 4); cell.bind(); gl.readPixels(0, 0, px, px, gl.RGBA, gl.FLOAT, a); return a; };
          const run = fwd => { const R = makeRenderer(P, 'burst'); LIVE_VIEW = fwd; const out = []; try { for (const t of [0.4, 0.4167, 0.4333, 1.2, 1.2167, 1.2333, 1.25]) { renderCell40(P, pl, R, t, samples, cell); out.push(read()); } } finally { LIVE_VIEW = false; R.dispose(); } return out; };
          const A = run(false), B = run(true); const res = [];
          for (let i = 0; i < A.length; i++) { const a = A[i], c = B[i]; let sum = 0, n = 0, mx = 0, peak = 0; for (let j = 0; j < a.length; j += 4) { const d = Math.abs(a[j] - c[j]); sum += d; mx = Math.max(mx, d); peak = Math.max(peak, a[j]); if (d > 0.02 * Math.max(peak, 1e-3)) n++; } res.push({ mean: +(sum / (a.length / 4)).toFixed(5), max: +mx.toFixed(4), peak: +peak.toFixed(3), diffFrac: +(n / (a.length / 4)).toFixed(4) }); }
          samples.dispose(); cell.dispose(); return { res, gb: __gb }; }""")
        info['回推 vs 精确（星头通道，线性值）'] = r['res']; info['回推次数'] = r['gb']
        if not r['gb']: bad.append('回推路径没走到')
        r = r['res']
        for x in r:
            if x['diffFrac'] > 0.02 or x['mean'] > 0.004 * max(x['peak'], 1e-3): bad.append(f'回推画出来的星头和精确的差太多：{x}')
    finally: await b.close()
    return not bad, bad, info


M7_BAKE = r"""async () => {
  state.stillBusy = true; clearTimeout(bakeTimer);
  const d = defaultsFor('kiku', 40), P = derive({ ...structuredClone(d.P), type: 'kiku', texW: 512, texH: 512, stars: 30, sparkRate: (d.P.sparkRate || 0) * 0.2, qMaxSub: 4 });
  const hasPace = typeof bakePace !== 'undefined';
  const hash = b => { let h = 0, n = 0; for (let s = b; s; s = s.next) for (const k of ['head', 'tail']) if (s[k]) { const a = readRGBA8(s[k]); for (let i = 0; i < a.length; i++) h = (h * 31 + a[i]) >>> 0; n += a.length; } return [h, n]; };
  // ① 分批：检查里强制每批 1 个子样本、每批之后都等显卡（ms = 0）；数「有烘焙绘制的任务」有几个
  let task = 0, run = true; const mc = new MessageChannel(); mc.port1.onmessage = () => { task++; if (run) mc.port2.postMessage(0); }; mc.port2.postMessage(0);
  const tasks = new Set(); let draws = 0, fences = 0;
  const oD = drawParticleBatch; drawParticleBatch = (n, m) => { tasks.add(task); draws++; return oD(n, m); };
  const oF = gl.fenceSync.bind(gl); gl.fenceSync = (...a) => { fences++; return oF(...a); };
  if (hasPace) Object.assign(bakePace, { on: true, maxSubs: 1, ms: 0 });
  let b1, b0, F = 0;
  try { b1 = await bake(P, 1, null); for (let s = b1; s; s = s.next) F += s.meta.L.F; }
  finally { run = false; drawParticleBatch = oD; gl.fenceSync = oF; }
  const h1 = hash(b1); disposeBake(b1);
  // ② 不分批再烘一次，逐字节比
  if (hasPace) Object.assign(bakePace, { on: false, maxSubs: 0, ms: 12 });
  try { b0 = await bake(P, 1, null); } finally { if (hasPace) bakePace.on = true; }
  const h0 = hash(b0); disposeBake(b0); state.stillBusy = false;
  return { hasPace, frames: F, drawTasks: tasks.size, draws, fences, same: h0[0] === h1[0] && h0[1] === h1[1], h0, h1 };
}"""
M7_ANALYZE = r"""async () => {
  const d = defaultsFor('kiku', 40), P = derive({ ...structuredClone(d.P), type: 'kiku', texW: 2048, texH: 2048 }), pl = displayPlan40(P), L = pl.L, N = P.texW, NH = P.texH;
  const mk = () => { gl.activeTexture(gl.TEXTURE0); const t = new Target(N, NH, gl.RGBA8); const a = new Uint8Array(N * NH * 4); let s = 12345;
    for (let i = 0; i < a.length; i++) { s = (s * 1103515245 + 12345) >>> 0; a[i] = (s >>> 24) < 64 ? (s >>> 16) & 255 : 0; }
    gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, NH, gl.RGBA, gl.UNSIGNED_BYTE, a); return t; };
  const head = mk(), tail = P.outMode === 'combined' ? null : mk();
  const b = { N, NH, cw: L.cellW, chh: L.cellH, scale: 1, head, tail, P, meta: { ...pl } };
  await new Promise(r => setTimeout(r, 100));
  const lt = []; const ob = new PerformanceObserver(l => l.getEntries().forEach(e => lt.push([e.startTime, e.duration]))); ob.observe({ type: 'longtask' });
  const t0 = performance.now(); await analyze(b); const total = performance.now() - t0;
  await new Promise(r => setTimeout(r, 300)); ob.disconnect(); head.dispose(); tail && tail.dispose();
  const mine = lt.filter(x => x[0] >= t0 - 1);
  return { F: L.F, cell: [L.cellW, L.cellH], totalMs: Math.round(total), longest: Math.round(Math.max(0, ...mine.map(x => x[1]))), longTasks: mine.length, fill: !!b.meta.fill };
}"""


M7_LAT = r"""async () => {
  state.stillBusy = true; clearTimeout(bakeTimer);
  const d = defaultsFor('kiku', 40), P = derive({ ...structuredClone(d.P), type: 'kiku', texW: 512, texH: 512, stars: 8, sparkRate: (d.P.sparkRate || 0) * 0.02, qMaxSub: 16, qHz: 960, qSS: 1 });   // 显卡活很少：这时等待的固定延迟才是大头（像本机快显卡）
  const oF = gl.fenceSync.bind(gl), oS = gl.getSyncParameter.bind(gl), born = new WeakMap();
  gl.fenceSync = (...a) => { const s = oF(...a); if (s) born.set(s, performance.now()); return s; };
  gl.getSyncParameter = (s, p) => { const v = oS(s, p); return p === gl.SYNC_STATUS && performance.now() - (born.get(s) || 0) < 17 ? gl.UNSIGNALED : v; };
  const time = async on => { if (typeof bakePace !== 'undefined') Object.assign(bakePace, { on, maxSubs: 0, ms: 12 }); const t0 = performance.now(); const b = await bake(P, 1, null); const ms = performance.now() - t0; let F = 0; for (let s = b; s; s = s.next) F += s.meta.L.F; disposeBake(b); return [ms, F]; };
  let a, b2, w0 = typeof bakePace !== 'undefined' ? bakePace.waits : 0;
  try { a = await time(false); b2 = await time(true); }
  finally { gl.fenceSync = oF; gl.getSyncParameter = oS; if (typeof bakePace !== 'undefined') bakePace.on = true; state.stillBusy = false; }
  return { unpacedMs: Math.round(a[0]), pacedMs: Math.round(b2[0]), frames: a[1], waits: typeof bakePace !== 'undefined' ? bakePace.waits - w0 : 0 };
}"""


async def m7(p, opts):
    bad, info = [], {}
    b, pg, errs = await page(p, opts, stub=False, fake=False)     # 真烘焙（小规格，云端软件渲染也快）
    try:
        r = await pg.evaluate(M7_BAKE); info['分批'] = r
        if not r['hasPace']: bad.append('没有 bakePace（烘焙不分批）')
        if r['drawTasks'] < r['frames']: bad.append(f"{r['frames']} 帧的烘焙只在 {r['drawTasks']} 个任务里交显卡活（应每批一个任务，至少每帧一个）")
        if r['fences'] < r['frames']: bad.append(f"批与批之间没等显卡做完：fence {r['fences']} 个 < {r['frames']} 帧")
        if not r['same']: bad.append(f"分批烘出来的贴图和不分批的不一样：{r['h1']} ≠ {r['h0']}")
        r = await pg.evaluate(M7_ANALYZE); info['自检'] = r
        if r['longest'] >= 200: bad.append(f"烘完的自检一口气占住页面 {r['longest']} ms（{r['F']} 帧、格子 {r['cell']}，共 {r['totalMs']} ms）")
        if not r['fill']: bad.append('自检没跑完（没有 fill）')
        r = await pg.evaluate(M7_LAT); info['等显卡有延迟'] = r
        if r['pacedMs'] > 2 * r['unpacedMs'] + 1000 or r['waits'] > r['frames'] * 2: bad.append(f"等显卡每次至少 17 ms 时分批烘焙 {r['pacedMs']} ms，不分批 {r['unpacedMs']} ms（{r['frames']} 帧、等了 {r['waits']} 次）：被等待拖慢了")
        if errs: bad.append('页面错误 ' + errs[0])
    finally: await b.close()
    return not bad, bad, info


async def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--effects', default='jinmangju,hongchao,hiki_nishiki,qingning,qiuxing_a,qiuxing_d,yongfeng,pianbei')
    ap.add_argument('--base', default='', help='星轨道时间步的基线 json（改之前跑一遍 --dump-base 得到）'); ap.add_argument('--dump-base', default='')
    a = ap.parse_args(); only = set(x for x in a.only.split(',') if x)
    opts = chromium_options(); opts['args'] = list(opts.get('args', [])) + ['--enable-precise-memory-info', '--js-flags=--max-old-space-size=8192']
    base = json.loads(pathlib.Path(a.base).read_text()) if a.base else {}
    from playwright.async_api import async_playwright
    res = []
    async with async_playwright() as p:
        if a.dump_base:
            out = {}
            for k in KEEP:
                b, pg, errs = await page(p, opts)
                try: await open_eff(pg, k); out[k] = [x[3] for x in (await pg.evaluate(FRAMES, 4))['tracks']]
                finally: await b.close()
            pathlib.Path(a.dump_base).write_text(json.dumps(out)); print('基线', out); return
        for name, fn in [('M1', lambda: m1(p, opts, a.effects.split(','), base)), ('M2', lambda: m2(p, opts)), ('M3', lambda: m3(p, opts)), ('M4', lambda: m4(p, opts)), ('M5', lambda: m5(p, opts)), ('M6', lambda: m6(p, opts)), ('M7', lambda: m7(p, opts))]:
            if only and name not in only: continue
            try: ok, bad, info = await fn()
            except Exception as e: ok, bad, info = False, [f'异常：{e}'[:300]], {}
            res.append({'item': name, 'pass': ok, 'why': bad, 'info': info})
            print(('✅' if ok else '❌'), name, '；'.join(bad), json.dumps(info, ensure_ascii=False)[:1500], flush=True)
    sys.exit(0 if all(r['pass'] for r in res) else 1)


asyncio.run(main())
