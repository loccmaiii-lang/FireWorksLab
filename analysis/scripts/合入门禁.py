"""合入门禁（快检）：推送前跑，几分钟内查出「导出 / 取景 / 帧数 / 入出点接不上」这类问题，不过就不推。

用户 10-14 13:12（导出（23）排查）：「在代码上传 / 合入前，能不能加一个强制拦截检查工具，确保导出链路、取景、帧分配合规才允许合入？
全量烘焙检查太慢就想一个既快又能卡住规范的折中办法」。方案见 协作/方案_导出排查_2026-10-14.md 第 2 节 G1。

用法：python3 analysis/scripts/合入门禁.py [--base origin/main] [--all] [--only 体检,构建,契约,导出,界面] [--scn 名字,…] [--out 结果.json] [--html 别的 FireworkBaker.html]
  不带参数：按 `git diff --name-only <base>...HEAD` + 没提交的改动决定跑哪几项（只改记录 / 文档时几秒就完）；--all 全跑。
  --hook --base <远端原来的提交> --head <要推的提交>：pre-push 钩子用（`.githooks/pre-push`，导出排查 G2）。只看要推的那些提交，不算工作树里没提交的改动；
    动了源码、而工作树里相关文件（源码 / 成品 / 检查脚本）有没提交的改动、或要推的不是 HEAD 时，在临时工作副本（git worktree，跑完删掉）里按要推的那个提交跑。
退出码：0 = 可以推；1 = 有 ❌（先修）；2 = 检查本身出错。

查什么（按改动挑，越靠前越快）：
  体检  总是跑：同步体检（落后 / 冲突标记 / 没收尾的 rebase）。
  构建  动了 tool/src、命名表、更新记录、尺寸标定时：tool/build.py 重新生成（自带 lint + 静态核对），生成的成品要和提交的一致。
  契约  动了 tool/src 或命名表时（产物契约，不真烘）：每种产物形态挑代表效果（空中大面片、分段、地面循环、分层粒子图、合成一张、
        近段 + 远段 + 粒子、纯星头、V5，单层和多层），右栏「输出」里每一行「看得见、没变灰」的都拨一下：
          · 结构行（取景 / 帧数 / 入出点 / 格子 / 产物…）：帧计划、取景或 cascade.json 必须变，不变 = 这一行接不上；
          · 选项之间要有区别的行（帧数、面片取景、每帧停几 tick、格子……）：不同的值导出不能一样；
          · 只影响像素的行（曝光、光晕、快门、画质……）：至少要进到烘焙入口的参数（被改写掉 = 接不上）。
        烘焙换成「只记帧计划、不画」（bakeFrames 桩）、取景测量的显卡渲染换成空画：只查接线，不查画面。
  导出  和契约同一批代表：导出拦截（规范 v1）不报错、没有空壳发射器（出生率 0 又没有 Burst）、每个发射器写了寿命和大小。
  界面  动了 tool/src 时：界面状态检查.py 的 N3、W7、W37、R10、R11、X1（再加门禁登记的新项）。
没做（后续）：动了渲染代码时的小图真烘光量对照（方案 G1 第 3 条）。
"""
import argparse, asyncio, json, os, pathlib, shutil, subprocess, sys, tempfile, time

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'analysis' / 'scripts'))
from browser_runtime import validation_url, verify_validation_source

SRC_PREFIX = ('tool/src/', 'analysis/命名/')
BUILD_INPUTS = ('tool/src/', 'analysis/命名/', 'tool/design-system/', '更新记录.md', 'spec/尺寸标定.json', 'tool/build.py')
BUILD_OUTPUTS = ['tool/FireworkBaker.html', 'tool/data/size_spec.js']
UI_ITEMS = ['N3', 'W7', 'W37', 'R10', 'R11', 'X1', 'R12', 'R13']     # R12：4.9.89 导出接线（合成一张入出点 / 帧数 / 停几 tick、纯星头）；R13：4.9.96 纯星头 CPU 粒子 / 开花闪光 / 尾缀层产物表 / 按时间缩

