// 只读：把结构变过 / 新进表 / 盒子不是 26 写的几个系统整包爬一遍（发射器 / LOD / 模块 / 分布），
// 外加网格粒子用到的静态网格的包围（ExtendedBounds）。写法同 ../采集/crawl.mjs，只读白名单，顺序单请求。
// 用法：node crawl_some.mjs → raw_some.json（给 bounds_some.py 用）
import fs from 'node:fs';
import { request, LOG } from '../采集/ue_ro.mjs';
const LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const P = n => `/Game/Effects_HD/Props_HD/FireWorks_HD/${n}.${n}`;
const M = n => `/Game/Effects/Props/FireWorks/${n}.${n}`;
const systems = [P('P_EFX_FireWorks_GoldKamuro_HD'), M('P_EFX_FireWorks_GoldKamuro_M'), P('P_EFX_FireWorks_FanSilver_01_HD'),
  P('P_EFX_FireWorks_Comet_Layers_HD'), M('P_EFX_FireWorks_Comet_Layers_M'), P('P_EFX_FireWorks_RiseTrail_Hero_HD'), M('P_EFX_FireWorks_RiseTrail_Hero_M'),
  P('P_EFX_FireWorks_RiseTrail_L_HD'), P('P_EFX_FireWorks_Silver_Layers_S_HD'), P('P_EFX_FireWork_PrismWheels_HD')];
const objects = {}, errors = [], meshes = {};
const refsIn = (v, acc = []) => {
  if (Array.isArray(v)) v.forEach(x => refsIn(x, acc));
  else if (v && typeof v === 'object') { if (v._type === 'object_ref' && v.path) acc.push(v.path); Object.values(v).forEach(x => refsIn(x, acc)); }
  return acc;
};
async function get(path, props) {
  if (!props && path in objects) return objects[path];
  try { const o = await request('/object/get', props ? { path, properties: props } : { path }); if (!props) objects[path] = o; return o; }
  catch (e) { errors.push({ path, error: String(e.message || e) }); if (!props) objects[path] = null; return null; }
}
async function load(path) {
  try { const r = await request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: path.split('.')[0] } }); return String(r.return_value) !== 'None'; }
  catch (e) { errors.push({ path, error: 'LoadAsset ' + String(e.message || e) }); return false; }
}
for (const root of systems) {
  const pkg = root.split('.')[0];
  if (!await load(root)) continue;
  const todo = [root];
  while (todo.length) {
    const p = todo.pop(); const o = await get(p); if (!o) continue;
    for (const q of refsIn(o.properties || {})) {
      if ((q.startsWith(pkg + '.') || q.startsWith(pkg + ':')) && !(q in objects)) todo.push(q);
      else if (/StaticMesh/.test(o.class || '') === false && /\/SM_|StaticMesh/.test(q) && !(q in meshes)) meshes[q] = null;
    }
  }
  console.log(root.split('.').pop(), 'objs', Object.keys(objects).length, 'err', errors.length);
}
// 网格粒子：TypeDataMesh.Mesh
for (const [p, o] of Object.entries(objects)) {
  if (o && /TypeDataMesh/.test(o.class || '') && o.properties?.Mesh?.path) meshes[o.properties.Mesh.path] = null;
}
for (const m of Object.keys(meshes)) {
  await load(m);
  const o = await get(m, ['ExtendedBounds', 'PositiveBoundsExtension', 'NegativeBoundsExtension', 'LightMapCoordinateIndex']);
  meshes[m] = o?.properties || null;
}
fs.writeFileSync(new URL('raw_some.json', import.meta.url) /* 提交前 gzip 成 raw_some.json.gz */, JSON.stringify({ format: 'df.ue-raw-crawl/1', readAt: new Date().toISOString(), systems, objects, meshes, errors }));
console.log('done objects', Object.keys(objects).length, 'meshes', JSON.stringify(meshes).slice(0, 600), 'errors', errors.length, 'requests', LOG.length, 'failed', LOG.filter(l => !l.ok).length);
