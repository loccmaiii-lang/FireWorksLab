// 4.0 采样与曝光：烘焙、实时、定帧共用这里的时间窗口和积分。
// t 是绝对模拟秒数；plan.times/dur 是相对段起点的时间。
function shutterWindow(P, pl, t) {
  const rel = t - (pl.t0 || 0), u = clamp(rel / pl.duration, 0, 1);
  const f = clamp(Math.floor(evalKeys(pl.keys, u)), 0, pl.L.F - 1);
  const width = Math.max(0, +P.shutter || 0) * Math.max(pl.dur[f] || 0, 1 / 30);
  return [t - width / 2, t + width / 2];
}
function fixedExposure(P) { return clamp(P.exposure == null ? 1 : +P.exposure, .0001, 1000); }
function frameView40(pl, t) {
  const rel = clamp(t - (pl.t0 || 0), 0, pl.duration), [sx, sy] = sizeXY(pl, rel), c = centerAt(pl, rel);
  return [c[0], c[1], pl.HX * sx, pl.HY * sy];
}
// 4.2.20 实时模拟的显卡负担（用户 10-03 17:28「四尺玉 / 金芒菊实时模拟一顿一顿」）：
// 4.0 的实时模拟按导出那一帧的快门画（每帧 6–16 个子样本，每个子样本把这一层所有火花画一遍；3.7 固定 3 个），
// 鸿巢锦冠层一个子样本 340 万粒，一帧最多 5400 万，笔记本跟不上；烘焙在后台跑时还和它抢显卡。
// 现在实时模拟（只有实时模拟）按预算少画几个子样本：预算按实际帧时间自动升降，烘焙中压到最少让出显卡；HUD 写明。
// 引擎回放、导出、定帧不受影响（LIVE_CAP 只在实时模拟画的时候设）。自动化（检查脚本）默认不压，网址 ?livecap=1 / 0 强制。
const liveCtl = { auto: null, budget: 12e6, ema: 1 / 60, lastAdj: 0, lastCap: 0, lastFull: 0 };
let LIVE_CAP = 0, LIVE_VIEW = false;     // LIVE_VIEW：正在画实时模拟（renderLive40 / renderComboLive 设），烘焙 / 定帧 / 引擎回放都不是
function liveAuto() { if (liveCtl.auto == null) { const q = typeof location !== 'undefined' ? location.search : ''; liveCtl.auto = /[?&]livecap=1/.test(q) ? true : /[?&]livecap=0/.test(q) ? false : !(typeof navigator !== 'undefined' && navigator.webdriver); } return liveCtl.auto; }
function liveAdapt(now) {
  if (now - liveCtl.lastAdj < 500) return; liveCtl.lastAdj = now;
  if (liveCtl.ema > 0.045) liveCtl.budget = Math.max(5e5, liveCtl.budget * 0.6);          // 慢于 22 fps：少画
  else if (liveCtl.ema < 0.024) liveCtl.budget = Math.min(4e8, liveCtl.budget * 1.25);    // 快于 40 fps：多画回来
}
function trackDraws(tr, P) { return tr ? tr.nStars * tr.M * (1 + Math.round(+P.branch || 0)) * (P.waterRefl > 0 ? 2 : 1) : 0; }
// 这一帧实时模拟每个子样本最多画几个（work = 一个子样本要画的粒子数，几层加起来）；0 = 不压
function liveCapFor(work) {
  liveCtl.lastCap = 0; liveCtl.lastFull = 0;
  if (!liveAuto()) return 0;
  if (state.baking || (state.layerQueue && state.layerQueue.size)) return 2;      // 烘焙中：让出显卡
  return clamp(Math.floor(liveCtl.budget / Math.max(1, work)), 2, 128);
}
function liveCapNote() { return liveCtl.lastCap && liveCtl.lastCap < liveCtl.lastFull ? ` · 快门子样本 ${liveCtl.lastCap}/${liveCtl.lastFull}（显卡忙${state.baking ? '：后台在烘焙' : ''}，实时模拟少画几层快门；引擎回放、导出不受影响）` : ''; }
// 这一帧（不压时）有几个快门子样本：烘焙分批用（4.2.23）
function frameSampleCount40(P, pl, t) { const [a, b] = shutterWindow(P, pl, t), q = qualityOf(P); return clamp(Math.ceil((b - a) * q.hz), 1, q.maxSub); }
// range = [j0, j1)：只画这一帧第 j0 到 j1 − 1 个子样本（4.2.23 烘焙分批交给显卡）；不给 = 整帧。分几次画和一次画完，画的东西、顺序都一样
function drawFrameSamples40(P, pl, R, t, view, ppm, ppmY = ppm, range = null) {
  const [a,b] = shutterWindow(P, pl, t), q = qualityOf(P), width = b-a;
  const full = clamp(Math.ceil(width * q.hz), 1, q.maxSub), count = LIVE_CAP > 0 ? Math.min(full, LIVE_CAP) : full;
  if (LIVE_CAP > 0) { liveCtl.lastFull = Math.max(liveCtl.lastFull, full); liveCtl.lastCap = Math.max(liveCtl.lastCap, count); }
  const j0 = range ? Math.max(0, range[0]) : 0, j1 = range ? Math.min(count, range[1]) : count;
  const oldPPMY = PPMY; PPMY = ppmY; setParticleProfile(P);
  R.subW = width / count;
  const fwd = LIVE_VIEW && R.sim && R.sim.noSparks;      // 4.2.22：实时模拟不倒回（见 50_bake.js draw）
  R.liveFwd = !!fwd;
  if (R.frameStart && !pl.loop && !fwd && j0 === 0) R.frameStart(Math.max(0, a + .5 * width / count));
  try {
    for (let j=j0;j<j1;j++) {
      const ts = a + (j+.5)*width/count;
      // 以物理时间定闪烁样本，不依赖调用路径或画面刷新次数。
      const tick = Math.floor(ts*240), f = clamp(Math.floor(evalKeys(pl.keys, (t-(pl.t0||0))/pl.duration)),0,pl.L.F-1);
      R.draw(pl.loop ? ts : Math.max(0,ts),view,ppm,1/count,tick,f);
    }
  } finally { PPMY = oldPPMY; R.liveFwd = false; }
  return [a,b];
}
function frameFade40(pl, t, noFade = false) {
  return pl.loop || noFade ? 1 : clamp(((pl.fadeEnd==null?(pl.t0||0)+pl.duration:pl.fadeEnd)-t)/.3,0,1);
}
function packCell40(P, source, target, fade = 1) {
  const q=qualityOf(P), pr=PR.pack;
  target.clear(); target.bind(); gl.useProgram(pr.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,source.tex);
  gl.uniform1i(pr.u.uS,0); gl.uniform1i(pr.u.uSS,q.ss); gl.uniform1f(pr.u.uFade,fade);
  gl.uniform1f(pr.u.uPad,P.cellPad||0); gl.uniform2f(pr.u.uCell,target.w,target.h);
  for(const [i,mask] of [[0,[1,0,0,0]],[1,[0,1,0,0]]]){
    gl.colorMask(i===0,i===1,false,false); gl.uniform4fv(pr.u.uM,mask); drawQuad();
  }
  gl.colorMask(true,true,true,true);
}
function renderCell40(P, pl, R, t, samples, cell, view = frameView40(pl,t)) {
  samples.clear(); samples.bind(); additive(true);
  let window;
  try { window=drawFrameSamples40(P,pl,R,t,view,samples.w/(2*view[2]),samples.h/(2*view[3])); }
  finally { additive(false); }
  hazeSamples40(P,samples,samples.w/(2*view[2]));
  packCell40(P,samples,cell,frameFade40(pl,t,!!pl.noFade));
  return window;
}
function displayPlan40(P) {
  if (familyOf(P.type)!=='ground') return plan(P,measure(P));
  const R=makeRenderer(P,'loop');
  try {
    const guess=Math.max(10,P.jetSpeed*Math.min(P.sparkLife,1.5)+P.spacing*P.nozzles/2+P.groundH+(P.shotSpeed||0)*.9);
    const box=gpuBounds(R,[0,P.loopT*.33,P.loopT*.66],guess,[0,guess*.6]); box[2]=Math.min(0,box[2]);
    return loopPlan(P,box,P.loopT);
  } finally { R.dispose(); }
}
function shadeCell40(P,M,cell,t) {
  const pr=PR.rgmat; gl.useProgram(pr.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,cell.tex);
  gl.uniform1i(pr.u.uS,0); gl.uniform1f(pr.u.uEH,fixedExposure(P)); gl.uniform1f(pr.u.uET,fixedExposure(P));
  gl.uniform1f(pr.u.uG,P.encGamma); gl.uniform1f(pr.u.uComb,P.outMode==='combined'?1:0);
  setMatUniforms(pr,M,t); drawQuad();
}
function shadeView40(P,M,cell,t,view,target,camera=null) {
  if(camera){
    // 把烘焙单格摆回固定世界镜头。单格取景扩大只改变面片范围，不能带着观看镜头后退。
    const x0=Math.round(((view[0]-view[2]-camera[0])/(2*camera[2])+.5)*target.w);
    const y0=Math.round(((view[1]-view[3]-camera[1])/(2*camera[3])+.5)*target.h);
    const x1=Math.round(((view[0]+view[2]-camera[0])/(2*camera[2])+.5)*target.w);
    const y1=Math.round(((view[1]+view[3]-camera[1])/(2*camera[3])+.5)*target.h);
    gl.viewport(x0,y0,Math.max(1,x1-x0),Math.max(1,y1-y0));
  }else{
    const aspect=view[2]/view[3],w=Math.min(target.w,target.h*aspect),h=w/aspect;
    gl.viewport(Math.round((target.w-w)/2),Math.round((target.h-h)/2),Math.round(w),Math.round(h));
  }
  shadeCell40(P,M,cell,t);
}
function linearCellMetrics40(cell) {
  const a=new Float32Array(cell.w*cell.h*4); cell.bind(); gl.readPixels(0,0,cell.w,cell.h,gl.RGBA,gl.FLOAT,a);
  let sum=0,peak=0,half=0; for(let i=0;i<a.length;i+=4){sum+=a[i];peak=Math.max(peak,a[i]);}
  for(let i=0;i<a.length;i+=4)if(a[i]>peak*.5)half++;
  return {headSum:sum,headPeak:peak,headHalfPixels:half};
}
function liveRenderer40(slot,P) {
  if (!slot.R40) slot.R40=makeRenderer(P,familyOf(P.type)==='ground'?'loop':'burst');
  if (!slot.plan40) slot.plan40=displayPlan40(P);
  return slot.R40;
}
function renderLive40() {
  const P=state.P, slot=liveSlot('A40'); prepSlot(slot,P,state.gen);
  const R=liveRenderer40(slot,P), b=previewBake();
  const pl=b && state.bakeGen===state.gen && ['master','segments','loop'].includes(b.form) ? segAt(b,state.t).meta : slot.plan40;
  const q=qualityOf(P), L=state.platform==='mobile' && !b?layoutOf(mobileParams(P)):pl.L;
  const w=state.exportResolution?L.cellW:canvas.width, h=state.exportResolution?L.cellH:canvas.height;
  // 4.2.21 超采样画布边长 ≤ 4096（「画布分辨率」+ 高分屏 + 4×4 超采样以前一张 6000–8000 px 的浮点画布，几百 MB，笔记本会白屏）；导出单格分辨率时不受影响
  const ssL=Math.max(1,Math.min(q.ss,Math.floor(4096/Math.max(w,h)))), PL=ssL===q.ss?P:{...P,qSS:ssL};
  if(!slot.cell40 || !slot.samples40 || slot.cell40.w!==w || slot.cell40.h!==h || slot.samples40.w!==w*ssL){
    slot.cell40 && slot.cell40.dispose(); slot.samples40 && slot.samples40.dispose(); gl.activeTexture(gl.TEXTURE0);
    slot.cell40=new Target(w,h,gl.RGBA16F); slot.samples40=new Target(w*ssL,h*ssL,gl.RGBA16F);
  }
  const t=familyOf(P.type)==='ground'?state.t:Math.min(state.t,P.duration);
  const view=frameView40(pl,t), timing=b && state.bakeGen===state.gen && ['unit','riseLoop'].includes(b.form)?b.meta:pl;
  let camera=null;
  if(familyOf(P.type)==='aerial' && ['master','segments'].includes(P.form)){
    if(b && state.bakeGen===state.gen)camera=exportView(b).view;
    else{
      if(!slot.camera40)slot.camera40={P,meta:slot.plan40,fm:measure(P)};
      camera=productDisplayView(slot.camera40,sceneView(P,slot.plan40,slot),L.cellW/(2*view[2]),slot.plan40.Ww).view;
    }
  }
  LIVE_CAP = liveCapFor(trackDraws(R.track, P) + (P.stars || 0) * q.ss); LIVE_VIEW = true;
  try { renderCell40(PL,timing,R,t,slot.samples40,slot.cell40,view); } finally { LIVE_CAP = 0; LIVE_VIEW = false; }
  hdrT.clear(); hdrT.bind(); shadeView40(P,state.M,slot.cell40,t,view,hdrT,camera); post(-1,P);
  hudText=`实时模拟 · ${state.disp==='game'&&camera?'游戏内大小 · '+state.dist+' m · ':''}${state.exportResolution?'导出单格 '+w+'×'+h:'画布分辨率'} · 固定曝光 ×${fixedExposure(P).toFixed(2)} · 居中快门${liveCapNote()}`;
  const headPx=(+P.headSize||0)*Math.min(L.cellW/(2*view[2]),L.cellH/(2*view[3]));
  hudB=+P.headBright>0 ? `星头标称直径约 ${headPx.toFixed(2)} 纹素（当前取景）${headPx<3?' · 小光点易受采样影响，可增大单格；超采样不能替代单格分辨率':''}` : '';
}
// 4.0 自动固定曝光：在燃烧段几个时刻渲染线性亮度，取最亮的那一刻，让它 99.8% 分位的像素显示到 0.96。
// 一个配方只有一个固定曝光（不随帧变）；目标默认.96，可降低以保留亮部。采样和分位值不保证所有像素不饱和。
const AUTO_EXPO40 = { fracs: [.02, .04, .07, .1, .15, .2, .3, .45, .6, .75], target: .96, pct: 99.8 };   // 开头几帧也要量（2026-10-02：只量 10% 以后，球形B 第 1 层开花那几帧过曝 3.8%）
async function autoExposure40(P0) {
  const P={...derive({...P0}),flash:0,subFlash:0}, pl=displayPlan40(P), q=qualityOf(P), w=pl.L.cellW, h=pl.L.cellH;
  const R=makeRenderer(P,familyOf(P.type)==='ground'?'loop':'burst'), span=familyOf(P.type)==='ground'?(P.loopT||P.duration):Math.min(P.duration,pl.duration||P.duration);
  gl.activeTexture(gl.TEXTURE0);
  let samples=null, cell=null, best=null; const per=[];
  try {
    samples=new Target(w*q.ss,h*q.ss,gl.RGBA16F); cell=new Target(w,h,gl.RGBA16F); const a=new Float32Array(w*h*4);
    for (const f of AUTO_EXPO40.fracs) {
      renderCell40(P,pl,R,(pl.t0||0)+f*span,samples,cell); cell.bind(); gl.readPixels(0,0,w,h,gl.RGBA,gl.FLOAT,a);
      let energy=0; for(let i=0;i<a.length;i+=4){a[i]+=a[i+1];energy+=a[i];}
      const v=energy<1e-6?null:clamp(expoOfChannel(a,0,clamp(P.exposureTarget == null ? AUTO_EXPO40.target : +P.exposureTarget,.5,.98),AUTO_EXPO40.pct),.0001,1000);
      per.push(v); if(v!=null && (best==null || v<best))best=v;
      await nextTick();
    }
  } finally { samples && samples.dispose(); cell && cell.dispose(); R.dispose(); }
  return { value: best, per };
}
async function suggestExposure40() {
  if (state.P.exposureLock) { flash('曝光已锁定'); return; }
  if (state.baking || state.stillBusy) { flash('等当前烘焙完成后再建议曝光'); return; }
  const gen=state.gen; state.stillBusy=true;
  try {
    const r=await autoExposure40(state.P);
    if(r.value==null){flash('画面没有足够亮部，无法建议曝光');return;}
    if(gen===state.gen && !state.P.exposureLock){state.P.exposure=+(r.value<1?r.value.toFixed(3):r.value.toFixed(2));refreshPanelValues();onParam();flash('已更新贴图曝光（不含开花闪光）；最终明暗可在颜色栏调显示强度');}
  } finally { state.stillBusy=false; }
}
async function renderStills40(P0,M0,opt) {
  const P=derive({...P0}), M=normalizeM(M0||{},P.type), pl=opt.plan||displayPlan40(P);
  const px=opt.px||pl.L.cellW, q=qualityOf(P), R=makeRenderer(P,familyOf(P.type)==='ground'?'loop':'burst');
  const saved={hdr:hdrT,rg:rgT,mode:state.ref.mode,expo:state.expo,busy:state.stillBusy};
  state.stillBusy=true; await nextTick();
  gl.activeTexture(gl.TEXTURE0);
  let samples=null, cell=null, H=null;
  const out=[];
  try {
    samples=new Target(px*q.ss,px*q.ss,gl.RGBA16F); cell=new Target(px,px,gl.RGBA16F); H=new Target(px,px,gl.RGBA16F,true);
    canvas.width=canvas.height=px; hdrT=H; rgT=cell; state.ref.mode=0; state.expo=opt.expo==null?1:opt.expo;
    for(const t of opt.times.slice().sort((a,b)=>a-b)){
      const view=opt.half==null?frameView40(pl,t):[opt.cx||0,opt.cy||0,opt.half,opt.half];
      const window=renderCell40(P,pl,R,t,samples,cell,view), metrics=opt.metrics?linearCellMetrics40(cell):undefined;
      H.clear(); H.bind(); shadeView40(P,M,cell,t,view,H); post(-1,P);
      out.push({t,png:canvas.toDataURL('image/png'),shutter:window,exposure:fixedExposure(P),linear:metrics}); await nextTick();
    }
  } finally {
    samples && samples.dispose(); cell && cell.dispose(); H && H.dispose(); R.dispose();
    hdrT=saved.hdr; rgT=saved.rg; state.ref.mode=saved.mode; state.expo=saved.expo; state.stillBusy=saved.busy;
  }
  return out;
}
