import {qualityPoints} from './editing-model.mjs';
const round=x=>Math.round(x*1e6)/1e6;
export function captureChoreography(state,cueIds,{id='CH_USER_'+Date.now(),name}={}){
 if(!name?.trim()||!cueIds?.length)throw Error('请选择片段并填写编排模板名称');
 const events=state.doc.events.filter(e=>cueIds.includes(e.cueId));if(!events.length)throw Error('所选片段没有调用');if(events.length>512)throw Error('每次最多保存512次调用，请分组合存');
 const zero=Math.min(...events.map(e=>e.effectiveLaunch));
 return {id,name:name.trim(),origin:'captured-cues',calls:events.map((e,i)=>{const cue=state.doc.cues.find(c=>c.id===e.cueId),t=state.doc.templateLibrary.find(t=>t.id===e.templateId);return {id:'capture-'+i,label:cue.name+' · '+e.pointId,templateId:e.templateId,recipeRef:e.recipeRef||t.subTemplateRef,pointIds:[e.pointId],offsetS:round(e.effectiveLaunch-zero),order:'source',gap:0,preserveSourceTiming:true,eventAdjustments:{scale:e.scale??1,dz:e.dz||0,...(Number.isFinite(e.tilt)?{tilt:e.tilt}:{})},profiles:Object.fromEntries(['medium','low'].map(q=>[q,qualityPoints(state.doc,state.profiles,q,cue.id).includes(e.pointId)?[e.pointId]:[]]))}})};
}
