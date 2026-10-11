// 金垂柳朝向测试：只改内存（导演实例 _7 + GoldKamuro_HD 各发射器 RequiredModule.ScreenAlignment），全部写回原值，不保存资产/关卡
import fs from 'node:fs';import {request,INST} from './ue.mjs';import {ueText} from '../../../tool/workbench/src/delivery-model.mjs';import {same} from '../../../tool/workbench/src/engine.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ELL='/Script/EditorScriptingUtilities.Default__EditorLevelLibrary',KSL='/Script/Engine.Default__KismetSystemLibrary',LIB='/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const PS='/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_GoldKamuro_HD.P_EFX_FireWorks_GoldKamuro_HD';
const WORLD='/Game/Maps/Dam_Iris_Long3/Dam_Iris_Long3.Dam_Iris_Long3';
const backup=JSON.parse(fs.readFileSync('instance-before.json','utf8')).properties;
const mode=process.argv[2];
async function requiredModules(){await request('/object/call',{path:LIB,function:'LoadAsset',args:{AssetPath:PS.split('.')[0]}});const a=await request('/object/get',{path:PS,properties:['Emitters']});const out=[];for(const e of a.properties.Emitters){const b=await request('/object/get',{path:e.path,properties:['LODLevels']});for(const l of b.properties.LODLevels){const c=await request('/object/get',{path:l.path,properties:['RequiredModule']});const r=c.properties.RequiredModule.path;const g=await request('/object/get',{path:r,properties:['ScreenAlignment']});out.push({path:r,ScreenAlignment:g.properties.ScreenAlignment})}}return out}
const parse=s=>Object.fromEntries([...String(s).matchAll(/(\w+)=(-?[\d.]+)/g)].map(m=>[m[1],Number(m[2])]));
if(mode==='prep'){
 const cam=await request('/object/call',{path:ELL,function:'GetLevelViewportCameraInfo',args:{}});
 const mods=await requiredModules();
 fs.writeFileSync('kamuro-backup.json',JSON.stringify({camera:{loc:parse(cam.out_CameraLocation),rot:parse(cam.out_CameraRotation)},modules:mods},null,1));
 console.log(JSON.stringify({camera:cam,modules:mods.map(m=>m.ScreenAlignment)}));
}else if(mode==='install'){
 const v=(x=0,y=0,z=0)=>({X:x,Y:y,Z:z}),rot=()=>({Pitch:0,Yaw:0,Roll:0}),F={PlatformFlags:14,MinQualityLevel:'EQuality_VeryLow'};
 const text=x=>ueText(x);
 const cfg={TotalDuration:12,EffectSubTemplates:[],EffectTemplates:[{TemplateName:'QA_KAMURO_P4',RequiredPointCount:9,Filter:F,Entries:[{EntryType:'Effect',FXResourceId:'P_EFX_FireWorks_GoldKamuro',SubTemplateName:'None',LocalTimeOffset:0,SlotIndex:4,PositionOffset:v(0,0,40000),RotationOffset:rot(),RandomPositionRange:v(),RandomRotationRange:rot(),EffectScale:v(1,1,1),RandomScaleRatio:0,Filter:F}]}],EffectScheduleGroups:[{GroupName:'P',Slots:[{StartTime:0.5,TemplateName:'QA_KAMURO_P4',Filter:F}]}]};
 await request('/object/set',{path:INST,properties:{DefaultConfig:text(cfg)}},120000);console.log('installed');
}else if(mode==='align'){
 const to=process.argv[3];const b=JSON.parse(fs.readFileSync('kamuro-backup.json','utf8'));
 for(const m of b.modules)await request('/object/set',{path:m.path,properties:{ScreenAlignment:to==='restore'?m.ScreenAlignment:to}});
 const now=await requiredModules();console.log(JSON.stringify(now.map(m=>m.ScreenAlignment)));
}else if(mode==='run'){
 const label=process.argv[3];const b=JSON.parse(fs.readFileSync('kamuro-backup.json','utf8')).camera;
 const T={X:371995.2,Y:-805151.1,Z:-3401+40000};
 const C={X:b.loc.X+ (b.loc.X-T.X)*0.6,Y:b.loc.Y+(b.loc.Y-T.Y)*0.6,Z:b.loc.Z};  // 沿原视线往后退一些，整朵入画
 const dx=T.X-C.X,dy=T.Y-C.Y,dz=T.Z-C.Z,yaw=Math.atan2(dy,dx)*180/Math.PI,pitch=Math.atan2(dz,Math.hypot(dx,dy))*180/Math.PI;
 const setCam=async(y,p)=>request('/object/call',{path:ELL,function:'SetLevelViewportCameraInfo',args:{CameraLocation:`(X=${C.X},Y=${C.Y},Z=${C.Z})`,CameraRotation:`(Pitch=${p},Yaw=${y},Roll=0)`}});
 const shot=async(n)=>request('/object/call',{path:KSL,function:'ExecuteConsoleCommand',args:{WorldContextObject:WORLD,Command:`HighResShot 960x540 filename=F:/FireWorksLab/analysis/local/MOBILE_TEST_20261011/shots/${label}_${n}.png`}});
 await setCam(yaw,pitch);
 await request('/object/set',{path:INST,properties:{DebugPlatform:'PC',DebugQualityLevel:'EQuality_High',DebugPreviewStartTime:0}});
 try{await request('/object/call',{path:INST,function:'DebugPreviewShow',args:{}});
  await sleep(3500);await shot('a_center');await sleep(150);
  await setCam(yaw+28,pitch);await sleep(250);await shot('b_yaw+28');await sleep(150);
  await setCam(yaw-28,pitch);await sleep(250);await shot('c_yaw-28');await sleep(150);
  await setCam(yaw,pitch);await sleep(250);await shot('d_center_again');
  await sleep(800);
 }finally{await request('/object/call',{path:INST,function:'DebugStopShow',args:{}});}
 console.log(JSON.stringify({C,yaw,pitch}));
}else if(mode==='restore'){
 const b=JSON.parse(fs.readFileSync('kamuro-backup.json','utf8'));
 await request('/object/call',{path:INST,function:'DebugStopShow',args:{}});
 await request('/object/set',{path:INST,properties:{DefaultConfig:ueText(backup.DefaultConfig),DebugPlatform:backup.DebugPlatform,DebugQualityLevel:backup.DebugQualityLevel,DebugPreviewStartTime:backup.DebugPreviewStartTime}},180000);
 for(const m of b.modules)await request('/object/set',{path:m.path,properties:{ScreenAlignment:m.ScreenAlignment}});
 const c=b.camera;await request('/object/call',{path:ELL,function:'SetLevelViewportCameraInfo',args:{CameraLocation:`(X=${c.loc.X},Y=${c.loc.Y},Z=${c.loc.Z})`,CameraRotation:`(Pitch=${c.rot.Pitch},Yaw=${c.rot.Yaw},Roll=${c.rot.Roll||0})`}});
 const a=(await request('/object/get',{path:INST,properties:['DefaultConfig','DebugPlatform','DebugQualityLevel','DebugPreviewStartTime']},120000)).properties;
 const mods=await requiredModules();
 const r={directorRestored:same(a.DefaultConfig,backup.DefaultConfig),debug:[a.DebugPlatform,a.DebugQualityLevel,a.DebugPreviewStartTime],alignmentRestored:mods.every((m,i)=>m.ScreenAlignment===b.modules[i].ScreenAlignment),assetSaved:false,levelSaved:false};
 fs.writeFileSync('kamuro-restore.json',JSON.stringify(r,null,1));console.log(JSON.stringify(r));
}
