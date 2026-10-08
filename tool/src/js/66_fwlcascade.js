// =====================================================================
//  引擎素材包：cascade.json（格式 fwl.cascade/1，见 spec/cascade_params_v1.md）
//  一个效果一个目录 <效果名>/，里面是 cascade.json + 它引用的贴图；文件名固定（T_<效果名>…），不带日期 / 版本 / 格子。
//  只写 Cascade 通用参数：材质写「角色」，动态参数写「角色」，不写项目资产路径和材质名（由本机导入工具按私有配置对应）。
//  PC 与手机各一份：cascade.json（PC）、cascade_mobile.json（手机）。大面片母版、尾缀都是单粒子，两份都是 CPU（gpu:false）；
//  以后的纯粒子层（点灭星、火花）PC 写 gpu:true、手机写 false。
// =====================================================================
const FWL_FORMAT = 'fwl.cascade/1';
const r4 = v => +(+v).toFixed(4), r2 = v => +(+v).toFixed(2), r1 = v => +(+v).toFixed(1);
// 帧号曲线：最后一个值必须小于总帧数（超过会从头循环，spec 第 6 节），写成「总帧数 − 0.01」
function fwlFrameKeys(keys, F) { return keys.map(([u, v]) => [r4(u), r2(Math.min(v, F - 0.01))]); }
function fwlColor(M, D, t0, gain) { return colorKeys(M, D, t0).map(([u, c]) => [r4(u), c.map(x => r4(x * gain))]); }

