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
  // 4.9.97（导出排查 V1 / V3，用户 10-14 13:12「全部要修」）：镜头「关」也走镜头那个核（46_camera_render.js，世界等比、高斯按面积归一化），coc = 0、不积分。
  //   以前「关」是另一个着色器：历史线 ≤ 12 段每段按自己的面积出光，越快拖得越长越亮（细长暗丝占「关」能量 56%）；点的核 σ = r/2（镜头 σ = r）；半径只按横向像素（SGR1 横竖不等比时拉伸）。
  //   现在每颗粒子的总光量 = 镜头开时同一颗（2π r²，和拖多长无关）：历史线 ≤ 12 段胶囊按「亮度坡度 × 面积」分这份光。格式同 cameraGeometry（12 个数一项）
  function flatGeometry(graph,time,ppm,only=null){
    const out=[],counts={},r=graph.recipe,RT=Math.sqrt(TAU);
    for(const q of graph.all){const e=q.e;if(e.enabled===false||(only&&e.id!==only))continue;
      const age=mod(time-q.birth,r.period);if(age>=q.life)continue;
      counts[e.id]=(counts[e.id]||0)+1;
      const u=age/q.life,fade=Math.min(1,age/.002)*Math.min(1,(q.life-age)/.008),I=q.power*curve(e.brightCurve,u)*fade;
      if(I<=0)continue;
      const radius=q.width*.5*curve(e.sizeCurve,u),p=sample(q,age).p;
      if(e.shape==='line'&&e.history>0){
        const start=Math.max(0,age-e.history),n=Math.max(1,Math.min(12,Math.ceil((age-start)*240))),dt=(age-start)/n,seg=[];let a=sample(q,start).p,wsum=0;
        for(let j=0;j<n;j++){const b=sample(q,start+(j+1)*dt).p,f=(j+.5)/n,rj=radius*(e.taper+(1-e.taper)*f),rp=rj*ppm,len=Math.hypot(b[0]-a[0],b[2]-a[2])*ppm,A=TAU*rp*rp+RT*rp*len,w=.22+.78*f;
          seg.push([a,b,rj,w]);wsum+=w*A;a=b;}
        const Apt=TAU*(radius*ppm)**2;
        for(const [a2,b2,rj,w] of seg){const Ij=wsum>0?I*w*Apt/wsum:0;out.push(a2[0],a2[2],b2[0],b2[2],rj,rj,Ij,Ij,1,0,q.phase,0);}
      }else{const ang=q.phase+e.spin*age*Math.PI/180,sz=radius*(e.shape==='fragment'?Math.max(.25,Math.abs(Math.cos(q.phase+e.twist*age*Math.PI/180))):1),len=e.shape==='line'?0:radius*(e.aspect-1)*2;
        out.push(p[0],p[2],p[0]+Math.cos(ang)*len,p[2]+Math.sin(ang)*len,sz,sz,I,I,e.shape==='fragment'?2:1,ang,q.phase,0);}
    }return{data:new Float32Array(out),counts};
  }
  // 曝光窗口内逐粒积分。每项额外保存真实Y深度计算出的散焦半径；不重复画历史拖尾。
  function cameraGeometry(graph,time,P,ppm,only=null){
    const c=CameraImaging.validate(P),[a,b]=CameraImaging.window(c,time),width=b-a,r=graph.recipe,out=[],counts={},quality=CameraImaging.quality(c);
    for(const q of graph.all){const e=q.e;if(e.enabled===false||(only&&e.id!==only))continue;
      const first=Math.floor((a-q.birth-q.life)/r.period)+1,last=Math.floor((b-q.birth)/r.period);
      for(let cycle=first;cycle<=last;cycle++){
        const birth=q.birth+cycle*r.period,start=Math.max(a,birth),end=Math.min(b,birth+q.life);
        if(width>0?end<=start:!(a>=birth&&a<birth+q.life))continue;
        const span=end-start,age0=start-birth,mid=age0+span*.5,s0=sample(q,age0),sm=sample(q,mid),s1=sample(q,age0+span);
        const speed=Math.max(...[s0,sm,s1].map(s=>Math.hypot(s.v[0],s.v[2]))),rad=q.width*.5*Math.max(curve(e.sizeCurve,mid/q.life),.01)*ppm;
        const step=Math.max(quality.step,Math.min(3,rad*.4)),rotation=Math.abs(e.spin)*Math.PI/180*span*rad*Math.max(1,e.aspect);
        const n=width?Math.max(1,Math.ceil(speed*span*ppm/step),Math.ceil(span*quality.hz),Math.ceil(rotation/step)):1;
        if(n>8192||out.length/12+n>1500000)throw Error('镜头采样量过大：请缩短曝光或使用快速质量');
        const weight=width?span/width/n:1;counts[e.id]=(counts[e.id]||0)+1;
        for(let j=0;j<n;j++){
          const age=age0+(j+.5)*span/n,u=age/q.life,fade=Math.min(1,age/.002)*Math.min(1,(q.life-age)/.008),I=q.power*curve(e.brightCurve,u)*fade*weight;if(I<=0)continue;
          const p=sample(q,age).p;if(c.cameraDof&&c.cameraDistance+p[1]<=0)continue;
          const radius=q.width*.5*curve(e.sizeCurve,u),ang=q.phase+e.spin*age*Math.PI/180;
          const sz=radius*(e.shape==='fragment'?Math.max(.25,Math.abs(Math.cos(q.phase+e.twist*age*Math.PI/180))):1),len=e.shape==='line'?0:radius*(e.aspect-1)*2;
          out.push(p[0],p[2],p[0]+Math.cos(ang)*len,p[2]+Math.sin(ang)*len,sz,sz,I,I,e.shape==='fragment'?2:1,ang,q.phase,CameraImaging.coc(c,p[1]));
        }
      }
    }return{data:new Float32Array(out),counts};
  }
  return {hash,mod,curve,dist,direction,sample,validate,build,geometry,flatGeometry,cameraGeometry};
})();

