import {compileSubTemplate,validateSubTemplates} from './subtemplate-model.mjs';
import {compactDirectorArrays} from './director-compact.mjs';
import {nameDirectorArrays} from './director-naming.mjs';
const clone=v=>structuredClone(v),round=v=>{if(!Number.isFinite(v))throw Error('时序包含无效数值');return Math.round(v*1e6)/1e6};
const vec=(x=0,y=x,z=x)=>({X:x,Y:y,Z:z}),rot=()=>({Pitch:0,Yaw:0,Roll:0});
const filter=()=>({PlatformFlags:14,MinQualityLevel:'EQuality_VeryLow'});
const clean=v=>Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='_struct').map(([k,x])=>[k,clean(x)])):v;
function compileLegacy(doc,events,target,mapping={}){
 const issues=[],arrays={EffectSubTemplates:[],EffectTemplates:[],EffectScheduleGroups:[]},groups={P:9,B:8,F:7};
 if(doc.meta?.pointNumbering!==0)issues.push('请先迁移到从0开始的点位编号');
 const used=[...new Set(events.map(e=>e.templateId))],catalog=new Map((target?.catalog||[]).map(s=>[s.key,s]));
 for(const id of used){const m=mapping[id],source=catalog.get(m?.source),t=doc.templateLibrary.find(t=>t.id===id);
  if(!source?.sub?.Entries?.length||source.sub.Entries.some(e=>!e.FXResourceId||e.FXResourceId==='None'))issues.push(`${t?.name||id}：需要真实子模板`);
  if(target?.sourceLibrary?.mode!=='document_fixed_versions'&&t?.kind!=='fan'&&source?.sub?.Entries?.some(e=>/Fan/i.test(e.FXResourceId)))issues.push(`${t?.name||id}：非扇形花型不能映射扇形素材`);
  if(m?.mode==='beams'&&source?.sub?.Entries?.length!==1)issues.push(`${t?.name||id}：多条素材不能按单束重复展开`);
  if(t?.kind==='fan'&&!['whole','beams'].includes(m?.mode))issues.push(`${t.name}：确认整排素材或单束组合`);
 }
 const bindings=new Map();for(const p of target?.points||[])for(const b of p.bindings||[]){const k=b.GroupName+':'+b.SlotIndex;bindings.set(k,[...(bindings.get(k)||[]),p.pointId]);}
 for(const group of new Set(events.map(e=>e.pointId[0])))for(let i=0;i<groups[group];i++){const hits=bindings.get(group+':'+i)||[];if(hits.length!==1)issues.push(`${group}${i}：现场绑定${hits.length?'重复':'缺失'}`);}
 const byGroup={P:[],B:[],F:[]},subCache=new Map();
 if(target?.sourceLibrary)for(const source of catalog.values()){arrays.EffectSubTemplates.push({TemplateName:source.exportName,Entries:clean(clone(source.sub.Entries))});}
 for(const cue of doc.cues)for(const [group,count] of Object.entries(groups)){
  const rows=events.filter(e=>e.cueId===cue.id&&e.pointId[0]===group).sort((a,b)=>a.effectiveLaunch-b.effectiveLaunch||a.id.localeCompare(b.id));if(!rows.length)continue;
  const start=round(Math.min(...rows.map(e=>e.effectiveLaunch))),parent={TemplateName:`WB_${cue.id}_${group}`,RequiredPointCount:count,Entries:[],Filter:filter()};
  for(const e of rows){const m=mapping[e.templateId],source=catalog.get(m?.source),t=doc.templateLibrary.find(t=>t.id===e.templateId);
   let entries=source?clean(clone(source.sub.Entries)):null,subName=`UNMAPPED_${e.templateId}`;
   if(entries){
    if(t.kind==='fan'&&m.mode==='beams'){
     const n=Math.round(e.beams||1),angle=e.fanAngle??t.fanAngle??90,gap=e.beamGap??t.beamGap??0,tilt=e.tilt||0;
     if(n<1||n>21||gap<0||gap>1)issues.push(`${cue.id}：扇形参数超出有效范围`);
     else entries=Array.from({length:n},(_,i)=>entries.map(s=>({...clone(s),LocalTimeOffset:round((s.LocalTimeOffset||0)+(e.dir==='R'?n-1-i:i)*gap),RotationOffset:{...s.RotationOffset,Roll:round((s.RotationOffset?.Roll||0)+(n===1?0:(i/(n-1)-.5)*angle)+tilt)}}))).flat();
    }
    const signature=JSON.stringify(entries);subName=target?.sourceLibrary&&m.mode==='whole'?source.exportName:subCache.get(signature);if(!subName){subName=`WB_SUB_${String(subCache.size).padStart(3,'0')}`;subCache.set(signature,subName);arrays.EffectSubTemplates.push({TemplateName:subName,Entries:entries});}
   }
   parent.Entries.push({EntryType:'SubTemplate',FXResourceId:'None',SubTemplateName:subName,LocalTimeOffset:round(e.effectiveLaunch-start),SlotIndex:Number(e.pointId.slice(1)),PositionOffset:vec(0,0,round((e.dz||0)*100)),RotationOffset:rot(),RandomPositionRange:vec(),RandomRotationRange:rot(),EffectScale:vec(round(e.scale??1)),RandomScaleRatio:0,Filter:filter()});
  }
  arrays.EffectTemplates.push(parent);byGroup[group].push({StartTime:start,TemplateName:parent.TemplateName,Filter:filter()});
 }
 for(const group of Object.keys(groups))if(byGroup[group].length)arrays.EffectScheduleGroups.push({GroupName:group,Slots:byGroup[group].sort((a,b)=>a.StartTime-b.StartTime)});
 const compact=compactDirectorArrays(arrays);Object.assign(arrays,compact.arrays);
 const named=issues.length?null:nameDirectorArrays(arrays);if(named)Object.assign(arrays,named.arrays);
 const exportNames=new Map(named?.audit.subTemplates.map(x=>[x.from,x.to])||[]);
 const summary={...compact.stats,eventCount:events.length,subTemplates:arrays.EffectSubTemplates.length,templates:arrays.EffectTemplates.length,groups:arrays.EffectScheduleGroups.length,scheduleSlots:arrays.EffectScheduleGroups.reduce((n,g)=>n+g.Slots.length,0)};
 return {arrays,issues:[...new Set(issues)],summary,manifest:{format:'df.director-delivery/1',status:issues.length?'blocked_missing_mapping':'property_text_ready_UE_unverified',replaceEffectArrays:true,target:target?.target?.path,sourceLibrary:target?.sourceLibrary,templateNaming:named?.audit,mappingAudit:used.map(id=>({templateId:id,sourceIndex:mapping[id]?.sourceIndex,sourceName:catalog.get(mapping[id]?.source)?.sub.TemplateName,exportName:exportNames.get(catalog.get(mapping[id]?.source)?.exportName)||catalog.get(mapping[id]?.source)?.exportName,note:mapping[id]?.note})),pointNumbering:0,duration:doc.meta.duration,musicOffset:doc.meta.musicOffset||0,summary,issues:[...new Set(issues)],...arrays}};
}

