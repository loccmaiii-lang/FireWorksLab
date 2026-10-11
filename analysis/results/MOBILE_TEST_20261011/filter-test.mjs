// 过滤位序 / 画质比较 / 条目 PositionOffset 测试：只改关卡导演实例 _7 的内存配置，不保存；restore 按备份写回并核对
import fs from 'node:fs';import {request,INST} from './ue.mjs';
import {ueText} from '../../../tool/workbench/src/delivery-model.mjs';
import {same} from '../../../tool/workbench/src/engine.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const backup=JSON.parse(fs.readFileSync('instance-before.json','utf8')).properties;
const R=id=>'P_EFX_FireWorks_'+id;
const v=(x=0,y=0,z=0)=>({X:x,Y:y,Z:z}),rot=()=>({Pitch:0,Yaw:0,Roll:0});
const F=(p=14,q='EQuality_VeryLow')=>({PlatformFlags:p,MinQualityLevel:q});
const pe=(id,slot,filter,t=0,pos=v())=>({EntryType:'Effect',FXResourceId:R(id),SubTemplateName:'None',LocalTimeOffset:t,SlotIndex:slot,PositionOffset:pos,RotationOffset:rot(),RandomPositionRange:v(),RandomRotationRange:rot(),EffectScale:v(1,1,1),RandomScaleRatio:0,Filter:filter});
const se=(id,roll,filter)=>({FXResourceId:R(id),LocalTimeOffset:0,PositionOffset:v(),RotationOffset:{Pitch:0,Yaw:0,Roll:roll},RandomPositionRange:v(),RandomRotationRange:rot(),EffectScale:v(1,1,1),RandomScaleRatio:0,Filter:filter});
export const CASES={
 Lime:'PlatformFlags=2',Crackle:'PlatformFlags=4',OrangeGlitter:'PlatformFlags=8',Strobe:'PlatformFlags=1',
 GoldSpark:'Min=Medium',SilverChry:'Min=High',GreenPeony:'Min=VeryHigh',GoldCoreLime:'Min=Low',MultiLayerChry:'对照 14/VeryLow',
 FanComet_01:'子模板3束：VeryLow/Medium/High',GoldCrackle:'位置对照',GoldRayChry:'条目 Z+3000cm',PrismWheels:'条目 Y+5000cm'};
