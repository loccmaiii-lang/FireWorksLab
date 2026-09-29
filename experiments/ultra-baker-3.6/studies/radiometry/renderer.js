/* V4 colour renderer. Trajectory integration is frozen from the V3 baker.
 * Thermal RGB comes from the official CIE / Planck LUT, never from a brightness Ramp.
 * Temperatures, heat sustain and camera gains are fitted proxies, not measurements.
 * CIE-derived data is CC BY-SA 4.0; see science/LICENSE-CIE.txt.
 */
'use strict';
state.stillBusy=true;state.playing=false;state.dirty=false;
const RAD={ready:false,layers:[],view:null,id:null,canvas,settings:{exposure:1,bloom:.09,shoulder:.72,temperature:0,cooling:1},disabled:[],lut:null};
window.RAD=RAD;
const radVS=VS_FILAMENT
 .replace('out float vAcross,vSigma,vFlux,vSourceY;','out float vAcross,vSigma,vFlux,vSourceY,vAge,vBornAge,vRemaining,vVariation;')
 .replace('vSourceY=0.;return;','vSourceY=0.;vAge=0.;vBornAge=0.;vRemaining=0.;vVariation=1.;return;')
 .replace('vFlux=light*density*uBright*retire;','vAge=age;vBornAge=tb-inf.x;vRemaining=inf.y-tb;vVariation=variation;vFlux=density*uBright*retire;');