export function compileDirector(doc,events,target,mapping={}){
 if(!doc.subTemplateLibrary)return compileLegacy(doc,events,target,mapping);
 if(events.some(e=>e.recipeRef)){
  const d=clone(doc),byRef=new Map(),original=new Map(),aliases=new Map();
  const fixedEvents=events.map(e=>{const t=doc.templateLibrary.find(t=>t.id===e.templateId),ref=e.recipeRef||t?.subTemplateRef;original.set(e.templateId+'__'+ref,{templateId:e.templateId,key:ref});if(!e.recipeRef)return e;const s=doc.subTemplateLibrary.find(s=>s.key===e.recipeRef);if(!t||!s)throw Error('场内片段固定版本缺失');const key=e.templateId+'__'+e.recipeRef; if(!byRef.has(key)){let i=byRef.size,id='PINNED_'+i;while(d.templateLibrary.some(t=>t.id===id))id='PINNED_'+(++i);byRef.set(key,id);aliases.set(id,e.templateId);d.templateLibrary.push({...t,id,subTemplateRef:e.recipeRef,kind:s.category==='fan'?'fan':s.category==='trail'?'comet':'small'})}const next={...e,templateId:byRef.get(key)};delete next.recipeRef;return next});
  const result=compileDirector(d,fixedEvents,target,mapping);result.manifest.fixedVersions=[...original.values()];result.manifest.mappingAudit=result.manifest.mappingAudit.map(m=>({...m,templateId:aliases.get(m.templateId)||m.templateId}));return result;
 }
 const issues=validateSubTemplates(doc),used=[...new Set(events.map(e=>e.templateId))],catalog=[],fixedMapping={};
 for(const id of used){const t=doc.templateLibrary.find(t=>t.id===id),s=doc.subTemplateLibrary.find(s=>s.key===t?.subTemplateRef);if(!s)continue;
 try{const exportName=s.engineId?s.engineId+'_v'+s.version:s.key.replace(/[^A-Za-z0-9_]/g,'_');if(!catalog.some(c=>c.key===s.key))catalog.push({key:s.key,exportName,sub:{TemplateName:s.name,Entries:compileSubTemplate(s)}});fixedMapping[id]={source:s.key,mode:'whole',note:'固定子模板 '+s.key}}catch(e){issues.push(e.message)}}
 const localPoints=doc.points.map(p=>({pointId:p.id,bindings:[{GroupName:p.id[0],SlotIndex:Number(p.id.slice(1))}]}));
 const result=compileLegacy(doc,events,{...target,catalog,sourceLibrary:{mode:'document_fixed_versions'},points:target?.points||localPoints},fixedMapping);
 result.issues=[...new Set([...issues,...result.issues])];result.manifest={...result.manifest,format:'df.director-delivery/2',source:'doc.subTemplateLibrary',bindingCheck:target?'engine_readback':'not_checked',issues:result.issues,status:result.issues.length?'blocked':'property_text_ready_UE_unverified',fixedVersions:used.map(id=>({templateId:id,key:doc.templateLibrary.find(t=>t.id===id)?.subTemplateRef}))};return result;
}
