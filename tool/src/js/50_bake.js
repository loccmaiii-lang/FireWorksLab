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
  let lastTs = -Infinity, snap = null;
  // 倒回到 ts 之前：有早于 ts 的快照就从快照接着算，否则从 0 重算（4.1.2：以前每次都从 0，越播越卡）
  const rewind = ts => {
    if (snap && snap.t < ts - 1e-9) simRestore(sim, snap); else simRestore(sim, new Sim(P));
    snap = null; lastTs = -Infinity;   // 快照交给模拟继续用（不再复制一份）；frameStart 会在新位置再存
  };
  const R = {
    sim, track, slots: track ? track.total : 0,
    xfAt() {
      const s = sim.all[0], v = Math.hypot(s.vx, s.vy) || 1;
      let ang = Math.PI / 2 - Math.atan2(s.vy / v, s.vx / v); if (P.unitFlip) ang += Math.PI;
      return [s.x, s.y, Math.cos(ang), Math.sin(ang)];
    },
    draw(ts, view, ppm, w, tw) {
      setParticleProfile(P);
      // 4.2.22 实时模拟（R.liveFwd，只有 GPU 火花内核）：只往前走，早于现在的子样本按速度回推（Sim.gatherBack），不倒回、不快照
      let nh, nt;
      if (R.liveFwd && sim.noSparks && ts < sim.t - 1e-9 && sim.t - ts < 0.35) { lastTs = Math.max(lastTs, ts); [nh, nt] = sim.gatherBack(bufH, bufT, sim.t - ts); }
      else {
        // 按「请求的时刻」判断回退：1/480 s 的物理步可能略超过请求时刻，快门子样本超过 480 Hz 时不能因此每次都从头重算（Ultra 修正）
        if (ts < lastTs - 1e-6) rewind(ts);
        lastTs = ts;
        while (sim.t < ts - 1e-9) sim.step(H_STEP);
        // 4.3（渲染基础问题 E8）：物理步是 1/480 s，走到的 sim.t 可能比子样本时刻晚最多 2 ms；GPU 火花按精确的 ts 算，星头以前按 sim.t 画，
        // 150 m/s 时和尾迹错开约 0.3 m。现在星头按速度回推到 ts（和实时模拟同一个 gatherBack）。单元序列的随体坐标按 sim.t 的星算，照旧。
        [nh, nt] = sim.noSparks && !unit && sim.t - ts > 1e-9 ? sim.gatherBack(bufH, bufT, sim.t - ts) : sim.gather(bufH, bufT);
      }
      const xf = unit ? R.xfAt() : null;
      let l = 0; for (let i = 0; i < nh; i++) l += bufH[i * 4 + 2]; for (let i = 0; i < nt; i++) l += bufT[i * 4 + 2] * 0.3;
      drawPoints(bufH, nh, view, ppm, [1, 0, 0, 0], w, xf);
      if (gpu) drawSparksGPU(track, ts, view, ppm, [0, 1, 0, 0], w, tw, { xf });
      else drawPoints(bufT, nt, view, ppm, [0, 1, 0, 0], w, xf);
      return l;
    },
    // 一帧的快门窗口从 a 开始（之后的请求都 ≥ a）：先倒回（如果需要），再走到 a 之前最后一步、存快照。
    // 下一帧窗口和这一帧重叠时，从这个快照接着算，只多算一个窗口的长度。
    frameStart(a) {
      if (a < lastTs - 1e-6) rewind(a);
      let n = 0; while (sim.t + H_STEP < a - 1e-9) { sim.step(H_STEP); n++; }
      if ((n || !snap) && sim.t < a - 1e-9) snap = sim.snapshot();
    },
    dispose() { disposeTrack(track); }
  };
  // reset 需要替换闭包里的 sim
  R.reset = () => { simRestore(sim, new Sim(P)); snap = null; lastTs = -Infinity; };
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
// 4.3（H2）：加上第二段（afterBurn，按随机的上限），以前第二段长的层导出单束会被截掉
function unitDuration(P) { return +(P.burn + (P.ignDelay || 0) + (+P.afterBurn > 0 ? +P.afterBurn * (1 + (+P.afterJit || 0) / 100) : 0) + P.sparkLife * 1.6 + 0.1).toFixed(3); }
function loopPlan(P, box, Tp) {
  const L = layoutOf(P), a = L.cellW / L.cellH;
  const W0 = 2 * Math.max(-box[0], box[1]), H0 = box[3] - box[2];
  // 横竖分开：内容正好铺满格子（像素可以不是正方形，引擎里按面片尺寸还原）
  const HX = W0 / 2 * 1.02, HY = H0 / 2 * 1.02, cy = (box[2] + box[3]) / 2;
  const times = [], dur = []; for (let f = 0; f < L.F; f++) { times.push(f * Tp / L.F); dur.push(Tp / L.F); }
  return { L, HX, HY, Ww: 2 * HX, Wh: 2 * HY, cy, ppm: L.cellW / (2 * HX), zoom: false, aniso: true, sizeKeys: [[0, 1], [1, 1]], sizeKeysX: [[0, 1], [1, 1]], sizeKeysY: [[0, 1], [1, 1]], area: 1, px: 0.5, py: (cy + HY) / (2 * HY),
    keys: [[0, 0], [1, L.F]], times, dur, avgFps: L.F / Tp, minFps: L.F / Tp, maxDisp: 0, t0: 0, duration: Tp, loop: true };
}

