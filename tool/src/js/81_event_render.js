// 4.9.111 同一图层的事件实例实时/序列回放；复用现有渲染核和软圆点。
function eventProjection(p){const y=(+state.eventYaw||0)*Math.PI/180,e=(+state.eventPitch||0)*Math.PI/180;
  const x=p[0]*Math.cos(y)+p[1]*Math.sin(y),d=-p[0]*Math.sin(y)+p[1]*Math.cos(y);return [x,p[2]*Math.cos(e)-d*Math.sin(e)];}
function eventPoint(p,size,color,view){const o=0;dotcData[o]=p[0];dotcData[o+1]=p[1];dotcData[o+2]=6.2831853*(size/4)**2;dotcData[o+3]=size/2;
  for(let j=0;j<3;j++)dotcData[o+4+j]=4*color[j];dotcData[o+7]=1;dotcData[o+8]=0;dotcData[o+9]=1;
  drawDotsC(1,view,hdrT.w/(2*view[2]),hdrT.h/(2*view[3]));}
function eventDrawChild(e,L,x,view,live,i){
  const b=e.bake,age=x.age+EventInstances.start(b),sc=x.scale,r={...L,scale:sc,delay:0,rate:1},p=eventProjection(x.p),M=EventInstances.material(r,x.q);
  let pr;
  if(live){
    const P=fxP(e.P),slot=liveSlot('event'+i);prepSlot(slot,P,'event:'+i+':'+e.name+':'+(e.rev||0));
    const m=b.meta,v=[0,m.cy||0,m.Ww/2,m.Wh/2],ppm=rgT.w/(2*v[2]);
    rgT.clear();rgT.bind();additive(true);drawLiveScene(slot,P,age,v,ppm);additive(false);hazeSamples40(P,rgT,ppm);
    hdrT.bind();additive(true);if(!PR.eventLive)PR.eventLive=compile(VS_RECT,FS_RGMAT);pr=PR.eventLive;gl.useProgram(pr.p);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,rgT.tex);gl.uniform1i(pr.u.uS,0);gl.uniform1f(pr.u.uEH,m.expoH);gl.uniform1f(pr.u.uET,m.expoT);gl.uniform1f(pr.u.uG,b.P.encGamma||1);gl.uniform1f(pr.u.uComb,1);
    const cy=(m.cy||0)*sc,w=m.Ww*sc,h=m.Wh*sc;gl.uniform4fv(pr.u.uRect,[p[0]-w/2,p[1]+cy-h/2,p[0]+w/2,p[1]+cy+h/2]);
  }else{
    const m=b.meta,rel=age-(m.t0||0),ps=preScaleAt(b,m,b,age,rel),f=ps>0?0:frameIdx(m,rel);if(f<0)return;
    pr=PR.mat;gl.useProgram(pr.p);bindSeqTextures(pr,b);gl.uniform1f(pr.u.uFrame,f);gl.uniform1f(pr.u.uMirror,L.mirror?1:0);
    const rect=ps>0?preRect(layerRectAt(m,r,0),ps):layerRectAt(m,r,rel);gl.uniform4fv(pr.u.uRect,[rect[0]+p[0],rect[1]+p[1],rect[2]+p[0],rect[3]+p[1]]);
  }
  gl.uniform4fv(pr.u.uView,view);gl.uniform3fv(pr.u.uRot,[x.rotation,p[0],p[1]]);setMatUniforms(pr,M,age);
  if(M._eventTint)gl.uniform3fv(pr.u.uTint,M._eventTint);
  gl.bindVertexArray(quadVAO);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.uniform3fv(pr.u.uRot,[0,0,0]);gl.activeTexture(gl.TEXTURE0);
}
function renderEventInstances(live){
  const items=state.layers.map((L,i)=>[L,layerEntryOf(L),i]).filter(x=>x[1]&&x[1].bake);hdrT.clear();
  if(!items.length){post();return;}
  let half=10;for(const[L,e]of items)half=Math.max(half,EventInstances.on(L)?EventInstances.extent(L,e.bake):Math.max(e.bake.meta.Ww,e.bake.meta.Wh)*(L.scale||1));
  if(state.disp==='game')half=canvas.width/(2*gamePixelsPerMeter(items[0][1].P,2*half));
  else if(state.disp==='px')half=canvas.width/(2*Math.min(...items.map(([L,e])=>e.bake.meta.L.cellW/(e.bake.meta.Ww*(L.scale||1)))));
  const view=[0,0,half,half],t=engineTick(state.t);let heads=0,blooms=0;
  hdrT.bind();additive(true);LIVE_VIEW=live;
  try{for(const[L,e,i]of items){if(!layerShown(i)||comboLayerDraw(L)==='off')continue;
    if(!EventInstances.on(L)){drawLayer(e.bake,L,t,view);continue;}
    const c=EventInstances.config(L),a=(t-(+L.delay||0))*(+L.rate||1);
    if(c.flash&&a>=0&&a<c.flashLife){const alpha=esCurve([[0,c.flashAlpha],[.25,c.flashAlpha*.36],[1,0]],a/c.flashLife);eventPoint([0,0],c.flashSize*(L.scale||1),hexToLin(c.headColor).map(x=>x*alpha),view);}
    for(const x of EventInstances.sample(L,t)){
      if(x.sourceAge<0)continue;
      if(!x.born){eventPoint(eventProjection(x.p),x.q.size*(L.scale||1),hexToLin(c.headColor),view);heads++;}
      else if(x.age<bakeTotal(e.bake)-EventInstances.start(e.bake)){eventDrawChild(e,L,x,view,live,i);blooms++;}
    }
  }}finally{LIVE_VIEW=false;LIVE_CAP=0;additive(false);}
  post();hudText=`${state.comboName} · ${live?'实时模拟':'引擎回放'} · CPU事件实例 · 飞行${heads} / 小割${blooms}`;hudB='30 fps · 同配方事件与序列；未经UE实播';
}
