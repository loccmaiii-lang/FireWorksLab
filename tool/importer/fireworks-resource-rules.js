  // v2.28 资源规范四项（FireWorksLab 烘焙器 4.9.113 的 cascade 字段，spec/cascade_params_v1.md §1.3；用户 2026-10-18 同意改导入器）
  //   system.fixed_bounds → FixedRelativeBoundingBox；required.uv_flip → UVFlippingMode；materials[k].emissive_dissolve → EmissiveDissolve。
  //   新包（带 resource_rules）按包写；旧包（4.9.113 以前导出，没有 resource_rules）「更新」已有资产时保留 UE 现值，不回到默认。
  const RESOURCE_UV_FLIP=new Set(['None','RandomFlipUOnly']);
  const RESOURCE_DISSOLVE_PARAM='EmissiveDissolve';
  const RESOURCE_DEFAULT_BOUNDS={min:[-100000,-100000,-100000],max:[100000,100000,100000]};
  const resourceNewPackage=spec=>!!(spec&&spec.resource_rules&&typeof spec.resource_rules==='object');
  function resourceBoundsOf(spec){
    const b=spec&&spec.system&&spec.system.fixed_bounds;
    if(!b||!Array.isArray(b.min)||!Array.isArray(b.max)||b.min.length!==3||b.max.length!==3)return null;
    if(![...b.min,...b.max].every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e7))return null;
    return b.min.every((v,i)=>v<b.max[i])?{min:[...b.min],max:[...b.max]}:null;
  }
  function resourceRulesErrors(spec){
    const errors=[],b=spec&&spec.system&&spec.system.fixed_bounds;
    // 用户 10-18 永远的禁忌：包里不许要求 NeverStream（导入器也总是写 false）
    for(const [key,t]of Object.entries((spec&&spec.textures)||{}))if(t&&Object.keys(t).some(k=>/^never_?stream$/i.test(k)&&t[k]))errors.push('贴图 '+key+' 要求 NeverStream：项目永远不勾（会常驻、不能流送）');
    if(b!==undefined&&!resourceBoundsOf(spec))errors.push('system.fixed_bounds 需为 {min:[x,y,z],max:[x,y,z]}，有限数字且每轴 min < max');
    for(const em of (spec&&spec.emitters)||[]){
      const f=em&&em.required&&em.required.uv_flip;
      if(f!==undefined&&!RESOURCE_UV_FLIP.has(f))errors.push('发射器 '+em.name+' 的 uv_flip 只支持 None / RandomFlipUOnly：'+f);
    }
    for(const [key,m]of Object.entries((spec&&spec.materials)||{})){
      if(!m||m.emissive_dissolve===undefined)continue;
      const v=m.emissive_dissolve,role=MAP.material_roles[m.role];
      if(typeof v!=='number'||!Number.isFinite(v)||v<=0||v>1)errors.push('材质 '+key+' 的 emissive_dissolve 需为 (0, 1] 的数字');
      else if(role&&!role.template)errors.push('材质 '+key+' 是借用材质，不能写 emissive_dissolve');
    }
    return errors;
  }
  const resourceBoundsText=b=>'(Min=(X='+b.min[0]+',Y='+b.min[1]+',Z='+b.min[2]+'),Max=(X='+b.max[0]+',Y='+b.max[1]+',Z='+b.max[2]+'),IsValid=1)';
  // 读回的盒（结构体或文本）→ {min,max}；读不出返回 null
  function resourceBoundsRead(v){
    if(v&&typeof v==='object'&&v.Min&&v.Max)return{min:['X','Y','Z'].map(a=>Number(v.Min[a])),max:['X','Y','Z'].map(a=>Number(v.Max[a])),valid:!!v.IsValid};
    const m=typeof v==='string'&&/Min=\(X=([-\d.eE+]+),Y=([-\d.eE+]+),Z=([-\d.eE+]+)\),Max=\(X=([-\d.eE+]+),Y=([-\d.eE+]+),Z=([-\d.eE+]+)\)(?:,IsValid=(\w+))?/.exec(v);
    return m?{min:m.slice(1,4).map(Number),max:m.slice(4,7).map(Number),valid:m[7]===undefined||/^(1|true)$/i.test(m[7])}:null;
  }
  const resourceBoundsSame=(a,b)=>!!a&&!!b&&[0,1,2].every(i=>Math.abs(a.min[i]-b.min[i])<=0.5&&Math.abs(a.max[i]-b.max[i])<=0.5);
  // 这次要写的盒：包里有就按包；包里没有（旧包，或新包里有不认识的移动模块没算），更新时 UE 里已是手调（非 ±100000）的盒就保留；其余照旧 ±100000
  function resourceTargetBounds(spec,current){
    const own=resourceBoundsOf(spec);if(own)return own;
    if(current&&current.bUseFixedRelativeBoundingBox===true){
      const b=resourceBoundsRead(current.FixedRelativeBoundingBox);
      if(b&&b.valid&&!resourceBoundsSame(b,RESOURCE_DEFAULT_BOUNDS)&&b.min.every((v,i)=>v<b.max[i]))return{min:b.min,max:b.max};
    }
    return null;
  }
  // 旧包更新：按发射器名记下 UE 里现有的 Required 朝向 / 翻转（只读）
  async function resourcePreviousRequired(previousPS){
    const out=new Map();
    for(const e of (previousPS&&previousPS.Emitters)||[]){
      const path=e&&e.path;if(!path)continue;
      const ep=await props(path),lod=(ep.LODLevels||[])[0],lodPath=lod&&lod.path;if(!lodPath)continue;
      const lp=await props(lodPath),rq=lp.RequiredModule&&lp.RequiredModule.path;if(!rq)continue;
      const r=await props(rq);out.set(String(ep.EmitterName||''),{ScreenAlignment:r.ScreenAlignment,UVFlippingMode:r.UVFlippingMode});
    }
    return out;
  }
  // Required 里这两项该写什么（新包按包；旧包更新保留 UE 现值）
  function resourceRequiredFields(spec,es,rd,previous){
    const rq=es.required||{},out={};
    if(rq.uv_flip)out.UVFlippingMode=rq.uv_flip;
    else if(!resourceNewPackage(spec)&&previous&&previous.UVFlippingMode)out.UVFlippingMode=previous.UVFlippingMode;
    if(!resourceNewPackage(spec)&&previous&&previous.ScreenAlignment==='PSA_FacingCameraPosition'&&rd.ScreenAlignment==='PSA_Rectangle')out.ScreenAlignment='PSA_FacingCameraPosition';
    return out;
  }
  // 材质实例的 EmissiveDissolve：新包按包；旧包更新保留实例里原来覆盖的值
  function resourceDissolveValue(spec,m,currentMI){
    if(typeof m.emissive_dissolve==='number')return m.emissive_dissolve;
    if(resourceNewPackage(spec)||!currentMI)return null;
    const v=(currentMI.ScalarParameterValues||[]).find(s=>s.ParameterInfo&&s.ParameterInfo.Name===RESOURCE_DISSOLVE_PARAM);
    return v&&Number.isFinite(Number(v.ParameterValue))?Number(v.ParameterValue):null;
  }
