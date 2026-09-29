from pathlib import Path
root=Path(__file__).resolve().parents[1]; src=root/'tool/src'
p=src/'js/77_assets.js'; s=p.read_text(encoding='utf-8')
start=s.index('// 一个发射器、一套贴图')
end=s.index('// 按发射器参数生成粒子',start)
s=s[:start]+'''// Read channel data directly through WebGL. Canvas2D premultiplication destroys RGB when A=0.
function readDataBitmap(bm) {
  const cv = document.createElement('canvas'), g = cv.getContext('webgl2', {premultipliedAlpha:false, alpha:true});
  if (!g) throw new Error('需要 WebGL2 读取原始 RGBA 通道');
  const tx=g.createTexture(), fb=g.createFramebuffer();
  try {
    g.bindTexture(g.TEXTURE_2D,tx); g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
    g.pixelStorei(g.UNPACK_COLORSPACE_CONVERSION_WEBGL,g.NONE);
    g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST); g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);
    g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE,bm);
    g.bindFramebuffer(g.FRAMEBUFFER,fb); g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,tx,0);
    if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE) throw new Error('RGBA 数据读取失败');
    const data=new Uint8Array(bm.width*bm.height*4); g.readPixels(0,0,bm.width,bm.height,g.RGBA,g.UNSIGNED_BYTE,data);
    return data;
  } finally { g.deleteFramebuffer(fb); g.deleteTexture(tx); g.getExtension('WEBGL_lose_context')?.loseContext(); }
}
// Native rectangular cells, decoded on demand. Bound the per-emitter cache instead of prebuilding every frame.
async function assetFrames(tex) {
  const bm=await createImageBitmap(await assetBlob(tex.file),{premultiplyAlpha:'none',colorSpaceConversion:'none'});
  const cw=bm.width/tex.cols, ch=bm.height/tex.rows, W=bm.width, per=tex.cols*tex.rows;
  if(!Number.isInteger(cw)||!Number.isInteger(ch)){bm.close();throw new Error('素材尺寸不能整除格子');}
  let raw=null, ramp=null, bitmap=bm;
  if(tex.mode!=='rgb') { try {raw=readDataBitmap(bm);} finally {bm.close();bitmap=null;} }
  if(tex.ramp){ const ri=await assetImage(tex.ramp), rp=pixelsOf(ri,256,1); ri.close(); ramp=[]; for(let i=0;i<256;i++) ramp.push([s2lin(rp[i*4]/255),s2lin(rp[i*4+1]/255),s2lin(rp[i*4+2]/255)]); }
  const cache=new Map(), limit=Math.max(1,Math.min(16,Math.floor(64*1024*1024/(cw*ch*4))));
  return {
    length:tex.frames,width:cw,height:ch,
    get(f){
      if(cache.has(f)){const c=cache.get(f);cache.delete(f);cache.set(f,c);return c;}
      const c=document.createElement('canvas');c.width=cw;c.height=ch;const g=c.getContext('2d');
      const cell=f%per, row=Math.floor(cell/tex.cols), col=cell%tex.cols;
      if(bitmap) g.drawImage(bitmap,col*cw,row*ch,cw,ch,0,0,cw,ch);
      else {
        const channel=tex.channels===1?0:Math.floor(f/per), keys=tex.keys||[[0,0],[1,tex.frames-1]];
        const u=keys[Math.min(f,keys.length-1)][0], tint=tex.col?curveAt(tex.col,u):[1,1,1];
        const id=g.createImageData(cw,ch), lut=new Uint8ClampedArray(768);
        for(let v=0;v<256;v++){const rc=ramp?ramp[v]:[1,1,1];for(let j=0;j<3;j++)lut[v*3+j]=Math.round(lin2s(Math.min(1,rc[j]*v/255*tint[j]))*255);}
        for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
          const v=raw[((row*ch+y)*W+col*cw+x)*4+channel], o=(y*cw+x)*4;
          id.data[o]=lut[v*3];id.data[o+1]=lut[v*3+1];id.data[o+2]=lut[v*3+2];id.data[o+3]=255;
        }
        g.putImageData(id,0,0);
      }
      cache.set(f,c);while(cache.size>limit){const key=cache.keys().next().value, old=cache.get(key);old.width=old.height=1;cache.delete(key);}
      return c;
    },
    dispose(){for(const c of cache.values())c.width=c.height=1;cache.clear();raw=null;if(bitmap)bitmap.close();bitmap=null;}
  };
}
function disposeAssetFrames(){for(const e of asset.emit){e.frames?.dispose?.();e.cut?.close?.();}}
''' +s[end:]
s=s.replace('const ASSET_CELL = 256;', 'const ASSET_CELL = null;')
s=s.replace('e.tex = tex; e.frames = await assetFrames(tex);', 'e.frames?.dispose?.(); e.cut?.close?.(); e.tex = tex; e.frames = await assetFrames(tex);')
s=s.replace('asset.emit = asset.man.emitters.map', 'disposeAssetFrames(); asset.emit = asset.man.emitters.map')
s=s.replace('g.drawImage(e.frames[f],', 'g.drawImage(e.frames.get(f),')
s=s.replace("const g = cv.getContext('2d'); cv.style.filter", "const g = cv.getContext('2d'); g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high'; cv.style.filter")
p.write_text(s,encoding='utf-8')
p=src/'js/80_render.js';s=p.read_text(encoding='utf-8');s=s.replace('const size = Math.max(256,', 'const size = LAB.forcePx || Math.max(256,')
s=s.replace('Math.max(state.speed, 0.25)), nsub = 3;', '1), nsub = particleQuality.kernel ? clamp(Math.ceil(W * particleQuality.hz), 3, 32) : 3;')
s=s.replace('const sim = slot.sim, W =', 'let sim = slot.sim; const W =')
s=s.replace('let guard = 0; while (sim.t < t - W', 'if (sim.t > Math.max(0,t-W) + H_STEP) sim = slot.sim = new Sim({ ...P });\n  let guard = 0; while (sim.t < t - W')
s=s.replace('1 / nsub, ++live.tw)', '1 / nsub, Math.round(ts / H_STEP))')
p.write_text(s,encoding='utf-8')
p=src/'js/70_ui.js';s=p.read_text(encoding='utf-8').replace("function syncExport() {\n  const P = state.P;", "function syncExport() {\n  if ($('#qSS')) { syncQualityUI(); $('#qTime').value = qualityOf(state.P).hz; }\n  const P = state.P;")
p.write_text(s,encoding='utf-8')
p=src/'style.css';p.write_text(p.read_text(encoding='utf-8')+'''
/* Isolated high precision controls */
.quality-panel{margin:10px 12px 6px;padding:12px;border:1px solid #6f593b;border-radius:9px;background:linear-gradient(135deg,#25221d,#161a22);font-size:12px}
.quality-panel summary{cursor:pointer;font-weight:600;display:flex;align-items:center;gap:8px;margin-bottom:8px}
.lab-badge{font:10px ui-monospace,monospace;letter-spacing:1px;color:#f5d69f;border:1px solid #786346;padding:4px 5px;border-radius:4px}
.quality-presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin:10px 0}
.quality-presets .btn{padding:6px 3px;font-size:11px;white-space:nowrap}
.quality-range{display:grid;grid-template-columns:1fr auto;gap:4px;margin:9px 0;color:#c7cbd6}.quality-range input{grid-column:1/-1;width:100%}
.quality-info{white-space:pre-line;background:#0d1017;border:1px solid #353537;border-radius:5px;padding:8px;margin:10px 0;color:#e3ca9f;font:11px/1.7 ui-monospace,monospace;overflow-wrap:anywhere}
.quality-panel .grid2{gap:8px}.quality-panel .hint{font-size:11px;line-height:1.6}.quality-panel select{width:100%;min-width:0;font-size:11px}
#qualityLoupe{position:absolute;left:12px;bottom:48px;width:240px;height:240px;border:1px solid #d7ac69;border-radius:6px;box-shadow:0 4px 24px #0009;pointer-events:none;z-index:5}
.quality-panel .line2{flex-wrap:wrap}
''',encoding='utf-8')
print('Upgraded native asset frames and inspection UI')
