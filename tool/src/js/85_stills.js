// =====================================================================
//  定帧渲染：按指定时刻渲染「实时物理」的完整画面（全部火花、相机快门拖影），返回 PNG
//  用途：没有独立显卡的环境（软件渲染）也能出和显卡上一致的画面，拿去和实拍逐帧对照。
//  速度慢但结果与显卡上完全相同 —— 不做任何降密度、降分辨率的偷工。
// =====================================================================
function expoOfChannel(buf, ch, target, pct) {
  const hist = new Uint32Array(2048); let cnt = 0;
  for (let i = ch; i < buf.length; i += 4) { const v = buf[i]; if (v > 1e-5) { hist[clamp(Math.floor((Math.log2(v) + 20) * 40), 0, 2047)]++; cnt++; } }
  if (!cnt) return 1;
  const need = cnt * pct / 100; let acc = 0, b = 0; for (; b < 2048; b++) { acc += hist[b]; if (acc >= need) break; }
  return -Math.log(1 - target) / Math.pow(2, b / 40 - 20);
}
// opt: { times: [s…], px, half（米，画面半宽）, cy（米，画面中心高度）, shutter（秒）, sub（快门内子帧数，默认每 1/480 秒一帧）, probe（定曝光用的时刻）, expo（显示曝光） }
async function renderStills(P0, M0, opt) {
  const P = derive({ ...P0 }), M = normalizeM(M0 || {}, P.type), px = opt.px || 512, ground = familyOf(P.type) === 'ground';
  let half = opt.half, cy = opt.cy || 0, cx = 0;
  if (half == null) {
    // 自动取景：空中/上升按物理测量的范围，地面类按渲染出的包围盒
    let box;
    if (ground) { const R0 = makeRenderer(P, 'loop'); try { const g = Math.max(10, P.jetSpeed * Math.min(P.sparkLife, 1.5) + P.spacing * P.nozzles / 2 + P.groundH + (P.shotSpeed || 0) * 0.9); box = gpuBounds(R0, [0, P.loopT * 0.33, P.loopT * 0.66], g, [0, g * 0.6]); } finally { R0.dispose(); } }
    else { const fm = measure(P); box = [fm.x0, fm.x1, fm.y0, fm.y1]; }
    half = Math.max(box[1] - box[0], box[3] - box[2]) / 2 * 1.08; cx = (box[0] + box[1]) / 2; cy = (box[2] + box[3]) / 2;
  }
  const W = opt.shutter == null ? 1 / 40 : opt.shutter, nsub = opt.sub || Math.max(2, Math.ceil(W / (1 / 480)));
  state.stillBusy = true; await nextTick(); await nextTick();
  const saveHdr = hdrT, saveRg = rgT, saveMode = state.ref.mode, saveExpo = state.expo;
  canvas.width = canvas.height = px; gl.activeTexture(gl.TEXTURE0);
  const RG = new Target(px, px, gl.RGBA16F), H = new Target(px, px, gl.RGBA16F, true);
  const gpu = P.engine === 'gpu', track = gpu && !ground ? buildTrack(P) : null, E = ground ? buildEmitter(P) : null, view = [cx, cy, half, half], ppm = px / (2 * half);
  const drawAt = (sim, t, tw) => {
    setParticleProfile(P); RG.clear(); RG.bind(); additive(true);
    if (ground) { for (let j = 0; j < nsub; j++) { const ts = t - W + (j + 0.5) * W / nsub; drawEmitHeads(E, ts, view, ppm, [1, 0, 0, 0], 1 / nsub, tw * 16 + j); drawEmit(E, ts, view, ppm, [0, 1, 0, 0], 1 / nsub, tw * 16 + j); } additive(false); return; }
    for (let j = 0; j < nsub; j++) {
      const ts = Math.max(0, t - W + (j + 0.5) * W / nsub);
      while (sim.t < ts - 1e-9) sim.step(H_STEP);
      const [nh, nt] = sim.gather(bufH, bufT);
      drawPoints(bufH, nh, view, ppm, [1, 0, 0, 0], 1 / nsub);
      if (gpu) drawSparksGPU(track, ts, view, ppm, [0, 1, 0, 0], 1 / nsub, tw * 16 + j);
      else drawPoints(bufT, nt, view, ppm, [0, 1, 0, 0], 1 / nsub);
    }
    additive(false);
  };
  const out = [];
  try {
    // 定曝光：在 probe 时刻渲染一帧，星头、火花各自按 99.8 / 99.6 分位定曝光（与烘焙相同的口径）
    const probe = ground ? null : new Sim({ ...P }); drawAt(probe, opt.probe != null ? opt.probe : P.burn * 0.3, 999);
    const buf = new Float32Array(px * px * 4); RG.bind(); gl.readPixels(0, 0, px, px, gl.RGBA, gl.FLOAT, buf);
    const comb = P.outMode === 'combined', cg = comb ? combGain(P) : [1, 1], eH = expoOfChannel(buf, 0, comb ? 0.92 : 0.9, 99.8) * cg[0], eT = expoOfChannel(buf, 1, comb ? 0.55 : 0.85, 99.6) * cg[1];
    const sim = ground ? null : new Sim({ ...P }), times = opt.times.slice().sort((a, b) => a - b);
    hdrT = H; rgT = RG; state.ref.mode = 0; state.expo = opt.expo || 1;
    for (let i = 0; i < times.length; i++) {
      drawAt(sim, times[i], i);
      H.bind(); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      const pr = PR.rgmat; gl.useProgram(pr.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, RG.tex); gl.uniform1i(pr.u.uS, 0);
      gl.uniform1f(pr.u.uEH, eH); gl.uniform1f(pr.u.uET, eT); gl.uniform1f(pr.u.uG, P.encGamma); gl.uniform1f(pr.u.uComb, comb ? 1 : 0);
      setMatUniforms(pr, M, times[i]); drawQuad();
      post(-1);
      out.push({ t: times[i], png: canvas.toDataURL('image/png') });
      await nextTick();
    }
  } finally {
    hdrT = saveHdr; rgT = saveRg; state.ref.mode = saveMode; state.expo = saveExpo;
    RG.dispose(); H.dispose(); disposeTrack(track); disposeEmitter(E);
    state.stillBusy = false;
  }
  return out;
}
