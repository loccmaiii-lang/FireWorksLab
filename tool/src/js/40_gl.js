// =====================================================================
//  WebGL
// =====================================================================
const canvas = $('#gl');
const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, alpha: false });
if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
  document.body.innerHTML = '<p style="padding:40px;color:#e7735a;font:15px system-ui">当前浏览器不支持 WebGL2 浮点渲染，请用最新版 Chrome 或 Edge 打开。</p>';
  throw new Error('no webgl2');
}
const PT_MAX = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
let PPMY = 0;
let PT_SPAN = 0;       // 画点范围（几倍 σ）；0 = 默认 6σ。尾缀设 10σ，边缘平滑收到 0          // 纵向每米像素数（0 = 与横向相同）；单元序列横竖分别缩放时由烘焙设置

function compile(vs, fs) {
  const mk = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) + '\n' + s); return o; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}
const HDR = '#version 300 es\nprecision highp float;\n';
const VS_QUAD = HDR + `layout(location=0) in vec2 a; out vec2 v_uv; void main(){ v_uv=a; gl_Position=vec4(a*2.-1.,0.,1.); }`;
const VS_RECT = HDR + `layout(location=0) in vec2 a; uniform vec4 uRect; uniform vec4 uView; out vec2 v_uv;
void main(){ v_uv=a; vec2 w=mix(uRect.xy,uRect.zw,a); gl_Position=vec4((w-uView.xy)/uView.zw,0.,1.); }`;
// uXf：把世界坐标平移旋转到某颗星的随体坐标（单元序列用）
const VS_PTS = HDR + `layout(location=0) in vec2 aP; layout(location=1) in float aI; layout(location=2) in float aS;
uniform vec4 uView, uXf; uniform float uPPM, uPPMY; uniform float uMax, uUseXf, uSpan; out float vI; out vec2 vSig; out float vPS;
void main(){ vec2 sig=max(aS*0.5*vec2(uPPM,uPPMY),vec2(0.55)); float ps=min(ceil(max(sig.x,sig.y)*(uSpan>0.?uSpan:6.))+1.,uMax);
  vec2 q=aP; if(uUseXf>.5){ vec2 d=q-uXf.xy; q=vec2(d.x*uXf.z-d.y*uXf.w, d.x*uXf.w+d.y*uXf.z); }
  gl_Position=vec4((q-uView.xy)/uView.zw,0.,1.); gl_PointSize=ps; vI=aI; vSig=sig; vPS=ps; }`;
// 高斯点：uPPM / uPPMY 分别是横、纵每米像素数（单元序列横竖分别缩放时不同）
const FS_PTS = HDR + `in float vI; in vec2 vSig; in float vPS; uniform vec4 uChan; uniform float uW; uniform float uPPM, uPPMY, uKernel, uCore; out vec4 o;
// uKernel = 1：把归一化高斯在整个像素面积上积分（不是只取像素中心），小火星跨像素移动时亮度不跳；uCore：窄亮核占比（移植自 Ultra）
vec2 erf2(vec2 x){ vec2 sg=sign(x); x=abs(x); vec2 t=1./(1.+.3275911*x); return sg*(1.-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*exp(-x*x)); }
float coverage(vec2 p, vec2 s){ vec2 v=.5*(erf2((p+.5)/(1.41421356*s))-erf2((p-.5)/(1.41421356*s))); return max(0.,v.x*v.y); }
void main(){ vec2 p=(gl_PointCoord-.5)*vPS; vec2 d=p/vSig; float g=exp(-.5*dot(d,d))/(6.2831853*vSig.x*vSig.y);
  if(uKernel>.5) g=mix(coverage(p,vSig),coverage(p,max(vSig*.6,vec2(.25))),uCore);
  if(vPS>8.*max(vSig.x,vSig.y)+2.) g*=smoothstep(1.,.8,length(gl_PointCoord-.5)*2.);   // 大范围画点：边缘平滑收到 0，不留硬边
  o=uChan*(vI*g*uPPM*uPPMY*uW); }`;
// 打包进格子：uPad = 格子边缘留空的像素数（防止 mip/压缩时串到相邻格子）
const FS_PACK = HDR + `in vec2 v_uv; uniform sampler2D uS; uniform vec4 uM; uniform float uFade, uPad; uniform int uSS; uniform vec2 uCell; out vec4 o;
void main(){ float m=1.; if(uPad>0.){ vec2 d=min(v_uv,1.-v_uv)*uCell; m=clamp((min(d.x,d.y)-uPad)/uPad,0.,1.); }
  // 超采样缓冲是单格的 uSS 倍：每个输出像素把对应的 uSS×uSS 个样本在线性亮度里平均（2× 时和原来的双线性取样一致）
  vec4 v; if(uSS<=2) v=texture(uS,v_uv); else { ivec2 sz=textureSize(uS,0); ivec2 base=ivec2(floor(v_uv*uCell))*uSS; v=vec4(0.);
    for(int y=0;y<8;y++){ if(y>=uSS) break; for(int x=0;x<8;x++){ if(x>=uSS) break; v+=texelFetch(uS,clamp(base+ivec2(x,y),ivec2(0),sz-1),0); } } v/=float(uSS*uSS); }
  o=vec4(dot(v,uM)*uFade*m); }`;
// 编码：合并 = 星头与拖尾各自曝光后相加；单通道时 RGB 相同
const FS_ENC = HDR + `in vec2 v_uv; uniform sampler2D uH,uT; uniform float uEH,uET,uG,uWhich,uSingle; out vec4 o;
void main(){ vec4 h=max(texture(uH,v_uv),0.), t=max(texture(uT,v_uv),0.);
  vec4 x = uWhich<.5 ? h*uEH+t*uET : (uWhich<1.5 ? h*uEH : t*uET);
  vec4 v = pow(1.-exp(-x), vec4(1./uG));
  o = uSingle>.5 ? vec4(v.rrr,1.) : v; }`;
const RAMP_FN = `uniform vec3 uR0,uR1,uR2,uR3;
vec3 ramp(float v){ v=clamp(v,0.,1.); if(v<.3) return mix(uR0,uR1,v/.3); if(v<.65) return mix(uR1,uR2,(v-.3)/.35); return mix(uR2,uR3,(v-.65)/.35); }`;
const FS_RGMAT = HDR + `in vec2 v_uv; uniform sampler2D uS; uniform float uEH,uET,uG,uComb,uHI,uTI,uK; uniform vec3 uTint; out vec4 o;
${RAMP_FN}
void main(){ vec2 rg=max(texture(uS,v_uv).rg,0.);
  if(uComb>.5){ float v=pow(1.-exp(-(rg.r*uEH+rg.g*uET)),1./uG); o=vec4(ramp(v)*v*uTint*uHI*uK,1.); }
  else { float h=pow(1.-exp(-rg.r*uEH),1./uG), t=pow(1.-exp(-rg.g*uET),1./uG); o=vec4((h*uTint*uHI+ramp(t)*t*uTI)*uK,1.); } }`;
const CELLV = `uniform float uCols,uRows,uChans;
float cellv(sampler2D s,float f,vec2 uv){ float per=uCols*uRows; float c=floor(f/per); float k=f-c*per;
  vec2 st=(vec2(mod(k,uCols),uRows-1.-floor(k/uCols))+uv)/vec2(uCols,uRows);
  vec4 x=texture(s,st); if(uChans<1.5) return x.r; return dot(x,vec4(equal(vec4(c),vec4(0.,1.,2.,3.)))); }`;
