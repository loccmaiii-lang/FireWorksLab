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
const OUT_PC = [['seq', '序列（大面片）'], ['unit', '单束（每颗星一个面片，带尾巴）'], ['dots', 'GPU 光点（只出星头）'], ['off', '不出']], OUT_MOBILE = [['seq', '序列'], ['off', '不出']];
function layerOut(L) { const o = (L && L.out) || {}; return { pc: ['seq', 'unit', 'dots', 'off'].includes(o.pc) ? o.pc : 'seq', mobile: ['seq', 'off'].includes(o.mobile) ? o.mobile : 'seq' }; }
// 这个平台要出的层：[{ L, b, i（原层号）, dots, unit（PC 单束的那次烘焙，调用方给）}]
function comboEntries(layers, mobile) {
  const out = []; layers.forEach((x, i) => { const o = layerOut(x.L), s = mobile ? o.mobile : o.pc; if (s === 'off') return; out.push({ ...x, i, dots: !mobile && s === 'dots', unit: !mobile && s === 'unit' ? x.unit : undefined }); }); return out;
}
// 单束层（PC）：每颗星一个 Velocity 对齐的面片，贴图 = 一颗代表星的序列（星头 + 拖尾，bakeUnit），轨迹交给 Cascade（球面放射 + 线性阻力 + 恒定加速度，m.fit）。
// 和 65_cascade.js 的单元序列参数表同一套数；层的缩放 × 长度，时间倍率 ÷ 时间。CPU 发射器（GPU Sprites 对动态参数帧号的支持没在 UE 验证过）
function fwlUnit(name, b, M, L) {
  const m = b.meta, P = b.P, f = m.fit, r = +L.rate > 0 ? +L.rate : 1, sc = +L.scale > 0 ? +L.scale : 1, Du = m.duration, jit = clamp((+P.burnJit || 0) / 100, 0, 0.5), Lg = m.L, R = 10 * sc;
  const xy = (() => { const us = [...new Set([...m.sizeKeysX, ...m.sizeKeysY].map(k => +k[0]))].sort((a, c) => a - c); return us.map(u => [r4(u), [r4(evalKeys(m.sizeKeysX, u)), r4(evalKeys(m.sizeKeysY, u)), 1]]); })();
  return {
    textures: { seq: { file: TN(name) + '.png', class: 'flipbook', cols: Lg.cols, rows: Lg.rows, channels: Lg.chans, frames: Lg.F }, cutout: { file: TN(name, 'Cutout') + '.png', class: 'cutout' }, ramp: { file: TN(name, 'Ramp') + '.png', class: 'ramp' } },
    materials: { main: { role: 'beam_flipbook', textures: { main: 'seq', ramp: 'ramp' }, scalars: { rows: Lg.rows, cols: Lg.cols } } },
    emitter: {
      name: 'Unit', material: 'main', gpu: false,
      required: { screen_alignment: 'Velocity', duration_s: r4(Du * (1 + jit) / r + 0.1), loops: 1, delay_s: r4(+L.delay || 0), cutout: 'cutout', max_draw_count: Math.max(1, Math.round(+P.stars || 1)), pivot_offset: [-0.5, r4(-(1 - m.hb))] },
      spawn: { rate: { const: 0 }, bursts: [[0, Math.max(1, Math.round(+P.stars || 1))]] },
      modules: [
        { m: 'Lifetime', Lifetime: { uniform: [r4(Du * (1 - jit) / r), r4(Du * (1 + jit) / r)] } },
        { m: 'InitialSize', StartSize: { const: [r1(m.Ww * 100 * sc), r1(m.Wh * 100 * sc), 1] } },
        { m: 'SizeByLife', LifeMultiplier: { curve: xy }, MultiplyX: true, MultiplyY: true, MultiplyZ: false },
        { m: 'SphereLocation', StartRadius: { const: r1(R) }, VelocityScale: { const: r4(f.v0 * 100 * sc * r / R) }, SurfaceOnly: true, Velocity: true },
        { m: 'Drag', DragCoefficientRaw: { const: r4(f.k * r) } },
        { m: 'ConstAcceleration', Acceleration: [0, 0, r1(-f.a * 100 * sc * r * r)] },
        { m: 'DynamicParameter', params: { frame: { curve: fwlFrameKeys(m.keys, Lg.F) } } },
        { m: 'ColorOverLife', ColorOverLife: { curve: fwlColor(M, Du, 0, M.headInt || 1) }, AlphaOverLife: { const: 1 } }
      ],
      notes: [`单束：每颗星一个面片（${Math.round(+P.stars || 0)} 颗），贴图是一颗代表星的序列，轨迹由 Cascade 算（初速 ${r2(f.v0)} m/s、阻力 ${r4(f.k)}/s、下坠 ${r2(f.a)} m/s²）；Pivot Offset 把星头放在粒子位置（导入器待支持，未经 UE 验证）`]
    }
  };
}
// 光点层的轨迹：模拟里星是平方阻力，Cascade 只有线性 Drag。拿模拟测出的「星最远半径 r(t)」和「可见星的平均高度 y(t)」拟合
// r(t) = R0 + v/k·(1 − e^(−kt))、y(t) = −g/k·(t − (1 − e^(−kt))/k)，燃烧期（点火以后）权重 1，之前 0.2。
function dotFit(P, fm) {
  fm = fm || measure(P);
  const ign = +P.ignDelay || 0, burn = Math.max(0.05, +P.burn || 1), T = ign + burn, R0 = Math.max(0, +P.burstR0 || 0), sj = clamp((+P.speedJit || 0) / 100, 0, 0.5);
  const pr = (fm.prof || []).filter(q => q[0] > 0 && q[0] <= T + 1e-6), st = (fm.stat || []).filter(q => q.vis > 0 && q.t >= ign && q.t <= T);
  let best = null;
  for (let e = -2; e <= 1.6; e += 0.01) {
    const k = Math.pow(10, e); let sfr = 0, sff = 0;
    for (const [t, , r] of pr) { const w = t >= ign ? 1 : 0.2, f = (1 - Math.exp(-k * t)) / k; sfr += w * f * (r - R0); sff += w * f * f; }
    if (!(sff > 0)) continue;
    const v = Math.max(0, sfr / sff); let err = 0;
    for (const [t, , r] of pr) { const w = t >= ign ? 1 : 0.2; err += w * (R0 + v * (1 - Math.exp(-k * t)) / k - r) ** 2; }
    if (!best || err < best.err) best = { k, v, err };
  }
  if (!best) best = { k: G / Math.max(1, +P.vt || 20), v: +P.v0 || 50 };
  let sgz = 0, sgg = 0;
  for (const q of st) { const f = -(q.t - (1 - Math.exp(-best.k * q.t)) / best.k) / best.k; sgz += f * q.cy; sgg += f * f; }
  const g = sgg > 0 ? clamp(sgz / sgg, 0, 3 * G) : G * (+P.grav || 1);
  return { k: best.k, v: best.v / (1 + sj), sj, g, R0, ign, burn, T, jit: clamp((+P.burnJit || 0) / 100, 0, 0.5) };
}
// 一层星 → 一个 GPU 光点发射器。用粒子发射器组的数据格式（46_emitset.js，米、秒），同一份数据给「引擎回放」画、给 cascade.json 导出（看到的就是导出的）。
// 层的缩放 × 长度，时间倍率 ÷ 时间（速度 ×、阻力 ×、加速度 × 倍率²）；颜色 = 这一层的颜色 × 星头亮度，点火前和熄灭段用颜色压暗（加色，等于 Alpha）
// 每颗星什么时候亮、多亮（4.2.13，XD1 试导发现：鸿巢红点层是「第二段」——主段期间不发光，只按点火 + 燃烧算会从开花就亮）：
// 直接跑一遍模拟，记每颗星的星头亮度；寿命 = 每颗星最后亮着的时刻；亮度曲线 = 按「时刻 ÷ 这颗星的寿命」平均（延时点火、星头压暗、第二段、渐隐、熄灭前闪亮都在里面）
function dotVis(P) {
  const s = new Sim({ ...P, engine: 'gpu' }), n = Math.ceil(P.duration / H_STEP), rec = new Map();
  for (let i = 0; i < n; i++) {
    s.step(H_STEP); if (i % 12) continue;
    for (const st of s.stars) { if (!st.alive || st.kind === 5) continue; let q = rec.get(st); if (!q) rec.set(st, q = []); q.push([s.t, s.headI(st)]); }
  }
  const NB = 60, lives = [], bins = new Float64Array(NB), cnt = new Float64Array(NB);
  for (const q of rec.values()) {
    let b = 0; for (const [t, I] of q) if (I > 0) b = t; if (!(b > 0)) continue; lives.push(b);
    for (const [t, I] of q) { if (t > b) break; const k = Math.min(NB - 1, Math.floor(t / b * NB)); bins[k] += I; cnt[k]++; }
  }
  if (!lives.length) return null;
  lives.sort((a, c) => a - c);
  const prof = Array.from(bins, (v, k) => cnt[k] ? v / cnt[k] : 0), nz = prof.filter(v => v > 0).sort((a, c) => a - c), typ = nz.length ? nz[Math.floor(nz.length / 2)] : 1;
  const q = f => lives[Math.min(lives.length - 1, Math.floor(f * lives.length))];
  return { life: [q(0.1), q(0.9)], med: q(0.5), alpha: prof.map((v, k) => [+((k + 0.5) / NB).toFixed(4), clamp(v / typ, 0, 2.5)]) };
}
function dotsES(L, P, M, fm) {
  const f = dotFit(P, fm), v = dotVis(P), r = +L.rate > 0 ? +L.rate : 1, sc = +L.scale > 0 ? +L.scale : 1;
  const life = v ? [v.life[0] / r, v.life[1] / r] : [(f.ign + f.burn * (1 - f.jit)) / r, (f.ign + f.burn * (1 + f.jit)) / r];
  const T = v ? v.med : f.T, ak = v ? [[0, v.alpha[0][1]], ...v.alpha, [1, 0]] : [[0, 1], [1, 0]];
  const alpha = u => esCurve(ak, u);
  // 序列材质的色相来自 Ramp（灰度查表）× Color Over Life；软圆点没有 Ramp，星头亮核用 Ramp 亮端（中亮、亮两格的平均，线性）乘进颜色
  const rl = [M.ramp2, M.ramp3].filter(Boolean).map(hexToLin), rc = rl.length ? [0, 1, 2].map(j => rl.reduce((a, c) => a + c[j], 0) / rl.length) : [1, 1, 1];
  const gain = (+M.headInt || 1) * (+P.headBright || 1), ck = colorKeys(M, T, 0).map(([u, c]) => [u, c.map((x, j) => x * rc[j])]);
  const us = [...new Set([0, 1, ...ck.map(k => +k[0]), ...ak.map(k => +k[0])].map(u => +clamp(u, 0, 1).toFixed(4)))].sort((a, b) => a - b);
  const col = esThin(us.map(u => [u, esCurve(ck, u).map(c => +(c * gain * alpha(u)).toFixed(4))]), 0.01);
  const sz = Math.max(0.05, 1.7 * (+P.headSize || 1) * sc);
  return { name: 'Dots', gpu: true, delay: +L.delay || 0, duration: life[1] + 0.1, bursts: [[0, Math.max(1, Math.round(+P.stars || 1))]], life, size: [sz * 0.85, sz * 1.15], col,
    sphere: { r: f.R0 * sc, v: [f.v * (1 - f.sj) * sc * r, f.v * (1 + f.sj) * sc * r] }, drag: [f.k * r, f.k * r], accel: [0, 0, -f.g * sc * r * r], seed: ((+P.seed || 1) * 31 + 7) | 0, fit: f };
}
function fwlDots(L, P, M, fm) {
  const e = dotsES(L, P, M, fm), j = esFwlEmitter(e, false, 1), f = e.fit;
  return { ...j, notes: [`GPU 光点：这一层的星只出星头光点（${Math.round(+P.stars || 0)} 颗，球面放射），尾巴、闪烁、熄灭前闪亮不在里面；轨迹按模拟拟合成线性阻力（阻力 ${r4(f.k)}/s、等效重力 ${r2(f.g)} m/s²）；光点直径 = 炭头 × 1.7、颜色 = 这一层的颜色 × Ramp 亮端 × 炭头亮度，是起点，未经 UE 验证`] };
}
// 引擎回放画光点层：同一份数据，按层缓存出生表
function dotsTables(e, L) {
  const sig = JSON.stringify([L.scale, L.rate, L.delay, L.stages, L.xw, L.headInt, L.ramp2, L.ramp3, e.P]);
  if (e._dots && e._dots.sig === sig) return e._dots.tab;
  const ES = { emitters: [dotsES(L, e.P, comboLayerM(L), e.bake && e.bake.fm)] }; e._dots = { sig, tab: esSpawn(ES, 1) }; return e._dots.tab;
}
function fwlCombo(name, layers, mobile = false) {
  const out = { format: FWL_FORMAT, name, platform: mobile ? 'mobile' : 'pc',
    source: { tool: '烟花母版烘焙器 ' + VERSION, combo: true, layers: layers.map(({ L, b, dots, unit }) => ({ type: b.P.type, form: dots ? 'dots' : unit ? 'unit' : b.form, renderVer: renderVersion(b.P) })) },
    textures: {}, materials: {}, emitters: [], system: { preview_distance_cm: 30000, preview_warmup_s: 1.2 }, notes: [] };
  layers.forEach(({ L, b, i: li, dots, unit }, k) => {
    const i = li == null ? k : li, pre = `L${i + 1}_`;
    if (unit) {     // 4.2.13：PC 单束层
      const ln = comboLayerName(name, i), u = fwlUnit(ln, unit, comboLayerM(L), L);
      for (const [k2, v] of Object.entries(u.textures)) out.textures[pre + k2] = v;
      out.materials[pre + 'main'] = { ...u.materials.main, textures: { main: pre + 'seq', ramp: pre + 'ramp' } };
      out.emitters.push({ ...u.emitter, name: pre + 'Unit', material: pre + 'main', layer: i + 1, required: { ...u.emitter.required, cutout: pre + 'cutout' } });
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
  return out;
}
// 组合导出用的层烘焙：分开输出（星头 / 拖尾两张）的层在素材包里改成合并输出，和引擎材质（灰度查 Ramp）一致
async function comboLayerBakes(layers, onProg) {
  const out = [], own = [];
  for (let i = 0; i < layers.length; i++) {
    const L = layers[i], e = state.lib.find(x => x.name === L.lib);
    if (!e || !e.bake) throw new Error(`第 ${i + 1} 层「${L.lib}」还没有烘焙`);
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
function unitP(P0) { return { ...P0, form: 'unit', cols: 16, rows: 2, chans: 4, frameMode: 'auto', autoGrid: 1 }; }
async function layerUnitBake(e, onProg) {
  const sig = JSON.stringify(e.P);
  if (e.unitBake && e.unitBake.sig === sig) return e.unitBake.b;
  if (e.unitBake) { disposeBake(e.unitBake.b); e.unitBake = null; }
  const b = await bake(unitP(e.P), 1, onProg); e.unitBake = { sig, b }; return b;
}
async function comboPackFiles(name, layers, onProg) {
  const files = [], { layers: lb, own } = await comboLayerBakes(layers, p => onProg && onProg(p * 0.4));
  const mobiles = [], ownMobile = [];
  try {
    const units = [], mbs = [];
    for (let i = 0; i < lb.length; i++) {
      const { L, b, e } = lb[i], ln = comboLayerName(name, i), M = comboLayerM(L), o = layerOut(L);   // 4.2.12：每层的导出方案
      if (o.pc === 'seq' || (o.pc === 'unit' && !unitAllowed(b.P))) {     // 单束不适用的花型（千轮、分裂、蜂、非球形图案）按序列出
        files.push(...await texFiles(b, ln));
        files.push([`${TN(ln, 'Ramp')}.png`, await encodePNG(rampPixels(M), 256, 8)]);
      } else if (o.pc === 'unit') {
        const ub = units[i] = await layerUnitBake(e, p => onProg && onProg(0.4 + 0.1 * (i + p) / lb.length));
        files.push(...await texFiles(ub, ln));
        files.push([`${TN(ln, 'Ramp')}.png`, await encodePNG(rampPixels(M), 256, 8)]);
      }
      if (o.mobile === 'seq') {
        const mb = b.mobile || await bakeMobileFor(b, p => onProg && onProg(0.4 + 0.5 * (i + p) / lb.length));
        if (!b.mobile) ownMobile.push(mb);
        const mn = comboLayerName(name + '_Mobile', i);
        files.push(...await texFiles(mb, mn));
        files.push([`${TN(mn, 'Ramp')}.png`, await encodePNG(rampPixels(M), 256, 8)]);
        mobiles.push({ L, b: mb, i }); mbs[i] = mb;
      }
    }
    files.push(['cascade.json', utf8(JSON.stringify(fwlCombo(name, comboEntries(lb.map(({ L, b }, i) => ({ L, b, unit: units[i] })), false), false), null, 1))]);
    files.push(['cascade_mobile.json', utf8(JSON.stringify(fwlCombo(name + '_Mobile', mobiles, true), null, 1))]);
    // 命名规范（61_naming.js）：多层 = 礼花英文名 + 每层英文名
    if (lb.every(({ b }) => namingApplies(b))) {
      const ef = typeof lib !== 'undefined' ? lib.effect : null, key = typeof wbKey === 'function' ? wbKey() : name, nm = packNamesFor(key, ef, lb.length, name);
      return applyPackNaming(files, nm.base, lb.map(({ b, L }, i) => ({ ln: comboLayerName(name, i), mn: comboLayerName(name + '_Mobile', i), b: units[i] || b, mb: mbs[i] || b, layer: nm.layers[i], pcTex: !units[i] && layerOut(L).pc !== 'dots' && layerOut(L).pc !== 'off' })));
    }
    return files;
  } finally { own.forEach(disposeBake); ownMobile.forEach(disposeBake); }
}
