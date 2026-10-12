// 只读：UE 里 RiseTrail_S/M/L（PC _HD）RiseLoop 的出膛速度、面片长度、寿命 → 认出是哪一版、多高。
// 只用 /object/get（LoadAsset 只把已在磁盘的资产载入内存，不写、不保存）。
import fs from 'node:fs';import {request} from '../MOBILE_TEST_20261011/ue.mjs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',D='/Game/Effects_HD/Props_HD/FireWorks_HD/';
const dist=async ref=>{if(!ref)return null;const g=(await request('/object/get',{path:ref.path})).properties;if('Constant' in g)return g.Constant;if('Min' in g)return {min:g.Min,max:g.Max};return null};
const out={readAt:new Date().toISOString(),trails:{}};
for(const n of ['S','M','L']){
  const pkg=D+'P_EFX_FireWorks_RiseTrail_'+n+'_HD',full=pkg+'.P_EFX_FireWorks_RiseTrail_'+n+'_HD';
  await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:pkg}});
  const a=(await request('/object/get',{path:full,properties:['Emitters']})).properties;const ems=[];
  for(const e of a.Emitters){const b=(await request('/object/get',{path:e.path,properties:['EmitterName','LODLevels']})).properties;
    if(!/RiseLoop|TrailFar/.test(b.EmitterName))continue;
    const l=(await request('/object/get',{path:b.LODLevels[0].path,properties:['Modules','RequiredModule','bEnabled']})).properties;
    const r=(await request('/object/get',{path:l.RequiredModule.path,properties:['EmitterDuration','EmitterDelay']})).properties;
    const em={name:b.EmitterName,enabled:l.bEnabled,duration:r.EmitterDuration,delay:r.EmitterDelay};
    for(const m of l.Modules){const cls=m.class.replace('ParticleModule','');const p=(await request('/object/get',{path:m.path})).properties;
      if(cls==='Lifetime')em.life=await dist(p.Lifetime?.Distribution);
      if(cls==='Size')em.size=await dist(p.StartSize?.Distribution);
      if(cls==='Velocity')em.vel=await dist(p.StartVelocity?.Distribution);
      if(cls==='Location')em.loc=await dist(p.StartLocation?.Distribution);}
    ems.push(em)}
  out.trails[n]=ems;console.log(n,JSON.stringify(ems))}
fs.writeFileSync('trails-now.json',JSON.stringify(out,null,1));
