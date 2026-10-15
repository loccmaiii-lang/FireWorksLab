// 第 1 步 · 只读爬取：范围内每个粒子系统包里的全部子对象（发射器 / LOD / 模块 / 分布），
// 它们引用的材质实例 → 父材质链，以及根母材质的表达式图（只读属性，不改）。顺序请求。
import fs from 'node:fs';
import { request, LOG } from './ue_ro.mjs';
const LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const rows = JSON.parse(fs.readFileSync('resourcefx_30.json', 'utf8'));
const systems = [];
for (const side of ['pc', 'mobile']) for (const r of rows[side]) for (const k of ['FxSP', 'FxSP_Low', 'FxSP_High']) {
  const v = r[k]; if (v && v !== 'None' && !systems.includes(v)) systems.push(v);
}
console.log('systems', systems.length);
const objects = {}, errors = [];
const refsIn = (v, acc = []) => {
  if (Array.isArray(v)) v.forEach(x => refsIn(x, acc));
  else if (v && typeof v === 'object') { if (v._type === 'object_ref' && v.path) acc.push(v.path); Object.values(v).forEach(x => refsIn(x, acc)); }
  return acc;
};
async function get(path) {
  if (path in objects) return objects[path];
  try { objects[path] = await request('/object/get', { path }); }
  catch (e) { errors.push({ path, error: String(e.message || e) }); objects[path] = null; }
  return objects[path];
}
async function load(path) {
  const pkg = path.split('.')[0];
  try { const ok = await request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: pkg } }); if (String(ok.return_value) === 'None') throw Error('LoadAsset 返回 None'); return true; }
  catch (e) { errors.push({ path, error: 'LoadAsset ' + String(e.message || e) }); return false; }
}
async function crawlPackage(root) {
  const pkg = root.split('.')[0];
  if (!await load(root)) return [];
  const todo = [root], external = [];
  while (todo.length) {
    const p = todo.pop(); const o = await get(p); if (!o) continue;
    for (const q of refsIn(o.properties || {})) {
      if (q.startsWith(pkg + '.') || q.startsWith(pkg + ':')) { if (!(q in objects)) todo.push(q); }
      else if (!external.includes(q)) external.push(q);
    }
  }
  return external;
}
const t0 = Date.now();
const ext = {};
for (const [i, s] of systems.entries()) {
  ext[s] = await crawlPackage(s);
  console.log(i + 1, '/', systems.length, s.split('.').pop(), 'objs', Object.keys(objects).length, 'ext', ext[s].length, 'err', errors.length, Math.round((Date.now() - t0) / 1000), 's');
}
// 材质实例 → 父链
const isMat = q => /\/MaterialInstance|\/Materials?\//.test(q) || /(^|\.)M(I)?_/.test(q.split('.').pop());
const mats = [...new Set(Object.values(ext).flat().filter(isMat))].sort();
const chain = {};
for (const m of mats) {
  let cur = m, n = 0;
  while (cur && !(cur in chain) && n++ < 8) {
    await load(cur); const o = await get(cur); chain[cur] = o ? (o.class || '') : null; if (!o) break;
    cur = o.properties?.Parent?.path || null;
  }
}
// 根母材质（UMaterial）的表达式图：表达式是母材质包里的子对象
const roots = Object.keys(chain).filter(p => objects[p] && /\.Material$|Engine\.Material$/.test(objects[p].class || '') );
for (const r of roots) {
  const pkg = r.split('.')[0];
  const todo = refsIn(objects[r].properties || {}).filter(q => q.startsWith(pkg + '.') || q.startsWith(pkg + ':'));
  while (todo.length) {
    const p = todo.pop(); if (p in objects) continue; const o = await get(p); if (!o) continue;
    for (const q of refsIn(o.properties || {})) if ((q.startsWith(pkg + '.') || q.startsWith(pkg + ':')) && !(q in objects)) todo.push(q);
  }
}
console.log('materials', mats.length, 'chain', Object.keys(chain).length, 'roots', roots.length, 'objs', Object.keys(objects).length, 'err', errors.length);
fs.writeFileSync('raw_crawl.json', JSON.stringify({ format: 'df.ue-raw-crawl/1', readAt: new Date().toISOString(), systems, external: ext, materials: mats, chain, roots, objects, errors }));
fs.writeFileSync('log_crawl.json', JSON.stringify(LOG));
console.log('done', Object.keys(objects).length, 'objects', errors.length, 'errors', Math.round((Date.now() - t0) / 1000), 's', 'requests', LOG.length, 'failed', LOG.filter(l => !l.ok).length);
