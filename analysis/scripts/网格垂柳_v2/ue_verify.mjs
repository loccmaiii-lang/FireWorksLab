// v2 on-site verification; uses cloud commit d4d266a7 unchanged as baseline.
// All UE writes restricted to unique sandbox. No save, source control, parent-material edits.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const OUT=path.join(ROOT,'analysis/results/MESH_WILLOW_20261016/UE_v2_verify');
const PACK=path.join(ROOT,'analysis/results/MESH_WILLOW_20261016/v2_UE测试包');
const SB='/Game/Effects_HD/_Sandbox/MW2_Verify_20261016';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const PY='/Script/PythonScriptPlugin.Default__PythonScriptLibrary';
fs.mkdirSync(OUT,{recursive:true});
const LOG=[];
async function req(route,payload){
 if(route==='/object/set'&&!payload.path.startsWith(SB+'/'))throw Error('sandbox only');
 if(!['/object/get','/object/set','/object/call'].includes(route))throw Error('read/write route restriction');
 if(route==='/object/call'&&!['LoadAsset','DoesAssetExist','ExecutePythonCommandEx'].includes(payload.function))throw Error('call restriction');
 return new Promise((res,rej)=>{const b=Buffer.from(JSON.stringify(payload)),t0=Date.now();const q=http.request('http://127.0.0.1:17780/gpcli'+route,{agent:false,method:'POST',headers:{'Content-Type':'text/plain','Content-Length':b.length}},r=>{let t='';r.on('data',c=>t+=c);r.on('end',()=>{try{const o=JSON.parse(t);LOG.push({route,path:payload.path,fn:payload.function,ms:Date.now()-t0,success:o.success});if(o.success===false)throw Error(o.message||t);res(o.data??o)}catch(e){rej(e)}})});q.on('error',rej);q.setTimeout(60000,()=>q.destroy(Error('UE timeout')));q.end(b)});
}
async function py(code){
 const r=await req('/object/call',{path:PY,function:'ExecutePythonCommandEx',args:{PythonCommand:code,ExecutionMode:'ExecuteFile',FileExecutionScope:'Private'}});
 const lines=[];const re=/Output="((?:[^"\\]|\\.)*)"/g;let m;while((m=re.exec(r.out_LogOutput||'')))lines.push(m[1].replace(/\\(.)/g,(_,c)=>c==='n'?'\n':c==='t'?'\t':c));
 const s=lines.find(x=>x.startsWith('MW2:'));if(!s)throw Error('Python result missing: '+r.out_CommandResult+' | '+lines.slice(-5).join(' | '));return JSON.parse(s.slice(4));
}
const get=async(p,properties)=>(await req('/object/get',properties?{path:p,properties}:{path:p})).properties;
async function set(p,properties){const r=await req('/object/set',{path:p,properties});if(r.failed_properties?.length)throw Error('properties failed '+p+' '+JSON.stringify(r.failed_properties));}
const save=(n,v)=>fs.writeFileSync(path.join(OUT,n),JSON.stringify(v,null,2));
const quote=x=>JSON.stringify(x.replaceAll('\\','/'));
const codeOut=expr=>`print('MW2:'+json.dumps(${expr}))`;
const mode=process.argv[2];
if(mode==='probe'){
 const r=await py(`import unreal,json
w=unreal.EditorLevelLibrary.get_editor_world()
a=[x.get_actor_label() for x in unreal.EditorLevelLibrary.get_all_level_actors() if x.get_actor_label().startswith(('MESHWILLOW_tmp_','MW2V_','RSU26_tmp_'))]
out={'world':w.get_path_name(),'tempActors':a,'engine':unreal.SystemLibrary.get_engine_version(),'buildMethods':[x for x in dir(unreal.EditorStaticMeshLibrary) if 'lod_build' in x],'enumFacing':[x for x in dir(unreal.MeshCameraFacingOptions) if not x.startswith('_')] if hasattr(unreal,'MeshCameraFacingOptions') else [],'classes':{x:hasattr(unreal,x) for x in ['DistributionFloatConstant','DistributionFloatConstantCurve','RawDistributionFloat']}}
${codeOut('out')}`);save('probe.json',r);console.log(r);
}else if(mode==='import'){
 // Patch only coordinate mapping and normals in copies. Cloud originals stay unchanged.
 const files=['SM_MW_AxisTest','SM_MW_Cross_N400','SM_MW_Single_N400_LockZ','SM_MW_Single_N130_LockZ_Mobile'];
 const inputDir=path.join(OUT,'input');fs.mkdirSync(inputDir,{recursive:true});
 for(const name of files){
  const lines=fs.readFileSync(path.join(PACK,name+'.obj'),'utf8').split(/\r?\n/);const v=[],uv=[],tri=[];
  for(const l of lines){if(l.startsWith('v '))v.push(l.slice(2).trim().split(/\s+/).map(Number));else if(l.startsWith('vt '))uv.push(l);else if(l.startsWith('f '))tri.push(l.slice(2).trim().split(/\s+/).map(x=>Number(x.split('/')[0])-1));}
  const p=v.map(([x,y,z])=>[x,-z,y]);const norms=p.map(()=>[0,0,0]);
  for(const [a,b,c]of tri){const u=p[b].map((x,k)=>x-p[a][k]),w=p[c].map((x,k)=>x-p[a][k]);const n=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];for(const i of [a,b,c])for(let k=0;k<3;k++)norms[i][k]+=n[k];}
  const out=['# Mapping patched using prior measured importer: UE=(obj.x,-obj.y,obj.z)','o MW2V','s 1',...p.map(x=>'v '+x.join(' ')),...uv,...norms.map(n=>{const s=Math.hypot(...n)||1;return 'vn '+n.map(x=>x/s).join(' ')}),...tri.map(t=>'f '+t.map(i=>`${i+1}/${i+1}/${i+1}`).join(' '))];
  fs.writeFileSync(path.join(inputDir,name+'.obj'),out.join('\n'));
 }
 const cfg={sandbox:SB,original:path.join(PACK,'SM_MW_AxisTest.obj').replaceAll('\\','/'),fixed:files.map(n=>[path.join(inputDir,n+'.obj').replaceAll('\\','/'),n]),textures:['T_MW_Strip','T_MW_Grain'].map(n=>[path.join(PACK,n+'.png').replaceAll('\\','/'),n])};
 const r=await py(`import unreal,json
cfg=json.loads(${JSON.stringify(JSON.stringify(cfg))})
tasks=[]
for fn,n in [[cfg['original'],'Axis_Original']]+cfg['fixed']:
 t=unreal.AssetImportTask();t.filename=fn;t.destination_path=cfg['sandbox'];t.destination_name=n;t.automated=True;t.replace_existing=False;t.save=False
 ui=unreal.FbxImportUI();ui.import_mesh=True;ui.import_as_skeletal=False;ui.import_materials=False;ui.import_textures=False;ui.import_animations=False;ui.mesh_type_to_import=unreal.FBXImportType.FBXIT_STATIC_MESH
 d=ui.static_mesh_import_data;d.combine_meshes=True;d.auto_generate_collision=False;d.generate_lightmap_u_vs=False;d.convert_scene=True;d.convert_scene_unit=False;d.normal_import_method=unreal.FBXNormalImportMethod.FBXNIM_IMPORT_NORMALS
 t.options=ui;tasks.append(t)
for fn,n in cfg['textures']:
 t=unreal.AssetImportTask();t.filename=fn;t.destination_path=cfg['sandbox'];t.destination_name=n;t.automated=True;t.replace_existing=False;t.save=False;tasks.append(t)
unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks(tasks)
out={'meshes':{},'textures':{},'warnings':[]}
for n in ['Axis_Original']+[q[1] for q in cfg['fixed']]:
 p=cfg['sandbox']+'/'+n;m=unreal.load_asset(p);b=m.get_bounding_box()
 if hasattr(unreal.EditorStaticMeshLibrary,'get_lod_build_settings'):
  bs=unreal.EditorStaticMeshLibrary.get_lod_build_settings(m,0);bs.use_full_precision_u_vs=True;bs.generate_lightmap_u_vs=False;bs.distance_field_resolution_scale=0;bs.recompute_normals=False
  unreal.EditorStaticMeshLibrary.set_lod_build_settings(m,0,bs)
 else:out['warnings'].append('No build-settings API: '+n)
 out['meshes'][n]={'path':p,'verts':unreal.EditorStaticMeshLibrary.get_number_verts(m,0),'min':[b.min.x,b.min.y,b.min.z],'max':[b.max.x,b.max.y,b.max.z]}
for n in ['T_MW_Strip','T_MW_Grain']:
 t=unreal.load_asset(cfg['sandbox']+'/'+n);t.address_x=unreal.TextureAddress.TA_WRAP;t.address_y=unreal.TextureAddress.TA_CLAMP if n=='T_MW_Strip' else unreal.TextureAddress.TA_WRAP
 if n=='T_MW_Strip':t.srgb=False;t.compression_settings=unreal.TextureCompressionSettings.TC_VECTOR_DISPLACEMENTMAP;t.mip_gen_settings=unreal.TextureMipGenSettings.TMGS_NO_MIPMAPS;t.never_stream=True
 else:t.srgb=True;t.compression_settings=unreal.TextureCompressionSettings.TC_DEFAULT
 out['textures'][n]={'srgb':t.srgb,'size':[t.blueprint_get_size_x(),t.blueprint_get_size_y()]}
${codeOut('out')}`);save('import.json',r);console.log(r);
}else if(mode==='setup'){
 const r=await py(`import unreal,json
sb=${JSON.stringify(SB)}
mi0=unreal.load_asset('/Game/Effects/Common/MaterialInstance/Fireworks/MI_EFX_FireWork_Trail_01')
e=unreal.EditorAssetLibrary;m=unreal.MaterialEditingLibrary
out={}
for name,grain in [('MI_Plain',False),('MI_Grain',True)]:
 mi=unreal.load_asset(sb+'/'+name) if e.does_asset_exist(sb+'/'+name) else e.duplicate_asset(mi0.get_path_name(),sb+'/'+name)
 m.set_material_instance_texture_parameter_value(mi,'MainTex',unreal.load_asset(sb+'/T_MW_Strip'))
 m.set_material_instance_vector_parameter_value(mi,'AlphaChannel',unreal.LinearColor(0,0,0,1))
 m.set_material_instance_vector_parameter_value(mi,'UVParam',unreal.LinearColor(1,1,0,0))
 if grain:
  m.set_material_instance_texture_parameter_value(mi,'NoiseMap',unreal.load_asset(sb+'/T_MW_Grain'))
  m.set_material_instance_vector_parameter_value(mi,'NoiseUVParam',unreal.LinearColor(0.2734,4.5759,0,0))
 m.update_material_instance(mi)
 out[name]=mi.get_path_name()
for name in ['PS_CrossR','PS_GrainR','PS_LockR','PS_MobileR','PS_FixedR']:
 ps=unreal.load_asset(sb+'/'+name) if e.does_asset_exist(sb+'/'+name) else e.duplicate_asset('/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_Hero_HD',sb+'/'+name)
 out[name]=ps.get_path_name()
${codeOut('out')}`);save('setup.json',r);console.log(r);
}else if(mode==='configure'){
 const cfg={PS_CrossR:['SM_MW_Cross_N400','MI_Plain',false,false],PS_GrainR:['SM_MW_Cross_N400','MI_Grain',false,false],PS_LockR:['SM_MW_Single_N400_LockZ','MI_Plain',true,false],PS_MobileR:['SM_MW_Single_N130_LockZ_Mobile','MI_Plain',true,false],PS_FixedR:['SM_MW_Cross_N400','MI_Plain',false,true]};
 const result={};const curve=p=>`(Points=(${p.map(([t,v])=>`(InVal=${t},OutVal=${v},ArriveTangent=0,LeaveTangent=0,InterpMode=CIM_Linear)`).join(',')}),bIsLooped=False,LoopKeyOffset=0)`;
 for(const [name,[mesh,mat,lock,fixed]]of Object.entries(cfg)){
  if(process.argv[3]&&!process.argv[3].split(',').includes(name))continue;
  const sys=SB+'/'+name+'.'+name;const ps=await get(sys);const kept=[];
  for(const e of ps.Emitters){const ep=await get(e.path);let isMesh=false;for(const l of ep.LODLevels){const lp=await get(l.path);if(lp.TypeDataModule?.class?.includes('Mesh'))isMesh=true;}
   if(!isMesh){for(const l of ep.LODLevels){const q=await get(l.path);await set(l.path,{bEnabled:false});await set(q.RequiredModule.path,{bEnabled:false});}continue;}kept.push(e);const lp=await get(ep.LODLevels[0].path);const mods=[];
   await set(lp.RequiredModule.path,{Material:SB+'/'+mat+'.'+mat,ScreenAlignment:'PSA_Square',EmitterDuration:16.1,EmitterLoops:1,bUseInLocalSpace:false});
   await set(lp.TypeDataModule.path,{Mesh:SB+'/'+mesh+'.'+mesh,bCameraFacing:lock,AxisLockOption:lock?'EPAL_Z':'EPAL_NONE',CameraFacingOption:lock?'LockedAxis_ZAxisFacing':'XAxisFacing_NoUp',bApplyParticleRotationAsSpin:false,bFaceCameraDirectionRatherThanPosition:false,bOverrideMaterial:true});
   for(const m of lp.Modules){const c=m.class.split('.').pop();if(/SizeMultiplyLife|MeshRotation/.test(c)){await set(m.path,{bEnabled:false});continue;}mods.push(m);const mp=await get(m.path);
    const dist=async(f,p)=>{const d=mp[f]?.Distribution?.path;if(!d)throw Error('missing distribution '+f);await set(d,p);};
    if(c==='ParticleModuleLifetime')await dist('Lifetime',{Constant:16.1});
    if(c==='ParticleModuleSize')await dist('StartSize',{Constant:'(X=1,Y=1,Z=1)'});
    if(c==='ParticleModuleColorScaleOverLife'){await dist('ColorScaleOverLife',{Constant:'(X=9,Y=9,Z=9)'});await dist('AlphaScaleOverLife',{ConstantCurve:curve([[0,1],[0.9814,1],[1,0]])});}
    if(c==='ParticleModuleParameterDynamic'){await set(mp.DynamicParams[0].ParamValue.Distribution.path,{ConstantCurve:curve([[0,0.9941],[1,-1.2049]])});await set(mp.DynamicParams[1].ParamValue.Distribution.path,{ConstantCurve:curve([[0,name==='PS_GrainR'?0.6:1.02],[1,name==='PS_GrainR'?0.6:1.02]])});}
    await set(m.path,{bEnabled:true});
   }
   // Object/set does not accept JSON arrays for reflected array properties on this engine.
   // Keep copied modules, disable unsupported ones; serialize LOD distances as ImportText below.
  }
  if(kept.length!==1)throw Error('expected one mesh emitter');await set(sys,{LODDistances:'(0,10000000,10000000,10000000)',SystemUpdateMode:fixed?'EPSUM_FixedTime':'EPSUM_RealTime',UpdateTime_FPS:fixed?10:60,bUseFixedRelativeBoundingBox:true,FixedRelativeBoundingBox:'(Min=(X=-60000,Y=-60000,Z=-60000),Max=(X=60000,Y=60000,Z=60000),IsValid=1)',ThumbnailWarmup:0});
  result[name]={system:await get(sys,['Emitters','LODDistances','SystemUpdateMode','UpdateTime_FPS']),mesh,mat,lock,fixed};console.log(name+' configured');
 }
 save('configure.json',result);
}else if(mode==='readback'){
 const out={};for(const name of ['PS_CrossR','PS_GrainR','PS_LockR','PS_MobileR','PS_FixedR']){const sys=SB+'/'+name+'.'+name,ps=await get(sys);const e=await get(ps.Emitters[5].path),l=await get(e.LODLevels[0].path);const row={system:{mode:ps.SystemUpdateMode,fps:ps.UpdateTime_FPS,emitters:ps.Emitters.length,lods:e.LODLevels.length},type:await get(l.TypeDataModule.path),modules:[]};for(const m of l.Modules){const mp=await get(m.path);const d={class:m.class,p:mp};for(const [k,v]of Object.entries(mp))if(v?.Distribution?.path)d[k+'_distribution']=await get(v.Distribution.path);if(mp.DynamicParams)for(let i=0;i<4;i++)d['DP'+i]=await get(mp.DynamicParams[i].ParamValue.Distribution.path);row.modules.push(d);}out[name]=row;}save('readback.json',out);console.log('readback completed');
}else if(mode==='finalcheck'){
 const r=await py(`import unreal,json,os,hashlib
sb='E:/loc_ma5/DFMEditor/DFM/Content/Effects_HD/_Sandbox/MW2_Verify_20261016'
files=[]
for n in sorted(os.listdir(sb)):
 if not n.endswith('.uasset'):continue
 f=os.path.join(sb,n)
 files.append({'name':n,'bytes':os.path.getsize(f),'sha256':hashlib.sha256(open(f,'rb').read()).hexdigest()})
c=unreal.EditorLevelLibrary.get_level_viewport_camera_info()
out={'files':files,'camera':str(c),'tempActors':[a.get_actor_label() for a in unreal.EditorLevelLibrary.get_all_level_actors() if a.get_actor_label().startswith('MW2V_')]}
${codeOut('out')}`);
 const ps=await get(SB+'/PS_GrainR.PS_GrainR'),e=await get(ps.Emitters[5].path),l=await get(e.LODLevels[0].path);for(const m of l.Modules)if(m.class.endsWith('ParticleModuleParameterDynamic')){const mp=await get(m.path);r.grainDP1={raw:mp.DynamicParams[1].ParamValue,distribution:await get(mp.DynamicParams[1].ParamValue.Distribution.path)};}
 save('finalcheck.json',r);console.log('Final checks files='+r.files.length+' tempActors='+r.tempActors.length+' GrainDP1Table='+JSON.stringify(r.grainDP1.raw.Table.Values));
}else if(mode==='grainfix'){
 const r=await py(`import unreal,json
mi=unreal.load_asset('${SB}/MI_Grain');m=unreal.MaterialEditingLibrary
m.set_material_instance_scalar_parameter_value(mi,'hardness',0.38);m.update_material_instance(mi)
${codeOut("{'hardness':m.get_material_instance_scalar_parameter_value(mi,'hardness')}")}`);
 const ps=await get(SB+'/PS_GrainR.PS_GrainR'),e=await get(ps.Emitters[5].path),l=await get(e.LODLevels[0].path);for(const m of l.Modules)if(m.class.endsWith('ParticleModuleParameterDynamic')){
  const p=await get(m.path),a=p.DynamicParams;await set(a[1].ParamValue.Distribution.path,{ConstantCurve:'(Points=((InVal=0,OutVal=0.08,InterpMode=CIM_Linear),(InVal=1,OutVal=0.08,InterpMode=CIM_Linear)),bIsLooped=False,LoopKeyOffset=0)'});
  const txt=v=>{if(v===null)return 'None';if(typeof v==='number')return String(v);if(typeof v==='boolean')return v?'True':'False';if(typeof v==='string')return JSON.stringify(v);if(Array.isArray(v))return '('+v.map(txt).join(',')+')';if(v._type==='object_ref')return v.class+"'"+v.path+"'";return '('+Object.entries(v).filter(([k])=>!k.startsWith('_')).map(([k,x])=>k+'='+txt(x)).join(',')+')';};
  a[1].ParamValue.Table.Values=[0.08];await set(m.path,{DynamicParams:txt(a)});
 }save('grainfix.json',{...r,param2:0.08,formula:'UE smoothstep(0.38,0.62,noise+2*0.08) == web smoothstep(0.22,0.46,noise)'});console.log(r);
}else if(mode==='diagnostic'){
 const r=await py(`import unreal,json
out={'methods':[x for x in dir(unreal.ProceduralMeshLibrary) if 'static_mesh' in x] if hasattr(unreal,'ProceduralMeshLibrary') else []}
if hasattr(unreal,'ProceduralMeshLibrary'):
 a=unreal.ProceduralMeshLibrary.get_section_from_static_mesh(unreal.load_asset('${SB}/SM_MW_Cross_N400'),0,0)
 out['types']=[str(type(x)) for x in a];out['lengths']=[len(x) for x in a]
 out['first']=[[str(v) for v in x[:6]] for x in a]
${codeOut('out')}`);save('diagnostic.json',r);console.log(r);
}else if(mode==='tables'){
 const txt=v=>{if(v===null)return 'None';if(typeof v==='boolean')return v?'True':'False';if(typeof v==='number')return String(v);if(typeof v==='string')return JSON.stringify(v);if(Array.isArray(v))return '('+v.map(txt).join(',')+')';if(v._type==='object_ref')return v.class+"'"+v.path+"'";return '('+Object.entries(v).filter(([k])=>!k.startsWith('_')).map(([k,x])=>k+'='+txt(x)).join(',')+')';};
 const table=(values,scale,bias,entries,stride)=>({_struct:'DistributionLookupTable',TimeScale:scale,TimeBias:bias,Values:values,Op:1,EntryCount:entries,EntryStride:stride,SubEntryStride:0,LockFlag:0});
 const out={};for(const name of ['PS_CrossR','PS_GrainR','PS_LockR','PS_MobileR','PS_FixedR']){
  const ps=await get(SB+'/'+name+'.'+name),e=await get(ps.Emitters[5].path),l=await get(e.LODLevels[0].path);
  for(const m of l.Modules){const p=await get(m.path),c=m.class.split('.').pop();const changes={};
   for(const [k,vals]of [['Lifetime',[16.1]],['StartSize',[1,1,1]],['ColorScaleOverLife',[9,9,9]]])if(p[k]){const r=p[k];r.Table=table(vals,0,0,1,vals.length);changes[k]=txt(r);}
   if(p.AlphaScaleOverLife){const r=p.AlphaScaleOverLife;const a=Array.from({length:64},(_,i)=>{const t=i/63;return t<0.9814?1:Math.max(0,(1-t)/(1-0.9814));});r.Table=table(a,63,0,64,1);changes.AlphaScaleOverLife=txt(r);}
   if(p.DynamicParams){p.DynamicParams[0].ParamValue.Table=table([0.9941,-1.2049],1,0,2,1);p.DynamicParams[1].ParamValue.Table=table([name==='PS_GrainR'?0.6:1.02],0,0,1,1);changes.DynamicParams=txt(p.DynamicParams);}
   if(Object.keys(changes).length)await set(m.path,changes);
  }
  out[name]='raw lookup tables patched';
 }save('tables.json',out);console.log(out);
}else if(mode==='evalgraph'){
 const src='F:/FireWorksLab/analysis/results/资源规范统一_20261016/采集/raw_crawl.json.gz';const zlib=await import('node:zlib');const o=JSON.parse(zlib.gunzipSync(fs.readFileSync(src))).objects;
 const r='/Game/MaterialLib/Materials/FX/Parent/M_EFX_DissolveOutline_Soft.M_EFX_DissolveOutline_Soft';
 const kept={};for(const [k,v]of Object.entries(o))if(v&&k.startsWith(r))kept[k]=v;save('soft_graph.json',kept);console.log('graph saved');
}else if(mode==='test'){
 const helper=fs.readFileSync(path.join(ROOT,'analysis/scripts/网格垂柳_v2/ue_test.py'),'utf8');
 const command=process.argv[3]||'start';let expr;
 if(command==='start'){fs.mkdirSync(path.join(OUT,'tickoff_retest'),{recursive:true});expr=`start(${quote(path.join(OUT,'tickoff_retest'))})`;}
 else if(command==='cleanup')expr='cleanup()';else expr='status()';
 const r=await py(helper+'\n'+codeOut(expr));save('test_'+command+'.json',r);console.log(r);
}else throw Error('mode probe/import/setup/configure/readback/evalgraph/test');
save('log_'+mode+'.json',LOG);
