// =====================================================================
//  WebGL
// =====================================================================
const canvas = $('#gl');
const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, alpha: false });
// 4.2.20 显卡上下文丢失（显存 / 内存不够，或一帧画太久被驱动重置）：以前画面直接白掉、什么都不说。现在停下渲染循环、在画面上写原因和怎么办。
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); glLostNotice(); });
function glLostNotice() {
  if (state.glLost) return; state.glLost = true;
  let o = $('#glLost'); if (!o) { o = document.createElement('div'); o.id = 'glLost'; o.className = 'gl-lost'; ($('#box') || document.body).appendChild(o); }
  let what = ''; try { const Ls = state.tab === 'combo' ? state.layers.map(L => layerEntryOf(L)).filter(Boolean).map(e => e.P) : [state.P];
    what = `（${state.tab === 'combo' ? state.comboName || '多层效果' : TYPE_NAMES[state.P.type] || ''}：${Ls.length} 层，估计星 ${Ls.reduce((a, P) => a + trackStarEstimate(P), 0)} 颗）`; } catch (e) { }
  o.innerHTML = `<b>显卡把这一页的画面重置了</b><span>多半是显存 / 内存不够，或者某一帧画得太久被显卡驱动重置${what}。画面已停；参数还在，可以先「保存」。</span><span><b>刷新页面</b>恢复。如果打开这个效果每次都这样，把这一行发给 AI。</span>`;
  o.hidden = false;
}
if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
  document.body.innerHTML = '<p style="padding:40px;color:#e7735a;font:15px system-ui">当前浏览器不支持 WebGL2 浮点渲染，请用最新版 Chrome 或 Edge 打开。</p>';
  throw new Error('no webgl2');
}
const PT_MAX = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
let PPMY = 0;
let PT_GAUSS = 0;     // 4.3：1 = 这一批点画成高斯（升空尾缀 V5 的星头 / 光晕，见 41_particles40.js uGauss）
let PT_SPAN = 0;   // 4.3：旧光点核的画点范围，现在的光点核不用（保留变量免得别处赋值报错）       // 画点范围（几倍 σ）；0 = 默认 6σ。尾缀设 10σ，边缘平滑收到 0          // 纵向每米像素数（0 = 与横向相同）；单元序列横竖分别缩放时由烘焙设置

