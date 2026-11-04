const ShowSequenceScene = (() => {
  function draw({scene,timeline,events,duration,byId,flight,launchTime}){
    const ns='http://www.w3.org/2000/svg',width=Math.max(200,scene.getBoundingClientRect().width||400),height=Math.max(240,scene.getBoundingClientRect().height||350),ground=height-36;
    function elt(name,attrs={},text,parent=scene){const e=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;parent.appendChild(e);return e;}
    scene.replaceChildren();scene.setAttribute('viewBox',`0 0 ${width} ${height}`);
    elt('title',{id:'df-pattern-scene-title'},'升空与爆炸资源段时间示意');elt('desc',{id:'df-pattern-scene-desc'},'尾缀运动用固定时长表示。爆炸位置取当前参数，真实尾缀高度需资源支持缩放；本图不是Cascade粒子回放。');
    const burst=events.find(e=>e.role==='burst'),launch=events.find(e=>e.role==='launch'),target=burst?.position||{X:0,Y:0,Z:100},origin=launch?.position||{X:0,Y:0,Z:0};
    const points=[...events.map(e=>e.position),target,origin,{Y:0,Z:0}],maxY=Math.max(1,...points.map(p=>Math.abs(p.Y))),minZ=Math.min(0,...points.map(p=>p.Z)),maxZ=Math.max(1,...points.map(p=>p.Z)),maxRadius=Math.min(24,14*Math.max(...events.map(e=>e.size),1));
    const factor=Math.min((width/2-24-maxRadius)/maxY,(ground-30-maxRadius)/(maxZ-minZ)),project=p=>({x:width/2+p.Y*factor,y:ground-(p.Z-minZ)*factor}),o=project(origin),goal=project(target);
    elt('line',{x1:16,x2:width-16,y1:ground,y2:ground,class:'df-ground'});elt('text',{x:width/2,y:ground+23,'text-anchor':'middle'},'同一发射点');
    elt('line',{x1:o.x,y1:o.y,x2:goal.x,y2:goal.y,class:'df-guide'});
    elt('text',{x:16,y:18},`升空时长 ${flight.toFixed(2)} s · 位置为Y/Z平面示意`);
    const marks=events.map(e=>{
      const point=project(e.position),group=elt('g',{'data-sequence-index':e.index+1,'data-fire':e.fire,'data-role':e.role,'data-resource':e.resource});
      elt('title',{},`${e.index+1} · ${e.resource} · ${e.fire.toFixed(2)} s`,group);
      let trail,head;
      if(e.role==='launch'){trail=elt('line',{class:'df-trail'},undefined,group);head=elt('circle',{r:Math.min(8,3*e.size),class:'df-head'},undefined,group);}
      else if(e.role==='burst'){for(let k=0;k<12;k++){const a=k*Math.PI/6,r=Math.min(24,14*e.size);elt('line',{x1:Math.cos(a)*r*.2,y1:Math.sin(a)*r*.2,x2:Math.cos(a)*r,y2:Math.sin(a)*r,class:'df-trail'},undefined,group);}}
      else head=elt('circle',{cx:0,cy:0,r:Math.min(14,5*e.size),class:'df-head'},undefined,group);
      return {event:e,group,point,trail,head};
    });
    const tw=Math.max(200,timeline.getBoundingClientRect().width||width),left=26,right=tw-26;timeline.replaceChildren();timeline.setAttribute('viewBox',`0 0 ${tw} 70`);
    elt('line',{x1:left,x2:right,y1:30,y2:30,class:'df-ground'},undefined,timeline);const dots=events.map(e=>{const x=left+(right-left)*e.fire/duration,dot=elt('circle',{cx:x,cy:30,r:4,class:e.role==='burst'?'df-time-burst':'df-time-dot','data-fire':e.fire},undefined,timeline);elt('title',{},`第${e.index+1}段 ${e.fire.toFixed(2)} s`,dot);if(events.length<=10)elt('text',{x,y:e.index%2?16:48,'text-anchor':'middle'},String(e.index+1),timeline);return {event:e,dot};});
    elt('text',{x:left,y:65},'0 s',timeline);elt('text',{x:right,y:65,'text-anchor':'end'},duration.toFixed(2)+' s',timeline);const cursor=elt('line',{x1:left,x2:left,y1:22,y2:40,class:'df-cursor'},undefined,timeline);
    return time=>{
      for(const m of marks){const e=m.event,age=time-e.fire;m.group.setAttribute('visibility',age>=0&&age<e.life?'visible':'hidden');
        if(e.role==='launch'){const phase=Math.max(0,Math.min(1,age/flight)),q=Math.max(0,phase-.25),from=project(e.position),x=from.x+(goal.x-from.x)*phase,y=from.y+(goal.y-from.y)*phase;m.head.setAttribute('cx',x);m.head.setAttribute('cy',y);m.trail.setAttribute('x1',from.x+(goal.x-from.x)*q);m.trail.setAttribute('y1',from.y+(goal.y-from.y)*q);m.trail.setAttribute('x2',x);m.trail.setAttribute('y2',y);}
        else m.group.setAttribute('transform',`translate(${m.point.x} ${m.point.y}) scale(${e.role==='burst'?Math.max(.15,Math.min(1,.15+Math.max(0,age)*3)):1})`);
        m.group.setAttribute('opacity',e.role==='launch'?1:Math.max(0,1-age/e.life));
      }
      dots.forEach(({event,dot})=>dot.setAttribute('class',(event.role==='burst'?'df-time-burst':'df-time-dot')+(time>=event.fire?' df-active':'')));
      const x=left+(right-left)*time/duration;cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);byId('time').value=time;byId('time-value').value=time.toFixed(2)+' / '+duration.toFixed(2)+' s';
    };
  }
  return {draw};
})();
