/* 周期轨迹重建的体积火舌。所有噪声使用年龄和稳定种子，不依赖累积帧。 */
const FlameVolume = (() => {
  const defaults={sourceScale:[1,1,1],sourceOffset:[0,0,0],flameDensity:8,flameDepth:1,flameNoise:.65,flameDetail:.3,flameScale:.16,flameWarp:.07,flameRise:.7,flameTip:.04,flameFloorEnabled:1,flameFloor:0,flameSteps:24};
  const value=(e,k)=>e[k]??defaults[k];
  function parameterDefault(k){
    if(k==='sparkGraph.spaceScale')return 1;
    const m=/^sparkGraph\.emitters\[[^\]]*\]\.(\w+)(?:\.(\d))?$/.exec(k);
    if(!m||!Object.hasOwn(defaults,m[1]))return undefined;
    const v=defaults[m[1]];return m[2]===undefined?(Array.isArray(v)?[...v]:v):v[+m[2]];
  }
  function validate(e){
    for(const k of ['sourceScale','sourceOffset']){const a=value(e,k);if(!Array.isArray(a)||a.length!==3||!a.every(Number.isFinite)||(k==='sourceScale'&&a.some(v=>v<0)))throw Error(e.name+'：源范围/偏移须为有限三维向量，范围不能为负');}
    if(e.shape!=='flame')return;
    for(const k of ['flameDensity','flameDepth','flameNoise','flameDetail','flameScale','flameWarp','flameRise','flameTip','flameFloor','flameSteps','flameFloorEnabled'])if(!Number.isFinite(value(e,k)))throw Error(e.name+'：'+k+'须为有限数');
    if(value(e,'flameWarp')<0)throw Error('火焰卷曲位移须非负');
    if(value(e,'flameDensity')<0||value(e,'flameDepth')<=0||value(e,'flameScale')<.001)throw Error(e.name+'：密度须非负、纵深须大于0、细节尺度至少0.001m');
    for(const k of ['flameNoise','flameDetail','flameTip'])if(value(e,k)<0||value(e,k)>1)throw Error(e.name+'：'+k+'须在0–1之间');
    if(![0,1].includes(value(e,'flameFloorEnabled')))throw Error('地面截断开关须为0或1');
    const n=value(e,'flameSteps');if(!Number.isInteger(n)||n<8||n>64)throw Error('火焰积分样本须为8–64整数');
  }
  function source(e,p){const s=value(e,'sourceScale'),o=value(e,'sourceOffset');return p.map((x,i)=>x*s[i]+o[i]);}
  const has=P=>!!P?.sparkGraph?.emitters.some(e=>e.shape==='flame');
  // 每实例 8 个 vec4：四个中心/半径、光学参数、噪声、细节/截断、积分设置。
  function geometry(graph,time,only=null){
    const out=[];let count=0;
    for(const q of graph.all){const e=q.e;if(e.shape!=='flame'||e.enabled===false||(only&&e.id!==only))continue;
      const age=SparkGraph.mod(time-q.birth,graph.recipe.period);if(age>=q.life)continue;
      const u=age/q.life,fade=Math.min(1,age/.045)*Math.min(1,(q.life-age)/.12),power=q.power*SparkGraph.curve(e.brightCurve,u)*fade;
      const radius=q.width*.5*SparkGraph.curve(e.sizeCurve,u);if(power<=0||radius<=0||value(e,'flameDensity')===0)continue;
      for(let j=0;j<4;j++){const f=j/3,p=SparkGraph.sample(q,age*f).p;out.push(...p,radius*(1-f+value(e,'flameTip')*f));}
      out.push(power,value(e,'flameDensity'),value(e,'flameDepth'),q.phase,
        value(e,'flameNoise'),value(e,'flameScale'),value(e,'flameRise')*age,value(e,'flameDetail'),
        value(e,'flameFloor'),value(e,'flameFloorEnabled'),value(e,'flameSteps'),value(e,'flameWarp'),
        0,0,0,0);
      if(++count>4096)throw Error('同时可见的体积火舌超过4096；请减少每周期数量或寿命');
    }
    return new Float32Array(out);
  }
  function inertWhy(k,P){
    if(has(P)&&k.startsWith('camera')&&(!['cameraMotion','cameraDof'].includes(k)||!P[k]))return '体积火焰暂不支持粒子镜头成像；运动采样可用输出中的快门比例';
    const m=/^sparkGraph\.emitters\[([^\]]+)\]\.(\w+)/.exec(k);if(!m)return '';
    const e=P.sparkGraph?.emitters.find(x=>x.id===m[1]);if(!e)return '';
    if(Object.hasOwn(defaults,m[2])&&typeof graphSources43==='function'&&!graphSources43(P).some(x=>x.id===e.id))return '该层没有有效粒子来源或可见后代，请先检查数量和亲子生成条件';
    if(['sourceScale','sourceOffset'].includes(m[2])&&e.parent)return '子粒位置继承母粒轨迹，出生范围和源中心只用于根层';
    if(m[2]==='sourceScale'&&e.extent===0)return '出生半径为0，范围倍率不起作用';
    if(m[2].startsWith('flame')){
      if(e.shape!=='flame')return '仅体积火焰使用';
      if(e.enabled===false)return '这一层已隐藏';
      if(!e.width||!(P.sparkGraph.scaleWidth??1)||(e.parent&&!(P.sparkGraph.branchWidth??1))||!e.size[1]||(e.sizeCurve.length&&!e.sizeCurve.some(k=>k[1]>0)))return '有效火舌宽度为0，请增加粒子大小或大小曲线';
      if(!e.gain||!(P.sparkGraph.scaleGain??1)||!e.power[1]||(e.brightCurve.length&&!e.brightCurve.some(k=>k[1]>0)))return '有效亮度为0，请增加亮度或亮度曲线';
      if(m[2]!=='flameDensity'&&value(e,'flameDensity')===0)return '火焰密度为0，没有可见火焰';
      if(m[2]==='flameFloor'&&!value(e,'flameFloorEnabled'))return '地面截断已关闭';
      if(['flameScale','flameRise'].includes(m[2])&&!value(e,'flameNoise')&&!value(e,'flameDetail')&&!value(e,'flameWarp'))return '侵蚀和卷曲均为0，不计算火焰细节';
    }
    return '';
  }
  return {defaults,value,parameterDefault,validate,source,has,geometry,inertWhy};
})();
