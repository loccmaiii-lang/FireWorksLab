// 写 UE：尾缀更新后补回用户在 UE 里的手调（S 火花亮度 ×20/×50；M 关掉的 4 个 GPU 火花发射器）。只动 PC 版 S / M。
// 跑前核对现场 = 导入后快照（防止重复写 / 别人改过）；写完保存并读回。
import fs from 'node:fs';import {request} from './ue.mjs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',D='/Game/Effects_HD/Props_HD/FireWorks_HD/';
const before=JSON.parse(fs.readFileSync('tail-before-import.json','utf8')).systems,after=JSON.parse(fs.readFileSync('tail-after-import.json','utf8')).systems;
const get=async(path,properties)=>(await request('/object/get',properties?{path,properties}:{path})).properties;
const set=async(path,properties)=>{const r=await request('/object/set',{path,properties});if((r.failed_properties||[]).length)throw Error('写入失败 '+path+' '+JSON.stringify(r.failed_properties));};
const cont=async(path,container_path,op,value,index)=>{const b={path,container_path,op};if(value!==undefined)b.value=value;if(index!==undefined)b.index=index;const r=await request('/object/container',b);if(r.ok!==true)throw Error('数组操作失败 '+container_path+' '+JSON.stringify(r));};
const f6=x=>Number(x).toFixed(6),log=[];
for(const n of ['RiseTrail_S_HD','RiseTrail_M_HD']){
 const B=before[n],A=after[n],PS=A.path;
 // 1) 核对现场 = 导入后快照
 for(const e of A.emitters){const l=await get(e.lod,['bEnabled']);const c=e.colorScale?.distribution?(await get(e.colorScale.distribution,['Constant'])).Constant:null;
  if(l.bEnabled!==e.enabled||(c&&+c.X!==+e.colorScale.constant.X))throw Error(n+' '+e.name+' 现场和导入后快照不一致，停止（可能已补过或有人改过）');}
 for(let i=0;i<B.emitters.length;i++){const b=B.emitters[i],a=A.emitters[i];if(b.name!==a.name)throw Error('发射器顺序变了：'+b.name+' / '+a.name);
  const bv=b.colorScale?.constant,av=a.colorScale?.constant;
  if(bv&&av&&(+bv.X!==+av.X||+bv.Y!==+av.Y||+bv.Z!==+av.Z)){await set(a.colorScale.distribution,{Constant:`(X=${f6(bv.X)},Y=${f6(bv.Y)},Z=${f6(bv.Z)})`});log.push(`${n} ${a.name} 亮度 ${av.X} → ${bv.X}`);}
  if(b.enabled!==a.enabled){
   const lod=await get(a.lod,['RequiredModule']);await set(a.lod,{bEnabled:b.enabled});await set(lod.RequiredModule.path,{bEnabled:b.enabled});
   const solo=(await get(PS,['SoloTracking'])).SoloTracking[i].SoloEnableSetting,want=b.enabled?1:0,p='SoloTracking['+i+'].SoloEnableSetting';
   await cont(PS,p,'array_append',want);for(let j=0;j<solo.length;j++)await cont(PS,p,'array_remove',undefined,0);
   log.push(`${n} ${a.name} 启用 ${a.enabled} → ${b.enabled}`);}
 }
 // 2) 让粒子系统按新值重建（与导入器同一写入接口），保存
 const tw=(await get(PS,['ThumbnailWarmup'])).ThumbnailWarmup;await set(PS,{ThumbnailWarmup:tw});
 const pkg=D+'P_EFX_FireWorks_'+n;const sv=await request('/object/call',{path:LIB,function:'SaveAsset',args:{AssetToSave:pkg,bOnlyIfIsDirty:false}},120000);
 log.push(`${n} 保存 ${sv.return_value}`);
}
console.log(log.join('\n'));
