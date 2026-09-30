import * as THREE from '../vendor/three.module.js';
import * as S from './generated/shaders.js';
import { Sim, H_STEP, G, tintAt, hexToLin, turbModes, familyOf, trailWaves, trailPops, trailPeriod } from './generated/core.js';
import { emitterInfo } from './tracks.js';

const stripVersion = s => s.replace(/^#version 300 es\s*/, '');
const U = values => Object.fromEntries(Object.entries(values).map(([k,v]) => [k,{ value:v }]));
function material(vs, fs, uniforms, additive = true) {
  return new THREE.RawShaderMaterial({
    vertexShader: stripVersion(vs), fragmentShader: stripVersion(fs), uniforms: U(uniforms),
    glslVersion: THREE.GLSL3, depthTest: false, depthWrite: false, transparent: additive,
    blending: additive ? THREE.CustomBlending : THREE.NoBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
    toneMapped: false
  });
}
function geometry(count) {
  const g = new THREE.InstancedBufferGeometry();
  const corners=[-1,-1,1,-1,-1,1,-1,1,1,-1,1,1];
  g.setAttribute('aCorner',new THREE.BufferAttribute(new Float32Array(corners),2));
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(18),3));
  g.instanceCount=count;
  return g;
}
function points(count, mat) {
  const p = new THREE.Mesh(geometry(count), mat); p.frustumCulled = false; return p;
}
function particleMaterial(vs,fs,uniforms) {
  // Real subpixel coverage: expand a billboard around the *unsnapped* centre.
  // WebGL POINTS rasterization snaps their centre and caps their footprint.
  vs=vs.replace(/layout\(location=\d\) /g,'').replace(/gl_VertexID/g,'gl_InstanceID')
    .replace('out float vI;', 'in vec2 aCorner;uniform vec2 uCanvas;uniform float uMinSigma;out vec2 vOffset;out float vI;')
    .replace(/vec2\(0?\.55\)/g,'vec2(uMinSigma)')
    .replace(/gl_PointSize=ps;/g,'gl_Position.xy+=aCorner*ps/uCanvas;vOffset=aCorner*ps*.5;');
  fs=fs.replace('in float vI;', 'in vec2 vOffset;in float vI;')
    .replace('(gl_PointCoord-.5)*vPS','vOffset')
    .replace('length(gl_PointCoord-.5)*2.','length(vOffset/vPS)*2.');
  return material(vs,fs,{...uniforms,uCanvas:new THREE.Vector2(1,1),uMinSigma:.15});
}
function tex(data, w, h) {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t;
}
function target(w,h, type = THREE.HalfFloatType) {
  return new THREE.WebGLRenderTarget(w,h,{type,format:THREE.RGBAFormat,
    minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false,
    stencilBuffer:false,colorSpace:THREE.NoColorSpace,generateMipmaps:false});
}
const FULL_VS = `precision highp float;
in vec3 position; out vec2 v_uv;
void main(){v_uv=position.xy*.5+.5;gl_Position=vec4(position,1.);}`;
const POST_FS = `precision highp float; precision highp int;
in vec2 v_uv; uniform sampler2D uS; uniform int uSS; uniform float uExposure,uBloom;
uniform bool uLinear; out vec4 o;
vec3 sampleBox(ivec2 base){vec3 sum=vec3(0.);
 for(int y=0;y<4;y++){if(y>=uSS)break;for(int x=0;x<4;x++){if(x>=uSS)break;
 sum+=texelFetch(uS,base+ivec2(x,y),0).rgb;}}return sum/float(uSS*uSS);}
vec3 srgb(vec3 c){return mix(12.92*c,1.055*pow(max(c,0.),vec3(1./2.4))-.055,step(vec3(.0031308),c));}
void main(){ivec2 sz=textureSize(uS,0);ivec2 base=ivec2(gl_FragCoord.xy)*uSS;
 vec3 c=sampleBox(base);
 // Optical halo is explicit and off by default; never used as antialiasing.
 if(uBloom>0.){vec3 b=vec3(0.);for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++)
 b+=texelFetch(uS,clamp(base+ivec2(x,y)*uSS*5,ivec2(0),sz-1),0).rgb/25.;c+=b*uBloom;}
 o=vec4(uLinear?max(c,0.):srgb(1.-exp(-max(c,0.)*uExposure)),1.);
}`;
const ENCODE_FS = `precision highp float; precision highp int;
in vec2 v_uv;uniform sampler2D uS;uniform int uSS;uniform float uEH,uET,uGamma,uPart;out vec4 o;
void main(){ivec2 base=ivec2(gl_FragCoord.xy)*uSS;vec2 s=vec2(0.);
for(int y=0;y<4;y++){if(y>=uSS)break;for(int x=0;x<4;x++){if(x>=uSS)break;s+=texelFetch(uS,base+ivec2(x,y),0).rg;}}
s=max(s/float(uSS*uSS),0.);float v=uPart<.5?s.x*uEH+s.y*uET:(uPart<1.5?s.x*uEH:s.y*uET);
o=vec4(pow(1.-exp(-v),1./uGamma));}`;
const common = () => ({uView:new THREE.Vector4(),uXf:new THREE.Vector4(0,0,1,0),
  uPPM:1,uPPMY:1,uMax:1024,uUseXf:0,uChan:new THREE.Vector4(1,0,0,0),uW:1,
  uKernel:1,uCore:.25,uSpan:6});
