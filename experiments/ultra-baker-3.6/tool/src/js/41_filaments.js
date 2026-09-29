// Continuous material history, separate from point-spark lifetime sampling.
// Each star owns one connected strip. Adjacent cells share both endpoint and
// tangent; there are no overlapping round caps to create a chain of beads.
const VS_FILAMENT = `#version 300 es
precision highp float; precision highp int; precision highp sampler2D;
uniform sampler2D uPos,uVel,uInfo;
uniform int uNs,uSegments,uSeed;
uniform float uT,uDT,uLife,uHot,uHotGain,uHotGrowth,uBody,uFollow,uWidth,uJitter,uInh,uK,uG,uBright,uWind;
uniform vec4 uView,uXf; uniform vec2 uPP; uniform float uUseXf,uMir;
uniform vec4 uTm[3];uniform float uTa[3];
out float vAcross,vSigma,vFlux,vSourceY;
uint pcg(uint v){uint s=v*747796405u+2891336453u;uint w=((s>>((s>>28u)+4u))^s)*277803737u;return (w>>22u)^w;}
float rnd(int s,uint k){return float(pcg(uint(s)^pcg(k+uint(uSeed)*2654435769u)))/4294967296.;}
vec2 location(int s,float tb){
  float fi=tb/uDT;int i=clamp(int(floor(fi)),0,uNs-2);float f=clamp(fi-float(i),0.,1.);
  vec2 p0=texelFetch(uPos,ivec2(i,s),0).xy,p1=texelFetch(uPos,ivec2(i+1,s),0).xy;
  vec2 v0=texelFetch(uVel,ivec2(i,s),0).xy,v1=texelFetch(uVel,ivec2(i+1,s),0).xy;
  float f2=f*f,f3=f2*f;
  vec2 p=(2.*f3-3.*f2+1.)*p0+(f3-2.*f2+f)*uDT*v0+(-2.*f3+3.*f2)*p1+(f3-f2)*uDT*v1;
  vec2 air=vec2(uWind,0.);for(int j=0;j<3;j++){float c=uTa[j]*cos(dot(uTm[j].xy,p)+uTm[j].z*tb+uTm[j].w);air+=vec2(c*uTm[j].y,-c*uTm[j].x);}
  float age=max(0.,uT-tb),k=max(.001,uK);vec2 terminal=air+vec2(0.,-uG/k);
  p+=terminal*age+(mix(v0,v1,f)*uInh-terminal)*(1.-exp(-k*age))/k;
  if(uMir>1.5)p.y=-p.y;
  if(uUseXf>.5){vec2 d=p-uXf.xy;p=vec2(d.x*uXf.z-d.y*uXf.w,d.x*uXf.w+d.y*uXf.z);}
  return p;
}
void main(){
  int s=gl_InstanceID;vec4 inf=texelFetch(uInfo,ivec2(0,s),0);
  float variation=mix(1.-uJitter,1.+uJitter,rnd(s,43u));
  float life=max(.02,uLife*variation),hot=max(.01,uHot*mix(.72,1.28,rnd(s,71u)));
  hot*=1.+uHotGrowth*smoothstep(3.,7.,uT-inf.x);
  float lo=max(inf.x,uT-life),hi=min(uT,inf.y);
  if(inf.z<=0.||hi<=lo){gl_Position=vec4(2.,2.,2.,1.);vAcross=0.;vSigma=1.;vFlux=0.;vSourceY=0.;return;}
  // Triangle order 0-, 1-, 0+, 0+, 1-, 1+. Nonlinear sampling resolves the hot tip.
  int seg=gl_VertexID/6,c=gl_VertexID%6;
  int endp=(c==1||c==4||c==5)?1:0;float side=(c==2||c==3||c==5)?1.:-1.;
  float u=float(seg+endp)/float(uSegments),tb=hi-(hi-lo)*u*u;
  float age=max(0.,uT-tb),x=age/life;
  float eps=min(.005,max(.0001,(hi-lo)/float(uSegments)*.1));
  vec2 q=location(s,tb),a=location(s,max(inf.x,tb-eps)),b=location(s,min(hi,tb+eps));
  vec2 dp=(b-a)*uPP;float dl=length(dp);vec2 tangent=dl>1e-6?dp/dl:vec2(0.,1.);
  vec2 normal=vec2(-tangent.y,tangent.x);
  float sigmaWorld=.5*uWidth*mix(.78,1.22,rnd(s,83u))*mix(1.,.3,pow(clamp(x,0.,1.),.6));
  if(uBody==0.)sigmaWorld*=mix(.15,1.,exp(-.5*pow(age/hot,2.)));
  float sigmaPixels=max(.33,sigmaWorld*length(uPP*vec2(normal.y,normal.x)));
  float span=3.5*sigmaPixels+1.;
  vSourceY=uMir>1.5?-q.y:q.y;vec2 pixel=q*uPP+normal*side*span;
  gl_Position=vec4((pixel/uPP-uView.xy)/uView.zw,0.,1.);
  // Cool old material gradually. The hot front and warm body have independent
  // lifetimes. Stable modulation belongs to emission time, never frame number.
  float illumination=mix(1.,1.-smoothstep(inf.y-.6,inf.y+.35,uT),uFollow);
  float light=uHotGain*exp(-pow(age/hot,2.4))+uBody*exp(-age/max(.05,life*.65))*illumination;
  light*=1.-smoothstep(.72,1.,x);
  light*=mix(.72,1.28,rnd(s,93u))*(1.+.06*sin(tb*17.+rnd(s,101u)*6.283));
  float rate=max(0.,inf.z+2.*inf.w*(tb-inf.x));
  float speed=length(b-a)/max(.00001,min(hi,tb+eps)-max(inf.x,tb-eps));
  // Radiance model: weak projected-speed compensation avoids an edge-on tail
  // becoming eight times brighter solely because it points toward the camera.
  // This is an artistic radiance response, not an energy-conserving flame model.
  float density=12.*rate/max(1.,inf.z)*pow(clamp(speed/35.,.3,3.),-.25);
  float retire=1.-smoothstep(max(inf.x,inf.y-.45),inf.y,tb);
  vFlux=light*density*uBright*retire;vAcross=side*span;vSigma=sigmaPixels;
}`;
const FS_FILAMENT=HDR+`in float vAcross,vSigma,vFlux,vSourceY;uniform vec4 uChan;uniform vec2 uPP;uniform float uW,uRefl,uMir;out vec4 o;
float erf1(float x){float sg=sign(x);x=abs(x);float t=1./(1.+.3275911*x);return sg*(1.-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*exp(-x*x));}
void main(){if(uMir>.5&&vSourceY<0.)discard;float g=.5*(erf1((vAcross+.5)/(1.41421356*vSigma))-erf1((vAcross-.5)/(1.41421356*vSigma)));o=uChan*(max(0.,g)*vFlux*sqrt(uPP.x*uPP.y)*uW*(uMir>1.5?uRefl:1.));}`;
PR.filament=compile(VS_FILAMENT,FS_FILAMENT);
function drawFilaments(tr,t,view,ppm,chan,w,opt={}){
  const P=tr.P,pr=PR.filament;gl.useProgram(pr.p);
  for(const [i,name,tex]of [[2,'uPos',tr.pos],[3,'uVel',tr.vel],[4,'uInfo',tr.info]]){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(pr.u[name],i);}
  gl.activeTexture(gl.TEXTURE0);
  const n=clamp(Math.round(P.filamentSegments||112),24,256);
  for(const [name,value]of Object.entries({uT:t,uDT:tr.dt,uLife:P.filamentLife,uHot:P.filamentHot,uHotGain:P.filamentHotGain??1,uHotGrowth:P.filamentHotGrowth||0,uBody:P.filamentBody,uFollow:P.filamentFollowBurn||0,uWidth:P.filamentWidth,uJitter:P.filamentJitter,uInh:P.sparkInherit,uK:P.sparkDrag,uG:G*P.sparkGrav,uBright:P.sparkBright,uWind:P.wind||0,uUseXf:opt.xf?1:0,uW:w,uRefl:P.waterRefl||0}))gl.uniform1f(pr.u[name],value);
  gl.uniform1i(pr.u.uNs,tr.Ns);gl.uniform1i(pr.u.uSegments,n);gl.uniform1i(pr.u.uSeed,P.seed|0);
  gl.uniform2f(pr.u.uPP,ppm,PPMY||ppm);gl.uniform4fv(pr.u.uView,view);gl.uniform4fv(pr.u.uXf,opt.xf||[0,0,1,0]);gl.uniform4fv(pr.u.uChan,chan);
  setAirUniforms(pr,P);gl.bindVertexArray(emptyVAO);
  gl.uniform1f(pr.u.uMir,P.waterRefl>0&&!opt.xf?1:0);gl.drawArraysInstanced(gl.TRIANGLES,0,n*6,tr.nStars);
  if(P.waterRefl>0&&!opt.xf){gl.uniform1f(pr.u.uMir,2);gl.drawArraysInstanced(gl.TRIANGLES,0,n*6,tr.nStars);}
}
