const {chromium}=require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');const OUT=path.resolve(__dirname,'../studies/radiometry');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11']});const page=await browser.newPage();page.setDefaultTimeout(600000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:18766/experiments/ultra-baker-3.6/studies/radiometry/engine.html?fast');await page.waitForFunction(()=>window.RAD);
 const report=await page.evaluate(async()=>{
  await RAD.load('V14');
  const bb=[1800,2200,2600,3000,3400,4000,5000].map(T=>({T,rgb:RAD.bb(T)}));
  function sum(){const a=RAD.linear(),s=[0,0,0];for(let i=0;i<a.length;i+=4)for(let k=0;k<3;k++)s[k]+=a[i+k];return s.map(v=>v/RAD.low.w**2);}
  RAD.render(3.2,{size:512,ss:2,samples:4});const base=sum(),before=RAD.canvas.toDataURL();
  RAD.render(8.8,{size:256,ss:1,samples:2});RAD.render(3.2,{size:512,ss:2,samples:4});const repeat=RAD.canvas.toDataURL()===before;
  RAD.settings.temperature=-400;RAD.render(3.2,{size:512,ss:2,samples:4});const cold=sum();RAD.settings.temperature=400;RAD.render(3.2,{size:512,ss:2,samples:4});const hot=sum();RAD.settings.temperature=0;
  RAD.render(3.2,{size:1024,ss:2,samples:4});const high=sum();
  const saved=RAD.layers[0].P.filamentSegments;RAD.layers[0].P.filamentSegments=saved*2;RAD.render(3.2,{size:512,ss:2,samples:4});const dense=sum();RAD.layers[0].P.filamentSegments=saved;
  RAD.disabled=[0,1,2];RAD.render(3.2,{size:256,ss:1,samples:1});const empty=sum();RAD.disabled=[];
  RAD.render(3.2,{size:512,ss:2,samples:4});const png=RAD.canvas.toDataURL();
  return {bb,base,cold,hot,high,dense,empty,repeat,glError:gl.getError(),resolutionError:high.map((v,i)=>Math.abs(v/base[i]-1)),segmentsError:dense.map((v,i)=>Math.abs(v/base[i]-1)),png};
 });
 assert(report.repeat,'random access must reproduce identical frame');assert.equal(report.glError,0);assert(report.empty.every(x=>x===0));assert(report.cold[0]<report.base[0]&&report.base[0]<report.hot[0]);assert(report.cold[2]/report.cold[0]<report.hot[2]/report.hot[0]);assert(report.resolutionError.every(x=>x<.05));assert(report.segmentsError.every(x=>x<.05));
 for(let i=1;i<report.bb.length;i++)assert(report.bb[i].rgb[0]>report.bb[i-1].rgb[0]);
 fs.writeFileSync(path.join(OUT,'verified-render.png'),Buffer.from(report.png.split(',')[1],'base64'));delete report.png;
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'renderer-verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