# ---------------------------------------------------------------- 页面里的检查
LIB = r"""(async () => {
  const G = window.__g = { exportFrames: null, zips: [], log: [] };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const r4 = x => typeof x === 'number' ? +x.toFixed(4) : x;
  const fakePNG = (w, h) => { const u = new Uint8Array(33); u.set([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]); const dv = new DataView(u.buffer); dv.setUint32(16, Math.max(1, w | 0)); dv.setUint32(20, Math.max(1, h | 0)); return u; };
  const planSig = (P, pl) => ({ form: P.form, tex: [P.texW, P.texH], L: pl.L ? [pl.L.cols, pl.L.rows, pl.L.chans, pl.L.F, r4(pl.L.cellW), r4(pl.L.cellH)] : null,
    t0: r4(pl.t0), dur: r4(pl.duration), times: (pl.times || []).map(r4), fd: (pl.dur || []).map(r4), HX: r4(pl.HX), HY: r4(pl.HY), cy: r4(pl.cy), zoom: !!pl.zoom, anchor: !!pl.anchor,
    sx: pl.sizeKeysX || null, sy: pl.sizeKeysY || null, sk: pl.sizeKeys || null, keys: pl.keys || null, loop: !!pl.loop, outMode: P.outMode });
  // 烘焙桩：取景 / 帧计划照真的算（各产物自己的 plan），只是不画、不读回；烘焙入口参数记在 meta.__inP
  bakeFrames = async (P, scale, onProg, pl, R, extra = {}) => {
    const L = pl.L, N = Math.round(P.texW * scale), NH = Math.round(P.texH * scale), comb = P.outMode === 'combined';
    const t = () => ({ w: N, h: NH, bind() { }, dispose() { } }), sig = planSig(P, pl);
    if (G.exportFrames) G.exportFrames.push(sig);
    const b = { N, NH, cw: Math.round(L.cellW * scale), chh: Math.round(L.cellH * scale), scale, head: t(), tail: comb ? null : t(), P,
      meta: { ...pl, noFade: !!extra.noFade, quality: qualityOf(P), expoH: 1, expoT: 1, sparkSlots: (R && R.slots) || 0, bakeMs: 1, fitted: { mode: 'stub' },
        check: { clipFrames: [], edgeFrames: [], chanUse: [true, true, true, true], emptyMid: [], similar: 0, seam: null, maxClip: 0 }, lightKeys: [[0, 1], [1, 0]], darkTail: 0, frameMaxes: [], imgRows: [],
        __sig: sig, __inP: JSON.stringify(P) } };
    if (onProg) onProg(1);
    await wait(0);
    return b;
  };
  readRGBA8 = t => new Uint8Array(4 * Math.max(1, t.w || 1) * Math.max(1, t.h || 1));
  encodePNG = async (rgba, w, h) => fakePNG(w, h);
  debugAtlasPNG = async s => fakePNG(4, 4);
  cutoutFiles = async (srcs, N, NH, L, file, meta) => { const png = fakePNG(256, 256); CUTOUT_INFO.set(png, { save: 0.5, cover: 0.5 }); if (meta) meta.cutout = { size: 256, cover: 0.5, save: 0.5, file }; return [[file + '.png', png]]; };
  window.drawCameraGraph = () => 0;
  // 取景测量的显卡渲染换成空画（只查接线，不查量得准不准）：RT6 远段 / 合成一张 / 锚点的测量渲染器不画、读回是空的（云端软件 GL 量一次 13 s）；
  //   地面 / 上升循环 / 单束的包围盒按估计值（gpuBounds 叠画 7 轮）
  makeRiseTailFullRenderer = () => ({ slots: 0, subW: 0, draw() { }, dispose() { } });
  makeRiseTailFarRenderer = () => ({ slots: 0, subW: 0, draw() { }, dispose() { } });
  for (const n of ['rtLayoutFar', 'rtFullAnchor']) { const f = window[n]; if (typeof f === 'function') window[n] = function (...a) { gl.readPixels = () => { }; try { return f.apply(this, a); } finally { delete gl.readPixels; } }; }
  gpuBounds = (R, times, guess, center = [0, 0]) => [center[0] - guess, center[0] + guess, center[1] - guess, center[1] + guess];
  { const f = rtMeasure; rtMeasure = function (...a) { const r0 = makeRiseTailLoopRenderer; makeRiseTailLoopRenderer = () => ({ slots: 0, subW: 0, draw() { }, dispose() { } }); gl.readPixels = () => { };
      try { return f.apply(this, a); } finally { makeRiseTailLoopRenderer = r0; delete gl.readPixels; } }; }     // RT6 近段取景（6 s）
  trailBounds = P => { const g = Math.max(8, (+P.trV || 40) * 1.3); return [-0.05 * g, 0.05 * g, -g, Math.max(1, (+P.trHeadSize || 1) * (+P.trHalo || 2))]; };     // V5 取景（8 s）
  const dec = new TextDecoder();
  makeZip = async files => {
    const t = await packTidy(files); let fs = t.files, gate = [];
    try { fs = await packFinalize(fs, { noThrow: true, known: null, sourceKey: '' }); gate = (packGateLast && packGateLast.bad) || []; } catch (e) { gate = ['异常：' + e.message]; }
    const cfg = {}, names = [];
    for (const [f, d] of fs) { const n = f.replace(/^.*\//, ''); names.push(n); if (/^cascade(_mobile)?\.json$/.test(n)) cfg[n] = JSON.parse(dec.decode(d instanceof Blob ? new Uint8Array(await d.arrayBuffer()) : d)); }
    G.zips.push({ cfg, names: names.sort(), gate });
    return new Blob([]);
  };
  deliverResource = async () => { };
  wbAutoExport = () => { };
  deliveryMetadata = () => ({});     // 交付目录的元数据（截缩略图，1.2 s）：门禁不交付
  // 防抖去掉：改参数马上烘（预览 380 ms、多层 380 ms、收紧 700 ms 的等待在检查里只是空等）
  scheduleBake = () => { clearTimeout(bakeTimer); bakeTimer = setTimeout(runPreviewBake, 0); };
  { const q = queueLayerBake; queueLayerBake = (e, d, nb) => q(e, 0, nb); }
  scheduleRefine = () => { };
  if (typeof DeliveryWorkspace !== 'undefined') { DeliveryWorkspace.beginExport = async () => { }; DeliveryWorkspace.exportFailed = e => { G.log.push('导出失败：' + (e && e.message)); }; }
  { const d = document.getElementById('deliveryDestination'); if (d) d.value = 'zip'; }
  const ofl = flash; flash = (m, err) => { if (err) G.log.push(String(m).slice(0, 300)); };
  window.askSaveName = async (t, n, init) => init; window.askConfirm = async () => true; window.askText = async (t, h, init) => init;
  const idleNow = () => window.__fw.idle() && !state.baking && !(state.layerQueue && state.layerQueue.size) && $('#busy').hidden && !window.__opening;
  const idle = async (ms = 30000) => { const t0 = performance.now(); await wait(20); while (performance.now() - t0 < ms) { if (idleNow()) { await wait(20); if (idleNow()) return true; } await wait(20); } return false; };
  window.__idle = idle;
  const walk = (b, out, tag) => { if (!b) return; for (let s = b, i = 0; s; s = s.next, i++) out.push([tag + '#' + i, (s.meta && s.meta.__sig) || null]); if (b.far) walk(b.far, out, tag + '.far'); (b.fades || []).forEach((f, i) => walk(f, out, tag + '.fade' + i)); if (b.vars) b.vars.forEach((v, i) => walk(v, out, tag + '.var' + i)); };
  const insNow = () => { const a = [], one = b => { for (let s = b; s; s = s.next) a.push((s.meta && s.meta.__inP) || ''); if (b && b.far) a.push(b.far.meta.__inP || ''); };
    if (state.tab === 'combo') state.layers.forEach(L => { const e = layerEntryOf(L); one(e && e.bake); }); else one(state.bake); return a; };
  // 现在的状态导出一次：预览烘焙的帧计划 + 导出时另烘的（手机等）+ cascade.json / cascade_mobile.json + 文件名 + 导出拦截
  window.__sig = async () => {
    const bakes = [];
    if (state.tab === 'combo') state.layers.forEach((L, i) => { const e = layerEntryOf(L); walk(e && e.bake, bakes, 'L' + (i + 1)); }); else walk(state.bake, bakes, 'S');
    G.exportFrames = []; G.zips = []; G.log = [];
    try { if (state.tab === 'combo') await exportCombo(); else await exportMaster(); } catch (e) { G.log.push('异常：' + e.message); }
    await idle();
    const z = G.zips[0] || null, fr = G.exportFrames; G.exportFrames = null;
    return { bakes, ins: insNow(), fr, cfg: z ? z.cfg : null, names: z ? z.names : [], gate: z ? z.gate : [], log: G.log.slice() };
  };
  // 结构行（导出的帧计划 / 取景 / cascade.json 该跟着变）= 这几节里的行；别的节（光点与曝光、画质、镜头成像、尾缀外形……）只影响像素，至少要进烘焙入口
  const STRUCT_SECS = new Set(['导出缩放', '导出方案', '入点与出点（导出）', '输出：帧数 · 格子 · 贴图（导出）', '尾缀 · 引擎与导出', '产物表']);
  const PIXEL = new Set(['shutter', 'cellPad', 'encGamma']);     // 结构节里只影响像素的几行
  const SKIP = { exposureTarget: '只给「建议曝光」按钮用，不进烘焙', previewBloom: '预览设置（引擎里没有）', rtBurstD: '游戏内大小预览的比例（不进导出）' };
  // 选项之间必须有区别的行（0 / 自动除外：自动可以正好等于某一档）
  const STRICT = new Set(['frameBudget', 'zoom', 'holdTicks', 'outMode', 'L.out.pc', 'L.out.mobile', 'outPC', 'outMobile', 'prod.pc', 'prod.mobile']);
  // 有条件才起作用、代表效果上正好不起作用的行：不变只记 ⚠（写明条件），不算接不上
  const COND = { outPack: '帧数正好装满一张时，「按帧数选最小贴图」和「固定」一样', maxHoldBurn: '燃烧段本来就不用停那么久时不变', maxHold: '淡出段本来就不用停那么久时不变',
    pageTarget: '一张就放得下、张数下限没顶到时不变', fadeAt: '自动定的淡出起点正好一样时不变', burstSec: '开花段帧率本来就是每 tick 一帧时不变', exportScaleRise: '只在导出缩放 < 1 时' };
  window.__rows = () => {
    const rows = panelRows.filter(([row, it, sec, det]) => det._g === '输出' && row._applies && !row._inert && !(row._legacy && !legacyInUse(Array.isArray(it) ? it[0] : it.sel, state.P)))
      .map(([row, it, sec]) => { const key = Array.isArray(it) ? it[0] : it.sel || it.text || it.curve || ''; return { key, sec: sec.sec, kind: Array.isArray(it) ? 'num' : it.sel ? 'sel' : it.text ? 'text' : it.curve ? 'curve' : 'info',
        opts: it.sel ? it.options.filter(o => !it.optOK || it.optOK(o[0], state.P)).map(o => o[0]) : null, rng: Array.isArray(it) ? [it[3], it[4], it[5]] : null, cur: key ? pGet(state.P, key) : null }; }).filter(r => r.key && (r.kind === 'num' || r.kind === 'sel'));
    // 多层：这一层的产物（交付清单产物表 / 层页头的 PC、手机两格）也是导出行
    if (state.tab === 'combo' && state.comboSel >= 0) { const L = state.layers[state.comboSel], o = layerOut(L);
      const pcOpts = productPcOptions(L), mbOpts = productMobileOptions(L);
      if (pcOpts.length > 1) rows.push({ key: 'L.out.pc', sec: '产物表', kind: 'lay', opts: pcOpts, cur: o.pc });
      if (mbOpts.length > 1) rows.push({ key: 'L.out.mobile', sec: '产物表', kind: 'lay', opts: mbOpts, cur: layerMobileManual(L) ? o.mobile : 'auto' }); }
    // 4.9.96：单层尾缀（合成一张 / 纯星头）的 PC、手机怎么出只在交付清单的产物表里（右栏没有这两行）
    // 4.9.106 G4：地面循环 / 分层粒子图 / V5 / 上升星头循环 / 单元序列的单层同样只在产物表里选（手机 序列 / 不出）
    if (state.tab !== 'combo' && (isEmit(state.P) || !singleSchemeOn(state.P))) { renderDeliv(); for (const pf of ['pc', 'mobile']) { const sel = prodSelect(pf), opts = sel ? [...sel.options].filter(o => !o.disabled).map(o => o.value) : [];
      if (opts.length > 1) rows.push({ key: 'prod.' + pf, sec: '产物表', kind: 'prod', opts, cur: sel.value }); } }
    return rows;
  };
  const productPcOptions = L => { const sel = productSelect(L, 'pc'); return sel ? [...sel.options].filter(o => !o.disabled).map(o => o.value) : []; };
  const productMobileOptions = L => { const sel = productSelect(L, 'mobile'); return sel ? [...sel.options].filter(o => !o.disabled).map(o => o.value) : []; };
  const productSelect = (L, pf) => document.querySelector(`#lhOut select[data-out="${pf}"]`);
  const prodSelect = pf => document.querySelector(`#delivView .dv-prod select[data-prod="${pf}"]`);
  const keyOf = s => JSON.stringify([s.bakes, s.fr, s.cfg, s.names]);
  const rowEl = k => { const x = panelRows.find(([row, it]) => (Array.isArray(it) ? it[0] : it.sel || it.text || it.curve) === k); return x && x[0]; };
  const setRow = (r, v) => {
    if (r.kind === 'lay') { const L = state.layers[state.comboSel], sel = productSelect(L, r.key.slice(6)); if (!sel) return '找不到产物表的下拉'; sel.value = String(v); sel.dispatchEvent(new Event('change', { bubbles: true })); return ''; }
    if (r.kind === 'prod') { renderDeliv(); const sel = prodSelect(r.key.slice(5)); if (!sel) return '找不到交付清单产物表的下拉'; sel.value = String(v); sel.dispatchEvent(new Event('change', { bubbles: true })); return ''; }
    const row = rowEl(r.key); if (!row) return '找不到这一行';
    const s = row.querySelector('select'); if (s) { const o = [...s.options].find(o => o.value === String(v)); if (!o) return '没有选项 ' + v; s.value = String(v); s.dispatchEvent(new Event('change', { bubbles: true })); return ''; }
    const n = row.querySelector('.num'); if (n) { n.value = String(v); n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); return ''; }
    return '这一行没有控件';
  };
  // 拨哪几个值：要有区别的行全拨；别的结构行拨两个（上限 + 往上一成，不行就下限）；像素行拨一个
  const valuesFor = (r, strict, pix) => {
    if (r.kind === 'sel' || r.kind === 'lay' || r.kind === 'prod') { const o = r.opts.filter(v => String(v) !== String(r.cur)); return strict ? o : pix ? o.slice(-1) : [...new Set([o[0], o[o.length - 1]])].filter(v => v !== undefined); }
    const [lo, hi, st] = r.rng, cur = +r.cur, set = new Set(), ok = v => Math.abs(v - cur) > 1e-9;
    if (r.key === 'cutIn' || r.key === 'cutOut') return [0.5, 1.2].filter(ok);     // 入出点拨在内容里面（拨到 30 s 会被夹回自动）
    if (strict && +st >= 1 && Number.isInteger(+st) && (hi - lo) / st <= 8) { for (let v = lo; v <= hi + 1e-9; v += st) set.add(+v.toFixed(6)); return [...set].filter(ok); }
    const up = +Math.min(hi, cur + Math.max(st, (hi - lo) * 0.1)).toFixed(6), c = [hi, lo, up].filter(ok);
    return pix ? c.slice(0, 1) : c.slice(0, 2);
  };
  const emptyShell = cfg => { const bad = [];
    for (const [f, j] of Object.entries(cfg || {})) for (const e of j.emitters || []) {
      const sp = e.spawn || {}, rate = sp.rate ? +(sp.rate.const != null ? sp.rate.const : 1) : 0, bursts = (sp.bursts || []).reduce((a, b) => a + (+b[1] || 0), 0);
      if (!(rate > 0) && !(bursts > 0)) bad.push(`${f} ${e.name}：出生率 0 又没有 Burst（空壳发射器）`);
      const mods = (e.modules || []).map(m => m.m);
      if (!mods.includes('Lifetime')) bad.push(`${f} ${e.name}：没写寿命（Lifetime）`);
      if (!mods.includes('InitialSize')) bad.push(`${f} ${e.name}：没写大小（InitialSize）`);
    } return bad; };
  // 4.9.96 B1：入点 > 0、有开花闪光的礼花（单层）导出里要有 Flash（入点前的闪光单独一颗软圆点）
  const flashMiss = cfg => { const P = state.P; if (state.tab === 'combo' || familyOf(P.type) !== 'aerial' || !(+fxP(P).flash > 0) || !(+P.cutIn > 0)) return [];
    const j = cfg && cfg['cascade.json']; return j && !j.emitters.some(e => /Flash/.test(e.name)) ? ['入点前的开花闪光没导出（cascade.json 没有 Flash）'] : []; };
  // 4.9.106（导出排查 G4，用户 10-15 20:53「我希望所有导出规范都是统一的，不要因为某个效果就是新增的就单独不同」）：每种产物同一套出口——
  //   ① 包里每张贴图（PNG 文件名、cascade 里 textures[].file / asset）都是 T_EFX_FireWorks_<英文名>_…，只有英文、数字、下划线（以前地面循环 / 分层粒子图 / V5 用内部名，
  //      多层「我的效果」取中文标题只滤非 ASCII 留了减号 → T_-_-_L1_Ramp，导入器拒收）；② 交付清单不出现「按自己的规则 / 沿用原来的命名」；
  //   ③ 产物表每一行 PC、手机两格都有下拉（做不到的选项变灰写原因，不是一行灰字）；④ 交付清单「包内文件」列出了包里的每张贴图
  const NAME_RE = /^T_EFX_FireWorks_[A-Za-z0-9]+(_[A-Za-z0-9]+)*$/, stem = n => String(n || '').replace(/^.*\//, '').replace(/\.png$/i, '');
  const uniform = s => {
    const bad = [];
    for (const [f, j] of Object.entries(s.cfg || {})) for (const [k, t] of Object.entries({ ...(j.textures || {}), ...(j.extras || {}) })) {
      if (!t || !t.file) continue; const a = t.asset || stem(t.file);
      if (!NAME_RE.test(a) || !NAME_RE.test(stem(t.file))) bad.push(`${f} ${k} 贴图名 ${t.asset ? a : stem(t.file)} 不合命名规范`); }
    const png = (s.names || []).filter(n => /\.png$/i.test(n) && !/FrameTest/.test(n));
    for (const n of png) if (!NAME_RE.test(stem(n))) bad.push(`包里 ${n} 不合命名规范`);
    try { renderDeliv(); } catch (e) { bad.push('交付清单画不出来：' + e.message); return bad; }
    const host = $('#delivView'), txt = host.textContent;
    for (const w of ['自己的规则', '自己的导出规则', '沿用原来的命名']) if (txt.includes(w)) bad.push(`交付清单还写着「${w}」`);
    const prow = [...host.querySelectorAll('.dv-prod tbody tr')];
    if (!prow.length) bad.push('产物表一行都没有');
    prow.forEach((tr, i) => { const miss = ['pc', 'mobile'].filter(pf => !tr.querySelector(`select[data-prod="${pf}"]`)); if (miss.length) bad.push(`产物表第 ${i + 1} 行没有 ${miss.map(p => p === 'pc' ? 'PC' : '手机').join(' / ')} 下拉`); });
    const listed = new Set([...host.querySelectorAll('table.dv-t:not(.dv-prod) td:first-child')].map(td => td.textContent.trim()));
    const miss = png.filter(n => !listed.has(n.replace(/^.*\//, '')));
    if (miss.length) bad.push(`交付清单「包内文件」没列出 ${miss.slice(0, 3).join('、')}${miss.length > 3 ? ` 等 ${miss.length} 张` : ''}`);
    return bad.map(x => '统一规范：' + x);
  };
  window.__uniform = async () => uniform(await __sig());
  window.__contract = async (onlyKeys, budgetMs) => {
    const T0 = performance.now(), out = [], formsNow = () => state.tab === 'combo' ? state.layers.map(L => { const e = layerEntryOf(L); return e && e.bake ? e.bake.form : ''; }) : [state.bake ? state.bake.form : ''];
    const reg = { forms: formsNow(), registry: Object.keys(PRODUCT_FORMS), formNames: Object.keys(FORM_NAMES) };
    // 4.9.106 G4：登记表写了 noPack 的产物（上升星头循环）：导出必须被拦、原因要写出来；别的行不拨（没有包可比）
    const np = (state.tab === 'combo' ? state.layers.map(L => { const e = layerEntryOf(L); return e && e.bake; }) : [state.bake]).map(b => b && productNoPack(b)).filter(Boolean);
    if (np.length) { const s = await __sig(); renderDeliv(); const btn = $('#dvExport');
      const json = [...(s.cfg && Object.keys(s.cfg).length ? ['登记为不能出包，导出却出了 cascade'] : []), ...(s.log.some(l => l.includes(np[0].slice(0, 12))) ? [] : ['登记为不能出包，导出没写原因：' + s.log.join('；').slice(0, 160)]), ...(btn && btn.disabled ? [] : ['交付清单的导出按钮没变灰'])];
      return { rows: [], json, ms: Math.round(performance.now() - T0), ...reg }; }
    const rows = __rows().filter(r => !onlyKeys || onlyKeys.includes(r.key));
    const b1 = await __sig(), b2 = await __sig();
    const json = [...new Set([...b1.gate.map(g => '导出拦截：' + g), ...emptyShell(b1.cfg), ...flashMiss(b1.cfg), ...uniform(b1), ...(b1.cfg && Object.keys(b1.cfg).length ? [] : ['导出没出 cascade.json：' + b1.log.join('；')])])];     // 4.9.106：空的也算没出（上升星头循环以前出一个没有 cascade.json 的包）
    if (keyOf(b1) !== keyOf(b2)) return { err: '同一状态导出两次结果不同（检查本身不稳）', rows: [], json };
    const P0 = structuredClone(state.P), L0 = state.tab === 'combo' && state.comboSel >= 0 ? structuredClone(state.layers[state.comboSel].out || null) : undefined, bk = keyOf(b1), bi = JSON.stringify(b1.ins);
    const restore = async () => { for (const k of Object.keys(state.P)) if (!(k in P0)) delete state.P[k]; Object.assign(state.P, structuredClone(P0));
      if (L0 !== undefined) { const L = state.layers[state.comboSel]; if (L0) L.out = structuredClone(L0); else delete L.out; }
      onParam(); await idle(); };
    for (const r of rows) {
      if (budgetMs && performance.now() - T0 > budgetMs) { out.push({ key: r.key, skip: '超时没测' }); continue; }
      if (SKIP[r.key]) { out.push({ key: r.key, skip: SKIP[r.key] }); continue; }
      const pix = PIXEL.has(r.key) || !STRUCT_SECS.has(r.sec), strict = STRICT.has(r.key), tried = [];
      for (const v of valuesFor(r, strict, pix)) {
        const e = setRow(r, v); if (e) { tried.push({ v, err: e }); continue; }
        await idle();
        let s; if (pix) s = { ins: insNow(), log: state.bakeError ? ['烘焙报错：' + String(state.bakeError.message || state.bakeError).slice(0, 200)] : [] }; else s = await __sig();
        const k = pix ? null : keyOf(s);
        tried.push({ v, k, out: !pix && k !== bk, inp: JSON.stringify(s.ins) !== bi, gate: s.gate || [], shell: pix ? [] : emptyShell(s.cfg), log: s.log || [] });
      }
      await restore();
      const ok = tried.filter(t => !t.err); let bad = '', note = '';
      if (!ok.length) bad = tried.length ? '控件写不进去：' + tried.map(t => t.err).join('；') : '';
      else if (pix) { if (!ok.some(t => t.inp)) bad = '没进烘焙入口的参数（改了不重烘，或者被改写掉了）'; }
      else if (!ok.some(t => t.out)) { const why = ok.some(t => t.inp) ? '只进了烘焙参数：帧计划、取景和 cascade.json 都没变' : '帧计划、取景、cascade.json、烘焙参数都没变'; if (COND[r.key]) note = `代表效果上不起作用（${COND[r.key]}）：${why}`; else bad = why; }
      if (!bad && strict && !pix) {
        const auto = v => v === 0 || v === '0' || v === 'auto', seen = new Map(auto(r.cur) ? [] : [[bk, String(r.cur)]]), dup = [];
        for (const t of ok) { if (auto(t.v)) continue; if (seen.has(t.k)) dup.push(`${t.v} = ${seen.get(t.k)}`); else seen.set(t.k, String(t.v)); }
        if (dup.length) bad = '选项之间没有区别：' + dup.join('、');
      }
      const gate = [...new Set(ok.flatMap(t => [...t.gate.map(g => `${t.v} → 导出拦截：${g}`), ...t.shell.map(x => `${t.v} → ${x}`)]))];
      if (!bad && ok.some(t => t.shell.length)) bad = '有的值导出空壳发射器：' + gate.filter(g => /空壳|没写/.test(g)).slice(0, 3).join('；');
      out.push({ key: r.key, sec: r.sec, cur: r.cur, bad, note, warn: gate.slice(0, 4), vals: tried.map(t => t.err ? `${t.v}!` : `${t.v}${t.out ? '✓' : t.inp ? '·' : '✗'}`).join(' '), log: [...new Set(ok.flatMap(t => t.log))].slice(0, 2) });
    }
    return { rows: out, json, ms: Math.round(performance.now() - T0), ...reg };
  };
  return 0;
})()"""

