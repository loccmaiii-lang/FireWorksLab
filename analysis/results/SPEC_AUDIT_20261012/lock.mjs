// 只读：彗星 / 银扇的朝向 + 锁轴；2.0 手游 _H 的 Mesh / Ribbon 用法
import fs from 'node:fs';import {request} from '../MOBILE_TEST_20261011/ue.mjs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',SM='/Script/EditorScriptingUtilities.Default__EditorStaticMeshLibrary';
const get=async(path,properties)=>{try{return (await request('/object/get',properties?{path,properties}:{path},120000)).properties}catch(e){return {__err:e.message}}};
const obj=p=>p+'.'+p.split('/').pop();const out={};
async function walk(p,full){await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:p}},120000);const s=await get(obj(p),['Emitters']);const rows=[];
 for(const e of s.Emitters||[]){const b=await get(e.path,['EmitterName','LODLevels']);const l=await get(b.LODLevels[0].path,['Modules','RequiredModule','TypeDataModule','bEnabled']);const r=await get(l.RequiredModule.path,['ScreenAlignment','bUseLocalSpace']);
  const row={name:b.EmitterName,enabled:l.bEnabled,align:r.ScreenAlignment,local:r.bUseLocalSpace,mods:[]};
  for(const m of l.Modules||[]){const c=m.class.replace('ParticleModule','');if(/OrientationAxisLock|Rotation|MeshRotation/.test(c)){const q=await get(m.path);row.mods.push(c+(q.LockAxisFlags?':'+q.LockAxisFlags:'')+(q.StartRotation?.Distribution?.class?':'+q.StartRotation.Distribution.class:''))}else if(full)row.mods.push(c)}
  const td=l.TypeDataModule;if(td){const q=await get(td.path);const k=td.class.replace('ParticleModuleTypeData','');row.type=k;
   if(k==='Mesh'){row.mesh=String(q.Mesh?.path||'').split('.')[0];try{row.verts=(await request('/object/call',{path:SM,function:'GetNumberVerts',args:{StaticMesh:q.Mesh.path,LODIndex:0}})).return_value}catch(e){row.verts='?'+e.message.slice(0,60)};row.meshAlign=q.MeshAlignment;row.cameraFacing=q.bCameraFacing}
   if(k==='Ribbon'){for(const f of ['MaxTessellationBetweenParticles','SheetsPerTrail','MaxTrailCount','MaxParticleInTrailCount','TilingDistance','bRenderTessellation'])row[f]=q[f]}}
  rows.push(row)}
 out[p]=rows;console.log('\n■',p.split('/').pop());for(const r of rows)console.log('   ',r.name,r.enabled?'':'(关)',String(r.align).replace('PSA_',''),r.local?'local':'world',r.type||'',r.mesh?r.mesh.split('/').pop()+' 顶点'+r.verts+' '+r.meshAlign:'',r.type==='Ribbon'?`Tess${r.MaxTessellationBetweenParticles} Sheets${r.SheetsPerTrail} Trails${r.MaxTrailCount} InTrail${r.MaxParticleInTrailCount}`:'',r.mods.join(','))}
for(const p of ['/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_FanComet_01_HD','/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_FanSilver_01_HD'])await walk(p,false);
const r=await request('/object/call',{path:LIB,function:'ListAssets',args:{DirectoryPath:'/Game/Effects/Props/FireWorks',bRecursive:false,bIncludeFolder:false}},180000);const rv=r.return_value;
const H=(Array.isArray(rv)?rv:String(rv).replace(/^\(|\)$/g,'').split(',')).map(s=>String(s).replace(/"/g,'').trim().split('.')[0]).filter(p=>/_H$/.test(p));
console.log('\n手游 _H 共',H.length);const keep=[];
for(const p of H){await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:p}},120000);const s=await get(obj(p),['Emitters']);let has=false;
 for(const e of s.Emitters||[]){const b=await get(e.path,['LODLevels']);const l=await get(b.LODLevels[0].path,['TypeDataModule']);if(l.TypeDataModule&&/Mesh|Ribbon|Beam/.test(l.TypeDataModule.class))has=true}
 if(has)keep.push(p)}
console.log('含 Mesh / Ribbon 的 _H：',keep.map(p=>p.split('/').pop()).join(' '));
for(const p of keep)await walk(p,false);
fs.writeFileSync('lock-mesh.json',JSON.stringify(out,null,1));
