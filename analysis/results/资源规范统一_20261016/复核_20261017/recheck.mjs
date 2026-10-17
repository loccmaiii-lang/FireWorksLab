// 只读复核（10-17 接手）：不写、不存、不迁出。顺序单请求，走 ../采集/ue_ro.mjs 的只读白名单。
// 1) 重读 ResourceFX 两表「跨年烟花3.0_」行，和 10-16 04:18 快照比；
// 2) 26 的 50 个目标系统 + 表里新出现的系统：包围盒、全部发射器各 LOD 的 Required（朝向 / 翻转 / 材质）、TypeData、模块类名；
// 3) 26 的 67 个材质实例 + 新系统用到的材质实例：Parent、EmissiveDissolve 覆盖。
// 用法：node recheck.mjs → 现状_<时间>Z.json
import fs from 'node:fs';
import zlib from 'node:zlib';
import { request, LOG } from '../采集/ue_ro.mjs';
const LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const here = new URL('./', import.meta.url);
const rd = rel => JSON.parse(fs.readFileSync(new URL(rel, here), 'utf8'));
const plan = rd('../写入/final_targets.json');
const oldRows = rd('../采集/resourcefx_30.json');
const oldRaw = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../采集/raw_crawl.json.gz', here))).toString('utf8'));
const TABLES = oldRows.tables;
const KEEP = ['_row_name', 'RowDescription', 'ResourceId', 'FxSP', 'FxSP_Low', 'FxSP_High', 'EffectScale', 'FXType', 'MaxInstanceNum', 'bLimitByMaxInstanceNum'];
const is30 = r => String(r._row_name || '').startsWith('跨年烟花3.0_') || String(r.RowDescription || '').startsWith('跨年烟花3.0_');
const out = { format: 'df.rsu26-recheck/1', at: new Date().toISOString(), note: '只读；LoadAsset 拿到的是编辑器里已加载的对象（可能含未保存改动），磁盘另见 磁盘核对_*.json', rows: {}, rowDiff: {}, systems: [], materials: [], errors: [] };

// 1) ResourceFX
for (const [side, table] of Object.entries(TABLES)) {
  const first = await request('/datatable/rows', { table, limit: 1, offset: 0 });
  const total = first.total; const rows = []; let off = 0, lim = 15;
  while (off < total) {
    try { const r = await request('/datatable/rows', { table, limit: lim, offset: off }, 60000, 1); rows.push(...(r.rows || [])); off += lim; lim = 15; }
    catch (e) { if (lim > 1) { lim = Math.max(1, Math.floor(lim / 3)); continue; } out.errors.push({ side, off, error: String(e.message || e) }); off += 1; lim = 15; }
  }
  out.rows[side] = rows.filter(is30).map(r => Object.fromEntries(KEEP.map(k => [k, r[k]])));
  out.rows[side + 'Total'] = total; out.rows[side + 'Read'] = rows.length;
  const old = new Map(oldRows[side].map(r => [r._row_name, r]));
  const now = new Map(out.rows[side].map(r => [r._row_name, r]));
  const d = { added: [], removed: [], changed: [] };
  for (const [k, r] of now) {
    if (!old.has(k)) d.added.push(r);
    else { const o = old.get(k); const ch = KEEP.filter(f => JSON.stringify(o[f]) !== JSON.stringify(r[f])); if (ch.length) d.changed.push({ row: k, fields: Object.fromEntries(ch.map(f => [f, [o[f], r[f]]])) }); }
  }
  for (const [k, r] of old) if (!now.has(k)) d.removed.push(r);
  out.rowDiff[side] = d;
  console.log(side, 'total', total, 'read', rows.length, '3.0 rows', out.rows[side].length, 'added', d.added.length, 'removed', d.removed.length, 'changed', d.changed.length);
}