# 代表效果（每种产物形态单层 / 多层各一个）：open = 页面里打开它的 JS（await 得到），keys = 只测这几行（None = 「输出」里全部看得见的行）
SCENARIOS = [
    ('空中大面片·单层', "openType('kiku')", None),
    ('空中大面片·分段', "(async () => { openType('kiku'); await __idle(); state.P.form = 'segments'; onParam(); })()", ['frameBudget', 'cutIn', 'cutOut', 'outPack', 'pageTarget']),
    ('地面循环·单层', "openType('fountain')", None),
    ('分层粒子图·单层', "openReview(entryById('SGR1'))", None),
    ('合成一张·单层', "openReview(entryById('CSLRS'))", None),
    ('合成一张·固定机位', "(async () => { await openReview(entryById('CSLRS')); await __idle(); state.P.frameBudget = 'fixed'; onParam(); })()", ['holdTicks']),
    ('近段+远段+粒子·单层', "openReview(entryById('RT6S'))", None),
    ('V5 尾缀·单层', "openType('trailS')", None),
    ('空中大面片·多层', "(async () => { await openEffect(EFFS().find(e => e.key === 'hiki_nishiki')); await __idle(); selectComboLayer(1); })()", None),
    ('合成一张·多层', "(async () => { await openReview(entryById('CSLRC')); await __idle(); selectComboLayer(0); })()", None),
    ('纯星头·多层', "(async () => { await openReview(entryById('CSLRC')); await __idle(); selectComboLayer(1); })()", None),
    ('纯星头·单层', "openReview(entryById('CSLRC-H'))", ['cutIn', 'cutOut', 'rtBright', 'prod.pc', 'prod.mobile']),     # 4.9.96 H1：PC 序列 / CPU 粒子
    ('空中大面片·入点前闪光', "openReview(entryById('MYCR-O'))", ['cutIn', 'outPC', 'outMobile']),     # 4.9.96 B1 / B2：入点、单束 / 光点都要带 Flash
    ('合成一张·一层的我的效果', "myCreate('rv:CSLRS')", ['zoom', 'frameBudget', 'cutIn', 'outMode', 'rtGrid', 'L.out.pc', 'L.out.mobile']),
    ('分层粒子图·一层的我的效果', "myCreate('rv:SGR1')", ['cellPad', 'cameraMotion', 'L.out.pc', 'L.out.mobile']),
    # 4.9.106 G4：产物形态登记表里每一种都要有代表（门禁按登记表核对，缺了算 ❌）
    ('上升星头循环·单层', "openType('rise')", None),
    ('单元序列·单层', "(async () => { openType('kiku'); await __idle(); state.P.form = 'unit'; state.P.stars = 40; onParam(); })()", ['prod.pc', 'prod.mobile', 'cutIn']),     # 手机单束每颗星一个粒子，规范 ≤ 50
    ('地面循环·多层', "(async () => { await myCreate('fountain'); await __idle(); selectComboLayer(0); })()", ['L.out.pc', 'L.out.mobile']),
]


