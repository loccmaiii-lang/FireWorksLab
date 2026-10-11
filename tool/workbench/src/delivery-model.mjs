import {clone} from './editing-model.mjs';
const number=v=>{v=Number(v);if(!Number.isFinite(v))throw Error('交付中存在无效数值');return Math.round(v*1e6)/1e6};
export function ueText(v){if(Array.isArray(v))return v.length?'('+v.map(ueText).join(',')+')':'';if(v&&typeof v==='object')return '('+Object.entries(v).filter(([k])=>k!=='_struct').map(([k,x])=>k+'='+ueText(x)).join(',')+')';if(typeof v==='number')return String(number(v));if(typeof v==='boolean')return v?'True':'False';if(v===null)return 'None';return '"'+String(v).replaceAll('\\','\\\\').replaceAll('"','\\"')+'"'}
export function initialMapping(doc,actor){const subs=actor.properties.EffectSubTemplates;return Object.fromEntries(doc.templateLibrary.map(t=>{const ids=subs.flatMap((s,i)=>t.legacyMapping?.candidateNames?.includes(s.TemplateName)?[i]:[]);return [t.id,ids.length===1?ids[0]:-1]}))}
export function buildDelivery(doc,events,pointId,actor,mapping={}){
 const rows=events.filter(e=>e.pointId===pointId).sort((a,b)=>a.effectiveLaunch-b.effectiveLaunch),used=[...new Set(rows.map(e=>e.templateId))];
 const subs=actor.properties.EffectSubTemplates,missing=used.filter(id=>!Number.isInteger(Number(mapping[id]))||Number(mapping[id])<0||!subs[Number(mapping[id])]?.Entries?.length);
 const manifest={format:'df.actor-delivery/1',status:'preview_requires_engine_calibration',targetActor:actor.path,pointId,sharedStart:0,musicOffset:doc.meta.musicOffset||0,duration:doc.meta.duration,actorClass:actor.class,sourceTemplate:actor.properties.EffectTemplate.TemplateName,missingTemplates:missing,events:rows.map(e=>({...clone(e),musicBinding:clone(doc.cues.find(c=>c.id===e.cueId)?.musicBinding||null)})),mapping:Object.fromEntries(used.map(id=>[id,subs[Number(mapping[id])]?.TemplateName||null])),notes:['Actor只读识别；未写入引擎','JSON清单不是蓝图节点','候选资源映射须核对外观与升空时间；网页模拟不是UE实测','Seq与音乐统一起点；音轨从musicOffset秒开始']};
 if(missing.length||!rows.length)return {manifest,missing,properties:null};
 const effect=clone(actor.properties.EffectTemplate),prototype=effect.Entries?.find(e=>e.EntryType==='SubTemplate');
 if(!prototype)return {manifest,missing:used,properties:null};
 const generated=[];effect.TemplateName='Workbench_'+pointId;effect.RequiredPointCount=1;effect.Entries=[];
 for(const e of rows){const t=doc.templateLibrary.find(t=>t.id===e.templateId),s=clone(subs[Number(mapping[e.templateId])]);s.TemplateName='WB_'+pointId+'_'+e.id.replace(/[^A-Za-z0-9_]/g,'_');
  if(t.kind==='fan'){const originals=s.Entries.slice().sort((a,b)=>a.RotationOffset.Roll-b.RotationOffset.Roll),count=Math.round(e.beams||originals.length);s.Entries=Array.from({length:count},(_,i)=>{const src=clone(originals[Math.round(i/Math.max(1,count-1)*(originals.length-1))]);src.RotationOffset.Roll=number((count===1?0:(i/(count-1)-.5)*(e.fanAngle??t.fanAngle))+(e.tilt||0));src.LocalTimeOffset=number((e.dir==='R'?count-1-i:i)*(e.beamGap??t.beamGap));return src});}
  const entry=clone(prototype);entry.SubTemplateName=s.TemplateName;entry.FXResourceId='None';entry.SlotIndex=0;entry.LocalTimeOffset=number(e.effectiveLaunch);entry.PositionOffset={_struct:'Vector',X:0,Y:0,Z:number((e.dz||0)*100)};entry.RotationOffset={_struct:'Rotator',Pitch:0,Yaw:0,Roll:0};entry.EffectScale={_struct:'Vector',X:number(e.scale||1),Y:number(e.scale||1),Z:number(e.scale||1)};entry.RandomPositionRange={_struct:'Vector',X:0,Y:0,Z:0};entry.RandomRotationRange={_struct:'Rotator',Pitch:0,Yaw:0,Roll:0};entry.RandomScaleRatio=0;
  generated.push(s);effect.Entries.push(entry);
 }
 return {manifest,missing:[],properties:{EffectTemplate:effect,EffectSubTemplates:generated}};
}
