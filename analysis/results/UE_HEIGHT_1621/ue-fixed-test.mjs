// 16.0.21 实测：把修好的一张表（dz 烘进子模板高度版本）临时写进 Night 导演内存，播 86 s 那排 PrismWheels，
// 读回尾缀 / 花的出生高度和截图；结束写回原表（night-now.json）并核对。不保存关卡、不碰资产。
import fs from 'node:fs';import {request} from '../MOBILE_TEST_20261011/ue.mjs';
import {same} from '../../../tool/workbench/src/engine.mjs';import {ueText} from '../../../tool/workbench/src/delivery-model.mjs';
import {migrateNumbering} from '../../../tool/workbench/src/point-numbering.mjs';import {preflightProject} from '../../../tool/workbench/src/program-project.mjs';
import {nestedQualityEvents} from '../../../tool/workbench/src/editing-model.mjs';import {compileDirector} from '../../../tool/workbench/src/director-model.mjs';
const INST='/Game/Maps/Dam_Iris_Long3/DynamicRequest/Event/MA5_FireworkOnDam/MA5_FireworkOnDam_Night.MA5_FireworkOnDam_Night:PersistentLevel.BP_NewYearFireworks_ShowDirector_Night_2';
const KSL='/Script/Engine.Default__KismetSystemLibrary',WORLD='/Game/Maps/Dam_Iris_Long3/Dam_Iris_Long3.Dam_Iris_Long3';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const T0=Date.now();const log=m=>fs.appendFileSync('fixed.log',`${((Date.now()-T0)/1000).toFixed(2)} ${m}\n`);
const cmd=c=>request('/object/call',{path:KSL,function:'ExecuteConsoleCommand',args:{WorldContextObject:WORLD,Command:c}});
const START=+(process.argv[2]||86),SHOT=+(process.argv[3]||5.2),TAG=process.argv[4]||'fixed86';
const snap=JSON.parse(fs.readFileSync('night-now.json','utf8'));  // 先只读存一份：node read-night.mjs（见 analysis/local/UE_HEIGHT_20261013）
const W='../../../tool/workbench/';
const seed=migrateNumbering(JSON.parse(fs.readFileSync(W+'public/data/score24-v05.json','utf8')));
const cloud=JSON.parse(fs.readFileSync(W+'public/data/cloud-latest.json','utf8'));const state=preflightProject(JSON.stringify(cloud.project),seed);
const nested=nestedQualityEvents(state.doc,state.profiles),r=compileDirector(state.doc,nested.events,undefined);
if(nested.issues.length||r.issues.length)throw Error('编译有问题：'+[...nested.issues,...r.issues].join('；'));
// 只写特效 4 个字段（和工作台正式导入一样）：整表写回会把 SequenceTemplates 里的 SoftObjectPath 写成 None（10-13 踩过）。
const KEYS=['EffectSubTemplates','EffectTemplates','EffectScheduleGroups','TotalDuration'],pick=c=>Object.fromEntries(KEYS.map(k=>[k,c[k]]));
const cfg={...pick(snap.DefaultConfig),...r.arrays};
fs.writeFileSync(`${TAG}-config.json`,JSON.stringify({version:cloud.version,summary:r.summary,arrays:r.arrays},null,1));
log(`compiled subs ${r.arrays.EffectSubTemplates.length} (height versions ${r.summary.heightVariants}) tpls ${r.arrays.EffectTemplates.length}`);
const cur=(await request('/object/get',{path:INST,properties:['DefaultConfig','bShowActive']},180000)).properties;
if(cur.bShowActive)throw Error('导演在播放，停止');if(!same(cur.DefaultConfig,snap.DefaultConfig))throw Error('Night 导演配置和快照不同，停止');log('baseline ok');
const list=async()=>(await request('/object/search',{class:'ParticleSystemComponent',limit:5000},60000)).objects||[];
const pool=async(arr,n,fn)=>{let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<arr.length){const x=arr[i++];await fn(x)}}))};
const out={tag:TAG,start:START,shot:SHOT,summary:r.summary};
try{
  await request('/object/set',{path:INST,properties:{DefaultConfig:ueText(cfg)}},180000);log('config written');
  const back=(await request('/object/get',{path:INST,properties:['DefaultConfig']},180000)).properties.DefaultConfig;
  out.readback={subs:back.EffectSubTemplates.length,tpls:back.EffectTemplates.length,slots:back.EffectScheduleGroups.reduce((n,g)=>n+g.Slots.length,0),
    parentZnonzero:back.EffectTemplates.reduce((n,t)=>n+t.Entries.filter(e=>Math.abs(e.PositionOffset.Z)>0.5).length,0),
    sameArrays:same(back.EffectSubTemplates,r.arrays.EffectSubTemplates)&&same(back.EffectTemplates,r.arrays.EffectTemplates)};log('readback '+JSON.stringify(out.readback));
  const base=new Set((await list()).map(o=>o.path));
  await request('/object/set',{path:INST,properties:{DebugPlatform:'None',DebugQualityLevel:'EQuality_High',DebugPreviewStartTime:START}});
  await request('/object/call',{path:INST,function:'DebugPreviewShow',args:{}});const t0=Date.now();log('show');
  const w=t0+SHOT*1000-Date.now();if(w>0)await sleep(w);
  await cmd('FX.FreezeParticleSimulation 1');await sleep(300);
  await cmd(`HighResShot 1600x900 filename=F:/FireWorksLab/analysis/local/UE_HEIGHT_20261013/shot-${TAG}.png`);await sleep(900);log('shot');
  const objs=(await list()).filter(o=>!base.has(o.path)&&o.class==='FXResourceContainerComponent'),comps=[];
  await pool(objs,4,async o=>{try{const g=(await request('/object/get',{path:o.path,properties:['Template','RelativeLocation']},10000)).properties;comps.push({tpl:String(g.Template?.path||g.Template||'').split('.').pop(),loc:{X:g.RelativeLocation.X,Y:g.RelativeLocation.Y,Z:g.RelativeLocation.Z}})}catch(e){comps.push({error:e.message})}});
  out.components=comps;log('components '+comps.length);
}catch(e){out.error=e.message;log('ERR '+e.message)}finally{
  await cmd('FX.FreezeParticleSimulation 0');await request('/object/call',{path:INST,function:'DebugStopShow',args:{}});
  await request('/object/set',{path:INST,properties:{DefaultConfig:ueText(pick(snap.DefaultConfig)),DebugPlatform:'None',DebugQualityLevel:'EQuality_High',DebugPreviewStartTime:0}},180000);
  const after=(await request('/object/get',{path:INST,properties:['DefaultConfig','bShowActive','DebugPlatform','DebugQualityLevel','DebugPreviewStartTime']},180000)).properties;
  out.restored={config:same(after.DefaultConfig,snap.DefaultConfig),active:after.bShowActive,debug:[after.DebugPlatform,after.DebugQualityLevel,after.DebugPreviewStartTime]};
  fs.writeFileSync(`${TAG}.json`,JSON.stringify(out,null,1));log('restored '+JSON.stringify(out.restored));console.log('restored',JSON.stringify(out.restored),'readback',JSON.stringify(out.readback),'error',out.error||'-');
}
