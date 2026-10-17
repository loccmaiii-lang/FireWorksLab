// 用户本轮明确要求只读测量已导入的GlitterChry。此脚本不生成/保存/修改/播放任何UE对象。
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const out=path.join(root,'analysis/results/GLITTER_TWINKLE_20261017');
const {py,get}=await import(pathToFileURL(process.env.FW_UE_READ_HELPER||'F:/FireWorksLab/analysis/local/QUALITY_REVIEW_20261017/ue/wbue.mjs'));
const src='/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_GlitterChry_HD.P_EFX_FireWorks_GlitterChry_HD';
const scene=await py(String.raw`import unreal,json,math
def vec(v):
 if hasattr(v,'to_vector'):v=v.to_vector()
 if hasattr(v,'x'):return [v.x,v.y,v.z]
 return {'type':type(v).__name__,'text':str(v),'fields':[x for x in dir(v) if not x.startswith('_')]}
def rot(r):return [r.pitch,r.yaw,r.roll]
v,r=unreal.EditorLevelLibrary.get_level_viewport_camera_info()
actors=unreal.EditorLevelLibrary.get_all_level_actors()
out={'editorCamera':{'location_cm':vec(v),'rotation_deg':rot(r),'fov':'未由该API提供'},'selectedActors':[a.get_path_name() for a in unreal.EditorLevelLibrary.get_selected_level_actors()],'selectedAssets':[a.get_path_name() for a in unreal.EditorUtilityLibrary.get_selected_assets()],'actorCount':len(actors),'instances':[],'gameCameras':[],'dirtyMaps':[p.get_path_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_map_packages()],'dirtyContent':[p.get_path_name() for p in unreal.EditorLoadingAndSavingUtils.get_dirty_content_packages()]}
for a in actors:
 for c in a.get_components_by_class(unreal.ParticleSystemComponent):
  t=c.get_editor_property('template')
  if t and 'glitterchry' in t.get_name().lower():
   p=a.get_actor_transform().translation;sc=a.get_actor_scale3d()
   out['instances'].append({'actor':a.get_path_name(),'label':a.get_actor_label(),'template':t.get_path_name(),'component':c.get_path_name(),'location_cm':vec(p),'actorScale':vec(sc),'relativeScale':vec(c.get_editor_property('relative_scale3d')),'relativeLocation_cm':vec(c.get_editor_property('relative_location')),'distanceToEditorCamera_m':math.sqrt((p.x-v.x)**2+(p.y-v.y)**2+(p.z-v.z)**2)/100 if hasattr(p,'x') else None})
worlds=[unreal.EditorLevelLibrary.get_editor_world()]
if hasattr(unreal.EditorLevelLibrary,'get_pie_worlds'):
 try:worlds+=list(unreal.EditorLevelLibrary.get_pie_worlds(False))
 except Exception as e:out['pieQueryError']=str(e)
for w in worlds:
 cm=unreal.GameplayStatics.get_player_camera_manager(w,0)
 if cm:out['gameCameras'].append({'world':w.get_path_name(),'camera':cm.get_path_name(),'location_cm':vec(cm.get_camera_location()),'rotation_deg':rot(cm.get_camera_rotation()),'horizontalFov_deg':cm.get_fov_angle()})
print('WB:'+json.dumps(out))`,60000);
fs.writeFileSync(path.join(out,'UE_只读场景.json'),JSON.stringify(scene,null,2));
console.log('SCENE',JSON.stringify({...scene,dirtyContent:scene.dirtyContent.length,dirtyMaps:scene.dirtyMaps.length}));
const ps=await get(src,['Emitters','SystemUpdateMode','UpdateTime_FPS','bUseFixedRelativeBoundingBox','FixedRelativeBoundingBox']);
const rows=[],textures=[];
for(let i=0;i<ps.Emitters.length;i++){
 const emitter=await get(ps.Emitters[i].path,['EmitterName','LODLevels']);
 const lod=await get(emitter.LODLevels[0].path,['RequiredModule','SpawnModule','Modules','TypeDataModule','bEnabled']);
 const req=await get(lod.RequiredModule.path);
 const mods=[];
 for(const m of lod.Modules){
  const fields={ParticleModuleSize:['StartSize','bConsiderCameraDistanceSizeScalar','StartSizeScalar','EndSizeScalar','bEnabled'],
   ParticleModuleSizeMultiplyLife:['LifeMultiplier','MultiplyX','MultiplyY','MultiplyZ','bEnabled'],
   ParticleModuleLifetime:['Lifetime','bEnabled'],ParticleModuleParameterDynamic:['DynamicParams','bEnabled'],
   ParticleModuleLocation:['StartLocation','bEnabled']}[m.class];
  if(!fields)continue;
  const props=await get(m.path,fields),distributions=[];
  for(const v of Object.values(props)){
   if(v?.Distribution?.path)distributions.push({path:v.Distribution.path,props:await get(v.Distribution.path)});
   if(Array.isArray(v))for(const x of v)if(x.ParamValue?.Distribution?.path)distributions.push({name:x.ParamName,path:x.ParamValue.Distribution.path,props:await get(x.ParamValue.Distribution.path)});
  }
  mods.push({path:m.path,class:m.class,props,distributions});
 }
 rows.push({slot:i,name:emitter.EmitterName,enabled:lod.bEnabled,required:{Material:req.Material,ScreenAlignment:req.ScreenAlignment,EmitterDuration:req.EmitterDuration,EmitterDelay:req.EmitterDelay,PivotOffset:req.PivotOffset},mods});
 if(lod.bEnabled&&/^L[123]_Main$/.test(emitter.EmitterName)){
  const mi=await get(req.Material.path,['TextureParameterValues']);
  textures.push(...mi.TextureParameterValues.filter(x=>x.ParameterInfo.Name==='MainTex').map(x=>({layer:emitter.EmitterName,path:x.ParameterValue.path})));
 }
 console.log('LAYER',i,emitter.EmitterName,lod.bEnabled,mods.filter(m=>m.class==='ParticleModuleSize').map(m=>m.props.StartSize.MaxValueVec));
}
const imports=await py(String.raw`import unreal,json
out=[]
for p in PATHS:
 a=unreal.load_asset(p);d=a.get_editor_property('asset_import_data')
 out.append({'asset':p,'files':list(d.extract_filenames()) if d else []})
print('WB:'+json.dumps(out))`.replace('PATHS',JSON.stringify(textures.map(x=>x.path))));
fs.writeFileSync(path.join(out,'UE_当前资产.json'),JSON.stringify({asset:src,ps,rows,textures,imports,readOnly:true},null,2));
console.log('IMPORTS',JSON.stringify(imports));
console.log('TIMING',ps.SystemUpdateMode,ps.UpdateTime_FPS);
