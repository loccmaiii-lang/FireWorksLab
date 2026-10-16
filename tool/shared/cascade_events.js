// Cascade 事件交换合同：只含通用字段，不含项目路径或私有映射。
function cascadeEventErrors(spec) {
  const errors=[], sources=new Set(), receivers=[];
  const types=new Set(['EPET_Spawn','EPET_Death','EPET_Collision','EPET_Burst']);
  const validName=x=>typeof x==='string'&&/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(x);
  for(const em of spec.emitters||[]) {
    let generators=0;
    for(const md of em.modules||[]) {
      if(!['EventGenerator','EventReceiverSpawn'].includes(md.m))continue;
      const fail=s=>errors.push('发射器 '+em.name+'：'+s);
      if(em.gpu)fail('Cascade 事件只支持 CPU 发射器');
      if(md.m==='EventGenerator') {
        if(++generators>1)fail('每个发射器只允许一个 EventGenerator');
        if(!Array.isArray(md.Events)||!md.Events.length){fail('Events 必须是非空事件数组');continue;}
        const local=new Set();
        for(const e of md.Events) {
          if(!e||!types.has(e.Type)||!validName(e.CustomName)){fail('事件 Type / CustomName 无效');continue;}
          const key=e.Type+':'+e.CustomName;
          if(local.has(key))fail('重复事件 '+key);
          local.add(key);sources.add(key);
          // UE原资产常见0；官方定义Frequency<=1为每次触发，不能错误拒绝0。
          for(const k of ['Frequency','ParticleFrequency'])if(!Number.isInteger(e[k])||e[k]<0)fail(k+' 必须是非负整数');
          for(const k of ['FirstTimeOnly','LastTimeOnly','UseReflectedImpactVector','bUseOrbitOffset'])if(k in e&&typeof e[k]!=='boolean')fail(k+' 必须为布尔');
          for(const k of Object.keys(e))if(!['Type','CustomName','Frequency','ParticleFrequency','FirstTimeOnly','LastTimeOnly','UseReflectedImpactVector','bUseOrbitOffset'].includes(k))fail('不支持事件字段 '+k);
        }
      } else {
        if(!types.has(md.EventGeneratorType)||!validName(md.EventName))fail('接收事件类型/名字无效');
        else receivers.push([md.EventGeneratorType+':'+md.EventName,em.name]);
        for(const k of ['bUseParticleTime','bUsePSysLocation','bInheritVelocity'])if(typeof md[k]!=='boolean')fail(k+' 必须显式为布尔');
        const count=md.SpawnCount;
        if(!count||Object.keys(count).some(k=>!['const','bake'].includes(k))||!Number.isInteger(count.const)||count.const<1)fail('SpawnCount 目前支持正整数常量');
        const scale=md.InheritVelocityScale;
        if(!scale||!Array.isArray(scale.const)||scale.const.length!==3||!scale.const.every(Number.isFinite))fail('InheritVelocityScale 目前支持三维有限数常量');
      }
    }
  }
  for(const [key,name]of receivers)if(!sources.has(key))errors.push('发射器 '+name+'：找不到匹配事件源 '+key);
  return errors;
}
function cascadeEventText(events) {
  const flag=x=>x?'True':'False';
  return '('+events.map(e=>`(Type=${e.Type},Frequency=${e.Frequency},ParticleFrequency=${e.ParticleFrequency},FirstTimeOnly=${flag(e.FirstTimeOnly)},LastTimeOnly=${flag(e.LastTimeOnly)},UseReflectedImpactVector=${flag(e.UseReflectedImpactVector)},bUseOrbitOffset=${flag(e.bUseOrbitOffset)},CustomName="${e.CustomName}")`).join(',')+')';
}
