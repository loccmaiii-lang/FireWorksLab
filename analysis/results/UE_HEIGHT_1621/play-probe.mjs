// 只读核对：导演实际播放时，父模板条目的 PositionOffset.Z（编排 dz）有没有用到组件出生位置上。
// 不改 DefaultConfig、不保存；只临时设 DebugPlatform / DebugQualityLevel / DebugPreviewStartTime，结束恢复并核对表未变。
// 用法：node play-probe.mjs <开始秒> <采样秒,逗号分隔> <截图秒> <标签> [night|failed]
import fs from 'node:fs';import {request,INST as FAILED} from '../MOBILE_TEST_20261011/ue.mjs';
const NIGHT='/Game/Maps/Dam_Iris_Long3/DynamicRequest/Event/MA5_FireworkOnDam/MA5_FireworkOnDam_Night.MA5_FireworkOnDam_Night:PersistentLevel.BP_NewYearFireworks_ShowDirector_Night_2';
const WHICH=process.argv[6]||'failed';const INST=WHICH==='night'?NIGHT:FAILED;import {same} from '../../../tool/workbench/src/engine.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const T0=Date.now();const log=m=>fs.appendFileSync('probe.log',`${((Date.now()-T0)/1000).toFixed(2)} ${m}\n`);
const KSL='/Script/Engine.Default__KismetSystemLibrary',WORLD='/Game/Maps/Dam_Iris_Long3/Dam_Iris_Long3.Dam_Iris_Long3';
const [,,startArg,samplesArg,shotArg,tag='probe']=process.argv;const start=+startArg,samples=samplesArg.split(',').map(Number),shotAt=+shotArg;
const snap=JSON.parse(fs.readFileSync(WHICH==='night'?'night-now.json':'dir-instance-now.json','utf8'));
const DEBUG0={DebugPlatform:'None',DebugQualityLevel:'EQuality_High',DebugPreviewStartTime:0};
const cmd=c=>request('/object/call',{path:KSL,function:'ExecuteConsoleCommand',args:{WorldContextObject:WORLD,Command:c}});
const cur=(await request('/object/get',{path:INST,properties:['DefaultConfig','bShowActive']},180000)).properties;log('read ok');
if(cur.bShowActive)throw Error('导演正在播放，停止');
if(!same(cur.DefaultConfig,snap.DefaultConfig))throw Error('导演配置和刚才的快照不同，停止');
const list=async()=>(await request('/object/search',{class:'ParticleSystemComponent',limit:5000},60000)).objects||[];
const base=new Set((await list()).map(o=>o.path));log('base '+base.size);
const pool=async(arr,n,fn)=>{let i=0;await Promise.all(Array.from({length:n},async()=>{while(i<arr.length){const x=arr[i++];await fn(x)}}))};
async function sample(label){
  const objs=(await list()).filter(o=>!base.has(o.path));const out=[];const classes={};
  for(const o of objs)classes[o.class]=(classes[o.class]||0)+1;
  await pool(objs,4,async o=>{try{const g=(await request('/object/get',{path:o.path,properties:['Template','ResourceFX','RelativeLocation','RelativeScale3D','bWasCompleted','bWasDeactivated','AttachParent']},10000)).properties;
    const tpl=String(g.Template?.path||g.Template||'').split('.').pop();
    out.push({path:o.path,class:o.class,tpl,res:g.ResourceFX?.ResourceId,loc:g.RelativeLocation&&{X:g.RelativeLocation.X,Y:g.RelativeLocation.Y,Z:g.RelativeLocation.Z},scale:g.RelativeScale3D?.X,live:!g.bWasCompleted&&!g.bWasDeactivated,parent:g.AttachParent?.path||g.AttachParent||null})}catch(e){out.push({path:o.path,class:o.class,error:e.message})}});
  log('sample '+label+' new '+objs.length);return {label,newCount:objs.length,classes,components:out};
}
const result={start,samples:[],tag};
try{
  await request('/object/set',{path:INST,properties:{DebugPlatform:'None',DebugQualityLevel:'EQuality_High',DebugPreviewStartTime:start}});
  await request('/object/call',{path:INST,function:'DebugPreviewShow',args:{}});const t0=Date.now();log('show started');
  for(const s of samples){
    const w=t0+s*1000-Date.now();if(w>0)await sleep(w);
    if(s===shotAt){await cmd('FX.FreezeParticleSimulation 1');await sleep(300);
      await cmd(`HighResShot 1600x900 filename=F:/FireWorksLab/analysis/local/UE_HEIGHT_20261013/shot-${tag}.png`);await sleep(900);log('shot');}
    result.samples.push(await sample('t+'+s));
    if(s===shotAt)await cmd('FX.FreezeParticleSimulation 0');
  }
}catch(e){log('ERR '+e.message);result.error=e.message}finally{
  log('finally');
  await cmd('FX.FreezeParticleSimulation 0');
  await request('/object/call',{path:INST,function:'DebugStopShow',args:{}});
  await request('/object/set',{path:INST,properties:DEBUG0});
  const after=(await request('/object/get',{path:INST,properties:['DefaultConfig','bShowActive','DebugPlatform','DebugQualityLevel','DebugPreviewStartTime']},180000)).properties;
  result.restored={config:same(after.DefaultConfig,snap.DefaultConfig),active:after.bShowActive,debug:[after.DebugPlatform,after.DebugQualityLevel,after.DebugPreviewStartTime]};
  fs.writeFileSync(`probe-${tag}.json`,JSON.stringify(result,null,1));
  console.log('restored',JSON.stringify(result.restored),'samples',result.samples.map(s=>s.label+':'+s.newCount).join(' '));
}
