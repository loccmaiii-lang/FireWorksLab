/** Immutable choreography sources and their placed programme instances. No storage or UE access. */
import {saveChoreography,placeChoreography,validateChoreography} from './choreography-model.mjs';
import {cueBounds,normalize,validateDoc,validateProfiles} from './editing-model.mjs';
const clone=x=>structuredClone(x);
const content=p=>JSON.stringify({id:p.id,name:p.name,origin:p.origin,calls:p.calls});

export function saveAndPlacePattern(state,draft,options){
 const saved=state.doc.choreographyLibrary?.find(p=>p.key===draft.key);
 const savedTemplate=!saved||content(saved)!==content(draft);
 const doc=savedTemplate?saveChoreography(state.doc,draft):state.doc;
 const pattern=savedTemplate?doc.choreographyLibrary.at(-1):saved;
 const next=placeChoreography({...state,doc},pattern,options);
 return {...next,patternKey:pattern.key,savedTemplate};
}

export function patternInstances(doc,patternId){
 const keys=new Set((doc.choreographyLibrary||[]).filter(p=>p.id===patternId).map(p=>p.key)),groups=new Map();
 for(const cue of doc.cues){
  if(!keys.has(cue.choreographyRef))continue;
  const id=cue.choreographyInstance||cue.id;
  if(!groups.has(id))groups.set(id,{id,key:cue.choreographyRef,cueIds:[],name:cue.name,start:Infinity,end:0});
  const group=groups.get(id),bounds=cueBounds(doc,cue.id);
  group.cueIds.push(cue.id);group.start=Math.min(group.start,bounds.start);group.end=Math.max(group.end,bounds.end);
 }
 return [...groups.values()].sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
}

export function patternLink(doc,cueId){
 const cue=doc.cues.find(c=>c.id===cueId);
 if(!cue?.choreographyRef)return null;
 const pattern=doc.choreographyLibrary?.find(p=>p.key===cue.choreographyRef);
 if(!pattern)return {missing:true,key:cue.choreographyRef,cueIds:[cueId]};
 const latest=doc.choreographyLibrary.filter(p=>p.id===pattern.id).reduce((a,b)=>a.version>b.version?a:b);
 const group=patternInstances(doc,pattern.id).find(g=>g.cueIds.includes(cueId));
 return {pattern,latest,instanceId:group.id,cueIds:group.cueIds};
}

const signature=(doc,cues,profiles)=>JSON.stringify(cues.map(c=>({
 order:c.order,gap:c.gap,launchJitter:c.launchJitter,
 events:doc.events.filter(e=>e.cueId===c.id).map(e=>({pointId:e.pointId,templateId:e.templateId,recipeRef:e.recipeRef,launch:e.launch,dt:e.dt,dz:e.dz,scale:e.scale,tilt:e.tilt,jitterKey:e.jitterKey})).sort((a,b)=>a.pointId.localeCompare(b.pointId)),
 profiles:Object.fromEntries(['medium','low'].map(q=>[q,profiles?.[q]?.[c.id]??c.pointIds]))
})));

function sourceInstance(state,instanceId){
 const cues=state.doc.cues.filter(c=>c.choreographyInstance===instanceId);
 if(!cues.length)throw Error('找不到编排引用组');
 const pattern=state.doc.choreographyLibrary?.find(p=>p.key===cues[0].choreographyRef);
 if(!pattern||cues.some(c=>c.choreographyRef!==pattern.key))throw Error('引用组的模板版本不一致');
 if(cues.length!==pattern.calls.length)throw Error('此组不是完整模板调用，请将现有片段另存为编排模板');
 const ordered=pattern.calls.map((call,i)=>cues.find(c=>c.choreographyCallId===call.id)||(!cues.some(c=>c.choreographyCallId)?cues[i]:null));
 if(ordered.some(c=>!c)||new Set(ordered.map(c=>c.id)).size!==cues.length)throw Error('此组不是完整模板调用');
 const first=ordered[0],options={anchorShowS:first.anchorShowS,alignment:first.alignment||'launch',alignedEntryIndex:first.alignedEntryIndex||0,alignedCallIndex:first.alignedCallIndex||0};
 if(!Number.isFinite(options.anchorShowS))throw Error('旧引用组缺少节目定位信息，请另存为编排模板');
 const expected=placeChoreography({...state,doc:{...state.doc,cues:[],events:[]},profiles:{medium:{},low:{}}},pattern,options);
 const expectedCues=expected.newIds.map(id=>expected.doc.cues.find(c=>c.id===id));
 if(signature(state.doc,ordered,state.profiles)!==signature(expected.doc,expectedCues,expected.profiles))throw Error('此组有独立调整，请先将现有片段存为新模板；不会覆盖你的调整');
 return {pattern,cues:ordered,options};
}

