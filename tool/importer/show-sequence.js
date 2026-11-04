// A sequence describes fixed Cascade durations, not ballistic flight physics.
const ShowSequence = (() => {
  const clone=value=>JSON.parse(JSON.stringify(value));
  const sizes={small:{name:'小型',flight:3.5,height:''},medium:{name:'中型',flight:5,height:250},large:{name:'大型',flight:8,height:400}};
  function stage(entry,role='other'){return {role,entry:clone(entry),extraDelay:0};}
  function preset(key=''){
    const profile=ShowCatalog.profiles[key];return profile&&!profile.isBlank?fromRecord(profile.source,key):blank();
  }
  function blank(){
    const entry=()=>({FXResourceId:'',LocalTimeOffset:0,PositionOffset:ShowText.vector(),RotationOffset:ShowText.rotator(),RandomPositionRange:ShowText.vector(),RandomRotationRange:ShowText.rotator(),EffectScale:ShowText.vector(1,1,1),RandomScaleRatio:0,Filter:ShowText.filter()});
    return {profile:'',category:'custom',flight:8,maximumHeight:'',baseHeight:'',start:0,roll:0,scale:1,sizeJitter:0,angleJitter:0,heightJitter:0,seed:7341,applyHeightScale:false,stages:[stage(entry(),'launch'),stage(entry(),'burst')]};
  }
  function fromRecord(record,key=''){
    const source=ShowText.subtemplate(record),first=source.Entries[0],burstIndex=source.Entries.findIndex((e,i)=>i>0&&e.PositionOffset.Z>first.PositionOffset.Z&&e.LocalTimeOffset>first.LocalTimeOffset),burst=source.Entries[burstIndex],height=burst?burst.PositionOffset.Z/100:0,flight=burst?burst.LocalTimeOffset-first.LocalTimeOffset:8;
    // Native text has no Cascade-duration field. Infer only this first delay;
    // all remaining entry times and positions stay literal.
    return {...blank(),profile:key,category:'custom',flight,maximumHeight:height||'',baseHeight:height||'',stages:source.Entries.map((e,i)=>stage(e,burst&&i===0?'launch':i===burstIndex?'burst':'other'))};
  }
  const bounded=(value,min,max,fallback)=>value!==''&&value!==null&&Number.isFinite(Number(value))?Math.min(max,Math.max(min,Number(value))):fallback;
  function restore(value){
    if(!value||typeof value!=='object'||!Array.isArray(value.stages)||!value.stages.length)return preset();
    try{
      const result={...preset(),...value,stages:value.stages.slice(0,256).map(s=>{const draftId=typeof s.entry?.FXResourceId==='string'?s.entry.FXResourceId.slice(0,256):'',entry=ShowText.entry({...s.entry,FXResourceId:'Unfilled_Draft'});entry.FXResourceId=draftId;return {...stage(entry,['launch','burst','other'].includes(s.role)?s.role:'other'),extraDelay:bounded(s.extraDelay,0,3600,0)};})};
      for(const [key,min,max,fallback] of [['flight',.01,3600,8],['start',0,3600,0],['roll',-180,180,0],['scale',.01,10,1],['sizeJitter',0,50,0],['angleJitter',0,45,0],['heightJitter',0,100,0],['seed',1,2147483646,7341]])result[key]=bounded(value[key],min,max,fallback);
      result.maximumHeight=value.maximumHeight===''?'':bounded(value.maximumHeight,.01,10000,'');result.baseHeight=value.baseHeight===''?'':bounded(value.baseHeight,.01,10000,'');result.applyHeightScale=value.applyHeightScale===true;return result;
    }catch{return preset();}
  }
  function rotateRoll(position,angle){const a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return {X:position.X,Y:position.Y*c+position.Z*s,Z:position.Z*c-position.Y*s};}
  function make(config,templateName='Firework_Custom'){
    const errors=[],n=config.stages.length;
    if(!n||n>256)throw Error('资源段数量须为1–256。');
    const noise=ShowPlan.noise,commonRoll=config.roll+noise(config.seed,0,10)*config.angleJitter,sizeFactor=config.scale*(1+noise(config.seed,0,11)*config.sizeJitter/100),hasBurst=config.stages.some(s=>s.role==='burst');
    if(hasBurst&&(!Number.isFinite(Number(config.maximumHeight))||Number(config.maximumHeight)<=0))errors.push('请填写最高爆炸高度（米）；小型高度由你决定。');
    if(config.applyHeightScale&&(!Number.isFinite(Number(config.baseHeight))||Number(config.baseHeight)<=0))errors.push('启用尾缀Z缩放前，请填写资源原始高度。');
    const upper=Number(config.maximumHeight)||0,height=upper*(1-(noise(config.seed,0,12)+1)/2*config.heightJitter/100),heightRatio=config.applyHeightScale&&Number(config.baseHeight)>0?height/Number(config.baseHeight):1;
    const firstLaunch=config.stages.find(s=>s.role==='launch'),launchTime=config.start+(firstLaunch?.entry.LocalTimeOffset||0),events=[],entries=[];
    config.stages.forEach((stage,index)=>{
      let entry;
      try{entry=ShowText.entry(stage.entry);}catch(e){errors.push('第'+(index+1)+'段：'+e.message);entry=clone(stage.entry);}
      const actualTime=stage.role==='burst'?launchTime+config.flight+(stage.extraDelay||0):config.start+(entry.LocalTimeOffset||0),position={...entry.PositionOffset},rotation={...entry.RotationOffset},scale={...entry.EffectScale};
      if(stage.role==='burst')position.Z=height*100;
      for(const [channel,key] of ['X','Y','Z'].entries())position[key]+=noise(config.seed,index,20+channel)*(entry.RandomPositionRange?.[key]||0);
      for(const [channel,key] of ['Pitch','Yaw','Roll'].entries())rotation[key]+=noise(config.seed,index,24+channel)*(entry.RandomRotationRange?.[key]||0);
      // UE Roll rotates +Z toward +Y. Verified with the native math library.
      const transformed=rotateRoll(position,commonRoll);if(stage.role==='burst')transformed.Z=Math.min(upper*100,transformed.Z);rotation.Roll+=commonRoll;
      const localSize=1+noise(config.seed,index,28)*(entry.RandomScaleRatio||0);
      for(const axis of ['X','Y','Z'])scale[axis]*=sizeFactor*localSize;
      if(stage.role==='launch'&&config.applyHeightScale)scale.Z=entry.EffectScale.Z*heightRatio;
      const out={...entry,LocalTimeOffset:actualTime,PositionOffset:transformed,RotationOffset:rotation,RandomPositionRange:ShowText.vector(),RandomRotationRange:ShowText.rotator(),EffectScale:scale,RandomScaleRatio:0};
      entries.push(out);events.push({index,role:stage.role,fire:actualTime,position:transformed,size:Math.cbrt(Math.max(.000001,scale.X*scale.Y*scale.Z)),angle:rotation.Roll,height:stage.role==='burst'?height:0,life:stage.role==='launch'?config.flight:.9,resource:entry.FXResourceId||'未填写 ResourceId'});
    });
    const record={TemplateName:templateName,Entries:entries},duration=Math.max(.9,...events.map(e=>e.fire+e.life));
    return {record,events,duration,errors,chosenHeight:height,heightRatio,launchTime,flight:config.flight,heightScalePending:hasBurst&&!config.applyHeightScale};
  }
  return {sizes,preset,blank,fromRecord,restore,make,rotateRoll};
})();