function fwlMaster(name, b, M, mobile) {
  const textures = {}, materials = {}, emitters = [];
  for (let s = b, i = 0; s; s = s.next, i++) {
    const seg = bakeSegmentName(b,i), m = s.meta, L = m.L, key = seg ? 'seq' + seg : 'seq';
    const tex = TN(name, seg), cut = TN(name, joinPart(seg, 'Cutout'));
    textures[key] = { file: tex + '.png', class: 'flipbook', cols: L.cols, rows: L.rows, channels: L.chans, frames: L.F };
    textures['cutout' + seg] = { file: cut + '.png', class: 'cutout' };
    // 4.3（D9①）：分开输出时贴图文件是 …_Head / …_Tail；cascade.json 引用 Head（星头层），火花层另起一个发射器引用 Tail（两个发射器除贴图和颜色外相同）
    if (s.tail) { textures[key].file = TN(name, joinPart(seg, 'Head')) + '.png'; textures[key + 'Tail'] = { ...textures[key], file: TN(name, joinPart(seg, 'Tail')) + '.png' }; }
    const mk = seg ? 'main' + seg : 'main';
    materials[mk] = { role: 'flipbook_rgba', textures: { main: key, ramp: 'ramp' }, scalars: { rows: L.rows, cols: L.cols } };
    // 入点前放大（用户 2026-10-02 选 B）：发射器从「第一次看得见」出生，前 pu 段寿命停在第 0 帧、Size By Life 从小放大到 1，之后照常
    const pre = i === 0 && m.pre && !m.zoom ? m.pre : null, life = m.duration + (pre ? pre.dur : 0), pu = pre ? pre.dur / life : 0;
    // 4.3（渲染基础问题 D8）：固定取景的爆点对齐改用 Pivot Offset（爆点在贴图里的位置），不再把面片往上挪 cy：
    // 面片总是面向相机，挪 InitialLocation Z 在仰视时爆点会偏 cy(1 − cosθ)，多层 cy 不同就错位。
    // 4.9.21（用户 10-06 21:51）：入点前放大也一律绕爆点（以前缺省绕面片中心：面片中心在爆点下面，花小时整朵偏下、放大时往上走）
    const pivot = !m.zoom && Math.abs(+m.cy || 0) > 1e-4;
    const mods = [
      { m: 'Lifetime', Lifetime: { const: r4(life) } },
      { m: 'InitialSize', StartSize: { const: [r1(m.Ww * 100), r1(m.Wh * 100), 1] } },
      { m: 'InitialLocation', StartLocation: { const: [0, 0, m.zoom || pivot ? 0 : r1(m.cy * 100)] } }
    ];
    if (m.zoom) mods.push({ m: 'SizeByLife', LifeMultiplier: { curve: m.sizeKeys.map(([u, v]) => [r4(u), [r4(v), r4(v), 1]]) }, MultiplyX: true, MultiplyY: true, MultiplyZ: false });
    if (pre) mods.push({ m: 'SizeByLife', preRoll: true, LifeMultiplier: { curve: [...pre.keys.map(([u, v]) => [r4(u * pu), [r4(v), r4(v), 1]]), [1, [1, 1, 1]]] }, MultiplyX: true, MultiplyY: true, MultiplyZ: false });
    const fk = pre ? [[0, 0], ...m.keys.map(([u, v]) => [pu + u * (1 - pu), v])] : m.keys;
    mods.push({ m: 'DynamicParameter', params: { frame: { curve: fwlFrameKeys(fk, L.F) } } });
    mods.push({ m: 'ColorOverLife', ColorOverLife: { curve: fwlColor(M, life, pre ? pre.from : m.t0 || 0, intOr1(M.headInt)) }, AlphaOverLife: { const: 1 } });
    if (s.tail) materials[mk + 'Tail'] = { role: 'flipbook_rgba', textures: { main: key + 'Tail', ramp: 'ramp' }, scalars: { rows: L.rows, cols: L.cols } };
    emitters.push({
      name: seg ? 'Main' + seg : 'Main', material: mk, gpu: false,
      required: { screen_alignment: 'Rectangle', duration_s: r4(life), loops: 1, delay_s: r4(pre ? pre.from : m.t0 || 0), cutout: 'cutout' + seg, max_draw_count: 1,
        ...(pivot ? { pivot_offset: [-0.5, r4(-0.5 - m.cy / m.Wh)] } : {}) },
      spawn: { rate: { const: 0 }, bursts: [[0, 1]] }, modules: mods,
      ...(pre ? { notes: [`入点前放大：出生后 ${r4(pre.dur)} s 停在第 0 帧、Size By Life 从 ${r4(pre.keys[0][1])} 放大到 1（绕爆点${pivot ? '：Pivot Offset 和没设入点时同一个，烟花实播对齐未经 UE 验证' : '：爆点就在面片中心'}），之后从入点 ${r4(m.t0)} s 照常播`] }
        : pivot ? { notes: ['固定取景：Pivot Offset 把爆点放在粒子位置（面片中心比爆点高 ' + r1(m.cy) + ' m），仰视时也对得上；未经 UE 验证'] } : {})
    });
    if (s.tail) { const e0 = emitters[emitters.length - 1];
      emitters.push({ ...e0, name: e0.name + 'Tail', material: mk + 'Tail',
        modules: e0.modules.map(q => q.m === 'ColorOverLife' ? { ...q, ColorOverLife: { curve: fwlColor(M, life, pre ? pre.from : m.t0 || 0, intOr1(M.tailInt)) } } : q),
        notes: [...(e0.notes || []), '星头、火花分开输出：这是火花层（…_Tail 贴图），除贴图和颜色外和星头层相同'] }); }
  }
  textures.ramp = { file: TN(name, 'Ramp') + '.png', class: 'ramp' };
  return { textures, materials, emitters, system: { preview_distance_cm: Math.round(Math.max(30000, b.meta.Ww * 100 * 1.3)), preview_warmup_s: 1.2 } };
}

