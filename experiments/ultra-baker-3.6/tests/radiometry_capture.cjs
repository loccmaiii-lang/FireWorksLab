const {chromium}=require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const OUT=path.resolve(__dirname,'../studies/radiometry'),args=process.argv.slice(2),only=args.find(x=>x.startsWith('--only='))?.split('=')[1];
const full=args.includes('--full');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage();page.setDefaultTimeout(600000);let errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
 await page.goto('http://127.0.0.1:18766/experiments/ultra-baker-3.6/studies/radiometry/engine.html?fast');await page.waitForFunction(()=>window.RAD);
 for(const id of only?[only]:['V14','V13']){
  console.log('LOAD',id);const manifest=await page.evaluate(id=>RAD.load(id),id);fs.writeFileSync(path.join(OUT,id+'-config.json'),JSON.stringify(manifest,null,2));
  const times=id==='V14'?[.5,1.4,3.2,5.1,7,8.2,8.8,9.6]:[.5,1.9,3.4,4.1,5.2,6.5,8,10];
  const dir=path.join(OUT,id+'-frames');if(full)fs.mkdirSync(dir,{recursive:true});
  for(const [i,t]of (full?Array.from({length:Math.round(manifest.duration*30)},(_,i)=>[i,i/30]):times.map((t,i)=>[i,t]))){
   const png=await page.evaluate(({t,full})=>RAD.capture(t,{size:1024,ss:2,samples:full?4:4}),{t,full});
   fs.writeFileSync(full?path.join(dir,String(i).padStart(4,'0')+'.png'):path.join(OUT,`${id}-v4-${t}.png`),Buffer.from(png.split(',')[1],'base64'));
   if(full&&times.some(v=>Math.round(v*30)===i)){
    const raw=await page.evaluate(()=>{const a=new Uint8Array(RAD.linear().buffer);let s='';for(let k=0;k<a.length;k+=32768)s+=String.fromCharCode.apply(null,a.subarray(k,k+32768));return btoa(s)});
    fs.writeFileSync(path.join(OUT,`${id}-linear-${t.toFixed(3)}.rgba32f`),Buffer.from(raw,'base64'));
   }
   if(full&&i%30===0)console.log(id,'FRAME',i);}
  if(full){fs.writeFileSync(path.join(OUT,id+'-sequence.json'),JSON.stringify({id,frames:Math.round(manifest.duration*30),fps:30,size:1024,renderSize:2048,temporalSamples:4,shutterSeconds:1/60,colour:'sRGB display transform; 8-bit PNG, opaque alpha; use RGB for additive black-background compositing',linearKeyframes:'OpenEXR HALF RGB, linear sRGB primaries BEFORE white balance, exposure, optical bloom and display transform',settings:manifest.camera},null,2));
   for(const t of (id==='V14'?[3.2,7]:[4.1,6.5])){const png=await page.evaluate(t=>RAD.capture(t,{size:4096,ss:1,samples:8}),t);fs.writeFileSync(path.join(OUT,`${id}-4K-${t}.png`),Buffer.from(png.split(',')[1],'base64'));}
  }
  assert.equal(await page.evaluate(()=>gl.getError()),0);
 }
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS');
})().catch(e=>{console.error(e);process.exit(1)});
