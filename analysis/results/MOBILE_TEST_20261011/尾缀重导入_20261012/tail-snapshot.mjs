// 只读：尾缀 S/M/L 当前引擎状态（每个发射器 LOD0 启用、ColorScaleOverLife 分布、SoloTracking），供更新后补回手调。
import {request} from './ue.mjs';import fs from 'node:fs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',D='/Game/Effects_HD/Props_HD/FireWorks_HD/';
const out={readAt:new Date().toISOString(),systems:{}};
for(const n of (process.argv[2]||'RiseTrail_S_HD,RiseTrail_M_HD,RiseTrail_L_HD').split(',')){
 const pkg=D+'P_EFX_FireWorks_'+n,path=pkg+'.P_EFX_FireWorks_'+n;
 const ex=(await request('/object/call',{path:LIB,function:'DoesAssetExist',args:{AssetPath:pkg}})).return_value;if(String(ex)!=='True'){out.systems[n]=null;continue;}
 await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:pkg}});
 const ps=(await request('/object/get',{path,properties:['Emitters','SoloTracking']})).properties;const ems=[];
 for(const e of ps.Emitters){
  const b=(await request('/object/get',{path:e.path,properties:['EmitterName','LODLevels']})).properties;
  const l=(await request('/object/get',{path:b.LODLevels[0].path,properties:['Modules','bEnabled','TypeDataModule']})).properties;
  const em={name:b.EmitterName,emitter:e.path,lod:b.LODLevels[0].path,enabled:l.bEnabled,gpu:!!l.TypeDataModule&&/Gpu/i.test(l.TypeDataModule.class),colorScale:null};
  for(const m of l.Modules||[]){if(!/ColorScaleOverLife/.test(m.class||''))continue;
   const p=(await request('/object/get',{path:m.path,properties:['ColorScaleOverLife','AlphaScaleOverLife']})).properties;
   const dp=p.ColorScaleOverLife?.Distribution?.path;const d=dp?(await request('/object/get',{path:dp})).properties:null;
   em.colorScale={module:m.path,distribution:dp,class:p.ColorScaleOverLife?.Distribution?.class,constant:d?.Constant??null,canBake:d?.bCanBeBaked??null,keys:d?.ConstantCurve?.Points?.length??null};}
  ems.push(em);}
 out.systems[n]={path,soloTracking:ps.SoloTracking,emitters:ems};
 console.log(n,ems.map(e=>`${e.name}${e.enabled?'':'(关)'}${e.colorScale?.constant?'×'+e.colorScale.constant.X:''}`).join(' '));
}
fs.writeFileSync(process.argv[3]||'tail-before-import.json',JSON.stringify(out,null,1));
