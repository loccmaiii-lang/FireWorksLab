// 归档副本：原在 analysis/local/MESH_WILLOW_READ_20261016/（本机），输出文件写在当前目录。只读。
import fs from 'node:fs';
const out=JSON.parse(fs.readFileSync('traj_600.json','utf8'));
const S=out.stars.map(q=>q.filter(x=>x[1]>0)).filter(q=>q.length>1).map(q=>[[0,1,0,0,0,1],...q]);
const ppm=360/700*1000/800;
function segs(q,epsF){ let i=0,c=0; while(i<q.length-1){ let j=i+2,ok=i+1; for(;j<q.length;j++){ let bad=false; const a=q[i],b=q[j]; for(let k=i+1;k<j;k++){ const u=(q[k][0]-a[0])/(b[0]-a[0]); const e=Math.hypot(q[k][2]-(a[2]+(b[2]-a[2])*u),q[k][3]-(a[3]+(b[3]-a[3])*u),q[k][4]-(a[4]+(b[4]-a[4])*u)); if(e>epsF(q[k][0])){bad=true;break} } if(bad) break; ok=j } c++; i=ok } return c }
const mean=x=>x.reduce((s,v)=>s+v,0)/x.length;
for(const px of [0.5,1]){ const e=px/ppm;
  for(const [name,f] of [['全程同一误差',t=>e],['开花 0.6 s 内放宽 4 倍（过曝白球期）',t=>t<0.6?4*e:e],['开花 1 s 内放宽 4 倍',t=>t<1?4*e:e]]){
    const K=mean(S.map(q=>segs(q,f))); console.log(px,'px',name,'平均段数',K.toFixed(1),'→ 单片 每束',(2*K).toFixed(0),'三角 /',(2*K+2).toFixed(0),'顶点；400/300/200 束 三角',[400,300,200].map(n=>Math.round(n*2*K)).join(' / '));
  }}
