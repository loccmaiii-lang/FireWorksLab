// 只读：今晚 PC 尾缀 S/M/L 重导后核对（不写 UE）
//  ① 远段出生高度 = 新尺寸档（约 77.5 / 107.0 / 165.7 m；旧版 98.1 / 135.1 / 205.8 m）
//  ② Loop / Far 材质实例的 Ramp 都指向 T_EFX_FireWorks_RiseTrail_L_R（去重生效）
//  ③ 发射器 10 个、1 个 LOD；没有新建 *_Mobile* / *Hero* / 多余 Ramp
// 用法：MSYS_NO_PATHCONV=1 node pc-trail-verify.mjs
import {request} from '../MOBILE_TEST_20261011/ue.mjs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',D='/Game/Effects_HD/Props_HD/FireWorks_HD/';
const get=async(path,properties)=>(await request('/object/get',{path,properties},120000)).properties;
const ls=async d=>{const r=await request('/object/call',{path:LIB,function:'ListAssets',args:{DirectoryPath:d,bRecursive:false,bIncludeFolder:false}},180000);const rv=r.return_value;return (Array.isArray(rv)?rv:String(rv).replace(/^\(|\)$/g,'').split(',')).map(s=>String(s).replace(/"/g,'').trim().split('.')[0].split('/').pop()).filter(n=>/RiseTrail/i.test(n))};
const NEW={S:77.5,M:107.0,L:165.7},OLD={S:98.1,M:135.1,L:205.8};let bad=0;const say=(ok,msg)=>{if(!ok)bad++;console.log(ok?'✅':'❌',msg)};
for(const n of ['S','M','L']){
 const p=D+'P_EFX_FireWorks_RiseTrail_'+n+'_HD.P_EFX_FireWorks_RiseTrail_'+n+'_HD';await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:p.split('.')[0]}},120000);
 const ps=await get(p,['Emitters','LODDistances']);say(ps.Emitters.length===10&&ps.LODDistances.length===1,`${n} 发射器 ${ps.Emitters.length}、LOD ${ps.LODDistances.length}`);
 for(const i of [0,1]){const e=await get(ps.Emitters[i].path,['EmitterName','LODLevels']);const l=await get(e.LODLevels[0].path,['Modules','RequiredModule']);
  if(i===1)for(const m of l.Modules)if(/ParticleModuleLocation$/.test(m.class)){const d=(await get(m.path,['StartLocation'])).StartLocation;const z=(await get(d.Distribution.path,['Constant'])).Constant.Z/100;
   say(Math.abs(z-NEW[n])<1.5,`${n} 远段出生 ${z.toFixed(1)} m（新 ${NEW[n]} / 旧 ${OLD[n]}）`)}
  const mi=(await get(l.RequiredModule.path,['Material'])).Material.path;const t=(await get(mi,['TextureParameterValues'])).TextureParameterValues||[];
  const ramp=String(t.find(v=>v.ParameterInfo?.Name==='EmissiveRampTex')?.ParameterValue?.path||'').split('.').pop();
  say(ramp==='T_EFX_FireWorks_RiseTrail_L_R',`${n} ${e.EmitterName} Ramp → ${ramp}`)}}
for(const d of ['/Game/Effects_HD/Props_HD/FireWorks_HD','/Game/Effects_HD/Common_HD/MaterialInstance_HD/FireWorks_HD','/Game/Effects/Common/Texture/Fireworks','/Game/Effects/Common/Texture/Ramp','/Game/Effects/Props/FireWorks']){
 const extra=(await ls(d)).filter(x=>/Mobile|Hero/.test(x));say(!extra.length,`${d.split('/').slice(-2).join('/')} 没有多出的手机 / 主角资产${extra.length?'：'+extra.join(' '):''}`)}
console.log(bad?`\n${bad} 项不对，先别补手调，把输出发我`:'\n全部通过；可以补 S 亮度 / M 关火花的手调');
