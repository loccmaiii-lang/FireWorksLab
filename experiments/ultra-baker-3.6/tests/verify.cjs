const { chromium } = require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'), path=require('path'), {pathToFileURL}=require('url'), assert=require('assert');
const root=path.resolve(__dirname,'..'), out=path.join(root,'results');
function png(name,url){fs.writeFileSync(path.join(out,name),Buffer.from(url.split(',')[1],'base64'));}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1680,height:1050},acceptDownloads:true});
 page.setDefaultTimeout(120000); const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'tool/FireworkBaker.html')).href+'?fast');
 await page.waitForFunction(()=>window.__fw); await page.evaluate(()=>{state.stillBusy=true;state.playing=false;LAB.bloom=0;state.expo=1;});
 const report={date:new Date().toISOString(),gpu:await page.locator('#gpu').textContent(),errors,cases:[],checks:{}};
 report.checks.channelData=await page.evaluate(async()=>{
   const raw=new Uint8Array(16*8*4);for(let y=0;y<8;y++)for(let x=0;x<16;x++){const i=(y*16+x)*4;raw[i]=x<8?201:63;raw[i+1]=y<4?137:39;raw[i+2]=17;raw[i+3]=0;}
   const blob=await encodePNG(raw,16,8), bm=await createImageBitmap(blob,{premultiplyAlpha:'none',colorSpaceConversion:'none'}), data=readDataBitmap(bm);bm.close();
   // encodePNG flips GL bottom-up rows; readDataBitmap retains source-image top-down order.
   const exact=[...data.slice(0,4)], bottom=[...data.slice(7*16*4,7*16*4+4)];
   asset.files=new Map([['test.png',blob]]);const frames=await assetFrames({file:'test.png',cols:2,rows:1,frames:8,channels:4,keys:[[0,0],[1,8]]});
   const c=frames.get(0), px=[...c.getContext('2d').getImageData(0,0,1,1).data]; const size=[c.width,c.height];frames.dispose();
   return {exact,bottom,displayPixel:px,size};
 });
 assert.deepEqual(report.checks.channelData.exact,[201,39,17,0]); assert.deepEqual(report.checks.channelData.bottom,[201,137,17,0]); assert(report.checks.channelData.displayPixel[0]>200);
 report.checks.kernelFlux=await page.evaluate(()=>{
   const t=new Target(32,32,gl.RGBA16F), a=new Float32Array(32*32*4), result={};
   for(const [name,p] of [['legacy',QUALITY_PRESETS.legacy],['integrated',{...QUALITY_PRESETS.fine,qCore:0}]]){
    const sums=[];setParticleProfile(p);
    for(let k=0;k<20;k++){t.clear();t.bind();additive(true);drawPoints(new Float32Array([k/20,0,1,0.1]),1,[0,0,16,16],1,[1,0,0,0],1);additive(false);gl.readPixels(0,0,32,32,gl.RGBA,gl.FLOAT,a);let sum=0;for(let i=0;i<a.length;i+=4)sum+=a[i];sums.push(sum);}
    result[name]={min:Math.min(...sums),max:Math.max(...sums),spread:Math.max(...sums)-Math.min(...sums)};
   }t.dispose();return result;
 });
 assert(report.checks.kernelFlux.integrated.spread < report.checks.kernelFlux.legacy.spread);
 // Full frame-count comparison: identical seed, fixed framing, uniform timestamps, shutter and locked exposure.
 for(const [name,size,preset,core] of [['baseline-2k',2048,'legacy',0],['sampling-2k',2048,'fine',0],['fine-4k',4096,'fine',0.25],['fine-8k',8192,'fine',0.25]]){
   console.log('BAKE',name);
   const r=await page.evaluate(async({name,size,preset,core})=>{
     const d=defaultsFor('kiku'), P={...d.P,...QUALITY_PRESETS[preset],qCore:core,texW:size,texH:size,zoom:'off',frameMode:'uniform',seed:42};
     const start=performance.now(), b=await bakeMaster(P,1,null,window.__testExpo?{expo:window.__testExpo}:{});
     if(!window.__testExpo)window.__testExpo=[b.meta.expoH,b.meta.expoT];
     const shots=[];canvas.width=canvas.height=1024;
     if(hdrT)hdrT.dispose();if(rgT)rgT.dispose();hdrT=new Target(1024,1024,gl.RGBA16F,true);rgT=new Target(1024,1024,gl.RGBA16F);
     const view=squareView(b.meta);
     for(const fraction of [.2,.4,.7]){
       const f=Math.floor(b.meta.L.F*fraction), t=b.meta.times[f];hdrT.clear();hdrT.bind();additive(true);drawLayer(b,{...d.M,scale:1,delay:0,rate:1,mirror:false},t,view);additive(false);post();shots.push({f,t,png:canvas.toDataURL('image/png')});
     }
     const bytes=readRGBA8(b.head), atlas=await encodePNG(bytes,b.N,b.NH), ab=new Uint8Array(await atlas.arrayBuffer());let str='';for(let i=0;i<ab.length;i+=32768)str+=String.fromCharCode.apply(null,ab.subarray(i,i+32768));
     const result={name,N:b.N,cell:[b.cw,b.chh],frames:b.meta.L.F,bakeMs:b.meta.bakeMs,totalMs:performance.now()-start,quality:b.meta.quality,budget:b.meta.budget,expo:window.__testExpo,view,times:b.meta.times,checks:b.meta.check,shots,atlas:btoa(str),params:masterJSON(b,name,d.M),glError:gl.getError()};
     if(name==='fine-4k'){window.__showcase=b;state.P=P;state.M=d.M;state.name='Kiku_ULTRA_4K';}else disposeBake(b);
     return result;
   },{name,size,preset,core});
   r.shots.forEach((s,i)=>{png(`${name}-${i}.png`,s.png);delete s.png;});fs.writeFileSync(path.join(out,`${name}-atlas.png`),Buffer.from(r.atlas,'base64'));delete r.atlas;
   fs.writeFileSync(path.join(out,`${name}-params.json`),JSON.stringify(r.params,null,2));delete r.params;
   assert.equal(r.N,size);assert.equal(r.frames,256);assert(r.checks.chanUse.every(Boolean));assert.equal(r.glError,0);
   report.cases.push(r);fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));console.log(name,Math.round(r.bakeMs)+'ms',r.cell);
 }
 for(const type of ['senrin','trailM','fountain']){
   console.log('SMOKE',type);
   const r=await page.evaluate(async type=>{
     const d=defaultsFor(type),P=derive({...d.P,...QUALITY_PRESETS.fine,texW:2048,texH:2048,chans:4,_loopOnly:type==='trailM'}),start=performance.now();
     const b=await bake(P,1,null);const out={type,N:b.N,cell:[b.cw,b.chh],frames:b.meta.L.F,ms:performance.now()-start,channels:b.meta.check.chanUse,glError:gl.getError()};
     const blob=await encodePNG(readRGBA8(b.head),b.N,b.NH), arr=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<arr.length;i+=32768)s+=String.fromCharCode.apply(null,arr.subarray(i,i+32768));out.atlas=btoa(s);disposeBake(b);return out;
   },type);
   fs.writeFileSync(path.join(out,`${type}-smoke-atlas.png`),Buffer.from(r.atlas,'base64'));delete r.atlas;assert.equal(r.glError,0);assert(r.channels.every(Boolean));report.cases.push(r);console.log(r);
 }
 report.checks.cancel=await page.evaluate(async()=>{
   const P={...defaultsFor('kiku').P,texW:2048,texH:2048};LAB.cancel=true;try{await bake(P,1,null);return false}catch(e){return /取消/.test(e.message)&&gl.getError()===0}finally{LAB.cancel=false;}
 });assert(report.checks.cancel);
 report.checks.budget=await page.evaluate(()=>{try{validateQuality({...defaultsFor('kiku').P,texW:8192,texH:8192,qSS:8},1);return false}catch(e){return /预算/.test(e.message)}});assert(report.checks.budget);
 report.checks.nativeAsset=await page.evaluate(async()=>{
   const e=FW_REVIEW_LIST.find(x=>x.kind==='asset'); if(!e)return {skipped:'no asset'};
   await new Promise((resolve,reject)=>{const sc=document.createElement('script');sc.src=e.src;sc.onload=resolve;sc.onerror=reject;document.head.append(sc)});
   const d=assetCache[e.id];asset.files=new Map(Object.entries(d.images));const tex=Object.values(d.manifest.emitters[0].tex)[0];const frames=await assetFrames(tex);const c=frames.get(0), r={id:e.id,size:[c.width,c.height],frames:frames.length};frames.dispose();return r;
 });
 // Verify the interactive result at two desktop sizes.
 await page.evaluate(()=>{state.bake=window.__showcase;state.dirty=false;state.playing=false;state.t=1.2;state.view='export';LAB.bloom=.06;state.stillBusy=false;syncExport();showStats(state.bake);});
 await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'ultra-ui-1680.png')});
 await page.locator('#qLoupe').check();await page.locator('#box').hover({position:{x:300,y:300}});await page.waitForTimeout(200);await page.screenshot({path:path.join(out,'ultra-loupe.png')});
 await page.locator('#qLoupe').uncheck();await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'ultra-ui-1280.png')});
 const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#qSnapshot').click()]);await download.saveAs(path.join(out,'current-view-4k.png'));
 // Export the real 4K atlas/metadata archive through the UI, not a mock.
 const [zip]=await Promise.all([page.waitForEvent('download'),page.locator('#btnExport').click()]);await zip.saveAs(path.join(out,'Kiku_ULTRA_4K.zip'));
 report.checks.exportZip=true;report.checks.glError=await page.evaluate(()=>gl.getError());assert.equal(report.checks.glError,0);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));await browser.close();console.log('PASS',report.checks);
})().catch(e=>{console.error(e);process.exit(1)});