// 模拟项目材质：帧号取整、不混合；RGBA 接力 = 先填满 R 的全部格子再接 G；灰度查渐变图，乘 Color Over Life
const FS_MAT = HDR + `in vec2 v_uv; uniform sampler2D uH,uT; uniform float uFrame,uComb,uHI,uTI,uK,uMirror; uniform vec2 uInset; uniform vec3 uTint; out vec4 o;
${RAMP_FN}
${CELLV}
void main(){ if(uFrame<0.){ o=vec4(0.); return; }
  vec2 uv=v_uv; if(uMirror>.5) uv.x=1.-uv.x; uv=clamp(uv,uInset,1.-uInset);
  if(uComb>.5){ float v=cellv(uH,uFrame,uv); o=vec4(ramp(v)*v*uTint*uHI*uK,1.); }
  else { float h=cellv(uH,uFrame,uv), t=cellv(uT,uFrame,uv); o=vec4((h*uTint*uHI+ramp(t)*t*uTI)*uK,1.); } }`;
// 显示：色调映射 + 实拍参考叠加（1 叠加 / 2 卷帘 / 3 差值）+ A/B 分割线
const FS_POST = HDR + `in vec2 v_uv; uniform sampler2D uS, uRef; uniform float uX, uRefMode, uRefA, uSplit, uWipe; uniform vec2 uTx; uniform vec4 uRefXf; out vec4 o;
vec3 bl(float l){ vec2 d=uTx*exp2(l); vec3 s=textureLod(uS,v_uv,l).rgb*.4;
  s+=textureLod(uS,v_uv+vec2(d.x,0.),l).rgb*.15; s+=textureLod(uS,v_uv-vec2(d.x,0.),l).rgb*.15;
  s+=textureLod(uS,v_uv+vec2(0.,d.y),l).rgb*.15; s+=textureLod(uS,v_uv-vec2(0.,d.y),l).rgb*.15; return s; }
void main(){ vec3 c=textureLod(uS,v_uv,0.).rgb; vec3 b=bl(1.)*.5+bl(3.)*.32+bl(5.)*.18; c+=b*.2;
  vec3 sky=mix(vec3(.0032,.0038,.009),vec3(.0011,.0013,.0032),v_uv.y);
  c=1.-exp(-(c*uX+sky)); c=pow(c,vec3(1./2.2));
  if(uRefMode>.5){
    vec2 r=vec2((v_uv.x-.5-uRefXf.y)/uRefXf.x+.5, (v_uv.y-.5-uRefXf.z)*uRefXf.w/uRefXf.x+.5);
    vec3 ref = (r.x<0.||r.y<0.||r.x>1.||r.y>1.) ? vec3(0.) : texture(uRef,r).rgb;
    if(uRefMode<1.5) c=mix(c,ref,uRefA);
    else if(uRefMode<2.5){ if(v_uv.x>uWipe) c=ref; if(abs(v_uv.x-uWipe)<uTx.x*1.5) c=vec3(.2,.8,1.); }
    else c=abs(c-ref)*2.;
  }
  if(uSplit>0.&&abs(v_uv.x-uSplit)<uTx.x*1.5) c=vec3(.91,.70,.37);
  o=vec4(c,1.); }`;
const FS_ATLAS = HDR + `in vec2 v_uv; uniform sampler2D uS; uniform float uFrame,uN,uCols,uRows,uChans,uAspect; uniform float uTrail[6]; out vec4 o;
void main(){ float panes=uChans>1.5?2.:1.;
  vec2 q=floor(v_uv*panes); vec2 uv=fract(v_uv*panes); int ch=panes>1.5?int(q.x+(1.-q.y)*2.):0;
  vec2 sc=uAspect>=1.?vec2(1.,1./uAspect):vec2(uAspect,1.); vec2 tuv=(uv-.5)/sc+.5;
  float gap=6.*panes/uN; vec2 e=min(tuv,1.-tuv);
  if(tuv.x<0.||tuv.y<0.||tuv.x>1.||tuv.y>1.||min(e.x,e.y)<gap*.5){ o=vec4(.05,.055,.07,1.); return; }
  vec4 s=texture(uS,tuv); float v=ch==0?s.r:ch==1?s.g:ch==2?s.b:s.a;
  vec3 col=vec3(v); vec2 grid=vec2(uCols,uRows); vec2 cellPx=uN/panes*sc/grid;
  vec2 g=abs(fract(tuv*grid)-.5); vec2 lw=1.2/cellPx; if(g.x>.5-lw.x||g.y>.5-lw.y) col=mix(col,vec3(.16,.17,.22),.8);
  float per=uCols*uRows; float fc=floor(uFrame/per); float k=uFrame-fc*per; vec2 cell=vec2(mod(k,uCols),uRows-1.-floor(k/uCols));
  vec2 cc=floor(tuv*grid);
  for(int i=0;i<6;i++){ float tf=uTrail[i]; if(tf<0.) continue; float c2=floor(tf/per), k2=tf-c2*per; vec2 cl2=vec2(mod(k2,uCols),uRows-1.-floor(k2/uCols));
    if(float(ch)==c2&&cc==cl2){ vec2 f2=abs(fract(tuv*grid)-.5); vec2 lw3=2./cellPx; col=mix(col,vec3(.91,.70,.37),.06*(1.-float(i)/6.)); if(f2.x>.5-lw3.x||f2.y>.5-lw3.y) col=mix(col,vec3(.91,.70,.37),.6*(1.-float(i)/6.)); } }
  if(uFrame>=0.&&float(ch)==fc&&cc==cell){ col=mix(col,vec3(.91,.70,.37),.1); vec2 f=abs(fract(tuv*grid)-.5); vec2 lw2=3./cellPx; if(f.x>.5-lw2.x||f.y>.5-lw2.y) col=vec3(.91,.70,.37); }
  if(v>=.999) col=mix(col,vec3(1.,.25,.2),.6);
  o=vec4(col,1.); }`;

// 流转预览：单独放大显示当前格（最近邻采样，能看清真实像素）
const FS_CELL = HDR + `in vec2 v_uv; uniform sampler2D uS; uniform float uFrame, uCols, uRows, uChans; uniform vec2 uPx; out vec4 o;
void main(){ float per=uCols*uRows; float c=floor(uFrame/per); float k=uFrame-c*per;
  vec2 st=(vec2(mod(k,uCols),uRows-1.-floor(k/uCols))+v_uv)/vec2(uCols,uRows);
  vec2 ts=vec2(textureSize(uS,0)); vec4 x=texelFetch(uS,ivec2(min(st*ts,ts-1.)),0);
  float v = uChans<1.5 ? x.r : dot(x,vec4(equal(vec4(c),vec4(0.,1.,2.,3.))));
  vec3 col=vec3(v); if(v>=.999) col=vec3(1.,.3,.25);
  vec2 e=min(v_uv,1.-v_uv)/uPx; if(min(e.x,e.y)<1.5) col=vec3(.91,.70,.37);
  o=vec4(col,1.); }`;
const GLSL_HASH = `uint pcg(uint v){ uint s=v*747796405u+2891336453u; uint w=((s>>((s>>28u)+4u))^s)*277803737u; return (w>>22u)^w; }
float hsh(uint a, uint b){ return float(pcg(a ^ pcg(b + uint(uSeed)*2654435769u))) / 4294967296.0; }
float gss(uint a, uint b){ float u1=max(hsh(a,b),1e-7), u2=hsh(a,b+101u); return sqrt(-2.*log(u1))*cos(6.2831853*u2); }
void cull(){ gl_Position=vec4(2.,2.,2.,1.); gl_PointSize=1.; vI=0.; vSig=vec2(1.); vPS=1.; }
float glowOf(float T){ float g=(T-900.)/1150.; return g>0.? g*g*g : 0.; }
// 线性阻力 + 重力 + 气流 U 的解析解
vec3 mot(vec3 p0, vec3 v0, vec3 U, vec3 g, float k, float a){ if(k>1e-4){ vec3 vi=U+g/k; return p0+vi*a+(v0-vi)*(1.-exp(-k*a))/k; } return p0+v0*a+.5*g*a*a; }
vec3 motv(vec3 v0, vec3 U, vec3 g, float k, float a){ if(k>1e-4){ vec3 vi=U+g/k; return vi+(v0-vi)*exp(-k*a); } return v0+g*a; }
void emitPtW(vec2 q, float I, float size, float span, float sy){ vec2 sig=max(size*.5*vec2(uPPM,uPPMY),vec2(.55)); sig.y=sqrt(sig.y*sig.y+sy*sy); float ps=min(ceil(max(sig.x,sig.y)*span)+1.,uMax);
  gl_Position=vec4((q-uView.xy)/uView.zw,0.,1.); gl_PointSize=ps; vI=I; vSig=sig; vPS=ps; }
void emitPt(vec2 q, float I, float size){ vec2 sig=max(size*.5*vec2(uPPM,uPPMY),vec2(.55)); float ps=min(ceil(max(sig.x,sig.y)*6.)+1.,uMax);
  gl_Position=vec4((q-uView.xy)/uView.zw,0.,1.); gl_PointSize=ps; vI=I; vSig=sig; vPS=ps; }`;

