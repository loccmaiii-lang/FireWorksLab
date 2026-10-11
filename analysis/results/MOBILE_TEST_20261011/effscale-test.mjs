// UE-14：子模板条目 EffectScale 实际效果（B01 修订2 用 ×1.533 把 150 m 花放大到 230 m、金垂柳 ×1.217 到 280 m）。
// 每轮只放一个东西在 P4，固定机位、冻结粒子截图；比较 scale 1 和放大后的画面。只改导演实例 _7 内存，结束恢复 instance-before.json。
// 用法：node effscale-test.mjs <资源ID> <scale> <开花后几秒冻结> <条目Z米>
import fs from 'node:fs';import {request,INST} from './ue.mjs';import {ueText} from '../../../tool/workbench/src/delivery-model.mjs';import {same} from '../../../tool/workbench/src/engine.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ELL='/Script/EditorScriptingUtilities.Default__EditorLevelLibrary',KSL='/Script/Engine.Default__KismetSystemLibrary',WORLD='/Game/Maps/Dam_Iris_Long3/Dam_Iris_Long3.Dam_Iris_Long3';
const [,,res,scaleArg,freezeArg,zArg]=process.argv;const scale=+scaleArg,freeze=+freezeArg,zM=+zArg;
const backup=JSON.parse(fs.readFileSync('instance-before.json','utf8')).properties;
const P=JSON.parse(fs.readFileSync('points.json','utf8')).P4,cam0=JSON.parse(fs.readFileSync('kamuro-backup.json','utf8')).camera;
const aim={X:P.X,Y:P.Y,Z:P.Z+(zM>0?zM:200)*100};const a=Math.atan2(cam0.loc.Y-P.Y,cam0.loc.X-P.X);
const C={X:P.X+Math.cos(a)*110000,Y:P.Y+Math.sin(a)*110000,Z:cam0.loc.Z};const deg=Math.PI/180;
const yaw=Math.atan2(aim.Y-C.Y,aim.X-C.X)/deg,pitch=Math.atan2(aim.Z-C.Z,Math.hypot(aim.X-C.X,aim.Y-C.Y))/deg;
const v=(x=0,y=0,z=0)=>({X:x,Y:y,Z:z}),rot=()=>({Pitch:0,Yaw:0,Roll:0}),F={PlatformFlags:14,MinQualityLevel:'EQuality_VeryLow'};
const cfg={TotalDuration:20,EffectSubTemplates:[{TemplateName:'QA_SCALE',Entries:[{FXResourceId:'P_EFX_FireWorks_'+res,LocalTimeOffset:0,PositionOffset:v(0,0,zM*100),RotationOffset:rot(),RandomPositionRange:v(),RandomRotationRange:rot(),EffectScale:v(scale,scale,scale),RandomScaleRatio:0,Filter:F}]}],
 EffectTemplates:[{TemplateName:'QA_SCALE_P',RequiredPointCount:9,Filter:F,Entries:[{EntryType:'SubTemplate',FXResourceId:'None',SubTemplateName:'QA_SCALE',LocalTimeOffset:0,SlotIndex:4,PositionOffset:v(),RotationOffset:rot(),RandomPositionRange:v(),RandomRotationRange:rot(),EffectScale:v(1,1,1),RandomScaleRatio:0,Filter:F}]}],
 EffectScheduleGroups:[{GroupName:'P',Slots:[{StartTime:0.5,TemplateName:'QA_SCALE_P',Filter:F}]}]};
const cmd=c=>request('/object/call',{path:KSL,function:'ExecuteConsoleCommand',args:{WorldContextObject:WORLD,Command:c}});
const cur=(await request('/object/get',{path:INST,properties:['DefaultConfig','bShowActive']},120000)).properties;
if(cur.bShowActive)throw Error('导演在播放');if(!same(cur.DefaultConfig,backup.DefaultConfig))throw Error('导演配置和基线不同，停止');
const out={res,scale,freeze,zM,cam:{...C,yaw,pitch},file:`shots/scale/${res}_x${scale}_t${freeze}.png`};fs.mkdirSync('shots/scale',{recursive:true});
try{
 await request('/object/set',{path:INST,properties:{DefaultConfig:ueText(cfg)}},120000);
 await request('/object/call',{path:ELL,function:'SetLevelViewportCameraInfo',args:{CameraLocation:`(X=${C.X},Y=${C.Y},Z=${C.Z})`,CameraRotation:`(Pitch=${pitch},Yaw=${yaw},Roll=0)`}});
 await request('/object/set',{path:INST,properties:{DebugPlatform:'PC',DebugQualityLevel:'EQuality_High',DebugPreviewStartTime:0}});
 await request('/object/call',{path:INST,function:'DebugPreviewShow',args:{}});const t0=Date.now();
 const w=t0+(0.5+freeze)*1000-Date.now();if(w>0)await sleep(w);
 await cmd('FX.FreezeParticleSimulation 1');await sleep(300);
 await cmd(`HighResShot 1280x720 filename=F:/FireWorksLab/analysis/local/MOBILE_TEST_20261011/${out.file}`);await sleep(700);
 const r=await request('/object/search',{class:'ParticleSystemComponent',limit:5000},60000);
 for(const o of r.objects.filter(o=>o.class==='FXResourceContainerComponent').slice(-6)){try{const g=(await request('/object/get',{path:o.path,properties:['ResourceFX','RelativeScale3D','RelativeLocation','bWasCompleted']})).properties;if(g.ResourceFX?.ResourceId==='P_EFX_FireWorks_'+res&&!g.bWasCompleted)out.component={scale:g.RelativeScale3D,loc:g.RelativeLocation}}catch{}}
}finally{
 await cmd('FX.FreezeParticleSimulation 0');await request('/object/call',{path:INST,function:'DebugStopShow',args:{}});
 await request('/object/set',{path:INST,properties:{DefaultConfig:ueText(backup.DefaultConfig),DebugPlatform:backup.DebugPlatform,DebugQualityLevel:backup.DebugQualityLevel,DebugPreviewStartTime:backup.DebugPreviewStartTime}},180000);
 await request('/object/call',{path:ELL,function:'SetLevelViewportCameraInfo',args:{CameraLocation:`(X=${cam0.loc.X},Y=${cam0.loc.Y},Z=${cam0.loc.Z})`,CameraRotation:`(Pitch=${cam0.rot.Pitch},Yaw=${cam0.rot.Yaw},Roll=0)`}});
 const after=(await request('/object/get',{path:INST,properties:['DefaultConfig']},120000)).properties.DefaultConfig;out.restored=same(after,backup.DefaultConfig);
 const log=fs.existsSync('effscale-runs.json')?JSON.parse(fs.readFileSync('effscale-runs.json','utf8')):[];log.push(out);fs.writeFileSync('effscale-runs.json',JSON.stringify(log,null,1));
 console.log(JSON.stringify({res,scale,component:out.component?.scale,restored:out.restored}));
}
