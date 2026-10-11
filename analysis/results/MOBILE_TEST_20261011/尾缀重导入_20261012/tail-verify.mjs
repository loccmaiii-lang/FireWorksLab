// 只读：导入后引擎粒子 vs 交付包 cascade.json 逐发射器逐模块比对（寿命 / 尺寸 / 初速 / 出生位置 / 加速度 / 亮度 / 时长 / 材质）
import fs from 'node:fs';import {request} from './ue.mjs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',D='/Game/Effects_HD/Props_HD/FireWorks_HD/',R='D:/ProjectTextures/FireWorksLab/尾缀/';
const SETS=[['RiseTrail_S','小/RiseTrail_S/revisions/50764d6d0def08376683'],['RiseTrail_M','中/RiseTrail_M/revisions/b4994b2d3f6fa743e7c3'],['RiseTrail_L','大/RiseTrail_L/revisions/d11c724a11587dd83029'],['RiseTrail_Hero_L','大/RiseTrail_Hero_L/revisions/004bd2f24f5f28506b10']];
const MAP={Lifetime:['Lifetime','Lifetime'],InitialSize:['Size','StartSize'],InitialVelocity:['Velocity','StartVelocity'],InitialLocation:['Location','StartLocation'],ColorScaleOverLife:['ColorScaleOverLife','ColorScaleOverLife']};
const get=async(path,properties)=>(await request('/object/get',properties?{path,properties}:{path})).properties;
const num=v=>v&&typeof v==='object'&&'X' in v?[+v.X,+v.Y,+v.Z]:+v;
async function engDist(ref){if(!ref?.Distribution?.path)return null;const g=await get(ref.Distribution.path);
 if('Constant' in g)return {const:num(g.Constant)};if('Min' in g&&'Max' in g)return {uniform:[num(g.Min),num(g.Max)]};if(g.ConstantCurve)return {curve:(g.ConstantCurve.Points||[]).map(p=>[+p.InVal,num(p.OutVal)])};return {raw:Object.keys(g)}}
const flat=x=>Array.isArray(x)?x.flatMap(flat):[x];
const close=(a,b)=>{const A=flat(a),B=flat(b);if(A.length!==B.length){if(A.length===3&&B.length===1)return A.every(x=>Math.abs(x-B[0])<=Math.max(0.02,Math.abs(B[0])*0.003));return false}return A.every((x,i)=>Math.abs(x-B[i])<=Math.max(0.02,Math.abs(B[i])*0.003))};
function same(p,e){if(!p||!e)return false;if('const' in p)return 'const' in e?close(e.const,p.const):'uniform' in e&&close(e.uniform[0],p.const)&&close(e.uniform[1],p.const);
 if('uniform' in p)return 'uniform' in e&&close(e.uniform[0],p.uniform[0])&&close(e.uniform[1],p.uniform[1]);
 if('curve' in p)return 'curve' in e&&e.curve.length===p.curve.length&&p.curve.every(([t,v],i)=>Math.abs(e.curve[i][0]-t)<0.002&&close(e.curve[i][1],v));return false}
const report={readAt:new Date().toISOString(),systems:[]};let bad=0,checked=0;
for(const [base,rev] of SETS)for(const [plat,file,suffix] of [['pc','PC/cascade.json','_HD'],['mobile','手机/cascade_mobile.json','_Mobile_HD']]){
 const name='P_EFX_FireWorks_'+base+suffix,pkg=D+name,path=pkg+'.'+name,spec=JSON.parse(fs.readFileSync(R+rev+'/'+file,'utf8'));
 await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:pkg}});
 const ps=await get(path,['Emitters','FixedRelativeBoundingBox','bUseFixedRelativeBoundingBox']);const sys={name,platform:plat,emitters:ps.Emitters.length,expected:spec.emitters.length,diffs:[]};
 if(ps.Emitters.length!==spec.emitters.length)sys.diffs.push('发射器数 '+ps.Emitters.length+' / 包 '+spec.emitters.length);
 for(let i=0;i<spec.emitters.length;i++){const se=spec.emitters[i],ep=ps.Emitters[i]?.path;if(!ep)continue;
  const em=await get(ep,['EmitterName','LODLevels']);if(em.EmitterName!==se.name)sys.diffs.push(`#${i} 名字 ${em.EmitterName} / ${se.name}`);
  const lod=await get(em.LODLevels[0].path,['Modules','RequiredModule','TypeDataModule','bEnabled']);const req=await get(lod.RequiredModule.path,['Material','EmitterDuration','SubImages_Horizontal','SubImages_Vertical','ScreenAlignment']);
  if(!!se.gpu!==(!!lod.TypeDataModule&&/Gpu/i.test(lod.TypeDataModule.class)))sys.diffs.push(`${se.name} GPU 不符`);
  if(se.required?.duration_s!=null&&Math.abs(+req.EmitterDuration-se.required.duration_s)>0.002)sys.diffs.push(`${se.name} 时长 ${req.EmitterDuration} / ${se.required.duration_s}`);
  const mods=[];for(const m of lod.Modules||[])mods.push({cls:(m.class||'').replace('ParticleModule',''),path:m.path});
  const used={};for(const m of se.modules||[]){const map=MAP[m.m];if(!map)continue;const [cls,prop]=map,key=Object.keys(m).find(k=>k!=='m'&&k!=='note'&&typeof m[k]==='object');if(!key)continue;
   const cands=mods.filter(x=>x.cls===cls);const k=used[cls]=(used[cls]||0);used[cls]++;const target=cands[k];checked++;
   if(!target){sys.diffs.push(`${se.name} 缺 ${cls}`);bad++;continue}
   const ev=await engDist((await get(target.path,[prop]))[prop]);if(!same(m[key],ev)){bad++;sys.diffs.push(`${se.name} ${m.m}.${key} 包 ${JSON.stringify(m[key]).slice(0,120)} / 引擎 ${JSON.stringify(ev).slice(0,120)}`)}}
 }
 report.systems.push(sys);console.log(name,'发射器',sys.emitters+'/'+sys.expected,sys.diffs.length?'差异 '+sys.diffs.length+'：'+sys.diffs.slice(0,6).join(' | '):'✅ 全部一致');
}
report.checkedValues=checked;report.mismatch=bad;fs.writeFileSync('tail-verify.json',JSON.stringify(report,null,1));console.log('比对数值',checked,'不一致',bad);
