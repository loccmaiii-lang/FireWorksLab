// 用户 10-11 22:15「第5秒」：导演音乐事件 Ma5_Fireworks_Music_Start 的 LocalTimeOffset 8 → 5（实例 _7 + 蓝图 CDO _2），只动音频模板，读回核对
import fs from 'node:fs';import {request,INST} from './ue.mjs';import {ueText} from '../../../tool/workbench/src/delivery-model.mjs';import {same} from '../../../tool/workbench/src/engine.mjs';
const CDO='/Game/BluePrints/ShowDirector/Instance/Ma5_NewYearFireworks/BP_Failed_NewYearFireworks_ShowDirector_2.Default__BP_Failed_NewYearFireworks_ShowDirector_2_C';
const out={time:new Date().toISOString()};
for(const [n,p,f] of [['instance_7',INST,'baseline-B01-instance.json'],['CDO_2',CDO,'baseline-B01-cdo.json']]){
 const base=JSON.parse(fs.readFileSync(f,'utf8')).DefaultConfig;
 const cur=(await request('/object/get',{path:p,properties:['DefaultConfig','bShowActive']},120000)).properties;
 if(cur.bShowActive)throw Error(n+' 正在播放');if(!same(cur.DefaultConfig,base))throw Error(n+' 配置和刚才读的不同，停止');
 const audio=structuredClone(base.AudioTemplates);let hit=0;
 for(const t of audio)for(const e of t.Entries)if(/Ma5_Fireworks_Music_Start/.test(String(e.AudioEvent))&&e.LocalTimeOffset===8){e.LocalTimeOffset=5;hit++}
 if(hit!==1)throw Error(n+' 音乐条目不是唯一一条 8 秒');
 await request('/object/set',{path:p,properties:{DefaultConfig:ueText({AudioTemplates:audio})}},120000);
 const after=(await request('/object/get',{path:p,properties:['DefaultConfig']},120000)).properties.DefaultConfig;
 const expect={...base,AudioTemplates:audio};
 out[n]={ok:same(after,expect),changedKeys:Object.keys(base).filter(k=>!same(after[k],base[k])),audio:after.AudioTemplates.map(t=>t.Entries.map(e=>[String(e.AudioEvent).split('.').pop(),e.LocalTimeOffset]))};
}
fs.writeFileSync('music5-result.json',JSON.stringify(out,null,1));console.log(JSON.stringify(out));
