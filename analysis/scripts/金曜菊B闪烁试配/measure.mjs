// 使用原模拟核计算主星几何；不启动浏览器，不修改原配方。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const out=path.join(root,'analysis/results/GLITTER_TWINKLE_20261017');
fs.mkdirSync(out,{recursive:true});
const source=JSON.parse(fs.readFileSync(path.join(root,'analysis/我的配方/my_fxmv7lp8ci/金曜菊-B__fxmv7lp8ci.json'),'utf8'));
const ctx=vm.createContext({console,window:{},performance,structuredClone,TextEncoder,setTimeout,REFS:{}});
for(const n of ['00_util','05_quality','10_types','12_tempo','19_spark_late','20_sim','30_plan','31_plan40'])
  vm.runInContext(fs.readFileSync(path.join(root,'tool/src/js',n+'.js'),'utf8'),ctx,{filename:n});
ctx.src=source;
const rows=vm.runInContext(`src.snap.layers.map(l=>{
 const P={...defaultsFor(l.type,40).P,...l.P,type:l.type},gp={...P,headBright:Math.max(1,P.headBright)},fm=measure(gp),mt=metricsOf(gp,fm),s=new Sim(P),samples=[];
 const rate=l.L.rate||1;
 for(const t of [.3,.6,1,1.5,2,2.5,3,4]){
  while(s.t+H_STEP<=t*rate+1e-9)s.step(H_STEP);
  const live=s.all.filter(a=>s.t>=a.birth&&s.t<=a.birth+(a.vis??a.burn));
  samples.push({seconds:t,sourceSeconds:s.t,parents:live.length,medianSpeed:live.map(a=>Math.hypot(a.vx,a.vy,a.vz)).sort((a,b)=>a-b)[Math.floor(live.length/2)]||0,
   maxRadius:Math.max(0,...s.all.map(a=>Math.hypot(a.x,a.y))),activeBirthRate:live.reduce((n,a)=>n+(a.rate>0?sparkPerMOf(P,a)*Math.hypot(a.vx,a.vy,a.vz)*sparkRampAt(P,a.id,a.age-a.ign):0),0)});
 }
 return {title:l.L.title,rate,diameter:mt.diameter,burn:mt.burn,frame:plan(P,fm),samples};
})`,ctx);
// 帧计划只保留供审查的时间/格子；完整几何不重复落盘。
for(const r of rows){const p=r.frame;r.frame={duration:p.duration,D:p.D,first:p.first,end:p.end,L:p.L,times:p.times,ticks:p.ticks};}
fs.writeFileSync(path.join(out,'原版几何.json'),JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows.map(r=>({title:r.title,diameter:r.diameter,burn:r.burn,samples:r.samples,frame:r.frame.L})),null,2));
