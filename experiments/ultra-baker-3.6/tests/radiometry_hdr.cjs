const {chromium}=require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');const OUT=path.resolve(__dirname,'../studies/radiometry');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--disable-background-timer-throttling']});const page=await browser.newPage();page.setDefaultTimeout(600000);let errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:18766/experiments/ultra-baker-3.6/studies/radiometry/engine.html?fast');await page.waitForFunction(()=>window.RAD);
 for(const id of ['V14','V13']){const m=await page.evaluate(id=>RAD.load(id),id),dir=path.join(OUT,id+'-hdr-packed');fs.mkdirSync(dir,{recursive:true});
 for(let i=0;i<Math.round(m.duration*30);i++){
  const p=await page.evaluate(async t=>{RAD.render(t,{size:1024,ss:2,samples:4});return RAD.packedHDR()},i/30);fs.writeFileSync(path.join(dir,String(i).padStart(4,'0')+'.png'),Buffer.from(p,'base64'));
  if(i%60===0)console.log(id,'HALF',i);
 }assert.equal(await page.evaluate(()=>gl.getError()),0);}
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS');})().catch(e=>{console.error(e);process.exit(1)});
