const {chromium}=require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11']});const page=await browser.newPage({viewport:{width:1500,height:1150}});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const out=path.resolve(__dirname,'../studies/filaments');
 await page.goto('http://127.0.0.1:18766/experiments/ultra-baker-3.6/studies/filaments/preview.html');await page.waitForFunction(()=>window.filamentPreview&&!filamentPreview.busy&&filamentPreview.player.ready);
 const result=[];
 for(const id of ['V14','V13']){
  await page.selectOption('#effect',id);await page.waitForFunction(()=>!filamentPreview.busy&&filamentPreview.player.ready);
  for(const quality of ['fine-4k','fine-8k']){
   await page.selectOption('#quality',quality);await page.waitForFunction(()=>!filamentPreview.busy&&filamentPreview.player.ready);
   await page.evaluate(id=>filamentPreview.seek(id==='V14'?3.25:6.5),id);
   const png=await page.locator('canvas').evaluate(c=>c.toDataURL('image/png'));fs.writeFileSync(path.join(out,id+'-'+quality+'-native-proof.png'),Buffer.from(png.split(',')[1],'base64'));
   const info=await page.evaluate(()=>({layers:filamentPreview.player.layers.length,ready:filamentPreview.player.ready,error:filamentPreview.player.g.getError(),time:filamentPreview.t}));assert.equal(info.error,0);assert.equal(info.layers,id==='V14'?4:5);result.push({id,quality,...info});
  }
  if(id==='V14'){
   await page.locator('#layers input').nth(0).uncheck();assert.equal(await page.evaluate(()=>filamentPreview.player.layers.length),3);
   await page.locator('#zoom').click();await page.locator('canvas').click({position:{x:400,y:200}});await page.screenshot({path:path.join(out,'afterglow-preview.png'),fullPage:true});
   await page.locator('#layers input').nth(0).check();await page.locator('#center').click();
  }
  const t0=await page.evaluate(()=>filamentPreview.t);await page.click('#play');await page.waitForTimeout(300);await page.click('#play');assert(await page.evaluate(t0=>filamentPreview.t>t0,t0));
 }
 await page.screenshot({path:path.join(out,'native-preview.png'),fullPage:true});await page.setViewportSize({width:650,height:950});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'preview-verification.json'),JSON.stringify({result,errors,mobileOverflow:false,layerToggle:true,zoom:true,playback:true},null,2));await browser.close();console.log('PASS native preview',result);
})().catch(e=>{console.error(e);process.exit(1)});
