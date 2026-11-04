// Confirmed native tuple fields only; absolute track time stays in the schedule.
const ShowProjectExport=(()=>{
  const vector=ShowText.vector,rotator=ShowText.rotator,fmt=x=>Number(x).toFixed(6),quote=x=>'"'+String(x).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"';
  const v=x=>'(X='+fmt(x.X)+',Y='+fmt(x.Y)+',Z='+fmt(x.Z)+')',r=x=>'(Pitch='+fmt(x.Pitch)+',Yaw='+fmt(x.Yaw)+',Roll='+fmt(x.Roll)+')';
  const filter={...ShowBlueprintData.parentFilter};
  function base(resourceId,time=0,z=0,scale=1){return ShowText.entry({FXResourceId:resourceId,LocalTimeOffset:time,PositionOffset:vector(0,0,z),EffectScale:vector(scale,scale,scale),RandomPositionRange:vector(),RandomRotationRange:rotator(),RandomScaleRatio:0,Filter:{...filter}});}
  function parentText(record){const f='(PlatformFlags='+filter.PlatformFlags+',MinQualityLevel='+filter.MinQualityLevel+')';return '(TemplateName='+quote(record.TemplateName)+',RequiredPointCount='+record.RequiredPointCount+',Entries=('+record.Entries.map(e=>'(EntryType=SubTemplate,FXResourceId="None",SubTemplateName='+quote(e.SubTemplateName)+',LocalTimeOffset='+fmt(e.LocalTimeOffset)+',SlotIndex='+e.SlotIndex+',PositionOffset='+v(e.PositionOffset)+',RotationOffset='+r(e.RotationOffset)+',RandomPositionRange='+v(vector())+',RandomRotationRange='+r(rotator())+',EffectScale='+v(vector(1,1,1))+',RandomScaleRatio=0.000000,Filter='+f+')').join(',')+'),Filter='+f+')';}
  function make(doc,compiled){
    if(ShowProject.fingerprint(doc)!==compiled.fingerprint)throw Error('工程已改变，计算指纹失效，请重新生成。');
    if(compiled.errors.length)throw Error(compiled.errors.join('\n'));
    if(!compiled.shots.length)throw Error('工程没有可导出的发射事件。');
    const children=[],parents=[],schedule=[],childMap=new Map(),resource=binding=>doc.resources.find(r=>r.id===binding?.id);
    function child(row){
      const s=doc.shots.find(s=>s.id===row.shotId),entries=[];
      if(s.kind==='raw')for(const [i,source] of s.source.Entries.entries()){
        const e=ShowText.entry(source),out=ShowProject.clone(e),key=row.id+'/raw/'+i;
        for(const a of ['X','Y','Z'])out.PositionOffset[a]+=ShowProject.noise(doc.seed,key,'position-'+a)*e.RandomPositionRange[a];
        for(const a of ['Pitch','Yaw','Roll'])out.RotationOffset[a]+=ShowProject.noise(doc.seed,key,'rotation-'+a)*e.RandomRotationRange[a];
        const size=1+ShowProject.noise(doc.seed,key,'raw-size')*e.RandomScaleRatio;for(const a of ['X','Y','Z'])out.EffectScale[a]*=size*row.sizeFactor;
        out.RandomPositionRange=vector();out.RandomRotationRange=rotator();out.RandomScaleRatio=0;out.Filter={...filter};entries.push(out);
      }
      else if(s.kind==='fan')for(let i=0;i<s.fanCount;i++){
        const rank=ShowProject.fanRank(s,i);
        const e=base(resource(s.fanRef).resourceId,rank*s.fanIntervalS,0,row.sizeFactor);e.RotationOffset.Roll=s.fanCount===1?0:-s.fanSpreadDeg/2+i*s.fanSpreadDeg/(s.fanCount-1);entries.push(e);
      }
      else {
        if(s.trailRef){const e=base(resource(s.trailRef).resourceId);e.EffectScale={...row.trailScale};entries.push(e);}
        entries.push(base(resource(s.burstRef).resourceId,row.flightS,row.riseM*100,row.burstScale));
      }
      const signature=ShowProject.fingerprint({shot:s.id,entries}),existing=childMap.get(signature);if(existing)return existing;
      const name=s.name.slice(0,190)+'_Resolved_'+signature.split(':')[1],record={TemplateName:name,Entries:entries},out={shotId:s.id,name,record,text:ShowText.stringify(record),signature};children.push(out);childMap.set(signature,out);return out;
    }
    for(const c of doc.cues.filter(c=>c.enabled!==false)){
      const rows=compiled.shots.filter(s=>s.cueId===c.id);if(!rows.length)continue;
      const trigger=Math.min(...rows.map(r=>r.launchS)),pointIds=[...new Set(rows.map(r=>r.pointId))].sort((a,b)=>compiled.points.findIndex(p=>p.id===a)-compiled.points.findIndex(p=>p.id===b));
      const name='Show_'+c.id.replace(/[^A-Za-z0-9_]/g,'_').slice(0,120)+'_'+compiled.fingerprint.split(':')[1];
      const record={TemplateName:name,RequiredPointCount:pointIds.length,Entries:rows.map(row=>({EntryType:'SubTemplate',FXResourceId:'None',SubTemplateName:child(row).name,LocalTimeOffset:ShowProject.round(row.launchS-trigger),SlotIndex:pointIds.indexOf(row.pointId),PositionOffset:vector(),RotationOffset:rotator(0,row.point.yawDeg,row.angleDeg),RandomPositionRange:vector(),RandomRotationRange:rotator(),EffectScale:vector(1,1,1),RandomScaleRatio:0,Filter:{...filter}})),Filter:{...filter}};
      const p={cueId:c.id,name:c.name,record,text:parentText(record),triggerS:ShowProject.round(trigger+doc.preRollS),logicalTriggerS:trigger,targetS:c.timeS,clock:c.clock,slots:pointIds.map((id,index)=>({index,point:compiled.points.find(p=>p.id===id)}))};parents.push(p);
      schedule.push({cueId:c.id,name:c.name,parentName:name,triggerS:p.triggerS,logicalTriggerS:trigger,targetBurstS:c.clock==='burst'?c.timeS:null,preFire:rows.some(r=>r.preFire),slots:p.slots});
    }
    const parts=['DF 烟花编排联动 v1 · PC','工程：'+doc.name,'模型：'+ShowProject.VERSION+' / 指纹：'+compiled.fingerprint,'所有时间单位秒，位置单位cm；整场预卷：'+fmt(doc.preRollS),'此TXT是分项复制清单，不能将整包一次粘贴为一个BP字段。','资源按PC选择；Filter沿用当前BP原值'+filter.PlatformFlags+'，专属PC平台位尚未核验。','缩放、轨迹、平台位与槽位适配尚未真实UE粘贴/实播验收。','目标花径/升高未标定时保留手填倍率；不能用旧TR2/V5/Zoom公式代替新素材标定。',...compiled.warnings.map(x=>'注意：'+x),'','【1 · 完整单发 → EffectSubTemplates 新增数组项】'];
    for(const c of children)parts.push(c.name,c.text,'');
    parts.push('【2 · 阵型 → 对应编排BP的 EffectTemplate】','发射点槽位按下面次序填入BP；槽位世界旋转保持0，本模板RotationOffset已包含各点朝向。');
    for(const p of parents){parts.push(p.name+' | 外部触发 '+fmt(p.triggerS)+' s | 目标 '+fmt(p.targetS)+' s（'+(p.clock==='burst'?'起爆':'发射')+'）');for(const {index,point} of p.slots)parts.push('Slot '+index+' = '+point.id+' | 世界位置cm ('+fmt(point.xM*100)+','+fmt(point.yM*100)+','+fmt(point.zM*100)+')');parts.push(p.text,'');}
    parts.push('【3 · 逐发绝对时间表（逻辑时间，不含预卷）】','事件\t点\t单发\t发射s\t起爆s\t相对升高m\t世界炸高m\t目标花径m');
    for(const row of compiled.shots)parts.push([row.cueName,row.pointId,row.shotName,fmt(row.launchS),fmt(row.burstS),fmt(row.riseM),fmt(row.worldBurst.Z/100),fmt(row.diameterM)].join('\t'));
    parts.push('','【4 · 自动统计（系统峰值是估算，不是GPU性能测试）】',JSON.stringify(compiled.stats));
    return {children,parents,schedule,allText:parts.join('\n'),fingerprint:compiled.fingerprint};
  }
  return {make,parentText};
})();
