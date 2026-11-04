// Logical choreography only. Trajectory height is not an existing UE field.
const ShowPlan = (() => {
  const profiles=ShowCatalog.profiles;
  const orders={lr:'左 → 右',rl:'右 → 左',out:'里 → 外',together:'同时出现',in:'外 → 里'};
  const defaults={resource:{profile:'blank',count:5,spread:68,layout:'uniform',order:'lr',interval:.08,start:0,scale:1,sizeJitter:0,heightJitter:0,angleJitter:0,seed:7341},template:{profile:'blank-template',count:8,spread:80,layout:'uniform',order:'out',interval:.18,start:0,scale:1,sizeJitter:0,heightJitter:0,angleJitter:0,seed:7341}};
  for(const kind of ['resource','template'])Object.assign(defaults[kind],ShowFan.options());
  const clamp=(v,min,max,fallback)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;
  function valid(input={},kind='resource'){
    kind=kind==='template'?'template':'resource';
    if(!input||typeof input!=='object')input={};
    const d=defaults[kind];
    return {profile:profiles[input.profile]?.kind===kind?input.profile:d.profile,count:Math.round(clamp(input.count,1,256,d.count)),spread:clamp(input.spread,10,140,d.spread),layout:['native','uniform','custom','center','edge'].includes(input.layout)?input.layout:d.layout,order:Object.hasOwn(orders,input.order)?input.order:d.order,interval:clamp(input.interval,0,5,d.interval),start:clamp(input.start,0,60,d.start),scale:clamp(input.scale,.5,1.5,d.scale),sizeJitter:clamp(input.sizeJitter,0,20,d.sizeJitter),heightJitter:clamp(input.heightJitter,0,12,d.heightJitter),angleJitter:clamp(input.angleJitter,0,8,d.angleJitter),seed:Math.round(clamp(input.seed,1,2147483646,d.seed)),...ShowFan.options(input)};
  }
  function noise(seed,index,channel){
    let x=(seed^Math.imul(index+1,0x9e3779b1)^Math.imul(channel+1,0x85ebca6b))>>>0;
    x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);x=(x^(x>>>16))>>>0;
    return x/4294967296*2-1;
  }
  function sample(values,u){const p=u*(values.length-1),i=Math.floor(p),q=Math.min(i+1,values.length-1);return values[i]+(values[q]-values[i])*(p-i);}
  function make(input,mode='resource'){
    mode=mode==='template'?'template':'resource';
    const s=valid(input,mode),profile=profiles[s.profile],n=s.count,errors=[];
    let angleRatios;
    try{if(s.layout==='custom')angleRatios=ShowFan.ratios(s.angleRatios,'角度配比',-1,1,true);if(mode==='resource'&&['custom','symmetric'].includes(s.sizeLayout))ShowFan.ratios(s.sizeRatios,'大小配比',.01,10);}catch(e){errors.push(e.message);}
    if(profile.isBlank&&(mode==='template'||!s.resourceId))errors.push(mode==='template'?'请先添加并选择一个完整子模板。':'请填写单簇 ResourceId。');
    if(errors.length)return {events:[],duration:profile.life,profile,errors};
    const bases=Array.from({length:n},(_,i)=>{
      if(n===1)return 0;
      const u=i/(n-1),v=u*2-1;
      if(s.layout==='native')return sample(profile.angles,u)/profile.span*s.spread;
      if(s.layout==='custom')return sample(angleRatios,u)*s.spread/2;
      if(s.layout==='center')return Math.sign(v)*Math.abs(v)**1.35*s.spread/2;
      if(s.layout==='edge')return Math.sign(v)*Math.abs(v)**.75*s.spread/2;
      return v*s.spread/2;
    });
    const events=bases.map((baseAngle,i)=>{
      const u=n===1?.5:i/(n-1),gaps=[];
      if(i>0)gaps.push(baseAngle-bases[i-1]);if(i<n-1)gaps.push(bases[i+1]-baseAngle);
      const jitterLimit=n===1?0:Math.min(s.angleJitter,Math.min(...gaps)*.35);
      const angle=Math.max(-s.spread/2,Math.min(s.spread/2,baseAngle+noise(s.seed,i,0)*jitterLimit));
      const size=s.scale*(mode==='resource'?ShowFan.size(profile,u,s.sizeLayout,s.sizeRatios):1)*(1+noise(s.seed,i,1)*s.sizeJitter/100),height=1+noise(s.seed,i,2)*s.heightJitter/100;
      let rank=0;if(s.order==='lr')rank=i;else if(s.order==='rl')rank=n-1-i;else if(s.order==='out')rank=Math.floor(Math.abs(i-(n-1)/2));else if(s.order==='in')rank=Math.min(i,n-1-i);
      const fire=s.start+rank*s.interval;
      const event={index:i,baseAngle,angle,size,height,jitterLimit,fire,burst:mode==='template'?fire+(profile.burstOffset??profile.lift):null};
      if(mode==='resource'){const model=ShowFan.model(profile,event,i,n,s);event.length=model.previewLength;event.scaleZ=model.effectScale.Z;event.targetLength=model.targetLength;event.requiresLengthApplication=model.requiresApplication;event.sourceId=model.source.FXResourceId;}
      else event.length=height;
      return event;
    });
    return {events,duration:Math.max(...events.map(e=>e.fire))+profile.life,profile,errors};
  }
  return {profiles,defaults,orders,valid,make,noise};
})();
