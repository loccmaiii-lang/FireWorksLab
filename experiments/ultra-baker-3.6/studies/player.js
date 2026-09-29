// Replay the actual grayscale RGBA atlases, using the baker's linear ramp and integer frame selection.
const lin=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
const keys=(k,t)=>{if(t<=k[0][0])return k[0][1];for(let i=1;i<k.length;i++)if(t<=k[i][0])return k[i-1][1]+(k[i][1]-k[i-1][1])*(t-k[i-1][0])/(k[i][0]-k[i-1][0]);return k.at(-1)[1]};
const tint=(m,t)=>{let c=lin(m.stages[0][1]);for(let i=1;i<m.stages.length;i++){const [s,h]=m.stages[i],w=m.xw||.08;let u=Math.max(0,Math.min(1,(t-s+w/2)/w));u=u*u*(3-2*u);const d=lin(h);c=c.map((v,j)=>v+(d[j]-v)*u);}return c};
class AtlasPlayer {
 constructor(canvas){
  this.canvas=canvas;this.g=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true});const g=this.g;
  if(!g||!g.getExtension('EXT_color_buffer_float'))throw Error('需要支持 WebGL2 的 Chrome / Edge');
  this.textures=[];this.layers=[];this.ready=false;
  const vs=`#version 300 es\nprecision highp float;out vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
  const make=fs=>{const p=g.createProgram();for(const [type,src]of [[g.VERTEX_SHADER,vs],[g.FRAGMENT_SHADER,fs]]){const s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));g.attachShader(p,s);g.deleteShader(s)}g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));const u={};for(let i=0;i<g.getProgramParameter(p,g.ACTIVE_UNIFORMS);i++){const n=g.getActiveUniform(p,i).name;u[n]=g.getUniformLocation(p,n)}return{p,u}};
  this.mat=make(`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform sampler2D atlas;uniform vec2 grid,inset;uniform float frame,intensity,zoom;uniform vec2 focus;uniform vec3 r0,r1,r2,r3,tint;
vec3 ramp(float v){if(v<.3)return mix(r0,r1,v/.3);if(v<.65)return mix(r1,r2,(v-.3)/.35);return mix(r2,r3,(v-.65)/.35);}
void main(){vec2 q=(uv-.5)/zoom+focus;if(any(lessThan(q,vec2(0.)))||any(greaterThan(q,vec2(1.)))){o=vec4(0.);return;}q=clamp(q,inset,1.-inset);float per=grid.x*grid.y;int ch=int(floor(frame/per));float k=mod(frame,per);vec2 st=(vec2(mod(k,grid.x),grid.y-1.-floor(k/grid.x))+q)/grid;vec4 s=texture(atlas,st);float v=s[ch];o=vec4(ramp(v)*v*tint*intensity*4.,1.);}`);
  this.post=make(`#version 300 es\nprecision highp float;in vec2 uv;out vec4 o;uniform sampler2D source;void main(){vec3 sky=mix(vec3(.0032,.0038,.009),vec3(.0011,.0013,.0032),uv.y);vec3 c=1.-exp(-(texture(source,uv).rgb+sky));o=vec4(pow(c,vec3(1./2.2)),1.);}`);
  this.fb=g.createFramebuffer();this.target=g.createTexture();this.resize(1024);
 }
 resize(n){const g=this.g;this.canvas.width=this.canvas.height=n;g.bindTexture(g.TEXTURE_2D,this.target);g.texImage2D(g.TEXTURE_2D,0,g.RGBA16F,n,n,0,g.RGBA,g.HALF_FLOAT,null);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.bindFramebuffer(g.FRAMEBUFFER,this.fb);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,this.target,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('预览缓冲分配失败');}
 clear(){const g=this.g;this.ready=false;this.textures.forEach(t=>g.deleteTexture(t));this.textures=[];this.layers=[];}
 async load(variant){this.clear();const g=this.g;const layers=[];try{
  for(const l of variant.layers){const ss=[];for(const s of l.segments){
   const r=await fetch(s.file);if(!r.ok)throw Error('贴图未找到：'+s.file);const bm=await createImageBitmap(await r.blob(),{premultiplyAlpha:'none',colorSpaceConversion:'none',imageOrientation:'flipY'});
   const tx=g.createTexture();this.textures.push(tx);g.bindTexture(g.TEXTURE_2D,tx);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);g.pixelStorei(g.UNPACK_COLORSPACE_CONVERSION_WEBGL,g.NONE);g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE,bm);bm.close();
   g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);ss.push({...s,tx});
  }layers.push({...l,segments:ss});}
  this.layers=layers;this.ready=true;
 }catch(e){this.clear();throw e;}}
 render(t,zoom=1,focus=[.5,.5]){const g=this.g,n=this.canvas.width;g.bindFramebuffer(g.FRAMEBUFFER,this.fb);g.viewport(0,0,n,n);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);if(this.ready){g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE);const {p,u}=this.mat;g.useProgram(p);g.uniform1i(u.atlas,0);g.uniform1f(u.zoom,zoom);g.uniform2fv(u.focus,focus);
  for(const l of this.layers){const s=l.segments.find(s=>t>=s.meta.t0&&t<s.meta.t0+s.meta.duration);if(!s)continue;const m=s.meta,M=l.M;const f=Math.max(0,Math.min(m.L.F-1,Math.floor(keys(m.keys,(t-m.t0)/m.duration))));g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,s.tx);g.uniform2f(u.grid,m.L.cols,m.L.rows);g.uniform2f(u.inset,.5/(s.N/m.L.cols),.5/(s.NH/m.L.rows));g.uniform1f(u.frame,f);g.uniform1f(u.intensity,M.headInt);for(let j=0;j<4;j++)g.uniform3fv(u['r'+j],lin(M['ramp'+j]));g.uniform3fv(u.tint,tint(M,t));g.drawArrays(g.TRIANGLES,0,3);
  }g.disable(g.BLEND);}
  g.bindFramebuffer(g.FRAMEBUFFER,null);g.useProgram(this.post.p);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.target);g.uniform1i(this.post.u.source,0);g.drawArrays(g.TRIANGLES,0,3);
 }
}
window.AtlasPlayer=AtlasPlayer;
