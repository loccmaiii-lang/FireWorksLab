// Read-first current user asset diagnosis. UE writes must pass an explicit asset allowlist.
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const OUT=path.join(ROOT,'analysis/results/MESH_WILLOW_20261016/QUALITY_REPEAT_1725');fs.mkdirSync(OUT,{recursive:true});
const PY='/Script/PythonScriptPlugin.Default__PythonScriptLibrary';
export const LOG=[];
export async function req(route,payload){
 if(route!='/object/get'&&!(route==='/object/call'&&payload.function==='ExecutePythonCommandEx'))throw Error('read/Python-reviewed mode only');
 return new Promise((res,rej)=>{const b=Buffer.from(JSON.stringify(payload));const q=http.request('http://127.0.0.1:17780/gpcli'+route,{agent:false,method:'POST',headers:{'Content-Type':'text/plain','Content-Length':b.length}},r=>{let s='';r.on('data',c=>s+=c);r.on('end',()=>{try{const v=JSON.parse(s);if(v.success===false)throw Error(v.message||v.error||s);LOG.push({route,path:payload.path,fn:payload.function,success:true});res(v.data??v)}catch(e){rej(e)}})});q.on('error',rej);q.setTimeout(300000,()=>q.destroy(Error('UE timeout')));q.end(b)});
}
export async function py(code){const d=await req('/object/call',{path:PY,function:'ExecutePythonCommandEx',args:{PythonCommand:code,ExecutionMode:'ExecuteFile',FileExecutionScope:'Private'}});const lines=[];const re=/Output="((?:[^"\\]|\\.)*)"/g;let m;while((m=re.exec(d.out_LogOutput||'')))lines.push(m[1].replace(/\\(.)/g,(_,c)=>c==='n'?'\n':c==='t'?'\t':c));const s=lines.find(x=>x.startsWith('QP:'));if(!s)throw Error('UE Python failure '+d.out_CommandResult+' | '+lines.slice(-8).join(' | '));return JSON.parse(s.slice(3));}
export const get=async(p,properties)=>(await req('/object/get',properties?{path:p,properties}:{path:p})).properties;
export const save=(name,d)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(d,null,2));
const mode=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)?process.argv[2]:undefined;
if(mode==='scene'){
 const d=await py(`import unreal,json
w=unreal.EditorLevelLibrary.get_editor_world()
cv={}
for k in ['sg.EffectsQuality','sg.TextureQuality','sg.PostProcessQuality','r.MaterialQualityLevel','r.ParticleLODBias','r.DetailMode','r.EmitterSpawnRateScale','r.SeparateTranslucency','r.RefractionQuality','r.BloomQuality','r.Tonemapper.Quality']:
 try:cv[k]=unreal.SystemLibrary.get_console_variable_float_value(k)
 except Exception as e:cv[k]=repr(e)
out={'world':w.get_path_name(),'cvars':cv,'actors':[],'selected':[]}
for a in unreal.EditorLevelLibrary.get_selected_level_actors():out['selected'].append([a.get_actor_label(),a.get_path_name()])
for a in unreal.EditorLevelLibrary.get_all_level_actors():
 comps=a.get_components_by_class(unreal.ParticleSystemComponent)
 if not comps:continue
 cs=[]
 for c in comps:
  t=c.get_editor_property('template')
  if t is None:continue
  cs.append({'path':c.get_path_name(),'template':t.get_path_name(),'active':c.is_active(),'num':c.get_num_active_particles(),'loc':str(c.get_world_location())})
 if cs:out['actors'].append({'label':a.get_actor_label(),'path':a.get_path_name(),'components':cs})
print('QP:'+json.dumps(out))`);
 save('scene_before.json',d);console.log(JSON.stringify(d,null,2));
}else if(mode==='crawl'){
 const scene=JSON.parse(fs.readFileSync(path.join(OUT,'scene_before.json'),'utf8'));const ps=Array.from(new Set(scene.actors.flatMap(a=>a.components.map(c=>c.template)).filter(p=>/MW|Willow|Kamuro|Hero|FireWork|Jin/i.test(p))));
 const objects={};async function one(p){if(objects[p])return objects[p];objects[p]=await req('/object/get',{path:p});return objects[p];}
 for(const p of ps){const o=await one(p);for(const er of o.properties.Emitters||[]){const e=await one(er.path);for(const lr of e.properties.LODLevels||[]){const l=await one(lr.path);for(const m of [l.properties.RequiredModule,l.properties.SpawnModule,l.properties.TypeDataModule,...l.properties.Modules]){if(!m?.path)continue;const q=await one(m.path);for(const v of Object.values(q.properties))if(v?.Distribution?.path)await one(v.Distribution.path);if(q.properties.DynamicParams)for(const v of q.properties.DynamicParams)if(v.ParamValue?.Distribution?.path)await one(v.ParamValue.Distribution.path);if(q.properties.Material?.path)await one(q.properties.Material.path);if(q.properties.Mesh?.path)await one(q.properties.Mesh.path);}}}}
 for(const p of Object.keys(objects)){const o=objects[p];if(o.class?.endsWith('MaterialInstanceConstant')){const parent=o.properties.Parent;if(parent?.path)await one(parent.path);for(const t of o.properties.TextureParameterValues||[])if(t.ParameterValue?.path)await one(t.ParameterValue.path);}}
 save('current_objects.json',{readAt:new Date().toISOString(),systems:ps,objects});console.log('systems',ps,'objects',Object.keys(objects).length);
}else if(mode==='test'){
 const action=process.argv[3]||'status';const folder=process.argv[4]||'compare';const dir=path.join(OUT,folder);fs.mkdirSync(dir,{recursive:true});const helper=fs.readFileSync(path.join(ROOT,'analysis/scripts/网格垂柳_v2/quality_test.py'),'utf8');
 const call=action==='start'?`start(${JSON.stringify(dir.replaceAll('\\','/'))},${process.argv[5]?JSON.stringify(process.argv[5]):'None'},${folder.startsWith('series')?'True':'False'})`:action==='cleanup'?'cleanup()':action==='removeonly'?'cleanup(False)':action==='dump'?'dump()':'status()';
 const d=await py(helper+`\nprint('QP:'+json.dumps(${call}))`);save('test_'+folder+'_'+action+'.json',d);console.log(action==='dump'?{done:d.done,error:d.error,shots:d.shots?.length}:d);
}else if(mode==='cvcheck'){
 const d=await py(`import unreal,json
keys=['sg.EffectsQuality','sg.TextureQuality','sg.PostProcessQuality','r.MaterialQualityLevel','r.DetailLevel','r.DetailMode','r.SceneColorFormat','r.BloomQuality','r.SeparateTranslucency','r.EmitterSpawnRateScale','r.MaxAnisotropy']
out={k:{'int':unreal.SystemLibrary.get_console_variable_int_value(k),'float':unreal.SystemLibrary.get_console_variable_float_value(k)} for k in keys}
print('QP:'+json.dumps(out))`);save('cvar_types.json',d);console.log(d);
}else if(mode==='material_methods'){
 const d=await py(`import unreal,json
print('QP:'+json.dumps({'systemMethods':[x for x in dir(unreal.SystemLibrary) if 'console_variable' in x],'materialMethods':[x for x in dir(unreal.MaterialEditingLibrary) if 'instance' in x or 'static' in x],'actorMethods':[x for x in dir(unreal.ParticleSystemComponent) if 'lod' in x or 'tick' in x or 'time' in x]}))`);save('methods.json',d);console.log(d);
}else if(mode){throw Error('mode scene/crawl/material_methods');}
if(mode)save('log_'+mode+'.json',LOG);
