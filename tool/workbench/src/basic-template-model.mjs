import {nativeEntry} from './subtemplate-model.mjs';
export function baseCatalogue(doc,catalogue){
 const knownRoles=new Map();for(const s of doc.subTemplateLibrary||[])for(const e of s.entries){const roles=knownRoles.get(e.native.FXResourceId)||new Set();roles.add(e.role);knownRoles.set(e.native.FXResourceId,roles)}
 const map=new Map();for(const row of catalogue?.rows||[]){const roles=knownRoles.get(row.id),role=roles?.size===1?[...roles][0]:row.role||'unknown',key=row.id+'|'+role;map.set(key,{...row,key,name:row.id,role,measured:row.measured===true,preview:row.preview||{heightM:role==='burst'?0:75,diameterM:role==='burst'?90:3,durationS:3,color:'#d7e6e2',verified:false}})}
 for(const s of doc.subTemplateLibrary||[])for(const e of s.entries){const id=e.native.FXResourceId,key=id+'|'+e.role,known=map.get(key);if(known){if(!known.preview?.verified){known.preview=structuredClone(e.preview);known.measured=e.preview.verified===true}known.recipeKey??=s.key;}else map.set(key,{key,id,name:id,label:id,role:e.role,preview:structuredClone(e.preview),recipeKey:s.key,platforms:[],sizeClass:'unknown',measured:e.preview.verified===true,source:'programme'})}
 return [...map.values()].map(a=>({...a,entry:{id:'base',role:a.role==='unknown'?'burst':a.role,native:nativeEntry(a.id),preview:structuredClone(a.preview)}}));
}
export function staticBaseRecipe(resource){return {name:resource.label||resource.name,category:resource.role==='fan'?'fan':resource.role==='trail'?'trail':'ball',entries:[{...structuredClone(resource.entry),native:nativeEntry(resource.id||resource.name)}]};}
