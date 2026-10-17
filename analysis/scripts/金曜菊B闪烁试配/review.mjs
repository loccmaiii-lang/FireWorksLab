// 独立浏览器走真实配方文件入口，并从正在播放的引擎预览连续采样；不接用户浏览器。
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const liveRoot=process.env.FW_LIVE_ROOT||'F:/FireWorksLab';
const out=path.join(root,'analysis/results/GLITTER_TWINKLE_20261017');
const require=createRequire('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
execFileSync('python',['-X','utf8','tool/local_http/preflight.py','--tool','baker'],{cwd:liveRoot,stdio:'inherit'});
const manifest=JSON.parse(fs.readFileSync(path.join(out,'配方清单.json'),'utf8'));
assert.ok(fs.readFileSync(path.join(root,'tool/FireworkBaker.html')).equals(fs.readFileSync(path.join(liveRoot,'tool/FireworkBaker.html'))));
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=d3d11','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const context=await browser.newContext({viewport:{width:1500,height:1120}});
const page=await context.newPage();page.setDefaultTimeout(900000);
const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const reports=[];
try{
 await page.goto('http://127.0.0.1:8034/baker?fast',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__fw);
 for(const item of manifest.variants){
  console.log('REVIEW',item.id);
  const rec=JSON.parse(fs.readFileSync(path.join(root,item.myRecipe),'utf8'));
  await page.evaluate(async rec=>{state.stillBusy=true;state.autoBake=false;state.playing=false;clearTimeout(bakeTimer);myPut(rec);await openMyEffect(rec.id);},rec);
  await page.waitForFunction(()=>state.layers.length===3&&state.layers.every(L=>{const e=layerEntryOf(L);return e&&e.bake&&!layerStale(e);})&&!state.baking);
  await page.locator('#abFile').setInputFiles(path.join(root,item.file));
  await page.waitForFunction(()=>wb.src?.kind==='mine'&&wbList().find(x=>x.id===wb.src.id)?.name.endsWith('（导入）'));
  await page.waitForFunction(()=>state.layers.length===3&&state.layers.every(L=>{const e=layerEntryOf(L);return e&&e.bake&&!layerStale(e);})&&!state.baking);
  const loaded=await page.evaluate(()=>mySnap());
  for(let i=0;i<3;i++){
   assert.deepEqual(loaded.layers[i].P,rec.snap.layers[i].P,item.id+'导入参数改变');
   assert.deepEqual(loaded.layers[i].M,rec.snap.layers[i].M,item.id+'导入颜色改变');
  }
  await page.evaluate(()=>{state.stillBusy=false;state.playing=false;state.view='export';state.disp='fit';state.platform='pc';state.layerView={solo:-1,mute:[]};});
  const frames=await page.evaluate(async()=>{
   const c=document.createElement('canvas');c.width=480;c.height=Math.round(canvas.height/canvas.width*480);
   const g=c.getContext('2d'),rows=[];let next=0;
   state.t=0;state.speed=1;state.loopPlay=false;state.playing=true;
   const wall=performance.now();
   while(performance.now()-wall<5200){
    await new Promise(requestAnimationFrame);
    if(state.t>=next&&state.t<=4.6){g.drawImage(canvas,0,0,c.width,c.height);rows.push({t:state.t,wall:(performance.now()-wall)/1000,png:c.toDataURL('image/png')});next=state.t+.075;}
   }
   state.playing=false;return rows;
  });
  assert.ok(frames.length>=30,item.id+'连续播放样本过少');
  assert.ok(frames.every((x,i)=>!i||x.t>frames[i-1].t),item.id+'播放时钟回退');
  const dir=path.join(out,'连续采样',item.id);fs.mkdirSync(dir,{recursive:true});
  for(let i=0;i<frames.length;i++)fs.writeFileSync(path.join(dir,String(i).padStart(3,'0')+'.png'),Buffer.from(frames[i].png.split(',')[1],'base64'));
  const report={id:item.id,nativeFileImport:true,parametersIdentical:true,frames:frames.map(({png,...x},i)=>({...x,file:'连续采样/'+item.id+'/'+String(i).padStart(3,'0')+'.png'})),
   note:'原生引擎回放视图，真实播放时钟连续采样；只是浏览器回放检查，不代表UE客户端帧率或参考照片的真实频率。'};
  reports.push(report);fs.writeFileSync(path.join(out,'连续播放检查.json'),JSON.stringify({reports,errors},null,2));
 }
}finally{await browser.close();}
assert.deepEqual(errors,[]);
