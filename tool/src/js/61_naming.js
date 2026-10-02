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
function packNamesFor(key, ef, nLayers, fallback, type) {
  const o = (store.get('packNames', {})[key]) || {};
  let base = asciiName(o.base) || asciiName(ef && ef.英文名) || asciiName(fallback) || 'Firework';
  const sz = FW_SIZE_SFX[type]; if (sz) base = base.replace(/_[SML]$/, '') + '_' + sz;
  const layers = Array.from({ length: nLayers }, (_, i) => asciiName((o.layers || [])[i]) || asciiName(((ef && ef.层英文名) || [])[i]) || (nLayers > 1 ? 'L' + (i + 1) : ''));
  return { base, layers, custom: !!(o.base || (o.layers || []).some(Boolean)) };
}
function setPackNames(key, base, layers) { const all = store.get('packNames', {}); all[key] = { base, layers }; store.set('packNames', all); }
function fwTexName(base, layer, L, sheet, kind, mobile) {
  const stem = FW_TEX_PREFIX + base + (layer ? '_' + layer : '');
  if (kind === 'R') return stem + '_R';
  const g = `${L.cols}x${L.rows}`, nn = String(sheet).padStart(2, '0');
  if (kind === 'C' || kind === 'D') return `${stem}_${g}_${nn}_${kind}`;
  if (kind === 'FrameTest') return `_检查/${stem}_${g}_${nn}_FrameTest`;
  return `${stem}_${g}_${nn}${kind === 'Head' || kind === 'Tail' ? '_' + kind : ''}${mobile ? '' : '_HD'}`;
}
// 大面片（master / segments）和循环层 + 粒子（emitset，用户 2026-10-02 14:46「改一下」）换名；尾缀 V5、单束等照旧
const namingApplies = b => b && (b.form === 'master' || b.form === 'segments' || b.form === 'emitset');
// 一个烘焙在包里的每张序列：[内部段名, 格子, 名字里加的部分, 序号]。emitset 的循环 / 消散两张按「层」Loop / Fade 命名
function namingSheets(b) {
  if (b.form === 'emitset') return [['Loop', b.meta.L, 'Loop', 1], ['Fade', b.fades[0].meta.L, 'Fade', 1]];
  return bakeParts(b).map((s, k) => [bakeSegmentName(b, k), s.meta.L, '', k + 1]);
}
// entries：[{ ln, mn, b, layer }]：内部 PC 名、内部手机名、这一层的烘焙、层英文名
function applyPackNaming(files, base, entries) {
  const map = new Map(), drop = new Set();
  // pcTex === false（4.2.12：这一层 PC 出光点 / 单束 / 不出）→ 手机的 Cutout / Ramp 不能当成和 PC 共用丢掉；mb = 手机那次烘焙（PC 是单束时格子和 PC 不一样，手机名按它自己的格子起）
  for (const { ln, mn, b, mb, layer, pcTex } of entries) {
    for (const [seg, L, sub, n] of namingSheets(b)) {
      const ly = joinPart(layer, sub), c = fwTexName(base, ly, L, n, 'C') + '.png';
      map.set(TN(ln, seg) + '.png', fwTexName(base, ly, L, n, 'tex', false) + '.png');
      for (const ht of ['Head', 'Tail']) map.set(TN(ln, joinPart(seg, ht)) + '.png', fwTexName(base, ly, L, n, ht, false) + '.png');
      map.set(TN(ln, joinPart(seg, 'Cutout')) + '.png', c);
      map.set(TN(ln, joinPart(seg, 'FrameTest')) + '.png', fwTexName(base, ly, L, n, 'FrameTest') + '.png');
    }
    for (const [seg, L, sub, n] of namingSheets(mb || b)) {
      const ly = joinPart(layer, sub), c = fwTexName(base, ly, L, n, 'C') + '.png';
      map.set(TN(mn, seg) + '.png', fwTexName(base, ly, L, n, 'tex', true) + '.png');
      for (const ht of ['Head', 'Tail']) map.set(TN(mn, joinPart(seg, ht)) + '.png', fwTexName(base, ly, L, n, ht, true) + '.png');
      map.set(TN(mn, joinPart(seg, 'Cutout')) + '.png', c); if (pcTex !== false) drop.add(TN(mn, joinPart(seg, 'Cutout')) + '.png');
      drop.add(TN(mn, joinPart(seg, 'FrameTest')) + '.png');     // 帧号测试图只留 PC 的（_检查/，不导入）
    }
    const r = fwTexName(base, layer, null, 0, 'R') + '.png';
    map.set(TN(ln, 'Ramp') + '.png', r); map.set(TN(mn, 'Ramp') + '.png', r); if (pcTex !== false) drop.add(TN(mn, 'Ramp') + '.png');
  }
  const out = [], seen = new Set(), dec = new TextDecoder();
  for (const [f, d] of files) {
    if (drop.has(f)) continue;
    if (/^cascade(_mobile)?\.json$/.test(f)) {
      const j = JSON.parse(dec.decode(d));
      for (const t of Object.values(j.textures || {})) if (t && t.file) { if (map.has(t.file)) t.file = map.get(t.file); t.asset = t.file.replace(/^.*\//, '').replace(/\.png$/i, ''); }
      // 导入器直接用 textures[].asset 当 UE 资产名（已含 T_EFX_FireWorks_ 前缀、_HD 等后缀），不要再加前缀（spec/cascade_params_v1.md 第 1.1 节）
      j.naming = { rule: 'T_EFX_FireWorks_<名称>[_<层>]_<列>x<行>_<序号>[_HD]；Cut _C、Ramp _R PC 和手机共用', base, layers: entries.map(x => x.layer || ''), asset_names: 'textures[].asset', prefix_included: true };
      out.push([f, utf8(JSON.stringify(j, null, 1))]); continue;
    }
    const nf = map.get(f) || f; if (seen.has(nf)) continue; seen.add(nf); out.push([nf, d]);
  }
  const pairs = [...map].filter(([a]) => files.some(([f]) => f === a) && !drop.has(a));
  out.push(['命名对照.txt', utf8('烘焙器内部名 → 素材包里的名字（用户 2026-10-02 定的规范）\n' + pairs.map(([a, b]) => `${a} → ${b}`).join('\n') + '\n')]);
  return out;
}
