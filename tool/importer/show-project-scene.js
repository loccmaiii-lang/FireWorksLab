// An intent sketch in metres. This never simulates or reads Cascade particles.
const ShowProjectScene=(()=>{
  const NS='http://www.w3.org/2000/svg';
  function draw({scene,timeline,compiled,doc,time,view='front',range=[0,210]}){
    const make=(parent,tag,attrs={},text)=>{const e=parent.ownerDocument.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;parent.appendChild(e);return e;};
    scene.replaceChildren();scene.setAttribute('viewBox','0 0 1000 540');make(scene,'title',{},view==='top'?'发射点俯视图':'目标构图与节奏示意');
    make(scene,'desc',{},'按米绘制目标花径和相对发射面高度。未标定的真实粒子轨迹与缩放可能不同。');
    const points=compiled.points,rows=compiled.shots;
    if(!points.length){make(scene,'text',{x:500,y:270,'text-anchor':'middle'},'场地参数无效，请先修正。');}
    else if(view==='top'){
      const extent=Math.max(500,...points.map(p=>Math.abs(p.xM)+40)),maxY=Math.max(200,...points.map(p=>Math.abs(p.yM)+60)),sx=450/extent,sy=380/(2*maxY),x=p=>500+p.xM*sx,y=p=>300-p.yM*sy;
      for(const p of points){make(scene,'circle',{cx:x(p),cy:y(p),r:p.group==='主排'?5:3,class:'sp-point'});make(scene,'text',{x:x(p),y:y(p)-12,'text-anchor':'middle'},p.id);const a=p.yawDeg*Math.PI/180;make(scene,'line',{x1:x(p),y1:y(p),x2:x(p)-Math.sin(a)*16,y2:y(p)-Math.cos(a)*16,stroke:'#648b93'});}
      const main=points.filter(p=>p.group==='主排');if(main.length)make(scene,'polyline',{points:main.map(p=>x(p)+','+y(p)).join(' '),fill:'none',stroke:'#5e7d88','stroke-width':2});
      make(scene,'text',{x:500,y:60,'text-anchor':'middle'},'观众方向 ↑ · 转角 '+doc.site.cornerDeg+'° · 前台前移 '+doc.site.frontOffsetM+' m');
      make(scene,'text',{x:500,y:510,'text-anchor':'middle'},'主排 P1–P9 / 点间 B1–B8 / 前台 F1–F3 · 位置输出为 cm');
    }else {
      const xExtent=Math.max(500,...points.map(p=>Math.abs(p.xM)+30),...rows.map(r=>Math.abs(r.worldBurst.X/100)+r.diameterM/2+20)),height=Math.max(600,...rows.map(r=>r.worldBurst.Z/100+r.diameterM/2+30)),unit=Math.min(880/(xExtent*2),445/height),X=x=>500+x*unit,Y=z=>490-z*unit;
      for(let z=0;z<=height;z+=100){make(scene,'line',{x1:45,y1:Y(z),x2:970,y2:Y(z),class:'sp-grid'});make(scene,'text',{x:38,y:Y(z)+5,'text-anchor':'end'},z+'m');}
      const main=points.filter(p=>p.group==='主排'),front=points.filter(p=>p.group==='前台');if(main.length){const l=Math.min(...main.map(p=>p.xM)),r=Math.max(...main.map(p=>p.xM)),z=main[0].zM;make(scene,'rect',{x:X(l)-15,y:Y(z),width:(r-l)*unit+30,height:490-Y(z),class:'sp-platform'});make(scene,'text',{x:970,y:Y(z)+20,'text-anchor':'end'},'坝顶 '+z+'m');}
      if(front.length){const z=front[0].zM;make(scene,'rect',{x:X(-doc.site.frontWidthM/2),y:Y(z),width:doc.site.frontWidthM*unit,height:490-Y(z),class:'sp-platform'});make(scene,'text',{x:500,y:Y(z)+23,'text-anchor':'middle'},'前台 '+z+'m');}
      for(const row of rows){
        if(row.launchS>range[1]||row.endS<range[0])continue;const s=doc.shots.find(s=>s.id===row.shotId),ox=X(row.point.xM),oy=Y(row.point.zM),bx=X(row.worldBurst.X/100),by=Y(row.worldBurst.Z/100),age=time-row.launchS,after=time-row.burstS;
        if(row.kind==='fan'){
          if(age<0||age>s.burstLifeS+(s.fanCount-1)*s.fanIntervalS)continue;
          for(let i=0;i<s.fanCount;i++){
            const rank=ShowProject.fanRank(s,i),t=age-rank*s.fanIntervalS;if(t<0||t>s.burstLifeS)continue;
            const a=(row.angleDeg+(s.fanCount===1?0:-s.fanSpreadDeg/2+i*s.fanSpreadDeg/(s.fanCount-1)))*Math.PI/180,progress=Math.min(1,t/Math.max(.05,row.flightS)),len=row.riseM*unit*progress,fade=Math.max(0,1-(t-row.flightS)/Math.max(.1,s.burstLifeS-row.flightS));
            const tx=ox+Math.sin(a)*len,ty=oy-Math.cos(a)*len;make(scene,'line',{x1:ox,y1:oy,x2:tx,y2:ty,stroke:row.color,class:'sp-trail',opacity:.72*fade});make(scene,'circle',{cx:tx,cy:ty,r:1.6,fill:row.color,opacity:fade});
          }
        }else if(age>=0&&time<row.burstS&&row.hasTrail){
          // Ease is schematic and does not stand in for RT6 ballistic calibration.
          const progress=Math.min(1,age/Math.max(.001,row.flightS)),h=1-Math.pow(1-progress,1.6),hx=ox+(bx-ox)*h,hy=oy+(by-oy)*h;
          make(scene,'line',{x1:ox+(hx-ox)*.6,y1:oy+(hy-oy)*.6,x2:hx,y2:hy,stroke:row.color,class:'sp-trail',opacity:.8});make(scene,'circle',{cx:hx,cy:hy,r:2.7,fill:'#effffd'});
        }else if(after>=0&&after<=s.burstLifeS){
          const growth=Math.min(1,after/.7),fade=Math.pow(Math.max(0,1-after/s.burstLifeS),.65),radius=Math.max(1,row.diameterM/2*unit*growth),drop=Math.min(35,after*after*1.4)*unit;
          const g=make(scene,'g',{transform:'translate('+bx+' '+(by+drop)+')',opacity:fade,'data-shot':row.id});
          make(g,'circle',{r:radius,fill:row.color,'fill-opacity':.025,stroke:row.color,'stroke-opacity':.38,'stroke-width':1});
          for(let k=0;k<28;k++){const a=k*Math.PI*2/28,spoke=radius*(.91+.09*ShowProject.noise(doc.seed,row.id,'ray-'+k));make(g,'line',{x1:Math.cos(a)*spoke*.36,y1:Math.sin(a)*spoke*.36,x2:Math.cos(a)*spoke,y2:Math.sin(a)*spoke,stroke:row.color,class:'sp-burst-ray'});make(g,'circle',{cx:Math.cos(a)*spoke,cy:Math.sin(a)*spoke,r:1.5,fill:row.color});}
        }
      }
      for(const p of points){make(scene,'circle',{cx:X(p.xM),cy:Y(p.zM),r:p.group==='主排'?3.5:2,class:'sp-point'});if(p.group==='主排'||p.group==='前台')make(scene,'text',{x:X(p.xM),y:Y(p.zM)-9,'text-anchor':'middle'},p.id);}
      if(!rows.length)make(scene,'text',{x:500,y:220,'text-anchor':'middle'},'空白工程 · 导入小样或添加完整单发后预览');
      make(scene,'text',{x:65,y:34},'相对炸高 = 发射面 + 升高 · 花径与飞行档独立');make(scene,'text',{x:965,y:520,'text-anchor':'end'},'目标示意，非粒子实播');
    }
    timeline.replaceChildren();const cues=doc.cues.filter(c=>c.enabled!==false&&compiled.shots.some(s=>s.cueId===c.id&&s.burstS>=range[0]&&s.launchS<=range[1])),th=Math.max(100,cues.length*28+45);timeline.setAttribute('viewBox','0 0 1000 '+th);
    const tx=t=>210+(t-range[0])/Math.max(.01,range[1]-range[0])*755;
    for(let i=0;i<=6;i++){const t=range[0]+i*(range[1]-range[0])/6;make(timeline,'line',{x1:tx(t),x2:tx(t),y1:25,y2:th-5,stroke:'#304651'});make(timeline,'text',{x:tx(t),y:15,'text-anchor':'middle'},t.toFixed(1));}
    cues.forEach((c,i)=>{const rows=compiled.shots.filter(s=>s.cueId===c.id),y=38+i*28,start=Math.min(...rows.map(r=>r.launchS)),end=Math.max(...rows.map(r=>r.burstS));make(timeline,'text',{x:0,y:y+5},c.name.slice(0,18));make(timeline,'line',{x1:tx(start),x2:tx(end),y1:y,y2:y,stroke:'#547c85','stroke-width':4,'stroke-dasharray':rows.some(r=>r.preFire)?'4 3':''});make(timeline,'circle',{cx:tx(start),cy:y,r:4,fill:'#3cdfb0'});make(timeline,'circle',{cx:tx(end),cy:y,r:4,fill:'#efd990'});make(timeline,'text',{x:Math.min(950,tx(end)+9),y:y+4},'×'+rows.length);});
    if(time>=range[0]&&time<=range[1])make(timeline,'line',{x1:tx(time),x2:tx(time),y1:22,y2:th,stroke:'#a9eee0','stroke-width':1.5});
  }
  return {draw};
})();
