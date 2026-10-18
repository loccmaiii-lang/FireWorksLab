// 收尾：确认没有 FWL18_ Actor → 材质实例副本解绑 → 删 /Engine/FWL18_TMP 下 9 个临时贴图（复制接口自动落盘的）→ 恢复视口机位 / 选择 → 和开工快照比对
import fs from 'node:fs'; import { execFileSync } from 'node:child_process'; import { py, cvar } from './fue.mjs';
const before = JSON.parse(fs.readFileSync(new URL('./state-before.json', import.meta.url), 'utf8'));
const setup = JSON.parse(fs.readFileSync(new URL('./setup.json', import.meta.url), 'utf8'));
const node = (...a) => execFileSync(process.execPath, ['cap.mjs', ...a], { cwd: new URL('.', import.meta.url), encoding: 'utf8' });
console.log(node('cleanup').trim());
const texs = setup.textures.map(t => t.tex.split('.')[0]), mis = setup.mis.map(m => m.mi);
if (!texs.every(p => /^\/Engine\/FWL18_TMP\/FWL18_TX_\w+$/.test(p))) throw Error('删除清单里有不是自建临时贴图的路径');
const r = await py(`import unreal,json,sys
def fwl():
 out={'sc':[],'deleted':[],'unbound':0}
 for p in json.loads(${JSON.stringify(JSON.stringify(mis))}):
  mi=unreal.find_object(None,p)
  if mi:
   mi.set_editor_property('parent',None);out['unbound']+=1
 m=sys.modules.get('fwl18_assets')
 if m: m.refs=[]
 for p in json.loads(${JSON.stringify(JSON.stringify(texs))}):
  if not unreal.EditorAssetLibrary.does_asset_exist(p): continue     # 10-18 第一次收尾断连后已逐个删掉的跳过
  s=unreal.SourceControl.query_file_state(p)
  out['sc'].append([p,bool(s.is_source_controlled),bool(s.is_added),bool(s.is_checked_out)])
  out['deleted'].append([p,bool(unreal.EditorAssetLibrary.delete_asset(p))])
 if unreal.EditorAssetLibrary.does_directory_exist('/Engine/FWL18_TMP'):
  out['dirDeleted']=bool(unreal.EditorAssetLibrary.delete_directory('/Engine/FWL18_TMP'))
 out['dirExists']=unreal.EditorAssetLibrary.does_directory_exist('/Engine/FWL18_TMP')
 return out
print('FWL18:'+json.dumps(fwl()))
del fwl`, 300000);
console.log(JSON.stringify(r));
console.log(node('restore').trim());
const after = await py(String.raw`import unreal,json
def fwl():
 v,r=unreal.EditorLevelLibrary.get_level_viewport_camera_info()
 acts=unreal.EditorLevelLibrary.get_all_level_actors()
 return {'world':unreal.EditorLevelLibrary.get_editor_world().get_path_name(),'camera':[[v.x,v.y,v.z],[r.pitch,r.yaw,r.roll]],'selected':[a.get_path_name() for a in unreal.EditorLevelLibrary.get_selected_level_actors()],'actorCount':len(acts),'own':[a.get_actor_label() for a in acts if a.get_actor_label().startswith('FWL18_')],'dirtyContent':sorted(p.get_path_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages()),'dirtyMaps':sorted(p.get_path_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_map_packages())}
print('FWL18:'+json.dumps(fwl()))
del fwl`);
const cv = {}, cvDiff = []; for (const k of Object.keys(before.cvars)) { cv[k] = await cvar(k).catch(e => 'ERR'); if (String(cv[k]) !== String(before.cvars[k])) cvDiff.push([k, before.cvars[k], cv[k]]); }
const diskLeft = fs.existsSync('E:/loc_ma5/DFMEditor/Engine/Content/FWL18_TMP') ? fs.readdirSync('E:/loc_ma5/DFMEditor/Engine/Content/FWL18_TMP') : null;
const out = { at: new Date().toISOString(), cleanup: r, ...after, camOk: after.camera.flat().every((x, i) => Math.abs(x - before.camera.flat()[i]) < 0.5), actorDelta: after.actorCount - before.actorCount,
  selectedSame: JSON.stringify(after.selected) === JSON.stringify(before.selected), dirtyContentSame: JSON.stringify(after.dirtyContent) === JSON.stringify(before.dirtyContent),
  dirtyMapsSame: JSON.stringify(after.dirtyMaps) === JSON.stringify(before.dirtyMaps), newDirty: after.dirtyContent.filter(p => !before.dirtyContent.includes(p)), cvDiff, diskLeft };
fs.writeFileSync(new URL('./state-after.json', import.meta.url), JSON.stringify(out, null, 1));
console.log({ camOk: out.camOk, actorDelta: out.actorDelta, own: after.own, selectedSame: out.selectedSame, dirtyContentSame: out.dirtyContentSame, dirtyMapsSame: out.dirtyMapsSame, newDirty: out.newDirty, cvDiff, diskLeft });
