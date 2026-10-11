// GPU 分级压测（22 排队 ⑦）：同一秒内放 N 束银扇（FanSilver_01，每束 3 个 GPU 发射器），数 UE 日志里的
// 「Failed to allocate tiles」截断告警和被截断的粒子比例。也测大尾缀一排、金曜菊一排。
// 只改导演实例 _7 内存；每轮装配置 → 从 0 预览 6 s → 停 → 读日志；全部结束恢复 instance-before.json。
import fs from 'node:fs';import {request,INST} from './ue.mjs';import {ueText} from '../../../tool/workbench/src/delivery-model.mjs';import {same} from '../../../tool/workbench/src/engine.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LOG='E:/loc_ma5/DFMEditor/DFM/Saved/Logs/DeltaForce.log';
const backup=JSON.parse(fs.readFileSync('instance-before.json','utf8')).properties;const base=backup.DefaultConfig;
const sub=n=>base.EffectSubTemplates.find(s=>s.TemplateName===n);
const v=(x=0,y=0,z=0)=>({X:x,Y:y,Z:z}),rot=()=>({Pitch:0,Yaw:0,Roll:0}),F={PlatformFlags:14,MinQualityLevel:'EQuality_VeryLow'};
const call=(s,slot,t)=>({EntryType:'SubTemplate',FXResourceId:'None',SubTemplateName:s,LocalTimeOffset:t,SlotIndex:slot,PositionOffset:v(),RotationOffset:rot(),RandomPositionRange:v(),RandomRotationRange:rot(),EffectScale:v(1,1,1),RandomScaleRatio:0,Filter:F});
// 场景：名字 → {组, 子模板, 调用列表[(槽, 局部时间)]}
const fanCalls=(n)=>Array.from({length:n},(_,i)=>[i%8,Math.floor(i/8)*0.1+(i%8)*0.0]);
const CASES=[
 ['银扇13束×2把=26束','B','FanSilver13',fanCalls(2)],['银扇×3把=39束','B','FanSilver13',fanCalls(3)],['银扇×4把=52束','B','FanSilver13',fanCalls(4)],
 ['银扇×5把=65束','B','FanSilver13',fanCalls(5)],['银扇×6把=78束','B','FanSilver13',fanCalls(6)],['银扇×7把=91束','B','FanSilver13',fanCalls(7)],['银扇×8把=104束','B','FanSilver13',fanCalls(8)],
 ['大号花9点（银彩菊+大尾缀）','P','SilverStrobeChry',Array.from({length:9},(_,i)=>[i,0])],
 ['中号花9点（金曜菊+中尾缀）','P','GoldChry',Array.from({length:9},(_,i)=>[i,0])],
 ['小号花9点（小青柠+小尾缀）','P','Lime',Array.from({length:9},(_,i)=>[i,0])]];
const only=process.argv[2]?process.argv[2].split(','):null;
const cur=(await request('/object/get',{path:INST,properties:['DefaultConfig','bShowActive']},120000)).properties;
if(cur.bShowActive)throw Error('导演在播放');if(!same(cur.DefaultConfig,base))throw Error('导演配置和基线不同，停止');
const results=[];
try{for(const [name,group,s,calls] of CASES){if(only&&!only.some(o=>name.includes(o)))continue;
 const cfg={TotalDuration:20,EffectSubTemplates:[sub(s)],EffectTemplates:[{TemplateName:'QA_GPU',RequiredPointCount:group==='P'?9:8,Filter:F,Entries:calls.map(([sl,t])=>call(s,sl,t))}],EffectScheduleGroups:[{GroupName:group,Slots:[{StartTime:0.5,TemplateName:'QA_GPU',Filter:F}]}]};
 await request('/object/set',{path:INST,properties:{DefaultConfig:ueText(cfg)}},120000);
 await request('/object/set',{path:INST,properties:{DebugPlatform:'PC',DebugQualityLevel:'EQuality_High',DebugPreviewStartTime:0}});
 const size0=fs.statSync(LOG).size;
 try{await request('/object/call',{path:INST,function:'DebugPreviewShow',args:{}});await sleep(group==='P'?11000:6000);}finally{await request('/object/call',{path:INST,function:'DebugStopShow',args:{}});}
 await sleep(800);
 const fd=fs.openSync(LOG,'r'),len=fs.statSync(LOG).size-size0,buf=Buffer.alloc(len);fs.readSync(fd,buf,0,len,size0);fs.closeSync(fd);const text=buf.toString('utf8');
 const tr={};let warn=0;for(const m of text.matchAll(/Failed to allocate tiles for (\S+)! (\d+) new particles truncated to (\d+)/g)){warn++;const k=m[1];tr[k]=tr[k]||[0,0];tr[k][0]+=+m[2];tr[k][1]+=+m[3];}
 const act=[...text.matchAll(/ActivationChange resource id: (\S+), HandleIndex: \d+, bActived: 1/g)].length;
 const beams=calls.length*sub(s).Entries.length;
 const r={name,group,calls:calls.length,entries:beams,activations:act,truncWarnings:warn,truncated:Object.fromEntries(Object.entries(tr).map(([k,[a,b]])=>[k,{requested:a,kept:b,keptPct:Math.round(b/a*100)}]))};
 results.push(r);console.log(JSON.stringify(r));fs.writeFileSync('gpu-stress.json',JSON.stringify(results,null,1));await sleep(1500);
}}finally{
 await request('/object/set',{path:INST,properties:{DefaultConfig:ueText(base),DebugPlatform:backup.DebugPlatform,DebugQualityLevel:backup.DebugQualityLevel,DebugPreviewStartTime:backup.DebugPreviewStartTime}},180000);
 const after=(await request('/object/get',{path:INST,properties:['DefaultConfig']},120000)).properties.DefaultConfig;console.log('restored',same(after,base));
}
