// 现场快照（只读）：机位、选择、脏包、Actor 数、相关 CVar（DFM 低档四组 @0 的全部键 + 透明通道/帧率）
import fs from 'node:fs'; import { py } from './wbue.mjs';
const out = process.argv[2] ?? 'state-before.json';
const parsed = {};
for (const file of ['E:/loc_ma5/DFMEditor/Engine/Config/BaseScalability.ini', 'E:/loc_ma5/DFMEditor/DFM/Config/DefaultScalability.ini']) {
  let section = '';
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const s = line.trim();
    if (s.startsWith('[')) { section = s.slice(1, s.indexOf(']')); parsed[section] ??= {}; }
    else if (s && !s.startsWith(';') && s.includes('=')) { const [k, ...vs] = s.split('='); parsed[section][k.trim()] = vs.join('=').split(';')[0].trim(); }
  }
}
const groups = ['TextureQuality', 'EffectsQuality', 'AntiAliasingQuality', 'PostProcessQuality'];
const low = Object.assign({}, ...groups.map(g => parsed[g + '@0'] ?? {}));
Object.assign(low, { 'r.SeparateTranslucencyScreenPercentage': '50', 'r.SeparateTranslucencyAutoDownsample': '0', 'r.VRSEnable': '0', 't.MaxFPS': '30' });
const keys = Object.keys(low).filter(k => /^[a-z]/i.test(k));
const code = String.raw`import unreal,json
def wb():
 w=unreal.EditorLevelLibrary.get_editor_world()
 v,r=unreal.EditorLevelLibrary.get_level_viewport_camera_info()
 acts=unreal.EditorLevelLibrary.get_all_level_actors()
 cv={}
 for k in json.loads(KEYS):
  try:
   cv[k]=unreal.SystemLibrary.get_console_variable_float_value(k) if False else None
  except Exception as e:
   cv[k]=None
 return {'world':w.get_path_name(),'camera':[[v.x,v.y,v.z],[r.pitch,r.yaw,r.roll]],'selected':[a.get_path_name() for a in unreal.EditorLevelLibrary.get_selected_level_actors()],'actorCount':len(acts),'own':[a.get_actor_label() for a in acts if a.get_actor_label().startswith('WB17_')],'dirtyContent':sorted(p.get_path_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages()),'dirtyMaps':sorted(p.get_path_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_map_packages())}
print('WB:'+json.dumps(wb()))
del wb`.replace('KEYS', JSON.stringify(JSON.stringify(keys)));
const scene = await py(code);
const { cvar } = await import('./wbue.mjs');
const cvars = {};
for (const k of keys) { try { cvars[k] = await cvar(k); } catch (e) { cvars[k] = { error: String(e).slice(0, 120) }; } }
const r = { at: new Date().toISOString(), ...scene, cvars, low };
fs.writeFileSync(new URL('./' + out, import.meta.url), JSON.stringify(r, null, 1));
console.log({ out, world: r.world, actorCount: r.actorCount, own: r.own, selected: r.selected.length, dirtyContent: r.dirtyContent.length, dirtyMaps: r.dirtyMaps.length, cvarCount: keys.length, aniso: cvars['r.MaxAnisotropy'], mipBias: cvars['r.Streaming.MipBias'], trans: cvars['r.SeparateTranslucencyScreenPercentage'], spawn: cvars['r.EmitterSpawnRateScale'] });
