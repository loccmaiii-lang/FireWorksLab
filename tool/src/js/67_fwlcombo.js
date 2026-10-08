// =====================================================================
//  多层效果导出成「一个」素材包（协作/标准.md 第 1 节第 5 项，4.0-c）
//  一个 cascade.json 里每层（每层的每一段贴图）一个发射器，共用同一个爆点：
//    delay_s = 组合里该层的延迟 + 该段在层里的起点 ÷ 时间倍率；寿命 ÷ 时间倍率；面片尺寸 × 层缩放。
//  帧号、Size By Life、颜色曲线都是按相对寿命写的，时间倍率不用改它们。
//  贴图名：T_<效果名>_L<层号>[_段].png、T_<效果名>_L<层号>_Ramp.png；手机版 T_<效果名>_Mobile_L<层号>…
// =====================================================================
function comboLayerName(name, i) { return `${name}_L${i + 1}`; }
function comboLayerM(L) {
  return { stages: L.stages, xw: L.xw, ramp0: L.ramp0, ramp1: L.ramp1, ramp2: L.ramp2, ramp3: L.ramp3, headInt: L.headInt, tailInt: L.tailInt };
}
// ---- 4.2.12 分平台导出方案（用户 10-02 20:04：「PC 用多张 / 单张序列 + 粒子（譬如四尺玉），手游就用纯图片……导出之前在图层选择导出方案？」；走查 D21–D22）----
// 每层 L.out = { pc, mobile }：PC 序列 / GPU 光点（只出星头，不要贴图，材质角色 soft_dot，spec 10.B）/ 不出；手机 序列 / 不出（手机不用 GPU 粒子）。
// 不写 = 两边都是序列，输出和以前逐字一样。
// 4.2.13：PC 加「单束」（每颗星一个沿速度拉长的面片，贴图是一颗星的序列；走查 D21 / B9）
// 4.9.35（用户 10-07 18:50「低端这个分类应该不需要，直接合入产物表里……哪一层用单帧，哪一层用序列，哪一层用GPU粒子，哪一层用单束」；
//   18:5x「手机列保留，手机也可以选序列或者单帧或者单束，但没有GPU」「单帧放主包、名字不加 _MB」）：PC 加单帧，手机 序列 / 单束 / 单帧 / 不出；没有低端列 / cascade_low.json 了
const OUT_PC = [['seq', '序列（大面片）'], ['unit', '单束（每颗星一个面片，带尾迹）'], ['dots', 'GPU 光点（只出星头）'], ['frame', '单帧（一张图 + 功能图）'], ['off', '不出']],
  OUT_MOBILE = [['seq', '序列'], ['unit', '单束'], ['frame', '单帧（一张图 + 功能图）'], ['off', '不出']];
