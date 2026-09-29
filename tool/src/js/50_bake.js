// =====================================================================
//  烘焙：F 帧 → 列×行格子，RGBA 接力（先填满 R）
//  四种产物：大面片母版（含分段）、单元序列（每颗星一个粒子）、上升星头循环、地面循环
// =====================================================================

// 渲染器：draw(ts, view, ppm, w, tw) 把星头画进 R、火花画进 G；ts 为绝对时间
function makeRenderer(P, kind) {
  const gpu = P.engine === 'gpu';
  if (kind === 'loop' || kind === 'riseLoop') {
    const E = buildEmitter(P), rl = kind === 'riseLoop';
    const F = layoutOf(P).F;
    return {
      E, slots: E.total, Tp: E.Tp,
      draw(ts, view, ppm, w, tw, f) {
        setParticleProfile(P);
        if (rl) {
          const fi = ((f % F) + F) % F, r = new RNG(P.seed * 977 + fi);
          let I = P.headBright * (1 + P.flicker * (r.u() * 2 - 1) * 0.8);
          if (P.riseStyle === 'dark') I *= 0.08; else if (P.riseStyle === 'fue') I *= 0.6 + 0.4 * Math.sin(6.2832 * fi / F * 3);
          bufH[0] = 0; bufH[1] = 0; bufH[2] = I; bufH[3] = P.headSize;
          drawPoints(bufH, 1, view, ppm, [1, 0, 0, 0], w);
        } else drawEmitHeads(E, ts, view, ppm, [1, 0, 0, 0], w, tw);
        if (!(rl && P.riseStyle === 'dark')) drawEmit(E, ts, view, ppm, [0, 1, 0, 0], w, tw);
      },
      dispose() { disposeEmitter(E); }
    };
  }
  const sim = new Sim(P), track = gpu ? buildTrack(P) : null, unit = kind === 'unit';
  let lastTs = -Infinity;
  const R = {
    sim, track, slots: track ? track.total : 0,
    xfAt() {
      const s = sim.all[0], v = Math.hypot(s.vx, s.vy) || 1;
      let ang = Math.PI / 2 - Math.atan2(s.vy / v, s.vx / v); if (P.unitFlip) ang += Math.PI;
      return [s.x, s.y, Math.cos(ang), Math.sin(ang)];
    },
    draw(ts, view, ppm, w, tw) {
      setParticleProfile(P);
      // 按「请求的时刻」判断回退：1/480 s 的物理步可能略超过请求时刻，快门子样本超过 480 Hz 时不能因此每次都从头重算（Ultra 修正）
      if (ts < lastTs - 1e-6) { R.reset(); }
      lastTs = ts;
      while (sim.t < ts - 1e-9) sim.step(H_STEP);
      const [nh, nt] = sim.gather(bufH, bufT), xf = unit ? R.xfAt() : null;
      let l = 0; for (let i = 0; i < nh; i++) l += bufH[i * 4 + 2]; for (let i = 0; i < nt; i++) l += bufT[i * 4 + 2] * 0.3;
      drawPoints(bufH, nh, view, ppm, [1, 0, 0, 0], w, xf);
      if (gpu) drawSparksGPU(track, ts, view, ppm, [0, 1, 0, 0], w, tw, { xf });
      else drawPoints(bufT, nt, view, ppm, [0, 1, 0, 0], w, xf);
      return l;
    },
    reset() { R.sim = new Sim(P); }, dispose() { disposeTrack(track); }
  };
  // reset 需要替换闭包里的 sim
  R.reset = () => { const s2 = new Sim(P); Object.assign(sim, s2); lastTs = -Infinity; };
  return R;
}

