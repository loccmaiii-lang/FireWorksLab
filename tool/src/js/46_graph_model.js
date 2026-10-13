/* 通用周期粒子图：秒、米；固定随机流。亲子出生使用同一条解析轨迹。 */
const SparkGraph = (() => {
  const TAU = Math.PI * 2, mod = (a,b) => ((a%b)+b)%b;
  const hash = (seed,id,tag) => { let x = (seed ^ Math.imul(id+1,374761393) ^ Math.imul(tag+1,668265263))|0; x=Math.imul(x^(x>>>13),1274126177); return ((x^(x>>>16))>>>0)/4294967296; };
  const norm = v => {const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function direction(e,id,tag=10) {
    const h=k=>hash(e.seed,id,k), z=1-2*h(tag), a=TAU*h(tag+1), r=Math.sqrt(1-z*z);
    if(e.directionMode==='sphere') return [r*Math.cos(a),r*Math.sin(a),z];
    const d=norm(e.direction), u=norm(cross(d,Math.abs(d[2])<.9?[0,0,1]:[0,1,0])), v=cross(d,u);
    const c=1-h(tag)*(1-Math.cos(e.cone*Math.PI/180)), s=Math.sqrt(1-c*c);
    return d.map((x,i)=>c*x+s*(u[i]*Math.cos(a)+v[i]*Math.sin(a)));
  }
  function dist(d,h) {return d[0]+(d[1]-d[0])*Math.pow(h,d[2]||1);}
  function curve(keys,u) {
    if(!keys.length)return 1;
    if(u<=keys[0][0])return keys[0][1];
    for(let i=1;i<keys.length;i++)if(u<=keys[i][0]){const a=keys[i-1],b=keys[i],f=(u-a[0])/Math.max(1e-9,b[0]-a[0]);return a[1]+(b[1]-a[1])*f;}
    return keys[keys.length-1][1];
  }
  function sample(q,a) {
    const k=q.e.drag, ex=Math.exp(-k*a), s=k>1e-7?-Math.expm1(-k*a)/k:a, t=k>1e-7?(a-s)/k:a*a/2;
    const p=q.p.map((x,i)=>x+q.v[i]*s+q.e.gravity[i]*t),v=q.v.map((x,i)=>x*ex+q.e.gravity[i]*s);
    // 平滑位移从零开始，同时返回其导数，使子粒继承完整速度。
    const n=q.e.noise||0, w=TAU*(q.e.noiseHz??1), phase=q.phase;
    if(n)for(let i=0;i<3;i++){const ph=phase+i*2.17;p[i]+=n*(Math.sin(w*a+ph)-Math.sin(ph))*a;v[i]+=n*(Math.sin(w*a+ph)-Math.sin(ph)+a*w*Math.cos(w*a+ph));}
    return {p,v};
  }
  function validate(r) {
    if(!r||!(r.period>0&&Number.isFinite(r.period)))throw Error('循环周期必须大于0');
    if(!Array.isArray(r.emitters)||!r.emitters.length)throw Error('至少需要一个粒子层');
    if(!Array.isArray(r.bounds)||r.bounds.length!==4||!r.bounds.every(Number.isFinite)||r.bounds[0]>=r.bounds[1]||r.bounds[2]>=r.bounds[3])throw Error('取景范围无效');
    if(!Array.isArray(r.bursts)||r.bursts.some(b=>!Array.isArray(b)||b.length!==2||!b.every(Number.isFinite)||b[1]<0))throw Error('爆发时刻或宽度无效');
    const seen=new Set();
    for(const e of r.emitters){if(!e||!e.id||seen.has(e.id))throw Error('粒子层ID缺失或重复');if(e.parent&&!seen.has(e.parent))throw Error('母粒必须在子粒之前');seen.add(e.id);
      for(const d of [e.speed,e.life,e.size,e.power])if(!Array.isArray(d)||d.length!==3||!d.every(Number.isFinite)||d[0]<0||d[1]<d[0]||d[2]<=0)throw Error(e.name+'：随机范围无效');
      if(e.life[1]>=r.period)throw Error(e.name+'：寿命上限须小于循环周期');
      if(e.life[0]<=0)throw Error(e.name+'：寿命下限须大于0');
      for(const k of ['drag','count','children','width','gain','history','extent','delay','inherit','noise','noiseHz','clusterWidth'])if(!Number.isFinite(e[k])||e[k]<0)throw Error(e.name+'：'+k+'须为非负有限数');
      for(const k of ['event','probability','clusterProbability','clusterDirection','burstShare','taper'])if(!Number.isFinite(e[k])||e[k]<0||e[k]>1)throw Error(e.name+'：'+k+'须在0到1之间');
      if(!Number.isInteger(e.seed)||!Number.isInteger(e.count)||!Number.isInteger(e.children)||!Number.isInteger(e.clusterSize)||e.clusterSize<1)throw Error(e.name+'：种子和数量须为整数');
      if(!Number.isFinite(e.cone)||e.cone<0||e.cone>180||!Number.isFinite(e.aspect)||e.aspect<1||!Number.isFinite(e.spin)||!Number.isFinite(e.twist))throw Error(e.name+'：方向或形态参数无效');
      for(const k of ['gravity','direction'])if(!Array.isArray(e[k])||e[k].length!==3||!e[k].every(Number.isFinite))throw Error(e.name+'：'+k+'须为三维向量');
      if(!['sphere','cone'].includes(e.directionMode)||!['line','point','fragment'].includes(e.shape)||!Math.hypot(...e.direction))throw Error(e.name+'：形态或方向无效');
      for(const k of ['sizeCurve','brightCurve'])if(!Array.isArray(e[k])||e[k].some((p,i,a)=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<0||p[0]>1||p[1]<0||(i&&p[0]<=a[i-1][0])))throw Error(e.name+'：曲线须按寿命从0到1递增，数值非负');
    }
  }
  function build(r) {
    validate(r);const byId=new Map(),all=[];
    for(const e of r.emitters){const out=[],parents=e.parent?byId.get(e.parent):null;
      const count=parents?parents.length*Math.round(e.children):Math.round(e.count), h=(id,t)=>hash(e.seed,id,t);
      if(count>200000||all.length+count>500000)throw Error(e.name+'：超过每层20万／全图50万周期粒子的编辑上限');
      for(let id=0;id<count;id++){
        let birth,p=[0,0,0],v=direction(e,id),parent=null,eventAge=0;
        if(parents){parent=parents[Math.floor(id/Math.round(e.children))];if(h(id,2)>e.probability)continue;eventAge=parent.life*e.event+e.delay;const s=sample(parent,eventAge);birth=parent.birth+eventAge;p=s.p;v=v.map((x,i)=>x*dist(e.speed,h(id,3))+s.v[i]*e.inherit);}
        else {
          const cluster=Math.floor(id/Math.max(1,e.clusterSize)), selected=h(cluster,101)<e.clusterProbability;
          birth=selected?h(cluster,102)*r.period+(h(id,103)*2-1)*e.clusterWidth:h(id,104)*r.period;
          // 非均匀爆发：部分火星归入共享的不等间隔事件，保留连续底量。
          if(r.bursts.length&&h(id,105)<e.burstShare){const ev=r.bursts[Math.floor(h(id,106)*r.bursts.length)];birth=ev[0]+(h(id,107)+h(id,108)-1)*ev[1];}
          if(selected&&e.clusterDirection){const d=direction(e,cluster,111);v=norm(v.map((x,i)=>x*(1-e.clusterDirection)+d[i]*e.clusterDirection));}
          const pos=direction({...e,directionMode:'sphere'},id,130),rad=e.extent*Math.cbrt(h(id,132));p=pos.map(x=>x*rad);v=v.map(x=>x*dist(e.speed,h(id,3)));
        }
        const q={id,e,birth,life:Math.max(.001,dist(e.life,h(id,4))),width:e.width*dist(e.size,h(id,5)),power:e.gain*dist(e.power,h(id,6)),p,v,phase:TAU*h(id,7),parent,eventAge};out.push(q);all.push(q);
      }byId.set(e.id,out);
    }return {recipe:r,all,byId};
  }
  // 每项：[起点xy、终点xy、两端半径、两端亮度、形状、角度、随机值]。
  function geometry(graph,time,only=null) {
    const out=[],counts={},r=graph.recipe;
    for(const q of graph.all){const e=q.e;if(e.enabled===false||(only&&e.id!==only))continue;
      const age=mod(time-q.birth,r.period);if(age>=q.life)continue;
      counts[e.id]=(counts[e.id]||0)+1;
      const u=age/q.life, fade=Math.min(1,age/.002)*Math.min(1,(q.life-age)/.008),I=q.power*curve(e.brightCurve,u)*fade;
      if(I<=0)continue;
      const radius=q.width*.5*curve(e.sizeCurve,u),p=sample(q,age).p;
      if(e.shape==='line'&&e.history>0){
        const start=Math.max(0,age-e.history),n=Math.max(1,Math.min(12,Math.ceil((age-start)*240))),dt=(age-start)/n;let a=sample(q,start).p;
        for(let j=0;j<n;j++){const b=sample(q,start+(j+1)*dt).p,f0=j/n,f1=(j+1)/n;
          out.push(a[0],a[2],b[0],b[2],radius*(e.taper+(1-e.taper)*f0),radius*(e.taper+(1-e.taper)*f1),I*(.22+.78*f0),I*(.22+.78*f1),0,0,q.phase);a=b;
        }
      }else {const a=q.phase+e.spin*age*Math.PI/180,sz=radius*(e.shape==='fragment'?Math.max(.25,Math.abs(Math.cos(q.phase+e.twist*age*Math.PI/180))):1);
        out.push(p[0],p[2],p[0]+Math.cos(a)*radius*(e.aspect-1)*2,p[2]+Math.sin(a)*radius*(e.aspect-1)*2,sz,sz,I,I,e.shape==='fragment'?2:1,a,q.phase);
      }
    }return {data:new Float32Array(out),counts};
  }
  return {hash,mod,curve,dist,direction,sample,validate,build,geometry};
})();

