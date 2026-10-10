import {retimeSubTemplates,validateSubTemplates} from './subtemplate-model.mjs';
import {validateChoreography} from './choreography-model.mjs';
import {migrateNumbering} from './point-numbering.mjs';
import {clone,normalize,validateDoc,validateProfiles,addCue,duplicateCue,removeCue,setQualityPoints,qualityPoints,cueBounds} from './editing-model.mjs';
import {editCue} from './editor-state.mjs';
import {validateMedia} from './program-project.mjs';
import {validateSections} from './program-sections.mjs';
export const tiers={high:'高配',medium:'中配',low:'低配'};
export function makeBackup(state,seed){return {version:6,programVersion:'10',sourceSha:seed.sourceSha,doc:state.doc,profiles:state.profiles,tier:state.tier||'high',musicMarkers:state.musicMarkers??(state.doc.meta.musicStatus==='none'?[]:seed.musicMarkers),time:state.time||0,selectedCue:state.selectedCue||null,...Object.fromEntries(['audioRef','musicData','structureData'].filter(k=>state[k]!==undefined).map(k=>[k,state[k]]))};}
export function parseBackup(raw,seed){
 let s;try{s=JSON.parse(raw)}catch{throw Error('文件不是有效 JSON，当前草稿未改变');}
 if(s.sourceSha!==seed.sourceSha||!s.doc||s.doc.points?.length!==24)throw Error('请选择本工作台的完整 24 点草稿备份');
 if(s.version!==undefined&&![1,2,3,4,5,6].includes(s.version))throw Error('不支持此草稿版本');
 const errors=[...validateDoc(s.doc),...(s.doc.subTemplateLibrary?validateSubTemplates(s.doc):[]),...validateChoreography(s.doc),...validateSections(s.doc)];if(errors.length)throw Error(errors[0]);validateMedia(s);
 const profiles=s.profiles||{medium:{},low:{}};if(validateProfiles(s.doc,profiles).length)throw Error('档位数据不合法');
 const markers=s.musicMarkers??seed.musicMarkers;
 if(!Array.isArray(markers)||markers.some(m=>!m||!Number.isFinite(m.time)||typeof m.id!=='string'))throw Error('音乐标记数据不合法');
 if(!Number.isFinite(s.doc.meta?.duration)||s.doc.meta.duration<=0)throw Error('节目时长不合法');
 return migrateNumbering({...makeBackup({...s,profiles,musicMarkers:markers},seed),tier:tiers[s.tier]?s.tier:'high'});
}
export function editProgram(state,action,{id,patch,templateId,start,pointId}={}){
 let {doc,profiles,tier='high'}=state;let selectedCue=id;
 if(tier!=='high'){
  if(action==='delete')profiles=setQualityPoints(doc,profiles,tier,id,[]);
  else if(action==='edit'&&Object.keys(patch).length===1&&patch.pointIds)profiles=setQualityPoints(doc,profiles,tier,id,patch.pointIds);
  else throw Error('请切到高配修改共用编排；中低配只调整参演点');
 }else if(action==='edit'){
  const effectiveBounds=cueBounds(doc,id),cue=doc.cues.find(c=>c.id===id);let delta=0;
  if('start' in patch){delta=Number(patch.start)-effectiveBounds.start;patch={...patch,start:cue.start+delta};}
  if('burstStart' in patch){delta=Number(patch.burstStart)-effectiveBounds.burst;patch={...patch,burstStart:cue.burstStart+delta};}
  doc=editCue(doc,id,patch);if(delta&&doc.cues.find(c=>c.id===id).musicBinding)doc.cues.find(c=>c.id===id).musicBinding.offset+=delta;
 }else if(action==='delete'){doc=removeCue(doc,id);selectedCue=doc.cues[0]?.id||null;}
 else if(action==='copy'||action==='add'){
  const ids=new Set(doc.cues.map(c=>c.id));
  if(action==='copy'){doc=duplicateCue(doc,id,4);const original=state.doc.cues.find(c=>c.id===id);const made=doc.cues.find(c=>!ids.has(c.id));if(original.musicBinding)made.musicBinding={...clone(original.musicBinding),offset:original.musicBinding.offset+4};profiles=clone(profiles);for(const q of ['medium','low']){profiles[q]??={};profiles[q][made.id]=qualityPoints(state.doc,state.profiles,q,id)}}
  else{const t=doc.templateLibrary.find(t=>t.id===templateId);if(!t)throw Error('请选择花型');const compatible=doc.points.filter(p=>p.zone===t.zone&&(!p.allowedKinds||p.allowedKinds.includes(t.kind))&&(t.zone==='front'||p.id.startsWith(t.kind==='fan'?'B':'P')));if(pointId&&!compatible.some(p=>p.id===pointId))throw Error('此点位与花型不兼容，请选择对应区域与类型的点位');const points=pointId?[pointId]:compatible.map(p=>p.id);doc=addCue(doc,{templateId,pointIds:points,start,order:'together',gap:0});const made=doc.cues.find(c=>!ids.has(c.id));if(t.subTemplateRef)for(const e of doc.events.filter(e=>e.cueId===made.id))e.recipeRef=t.subTemplateRef;}
  selectedCue=doc.cues.find(c=>!ids.has(c.id)).id;
 }else throw Error('未知编辑操作');
 if(doc.subTemplateLibrary)doc=retimeSubTemplates(doc);
 const errors=validateDoc(doc);if(errors.length)throw Error(errors[0]);
 return {...state,doc,profiles,selectedCue};
}
export function pointPackage(doc,events,id,tier){const p=doc.points.find(p=>p.id===id);return {format:'df.point-program.preview/1',status:'virtual_draft_not_UE_nodes',pointId:id,sharedStart:0,duration:doc.meta.duration,musicOffset:doc.meta.musicOffset||0,designTransformMetres:{x:p.x,y:p.y,z:p.z,yaw:p.yaw},actorBinding:p.actorBinding||'待实测绑定',quality:tier,events:events.filter(e=>e.pointId===id).sort((a,b)=>a.effectiveLaunch-b.effectiveLaunch).map(e=>({id:e.id,cueId:e.cueId,template:e.templateId,launchS:e.effectiveLaunch,burstS:e.effectiveBurst,endS:e.effectiveEnd,scale:e.scale,offsetZM:e.dz||0,beams:e.beams,fanAngle:e.fanAngle,beamGap:e.beamGap,tilt:e.tilt,direction:e.dir,musicBinding:doc.cues.find(c=>c.id===e.cueId)?.musicBinding||null})),notes:['虚拟编排数据，非蓝图节点文本','正式资源映射与引擎粘贴需单独验证']};}
export function downloadText(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