// 2) 系统
const targets = new Map(plan.systems.map(s => [s.system, s]));
const nowPaths = new Set();
for (const side of ['pc', 'mobile']) for (const r of out.rows[side]) for (const k of ['FxSP', 'FxSP_Low', 'FxSP_High']) { const v = r[k]; if (v && v !== 'None') nowPaths.add(v); }
const allSys = [...new Set([...targets.keys(), ...nowPaths, ...oldRaw.systems])];
const get = async (p, props) => { const q = { path: p }; if (props) q.properties = props; return (await request('/object/get', q)); };
const load = async p => { const r = await request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: p.split('.')[0] } }); return String(r.return_value) !== 'None'; };
const nm = p => (p || '').split(/[.:]/).pop();
const matSet = new Map(plan.materials.map(m => [m.material, { name: m.name, from: '26目标' }]));
for (const sp of allSys) {
  const rec = { system: sp, name: nm(sp), in26Targets: targets.has(sp), inTableNow: nowPaths.has(sp), inTable1016: oldRaw.systems.includes(sp) };
  try {
    if (!await load(sp)) { rec.loaded = false; out.systems.push(rec); console.log(rec.name, '加载失败'); continue; }
    const s = (await get(sp, ['bUseFixedRelativeBoundingBox', 'FixedRelativeBoundingBox', 'Emitters', 'LODDistances'])).properties;
    const b = s.FixedRelativeBoundingBox;
    rec.fixed = s.bUseFixedRelativeBoundingBox; rec.box = b ? [b.Min.X, b.Min.Y, b.Min.Z, b.Max.X, b.Max.Y, b.Max.Z] : null;
    rec.lodDistances = s.LODDistances;
    const oldEm = (oldRaw.objects[sp]?.properties?.Emitters || []).map(e => e.path);
    const nowEm = (s.Emitters || []).map(e => e.path);
    rec.emittersSameAs1016 = JSON.stringify(oldEm) === JSON.stringify(nowEm);
    rec.emitters = [];
    for (const ep of nowEm) {
      const e = (await get(ep, ['EmitterName', 'LODLevels'])).properties;
      const er = { emitter: e.EmitterName, path: ep, lods: [] };
      for (const lr of (e.LODLevels || [])) {
        const l = (await get(lr.path, ['bEnabled', 'RequiredModule', 'TypeDataModule', 'Modules', 'Level'])).properties;
        const req = l.RequiredModule ? (await get(l.RequiredModule.path, ['ScreenAlignment', 'UVFlippingMode', 'Material', 'bUseLocalSpace', 'SubImages_Horizontal', 'SubImages_Vertical'])).properties : null;
        const mods = (l.Modules || []).map(m => m.class || nm(m.path));
        er.lods.push({ lod: l.Level, enabled: l.bEnabled, required: l.RequiredModule?.path, screenAlignment: req?.ScreenAlignment, uvFlip: req?.UVFlippingMode, material: req?.Material?.path || null, localSpace: req?.bUseLocalSpace, typeData: l.TypeDataModule?.class || null, modules: mods });
        if (req?.Material?.path && !matSet.has(req.Material.path)) matSet.set(req.Material.path, { name: nm(req.Material.path), from: rec.name });
      }
      rec.emitters.push(er);
    }
    const t = targets.get(sp);
    if (t) {
      if (t.writeBounds) rec.boundsMatch26 = rec.fixed === true && [...t.bounds.min, ...t.bounds.max].every((v, i) => Math.abs(v - rec.box[i]) < 1e-3);
      rec.requiredMatch26 = [];
      for (const e of t.emitters) for (const l of e.lods) {
        const cur = rec.emitters.flatMap(x => x.lods).find(x => x.required === l.required);
        rec.requiredMatch26.push({ emitter: e.emitter, lod: l.lod, want: e.set, now: cur ? { ScreenAlignment: cur.screenAlignment, UVFlippingMode: cur.uvFlip } : null, match: !!cur && Object.entries(e.set).every(([k, v]) => (k === 'ScreenAlignment' ? cur.screenAlignment : cur.uvFlip) === v) });
      }
    }
  } catch (e) { rec.error = String(e.message || e); out.errors.push({ system: sp, error: rec.error }); }
  out.systems.push(rec);
  console.log(rec.name, rec.inTableNow ? '' : '(不在现表)', rec.fixed, rec.box ? rec.box.join(',') : '-', 'em', rec.emitters?.length, rec.emittersSameAs1016 ? '' : '【发射器变了】', rec.boundsMatch26 === false ? '【盒不是26写的】' : '', (rec.requiredMatch26 || []).some(x => !x.match) ? '【朝向/翻转不一致】' : '', rec.error || '');
}

// 3) 材质实例
for (const [mp, info] of matSet) {
  const rec = { material: mp, ...info };
  try {
    await load(mp);
    const p = (await get(mp, ['Parent', 'ScalarParameterValues'])).properties;
    rec.parent = p.Parent?.path || null;
    const v = (p.ScalarParameterValues || []).filter(x => x.ParameterInfo?.Name === 'EmissiveDissolve').map(x => x.ParameterValue);
    rec.emissiveDissolve = v; rec.is098 = v.length === 1 && Math.abs(v[0] - 0.98) < 1e-4;
  } catch (e) { rec.error = String(e.message || e); }
  out.materials.push(rec);
}
const f = '现状_' + out.at.slice(0, 16).replace(/[-:T]/g, '') + 'Z.json';
fs.writeFileSync(new URL(f, here), JSON.stringify(out, null, 1));
fs.writeFileSync(new URL('log_' + f, here), JSON.stringify({ requests: LOG.length, failed: LOG.filter(l => !l.ok).length, writes: 0, routes: [...new Set(LOG.map(l => l.route))] }));
const t26 = out.materials.filter(m => m.from === '26目标');
console.log('written', f, 'requests', LOG.length, 'failed', LOG.filter(l => !l.ok).length);
console.log('26 MI 0.98', t26.filter(m => m.is098).length, '/', t26.length, '; 新系统用到的 MI', out.materials.length - t26.length);
