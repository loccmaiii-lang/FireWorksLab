// T01: read-only LOD0 archive. No calls, setters, asset saves, or UE lifecycle actions.
// Usage: node analysis/scripts/ue_readback_values.mjs [new-output.json]
import fs from 'node:fs';
import path from 'node:path';
import {request} from './workbench_engine_acceptance.mjs';

const ids=['FanComet_01','FanSilver_01','GoldSpark','OrangeGlitter','Lime'].map(x=>'P_EFX_FireWorks_'+x);
const output=process.argv[2]||'analysis/results/UE_READBACK_20261014/导入前现值.json';
if(fs.existsSync(output))throw Error('Archive exists; choose a new output path');
const census=JSON.parse(fs.readFileSync('FXtools/节目/NewYearFireWorks_v01/资源发射器数.json','utf8'));
const result={format:'df.ue-readback/1',readAt:new Date().toLocaleString('sv-SE',{timeZone:'Asia/Hong_Kong'}).replace(' ','T')+'+08:00',source:'GPUECli 只读',scope:'五个资源的全部发射器（含禁用发射器），LOD0；单位 cm、cm/s、s',readOnlyEvidence:'只用了 /object/get、/object/search；未保存、改值、导入、替换、P4 或开关 UE。',assets:[],missing:[],objects:{},requests:[],notes:['分布对象的 ConstantCurve/Vector/FloatCurve 完整关键帧与切线单独读回；RawDistribution 的缓存查找表同时保留，不能把缓存值当作当前编辑曲线。','亮度记录为 RGB 分量倍率，不把带颜色的向量冒充单一亮度倍数；不包含材质着色器与后期曝光的合成光量。']};
async function get(ref){
 const p=typeof ref==='string'?ref:ref?.path;if(!p)return null;
 if(Object.hasOwn(result.objects,p))return result.objects[p];
 result.requests.push({route:'/object/get',path:p});
 try{const o=await request('/object/get',{path:p});result.objects[p]=o;return o;}
 catch(e){result.objects[p]=null;result.missing.push({path:p,reason:e.message});return null;}
}
async function expand(value){
 if(!value||typeof value!=='object')return value;
 if(value._type==='object_ref'&&/^Distribution/.test(value.class||'')){
  const o=await get(value);return {...value,readback:o?.properties??null,...(!o?{reason:'分布对象读取失败，见 missing'}:{})};
 }
 if(Array.isArray(value)){const a=[];for(const v of value)a.push(await expand(v));return a;}
 const o={};for(const [k,v] of Object.entries(value))o[k]=await expand(v);return o;
}
function field(p,k,missing){if(p&&Object.hasOwn(p,k))return p[k];missing.push({field:k,reason:'object/get 未返回该字段'});return null;}
async function module(ref){const o=await get(ref);return o?{path:o.path,class:o.class,properties:await expand(o.properties)}:null;}
function group(modules,re){return modules.filter(m=>re.test(m.class));}
function nullableModules(modules,re,name,missing){const a=group(modules,re);if(a.length)return a;missing.push({field:name,reason:'LOD0 未挂载该模块（不猜隐含默认值）'});return null;}
function authored(dist){return dist?.Distribution?.readback??null;}
function values(d){
 if(!d)return [];
 if(Object.hasOwn(d,'Constant'))return [d.Constant];
 if(Object.hasOwn(d,'Min')&&Object.hasOwn(d,'Max'))return [d.Min,d.Max];
 return Object.values(d).flatMap(x=>Array.isArray(x?.Points)?x.Points.flatMap(p=>[p.OutVal]):[]);
}
function channels(v){return typeof v==='number'?[v]:v&&typeof v==='object'?['X','Y','Z'].filter(k=>typeof v[k]==='number').map(k=>v[k]):[];}
for(const resourceId of ids){
 const row=census.pc.find(x=>x.id===resourceId),particlePath=row?.FxSP?.path;
 if(!particlePath){result.missing.push({resourceId,reason:'资源发射器数.json 的 PC 行或 FxSP 路径不存在'});continue;}
 const obj=await get(particlePath);if(!obj){result.assets.push({resourceId,particlePath,system:null,emitters:[],reason:'系统读取失败，见 missing'});continue;}
 const p=obj.properties,missing=[];
 const system=Object.fromEntries(['SystemUpdateMode','UpdateTime_FPS','UpdateTime_Delta','bUseFixedRelativeBoundingBox','FixedRelativeBoundingBox','CullingDistance','CullingScreenSize','LODDistances','LODMethod','LODDistanceCheckTime','WarmupTime','WarmupTickRate'].map(k=>[k,field(p,k,missing)]));
 const box=system.FixedRelativeBoundingBox;
 system.boundsSize=box?.Min&&box?.Max?Object.fromEntries(['X','Y','Z'].map(k=>[k,box.Max[k]-box.Min[k]])):null;
 system.missing=missing;
 const asset={resourceId,particlePath,system,emitters:[]};result.assets.push(asset);
 for(const ref of p.Emitters||[]){
  const eo=await get(ref),ep=eo?.properties,missing=[];
  const em={path:ref.path,name:field(ep,'EmitterName',missing),enabledLOD0:null,typeData:null,required:null,spawn:null,lifetime:null,initialSize:null,sizeByLife:null,colorOverLife:null,colorScaleOverLife:null,initialVelocity:null,drag:null,brightnessMultiplier:null,gpuMaxDrawCount:null,modules:[],missing};asset.emitters.push(em);
  const l=await get(ep?.LODLevels?.[0]);if(!l){missing.push({field:'LOD0',reason:'无 LOD0 引用或读取失败'});continue;}
  em.enabledLOD0=field(l.properties,'bEnabled',missing);
  em.typeData=l.properties.TypeDataModule?await module(l.properties.TypeDataModule):{class:'CPU',reason:'LOD0 TypeDataModule 为 null'};
  em.required=await module(l.properties.RequiredModule);
  em.spawn=await module(l.properties.SpawnModule);
  for(const m of l.properties.Modules||[]){const mo=await module(m);if(mo)em.modules.push(mo);}
  for(const [key,re] of Object.entries({lifetime:/ParticleModuleLifetime(?:_Seeded)?$/,initialSize:/ParticleModuleSize(?:_Seeded)?$/,sizeByLife:/ParticleModuleSizeMultiplyLife$/,colorOverLife:/ParticleModuleColor(?:OverLife|_Seeded)?$/,colorScaleOverLife:/ParticleModuleColorScaleOverLife$/,initialVelocity:/ParticleModuleVelocity(?:_Seeded)?$/,drag:/ParticleModuleAccelerationDrag(?:ScaleOverLife)?$/}))em[key]=nullableModules(em.modules,re,key,missing);
  const scales=(em.colorScaleOverLife||[]).map(m=>({modulePath:m.path,enabled:m.properties.bEnabled,distribution:authored(m.properties.ColorScaleOverLife),raw:m.properties.ColorScaleOverLife}));
  if(scales.length){em.brightnessMultiplier={kind:'ColorScaleOverLife RGB 分量倍率；完整分布/曲线见 distribution',scales,authoredComponentRange:scales.flatMap(x=>values(x.distribution)).flatMap(channels).reduce((a,n)=>[Math.min(a[0],n),Math.max(a[1],n)],[Infinity,-Infinity])};if(!em.brightnessMultiplier.authoredComponentRange.every(Number.isFinite)){em.brightnessMultiplier.authoredComponentRange=null;missing.push({field:'brightnessMultiplier.authoredComponentRange',reason:'分布类型未能提取范围；原始属性仍在 distribution'});}}
  else missing.push({field:'brightnessMultiplier',reason:'未挂载 ColorScaleOverLife；颜色分布保存在 colorOverLife，未假定亮度=1'});
  if(/Gpu/i.test(em.typeData?.class||'')){const r=em.required?.properties;em.gpuMaxDrawCount={enabled:field(r,'bUseMaxDrawCount',missing),value:field(r,'MaxDrawCount',missing)};}
  else missing.push({field:'gpuMaxDrawCount',reason:'非 GPU 发射器，不适用'});
 }
 console.log(resourceId,asset.emitters.length,'emitters');
}
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({output,assets:result.assets.length,emitters:result.assets.reduce((n,a)=>n+a.emitters.length,0),failedReads:result.missing.length,requests:result.requests.length}));