const OUT_PC_KINDS = OUT_PC.map(x => x[0]), OUT_MOBILE_KINDS = OUT_MOBILE.map(x => x[0]);
function layerOut(L) { const o = (L && L.out) || {}; return { pc: OUT_PC_KINDS.includes(o.pc) ? o.pc : 'seq', mobile: OUT_MOBILE_KINDS.includes(o.mobile) ? o.mobile : 'seq' }; }
// 这个平台要出的层：[{ L, b, i（原层号）, dots, unit（PC 单束的那次烘焙，调用方给）}]
// 4.9.35：单束 / 单帧手机也能出；x.unit / x.frame = 调用方给的那次单束烘焙 / 单帧，x.unitName / x.frameName = 贴图的内部名（PC、手机都选同一种时手机直接引用 PC 那几张）
function comboEntries(layers, mobile) {
  const out = []; layers.forEach((x, i) => { const o = layerOut(x.L), s = mobile ? o.mobile : o.pc; if (s === 'off') return;
    out.push({ ...x, i, dots: !mobile && s === 'dots', unit: s === 'unit' ? x.unit : undefined, frame: s === 'frame' ? x.frame : undefined }); }); return out;
}
// 单束层（PC）：每颗星一个 Velocity 对齐的面片，贴图 = 一颗代表星的序列（星头 + 拖尾，bakeUnit），轨迹交给 Cascade（球面放射 + 线性阻力 + 恒定加速度，m.fit）。
// 和 65_cascade.js 的单元序列参数表同一套数；层的缩放 × 长度，时间倍率 ÷ 时间。CPU 发射器（GPU Sprites 对动态参数帧号的支持没在 UE 验证过）
function fwlUnit(name, b0, M, L) {
  // 4.3（H10）：模拟里寿命、初速的随机是正态（σ = 寿命随机 / 初速随机 %），Cascade 只有均匀分布 → 取同方差的均匀范围 ±√3σ；风按线性阻力折成 X 加速度（k × 风速）。湍流没有（单束近似）
  // 4.9.28 变体：b0.vars 里的每一张各一个发射器（贴图 / 材质 / 发射器名第 2 张起带 _V2…），星数平分（meta.unitN）；随机感 > 0 时 Initial Size 宽 / 长各自均匀随机
  const r = +L.rate > 0 ? +L.rate : 1, sc = +L.scale > 0 ? +L.scale : 1, R = 10 * sc, uv = b0.meta.unitVar, sj = uv ? uv.sj : [0, 0];
  const out = { textures: {}, materials: {}, emitters: [] };
  [b0, ...(b0.vars || [])].forEach((b, k) => {
    const m = b.meta, P = b.P, f = m.fit, Du = m.duration, jit = clamp(Math.sqrt(3) * (+P.burnJit || 0) / 100, 0, 0.7), vj = clamp(Math.sqrt(3) * (+P.speedJit || 0) / 100, 0, 0.7), Lg = m.L;
    const sfx = k ? '_v' + (k + 1) : '', n = m.unitN > 0 ? m.unitN : Math.max(1, Math.round(+P.stars || 1)), W = m.Ww * 100 * sc, H = m.Wh * 100 * sc;
    const xy = (() => { const us = [...new Set([...m.sizeKeysX, ...m.sizeKeysY].map(q => +q[0]))].sort((a, c) => a - c); return us.map(u => [r4(u), [r4(evalKeys(m.sizeKeysX, u)), r4(evalKeys(m.sizeKeysY, u)), 1]]); })();
    out.textures['seq' + sfx] = { file: TN(name, '', null, k + 1) + '.png', class: 'flipbook', cols: Lg.cols, rows: Lg.rows, channels: Lg.chans, frames: Lg.F };
    out.textures['cutout' + sfx] = { file: TN(name, 'Cutout', null, k + 1) + '.png', class: 'cutout' };
    if (!k) out.textures.ramp = { file: TN(name, 'Ramp') + '.png', class: 'ramp' };     // 键的顺序和 4.9.27 以前一样（一张时 cascade.json 逐字不变）
    out.materials['main' + sfx] = { role: 'beam_flipbook', textures: { main: 'seq' + sfx, ramp: 'ramp' }, scalars: { rows: Lg.rows, cols: Lg.cols } };
    out.emitters.push({
      name: 'Unit' + sfx.toUpperCase(), material: 'main' + sfx, gpu: false,
      required: { screen_alignment: 'Velocity', duration_s: r4(Du * (1 + jit) / r + 0.1), loops: 1, delay_s: r4(+L.delay || 0), cutout: 'cutout' + sfx, max_draw_count: n, pivot_offset: [-0.5, r4(-(1 - m.hb))] },
      spawn: { rate: { const: 0 }, bursts: [[0, n]] },
      modules: [
        { m: 'Lifetime', Lifetime: { uniform: [r4(Du * (1 - jit) / r), r4(Du * (1 + jit) / r)] } },
        { m: 'InitialSize', StartSize: sj[0] > 0 || sj[1] > 0 ? { uniform: [[r1(W * (1 - sj[0])), r1(H * (1 - sj[1])), 1], [r1(W * (1 + sj[0])), r1(H * (1 + sj[1])), 1]] } : { const: [r1(W), r1(H), 1] } },
        { m: 'SizeByLife', LifeMultiplier: { curve: xy }, MultiplyX: true, MultiplyY: true, MultiplyZ: false },
        { m: 'SphereLocation', StartRadius: { const: r1(R) }, VelocityScale: vj > 0 ? { uniform: [r4(f.v0 * 100 * sc * r / R * (1 - vj)), r4(f.v0 * 100 * sc * r / R * (1 + vj))] } : { const: r4(f.v0 * 100 * sc * r / R) }, SurfaceOnly: true, Velocity: true },
        { m: 'Drag', DragCoefficientRaw: { const: r4(f.k * r) } },
        { m: 'ConstAcceleration', Acceleration: [r1((+P.wind || 0) * f.k * 100 * sc * r * r), 0, r1(-f.a * 100 * sc * r * r)] },
        { m: 'DynamicParameter', params: { frame: { curve: fwlFrameKeys(m.keys, Lg.F) } } },
        { m: 'ColorOverLife', ColorOverLife: { curve: fwlColor(M, Du, 0, intOr1(M.headInt)) }, AlphaOverLife: { const: 1 } }
      ],
      notes: [`单束：每颗星一个面片（${n} 颗${b0.vars ? `，第 ${k + 1} / ${b0.vars.length + 1} 张变体：种子 ${P.seed}、粗细 × ${m.unitT}、尾长 × ${m.unitL}` : ''}），贴图是一颗代表星的序列，轨迹由 Cascade 算（初速 ${r2(f.v0)} m/s、阻力 ${r4(f.k)}/s、下坠 ${r2(f.a)} m/s²）；Pivot Offset 把星头放在粒子位置（导入器待支持，未经 UE 验证）${sj[0] > 0 ? `；随机感 ${uv.r}：每颗星宽 ± ${Math.round(sj[0] * 100)} %、长 ± ${Math.round(sj[1] * 100)} %（Initial Size 均匀分布，未经 UE 验证）` : ''}`]
    });
  });
  return out;
}
// 一层星 → 一个 GPU 光点发射器。用粒子发射器组的数据格式（46_emitset.js，米、秒），同一份数据给「引擎回放」画、给 cascade.json 导出（看到的就是导出的）。
// 层的缩放 × 长度，时间倍率 ÷ 时间（速度 ×、阻力 ×、加速度 × 倍率²）；颜色 = 这一层的颜色 × 星头亮度，点火前和熄灭段压暗（内部是一条颜色 × 亮度曲线；4.9.24 导出时拆成 RGB 色相 + Alpha 亮度，半透明材质不发黑，esColorAlpha）
// 4.2.15 光点直接按模拟里每颗星来定（XD2 / 鸿巢红点层：只拟合「最远半径」会把光点都放在外壳上、keepFrac 不发光的星也出了光点、亮起时刻抹开）：
// 跑一遍模拟，每颗星记「第一次亮 a、最后亮着 b」和亮起那一刻的位置、速度——
//   个数 = 会亮的星数；出生 = 按亮起时刻分几批（Burst 列表）；寿命 = b − a；
//   出生位置 = 球面（半径的均值 ± √3σ 均匀 = 同方差），速度 = 位置 × VelocityScale（径向速度 ÷ 半径，同样均值 ± √3σ），整体的下坠 / 下坠速度用 Initial Location / Velocity；
//   之后的运动：把每颗星按「亮起后的时间」对齐，平均半径和平均高度拟合成线性阻力 + 等效重力（Cascade 只有线性 Drag）；
//   亮度 = 星头亮度 ÷ 这颗星的标称亮度，按「(t − a) / (b − a)」平均——点灭星按亮灭平均（光点不会闪），渐隐、熄灭前闪亮、星头压暗都在里面。
// 模拟步长 × 4（每 0.025 s 记一次）：和 × 1 比，半径 / 速度 / 阻力 / 批次差 < 1%，快 4 倍（鸿巢红点层 800 颗 × 12 s：9.6 s → 2.4 s）；
// 结果按参数缓存，光点大小 / 亮度、层的缩放 / 延迟 / 倍率改了不重跑
const _dotVis = new Map();
function dotVis(P, sub = 4) {
  const key = sub + JSON.stringify(P); if (_dotVis.has(key)) return _dotVis.get(key);
  const v = dotVisRun(P, sub); _dotVis.set(key, v); if (_dotVis.size > 8) _dotVis.delete(_dotVis.keys().next().value); return v;
}
function dotVisRun(P, sub) {
  const h = H_STEP * sub, s = new Sim({ ...P, engine: 'gpu' }), n = Math.ceil(P.duration / h), rec = new Map(), EV = Math.max(1, Math.round(12 / sub)), dt = EV * h;
  for (let i = 0; i < n; i++) {
    s.step(h); if ((i + 1) % EV) continue;
    for (const st of s.stars) { if (!st.alive || st.kind === 5) continue; let q = rec.get(st); if (!q) rec.set(st, q = []); q.push([s.t, s.headI(st) / (st.I || 1), st.x, st.z, st.y, st.vx, st.vz, st.vy]); }   // 模拟 y 朝上 → 发射器 z 朝上
  }
  const S = [];
  for (const q of rec.values()) { let ia = -1, ib = -1; q.forEach((x, k) => { if (x[1] > 0) { if (ia < 0) ia = k; ib = k; } }); if (ia >= 0 && ib > ia) S.push(q.slice(ia, ib + 1)); }
  if (!S.length) return null;
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length, sd = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
  const qt = (a, f) => { const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(f * b.length))]; };
  // 亮起那一刻：整体中心（位置、速度）+ 每颗星相对中心的半径、径向速度
  const A = S.map(q => q[0]), c0 = [2, 3, 4].map(j => mean(A.map(x => x[j]))), cv = [5, 6, 7].map(j => mean(A.map(x => x[j])));
  const rad = A.map(x => Math.max(0.01, Math.hypot(x[2] - c0[0], x[3] - c0[1], x[4] - c0[2])));
  const wr = A.map((x, k) => ((x[5] - cv[0]) * (x[2] - c0[0]) + (x[6] - cv[1]) * (x[3] - c0[1]) + (x[7] - cv[2]) * (x[4] - c0[2])) / rad[k] / rad[k]);
  const span = (m, d, lo = 0) => [Math.max(lo, m - 1.7320508 * d), Math.max(lo, m + 1.7320508 * d)];
  const R = span(mean(rad), sd(rad), 0.01), W = span(mean(wr), sd(wr));
  // 亮起后的运动：按亮起后的时间 τ 对齐，算平均半径（相对当时的中心）和中心高度；拟合 r(τ) = R̄ + R̄·W̄·s1、z(τ) = z0 + vz0·s1 − g/k·(τ − s1)，s1 = (1 − e^(−kτ))/k
  const nT = Math.max(...S.map(q => q.length)), tr = [];
  for (let m = 0; m < nT; m++) {
    const xs = S.filter(q => q.length > m).map(q => q[m]); if (xs.length < Math.max(3, 0.3 * S.length)) break;
    const c = [2, 3, 4].map(j => mean(xs.map(x => x[j]))); tr.push([m * dt, mean(xs.map(x => Math.hypot(x[2] - c[0], x[3] - c[1], x[4] - c[2]))), c[2]]);
  }
  // 每个阻力值 k：外扩速度 V、等效重力 g 都按最小二乘取（相对误差）。V 不直接用亮起那一刻的速度：平方阻力在高速时减速更快，线性阻力照搬初速会前段偏大（牡丹主段 +15%）
  const Rm = (R[0] + R[1]) / 2;
  let best = null;
  for (let e = -2; e <= 1.6; e += 0.01) {
    const k = Math.pow(10, e); let svr = 0, svv = 0, sfz = 0, sff = 0;
    for (const [t, r, z] of tr) { const s1 = (1 - Math.exp(-k * t)) / k, f = -(t - s1) / k, w = 1 / Math.max(1, r * r); svr += w * s1 * (r - Rm); svv += w * s1 * s1; sfz += w * f * (z - c0[2] - cv[2] * s1); sff += w * f * f; }
    const V = svv > 0 ? Math.max(0, svr / svv) : 0, g = sff > 0 ? clamp(sfz / sff, 0, 3 * G) : 0; let err = 0;
    for (const [t, r, z] of tr) { const s1 = (1 - Math.exp(-k * t)) / k; err += ((Rm + V * s1 - r) ** 2 + (c0[2] + cv[2] * s1 - g * (t - s1) / k - z) ** 2) / Math.max(1, r * r); }   // 相对误差：前段半径小、别被后段压过
    if (!best || err < best.err) best = { k, g, V, err };
  }
  // VelocityScale = V ÷ 半径；离散（± √3σ）按亮起那一刻的径向速度 ÷ 半径的相对离散
  const Wm = (W[0] + W[1]) / 2, Wf = best.V / Rm, Wr = Wm > 1e-9 ? [W[0] / Wm, W[1] / Wm] : [1, 1];
  W[0] = Math.max(0, Wf * Wr[0]); W[1] = Math.max(0, Wf * Wr[1]);
  // 亮度曲线：按相对寿命平均（标称亮度 = 1）
  const NB = 40, bins = new Float64Array(NB), cnt = new Float64Array(NB);
  for (const q of S) { const a = q[0][0], b = q[q.length - 1][0]; for (const x of q) { const k = Math.min(NB - 1, Math.floor((x[0] - a) / (b - a) * NB)); bins[k] += x[1]; cnt[k]++; } }
  const alpha = Array.from(bins, (v, k) => [+((k + 0.5) / NB).toFixed(4), cnt[k] ? clamp(v / cnt[k], 0, 3) : 0]);
  // 出生批次：按亮起时刻分 5 份，每份在它的中位时刻爆发；相隔 < 0.05 s 的并成一批
  const ons = A.map(x => x[0]).sort((x, y) => x - y), bursts = [];
  for (let g = 0; g < 5; g++) { const a = Math.floor(g * ons.length / 5), b = Math.floor((g + 1) * ons.length / 5); if (b <= a) continue; const t = ons[(a + b) >> 1], last = bursts[bursts.length - 1];
    if (last && t - last[0] < 0.05) last[1] += b - a; else bursts.push([t, b - a]); }
  const durs = S.map(q => q[q.length - 1][0] - q[0][0]);
  return { n: S.length, on: bursts[0][0], bursts, life: [qt(durs, 0.1), qt(durs, 0.9)], med: qt(durs, 0.5), alpha, c0, cv, R, W, k: best.k, g: best.g };
}
// 光点大约几颗（不跑模拟，给层页头 / 交付页显示）：星头会亮的星 = 星数 × keepFrac，炭头亮度 0 → 0；准确数在导出 / 引擎回放时按模拟算
function dotsCount(P) { return +P.headBright > 0 ? Math.round((+P.stars || 0) * (P.keepFrac != null ? clamp(+P.keepFrac, 0, 1) : 1)) : 0; }
// L.dotSize：光点直径 × 炭头大小（默认 1）；L.dotBright：光点亮度倍数（默认 1）——层页头「导出方案」选光点时可调（XD2：以前 × 1.7 偏大）
function dotsES(L, P, M, fm) {
  P = fxP(P);     // 4.9.21 整体调整（星头大小）
  const v = dotVis(P), r = +L.rate > 0 ? +L.rate : 1, sc = +L.scale > 0 ? +L.scale : 1, seed = ((+P.seed || 1) * 31 + 7) | 0;
  const rl = [M.ramp2, M.ramp3].filter(Boolean).map(hexToLin), rc = rl.length ? [0, 1, 2].map(j => rl.reduce((a, c) => a + c[j], 0) / rl.length) : [1, 1, 1];
  const sz = Math.max(0.05, (L.dotSize > 0 ? +L.dotSize : 1) * (+P.headSize || 1) * sc), gain = intOr1(M.headInt) * intOr1(P.headBright) * (L.dotBright > 0 ? +L.dotBright : 1);
  if (!v) return { name: 'Dots', gpu: true, delay: +L.delay || 0, duration: 0.1, bursts: [], life: [1, 1], size: [sz, sz], col: [[0, [0, 0, 0]], [1, [0, 0, 0]]], ak: [[0, 0], [1, 0]], seed, fit: { k: 0, g: 0, on: 0, n: 0 } };
  // 序列材质的色相来自 Ramp（灰度查表）× Color Over Life；软圆点没有 Ramp，星头亮核用 Ramp 亮端（中亮、亮两格的平均，线性）乘进颜色
  let ak = [[0, v.alpha[0][1]], ...v.alpha, [1, v.alpha[v.alpha.length - 1][1]]];
  const ck = colorKeys(M, v.med, v.on).map(([u, c]) => [u, c.map((x, j) => x * rc[j])]);
  // 4.4.4 点灭（用户 10-04 09:58「点灭光点用 Cascade 的方式实现」）：以前亮度按相对寿命把亮灭平均掉了、光点不闪。现在：
  // 包络 = 不点灭时的亮度（同一份模拟去掉点灭），点灭开始之后乘上方波（亮 1.6 / 灭 0.03，和模拟里星头一样），按中位寿命换成相对寿命写进 Color Over Life。
  // 所有粒子共用一条曲线，靠寿命随机让各粒子的亮灭慢慢错开（开始那一下是一起亮的）；GPU 发射器的曲线查找表会不会把方波抹平要 UE 验（D6）
  if (+P.strobeHz > 0) {
    const v0 = dotVis({ ...P, strobeHz: 0 }) || v, env = [[0, v0.alpha[0][1]], ...v0.alpha, [1, v0.alpha[v0.alpha.length - 1][1]]];
    const u0 = clamp(+P.strobeStart || 0, 0, 1), per = 1 / Math.max(0.05, +P.strobeHz * v.med), duty = clamp(+P.strobeDuty || 0.35, 0.02, 0.98), e = Math.min(0.004, per * 0.08);
    const R = x => +Math.min(1, x).toFixed(4), sq = [];      // 先取 4 位小数：下面关键帧时刻也是 4 位，否则「亮起」那一帧会被判成还没到、亮边拖成斜坡
    for (let a = u0; a < 1; a += per) { const b = a + per * duty; sq.push([R(a), 1.6], [R(b - e), 1.6], [R(b), 0.03], [R(a + per - e), 0.03]); }
    const f = u => { if (u < u0) return 1; let x = 1; for (let i = 0; i < sq.length; i++) if (sq[i][0] <= u) x = sq[i][1]; else break; return x; };
    const ua = [...new Set([0, 1, ...env.map(k => +k[0]), ...sq.map(k => +k[0])].map(u => +clamp(u, 0, 1).toFixed(4)))].sort((a, b) => a - b);
    ak = ua.map(u => [u, +(esCurve(env, u) * f(u)).toFixed(4)]);
  }
  const us = [...new Set([0, 1, ...ck.map(k => +k[0]), ...ak.map(k => +k[0])].map(u => +clamp(u, 0, 1).toFixed(4)))].sort((a, b) => a - b);
  const col = esThin(us.map(u => [u, esCurve(ck, u).map(c => +(c * gain * esCurve(ak, u)).toFixed(4))]), 0.01);
  const t0 = v.bursts[0][0], bursts = v.bursts.map(([t, n]) => [(t - t0) / r, n]);
  return { name: 'Dots', gpu: true, delay: (+L.delay || 0) + t0 / r, duration: bursts[bursts.length - 1][0] + v.life[1] / r + 0.1, bursts, life: [v.life[0] / r, v.life[1] / r], size: +P.headSizeJit > 0 ? (q => [+(sz * 0.85 / q).toFixed(4), +(sz * 1.15 * q).toFixed(4)])(Math.exp(1.4 * 0.6 * +P.headSizeJit)) : [sz * 0.85, sz * 1.15], col, ak,     // 4.9.50 星头大小随机：Initial Size 范围放宽（±1.4σ）
    sphere: { r: [v.R[0] * sc, v.R[1] * sc], vs: [v.W[0] * r, v.W[1] * r] }, loc: [[0, v.c0.map(x => x * sc)]], vel: [[0, v.cv.map(x => x * sc * r)]],
    drag: [v.k * r, v.k * r], accel: [0, 0, -v.g * sc * r * r], seed, fit: { k: v.k, g: v.g, on: t0, n: v.n } };
}
function fwlDots(L, P, M, fm) {
  const e = dotsES(L, P, M, fm), j = esFwlEmitter(e, false, 1), f = e.fit, n = Math.round(+P.stars || 0);
  return { ...j, notes: [`GPU 光点：这一层会亮的星只出星头光点（${f.n} 颗${f.n < n ? `，另外 ${n - f.n} 颗模拟里不发光` : ''}，球面放射），尾迹、星头闪烁不在里面；${+P.strobeHz > 0 ? `点灭写进 Color Over Life 的 Alpha（${r2(+P.strobeHz)} Hz 方波，RGB 不变；所有粒子共用一条曲线、靠寿命随机错开；10-05 HK10 实测 GPU 查找表没抹平）；` : ''}出生位置、速度、寿命按模拟里每颗星亮起那一刻定，${e.bursts.length > 1 ? `按亮起先后分 ${e.bursts.length} 批出生、` : ''}之后的运动拟合成线性阻力（阻力 ${r4(f.k)}/s、等效重力 ${r2(f.g)} m/s²）；${f.on > 0.1 ? `第一批在 ${r2(f.on)} s 亮起；` : ''}光点直径 = 星头 × ${r2(L.dotSize > 0 ? +L.dotSize : 1)}、颜色 = 这一层的颜色 × Ramp 亮端 × 星头亮度 × ${r2(L.dotBright > 0 ? +L.dotBright : 1)}，是起点，未经 UE 验证`] };
}
// 引擎回放画光点层：同一份数据，按层缓存出生表
function dotsTables(e, L) {
  const sig = JSON.stringify([L.scale, L.rate, L.delay, L.stages, L.xw, L.headInt, L.ramp2, L.ramp3, L.dotSize, L.dotBright, e.P]);
  if (e._dots && e._dots.sig === sig) return e._dots.tab;
  const ES = { emitters: [dotsES(L, e.P, comboLayerM(L), e.bake && e.bake.fm)] }; e._dots = { sig, tab: esSpawn(ES, 1) }; return e._dots.tab;
}
function fwlCombo(name, layers, mobile = false) {
  const out = { format: FWL_FORMAT, name, platform: mobile ? 'mobile' : 'pc',
    source: { tool: '烟花母版烘焙器 ' + VERSION, combo: true, layers: layers.map(({ L, b, dots, unit, frame }) => ({ type: b.P.type, form: dots ? 'dots' : unit ? 'unit' : frame ? 'frame' : b.form, renderVer: 40 })) },     // plan_sig 在下面所有发射器都放好以后写
    textures: {}, materials: {}, emitters: [], system: { preview_distance_cm: 30000, preview_warmup_s: 1.2 }, notes: [] };
  layers.forEach(({ L, b, i: li, dots, unit, unitName, frame, frameName }, k) => {
    const i = li == null ? k : li, pre = `L${i + 1}_`;
    if (frame) {     // 4.9.35 单帧层（用户 10-07 18:50 并进产物表）：灰度单帧 + Ramp（现有序列材质 1 × 1 格）+ 功能图 / 溶解标记；PC、手机都是单帧时共用同一张
      const sc = +L.scale > 0 ? +L.scale : 1, r = fwlLowLayer(frameName || comboLayerName(name, i), frame, comboLayerM(L), { ...L, layerNo: i + 1 }, pre);
      Object.assign(out.textures, r.textures); Object.assign(out.materials, r.materials); out.extras = { ...(out.extras || {}), ...r.extras };
      out.emitters.push(r.emitter); out.system.preview_distance_cm = Math.max(out.system.preview_distance_cm, Math.round(2 * frame.view[2] * 100 * sc * 1.3));
      return;
    }
    if (unit) {     // 4.2.13：单束层（4.9.35 手机也能出：CPU 发射器，贴图和 PC 同一套时直接引用 PC 那几张）
      const ln = unitName || comboLayerName(name, i), u = fwlUnit(ln, unit, comboLayerM(L), L);
      for (const [k2, v] of Object.entries(u.textures)) out.textures[pre + k2] = v;
      for (const [k2, v] of Object.entries(u.materials)) out.materials[pre + k2] = { ...v, textures: { main: pre + v.textures.main, ramp: pre + 'ramp' } };
      for (const em of u.emitters) out.emitters.push({ ...em, name: pre + em.name, material: pre + em.material, layer: i + 1, required: { ...em.required, cutout: pre + em.required.cutout } });     // 4.9.28 变体几张就几个发射器
      return;
    }
    if (dots) {     // 4.2.12：PC 光点层，没有贴图
      const d = fwlDots(L, b.P, comboLayerM(L), b.fm);
      out.materials[pre + 'dot'] = { role: 'soft_dot' };
      out.emitters.push({ ...d, name: pre + 'Dots', material: pre + 'dot', layer: i + 1 });
      return;
    }
    const ln = comboLayerName(name, i), body = fwlMaster(ln, b, comboLayerM(L), mobile);
    const rate = +L.rate > 0 ? +L.rate : 1, sc = +L.scale > 0 ? +L.scale : 1;
    for (const [k, v] of Object.entries(body.textures)) out.textures[pre + k] = v;
    for (const [k, v] of Object.entries(body.materials))
      out.materials[pre + k] = { ...v, textures: Object.fromEntries(Object.entries(v.textures).map(([role, t]) => [role, pre + t])) };
    for (const e of body.emitters) {
      const modules = e.modules.map(m => {
        if (m.m === 'Lifetime') return { ...m, Lifetime: { const: r4(m.Lifetime.const / rate) } };
        if (m.m === 'InitialSize') return { ...m, StartSize: { const: m.StartSize.const.map((v, j) => j < 2 ? r1(v * sc) : v) } };
        if (m.m === 'InitialLocation') return { ...m, StartLocation: { const: m.StartLocation.const.map((v, j) => j === 2 ? r1(v * sc) : v) } };
        return m;
      });
      out.emitters.push({ ...e, name: pre + e.name, material: pre + e.material, layer: i + 1,
        required: { ...e.required, duration_s: r4(e.required.duration_s / rate), delay_s: r4((+L.delay || 0) + e.required.delay_s / rate), cutout: pre + e.required.cutout },
        modules, ...(L.mirror ? { notes: ['这一层在烘焙器里水平镜像；导出的贴图没有翻转，引擎里需要把面片 X 尺寸取负或换翻转贴图（未经 UE 验证）'] } : {}) });
    }
    out.system.preview_distance_cm = Math.max(out.system.preview_distance_cm, body.system.preview_distance_cm * sc);
  });
  out.notes.push('多层效果：所有发射器放在同一个粒子系统里，同一个爆点；每个发射器按 delay_s 延迟出生（Required → Emitter Delay），不需要蓝图或代码触发。');
  out.source.plan_sig = fwlPlanSig(fwlFinish(out.emitters));     // 4.9.24 每个发射器加 Scale Color/Life
  return out;
}
// 组合导出用的层烘焙：分开输出（星头 / 拖尾两张）的层在素材包里改成合并输出，和引擎材质（灰度查 Ramp）一致
async function comboLayerBakes(layers, onProg) {
  if (typeof bakeFlush === 'function') await bakeFlush();     // 4.2.16：自动烘焙关时攒着的改动先烘完，导出不拿旧贴图
  const out = [], own = [];
  for (let i = 0; i < layers.length; i++) {
    const L = layers[i], e = state.lib.find(x => x.name === L.lib);
    if (!e || !e.bake) throw new Error(`第 ${i + 1} 层「${L.lib}」还没有烘焙`);
    // 4.5.8（19-C01）：这一层按新参数烘焙失败了（或还没烘到最新），手上的是旧贴图 → 拦住，不导出和参数对不上的包
    if (e.failedRev != null && e.failedRev === e.pRev) throw new Error(`第 ${i + 1} 层「${layerName(i)}」按新参数烘焙失败，导出会拿旧贴图：先改参数或点「重试」`);
    if (layerStale(e)) throw new Error(`第 ${i + 1} 层「${layerName(i)}」的贴图还不是最新参数烘的（烘焙没跑完）：等烘完再导出`);
    let b = e.bake;
    // 4.2.5：导出用收紧后的取景（预览可能还没来得及在后台收紧）
    if (!b.tail && b.scale === 1 && !b.meta.fitted) { const nb = await refineBake(b, p => onProg && onProg((i + p) / layers.length)); if (nb) { dropLibBake(e); e.bake = b = nb; } }
    if (b.tail || b.scale !== 1) {
      b = await bakeFinal({ ...libP(e.P, true), outMode: 'combined' }, 1, p => onProg && onProg((i + p) / layers.length));
      own.push(b);
    }
    out.push({ L, b, e });
  }
  return { layers: out, own };
}
// 单束层的烘焙（和交付页「单束包」同一套：16 × 2 格、RGBA、按帧数自动）；缓存在库条目上，参数变了重烘
// 4.9.25：单束只出合并的一张（beam_flipbook 材质只认一张；以前选了「星头、火花分开」时贴图叫 _Head / _Tail、cascade.json 却引用不带后缀的那张）
function unitP(P0) { return { ...P0, form: 'unit', cols: 16, rows: 2, chans: 4, frameMode: 'auto', autoGrid: 1, outMode: 'combined' }; }
// 4.9.25 单层效果的单束烘焙也缓存（和多层的 e.unitBake 同一套）：贴图 / 流转 / 引擎回放 / 导出用同一份
const singleUnitEntry = { P: null, unitBake: null };
function singleUnitHolder() { singleUnitEntry.P = state.P; singleUnitEntry.unitSrc = state.P; return singleUnitEntry; }
// 单束贴图只和效果参数有关：导出方案（PC / 手机怎么出、光点大小亮度）变了不用重烘；变体数 / 随机感（4.9.28）另算进 unitSigOf
const unitSig = P => JSON.stringify({ ...P, outPC: 0, outMobile: 0, dotSize: 0, dotBright: 0, unitVariants: 0, unitRandom: 0, outLow: 0, lowPick: 0, lowAt: 0, lowSize: 0, lowJit: 0, lowMaps: 0, lowSuffix: 0, exportScale: 0, exportScaleRise: 0 });
// 4.9.28 单束变体（用户 10-07 09:20「这些效果要对粗细、长短或多个不同种子一起组合，提升随机感，降低随机感」；11:45 选「变体数 + 随机感」）：
//   变体数 K（1–4）：烘 K 张单束贴图，第 k 张种子 + 101k（火花纹路不同），星数平分，每张一个发射器；
//   随机感 r（0–1）：几张之间粗细（火花大小、星头大小 × 1 ± 0.4r）和长短（尾长 × 1 ± 0.35r，和粗细错开排）拉开；
//   Cascade 每颗星大小再随机（Initial Size 均匀分布：宽 ± 25 % r、长 ± 20 % r），一张也有。缺省 1 / 0 = 以前那一张，cascade.json 逐字不变。
// 单层存在 P（导出方案的键），多层存在层上（L.unitVariants / L.unitRandom，和光点大小一样）
function unitVarOf(src) { const K = Math.round(+(src && src.unitVariants) || 1); return { K: clamp(K, 1, 4), r: clamp(+(src && src.unitRandom) || 0, 0, 1) }; }
const UNIT_VAR_POS = { 1: [0], 2: [-1, 1], 3: [-1, 0, 1], 4: [-1, -1 / 3, 1 / 3, 1] }, UNIT_VAR_LEN = { 1: [0], 2: [1, -1], 3: [0, 1, -1], 4: [1 / 3, -1, 1, -1 / 3] };
function unitVarPs(P, uv) {
  const { K, r } = uv, N = Math.max(1, Math.round(+P.stars || 1)), out = [];
  for (let k = 0; k < K; k++) {
    const t = 1 + 0.4 * r * UNIT_VAR_POS[K][k], l = 1 + 0.35 * r * UNIT_VAR_LEN[K][k], n = Math.floor(N / K) + (k < N % K ? 1 : 0);
    const Pk = k === 0 && t === 1 && l === 1 ? P : { ...P, seed: (+P.seed || 0) + 101 * k, adjSparkSize: adjOf(P, 'adjSparkSize') * t, adjHeadSize: adjOf(P, 'adjHeadSize') * t, adjTailLen: adjOf(P, 'adjTailLen') * l };
    out.push({ P: Pk, t: +t.toFixed(4), l: +l.toFixed(4), n });
  }
  return out;
}
function unitSigOf(h) { return h && h.P ? unitSig(h.P) + JSON.stringify(unitVarOf(h.unitSrc || h.P)) : ''; }
// 这个持有者（多层 = 图层条目 e，单层 = singleUnitHolder()）现在有没有对得上的单束烘焙；L：多层时这一层（变体设置在层上）
function unitBakeOf(h, L) { if (!h) return null; if (L) h.unitSrc = L; return h.unitBake && h.unitBake.sig === unitSigOf(h) ? h.unitBake.b : null; }
async function bakeUnitSet(P, uv, onProg) {
  const vs = unitVarPs(P, uv), bs = [];
  try { for (let k = 0; k < vs.length; k++) bs.push(await bake(vs[k].P, 1, p => onProg && onProg((k + p) / vs.length))); }
  catch (err) { bs.forEach(disposeBake); throw err; }
  const b = bs[0]; bs.forEach((x, k) => { x.meta.unitN = vs[k].n; x.meta.unitT = vs[k].t; x.meta.unitL = vs[k].l; });
  if (bs.length > 1) b.vars = bs.slice(1);
  if (uv.K > 1 || uv.r > 0) b.meta.unitVar = { K: uv.K, r: uv.r, sj: [+(0.25 * uv.r).toFixed(4), +(0.2 * uv.r).toFixed(4)] };
  return b;
}
async function layerUnitBake(e, onProg, L) {
  if (L) e.unitSrc = L;
  const sig = unitSigOf(e);
  if (e.unitBake && e.unitBake.sig === sig) return e.unitBake.b;
  if (e.unitBake) { disposeBake(e.unitBake.b); e.unitBake = null; }
  const b = await bakeUnitSet(unitP(e.P), unitVarOf(e.unitSrc || e.P), onProg); e.unitBake = { sig, b }; return b;
}
async function comboPackFiles(name, layers, onProg) {
  const files = [], { layers: lb, own } = await comboLayerBakes(layers, p => onProg && onProg(p * 0.4));
  const ownMobile = [];
  try {
    const pcE = [], mbE = [], nmE = [];
    for (let i = 0; i < lb.length; i++) {
      const { L, b, e } = lb[i], ln = comboLayerName(name, i), mn = comboLayerName(name + '_Mobile', i), M = comboLayerM(L), o = layerOut(L), uOK = unitAllowed(b.P);   // 4.2.12：每层的导出方案
      const pcK = o.pc === 'unit' && !uOK ? 'seq' : o.pc, mbK = o.mobile === 'unit' && !uOK ? 'seq' : o.mobile;     // 单束不适用的花型（千轮、分裂、蜂、非球形图案）按序列出
      const ramp = async n => files.push([`${TN(n, 'Ramp')}.png`, await encodePNG(rampPixels(M), 256, 8)]), pg = (a, w) => p => onProg && onProg(0.4 + (a + w * (i + p) / lb.length));
      const ub = pcK === 'unit' || mbK === 'unit' ? await layerUnitBake(e, pg(0, 0.1), L) : null;
      const lw = pcK === 'frame' || mbK === 'frame' ? await lowFor(b, lowOf(L), M, pg(0.1, 0.1)) : null;     // 4.9.35 单帧（PC / 手机同一张）
      if (pcK === 'seq') { files.push(...await texFiles(b, ln)); await ramp(ln); }
      else if (pcK === 'unit') { files.push(...await texFiles(ub, ln)); await ramp(ln); }
      else if (pcK === 'frame') files.push(...await lowFiles(ln, lw, M));
      let mb = null;
      if (mbK === 'seq') { mb = b.mobile || await bakeMobileFor(b, pg(0.2, 0.3)); if (!b.mobile) ownMobile.push(mb); files.push(...await texFiles(mb, mn)); await ramp(mn); }
      else if (mbK === 'unit' && pcK !== 'unit') { files.push(...await texFiles(ub, mn)); await ramp(mn); }
      else if (mbK === 'frame' && pcK !== 'frame') files.push(...await lowFiles(mn, lw, M));
      pcE.push({ L, b, unit: pcK === 'unit' ? ub : undefined, unitName: ln, frame: pcK === 'frame' ? lw : undefined, frameName: ln, kind: pcK });
      mbE.push({ L, b: mb || b, unit: mbK === 'unit' ? ub : undefined, unitName: pcK === 'unit' ? ln : mn, frame: mbK === 'frame' ? lw : undefined, frameName: pcK === 'frame' ? ln : mn, kind: mbK });
      nmE.push({ ln, mn, b: pcK === 'unit' ? ub : b, mb: mbK === 'seq' ? mb : mbK === 'unit' && pcK !== 'unit' ? ub : null, pcTex: pcK === 'seq',
        frame: lw ? { pc: pcK === 'frame', mob: mbK === 'frame' && pcK !== 'frame', suffix: lw.maps ? lw.suffix : '' } : null });
    }
    // 产物表里每层选的那一种：L.out 按 kind 改写（单束不适用 → 序列），comboEntries 照它挑
    const sel = (E, mobile) => comboEntries(E.map(x => ({ ...x, L: { ...x.L, out: { pc: mobile ? 'seq' : x.kind, mobile: mobile ? x.kind : 'seq' } } })), mobile).map(x => ({ ...x, L: lb[x.i].L }));
    files.push(['cascade.json', utf8(JSON.stringify(fwlCombo(name, sel(pcE, false), false), null, 1))]);
    files.push(['cascade_mobile.json', utf8(JSON.stringify(fwlCombo(name + '_Mobile', sel(mbE, true), true), null, 1))]);
    // 命名规范（61_naming.js）：多层 = 礼花英文名 + 每层英文名
    if (lb.every(({ b }) => namingApplies(b))) {
      const ef = typeof lib !== 'undefined' ? lib.effect : null, key = typeof wbKey === 'function' ? wbKey() : name, nm = packNamesFor(key, ef, lb.length, name);
      return applyPackNaming(files, nm.base, nmE.map((x, i) => ({ ...x, mb: x.mb || x.b, layer: nm.layers[i] })));
    }
    return files;
  } finally { own.forEach(disposeBake); ownMobile.forEach(disposeBake); }
}

