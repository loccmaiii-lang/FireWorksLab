// 只读：第 2 步保存过的 115 包 + 3 个待补系统，现在 UE 里的四项是什么（不写、不存、不迁出）。
// 用法：node now_check.mjs → 写 写入/现状核对_<时间>.json
import fs from 'node:fs';
import { request } from '../采集/ue_ro.mjs';
const LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const here = new URL('./', import.meta.url);
const plan = JSON.parse(fs.readFileSync(new URL('final_targets.json', here), 'utf8'));
const after = JSON.parse(fs.readFileSync(new URL('../改后读回.json', here), 'utf8'));
const get = async (p, props) => (await request('/object/get', { path: p, properties: props })).properties;
const load = p => request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: p.split('.')[0] } });
const out = { at: new Date().toISOString(), systems: [], materials: [] };
const savedPS = new Map(after.systems.map(s => [s.name, s]));
for (const s of plan.systems) {
  await load(s.system);
  const p = await get(s.system, ['bUseFixedRelativeBoundingBox', 'FixedRelativeBoundingBox', 'Emitters']);
  const b = p.FixedRelativeBoundingBox;
  const rec = { name: s.name, saved: savedPS.has(s.name), fixed: p.bUseFixedRelativeBoundingBox,
    box: [b.Min.X, b.Min.Y, b.Min.Z, b.Max.X, b.Max.Y, b.Max.Z], emitterCount: (p.Emitters || []).length, emitters: [] };
  if (s.writeBounds) rec.boundsMatch = rec.fixed === true && [...s.bounds.min, ...s.bounds.max].every((v, i) => Math.abs(v - rec.box[i]) < 1e-3);
  for (const e of s.emitters) for (const l of e.lods) {
    let q = null;
    try { q = await get(l.required, ['ScreenAlignment', 'UVFlippingMode']); } catch (err) { q = { error: String(err.message || err) }; }
    rec.emitters.push({ emitter: e.emitter, lod: l.lod, want: e.set, now: q, match: !!q && Object.entries(e.set).every(([k, v]) => q[k] === v) });
  }
  out.systems.push(rec);
}
for (const m of plan.materials) {
  await load(m.material);
  const p = await get(m.material, ['ScalarParameterValues']);
  const v = (p.ScalarParameterValues || []).filter(x => x.ParameterInfo?.Name === 'EmissiveDissolve').map(x => x.ParameterValue);
  out.materials.push({ name: m.name, override: v, match: v.length === 1 && Math.abs(v[0] - 0.98) < 1e-4 });
}
const f = '现状核对_' + out.at.slice(0, 16).replace(/[-:T]/g, '') + '.json';
fs.writeFileSync(new URL(f, here), JSON.stringify(out, null, 1));
const badPS = out.systems.filter(s => (s.boundsMatch === false) || s.emitters.some(e => !e.match));
const badMI = out.materials.filter(m => !m.match);
console.log(f, 'PS', out.systems.length, '不一致', badPS.length, 'MI', out.materials.length, '不一致', badMI.length);
for (const s of badPS) console.log(' PS', s.name, 'fixed', s.fixed, 'box', s.box.join(','), 'boundsMatch', s.boundsMatch, 'emitters', s.emitterCount, s.emitters.filter(e => !e.match).map(e => e.emitter + ':' + JSON.stringify(e.now)).join(' '));
for (const m of badMI) console.log(' MI', m.name, JSON.stringify(m.override));
