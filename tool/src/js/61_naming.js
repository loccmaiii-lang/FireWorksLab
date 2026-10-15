// =====================================================================
//  素材包命名（用户 2026-10-02 13:26 / 13:35 定）：
//    序列（PC）  T_EFX_FireWorks_<名称>[_<层>]_<列>x<行>_<序号>_HD.png
//    序列（手机）T_EFX_FireWorks_<名称>[_<层>]_<列>x<行>_<序号>.png
//    Cut         T_EFX_FireWorks_<名称>[_<层>]_<列>x<行>_<序号>_C.png   PC / 手机共用，最大 512
//    溶解图      …_<序号>_D.png（需要才生成；现在的效果都不需要）
//    Ramp        T_EFX_FireWorks_<名称>[_<层>]_R.png                    PC / 手机共用
//  <名称> = 这朵礼花的英文名（协作/状态清单.json 的「英文名」，交付页可改）；<层> = 多层时每层的英文名（Main / Red …，「层英文名」）；
//  <序号> = 第几张贴图（一层分两张就是 01、02）。帧号测试图只用来排查，放进 _检查/ 子目录，不导入。
//  烘焙器内部仍按旧名生成，打包前统一换名（cascade.json 里的贴图引用一起换，textures[].asset = UE 资产名）。
//  循环层 + 粒子（emitset）：两张序列按层名 Loop / Fade（T_EFX_FireWorks_<名称>_Loop_16x1_01_HD）。升空尾缀 V5 / 单束等其它产物照旧。
// =====================================================================
const FW_TEX_PREFIX = 'T_EFX_FireWorks_';
const asciiName = s => String(s == null ? '' : s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
// 名称来源：你在交付页改的（这台电脑的浏览器，按效果记）→ 状态清单的英文名 → 内部名
// type：这一包的花型。升空尾缀小 / 中 / 大（tailS / M / L）是同一个效果的三档，名字后面加 _S / _M / _L，引擎里不重名
const FW_SIZE_SFX = { tailS: 'S', tailM: 'M', tailL: 'L' };
// 4.9.23（对话框新花型，用户 10-07 00:33 / 00:59「一个效果多做几个不同规格给我导出」「我都要拿来当素材」）：一个效果几档（状态清单「方案」），
// 以前每档导出的贴图 / UE 资产名全一样（金芒菊规格 6 档都叫 T_EFX_FireWorks_JinMangJu_4x4_01_HD，导进引擎互相覆盖）。
// 方案里写了 en 的那一档，名字后面加 _<en>（JinMangJu_40）；没写 en 的照旧（以前导出的东西名字不变）。
function planSfx(ef, entryId) {
  if (!ef || !entryId) return '';
  const id = String(entryId).replace(/^rep:/, '').replace(/@.*$/, ''), v = (ef.方案 || []).find(x => x && x.id && x.id.replace(/^rep:/, '').replace(/@.*$/, '') === id);
  return v ? asciiName(v.en) : '';
}
// 4.9.101 分档效果现在打开的是哪一档（条目或正式库档），交付清单保存名字时记下，导出时按它认
function packTierNow(ef) { if (typeof lib === 'undefined' || !ef || lib.effect !== ef) return ''; return lib.review ? lib.review.id : lib.formal ? lib.formal.id : ''; }
// entryId：这一包是哪个条目（本机导出任务传条目号）；不传 = 烘焙器里现在打开的那个（左栏点的那一档）
function packNamesFor(key, ef, nLayers, fallback, type, entryId) {
  const o = (store.get('packNames', {})[key]) || {};
  const eid = entryId !== undefined ? entryId : (typeof lib !== 'undefined' && lib.review && ef && lib.effect === ef ? lib.review.id : null), ps = planSfx(ef, eid);
  // 用户10-14：手动保存名即最终名。旧记录已有base但未写system，按这一决定兼容；程序默认记录显式写空system。
  // 4.9.101 分档效果（ef: 键 + 尾缀小 / 中 / 大或方案几档）几档共用这一条名字：只有在当前这一档保存的（o.entry）才是这一档的最终名，
  //   其余（含没写 entry 的旧记录）当基础名、照旧加档位后缀 —— 否则 ef:trail_phys 存过的 RiseTrail_M 让小 / 大号也导出成 RiseTrail_M（同名迭代会覆盖中号）
  const tiered = /^ef:/.test(key || '') && (!!FW_SIZE_SFX[type] || ((ef && ef.方案) || []).length > 1);
  const system = tiered && !(o.entry && o.entry === (eid || packTierNow(ef))) ? '' : asciiName(o.system === undefined ? o.base : o.system);
  let base = asciiName(o.base) || asciiName(ef && ef.英文名) || asciiName(fallback) || 'Firework';
  const sz = FW_SIZE_SFX[type]; if (sz && !system) base = base.replace(/_[SML]$/, '') + '_' + sz;
  if (ps && !system && !base.endsWith('_' + ps)) base += '_' + ps;
  const layers = Array.from({ length: nLayers }, (_, i) => asciiName((o.layers || [])[i]) || asciiName(((ef && ef.层英文名) || [])[i]) || (nLayers > 1 ? 'L' + (i + 1) : ''));
  return { base, layers, system, tiered, custom: !!(o.base || (o.layers || []).some(Boolean)) };
}
// 4.9.4（交互宪章 5「一个效果只留一个英文名，在交付清单里设」）：以前有三个名字——右栏「母版名称」、交付清单「名称（英文）」、左栏中文名。
// 现在英文名只有一个：交付清单里设（存在 packNames），右栏只显示、点「在交付清单里改」过去。素材包、贴图、UE 资产名都用它；
// 沿用旧命名的产物（V5 尾缀、单束等）设过英文名以后，文件名也用它（没设过时照旧用内部名，以前导出的东西不变）。
function effEnName() {
  try { const xs = typeof curLayerBakes === 'function' ? curLayerBakes() : [], t = xs.length === 1 && xs[0].b ? xs[0].b.P.type : (state.tab === 'combo' ? '' : state.P.type);
    return packNamesFor(wbKey(), lib.effect, Math.max(1, xs.length), typeof delivName === 'function' ? delivName() : state.name, t).base; } catch (e) { return state.name || 'Firework'; }
}
function effEnCustom() { try { return asciiName((store.get('packNames', {})[wbKey()] || {}).base); } catch (e) { return ''; } }
function syncEnName() { const el = typeof document !== 'undefined' && document.getElementById('enName'); if (el) { const n = effEnName(); if (el.textContent !== n) el.textContent = n; } }
function setPackNames(key, base, layers, names = { system: '' }) {
  const all = { ...store.get('packNames', {}) }; all[key] = { base, layers: [...layers], system: asciiName(names.system === undefined ? base : names.system), ...(names.entry ? { entry: String(names.entry) } : {}) };     // 4.9.101 entry：分档效果里是在哪一档保存的
  if (!store.set('packNames', all)) return false;
  if (typeof syncEnName === 'function') syncEnName(); return true;
}
function fwTexName(base, layer, L, sheet, kind, mobile) {
  const stem = FW_TEX_PREFIX + base + (layer ? '_' + layer : '');
  if (kind === 'R') return stem + '_R';
  const g = `${L.cols}x${L.rows}`, nn = String(sheet).padStart(2, '0');
  if (kind === 'C' || kind === 'D') return `${stem}_${g}_${nn}_${kind}`;
  if (kind === 'FrameTest') return `_检查/${stem}_${g}_${nn}_FrameTest`;
  return `${stem}_${g}_${nn}${kind === 'Head' || kind === 'Tail' ? '_' + kind : ''}${mobile ? '' : '_HD'}`;
}
// =====================================================================
//  4.9.106 产物形态登记表（导出排查 G4；用户 10-15 20:53「我希望所有导出规范都是统一的，不要因为某个效果就是新增的就单独不同……每次新出一个效果，这些就要修一遍」）
//  以前命名（namingApplies）、交付清单产物表（prodTableHTML）、包内文件清单（renderDeliv）三处各写死一份「哪几种产物走规范」，只认大面片 / 分段 / 循环层 + 粒子；
//  地面循环（喷泉、分层粒子图 = 窜天猴尾焰 / 仙女棒）、升空尾缀 V5、上升星头循环、单元序列掉进「按自己的规则 / 沿用原来的命名」：贴图名用内部名或中文标题
//  （多层「我的效果」只滤非 ASCII → T_-_-_L1_Ramp，导入器拒收）、手机不能选、清单看不到文件。
//  现在每种产物在这里登记一行：PC / 手机能出哪几种（OUT_PC / OUT_MOBILE 的键，其余选项在产物表和层页头变灰、写 why）、序列在下拉里叫什么。
//  命名、产物表、包内文件清单、导出拦截都从这张表读；新加一种产物不登记 → 合入门禁「统一规范」检查不过、推不上去。
//  own：这种产物的 PC / 手机格有自己的选项（尾缀：近段 / 合成一张，见 79_workbench.js tailProdRow），只用 pc / mobile 限制层页头
// =====================================================================
const PF_AIR = { pc: ['seq', 'unit', 'dots', 'frame', 'off'], mobile: ['seq', 'unit', 'frame', 'off'], seq: '序列（大面片）' };
const PRODUCT_FORMS = {
  master: PF_AIR, segments: PF_AIR,
  unit: { pc: ['seq', 'off'], mobile: ['seq', 'off'], seq: '序列（单元序列）', why: '这一层本身就是单元序列（每颗星一个面片）：GPU 光点、单帧是大面片的出法' },
  emitset: { pc: ['seq', 'off'], mobile: ['seq', 'off'], own: true, why: '尾缀层：按尾缀自己的产物出（交付清单产物表里选近段 / 合成一张）或不出；单束、GPU 光点、单帧是礼花的' },
  trail: { pc: ['seq', 'off'], mobile: ['seq', 'off'], seq: '序列（循环 + 消散）', why: '升空尾缀 V5 是循环 + 消散两张序列：单束、GPU 光点、单帧是空中礼花的出法' },
  riseLoop: { pc: ['seq', 'off'], mobile: ['seq', 'off'], seq: '序列（星头循环）', why: '上升星头循环是一张循环序列：单束、GPU 光点、单帧是空中礼花的出法',
    noPack: '上升星头循环（花型模板「上升」/ 物理尾缀）一直没有 Cascade 出口：只出贴图、没有 cascade.json，导入器导不了，这次起导出直接拦下；升空尾缀请用「循环层 + 粒子」（RT6）' },     // 4.9.106：以前悄悄出一个缺配置的包
  loop: { pc: ['seq', 'off'], mobile: ['seq', 'off'], seq: '序列（循环）', why: '地面循环 / 分层粒子图是一直循环的一张序列：单束、GPU 光点、单帧接不上循环' },
};
// 这一层（烘焙 b，或者参数 P）是哪种产物：没烘好时按参数推（bakeKind 和烘焙同一条）
const productFormKey = x => !x ? '' : x.form && x.meta ? x.form : x.type && typeof bakeKind === 'function' ? bakeKind(x) : '';
const productFormOf = x => PRODUCT_FORMS[productFormKey(x)] || null;
// 某一格能不能选 kind：single = 单层效果（单层 PC 不出就没有素材包了，不给选）
function productAllows(x, pf, kind, single = false) {
  const F = productFormOf(x); if (!F) return false;
  if (single && pf === 'pc' && kind === 'off' && F !== PF_AIR) return false;
  return (pf === 'pc' ? F.pc : F.mobile).includes(kind);
}
// 登记表写了 noPack 的产物不能出素材包（原因写在 noPack）：导出入口、交付清单按钮、导出拦截同一条
const productNoPack = x => { const F = productFormOf(x); return F && F.noPack ? F.noPack : ''; };
const productWhy = (x, single) => { const F = productFormOf(x); return F ? (F.why || '') : '这种产物没在产物形态登记表里（61_naming.js PRODUCT_FORMS）'; };
// 所有登记了的产物都按规范换名（以前只有大面片 / 分段 / 循环层 + 粒子）
const namingApplies = b => !!(b && PRODUCT_FORMS[b.form]);
// 一个烘焙在包里的每张序列：[内部段名, 格子, 名字里加的部分, 序号]。emitset 的循环 / 消散两张按「层」Loop / Fade 命名
function namingSheets(b) {
  if (b.form === 'trail') return [['Loop', b.meta.L, 'Loop', 1], ...(b.fades || []).map(f => ['Fade' + f.fps, (f.meta && f.meta.L) || b.meta.L, 'Fade' + f.fps, 1])];     // 4.9.106 V5：循环 + 消散（20 / 30 fps 各一张）
  if (b.form === 'emitset' && b.esFull) return [['Full', b.meta.L, 'Full', 1]];     // 4.9.73 手机合成一张（T_EFX_FireWorks_<名称>_Full_32x2_01）
  if (b.form === 'emitset') return [['Loop', b.meta.L, 'Loop', 1],...(b.fades[0] ? [['Fade', b.fades[0].meta.L, 'Fade', 1]] : []), ...(b.far ? [['Far', b.far.meta.L, 'Far', 1]] : [])];     // 4.5.1 远段 Far
  if (b.vars) return [b, ...b.vars].map((s, k) => ['', s.meta.L, '', k + 1, k + 1]);     // 4.9.28 单束变体：序号 01…04（内部名第 2 张起带 _V2…）
  return bakeParts(b).map((s, k) => [bakeSegmentName(b, k), s.meta.L, '', k + 1]);
}
// 4.9.69 派生资源（规范 v1 §2「派生资源不新开贴图」，用户 10-12：主角尾缀和 L 尾缀 10 张 PNG 逐字节相同却起了 RiseTrail_Hero_L_* 一套新名）：
//   同一个效果按非默认尺寸档导出 = 派生。贴图名沿用原效果（base），只有粒子 / 系统名（sys）区分：尺寸表规格写了 system_tag 用它（T_HERO → Hero、T_F → XS），
//   别的非默认档按档位起（cls:d:dam:230 → D230、cls:h:front:62 → H62）。尾缀的 _S / _M / _L 换成标签（RiseTrail_S + XS → RiseTrail_XS）
function sizeSysTag(spec) {
  if (!spec) return '';
  if (spec.system_tag) return asciiName(spec.system_tag);
  if (!spec.picked) return '';
  const m = /^cls:(h|d|df):[^:]+:([\d.]+)$/.exec(spec.id || '');
  return m ? { h: 'H', d: 'D', df: 'Fan' }[m[1]] + m[2].replace('.', '_') : asciiName(spec.id);
}
function packSysName(base, type, spec, system = '') {
  if (asciiName(system)) return asciiName(system);
  const tag = sizeSysTag(spec); if (!tag) return base;
  return (FW_SIZE_SFX[type] ? base.replace(/_[SML]$/, '') : base) + '_' + tag;
}
// entries：[{ ln, mn, b, layer }]：内部 PC 名、内部手机名、这一层的烘焙、层英文名
// o.sys：粒子 / 系统名（派生资源和 base 不同）；o.spec：派生用的尺寸档 id
function applyPackNaming(files, base, entries, o = {}) {
  const sys = o.sys || base;
  const map = new Map(), drop = new Set();
  // pcTex === false（4.2.12：这一层 PC 出光点 / 单束 / 不出）→ 手机的 Cutout / Ramp 不能当成和 PC 共用丢掉；mb = 手机那次烘焙（PC 是单束时格子和 PC 不一样，手机名按它自己的格子起）
  for (const { ln, mn, b, mb, layer, pcTex, frame } of entries) {
    for (const [seg, L, sub, n, vi = 1] of namingSheets(b)) {
      const ly = joinPart(layer, sub), c = fwTexName(base, ly, L, n, 'C') + '.png';
      map.set(TN(ln, seg, null, vi) + '.png', fwTexName(base, ly, L, n, 'tex', false) + '.png');
      for (const ht of ['Head', 'Tail']) map.set(TN(ln, joinPart(seg, ht), null, vi) + '.png', fwTexName(base, ly, L, n, ht, false) + '.png');
      map.set(TN(ln, joinPart(seg, 'Cutout'), null, vi) + '.png', c);
      map.set(TN(ln, joinPart(seg, 'FrameTest'), null, vi) + '.png', fwTexName(base, ly, L, n, 'FrameTest') + '.png');
      map.set(TN(ln, joinPart(seg, '4K'), null, vi) + '.png', fwTexName(base, ly, L, n, 'tex', true) + '_4K.png');     // 4.9.106 V5 的 4K 母版（只在要求时出）
    }
    for (const [seg, L, sub, n, vi = 1] of namingSheets(mb || (b && b.mobNaming) || b)) {     // 4.9.73 b.mobNaming：尾缀手机合成一张（platformFiles 记的）
      const ly = joinPart(layer, sub), c = fwTexName(base, ly, L, n, 'C') + '.png';
      map.set(TN(mn, seg, null, vi) + '.png', fwTexName(base, ly, L, n, 'tex', true) + '.png');     // 4.9.35 手机单束的变体也换名（vi）
      if (vi > 1) map.set(TN(mn, joinPart(seg, 'Cutout'), null, vi) + '.png', c);
      for (const ht of ['Head', 'Tail']) map.set(TN(mn, joinPart(seg, ht)) + '.png', fwTexName(base, ly, L, n, ht, true) + '.png');
      map.set(TN(mn, joinPart(seg, 'Cutout')) + '.png', c); if (pcTex !== false && seg !== 'Full' && files.some(([f]) => f === TN(ln, joinPart(seg, 'Cutout')) + '.png' && map.get(f) === c)) drop.add(TN(mn, joinPart(seg, 'Cutout')) + '.png');     // 合成一张的 Cut 是手机自己的，不和 PC 共用
      drop.add(TN(mn, joinPart(seg, 'FrameTest')) + '.png');     // 帧号测试图只留 PC 的（_检查/，不导入）
    }
    const r = fwTexName(base, layer, null, 0, 'R') + '.png';
    map.set(TN(ln, 'Ramp') + '.png', r); map.set(TN(mn, 'Ramp') + '.png', r); if (pcTex !== false) drop.add(TN(mn, 'Ramp') + '.png');
    // 4.9.35 单帧（并进产物表，用户 10-07 18:50；名字不加 _MB）：PC 用的 …_1x1_01_HD、彩色 …_1x1_01_Color_HD；只有手机用的不带 _HD；
    //   轮廓 …_1x1_01_C、功能图 …_1x1_01_<后缀>（后缀你填）、Ramp 和这一层共用。PC、手机都是单帧时手机直接用 PC 那张
    if (frame) { const g = { cols: 1, rows: 1 }, st = fwTexName(base, layer, g, 1, 'tex', true);
      for (const [nm, hd] of [[frame.pc ? ln : null, '_HD'], [frame.mob ? mn : null, '']]) { if (!nm) continue;
        map.set(TN(nm, 'Frame') + '.png', st + hd + '.png'); map.set(TN(nm, 'Frame_Color') + '.png', st + '_Color' + hd + '.png');
        map.set(TN(nm, 'Frame_Cutout') + '.png', fwTexName(base, layer, g, 1, 'C') + '.png'); map.set(TN(nm, 'Frame_Maps') + '.png', st + '_' + (frame.suffix || 'MAP') + '.png');
        map.set(TN(nm, 'Ramp') + '.png', r); } }
  }
  const out = [], seen = new Set(), dec = new TextDecoder();
  for (const [f, d] of files) {
    if (drop.has(f)) continue;
    if (/^cascade(_mobile)?\.json$/.test(f)) {
      const j = JSON.parse(dec.decode(d));
      for (const t of [...Object.values(j.textures || {}), ...Object.values(j.extras || {})]) if (t && t.file) { if (map.has(t.file)) t.file = map.get(t.file); t.asset = t.file.replace(/^.*\//, '').replace(/\.png$/i, ''); }     // 4.9.29 extras（彩色单帧）
      // 导入器直接用 textures[].asset 当 UE 资产名（已含 T_EFX_FireWorks_ 前缀、_HD 等后缀），不要再加前缀（spec/cascade_params_v1.md 第 1.1 节）
      j.naming = { rule: 'T_EFX_FireWorks_<名称>[_<层>]_<列>x<行>_<序号>[_HD]；Cut _C、Ramp _R PC 和手机共用', base, layers: entries.map(x => x.layer || ''), asset_names: 'textures[].asset', prefix_included: true, ...(sys !== base ? { system: sys } : {}) };
      // 4.9.69 手机：粒子名 = <系统名>_<档位>（规范 v1 §2：P_EFX_FireWorks_<名>_H / _M，不带 _HD / _Mobile），档位在 tier
      if (/_mobile/.test(f)) { j.tier = j.tier || 'M'; j.name = sys + '_' + j.tier; }
      if (sys !== base) j.derived = { from: base, system: sys, spec: o.spec || null, note: '派生资源：贴图沿用原效果那一套（规范 v1 §2），只有粒子 / 系统名不同' };
      out.push([f, utf8(JSON.stringify(j, null, 1))]); continue;
    }
    const nf = map.get(f) || f; if (seen.has(nf)) continue; seen.add(nf); out.push([nf, d]);
  }
  const pairs = [...map].filter(([a]) => files.some(([f]) => f === a) && !drop.has(a));
  out.push(['命名对照.txt', utf8('烘焙器内部名 → 素材包里的名字（用户 2026-10-02 定的规范）\n' + pairs.map(([a, b]) => `${a} → ${b}`).join('\n') + '\n')]);
  return out;
}