const v3 = a => new THREE.Vector3(...a), v4 = a => new THREE.Vector4(...a);
const set = (mat, values) => {
  for(const [name,value] of Object.entries(values)) {
    if(mat.uniforms[name]) mat.uniforms[name].value=value;
  }
};

export class UltraRenderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,premultipliedAlpha:false,powerPreference:'high-performance'});
    this.renderer.autoClear = false; this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    const gl=this.renderer.getContext();
    if(!gl.getExtension('EXT_color_buffer_float')) throw new Error('需要支持浮点 WebGL2 的 Chrome / Edge。');
    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.maxPointSize = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1];
    this.camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2,2),material(FULL_VS,POST_FS,{}));
    this.quad.frustumCulled=false;this.screenScene=new THREE.Scene();this.screenScene.add(this.quad);
    this.shade = material(S.VS_QUAD.replace('layout(location=0) in vec2 a;', 'in vec3 position;')
      .replace('v_uv=a;', 'vec2 a=position.xy*.5+.5;v_uv=a;'),S.FS_RGMAT,{
      uS:null,uEH:1,uET:1,uG:1,uComb:1,uHI:1,uTI:1,uK:4,
      uTint:new THREE.Vector3(1,1,1),uR0:new THREE.Vector3(),uR1:new THREE.Vector3(),
      uR2:new THREE.Vector3(),uR3:new THREE.Vector3()
    });
    this.post = material(FULL_VS,POST_FS,{uS:null,uSS:1,uExposure:1,uBloom:0,uLinear:false},false);
    this.encoder = material(FULL_VS,ENCODE_FS,{uS:null,uSS:1,uEH:1,uET:1,uGamma:1,uPart:0},false);
    this.layers=[];this.workers=new Set();this.generation=0;this.busy=false;
  }
  async track(P) {
    const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
    this.workers.add(worker);
    return new Promise((resolve,reject)=>{
      const close=()=>{worker.terminate();this.workers.delete(worker);};
      worker.onmessage=({data})=>{close();if(data.error)reject(new Error(data.error));else resolve(data);};
      worker.onerror=e=>{close();reject(new Error(e.message));};
      worker.reject=reject;
      worker.postMessage({P,maxTextureSize:this.maxTextureSize});
    });
  }
  async load(recipe,onProgress=()=>{}) {
    const generation=++this.generation;this.disposeLayers();this.recipe=structuredClone(recipe);
    for(const spec of recipe.layers) {
      const P={...spec.P,engine:'gpu'}, layer={...spec,P,sim:new Sim(P),last:-Infinity,scene:new THREE.Scene(),objects:[],textures:[]};
      if(P.form==='trail') this.setupTrail(layer);
      else if(familyOf(P.type)==='ground') this.setupGround(layer);
      else {
        onProgress('生成 '+spec.name+' 的 480 Hz 轨迹…');
        const {track,bounds}=await this.track(P);
        if(generation!==this.generation)return false;
        layer.bounds=bounds;this.setupAerial(layer,track);
      }
      this.setupHeads(layer);this.layers.push(layer);
    }
    return true;
  }
  setupHeads(l) {
    const g=geometry(0), data=new Float32Array(30000*4);
    const buffer=new THREE.InstancedInterleavedBuffer(data,4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aP',new THREE.InterleavedBufferAttribute(buffer,2,0));
    g.setAttribute('aI',new THREE.InterleavedBufferAttribute(buffer,1,2));
    g.setAttribute('aS',new THREE.InterleavedBufferAttribute(buffer,1,3));
    const m=particleMaterial(S.VS_PTS,S.FS_PTS,common());
    l.head=new THREE.Mesh(g,m);l.head.frustumCulled=false;
    l.headBuffer=buffer;l.headData=data;l.dummyTail=new Float32Array(4);
    l.scene.add(l.head);l.objects.push(l.head);
  }
  setupAerial(l,tr) {
    l.track=tr;const pos=tex(tr.positions,tr.Ns,tr.nStars),vel=tex(tr.velocities,tr.Ns,tr.nStars),info=tex(tr.info,1,tr.nStars);
    l.textures.push(pos,vel,info);
    const P=l.P, modes=P.turb>0?turbModes(P):Array.from({length:3},()=>[0,0,0,0,0]);
    const u={...common(),uPos:pos,uVel:vel,uInfo:info,uT:0,uDT:tr.dt,uM:tr.M,uNs:tr.Ns,uSeed:P.seed|0,
      uTw:0,uBr:Math.round(P.branch||0),uInh:P.sparkInherit,uSpread:P.sparkSpread,uLife:P.sparkLife,
      uK:P.sparkDrag,uG:G*P.sparkGrav,uT0:P.T0,uCool:P.cooling,uTwk:P.twinkle,uBright:P.sparkBright,
      uSize:P.sparkSize,uGlit:P.glitter||0,uGlitD:P.glitterDelay||.25,uBrAt:P.branchAt||.5,
      uMir:P.waterRefl>0?1:0,uRefl:P.waterRefl||0,uWind:P.wind||0,uTm:modes.map(a=>v4(a.slice(0,4))),uTa:modes.map(a=>a[4])};
    u.uChan=v4([0,1,0,0]);
    // In experimental ember mode each emitted particle fades on its own clock.
    const emberVS=S.VS_SPK.replace('if(I<=0.){', 'I*=1.-smoothstep(.72,1.,age/life);if(I<=0.){');
    l.spark=points(tr.nStars*tr.M*(1+u.uBr),particleMaterial(S.VS_SPK,S.FS_PTS,u));
    l.emberMaterial=particleMaterial(emberVS,S.FS_PTS,{...u});
    l.originalSpark=l.spark.material;l.scene.add(l.spark);l.objects.push(l.spark);
    if(P.waterRefl>0) {
      l.reflectedSpark=points(tr.nStars*tr.M*(1+u.uBr),particleMaterial(S.VS_SPK,S.FS_PTS,{...u,uMir:2}));
      l.scene.add(l.reflectedSpark);l.objects.push(l.reflectedSpark);
    }
    if(P.filament) {
      const g=new THREE.InstancedBufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array((P.filamentSegments||160)*6*3),3));
      g.instanceCount=tr.nStars;
      const fm=material(S.VS_FILAMENT,S.FS_FILAMENT,{uPos:pos,uVel:vel,uInfo:info,uNs:tr.Ns,
        uSegments:P.filamentSegments||160,uSeed:P.seed|0,uT:0,uDT:tr.dt,uLife:P.filamentLife,
        uHot:P.filamentHot,uHotGain:P.filamentHotGain??1,uHotGrowth:P.filamentHotGrowth||0,
        uBody:P.filamentBody,uFollow:P.filamentFollowBurn||0,uWidth:P.filamentWidth,uJitter:P.filamentJitter,
        uInh:P.sparkInherit,uK:P.sparkDrag,uG:G*P.sparkGrav,uBright:P.sparkBright,uWind:P.wind||0,
        uView:v4([0,0,1,1]),uXf:v4([0,0,1,0]),uPP:new THREE.Vector2(1,1),uUseXf:0,uMir:0,
        uTm:u.uTm,uTa:u.uTa,uChan:v4([0,1,0,0]),uW:1,uRefl:P.waterRefl||0});
      // Ultra's strip triangles use clockwise winding and raw GL disabled
      // face culling. Three's default FrontSide would silently remove all tails.
      fm.side=THREE.DoubleSide;fm.forceSinglePass=true;
      l.filament=new THREE.Mesh(g,fm);l.filament.frustumCulled=false;l.scene.add(l.filament);l.objects.push(l.filament);
    }
  }
  setupGround(l) {
    const P=l.P,E=emitterInfo(P);l.emitter=E;
    const src=tex(E.source,Math.max(1,E.nsrc),1);l.textures.push(src);
    const u={...common(),uSrc:src,uT:0,uMode:E.mode,uNsrc:E.nsrc,uSeed:P.seed|0,uTw:0,
      uShot:E.shot||1,uNshot:E.nshot||1,uShotSpd:P.shotSpeed,uFan:P.fanAngle*Math.PI/180,
      uCBurn:P.cometBurn,uCK:E.ck||.3,uGH:P.groundH,uSpacing:P.spacing,uWR:P.wheelR,uOmega:E.omega,
      uRate:E.rate,uMp:E.Mp,uMw:E.Mw,uLife:P.sparkLife,uK:P.sparkDrag,uG:G*P.sparkGrav,
      uSpread:P.sparkSpread,uInh:P.sparkInherit,uT0:P.T0,uCool:P.cooling,uTwk:P.twinkle,
      uBright:P.sparkBright,uSize:P.sparkSize,uJet:P.jetSpeed,uCone:P.jetCone*Math.PI/180,uFV:v3([0,0,0]),
      uHead:P.headSize,uHI:P.headBright,uFlick:P.flicker,uSS:P.subSpeed,uSB:P.subBurn,uNb:Math.round(P.burstStars||0)};
    l.groundTail=points(E.total,particleMaterial(S.VS_EMIT,S.FS_PTS,{...u,uChan:v4([0,1,0,0])}));
    l.groundHead=points(E.heads,particleMaterial(S.VS_EHEAD,S.FS_PTS,{...u,uChan:v4([1,0,0,0])}));
    l.scene.add(l.groundTail,l.groundHead);l.objects.push(l.groundTail,l.groundHead);
  }
  setupTrail(l) {
    const P=l.P,waves=trailWaves(P).map(v3),Tp=trailPeriod(P);
    l.pops=trailPops(P);l.Tp=Tp;
    for(const q of l.pops) {
      const m=particleMaterial(S.VS_TRAIL,S.FS_PTS,{...common(),uT:0,uStop:-1,uFadeK:1,uAnchorY:0,
        uV:P.trV,uTp:Tp,uRate:q.rate,uLife:q.life,uInh:P.trInh,uSpread:q.spread,uK:P.trDrag,
        uG:G*P.trGrav,uT0:q.T0,uCool:q.cool,uBright:q.bright,uSize:q.size,uWhisk:q.whisk?1:0,
        uIgn:P.trIgnite||0,uLag:P.trTwistLag??.35,uStreak:0,uMp:q.Mp,uSeed:P.seed|0,uPop:q.salt,
        uWave:waves,uBot:new THREE.Vector2(),uFadeEnd:new THREE.Vector2(),uChan:v4([0,1,0,0])});
      const p=points(q.Mw,m);l.scene.add(p);l.objects.push(p);
    }
  }
  prepare(l,t,view,w,h,weight=1,model='original',shutter=0) {
    const P=l.P,ppm=w/(2*view[2]),ppmy=h/(2*view[3]);
    const frame={uView:v4(view),uPPM:ppm,uPPMY:ppmy,uMax:1e8,uW:weight,uT:t,uTw:Math.floor(t*480),
      uPP:new THREE.Vector2(ppm,ppmy),uCanvas:new THREE.Vector2(w,h),uKernel:1,uCore:P.qCore??.25};
    if(l.emitter){for(const o of l.objects)set(o.material,frame);l.head.geometry.instanceCount=0;return;}
    if(P.form==='trail') {
      const stop=this.recipe.stop??this.recipe.duration-3.2,anchor=P.trV*Math.min(t,stop);
      for(const o of l.objects)if(o!==l.head)set(o.material,{...frame,uStop:t>stop?stop:-1,uAnchorY:anchor,uStreak:P.trFollow?P.trV*shutter:0});
      if(t<=stop) {
        const fl=1+.12*Math.sin(2*Math.PI*7*t/l.Tp)*Math.sin(2*Math.PI*3*t/l.Tp+1.1);
        l.headData.set([0,0,P.trHeadBright*fl,P.trHeadSize,0,0,P.trHeadBright*P.trHaloBright*fl*P.trHalo**2,P.trHeadSize*P.trHalo]);
        l.head.geometry.instanceCount=2;
      } else l.head.geometry.instanceCount=0;
      set(l.head.material,{...frame,uSpan:10});
    } else {
      if(t<l.last-1e-8)l.sim=new Sim(P);
      l.last=t;
      while(l.sim.t<t-1e-9)l.sim.step(H_STEP);
      const [n]=l.sim.gather(l.headData,l.dummyTail);l.head.geometry.instanceCount=n;
      set(l.head.material,frame);
      const embers=model==='embers'&&P.filament;
      l.spark.visible=!P.filament||embers;l.spark.material=embers?l.emberMaterial:l.originalSpark;
      set(l.spark.material,{...frame,uLife:embers?P.filamentLife:P.sparkLife,uSize:embers?P.filamentWidth:P.sparkSize});
      if(l.filament){l.filament.visible=!embers;set(l.filament.material,frame);}
      if(l.reflectedSpark)set(l.reflectedSpark.material,frame);
    }
    l.headBuffer.needsUpdate=true;
  }
  resize(w,h,ss) {
    if(ss*w>this.maxTextureSize||ss*h>this.maxTextureSize)throw new Error('超过显卡最大渲染尺寸。');
    const bytes=w*h*(ss*ss*16+4)+this.layers.reduce((n,l)=>n+(l.track?.bytes||0),0);
    if(bytes>1400*1024*1024)throw new Error('本次渲染超过 1.4 GB 工作预算，请降低超采样或像素尺寸。');
    if(this.rg?.width!==w*ss||this.rg?.height!==h*ss) {
      this.rg?.dispose();this.hdr?.dispose();this.rg=target(w*ss,h*ss);this.hdr=target(w*ss,h*ss);
    }
    if(this.output?.width!==w||this.output?.height!==h){this.output?.dispose();this.output=target(w,h,THREE.UnsignedByteType);}
    this.size={w,h,ss,bytes};
  }
  clear(rt) {this.renderer.setRenderTarget(rt);this.renderer.setClearColor(0,0);this.renderer.clear();}
  full(mat,rt,clear=false) {
    this.quad.material=mat;if(clear)this.clear(rt);else this.renderer.setRenderTarget(rt);
    this.renderer.render(this.screenScene,this.camera);
  }
  drawRG(l,t,view,w,h,{ss=1,samples=1,shutter=0,model='original'}={}) {
    this.resize(w,h,ss);this.clear(this.rg);
    for(let i=0;i<samples;i++) {
      const time=Math.max(0,t+((i+.5)/samples-.5)*shutter);
      this.prepare(l,time,view,w*ss,h*ss,1/samples,model,shutter/samples);
      this.renderer.setRenderTarget(this.rg);this.renderer.render(l.scene,this.camera);
    }
    return this.rg;
  }
  render(t,{width=1024,height=width,ss=1,samples=1,shutter=0,exposure=1,bloom=0,model='original',view=this.recipe.view,output=null,linear=false}={}) {
    this.resize(width,height,ss);this.clear(this.hdr);
    for(const l of this.layers) {
      this.drawRG(l,t,view,width,height,{ss,samples,shutter,model});
      const M=l.M;
      set(this.shade,{uS:this.rg.texture,uEH:l.expo?.[0]??1,uET:l.expo?.[1]??1,uG:l.P.encGamma||1,
        uComb:l.P.outMode==='combined'?1:0,uHI:M.headInt,uTI:M.tailInt,uTint:v3(tintAt(M,t)),
        uR0:v3(hexToLin(M.ramp0)),uR1:v3(hexToLin(M.ramp1)),uR2:v3(hexToLin(M.ramp2)),uR3:v3(hexToLin(M.ramp3))});
      this.full(this.shade,this.hdr);
    }
    const rt=output==='bytes'?this.output:output;
    if(!rt){this.renderer.setSize(width,height,false);}
    set(this.post,{uS:this.hdr.texture,uSS:ss,uExposure:exposure,uBloom:bloom,uLinear:linear});
    this.full(this.post,rt);
    return this.size;
  }
  encodeFrame(l,t,view,w,h,options={}) {
    this.drawRG(l,t,view,w,h,options);
    set(this.encoder,{uS:this.rg.texture,uSS:options.ss||1,uEH:l.expo?.[0]??1,uET:l.expo?.[1]??1,
      uGamma:l.P.encGamma||1,uPart:options.part||0});
    this.full(this.encoder,this.output,true);
    const pixels=new Uint8Array(w*h*4);this.renderer.readRenderTargetPixels(this.output,0,0,w,h,pixels);return pixels;
  }
  readOutput() {const {w,h}=this.size,p=new Uint8Array(w*h*4);this.renderer.readRenderTargetPixels(this.output,0,0,w,h,p);return p;}
  disposeLayers() {
    for(const worker of this.workers){worker.reject?.(new Error('已取消加载'));worker.terminate();}this.workers.clear();
    for(const l of this.layers) {
      for(const o of l.objects){o.geometry.dispose();o.material.dispose();}
      if(l.originalSpark&&l.spark.material!==l.originalSpark)l.originalSpark.dispose();
      if(l.emberMaterial&&l.spark.material!==l.emberMaterial)l.emberMaterial.dispose();
      for(const t of l.textures)t.dispose();
    }this.layers=[];
    for(const t of this.atlasTextures||[])t.dispose();this.atlasTextures=[];
  }
  dispose() {
    ++this.generation;this.disposeLayers();this.rg?.dispose();this.hdr?.dispose();this.output?.dispose();
    for(const m of [this.shade,this.post,this.encoder,this.quad.material])m.dispose();
    this.quad.geometry.dispose();this.renderer.dispose();
  }
}

export { THREE, material, FULL_VS, POST_FS, set, target };
