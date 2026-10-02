// =====================================================================
//  粒子发射器组（通用能力，4.1.0）：一个条目 = 循环层（序列面片，烘焙贴图）+ 若干 Cascade 软圆点发射器
//  这里只管「发射器」这一半，和花型无关：任何产物只要给出下面的数据，就能实时模拟、引擎回放、导出 cascade.json。
//  发射器数据（单位：米、秒；导出时换成 cm）：
//    { name, gpu, delay, duration, spawn: [[发射器时间 s, 每秒颗数], …], life: [lo, hi], size: [lo, hi]（软圆点直径 m）,
//      sizeLife: [[相对寿命, 倍数], …], col: [[相对寿命, [r, g, b]], …]（线性 RGB，引擎自发光，可 > 1）,
//      loc: [[发射器时间, [x, y, z]], …]（出生位置曲线）, vel: [[发射器时间, [vx, vy, vz]], …]（初速曲线）,
//      velAdd: [[x, y, z], [x, y, z]]（再加一个均匀随机初速；也可以是几个盒子的数组 = 几个 Initial Velocity 相加 → 三角 / 钟形分布，边缘软）, drag: [lo, hi]（1/s）, accel: [x, y, z], seed,
//      accelCurve: [[发射器时间, [ax, ay, az]], …]（Acceleration 按发射器时间取值：沿尾迹相关的空气乱流）, accelJit: [[…], […]]（再加一个每颗随机的加速度：小尺度乱流）,
//      align: 'velocity' | 'screen' + stretch + stretchLife: [[相对寿命, 倍数], …]（拉长 stretch × stretchLife(u) 倍的线状火星：
//        velocity = 沿粒子速度（Screen Alignment = Velocity）；screen = 沿屏幕竖直（Rectangle，面片 Y 朝相机上方）；
//        导出 = Initial Size 的 Y × stretch、Size By Life 的 Y 再乘 stretchLife）}
//  运动规则和 Cascade 一致：出生类分布按发射器时间取值；之后线性阻力 + 恒定加速度（解析解）。
//  画法和素材页 hdr 一致：软圆点 = 高斯（σ = 尺寸 / 4，中心值 = 颜色），线性累加，引擎同款加色；
//  烘焙器里的 HDR 值 = 4 × 引擎自发光（和序列材质 Ramp·v·颜色·4 同一口径），最后统一做显示映射。
//  同一套粒子（同种子、同出生表）同时用于「实时模拟」和「引擎回放」——看到的就是导出的。
// =====================================================================
function esCurve(keys, u) {
  if (!keys || !keys.length) return 0;
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u <= keys[i][0]) {
    const [a, va] = keys[i - 1], [b, vb] = keys[i], k = (u - a) / Math.max(1e-9, b - a);
    return Array.isArray(va) ? va.map((x, j) => x + (vb[j] - x) * k) : va + (vb - va) * k;
  }
  return keys[keys.length - 1][1];
}
// 出生表：每个发射器一张，按出生时刻排好（确定性：同一组数据永远得到同一批粒子）
// 盒子或盒子数组 → 盒子数组
const esBoxes = b => !b ? [] : Array.isArray(b[0][0]) ? b : [b];
function esSpawn(ES, frac = 1) {
  return ES.emitters.map((e, ei) => {
    const rnd = mulberry32(((e.seed || 1) * 2654435761 + ei * 97) >>> 0), list = [];
    const make = t0 => {
      const life = e.life[0] + (e.life[1] - e.life[0]) * rnd(), size = e.size[0] + (e.size[1] - e.size[0]) * rnd();
      const k = e.drag ? e.drag[0] + (e.drag[1] - e.drag[0]) * rnd() : 0;
      const p = e.loc ? esCurve(e.loc, t0) : [0, 0, 0], v = e.vel ? esCurve(e.vel, t0).slice() : [0, 0, 0];
      for (const B of esBoxes(e.velAdd)) for (let j = 0; j < 3; j++) v[j] += B[0][j] + (B[1][j] - B[0][j]) * rnd();
      const a = (e.accel || [0, 0, 0]).slice();
      if (e.accelCurve) { const c = esCurve(e.accelCurve, t0); for (let j = 0; j < 3; j++) a[j] += c[j]; }
      for (const B of esBoxes(e.accelJit)) for (let j = 0; j < 3; j++) a[j] += B[0][j] + (B[1][j] - B[0][j]) * rnd();
      list.push({ t0: t0 + (e.delay || 0), life, size, k, p, v, a });
    };
    // Spawn Rate 曲线按发射器时间积分；frac < 1 = 手机版减量（同一条曲线乘比例）
    const c = e.spawn || [], dt = 1 / 240; let acc = rnd();
    if (c.length) for (let t = c[0][0]; t < Math.min(e.duration, c[c.length - 1][0]); t += dt) {
      acc += Math.max(0, esCurve(c, t)) * frac * dt;
      while (acc >= 1) { make(t + rnd() * dt); acc -= 1; }
    }
    for (const [t0, n] of e.bursts || []) for (let i = 0; i < Math.round(n * frac); i++) make(t0);
    list.sort((a, b) => a.t0 - b.t0);
    return { e, list, maxLife: list.reduce((m, q) => Math.max(m, q.life), 0) };
  });
}
// 粒子在年龄 a 时的位置（线性阻力 k + 恒定加速度 acc）
function esPos(q, acc, a, out) {
  const k = q.k; if (q.a) acc = q.a;
  if (k > 1e-6) { const s1 = (1 - Math.exp(-k * a)) / k; for (let j = 0; j < 3; j++) out[j] = q.p[j] + q.v[j] * s1 + acc[j] / k * (a - s1); }
  else for (let j = 0; j < 3; j++) out[j] = q.p[j] + q.v[j] * a + 0.5 * acc[j] * a * a;
  return out;
}
function esVel(q, acc, a, out) {
  const k = q.k; if (q.a) acc = q.a;
  if (k > 1e-6) { const e = Math.exp(-k * a); for (let j = 0; j < 3; j++) out[j] = (q.v[j] - acc[j] / k) * e + acc[j] / k; }
  else for (let j = 0; j < 3; j++) out[j] = q.v[j] + acc[j] * a;
  return out;
}
// 带颜色的高斯软圆点（每颗自己的颜色）：位置 2 + 光量 1 + 尺寸 1 + 颜色 3 + 朝向 2 + 拉长倍数 1
const VS_DOTC = HDR + `layout(location=0) in vec2 aP; layout(location=1) in float aI; layout(location=2) in float aS; layout(location=3) in vec3 aC; layout(location=4) in vec2 aD; layout(location=5) in float aE;
uniform vec4 uView; uniform float uPPM, uPPMY, uMax; out float vI; out vec2 vSig; out float vPS; out vec3 vC; out vec2 vD; out float vE;
void main(){ vec2 sig=max(aS*0.5*vec2(uPPM,uPPMY),vec2(0.55)); float e=max(1.,aE); float ps=min(ceil(max(sig.x,sig.y)*6.*e)+1.,uMax);
  gl_Position=vec4((aP-uView.xy)/uView.zw,0.,1.); gl_PointSize=ps; vI=aI; vSig=sig; vPS=ps; vC=aC; vD=aD; vE=e; }`;
