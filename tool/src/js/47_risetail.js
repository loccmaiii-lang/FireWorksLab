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
function rtBallistic(P) {
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
const RT_TEX_CLS = [['F', 'SparksFine', 5]];
const rtTexFrac = (P, k) => (P['rt' + k + 'Rate'] || 0) > 0 ? clamp(P['rt' + k + 'Tex'] || 0, 0, 1) : 0;
function rtTexClasses(P, LI) {
  const sJ = clamp((P.rtSizeJit == null ? 25 : P.rtSizeJit) / 100, 0, 0.9), kJ = clamp((P.rtKdJit == null ? 20 : P.rtKdJit) / 100, 0, 0.9);
  const soft = (P.rtConeSoft || 0) > 0, us = (P.rtTurbS || 0) * Math.sqrt(1.5);
  return RT_TEX_CLS.filter(([k]) => rtTexFrac(P, k) > 0).map(([k, , salt]) => {
    const L = P['rt' + k + 'Life'], j = (P['rt' + k + 'Jit'] || 0) / 100, M = Math.max(1, Math.round(P['rt' + k + 'Rate'] * rtTexFrac(P, k) * LI.Tl));
    // 亮度随寿命：黑体温度 + 闪烁 + 熄灭（和 GPU 发射器的 Color Over Life 同一条曲线，取亮度，燃烧温度处 = 1），光量 ∝ 尺寸²
    const dT = P['rt' + k + 'dT'] || 0, c0 = rtSparkColor(P, L, 1, dT), ref = rtLum(rtBB(P.rtTb + dT)) * 0.25 / rtLum(rtBB(P.rtTb));
    const lum = c0.map(([u, c]) => [u, rtLum(c) / Math.max(1e-6, ref) * 0.01 * (P.rtTexI == null ? 1 : P.rtTexI)]);
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
function rtTexSparksDraw(P, CL, LI, Vref, ts, te, view, ppm, w, fr, fadeAll, bot, subW) {
  const R0 = (P.rtD || 0) / 2, ppy = PPMY || ppm, cap = bufT.length / 4, smax = Math.max(1, P.rtStreakMax || 6); let n = 0;
  const tq = fr && fr[0] > 0 ? fr[1] + Math.round((ts - fr[1]) / fr[0]) * fr[0] : ts;
  // 烘焙：所有子帧画的都是本帧中间时刻 → 只在离中间最近的那个子帧画一次（权重 1），省掉重复的点
  if (fr && fr[0] > 0 && subW > 0) { if (!(ts - subW / 2 <= tq + 1e-9 && tq < ts + subW / 2 - 1e-9)) return 0; w = 1; }
  for (const C of CL) {
    const tau = (P.rtStreakT || 0) * (P['rt' + C.k + 'Streak'] == null ? 1 : P['rt' + C.k + 'Streak']);
    for (let gi = Math.floor(Math.min(te, tq) * C.rate); ; gi--) {
      const q = rtTexSparkOf(P, C, gi);
      if (q.tb > te) continue;
      const a = tq - q.tb; if (a > C.lifeMax + 0.02) break; if (a < 0 || a >= q.life) continue;
      const u = a / q.life, o = rtTexSparkAt(P, q, a, Vref, R0, rtTmp4);
      let I = esCurve(C.lum, u) * (q.size / C.S) * (q.size / C.S) * LI.pulse(q.tb) * fadeAll; if (bot) I *= smoothstepJS(bot[0], bot[1], o[1]); if (I <= 0) continue;
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
  const lifeMax = rtPowderLifeMax(P), CL = rtTexClasses(P, LI);
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
      if (CL.length) rtTexSparksDraw(P, CL, LI, Vref, ts, te, view, ppm, w, R.fr, fadeAll, R.bot, R.subW);
      if (rate0 <= 0) return;
      const cap = bufT.length / 4; let n = 0;
      for (let gi = Math.floor(te * rate); ; gi--) {
        const q = rtPowderOf(P, LI, gi, M, rate, salt);
        if (q.tb > te) continue;
        const a = ts - q.tb; if (a > lifeMax + 0.02) break; if (a < 0 || a >= q.life) continue;
        const e = Math.exp(-q.kd * a), s1 = (1 - e) / q.kd;
        const x = R0 * Math.cos(q.ph) + (-q.fl * Math.sin(q.ph) + q.cx) * s1 + q.wx * (a - s1);
        const z = (-q.j + q.cz) * s1 - (Vref + G / q.kd - q.wz) * (a - s1);
        let I = rtPowderI(P, q, a, LI.pulse(q.tb)) * fadeAll; if (R.bot) I *= smoothstepJS(R.bot[0], R.bot[1], z); if (I <= 0 || n >= cap) continue;
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
  const T = ball.T, R0 = (P.rtD || 0) / 2, lifeMax = rtPowderLifeMax(P);
  if (t <= T) {
    const p = ball.pos(t), v = ball.vel(t), sp = Math.hypot(v[0], v[2]) || 1;
    const k = rtHeadPts(P, p[0], p[2], -v[0] / sp, -v[2] / sp, P.rtHeadI * LI.pulse(t), 0);
    drawPoints(bufH, k / 4, view, ppm, [1, 0, 0, 0], 1);
  }
  let n = 0;
  const CL = rtTexClasses(P, LI);
  if (CL.length) {
    // 贴图火星在地面坐标：出生时刻的弹体位置 + 速度（同一套随机量），拖影 = 相对星头此刻速度 × 循环层快门
    const te = Math.min(t, T), vh = ball.vel(Math.min(t, T)), ppy = PPMY || ppm, cap = bufT.length / 4, smax = Math.max(1, P.rtStreakMax || 6);
    for (const C of CL) for (let gi = Math.floor(te * C.rate), tau = (P.rtStreakT || 0) * (P['rt' + C.k + 'Streak'] == null ? 1 : P['rt' + C.k + 'Streak']); gi >= 0; gi--) {
      const q = rtTexSparkOf(P, C, gi);
      if (q.tb > te) continue;
      const a = t - q.tb; if (a > C.lifeMax + 0.02) break; if (a < 0 || a >= q.life) continue;
      const p = ball.pos(q.tb), v = ball.vel(q.tb), sp = Math.hypot(v[0], v[2]) || 1, dx = v[0] / sp, dz = v[2] / sp;
      const e = Math.exp(-q.kd * a), s1 = (1 - e) / q.kd, u = a / q.life;
      const vx0 = v[0] - (P.rtJet || 0) * dx - (P.rtFling || 0) * Math.sin(q.ph) + q.cx, vz0 = v[2] - (P.rtJet || 0) * dz + q.cz;
      const x = p[0] + R0 * Math.cos(q.ph) + vx0 * s1 + q.wx * (a - s1), z = p[2] + vz0 * s1 - (G / q.kd - q.wz) * (a - s1);
      const rvx = vx0 * e + q.wx * (1 - e) - (t <= T ? vh[0] : 0), rvz = vz0 * e - (G / q.kd - q.wz) * (1 - e) - (t <= T ? vh[2] : 0);
      const I = esCurve(C.lum, u) * (q.size / C.S) * (q.size / C.S) * LI.pulse(q.tb); if (I <= 0) continue;
      const S = q.size * (u < 0.7 ? 1 : 1 + (C.shrink - 1) * (u - 0.7) / 0.3) / 2, rs = Math.hypot(rvx, rvz) || 1e-6, Lm = Math.min(rs * tau, smax * S * 2);
      const m = clamp(Math.ceil(Lm * Math.hypot(rvx * ppm, rvz * ppy) / rs / 1.2), 1, 32);
      for (let i = 0; i < m && n < cap; i++) { const d = m > 1 ? ((i + 0.5) / m - 0.5) * Lm : 0; bufT[n * 4] = x + rvx / rs * d; bufT[n * 4 + 1] = z + rvz / rs * d; bufT[n * 4 + 2] = I / m; bufT[n * 4 + 3] = S; n++; }
    }
    drawPoints(bufT, n, view, ppm, [0, 1, 0, 0], 1);
  }
  const rate0 = P.rtARate || 0; if (rate0 <= 0) return n;
  const M = Math.max(1, Math.round(rate0 * LI.Tl)), rate = M / LI.Tl, salt = (P.seed | 0) * 7 + 11, te = Math.min(t, T), cap = bufT.length / 4;
  let np = 0;
  for (let gi = Math.floor(te * rate); gi >= 0; gi--) {
    const q = rtPowderOf(P, LI, gi, M, rate, salt);
    if (q.tb > te) continue;
    const a = t - q.tb; if (a > lifeMax + 0.02) break; if (a < 0 || a >= q.life) continue;
    const p = ball.pos(q.tb), v = ball.vel(q.tb), sp = Math.hypot(v[0], v[2]) || 1, dx = v[0] / sp, dz = v[2] / sp;
    const e = Math.exp(-q.kd * a), s1 = (1 - e) / q.kd;
    const vx0 = v[0] - q.j * dx - q.fl * Math.sin(q.ph) + q.cx, vz0 = v[2] - q.j * dz + q.cz;
    const x = p[0] + R0 * Math.cos(q.ph) + vx0 * s1 + q.wx * (a - s1), z = p[2] + vz0 * s1 - (G / q.kd - q.wz) * (a - s1);
    const I = rtPowderI(P, q, a, LI.pulse(q.tb)); if (I <= 0 || np >= cap) continue;
    bufT[np * 4] = x; bufT[np * 4 + 1] = z; bufT[np * 4 + 2] = I; bufT[np * 4 + 3] = q.size; np++;
  }
  drawPoints(bufT, np, view, ppm, [0, 1, 0, 0], 1);
  return n + np;
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
  const spawn = rate => ts.map(t => [t, rate * LI.pulse(t)]);
  // 横向散开：两个均匀分布相加（两个 Initial Velocity）→ 三角分布，均方根和原来 ±c 的均匀分布一样，边缘不再是一刀切
  const soft = (P.rtConeSoft || 0) > 0, c = (P.rtCone || 0) / (soft ? Math.SQRT2 : 1), cb = [[-c, -c, -c / 2], [c, c, c / 2]], cone = soft ? [cb, cb] : cb, seed = P.seed | 0;
  // 乱流：大涡（按发射器时间的 Acceleration 曲线）+ 小涡 / 弹体尾流（每颗随机，也用两个相加）。加速度 = 阻力 × 空气速度
  const air = rtAir(P, ball), airK = tl.map(t => [t, air(t)]), us = (P.rtTurbS || 0) * Math.sqrt(1.5);
  //   重力仍走 Const Acceleration（已实测），乱流单独用 Acceleration 模块（未经 UE 验证）
  const turb = kd => ({ accel: [0, 0, -G], accelCurve: P.rtTurb > 0 ? airK.map(([t, w]) => [t, [w[0] * kd, w[1] * kd, w[2] * kd]]) : null,
    accelJit: us > 0 ? [0, 1].map(() => [[-us * kd, -us * kd, -us * kd * 0.7], [us * kd, us * kd, us * kd * 0.7]]) : null });
  const sJ = clamp((P.rtSizeJit == null ? 25 : P.rtSizeJit) / 100, 0, 0.9), kJ = clamp((P.rtKdJit == null ? 20 : P.rtKdJit) / 100, 0, 0.9);
  const em = [];
  for (const [k, name, salt] of [['F', 'SparksFine', 1], ['M', 'SparksMid', 2], ['C', 'SparksCoarse', 3]]) {
    const rate = (P['rt' + k + 'Rate'] || 0) * (1 - rtTexFrac(P, k)); if (rate <= 0) continue;   // 烘进贴图的那部分不再出 GPU
    const L = P['rt' + k + 'Life'], j = (P['rt' + k + 'Jit'] || 0) / 100, S = P['rt' + k + 'Size'], kd = P['rt' + k + 'Kd'];
    const sizeLife = [[0, 1], [0.7, 1], [1, P.rtShrink == null ? 0.5 : P.rtShrink]];
    const sl = rtStretchLife(P, ball, P.rtJet, kd, L, S, sizeLife, P['rt' + k + 'Streak']);
    let col = rtSparkColor(P, L, P['rt' + k + 'I'] * (P.rtDotGain == null ? 1 : P.rtDotGain), P['rt' + k + 'dT'] || 0);
    if (sl) col = col.map(([u, c]) => [u, c.map(x => +(x / esCurve(sl, u)).toFixed(4))]);
    em.push({ name, gpu: true, delay: 0, duration: T, seed: seed * 13 + salt, spawn: spawn(rate),
      life: [L * (1 - j), L * (1 + j)], size: [S * (1 - sJ), S * (1 + sJ)], drag: [kd * (1 - kJ), kd * (1 + kJ)], ...turb(kd),
      loc, vel: vel(P.rtJet, P.rtFling), velAdd: cone, sizeLife, col,
      ...(sl ? { align: 'screen', stretch: 1, stretchLife: sl } : {}) });
  }
  if ((P.rtERate || 0) > 0) {
    const L = P.rtELife, kd = P.rtEKd;
    em.push({ name: 'Embers', gpu: true, delay: 0, duration: T, seed: seed * 13 + 4, spawn: spawn(P.rtERate),
      life: [L * 0.7, L * 1.3], size: [P.rtESize * 0.8, P.rtESize * 1.2], drag: [kd * 0.7, kd * 1.3], ...turb(kd),
      loc, vel: vel(P.rtJet * 0.6, P.rtFling * 0.5), velAdd: soft ? cone : [[-c * 1.5, -c * 1.5, -c], [c * 1.5, c * 1.5, c * 0.3]],
      sizeLife: [[0, 1], [0.8, 0.9], [1, 0.4]], col: rtSparkColor(P, L, P.rtEI * (P.rtDotGain == null ? 1 : P.rtDotGain), -180) });
  }
  // ---- 引擎里加的效果（4.2.2，用户 19:25「在引擎也加上一些效果会更丰富」；都是软圆点，不新增材质）----
  // 星头光晕：星头的强光被空气 / 烟散射成一团柔光（贴图格子窄，放不下这么大的光晕 → 引擎里单独一颗）。弹道和循环层同一套（Initial Velocity + Drag + 重力），亮度跟喷射脉动
  if ((P.rtGlow || 0) > 0) {
    const S = P.rtGlowSize || 4, bb = rtBB(P.rtT0 || 2450), r = rtLum(bb), keys = [];
    for (const t of ts) { const u = t / T, f = 1 - 0.35 * smoothstepJS(0.85, 1, u); keys.push([+u.toFixed(5), bb.map(x => +(x / r * 0.25 * P.rtGlow * LI.pulse(t) * f).toFixed(4))]); }
    em.push({ name: 'HeadGlow', gpu: false, delay: 0, duration: T, seed: seed * 13 + 6, spawn: [], bursts: [[0, 1]],
      life: [T, T], size: [S, S], drag: [ball.k, ball.k], accel: [0, 0, -G], loc: [[0, [0, 0, 0]]], vel: [[0, [ball.vx0, 0, ball.vz0]]],
      sizeLife: [[0, 1], [1, 0.8]], col: keys });
  }
  // 末段爆亮：木炭 + 硫的熔渣粒烧到最后会微爆，闪一下（线香花火「松叶」的同一个机理）。和粗火星同一套运动，Color Over Life 前面全黑、寿命末段一闪
  if ((P.rtPopRate || 0) > 0) {
    const L = P.rtCLife, kd = P.rtCKd, u0 = clamp(P.rtPopAt == null ? 0.85 : P.rtPopAt, 0.2, 0.95), hot = rtBB((P.rtT0 || 2450) + 300), r = rtLum(hot), I = (P.rtPopI || 0) * 0.25 / r * (P.rtDotGain == null ? 1 : P.rtDotGain);
    const c = (k2) => hot.map(x => +(x * I * k2).toFixed(4)), gold = rtBB(P.rtTb || 2150), rg = rtLum(gold);
    em.push({ name: 'SparkPops', gpu: true, delay: 0, duration: T, seed: seed * 13 + 7, spawn: spawn(P.rtPopRate),
      life: [L * 0.6, L * 1.2], size: [(P.rtPopSize || 0.5) * 0.7, (P.rtPopSize || 0.5) * 1.3], drag: [kd * (1 - kJ), kd * (1 + kJ)], ...turb(kd),
      loc, vel: vel(P.rtJet, P.rtFling), velAdd: cone, sizeLife: [[0, 0.4], [u0, 0.4], [u0 + 0.02, 1.2], [1, 0.6]],
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
      velAdd: [[[-ca, -ca, -v * 0.3], [ca, ca, v * 0.3]], [[-ca, -ca, 0], [ca, ca, 0]]], sizeLife: [[0, 1], [1, 0.5]],
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
  return { ball, LI, T, emitters: em };
}
// 面片取景的粗估（随体坐标）：横向 = 喷口半径 + 甩出 / 阻力 + 散开；竖向 = 出膛速度下白热段 / 贴图火星的最长距离。只用来定测量窗口
function rtLoopBox(P, Vref, LI) {
  const R0 = (P.rtD || 0) / 2, kmin = P.rtAKd * 0.7, lifeMax = P.rtALife * Math.exp(1.5 * (P.rtALsig || 0));
  let hx = R0 + P.rtFling * 1.2 / kmin + 3 * P.rtACone / kmin + P.rtHeadSize + 0.4;
  const drop = (j, kd, L) => { let d = 0; for (let i = 0; i <= 64; i++) { const a = L * i / 64, s1 = (1 - Math.exp(-kd * a)) / kd; d = Math.max(d, j * s1 + (Vref + G / kd) * (a - s1)); } return d; };
  let down = drop(P.rtAJet * 0.75, kmin, lifeMax);
  for (const C of LI ? rtTexClasses(P, LI) : []) {
    const k = C.kd * (1 - C.kJ); down = Math.max(down, drop(P.rtJet || 0, k, C.lifeMax));
    hx = Math.max(hx, R0 + (P.rtFling || 0) / k + 2 * C.c * (C.soft ? 2 : 1) / k + 2 * C.us * (C.lifeMax) + C.S);
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
function rtLayout(P) {
  const key = JSON.stringify(P); if (rtLayoutCache.has(key)) return rtLayoutCache.get(key);
  const ball = rtBallistic(P), LI = rtLoopInfo(P), Vref = ball.v0, T = ball.T, Tl = LI.Tl, stop = T % Tl;
  const CL = rtTexClasses(P, LI), Dmax = Math.max(rtPowderLifeMax(P), ...CL.map(C => C.lifeMax)) * 1.02;
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
    for (let i = 1; i <= NF; i++) { const tf = i / NF * Dmax; if (pass(Rf, stop + tf) > thr10) tVis = tf; }
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
  const R = makeRiseTailLoopRenderer(P, LI, Vref, { bot, fr: [Tl / F, 0] });
  const b = await bakeFrames(P, scale, onP(0, 0.7), pl, R);
  const expo = [b.meta.expoH, b.meta.expoT];
  // 消散：开花那一刻的循环相位停喷；时长 = 最长寿命的火粉 / 火星烧完；格子同样大、贴图按帧数挑最小（rtLayout）
  const stop = lay.stop, fl = lay.fade, Df = fl.Df, Ff = fl.F;
  const Pf = { ...P, cols: fl.cols, rows: fl.rows, chans: fl.chans, texW: fl.texW, texH: fl.texH }, ft = [], fd = []; for (let f = 0; f < Ff; f++) { ft.push(f * Df / Ff); fd.push(Df / Ff); }
  const pf = rtPlan(Pf, lay, ft, fd, { loop: false, t0: stop, duration: Df });
  const Rf = makeRiseTailLoopRenderer(P, LI, Vref, { stop, fadeDur: Df, bot, fr: [Df / Ff, stop] });
  const bf = await bakeFrames(Pf, scale, onP(0.7, 1), pf, Rf, { expo, noFade: true });
  bf.form = 'esFade'; bf.fps = Ff / Df; bf.meta.fadeSeconds = Df; bf.P = Pf;
  // 面片长度随弹体速度：Size By Life 的 Y（循环层寿命 = 升空时间；绕星头缩放 = Pivot Offset）
  const sk = []; for (let i = 0; i <= 16; i++) { const t = i / 16 * T, v = ball.vel(t); sk.push([+(i / 16).toFixed(4), +clamp(rtWhiteLen(P, Math.hypot(v[0], v[2])) / rtWhiteLen(P, Vref), 0.02, 1.5).toFixed(4)]); }
  Object.assign(b.meta, { es: true, ball: { k: ball.k, v0: ball.v0, vz0: ball.vz0, vx0: ball.vx0, T, H: ball.H, Hwant: ball.Hwant, vb: ball.vb, ok: ball.ok, lean: P.rtLean || 0 },
    T, Tl, nRev: LI.nRev, loopFps: LI.fps, Vref, stop, fEnd: Math.floor(stop / Tl * F) % F, sizeKeysRise: sk, fadeFrames: Ff, fadeFps: bf.fps, fadeSeconds: Df, hb: lay.hb,
    texSparks: rtTexClasses(P, LI).map(C => C.k) });
  b.fades = [bf]; b.es = ES; b.form = 'emitset'; b.P = P;
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
  const p = ball.pos(m.T); return { bb: fd, f, x: p[0], z: p[2], sy: m.sizeKeysRise[m.sizeKeysRise.length - 1][1], phase: 'fade' };
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
  return +(P.rtT + tail + 0.2).toFixed(2);
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
function fwlEmitSet(name, b, M, mobile) {
  const m = b.meta, P = b.P, L = m.L, F = L.F, fd = b.fades[0], Lf = fd.meta.L, bl = m.ball;
  const textures = {
    loop: { file: TN(name, 'Loop') + '.png', class: 'flipbook', cols: L.cols, rows: L.rows, channels: L.chans, frames: F },
    cutoutLoop: { file: TN(name, 'Loop_Cutout') + '.png', class: 'cutout' },
    fade: { file: TN(name, 'Fade') + '.png', class: 'flipbook', cols: Lf.cols, rows: Lf.rows, channels: Lf.chans, frames: Lf.F },
    cutoutFade: { file: TN(name, 'Fade_Cutout') + '.png', class: 'cutout' },
    ramp: { file: TN(name, 'Ramp') + '.png', class: 'ramp' }
  };
  const materials = {
    loop: { role: 'beam_flipbook', textures: { main: 'loop', ramp: 'ramp' }, scalars: { rows: L.rows, cols: L.cols } },
    fade: { role: 'beam_flipbook', textures: { main: 'fade', ramp: 'ramp' }, scalars: { rows: Lf.rows, cols: Lf.cols } },
    dot: { role: 'soft_dot' }
  };
  const col = fwlColor(M, m.T, 0, P.rtBright || 1), last = m.sizeKeysRise[m.sizeKeysRise.length - 1][1];
  // 星头在面片上端：Pivot Offset（和 V5 尾缀同一写法：−0.5, −(1 − 星头离面片下端的比例)）把星头放在粒子位置，Size By Life 的 Y 绕星头缩放
  const pivotY = r4(-(1 - (m.hb == null ? 0.5 : m.hb)));
  const vT = rtBallistic(P).vel(m.T), sp = Math.hypot(vT[0], vT[2]) || 1, pT = rtBallistic(P).pos(m.T);
  const emitters = [{
    name: 'RiseLoop', material: 'loop', gpu: false,
    required: { screen_alignment: 'Velocity', duration_s: r4(m.T), loops: 1, delay_s: 0, cutout: 'cutoutLoop', max_draw_count: 1, pivot_offset: [-0.5, pivotY] },
    spawn: { rate: { const: 0 }, bursts: [[0, 1]] },
    modules: [
      { m: 'Lifetime', Lifetime: { const: r4(m.T) } },
      { m: 'InitialSize', StartSize: { const: [r1(m.Ww * 100), r1(m.Wh * 100), 1] } },
      { m: 'InitialVelocity', StartVelocity: { const: [r1(bl.vx0 * 100), 0, r1(bl.vz0 * 100)] } },
      { m: 'Drag', DragCoefficientRaw: { const: r4(bl.k) } },
      { m: 'ConstAcceleration', Acceleration: [0, 0, -981] },
      { m: 'SizeByLife', LifeMultiplier: { curve: m.sizeKeysRise.map(([u, v]) => [r4(u), [1, r4(v), 1]]) }, MultiplyX: true, MultiplyY: true, MultiplyZ: false },
      { m: 'DynamicParameter', params: { frame: { curve: fwlFrameKeys(rtSawKeys(m), F) } } },
      { m: 'ColorOverLife', ColorOverLife: { curve: col }, AlphaOverLife: { const: 1 } }
    ]
  }, {
    name: 'RiseFade', material: 'fade', gpu: false,
    required: { screen_alignment: 'Velocity', duration_s: r4(m.fadeSeconds), loops: 1, delay_s: r4(m.T), cutout: 'cutoutFade', max_draw_count: 1, pivot_offset: [-0.5, pivotY] },
    spawn: { rate: { const: 0 }, bursts: [[0, 1]] },
    modules: [
      { m: 'Lifetime', Lifetime: { const: r4(m.fadeSeconds) } },
      { m: 'InitialLocation', StartLocation: { const: [r1(pT[0] * 100), 0, r1(pT[2] * 100)] } },
      { m: 'InitialVelocity', StartVelocity: { const: [r4(vT[0] / sp), 0, r4(Math.max(0.05, vT[2] / sp))] } },
      { m: 'InitialSize', StartSize: { const: [r1(m.Ww * 100), r1(m.Wh * last * 100), 1] } },
      { m: 'DynamicParameter', params: Object.assign({ frame: { curve: [[0, 0], [1, r2(Lf.F - 0.01)]] } },
        P.rtDissolve > 0 ? { dissolve: { curve: [[0, 0], [0.4, 0], [1, r4(P.rtDissolve)]] } } : {}) },
      { m: 'ColorOverLife', ColorOverLife: { curve: [col[col.length - 1]].map(([, c]) => [0, c]).concat([[1, col[col.length - 1][1]]]) }, AlphaOverLife: { const: 1 } }
    ]
  }];
  const ES = b.es || rtBuildES(P);
  const fracM = P.rtMobile == null ? BASE.rtMobile : P.rtMobile;
  // 手机比例 0：不写粒子发射器（一颗的 Burst，例如星头光晕，照留）
  for (const e of ES.emitters) { if (mobile && !(fracM > 0) && !(e.bursts || []).some(([, n]) => n === 1)) continue; emitters.push(esFwlEmitter(e, mobile, fracM)); }
  const tab = rtTables(b, mobile), peak = esPeakAlive(tab, m.T + 4);
  return { textures, materials, emitters, system: { preview_distance_cm: Math.round(Math.max(30000, bl.H * 100 * 2)), preview_warmup_s: 0 },
    notes: [
      `循环层 RiseLoop：速度朝向单粒子，星头在面片上端（Pivot Offset ${pivotY}，和 V5 尾缀同一写法；导入器若还不支持这个字段，手动在 Required 里填）；弹道 = Initial Velocity + Drag + Const Acceleration（线性阻力，和粒子层的出生曲线同一条）。帧号锯齿：${m.nRev} 圈自转 / ${r2(m.Tl)} s 一个循环。${(m.texSparks || []).length ? '贴图里有星头、白热段火花和 ' + Math.round(rtTexFrac(P, 'F') * 100) + '% 的细火花（真循环；其余细火花在 SparksFine）。' : ''}`,
      `消散 RiseFade：开花时刻（${r2(m.T)} s）在开花点出生，贴图里每颗火花按自己的寿命熄灭；${Lf.F} 帧 / ${r2(m.fadeSeconds)} s。${P.rtDissolve > 0 ? 'dissolve 动态参数在后 60% 从 0 升到 ' + r2(P.rtDissolve) + '（材质里溶解怎么表现未经 UE 验证）。' : '不写 dissolve。'}`,
      `粒子层：出生位置 / 初速是按发射器时间的曲线（"bake": false 不烘查找表，避免关键点被查找表抹掉）；第二个 Initial Velocity 是随机散开。按 spec 第 2 节，出生类曲线按发射器时间取值在 GPU 发射器上还没实测（⚪）。`,
      `同时活着的粒子最多约 ${peak.peak} 颗（${mobile ? '手机' : 'PC'}，第 ${peak.at} s）。软圆点亮度口径未经 UE 验证：烘焙器按「中心值 = 颜色、σ = 尺寸 / 4」的高斯画。`,
      ...(P.rtTurb > 0 || P.rtTurbS > 0 ? ['空气乱流：Acceleration 模块（大涡 = 按发射器时间的曲线，小涡 = 两个均匀分布相加），加速度 = 阻力 × 空气速度；重力仍在 Const Acceleration。Acceleration 在 GPU 发射器上未经 UE 验证（⚪），不生效时尾迹下段会比烘焙器里硬、直。'] : []),
      ...(P.rtStreakT > 0 ? ['线状火花：拉长的发射器 Screen Alignment = Rectangle（面片 Y 朝屏幕上方 = 竖直拖影），Initial Size 的 Y 和 X 分开、Size By Life 的 Y 按寿命拉长；Color Over Life 已除以拉长倍数（光量守恒）。GPU + Rectangle 未经 UE 验证（⚪）。'] : []),
      ...(P.rtGlow > 0 ? ['HeadGlow 星头光晕：CPU 1 颗，弹道模块和 RiseLoop 完全一样（Initial Velocity + Drag + Const Acceleration）→ 和星头重合；Color Over Life 跟喷射脉动。软圆点叠在序列面片上（加色），远处看就是星头周围的一团柔光。'] : []),
      ...(P.rtPopRate > 0 ? [`SparkPops 末段爆亮：和粗火花同一套运动（同一条出生 / 初速曲线、阻力、乱流），Color Over Life 在寿命 ${r2(P.rtPopAt)} 之前全黑、之后闪一下再灭。`] : []),
      ...(P.rtLaunch > 0 ? ['LaunchGlow / LaunchSparks 发射口：0 s 一次性 Burst（Spawn Rate = 0），发射药的闪光 + 向上喷的一把火花；离地 0.5–1 m 出生。'] : [])
    ] };
}
function rtTexFiles(b, name, sfx = '', idx = 1) {
  return (async () => {
    const files = [], k4 = sfx ? sfx.replace(/^_/, '') : '', L = b.meta.L;
    const lp = readRGBA8(b.head); files.push([`${TN(name, joinPart('Loop', k4), L, idx)}.png`, await encodePNG(lp, b.N, b.NH)]);
    if (!sfx) files.push(...await cutoutFiles([lp], b.N, b.NH, L, TN(name, 'Loop_Cutout', null, idx), b.meta));
    const f = b.fades[0], fp = readRGBA8(f.head);
    files.push([`${TN(name, joinPart('Fade', k4), f.meta.L, idx)}.png`, await encodePNG(fp, f.N, f.NH)]);
    if (!sfx) files.push(...await cutoutFiles([fp], f.N, f.NH, f.meta.L, TN(name, 'Fade_Cutout', null, idx), f.meta));
    return files;
  })();
}
function rtCascadeText(name, b, M) {
  const m = b.meta, P = b.P, bl = m.ball, fd = b.fades[0];
  const tabP = rtTables(b, false), tabM = rtTables(b, true), pkP = esPeakAlive(tabP, m.T + 4), pkM = esPeakAlive(tabM, m.T + 4);
  return `烟花效果：${name}（${TYPE_NAMES[P.type]}）
工具：烟花母版烘焙器 ${VERSION}（产物：${FORM_NAMES.emitset}）
完整数值在 cascade.json（PC）/ cascade_mobile.json（手机）；下面按 Cascade 里的发射器、模块顺序列出，单位 cm、cm/s、秒。

【弹道】线性阻力：出膛 ${(bl.v0).toFixed(1)} m/s（竖直 ${(bl.vz0 * 100).toFixed(0)} cm/s，水平 ${(bl.vx0 * 100).toFixed(0)} cm/s）· Drag ${bl.k.toFixed(4)} · 重力 −981
  ${bl.T.toFixed(2)} s 到 ${bl.H.toFixed(1)} m（要求 ${bl.Hwant} m）· 开花时竖直速度 ${bl.vb.toFixed(1)} m/s${bl.ok ? '' : ' · ⚠ 开花时速度给得太大，没有阻力也到不了：按无阻力'}

【RiseLoop】CPU · 材质角色 beam_flipbook（${P.texW}×${P.texH}，${m.L.cols}×${m.L.rows} 格 × ${m.L.chans} 通道 = ${m.L.F} 帧，RGBA 接力）· Screen Alignment = Velocity · Pivot Offset (−0.5, ${(-(1 - m.hb)).toFixed(4)}) · Duration ${m.T.toFixed(3)} s · Burst 0 s × 1
  Lifetime ${m.T.toFixed(3)} · Initial Size ${(m.Ww * 100).toFixed(1)} × ${(m.Wh * 100).toFixed(1)} cm（星头在面片上端，Pivot Offset 放在粒子位置）
  Initial Velocity (${(bl.vx0 * 100).toFixed(1)}, 0, ${(bl.vz0 * 100).toFixed(1)}) · Drag ${bl.k.toFixed(4)} · Const Acceleration (0, 0, −981)
  Size By Life（只改 Y）：${m.sizeKeysRise.map(([u, v]) => u + ' → ' + v).join('，')}
  Dynamic Parameter 帧号：锯齿，每 ${m.Tl.toFixed(3)} s 一个循环（${m.nRev} 圈自转），${rtSawKeys(m).length} 个关键点
  Color Over Life × ${P.rtBright}

【RiseFade】CPU · beam_flipbook（${fd.P ? fd.P.texW + '×' + fd.P.texH + '，' : ''}${fd.meta.L.cols}×${fd.meta.L.rows} × ${fd.meta.L.chans} = ${fd.meta.L.F} 帧，格子和循环层一样大）· Pivot Offset 同上 · Delay ${m.T.toFixed(3)} s · Duration ${m.fadeSeconds.toFixed(3)} s（${m.fadeFps.toFixed(1)} fps）
  Initial Location = 开花点 · Initial Size Y = 循环层最后的长度 · 帧号 0 → ${fd.meta.L.F - 0.01}${P.rtDissolve > 0 ? ' · dissolve 0 →（后 60%）' + P.rtDissolve : ''}

【粒子层 · PC】同时活着最多约 ${pkP.peak} 颗
${esCascadeText(b.es || rtBuildES(P), false, 1)}
【粒子层 · 手机】数量 × ${P.rtMobile}，全部 CPU，同时活着最多约 ${pkM.peak} 颗（曲线同 PC，Spawn Rate 乘比例）

【未经 UE 验证】出生类曲线按发射器时间取值在 GPU 发射器上的表现；软圆点的亮度口径；dissolve 在材质里的表现；循环层速度朝向在接近顶点（速度很小）时的朝向${P.rtTurb > 0 || P.rtTurbS > 0 ? '；空气乱流的 Acceleration 模块（GPU）' : ''}${P.rtStreakT > 0 ? '；线状火花 GPU + Rectangle 对齐、Size By Life 的 Y 单独拉长' : ''}。
`;
}
function rtCurvesCSV(b, M) {
  const m = b.meta, rows = ['段,曲线,相对时间,值1,值2,值3'];
  for (const [u, v] of m.sizeKeysRise) rows.push(`RiseLoop,SizeByLife_Y倍数,${u},${v},,`);
  for (const [u, v] of rtSawKeys(m)) rows.push(`RiseLoop,DynamicParameter_帧号,${u},${v},,`);
  for (const [u, c] of colorKeys(M, m.T, 0)) rows.push(`RiseLoop,ColorOverLife_线性RGB,${u},${c[0]},${c[1]},${c[2]}`);
  for (const e of (b.es || rtBuildES(b.P)).emitters) for (const [u, c] of e.col) rows.push(`${e.name},ColorOverLife_线性RGB,${u},${c[0]},${c[1]},${c[2]}`);
  return '﻿' + rows.join('\n') + '\n';
}
function rtJSON(b, name, M) {
  const m = b.meta, P = b.P, fd = b.fades[0], ES = b.es || rtBuildES(P);
  return { name, type: P.type, typeName: TYPE_NAMES[P.type], form: b.form, tool: '烟花母版烘焙器 ' + VERSION,
    ballistic: m.ball, loop: { periodS: m.Tl, frames: m.L.F, revolutions: m.nRev, spriteSizeCm: [+(m.Ww * 100).toFixed(1), +(m.Wh * 100).toFixed(1)], refSpeed: m.Vref, sizeByLifeY: m.sizeKeysRise, frameKeys: rtSawKeys(m),
      texture: [P.texW, P.texH], grid: [m.L.cols, m.L.rows, m.L.chans], cellPx: [m.L.cellW, m.L.cellH], pivotHead: m.hb, pivotOffset: [-0.5, +(-(1 - m.hb)).toFixed(4)], fill: m.fill ? { x: +m.fill.x.toFixed(3), y: +m.fill.y.toFixed(3) } : null, texSparks: m.texSparks || [] },
    fade: { frames: fd.meta.L.F, fps: +m.fadeFps.toFixed(3), seconds: +m.fadeSeconds.toFixed(3), dissolveEnd: P.rtDissolve, texture: fd.P ? [fd.P.texW, fd.P.texH] : null, grid: [fd.meta.L.cols, fd.meta.L.rows, fd.meta.L.chans], fill: fd.meta.fill ? { x: +fd.meta.fill.x.toFixed(3), y: +fd.meta.fill.y.toFixed(3) } : null },
    emitters: ES.emitters.map(e => ({ name: e.name, gpuPC: !!e.gpu, life: e.life, size: e.size, drag: e.drag, spawnKeys: e.spawn.length })),
    peakAlive: { pc: esPeakAlive(rtTables(b, false), m.T + 4), mobile: esPeakAlive(rtTables(b, true), m.T + 4) },
    colorOverLife: colorKeys(M, m.T, 0), selfCheck: m.check, params: P, materialDefaults: M };
}
function rtStatsHTML(b) {
  const m = b.meta, P = b.P, bl = m.ball, fd = b.fades[0], c = m.check || {}, cls = ok => ok ? 'ok' : 'warn';
  const pk = esPeakAlive(rtTables(b, false), m.T + 4), pkM = esPeakAlive(rtTables(b, true), m.T + 4);
  const rows = [];
  const fl = q => q && q.fill ? `${Math.round(q.fill.x * 100)}% × ${Math.round(q.fill.y * 100)}%` : '—';
  rows.push(`循环层 + 粒子发射器 · 循环 <b>${m.L.F}</b> 帧（${m.L.cols}×${m.L.rows}×${m.L.chans}，${P.texW}×${P.texH}）· 单格 <b>${m.L.cellW}×${m.L.cellH}</b> · 消散 <b>${fd.meta.L.F}</b> 帧（${fd.meta.L.cols}×${fd.meta.L.rows}×${fd.meta.L.chans}，${fd.P ? fd.P.texW + '×' + fd.P.texH : ''}）`);
  rows.push(`格子利用（内容外框占格子 横 × 竖，平均）：循环 <b>${fl(m)}</b> · 消散 ${fl(fd.meta)}${(m.texSparks || []).length ? ' · 贴图里有 ' + Math.round(rtTexFrac(P, 'F') * 100) + '% 的细火花' : ''}`);
  rows.push(`弹道：出膛 <b>${bl.v0.toFixed(1)}</b> m/s · 阻力 ${bl.k.toFixed(4)} /s（线性）· ${bl.T.toFixed(2)} s 到 <b>${bl.H.toFixed(0)}</b> m · 开花时 ${bl.vb.toFixed(1)} m/s${bl.ok ? '' : ' · <span class="warn">开花时速度太大，按无阻力</span>'}`);
  rows.push(`螺旋：${P.rtSpin} 转/秒 · 出膛时波长 ${(bl.v0 / Math.max(0.01, P.rtSpin)).toFixed(0)} m → 开花前 ${(Math.max(0.5, Math.abs(bl.vb)) / Math.max(0.01, P.rtSpin)).toFixed(1)} m · 循环 ${m.Tl.toFixed(2)} s（${m.nRev} 圈）`);
  rows.push(`面片 ${m.Ww.toFixed(1)}×${m.Wh.toFixed(1)} m（星头在上端 ${Math.round((1 - (m.hb == null ? 0.5 : m.hb)) * 100)}% 处，Pivot Offset）· 接缝 <span class="${cls(c.seam == null || c.seam < 1.6)}">${c.seam == null ? '—' : c.seam.toFixed(2)}</span>（≈1 无缝）· 消散 ${m.fadeSeconds.toFixed(2)} s（${m.fadeFps.toFixed(1)} fps）`);
  rows.push(`粒子层：${(b.es || rtBuildES(P)).emitters.map(e => e.name).join(' / ')} · 同时最多 PC <b>${pk.peak}</b> 颗（GPU）/ 手机 <b>${pkM.peak}</b> 颗（CPU）`);
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
  setMatUniforms(pr, { ...M, headInt: (M.headInt || 1) * (P.rtBright || 1) }, t); drawQuad();
}
function renderEmitLive() {
  const P = state.P, M = state.M, b = state.bake && state.bake.form === 'emitset' ? state.bake : null, mobile = state.platform === 'mobile';
  const t = Math.min(state.t, P.duration), view = rtView(P, b, t), ppm = rgT.w / (2 * view[2]), ppmY = rgT.h / (2 * view[3]);
  const ball = rtBallistic(P), LI = rtLoopInfo(P);
  rgT.clear(); rgT.bind(); additive(true); PPMY = ppmY;
  let np = 0; try { np = drawRiseTailLive(P, LI, ball, t, view, ppm); } finally { PPMY = 0; }
  additive(false);
  hdrT.bind(); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); rtShadeLoop(P, M, t);
  additive(true); const nd = esDraw(rtLiveTables(P, mobile), t, view, hdrT.w / (2 * view[2]), hdrT.h / (2 * view[3]), 1); additive(false);
  post();
  const dist = state.disp === 'game' ? ` · 游戏内大小 ${state.dist} m（开花直径 ${P.rtBurstD} m 占屏高 1/3）` : '';
  hudText = `实时模拟 · 升空尾缀 · ${t <= ball.T ? '上升 ' + t.toFixed(2) + ' / ' + ball.T.toFixed(2) + ' s' : '已开花，火花各自燃尽中'} · 循环层火花 ${np.toLocaleString()} 颗 + 粒子层 ${nd.toLocaleString()} 颗（${mobile ? '手机减量' : 'PC'}）${dist}`;
  hudB = '';
}
function renderEmitExport(b) {
  const P = b.P, M = state.M, m = b.meta, t = engineTick(state.t), view = rtView(P, b, t), ppm = hdrT.w / (2 * view[2]), ppmY = hdrT.h / (2 * view[3]);
  hdrT.clear(); hdrT.bind(); additive(true);
  const s = rtLoopStateAt(b, t);
  if (s) {
    const w = m.Ww, h = m.Wh * s.sy, hb = m.hb == null ? 0.5 : m.hb, pr = PR.mat; gl.useProgram(pr.p);
    gl.uniform4fv(pr.u.uRect, [s.x - w / 2, s.z - h * hb, s.x + w / 2, s.z + h * (1 - hb)]); gl.uniform4fv(pr.u.uView, view);   // 星头 = 粒子位置（Pivot Offset）
    bindSeqTextures(pr, s.bb); gl.uniform1f(pr.u.uFrame, s.f); gl.uniform1f(pr.u.uMirror, 0);
    setMatUniforms(pr, { ...M, headInt: (M.headInt || 1) * (P.rtBright || 1) }, t);
    gl.bindVertexArray(quadVAO); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.activeTexture(gl.TEXTURE0);
  }
  const nd = esDraw(rtTables(b, !!b.esMobile), t, view, ppm, ppmY, 1);
  additive(false); post();
  const dist = state.disp === 'game' ? ` · 游戏内大小 ${state.dist} m` : '';
  hudText = `引擎回放 · ${b.esMobile ? '手机' : 'PC'} · 循环层 ${!s ? '已结束' : s.phase === 'rise' ? '上升循环第 ' + (s.f + 1) + '/' + m.L.F + ' 帧' : '贴图动态消散第 ' + (s.f + 1) + '/' + s.bb.meta.L.F + ' 帧'}（面片 ${m.Ww.toFixed(1)} × ${(m.Wh * (s ? s.sy : 1)).toFixed(1)} m）+ 粒子层 ${nd.toLocaleString()} 颗${dist} · 溶解另由材质处理（未经 UE 验证）`;
  hudB = '';
}
