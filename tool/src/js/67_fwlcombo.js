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
function fwlCombo(name, layers, mobile = false) {
  const out = { format: FWL_FORMAT, name, platform: mobile ? 'mobile' : 'pc',
    source: { tool: '烟花母版烘焙器 ' + VERSION, combo: true, layers: layers.map(({ L, b }) => ({ type: b.P.type, form: b.form, renderVer: renderVersion(b.P) })) },
    textures: {}, materials: {}, emitters: [], system: { preview_distance_cm: 30000, preview_warmup_s: 1.2 }, notes: [] };
  layers.forEach(({ L, b }, i) => {
    const ln = comboLayerName(name, i), body = fwlMaster(ln, b, comboLayerM(L), mobile), pre = `L${i + 1}_`;
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
    if (b.tail || b.scale !== 1) {
      b = await bake({ ...libP(e.P, true), outMode: 'combined' }, 1, p => onProg && onProg((i + p) / layers.length));
      own.push(b);
    }
    out.push({ L, b, e });
  }
  return { layers: out, own };
}
async function comboPackFiles(name, layers, onProg) {
  const files = [], { layers: lb, own } = await comboLayerBakes(layers, p => onProg && onProg(p * 0.4));
  const mobiles = [], ownMobile = [];
  try {
    for (let i = 0; i < lb.length; i++) {
      const { L, b } = lb[i], ln = comboLayerName(name, i), M = comboLayerM(L);
      files.push(...await texFiles(b, ln));
      files.push([`${TN(ln, 'Ramp')}.png`, await encodePNG(rampPixels(M), 256, 8)]);
      const mb = b.mobile || await bakeMobileFor(b, p => onProg && onProg(0.4 + 0.5 * (i + p) / lb.length));
      if (!b.mobile) ownMobile.push(mb);
      const mn = comboLayerName(name + '_Mobile', i);
      files.push(...await texFiles(mb, mn));
      files.push([`${TN(mn, 'Ramp')}.png`, await encodePNG(rampPixels(M), 256, 8)]);
      mobiles.push({ L, b: mb });
    }
    files.push(['cascade.json', utf8(JSON.stringify(fwlCombo(name, lb.map(({ L, b }) => ({ L, b })), false), null, 1))]);
    files.push(['cascade_mobile.json', utf8(JSON.stringify(fwlCombo(name + '_Mobile', mobiles, true), null, 1))]);
    // 命名规范（61_naming.js）：多层 = 礼花英文名 + 每层英文名
    if (lb.every(({ b }) => namingApplies(b))) {
      const ef = typeof lib !== 'undefined' ? lib.effect : null, key = typeof wbKey === 'function' ? wbKey() : name, nm = packNamesFor(key, ef, lb.length, name);
      return applyPackNaming(files, nm.base, lb.map(({ b }, i) => ({ ln: comboLayerName(name, i), mn: comboLayerName(name + '_Mobile', i), b, layer: nm.layers[i] })));
    }
    return files;
  } finally { own.forEach(disposeBake); ownMobile.forEach(disposeBake); }
}
