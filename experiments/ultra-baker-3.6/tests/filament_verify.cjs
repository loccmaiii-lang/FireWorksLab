const {chromium}=require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11']});
 const page=await browser.newPage();page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:18766/experiments/ultra-baker-3.6/tool/FireworkBaker.html?fast');await page.waitForFunction(()=>window.__fw);
 const report=await page.evaluate(()=>{
  state.stillBusy=true;state.playing=false;
  const d=defaultsFor('kiku').P;
  const P=derive({...d,engine:'gpu',_unit:true,unitElev:0,stars:1,seed:141,v0:262,vt:35.3,grav:0,sparkGrav:0,speedJit:0,burnJit:0,burn:8,duration:9,headBright:0,flash:0,sparkRate:620,sparkRateEnd:1,sparkLife:.92,sparkSize:1.15,sparkSpread:0,sparkInherit:.04,sparkDrag:2.5,twinkle:0,filament:1,filamentLife:4.2,filamentHot:1.05,filamentBody:.16,filamentWidth:1.55,filamentJitter:0});
  function render(P,N,segments=112,t=3.2){
   P={...P,filamentSegments:segments};const tr=buildTrack(P),target=new Target(N,N,gl.RGBA32F),view=[160,0,180,180],ppm=N/360;
   target.clear();target.bind();additive(true);setParticleProfile(P);drawSparksGPU(tr,t,view,ppm,[0,1,0,0],1,11);additive(false);
   const a=new Float32Array(N*N*4);gl.readPixels(0,0,N,N,gl.RGBA,gl.FLOAT,a);target.dispose();disposeTrack(tr);
   const profile=Array(N).fill(0);for(let y=0;y<N;y++)for(let x=0;x<N;x++)profile[x]+=a[(y*N+x)*4+1];
   const max=Math.max(...profile),on=profile.map((v,x)=>v>max*.01?x:-1).filter(x=>x>=0);
   const span=on.length?(on.at(-1)-on[0]+1)/ppm:0;
   return {size:N,segments,energy:profile.reduce((a,b)=>a+b,0)/(ppm*ppm),spanAtOnePercent:span,first:on[0],last:on.at(-1),gaps:on.length?on.at(-1)-on[0]+1-on.length:0,profile,glError:gl.getError()};
  }
  const fine=render(P,1024),coarse=render(P,512),dense=render(P,1024,224),repeat=render(P,1024);
  const legacy=render({...P,filament:0},1024),early=render({...P,ignDelay:4,ignJit:0},256,112,3.2);
  const hidden=render({...defaultsFor('senrin').P,engine:'gpu',stars:3,subStars:8,carrierTail:0,carrierHead:0,subDelay:4.8,subJit:0,duration:9,filament:1},256,112,3.2);
  const extinct=render({...P,burn:2,filamentHotGain:0,filamentBody:1,filamentLife:8,filamentFollowBurn:1},256,112,3.2);
  return {fine,coarse,dense,legacy,early:early.energy,hidden:hidden.energy,extinct:extinct.energy,repeatEqual:JSON.stringify(fine.profile)===JSON.stringify(repeat.profile),tessellationRelativeError:Math.abs(dense.energy/fine.energy-1),resolutionRelativeError:Math.abs(coarse.energy/fine.energy-1)};
 });
 assert.equal(report.fine.glError,0);assert.equal(report.fine.gaps,0);assert(report.repeatEqual);assert.equal(report.early,0);assert.equal(report.hidden,0);assert.equal(report.extinct,0);
 assert(report.tessellationRelativeError<.025);assert(report.resolutionRelativeError<.025);assert(report.fine.spanAtOnePercent>report.legacy.spanAtOnePercent*1.5);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.resolve(__dirname,'../studies/filaments/renderer-verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,fine:{span:report.fine.spanAtOnePercent},coarse:{span:report.coarse.spanAtOnePercent},dense:{span:report.dense.spanAtOnePercent},legacy:{span:report.legacy.spanAtOnePercent}},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