// GPU 火花：每颗火花由编号推出所属星体和出生时刻，从轨迹纹理取星体当时的状态，
// 再用线性阻力 + 重力的解析解直接算出任意时刻的位置，显存里不存任何火花状态。
// 风与湍流：取发射点处的气流速度 U，按解析解整体偏移（衰减噪声偏移近似）。
// 松叶：每粒火花在寿命的某一时刻分成 uBr 支短命的亮枝；辉星：火花在延迟后闪一下。
const VS_SPK = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uPos, uVel, uInfo;
uniform float uT, uDT; uniform int uM, uNs, uSeed, uTw, uBr;
uniform float uInh, uSpread, uLife, uLifeEnd, uLifeJit, uK, uG, uT0, uCool, uTwk, uBright, uSize, uGlit, uGlitD, uBrAt, uMir, uRefl, uWind;
uniform float uEmb, uEmbL, uEmbB, uEmbF, uEmbS, uHotStop, uEmbE, uTailJit, uShoulder, uDif, uDifL;
uniform vec4 uTm[3]; uniform float uTa[3];
uniform vec4 uView, uXf; uniform float uPPM, uPPMY, uMax, uUseXf;
out float vI; out vec2 vSig; out float vPS;
${GLSL_HASH}
vec2 airAt(vec2 p, float t){ vec2 u=vec2(uWind,0.); for(int i=0;i<3;i++){ float c=uTa[i]*cos(dot(uTm[i].xy,p)+uTm[i].z*t+uTm[i].w); u+=vec2(c*uTm[i].y,-c*uTm[i].x); } return u; }
// 平滑噪声 + 旋度（无散度的旋涡场，尾迹扩散用）
float lh(vec2 i){ uvec2 u=uvec2(ivec2(i)+ivec2(32768)); return hsh(u.x*73856093u^u.y*19349663u,81u); }
float vn(vec2 q){ vec2 i=floor(q), f=fract(q); f=f*f*(3.-2.*f); return mix(mix(lh(i),lh(i+vec2(1.,0.)),f.x),mix(lh(i+vec2(0.,1.)),lh(i+vec2(1.,1.)),f.x),f.y); }
float vn2(vec2 q){ return vn(q)+.5*vn(q*2.03+vec2(17.3,5.1)); }
vec2 curl2(vec2 q){ float e=.05; return vec2(vn2(q+vec2(0.,e))-vn2(q-vec2(0.,e)), -(vn2(q+vec2(e,0.))-vn2(q-vec2(e,0.))))/(2.*e)*.5; }
void main(){
  int nb=1+uBr; int id=gl_VertexID; int pid=id/nb; int c=id-pid*nb;
  int s=pid/uM; int j=pid-s*uM; uint uid=uint(pid);
  vec4 inf=texelFetch(uInfo,ivec2(0,s),0);
  if(inf.z<=0.){ cull(); return; }
  // 发射率随燃烧线性变化（末段火花密度）：累计数 N(t) = r0·t + a·t²，按编号反解出生时刻
  float nj=float(j)+hsh(uid,1u), tb;
  if(abs(inf.w)<1e-6) tb=inf.x+nj/inf.z;
  else { float dsc=inf.z*inf.z+4.*inf.w*nj; if(dsc<0.){ cull(); return; } tb=inf.x+2.*nj/(inf.z+sqrt(dsc)); }
  if(tb>=inf.y||tb>uT){ cull(); return; }
  float phase=clamp((tb-inf.x)/max(.05,inf.y-inf.x),0.,1.);
  float life=uLife*(1.+(uLifeEnd-1.)*phase)*exp(uLifeJit*gss(uid,2u)); float age=uT-tb;
  // 余烬长尾（锦冠的木炭余烬 / 受光烟迹）：一部分火花寿命长、亮度低，沿星的轨迹留下暗长线；
  // uEmbF > 0 时亮度跟着母星：母星烧完后 uEmbF 秒内淡掉（烟迹是被星自己照亮的）
  bool emb=uEmb>0. && uBr==0 && hsh(uid,51u)<uEmb; if(emb) life=uEmbL*exp(.2*gss(uid,52u));
  // emberAll：余烬（光丝）贯穿整个燃烧期，普通火花只在前 sparkStop 秒（分层星外层的引き火花先停）
  if(!emb && uHotStop>0. && tb-inf.x>uHotStop){ cull(); return; }
  float ts=uBr>0 ? life*uBrAt*(.8+.4*hsh(uid,21u)) : 1e9;
  uint u2=uid*7u+uint(c); float life2=.16*(.6+.8*hsh(u2,23u));
  if(c==0){ if(age>=life||age>=ts){ cull(); return; } }
  else if(age<ts||age>=ts+life2){ cull(); return; }
  float fi=tb/uDT; int i0=clamp(int(floor(fi)),0,uNs-2); float f=clamp(fi-float(i0),0.,1.);
  vec3 p0=texelFetch(uPos,ivec2(i0,s),0).xyz, p1=texelFetch(uPos,ivec2(i0+1,s),0).xyz;
  vec3 v0=texelFetch(uVel,ivec2(i0,s),0).xyz, v1=texelFetch(uVel,ivec2(i0+1,s),0).xyz;
  float f2=f*f, f3=f2*f;
  vec3 sp=(2.*f3-3.*f2+1.)*p0+(f3-2.*f2+f)*uDT*v0+(-2.*f3+3.*f2)*p1+(f3-f2)*uDT*v1;
  vec3 sv=mix(v0,v1,f);
  float inh=uInh*(.3+1.4*hsh(uid,4u));
  vec3 vel=sv*inh+vec3(gss(uid,5u),gss(uid,7u),gss(uid,9u))*uSpread;
  vec3 U=vec3(airAt(sp.xy,tb),0.), g=vec3(0.,-uG,0.);
  float T0=uT0+120.*gss(uid,11u), I, size=uSize; vec3 p;
  if(c==0){
    p=mot(sp,vel,U,g,uK,age);
    float gl=emb ? glowOf(T0)*uEmbB*exp(-2.*age/life)*(1.-smoothstep(.75,1.,age/life))*(uEmbF>0. ? 1.-smoothstep(inf.y-.15,inf.y+uEmbF,uT) : 1.)*(uEmbE>0. ? 1.-smoothstep(uEmbE-.6,uEmbE+.3,uT) : 1.) : glowOf(T0*(1.-uCool*age/life));
    if(emb) size=uSize*uEmbS;
    if(uGlit>0.){ float tf=uGlitD*(.5+hsh(uid,17u)); float e=(age-tf)/.03; gl=gl*(1.-.85*uGlit)+uGlit*6.*exp(-e*e); }
    I=gl;
  } else {
    vec3 pc=mot(sp,vel,U,g,uK,ts), vc=motv(vel,U,g,uK,ts);
    vec3 dv=normalize(vec3(gss(u2,31u),gss(u2,33u),gss(u2,35u))+1e-4)*(4.+uSpread*1.5)*(.6+.8*hsh(u2,37u));
    float a2=age-ts, x=a2/life2;
    p=mot(pc,vc*.5+dv,U,g,uK*1.5,a2);
    I=glowOf(T0*(1.-uCool*ts/life)*1.08)*1.8*(1.-x)*(1.-x); size=uSize*.7;
  }
  // 尾迹扩散（4.2.0，tailDiffuse / tailDiffuseScale，用户 2026-10-02 16:22）：火花被阻力停下来以后仍被空气扰流带着走，越老离原位越远。
  // 位移 = 扰流速度 × Tl × x/√(1+x)，x = 年龄 / Tl，Tl = 尺度 / 速度：刚出生像被吹着走（∝ 年龄），老了变成扩散（∝ √年龄）。
  // 方向 = 发射点处平滑的旋涡场（相邻火花一起飘成一缕）+ 每粒自己的随机（散开）。默认 0 不进分支，结果不变。
  if(uDif>0.){ float Tl=uDifL/max(uDif,.05), x=age/Tl, sg=uDif*Tl*x/sqrt(1.+x);
    p.xy+=(curl2(sp.xy/uDifL)+.45*vec2(gss(uid,71u),gss(uid,73u)))*sg; }
  if(I<=0.){ cull(); return; }
  I*=(1.+uTwk*(2.*hsh(u2,uint(uTw)*16u+13u)-1.))*uBright*.6;
  if(uMir>.5){ if(p.y<0.){ cull(); return; }
    if(uMir>1.5){ p.x+=.012*p.y*sin(.35*p.y+7.*uT)+.3*sin(1.7*p.y+3.*uT); I*=uRefl*exp(-p.y/400.); p.y=-p.y; size*=1.3; } }
  // 尾迹外形（每个效果自己的参数 tailJit / tailShoulder）：粗细随机 = 每颗星一个粗细倍数 × 每粒火花一点抖动；亮肩 = 新火花大而亮、老火花细而暗。默认 0 时不进分支，结果不变
  if(uTailJit>0.){ size*=exp(uTailJit*.35*gss(uid,61u))*max(.15,1.+uTailJit*1.2*(hsh(uint(s),62u)-.5)); }
  if(uShoulder!=0. && c==0){ float sh=uShoulder*(.8-1.6*clamp(age/life,0.,1.)); size*=max(.1,1.+sh); I*=max(.15,1.+.6*sh); }
  vec2 q=p.xy; if(uUseXf>.5){ vec2 d=q-uXf.xy; q=vec2(d.x*uXf.z-d.y*uXf.w, d.x*uXf.w+d.y*uXf.z); }
  emitPt(q,I,size);
}`;
// 循环发射器（地面类与上升星头循环）：火花按周期性编号生成，t 与 t+周期 的画面完全相同。
// 模式 0 固定喷口（喷口位置、方向来自纹理）；1 转轮；2 彗星（扇形/连发，彗星自己也发火花）；3 随体坐标里的尾迹（上升星头）
const VS_EMIT = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uSrc;
uniform float uT, uRate, uLife, uK, uG, uSpread, uInh, uT0, uCool, uTwk, uBright, uSize, uJet, uCone, uOmega, uShot, uShotSpd, uFan, uCBurn, uCK, uGH, uSpacing, uWR;
uniform int uMode, uMw, uNsrc, uMp, uNshot, uSeed, uTw;
uniform vec3 uFV; uniform vec4 uView; uniform float uPPM, uPPMY, uMax;
out float vI; out vec2 vSig; out float vPS;
${GLSL_HASH}
vec3 coneDir(vec3 base, uint key){ float th=uCone*sqrt(hsh(key,41u)), ph=6.2831853*hsh(key,43u);
  vec3 b1=normalize(vec3(-base.y,base.x,0.)+1e-6), b2=vec3(0.,0.,1.); return base*cos(th)+(b1*cos(ph)+b2*sin(ph))*sin(th); }
void comet(int km, float ct, out vec3 p, out vec3 v){
  int n=km-(km/uNsrc)*uNsrc; float fr=uNsrc>1?float(n)/float(uNsrc-1):.5;
  float ang=1.5707963+uFan*(.5-fr)+.02*gss(uint(km),3u);
  vec3 p0=vec3((float(n)-.5*float(uNsrc-1))*uSpacing,uGH,0.), v0=vec3(cos(ang),sin(ang),0.)*uShotSpd*(1.+.03*gss(uint(km),5u));
  p=mot(p0,v0,vec3(0.),vec3(0.,-9.81,0.),uCK,ct); v=motv(v0,vec3(0.),vec3(0.,-9.81,0.),uCK,ct); }
void main(){
  int id=gl_VertexID; int src=id/uMw; int w=id-src*uMw;
  vec3 sp, vel; float tb; uint key; vec3 g=vec3(0.,-uG,0.);
  if(uMode==2){
    int k=int(floor(uT*uShot))-src; float ts=float(k)/uShot, ca=uT-ts; if(ca<0.){ cull(); return; }
    int km=((k%uNshot)+uNshot)%uNshot; int j=int(floor(min(ca,uCBurn)*uRate))-w; if(j<0){ cull(); return; }
    key=uint(km)*65537u+uint(j); tb=ts+(float(j)+hsh(key,1u))/uRate; if(tb>uT||tb-ts>uCBurn){ cull(); return; }
    vec3 cv; comet(km,tb-ts,sp,cv);
    vel=cv*uInh*(.3+1.4*hsh(key,4u))+vec3(gss(key,5u),gss(key,7u),gss(key,9u))*uSpread;
  } else {
    int gi=int(floor(uT*uRate))-w; int gm=((gi%uMp)+uMp)%uMp; key=uint(src)*1000003u+uint(gm);
    tb=(float(gi)+hsh(key,1u))/uRate; if(tb>uT){ cull(); return; }
    vec3 jit=vec3(gss(key,5u),gss(key,7u),gss(key,9u))*uSpread;
    if(uMode==0){ vec4 S=texelFetch(uSrc,ivec2(src,0),0); float a=radians(S.z); sp=vec3(S.xy,0.);
      vel=coneDir(vec3(cos(a),sin(a),0.),key)*uJet*(1.+.15*gss(key,13u))+jit; }
    else if(uMode==1){ float a=uOmega*tb+6.2831853*float(src)/float(uNsrc); vec3 tg=vec3(-sin(a),cos(a),0.);
      sp=vec3(uWR*cos(a),uGH+uWR*sin(a),0.); vel=coneDir(-tg,key)*uJet*(1.+.1*gss(key,13u))+tg*uOmega*uWR+jit; }
    else { sp=vec3(0.); vel=uFV*uInh*(.3+1.4*hsh(key,4u))+jit; }
  }
  float life=uLife*exp(.45*gss(key,2u)), age=uT-tb; if(age>=life){ cull(); return; }
  vec3 p=mot(sp,vel,vec3(0.),g,uK,age); if(uMode==3) p-=uFV*age;
  float I=glowOf((uT0+120.*gss(key,11u))*(1.-uCool*age/life)); if(I<=0.){ cull(); return; }
  I*=(1.+uTwk*(2.*hsh(key,uint(uTw)*16u+13u)-1.))*uBright*.6;
  emitPt(p.xy,I,uSize);
}`;
// 地面类的「星头」：仕掛け的灯芯（模式 0）、转轮喷口（1）、彗星与末端小花（2）
const VS_EHEAD = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uSrc;
uniform float uT, uShot, uShotSpd, uFan, uCBurn, uCK, uGH, uSpacing, uWR, uOmega, uHead, uHI, uFlick, uSS, uSB;
uniform int uMode, uNsrc, uNshot, uSeed, uTw, uNb;
uniform vec4 uView; uniform float uPPM, uPPMY, uMax;
out float vI; out vec2 vSig; out float vPS;
${GLSL_HASH}
void comet(int km, float ct, out vec3 p, out vec3 v){
  int n=km-(km/uNsrc)*uNsrc; float fr=uNsrc>1?float(n)/float(uNsrc-1):.5;
  float ang=1.5707963+uFan*(.5-fr)+.02*gss(uint(km),3u);
  vec3 p0=vec3((float(n)-.5*float(uNsrc-1))*uSpacing,uGH,0.), v0=vec3(cos(ang),sin(ang),0.)*uShotSpd*(1.+.03*gss(uint(km),5u));
  p=mot(p0,v0,vec3(0.),vec3(0.,-9.81,0.),uCK,ct); v=motv(v0,vec3(0.),vec3(0.,-9.81,0.),uCK,ct); }
