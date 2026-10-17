// =====================================================================
//  4.9.113 资源规范统一第三步：四项规则进导出（用户 10-16 01:38 四项原话；10-17「把统一资源规范的第三段内容做了」）
//  所有导出都经过 makeZip → packFinalize（63_gate.js）→ 这里，给每份 cascade*.json 补上四项，导入器按这些字段写，
//  「更新」已有资产时照包重写、不再回到默认（26 第 2 步手改的 115 包就是被旧导入器「更新」改回的风险）：
//    ① system.fixed_bounds：固定包围盒（组件本地，cm）。每个发射器整个寿命的位置包络（出生位置 + 初速 + 加速度 + 阻力，或 Velocity/Life 直接积分）
//       + 面片角点到粒子位置的最远距离（含 Pivot、Size By Life、锁 Z 轴）；事件生成的子粒子从母粒子的范围出发、继承速度；
//       重力等加速度世界固定、不跟组件缩放，按缩放两端 0.65 / 1.6 换到本地（26 干跑 D5）；每边再往外 10 %、10 cm 向外取整。
//       不认识会动位置的模块 → 这一份配置不写盒（导入器照旧 ±1000 m），写进 resource_rules.unknown。
//    ② required.screen_alignment：方形大序列（序列材质、CPU、Rectangle、没锁轴、X = Y 全程）→ FacingCameraPosition；
//       横竖不同的仍 Rectangle（26 D1 实测：FCP 只认 X，把长条压短）。Velocity / Square / 锁轴 / 单束 / GPU 不改。
//    ③ required.uv_flip：None / RandomFlipUOnly，见 fwlUvFlip。
//    ④ materials[k].emissive_dissolve = 0.98：序列 / 单束材质（查 Ramp 的那一族），避开 Ramp 末格黑（渲染基础问题 I1）。
//  只改 cascade 配置：模拟、贴图像素、帧计划指纹（plan_sig）、OUTPUT_VER 都不变。纯函数（不读 state），检查脚本可直接调。
// =====================================================================
const FWL_RULES = Object.freeze({ format: 'fwl.resource-rules/1', margin: 0.1, roundCm: 10, scale: [0.65, 1.6], emissiveDissolve: 0.98, steps: 160 });
const FWL_SEQ_ROLES = new Set(['flipbook_rgba', 'beam_flipbook']);
// 不动位置 / 大小的模块（包围盒不用管）；会动位置的只认下面 fwlReachOf 里处理的那几种
const FWL_RULES_INERT = new Set(['DynamicParameter', 'ColorOverLife', 'ColorScaleOverLife', 'InitialColor', 'InitialRotation', 'RotationRate', 'EventGenerator', 'OrientationAxisLock']);
const FWL_RULES_MOVE = new Set(['Lifetime', 'InitialSize', 'SizeByLife', 'InitialLocation', 'SphereLocation', 'InitialVelocity', 'VelocityOverLife', 'Drag', 'ConstAcceleration', 'Acceleration', 'EventReceiverSpawn']);

// ---- 分布（spec 第 2 节：const / uniform / curve；标量或三维）----
const fwlDV = (v, i) => Array.isArray(v) ? +v[Math.min(i, v.length - 1)] || 0 : +v || 0;
function fwlDRange(d, i = 0) {
  if (!d || typeof d !== 'object') return [0, 0];
  if ('const' in d) { const v = fwlDV(d.const, i); return [v, v]; }
  if (Array.isArray(d.uniform)) { const a = fwlDV(d.uniform[0], i), b = fwlDV(d.uniform[1], i); return [Math.min(a, b), Math.max(a, b)]; }
  if (Array.isArray(d.curve) && d.curve.length) { const vs = d.curve.map(k => fwlDV(k[1], i)); return [Math.min(...vs), Math.max(...vs)]; }
  return [0, 0];
}
function fwlDAt(d, u, i = 0) {
  if (!d || !Array.isArray(d.curve) || !d.curve.length) return fwlDRange(d, i);
  const ks = d.curve; if (u <= ks[0][0]) { const v = fwlDV(ks[0][1], i); return [v, v]; }
  for (let k = 1; k < ks.length; k++) if (u <= ks[k][0]) {
    const [t0, a] = ks[k - 1], [t1, b] = ks[k], w = t1 > t0 ? (u - t0) / (t1 - t0) : 1, v = fwlDV(a, i) + (fwlDV(b, i) - fwlDV(a, i)) * w; return [v, v];
  }
  const v = fwlDV(ks[ks.length - 1][1], i); return [v, v];
}
const fwlAbsMax = r => Math.max(Math.abs(r[0]), Math.abs(r[1]));
const fwlIvAdd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const fwlIvMul = (a, b) => { const xs = [a[0] * b[0], a[0] * b[1], a[1] * b[0], a[1] * b[1]]; return [Math.min(...xs), Math.max(...xs)]; };

