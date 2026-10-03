// 4.0 光点核。size = 实心亮核直径（米），I = 面亮度；像素覆盖积分
// 让亚像素亮核的总光量仍随面积变化。所有新光点用实例四边形，避开
// 硬件 POINT_SIZE 的上下限和点精灵中心取整；3.7 的 shader / VAO 不变。
// 4.3：uGauss = 1 时整颗点是一个高斯（σ = 亮核半径，总光量 = 面亮度 × 亮核面积），给升空尾缀 V5 用——它的星头、光晕、火星一直是高斯点
// （以前走 3.7 光点核）；emitCore40S 再按跟拍拖影把点在竖直方向拉长（总光量不变）。其它产物 uGauss = 0，和以前逐像素一样。
const POINT40_VERTEX = `uniform float uHaloFrac, uHaloR, uGauss; out vec2 vLocal;
void emitCore40R(vec2 q, float I, vec2 r){
  float reach=uGauss>.5?4.:uHaloFrac>0.?4.*max(1.,uHaloR):1.;
  vec2 corner=vec2(float(gl_VertexID&1),float(gl_VertexID>>1))*2.-1.;
  vec2 p=corner*(ceil(r*reach)+vec2(1.));
  gl_Position=vec4((q+p/vec2(uPPM,uPPMY)-uView.xy)/uView.zw,0.,1.);
  vLocal=p; vSig=r; vI=I; vPS=0.;
}
void emitCore40(vec2 q, float I, float size){
  vec2 r=max(size*.5*vec2(uPPM,uPPMY),vec2(1e-7));
  float reach=uHaloFrac>0.?4.*max(1.,uHaloR):1.;
  vec2 corner=vec2(float(gl_VertexID&1),float(gl_VertexID>>1))*2.-1.;
  if(uGauss>.5){ emitCore40R(q,size>0.?I:0.,r); return; }
  vec2 p=corner*(ceil(r*reach)+vec2(1.));
  gl_Position=vec4((q+p/vec2(uPPM,uPPMY)-uView.xy)/uView.zw,0.,1.);
  vLocal=p; vSig=r; vI=size>0.?I:0.; vPS=0.;
}
// sy：跟拍拖影的标准差（像素，匀速一段长 L 时 σ = 0.2887 L）→ 半轴加 L / 2，面亮度按拉长的比例降，总光量不变
void emitCore40S(vec2 q, float I, float size, float sy){
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
  if(uGauss>.5){ float rd=length(vLocal/vSig); o=uChan*(vI*3.14159265*vSig.x*vSig.y*gaussianCoverage(vLocal,vSig)*(1.-smoothstep(3.5,4.,rd))*uW); return; }
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
