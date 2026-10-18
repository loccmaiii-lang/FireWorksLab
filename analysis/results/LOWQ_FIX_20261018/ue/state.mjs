// 只读现场快照：关卡、机位、选择、Actor 数、自建对象残留、脏包、相关 CVar
import fs from 'node:fs'; import { py, cvar } from './fue.mjs';
const out = process.argv[2] ?? 'state-before.json';
const scene = await py(String.raw`import unreal,json
def fwl():
 w=unreal.EditorLevelLibrary.get_editor_world()
 v,r=unreal.EditorLevelLibrary.get_level_viewport_camera_info()
 acts=unreal.EditorLevelLibrary.get_all_level_actors()
 own=[a.get_actor_label() for a in acts if a.get_actor_label().startswith('FWL18_')]
 tmp=[p for p in ['/Engine/FWL18_TMP'] if unreal.EditorAssetLibrary.does_directory_exist(p)]
 return {'world':w.get_path_name(),'camera':[[v.x,v.y,v.z],[r.pitch,r.yaw,r.roll]],'selected':[a.get_path_name() for a in unreal.EditorLevelLibrary.get_selected_level_actors()],'actorCount':len(acts),'own':own,'tmpDirs':tmp,'dirtyContent':sorted(p.get_path_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages()),'dirtyMaps':sorted(p.get_path_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_map_packages())}
print('FWL18:'+json.dumps(fwl()))
del fwl`);
const keys = ['r.MaxAnisotropy', 'r.Streaming.MipBias', 'r.SeparateTranslucencyScreenPercentage', 'r.MaterialQualityLevel', 'r.Streaming.PoolSize', 'r.Streaming.DropMips', 'r.TextureStreaming', 'r.ScreenPercentage', 't.MaxFPS', 'r.EmitterSpawnRateScale', 'fx.EffectQualityLevel', 'fx.ParticleEffectQuality', 'r.TextureGroupQuality', 'r.dta.mipbias', 'sg.TextureQuality', 'sg.EffectsQuality'];
const cvars = {}; for (const k of keys) { try { cvars[k] = await cvar(k); } catch (e) { cvars[k] = 'ERR ' + String(e.message).slice(0, 80); } }
fs.writeFileSync(new URL('./' + out, import.meta.url), JSON.stringify({ at: new Date().toISOString(), ...scene, cvars }, null, 1));
console.log({ out, world: scene.world, camera: scene.camera, actorCount: scene.actorCount, own: scene.own, tmpDirs: scene.tmpDirs, selected: scene.selected.length, dirtyContent: scene.dirtyContent, dirtyMaps: scene.dirtyMaps.length, cvars });