// ---- 一个发射器：寿命内位置 / 速度包络 + 面片伸出多远 ----
// from：事件母粒子的 { pos, vel }（bUsePSysLocation = false 时子粒子在母粒子的位置出生）
function fwlReachOf(e, from = null) {
  const mods = (e.modules || []).filter(m => m && m.enabled !== false), rq = e.required || {}, unknown = [];
  let L = 0, lifeSeen = false; const p0 = [[0, 0], [0, 0], [0, 0]], v0 = [[0, 0], [0, 0], [0, 0]], acc = [[0, 0], [0, 0], [0, 0]];
  let drag = [0, 0], volAbs = null, volMul = [], sx = 0, sy = 0, mx = 1, my = 1, lockZ = false;
  for (const m of mods) {
    if (!FWL_RULES_MOVE.has(m.m) && !FWL_RULES_INERT.has(m.m)) { unknown.push(m.m); continue; }
    if (m.m === 'Lifetime') { L += Math.max(0, fwlDRange(m.Lifetime)[1]); lifeSeen = true; }
    else if (m.m === 'InitialSize') { sx = Math.max(sx, fwlAbsMax(fwlDRange(m.StartSize, 0))); sy = Math.max(sy, fwlAbsMax(fwlDRange(m.StartSize, 1))); }
    else if (m.m === 'SizeByLife') {
      const d = m.LifeMultiplier; if (m.MultiplyX !== false) mx *= fwlAbsMax(fwlDRange(d, 0)); if (m.MultiplyY !== false) my *= fwlAbsMax(fwlDRange(d, 1));
    }
    else if (m.m === 'InitialLocation') for (let i = 0; i < 3; i++) p0[i] = fwlIvAdd(p0[i], fwlDRange(m.StartLocation, i));
    else if (m.m === 'SphereLocation') {
      const R = fwlAbsMax(fwlDRange(m.StartRadius)), vs = m.Velocity ? fwlAbsMax(fwlDRange(m.VelocityScale)) : 0;
      for (let i = 0; i < 3; i++) { p0[i] = fwlIvAdd(p0[i], fwlIvAdd([-R, R], m.StartLocation ? fwlDRange(m.StartLocation, i) : [0, 0])); v0[i] = fwlIvAdd(v0[i], [-R * vs, R * vs]); }
    }
    else if (m.m === 'InitialVelocity') {
      const vr = m.StartVelocityRadial ? fwlAbsMax(fwlDRange(m.StartVelocityRadial)) : 0;
      for (let i = 0; i < 3; i++) v0[i] = fwlIvAdd(v0[i], fwlIvAdd(m.StartVelocity ? fwlDRange(m.StartVelocity, i) : [0, 0], [-vr, vr]));
    }
    else if (m.m === 'VelocityOverLife') { if (m.Absolute) volAbs = m.VelOverLife; else volMul.push(m.VelOverLife); }
    else if (m.m === 'Drag') { const k = fwlDRange(m.DragCoefficientRaw); drag = [drag[0] + Math.max(0, k[0]), drag[1] + Math.max(0, k[1])]; }
    else if (m.m === 'ConstAcceleration') { const a = Array.isArray(m.Acceleration) ? m.Acceleration : [0, 0, 0]; for (let i = 0; i < 3; i++) acc[i] = fwlIvAdd(acc[i], [+a[i] || 0, +a[i] || 0]); }
    else if (m.m === 'Acceleration') for (let i = 0; i < 3; i++) acc[i] = fwlIvAdd(acc[i], fwlDRange(m.Acceleration, i));
    else if (m.m === 'OrientationAxisLock') lockZ = /Z/.test(String(m.flags || ''));
    else if (m.m === 'EventReceiverSpawn' && from) {
      if (!m.bUsePSysLocation) for (let i = 0; i < 3; i++) p0[i] = fwlIvAdd(p0[i], from.pos[i]);
      if (m.bInheritVelocity) for (let i = 0; i < 3; i++) v0[i] = fwlIvAdd(v0[i], fwlIvMul(from.vel[i], fwlDRange(m.InheritVelocityScale, i)));
    }
  }
  if (!lifeSeen || !(L > 0)) L = Math.max(+rq.duration_s || 0, 1);     // 寿命 0 = 不死：按发射器时长估
  // 重力等加速度世界固定：本地 = a ÷ 组件缩放（缩放两端都算，取并集）
  const [s0, s1] = FWL_RULES.scale, accL = acc.map(([a, b]) => { const xs = [a / s0, a / s1, b / s0, b / s1]; return [Math.min(...xs), Math.max(...xs)]; });
  // Velocity/Life 不是 Absolute：每帧速度 = 基础速度 × 曲线（不累乘），按曲线全程范围放大包络
  if (volMul.length) for (let i = 0; i < 3; i++) { let f = [1, 1]; for (const d of volMul) f = fwlIvMul(f, fwlDRange(d, i));
    v0[i] = fwlIvMul(v0[i], f); accL[i] = fwlIvMul(accL[i], f); }
  const pos = p0.map(r => [...r]), vel = v0.map(r => [...r]), n = FWL_RULES.steps;
  const ks = drag[0] === drag[1] ? [drag[0]] : [drag[0], (drag[0] + drag[1]) / 2, drag[1]];
  const grow = (box, i, lo, hi) => { if (lo < box[i][0]) box[i][0] = lo; if (hi > box[i][1]) box[i][1] = hi; };
  if (volAbs) {     // 速度直接取曲线（Absolute）：位置 = 出生位置 + ∫ 曲线速度；加速度不起作用
    for (let i = 0; i < 3; i++) { let lo = 0, hi = 0, prev = fwlDAt(volAbs, 0, i);
      for (let s = 1; s <= n; s++) { const u = s / n, cur = fwlDAt(volAbs, u, i), dt = L / n; lo += (prev[0] + cur[0]) / 2 * dt; hi += (prev[1] + cur[1]) / 2 * dt; prev = cur;
        grow(pos, i, p0[i][0] + lo, p0[i][1] + hi); grow(vel, i, cur[0], cur[1]); } }
  } else for (const k of ks) for (let s = 1; s <= n; s++) {
    // 线性阻力 k、常加速度 a：x = x0 + v0·F + a·G，F = (1 − e^(−kt)) / k，G = (t − F) / k（k → 0：F = t，G = t² / 2）；F、G ≥ 0，取两端即包络
    const t = L * s / n, F = k > 1e-9 ? (1 - Math.exp(-k * t)) / k : t, G = k > 1e-9 ? (t - F) / k : t * t / 2, E = Math.exp(-k * t);
    for (let i = 0; i < 3; i++) { grow(pos, i, p0[i][0] + v0[i][0] * F + accL[i][0] * G, p0[i][1] + v0[i][1] * F + accL[i][1] * G);
      grow(vel, i, Math.min(v0[i][0] * E, v0[i][1] * E) + accL[i][0] * F, Math.max(v0[i][0] * E, v0[i][1] * E) + accL[i][1] * F); }
  }
  // 面片：Pivot Offset 把面片中心挪开 (0.5 + px)·w、(−0.5 − py)·h；角点最远 = 中心偏移 + 半宽 / 半高
  const pv = Array.isArray(rq.pivot_offset) ? rq.pivot_offset : [-0.5, -0.5], w = sx * mx, h = (rq.screen_alignment === 'Square' ? sx * mx : sy * my);
  const cx = Math.abs(0.5 + (+pv[0] || 0)) + 0.5, cz = -0.5 - (+pv[1] || 0);
  const r = Math.hypot(cx * w, (Math.abs(cz) + 0.5) * h);
  const box = pos.map(([lo, hi]) => [lo - r, hi + r]);
  if (lockZ) { const rh = cx * w; box[0] = [pos[0][0] - rh, pos[0][1] + rh]; box[1] = [pos[1][0] - rh, pos[1][1] + rh]; box[2] = [pos[2][0] + (cz - 0.5) * h, pos[2][1] + (cz + 0.5) * h]; }
  return { box, pos, vel, unknown };
}

