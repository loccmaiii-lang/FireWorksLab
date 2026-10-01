// 引擎时钟与显示尺度。取帧和材质颜色在同一个 30 Hz tick 求值。
function engineTick(t) { return Math.floor(t*30+1e-8)/30; }
function gamePixelsPerMeter(P,diameter,height=canvas.height,distance=state.dist) {
  const fraction=Number.isFinite(+P.screenFrac) && +P.screenFrac>0 ? +P.screenFrac : 1/3;
  return height*fraction*1000/(Math.max(1e-3,diameter)*clamp(distance,800,1200));
}
const gameDiameterCache=new WeakMap();
function gameDiameter(b,fallback) {
  if(gameDiameterCache.has(b))return gameDiameterCache.get(b);
  // 没有其他号数实测时，按标准以该花径占 1/3 屏高估算；不臆造视场角。
  let diameter=fallback;
  if(familyOf(b.P.type)==='aerial'){
    const fm=b.fm||measure(b.P), metrics=metricsOf(b.P,fm);
    if(metrics && metrics.diameter>0)diameter=metrics.diameter;
  }
  gameDiameterCache.set(b,diameter);return diameter;
}
function productDisplayView(b,fit,texPPM,diameter) {
  let ppm=canvas.width/(2*fit[2]);
  if(state.disp==='game')ppm=gamePixelsPerMeter(b.P,gameDiameter(b,diameter));
  else if(state.disp==='px')ppm=texPPM;
  const half=canvas.width/(2*ppm);
  return {view:[fit[0],fit[1],half,half],mag:ppm/texPPM,onScreen:b.meta.Ww*ppm*1080/canvas.height};
}
function mobileParams(P) {
  const L=layoutOf(P), requested=P.mobileCellPx||Math.max(256,Math.min(L.cellW,L.cellH)/2);
  const factor=Math.min(1,requested/Math.min(L.cellW,L.cellH));
  // 保持列、行和帧数；窄长旧尾缀不再降采样。手机至少保留 256，细节多时可指定更大值。
  return {...P,texW:Math.min(P.texW,Math.max(1024,Math.round(P.texW*factor))),texH:Math.min(P.texH,Math.max(1024,Math.round(P.texH*factor)))};
}
async function bakeMobileFor(b,onProg=null) {
  if(b.form==='trail')return await bake(mobileParams(b.P),1,onProg);
  let first=null,last=null;
  try {
    for(let source=b;source;source=source.next){
      const P=mobileParams({...source.P,cols:source.meta.L.cols,rows:source.meta.L.rows});
      const pl={...source.meta,L:layoutOf(P)};pl.ppm=pl.L.cellW/pl.Ww;
      let part;
      if(['master','segments'].includes(b.form)){
        part=await bakeMaster(P,1,onProg,{fm:source.fm||b.fm,pl,noFade:!!source.next,
          ...(first?{expo:[first.meta.expoH,first.meta.expoT]}:{})});
      }else{
        const kind=source.form, Q=kind==='unit'?{...P,_unit:true,stars:1,speedJit:0,burnJit:0,
          duration:unitDuration(P),zoom:'off',pattern:'sphere',waterRefl:0,grav:0,sparkGrav:0,wind:0,turb:0}:P;
        const R=makeRenderer(Q,kind);
        try{part=await bakeFrames(Q,1,onProg,pl,R);part.form=kind;part.P=P;part.fm=source.fm;}
        finally{R.dispose();}
      }
      if(last)last.next=part;else first=part;last=part;
    }
    first.form=b.form;return first;
  }catch(e){if(first)disposeBake(first);throw e;}
}
function previewBake(b=state.bake) { return b && state.platform==='mobile' ? b.mobile||null : b; }
function setPreviewPlatform(value) {
  state.platform=value;
  if(state.tab==='combo') { if(value==='mobile')ensureComboMobile();return; }
  if(value==='mobile' && state.bake && !state.bake.mobile && !isPhys(state.P)){
    state.dirty=true;scheduleBake();
  }
}
let comboMobileTask=null;
async function ensureComboMobile() {
  if(comboMobileTask)return comboMobileTask;
  const work=async()=>{
    const entries=[...new Set(state.layers.map(L=>state.lib.find(e=>e.name===L.lib)).filter(Boolean))];
    busy(true,'组合手机版独立烘焙…',0);
    try{for(let i=0;i<entries.length;i++){
      const e=entries[i];if(!e.bake.mobile)e.bake.mobile=await bakeMobileFor(e.bake,p=>busy(true,`手机：${e.name}`,(i+p)/entries.length));
    }}catch(e){flash('手机烘焙失败：'+e.message,true);}
    finally{busy(false);}
  };
  comboMobileTask=work();try{await comboMobileTask;}finally{comboMobileTask=null;}
}
