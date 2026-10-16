// 资源规范统一（26）写入操作（都走 ue_rw.mjs 的护栏：只写 targets.json 里的包）。
import fs from 'node:fs';
import { request, get, set, py, LIB } from './ue_rw.mjs';
export const T = JSON.parse(fs.readFileSync(new URL('./targets.json', import.meta.url), 'utf8'));
export const SYS = Object.fromEntries(T.systems.map(s => [s.name, s]));
export const MAT = Object.fromEntries(T.materials.map(m => [m.name, m]));
const UE_SRC = fs.readFileSync(new URL('./rsu26_ue.py', import.meta.url), 'utf8');
export const TMP = 'F:/FireWorksLab/analysis/local/RSU26_tmp';
// 调 rsu26_ue.py 里的函数
export async function ue(call, timeout = 120000) {
  return py(UE_SRC + `\nimport json as _j\n_r = ${call}\nprint('FWL26:' + _j.dumps(_r))\n`, timeout);
}
export const pyJson = v => `json.loads(${JSON.stringify(JSON.stringify(v))})`;
const boxTxt = (mn, mx) => `(Min=(X=${mn[0]},Y=${mn[1]},Z=${mn[2]}),Max=(X=${mx[0]},Y=${mx[1]},Z=${mx[2]}),IsValid=1)`;
export async function load(p) { await request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: p.split('.')[0] } }); }
// 让粒子系统按新值重建（导入器 / tail-restore 同一个写法：原值写回 ThumbnailWarmup 触发 PostEditChange）
export async function rebuild(sysPath) {
  const tw = (await get(sysPath, ['ThumbnailWarmup'])).ThumbnailWarmup;
  await set(sysPath, { ThumbnailWarmup: tw });
}
export async function setDynamic(name) {
  const s = SYS[name]; await load(s.system);
  await set(s.system, { bUseFixedRelativeBoundingBox: false });
}
export async function setPlanBounds(name) {
  const s = SYS[name]; await load(s.system);
  await set(s.system, { bUseFixedRelativeBoundingBox: true, FixedRelativeBoundingBox: boxTxt(s.bounds.min, s.bounds.max) });
}
export async function restoreBounds(name) {
  const s = SYS[name]; await load(s.system); const b = s.before.FixedRelativeBoundingBox;
  await set(s.system, { bUseFixedRelativeBoundingBox: s.before.bUseFixedRelativeBoundingBox, FixedRelativeBoundingBox: boxTxt([b.Min.X, b.Min.Y, b.Min.Z], [b.Max.X, b.Max.Y, b.Max.Z]) });
}
// 发射器四项：which = 'final'（按 targets 的 set）/ 'before'（还原）/ 或者自定义 {emitterIndex: {ScreenAlignment:..}}
export async function setEmitters(name, which = 'final', custom = null) {
  const s = SYS[name]; await load(s.system); let n = 0;
  for (const e of s.emitters) for (const l of e.lods) {
    let props = which === 'before' ? { ...l.before } : which === 'final' ? { ...e.set } : (custom?.[e.index] || null);
    if (!props) continue;
    for (const k of Object.keys(props)) if (props[k] == null) delete props[k];
    if (Object.keys(props).length) { await set(l.required, props); n++; }
  }
  if (n) await rebuild(s.system);
  return n;
}
// 材质实例 EmissiveDissolve（MaterialEditingLibrary：没有覆盖的会加一条覆盖，有的改值；母材质不动）
export async function setMI(names, value) {
  const paths = names.map(n => MAT[n].material);
  return py(`# -*- coding: utf-8 -*-
import unreal, json
out = []
for p, v in json.loads(${JSON.stringify(JSON.stringify(paths.map(p => [p, value])))}):
    mi = unreal.load_asset(p.split('.')[0])
    if not isinstance(mi, unreal.MaterialInstanceConstant):
        out.append([p, 'not MIC']); continue
    before = unreal.MaterialEditingLibrary.get_material_instance_scalar_parameter_value(mi, 'EmissiveDissolve')
    ok = unreal.MaterialEditingLibrary.set_material_instance_scalar_parameter_value(mi, 'EmissiveDissolve', float(v))
    unreal.MaterialEditingLibrary.update_material_instance(mi)
    after = unreal.MaterialEditingLibrary.get_material_instance_scalar_parameter_value(mi, 'EmissiveDissolve')
    out.append([p, bool(ok), before, after])
print('FWL26:' + json.dumps(out))
`);
}
// 材质实例还原成改之前（之前没有覆盖的：去掉这一条覆盖；有的：写回原值）
export async function restoreMI(names) {
  const items = names.map(n => [MAT[n].material, MAT[n].beforeOverride.length ? MAT[n].beforeOverride[0].ParameterValue : null]);
  return py(`# -*- coding: utf-8 -*-
import unreal, json
out = []
for p, v in json.loads(${JSON.stringify(JSON.stringify(items))}):
    mi = unreal.load_asset(p.split('.')[0])
    if v is None:
        arr = [x for x in mi.get_editor_property('scalar_parameter_values') if str(x.get_editor_property('parameter_info').get_editor_property('name')) != 'EmissiveDissolve']
        mi.set_editor_property('scalar_parameter_values', arr)
    else:
        unreal.MaterialEditingLibrary.set_material_instance_scalar_parameter_value(mi, 'EmissiveDissolve', float(v))
    unreal.MaterialEditingLibrary.update_material_instance(mi)
    out.append([p, v, unreal.MaterialEditingLibrary.get_material_instance_scalar_parameter_value(mi, 'EmissiveDissolve')])
print('FWL26:' + json.dumps(out))
`);
}
// 每个系统用到的、在 targets 里的材质实例
export function misOf(name) {
  const dry = JSON.parse(fs.readFileSync(new URL('../干跑.json', import.meta.url), 'utf8'));
  return dry.materials.filter(m => MAT[m.name] && m.usedBy.some(u => u.system === name)).map(m => m.name);
}
