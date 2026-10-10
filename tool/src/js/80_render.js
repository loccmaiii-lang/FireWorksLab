// ---------------- 渲染 ----------------
let boxRect = null, boxRectAt = -1e9;
function ensureTargets() {
  // 4.2.22：画布大小每 1/4 秒量一次（getBoundingClientRect 每帧强制排版，光这一下 3 ms）；拖栏 / 改窗口时也会在下一个 1/4 秒跟上
  const now = performance.now(); if (!boxRect || now - boxRectAt > 250) { boxRect = $('#box').getBoundingClientRect(); boxRectAt = now; }
  const box = boxRect;
  const dpr=devicePixelRatio||1;
  // 4.9.35「贴图流转」（用户 10-07 18:50「现在只有一个正方形，画布利用空间不够」）：画布铺满画面区（宽 × 高，长边最多 2048），别的视图照旧正方形
  const wide = $('#box').classList.contains('wide') && box.width > 0 && box.height > 0, k = wide ? Math.min(dpr, 2048 / Math.max(box.width, box.height)) : 0;
  const size = wide ? Math.max(256, Math.round(box.width * k / 4) * 4) : Math.max(256, Math.min(2048, Math.round(Math.min(box.width, box.height || box.width) * dpr / 4) * 4)), height = wide ? Math.max(256, Math.round(box.height * k / 4) * 4) : size;
  if (canvas.width !== size || canvas.height!==height) { canvas.width = size; canvas.height = height; }
  canvas.style.width=state.showcase?size/dpr+'px':'';canvas.style.height=state.showcase?height/dpr+'px':'';
  if (!hdrT || hdrT.w !== size || hdrT.h!==height) { gl.activeTexture(gl.TEXTURE0); hdrT && hdrT.dispose(); rgT && rgT.dispose(); hdrT = new Target(size, height, gl.RGBA16F, true); rgT = new Target(size, height, gl.RGBA16F); }
}
function setMatUniforms(pr, c, age) {
  gl.uniform3fv(pr.u.uR0, hexToLin(c.ramp0)); gl.uniform3fv(pr.u.uR1, hexToLin(c.ramp1));
  gl.uniform3fv(pr.u.uR2, hexToLin(c.ramp2)); gl.uniform3fv(pr.u.uR3, hexToLin(c.ramp3));
  gl.uniform3fv(pr.u.uTint, tintAt(c, age));
  gl.uniform1f(pr.u.uHI, c.headInt); gl.uniform1f(pr.u.uTI, c.tailInt); gl.uniform1f(pr.u.uK, 4.0);
}
function frameIdx(m, age) {
  if (m.loop) { const D = m.duration, a = ((age % D) + D) % D; return clamp(Math.floor(a / D * m.L.F), 0, m.L.F - 1); }
  if (age < 0 || age >= m.duration) return -1;
  return clamp(Math.floor(evalKeys(m.keys, age / m.duration)+(m.frameTiming==='tick-start'?1e-8:0)), 0, m.L.F - 1);
}
// 分段母版：按礼花时间找到当前该播放的那一段
function segAt(b, age) { let s = b; while (s.next && age >= s.next.meta.t0) s = s.next; return s; }
// 某一时刻的面片矩形（相对爆点）：中心 = centerAt，尺寸 = 最大尺寸 × Size By Life
function layerRectAt(m, L, age) {
  const s = sizeXY(m, age), c = centerAt(m, age), w = m.Ww * L.scale * s[0], h = m.Wh * L.scale * s[1], cx = (L.mirror ? -c[0] : c[0]) * L.scale, cy = c[1] * L.scale;
  return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
}
function bindSeqTextures(pr, b) {
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, b.head.tex); gl.uniform1i(pr.u.uH, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, (b.tail || b.head).tex); gl.uniform1i(pr.u.uT, 1);
  gl.uniform1f(pr.u.uCols, b.meta.L.cols); gl.uniform1f(pr.u.uRows, b.meta.L.rows); gl.uniform1f(pr.u.uChans, b.meta.L.chans);
  gl.uniform1f(pr.u.uComb, b.tail ? 0 : 1); gl.uniform2f(pr.u.uInset, 0.5 / b.cw, 0.5 / b.chh);
}
// 入点前放大（用户 2026-10-02 选 B）：第一段的 meta.pre = { from, dur, keys, s0 }；这段时间显示第 0 帧，面片按 keys 从小放大到 1
function preScaleAt(b0, m, b, age0, age) { return b === b0 && m.pre && age < 0 && age0 >= m.pre.from ? evalKeys(m.pre.keys, clamp((age0 - m.pre.from) / m.pre.dur, 0, 1)) : 0; }
// 4.9.21（用户 10-06 21:51 选「一律绕爆点」）：绕爆点放大（面片坐标原点 = 爆点；导出用 Pivot Offset 把爆点放在粒子上）
function preRect(r, s) { return [r[0] * s, r[1] * s, r[2] * s, r[3] * s]; }
function drawLayer(b0, L, t, view, origin = [0, 0]) {
  t=engineTick(t);
  const age0 = (t - L.delay) * L.rate, b = segAt(b0, age0), m = b.meta, age = age0 - (m.t0 || 0), ps = preScaleAt(b0, m, b, age0, age);
  const f = ps > 0 ? 0 : frameIdx(m, age);
  if (f < 0) return f;
  const pr = PR.mat; gl.useProgram(pr.p);
  const r = ps > 0 ? preRect(layerRectAt(m, L, 0), ps) : layerRectAt(m, L, age);
  gl.uniform4fv(pr.u.uRect, [r[0] + origin[0], r[1] + origin[1], r[2] + origin[0], r[3] + origin[1]]); gl.uniform4fv(pr.u.uView, view);
  bindSeqTextures(pr, b);
  gl.uniform1f(pr.u.uFrame, f); gl.uniform1f(pr.u.uMirror, L.mirror ? 1 : 0);
  setMatUniforms(pr, L, age0);
  gl.bindVertexArray(quadVAO); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.activeTexture(gl.TEXTURE0);
  return f;
}
// 单元序列：模拟 Cascade 的每颗星一个粒子
// 4.9.28 单束变体：每一张一个发射器（fwlUnit），星数平分、编号接着排；随机感 → 每颗星宽 / 长随机（uSJ）
function drawUnitLayer(b0, L, t, view) {
  const uv = b0.meta.unitVar, sj = uv ? uv.sj : [0, 0]; let id0 = 0, fr = -1;
  for (const b of [b0, ...(b0.vars || [])]) { const n = b.meta.unitN > 0 ? b.meta.unitN : b.P.stars, f = drawUnitOne(b, L, t, view, id0, sj, n); if (b === b0) fr = f; id0 += Math.round(n); }
  return fr;
}
function drawUnitOne(b, L, t, view, id0, sj, n) {
  t=engineTick(t);
  const m = b.meta, P = b.P, f = m.fit, pr = PR.unit; gl.useProgram(pr.p);
  const kf = new Float32Array(16); m.keys.forEach(([u, v], i) => { kf[i * 2] = u; kf[i * 2 + 1] = v; });
  gl.uniform1f(pr.u.uTime, t); gl.uniform1f(pr.u.uV0, f.v0); gl.uniform1f(pr.u.uDrag, f.k); gl.uniform1f(pr.u.uA, f.a); gl.uniform1f(pr.u.uWind, P.wind || 0);
  // 4.9.25 和导出（fwlUnit）同一套随机：寿命、初速都是 ±√3σ 的均匀分布（以前回放寿命 ±σ、初速不随机）
  const jit = clamp(Math.sqrt(3) * (+P.burnJit || 0) / 100, 0, 0.7), vj = clamp(Math.sqrt(3) * (+P.speedJit || 0) / 100, 0, 0.7);
  gl.uniform1f(pr.u.uLife, m.duration); gl.uniform1f(pr.u.uLJ, jit); gl.uniform1f(pr.u.uVJ, vj); gl.uniform1f(pr.u.uSX, m.Ww); gl.uniform1f(pr.u.uSY, m.Wh);
  gl.uniform1f(pr.u.uHb, m.hb); gl.uniform1f(pr.u.uFlip, 0); gl.uniform1i(pr.u.uSeed, P.seed | 0); gl.uniform1i(pr.u.uId0, id0 | 0); gl.uniform2fv(pr.u.uSJ, sj); gl.uniform4fv(pr.u.uView, view);
  gl.uniform2fv(pr.u['uKF[0]'], kf); gl.uniform1i(pr.u.uNKF, m.keys.length); gl.uniform1f(pr.u.uNF, m.L.F);
  const pack = ks => { const a = new Float32Array(16); ks.forEach(([u, v], i) => { a[i * 2] = u; a[i * 2 + 1] = v; }); return a; };
  gl.uniform2fv(pr.u['uKX[0]'], pack(m.sizeKeysX)); gl.uniform1i(pr.u.uNKX, m.sizeKeysX.length);
  gl.uniform2fv(pr.u['uKY[0]'], pack(m.sizeKeysY)); gl.uniform1i(pr.u.uNKY, m.sizeKeysY.length);
  bindSeqTextures(pr, b); setMatUniforms(pr, L, t);
  gl.bindVertexArray(emptyVAO); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n); gl.bindVertexArray(null);
  gl.activeTexture(gl.TEXTURE0);
  return frameIdx(m, t);
}
// 上升：星头循环贴图沿拟合弹道移动
function drawRiseLayer(b, L, t, view) {
  t=engineTick(t);
  const m = b.meta, f = m.fit; if (t < 0 || t > f.T) return -1;
  const e = Math.exp(-f.k * t), y = (f.v0 + G / f.k) * (1 - e) / f.k - G * t / f.k;
  return drawLayer(b, { ...L, scale: 1 }, t, view, [0, y]);
}
// 升空尾缀：模拟 Cascade —— 循环面片沿拟合弹道上升（速度朝向 = 竖直），帧号锯齿、Size By Life 的 Y；到顶后换消散面片
function trailLinY(fit, t) { const e = Math.exp(-fit.k * t); return (fit.v0 + G / fit.k) * (1 - e) / fit.k - G * t / fit.k; }
function trailStateAt(b, t) {
  t=engineTick(t);
  const m = b.meta, P = b.P, F = m.L.F;
  if (t < 0) return null;
  if (t <= m.T) return { bb: b, f: Math.floor(((t % m.Tp) / m.Tp) * F) % F, y: trailLinY(m.fit, t), sy: evalKeys(m.sizeKeysRise, t / m.T), phase: 'rise' };
  const fd = b.fades[state.trailFade || 0]; if (!fd) return null;
  const f = Math.floor((t - m.T) * fd.fps); if (f >= F) return null;
  return { bb: fd, f, y: trailLinY(m.fit, m.T), sy: m.sizeKeysRise[m.sizeKeysRise.length - 1][1], phase: 'fade' };
}
function drawTrailLayer(b, L, t, view, yOff = 0) {
  const s = trailStateAt(b, t); if (!s) return -1;
  const m = b.meta, w = m.Ww * exportWidthNow(), h = m.Wh * s.sy, y0 = s.y - yOff - m.hb * h;     // 4.9.32 升空高度不变：只缩宽
  const pr = PR.mat; gl.useProgram(pr.p);
  gl.uniform4fv(pr.u.uRect, [-w / 2, y0, w / 2, y0 + h]); gl.uniform4fv(pr.u.uView, view);
  bindSeqTextures(pr, s.bb); gl.uniform1f(pr.u.uFrame, s.f); gl.uniform1f(pr.u.uMirror, 0);
  setMatUniforms(pr, { ...L, headInt: intOr1(L.headInt) * (b.P.trBright || 1) }, t);
  gl.bindVertexArray(quadVAO); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.activeTexture(gl.TEXTURE0);
  return s.f;
}
let refTex = null;
function uploadRef() {
  const R = state.ref; if (!R.el || !R.mode) return false;
  const v = R.el;
  if (R.kind === 'video') {
    if (v.readyState < 2) return !!refTex;
    const target = clamp(R.t0 + state.t, 0, v.duration || 0);
    if (Math.abs(v.currentTime - target) > 1 / 50 && !v.seeking) v.currentTime = target;
  }
  gl.activeTexture(gl.TEXTURE6);
  if (!refTex) { refTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, refTex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); }
  gl.bindTexture(gl.TEXTURE_2D, refTex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v); } catch (e) { }
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.activeTexture(gl.TEXTURE0);
  return true;
}
function post(split = -1, P = state.P, viewport = null) {
  gl.bindTexture(gl.TEXTURE_2D, hdrT.tex); gl.generateMipmap(gl.TEXTURE_2D);
  const useRef = state.tab !== 'combo' && uploadRef();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(...(viewport||[0,0,canvas.width,canvas.height]));
  const pr = PR40.post, R = state.ref; gl.useProgram(pr.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, hdrT.tex);
  gl.uniform1f(pr.u.uBloom,P.previewBloom?1:0);
  gl.uniform1i(pr.u.uS, 0); gl.uniform1f(pr.u.uX, state.expo); gl.uniform2f(pr.u.uTx, 1 / hdrT.w, 1 / hdrT.h);
  gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, refTex); gl.uniform1i(pr.u.uRef, 6); gl.activeTexture(gl.TEXTURE0);
  gl.uniform1f(pr.u.uRefMode, useRef ? R.mode : 0); gl.uniform1f(pr.u.uRefA, R.alpha); gl.uniform1f(pr.u.uWipe, R.wipe);
  gl.uniform4f(pr.u.uRefXf, R.scale, R.ox, R.oy, R.aspect); gl.uniform1f(pr.u.uSplit, split);
  drawQuad();
}
let hudText = '', hudB = '';
// 实时模拟：尾缀 / 物理尾缀走自己的渲染器，其余（空中、上升、地面）走 renderLive40 同一套
function liveBox(P, slot) {
  if (slot.boxGen === slot.gen && slot.box) return slot.box;
  const fm = measure({ ...P }); slot.box = [fm.x0, fm.x1, fm.y0, fm.y1]; slot.boxGen = slot.gen; return slot.box;
}
function liveSlot(key) { return live[key] || (live[key] = { gen: -1 }); }
function prepSlot(slot, P, gen) {
  if (slot.gen === gen && slot.P === P) return;
  slot.trailR = null; slot.phys = null; slot.sim = null; disposeTrack(slot.track); slot.track = null; disposeEmitter(slot.E); slot.E = null;
  slot.R40 && slot.R40.dispose(); slot.R40=null; slot.plan40=null;slot.camera40=null;
  slot.cell40 && slot.cell40.dispose(); slot.cell40=null; slot.samples40 && slot.samples40.dispose(); slot.samples40=null;
  slot.gen = gen; slot.P = P; slot.box = null;
}
function drawLiveScene(slot, P, t, view, ppm) {
  setParticleProfile(P);
  if (isPhys(P)) return drawPhysTrail(slot, P, t, view, ppm);
  if (isTrail(P)) {
    // 随体坐标里实时模拟：上升段连续播放，到顶后按 20 fps 版本的消散时长熄灭
    const T = riseInfo(P).ta, F = layoutOf(P).F;
    if (!slot.trailR) slot.trailR = trailRendererFor(P);
    const R = slot.trailR, Tp = R.Tp, fEnd = Math.floor(((T % Tp) / Tp) * F + 1e-6) % F;
    if (t <= T) { R.stop = -1; R.stopE = -1; R.fadeK = 1; R.frameT = null; R.draw(t % Tp, view, ppm, 1, 0, 0); }
    else { trailFadeSetup(R, P, fEnd, F / 20); R.frameT = null; R.draw(R.stop + (t - T), view, ppm, 1, 0, 0); }
    return { stars: 1, sparks: R.slots };
  }
  const R = liveRenderer40(slot, P); drawFrameSamples40(P, slot.plan40, R, t, view, ppm);
  return { stars: P.stars, sparks: R.slots || 0 };
}
function sceneView(P, m, slot) {
  if (isPhys(P)) {
    const v=physView(P,slot,Math.min(state.view==='export'?engineTick(state.t):state.t,P.duration));
    if(state.view==='export' && state.disp==='game')v[2]=v[3]=canvas.width/(2*gamePixelsPerMeter(P,P.phView));
    return v;
  }
  if (familyOf(P.type) === 'ground') return squareView(m);
  if (isTrail(P) && m.trail) { const h = m.Wh * 0.55; return [0, m.cy, h, h]; }
  const b = liveBox(P, slot), hx = Math.max(-b[0], b[1]) * 1.04 + 2, cy = (b[2] + b[3]) / 2, hy = (b[3] - b[2]) / 2 * 1.04 + 2, h = Math.max(hx, hy);
  return [0, cy, h, h];
}
function unionView(a, b) {
  if (!b) return a;
  const x0 = Math.min(a[0] - a[2], b[0] - b[2]), x1 = Math.max(a[0] + a[2], b[0] + b[2]), y0 = Math.min(a[1] - a[3], b[1] - b[3]), y1 = Math.max(a[1] + a[3], b[1] + b[3]);
  const h = Math.max(x1 - x0, y1 - y0) / 2; return [(x0 + x1) / 2, (y0 + y1) / 2, h, h];
}
function renderLive() {
  if (isEmit(state.P)) return renderEmitLive();
  const P = state.P, m = state.bake && state.bake.meta;
  if (!isTrail(P) && !isPhys(P)) return renderLive40();
  if (!m) { hdrT.clear(); post(); hudText = '首次烘焙中…'; hudB = ''; return; }
  const sa = liveSlot('A'); prepSlot(sa, P, state.gen);
  const t = Math.min(state.view==='export'?engineTick(state.t):state.t, P.duration);
  const view = sceneView(P, m, sa), ppm = rgT.w / (2 * view[2]);
  rgT.clear(); rgT.bind(); additive(true);
  const info = drawLiveScene(sa, P, familyOf(P.type) === 'ground' ? state.t : t, view, ppm);
  additive(false);
  hdrT.bind(); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  const pr = PR.rgmat; gl.useProgram(pr.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rgT.tex); gl.uniform1i(pr.u.uS, 0);
  gl.uniform1f(pr.u.uEH, fixedExposure(P)); gl.uniform1f(pr.u.uET, fixedExposure(P)); gl.uniform1f(pr.u.uG, P.encGamma); gl.uniform1f(pr.u.uComb, P.outMode === 'combined' ? 1 : 0);
  setMatUniforms(pr, state.M, t); drawQuad();
  post(-1);
  hudText = isPhys(P) ? `升空尾缀 · 物理实时模拟 · 飞行 ${Math.min(t, P.phT).toFixed(2)} / ${P.phT} s${t > P.phT ? '（已开花，火花燃尽中）' : ''} · 画面里火花 ${info.sparks.toLocaleString()} 颗 · 视野 ${P.phView} m`
    : `实时物理 · ${P.engine === 'gpu' ? 'GPU' : 'CPU'} · 星 ${info.stars} · 火花槽位 ${info.sparks.toLocaleString()}`;
  hudB = '';
}
// 显示比例：贴图的每个像素在屏幕上被放大了几倍，是「糊」的直接原因
// 4.9.31 导出缩放：引擎回放 + 游戏内大小时，按缩放后的大小画（单层效果；多层用每层的「缩放」）
const exportScaleNow = () => { if (!(state.view === 'export' && state.disp === 'game' && state.tab !== 'combo' && typeof exportScalePlan === 'function')) return 1; const sp = exportScalePlan(state.P); return sp.keep ? 1 : sp.k; };     // 4.9.51 配了尺寸标定按标定的倍数画
// 4.9.32 升空尾缀「升空高度：不变」：引擎回放（任何显示比例）画只缩粗细的样子——面片宽 × k、软圆点大小和随机散开 × k，位置 / 高度 / 尾长不变（和导出同一套规则）
const exportWidthNow = () => { if (!(state.view === 'export' && state.tab !== 'combo' && typeof exportScalePlan === 'function')) return 1; const sp = exportScalePlan(state.P); return sp.keep ? sp.k : 1; };
function exportView(b) {
  const s = segAt(b, state.t), m = s.meta, sc = sizeAt(m, clamp(state.t - (m.t0 || 0), 0, m.duration));
  let full = null;
  for (let q = b; q; q = q.next) for (let i = 0; i <= 12; i++) { const rr = layerRectAt(q.meta, { scale: 1, mirror: false }, i / 12 * q.meta.duration), h = Math.max(rr[2] - rr[0], rr[3] - rr[1]) / 2, v = [(rr[0] + rr[2]) / 2, (rr[1] + rr[3]) / 2, h, h]; full = full ? unionView(full, v) : v; }
  const sxy = sizeXY(m, clamp(state.t - (m.t0 || 0), 0, m.duration));
  const texPPM = m.L.cellW / (m.Ww * Math.max(sxy[0], 1e-3));
  let ppmScreen;
  if (state.disp === 'px') ppmScreen = texPPM;
  else if (state.disp === 'game') ppmScreen = gamePixelsPerMeter(b.P,gameDiameter(b,2*full[2])) * exportScaleNow();
  else ppmScreen = canvas.width / (2 * full[2]);
  const half = canvas.width / 2 / ppmScreen;
  return { view: [full[0], full[1], half, half], mag: ppmScreen / texPPM, onScreen: m.Ww * sxy[0] * ppmScreen * 1080/canvas.height };
}
function exportViewAny(b, slot) {
  if (b.form === 'unit') { const m = b.meta, f = m.fit, R = f.v0 / f.k * (1 - Math.exp(-f.k * m.duration)) + m.Wh; return productDisplayView(b,[0,-R*.1,R*1.1,R*1.1],m.L.cellW/m.Ww,R*2); }
  if (b.form === 'riseLoop') { const v=sceneView(b.P,b.meta,slot);return productDisplayView(b,v,b.meta.L.cellW/b.meta.Ww,v[2]*2); }
  if (b.form === 'trail') { const m = b.meta, s = trailStateAt(b, state.t), h = m.Wh * 0.62; return {...productDisplayView(b,[0,(s?s.y:0)-m.Wh*.42,h,h],Math.min(m.L.cellW/m.Ww,m.L.cellH/m.Wh),m.Wh),track:s?s.y:0}; }
  return exportView(b);
}
function drawExportScene(b, M, t, view, slot) {
  t=engineTick(t);
  const L = { ...M, scale: 1, delay: 0, rate: 1, mirror: false };
  if (b.form === 'unit') return drawUnitLayer(b, L, t, view);
  if (b.form === 'trail') return drawTrailLayer(b, L, t, view);
  if (b.form === 'riseLoop') {
    // 尾迹火花在引擎里是单独的火花发射器：这里用实时物理的 GPU 火花代替
    const P = b.P; if (!slot.sim || t < slot.sim.t - 1e-6) slot.sim = new Sim({ ...P }); if (!slot.track) slot.track = buildTrack(P);
    while (slot.sim.t < t - 1e-9) slot.sim.step(H_STEP);
    const k = b.meta.expoT * 2 * M.tailInt, c = rampAt(M, 0.7);
    drawSparksGPU(slot.track, t, view, hdrT.w / (2 * view[2]), [c[0] * k, c[1] * k, c[2] * k, 0], 1, ++live.tw);
    return drawRiseLayer(b, L, t, view);
  }
  return drawLayer(b, L, t, view);
}
// 4.9.29 单帧（单层；4.9.35 并进产物表，PC 选单帧时）：按 cascade.json 画；勾「溶解预览」按功能图画；勾「并排」= 序列 | 单帧 · 某一帧 | 单帧 · 长曝光 同一秒
function renderLowExport(b, Pn, view, sa) {
  const M = state.M, L = { ...M, delay: 0, rate: 1, scale: 1, mirror: false }, lo = lowOf(Pn), dis = !!state.lowDissolve;
  if (!state.lowSide) {
    const lw = lowCached(b, lo, M); if (!lw) { ensureLow(b, lo, M); additive(false); post(-1); hudText = '导出效果 · 单帧：单帧 + 功能图烘焙中…'; hudB = ''; return; }
    const f = drawLowLayer(lw, L, M, state.t, view, dis); additive(false); post(-1);
    hudText = `导出效果 · 单帧（${lw.pick === 'expo' ? '长曝光' : `某一帧 ${lw.tStar.toFixed(2)} s`} · ${lw.S}×${lw.S}）· ${dis ? (lw.chans.D ? '溶解预览：现有序列母材质的溶解（值大先消失、软过渡）+ Size By Life + Alpha，导入器开了溶解以后 UE 里的样子' : '没勾溶解图（D），不溶解') : '不开溶解：灰度 + Ramp、Size By Life、按亮度 Alpha 淡出（导入器开溶解之前 UE 里的样子）'}${f < 0 ? ' · 这一刻没有' : ''}`; hudB = ''; return;
  }
  const loF = { ...lo, pick: 'frame' }, loE = { ...lo, pick: 'expo' }, lwF = lowCached(b, loF, M), lwE = lowCached(b, loE, M);
  if (!lwF) ensureLow(b, loF, M); else if (!lwE) ensureLow(b, loE, M);
  const hw = view[2], at = dx => [view[0] + dx, view[1], view[2] * 3, view[3] * 3];
  drawExportScene(b, M, state.t, at(2 * hw), sa);
  if (lwF) drawLowLayer(lwF, L, M, state.t, at(0), dis);
  if (lwE) drawLowLayer(lwE, L, M, state.t, at(-2 * hw), dis);
  additive(false); post(-1);
  hudText = `并排（同一秒）· 左：PC 序列 · 中：单帧 · 某一帧${lwF ? ` ${lwF.tStar.toFixed(2)} s` : '（烘焙中）'} · 右：单帧 · 长曝光${lwE ? '' : '（烘焙中）'} · ${dis ? '溶解预览（现有母材质的软溶解）' : '不开溶解'}`; hudB = '';
}
function renderExport() {
  const b = previewBake(); hdrT.clear();
  if (!b) { post(); hudText = '烘焙中…'; return; }
  if (b.form === 'emitset') return renderEmitExport(b);
  const sa = liveSlot('XA'); prepSlot(sa, b.P, state.gen);
  const ev = exportViewAny(b, sa), view = ev.view;
  hdrT.bind(); additive(true);
  let f = -1;
  // 4.4.2 单层的导出方案：PC 选 GPU 光点 → 画光点（和 cascade.json 同一份发射器数据）；不出 → 不画
  const Pn = typeof withScheme === 'function' ? withScheme(b.P || state.P) : b.P || state.P, so = typeof singleOut === 'function' && (b.form === 'master' || b.form === 'segments') ? singleOut(Pn) : null, sch = so ? (state.platform === 'mobile' ? so.mobile : so.pc) : 'seq';     // 4.9.35 引擎回放不分平台：按 PC 列（展示模式切手机时按手机列）
  if (sch === 'frame') { renderLowExport(b, Pn, view, sa); return; }     // 4.9.29 单帧（4.9.35 并进产物表）
  if (sch === 'dots') { esDraw(singleDotsTables(Pn, state.M, b), engineTick(state.t), view, hdrT.w / (2 * view[2]), hdrT.h / (2 * view[3]), 1); additive(false); post(-1); hudText = `导出效果 · PC GPU 光点（约 ${dotsCount(b.P || state.P)} 颗，软圆点，没有贴图）`; hudB = ''; return; }
  if (sch === 'off') { additive(false); post(-1); hudText = `导出效果 · ${state.platform === 'mobile' ? '手机' : 'PC'} 不出这一层（产物表里选的「不出」）`; hudB = ''; return; }
  // 4.9.25：单层效果 PC 选单束 → 按单束画（以前这里仍画序列，写「单束的引擎回放在多层效果里看」）；和导出同一份单束烘焙
  if (sch === 'unit' && unitAllowed(b.P || state.P)) {
    const pd = productNow(state.P, null, singleUnitHolder());
    if (!pd.b) { additive(false); post(-1); hudText = '导出效果 · PC 单束：单束贴图烘焙中…'; hudB = ''; return; }
    const ev2 = exportViewAny(pd.b, sa), fu = drawUnitLayer(pd.b, singleLayer(state.P, state.M), engineTick(state.t), ev2.view);
    additive(false); post(-1);
    hudText = `导出效果 · PC 单束 · 每颗星一个面片 × ${Math.round(+pd.b.P.stars || 0)} · ${fu < 0 ? '序列结束' : `第 ${fu + 1}/${pd.b.meta.L.F} 帧`} · 贴图里一颗代表星，轨迹由 Cascade 算（和导出同一套数）`; hudB = ''; return;
  }
  f = drawExportScene(b, state.M, state.t, view, sa);
  additive(false); post(-1);
  const s = segAt(b, state.t), L = s.meta.L, mag = ev.mag;
  const magTxt = !mag ? '' : mag > 1.5 ? ` · 贴图放大 ${mag.toFixed(1)}×，会显糊` : ` · 贴图放大 ${mag.toFixed(1)}×`;
  const tsx = b.form === 'trail' ? trailStateAt(b, state.t) : null;
  if (b.form === 'trail') { hudText = !tsx ? '序列结束' : `导出效果 · 升空尾缀 · ${tsx.phase === 'rise' ? '上升循环' : '消散（' + tsx.bb.fps + ' fps）'} · 第 ${tsx.f + 1}/64 帧 · ${'RGBA'[Math.floor(tsx.f / 16)]} 通道 · 镜头跟着星头（面片沿弹道上升，Size By Life Y ${tsx.sy.toFixed(2)}）`; hudB = ''; return; }
  const fi = b.form === 'unit' ? frameIdx(b.meta, engineTick(state.t)) : frameIdx(s.meta, engineTick(state.t) - (s.meta.t0 || 0));
  const ps = b.form === 'unit' ? 0 : preScaleAt(b, s.meta, s, engineTick(state.t), engineTick(state.t) - (s.meta.t0 || 0));
  hudText = ps > 0 ? `导出效果 · 入点前：第 1 帧放大到 ${Math.round(ps * 100)}%（绕爆点）· 入点 ${s.meta.t0.toFixed(2)} s` : fi < 0 ? (engineTick(state.t) < (s.meta.t0 || 0) ? '还没到入点' : '序列结束') : `导出效果 · ${FORM_NAMES[b.form]}${b.next ? ' 段 '+bakeSegmentName(b,bakeParts(b).indexOf(s)) : ''} · 第 ${fi + 1}/${L.F} 帧 · ${L.chans === 4 ? 'RGBA'[Math.floor(fi / L.per)] + ' 通道 ' : ''}单格 ${+L.cellW.toFixed(1)}×${+L.cellH.toFixed(1)}` + magTxt + (state.disp === 'game' && mag ? ` · 屏幕上约 ${Math.round(ev.onScreen)} 像素宽` : '') + (b.form === 'unit' ? ` · ${b.P.stars} 个粒子` : '') + (state.dirty ? ' · 等待重新烘焙' : '');
  hudB = '';
}
const flowTrail = [];
// 4.9.25（用户 10-07 09:20「4.可以，我很着急使用」：交付清单的产物表是唯一的导出口径）：这一层在当前预览平台「导出的是什么」——
// 贴图 / 流转 / 引擎回放 / 交付清单都按它：序列（seq）/ 单束（unit，贴图是另烘的一颗代表星）/ GPU 光点（dots，没有贴图）/ 不出（off）。
// holder：有 P、unitBake 的对象（多层 = 图层条目 e，单层 = singleUnitHolder()）；单束还没烘就排一个后台烘焙（ensureLayerUnit）
function productNow(P, L, holder) {
  if (!P || familyOf(P.type) !== 'aerial') return { kind: 'seq' };
  // 4.9.35（用户 10-07 18:50「引擎回放就只是引擎回放」）：不分平台，按 PC 列（展示模式切到手机时按手机列）
  const o = L ? layerOut(L) : singleOut(P), s = state.platform === 'mobile' ? o.mobile : o.pc;
  if (s === 'frame') {     // 单帧（4.9.29 起；4.9.35 并进产物表）：看单帧 + 功能图
    const b = holder && holder.bake ? holder.bake : state.bake, M = L ? comboLayerM(L) : state.M, lo = lowOf(L || P), lw = b ? lowCached(b, lo, M) : null;
    if (!lw && b) ensureLow(b, lo, M);
    return { kind: 'frame', lw, M };
  }
  if (s !== 'unit') return { kind: s === 'dots' || s === 'off' ? s : 'seq' };
  if (!unitAllowed(P)) return { kind: 'seq', note: '这种花型 / 图案不能出单束，按序列出' };
  const ub = unitBakeOf(holder, L);     // 4.9.28 多层的变体数 / 随机感在层上
  if (!ub && holder) ensureLayerUnit(holder);
  return { kind: 'unit', b: ub };
}
const PRODUCT_NONE = { dots: 'PC 这一层出 GPU 光点：没有贴图（软圆点粒子，数值在 cascade.json；引擎回放里看）', off: 'PC 不出这一层：没有贴图' };
// 贴图 / 流转看哪一张（4.9.20，对话框23，用户 10-06 21:12「不要单独只为这个尾缀添加功能，切换的时候有好几张贴图，就都可以切换」）：
// 列出这一层导出的每一张序列，和素材包里的贴图文件一一对应——分张（A / B…）、合并 / 星头 / 尾迹、循环层 / 消散 / 远段；不按效果种类单做。
// 默认「自动」= 跟着时间走（分张时播完第一张接着播第二张，用户 2026-10-02 13:09）；点一张锁定看它。以前只能切「第 n 张」「星头 / 尾迹」，
// 循环层 + 粒子的远段、消散，尾缀的消散都看不到
function texSheets(b0) {
  if (!b0 || !b0.meta) return [];
  const out = [], parts = bakeParts(b0), es = b0.form === 'emitset' || b0.form === 'trail';
  const add = (key, label, b, tail) => out.push({ key, label, b, show: tail ? b.tail : b.head });
  parts.forEach((s, i) => {
    const base = es ? '循环层' : b0.form === 'unit' ? (b0.vars ? '单束 1' : '单束') : parts.length > 1 ? `第 ${i + 1} 张` : '序列';
    if (s.tail) { add(`p${i}h`, base + ' · 星头', s, false); add(`p${i}t`, base + ' · 尾迹', s, true); } else add(`p${i}`, base, s, false);
  });
  // 消散：循环层 + 粒子的消散有自己的 meta；尾缀（V5）的几张消散和循环层同一格子、按自己的帧率整段播
  (b0.fades || []).forEach((f, i, a) => {
    const L = b0.meta.L, m = f.meta || { L, loop: true, duration: L.F / (f.fps || 30), keys: [[0, 0], [1, L.F]], times: [] };
    add(`f${i}`, '消散' + (a.length > 1 ? ` ${f.fps} fps` : ''), f.meta ? f : { ...f, meta: m, P: f.P || b0.P }, false);
  });
  if (b0.far) add('far', '远段', b0.far, false);
  (b0.vars || []).forEach((v, k) => add(`v${k + 1}`, `单束 ${k + 2}`, v, false));     // 4.9.28 单束变体
  return out.filter(x => x.show && x.show.tex);
}
// 现在看的那一张：锁定的那张还在就看它；否则自动（跟时间找分张，看星头 / 合并那张）
function texSheetOf(b0) {
  const list = texSheets(b0), x = state.texSheet && list.find(s => s.key === state.texSheet);
  if (x) return x;
  const seg = segAt(b0, state.t); return list.find(s => s.b === seg && s.show === seg.head) || list[0];
}
let texSheetSig = '';
function syncTexSheets(b0) {
  const box = $('#texSeg'); if (!box) return;
  if (!b0) { box.hidden = true; texSheetSig = ''; return; }
  const list = texSheets(b0), sig = list.map(s => s.key + ':' + s.label).join('|') + '#' + (state.texSheet || '');
  box.hidden = list.length < 2; if (sig === texSheetSig) return; texSheetSig = sig;
  if (state.texSheet && !list.some(s => s.key === state.texSheet)) state.texSheet = '';
  box.replaceChildren();
  const mk = (key, text, title) => { const b = document.createElement('button'); b.type = 'button'; b.dataset.sheet = key; b.textContent = text; if (title) b.title = title; b.setAttribute('aria-pressed', String((state.texSheet || '') === key)); box.appendChild(b); };
  mk('', '自动（跟时间）', '跟着时间走：分成几张时播完一张接着播下一张');
  for (const s of list) { const L = s.b.meta.L; mk(s.key, s.label, `${s.label}：${s.b.N || L.cols * L.cellW}×${s.b.NH || L.rows * L.cellH} · ${L.cols}×${L.rows}${L.chans === 4 ? '×RGBA' : ''} 格 · ${L.F} 帧`); }
}
function drawAtlasQuad(b, show, f, n, trail) {
  const L = b.meta.L, pr = PR.atlas; gl.useProgram(pr.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, show.tex);
  gl.uniform1i(pr.u.uS, 0); gl.uniform1f(pr.u.uFrame, f); gl.uniform1f(pr.u.uN, n);
  gl.uniform1f(pr.u.uCols, L.cols); gl.uniform1f(pr.u.uRows, L.rows); gl.uniform1f(pr.u.uChans, L.chans); gl.uniform1f(pr.u.uAspect, b.N / b.NH);
  const tr = new Float32Array(6).fill(-1); (trail || []).slice(0, 6).forEach((v, i) => tr[i] = v); gl.uniform1fv(pr.u['uTrail[0]'], tr);
  drawQuad();
}
function renderAtlas(ctx = null) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0.02, 0.02, 0.03, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  // 4.9.25 按导出方案看：PC 单束看单束那张；光点 / 不出写明没有贴图
  const pd = state.tab === 'asset' ? { kind: 'seq' } : ctx ? productNow(ctx.P, ctx.L, ctx.holder) : productNow(state.P, null, typeof singleUnitHolder === 'function' ? singleUnitHolder() : null);
  if (pd.kind === 'dots' || pd.kind === 'off') { syncTexSheets(null); state.texSheetNow = null; hudText = PRODUCT_NONE[pd.kind]; hudB = ''; return; }
  if (pd.kind === 'frame') { syncTexSheets(null); state.texSheetNow = null; if (!pd.lw) { hudText = '单帧：单帧 + 功能图烘焙中…'; hudB = ''; return; } renderLowAtlas(pd.lw, pd.M); return; }     // 4.9.29 单帧
  const b0 = pd.kind === 'unit' ? pd.b : previewBake();
  if (!b0) { syncTexSheets(null); hudText = pd.kind === 'unit' ? 'PC 这一层出单束：单束贴图烘焙中…' : '烘焙中…'; return; }
  syncTexSheets(b0); const sh = texSheetOf(b0); state.texSheetNow = sh; if (!sh) { hudText = '这一层没有序列贴图'; return; }
  const b = sh.b, show = sh.show, f = frameIdx(b.meta, state.t - (b.meta.t0 || 0));
  renderAtlasFlow(b0, b, show, f, sh);     // 4.9.35 贴图 + 流转合成一页
}
// 贴图流转（4.9.35 「贴图」「流转」合成一页，用户 10-07 18:50「左边是流转预览，流转序列+曲线，类似我参考图的布局……你可以优化的更合适些」）：
// 画布铺满画面区。宽的时候左边一个正方形放大当前格（最近邻，看得到真实像素），右边上面整张贴图（金框 = 当前帧、淡框 = 刚走过、红 = 过曝），下面帧号曲线；
// 窄的时候上面当前格 + 整张贴图并排，下面曲线。flowLayout 记下来给标签 / 曲线画布定位（画布像素，原点左上）
let flowLayout = null;
function flowLayoutOf(W, H0, atlasAspect) {
  // 下面留一行给 HUD（帧号 / 时间那一行字），整张贴图上面留一行给标签
  const sc = W / Math.max(1, $('#box').getBoundingClientRect().width || W), hud = Math.round(24 * sc), lab = Math.round(24 * sc), H = H0 - hud;
  const g = Math.round(Math.min(W, H) * 0.025), ch = clamp(Math.round(H * 0.27), Math.round(110 * sc), Math.round(320 * sc));
  const fit = (x, y, w, h, a) => { const ww = Math.min(w, h * a), hh = ww / a; return { x: Math.round(x), y: Math.round(y), w: Math.round(ww), h: Math.round(hh) }; };
  if (W / H >= 1.3) {
    const side = Math.min(H - 2 * g, Math.round(W * 0.5)), prev = { x: g, y: Math.round((H - side) / 2), w: side, h: side }, x0 = prev.x + side + 2 * g, rw = W - x0 - g;
    return { prev, atl: fit(x0, g + lab, rw, H - 3 * g - ch - lab, atlasAspect), crv: { x: x0, y: H - g - ch, w: rw, h: ch } };
  }
  const top = H - ch - 3 * g - lab, side = Math.min((W - 3 * g) / 2, top);
  return { prev: { x: g, y: g + lab, w: Math.round(side), h: Math.round(side) }, atl: fit(2 * g + side, g + lab, W - 3 * g - side, top, atlasAspect), crv: { x: g, y: H - g - ch, w: W - 2 * g, h: ch } };
}
const glVP = (r, H) => gl.viewport(r.x, H - r.y - r.h, r.w, r.h);     // 布局是左上原点，GL 视口是左下原点
function renderAtlasFlow(b0, b, show, f, sh) {
  const W = canvas.width, H = canvas.height, L = b.meta.L, lay = flowLayout = flowLayoutOf(W, H, (b.N || L.cols * L.cellW) / (b.NH || L.rows * L.cellH));
  if (f >= 0 && flowTrail[0] !== f) { flowTrail.unshift(f); flowTrail.length = Math.min(flowTrail.length, 7); }
  // 当前格：保持单格像素长宽比，放进左边的正方形
  const ca = L.cellW / L.cellH, pv = lay.prev, cw = Math.min(pv.w, pv.h * ca), chh = cw / ca;
  { const r = { x: Math.round(pv.x + (pv.w - cw) / 2), y: Math.round(pv.y + (pv.h - chh) / 2), w: Math.round(cw), h: Math.round(chh) };
    glVP(r, H); gl.clearColor(0, 0, 0, 1); gl.enable(gl.SCISSOR_TEST); gl.scissor(r.x, H - r.y - r.h, r.w, r.h); gl.clear(gl.COLOR_BUFFER_BIT); gl.disable(gl.SCISSOR_TEST); gl.clearColor(0.02, 0.02, 0.03, 1);
    if (f >= 0) { const pc = PR.cell; gl.useProgram(pc.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, show.tex); gl.uniform1i(pc.u.uS, 0);
      gl.uniform1f(pc.u.uFrame, f); gl.uniform1f(pc.u.uCols, L.cols); gl.uniform1f(pc.u.uRows, L.rows); gl.uniform1f(pc.u.uChans, L.chans); gl.uniform2f(pc.u.uPx, 1 / r.w, 1 / r.h); drawQuad(); } }
  glVP(lay.atl, H); drawAtlasQuad(b, show, f, lay.atl.w, flowTrail.slice(1));
  gl.viewport(0, 0, W, H);
  { const cv = $('#flowCv'), c = lay.crv, pc = v => (v * 100).toFixed(3) + '%';     // 曲线画布跟着布局放
    Object.assign(cv.style, { left: pc(c.x / W), top: pc(c.y / H), width: pc(c.w / W), height: pc(c.h / H), bottom: 'auto' }); }
  drawFlowCurve(b, f);
  const t = state.t - (b.meta.t0 || 0), ch = L.chans === 4 && f >= 0 ? 'RGBA'[Math.floor(f / L.per)] + ' 通道 · ' : '';
  const pg = sh && sh.label ? `${sh.label} · ` : '', spec = `贴图 ${b.N || b.P.texW}×${b.NH || b.P.texH} · ${L.cols}×${L.rows}${L.chans === 4 ? '×RGBA' : ''} 格 · ${L.F} 帧`;     // 看的是哪一张（序列 / 第 n 张 / 单束 / 循环层 / 远段…）一直写在前面
  hudText = `贴图流转 · ${pg}` + (f < 0 ? `${t < 0 ? '还没开始' : '这一张播完了'} · ${spec}` : `第 ${f + 1}/${L.F} 帧 · ${ch}第 ${f % L.per + 1} 格（第 ${Math.floor((f % L.per) / L.cols) + 1} 行第 ${f % L.cols + 1} 列）· 时间 ${Math.max(0, t).toFixed(2)} s · ${spec}`);
  hudB = '';
}
const flowPxCache = new WeakMap();
function drawFlowCurve(b, f) {
  const cv = $('#flowCv'), r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  const x = cv.getContext('2d'), W = cv.width, H = cv.height, m = b.meta, L = m.L, D = m.duration;
  x.clearRect(0, 0, W, H);
  const pl = 44 * dpr, pr = 12 * dpr, pt = 16 * dpr, pb = 20 * dpr, X = u => pl + u * (W - pl - pr), Y = v => H - pb - v / L.F * (H - pt - pb);
  x.font = `${11 * dpr}px ui-monospace,monospace`; x.fillStyle = '#8a8e9b'; x.strokeStyle = '#262a37'; x.lineWidth = dpr;
  x.strokeRect(pl, pt, W - pl - pr, H - pt - pb);
  if (L.chans === 4) for (let c = 1; c < 4; c++) { const y = Y(c * L.per); x.setLineDash([4 * dpr, 4 * dpr]); x.beginPath(); x.moveTo(pl, y); x.lineTo(W - pr, y); x.stroke(); x.setLineDash([]); }
  if (L.chans === 4) for (let c = 0; c < 4; c++) x.fillText('RGBA'[c], 6 * dpr, Y((c + 0.5) * L.per) + 4 * dpr);
  x.fillText('0', pl - 14 * dpr, H - pb); x.fillText(`${D.toFixed(2)} s`, W - pr - 40 * dpr, H - 4 * dpr); x.fillText('帧号（Dynamic Parameter）', pl + 6 * dpr, pt - 4 * dpr);
  // 每一帧的烘焙时刻
  x.fillStyle = 'rgba(233,180,95,.35)'; for (const t of m.times) x.fillRect(X(t / D) - dpr / 2, H - pb - 5 * dpr, dpr, 5 * dpr);
  // 4.9.26 帧账本：停 2 tick 以上、在游戏里每帧跳得比金芒菊多的帧，底下标一道红（31_plan40.js frameLedger）
  { let px = flowPxCache.get(b); if (px === undefined) { px = null; try { if (m.frameTiming === 'tick-start' && STEP_REF_PX > 0 && b.P) px = framePxSteps(b.P, b.fm || measure(b.P), m.times.map(t => t + (m.t0 || 0)), m.dur); } catch (e) { px = null; } flowPxCache.set(b, px); }
    if (px) { x.fillStyle = 'rgba(232,96,74,.95)'; m.times.forEach((t, i) => { if (m.dur[i] > 1.5 / 30 && px[i] > STEP_REF_PX * 1.05) x.fillRect(X(t / D) - dpr, H - pb - 10 * dpr, 2 * dpr, 4 * dpr); }); } }
  // 帧号曲线（阶梯 = 材质取整后实际显示的帧）
  x.strokeStyle = '#e9b45f'; x.lineWidth = 1.5 * dpr; x.beginPath();
  const keys = m.loop ? [[0, 0], [1, L.F]] : m.keys;
  keys.forEach(([u, v], i) => i ? x.lineTo(X(u), Y(v)) : x.moveTo(X(u), Y(v))); x.stroke();
  const t = m.loop ? (((state.t % D) + D) % D) : clamp(state.t - (m.t0 || 0), 0, D);
  x.strokeStyle = '#f6d9a2'; x.lineWidth = dpr; x.beginPath(); x.moveTo(X(t / D), pt); x.lineTo(X(t / D), H - pb); x.stroke();
  if (f >= 0) { x.beginPath(); x.moveTo(pl, Y(f + 0.5)); x.lineTo(W - pr, Y(f + 0.5)); x.strokeStyle = 'rgba(246,217,162,.5)'; x.stroke(); x.fillStyle = '#f6d9a2'; x.beginPath(); x.arc(X(t / D), Y(f + 0.5), 3.5 * dpr, 0, 6.2832); x.fill(); }
}
// 组合 · 实时模拟（2026-09-30）：每层按自己的参数实时模拟（和单个花型的「实时模拟」一样清楚），
// 按层的缩放 / 延迟 / 时间倍率摆放，各自上色后叠加。「导出效果」页才用每层烘好的贴图（检查引擎里的叠放）。
// 独看 / 静音（只影响观察，导出照旧是全部层）
function layerShown(i) { const v = state.layerView || { solo: -1, mute: [] }; return v.solo >= 0 ? v.solo === i : !v.mute.includes(i); }
function comboAtlasLayer() { const v = state.layerView || { solo: -1 }; return state.comboSel >= 0 ? state.comboSel : v.solo >= 0 ? v.solo : 0; }
function comboAtlasBake() { const L = state.layers[comboAtlasLayer()], e = L && state.lib.find(x => x.name === L.lib); return e && e.bake ? previewBake(e.bake) : null; }
// 多层效果的「贴图」：看选中的那一层（没选就看第 1 层），时间换成这一层自己的时间
function renderComboAtlas() {
  const i = comboAtlasLayer(), L = state.layers[i], e = L && state.lib.find(x => x.name === L.lib);
  if (!e || !e.bake) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clearColor(0.02, 0.02, 0.03, 1); gl.clear(gl.COLOR_BUFFER_BIT); hudText = '这一层还没烘好'; return; }
  const sb = state.bake, st = state.t; state.bake = e.bake; state.t = (st - (L.delay || 0)) * (L.rate || 1);
  try { renderAtlas({ P: e.P, L, holder: e }); } finally { state.bake = sb; state.t = st; }
  hudText = `第 ${i + 1} 层 · ${hudText}`;
}
function renderComboLive() {
  const items = state.layers.map((L, i) => [L, state.lib.find(e => e.name === L.lib), i]).filter(x => x[1] && x[1].bake);
  hdrT.clear();
  if (!items.length) { post(); hudText = '没有图层'; return; }
  let view = null;
  items.forEach(([L, e, i]) => {
    const P = fxP(e.P), slot = liveSlot('combo' + i); prepSlot(slot, P, 'c' + i + ':' + e.name + ':' + (e.rev || 0));     // 4.9.21 整体调整（每层自己的）
    const v = sceneView(P, e.bake.meta, slot), s = L.scale || 1, vs = [v[0] * s, v[1] * s, v[2] * s, v[3] * s];
    view = view ? unionView(view, vs) : vs;
  });
  hdrT.bind(); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  let n = 0;
  // 4.2.20：几层一起算显卡负担，超预算时每层都少画几个快门子样本（见 48_render40.js liveCtl）
  let work = 0; items.forEach(([L, e, i]) => { const age = (state.t - (L.delay || 0)) * (L.rate || 1); if (age < 0 || age > e.P.duration || !layerShown(i)) return; const P = fxP(e.P), R = !isTrail(P) && !isPhys(P) ? liveRenderer40(liveSlot('combo' + i), P) : null; work += R ? trackDraws(R.track, P) + (P.stars || 0) : 0; });
  LIVE_CAP = liveCapFor(work); LIVE_VIEW = true;
  try {
  items.forEach(([L, e, i]) => {
    const age = (state.t - (L.delay || 0)) * (L.rate || 1), P = fxP(e.P);
    if (age < 0 || age > P.duration || !layerShown(i)) return;
    const s = L.scale || 1, vL = [view[0] / s, view[1] / s, view[2] / s, view[3] / s], ppm = rgT.w / (2 * vL[2]);
    rgT.clear(); rgT.bind(); additive(true);
    drawLiveScene(liveSlot('combo' + i), P, age, vL, ppm);
    additive(false);
    hazeSamples40(P, rgT, ppm);   // 线间底光（每层自己的）
    hdrT.bind(); additive(true);
    const pr = PR.rgmat, m = e.bake.meta; gl.useProgram(pr.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rgT.tex); gl.uniform1i(pr.u.uS, 0);
    gl.uniform1f(pr.u.uEH, m.expoH); gl.uniform1f(pr.u.uET, m.expoT); gl.uniform1f(pr.u.uG, e.bake.P.encGamma || 1); gl.uniform1f(pr.u.uComb, e.bake.P.outMode === 'combined' ? 1 : 0);
    setMatUniforms(pr, L, age); drawQuad(); additive(false); n++;
  });
  } finally { LIVE_CAP = 0; LIVE_VIEW = false; }
  post();
  hudText = `${state.comboName} · 实时模拟 · ${items.length} 层（画面里 ${n} 层）${state.layerView && (state.layerView.solo >= 0 || state.layerView.mute.length) ? ' · 独看 / 静音中（只影响观察）' : ''}${liveCapNote()}`; hudB = '';
}
// 引擎回放要画单束时，在后台烘一次这一层的单束序列（不和别的烘焙同时跑）
let unitTask = null;
function ensureLayerUnit(e) {
  if (unitTask) return;
  unitTask = (async () => {
    await new Promise(r => setTimeout(r, 0));     // 4.9.29 先让出这一帧：画面里调的，马上开烘会把显卡的渲染目标换掉
    while (state.baking) await new Promise(r => setTimeout(r, 300));
    state.baking = true;
    try { await layerUnitBake(e, p => setStatus(`单束烘焙… ${Math.round(p * 100)}%`)); } catch (err) { console.error(err); flash('单束烘焙失败：' + (err.message || err), true); }
    finally { state.baking = false; setStatus(''); unitTask = null; if (state.layerQueue && state.layerQueue.size) runLayerQueue(); }
  })();
}
// 引擎回放里这一层怎么画（按当前预览平台的导出方案）：'seq' 贴图 / 'unit' 单束 / 'dots' 光点 / 'off' 不画
function comboLayerDraw(L) { const o = typeof layerOut === 'function' ? layerOut(L) : { pc: 'seq', mobile: 'seq' }; return state.platform === 'mobile' ? o.mobile : o.pc; }     // 4.9.35 引擎回放按 PC 列（展示模式切手机时按手机列）：seq / unit / dots / frame / off
function renderCombo() {
  if (state.view === 'live') return renderComboLive();
  if (state.view === 'atlas') return renderComboAtlas();
  hdrT.clear();
  const items = state.layers.map((L, i) => [L, state.lib.find(e => e.name === L.lib), i]).filter(x => x[1]).map(([L,e,i])=>[L,{...e,bake:previewBake(e.bake)},i]);
  if(items.some(([,e])=>!e.bake)){post();hudText='手机版还未烘焙；点 PC / 手机可重试';return;}
  if (!items.length) { post(); hudText = '没有图层'; return; }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [L, e] of items) for (let s = e.bake; s; s = s.next) for (let i = 0; i <= 8; i++) { const r = layerRectAt(s.meta, L, i / 8 * s.meta.duration); x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[2]); y1 = Math.max(y1, r[3]); }
  let half = Math.max(x1 - x0, y1 - y0) * 0.52;
  if(state.disp==='game'){
    const diameter=Math.max(...items.map(([L,e])=>gameDiameter(e.bake,Math.max(e.bake.meta.Ww,e.bake.meta.Wh))*(L.scale||1)));
    half=canvas.width/(2*gamePixelsPerMeter(items[0][1].P,diameter));
  }else if(state.disp==='px')half=canvas.width/(2*Math.min(...items.map(([L,e])=>e.bake.meta.L.cellW/(e.bake.meta.Ww*(L.scale||1)))));
  const view = [(x0 + x1) / 2, (y0 + y1) / 2, half, half];
  hdrT.bind(); additive(true);
  // 4.2.12 导出方案：这个平台不出的层不画；PC 出光点的层画光点（和 cascade.json 同一份发射器数据）
  const mob = state.platform === 'mobile', notes = [];
  for (const [L, e, i] of items) if (layerShown(i)) {
    const s = comboLayerDraw(L);
    if (s === 'off') { notes.push(`第 ${i + 1} 层不出`); continue; }
    if (s === 'frame') { const e0 = state.lib.find(x => x.name === L.lib) || e, M = comboLayerM(L), lo = lowOf(L), lw = e0.bake ? lowCached(e0.bake, lo, M) : null;     // 4.9.29 单帧
      if (!lw) { if (e0.bake) ensureLow(e0.bake, lo, M); notes.push(`第 ${i + 1} 层单帧烘焙中`); continue; }
      drawLowLayer(lw, L, M, state.t, view, !!state.lowDissolve); notes.push(`第 ${i + 1} 层单帧${state.lowDissolve ? '（溶解预览）' : ''}`); continue; }
    if (s === 'dots') { const e0 = state.lib.find(x => x.name === L.lib) || e; esDraw(dotsTables(e0, L), engineTick(state.t), view, hdrT.w / (2 * view[2]), hdrT.h / (2 * view[3]), 1); notes.push(`第 ${i + 1} 层光点`); continue; }
    if (s === 'unit' && unitAllowed(e.P)) {     // 4.2.13 单束：每颗星一个面片（drawUnitLayer 按 Cascade 的放射弹道画）；层的延迟 / 倍率换成这一层的年龄，缩放换成取景
      const e0 = state.lib.find(x => x.name === L.lib) || e, ub = unitBakeOf(e0, L);
      if (!ub) { ensureLayerUnit(e0); notes.push(`第 ${i + 1} 层单束烘焙中`); continue; }
      const age = (engineTick(state.t) - (+L.delay || 0)) * (+L.rate || 1), sc = +L.scale || 1;
      if (age >= 0) drawUnitLayer(ub, L, age, view.map(v => v / sc));
      notes.push(`第 ${i + 1} 层单束`); continue;
    }
    drawLayer(e.bake, L, state.t, view);
  }
  additive(false); post();
  hudText = `${state.comboName} · 引擎回放（每层贴图叠放）· ${items.length} 层${notes.length ? ' · ' + (mob ? '手机' : 'PC') + '：' + notes.join('、') : ''}${state.layerView && (state.layerView.solo >= 0 || state.layerView.mute.length) ? ' · 独看 / 静音中（只影响观察）' : ''}`; hudB = '';
}
function updateLabels() {
  const q = $('#qlabels'), b = state.texSheetNow && state.view === 'atlas' ? state.texSheetNow.b : previewBake();     // 4.9.20：按现在看的那一张
  if (state.view === 'atlas' && b && flowLayout && state.texSheetNow) {     // 4.9.35 贴图流转：标签跟着布局放（多层也有）
    const lay = flowLayout, W = canvas.width, H = canvas.height, pc = v => (v * 100).toFixed(2) + '%', L = b.meta.L, key = ['flow', lay.prev.x, lay.atl.x, lay.atl.y, L.chans, L.per].join(':');
    if (q.dataset.key !== key) { q.dataset.key = key;
      q.innerHTML = `<span class="qlabel" style="top:calc(${pc(lay.prev.y / H)} + 6px);left:calc(${pc(lay.prev.x / W)} + 6px);max-width:calc(${pc(lay.prev.w / W)} - 12px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">当前格 · 原始灰度 · 最近邻（看得到真实像素）</span>`
        + `<span class="qlabel" style="top:calc(${pc(lay.atl.y / H)} - 22px);left:${pc(lay.atl.x / W)};max-width:${pc(Math.max(lay.atl.w, lay.crv.w) / W)};white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="整张贴图：金框 = 当前帧、淡框 = 刚走过、红色 = 过曝像素">整张贴图 · 金框当前帧 · 淡框刚走过 · 红色过曝${L.chans === 4 ? ` · 四块 R / G / B / A 各 ${L.per} 帧` : ''}</span>`; }
  } else { q.innerHTML = ''; q.dataset.key = ''; }
}

