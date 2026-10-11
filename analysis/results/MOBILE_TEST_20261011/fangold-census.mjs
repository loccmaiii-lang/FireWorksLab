// ⑨（22 → 24）：金扇 4 件每件的发射器数与类型；只读 LoadAsset + object/get，不保存（本机同步 8，2026-10-11）
import fs from 'node:fs';import {request} from './ue.mjs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const names=['FanGold_Central_01','FanGold_Middle_01','FanGold_OuterLeft','FanGold_OuterRight'];
const out=[];
for(const n of names){const full=`/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_${n}_HD.P_EFX_FireWorks_${n}_HD`;
 try{const ok=await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:full.split('.')[0]}});if(String(ok.return_value)==='None')throw Error('加载失败');
  const a=await request('/object/get',{path:full,properties:['Emitters']}),ems=[];
  for(const e of a.properties.Emitters||[]){const b=await request('/object/get',{path:e.path,properties:['EmitterName','LODLevels']});const l0=b.properties.LODLevels?.[0];
   if(!l0){ems.push({name:b.properties.EmitterName,noLOD:true});continue}
   const c=await request('/object/get',{path:l0.path,properties:['bEnabled','RequiredModule','TypeDataModule','PeakActiveParticles']});
   const r=await request('/object/get',{path:c.properties.RequiredModule.path,properties:['ScreenAlignment','Material']});
   ems.push({name:b.properties.EmitterName,enabledLOD0:c.properties.bEnabled,typeData:c.properties.TypeDataModule?.class||'CPU',screenAlignment:r.properties.ScreenAlignment,material:String(r.properties.Material?.path||'').split('/').pop(),peakActiveLOD0:c.properties.PeakActiveParticles});}
  const en=ems.filter(e=>e.enabledLOD0);
  out.push({id:'P_EFX_FireWorks_'+n,path:full,emitters:ems.length,enabledLOD0:en.length,gpu:en.filter(e=>/gpu/i.test(e.typeData)).length,cpu:en.filter(e=>e.typeData==='CPU').length,beam:en.filter(e=>/beam|ribbon/i.test(e.typeData)).length,detail:ems});
 }catch(e){out.push({id:n,error:e.message})}}
fs.writeFileSync('fangold-census.json',JSON.stringify({format:'df.resource-emitter-census/1',readAt:new Date().toISOString(),source:'UE 4.24 GPUECli 17780 只读：LoadAsset + object/get；未保存',fanGold:out},null,1));
for(const r of out)console.log(r.id,r.error||`${r.enabledLOD0}/${r.emitters} 发射器启用 · GPU ${r.gpu} · CPU ${r.cpu} · 条带 ${r.beam} · `+r.detail.map(d=>d.name+(d.enabledLOD0?'':'(关)')+':'+String(d.typeData).replace('ParticleModuleTypeData','')).join(', '));
