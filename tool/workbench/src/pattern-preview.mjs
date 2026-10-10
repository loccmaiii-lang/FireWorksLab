import {compatiblePoints,validatePattern,placeChoreography} from './choreography-model.mjs';
import {qualityEvents} from './editing-model.mjs';
import {previewSubTemplates} from './subtemplate-model.mjs';

// Changing the bound flower is different from copying a call unchanged.
// A captured event's scale/height/tilt belongs to its previous flower.
export function replaceCallTemplate(doc,call,templateId){
 const chosen=doc.templateLibrary.find(t=>t.id===templateId);
 if(!chosen)throw Error('花型模板不存在');
 const next=structuredClone(call);
 if(next.templateId===chosen.id)return next;
 const allowed=compatiblePoints(doc,chosen);
 Object.assign(next,{templateId:chosen.id,recipeRef:chosen.subTemplateRef,pointIds:next.pointIds.filter(id=>allowed.includes(id))});
 next.profiles=Object.fromEntries(['medium','low'].map(q=>[q,(next.profiles?.[q]||[]).filter(id=>next.pointIds.includes(id))]));
 delete next.eventAdjustments;
 return next;
}

// Whole-pattern application changes bindings, rather than filtering observation.
// Preflight every point before changing any call so mixed-zone copies fail atomically.
export function replacePatternTemplate(doc,pattern,{scope='current',callId,templateId,recipeRef}={}){
 if(!['all','current'].includes(scope))throw Error('花型应用范围无效');
 const flower=doc.templateLibrary.find(t=>t.id===templateId);
 if(!flower)throw Error('花型模板不存在');
 const ref=recipeRef||flower.subTemplateRef,recipe=doc.subTemplateLibrary.find(r=>r.key===ref);
 const source=doc.subTemplateLibrary.find(r=>r.key===flower.subTemplateRef);
 if(!recipe||recipe.id!==source?.id)throw Error('固定版本与所选花型不一致');
 const selected=scope==='all'?pattern.calls:pattern.calls.filter(c=>c.id===callId);
 if(!selected.length)throw Error('请选择有效的编辑调用');
 if(scope==='all'){
  const allowed=compatiblePoints(doc,{...flower,kind:recipe.category==='fan'?'fan':recipe.category==='trail'?'comet':'small'});
  for(const c of selected){const incompatible=c.pointIds.filter(id=>!allowed.includes(id));
   if(incompatible.length)throw Error(`第 ${pattern.calls.indexOf(c)+1} 次调用的 ${incompatible.join('、')} 与${flower.name}不兼容。请先调整该调用，或只改当前调用。`);
  }
 }
 const next=structuredClone(pattern),ids=new Set(selected.map(c=>c.id));
 next.calls=next.calls.map(c=>{
  if(!ids.has(c.id))return c;
  const replaced=replaceCallTemplate(doc,c,templateId);
  if(scope==='all'||recipeRef||c.templateId!==templateId)replaced.recipeRef=ref;
  return replaced;
 });
 return next;
}

// A preview never reads programme cues or their quality profile mappings.
// Scope only changes observation; saving/placing always uses the whole pattern.
export function buildPatternPreview(doc,pattern,{scope='all',callId,tier='high'}={}){
 if(!['all','current'].includes(scope)||!['high','medium','low'].includes(tier))throw Error('预览范围或档位无效');
 const calls=scope==='current'?pattern.calls.filter(c=>c.id===callId):pattern.calls;
 if(!calls.length)throw Error('请选择有效的预览调用');
 const current={...structuredClone(pattern),key:'__pattern-preview__',calls:structuredClone(calls)};
 validatePattern(doc,current,true);
 // Shift only the mock placement so a negative relative call remains audible.
 // Preview duration is independent of the programme's delivery time limits.
 const anchorShowS=Math.ceil(Math.max(0,-Math.min(...calls.map(c=>c.offsetS)))*10)/10;
 const mock={...doc,meta:{...doc.meta,duration:Math.max(doc.meta.duration,3600)},cues:[],events:[],choreographyLibrary:[current]};
 const state=placeChoreography({doc:mock,profiles:{medium:{},low:{}},tier:'high'},current,{anchorShowS});
 const all=state.doc.events,events=qualityEvents(state.doc,state.profiles,tier);
 const begin=Math.min(...all.map(e=>e.effectiveLaunch));
 const end=Math.max(.01,Math.max(...all.map(e=>e.effectiveEnd))-begin);
 return {state,events,begin,end,preview:previewSubTemplates(state.doc,events),callCount:calls.length,empty:events.length===0};
}
