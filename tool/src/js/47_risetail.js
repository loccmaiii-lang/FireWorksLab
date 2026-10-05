// =====================================================================
//  升空尾缀 · 循环层 + 粒子发射器（花型 tailS / tailM / tailL，产物 form 'emitset'，4.1.0）
//  原理：analysis/原理/升空尾缀.md 第 7c–7e 节（对话框11，2026-10-02）。
//  · 弹道：Cascade 原生的线性阻力 + 重力（引擎里循环层粒子就是这样飞的），由「开花高度 / 升空时间 / 开花时速度」反解出膛速度和阻力；
//    粒子层的出生位置、初速曲线取同一条弹道 → 星头和火星在引擎里不会错开（10-01 的坑）。
//  · 自转螺旋：弹体出膛就带自转、全程转速不变；喷口在弹体外缘（半径 = 弹径 / 2）跟着转圈，火星切向甩出 →
//    波长 = 弹体速度 ÷ 转速，能看见的圈数 = 转速 × 火星寿命，波幅 ≈ 甩出速度 ÷ 阻力。火星出生后照常飞、照常散开（不冻住）。
//  · 循环层（序列面片，CPU 1 颗，速度朝向，星头在面片中心）：星头（筒口燃烧焰：亮核 + 向后短焰）+ 白热段火粉。
//    在弹体随体坐标里按「出膛速度」烘成真循环（整数圈自转、整数个脉动周期）；引擎里按弹体速度缩放面片长度。
//    开花后换「贴图动态消散」序列：停喷，已有火粉各按自己的寿命熄灭（不是从下往上擦）；另写 dissolve 动态参数。
//  · 粒子层（46_emitset.js 的通用发射器）：金火星按粒径分细 / 中 / 粗三档（越粗越亮、越长寿、阻力越小 → 有亮有暗、错落熄灭），
//    落火，烟带。PC 用 GPU、手机用 CPU 并减量。
//  · 喷射脉动：星头亮度、火粉亮度、粒子出生率同一个周期函数（按循环周期取整，循环层贴图和粒子曲线对得上）。
// =====================================================================
// 线性阻力弹道：给开花高度 H、升空时间 T、开花时竖直速度 vb，反解阻力 k 和竖直出膛速度
//   4.4.5 rtBall = 1 → 物理弹道（rtBallisticPhys）
const rtBallCache = new Map();
function rtBallistic(P) {
  if (+P.rtBall === 1) {
    const key = [P.rtH, P.rtVb, P.rtLean, P.rtD, P.rtVt].join('|');
    let b = rtBallCache.get(key); if (!b) { b = rtBallisticPhys(P); rtBallCache.set(key, b); if (rtBallCache.size > 32) rtBallCache.delete(rtBallCache.keys().next().value); }
    return b;
  }
  const H = P.rtH, T = P.rtT, vb = P.rtVb, th = (P.rtLean || 0) * Math.PI / 180;
  const f = k => (vb + G / k) * (Math.exp(k * T) - 1) / k - G * T / k - H;
  let k = 1e-6, ok = true;
  if (f(1e-6) > 0) { ok = false; }      // 没有阻力也到不了这么低（开花时速度给大了）：按无阻力
  else { let a = 1e-6, b = 20; for (let i = 0; i < 80; i++) { const m = (a + b) / 2; if (f(m) > 0) b = m; else a = m; } k = (a + b) / 2; }
  const vz0 = ok ? (vb + G / k) * Math.exp(k * T) - G / k : vb + G * T, vx0 = vz0 * Math.tan(th);
  const pos = t => { const e = Math.exp(-k * t), s1 = (1 - e) / k; return [vx0 * s1, 0, vz0 * s1 - G / k * (t - s1)]; };
  const vel = t => { const e = Math.exp(-k * t); return [vx0 * e, 0, (vz0 + G / k) * e - G / k]; };
  const Hreal = pos(T)[2];
  return { k, vz0, vx0, v0: Math.hypot(vx0, vz0), T, H: Hreal, Hwant: H, vb: vel(T)[2], ok, th, pos, vel };
}
// 4.4.5 物理弹道（RT5；用户 10-04 17:27「上升太匀速，不符合物理」，spec/UE实测.md 17:27 一节）：
//   弹体按平方阻力飞：加速度 = −g − g·|v|·v / vt²。终端速度 vt 由弹径定：vt = √(4/3 · ρ弹 · D · g / (ρ空气 · Cd))，
//   ρ弹 600 kg/m³（含空腔 / 发射药烧掉后）、ρ空气 1.2、Cd 0.47（球）→ 30 cm 弹约 65 m/s；rtVt > 0 时直接用它。
//   给开花高度 H 和开花时竖直速度 vb，反解出膛速度；升空时间由此算出（不再手填）。出膛快、前段减速猛、顶点附近「吊住」。
//   竖直发射有解析解（v0² = (vt² + vb²)·e^(2gH/vt²) − vt²）；有倾角时数值积分（RK4，1/240 s）+ 二分出膛速度。
//   Cascade 的 Drag 只有线性：循环层 / 星头光晕（CPU 单颗）用 Velocity Over Life（Absolute）按寿命写速度；GPU 火花的出生位置 / 初速本来就是按发射器时间的曲线。
const rtVtOf = P => +P.rtVt > 0 ? +P.rtVt : Math.sqrt(4 / 3 * 600 * Math.max(0.03, +P.rtD || 0.15) * G / (1.2 * 0.47));
function rtBallisticPhys(P) {
  const H = Math.max(1, +P.rtH || 100), vb = Math.max(0, +P.rtVb || 0), th = (P.rtLean || 0) * Math.PI / 180, vt = rtVtOf(P), kq = G / (vt * vt), dt = 1 / 240;
  const acc = (vx, vz) => { const s = Math.hypot(vx, vz); return [-kq * s * vx, -G - kq * s * vz]; };
  const step = (x, z, vx, vz, h) => {
    const a1 = acc(vx, vz), v2x = vx + a1[0] * h / 2, v2z = vz + a1[1] * h / 2, a2 = acc(v2x, v2z), v3x = vx + a2[0] * h / 2, v3z = vz + a2[1] * h / 2, a3 = acc(v3x, v3z), v4x = vx + a3[0] * h, v4z = vz + a3[1] * h, a4 = acc(v4x, v4z);
    return [x + h / 6 * (vx + 2 * v2x + 2 * v3x + v4x), z + h / 6 * (vz + 2 * v2z + 2 * v3z + v4z), vx + h / 6 * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]), vz + h / 6 * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1])];
  };
  // 飞到竖直速度降到 vb 为止（最后一步按线性插值截到正好 vb）；keep = 记下整条轨迹
  const fly = (v0, keep) => {
    let s = [0, 0, v0 * Math.sin(th), v0 * Math.cos(th)], t = 0; const tr = keep ? [[0, ...s]] : null;
    while (s[3] > vb && t < 120) { const n = step(...s, dt); if (n[3] <= vb) { const f = (s[3] - vb) / Math.max(1e-9, s[3] - n[3]); s = s.map((x, i) => x + (n[i] - x) * f); t += dt * f; if (keep) tr.push([t, ...s]); break; } s = n; t += dt; if (keep) tr.push([t, ...s]); }
    return { t, s, tr };
  };
  let lo = vb + 0.1, hi = 3000;
  if (Math.abs(th) < 1e-9) { const g0 = Math.sqrt(Math.max(0, (vt * vt + vb * vb) * Math.exp(2 * G * H / (vt * vt)) - vt * vt)); lo = Math.max(lo, g0 * 0.9); hi = Math.max(lo + 1, g0 * 1.1); }
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (fly(m, false).s[1] > H) hi = m; else lo = m; }
  const v0 = (lo + hi) / 2, F = fly(v0, true), tr = F.tr, T = F.t, n = tr.length;
  const at = (t, i0) => { const u = clamp(t, 0, T); let i = Math.min(n - 2, Math.max(0, Math.floor(u / dt))); while (i > 0 && tr[i][0] > u) i--; while (i < n - 2 && tr[i + 1][0] < u) i++;
    const a = tr[i], b = tr[i + 1], f = clamp((u - a[0]) / Math.max(1e-9, b[0] - a[0]), 0, 1); return [a[i0] + (b[i0] - a[i0]) * f, a[i0 + 1] + (b[i0 + 1] - a[i0 + 1]) * f]; };
  // 过了开花时刻（循环层不再用，粒子表 / 实时模拟偶尔会问）：按开花时的速度直线外推
  const pos = t => { if (t <= T) { const p = at(t, 1); return [p[0], 0, p[1]]; } const e = tr[n - 1]; return [e[1] + e[3] * (t - T), 0, e[2] + e[4] * (t - T)]; };
  const vel = t => { const v = at(Math.min(t, T), 3); return [v[0], 0, v[1]]; };
  return { k: 0, quad: true, vt, kq, vz0: v0 * Math.cos(th), vx0: v0 * Math.sin(th), v0, T, H: F.s[1], Hwant: +P.rtH, vb: F.s[3], ok: true, th, pos, vel };
}
// 面板「弹道」下面的只读结果行
function rtBallInfoHTML(P) {
  if (!P || !isEmit(P)) return '';
  const b = rtBallistic(P), sp = t => { const v = b.vel(t); return Math.hypot(v[0], v[2]); };
  if (!b.quad) return `<p class="hint endinfo">线性阻力：出膛 ${b.v0.toFixed(1)} m/s · 阻力 ${b.k.toFixed(3)} /s · ${b.T.toFixed(2)} s 到 ${b.H.toFixed(0)} m · 1 s 后 ${sp(Math.min(1, b.T)).toFixed(0)} m/s（减速很匀）</p>`;
  return `<p class="hint endinfo">物理弹道：终端速度 ${b.vt.toFixed(1)} m/s${+P.rtVt > 0 ? '' : `（按弹径 ${P.rtD} m 算）`} · 出膛 <b>${b.v0.toFixed(1)}</b> m/s → 1 s 后 ${sp(Math.min(1, b.T)).toFixed(0)} m/s → 开花 ${b.vb.toFixed(1)} m/s · 升空 <b>${b.T.toFixed(2)}</b> s 到 ${b.H.toFixed(0)} m（升空时间是算出来的）</p>`;
}
// 物理弹道导出用：按相对寿命（0–1 = 0–T）的速度曲线（m/s），抽稀到误差 < 0.05 m/s
function rtVelLife(ball, n = 240) { const k = []; for (let i = 0; i <= n; i++) { const u = i / n, v = ball.vel(u * ball.T); k.push([u, [v[0], 0, v[2]]]); } return esThin(k, 0.05); }
// 循环周期：64 帧 / 30 fps 附近、整数圈自转、不超过 30 fps
function rtLoopInfo(P) {
  const F = layoutOf(P).F, base = F / 30, f = Math.max(0, P.rtSpin || 0);
  // 整数圈、周期 ≥ 64 / 30 s（帧率 ≤ 30 fps，引擎每 tick 取一帧不会跳过）
  const nRev = f > 0 ? Math.max(1, Math.ceil(f * base - 1e-9)) : 0, Tl = f > 0 ? nRev / f : base;
  const nP = P.rtPulse > 0 ? Math.max(1, Math.round((P.rtPulseHz || 6) * Tl)) : 0, nP2 = P.rtPulse > 0 ? Math.max(1, Math.round((P.rtPulseHz || 6) * 1.73 * Tl)) : 0;
  const r = new RNG((P.seed | 0) * 41 + 3), p1 = r.u() * 6.2832, p2 = r.u() * 6.2832;
  const pulse = t => P.rtPulse > 0 ? Math.max(0.05, 1 + P.rtPulse * (0.65 * Math.sin(6.2831853 * nP * t / Tl + p1) + 0.35 * Math.sin(6.2831853 * nP2 * t / Tl + p2))) : 1;
  return { F, Tl, nRev, fps: F / Tl, pulse };
}
// 火粉的寿命上限（对数正态取到 +2.5σ）
const rtPowderLifeMax = P => P.rtALife * Math.exp(2.5 * (P.rtALsig || 0));
// 4.4：循环层出场的淡入时长（尾迹攒满要多久 ≈ 白热火粉的寿命）和 t 时刻的倍数（smoothstep）
const rtLoopIn = P => clamp(+P.rtALife || 0.6, 0.3, 1.5);
const rtLoopInAt = (P, t) => { const u = clamp(t / rtLoopIn(P), 0, 1); return u * u * (3 - 2 * u); };
// 白热段长度（随弹体速度）：速度 × 白热时间 + 向后喷出后停下的距离
const rtWhiteLen = (P, V) => Math.max(0.5, Math.abs(V) * P.rtALife + (P.rtAJet || 0) / Math.max(1, P.rtAKd));
// 火粉第 gi 颗（周期性编号：每个循环周期正好 M 颗，编号取模定随机量 → 真循环）
function rtPowderOf(P, LI, gi, M, rate, salt) {
  const key = ((gi % M) + M) % M, K = key * 7919 + salt;
  const tb = (gi + phh(K, 1)) / rate;
  return {
    tb, life: P.rtALife * Math.exp((P.rtALsig || 0) * clamp(phn(K, 2), -2.5, 2.5)),
    j: P.rtAJet * (0.75 + 0.5 * phh(K, 3)), kd: P.rtAKd * (0.7 + 0.6 * phh(K, 4)),
    cx: P.rtACone * phn(K, 5), cz: P.rtACone * 0.5 * phn(K, 7),
    size: P.rtASize * (0.6 + 0.8 * phh(K, 8)), br: 0.6 + 0.8 * phh(K, 9), fl: P.rtFling * (0.8 + 0.4 * phh(K, 10)),
    ph: 6.2831853 * ((P.rtSpin || 0) * tb + (P.rtSpinPh || 0)),
    // 小涡 / 弹体尾流：每颗火粉被一小团空气带着漂（大涡在火粉寿命内看不出来，循环层只放小涡 → 循环不破）
    wx: (P.rtTurbS || 0) * phn(K, 11), wz: (P.rtTurbS || 0) * 0.7 * phn(K, 12)
  };
}
function rtPowderI(P, q, a, pulse) { const u = a / q.life; return P.rtAI * q.br * pulse * Math.min(1, a / 0.015) * Math.pow(Math.max(0, 1 - u), P.rtAWarm || 1); }
// 星头：亮核 + 沿「向后方向」的短焰（一串点，越往后越宽越暗）。hx, hz = 星头位置；dx, dz = 向后单位向量
function rtHeadPts(P, hx, hz, dx, dz, I, k) {
  bufH[k++] = hx; bufH[k++] = hz; bufH[k++] = I; bufH[k++] = P.rtHeadSize;
  const L = P.rtHeadFl || 0;
  if (L > 1e-3 && (P.rtHeadFlI || 0) > 0) {
    const n = 16; let ws = 0; const w = []; for (let i = 0; i < n; i++) { const q = (i + 0.5) / n, v = Math.exp(-2.5 * q); w.push(v); ws += v; }
    for (let i = 0; i < n; i++) { const q = (i + 0.5) / n; bufH[k++] = hx + dx * q * L; bufH[k++] = hz + dz * q * L; bufH[k++] = I * P.rtHeadFlI * w[i] / ws * 4; bufH[k++] = P.rtHeadSize * (0.55 + 0.6 * q); }
  }
  return k;
}
// 贴图里的火星（4.2.2，用户 19:25「渲染出的素材也要有粒子」）：细火星的一部分（比例 rtFTex）烘进循环层贴图，其余留在 GPU 发射器。
//   细火星寿命短（中档 0.9 s）、出生后在面片长度以内就烧完，正好放进贴图：随体坐标、和白热段火粉同一套周期编号
//   （每个循环周期正好 M 颗，编号取模定随机量 → 真循环），运动 / 散开 / 小涡 / 拖影和 GPU 细火星同一套公式（随机量另取，不是同一批）。
//   中 / 粗火星飞得远、留在 GPU。贴图火星 + GPU 细火星的总出生率 = 原来的细火星出生率（数量是第 2 / 3 版按参考图定的）。
//   亮度口径（rtTexI）：贴图是灰度 + Ramp，太暗的点在 Ramp 低端是暗橙红、亮到中段才是金色，和 GPU 的「× 亮度」不是一个口径；
//   1 = 一颗标称尺寸的细火星在燃烧温度时的光量是一颗白热段火粉（亮度 1）的 1%。
// 4.4.5（RT5）：中火花也能烘进贴图（rtMTex，缺省 0 = 旧）—— UE 里一条尾缀的 GPU 粒子同时活着要 ≤ 800（用户 10-04 14:58），密的、会闪的火花进贴图
const RT_TEX_CLS = [['F', 'SparksFine', 5], ['M', 'SparksMid', 6]];
// ---- 4.5.1 RT6 近段 / 远段（rtFar = 1；用户 10-05 01:28「合并渲染再加 800 个 cascade 粒子」，02:25 同意方案 6.4）----
//   正确的分法是「年轻的随体、年老的随地」：年龄 < 交接年龄的火花（星头、白热段、刚喷出的细 / 中 / 粗火花）跟着弹体进近段循环层（真循环）；
//   年老的已经被阻力停在空气里，用世界坐标烘一张从发射点到开花点的全程序列（远段 TrailFar，一次性不循环，开花后自己演完熄灭）。
//   两段按年龄交叉淡化：近段权重 = 1 − smoothstep(a0, a1, 年龄)，远段 = 剩下的，相加 = 1（实时模拟画的就是两段之和）。
//   GPU 火花是「再加」：粗 / 闪烁（中）/ 细各给一个同时活着的颗数，GPU 那部分从贴图里扣掉 → 贴图 + GPU = 实时模拟里的全部，一颗不多一颗不少。
const rtIsFar = P => +P.rtFar === 1;
const rtNearA = P => { const a0 = Math.max(0.02, +P.rtNearA0 || 0.6); return [a0, Math.max(a0 + 0.05, +P.rtNearA1 || 1)]; };
function rtNearW(P) { if (!rtIsFar(P)) return null; const [a0, a1] = rtNearA(P); return a => 1 - smoothstepJS(a0, a1, a); }
const RT_TEX_CLS_FAR = [...RT_TEX_CLS, ['C', 'SparksCoarse', 7]];
const rtTexCls = P => rtIsFar(P) ? RT_TEX_CLS_FAR : RT_TEX_CLS;
// GPU 预算（同时活着的颗数）→ 每档 GPU 出生率；几档 + 落火 + 末段爆亮加起来超过「GPU 粒子上限」就一起按比例降，降掉的火花回到贴图（总数不变）
const rtGpuSplitCache = new Map();
function rtGpuSplit(P) {
  const key = ['F', 'M', 'C'].map(k => [P['rt' + k + 'Rate'], P['rt' + k + 'Life'], P['rtGpu' + k]].join(',')).join('|') + '|' + [P.rtGpuMax, P.rtERate, P.rtELife, P.rtPopRate, P.rtCLife, P.rtPulse, P.rtPulseHz, P.rtSpin, P.seed, P.cols, P.rows, P.chans].join(',');
  let o = rtGpuSplitCache.get(key); if (o) return o;
  const pk = 1;     // 4.5.4：近段 + 远段时 GPU 发射器不跟喷射脉动（出生率是常数，脉动在贴图里）
  const g = {}; let est = 0;
  for (const k of ['F', 'M', 'C']) { const R = Math.max(0, +P['rt' + k + 'Rate'] || 0), L = Math.max(0.05, +P['rt' + k + 'Life'] || 1); g[k] = Math.min(R, Math.max(0, +P['rtGpu' + k] || 0) / (L * pk)); est += g[k] * pk * L; }
  est += (P.rtERate > 0 ? P.rtERate * pk * P.rtELife : 0) + (P.rtPopRate > 0 ? P.rtPopRate * pk * P.rtCLife * 0.9 : 0);
  const cap = +P.rtGpuMax > 0 ? +P.rtGpuMax : 0, f = cap > 0 && est > cap ? cap / est : 1;
  for (const k of ['F', 'M', 'C']) g[k] *= f;
  o = { g, f, est: Math.round(est * f), pk }; rtGpuSplitCache.set(key, o); if (rtGpuSplitCache.size > 64) rtGpuSplitCache.delete(rtGpuSplitCache.keys().next().value);
  return o;
}
const rtTexFrac = (P, k) => { const R = +P['rt' + k + 'Rate'] || 0; if (!(R > 0)) return 0; if (rtIsFar(P)) return clamp(1 - rtGpuSplit(P).g[k] / R, 0, 1); return k === 'C' ? 0 : clamp(P['rt' + k + 'Tex'] || 0, 0, 1); };
// GPU 火花远看直径（rtGpuDisp > 0）：尺寸取 max(真实, 远看直径)，亮度按光量不变除以放大倍数²
const rtDispS = (P, S) => Math.max(S, +P.rtGpuDisp > 0 ? +P.rtGpuDisp : 0);
const rtFarVzOf = P => Math.max(0, P.rtFarVz == null ? 0.5 : +P.rtFarVz);     // 4.5.3 远段面片上移速度（m/s）
const rtNearExpoK = P => rtIsFar(P) ? clamp(+P.rtNearExpo || 1, 0.2, 1) : 1;     // 4.5.1 近段贴图曝光倍数（只在近段 + 远段时）
const rtDispK = (P, S0) => +P.rtGpuDisp > 0 ? (S0 / rtDispS(P, S0)) ** 2 * (P.rtGpuGain == null ? 1 : +P.rtGpuGain) : 1;     // 亮度倍数：光量不变 × 远看增益
function rtTexClasses(P, LI) {
  const sJ = clamp((P.rtSizeJit == null ? 25 : P.rtSizeJit) / 100, 0, 0.9), kJ = clamp((P.rtKdJit == null ? 20 : P.rtKdJit) / 100, 0, 0.9);
  const soft = (P.rtConeSoft || 0) > 0, us = (P.rtTurbS || 0) * Math.sqrt(1.5);
  return rtTexCls(P).filter(([k]) => rtTexFrac(P, k) > 0).map(([k, , salt]) => {
    const L = P['rt' + k + 'Life'], j = (P['rt' + k + 'Jit'] || 0) / 100, M = Math.max(1, Math.round(P['rt' + k + 'Rate'] * rtTexFrac(P, k) * LI.Tl));
    // 亮度随寿命：黑体温度 + 闪烁 + 熄灭（和 GPU 发射器的 Color Over Life 同一条曲线，取亮度，燃烧温度处 = 1），光量 ∝ 尺寸²
    //   4.4.5 rtTexCal = 1（RT5）：燃烧温度处 = 1，和温度偏移无关（渲染基础问题 H4：旧口径 ref 多乘了温度偏移的亮度比，偏移越低越亮，−400 K 时 ×7.5）；0 = 旧口径（RT4 不变）
    //   中火花：再乘「中 · 亮度 ÷ 细 · 亮度」（和 GPU 火花同一比例）
    const dT = P['rt' + k + 'dT'] || 0, c0 = rtSparkColor(P, L, 1, dT), ref = +P.rtTexCal === 1 ? 0.25 : rtLum(rtBB(P.rtTb + dT)) * 0.25 / rtLum(rtBB(P.rtTb));
    const kI = k === 'F' ? 1 : (+P['rt' + k + 'I'] || 0) / Math.max(1e-6, +P.rtFI || 1);     // 中 / 粗（4.5.1）同一比例
    const lum = c0.map(([u, c]) => [u, rtLum(c) / Math.max(1e-6, ref) * 0.01 * (P.rtTexI == null ? 1 : P.rtTexI) * kI]);
    return { k, M, rate: M / LI.Tl, L, j, S: P['rt' + k + 'Size'], sJ, kd: P['rt' + k + 'Kd'], kJ, c: (P.rtCone || 0) / (soft ? Math.SQRT2 : 1), soft, us, lum,
      shrink: P.rtShrink == null ? 0.5 : P.rtShrink, salt: (P.seed | 0) * 31 + salt * 1009 + 7, lifeMax: L * (1 + j) };
  });
}
function rtTexSparkOf(P, C, gi) {
  const key = ((gi % C.M) + C.M) % C.M, K = key * 7919 + C.salt, uu = (a, b) => 2 * phh(K, a) - 1 + (C.soft ? 2 * phh(K, b) - 1 : 0);
  const tb = (gi + phh(K, 1)) / C.rate;
  return { tb, life: C.L * (1 + C.j * (2 * phh(K, 2) - 1)), size: C.S * (1 + C.sJ * (2 * phh(K, 3) - 1)), kd: C.kd * (1 + C.kJ * (2 * phh(K, 4) - 1)),
    cx: C.c * uu(5, 6), cz: C.c * 0.5 * uu(7, 8), wx: C.us * (2 * phh(K, 9) - 1 + 2 * phh(K, 10) - 1), wz: C.us * 0.7 * (2 * phh(K, 11) - 1 + 2 * phh(K, 12) - 1),
    ph: 6.2831853 * ((P.rtSpin || 0) * tb + (P.rtSpinPh || 0)) };
}
// 一颗贴图火星在年龄 a 的位置 / 速度（随体坐标，弹体以 Vref 匀速上升；和 GPU 发射器同一套线性阻力解）
function rtTexSparkAt(P, q, a, Vref, R0, o) {
  const e = Math.exp(-q.kd * a), s1 = (1 - e) / q.kd, fx = -(P.rtFling || 0) * Math.sin(q.ph) + q.cx, fz = -(P.rtJet || 0) + q.cz, gz = Vref + G / q.kd - q.wz;
  o[0] = R0 * Math.cos(q.ph) + fx * s1 + q.wx * (a - s1); o[1] = fz * s1 - gz * (a - s1);
  o[2] = fx * e + q.wx * (1 - e); o[3] = fz * e - gz * (1 - e);
  return o;
}
// 画一批贴图火星。拖影和同档 GPU 发射器同一口径：看的人盯着星头 → 拖影 = 相对星头的速度 × 拖影时间（rtStreakT × 每档倍数），
//   最长 rtStreakMax × 尺寸，光量守恒（拖长不变亮）。循环层快门（白热段连成一片用的）不作用在火星上：每个子帧都画「本帧中间时刻」的位置
//   （fr = [帧间隔, 起点]，烘焙时给；实时模拟 / 测量时不给 = 就用 ts）。
const rtTmp4 = [0, 0, 0, 0];
function rtTexSparksDraw(P, CL, LI, Vref, ts, te, view, ppm, w, fr, fadeAll, bot, subW, nw) {
  const R0 = (P.rtD || 0) / 2, ppy = PPMY || ppm, cap = bufT.length / 4, smax = Math.max(1, P.rtStreakMax || 6), aN = nw ? rtNearA(P)[1] : Infinity; let n = 0;
  const tq = fr && fr[0] > 0 ? fr[1] + Math.round((ts - fr[1]) / fr[0]) * fr[0] : ts;
  // 烘焙：所有子帧画的都是本帧中间时刻 → 只在离中间最近的那个子帧画一次（权重 1），省掉重复的点
  if (fr && fr[0] > 0 && subW > 0) { if (!(ts - subW / 2 <= tq + 1e-9 && tq < ts + subW / 2 - 1e-9)) return 0; w = 1; }
  for (const C of CL) {
    const tau = (P.rtStreakT || 0) * (P['rt' + C.k + 'Streak'] == null ? 1 : P['rt' + C.k + 'Streak']);
    for (let gi = Math.floor(Math.min(te, tq) * C.rate); ; gi--) {
      const q = rtTexSparkOf(P, C, gi);
      if (q.tb > te) continue;
      const a = tq - q.tb; if (a > C.lifeMax + 0.02 || a > aN) break; if (a < 0 || a >= q.life) continue;
      const u = a / q.life, o = rtTexSparkAt(P, q, a, Vref, R0, rtTmp4);
      let I = esCurve(C.lum, u) * (q.size / C.S) * (q.size / C.S) * LI.pulse(q.tb) * fadeAll; if (bot) I *= smoothstepJS(bot[0], bot[1], o[1]); if (nw) I *= nw(a); if (I <= 0) continue;
      const S = q.size * (u < 0.7 ? 1 : 1 + (C.shrink - 1) * (u - 0.7) / 0.3) / 2;   // 贴图点 σ = 尺寸 / 2 → 传 S / 2，和软圆点 σ = 尺寸 / 4 同宽
      const sp = Math.hypot(o[2], o[3]), Lm = Math.min(sp * tau, smax * S * 2), lpx = Lm * Math.hypot(o[2] * ppm, o[3] * ppy) / Math.max(1e-6, sp);
      const m = clamp(Math.ceil(lpx / 1.2), 1, 32), ux = o[2] / Math.max(1e-6, sp), uz = o[3] / Math.max(1e-6, sp);
      for (let i = 0; i < m && n < cap; i++) {
        const d = m > 1 ? ((i + 0.5) / m - 0.5) * Lm : 0;
        bufT[n * 4] = o[0] + ux * d; bufT[n * 4 + 1] = o[1] + uz * d; bufT[n * 4 + 2] = I / m; bufT[n * 4 + 3] = S; n++;
      }
    }
  }
  if (n) drawPoints(bufT, n, view, ppm, [0, 1, 0, 0], w);
  return n;
}
// 循环层渲染器（弹体随体坐标，速度 Vref 匀速）：bakeFrames 的接口 draw(ts, view, ppm, w, tick, f)
//   mode 'loop'：ts 取周期内任意时刻；'fade'：stop = 停喷时刻（循环相位），ts ≥ stop 后星头灭、不再喷，已有火粉 / 火星按自己的寿命熄灭
function makeRiseTailLoopRenderer(P, LI, Vref, opts = {}) {
  const rate0 = P.rtARate || 0, M = Math.max(1, Math.round(rate0 * LI.Tl)), rate = M / LI.Tl, salt = (P.seed | 0) * 7 + 11, R0 = (P.rtD || 0) / 2;
  const lifeMax = rtPowderLifeMax(P), CL = rtTexClasses(P, LI), nw = rtNearW(P);     // 4.5.1：近段只画年轻的（年龄权重 nw）
  const R = {
    Tp: LI.Tl, slots: Math.ceil(rate * lifeMax) + 2, stop: opts.stop == null ? -1 : opts.stop, fadeDur: opts.fadeDur || 0, bot: opts.bot || null, subW: 0, fr: opts.fr || null,
    draw(ts, view, ppm, w) {
      setParticleProfile(P);
      const stop = R.stop, fading = stop >= 0 && ts > stop;
      // 消散序列末尾轻轻收一点（4.2.2：时长已按「最后还看得见」量过，不再在最后 20% 强行压到全黑 → 不留末尾暗帧）
      const fadeAll = fading && R.fadeDur > 0 ? 1 - smoothstepJS(0.9 * R.fadeDur, 1.15 * R.fadeDur, ts - stop) : 1;
      let k = 0;
      if (!fading) k = rtHeadPts(P, 0, 0, 0, -1, P.rtHeadI * LI.pulse(ts), 0);
      if (k) { drawPoints(bufH, k / 4, view, ppm, [1, 0, 0, 0], w); }
      const te = fading ? stop : ts;
      if (CL.length) rtTexSparksDraw(P, CL, LI, Vref, ts, te, view, ppm, w, R.fr, fadeAll, R.bot, R.subW, nw);
      if (rate0 <= 0) return;
      const cap = bufT.length / 4; let n = 0;
      for (let gi = Math.floor(te * rate); ; gi--) {
        const q = rtPowderOf(P, LI, gi, M, rate, salt);
        if (q.tb > te) continue;
        const a = ts - q.tb; if (a > lifeMax + 0.02) break; if (a < 0 || a >= q.life) continue;
        const e = Math.exp(-q.kd * a), s1 = (1 - e) / q.kd;
        const x = R0 * Math.cos(q.ph) + (-q.fl * Math.sin(q.ph) + q.cx) * s1 + q.wx * (a - s1);
        const z = (-q.j + q.cz) * s1 - (Vref + G / q.kd - q.wz) * (a - s1);
        let I = rtPowderI(P, q, a, LI.pulse(q.tb)) * fadeAll; if (R.bot) I *= smoothstepJS(R.bot[0], R.bot[1], z); if (nw) I *= nw(a); if (I <= 0 || n >= cap) continue;
        bufT[n * 4] = x; bufT[n * 4 + 1] = z; bufT[n * 4 + 2] = I; bufT[n * 4 + 3] = q.size; n++;
      }
      drawPoints(bufT, n, view, ppm, [0, 1, 0, 0], w);
    },
    dispose() { }
  };
  return R;
}
// 实时模拟（地面坐标，真实弹道）：同一套火粉 / 贴图火星（同编号、同随机量），按出生时刻的弹体位置 / 速度喷出
function drawRiseTailLive(P, LI, ball, t, view, ppm) {
  setParticleProfile(P);
  const T = ball.T;
  if (t <= T) {
    const p = ball.pos(t), v = ball.vel(t), sp = Math.hypot(v[0], v[2]) || 1;
    const k = rtHeadPts(P, p[0], p[2], -v[0] / sp, -v[2] / sp, P.rtHeadI * LI.pulse(t), 0);
    drawPoints(bufH, k / 4, view, ppm, [1, 0, 0, 0], 1);
  }
  return rtWorldDraw(P, LI, ball, t, view, ppm, 1, null, 0);
}
// 地面坐标里的火粉 + 贴图火星（实时模拟画全部；4.5.1 远段 TrailFar 画 wf(年龄) 那一份、横向减 cx 放进面片）
function rtWorldDraw(P, LI, ball, t, view, ppm, w, wf, cx) {
  const T = ball.T, R0 = (P.rtD || 0) / 2, lifeMax = rtPowderLifeMax(P);
  let n = 0;
  const CL = rtTexClasses(P, LI);
  if (CL.length) {
    // 贴图火星在地面坐标：出生时刻的弹体位置 + 速度（同一套随机量），拖影 = 相对星头此刻速度 × 循环层快门
    const te = Math.min(t, T), vh = ball.vel(Math.min(t, T)), ppy = PPMY || ppm, cap = bufT.length / 4, smax = Math.max(1, P.rtStreakMax || 6);
    for (const C of CL) for (let gi = Math.floor(te * C.rate), tau = (P.rtStreakT || 0) * (P['rt' + C.k + 'Streak'] == null ? 1 : P['rt' + C.k + 'Streak']); gi >= 0; gi--) {
      const q = rtTexSparkOf(P, C, gi);
      if (q.tb > te) continue;
      const a = t - q.tb; if (a > C.lifeMax + 0.02) break; if (a < 0 || a >= q.life) continue;
      const wa = wf ? wf(a) : 1; if (wa <= 0) continue;
      const p = ball.pos(q.tb), v = ball.vel(q.tb), sp = Math.hypot(v[0], v[2]) || 1, dx = v[0] / sp, dz = v[2] / sp;
      const e = Math.exp(-q.kd * a), s1 = (1 - e) / q.kd, u = a / q.life;
      const vx0 = v[0] - (P.rtJet || 0) * dx - (P.rtFling || 0) * Math.sin(q.ph) + q.cx, vz0 = v[2] - (P.rtJet || 0) * dz + q.cz;
      const x = p[0] + R0 * Math.cos(q.ph) + vx0 * s1 + q.wx * (a - s1) - cx, z = p[2] + vz0 * s1 - (G / q.kd - q.wz) * (a - s1);
      const rvx = vx0 * e + q.wx * (1 - e) - (t <= T ? vh[0] : 0), rvz = vz0 * e - (G / q.kd - q.wz) * (1 - e) - (t <= T ? vh[2] : 0);
      const I = esCurve(C.lum, u) * (q.size / C.S) * (q.size / C.S) * LI.pulse(q.tb) * wa; if (I <= 0) continue;
      const S = q.size * (u < 0.7 ? 1 : 1 + (C.shrink - 1) * (u - 0.7) / 0.3) / 2, rs = Math.hypot(rvx, rvz) || 1e-6, Lm = Math.min(rs * tau, smax * S * 2);
      const m = clamp(Math.ceil(Lm * Math.hypot(rvx * ppm, rvz * ppy) / rs / 1.2), 1, 32);
      for (let i = 0; i < m && n < cap; i++) { const d = m > 1 ? ((i + 0.5) / m - 0.5) * Lm : 0; bufT[n * 4] = x + rvx / rs * d; bufT[n * 4 + 1] = z + rvz / rs * d; bufT[n * 4 + 2] = I / m; bufT[n * 4 + 3] = S; n++; }
    }
    drawPoints(bufT, n, view, ppm, [0, 1, 0, 0], w);
  }
  const rate0 = P.rtARate || 0; if (rate0 <= 0) return n;
  const M = Math.max(1, Math.round(rate0 * LI.Tl)), rate = M / LI.Tl, salt = (P.seed | 0) * 7 + 11, te = Math.min(t, T), cap = bufT.length / 4;
  let np = 0;
  for (let gi = Math.floor(te * rate); gi >= 0; gi--) {
    const q = rtPowderOf(P, LI, gi, M, rate, salt);
    if (q.tb > te) continue;
    const a = t - q.tb; if (a > lifeMax + 0.02) break; if (a < 0 || a >= q.life) continue;
    const wa = wf ? wf(a) : 1; if (wa <= 0) continue;
    const p = ball.pos(q.tb), v = ball.vel(q.tb), sp = Math.hypot(v[0], v[2]) || 1, dx = v[0] / sp, dz = v[2] / sp;
    const e = Math.exp(-q.kd * a), s1 = (1 - e) / q.kd;
    const vx0 = v[0] - q.j * dx - q.fl * Math.sin(q.ph) + q.cx, vz0 = v[2] - q.j * dz + q.cz;
    const x = p[0] + R0 * Math.cos(q.ph) + vx0 * s1 + q.wx * (a - s1) - cx, z = p[2] + vz0 * s1 - (G / q.kd - q.wz) * (a - s1);
    const I = rtPowderI(P, q, a, LI.pulse(q.tb)) * wa; if (I <= 0 || np >= cap) continue;
    bufT[np * 4] = x; bufT[np * 4 + 1] = z; bufT[np * 4 + 2] = I; bufT[np * 4 + 3] = q.size; np++;
  }
  drawPoints(bufT, np, view, ppm, [0, 1, 0, 0], w);
  return n + np;
}
// 4.5.1 远段 TrailFar 渲染器（世界坐标，面片立在发射点附近）：bakeFrames 的接口 draw(ts, view, ppm, w)；ts = 发射后的绝对时间
//   开花（ts ≥ T）以后所有火花都归远段（近段循环层到 T 结束，没有 RiseFade 消散层）
//   4.5.3 vz / t0（用户 10-05 18:02 UE 实测：1 cm/s 的初速定不住速度朝向，给 50 cm/s 才竖直）：面片按 vz（m/s）往上走，烘焙时视图跟着面片上移，内容仍按世界坐标（不漂）
function makeRiseTailFarRenderer(P, LI, ball, cx, vz = 0, t0 = 0) {
  const nw = rtNearW(P), wf = a => 1 - nw(a), T = ball.T;
  return { slots: 0, subW: 0, draw(ts, view, ppm, w) { setParticleProfile(P); rtWorldDraw(P, LI, ball, ts, vz ? [view[0], view[1] + vz * (ts - t0), view[2], view[3]] : view, ppm, w, ts >= T ? null : wf, cx); }, dispose() { } };
}
// ---- 粒子层：按理论生成发射器（46_emitset.js 的数据）----
const RT_LAM = [610e-9, 550e-9, 465e-9];
function rtBB(T) {
  const pl = (T2, l) => 1 / (Math.pow(l, 5) * (Math.exp(1.4388e-2 / (l * Math.max(T2, 300))) - 1));
  return RT_LAM.map(l => pl(T, l) / pl(6500, l));
}
const rtLum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
// 火星的 Color Over Life：出喷口 T0 → tc 秒降到燃烧温度 Tb → 寿命最后 25% 降到熄灭温度、变暗；闪烁乘在中段关键点上
function rtSparkColor(P, lifeMean, I, dT = 0) {
  const Tb = P.rtTb + dT, T0 = P.rtT0 + dT, Tend = P.rtTend, tcu = clamp(P.rtTc / Math.max(0.05, lifeMean), 0.005, 0.7), ref = rtLum(rtBB(Tb));
  const us = [...new Set([0, tcu * 0.5, tcu, tcu * 2, 0.3, 0.4, 0.5, 0.6, 0.75, 0.85, 0.93, 1].filter(u => u >= 0 && u <= 1).map(u => +u.toFixed(4)))].sort((a, b) => a - b);
  let tw = 1;
  return us.map(u => {
    let T, env = 1;
    if (u <= 0.75) T = Tb + (T0 - Tb) * Math.exp(-u / tcu);
    else { const v = (u - 0.75) / 0.25; T = Tb + (Tend - Tb) * v; env = Math.max(0, 1 - Math.pow(v, 1.5)); }
    if (u > 0.2 && u < 0.75 && P.rtTw > 0) { tw = -tw; env *= 1 + P.rtTw * 0.5 * tw; }
    const c = rtBB(T), s = I * 0.25 * env / ref;
    return [u, c.map(x => +(x * s).toFixed(4))];
  });
}
// 空气乱流（大涡）：高空风的阵风 u′、涡尺度 Λ。火星寿命（≤ 几秒）远小于涡的周转时间 Λ / u′（几十秒），
//   所以每颗火星一辈子都在「出生那团空气」里：阻力把它拉向那团空气的速度 w → 等价于恒定加速度 k·w，漂移 = w ·（年龄 − (1 − e^−k·年龄) / k）。
//   这团空气的速度由出生地（= 弹体在发射器时间 t0 的位置）决定：同一时刻出生的火星一起漂（沿尾迹相关），隔一个 Λ 就换一股风 → 老的尾迹慢慢松、轻轻弯。
//   值噪声：沿弹道弧长每 Λ 一个高斯节点、Catmull-Rom 插值；返回 t0 → 空气速度（m/s，x 横 / y 景深 / z 竖）
function rtAir(P, ball) {
  const u = P.rtTurb || 0, Lam = Math.max(2, P.rtTurbL || 30), T = ball.T, sd = (P.seed | 0) * 97 + 5;
  if (u <= 0) return () => [0, 0, 0];
  const n = 400, S = [0]; for (let i = 1; i <= n; i++) { const t = T * (i - 0.5) / n, v = ball.vel(t); S.push(S[i - 1] + Math.hypot(v[0], v[2]) * T / n); }
  const sOf = t => { const x = clamp(t / T, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)); return S[i] + (S[i + 1] - S[i]) * (x - i); };
  const node = (m, ax) => phn(sd + m * 3 + ax, 31 + ax);
  const cr = (p0, p1, p2, p3, f) => 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
  const sc = [u, u, u * 0.7].map(x => x * 1.11);   // Catmull-Rom 插值把方差平均压到 0.81，补回来 → 均方根 = u′
  return t => { const x = sOf(t) / Lam, m = Math.floor(x), f = x - m; return [0, 1, 2].map(ax => sc[ax] * cr(node(m - 1, ax), node(m, ax), node(m + 1, ax), node(m + 2, ax), f)); };
}
// 线状火星（相机 / 眼睛跟着星头走的拖影）：看升空的人（和参考视频的相机）是盯着星头的，星头在视网膜上不动，
//   火星相对星头往下退 → 在曝光 / 视觉暂留时间 τ 里拖成一条竖线：拖影长度 = |火星速度 − 星头此刻速度| × τ。
//   年轻火星相对星头退得慢（≈ 喷出速度），老火星几乎停在空中、相对速度 ≈ 星头速度 → 越往下拖得越长（参考图下段正是这样）。
//   拉长倍数 = √(1 + (长度 / 尺寸)²)，按「中途出生的标称火星」随寿命算。方向 = 相对星头的运动 ≈ 弹道方向（竖直），
//   引擎里用 Screen Alignment = Rectangle（面片 Y 朝屏幕上方）而不是 Velocity：火星自己的速度在寿命中段很小、方向乱（试过，拖影横七竖八，和参考里整齐的竖线不符）。
//   光量守恒（拖影只是把同一份光摊长）：Color Over Life 同时除以拉长倍数，所以拖影火星要更亮才会在相机里过曝发白。
function rtStretchLife(P, ball, jet, kd, L, S, sizeLife, tauMul) {
  const tau = (P.rtStreakT || 0) * (tauMul == null ? 1 : tauMul), cap = Math.max(1, P.rtStreakMax || 6);
  if (tau <= 0 || S <= 0) return null;
  const t0 = ball.T * 0.4, v = ball.vel(t0), sp = Math.hypot(v[0], v[2]) || 1, v0 = [v[0] - jet * v[0] / sp, v[2] - jet * v[2] / sp], g = G / kd;
  const keys = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10, a = u * L, e = Math.exp(-kd * a), vh = ball.vel(Math.min(ball.T, t0 + a));
    const rx = v0[0] * e - vh[0], rz = (v0[1] + g) * e - g - vh[2];
    const len = Math.hypot(rx, rz) * tau, sz = S * (sizeLife ? esCurve(sizeLife, u) : 1);
    keys.push([u, +Math.min(cap, Math.sqrt(1 + (len / Math.max(1e-3, sz)) ** 2)).toFixed(3)]);
  }
  return keys.some(k => k[1] > 1.05) ? keys : null;
}
function rtBuildES(P) {
  const ball = rtBallistic(P), LI = rtLoopInfo(P), T = ball.T, f = P.rtSpin || 0, R0 = (P.rtD || 0) / 2, th = ball.th;
  const dtL = Math.min(0.05, f > 0 ? 1 / (12 * f) : 0.05), dtS = Math.min(0.05, P.rtPulse > 0 ? 1 / (4 * (P.rtPulseHz || 6)) : 0.25);
  const tl = []; for (let t = 0; t < T; t += dtL) tl.push(t); tl.push(T);
  const ts = []; for (let t = 0; t < T; t += dtS) ts.push(t); ts.push(T);
  const phase = t => 6.2831853 * (f * t + (P.rtSpinPh || 0));
  // 出生位置：弹道 + 喷口绕转轴转圈（x 横、y 景深、z 竖）；初速：弹体速度 − 向后喷出 + 切向甩出
  const loc = tl.map(t => { const p = ball.pos(t), ph = phase(t); return [t, [p[0] + R0 * Math.cos(ph), R0 * Math.sin(ph), p[2]]]; });
  const vel = (jet, fling) => tl.map(t => { const v = ball.vel(t), sp = Math.hypot(v[0], v[2]) || 1, ph = phase(t);
    return [t, [v[0] - jet * v[0] / sp - fling * Math.sin(ph), fling * Math.cos(ph), v[2] - jet * v[2] / sp]]; });
  const spawn0 = rate => ts.map(t => [t, rate * LI.pulse(t)]);
  // 横向散开：两个均匀分布相加（两个 Initial Velocity）→ 三角分布，均方根和原来 ±c 的均匀分布一样，边缘不再是一刀切
  // 4.4.5 rtGpuSafe = 1（RT5，UE 4.24 实测 10-04 14:58）：GPU Sprites 不支持 Acceleration（标红）→ GPU 发射器不写乱流（乱流只在贴图里）；
  //   Initial Velocity 最多 2 个（出生曲线 + 一个随机散开）→ 软边散开改成一个均匀分布（均方根不变）。0 = 旧做法
  const safe = +P.rtGpuSafe === 1, soft = !safe && (P.rtConeSoft || 0) > 0, c = (P.rtCone || 0) / (soft ? Math.SQRT2 : 1), cb = [[-c, -c, -c / 2], [c, c, c / 2]], cone = soft ? [cb, cb] : cb, seed = P.seed | 0;
  // 乱流：大涡（按发射器时间的 Acceleration 曲线）+ 小涡 / 弹体尾流（每颗随机，也用两个相加）。加速度 = 阻力 × 空气速度
  const air = rtAir(P, ball), airK = tl.map(t => [t, air(t)]), us = (P.rtTurbS || 0) * Math.sqrt(1.5);
  //   重力仍走 Const Acceleration（已实测），乱流单独用 Acceleration 模块（未经 UE 验证）
  const turb = kd => safe ? { accel: [0, 0, -G] } : ({ accel: [0, 0, -G], accelCurve: P.rtTurb > 0 ? airK.map(([t, w]) => [t, [w[0] * kd, w[1] * kd, w[2] * kd]]) : null,
    accelJit: us > 0 ? [0, 1].map(() => [[-us * kd, -us * kd, -us * kd * 0.7], [us * kd, us * kd, us * kd * 0.7]]) : null });
  const sJ = clamp((P.rtSizeJit == null ? 25 : P.rtSizeJit) / 100, 0, 0.9), kJ = clamp((P.rtKdJit == null ? 20 : P.rtKdJit) / 100, 0, 0.9);
  const em = [], far = rtIsFar(P), gs = far ? rtGpuSplit(P) : null;
  // 4.5.4（用户 10-05 19:31「曲线太复杂了……没变化就 2 个点，有变化的加几个变化的点」）：近段 + 远段时软圆点发射器（GPU 火花、落火、爆亮、星头光晕）
  //   不跟喷射脉动、不跟喷口转圈（螺旋和脉动都在近段 / 远段贴图里），出生率是常数（2 个点），出生位置 / 初速是平滑弹道（抽稀到 0.3 m / 0.5 m/s）→ 曲线只剩十几个点
  const spawn = far ? (rate => [[0, rate], [T, rate]]) : spawn0;
  const locS = far ? esThin(tl.map(t => { const p = ball.pos(t); return [t, [p[0], 0, p[2]]]; }), 0.3) : loc;
  const velS = (jet, fling) => far ? esThin(tl.map(t => { const v = ball.vel(t), sp = Math.hypot(v[0], v[2]) || 1; return [t, [v[0] - jet * v[0] / sp, 0, v[2] - jet * v[2] / sp]]; }), 0.5) : vel(jet, fling);
  // 4.5.1 远看直径（rtGpuDisp）：GPU 软圆点按 max(真实, 远看直径) 画，Color Over Life × (真实 ÷ 画的)²（光量不变）
  for (const [k, name0, salt] of [['F', 'SparksFine', 1], ['M', 'SparksMid', 2], ['C', 'SparksCoarse', 3]]) {
    const rate = (P['rt' + k + 'Rate'] || 0) * (1 - rtTexFrac(P, k)); if (rate <= 0) continue;   // 烘进贴图的那部分不再出 GPU
    const L = P['rt' + k + 'Life'], j = (P['rt' + k + 'Jit'] || 0) / 100, S0 = P['rt' + k + 'Size'], kd = P['rt' + k + 'Kd'], S = rtDispS(P, S0), k2 = rtDispK(P, S0);
    // 4.5.1 近段 + 远段：中火花的 GPU 那份是「闪烁层」（Color Over Life 带闪烁 rtGpuTw）
    const tw = far && k === 'M', name = tw ? 'SparksTwinkle' : name0;
    const sizeLife = [[0, 1], [0.7, 1], [1, P.rtShrink == null ? 0.5 : P.rtShrink]];
    const sl = rtStretchLife(P, ball, P.rtJet, kd, L, S, sizeLife, P['rt' + k + 'Streak']);
    let col = rtSparkColor(tw ? { ...P, rtTw: +P.rtGpuTw || 0 } : P, L, P['rt' + k + 'I'] * (P.rtDotGain == null ? 1 : P.rtDotGain) * k2, P['rt' + k + 'dT'] || 0);
    if (sl) col = col.map(([u, c]) => [u, c.map(x => +(x / esCurve(sl, u)).toFixed(4))]);
    em.push({ name, gpu: true, delay: 0, duration: T, seed: seed * 13 + salt, spawn: spawn(rate),
      life: [L * (1 - j), L * (1 + j)], size: [S * (1 - sJ), S * (1 + sJ)], drag: [kd * (1 - kJ), kd * (1 + kJ)], ...turb(kd),
      loc: locS, vel: velS(P.rtJet, P.rtFling), velAdd: cone, sizeLife, col,
      ...(sl ? { align: 'screen', stretch: 1, stretchLife: sl } : {}) });
  }
  if ((P.rtERate || 0) > 0) {
    const L = P.rtELife, kd = P.rtEKd, S = rtDispS(P, P.rtESize), k2 = rtDispK(P, P.rtESize);
    em.push({ name: 'Embers', gpu: true, delay: 0, duration: T, seed: seed * 13 + 4, spawn: spawn(P.rtERate * (gs ? gs.f : 1)),
      life: [L * 0.7, L * 1.3], size: [S * 0.8, S * 1.2], drag: [kd * 0.7, kd * 1.3], ...turb(kd),
      loc: locS, vel: velS(P.rtJet * 0.6, P.rtFling * 0.5), velAdd: soft || (safe && (P.rtConeSoft || 0) > 0) ? cone : [[-c * 1.5, -c * 1.5, -c], [c * 1.5, c * 1.5, c * 0.3]],
      sizeLife: [[0, 1], [0.8, 0.9], [1, 0.4]], col: rtSparkColor(P, L, P.rtEI * (P.rtDotGain == null ? 1 : P.rtDotGain) * k2, -180) });
  }
  // ---- 引擎里加的效果（4.2.2，用户 19:25「在引擎也加上一些效果会更丰富」；都是软圆点，不新增材质）----
  // 星头光晕：星头的强光被空气 / 烟散射成一团柔光（贴图格子窄，放不下这么大的光晕 → 引擎里单独一颗）。弹道和循环层同一套（Initial Velocity + Drag + 重力），亮度跟喷射脉动
  if ((P.rtGlow || 0) > 0) {
    const S = P.rtGlowSize || 4, bb = rtBB(P.rtT0 || 2450), r = rtLum(bb), keys = [];
    for (const t of ts) { const u = t / T, f = 1 - 0.35 * smoothstepJS(0.85, 1, u); keys.push([+u.toFixed(5), bb.map(x => +(x / r * 0.25 * P.rtGlow * (far ? 1 : LI.pulse(t)) * f).toFixed(4))]); }
    if (far) { const th = esThin(keys, 0.002 * P.rtGlow); keys.length = 0; keys.push(...th); }     // 4.5.4 不跟脉动：开头一段平的 + 末段变暗，几个点
    em.push({ name: 'HeadGlow', gpu: false, delay: 0, duration: T, seed: seed * 13 + 6, spawn: [], bursts: [[0, 1]],
      life: [T, T], size: [S, S], ...(ball.quad ? { velLife: rtVelLife(ball) } : { drag: [ball.k, ball.k], accel: [0, 0, -G] }), loc: [[0, [0, 0, 0]]], vel: [[0, [ball.vx0, 0, ball.vz0]]],
      sizeLife: [[0, 1], [1, 0.8]], col: keys });
  }
  // 末段爆亮：木炭 + 硫的熔渣粒烧到最后会微爆，闪一下（线香花火「松叶」的同一个机理）。和粗火星同一套运动，Color Over Life 前面全黑、寿命末段一闪
  if ((P.rtPopRate || 0) > 0) {
    const S0 = P.rtPopSize || 0.5, S = rtDispS(P, S0);
    const L = P.rtCLife, kd = P.rtCKd, u0 = clamp(P.rtPopAt == null ? 0.85 : P.rtPopAt, 0.2, 0.95), hot = rtBB((P.rtT0 || 2450) + 300), r = rtLum(hot), I = (P.rtPopI || 0) * 0.25 / r * (P.rtDotGain == null ? 1 : P.rtDotGain) * rtDispK(P, S0);
    const c = (k2) => hot.map(x => +(x * I * k2).toFixed(4)), gold = rtBB(P.rtTb || 2150), rg = rtLum(gold);
    em.push({ name: 'SparkPops', gpu: true, delay: 0, duration: T, seed: seed * 13 + 7, spawn: spawn(P.rtPopRate * (gs ? gs.f : 1)),
      life: [L * 0.6, L * 1.2], size: [S * 0.7, S * 1.3], drag: [kd * (1 - kJ), kd * (1 + kJ)], ...turb(kd),
      loc: locS, vel: velS(P.rtJet, P.rtFling), velAdd: cone, sizeLife: [[0, 0.4], [u0, 0.4], [u0 + 0.02, 1.2], [1, 0.6]],
      // 4.3（H3）：闪光后面三个键按剩下的寿命等比缩（d ≤ 0.15），不越过 1、不重复（以前 0.85 时两个 u = 1，> 0.92 时越界乱序）
      col: (() => { const d = Math.min(0.15, 1 - u0), k = [[0, [0, 0, 0]], [+(u0 - 0.001).toFixed(4), [0, 0, 0]], [+u0.toFixed(4), c(1)], [+(u0 + d * 0.2).toFixed(4), c(0.6)], [+(u0 + d * 0.8 / 1.5).toFixed(4), gold.map(x => +(x / rg * I * 0.12).toFixed(4))], [+Math.min(1, u0 + d).toFixed(4), [0, 0, 0]], [1, [0, 0, 0]]];
        return k.filter((q, i) => i === 0 || q[0] > k[i - 1][0]); })() });
  }
  // 发射口：发射药在炮筒口一闪（大光团，零点几秒）+ 一把向上喷的火星（炮筒里带出来的燃烧颗粒）
  if ((P.rtLaunch || 0) > 0) {
    const b0 = rtBB(2300), r0 = rtLum(b0), gs = P.rtLaunchSize || 8, n = Math.round(P.rtLaunchN || 0), v = P.rtLaunchV || 30, ca = Math.tan((P.rtLaunchCone || 20) * Math.PI / 180) * v;
    em.push({ name: 'LaunchGlow', gpu: false, delay: 0, duration: 0.5, seed: seed * 13 + 8, spawn: [], bursts: [[0, 1]],
      life: [0.3, 0.3], size: [gs, gs], loc: [[0, [0, 0, 1]]], vel: [[0, [0, 0, 0]]], sizeLife: [[0, 0.6], [0.15, 1], [1, 1.4]],
      col: [[0, b0.map(x => +(x / r0 * P.rtLaunch).toFixed(4))], [0.2, b0.map(x => +(x / r0 * P.rtLaunch * 0.45).toFixed(4))], [0.6, b0.map(x => +(x / r0 * P.rtLaunch * 0.08).toFixed(4))], [1, [0, 0, 0]]] });
    if (n > 0) em.push({ name: 'LaunchSparks', gpu: true, delay: 0, duration: 0.5, seed: seed * 13 + 9, spawn: [], bursts: [[0, n]],
      life: [0.35, 1.0], size: [0.12, 0.3], drag: [2.5, 4.5], accel: [0, 0, -G], loc: [[0, [0, 0, 0.5]]], vel: [[0, [0, 0, v * 0.75]]],
      velAdd: safe ? [[-ca * Math.SQRT2, -ca * Math.SQRT2, -v * 0.3], [ca * Math.SQRT2, ca * Math.SQRT2, v * 0.3]] : [[[-ca, -ca, -v * 0.3], [ca, ca, v * 0.3]], [[-ca, -ca, 0], [ca, ca, 0]]], sizeLife: [[0, 1], [1, 0.5]],
      col: rtSparkColor(P, 0.7, (P.rtLaunchI || 8) * (P.rtDotGain == null ? 1 : P.rtDotGain), 200) });
  }
  if ((P.rtSmoke || 0) > 0) {
    const L = P.rtSmokeLife, S = P.rtSmokeSize, b = P.rtSmoke, sc = [1, 0.78, 0.55];
    const sloc = tl.map(t => { const p = ball.pos(t); return [t, [p[0], 0, p[2]]]; });
    const svel = tl.map(t => { const v = ball.vel(t); return [t, [v[0] * 0.12, 0, v[2] * 0.12]]; });
    em.push({ name: 'Smoke', gpu: false, delay: 0, duration: T, seed: seed * 13 + 5, spawn: ts.map(t => [t, P.rtSmokeRate]),
      life: [L * 0.8, L * 1.2], size: [S * 0.8, S * 1.2], drag: [1.2, 1.8], accel: [0, 0, 0.3], loc: sloc, vel: svel, velAdd: [[-0.5, -0.5, -0.3], [0.5, 0.5, 0.3]],
      sizeLife: [[0, 1], [1, P.rtSmokeGrow]], col: [[0, [0, 0, 0]], [0.08, sc.map(x => x * b)], [0.5, sc.map(x => x * b * 0.55)], [1, [0, 0, 0]]] });
  }
  // 4.4.5 rtGpuMax > 0（RT5）：PC 上一条尾缀的 GPU 粒子同时活着不超过它（UE 里同屏还有很多别的粒子；用户 10-04 14:58 要 ≤ 800）。
  //   估算 = 每个持续生成的 GPU 发射器「最大出生率 × 平均寿命」相加；超了就把这些发射器的出生率一起按比例降（发射口那一下 Burst 不算、不降）。
  //   不补亮度：要尾迹还这么密，就把细 / 中火花多放进贴图（rtFTex / rtMTex）
  const gpuEst = () => em.filter(e => e.gpu && e.spawn && e.spawn.length).reduce((a, e) => a + Math.max(...e.spawn.map(k => k[1])) * (e.life[0] + e.life[1]) / 2, 0);
  const est0 = gpuEst(), cap = +P.rtGpuMax > 0 ? +P.rtGpuMax : 0, fCap = cap > 0 && est0 > cap ? cap / est0 : 1;
  if (fCap < 1) for (const e of em) if (e.gpu && e.spawn && e.spawn.length) e.spawn = e.spawn.map(([t, r]) => [t, r * fCap]);
  return { ball, LI, T, emitters: em, gpuEst: { est: Math.round(est0 * fCap), raw: Math.round(est0), cap, f: fCap } };
}
// 面片取景的粗估（随体坐标）：横向 = 喷口半径 + 甩出 / 阻力 + 散开；竖向 = 出膛速度下白热段 / 贴图火星的最长距离。只用来定测量窗口
function rtLoopBox(P, Vref, LI) {
  const aN = rtIsFar(P) ? rtNearA(P)[1] : Infinity;     // 4.5.1 近段只到交接完的年龄
  const R0 = (P.rtD || 0) / 2, kmin = P.rtAKd * 0.7, lifeMax = Math.min(aN, P.rtALife * Math.exp(1.5 * (P.rtALsig || 0)));
  let hx = R0 + P.rtFling * 1.2 / kmin + 3 * P.rtACone / kmin + P.rtHeadSize + 0.4;
  const drop = (j, kd, L) => { let d = 0; for (let i = 0; i <= 64; i++) { const a = L * i / 64, s1 = (1 - Math.exp(-kd * a)) / kd; d = Math.max(d, j * s1 + (Vref + G / kd) * (a - s1)); } return d; };
  let down = drop(P.rtAJet * 0.75, kmin, lifeMax);
  for (const C of LI ? rtTexClasses(P, LI) : []) {
    const k = C.kd * (1 - C.kJ), Lc = Math.min(aN, C.lifeMax); down = Math.max(down, drop(P.rtJet || 0, k, Lc));
    hx = Math.max(hx, R0 + (P.rtFling || 0) / k + 2 * C.c * (C.soft ? 2 : 1) / k + 2 * C.us * Lc + C.S);
  }
  const hy = Math.max(down + 1, (P.rtHeadSize + (P.rtHeadFl || 0)) * 1.5);
  return { HX: Math.max(0.8, hx), HY: hy };
}
// 取景 + 格子 + 消散贴图（4.2.2，和已通过的 V5 尾缀同一做法；用户 19:25「导出至少浪费 50%」）：
//   以前星头在面片中心，上半格是空的；横向按最坏情况估，内容只占格子中间一条。现在：
//   · 低分辨率先渲几个循环相位 + 消散几刻，按烘焙的曝光口径（编码后 ≥ 3/255 才算看得见）找范围：横向按亮度取 99.5%，竖向从星头光晕顶到最低看得见的地方；
//   · 星头固定在面片上端，引擎里用 Required 的 Pivot Offset 把星头放在粒子位置（spec 1 节 required.pivot_offset，V5 已在用）；
//   · 格子按面片长宽比在 16×1 / 8×2 / 4×4 里挑（单格像素数不变 = 512²）；
//   · 消散贴图：同样大的格子，在 1–16 列 × 1–4 行里挑放得下「火粉烧完 × 帧率上限」帧、RGBA 四个通道都用满的最小贴图（以前固定 2048²、末通道常常空着）。
const rtLayoutCache = new Map();
// ---- 4.4.5 循环层长度跟着真实尾迹（rtLoopSize = 1，RT5；用户 10-04 17:41「就跟从地上长出来一样」、17:27「消散一出来是扁的」）----
//   真实尾迹长 ≈ 弹体最近 Lp 秒（Lp = 白热时间）走过的路：起步时从 0 长出来（还没喷出那么长），减速时变短。
//   循环层贴图按出膛速度烘（真循环），引擎里 Size By Life 的 Y（星头在上端、绕星头缩放）= 真实尾迹长 ÷ 出膛速度下的尾迹长：
//   起步段最少留星头那一小段（不伸到地下）；长满以后不低于「循环层最短」（rtLoopMin，压得太扁贴图里的点就成了横线）。
//   消散贴图不再借循环层的：按「循环层最后那一刻的等效速度」（= 最后的倍数 × 出膛速度）单独取景烘焙、面片按真实大小（不压扁），
//   所以开花那一刻消散第一帧和循环层最后一帧一样长、点的位置对得上（只是点不再被压扁）。
function rtLoopScaleAt(P, ball, Vref, t) { const Lp = Math.max(0.05, +P.rtALife || 0.6), a = ball.pos(t), b = ball.pos(Math.max(0, t - Lp)); return Math.hypot(a[0] - b[0], a[2] - b[2]) / Math.max(1e-6, Vref * Lp); }
//   另外面片下端不伸到发射点以下：贴图里最老的火花（中火花寿命长）在星头下面 hbW（= 星头离面片下端的距离）处，
//   起步那几秒弹体飞过的路比它短 → 倍数 ≤ 飞过的路 ÷ hbW（整条尾迹一起压进「已经飞过的那段」里）
function rtLoopSizeKeys(P, ball, Vref, Wh, hbW) {
  const T = ball.T, Lp = Math.max(0.05, +P.rtALife || 0.6), lo = clamp(+P.rtLoopMin || 0.25, 0.02, 1), sHead = Wh > 0 ? Math.min(1, 3 * (+P.rtHeadSize || 0.5) / Wh) : 0;
  const ts = new Set(); for (let i = 0; i <= 64; i++) ts.add(i / 64 * T); for (let i = 0; i <= 32; i++) ts.add(Math.min(T, i / 32 * 4 * Lp));
  const p0 = ball.pos(0), up = t => { const p = ball.pos(t); return Math.hypot(p[0] - p0[0], p[2] - p0[2]); };
  const k = [...ts].sort((a, b) => a - b).map(t => { let s = clamp(rtLoopScaleAt(P, ball, Vref, t), 0, 1); if (hbW > 0) s = Math.min(s, up(t) / hbW);
    s = t >= Lp ? Math.max(s, Math.min(lo, hbW > 0 ? up(t) / hbW : lo)) : Math.max(s, sHead); return [+(t / T).toFixed(4), +s.toFixed(4)]; });
  return esThin(k.filter((q, i) => i === 0 || q[0] > k[i - 1][0]), 0.004);
}
// 低分辨率渲几刻、量出内容外框（和旧 rtLayout 同一套口径）：fade = null → 循环层 8 个相位；fade = { stop, Dmax } → 消散（含开花那一刻），顺带量「最后还看得见」
function rtMeasure(P, LI, Vref, fade) {
  const g = rtLoopBox(P, Vref, LI), top = (P.rtHeadSize || 0.5) * 2.5 + 1, view = [0, (top - g.HY * 1.1) / 2, g.HX * 1.2, (top + g.HY * 1.1) / 2];
  const N = 128, NH = 1024, ppm = N / (2 * view[2]), ppmY = NH / (2 * view[3]), E = fixedExposure(P), thr = -Math.log(1 - 3 / 255) / E;
  const t = new Target(N, NH, gl.RGBA16F), buf = new Float32Array(N * NH * 4), acc = new Float32Array(N * NH);
  const R = makeRiseTailLoopRenderer(P, LI, Vref, fade ? { stop: fade.stop, fadeDur: fade.Dmax } : {});
  const pass = ts => { t.clear(); t.bind(); additive(true); PPMY = ppmY; R.subW = 0; R.draw(ts, view, ppm, 1); additive(false); PPMY = 0;
    gl.readPixels(0, 0, N, NH, gl.RGBA, gl.FLOAT, buf); let mx = 0; for (let i = 0; i < acc.length; i++) { const v = buf[i * 4] + buf[i * 4 + 1]; if (v > acc[i]) acc[i] = v; if (v > mx) mx = v; } return mx; };
  let tVis = fade ? fade.Dmax : 0;
  try {
    if (!fade) for (let i = 0; i < 8; i++) pass(i / 8 * LI.Tl);
    else { const NF = 16, thr10 = -Math.log(1 - 10 / 255) / E; tVis = 0; pass(fade.stop); for (let i = 1; i <= NF; i++) { const tf = i / NF * fade.Dmax; if (pass(fade.stop + tf) > thr10) tVis = tf; } }
  } finally { PPMY = 0; t.dispose(); }
  const pxX = 2 * view[2] / N, pxY = 2 * view[3] / NH, Y = j => view[1] - view[3] + (j + 0.5) * pxY;
  let y0 = NH, y1 = -1; const colW = new Float64Array(N); let tot = 0;
  for (let y = 0; y < NH; y++) for (let x = 0; x < N; x++) { const v = acc[y * N + x]; if (v > thr) { if (y < y0) y0 = y; if (y > y1) y1 = y; colW[x] += v; tot += v; } }
  let half = 1, ybot = -g.HY, ytop = top;
  if (y1 >= 0) {
    const ci = Math.round((0 - (view[0] - view[2])) / pxX - 0.5); let inner = colW[ci] || 0, r = 0;
    while (inner < 0.995 * tot && r < N) { r++; inner += (colW[ci - r] || 0) + (colW[ci + r] || 0); }
    half = (r + 1.5) * pxX + 0.15; ybot = Y(y0) - 2 * pxY; ytop = Math.max(Y(y1) + 2 * pxY, P.rtHeadSize * 1.2);
  }
  const W0 = 2 * half, H0 = ytop - ybot, HX = W0 / 2 * 1.03, HY = H0 / 2 * 1.015, cy = (ybot + ytop) / 2;
  return { HX, HY, cy, hb: (0 - (cy - HY)) / (2 * HY), Ww: 2 * HX, Wh: 2 * HY, W0, H0, tVis, measured: y1 >= 0 };
}
const RT_GRIDS = [[16, 1], [8, 2], [4, 4]];
function rtGridFor(P, W0, H0) { let best = null; for (const [c, r] of RT_GRIDS) { const a = (P.texW / c) / (P.texH / r), sc = Math.abs(Math.log(a / (W0 / H0))); if (!best || sc < best.sc) best = { c, r, sc }; } return [best.c, best.r]; }
// 消散贴图：格子 cellW × cellH，帧数 ≤ 火粉烧完 × 帧率上限（引擎每 tick 不跳帧），RGBA 用满，挑最小的贴图（和旧 rtLayout 同一规则）
function rtFadeTex(P, cols, rows, cellW, cellH, Dlife) {
  const fpsT = P.rtFadeFps > 0 ? Math.min(30, P.rtFadeFps) : 30, Fmax = Math.max(1, Math.floor(Dlife * fpsT + 1e-6)); let fd = null;
  for (let c = 1; c <= cols; c *= 2) for (let r = 1; r <= rows; r *= 2) {
    const ch = Math.min(4, Math.max(1, Math.floor(Fmax / (c * r)))), F = c * r * ch; if (F > Fmax && !(c === 1 && r === 1)) continue;
    const sq = -Math.abs(Math.log2(c * cellW / (r * cellH))), full = ch === 4 ? 1 : 0;
    if (!fd || full > fd.full || (full === fd.full && (F > fd.F || (F === fd.F && sq > fd.sq)))) fd = { cols: c, rows: r, chans: ch, F, sq, full };
  }
  return { cols: fd.cols, rows: fd.rows, chans: fd.chans, texW: fd.cols * cellW, texH: fd.rows * cellH, F: fd.F, Df: Dlife, fps: fd.F / Dlife };
}
function rtLayoutGrow(P) {
  const ball = rtBallistic(P), LI = rtLoopInfo(P), Vref = ball.v0, T = ball.T, Tl = LI.Tl, stop = T % Tl;
  const CL = rtTexClasses(P, LI), Dmax = Math.min(rtIsFar(P) ? rtNearA(P)[1] * 1.05 : Infinity, Math.max(rtPowderLifeMax(P), ...CL.map(C => C.lifeMax)) * 1.02);
  const L0 = rtMeasure(P, LI, Vref, null);
  let cols = P.cols, rows = P.rows; if (P.rtGrid > 0 && RT_GRIDS[P.rtGrid - 1]) [cols, rows] = RT_GRIDS[P.rtGrid - 1]; else if (!(P.rtGrid < 0)) [cols, rows] = rtGridFor(P, L0.W0, L0.H0);
  const sk = rtLoopSizeKeys(P, ball, Vref, L0.Wh, L0.hb * L0.Wh), sT = sk[sk.length - 1][1], Vf = Math.max(0.3, sT * Vref);
  if (rtIsFar(P)) return { ball, LI, Vref, T, Tl, stop, Dlife: 0, cols, rows, HX: L0.HX, HY: L0.HY, cy: L0.cy, hb: L0.hb, Ww: L0.Ww, Wh: L0.Wh, fade: null, measured: L0.measured, grow: true, sk };     // 4.5.1 开花后归远段，不量消散
  const F0 = rtMeasure(P, LI, Vf, { stop, Dmax }), Dlife = clamp(F0.tVis + Dmax / 32, Math.min(Dmax, 0.2), Dmax);
  // 消散的格子按它自己的长宽比挑（面片比循环层短），单格像素数和循环层一样
  const [fc, fr] = P.rtGrid > 0 ? [cols, rows] : rtGridFor(P, F0.W0, F0.H0), fcw = P.texW / fc, fch = P.texH / fr;
  const fade = { ...rtFadeTex(P, fc, fr, fcw, fch, Dlife), HX: F0.HX, HY: F0.HY, cy: F0.cy, hb: F0.hb, Ww: F0.Ww, Wh: F0.Wh, Vf, cellW: fcw, cellH: fch };
  return { ball, LI, Vref, T, Tl, stop, Dlife, cols, rows, HX: L0.HX, HY: L0.HY, cy: L0.cy, hb: L0.hb, Ww: L0.Ww, Wh: L0.Wh, fade, measured: L0.measured, grow: true, sk };
}
function rtLayout(P) {
  const key = JSON.stringify(P); if (rtLayoutCache.has(key)) return rtLayoutCache.get(key);
  if (+P.rtLoopSize === 1) { const out = rtLayoutGrow(P); rtLayoutCache.set(key, out); if (rtLayoutCache.size > 24) rtLayoutCache.delete(rtLayoutCache.keys().next().value); return out; }
  const ball = rtBallistic(P), LI = rtLoopInfo(P), Vref = ball.v0, T = ball.T, Tl = LI.Tl, stop = T % Tl;
  const CL = rtTexClasses(P, LI), Dmax = Math.min(rtIsFar(P) ? rtNearA(P)[1] * 1.05 : Infinity, Math.max(rtPowderLifeMax(P), ...CL.map(C => C.lifeMax)) * 1.02);
  const g = rtLoopBox(P, Vref, LI), top = (P.rtHeadSize || 0.5) * 2.5 + 1, view = [0, (top - g.HY * 1.1) / 2, g.HX * 1.2, (top + g.HY * 1.1) / 2];
  const N = 128, NH = 1024, ppm = N / (2 * view[2]), ppmY = NH / (2 * view[3]), E = fixedExposure(P), thr = -Math.log(1 - 3 / 255) / E;
  const t = new Target(N, NH, gl.RGBA16F), buf = new Float32Array(N * NH * 4), acc = new Float32Array(N * NH);
  // 消散时长：最长寿命的火粉 / 火星烧完是上限；按渲染量到「最后还看得见」的时刻为止（老火粉早就暗到看不见了，不留末尾空帧）
  const R = makeRiseTailLoopRenderer(P, LI, Vref), Rf = makeRiseTailLoopRenderer(P, LI, Vref, { stop, fadeDur: Dmax });
  const pass = (RR, ts) => { t.clear(); t.bind(); additive(true); PPMY = ppmY; RR.subW = 0; RR.draw(ts, view, ppm, 1); additive(false); PPMY = 0;
    gl.readPixels(0, 0, N, NH, gl.RGBA, gl.FLOAT, buf); let mx = 0; for (let i = 0; i < acc.length; i++) { const v = buf[i * 4] + buf[i * 4 + 1]; if (v > acc[i]) acc[i] = v; if (v > mx) mx = v; } return mx; };
  let tVis = Dmax;
  try {
    for (let i = 0; i < 8; i++) pass(R, i / 8 * Tl);
    // 「看得见」= 编码后 ≥ 10/255（和自检的末尾暗帧同一条线）
    const NF = 16, thr10 = -Math.log(1 - 10 / 255) / E; tVis = 0;
    if (!rtIsFar(P)) for (let i = 1; i <= NF; i++) { const tf = i / NF * Dmax; if (pass(Rf, stop + tf) > thr10) tVis = tf; }     // 4.5.1 近段 + 远段：开花后归远段，不量消散
  } finally { PPMY = 0; t.dispose(); }
  const Dlife = clamp(tVis + Dmax / 32, Math.min(Dmax, 0.2), Dmax);
  const pxX = 2 * view[2] / N, pxY = 2 * view[3] / NH, X = i => view[0] - view[2] + (i + 0.5) * pxX, Y = j => view[1] - view[3] + (j + 0.5) * pxY;
  let y0 = NH, y1 = -1; const colW = new Float64Array(N); let tot = 0;
  for (let y = 0; y < NH; y++) for (let x = 0; x < N; x++) { const v = acc[y * N + x]; if (v > thr) { if (y < y0) y0 = y; if (y > y1) y1 = y; colW[x] += v; tot += v; } }
  let half = 1, ybot = -g.HY, ytop = top;
  if (y1 >= 0) {
    const ci = Math.round((0 - (view[0] - view[2])) / pxX - 0.5); let inner = colW[ci] || 0, r = 0;
    while (inner < 0.995 * tot && r < N) { r++; inner += (colW[ci - r] || 0) + (colW[ci + r] || 0); }
    half = (r + 1.5) * pxX + 0.15; ybot = Y(y0) - 2 * pxY; ytop = Math.max(Y(y1) + 2 * pxY, P.rtHeadSize * 1.2);
  }
  const W0 = 2 * half, H0 = ytop - ybot;
  // 格子：单格像素数不变，按面片长宽比挑最接近的（和 V5 尾缀的 autoGridTrail 同一条规则）
  let cols = P.cols, rows = P.rows;
  const GR = [[16, 1], [8, 2], [4, 4]];
  if (P.rtGrid > 0 && GR[P.rtGrid - 1]) [cols, rows] = GR[P.rtGrid - 1];
  else if (!(P.rtGrid < 0)) { let best = null; for (const [c, r] of GR) { const a = (P.texW / c) / (P.texH / r), sc = Math.abs(Math.log(a / (W0 / H0))); if (!best || sc < best.sc) best = { c, r, sc }; } cols = best.c; rows = best.r; }
  const HX = W0 / 2 * 1.03, HY = H0 / 2 * 1.015, cy = (ybot + ytop) / 2, hb = (0 - (cy - HY)) / (2 * HY);
  // 消散：同样大的格子，帧数 ≤ 火粉烧完 × 帧率上限（引擎每 tick 不跳帧），RGBA 用满，挑最小的贴图
  const cellW = P.texW / cols, cellH = P.texH / rows, fpsT = P.rtFadeFps > 0 ? Math.min(30, P.rtFadeFps) : 30, Fmax = Math.max(1, Math.floor(Dlife * fpsT + 1e-6));
  let fd = null;
  for (let c = 1; c <= cols; c *= 2) for (let r = 1; r <= rows; r *= 2) {
    const ch = Math.min(4, Math.max(1, Math.floor(Fmax / (c * r)))), F = c * r * ch; if (F > Fmax && !(c === 1 && r === 1)) continue;
    const sq = -Math.abs(Math.log2(c * cellW / (r * cellH))), full = ch === 4 ? 1 : 0;
    if (!fd || full > fd.full || (full === fd.full && (F > fd.F || (F === fd.F && sq > fd.sq)))) fd = { cols: c, rows: r, chans: ch, F, sq, full };
  }
  const fade = { cols: fd.cols, rows: fd.rows, chans: fd.chans, texW: fd.cols * cellW, texH: fd.rows * cellH, F: fd.F, Df: Dlife, fps: fd.F / Dlife };
  const out = { ball, LI, Vref, T, Tl, stop, Dlife, cols, rows, HX, HY, cy, hb, Ww: 2 * HX, Wh: 2 * HY, fade, measured: y1 >= 0 };
  rtLayoutCache.set(key, out); if (rtLayoutCache.size > 24) rtLayoutCache.delete(rtLayoutCache.keys().next().value);
  return out;
}
// 4.5.1 远段 TrailFar 取景（世界坐标）：低分辨率渲远段在整个寿命里的几十个时刻，按烘焙的曝光口径（≥ 3/255）量出内容范围：
//   竖向 = 最低到最高看得见的地方；横向按亮度取 0.2%–99.8%（偶尔漂远的一颗不撑大面片）。开花后的时长量到「最后还看得见」（≥ 10/255）。
//   帧：64 帧（16×1 / 8×2 / 4×4 × RGBA），面片在发射器时间 t0 = 交接中点出现（之前远段还没有东西）。
//   上升段的帧按弹体走过的路平均分（远段的前沿跟着「交接年龄之前」的弹体位置走，出膛那几秒走得快，按时间平均分前沿一帧会跳几十米）；
//   开花后的帧按时间平均分（只剩慢慢变暗、漂开）。每帧烘这一帧显示时间的中点。
const rtFarCache = new Map();
function rtLayoutFar(P, ball, LI) {
  const key = JSON.stringify(P); if (rtFarCache.has(key)) return rtFarCache.get(key);
  const T = ball.T, CL = rtTexClasses(P, LI), [a0, a1] = rtNearA(P), tA = (a0 + a1) / 2;
  const Dmax = Math.max(rtPowderLifeMax(P), ...CL.map(C => C.lifeMax)) * 1.02;
  const pT = ball.pos(T), pad = 30 + 2 * (+P.rtCone || 0) + 15 * (+P.rtTurb || 0);
  const xlo = Math.min(0, pT[0]) - pad, xhi = Math.max(0, pT[0]) + pad, zlo = -25, zhi = ball.H + 25;
  const view = [(xlo + xhi) / 2, (zlo + zhi) / 2, (xhi - xlo) / 2, (zhi - zlo) / 2];
  const N = 160, NH = 1280, ppm = N / (2 * view[2]), ppmY = NH / (2 * view[3]), E = fixedExposure(P), thr = -Math.log(1 - 3 / 255) / E, thr10 = -Math.log(1 - 10 / 255) / E;
  const t = new Target(N, NH, gl.RGBA16F), buf = new Float32Array(N * NH * 4), acc = new Float32Array(N * NH);
  const R = makeRiseTailFarRenderer(P, LI, ball, 0);
  const pass = ts => { t.clear(); t.bind(); additive(true); PPMY = ppmY; R.draw(ts, view, ppm, 1); additive(false); PPMY = 0;
    gl.readPixels(0, 0, N, NH, gl.RGBA, gl.FLOAT, buf); let mx = 0; for (let i = 0; i < acc.length; i++) { const v = buf[i * 4] + buf[i * 4 + 1]; if (v > acc[i]) acc[i] = v; if (v > mx) mx = v; } return mx; };
  let tVis = Dmax;
  try {
    for (let i = 0; i <= 24; i++) pass(tA + (T - tA) * i / 24);
    tVis = 0; for (let i = 1; i <= 20; i++) { const tf = i / 20 * Dmax; if (pass(T + tf) > thr10) tVis = tf; }
  } finally { PPMY = 0; t.dispose(); }
  const Df = clamp(tVis + Dmax / 40, Math.min(Dmax, 0.3), Dmax);
  const pxX = 2 * view[2] / N, pxY = 2 * view[3] / NH, X = i => view[0] - view[2] + (i + 0.5) * pxX, Y = j => view[1] - view[3] + (j + 0.5) * pxY;
  let y0 = NH, y1 = -1; const colW = new Float64Array(N); let tot = 0;
  for (let y = 0; y < NH; y++) for (let x = 0; x < N; x++) { const v = acc[y * N + x]; if (v > thr) { if (y < y0) y0 = y; if (y > y1) y1 = y; colW[x] += v; tot += v; } }
  let xa = 0, xb = N - 1;
  if (tot > 0) { let c = 0; while (xa < N - 1 && c + colW[xa] < 0.002 * tot) c += colW[xa++]; c = 0; while (xb > 0 && c + colW[xb] < 0.002 * tot) c += colW[xb--]; }
  const zb = y1 >= 0 ? Y(y0) - 2 * pxY : 0, zt = y1 >= 0 ? Y(y1) + 2 * pxY : ball.H, xl = X(xa) - 2 * pxX, xr = X(xb) + 2 * pxX;
  const W0 = Math.max(4, xr - xl), H0 = Math.max(10, zt - zb), HX = W0 / 2 * 1.04, cx = (xl + xr) / 2;
  const [cols, rows] = rtGridFor(P, W0, H0), F = cols * rows * 4;
  // 帧时刻（4.5.4，用户 10-05 19:31「曲线太复杂了，序列的曲线你建了 63 个点……有变化的就加几个变化的点」）：
  //   先定一条只有几个拐点的帧号折线，再按它反推每帧时刻 → 导出的帧号曲线就是这几个点（不再一帧一个点）。
  //   上升段：理想是按「交接中点之前」的弹体走过的路平均分（出膛那几秒走得快、前沿一帧不跳几十米），按 0.4 帧的误差抽成几段折线。
  //   开花后：按时间平均分，帧率 ≥ 7.5 fps（标准里淡出段的下限）。
  const Fd = clamp(Math.ceil(7.5 * Df + 1e-6), 6, Math.floor(F / 2)), Fr = F - Fd, n = 400, S = [0];
  for (let i = 1; i <= n; i++) { const ta = (T - tA) * (i - 0.5) / n, v = ball.vel(ta); S.push(S[i - 1] + Math.hypot(v[0], v[2]) * (T - tA) / n); }
  const fine = []; for (let i = 0; i <= n; i++) fine.push([tA + (T - tA) * i / n, Fr * S[i] / Math.max(1e-9, S[n])]);
  const knots = esThin(fine, 0.4).map(([t, f]) => [t, f]); knots[0] = [tA, 0]; knots[knots.length - 1] = [T, Fr]; knots.push([T + Df, F]);
  const tOfF = fv => { let i = 0; while (i < knots.length - 2 && knots[i + 1][1] < fv) i++; const a = knots[i], b = knots[i + 1]; return a[0] + (b[0] - a[0]) * clamp((fv - a[1]) / Math.max(1e-9, b[1] - a[1]), 0, 1); };
  const edges = []; for (let f = 0; f <= F; f++) edges.push(tOfF(f));
  const Dtot = edges[F] - tA, times = [], dur = [];
  // 4.5.3 面片上移 vz（m/s）：寿命里一共走 vz · Dtot，面片加高这么多、开始时中心放低一半，内容始终在面片里
  const vz = rtFarVzOf(P), drift = vz * Dtot, HY = (H0 + drift) / 2 * 1.02, cz = (zb + zt) / 2 - drift / 2;
  for (let f = 0; f < F; f++) { times.push((edges[f] + edges[f + 1]) / 2 - tA); dur.push(edges[f + 1] - edges[f]); }
  const keys = knots.map(([t, f], i) => [+((t - tA) / Dtot).toFixed(5), i === knots.length - 1 ? F - 0.01 : +f.toFixed(3)]);
  const out = { t0: tA, Dtot, Df, Fr, Fd, cols, rows, F, cx, cz, vz, HX, HY, Ww: 2 * HX, Wh: 2 * HY, times, dur, keys, measured: y1 >= 0 };
  rtFarCache.set(key, out); if (rtFarCache.size > 8) rtFarCache.delete(rtFarCache.keys().next().value);
  return out;
}
function rtPlan(P, lay, times, dur, extra = {}) {
  const L = layoutOf(P);
  return { L, HX: lay.HX, HY: lay.HY, Ww: 2 * lay.HX, Wh: 2 * lay.HY, cy: lay.cy, ppm: L.cellW / (2 * lay.HX), zoom: false, aniso: true,
    sizeKeys: [[0, 1], [1, 1]], sizeKeysX: [[0, 1], [1, 1]], sizeKeysY: [[0, 1], [1, 1]], area: 1, px: 0.5, py: lay.hb, keys: [[0, 0], [1, L.F]],
    times, dur, avgFps: L.F / dur.reduce((a, c) => a + c, 0), minFps: 1 / Math.max(...dur), maxDisp: 0, t0: 0, duration: dur.reduce((a, c) => a + c, 0), ...extra };
}
// 烘焙：循环层（真循环）+ 贴图动态消散；粒子层只是数据，引擎回放 / 实时模拟现算
async function bakeEmitSet(P, scale, onProg) {
  P = { ...P, form: 'emitset', outMode: 'combined', frameMode: 'uniform', zoom: 'off', autoGrid: 0 };
  const lay = rtLayout(P); P.cols = lay.cols; P.rows = lay.rows;
  const ES = rtBuildES(P), ball = ES.ball, LI = ES.LI, Vref = ball.v0, T = ball.T, L = layoutOf(P), F = L.F, Tl = LI.Tl;
  const onP = (a, b) => p => onProg && onProg(a + p * (b - a));
  const lt = [], ld = []; for (let f = 0; f < F; f++) { lt.push(f * Tl / F); ld.push(Tl / F); }
  const pl = rtPlan(P, lay, lt, ld, { loop: true, duration: Tl });
  // 面片下端最后 6% 柔和收掉（偶尔跑出去的火星不在格子边上切一刀）
  const bot = [lay.cy - lay.HY + 0.004 * lay.Wh, lay.cy - lay.HY + 0.06 * lay.Wh];
  const R = makeRiseTailLoopRenderer(P, LI, Vref, { bot, fr: [Tl / F, 0] }), far = rtIsFar(P), E0 = fixedExposure(P), kN = rtNearExpoK(P);
  // 4.5.1 近段贴图曝光 × rtNearExpo（白热段不在贴图里顶到 255；引擎里 RiseLoop 的 Color Over Life × 1 / k² 补回暗处的亮度，两段交接处一样亮）
  const b = await bakeFrames(P, scale, onP(0, far ? 0.6 : 0.7), pl, R, kN !== 1 ? { expo: [E0 * kN, E0 * kN] } : {});
  const expo = [b.meta.expoH, b.meta.expoT];
  let bf = null, Df = 0, Ff = 0;
  const stop = lay.stop;
  if (!far) {
    // 消散：开花那一刻的循环相位停喷；时长 = 最长寿命的火粉 / 火星烧完；格子同样大、贴图按帧数挑最小（rtLayout）
    const fl = lay.fade; Df = fl.Df; Ff = fl.F;
    const Pf = { ...P, cols: fl.cols, rows: fl.rows, chans: fl.chans, texW: fl.texW, texH: fl.texH }, ft = [], fd = []; for (let f = 0; f < Ff; f++) { ft.push(f * Df / Ff); fd.push(Df / Ff); }
    // 4.4.5 循环层长度跟尾迹（lay.grow）：消散按循环层最后的等效速度 Vf 单独取景（面片 = 真实大小、星头位置 = 它自己的 hb）
    const fv = lay.grow ? fl : lay, Vfade = lay.grow ? fl.Vf : Vref, botF = lay.grow ? [fv.cy - fv.HY + 0.004 * fv.Wh, fv.cy - fv.HY + 0.06 * fv.Wh] : bot;
    const pf = rtPlan(Pf, fv, ft, fd, { loop: false, t0: stop, duration: Df });
    const Rf = makeRiseTailLoopRenderer(P, LI, Vfade, { stop, fadeDur: Df, bot: botF, fr: [Df / Ff, stop] });
    bf = await bakeFrames(Pf, scale, onP(0.7, 1), pf, Rf, { expo, noFade: true });
    bf.form = 'esFade'; bf.fps = Ff / Df; bf.meta.fadeSeconds = Df; bf.P = Pf; if (lay.grow) Object.assign(bf.meta, { hb: fl.hb, Vf: fl.Vf });
  } else {
    // 4.5.1 远段 TrailFar：世界坐标的全程序列（原来的曝光，Ramp 和实时模拟一致）；开花后所有火花都归它（不再有 RiseFade 消散层）
    const fa = rtLayoutFar(P, ball, LI), Pa = { ...P, cols: fa.cols, rows: fa.rows, chans: 4 };
    const pa = rtPlan(Pa, { HX: fa.HX, HY: fa.HY, cy: fa.cz, hb: 0.5 }, fa.times, fa.dur, { loop: false, t0: fa.t0, duration: fa.Dtot, keys: fa.keys });
    const ba = await bakeFrames(Pa, scale, onP(0.6, 1), pa, makeRiseTailFarRenderer(P, LI, ball, fa.cx, fa.vz || 0, fa.t0), { expo: [E0, E0], noFade: true });
    ba.form = 'esFar'; ba.P = Pa; Object.assign(ba.meta, { far: fa });
    b.far = ba;
  }
  // 4.4（用户 10-04 17:41 UE 实测）：面片长度不再随速度用 Size By Life 压短。以前开花时把循环层 / 消散压到 白热段长(开花速度) ÷ 白热段长(出膛速度)
  // （RT4L 0.061），UE 里循环层到最后还是全长、消散一出来却是扁的 → 跳变；用户把消散改成和循环层一样大就接上了。现在两者都是全长（Size By Life 恒 1、不导出这个模块）。
  // 升空一开始尾迹还没攒出来：循环层前 rtLoopIn 秒亮度从 0 升到 1（Color Over Life），不再像「从地上长出来」。
  // 4.4.5 rtLoopSize = 1：Size By Life 的 Y 跟真实尾迹长（rtLoopSizeKeys），出场不再淡入（尾迹本身从短长出来）
  const sk = lay.grow ? lay.sk : [[0, 1], [1, 1]];
  Object.assign(b.meta, { es: true, ball: { k: ball.k, v0: ball.v0, vz0: ball.vz0, vx0: ball.vx0, T, H: ball.H, Hwant: ball.Hwant, vb: ball.vb, ok: ball.ok, lean: P.rtLean || 0, ...(ball.quad ? { quad: true, vt: ball.vt } : {}) },
    T, Tl, nRev: LI.nRev, loopFps: LI.fps, Vref, stop, fEnd: Math.floor(stop / Tl * F) % F, sizeKeysRise: sk, grow: !!lay.grow, fadeFrames: Ff, fadeFps: bf ? bf.fps : 0, fadeSeconds: Df, hb: lay.hb,
    texSparks: rtTexClasses(P, LI).map(C => C.k), ...(far ? { nearA: rtNearA(P), gpuSplit: rtGpuSplit(P), nearExpo: kN } : {}) });
  b.fades = bf ? [bf] : []; b.es = ES; b.form = 'emitset'; b.P = P;
  return b;
}
// 粒子出生表（按平台缓存在烘焙结果上）
function rtTables(b, mobile) {
  const k = mobile ? '_tabM' : '_tabP';
  if (!b[k]) b[k] = esSpawn(b.es || rtBuildES(b.P), mobile ? (b.P.rtMobile == null ? BASE.rtMobile : b.P.rtMobile) : 1);
  return b[k];
}
// 引擎回放里循环层在时刻 t 的状态：上升 = 循环贴图沿弹道、帧号锯齿、面片长按速度缩放；开花后 = 消散贴图停在开花点
function rtLoopStateAt(b, t) {
  const m = b.meta, ball = rtBallistic(b.P);
  if (t < 0) return null;
  if (t <= m.T) { const p = ball.pos(t); return { bb: b, f: Math.floor(((t % m.Tl) / m.Tl) * m.L.F) % m.L.F, x: p[0], z: p[2], sy: evalKeys(m.sizeKeysRise, t / m.T), phase: 'rise' }; }
  const fd = b.fades && b.fades[0]; if (!fd) return null;
  const f = Math.floor((t - m.T) * fd.fps); if (f >= fd.meta.L.F) return null;
  const p = ball.pos(m.T);
  if (m.grow) return { bb: fd, f, x: p[0], z: p[2], sy: 1, w: fd.meta.Ww, h: fd.meta.Wh, hb: fd.meta.hb, phase: 'fade' };     // 4.4.5：消散有自己的面片（真实大小）
  return { bb: fd, f, x: p[0], z: p[2], sy: m.sizeKeysRise[m.sizeKeysRise.length - 1][1], phase: 'fade' };
}
// 4.5.1 引擎回放里远段在时刻 t 的状态：面片固定在世界里，帧号按寿命（Dynamic Parameter 曲线）
function rtFarStateAt(b, t) {
  const ba = b.far; if (!ba) return null; const fa = ba.meta.far, u = (t - fa.t0) / fa.Dtot;
  if (u < 0 || u >= 1) return null;
  return { bb: ba, f: clamp(Math.floor(evalKeys(fa.keys, u)), 0, fa.F - 1), x: fa.cx, z: fa.cz + (fa.vz || 0) * (t - fa.t0), w: fa.Ww, h: fa.Wh };
}
// 观察镜头：游戏内大小按开花直径定比例（和这一档的开花在同一比例）；看不下整段时跟着星头
function rtView(P, b, t) {
  const ball = rtBallistic(P), T = ball.T, top = ball.H + 12, bot = -4, cx = ball.pos(T)[0] / 2;
  let half;
  if (state.disp === 'game') half = canvas.width / (2 * gamePixelsPerMeter(P, P.rtBurstD || 190));
  else if (state.disp === 'px' && b) half = canvas.width / (2 * (b.meta.L.cellH / b.meta.Wh));
  else half = (top - bot) / 2 * 1.04;
  if (2 * half >= top - bot) return [cx, (top + bot) / 2, half, half * canvas.height / canvas.width];
  const hz = ball.pos(clamp(t, 0, T))[2], hx = ball.pos(clamp(t, 0, T))[0];
  return [hx, clamp(hz - 0.3 * half, bot + half, top - half), half, half * canvas.height / canvas.width];
}
function rtDuration(P) {
  const tail = Math.max(rtPowderLifeMax(P) * 1.05, ...['F', 'M', 'C'].map(k => (P['rt' + k + 'Rate'] > 0 ? P['rt' + k + 'Life'] * (1 + (P['rt' + k + 'Jit'] || 0) / 100) : 0)),
    P.rtERate > 0 ? P.rtELife * 1.3 : 0, P.rtSmoke > 0 ? P.rtSmokeLife * 1.2 : 0);
  return +((+P.rtBall === 1 ? rtBallistic(P).T : P.rtT) + tail + 0.2).toFixed(2);     // 4.4.5 物理弹道：升空时间是算出来的
}
// ---- 导出 ----
// 帧号锯齿（相对寿命 u = t / T）：每个循环周期 0 → 总帧数 − 0.01，周期末尾跳回 0
function rtSawKeys(m) {
  const F = m.L.F, T = m.T, Tl = m.Tl, out = [];
  for (let k = 0; k * Tl < T - 1e-6; k++) {
    const a = k * Tl, b2 = Math.min(T, (k + 1) * Tl - 1e-4);
    out.push([+(a / T).toFixed(5), 0]); out.push([+(b2 / T).toFixed(5), +Math.min(F - 0.01, (b2 - a) / Tl * F).toFixed(2)]);
  }
  return out;
}
// 4.4：循环层 Color Over Life 乘上出场淡入（rtLoopInAt）：在淡入那段补几个关键点，原来的颜色键照留
function rtLoopInKeys(P, col, T) {
  const at = u => { let i = 0; while (i < col.length - 1 && col[i + 1][0] < u) i++; const a = col[i], b = col[Math.min(i + 1, col.length - 1)]; const f = b[0] > a[0] ? clamp((u - a[0]) / (b[0] - a[0]), 0, 1) : 0; return a[1].map((x, k) => x + (b[1][k] - x) * f); };
  const tin = rtLoopIn(P), us = new Set(col.map(([u]) => u)); for (let i = 0; i <= 6; i++) us.add(r4(Math.min(1, i / 6 * tin / T)));
  return [...us].sort((a, b) => a - b).map(u => [u, at(u).map(x => r4(x * rtLoopInAt(P, u * T)))]);
}
// 贴图里放了哪些火花（导出说明 / 统计用）
function rtTexWhat(P) { return RT_TEX_CLS.filter(([k]) => rtTexFrac(P, k) > 0).map(([k]) => Math.round(rtTexFrac(P, k) * 100) + '% 的' + (k === 'F' ? '细' : '中') + '火花').join('、'); }
function rtGpuCapNote(ES) { const g = ES.gpuEst; return g.f < 1 ? `GPU 粒子上限 ${g.cap}：按出生率 × 寿命估同时活着约 ${g.raw} 颗，持续生成的 GPU 发射器出生率一起 × ${g.f.toFixed(2)} → 约 ${g.est} 颗（发射口 Burst 不算）。` : `GPU 粒子上限 ${g.cap}：估同时活着约 ${g.est} 颗，没超。`; }
function fwlEmitSet(name, b, M, mobile) {
  const m = b.meta, P = b.P, L = m.L, F = L.F, fd = b.fades[0] || null, Lf = fd ? fd.meta.L : null, bl = m.ball;     // 4.5.1 近段 + 远段时没有消散层（开花后归远段）
  const textures = {
    loop: { file: TN(name, 'Loop') + '.png', class: 'flipbook', cols: L.cols, rows: L.rows, channels: L.chans, frames: F },
    cutoutLoop: { file: TN(name, 'Loop_Cutout') + '.png', class: 'cutout' },
    ...(fd ? { fade: { file: TN(name, 'Fade') + '.png', class: 'flipbook', cols: Lf.cols, rows: Lf.rows, channels: Lf.chans, frames: Lf.F },
      cutoutFade: { file: TN(name, 'Fade_Cutout') + '.png', class: 'cutout' } } : {}),
    ramp: { file: TN(name, 'Ramp') + '.png', class: 'ramp' }
  };
  const ba = b.far, fa = ba && ba.meta.far, La = ba && ba.meta.L;     // 4.5.1 远段
  if (ba) { textures.far = { file: TN(name, 'Far') + '.png', class: 'flipbook', cols: La.cols, rows: La.rows, channels: La.chans, frames: La.F }; textures.cutoutFar = { file: TN(name, 'Far_Cutout') + '.png', class: 'cutout' }; }
  const materials = {
    loop: { role: 'beam_flipbook', textures: { main: 'loop', ramp: 'ramp' }, scalars: { rows: L.rows, cols: L.cols } },
    ...(fd ? { fade: { role: 'beam_flipbook', textures: { main: 'fade', ramp: 'ramp' }, scalars: { rows: Lf.rows, cols: Lf.cols } } } : {}),
    dot: { role: 'soft_dot' },
    ...(ba ? { far: { role: 'beam_flipbook', textures: { main: 'far', ramp: 'ramp' }, scalars: { rows: La.rows, cols: La.cols } } } : {})
  };
  const col = fwlColor(M, m.T, 0, P.rtBright || 1), last = m.sizeKeysRise[m.sizeKeysRise.length - 1][1];
  const kN = m.nearExpo || 1, colN = kN === 1 ? col : col.map(([u, c]) => [u, c.map(x => r4(x / (kN * kN)))]);     // 4.5.1 近段贴图曝光 × k → Color Over Life × 1 / k²
  // 星头在面片上端：Pivot Offset（和 V5 尾缀同一写法：−0.5, −(1 − 星头离面片下端的比例)）把星头放在粒子位置，Size By Life 的 Y 绕星头缩放
  const pivotY = r4(-(1 - (m.hb == null ? 0.5 : m.hb))), fm = fd ? fd.meta : null, pivotF = m.grow && fm ? r4(-(1 - fm.hb)) : pivotY;     // 4.4.5：消散有自己的面片 / 星头位置
  const vT = rtBallistic(P).vel(m.T), sp = Math.hypot(vT[0], vT[2]) || 1, pT = rtBallistic(P).pos(m.T);
  const emitters = [{
    name: 'RiseLoop', material: 'loop', gpu: false,
    required: { screen_alignment: 'Velocity', duration_s: r4(m.T), loops: 1, delay_s: 0, cutout: 'cutoutLoop', max_draw_count: 1, pivot_offset: [-0.5, pivotY] },
    spawn: { rate: { const: 0 }, bursts: [[0, 1]] },
    modules: [
      { m: 'Lifetime', Lifetime: { const: r4(m.T) } },
      { m: 'InitialSize', StartSize: { const: [r1(m.Ww * 100), r1(m.Wh * 100), 1] } },
      { m: 'InitialVelocity', StartVelocity: { const: [r1(bl.vx0 * 100), 0, r1(bl.vz0 * 100)] } },
      ...(bl.quad ? [{ m: 'VelocityOverLife', VelOverLife: { curve: rtVelLife(rtBallistic(P)).map(([u, v]) => [r4(u), v.map(x => r1(x * 100))]) }, Absolute: true,
        note: '物理弹道（平方阻力，终端速度 ' + r1(bl.vt) + ' m/s）：速度按寿命直接取曲线（Absolute）；Cascade 的 Drag 只有线性，所以不写 Drag / Const Acceleration' }]
        : [{ m: 'Drag', DragCoefficientRaw: { const: r4(bl.k) } }, { m: 'ConstAcceleration', Acceleration: [0, 0, -981] }]),
      ...(m.grow ? [{ m: 'SizeByLife', LifeMultiplier: { curve: m.sizeKeysRise.map(([u, y]) => [r4(u), [1, r4(y), 1]]), bake: false }, MultiplyX: false, MultiplyY: true, MultiplyZ: false,
        note: '只改 Y：面片长 = 真实尾迹长（起步从短长出来，减速变短，不低于循环层最短）；Pivot Offset 把星头放在粒子位置，绕星头缩放' }] : []),
      { m: 'DynamicParameter', params: { frame: { curve: fwlFrameKeys(rtSawKeys(m), F) } } },
      { m: 'ColorOverLife', ColorOverLife: { curve: m.grow ? colN : rtLoopInKeys(P, colN, m.T) }, AlphaOverLife: { const: 1 } }
    ]
  }, ...(!fd ? [] : [{
    name: 'RiseFade', material: 'fade', gpu: false,
    required: { screen_alignment: 'Velocity', duration_s: r4(m.fadeSeconds), loops: 1, delay_s: r4(m.T), cutout: 'cutoutFade', max_draw_count: 1, pivot_offset: [-0.5, pivotF] },
    spawn: { rate: { const: 0 }, bursts: [[0, 1]] },
    modules: [
      { m: 'Lifetime', Lifetime: { const: r4(m.fadeSeconds) } },
      { m: 'InitialLocation', StartLocation: { const: [r1(pT[0] * 100), 0, r1(pT[2] * 100)] } },
      { m: 'InitialVelocity', StartVelocity: { const: [r4(vT[0] / sp), 0, r4(Math.max(0.05, vT[2] / sp))] } },
      { m: 'InitialSize', StartSize: { const: m.grow ? [r1(fm.Ww * 100), r1(fm.Wh * 100), 1] : [r1(m.Ww * 100), r1(m.Wh * last * 100), 1] } },
      { m: 'DynamicParameter', params: Object.assign({ frame: { curve: [[0, 0], [1, r2(Lf.F - 0.01)]] } },
        P.rtDissolve > 0 ? { dissolve: { curve: [[0, 0], [0.4, 0], [1, r4(P.rtDissolve)]] } } : {}) },
      { m: 'ColorOverLife', ColorOverLife: { curve: [col[col.length - 1]].map(([, c]) => [0, c]).concat([[1, col[col.length - 1][1]]]) }, AlphaOverLife: { const: 1 } }
    ]
  }])];
  if (ba) emitters.push({
    name: 'TrailFar', material: 'far', gpu: false,
    // 竖直面片：速度朝向 + 向上的初速（4.5.3：UE 里 1 cm/s 定不住朝向，改成 rtFarVz，默认 50 cm/s；烘焙时内容按面片上移补回，不漂）；Pivot 居中，Initial Location = 开始时的面片中心（相对发射点）
    required: { screen_alignment: 'Velocity', duration_s: r4(fa.Dtot), loops: 1, delay_s: r4(fa.t0), cutout: 'cutoutFar', max_draw_count: 1, pivot_offset: [-0.5, -0.5] },
    spawn: { rate: { const: 0 }, bursts: [[0, 1]] },
    modules: [
      { m: 'Lifetime', Lifetime: { const: r4(fa.Dtot) } },
      { m: 'InitialLocation', StartLocation: { const: [r1(fa.cx * 100), 0, r1(fa.cz * 100)] } },
      { m: 'InitialVelocity', StartVelocity: { const: [0, 0, r1(Math.max(1, (fa.vz || 0) * 100))] } },
      { m: 'InitialSize', StartSize: { const: [r1(fa.Ww * 100), r1(fa.Wh * 100), 1] } },
      { m: 'DynamicParameter', params: { frame: { curve: fwlFrameKeys(fa.keys, La.F) } } },
      { m: 'ColorOverLife', ColorOverLife: { curve: [[0, col[col.length - 1][1]], [1, col[col.length - 1][1]]] }, AlphaOverLife: { const: 1 } }
    ]
  });
  const ES = b.es || rtBuildES(P);
  const fracM = P.rtMobile == null ? BASE.rtMobile : P.rtMobile;
  // 手机比例 0：不写粒子发射器（一颗的 Burst，例如星头光晕，照留）
  for (const e of ES.emitters) { if (mobile && !(fracM > 0) && !(e.bursts || []).some(([, n]) => n === 1)) continue; emitters.push(esFwlEmitter(e, mobile, fracM)); }
  const tab = rtTables(b, mobile), peak = esPeakAlive(tab, m.T + 4);
  return { textures, materials, emitters, system: { preview_distance_cm: Math.round(Math.max(30000, bl.H * 100 * 2)), preview_warmup_s: 0 },
    notes: [
      `循环层 RiseLoop：速度朝向单粒子，星头在面片上端（Pivot Offset ${pivotY}，和 V5 尾缀同一写法；导入器若还不支持这个字段，手动在 Required 里填）；弹道 = ${bl.quad ? 'Initial Velocity + Velocity Over Life（Absolute，物理弹道：平方阻力、终端速度 ' + r1(bl.vt) + ' m/s；这个模块要导入器支持，未经 UE 验证）' : 'Initial Velocity + Drag + Const Acceleration（线性阻力'}，和粒子层的出生曲线同一条）。帧号锯齿：${m.nRev} 圈自转 / ${r2(m.Tl)} s 一个循环。${(m.texSparks || []).length ? (rtTexFrac(P, 'M') > 0 ? '贴图里有星头、白热段火花和 ' + rtTexWhat(P) + '（真循环；其余在 GPU 发射器）。' : '贴图里有星头、白热段火花和 ' + Math.round(rtTexFrac(P, 'F') * 100) + '% 的细火花（真循环；其余细火花在 SparksFine）。') : ''}${m.grow ? '面片长度跟真实尾迹（Size By Life 只改 Y，起步从短长出来、减速变短，最短 × ' + r2(+P.rtLoopMin || 0.25) + '）。' : ''}`,
      ...(!fd ? [] : [`消散 RiseFade：开花时刻（${r2(m.T)} s）在开花点出生，贴图里每颗火花按自己的寿命熄灭；${Lf.F} 帧 / ${r2(m.fadeSeconds)} s。${m.grow ? '按循环层最后的等效速度 ' + r1(fm.Vf) + ' m/s 单独取景烘焙，面片 ' + r1(fm.Ww * 100) + ' × ' + r1(fm.Wh * 100) + ' cm 是真实大小（不压扁），和循环层最后一帧一样长；Pivot Offset ' + pivotF + '。' : ''}${P.rtDissolve > 0 ? 'dissolve 动态参数在后 60% 从 0 升到 ' + r2(P.rtDissolve) + '（材质里溶解怎么表现未经 UE 验证）。' : '不写 dissolve。'}`]),
      ...(ba ? [`远段 TrailFar（4.5.1 近段 + 远段）：开花后所有火花都在远段里演完熄灭，没有 RiseFade 消散层。${kN !== 1 ? '循环层贴图按曝光 × ' + r2(kN) + ' 烘（白热段不顶到 255），RiseLoop 的 Color Over Life × ' + r2(1 / (kN * kN)) + ' 补回（暗处和远段一样亮）。' : ''}年龄 ≥ ${r2(m.nearA[0])}–${r2(m.nearA[1])} s 的火花（已停在空气里）用世界坐标烘成全程序列，一个竖直面片 ${r1(fa.Ww)} × ${r1(fa.Wh)} m 立在发射点上（中心在发射点上方 ${r1(fa.cz)} m${Math.abs(fa.cx) > 0.05 ? '、横向 ' + r1(fa.cx) + ' m' : ''}），${r2(fa.t0)} s 出现、${r2(fa.Dtot)} s 播完：上升段 ${fa.Fr} 帧按弹体走过的路平均分、开花后 ${fa.Fd} 帧自己演完熄灭（帧号曲线不是匀速）。RiseLoop / RiseFade 只剩年轻火花，两段按年龄交叉淡化、相加 = 实时模拟。速度朝向 + ${r1((fa.vz || 0) * 100)} cm/s 向上初速 = 竖直、只绕竖轴转向相机；面片寿命里往上走 ${r1((fa.vz || 0) * fa.Dtot)} m，贴图里的内容已按这个上移补回（世界位置不变）。`,
        `GPU 火花按档预算（同时活着）：粗 ${P.rtGpuC} / 闪烁（中）${P.rtGpuM} / 细 ${P.rtGpuF} 颗${m.gpuSplit && m.gpuSplit.f < 1 ? '，加上落火、末段爆亮超过上限 ' + P.rtGpuMax + '，一起 × ' + m.gpuSplit.f.toFixed(2) : ''}；GPU 那份从贴图里扣掉，贴图 + GPU = 全部火花。${+P.rtGpuDisp > 0 ? 'GPU 火花按远看直径 ' + r2(+P.rtGpuDisp) + ' m 画（光量不变）。' : ''}`] : []),
      `粒子层：出生位置 / 初速是按发射器时间的曲线（"bake": false 不烘查找表，避免关键点被查找表抹掉）；第二个 Initial Velocity 是随机散开。按 spec 第 2 节，出生类曲线按发射器时间取值在 GPU 发射器上还没实测（⚪）。`,
      `同时活着的粒子最多约 ${peak.peak} 颗（${mobile ? '手机' : 'PC'}，第 ${peak.at} s）。软圆点亮度口径未经 UE 验证：烘焙器按「中心值 = 颜色、σ = 尺寸 / 4」的高斯画。`,
      ...(+P.rtGpuSafe === 1 ? ['GPU 兼容（UE 4.24 实测）：GPU 发射器不写 Acceleration（GPU Sprites 不支持），空气乱流只在贴图里；每个发射器最多 2 个 Initial Velocity（出生曲线 + 一个随机散开）。'] : []),
      ...((b.es || rtBuildES(P)).gpuEst && (b.es || rtBuildES(P)).gpuEst.cap > 0 ? [rtGpuCapNote(b.es || rtBuildES(P))] : []),
      ...((P.rtTurb > 0 || P.rtTurbS > 0) && +P.rtGpuSafe !== 1 ? ['空气乱流：Acceleration 模块（大涡 = 按发射器时间的曲线，小涡 = 两个均匀分布相加），加速度 = 阻力 × 空气速度；重力仍在 Const Acceleration。Acceleration 在 GPU 发射器上未经 UE 验证（⚪），不生效时尾迹下段会比烘焙器里硬、直。'] : []),
      ...(P.rtStreakT > 0 ? ['线状火花：拉长的发射器 Screen Alignment = Rectangle（面片 Y 朝屏幕上方 = 竖直拖影），Initial Size 的 Y 和 X 分开、Size By Life 的 Y 按寿命拉长；Color Over Life 已除以拉长倍数（光量守恒）。GPU + Rectangle 未经 UE 验证（⚪）。'] : []),
      ...(P.rtGlow > 0 ? ['HeadGlow 星头光晕：CPU 1 颗，弹道模块和 RiseLoop 完全一样（' + (bl.quad ? 'Initial Velocity + Velocity Over Life' : 'Initial Velocity + Drag + Const Acceleration') + '）→ 和星头重合；Color Over Life 跟喷射脉动。软圆点叠在序列面片上（加色），远处看就是星头周围的一团柔光。'] : []),
      ...(P.rtPopRate > 0 ? [`SparkPops 末段爆亮：和粗火花同一套运动（同一条出生 / 初速曲线、阻力、乱流），Color Over Life 在寿命 ${r2(P.rtPopAt)} 之前全黑、之后闪一下再灭。`] : []),
      ...(P.rtLaunch > 0 ? ['LaunchGlow / LaunchSparks 发射口：0 s 一次性 Burst（Spawn Rate = 0），发射药的闪光 + 向上喷的一把火花；离地 0.5–1 m 出生。'] : [])
    ] };
}
function rtTexFiles(b, name, sfx = '', idx = 1) {
  return (async () => {
    const files = [], k4 = sfx ? sfx.replace(/^_/, '') : '', L = b.meta.L;
    const lp = readRGBA8(b.head); files.push([`${TN(name, joinPart('Loop', k4), L, idx)}.png`, await encodePNG(lp, b.N, b.NH)]);
    if (!sfx) files.push(...await cutoutFiles([lp], b.N, b.NH, L, TN(name, 'Loop_Cutout', null, idx), b.meta));
    const f = b.fades[0];
    if (f) { const fp = readRGBA8(f.head);
      files.push([`${TN(name, joinPart('Fade', k4), f.meta.L, idx)}.png`, await encodePNG(fp, f.N, f.NH)]);
      if (!sfx) files.push(...await cutoutFiles([fp], f.N, f.NH, f.meta.L, TN(name, 'Fade_Cutout', null, idx), f.meta)); }
    if (b.far) { const a = b.far, ap = readRGBA8(a.head); files.push([`${TN(name, joinPart('Far', k4), a.meta.L, idx)}.png`, await encodePNG(ap, a.N, a.NH)]);
      if (!sfx) files.push(...await cutoutFiles([ap], a.N, a.NH, a.meta.L, TN(name, 'Far_Cutout', null, idx), a.meta)); }
    return files;
  })();
}
function rtCascadeText(name, b, M) {
  const m = b.meta, P = b.P, bl = m.ball, fd = b.fades[0];
  const tabP = rtTables(b, false), tabM = rtTables(b, true), pkP = esPeakAlive(tabP, m.T + 4), pkM = esPeakAlive(tabM, m.T + 4);
  return `烟花效果：${name}（${TYPE_NAMES[P.type]}）
工具：烟花母版烘焙器 ${VERSION}（产物：${FORM_NAMES.emitset}）
完整数值在 cascade.json（PC）/ cascade_mobile.json（手机）；下面按 Cascade 里的发射器、模块顺序列出，单位 cm、cm/s、秒。

【弹道】${bl.quad ? '物理（平方阻力，终端速度 ' + bl.vt.toFixed(1) + ' m/s）' : '线性阻力'}：出膛 ${(bl.v0).toFixed(1)} m/s（竖直 ${(bl.vz0 * 100).toFixed(0)} cm/s，水平 ${(bl.vx0 * 100).toFixed(0)} cm/s）· ${bl.quad ? 'Velocity Over Life（Absolute）按寿命写速度' : 'Drag ' + bl.k.toFixed(4) + ' · 重力 −981'}
  ${bl.T.toFixed(2)} s 到 ${bl.H.toFixed(1)} m（要求 ${bl.Hwant} m）· 开花时竖直速度 ${bl.vb.toFixed(1)} m/s${bl.ok ? '' : ' · ⚠ 开花时速度给得太大，没有阻力也到不了：按无阻力'}

【RiseLoop】CPU · 材质角色 beam_flipbook（${P.texW}×${P.texH}，${m.L.cols}×${m.L.rows} 格 × ${m.L.chans} 通道 = ${m.L.F} 帧，RGBA 接力）· Screen Alignment = Velocity · Pivot Offset (−0.5, ${(-(1 - m.hb)).toFixed(4)}) · Duration ${m.T.toFixed(3)} s · Burst 0 s × 1
  Lifetime ${m.T.toFixed(3)} · Initial Size ${(m.Ww * 100).toFixed(1)} × ${(m.Wh * 100).toFixed(1)} cm（星头在面片上端，Pivot Offset 放在粒子位置）
  Initial Velocity (${(bl.vx0 * 100).toFixed(1)}, 0, ${(bl.vz0 * 100).toFixed(1)}) · ${bl.quad ? 'Velocity Over Life（Absolute，相对寿命 → cm/s，完整曲线见 cascade.json）' : 'Drag ' + bl.k.toFixed(4) + ' · Const Acceleration (0, 0, −981)'}
  ${m.grow ? 'Size By Life（只改 Y，不烘查找表）：面片长跟真实尾迹，' + m.sizeKeysRise.length + ' 个关键点，' + m.sizeKeysRise.slice(0, 3).map(([u, v]) => u + ' → ' + v).join('，') + ' … 最后 ' + m.sizeKeysRise[m.sizeKeysRise.length - 1][1] : '面片长度不随速度变（不写 Size By Life；4.4 起，和消散同样大）· 出场淡入：Color Over Life 前 ' + rtLoopIn(P).toFixed(2) + ' s 从 0 升到 1（尾迹还没攒出来）'}
  Dynamic Parameter 帧号：锯齿，每 ${m.Tl.toFixed(3)} s 一个循环（${m.nRev} 圈自转），${rtSawKeys(m).length} 个关键点
  Color Over Life × ${P.rtBright}${(m.nearExpo || 1) !== 1 ? '（贴图曝光 × ' + m.nearExpo + ' 烘，再 × ' + (1 / (m.nearExpo * m.nearExpo)).toFixed(3) + ' 补回）' : ''}

${!fd ? '' : `【RiseFade】CPU · beam_flipbook（${fd.P ? fd.P.texW + '×' + fd.P.texH + '，' : ''}${fd.meta.L.cols}×${fd.meta.L.rows} × ${fd.meta.L.chans} = ${fd.meta.L.F} 帧，${m.grow ? '单格 ' + fd.meta.L.cellW + '×' + fd.meta.L.cellH : '格子和循环层一样大'}）· Pivot Offset ${m.grow ? '(−0.5, ' + (-(1 - fd.meta.hb)).toFixed(4) + ')' : '同上'} · Delay ${m.T.toFixed(3)} s · Duration ${m.fadeSeconds.toFixed(3)} s（${m.fadeFps.toFixed(1)} fps）
  Initial Location = 开花点 · Initial Size = ${m.grow ? (fd.meta.Ww * 100).toFixed(1) + ' × ' + (fd.meta.Wh * 100).toFixed(1) + ' cm（按循环层最后的等效速度 ' + fd.meta.Vf.toFixed(1) + ' m/s 烘的真实大小）' : '和循环层一样大'} · 帧号 0 → ${fd.meta.L.F - 0.01}${P.rtDissolve > 0 ? ' · dissolve 0 →（后 60%）' + P.rtDissolve : ''}

`}${b.far ? (() => { const fa = b.far.meta.far, La = b.far.meta.L; return `【TrailFar】CPU · beam_flipbook（${b.far.P.texW}×${b.far.P.texH}，${La.cols}×${La.rows} × ${La.chans} = ${La.F} 帧）· Screen Alignment = Velocity · Pivot Offset (−0.5, −0.5) · Delay ${fa.t0.toFixed(3)} s · Duration ${fa.Dtot.toFixed(3)} s
  Initial Location (${(fa.cx * 100).toFixed(1)}, 0, ${(fa.cz * 100).toFixed(1)}) · Initial Velocity (0, 0, ${((fa.vz || 0) * 100).toFixed(0)})（定朝向；面片往上走，贴图内容已补回）· Initial Size ${(fa.Ww * 100).toFixed(1)} × ${(fa.Wh * 100).toFixed(1)} cm
  Dynamic Parameter 帧号：上升段 ${fa.Fr} 帧按弹体走过的路、开花后 ${fa.Fd} 帧（开花后所有火花都在这里演完，没有 RiseFade），${fa.keys.length} 个关键点（不是匀速，完整见 cascade.json）

`; })() : ''}【粒子层 · PC】同时活着最多约 ${pkP.peak} 颗
${esCascadeText(b.es || rtBuildES(P), false, 1)}
【粒子层 · 手机】数量 × ${P.rtMobile}，全部 CPU，同时活着最多约 ${pkM.peak} 颗（曲线同 PC，Spawn Rate 乘比例）

【未经 UE 验证】${bl.quad ? 'Velocity Over Life（Absolute）模块（要导入器支持，见 spec 第 5 节）；' : ''}出生类曲线按发射器时间取值在 GPU 发射器上的表现；软圆点的亮度口径；dissolve 在材质里的表现；循环层速度朝向在接近顶点（速度很小）时的朝向${P.rtTurb > 0 || P.rtTurbS > 0 ? '；空气乱流的 Acceleration 模块（GPU）' : ''}${P.rtStreakT > 0 ? '；线状火花 GPU + Rectangle 对齐、Size By Life 的 Y 单独拉长' : ''}。
`;
}
function rtCurvesCSV(b, M) {
  const m = b.meta, rows = ['段,曲线,相对时间,值1,值2,值3'];
  for (const [u, v] of rtSawKeys(m)) rows.push(`RiseLoop,DynamicParameter_帧号,${u},${v},,`);
  for (const [u, c] of (m.grow ? fwlColor(M, m.T, 0, 1) : rtLoopInKeys(b.P, fwlColor(M, m.T, 0, 1), m.T))) rows.push(`RiseLoop,ColorOverLife_线性RGB,${u},${c[0]},${c[1]},${c[2]}`);
  if (m.grow) for (const [u, v] of m.sizeKeysRise) rows.push(`RiseLoop,SizeByLife_Y倍数,${u},${v},,`);
  if (m.ball && m.ball.quad) for (const [u, v] of rtVelLife(rtBallistic(b.P))) rows.push(`RiseLoop,VelocityOverLife_cm每秒,${+u.toFixed(4)},${(v[0] * 100).toFixed(1)},0,${(v[2] * 100).toFixed(1)}`);
  if (b.far) for (const [u, v] of b.far.meta.far.keys) rows.push(`TrailFar,DynamicParameter_帧号,${u},${v},,`);
  for (const e of (b.es || rtBuildES(b.P)).emitters) for (const [u, c] of e.col) rows.push(`${e.name},ColorOverLife_线性RGB,${u},${c[0]},${c[1]},${c[2]}`);
  return '﻿' + rows.join('\n') + '\n';
}
function rtJSON(b, name, M) {
  const m = b.meta, P = b.P, fd = b.fades[0], ES = b.es || rtBuildES(P);
  return { name, type: P.type, typeName: TYPE_NAMES[P.type], form: b.form, tool: '烟花母版烘焙器 ' + VERSION,
    ballistic: m.ball, loop: { periodS: m.Tl, frames: m.L.F, revolutions: m.nRev, spriteSizeCm: [+(m.Ww * 100).toFixed(1), +(m.Wh * 100).toFixed(1)], refSpeed: m.Vref, sizeByLifeY: m.sizeKeysRise, frameKeys: rtSawKeys(m),
      texture: [P.texW, P.texH], grid: [m.L.cols, m.L.rows, m.L.chans], cellPx: [m.L.cellW, m.L.cellH], pivotHead: m.hb, pivotOffset: [-0.5, +(-(1 - m.hb)).toFixed(4)], fill: m.fill ? { x: +m.fill.x.toFixed(3), y: +m.fill.y.toFixed(3) } : null, texSparks: m.texSparks || [] },
    fade: !fd ? null : { frames: fd.meta.L.F, fps: +m.fadeFps.toFixed(3), seconds: +m.fadeSeconds.toFixed(3), dissolveEnd: P.rtDissolve,
      ...(m.grow ? { spriteSizeCm: [+(fd.meta.Ww * 100).toFixed(1), +(fd.meta.Wh * 100).toFixed(1)], pivotHead: fd.meta.hb, pivotOffset: [-0.5, +(-(1 - fd.meta.hb)).toFixed(4)], refSpeed: fd.meta.Vf } : {}), texture: fd.P ? [fd.P.texW, fd.P.texH] : null, grid: [fd.meta.L.cols, fd.meta.L.rows, fd.meta.L.chans], fill: fd.meta.fill ? { x: +fd.meta.fill.x.toFixed(3), y: +fd.meta.fill.y.toFixed(3) } : null },
    ...(b.far ? { nearExpo: m.nearExpo || 1, far: (({ t0, Dtot, Df, Fr, Fd, cols, rows, F, cx, cz, Ww, Wh, keys }) => ({ delayS: +t0.toFixed(3), seconds: +Dtot.toFixed(3), afterBurstS: +Df.toFixed(3), riseFrames: Fr, fadeFrames: Fd, grid: [cols, rows, 4], frames: F,
      centerM: [+cx.toFixed(2), +cz.toFixed(2)], spriteSizeCm: [+(Ww * 100).toFixed(1), +(Wh * 100).toFixed(1)], frameKeys: keys, texture: [b.far.P.texW, b.far.P.texH], fill: b.far.meta.fill ? { x: +b.far.meta.fill.x.toFixed(3), y: +b.far.meta.fill.y.toFixed(3) } : null }))(b.far.meta.far),
      nearAge: m.nearA, gpuSplit: m.gpuSplit } : {}),
    emitters: ES.emitters.map(e => ({ name: e.name, gpuPC: !!e.gpu, life: e.life, size: e.size, drag: e.drag, spawnKeys: e.spawn.length })),
    peakAlive: { pc: esPeakAlive(rtTables(b, false), m.T + 4), mobile: esPeakAlive(rtTables(b, true), m.T + 4) },
    colorOverLife: colorKeys(M, m.T, 0), selfCheck: m.check, params: P, materialDefaults: M };
}
function rtStatsHTML(b) {
  const m = b.meta, P = b.P, bl = m.ball, fd = b.fades[0], c = m.check || {}, cls = ok => ok ? 'ok' : 'warn';
  const pk = esPeakAlive(rtTables(b, false), m.T + 4), pkM = esPeakAlive(rtTables(b, true), m.T + 4);
  const rows = [];
  const fl = q => q && q.fill ? `${Math.round(q.fill.x * 100)}% × ${Math.round(q.fill.y * 100)}%` : '—';
  rows.push(`循环层 + 粒子发射器 · 循环 <b>${m.L.F}</b> 帧（${m.L.cols}×${m.L.rows}×${m.L.chans}，${P.texW}×${P.texH}）· 单格 <b>${m.L.cellW}×${m.L.cellH}</b>${fd ? ` · 消散 <b>${fd.meta.L.F}</b> 帧（${fd.meta.L.cols}×${fd.meta.L.rows}×${fd.meta.L.chans}，${fd.P ? fd.P.texW + '×' + fd.P.texH : ''}）` : ' · 没有消散层（开花后归远段）'}`);
  rows.push(`格子利用（内容外框占格子 横 × 竖，平均）：循环 <b>${fl(m)}</b>${fd ? ' · 消散 ' + fl(fd.meta) : ''}${(m.texSparks || []).length ? ' · 贴图里有 ' + rtTexWhat(P) : ''}`);
  rows.push(`弹道：出膛 <b>${bl.v0.toFixed(1)}</b> m/s · ${bl.quad ? '平方阻力（终端速度 ' + bl.vt.toFixed(1) + ' m/s）' : '阻力 ' + bl.k.toFixed(4) + ' /s（线性）'} · ${bl.T.toFixed(2)} s 到 <b>${bl.H.toFixed(0)}</b> m · 开花时 ${bl.vb.toFixed(1)} m/s${bl.ok ? '' : ' · <span class="warn">开花时速度太大，按无阻力</span>'}${bl.ok && bl.Hwant > 0 && Math.abs(bl.H - bl.Hwant) > 0.02 * bl.Hwant ? ` · <span class="warn">到不了设定的开花高度 ${bl.Hwant} m（阻力反解到上限，实际 ${bl.H.toFixed(0)} m）</span>` : ''}`);
  rows.push(`螺旋：${P.rtSpin} 转/秒 · 出膛时波长 ${(bl.v0 / Math.max(0.01, P.rtSpin)).toFixed(0)} m → 开花前 ${(Math.max(0.5, Math.abs(bl.vb)) / Math.max(0.01, P.rtSpin)).toFixed(1)} m · 循环 ${m.Tl.toFixed(2)} s（${m.nRev} 圈）`);
  if (m.grow) rows.push(`面片长度跟真实尾迹：Size By Life Y ${m.sizeKeysRise[0][1]} → 最长 ${Math.max(...m.sizeKeysRise.map(k => k[1])).toFixed(2)} → 开花时 <b>${m.sizeKeysRise[m.sizeKeysRise.length - 1][1]}</b>（最短 × ${(+P.rtLoopMin || 0.25).toFixed(2)}）${fd ? ` · 消散按 ${fd.meta.Vf.toFixed(1)} m/s 单独取景 ${fd.meta.Ww.toFixed(1)}×${fd.meta.Wh.toFixed(1)} m` : ''}（循环层开花时 ${m.Ww.toFixed(1)}×${(m.Wh * m.sizeKeysRise[m.sizeKeysRise.length - 1][1]).toFixed(1)} m）`);
  rows.push(`面片 ${m.Ww.toFixed(1)}×${m.Wh.toFixed(1)} m（星头在上端 ${Math.round((1 - (m.hb == null ? 0.5 : m.hb)) * 100)}% 处，Pivot Offset）· 接缝 <span class="${cls(c.seam == null || c.seam < 1.6)}">${c.seam == null ? '—' : c.seam.toFixed(2)}</span>（≈1 无缝）${fd ? ` · 消散 ${m.fadeSeconds.toFixed(2)} s（${m.fadeFps.toFixed(1)} fps）` : ''}${(m.nearExpo || 1) !== 1 ? ' · 循环层贴图曝光 × ' + m.nearExpo : ''}`);
  if (b.far) { const fa = b.far.meta.far, La = b.far.meta.L, cf = (b.far.meta.check || {}).clipFrames || [];
    rows.push(`远段 TrailFar：<b>${La.F}</b> 帧（${La.cols}×${La.rows}×${La.chans}）· 面片 ${fa.Ww.toFixed(1)}×${fa.Wh.toFixed(1)} m（单格 ${La.cellW}×${La.cellH}，${(La.cellH / fa.Wh).toFixed(1)} 像素 / 米）· ${fa.t0.toFixed(2)} s 出现、播 ${fa.Dtot.toFixed(2)} s（上升 ${fa.Fr} 帧 / 开花后 ${fa.Fd} 帧）· 交接年龄 ${m.nearA[0]}–${m.nearA[1]} s · 格子利用 ${fl(b.far.meta)}${cf.length ? ' · <span class="warn">' + cf.length + ' 帧过曝</span>' : ''}`); }
  const ESx = b.es || rtBuildES(P), gcap = ESx.gpuEst && ESx.gpuEst.cap > 0 ? ESx.gpuEst.cap : 0;
  rows.push(`粒子层：${ESx.emitters.map(e => e.name).join(' / ')} · 同时最多 PC <b class="${gcap && pk.peak > gcap * 1.1 ? 'warn' : ''}">${pk.peak}</b> 颗（GPU${gcap ? '，上限 ' + gcap + (ESx.gpuEst.f < 1 ? '，出生率 × ' + ESx.gpuEst.f.toFixed(2) : '') : ''}）/ 手机 <b>${pkM.peak}</b> 颗（CPU）${+P.rtGpuSafe === 1 ? ' · GPU 兼容（不写 Acceleration、≤ 2 个 Initial Velocity）' : ''}`);
  const warn = [];
  if (c.clipFrames && c.clipFrames.length) warn.push(`循环层 ${c.clipFrames.length} 帧过曝`);
  if (c.edgeFrames && c.edgeFrames.length) warn.push(`循环层 ${c.edgeFrames.length} 帧碰到格子边缘`);
  rows.push(warn.length ? `<span class="warn">自检：${warn.join('；')}</span>` : '<span class="ok">自检：循环层过曝、边缘正常</span>');
  return rows.join('<br>');
}
// ---- 两个视图 ----
// 粒子出生表（实时模拟用当前参数现算，按参数版本缓存；引擎回放用烘焙结果上的那份）
const rtLive = { gen: -1, P: null, ES: null, tab: null, tabM: null };
function rtLiveTables(P, mobile) {
  if (rtLive.gen !== state.gen || rtLive.P !== P) { rtLive.gen = state.gen; rtLive.P = P; rtLive.ES = rtBuildES(P); rtLive.tab = null; rtLive.tabM = null; }
  if (mobile) return rtLive.tabM || (rtLive.tabM = esSpawn(rtLive.ES, P.rtMobile == null ? BASE.rtMobile : P.rtMobile));
  return rtLive.tab || (rtLive.tab = esSpawn(rtLive.ES, 1));
}
function rtShadeLoop(P, M, t) {
  const pr = PR.rgmat; gl.useProgram(pr.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rgT.tex); gl.uniform1i(pr.u.uS, 0);
  gl.uniform1f(pr.u.uEH, fixedExposure(P)); gl.uniform1f(pr.u.uET, fixedExposure(P)); gl.uniform1f(pr.u.uG, P.encGamma || 1); gl.uniform1f(pr.u.uComb, 1);
  setMatUniforms(pr, { ...M, headInt: intOr1(M.headInt) * (P.rtBright || 1) }, t); drawQuad();
}
// ---- 4.5.1 分层看（用户 10-05 17:39「我没法单独看近段、远段和 GPU 粒子层」）：只影响观察，不改参数和导出 ----
//   工具条上一排：近段 / 远段 / 每个 GPU（和 CPU 软圆点）发射器，后面是此刻的颗数；点一下开 / 关，双击只看这一层，「全部」恢复
const RT_LAYER_CN = { near: '近段', far: '远段', SparksCoarse: '粗火花', SparksTwinkle: '闪烁火花', SparksMid: '中火花', SparksFine: '细火花', Embers: '落火', SparkPops: '末段爆亮',
  HeadGlow: '星头光晕', LaunchGlow: '发射口闪光', LaunchSparks: '发射口火花', Smoke: '烟带' };
