// ---------------- 渲染 ----------------
let boxRect = null, boxRectAt = -1e9;
function ensureTargets() {
  // 4.2.22：画布大小每 1/4 秒量一次（getBoundingClientRect 每帧强制排版，光这一下 3 ms）；拖栏 / 改窗口时也会在下一个 1/4 秒跟上
  const now = performance.now(); if (!boxRect || now - boxRectAt > 250) { boxRect = $('#box').getBoundingClientRect(); boxRectAt = now; }
  const box = boxRect;
  const dpr=devicePixelRatio||1;
  const size = Math.max(256, Math.min(2048, Math.round(Math.min(box.width, box.height || box.width) * dpr / 4) * 4)), height=size;
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
// 入点前放大（用户 2026-10-02 选 B）：第一段的 meta.pre = { from, dur, keys, pivot }；这段时间显示第 0 帧，面片按 keys 从小放大到 1
function preScaleAt(b0, m, b, age0, age) { return b === b0 && m.pre && age < 0 && age0 >= m.pre.from ? evalKeys(m.pre.keys, clamp((age0 - m.pre.from) / m.pre.dur, 0, 1)) : 0; }
function preRect(r, s, pivot) {
  if (pivot) return [r[0] * s, r[1] * s, r[2] * s, r[3] * s];        // 绕爆点（面片坐标原点 = 爆点）
  const cx = (r[0] + r[2]) / 2, cy = (r[1] + r[3]) / 2, hw = (r[2] - r[0]) / 2 * s, hh = (r[3] - r[1]) / 2 * s;
  return [cx - hw, cy - hh, cx + hw, cy + hh];                       // 绕面片中心（Cascade Size By Life 的默认行为）
}
function drawLayer(b0, L, t, view, origin = [0, 0]) {
  t=engineTick(t);
  const age0 = (t - L.delay) * L.rate, b = segAt(b0, age0), m = b.meta, age = age0 - (m.t0 || 0), ps = preScaleAt(b0, m, b, age0, age);
  const f = ps > 0 ? 0 : frameIdx(m, age);
  if (f < 0) return f;
  const pr = PR.mat; gl.useProgram(pr.p);
  const r = ps > 0 ? preRect(layerRectAt(m, L, 0), ps, m.pre.pivot) : layerRectAt(m, L, age);
  gl.uniform4fv(pr.u.uRect, [r[0] + origin[0], r[1] + origin[1], r[2] + origin[0], r[3] + origin[1]]); gl.uniform4fv(pr.u.uView, view);
  bindSeqTextures(pr, b);
  gl.uniform1f(pr.u.uFrame, f); gl.uniform1f(pr.u.uMirror, L.mirror ? 1 : 0);
  setMatUniforms(pr, L, age0);
  gl.bindVertexArray(quadVAO); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.activeTexture(gl.TEXTURE0);
  return f;
}
// 单元序列：模拟 Cascade 的每颗星一个粒子
function drawUnitLayer(b, L, t, view) {
  t=engineTick(t);
  const m = b.meta, P = b.P, f = m.fit, pr = PR.unit; gl.useProgram(pr.p);
  const kf = new Float32Array(16); m.keys.forEach(([u, v], i) => { kf[i * 2] = u; kf[i * 2 + 1] = v; });
  gl.uniform1f(pr.u.uTime, t); gl.uniform1f(pr.u.uV0, f.v0); gl.uniform1f(pr.u.uDrag, f.k); gl.uniform1f(pr.u.uA, f.a); gl.uniform1f(pr.u.uWind, P.wind || 0);
  gl.uniform1f(pr.u.uLife, m.duration); gl.uniform1f(pr.u.uLJ, P.burnJit / 100); gl.uniform1f(pr.u.uSX, m.Ww); gl.uniform1f(pr.u.uSY, m.Wh);
  gl.uniform1f(pr.u.uHb, m.hb); gl.uniform1f(pr.u.uFlip, 0); gl.uniform1i(pr.u.uSeed, P.seed | 0); gl.uniform4fv(pr.u.uView, view);
  gl.uniform2fv(pr.u['uKF[0]'], kf); gl.uniform1i(pr.u.uNKF, m.keys.length); gl.uniform1f(pr.u.uNF, m.L.F);
  const pack = ks => { const a = new Float32Array(16); ks.forEach(([u, v], i) => { a[i * 2] = u; a[i * 2 + 1] = v; }); return a; };
  gl.uniform2fv(pr.u['uKX[0]'], pack(m.sizeKeysX)); gl.uniform1i(pr.u.uNKX, m.sizeKeysX.length);
  gl.uniform2fv(pr.u['uKY[0]'], pack(m.sizeKeysY)); gl.uniform1i(pr.u.uNKY, m.sizeKeysY.length);
  bindSeqTextures(pr, b); setMatUniforms(pr, L, t);
  gl.bindVertexArray(emptyVAO); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, P.stars); gl.bindVertexArray(null);
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
  const m = b.meta, w = m.Ww, h = m.Wh * s.sy, y0 = s.y - yOff - m.hb * h;
  const pr = PR.mat; gl.useProgram(pr.p);
  gl.uniform4fv(pr.u.uRect, [-w / 2, y0, w / 2, y0 + h]); gl.uniform4fv(pr.u.uView, view);
  bindSeqTextures(pr, s.bb); gl.uniform1f(pr.u.uFrame, s.f); gl.uniform1f(pr.u.uMirror, 0);
  setMatUniforms(pr, { ...L, headInt: (L.headInt || 1) * (b.P.trBright || 1) }, t);
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
function exportView(b) {
  const s = segAt(b, state.t), m = s.meta, sc = sizeAt(m, clamp(state.t - (m.t0 || 0), 0, m.duration));
  let full = null;
  for (let q = b; q; q = q.next) for (let i = 0; i <= 12; i++) { const rr = layerRectAt(q.meta, { scale: 1, mirror: false }, i / 12 * q.meta.duration), h = Math.max(rr[2] - rr[0], rr[3] - rr[1]) / 2, v = [(rr[0] + rr[2]) / 2, (rr[1] + rr[3]) / 2, h, h]; full = full ? unionView(full, v) : v; }
  const sxy = sizeXY(m, clamp(state.t - (m.t0 || 0), 0, m.duration));
  const texPPM = m.L.cellW / (m.Ww * Math.max(sxy[0], 1e-3));
  let ppmScreen;
  if (state.disp === 'px') ppmScreen = texPPM;
  else if (state.disp === 'game') ppmScreen = gamePixelsPerMeter(b.P,gameDiameter(b,2*full[2]));
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
function renderExport() {
  const b = previewBake(); hdrT.clear();
  if (!b) { post(); hudText = '烘焙中…'; return; }
  if (b.form === 'emitset') return renderEmitExport(b);
  const sa = liveSlot('XA'); prepSlot(sa, b.P, state.gen);
  const ev = exportViewAny(b, sa), view = ev.view;
  hdrT.bind(); additive(true);
  let f = -1;
  // 4.4.2 单层的导出方案：PC 选 GPU 光点 → 画光点（和 cascade.json 同一份发射器数据）；不出 → 不画
  const so = typeof singleOut === 'function' && (b.form === 'master' || b.form === 'segments') ? singleOut(b.P || state.P) : null, sch = so ? (state.platform === 'mobile' ? so.mobile : so.pc) : 'seq';
  if (sch === 'dots') { esDraw(singleDotsTables(b.P || state.P, state.M, b), engineTick(state.t), view, hdrT.w / (2 * view[2]), hdrT.h / (2 * view[3]), 1); additive(false); post(-1); hudText = `导出效果 · PC GPU 光点（约 ${dotsCount(b.P || state.P)} 颗，软圆点，没有贴图）`; hudB = ''; return; }
  if (sch === 'off') { additive(false); post(-1); hudText = `导出效果 · 这个平台不出（导出方案：${state.platform === 'mobile' ? '手机' : 'PC'} 不出）`; hudB = ''; return; }
  f = drawExportScene(b, state.M, state.t, view, sa);
  additive(false); post(-1);
  const s = segAt(b, state.t), L = s.meta.L, mag = ev.mag;
  const magTxt = !mag ? '' : mag > 1.5 ? ` · 贴图放大 ${mag.toFixed(1)}×，会显糊` : ` · 贴图放大 ${mag.toFixed(1)}×`;
  const tsx = b.form === 'trail' ? trailStateAt(b, state.t) : null;
  if (b.form === 'trail') { hudText = !tsx ? '序列结束' : `导出效果 · 升空尾缀 · ${tsx.phase === 'rise' ? '上升循环' : '消散（' + tsx.bb.fps + ' fps）'} · 第 ${tsx.f + 1}/64 帧 · ${'RGBA'[Math.floor(tsx.f / 16)]} 通道 · 镜头跟着星头（面片沿弹道上升，Size By Life Y ${tsx.sy.toFixed(2)}）`; hudB = ''; return; }
  const fi = b.form === 'unit' ? frameIdx(b.meta, engineTick(state.t)) : frameIdx(s.meta, engineTick(state.t) - (s.meta.t0 || 0));
  const ps = b.form === 'unit' ? 0 : preScaleAt(b, s.meta, s, engineTick(state.t), engineTick(state.t) - (s.meta.t0 || 0));
  hudText = ps > 0 ? `导出效果 · 入点前：第 1 帧放大到 ${Math.round(ps * 100)}%（${s.meta.pre.pivot ? '绕爆点' : '绕面片中心'}）· 入点 ${s.meta.t0.toFixed(2)} s` : fi < 0 ? (engineTick(state.t) < (s.meta.t0 || 0) ? '还没到入点' : '序列结束') : `导出效果 · ${FORM_NAMES[b.form]}${b.next ? ' 段 '+bakeSegmentName(b,bakeParts(b).indexOf(s)) : ''} · 第 ${fi + 1}/${L.F} 帧 · ${L.chans === 4 ? 'RGBA'[Math.floor(fi / L.per)] + ' 通道 ' : ''}单格 ${+L.cellW.toFixed(1)}×${+L.cellH.toFixed(1)}` + magTxt + (state.disp === 'game' && mag ? ` · 屏幕上约 ${Math.round(ev.onScreen)} 像素宽` : '') + (b.form === 'unit' ? ` · ${b.P.stars} 个粒子` : '') + (state.dirty ? ' · 等待重新烘焙' : '');
  if (sch === 'unit') hudText += ' · PC 导出方案是单束：这里仍按序列画（单束的引擎回放在多层效果里看）';
  hudB = '';
}
const flowTrail = [];
// 贴图 / 流转看哪一张：默认「自动」= 跟着时间走（一层分两张时播完第一张接着播第二张——用户 2026-10-02 13:09）；点段按钮锁定某一张
function atlasSegOf(b0) { const parts=bakeParts(b0); return state.atlasSeg<0 ? segAt(b0, state.t) : parts[clamp(state.atlasSeg,0,parts.length-1)]; }
let atlasSegmentSource=null;
function syncAtlasSegments(b) {
  if(b===atlasSegmentSource)return;atlasSegmentSource=b;
  state.atlasSeg=state.atlasSeg<0?-1:clamp(state.atlasSeg,0,Math.max(0,bakeParts(b).length-1));
  const box=$('#segSeg');box.replaceChildren();
  const auto=document.createElement('button');auto.dataset.seg='-1';auto.textContent='自动（跟时间）';auto.setAttribute('aria-pressed',String(state.atlasSeg<0));box.appendChild(auto);
  bakeParts(b).forEach((s,i)=>{const button=document.createElement('button');button.dataset.seg=String(i);
    button.textContent='第 '+(i+1)+' 张';button.setAttribute('aria-pressed',String(i===state.atlasSeg));box.appendChild(button);});
}
function drawAtlasQuad(b, show, f, n, trail) {
  const L = b.meta.L, pr = PR.atlas; gl.useProgram(pr.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, show.tex);
  gl.uniform1i(pr.u.uS, 0); gl.uniform1f(pr.u.uFrame, f); gl.uniform1f(pr.u.uN, n);
  gl.uniform1f(pr.u.uCols, L.cols); gl.uniform1f(pr.u.uRows, L.rows); gl.uniform1f(pr.u.uChans, L.chans); gl.uniform1f(pr.u.uAspect, b.N / b.NH);
  const tr = new Float32Array(6).fill(-1); (trail || []).slice(0, 6).forEach((v, i) => tr[i] = v); gl.uniform1fv(pr.u['uTrail[0]'], tr);
  drawQuad();
}
function renderAtlas() {
  const b0 = previewBake();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0.02, 0.02, 0.03, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  if (!b0) { hudText = '烘焙中…'; return; }
  syncAtlasSegments(b0);const b = atlasSegOf(b0);
  const L = b.meta.L, show = state.atlasLayer === 'tail' && b.tail ? b.tail : b.head, f = frameIdx(b.meta, state.t - (b.meta.t0 || 0));
  if (state.atlasFlow) { renderAtlasFlow(b0, b, show, f); return; }
  drawAtlasQuad(b, show, f, canvas.width, null);
  hudText = `${b.tail ? (show === b.tail ? '尾迹' : '星头') : '合并'}贴图${b0.next ? ` 第 ${bakeParts(b0).indexOf(b)+1} / ${bakeParts(b0).length} 张` : ''} ${b.P.texW}×${b.P.texH} · ${L.cols}×${L.rows} 格 · 金框 = 当前帧 · 红色 = 过曝像素`; hudB = '';
}
// 贴图流转：左边放大当前格，右边整张贴图上金框走动（淡框 = 刚走过的格），下面是帧号曲线
function renderAtlasFlow(b0, b, show, f) {
  const S = canvas.width, L = b.meta.L, top = Math.round(S * 0.30), H = Math.round(S * 0.66);
  if (f >= 0 && flowTrail[0] !== f) { flowTrail.unshift(f); flowTrail.length = Math.min(flowTrail.length, 7); }
  // 当前格：保持单格像素长宽比
  const ca = L.cellW / L.cellH, cw = Math.min(S * 0.44, H * ca), chh = cw / ca, cx = Math.round(S * 0.03 + (S * 0.44 - cw) / 2), cy = Math.round(top + (H - chh) / 2);
  if (f >= 0) {
    gl.viewport(cx, cy, Math.round(cw), Math.round(chh));
    const pc = PR.cell; gl.useProgram(pc.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, show.tex); gl.uniform1i(pc.u.uS, 0);
    gl.uniform1f(pc.u.uFrame, f); gl.uniform1f(pc.u.uCols, L.cols); gl.uniform1f(pc.u.uRows, L.rows); gl.uniform1f(pc.u.uChans, L.chans); gl.uniform2f(pc.u.uPx, 1 / cw, 1 / chh);
    drawQuad();
  }
  const aw = Math.round(Math.min(S * 0.45, H)); gl.viewport(Math.round(S * 0.52), top + Math.round((H - aw) / 2), aw, aw);
  drawAtlasQuad(b, show, f, aw, flowTrail.slice(1));
  gl.viewport(0, 0, S, S);
  drawFlowCurve(b, f);
  const t = state.t - (b.meta.t0 || 0), ch = L.chans === 4 && f >= 0 ? 'RGBA'[Math.floor(f / L.per)] + ' 通道 · ' : '';
  const pi = bakeParts(b0).indexOf(b), pn = bakeParts(b0).length, pg = pn > 1 ? `第 ${pi + 1} / ${pn} 张 · ` : '';
  hudText = f < 0 ? (t < 0 ? pg + '还没开始' : pg + '这一张播完了') : `贴图流转 · ${pg}第 ${f + 1}/${L.F} 帧 · ${ch}第 ${f % L.per + 1} 格（第 ${Math.floor((f % L.per) / L.cols) + 1} 行第 ${f % L.cols + 1} 列）· 时间 ${Math.max(0, t).toFixed(2)} s`;
  hudB = '';
}
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
  try { renderAtlas(); } finally { state.bake = sb; state.t = st; }
  hudText = `第 ${i + 1} 层 · ${hudText}`;
}
function renderComboLive() {
  const items = state.layers.map((L, i) => [L, state.lib.find(e => e.name === L.lib), i]).filter(x => x[1] && x[1].bake);
  hdrT.clear();
  if (!items.length) { post(); hudText = '没有图层'; return; }
  let view = null;
  items.forEach(([L, e, i]) => {
    const slot = liveSlot('combo' + i); prepSlot(slot, e.P, 'c' + i + ':' + e.name + ':' + (e.rev || 0));
    const v = sceneView(e.P, e.bake.meta, slot), s = L.scale || 1, vs = [v[0] * s, v[1] * s, v[2] * s, v[3] * s];
    view = view ? unionView(view, vs) : vs;
  });
  hdrT.bind(); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  let n = 0;
  // 4.2.20：几层一起算显卡负担，超预算时每层都少画几个快门子样本（见 48_render40.js liveCtl）
  let work = 0; items.forEach(([L, e, i]) => { const age = (state.t - (L.delay || 0)) * (L.rate || 1); if (age < 0 || age > e.P.duration || !layerShown(i)) return; const R = !isTrail(e.P) && !isPhys(e.P) ? liveRenderer40(liveSlot('combo' + i), e.P) : null; work += R ? trackDraws(R.track, e.P) + (e.P.stars || 0) : 0; });
  LIVE_CAP = liveCapFor(work); LIVE_VIEW = true;
  try {
  items.forEach(([L, e, i]) => {
    const age = (state.t - (L.delay || 0)) * (L.rate || 1), P = e.P;
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
    while (state.baking) await new Promise(r => setTimeout(r, 300));
    state.baking = true;
    try { await layerUnitBake(e, p => setStatus(`单束烘焙… ${Math.round(p * 100)}%`)); } catch (err) { console.error(err); flash('单束烘焙失败：' + (err.message || err), true); }
    finally { state.baking = false; setStatus(''); unitTask = null; if (state.layerQueue && state.layerQueue.size) runLayerQueue(); }
  })();
}
// 引擎回放里这一层怎么画（按当前预览平台的导出方案）：'seq' 贴图 / 'unit' 单束 / 'dots' 光点 / 'off' 不画
function comboLayerDraw(L) { const o = typeof layerOut === 'function' ? layerOut(L) : { pc: 'seq', mobile: 'seq' }; return state.platform === 'mobile' ? o.mobile : o.pc; }
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
    if (s === 'dots') { const e0 = state.lib.find(x => x.name === L.lib) || e; esDraw(dotsTables(e0, L), engineTick(state.t), view, hdrT.w / (2 * view[2]), hdrT.h / (2 * view[3]), 1); notes.push(`第 ${i + 1} 层光点`); continue; }
    if (s === 'unit' && unitAllowed(e.P)) {     // 4.2.13 单束：每颗星一个面片（drawUnitLayer 按 Cascade 的放射弹道画）；层的延迟 / 倍率换成这一层的年龄，缩放换成取景
      const e0 = state.lib.find(x => x.name === L.lib) || e, ub = e0.unitBake && e0.unitBake.sig === JSON.stringify(e0.P) ? e0.unitBake.b : null;
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
  const q = $('#qlabels'), b = previewBake();
  if (state.tab !== 'combo' && state.view === 'atlas' && state.atlasFlow && b) {
    if (q.dataset.key !== 'flow') { q.dataset.key = 'flow'; q.innerHTML = `<span class="qlabel" style="top:8px;left:3%">当前格 · 原始灰度 · 最近邻（看得到真实像素）</span><span class="qlabel" style="top:8px;left:52%">整张贴图 · 金框 = 当前帧 · 淡框 = 刚走过</span>`; }
  } else if (state.tab !== 'combo' && state.view === 'atlas' && b && b.meta.L.chans === 4) {
    const per = b.meta.L.per, key = String(per);
    if (q.dataset.key !== key) {
      q.dataset.key = key;
      q.innerHTML = [['R', 0, '8px', '8px'], ['G', 1, '8px', 'calc(50% + 8px)'], ['B', 2, 'calc(50% + 8px)', '8px'], ['A', 3, 'calc(50% + 8px)', 'calc(50% + 8px)']]
        .map(([c, i, top, left]) => `<span class="qlabel" style="top:${top};left:${left}">${c} · 第 ${i * per + 1}–${(i + 1) * per} 帧</span>`).join('');
    }
  } else { q.innerHTML = ''; q.dataset.key = ''; }
}

// ---------------- 主循环 ----------------
let lastT = performance.now();
function curDuration() {
  if(state.showcase && showcase.recipe)return Math.max(...showcase.layers.map(l=>l.delay+bakeTotal(l.b)));
  if (state.tab === 'combo') return comboDuration();
  if (state.tab === 'asset') return assetDuration();
  // 时间轴：空中花型按烘焙结果的总时长（入点出点、裁首尾）；尾缀 / 地面 / 上升的烘焙结果只有一个循环周期，按参数时长（4.3 去 3.7 时保留这个区别）
  let d = !state.dirty && state.bake && familyOf(state.P.type) === 'aerial' && !isEmit(state.P)?bakeTotal(state.bake):state.P.duration;
  return d;
}
function loop(now) {
  if (state.glLost || gl.isContextLost()) { glLostNotice(); return; }      // 4.2.20：显卡上下文丢了，停下（不再每帧报错），画面上写原因
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
    else if (state.view === 'live' || (state.bake && state.bake.form === 'phys')) renderLive(); else if (state.view === 'export') renderExport(); else renderAtlas(); }
  } catch (e) { console.error(e); hudText = '渲染出错：' + e.message; }
  if (pendingThumb) { const f = pendingThumb; pendingThumb = null; try { f(thumbFromCanvas()); } catch (e) { } }
  $('#hud').textContent = hudText; $('#hudB').textContent = hudB; updateLabels();
  const ab = state.tab === 'combo' ? comboAtlasBake() : state.bake, mv = (state.tab !== 'combo' || state.view === 'atlas') && state.tab !== 'asset';
  $('#viewSeg').hidden=!!state.showcase;
  $('#atlasSeg').hidden = !mv || state.view !== 'atlas' || !(ab && ab.tail);
  $('#segSeg').hidden = !mv || state.view !== 'atlas' || !(ab && ab.next);
  $('#flowSeg').hidden = !mv || state.view !== 'atlas'; $('#flowCv').hidden = !mv || state.view !== 'atlas' || !state.atlasFlow;
  $('#dispSeg').hidden = state.tab==='asset' ? false : state.view !== 'export' && !(state.view==='live' && ((familyOf(state.P.type)==='aerial' && ['master','segments'].includes(state.P.form)) || isEmit(state.P)));
  $('#distBox').hidden = $('#dispSeg').hidden || state.disp !== 'game';
  $('#rtLayerBar').hidden = !(state.tab !== 'combo' && state.tab !== 'asset' && isEmit(state.P) && (state.view === 'live' || state.view === 'export'));     // 4.5.1 升空尾缀分层看
  $('#platformSeg').hidden = !state.showcase && (state.tab==='asset' || (mv && isPhys(state.P)));
  $('#resolutionBox').hidden = !mv || state.view!=='live' || isTrail(state.P) || isPhys(state.P) || isEmit(state.P);
  refSync();
  try { stageTick(D); } catch (e) { console.error(e); }
  perfTick(dt);
  requestAnimationFrame(loop);
}
