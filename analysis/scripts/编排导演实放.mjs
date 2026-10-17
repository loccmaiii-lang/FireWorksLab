// 固定用户机位，以实际导演播放和截图；只内存切表/调试，不保存 UE 资产。
// 用法：node analysis/scripts/编排导演实放.mjs <任务配置.json>
// 配置：out、label、table、platform、quality、start、moments；table 可省略。
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {same} from '../../tool/workbench/src/engine.mjs';
import {ueText} from '../../tool/workbench/src/delivery-model.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ELL='/Script/EditorScriptingUtilities.Default__EditorLevelLibrary';
const KSL='/Script/Engine.Default__KismetSystemLibrary';
const WORLD='/Game/Maps/Dam_Iris_Long3/Dam_Iris_Long3.Dam_Iris_Long3';
const KEYS=['EffectSubTemplates','EffectTemplates','EffectScheduleGroups'];
const DEBUG=['DebugPlatform','DebugQualityLevel','DebugPreviewStartTime'];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cfg=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
if(!/^[A-Za-z0-9_-]+$/.test(cfg.label))throw Error('label 只能含字母、数字、横线');
if(!['PC','Mobile'].includes(cfg.platform))throw Error('未支持的平台');
if(!['EQuality_High','EQuality_Medium','EQuality_Low','EQuality_VeryLow'].includes(cfg.quality))throw Error('未支持的导演档位');
if(!Number.isFinite(cfg.start)||!Array.isArray(cfg.moments)||!cfg.moments.length||cfg.moments.some((v,i,a)=>!Number.isFinite(v)||v<cfg.start||(i&&v<=a[i-1])))throw Error('时刻必须递增且不早于起点');
const out=path.resolve(cfg.out),shotDir=path.join(out,'shots',cfg.label);
const runPath=path.join(out,cfg.label+'.json');
if(fs.existsSync(runPath)||fs.existsSync(shotDir))throw Error('已有运行证据，不覆盖');
fs.mkdirSync(shotDir,{recursive:true});
const report={format:'df.director-visual-run/1',sourceHead:cfg.sourceHead,label:cfg.label,platform:cfg.platform,quality:cfg.quality,start:cfg.start,requestedMoments:cfg.moments,requests:[],events:[],started:false};
const write=()=>fs.writeFileSync(runPath,JSON.stringify(report,null,2));
let target=null;
async function request(route,payload,timeout=30000){
 if(!['/object/search','/object/get','/object/set','/object/call'].includes(route))throw Error('不允许的接口');
 if(route==='/object/set'&&(payload.path!==target||Object.keys(payload.properties).some(k=>!['DefaultConfig',...DEBUG].includes(k))))throw Error('只能改已识别导演的三表/调试字段');
 if(route==='/object/call'){
  const ok=(payload.path===ELL&&['GetLevelViewportCameraInfo','SetLevelViewportCameraInfo'].includes(payload.function))||
   (payload.path===target&&['DebugPreviewShow','DebugStopShow'].includes(payload.function))||
   (payload.path===KSL&&['GetGameTimeInSeconds','GetConsoleVariableIntValue','GetConsoleVariableFloatValue'].includes(payload.function))||
   (payload.path===KSL&&payload.function==='ExecuteConsoleCommand'&&/^HighResShot 1 filename=[A-Za-z]:\//.test(payload.args.Command));
  if(!ok)throw Error('不允许的引擎函数或控制台命令');
 }
 const stamp={at:new Date().toISOString(),route,path:payload.path||null,function:payload.function||null};
 report.requests.push(stamp);
 const send=()=>new Promise((resolve,reject)=>{
  const body=Buffer.from(JSON.stringify(payload));
  const q=http.request('http://127.0.0.1:17780/gpcli'+route,{agent:false,method:'POST',headers:{'Content-Type':'text/plain','Content-Length':body.length}},r=>{
   let s='';r.setEncoding('utf8');r.on('data',c=>s+=c);r.on('end',()=>{try{const d=JSON.parse(s);if(r.statusCode!==200||d.success===false)throw Error(d.message||'UE 请求失败');resolve(d.data??d);}catch(e){reject(e);}});
  });q.on('error',reject);q.setTimeout(timeout,()=>q.destroy(Error('UE请求超时；结果未知，不重试写入')));q.end(body);
 });
 let result;
 try{result=await send();}
 catch(e){
  // 空闲后首个只读连接偶发被服务关闭；只读重连一次，写入绝不重试。
  if(!['/object/get','/object/search'].includes(route)||!['ECONNRESET','EPIPE'].includes(e.code))throw e;
  stamp.readReconnect=e.code;await sleep(350);result=await send();
 }
 stamp.done=new Date().toISOString();return result;
}
const call=(p,f,args={})=>request('/object/call',{path:p,function:f,args});
const camera=()=>call(ELL,'GetLevelViewportCameraInfo');
const get=async()=>(await request('/object/get',{path:target,properties:['DefaultConfig',...DEBUG,'bShowActive','ShowStartServerTime','RandomSeed']},180000)).properties;
const clock=async()=>Number((await call(KSL,'GetGameTimeInSeconds',{WorldContextObject:WORLD})).return_value);
const foreign=v=>Object.fromEntries(Object.entries(v).filter(([k])=>!KEYS.includes(k)));
const arrays=v=>Object.fromEntries(KEYS.map(k=>[k,v[k]]));
let before=null,camBefore=null,camDuring=null,wanted=null,playing=false,installed=false,cameraChanged=false;
try{
 const refs=await request('/object/search',{class:'DFMShowDirector',limit:100});
 const inst=(refs.objects||[]).filter(o=>o.path.includes(':')&&!o.path.includes('Default__'));
 if(inst.length!==1)throw Error('关卡导演不唯一');target=inst[0].path;report.director=target;
 before=await get();camBefore=await camera();report.before={properties:before,camera:camBefore};
 if(before.bShowActive)throw Error('导演已有播放，停止本次操作');
 if(cfg.expectedBefore){const b=JSON.parse(fs.readFileSync(cfg.expectedBefore,'utf8'));if(!same(before.DefaultConfig,b.instance.properties.DefaultConfig)||!same(camBefore,b.camera))throw Error('现场配置或机位与本轮备份不同，停止');}
 if(cfg.diagnosticPitch!==undefined){
  if(!Number.isFinite(cfg.diagnosticPitch)||Math.abs(cfg.diagnosticPitch)>89)throw Error('诊断仰角无效');
  const rotation=camBefore.out_CameraRotation.replace(/Pitch=[^,)]+/,'Pitch='+cfg.diagnosticPitch);
  cameraChanged=true;await call(ELL,'SetLevelViewportCameraInfo',{CameraLocation:camBefore.out_CameraLocation,CameraRotation:rotation});
  camDuring=await camera();report.diagnosticCamera=camDuring;
 }
 report.cvars={};
 for(const [name,type] of [['sg.EffectsQuality','Int'],['sg.TextureQuality','Int'],['sg.PostProcessQuality','Int'],['r.ScreenPercentage','Float'],['r.SeparateTranslucencyScreenPercentage','Float'],['r.MaxAnisotropy','Int']])report.cvars[name]=Number((await call(KSL,'GetConsoleVariable'+type+'Value',{VariableName:name})).return_value);
 wanted=cfg.table?JSON.parse(fs.readFileSync(path.resolve(ROOT,cfg.table),'utf8')):before.DefaultConfig;
 if(!KEYS.every(k=>Array.isArray(wanted[k])))throw Error('节目三表不完整');
 report.table=cfg.table||'当前导演';report.originalMatchesRequested=KEYS.every(k=>same(before.DefaultConfig[k],wanted[k]));
 if(!report.originalMatchesRequested){await request('/object/set',{path:target,properties:{DefaultConfig:ueText(arrays(wanted))}},300000);installed=true;}
 let current=await get();
 if(!KEYS.every(k=>same(current.DefaultConfig[k],wanted[k]))||!same(foreign(current.DefaultConfig),foreign(before.DefaultConfig)))throw Error('三表读回或非烟花字段不一致');
 await request('/object/set',{path:target,properties:{DebugPlatform:cfg.platform,DebugQualityLevel:cfg.quality,DebugPreviewStartTime:cfg.start}});
 current=await get();
 if(current.DebugPlatform!==cfg.platform||current.DebugQualityLevel!==cfg.quality||!same(current.DebugPreviewStartTime,cfg.start))throw Error('调试字段读回不一致');
 const logFile=cfg.logFile?path.resolve(cfg.logFile):null;
 const logOffset=logFile?fs.statSync(logFile).size:null;
 report.callBeforeClock=await clock();report.callWall=new Date().toISOString();
 // 从调用前即视为可能已播放；请求超时也走现场核对，绝不自动重放。
 playing=true;report.play=await call(target,'DebugPreviewShow');report.started=true;
 const t0=Date.now();report.callAfterClock=await clock();report.callAfterWall=new Date(t0).toISOString();
 const initial=await request('/object/get',{path:target,properties:['bShowActive','ShowStartServerTime']});report.initialActive=initial.properties;
 // 编辑器 DebugPreviewShow 使用独立 FTicker，bShowActive 只反映运行时演出。
 // 以方法返回及本次新增日志确认预览已启动，不能把这个标志误当失败。
 if(report.play.called!==true)throw Error('导演预览调用未成功');
 if(logFile){
  let log='';const flushDeadline=Date.now()+2000;
  do{
   const fd=fs.openSync(logFile,'r'),size=fs.statSync(logFile).size;
   const buf=Buffer.alloc(Math.max(0,size-logOffset));fs.readSync(fd,buf,0,buf.length,logOffset);fs.closeSync(fd);
   log=buf.toString('utf8');if(log.includes('编辑器预览已开始'))break;await sleep(80);
  }while(Date.now()<flushDeadline);
  report.previewStarted=log.includes('编辑器预览已开始');
  report.pointWarnings=log.split(/\r?\n/).filter(s=>s.includes('ValidatePoints()')&&s.includes('insufficient!')).map(s=>s.slice(s.indexOf('ValidatePoints()')));
  if(!report.previewStarted)throw Error('新增日志缺少预览开始回执');
 }
 write();
 for(const moment of cfg.moments){
  // 截图会使编辑器世界时钟短暂停顿，墙钟计划会逐次提前。
  // 以实读世界时钟等待，同时保留调用前后起点构成的时间不确定区间。
  const targetClock=report.callAfterClock+moment-cfg.start,deadline=Date.now()+Math.max(60000,(moment-cfg.start+30)*1000);
  let worldBefore=await clock();
  while(targetClock-worldBefore>0.015){
   if(Date.now()>deadline)throw Error('编辑器时钟不前进，停止采样');
   await sleep(Math.max(20,Math.min(20000,(targetClock-worldBefore)*1000-10)));worldBefore=await clock();
  }
  const wallBefore=Date.now();
  const shot=path.join(shotDir,`${cfg.label}_${moment.toFixed(1).padStart(6,'0')}.png`).replaceAll('\\','/');
  await call(KSL,'ExecuteConsoleCommand',{WorldContextObject:WORLD,Command:'HighResShot 1 filename='+shot});
  const worldAfter=await clock();
  const end=Date.now()+4000;while(!fs.existsSync(shot)&&Date.now()<end)await sleep(80);
  const exists=fs.existsSync(shot),size=exists?fs.statSync(shot).size:0;
  const ev={moment,worldBefore,worldAfter,showTimeRange:[cfg.start+worldBefore-report.callAfterClock,cfg.start+worldAfter-report.callBeforeClock],wallShowTime:cfg.start+(wallBefore-t0)/1000,wallLate:(wallBefore-t0)/1000-(moment-cfg.start),shot,bytes:size,captured:exists&&size>0};
  // world 时钟和导演起点均为实读；保留原值，离线再判定起点语义。
  report.events.push(ev);write();console.log(JSON.stringify({label:cfg.label,moment,captured:ev.captured,world:worldBefore,wallLate:ev.wallLate}));
  if(!ev.captured)throw Error('截图未落盘，先诊断');
 }
 await sleep(500);
}catch(error){report.error=error.stack||error.message;process.exitCode=1;console.error(error.message);}
finally{
 if(before&&target){
  try{
   if(playing){report.stop=await call(target,'DebugStopShow');playing=false;}
   const actual=await get();
   if(installed){
    if(!same(foreign(actual.DefaultConfig),foreign(before.DefaultConfig))||!KEYS.every(k=>same(actual.DefaultConfig[k],wanted[k])))throw Error('现场有并发修改，不覆盖它');
    await request('/object/set',{path:target,properties:{DefaultConfig:ueText(arrays(before.DefaultConfig))}},300000);
   }
   const debugChanged=DEBUG.some(k=>!same(actual[k],before[k]));
   if(debugChanged)await request('/object/set',{path:target,properties:Object.fromEntries(DEBUG.map(k=>[k,before[k]]))});
   if(cameraChanged){
    const now=await camera();
    if(camDuring&&!same(now,camDuring))throw Error('诊断机位在测试中被改变，不覆盖它');
    await call(ELL,'SetLevelViewportCameraInfo',{CameraLocation:camBefore.out_CameraLocation,CameraRotation:camBefore.out_CameraRotation});
   }
   const after=await get(),camAfter=await camera();report.after={properties:after,camera:camAfter};
   report.restored={config:same(after.DefaultConfig,before.DefaultConfig),debug:DEBUG.every(k=>same(after[k],before[k])),camera:same(camAfter,camBefore),stopped:after.bShowActive===false,seed:same(after.RandomSeed,before.RandomSeed)};
   if(Object.values(report.restored).some(v=>!v))throw Error('现场恢复读回不完全一致');
  }catch(e){report.restoreError=e.stack||e.message;process.exitCode=1;console.error('恢复检查失败：'+e.message);}
 }
 report.finished=new Date().toISOString();write();
 console.log(JSON.stringify({label:cfg.label,captured:report.events.filter(e=>e.captured).length,error:report.error||null,restored:report.restored,restoreError:report.restoreError||null}));
}
