// 新大面片：先安排引擎能显示的时刻，再按页容量分段。旧计划保留在 planLegacy。
// 帧预算：默认按运动分配（motionSchedule40，先放进一张）；可选三档帧率（budget40）或全程 30 fps。都按整数 tick 持帧。
function clipSizeKeys40(keys, fullDuration, start, duration) {
  const at=t=>evalKeys(keys,clamp(t/fullDuration,0,1));
  return [[0,at(start)],...keys.filter(k=>k[0]*fullDuration>start+1e-9 && k[0]*fullDuration<start+duration-1e-9)
    .map(([u,v])=>[(u*fullDuration-start)/duration,v]),[1,at(start+duration)]];
}
// 4.2.3 Zoom 改成「逐帧阶梯」（用户 2026-10-03 00:25「除了固定镜头方案，或多或少都会有点抖」）：
// 以前 Size By Life 是平滑曲线——贴图一帧停几个 tick，面片却一直在长，换帧时花缩回去（引擎里一胀一缩 0.5–3%，回放检查「缩放抖动」）。
// 现在每帧一个大小 = 这一帧烘焙时用的取景大小（帧开始那一刻的包络），整段停留都不变；换帧的同一刻换大小。
// Size By Life 每帧两个关键点（帧开始、下一帧开始前 0.00015 寿命），大小相同的相邻帧合并；贴图本身和以前完全一样。
function stepKeys40(scales,ticks,N){
  const F=scales.length,eps=1.5e-4,keys=[];
  for(let f=0;f<F;f++){
    const a=f?ticks[f]/N:0,b=f+1<F?ticks[f+1]/N:1,v=scales[f];
    if(f&&Math.abs(v-scales[f-1])<1e-6)continue;     // 和上一帧一样大：不用新关键点
    if(f)keys.push([Math.max(keys[keys.length-1][0],a-eps),scales[f-1]]);
    keys.push([a,v]);
  }
  keys.push([1,scales[F-1]]);
  return keys.filter((k,i,a)=>i===0||k[0]>a[i-1][0]+1e-9||k[1]!==a[i-1][1]);
}
// 4.2.5 取景按实测收紧：parts = 按 pl 烘出来的各张；每帧内容包围盒（m.boxes，格子像素）换算回世界坐标，
//  · 固定取景：全段并集收紧（横向以爆点对称，竖向可以偏：Initial Location 的 Z 跟着改）；
//  · Zoom：每帧大小 = 这一帧内容离爆点最远的距离（阶梯关键点照旧，每帧烘多大、引擎里就放多大）。
// 碰到格子边（留边以内）的方向说明内容可能被切了，那个方向不收；空帧不改。能收紧 3% 以上才用，否则返回 null。
// 收紧不能把画面推过标准（GPU 结果 2026-10-03：HN2 锦层收紧 12% 后过曝像素 1.9% → 2.5%，QN11 尾层几乎全黑的末帧被推到格子边）：
//  · 过曝：格子里每个像素的世界面积变小，点状火星（不到一个像素）的值跟着变大；按这一帧的编码值分布预估收紧 g 倍后
//    ≥ 250/255 的像素占比（偏保守：亮的像素按面积 × g² 算），超过 1.8% 就少收一点（这一帧本来就超的不收）；
//  · 几乎是空的帧（最亮 < 16/255 或亮的像素不到 64 个）不按它自己收（只剩几颗暗火星时把它们推到格子边，回放检查会判碰边）。
const FIT_SAT = 0.018;
function fitSatAt(q, g, P) {
  if (!q || !q.h) return 0;
  const G = +P.encGamma || 1, xs = -Math.log(1 - Math.pow(250 / 255, G));
  let n = 0; for (let v = 1; v < 256; v++) { const c = q.h[v]; if (!c) continue; const x = v >= 255 ? Infinity : -Math.log(1 - Math.pow(v / 255, G)); if (x * g * g >= xs) n += c; }
  return n * g * g / q.px;
}
function fitGainCap(q, g, P) {   // 这一帧最多能收紧多少倍（1 = 不收）
  if (!(g > 1)) return 1;
  if (fitSatAt(q, 1, P) > FIT_SAT) return 1;
  if (fitSatAt(q, g, P) <= FIT_SAT) return g;
  let lo = 1, hi = g; for (let k = 0; k < 18; k++) { const mid = (lo + hi) / 2; if (fitSatAt(q, mid, P) <= FIT_SAT) lo = mid; else hi = mid; }
  return lo;
}
// 每帧内容的世界坐标包围盒（米）+ 是否贴着格子边（贴边 = 真实范围不知道）；parts 按帧顺序接起来
function fitFrames40(P, parts) {
  const pad = +P.cellPad || 0, fr = [];
  for (const s of parts) {
    const m = s.meta, L = m.L; if (!m.boxes || m.boxes.length !== L.F) return null;
    const cw = s.cw || L.cellW, chh = s.chh || L.cellH, e = 2 * pad * (s.scale || 1) + 1;     // 包围盒是烘出来的像素（4K 时格子是两倍）
    m.boxes.forEach((bx, f) => {
      const [sx, sy] = sizeXY(m, m.times[f]), c = centerAt(m, m.times[f]), hx = m.HX * sx, hy = m.HY * sy, q = (m.fx || [])[f];
      if (!bx) { fr.push({ hx, hy, c, empty: true }); return; }
      const faint = !!q && (q.pk < 16 || q.nz < 64);
      const du = 2 * hx / cw, dv = 2 * hy / chh;
      fr.push({ hx, hy, c, q, faint, x0: c[0] - hx + bx[0] * du, x1: c[0] - hx + (bx[1] + 1) * du, y0: c[1] - hy + bx[2] * dv, y1: c[1] - hy + (bx[3] + 1) * dv,
        tl: bx[0] <= e, tr: bx[1] >= cw - 1 - e, tb: bx[2] <= e, tt: bx[3] >= chh - 1 - e });
    });
  }
  return fr;
}
// 回放检查的碰边口径（回放检查.py `pad()`）：每张贴图里所有帧都为 0 的最外圈数 k（最多 8）是「留边」，再往里两圈 [k, k+2) 是「内圈」，
// 一帧内圈亮度 ≥ 这一帧总亮度 0.5% 算碰边。所以离格子边不到 10 像素的内容都可能被判——几乎全黑的末帧只剩几颗暗点时最容易（QN11 尾层 21.6%：
// 默认留边 2 像素时收紧后内容离边约 9 像素，正好落在内圈）。analyze 记每帧离边 0–11 圈的亮度（m.edge12）。返回每帧的内圈占比。
const FIT_RING = 0.005;
function replayEdge40(parts) {
  const out = [];
  for (const s of parts) {
    const rows = s.meta.edge12; if (!rows) { out.push(...Array((s.meta.L && s.meta.L.F) || 0).fill(0)); continue; }
    let k = 0; while (k < 8 && rows.every(r => !r[1 + k])) k++;
    for (const r of rows) out.push(r[0] ? (r[1 + k] + r[2 + k]) / r[0] : 0);
  }
  return out;
}
// 收紧后回放检查会判碰边、收紧前不会的帧号
function fitTouches40(P, rawParts, parts) {
  const raw = replayEdge40(rawParts), out = [];
  replayEdge40(parts).forEach((v, i) => { if (v >= FIT_RING && !((raw[i] || 0) >= FIT_RING)) out.push(i); });
  return out;
}
// extra：收紧后的那次烘焙（可选）。它看到的内容并进每帧包围盒（收紧前看不见的暗火星），贴边标记也并进来（贴边那一侧不收）
// opt.edgePx：内容离格子边至少留多少像素（默认 = 2 × 格子留边；碰边重算时 12）
function fitPlan40(P, pl, parts, extra, opt = {}) {
  if (!pl || pl.loop || pl.unit || pl.tight || pl.aniso) return null;
  const pad = +P.cellPad || 0, fr = fitFrames40(P, parts);
  if (!fr) return null;
  if (extra) {
    const f2 = fitFrames40(P, extra); if (!f2 || f2.length !== fr.length) return null;
    fr.forEach((q, i) => { const r = f2[i]; if (r.empty) return;
      if (q.empty) { Object.assign(q, { empty: false, q: r.q, faint: r.faint, x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1, tl: r.tl, tr: r.tr, tb: r.tb, tt: r.tt }); return; }
      Object.assign(q, { faint: q.faint && r.faint, x0: Math.min(q.x0, r.x0), x1: Math.max(q.x1, r.x1), y0: Math.min(q.y0, r.y0), y1: Math.max(q.y1, r.y1),
        tl: q.tl || r.tl, tr: q.tr || r.tr, tb: q.tb || r.tb, tt: q.tt || r.tt }); });
  }
  if (fr.length !== pl.L.F || fr.every(q => q.empty)) return null;
  const a = pl.L.cellW / pl.L.cellH, ePx = Math.max(2 * pad, +opt.edgePx || 0), k = 1.02 / Math.max(.5, 1 - 2 * ePx / Math.min(pl.L.cellW, pl.L.cellH));   // 内容放进去后离格子边：留边那一圈（被压暗）+ 2%
  const area = q => { let ar = 0; for (let i = 0; i < 200; i++) { const v = evalKeys(q.sizeKeys, (i + .5) / 200); ar += v * v / 200; } return ar; };
  if (pl.zoom) {
    const hNew = fr.map(q => { if (q.empty || q.faint || q.tl || q.tr || q.tb || q.tt) return q.hx;
      const h = Math.min(q.hx, Math.max(-q.x0, q.x1, -q.y0, q.y1, 1e-3) * k); return q.hx / fitGainCap(q.q, q.hx / h, P); });
    const old = fr.map(q => q.hx), gain = hNew.map((h, i) => old[i] / h).sort((x, y) => x - y)[Math.floor(hNew.length / 2)];
    if (!(gain >= 1.03)) return null;
    const HX = Math.max(...hNew) * Math.max(1, a), HY = HX / a, frameScale = hNew.map(h => Math.min(1, h * Math.max(1, a) / HX));
    const out = { ...pl, HX, HY, Ww: 2 * HX, Wh: 2 * HY, cy: 0, ppm: pl.L.cellW / (2 * HX), py: .5, frameScale, sizeKeys: stepKeys40(frameScale, pl.ticks, pl.nTicks),
      maxDisp: pl.maxDisp * Math.max(...old.map((h, i) => h / hNew[i])), fitted: { mode: 'zoom', gain: +gain.toFixed(3), from: +pl.HX.toFixed(2), to: +HX.toFixed(2) } };
    out.area = area(out); return out;
  }
  let X = 0, ylo = Infinity, yhi = -Infinity;
  for (const q of fr) {
    const W0 = pl.HX, ylo0 = pl.cy - pl.HY, yhi0 = pl.cy + pl.HY;
    if (q.empty) continue;
    X = Math.max(X, q.tl || q.tr ? W0 : Math.max(-q.x0, q.x1));
    ylo = Math.min(ylo, q.tb ? ylo0 : q.y0); yhi = Math.max(yhi, q.tt ? yhi0 : q.y1);
  }
  const H0 = Math.max(X * k, (yhi - ylo) / 2 * k * a);
  let gain = pl.HX / Math.min(pl.HX, H0); for (const q of fr) if (!q.empty) gain = Math.min(gain, fitGainCap(q.q, gain, P));   // 每一帧都不能因为收紧过曝
  const HX = pl.HX / gain, HY = HX / a, cy = (ylo + yhi) / 2;
  if (!(gain >= 1.03)) return null;
  const out = { ...pl, HX, HY, Ww: 2 * HX, Wh: 2 * HY, cy, ppm: pl.L.cellW / (2 * HX), py: (cy + HY) / (2 * HY), maxDisp: pl.maxDisp * gain,
    fitted: { mode: 'fixed', gain: +gain.toFixed(3), from: +pl.HX.toFixed(2), to: +HX.toFixed(2), cy: +cy.toFixed(2) } };
  return out;
}
// 4.3（渲染基础问题 E7 后半）：烘出来就碰边（回放检查的「内圈」有亮度、又不是几乎全黑的帧）时，取景放大 8% 再烘一次（最多两次）。
// 以前收紧时碰边的那一侧只是「不收」，从不放大，碰边的效果只能靠人改取景。
const GROW40 = 1.08;
function growPlan40(P, pl, parts) {
  if (!pl || pl.loop || pl.unit || pl.tight || pl.aniso || (pl.grown || 0) >= 2) return null;
  const ring = replayEdge40(parts), fr = fitFrames40(P, parts) || [];
  const hit = ring.map((v, i) => v >= FIT_RING && !(fr[i] && (fr[i].empty || fr[i].faint)) ? i : -1).filter(i => i >= 0);
  if (!hit.length) return null;
  const HX = pl.HX * GROW40, HY = pl.HY * GROW40, cy = pl.zoom ? 0 : pl.cy;
  return { ...pl, HX, HY, Ww: 2 * HX, Wh: 2 * HY, cy, ppm: pl.L.cellW / (2 * HX), py: pl.zoom ? .5 : (cy + HY) / (2 * HY), maxDisp: pl.maxDisp / GROW40, grown: (pl.grown || 0) + 1,
    fitted: { mode: 'grow', gain: +(1 / GROW40).toFixed(3), from: +pl.HX.toFixed(2), to: +HX.toFixed(2), frames: hit.length } };
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
  // 4.3（H9）：点灭开始时刻按模拟算（× 燃烧、从点火 / 第二段算起，fm.strobeOn）；以前把「点灭开始」（燃烧的比例）当成秒
  const strobeFrom=+P.strobeHz>0 ? (fm && fm.strobeOn!=null ? fm.strobeOn : (+P.strobeStart||0)) : Infinity;
  // 点灭：频率要 ≤ 0.4 × 帧率，帧率不够就在点灭期间提高（最多 30 fps）。4.3（E5）：每颗星的频率有 ±15% 的随机（20_sim.js），按最快的 ×1.15 算；
  // 30 fps 也追不上（1.15 × 频率 > 0.45 × 30 = 13.5 Hz，接近 15 Hz 的混叠线）时 strobeAlias 报警（输出一节的自检、导出说明）
  const fz=+P.strobeHz>0 ? 1.15*P.strobeHz : 0, strobeHold=fz>0 ? clamp(Math.floor(30*.4/fz),1,4) : 4;
  return {burstEnd,fadeAt,strobeFrom,strobeHold,strobeAlias:fz>13.5?+fz.toFixed(1):0,
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
function motionSchedule40(B,w,first,end,cap,maxHold,maxHoldBurn=maxHold){
  const N=end-first;
  const sched=D=>{const ticks=[];let k=0,prev=1;
    while(k<N){ticks.push(k);const t=(first+k)/30;
      let hm=t<B.burstEnd?1:Math.min(t<B.fadeAt?maxHoldBurn:maxHold,prev+1);if(t>=B.strobeFrom)hm=Math.min(hm,B.strobeHold);
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
  // 单格（4.2.0）：outCell > 0 时按它定列 × 行（贴图尺寸不变），否则按原来的列 × 行；单格不小于 512（PC 下限）
  const oc=+P.outCell>0?Math.max(512,+P.outCell):0;
  const cols=Math.max(1,oc?Math.floor(P.texW/oc):Math.min(P.cols,Math.floor(P.texW/512))),rows=Math.max(1,oc?Math.floor(P.texH/oc):Math.min(P.rows,Math.floor(P.texH/512)));
  const base=planLegacy({...P,cols,rows,frameMode:'uniform'},fm,0,P.duration);
  // 包络只允许放大；抬高关键点时不能引入局部缩小。
  let run=0;const envelope=base.sizeKeys.map(([u,v])=>[u,run=Math.max(run,v)]);
  const first=Math.ceil(ta*30-1e-8),end=Math.max(first+1,Math.ceil(tb*30-1e-8)),N=end-first,cap=base.L.F;
  const B=budget40(P,fm),mode=P.frameBudget||'motion';let holds=[...B.holds],ticks;
  let pagesUsed=0;
  if(mode==='lean'||mode==='count'){
    // 4.2.0 最省 / 手动帧数：按运动分配，帧数 = 最慢帧率需要的最少帧（最省）或你定的帧数（手动）；分几张按容量自动算
    const w=motionWeights40(fm,first,end);let maxHold=clamp(Math.round(+P.maxHold||4),1,8),maxHoldBurn=Math.min(maxHold,clamp(Math.round(+P.maxHoldBurn||3),1,8));
    if(mode==='lean')ticks=motionSchedule40(B,w,first,end,1,maxHold,maxHoldBurn).ticks;   // 容量给 1：每帧都停到允许的最长 → 最少帧
    else{
      const want=clamp(Math.round(+P.frameCount||24),1,N);let r=motionSchedule40(B,w,first,end,want,maxHold,maxHoldBurn);
      // 帧数比最慢帧率需要的还少：放宽每帧停留（最多 8 tick = 3.75 fps），并记下来提醒
      while(r.over&&maxHold<8){maxHold++;maxHoldBurn=maxHold;r=motionSchedule40(B,w,first,end,want,maxHold,maxHoldBurn);}
      // 还放不下：不再限制每帧停多久，运动权重和平均各占一半（不让慢的尾巴一帧停好几秒）；帧率会很低，输出一节里会提醒
      // （开花段每 tick 一帧、帧停留一次最多加 1 tick 的规矩也不要了），按「运动权重和平均各占一半」的累计量等分；帧率会很低，输出一节里会提醒
      if(r.over){
        const mw=w.reduce((a,c)=>a+c,0)/w.length,wb=w.map(v=>.5*v/mw+.5),tot=wb.reduce((a,c)=>a+c,0),t2=[0];let acc=0;
        for(let k=0;k<N&&t2.length<want;k++){acc+=wb[k];if(acc>=tot*t2.length/want&&k+1<N&&k+1>t2[t2.length-1])t2.push(k+1);}
        r={ticks:t2};
      }
      ticks=r.ticks;if(r.over)ticks=ticks.slice(0,want);
    }
    pagesUsed=Math.ceil(ticks.length/cap);
  } else if(mode==='motion'){
    // 先放进 pageTarget 张；每帧最多停 maxHold 个 tick 仍放不下，就一张一张往上加
    // 最慢帧率（协作/标准.md 2.3，2026-10-01 按用户实测「4.56 s 放 64 帧流畅」暂定）：燃烧段 ≥ 10 fps（一帧最多停 3 tick），淡出段 ≥ 7.5 fps（4 tick）
    const w=motionWeights40(fm,first,end),maxHold=clamp(Math.round(+P.maxHold||4),1,8),maxHoldBurn=Math.min(maxHold,clamp(Math.round(+P.maxHoldBurn||3),1,8));
    let pages=Math.max(1,Math.round(+P.pageTarget||1)),r;
    for(;;pages++){r=motionSchedule40(B,w,first,end,cap*pages,maxHold,maxHoldBurn);if(!r.over||pages>=12)break;}
    ticks=r.ticks;pagesUsed=pages;
  } else if(mode==='fixed'){
    // 5.0（用户 10-05 01:28 #13 / 02:25 拍板 6.2，19:40「全按推荐」）：固定机位 + 匀速帧——整段同一个停留 tick 数 k（1 / 2 / 3，取放得下的最小值），帧号一条直线；
    // 放不下 k = 3（10 fps，燃烧段下限）就加贴图张数（最多 pageTarget 起往上加到 8 张）
    const pagesMin=Math.max(1,Math.round(+P.pageTarget||1));let k=1,pages=pagesMin;
    for(;;){if(Math.ceil(N/k)<=cap*pages)break;if(k<3)k++;else if(pages<8)pages++;else break;}
    ticks=[];for(let t=0;t<N;t+=k)ticks.push(t);pagesUsed=pages;
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
  const times=ticks.map(k=>k/30),dur=ticks.map((k,f)=>((f+1<F?ticks[f+1]:N)-k)/30);
  let sizeKeys=clipSizeKeys40(envelope,P.duration,t0,D),frameScale=null;
  if(base.zoom){frameScale=times.map(t=>evalKeys(sizeKeys,t/D));sizeKeys=stepKeys40(frameScale,ticks,N);}
  let area=0;for(let i=0;i<200;i++)area+=evalKeys(sizeKeys,(i+.5)/200)**2/200;
  let maxDisp=0;for(const [t,v] of fm.prof)if(t>=t0 && t<t0+D){
    const f=Math.min(F-1,Math.max(0,ticks.findLastIndex(k=>k/30<=t-t0)));
    maxDisp=Math.max(maxDisp,v*L.cellW/(base.Ww*evalKeys(sizeKeys,(t-t0)/D))*dur[f]);}
  const fpsOf=h=>30/h;
  // 燃烧段（开花到淡出前）最低帧率，给探针 / 统计用
  let minFps=30;for(let f=0;f<F;f++){const t=t0+times[f];if(t<B.fadeAt)minFps=Math.min(minFps,1/Math.max(dur[f],1/30));}
  // 格子「按帧数」：只有一张时直接换成放得下的最小格子（多张时在 splitPlan40 里每张各自挑）
  const fit=P.outPack==='fit',L2=fit&&F<=cap?fitLayout40(L,F):L;
  return {...base,L:L2,fitPack:fit,t0,duration:D,sizeKeys,frameScale,times,dur,ticks,nTicks:N,keys:keysFromTicks40(ticks,N),area,
    frameTiming:'tick-start',frameFps:30,capacityFrames:cap,sequenceStart:t0,sequenceEnd:end/30,
    budget:{mode,burstEnd:B.burstEnd,fadeAt:B.fadeAt,strobeFrom:B.strobeFrom,strobeAlias:B.strobeAlias,fps:mode==='tiers'?holds.map(fpsOf):null,strobeFps:fpsOf(B.strobeHold),pages:Math.ceil(F/cap),holdMin:Math.min(...dur)*30,holdMax:Math.max(...dur)*30},
    fadeEnd:P.duration,noEndFade:P.endMode==='natural'||familyOf(P.type)==='aerial',avgFps:F/D,minFps,maxDisp};
}
// 「按帧数选最小贴图」：单格大小不变，RGBA 接力，在 1×1 / 2×1 / 2×2 / 4×2 / 4×4 / 8×4 / 8×8 里挑第一个放得下 F 帧、又不超过原来格子的
function fitLayout40(L,F){
  const cells=Math.ceil(F/Math.max(1,L.chans));
  for(const [c,r] of [[1,1],[2,1],[2,2],[4,2],[4,4],[8,4],[8,8]]){
    if(c>L.cols||r>L.rows)continue;
    if(c*r>=cells)return {...L,cols:c,rows:r,per:c*r,F,fit:true};
  }
  return {...L,F};
}
function splitPlan40(pl) {
  if(pl.frameTiming!=='tick-start' || pl.pageIndex!=null)return [pl];
  const out=[],capacity=pl.capacityFrames,ticks=pl.ticks||pl.times.map((_,f)=>f),N=pl.nTicks||pl.L.F;
  for(let first=0;first<pl.L.F;first+=capacity){
    const F=Math.min(capacity,pl.L.F-first),k0=ticks[first],k1=first+F<pl.L.F?ticks[first+F]:N;
    const offset=k0/30,D=(k1-k0)/30,pt=ticks.slice(first,first+F).map(k=>k-k0);
    const fs=pl.frameScale?pl.frameScale.slice(first,first+F):null,sizeKeys=fs?stepKeys40(fs,pt,k1-k0):clipSizeKeys40(pl.sizeKeys,pl.duration,offset,D);
    let area=0;for(let i=0;i<200;i++)area+=evalKeys(sizeKeys,(i+.5)/200)**2/200;
    out.push({...pl,L:pl.fitPack?fitLayout40(pl.L,F):{...pl.L,F},t0:pl.t0+offset,duration:D,ticks:pt,nTicks:k1-k0,keys:keysFromTicks40(pt,k1-k0),sizeKeys,frameScale:fs,area,
      times:pt.map(k=>k/30),dur:pl.dur.slice(first,first+F),
      pageIndex:out.length,pageCount:Math.ceil(pl.L.F/capacity)});
  }
  return out;
}
function bakeParts(b) { const out=[];for(let s=b;s;s=s.next)out.push(s);return out; }
function bakeSegmentName(b,i) { return !b.next ? '' : i<26 ? String.fromCharCode(65+i) : 'S'+(i+1); }
