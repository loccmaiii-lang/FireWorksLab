/* 三维管状密度沿 Y 射线积分；内部消光，火舌间遵循烘焙器的发光相加约定。 */
const flameProgram=lazyProgram(()=>compile(`#version 300 es
precision highp float;
layout(location=0) in vec2 corner;
layout(location=1) in vec4 k0;layout(location=2) in vec4 k1;layout(location=3) in vec4 k2;layout(location=4) in vec4 k3;
layout(location=5) in vec4 optical;layout(location=6) in vec4 noiseSetting;layout(location=7) in vec4 floorSetting;
uniform vec4 uView;
out vec2 world;flat out vec4 a;flat out vec4 b;flat out vec4 c;flat out vec4 d;
flat out vec4 opt;flat out vec4 ns;flat out vec4 fs;flat out vec2 depthRange;
void main(){
 a=k0;b=k1;c=k2;d=k3;opt=optical;ns=noiseSetting;fs=floorSetting;
 vec3 lo=min(min(k0.xyz-k0.w,k1.xyz-k1.w),min(k2.xyz-k2.w,k3.xyz-k3.w));
 vec3 hi=max(max(k0.xyz+k0.w,k1.xyz+k1.w),max(k2.xyz+k2.w,k3.xyz+k3.w));
 lo.xz-=floorSetting.w;hi.xz+=floorSetting.w;
 // 卷曲是米，不随纵深比例缩小；薄火焰也必须覆盖完整扭曲范围。
 float r=max(max(k0.w,k1.w),max(k2.w,k3.w))*opt.z+floorSetting.w;
 depthRange=vec2(min(min(k0.y,k1.y),min(k2.y,k3.y))-r,max(max(k0.y,k1.y),max(k2.y,k3.y))+r);
 world=mix(lo.xz,hi.xz,corner);gl_Position=vec4((world-uView.xy)/uView.zw,0.,1.);
}`,`#version 300 es
precision highp float;
in vec2 world;flat in vec4 a;flat in vec4 b;flat in vec4 c;flat in vec4 d;
flat in vec4 opt;flat in vec4 ns;flat in vec4 fs;flat in vec2 depthRange;
uniform float uW;out vec4 color;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float tube(vec3 p,vec4 x,vec4 y){vec3 scale=vec3(1.,1./opt.z,1.),v=(y.xyz-x.xyz)*scale,w=(p-x.xyz)*scale;
 float f=clamp(dot(w,v)/max(dot(v,v),1e-9),0.,1.);return 1.-length(w-v*f)/max(mix(x.w,y.w,f),1e-6);}
void main(){
 if(fs.y>.5&&world.y<fs.x)discard;
 float ds=(depthRange.y-depthRange.x)/fs.z,trans=1.,light=0.;
 for(int i=0;i<64;i++){if(float(i)>=fs.z)break;vec3 p=vec3(world.x,depthRange.x+(float(i)+.5)*ds,world.y);
  vec3 np=(p-vec3(0,0,ns.z))/ns.y+vec3(opt.w*7.13,opt.w*3.27,opt.w*1.91);
  vec3 warped=p+fs.w*vec3(noise3(np*.7+17.3)-.5,noise3(np*.7+41.7)-.5,0.);
  float shape=max(tube(warped,a,b),max(tube(warped,b,c),tube(warped,c,d)));if(shape<=0.)continue;
  float coarse=noise3(np),fine=noise3(np*2.73+4.17);
  float density=max(0.,shape-ns.x*coarse-ns.w*fine*.5);
  density=smoothstep(0.,.28,density);
  float alpha=1.-exp(-density*opt.y*ds);light+=trans*alpha;trans*=1.-alpha;
 }
 color=vec4(light*opt.x*uW,0.,0.,0.);
}`));
let flameVAO=null,flameBuffer=null;
function drawFlameGraph(graph,time,view,weight,only){
 const data=FlameVolume.geometry(graph,time,only);if(!data.length)return 0;
 if(!flameVAO){flameVAO=gl.createVertexArray();gl.bindVertexArray(flameVAO);const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  flameBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,flameBuffer);for(let i=1;i<=7;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,4,gl.FLOAT,false,128,(i-1)*16);gl.vertexAttribDivisor(i,1);}gl.bindVertexArray(null);}
 const pr=flameProgram;gl.useProgram(pr.p);gl.bindVertexArray(flameVAO);gl.bindBuffer(gl.ARRAY_BUFFER,flameBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
 gl.uniform4fv(pr.u.uView,view);gl.uniform1f(pr.u.uW,weight);gl.drawArraysInstanced(gl.TRIANGLES,0,6,data.length/32);return data.length/32;
}
