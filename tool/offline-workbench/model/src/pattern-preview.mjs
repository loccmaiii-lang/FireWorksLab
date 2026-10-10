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
