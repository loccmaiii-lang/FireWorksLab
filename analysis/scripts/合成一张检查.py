"""多层「合成一张」像素检查（4.9.126，导出（23）；用户 11-04 10:37「PC与手机都要有，能接受统一用一层颜色」）

云端软件 GL 真烘一个多层模板要十几分钟以上，这里换成「合成贴图」：烘焙换成照真的帧计划 / 取景（measure + plan）造各层的页，
每帧画几颗已知位置的高斯亮点（位置随这一帧的时刻往外走，每层错开角度不重叠），贴图是真的显卡贴图——合成、导出、引擎回放走的都是正式代码。
  1 一层自己合成（颜色层 = 自己）：每颗亮点的位置 = 原层这一 tick 那一格算出来的位置（≤ 1 合成像素），每帧曝光后总光量和原层那一格相同（±3 %）
     ——查取景换算、换帧时刻、重采样、编码；
  2 两层合成（两层 Ramp 不同）：每帧显示亮度（颜色层 Ramp × 颜色曲线）= 两层各自显示亮度之和（±6 %，亮点不重叠）——查亮度换算；
     第 2 层的亮点也在它自己算出来的位置；
  3 导出（PC + 手机都选合成一张）：PC 序列发射器只有合成那一组、贴图名 _Mix_、手机过规范（≤ 3 个发射器、同一时刻 1 张大序列、≤ 1024）；
  4 引擎回放：PC / 手机都画合成好的那张（hud 写「合成一张（」）。
真实效果的整包导出 + 回放检查交本机显卡任务（analysis/jobs/NFE-MERGE-*）。
用法：python3 analysis/scripts/合成一张检查.py [--type shinKiku] [--out 结果.json]；有不过的项退出码 1。
"""
import argparse, asyncio, json, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from browser_runtime import launch_async, validation_url

ROOT = Path(__file__).resolve().parents[2]
IDLE = "window.__fw && window.__fw.idle() && !state.baking && !(state.layerQueue && state.layerQueue.size) && $('#busy').hidden && !window.__opening"

