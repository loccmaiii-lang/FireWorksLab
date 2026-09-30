const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const dir=path.resolve(__dirname,'../outputs');fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11']});
 const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[],report={};
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.THREE_LAB_URL||'http://127.0.0.1:18767/experiments/ultra-threejs/');
 await page.waitForFunction(()=>window.THREE_LAB&&!THREE_LAB.state.loading,{},{timeout:60000});
 await page.evaluate(()=>{THREE_LAB.state.playing=false;document.querySelector('#resolution').value='1024';});
 for(const type of ['fountain','falls','wheel','fan','barrage','shikake','water','rise','henka','matsuba','crossette']) {
   const loaded=await page.evaluate(t=>THREE_LAB.select('base:'+t),type);assert.equal(loaded,true,type);
   report[type]=await page.evaluate(()=>{
     const l=THREE_LAB;l.state.playing=false;l.renderAt(l.state.recipe.duration*.6,{width:1024,output:'bytes'});
     const p=l.engine.readOutput();let lit=0;for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2]>20)lit++;
     l.renderAt(l.state.t,{width:1024,output:null});return {lit,gl:l.engine.renderer.getContext().getError(),memory:l.engine.renderer.info.memory};
   });
   assert.ok(report[type].lit>20,type+' visible');assert.equal(report[type].gl,0,type);
   console.log(type,JSON.stringify(report[type]));
 }
 await page.evaluate(()=>THREE_LAB.select('V14'));
 report.embers=[];
 for(const t of [6,8.5,9,9.5,10.3]) {
   report.embers.push(await page.evaluate(t=>{
     const l=THREE_LAB;l.renderAt(t,{width:1024,model:'embers',output:'bytes'});
     const p=l.engine.readOutput();let lit=0;for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2]>20)lit++;
     return {t,lit,gl:l.engine.renderer.getContext().getError()};
   },t));
 }
 assert.ok(report.embers[1].lit>100);assert.ok(report.embers.every(f=>f.gl===0));
 await page.evaluate(()=>{const l=THREE_LAB;l.renderAt(8.5,{width:2048,model:'embers'});document.querySelector('#model').value='embers';document.querySelector('#model').onchange();l.state.dirty=false;});
 await page.screenshot({path:path.join(dir,'V14-embers-page.png')});
 report.gpu=await page.evaluate(()=>{const g=THREE_LAB.engine.renderer.getContext(),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER);});
 assert.deepEqual(errors,[]);report.errors=errors;fs.writeFileSync(path.join(dir,'features.json'),JSON.stringify(report,null,2));
 console.log('PASS basic effects, ground emitters, reflection, independent ember frames; '+report.gpu);
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
