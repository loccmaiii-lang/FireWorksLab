// Single-shot diagnostic copies and narrowly-scoped final fix.
import {req,py,get,save} from './quality_probe.mjs';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const OUT=path.join(ROOT,'analysis/results/MESH_WILLOW_20261016/QUALITY_REPEAT_1725');
const SB='/Game/Effects_HD/_Sandbox/MW2_Verify_20261016';const USER=SB+'/PS_FixedR.PS_FixedR';
const mode=process.argv[2];
function txt(v){if(v===null)return 'None';if(typeof v==='number')return String(v);if(typeof v==='boolean')return v?'True':'False';if(typeof v==='string')return JSON.stringify(v);if(Array.isArray(v))return '('+v.map(txt).join(',')+')';if(v._type==='object_ref')return v.class+"'"+v.path+"'";return '('+Object.entries(v).filter(([k])=>!k.startsWith('_')).map(([k,x])=>k+'='+txt(x)).join(',')+')';}
// Invoke reflected modifications via native Python ImportText through object/set; exact allowlist local client.
import http from 'node:http';
async function edit(p,props){if(![USER,SB+'/PS_QA_OneShot.PS_QA_OneShot',SB+'/PS_QA_Fixed.PS_QA_Fixed'].some(x=>p===x||p.startsWith(x+':')))throw Error('exact PS allowlist only');
 const b=Buffer.from(JSON.stringify({path:p,properties:props}));const d=await new Promise((res,rej)=>{const q=http.request('http://127.0.0.1:17780/gpcli/object/set',{agent:false,method:'POST',headers:{'Content-Type':'text/plain','Content-Length':b.length}},r=>{let s='';r.on('data',c=>s+=c);r.on('end',()=>res(JSON.parse(s)))});q.on('error',rej);q.setTimeout(300000,()=>q.destroy(Error('timeout')));q.end(b)});if(d.success===false||d.data?.failed_properties?.length)throw Error(JSON.stringify(d));}
