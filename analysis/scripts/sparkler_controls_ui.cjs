/* 当前候选原生入口：文件载入、13项缺省、真实烘焙及PC/手机连续回放。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const R=path.resolve(__dirname,'../..'),O=path.join(R,'analysis/results/SparklerControls'),source=JSON.parse(fs.readFileSync(path.join(O,'候选参数.json'),'utf8'));
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});try{const p=await b.newPage({viewport:{width:1600,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:8034/baker?fast');await p.waitForFunction(()=>window.__fw);await p.evaluate(()=>{graphOpen('sparkler');state.playing=false;});await p.waitForFunction(()=>state.P?.sparkGraph?.presetKey==='sparkler'&&wbIdle(),null,{timeout:120000});
 assert(await p.evaluate(source=>JSON.stringify(state.P.sparkGraph)===JSON.stringify(source.P.sparkGraph),source),'SGS1真实入口不是当前候选');
 // 先用真实面板改值，随后原生配方载入必须把它恢复，避免对同值载入的假阳性。
 await p.locator('summary:visible').filter({hasText:/整体调整/}).evaluate(e=>e.parentElement.open=true);const speed=p.getByRole('spinbutton',{name:'初速（×） 数值',exact:true});await speed.fill('1.25');await speed.press('Tab');assert.equal(await p.evaluate(()=>state.P.sparkGraph.scaleSpeed),1.25);
 await p.locator('#abFile').setInputFiles(path.join(O,'仙女棒_快慢火星与轻气流.recipe.json'));await p.waitForFunction(()=>state.P.sparkGraph.scaleSpeed===1);assert(await p.evaluate(source=>JSON.stringify(state.P.sparkGraph)===JSON.stringify(source.P.sparkGraph),source));
 await p.waitForFunction(()=>wbIdle()&&!!state.bake&&!state.dirty,null,{timeout:120000});await p.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;setViewSeg('export');state.t=.89;state.disp='fit';});
 const defaults=await p.evaluate(()=>Object.fromEntries(['scaleCone','scaleCount','scaleWidth','scaleLife','scaleGain','scaleSpeed','scaleGravity','branchLife','branchAngle','branchCount','branchWidth','branchSpeed','branchGravity'].map(k=>[k,pGet(state.P,'sparkGraph.'+k)])));assert(Object.values(defaults).every(x=>x===1));
 await p.locator('summary:visible').filter({hasText:/整体调整|分叉调整/}).evaluateAll(a=>a.forEach(e=>e.parentElement.open=true));await p.screenshot({path:path.join(O,'原生入口-引擎回放.png')});
 await p.evaluate(()=>{state.playing=true;state.rate=1;});const ticks=[];for(let i=0;i<24;i++){await p.waitForTimeout(300);ticks.push(await p.evaluate(()=>state.t));}await p.evaluate(()=>state.playing=false);assert(ticks.filter((v,i)=>i&&v<ticks[i-1]).length>=2);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(O,'原生入口检查.json'),JSON.stringify({pass:true,version:await p.evaluate(()=>VERSION),nativeFileImport:true,entryEqualsCandidate:true,parametersEqual:true,defaults,ticks,errors},null,2));console.log('SGS1正式入口、原生文件恢复、13项默认1、三周期引擎回放通过');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
