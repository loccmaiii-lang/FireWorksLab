// 把 Night 导演 DefaultConfig 写回 night-now.json 原值；SoftObjectPath 按 UE 文本格式写成路径字符串（ueText 会把它写成结构体，UE 读成 None）。
import fs from 'node:fs';import {request} from '../MOBILE_TEST_20261011/ue.mjs';import {same} from '../../../tool/workbench/src/engine.mjs';
const INST='/Game/Maps/Dam_Iris_Long3/DynamicRequest/Event/MA5_FireworkOnDam/MA5_FireworkOnDam_Night.MA5_FireworkOnDam_Night:PersistentLevel.BP_NewYearFireworks_ShowDirector_Night_2';
const num=v=>String(Math.round(v*1e6)/1e6);
const t=v=>{if(Array.isArray(v))return v.length?'('+v.map(t).join(',')+')':'';
 if(v&&typeof v==='object'){if(v._struct==='SoftObjectPath')return '"'+(v.AssetPathName==='None'?'':v.AssetPathName)+(v.SubPathString?':'+v.SubPathString:'')+'"';
  return '('+Object.entries(v).filter(([k])=>k!=='_struct').map(([k,x])=>k+'='+t(x)).join(',')+')'}
 if(typeof v==='number')return num(v);if(typeof v==='boolean')return v?'True':'False';if(v===null)return 'None';return '"'+String(v).replaceAll('\\','\\\\').replaceAll('"','\\"')+'"'};
const snap=JSON.parse(fs.readFileSync('night-now.json','utf8')).DefaultConfig;
await request('/object/set',{path:INST,properties:{DefaultConfig:t(snap)}},180000);
const now=(await request('/object/get',{path:INST,properties:['DefaultConfig','bShowActive']},180000)).properties;
console.log('same',same(now.DefaultConfig,snap),'seq',JSON.stringify(now.DefaultConfig.SequenceTemplates[0].Entries[0].LevelSequencePath),'active',now.bShowActive);
