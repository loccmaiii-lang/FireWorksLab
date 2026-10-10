import {validateEngineId} from './flower-layer-model.mjs';
import {sourceMapping} from './director-source-map.mjs';
import {normalize} from './editing-model.mjs';
const clean=v=>Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>k!=='_struct').map(([k,x])=>[k,clean(x)])):v;
const clone=v=>structuredClone(v),r=v=>Math.round(v*1e6)/1e6;
const vec=(n=0)=>({X:n,Y:n,Z:n}),rot=()=>({Pitch:0,Yaw:0,Roll:0});
const finite=(v,label,min=-Infinity,max=Infinity)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(`${label}超出范围或不是有限数值`);return v};
const rand=(seed,i)=>{let x=(Number(seed)|0)^Math.imul(i+1,0x45d9f3b);x=Math.imul(x^(x>>>16),0x45d9f3b);return ((x^(x>>>16))>>>0)/4294967296};
export const nativeEntry=(id)=>({FXResourceId:id,LocalTimeOffset:0,PositionOffset:vec(),RotationOffset:rot(),RandomPositionRange:vec(),RandomRotationRange:rot(),EffectScale:vec(1),RandomScaleRatio:0,Filter:{PlatformFlags:14,MinQualityLevel:'EQuality_VeryLow'}});
export function compileSubTemplate(recipe){
 if(recipe?.engineId)validateEngineId(recipe.engineId);
 if(!recipe?.entries?.length)throw Error('子模板至少需要一条资源');
 if(recipe.entries.length>512)throw Error('子模板最多512条资源');
 return recipe.entries.map((e,i)=>{const n=clone(e.native);if(!n?.FXResourceId?.trim()||n.FXResourceId==='None')throw Error(`第${i+1}条资源ID为空`);
 finite(n.LocalTimeOffset,'延迟',0,600);for(const key of ['PositionOffset','RandomPositionRange','EffectScale'])for(const axis of ['X','Y','Z'])finite(n[key]?.[axis],key+(key==='EffectScale'?'缩放':''),key==='EffectScale'?.001:key==='RandomPositionRange'?0:-1e7,1e7);
 for(const key of ['RotationOffset','RandomRotationRange'])for(const axis of ['Pitch','Yaw','Roll'])finite(n[key]?.[axis],'角度',key==='RandomRotationRange'?0:-3600,3600);
 finite(n.RandomScaleRatio,'随机缩放',0,1);if(!['trail','burst','fan'].includes(e.role))throw Error('请选择升空尾缀、球花或扇形角色');
 for(const k of ['heightM','diameterM','durationS'])finite(e.preview?.[k],`预览标定 ${k}`,0,k==='durationS'?600:10000);
 if(!e.preview.durationS)throw Error('可见时长必须大于0');if(!Number.isInteger(n.Filter?.PlatformFlags)||typeof n.Filter?.MinQualityLevel!=='string')throw Error('平台/画质准入字段缺失');return clean(n);});
}
export function makeFan({resourceId='',count=5,spread=80,gap=.1,seed=1,order='lr',roll=0,scale=1,sizeJitter=0,angleJitter=0,heightJitter=0,supportsZScale=false,heightM=75,durationS=3}={}){
 finite(count,'束数',1,256);if(!Number.isInteger(count))throw Error('束数必须是整数');finite(spread,'张角',0,180);finite(gap,'间隔',0,5);
 finite(scale,'缩放',.01,20);finite(sizeJitter,'大小随机',0,90);finite(angleJitter,'角度随机',0,90);finite(heightJitter,'高度随机',0,90);
 if(heightJitter&&!supportsZScale)throw Error('高度随机需要确认素材支持纵向缩放');
 const entries=Array.from({length:count},(_,i)=>{const n=nativeEntry(resourceId),q=count===1?0:i/(count-1)-.5;
 const rank=order==='together'?0:order==='rl'?count-1-i:order==='center'?Math.abs(i-(count-1)/2):order==='outside-in'?(count-1)/2-Math.abs(i-(count-1)/2):i;
 n.LocalTimeOffset=r(rank*gap);n.RotationOffset.Roll=r(roll+q*spread+(rand(seed,i*3)-.5)*2*angleJitter);
 const s=r(scale*(1+(rand(seed,i*3+1)-.5)*2*sizeJitter/100));n.EffectScale=vec(s);n.EffectScale.Z=r(s*(1-rand(seed,i*3+2)*heightJitter/100));
 return {id:`entry-${i}`,role:'fan',native:n,preview:{heightM,diameterM:2,durationS,color:'#efc878',verified:false}}});
 const recipe={name:'扇形 A',category:'fan',entries,seed,randomMode:'materialized'};compileSubTemplate(recipe);return recipe;
}
export function makeShell({trailId='',burstId='',heightM=200,baseHeightM=200,flightS=5,diameterM=150,lifeS=4,scale=1,roll=0,heightJitter=0,seed=1,supportsZScale=false}={}){
 finite(scale,'球花缩放',.001,100);finite(roll,'共同倾角',-180,180);finite(lifeS,'可见时长',.01,600);finite(diameterM,'原径',.01,10000);finite(heightM,'高度',1,2000);finite(baseHeightM,'尾缀原高',1,2000);finite(flightS,'升空时间',.01,60);finite(heightJitter,'高度随机',0,90);
 const height=r(heightM*(1-rand(seed,0)*heightJitter/100));if((Math.abs(height/baseHeightM-1)>.000001)&&!supportsZScale)throw Error('调整高度需要确认尾缀支持纵向缩放');
 const tail=nativeEntry(trailId),ball=nativeEntry(burstId),a=roll*Math.PI/180;tail.RotationOffset.Roll=roll;tail.EffectScale.Z=r(height/baseHeightM);
 ball.LocalTimeOffset=flightS;ball.PositionOffset={X:0,Y:r(-Math.sin(a)*height*100),Z:r(Math.cos(a)*height*100)};ball.EffectScale=vec(scale);
 const recipe={name:'烟花 A',category:'ball',seed,randomMode:'materialized',entries:[{id:'trail',role:'trail',native:tail,preview:{heightM:baseHeightM,diameterM:3,durationS:flightS,color:'#edc180',verified:false}},{id:'burst',role:'burst',native:ball,preview:{heightM:0,diameterM,durationS:lifeS,color:'#efcf8e',verified:false}}]};compileSubTemplate(recipe);return recipe;
}
export function recipeTiming(recipe){const rows=compileSubTemplate(recipe);const bursts=recipe.entries.flatMap((e,i)=>e.role==='burst'?[rows[i].LocalTimeOffset]:[]);return {burst:bursts.length?Math.min(...bursts):0,end:Math.max(...rows.map((n,i)=>n.LocalTimeOffset+recipe.entries[i].preview.durationS))};}
export function retimeSubTemplates(doc){const d=clone(doc);for(const t of d.templateLibrary){const s=d.subTemplateLibrary?.find(s=>s.key===t.subTemplateRef);if(!s)continue;const timing=recipeTiming(s);t.rise=timing.burst;t.life=timing.end-timing.burst;t.recipeDuration=timing.end;
 for(const e of d.events.filter(e=>e.templateId===t.id)){const pinned=e.recipeRef?d.subTemplateLibrary.find(s=>s.key===e.recipeRef):s;if(!pinned)throw Error('场内片段固定版本缺失');const actual=e.recipeRef?recipeTiming(pinned):timing;e.launch=r(e.launch);e.burst=r(e.launch+actual.burst);e.end=r(e.launch+actual.end);for(const k of ['launch','burst','end'])e['effective'+k[0].toUpperCase()+k.slice(1)]=r(e[k]+(e.dt||0));}}
 return d.sections?normalize(d):d;
}
export function applySubTemplate(doc,templateId,key){const d=clone(doc),t=d.templateLibrary.find(t=>t.id===templateId),s=d.subTemplateLibrary.find(s=>s.key===key);if(!t||!s)throw Error('子模板版本不存在');compileSubTemplate(s);t.subTemplateRef=key;t.name=s.name;t.recipeCategory=s.category;if(s.category==='fan'){t.kind='fan';t.shape='fan'}else if(s.category==='trail'){t.kind='comet';t.shape='comet'}else if(['fan','comet'].includes(t.kind)){t.kind='small';t.shape='ball'}return retimeSubTemplates(d);}
export function saveSubTemplate(doc,templateId,draft){compileSubTemplate(draft);const engineId=draft.engineId?validateEngineId(draft.engineId):null;const d=clone(doc),t=d.templateLibrary.find(t=>t.id===templateId);if(!t)throw Error('花型不存在');if(engineId&&(d.subTemplateLibrary||[]).some(s=>s.id!==draft.id&&(s.engineId||s.id)===engineId))throw Error('英文ID已被其他花型使用');d.subTemplateLibrary??=[];const id=draft.id||`ST_${templateId}`,version=1+Math.max(0,...d.subTemplateLibrary.filter(s=>s.id===id).map(s=>s.version));const saved={...clone(draft),...(engineId?{engineId}:{}),id,version,key:`${id}@${version}`};d.subTemplateLibrary.push(saved);return applySubTemplate(d,templateId,saved.key);}
export function validateSubTemplates(doc){const issues=[],keys=new Set();for(const s of doc.subTemplateLibrary||[]){if(keys.has(s.key)||!s.key)issues.push('子模板版本键重复或缺失');keys.add(s.key);try{compileSubTemplate(s)}catch(e){issues.push(`${s.name}: ${e.message}`)}}for(const t of doc.templateLibrary||[])if(!keys.has(t.subTemplateRef))issues.push(`${t.name}: 子模板版本引用缺失`);return issues;}
export function migrateSubTemplates(doc,catalog){if(doc.subTemplateLibrary?.length){const issues=validateSubTemplates(doc);if(issues.length)throw Error(issues[0]);return retimeSubTemplates(doc)}let d=clone(doc);d.subTemplateLibrary=[];const mapping=sourceMapping(doc,catalog);
 for(const t of doc.templateLibrary){const source=catalog.find(c=>c.key===mapping[t.id].source),rows=source.sub.Entries;const entries=rows.map((n,i)=>{const role=t.kind==='fan'?'fan':/Trail|Comet/i.test(n.FXResourceId)?'trail':'burst';return {id:`entry-${i}`,role,native:clone(n),preview:{heightM:role==='burst'?0:(t.flightHeight||Math.max(1,(t.burstZ||230)-(t.zone==='front'?50:150))),diameterM:role==='burst'?(t.diameter||90):3,durationS:role==='trail'?(t.rise||3):t.life||3,color:t.color||'#eac78b',verified:false}}});
 const s={id:`ST_${t.id}`,key:`ST_${t.id}@1`,version:1,name:t.name,category:t.kind==='fan'?'fan':t.kind==='comet'?'trail':'ball',sourceIndex:source.sourceIndex,entries,randomMode:'native-source'};compileSubTemplate(s);d.subTemplateLibrary.push(s);d.templateLibrary.find(x=>x.id===t.id).subTemplateRef=s.key;}
 return retimeSubTemplates(d);
}
export function previewSubTemplates(doc,events){const out=[];for(const parent of events){const t=doc.templateLibrary.find(t=>t.id===parent.templateId),s=doc.subTemplateLibrary?.find(s=>s.key===(parent.recipeRef||t?.subTemplateRef));if(!s)continue;const rows=compileSubTemplate(s);rows.forEach((n,i)=>{const e=s.entries[i],start=r((parent.effectiveLaunch??parent.launch+(parent.dt||0))+n.LocalTimeOffset);out.push({...parent,id:`${parent.id}/${s.key}/${i}`,parentId:parent.id,recipeKey:s.key,nativePrimitive:true,nativeEntry:n,role:e.role,preview:clone(e.preview),previewVerified:e.preview.verified===true,effectiveLaunch:start,effectiveBurst:start,effectiveEnd:r(start+e.preview.durationS)});});}return {events:out,templates:doc.templateLibrary};}
