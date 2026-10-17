// 原模拟核逐物理步核对；数量为速率积分及对数正态寿命的期望，不冒充可见点实测。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const out=path.join(root,'analysis/results/GLITTER_TWINKLE_20261017');
const manifest=JSON.parse(fs.readFileSync(path.join(out,'配方清单.json'),'utf8'));
const source=JSON.parse(fs.readFileSync(path.join(root,manifest.source),'utf8'));
const variants=manifest.variants.map(v=>({...v,doc:JSON.parse(fs.readFileSync(path.join(root,v.myRecipe),'utf8'))}));
const ctx=vm.createContext({console,window:{},performance,structuredClone,TextEncoder,setTimeout,REFS:{}});
for(const n of ['00_util','05_quality','10_types','12_tempo','19_spark_late','20_sim','30_plan','31_plan40','49_playback'])
 vm.runInContext(fs.readFileSync(path.join(root,'tool/src/js',n+'.js'),'utf8'),ctx,{filename:n});
ctx.source=source;ctx.variants=variants;
const check=vm.runInContext(`(()=>{
 const fields=['id','x','y','z','vx','vy','vz','age','birth','burn','ign','vis'];let values=0,maxError=0;
 const rows=[];
 for(const v of variants)for(let i=0;i<source.snap.layers.length;i++){
  const a=source.snap.layers[i],b=v.doc.snap.layers[i],A=new Sim({...defaultsFor(a.type,40).P,...a.P}),B=new Sim({...defaultsFor(b.type,40).P,...b.P});
  let n=0;
  for(let k=0;k<=Math.ceil(a.P.duration/H_STEP);k++){
   if(A.all.length!==B.all.length)throw Error('主星数量改变');
   for(let j=0;j<A.all.length;j++)for(const f of fields){const x=A.all[j][f],y=B.all[j][f];if(x!==y){const d=Math.abs(x-y);maxError=Math.max(maxError,d);throw Error(v.id+' '+i+' '+f+' '+k+': '+x+' != '+y);}values++;n++;}
   A.step(H_STEP);B.step(H_STEP);
  }
  rows.push({variant:v.id,layer:i+1,comparisons:n,pass:true});
 }
 return{physicsStep:H_STEP,values,maxError,rows,pass:maxError===0};
})()`,ctx);
assert.equal(check.pass,true);
fs.writeFileSync(path.join(out,'主星逐步一致.json'),JSON.stringify(check,null,2));
const keys=['ORIGINAL',...variants.map(v=>v.id)];
const geometry=JSON.parse(fs.readFileSync(path.join(out,'原版几何.json'),'utf8'));
const nativeDiameter=Math.max(...geometry.map(x=>x.diameter)),scale=Number((32/nativeDiameter).toFixed(4));
const slant=Math.hypot(100,26-1.7);
// 以相同母星运动积分出生率。出生后寿命为lifeN*exp(sigma*Z)，与40_gl.js一致。
ctx.samples=[.45,.8,1.2,1.7,2.2,2.8,3.4];
const counts=vm.runInContext(`(()=>{
 const erf=x=>{const s=x<0?-1:1,a=Math.abs(x),p=1/(1+.3275911*a);return s*(1-(((((1.061405429*p-1.453152027)*p)+1.421413741)*p-.284496736)*p+.254829592)*p*Math.exp(-a*a));};
 const survival=(age,med,sg)=>age<=0?1:sg<=0?(age<med?1:0):.5*(1-erf(Math.log(age/med)/(sg*Math.SQRT2)));
 return [{id:'ORIGINAL',doc:source},...variants].map(v=>({id:v.id,layers:v.doc.snap.layers.slice(0,2).map(l=>{
  const P={...defaultsFor(l.type,40).P,...l.P},s=new Sim(P),events=[],rows=[];let next=0;
  const r=l.L.rate||1;
  for(let step=0;step<=Math.ceil(P.duration/H_STEP);step++){
   const t=s.t,dt=H_STEP;
   for(const st of s.all){
    const start=st.birth+(st.ign||0)+(P.sparkStart>0?P.sparkStart:0),end=Math.min(st.birth+(st.vis??st.burn),P.duration,P.sparkStop>0?st.birth+(st.ign||0)+P.sparkStop:1e9);
    if(!(st.rate>0&&t>=start&&t<end))continue;
    const q=sparkPerMOf(P,st)*Math.hypot(st.vx,st.vy,st.vz)*sparkRampAt(P,st.id,t-start)*dt;
    const phase=clamp((t-start)/Math.max(.05,end-start),0,1),med=P.sparkLife*(1+((P.sparkLifeEnd??1)-1)*phase);
    if(q>0)events.push([t,q,med]);
   }
   while(next<samples.length&&t>=samples[next]*r-1e-7){
    let alive=0;for(const [born,q,med]of events)alive+=q*survival(t-born,med,P.sparkLifeJit/100);
    rows.push({seconds:samples[next],expectedAlive:Math.round(alive)});next++;
   }
   s.step(dt);
  }
  return{perNativeMeter:P.sparkPerM,lifeMedianGame:P.sparkLife/r,lifeSigma:P.sparkLifeJit/100,birthsExpected:Math.round(events.reduce((n,e)=>n+e[1],0)),samples:rows};
 })}));
})()`,ctx);
const optics=[];
for(const distance of [80,100,120])for(const vfov of [45,60]){
 const d=Math.hypot(distance,26-1.7),ppm=1080/(2*d*Math.tan(vfov*Math.PI/360));
 optics.push({horizontalDistance:distance,slant:d,verticalFovAssumed:vfov,screenHeight:1080,diameterPixels:32*ppm,
  density:variants.map(v=>{const P=v.doc.snap.layers[1].P,a=P.twinkle,brightDuty=Math.acos(.7-.3/a)/Math.PI;return{id:v.id,perExportMeter:P.sparkPerM/scale,
   nominalSpacingPixels:ppm*scale/P.sparkPerM,brightThresholdOfPeak:.7,brightDuty,
   nominalBrightSpacingPixels:ppm*scale/(P.sparkPerM*brightDuty),sparkSizePixels:P.sparkSize*scale*ppm};})});
}
// 尺寸响应要在真实GPU上量，交给verify.mjs --standards，CPU不伪造该项。
fs.writeFileSync(path.join(out,'标准探针输入.json'),JSON.stringify(variants.flatMap(v=>v.doc.snap.layers.map((l,i)=>({id:v.id+'-L'+(i+1),P:l.P,M:l.M}))),null,2));
const report={nativeDiameter,exportFlowerDiameter:32,scale,slantAt100:slant,counts,optics,
 assumptions:['原存档24m；本轮已只读追到UE导入修订37c025c83c495be09511，确认32m花径，候选按32m导出','视角未测，用45/60度两种竖直FOV作敏感性范围，不称游戏实测',
 '存活数为原核轨迹×生成率积分×对数正态存活概率的期望，不是同时可见点数；未扣投影重叠、冷却、遮蔽、帧停留与阈值','亮点间距是局部投影到画面平面时的名义间距；有纵深或尾迹横散时分布不同']};
fs.writeFileSync(path.join(out,'计算结果.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({trajectoryValues:check.values,maxError:check.maxError,nativeDiameter,scale,slant,counts},null,2));