// 4.2.23 烘焙不挡实时模拟（对话框15；用户 10-03 18:59「笔记本上放大还是会一顿一顿」，SMOKE18：本机打开鸿巢后头 5 秒约 3 秒没画面）：
// 以前烘焙每 8 帧才让页面喘一口气（4.0 一页 64 帧时；小贴图一页只有 4 帧就一次都不让），一次往显卡里塞上亿粒
// （鸿巢锦冠层一帧 16 个子样本 × 340 万粒），显卡排着几秒的活，实时模拟那一帧只能排在后面。
// 现在一次只交「约 bakePace.ms 毫秒」的显卡活：按实测速度换算成这一帧的快门子样本数（至少 1 个），交完插一个 fence，
// 不阻塞页面地等显卡真做完再交下一批，中间页面照常画实时模拟。画进贴图的东西和顺序都不变 → 结果逐字节一样（实时负担检查 M7）。
// 子样本还嫌大（笔记本上鸿巢 1 个子样本 340 万粒）就是这一档的下限，要更细得拆火花批次，以后再说。
// 4.2.25（SMOKE19）：等显卡的那一下有固定延迟，不能拿等的时间估速度（4.2.23 因此掉到「一帧一个子样本」）。
// 4.2.26（SMOKE20：鸿巢之后打开引菊→锦、永丰之后打开片贝，等显卡 1851 / 2394 次、每次约 160 ms、超时）：4.2.25 改成按等的结果加减，
// 可是「等得久」多半是显卡在忙别的（实时模拟、上一个效果的收紧），不是这批太大——量被压到最小，又掉回一帧一个子样本。
// 现在：每批的量 = 实测显卡速度（显卡计时器，结果晚几帧到也没关系，不等它）× bakePace.ms 毫秒；没有计时器就固定 800 万粒。
// 最多 2 批在路上：第 3 批之前才等最早那批做完。等多久都不改量，只决定什么时候交下一批。画什么、按什么顺序都没变。
// 4.2.28（SMOKE21：新页面里打开引菊→锦 / 鸿巢 / 青柠 300 s 超时）：速度以前按「估计的粒数」算、而且一直带到下一次烘焙——
// 尾缀那类不按星轨道画的层粒数估成 0，算出来的速度极小，后面的烘焙就按 20 万粒一批切，每个子样本等一帧。
// 现在按真画了多少粒（PARTICLES_DRAWN）算；每页烘焙从 800 万粒重新开始量；每个子样本多少粒也按上一批实测。
const bakePace = { on: true, ms: 12, rate: 0, budget: 8e6, pending: 0, inflight: [], maxInflight: 2, maxSubs: 0, qs: [], ext: undefined, waits: 0, waitMs: 0, perSub: 0 };
function bakePaceReset() { bakePace.rate = 0; bakePace.perSub = 0; for (const x of bakePace.qs) gl.deleteQuery(x.q); bakePace.qs = []; }   // 每页烘焙重新量（别的效果、别的层的速度不算数）   // ms ≤ 0：检查用，每批之后都等
function bakeSliceBudget() { return bakePace.rate > 0 ? clamp(bakePace.rate * Math.max(1, bakePace.ms), 2e5, 4e8) : bakePace.budget; }
function bakeTimerExt() { if (bakePace.ext === undefined) bakePace.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') || null; return bakePace.ext; }
// 读回已经出结果的显卡计时（不等），更新速度（粒 / 显卡毫秒）
function bakeHarvest() {
  const ext = bakePace.ext; if (!ext || !bakePace.qs.length || gl.isContextLost()) return;
  const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
  while (bakePace.qs.length) {
    const x = bakePace.qs[0]; if (!gl.getQueryParameter(x.q, gl.QUERY_RESULT_AVAILABLE)) break;
    const ns = gl.getQueryParameter(x.q, gl.QUERY_RESULT); gl.deleteQuery(x.q); bakePace.qs.shift();
    if (!disjoint && ns > 2e4 && x.n > 0) { const r = x.n / (ns / 1e6); bakePace.rate = bakePace.rate ? bakePace.rate * 0.7 + r * 0.3 : r; }
  }
}
// 画一批，能计时就计时；按真画了多少粒记账（nEst 只在什么都没画到时兜底）；攒够一批的量就插一个 fence。返回真画的粒数
function bakeSliceDraw(fn, nEst) {
  const ext = bakePace.on ? bakeTimerExt() : null; let q = null, n = 0; const c0 = PARTICLES_DRAWN;
  if (ext && bakePace.qs.length < 8) { q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); }
  try { fn(); } finally { n = PARTICLES_DRAWN - c0 || nEst; if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); bakePace.qs.push({ q, n }); } }
  if (!bakePace.on) return n;
  bakePace.pending += n;
  if (bakePace.ms <= 0 || bakePace.pending >= bakeSliceBudget()) bakeFence();
  return n;
}
function bakeFence() { const n = bakePace.pending; bakePace.pending = 0; if (!n || gl.isContextLost()) return; const s = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); if (s) { gl.flush(); bakePace.inflight.push(s); } }
function bakeMustWait() { return bakePace.on && bakePace.inflight.length >= (bakePace.ms <= 0 ? 1 : bakePace.maxInflight); }
// 等到在路上的批少于上限（all：把攒着的也交了、全部等完，读回贴图之前用）；不阻塞页面
async function bakePaceWait(all = false) {
  if (all) bakeFence();
  const lim = all || bakePace.ms <= 0 ? 0 : bakePace.maxInflight - 1;
  while (bakePace.inflight.length > lim) {
    const s = bakePace.inflight[0], t0 = performance.now(); bakePace.waits++;
    // 状态只在回到页面以后才会变。4.2.29：两个烘焙同时在跑（打开时的默认母版 + 组合要的层、后台收紧取景）会等同一个 fence——
    // 谁先等到谁把它从队里拿掉、删掉；另一边看它已经不在队里就不再问（以前拿删掉的 fence 问状态，永远不是「完成」，一直等）
    try { do await nextTick(); while (!gl.isContextLost() && bakePace.inflight.includes(s) && gl.getSyncParameter(s, gl.SYNC_STATUS) !== gl.SIGNALED); }
    finally { const k = bakePace.inflight.indexOf(s); if (k >= 0) { bakePace.inflight.splice(k, 1); gl.deleteSync(s); } }
    bakePace.waitMs += performance.now() - t0;
  }
  bakeHarvest();
}
function bakeSliceSubs(work, left) {
  if (!bakePace.on) return left;
  if (bakePace.maxSubs > 0) return clamp(bakePace.maxSubs, 1, left);
  return clamp(Math.floor((bakeSliceBudget() - bakePace.pending) / Math.max(1, bakePace.perSub || work)), 1, left);
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
  const t0 = performance.now(); bakePaceReset();
  try {     // 4.2.16：烘到一半作废（参数又变了，进度回调抛出）时，把这三张工作贴图放掉
  for (let f = 0; f < L.F; f++) {
    const tc = pl.times[f], W = Math.max(P.shutter * pl.dur[f], 1e-4);
    const nsub = clamp(Math.ceil(W * q.hz), 1, q.maxSub);
    const [sx, sy] = sizeXY(pl, tc), c = centerAt(pl, tc), view = [c[0], c[1], pl.HX * sx, pl.HY * sy], ppm = ssW / (pl.Ww * sx);
    const ppmY = ssH / (pl.Wh * sy); PPMY = ppmY;
    sst.clear(); sst.bind(); additive(true);
    R.subW = W / nsub;   // 每个子帧覆盖的时长（尾缀的星头据此再细分，拖出连续亮线）
    {
      // 4.2.23 分批交给显卡（见上面 bakePace）：等显卡时把全局状态还给页面（PPMY = 0、不叠加），回来再接上
      const n = frameSampleCount40(P, pl, pl.t0 + tc), work = Math.max(1, trackDraws(R.track, P) + (P.stars || 0) * q.ss);
      for (let j0 = 0; j0 < n;) {
        const k = bakeSliceSubs(work, n - j0), a0 = j0;
        if (bakeMustWait()) { additive(false); PPMY = 0; await bakePaceWait(); PPMY = ppmY; sst.bind(); gl.colorMask(true, true, true, true); additive(true); }
        const drawn = bakeSliceDraw(() => drawFrameSamples40(P, pl, R, pl.t0 + tc, view, ppm, ppmY, [a0, a0 + k]), work * k); j0 += k;
        if (drawn > 0) bakePace.perSub = drawn / k;
      }
    }
    additive(false);
    hazeSamples40(P, sst, ppm);
    const ch = Math.floor(f / L.per), k = f % L.per, col = k % L.cols, row = Math.floor(k / L.cols);
    const fade = frameFade40(pl,pl.t0+tc,!!extra.noFade);
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
  } catch (e) { PPMY = 0; additive(false); gl.colorMask(true, true, true, true); fH.dispose(); fT.dispose(); sst.dispose(); throw e; }
  PPMY = 0;
  const comb = P.outMode === 'combined';
  const eH = extra.expo ? extra.expo[0] : fixedExposure(P), eT = extra.expo ? extra.expo[1] : fixedExposure(P);
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
  const sm = R.sim, drop = { heads: (sm && sm.dropH) || 0, sparks: (sm && sm.sp && sm.sp.dropped) || 0, stars: (R.track && R.track.dropStars) || 0 };
  const b = { N, NH, cw, chh, scale, head, tail, P, meta: { ...pl, noFade: !!extra.noFade, quality: q, expoH: eH, expoT: eT, sparkSlots: R.slots || 0, bakeMs, ...(drop.heads || drop.sparks || drop.stars ? { drop } : {}) } };
  await analyze(b);
  return b;
}
// 灯光曲线、暗帧、自检（过曝、边缘渗色、通道布局、近似帧、循环接缝）
// 4.2.23：先等显卡把编码做完再读回（读回不再卡住页面等显卡）；逐帧扫贴图时每用掉约 8 ms 让页面画一帧（以前 2048² 一页一口气 1–3 s）。算的东西不变
async function analyze(b) {
  const m = b.meta, L = m.L, P = b.P, N = b.N, NH = b.NH, cw = b.cw, chh = b.chh;
  await bakePaceWait(true);
  const imgs = [readRGBA8(b.head)]; if (b.tail) imgs.push(readRGBA8(b.tail));
  let tY = performance.now();
  const light = [], cellMax = [], clip = [], edge = [], sig = [], rows = [], fills = [], boxes = [], fx = [], edge12 = [];
  const measureImg = !m.loop && !m.unit;   // 与实拍视频同样的口径：亮部像素掩码 → 半径、下坠、像素数
  const SG = 16;   // 近似帧比较用的缩略网格
  for (let f = 0; f < L.F; f++) {
    if (performance.now() - tY > 8) { await nextTick(); tY = performance.now(); }
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
    const fill=cellFill(imgs, N, x0, y0, cw, chh, ch);
    fills.push(fill); if (!m.loop && !m.unit) { boxes.push(cellBox(imgs, N, x0, y0, cw, chh, ch)); fx.push(cellHist(imgs, N, x0, y0, cw, chh, ch)); edge12.push(cellEdge12(imgs, N, x0, y0, cw, chh, ch)); } cellMax.push(fill?fill[2]:mx); clip.push(nz ? nc / nz : 0); edge.push(em); sig.push(sg);
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
  // 4.3（G2）：碰边按回放检查的口径（留边以内两圈的亮度占这一帧的 ≥ 0.5%，edge12）；以前看格子最外 1 像素，留边遮罩把它压成 0，永远报「没碰边」
  let edgeFrames;
  if (edge12.length === L.F) { let k = 0; while (k < 8 && edge12.every(r => !r[1 + k])) k++; edgeFrames = edge12.map((r, i) => r[0] && (r[1 + k] + r[2 + k]) / r[0] >= FIT_RING ? i : -1).filter(i => i >= 0); }
  else edgeFrames = edge.map((e, i) => e > 8 ? i : -1).filter(i => i >= 0);
  let seam = null;
  if (m.loop && L.F > 2) { const mean = diffs.reduce((a, c) => a + c, 0) / diffs.length; seam = mean > 0 ? diff(sig[L.F - 1], sig[0]) / mean : 0; }
  if (measureImg) m.imgRows = rows;
  if (boxes.length) { m.boxes = boxes; m.fx = fx; m.edge12 = edge12; }     // 每帧内容（任何非零像素）在格子里的包围盒 [左, 右, 下, 上]（像素，y 向上）+ 亮度分布；取景实测收紧用
  // 画面占比：每帧内容包围盒 ÷ 格子（横、竖取较小者）；只统计有内容的帧，末尾全黑的除外
  const fv = fills.filter(q => q);
  if (fv.length) { const per = fv.map(q => Math.min(q[0], q[1])); m.fill = { avg: per.reduce((a, c) => a + c, 0) / per.length, min: Math.min(...per), p10: per.slice().sort((a, c) => a - c)[Math.floor(per.length * 0.1)], x: fv.reduce((a, q) => a + q[0], 0) / fv.length, y: fv.reduce((a, q) => a + q[1], 0) / fv.length, frames: fills.map(q => q ? +Math.min(q[0], q[1]).toFixed(3) : null) }; }
  Object.assign(m, { lightKeys, darkTail, frameMaxes: cellMax, check: { clipFrames, edgeFrames, chanUse, emptyMid, similar, seam, maxClip: Math.max(...clip) }, frameDiffs: diffs });
}
// 单帧内容占格子的比例（阈值 3/255，扣掉留边）
function cellFill(imgs, N, x0, y0, cw, chh, ch) {
  let a = cw, b2 = -1, c = chh, d = -1, peak=0;
  for (const im of imgs) for (let y = 0; y < chh; y++) { let o = ((y0 + y) * N + x0) * 4 + ch; for (let x = 0; x < cw; x++, o += 4) if (im[o] > 3) { peak=Math.max(peak,im[o]);if (x < a) a = x; if (x > b2) b2 = x; if (y < c) c = y; if (y > d) d = y; } }
  if (b2 < 0) return null;
  return [(b2 - a + 1) / cw, (d - c + 1) / chh,peak];
}
// 单帧的编码值分布（256 档计数）+ 非零像素数 + 最亮值：取景收紧时预估「放大后过曝多少」、认出几乎是空的帧
function cellHist(imgs, N, x0, y0, cw, chh, ch) {
  const h = new Uint32Array(256); let nz = 0, pk = 0;
  for (const im of imgs) for (let y = 0; y < chh; y++) { let o = ((y0 + y) * N + x0) * 4 + ch; for (let x = 0; x < cw; x++, o += 4) { const v = im[o]; if (v) { h[v]++; nz++; if (v > pk) pk = v; } } }
  return { h, nz, pk, px: cw * chh * imgs.length };
}
// 单帧：[总亮度, 离格子边第 0 圈的亮度, 第 1 圈, …, 第 11 圈]（第 d 圈 = 离最近的边 d 像素）。
// 回放检查的碰边口径要用：它的「留边」是所有帧都为 0 的最外圈数（最多 8），「内圈」是再往里两圈——所以内容离边不到 10 像素都可能被判碰边
function cellEdge12(imgs, N, x0, y0, cw, chh, ch) {
  const r = new Array(13).fill(0);
  for (const im of imgs) for (let y = 0; y < chh; y++) { let o = ((y0 + y) * N + x0) * 4 + ch; const dy = Math.min(y, chh - 1 - y);
    for (let x = 0; x < cw; x++, o += 4) { const v = im[o]; if (v) { r[0] += v; const d = Math.min(dy, x, cw - 1 - x); if (d < 12) r[1 + d] += v; } } }
  return r;
}
// 单帧内容的包围盒（任何非零像素都算：引擎里自发光 ×4，1–3/255 的暗火星也看得见），格子像素坐标，y 向上；没有内容 = null
function cellBox(imgs, N, x0, y0, cw, chh, ch) {
  let a = cw, b2 = -1, c = chh, d = -1;
  for (const im of imgs) for (let y = 0; y < chh; y++) { let o = ((y0 + y) * N + x0) * 4 + ch; for (let x = 0; x < cw; x++, o += 4) if (im[o] > 0) { if (x < a) a = x; if (x > b2) b2 = x; if (y < c) c = y; if (y > d) d = y; } }
  return b2 < 0 ? null : [a, b2, c, d];
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
function disposeBake(b) { if (b) { b.head.dispose(); b.tail && b.tail.dispose(); disposeTrail(b); if (b.next) disposeBake(b.next); if(b.mobile)disposeBake(b.mobile); } }

// 4.2.5 取景按实测收紧（用户 2026-10-03 00:25「贴图输出很多都不够极限，画面占比还不够」）：
// 按烘好的贴图量每帧内容的范围（任何非零像素），能收紧 3% 以上就按收紧后的取景再烘一次（时间、帧数都不变）；收不紧返回 null。
// 预览先按估计的取景烘（快），停手后在后台收紧（70_ui.js runRefine）；导出、标准检查一律用收紧后的（bakeFinal）。
async function refineBake(b, onProg) {
  if (!b || !b.meta || !b.meta.plan || b.meta.fitted || !b.srcP || b.srcP.fitFrame === 0) return null;
  const fp = fitPlan40(b.srcP, b.meta.plan, bakeParts(b));
  if (!fp) {
    // 收不紧：看是不是烘出来就碰边了，碰了就放大取景重烘（growPlan40，最多两次）
    let gp = growPlan40(b.srcP, b.meta.plan, bakeParts(b)), nb = null;
    while (gp) {
      const next = await bakeMaster(b.srcP, b.scale || 1, p => onProg && onProg(p), { fm: b.fm, pl: gp });
      if (nb) disposeBake(nb); nb = next;
      gp = growPlan40(b.srcP, gp, bakeParts(nb));
    }
    if (nb) { bakeParts(nb).forEach(s => { s.meta.fitted = s.meta.fitted || { mode: 'grow' }; }); onProg && onProg(1); return nb; }
    b.meta.fitted = { mode: 'none' }; return null;
  }
  let nb = await bakeMaster(b.srcP, b.scale || 1, p => onProg && onProg(p * .6), { fm: b.fm, pl: fp });
  const near = fitTouches40(b.srcP, bakeParts(b), bakeParts(nb));
  if (!near.length) { onProg && onProg(1); return nb; }
  // 4.2.8 / 4.2.11：收紧后回放检查会判碰边的帧（收紧前没有）→ 把收紧后看到的范围并进来、离边至少留 12 像素（回放检查的「留边 + 内圈」最多到第 10 圈），重算一次；还碰就不收紧
  const fp2 = fitPlan40(b.srcP, b.meta.plan, bakeParts(b), bakeParts(nb), { edgePx: 12 }); disposeBake(nb); nb = null;
  if (fp2) {
    nb = await bakeMaster(b.srcP, b.scale || 1, p => onProg && onProg(.6 + p * .4), { fm: b.fm, pl: fp2 });
    if (fitTouches40(b.srcP, bakeParts(b), bakeParts(nb)).length) { disposeBake(nb); nb = null; }
  }
  if (!nb) { b.meta.fitted = { mode: 'none', why: `收紧后 ${near.length} 帧碰内圈` }; return null; }
  bakeParts(nb).forEach(s => { if (s.meta.fitted) s.meta.fitted = { ...s.meta.fitted, retry: near.length }; });
  return nb;
}
async function bakeFinal(P, scale, onProg) {
  const b = await bake(P, scale, p => onProg && onProg(p * .55));
  let nb = null; try { nb = await refineBake(b, p => onProg && onProg(.55 + p * .45)); } catch (e) { disposeBake(b); throw e; }
  if (nb) { disposeBake(b); return nb; }
  onProg && onProg(1); return b;
}
// 大面片母版（可只取 [ta, tb] 一段）
async function bakeMaster(P, scale, onProg, opt = {}) {
  let fm = opt.fm || measure(P);
  const ta = opt.ta || 0, tb = opt.tb == null ? P.duration : opt.tb;
  const R = makeRenderer(P, 'burst');let first=null,last=null;
  try {
    let pl = opt.pl;
    // 入点 / 出点（4.0）：用户选的范围优先于自动裁空白
    const cutIn = usesTickPlan40(P) && +P.cutIn > 0 ? Math.min(+P.cutIn, P.duration - 1 / 30) : 0, cutOut = usesTickPlan40(P) && +P.cutOut > cutIn ? Math.min(+P.cutOut, P.duration) : 0;
    if (!pl) pl = plan(P, fm, cutIn || ta, cutOut || tb);
    if(pl.frameTiming==='tick-start'){
      const bakePlan=async(active,start=0,span=1)=>{
        const pages=splitPlan40(active);
        for(let i=0;i<pages.length;i++){
          // 每张贴图按这一张自己的格子开（「按帧数」时最后一张可以更小）
          const Lp=pages[i].L,bakeP={...P,cols:Lp.cols,rows:Lp.rows,texW:Math.round(Lp.cols*Lp.cellW),texH:Math.round(Lp.rows*Lp.cellH)};
          const part=await bakeFrames(bakeP,scale,p=>onProg&&onProg(start+span*(i+p)/pages.length),pages[i],R,opt);
          part.fm=fm;part.form=P.form==='segments'?'segments':'master';
          if(last)last.next=part;else first=part;last=part;
        }
      };
      await bakePlan(pl,0,opt.pl?1:.75);
      // 真实编码贴图决定可见性，头和尾合看；裁后重新打包，不能留下不播放的占位帧。
      // 重新分帧后最后一帧可能又落到全黑处：最多裁 3 轮
      for(let pass=0;pass<3&&!opt.pl;pass++){
        const maxima=bakeParts(first).flatMap(s=>s.meta.frameMaxes||[]);
        if(maxima.length!==pl.L.F)break;
        {
          // 只裁真正全黑的帧（最亮像素 ≤ 1/255）：引擎里自发光 ×4，3/255 的暗火星在夜空里仍看得见，不能当空帧裁掉
          // （4.0 曾按 10/255 裁，金芒菊 4.56 s 被裁成 3.67 s，末尾的暗火星没了——用户 2026-10-01 指出）
          const lit=v=>v>=2,a=maxima.findIndex(lit),z=maxima.findLastIndex(lit);
          if(a<0)throw new Error('当前配方没有达到可见亮度的帧，请调整亮度或曝光。');
          const from=P.trimLead===0||cutIn?0:a,to=P.trimTail===0||cutOut?pl.L.F:z+1;
          if(from>0||to<pl.L.F){
            const T=f=>f<pl.L.F?pl.times[f]:pl.duration;   // 帧可能停好几个 tick：按帧的实际起点换算时间
            const trimmed=plan(P,fm,pl.t0+T(from),pl.t0+T(to));
            disposeBake(first);first=last=null;
            await bakePlan(trimmed,.75,.25);
            pl=trimmed;
          } else break;
        }
      }
      onProg&&onProg(1);
      first.meta.plan=pl;first.srcP=P;     // 取景实测收紧（refineBake）用：整段计划 + 烘的参数
      if(cutIn&&+P.preRoll!==0&&!first.meta.zoom)first.meta.pre=preRollOf(P,fm,first.meta.t0);
      first.meta.cut={in:cutIn,out:cutOut};
      // 整段可见范围（时段条的淡色底）：没设入出点 = 这次自动裁出来的；设了 = 设入点时记下的范围
      first.meta.vis=cutIn||cutOut?[+P.preFrom>=0?Math.min(+P.preFrom,first.meta.t0):first.meta.t0,Math.max(bakeTotal(first),+P.visTo||0)]:[first.meta.t0,bakeTotal(first)];
      return first;
    }
    const b = await bakeFrames(P, scale, p => onProg && onProg(p), pl, R, opt);
    b.fm = fm; b.form = 'master'; return b;
  } catch(e){if(first)disposeBake(first);throw e;} finally { R.dispose(); }
}
// 第一遍：均匀取 48 帧低分辨率烘焙，得到每秒画面变化量
// 分段母版：按实际帧数分配贴图（帧计划自动分页，3.7 的「开花段 + 下垂段两张」去掉了）
async function bakeSegments(P, scale, onProg) { return bakeMasterLead(P, scale, onProg); }
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
  if (fam === 'rise') return P.form === 'master' ? 'master' : P.form === 'trail' ? 'trail' : P.form === 'emitset' ? 'emitset' : 'riseLoop';
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
    case 'emitset': return bakeEmitSet(P, scale, onProg);
    case 'unit': return bakeUnit(P, scale, onProg);
    case 'segments': return bakeSegments(P, scale, onProg);
    default: return bakeMasterLead(P, scale, onProg);
  }
}
// 开头空白裁掉：星头要过一段时间才亮的层（延时点火、同轨迹的第二段、千轮 / 小割的子花）不把前面的空白烘进贴图，
// 贴图从第一次看得见的时刻开始（meta.t0），引擎里用发射器延迟（cascade.json 的 delay_s）补上。trimLead = 0 关。
// 入点前放大（用户选 B）：引擎里从「第一次看得见」到入点这段，用入点那一帧按花径比例从小放大。
// 比例 = 这一刻的花径 ÷ 入点时的花径；preScale0 > 0 时按它重新拉伸。
function preRollOf(P, fm, t0) {
  const from = +P.preFrom >= 0 && +P.preFrom < t0 - 1 / 30 ? +P.preFrom : Math.min(+P.flash > 0 ? 0 : leadOf(fm), Math.max(0, t0 - 1 / 30));
  if (t0 - from < 1 / 30) return null;
  // 花径用「看得见的星」离爆点距离的 95 分位（measure 的 stat.r95）：不含开花闪光和火花的保守外扩，开头才真的小
  const st = fm.stat.map(q => [q.t, q.r95]);
  const rAt = t => { let i = st.findIndex(q => q[0] >= t); if (i < 0) return st[st.length - 1][1]; if (i === 0) return st[0][1];
    const [ta, ra] = st[i - 1], [tb, rb] = st[i]; return ra + (rb - ra) * (t - ta) / Math.max(1e-6, tb - ta); };
  const rIn = Math.max(1e-3, rAt(t0)), r0 = rAt(from), s0 = +P.preScale0 > 0 ? +P.preScale0 : clamp(r0 / rIn, 0.02, 1);
  const keys = []; for (let i = 0; i <= 8; i++) { const u = i / 8, t = from + u * (t0 - from), raw = clamp(rAt(t) / rIn, 0, 1);
    const v = +P.preScale0 > 0 ? s0 + (1 - s0) * clamp((rAt(t) - r0) / Math.max(1e-6, rIn - r0), 0, 1) : Math.max(s0, raw); keys.push([u, +Math.min(1, v).toFixed(4)]); }
  keys[keys.length - 1][1] = 1;
  return { from, dur: t0 - from, keys, s0, pivot: +P.prePivot === 1 ? 1 : 0 };
}
function leadOf(fm) { const q = fm.stat.find(x => x.vis > 0); return q ? Math.max(0, q.t - 0.05) : 0; }
async function bakeMasterLead(P, scale, onProg) {
  // 首尾裁剪在真实编码贴图上判断（bakeMaster 里按 frameMaxes 裁全黑帧），不凭星头未亮就删掉闪光和可见尾火
  return bakeMaster(P, scale, onProg, { fm: measure(P) });
}
// 种子变体：三个种子共用一套取景和帧号曲线（引擎里只换贴图）
async function bakeVariants(P, scale, onProg, n = 3) {
  const Ps = []; for (let i = 0; i < n; i++) Ps.push({ ...P, seed: P.seed + i * 101 });
  const fms = Ps.map(measure), fm = { ...fms[0], prof: fms[0].prof.map((q, i) => [q[0], Math.max(...fms.map(f => (f.prof[i] || q)[1])), Math.max(...fms.map(f => (f.prof[i] || q)[2]))]) };
  for (const f of fms) { fm.x0 = Math.min(fm.x0, f.x0); fm.x1 = Math.max(fm.x1, f.x1); fm.y0 = Math.min(fm.y0, f.y0); fm.y1 = Math.max(fm.y1, f.y1); }
  const pl = plan(P, fm), out = [];
  for (let i = 0; i < n; i++) {
    const b = await bakeMaster(Ps[i], scale, p => onProg && onProg((i + p) / n), { fm, pl, expo: out[0] ? [out[0].meta.expoH, out[0].meta.expoT] : null });
    out.push(b);
  }
  return out;
}
