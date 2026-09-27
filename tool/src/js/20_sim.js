// =====================================================================
//  物理模拟
// =====================================================================
class Sparks {
  constructor(cap) {
    this.cap = cap; this.n = 0;
    this.p = new Float32Array(cap * 3); this.v = new Float32Array(cap * 3);
    this.age = new Float32Array(cap); this.life = new Float32Array(cap); this.T0 = new Float32Array(cap); this.rnd = new Float32Array(cap);
    this.air = new Float32Array(cap * 2);
  }
  add(x, y, z, vx, vy, vz, age, life, T0, rnd, ax, ay) {
    if (this.n >= this.cap) return;
    const i = this.n++, k = i * 3;
    this.p[k] = x; this.p[k + 1] = y; this.p[k + 2] = z; this.v[k] = vx; this.v[k + 1] = vy; this.v[k + 2] = vz;
    this.age[i] = age; this.life[i] = life; this.T0[i] = T0; this.rnd[i] = rnd; this.air[i * 2] = ax; this.air[i * 2 + 1] = ay;
  }
  kill(i) {
    const j = --this.n; if (i === j) return;
    const a = i * 3, b = j * 3;
    this.p[a] = this.p[b]; this.p[a + 1] = this.p[b + 1]; this.p[a + 2] = this.p[b + 2];
    this.v[a] = this.v[b]; this.v[a + 1] = this.v[b + 1]; this.v[a + 2] = this.v[b + 2];
    this.age[i] = this.age[j]; this.life[i] = this.life[j]; this.T0[i] = this.T0[j]; this.rnd[i] = this.rnd[j];
    this.air[i * 2] = this.air[j * 2]; this.air[i * 2 + 1] = this.air[j * 2 + 1];
  }
}

// 湍流：二维无散度场（流函数的三个正弦模态叠加），CPU 与 GPU 用同一套参数
function turbModes(P) {
  const r = new RNG(P.seed * 31 + 5), out = [], W = [0.72, 0.5, 0.3], nw = Math.hypot(...W);
  for (let i = 0; i < 3; i++) {
    const k = 2 * Math.PI / Math.max(1, P.turbScale) * [1, 1.83, 3.1][i], a = r.u() * 6.2832;
    out.push([k * Math.cos(a), k * Math.sin(a), (0.35 + 0.5 * r.u()) * k * Math.max(2, P.turb) * 0.6, r.u() * 6.2832, P.turb * W[i] / nw / k]);
  }
  return out;
}
function turbVel(M, x, y, t) {
  let u = 0, v = 0;
  for (const [kx, ky, w, ph, A] of M) { const c = A * Math.cos(kx * x + ky * y + w * t + ph); u += c * ky; v -= c * kx; }
  return [u, v];
}

