// Isolated browser profiles only; never attaches to the user's browser.
// NODE_PATH must contain playwright. node startup_benchmark.cjs BEFORE AFTER OUT [RUNS]
const fs = require('fs'), path = require('path'), vm = require('vm');
const {pathToFileURL} = require('url');
const {chromium} = require('playwright');
const [before, after, output, count='3', modes='fast,normal,combo'] = process.argv.slice(2);
if (!output) throw Error('Usage: BEFORE.html AFTER.html OUT.json [RUNS]');
(async () => {
 const results=[];
 for (const mode of modes.split(',')) for (let i=0;i<+count;i++) for (const [label,file] of [['before',before],['after',after]]) {
  const source={};vm.runInNewContext(fs.readFileSync(path.join(path.dirname(file),'data/review.js'),'utf8'),source);
  const seed={};
  if(mode==='combo') {
   seed['fwb.review']=JSON.stringify(Object.fromEntries(source.FW_REVIEW.map(e=>[e.id+(e.ver?'@'+e.ver:''),{st:'ok'}])));
   seed['fwb.lastKey']=JSON.stringify('ef:jinrui_ning');
  }
  const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist','--disable-background-timer-throttling']});
  try {
   const page=await browser.newPage({viewport:{width:1366,height:768}}), errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({seed})=>{
    for(const [k,v] of Object.entries(seed))localStorage.setItem(k,v);
    window.__startupProbe={};
    const timer=setInterval(()=>{
     if(!window.__fw)return;
     const p=window.__startupProbe;
     if(!p.ready)p.ready=performance.now();
     if(__fw.idle() && (typeof lib==='undefined'||!lib.review||lib.review.kind!=='combo'||state.layers.length===lib.review.layerIds.length)) {p.idle=performance.now();clearInterval(timer);}
    },20);
   },{seed});
   await page.goto(pathToFileURL(path.resolve(file)).href+(mode==='fast'?'?fast':''),{waitUntil:'domcontentloaded',timeout:120000});
   await page.waitForFunction('window.__startupProbe.idle',{timeout:120000});
   await page.waitForFunction('performance.getEntriesByType("paint").length > 0',{timeout:15000});
   const r=await page.evaluate(()=>({ready:__startupProbe.ready,idle:__startupProbe.idle,paint:performance.getEntriesByType('paint').map(x=>({name:x.name,ms:x.startTime})),gpu:document.querySelector('#gpu').title,layers:state.layers.length,entry:lib.key,error:state.bakeError?.message||null}));
   if(r.error||errors.length)throw Error(JSON.stringify({r,errors}));
   if(!/NVIDIA|AMD|Intel/i.test(r.gpu)||/SwiftShader/i.test(r.gpu))throw Error('GPU required: '+r.gpu);
   results.push({mode,run:i+1,label,...r});
   fs.writeFileSync(output,JSON.stringify(results,null,2));console.log(JSON.stringify(results.at(-1)));
  } finally {await browser.close();}
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
