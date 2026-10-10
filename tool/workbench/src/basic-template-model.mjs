import {nativeEntry} from './subtemplate-model.mjs';
export function baseCatalogue(doc,catalogue){
 const knownRoles=new Map();for(const s of doc.subTemplateLibrary||[])for(const e of s.entries){const roles=knownRoles.get(e.native.FXResourceId)||new Set();roles.add(e.role);knownRoles.set(e.native.FXResourceId,roles)}
 // 节目显式基础库优先，避免旧全局快照覆盖新资源及未使用条目。
 const programmeBases=Array.isArray(doc.baseResourceLibrary);
 const map=new Map();for(const row of programmeBases?doc.baseResourceLibrary:catalogue?.rows||[]){const roles=knownRoles.get(row.id),role=roles?.size===1?[...roles][0]:row.role||'unknown',key=row.id+'|'+role;map.set(key,{...row,key,name:row.id,role,programmeBase:programmeBases,measured:row.measured===true,preview:row.preview||{heightM:role==='burst'?0:75,diameterM:role==='burst'?90:3,durationS:3,color:'#d7e6e2',verified:false}})}
 for(const s of doc.subTemplateLibrary||[])for(const e of s.entries){const id=e.native.FXResourceId,key=id+'|'+e.role,known=map.get(key);if(known){if(!known.programmeBase&&!known.preview?.verified){known.preview=structuredClone(e.preview);known.measured=e.preview.verified===true}known.recipeKey??=s.key;}else map.set(key,{key,id,name:id,label:id,role:e.role,preview:structuredClone(e.preview),recipeKey:s.key,platforms:[],sizeClass:'unknown',measured:e.preview.verified===true,source:'programme'})}
 return [...map.values()].map(a=>({...a,entry:{id:'base',role:a.role==='unknown'?'burst':a.role,native:nativeEntry(a.id),preview:structuredClone(a.preview)}}));
}
export function staticBaseRecipe(resource){return {name:resource.label||resource.name,category:resource.role==='fan'?'fan':resource.role==='trail'?'trail':'ball',entries:[{...structuredClone(resource.entry),native:nativeEntry(resource.id||resource.name)}]};}

// 用途规格只读当前固定引用；同ID的不同用途不是资源的固有尺寸。
export function baseComparisonSpecs(doc){
 return (doc.templateLibrary||[]).flatMap(t=>{
  const recipe=doc.subTemplateLibrary?.find(r=>r.key===t.subTemplateRef);
  if(!recipe?.entries?.length)return [];
  const e=recipe.entries.find(e=>e.role==='burst')||recipe.entries[0],n=e.native,p=e.preview||{},role=e.role;
  const scale=n.EffectScale||{X:1,Y:1,Z:1},lengthM=role==='burst'?0:Number(p.heightM)*scale.Z,diameterM=role==='burst'?Number(p.diameterM)*Math.max(scale.X,scale.Y,scale.Z):0;
  if(!Number.isFinite(lengthM)||!Number.isFinite(diameterM)||(role==='burst'?diameterM<=0:lengthM<=0))return [];
  const zone=t.zone||'dam',baseZ=doc.points?.find(p=>p.zone===zone)?.z??(zone==='front'?50:150),z=baseZ+(n.PositionOffset?.Z||0)/100+lengthM;
  return [{id:t.id,name:t.name,zone,role,baseZ,z,diameterM,lengthM,resourceIds:[...new Set(recipe.entries.map(e=>e.native.FXResourceId))],verified:recipe.entries.every(e=>e.preview?.verified===true)}];
 });
}
