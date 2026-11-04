// =====================================================================
//  4.9.126 多层「合成一张」（导出（23）；用户 11-03 20:33「多层效果合并成一层导出」、11-04 10:37「PC与手机都要有，能接受统一用一层颜色」；
//  方案 协作/方案/多层合成一张_2026-11-03.md）
//  产物表里某一层的 PC / 手机选「合成一张」= 这一层进这个平台的合成序列。同一平台选了合成一张的层（一层也算）烘成一张灰度序列、一个发射器：
//    · 不重新模拟：拿各层已经烘好的帧，按引擎回放同一套规则（drawLayer：层的开始时间 / 时间倍率 / 缩放 / 镜像、入点前放大、Zoom）
//      取每个 tick 各层正在播的那一格，按世界坐标重采样到一个固定取景里——合出来的每一帧就是分层回放那一刻的样子。
//    · 颜色只能一种（灰度 + 一张 Ramp + 一条颜色曲线，不新增材质）：用这几层里层号最小那一层的 Ramp 和颜色曲线（「颜色层」）。
//      别的层先按自己的 Ramp × 颜色曲线 × 星头亮度换算出显示亮度，再找颜色层上同样亮的灰度——亮度不变，只有色相统一；几层的光在曝光后线性相加再编码。
//    · 帧：各层换帧的 tick 合起来（不丢帧）；超过预算（各层里最多那层的贴图张数 × 一张的格数）按运动删：两帧并成一帧时，
//      跑得最快的星多跳的像素最少的先并（和「按运动分」同一个想法）。
//    · 开花闪光、GPU 光点、单束、单帧、尾缀层照各自的产物出；合成一张只合大面片序列。
//  导出名：这一层的英文名换成 Mix（T_EFX_FireWorks_<名>_Mix_<列>x<行>_<序号>）；PC、手机合的层不一样时手机叫 MixM。
// =====================================================================
const MERGE_EN = 'Mix', MERGE_EN_M = 'MixM';
// 这一层能不能选「合成一张」：只有多层里的空中大面片序列（母版 / 分段）能合
function mergeOutputReason(L, e, combo = true) {
  if (!combo) return '合成一张是多层效果的：几层烘成一张序列；单层效果本来就是一张';
  const P = e && e.P; if (!P) return '';
  if (typeof isEmit === 'function' && isEmit(P)) return '尾缀层按尾缀自己的产物出（近段 / 合成一张在尾缀那一行选），不能和礼花层合成一张';
  const F = typeof productFormOf === 'function' ? productFormOf((e && e.bake) || P) : null;
  if (F && F !== PF_AIR) return '只有空中大面片序列能合成一张（这一层是' + ((typeof FORM_NAMES !== 'undefined' && FORM_NAMES[productFormKey((e && e.bake) || P)]) || '别的产物') + '）';
  if (typeof EventInstances !== 'undefined' && EventInstances.on(L)) return 'CPU 事件实例层只支持单段序列，不能合成一张';
  return '';
}
// xs = [{ L, b, e?, i? }]，kinds[i] = 这个平台第 i 层出什么 → 合成一张的层号（按层号排，第一个是颜色层）
function mergeGroup(xs, kinds) {
  const idx = []; (xs || []).forEach((x, i) => { if (kinds[i] === 'merge' && x.b && ['master', 'segments'].includes(x.b.form)) idx.push(i); });
  return idx.length ? idx : null;
}
// 合成层在整朵里的颜色：颜色层的 Ramp / 颜色曲线，颜色阶段的时刻换成整朵的时间（合成序列的开始时间 0、时间倍率 1）
function mergeColorL(Lp) {
  const d = +Lp.delay || 0, r = +Lp.rate > 0 ? +Lp.rate : 1;
  const stages = (Lp.stages || [[0, '#ffffff']]).map(([t, c], k) => [k === 0 ? 0 : +(d + t / r).toFixed(4), c]);
  return { lib: Lp.lib, title: MERGE_EN, stages, xw: +((Lp.xw || 0.08) / r).toFixed(4), ramp0: Lp.ramp0, ramp1: Lp.ramp1, ramp2: Lp.ramp2, ramp3: Lp.ramp3,
    headInt: Lp.headInt, tailInt: Lp.tailInt, delay: 0, rate: 1, scale: 1, mirror: false };
}
const mergeLum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const mergeTintLum = (L, age) => Math.max(0, mergeLum(tintAt(L, age))) * intOr1(L.headInt);
// 一层在某个 tick（整朵的时间 T，已经落在 1/30 s 上）正在播什么：和 drawLayer 同一套（segAt / 入点前放大 / frameIdx / layerRectAt）
function mergeStateAt(src, T) {
  const L = src.L, b0 = src.b, age0 = (T - (+L.delay || 0)) * (+L.rate > 0 ? +L.rate : 1);
  const b = segAt(b0, age0), m = b.meta, age = age0 - (m.t0 || 0), ps = preScaleAt(b0, m, b, age0, age), f = ps > 0 ? 0 : frameIdx(m, age);
  if (f < 0) return null;
  const Lr = { ...L, scale: +L.scale > 0 ? +L.scale : 1 }, r = ps > 0 ? preRect(layerRectAt(m, Lr, 0), ps) : layerRectAt(m, Lr, age), part = src.parts.indexOf(b);
  return { part, b, m, f, ps, age0, r, key: part + ':' + f + (ps > 0 ? ':' + ps.toFixed(4) : '') };
}
function mergeSources(xs, idx) {
  return idx.map(i => { const x = xs[i]; return { i, L: x.L, b: x.b, parts: bakeParts(x.b), sc: +x.L.scale > 0 ? +x.L.scale : 1, r: +x.L.rate > 0 ? +x.L.rate : 1, d: +x.L.delay || 0 }; });
}
// 帧计划 + 取景（不读像素，便宜：交付清单、产物表也用它估帧数 / 张数）
function mergePlan(xs, idx, o = {}) {
  const S = mergeSources(xs, idx);
  let a = Infinity, z = -Infinity;
  for (const s of S) { const m0 = s.b.meta, pre = m0.pre && !m0.zoom ? m0.pre : null, st = pre ? pre.from : (m0.t0 || 0); a = Math.min(a, s.d + st / s.r); z = Math.max(z, s.d + bakeTotal(s.b) / s.r); }
  if (!isFinite(a) || !(z > a)) return null;
  const kA = Math.floor(a * 30 + 1e-6) - 1, kB = Math.ceil(z * 30 + 1e-6) + 1, ticks = [];
  for (let k = kA; k <= kB; k++) { const T = k / 30, st = S.map(s => mergeStateAt(s, T)); ticks.push({ k, st, key: st.map(q => q ? q.key : '-').join('|') }); }
  const live = ticks.filter(t => t.st.some(Boolean)); if (!live.length) return null;
  const k0 = live[0].k, kE = live[live.length - 1].k + 1, byK = new Map(ticks.map(t => [t.k, t]));
  let K = []; for (const t of ticks) if (t.k >= k0 && t.k < kE && (!K.length || byK.get(K[K.length - 1]).key !== t.key)) K.push(t.k);
  const union = K.length;
  // 格子：各层单格最大的那个（不丢细节），贴图边长取各层最大的；预算 = 各层里贴图张数最多的那层 × 一张的格数（最多 3 张：手游一个包最多 3 个发射器，每张一个）
  const cell = Math.max(...S.map(s => Math.max(...s.parts.map(p => Math.round(p.meta.L.cellW))))), N = Math.max(...S.map(s => Math.max(...s.parts.map(p => Math.round(+(p.P && p.P.texW) || p.N || 2048))))) || 2048;
  const cols = Math.max(1, Math.round(N / cell)), cap = cols * cols * 4, pagesBudget = clamp(Math.max(...S.map(s => s.parts.length)), 1, MOBILE_EMITTERS_MAX), budget = o.budget > 0 ? o.budget : cap * pagesBudget;
  // 取景（整朵坐标，爆点 = 原点）：所有帧里各层面片的并集，正方形
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const k of K) for (const q of byK.get(k).st) if (q) { x0 = Math.min(x0, q.r[0]); y0 = Math.min(y0, q.r[1]); x1 = Math.max(x1, q.r[2]); y1 = Math.max(y1, q.r[3]); }
  const pad = Math.max(0, ...S.map(s => +s.b.P.cellPad || 0)), H = Math.max(x1 - x0, y1 - y0) / 2 * cell / Math.max(1, cell - 2 * pad - 1), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  // 按运动删帧：每个 tick 跑得最快的星每 tick 在合成格子里走几像素（入点前放大按面片边长每 tick 长多少）
  const ppm = cell / (2 * H), wAt = k => { const t = byK.get(k); if (!t) return 0; let w = 0;
    t.st.forEach((q, j) => { if (!q) return; const s = S[j];
      if (q.ps > 0) { const n = mergeStateAt(s, (k + 1) / 30); if (n) w = Math.max(w, Math.abs((n.r[2] - n.r[0]) - (q.r[2] - q.r[0])) * ppm); return; }
      const v = s.b.fm ? speedAt(s.b.fm, q.age0) : 30; w = Math.max(w, Math.max(0, v) * s.r * s.sc / 30 * ppm); });
    return w; };
  const W = new Map(); for (const k of K) W.set(k, wAt(k));
  while (K.length > budget) {
    let best = -1, bc = Infinity;
    for (let j = 1; j < K.length; j++) { const nx = j + 1 < K.length ? K[j + 1] : kE, c = (nx - K[j - 1]) * Math.max(W.get(K[j - 1]), W.get(K[j])); if (c < bc) { bc = c; best = j; } }
    if (best < 1) break; K.splice(best, 1);
  }
  return { S, k0, kE, K, union, cell, N, cols, cap, budget, pages: Math.ceil(K.length / cap), H, cx, cy, byK, pad, primary: S[0].i, idx: idx.slice() };
}
// 颜色层的显示亮度 Y(v) = lum(Ramp(v)) × v（单调包络）和它的反查
function mergeYTable(M) { const n = 1024, Y = new Float64Array(n + 1); let mx = 0; for (let k = 0; k <= n; k++) { const v = k / n; mx = Math.max(mx, mergeLum(rampAt(M, v)) * v); Y[k] = mx; } return Y; }
function mergeYInv(Y, y) {
  const n = Y.length - 1; if (!(y > 0)) return 0; if (y >= Y[n]) return 1;
  let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (Y[m] >= y) hi = m; else lo = m; }
  const a = Y[lo], b = Y[hi]; return (lo + (b > a ? (y - a) / (b - a) : 1)) / n;
}
const MERGE_VMAX = 253 / 255;     // 4.9.31 编码封顶 253 = 过曝
// 一层的灰度字节 → 合成序列里的曝光后光量（颜色层的口径）；颜色层自己在自己的时刻是原样解码
function mergeLUT(src, Lp, gP, T, Yp, cache) {
  const ti = (T - src.d) * src.r, tp = (T - (+Lp.delay || 0)) * (+Lp.rate > 0 ? +Lp.rate : 1), same = src.L === Lp;
  const rho = same ? 1 : clamp(mergeTintLum(src.L, ti) / Math.max(1e-4, mergeTintLum(Lp, tp)), 0, 8), key = src.i + ':' + rho.toFixed(3);
  if (cache.has(key)) return cache.get(key);
  const g = +src.b.P.encGamma || 1, lut = new Float32Array(256), Mi = comboLayerM(src.L);
  for (let q = 1; q < 256; q++) {
    const v = q / 255; let vo;
    if (same) vo = Math.pow(Math.min(v, MERGE_VMAX), g / gP);
    else vo = Math.min(MERGE_VMAX, mergeYInv(Yp, mergeLum(rampAt(Mi, v)) * v * rho));
    lut[q] = -Math.log(Math.max(1e-6, 1 - Math.pow(vo, gP)));
  }
  cache.set(key, lut); return lut;
}
// 读回一张贴图（同一次合成里每张只读一次）
function mergeImg(cache, t) { if (!t) return null; if (!cache.has(t)) cache.set(t, readRGBA8(t)); return cache.get(t); }
// 合成：pl = mergePlan；cell / N = 这个平台的单格、贴图边长（手机按 mobileParams 缩小，格子 / 帧计划不变）
async function mergeRender(pl, o = {}) {
  const cell = o.cell || pl.cell, N = o.N || pl.N, cols = pl.cols, per = cols * cols, cap = per * 4, F = pl.K.length;
  const Lp = pl.S[0].L, Pp = pl.S[0].b.P, gP = +Pp.encGamma || 1, Yp = mergeYTable(comboLayerM(Lp)), luts = new Map(), imgs = new Map(), zero = new Map();
  const pad = Math.round(pl.pad * cell / pl.cell), Hs = pl.H, px = 2 * Hs / cell, wx0 = pl.cx - Hs, wy0 = pl.cy - Hs;
  const P = { ...Pp, texW: N, texH: N, cols, rows: cols, chans: 4, outMode: 'combined', zoom: 'off', form: 'master', cutIn: 0, cutOut: 0, preRoll: 0, preFrom: -1, encGamma: gP,
    _merged: pl.S.map(s => s.i + 1) };
  // 先把用到的各层贴图都读回来（合成中途会让出页面，那时某一层可能被重烘、旧贴图被放掉）
  for (const k of pl.K) for (const q of pl.byK.get(k).st) if (q) { mergeImg(imgs, q.b.head); mergeImg(imgs, q.b.tail); }
  const X = new Float32Array(cell * cell);
  let first = null, last = null, t0 = performance.now();
  try {
    for (let p0 = 0; p0 < F; p0 += cap) {
      const n = Math.min(cap, F - p0), buf = new Uint8Array(N * N * 4), k0 = pl.K[p0], k1 = p0 + n < F ? pl.K[p0 + n] : pl.kE;
      for (let j = 0; j < n; j++) {
        X.fill(0);
        const k = pl.K[p0 + j], T = k / 30, st = pl.byK.get(k).st;
        st.forEach((q, si) => {
          if (!q) return;
          const s = pl.S[si], part = q.b, img = mergeImg(imgs, part.head), imgT = mergeImg(imgs, part.tail), Ls = part.meta.L, Ns = part.N, cw = part.cw, chh = part.chh;
          const ch = Ls.chans === 4 ? Math.floor(q.f / Ls.per) : 0, kk = q.f % Ls.per, xc = (kk % Ls.cols) * cw, yc = part.NH - (Math.floor(kk / Ls.cols) + 1) * chh;
          const zk = part.head; let zs = zero.get(zk); if (!zs) zero.set(zk, zs = new Map());
          if (!zs.has(q.f)) { let mx = 0; for (const im of [img, imgT]) if (im) for (let y = 0; y < chh && !mx; y += 1) { let a = ((yc + y) * Ns + xc) * 4 + ch; for (let x = 0; x < cw; x++, a += 4) if (im[a]) { mx = 1; break; } } zs.set(q.f, mx); }
          if (!zs.get(q.f)) return;
          const lut = mergeLUT(s, Lp, gP, T, Yp, luts), r = q.r, rw = r[2] - r[0], rh = r[3] - r[1]; if (!(rw > 0 && rh > 0)) return;
          const mir = !!s.L.mirror, fx = px / (rw / cw), fy = px / (rh / chh), ns = clamp(Math.ceil(Math.max(fx, fy) - 0.2), 1, 4);
          const ix0 = clamp(Math.floor((r[0] - wx0) / px), 0, cell), ix1 = clamp(Math.ceil((r[2] - wx0) / px), 0, cell), iy0 = clamp(Math.floor((r[1] - wy0) / px), 0, cell), iy1 = clamp(Math.ceil((r[3] - wy0) / px), 0, cell);
          const tap = (im, sx, sy) => { if (sx < 0 || sy < 0 || sx >= cw || sy >= chh) return 0; return lut[im[((yc + sy) * Ns + xc + sx) * 4 + ch]]; };
          const samp = (u, v) => { if (mir) u = 1 - u; const fxp = u * cw - 0.5, fyp = v * chh - 0.5, ax = Math.floor(fxp), ay = Math.floor(fyp), bx = fxp - ax, by = fyp - ay; let a = 0;
            for (const im of imgT ? [img, imgT] : [img]) a += (tap(im, ax, ay) * (1 - bx) + tap(im, ax + 1, ay) * bx) * (1 - by) + (tap(im, ax, ay + 1) * (1 - bx) + tap(im, ax + 1, ay + 1) * bx) * by;
            return a; };
          const inv = 1 / (ns * ns);
          for (let y = iy0; y < iy1; y++) for (let x = ix0; x < ix1; x++) {
            let acc = 0;
            for (let sy = 0; sy < ns; sy++) for (let sx = 0; sx < ns; sx++) {
              const wx = wx0 + (x + (sx + 0.5) / ns) * px, wy = wy0 + (y + (sy + 0.5) / ns) * px, u = (wx - r[0]) / rw, v = (wy - r[1]) / rh;
              if (u >= 0 && u < 1 && v >= 0 && v < 1) acc += samp(u, v);
            }
            X[y * cell + x] += acc * inv;
          }
        });
        // 编码（和 bakeFrames 的编码同一条：v = (1 − e^−x)^(1/γ)，封顶 253）；格子边留 cellPad 圈黑
        const ch = Math.floor(j / per), kk = j % per, xo = (kk % cols) * cell, yo = N - (Math.floor(kk / cols) + 1) * cell;
        for (let y = pad; y < cell - pad; y++) { let a = ((yo + y) * N + xo + pad) * 4 + ch; for (let x = pad; x < cell - pad; x++, a += 4) { const xv = X[y * cell + x]; if (xv > 0) buf[a] = Math.min(253, Math.round(Math.pow(1 - Math.exp(-xv), 1 / gP) * 255)); } }
        if (performance.now() - t0 > 40) { if (o.onProg) o.onProg((p0 + j + 1) / F); await nextTick(); t0 = performance.now(); }
      }
      const head = new Target(N, N, gl.RGBA8);
      gl.bindTexture(gl.TEXTURE_2D, head.tex); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, buf); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      const ticks = pl.K.slice(p0, p0 + n).map(k => k - k0), nT = k1 - k0, dur = ticks.map((t, i) => ((i + 1 < n ? ticks[i + 1] : nT) - t) / 30), Wm = 2 * Hs;
      const meta = { L: { cols, rows: cols, chans: 4, per, F: n, cellW: cell, cellH: cell }, t0: k0 / 30, duration: nT / 30, times: ticks.map(t => t / 30), dur, ticks, nTicks: nT, keys: keysFromTicks40(ticks, nT),
        frameTiming: 'tick-start', Ww: Wm, Wh: Wm, HX: Hs, HY: Hs, cx: pl.cx, cy: pl.cy, ppm: cell / Wm, zoom: false, sizeKeys: [[0, 1], [1, 1]], area: 1, px: 0.5, py: (pl.cy + Hs) / Wm,
        avgFps: n / Math.max(1 / 30, nT / 30), minFps: 30 / Math.max(1, ...ticks.map((t, i) => (i + 1 < n ? ticks[i + 1] : nT) - t)), maxDisp: 0, noFade: true, expoH: 1, expoT: 1,
        capacityFrames: cap, pageIndex: Math.floor(p0 / cap), pageCount: Math.ceil(F / cap), fitted: { mode: 'merge' },
        merge: { layers: pl.S.map(s => s.i + 1), color: pl.S[0].i + 1, union: pl.union, frames: F, budget: pl.budget } };
      const part = { N, NH: N, cw: cell, chh: cell, scale: 1, head, tail: null, P, form: 'master', fm: null, meta };
      await analyze(part);
      if (last) last.next = part; else first = part; last = part;
    }
  } catch (e) { if (first) disposeBake(first); throw e; }
  first.merged = { layers: pl.S.map(s => s.i), color: pl.S[0].i, union: pl.union, frames: F, budget: pl.budget };
  return first;
}
// 手机：格子 / 帧计划和 PC 一样，单格按 mobileParams 缩小（贴图 ≤ 1024）
function mergeMobileLayout(pl) {
  const mp = mobileParams({ ...pl.S[0].b.P, texW: pl.N, texH: pl.N, cols: pl.cols, rows: pl.cols }), L = layoutOf(mp);
  return { cell: Math.round(L.cellW), N: Math.round(mp.texW) };
}
// 一组层合成一张（导出用）：xs = [{ L, b }]、idx = 层号；mobile = 手机那一张
async function mergeBake(xs, idx, mobile, onProg) {
  const pl = mergePlan(xs, idx); if (!pl) throw Error('合成一张：选的几层都还没有可见的帧');
  return mergeRender(pl, { ...(mobile ? mergeMobileLayout(pl) : {}), onProg });
}
// 产物表 / 交付清单的一句话：这个平台合成一张的层、颜色层、帧数 / 张数
function mergeSummary(xs, kinds, pf) {
  const idx = mergeGroup(xs, kinds); if (!idx) return null;
  let pl = null; try { pl = mergePlan(xs, idx); } catch (e) { pl = null; }
  const lay = pl ? (pf === 'mobile' ? mergeMobileLayout(pl) : { cell: pl.cell, N: pl.N }) : null;
  return { idx, pl, text: `合成一张：第 ${idx.map(i => i + 1).join('、')} 层 · 颜色用第 ${idx[0] + 1} 层` + (pl ? ` · ${pl.K.length} 帧${pl.union > pl.K.length ? `（各层换帧合起来 ${pl.union} 帧，按运动删到预算 ${pl.budget}）` : ''} · ${pl.pages} 张 ${lay.N}² · 单格 ${lay.cell} px` : '') };
}
// 引擎回放：这个平台合成一张的那一张（缓存；烘的时候先不画、写「合成中」）
const mergePreview = { pc: null, mobile: null, busy: null, ids: new WeakMap(), n: 0 };
const mergeObjId = o => { if (!o || typeof o !== 'object') return 0; if (!mergePreview.ids.has(o)) mergePreview.ids.set(o, ++mergePreview.n); return mergePreview.ids.get(o); };
function mergePreviewSig(xs, idx, pf) {
  return pf + '|' + idx.map(i => { const L = xs[i].L; return [mergeObjId(xs[i].b), L.delay, L.rate, L.scale, L.mirror, JSON.stringify(comboLayerM(L))].join(','); }).join(';');
}
function mergePreviewBake(xs, idx, pf) {
  const sig = mergePreviewSig(xs, idx, pf), c = mergePreview[pf];
  if (c && c.sig === sig) return c.b;
  if (mergePreview.busy && mergePreview.busy.sig === sig) return null;
  const job = { sig };
  mergePreview.busy = job;
  setTimeout(async () => {
    try { const b = await mergeBake(xs, idx, pf === 'mobile'); if (mergePreview.busy !== job) { disposeBake(b); return; }
      const old = mergePreview[pf]; mergePreview[pf] = { sig, b }; if (old && old.b) disposeBake(old.b); }
    catch (e) { console.error(e); if (typeof flash === 'function') flash('合成一张预览失败：' + e.message, true); }
    finally { if (mergePreview.busy === job) mergePreview.busy = null; }
  }, 0);
  return null;
}
// 这个平台每层出什么（交付清单 / 产物表用）：PC 按层的选择，手机按 comboMobilePlan（自动的层可能不出）
function mergeKinds(xs, pf) {
  if (pf === 'mobile') { const pl = comboMobilePlan(xs); return pl.map(p => p.kind); }
  return xs.map(x => layerOut(x.L, x.e || (x.b && x.b.P ? { P: x.b.P, bake: x.b } : undefined)).pc);
}
// 产物表格子里的一句：和哪几层合、颜色用哪层、多少帧 / 张
function mergeCellText(pf) {
  const xs = curLayerBakes(), m = mergeSummary(xs, mergeKinds(xs, pf), pf);
  return m ? m.text + (m.idx.length === 1 ? ' · 只有这一层：等于单独一个序列（名字叫 Mix）' : '') + `（${pf === 'mobile' ? '手机' : 'PC'} 1 个发射器${m.pl && m.pl.pages > 1 ? ' / 张' : ''}）` : '合成一张（这一层还没烘好）';
}
// 交付清单：合成一张那几行（PC / 手机），文件名和导出同一条（层名 Mix / MixM）
function mergeDelivRows(xs, nm, useNew) {
  const rows = [], kp = mergeKinds(xs, 'pc'), km = mergeKinds(xs, 'mobile'), pi = mergeGroup(xs, kp), mi = mergeGroup(xs, km), same = !!(pi && mi && pi.join() === mi.join());
  for (const [pf, idx] of [['pc', pi], ['mobile', mi]]) {
    if (!idx) continue;
    let pl = null; try { pl = mergePlan(xs, idx); } catch (e) { pl = null; }
    const ly = pf === 'mobile' && pi && !same ? MERGE_EN_M : MERGE_EN, mob = pf === 'mobile', lay = pl ? (mob ? mergeMobileLayout(pl) : { cell: pl.cell, N: pl.N }) : null;
    rows.push(`<tr class="grp"><td colspan="4">合成一张 · ${mob ? '手机' : 'PC'}：第 ${idx.map(i => i + 1).join('、')} 层合成一个序列 · 颜色用第 ${idx[0] + 1} 层${pl ? ` · ${pl.K.length} 帧${pl.union > pl.K.length ? `（不删是 ${pl.union} 帧）` : ''}` : ''}</td></tr>`);
    if (!pl) { rows.push('<tr><td colspan="4" class="dim">这几层还没有可见的帧</td></tr>'); continue; }
    for (let p = 0; p < pl.pages; p++) {
      const a = pl.K[p * pl.cap], z = p + 1 < pl.pages ? pl.K[(p + 1) * pl.cap] : pl.kE, L = { cols: pl.cols, rows: pl.cols }, n = Math.min(pl.cap, pl.K.length - p * pl.cap), seg = pl.pages > 1 ? String.fromCharCode(65 + p) : '';
      rows.push(`<tr><td>${useNew ? fwTexName(nm.base, ly, L, p + 1, 'tex', mob) : TEX_PREFIX + nm.base + '_' + (mob ? 'Mobile_' : '') + ly + (seg ? '_' + seg : '')}.png</td><td>${mob ? '手机' : 'PC'} · ${lay.N}² · 单格 ${lay.cell} px · ${n} 帧</td><td>${(a / 30).toFixed(2)} s</td><td>${((z - a) / 30).toFixed(2)} s</td></tr>`);
      if (!mob || !same) rows.push(`<tr class="dim"><td>${useNew ? fwTexName(nm.base, ly, L, p + 1, 'C') : '…_Cutout'}.png</td><td>Cut（${same ? 'PC / 手机共用' : mob ? '手机' : 'PC'}，512）</td><td></td><td></td></tr>`);
    }
    if (!mob || !same) rows.push(`<tr class="dim"><td>${useNew ? fwTexName(nm.base, ly, null, 0, 'R') : '…_Ramp'}.png</td><td>颜色 Ramp（第 ${idx[0] + 1} 层的${same ? '，PC / 手机共用' : ''}）</td><td></td><td></td></tr>`);
  }
  return rows;
}
