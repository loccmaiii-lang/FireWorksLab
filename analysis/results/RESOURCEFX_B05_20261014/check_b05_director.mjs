// 只读：Night 导演是否 = B05 一张表；按平台展开，手游/PC 条目各自与 B05 一致，且每个 ID 在对应资源表有行、粒子能加载。
// 用法：node check_b05_director.mjs  → 写 导演B05核对_<时间>.json，打印结论
import fs from 'node:fs';import {snapshot} from '../../scripts/workbench_engine_acceptance.mjs';import {request} from './ue_ro.mjs';
const B05=JSON.parse(fs.readFileSync('../../../FXtools/节目/NewYearFireWorks_v01/导演表-B05-ResourceFX新命名-手游6种-一张表.json','utf8'));
const T={pc:'/Game/R13N/Common/PC/DataTables/Resource/ResourceFXTable',mobile:'/Game/DataTables/Resource/ResourceFXTable'};
const close=(a,b)=>{if(b&&typeof b==='object'&&!Array.isArray(b))return a&&typeof a==='object'&&Object.entries(b).every(([k,v])=>close(a[k],v));
 if(Array.isArray(b))return Array.isArray(a)&&a.length===b.length&&b.every((v,i)=>close(a[i],v));
 if(typeof b==='number'&&typeof a==='number')return Math.abs(a-b)<=Math.max(1e-3,Math.abs(b)*1e-5);return a===b};
const Q=['EQuality_VeryLow','EQuality_Low','EQuality_Medium','EQuality_High','EQuality_VeryHigh'];
function expand(c){const sub=new Map(c.EffectSubTemplates.map(s=>[s.TemplateName,s])),tpl=new Map(c.EffectTemplates.map(t=>[t.TemplateName,t]));const ev=[];
 for(const g of c.EffectScheduleGroups)for(const sl of g.Slots){const t=tpl.get(sl.TemplateName);if(!t){ev.push({missingTemplate:sl.TemplateName});continue}
  for(const te of t.Entries){const f1=sl.Filter.PlatformFlags&te.Filter.PlatformFlags,q1=Math.max(Q.indexOf(sl.Filter.MinQualityLevel),Q.indexOf(te.Filter.MinQualityLevel));
   const list=te.EntryType==='SubTemplate'?(sub.get(te.SubTemplateName)?.Entries||[{missingSub:te.SubTemplateName}]):[te];
   for(const e of list){if(e.missingSub){ev.push(e);continue}const f=f1&e.Filter.PlatformFlags,q=Math.max(q1,Q.indexOf(e.Filter.MinQualityLevel));
    ev.push({group:g.GroupName,t:+(sl.StartTime+te.LocalTimeOffset+(te.EntryType==='SubTemplate'?e.LocalTimeOffset:0)).toFixed(3),id:e.FXResourceId,flags:f,q,scale:e.EffectScale})}}}
 return ev}
const tally=(ev,bit)=>{const o={};for(const e of ev)if(e.flags&bit)o[e.id]=(o[e.id]||0)+1;return o};
const snap=await snapshot();const c=snap.config;const out={format:'df.director-b05-check/1',readAt:new Date().toISOString(),target:snap.target,night:{sub:c.EffectSubTemplates.length,tpl:c.EffectTemplates.length,slots:c.EffectScheduleGroups.reduce((n,g)=>n+g.Slots.length,0),duration:c.TotalDuration},
 b05:{sub:B05.EffectSubTemplates.length,tpl:B05.EffectTemplates.length,slots:B05.EffectScheduleGroups.reduce((n,g)=>n+g.Slots.length,0),duration:B05.duration}};