SYNTH = r"""(() => {
  const chk = { clipFrames: [], edgeFrames: [], chanUse: [true, true, true, true], emptyMid: [], similar: 0, seam: null, maxClip: 0 };
  // 第 lid 层在它自己的时刻 t（模拟秒）的亮点：6 颗，半径随时间往外走，角度按层错开
  window.__synthBlobs = (lid, t, HX) => { const R = HX * (0.08 + 0.55 * (1 - Math.exp(-Math.max(0, t)))), out = [];
    for (let j = 0; j < 6; j++) { const a = 2 * Math.PI * j / 6 + lid * 0.5; out.push([R * Math.cos(a), R * Math.sin(a) * 0.8 + HX * 0.05]); } return out; };
  window.__synthA = 2.0; window.__synthS = 1.6;     // 亮点峰值光量（曝光后）、σ（格子像素）
  window.__synthId = new Map();
  bake = async (P, scale, onProg) => {
    if (!['master', 'segments'].includes(P.form || 'master')) throw new Error('合成贴图只造大面片');
    const Pc = structuredClone(typeof fxP === 'function' ? fxP(P) : P); Object.assign(Pc, { cellPad: 2, outMode: 'combined', encGamma: 1 });
    const key = Pc.type + ':' + Pc.seed + ':' + Pc.stars; if (!__synthId.has(key)) __synthId.set(key, __synthId.size); const lid = __synthId.get(key);
    const fm = measure(Pc), cutIn = +Pc.cutIn > 0 ? Math.min(+Pc.cutIn, Pc.duration - 1 / 30) : 0, cutOut = +Pc.cutOut > cutIn ? Math.min(+Pc.cutOut, Pc.duration) : 0;
    const pl = plan(Pc, fm, cutIn, cutOut || Pc.duration), pages = typeof splitPlan40 === 'function' ? splitPlan40(pl) : [pl];
    const parts = pages.map(meta => {
      const L = meta.L, cw = Math.round(L.cellW), N = L.cols * cw, buf = new Uint8Array(N * N * 4), A = __synthA, S = __synthS;     // 贴图边长按帧计划的格子（单格 × 列数）
      meta.times.forEach((tc, f) => { if (f >= L.F) return;
        const [sx, sy] = sizeXY(meta, tc), c = centerAt(meta, tc), hw = meta.HX * sx, hh = meta.HY * sy, ch = Math.floor(f / L.per), k = f % L.per, x0 = (k % L.cols) * cw, y0 = N - (Math.floor(k / L.cols) + 1) * cw;
        for (const [wx, wy] of __synthBlobs(lid, (meta.t0 || 0) + tc, meta.HX)) {
          const px = (wx - (c[0] - hw)) / (2 * hw) * cw, py = (wy - (c[1] - hh)) / (2 * hh) * cw;
          for (let y = Math.max(3, Math.floor(py - 5)); y <= Math.min(cw - 4, Math.ceil(py + 5)); y++) for (let x = Math.max(3, Math.floor(px - 5)); x <= Math.min(cw - 4, Math.ceil(px + 5)); x++) {
            const r2 = (x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2, xv = A * Math.exp(-r2 / (2 * S * S)), q = Math.min(253, Math.round((1 - Math.exp(-xv)) * 255)), a = ((y0 + y) * N + x0 + x) * 4 + ch;
            if (q > buf[a]) buf[a] = q; } } });
      const head = new Target(N, N, gl.RGBA8); gl.bindTexture(gl.TEXTURE_2D, head.tex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, buf); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      return { P: Pc, form: Pc.form === 'segments' ? 'segments' : 'master', N, NH: N, cw, chh: cw, scale: 1, fm, head, tail: null, __lid: lid,
        meta: { ...meta, check: chk, lightKeys: [[0, 1], [1, 0]], darkTail: 0, frameMaxes: [], quality: qualityOf(Pc), expoH: 1, expoT: 1, bakeMs: 1, sparkSlots: 0, fitted: { mode: 'synth' } } };
    });
    parts.forEach((b, i) => b.next = parts[i + 1]);
    if (cutIn && +Pc.preRoll !== 0 && !parts[0].meta.zoom) parts[0].meta.pre = preRollOf(Pc, fm, parts[0].meta.t0);     // 入点前放大（和 bakeMaster 同一条）
    if (onProg) onProg(1); await new Promise(r => setTimeout(r, 10));
    return parts[0];
  };
  bakeMobileFor = async b => { const ps = []; for (let s = b; s; s = s.next) ps.push({ ...s, next: null }); ps.forEach((t, i) => t.next = ps[i + 1]); return ps[0]; };     // 手机预览：同一套（合成一张手机从 PC 烘焙合）
  { const d = document.getElementById('deliveryDestination'); if (d) d.value = 'zip'; }
  return 0;
})()"""

