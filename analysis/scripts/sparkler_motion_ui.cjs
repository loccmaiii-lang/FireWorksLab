// 实际HTTP入口的原生配方文件导入、当前五项全局参数和连续回放。
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'analysis/results/SparklerMotion');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});try{const p=await b.newPage({viewport:{width:1600,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8034/baker?fast');await p.waitForFunction(()=>window.__fw);await p.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);graphOpen('sparkler');});await p.waitForFunction(()=>state.P?.sparkGraph?.presetKey==='sparkler'&&wbIdle(),null,{timeout:120000});
 await p.locator('#abFile').setInputFiles(path.join(out,'仙女棒_快抛慢落_试配.recipe.json'));await p.waitForFunction(()=>state.P.sparkGraph.name==='仙女棒 · 快抛慢落试配');
 const source=JSON.parse(fs.readFileSync(path.join(out,'候选参数.json'),'utf8'));
 const equal=await p.evaluate(source=>JSON.stringify(state.P.sparkGraph)===JSON.stringify(source.P.sparkGraph),source);assert(equal,'文件入口未载入相同参数');
 await p.waitForFunction(()=>wbIdle()&&!!state.bake&&!state.dirty,null,{timeout:120000});await p.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;setViewSeg('export');state.t=.89;state.disp='fit';});
 await p.locator('summary:visible').filter({hasText:/整体调整/}).evaluate(e=>e.parentElement.open=true);await p.screenshot({path:path.join(out,'原生入口-引擎回放.png')});
 const defaults=await p.evaluate(()=>Object.fromEntries(['scaleCone','scaleCount','scaleWidth','scaleLife','scaleGain'].map(k=>[k,pGet(state.P,'sparkGraph.'+k)])));assert(Object.values(defaults).every(x=>x===1));
 await p.evaluate(()=>{state.playing=true;state.rate=1;});const ticks=[];for(let i=0;i<24;i++){await p.waitForTimeout(300);ticks.push(await p.evaluate(()=>state.t));}await p.evaluate(()=>state.playing=false);assert(ticks.filter((v,i)=>i&&v<ticks[i-1]).length>=2);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'原生入口检查.json'),JSON.stringify({pass:true,sourceVersion:await p.evaluate(()=>VERSION),nativeFileImport:true,parametersEqual:true,existingFiveScales:defaults,ticks,errors,newControlsImplemented:false},null,2));console.log('原生配方文件导入、五项现有倍率、三周期引擎回放通过；新增控件仍排队');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
