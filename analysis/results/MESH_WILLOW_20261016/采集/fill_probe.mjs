// 归档副本：原在 analysis/local/MESH_WILLOW_READ_20261016/（本机），输出文件写在当前目录。只读。
// 测算：整条轨迹带一直被光栅化（透明部分也要算像素）→ 每帧屏幕上透明像素量；按时间窗切成几块网格能省多少
import fs from 'node:fs';
const out=JSON.parse(fs.readFileSync('traj_600.json','utf8'));
const S=out.stars.map(q=>q.filter(x=>x[1]>0)).filter(q=>q.length>1).map(q=>[[0,1,0,0,0,1],...q]);
const ppm=360/700;        // 1000 m、1080p：四尺玉 700 m ≈ 360 px（标准 2.1）
const W=6;                // 带宽 6 m ≈ 3 px（软边防锯齿）
const A=3.1;              // 尾迹最长寿命（白热 0.76 s + 余烬 2.35 s）
const seg=q=>{const L=[];for(let i=1;i<q.length;i++){const a=q[i-1],b=q[i];L.push({t:b[0],len:Math.hypot(b[2]-a[2],b[3]-a[3],b[4]-a[4])})}return L};
const SL=S.map(seg); const full=SL.map(L=>L.reduce((s,x)=>s+x.len,0));
console.log('每束轨迹长 平均',(full.reduce((a,b)=>a+b,0)/full.length).toFixed(0),'m');
for(const N of [200,300,400,600]){
  const k=N/600; let rows=[];
  for(const t of [0.5,1,2,3.3,5.3,7,8.3,10]){
    let vis=0,tot=0; for(const L of SL) for(const x of L){ tot+=x.len; if(x.t<=t && x.t>=t-A) vis+=x.len; }
    const px=tot*k*W*ppm*ppm, pv=vis*k*W*ppm*ppm; rows.push(`${t}s 全带 ${(px/1e3).toFixed(0)}k px / 可见 ${(pv/1e3).toFixed(0)}k`);
  }
  console.log(N,'束：',rows.join('；'));
}
// 时间窗切块：段按「可见时段 [经过时刻, 经过时刻 + A]」分到 3 块，每块只在自己的时段存在
const cuts=[[0,3.2],[2.6,6.2],[5.6,11.5]];
let save=[]; for(const t of [1,3.3,5.3,8.3]){ let one=0,three=0; for(const L of SL) for(const x of L){ one+=x.len; for(const [a,b] of cuts){ const inChunk=(x.t>=a&&x.t<b-A+0.6)||(x.t>=a&&x.t<b); if(inChunk && t>=a && t<=b){three+=x.len;break} } } save.push(`${t}s 一块 ${(one/1e3).toFixed(0)}k m → 三块 ${(three/1e3).toFixed(0)}k m`); }
console.log('切 3 块（粗估）：',save.join('；'));