// 低分辨率把若干时刻叠画一遍，读回找内容的包围盒（地面类、单元序列、星头循环的取景用）
function gpuBounds(R, times, guess, center = [0, 0]) {
  const N = 256, t = new Target(N, N, gl.RGBA16F), buf = new Float32Array(N * N * 4);
  let ext = guess, c = center.slice(), box = null, refined = 0;
  for (let attempt = 0; attempt < 7; attempt++) {
    t.clear(); t.bind(); additive(true);
    const view = [c[0], c[1], ext, ext], ppm = N / (2 * ext);
    times.forEach((ts, i) => R.draw(ts, view, ppm, 1, i, i));
    additive(false);
    gl.readPixels(0, 0, N, N, gl.RGBA, gl.FLOAT, buf);
    // 星头和火花分别按各自的峰值取阈值（星头很亮，合在一起会把尾迹末端切掉或把极暗的火花算进来）
    let mh = 0, ms = 0; for (let i = 0; i < buf.length; i += 4) { mh = Math.max(mh, buf[i]); ms = Math.max(ms, buf[i + 1]); }
    if (mh + ms <= 0) { box = null; break; }
    const th = mh * 4e-3, ts2 = ms * 4e-3; let x0 = N, x1 = -1, y0 = N, y1 = -1;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const o = (y * N + x) * 4; if ((mh > 0 && buf[o] > th) || (ms > 0 && buf[o + 1] > ts2)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    const px = 2 * ext / N, touch = x0 <= 1 || y0 <= 1 || x1 >= N - 2 || y1 >= N - 2;
    box = [c[0] - ext + x0 * px - 2 * px, c[0] - ext + (x1 + 1) * px + 2 * px, c[1] - ext + y0 * px - 2 * px, c[1] - ext + (y1 + 1) * px + 2 * px];
    const span = Math.max(x1 - x0, y1 - y0);
    if (!touch && (span > N * 0.3 || refined >= 2)) break;
    c = [(box[0] + box[1]) / 2, (box[2] + box[3]) / 2];
    if (touch) ext *= 2; else { ext = Math.max(span * px * 0.75, 0.5); refined++; }   // 内容太小：放大再测一遍，边界更准
  }
  t.dispose();
  return box || [-5, 5, -5, 5];
}

// 线性阻力拟合：s(t) ≈ A·(1 − e^(−kt))/k，返回 A、k；再拟合竖直方向的恒定加速度 a
function fitLinearDrag(ts, xs, ys) {
  let best = null;
  for (let i = 0; i <= 240; i++) {
    const k = 0.01 * Math.pow(10, i / 80); let sfs = 0, sff = 0;
    const f = ts.map(t => (1 - Math.exp(-k * t)) / k);
    for (let j = 0; j < ts.length; j++) { sfs += f[j] * xs[j]; sff += f[j] * f[j]; }
    const A = sfs / sff; let e = 0; for (let j = 0; j < ts.length; j++) e += (A * f[j] - xs[j]) ** 2;
    if (!best || e < best.e) best = { k, A, e };
  }
  const k = best.k, g = ts.map(t => (t - (1 - Math.exp(-k * t)) / k) / k);
  let szg = 0, sgg = 0; for (let j = 0; j < ts.length; j++) { szg += -ys[j] * g[j]; sgg += g[j] * g[j]; }
  const a = sgg > 0 ? szg / sgg : G;
  const R = Math.max(...xs.map(Math.abs), 1), rms = Math.sqrt(best.e / ts.length);
  return { v0: best.A, k, a, err: rms / R };
}
// 单颗水平发射的星（不带火花）走一遍，给单元序列和参数表用
function starPath(P, dur) {
  const P2 = { ...P, _unit: true, unitElev: 0, stars: 1, speedJit: 0, burnJit: 0, engine: 'gpu', sparkRate: 0, crackle: 0, turb: 0, wind: 0 };
  const s = new Sim(P2), out = [];
  const n = Math.ceil(dur / H_STEP);
  for (let i = 0; i <= n; i++) { if (i % 8 === 0) { const q = s.all[0]; out.push([s.t, q.x, q.y, Math.hypot(q.vx, q.vy)]); } s.step(H_STEP); }
  return out;
}

// 自动选格子：帧数不变，挑格子长宽比最接近内容长宽比的「列 × 行」，少浪费像素
function fitGrid(P, box) {
  if (!P.autoGrid) return P;
  const F = P.cols * P.rows, W0 = 2 * Math.max(-box[0], box[1]), H0 = box[3] - box[2], ca = W0 / Math.max(1e-3, H0);
  let best = null;
  for (const c of [1, 2, 4, 8, 16, 32]) {
    const r = F / c; if (!Number.isInteger(r) || ![1, 2, 4, 8, 16, 32].includes(r)) continue;
    const a = (P.texW / c) / (P.texH / r), score = Math.abs(Math.log(a / ca)) + ((a > 1) !== (ca > 1) ? 0.01 : 0);   // 同样接近时，选与内容同方向（高或宽）的格子
    if (P.texW / c < 32 || P.texH / r < 32) continue;
    if (!best || score < best.score) best = { c, r, score };
  }
  return best ? { ...P, cols: best.c, rows: best.r } : P;
}
function unitDuration(P) { return +(P.burn + (P.ignDelay || 0) + P.sparkLife * 1.6 + 0.1).toFixed(3); }
function loopPlan(P, box, Tp) {
  const L = layoutOf(P), a = L.cellW / L.cellH;
  const W0 = 2 * Math.max(-box[0], box[1]), H0 = box[3] - box[2];
  // 横竖分开：内容正好铺满格子（像素可以不是正方形，引擎里按面片尺寸还原）
  const HX = W0 / 2 * 1.02, HY = H0 / 2 * 1.02, cy = (box[2] + box[3]) / 2;
  const times = [], dur = []; for (let f = 0; f < L.F; f++) { times.push(f * Tp / L.F); dur.push(Tp / L.F); }
  return { L, HX, HY, Ww: 2 * HX, Wh: 2 * HY, cy, ppm: L.cellW / (2 * HX), zoom: false, aniso: true, sizeKeys: [[0, 1], [1, 1]], sizeKeysX: [[0, 1], [1, 1]], sizeKeysY: [[0, 1], [1, 1]], area: 1, px: 0.5, py: (cy + HY) / (2 * HY),
    keys: [[0, 0], [1, L.F]], times, dur, avgFps: L.F / Tp, minFps: L.F / Tp, maxDisp: 0, t0: 0, duration: Tp, loop: true };
}

// 核心：按计划逐帧渲染、打包、编码、统计
async function bakeFrames(P, scale, onProg, pl, R, extra = {}) {
  const L = pl.L;
  const N = Math.round(P.texW * scale), NH = Math.round(P.texH * scale);
  const cw = Math.round(L.cellW * scale), chh = Math.round(L.cellH * scale);
  const q = qualityOf(P); setParticleProfile(P);
  const ssW = cw * q.ss, ssH = chh * q.ss;
  gl.activeTexture(gl.TEXTURE0);
  const fH = new Target(N, NH, gl.RGBA16F), fT = new Target(N, NH, gl.RGBA16F), sst = new Target(ssW, ssH, gl.RGBA16F);
  fH.clear(); fT.clear();
  const t0 = performance.now();
  for (let f = 0; f < L.F; f++) {
    const tc = pl.times[f], W = Math.max(P.shutter * pl.dur[f], 1e-4);
    const nsub = clamp(Math.ceil(W * q.hz), 1, q.maxSub);
    const [sx, sy] = sizeXY(pl, tc), c = centerAt(pl, tc), view = [c[0], c[1], pl.HX * sx, pl.HY * sy], ppm = ssW / (pl.Ww * sx);
    PPMY = ssH / (pl.Wh * sy);
    sst.clear(); sst.bind(); additive(true);
    R.subW = W / nsub;   // 每个子帧覆盖的时长（尾缀的星头据此再细分，拖出连续亮线）
    for (let j = 0; j < nsub; j++) {
      const ts = pl.t0 + tc - W / 2 + (j + 0.5) * W / nsub;
      R.draw(pl.loop ? ts : Math.max(0, ts), view, ppm, 1 / nsub, pl.loop ? f : f * 16 + j, f);
    }
    additive(false);
    const ch = Math.floor(f / L.per), k = f % L.per, col = k % L.cols, row = Math.floor(k / L.cols);
    const fade = pl.loop || extra.noFade ? 1 : clamp((pl.duration - tc) / 0.3, 0, 1);
    gl.useProgram(PR.pack.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sst.tex);
    gl.uniform1i(PR.pack.u.uS, 0); gl.uniform1i(PR.pack.u.uSS, q.ss); gl.uniform1f(PR.pack.u.uFade, fade);
    gl.uniform1f(PR.pack.u.uPad, (P.cellPad || 0) * scale); gl.uniform2f(PR.pack.u.uCell, cw, chh);
    for (const [tg, m] of [[fH, [1, 0, 0, 0]], [fT, [0, 1, 0, 0]]]) {
      tg.bind(col * cw, NH - (row + 1) * chh, cw, chh);
      gl.colorMask(ch === 0, ch === 1, ch === 2, ch === 3);
      gl.uniform4fv(PR.pack.u.uM, m); drawQuad();
    }
    gl.colorMask(true, true, true, true);
    if (f % 8 === 7) { PPMY = 0; onProg && onProg((f + 1) / L.F); await nextTick(); }
  }
  PPMY = 0;
  const comb = P.outMode === 'combined';
  const cg = comb ? combGain(P) : [1, 1];
  const eH = extra.expo ? extra.expo[0] : autoExpo(fH, comb ? 0.92 : 0.9, 99.8) * cg[0], eT = extra.expo ? extra.expo[1] : autoExpo(fT, comb ? 0.55 : 0.85, 99.6) * cg[1];
  // 先建目标贴图：Target 构造时会绑定到当前活动纹理单元，放在后面会顶掉采样用的贴图
  gl.activeTexture(gl.TEXTURE0);
  const head = new Target(N, NH, gl.RGBA8), tail = comb ? null : new Target(N, NH, gl.RGBA8);
  const pr = PR.enc; gl.useProgram(pr.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fH.tex); gl.uniform1i(pr.u.uH, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, fT.tex); gl.uniform1i(pr.u.uT, 1);
  gl.uniform1f(pr.u.uEH, eH); gl.uniform1f(pr.u.uET, eT); gl.uniform1f(pr.u.uG, P.encGamma); gl.uniform1f(pr.u.uSingle, L.chans === 1 ? 1 : 0);
  head.bind(); gl.uniform1f(pr.u.uWhich, comb ? 0 : 1); drawQuad();
  if (tail) { tail.bind(); gl.uniform1f(pr.u.uWhich, 2); drawQuad(); }
  gl.activeTexture(gl.TEXTURE0);
  fH.dispose(); fT.dispose(); sst.dispose();
  const bakeMs = performance.now() - t0;
  const b = { N, NH, cw, chh, scale, head, tail, P, meta: { ...pl, quality: q, expoH: eH, expoT: eT, sparkSlots: R.slots || 0, bakeMs } };
  analyze(b);
  return b;
}
// 灯光曲线、暗帧、自检（过曝、边缘渗色、通道布局、近似帧、循环接缝）
function analyze(b) {
  const m = b.meta, L = m.L, P = b.P, N = b.N, NH = b.NH, cw = b.cw, chh = b.chh;
  const imgs = [readRGBA8(b.head)]; if (b.tail) imgs.push(readRGBA8(b.tail));
  const light = [], cellMax = [], clip = [], edge = [], sig = [], rows = [], fills = [];
  const measureImg = !m.loop && !m.unit;   // 与实拍视频同样的口径：亮部像素掩码 → 半径、下坠、像素数
  const SG = 16;   // 近似帧比较用的缩略网格
  for (let f = 0; f < L.F; f++) {
    const ch = L.chans === 4 ? Math.floor(f / L.per) : 0, k = f % L.per, col = k % L.cols, row = Math.floor(k / L.cols);
    const y0 = NH - (row + 1) * chh, x0 = col * cw; let sum = 0, mx = 0, nz = 0, nc = 0, em = 0;
    const sg = new Float32Array(SG * SG);
    for (const im of imgs) {
      for (let y = y0; y < y0 + chh; y += 2) {
        let o = (y * N + x0) * 4 + ch; const gy = Math.min(SG - 1, Math.floor((y - y0) / chh * SG));
        for (let x = 0; x < cw; x += 2, o += 8) { const v = im[o]; if (v) { const lv = Math.pow(v / 255, P.encGamma); sum += lv; nz++; if (v >= 254) nc++; if (v > mx) mx = v; sg[gy * SG + Math.min(SG - 1, Math.floor(x / cw * SG))] += lv; } }
      }
      // 边缘一圈像素
      for (let x = 0; x < cw; x++) { em = Math.max(em, im[((y0) * N + x0 + x) * 4 + ch], im[((y0 + chh - 1) * N + x0 + x) * 4 + ch]); }
      for (let y = 0; y < chh; y++) { em = Math.max(em, im[((y0 + y) * N + x0) * 4 + ch], im[((y0 + y) * N + x0 + cw - 1) * 4 + ch]); }
    }
    const sxy = sizeXY(m, m.times[f]); light.push(sum * sxy[0] * sxy[1]);
    fills.push(cellFill(imgs, N, x0, y0, cw, chh, ch)); cellMax.push(mx); clip.push(nz ? nc / nz : 0); edge.push(em); sig.push(sg);
    if (measureImg) rows.push(imgRow(imgs, f, m, N, x0, y0, cw, chh, ch));
  }
  const lmax = Math.max(1e-6, ...light);
  let darkTail = 0; if (!m.loop) for (let f = L.F - 1; f >= 0 && cellMax[f] < 10; f--) darkTail++;
  const lightKeys = m.loop ? [[0, 1], [1, 1]] : simplify([[0, light[0] / lmax], ...m.times.map((t, i) => [t / m.duration, light[i] / lmax]), [1, 0]], 8, 0.02)
    .map(([u, v]) => [+u.toFixed(4), +v.toFixed(3)]);
  const diff = (a, c) => { let d = 0, s = 0; for (let i = 0; i < a.length; i++) { d += Math.abs(a[i] - c[i]); s += a[i] + c[i]; } return s > 0 ? 2 * d / s : 0; };
  const diffs = []; for (let f = 1; f < L.F; f++) diffs.push(diff(sig[f - 1], sig[f]));
  const similar = diffs.filter(d => d < 0.03).length;
  const chanUse = []; if (L.chans === 4) for (let c = 0; c < 4; c++) chanUse.push(cellMax.slice(c * L.per, (c + 1) * L.per).some(v => v > 0));
  const emptyMid = cellMax.map((v, i) => v === 0 && i < L.F - darkTail ? i : -1).filter(i => i >= 0 && i > 0);
  const clipFrames = clip.map((c, i) => c > 0.02 ? i : -1).filter(i => i >= 0);
  const edgeFrames = edge.map((e, i) => e > 8 ? i : -1).filter(i => i >= 0);
  let seam = null;
  if (m.loop && L.F > 2) { const mean = diffs.reduce((a, c) => a + c, 0) / diffs.length; seam = mean > 0 ? diff(sig[L.F - 1], sig[0]) / mean : 0; }
  if (measureImg) m.imgRows = rows;
  // 画面占比：每帧内容包围盒 ÷ 格子（横、竖取较小者）；只统计有内容的帧，末尾全黑的除外
  const fv = fills.filter(q => q);
  if (fv.length) { const per = fv.map(q => Math.min(q[0], q[1])); m.fill = { avg: per.reduce((a, c) => a + c, 0) / per.length, min: Math.min(...per), p10: per.slice().sort((a, c) => a - c)[Math.floor(per.length * 0.1)], x: fv.reduce((a, q) => a + q[0], 0) / fv.length, y: fv.reduce((a, q) => a + q[1], 0) / fv.length, frames: fills.map(q => q ? +Math.min(q[0], q[1]).toFixed(3) : null) }; }
  Object.assign(m, { lightKeys, darkTail, check: { clipFrames, edgeFrames, chanUse, emptyMid, similar, seam, maxClip: Math.max(...clip) }, frameDiffs: diffs });
}
// 单帧内容占格子的比例（阈值 3/255，扣掉留边）
function cellFill(imgs, N, x0, y0, cw, chh, ch) {
  let a = cw, b2 = -1, c = chh, d = -1;
  for (const im of imgs) for (let y = 0; y < chh; y++) { let o = ((y0 + y) * N + x0) * 4 + ch; for (let x = 0; x < cw; x++, o += 4) if (im[o] > 3) { if (x < a) a = x; if (x > b2) b2 = x; if (y < c) c = y; if (y > d) d = y; } }
  if (b2 < 0) return null;
  return [(b2 - a + 1) / cw, (d - c + 1) / chh];
}
// 单帧：取亮部像素（阈值 = max(30, 0.3 × 99.95 分位)），换算到世界坐标（米）
function imgRow(imgs, f, m, N, x0, y0, cw, chh, ch) {
  const sxy = sizeXY(m, m.times[f]), Ww = m.Ww * sxy[0], Wh = m.Wh * sxy[1], t = (m.t0 || 0) + m.times[f], cc = centerAt(m, m.times[f]);
  const hist = new Uint32Array(256), val = [];
  for (let y = y0; y < y0 + chh; y += 2) for (let x = x0; x < x0 + cw; x += 2) { let v = 0; for (const im of imgs) v = Math.max(v, im[(y * N + x) * 4 + ch]); if (v) { hist[v]++; } }
  let tot = 0; for (let i = 1; i < 256; i++) tot += hist[i];
  const cells = (cw >> 1) * (chh >> 1); let acc = 0, p = 255; const need = cells * 0.0005;
  for (let i = 255; i > 0; i--) { acc += hist[i]; if (acc >= need) { p = i; break; } }
  const thr = Math.max(30, 0.3 * p), X = [], Y = [], W = [];
  for (let y = y0; y < y0 + chh; y += 2) for (let x = x0; x < x0 + cw; x += 2) {
    let v = 0; for (const im of imgs) v = Math.max(v, im[(y * N + x) * 4 + ch]);
    if (v > thr) { X.push(cc[0] + ((x - x0 + 0.5) / cw - 0.5) * Ww); Y.push(cc[1] + ((y - y0 + 0.5) / chh - 0.5) * Wh); W.push(v - thr); }
  }
  if (X.length < 15) return [t, 0, 0, 0, 0, 0];
  const pct = (a, q) => { const s = a.slice().sort((p1, p2) => p1 - p2); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
  let sw = 0, sy = 0; for (let i = 0; i < X.length; i++) { sw += W[i]; sy += -Y[i] * W[i]; }
  const px = Ww / cw * 2;
  return [t, pct(X.map(Math.abs), 0.98), pct(Y.map(v => Math.max(v, 0)), 0.98), pct(Y.map(v => Math.max(-v, 0)), 0.98), sy / sw, X.length * px * px];
}
// 与 analysis/scripts/measure2.py 相同的算法
function imgMetrics(rows) {
  if (!rows || rows.length < 6) return null;
  const t = rows.map(r => r[0]), rx = rows.map(r => r[1]), N = rows.map(r => r[5]);
  const Ns = N.map((v, i) => (N[Math.max(0, i - 1)] + v + N[Math.min(N.length - 1, i + 1)]) / 3);
  let ip = 0; Ns.forEach((v, i) => { if (v > Ns[ip]) ip = i; });
  const after = th => { for (let j = ip; j < Ns.length; j++) if (Ns[j] < th * Ns[ip]) return j; return Ns.length - 1; };
  const ie = after(0.15), Tb = t[ie] || t[t.length - 1], i80 = after(0.8), i20 = after(0.2);
  const sel = rx.filter((v, i) => t[i] > 0.6 * Tb && t[i] < 0.9 * Tb && v > 0).sort((a, b) => a - b);
  const Rf = sel.length ? sel[Math.floor(sel.length / 2)] : Math.max(...rx);
  const tfrac = f => { for (let i = 0; i < rx.length; i++) if (rx[i] / Rf >= f) return t[i] / Tb; return NaN; };
  let j95 = 0; t.forEach((v, i) => { if (Math.abs(v - 0.92 * Tb) < Math.abs(t[j95] - 0.92 * Tb)) j95 = i; });
  const r = rows[j95];
  return { burn: Tb, diameter: 2 * Rf, t50: tfrac(0.5), t80: tfrac(0.8), t90: tfrac(0.9), droop: r[4] / Rf, bt: r[3] / Math.max(r[2], 1e-3), kieguchi: (t[i20] - t[i80]) / Tb, peakT: t[ip] };
}
function bakeMetrics(b) { if (!b) return null; const rows = []; for (let s = b; s; s = s.next) if (s.meta.imgRows) rows.push(...s.meta.imgRows); return rows.length ? imgMetrics(rows) : null; }
function disposeBake(b) { if (b) { b.head.dispose(); b.tail && b.tail.dispose(); disposeTrail(b); if (b.next) disposeBake(b.next); } }

// 大面片母版（可只取 [ta, tb] 一段）
async function bakeMaster(P, scale, onProg, opt = {}) {
  let fm = opt.fm || measure(P);
  if (P.frameMode === 'content' && !opt.fm) fm = { ...fm, chg: await changeProfile(P, fm) };
  const ta = opt.ta || 0, tb = opt.tb == null ? P.duration : opt.tb;
  const R = makeRenderer(P, 'burst');
  try {
    let pl = opt.pl;
    if (!pl) pl = P.zoom === 'tight' ? await tightPlan(P, fm, ta, tb, R, p => onProg && onProg(p * 0.2)) : plan(P, fm, ta, tb);
    const b = await bakeFrames(P, scale, p => onProg && onProg((P.zoom === 'tight' && !opt.pl ? 0.2 : 0) + p * (P.zoom === 'tight' && !opt.pl ? 0.8 : 1)), pl, R, opt);
    b.fm = fm; b.form = 'master'; return b;
  } finally { R.dispose(); }
}
// 线性阻力 + 恒定加速度 + 初始偏移，对一组 (t, 值) 做最小二乘：值 ≈ c0 + v·f1(t) + a·f2(t)
function fitPath1(ts, ys, k, fix0) {
  const f1 = ts.map(t => (1 - Math.exp(-k * t)) / k), f2 = ts.map((t, i) => (t - f1[i]) / k);
  const cols = fix0 ? [f1, f2] : [ts.map(() => 1), f1, f2], n = cols.length;
  const A = cols.map(ci => cols.map(cj => ci.reduce((s, v, i) => s + v * cj[i], 0))), rhs = cols.map(ci => ci.reduce((s, v, i) => s + v * ys[i], 0));
  for (let i = 0; i < n; i++) A[i][i] += 1e-9;
  // 高斯消元
  for (let i = 0; i < n; i++) { let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r; [A[i], A[p]] = [A[p], A[i]]; [rhs[i], rhs[p]] = [rhs[p], rhs[i]];
    for (let r = i + 1; r < n; r++) { const q = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= q * A[i][c]; rhs[r] -= q * rhs[i]; } }
  const x = new Array(n); for (let i = n - 1; i >= 0; i--) { let s = rhs[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
  const [c0, v, a] = fix0 ? [0, x[0], x[1]] : x;
  let e = 0; ts.forEach((t, i) => { e += (c0 + v * f1[i] + a * f2[i] - ys[i]) ** 2; });
  return { c0, v, a, e };
}
// 紧凑取景：逐帧量内容的包围盒，面片中心跟着内容走、横竖分别缩放，让每帧内容占满 90% 以上
async function tightPlan(P, fm, ta, tb, R, onProg) {
  const pl = plan({ ...P, zoom: 'on' }, fm, ta, tb), F = pl.L.F, K = Math.min(F, 40), S = [];
  const guess = Math.max(10, pl.HX * 0.6);
  for (let i = 0; i < K; i++) {
    const f = Math.min(F - 1, Math.round((i + 0.5) / K * F - 0.5)), t = pl.times[f], W = Math.max(P.shutter * pl.dur[f], 1e-4);
    const bx = gpuBounds(R, [ta + Math.max(0, t - W / 2), ta + t, ta + t + W / 2], guess, [0, 0]);
    S.push([t, bx]);
    if (i % 6 === 5) { onProg && onProg(i / K); await nextTick(); }
  }
  R.reset();
  const ts = S.map(s => s[0]), cx = S.map(s => (s[1][0] + s[1][1]) / 2), cy = S.map(s => (s[1][2] + s[1][3]) / 2), fix0 = ta === 0;
  let best = null;
  for (let i = 0; i <= 120; i++) { const k = 0.02 * Math.pow(10, i / 50); const fy = fitPath1(ts, cy, k, fix0), fxx = fitPath1(ts, cx, k, fix0), e = fy.e + fxx.e; if (!best || e < best.e) best = { k, fy, fx: fxx, e }; }
  const path = { k: best.k, x0: best.fx.c0, vx: best.fx.v, ax: best.fx.a, y0: best.fy.c0, vy: best.fy.v, ay: -best.fy.a };
  const hx = S.map(([t, bx]) => { const c = pathXY(path, t); return Math.max(c[0] - bx[0], bx[1] - c[0], 0.3); });
  const hy = S.map(([t, bx]) => { const c = pathXY(path, t); return Math.max(c[1] - bx[2], bx[3] - c[1], 0.3); });
  const HX = Math.max(...hx) * 1.01, HY = Math.max(...hy) * 1.01, D = tb - ta;
  const env = arr => {
    const sp = [[0, arr[0]], ...ts.map((t, i) => [t / D, arr[i]]), [1, arr[arr.length - 1]]];
    let ks = null;
    for (let n = 8; n <= 16; n++) { ks = envelopeKeys(sp, n); const fill = Math.min(...sp.slice(1, -1).map(([u, v]) => v / evalKeys(ks, u))); if (fill >= 0.94) break; }
    return ks;
  };
  const kx = env(hx.map(v => v / HX)), ky = env(hy.map(v => v / HY));
  const out = { ...pl, HX, HY, Ww: 2 * HX, Wh: 2 * HY, cy: 0, zoom: false, aniso: true, tight: true, sizeKeysX: kx, sizeKeysY: ky, path, px: 0.5, py: 0.5, ppm: pl.L.cellW / (2 * HX) };
  let ar = 0; for (let i = 0; i < 200; i++) { const q = sizeXY(out, (i + 0.5) / 200 * D); ar += q[0] * q[1] / 200; } out.area = ar;
  return out;
}
// 第一遍：均匀取 48 帧低分辨率烘焙，得到每秒画面变化量
async function changeProfile(P, fm) {
  const Pq = { ...P, frameMode: 'uniform', texW: 512, texH: 512, cols: 8, rows: 6, chans: 1, outMode: 'combined', cellPad: 0 };
  const pl = plan(Pq, fm), R = makeRenderer(Pq, 'burst');
  try {
    const b = await bakeFrames(Pq, 1, null, pl, R);
    const d = b.meta.frameDiffs, dt = P.duration / pl.L.F, out = [[0, (d[0] || 0) / dt]];
    d.forEach((x, i) => out.push([(i + 1.5) * dt, x / dt])); disposeBake(b); return out;
  } finally { R.dispose(); }
}
// 分段：开花段 + 下垂段，各占一张贴图
function autoSplit(P, fm) {
  if (P.segAt > 0) return clamp(P.segAt, 0.2, P.duration - 0.2);
  // 在整段的帧号曲线上找「用掉一半帧数」的时刻：两段各拿满一张贴图，帧率大致翻倍
  const pl = plan(P, fm), half = pl.L.F / 2, k = pl.keys;
  for (let i = 1; i < k.length; i++) if (k[i][1] >= half) { const [u0, v0] = k[i - 1], [u1, v1] = k[i]; return clamp((u0 + (u1 - u0) * (half - v0) / ((v1 - v0) || 1)) * P.duration, P.duration * 0.15, P.duration * 0.7); }
  return P.duration * 0.4;
}
async function bakeSegments(P, scale, onProg) {
  const fm = measure(P), ts = autoSplit(P, fm);
  const a = await bakeMaster(P, scale, p => onProg && onProg(p * 0.5), { fm, ta: 0, tb: ts, noFade: true });
  const b = await bakeMaster(P, scale, p => onProg && onProg(0.5 + p * 0.5), { fm, ta: ts, tb: P.duration, expo: [a.meta.expoH, a.meta.expoT] });
  a.next = b; a.form = 'segments'; a.meta.split = ts; return a;
}
// 包络关键帧：≤ maxN 个线性关键帧，且整条折线不低于采样值（保证内容不被裁掉）
function envelopeKeys(sp, maxN = 8) {
  const ks = simplify(sp, maxN, 0.01).map(k => [...k]);
  const idx = ks.map(k => sp.findIndex(q => q[0] === k[0] && q[1] === k[1]));
  const lift = ks.map(() => 0);
  for (let k = 0; k < ks.length - 1; k++) {
    let e = 0; const [u0, v0] = ks[k], [u1, v1] = ks[k + 1];
    for (let i = idx[k] + 1; i < idx[k + 1]; i++) { const [u, v] = sp[i]; e = Math.max(e, v - (v0 + (v1 - v0) * (u - u0) / ((u1 - u0) || 1))); }
    lift[k] = Math.max(lift[k], e); lift[k + 1] = Math.max(lift[k + 1], e);
  }
  const out = ks.map((k, i) => [+k[0].toFixed(4), +Math.min(1, (k[1] + lift[i]) * 1.015 + 0.003).toFixed(4)]);
  out[0][0] = 0; out[out.length - 1][0] = 1; return out;
}
// 单元序列：一颗代表星在自己的随体坐标里（速度朝上），星头 + 拖尾；Cascade 负责轨迹。
// 横、竖分别用 Size By Life 缩放：拖尾变短、变窄时面片跟着变小（星头在缩放中心，不会被裁掉）
async function bakeUnit(P, scale, onProg) {
  const Du = unitDuration(P);
  // 贴图里的拖尾按直线烘焙（去掉重力造成的弯曲）：面片沿速度对齐后，弯曲由 Cascade 的轨迹自己体现，
  // 否则一颗水平星的弯尾巴会让面片变得很宽，而且对向上、向下飞的星都不对
  const P2 = { ...P, _unit: true, stars: 1, speedJit: 0, burnJit: 0, duration: Du, zoom: 'off', pattern: 'sphere', waterRefl: 0, grav: 0, sparkGrav: 0, wind: 0, turb: 0 };
  const R = makeRenderer(P2, 'unit');
  try {
    const K = 20, glow = P.headSize * 1.6, guess = Math.max(8, P.v0 * P.sparkLife * 0.6 + P.sparkSpread * P.sparkLife * 2), S = [];
    for (let i = 0; i < K; i++) {
      const t = (i + 0.5) / K * Du, bx = gpuBounds(R, [t], guess, [0, -guess * 0.5]);
      S.push([t, Math.max(-bx[0], bx[1], glow), Math.max(glow, -bx[2]), Math.max(glow, bx[3])]);
      if (i % 4 === 3) { onProg && onProg(0.15 * i / K); await nextTick(); }
    }
    R.reset();
    const Wmax = Math.max(...S.map(s => s[1])), Lmax = Math.max(...S.map(s => s[2])), u0 = Math.max(...S.map(s => s[3]));
    let best = null;
    for (const k of [1, 1.5, 2, 3, 4, 6, 8]) {
      const U = u0 * k, sy = S.map(s => Math.max(s[2] / Lmax, s[3] / U)), sx = S.map(s => s[1] / Wmax);
      let a = 0; for (let i = 0; i < K; i++) a += sx[i] * sy[i]; a = a / K * (Lmax + U);
      if (!best || a < best.a) best = { a, U, sx, sy };
    }
    const env = arr => envelopeKeys([[0, arr[0]], ...S.map((s, i) => [s[0] / Du, arr[i]]), [1, arr[K - 1]]]);
    const kx = env(best.sx), ky = env(best.sy), U = best.U;
    const box = [-Wmax, Wmax, -Lmax, U], path = starPath(P, Du);
    const fm = { x0: box[0], x1: box[1], y0: box[2], y1: box[3], prof: path.map(([t, , , v]) => [t, v * (1 - P.sparkInherit) * 0.6, 0]) };
    const P3 = fitGrid(P2, box), pl = plan(P3, fm);
    Object.assign(pl, { HX: Wmax * 1.03, HY: (Lmax + U) / 2 * 1.02, cy: (U - Lmax) / 2, aniso: true, sizeKeysX: kx, sizeKeysY: ky });
    pl.Ww = 2 * pl.HX; pl.Wh = 2 * pl.HY; pl.px = 0.5; pl.py = (pl.cy + pl.HY) / pl.Wh; pl.ppm = pl.L.cellW / pl.Ww;
    let ar = 0; for (let i = 0; i < 200; i++) { const q = sizeXY(pl, (i + 0.5) / 200 * Du); ar += q[0] * q[1] / 200; } pl.area = ar;
    const b = await bakeFrames(P3, scale, p => onProg && onProg(0.15 + 0.85 * p), pl, R);
    const fit = fitLinearDrag(path.map(q => q[0]), path.map(q => q[1]), path.map(q => q[2]));
    Object.assign(b.meta, { unit: true, fit, hb: (pl.HY - pl.cy) / (2 * pl.HY), stars: P.stars });
    b.form = 'unit'; b.fm = fm; b.P = P; return b;
  } finally { R.dispose(); }
}
// 上升星头循环：弹体随体坐标里的星头 + 尾迹，周期性发射，首尾严格接上
async function bakeRiseLoop(P, scale, onProg) {
  const R = makeRenderer(P, 'riseLoop'), Tp = R.Tp;
  try {
    const times = []; for (let i = 0; i < 10; i++) times.push(i / 10 * Tp);
    const guess = Math.max(10, riseLoopInfo(P).V * P.sparkLife * 0.8);
    const box = gpuBounds(R, times, guess, [0, -guess * 0.6]);
    box[3] = Math.max(box[3], P.headSize * 2); box[2] = Math.min(box[2], -P.headSize * 2);
    const Pg = fitGrid(P, box), pl = loopPlan(Pg, box, Tp);
    const b = await bakeFrames(Pg, scale, onProg, pl, R); b.P = P;
    const ri = riseInfo(P), path = risePath(P);
    const fit = fitRise(path);
    Object.assign(b.meta, { riseLoop: true, ri, fit, V: riseLoopInfo(P).V, hb: (pl.HY - pl.cy) / (2 * pl.HY) });
    b.form = 'riseLoop'; return b;
  } finally { R.dispose(); }
}
// 竖直上升的弹道：真实（二次阻力）采样，再拟合 Cascade 的线性阻力 + 恒定加速度
function risePath(P) {
  const ri = riseInfo(P), c = G / (P.vtShell * P.vtShell), out = []; let y = 0, v = ri.v0, t = 0;
  while (t <= ri.ta + 1e-9) { out.push([t, y, v]); for (let i = 0; i < 8; i++) { v += (-G - c * v * Math.abs(v)) * H_STEP; y += v * H_STEP; t += H_STEP; } }
  return out;
}
function fitRise(path) {
  let best = null;
  for (let i = 0; i <= 240; i++) {
    const k = 0.01 * Math.pow(10, i / 80);
    // y = (v0 + g/k)(1 − e^(−kt))/k − g·t/k，对 v0 线性
    const f = path.map(([t]) => (1 - Math.exp(-k * t)) / k), h = path.map(([t]) => G / k * ((1 - Math.exp(-k * t)) / k - t));
    let sfy = 0, sff = 0; path.forEach(([, y], j) => { sfy += f[j] * (y - h[j]); sff += f[j] * f[j]; });
    const v0 = sfy / sff; let e = 0; path.forEach(([, y], j) => { e += (v0 * f[j] + h[j] - y) ** 2; });
    if (!best || e < best.e) best = { k, v0, e };
  }
  const H = path[path.length - 1][1];
  return { v0: best.v0, k: best.k, a: G, err: Math.sqrt(best.e / path.length) / Math.max(1, H), T: path[path.length - 1][0], H };
}
// 地面循环
async function bakeLoop(P, scale, onProg) {
  const R = makeRenderer(P, 'loop'), Tp = R.Tp;
  try {
    const times = []; for (let i = 0; i < 10; i++) times.push(i / 10 * Tp);
    const guess = Math.max(10, P.jetSpeed * Math.min(P.sparkLife, 1.5) + P.spacing * P.nozzles / 2 + P.groundH + P.shotSpeed * (P.type === 'fan' || P.type === 'barrage' ? 0.9 : 0));
    const box = gpuBounds(R, times, guess, [0, guess * 0.6]);
    box[2] = Math.min(box[2], 0);          // 地面在画面内
    const Pg = fitGrid(P, box), pl = loopPlan(Pg, box, Tp);
    const b = await bakeFrames(Pg, scale, onProg, pl, R); b.P = P;
    b.form = 'loop'; b.meta.ground = true; return b;
  } finally { R.dispose(); }
}
// 统一入口
function bakeKind(P) {
  const fam = familyOf(P.type);
  if (fam === 'ground') return 'loop';
  if (fam === 'rise') return P.form === 'master' ? 'master' : P.form === 'trail' ? 'trail' : 'riseLoop';
  if (P.form === 'unit' && unitAllowed(P)) return 'unit';
  if (P.form === 'segments') return 'segments';
  return 'master';
}
function unitAllowed(P) { return familyOf(P.type) === 'aerial' && !['senrin', 'crossette', 'hachi'].includes(P.type) && (P.pattern === 'sphere' || P.pattern === 'half'); }
async function bake(P, scale, onProg) {
  if (P.zoom === 'tight') P = { ...P, zoom: 'on' };   // 紧凑取景已禁用（引擎里会抖）
  P = { ...P };
  switch (bakeKind(P)) {
    case 'loop': return bakeLoop(P, scale, onProg);
    case 'riseLoop': return bakeRiseLoop(P, scale, onProg);
    case 'trail': return bakeTrail(P, scale, onProg);
    case 'unit': return bakeUnit(P, scale, onProg);
    case 'segments': return bakeSegments(P, scale, onProg);
    default: return bakeMaster(P, scale, onProg);
  }
}
// 种子变体：三个种子共用一套取景和帧号曲线（引擎里只换贴图）
async function bakeVariants(P, scale, onProg, n = 3) {
  const Ps = []; for (let i = 0; i < n; i++) Ps.push({ ...P, seed: P.seed + i * 101 });
  const fms = Ps.map(measure), fm = { ...fms[0], prof: fms[0].prof.map((q, i) => [q[0], Math.max(...fms.map(f => (f.prof[i] || q)[1])), Math.max(...fms.map(f => (f.prof[i] || q)[2]))]) };
  for (const f of fms) { fm.x0 = Math.min(fm.x0, f.x0); fm.x1 = Math.max(fm.x1, f.x1); fm.y0 = Math.min(fm.y0, f.y0); fm.y1 = Math.max(fm.y1, f.y1); }
  let pl = plan(P, fm); const out = [];
  if (P.zoom === 'tight') { const R0 = makeRenderer(Ps[0], 'burst'); try { pl = await tightPlan(Ps[0], fm, 0, P.duration, R0); } finally { R0.dispose(); }
    pl = { ...pl, HX: pl.HX * 1.06, HY: pl.HY * 1.06, Ww: pl.Ww * 1.06, Wh: pl.Wh * 1.06 }; }   // 其它种子形状略有不同：放宽 6%
  for (let i = 0; i < n; i++) {
    const b = await bakeMaster(Ps[i], scale, p => onProg && onProg((i + p) / n), { fm, pl, expo: out[0] ? [out[0].meta.expoH, out[0].meta.expoT] : null });
    out.push(b);
  }
  return out;
}
