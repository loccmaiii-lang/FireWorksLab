// 预跑一遍：求整个序列的可见范围（定取景）和星体速度随时间的变化（定取帧），顺带记录测量指标
// 尾迹粗细 / 梭形（4.2.8）：tailWidth 粗细倍数、tailPinchHead / tailPinchTail 两头收尖、tailBellyAt 最粗处；on = 不是默认值（默认时着色器不进分支，结果逐像素不变）
function tailShapeOf(P) {
  const w = clamp(+P.tailWidth || 1, 0.3, 3), h = clamp(+P.tailPinchHead || 0, 0, 1), t = clamp(+P.tailPinchTail || 0, 0, 1), m = clamp(+P.tailBellyAt || 0.45, 0.05, 0.95);
  return { w, h, t, m, on: w !== 1 || h > 0 || t > 0 };
}
// 4.2.21 同一份参数的预跑只算一次（用户 10-03 17:28「一顿一顿」，SMOKE16：打开鸿巢 / 片贝时主线程停几秒）：
// 实时模拟的取景、镜头、范围，烘焙，收紧以前各自从头跑一遍整段模拟（片贝千轮层一次 3.5 s）。结果只和参数有关，按参数内容缓存最近 12 份，
// 每次给一份拷贝（调用方改了也不会污染缓存）。
const MEASURE_CACHE = new Map();
function measure(P) {
  let key = null; try { key = JSON.stringify(P); } catch (e) { }
  const c = key && MEASURE_CACHE.get(key);
  if (c) { MEASURE_CACHE.delete(key); MEASURE_CACHE.set(key, c); return structuredClone(c); }
  const r = measureRun(P);
  if (key) { MEASURE_CACHE.set(key, structuredClone(r)); while (MEASURE_CACHE.size > 12) MEASURE_CACHE.delete(MEASURE_CACHE.keys().next().value); }
  return r;
}
function measureRun(P) {
  const s = new Sim(P), n = Math.ceil(P.duration / H_STEP);
  let x0 = -5, x1 = 5, y0 = -5, y1 = 5; const prof = [], stat = [], vs = [], ds = [];
  const ext = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
  for (let i = 0; i < n; i++) {
    s.step(H_STEP);
    if (i % 6) continue;
    vs.length = 0; ds.length = 0; let sy = 0, vis = 0; const ys = [];
    for (const st of s.stars) if (st.alive) {
      ext(st.x, st.y); vs.push(Math.hypot(st.vx, st.vy));
      if (s.headI(st) > 0) { const d = Math.hypot(st.x, st.y); ds.push(d); sy += st.y; vis++; ys.push(st.y); }
    }
    for (const f of s.flashes) { const a = s.t - f.t0; if (a >= 0 && a < (f.cut || 0.25)) ext(f.x + Math.sign(f.x) * f.sig * 2, f.y + Math.sign(f.y) * f.sig * 2); }
    const sp = s.sp;
    for (let j = 0; j < sp.n; j += 2) {
      if (sp.T0[j] * (1 - P.cooling * sp.age[j] / sp.life[j]) < 1050) continue;
      ext(sp.p[j * 3], sp.p[j * 3 + 1]);
    }
    let v = 0; if (vs.length) { vs.sort((a, b) => a - b); v = vs[Math.floor(vs.length * 0.9)]; }
    let r = 0;
    for (const st of s.stars) if (st.alive) r = Math.max(r, Math.hypot(st.x, st.y));
    for (const f of s.flashes) { const a = s.t - f.t0; if (a >= 0 && a < (f.cut || 0.25)) r = Math.max(r, Math.hypot(f.x, f.y) + f.sig * 3); }
    for (let j = 0; j < sp.n; j += 2) {
      if (sp.T0[j] * (1 - P.cooling * sp.age[j] / sp.life[j]) < 1050) continue;
      r = Math.max(r, Math.hypot(sp.p[j * 3], sp.p[j * 3 + 1]));
    }
    if (s.t < 0.25 && s.fam === 'aerial') r = Math.max(r, 3 * Math.max(2, P.v0 * 0.045));
    prof.push([s.t, v, r]);
    ds.sort((a, b) => a - b); ys.sort((a, b) => a - b);
    stat.push({ t: s.t, r95: ds.length ? ds[Math.floor(ds.length * 0.95)] : 0, cy: vis ? sy / vis : 0, top: vis ? ys[Math.floor(ys.length * 0.97)] : 0, bot: vis ? ys[Math.floor(ys.length * 0.03)] : 0, vis });
  }
  if (P.engine === 'gpu') {
    // 火花不在 CPU 上模拟：按散布、下坠和气流的解析解估计火花超出星体的范围（偏保守）
    const L = P.sparkLife * 1.6, k = Math.max(P.sparkDrag, 1e-3), g = G * P.sparkGrav;
    const drift = (L - (1 - Math.exp(-k * L)) / k);
    const drop = g / k * drift, spread = P.sparkSpread * L * 0.7 * Math.max(1, tailShapeOf(P).w) + 1 + (P.branch > 0 ? 4 : 0), air = (Math.abs(P.wind) + P.turb) * drift;
    x0 -= spread + air; x1 += spread + air; y1 += spread + P.turb * drift; y0 -= drop + spread + P.turb * drift;
    for (const q of prof) q[2] += spread + drop + air;
  }
  if (P.waterRefl > 0) { y0 = Math.min(y0, -y1 * 1.05 - 2); for (const q of prof) q[2] *= 1.05; }
  return { x0, x1, y0, y1, prof, stat, events: s.events };
}
// 与实拍可比的无量纲指标：t50 / t80 = 花径到最终值 50% / 80% 的时刻占燃烧的比例，下坠/半径，下/上半径之比
function metricsOf(P, fm) {
  const st = fm.stat.filter(q => q.vis > 0); if (st.length < 4) return null;
  // 燃烧结束 = 可见星数降到峰值一半的时刻（与实拍测量的口径一致，避开最后几颗离群星）
  const peakVis = Math.max(...st.map(q => q.vis)); let end = st[0];
  for (const q of st) if (q.vis >= 0.5 * peakVis) end = q;
  const burnEnd = end.t, Rf = end.r95 || 1;
  const find = f => { for (const q of st) if (q.r95 >= f * Rf) return q.t / burnEnd; return 1; };
  const peak = st.reduce((a, q) => q.vis > a.vis ? q : a, st[0]);
  const top = Math.max(0.03 * Rf, end.top), bot = Math.max(0.03 * Rf, -end.bot);
  const pk = st.indexOf(peak), after = th => { for (let i = pk; i < st.length; i++) if (st[i].vis < th * peakVis) return st[i].t; return st[st.length - 1].t; };
  return { burn: burnEnd, diameter: 2 * Rf, t50: find(0.5), t80: find(0.8), t90: find(0.9), droop: -end.cy / Rf, bt: bot / top, peakT: peak.t, kieguchi: (after(0.2) - after(0.8)) / burnEnd };
}
// 折线化简（Douglas–Peucker 的插点版）：保留误差最大的点，直到点数用完或误差足够小
function simplify(pts, maxN, tol = 0.25) {
  const keep = new Set([0, pts.length - 1]);
  while (keep.size < maxN) {
    const idx = [...keep].sort((a, b) => a - b); let best = -1, bestE = tol;
    for (let k = 0; k < idx.length - 1; k++) {
      const a = idx[k], b = idx[k + 1], [ua, va] = pts[a], [ub, vb] = pts[b];
      for (let i = a + 1; i < b; i++) {
        const [u, v] = pts[i], e = Math.abs(v - (va + (vb - va) * (u - ua) / ((ub - ua) || 1)));
        if (e > bestE) { bestE = e; best = i; }
      }
    }
    if (best < 0) break; keep.add(best);
  }
  return [...keep].sort((a, b) => a - b).map(i => pts[i]);
}
function evalKeys(keys, u) {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u <= keys[i][0]) { const [u0, v0] = keys[i - 1], [u1, v1] = keys[i]; return v0 + (v1 - v0) * (u - u0) / ((u1 - u0) || 1); }
  return keys[keys.length - 1][1];
}
function layoutOf(P) { const per = P.cols * P.rows; return { cols: P.cols, rows: P.rows, chans: P.chans, per, F: per * P.chans, cellW: P.texW / P.cols, cellH: P.texH / P.rows }; }
// 取景 + 取帧计划：帧号曲线（≤8 个关键帧）就是引擎里 Dynamic Parameter 第三通道要填的曲线，
// 每一帧的烘焙时刻取「曲线值 = 帧号 + 0.5」的时刻，引擎取整后正好显示这一帧
// a、b：分段烘焙时只取 [a, b] 这一段（长时母版分成开花段与下垂段）
function plan(P, fm0, ta = 0, tb = P.duration) {
  return usesTickPlan40(P)
    ? plan40(P,fm0,ta,tb) : planLegacy(P,fm0,ta,tb);
}
function planLegacy(P, fm0, ta = 0, tb = P.duration) {
  const win = ta > 0 || tb < P.duration - 1e-9;
  const fm = win ? { ...fm0, prof: fm0.prof.filter(q => q[0] >= ta - 1e-9 && q[0] <= tb + 1e-9).map(q => [q[0] - ta, q[1], q[2]]) } : fm0;
  const L = layoutOf(P), a = L.cellW / L.cellH, D = tb - ta, STEP = 1.5, zoom = P.zoom === 'on';
  let HX, HY, cy, sizeKeys = [[0, 1], [1, 1]];
  if (zoom) {
    // 以爆点为中心取景，面片按 Size By Life 曲线随开花放大
    let R = 1; for (const q of fm.prof) if (q[0] <= D) R = Math.max(R, q[2]);
    R = R * 1.06 + 3; HX = R * Math.max(1, a); HY = HX / a; cy = 0;
    let run = 0; const sp = [];
    for (const [t, , r] of fm.prof) { if (t > D) break; run = Math.max(run, Math.min(1, (r * 1.06 + 3) / R)); sp.push([t / D, run]); }
    sp.unshift([0, sp.length ? sp[0][1] : 1]); sp.push([1, run || 1]);
    const ks = simplify(sp, 8, 0.01).map(k => [...k]);
    // 关键帧之间是直线：把直线抬到不低于真实半径，保证内容不被裁掉
    const idx = ks.map(k => sp.findIndex(q => q[0] === k[0] && q[1] === k[1]));
    for (let k = 0; k < ks.length - 1; k++) {
      let e = 0; const [u0, v0] = ks[k], [u1, v1] = ks[k + 1];
      for (let i = idx[k] + 1; i < idx[k + 1]; i++) { const [u, v] = sp[i]; e = Math.max(e, v - (v0 + (v1 - v0) * (u - u0) / ((u1 - u0) || 1))); }
      ks[k].push(e); ks[k + 1].push(e);
    }
    sizeKeys = ks.map(k => [+k[0].toFixed(4), +Math.min(1, k[1] + Math.max(0, ...k.slice(2)) + 0.02).toFixed(3)]);
    sizeKeys[0][0] = 0; sizeKeys[sizeKeys.length - 1][0] = 1;
  } else {
    const W0 = 2 * Math.max(-fm.x0, fm.x1), H0 = fm.y1 - fm.y0;
    HX = (Math.max(W0, H0 * a) * 1.06 + 3) / 2; HY = HX / a; cy = (fm.y0 + fm.y1) / 2;
  }
  const Ww = 2 * HX, Wh = 2 * HY, sAt = t => evalKeys(sizeKeys, t / D);
  const ppmAt = t => L.cellW / (Ww * sAt(t)), ppm = L.cellW / Ww;
  // 按画面变化取帧：第一遍低分辨率烘焙得到每秒画面变化量，变化小的时段少给帧（等于把近似帧合并）
  let chgAt = null, C = 0;
  if (P.frameMode === 'content' && fm0.chg && fm0.chg.length > 2) {
    const ch = fm0.chg.map(([t, r]) => [t - ta, r]);
    chgAt = t => { let i = 0; while (i < ch.length - 1 && ch[i + 1][0] < t) i++; return ch[i][1]; };
    let sv = 0, sc = 0; for (const [t, v] of fm.prof) { if (t > D) break; sv += v * ppmAt(t) / STEP; sc += chgAt(t); }
    C = sc > 0 ? sv / sc : 0;
  }
  const dens = (v, t) => P.frameMode === 'uniform' ? 1 : chgAt ? Math.max(0.35 * v * ppmAt(t) / STEP + chgAt(t) * C, P.fpsFloor) : Math.max(v * ppmAt(t) / STEP, P.fpsFloor);
  const pts = [[0, 0]]; let acc = 0, prevT = 0;
  for (const [t, v] of fm.prof) { if (t > D) break; acc += dens(v, t) * (t - prevT); prevT = t; pts.push([t, acc]); }
  if (prevT < D) { acc += dens(0, D) * (D - prevT); pts.push([D, acc]); }
  const poly = pts.map(([t, c]) => [t / D, L.F * c / acc]);
  const keys = simplify(poly, 8).map(([u, v]) => [+u.toFixed(4), +v.toFixed(2)]);
  keys[0] = [0, 0]; keys[keys.length - 1] = [1, L.F];
  const inv = v => {
    for (let i = 1; i < keys.length; i++) if (keys[i][1] >= v) { const [u0, v0] = keys[i - 1], [u1, v1] = keys[i]; return D * (u0 + (u1 - u0) * (v1 > v0 ? (v - v0) / (v1 - v0) : 0)); }
    return D;
  };
  const vAt = t => { const pr = fm.prof; if (!pr.length) return 0; let i = Math.min(pr.length - 1, Math.max(0, Math.round(t / (pr[pr.length - 1][0] / pr.length)))); return pr[i][1]; };
  const times = [], dur = []; let maxDur = 0, maxDisp = 0;
  for (let f = 0; f < L.F; f++) {
    const t0 = inv(f), t1 = inv(f + 1), tc = inv(f + 0.5);
    times.push(tc); dur.push(t1 - t0);
    maxDur = Math.max(maxDur, t1 - t0); maxDisp = Math.max(maxDisp, vAt(tc) * ppmAt(tc) * (t1 - t0));
  }
  let area = 0; for (let i = 0; i < 200; i++) { const q = sAt((i + 0.5) / 200 * D); area += q * q / 200; }
  return { L, HX, HY, Ww, Wh, cy, ppm, zoom, sizeKeys, area, px: 0.5, py: (cy + HY) / Wh, keys, times, dur, avgFps: L.F / D, minFps: 1 / maxDur, maxDisp, t0: ta, duration: D };
}
