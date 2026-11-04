  // Explicit user import policy. Preview distance is never a culling distance.
  // v2.28：bounds = 这次要写的固定盒（包里的 system.fixed_bounds / 旧包更新时保留的手调盒），没有就照旧 ±100000
  // v2.30：LODMethod 按包判断（用户 10-23）：有启用的发射器无限循环（loops = 0）→ Automatic（定期按距离重算），否则 → ActivateAutomatic（激活时定一次档）
  function lodMethodFor(spec){
    const looping=(spec&&Array.isArray(spec.emitters)?spec.emitters:[]).some(es=>es&&es.enabled!==false&&(es.required||{}).loops===0);
    return looping?'PARTICLESYSTEMLODMETHOD_Automatic':'PARTICLESYSTEMLODMETHOD_ActivateAutomatic';
  }
  function particleSystemPolicy(bounds=null,spec=null){return {
    UpdateTime_FPS:10,UpdateTime_Delta:0.1,SystemUpdateMode:'EPSUM_FixedTime',
    WarmupTime:0,WarmupTickRate:0,SecondsBeforeInactive:0,bOrientZAxisTowardCamera:false,
    MaxVRSShadingRate:'VRS_2X2',ForceVRSShadingRate:'VRS_None',
    ThumbnailWarmup:1,bUseRealtimeThumbnail:false,LODDistanceCheckTime:1,
    LODDistances:'(0.000000)',LODMethod:lodMethodFor(spec),
    CullingDistance:120000,CullingScreenSize:0.012,
    bUseFixedRelativeBoundingBox:true,bUseRenderingOrderBoundingBox:false,
    FixedRelativeBoundingBox:bounds?resourceBoundsText(bounds):'(Min=(X=-100000,Y=-100000,Z=-100000),Max=(X=100000,Y=100000,Z=100000),IsValid=1)'
  };}
  function gpuEmitterKey(es,index){return index+':'+JSON.stringify(stableValue(es));}
  function gpuDrawLimits(it){
    if(it.selectedAssetKeys!==undefined&&!assetSelected(it,'ps'))return [];
    const number=(v,label,min=0)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min)throw Error(label+' 必须是有限数且 ≥ '+min);return v;};
    const integer=(v,label,min=0)=>{number(v,label,min);if(!Number.isInteger(v)||v>2147483647)throw Error(label+' 必须是有效整数');return v;};
    const maximum=(d,label)=>{
      if(!d||typeof d!=='object'||Array.isArray(d))throw Error(label+' 缺少有效分布');
      const forms=['const','uniform','curve'].filter(k=>Object.hasOwn(d,k));
      if(forms.length!==1||Object.keys(d).some(k=>!['const','uniform','curve','bake'].includes(k))||('bake'in d&&typeof d.bake!=='boolean'))throw Error(label+' 分布格式无效');
      if(forms[0]==='const')return number(d.const,label);
      if(forms[0]==='uniform'){
        if(!Array.isArray(d.uniform)||d.uniform.length!==2)throw Error(label+' 随机范围无效');
        const lo=number(d.uniform[0],label),hi=number(d.uniform[1],label);if(lo>hi)throw Error(label+' 范围倒置');return hi;
      }
      if(!Array.isArray(d.curve)||!d.curve.length)throw Error(label+' 曲线不能为空');
      let last=-1,max=0;for(const key of d.curve){if(!Array.isArray(key)||key.length!==2)throw Error(label+' 关键帧格式无效');const t=number(key[0],label+' 时间');if(t<=last)throw Error(label+' 时间必须递增');last=t;max=Math.max(max,number(key[1],label));}return max;
    };
    return (it.spec.emitters||[]).flatMap((es,index)=>{
      if(!es.gpu)return [];
      const key=gpuEmitterKey(es,index),label='GPU '+es.name,rq=es.required||{},sp=es.spawn||{};
      const duration=number(rq.duration_s??1,label+' 发射周期',Number.MIN_VALUE),loops=integer(rq.loops??0,label+' 循环次数');
      const rate=maximum(sp.rate,label+' 生成速率');
      const lifeModules=(es.modules||[]).filter(m=>m.m==='Lifetime');
      const life=lifeModules.length?lifeModules.reduce((total,m)=>{const v=maximum(m.Lifetime,label+' 最大寿命');return v===0?Infinity:total+v;},0):Infinity;
      if(sp.bursts!==undefined&&!Array.isArray(sp.bursts))throw Error(label+' Burst 格式无效');
      let burst=0;for(const b of sp.bursts||[]){if(!Array.isArray(b)||b.length!==2)throw Error(label+' Burst 格式无效');number(b[0],label+' Burst 时间');burst+=integer(b[1],label+' Burst 数量');}
      const window=life+0.1,cycles=Math.min(loops||Infinity,Math.ceil(window/duration)+1);
      const seconds=Math.min(window,loops?duration*loops+0.1:Infinity);
      // Zero terms do not turn an otherwise empty/finite emitter into NaN.
      const calculated=Math.max(1,Math.ceil((rate?rate*seconds:0)+(burst?burst*cycles:0)+1));
      const raw=it.gpuMeasuredPeaks?.[key];
      const measured=raw===undefined||raw===''?null:integer(raw,label+' 实机峰值',1);
      if(!Number.isFinite(calculated)||calculated>2147483647){
        if(measured===null)throw Error(label+' 无法得到有限上限，请补充寿命/有限循环或填写实机峰值');
      }
      return [{index,key,name:es.name,calculated:Number.isFinite(calculated)&&calculated<=2147483647?calculated:null,limit:measured??calculated,source:measured===null?'calculated':'measured'}];
    });
  }
  function particlePolicyErrors(it){try{gpuDrawLimits(it);return [];}catch(e){return [e.message||String(e)];}}
  async function verifyParticleSystemPolicy(PS,bounds=null,spec=null){
    const got=await props(PS),want=particleSystemPolicy(bounds,spec),bad=[];
    for(const [k,v]of Object.entries(want)){
      if(k==='FixedRelativeBoundingBox'){
        const b=got[k];
        if(bounds){const r=resourceBoundsRead(b);if(!r||!r.valid||!resourceBoundsSame(r,bounds))bad.push(k);}     // v2.28 结构体或文本都按数值比
        else if(typeof b==='string'){if(b!==v)bad.push(k);}
        else if(!b||!['X','Y','Z'].every(a=>b.Min?.[a]===-100000&&b.Max?.[a]===100000)||!b.IsValid)bad.push(k);
      }else if(k==='LODDistances'){if(!Array.isArray(got[k])||got[k].length!==1||got[k][0]!==0)bad.push(k);}
      else if(typeof v==='number'){if(!Number.isFinite(got[k])||Math.abs(got[k]-v)>1e-5)bad.push(k);}
      else if(got[k]!==v)bad.push(k);
    }
    if(bad.length)throw Error('粒子系统规范读回不一致：'+bad.join(','));
  }
