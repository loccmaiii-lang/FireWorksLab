import fs from 'node:fs';import {request,INST} from './ue.mjs';import {ueText} from '../../../tool/workbench/src/delivery-model.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const text=v=>Array.isArray(v)?(v.length?'('+v.map(text).join(',')+')':''):v&&typeof v==='object'?'('+Object.entries(v).filter(([k])=>k!=='_struct').map(([k,x])=>k+'='+text(x)).join(',')+')':ueText(v);
const v=(x=0,y=0,z=0)=>({X:x,Y:y,Z:z}),rot=()=>({Pitch:0,Yaw:0,Roll:0}),F={PlatformFlags:14,MinQualityLevel:'EQuality_VeryLow'};
const pe=(id,slot)=>({EntryType:'Effect',FXResourceId:'P_EFX_FireWorks_'+id,SubTemplateName:'None',LocalTimeOffset:0,SlotIndex:slot,PositionOffset:v(),RotationOffset:rot(),RandomPositionRange:v(),RandomRotationRange:rot(),EffectScale:v(1,1,1),RandomScaleRatio:0,Filter:F});
const cfg={TotalDuration:6,EffectSubTemplates:[],EffectTemplates:[
 {TemplateName:'QA_RPC1_SLOT8',RequiredPointCount:1,Filter:F,Entries:[pe('Lime',8)]},
 {TemplateName:'QA_RPC9_SLOT8',RequiredPointCount:9,Filter:F,Entries:[pe('Crackle',8)]},
 {TemplateName:'QA_RPC2_SLOT0_8',RequiredPointCount:2,Filter:F,Entries:[pe('OrangeGlitter',0),pe('OrangeGlitter',8)]}],
 EffectScheduleGroups:[{GroupName:'P',Slots:[{StartTime:1,TemplateName:'QA_RPC1_SLOT8',Filter:F},{StartTime:1.5,TemplateName:'QA_RPC9_SLOT8',Filter:F},{StartTime:2,TemplateName:'QA_RPC2_SLOT0_8',Filter:F}]}]};
await request('/object/set',{path:INST,properties:{DefaultConfig:text(cfg)}},120000);
console.log('validate',JSON.stringify(await request('/object/call',{path:INST,function:'ValidateConfig',args:{}})));
await request('/object/set',{path:INST,properties:{DebugPlatform:'PC',DebugQualityLevel:'EQuality_High',DebugPreviewStartTime:0}});
try{await request('/object/call',{path:INST,function:'DebugPreviewShow',args:{}});await sleep(4000);}finally{await request('/object/call',{path:INST,function:'DebugStopShow',args:{}});}
console.log('done',new Date().toISOString());
