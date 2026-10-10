import {cueBounds} from './editing-model.mjs';
export function playRequest(doc,cueId,scope,time,restart=false){
 if(scope==='selection'&&!doc.cues.some(c=>c.id===cueId))throw Error('请先选择一个编排片段');
 const bounds=scope==='selection'?cueBounds(doc,cueId):{start:0,end:doc.meta.duration};
 const start=Math.max(0,bounds.start),end=Math.min(doc.meta.duration,bounds.end);
 return {start,end,time:restart||time<start||time>=end?start:time};
}
export function isMusicTime(showTime,offset,duration){return duration>0&&showTime>=offset&&showTime<offset+duration;}
