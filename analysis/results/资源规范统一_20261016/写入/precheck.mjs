// 写之前核对：现场 = 干跑快照（10-16 04:27 读的）？只读。另外只读探一下编辑器环境（当前地图、版本管理是否在线、要用的 Python 函数在不在）。
import fs from 'node:fs';
import { request, get, py, LIB, saveLog } from './ue_rw.mjs';
const t = JSON.parse(fs.readFileSync(new URL('./targets.json', import.meta.url), 'utf8'));
const diffs = [];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const env = await py(`# -*- coding: utf-8 -*-
import unreal, json
out = {}
w = unreal.EditorLevelLibrary.get_editor_world()
out['world'] = w.get_path_name() if w else None
sc = getattr(unreal, 'SourceControl', None)
out['sc_enabled'] = bool(sc and sc.is_enabled())
out['sc_available'] = bool(out['sc_enabled'] and sc.is_available())
out['sc_provider'] = sc.current_provider() if sc and hasattr(sc, 'current_provider') else ''
out['sc_funcs'] = sorted(n for n in dir(sc) if not n.startswith('_')) if sc else []
mel = getattr(unreal, 'MaterialEditingLibrary', None)
out['mel_funcs'] = sorted(n for n in dir(mel) if 'instance' in n) if mel else []
out['eal_funcs'] = sorted(n for n in dir(unreal.EditorAssetLibrary) if 'check' in n or 'save' in n)
out['sys_funcs'] = sorted(n for n in dir(unreal.SystemLibrary) if 'bounds' in n or 'draw_debug_box' in n)
out['ell_funcs'] = sorted(n for n in dir(unreal.EditorLevelLibrary) if 'viewport' in n or 'spawn' in n or 'destroy' in n)
out['has_slate_tick'] = hasattr(unreal, 'register_slate_post_tick_callback')
print('FWL26:' + json.dumps(out))
`);
console.log(JSON.stringify(env, null, 1));
for (const s of t.systems) {
  await request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: s.system.split('.')[0] } });
  const sp = await get(s.system, ['bUseFixedRelativeBoundingBox', 'FixedRelativeBoundingBox']);
  if (!same(sp.bUseFixedRelativeBoundingBox, s.before.bUseFixedRelativeBoundingBox) || !same(sp.FixedRelativeBoundingBox, s.before.FixedRelativeBoundingBox))
    diffs.push({ asset: s.name, field: 'bounds', before: s.before, now: sp });
  for (const e of s.emitters) for (const l of e.lods) {
    const r = await get(l.required, ['ScreenAlignment', 'UVFlippingMode']);
    if (r.ScreenAlignment !== l.before.ScreenAlignment || r.UVFlippingMode !== l.before.UVFlippingMode)
      diffs.push({ asset: s.name, emitter: e.emitter, lod: l.lod, before: l.before, now: r });
  }
}
for (const m of t.materials) {
  await request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: m.material.split('.')[0] } });
  const mp = await get(m.material, ['ScalarParameterValues', 'Parent']);
  const over = (mp.ScalarParameterValues || []).filter(x => x.ParameterInfo?.Name === 'EmissiveDissolve');
  if (!same(over, m.beforeOverride)) diffs.push({ asset: m.name, field: 'EmissiveDissolve', before: m.beforeOverride, now: over });
}
const out = { at: new Date().toISOString(), env, diffs, checked: { systems: t.systems.length, materials: t.materials.length } };
fs.writeFileSync(new URL('./precheck.json', import.meta.url), JSON.stringify(out, null, 1));
saveLog('log_precheck.json');
console.log('diffs', diffs.length, JSON.stringify(diffs).slice(0, 2000));
