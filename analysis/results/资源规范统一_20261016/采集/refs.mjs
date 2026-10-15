// 第 1 步 · 只读：谁在用这些材质实例 / 粒子系统（资产注册表引用查询）+ 两张 ResourceFX 表里引用这些系统的全部行（不只 3.0 行）。
// 用来判断「别的项目 / 别的特效也在用」——那种要问用户，不自己改。
import fs from 'node:fs';
import { request } from './ue_ro.mjs';
const LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const raw = JSON.parse(fs.readFileSync('raw_crawl.json', 'utf8'));
const T = { pc: '/Game/R13N/Common/PC/DataTables/Resource/ResourceFXTable', mobile: '/Game/DataTables/Resource/ResourceFXTable' };
const parse = s => [...String(s || '').matchAll(/"([^"]+)"/g)].map(m => m[1]);
const out = { format: 'df.ue-referencers/1', readAt: new Date().toISOString(), materials: {}, systems: {}, tableRows: {}, errors: [] };
for (const m of raw.materials) {
  const pkg = m.split('.')[0];
  try { const r = await request('/object/call', { path: LIB, function: 'FindPackageReferencersForAsset', args: { AssetPath: pkg, bLoadAssetsToConfirm: false } }); out.materials[m] = parse(r.return_value); }
  catch (e) { out.errors.push({ path: m, error: String(e.message || e) }); }
}
for (const s of raw.systems) {
  const pkg = s.split('.')[0];
  try { const r = await request('/object/call', { path: LIB, function: 'FindPackageReferencersForAsset', args: { AssetPath: pkg, bLoadAssetsToConfirm: false } }); out.systems[s] = parse(r.return_value); }
  catch (e) { out.errors.push({ path: s, error: String(e.message || e) }); }
}
// 表里引用这些系统的所有行（按系统名搜 FxSP / FxSP_Low / FxSP_High 三列）
for (const s of raw.systems) {
  const name = s.split('.').pop();
  out.tableRows[s] = [];
  for (const [side, table] of Object.entries(T)) for (const field of ['FxSP', 'FxSP_Low', 'FxSP_High']) {
    try {
      const r = await request('/datatable/search', { table, field, value: name, limit: 200 }, 120000);
      for (const m of r.matches || []) out.tableRows[s].push({ side, field, row: m._row_name, desc: m.RowDescription, id: m.ResourceId });
    } catch (e) { out.errors.push({ path: s, table: side, field, error: String(e.message || e) }); }
  }
}
fs.writeFileSync('referencers.json', JSON.stringify(out, null, 1));
console.log('materials', Object.keys(out.materials).length, 'systems', Object.keys(out.systems).length, 'errors', out.errors.length);
