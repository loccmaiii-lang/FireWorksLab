// 预跑一遍：求整个序列的可见范围（定取景）和星体速度随时间的变化（定取帧），顺带记录测量指标
// 尾迹粗细 / 梭形（4.2.8）：tailWidth 粗细倍数、tailPinchHead / tailPinchTail 两头收尖、tailBellyAt 最粗处；on = 不是默认值（默认时着色器不进分支，结果逐像素不变）
function tailShapeOf(P) {
  const w = clamp(+P.tailWidth || 1, 0.05, 10),     /* 4.9.50 硬上限 0.3–3 → 0.05–10（用户 10-08「很多参数都是有上限的」） */ h = clamp(+P.tailPinchHead || 0, 0, 1), t = clamp(+P.tailPinchTail || 0, 0, 1), m = clamp(+P.tailBellyAt || 0.45, 0.05, 0.95);
  return { w, h, t, m, on: w !== 1 || h > 0 || t > 0 };
}
// 4.2.21 同一份参数的预跑只算一次（用户 10-03 17:28「一顿一顿」，SMOKE16：打开鸿巢 / 片贝时主线程停几秒）：
// 实时模拟的取景、镜头、范围，烘焙，收紧以前各自从头跑一遍整段模拟（片贝千轮层一次 3.5 s）。结果只和参数有关，按参数内容缓存最近 12 份，
// 每次给一份拷贝（调用方改了也不会污染缓存）。
const MEASURE_CACHE = new Map();
function measure(P) {
  P = fxP(P);     // 4.9.21 效果 › 整体调整（全是 1 时原样）
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
  // 4.9.81 带锚点的 Zoom：每个时刻（和 prof 同一批）可见内容相对爆点的范围 [t, x0, x1, y0, y1]（含爆点本身），取景按上 / 下 / 左右分别算放大倍数
  const box = []; let bx0 = 0, bx1 = 0, by0 = 0, by1 = 0;
  // 4.3（渲染基础问题 H9）：点灭从哪一刻开始 = 每颗星「点火（或第二段）+ 点灭开始 × 燃烧」里最早的那颗（和 Sim.headI 同一个口径），帧计划按它提高帧率
  let strobeOn = Infinity; const strobing = +P.strobeHz > 0;
  const ext = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; };
  for (let i = 0; i < n; i++) {
    s.step(H_STEP);
    if (i % 6) continue;
    vs.length = 0; ds.length = 0; let sy = 0, vis = 0; const ys = []; bx0 = bx1 = by0 = by1 = 0;
    for (const st of s.stars) if (st.alive) {
      if (strobing && !st.dark && st.kind !== 1 && st.kind !== 5) { const off = st.st1 != null ? st.st1 : st.ign, end = st.vis != null ? st.vis : st.burn, on = (st.birth || 0) + off + P.strobeStart * Math.max(0.05, end - off); if (on < strobeOn) strobeOn = on; }
      ext(st.x, st.y); vs.push(Math.hypot(st.vx, st.vy));
      if (s.headI(st) > 0) { const d = Math.hypot(st.x, st.y); ds.push(d); sy += st.y; vis++; ys.push(st.y); }
    }
    for (const f of s.flashes) { const a = s.t - f.t0; if (a >= 0 && a < (f.cut || 0.25)) ext(f.x + Math.sign(f.x) * f.sig * 2, f.y + Math.sign(f.y) * f.sig * 2); }
    for (const q of s.exDots || []) { const a = s.t - q.t0; if (a >= 0 && a < q.life) { const [x, y] = s.exPos(q, a); ext(x + Math.sign(x) * q.size, y + Math.sign(y) * q.size); } }     // 4.6.0 自定义发射器的光点
    const sp = s.sp;
    for (let j = 0; j < sp.n; j += 2) {
      if (sp.T0[j] * (1 - P.cooling * sp.age[j] / sp.life[j]) < 1050) continue;
      ext(sp.p[j * 3], sp.p[j * 3 + 1]);
    }
    let v = 0; if (vs.length) { vs.sort((a, b) => a - b); v = vs[Math.floor(vs.length * 0.9)]; }
    let r = 0;
    for (const st of s.stars) if (st.alive) r = Math.max(r, Math.hypot(st.x, st.y));
    for (const f of s.flashes) { const a = s.t - f.t0; if (a >= 0 && a < (f.cut || 0.25)) r = Math.max(r, Math.hypot(f.x, f.y) + f.sig * 3); }
    for (const q of s.exDots || []) { const a = s.t - q.t0; if (a >= 0 && a < q.life) { const [x, y] = s.exPos(q, a); r = Math.max(r, Math.hypot(x, y) + q.size); } }
    for (let j = 0; j < sp.n; j += 2) {
      if (sp.T0[j] * (1 - P.cooling * sp.age[j] / sp.life[j]) < 1050) continue;
      r = Math.max(r, Math.hypot(sp.p[j * 3], sp.p[j * 3 + 1]));
    }
    if (s.t < 0.25 && s.fam === 'aerial') r = Math.max(r, 3 * (+P.flashR > 0 ? +P.flashR : Math.max(2, P.v0 * 0.045)) * (+P.flashSize > 0 ? +P.flashSize : 1));
    prof.push([s.t, v, r]); box.push([s.t, bx0, bx1, by0, by1]);
    ds.sort((a, b) => a - b); ys.sort((a, b) => a - b);
    stat.push({ t: s.t, r95: ds.length ? ds[Math.floor(ds.length * 0.95)] : 0, cy: vis ? sy / vis : 0, top: vis ? ys[Math.floor(ys.length * 0.97)] : 0, bot: vis ? ys[Math.floor(ys.length * 0.03)] : 0, vis });
  }
  if (P.engine === 'gpu') {
    // 火花不在 CPU 上模拟：按散布、下坠和气流的解析解估计火花超出星体的范围（偏保守）
    // 4.3（渲染基础问题 E7 / H11）：余烬比火花活得久（锦冠木炭余烬 3 s 左右），下坠和随风漂移按余烬的寿命算；
    // 余烬在母星烧完后 emberFollow 秒内、或 emberEnd 时刻淡掉，就按那个截。横向散开被阻力很快刹住，仍按火花寿命算。没有余烬时和以前完全一样。
    const L = P.sparkLife * 1.6, g = G * P.sparkGrav;
    let k = Math.max(P.sparkDrag, 1e-3);
    // 4.9.71 火花平方阻力：下落最快到终端速度 × √下坠倍数，按这个速度折成线性阻力估下坠 / 被风带走的距离（缺省 0 不进来）
    if (sparkCqOf(P) > 0) k = Math.max(k, Math.sqrt(Math.max(0, g) * sparkCqOf(P)));     // 下落极限 √(g / c) → 折成线性阻力 g / 极限 = √(g·c)
    let Le = L;
    if (+P.emberFrac > 0 && !(+P.branch > 0)) {
      let e = (+P.emberLife || 3) * Math.exp(0.3) * 0.85;
      if (+P.emberFollow > 0) e = Math.min(e, (+P.burn || 0) * (1 + 2 * (+P.burnJit || 0) / 100) + (+P.afterBurn || 0) + +P.emberFollow + 0.15);
      if (+P.emberEnd > 0) e = Math.min(e, +P.emberEnd + 0.3);
      Le = Math.max(L, e);
    }
    const drift = (Le - (1 - Math.exp(-k * Le)) / k);
    let spread = P.sparkSpread * L * 0.7 * Math.max(1, tailShapeOf(P).w) + 1 + (P.branch > 0 ? 4 : 0);
    // 火花发射器补全（对话框FanGold）：起始半径（+ 跟星头：按星头大小随机 +2σ 估）、向后喷走得最远的距离也算进取景；缺省都是 0、不进来
    if (familyOf(P.type) === 'aerial' && (+P.sparkSpawnR > 0 || +P.sparkSpawnHead > 0 || +P.sparkJet > 0))
      spread += Math.max(0, +P.sparkSpawnR || 0) + Math.max(0, +P.sparkSpawnHead || 0) * (+P.headSize || 0) / 2 * Math.exp(1.2 * Math.max(0, +P.headSizeJit || 0)) + Math.max(0, +P.sparkJet || 0) * (1 - Math.exp(-k * L)) / k;
    // 只在燃尽以后给相应时刻加气流余量；不能为了末段风把未燃尽的前段取景一起撑大。
    const lateSpeed = familyOf(P.type) === 'aerial' ? Math.max(0, +P.sparkLateWind || 0) : 0;
    const firstBurn = lateSpeed > 0 ? s.all.reduce((m, st) => Math.min(m, st.birth + (st.vis != null ? st.vis : st.burn)), Infinity) : Infinity;
    const burstSpeed = burstFlowActive(P) ? burstFlowValue(P, 'burstFlowWind') : 0;
    const lateAt = t => lateSpeed * Math.min(Le, Math.max(0, t - firstBurn)) + burstSpeed * Math.min(Le, Math.max(0, t - burstFlowValue(P, 'burstFlowStart')));
    const lateMax = lateAt(P.duration);
    const drop = g / k * drift, air = (Math.abs(P.wind) + P.turb) * drift;
    x0 -= spread + air + lateMax; x1 += spread + air + lateMax; y1 += spread + P.turb * drift + lateMax; y0 -= drop + spread + P.turb * drift + lateMax;
    for (const q of prof) q[2] += spread + drop + air + lateAt(q[0]);
    // 4.9.103（导出排查 A18）：带锚点的 Zoom 每个时刻的范围（box，只给锚点用）按「这一刻的火花最多活了多久」加余量——第 t 秒的火花最老 t 秒，
    //   散开 / 向后喷按 min(t, 火花寿命)、下坠 / 气流按 min(t, 余烬寿命)，0 s 没有火花就不加；活满寿命以后和以前一样。
    //   以前从 0 s 就加满寿命的余量，前段面片比内容大很多（FanGold-1.0 第 0 帧竖向 0.35）。固定取景 / 随开花放大（prof、整体范围）照旧
    const spawn0 = familyOf(P.type) === 'aerial' && (+P.sparkSpawnR > 0 || +P.sparkSpawnHead > 0 || +P.sparkJet > 0) ? Math.max(0, +P.sparkSpawnR || 0) + Math.max(0, +P.sparkSpawnHead || 0) * (+P.headSize || 0) / 2 * Math.exp(1.2 * Math.max(0, +P.headSizeJit || 0)) : 0;
    const jet0 = familyOf(P.type) === 'aerial' ? Math.max(0, +P.sparkJet || 0) : 0;
    for (const q of box) {
      const t = Math.max(0, q[0]), aS = Math.min(t, L), aE = Math.min(t, Le), dr = t > 0 ? aE - (1 - Math.exp(-k * aE)) / k : 0, late = lateAt(q[0]);
      const spr = t > 0 ? P.sparkSpread * aS * 0.7 * Math.max(1, tailShapeOf(P).w) + 1 + (P.branch > 0 ? 4 : 0) + spawn0 + jet0 * (1 - Math.exp(-k * aS)) / k : 0;
      const dp = g / k * dr, ar = (Math.abs(P.wind) + P.turb) * dr;
      q[1] -= spr + ar + late; q[2] += spr + ar + late; q[3] -= dp + spr + P.turb * dr + late; q[4] += spr + P.turb * dr + late;
    }
  }
  if (P.waterRefl > 0) { y0 = Math.min(y0, -y1 * 1.05 - 2); for (const q of prof) q[2] *= 1.05; for (const q of box) q[3] = Math.min(q[3], -q[4] * 1.05 - 2); }
  return { x0, x1, y0, y1, prof, box, stat, events: s.events, strobeOn: strobing && isFinite(strobeOn) ? +strobeOn.toFixed(4) : null };
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
// 取景 + 取帧计划：帧号曲线（≤8 个关键帧）就是引擎里 Dynamic Parameter 帧号通道要填的曲线，
// 每一帧的烘焙时刻取「曲线值 = 帧号 + 0.5」的时刻，引擎取整后正好显示这一帧
// a、b：分段烘焙时只取 [a, b] 这一段（长时母版分成开花段与下垂段）
function plan(P, fm0, ta = 0, tb = P.duration) {
  P = fxP(P);     // 4.9.21 效果 › 整体调整（全是 1 时原样）
  return usesTickPlan40(P)
    ? plan40(P,fm0,ta,tb) : planLegacy(P,fm0,ta,tb);
}
function planLegacy(P, fm0, ta = 0, tb = P.duration) {
  const win = ta > 0 || tb < P.duration - 1e-9;
  const inWin = q => q[0] >= ta - 1e-9 && q[0] <= tb + 1e-9;
  const fm = win ? { ...fm0, prof: fm0.prof.filter(inWin).map(q => [q[0] - ta, q[1], q[2]]), ...(fm0.box ? { box: fm0.box.filter(inWin).map(q => [q[0] - ta, q[1], q[2], q[3], q[4]]) } : {}) } : fm0;
  // 4.9.81 带锚点的 Zoom（anchor，用户 10-13 21:36 同意）：面片和固定取景一样大（爆点不在中心，Pivot Offset 放在爆点），Size By Life 绕爆点放大
  const anchor = P.zoom === 'anchor' && !!(fm.box && fm.box.length);
  const L = layoutOf(P), a = L.cellW / L.cellH, D = tb - ta, STEP = 1.5, zoom = P.zoom === 'on' || anchor;
  let HX, HY, cy, sizeKeys = [[0, 1], [1, 1]];
  // 随开花放大的曲线：sp = [[u, 这一刻要的大小（只增不减）]] → Size By Life 关键点（最多 8 个，直线不低于真实大小）
  const zoomKeys = (sp, run) => {
    sp.unshift([0, sp.length ? sp[0][1] : 1]); sp.push([1, run || 1]);
    const ks = simplify(sp, 8, 0.01).map(k => [...k]);
    // 关键帧之间是直线：把直线抬到不低于真实半径，保证内容不被裁掉
    const idx = ks.map(k => sp.findIndex(q => q[0] === k[0] && q[1] === k[1]));
    for (let k = 0; k < ks.length - 1; k++) {
      let e = 0; const [u0, v0] = ks[k], [u1, v1] = ks[k + 1];
      for (let i = idx[k] + 1; i < idx[k + 1]; i++) { const [u, v] = sp[i]; e = Math.max(e, v - (v0 + (v1 - v0) * (u - u0) / ((u1 - u0) || 1))); }
      ks[k].push(e); ks[k + 1].push(e);
    }
    const sk = ks.map(k => [+k[0].toFixed(4), +Math.min(1, k[1] + Math.max(0, ...k.slice(2)) + 0.02).toFixed(3)]);
    sk[0][0] = 0; sk[sk.length - 1][0] = 1; return sk;
  };
  if (anchor) {
    // 形状和固定取景一样（横向以爆点对称、竖向按内容偏 cy）；每个时刻的大小 = 左右、爆点以上、爆点以下三个方向里最紧的那个（各留 6 % + 1.5 m）
    const W0 = 2 * Math.max(-fm.x0, fm.x1), H0 = fm.y1 - fm.y0;
    HX = (Math.max(W0, H0 * a) * 1.06 + 3) / 2; HY = HX / a; cy = (fm.y0 + fm.y1) / 2;
    const up = cy + HY, dn = HY - cy;     // 爆点到面片上 / 下边（取景一定包含爆点：measure 的范围从 ±5 m 起）
    let run = 0; const sp = [];
    for (const [t, bx0, bx1, by0, by1] of fm.box) { if (t > D) break;
      const need = Math.max((Math.max(-bx0, bx1) * 1.06 + 1.5) / HX, (Math.max(0, by1) * 1.06 + 1.5) / up, (Math.max(0, -by0) * 1.06 + 1.5) / dn);
      run = Math.max(run, Math.min(1, need)); sp.push([t / D, run]); }
    sizeKeys = zoomKeys(sp, run);
  } else if (zoom) {
    // 以爆点为中心取景，面片按 Size By Life 曲线随开花放大
    let R = 1; for (const q of fm.prof) if (q[0] <= D) R = Math.max(R, q[2]);
    R = R * 1.06 + 3; HX = R * Math.max(1, a); HY = HX / a; cy = 0;
    let run = 0; const sp = [];
    for (const [t, , r] of fm.prof) { if (t > D) break; run = Math.max(run, Math.min(1, (r * 1.06 + 3) / R)); sp.push([t / D, run]); }
    sizeKeys = zoomKeys(sp, run);
  } else {
    const W0 = 2 * Math.max(-fm.x0, fm.x1), H0 = fm.y1 - fm.y0;
    HX = (Math.max(W0, H0 * a) * 1.06 + 3) / 2; HY = HX / a; cy = (fm.y0 + fm.y1) / 2;
  }
  const Ww = 2 * HX, Wh = 2 * HY, sAt = t => evalKeys(sizeKeys, t / D);
  const ppmAt = t => L.cellW / (Ww * sAt(t)), ppm = L.cellW / Ww;
  // 4.3（渲染基础问题 B5）：「按画面变化」取帧去掉了（所有调用都传了预跑结果，它从来没生效过；旧配方里的 content 当「自动」）
  const dens = (v, t) => P.frameMode === 'uniform' ? 1 : Math.max(v * ppmAt(t) / STEP, P.fpsFloor);
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
  return { L, HX, HY, Ww, Wh, cy, ppm, zoom, ...(anchor ? { anchor: true } : {}), sizeKeys, area, px: 0.5, py: (cy + HY) / Wh, keys, times, dur, avgFps: L.F / D, minFps: 1 / maxDur, maxDisp, t0: ta, duration: D };
}
