export function geometryAudit(template,source){
 const entries=source?.sub?.Entries||[],bursts=entries.filter(e=>!/Trail|Fan|Comet/i.test(e.FXResourceId||''));
 const base=template.zone==='front'?50:150;
 const target={riseM:template.flightHeight??Math.max(0,(template.burstZ??template.z??base)-base),delayS:template.flightS??template.rise??0,diameterM:template.diameter};
 const anchors=bursts.map(e=>({resource:e.FXResourceId,heightM:(e.PositionOffset?.Z||0)/100,delayS:e.LocalTimeOffset||0}));
 const hasTrail=entries.some(e=>/Trail/i.test(e.FXResourceId||''));
 return {target,anchors,hasTrail,geometryVerified:false,needsRise:bursts.length>0&&target.riseM>0&&!hasTrail,diameterStatus:'unmeasured',note:'来源是条目偏移和触发延迟，尚非实际粒子轨迹或可见花径；最终位置还受点位与父级变换影响。'};
}
