const {chromium}=require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..'),result=path.join(root,'results');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11']});
 const page=await browser.newPage({viewport:{width:1680,height:1050}});page.setDefaultTimeout(120000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Verify original renderer output independently, using the frozen original single-file HTML.
 await page.goto(pathToFileURL(path.join(root,'baseline/FireworkBaker.html')).href+'?fast');await page.waitForFunction(()=>window.__fw);
 const original=await page.evaluate(async()=>{
   state.stillBusy=true;const P={...defaultsFor('kiku').P,texW:2048,texH:2048,zoom:'off',frameMode:'uniform',seed:42};
   const b=await bakeMaster(P,1,null), blob=await encodePNG(readRGBA8(b.head),b.N,b.NH), ar=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<ar.length;i+=32768)s+=String.fromCharCode.apply(null,ar.subarray(i,i+32768));disposeBake(b);return btoa(s);
 });fs.writeFileSync(path.join(result,'original-3.6-atlas.png'),Buffer.from(original,'base64'));
 await page.goto(pathToFileURL(path.join(root,'tool/FireworkBaker.html')).href);await page.waitForFunction(()=>window.__fw&&__fw.idle(),{timeout:120000});
 await page.evaluate(()=>{state.playing=false;state.t=1.15;state.view='live';});await page.waitForTimeout(150);await page.screenshot({path:path.join(result,'normal-startup-live.png')});
 const tests={startup:await page.evaluate(()=>({N:state.bake.N,frames:state.bake.meta.L.F,buffer:canvas.width,err:gl.getError()}))};assert.equal(tests.startup.N,4096);
 // A real UI cancellation must not spin/retry or discard the preceding result.
 await page.locator('#qSS').selectOption('8');await page.waitForFunction(()=>state.baking);await page.waitForFunction(()=>!document.querySelector('#qCancel').disabled);await page.locator('#qCancel').click();await page.waitForFunction(()=>!state.baking);await page.waitForTimeout(600);
 tests.cancelUI=await page.evaluate(()=>({baking:state.baking,N:state.bake.N,dirty:state.dirty,err:gl.getError()}));assert(!tests.cancelUI.baking);assert.equal(tests.cancelUI.N,4096);assert(tests.cancelUI.dirty);
 // Verify a complete tail including both fades, content-driven frame planning and 8x spatial sampling.
 await page.evaluate(()=>{state.stillBusy=true;LAB.cancel=false;});
 tests.tail=await page.evaluate(async()=>{const d=defaultsFor('trailM'),P=derive({...d.P,texW:2048,texH:2048});const b=await bake(P,1,null);const r={fades:b.fades.map(x=>x.fps),relay:b.meta.relay,channels:b.meta.check.chanUse,err:gl.getError()};disposeBake(b);return r;});assert.deepEqual(tests.tail.fades,[30,20]);
 tests.content=await page.evaluate(async()=>{const P={...defaultsFor('kiku').P,texW:1024,texH:1024,cols:4,rows:4,frameMode:'content',zoom:'off',qSS:8,qHz:300,qMaxSub:16};const b=await bake(P,1,null);const r={ss:b.meta.quality.ss,F:b.meta.L.F,err:gl.getError()};disposeBake(b);return r;});assert.equal(tests.content.ss,8);assert.equal(tests.content.err,0);
 tests.nativeRect=await page.evaluate(async()=>{
   const w=1024,h=256,data=new Uint8Array(w*h*4);for(let i=0;i<data.length;i+=4){data[i]=150;data[i+1]=90;data[i+2]=20;data[i+3]=0;}
   asset.files=new Map([['native.png',await encodePNG(data,w,h)]]);const f=await assetFrames({file:'native.png',cols:2,rows:1,frames:8,channels:4,keys:[[0,0],[1,8]]});const c=f.get(0),r=[c.width,c.height];for(let i=0;i<8;i++)f.get(i);f.dispose();return r;
 });assert.deepEqual(tests.nativeRect,[512,256]);
 tests.errors=errors;assert.deepEqual(errors,[]);fs.writeFileSync(path.join(result,'regressions.json'),JSON.stringify(tests,null,2));console.log('PASS',tests);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