// ---- 4.4.2 单层效果的导出方案（用户 10-04 21:17：以前只有多层效果的层页头能选 GPU 光点 / 单束；单层也要）----
// 单层没有「层」：用 state.P 里的 outPC / outMobile / dotSize / dotBright 拼一个只有一层的 L（颜色就是 state.M），和多层走同一套 fwlCombo / fwlDots / fwlUnit
function singleOut(P) { return singleSchemeOn(P) ? { pc: OUT_PC_KINDS.includes(P.outPC) ? P.outPC : 'seq', mobile: OUT_MOBILE_KINDS.includes(P.outMobile) ? P.outMobile : 'seq' } : { pc: 'seq', mobile: 'seq' }; }
function singleLayer(P, M) { const o = singleOut(P), L = { ...M, delay: 0, rate: 1, scale: 1, out: o }; if (+P.dotSize > 0 && +P.dotSize !== 1) L.dotSize = +P.dotSize; if (+P.dotBright > 0 && +P.dotBright !== 1) L.dotBright = +P.dotBright; return L; }
function singleSchemeNote(P) { const L = singleLayer(P, state.M); return typeof outNote === 'function' ? outNote(L, { P }) : ''; }
// 单层的光点：缓存在一个假条目上（参数 / 颜色变了按 dotsTables 自己的签名重算）
const singleDotsEntry = { P: null, bake: null };
// 4.9.25 导出方案（PC / 手机怎么出、光点大小 / 亮度）改了不用重烘：画面和导出按现在的方案，模拟的数用烘焙时的参数
const SCHEME_KEYS = ['outPC', 'outMobile', 'dotSize', 'dotBright', 'unitVariants', 'unitRandom', 'lowPick', 'lowAt', 'lowSize', 'lowJit', 'lowMaps', 'lowSuffix', 'exportScale', 'exportScaleRise'];     // 4.9.29 低端 / 单帧     // 4.9.28 单束变体数 / 随机感：只重烘单束
function withScheme(P) { if (!P || P === state.P || state.tab === 'combo' || !state.P) return P; const o = { ...P }; for (const k of SCHEME_KEYS) o[k] = state.P[k]; return o; }
function singleDotsTables(P, M, b) { singleDotsEntry.P = P; singleDotsEntry.bake = b; return dotsTables(singleDotsEntry, singleLayer(P, M)); }
// 导出：PC / 手机各按方案出；文件名和单层序列一样（单束 / 单帧的贴图用 _L1 层名，cascade.json 里引用的就是它；手机只出单束 / 单帧时用 _Mobile）
async function singleSchemeFiles(name, b, M, onProg) {
  const P = withScheme(b.P || state.P), o = singleOut(P), L = singleLayer(P, M), files = [], own = [], ln = comboLayerName(name, 0), mn = name + '_Mobile';
  try {
    const uOK = unitAllowed(P), pcK = o.pc === 'unit' && !uOK ? 'seq' : o.pc, mbK = o.mobile === 'unit' && !uOK ? 'seq' : o.mobile;
    const ramp = async n => files.push([`${TN(n, 'Ramp')}.png`, await encodePNG(rampPixels(M), 256, 8)]);
    // 4.9.25 单束：和贴图 / 引擎回放同一份（缓存，不在这里丢）；4.9.35 单帧（PC / 手机同一张，b.lowCache 缓存）
    const ub = pcK === 'unit' || mbK === 'unit' ? await layerUnitBake(singleUnitHolder(), p => onProg && onProg(0.3 * p)) : null;
    const lw = pcK === 'frame' || mbK === 'frame' ? await lowFor(b, lowOf(P), M, p => onProg && onProg(0.3 + 0.1 * p)) : null;
    if (pcK === 'seq') { files.push(...await texFiles(b, name)); await ramp(name); }
    else if (pcK === 'unit') { files.push(...await texFiles(ub, ln)); await ramp(ln); }
    else if (pcK === 'frame') files.push(...await lowFiles(ln, lw, M));
    const one = (kind, mobile, bb, unitName, frameName) => kind === 'off' ? [] : [{ L, b: bb, i: 0, dots: !mobile && kind === 'dots', unit: kind === 'unit' ? ub : undefined, unitName, frame: kind === 'frame' ? lw : undefined, frameName }];
    files.push(['cascade.json', utf8(JSON.stringify(pcK === 'seq' ? fwlCascade(name, b, M, false) : fwlCombo(name, one(pcK, false, b, ln, ln), false), null, 1))]);
    let mb = null;
    if (mbK === 'seq') {
      mb = b.mobile || await bakeMobileFor(b, p => onProg && onProg(0.4 + 0.5 * p)); if (!b.mobile) own.push(mb);
      files.push(...await texFiles(mb, mn)); await ramp(mn);
      files.push([`${name}_Mobile.json`, utf8(JSON.stringify(masterJSON(mb, mn, M), null, 2))]);
      files.push(['cascade_mobile.json', utf8(JSON.stringify(fwlCascade(mn, mb, M, true), null, 1))]);
    } else {
      if (mbK === 'unit' && pcK !== 'unit') { files.push(...await texFiles(ub, mn)); await ramp(mn); }
      else if (mbK === 'frame' && pcK !== 'frame') files.push(...await lowFiles(mn, lw, M));
      files.push(['cascade_mobile.json', utf8(JSON.stringify(fwlCombo(mn, one(mbK, true, b, pcK === 'unit' ? ln : mn, pcK === 'frame' ? ln : mn), true), null, 1))]);
    }
    const frame = lw ? { pc: pcK === 'frame', mob: mbK === 'frame' && pcK !== 'frame', suffix: lw.maps ? lw.suffix : '' } : null;
    return { files, ub: pcK === 'unit' ? ub : null, mb: mbK === 'seq' ? mb : mbK === 'unit' && pcK !== 'unit' ? ub : null, frame, pcTex: pcK === 'seq', ln: pcK === 'unit' || pcK === 'frame' ? ln : name, mn };
  } finally { own.forEach(x => { if (x !== b) disposeBake(x); }); }
}