// ---------------- 主循环 ----------------
let lastT = performance.now();
function curDuration() {
  if(state.showcase && showcase.recipe)return Math.max(...showcase.layers.map(l=>l.delay+bakeTotal(l.b)));
  if (state.tab === 'combo') return comboDuration();
  if (state.tab === 'asset') return assetDuration();
  // 时间轴 = 序列时长（4.9.36，用户 10-07 20:37「我改了7秒，时间轴也会延长到7秒」）。以前空中花型按烘出来的长度（出点、结尾全黑不烘会压短），
  // 改序列时长时间轴不动；现在出点后 / 全黑没烘的那段在层轨道上画斜纹「不导出」。contentDuration = 以前的算法（贴图实际播到哪），脚本取样用
  return Math.max(contentDuration(), seqEndOf(state.P));
}
function contentDuration() {
  if (state.showcase && showcase.recipe) return curDuration();
  if (state.tab === 'combo') return comboContentEnd();
  if (state.tab === 'asset') return assetDuration();
  return !state.dirty && state.bake && familyOf(state.P.type) === 'aerial' && !isEmit(state.P) ? bakeTotal(state.bake) : state.P.duration;
}
function loop(now) {
  if (state.glLost || gl.isContextLost()) { glLostNotice(); return; }      // 4.2.20：显卡上下文丢了，停下（不再每帧报错），画面上写原因
  if (DeliveryWorkspace.active && !pendingThumb) { lastT = now; requestAnimationFrame(loop); return; } // Hidden preview yields; explicit export/thumbnail renderers remain available.
  if (state.stillBusy) { lastT = now; requestAnimationFrame(loop); return; }   // 定帧渲染期间让出画布
  // 播放时钟按真实时间走（4.1.2：以前每帧最多推进 0.05 s，掉到 10 fps 时只按半速播、实拍还会反复往回跳）；只防切走标签页回来时的一大步
  const dt = Math.min(0.25, Math.max(0, (now - lastT) / 1000)); lastT = now;
  if (dt > 0) { liveCtl.ema = liveCtl.ema * 0.85 + dt * 0.15; liveAdapt(now); }     // 4.2.20：实时模拟按帧时间调显卡负担
  const D = curDuration(), looping = !state.showcase && familyOf(state.P.type) === 'ground' && state.tab === 'master';
  if (state.playing) { state.t += dt * state.speed;
    if (!looping && state.loopPlay === false && state.t >= D) { state.t = D; state.playing = false; $('#play').textContent = '播放'; }   // 播放一遍：停在最后
    else if (state.t > D + (looping ? 0 : 0.35)) state.t = looping ? state.t - D : 0; }
  $('#scrub').value = Math.round(clamp(state.t / D, 0, 1) * 1000);
  $('#tlabel').textContent = `${Math.min(state.t, D).toFixed(2)} / ${D.toFixed(2)} s`;
  try {
    if (state.tab === 'asset') renderAssets();
    else { ensureTargets();
    if (state.showcase)renderShowcase();else if (state.tab === 'combo') renderCombo();
    else if (state.view === 'live' || (state.bake && state.bake.form === 'phys')) renderLive(); else if (state.view === 'export') { renderExport(); const k = exportScaleNow(), kw = exportWidthNow(); if (k !== 1 && hudText) hudText += ` · 导出缩放 × ${k}（游戏内大小按缩放后的画）`; else if (kw !== 1 && hudText) hudText += ` · 导出缩放 × ${kw} · 升空高度不变（只缩粗细：面片宽、火花大小和散开 × ${kw}）`; } else renderAtlas(); }     // 4.9.31
  } catch (e) { console.error(e); hudText = '渲染出错：' + e.message; }
  if (pendingThumb) { const f = pendingThumb; pendingThumb = null; try { f(thumbFromCanvas()); } catch (e) { } }
  $('#hud').textContent = hudText; $('#hudB').textContent = hudB; updateLabels();
  const ab = state.tab === 'combo' ? comboAtlasBake() : state.bake, mv = (state.tab !== 'combo' || state.view === 'atlas') && state.tab !== 'asset';
  $('#viewSeg').hidden=!!state.showcase;
  if (!mv || state.view !== 'atlas' || !ab) { const ts = $('#texSeg'); if (ts) ts.hidden = true; }     // 4.9.20：贴图 / 流转时 renderAtlas 里按这一层的贴图清单显示
  $('#flowCv').hidden = !mv || state.view !== 'atlas' || !state.texSheetNow;     // 4.9.35 没有「整张 / 流转」切换了；单帧 / 光点 / 不出没有曲线
  { const wd = state.view === 'atlas' && !state.showcase && state.tab !== 'asset' && !stage2.deliv, bx = $('#box'); if (bx.classList.contains('wide') !== wd) { bx.classList.toggle('wide', wd); boxRectAt = -1e9; } }     // 4.9.35 贴图流转铺满画面区
  $('#dispSeg').hidden = state.tab==='asset' ? false : state.view !== 'export' && !(state.view==='live' && ((familyOf(state.P.type)==='aerial' && ['master','segments'].includes(state.P.form)) || isEmit(state.P)));
  $('#distBox').hidden = $('#dispSeg').hidden || state.disp !== 'game';
  $('#rtLayerBar').hidden = !(state.tab !== 'combo' && state.tab !== 'asset' && isEmit(state.P) && (state.view === 'live' || state.view === 'export'));     // 4.5.1 升空尾缀分层看
  // 4.9.35（用户 10-07 18:50「也不用分手机与PC/低端/三个种类，引擎回放就只是引擎回放」）：平台切换只在展示模式里留着（PC / 手机），平时一律按 PC 列画
  $('#platformSeg').hidden = !state.showcase;
  if (!state.showcase && state.platform !== 'pc') { state.platform = 'pc'; for (const x of $('#platformSeg').children) x.setAttribute('aria-pressed', String(x.dataset.platform === 'pc')); }
  { const lo = $('#lowOpts'); if (lo) lo.hidden = state.view !== 'export' || !(state.tab === 'combo' ? state.layers.some(L => layerOut(L).pc === 'frame') : typeof singleOut === 'function' && singleOut(state.P).pc === 'frame'); }     // 4.9.29 单帧的溶解预览 / 并排（4.9.35 有 PC 单帧层才出现）
  $('#resolutionBox').hidden = !mv || state.view!=='live' || isTrail(state.P) || isPhys(state.P) || isEmit(state.P);
  refSync();
  try { stageTick(D); } catch (e) { console.error(e); }
  perfTick(dt);
  requestAnimationFrame(loop);
}
