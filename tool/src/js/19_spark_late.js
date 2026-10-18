// 爆后扰动沿用末段气流，区别仅是触发时刻与主星也受力；默认关闭，不改旧配方。
const burstFlowValue = (P, key) => P[key] == null || P[key] === '' ? BASE[key] : +P[key];
const burstFlowActive = P => !!P && !P.sparkGraph && familyOf(P.type) === 'aerial' && +P.burstFlowOn === 1 && burstFlowValue(P, 'burstFlowWind') > 0;
function burstFlowAir(P, x, y, t) {
  if (!burstFlowActive(P)) return [0, 0];
  return sparkLateAir({ sparkLateWind: burstFlowValue(P, 'burstFlowWind'), sparkLateScale: burstFlowValue(P, 'burstFlowScale'), sparkLateFade: burstFlowValue(P, 'burstFlowFade') }, x, y, t, Math.max(0, burstFlowValue(P, 'burstFlowStart')));
}
function sparkMotionStart(P, burn) {
  return Math.min(+P.sparkLateWind > 0 ? burn : Infinity, burstFlowActive(P) ? Math.max(0, burstFlowValue(P, 'burstFlowStart')) : Infinity);
}
function burstFlowOutputReason(P, kind) {
  return burstFlowActive(P) && ['unit', 'dots'].includes(kind) ? '爆后扰动需要保留各束的空间轨迹；请改用序列、单帧或不出，或关闭爆后扰动。' : '';
}
// 4.9.85：普通火花/余烬的燃尽后受力。出生、寿命、主星和基础冷却保持原样。
function sparkLateGate(P, t, burn) {
  const x = Math.max(0, Math.min(1, (t - burn) / Math.max(.05, +P.sparkLateFade || .4)));
  return x * x * (3 - 2 * x);
}
function sparkLateCurve(P, curve, t, born, life, burn) {
  if (!curve || t <= burn) return 1;
  const x = Math.max(0, Math.min(1, (t - burn) / Math.max(.05, born + life - burn)));
  return 1 + (Math.max(0, curve(x)) - 1) * sparkLateGate(P, t, burn);
}
function sparkLateAir(P, x, y, t, burn) {
  const speed = Math.max(0, +P.sparkLateWind || 0), L = Math.max(.2, +P.sparkLateScale || 1.5);
  const a = speed * sparkLateGate(P, t, burn), phase = t * speed / L;
  return [a * Math.sin(y / L + 1.3 * phase + 1.7), .35 * a * Math.sin(x / L - .9 * phase + 2.3)];
}
// 场在预测中点求值；线性阻力+重力与平方阻力采用Strang拆分。调用者将跨燃尽的一步拆开。
function sparkLateStep(P, p0, v0, U0, g, k, c, t, h, burn) {
  const a = sparkLateAir(P, p0[0] + v0[0] * h * .5, p0[1] + v0[1] * h * .5, t + h * .5, burn);
  if (burstFlowActive(P)) { const b = burstFlowAir(P, p0[0] + v0[0] * h * .5, p0[1] + v0[1] * h * .5, t + h * .5); a[0] += b[0]; a[1] += b[1]; }
  const U = [U0[0] + a[0], U0[1] + a[1], U0[2]], p = p0.slice(), v = v0.slice();
  if (!(c > 0)) {
    const e = Math.exp(-k * h), s = k > 1e-4 ? (1 - e) / k : h;
    for (let j = 0; j < 3; j++) {
      if (k > 1e-4) { const vi = U[j] + g[j] / k; p[j] += vi * h + (v[j] - vi) * s; v[j] = vi + (v[j] - vi) * e; }
      else { p[j] += v[j] * h + .5 * g[j] * h * h; v[j] += g[j] * h; }
    }
  } else {
    const linear = () => { for (let j = 0; j < 3; j++) v[j] = k > 1e-4 ? U[j] + g[j] / k + (v[j] - U[j] - g[j] / k) * Math.exp(-k * h * .5) : v[j] + g[j] * h * .5; };
    linear(); const w = v.map((x, j) => x - U[j]), speed = Math.hypot(...w), e = 1 + c * speed * h;
    for (let j = 0; j < 3; j++) { p[j] += speed > 1e-6 ? U[j] * h + w[j] / speed * Math.log(e) / c : v[j] * h; v[j] = U[j] + w[j] / e; }
    linear();
  }
  return [p, v];
}
// 与上面CPU步骤同一公式；在40_gl的mot/motv/linV/motQ定义之后插入。
const SPARK_LATE_GLSL = `
uniform float uLateWind, uLateScale, uLateFade, uLateCurves;
float lateGate(float t,float burn){return smoothstep(0.,max(.05,uLateFade),t-burn);}
vec3 lateAir(vec3 p,float t,float burn){float L=max(.2,uLateScale),ph=t*uLateWind/L,a=uLateWind*lateGate(t,burn);
  return vec3(a*sin(p.y/L+1.3*ph+1.7),.35*a*sin(p.x/L-.9*ph+2.3),0.);}
void lateStep(inout vec3 p,inout vec3 v,vec3 U0,vec3 g,float k,float c,float t,float h,float burn){
  vec3 U=U0+lateAir(p+v*h*.5,t+h*.5,burn);
  if(c>0.){v=linV(v,U,g,k,h*.5);vec3 w=v-U;float sw=length(w),e=1.+c*sw*h;
    p+=sw>1e-6 ? U*h+w/sw*log(e)/c : v*h;v=U+w/e;v=linV(v,U,g,k,h*.5);
  }else{p=mot(p,v,U,g,k,h);v=motv(v,U,g,k,h);}
}
// 4.9.97（导出排查 V4）：阻力系数做参数——松叶分叉的阻力是 uK × 分叉阻力倍数（uBrKd），以前分叉不走这里、燃尽后的气流吹不到它
void lateMotionK(vec3 sp,vec3 vel,vec3 U,vec3 g,float k,float born,float age,float burn,out vec3 p,out vec3 v){
  float pre=clamp(burn-born,0.,age);
  if(uCq>0.)motQ(sp,vel,U,g,k,uCq,pre,p,v);else{p=mot(sp,vel,U,g,k,pre);v=motv(vel,U,g,k,pre);}
  float rem=age-pre;int n=max(1,int(ceil(rem*60.)));float h=rem/float(n);
  for(int i=0;i<n;i++)lateStep(p,v,U,g,k,uCq,born+pre+float(i)*h,h,burn);
}
void lateMotion(vec3 sp,vec3 vel,vec3 U,vec3 g,float born,float age,float burn,out vec3 p,out vec3 v){ lateMotionK(sp,vel,U,g,uK,born,age,burn,p,v); }
`;