void main(){
  int id=gl_VertexID; float fl=1.+uFlick*(2.*hsh(uint(id),uint(uTw)*16u+7u)-1.);
  if(uMode==0){ vec4 S=texelFetch(uSrc,ivec2(id,0),0); emitPt(S.xy,uHI*fl,uHead); return; }
  if(uMode==1){ float a=uOmega*uT+6.2831853*float(id)/float(uNsrc); emitPt(vec2(uWR*cos(a),uGH+uWR*sin(a)),uHI*fl,uHead); return; }
  int nb=1+uNb; int kr=id/nb, b=id-kr*nb;
  int k=int(floor(uT*uShot))-kr; float ts=float(k)/uShot, ca=uT-ts; if(ca<0.){ cull(); return; }
  int km=((k%uNshot)+uNshot)%uNshot; vec3 p, v;
  if(b==0){ if(ca>=uCBurn){ cull(); return; } comet(km,ca,p,v); emitPt(p.xy,uHI*fl*min(1.,ca/.04),uHead); return; }
  if(ca<uCBurn){ cull(); return; }
  uint key=uint(km)*131u+uint(b); float a2=ca-uCBurn, life=uSB*(.8+.4*hsh(key,3u)); if(a2>=life){ cull(); return; }
  comet(km,uCBurn,p,v); vec3 d=normalize(vec3(gss(key,5u),gss(key,7u),gss(key,9u))+1e-4);
  vec3 q=mot(p,v*.3+d*uSS*(1.+.1*gss(key,11u)),vec3(0.),vec3(0.,-9.81,0.),.6,a2);
  float x=a2/life; emitPt(q.xy,uHI*.9*fl*(1.-x*x),uHead*.8);
}`;
// 单元序列的导出预览：模拟 Cascade —— 每颗星一个粒子，线性阻力 + 恒定加速度，面片沿速度方向对齐
const VS_UNIT = HDR + `uniform float uTime, uV0, uDrag, uA, uWind, uLife, uLJ, uSX, uSY, uHb, uFlip; uniform int uSeed; uniform vec4 uView; uniform vec2 uKF[8], uKX[8], uKY[8]; uniform int uNKF, uNKX, uNKY; uniform float uNF;
out vec2 v_uv; out float vFrame;
uint pcg(uint v){ uint s=v*747796405u+2891336453u; uint w=((s>>((s>>28u)+4u))^s)*277803737u; return (w>>22u)^w; }
float hsh(uint a, uint b){ return float(pcg(a ^ pcg(b + uint(uSeed)*2654435769u))) / 4294967296.0; }
#define EVALK(NAME, K, NK) float NAME(float u){ if(u<=K[0].x) return K[0].y; for(int i=1;i<8;i++){ if(i>=NK) break; if(u<=K[i].x){ vec2 a=K[i-1], b=K[i]; return a.y+(b.y-a.y)*(u-a.x)/max(b.x-a.x,1e-6); } } return K[NK-1].y; }
EVALK(evalK, uKF, uNKF)
EVALK(evalX, uKX, uNKX)
EVALK(evalY, uKY, uNKY)
void main(){
  uint id=uint(gl_InstanceID); vec2 c=vec2(float(gl_VertexID&1), float(gl_VertexID>>1));
  float z=2.*hsh(id,1u)-1., ph=6.2831853*hsh(id,2u), r=sqrt(max(0.,1.-z*z)); vec3 d=vec3(r*cos(ph),z,r*sin(ph));
  float life=uLife*(1.+uLJ*(2.*hsh(id,3u)-1.)), t=uTime, rel=t/life;
  if(rel>=1.||t<0.){ gl_Position=vec4(2.,2.,2.,1.); v_uv=c; vFrame=-1.; return; }
  vec3 vi=vec3(uWind,-uA/max(uDrag,1e-4),0.), v0=d*uV0; float e=exp(-uDrag*t);
  vec3 p=vi*t+(v0-vi)*(1.-e)/max(uDrag,1e-4), v=vi+(v0-vi)*e;
  vec2 up=length(v.xy)>1e-3?normalize(v.xy):vec2(0.,1.); if(uFlip>.5) up=-up; vec2 rt=vec2(up.y,-up.x);
  vec2 lc=vec2((c.x-.5)*uSX*evalX(rel), (c.y-uHb)*uSY*evalY(rel));
  vec2 w=p.xy+rt*lc.x+up*lc.y;
  gl_Position=vec4((w-uView.xy)/uView.zw,0.,1.); v_uv=c; vFrame=clamp(floor(evalK(rel)),0.,uNF-1.);
}`;
const FS_UNIT = HDR + `in vec2 v_uv; in float vFrame; uniform sampler2D uH,uT; uniform float uComb,uHI,uTI,uK; uniform vec2 uInset; uniform vec3 uTint; out vec4 o;
${RAMP_FN}
${CELLV}
void main(){ if(vFrame<0.){ discard; } vec2 uv=clamp(v_uv,uInset,1.-uInset);
  if(uComb>.5){ float v=cellv(uH,vFrame,uv); o=vec4(ramp(v)*v*uTint*uHI*uK,1.); }
  else { float h=cellv(uH,vFrame,uv), t=cellv(uT,vFrame,uv); o=vec4((h*uTint*uHI+ramp(t)*t*uTI)*uK,1.); } }`;
const PR = {
  pts: compile(VS_PTS, FS_PTS), pack: compile(VS_QUAD, FS_PACK), enc: compile(VS_QUAD, FS_ENC),
  spk: compile(VS_SPK, FS_PTS), emit: compile(VS_EMIT, FS_PTS), ehead: compile(VS_EHEAD, FS_PTS),
  rgmat: compile(VS_QUAD, FS_RGMAT), mat: compile(VS_RECT, FS_MAT), unit: compile(VS_UNIT, FS_UNIT),
  post: compile(VS_QUAD, FS_POST), atlas: compile(VS_QUAD, FS_ATLAS), cell: compile(VS_QUAD, FS_CELL)
};
const quadVAO = gl.createVertexArray(); gl.bindVertexArray(quadVAO);
const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const ptsVAO = gl.createVertexArray(); gl.bindVertexArray(ptsVAO);
const pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pb);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 8);
gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 16, 12);
gl.bindVertexArray(null);
const bufH = new Float32Array(4 * 30000), bufT = new Float32Array(4 * 450000);
const emptyVAO = gl.createVertexArray();
const MAX_TEX = gl.getParameter(gl.MAX_TEXTURE_SIZE);
function floatTex(w, h, data) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, data);
  return t;
}
// 星体轨迹：在 CPU 上把星体（含千轮子花）跑一遍，按固定间隔采样位置和速度，打包成浮点纹理
function buildTrack(P) {
  P = { ...P, engine: 'gpu' };
  const sim = new Sim(P), D = P.duration;
  const k = Math.max(2, Math.ceil(D / (MAX_TEX - 4) / H_STEP)), dt = k * H_STEP, Ns = Math.ceil(D / dt) + 2;
  const snaps = [];
  for (let i = 0; i < Ns; i++) {
    const n = sim.all.length, a = new Float32Array(n * 6);
    for (let q = 0; q < n; q++) { const st = sim.all[q]; a[q * 6] = st.x; a[q * 6 + 1] = st.y; a[q * 6 + 2] = st.z; a[q * 6 + 3] = st.vx; a[q * 6 + 4] = st.vy; a[q * 6 + 5] = st.vz; }
    snaps.push(a);
    for (let q = 0; q < k; q++) sim.step(H_STEP);
  }
  const nStars = Math.min(sim.all.length, MAX_TEX);
  const pos = new Float32Array(Ns * nStars * 4), vel = new Float32Array(Ns * nStars * 4), info = new Float32Array(nStars * 4);
  let M = 1, total = 0;
  for (let q = 0; q < nStars; q++) {
    const st = sim.all[q], first = snaps.findIndex(a => a.length > q * 6);
    for (let i = 0; i < Ns; i++) {
      const a = snaps[Math.max(i, first)], o = (q * Ns + i) * 4;
      pos[o] = a[q * 6]; pos[o + 1] = a[q * 6 + 1]; pos[o + 2] = a[q * 6 + 2];
      vel[o] = a[q * 6 + 3]; vel[o + 1] = a[q * 6 + 4]; vel[o + 2] = a[q * 6 + 5];
    }
    // 分层星：外层（带木炭火花尾）烧 sparkStop 秒后火花停，内层只发光不出火花；sparkStart：点火后过几秒才开始出火花（末段才出的短尾）
    const ig = st.birth + (st.ign || 0), s0 = P.sparkStart > 0 && st.kind !== 5 ? P.sparkStart : 0, born = ig + s0;
    const death = Math.min(st.birth + (st.vis != null ? st.vis : st.burn), D, P.sparkStop > 0 && st.kind !== 5 && !(P.emberFrac > 0 && P.emberAll) ? ig + P.sparkStop : 1e9);
    // 4.0：落水 / 分砲提前熄灭的星，火花也在那一刻停（问题清单 E3：以前会在原地继续喷）
    const deathAt = renderVersion(P) >= 40 && st.tDead != null ? Math.min(death, st.tDead) : death;
    // 末段火花密度：发射率从 rate 线性变到 rate × sparkRateEnd（按整段燃烧，不按截断后的时长）
    const e = st.kind === 5 ? 1 : (P.sparkRateEnd == null ? 1 : P.sparkRateEnd), B = Math.max(0.05, st.birth + (st.vis != null ? st.vis : st.burn) - born), a = st.rate * (e - 1) / (2 * B);
    info[q * 4] = born; info[q * 4 + 1] = deathAt; info[q * 4 + 2] = deathAt > born ? st.rate : 0; info[q * 4 + 3] = a;
    if (st.rate > 0 && deathAt > born) { const Bc = deathAt - born, c = Math.ceil(Math.max(0, st.rate * Bc + a * Bc * Bc)) + 1; M = Math.max(M, c); total += c; }
  }
  gl.activeTexture(gl.TEXTURE0);
  return { pos: floatTex(Ns, nStars, pos), vel: floatTex(Ns, nStars, vel), info: floatTex(1, nStars, info), nStars, M, Ns, dt, total, P };
}
function disposeTrack(tr) { if (tr) { gl.deleteTexture(tr.pos); gl.deleteTexture(tr.vel); gl.deleteTexture(tr.info); } }
// 火花的有效参数：银竜的尾迹更白、更长
function sparkEff(P) { const silver = familyOf(P.type) === 'rise' && P.riseStyle === 'silver'; return { T0: P.T0 + (silver ? 250 : 0), life: P.sparkLife * (silver ? 1.5 : 1) }; }
function setAirUniforms(pr, P) {
  const tm = P.turb > 0 ? turbModes(P) : [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
  gl.uniform1f(pr.u.uWind, P.wind || 0);
  gl.uniform4fv(pr.u['uTm[0]'], tm.flatMap(m => m.slice(0, 4))); gl.uniform1fv(pr.u['uTa[0]'], tm.map(m => m[4]));
}
// opt：xf = 随体坐标变换 [ox, oy, cos, sin]；mir = 0 无水面 / 1 只剔除水下 / 2 倒影
function drawSparksGPU(tr, t, view, ppm, chan, w, tw, opt = {}) {
  const P = tr.P, modern = renderVersion(P) >= 40, pr = modern ? PR40.spk : PR.spk, se = sparkEff(P); gl.useProgram(pr.p);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tr.pos); gl.uniform1i(pr.u.uPos, 2);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, tr.vel); gl.uniform1i(pr.u.uVel, 3);
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, tr.info); gl.uniform1i(pr.u.uInfo, 4);
  gl.activeTexture(gl.TEXTURE0);
  gl.uniform1f(pr.u.uT, t); gl.uniform1f(pr.u.uDT, tr.dt); gl.uniform1i(pr.u.uM, tr.M); gl.uniform1i(pr.u.uNs, tr.Ns);
  gl.uniform1i(pr.u.uSeed, P.seed | 0); gl.uniform1i(pr.u.uTw, tw | 0);
  gl.uniform1f(pr.u.uInh, P.sparkInherit); gl.uniform1f(pr.u.uSpread, P.sparkSpread); gl.uniform1f(pr.u.uLife, se.life);
  gl.uniform1f(pr.u.uLifeEnd, familyOf(P.type) === 'rise' || P.sparkLifeEnd == null ? 1 : P.sparkLifeEnd);
  gl.uniform1f(pr.u.uLifeJit, familyOf(P.type) === 'rise' || P.sparkLifeJit == null ? 0.45 : P.sparkLifeJit / 100);
  gl.uniform1f(pr.u.uK, P.sparkDrag); gl.uniform1f(pr.u.uG, G * P.sparkGrav); gl.uniform1f(pr.u.uT0, se.T0); gl.uniform1f(pr.u.uCool, P.cooling);
  gl.uniform1f(pr.u.uTwk, P.twinkle); gl.uniform1f(pr.u.uBright, P.sparkBright); gl.uniform1f(pr.u.uSize, P.sparkSize);
  gl.uniform1f(pr.u.uGlit, P.glitter || 0); gl.uniform1f(pr.u.uGlitD, P.glitterDelay || 0.25);
  gl.uniform1f(pr.u.uEmb, P.emberFrac || 0); gl.uniform1f(pr.u.uEmbL, P.emberLife || 3); gl.uniform1f(pr.u.uEmbB, P.emberBright || 0.1); gl.uniform1f(pr.u.uEmbF, P.emberFollow || 0); gl.uniform1f(pr.u.uEmbS, P.emberSize || 1);
  gl.uniform1f(pr.u.uEmbE, P.emberEnd || 0); gl.uniform1f(pr.u.uHotStop, P.emberFrac > 0 && P.emberAll && P.sparkStop > 0 ? P.sparkStop : 0);
  if (pr.u.uTailJit) gl.uniform1f(pr.u.uTailJit, +P.tailJit || 0); if (pr.u.uShoulder) gl.uniform1f(pr.u.uShoulder, +P.tailShoulder || 0);
  if (pr.u.uDif) { gl.uniform1f(pr.u.uDif, familyOf(P.type) === 'aerial' ? +P.tailDiffuse || 0 : 0); gl.uniform1f(pr.u.uDifL, Math.max(1, +P.tailDiffuseScale || 20)); }
  const br = Math.round(P.branch || 0); gl.uniform1i(pr.u.uBr, br); gl.uniform1f(pr.u.uBrAt, P.branchAt || 0.5);
  setAirUniforms(pr, P);
  gl.uniform4fv(pr.u.uView, view); gl.uniform1f(pr.u.uPPM, ppm); gl.uniform1f(pr.u.uPPMY, PPMY || ppm); gl.uniform1f(pr.u.uMax, PT_MAX);
  gl.uniform4fv(pr.u.uXf, opt.xf || [0, 0, 1, 0]); gl.uniform1f(pr.u.uUseXf, opt.xf ? 1 : 0);
  setParticleUniforms(pr, chan); gl.uniform4fv(pr.u.uChan, chan); gl.uniform1f(pr.u.uW, w); gl.uniform1f(pr.u.uRefl, P.waterRefl || 0);
  gl.bindVertexArray(emptyVAO);
  const n = tr.nStars * tr.M * (1 + br);
  if (P.waterRefl > 0 && !opt.xf) { gl.uniform1f(pr.u.uMir, 1); drawParticleBatch(n, modern); gl.uniform1f(pr.u.uMir, 2); drawParticleBatch(n, modern); }
  else { gl.uniform1f(pr.u.uMir, 0); drawParticleBatch(n, modern); }
  gl.bindVertexArray(null);
}

// ---------------- 循环发射器（地面类、上升星头） ----------------
function emitterSources(P) {
  const t = P.type, src = [];
  if (t === 'shikake') {
    const pts = shapePoints(P.pattern === 'sphere' || P.pattern === 'half' || P.pattern === 'saturn' ? 'text' : P.pattern, Math.round(P.stars), P.text);
    for (const [x, y] of pts) src.push([x * P.spacing / 2, P.groundH + (y + 1) * P.spacing / 2 * 0.62, P.jetDir]);
  } else if (t === 'falls') {
    for (let i = 0; i < P.nozzles; i++) src.push([(i - (P.nozzles - 1) / 2) * P.spacing, P.groundH, P.jetDir]);
  } else {
    const n = Math.max(1, Math.round(P.nozzles));
    const spread = t === 'fountain' && P.fanAngle > 0 ? P.fanAngle : P.jetCone * 0.5;   // 喷泉可以排成扇面（地面扇形）
    for (let i = 0; i < n; i++) src.push([(i - (n - 1) / 2) * P.spacing, P.groundH, P.jetDir + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0)]);
  }
  return src;
}
function riseLoopInfo(P) {
  const ri = riseInfo(P), vt = P.vtShell, tm = ri.ta * 0.5;
  // 竖直上抛（二次阻力）在 t 时刻的速度：v = vt·tan(atan(v0/vt) − g·t/vt)
  const vMid = vt * Math.tan(Math.atan(ri.v0 / vt) - G * tm / vt);
  return { V: Math.max(5, vMid), Tp: layoutOf(P).F / 30 };   // 循环帧按 30 fps 播放
}
function buildEmitter(P) {
  const fam = familyOf(P.type), t = P.type, E = { P, fam };
  const Tp = fam === 'rise' ? riseLoopInfo(P).Tp : P.loopT; E.Tp = Tp;
  const se = sparkEff(P), lifeMax = se.life * 2.5;
  const Mp = Math.max(1, Math.round(P.sparkRate * Tp)); E.rate = Mp / Tp; E.Mp = Mp;
  if (fam === 'rise') { E.mode = 3; E.V = riseLoopInfo(P).V; E.nsrc = 1; }
  else if (t === 'wheel') { E.mode = 1; E.nsrc = Math.max(1, Math.round(P.nozzles)); E.omega = 2 * Math.PI / Tp; }
  else if (t === 'fan' || t === 'barrage') {
    E.mode = 2; E.nsrc = Math.max(1, Math.round(P.nozzles)); E.nshot = Math.max(1, Math.round(P.shotRate * Tp)); E.shot = E.nshot / Tp;
    E.ck = G / Math.max(1, P.vt);
  } else { E.mode = 0; E.src = emitterSources(P); E.nsrc = E.src.length; }
  if (E.mode === 2) { E.Mw = Math.ceil(E.rate * Math.min(P.cometBurn, lifeMax)) + 2; E.slots = Math.ceil((P.cometBurn + lifeMax) * E.shot) + 1; E.nv = E.slots * E.Mw; E.hslots = Math.ceil((P.cometBurn + P.subBurn * 1.25) * E.shot) + 1; }
  else { E.Mw = Math.ceil(E.rate * lifeMax) + 2; E.nv = E.nsrc * E.Mw; }
  const texData = new Float32Array(Math.max(1, E.nsrc) * 4);
  if (E.src) E.src.forEach((s, i) => { texData[i * 4] = s[0]; texData[i * 4 + 1] = s[1]; texData[i * 4 + 2] = s[2]; });
  gl.activeTexture(gl.TEXTURE0); E.tex = floatTex(Math.max(1, E.nsrc), 1, texData);
  E.total = E.nv;
  return E;
}
function disposeEmitter(E) { if (E && E.tex) gl.deleteTexture(E.tex); }
function setEmitCommon(pr, E, t, view, ppm, tw) {
  const P = E.P;
  gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, E.tex); gl.uniform1i(pr.u.uSrc, 5); gl.activeTexture(gl.TEXTURE0);
  gl.uniform1f(pr.u.uT, t); gl.uniform1i(pr.u.uMode, E.mode); gl.uniform1i(pr.u.uNsrc, E.nsrc); gl.uniform1i(pr.u.uSeed, P.seed | 0); gl.uniform1i(pr.u.uTw, tw | 0);
  gl.uniform1f(pr.u.uShot, E.shot || 1); gl.uniform1i(pr.u.uNshot, E.nshot || 1); gl.uniform1f(pr.u.uShotSpd, P.shotSpeed); gl.uniform1f(pr.u.uFan, P.fanAngle * Math.PI / 180);
  gl.uniform1f(pr.u.uCBurn, P.cometBurn); gl.uniform1f(pr.u.uCK, E.ck || 0.3); gl.uniform1f(pr.u.uGH, P.groundH); gl.uniform1f(pr.u.uSpacing, P.spacing);
  gl.uniform1f(pr.u.uWR, P.wheelR); gl.uniform1f(pr.u.uOmega, E.omega || 0);
  gl.uniform4fv(pr.u.uView, view); gl.uniform1f(pr.u.uPPM, ppm); gl.uniform1f(pr.u.uPPMY, PPMY || ppm); gl.uniform1f(pr.u.uMax, PT_MAX);
}
function drawEmit(E, t, view, ppm, chan, w, tw) {
  const P = E.P, modern = renderVersion(P) >= 40, pr = modern ? PR40.emit : PR.emit, se = sparkEff(P); gl.useProgram(pr.p);
  setEmitCommon(pr, E, t, view, ppm, tw);
  gl.uniform1f(pr.u.uRate, E.rate); gl.uniform1i(pr.u.uMp, E.Mp); gl.uniform1i(pr.u.uMw, E.Mw);
  gl.uniform1f(pr.u.uLife, se.life); gl.uniform1f(pr.u.uK, P.sparkDrag); gl.uniform1f(pr.u.uG, G * P.sparkGrav);
  gl.uniform1f(pr.u.uSpread, P.sparkSpread); gl.uniform1f(pr.u.uInh, P.sparkInherit); gl.uniform1f(pr.u.uT0, se.T0); gl.uniform1f(pr.u.uCool, P.cooling);
  gl.uniform1f(pr.u.uTwk, P.twinkle); gl.uniform1f(pr.u.uBright, P.sparkBright); gl.uniform1f(pr.u.uSize, P.sparkSize);
  gl.uniform1f(pr.u.uJet, P.jetSpeed); gl.uniform1f(pr.u.uCone, P.jetCone * Math.PI / 180); gl.uniform3fv(pr.u.uFV, [0, E.V || 0, 0]);
  setParticleUniforms(pr, chan); gl.uniform4fv(pr.u.uChan, chan); gl.uniform1f(pr.u.uW, w);
  gl.bindVertexArray(emptyVAO); drawParticleBatch(E.nv, modern); gl.bindVertexArray(null);
}
function drawEmitHeads(E, t, view, ppm, chan, w, tw) {
  const P = E.P; if (E.mode === 3) return;
  const modern = renderVersion(P) >= 40, pr = modern ? PR40.ehead : PR.ehead; gl.useProgram(pr.p);
  setEmitCommon(pr, E, t, view, ppm, tw);
  gl.uniform1f(pr.u.uHead, P.headSize); gl.uniform1f(pr.u.uHI, P.headBright); gl.uniform1f(pr.u.uFlick, P.flicker);
  gl.uniform1f(pr.u.uSS, P.subSpeed); gl.uniform1f(pr.u.uSB, P.subBurn); gl.uniform1i(pr.u.uNb, Math.round(P.burstStars || 0));
  setParticleUniforms(pr, chan); gl.uniform4fv(pr.u.uChan, chan); gl.uniform1f(pr.u.uW, w);
  const n = E.mode === 2 ? E.hslots * (1 + Math.round(P.burstStars || 0)) : E.nsrc;
  gl.bindVertexArray(emptyVAO); drawParticleBatch(n, modern); gl.bindVertexArray(null);
}

class Target {
  constructor(w, h, ifmt, mips = false) {
    this.w = w; this.h = h; this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    this.levels = mips ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1;
    gl.texStorage2D(gl.TEXTURE_2D, this.levels, ifmt, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('帧缓冲创建失败');
  }
  bind(x = 0, y = 0, w = this.w, h = this.h) { gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb); gl.viewport(x, y, w, h); }
  clear() { this.bind(); gl.colorMask(true, true, true, true); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
  dispose() { gl.deleteFramebuffer(this.fb); gl.deleteTexture(this.tex); }
}
function drawQuad() { gl.bindVertexArray(quadVAO); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
function drawPoints(buf, n, view, ppm, chan, w, xf) {
  if (!n) return;
  const modern = particleQuality.modern, pr = modern ? PR40.pts : PR.pts; gl.useProgram(pr.p); gl.bindVertexArray(modern ? pts40VAO : ptsVAO); gl.bindBuffer(gl.ARRAY_BUFFER, pb);
  gl.bufferData(gl.ARRAY_BUFFER, buf.subarray(0, n * 4), gl.DYNAMIC_DRAW);
  gl.uniform4fv(pr.u.uView, view); gl.uniform1f(pr.u.uPPM, ppm); gl.uniform1f(pr.u.uPPMY, PPMY || ppm); gl.uniform1f(pr.u.uMax, PT_MAX);
  gl.uniform4fv(pr.u.uXf, xf || [0, 0, 1, 0]); gl.uniform1f(pr.u.uUseXf, xf ? 1 : 0);
  setParticleUniforms(pr, chan); gl.uniform4fv(pr.u.uChan, chan); gl.uniform1f(pr.u.uW, w); gl.uniform1f(pr.u.uSpan, PT_SPAN);
  drawParticleBatch(n, modern);
}
function additive(on) { if (on) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.blendEquation(gl.FUNC_ADD); } else gl.disable(gl.BLEND); }
function sizeAt(m, age) { return m.zoom ? evalKeys(m.sizeKeys, clamp(age / m.duration, 0, 1)) : 1; }
// 紧凑取景：面片中心沿拟合曲线移动（Cascade：Initial Velocity + Drag + Const Acceleration）
function pathXY(p, t) { const e = Math.exp(-p.k * t), f1 = (1 - e) / p.k, f2 = (t - f1) / p.k; return [p.x0 + p.vx * f1 + p.ax * f2, p.y0 + p.vy * f1 - p.ay * f2]; }
// 某一时刻面片中心（相对爆点，米）
function centerAt(m, age) { if (m.path) return pathXY(m.path, clamp(age, 0, m.duration)); const s = sizeXY(m, age); return [0, m.cy * s[1]]; }
// 横竖分别缩放（单元序列、紧凑取景）：返回 [横向倍数, 纵向倍数]
function sizeXY(m, age) { if (m.aniso) { const u = clamp(age / m.duration, 0, 1); return [evalKeys(m.sizeKeysX, u), evalKeys(m.sizeKeysY, u)]; } const s = sizeAt(m, age); return [s, s]; }
function bakeView(m, sc = 1) { return [0, m.cy, m.HX * sc, m.HY * sc]; }
function squareView(m) { const h = Math.max(m.Ww, m.Wh) / 2; return [0, m.cy, h, h]; }

// 合并输出（星头、火花在同一张灰度图里）时，两路各自自动曝光会把「炭头亮度」「火花亮度」抵消掉，
// 所以自动曝光后再乘回这两个倍数：默认 1 时画面不变，调它们才真正改变星头和尾缀的明暗比例。
function combGain(P) { return [P.headBright == null ? 1 : P.headBright, P.sparkBright == null ? 1 : P.sparkBright]; }
// 按帧定曝光（P.expoMode = 'frames'）：每一帧先取自己的亮部分位（pct），再在所有非空帧里取第 q 分位的那一帧当基准。
// 整张一起算（旧做法）时，开花最初几帧最亮、最密的那一下定死曝光，中后段整体偏暗，合并输出查 Ramp 后更暗（芯、末段光点看不见）；
// 按帧取中位偏上，开头最亮那一下允许过曝发白（实拍本来就是），中后段亮度保得住。
function autoExpoFrames(t, L, target, pct, q) {
  t.bind(); const W = t.w, buf = new Float32Array(t.w * t.h * 4);
  gl.readPixels(0, 0, t.w, t.h, gl.RGBA, gl.FLOAT, buf);
  const cw = t.w / L.cols, chh = t.h / L.rows, peaks = [];
  for (let f = 0; f < L.F; f++) {
    const ch = L.chans === 4 ? Math.floor(f / L.per) : 0, k = f % L.per, col = k % L.cols, row = Math.floor(k / L.cols);
    const x0 = Math.round(col * cw), y0 = Math.round(t.h - (row + 1) * chh), x1 = Math.round(x0 + cw), y1 = Math.round(y0 + chh);
    const hist = new Uint32Array(512); let cnt = 0;
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const v = buf[(y * W + x) * 4 + ch]; if (v > 1e-5) { hist[clamp(Math.floor((Math.log2(v) + 20) * 10), 0, 511)]++; cnt++; } }
    if (cnt < 8) continue;
    const need = cnt * pct / 100; let acc = 0, b = 0; for (; b < 512; b++) { acc += hist[b]; if (acc >= need) break; }
    peaks.push(Math.pow(2, b / 10 - 20));
  }
  if (!peaks.length) return 1;
  peaks.sort((a, b) => a - b);
  return -Math.log(1 - target) / peaks[Math.min(peaks.length - 1, Math.floor(peaks.length * q))];
}
function autoExpo(t, target, pct) {
  t.bind(); const buf = new Float32Array(t.w * t.h * 4);
  gl.readPixels(0, 0, t.w, t.h, gl.RGBA, gl.FLOAT, buf);
  const hist = new Uint32Array(2048); let cnt = 0;
  for (let i = 0; i < buf.length; i++) { const v = buf[i]; if (v > 1e-5) { hist[clamp(Math.floor((Math.log2(v) + 20) * 40), 0, 2047)]++; cnt++; } }
  if (!cnt) return 1;
  const need = cnt * pct / 100; let acc = 0, b = 0; for (; b < 2048; b++) { acc += hist[b]; if (acc >= need) break; }
  return -Math.log(1 - target) / Math.pow(2, b / 40 - 20);
}