function fwlTrail(name, b, M, mobile) {
  const m = b.meta, P = b.P, f = m.fit, T = m.T, L = m.L, F = L.F, last = m.sizeKeysRise[m.sizeKeysRise.length - 1][1];
  const fade = (b.fades || []).find(x => x.fps === 30) || (b.fades || [])[0];
  const pivotY = r4(-(1 - m.hb));
  const textures = {
    loop: { file: TN(name, 'Loop') + '.png', class: 'flipbook', cols: L.cols, rows: L.rows, channels: L.chans, frames: F },
    cutoutLoop: { file: TN(name, 'Loop_Cutout') + '.png', class: 'cutout' },
    ramp: { file: TN(name, 'Ramp') + '.png', class: 'ramp' }
  };
  const materials = { loop: { role: 'beam_flipbook', textures: { main: 'loop', ramp: 'ramp' }, scalars: { rows: L.rows, cols: L.cols } } };
  const col = fwlColor(M, T, 0, P.trBright);
  const emitters = [{
    name: 'RiseLoop', material: 'loop', gpu: false,
    required: { screen_alignment: 'Velocity', duration_s: r4(T), loops: 1, delay_s: 0, cutout: 'cutoutLoop', max_draw_count: 1, pivot_offset: [-0.5, pivotY] },
    spawn: { rate: { const: 0 }, bursts: [[0, 1]] },
    modules: [
      { m: 'Lifetime', Lifetime: { const: r4(T) } },
      { m: 'InitialSize', StartSize: { const: [r1(m.Ww * 100), r1(m.Wh * 100), 1] } },
      { m: 'InitialVelocity', StartVelocity: { const: [0, 0, r1(f.v0 * 100)] } },
      { m: 'Drag', DragCoefficientRaw: { const: r4(f.k) } },
      { m: 'ConstAcceleration', Acceleration: [0, 0, -981] },
      { m: 'SizeByLife', LifeMultiplier: { curve: m.sizeKeysRise.map(([u, v]) => [r4(u), [1, r4(v), 1]]) }, MultiplyX: true, MultiplyY: true, MultiplyZ: false },
      { m: 'DynamicParameter', params: { frame: { curve: fwlFrameKeys(sawKeys(m, T), F) } } },
      { m: 'ColorOverLife', ColorOverLife: { curve: col }, AlphaOverLife: { const: 1 } }
    ]
  }];
  if (fade) {
    const Df = F / fade.fps, k = 'fade' + fade.fps;
    textures[k] = { file: TN(name, 'Fade' + fade.fps) + '.png', class: 'flipbook', cols: L.cols, rows: L.rows, channels: L.chans, frames: F };
    textures['cutoutFade' + fade.fps] = { file: TN(name, `Fade${fade.fps}_Cutout`) + '.png', class: 'cutout' };
    materials[k] = { role: 'beam_flipbook', textures: { main: k, ramp: 'ramp' }, scalars: { rows: L.rows, cols: L.cols } };
    emitters.push({
      name: 'Fade' + fade.fps, material: k, gpu: false,
      required: { screen_alignment: 'Velocity', duration_s: r4(Df), loops: 1, delay_s: r4(T), cutout: 'cutoutFade' + fade.fps, max_draw_count: 1, pivot_offset: [-0.5, pivotY] },
      spawn: { rate: { const: 0 }, bursts: [[0, 1]] },
      modules: [
        { m: 'Lifetime', Lifetime: { const: r4(Df) } },
        { m: 'InitialLocation', StartLocation: { const: [0, 0, r1(f.H * 100)] } },
        { m: 'InitialVelocity', StartVelocity: { const: [0, 0, 1] } },
        { m: 'InitialSize', StartSize: { const: [r1(m.Ww * 100), r1(m.Wh * last * 100), 1] } },
        { m: 'DynamicParameter', params: { frame: { curve: [[0, 0], [1, r2(F - 0.01)]] } } },
        { m: 'ColorOverLife', ColorOverLife: { curve: fwlColor(M, Df, T, P.trBright) }, AlphaOverLife: { const: 1 } }     // 4.3（D9②）：消散段的颜色按开花以后 [T, T + Df] 取（以前用了上升段的）
      ]
    });
  }
  return { textures, materials, emitters, system: { preview_distance_cm: 30000, preview_warmup_s: 0 },
    notes: [`消散默认用 ${fade ? fade.fps : 30} fps 版；另有 ${(b.fades || []).filter(x => x !== fade).map(x => x.fps + ' fps').join('、') || '—'} 版贴图（${TN(name, 'Fade20')}.png），换贴图并把消散发射器的时长改成 ${F} ÷ 20 = ${r2(F / 20)} s`,
      'pivot_offset 是 Required 里的 Pivot Offset（星头在贴图里的位置），spec 里还没实测过这个字段'] };
}