// 整份配置的固定包围盒（cm）；事件链按生成器 → 接收器顺序传位置 / 速度
function fwlBoundsOf(j) {
  const ems = (j.emitters || []).filter(e => e && e.enabled !== false), reach = new Map(), unknown = new Set();
  const evKey = (t, n) => t + ':' + n, gens = new Map();
  for (const e of ems) for (const m of e.modules || []) if (m.m === 'EventGenerator') for (const v of m.Events || []) gens.set(evKey(v.Type, v.CustomName), e);
  const parentOf = e => { const m = (e.modules || []).find(q => q.m === 'EventReceiverSpawn'); return m ? gens.get(evKey(m.EventGeneratorType, m.EventName)) || null : null; };
  const solve = (e, depth = 0) => {
    if (reach.has(e)) return reach.get(e);
    const p = depth < ems.length ? parentOf(e) : null, from = p && p !== e ? solve(p, depth + 1) : null;
    if ((e.modules || []).some(q => q.m === 'EventReceiverSpawn') && !from) unknown.add(e.name + '：事件来源找不到');
    const r = fwlReachOf(e, from); r.unknown.forEach(x => unknown.add(x)); reach.set(e, r); return r;
  };
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const e of ems) { const { box } = solve(e); for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], box[i][0]); hi[i] = Math.max(hi[i], box[i][1]); } }
  if (!ems.length || unknown.size) return { unknown: [...unknown] };
  const g = FWL_RULES.roundCm, m = FWL_RULES.margin;
  lo = lo.map(v => Math.floor((v - m * Math.abs(v)) / g + 1e-9) * g); hi = hi.map(v => Math.ceil((v + m * Math.abs(v)) / g - 1e-9) * g);     // 正好整 10 cm 的不再多推一格
  for (let i = 0; i < 3; i++) if (hi[i] - lo[i] < 2 * g) { lo[i] -= g; hi[i] += g; }
  return { min: lo, max: hi, unknown: [] };
}

