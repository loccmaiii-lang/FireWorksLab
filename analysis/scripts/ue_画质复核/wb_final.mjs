// 收尾：借用的 QBL17_TX_30 恢复为借用前（FromTextureGroup + Clamp），解绑 WB17 MI 的引用，注销回调，读回现场并与开工快照比对
import fs from 'node:fs'; import { py, cvar } from './wbue.mjs';
const before = JSON.parse(fs.readFileSync(new URL('./state-before.json', import.meta.url), 'utf8'));
const r = await py(String.raw`import unreal,json,sys
def wb():
 t=unreal.find_object(None,'/Engine/Transient.QBL17_TX_30')
 t.set_editor_property('mip_gen_settings',unreal.TextureMipGenSettings.TMGS_FROM_TEXTURE_GROUP)
 for j in range(6):
  a=unreal.find_object(None,'/Engine/Transient.WB17_MI_'+str(j))
  if a: a.set_editor_property('parent',None)
 m=sys.modules.get('wb17_assets')
 if m: m.refs=[]
 for k in ['wb17_cap','wb17_session']:
  mm=sys.modules.get(k)
  if mm and mm.d.get('h') is not None:
   unreal.unregister_slate_post_tick_callback(mm.d['h']);mm.d['h']=None
  if mm: mm.d.clear()
 if sys.modules.get('wb17_cap') is not None: pass
 v,rot=unreal.EditorLevelLibrary.get_level_viewport_camera_info()
 acts=unreal.EditorLevelLibrary.get_all_level_actors()
 return {'tx30':[str(t.get_editor_property('mip_gen_settings')),str(t.get_editor_property('address_x'))],'camera':[[v.x,v.y,v.z],[rot.pitch,rot.yaw,rot.roll]],'actorCount':len(acts),'own':[a.get_actor_label() for a in acts if a.get_actor_label().startswith('WB17_')],'selected':[a.get_path_name() for a in unreal.EditorLevelLibrary.get_selected_level_actors()],'dirtyContent':sorted(p.get_path_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages()),'dirtyMaps':sorted(p.get_path_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_map_packages())}
print('WB:'+json.dumps(wb()))
del wb`, 120000);
const cv = {}; const diff = [];
for (const k of Object.keys(before.cvars)) { if (typeof before.cvars[k] !== 'string' || before.cvars[k] === '') continue; cv[k] = await cvar(k); if (String(cv[k]) !== String(before.cvars[k])) diff.push([k, before.cvars[k], cv[k]]); }
const camOk = r.camera.flat().every((x, i) => Math.abs(x - before.camera.flat()[i]) < 0.5);
const out = { ...r, camOk, actorDelta: r.actorCount - before.actorCount, dirtyContentSame: JSON.stringify(r.dirtyContent) === JSON.stringify(before.dirtyContent), dirtyMapsSame: JSON.stringify(r.dirtyMaps) === JSON.stringify(before.dirtyMaps), newDirty: r.dirtyContent.filter(p => !before.dirtyContent.includes(p)), cvarDiff: diff };
fs.writeFileSync(new URL('./state-after.json', import.meta.url), JSON.stringify(out, null, 1));
console.log({ tx30: r.tx30, camOk, actorDelta: out.actorDelta, own: r.own, selected: r.selected.length, dirtyContentSame: out.dirtyContentSame, dirtyMapsSame: out.dirtyMapsSame, newDirty: out.newDirty, cvarDiff: diff });
