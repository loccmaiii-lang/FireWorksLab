// 现场快照（只读）：地图、PIE、机位、选择、脏包、WB 前缀临时 Actor
import fs from 'node:fs'; import { py } from './t19ue.mjs';
const out = process.argv[2];
const code = String.raw`import unreal,json
def wb():
 w=unreal.EditorLevelLibrary.get_editor_world()
 v,r=unreal.EditorLevelLibrary.get_level_viewport_camera_info()
 acts=unreal.EditorLevelLibrary.get_all_level_actors()
 pie=unreal.EditorLevelLibrary.get_game_world() if hasattr(unreal.EditorLevelLibrary,'get_game_world') else None
 return {'world':w.get_path_name(),'pie':str(pie.get_path_name()) if pie else None,'camera':[[v.x,v.y,v.z],[r.pitch,r.yaw,r.roll]],'selected':[a.get_path_name() for a in unreal.EditorLevelLibrary.get_selected_level_actors()],'actorCount':len(acts),'wbActors':[a.get_actor_label() for a in acts if a.get_actor_label().startswith(('WB17_','WB19_','QBL','MW2V','MESHWILLOW','RSU26'))],'dirtyContent':sorted(p.get_path_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages()),'dirtyMaps':sorted(p.get_path_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_map_packages()),'cbKeys':[k for k in __import__('sys').modules if k.startswith(('wb17','wb19','t18','qbl','mw'))]}
print('WB:'+json.dumps(wb()))
del wb`;
const r = { at: new Date().toISOString(), ...(await py(code)) };
if (out) fs.writeFileSync(out, JSON.stringify(r, null, 1));
console.log({ ...r, dirtyContent: r.dirtyContent.length + ' 个', dirtyMaps: r.dirtyMaps });
