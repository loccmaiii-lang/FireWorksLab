// 只读：粒子 → LOD / 发射器 / 材质实例 → 母材质链 / 贴图（目录、尺寸、压缩、上限）
import fs from 'node:fs';import {request} from '../MOBILE_TEST_20261011/ue.mjs';
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const get=async(path,properties)=>{try{return (await request('/object/get',properties?{path,properties}:{path})).properties}catch(e){return {__err:e.message}}};
const obj=p=>p.includes('.')?p:p+'.'+p.split('/').pop();const pkg=p=>p.split('.')[0];
const texCache=new Map(),miCache=new Map();
async function tex(path){if(texCache.has(path))return texCache.get(path);const p=await get(path,['MaxTextureSize','CompressionSettings','LODGroup','SRGB']);let sx=null,sy=null;try{sx=(await request('/object/call',{path,function:'Blueprint_GetSizeX'})).return_value;sy=(await request('/object/call',{path,function:'Blueprint_GetSizeY'})).return_value}catch(e){}
 const r={path:pkg(path),max:p.MaxTextureSize,comp:p.CompressionSettings,lodGroup:p.LODGroup,size:sx?sx+'x'+sy:null};texCache.set(path,r);return r}
async function mi(path){if(miCache.has(path))return miCache.get(path);const chain=[];let cur=path,texs=[];
 for(let i=0;i<6&&cur;i++){const p=await get(cur,['Parent','TextureParameterValues']);chain.push(pkg(cur));if(i===0)for(const t of p.TextureParameterValues||[])if(t.ParameterValue?.path)texs.push({param:t.ParameterInfo?.Name,...await tex(t.ParameterValue.path)});cur=p.Parent?.path;if(!cur)break;if(!/MaterialInstance/i.test(p.Parent.class||'')){chain.push(pkg(cur));break}}
 const r={mi:pkg(path),parent:chain.slice(1),textures:texs};miCache.set(path,r);return r}
async function ps(p){await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:p}});const s=await get(obj(p),['Emitters','LODDistances']);if(s.__err||!s.Emitters)return {ps:p,missing:true};
 const ems=[];for(const e of s.Emitters){const b=await get(e.path,['EmitterName','LODLevels']);const l=await get(b.LODLevels[0].path,['RequiredModule','bEnabled','TypeDataModule']);const r=await get(l.RequiredModule.path,['Material','SubImages_Horizontal','SubImages_Vertical']);
  ems.push({name:b.EmitterName,lods:b.LODLevels.length,enabled:l.bEnabled,type:(l.TypeDataModule?.class||'CPU').replace('ParticleModuleTypeData',''),grid:r.SubImages_Horizontal+'x'+r.SubImages_Vertical,mat:r.Material?.path?await mi(r.Material.path):null})}
 return {ps:p,lodDistances:s.LODDistances?.length,emitters:ems}}
const list=fs.readFileSync(process.argv[2],"utf8").split(/\r?\n/).map(s=>s.trim()).filter(Boolean);const out=[];
for(const p of list){const r=await ps(p);out.push(r);if(r.missing){console.log('\n✗',p,'不存在');continue}
 console.log('\n■',p.split('/').pop(),'| LODDistances',r.lodDistances,'| 发射器',r.emitters.length,'启用',r.emitters.filter(e=>e.enabled).length,'| 每发射器LOD',[...new Set(r.emitters.map(e=>e.lods))].join('/'));
 for(const e of r.emitters)console.log('   ',e.name,e.enabled?'':'(关)',e.type,e.grid,'→',e.mat?.mi.replace('/Game/',''),'母',(e.mat?.parent||[]).map(x=>x.replace('/Game/','')).join(' ← '),'| 贴图',(e.mat?.textures||[]).map(t=>`${t.param}=${t.path.replace('/Game/','')}[${t.size} max${t.max} ${String(t.comp).replace('TC_','')}]`).join(' ; '))}
fs.writeFileSync(process.argv[2].replace('.txt','.json'),JSON.stringify(out,null,1));