if(mode==='copies'){
 const d=await py(`import unreal,json
src=${JSON.stringify(USER)};sb=${JSON.stringify(SB)}
e=unreal.EditorAssetLibrary;out={}
for n in ['PS_QA_OneShot','PS_QA_Fixed']:
 a=unreal.load_asset(sb+'/'+n) if e.does_asset_exist(sb+'/'+n) else e.duplicate_asset(src,sb+'/'+n)
 out[n]=a.get_path_name()
print('QP:'+json.dumps(out))`);save('qa_copies.json',d);console.log(d);
}else if(mode==='single'){
 const report={};for(const name of ['PS_QA_OneShot','PS_QA_Fixed']){
  const p=SB+'/'+name+'.'+name,ps=await get(p);const e=ps.Emitters.length===1?ps.Emitters[0]:ps.Emitters[1];if(!e)throw Error('expected active single mesh emitter');const ep=await get(e.path),l=ep.LODLevels[0],lp=await get(l.path);
  // Preserve source graph, all user shape/colour properties, remove stale LOD references only in QA copies.
  await edit(e.path,{LODLevels:txt([l])});await edit(p,{Emitters:txt([e]),LODDistances:'(0)',LODMethod:'PARTICLESYSTEMLODMETHOD_DirectSet',SystemUpdateMode:name==='PS_QA_Fixed'?'EPSUM_FixedTime':'EPSUM_RealTime'});
  await edit(l.path,{bEnabled:true});await edit(lp.RequiredModule.path,{bEnabled:true,EmitterLoops:1,EmitterDuration:16.1});
  for(const m of lp.Modules)if(m.class.endsWith('ParticleModuleParameterDynamic')){const p=await get(m.path),v=p.DynamicParams[0];v.bSpawnTimeOnly=false;v.ParamValue.Table.TimeScale=1;v.ParamValue.Table.TimeBias=0;v.ParamValue.Table.EntryCount=2;v.ParamValue.Table.Values=[0.9941,-1.2049];await edit(m.path,{DynamicParams:txt(p.DynamicParams)});}
  report[name]={ps:await get(p,['Emitters','LODDistances','LODMethod','SystemUpdateMode']),lods:await get(e.path,['LODLevels']),required:await get(lp.RequiredModule.path,['bEnabled','EmitterLoops','EmitterDuration'])};
 }
 save('single_configuration.json',report);console.log(report);
}else if(mode==='snapshot_runtime'){
 const files=['PS_FixedR','PS_QA_OneShot','PS_QA_Fixed'];const report={};for(const name of files){const p=SB+'/'+name+'.'+name,ps=await get(p);const eps=[];for(const e of ps.Emitters){const ep=await get(e.path),lods=[];for(const l of ep.LODLevels){const lp=await get(l.path),mods=[];for(const m of [lp.RequiredModule,lp.SpawnModule,...lp.Modules])if(m?.path){const mp=await get(m.path);mods.push({path:m.path,p:mp});}lods.push({path:l.path,p:lp,mods});}eps.push({path:e.path,p:ep,lods});}report[name]={p:ps,eps};}save('runtime_snapshot.json',report);console.log('runtime snapshot');
}else if(mode==='address_assets'){
 const png=path.join(ROOT,'analysis/results/MESH_WILLOW_20261016/v2_UE测试包/T_MW_Strip.png').replaceAll('\\','/');
 const d=await py(`import unreal,json
sb=${JSON.stringify(SB)};e=unreal.EditorAssetLibrary;t=unreal.AssetImportTask();t.filename=${JSON.stringify(png)};t.destination_path=sb;t.destination_name='T_MW_FlowFixed';t.automated=True;t.save=False;t.replace_existing=False
unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([t])
tex=unreal.load_asset(sb+'/T_MW_FlowFixed');tex.set_editor_property('srgb',False);tex.set_editor_property('compression_settings',unreal.TextureCompressionSettings.TC_VECTOR_DISPLACEMENTMAP);tex.set_editor_property('mip_gen_settings',unreal.TextureMipGenSettings.TMGS_NO_MIPMAPS);tex.set_editor_property('never_stream',True);tex.set_editor_property('address_x',unreal.TextureAddress.TA_WRAP);tex.set_editor_property('address_y',unreal.TextureAddress.TA_CLAMP);tex.set_editor_property('filter',unreal.TextureFilter.TF_BILINEAR)
mi=e.duplicate_asset(sb+'/MI_Plain',sb+'/MI_FlowFixed') if not e.does_asset_exist(sb+'/MI_FlowFixed') else unreal.load_asset(sb+'/MI_FlowFixed')
m=unreal.MaterialEditingLibrary;m.set_material_instance_texture_parameter_value(mi,'MainTex',tex);m.set_material_instance_vector_parameter_value(mi,'UVParam',unreal.LinearColor(1,1,0,0));m.update_material_instance(mi)
print('QP:'+json.dumps({'tex':tex.get_path_name(),'mi':mi.get_path_name(),'addressX':str(tex.address_x),'addressY':str(tex.address_y),'filter':str(tex.filter)}))`);save('address_assets.json',d);console.log(d);
}else if(mode==='address_apply'){
 const ps=await get(SB+'/PS_QA_OneShot.PS_QA_OneShot'),e=await get(ps.Emitters[0].path),l=await get(e.LODLevels[0].path);await edit(l.RequiredModule.path,{Material:SB+'/MI_FlowFixed.MI_FlowFixed'});
 for(const m of l.Modules)if(m.class.endsWith('ParticleModuleParameterDynamic')){const p=await get(m.path),v=p.DynamicParams[0];await edit(v.ParamValue.Distribution.path,{ConstantCurve:'(Points=((InVal=0,OutVal=0.9941,InterpMode=CIM_Linear),(InVal=1,OutVal=-1.2049,InterpMode=CIM_Linear)),bIsLooped=False,LoopKeyOffset=0)'});v.bSpawnTimeOnly=false;v.ParamValue.Table.TimeScale=1;v.ParamValue.Table.TimeBias=0;v.ParamValue.Table.EntryCount=2;v.ParamValue.Table.Values=[0.9941,-1.2049];await edit(m.path,{DynamicParams:txt(p.DynamicParams)});}
 save('address_applied.json',{required:await get(l.RequiredModule.path)});console.log('QA original strip with U Wrap / V Clamp / fixed bilinear');
}else if(mode==='nofrac_assets'||mode==='nofrac_apply'){
 throw Error('Rejected diagnostic: Panner frac affects only Time*Speed, not the whole UV; half-strip remapping is not a root-cause fix.');
}else if(mode==='apply_validated'){
 const ps=await get(USER);save('user_system_immediate_before.json',ps);
 const active=ps.Emitters[ps.Emitters.length-1],ep=await get(active.path);const before={emitter:ep,lods:[]};
 for(const l of ep.LODLevels){const lp=await get(l.path);before.lods.push({path:l.path,lod:lp,required:await get(lp.RequiredModule.path)});}
 save('user_active_before.json',before);
 // Do not change user mesh, facing, RGB, duration, UV curve or global quality. Address sampler and remove stale duplicate/LODs only.
 await edit(active.path,{LODLevels:txt([ep.LODLevels[0]])});await edit(USER,{Emitters:txt([active]),LODDistances:'(0)',LODMethod:'PARTICLESYSTEMLODMETHOD_DirectSet'});
 const lp=await get(ep.LODLevels[0].path);await edit(ep.LODLevels[0].path,{bEnabled:true});await edit(lp.RequiredModule.path,{bEnabled:true,Material:SB+'/MI_FlowFixed.MI_FlowFixed'});
 const after={system:await get(USER,['Emitters','LODDistances','LODMethod','SystemUpdateMode']),emitter:await get(active.path,['LODLevels']),required:await get(lp.RequiredModule.path,['Material','EmitterLoops','EmitterDuration']),type:await get(lp.TypeDataModule.path,['Mesh','bCameraFacing','AxisLockOption','CameraFacingOption'])};save('user_after_fix.json',after);console.log(after);
}else if(mode==='save_validated'){
 const d=await py(`import unreal,json
out=[]
for p in ['${SB}/T_MW_FlowFixed','${SB}/MI_FlowFixed','${SB}/PS_FixedR']:
 out.append([p,unreal.EditorAssetLibrary.save_asset(p,False)])
print('QP:'+json.dumps(out))`);save('saved_validated.json',d);console.log(d);
}else if(mode==='commit_user'){
 throw Error('Disabled: rejected half-strip candidate must never be applied to user assets.');
}else if(mode==='audit_final'){
 const ps=await get(USER),ep=await get(ps.Emitters[0].path),lp=await get(ep.LODLevels[0].path);const out={system:ps,emitter:ep,lod:lp,type:await get(lp.TypeDataModule.path),required:await get(lp.RequiredModule.path),modules:[]};for(const m of lp.Modules){const p=await get(m.path),q={class:m.class,path:m.path,properties:p};if(p.DynamicParams)for(let i=0;i<4;i++)q['DP'+i]=await get(p.DynamicParams[i].ParamValue.Distribution.path);out.modules.push(q);}
 const material=out.required.Material.path;out.material={path:material,properties:await get(material)};out.texture=await get(SB+'/T_MW_FlowFixed.T_MW_FlowFixed');
 const scene=await py(`import unreal,json,os,hashlib
p='E:/loc_ma5/DFMEditor/DFM/Content/Effects_HD/_Sandbox/MW2_Verify_20261016';out={'files':[],'actors':[]}
for n in ['PS_FixedR.uasset','MI_FlowFixed.uasset','T_MW_FlowFixed.uasset']:
 f=os.path.join(p,n);out['files'].append({'name':n,'exists':os.path.exists(f),'sha256':hashlib.sha256(open(f,'rb').read()).hexdigest() if os.path.exists(f) else None})
for a in unreal.EditorLevelLibrary.get_all_level_actors():
 if a.get_actor_label().startswith(('MWQ17_','PS_FixedR')):out['actors'].append({'label':a.get_actor_label(),'path':a.get_path_name()})
print('QP:'+json.dumps(out))`);out.scene=scene;save('final_readback.json',out);console.log({emitters:ps.Emitters.length,lods:ep.LODLevels.length,mode:ps.SystemUpdateMode,material,texture:{addressX:out.texture.AddressX,addressY:out.texture.AddressY,filter:out.texture.Filter},scene});
}else if(mode==='freezephase'){
 const ps=await get(SB+'/PS_QA_OneShot.PS_QA_OneShot');const e=await get(ps.Emitters[0].path);const l=await get(e.LODLevels[0].path);const phase=0.9941-4/7.3215;
 for(const m of l.Modules)if(m.class.endsWith('ParticleModuleParameterDynamic')){const p=await get(m.path);const v=p.DynamicParams[0];await edit(v.ParamValue.Distribution.path,{ConstantCurve:'(Points=((InVal=0,OutVal='+phase+',InterpMode=CIM_Linear),(InVal=1,OutVal='+phase+',InterpMode=CIM_Linear)),bIsLooped=False,LoopKeyOffset=0)'});v.bSpawnTimeOnly=true;v.ParamValue.Table.TimeScale=0;v.ParamValue.Table.TimeBias=0;v.ParamValue.Table.EntryCount=1;v.ParamValue.Table.Values=[phase];await edit(m.path,{DynamicParams:txt(p.DynamicParams)});const d=await get(m.path);save('phase_static.json',{phase,param:d.DynamicParams[0]});}
 console.log('phase static',phase);
}else if(mode==='panner_snapshot'){
 const r='/Game/MaterialLib/Materials/FX/MaterialFunction/MF_FX_Panner.MF_FX_Panner';const p=await get(r);const d={};for(const ref of p.FunctionExpressions)d[ref.path]=await get(ref.path);save('panner_function_current.json',d);console.log('nodes',Object.keys(d).length);
}else throw Error('copies/single/snapshot_runtime/panner_snapshot');