const radFS=HDR+`in float vAcross,vSigma,vFlux,vSourceY,vAge,vBornAge,vRemaining,vVariation;
uniform sampler2D uLUT;
uniform vec4 uThermal; // birth T, sustained T, relaxation time, heat sustain duration
uniform vec4 uFuel; // star temperature fall, timescale, end cooling, tail gain
uniform vec2 uPP; uniform float uW,uRefl,uMir,uTemperature,uCooling,uHeatLoss,uHotHold,uAreaTime;
out vec4 o;
float erf1(float x){float sg=sign(x);x=abs(x);float t=1./(1.+.3275911*x);return sg*(1.-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*exp(-x*x));}
vec3 radiance(float T){float u=(clamp(T,800.,6000.)-800.)/10.;int i=int(floor(u));return mix(texelFetch(uLUT,ivec2(i,0),0).rgb,texelFetch(uLUT,ivec2(min(i+1,520),0),0).rgb,fract(u));}
void main(){
 if(uMir>.5&&vSourceY<0.)discard;
 float age=vAge*uCooling/max(.3,vVariation);
 float starFall=uFuel.x*(1.-exp(-vBornAge/max(.05,uFuel.y)));
 float sustain=uThermal.y-starFall+uTemperature;
 float hold=uHotHold*(1.+.4*smoothstep(3.,7.,vBornAge+vAge));
 float T=sustain+(uThermal.x-uThermal.y)*exp(-max(0.,age-hold)/max(.03,uThermal.z))-uHeatLoss*max(0.,age-.5);
 // Finite remaining heat-release budget; after this the particle cools toward air.
 float heatLife=min(uThermal.w,max(.05,vRemaining+.3));
 T=300.+(T-300.)*exp(-max(0.,vAge-heatLife)/max(.03,uFuel.z));
 float g=.5*(erf1((vAcross+.5)/(1.41421356*vSigma))-erf1((vAcross-.5)/(1.41421356*vSigma)));
 float cell=vBornAge*85.,idx=floor(cell),f=smoothstep(0.,1.,fract(cell));
 float a=fract(sin(idx*127.1+vVariation*311.7)*43758.5453),b=fract(sin((idx+1.)*127.1+vVariation*311.7)*43758.5453);
 float grain=.20+1.60*mix(a,b,f);
 float modulation=mix(1.,grain,smoothstep(.12,.7,vAge));
 float area=exp(-vAge/max(.01,uAreaTime));
 o=vec4(radiance(T)*area*max(0.,g)*vFlux*sqrt(uPP.x*uPP.y)*uW*uFuel.w*modulation,0.);
}`;
const radFilament=compile(radVS,radFS);
const radResolve=compile(VS_QUAD,HDR+`in vec2 v_uv;uniform sampler2D uS;uniform int uSS;out vec4 o;
void main(){ivec2 base=ivec2(gl_FragCoord.xy)*uSS;vec3 s=vec3(0.);for(int y=0;y<4;y++){if(y>=uSS)break;for(int x=0;x<4;x++){if(x>=uSS)break;s+=texelFetch(uS,base+ivec2(x,y),0).rgb;}}o=vec4(s/float(uSS*uSS),1.);}`);
const radPost=compile(VS_QUAD,HDR+`in vec2 v_uv;uniform sampler2D uS;uniform float uExposure,uBloom,uShoulder;uniform vec3 uWB;out vec4 o;
vec3 srgb(vec3 x){return mix(12.92*x,1.055*pow(max(x,0.),vec3(1./2.4))-.055,step(vec3(.0031308),x));}
void main(){vec3 c=textureLod(uS,v_uv,0.).rgb;
 c+=uBloom*(.64*textureLod(uS,v_uv,2.).rgb+.28*textureLod(uS,v_uv,4.).rgb+.08*textureLod(uS,v_uv,6.).rgb);
 c=max(c*uWB*uExposure,0.);float peak=max(c.r,max(c.g,c.b));
 // A shared shoulder preserves RGB ratios in the midtones. Above sensor headroom,
 // gradual channel clipping whitens only the highest signals; this is a camera fit.
 vec3 mapped=c/(1.+(1.-uShoulder)*peak);mapped=clamp(mapped,0.,1.);
 o=vec4(srgb(mapped),1.);
}`);
const baseRecipes=structuredClone(STUDY_RECIPES);
// Raw linear head colours are fitted to the video, not attributed to a chemical species.
const configs={
 V14:{wb:[1,1.30,2.20],exposure:1,shoulder:.72,bloom:.12,layers:[
  {from:0,name:'持续燃烧与冷却长尾',p:{burn:7.8,burnJit:3,filamentLife:8,filamentBody:1,filamentWidth:.95,filamentJitter:.25,filamentSegments:224,sparkBright:1,headBright:0,flash:0},thermal:[3900,3200,.50,7.6],fuel:[100,7,.12,.10],heatLoss:20,hotHold:.46,areaTime:1.65},
  {from:2,name:'转色后的粉红星点',p:{headSize:1.25,headBright:1,ignDelay:7.95,ignJit:5,strobeDuty:.36,flash:0},colour:[1,.220,.174],headGain:8.5,pin:.055,halo:.22},
  {from:3,name:'开花闪光与短金芯',p:{filament:1,filamentLife:.65,filamentWidth:.6,filamentBody:1,sparkBright:1,headBright:.15},thermal:[3600,2600,.13,.3],fuel:[0,1,.22,.15],colour:[1,.7,.3],headGain:.8,pin:.04,halo:.1}
 ]},
 V13:{wb:[1,.94,1.9],exposure:1,shoulder:.72,bloom:.10,layers:[
  {from:0,name:'金色子花：新生亮芯 → 橙金长尾',p:{filamentLife:5.8,filamentBody:1,filamentWidth:.50,filamentJitter:.38,filamentSegments:192,sparkBright:1,headBright:.08,subFlash:.08,subStars:90,subScaleJit:28},thermal:[3260,2440,.21,3.7],fuel:[300,.65,.40,.38],heatLoss:35,colour:[1,.72,.018],headGain:.70,pin:.03,halo:.12},
  {from:1,name:'先行金芯',p:{filamentLife:3.8,filamentBody:1,filamentWidth:.48,sparkBright:1,headBright:.08},thermal:[2980,2490,.20,2.3],fuel:[280,.6,.35,.38],heatLoss:30,colour:[1,.38,.04],headGain:.10,pin:.02,halo:.08},
  {from:2,name:'红紫彩芯（视频色度代理）',p:{subDelay:3.43,subBurn:1.35,headSize:.58,headBright:1},colour:[1,.038,.334],headGain:1.8,pin:.025,halo:.15},
  {from:3,name:'蓝紫彩芯（视频色度代理）',p:{subDelay:3.43,subBurn:1.35,headSize:.58,headBright:1},colour:[.55,.246,.526],headGain:1.6,pin:.025,halo:.15},
  {from:4,name:'浅绿彩芯（低样本，暂定）',p:{subDelay:3.5,subBurn:1.30,headSize:.58,headBright:1},colour:[.777,1.064,.371],headGain:.9,pin:.025,halo:.13}
 ]}
};
RAD.configs=configs;
function radBB(T){const u=clamp((T-800)/10,0,520),i=Math.floor(u),f=u-i;return RAD.lut.rgb[i].map((v,k)=>v*(1-f)+RAD.lut.rgb[Math.min(520,i+1)][k]*f);}
function radDrawTail(l,t,view,ppm,w){
 const tr=l.track,P=l.P,pr=radFilament;gl.useProgram(pr.p);
 for(const [i,name,tex]of [[2,'uPos',tr.pos],[3,'uVel',tr.vel],[4,'uInfo',tr.info],[5,'uLUT',RAD.lutTex]]){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(pr.u[name],i);}
 gl.activeTexture(gl.TEXTURE0);
 for(const [name,value]of Object.entries({uT:t,uDT:tr.dt,uLife:P.filamentLife,uHot:P.filamentHot,uHotGain:1,uHotGrowth:0,uBody:1,uFollow:0,uWidth:P.filamentWidth,uJitter:P.filamentJitter,uInh:P.sparkInherit,uK:P.sparkDrag,uG:G*P.sparkGrav,uBright:P.sparkBright,uUseXf:0,uW:w,uRefl:0,uTemperature:RAD.settings.temperature,uCooling:RAD.settings.cooling,uHeatLoss:l.heatLoss||0,uHotHold:l.hotHold||0,uAreaTime:l.areaTime||1000}))gl.uniform1f(pr.u[name]??null,value);
 gl.uniform1i(pr.u.uNs,tr.Ns);gl.uniform1i(pr.u.uSegments,P.filamentSegments||160);gl.uniform1i(pr.u.uSeed,P.seed|0);
 gl.uniform2f(pr.u.uPP,ppm,ppm);gl.uniform4fv(pr.u.uView,view);gl.uniform4fv(pr.u.uXf,[0,0,1,0]);gl.uniform1f(pr.u.uMir,0);
 gl.uniform4fv(pr.u.uThermal,l.thermal);gl.uniform4fv(pr.u.uFuel,l.fuel);setAirUniforms(pr,P);gl.bindVertexArray(emptyVAO);gl.drawArraysInstanced(gl.TRIANGLES,0,(P.filamentSegments||160)*6,tr.nStars);
}
function radDrawHeads(l,t,view,ppm,w){
 if(!l.colour)return;
 if(t<l.last-1e-6)l.sim=new Sim(l.P);l.last=t;
 while(l.sim.t<t-1e-9)l.sim.step(H_STEP);
 const [n]=l.sim.gather(bufH,bufT);if(!n)return;
 const original=bufH.slice(0,n*4),colour=l.colour;setParticleProfile({...l.P,ptKernel:1});
 drawPoints(original,n,view,ppm,[...colour,0],w*l.headGain);
 // Point-spread decomposition follows the locally approved C/D colour principle.
 // Gains here are integrated energy fractions, not peak Gaussian amplitudes.
 for(let i=0;i<n;i++)bufH[i*4+3]=original[i*4+3]*.32;
 drawPoints(bufH,n,view,ppm,[1,1,1,0],w*l.headGain*(l.pin||0));
 for(let i=0;i<n;i++)bufH[i*4+3]=original[i*4+3]*3.5;
 drawPoints(bufH,n,view,ppm,[...colour,0],w*l.headGain*(l.halo||0));
}
RAD.load=async function(id){
 if(!RAD.lut){RAD.lut=await(await fetch('science/blackbody.json')).json();RAD.lutTex=floatTex(521,1,new Float32Array(RAD.lut.rgb.flatMap(c=>[...c,0])));}
 for(const l of RAD.layers)disposeTrack(l.track);
 RAD.layers=[];RAD.id=id;RAD.disabled=[];
 const c=configs[id];RAD.settings={exposure:c.exposure,bloom:c.bloom,shoulder:c.shoulder,temperature:0,cooling:1};
 // Keep V3's full-sequence view for a fair geometry comparison.
 RAD.view=studyView(id);RAD.duration=baseRecipes[id].duration;
 for(const cfg of c.layers){const src=baseRecipes[id].layers[cfg.from],d=defaultsFor(src.base),P=derive({...d.P,...src.p,...cfg.p,engine:'gpu',filament:cfg.thermal?1:0});
  const l={...cfg,P,track:cfg.thermal?buildTrack(P):null,sim:new Sim(P),last:-Infinity};RAD.layers.push(l);await nextTick();}
 RAD.ready=true;return {id,view:RAD.view,duration:RAD.duration,layers:RAD.layers.map(l=>({name:l.name,P:l.P,thermal:l.thermal,fuel:l.fuel,colour:l.colour})),camera:c};
};
RAD.render=function(t,{size=1024,ss=2,samples=3,shutter=1/60,view=RAD.view}={}){
 if(!RAD.ready)return;size=Math.min(4096,Math.max(128,size|0));ss=Math.min(4,Math.max(1,ss|0));samples=Math.max(1,Math.min(16,samples|0));
 gl.activeTexture(gl.TEXTURE0);if(!RAD.high||RAD.high.w!==size*ss){RAD.high?.dispose();RAD.high=new Target(size*ss,size*ss,gl.RGBA16F);}
 if(!RAD.low||RAD.low.w!==size){RAD.low?.dispose();RAD.low=new Target(size,size,gl.RGBA16F,true);}
 canvas.width=size;canvas.height=size;RAD.high.clear();RAD.high.bind();PPMY=size*ss/(2*view[3]);additive(true);
 for(let j=0;j<samples;j++){const ts=Math.max(0,t+((j+.5)/samples-.5)*shutter),ppm=size*ss/(2*view[2]);
  RAD.layers.forEach((l,i)=>{if(RAD.disabled.includes(i))return;if(l.thermal)radDrawTail(l,ts,view,ppm,1/samples);radDrawHeads(l,ts,view,ppm,1/samples);});}
 additive(false);RAD.low.bind();gl.useProgram(radResolve.p);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,RAD.high.tex);gl.uniform1i(radResolve.u.uS,0);gl.uniform1i(radResolve.u.uSS,ss);drawQuad();
 gl.bindTexture(gl.TEXTURE_2D,RAD.low.tex);gl.generateMipmap(gl.TEXTURE_2D);
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,size,size);gl.useProgram(radPost.p);gl.uniform1i(radPost.u.uS,0);
 gl.uniform3fv(radPost.u.uWB,configs[RAD.id].wb);gl.uniform1f(radPost.u.uExposure,RAD.settings.exposure);gl.uniform1f(radPost.u.uBloom,RAD.settings.bloom);gl.uniform1f(radPost.u.uShoulder,RAD.settings.shoulder);drawQuad();
 return canvas;
};
RAD.capture=(t,opt)=>{RAD.render(t,opt);return canvas.toDataURL('image/png');};
RAD.linear=()=>{RAD.low.bind();const a=new Float32Array(RAD.low.w*RAD.low.h*4);gl.readPixels(0,0,RAD.low.w,RAD.low.h,gl.RGBA,gl.FLOAT,a);return a;};
RAD.bb=radBB;
// Lossless transport of HALF RGB through a byte PNG (two RGBA pixels per HDR pixel).
// This is an intermediate container, not a viewable colour texture. Never use canvas
// encoding here: premultiplication would corrupt the bytes stored in alpha.
const radHalfPack=compile(VS_QUAD,HDR+`in vec2 v_uv;uniform sampler2D uS;out vec4 o;
void main(){ivec2 q=ivec2(gl_FragCoord.xy);vec3 c=texelFetch(uS,ivec2(q.x/2,q.y),0).rgb;
 uint h=(q.x%2==0)?packHalf2x16(c.rg):packHalf2x16(vec2(c.b,0.));
 o=vec4(float(h&255u),float((h>>8u)&255u),float((h>>16u)&255u),float((h>>24u)&255u))/255.;}`);
RAD.packedHDR=async()=>{
 const n=RAD.low.w;gl.activeTexture(gl.TEXTURE0);if(!RAD.packed||RAD.packed.w!==n*2){RAD.packed?.dispose();RAD.packed=new Target(n*2,n,gl.RGBA8);}
 const dither=gl.isEnabled(gl.DITHER);gl.disable(gl.DITHER);RAD.packed.bind();additive(false);gl.useProgram(radHalfPack.p);gl.bindTexture(gl.TEXTURE_2D,RAD.low.tex);gl.uniform1i(radHalfPack.u.uS,0);drawQuad();
 const blob=await encodePNG(readRGBA8(RAD.packed),n*2,n);if(dither)gl.enable(gl.DITHER);
 const a=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s);
};
