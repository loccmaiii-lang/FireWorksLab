// 用户12:28接续第2步（不做第三步）。小步运行、每轮都落盘，不跨资产SaveAll。
import fs from 'node:fs';
import crypto from 'node:crypto';
import {py,get,saveLog} from './ue_rw.mjs';
import {ue,T,SYS,MAT,TMP,restoreBounds,setEmitters,restoreMI,misOf} from './ops.mjs';
const mode=process.argv[2];
const here=new URL('./',import.meta.url);
const persist=(f,x)=>fs.writeFileSync(new URL(f,here),JSON.stringify(x,null,1));
if(mode==='backup-check'){
 const m=JSON.parse(fs.readFileSync(new URL('备份清单.json',here),'utf8'));
 const errors=[];
 for(const f of m.files){
  for(const root of ['E:/loc_ma5/DFMEditor/DFM/Content/','F:/FireWorksLab/analysis/local/输出/资源规范统一_20261016_备份/']){
   const hash=crypto.createHash('sha256').update(fs.readFileSync(root+f.file)).digest('hex');
   if(hash!==f.sha256)errors.push({file:f.file,root,hash});
  }
 }
 persist('备份复核_1228.json',{at:new Date().toISOString(),files:m.files.length,errors});
 console.log(JSON.stringify({files:m.files.length,errors}));
 if(errors.length)throw Error('磁盘或备份已变化，停止');
}else if(mode==='info'){
 const r=await py(`import unreal,json,sys
c=unreal.ParticleSystemComponent.get_default_object()
out={'world':unreal.EditorLevelLibrary.get_editor_world().get_path_name(),'py':sys.version}
out['particle_funcs']=[n for n in dir(c) if any(k in n.lower() for k in ['particle','tick','reset','lod','bound','template'])]
out['active_funcs']=[n for n in dir(c) if 'activ' in n]
out['system_bounds_scale']=str(c.get_editor_property('bounds_scale'))
out['checkout_doc']=unreal.EditorAssetLibrary.checkout_asset.__doc__
out['sc_checkout_doc']=unreal.SourceControl.check_out_file.__doc__
out['sc_available']=unreal.SourceControl.is_available()
out['actors']=[a.get_actor_label() for a in unreal.EditorLevelLibrary.get_all_level_actors() if a.get_actor_label().startswith('RSU26_tmp_')]
print('FWL26:'+json.dumps(out))`);
 persist('环境续检_1228.json',r);console.log(JSON.stringify(r,null,1));
}else if(mode==='cleanup'){
 const r={at:new Date().toISOString()};
 try{r.dump=await ue(`dump(${JSON.stringify(TMP+'/phase2_recovered.json')})`);fs.copyFileSync(TMP+'/phase2_recovered.json',new URL('代表测试/phase2_recovered.json',here));}catch(e){r.dumpError=String(e)}
 r.cleanup=await ue('cleanup()');
 for(const name of ['P_EFX_FireWorks_Crackle_HD','P_EFX_FireWorks_GoldKamuro_HD','P_EFX_FireWorks_RiseTrail_M_HD','P_EFX_FireWorks_RiseTrail_XS_HD']){
  await restoreBounds(name);
 }
 r.emitters=[];
 for(const name of ['P_EFX_FireWorks_Crackle_HD','P_EFX_FireWorks_RiseTrail_XS_HD'])r.emitters.push([name,await setEmitters(name,'before')]);
 const names=[...new Set(['P_EFX_FireWorks_Crackle_HD','P_EFX_FireWorks_GoldKamuro_HD','P_EFX_FireWorks_RiseTrail_M_HD'].flatMap(misOf))];
 r.materials=await restoreMI(names);
 r.after=await ue('status()');
 persist('旧测试清理.json',r);console.log(JSON.stringify(r));
}else if(mode==='precheck'){
 const diffs=[];
 for(const s of T.systems){const p=await get(s.system,['bUseFixedRelativeBoundingBox','FixedRelativeBoundingBox']);if(JSON.stringify(p)!==JSON.stringify(s.before))diffs.push({name:s.name,now:p,before:s.before});for(const e of s.emitters)for(const l of e.lods){const q=await get(l.required,['ScreenAlignment','UVFlippingMode']);if(JSON.stringify(q)!==JSON.stringify(l.before))diffs.push({name:s.name,emitter:e.emitter,lod:l.lod,now:q,before:l.before});}}
 for(const m of T.materials){const p=await get(m.material,['ScalarParameterValues']);const q=p.ScalarParameterValues.filter(x=>x.ParameterInfo?.Name==='EmissiveDissolve');if(JSON.stringify(q)!==JSON.stringify(m.beforeOverride))diffs.push({name:m.name,now:q,before:m.beforeOverride});}
 persist('续测前还原核对.json',{diffs,systems:T.systems.length,materials:T.materials.length});console.log(JSON.stringify(diffs));
 if(diffs.length)throw Error('还原核对不一致');
}else if(mode==='checkout'){
 const only=process.argv.slice(3);
 const items=[...T.systems.map(s=>s.system),...T.materials.map(m=>m.material)].filter(p=>!only.length||only.includes(p.split('.').pop()));
 const out=[];
 for(const p of items){
  if(p.split('.').pop()==='P_EFX_FireWorks_GoldKamuro_HD'){out.push({package:p.split('.')[0],checkout:false,writable:false,error:'blocked: checked out by another user; do not override'});continue;}
  const r=await py(`import unreal,json,os
p=${JSON.stringify(p.split('.')[0])}
f=os.path.abspath(os.path.join(unreal.Paths.project_content_dir(),p[6:]+'.uasset'))
ok=unreal.EditorAssetLibrary.checkout_asset(p)
out={'package':p,'checkout':bool(ok),'writable':os.access(f,os.W_OK),'error':unicode(unreal.SourceControl.last_error_msg()) if not ok else ''}
print('FWL26:'+json.dumps(out))`,120000);
  out.push(r);persist('迁出_'+(only.length?'代表':'全体')+'.json',out);console.log(JSON.stringify(r));
  if(!r.checkout||!r.writable){
   const reason=await py(`import unreal,json\np=${JSON.stringify(p.split('.')[0])}\nok=unreal.SourceControl.check_out_file(p,True)\nprint('FWL26:'+json.dumps({'ok':bool(ok),'reason':unicode(unreal.SourceControl.last_error_msg())}))`);
   r.error=reason.reason||'checkout failed';persist('迁出_'+(only.length?'代表':'全体')+'.json',out);
   console.log('BLOCKED '+JSON.stringify(r));
  }
 }
}else throw Error('mode?');
saveLog('log_resume_'+mode+'.json');