CHECK_JS = r"""(async () => {
  const out = { items: [] }, add = (name, ok, why) => { out.items.push({ name, ok, why }); console.log('[合成检查] ' + (ok ? '✅ ' : '❌ ') + name + ' · ' + String(why).slice(0, 150)); };
  const xs = state.layers.map(L => { const e = layerEntryOf(L); return { L, b: e && e.bake }; });
  if (xs.length < 2 || xs.some(x => !x.b)) { add('前提', false, '模板没有两层烘好的序列'); return out; }
  const dec = q => q ? -Math.log(Math.max(1e-6, 1 - q / 255)) : 0;
  const cellOf = (part, f) => { const L = part.meta.L, ch = L.chans === 4 ? Math.floor(f / L.per) : 0, k = f % L.per; return { ch, x0: (k % L.cols) * part.cw, y0: part.NH - (Math.floor(k / L.cols) + 1) * part.chh }; };
  const sumCell = (img, part, f, fn) => { const c = cellOf(part, f); let s = 0; for (let y = 0; y < part.chh; y++) { let a = ((c.y0 + y) * part.N + c.x0) * 4 + c.ch; for (let x = 0; x < part.cw; x++, a += 4) if (img[a]) s += fn(img[a]); } return s; };
  // 一颗亮点在合成格子里的质心（在期望位置附近 6 像素内找），格子像素坐标
  const centroid = (img, part, f, px, py) => { const c = cellOf(part, f); let sx = 0, sy = 0, s = 0;
    for (let y = Math.max(0, Math.floor(py - 6)); y <= Math.min(part.chh - 1, Math.ceil(py + 6)); y++) for (let x = Math.max(0, Math.floor(px - 6)); x <= Math.min(part.cw - 1, Math.ceil(px + 6)); x++) { const w = dec(img[((c.y0 + y) * part.N + c.x0 + x) * 4 + c.ch]); sx += w * (x + 0.5); sy += w * (y + 0.5); s += w; }
    return s > 0.05 ? [sx / s, sy / s] : null; };
  // 一层在 tick T 时它那一格的亮点，换成整朵坐标（缩放 / 镜像）
  const expected = (x, T) => { const S = mergeSources([x], [0])[0], q = mergeStateAt(S, T); if (!q) return null;
    const m = q.m, sc = +x.L.scale || 1, mx = x.L.mirror ? -1 : 1, lid = q.b.__lid;
    const tf = q.ps > 0 ? 0 : q.f, raw = __synthBlobs(lid, (m.t0 || 0) + m.times[tf], m.HX), [sx, sy] = sizeXY(m, m.times[tf]), c0 = centerAt(m, m.times[tf]), hw = m.HX * sx, hh = m.HY * sy;
    const edge = raw.map(([a, b]) => { const u = (a - (c0[0] - hw)) / (2 * hw) * q.b.cw, v = (b - (c0[1] - hh)) / (2 * hh) * q.b.chh; return u < 9 || v < 9 || u > q.b.cw - 9 || v > q.b.chh - 9; });     // 合成贴图在原层格子边上被裁的亮点不量
    const pts = q.ps > 0 ? raw.map(([a, b]) => [a * q.ps, b * q.ps]) : raw;
    return { q, pts: pts.map(([a, b]) => [mx * a * sc, b * sc]), edge }; };
  const toCell = (part, w) => { const m = part.meta; return [(w[0] - (m.cx - m.HX)) / (2 * m.HX) * part.cw, (w[1] - (m.cy - m.HY)) / (2 * m.HY) * part.chh]; };
  const run = async (idx, label) => {
    const mb = await mergeBake(xs, idx, false), Lp = xs[idx[0]].L, Mp = comboLayerM(Lp), bad = [], lr = [], pe = [];
    try {
      for (const part of bakeParts(mb)) { const img = readRGBA8(part.head), a = (part.meta.Ww / part.cw) ** 2;
        part.meta.ticks.forEach((tk, f) => { const T = part.meta.t0 + tk / 30;
          let src = 0, any = false;
          const all = idx.map(i => { const e = expected(xs[i], T); return e ? e.pts.map(w => toCell(part, w)) : []; }).flat();     // 别的亮点离得近（< 13 像素，质心窗口 ±6 像素会框进它）就不量这一颗的位置
          for (const i of idx) { const x = xs[i], e = expected(x, T); if (!e) continue; any = true;
            const sp = e.q.b, simg = readRGBA8(sp.head), r = e.q.r, sa = ((r[2] - r[0]) / sp.cw) * ((r[3] - r[1]) / sp.chh), age = (T - (+x.L.delay || 0)) * (+x.L.rate || 1), M = comboLayerM(x.L);
            src += idx.length === 1 ? sumCell(simg, sp, e.q.f, dec) * sa : sumCell(simg, sp, e.q.f, v => mergeLum(rampAt(M, v / 255)) * v / 255) * sa * mergeTintLum(x.L, age);
            for (const [wi, w] of e.pts.entries()) { const [px, py] = toCell(part, w); if (e.edge[wi] || px < 6 || py < 6 || px > part.cw - 6 || py > part.chh - 6) continue;
              if (all.some(([qx, qy]) => { const d = Math.hypot(qx - px, qy - py); return d > 1e-6 && d < 13; })) continue; const c = centroid(img, part, f, px, py);
              if (!c) { bad.push(`第 ${f} 帧第 ${i + 1} 层亮点没了`); continue; } const d = Math.hypot(c[0] - px, c[1] - py); pe.push(d); if (d > 1) (out.worst = out.worst || []).push({ label, f, T: +T.toFixed(3), layer: i + 1, d: +d.toFixed(2), ps: e.q.ps, sf: e.q.f, px: +px.toFixed(1), py: +py.toFixed(1), c: c.map(v => +v.toFixed(1)) }); } }
          if (!any) return;
          const mg = idx.length === 1 ? sumCell(img, part, f, dec) * a : sumCell(img, part, f, v => mergeLum(rampAt(Mp, v / 255)) * v / 255) * a * mergeTintLum(Lp, (T - (+Lp.delay || 0)) * (+Lp.rate || 1));
          if (src > 1e-6) lr.push(mg / src); });
      }
    } finally { disposeBake(mb); }
    const tol = idx.length === 1 ? 0.03 : 0.06, worst = lr.reduce((m, r) => Math.max(m, Math.abs(r - 1)), 0), pmax = pe.reduce((m, v) => Math.max(m, v), 0);
    lr.sort((p, q) => p - q); pe.sort((p, q) => p - q);
    if (lr.length && worst > tol) bad.push(`${idx.length === 1 ? '总光量' : '显示亮度'}比值 ${lr[0].toFixed(3)}–${lr[lr.length - 1].toFixed(3)} 超 ±${tol * 100} %`);
    if (pmax > 1) bad.push(`亮点位置最多偏 ${pmax.toFixed(2)} 合成像素`);
    add(label, !bad.length && lr.length > 5 && pe.length > 20, bad.slice(0, 4).join('；') || `${lr.length} 帧：${idx.length === 1 ? '总光量' : '显示亮度'}比值 ${lr[0].toFixed(3)}–${lr[lr.length - 1].toFixed(3)}，亮点 ${pe.length} 次、位置偏差中位 ${pe[pe.length >> 1].toFixed(2)} / 最多 ${pmax.toFixed(2)} 像素`);
  };
  await run([0], '一层自己合成：位置 ≤ 1 像素、总光量 ±3 %');
  await run([0, 1], '两层合成（Ramp 不同）：位置 ≤ 1 像素、显示亮度 = 两层之和 ±6 %');
  out.plan = (({ K, union, budget, pages, cell }) => ({ frames: K.length, union, budget, pages, cell }))(mergePlan(xs, [0, 1]));
  // 第 2 层改开始时间 / 时间倍率 / 缩放 / 镜像（层上的，不重烘）
  Object.assign(state.layers[1], { delay: 0.37, rate: 1.3, scale: 0.8, mirror: true });
  await run([0, 1], '两层合成（第 2 层延迟 0.37 s、倍率 1.3、缩放 0.8、镜像）：位置 ≤ 1 像素、亮度 ±6 %');
  // 第 2 层加入点 0.4 s（入点前放大：入点那一帧从小放大）：重烘这一层
  selectComboLayer(1); state.P.cutIn = 0.4; state.P.preRoll = 1; onParam();
  for (let n = 0; n < 200; n++) { await new Promise(r => setTimeout(r, 100)); const e = layerEntryOf(state.layers[1]); if (e && e.bake && e.bake.meta.pre && !state.baking && !(state.layerQueue && state.layerQueue.size)) break; }
  xs[1].b = layerEntryOf(state.layers[1]).bake;
  if (!xs[1].b.meta.pre) add('入点前放大的合成', false, '第 2 层没烘出入点前放大'); else await run([0, 1], '两层合成（再加第 2 层入点 0.4 s、入点前放大）：位置 ≤ 1 像素、亮度 ±6 %');
  Object.assign(state.layers[1], { delay: 0, rate: 1, scale: 1, mirror: false });
  // 3 导出
  for (const pf of ['pc', 'mobile']) for (let i = 0; i < state.layers.length; i++) setLayerOut(state.layers[i], pf, 'merge');
  { const files = await comboPackFiles('MergeCheck', state.layers), dec8 = new TextDecoder(), cfg = {}, pngs = files.filter(([f]) => /\.png$/.test(f));
    for (const [f, d] of files) if (/^cascade(_mobile)?\.json$/.test(f)) cfg[f] = JSON.parse(dec8.decode(d));
    const pc = cfg['cascade.json'], mo = cfg['cascade_mobile.json'], bad = [];
    const seqEm = j => (j.emitters || []).filter(e => { const m = (j.materials || {})[e.material] || {}; return Object.values(m.textures || {}).some(k => (j.textures[k] || {}).class === 'flipbook'); });
    const pcSeq = seqEm(pc).map(e => e.name), moSeq = seqEm(mo).map(e => e.name), sizes = Object.fromEntries(pngs.map(([f, d]) => [f, { size: pngSize(d) }]));
    if (!pcSeq.length || pcSeq.some(n => !/^L1_Main[A-Z]?$/.test(n))) bad.push('PC 序列发射器不是只有合成那一组：' + pcSeq.join('、'));
    if (!Object.values(pc.textures).some(t => /_Mix_/.test(t.file))) bad.push('PC 贴图名没有 _Mix_');
    if (!moSeq.length) bad.push('手机没有合成的序列');
    const gm = packGateConfig('cascade_mobile.json', mo, '', sizes), gp = packGateConfig('cascade.json', pc, '', sizes);
    if (gm.length) bad.push('手机规范：' + gm.join('；')); if (gp.length) bad.push('PC 规范：' + gp.join('；'));
    if (!(pc.naming && pc.naming.layers && pc.naming.layers.length === state.layers.length && (pc.naming.merged || []).includes('Mix'))) bad.push('naming.layers / merged 不对：' + JSON.stringify(pc.naming || null));
    out.emitters = { pc: pc.emitters.map(e => e.name), mobile: mo.emitters.map(e => e.name) };
    add('导出：PC 一组合成序列、_Mix_ 名、手机过规范', !bad.length, (bad.length ? bad.join('；') + ` ｜ 手机发射器 ${out.emitters.mobile.join('、')}` : '') || `PC 序列 ${pcSeq.join('、')}；手机 ${moSeq.join('、')}；发射器 PC ${pc.emitters.length} / 手机 ${mo.emitters.length}；${pngs.map(([f]) => f).filter(f => /Mix/.test(f)).join('、')}`);
  }
  // 4 引擎回放
  for (const pf of ['pc', 'mobile']) {
    state.view = 'export'; state.platform = pf; if (pf === 'mobile') await ensureComboMobile(); ensureTargets();
    let hud = ''; for (let n = 0; n < 300; n++) { state.t = 1.0; renderCombo(); hud = hudText; if (/合成一张（/.test(hud)) break; await new Promise(r => setTimeout(r, 100)); }
    add(`引擎回放（${pf === 'pc' ? 'PC' : '手机'}）画合成好的那张`, /合成一张（/.test(hud), hud.slice(0, 160));
  }
  state.platform = 'pc';
  return out;
})()"""


