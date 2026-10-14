/* 有限光圈散焦核：圆形/六边形，柔边近似源形状卷积；保留光量，不用全屏模糊。 */
const cameraGraphProgram=lazyProgram(()=>compile(`#version 300 es
precision highp float;
layout(location=0) in vec2 corner;layout(location=1) in vec4 ends;layout(location=2) in vec4 radiance;layout(location=3) in vec4 shape;
uniform vec4 uView;uniform float uPPM,uW;
out vec2 uv;flat out vec4 rr;flat out vec4 sh;flat out float len;
void main(){vec2 a=ends.xy*uPPM,b=ends.zw*uPPM,d=b-a;len=length(d);vec2 dir=len>1e-6?d/len:vec2(1.,0.),normal=vec2(-dir.y,dir.x);
 float radius=radiance.x*uPPM,coc=shape.w*uPPM,reach=coc+4.*max(radius,.35)+2.;
 vec2 p=vec2(mix(-reach,len+reach,corner.x),corner.y*reach);vec2 xy=a+dir*p.x+normal*p.y;
 gl_Position=vec4((xy/uPPM-uView.xy)/uView.zw,0.,1.);uv=p;rr=vec4(radius,radius,radiance.zw*uW);sh=shape;sh.w=coc;}
`, `#version 300 es
precision highp float;
in vec2 uv;flat in vec4 rr;flat in vec4 sh;flat in float len;
uniform int uBlades;out vec4 color;
float erf(float x){float sg=sign(x);x=abs(x);float t=1./(1.+.3275911*x);return sg*(1.-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*exp(-x*x));}
void main(){
 float x=uv.x-clamp(uv.x,0.,len),d=length(vec2(x,uv.y)),r=max(rr.x,1e-6),s=max(r,.28),c=sh.w;
 // 高斯亮核在小于纹素时按面积归一化；源碎片保持随机边缘与朝向。
 float g=exp(-.5*d*d/(s*s)),sourceArea=6.2831853*r*r+2.5066283*r*len,gaussArea=6.2831853*s*s+2.5066283*s*len;
 if(sh.x>1.5){float ang=atan(uv.y,uv.x-len*.5)+sh.z;float edge=.75+.18*cos(5.*ang+sh.z)+.07*cos(3.*ang);g*=1.-smoothstep(s*edge,s*edge+max(.4,fwidth(d)),abs(uv.y));}
 float core=g*sourceArea/max(gaussArea,1e-9);
 if(c>0.){
  float sd=d-c,polyArea=3.14159265;
  if(uBlades==6){vec2 v=vec2(x,uv.y);float plane=-1e10;for(int k=0;k<6;k++){float a=float(k)*1.04719755;plane=max(plane,dot(v,vec2(cos(a),sin(a))));}sd=plane-c*.8660254;polyArea=2.59807621;}
  float soft=sqrt(s*s+.12),disk=.5*(1.-erf(sd/(1.41421356*soft)));
  float area=polyArea*c*c+2.*c*len+3.14159265*soft*soft;
  float bokeh=disk*sourceArea/max(area,1e-9),blend=smoothstep(.5,2.,c/s);
  // 小散焦连续增宽；大散焦显露光圈轮廓，不把所有粒子都改成圆点。
  float sr=sqrt(s*s+c*c*.25),small=exp(-.5*d*d/(sr*sr))*sourceArea/(6.2831853*sr*sr+2.5066283*sr*len);
  core=mix(small,bokeh,blend);
 }
 color=vec4(rr.z*core,0.,0.,0.);
}`));
let cameraGraphVAO=null,cameraGraphBuffer=null;
function cameraGraphInit(){if(cameraGraphVAO)return;cameraGraphVAO=gl.createVertexArray();gl.bindVertexArray(cameraGraphVAO);const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,-1,1,-1,0,1,0,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);cameraGraphBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,cameraGraphBuffer);for(const [i,o]of [[1,0],[2,4],[3,8]]){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,4,gl.FLOAT,false,48,o*4);gl.vertexAttribDivisor(i,1);}gl.bindVertexArray(null);}
function drawCameraGraph(graph,P,time,view,ppm,weight,only){
 cameraGraphInit();const settings=LIVE_VIEW?{...P,cameraQuality:'fast'}:P,g=SparkGraph.cameraGeometry(graph,time,settings,Math.max(ppm,PPMY||ppm),only),pr=cameraGraphProgram;
 gl.useProgram(pr.p);gl.bindVertexArray(cameraGraphVAO);gl.bindBuffer(gl.ARRAY_BUFFER,cameraGraphBuffer);gl.bufferData(gl.ARRAY_BUFFER,g.data,gl.DYNAMIC_DRAW);gl.uniform4fv(pr.u.uView,view);gl.uniform1f(pr.u.uPPM,ppm);gl.uniform1f(pr.u.uW,weight);gl.uniform1i(pr.u.uBlades,+P.cameraBlades||0);gl.drawArraysInstanced(gl.TRIANGLES,0,6,g.data.length/12);return g.data.length/12;
}