// 图案：返回平面上的点（最大半径 1）
const shapeCache = new Map();
function polySample(poly, n, closed = true) {
  const pts = closed ? [...poly, poly[0]] : poly, cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1], out = [];
  for (let k = 0; k < n; k++) {
    const s = (closed ? k / n : k / Math.max(1, n - 1)) * L; let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const u = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u]);
  }
  return out;
}
function textPoints(text, n) {
  const key = text + '|' + n; if (shapeCache.has(key)) return shapeCache.get(key);
  const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  let fs = 220; c.font = `900 ${fs}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`;
  const w = c.measureText(text || '祭').width; if (w > W * 0.94) { fs *= W * 0.94 / w; c.font = `900 ${fs}px "PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif`; }
  c.fillText(text || '祭', W / 2, H / 2);
  const d = c.getImageData(0, 0, W, H).data, on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 128;
  let pts = [];
  for (let s = 24; s >= 2; s--) {
    pts = [];
    for (let gy = 0; gy < H; gy += s) for (let gx = 0; gx < W; gx += s) { const x = gx + (s >> 1), y = gy + (s >> 1); if (on(x, y)) pts.push([x, y]); }
    if (pts.length >= n) break;
  }
  const r = new RNG(n); while (pts.length > n) pts.splice(Math.floor(r.u() * pts.length), 1);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; let m = 1; for (const [x, y] of pts) m = Math.max(m, Math.hypot(x - cx, y - cy));
  const out = pts.map(([x, y]) => [(x - cx) / m, -(y - cy) / m]); shapeCache.set(key, out); return out;
}
function shapePoints(kind, n, text) {
  if (kind === 'heart') {
    const poly = []; for (let i = 0; i < 400; i++) { const t = i / 400 * 6.2832; poly.push([16 * Math.sin(t) ** 3 / 17, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2) / 17]); }
    return polySample(poly, n);
  }
  if (kind === 'star5') { const poly = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.42 : 1; poly.push([r * Math.cos(a), r * Math.sin(a)]); } return polySample(poly, n); }
  if (kind === 'smile') {
    const nf = Math.round(n * 0.58), ne = Math.max(3, Math.round(n * 0.08)), nm = Math.max(4, n - nf - 2 * ne), circ = (cx, cy, r, k) => { const o = []; for (let i = 0; i < k; i++) { const a = i / k * 6.2832; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; };
    const mouth = []; for (let i = 0; i < 60; i++) { const a = Math.PI * (1.15 + 0.7 * i / 59); mouth.push([0.55 * Math.cos(a), 0.55 * Math.sin(a) + 0.05]); }
    return [...circ(0, 0, 1, nf), ...circ(-0.36, 0.3, 0.1, ne), ...circ(0.36, 0.3, 0.1, ne), ...polySample(mouth, nm, false)];
  }
  if (kind === 'text') return textPoints(text, n);
  const o = []; for (let i = 0; i < n; i++) { const a = i / n * 6.2832; o.push([Math.cos(a), Math.sin(a)]); } return o;   // ring
}
// 星的方向与速度倍数：[dx, dy, dz, 速度倍数]
function dirsFor(P, rng) {
  if (P._unit) { const e = P.unitElev * Math.PI / 180; return [[Math.cos(e), Math.sin(e), 0, 1]]; }
  const n = P.stars, R = randRot(rng), jit = P.dirJit * Math.PI / 180, tl = P.tilt * Math.PI / 180;
  const jitter = d => { const x = d[0] + rng.n() * jit, y = d[1] + rng.n() * jit, z = d[2] + rng.n() * jit, l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
  const planar = (pts, s, yaw) => {
    const roll = P.pattern === 'ring' || P.pattern === 'saturn' ? rng.u() * 6.2832 : 0, cr = Math.cos(roll), sr = Math.sin(roll);
    return pts.map(([x0, y0]) => {
      const x = x0 * cr - y0 * sr, y = x0 * sr + y0 * cr, r = Math.hypot(x, y);
      // 环绕 x 轴倾斜（环、土星）或绕 y 轴转（型物），倾斜越大越扁
      let v = yaw ? [x * Math.cos(tl), y, x * Math.sin(tl)] : [x, y * Math.cos(tl), y * Math.sin(tl)];
      const l = Math.hypot(...v) || 1; v = jitter(v.map(q => q / l));
      return [...v, s * (r > 1e-6 ? r : 0) * (yaw ? 1 : 1)];
    });
  };
  switch (P.pattern) {
    case 'half': return fibDirs(n * 2, rng, R, P.dirJit).filter(d => d[1] >= 0).slice(0, n).map(d => [...d, 1]);
    case 'ring': return planar(shapePoints('ring', n), 1, false);
    case 'saturn': {
      const nr = Math.round(n * P.ringFrac);
      return [...planar(shapePoints('ring', nr), 1.25, false), ...fibDirs(n - nr, rng, R, P.dirJit).map(d => [...d, 0.55])];
    }
    case 'heart': case 'smile': case 'star5': case 'text': return planar(shapePoints(P.pattern, n, P.text), 1, true);
    default: return fibDirs(n, rng, R, P.dirJit).map(d => [...d, 1]);
  }
}
// 上升：竖直二次阻力，给定开花高度求出膛速度与到顶时间
function riseInfo(P) {
  const vt = P.vtShell, h = P.riseH, v0 = vt * Math.sqrt(Math.exp(2 * G * h / (vt * vt)) - 1);
  return { v0, ta: vt / G * Math.atan(v0 / vt) };
}

class Sim {
  constructor(P) {
    this.P = P; this.fam = familyOf(P.type); this.rng = new RNG(P.seed); this.rr = new RNG(P.seed + 9973);
    this.t = 0; this.stars = []; this.all = []; this.noSparks = P.engine === 'gpu';
    const big = P.type === 'kamuro' || P.type === 'yanagi' || P.type === 'palm';
    this.sp = new Sparks(this.noSparks ? 1 : (big ? 450000 : 250000));
    this.c = G / (P.vt * P.vt);
    this.tm = P.turb > 0 ? turbModes(P) : null;
    this.flashes = [];
    this.events = [];                    // 声音节点：[时刻, 类型]
    if (this.fam === 'rise') { this.initRise(); return; }
    this.flashes.push({ t0: 0, x: 0, y: 0, I: P.flash, sig: Math.max(2, P.v0 * 0.045) });
    this.events.push([0, 'burst']);
    const dirs = dirsFor(P, this.rng);
    const carrier = P.type === 'senrin' || P.type === 'crossette';
    // 自旋：绕随机轴，切向速度 = ω × 半径（半径按号数估计）
    const ax = randUnit(this.rng), rs = 0.015 * (P.shellNo || 5), om = P.shellSpin;
    for (const d of dirs) {
      const s = P.v0 * d[3] * (1 + P.speedJit / 100 * this.rng.n());
      const burn = carrier ? P.subDelay * (1 + P.subJit / 100 * this.rng.n()) : P.burn * (1 + P.burnJit / 100 * this.rng.n());
      let vx = d[0] * s + P.shellVx, vy = d[1] * s + P.shellVy, vz = d[2] * s;
      if (om) { vx += om * rs * (ax[1] * d[2] - ax[2] * d[1]); vy += om * rs * (ax[2] * d[0] - ax[0] * d[2]); vz += om * rs * (ax[0] * d[1] - ax[1] * d[0]); }
      // 起始半径：星从半径 burstR0 的球面上出发（开花第一帧就有一定大小，游戏里常用的写法）
      const r0 = P.burstR0 || 0;
      const st = this.mk(d[0] * r0, d[1] * r0, d[2] * r0, vx, vy, vz, Math.max(0.05, burn), carrier ? 1 : 0, carrier ? P.carrierTail : P.sparkRate, P.headBright * (carrier ? 0.4 : 1));
      this.stars.push(st);
      if (P.ignDelay > 0 && !carrier) { st.ign = Math.max(0, P.ignDelay * (1 + P.ignJit / 100 * (2 * this.rng.u() - 1))); st.burn += st.ign; }
      // 单元序列：星熄灭后粒子继续按轨迹运动（Cascade 里粒子不会停），只是不再发光、不再发火花
      if (P._unit) { st.vis = st.burn; st.burn = 1e9; }
    }
  }
  initRise() {
    const P = this.P, ri = riseInfo(P), st = P.riseStyle;
    this.ri = ri; this.cShell = G / (P.vtShell * P.vtShell);
    let rate = P.sparkRate, I = P.headBright;
    if (st === 'silver') rate *= 1.6; else if (st === 'dark') { rate = 0; I *= 0.08; } else if (st === 'fue') rate *= 0.25;
    const s = this.mk(0, 0, 0, 0, ri.v0, 0, ri.ta, 5, rate, I); s.c = this.cShell; this.stars.push(s);
    this.events.push([0, 'launch']); if (st === 'fue') this.events.push([0, 'whistle']);
    this.kobana = st === 'kobana' ? P.kobanaN : 0; this.kobDone = 0; this.split = st === 'bunpo';
    this.flashes.push({ t0: 0, x: 0, y: 0, I: 0.4, sig: 3 });
  }
  mk(x, y, z, vx, vy, vz, burn, kind, rate, I) {
    const s = { x, y, z, vx, vy, vz, age: 0, burn, kind, rate, I, flick: 1, alive: true, birth: this.t, id: this.all.length, ign: 0, ph: this.rng.u(), ph2: this.rng.u(), c: this.c };
    this.all.push(s);
    if (this.P.type === 'hachi') {
      const a = randUnit(this.rng); s.ax = a[0]; s.ay = a[1]; s.az = a[2];
      s.om = this.P.spin * (0.6 + 0.8 * this.rng.u()) * (this.rng.u() < 0.5 ? -1 : 1);
    }
    return s;
  }
  subBurst(s) {
    const P = this.P, rng = this.rng;
    let dirs;
    if (P.subPattern === 'cross') {
      // 十字：在垂直于速度的平面里取四个方向
      const v = Math.hypot(s.vx, s.vy, s.vz) || 1, f = [s.vx / v, s.vy / v, s.vz / v];
      let a = Math.abs(f[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      let u = [f[1] * a[2] - f[2] * a[1], f[2] * a[0] - f[0] * a[2], f[0] * a[1] - f[1] * a[0]]; const lu = Math.hypot(...u); u = u.map(q => q / lu);
      const w = [f[1] * u[2] - f[2] * u[1], f[2] * u[0] - f[0] * u[2], f[0] * u[1] - f[1] * u[0]], r0 = rng.u() * 6.2832;
      dirs = []; for (let i = 0; i < P.subStars; i++) { const a2 = r0 + i * 6.2832 / P.subStars, c = Math.cos(a2), sn = Math.sin(a2); dirs.push([u[0] * c + w[0] * sn, u[1] * c + w[1] * sn, u[2] * c + w[2] * sn]); }
    } else dirs = fibDirs(P.subStars, rng, randRot(rng), P.dirJit * 2);
    const keep = P.subPattern === 'cross' ? 0.25 : 0.35;
    for (const d of dirs) {
      const sp = P.subSpeed * (1 + P.speedJit / 100 * rng.n());
      const b = P.subBurn * (1 + P.burnJit / 100 * rng.n());
      this.stars.push(this.mk(s.x, s.y, s.z, s.vx * keep + d[0] * sp, s.vy * keep + d[1] * sp, s.vz * keep + d[2] * sp,
        Math.max(0.05, b), 2, P.subTail, P.headBright));
    }
    this.flashes.push({ t0: this.t, x: s.x, y: s.y, I: P.flash * 0.3, sig: Math.max(1, P.subSpeed * 0.05) });
    this.events.push([this.t, P.subPattern === 'cross' ? 'crack' : 'pop']);
  }
  kobanaBurst(s) {
    // 昇り小花：从弹体侧向抛出的小子弹，很快开成一朵小花
    const rng = this.rng, a = rng.u() * 6.2832, sp = 10 + 6 * rng.u();
    const c = this.mk(s.x, s.y, s.z, s.vx * 0.6 + Math.cos(a) * sp, s.vy * 0.6, s.vz * 0.6 + Math.sin(a) * sp, 0.35 + 0.1 * rng.u(), 6, 30, 0.3);
    this.stars.push(c);
  }
  smallFlower(s) {
    const rng = this.rng, dirs = fibDirs(10, rng, randRot(rng), 3);
    for (const d of dirs) { const sp = 16 * (1 + 0.1 * rng.n()); this.stars.push(this.mk(s.x, s.y, s.z, s.vx * 0.3 + d[0] * sp, s.vy * 0.3 + d[1] * sp, s.vz * 0.3 + d[2] * sp, 0.55 + 0.1 * rng.n(), 2, 0, this.P.headBright * 0.8)); }
    this.flashes.push({ t0: this.t, x: s.x, y: s.y, I: 0.15, sig: 1.2 }); this.events.push([this.t, 'pop']);
  }
  crackleBurst(s) {
    const P = this.P, rng = this.rng;
    for (let i = 0; i < P.crackle; i++) {
      const dt = P.crackleDelay * (0.3 + 1.4 * rng.u()), d = randUnit(rng), r = 0.5 + 3 * rng.u();
      this.flashes.push({ t0: this.t + dt, x: s.x + s.vx * dt * 0.3 + d[0] * r, y: s.y + s.vy * dt * 0.3 + d[1] * r, abs: 2.2 * (0.6 + 0.8 * rng.u()), sig: 0.35 + 0.3 * rng.u(), tau: 0.012, cut: 0.07 });
    }
    this.events.push([this.t + P.crackleDelay, 'crackle']);
  }
  air(x, y, t) {
    let u = this.P.wind, v = 0;
    if (this.tm) { const q = turbVel(this.tm, x, y, t); u += q[0]; v += q[1]; }
    return [u, v];
  }
  step(h) {
    const P = this.P, rng = this.rng, gy = -G * P.grav, st = this.stars, sp = this.sp;
    const bee = P.type === 'hachi', sq = Math.sqrt(h), windy = P.wind !== 0 || !!this.tm, water = P.waterRefl > 0;
    let dead = 0;
    for (let i = 0; i < st.length; i++) {
      const s = st[i];
      if (!s.alive) { dead++; continue; }
      s.age += h;
      let ax = 0, ay = 0; if (windy) [ax, ay] = this.air(s.x, s.y, this.t);
      const rx = s.vx - ax, ry = s.vy - ay, rz = s.vz, v = Math.hypot(rx, ry, rz);
      // 燃烧减质量：星体半径随燃烧线性变小，阻力系数 ∝ 1/半径
      let c = s.c; if (P.massLoss > 0 && s.kind !== 5) c /= Math.max(0.15, 1 - P.massLoss * clamp((s.age - s.ign) / Math.max(0.05, (s.vis != null ? s.vis : s.burn) - s.ign), 0, 1));
      s.vx -= c * v * rx * h; s.vy += (-c * v * ry + (s.kind === 5 ? -G : gy)) * h; s.vz -= c * v * rz * h;
      if (bee) {
        const th = s.om * h, co = Math.cos(th), si = Math.sin(th);
        const ax2 = s.ax, ay2 = s.ay, az2 = s.az, vx = s.vx, vy = s.vy, vz = s.vz;
        const dot = ax2 * vx + ay2 * vy + az2 * vz;
        const cx = ay2 * vz - az2 * vy, cy = az2 * vx - ax2 * vz, cz = ax2 * vy - ay2 * vx;
        s.vx = vx * co + cx * si + ax2 * dot * (1 - co);
        s.vy = vy * co + cy * si + ay2 * dot * (1 - co);
        s.vz = vz * co + cz * si + az2 * dot * (1 - co);
        const q = P.chaos * sq * 2;
        s.ax += rng.n() * q; s.ay += rng.n() * q; s.az += rng.n() * q;
        const al = Math.hypot(s.ax, s.ay, s.az) || 1; s.ax /= al; s.ay /= al; s.az /= al;
        if (s.age > 0.15) { const sv = Math.hypot(s.vx, s.vy, s.vz) || 1, k = (P.beeSpeed - sv) * 3 * h / sv; s.vx += s.vx * k; s.vy += s.vy * k; s.vz += s.vz * k; }
      }
      if (P.flutter > 0 && s.kind !== 5) {
        const w = 6.2832 * P.flutterHz * (0.8 + 0.4 * s.ph2);
        s.vx += P.flutter * w * Math.cos(w * s.age + s.ph * 6.2832) * h; s.vz += P.flutter * w * Math.sin(w * s.age * 0.7 + s.ph2 * 6.2832) * h * 0.6;
      }
      if (s.kind === 5) {
        // 曲导：摆动（之字形）与螺旋，都是横向速度的调制
        const w = 6.2832 * P.wobbleHz, A = P.riseStyle === 'spiral' ? Math.max(P.wobble, 10) : P.wobble;
        if (P.riseStyle === 'spiral') { s.vx = A * Math.cos(w * s.age) + (s.svx || 0); s.vz = A * Math.sin(w * s.age); }
        else if (A > 0) s.vx += A * w * Math.cos(w * s.age + s.ph * 6.2832) * h + rng.n() * A * 0.4 * sq;
      }
      s.x += s.vx * h; s.y += s.vy * h; s.z += s.vz * h;
      s.flick = clamp(s.flick + rng.n() * sq * 2.2 * P.flicker, 1 - P.flicker, 1 + P.flicker * 0.4);
      if (s.vis != null && !s.ended && s.age >= s.vis) { s.ended = true; if (P.crackle > 0) this.crackleBurst(s); }
      if (s.rate > 0 && !this.noSparks && s.age >= s.ign && !s.ended) {
        const fr = s.kind === 5 || P.sparkRateEnd == null || P.sparkRateEnd === 1 ? 1 : Math.max(0, 1 + (P.sparkRateEnd - 1) * clamp((s.age - s.ign) / Math.max(0.05, (s.vis != null ? s.vis : s.burn) - s.ign), 0, 1));
        const k = rng.poisson(s.rate * fr * h), spr = P.sparkSpread, T0 = s.kind === 5 && P.riseStyle === 'silver' ? P.T0 + 250 : P.T0, lf = s.kind === 5 && P.riseStyle === 'silver' ? 1.5 : 1;
        for (let j = 0; j < k; j++) {
          const u = rng.u(), inh = P.sparkInherit * (0.3 + 1.4 * rng.u()), px = s.x - s.vx * h * u, py = s.y - s.vy * h * u;
          const [aX, aY] = windy ? this.air(px, py, this.t) : [0, 0];
          sp.add(px, py, s.z - s.vz * h * u, s.vx * inh + rng.n() * spr, s.vy * inh + rng.n() * spr, s.vz * inh + rng.n() * spr,
            u * h, P.sparkLife * lf * Math.exp(0.45 * rng.n()), T0 + 120 * rng.n(), rng.u(), aX, aY);
        }
      }
      if (s.kind === 5) {
        const frac = s.age / s.burn;
        if (this.kobana && this.kobDone < this.kobana && frac >= (this.kobDone + 0.6) / (this.kobana + 0.6)) { this.kobDone++; this.kobanaBurst(s); }
        if (this.split && frac >= 0.45 && !s.child) {
          this.split = false; s.alive = false; const n = P.bunpoN;
          for (let q = 0; q < n; q++) {
            const a = (q / Math.max(1, n - 1) - 0.5) * 0.9 + rng.n() * 0.05, v = Math.hypot(s.vx, s.vy) * 0.95;
            const c = this.mk(s.x, s.y, s.z, Math.sin(a) * v, Math.cos(a) * v, 0, s.burn - s.age, 5, s.rate * 0.7, s.I * 0.8); c.child = true; c.c = this.cShell; c.svx = Math.sin(a) * v; this.stars.push(c);
          }
          this.events.push([this.t, 'split']);
          continue;
        }
      }
      if (water && s.y < 0 && s.age > 0.05 && s.kind !== 5) { s.alive = false; this.flashes.push({ t0: this.t, x: s.x, y: 0, abs: 0.5, sig: 0.8, tau: 0.05, cut: 0.2 }); continue; }
      if (s.age >= s.burn) {
        s.alive = false;
        if (s.kind === 1) this.subBurst(s);
        else if (s.kind === 6) this.smallFlower(s);
        else if (s.kind === 5 && !s.child) { this.flashes.push({ t0: this.t, x: s.x, y: s.y, I: 0.6, sig: 3 }); this.events.push([this.t, 'apex']); }
        else if (P.crackle > 0 && (s.kind === 0 || s.kind === 2)) this.crackleBurst(s);
      }
    }
    if (dead > 64 && dead > st.length / 2) this.stars = st.filter(s => s.alive);
    const d = P.sparkDrag, g2 = -G * P.sparkGrav, p = sp.p, vv = sp.v, age = sp.age, life = sp.life, air = sp.air;
    for (let i = sp.n - 1; i >= 0; i--) {
      age[i] += h;
      if (age[i] >= life[i]) { sp.kill(i); continue; }
      const k = i * 3;
      vv[k] -= d * (vv[k] - air[i * 2]) * h; vv[k + 1] += (-d * (vv[k + 1] - air[i * 2 + 1]) + g2) * h; vv[k + 2] -= d * vv[k + 2] * h;
      p[k] += vv[k] * h; p[k + 1] += vv[k + 1] * h; p[k + 2] += vv[k + 2] * h;
    }
    this.t += h;
  }
  headI(s) {
    const P = this.P, a = s.age - s.ign, end = s.vis != null ? s.vis : s.burn;
    if (a < 0 || s.age >= end) return 0;
    const dur = Math.max(0.05, end - s.ign), ign = Math.min(1, a / 0.05), rem = end - s.age;
    let f = 1;
    if (P.fade > 0 && s.kind !== 1 && s.kind !== 5) f = clamp(rem / (dur * P.fade), 0, 1);
    const last = s.kind === 1 || s.kind === 5 ? 1 : 1 + P.lastFlare * Math.exp(-((rem / 0.05) ** 2));
    let st = 1;
    if (P.strobeHz > 0 && s.kind !== 1 && s.kind !== 5 && a > P.strobeStart * dur) {
      const ph = (a * P.strobeHz * (0.85 + 0.3 * s.ph2) + s.ph) % 1; st = ph < P.strobeDuty ? 1.6 : 0.03;
    }
    if (P.flutter > 0) st *= 0.55 + 0.45 * Math.abs(Math.cos(3.1416 * P.flutterHz * s.age + s.ph * 6.2832));
    if (s.kind === 5 && P.riseStyle === 'fue') st *= 0.6 + 0.4 * Math.sin(6.2832 * 9 * s.age);
    return s.I * s.flick * ign * f * last * st;
  }
  // 当前时刻所有发光点：星头 → bufH，火花 → bufT；每点 [x, y, 强度, 尺寸(2σ, 米)]
  gather(bufH, bufT) {
    const P = this.P, rr = this.rr, refl = P.waterRefl;
    let nh = 0; const capH = bufH.length >> 2, capT = bufT.length >> 2;
    const push = (buf, n, x, y, I, sz) => { const k = n * 4; buf[k] = x; buf[k + 1] = y; buf[k + 2] = I; buf[k + 3] = sz; };
    for (const s of this.stars) {
      if (!s.alive || nh >= capH - 1) continue;
      const I = this.headI(s); if (I <= 0) continue;
      const sz = P.headSize * (s.kind === 1 || s.kind === 6 ? 0.8 : 1);
      push(bufH, nh++, s.x, s.y, I, sz);
      if (refl > 0 && s.y > 0) push(bufH, nh++, s.x + ripple(s.y, this.t), -s.y, I * refl * Math.exp(-s.y / 400), sz * 1.3);
    }
    for (const f of this.flashes) {
      const a = this.t - f.t0, cut = f.cut || 0.25; if (a < 0 || a > cut || nh >= capH - 1) continue;
      if (P._unit && f.abs == null) continue;      // 单元序列不含开花闪光（另挂）
      const I = f.abs != null ? f.abs * Math.exp(-a / f.tau) : f.I * Math.exp(-a / 0.035) * 1.5 * 6.2832 * f.sig * f.sig;
      push(bufH, nh++, f.x, f.y, I, f.sig * 2);
      if (refl > 0 && f.y >= 0) push(bufH, nh++, f.x, -f.y - 0.01, I * refl, f.sig * 2.6);
    }
    const sp = this.sp; let nt = 0;
    const gl = P.glitter, gd = P.glitterDelay;
    for (let i = 0; i < sp.n && nt < capT - 1; i++) {
      const T = sp.T0[i] * (1 - P.cooling * sp.age[i] / sp.life[i]);
      let g = (T - 900) / 1150; if (g <= 0 && gl <= 0) continue; g = g > 0 ? g * g * g : 0;
      if (gl > 0) { const tf = gd * (0.5 + sp.rnd[i]), e = (sp.age[i] - tf) / 0.03; g = g * (1 - 0.85 * gl) + gl * 6 * Math.exp(-e * e); }
      const j = i * 3, x = sp.p[j], y = sp.p[j + 1];
      if (refl > 0 && y < 0) continue;
      const I = g * (1 + P.twinkle * (rr.u() * 2 - 1)) * P.sparkBright * 0.6;
      push(bufT, nt++, x, y, I, P.sparkSize);
      if (refl > 0 && nt < capT - 1) push(bufT, nt++, x + ripple(y, this.t), -y, I * refl * Math.exp(-y / 400), P.sparkSize * 1.3);
    }
    return [nh, nt];
  }
}
// 水面倒影的横向抖动（波纹）
function ripple(y, t) { return 0.012 * y * Math.sin(0.35 * y + 7 * t) + 0.3 * Math.sin(1.7 * y + 3 * t); }
