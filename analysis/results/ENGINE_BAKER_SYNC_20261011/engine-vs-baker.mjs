// 只读：引擎里的粒子参数 vs 烘焙器导出包 cascade.json，逐发射器比对
import fs from 'node:fs';import {request} from './ue.mjs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',D='/Game/Effects_HD/Props_HD/FireWorks_HD/',ROOT='D:/ProjectTextures/FireWorksLab/';
const PAIRS={LimeStar_HD:['LimeStar'],GoldCoreLime_HD:['GoldCoreLime'],GoldRay_HD:['GoldRay','GoldRay/GoldRay'],LimeCoreDelay_HD:['LimeCoreDelay'],Combo_HD:['Combo'],Crackle_HD:['Crackle','Crackle_01'],
 RiseTrail_S_HD:['RiseTrail_S (1)','RiseTrail_S (2)'],RiseTrail_M_HD:['RiseTrail_M','RiseTrail_M (1)','RiseTrail_M (2)','尾缀/中/RiseTrailPhys_M/revisions/472c3ec02f47c12d1fa1/PC'],RiseTrail_L_HD:['RiseTrail_L','RiseTrail_L (2)','RiseTrail_L (3)','尾缀/大/RiseTrail_L_W80/revisions/7e289eb0c28bcd84b1e9/PC'],GoldKamuro_HD:['YonshakuKamuro']};
const OTHERS=['GoldSpark_HD','GoldChry_HD','LittleChry_HD','SilverChry_HD','GreenPeony_HD','FanComet_01_HD','FanSilver_01_HD'];
const SMALL=['P_EFX_FireWork_NY_Small_B_HD','P_EFX_FireWork_PrismWheels_HD'];
const dist=async ref=>{if(!ref)return null;const g=(await request('/object/get',{path:ref.path})).properties;if('Constant' in g)return g.Constant;if(g.ConstantCurve)return {curvePoints:(g.ConstantCurve.Points||[]).length,last:g.ConstantCurve.Points?.at(-1)?.OutVal};if('Min' in g)return {min:g.Min,max:g.Max};return null};
const vec=v=>v&&typeof v==='object'?[v.X,v.Y,v.Z].map(x=>+(+x).toFixed(2)):v;
async function engine(full){
 const pkg=full.split('.')[0];await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:pkg}});
 const a=await request('/object/get',{path:full,properties:['Emitters']});const out=[];
 for(const e of a.properties.Emitters){const b=(await request('/object/get',{path:e.path,properties:['EmitterName','LODLevels']})).properties;const l=(await request('/object/get',{path:b.LODLevels[0].path,properties:['Modules','RequiredModule','bEnabled','TypeDataModule']})).properties;
  const r=(await request('/object/get',{path:l.RequiredModule.path,properties:['ScreenAlignment','EmitterDuration','Material']})).properties;
  const em={name:b.EmitterName,enabled:l.bEnabled,gpu:!!l.TypeDataModule&&/Gpu/i.test(l.TypeDataModule.class),align:r.ScreenAlignment,duration:+r.EmitterDuration.toFixed(4),material:String(r.Material?.path||'').split('.').pop(),modules:[]};
  for(const m of l.Modules){const p=(await request('/object/get',{path:m.path})).properties;const x={cls:m.class.replace('ParticleModule','')};
   if(x.cls==='Lifetime')x.Lifetime=await dist(p.Lifetime?.Distribution);
   if(x.cls==='Size'){const c=await dist(p.StartSize?.Distribution);x.StartSize=c&&'X' in c?vec(c):vec(p.StartSize?.MaxValueVec)}
   if(x.cls==='ColorScaleOverLife'){const c=await dist(p.ColorScaleOverLife?.Distribution);x.ColorScale=c&&typeof c==='object'&&'X' in c?vec(c):c&&c.last?['curve',c.last]:vec(p.ColorScaleOverLife?.MaxValueVec)}
   if(x.cls==='PivotOffset')x.Pivot=[p.PivotOffset.X,p.PivotOffset.Y].map(v=>+v.toFixed(4));
   if(x.cls.startsWith('Velocity'))x.StartVelocity=vec(p.StartVelocity?.MaxValueVec),x.Radial=p.StartVelocityRadial?.MaxValue;
   if(x.cls==='SizeMultiplyLife')x.LifeMultiplier=vec(p.LifeMultiplier?.MaxValueVec);
   em.modules.push(x)}
  out.push(em)}
 return out}
