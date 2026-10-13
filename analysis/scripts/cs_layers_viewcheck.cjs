// 对照页实际播放、暂停、拖动和全部切换入口。
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'analysis/results/CS3_Layers');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1400,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.join(out,'对照回放.html')).href);await p.waitForFunction(()=>document.querySelector('#left').naturalWidth===480);
 const t0=await p.locator('#time').inputValue();await p.waitForFunction(t=>+document.querySelector('#time').value>+t,t0);await p.locator('#play').click();
 for(const id of ['CSLRC','CSLRS'])for(const plat of ['PC','Mobile'])for(const view of ['whole','detail']){
  await p.selectOption('#effect',id);await p.selectOption('#plat',plat);await p.selectOption('#view',view);
  await p.locator('#time').evaluate(e=>{e.value='90';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await p.waitForFunction(()=>[...document.querySelectorAll('main img')].every(e=>e.complete&&e.naturalWidth===480));assert.equal(await p.locator('#stamp').innerText(),'3.00 s');
  if(view==='whole')await p.screenshot({path:path.join(out,id+'-'+plat+'-对照页.png')});
 }
 assert.equal(errors.length,0);fs.writeFileSync(path.join(out,'对照页走查.json'),JSON.stringify({pass:true,play_advances:true,controls:['播放','暂停','拖动','Comet/Silver','PC/手机','整体/局部'],errors},null,2));
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
