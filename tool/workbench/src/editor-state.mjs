import {clone,normalize,applyCue,validateDoc,cueBounds} from './editing-model.mjs';
export function pointSelection(state,id,action){
 if(action==='double')return {point:id,solo:!(state.point===id&&state.solo)};
 return {point:state.point===id?'':id,solo:false};
}
const number=value=>{
 if(value===''||!Number.isFinite(Number(value)))throw Error('请输入有效秒数');
 return Number(value);
};
export const fitHeight=(value,viewport)=>Math.round(Math.max(240,Math.min(Number(value)||360,Math.max(240,viewport-419))));
export function editCue(doc,id,patch){
 const cue=doc.cues.find(c=>c.id===id);
 if(!cue)throw Error('请先选择片段');
 let next;
 if('start' in patch||'burstStart' in patch){
  const field='start' in patch?'start':'burstStart',bounds=cueBounds(doc,id),delta=number(patch[field])-(field==='start'?bounds.start:bounds.burst);
  next=clone(doc);
  for(const e of next.events.filter(e=>e.cueId===id))for(const k of ['launch','burst','end'])e[k]=Math.round((e[k]+delta)*1e6)/1e6;
  next=normalize(next);
 }else if('gap' in patch&&(cue.order||'source')==='source'){
  const gap=number(patch.gap);if(gap<0)throw Error('点间间隔不能小于 0 秒');
  next=clone(doc);
  const events=next.events.filter(e=>e.cueId===id);
  const points=cue.pointIds.map(id=>({id,start:Math.min(...events.filter(e=>e.pointId===id).map(e=>e.launch))})).sort((a,b)=>a.start-b.start);
  points.forEach((p,index)=>{const delta=cue.start+index*gap-p.start;for(const e of events.filter(e=>e.pointId===p.id))for(const k of ['launch','burst','end'])e[k]=Math.round((e[k]+delta)*1e6)/1e6;});
  Object.assign(next.cues.find(c=>c.id===id),{gap,spacingEdited:true});
  next=normalize(next);
 }else{
  if('gap' in patch)patch={...patch,gap:number(patch.gap)};
  if(patch.order==='together')patch={...patch,gap:0};
  if('pointIds' in patch){
   const template=doc.templateLibrary.find(t=>t.id===cue.templateId);
   if(patch.pointIds.some(id=>doc.points.find(p=>p.id===id)?.zone!==template.zone))throw Error('请选择同一区域的参演点');
   if(patch.pointIds.some(id=>{const p=doc.points.find(p=>p.id===id);return p.allowedKinds&&!p.allowedKinds.includes(template.kind)}))throw Error('此点位不支持当前花型');
  }
  next=applyCue(doc,id,patch);
 }
 const errors=validateDoc(next);if(errors.length)throw Error(errors[0]);
 return next;
}
