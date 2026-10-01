// 新大面片：先安排引擎能显示的时刻，再按页容量分段。旧计划保留在 planLegacy。
// 默认完整 30 Hz 姿态；12/8 是待 UE 确认的质量下限，不作为强制采样档。
function clipSizeKeys40(keys, fullDuration, start, duration) {
  const at=t=>evalKeys(keys,clamp(t/fullDuration,0,1));
  return [[0,at(start)],...keys.filter(k=>k[0]*fullDuration>start+1e-9 && k[0]*fullDuration<start+duration-1e-9)
    .map(([u,v])=>[(u*fullDuration-start)/duration,v]),[1,at(start+duration)]];
}
function tickFrameKeys40(F) {
  // 少量正偏移抵消 Lifetime/关键点四位小数的舍入；最后一格保持到寿命结束。
  return F===1 ? [[0,.01],[1,.99]] : [[0,.01],[(F-1)/F,F-1+.01],[1,F-.01]];
}
function plan40(P,fm,ta=0,tb=P.duration) {
  const cols=Math.max(1,Math.min(P.cols,Math.floor(P.texW/512))),rows=Math.max(1,Math.min(P.rows,Math.floor(P.texH/512)));
  const base=planLegacy({...P,cols,rows,frameMode:'uniform'},fm,0,P.duration);
  // 包络只允许放大；抬高关键点时不能引入局部缩小。
  let run=0;const envelope=base.sizeKeys.map(([u,v])=>[u,run=Math.max(run,v)]);
  const first=Math.ceil(ta*30-1e-8),end=Math.max(first+1,Math.ceil(tb*30-1e-8));
  const F=end-first,t0=first/30,D=F/30,L={...base.L,F};
  const sizeKeys=clipSizeKeys40(envelope,P.duration,t0,D),times=Array.from({length:F},(_,f)=>f/30),dur=times.map(()=>1/30);
  let area=0;for(let i=0;i<200;i++)area+=evalKeys(sizeKeys,(i+.5)/200)**2/200;
  let maxDisp=0;for(const [t,v] of fm.prof)if(t>=t0 && t<t0+D)
    maxDisp=Math.max(maxDisp,v*L.cellW/(base.Ww*evalKeys(sizeKeys,(t-t0)/D))/30);
  return {...base,L,t0,duration:D,sizeKeys,times,dur,keys:tickFrameKeys40(F),area,
    frameTiming:'tick-start',frameFps:30,capacityFrames:base.L.F,sequenceStart:t0,sequenceEnd:end/30,
    fadeEnd:P.duration,avgFps:30,minFps:30,maxDisp};
}
function splitPlan40(pl) {
  if(pl.frameTiming!=='tick-start' || pl.pageIndex!=null)return [pl];
  const out=[],capacity=pl.capacityFrames;
  for(let first=0;first<pl.L.F;first+=capacity){
    const F=Math.min(capacity,pl.L.F-first),offset=first/30,D=F/30;
    const sizeKeys=clipSizeKeys40(pl.sizeKeys,pl.duration,offset,D);
    let area=0;for(let i=0;i<200;i++)area+=evalKeys(sizeKeys,(i+.5)/200)**2/200;
    out.push({...pl,L:{...pl.L,F},t0:pl.t0+offset,duration:D,keys:tickFrameKeys40(F),sizeKeys,area,
      times:pl.times.slice(first,first+F).map(t=>t-offset),dur:pl.dur.slice(first,first+F),
      pageIndex:out.length,pageCount:Math.ceil(pl.L.F/capacity)});
  }
  return out;
}
function bakeParts(b) { const out=[];for(let s=b;s;s=s.next)out.push(s);return out; }
function bakeSegmentName(b,i) { return !b.next ? '' : i<26 ? String.fromCharCode(65+i) : 'S'+(i+1); }