const rtShow = { off: new Set(), sig: '' };
const rtOn = k => !rtShow.off.has(k);
function rtAliveCounts(tables, t) { return tables.map(T => { let n = 0; for (const q of T.list) { if (q.t0 > t) break; if (t - q.t0 < q.life) n++; } return n; }); }
function rtLayerBarSync(items) {     // items: [[key, 颗数 | null, GPU?]]
  const bar = typeof document !== 'undefined' && document.getElementById('rtLayerBar'); if (!bar) return;
  const sig = items.map(x => x[0]).join(',');
  if (rtShow.sig !== sig) {
    rtShow.sig = sig; for (const k of [...rtShow.off]) if (!items.some(x => x[0] === k)) rtShow.off.delete(k);
    bar.innerHTML = '<button type="button" data-all="1">全部</button><span class="sep"></span>' + items.map(([k, , g], i) => (i && g && !items[i - 1][2] ? '<span class="sep"></span>' : '') +
      `<button type="button" data-k="${k}" title="${g ? 'GPU 发射器' : k === 'near' ? '近段 = 循环层（跟着弹体走的年轻火花 + 星头 + 白热段）' : k === 'far' ? '远段 = TrailFar（停在空中的老火花，开花后全部火花）' : 'CPU 软圆点'}：点一下开 / 关，双击只看这一层">${RT_LAYER_CN[k] || k}<span class="n"></span></button>`).join('');
    bar.querySelector('[data-all]').addEventListener('click', () => { rtShow.off.clear(); });
    bar.querySelectorAll('[data-k]').forEach(btn => {
      btn.addEventListener('click', () => { const k = btn.dataset.k; if (rtShow.off.has(k)) rtShow.off.delete(k); else rtShow.off.add(k); });
      btn.addEventListener('dblclick', () => { const k = btn.dataset.k; rtShow.off = new Set(items.map(x => x[0]).filter(x => x !== k)); });
    });
  }
  items.forEach(([k, n]) => { const btn = bar.querySelector(`[data-k="${k}"]`); if (!btn) return; btn.classList.toggle('off', !rtOn(k)); btn.querySelector('.n').textContent = n == null ? '' : n.toLocaleString(); });
}
const rtShowNote = () => rtShow.off.size ? ' · 分层看：关了 ' + [...rtShow.off].map(k => RT_LAYER_CN[k] || k).join('、') : '';
function renderEmitLive() {
  const P = state.P, M = state.M, b = state.bake && state.bake.form === 'emitset' ? state.bake : null, mobile = state.platform === 'mobile';
  const t = Math.min(state.t, P.duration), view = rtView(P, b, t), ppm = rgT.w / (2 * view[2]), ppmY = rgT.h / (2 * view[3]);
  const ball = rtBallistic(P), LI = rtLoopInfo(P), far = rtIsFar(P), T = ball.T;
  rgT.clear(); rgT.bind(); additive(true); PPMY = ppmY;
  let np = 0, nf = 0;
  try {
    if (!far) { if (rtOn('near')) np = drawRiseTailLive(P, LI, ball, t, view, ppm); }
    else {     // 近段 + 远段：按年龄权重分开画（两份相加 = 全部）；开花后全归远段
      const nw = rtNearW(P);
      if (rtOn('near') && t <= T) { setParticleProfile(P); const p = ball.pos(t), v = ball.vel(t), sp = Math.hypot(v[0], v[2]) || 1;
        drawPoints(bufH, rtHeadPts(P, p[0], p[2], -v[0] / sp, -v[2] / sp, P.rtHeadI * LI.pulse(t), 0) / 4, view, ppm, [1, 0, 0, 0], 1); np = rtWorldDraw(P, LI, ball, t, view, ppm, 1, nw, 0); }
      if (rtOn('far')) nf = rtWorldDraw(P, LI, ball, t, view, ppm, 1, t <= T ? a => 1 - nw(a) : null, 0);
    }
  } finally { PPMY = 0; }
  additive(false);
  hdrT.bind(); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); rtShadeLoop(P, M, t);
  const tabs = rtLiveTables(P, mobile), on = tabs.map(x => rtOn(x.e.name));
  additive(true); const nd = esDraw(tabs, t, view, hdrT.w / (2 * view[2]), hdrT.h / (2 * view[3]), 1, on); additive(false);
  post();
  const cnt = rtAliveCounts(tabs, t);
  rtLayerBarSync([['near', np, false], ...(far ? [['far', nf, false]] : []), ...tabs.map((x, i) => [x.e.name, cnt[i], !!x.e.gpu])]);
  const dist = state.disp === 'game' ? ` · 游戏内大小 ${state.dist} m（真实米数：四尺玉 ${GAME_REF_D} m 在 1000 m 占屏高 1/3）` : '';
  hudText = `实时模拟 · 升空尾缀 · ${t <= ball.T ? '上升 ' + t.toFixed(2) + ' / ' + ball.T.toFixed(2) + ' s' : '已开花，火花各自燃尽中'} · ${far ? '近段 ' + np.toLocaleString() + ' + 远段 ' + nf.toLocaleString() : '循环层火花 ' + np.toLocaleString()} 颗 + 粒子层 ${nd.toLocaleString()} 颗（${mobile ? '手机减量' : 'PC'}）${dist}${rtShowNote()}`;
  hudB = '';
}
function renderEmitExport(b) {
  const P = b.P, M = state.M, m = b.meta, t = engineTick(state.t), view = rtView(P, b, t), ppm = hdrT.w / (2 * view[2]), ppmY = hdrT.h / (2 * view[3]);
  hdrT.clear(); hdrT.bind(); additive(true);
  const s = rtOn('near') ? rtLoopStateAt(b, t) : null, sa = rtOn('far') ? rtFarStateAt(b, t) : null;     // 4.5.1 分层看
  if (sa) {     // 4.5.1 远段：面片中心在 (cx, cz)，速度朝向竖直（Pivot 居中）
    const pr = PR.mat; gl.useProgram(pr.p);
    gl.uniform4fv(pr.u.uRect, [sa.x - sa.w / 2, sa.z - sa.h / 2, sa.x + sa.w / 2, sa.z + sa.h / 2]); gl.uniform4fv(pr.u.uView, view);
    bindSeqTextures(pr, sa.bb); gl.uniform1f(pr.u.uFrame, sa.f); gl.uniform1f(pr.u.uMirror, 0);
    setMatUniforms(pr, { ...M, headInt: intOr1(M.headInt) * (P.rtBright || 1) }, t);
    gl.bindVertexArray(quadVAO); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.activeTexture(gl.TEXTURE0);
  }
  if (s) {
    const w = s.w || m.Ww, h = (s.h || m.Wh) * s.sy, hb = s.hb != null ? s.hb : m.hb == null ? 0.5 : m.hb, pr = PR.mat; gl.useProgram(pr.p);
    gl.uniform4fv(pr.u.uRect, [s.x - w / 2, s.z - h * hb, s.x + w / 2, s.z + h * (1 - hb)]); gl.uniform4fv(pr.u.uView, view);   // 星头 = 粒子位置（Pivot Offset）
    bindSeqTextures(pr, s.bb); gl.uniform1f(pr.u.uFrame, s.f); gl.uniform1f(pr.u.uMirror, 0);
    const kin = (s.phase === 'rise' && !m.grow ? rtLoopInAt(P, t) : 1) / (s.phase === 'rise' && m.nearExpo ? m.nearExpo * m.nearExpo : 1);     // 4.5.1 近段贴图曝光补回（和导出的 Color Over Life 一样）     // 4.4：出场淡入（和导出的 Color Over Life 一样）；4.4.5 跟尾迹长度时不淡入
    setMatUniforms(pr, { ...M, headInt: intOr1(M.headInt) * (P.rtBright || 1) * kin, tailInt: (M.tailInt == null ? 1 : M.tailInt) * kin }, t);
    gl.bindVertexArray(quadVAO); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.activeTexture(gl.TEXTURE0);
  }
  const tabs = rtTables(b, !!b.esMobile), nd = esDraw(tabs, t, view, ppm, ppmY, 1, tabs.map(x => rtOn(x.e.name)));
  additive(false); post();
  const cnt = rtAliveCounts(tabs, t);
  rtLayerBarSync([['near', null, false], ...(b.far ? [['far', null, false]] : []), ...tabs.map((x, i) => [x.e.name, cnt[i], !!x.e.gpu])]);
  const dist = state.disp === 'game' ? ` · 游戏内大小 ${state.dist} m` : '';
  hudText = `引擎回放 · ${b.esMobile ? '手机' : 'PC'} · 循环层 ${!rtOn('near') ? '（分层看关了）' : !s ? '已结束' : s.phase === 'rise' ? '上升循环第 ' + (s.f + 1) + '/' + m.L.F + ' 帧' : '贴图动态消散第 ' + (s.f + 1) + '/' + s.bb.meta.L.F + ' 帧'}（面片 ${((s && s.w) || m.Ww).toFixed(1)} × ${(((s && s.h) || m.Wh) * (s ? s.sy : 1)).toFixed(1)} m）${b.far ? ' + 远段 ' + (sa ? '第 ' + (sa.f + 1) + '/' + sa.bb.meta.far.F + ' 帧' : '—') : ''} + 粒子层 ${nd.toLocaleString()} 颗${dist} · 溶解另由材质处理（未经 UE 验证）${rtShowNote()}`;
  hudB = '';
}
