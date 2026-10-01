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
function drawFrameSamples40(P, pl, R, t, view, ppm, ppmY = ppm) {
  const [a,b] = shutterWindow(P, pl, t), q = qualityOf(P), width = b-a;
  const count = clamp(Math.ceil(width * q.hz), 1, q.maxSub);
  const oldPPMY = PPMY; PPMY = ppmY; setParticleProfile(P);
  R.subW = width / count;
  try {
    for (let j=0;j<count;j++) {
      const ts = a + (j+.5)*width/count;
      // 以物理时间定闪烁样本，不依赖调用路径或画面刷新次数。
      const tick = Math.floor(ts*240), f = clamp(Math.floor(evalKeys(pl.keys, (t-(pl.t0||0))/pl.duration)),0,pl.L.F-1);
      R.draw(pl.loop ? ts : Math.max(0,ts),view,ppm,1/count,tick,f);
    }
  } finally { PPMY = oldPPMY; }
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
  if(!slot.cell40 || !slot.samples40 || slot.cell40.w!==w || slot.cell40.h!==h || slot.samples40.w!==w*q.ss){
    slot.cell40 && slot.cell40.dispose(); slot.samples40 && slot.samples40.dispose(); gl.activeTexture(gl.TEXTURE0);
    slot.cell40=new Target(w,h,gl.RGBA16F); slot.samples40=new Target(w*q.ss,h*q.ss,gl.RGBA16F);
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
  renderCell40(P,timing,R,t,slot.samples40,slot.cell40,view);
  hdrT.clear(); hdrT.bind(); shadeView40(P,state.M,slot.cell40,t,view,hdrT,camera); post(-1,P);
  hudText=`实时模拟 · ${state.disp==='game'&&camera?'游戏内大小 · '+state.dist+' m · ':''}${state.exportResolution?'导出单格 '+w+'×'+h:'画布分辨率'} · 固定曝光 ×${fixedExposure(P).toFixed(2)} · 居中快门`;
  hudB='';
}
async function suggestExposure40() {
  if (state.P.exposureLock) { flash('曝光已锁定'); return; }
  if (state.baking || state.stillBusy) { flash('等当前烘焙完成后再建议曝光'); return; }
  const gen=state.gen, P={...state.P,flash:0,subFlash:0}, t=Math.max(0,state.t), pl=displayPlan40(P);
  const q=qualityOf(P), w=pl.L.cellW, h=pl.L.cellH, R=makeRenderer(P,familyOf(P.type)==='ground'?'loop':'burst');
  state.stillBusy=true; gl.activeTexture(gl.TEXTURE0);
  let samples=null, cell=null;
  try {
    samples=new Target(w*q.ss,h*q.ss,gl.RGBA16F); cell=new Target(w,h,gl.RGBA16F);
    renderCell40(P,pl,R,t,samples,cell); cell.bind(); const a=new Float32Array(w*h*4);
    gl.readPixels(0,0,w,h,gl.RGBA,gl.FLOAT,a);
    let energy=0; for(let i=0;i<a.length;i+=4){a[i]+=a[i+1];energy+=a[i];}
    if(energy<1e-6){flash('当前画面没有足够亮部，请移动时间轴后再建议');return;}
    const value=clamp(expoOfChannel(a,0,.8,99.8),.0001,1000);
    if(gen===state.gen && !state.P.exposureLock){state.P.exposure=+value.toFixed(4);refreshPanelValues();onParam();flash('已更新固定曝光（未计入开花闪光）');}
  } finally { samples && samples.dispose();cell && cell.dispose();R.dispose();state.stillBusy=false; }
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
