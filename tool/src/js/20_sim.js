// =====================================================================
//  物理模拟
// =====================================================================
class Sparks {
  constructor(cap) {
    this.cap = cap; this.n = 0;
    this.p = new Float32Array(cap * 3); this.v = new Float32Array(cap * 3);
    this.age = new Float32Array(cap); this.life = new Float32Array(cap); this.T0 = new Float32Array(cap); this.rnd = new Float32Array(cap);
    this.air = new Float32Array(cap * 2); this.pd = new Float32Array(cap);
  }
  add(x, y, z, vx, vy, vz, age, life, T0, rnd, ax, ay, pd = 1e9) {
    if (this.n >= this.cap) { this.dropped = (this.dropped || 0) + 1; return; }     // 4.3（E9）：池满了丢的数记下来（自检报警）
    const i = this.n++, k = i * 3;
    this.p[k] = x; this.p[k + 1] = y; this.p[k + 2] = z; this.v[k] = vx; this.v[k + 1] = vy; this.v[k + 2] = vz;
    this.age[i] = age; this.life[i] = life; this.T0[i] = T0; this.rnd[i] = rnd; this.air[i * 2] = ax; this.air[i * 2 + 1] = ay; this.pd[i] = pd;
  }
  kill(i) {
    const j = --this.n; if (i === j) return;
    const a = i * 3, b = j * 3;
    this.p[a] = this.p[b]; this.p[a + 1] = this.p[b + 1]; this.p[a + 2] = this.p[b + 2];
    this.v[a] = this.v[b]; this.v[a + 1] = this.v[b + 1]; this.v[a + 2] = this.v[b + 2];
    this.age[i] = this.age[j]; this.life[i] = this.life[j]; this.T0[i] = this.T0[j]; this.rnd[i] = this.rnd[j];
    this.air[i * 2] = this.air[j * 2]; this.air[i * 2 + 1] = this.air[j * 2 + 1]; this.pd[i] = this.pd[j];
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
// 每颗星固定的伪随机数（0–1）：不消耗模拟的随机序列，所以加了「只让一部分星发光」「第二段时长」这类开关后，
// 同种子的两层星位仍然一一对应（红点灭 = 主层星的一部分，接在它们的位置上）
function starHash(id, seed, k) {
  let h = (Math.imul(id + 1, 0x9E3779B1) ^ Math.imul((seed | 0) + 7, 0x85EBCA77) ^ Math.imul(k + 3, 0xC2B2AE3D)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7FEB352D) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x846CA68B) >>> 0; h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// 4.0：每颗星自己的随机序列（由星号 + 种子决定）。改星数、打开延时点火、改燃烧时间，都不会把别的星重新洗牌（问题清单 E2）
function starRng(id, seed, k) { return new RNG((starHash(id, seed, k) * 4294967296) | 0); }
// 4.2.17 火花起势：开始出火花后 τ 秒时的密度比例（0 → 1，smoothstep：开头很稀、慢慢连成线）；每颗星的起势时长随机 ± sparkRampJit%（均匀）
// GPU 内核（40_gl.js VS_SPK）用同一条曲线、同一个每颗星的随机数（starHash(id, seed, 17)）
function sparkRampT(P, id) { const j = clamp((+P.sparkRampJit || 0) / 100, 0, 1); return Math.max(0.01, +P.sparkRamp * (1 + j * (2 * starHash(id, P.seed, 17) - 1))); }
function sparkRampAt(P, id, tau) { if (!(+P.sparkRamp > 0)) return 1; const x = clamp(tau / sparkRampT(P, id), 0, 1); return x * x * (3 - 2 * x); }
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
    this.flashes.push({ t0: 0, x: 0, y: 0, I: P.flash, sig: Math.max(2, P.v0 * 0.045) * (+P.flashSize > 0 ? +P.flashSize : 1) });     // 4.3.3 开花闪光大小（默认 1 = 以前）
    this.events.push([0, 'burst']);
    const dirs = dirsFor(P, this.rng);
    const carrier = P.type === 'senrin' || P.type === 'crossette';
    // 自旋：绕随机轴，切向速度 = ω × 半径（半径按号数估计）
    const ax = randUnit(this.rng), rs = 0.015 * (P.shellNo || 5), om = P.shellSpin;
    // 点火离散用独立随机：不打乱主序列，星位和同种子、不带延时点火的层一一对应
    const ignRng = P.ignSeed ? new RNG(P.ignSeed) : this.rng;
    for (let di = 0; di < dirs.length; di++) {
      const d = dirs[di], sr = starRng(this.all.length, P.seed, 21);
      const s = P.v0 * d[3] * (1 + P.speedJit / 100 * sr.n());
      const burn = carrier ? P.subDelay * (1 + P.subJit / 100 * sr.n()) : P.burn * (1 + P.burnJit / 100 * sr.n());
      let vx = d[0] * s + P.shellVx, vy = d[1] * s + P.shellVy, vz = d[2] * s;
      if (om) { vx += om * rs * (ax[1] * d[2] - ax[2] * d[1]); vy += om * rs * (ax[2] * d[0] - ax[0] * d[2]); vz += om * rs * (ax[0] * d[1] - ax[1] * d[0]); }
      // 起始半径：星从半径 burstR0 的球面上出发（开花第一帧就有一定大小，游戏里常用的写法）
      const r0 = P.burstR0 || 0;
      const st = this.mk(d[0] * r0, d[1] * r0, d[2] * r0, vx, vy, vz, Math.max(0.05, burn), carrier ? 1 : 0, carrier ? P.carrierTail : P.sparkRate, P.headBright * (carrier ? (P.carrierHead != null ? P.carrierHead : 0.4) : 1));
      this.stars.push(st);
      if (P.ignDelay > 0 && !carrier) { st.ign = Math.max(0, P.ignDelay * (1 + P.ignJit / 100 * (2 * (!P.ignSeed ? starHash(st.id, P.seed, 13) : ignRng.u()) - 1))); st.burn += st.ign; }
      // 第二段（分层星内层）：主段 burn 期间不发光、轨迹与主层相同；主段烧完后接着亮 afterBurn 秒（红点灭余烬）
      if (P.afterBurn > 0 && !carrier) { st.mref = st.burn; st.st1 = st.burn; st.burn += P.afterBurn * Math.max(0.2, 1 + P.afterJit / 100 * (2 * starHash(st.id, P.seed, 11) - 1)); }
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
    const id = this.all.length, rr = starRng(id, this.P.seed, 3);
    const s = { x, y, z, vx, vy, vz, age: 0, burn, kind, rate, I, flick: 1, alive: true, birth: this.t, id, ign: 0, ph: rr.u(), ph2: rr.u(), c: this.c };
    s.rng = rr;
    if (this.P.keepFrac < 1 && kind !== 1 && kind !== 5 && starHash(s.id, this.P.seed, 5) >= this.P.keepFrac) { s.dark = true; s.rate = 0; }
    this.all.push(s);
    if (this.P.type === 'hachi') {
      const a = randUnit(rr); s.ax = a[0]; s.ay = a[1]; s.az = a[2];
      s.om = this.P.spin * (0.6 + 0.8 * rr.u()) * (rr.u() < 0.5 ? -1 : 1);
    }
    return s;
  }
  subBurst(s) {
    const P = this.P, rng = starRng(s.id, P.seed, 31);
    let dirs;
    if (P.subPattern === 'cross') {
      // 十字：在垂直于速度的平面里取四个方向
      const v = Math.hypot(s.vx, s.vy, s.vz) || 1, f = [s.vx / v, s.vy / v, s.vz / v];
      let a = Math.abs(f[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      let u = [f[1] * a[2] - f[2] * a[1], f[2] * a[0] - f[0] * a[2], f[0] * a[1] - f[1] * a[0]]; const lu = Math.hypot(...u); u = u.map(q => q / lu);
      const w = [f[1] * u[2] - f[2] * u[1], f[2] * u[0] - f[0] * u[2], f[0] * u[1] - f[1] * u[0]], r0 = rng.u() * 6.2832;
      dirs = []; for (let i = 0; i < P.subStars; i++) { const a2 = r0 + i * 6.2832 / P.subStars, c = Math.cos(a2), sn = Math.sin(a2); dirs.push([u[0] * c + w[0] * sn, u[1] * c + w[1] * sn, u[2] * c + w[2] * sn]); }
    } else dirs = fibDirs(P.subStars, rng, randRot(rng), P.dirJit * 2);
    const keep = P.subKeep >= 0 ? P.subKeep : P.subPattern === 'cross' ? 0.25 : 0.35;
    // 每朵子花大小离散（小割玉的割药量不同）；子星自己的阻力 / 下坠（子星比主星小、减速更快）
    const fs = P.subScaleJit > 0 ? Math.max(0.4, 1 + P.subScaleJit / 100 * rng.n()) : 1;
    for (const d of dirs) {
      const sp = P.subSpeed * fs * (1 + (P.subSpeedJit >= 0 ? P.subSpeedJit : P.speedJit) / 100 * rng.n());   // 子星初速离散（-1 = 同主星；千轮：子弹飞得远近不一、小花本身要圆）
      const b = P.subBurn * (1 + P.burnJit / 100 * rng.n());
      const ch = this.mk(s.x, s.y, s.z, s.vx * keep + d[0] * sp, s.vy * keep + d[1] * sp, s.vz * keep + d[2] * sp,
        Math.max(0.05, b), 2, P.subTail, P.headBright);
      if (P.subVt > 0) ch.c = G / (P.subVt * P.subVt);
      if (P.subGrav >= 0) ch.grav = P.subGrav;
      this.stars.push(ch);
    }
    this.flashes.push({ t0: this.t, x: s.x, y: s.y, I: P.subFlash >= 0 ? P.subFlash : P.flash * 0.3, sig: Math.max(1, P.subSpeed * 0.05) });
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
    const P = this.P, rng = starRng(s.id, P.seed, 41);
    for (let i = 0; i < P.crackle; i++) {
      // 4.3 爆裂范围 / 速度（用户 10-03 选「加」）：小闪离星最远 crackleR 米（最近 = 1/7），每晚 1 秒往外多飞 crackleV 米；默认 3.5 / 0 = 以前的 0.5–3.5 m、不动（逐位不变）
      const dt = P.crackleDelay * (0.3 + 1.4 * rng.u()), d = randUnit(rng), r = (0.5 + 3 * rng.u()) * (P.crackleR == null ? 1 : P.crackleR / 3.5) + (+P.crackleV || 0) * dt;
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
    const P = this.P, rng0 = this.rng, gy = -G * P.grav, st = this.stars, sp = this.sp;
    const bee = P.type === 'hachi', sq = Math.sqrt(h), windy = P.wind !== 0 || !!this.tm, water = P.waterRefl > 0;
    let dead = 0;
    for (let i = 0; i < st.length; i++) {
      const s = st[i];
      if (!s.alive) { dead++; continue; }
      const rng = s.rng || rng0;
      s.age += h;
      let ax = 0, ay = 0; if (windy) [ax, ay] = this.air(s.x, s.y, this.t);
      const rx = s.vx - ax, ry = s.vy - ay, rz = s.vz, v = Math.hypot(rx, ry, rz);
      // 燃烧减质量：星体半径随燃烧线性变小，阻力系数 ∝ 1/半径
      let c = s.c; if (P.massLoss > 0 && s.kind !== 5) c /= Math.max(0.15, 1 - P.massLoss * clamp((s.age - s.ign) / Math.max(0.05, (s.mref != null ? s.mref : s.vis != null ? s.vis : s.burn) - s.ign), 0, 1));
      {
        // 二次阻力半隐式（相对风速度按 1/(1 + c·v·h) 衰减），不会因为终端速度很小而反号发散成 NaN（问题清单 E4）
        const k = 1 / (1 + c * v * h);
        s.vx = ax + rx * k; s.vy = ay + ry * k + (s.kind === 5 ? -G : s.grav != null ? -G * s.grav : gy) * h; s.vz = rz * k;
      }
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
      if (s.vis != null && !s.ended && s.age >= s.vis) { s.ended = true; if (P.crackle > 0 && !s.dark) this.crackleBurst(s); }     // 4.3（H8）：被「发光星比例」藏起来的星不爆
      const hotOff = P.sparkStop > 0 && s.kind !== 5 && s.age - s.ign > P.sparkStop, embAll = P.emberFrac > 0 && P.emberAll;
      if (s.rate > 0 && !this.noSparks && s.age >= s.ign && !s.ended && !(hotOff && !embAll) && !(P.sparkStart > 0 && s.kind !== 5 && s.age - s.ign < P.sparkStart)) {
        const fr = (s.kind === 5 || P.sparkRateEnd == null || P.sparkRateEnd === 1 ? 1 : Math.max(0, 1 + (P.sparkRateEnd - 1) * clamp((s.age - s.ign) / Math.max(0.05, (s.vis != null ? s.vis : s.burn) - s.ign), 0, 1)))
          * (+P.sparkRamp > 0 && s.kind !== 5 ? sparkRampAt(P, s.id, s.age - s.ign - (P.sparkStart > 0 ? P.sparkStart : 0)) : 1);     // 4.2.17 火花起势
        const k = rng.poisson(s.rate * fr * h), spr = P.sparkSpread, T0 = s.kind === 5 && P.riseStyle === 'silver' ? P.T0 + 250 : P.T0, lf = s.kind === 5 && P.riseStyle === 'silver' ? 1.5 : 1;
        for (let j = 0; j < k; j++) {
          const u = rng.u(), inh = P.sparkInherit * (0.3 + 1.4 * rng.u()), px = s.x - s.vx * h * u, py = s.y - s.vy * h * u;
          const [aX, aY] = windy ? this.air(px, py, this.t) : [0, 0];
          // 普通空中星：随发射阶段改变新火花的寿命；已有火花仍按各自出生时确定的寿命冷却。
          const le = s.kind === 5 || P.sparkLifeEnd == null ? 1 : P.sparkLifeEnd;
          const lj = s.kind === 5 || P.sparkLifeJit == null ? 0.45 : P.sparkLifeJit / 100;
          const start = P.sparkStart > 0 && s.kind !== 5 ? P.sparkStart : 0;
          const end = Math.min((s.vis != null ? s.vis : s.burn) - s.ign, P.sparkStop > 0 && s.kind !== 5 && !embAll ? P.sparkStop : 1e9);
          const phase = clamp((s.age - s.ign - u * h - start) / Math.max(0.05, end - start), 0, 1);
          const lifeScale = 1 + (le - 1) * phase;
          const lfe = P.sparkLife * lf * lifeScale * Math.exp(lj * rng.n()), rd = rng.u(), emb = P.emberFrac > 0 && s.kind !== 5 && rd < P.emberFrac;
          if (hotOff && !emb) continue;
          sp.add(px, py, s.z - s.vz * h * u, s.vx * inh + rng.n() * spr, s.vy * inh + rng.n() * spr, s.vz * inh + rng.n() * spr,
            u * h, emb ? P.emberLife * Math.exp(0.2 * rng.n()) : lfe, T0 + 120 * rng.n(), rd, aX, aY, s.birth + (s.vis != null ? s.vis : s.burn));
        }
      }
      if (s.kind === 5) {
        const frac = s.age / s.burn;
        if (this.kobana && this.kobDone < this.kobana && frac >= (this.kobDone + 0.6) / (this.kobana + 0.6)) { this.kobDone++; this.kobanaBurst(s); }
        if (this.split && frac >= 0.45 && !s.child) {
          this.split = false; s.alive = false; s.tDead = this.t; const n = P.bunpoN;
          for (let q = 0; q < n; q++) {
            const a = (q / Math.max(1, n - 1) - 0.5) * 0.9 + rng.n() * 0.05, v = Math.hypot(s.vx, s.vy) * 0.95;
            const c = this.mk(s.x, s.y, s.z, Math.sin(a) * v, Math.cos(a) * v, 0, s.burn - s.age, 5, s.rate * 0.7, s.I * 0.8); c.child = true; c.c = this.cShell; c.svx = Math.sin(a) * v; this.stars.push(c);
          }
          this.events.push([this.t, 'split']);
          continue;
        }
      }
      if (water && s.y < 0 && s.age > 0.05 && s.kind !== 5) { s.alive = false; s.tDead = this.t; this.flashes.push({ t0: this.t, x: s.x, y: 0, abs: 0.5, sig: 0.8, tau: 0.05, cut: 0.2 }); continue; }
      if (s.age >= s.burn) {
        s.alive = false;
        if (s.kind === 1) this.subBurst(s);
        else if (s.kind === 6) this.smallFlower(s);
        else if (s.kind === 5 && !s.child) { this.flashes.push({ t0: this.t, x: s.x, y: s.y, I: 0.6, sig: 3 }); this.events.push([this.t, 'apex']); }
        else if (P.crackle > 0 && (s.kind === 0 || s.kind === 2) && !s.dark) this.crackleBurst(s);
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
    const P = this.P, off = s.st1 != null ? s.st1 : s.ign, a = s.age - off, end = s.vis != null ? s.vis : s.burn;
    if (s.dark || a < 0 || s.age >= end) return 0;
    const dur = Math.max(0.05, end - off), ign = Math.min(1, a / 0.05), rem = end - s.age;
    let f = 1;
    if (P.fade > 0 && s.kind !== 1 && s.kind !== 5) f = clamp(rem / (dur * P.fade), 0, 1);
    const last = s.kind === 1 || s.kind === 5 ? 1 : 1 + P.lastFlare * Math.exp(-((rem / 0.05) ** 2));
    let st = 1;
    if (P.strobeHz > 0 && s.kind !== 1 && s.kind !== 5 && a > P.strobeStart * dur) {
      const ph = (a * P.strobeHz * (0.85 + 0.3 * s.ph2) + s.ph) % 1; st = ph < P.strobeDuty ? 1.6 : 0.03;
    }
    if (P.flutter > 0) st *= 0.55 + 0.45 * Math.abs(Math.cos(3.1416 * P.flutterHz * s.age + s.ph * 6.2832));
    // 分层星外层（引き）：前段只有木炭火焰、星头暗；到 headDimUntil 秒前后 0.25 s 过渡到色光层的正常亮度
    if (P.headDim < 1 && P.headDimUntil > 0 && s.kind !== 1 && s.kind !== 5) { const x = clamp((a - P.headDimUntil + 0.25) / 0.25, 0, 1); st *= P.headDim + (1 - P.headDim) * x * x * (3 - 2 * x); }
    if (s.kind === 5 && P.riseStyle === 'fue') st *= 0.6 + 0.4 * Math.sin(6.2832 * 9 * s.age);
    return s.I * s.flick * ign * f * last * st;
  }
  // 每点 [x, y, 强度, 尺寸]：3.7 是总光量 / 2σ，4.0 是面亮度 / 亮核直径（米）。
  gather(bufH, bufT) {
    const P = this.P, rr = this.rr, refl = P.waterRefl;
    let nh = 0; const capH = bufH.length >> 2, capT = bufT.length >> 2;
    const push = (buf, n, x, y, I, sz) => { const k = n * 4; buf[k] = x; buf[k + 1] = y; buf[k + 2] = I; buf[k + 3] = sz; };
    for (const s of this.stars) {
      if (!s.alive) continue;
      const I = this.headI(s); if (I <= 0) continue;
      if (nh >= capH - 1) { this.dropH = (this.dropH || 0) + 1; continue; }     // 4.3（E9）：星头缓冲满了没画的星（自检报警）
      const sz = P.headSize * (s.kind === 1 || s.kind === 6 ? 0.8 : 1);
      push(bufH, nh++, s.x, s.y, I, sz);
      // 尾迹外形「泪滴星头」（headTear）：沿运动反方向补几个越来越小、越来越暗的点，速度越快拉得越长（默认 0 不进来）
      if (P.headTear > 0 && nh < capH - 5) { const v = Math.hypot(s.vx, s.vy); if (v > 0.5) { const ux = -s.vx / v, uy = -s.vy / v, len = P.headTear * (sz * 2 + v * 0.025);
        for (let k = 1; k <= 4; k++) { const f = k / 4; push(bufH, nh++, s.x + ux * len * f, s.y + uy * len * f, I * (1 - 0.75 * f), sz * (1 - 0.7 * f)); } } }
      if (refl > 0 && s.y > 0) push(bufH, nh++, s.x + ripple(s.y, this.t), -s.y, I * refl * Math.exp(-s.y / 400), sz * 1.3);
    }
    // 爆裂小闪、落水闪光（f.abs）：照旧按星头核画（实心亮核 + 光晕）
    for (const f of this.flashes) {
      if (f.abs == null) continue;
      const a = this.t - f.t0, cut = f.cut || 0.25; if (a < 0 || a > cut || nh >= capH - 1) continue;
      const I = f.abs * Math.exp(-a / f.tau) / (6.2832 * f.sig * f.sig);
      push(bufH, nh++, f.x, f.y, I, f.sig * 2);
      if (refl > 0 && f.y >= 0) push(bufH, nh++, f.x, -f.y - 0.01, I * refl, f.sig * 2.6);
    }
    // 4.3.3（用户 10-04 11:56）：开花闪光（主花、子花开花、曲导到顶）放在最后，调用方从 this.gFlash 起按高斯画（PT_GAUSS，σ = f.sig）：
    // 一团柔光，峰值亮度和以前的实心亮核一样（= 开花闪光 × 1.5 × 衰减），没有硬边、没有伸出格子的光晕。强度照旧由「开花闪光」调。
    // 高斯点的强度口径是总光量（峰值 × 2πσ²），所以这里不再除面积。
    this.gFlash = nh;
    for (const f of this.flashes) {
      if (f.abs != null) continue;
      const a = this.t - f.t0, cut = f.cut || 0.25; if (a < 0 || a > cut || nh >= capH - 1) continue;
      if (P._unit) continue;      // 单元序列不含开花闪光（另挂）
      const I = f.I * Math.exp(-a / 0.035) * 1.5 * 6.2832 * f.sig * f.sig;
      push(bufH, nh++, f.x, f.y, I, f.sig * 2);
      if (refl > 0 && f.y >= 0 && nh < capH - 1) push(bufH, nh++, f.x, -f.y - 0.01, I * refl * 1.69, f.sig * 2.6);     // 倒影 σ × 1.3，总光量 × 1.69 保持峰值 × refl
    }
    const sp = this.sp; let nt = 0;
    const gl = P.glitter, gd = P.glitterDelay;
    for (let i = 0; i < sp.n && nt < capT - 1; i++) {
      const emb = P.emberFrac > 0 && sp.rnd[i] < P.emberFrac;
      const T = emb ? sp.T0[i] : sp.T0[i] * (1 - P.cooling * sp.age[i] / sp.life[i]);
      let g = (T - 900) / 1150; if (g <= 0 && gl <= 0) continue; g = g > 0 ? g * g * g : 0;
      if (emb) { const x = sp.age[i] / sp.life[i], ss = e => e <= 0 ? 0 : e >= 1 ? 1 : e * e * (3 - 2 * e); g *= P.emberBright * Math.exp(-2 * x) * (1 - ss((x - 0.75) / 0.25)) * (P.emberFollow > 0 ? 1 - ss((this.t - sp.pd[i] + 0.15) / (P.emberFollow + 0.15)) : 1) * (P.emberEnd > 0 ? 1 - ss((this.t - P.emberEnd + 0.6) / 0.9) : 1); }
      if (gl > 0) { const tf = gd * (0.5 + sp.rnd[i]), e = (sp.age[i] - tf) / 0.03; g = g * (1 - 0.85 * gl) + gl * 6 * Math.exp(-e * e); }
      const j = i * 3, x = sp.p[j], y = sp.p[j + 1];
      if (refl > 0 && y < 0) continue;
      const I = g * (1 + P.twinkle * (rr.u() * 2 - 1)) * P.sparkBright * 0.6;
      push(bufT, nt++, x, y, I, P.sparkSize * (emb ? P.emberSize : 1));
      if (refl > 0 && nt < capT - 1) push(bufT, nt++, x + ripple(y, this.t), -y, I * refl * Math.exp(-y / 400), P.sparkSize * 1.3);
    }
    return [nh, nt];
  }
  // 4.2.22 实时模拟专用：不倒回，按「现在的位置 − 速度 × 回看时长 + ½ 加速度 × 时长²」画 back 秒之前的星头（加速度 = 阻力 + 重力，不含风 / 摆动）。
  // 以前每一帧快门窗口和上一帧重叠，都要从快照倒回去重新走一遍（一帧走 5 倍的物理步，几百颗星时每帧 20 多毫秒，还每帧深拷贝几百颗星 → 垃圾回收一顿一顿）。
  // 只给实时模拟用；烘焙 / 定帧仍旧精确倒回，产物不变。回看最多几十毫秒，误差远小于一个像素的运动模糊。
  gatherBack(bufH, bufT, back) {
    if (!(back > 0)) return this.gather(bufH, bufT);
    const P = this.P, st = this.stars, n = st.length, sv = new Float64Array(n * 4), gy = -G * P.grav, b2 = 0.5 * back * back;
    for (let i = 0; i < n; i++) {
      const s = st[i]; if (!s.alive) continue;
      const k = i * 4; sv[k] = s.x; sv[k + 1] = s.y; sv[k + 2] = s.z; sv[k + 3] = s.age;
      let c = s.c; if (P.massLoss > 0 && s.kind !== 5) c /= Math.max(0.15, 1 - P.massLoss * clamp((s.age - s.ign) / Math.max(0.05, (s.mref != null ? s.mref : s.vis != null ? s.vis : s.burn) - s.ign), 0, 1));
      const v = Math.hypot(s.vx, s.vy, s.vz), ax = -c * v * s.vx, ay = -c * v * s.vy + (s.kind === 5 ? -G : s.grav != null ? -G * s.grav : gy), az = -c * v * s.vz;
      s.x -= s.vx * back - ax * b2; s.y -= s.vy * back - ay * b2; s.z -= s.vz * back - az * b2; s.age -= back;
    }
    const t0 = this.t; this.t -= back;
    try { return this.gather(bufH, bufT); }
    finally { this.t = t0; for (let i = 0; i < n; i++) { const s = st[i]; if (!s.alive) continue; const k = i * 4; s.x = sv[k]; s.y = sv[k + 1]; s.z = sv[k + 2]; s.age = sv[k + 3]; } }
  }
  // 快照（4.1.2）：深拷贝全部会变的状态（星、随机数、闪光、事件），P、湍流模态只读共用。
  // 实时模拟相邻两帧的快门窗口重叠，要回到上一帧窗口起点附近：从快照接着算，结果和从 0 算逐位相同。
  // CPU 火花引擎（几十万粒火花的数组）不做快照，照旧从头算。
  snapshot() {
    if (!this.noSparks) return null;
    const memo = new Map([[this.P, this.P]]); if (this.tm) memo.set(this.tm, this.tm);
    return simClone(this, memo);
  }
}
// 把 src 的状态整个换进 sim（保持对象身份；快照之后才出现的字段删掉，不留「未来」的值）
function simRestore(sim, src) { for (const k of Object.keys(sim)) if (!(k in src)) delete sim[k]; Object.assign(sim, src); }
function simClone(o, memo) {
  if (o === null || typeof o !== 'object') return o;
  let c = memo.get(o); if (c) return c;
  if (ArrayBuffer.isView(o)) { c = o.slice(); memo.set(o, c); return c; }
  if (Array.isArray(o)) { c = new Array(o.length); memo.set(o, c); for (let i = 0; i < o.length; i++) c[i] = simClone(o[i], memo); return c; }
  c = Object.create(Object.getPrototypeOf(o)); memo.set(o, c);
  for (const k of Object.keys(o)) c[k] = simClone(o[k], memo);
  return c;
}
// 水面倒影的横向抖动（波纹）
function ripple(y, t) { return 0.012 * y * Math.sin(0.35 * y + 7 * t) + 0.3 * Math.sin(1.7 * y + 3 * t); }
