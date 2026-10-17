// 在通过预检的原HTTP运行树上执行真实烘焙/保存/刷新/导出；输出写入本任务独立目录。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const liveRoot=process.env.FW_LIVE_ROOT||'F:/FireWorksLab';
const require=createRequire('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json');
const {chromium}=require('playwright');
const out=path.join(root,'analysis/results/GLITTER_TWINKLE_20261017');
const deliver=path.join(liveRoot,'outputs/金曜菊B闪烁试配_20261017');
fs.mkdirSync(deliver,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(out,'配方清单.json'),'utf8'));
const norm=x=>x.toString().replaceAll('\r\n','\n');
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
execFileSync('python',['-X','utf8','tool/local_http/preflight.py','--tool','baker'],{cwd:liveRoot,stdio:'inherit'});
const html=fs.readFileSync(path.join(root,'tool/FireworkBaker.html'));
if(!html.equals(fs.readFileSync(path.join(liveRoot,'tool/FireworkBaker.html'))))throw Error('独立副本与HTTP运行树成品不同');
for(const file of fs.readdirSync(path.join(root,'tool/src/js'))){
 if(norm(fs.readFileSync(path.join(root,'tool/src/js',file)))!==norm(fs.readFileSync(path.join(liveRoot,'tool/src/js',file))))throw Error('源码不一致：'+file);
}
const source=JSON.parse(fs.readFileSync(path.join(root,manifest.source),'utf8'));
const docs=[{id:'ORIGINAL',name:source.name,myRecipe:manifest.source},...manifest.variants];
const selected=process.argv.slice(2);
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-angle=d3d11','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const context=await browser.newContext({viewport:{width:1500,height:1120},acceptDownloads:true});
const page=await context.newPage();
page.setDefaultTimeout(900000);
const errors=[];
page.on('pageerror',e=>{errors.push(String(e));console.log('PAGE ERROR',String(e));});
page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text().slice(0,300));});
const oldSummary=path.join(out,'导出汇总.json');
const rows=fs.existsSync(oldSummary)?JSON.parse(fs.readFileSync(oldSummary,'utf8')).rows:[];
try{
 await page.goto('http://127.0.0.1:8034/baker?fast', {waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__fw);
 await page.evaluate(()=>{state.stillBusy=true;state.playing=false;state.autoBake=false;clearTimeout(bakeTimer);});
 const env=await page.evaluate(()=>({version:VERSION,renderer:(document.querySelector('#gpu')||{}).title,gl:gl.getParameter(gl.RENDERER)}));
 if(/swiftshader|software|basic render/i.test(env.renderer||env.gl))throw Error('未用真实GPU：'+JSON.stringify(env));
 console.log('ENV',JSON.stringify(env));
 fs.writeFileSync(path.join(out,'运行环境.json'),JSON.stringify({...env,htmlSha256:hash(html),liveRoot,sourceRoot:root},null,2));
 if(selected.includes('--standards')){
  const code=fs.readFileSync(path.join(root,'analysis/scripts/烘焙器探针.py'),'utf8').match(/JS_METRICS = r"""([\s\S]*?)"""/)[1];
  const inputs=JSON.parse(fs.readFileSync(path.join(out,'标准探针输入.json'),'utf8'));
  const metrics=await page.evaluate(({code,inputs})=>{
    const probe=new Function('__fw','REPLICA_BY_ID','a','return ('+code+')(a)');
    return inputs.map(x=>probe({...__fw,replicaPM:id=>inputs.find(x=>x.id===id)},Object.fromEntries(inputs.map(x=>[x.id,{name:x.id}])),
      {id:x.id,fps:30,dists:[80,100,120],screenH:1080,frac:1/3}));
  },{code,inputs});
  fs.writeFileSync(path.join(out,'标准探针.json'),JSON.stringify(metrics,null,2));
  console.log('STANDARDS',metrics.length);
 }
 else if(selected.includes('--probe'))process.exitCode=0;
 else for(const item of docs.filter(x=>!selected.length||selected.includes(x.id))){
   console.log('OPEN',item.id,new Date().toISOString());
   const rec=JSON.parse(fs.readFileSync(path.join(root,item.myRecipe),'utf8'));
   if(item.id==='ORIGINAL')Object.assign(rec,manifest.baselineOverrides||{});
   await page.evaluate(async rec=>{myPut(rec);state.stillBusy=true;state.autoBake=false;await openMyEffect(rec.id);},rec);
   await page.waitForFunction(()=>state.layers.length===3&&state.layers.every(L=>{const e=layerEntryOf(L);return e&&e.bake&&!layerStale(e);})&&!state.baking);
   console.log('BAKED',item.id);
   const info=await page.evaluate(()=>({name:state.comboName,version:VERSION,key:wbKey(),size:sizeSpecCombo(state.layers),
    mobilePlan:comboMobilePlan(state.layers.map(L=>({L,e:layerEntryOf(L),b:layerEntryOf(L).bake}))),
    layers:state.layers.map(L=>{const e=layerEntryOf(L),m=e.bake.meta;return{L,P:e.P,M:e.M,meta:{duration:m.duration,t0:m.t0,Ww:m.Ww,Wh:m.Wh,HX:m.HX,HY:m.HY,delay:m.delay,L:m.L,times:m.times,ticks:m.ticks,frameKeys:m.frameKeys,check:m.check,zoom:m.zoom,sizeKeys:m.sizeKeys}};})}));
   info.id=item.id;info.recipeHash=hash(Buffer.from(JSON.stringify(rec.snap)));
   fs.writeFileSync(path.join(out,item.id+'_烘焙参数.json'),JSON.stringify(info,null,2));
   // 原生保存与刷新重开，不接仓库目录句柄；仅测试浏览器的隔离localStorage。
   const saved=await page.evaluate(async()=>{const r=await mySave(false);return r?{id:r.id,name:r.name,snap:r.snap}:null;});
   if(!saved||saved.snap.layers.length!==3)throw Error(item.id+'保存失败');
   info.savedId=saved.id;
   const files=await page.evaluate(async name=>{
     const fs=await comboPackFiles(name,state.layers,p=>{window.__glitterProgress=p;});
     const u8=new Uint8Array(await(await makeZip(fs)).arrayBuffer());let s='';
     for(let i=0;i<u8.length;i+=32768)s+=String.fromCharCode.apply(null,u8.subarray(i,i+32768));
     return btoa(s);
   },item.id==='ORIGINAL'?'GlitterChry_Baseline':item.system);
   const zip=path.join(deliver,item.id==='ORIGINAL'?'GlitterChry_Baseline.zip':item.system+'.zip');
   fs.writeFileSync(zip,Buffer.from(files,'base64'));info.zip=zip;info.zipSha256=hash(fs.readFileSync(zip));
   console.log('EXPORTED',item.id,fs.statSync(zip).size);
   if(item.file)fs.copyFileSync(path.join(root,item.file),path.join(deliver,path.basename(item.file)));
   // 引擎回放的真实入口截图；相同取景、相同时间，保持整帧原始像素。
   await page.evaluate(()=>{state.stillBusy=false;state.autoBake=false;state.playing=false;state.platform='pc';state.view='export';state.disp='fit';state.layerView={solo:-1,mute:[]};});
   for(const t of [.45,.8,1.2,1.7,2.2,2.8,3.4,4.2]){
    await page.evaluate(t=>{state.t=t;},t);
    const png=await page.evaluate(()=>__fw.thumbNow());
    fs.writeFileSync(path.join(out,item.id+'_'+t.toFixed(2)+'.png'),Buffer.from(png.split(',')[1],'base64'));
   }
   info.snapAfter=await page.evaluate(()=>mySnap());
   await page.screenshot({path:path.join(out,item.id+'_烘焙器.png')});
   await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.__fw);
   const roundTrip=await page.evaluate(id=>{state.stillBusy=true;state.playing=false;state.autoBake=false;clearTimeout(bakeTimer);const r=myAll()[id];return r?{id:r.id,name:r.name,snap:r.snap}:null;},rec.id);
   info.refreshSaved=!!roundTrip&&JSON.stringify(roundTrip.snap)===JSON.stringify(saved.snap);
   if(!info.refreshSaved)throw Error(item.id+'刷新后快照不同');
   fs.writeFileSync(path.join(out,item.id+'_验证.json'),JSON.stringify(info,null,2));
   const prev=rows.findIndex(x=>x.id===item.id);if(prev>=0)rows.splice(prev,1);
   rows.push({id:item.id,name:item.name,zip,refreshSaved:info.refreshSaved,recipeHash:info.recipeHash});
   fs.writeFileSync(path.join(out,'导出汇总.json'),JSON.stringify({env,htmlSha256:hash(html),rows,errors},null,2));
 }
}finally{await browser.close();}
if(errors.length)throw Error('浏览器错误：'+errors.join('\n'));
