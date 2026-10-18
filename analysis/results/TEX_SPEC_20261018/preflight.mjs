// 烟花贴图新规范（用户 10-18）· 只读预检：不写、不存、不迁出。走 26 的只读白名单客户端。
// ResourceFX 两表「跨年烟花3.0_」行 → 粒子（FxSP / Low / High）→ 发射器各 LOD 的材质实例（顺父材质实例往上）+ Required.CutoutTexture → Texture2D
// 每张图：现值、引用者（别的项目在用 = 共享，不改）、磁盘只读位与哈希；另核之前画质测试是否已还原。
// 用法：node preflight.mjs → preflight.json
import fs from 'node:fs';
import crypto from 'node:crypto';
import { request, LOG } from '../资源规范统一_20261016/采集/ue_ro.mjs';
const LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const CONTENT = 'E:/loc_ma5/DFMEditor/DFM/Content/';
const TABLES = { pc: '/Game/R13N/Common/PC/DataTables/Resource/ResourceFXTable', mobile: '/Game/DataTables/Resource/ResourceFXTable' };
const TEX_PROPS = ['LODGroup', 'NeverStream', 'MipGenSettings', 'AddressX', 'AddressY', 'Filter', 'MaxTextureSize', 'CompressionSettings', 'SRGB', 'MipLoadOptions'];
const pkgOf = p => String(p || '').split(/[.:]/)[0];
const objOf = p => { const k = pkgOf(p); return k + '.' + k.split('/').pop(); };
const ref = v => v && typeof v === 'object' && v.path ? v.path : null;
const is30 = r => String(r._row_name || '').startsWith('跨年烟花3.0_') || String(r.RowDescription || '').startsWith('跨年烟花3.0_');
const out = { format: 'df.tex-spec-preflight/1', at: new Date().toISOString(), rows: {}, systems: {}, materials: {}, textures: {}, revert: {}, errors: [] };
const loaded = new Set();
const load = async p => { const k = pkgOf(p); if (loaded.has(k)) return; loaded.add(k); await request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: k } }); };
const get = async (p, props) => { const r = await request('/object/get', { path: p, properties: props }); return { cls: r.class, props: r.properties || {} }; };

