// 第 2 步：PC 核对（只读）。LoadAsset + /object/get；不保存、不改。
import fs from 'node:fs';import {request} from './ue_ro.mjs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const RB=JSON.parse(fs.readFileSync('读回.json','utf8'));
const reqs=[];const get=async(path,properties)=>{reqs.push({route:'/object/get',path,properties});return (await request('/object/get',properties?{path,properties}:{path},120000)).properties};
const load=async p=>{reqs.push({route:'/object/call',function:'LoadAsset',AssetPath:p.split('.')[0]});try{const r=await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:p.split('.')[0]}},120000);return {ok:!!r.return_value&&r.return_value!=='None',ret:r.return_value}}catch(e){return {ok:false,err:e.message}}};
const nameOf=p=>String(p||'').split('.').pop();
async function dist(ref){if(!ref?.path)return null;try{const d=await get(ref.path);const o={class:ref.class};for(const k of ['Constant','Min','Max','bUseExtremes'])if(k in d)o[k]=d[k];if(d.ConstantCurve?.Points?.length)o.curve=d.ConstantCurve.Points.map(p=>({t:p.InVal,v:p.OutVal}));return o}catch(e){return {err:e.message}}}
async function system(p,deep){
 const L=await load(p);if(!L.ok)return {path:p,load:L,loadOk:false};
 const s=await get(p,['Emitters','LODDistances']);const ems=[];
 for(const e of s.Emitters||[]){const b=await get(e.path,['EmitterName','LODLevels']);const l=await get(b.LODLevels[0].path,['bEnabled','TypeDataModule','RequiredModule','Modules','SpawnModule']);
  const em={name:b.EmitterName,enabled:l.bEnabled,gpu:/GpuSprites/i.test(l.TypeDataModule?.class||'')};
  if(deep){const rq=await get(l.RequiredModule.path,['EmitterDuration','EmitterDelay','EmitterLoops','SubImages_Horizontal','SubImages_Vertical','ScreenAlignment','Material']);em.required={dur:rq.EmitterDuration,delay:rq.EmitterDelay,loops:rq.EmitterLoops,grid:rq.SubImages_Horizontal+'x'+rq.SubImages_Vertical,align:rq.ScreenAlignment,mat:nameOf(rq.Material?.path)};
   em.modules=[];for(const m of l.Modules||[]){const c=m.class.replace('ParticleModule','');if(!/^(Location|Lifetime|Velocity|Acceleration|Size|SizeScale|SubUV|Orientation|LocationPrimitive|MeshRotation|Rotation)/.test(c)){em.modules.push({c});continue}
    const mp=await get(m.path);const o={c,enabled:mp.bEnabled};for(const k of ['StartLocation','Lifetime','StartVelocity','StartVelocityRadial','AccelerationAmount','StartSize','SizeScale','LockAxisFlags','StartRotation'])if(mp[k]?.Distribution)o[k]=await dist(mp[k].Distribution);else if(mp[k]!==undefined&&typeof mp[k]!=='object')o[k]=mp[k];em.modules.push(o)}}
  ems.push(em)}
 return {path:p,loadOk:true,lodDistances:(s.LODDistances||[]).length,emitters:ems.length,enabled:ems.filter(e=>e.enabled).length,gpuEnabled:ems.filter(e=>e.enabled&&e.gpu).length,detail:deep?ems:ems.map(e=>({name:e.name,enabled:e.enabled,gpu:e.gpu}))};
}
const out={format:'df.resourcefx-pc-check/1',readAt:new Date().toISOString(),rows:[],trails:{},requests:reqs};
const usage={};for(const x of RB.pcB05)for(const r of x.rows)(usage[r.FxSP]??=[]).push(x.resourceId);
const core=id=>id.replace('P_EFX_FireWorks_','');
for(const x of RB.pcB05){const r=x.rows[0];const row={resourceId:x.resourceId,rowName:r?._row_name,rowDescription:r?.RowDescription,hasRow:!!r,FXType:r?.FXType,EffectScale:r?.EffectScale,FxSP:r?.FxSP,FxSP_Low:r?.FxSP_Low,FxSP_High:r?.FxSP_High};
 if(r){row.fxspNotNone=!!r.FxSP&&r.FxSP!=='None';row.fxsp=row.fxspNotNone?await system(r.FxSP,false):null;
  for(const k of ['FxSP_Low','FxSP_High'])if(r[k]&&r[k]!=='None')row[k+'Check']=await system(r[k],false);
  const pn=nameOf(r.FxSP).replace(/^P_EFX_FireWorks?_/,'').replace(/_HD$/,'');row.particleCore=pn;row.sharedWith=(usage[r.FxSP]||[]).filter(i=>i!==x.resourceId);row.nameMatchesId=pn.toLowerCase()===core(x.resourceId).toLowerCase();}
 out.rows.push(row);console.log(row.resourceId,'|',row.rowName,'|',nameOf(row.FxSP),'| load',row.fxsp?.loadOk,'| em',row.fxsp?.enabled+'/'+row.fxsp?.emitters,'gpu',row.fxsp?.gpuEnabled,'| shared',row.sharedWith?.join(',')||'-','|',row.FXType)}
for(const id of ['P_EFX_FireWorks_RiseTrail_XS','P_EFX_FireWorks_RiseTrail_Tiny','P_EFX_FireWorks_NY_Trail_Small']){const r=RB.pc.find(x=>x.ResourceId===id);out.trails[id]={rowName:r._row_name,FxSP:r.FxSP,sys:await system(r.FxSP,true)}}
const hero=RB.pc.find(x=>x.ResourceId==='P_EFX_FireWorks_RiseTrail_Hero');out.hero={rowName:hero?._row_name,FxSP:hero?.FxSP,pointsToL:/RiseTrail_L_HD/.test(hero?.FxSP||'')};
const kam=RB.pc.find(x=>x.ResourceId==='P_EFX_FireWorks_GoldKamuro');out.goldKamuro={rowName:kam?._row_name,FXType:kam?.FXType};
fs.writeFileSync('PC核对_原始.json',JSON.stringify(out,null,1));
console.log('hero',JSON.stringify(out.hero),'kamuro',JSON.stringify(out.goldKamuro));
