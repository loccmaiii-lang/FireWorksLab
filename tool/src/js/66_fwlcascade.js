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
    // 面片总是面向相机，挪 InitialLocation Z 在仰视时爆点会偏 cy(1 − cosθ)，多层 cy 不同就错位。入点前放大选「绕面片中心」时照旧（绕中心放大要中心在粒子上）。
    const pivot = pre ? pre.pivot : !m.zoom && Math.abs(+m.cy || 0) > 1e-4;
    const mods = [
      { m: 'Lifetime', Lifetime: { const: r4(life) } },
      { m: 'InitialSize', StartSize: { const: [r1(m.Ww * 100), r1(m.Wh * 100), 1] } },
      { m: 'InitialLocation', StartLocation: { const: [0, 0, m.zoom || pivot ? 0 : r1(m.cy * 100)] } }
    ];
    if (m.zoom) mods.push({ m: 'SizeByLife', LifeMultiplier: { curve: m.sizeKeys.map(([u, v]) => [r4(u), [r4(v), r4(v), 1]]) }, MultiplyX: true, MultiplyY: true, MultiplyZ: false });
    if (pre) mods.push({ m: 'SizeByLife', preRoll: true, LifeMultiplier: { curve: [...pre.keys.map(([u, v]) => [r4(u * pu), [r4(v), r4(v), 1]]), [1, [1, 1, 1]]] }, MultiplyX: true, MultiplyY: true, MultiplyZ: false });
    const fk = pre ? [[0, 0], ...m.keys.map(([u, v]) => [pu + u * (1 - pu), v])] : m.keys;
    mods.push({ m: 'DynamicParameter', params: { frame: { curve: fwlFrameKeys(fk, L.F) } } });
    mods.push({ m: 'ColorOverLife', ColorOverLife: { curve: fwlColor(M, life, pre ? pre.from : m.t0 || 0, M.headInt || 1) }, AlphaOverLife: { const: 1 } });
    if (s.tail) materials[mk + 'Tail'] = { role: 'flipbook_rgba', textures: { main: key + 'Tail', ramp: 'ramp' }, scalars: { rows: L.rows, cols: L.cols } };
    emitters.push({
      name: seg ? 'Main' + seg : 'Main', material: mk, gpu: false,
      required: { screen_alignment: 'Rectangle', duration_s: r4(life), loops: 1, delay_s: r4(pre ? pre.from : m.t0 || 0), cutout: 'cutout' + seg, max_draw_count: 1,
        ...(pivot ? { pivot_offset: [-0.5, r4(-0.5 - m.cy / m.Wh)] } : {}) },
      spawn: { rate: { const: 0 }, bursts: [[0, 1]] }, modules: mods,
      ...(pre ? { notes: [`入点前放大：出生后 ${r4(pre.dur)} s 停在第 0 帧、Size By Life 从 ${r4(pre.keys[0][1])} 放大到 1（${pivot ? '绕爆点：Pivot Offset，未经 UE 验证' : '绕面片中心'}），之后从入点 ${r4(m.t0)} s 照常播`] }
        : pivot ? { notes: ['固定取景：Pivot Offset 把爆点放在粒子位置（面片中心比爆点高 ' + r1(m.cy) + ' m），仰视时也对得上；未经 UE 验证'] } : {})
    });
    if (s.tail) { const e0 = emitters[emitters.length - 1];
      emitters.push({ ...e0, name: e0.name + 'Tail', material: mk + 'Tail',
        modules: e0.modules.map(q => q.m === 'ColorOverLife' ? { ...q, ColorOverLife: { curve: fwlColor(M, life, pre ? pre.from : m.t0 || 0, M.tailInt || 1) } } : q),
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
// 返回 null 表示这种产物还没有 cascade.json（单元序列、地面循环、上升星头循环：参数表照旧）
function fwlCascade(name, b, M, mobile = false) {
  const body = b.form === 'emitset' ? fwlEmitSet(name, b, M, mobile) : b.form === 'trail' ? fwlTrail(name, b, M, mobile) : (b.form === 'master' || b.form === 'segments') ? fwlMaster(name, b, M, mobile) : null;
  if (!body) return null;
  return {
    format: FWL_FORMAT, name, platform: mobile ? 'mobile' : 'pc',
    source: { tool: '烟花母版烘焙器 ' + VERSION, type: b.P.type, form: b.form, quality: b.meta.quality ? { ss: b.meta.quality.ss, hz: b.meta.quality.hz } : undefined, plan_sig: fwlPlanSig(body.emitters) },
    textures: body.textures, materials: body.materials, system: body.system, emitters: body.emitters,
    notes: body.notes
  };
}
// 素材包里 cascade.json / cascade_mobile.json 两个文件（目录前缀由调用方加）
function fwlFiles(name, b, M, mobileBake=null) {
  const pc = fwlCascade(name, b, M, false); if (!pc) return [];
  const mob = fwlCascade(mobileBake?name+'_Mobile':name, mobileBake||b, M, true);
  return [['cascade.json', utf8(JSON.stringify(pc, null, 1))], ['cascade_mobile.json', utf8(JSON.stringify(mob, null, 1))]];
}
