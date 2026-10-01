// 新大面片：先安排引擎能显示的时刻，再按页容量分段。旧计划保留在 planLegacy。
// 帧预算：默认按运动分配（motionSchedule40，先放进一张）；可选三档帧率（budget40）或全程 30 fps。都按整数 tick 持帧。
function clipSizeKeys40(keys, fullDuration, start, duration) {
  const at=t=>evalKeys(keys,clamp(t/fullDuration,0,1));
  return [[0,at(start)],...keys.filter(k=>k[0]*fullDuration>start+1e-9 && k[0]*fullDuration<start+duration-1e-9)
    .map(([u,v])=>[(u*fullDuration-start)/duration,v]),[1,at(start+duration)]];
}
function tickFrameKeys40(F) {
  // 少量正偏移抵消 Lifetime/关键点四位小数的舍入；最后一格保持到寿命结束。
  return F===1 ? [[0,.01],[1,.99]] : [[0,.01],[(F-1)/F,F-1+.01],[1,F-.01]];
}
// ---------------- 4.0 帧预算 ----------------
// 引擎 30 fps、帧号取整、不混合：每帧显示整数个 tick（1/2/3/4 → 30/15/10/7.5 fps），不用 1-2-1-2 这种不均匀节奏。
// 三段：开花段（运动最快）、燃烧段、淡出段；点灭期间按点灭频率提高帧率（防混叠）。
// 帧率是起点，不是定值：每个效果可以在「帧预算」里改，或者设贴图张数上限让它自动降档。
const FPS40_TIERS=[30,15,10,7.5];
function hold40(fps){ return clamp(Math.round(30/Math.max(1,+fps||30)),1,4); }
function fadeAt40(P,fm,burstEnd) {
  if(+P.fadeAt>0)return Math.max(burstEnd,+P.fadeAt);
  // 自动：花径基本到头（≥97%）且速度降到峰值的 35% 以下，认为进入淡出 / 下垂段
  const pr=fm.prof||[];let rmax=0,vmax=0;for(const q of pr){rmax=Math.max(rmax,q[2]);vmax=Math.max(vmax,q[1]);}
  for(const [t,v,r] of pr)if(t>burstEnd && r>=.97*rmax && v<=.35*vmax)return t;
  return Math.max(burstEnd,.6*P.duration);
}
function budget40(P,fm) {
  const burstEnd=Math.max(0,+P.burstSec||0), fadeAt=fadeAt40(P,fm,burstEnd);
  const strobeFrom=+P.strobeHz>0 ? (+P.strobeStart||0) : Infinity;
  // 点灭：频率要 ≤ 0.4 × 帧率，帧率不够就在点灭期间提高（最多 30 fps；再高的点灭在导出说明里报警）
  const strobeHold=+P.strobeHz>0 ? clamp(Math.floor(30*.4/ +P.strobeHz),1,4) : 4;
  return {burstEnd,fadeAt,strobeFrom,strobeHold,
    holds:[hold40(P.fpsBurst==null?30:P.fpsBurst),hold40(P.fpsActive==null?15:P.fpsActive),hold40(P.fpsFade==null?10:P.fpsFade)]};
}
function holdAt40(B,holds,t) {
  const h=t<B.burstEnd?holds[0]:t<B.fadeAt?holds[1]:holds[2];
  return t>=B.strobeFrom ? Math.min(h,B.strobeHold) : h;
}
function tickSchedule40(B,holds,first,end) {
  const ticks=[];for(let k=first;k<end;k+=holdAt40(B,holds,k/30))ticks.push(k-first);
  return ticks;
}
// 由每帧的起始 tick 求帧号曲线（分段线性，引擎取整后正好落在每帧上；关键点 = 持帧长度变化处）
function keysFromTicks40(ticks,N) {
  const F=ticks.length;if(F===1)return [[0,.01],[1,.99]];
  const hold=f=>(f+1<F?ticks[f+1]:N)-ticks[f], keys=[[0,.01]];
  for(let f=1;f<F-1;f++)if(hold(f)!==hold(f-1))keys.push([ticks[f]/N,f+.01]);
  keys.push([ticks[F-1]/N,F-1+.01]);keys.push([1,F-.01]);
  return keys.filter((k,i,a)=>i===0||k[0]>a[i-1][0]+1e-9);
}
// ---------------- 4.0.2 默认：按运动分配（先放进 pageTarget 张） ----------------
// 用户实测（2026-10-01）：4.56 s 的金芒菊放一张 4×4×RGBA（64 帧）在游戏里就很流畅。所以默认先把整段放进 1 张：
// 帧数够（总 tick ≤ 容量）就每个 tick 一帧；不够就按运动分配——星跑得快的地方（开花）每 tick 一帧，慢下来以后每帧多停几个 tick。
// 每帧停整数个 tick（引擎 30 fps 取整，不混合），最长 maxHold40 个 tick（默认 4 = 7.5 fps）；放不下才自动加一张。
// 运动量 = 星的速度（世界米 / 秒，屏幕上的移动和它成正比），平滑约 0.5 s，再加峰值的 8% 作底（冷却、变暗也算变化）。
// 节奏：每帧停的 tick 数一次最多比上一帧多 1（30 → 15 → 10 → 7.5 fps 逐级放慢，不会 30 突然跳到 7.5）。
function motionWeights40(fm,first,end){
  const pr=fm.prof||[];let vmax=0;for(const q of pr)vmax=Math.max(vmax,q[1]);
  const vAt=t=>{if(!pr.length)return 1;let i=pr.findIndex(q=>q[0]>=t);if(i<0)return pr[pr.length-1][1];if(i===0)return pr[0][1];
    const a=pr[i-1],b=pr[i],u=(t-a[0])/Math.max(1e-6,b[0]-a[0]);return a[1]+(b[1]-a[1])*u;};
  const raw=[];for(let k=first;k<end;k++)raw.push(vAt((k+.5)/30));
  const w=raw.map((_,i)=>{let s=0,n=0;for(let j=Math.max(0,i-8);j<=Math.min(raw.length-1,i+8);j++){s+=raw[j];n++;}return s/n;});
  return w.map(v=>Math.max(v,.08*vmax,1e-6));
}
function motionSchedule40(B,w,first,end,cap,maxHold){
  const N=end-first;
  const sched=D=>{const ticks=[];let k=0,prev=1;
    while(k<N){ticks.push(k);const t=(first+k)/30;
      let hm=t<B.burstEnd?1:Math.min(maxHold,prev+1);if(t>=B.strobeFrom)hm=Math.min(hm,B.strobeHold);
      let h=1,acc=w[k];while(h<hm&&k+h<N&&acc+w[k+h]<=D){acc+=w[k+h];h++;}
      k+=h;prev=h;}
    return ticks;};
  if(N<=cap)return {ticks:sched(0)};
  let lo=0,hi=w.reduce((a,c)=>a+c,0),best=sched(hi);
  if(best.length>cap)return {ticks:best,over:true};
  for(let i=0;i<40;i++){const mid=(lo+hi)/2,t=sched(mid);if(t.length<=cap){best=t;hi=mid;}else lo=mid;}
  return {ticks:best};
}
function plan40(P,fm,ta=0,tb=P.duration) {
  const cols=Math.max(1,Math.min(P.cols,Math.floor(P.texW/512))),rows=Math.max(1,Math.min(P.rows,Math.floor(P.texH/512)));
  const base=planLegacy({...P,cols,rows,frameMode:'uniform'},fm,0,P.duration);
  // 包络只允许放大；抬高关键点时不能引入局部缩小。
  let run=0;const envelope=base.sizeKeys.map(([u,v])=>[u,run=Math.max(run,v)]);
  const first=Math.ceil(ta*30-1e-8),end=Math.max(first+1,Math.ceil(tb*30-1e-8)),N=end-first,cap=base.L.F;
  const B=budget40(P,fm),mode=P.frameBudget||'motion';let holds=[...B.holds],ticks;
  let pagesUsed=0;
  if(mode==='motion'){
    // 先放进 pageTarget 张；每帧最多停 maxHold 个 tick 仍放不下，就一张一张往上加
    const w=motionWeights40(fm,first,end),maxHold=clamp(Math.round(+P.maxHold||4),1,8);
    let pages=Math.max(1,Math.round(+P.pageTarget||1)),r;
    for(;;pages++){r=motionSchedule40(B,w,first,end,cap*pages,maxHold);if(!r.over||pages>=12)break;}
    ticks=r.ticks;pagesUsed=pages;
  } else if(mode==='full'){ticks=[];for(let k=first;k<end;k++)ticks.push(k-first);}
  else ticks=tickSchedule40(B,holds,first,end);
  // 降档：先淡出、再燃烧、最后开花段；下限 7.5 / 10 / 15 fps
  const floorH=[2,3,4],order=[2,1,0];
  const coarsen=()=>{for(const i of order)if(holds[i]<floorH[i]){holds[i]++;return true;}return false;};
  const maxPages=Math.max(0,Math.round(+P.maxPages||0));
  if(mode==='tiers'&&maxPages)while(Math.ceil(ticks.length/cap)>maxPages&&coarsen())ticks=tickSchedule40(B,holds,first,end);
  // 末页只剩一点点（< 25% 容量）时，把淡出段降一档试试，能省掉一张贴图就用；燃烧段和开花段不为省贴图降档（要降就设张数上限）
  if(mode==='tiers'&&+P.fitPages!==0){
    const pages=Math.ceil(ticks.length/cap);
    if(pages>1 && ticks.length-cap*(pages-1)<.25*cap){
      const h2=[...holds];let t2=ticks;
      while(h2[2]<floorH[2] && Math.ceil(t2.length/cap)>=pages){h2[2]++;t2=tickSchedule40(B,h2,first,end);}
      if(Math.ceil(t2.length/cap)<pages){holds=h2;ticks=t2;}
    }
  }
  const F=ticks.length,t0=first/30,D=N/30,L={...base.L,F};
  const sizeKeys=clipSizeKeys40(envelope,P.duration,t0,D);
  const times=ticks.map(k=>k/30),dur=ticks.map((k,f)=>((f+1<F?ticks[f+1]:N)-k)/30);
  let area=0;for(let i=0;i<200;i++)area+=evalKeys(sizeKeys,(i+.5)/200)**2/200;
  let maxDisp=0;for(const [t,v] of fm.prof)if(t>=t0 && t<t0+D){
    const f=Math.min(F-1,Math.max(0,ticks.findLastIndex(k=>k/30<=t-t0)));
    maxDisp=Math.max(maxDisp,v*L.cellW/(base.Ww*evalKeys(sizeKeys,(t-t0)/D))*dur[f]);}
  const fpsOf=h=>30/h;
  // 燃烧段（开花到淡出前）最低帧率，给探针 / 统计用
  let minFps=30;for(let f=0;f<F;f++){const t=t0+times[f];if(t<B.fadeAt)minFps=Math.min(minFps,1/Math.max(dur[f],1/30));}
  return {...base,L,t0,duration:D,sizeKeys,times,dur,ticks,nTicks:N,keys:keysFromTicks40(ticks,N),area,
    frameTiming:'tick-start',frameFps:30,capacityFrames:cap,sequenceStart:t0,sequenceEnd:end/30,
    budget:{mode,burstEnd:B.burstEnd,fadeAt:B.fadeAt,strobeFrom:B.strobeFrom,fps:mode==='tiers'?holds.map(fpsOf):null,strobeFps:fpsOf(B.strobeHold),pages:Math.ceil(F/cap),holdMin:Math.min(...dur)*30,holdMax:Math.max(...dur)*30},
    fadeEnd:P.duration,avgFps:F/D,minFps,maxDisp};
}
function splitPlan40(pl) {
  if(pl.frameTiming!=='tick-start' || pl.pageIndex!=null)return [pl];
  const out=[],capacity=pl.capacityFrames,ticks=pl.ticks||pl.times.map((_,f)=>f),N=pl.nTicks||pl.L.F;
  for(let first=0;first<pl.L.F;first+=capacity){
    const F=Math.min(capacity,pl.L.F-first),k0=ticks[first],k1=first+F<pl.L.F?ticks[first+F]:N;
    const offset=k0/30,D=(k1-k0)/30,pt=ticks.slice(first,first+F).map(k=>k-k0);
    const sizeKeys=clipSizeKeys40(pl.sizeKeys,pl.duration,offset,D);
    let area=0;for(let i=0;i<200;i++)area+=evalKeys(sizeKeys,(i+.5)/200)**2/200;
    out.push({...pl,L:{...pl.L,F},t0:pl.t0+offset,duration:D,ticks:pt,nTicks:k1-k0,keys:keysFromTicks40(pt,k1-k0),sizeKeys,area,
      times:pt.map(k=>k/30),dur:pl.dur.slice(first,first+F),
      pageIndex:out.length,pageCount:Math.ceil(pl.L.F/capacity)});
  }
  return out;
}
function bakeParts(b) { const out=[];for(let s=b;s;s=s.next)out.push(s);return out; }
function bakeSegmentName(b,i) { return !b.next ? '' : i<26 ? String.fromCharCode(65+i) : 'S'+(i+1); }