function testConfig(){
 const c=structuredClone(backup.DefaultConfig);
 c.TotalDuration=8;c.AudioScheduleGroups=[];
 c.EffectSubTemplates=[{TemplateName:'QA_FAN3',Entries:[se('FanComet_01',-20,F(14,'EQuality_VeryLow')),se('FanComet_01',0,F(14,'EQuality_Medium')),se('FanComet_01',20,F(14,'EQuality_High'))]}];
 c.EffectTemplates=[
  {TemplateName:'QA_FILTER_P',RequiredPointCount:9,Filter:F(),Entries:[pe('Lime',0,F(2)),pe('Crackle',1,F(4)),pe('OrangeGlitter',2,F(8)),pe('Strobe',3,F(1)),pe('GoldSpark',4,F(14,'EQuality_Medium')),pe('SilverChry',5,F(14,'EQuality_High')),pe('GreenPeony',6,F(14,'EQuality_VeryHigh')),pe('GoldCoreLime',7,F(14,'EQuality_Low')),pe('MultiLayerChry',8,F())]},
  {TemplateName:'QA_POS_P',RequiredPointCount:9,Filter:F(),Entries:[pe('GoldCrackle',4,F()),pe('GoldRayChry',4,F(),0,v(0,0,3000)),pe('PrismWheels',4,F(),0,v(0,5000,0))]},
  {TemplateName:'QA_FAN_B',RequiredPointCount:8,Filter:F(),Entries:[{...pe('FanComet_01',3,F()),EntryType:'SubTemplate',FXResourceId:'None',SubTemplateName:'QA_FAN3'}]}];
 c.EffectScheduleGroups=[{GroupName:'P',Slots:[{StartTime:1,TemplateName:'QA_FILTER_P',Filter:F()},{StartTime:3,TemplateName:'QA_POS_P',Filter:F()}]},{GroupName:'B',Slots:[{StartTime:2,TemplateName:'QA_FAN_B',Filter:F()}]}];
 return c;
}
const get=async()=> (await request('/object/get',{path:INST,properties:['bShowActive','DefaultConfig','DebugPlatform','DebugQualityLevel','DebugPreviewStartTime']})).properties;
const mode=process.argv[2];
if(mode==='install'){
 const cur=await get();if(cur.bShowActive)throw Error('正在播放');if(!same(cur.DefaultConfig,backup.DefaultConfig))throw Error('当前配置与备份不同，不覆盖');
 const tc=testConfig();await request('/object/set',{path:INST,properties:{DefaultConfig:ueText(tc)}},120000);
 const after=await get();const ok=same(after.DefaultConfig,{...after.DefaultConfig,...tc});
 console.log(JSON.stringify({installed:ok,tpls:after.DefaultConfig.EffectTemplates.map(t=>t.TemplateName),dur:after.DefaultConfig.TotalDuration}));
 fs.writeFileSync('test-config-readback.json',JSON.stringify(after.DefaultConfig,null,1));
}else if(mode==='run'){
 const [,,,label,platform,quality]=process.argv;
 const cur=await get();if(!cur.DefaultConfig.EffectTemplates.some(t=>t.TemplateName==='QA_FILTER_P'))throw Error('未安装测试配置');
 await request('/object/set',{path:INST,properties:{DebugPlatform:platform,DebugQualityLevel:quality,DebugPreviewStartTime:0}});
 const out={label,platform,quality,startedAt:new Date().toISOString()};
 try{ out.call=await request('/object/call',{path:INST,function:'DebugPreviewShow',args:{}});
  await sleep(4500);
  const r=await request('/object/search',{class:'ParticleSystemComponent',limit:5000},60000);
  const fx=r.objects.filter(o=>o.class==='FXResourceContainerComponent');const pos=[];
  for(const o of fx){try{const g=(await request('/object/get',{path:o.path,properties:['ResourceFX','OldPosition','RelativeLocation']})).properties;const id=g.ResourceFX?.ResourceId;if(['P_EFX_FireWorks_GoldCrackle','P_EFX_FireWorks_GoldRayChry','P_EFX_FireWorks_PrismWheels'].includes(id))pos.push({id,old:g.OldPosition,rel:g.RelativeLocation,path:o.path})}catch{}}
  out.positions=pos; await sleep(2500);
 }finally{
  out.stop=await request('/object/call',{path:INST,function:'DebugStopShow',args:{}});out.stoppedAt=new Date().toISOString();
  fs.writeFileSync(`filter-${label}.json`,JSON.stringify(out,null,1));console.log(label,'done',out.positions?.length);
 }
}else if(mode==='restore'){
 const cur=await get();if(cur.bShowActive)await request('/object/call',{path:INST,function:'DebugStopShow',args:{}});
 await request('/object/set',{path:INST,properties:{DefaultConfig:ueText(backup.DefaultConfig),DebugPlatform:backup.DebugPlatform,DebugQualityLevel:backup.DebugQualityLevel,DebugPreviewStartTime:backup.DebugPreviewStartTime}},180000);
 const after=await get();const res={configRestored:same(after.DefaultConfig,backup.DefaultConfig),debug:[after.DebugPlatform,after.DebugQualityLevel,after.DebugPreviewStartTime],active:after.bShowActive,subs:after.DefaultConfig.EffectSubTemplates.length,tpls:after.DefaultConfig.EffectTemplates.length,slots:after.DefaultConfig.EffectScheduleGroups.reduce((n,g)=>n+g.Slots.length,0),dur:after.DefaultConfig.TotalDuration};
 fs.writeFileSync('restore-result.json',JSON.stringify(res,null,1));console.log(JSON.stringify(res));if(!res.configRestored)throw Error('恢复不一致');
}
