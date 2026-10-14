// 第 3 步：找 10 个手游 ResourceId 的 _M 粒子（只读：ListAssets / DoesAssetExist）
import fs from 'node:fs';import {request} from './ue_ro.mjs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const RB=JSON.parse(fs.readFileSync('读回.json','utf8'));
const TEN=['GoldRayChry','SilverChry','Glitter','Crackle','Strobe','LittleCombo','NY_Trail_Small','NY_Trail_Medium','NY_Trail_Large','RiseTrail_Tiny'].map(s=>'P_EFX_FireWorks_'+s);
const dirs=['/Game/Effects/Props/FireWorks','/Game/Effects/Props','/Game/Effects'];const listing={};
for(const d of dirs.slice(0,1)){const r=await request('/object/call',{path:LIB,function:'ListAssets',args:{DirectoryPath:d,bRecursive:true,bIncludeFolder:false}},180000);const rv=r.return_value;listing[d]=(Array.isArray(rv)?rv:String(rv).replace(/^\(|\)$/g,'').split(',')).map(s=>String(s).replace(/"/g,'').trim()).filter(Boolean)}
const all=listing['/Game/Effects/Props/FireWorks'];const ps=all.filter(p=>/\/P_EFX_FireWork/i.test(p));
const base=p=>p.split('/').pop().split('.')[0];
const out={readAt:new Date().toISOString(),mobileDir:'/Game/Effects/Props/FireWorks',assetsInDir:all.length,particleAssets:ps.map(base).sort(),rows:[]};
for(const id of TEN){const pc=RB.pc.find(r=>r.ResourceId===id);const pcName=base(pc.FxSP);const derived=pcName.replace(/_HD$/,'')+'_M';
 const alts=[derived];if(id.endsWith('GoldRayChry'))alts.push('P_EFX_FireWorks_GoldSpark_M','P_EFX_FireWorks_GoldRayChry_M');if(id.endsWith('Glitter'))alts.push('P_EFX_FireWorks_Combo_M','P_EFX_FireWorks_Glitter_M');
 const core=id.replace('P_EFX_FireWorks_','').replace(/^NY_Trail_(Small|Medium|Large)$/,(m,s)=>'RiseTrail_'+s[0]);
 const found=[...new Set(alts)].map(n=>({name:n,paths:ps.filter(p=>base(p).toLowerCase()===n.toLowerCase())}));
 const byName=ps.filter(p=>base(p).toLowerCase().includes(core.toLowerCase())&&/_M$/i.test(base(p)));
 out.rows.push({resourceId:id,pcRow:pc._row_name,pcFxSP:pc.FxSP,derivedMobileName:derived,exact:found,searchByName:{core,hits:byName}});
 console.log(id,'| PC',pcName,'| 派生',derived,'| 精确',found.map(f=>f.name+':'+f.paths.length).join(' '),'| 按名',byName.map(base).join(','));}
fs.writeFileSync('手游_M查找.json',JSON.stringify(out,null,1));
console.log('dir assets',all.length,'particles',ps.length);console.log(out.particleAssets.filter(n=>/_M$/.test(n)).join(' '));
