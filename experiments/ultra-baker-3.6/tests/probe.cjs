const { chromium } = require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path = require('path');
const { pathToFileURL } = require('url');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const page=await browser.newPage({viewport:{width:1680,height:1050}});
 page.on('pageerror',e=>console.log('PAGEERROR',e.message));
 page.on('console',m=>{if(m.type()==='error')console.log('ERROR',m.text().slice(0,600));});
 await page.goto(pathToFileURL(path.resolve(__dirname,'../tool/FireworkBaker.html')).href+'?fast');
 await page.waitForFunction(()=>window.__fw,{timeout:15000});
 console.log(await page.evaluate(()=>({gpu:document.querySelector('#gpu').textContent,max:gl.getParameter(gl.MAX_TEXTURE_SIZE),point:PT_MAX,err:gl.getError(),quality:qualityOf(state.P),sources:FW_REVIEW_LIST.map(e=>e.src||e.video)})));
 await page.screenshot({path:path.resolve(__dirname,'../results/initial-ui.png')});
 console.log(await page.evaluate(async()=>{
   state.stillBusy=true; const P={...defaultsFor('kiku').P,texW:512,texH:512,cols:4,rows:4,chans:4,zoom:'off',frameMode:'uniform'};
   const b=await bake(P,1,null), out={N:b.N,cell:b.cw,ms:b.meta.bakeMs,check:b.meta.check,error:gl.getError()};disposeBake(b);return out;
 }));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