# 导出对照（--compare 旧版.html）：所有待我验收 / 正式库条目 + 花型模板，在新旧两个烘焙器里打开、导出（同一个桩），参数 / 帧计划 / cascade.json 逐项比
COMPARE_JS = r"""(async ids => {
  const out = {};
  for (const id of ids) {
    try {
      window.__opening = true;
      try { if (id.startsWith('type:')) openType(id.slice(5)); else await openReview(FW_REVIEW_LIST.find(x => x.id === id)); } finally { window.__opening = false; }
      await __idle();
      const P = state.tab === 'combo' ? state.layers.map(L => { const e = layerEntryOf(L); return e && e.P; }) : state.P;
      const s = await __sig();
      const nv = x => JSON.parse(JSON.stringify(x === undefined ? null : x).split(VERSION).join('VER'));     // 版本号本身不算不一样
      out[id] = { P: JSON.stringify(nv(P)), bakes: JSON.stringify(s.bakes), fr: JSON.stringify(s.fr), cfg: nv(s.cfg), names: s.names, gate: s.gate, log: s.log };
    } catch (e) { out[id] = { err: String(e && e.message || e).slice(0, 200) }; }
  }
  return out;
})"""
COMPARE_IDS_JS = r"""(() => [...FW_REVIEW_LIST.filter(e => (e.kind === 'preset' || e.kind === 'combo') && !e.hidden).map(e => e.id), ...Object.keys(TYPES).map(t => 'type:' + t)])()"""


