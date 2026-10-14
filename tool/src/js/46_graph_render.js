/* 接入既有烘焙器的渲染器接口；所有路径共用解析模型和相同线段。 */
const graphProgram=lazyProgram(()=>compile(`#version 300 es
precision highp float;
layout(location=0) in vec2 corner;
layout(location=1) in vec4 ends;
layout(location=2) in vec4 radiance;
layout(location=3) in vec3 shape;
uniform vec4 uView;uniform vec2 uResolution;uniform float uW;
out vec2 uv;out vec4 rr;flat out vec3 sh;flat out float len;
void main(){
 vec2 ppm=uResolution/(2.*uView.zw),a=ends.xy*ppm,b=ends.zw*ppm,d=b-a;
 len=length(d);vec2 dir=len>.00001?d/len:vec2(1.,0.);vec2 normal=vec2(-dir.y,dir.x);
 float r0=radiance.x*ppm.x,r1=radiance.y*ppm.x,rad=max(max(r0,r1),.38)+2.;
 float x=mix(-rad,len+rad,corner.x),y=corner.y*rad;
 vec2 pixel=a+dir*x+normal*y;
 gl_Position=vec4((pixel/ppm-uView.xy)/uView.zw,0.,1.);
 uv=vec2(x,y);rr=vec4(r0,r1,radiance.zw*uW);sh=shape;
}` ,`#version 300 es
precision highp float;
in vec2 uv;in vec4 rr;flat in vec3 sh;flat in float len;
uniform vec4 uChan;out vec4 color;
void main(){
 float f=clamp(uv.x/max(len,.00001),0.,1.),radius=mix(rr.x,rr.y,f),I=mix(rr.z,rr.w,f);
 float dx=uv.x-clamp(uv.x,0.,len),dist=length(vec2(dx,uv.y)),r=max(.38,radius);
 float a=1.-smoothstep(max(0.,r-.7),r+.7,dist);
 if(sh.x<.5&&len>.0001)a*=step(0.,uv.x)*step(uv.x,len);
 if(sh.x>1.5){float ang=atan(uv.y,uv.x-len*.5)+sh.z;float edge=.75+.18*cos(5.*ang+sh.z)+.07*cos(3.*ang);a*=1.-smoothstep(r*edge,r*edge+.7,abs(uv.y));}
 if(sh.x>.5&&sh.x<1.5)a=exp(-2.*dist*dist/(r*r));
 float energy=min(1.,radius/.38);color=uChan*(I*a*energy);}
`));
let graphVAO=null,graphBuffer=null;
function graphInitGL(){if(graphVAO)return;graphVAO=gl.createVertexArray();gl.bindVertexArray(graphVAO);
 const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,-1,1,-1,0,1,0,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
 graphBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,graphBuffer);
 for(const [i,n,o]of [[1,4,0],[2,4,4],[3,3,8]]){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,44,o*4);gl.vertexAttribDivisor(i,1);}gl.bindVertexArray(null);
}
function makeGraphRenderer(P){const graph=SparkGraph.build(P.sparkGraph);graphInitGL();return {
 Tp:graph.recipe.period,slots:graph.all.length,graph,cameraIntegrated:!!(P.cameraMotion||P.cameraDof),
 draw(ts,view,ppm,w){if(this.cameraIntegrated)return drawCameraGraph(graph,P,ts,view,ppm,w,this.solo||(LIVE_VIEW?graphSolo:null));
 if(!window.__graphLegacyFlat)return drawFlatGraph(graph,P,ts,view,ppm,w,this.solo||(LIVE_VIEW?graphSolo:null));     // 4.9.97 V1 / V3：镜头关也走镜头的核（window.__graphLegacyFlat 只给对照检查用，不是参数）
 const g=SparkGraph.geometry(graph,ts,this.solo||(LIVE_VIEW?graphSolo:null)),pr=graphProgram;gl.useProgram(pr.p);gl.bindVertexArray(graphVAO);gl.bindBuffer(gl.ARRAY_BUFFER,graphBuffer);gl.bufferData(gl.ARRAY_BUFFER,g.data,gl.DYNAMIC_DRAW);
 gl.uniform4fv(pr.u.uView,view);gl.uniform2f(pr.u.uResolution,ppm*view[2]*2,(PPMY||ppm)*view[3]*2);gl.uniform1f(pr.u.uW,w);gl.uniform4fv(pr.u.uChan,[1,0,0,0]);gl.drawArraysInstanced(gl.TRIANGLES,0,6,g.data.length/11);return g.data.length/11;},dispose(){}
};}
function graphPlan(P){const b=P.sparkGraph.bounds,pl=loopPlan(P,b,P.sparkGraph.period),F=pl.L.F;
 // 帧号略过整数边界，避免30fps时浮点误差重复/跳帧；末帧保留平台，不越过F。
 pl.keys=F>1?[[0,.02],[(F-1)/F,F-1+.02],[1,F-.01]]:[[0,0],[1,0]];pl.frameTiming='loop-tick-start';return pl;}
async function bakeGraph(P,scale,onProg){const R=makeGraphRenderer(P);try{const b=await bakeFrames(P,scale,onProg,graphPlan(P),R);b.P=P;b.form='loop';b.meta.ground=true;return b;}finally{R.dispose();}}
