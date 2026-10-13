// Read-only T04 gate. Only these five checks; never saves or modifies UE.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {request as engineRead} from './workbench_engine_acceptance.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const assetName=p=>p.split(':')[0].split('.').at(-1);
const isHD=p=>/_HD/i.test(assetName(p))||p.startsWith('/Game/Effects_HD/');
function objectRefs(v,out=[]){
 if(!v||typeof v!=='object')return out;
 if(v._type==='object_ref'&&v.path){out.push(v);return out;}
 for(const x of Array.isArray(v)?v:Object.values(v))objectRefs(x,out);
 return out;
}
function dimensions(p){
 const source=p.Source;
 const x=source?.SizeX??p.ImportedSize?.X??p.SizeX;
 const y=source?.SizeY??p.ImportedSize?.Y??p.SizeY;
 return [x,y].every(v=>Number.isFinite(v)&&v>0)?[x,y]:null;
}
export function textureCheck(properties){
 const size=dimensions(properties),cap=properties.MaxTextureSize;
 const knownCap=Number.isFinite(cap)&&cap>=0;
 const sourceLongEdge=size?Math.max(...size):null;
 const effectiveLongEdge=sourceLongEdge===null?null:knownCap&&cap>0?Math.min(sourceLongEdge,cap):sourceLongEdge;
 return {sourceSize:size,maxTextureSize:knownCap?cap:null,effectiveLongEdge,pass:size!==null&&effectiveLongEdge<=1024&&(sourceLongEdge<=1024||knownCap&&cap>0&&cap<=1024),reason:!size?'未读到有效源尺寸':sourceLongEdge>1024&&!knownCap?'源图超过1024且未读到MaxTextureSize':effectiveLongEdge>1024?'源图超过1024且没有≤1024的尺寸上限':null};
}
export async function checkAssets(inputs,{request=engineRead,census}={}){
 census??=JSON.parse(fs.readFileSync(path.join(repo,'FXtools/节目/NewYearFireWorks_v01/资源发射器数.json'),'utf8'));
 const cache=new Map(),report={format:'df.mobile-placeholder-check/1',readAt:new Date().toLocaleString('sv-SE',{timeZone:'Asia/Hong_Kong'}).replace(' ','T')+'+08:00',source:'GPUECli 只读',scope:'T04五项；全部LOD0发射器（包括禁用项）的材质链；预算只数启用项，GPU查全部项。',referencePolicy:'保守查完整引用：包括父材质默认图、未启用静态分支和材质函数；不是编译后活跃采样器统计。源图>1024时允许MaxTextureSize≤1024（规范§3.6）。',idResolution:'ResourceId 从仓库资源发射器数.json 的mobile.FxSP解析；实时验证精确粒子路径，不代表已实时核对表行。新资产未入该文件时传完整路径。',requests:[],rows:[]};
 async function read(route,payload){
  if(!['/object/get','/object/search'].includes(route))throw Error('只允许读取接口');
  report.requests.push({route,...payload});return request(route,payload);
 }
 async function get(ref){
  const p=typeof ref==='string'?ref:ref?.path;if(!p)throw Error('对象引用为空');
  if(!cache.has(p))cache.set(p,(async()=>{
   const r=await read('/object/get',{path:p});
   if(r.path!==p)throw Error('服务返回了其它对象：请求 '+p+'，实际 '+r.path);
   if(!r.properties||r.__error)throw Error(r.__error||'未返回properties');
   if(typeof r.class!=='string')throw Error('未返回对象类名，不能确认引用类型');
   return r;
  })());
  return cache.get(p);
 }
 let searchIndex;
 async function resolve(input){
  if(input.startsWith('/')){
   if(!/^\/Game\/[A-Za-z0-9_/.]+$/.test(input))throw Error('需要完整/Game粒子资产路径');
   return input.includes('.')?input:input+'.'+input.split('/').at(-1);
  }
  const row=census.mobile?.find(r=>r.id===input);
  if(row){if(!row.FxSP?.path)throw Error('手游快照该行没有FxSP路径');return row.FxSP.path;}
  if(!searchIndex){searchIndex=[];for(let offset=0;;offset+=1000){const r=await read('/object/search',{class:'ParticleSystem',offset,limit:1000});searchIndex.push(...r.objects||[]);if(offset+1000>=r.total||!r.objects?.length)break;}}
  const matches=searchIndex.filter(r=>r.name===input&&r.path.startsWith('/Game/'));
  if(matches.length!==1)throw Error('未找到唯一的手游ResourceId或精确粒子名；请传完整路径（匹配'+matches.length+'个）');
  return matches[0].path;
 }
 for(const input of inputs){
  const row={input,path:null,assetName:null,enabledLOD0:null,gpuCount:null,emitters:[],materials:[],textures:[],hdAssets:[],chainAssets:[],missing:[],checks:[],pass:false};report.rows.push(row);
  let emitterComplete=true,chainComplete=true;
  const visited=new Set(),textures=new Map(),materials=new Map();
  async function chain(ref,from){
   if(!ref?.path)return;
   const p=ref.path;if(visited.has(p))return;visited.add(p);
   const kind=(ref.class||'').split('.').at(-1);
   const expression=/^MaterialExpression/.test(kind);
   if(!expression){row.chainAssets.push({path:p,class:kind,from});if(isHD(p))row.hdAssets.push(p);}
   let o;try{o=await get(ref);}catch(e){chainComplete=false;row.missing.push({path:p,reason:e.message});return;}
   const cls=o.class.split('.').at(-1),props=o.properties;
   if(/^Texture/.test(cls)||cls==='CurveLinearColorAtlas'){
    textures.set(p,{path:p,class:cls,...textureCheck(props),via:from});
    for(const child of objectRefs(props).filter(r=>/^Texture/.test(r.class||'')||r.class==='CurveLinearColorAtlas'))await chain(child,p);
    return;
   }
   if(/^MaterialInstance/.test(cls)&&!props.Parent){chainComplete=false;row.missing.push({path:p,reason:'材质实例Parent为空或字段缺失'});}
   if(cls==='Material'&&!Array.isArray(props.Expressions)){chainComplete=false;row.missing.push({path:p,reason:'母材质未返回Expressions，不能证明引用链完整'});}
   if(/^MaterialFunction/.test(cls)&&!Array.isArray(props.FunctionExpressions)&&!props.Parent){chainComplete=false;row.missing.push({path:p,reason:'材质函数未返回FunctionExpressions或Parent'});}
   if(!expression)materials.set(p,{path:p,class:cls,parent:props.Parent?.path??null});
   for(const child of objectRefs(props))if(/^(Material|Texture)/.test(child.class||'')||child.class==='CurveLinearColorAtlas')await chain(child,p);
  }
  try{
   row.path=await resolve(input);row.assetName=assetName(row.path);
   if(isHD(row.path))row.hdAssets.push(row.path);
   const system=await get(row.path);if(!/\.ParticleSystem$/.test(system.class))throw Error('目标不是ParticleSystem');
   if(!Array.isArray(system.properties.Emitters))throw Error('未读到Emitters');
   for(const ref of system.properties.Emitters){
    const em={path:ref.path,name:null,enabledLOD0:null,typeData:null,material:null,gpu:null};row.emitters.push(em);
    try{
     const emitter=(await get(ref)).properties;em.name=emitter.EmitterName??null;
     const lod=(await get(emitter.LODLevels?.[0])).properties;
     if(typeof lod.bEnabled!=='boolean'||!Object.hasOwn(lod,'TypeDataModule'))throw Error('LOD0启用或TypeData字段读不到');
     em.enabledLOD0=lod.bEnabled;em.typeData=lod.TypeDataModule?.class??'CPU';
     if(lod.TypeDataModule&&!lod.TypeDataModule.class)throw Error('TypeData类名缺失');
     em.gpu=/gpu/i.test(em.typeData);
     const req=(await get(lod.RequiredModule)).properties;em.material=req.Material?.path??null;
     if(!req.Material)throw Error('Required材质引用为空或读不到');
     await chain(req.Material,ref.path);
     if(req.CutoutTexture)await chain(req.CutoutTexture,ref.path);
     // Mesh TypeData may override the Required material.
     if(/Mesh/i.test(em.typeData)){
      const type=(await get(lod.TypeDataModule)).properties;
      for(const material of objectRefs(type).filter(r=>/^Material/.test(r.class||'')))await chain(material,ref.path);
      if(type.Mesh){const mesh=(await get(type.Mesh)).properties;for(const material of objectRefs(mesh).filter(r=>/^Material/.test(r.class||'')))await chain(material,type.Mesh.path);}
     }
    }catch(e){emitterComplete=false;chainComplete=false;row.missing.push({path:ref.path,reason:e.message});}
   }
   if(emitterComplete){row.enabledLOD0=row.emitters.filter(e=>e.enabledLOD0).length;row.gpuCount=row.emitters.filter(e=>e.gpu).length;}
  }catch(e){emitterComplete=false;chainComplete=false;row.missing.push({path:row.path,input,reason:e.message});}
  row.materials=[...materials.values()];row.textures=[...textures.values()];
  const check=(id,label,actual,pass,reason)=>({id,label,actual,pass:!!pass,status:pass?'✅':'❌',reason:pass?null:reason});
  row.checks=[
   check('emitters','LOD0启用发射器≤3',row.enabledLOD0,emitterComplete&&row.enabledLOD0<=3,emitterComplete?'启用数超过3':'发射器读取不完整，见missing'),
   check('gpu','GPU发射器=0',row.gpuCount,emitterComplete&&row.gpuCount===0,emitterComplete?'包含GPU发射器':'发射器类型读取不完整，见missing'),
   check('textures','贴图长边≤1024',row.textures,chainComplete&&row.textures.every(t=>t.pass),chainComplete?'存在过大或尺寸读不到的贴图':'引用链读取不完整，见missing'),
   check('references','整条引用链无_HD',row.hdAssets,chainComplete&&row.hdAssets.length===0,chainComplete?'存在_HD资产/目录引用':'引用链读取不完整，见missing'),
   check('name','粒子资产名以_M结尾',row.assetName,!!row.assetName&&row.assetName.endsWith('_M'),row.assetName?'资产名不是_M结尾':'未能解析资产名')
  ];
  row.pass=row.checks.every(c=>c.pass);
 }
 report.pass=report.rows.length>0&&report.rows.every(r=>r.pass);return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const inputs=[];let output;
 for(let i=2;i<process.argv.length;i++){
  const a=process.argv[i];if(a==='--out'){if(output||!process.argv[i+1]||process.argv[i+1].startsWith('--'))throw Error('--out需要一个JSON文件路径');output=process.argv[++i];}
  else if(a.startsWith('--'))throw Error('未知参数：'+a);else inputs.push(a);
 }
 if(!inputs.length)throw Error('用法：node analysis/scripts/手游占位检查.mjs <粒子系统路径或资源表ID>... [--out <json>]');
 const report=await checkAssets(inputs);
 if(output){fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
 for(const r of report.rows){console.log(r.input+' → '+(r.path??'null'));for(const c of r.checks)console.log(c.status+' '+c.label+': '+(['textures','references'].includes(c.id)?JSON.stringify(c.id==='textures'?r.textures.map(t=>({path:t.path,size:t.sourceSize,max:t.maxTextureSize,effective:t.effectiveLongEdge,pass:t.pass})):c.actual):JSON.stringify(c.actual))+(c.reason?'；'+c.reason:''));}
 if(output)console.log('结果：'+output);process.exitCode=report.pass?0:1;
}
