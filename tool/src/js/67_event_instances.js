// 4.9.111 通用CPU事件实例：一个序列图层由一组飞行粒子死亡后生成。
// 单位为m、s；参数随图层保存，模拟和Cascade导出共同消费；缺省不启用。
const EventInstances = (() => {
  const defaults = () => ({ count:4, seed:1101, flight:[.35,.95], speed:[145,205], drag:4,
    gravity:1, inherit:.35, childDrag:1.6, childGravity:.2, sizeJit:.05, rotation:1,
    color:'fixed', colorMin:[.015148,0,0], colorMax:[1,.42806,1],
    headSize:[.95,1.05], headColor:'#ffb060', flash:false, flashLife:.12, flashSize:10, flashAlpha:.5 });
  const on = L => !!(L && L.eventSpawn);
  const config = L => ({ ...defaults(), ...(L.eventSpawn || {}) });
  const outputReason=(L,pf,v)=>on(L)&&!(pf==='pc'?['seq','off'].includes(v):v==='off')?'CPU事件实例目前只支持PC单段序列；此方案不能输出事件小割':'';
  function errors(L) {
    if(!on(L))return [];
    const c=config(L),bad=[];
    if(!Number.isInteger(c.count)||c.count<1||c.count>100)bad.push('每组星头数须为1–100的整数');
    for(const k of ['flight','speed','headSize'])if(!Array.isArray(c[k])||c[k].length!==2||!c[k].every(x=>Number.isFinite(x)&&x>0)||c[k][1]<c[k][0])bad.push(k+'范围无效');
    for(const k of ['drag','gravity','childDrag','childGravity','inherit','rotation'])if(!Number.isFinite(c[k])||c[k]<0)bad.push(k+'须为非负数');
    if(!(c.sizeJit>=0&&c.sizeJit<1))bad.push('尺寸随机须在0–100%以内');
    if(!['fixed','random'].includes(c.color))bad.push('颜色方式无效');
    for(const k of ['colorMin','colorMax'])if(!Array.isArray(c[k])||c[k].length!==3||!c[k].every(x=>Number.isFinite(x)&&x>=0))bad.push(k+'须为三维非负线性RGB');
    if(c.flash&&(!(c.flashLife>0)||!(c.flashSize>0)||!(c.flashAlpha>=0)))bad.push('主闪光寿命/尺寸/亮度无效');
    return bad;
  }
  function assert(L){const e=errors(L);if(e.length)throw Error('事件实例：'+e.join('；'));}
  const memo=new Map();
  function table(L) {
    assert(L);const c=config(L),sig=JSON.stringify(c);if(memo.has(sig))return memo.get(sig);
    const src={name:'Carrier',gpu:false,seed:c.seed,delay:0,duration:c.flight[1],spawn:[],bursts:[[0,c.count]],
      life:c.flight,size:c.headSize,drag:[c.drag,c.drag],accel:[0,0,-9.81*c.gravity],sphere:{r:.01,v:c.speed},
      col:[[0,hexToLin(c.headColor)],[1,hexToLin(c.headColor)]]};
    const tab=esSpawn({emitters:[src]},1)[0];
    tab.list.forEach((q,i)=>{
      q.death=Math.ceil((q.life-1e-7)*30)/30;
      q.eventPos=esPos(q,src.accel,q.death,[0,0,0]).slice();
      q.eventVel=esVel(q,src.accel,q.death,[0,0,0]).map(x=>x*c.inherit);
      q.childSize=1+c.sizeJit*(2*starHash(i,c.seed,701)-1);
      q.rotation=c.rotation*6.2831853*starHash(i,c.seed,702);
      q.color=c.colorMin.map((v,j)=>v+(c.colorMax[j]-v)*starHash(i,c.seed,711+j));
    });
    memo.set(sig,tab);if(memo.size>32)memo.delete(memo.keys().next().value);return tab;
  }
  function sample(L,t) {
    const c=config(L),r=+L.rate>0?+L.rate:1,sc=+L.scale>0?+L.scale:1,a=(t-(+L.delay||0))*r;
    return table(L).list.map(q=>{
      const born=a>=q.death,age=Math.max(0,a-q.death),p=born?esPos({p:q.eventPos,v:q.eventVel,k:c.childDrag},[0,0,-9.81*c.childGravity],age,[0,0,0]):esPos(q,[0,0,-9.81*c.gravity],Math.max(0,a),[0,0,0]);
      return {q,born,age,p:p.map(x=>x*sc),scale:sc*q.childSize,rotation:q.rotation,sourceAge:a};
    });
  }
  function start(b){const m=b.meta;return m.pre&&!m.zoom?m.pre.from:m.t0||0;}
  function end(L,P,b){return (+L.delay||0)+(config(L).flight[1]+(b?bakeTotal(b)-start(b):+P.duration||0))/(+L.rate>0?+L.rate:1);}
  function extent(L,b){const c=config(L),sc=+L.scale>0?+L.scale:1;
    return sc*(c.speed[1]*(c.drag>1e-6?(1-Math.exp(-c.drag*c.flight[1]))/c.drag:c.flight[1])+Math.max(b.meta.Ww,b.meta.Wh)*.65+12);}
  function material(L,q){if(config(L).color!=='random')return L;
    // 与InitialColor同一条RGB范围；每颗小割只抽一次，后续用乘色淡出。
    return {...L,stages:[[0,'#ffffff']],_eventTint:q.color};}
  function apply(spec,layers,mobile) {
    if(!layers.some(x=>on(x.L)))return spec;
    if(mobile)throw Error('事件实例当前只接PC；手机产物请选“不出”');
    layers.forEach(({L,b,i:li},k)=>{
      if(!on(L))return;assert(L);const c=config(L),i=li==null?k:li,pre='L'+(i+1)+'_',name=pre+'Bloom',r=+L.rate>0?+L.rate:1,sc=+L.scale>0?+L.scale:1;
      const children=spec.emitters.filter(e=>e.layer===i+1);
      if(children.length!==1||b.next||b.form!=='master')throw Error('事件实例需每层一段序列；请将当前小割设为单页/合并输出');
      const child=children[0];child.gpu=false;child.name=name;
      child.required={...child.required,screen_alignment:'Square',duration_s:(c.flight[1]+.1)/r,delay_s:+L.delay||0,loops:1,local_space:false,max_draw_count:c.count};
      child.spawn={rate:{const:0},bursts:[]};
      child.modules=child.modules.filter(m=>m.m!=='InitialLocation');
      const sz=child.modules.find(m=>m.m==='InitialSize'),v=sz.StartSize.const[0];
      sz.StartSize={uniform:[[r1(v*(1-c.sizeJit)),0,0],[r1(v*(1+c.sizeJit)),0,0]]};
      child.modules.push({m:'EventReceiverSpawn',EventGeneratorType:'EPET_Death',EventName:name,SpawnCount:{const:1},bUseParticleTime:false,bUsePSysLocation:false,bInheritVelocity:true,InheritVelocityScale:{const:[c.inherit,c.inherit,c.inherit]}},
        {m:'InitialRotation',StartRotation:{uniform:[0,c.rotation]}},
        {m:'Drag',DragCoefficientRaw:{const:c.childDrag*r}},{m:'ConstAcceleration',Acceleration:[0,0,-981*c.childGravity*sc*r*r]});
      if(c.color==='random'){
        child.modules=child.modules.filter(m=>m.m!=='ColorOverLife');
        child.modules.push({m:'InitialColor',StartColor:{uniform:[c.colorMin,c.colorMax]},StartAlpha:{const:1}});
      }
      const dot=pre+'carrier';spec.materials[dot]={role:'soft_dot'};
      spec.emitters.push({name:pre+'Carrier',material:dot,layer:i+1,gpu:false,
        required:{screen_alignment:'Square',duration_s:r4((c.flight[1]+.1)/r),delay_s:+L.delay||0,loops:1,local_space:false,max_draw_count:c.count},
        spawn:{rate:{const:0},bursts:[[0,c.count]]},modules:[
          {m:'Lifetime',Lifetime:{uniform:c.flight.map(x=>r4(x/r))}},
          {m:'SphereLocation',StartRadius:{const:sc},SurfaceOnly:true,Velocity:true,VelocityScale:{uniform:c.speed.map(x=>r1(x*100*r))}},
          {m:'InitialSize',StartSize:{uniform:c.headSize.map(x=>[r1(x*100*sc),0,0])}},
          {m:'Drag',DragCoefficientRaw:{const:c.drag*r}},{m:'ConstAcceleration',Acceleration:[0,0,-981*c.gravity*sc*r*r]},
          {m:'ColorOverLife',ColorOverLife:{const:hexToLin(c.headColor)},AlphaOverLife:{const:1}},
          {m:'EventGenerator',Events:[{Type:'EPET_Death',CustomName:name,Frequency:1,ParticleFrequency:1}]}]});
      if(c.flash){const mk=pre+'eventFlash';spec.materials[mk]={role:'soft_dot'};
        spec.emitters.unshift({name:pre+'Flash',material:mk,layer:i+1,gpu:false,
          required:{screen_alignment:'Square',duration_s:r4(c.flashLife/r),delay_s:+L.delay||0,loops:1,local_space:false,max_draw_count:1},spawn:{rate:{const:0},bursts:[[0,1]]},modules:[
            {m:'Lifetime',Lifetime:{const:r4(c.flashLife/r)}},{m:'InitialSize',StartSize:{const:[c.flashSize*100*sc,0,0]}},
            {m:'ColorOverLife',ColorOverLife:{const:hexToLin(c.headColor)},AlphaOverLife:{curve:[[0,c.flashAlpha],[.25,c.flashAlpha*.36],[1,0]]}}]});}
    });
    spec.system.preview_warmup_s=0;spec.source.event_instances=layers.filter(x=>on(x.L)).map(x=>config(x.L));
    spec.notes.push('CPU飞行粒子Death事件原位生成序列；一个星头只对应一种造型。浏览器种子固定用于复核，UE每次运行重新抽样；均为同一分布。未经UE实播。');
    return spec;
  }
  return {defaults,on,config,outputReason,errors,assert,table,sample,start,end,extent,material,apply};
})();