def jdiff(a, b, path='', out=None, lim=6):
    out = [] if out is None else out
    if len(out) >= lim: return out
    if type(a) != type(b): out.append(f'{path or "/"}: {str(a)[:60]} → {str(b)[:60]}'); return out
    if isinstance(a, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b: out.append(f'{path}/{k}: {"没有" if k not in a else str(a[k])[:50]} → {"没有" if k not in b else str(b[k])[:50]}')
            else: jdiff(a[k], b[k], f'{path}/{k}', out, lim)
            if len(out) >= lim: break
    elif isinstance(a, list):
        if len(a) != len(b): out.append(f'{path}: {len(a)} 项 → {len(b)} 项')
        for i, (x, y) in enumerate(zip(a, b)):
            jdiff(x, y, f'{path}[{i}]', out, lim)
            if len(out) >= lim: break
    elif a != b: out.append(f'{path}: {str(a)[:60]} → {str(b)[:60]}')
    return out


async def export_all(html, ids, tag):
    from playwright.async_api import async_playwright
    from browser_runtime import launch_async
    res = {}
    async with async_playwright() as p:
        b = await launch_async(p)
        for k in range(0, len(ids), 20):     # 每 20 个开一页新页面（防内存涨）
            ctx = await b.new_context(viewport={'width': 1440, 'height': 900}); pg = await ctx.new_page()
            await pg.add_init_script("window.requestAnimationFrame = () => 0;")
            await pg.goto(html, wait_until='load', timeout=0)
            await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
            await pg.evaluate(LIB)
            try: res.update(await pg.evaluate(COMPARE_JS + '(' + json.dumps(ids[k:k + 20]) + ')'))
            except Exception as e:
                for i in ids[k:k + 20]: res.setdefault(i, {'err': '页面异常：' + str(e)[:160]})
            await ctx.close()
            print(f'  {tag} {min(k + 20, len(ids))}/{len(ids)}', flush=True)
        await b.close()
    return res


def run_compare(old_html, new_html, only_ids):
    async def ids_of():
        from playwright.async_api import async_playwright
        from browser_runtime import launch_async
        async with async_playwright() as p:
            b = await launch_async(p); pg = await (await b.new_context()).new_page()
            await pg.add_init_script("window.requestAnimationFrame = () => 0;")
            await pg.goto(new_html, wait_until='load', timeout=0); await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
            r = await pg.evaluate(COMPARE_IDS_JS); await b.close(); return r
    ids = only_ids or asyncio.run(ids_of())
    async def both():
        return await asyncio.gather(export_all(old_html, ids, '旧'), export_all(new_html, ids, '新'))
    old, new = asyncio.run(both())
    rows = []
    for i in ids:
        a, b = old.get(i, {}), new.get(i, {})
        if a.get('err') or b.get('err'): rows.append({'id': i, 'kind': '出错', 'what': [a.get('err', ''), b.get('err', '')]}); continue
        d = {}
        if a['P'] != b['P']: d['参数'] = jdiff(json.loads(a['P']), json.loads(b['P']))
        if a['bakes'] != b['bakes'] or a['fr'] != b['fr']: d['帧计划'] = jdiff(json.loads(a['bakes']), json.loads(b['bakes'])) + jdiff(json.loads(a['fr']), json.loads(b['fr']), '导出时')
        if a['cfg'] != b['cfg']: d['cascade'] = jdiff(a['cfg'], b['cfg'])
        if a['names'] != b['names']: d['文件'] = jdiff(a['names'], b['names'])
        if a['gate'] != b['gate']: d['拦截'] = [str(a['gate'])[:120], str(b['gate'])[:120]]
        if d: rows.append({'id': i, 'kind': '变了', 'what': d})
    return ids, rows

def sh(*a, **k):
    return subprocess.run(list(a), cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace', **k)


def changed_files(base, head='HEAD', committed_only=False):
    files = set()
    r = sh('git', 'diff', '--name-only', f'{base}...{head}')
    if r.returncode == 0: files |= {x for x in r.stdout.splitlines() if x}
    elif committed_only: raise RuntimeError(f'git diff {base}...{head} 失败：' + r.stderr.strip()[:200])
    if not committed_only:
        r = sh('git', 'status', '--porcelain', '-uno', '-z')
        for ent in r.stdout.split('\0'):
            if len(ent) > 3: files.add(ent[3:])
    return sorted(files)


HOOK_PATHS = (*BUILD_INPUTS, *BUILD_OUTPUTS, 'analysis/scripts/')     # 钩子在原地跑的前提：这些文件和要推的提交一致


def hook_in_temp(a, head_sha):
    """要推的提交 ≠ 工作树（别的对话框没提交的改动、或推的不是 HEAD）：在临时工作副本里按要推的提交跑，跑完删掉"""
    tmp = tempfile.mkdtemp(prefix='fwl-gate-')
    r = sh('git', 'worktree', 'add', '--detach', '--force', tmp, head_sha)
    if r.returncode != 0:
        shutil.rmtree(tmp, ignore_errors=True)
        print('❌ 临时工作副本建不起来：' + (r.stderr or r.stdout).strip()[:300], flush=True); return 2
    try:
        print(f'… 工作树里有没提交的相关改动 / 推的不是 HEAD：在临时工作副本 {tmp} 里按 {head_sha[:8]} 跑', flush=True)
        args = [sys.executable, os.path.join(tmp, 'analysis', 'scripts', '合入门禁.py'), '--hook', '--inner', '--base', a.base, '--head', 'HEAD', '--budget', str(a.budget), '--jobs', str(a.jobs)]
        if a.out: args += ['--out', os.path.abspath(a.out)]
        if a.html: args += ['--html', a.html]
        return subprocess.run(args, cwd=tmp).returncode
    finally:
        sh('git', 'worktree', 'remove', '--force', tmp); shutil.rmtree(tmp, ignore_errors=True); sh('git', 'worktree', 'prune')


def check_sync():
    r = sh(sys.executable, 'analysis/scripts/同步体检.py', '--no-fetch')
    tail = [x for x in r.stdout.splitlines() if x.strip()][-6:]
    return r.returncode == 0, '；'.join(tail)[-600:]


def check_build(inner=False):
    dirty = sh('git', 'status', '--porcelain', '-uno', '--', *BUILD_INPUTS).stdout.strip()
    r = sh(sys.executable, 'tool/build.py')
    if r.returncode != 0:
        return False, '构建 / 静态检查没过：' + ' '.join(r.stdout.split())[-600:]
    diff = sh('git', 'diff', '--stat', 'HEAD', '--', *BUILD_OUTPUTS).stdout.strip()
    if diff and not dirty:
        return False, ('提交的成品和源码对不上：在你的工作副本跑 python tool/build.py，把成品一起提交再推（这是临时工作副本里查的）：' if inner else '提交的成品和源码对不上（重新 build 以后变了，已经生成好，提交上去再推）：') + diff.splitlines()[-1]
    return True, ('构建通过（工作树里有没提交的源码改动，成品按工作树生成）' if dirty else '构建通过，成品和提交的一致')


async def run_contract(html, names, budget, jobs=2):
    """代表效果逐个打开拨行；jobs 个页面并行（每个页面一个代表效果，打开前新开、做完关掉）"""
    from playwright.async_api import async_playwright
    from browser_runtime import launch_async
    todo = [x for x in SCENARIOS if not names or x[0] in names]
    res = {}
    async with async_playwright() as p:
        b = await launch_async(p)
        q = asyncio.Queue()
        for x in todo: q.put_nowait(x)
        async def one(name, open_js, keys):
            t0 = time.time()
            ctx = await b.new_context(viewport={'width': 1440, 'height': 900})
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.add_init_script("window.requestAnimationFrame = () => 0;")
            try:
                await pg.goto(html, wait_until='load', timeout=0)
                await pg.wait_for_function('window.__fw && typeof EFFS === "function"', timeout=0)
                await pg.evaluate(LIB)
                await pg.evaluate("(async () => { window.__opening = true; try { await (" + open_js + "); } finally { window.__opening = false; } await __idle(); return 0; })()")
                r = await pg.evaluate("(async () => __contract(" + json.dumps(keys) + ", " + str(int(budget * 1000)) + "))()")
            except Exception as e:
                r = {'err': '异常：' + str(e)[:300], 'rows': [], 'json': []}
            await ctx.close()
            r['name'] = name; r['sec'] = round(time.time() - t0, 1); r['pageErrors'] = errs[:3]
            bad = [x for x in r.get('rows', []) if x.get('bad')]
            mark = '❌' if (bad or r.get('err') or r.get('json') or errs) else '✅'
            lines = [f"  {mark} {name}（{r['sec']} s）：测了 {len([x for x in r.get('rows', []) if not x.get('skip')])} 行" + (f"，{len(bad)} 行接不上" if bad else '') + (f"；{r['err']}" if r.get('err') else '')]
            lines += [f"      · {x['key']}（{x.get('sec', '')}）：{x['bad']}  [{x['vals']}]" for x in bad]
            lines += [f"      ⚠ {x['key']}：{x['note']}  [{x['vals']}]" for x in r.get('rows', []) if x.get('note')]
            lines += [f"      · 导出：{j}" for j in r.get('json', [])[:6]] + [f"      · 页面错误：{e[:200]}" for e in errs[:2]]
            print('\n'.join(lines), flush=True)
            res[name] = r
        async def worker():
            while not q.empty():
                x = q.get_nowait()
                await one(*x)
        await asyncio.gather(*[worker() for _ in range(max(1, jobs))])
        await b.close()
    return [res[x[0]] for x in todo if x[0] in res]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default='origin/main'); ap.add_argument('--all', action='store_true')
    ap.add_argument('--only', default=''); ap.add_argument('--scn', default=''); ap.add_argument('--out', default='')
    ap.add_argument('--html', default=''); ap.add_argument('--budget', type=float, default=150, help='每个代表效果最多测几秒（超了的行写「超时没测」）')
    ap.add_argument('--jobs', type=int, default=2, help='并行几个页面（默认 2）')
    ap.add_argument('--compare', default='', help='旧版 FireworkBaker.html：所有条目 + 花型模板新旧两版导出逐项对照（不跑别的检查）'); ap.add_argument('--ids', default='')
    ap.add_argument('--hook', action='store_true', help='pre-push 钩子用：只看 base...head 这些要推的提交（见文件头）')
    ap.add_argument('--head', default='HEAD', help='--hook：要推的提交')
    ap.add_argument('--inner', action='store_true', help=argparse.SUPPRESS)     # 临时工作副本里那一次（体检外面已经跑过）
    a = ap.parse_args()
    only = {x for x in a.only.split(',') if x}
    try: files = changed_files(a.base, a.head, committed_only=a.hook)
    except RuntimeError as e: print('❌', e, flush=True); sys.exit(2)
    if a.hook and not a.inner and not only and not a.all and any(f.startswith(BUILD_INPUTS) for f in files):
        head_sha, cur = sh('git', 'rev-parse', a.head).stdout.strip(), sh('git', 'rev-parse', 'HEAD').stdout.strip()
        dirty = sh('git', 'status', '--porcelain', '-uno', '--', *HOOK_PATHS).stdout.strip()
        if head_sha != cur or dirty:
            ok, why = check_sync(); print(('✅' if ok else '❌'), '体检', why, flush=True)
            if not ok: print('有 ❌，先修再推', flush=True); sys.exit(1)
            sys.exit(hook_in_temp(a, head_sha))
    src = a.all or any(f.startswith(SRC_PREFIX) for f in files)
    bld = a.all or any(f.startswith(BUILD_INPUTS) for f in files)
    want = lambda k, cond: (k in only) if only else cond
    html = validation_url(a.html, ROOT / 'tool' / 'FireworkBaker.html')
    if a.compare:
        old = validation_url(a.compare)
        ids, rows = run_compare(old, html, [x for x in a.ids.split(',') if x])
        print(f'导出对照：{len(ids)} 个条目 / 模板，{len([r for r in rows if r["kind"] == "变了"])} 个变了，{len([r for r in rows if r["kind"] == "出错"])} 个出错', flush=True)
        for r in rows: print(f'  · {r["id"]} {r["kind"]}：' + json.dumps(r['what'], ensure_ascii=False)[:600], flush=True)
        if a.out: json.dump({'ids': ids, 'rows': rows}, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        sys.exit(0)
    print(f'合入门禁{"（推送前）" if a.hook else ""}：改动 {len(files)} 个文件（相对 {a.base}{"" if a.hook else "，含没提交的"}）' + ('，动了烘焙器源码' if src else ''), flush=True)
    report, ok_all, T = [], True, time.time()
    def put(item, ok, why):
        nonlocal ok_all
        ok_all &= bool(ok); report.append({'item': item, 'pass': bool(ok), 'why': why})
        print(('✅' if ok else '❌'), item, why, flush=True)
    if want('体检', not a.inner): put('体检', *check_sync())
    if want('构建', bld): put('构建', *check_build(a.inner))
    if want('契约', src) or want('导出', src) or want('界面', src):
        try: verify_validation_source(html, ROOT / 'tool' / 'FireworkBaker.html')
        except Exception as e: print('❌ 测试入口', e, flush=True); sys.exit(2)
    if want('契约', src) or want('导出', src):
        names = {x for x in a.scn.split(',') if x}
        print('… 产物契约 + 导出 JSON（代表效果逐个打开，拨「输出」里每一行）', flush=True)
        res = asyncio.run(run_contract(html, names, a.budget, a.jobs))
        bad = [(r['name'], x) for r in res for x in r.get('rows', []) if x.get('bad')]
        errs = [(r['name'], r['err']) for r in res if r.get('err')]
        put('契约', not bad and not errs, f'{len(res)} 个代表效果、{sum(len([x for x in r.get("rows", []) if not x.get("skip")]) for r in res)} 行' + (f'；{len(bad)} 行接不上：' + '；'.join(f'{n} › {x["key"]}' for n, x in bad[:12]) if bad else '') + (f'；{len(errs)} 个出错' if errs else ''))
        jbad = [(r['name'], j) for r in res for j in r.get('json', [])]
        # 4.9.106 G4：产物形态登记表 ⊇ 烘焙器所有产物（FORM_NAMES），代表效果覆盖登记表里每一种；只挑了几个代表（--scn）时不查覆盖
        reg = next((r for r in res if r.get('registry')), None)
        if reg:
            miss_reg = sorted(set(reg['formNames']) - set(reg['registry']))
            if miss_reg: jbad.append(('产物形态登记表', '烘焙器有产物没登记（61_naming.js PRODUCT_FORMS）：' + '、'.join(miss_reg)))
            if not names:
                seen = {f for r in res for f in r.get('forms', []) if f}
                miss_scn = sorted(set(reg['registry']) - seen)
                if miss_scn: jbad.append(('产物形态登记表', '这几种产物没有代表效果（合入门禁.py SCENARIOS 加一行）：' + '、'.join(miss_scn)))
        put('导出', not jbad, '导出拦截、空壳发射器、寿命 / 大小都过' if not jbad else '；'.join(f'{n}：{j}' for n, j in jbad[:8]))
        report.append({'item': '契约明细', 'data': res})
    if want('界面', src):
        r = sh(sys.executable, 'analysis/scripts/界面状态检查.py', '--only', ','.join(UI_ITEMS), '--html', html)
        lines = [x for x in r.stdout.splitlines() if x.startswith(('✅', '❌'))]
        bad = [x for x in lines if x.startswith('❌')]
        put('界面', r.returncode == 0 and bool(lines), f'{len(lines) - len(bad)}/{len(lines)} 项过' + ('：' + '；'.join(x[:160] for x in bad) if bad else ''))
    print(('可以推' if ok_all else '有 ❌，先修再推') + f'（{round(time.time() - T)} s）', flush=True)
    if a.out: json.dump(report, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    sys.exit(0 if ok_all else 1)


if __name__ == '__main__':
    main()
