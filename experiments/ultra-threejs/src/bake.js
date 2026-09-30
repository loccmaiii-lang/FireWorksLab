import { THREE, material, FULL_VS, set } from './renderer.js';
import { tintAt, hexToLin, colorKeys } from './generated/core.js';
import { FS_MAT } from './generated/shaders.js';

export function atlasLayout(size, frames, trail = false) {
  if(![2048,4096].includes(size))throw new Error('引擎贴图必须为 2048 或 4096。');
  if(![64,128,256].includes(frames))throw new Error('选择 64、128 或 256 帧。');
  const per=frames/4;
  const cols=trail?16:(frames===64?4:8),rows=per/cols;
  return {size,frames,per,cols,rows,cellW:size/cols,cellH:size/rows,chans:4};
}
export function fittedView(view,w,h) {
  const a=w/h,halfY=Math.max(view[3],view[2]/a);
  return [view[0],view[1],halfY*a,halfY];
}
export function packFrame(destination,frame,layout,pixels) {
  const {size,per,cols,cellW:w,cellH:h}=layout;
  const channel=Math.floor(frame/per),cell=frame%per,col=cell%cols,row=Math.floor(cell/cols);
  // GPU readback is bottom-up; PNG and metadata use top-to-bottom cell rows.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const d=((row*h+y)*size+col*w+x)*4+channel;
    destination[d]=pixels[((h-1-y)*w+x)*4];
  }
}
export async function bake(engine,settings,onProgress=()=>{},signal) {
  const recipe=structuredClone(engine.recipe),outputs=[],trail=recipe.layers.every(l=>l.P.form==='trail');
  const layout=atlasLayout(settings.size,settings.frames,trail);
  const duration=recipe.duration;
  const times=Array.from({length:layout.frames},(_,f)=>(f+.5)*duration/layout.frames);
  const {ss=2,samples=4,shutter=.5,model='original'}=settings;
  const view=fittedView(recipe.view,layout.cellW,layout.cellH);
  const parts=settings.separate?['head','tail']:['combined'];
  for(const [i,layer] of engine.layers.entries())for(const part of parts) {
    const pixels=new Uint8Array(layout.size**2*4);
    for(let f=0;f<layout.frames;f++) {
      signal?.throwIfAborted();
      const image=engine.encodeFrame(layer,times[f],view,layout.cellW,layout.cellH,{
        ss,samples,shutter:duration/layout.frames*shutter,model,part:{combined:0,head:1,tail:2}[part]});
      packFrame(pixels,f,layout,image);
      onProgress({layer:i,part,frame:f+1,frames:layout.frames,progress:(i*parts.length+parts.indexOf(part)+(f+1)/layout.frames)/(engine.layers.length*parts.length)});
      // Allow cancellation and UI updates; the animation loop is paused by main.
      if(f%2===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    outputs.push({id:layer.id,name:layer.name,part,pixels,P:structuredClone(layer.P),M:structuredClone(layer.M)});
  }
  return {outputs,metadata:{schema:'fwl.three-bake/1',engine:'three.js r186',created:new Date().toISOString(),
    recipe:recipe.id,name:recipe.name,source:recipe.source,duration,stop:recipe.stop,layout,view,times,
    frameKeys:[[0,0],[1,layout.frames]],framePolicy:'floor; no interpolation',packOrder:'R all cells -> G -> B -> A',
    sampling:{physicsHz:480,trajectoryHz:240,spatial:ss,temporal:samples,shutterFraction:shutter,model},
    atlasColorSpace:'raw grayscale data, not sRGB; A is data, not opacity',
    materials:recipe.layers.map(l=>({id:l.id,M:l.M,colorKeys:colorKeys(l.M,duration)})),
    engineImport:'Manual Cascade setup with the existing relay material. This is not a verified fwl.cascade package.'}};
}

export class AtlasPlayer {
  constructor(engine,result) {
    this.engine=engine;this.result=result;this.scene=new THREE.Scene();this.objects=[];this.textures=[];
    const {layout:L}=result.metadata;
    const grouped=new Map();
    for(const out of result.outputs) {
      if(!grouped.has(out.id))grouped.set(out.id,{out});
      const t=new THREE.DataTexture(out.pixels,L.size,L.size,THREE.RGBAFormat,THREE.UnsignedByteType);
      // Raw RGBA avoids the browser treating the fourth frame bank as opacity.
      t.flipY=true;t.colorSpace=THREE.NoColorSpace;t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;
      this.textures.push(t);grouped.get(out.id)[out.part]=t;
    }
    for(const {out,combined,head,tail} of grouped.values()) {
      const m=material(FULL_VS,FS_MAT,{
        uH:combined||head,uT:tail||combined||head,uCols:L.cols,uRows:L.rows,uChans:4,
        uFrame:0,uComb:combined?1:0,uHI:out.M.headInt,uTI:out.M.tailInt,uK:4,uMirror:0,
        uInset:new THREE.Vector2(.5/L.cellW,.5/L.cellH),uTint:new THREE.Vector3(1,1,1),
        uR0:new THREE.Vector3(...hexToLin(out.M.ramp0)),uR1:new THREE.Vector3(...hexToLin(out.M.ramp1)),
        uR2:new THREE.Vector3(...hexToLin(out.M.ramp2)),uR3:new THREE.Vector3(...hexToLin(out.M.ramp3))});
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),m);mesh.frustumCulled=false;
      this.scene.add(mesh);this.objects.push({mesh,out});
    }
  }
  render(time,{width=1024,height=width,exposure=1,bloom=0,output=null}={}) {
    const e=this.engine,{layout,duration}=this.result.metadata;
    const frame=Math.floor(time/duration*layout.frames);
    e.resize(width,height,1);e.clear(e.hdr);
    for(const {mesh,out} of this.objects)set(mesh.material,{uFrame:frame<layout.frames?frame:-1,uTint:new THREE.Vector3(...tintAt(out.M,time))});
    // Letterbox instead of stretching the rectangular baked frame.
    const aspect=layout.cellW/layout.cellH,screenAspect=width/height;
    const sx=Math.min(1,aspect/screenAspect),sy=Math.min(1,screenAspect/aspect);
    for(const {mesh}of this.objects)mesh.scale.set(sx,sy,1);
    // FULL_VS deliberately works in clip coordinates; add scale in shader.
    for(const {mesh}of this.objects) {
      if(!mesh.material.uniforms.uScale) {
        mesh.material.uniforms.uScale={value:new THREE.Vector2(sx,sy)};
        mesh.material.vertexShader=FULL_VS.replace('in vec3 position;', 'in vec3 position;uniform vec2 uScale;')
          .replace('vec4(position,1.)','vec4(position.xy*uScale,position.z,1.)');
        mesh.material.needsUpdate=true;
      } else mesh.material.uniforms.uScale.value.set(sx,sy);
    }
    e.renderer.render(this.scene,e.camera);
    if(!output)e.renderer.setSize(width,height,false);
    set(e.post,{uS:e.hdr.texture,uSS:1,uExposure:exposure,uBloom:bloom,uLinear:false});
    e.full(e.post,output==='bytes'?e.output:output);
    return frame;
  }
  dispose(){for(const {mesh}of this.objects){mesh.geometry.dispose();mesh.material.dispose();}for(const t of this.textures)t.dispose();}
}