function baker(dir){const f=ROOT+dir+'/cascade.json';if(!fs.existsSync(f))return null;const d=JSON.parse(fs.readFileSync(f,'utf8'));
 return {dir,tool:d.source?.tool,size_spec:d.size_spec||null,export_scale:d.export_scale||null,emitters:d.emitters.map(e=>({name:e.name,gpu:!!e.gpu,align:e.required?.screen_alignment,duration:e.required?.duration_s,pivot:e.required?.pivot_offset,mods:e.modules.map(m=>m.m),Lifetime:e.modules.find(m=>m.m==='Lifetime')?.Lifetime?.const,StartSize:e.modules.find(m=>m.m==='InitialSize')?.StartSize?.const,ColorScale:e.modules.find(m=>m.m==='ColorScaleOverLife')?.ColorScaleOverLife?.const}))}}
const near=(a,b)=>a!=null&&b!=null&&Math.abs(a-b)<=Math.max(0.01,Math.abs(b)*0.002);
const result={readAt:new Date().toISOString(),note:'只读比对；ScreenAlignment 现场值可能是本轮内存测试改成的 FacingCameraPosition，以备份原值为准',pairs:[],others:[]};
for(const [ps,dirs] of Object.entries(PAIRS)){
 const full=D+'P_EFX_FireWorks_'+ps+'.P_EFX_FireWorks_'+ps;const eng=await engine(full);
 const cands=dirs.map(baker).filter(Boolean);let best=null;
 for(const c of cands){let score=0,total=0;const diffs=[];
  for(const be of c.emitters){const ee=eng.find(e=>e.name===be.name);total++;if(!ee){diffs.push(`${be.name}: 引擎里没有`);continue}
   const es=ee.modules.find(m=>m.cls==='Size')?.StartSize,el=ee.modules.find(m=>m.cls==='Lifetime')?.Lifetime,ec=ee.modules.find(m=>m.cls==='ColorScaleOverLife')?.ColorScale;
   let ok=true;
   if(be.StartSize&&!(es&&near(es[0],be.StartSize[0]))){ok=false;diffs.push(`${be.name}: 面片尺寸 导出${be.StartSize?.[0]} / 引擎${es?.[0]}`)}
   if(be.Lifetime!=null&&!near(typeof el==='number'?el:null,be.Lifetime)){ok=false;diffs.push(`${be.name}: 寿命 导出${be.Lifetime} / 引擎${JSON.stringify(el)}`)}
   if(be.duration!=null&&!near(ee.duration,be.duration)){ok=false;diffs.push(`${be.name}: 时长 导出${be.duration} / 引擎${ee.duration}`)}
   const bc=be.ColorScale?.[0]??1,ecv=ec?.[0]==='curve'?null:(ec?.[0]??1);if(ecv!=null&&!near(ecv,bc))diffs.push(`${be.name}: 亮度倍数 导出${bc} / 引擎${ecv}（UE 里手调过）`);
   if(ok)score++}
  const extra=eng.filter(e=>!c.emitters.some(b=>b.name===e.name)).map(e=>e.name);if(extra.length)diffs.push('引擎多出发射器: '+extra.join(','));
  const r={dir:c.dir,tool:c.tool,size_spec:c.size_spec,matchedEmitters:`${score}/${total}`,diffs};if(!best||score/total>best.s)best={s:score/total,r};}
 result.pairs.push({engine:ps,emitters:eng.map(e=>({name:e.name,enabled:e.enabled,gpu:e.gpu,align:e.align,size:e.modules.find(m=>m.cls==='Size')?.StartSize?.[0],life:e.modules.find(m=>m.cls==='Lifetime')?.Lifetime,colorScale:e.modules.find(m=>m.cls==='ColorScaleOverLife')?.ColorScale?.[0]})),best:best?.r,candidates:cands.length});
 console.log(ps,'→',best?.r.dir,best?.r.tool,best?.r.matchedEmitters,best?.r.size_spec?('size_spec k='+best.r.size_spec.k):'',best?.r.diffs.slice(0,6).join(' | '));
}
for(const ps of OTHERS){const full=D+'P_EFX_FireWorks_'+ps+'.P_EFX_FireWorks_'+ps;const eng=await engine(full);result.others.push({engine:ps,emitters:eng.map(e=>({name:e.name,enabled:e.enabled,gpu:e.gpu,size:e.modules.find(m=>m.cls==='Size')?.StartSize?.[0],life:e.modules.find(m=>m.cls==='Lifetime')?.Lifetime,mods:e.modules.map(m=>m.cls).join(',')}))});console.log('OTHER',ps,eng.map(e=>e.name).join(','))}
fs.writeFileSync('engine-vs-baker.json',JSON.stringify(result,null,1));