async def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--type', default='shinKiku'); ap.add_argument('--out', default=''); ap.add_argument('--html', default='')
    a = ap.parse_args()
    html = validation_url(a.html, ROOT / 'tool' / 'FireworkBaker.html')
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        b = await launch_async(p); ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script("window.requestAnimationFrame = () => 0;")     # 关掉画面主循环（软件 GL 下实时模拟会把 CPU 占满）；合成贴图、合成、引擎回放都不靠它
        await pg.goto(html, wait_until='load', timeout=0)
        await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
        await pg.evaluate(SYNTH)
        t0 = time.time()
        await pg.evaluate(f"(() => {{ window.__opening = true; Promise.resolve(openMultiType({json.dumps(a.type)})).finally(() => window.__opening = false); return 0; }})()")
        while time.time() - t0 < 300:
            if await pg.evaluate(IDLE + " && state.layers.length > 1 && state.layers.every(L => { const e = layerEntryOf(L); return e && e.bake; })"): break
            await pg.wait_for_timeout(500)
        print(f'打开 {a.type}：{time.time() - t0:.0f} s，层 {await pg.evaluate("state.layers.length")}', flush=True)
        pg.on('console', lambda m: print('  ·', m.text[:200], flush=True) if m.text.startswith('[合成检查]') else None)
        r = await pg.evaluate(CHECK_JS)
        await b.close()
    ok = all(x['ok'] for x in r['items'])
    for x in r['items']: print(('✅' if x['ok'] else '❌'), x['name'], '·', x['why'], flush=True)
    if r.get('plan'): print('两层合成帧计划：', json.dumps(r['plan'], ensure_ascii=False))
    if r.get('worst'): print('位置偏差大于 1 像素：', json.dumps(r['worst'][:12], ensure_ascii=False))
    if errs: print('页面错误：', errs[:3]); ok = False
    if a.out: json.dump({'type': a.type, 'ok': ok, **r, 'errors': errs}, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sys.exit(0 if ok else 1)

if __name__ == '__main__':
    asyncio.run(main())