// 方形大序列：序列材质、CPU、Rectangle、没锁轴、出生大小和 Size By Life 全程 X = Y
function fwlSquareSeq(e, mats) {
  const rq = e.required || {}, mat = mats[e.material] || {};
  if (e.gpu || mat.role !== 'flipbook_rgba' || !['Rectangle', 'FacingCameraPosition'].includes(rq.screen_alignment)) return false;     // 已是 FCP 的再过一遍结果不变
  const ms = e.modules || [], eq = (a, b) => Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));
  if (ms.some(m => m.m === 'OrientationAxisLock')) return false;
  const sq = d => { if (!d) return true; const xs = 'const' in d ? [d.const] : Array.isArray(d.uniform) ? d.uniform : Array.isArray(d.curve) ? d.curve.map(k => k[1]) : null;
    return !!xs && xs.every(v => Array.isArray(v) ? eq(+v[0], +v[1]) : true); };
  const size = ms.filter(m => m.m === 'InitialSize');
  if (!size.length || !size.every(m => sq(m.StartSize))) return false;
  return ms.filter(m => m.m === 'SizeByLife').every(m => (m.MultiplyX !== false) === (m.MultiplyY !== false) && sq(m.LifeMultiplier));
}

// 4.9.113 设计上左右不对称的配方（翻 U 会改设计）：文字、扇 / 扫射、风 / 侧向初速、倾斜、尾缀侧倾、燃尽后气流、粒子图（喷口 / 全局气流）、多层里镜像的层
function fwlAsymReason(P, L) {
  if (L && L.mirror) return '这一层水平镜像';
  if (!P || typeof P !== 'object') return '';
  if (P.pattern === 'text') return '文字';
  if (P.type === 'fan' || P.type === 'barrage' || (P.pattern === 'cluster' && P.clusterLayout === 'fan')) return '扇 / 扫射';
  for (const [k, why] of [['wind', '风'], ['shellVx', '侧向初速'], ['tilt', '倾斜'], ['rtLean', '尾缀侧倾'], ['sparkLateWind', '燃尽后气流'], ['rtLateWind', '燃尽后气流'], ['clusterSweep', '簇依次出膛']])
    if (+P[k]) return why;
  if (P.sparkGraph) return '粒子图（喷口方向 / 气流）';
  return '';
}
// recipes：[{ P, L }]，导出这份包用到的配方（单层 1 个、多层每层 1 个）；不知道（null）就按「拿不准」处理
function fwlRecipesAsym(recipes) {
  if (!Array.isArray(recipes) || !recipes.length) return '不知道导出的配方（拿不准按 None）';
  for (const x of recipes) { const why = fwlAsymReason(x && x.P, x && x.L); if (why) return why; }
  return '';
}
// 导出任务（60_export.js captureExportJob）里的配方：单层 = 当前参数；多层 = 每层的配方 + 层（镜像）
function fwlJobRecipes(job) {
  if (!job) return null;
  if (job.kind === 'combo') return (job.entries || []).map((e, i) => ({ P: e && e.P, L: (job.layers || [])[i] || null }));
  return job.P ? [{ P: job.P, L: null }] : null;
}
// UV Flipping：
//   · 有事件生成 / 接收关系的 → None；配方设计上左右不对称的 → 全部 None；
//   · 序列 / 单束发射器：系统里只有它一张带画面的贴图、其余都是开花闪光那种原地单颗圆点 → RandomFlipUOnly；
//     同一系统还有别的序列 / 单束 / 光点 / 粒子（同一模拟拆的层、尾缀接力、和贴图对位的点）→ None（翻了画面就和它们对不上）；
//   · 圆点类（soft_dot / glow，自己的贴图是圆的，翻 U 不挪位置）→ RandomFlipUOnly。
function fwlUvFlip(j, asym) {
  const ems = (j.emitters || []).filter(e => e && e.enabled !== false), mats = j.materials || {}, out = new Map();
  const isSeq = e => FWL_SEQ_ROLES.has((mats[e.material] || {}).role);
  const isEvent = e => (e.modules || []).some(m => m.m === 'EventGenerator' || m.m === 'EventReceiverSpawn');
  const still = e => { const ms = e.modules || [], n = ((e.spawn && e.spawn.bursts) || []).reduce((a, q) => a + (+q[1] || 0), 0);
    return !isSeq(e) && !(e.spawn && e.spawn.rate && fwlDRange(e.spawn.rate)[1] > 0) && n <= 1 && !ms.some(m => ['InitialVelocity', 'SphereLocation', 'VelocityOverLife', 'ConstAcceleration', 'Acceleration'].includes(m.m)); };
  const seqs = ems.filter(isSeq), alone = seqs.length === 1 && ems.every(e => e === seqs[0] || still(e));
  for (const e of ems) out.set(e, asym || isEvent(e) ? 'None' : isSeq(e) ? (alone ? 'RandomFlipUOnly' : 'None') : 'RandomFlipUOnly');
  return out;
}

