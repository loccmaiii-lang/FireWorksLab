const {chromium}=require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');const OUT=path.resolve(__dirname,'../studies/radiometry'),ROOT=path.resolve(__dirname,'../../..');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11']});const page=await browser.newPage({viewport:{width:1560,height:1200}});page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:18766/experiments/ultra-baker-3.6/studies/radiometry/');await page.waitForFunction(()=>window.radiometryPreview?.rad?.ready&&!radiometryPreview.busy);
 const result={effects:[],productionHashes:[]};
 for(const id of ['V14','V13']){
  if(id!=='V14'){await page.selectOption('#effect',id);await page.waitForFunction(id=>radiometryPreview.rad.id===id&&!radiometryPreview.busy,id);}
  await page.waitForFunction(()=>document.querySelector('#source').readyState>=2);
  const t=id==='V14'?3.2:6.5;await page.evaluate(t=>radiometryPreview.seek(t),t);
  await page.waitForFunction(({id,t})=>{const v=document.querySelector('#source');return !v.seeking&&Math.abs(v.currentTime-(t+(id==='V14'?4.2:5.7)))<.02},{id,t});
  const info=await page.evaluate(async({id,t})=>{
   const r=radiometryPreview.rad;r.render(t,{size:1024,ss:2,samples:4});
   const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d');ctx.drawImage(r.canvas,0,0);const live=ctx.getImageData(0,0,1024,1024).data;
   const image=await createImageBitmap(await(await fetch(`${id}-frames/${String(Math.round(t*30)).padStart(4,'0')}.png`)).blob());
   ctx.clearRect(0,0,1024,1024);ctx.drawImage(image,0,0);const baked=ctx.getImageData(0,0,1024,1024).data;
   let max=0,sum=0;for(let i=0;i<baked.length;i++){const d=Math.abs(baked[i]-live[i]);max=Math.max(max,d);sum+=d;}
   return {id,sourceTime:document.querySelector('#source').currentTime,sourceSize:[document.querySelector('#source').videoWidth,document.querySelector('#source').videoHeight],layers:document.querySelectorAll('#layers input').length,liveVsBaked:{max,mean:sum/baked.length},glError:r.canvas.getContext('webgl2').getError(),overflow:document.documentElement.scrollWidth>innerWidth};
  },{id,t});assert.equal(info.liveVsBaked.max,0);assert.equal(info.glError,0);assert.equal(info.overflow,false);assert.equal(info.sourceSize[0],720);
  await page.locator('#layers input').first().uncheck();assert((await page.evaluate(()=>radiometryPreview.rad.disabled)).includes(0));await page.locator('#layers input').first().check();
  await page.locator('#temperature').fill('-300');await page.locator('#temperature').dispatchEvent('input');assert.equal(await page.evaluate(()=>radiometryPreview.rad.settings.temperature),-300);await page.locator('#temperature').fill('0');await page.locator('#temperature').dispatchEvent('input');
  await page.locator('#play').click();const a=await page.locator('#clock').textContent();await page.waitForTimeout(700);await page.locator('#play').click();const b=await page.locator('#clock').textContent();assert.notEqual(a,b);await page.evaluate(t=>radiometryPreview.seek(t),t);
  await page.waitForFunction(({id,t})=>{const v=document.querySelector('#source');return !v.seeking&&Math.abs(v.currentTime-(t+(id==='V14'?4.2:5.7)))<.02},{id,t});
  await page.screenshot({path:path.join(OUT,`${id}-preview.png`),fullPage:true});result.effects.push(info);
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(OUT,'mobile-preview.png'),fullPage:true});
 const hashes=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../baseline/original-hashes.json')));
 for(const h of hashes){const got=crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,h.path))).digest('hex').toUpperCase();assert.equal(got,h.sha256.toUpperCase(),h.path);result.productionHashes.push({path:h.path,match:true});}
 assert.deepEqual(errors,[]);result.errors=errors;fs.writeFileSync(path.join(OUT,'preview-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({effects:result.effects,originalFiles:result.productionHashes.length,errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