// 只在启用末段控制时编译受力变体，缺省着色器保持原指令，避免影响旧图和编译开销。
function sparkLateSource(source) {
  const put = (old, next) => { if (!source.includes(old)) throw new Error('末段火花着色器缺少接入点：' + old.slice(0, 40)); source = source.replace(old, next); };
  put('void main(){', SPARK_LATE_GLSL + '\nvoid main(){');
  put('  if(inf.z<=0.)', '  float parentBurn=texelFetch(uInfo,ivec2(2,s),0).x;\n  if(inf.z<=0.)');
  put('I, size=uSize; vec3 p;', 'I, size=uSize; vec3 p, lateV=vec3(0.);\n  bool lateOn=c==0 && uLateWind>0. && uT>parentBurn;');
  put('    float gl=emb ?', `    // 原受力精确接续到燃尽时刻，新风场只影响剩余运动。
    if(lateOn){vec3 vl=vel;if(uWShape>.5 && !emb)vl+=(W-1.)*vec3(gss(uid,5u),gss(uid,7u),gss(uid,9u))*uSpread;
      lateMotion(sp,vl,U,g,tb,age,parentBurn,p,lateV);}
    float curveAge=clamp(age/life,0.,1.),curveGate=1.;
    if(uLateCurves>.5){curveAge=clamp((uT-parentBurn)/max(.05,tb+life-parentBurn),0.,1.);curveGate=lateGate(uT,parentBurn);}
    float gl=emb ?`);
  // 4.9.97（导出排查 V4，用户 10-14 14:14 按推荐「松叶分叉只跟气流、不跟曲线」）：分叉火花——母火花到分叉那一刻、分叉自己之后的运动都接上燃尽后的气流（燃尽前逐字照旧）
  put('    vec3 pc, vc; if(uCq>0.) motQ(sp,vel,U,g,uK,uCq,ts,pc,vc); else { pc=mot(sp,vel,U,g,uK,ts); vc=motv(vel,U,g,uK,ts); }',
    '    vec3 pc, vc; bool lateBr=uLateWind>0. && uT>parentBurn;\n    if(lateBr) lateMotionK(sp,vel,U,g,uK,tb,ts,parentBurn,pc,vc); else if(uCq>0.) motQ(sp,vel,U,g,uK,uCq,ts,pc,vc); else { pc=mot(sp,vel,U,g,uK,ts); vc=motv(vel,U,g,uK,ts); }');
  put('    if(uCq>0.){ vec3 vb; motQ(pc,vc*uBrInh+dv,U,g,uK*uBrKd,uCq,a2,p,vb); } else p=mot(pc,vc*uBrInh+dv,U,g,uK*uBrKd,a2);',
    '    if(lateBr){ vec3 vb; lateMotionK(pc,vc*uBrInh+dv,U,g,uK*uBrKd,tb+ts,a2,parentBurn,p,vb); } else if(uCq>0.){ vec3 vb; motQ(pc,vc*uBrInh+dv,U,g,uK*uBrKd,uCq,a2,p,vb); } else p=mot(pc,vc*uBrInh+dv,U,g,uK*uBrKd,a2);');
  for (const c of ['uCvEmB', 'uCvEmS', 'uCvSpB', 'uCvSpS'])
    put(`max(0.,CV(${c},${c}N,clamp(age/life,0.,1.)))`, `mix(1.,max(0.,CV(${c},${c}N,curveAge)),curveGate)`);
  return source;
}

