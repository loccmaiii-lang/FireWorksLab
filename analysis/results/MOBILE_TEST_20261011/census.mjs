import fs from 'node:fs';import {request} from './ue.mjs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const rows=f=>JSON.parse(fs.readFileSync('../NEWYEAR_V01/'+f,'utf8')).data.matches;
const used=new Set(JSON.parse(fs.readFileSync('../../../FXtools/节目/NewYearFireWorks_v01/基础模板与尺寸.json','utf8')).bases.map(b=>b.id));
const pc=rows('resourcefx-current-pc.json'),mob=rows('resourcefx-current-mobile.json');
const cache=new Map();
async function ps(full){
 if(!full||full==='None'||full==='')return null;if(cache.has(full))return cache.get(full);
 const pkg=full.split('.')[0];let out;
 try{
  const ok=await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:pkg}});
  if(String(ok.return_value)==='None')throw Error('加载失败');
  const a=await request('/object/get',{path:full,properties:['Emitters','LODDistances']});
  const ems=[];
  for(const e of a.properties.Emitters||[]){
   const b=await request('/object/get',{path:e.path,properties:['EmitterName','LODLevels','DetailMode','DetailModeBitmask','QualityLevelSpawnRateScale','SignificanceLevel']});
   const l0=b.properties.LODLevels?.[0];if(!l0){ems.push({name:b.properties.EmitterName,class:e.class,noLOD:true});continue;}
   const c=await request('/object/get',{path:l0.path,properties:['bEnabled','RequiredModule','TypeDataModule','Modules','PeakActiveParticles']});
   const r=await request('/object/get',{path:c.properties.RequiredModule.path,properties:['Material','ScreenAlignment','SubImages_Horizontal','SubImages_Vertical','bUseMaxDrawCount']});
   ems.push({name:b.properties.EmitterName,class:e.class,enabledLOD0:c.properties.bEnabled,typeData:c.properties.TypeDataModule?.class||'CPU',screenAlignment:r.properties.ScreenAlignment,material:String(r.properties.Material?.path||'').split('/').pop(),subImages:[r.properties.SubImages_Horizontal,r.properties.SubImages_Vertical],peakActiveLOD0:c.properties.PeakActiveParticles,modules:(c.properties.Modules||[]).length,detailMode:b.properties.DetailMode,detailBitmask:b.properties.DetailModeBitmask,qualitySpawnScale:b.properties.QualityLevelSpawnRateScale,significance:b.properties.SignificanceLevel,lodLevels:b.properties.LODLevels.length});
  }
  const en=ems.filter(e=>e.enabledLOD0);
  out={path:full,emitters:ems.length,enabledLOD0:en.length,gpu:en.filter(e=>/GPU/.test(e.typeData)).length,mesh:en.filter(e=>/Mesh/.test(e.typeData)).length,cpu:en.filter(e=>e.typeData==='CPU').length,peakActiveLOD0Sum:en.reduce((n,e)=>n+(e.peakActiveLOD0||0),0),lodDistances:a.properties.LODDistances,detail:ems};
 }catch(e){out={path:full,error:e.message}}
 cache.set(full,out);process.stderr.write('.');return out;
}
const res={format:'df.resource-emitter-census/1',readAt:new Date().toISOString(),source:'UE 4.24 GPUECli 17780 只读：LoadAsset + object/get；未打开编辑器、未保存',note:'enabledLOD0=LOD0启用的发射器；peakActiveLOD0Sum为资产里记录的PeakActiveParticles（编辑器上次预览统计，可能为0/过期，仅参考）',pc:[],mobile:[]};
for(const r of pc.filter(r=>used.has(r.ResourceId)))res.pc.push({id:r.ResourceId,maxInstance:Number(r.MaxInstanceNum),limit:r.bLimitByMaxInstanceNum,fxType:r.FXType,FxSP:await ps(r.FxSP),FxSP_Low:await ps(r.FxSP_Low),FxSP_High:await ps(r.FxSP_High)});
for(const r of mob)res.mobile.push({id:r.ResourceId,usedByR03:used.has(r.ResourceId),maxInstance:Number(r.MaxInstanceNum),fxType:r.FXType,FxSP:await ps(r.FxSP),FxSP_Low:await ps(r.FxSP_Low),FxSP_High:await ps(r.FxSP_High)});
res.r03MissingOnMobile=[...used].filter(id=>!mob.some(r=>r.ResourceId===id));
fs.writeFileSync('../../../FXtools/节目/NewYearFireWorks_v01/资源发射器数.json',JSON.stringify(res,null,1));
const s=x=>x?(x.error?'ERR '+x.error:`${x.enabledLOD0}/${x.emitters}发射器 GPU${x.gpu} Mesh${x.mesh} CPU${x.cpu} peak${x.peakActiveLOD0Sum}`):'—';
console.log('\nPC');for(const r of res.pc)console.log(r.id.replace('P_EFX_FireWorks_',''),'|',s(r.FxSP),'| Low',s(r.FxSP_Low),'| High',s(r.FxSP_High));
console.log('MOBILE');for(const r of res.mobile)console.log(r.id.replace('P_EFX_FireWorks_',''),'|',s(r.FxSP),'| Low',s(r.FxSP_Low),'| High',s(r.FxSP_High));
console.log('R03 missing on mobile',res.r03MissingOnMobile.length);
