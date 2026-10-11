import fs from 'node:fs';import {request,INST} from './ue.mjs';
import {ueText} from '../../../tool/workbench/src/delivery-model.mjs';import {same} from '../../../tool/workbench/src/engine.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const backup=JSON.parse(fs.readFileSync('instance-before.json','utf8')).properties;
const m=JSON.parse(fs.readFileSync('三表-R03-单表嵌套-测试.json','utf8'));
const get=async()=>(await request('/object/get',{path:INST,properties:['bShowActive','DefaultConfig']})).properties;
const mode=process.argv[2];
if(mode==='install'){
 const cur=await get();if(!same(cur.DefaultConfig,backup.DefaultConfig))throw Error('当前配置与备份不同');
 const text=v=>Array.isArray(v)?(v.length?'('+v.map(text).join(',')+')':''):v&&typeof v==='object'?'('+Object.entries(v).filter(([k])=>k!=='_struct').map(([k,x])=>k+'='+text(x)).join(',')+')':ueText(v);
 await request('/object/set',{path:INST,properties:{DefaultConfig:text({EffectSubTemplates:m.EffectSubTemplates,EffectTemplates:m.EffectTemplates,EffectScheduleGroups:m.EffectScheduleGroups})}},180000);
 const a=(await get()).DefaultConfig;
 const ok=same(a.EffectSubTemplates,m.EffectSubTemplates)&&same(a.EffectTemplates.map(t=>({...t,_struct:undefined})),m.EffectTemplates)&&same(a.EffectScheduleGroups,m.EffectScheduleGroups);
 const others=Object.keys(backup.DefaultConfig).filter(k=>!k.startsWith('Effect')&&!same(a[k],backup.DefaultConfig[k]));
 console.log(JSON.stringify({effectArraysMatch:ok,tpls:a.EffectTemplates.length,otherFieldsChanged:others}));
}else if(mode==='run'){
 const [,,,label,platform,quality,start='113',dur='6']=process.argv;
 await request('/object/set',{path:INST,properties:{DebugPlatform:platform,DebugQualityLevel:quality,DebugPreviewStartTime:Number(start)}});
 const out={label,platform,quality,start:Number(start),t0:new Date().toISOString()};
 try{out.call=await request('/object/call',{path:INST,function:'DebugPreviewShow',args:{}});await sleep(Number(dur)*1000);}
 finally{out.stop=await request('/object/call',{path:INST,function:'DebugStopShow',args:{}});out.t1=new Date().toISOString();fs.writeFileSync(`merged-${label}.json`,JSON.stringify(out,null,1));console.log(label,'ok');}
}
