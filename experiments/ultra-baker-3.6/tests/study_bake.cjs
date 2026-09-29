const {chromium}=require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),out=path.join(root,process.argv.includes('--filaments')?'studies/filaments':'studies'),url='http://127.0.0.1:18766/experiments/ultra-baker-3.6/';
const args=process.argv.slice(2),draft=args.includes('--draft'),only=args.find(a=>a.startsWith('--only='))?.split('=')[1];
const save=(n,b64)=>fs.writeFileSync(path.join(out,n),Buffer.from(b64.includes(',')?b64.split(',')[1]:b64,'base64'));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1680,height:1050}});page.setDefaultTimeout(600000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().startsWith('STUDY'))console.log(m.text())});
 async function open(baseline=false){await page.goto(url+(baseline?'baseline/':'tool/')+'FireworkBaker.html?fast');await page.waitForFunction(()=>window.__fw);await page.evaluate(()=>{state.stillBusy=true;state.playing=false;state.ref.mode=0;state.expo=1;if(typeof LAB!=='undefined')LAB.bloom=0;window.studyBakes=[];});}
 async function setup(id,size,layer,baseline=false,shared=null){return page.evaluate(({id,size,layer,baseline,shared,draft})=>{
  let P,M,view;
  if(id==='JM'){const d=replicaPM('JM');P={...d.P,texW:size,texH:size,zoom:'off'};M=d.M;if(!baseline)Object.assign(P,QUALITY_PRESETS.fine);view=shared?.view;}
  else {({P,M}=studyLayerParams(id,layer,size));view=window.studyCommonView||(window.studyCommonView=studyView(id));}
  const spec=id==='JM'?{name:'金芒菊 · 正式配方',duration:P.duration,layers:[{id:'JM',name:'金芒菊'}]}:STUDY_RECIPES[id];
  window.studyCurrent={P,M,view,spec,layer};return {P,M,view,spec};
 },{id,size,layer,baseline,shared,draft});}
 async function bakeLayer(id,size,index,variant,shared){
  console.log('BAKE',id,variant,index);const setupData=await setup(id,size,index,variant==='original-2k',shared);
  const result=await page.evaluate(async({id,draft,shared})=>{
   const {P,M,spec,layer}=window.studyCurrent;let view=window.studyCurrent.view;const start=performance.now();let b;
   if(id==='JM'){
    const opt=shared?{pl:{...shared.meta,L:layoutOf(P),ppm:layoutOf(P).cellW/shared.meta.Ww},expo:shared.expo}:{};
    b=await bakeMaster(P,1,null,opt);view=squareView(b.meta);
   }else{
    // Every layer uses the same fixed camera, even across segments; no size pumping.
    const begin=spec.layers[layer].start||0;
    const spans=!draft&&P.duration>=spec.duration-.1&&begin===0?[[0,spec.split],[spec.split,P.duration]]:[[begin,P.duration]];
    let last=null,exposure=null;
    for(const [ta,tb] of spans){
     console.log('STUDY segment '+ta+'-'+tb);
     const bb=await bakeMaster(P,1,p=>{if(Math.round(p*256)%64===0)console.log('STUDY '+Math.round(p*100)+'%')},{pl:studyPlan(P,view,ta,tb),expo:exposure,noFade:tb<P.duration});
     if(last)last.next=bb;else b=bb;last=bb;exposure=[bb.meta.expoH,bb.meta.expoT];
    }
    if(b.next){b.form='segments';b.meta.split=spec.split;}
   }
   const to64=async blob=>{const a=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s)};
   const segments=[];for(let s=b,i=0;s;s=s.next,i++){const png=await encodePNG(readRGBA8(s.head),s.N,s.NH);segments.push({index:i,meta:s.meta,atlas:await to64(png),N:s.N,NH:s.NH});}
   const name=id+'_'+spec.layers[layer].id+'_'+P.texW;
   const params=masterJSON(b,name,M),txt=cascadeText(name,b,M),csv=curvesCSV(b,M),ramp=await to64(await encodePNG(rampPixels(M),256,8));
   window.studyBakes.push({b,M});return {view,P,M,params,txt,csv,ramp,segments,ms:performance.now()-start,expo:[b.meta.expoH,b.meta.expoT],glError:gl.getError()};
  },{id,draft,shared});
  assert.equal(result.glError,0);
  const prefix=`${id}-${variant}-${setupData.spec.layers[index].id}`;
  fs.writeFileSync(path.join(out,prefix+'.json'),JSON.stringify(result.params,null,2));fs.writeFileSync(path.join(out,prefix+'-Cascade.txt'),result.txt);fs.writeFileSync(path.join(out,prefix+'-curves.csv'),result.csv);save(prefix+'-Ramp.png',result.ramp);
  delete result.params;delete result.txt;delete result.csv;delete result.ramp;
  for(const s of result.segments){s.file=prefix+`-${s.index}.png`;save(s.file,s.atlas);delete s.atlas;assert.equal(s.N,size);assert.equal(s.meta.L.F,256);}
  result.id=setupData.spec.layers[index].id;result.name=setupData.spec.layers[index].name;result.parameters=prefix+'.json';
  console.log('DONE',id,variant,index,Math.round(result.ms)+'ms');return result;
 }
 for(const id of (only?[only]:['JM','V14','V13'])){
  let shared=null;const existing=path.join(out,`${id}-study.json`);let manifest=fs.existsSync(existing)&&!draft?JSON.parse(fs.readFileSync(existing)): {id,variants:{}};
  const variants=id==='JM'?(draft?[['original-2k',2048],['fine-4k',4096]]:[['original-2k',2048],['fine-2k',2048],['fine-4k',4096],['fine-8k',8192]]):(draft?[['draft-2k',2048]]:[['fine-2k',2048],['fine-4k',4096],['fine-8k',8192]]);
  for(const [variant,size] of variants){
   if(args.includes('--4k')&&size!==4096)continue;
   if(args.includes('--8k')&&size!==8192)continue;
   if(!draft&&!args.includes('--rebuild')&&fs.existsSync(path.join(out,`${id}-${variant}-complete.json`))){const prev=JSON.parse(fs.readFileSync(path.join(out,`${id}-${variant}-complete.json`)));manifest.variants[variant]=prev;if(variant==='original-2k')shared={view:prev.layers[0].view,meta:prev.layers[0].segments[0].meta,expo:prev.layers[0].expo};console.log('CACHED',id,variant);continue;}
   await open(variant==='original-2k');await page.evaluate(()=>{window.studyCommonView=null});
   const count=id==='JM'?1:await page.evaluate(id=>STUDY_RECIPES[id].layers.length,id),layers=[];
   for(let i=0;i<count;i++)layers.push(await bakeLayer(id,size,i,variant,shared));
   const view=layers[0].view,times=id==='JM'?[.35,.8,1.6,2.5,3.2,4]:id==='V14'?[.35,1.4,3.25,5.1,7,8.8]:[.5,1.9,3.4,4.9,6.5,9.5];
   const shots=await page.evaluate(({view,times})=>{
    canvas.width=canvas.height=1024;gl.activeTexture(gl.TEXTURE0);if(hdrT)hdrT.dispose();if(rgT)rgT.dispose();hdrT=new Target(1024,1024,gl.RGBA16F,true);rgT=new Target(1024,1024,gl.RGBA16F);
    return times.map(t=>{hdrT.clear();hdrT.bind();additive(true);for(const {b,M}of window.studyBakes)drawLayer(b,{...M,scale:1,delay:0,rate:1,mirror:false},t,view);additive(false);post();return canvas.toDataURL('image/png')});
   },{view,times});shots.forEach((s,i)=>save(`${id}-${variant}-shot-${i}.png`,s));
   manifest.name=id==='JM'?'金芒菊':(await setup(id,size,0)).spec.name;manifest.duration=id==='JM'?layers[0].P.duration:(await setup(id,size,0)).spec.duration;
   manifest.variants[variant]={size,view,layers,times};if(variant==='original-2k')shared={view,meta:layers[0].segments[0].meta,expo:layers[0].expo};
   fs.writeFileSync(path.join(out,`${id}-${variant}-complete.json`),JSON.stringify(manifest.variants[variant],null,2));
   await page.evaluate(()=>{for(const {b}of window.studyBakes)disposeBake(b);window.studyBakes=[];});
  }
  fs.writeFileSync(path.join(out,`${id}-${draft?'draft':'study'}.json`),JSON.stringify(manifest,null,2));
 }
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS');
})().catch(e=>{console.error(e);process.exit(1)});