// 1) ResourceFX
const psSet = new Map();     // 粒子包 → 引用它的行
for (const [side, table] of Object.entries(TABLES)) {
  const first = await request('/datatable/rows', { table, limit: 1, offset: 0 }); const total = first.total, rows = []; let off = 0, lim = 15;
  while (off < total) { try { const r = await request('/datatable/rows', { table, limit: lim, offset: off }, 60000, 1); rows.push(...(r.rows || [])); off += lim; lim = 15; }
    catch (e) { if (lim > 1) { lim = Math.max(1, Math.floor(lim / 3)); continue; } out.errors.push({ side, off, error: String(e.message || e) }); off += 1; lim = 15; } }
  out.rows[side] = rows.filter(is30).map(r => ({ row: r._row_name, FxSP: r.FxSP, FxSP_Low: r.FxSP_Low, FxSP_High: r.FxSP_High }));
  for (const r of out.rows[side]) for (const k of ['FxSP', 'FxSP_Low', 'FxSP_High']) { const v = r[k]; if (v && v !== 'None' && /^\/Game\//.test(pkgOf(v))) { const p = pkgOf(v); if (!psSet.has(p)) psSet.set(p, []); psSet.get(p).push(side + ':' + r.row + ':' + k); } }
  console.log(side, '3.0 行', out.rows[side].length);
}
// 2) 粒子 → 材质 / Cutout
const matSet = new Map(), cutSet = new Map();
for (const [ps, rows] of psSet) {
  const rec = { rows, emitters: [] }; out.systems[ps] = rec;
  try {
    await load(ps); const { props } = await get(objOf(ps), ['Emitters']);
    for (const e of props.Emitters || []) { const ep = ref(e) || e; if (!ep || typeof ep !== 'string') continue;
      const em = (await get(ep, ['EmitterName', 'LODLevels'])).props;
      for (const l of em.LODLevels || []) { const lp = ref(l); if (!lp) continue;
        const lod = (await get(lp, ['RequiredModule', 'TypeDataModule', 'Modules'])).props, rq = ref(lod.RequiredModule);
        const r = rq ? (await get(rq, ['Material', 'CutoutTexture'])).props : {};
        const mats = [ref(r.Material)].filter(Boolean);
        const td = ref(lod.TypeDataModule); if (td && /Mesh/i.test(td)) { const t = (await get(td, ['Mesh'])).props, mesh = ref(t.Mesh);
          if (mesh) { await load(mesh); const sm = (await get(objOf(mesh), ['StaticMaterials'])).props; for (const s of sm.StaticMaterials || []) { const mi = ref(s.MaterialInterface); if (mi) mats.push(mi); } } }
        for (const m of lod.Modules || []) { const mp = ref(m); if (mp && /MeshMaterial/i.test(mp)) { const mm = (await get(mp, ['MeshMaterials'])).props; for (const x of mm.MeshMaterials || []) { const mi = ref(x); if (mi) mats.push(mi); } } }
        for (const m of mats) { const k = pkgOf(m); if (!matSet.has(k)) matSet.set(k, new Set()); matSet.get(k).add(ps); }
        const cut = ref(r.CutoutTexture); if (cut) { const k = pkgOf(cut); if (!cutSet.has(k)) cutSet.set(k, new Set()); cutSet.get(k).add(ps); }
        rec.emitters.push({ emitter: em.EmitterName, lod: lp, materials: mats.map(pkgOf), cutout: cut ? pkgOf(cut) : null });
      } }
  } catch (e) { out.errors.push({ ps, error: String(e.message || e) }); }
}
console.log('粒子', psSet.size, '材质', matSet.size, 'Cutout', cutSet.size);
// 3) 材质实例 → 贴图（顺父材质实例往上；母材质的默认贴图不算本次范围，只记母材质）
const texSet = new Map();     // 贴图包 → { via: Set, params: Set }
const addTex = (t, via, param) => { const k = pkgOf(t); if (!texSet.has(k)) texSet.set(k, { via: new Set(), params: new Set() }); texSet.get(k).via.add(via); if (param) texSet.get(k).params.add(param); };
const seenMat = new Set();
async function walkMat(m, owner) {
  const k = pkgOf(m); if (seenMat.has(k)) return; seenMat.add(k);
  try { await load(k); const { cls, props } = await get(objOf(k), ['Parent', 'TextureParameterValues']);
    out.materials[k] = { cls, parent: pkgOf(ref(props.Parent)), owner };
    if (!/MaterialInstance/.test(cls || '')) return;
    for (const tv of props.TextureParameterValues || []) { const t = ref(tv.ParameterValue); if (t) addTex(t, k, tv.ParameterInfo && tv.ParameterInfo.Name); }
    const parent = ref(props.Parent); if (parent && /MaterialInstance/.test(props.Parent.class || '')) await walkMat(parent, owner);
  } catch (e) { out.errors.push({ material: k, error: String(e.message || e) }); }
}
for (const [m] of matSet) await walkMat(m, m);
for (const [c, ps] of cutSet) for (const p of ps) addTex(c, p, 'CutoutTexture');
console.log('贴图', texSet.size);
// 4) 每张贴图：现值、引用者、磁盘
const scope = new Set([...psSet.keys(), ...seenMat]);
for (const [t, info] of texSet) {
  const rec = { via: [...info.via], params: [...info.params] }; out.textures[t] = rec;
  try {
    await load(t); const { cls, props } = await get(objOf(t), TEX_PROPS); rec.cls = cls; rec.now = props;
    rec.ramp = /\/Ramp\//i.test(t) || rec.params.some(p => /Ramp/i.test(p || ''));
    const r = await request('/object/call', { path: LIB, function: 'FindPackageReferencersForAsset', args: { AssetPath: t } });
    const refs = [...String(r.return_value || '').matchAll(/"([^"]+)"/g)].map(m => m[1]);
    rec.referencers = refs; rec.outside = refs.filter(x => !scope.has(x) && !/fire ?works/i.test(x) && !/_Sandbox/i.test(x));
    rec.shared = rec.outside.length > 0;
    const f = CONTENT + t.slice(6) + '.uasset';
    if (fs.existsSync(f)) { const st = fs.statSync(f); rec.disk = { file: f, size: st.size, mtime: st.mtime.toISOString(), readonly: (st.mode & 0o200) === 0, sha256: crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') }; }
    else rec.disk = { file: f, missing: true };
  } catch (e) { out.errors.push({ texture: t, error: String(e.message || e) }); }
}
// 5) 之前画质测试还原了没有
const T = n => '/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD/T_EFX_FireWorks_' + n;
const MI = n => '/Game/Effects_HD/Common_HD/MaterialInstance_HD/FireWorks_HD/MI_EFX_FireWorks_' + n;
for (const n of ['RiseTrail_L_Loop_16x1_01_HD', 'RiseTrail_L_Far_16x4_01_HD', 'Comet3_GoldTail_Full_16x1_01_HD', 'Silver3_Layers_S_Full_16x1_01_HD']) {
  try { await load(T(n)); out.revert[n] = (await get(objOf(T(n)), ['MipGenSettings'])).props.MipGenSettings; } catch (e) { out.revert[n] = 'ERR ' + e.message; } }
for (const n of ['RiseTrail_L_Loop_01_HD', 'RiseTrail_L_Far_01_HD', 'Comet3_GoldTail_Full_01_HD', 'Silver3_Layers_S_Full_01_HD']) {
  try { await load(MI(n)); const p = (await get(objOf(MI(n)), ['BasePropertyOverrides', 'TextureParameterValues'])).props;
    out.revert[n] = { fullRes: !!(p.BasePropertyOverrides && p.BasePropertyOverrides.bOverride_TranslucencyRenderFullPercentageLast && p.BasePropertyOverrides.TranslucencyRenderFullPercentageLast),
      ramp: (p.TextureParameterValues || []).filter(v => /Ramp/i.test(v.ParameterInfo && v.ParameterInfo.Name)).map(v => pkgOf(ref(v.ParameterValue))) }; } catch (e) { out.revert[n] = 'ERR ' + e.message; } }
out.revert.rampCopyExists = (await request('/object/call', { path: LIB, function: 'DoesAssetExist', args: { AssetPath: T('RiseTrail_L_R_01_HD') } })).return_value;
// 汇总
const tx = Object.values(out.textures).filter(t => t.now);
out.summary = { systems: psSet.size, materials: seenMat.size, textures: tx.length, ramps: tx.filter(t => t.ramp).length, shared: Object.entries(out.textures).filter(([, t]) => t.shared).map(([k]) => k),
  neverStreamTrue: tx.filter(t => t.now.NeverStream === true).length, groups: tx.reduce((a, t) => (a[t.now.LODGroup] = (a[t.now.LODGroup] || 0) + 1, a), {}),
  noMip: Object.entries(out.textures).filter(([, t]) => t.now && t.now.MipGenSettings === 'TMGS_NoMipmaps').map(([k]) => k), readonly: tx.filter(t => t.disk && t.disk.readonly).length, errors: out.errors.length, requests: LOG.length };
fs.writeFileSync(new URL('preflight.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.summary, null, 1)); console.log('还原核对', JSON.stringify(out.revert));