function compile(vs, fs) {
  return lazyProgram(() => compileNow(vs, fs));
}
function compileNow(vs, fs) {
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
  vec4 v = min(pow(1.-exp(-x), vec4(1./uG)), vec4(253./255.));     // 4.9.31 封顶 253（Ramp 第 255 格是黑的护栏，见 60_export.js rampPixels）
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
// 4.8.0 按寿命曲线的取值（几行 时刻:倍数，最多 6 个点）；4.9.4 地面的火花 / 彗星着色器也用
const GLSL_CV = `float cvAt(vec2 k0,vec2 k1,vec2 k2,vec2 k3,vec2 k4,vec2 k5,int n,float x){ vec2 k[6]=vec2[6](k0,k1,k2,k3,k4,k5); if(x<=k[0].x) return k[0].y;
  for(int i=1;i<6;i++){ if(i>=n) break; if(x<=k[i].x) return mix(k[i-1].y,k[i].y,(x-k[i-1].x)/max(1e-6,k[i].x-k[i-1].x)); } return k[clamp(n-1,0,5)].y; }
#define CV(a,n,x) cvAt(a[0],a[1],a[2],a[3],a[4],a[5],n,x)`;
const VS_SPK = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uPos, uVel, uInfo;
uniform float uT, uDT; uniform int uM, uNs, uSeed, uTw, uBr;
uniform float uInh, uSpread, uLife, uLifeEnd, uLifeJit, uK, uG, uT0, uCool, uCoolAbs, uTwk, uTwHz, uBright, uSize, uGlit, uGlitD, uBrAt, uMir, uRefl, uWind;
uniform float uEmb, uEmbL, uEmbB, uEmbF, uEmbS, uHotStop, uEmbE, uTailJit, uShoulder, uDif, uDifL, uRise, uStarB, uWShape, uWidth, uPinH, uPinT, uBelly;
uniform float uRamp, uRampJ;     // 4.2.17 火花起势：开始出火花后几秒到满密度、每颗星 ± 随机
uniform sampler2D uLen; uniform float uPerM, uSpR, uSpH, uJet, uJetC;     // 火花发射器补全（对话框FanGold，用户 10-09 21:48）：每米生成、起始半径 + 跟星头、向后喷 + 锥角；全 0 时不进分支
uniform vec2 uCvHsS[6], uCvHsU[6]; uniform int uCvHsSN, uCvHsUN;     // 跟星头大小时的星头 / 子星大小随寿命
uniform vec2 uCvSpS[6], uCvSpB[6], uCvEmB[6], uCvBrB[6], uCvEmS[6], uCvBrS[6]; uniform int uCvSpSN, uCvSpBN, uCvEmBN, uCvBrBN, uCvEmSN, uCvBrSN;     // 4.8.0 按寿命曲线（几行 时刻:倍数，N = 0 不乘）；4.9.4 余烬 / 分叉火花大小
${GLSL_CV}
uniform float uInhA, uInhB, uT0J, uEmbLJ, uEmbDk, uEmbFa, uBrL, uBrLA, uBrLB, uBrV, uBrVA, uBrVB, uBrInh, uBrKd, uBrT, uBrB, uBrFd, uBrS, uGlA, uGlB, uGlW, uGlPk, uGlDim;     // 4.6.0（5.0 第 1 步）：以前写死的随机范围、余烬衰减、分叉火花、辉星闪光，默认 = 以前的常数
// 和 20_sim.js starHash(id, seed, k) 同一个整数哈希（CPU / GPU 内核每颗星的起势时长一样）
float starHashG(uint id, uint k){ uint h=((id+1u)*0x9E3779B1u)^((uint(uSeed)+7u)*0x85EBCA77u)^((k+3u)*0xC2B2AE3Du); h^=h>>16u; h*=0x7FEB352Du; h^=h>>15u; h*=0x846CA68Bu; h^=h>>16u; return float(h)/4294967296.; }
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
// 第 s 颗星在 t 时刻的位置（和下面出生点 sp 同一个 Hermite 插值）
vec3 starAt(int s, float t){ float fi=t/uDT; int i0=clamp(int(floor(fi)),0,uNs-2); float f=clamp(fi-float(i0),0.,1.), f2=f*f, f3=f2*f;
  return (2.*f3-3.*f2+1.)*texelFetch(uPos,ivec2(i0,s),0).xyz+(f3-2.*f2+f)*uDT*texelFetch(uVel,ivec2(i0,s),0).xyz+(-2.*f3+3.*f2)*texelFetch(uPos,ivec2(i0+1,s),0).xyz+(f3-f2)*uDT*texelFetch(uVel,ivec2(i0+1,s),0).xyz; }
// 每米生成：星从出生起走过的路程（uLen 每颗星每个轨迹采样一格，按时间线性插值）和反过来按路程求时刻（二分）
float lenAt(int s, float t){ float fi=clamp(t/uDT,0.,float(uNs-1)); int i0=min(int(floor(fi)),uNs-2); float f=fi-float(i0); return mix(texelFetch(uLen,ivec2(i0,s),0).x,texelFetch(uLen,ivec2(i0+1,s),0).x,f); }
float timeAtLen(int s, float L){ int lo=0, hi=uNs-1; for(int k=0;k<20;k++){ if(hi-lo<=1) break; int m=(lo+hi)/2; if(texelFetch(uLen,ivec2(m,s),0).x<=L) lo=m; else hi=m; }
  float a=texelFetch(uLen,ivec2(lo,s),0).x, b=texelFetch(uLen,ivec2(hi,s),0).x; return (float(lo)+clamp((L-a)/max(1e-6,b-a),0.,1.))*uDT; }
void main(){
  int nb=1+uBr; int id=gl_VertexID; int pid=id/nb; int c=id-pid*nb;
  int s=pid/uM; int j=pid-s*uM; uint uid=uint(pid);
  vec4 inf=texelFetch(uInfo,ivec2(0,s),0);
  if(inf.z<=0.){ cull(); return; }
  // 发射率随燃烧线性变化（末段火花密度）：累计数 N(t) = r0·t + a·t²，按编号反解出生时刻
  float nj=float(j)+hsh(uid,1u), tb;
  if(uPerM>.5){ float Lb=lenAt(s,inf.x), L=Lb+nj/inf.z; if(L>=lenAt(s,inf.y)){ cull(); return; } tb=max(inf.x,timeAtLen(s,L)); }     // inf.z = 这颗星的每米火花数
  else if(abs(inf.w)<1e-6) tb=inf.x+nj/inf.z;
  else { float dsc=inf.z*inf.z+4.*inf.w*nj; if(dsc<0.){ cull(); return; } tb=inf.x+2.*nj/(inf.z+sqrt(dsc)); }
  if(tb>=inf.y||tb>uT){ cull(); return; }
  // 4.2.17 火花起势：按出生时刻的密度比例抽稀（smoothstep，开头很稀、慢慢连成线）；分叉火花和母火花同一个编号，一起留或一起去
  if(uRamp>0.){ float Tr=max(.01,uRamp*(1.+uRampJ*(2.*starHashG(uint(s),17u)-1.))), xr=clamp((tb-inf.x)/Tr,0.,1.); if(hsh(uid,64u)>=xr*xr*(3.-2.*xr)){ cull(); return; } }
  float phase=clamp((tb-inf.x)/max(.05,inf.y-inf.x),0.,1.);
  float lifeN=uLife*(1.+(uLifeEnd-1.)*phase), life=lifeN*exp(uLifeJit*gss(uid,2u)); float age=uT-tb;
  // 4.4「冷却方式 = 按实际时间」（用户 10-04 16:17：火花不是老的先灭、而是一条线上随机灭）：温度按离开星多久降（同样老的火花一样暗），
  // 寿命只决定每颗最后什么时候灭（最后 30% 寿命淡出，不会一下子消失）；uCoolAbs = 0 时和以前逐位相同
  float lifeC=uCoolAbs>.5 ? lifeN : life;
  // 余烬长尾（锦冠的木炭余烬 / 受光烟迹）：一部分火花寿命长、亮度低，沿星的轨迹留下暗长线；
  // uEmbF > 0 时亮度跟着母星：母星烧完后 uEmbF 秒内淡掉（烟迹是被星自己照亮的）
  bool emb=uEmb>0. && uBr==0 && hsh(uid,51u)<uEmb; if(emb) life=uEmbL*exp(uEmbLJ*gss(uid,52u));
  // emberAll：余烬（光丝）贯穿整个燃烧期，普通火花只在前 sparkStop 秒（分层星外层的引き火花先停）
  if(!emb && uHotStop>0. && tb-inf.x>uHotStop){ cull(); return; }
  float ts=uBr>0 ? life*uBrAt*(.8+.4*hsh(uid,21u)) : 1e9;
  uint u2=uid*7u+uint(c); float life2=uBrL*(uBrLA+uBrLB*hsh(u2,23u));
  if(c==0){ if(age>=life||age>=ts){ cull(); return; } }
  else if(age<ts||age>=ts+life2){ cull(); return; }
  float fi=tb/uDT; int i0=clamp(int(floor(fi)),0,uNs-2); float f=clamp(fi-float(i0),0.,1.);
  vec3 p0=texelFetch(uPos,ivec2(i0,s),0).xyz, p1=texelFetch(uPos,ivec2(i0+1,s),0).xyz;
  vec3 v0=texelFetch(uVel,ivec2(i0,s),0).xyz, v1=texelFetch(uVel,ivec2(i0+1,s),0).xyz;
  float f2=f*f, f3=f2*f;
  vec3 sp=(2.*f3-3.*f2+1.)*p0+(f3-2.*f2+f)*uDT*v0+(-2.*f3+3.*f2)*p1+(f3-f2)*uDT*v1;
  vec3 sv=mix(v0,v1,f);
  float inh=uInh*(uInhA+uInhB*hsh(uid,4u));
  vec3 vel=sv*inh+vec3(gss(uid,5u),gss(uid,7u),gss(uid,9u))*uSpread;
  // 起始半径（球内均匀）+ 跟星头大小（每颗星的星头直径在 uInfo 第 2 格：x 基本直径、y / z 曲线的起止时刻、w 跟哪条曲线）；向后喷（锥内）。和 20_sim.js sparkSpawnRAt / jetDir 同一口径
  if(uSpR>0.||uSpH>0.){ float R=uSpR; if(uSpH>0.){ vec4 h2=texelFetch(uInfo,ivec2(1,s),0); float d=h2.x;
      if(h2.w>.5){ float x=clamp((tb-h2.y)/max(.05,h2.z-h2.y),0.,1.); d*=max(0.,h2.w<1.5 ? (uCvHsSN>0 ? CV(uCvHsS,uCvHsSN,x) : 1.) : (uCvHsUN>0 ? CV(uCvHsU,uCvHsUN,x) : 1.)); }
      R+=uSpH*.5*d; }
    sp+=normalize(vec3(gss(uid,91u),gss(uid,93u),gss(uid,95u))+1e-6)*R*pow(hsh(uid,97u),1./3.); }
  if(uJet>0.){ float vs=length(sv); if(vs>1e-3){ vec3 a=-sv/vs, b1=normalize(cross(a,abs(a.z)<.9 ? vec3(0.,0.,1.) : vec3(1.,0.,0.))), b2=cross(a,b1);
      float th=uJetC*sqrt(hsh(uid,101u)), ph=6.2831853*hsh(uid,103u); vel+=uJet*(a*cos(th)+(b1*cos(ph)+b2*sin(ph))*sin(th)); } }
  vec3 U=vec3(airAt(sp.xy,tb),0.), g=vec3(0.,-uG,0.);
  float T0=uT0+uT0J*gss(uid,11u), I, size=uSize; vec3 p;
  // 尾迹粗细 / 梭形（4.2.8，用户 10-02 19:41 #4、20:04「是梭形」）：沿尾迹（a = 出生点离星头的距离 ÷ 尾迹全长，0 = 星头，1 = 尾端；
  // 按距离不按年龄：星在减速，新火花挤在星头附近，按年龄算最粗处会贴到星头上）的宽度曲线
  // wq(a)：最粗处 uBelly 之前从 1−uPinH 升到 1，之后降到 1−uPinT；W = 粗细 × wq。只改火花横向散开的那部分位移（散布速度 × 阻力衰减），
  // 火花大小 × √粗细 × (0.5 + 0.5 wq)（颗粒只稍微变小，太小会暗到看不见、星头和尾迹之间断开），尾端那半段稍暗（× 0.6 + 0.4 wq），尾迹扩散也乘 W。
  // uWShape = 0（默认值）时不进分支，结果不变。
  float W=1., wq=1.; bool wtail=false;
  if(c==0){
    p=mot(sp,vel,U,g,uK,age);
    if(uWShape>.5 && !emb){ float th=min(uT,inf.y), t0=min(th,max(inf.x,uT-uLife*max(1.,uLifeEnd))); vec3 ph=starAt(s,th);
      float a=clamp(length(ph-sp)/max(1e-3,length(ph-starAt(s,t0))),0.,1.);
      wtail=a>uBelly; wq=!wtail ? 1.-uPinH*(1.-smoothstep(0.,uBelly,a)) : 1.-uPinT*smoothstep(uBelly,1.,a); W=uWidth*wq;
      p+=(W-1.)*(uK>1e-4 ? (1.-exp(-uK*age))/uK : age)*vec3(gss(uid,5u),gss(uid,7u),gss(uid,9u))*uSpread; }
    float gl=emb ? glowOf(T0)*uEmbB*exp(-uEmbDk*age/life)*(1.-smoothstep(uEmbFa,1.,age/life))*(uEmbF>0. ? 1.-smoothstep(inf.y-.15,inf.y+uEmbF,uT) : 1.)*(uEmbE>0. ? 1.-smoothstep(uEmbE-.6,uEmbE+.3,uT) : 1.) : glowOf(T0*(1.-uCool*age/lifeC))*(uCoolAbs>.5 ? 1.-smoothstep(.7,1.,age/life) : 1.);
    if(emb) size=uSize*uEmbS;
    if(emb){ if(uCvEmBN>0) gl*=max(0.,CV(uCvEmB,uCvEmBN,clamp(age/life,0.,1.))); if(uCvEmSN>0) size*=max(0.,CV(uCvEmS,uCvEmSN,clamp(age/life,0.,1.))); }
    else { if(uCvSpBN>0) gl*=max(0.,CV(uCvSpB,uCvSpBN,clamp(age/life,0.,1.))); if(uCvSpSN>0) size*=max(0.,CV(uCvSpS,uCvSpSN,clamp(age/life,0.,1.))); }     // 4.8.0
    if(uGlit>0.){ float tf=uGlitD*(uGlA+uGlB*hsh(uid,17u)); float e=(age-tf)/uGlW; gl=gl*(1.-uGlDim*uGlit)+uGlit*uGlPk*exp(-e*e); }
    I=gl;
  } else {
    vec3 pc=mot(sp,vel,U,g,uK,ts), vc=motv(vel,U,g,uK,ts);
    vec3 dv=normalize(vec3(gss(u2,31u),gss(u2,33u),gss(u2,35u))+1e-4)*(uBrV+uSpread*1.5)*(uBrVA+uBrVB*hsh(u2,37u));
    float a2=age-ts, x=a2/life2;
    p=mot(pc,vc*uBrInh+dv,U,g,uK*uBrKd,a2);
    I=glowOf(T0*(1.-uCool*ts/lifeC)*uBrT)*uBrB*(uBrFd==2. ? (1.-x)*(1.-x) : pow(max(0.,1.-x),uBrFd)); size=uSize*uBrS; if(uCvBrBN>0) I*=max(0.,CV(uCvBrB,uCvBrBN,clamp(x,0.,1.))); if(uCvBrSN>0) size*=max(0.,CV(uCvBrS,uCvBrSN,clamp(x,0.,1.)));
  }
  // 尾迹扩散（4.2.0，tailDiffuse / tailDiffuseScale，用户 2026-10-02 16:22）：火花被阻力停下来以后仍被空气扰流带着走，越老离原位越远。
  // 位移 = 扰流速度 × Tl × x/√(1+x)，x = 年龄 / Tl，Tl = 尺度 / 速度：刚出生像被吹着走（∝ 年龄），老了变成扩散（∝ √年龄）。
  // 方向 = 发射点处平滑的旋涡场（相邻火花一起飘成一缕）+ 每粒自己的随机（散开）。默认 0 不进分支，结果不变。
  if(uDif>0.){ float Tl=uDifL/max(uDif,.05), x=age/Tl, sg=uDif*Tl*x/sqrt(1.+x);
    p.xy+=(curl2(sp.xy/uDifL)+.45*vec2(gss(uid,71u),gss(uid,73u)))*sg*W; }
  if(I<=0.){ cull(); return; }
  // 4.4.3（E6，用户 10-04 09:58「加一个闪烁频率」）：火花闪烁频率 uTwHz > 0 → 每颗火花按这个频率明暗起伏（相位随机，引擎里 Color Over Life 做得出来）；0 = 以前的每个时间片随机（逐位相同）
  I*=(1.+uTwk*(uTwHz>0. ? sin(6.2831853*(uTwHz*uT+hsh(uid,77u))) : 2.*hsh(u2,uint(uTw)*16u+13u)-1.))*uBright*.6;
  // 4.2.0（对话框7 需求，引菊颜色纯度）：火花烧旺时间 sparkRise——刚离开星时没烧旺，靠星头那截暗、偏红；每颗星亮度离散 starBright——按星号取一个对数正态倍数（均值 1）
  if(uRise>0. && c==0 && !emb) I*=1.-exp(-age/uRise);
  if(uStarB>0.) I*=exp(uStarB*gss(uint(s),64u)-.5*uStarB*uStarB);
  if(uMir>.5){ if(p.y<0.){ cull(); return; }
    if(uMir>1.5){ p.x+=.012*p.y*sin(.35*p.y+7.*uT)+.3*sin(1.7*p.y+3.*uT); I*=uRefl*exp(-p.y/400.); p.y=-p.y; size*=1.3; } }
  // 尾迹外形（每个效果自己的参数 tailJit / tailShoulder）：粗细随机 = 每颗星一个粗细倍数 × 每粒火花一点抖动；亮肩 = 新火花大而亮、老火花细而暗。默认 0 时不进分支，结果不变
  if(uTailJit>0.){ size*=exp(uTailJit*.35*gss(uid,61u))*max(.15,1.+uTailJit*1.2*(hsh(uint(s),62u)-.5)); }
  if(uShoulder!=0. && c==0){ float sh=uShoulder*(.8-1.6*clamp(age/life,0.,1.)); size*=max(.1,1.+sh); I*=max(.15,1.+.6*sh); }
  if(uWShape>.5 && c==0 && !emb){ size*=sqrt(uWidth)*(.5+.5*wq); if(wtail) I*=.6+.4*wq; }
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
uniform vec2 uCvSpS[6], uCvSpB[6]; uniform int uCvSpSN, uCvSpBN;     // 4.9.4 地面火花也按「火花大小 / 亮度随寿命」
out float vI; out vec2 vSig; out float vPS;
${GLSL_HASH}
${GLSL_CV}
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
  float sz=uSize, cx=clamp(age/life,0.,1.); if(uCvSpBN>0) I*=max(0.,CV(uCvSpB,uCvSpBN,cx)); if(uCvSpSN>0) sz*=max(0.,CV(uCvSpS,uCvSpSN,cx));
  emitPt(p.xy,I,sz);
}`;
// 地面类的「星头」：仕掛け的灯芯（模式 0）、转轮喷口（1）、彗星与末端小花（2）
const VS_EHEAD = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uSrc;
uniform float uT, uShot, uShotSpd, uFan, uCBurn, uCK, uGH, uSpacing, uWR, uOmega, uHead, uHI, uFlick, uSS, uSB;
uniform int uMode, uNsrc, uNshot, uSeed, uTw, uNb;
uniform vec4 uView; uniform float uPPM, uPPMY, uMax;
uniform vec2 uCvStS[6], uCvStB[6]; uniform int uCvStSN, uCvStBN;     // 4.9.4 彗星按「星头大小 / 亮度随寿命」（寿命 = 彗星燃烧）
out float vI; out vec2 vSig; out float vPS;
${GLSL_HASH}
${GLSL_CV}
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
  if(b==0){ if(ca>=uCBurn){ cull(); return; } comet(km,ca,p,v); float hi=uHI*fl*min(1.,ca/.04), hs=uHead, cx=clamp(ca/uCBurn,0.,1.);
    if(uCvStBN>0) hi*=max(0.,CV(uCvStB,uCvStBN,cx)); if(uCvStSN>0) hs*=max(0.,CV(uCvStS,uCvStSN,cx)); emitPt(p.xy,hi,hs); return; }
  if(ca<uCBurn){ cull(); return; }
  uint key=uint(km)*131u+uint(b); float a2=ca-uCBurn, life=uSB*(.8+.4*hsh(key,3u)); if(a2>=life){ cull(); return; }
  comet(km,uCBurn,p,v); vec3 d=normalize(vec3(gss(key,5u),gss(key,7u),gss(key,9u))+1e-4);
  vec3 q=mot(p,v*.3+d*uSS*(1.+.1*gss(key,11u)),vec3(0.),vec3(0.,-9.81,0.),.6,a2);
  float x=a2/life; emitPt(q.xy,uHI*.9*fl*(1.-x*x),uHead*.8);
}`;
// 单元序列的导出预览：模拟 Cascade —— 每颗星一个粒子，线性阻力 + 恒定加速度，面片沿速度方向对齐
const VS_UNIT = HDR + `uniform float uTime, uV0, uVJ, uDrag, uA, uWind, uLife, uLJ, uSX, uSY, uHb, uFlip; uniform int uSeed, uId0; uniform vec2 uSJ; uniform vec4 uView; uniform vec2 uKF[8], uKX[8], uKY[8]; uniform int uNKF, uNKX, uNKY; uniform float uNF;
out vec2 v_uv; out float vFrame;
uint pcg(uint v){ uint s=v*747796405u+2891336453u; uint w=((s>>((s>>28u)+4u))^s)*277803737u; return (w>>22u)^w; }
float hsh(uint a, uint b){ return float(pcg(a ^ pcg(b + uint(uSeed)*2654435769u))) / 4294967296.0; }
#define EVALK(NAME, K, NK) float NAME(float u){ if(u<=K[0].x) return K[0].y; for(int i=1;i<8;i++){ if(i>=NK) break; if(u<=K[i].x){ vec2 a=K[i-1], b=K[i]; return a.y+(b.y-a.y)*(u-a.x)/max(b.x-a.x,1e-6); } } return K[NK-1].y; }
EVALK(evalK, uKF, uNKF)
EVALK(evalX, uKX, uNKX)
EVALK(evalY, uKY, uNKY)
void main(){
  uint id=uint(gl_InstanceID+uId0); vec2 c=vec2(float(gl_VertexID&1), float(gl_VertexID>>1));     // 4.9.28 变体：第 2 张起的星接着编号
  float z=2.*hsh(id,1u)-1., ph=6.2831853*hsh(id,2u), r=sqrt(max(0.,1.-z*z)); vec3 d=vec3(r*cos(ph),z,r*sin(ph));
  float life=uLife*(1.+uLJ*(2.*hsh(id,3u)-1.)), t=uTime, rel=t/life;
  if(rel>=1.||t<0.){ gl_Position=vec4(2.,2.,2.,1.); v_uv=c; vFrame=-1.; return; }
  vec3 vi=vec3(uWind,-uA/max(uDrag,1e-4),0.), v0=d*uV0*(1.+uVJ*(2.*hsh(id,4u)-1.)); float e=exp(-uDrag*t);
  vec3 p=vi*t+(v0-vi)*(1.-e)/max(uDrag,1e-4), v=vi+(v0-vi)*e;
  // 4.9.25 和 Cascade 的 Velocity 对齐一样：面片的「上」是三维速度方向，朝着 / 背着镜头飞的星看起来短（以前按画面里的方向拉满长度）
  float sp=length(v); vec2 up=sp>1e-3?v.xy/sp:vec2(0.,1.); float fl=length(up); vec2 rt=fl>1e-4?vec2(up.y,-up.x)/fl:vec2(1.,0.); if(uFlip>.5) up=-up;
  vec2 lc=vec2((c.x-.5)*uSX*(1.+uSJ.x*(2.*hsh(id,5u)-1.))*evalX(rel), (c.y-uHb)*uSY*(1.+uSJ.y*(2.*hsh(id,6u)-1.))*evalY(rel));     // 4.9.28 随机感：每颗星宽 / 长均匀随机（= Initial Size uniform）
  vec2 w=p.xy+rt*lc.x+up*lc.y;
  gl_Position=vec4((w-uView.xy)/uView.zw,0.,1.); v_uv=c; vFrame=clamp(floor(evalK(rel)),0.,uNF-1.);
}`;
const FS_UNIT = HDR + `in vec2 v_uv; in float vFrame; uniform sampler2D uH,uT; uniform float uComb,uHI,uTI,uK; uniform vec2 uInset; uniform vec3 uTint; out vec4 o;
${RAMP_FN}
${CELLV}
void main(){ if(vFrame<0.){ discard; } vec2 uv=clamp(v_uv,uInset,1.-uInset);
  if(uComb>.5){ float v=cellv(uH,vFrame,uv); o=vec4(ramp(v)*v*uTint*uHI*uK,1.); }
  else { float h=cellv(uH,vFrame,uv), t=cellv(uT,vFrame,uv); o=vec4((h*uTint*uHI+ramp(t)*t*uTI)*uK,1.); } }`;
// 4.9.29 单帧（68_lowframe.js drawLowLayer）：uMode 0 = cascade.json 里单帧层现在的写法（灰度查 Ramp × Color Over Life × Alpha，同序列材质）；
// 1 = 再乘现有序列母材质的溶解 fade = 1 − saturate(D + 2P − 1)（4.9.31 起；4.9.29 是「出现 ≤ 进度 < 熄灭」的硬边、彩色）；2 = 功能图伪彩色；3 = 彩色单帧原样
const FS_LOW = HDR + `in vec2 v_uv; uniform sampler2D uC, uMap; uniform float uMode, uP, uAlpha, uHI, uTI, uK, uHasD, uHasA, uMirror, uInv; uniform vec4 uDm, uAm; uniform vec3 uTint; out vec4 o;
${RAMP_FN}
void main(){ vec2 uv=v_uv; if(uMirror>.5) uv.x=1.-uv.x; vec4 c=texture(uC,uv), m=texture(uMap,uv);
  if(uMode>2.5){ o=vec4(c.rgb,1.); return; }     // 3 = 彩色单帧原样（「贴图」左格）
  if(uMode>1.5){ float x=dot(m,uAm); if(uInv>.5) x=1.-x; bool lit=uHasD>.5?dot(m,uDm)<.999:x<.999; o=vec4(lit?mix(vec3(.1,.35,1.),vec3(1.,.25,.05),x)*(.35+.65*x):vec3(0.),1.); return; }     // 2 = 伪彩色：早 = 蓝、晚 = 红，没亮过 = 黑
  float v=c.r, fade=1.;
  if(uMode>.5 && uHasD>.5) fade=1.-clamp(dot(m,uDm)+2.*uP-1.,0.,1.);     // 1 = 现有序列母材质的溶解（对话框5 10-07）：值大的先消失、软过渡
  o=vec4(ramp(v)*v*uTint*uHI*uK*uAlpha*fade,1.); }`;
// 线间底光（4.2.0，tailHaze）：拖尾通道（G）做一次大半径高斯模糊，乘强度加回去（受光的烟 / 分辨不出的细火花）
const FS_HAZE = HDR + `in vec2 v_uv; uniform sampler2D uS; uniform vec2 uDir; uniform float uSig, uK; out vec4 o;
void main(){ float st=max(1.,uSig/6.), acc=0., ws=0.; for(int i=-24;i<=24;i++){ float x=float(i)*st, w=exp(-.5*x*x/(uSig*uSig)); acc+=texture(uS,v_uv+uDir*x).g*w; ws+=w; } o=vec4(0.,acc/ws*uK,0.,0.); }`;
const PR = {
  pack: compile(VS_QUAD, FS_PACK), enc: compile(VS_QUAD, FS_ENC), haze: compile(VS_QUAD, FS_HAZE),
  rgmat: compile(VS_QUAD, FS_RGMAT), mat: compile(VS_RECT, FS_MAT), unit: compile(VS_UNIT, FS_UNIT),
  atlas: compile(VS_QUAD, FS_ATLAS), cell: compile(VS_QUAD, FS_CELL), low: compile(VS_RECT, FS_LOW)
};
const quadVAO = gl.createVertexArray(); gl.bindVertexArray(quadVAO);
const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
const pb = gl.createBuffer();      // CPU 光点（星头、闪光）的顶点缓冲，pts40VAO 用（41_particles40.js）
const bufH = new Float32Array(4 * 240000), bufT = new Float32Array(4 * 450000);     // 4.9.50 星头形状一颗最多拆 56 个点：星头缓冲 3 万 → 24 万
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
// 4.2.20 星轨道纹理的预算（用户 10-03 17:28「打开制作中的效果烘一会儿白屏」）：轨道是「时刻 × 星」两张 RGBA32F，
// 以前时间步固定 1/240 s，千轮子星几千颗的层（片贝第 5 层 7220 颗 × 13 s）一张就 361 MB，加上建的时候的中间数组 JS 堆过 1 GB → 笔记本显存 / 内存爆掉白屏。
// 现在一张最多 TRACK_TEXELS 像素（64 MB）：星多的层时间步放粗（星的位置在两步之间按位置 + 速度三次插值，看不出来）；星不多的层（待验收的都在内）和以前一样。
const TRACK_TEXELS = 4e6;
function trackStarEstimate(P) { const carrier = P.type === 'senrin' || P.type === 'crossette'; if (familyOf(P.type) === 'rise') return 1 + (P.riseStyle === 'kobana' ? 11 * (+P.kobanaN || 0) : 0) + (P.riseStyle === 'bunpo' ? +P.bunpoN || 0 : 0);
  return Math.max(1, Math.round(+P.stars || 1) * (carrier ? 1 + Math.round(+P.subStars || 0) : 1)); }
// 4.2.21 同一份参数的星轨道共用（实时模拟、烘焙、收紧以前各建一份）：按参数内容记，引用计数；没人用了留最近 1 份备用（切回来不用重算）
const TRACK_CACHE = new Map();
function buildTrack(P) {
  P = fxP(P);     // 4.9.21 效果 › 整体调整（全是 1 时原样）
  let key = null; try { key = JSON.stringify({ ...P, engine: 'gpu' }) + '|' + MAX_TEX; } catch (e) { }
  const c = key && TRACK_CACHE.get(key);
  if (c && !gl.isContextLost()) { c.refs++; return c.tr; }
  const tr = buildTrackRun(P);
  if (key) { tr.cacheKey = key; TRACK_CACHE.set(key, { tr, refs: 1, idle: 0 }); trackGC(); }
  return tr;
}
function trackGC(keep = 1) {
  const idle = [...TRACK_CACHE.entries()].filter(([, c]) => c.refs <= 0).sort((a, b) => a[1].idle - b[1].idle);
  while (idle.length > keep) { const [k, c] = idle.shift(); TRACK_CACHE.delete(k); deleteTrackTex(c.tr); }
}
function buildTrackRun(P) {
  P = { ...P, engine: 'gpu' };
  const sim = new Sim(P), D = P.duration;
  const k = Math.max(2, Math.ceil(D / (MAX_TEX - 4) / H_STEP), Math.ceil(D * trackStarEstimate(P) / TRACK_TEXELS / H_STEP)), dt = k * H_STEP, Ns = Math.ceil(D / dt) + 2;
  const snaps = [];
  for (let i = 0; i < Ns; i++) {
    const n = sim.all.length, a = new Float32Array(n * 6);
    for (let q = 0; q < n; q++) { const st = sim.all[q]; a[q * 6] = st.x; a[q * 6 + 1] = st.y; a[q * 6 + 2] = st.z; a[q * 6 + 3] = st.vx; a[q * 6 + 4] = st.vy; a[q * 6 + 5] = st.vz; }
    snaps.push(a);
    for (let q = 0; q < k; q++) sim.step(H_STEP);
  }
  const nStars = Math.min(sim.all.length, MAX_TEX);
  const pos = new Float32Array(Ns * nStars * 4), vel = new Float32Array(Ns * nStars * 4), info = new Float32Array(nStars * 8);     // 每颗星 2 格：第 1 格出生 / 熄灭 / 生成率 / 末段系数，第 2 格星头直径（跟星头的起始半径用）
  // 火花发射器补全：每米生成 → 每颗星走过的路程（每个轨迹采样一格）；跟星头大小 → 星头直径和大小曲线（缺省都不算，路程贴图 1×1）
  const fam = familyOf(P.type), perM = fam === 'aerial' && P.sparkRateBy === 'm', headOn = fam === 'aerial' && +P.sparkSpawnHead > 0, hsT = headOn ? headShapeOf(P) : null;
  const len = perM ? new Float32Array(Ns * nStars * 4) : null;
  let M = 1, total = 0;
  for (let q = 0; q < nStars; q++) {
    const st = sim.all[q], first = snaps.findIndex(a => a.length > q * 6);
    for (let i = 0; i < Ns; i++) {
      const a = snaps[Math.max(i, first)], o = (q * Ns + i) * 4;
      pos[o] = a[q * 6]; pos[o + 1] = a[q * 6 + 1]; pos[o + 2] = a[q * 6 + 2];
      vel[o] = a[q * 6 + 3]; vel[o + 1] = a[q * 6 + 4]; vel[o + 2] = a[q * 6 + 5];
      if (len) len[o] = i ? len[o - 4] + Math.hypot(pos[o] - pos[o - 4], pos[o + 1] - pos[o - 3], pos[o + 2] - pos[o - 2]) : 0;
    }
    // 分层星：外层（带木炭火花尾）烧 sparkStop 秒后火花停，内层只发光不出火花；sparkStart：点火后过几秒才开始出火花（末段才出的短尾）
    const ig = st.birth + (st.ign || 0), s0 = P.sparkStart > 0 && st.kind !== 5 ? P.sparkStart : 0, born = ig + s0;
    const death = Math.min(st.birth + (st.vis != null ? st.vis : st.burn), D, P.sparkStop > 0 && st.kind !== 5 && !(P.emberFrac > 0 && P.emberAll) ? ig + P.sparkStop : 1e9);
    // 4.0：落水 / 分砲提前熄灭的星，火花也在那一刻停（问题清单 E3：以前会在原地继续喷）
    const deathAt = st.tDead != null ? Math.min(death, st.tDead) : death;
    // 末段火花密度：发射率从 rate 线性变到 rate × sparkRateEnd（按整段燃烧，不按截断后的时长）
    const e = st.kind === 5 ? 1 : (P.sparkRateEnd == null ? 1 : P.sparkRateEnd), B = Math.max(0.05, st.birth + (st.vis != null ? st.vis : st.burn) - born), a = st.rate * (e - 1) / (2 * B);
    if (headOn) { const [w0, w1] = sparkHeadWin(st); info[q * 8 + 4] = sparkHeadBase(P, st, hsT); info[q * 8 + 5] = w0; info[q * 8 + 6] = w1; info[q * 8 + 7] = sparkHeadCurveSel(st); }
    if (perM && st.kind !== 5) {     // 每米生成：第 3 位 = 这颗星的每米火花数，末段密度不用
      const Lt = t => { const fi = clamp(t / dt, 0, Ns - 1), i0 = Math.min(Math.floor(fi), Ns - 2), f = fi - i0, o = q * Ns * 4; return len[o + i0 * 4] + (len[o + (i0 + 1) * 4] - len[o + i0 * 4]) * f; };
      const pm = sparkPerMOf(P, st);
      info[q * 8] = born; info[q * 8 + 1] = deathAt; info[q * 8 + 2] = deathAt > born && st.rate > 0 ? pm : 0; info[q * 8 + 3] = 0;
      if (st.rate > 0 && pm > 0 && deathAt > born) { const c = Math.ceil(Math.max(0, pm * (Lt(deathAt) - Lt(born)))) + 1; M = Math.max(M, c); total += c; }
      continue;
    }
    info[q * 8] = born; info[q * 8 + 1] = deathAt; info[q * 8 + 2] = deathAt > born ? st.rate : 0; info[q * 8 + 3] = a;
    if (st.rate > 0 && deathAt > born) { const Bc = deathAt - born, c = Math.ceil(Math.max(0, st.rate * Bc + a * Bc * Bc)) + 1; M = Math.max(M, c); total += c; }
  }
  gl.activeTexture(gl.TEXTURE0);
  return { pos: floatTex(Ns, nStars, pos), vel: floatTex(Ns, nStars, vel), info: floatTex(2, nStars, info), len: len ? floatTex(Ns, nStars, len) : floatTex(1, 1, new Float32Array(4)), nStars, M, Ns, dt, total, P, dropStars: Math.max(0, sim.all.length - nStars) };     // dropStars：超过显卡贴图边长没上传的星（E9）
}
function deleteTrackTex(tr) { gl.deleteTexture(tr.pos); gl.deleteTexture(tr.vel); gl.deleteTexture(tr.info); if (tr.len) gl.deleteTexture(tr.len); }
function disposeTrack(tr) {
  if (!tr) return;
  const c = tr.cacheKey && TRACK_CACHE.get(tr.cacheKey);
  if (c && c.tr === tr) { c.refs = Math.max(0, c.refs - 1); if (!c.refs) c.idle = performance.now(); trackGC(); return; }
  deleteTrackTex(tr);
}
// 火花的有效参数：银竜的尾迹更白、更长
function sparkEff(P) { const silver = familyOf(P.type) === 'rise' && P.riseStyle === 'silver'; return { T0: P.T0 + (silver ? 250 : 0), life: P.sparkLife * (silver ? 1.5 : 1) }; }
// 4.6.0（5.0 第 1 步）：火花 / 余烬 / 分叉火花 / 辉星以前写死的数变成参数（默认 = 以前的常数，算出来的 float 和字面量一样，逐位不变）
function setSparkModUniforms(pr, P) {
  const u = (k, v) => { if (pr.u[k]) gl.uniform1f(pr.u[k], v); }, n = (v, d) => v == null || v === '' || !isFinite(+v) ? d : +v;
  const [ia, ib] = jitAB(P.sparkInhJit, 70, 0.3, 1.4); u('uInhA', ia); u('uInhB', ib); u('uT0J', n(P.T0Jit, 120));
  u('uEmbLJ', n(P.emberLifeJit, 0.2)); u('uEmbDk', n(P.emberDecay, 2)); u('uEmbFa', n(P.emberFadeAt, 0.75));
  const [la, lb] = jitAB(P.branchLifeJit, 40, 0.6, 0.8), [va, vb] = jitAB(P.branchVJit, 40, 0.6, 0.8);
  u('uBrL', n(P.branchLife, 0.16)); u('uBrLA', la); u('uBrLB', lb); u('uBrV', n(P.branchV, 4)); u('uBrVA', va); u('uBrVB', vb);
  u('uBrInh', n(P.branchInh, 0.5)); u('uBrKd', n(P.branchKd, 1.5)); u('uBrT', n(P.branchT, 1.08)); u('uBrB', n(P.branchBright, 1.8)); u('uBrFd', n(P.branchFade, 2)); u('uBrS', n(P.branchSize, 0.7));
  const [ga, gb] = jitAB(P.glitterDelayJit, 50, 0.5, 1); u('uGlA', ga); u('uGlB', gb); u('uGlW', n(P.glitterW, 0.03)); u('uGlPk', n(P.glitterPeak, 6)); u('uGlDim', n(P.glitterDim, 0.85));
  setCurveU(pr, P, [['uCvSpS', 'sparkSizeCurve'], ['uCvSpB', 'sparkBrightCurve'], ['uCvEmB', 'emberBrightCurve'], ['uCvBrB', 'branchBrightCurve'], ['uCvEmS', 'emberSizeCurve'], ['uCvBrS', 'branchSizeCurve']]);
}
// 4.8.0 按寿命曲线：最多 6 个点（多了均匀取 6 个，首尾保留）；空 = N 0 = 不乘。4.9.4 抽成公用（地面火花 / 彗星也用）
function setCurveU(pr, P, pairs) {
  for (const [k, key] of pairs) { let ks = parseCurve(P[key]) || []; if (ks.length > 6) ks = [0, 1, 2, 3, 4, 5].map(i => ks[Math.round(i * (ks.length - 1) / 5)]); const a = new Float32Array(12); ks.forEach((q, i) => { a[i * 2] = q[0]; a[i * 2 + 1] = q[1]; });
    const loc = pr.u[k + '[0]']; if (loc) gl.uniform2fv(loc, a); if (pr.u[k + 'N']) gl.uniform1i(pr.u[k + 'N'], ks.length); }
}
function setAirUniforms(pr, P) {
  const tm = P.turb > 0 ? turbModes(P) : [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
  gl.uniform1f(pr.u.uWind, P.wind || 0);
  gl.uniform4fv(pr.u['uTm[0]'], tm.flatMap(m => m.slice(0, 4))); gl.uniform1fv(pr.u['uTa[0]'], tm.map(m => m[4]));
}
// opt：xf = 随体坐标变换 [ox, oy, cos, sin]；mir = 0 无水面 / 1 只剔除水下 / 2 倒影
function drawSparksGPU(tr, t, view, ppm, chan, w, tw, opt = {}) {
  const P = tr.P, modern = true, str = familyOf(P.type) === 'aerial' && +P.sparkStretch > 0, se = sparkEff(P);     // 4.9.50 火花拉长
  const poly = familyOf(P.type) === 'aerial' && (+P.sparkShape === 1 || +P.sparkBrightJit > 0), pr = poly ? spkPolyProgram40(str ? 'spkS' : 'spk') : particleProgram40(str ? 'spkS' : 'spk'); gl.useProgram(pr.p);     // 4.9.57 火花多边形 / 亮度随机（缺省不进）
  if (poly) { gl.uniform1f(pr.u.uPolyOn, +P.sparkShape === 1 ? 1 : 0); gl.uniform1f(pr.u.uPolyIrr, clamp(P.sparkShapeIrr == null ? .6 : +P.sparkShapeIrr, 0, 1)); gl.uniform1f(pr.u.uPolySpin, Math.max(0, P.sparkShapeSpin == null ? .5 : +P.sparkShapeSpin)); gl.uniform1f(pr.u.uSpkBJ, Math.max(0, +P.sparkBrightJit || 0)); }
  if (str) { gl.uniform1f(pr.u.uSpkStr, +P.sparkStretch); gl.uniform1f(pr.u.uSpkStrJ, Math.max(0, +P.sparkStretchJit || 0)); }
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tr.pos); gl.uniform1i(pr.u.uPos, 2);
  gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, tr.vel); gl.uniform1i(pr.u.uVel, 3);
  gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, tr.info); gl.uniform1i(pr.u.uInfo, 4);
  if (pr.u.uLen) { gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, tr.len); gl.uniform1i(pr.u.uLen, 5); }
  gl.activeTexture(gl.TEXTURE0);
  { const air = familyOf(P.type) === 'aerial', u = (k, v) => { if (pr.u[k]) gl.uniform1f(pr.u[k], v); };     // 火花发射器补全（缺省全 0 = 以前）
    u('uPerM', air && P.sparkRateBy === 'm' ? 1 : 0); u('uSpR', air ? Math.max(0, +P.sparkSpawnR || 0) : 0); u('uSpH', air ? Math.max(0, +P.sparkSpawnHead || 0) : 0);
    u('uJet', air ? Math.max(0, +P.sparkJet || 0) : 0); u('uJetC', clamp(+P.sparkJetCone || 0, 0, 90) * Math.PI / 180);
    if (air && +P.sparkSpawnHead > 0) setCurveU(pr, P, [['uCvHsS', 'starSizeCurve'], ['uCvHsU', 'subSizeCurve']]); }
  gl.uniform1f(pr.u.uT, t); gl.uniform1f(pr.u.uDT, tr.dt); gl.uniform1i(pr.u.uM, tr.M); gl.uniform1i(pr.u.uNs, tr.Ns);
  gl.uniform1i(pr.u.uSeed, P.seed | 0); gl.uniform1i(pr.u.uTw, tw | 0);
  gl.uniform1f(pr.u.uInh, P.sparkInherit); gl.uniform1f(pr.u.uSpread, P.sparkSpread); gl.uniform1f(pr.u.uLife, se.life);
  gl.uniform1f(pr.u.uLifeEnd, familyOf(P.type) === 'rise' || P.sparkLifeEnd == null ? 1 : P.sparkLifeEnd);
  gl.uniform1f(pr.u.uLifeJit, familyOf(P.type) === 'rise' || P.sparkLifeJit == null ? 0.45 : P.sparkLifeJit / 100);
  gl.uniform1f(pr.u.uK, P.sparkDrag); gl.uniform1f(pr.u.uG, G * P.sparkGrav); gl.uniform1f(pr.u.uT0, se.T0); gl.uniform1f(pr.u.uCool, P.cooling); if (pr.u.uCoolAbs) gl.uniform1f(pr.u.uCoolAbs, familyOf(P.type) === 'aerial' ? 1 : 0);     // 5.0（4.7.0）：空中类只有「按实际年龄冷却」一种
  gl.uniform1f(pr.u.uTwk, P.twinkle); if (pr.u.uTwHz) gl.uniform1f(pr.u.uTwHz, +P.twinkleHz > 0 ? +P.twinkleHz : 0); gl.uniform1f(pr.u.uBright, P.sparkBright); gl.uniform1f(pr.u.uSize, P.sparkSize);
  gl.uniform1f(pr.u.uGlit, P.glitter || 0); gl.uniform1f(pr.u.uGlitD, P.glitterDelay || 0.25);
  gl.uniform1f(pr.u.uEmb, P.emberFrac || 0); gl.uniform1f(pr.u.uEmbL, P.emberLife || 3); gl.uniform1f(pr.u.uEmbB, P.emberBright || 0.1); gl.uniform1f(pr.u.uEmbF, P.emberFollow || 0); gl.uniform1f(pr.u.uEmbS, P.emberSize || 1);
  gl.uniform1f(pr.u.uEmbE, P.emberEnd || 0); gl.uniform1f(pr.u.uHotStop, P.emberFrac > 0 && P.emberAll && P.sparkStop > 0 ? P.sparkStop : 0);
  if (pr.u.uRamp) { gl.uniform1f(pr.u.uRamp, +P.sparkRamp > 0 ? +P.sparkRamp : 0); gl.uniform1f(pr.u.uRampJ, clamp((+P.sparkRampJit || 0) / 100, 0, 1)); }     // 4.2.17
  if (pr.u.uTailJit) gl.uniform1f(pr.u.uTailJit, +P.tailJit || 0); if (pr.u.uShoulder) gl.uniform1f(pr.u.uShoulder, +P.tailShoulder || 0);
  if (pr.u.uRise) gl.uniform1f(pr.u.uRise, +P.sparkRise || 0); if (pr.u.uStarB) gl.uniform1f(pr.u.uStarB, +P.starBright || 0);
  if (pr.u.uWShape) { const ws = tailShapeOf(P); gl.uniform1f(pr.u.uWShape, ws.on ? 1 : 0); gl.uniform1f(pr.u.uWidth, ws.w); gl.uniform1f(pr.u.uPinH, ws.h); gl.uniform1f(pr.u.uPinT, ws.t); gl.uniform1f(pr.u.uBelly, ws.m); }
  if (pr.u.uDif) { gl.uniform1f(pr.u.uDif, familyOf(P.type) === 'aerial' ? +P.tailDiffuse || 0 : 0); gl.uniform1f(pr.u.uDifL, Math.max(1, +P.tailDiffuseScale || 20)); }
  const br = Math.round(P.branch || 0); gl.uniform1i(pr.u.uBr, br); gl.uniform1f(pr.u.uBrAt, P.branchAt || 0.5);
  setSparkModUniforms(pr, P);
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
  const P = E.P, modern = true, pr = particleProgram40('emit'), se = sparkEff(P); gl.useProgram(pr.p);
  setEmitCommon(pr, E, t, view, ppm, tw);
  gl.uniform1f(pr.u.uRate, E.rate); gl.uniform1i(pr.u.uMp, E.Mp); gl.uniform1i(pr.u.uMw, E.Mw);
  gl.uniform1f(pr.u.uLife, se.life); gl.uniform1f(pr.u.uK, P.sparkDrag); gl.uniform1f(pr.u.uG, G * P.sparkGrav);
  gl.uniform1f(pr.u.uSpread, P.sparkSpread); gl.uniform1f(pr.u.uInh, P.sparkInherit); gl.uniform1f(pr.u.uT0, se.T0); gl.uniform1f(pr.u.uCool, P.cooling);
  gl.uniform1f(pr.u.uTwk, P.twinkle); gl.uniform1f(pr.u.uBright, P.sparkBright); gl.uniform1f(pr.u.uSize, P.sparkSize);
  gl.uniform1f(pr.u.uJet, P.jetSpeed); gl.uniform1f(pr.u.uCone, P.jetCone * Math.PI / 180); gl.uniform3fv(pr.u.uFV, [0, E.V || 0, 0]);
  setCurveU(pr, P, [['uCvSpS', 'sparkSizeCurve'], ['uCvSpB', 'sparkBrightCurve']]);     // 4.9.4
  setParticleUniforms(pr, chan); gl.uniform4fv(pr.u.uChan, chan); gl.uniform1f(pr.u.uW, w);
  gl.bindVertexArray(emptyVAO); drawParticleBatch(E.nv, modern); gl.bindVertexArray(null);
}
function drawEmitHeads(E, t, view, ppm, chan, w, tw) {
  const P = E.P; if (E.mode === 3) return;
  const modern = true, pr = particleProgram40('ehead'); gl.useProgram(pr.p);
  setEmitCommon(pr, E, t, view, ppm, tw);
  gl.uniform1f(pr.u.uHead, P.headSize); gl.uniform1f(pr.u.uHI, P.headBright); gl.uniform1f(pr.u.uFlick, P.flicker);
  gl.uniform1f(pr.u.uSS, P.subSpeed); gl.uniform1f(pr.u.uSB, P.subBurn); gl.uniform1i(pr.u.uNb, Math.round(P.burstStars || 0));
  setCurveU(pr, P, [['uCvStS', 'starSizeCurve'], ['uCvStB', 'starBrightCurve']]);     // 4.9.4 彗星
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
  const hx = PT_HEXON && !PT_GAUSS ? PT_HEXP : null, modern = true, pr = particleProgram40(hx ? 'ptsHex' : 'pts'); gl.useProgram(pr.p); gl.bindVertexArray(pts40VAO); gl.bindBuffer(gl.ARRAY_BUFFER, pb);     // 4.9.50 六边形星头：hx 非空时用 ptsHex
  gl.bufferData(gl.ARRAY_BUFFER, buf.subarray(0, n * 4), gl.DYNAMIC_DRAW);
  gl.uniform4fv(pr.u.uView, view); gl.uniform1f(pr.u.uPPM, ppm); gl.uniform1f(pr.u.uPPMY, PPMY || ppm); gl.uniform1f(pr.u.uMax, PT_MAX);
  gl.uniform4fv(pr.u.uXf, xf || [0, 0, 1, 0]); gl.uniform1f(pr.u.uUseXf, xf ? 1 : 0);
  setParticleUniforms(pr, chan); gl.uniform4fv(pr.u.uChan, chan); gl.uniform1f(pr.u.uW, w); gl.uniform1f(pr.u.uSpan, PT_SPAN); gl.uniform1f(pr.u.uGauss, PT_GAUSS);
  if (hx) { gl.uniform1f(pr.u.uHex, hx.hex); gl.uniform1f(pr.u.uHexRot, hx.rot); }
  drawParticleBatch(n, modern);
}
let PT_HEXON = false;     // 4.9.50：只有 drawHeads 画星头那一批时为 true（尾迹的 CPU 点、别的光点照旧是圆）
// 4.3.3：Sim.gather 的星头缓冲里 [0, g) 是星头 / 爆裂小闪（实心亮核 + 光晕），[g, n) 是开花闪光（高斯柔光，见 20_sim.js gather）
function drawHeads(buf, n, g, view, ppm, chan, w, xf) {
  g = g == null ? n : Math.max(0, Math.min(g, n));
  if (g > 0) { PT_HEXON = !!PT_HEXP; try { drawPoints(buf, g, view, ppm, chan, w, xf); } finally { PT_HEXON = false; } }
  if (n > g) { const old = PT_GAUSS; PT_GAUSS = 1; try { drawPoints(buf.subarray(g * 4), n - g, view, ppm, chan, w, xf); } finally { PT_GAUSS = old; } }
}
// 在超采样缓冲上加线间底光（实时、定帧、烘焙都在 drawFrameSamples40 之后调这一个函数）。ppm = 这个缓冲每米多少像素
const hazeTmps = new Map();
function hazeSamples40(P, src, ppm) {
  const k = +P.tailHaze || 0; if (!(k > 0) || familyOf(P.type) !== 'aerial') return;
  const sig = Math.max(0.5, (+P.tailHazeR || 6) * ppm / 2), key = src.w + 'x' + src.h;
  let tmp = hazeTmps.get(key); if (!tmp) { gl.activeTexture(gl.TEXTURE0); tmp = new Target(src.w, src.h, gl.RGBA16F); if (hazeTmps.size > 6) { for (const t of hazeTmps.values()) t.dispose(); hazeTmps.clear(); } hazeTmps.set(key, tmp); }
  const pr = PR.haze; gl.useProgram(pr.p); gl.activeTexture(gl.TEXTURE0); gl.uniform1i(pr.u.uS, 0); gl.uniform1f(pr.u.uSig, sig);
  gl.disable(gl.BLEND); tmp.bind(); gl.bindTexture(gl.TEXTURE_2D, src.tex); gl.uniform2f(pr.u.uDir, 1 / src.w, 0); gl.uniform1f(pr.u.uK, 1); drawQuad();
  src.bind(); additive(true); gl.colorMask(false, true, false, false); gl.bindTexture(gl.TEXTURE_2D, tmp.tex); gl.uniform2f(pr.u.uDir, 0, 1 / src.h); gl.uniform1f(pr.u.uK, k); drawQuad();
  gl.colorMask(true, true, true, true); additive(false);
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

// 合并输出时星头 / 火花两路的亮度倍数（只给尾缀 / 物理的定帧用：85_stills.js 按画面自动曝光后再乘回）
function combGain(P) { return [P.headBright == null ? 1 : P.headBright, P.sparkBright == null ? 1 : P.sparkBright]; }