// =====================================================================
//  4.9.87 分层粒子图并回统一右栏（导出（23），用户 10-14 10:29「仙女棒与尾焰，直接把我的参数系统给换了……修复与统一参数系统界面」）
//  · 4.9.83 的独立面板（自己的数字框、浏览器键保存、完整 JSON）去掉：每层一个发射器标签，模块 / 滑杆 / 改过 / ↺ / 撤销 / 保存 / 草稿和别的效果同一套
//  · 行用路径键读写 P.sparkGraph（10_types.js pGet / pSet）；名字 / 说明按参数名称表「分层粒子图」那几行（每个字段一行，三个数的分下限 / 上限 / 偏向）
//  · 模板默认 = 候选打开时那套输出设置（4.9.86 起在这里；17_graph_presets.js 是脚本生成的，不手改）
// =====================================================================
const GRAPH_TYPE_P = { loopT: 64 / 30, duration: 64 / 30, cols: 4, rows: 4, chans: 4, texW: 2048, texH: 2048, autoGrid: 0, shutter: 0, exposure: 1, outMode: 'combined', zoom: 'off', cellPad: 2, headBright: 1, headSize: .001, spacing: 0, nozzles: 1, sparkSize: .001 };
const GRAPH_TYPE_M = { stages: [[0, '#ffffff']], headInt: 1, tailInt: 1, ramp0: '#120100', ramp1: '#b34104', ramp2: '#ffc064', ramp3: '#fff6dd' };
Object.assign(TYPES.sparkgraph.p, GRAPH_TYPE_P); Object.assign(TYPES.sparkgraph.m, GRAPH_TYPE_M);
// 读写换算：开关存 true / false，爆发时刻存 [[秒, 半宽], …]，曲线存 [[寿命 0–1, 倍率], …]
const GRAPH_IO = {
  bool: { get: v => v ? '1' : '0', set: s => String(s) === '1' },
  bursts: { get: v => Array.isArray(v) ? v.map(([t, w]) => `${+(+t).toFixed(4)}:${+(+w).toFixed(4)}`).join(', ') : '',
    set: s => String(s || '').split(/[,，;；\n]+/).map(x => x.trim()).filter(Boolean).map(x => x.split(/[:：\s]+/).map(Number)).map(k => { if (k.length !== 2 || !k.every(Number.isFinite)) throw Error('爆发时刻写成「秒:半宽, 秒:半宽」'); return k; }).sort((a, b) => a[0] - b[0]) }
};
const graphCurveText = v => Array.isArray(v) ? v.map(([u, x]) => `${+(+u).toFixed(4)}:${+(+x).toFixed(4)}`).join(', ') : String(v || '');
// 每层的行（模板）：键里的 [] 打开时换成这一层的 id；mod = 放进哪个模块；lshow(P, 层) = 这一层有没有这一项
const GRAPH_LAYER_MODS = ['生成', '分叉', '寿命', '形状', '初速', '阻力重力', '大小', '亮度', '形态'];
const graphLayerItems = (() => {
  const K = f => 'sparkGraph.emitters[].' + f, root = (P, e) => !e.parent, child = (P, e) => !!e.parent, cone = (P, e) => e.directionMode === 'cone';
  const num = (f, label, unit, min, max, step, mod, lshow, x = {}) => Object.assign([K(f), label, unit, min, max, step, null], { tk: K(f), mod, lshow, gl: true }, x);
  const tri = (f, nm, unit, max, step, mod, x = {}) => [num(f + '.0', nm + ' · 下限', unit, 0, max, step, mod, null, x), num(f + '.1', nm + ' · 上限', unit, 0, max, step, mod, null, x), num(f + '.2', nm + ' · 分布偏向（1 均匀，越大越偏下限）', '', .1, 4, .05, mod)];
  const vec = (f, nm, names, unit, min, max, step, mod, lshow) => names.map((n, i) => num(f + '.' + i, nm + ' · ' + n, unit, min, max, step, mod, lshow));
  return [
    { text: K('name'), tk: K('name'), label: '层名称', mod: '生成', gl: true, rebuild: true },
    { sel: K('enabled'), tk: K('enabled'), label: '显示这层（关了子粒照样生成）', mod: '生成', gl: true, io: GRAPH_IO.bool, options: [['1', '显示'], ['0', '隐藏']] },
    num('count', '每周期粒子数', '粒', 0, 50000, 10, '生成', root, { int: true }),
    num('seed', '随机种子', '', 0, 999999, 1, '生成', null, { int: true }),
    num('clusterSize', '每簇候选数量', '粒', 1, 256, 1, '生成', root, { int: true }),
    num('clusterProbability', '成簇概率', '', 0, 1, .01, '生成', root),
    num('clusterWidth', '簇内出生半宽', 's', 0, .2, .001, '生成', root),
    num('clusterDirection', '簇内方向关联', '', 0, 1, .01, '生成', root),
    num('burstShare', '爆发段粒子比例', '', 0, 1, .01, '生成', root),
    num('children', '每母粒子粒数', '粒', 0, 32, 1, '分叉', child, { int: true }),
    num('event', '分叉时刻（× 母粒寿命）', '', 0, 1, .01, '分叉', child),
    num('delay', '额外延迟', 's', 0, .5, .001, '分叉', child),
    num('inherit', '速度继承', '×', 0, 2, .01, '分叉', child),
    num('probability', '子粒发生概率', '', 0, 1, .01, '分叉', child),
    ...tri('life', '寿命', 's', 1, .001, '寿命'),
    num('extent', '出生半径', 'm', 0, .5, .0001, '形状', root),
    ...tri('speed', '速度', 'm/s', 80, .01, '初速'),
    { sel: K('directionMode'), tk: K('directionMode'), label: '喷射方向', mod: '初速', gl: true, options: [['sphere', '球形散射'], ['cone', '锥形喷射']] },
    num('cone', '喷射半锥角', '°', 0, 180, 1, '初速', cone),
    ...vec('direction', '喷射轴', ['X', 'Y（纵深）', 'Z（竖直）'], '', -1, 1, .01, '初速', cone),
    num('drag', '线性阻力', '1/s', 0, 30, .1, '阻力重力'),
    ...vec('gravity', '加速度', ['横向', '纵深', '竖直'], 'm/s²', -20, 20, .01, '阻力重力'),
    num('noise', '位移扰动', 'm/s', 0, .1, .0001, '阻力重力'),
    num('noiseHz', '扰动频率', 'Hz', 0, 60, .1, '阻力重力'),
    num('width', '粒子直径', 'm', 0, .3, .00001, '大小'),
    ...tri('size', '大小倍率', '×', 4, .01, '大小'),
    { curve: K('sizeCurve'), tk: K('sizeCurve'), label: '大小随寿命', mod: '大小', gl: true },
    num('gain', '亮度', '×', 0, 60, .05, '亮度'),
    ...tri('power', '亮度倍率', '×', 6, .01, '亮度'),
    { curve: K('brightCurve'), tk: K('brightCurve'), label: '亮度随寿命', mod: '亮度', gl: true },
    { sel: K('shape'), tk: K('shape'), label: '粒子形态', mod: '形态', gl: true, options: [['line', '运动拉丝'], ['point', '柔亮点'], ['fragment', '不规则碎片']] },
    num('history', '历史线长时间', 's', 0, .1, .001, '形态', (P, e) => e.shape === 'line' && !P.cameraMotion && !P.cameraDof),
    num('taper', '尾端粗细比例', '', 0, 1, .01, '形态', (P, e) => e.shape === 'line' && !P.cameraMotion && !P.cameraDof),
    num('aspect', '长宽比', '×', 1, 10, .1, '形态', (P, e) => e.shape !== 'line'),
    num('spin', '自转', '°/s', -720, 720, 1, '形态', (P, e) => e.shape !== 'line'),
    num('twist', '翻转', '°/s', -720, 720, 1, '形态', (P, e) => e.shape === 'fragment')
  ];
})();
SCHEMA.push(
  { sec: '分层粒子图', graphOnly: true, show: P => !!P.sparkGraph, hint: '整张粒子图共用：循环周期、取景范围、偶发爆发时刻、导出时是否跟着喷口轴转。', items: [
    ['sparkGraph.period', '循环周期（粒子寿命上限要比它短）', 's', .2, 6, .01],
    ['sparkGraph.bounds.0', '取景 · 左', 'm', -50, 0, .01], ['sparkGraph.bounds.1', '取景 · 右', 'm', 0, 50, .01],
    ['sparkGraph.bounds.2', '取景 · 下', 'm', -50, 0, .01], ['sparkGraph.bounds.3', '取景 · 上', 'm', 0, 50, .01],
    { text: 'sparkGraph.bursts', label: '爆发（时刻:半宽，秒）', io: GRAPH_IO.bursts },
    { sel: 'sparkGraph.followAxis', label: '导出时跟随喷口轴（Orientation Axis Lock）', io: GRAPH_IO.bool, options: [['1', '跟随'], ['0', '不跟随']] }
  ] },
  { sec: '分层粒子图', graphOnly: true, perLayer: true, show: P => !!P.sparkGraph, items: graphLayerItems }
);
// 这一层在右栏叫什么（去掉「05｜」编号；重名时带上编号）
function graphTabName(g, e) {
  const short = x => String(x.name || x.id).replace(/^\d+\s*[｜|]\s*/, ''), n = short(e);
  const std = typeof PEMIT !== 'undefined' && PEMIT.E.some(x => x.n === n || x.n === String(e.name));     // 和标准发射器同名（「火花」「余烬」……）就加后缀，别占了它的标签
  return std ? n + '（粒子层 ' + e.id + '）' : g.emitters.some(x => x !== e && short(x) === n) ? String(e.name || e.id) : n;
}
const GRAPH_TAB_ID = {};
// 某一节的行：分层粒子图「每层」那一节按这个效果的层展开（每层一份，键换成这一层的 id），别的节原样
function secItems(sec, P) {
  if (sec.graphOnly && !(P && P.sparkGraph)) return [];     // 别的效果不建粒子图的行
  if (!sec.perLayer) return sec.items.map(it => [it, null]);
  const g = P && P.sparkGraph; if (!g) return [];
  const base = (EMIT_DEF['分层粒子图'] || { i: 90 }).i, out = [];
  g.emitters.forEach((e, idx) => {
    const tab = graphTabName(g, e), par = e.parent ? g.emitters.find(x => x.id === e.parent) : null; GRAPH_TAB_ID[tab] = e.id;
    EMIT_DEF[tab] = { n: tab, en: '', lv: e.parent ? '子粒层' : '粒子层', what: par ? `母粒：${par.name}；位置与速度在分叉瞬间继承` : '独立出生；底量、成簇与偶发爆发叠加', mods: GRAPH_LAYER_MODS, i: base + (idx + 1) * .001, graph: e.id };
    for (const it of sec.items) {
      const key = (Array.isArray(it) ? it[0] : it.sel || it.text || it.curve).replace('[]', `[${e.id}]`), id = e.id, ls = it.lshow;
      const show = P => { const x = P.sparkGraph && P.sparkGraph.emitters.find(q => q.id === id); return !!x && (!ls || ls(P, x)); };
      let c;
      if (Array.isArray(it)) { c = Object.assign([key, it[1], it[2], it[3], it[4], it[5], show], it); c[0] = key; c[6] = show; }
      else { c = { ...it, show }; if (it.sel) c.sel = key; else if (it.text) c.text = key; else if (it.curve) c.curve = key; }
      out.push([c, { e: tab, m: it.mod }]);
    }
  });
  return out;
}
