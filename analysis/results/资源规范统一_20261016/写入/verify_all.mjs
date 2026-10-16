// 第2步终检：全部已保存值再次读回；跳过资产与原干跑保持一致；列临时发射器，不保存不清其它对话的内容。
import fs from 'node:fs';
import crypto from 'node:crypto';
import {get,py,saveLog} from './ue_rw.mjs';
const here=new URL('./',import.meta.url);
const plan=JSON.parse(fs.readFileSync(new URL('final_targets.json',here),'utf8'));
const result=JSON.parse(fs.readFileSync(new URL('../改后读回.json',here),'utf8'));
const written=new Set(result.systems.map(s=>s.name));const diffs=[];
const expectedPS=new Set(plan.systems.filter(s=>!s.skipSystem&&(s.writeBounds||s.emitters.length)).map(s=>s.name));
for(const n of expectedPS)if(!written.has(n))diffs.push({name:n,field:'expected system not saved'});
const writtenMI=new Set(result.materials.map(m=>m.name));for(const m of plan.materials)if(!writtenMI.has(m.name))diffs.push({name:m.name,field:'expected MI not saved'});
if(result.errors.length)diffs.push({field:'unresolved write errors',errors:result.errors});
for(const s of plan.systems){
 const p=await get(s.system,['bUseFixedRelativeBoundingBox','FixedRelativeBoundingBox']);const b=p.FixedRelativeBoundingBox;
 if(written.has(s.name)){
  if(s.writeBounds&&(!p.bUseFixedRelativeBoundingBox||[b.Min.X,b.Min.Y,b.Min.Z].some((v,i)=>v!==s.bounds.min[i])||[b.Max.X,b.Max.Y,b.Max.Z].some((v,i)=>v!==s.bounds.max[i])))diffs.push({name:s.name,field:'Bounds'});
  for(const e of s.emitters)for(const l of e.lods){const q=await get(l.required,['ScreenAlignment','UVFlippingMode']);for(const [k,v] of Object.entries(e.set))if(q[k]!==v)diffs.push({name:s.name,lod:l.lod,emitter:e.emitter,field:k,now:q[k],want:v});}
 }else{
  if(JSON.stringify(p)!==JSON.stringify(s.before))diffs.push({name:s.name,field:'skipped bounds changed',now:p});
 }
}
for(const m of plan.materials){const p=await get(m.material,['ScalarParameterValues','Parent']);const v=p.ScalarParameterValues.filter(x=>x.ParameterInfo?.Name==='EmissiveDissolve');if(v.length!==1||Math.abs(v[0].ParameterValue-.98)>1e-6)diffs.push({name:m.name,field:'EmissiveDissolve',now:v});}
const dry=JSON.parse(fs.readFileSync(new URL('../干跑.json',here),'utf8'));
const backup=JSON.parse(fs.readFileSync(new URL('备份清单.json',here),'utf8')).files;
for(const s of plan.systems.filter(s=>!written.has(s.name))){const rel=s.system.split('.')[0].slice(6)+'.uasset';const b=backup.find(x=>x.file===rel);const hash=crypto.createHash('sha256').update(fs.readFileSync('E:/loc_ma5/DFMEditor/DFM/Content/'+rel)).digest('hex');if(hash!==b.sha256)diffs.push({name:s.name,field:'skipped disk file changed'});}
const protectedMI=dry.materials.filter(x=>x.plan==='ask'&&!plan.materials.some(m=>m.name===x.name));
for(const m of protectedMI){const p=await get(m.material,['ScalarParameterValues']);const v=p.ScalarParameterValues.filter(x=>x.ParameterInfo?.Name==='EmissiveDissolve');const effective=await py(`import unreal,json\nmi=unreal.load_asset(${JSON.stringify(m.material.split('.')[0])})\nprint('FWL26:'+json.dumps({'value':unreal.MaterialEditingLibrary.get_material_instance_scalar_parameter_value(mi,'EmissiveDissolve')}))`);if(Math.abs(effective.value-1)>1e-6)diffs.push({name:m.name,field:'shared MI effective value changed',now:effective.value});}
const env=await py(`import unreal,json
out={'world':unreal.EditorLevelLibrary.get_editor_world().get_path_name(),'temporary_actors':[a.get_actor_label() for a in unreal.EditorLevelLibrary.get_all_level_actors() if a.get_actor_label().startswith('RSU26_tmp_')]}
print('FWL26:'+json.dumps(out))`);
const out={at:new Date().toISOString(),systemsSaved:result.systems.length,materialsSaved:result.materials.length,skippedSystems:plan.systems.filter(s=>!written.has(s.name)).map(s=>({name:s.name,reasons:s.boundsSkipReasons})),protectedSharedMI:protectedMI.map(m=>m.name),diffs,env};
fs.writeFileSync(new URL('第2步终检.json',here),JSON.stringify(out,null,1));saveLog('log_verify_all.json');console.log(JSON.stringify(out,null,1));
if(diffs.length||env.temporary_actors.length)throw Error('final verification failed');
