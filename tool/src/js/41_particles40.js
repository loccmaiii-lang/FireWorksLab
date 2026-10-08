// 4.0 光点核。size = 实心亮核直径（米），I = 面亮度；像素覆盖积分
// 让亚像素亮核的总光量仍随面积变化。所有新光点用实例四边形，避开
// 硬件 POINT_SIZE 的上下限和点精灵中心取整；3.7 的 shader / VAO 不变。
// 4.3：uGauss = 1 时整颗点按 3.7 光点核画（只给升空尾缀 V5：它的星头、光晕、火星一直是这种点，用户通过的 TR2 就是这样烘的）：
// 总光量 = I（不随大小变），σ = 半径 × 每米像素、最小 0.55 像素，跟拍拖影把 σy 按方差加长（σy² + sy²），画到 5σ、最后 1σ 平滑收到 0。
// 4.3.0 先做成「面亮度 × 面积」的高斯，细火花（σ < 0.55 像素）暗了 5–10 倍、大档白热芯看不出来（和 TR2 对比发现），改回 3.7 的核。
// 其它产物 uGauss = 0，和以前逐像素一样。
const POINT40_VERTEX = `uniform float uHaloFrac, uHaloR, uGauss; out vec2 vLocal;
void emitCore40R(vec2 q, float I, vec2 r){
  float reach=uGauss>.5?5.:uHaloFrac>0.?4.*max(1.,uHaloR):1.;
  vec2 corner=vec2(float(gl_VertexID&1),float(gl_VertexID>>1))*2.-1.;
  vec2 p=corner*(ceil(r*reach)+vec2(1.));
  gl_Position=vec4((q+p/vec2(uPPM,uPPMY)-uView.xy)/uView.zw,0.,1.);
  vLocal=p; vSig=r; vI=I; vPS=0.;
}
void emitCore40(vec2 q, float I, float size){
  vec2 r=max(size*.5*vec2(uPPM,uPPMY),vec2(1e-7));
  float reach=uHaloFrac>0.?4.*max(1.,uHaloR):1.;
  vec2 corner=vec2(float(gl_VertexID&1),float(gl_VertexID>>1))*2.-1.;
  if(uGauss>.5){ vec2 s=max(size*.5*vec2(uPPM,uPPMY),vec2(.55)); emitCore40R(q,I*uPPM*uPPMY/(6.2831853*s.x*s.y),s); return; }
  vec2 p=corner*(ceil(r*reach)+vec2(1.));
  gl_Position=vec4((q+p/vec2(uPPM,uPPMY)-uView.xy)/uView.zw,0.,1.);
  vLocal=p; vSig=r; vI=size>0.?I:0.; vPS=0.;
}
// sy：跟拍拖影的标准差（像素，匀速一段长 L 时 σ = 0.2887 L）→ 半轴加 L / 2，面亮度按拉长的比例降，总光量不变
void emitCore40S(vec2 q, float I, float size, float sy){
  if(uGauss>.5){ vec2 s=max(size*.5*vec2(uPPM,uPPMY),vec2(.55)); s.y=sqrt(s.y*s.y+sy*sy); emitCore40R(q,I*uPPM*uPPMY/(6.2831853*s.x*s.y),s); return; }
  vec2 r=max(size*.5*vec2(uPPM,uPPMY),vec2(1e-7)); float ry=r.y+1.7320508*max(sy,0.);
  emitCore40R(q,size>0.?I*r.y/ry:0.,vec2(r.x,ry));
}`;
const POINT40_FS = HDR + `in float vI; in vec2 vSig, vLocal;
uniform vec4 uChan; uniform float uW, uHaloFrac, uHaloR, uGauss; out vec4 o;
// 圆盘与像素矩形的精确交面积。各轴除半径后成为单位圆，符号原函数
// 在四个角作差；内部/外部像素直接返回，只有边缘需要 asin。
float primitive(float x){ return .5*(x*sqrt(max(0.,1.-x*x))+asin(x)); }
float quadrant(vec2 p){
  vec2 a=min(abs(p),vec2(1.)); float edge=sqrt(max(0.,1.-a.y*a.y));
  float cut=min(a.x,edge);
  float area=a.y*cut+primitive(a.x)-primitive(cut);
  return sign(p.x)*sign(p.y)*area;
}
float diskCoverage(vec2 p,vec2 r){
  vec2 far=(abs(p)+.5)/r, near=max(abs(p)-.5,0.)/r;
  if(dot(far,far)<=1.)return 1.; if(dot(near,near)>=1.)return 0.;
  vec2 a=(p-.5)/r,b=(p+.5)/r;
  return clamp((quadrant(b)-quadrant(vec2(a.x,b.y))-quadrant(vec2(b.x,a.y))+quadrant(a))*r.x*r.y,0.,1.);
}
vec2 erf40(vec2 x){vec2 sg=sign(x);x=abs(x);vec2 t=1./(1.+.3275911*x);return sg*(1.-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*exp(-x*x));}
float gaussianCoverage(vec2 p,vec2 s){vec2 v=.5*(erf40((p+.5)/(1.41421356*s))-erf40((p-.5)/(1.41421356*s)));return max(0.,v.x*v.y);}
void main(){
  if(vI<=0.){o=vec4(0.);return;}
  if(uGauss>.5){     // 3.7 光点核（像素中心取样）；画点范围 = 10σ 见方，范围大于 8σ + 2 像素时边缘 0.8–1 平滑收到 0（和 3.7 的 FS_PTS 一样）
    float h=(ceil(max(vSig.x,vSig.y)*10.)+1.)*.5; if(abs(vLocal.x)>h||abs(vLocal.y)>h){o=vec4(0.);return;}
    vec2 d=vLocal/vSig; float g=exp(-.5*dot(d,d)); if(2.*h>8.*max(vSig.x,vSig.y)+2.) g*=smoothstep(1.,.8,length(vLocal)/h);
    o=uChan*(vI*g*uW); return; }
  float core=diskCoverage(vLocal,vSig), halo=0.;
  if(uHaloFrac>0.){
    vec2 sigma=vSig*max(1.,uHaloR);
    float radial=length(vLocal/sigma);
    // 径向收尾，不留下方形边界；光晕能量相对于亮核的面积定义。
    float window=1.-smoothstep(3.5,4.,radial);
    halo=3.14159265*vSig.x*vSig.y*uHaloFrac/(1.-uHaloFrac)*gaussianCoverage(vLocal,sigma)*window;
  }
  o=uChan*(vI*(core+halo)*uW);
}`;
const POINT40_CPU_VS = HDR + `layout(location=0) in vec2 aP; layout(location=1) in float aI; layout(location=2) in float aS;
uniform vec4 uView,uXf; uniform float uPPM,uPPMY,uUseXf;
out float vI,vPS; out vec2 vSig;
${POINT40_VERTEX}
void main(){ vec2 q=aP; if(uUseXf>.5){vec2 d=q-uXf.xy;q=vec2(d.x*uXf.z-d.y*uXf.w,d.x*uXf.w+d.y*uXf.z);} emitCore40(q,aI,aS); }`;