export function patternUpdateReason(state,instanceId,key){
 try{const source=sourceInstance(state,instanceId),target=state.doc.choreographyLibrary.find(p=>p.key===key);if(!target||target.id!==source.pattern.id)throw Error('新版本与源模板不一致');return ''}catch(e){return e.message}
}

export function updatePatternInstance(state,instanceId,key){
 if(state.tier&&state.tier!=='high')throw Error('切到高配后更新共用编排');
 const source=sourceInstance(state,instanceId),target=state.doc.choreographyLibrary.find(p=>p.key===key);
 if(!target||target.id!==source.pattern.id)throw Error('新版本与源模板不一致');
 const doc=clone(state.doc),profiles=clone(state.profiles),removed=new Set(source.cues.map(c=>c.id));
 doc.cues=doc.cues.filter(c=>!removed.has(c.id));doc.events=doc.events.filter(e=>!removed.has(e.cueId));
 for(const q of ['medium','low'])for(const id of removed)delete profiles[q]?.[id];
 const alignedCall=source.pattern.calls[source.options.alignedCallIndex];
 const alignedCallIndex=target.calls.findIndex(c=>c.id===alignedCall?.id);
 if(alignedCallIndex<0&&source.options.alignment!=='launch')throw Error('用于音乐对齐的调用已移除，请重新设置发射');
 const next=placeChoreography({...state,doc,profiles},target,{...source.options,alignedCallIndex:Math.max(0,alignedCallIndex)});
 const remap=new Map(),previousByCall=new Map(source.pattern.calls.map((call,i)=>[call.id,source.cues[i]]));
 // Temporarily allocated cue IDs can equal old IDs. Remap simultaneously, never in-place one by one.
 const used=new Set(doc.cues.map(c=>c.id));
 for(const call of target.calls){const old=previousByCall.get(call.id);if(old)used.add(old.id)}
 const placed=next.newIds.map(id=>next.doc.cues.find(c=>c.id===id));
 for(const cue of placed){
  const id=cue.id,old=previousByCall.get(cue.choreographyCallId);
  let stable=old?.id||id,suffix=2;
  if(!old){while(used.has(stable))stable=id+'_new'+suffix++;used.add(stable)}
  remap.set(id,stable);cue.id=stable;cue.choreographyInstance=instanceId;
  if(old){
   for(const field of ['programSectionId','musicBinding','enabled'])if(old[field]!==undefined)cue[field]=clone(old[field]);
   const oldCall=source.pattern.calls.find(c=>c.id===cue.choreographyCallId);
   if(old.name!==source.pattern.name+' · '+oldCall.label)cue.name=old.name;
  }
 }
 for(const event of next.doc.events){if(!remap.has(event.cueId))continue;const stable=remap.get(event.cueId);event.id=stable+'_'+event.pointId+'_1';event.cueId=stable;event.choreographyInstance=instanceId}
 for(const q of ['medium','low']){const values=clone(next.profiles[q]);for(const id of remap.keys())delete next.profiles[q][id];for(const [id,stable]of remap)next.profiles[q][stable]=values[id]}
 next.doc=normalize(next.doc);next.newIds=next.newIds.map(id=>remap.get(id));next.selectedCue=next.newIds.includes(state.selectedCue)?state.selectedCue:next.newIds[0];next.instanceId=instanceId;
 const errors=[...validateDoc(next.doc),...validateProfiles(next.doc,next.profiles),...validateChoreography(next.doc)];
 if(errors.length)throw Error(errors[0]);
 return next;
}