const diffs=[];for(const [key,name,lst] of [['EffectSubTemplates','TemplateName','Entries'],['EffectTemplates','TemplateName','Entries'],['EffectScheduleGroups','GroupName','Slots']]){
 const A=new Map(c[key].map(x=>[x[name],x])),B=new Map(B05[key].map(x=>[x[name],x]));
 for(const k of new Set([...A.keys(),...B.keys()])){const a=A.get(k),b=B.get(k);if(!a||!b){diffs.push({key,name:k,kind:a?'只在导演':'只在B05'});continue}
  if(a[lst].length!==b[lst].length){diffs.push({key,name:k,kind:'条目数',night:a[lst].length,b05:b[lst].length});continue}
  b[lst].forEach((y,i)=>{const x=a[lst][i];for(const f of ['FXResourceId','SubTemplateName','TemplateName','LocalTimeOffset','StartTime','EffectScale','PositionOffset','RotationOffset','Filter'])if(f in y&&!close(x[f],y[f]))diffs.push({key,name:k,i,field:f,night:x[f],b05:y[f]})})}}
out.isB05=out.night.sub===out.b05.sub&&out.night.tpl===out.b05.tpl&&out.night.slots===out.b05.slots&&diffs.length===0;out.differences=diffs.length;out.diffSample=diffs.slice(0,40);
const evN=expand(c),evB=expand(B05);
out.platform={night:{mobileEvents:evN.filter(e=>e.flags&2).length,pcEvents:evN.filter(e=>e.flags&12).length,mobileIds:tally(evN,2),pcIds:tally(evN,12)},b05:{mobileEvents:evB.filter(e=>e.flags&2).length,pcEvents:evB.filter(e=>e.flags&12).length,mobileIds:tally(evB,2),pcIds:tally(evB,12)}};
const sig=(ev,bit)=>ev.filter(e=>e.flags&bit).map(e=>[e.group,e.t.toFixed(2),e.id,e.q,e.scale?.X?.toFixed(3)].join('|')).sort();
const cmp=(a,b)=>{const ca={},cb={};a.forEach(s=>ca[s]=(ca[s]||0)+1);b.forEach(s=>cb[s]=(cb[s]||0)+1);const o=[];for(const k of new Set([...Object.keys(ca),...Object.keys(cb)]))if((ca[k]||0)!==(cb[k]||0))o.push({event:k,night:ca[k]||0,b05:cb[k]||0});return o};
out.mobileVsB05=cmp(sig(evN,2),sig(evB,2)).slice(0,40);out.pcVsB05=cmp(sig(evN,12),sig(evB,12)).slice(0,40);
// 资源表：每个 ID 在对应平台表有且只有一行、FxSP 能加载、手游行三格都是 _M
const LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';out.tables={};
for(const [side,bit] of [['mobile',2],['pc',12]]){const rows=(await request('/datatable/rows',{table:T[side],limit:100000},180000)).rows;const ids=Object.keys(tally(evN,bit));out.tables[side]=[];
 for(const id of ids){const m=rows.filter(r=>r.ResourceId===id);const r=m[0];let loads=null;if(r&&r.FxSP!=='None'){const L=await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:r.FxSP.split('.')[0]}});loads=!!L.return_value&&L.return_value!=='None'}
  out.tables[side].push({id,rows:m.length,row:r?._row_name,FxSP:r?.FxSP,allM:side==='mobile'&&r?[r.FxSP,r.FxSP_Low,r.FxSP_High].every(p=>/_M\.[^.]*_M$/.test(p)):undefined,FXType:r?.FXType,loads,ok:m.length===1&&loads&&(side!=='mobile'||[r.FxSP,r.FxSP_Low,r.FxSP_High].every(p=>/_M\.[^.]*_M$/.test(p)))})}}
out.pass=out.isB05&&!out.mobileVsB05.length&&!out.pcVsB05.length&&Object.values(out.tables).every(l=>l.every(x=>x.ok));
const f=`导演B05核对_${new Date().toISOString().slice(0,16).replace(/[-:T]/g,'')}.json`;fs.writeFileSync(f,JSON.stringify(out,null,1));
console.log(f,JSON.stringify({isB05:out.isB05,night:out.night,b05:out.b05,differences:out.differences,mobileEvents:[out.platform.night.mobileEvents,out.platform.b05.mobileEvents],pcEvents:[out.platform.night.pcEvents,out.platform.b05.pcEvents],mobileVsB05:out.mobileVsB05.length,pcVsB05:out.pcVsB05.length,tableProblems:Object.fromEntries(Object.entries(out.tables).map(([k,l])=>[k,l.filter(x=>!x.ok)])),pass:out.pass},null,1));
