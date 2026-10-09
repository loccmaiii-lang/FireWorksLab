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
// ---- 4.9.53 幂律光晕（对话框相机渲染，用户 10-09 18:29「按顺序测试」；诊断 analysis/probe/星头光晕诊断_2026-10-09/诊断.md）----
// 实拍星头的径向剖面是「亮核 + 幂律尾巴」（镜头像差 / 散射的点扩散，天文上用 Moffat 拟合，实拍 β 1.8–3.4），高斯尾巴掉得太快：
// 想让光晕看得见只能把 σ 拉大，结果是一团雾。haloShape = 1 时光晕换成 Moffat：(β − 1)/(π αx αy)·(1 + |p/α|²)^−β，α = 光晕半径倍数 × 亮核半径，
// 积分 = 1，所以光晕总光量和高斯一样（亮核 × 占比 / (1 − 占比)）；画到 6α（高斯 4σ），6α 外丢掉的光 < 3%（β = 2.2）。
// 和上面的变体同一个规矩：haloShape = 0（缺省）或光晕占比 = 0 时用原来的程序，逐像素不变；= 1 才编译这里的变体（可以和渐变亮核、六边形、火花拉长叠用）。
function must40(s, a, b, all = false) { if (!s.includes(a)) throw new Error('幂律光晕：着色器里找不到「' + a.slice(0, 60) + '」'); return all ? s.replaceAll(a, b) : s.replace(a, b); }
function moffatVS40(vs) { return must40(vs, '4.*max(1.,uHaloR)', '6.*max(1.,uHaloR)', true); }
function moffatFS40(fs) {
  fs = must40(fs, 'uniform vec4 uChan; uniform float uW, uHaloFrac, uHaloR, uGauss;', 'uniform vec4 uChan; uniform float uW, uHaloFrac, uHaloR, uGauss, uHaloBeta;');
  fs = must40(fs, 'float window=1.-smoothstep(3.5,4.,radial);', 'float window=1.-smoothstep(5.,6.,radial);');
  return must40(fs, 'halo=3.14159265*vSig.x*vSig.y*uHaloFrac/(1.-uHaloFrac)*gaussianCoverage(vLocal,sigma)*window;',
    'vec2 qm=vLocal/sigma; halo=vSig.x*vSig.y*uHaloFrac/(1.-uHaloFrac)*(uHaloBeta-1.)/(sigma.x*sigma.y)*pow(1.+dot(qm,qm),-uHaloBeta)*window;');
}
// ---- 4.9.55 多层柔光（对话框相机渲染，用户 10-09 20:34「按 Blender 项目里认可的光感再做一版」；诊断 analysis/probe/星头光晕诊断_2026-10-09/诊断.md 第 7 节）----
// 用户认可的三处 Blender 光感（万彩千轮 C/D、FanComet R4、银彩菊 V02）的辉光都是「近晕 + 远晕」两到四层：
// 合成器两层 Fog Glow（近：小而强；远：大而弱），万彩千轮 V11 是 near 3s + soft 6s / 14s / 23s 几个高斯叠起来。单个高斯做不出「贴着亮核亮、远处一大圈很淡」。
// haloShape = 2 时光晕 = 四个高斯，宽度 = 光晕半径倍数 × 亮核半径 × (0.6, 1.5, 3, 5.5)，能量份额 0.12 / 0.30 / 0.33 / 0.25（按万彩千轮 V11 C 各层能量折算），
// 总光量和高斯一样（亮核 × 占比 / (1 − 占比)），每层 3.5–4σ 收尾，画到 22 × 光晕半径倍数 × 亮核半径。最外层很宽：只建议给星头这种少量的大亮点用，几十万粒火花全开会慢。
function multiVS40(vs) { return must40(vs, '4.*max(1.,uHaloR)', '22.*max(1.,uHaloR)', true); }
function multiFS40(fs) {
  return must40(fs, 'halo=3.14159265*vSig.x*vSig.y*uHaloFrac/(1.-uHaloFrac)*gaussianCoverage(vLocal,sigma)*window;',
    'const vec4 HK=vec4(.6,1.5,3.,5.5), HW=vec4(.12,.30,.33,.25); for(int i=0;i<4;i++){ vec2 sg=sigma*HK[i]; halo+=HW[i]*gaussianCoverage(vLocal,sg)*(1.-smoothstep(3.5,4.,length(vLocal/sg))); } halo*=3.14159265*vSig.x*vSig.y*uHaloFrac/(1.-uHaloFrac);');
}
const moffatPrograms40 = {};
function moffatProgram40(kind, shape = 1) {
  const g = particleQuality.coreProfile ? 1 : 0, key = kind + g + '_' + shape; if (moffatPrograms40[key]) return moffatPrograms40[key];
  const G = x => g ? gradientSource40(x) : x, stable = v => v.replace('uint uid=uint(pid);', 'uint uid=uint(s)*65536u+uint(j);');
  let vs, fs = G(POINT40_FS);
  if (kind === 'pts') vs = POINT40_CPU_VS;
  else if (kind === 'ptsHex') { vs = POINT40_CPU_VS; fs = hexFS40(fs); }
  else if (kind === 'spkS') vs = spkStretchVS40(stable(point40GpuSource(VS_SPK)));
  else if (kind === 'spk') vs = stable(point40GpuSource(VS_SPK));
  else if (kind === 'emit' || kind === 'ehead') vs = point40GpuSource(kind === 'emit' ? VS_EMIT : VS_EHEAD);
  else throw new Error('没有这种光点程序：' + kind);
  return moffatPrograms40[key] = shape === 2 ? compile(multiVS40(G(vs)), multiFS40(fs)) : compile(moffatVS40(G(vs)), moffatFS40(fs));
}
// ---- 4.9.57 火花：不规则多边形 + 亮度随机（对话框相机渲染，用户 10-09 23:20「每个火花粒子都要有强烈的发光感，同时边缘锐利、轮廓清晰……粒子形状为不规则多边形（每个粒子形态各异）」）----
// 照 Blender FanComet / FanSilver R4（用户认可）：每粒火花是一块随机朝向的小多面体（icosphere 实例，沿速度对齐），平面自发光、增益 15 远超削顶，
// 所以核心一片白、轮廓是几何边（1 像素过渡），每粒形状和朝向都不同；没有运动模糊；辉光是合成器里另加的一圈。
// 这里：每粒一个 4–7 边的星形多边形（顶点角度 / 半径按粒子编号随机，不规则程度 uPolyIrr），按年龄慢慢翻转（uPolySpin 圈 / 秒，每粒随机正反）；
// 像素里 4 × 4 取样算覆盖（边缘锐利、抗锯齿），总光量和同直径圆盘一样（亮度参数含义不变）；亮核半径 < 0.6 像素时形状看不出来，按圆盘精确覆盖。
// 辉光照旧用这一层的光晕（占比 / 半径 / 形状）。亮度随机 uSpkBJ：每粒一个固定的对数正态倍数（均值 1），对应 Blender 的 intensity 0.3–1.8。
// 两样都缺省 0：不进这里，火花用原来的程序，逐像素不变。
// 4.9.59（用户 10-10 01:37「后面别的效果也能通用吗？走查一遍」）：① 地面 / 上升循环的火花（VS_EMIT）也能用；礼花以外的家族走 GPU 火花时也能用（以前只认礼花）；
//   ② 渐变亮核（coreProfile 1）不再被丢掉：只开亮度随机时照旧是渐变亮核，开多边形时是硬边多边形（总光量一样）。
//   仍是圆的：CPU 火花（旧的 CPU 内核、物理尾缀、升空尾缀 RT6 近段的火星）——缓冲里没有每粒火花固定的编号，形状会逐帧乱跳；Cascade 里的 GPU 光点 / 软圆点（引擎材质）。
// 礼花火花（VS_SPK）：编号 uid、输出行 emitPt(q,I,size)；地面 / 上升循环火花（VS_EMIT）：编号 key、输出行 emitPt(p.xy,I,sz)。两边都有 age（这粒火花的年龄）
const POLY40_SRC = { spk: { anchor: 'uniform sampler2D uPos, uVel, uInfo;', id: 'uid', tail: '  emitPt(q,I,size);\n}' }, emit: { anchor: 'uniform sampler2D uSrc;', id: 'key', tail: '  emitPt(p.xy,I,sz);\n}' } };
function polyVS40(vs, src = POLY40_SRC.spk) {
  vs = must40(vs, src.anchor, src.anchor + ' uniform float uPolySpin, uSpkBJ; flat out float vSeed; flat out float vPolyA;');
  const at = vs.lastIndexOf(src.tail); if (at < 0) throw new Error('火花多边形：找不到火花着色器的输出行');
  const k = src.id;
  return vs.slice(0, at) + `  vSeed=hsh(${k},131u); vPolyA=6.2831853*(hsh(${k},133u)+uPolySpin*(2.*hsh(${k},135u)-1.)*age);
  if(uSpkBJ>0.) I*=exp(uSpkBJ*gss(${k},137u)-.5*uSpkBJ*uSpkBJ);
` + vs.slice(at);
}
const POLY40_FN = `flat in float vSeed; flat in float vPolyA; uniform float uPolyOn, uPolyIrr;
float ph40(float k, float a){ return fract(sin(vSeed*(91.7+a)+k*(12.9898+a*.37))*43758.5453); }
float polyCov40(vec2 p, vec2 r){
  if(uPolyOn<.5 || min(r.x,r.y)<.6) return diskCoverage(p,r);
  int N=4+int(floor(ph40(0.,3.1)*4.)); vec2 V[7]; float A=0.;
  for(int k=0;k<7;k++){ if(k>=N) break; float th=vPolyA+6.2831853*(float(k)+.42*uPolyIrr*(ph40(float(k),7.7)-.5))/float(N);
    V[k]=(1.-.5*uPolyIrr*ph40(float(k),1.3))*vec2(cos(th),sin(th)); }
  for(int k=0;k<7;k++){ if(k>=N) break; vec2 a=V[k], b=V[k+1<N?k+1:0]; A+=.5*(a.x*b.y-a.y*b.x); }
  float n=0.;
  for(int i=0;i<4;i++) for(int j=0;j<4;j++){ vec2 u=(p+(vec2(float(i),float(j))-1.5)*.25)/r;
    for(int k=0;k<7;k++){ if(k>=N) break; vec2 a=V[k], b=V[k+1<N?k+1:0];
      if(a.x*u.y-a.y*u.x>=0. && u.x*b.y-u.y*b.x>=0. && (b.x-a.x)*(u.y-a.y)-(b.y-a.y)*(u.x-a.x)>=0.){ n+=1.; break; } } }
  return n/16.*3.14159265/max(A,.05);
}
void main(){`;
function polyFS40(fs) {
  fs = must40(fs, 'void main(){', POLY40_FN);
  const disk = 'float core=diskCoverage(vLocal,vSig), halo=0.;', grad = 'float core=3.14159265*vSig.x*vSig.y*gaussianCoverage(vLocal,vSig*.5), halo=0.;';
  if (fs.includes(disk)) return fs.replace(disk, 'float core=polyCov40(vLocal,vSig), halo=0.;');
  // 渐变亮核：多边形开着就画硬边多边形（同样的总光量），关着（只开了亮度随机）照旧渐变
  return must40(fs, grad, 'float core=(uPolyOn>.5 && min(vSig.x,vSig.y)>=.6) ? polyCov40(vLocal,vSig) : 3.14159265*vSig.x*vSig.y*gaussianCoverage(vLocal,vSig*.5), halo=0.;');
}
const spkPolyPrograms40 = {};
function spkPolyProgram40(kind) {
  const hs = particleQuality.haloFrac > 0 ? particleQuality.haloShape : 0, g = particleQuality.coreProfile ? 1 : 0, key = kind + g + '_' + hs; if (spkPolyPrograms40[key]) return spkPolyPrograms40[key];
  let vs = kind === 'emit' ? polyVS40(point40GpuSource(VS_EMIT), POLY40_SRC.emit) : polyVS40(point40GpuSource(VS_SPK).replace('uint uid=uint(pid);', 'uint uid=uint(s)*65536u+uint(j);')), fs = POINT40_FS;
  if (kind === 'spkS') vs = spkStretchVS40(vs);
  if (g) { vs = gradientSource40(vs); fs = gradientSource40(fs); }     // 渐变亮核（和 shapeProgram40 / moffatProgram40 同一个顺序：先拉长、再渐变、最后光晕形状）
  if (hs === 1) { vs = moffatVS40(vs); fs = moffatFS40(fs); } else if (hs === 2) { vs = multiVS40(vs); fs = multiFS40(fs); }
  return spkPolyPrograms40[key] = compile(vs, polyFS40(fs));
}
// 多边形 / 亮度随机的开关和 uniform（礼花火花、地面 / 上升循环火花共用）
function sparkPolyOn(P) { return +P.sparkShape === 1 || +P.sparkBrightJit > 0; }
function setSparkPolyUniforms(pr, P) {
  gl.uniform1f(pr.u.uPolyOn, +P.sparkShape === 1 ? 1 : 0); gl.uniform1f(pr.u.uPolyIrr, clamp(P.sparkShapeIrr == null ? .6 : +P.sparkShapeIrr, 0, 1));
  gl.uniform1f(pr.u.uPolySpin, Math.max(0, P.sparkShapeSpin == null ? .5 : +P.sparkShapeSpin)); gl.uniform1f(pr.u.uSpkBJ, Math.max(0, +P.sparkBrightJit || 0));
}
function particleProgram40(kind) {
  if (particleQuality.haloShape > 0 && particleQuality.haloFrac > 0 && !(kind === 'pts' && PT_GAUSS)) return moffatProgram40(kind, particleQuality.haloShape);     // 4.9.53 幂律 / 4.9.55 多层柔光
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