// 4.3（渲染基础问题 D7）：「帧计划指纹」= 各发射器里决定「哪一刻播哪一帧、面片多大」的数（Lifetime、帧号曲线、Size By Life、Duration、Delay）的哈希。
// 只重新导入贴图之前比一下：指纹变了，说明这些数也变了，只换贴图会错帧，要按新的 cascade.json 改粒子（或用本地的合入对比）
function fwlPlanSig(emitters) {
  const pick = e => [e.name, e.required && [e.required.duration_s, e.required.delay_s], (e.modules || []).filter(m => ['Lifetime', 'DynamicParameter', 'SizeByLife'].includes(m.m))];
  const s = JSON.stringify((emitters || []).map(pick)); let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
// 4.9.24（用户 10-07 09:20「颜色倍增给我都加上去吧，Scale Color/Life这个」）：每个发射器最后加一个 Scale Color/Life（RGB 1、Alpha 1 = 烘焙器口径），
// 在 UE 里改这一个数就能整体调亮调暗、调透明度，不用动 Color Over Life 的曲线。所有 cascade.json（单层、多层、单束包）出口都过这里。
const FWL_SCALE_NOTE = '整体亮度 / 透明度倍增：在 UE 里改这里（1 = 烘焙器口径），不用动 Color Over Life';
function fwlFinish(emitters) {
  for (const e of emitters || []) { const ms = e.modules || (e.modules = []);
    if (!ms.some(q => q.m === 'ColorScaleOverLife')) ms.push({ m: 'ColorScaleOverLife', ColorScaleOverLife: { const: [1, 1, 1] }, AlphaScaleOverLife: { const: 1 }, note: FWL_SCALE_NOTE }); }
  return emitters;
}
// 返回 null 表示这种产物还没有 cascade.json（单元序列、地面循环、上升星头循环：参数表照旧）
function fwlCascade(name, b, M, mobile = false) {
  const body = b.form === 'emitset' ? fwlEmitSet(name, b, M, mobile) : b.form === 'trail' ? fwlTrail(name, b, M, mobile) : (b.form === 'master' || b.form === 'segments') ? fwlMaster(name, b, M, mobile) : null;
  if (!body) return null;
  return {
    format: FWL_FORMAT, name, platform: mobile ? 'mobile' : 'pc',
    source: { tool: '烟花母版烘焙器 ' + VERSION, type: b.P.type, form: b.form, quality: b.meta.quality ? { ss: b.meta.quality.ss, hz: b.meta.quality.hz } : undefined, plan_sig: fwlPlanSig(body.emitters) },
    textures: body.textures, materials: body.materials, system: body.system, emitters: fwlFinish(body.emitters),
    notes: body.notes
  };
}
// 素材包里 cascade.json / cascade_mobile.json 两个文件（目录前缀由调用方加）
function fwlFiles(name, b, M, mobileBake=null) {
  const pc = fwlCascade(name, b, M, false); if (!pc) return [];
  const mob = fwlCascade(mobileBake?name+'_Mobile':name, mobileBake||b, M, true);
  return [['cascade.json', utf8(JSON.stringify(pc, null, 1))], ['cascade_mobile.json', utf8(JSON.stringify(mob, null, 1))]];
}

// ---- 4.9.31 导出缩放（用户 10-07 14:56「导出可以让我选0.5/0.8/1这样」）----
// cascade.json 里所有「长度」× k：面片大小（X / Y）、出生位置、球面半径、初速、按寿命的速度、加速度、预览距离；时间、帧号、颜色、Size By Life 倍数、阻力（1/s）不变。
// 球面放射的 VelocityScale 是「初速 ÷ 半径」，半径 × k 以后初速自动 × k，不用动。同一个效果等比缩小，播放快慢一样。
const exportScaleOf = P => { const k = +(P && P.exportScale); return k > 0 && k < 1 ? k : 1; };
// 4.9.32 升空尾缀「升空高度：不变」（用户 16:15「缩小到0.8/0.5，升空的高度还是之前正确的吗？」→ 16:2x「两种都要，导出时选」）：
// 只缩粗细——序列面片只缩宽、软圆点 / 线状火花缩大小、随机散开缩；位置、弹道、加速度、时间不动，升空高度和尾长照旧
const exportKeepOf = P => !!P && exportScaleOf(P) < 1 && P.exportScaleRise === 'keep' && (isEmit(P) || isTrail(P));
const exportScaleSfx = (k, keep) => k === 1 ? '' : (keep ? '_W' : '_S') + Math.round(k * 100);
function fwlScaleJSON(j, k, keep, spec) {
  if (!j || (k === 1 && !spec)) return j;
  const R = x => +(x * k).toFixed(2), sv = (v, mask) => Array.isArray(v) ? v.map((x, i) => mask && !mask[i] ? x : R(x)) : R(v);
  const sd = (d, mask) => !d || typeof d !== 'object' ? d : 'const' in d ? { ...d, const: sv(d.const, mask) } : 'uniform' in d ? { ...d, uniform: d.uniform.map(v => sv(v, mask)) } : 'curve' in d ? { ...d, curve: d.curve.map(([t, v]) => [t, sv(v, mask)]) } : d;
  const XY = [1, 1, 0], X = [1, 0, 0];
  const seqSprite = e => (e.modules || []).some(m => m.m === 'DynamicParameter' && m.params && 'frame' in m.params);     // 带帧号的序列面片（循环层 / 远段 / 消散）
  for (const e of j.emitters || []) { const sq = keep && seqSprite(e); e.modules = (e.modules || []).map(m => {
    if (keep) switch (m.m) {     // 只缩粗细：序列面片只缩宽（Y = 沿尾迹的长度不变），别的面片缩 X / Y；标「随机散开」的初速、球面半径缩；其余不动
      case 'InitialSize': return { ...m, StartSize: sd(m.StartSize, sq ? X : XY) };
      case 'SphereLocation': return { ...m, StartRadius: sd(m.StartRadius) };
      case 'InitialVelocity': return /随机散开/.test(m.note || '') ? { ...m, StartVelocity: sd(m.StartVelocity) } : m;
      default: return m;
    }
    switch (m.m) {
      case 'InitialSize': return { ...m, StartSize: sd(m.StartSize, XY) };
      case 'InitialLocation': return { ...m, StartLocation: sd(m.StartLocation) };
      case 'SphereLocation': return { ...m, StartRadius: sd(m.StartRadius) };
      case 'InitialVelocity': return { ...m, StartVelocity: sd(m.StartVelocity) };
      case 'VelocityOverLife': return { ...m, VelOverLife: sd(m.VelOverLife) };
      case 'ConstAcceleration': return { ...m, Acceleration: Array.isArray(m.Acceleration) ? m.Acceleration.map(R) : sd(m.Acceleration) };
      case 'Acceleration': return { ...m, Acceleration: sd(m.Acceleration) };
      default: return m;
    }
  }); }
  if (!keep && j.system && j.system.preview_distance_cm) j.system.preview_distance_cm = Math.round(j.system.preview_distance_cm * k);
  if (spec) {     // 4.9.51 按尺寸标定：名字不加后缀（这就是这个效果的正式大小），写清用的哪一版、哪个规格、量出来多大
    j.export_scale = k; j.size_spec = { id: spec.id, name: spec.name, version: spec.version, what: spec.what, target_m: spec.target, measured_m: spec.measured, k };
    (j.notes = j.notes || []).push(`按尺寸标定 v${spec.version}「${spec.name}」：${spec.what === 'height' ? '开花高度' : '花径'} ${spec.target} m（原样 ${spec.measured} m）→ 所有长度 × ${k}，时间 / 帧号 / 贴图不变（用户 10-09 00:27「只改大小，其他都不变」；spec/尺寸标定.json）`);
    if (j.source && j.emitters) j.source.plan_sig = fwlPlanSig(j.emitters);
    return j;
  }
  j.name = (j.name || '') + exportScaleSfx(k, keep); j.export_scale = k; if (keep) j.export_scale_mode = 'keep_height';
  (j.notes = j.notes || []).push(keep
    ? `导出缩放 × ${k} · 升空高度不变（用户 10-07 16:15 / 16:2x）：只缩粗细——序列面片（循环层 / 远段 / 消散）Initial Size 只 X × ${k}、软圆点 / 线状火花 Initial Size × ${k}、随机散开的初速和球面半径 × ${k}；出生位置、弹道、加速度、时间、帧号不变 → 升空时间、高度、尾长和原样一样。粒子系统名加 ${exportScaleSfx(k, keep)}，贴图名不变、几档共用`
    : `导出缩放 × ${k}（用户 10-07 14:56）：所有长度（面片大小、位置、球面半径、速度、加速度）× ${k}，时间 / 帧号 / 贴图不变；粒子系统名加 ${exportScaleSfx(k)}，贴图名不变、几档共用${j.emitters && j.emitters.some(e => e.name === 'RiseLoop') ? `；升空尾缀的升空高度也 × ${k}` : ''}`);
  if (j.source && j.emitters) j.source.plan_sig = fwlPlanSig(j.emitters);
  return j;
}
// 素材包文件里所有 cascade*.json 按缩放改；返回新的文件表
function scaleCascadeFiles(files, k, keep, spec) {
  if (k === 1 && !spec) return files; const dec = new TextDecoder();
  return files.map(([f, d]) => /(^|\/)cascade(_mobile|_low)?\.json$/.test(f) ? [f, utf8(JSON.stringify(fwlScaleJSON(JSON.parse(dec.decode(d)), k, keep, spec), null, 1))] : [f, d]);
}
// ---- 4.9.51 尺寸标定（用户 10-09 00:11「编排对话框……重新标定了所以烟花的大小尺寸，我希望每次你导出可以遵循最新的大小尺寸去导出到cascade」，
//   00:27「烘培器会自动读不用我每次选择吧？」「只改大小，其他都不变」）：spec/尺寸标定.json（编排对话框维护）→ tool/data/size_spec.js（window.SIZE_SPEC）。
//   导出时按 map 找到这个效果的规格：倍数 = 目标花径 ÷ 这个效果实际花径（升空尾缀用开花高度），走上面同一套 fwlScaleJSON（所有长度 × 倍数，时间不变）。
//   不在 map 里 / 表缺了 = 照旧（手动的导出缩放还管用）。交付清单可以换成同一个效果的另一个规格，或这次不按标定（存在这台电脑，本机任务一律按表的第一个）
const sizeSpecTable = () => { const T = typeof window !== 'undefined' ? window.SIZE_SPEC : null; return T && T.specs && T.map ? T : null; };
function sizeSpecKeyNow() {
  const ef = typeof lib !== 'undefined' && lib.effect ? lib.effect.key : '', rv = typeof lib !== 'undefined' && lib.review ? lib.review.id : '';
  let wk = ''; try { wk = typeof wbKey === 'function' ? wbKey() : ''; } catch (e) { }
  let key = ef || (/^ef:/.test(wk) ? wk.slice(3) : '');
  if (!key && rv && typeof effectOfEntry === 'function') { try { const x = effectOfEntry(lib.review); key = x ? x.key : ''; } catch (e) { } }     // 本机导出任务只开条目（openReview 不带效果）
  return { key, entry: rv };
}
function sizeSpecIds(key, entry) { const T = sizeSpecTable(); if (!T) return []; for (const k of [key, entry].filter(Boolean)) { const v = T.map[k]; if (v) return (Array.isArray(v) ? v : [v]).filter(id => T.specs[id]); } return []; }
const sizeSpecPicks = () => { try { return (typeof store !== 'undefined' && store.get('sizeSpecPick', {})) || {}; } catch (e) { return {}; } };
function sizeSpecFor(key, entry, useStore = true) {
  const T = sizeSpecTable(), ids = sizeSpecIds(key, entry); if (!T || !ids.length) return null;
  const pick = useStore ? sizeSpecPicks()[key || entry] : ''; if (pick === 'none') return { off: true, ids, version: T.version };
  const id = ids.includes(pick) ? pick : ids[0]; return { id, ids, version: T.version, ...T.specs[id] };
}
const _sizeOf = new Map();
// 这个效果现在多大：空中花型 = 花径（metricsOf：开花最大时的水平直径），升空尾缀 = 开花高度（弹道 H）
function effectSizeOf(P) {
  if (!P) return null;
  if (isEmit(P) || isTrail(P)) { const b = typeof rtBallistic === 'function' ? rtBallistic(P) : null; return b && b.H > 0 ? { what: 'height', m: b.H } : null; }
  if (familyOf(P.type) !== 'aerial') return null;
  let key = ''; try { const { exportScale, exportScaleRise, ...rest } = P; key = JSON.stringify(rest); } catch (e) { }     // 引擎回放每帧都问：按参数记一份（measure 每次返回拷贝，太贵）
  if (key && _sizeOf.has(key)) return _sizeOf.get(key);
  const mt = metricsOf(P, measure(P)), r = mt && mt.diameter > 0 ? { what: 'diameter', m: mt.diameter } : null;
  if (key) { _sizeOf.set(key, r); while (_sizeOf.size > 16) _sizeOf.delete(_sizeOf.keys().next().value); } return r;
}
// 多层：取最大的那层（花径 × 层缩放）
function comboSizeOf(layers) {
  let best = null;
  for (const L of layers || []) { const e = typeof layerEntryOf === 'function' ? layerEntryOf(L) : null, z = e && effectSizeOf(e.P); if (!z || z.what !== 'diameter') continue; const m = z.m * (+L.scale > 0 ? +L.scale : 1); if (!best || m > best.m) best = { what: 'diameter', m }; }
  return best;
}
// 规格 + 现在的大小 → 倍数（null = 不按标定）。扇形口径没定：返回 { skip } 说明原因
function sizeSpecScale(sp, sz) {
  if (!sp || sp.off || !sz) return null;
  if (sp.kind === 'fan') return { skip: '扇形的标定口径还没定（表里的 diameter 是两倍飞行长度），照原大导出', id: sp.id, name: sp.name, version: sp.version };
  const target = sz.what === 'height' ? +sp.burst_m : +sp.diameter_m; if (!(target > 0) || !(sz.m > 0)) return null;
  const k = +(target / sz.m).toFixed(4);
  return { id: sp.id, name: sp.name, version: sp.version, what: sz.what, target, measured: +sz.m.toFixed(1), k, warn: k > 1.3 ? `放大 × ${k.toFixed(2)}：贴图会被拉糊，建议「输出」里加大单格重烘` : '' };
}
function sizeSpecNow(P, keyObj) { const { key, entry } = keyObj || sizeSpecKeyNow(); const sp = sizeSpecFor(key, entry); const r = sp && sizeSpecScale(sp, effectSizeOf(P)); return r && !r.skip ? r : null; }
function sizeSpecCombo(layers, keyObj) { const { key, entry } = keyObj || sizeSpecKeyNow(); const sp = sizeSpecFor(key, entry); const r = sp && sizeSpecScale(sp, comboSizeOf(layers)); return r && !r.skip ? r : null; }
// 交付清单 / 输出栏一行：现在按哪个规格、多大、倍数
function sizeSpecLine(isCombo) {
  const T = sizeSpecTable(); if (!T) return '';
  const { key, entry } = sizeSpecKeyNow(), sp = sizeSpecFor(key, entry); if (!sp) return `尺寸标定 v${T.version}：这个效果没配规格（照原大导出；要配在 spec/尺寸标定.json 的 map 里加一行）`;
  if (sp.off) return `尺寸标定 v${T.version}：这次不按标定（照原大 / 手动导出缩放）`;
  const r = sizeSpecScale(sp, isCombo ? comboSizeOf(state.layers) : effectSizeOf(state.P)); if (!r) return `尺寸标定 v${T.version}「${sp.name}」：量不出这个效果的大小，照原大导出`;
  if (r.skip) return `尺寸标定 v${T.version}「${sp.name}」：${r.skip}`;
  return `尺寸标定 v${T.version}「${r.name}」：${r.what === 'height' ? '开花高度' : '花径'} ${r.target} m（原样 ${r.measured} m）→ 导出 × ${r.k}${r.warn ? ' · ⚠ ' + r.warn : ''}`;
}
// 导出时用哪个倍数：配了尺寸标定 = 按标定（不加后缀、手动的导出缩放不再管用）；没配 = 手动导出缩放（4.9.31）
function exportScalePlan(P, keyObj) {
  const sk = sizeSpecNow(P, keyObj); if (sk) return { k: sk.k, keep: false, spec: sk, sfx: '' };
  const k = exportScaleOf(P), kp = exportKeepOf(P); return { k, keep: kp, spec: null, sfx: exportScaleSfx(k, kp) };
}
