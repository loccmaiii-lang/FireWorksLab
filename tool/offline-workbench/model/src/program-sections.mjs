import {normalize,validateDoc} from './editing-model.mjs';
const clone=x=>structuredClone(x),round=x=>Math.round(x*1e6)/1e6;
export function validateSections(doc){
 const errors=[],ids=new Set();for(const s of doc.sections||[]){if(!s.id||ids.has(s.id)||!s.name?.trim()||!Number.isFinite(s.start)||!Number.isFinite(s.end)||s.start<0||s.end<=s.start||s.end>doc.meta.duration)errors.push('段落名称、范围或编号无效');ids.add(s.id)}
 if(doc.meta.sectionsMode==='user'){const sorted=[...(doc.sections||[])].sort((a,b)=>a.start-b.start);if(sorted.some((s,i)=>i&&s.start<sorted[i-1].end))errors.push('编排段落时间范围不能重叠');for(const c of doc.cues)if(c.programSectionId&&!ids.has(c.programSectionId))errors.push('片段段落归属无效')}
 return errors;
}
export function editSection(state,action,args={}){
 const s=clone(state),d=s.doc;d.sections??=[];
 const section=d.sections.find(v=>v.id===args.id);
 if(action==='create'){const id='SECTION_'+Date.now()+'_'+d.sections.length;d.sections.push({id,name:args.name,start:Number(args.start),end:Number(args.end),color:'#34574f',source:'user-authored',detail:''})}
 else if(action==='assign'){if(args.sectionId&&!d.sections.some(v=>v.id===args.sectionId))throw Error('请选择已创建段落');for(const c of d.cues.filter(c=>args.cueIds.includes(c.id)))c.programSectionId=args.sectionId||null}
 else{if(!section)throw Error('请选择编排段落');if(action==='update')Object.assign(section,{name:args.name,start:Number(args.start),end:Number(args.end)});
  else if(action==='move'){const delta=round(Number(args.start)-section.start);section.start=round(section.start+delta);section.end=round(section.end+delta);const members=d.cues.filter(c=>c.programSectionId===section.id);for(const c of members){for(const e of d.events.filter(e=>e.cueId===c.id))for(const k of ['launch','burst','end'])e[k]=round(e[k]+delta);if(c.musicBinding)c.musicBinding.offset=round(c.musicBinding.offset+delta)}}
  else if(action==='delete'){d.sections=d.sections.filter(v=>v.id!==section.id);for(const c of d.cues)if(c.programSectionId===section.id)c.programSectionId=null}
  else throw Error('段落操作无效');
 }
 const errors=validateSections(d);if(errors.length)throw Error(errors[0]);
 s.doc=normalize(d);const docErrors=validateDoc(s.doc);if(docErrors.length)throw Error(docErrors[0]);return s;
}