// 给「Cascade 参数」说明补的一段（最终值，和 cascade.json 一致）
function fwlRulesText(f, j) {
  const b = j.system && j.system.fixed_bounds, rr = j.resource_rules || {}, ems = (j.emitters || []).filter(e => e && e.enabled !== false);
  return [`【资源规范四项 · ${String(f).replace(/^.*\//, '')}】（4.9.113 出包时补，以 cascade.json 为准）`,
    `  固定包围盒（Fixed Relative Bounding Box，组件本地 cm）：${b ? `Min (${b.min.join(', ')})  Max (${b.max.join(', ')})` : rr.fixed_bounds}`,
    `  Screen Alignment：${ems.map(e => `${e.name} = ${e.required && e.required.screen_alignment}`).join('；')}`,
    `  UV Flipping Mode：${ems.map(e => `${e.name} = ${e.required && e.required.uv_flip}`).join('；')}${rr.uv_flip_none_reason ? `（None 原因：${rr.uv_flip_none_reason}）` : ''}`,
    `  EmissiveDissolve：${(rr.emissive_dissolve || []).length ? rr.emissive_dissolve.map(k => `${k} = ${FWL_RULES.emissiveDissolve}`).join('；') : '—（没有序列 / 单束材质）'}`].join('\n');
}
// 出包前调用（packFinalize）：就地改 j，返回 j。o.recipes 见 fwlRecipesAsym
function fwlApplyResourceRules(j, o = {}) {
  if (!j || typeof j !== 'object' || !Array.isArray(j.emitters)) return j;
  const mats = j.materials || {}, ems = j.emitters.filter(e => e && e.enabled !== false), fcp = [];
  for (const e of ems) if (fwlSquareSeq(e, mats)) { e.required.screen_alignment = 'FacingCameraPosition'; fcp.push(e.name); }
  const asym = fwlRecipesAsym(o.recipes), flip = fwlUvFlip(j, asym);
  for (const e of ems) (e.required = e.required || {}).uv_flip = flip.get(e);
  const dissolve = [];
  for (const [k, m] of Object.entries(mats)) if (m && FWL_SEQ_ROLES.has(m.role)) { m.emissive_dissolve = FWL_RULES.emissiveDissolve; dissolve.push(k); }
  const b = fwlBoundsOf(j);
  if (b.min) j.system = { ...(j.system || {}), fixed_bounds: { min: b.min, max: b.max } };
  j.resource_rules = { format: FWL_RULES.format, margin: FWL_RULES.margin, scale: [...FWL_RULES.scale], round_cm: FWL_RULES.roundCm,
    fixed_bounds: b.min ? '寿命内位置包络 + 面片角点 + Pivot + 10 %（导演倾斜未计入）' : '没写：' + b.unknown.join('、') + '（导入器照旧 ±1000 m）',
    facing_camera_position: fcp, uv_flip_none_reason: asym || undefined, emissive_dissolve: dissolve };
  return j;
}