// 只在新开关启用时编译；原普通/燃尽后着色器的源码逐字保留。
function sparkBurstSource(source) {
  const put = (old, next) => { if (!source.includes(old)) throw Error('爆后气流缺少着色器接入点：' + old); source = source.replace(old, next); };
  put('uniform float uLateWind, uLateScale, uLateFade, uLateCurves;', `uniform float uLateWind, uLateScale, uLateFade, uLateCurves;
uniform float uBurstWind, uBurstScale, uBurstStart, uBurstFade;
vec3 burstAir(vec3 p,float t){float L=max(.2,uBurstScale),ph=t*uBurstWind/L,a=uBurstWind*smoothstep(0.,max(.05,uBurstFade),t-uBurstStart);
  return vec3(a*sin(p.y/L+1.3*ph+1.7),.35*a*sin(p.x/L-.9*ph+2.3),0.);}`);
  put('  return vec3(a*sin(p.y/L+1.3*ph+1.7),.35*a*sin(p.x/L-.9*ph+2.3),0.);}\nvoid lateStep',
    '  return vec3(a*sin(p.y/L+1.3*ph+1.7),.35*a*sin(p.x/L-.9*ph+2.3),0.)+burstAir(p,t);}\nvoid lateStep');
  put('float pre=clamp(burn-born,0.,age);', 'float pre=clamp(min(uLateWind>0. ? burn : 1e9,uBurstStart)-born,0.,age);');
  put('bool lateOn=c==0 && uLateWind>0. && uT>parentBurn;', 'bool lateOn=c==0 && ((uLateWind>0. && uT>parentBurn)||uT>uBurstStart);');
  put('bool lateBr=uLateWind>0. && uT>parentBurn;', 'bool lateBr=(uLateWind>0. && uT>parentBurn)||uT>uBurstStart;');
  return source;
}