// 模拟公式只保留一份：GPU 顶点的粒子编号改成实例编号，再替换
// emitPt 输出核。四边形的 gl_VertexID 在最后注入，仍是顶点编号 0–3。
function point40GpuSource(source, streak = false) {
  const hash = GLSL_HASH.slice(0, GLSL_HASH.indexOf('void emitPtW'));
  return source.replace(GLSL_HASH, '/*CORE40*/').replaceAll('gl_VertexID', 'gl_InstanceID')
    .replace('/*CORE40*/', POINT40_VERTEX + hash + `
void emitPt(vec2 q,float I,float size){emitCore40(q,I,size);}
void emitPtW(vec2 q,float I,float size,float span,float sy){${streak ? 'emitCore40S(q,I,size,sy);' : 'emitCore40(q,I,size);'}}
`);
}
const PR40 = {
  pts: compile(POINT40_CPU_VS, POINT40_FS),
  // 4.0：火花编号 = 星号 × 65536 + 序号，和「所有星里最多的火花数 M」无关；改发射率、燃烧时间不再整张重排（问题清单 E1）
  spk: compile(point40GpuSource(VS_SPK).replace('uint uid=uint(pid);', 'uint uid=uint(s)*65536u+uint(j);'), POINT40_FS),
  emit: compile(point40GpuSource(VS_EMIT), POINT40_FS),
  ehead: compile(point40GpuSource(VS_EHEAD), POINT40_FS)
};
// 4.3.8：同一个光点核的可选源分布，按需编译。兼容模式保留原始shader，
// 避免新增运行时分支使驱动重新优化旧核，引入接近量化边界的末位变化。
// sigma=r/2：总量πrxry和二阶矩与圆盘相同；像素覆盖积分，无屏幕模糊。
const gradientPrograms40 = {};
function gradientSource40(source) {
  return source.replaceAll('4.*max(1.,uHaloR):1.', '4.*max(1.,uHaloR):3.')
    .replace('float core=diskCoverage(vLocal,vSig), halo=0.;',
      'float core=3.14159265*vSig.x*vSig.y*gaussianCoverage(vLocal,vSig*.5), halo=0.;');
}
// ---- 4.9.50 星头六边形、火花拉长（用户 10-08 16:2x「可以加个六边形进来吗」、15:56「火星与星头都有一个形状的调试与随机」）----
// 和上面「可选源分布」同一个规矩：参数为 0 时用原来的程序（逐像素不变），不为 0 才编译 / 用变体。
// 六边形：亮核按「圆 → 六边形」混合的距离函数在像素里 4 × 4 取样（面积和圆一样，同一层所有亮点一个朝向，像镜头光圈）；半径 < 1.5 像素时照旧按圆算。
const HEX40_FN = `uniform float uHex, uHexRot;
float shapeD40(vec2 p,vec2 r){ vec2 u=p/r; float c=cos(uHexRot), s=sin(uHexRot); u=vec2(c*u.x+s*u.y,-s*u.x+c*u.y); vec2 a=abs(u);
  float dh=max(dot(a,vec2(.8660254,.5)),a.y)/.95229; return mix(length(u),dh,uHex); }
float hexCov40(vec2 p,vec2 r){ if(min(r.x,r.y)<1.5) return diskCoverage(p,r); float n=0.;
  for(int i=0;i<4;i++) for(int j=0;j<4;j++){ vec2 q=p+(vec2(float(i),float(j))-1.5)*.25; n+=step(shapeD40(q,r),1.); } return n/16.; }
float hexGauss40(vec2 p,vec2 r){ if(min(r.x,r.y)<1.5) return 3.14159265*r.x*r.y*gaussianCoverage(p,r*.5); float n=0.;
  for(int i=0;i<4;i++) for(int j=0;j<4;j++){ vec2 q=p+(vec2(float(i),float(j))-1.5)*.25; float d=shapeD40(q,r)*2.; n+=exp(-.5*d*d); } return 2.*n/16.; }
void main(){`;
function hexFS40(fs) {
  return fs.replace('void main(){', HEX40_FN)
    .replace('float core=diskCoverage(vLocal,vSig), halo=0.;', 'float core=hexCov40(vLocal,vSig), halo=0.;')
    .replace('float core=3.14159265*vSig.x*vSig.y*gaussianCoverage(vLocal,vSig*.5), halo=0.;', 'float core=hexGauss40(vLocal,vSig), halo=0.;');
}
// 火花拉长：沿这粒火花此刻的速度拉成椭圆（长 = 拉长 × 速度 × 1/30 s，拖在后面），总光量不变；只拉普通火花 / 余烬（c == 0），分叉火花不拉
const SPKS40_FN = `
void emitCore40Rot(vec2 q,float I,float size,vec2 dir,float L){
  vec2 r=max(size*.5*vec2(uPPM,uPPMY),vec2(1e-7)); float lp=L*uPPM; vec2 R=vec2(r.x+.5*lp,r.y);
  float reach=uHaloFrac>0.?4.*max(1.,uHaloR):1.;
  vec2 corner=vec2(float(gl_VertexID&1),float(gl_VertexID>>1))*2.-1.;
  vec2 p=corner*(ceil(R*reach)+vec2(1.));
  vec2 w=vec2(dir.x*p.x-dir.y*p.y,dir.y*p.x+dir.x*p.y)-dir*(.5*lp);
  gl_Position=vec4((q+w/vec2(uPPM,uPPMY)-uView.xy)/uView.zw,0.,1.);
  vLocal=p; vSig=R; vI=size>0.?I*r.x/R.x:0.; vPS=0.;
}`;
function spkStretchVS40(vs) {
  const tail = '  emitPt(q,I,size);\n}';
  let v = vs.replace('void emitPt(vec2 q,float I,float size){emitCore40(q,I,size);}', 'void emitPt(vec2 q,float I,float size){emitCore40(q,I,size);}' + SPKS40_FN)
    .replace('uniform sampler2D uPos, uVel, uInfo;', 'uniform sampler2D uPos, uVel, uInfo; uniform float uSpkStr, uSpkStrJ;');
  const at = v.lastIndexOf(tail); if (at < 0) throw new Error('火花拉长：找不到火花着色器的输出行');
  const add = `  if(c==0 && uSpkStr>0.){ vec3 vv=motv(vel,U,g,uK,age); vec2 w2=vv.xy; if(uUseXf>.5) w2=vec2(w2.x*uXf.z-w2.y*uXf.w,w2.x*uXf.w+w2.y*uXf.z);
    float sp=length(w2), L=uSpkStr*sp/30.*(uSpkStrJ>0.?exp(.6*uSpkStrJ*gss(uid,93u)-.18*uSpkStrJ*uSpkStrJ):1.);
    if(L>1e-4 && sp>1e-4){ emitCore40Rot(q,I,size,w2/sp,L); return; } }
`;
  return v.slice(0, at) + add + v.slice(at);
}
const shapePrograms40 = {};
function shapeProgram40(kind) {
  const g = particleQuality.coreProfile ? 1 : 0, key = kind + g; if (shapePrograms40[key]) return shapePrograms40[key];
  const G = x => g ? gradientSource40(x) : x;
  if (kind === 'ptsHex') return shapePrograms40[key] = compile(G(POINT40_CPU_VS), hexFS40(G(POINT40_FS)));
  if (kind === 'spkS') { const vs = point40GpuSource(VS_SPK).replace('uint uid=uint(pid);', 'uint uid=uint(s)*65536u+uint(j);'); return shapePrograms40[key] = compile(G(spkStretchVS40(vs)), G(POINT40_FS)); }
  throw new Error('没有这种光点程序：' + kind);
}
function particleProgram40(kind) {
  if (kind === 'ptsHex' || kind === 'spkS') return shapeProgram40(kind);
  if (!particleQuality.coreProfile || (kind === 'pts' && PT_GAUSS)) return PR40[kind];
  if (!gradientPrograms40[kind]) {
    const vs = kind === 'pts' ? POINT40_CPU_VS : point40GpuSource({spk:VS_SPK,emit:VS_EMIT,ehead:VS_EHEAD}[kind]);
    const stableVS = kind === 'spk' ? vs.replace('uint uid=uint(pid);', 'uint uid=uint(s)*65536u+uint(j);') : vs;
    gradientPrograms40[kind] = compile(gradientSource40(stableVS),gradientSource40(POINT40_FS));
  }
  return gradientPrograms40[kind];
}
PR40.post = compile(VS_QUAD,FS_POST.replace('uniform sampler2D uS, uRef;', 'uniform float uBloom; uniform sampler2D uS, uRef;').replace('c+=b*.2;', 'c+=b*.2*uBloom;'));
const pts40VAO = gl.createVertexArray(); gl.bindVertexArray(pts40VAO);
gl.bindBuffer(gl.ARRAY_BUFFER, pb);
for (const [i,n,offset] of [[0,2,0],[1,1,8],[2,1,12]]) {
  gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i,n,gl.FLOAT,false,16,offset); gl.vertexAttribDivisor(i,1);
}
gl.bindVertexArray(null);
let PARTICLES_DRAWN = 0;      // 4.2.28：真画了多少粒（烘焙分批按它量速度，不再按估计的粒数）
function drawParticleBatch(n, modern) {
  PARTICLES_DRAWN += n;
  if (modern) gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,n);
  else gl.drawArrays(gl.POINTS,0,n);
}
