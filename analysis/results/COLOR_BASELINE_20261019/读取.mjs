// T22 / T20 封板基线（烟花编排（22）-本机，2026-10-19）：只读。
// 读：封板编排用到的每个 ResourceId（PC / 手游表）→ 粒子系统 → 每个发射器每级 LOD 的 Required / TypeData / 模块（分布对象展开到关键帧）→ 材质实例 → 贴图属性。
// 只用 /datatable/search、/object/search、/object/get，和一次只读 Python（load_asset + get_editor_property）读贴图尺寸 / 流送 / Mip。不保存、不改值。
// 用法：node analysis/results/COLOR_BASELINE_20261019/读取.mjs <一张表.json> <输出 raw.json>
import fs from 'node:fs';
import http from 'node:http';

const [tablePath, outPath] = process.argv.slice(2);
if (!tablePath || !outPath) throw Error('用法：读取.mjs <一张表> <raw.json>');
if (fs.existsSync(outPath)) throw Error('输出已存在，不覆盖');
const TABLES = {pc: '/Game/R13N/Common/PC/DataTables/Resource/ResourceFXTable', mobile: '/Game/DataTables/Resource/ResourceFXTable'};
const PY = '/Script/PythonScriptPlugin.Default__PythonScriptLibrary';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let n = 0;
function send(route, payload, timeout = 60000) {
  if (!['/datatable/search', '/object/search', '/object/get', '/object/call'].includes(route)) throw Error('只读：不允许 ' + route);
  if (route === '/object/call' && !(payload.path === PY && payload.function === 'ExecutePythonCommandEx')) throw Error('只允许只读 Python');
  const b = Buffer.from(JSON.stringify(payload));
  return new Promise((resolve, reject) => {
    const q = http.request('http://127.0.0.1:17780/gpcli' + route, {agent: false, method: 'POST', headers: {'Content-Type': 'text/plain', 'Content-Length': b.length}}, r => {
      let s = ''; r.setEncoding('utf8'); r.on('data', c => s += c);
      r.on('end', () => { try { const v = JSON.parse(s); resolve({status: r.statusCode, v}); } catch (e) { reject(e); } });
    });
    q.on('error', reject); q.setTimeout(timeout, () => q.destroy(Error('UE timeout'))); q.end(b);
  });
}
async function req(route, payload, timeout) {
  for (let i = 0; i < 8; i++) {
    try {
      const {status, v} = await send(route, payload, timeout); n++;
      await sleep(120);
      if (status === 200 && v.success !== false) return v.data ?? v;
      if (i >= 2) return null;
      await sleep(1500);
    } catch (e) { await sleep(2000 + 1500 * i); }
  }
  throw Error('连不上 GPUECli：' + route + ' ' + JSON.stringify(payload).slice(0, 160));
}
const cache = new Map();
async function get(p) {
  if (!p) return null;
  if (!cache.has(p)) cache.set(p, await req('/object/get', {path: p}));
  return cache.get(p);
}
const ref = x => (x && typeof x === 'object' && x._type === 'object_ref') ? x.path : null;
async function expand(v, depth = 0) {
  if (!v || typeof v !== 'object' || depth > 6) return v;
  if (Array.isArray(v)) { const a = []; for (const x of v) a.push(await expand(x, depth + 1)); return a; }
  if (v._type === 'object_ref') {
    if (/^Distribution/.test(v.class || '')) { const o = await get(v.path); return {class: v.class, value: o ? await expand(o.properties, depth + 1) : null}; }
    return {ref: v.path, class: v.class};
  }
  const o = {};
  for (const [k, x] of Object.entries(v)) { if (k === 'Table') continue; o[k] = await expand(x, depth + 1); }
  return o;
}
// —— 1. 编排用到的 ResourceId（按平台）——
const Q = {EQuality_VeryLow: 0, EQuality_Low: 1, EQuality_Medium: 2, EQuality_High: 3, EQuality_Epic: 4};
const ok = (f, plat, tier) => !f || (!(f.PlatformFlags != null && !(f.PlatformFlags & plat)) && !(f.MinQualityLevel != null && (Q[f.MinQualityLevel] ?? 0) > tier));
const dt = JSON.parse(fs.readFileSync(tablePath, 'utf8'));
const subs = new Map(dt.EffectSubTemplates.map(s => [s.TemplateName, s])), tpls = new Map(dt.EffectTemplates.map(t => [t.TemplateName, t]));
const usage = {pc: {}, mobile: {}};
for (const [side, plat] of [['pc', 12], ['mobile', 2]]) for (const [tier, tq] of [['high', 3], ['medium', 2], ['low', 0]]) {
  for (const g of dt.EffectScheduleGroups) for (const s of g.Slots) {
    if (!ok(s.Filter, plat, tq)) continue; const t = tpls.get(s.TemplateName); if (!ok(t.Filter, plat, tq)) continue;
    for (const e of t.Entries) {
      if (!ok(e.Filter, plat, tq) || !e.SubTemplateName) continue;
      for (const x of subs.get(e.SubTemplateName).Entries) {
        if (!ok(x.Filter, plat, tq) || !x.FXResourceId) continue;
        const u = usage[side][x.FXResourceId] ??= {high: [], medium: [], low: []};
        const sc = (x.EffectScale?.X ?? 1) * (e.EffectScale?.X ?? 1), z = (e.PositionOffset?.Z ?? 0) + (x.PositionOffset?.Z ?? 0);
        u[tier].push([+(s.StartTime + e.LocalTimeOffset + x.LocalTimeOffset).toFixed(4), e.SlotIndex ?? null, +sc.toFixed(6), +(z / 100).toFixed(1)]);
      }
    }
  }
}
const out = {format: 'df.color-baseline-raw/1', readAt: new Date().toISOString(), table: tablePath, usage, rows: {pc: {}, mobile: {}}, systems: {}, materials: {}, textures: {}, errors: []};
const save = () => fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
// —— 2. 表行 ——
for (const side of ['pc', 'mobile']) for (const rid of Object.keys(usage[side])) {
  const d = await req('/datatable/search', {table: TABLES[side], field: 'ResourceId', value: rid, limit: 20});
  const m = (d?.matches || []).filter(x => x.ResourceId === rid);
  if (m.length !== 1) out.errors.push({side, rid, error: '表里找到 ' + m.length + ' 行'});
  out.rows[side][rid] = m.map(x => ({row: x._row_name, desc: x.RowDescription, ResourceId: x.ResourceId, FxSP: x.FxSP, FxSP_Low: x.FxSP_Low, FxSP_High: x.FxSP_High, EffectScale: x.EffectScale, FXType: x.FXType, MaxInstanceNum: x.MaxInstanceNum}));
}
save(); console.log('rows', Object.keys(out.rows.pc).length, Object.keys(out.rows.mobile).length, 'requests', n);
// —— 3. 粒子系统 ——
const paths = new Set();
for (const side of ['pc', 'mobile']) for (const rs of Object.values(out.rows[side])) for (const r of rs) for (const f of ['FxSP', 'FxSP_Low', 'FxSP_High']) if (typeof r[f] === 'string' && r[f].startsWith('/Game/')) paths.add(r[f]);
const mats = new Set();
const KEEP = /^(Lifetime|Size|SizeMultiplyLife|SizeScale|Color|Color_Seeded|ColorOverLife|ColorScaleOverLife|ParameterDynamic|ParameterDynamic_Seeded|Location|LocationPrimitiveSphere|Velocity|AccelerationDrag|AccelerationConstant|Rotation|RotationRate|SubUV|PivotOffset|SpawnPerUnit|EventGenerator|EventReceiverSpawn|LightBase|Light)/;
for (const sp of paths) {
  const o = await get(sp);
  if (!o) { out.systems[sp] = null; out.errors.push({system: sp, error: '读不到'}); continue; }
  const p = o.properties || {};
  const sys = {class: o.class, LODMethod: p.LODMethod, LODDistances: p.LODDistances, LODDistanceCheckTime: p.LODDistanceCheckTime, UpdateTime_FPS: p.UpdateTime_FPS, WarmupTime: p.WarmupTime,
    bUseFixedRelativeBoundingBox: p.bUseFixedRelativeBoundingBox, FixedRelativeBoundingBox: p.FixedRelativeBoundingBox, emitters: []};
  for (const e of p.Emitters || []) {
    const eo = await get(ref(e)); const ep = eo?.properties || {};
    const em = {name: ep.EmitterName, path: ref(e), DetailMode: ep.DetailMode, bIsSoloing: ep.bIsSoloing, lods: []};
    for (const l of ep.LODLevels || []) {
      const lo = await get(ref(l)); const lp = lo?.properties || {};
      const rq = await get(ref(lp.RequiredModule)); const rp = rq?.properties || {};
      const lod = {level: lp.Level, enabled: lp.bEnabled, typeData: lp.TypeDataModule ? (await get(ref(lp.TypeDataModule)))?.class : null,
        required: Object.fromEntries(['Material', 'ScreenAlignment', 'EmitterDuration', 'EmitterDurationLow', 'EmitterDelay', 'EmitterLoops', 'bUseLocalSpace', 'SubImages_Horizontal', 'SubImages_Vertical', 'InterpolationMethod', 'UVFlippingMode', 'bUseMaxDrawCount', 'MaxDrawCount', 'SortMode', 'OpacitySourceMode'].map(k => [k, k === 'Material' ? ref(rp[k]) : rp[k]])),
        spawn: null, modules: []};
      if (lod.required.Material) mats.add(lod.required.Material);
      const so = await get(ref(lp.SpawnModule)); if (so) lod.spawn = await expand(Object.fromEntries(['Rate', 'RateScale', 'BurstList', 'BurstScale'].map(k => [k, so.properties?.[k]])));
      for (const m of lp.Modules || []) {
        const mo = await get(ref(m)); const cls = (mo?.class || '').split('.').pop().replace('ParticleModule', '');
        const rec = {class: cls, path: ref(m), enabled: mo?.properties?.bEnabled};
        if (KEEP.test(cls) && mo) {
          const props = {};
          for (const [k, v] of Object.entries(mo.properties)) if (!/^(b3D|bSupported3D|ModuleEditorColor|bEditable|LODDuplicate|bSupportsRandomSeed|bRequiresLoopingNotification|LODValidity|bSpawnModule|bUpdateModule|bFinalUpdateModule|bUpdateForGPUEmitter|bCurvesAsColor)/.test(k)) props[k] = await expand(v);
          rec.props = props;
        }
        lod.modules.push(rec);
      }
      em.lods.push(lod);
    }
    sys.emitters.push(em);
  }
  out.systems[sp] = sys; save(); console.log('system', sp.split('.').pop(), 'emitters', sys.emitters.length, 'requests', n);
}
// —— 4. 材质实例 ——
for (const mp of mats) {
  const o = await get(mp); const p = o?.properties || {};
  out.materials[mp] = o ? {class: o.class, Parent: ref(p.Parent), BasePropertyOverrides: p.BasePropertyOverrides,
    textures: (p.TextureParameterValues || []).map(x => ({name: x.ParameterInfo?.Name, texture: ref(x.ParameterValue)})),
    scalars: (p.ScalarParameterValues || []).map(x => ({name: x.ParameterInfo?.Name, value: x.ParameterValue})),
    vectors: (p.VectorParameterValues || []).map(x => ({name: x.ParameterInfo?.Name, value: x.ParameterValue}))} : null;
}
save(); console.log('materials', mats.size, 'requests', n);
// —— 5. 贴图（只读 Python）——
const tex = [...new Set(Object.values(out.materials).flatMap(m => (m?.textures || []).map(t => t.texture)).filter(Boolean))];
const code = `# -*- coding: utf-8 -*-
import unreal,json
out={}
for path in json.loads(${JSON.stringify(JSON.stringify(tex))}):
 r={}
 try:
  t=unreal.load_asset(path)
  r={'w':t.blueprint_get_size_x(),'h':t.blueprint_get_size_y()}
  for k in ['never_stream','mip_gen_settings','address_x','address_y','lod_group','compression_settings','max_texture_size','srgb','filter']:
   try:r[k]=unicode(t.get_editor_property(k))
   except Exception as e:r[k]='ERR '+unicode(e)
 except Exception as e:r={'error':unicode(e)}
 out[path]=r
print('WB:'+json.dumps(out))`;
const d = await req('/object/call', {path: PY, function: 'ExecutePythonCommandEx', args: {PythonCommand: code, ExecutionMode: 'ExecuteFile', FileExecutionScope: 'Private'}}, 300000);
const line = [...String(d?.out_LogOutput || '').matchAll(/Output="((?:[^"\\]|\\.)*)"/g)].map(m => m[1].replace(/\\(.)/g, (_, c) => c === 'n' ? '\n' : c === 't' ? '\t' : c)).find(s => s.startsWith('WB:'));
if (line) out.textures = JSON.parse(line.slice(3)); else out.errors.push({textures: '只读 Python 没返回', result: d?.out_CommandResult});
out.requests = n; out.finishedAt = new Date().toISOString(); save();
console.log('textures', Object.keys(out.textures).length, 'errors', out.errors.length, 'requests', n);
