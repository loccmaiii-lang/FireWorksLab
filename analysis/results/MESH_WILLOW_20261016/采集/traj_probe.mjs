// 只读测算：用烘焙器模拟核（tool/src/js/20_sim.js，不开浏览器、不烘）跑「鸿巢四尺玉 · 我的 · 大小与造型 · 我的」主层，
// 记录每颗星的星头轨迹，估：花径 / 下垂、每束需要几段（按时间线性插值的误差 = UV 流动时星头的位置误差）。
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { performance } from 'node:perf_hooks';
const root='F:/FireWorksLab';
const ctx=vm.createContext({console,setTimeout,window:{},REFS:{},performance,TextEncoder,structuredClone});
for(const n of ['00_util','05_quality','10_types','20_sim']) vm.runInContext(fs.readFileSync(path.join(root,'tool/src/js',n+'.js'),'utf8'),ctx,{filename:n});
const rec=JSON.parse(fs.readFileSync(path.join(root,'analysis/我的配方/my_fxmuxsrd36/鸿巢四尺玉_·_我的_·_大小与造型_·_我的__fxmuxsrd36.json'),'utf8'));
const P0=rec.snap.layers[0].P;
ctx.__P=P0;
const out=vm.runInContext(`(()=>{
 const P={...__P,engine:'gpu'}; const s=new Sim(P); const h=1/240, n=Math.ceil(P.duration/h), rec=new Map();
 for(let i=0;i<n;i++){ s.step(h); if((i+1)%4) continue;
   for(const st of s.stars){ if(st.kind===5) continue; const I=st.alive?s.headI(st):0; let q=rec.get(st); if(!q) rec.set(st,q=[]); q.push([+s.t.toFixed(5),I,st.x,st.z,st.y,st.alive?1:0]); } }
 return {stars:[...rec.values()], n:s.stars.length, burn:P.burn, dur:P.duration};
})()`,ctx);
fs.writeFileSync('traj_600.json',JSON.stringify(out));
const S=out.stars.map(q=>q.filter(x=>x[1]>0));   // 只留星头在发光的那段
console.log('stars',out.n,'burn',out.burn,'dur',out.dur,'lit tracks',S.filter(q=>q.length>1).length);
// 外廓（模拟 y 朝上 → 这里第 4 列是高度）
for(const T of [1,2.4,3.3,5.3,7,8]){ const pts=S.map(q=>q.find(x=>Math.abs(x[0]-T)<0.009)).filter(Boolean); if(!pts.length) continue;
  const up=Math.max(...pts.map(p=>p[4])), dn=Math.min(...pts.map(p=>p[4])), side=Math.max(...pts.map(p=>Math.hypot(p[2],p[3])));
  console.log(`t=${T}s 上 ${up.toFixed(0)} 下 ${(-dn).toFixed(0)} 侧 ${side.toFixed(0)} m  在亮 ${pts.length}`); }
const life=S.map(q=>q.length?q[q.length-1][0]:0).sort((a,b)=>a-b); console.log('星头熄灭 p5/p50/p95', life[Math.floor(.05*life.length)], life[Math.floor(.5*life.length)], life[Math.floor(.95*life.length)]);
// 每束段数：分段内按时间线性插值（UV 线性 = 星头匀速走过这一段），最大位置误差 ≤ eps
function segs(q,eps){ let i=0,c=0; while(i<q.length-1){ let j=i+2,ok=i+1; for(;j<q.length;j++){ let bad=false; const a=q[i],b=q[j]; for(let k=i+1;k<j;k++){ const u=(q[k][0]-a[0])/(b[0]-a[0]); const e=Math.hypot(q[k][2]-(a[2]+(b[2]-a[2])*u),q[k][3]-(a[3]+(b[3]-a[3])*u),q[k][4]-(a[4]+(b[4]-a[4])*u)); if(e>eps){bad=true;break} } if(bad) break; ok=j } c++; i=ok } return c }
// 只按形状（不管时间）的段数，对照
function segsGeom(q,eps){ let i=0,c=0; const d=(p,a,b)=>{const ab=[b[2]-a[2],b[3]-a[3],b[4]-a[4]],ap=[p[2]-a[2],p[3]-a[3],p[4]-a[4]];const L=ab[0]**2+ab[1]**2+ab[2]**2||1e-9;const u=Math.max(0,Math.min(1,(ap[0]*ab[0]+ap[1]*ab[1]+ap[2]*ab[2])/L));return Math.hypot(ap[0]-ab[0]*u,ap[1]-ab[1]*u,ap[2]-ab[2]*u)};
 while(i<q.length-1){ let j=i+2,ok=i+1; for(;j<q.length;j++){ let bad=false; for(let k=i+1;k<j;k++) if(d(q[k],q[i],q[j])>eps){bad=true;break} if(bad) break; ok=j } c++; i=ok } return c }
const tracks=S.filter(q=>q.length>1).map(q=>[[0,1,0,0,0,1],...q]);   // 从开花点起
const pxPerM800=360/700*1000/800;   // 标准 2.1：1000 m 时四尺玉约 360 px / 700 m；800 m 最近观察距离
const res={};
for(const px of [0.25,0.5,1.0]){ const eps=px/pxPerM800; const a=tracks.map(q=>segs(q,eps)), g=tracks.map(q=>segsGeom(q,eps));
  const mean=x=>x.reduce((s,v)=>s+v,0)/x.length, qq=(x,f)=>x.slice().sort((p,r)=>p-r)[Math.floor(f*x.length)];
  res[px]={eps_m:+eps.toFixed(2),time_mean:+mean(a).toFixed(1),time_p95:qq(a,.95),geom_mean:+mean(g).toFixed(1)};
  console.log(`误差 ${px} px @800 m（${eps.toFixed(2)} m）：按时间 平均 ${mean(a).toFixed(1)} 段 / p95 ${qq(a,.95)}；只按形状 平均 ${mean(g).toFixed(1)} 段`); }
fs.writeFileSync('traj_probe_result.json',JSON.stringify(res,null,1));