const FS_DOTC = HDR + `in float vI; in vec2 vSig; in float vPS; in vec3 vC; in vec2 vD; in float vE; uniform float uPPM, uPPMY, uW; out vec4 o;
vec2 erf2(vec2 x){ vec2 sg=sign(x); x=abs(x); vec2 t=1./(1.+.3275911*x); return sg*(1.-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*exp(-x*x)); }
void main(){ vec2 p=(gl_PointCoord-.5)*vPS; float g;
  if(vE<=1.001){ vec2 v=.5*(erf2((p+.5)/(1.41421356*vSig))-erf2((p-.5)/(1.41421356*vSig))); g=max(0.,v.x*v.y); }
  else { vec2 d=normalize(vec2(vD.x,-vD.y)+1e-6), n=vec2(-d.y,d.x); float s=max(vSig.x,.6); float u=dot(p,d)/(s*vE), w=dot(p,n)/s;
    g=exp(-.5*(u*u+w*w))/(6.2831853*s*s*vE); }
  o=vec4(vC*(vI*g*uPPM*uPPMY*uW),0.); }`;
PR.dotc = compile(VS_DOTC, FS_DOTC);
const dotcBuf = gl.createBuffer(), dotcVAO = gl.createVertexArray();
gl.bindVertexArray(dotcVAO); gl.bindBuffer(gl.ARRAY_BUFFER, dotcBuf);
for (const [i, n, off] of [[0, 2, 0], [1, 1, 8], [2, 1, 12], [3, 3, 16], [4, 2, 28], [5, 1, 36]]) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, n, gl.FLOAT, false, 40, off); }
gl.bindVertexArray(null);
const DOTC_N = 10; let dotcData = new Float32Array(DOTC_N * 65536);
function drawDotsC(n, view, ppm, ppmY, w = 1) {
  if (!n) return;
  const pr = PR.dotc; gl.useProgram(pr.p); gl.bindVertexArray(dotcVAO); gl.bindBuffer(gl.ARRAY_BUFFER, dotcBuf);
  gl.bufferData(gl.ARRAY_BUFFER, dotcData.subarray(0, n * DOTC_N), gl.DYNAMIC_DRAW);
  gl.uniform4fv(pr.u.uView, view); gl.uniform1f(pr.u.uPPM, ppm); gl.uniform1f(pr.u.uPPMY, ppmY); gl.uniform1f(pr.u.uMax, PT_MAX); gl.uniform1f(pr.u.uW, w);
  gl.drawArrays(gl.POINTS, 0, n); gl.bindVertexArray(null);
}
// 画一组发射器在时刻 t 的全部粒子（侧面正交：x 横、z 竖，y 是景深）。tables = esSpawn 的结果；on = 每个发射器开关
function esDraw(tables, t, view, ppm, ppmY, gain = 1, on = null) {
  let n = 0, alive = 0; const pos = [0, 0, 0], vel = [0, 0, 0];
  const flush = () => { drawDotsC(n, view, ppm, ppmY); n = 0; };
  const x0 = view[0] - view[2] * 1.1, x1 = view[0] + view[2] * 1.1, z0 = view[1] - view[3] * 1.1, z1 = view[1] + view[3] * 1.1;
  tables.forEach((T, i) => {
    if (on && on[i] === false) return;
    const e = T.e, L = T.list, acc = e.accel || [0, 0, 0];
    // 二分找第一颗可能还活着的（出生时刻 ≥ t − 最长寿命）
    let lo = 0, hi = L.length; const tMin = t - T.maxLife;
    while (lo < hi) { const m = (lo + hi) >> 1; if (L[m].t0 < tMin) lo = m + 1; else hi = m; }
    for (let j = lo; j < L.length; j++) {
      const q = L[j]; if (q.t0 > t) break;
      const a = t - q.t0; if (a >= q.life) continue;
      const u = a / q.life, S = q.size * (e.sizeLife ? esCurve(e.sizeLife, u) : 1);
      esPos(q, acc, a, pos);
      if (pos[0] < x0 - S || pos[0] > x1 + S || pos[2] < z0 - S || pos[2] > z1 + S) continue;
      const c = e.col ? esCurve(e.col, u) : [1, 1, 1], o = n * DOTC_N, g = 4 * gain, st = e.align ? Math.max(1, (e.stretch || 1) * (e.stretchLife ? esCurve(e.stretchLife, u) : 1)) : 1;
      dotcData[o] = pos[0]; dotcData[o + 1] = pos[2]; dotcData[o + 2] = 6.2831853 * (S / 4) * (S / 4) * st; dotcData[o + 3] = S / 2;
      dotcData[o + 4] = c[0] * g; dotcData[o + 5] = c[1] * g; dotcData[o + 6] = c[2] * g;
      if (st > 1 && e.align === 'screen') { dotcData[o + 7] = 0; dotcData[o + 8] = 1; }
      else if (st > 1) { esVel(q, acc, a, vel); const sp = Math.hypot(vel[0], vel[2]) || 1; dotcData[o + 7] = vel[0] / sp; dotcData[o + 8] = vel[2] / sp; } else { dotcData[o + 7] = 0; dotcData[o + 8] = 1; }
      dotcData[o + 9] = st;
      n++; alive++; if (n * DOTC_N >= dotcData.length) flush();
    }
  });
  flush();
  return alive;
}
// 同时活着的最多颗数（按 0.05 s 取样；给标准检查和导出说明）
function esPeakAlive(tables, T) {
  let peak = 0, at = 0;
  for (let t = 0; t <= T; t += 0.05) {
    let n = 0; for (const tb of tables) for (const q of tb.list) { if (q.t0 > t) break; if (t - q.t0 < q.life) n++; }
    if (n > peak) { peak = n; at = t; }
  }
  return { peak, at: +at.toFixed(2) };
}
// ---- 导出：fwl.cascade/1 的发射器（spec/cascade_params_v1.md）----
const esCm = v => +(v * 100).toFixed(1), esR4 = v => +(+v).toFixed(4);
// 曲线点太密时按误差抽稀（线性插值误差 < tol）
function esThin(keys, tol) {
  if (keys.length <= 2) return keys;
  const out = [keys[0]]; let a = 0;
  const val = k => Array.isArray(k[1]) ? k[1] : [k[1]];
  for (let i = 2; i < keys.length; i++) {
    const A = keys[a], B = keys[i]; let ok = true;
    for (let j = a + 1; j < i && ok; j++) {
      const u = (keys[j][0] - A[0]) / Math.max(1e-9, B[0] - A[0]), va = val(A), vb = val(B), vj = val(keys[j]);
      for (let c = 0; c < vj.length; c++) if (Math.abs(va[c] + (vb[c] - va[c]) * u - vj[c]) > tol) { ok = false; break; }
    }
    if (!ok) { out.push(keys[i - 1]); a = i - 1; }
  }
  out.push(keys[keys.length - 1]); return out;
}
function esFwlEmitter(e, mobile, frac) {
  const gpu = mobile ? false : !!e.gpu, f = mobile ? frac : 1, st = e.align ? Math.max(1, e.stretch || 1) : 1, aligned = !!e.align && (st > 1 || !!e.stretchLife);
  const mods = [
    { m: 'Lifetime', Lifetime: { uniform: [esR4(e.life[0]), esR4(e.life[1])] } },
    { m: 'InitialSize', StartSize: { uniform: [[esCm(e.size[0]), esCm(e.size[0] * st), esCm(e.size[0])], [esCm(e.size[1]), esCm(e.size[1] * st), esCm(e.size[1])]] } }
  ];
  if (e.loc) mods.push({ m: 'InitialLocation', StartLocation: { curve: esThin(e.loc, 0.01).map(([t, v]) => [esR4(t), v.map(esCm)]), bake: false } });
  if (e.vel) mods.push({ m: 'InitialVelocity', StartVelocity: { curve: esThin(e.vel, 0.05).map(([t, v]) => [esR4(t), v.map(esCm)]), bake: false } });
  esBoxes(e.velAdd).forEach((B, i, A) => mods.push({ m: 'InitialVelocity', StartVelocity: { uniform: [B[0].map(esCm), B[1].map(esCm)] }, note: `第 ${i + 2} 个 Initial Velocity：叠加的随机散开${A.length > 1 ? '（' + A.length + ' 个均匀分布相加 → 中间密、边缘软）' : ''}` }));
  if (e.drag) mods.push({ m: 'Drag', DragCoefficientRaw: { uniform: [esR4(e.drag[0]), esR4(e.drag[1])] } });
  if (e.accel) mods.push({ m: 'ConstAcceleration', Acceleration: e.accel.map(esCm) });
  if (e.accelCurve) mods.push({ m: 'Acceleration', Acceleration: { curve: esThin(e.accelCurve, 0.05).map(([t, v]) => [esR4(t), v.map(esCm)]), bake: false }, note: '空气乱流（大涡）：按发射器时间取值，同一时刻出生的火星受同一股气流 → 沿尾迹相关的松散' });
  esBoxes(e.accelJit).forEach((B, i, A) => mods.push({ m: 'Acceleration', Acceleration: { uniform: [B[0].map(esCm), B[1].map(esCm)] }, note: `空气乱流（小涡）：每颗随机${A.length > 1 ? '（' + A.length + ' 个相加 → 边缘软）' : ''}` }));
  const sl = aligned && e.stretchLife ? e.stretchLife : null;
  if (e.sizeLife || sl) {
    const us = [...new Set([...(e.sizeLife || []).map(k => k[0]), ...(sl || []).map(k => k[0])])].sort((a, b) => a - b);
    mods.push({ m: 'SizeByLife', LifeMultiplier: { curve: us.map(u => { const k = e.sizeLife ? esCurve(e.sizeLife, u) : 1; return [esR4(u), [esR4(k), esR4(k * (sl ? esCurve(sl, u) : 1)), esR4(k)]]; }) }, MultiplyX: true, MultiplyY: true, MultiplyZ: true,
      ...(sl ? { note: `Y = 大小 × 拉长倍数（${e.align === 'screen' ? 'Rectangle：Y 朝屏幕上方' : 'Velocity：Y 沿速度'}）：拖影长短随寿命变` } : {}) });
  }
  mods.push({ m: 'ColorOverLife', ColorOverLife: { curve: e.col.map(([u, c]) => [esR4(u), c.map(esR4)]) }, AlphaOverLife: { const: 1 } });
  return {
    name: e.name, material: 'dot', gpu,
    required: { screen_alignment: !aligned ? 'Square' : e.align === 'screen' ? 'Rectangle' : 'Velocity', duration_s: esR4(e.duration), loops: 1, delay_s: esR4(e.delay || 0) },
    spawn: { rate: { curve: esThin(e.spawn, 0.5).map(([t, r]) => [esR4(t), +(r * f).toFixed(2)]), bake: false }, bursts: (e.bursts || []).map(([t, n]) => [esR4(t), Math.round(n * f)]) },
    modules: mods
  };
}
// 参数表（给人看）：按 Cascade 里发射器、模块、字段的顺序，Cascade 原生单位（CLAUDE.md 第 8 节）
function esCascadeText(ES, mobile = false, frac = 1) {
  const L = [];
  for (const e of ES.emitters) {
    const j = esFwlEmitter(e, mobile, frac);
    L.push(`【${e.name}】${j.gpu ? 'GPU Sprites' : 'CPU'} · 材质角色 soft_dot · Screen Alignment = ${j.required.screen_alignment}${j.required.screen_alignment !== 'Square' ? (j.required.screen_alignment === 'Velocity' ? '（沿速度' : '（沿屏幕竖直') + '拉长：Initial Size Y × ' + (e.stretch || 1) + (e.stretchLife ? '，Size By Life 的 Y 按寿命拉长' : '') + ' → 线状火星）' : ''} · Duration ${j.required.duration_s} s · Loops 1 · Delay ${j.required.delay_s} s`);
    L.push(`  Spawn Rate（发射器时间 s → 颗/秒，线性）：${j.spawn.rate.curve.length} 个关键点，${j.spawn.rate.curve.slice(0, 4).map(k => k.join(' → ')).join('；')}${j.spawn.rate.curve.length > 4 ? ' …（完整见 cascade.json）' : ''}`);
    for (const m of j.modules) {
      const f = Object.entries(m).filter(([k]) => !['m', 'note'].includes(k)).map(([k, v]) => {
        if (v && v.const !== undefined) return `${k} = ${JSON.stringify(v.const)}`;
        if (v && v.uniform) return `${k} = 随机 ${JSON.stringify(v.uniform[0])} ~ ${JSON.stringify(v.uniform[1])}`;
        if (v && v.curve) return `${k} = 曲线 ${v.curve.length} 点（${v.curve.slice(0, 2).map(k2 => JSON.stringify(k2)).join('，')}${v.curve.length > 2 ? ' …' : ''}）${v.bake === false ? '，不烘查找表' : ''}`;
        return `${k} = ${JSON.stringify(v)}`;
      }).join('；');
      L.push(`  ${m.m}：${f}${m.note ? '（' + m.note + '）' : ''}`);
    }
    L.push('');
  }
  return L.join('\n');
}
