/* 全局气流：米、秒、喷口局部坐标。预设速度场 + 有限惯性响应，不是可压缩流体求解。 */
const SparkFlow = (() => {
  const defaults = Object.freeze({fieldEnabled:0,fieldResponse:20,fieldStart:1,fieldRamp:3,
    fieldAxisX:0,fieldAxisY:0,fieldAxisZ:-1,fieldWindX:0,fieldWindY:0,fieldWindZ:-32,
    fieldConverge:7,fieldTurbulence:9,fieldScale:5,fieldCycles:1,fieldSeed:17});
  const parameterDefault = k => k === 'fieldCoupling' || /^sparkGraph\.emitters\[[^\]]+\]\.fieldCoupling$/.test(k) ? 1 : k.startsWith('sparkGraph.') ? defaults[k.slice(11)] : undefined;
  function prepare(r, step=1/240) {
    const f={...defaults,...Object.fromEntries(Object.keys(defaults).filter(k=>r[k]!=null).map(k=>[k,r[k]]))};
    if(![0,1,false,true].includes(f.fieldEnabled))throw Error('全局气流开关无效');
    for(const [k,v] of Object.entries(f))if(!Number.isFinite(+v))throw Error('全局气流：'+k+'必须为有限数');
    for(const k of ['fieldResponse','fieldStart','fieldConverge','fieldTurbulence'])if(f[k]<0)throw Error('全局气流：'+k+'不能小于0');
    if(f.fieldRamp<=0||f.fieldScale<=0)throw Error('气流渐入长度和扰动尺度必须大于0');
    if(!Number.isInteger(f.fieldCycles)||f.fieldCycles<0||!Number.isInteger(f.fieldSeed))throw Error('气流演化周期数须为非负整数，种子须为整数');
    const len=Math.hypot(f.fieldAxisX,f.fieldAxisY,f.fieldAxisZ);if(!len)throw Error('气流轴不能为零向量');
    for(const e of r.emitters)if(e.fieldCoupling!=null&&(!Number.isFinite(e.fieldCoupling)||e.fieldCoupling<0||e.fieldCoupling>10))throw Error(e.name+'：随流倍率须在0到10之间');
    if(!f.fieldEnabled||!f.fieldResponse)return null;
    f.axis=[f.fieldAxisX/len,f.fieldAxisY/len,f.fieldAxisZ/len];f.period=r.period;f.step=step;f.knots=0;
    // 三个共享相位；不依粒子ID变化，相邻火星感受到同一连续场。
    f.phase=[0,1,2].map(i=>((Math.sin(f.fieldSeed*12.9898+i*78.233)*43758.5453)%1)*Math.PI*2);
    return f;
  }
  function velocity(f,p,t) {
    const d=f.axis,s=p[0]*d[0]+p[1]*d[1]+p[2]*d[2],k=2*Math.PI/f.fieldScale;
    const phase=2*Math.PI*f.fieldCycles*t/f.period,ph=f.phase;
    // 旋度场的解析三角基；每分量与同轴坐标无关，因此扰动分量散度为0。
    const x=k*p[0],y=k*p[1],z=k*p[2],a=f.fieldTurbulence*.5;
    return [f.fieldWindX-f.fieldConverge*(p[0]-s*d[0])+a*(Math.sin(y+phase+ph[0])+Math.cos(z-phase+ph[1])),
      f.fieldWindY-f.fieldConverge*(p[1]-s*d[1])+a*(Math.sin(z+phase+ph[1])+Math.cos(x-phase+ph[2])),
      f.fieldWindZ-f.fieldConverge*(p[2]-s*d[2])+a*(Math.sin(x+phase+ph[2])+Math.cos(y-phase+ph[0]))];
  }
  function gate(f,p) {const s=p.reduce((v,x,i)=>v+x*f.axis[i],0),u=Math.max(0,Math.min(1,(s-f.fieldStart)/f.fieldRamp));return u*u*(3-2*u);}
  function attach(q,f) {
    if(!f||q.e.fieldCoupling===0)return;
    const rate=f.fieldResponse*(q.e.fieldCoupling??1),speed=Math.hypot(...q.v)+Math.hypot(f.fieldWindX,f.fieldWindY,f.fieldWindZ)+f.fieldTurbulence;
    const dt=Math.min(f.step,.2/(1+q.e.drag+rate+f.fieldConverge),f.fieldScale/Math.max(1,speed)*.12);
    if(dt<1/20000||Math.ceil((q.life+.5)/dt)>20000)throw Error('气流积分量过大：请降低响应率或增大扰动尺度');
    q.flow={f,rate,dt,states:[...q.p,...q.v]};
  }
  function derivative(q,a,s) {
    const {f,rate}=q.flow,e=q.e,p=s.slice(0,3),v=s.slice(3),u=velocity(f,p,q.birth+a),c=rate*gate(f,p),w=2*Math.PI*(e.noiseHz??1),n=e.noise||0;
    return [...v,...v.map((x,i)=>e.gravity[i]-e.drag*x+c*(u[i]-x)+n*(2*w*Math.cos(w*a+q.phase+i*2.17)-a*w*w*Math.sin(w*a+q.phase+i*2.17)+e.drag*(Math.sin(w*a+q.phase+i*2.17)-Math.sin(q.phase+i*2.17)+a*w*Math.cos(w*a+q.phase+i*2.17))))];
  }
  function sample(q,a) {
    const c=q.flow,h=c.dt,a0=Math.max(0,a),index=Math.floor(a0/h),end=(index+1)*6;
    while(c.states.length<=end){
      if(++c.f.knots>20000000)throw Error('气流轨迹缓存过大：请减少粒子数或降低场响应');
      const t=c.states.length/6-1,s=c.states.slice(-6),k1=derivative(q,t*h,s),k2=derivative(q,(t+.5)*h,s.map((v,i)=>v+k1[i]*h*.5)),k3=derivative(q,(t+.5)*h,s.map((v,i)=>v+k2[i]*h*.5)),k4=derivative(q,(t+1)*h,s.map((v,i)=>v+k3[i]*h));
      c.states.push(...s.map((v,i)=>v+h/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i])));
    }
    // Hermite同时返回位置及其导数，快门拉伸与子粒速度继承一致，时间轴可任意跳转。
    const u=(a0-index*h)/h,u2=u*u,u3=u2*u,j=index*6,A=c.states,p=[],v=[];
    for(let i=0;i<3;i++){const x=A[j+i],y=A[j+6+i],vx=A[j+3+i],vy=A[j+9+i];
      p.push((2*u3-3*u2+1)*x+(u3-2*u2+u)*h*vx+(-2*u3+3*u2)*y+(u3-u2)*h*vy);
      v.push((6*u2-6*u)/h*x+(3*u2-4*u+1)*vx+(-6*u2+6*u)/h*y+(3*u2-2*u)*vy);}
    return {p,v};
  }
  return {defaults,parameterDefault,prepare,velocity,gate,attach,sample};
})();
