const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'analysis/results/SparkFlow');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});try{
 const p=await b.newPage({viewport:{width:1600,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.join(root,'tool/FireworkBaker.html')).href+'?fast');await p.waitForFunction(()=>window.__fw);
 await p.evaluate(()=>{graphOpen('rocket');state.playing=false;});
 await p.waitForFunction(()=>wbIdle()&&!!wb.sig&&!!undo.last,{},{timeout:120000}).catch(async e=>{console.log(await p.evaluate(()=>({idle:wbIdle(),baking:state.baking,dirty:state.dirty,error:state.bakeError,auto:autoBakeOn(),busy:$('#busy').hidden,queue:state.layerQueue?.size,tab:state.tab,sig:wb.sig.length,undo:undo.last.length})));throw e;});await p.waitForTimeout(500);console.log('初始烘焙与撤销基线就绪');
 await p.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);});
 const summary=p.locator('summary').filter({hasText:/全局气流/});await summary.click();
 const input=p.getByRole('spinbutton',{name:'轴向收束率（1/s） 数值',exact:true});await input.fill('6.5');await input.press('Tab');await p.waitForTimeout(150);
 assert.equal(await p.evaluate(()=>state.P.sparkGraph.fieldConverge),6.5);
 console.log('参数编辑通过');
 await p.evaluate(()=>undoStep(-1));assert.equal(await p.evaluate(()=>state.P.sparkGraph.fieldConverge),4.5);await p.evaluate(()=>undoStep(1));assert.equal(await p.evaluate(()=>state.P.sparkGraph.fieldConverge),6.5);
 await p.locator('#abSave').click();await p.locator('#saveNameInput').fill('速度场自动检查');await p.locator('#saveNameSubmit').click();await p.waitForFunction(()=>lib.my&&lib.my.name==='速度场自动检查');const id=await p.evaluate(()=>lib.my.id);
 await p.reload();await p.waitForFunction(()=>window.__fw);await p.evaluate(async id=>{await openMyEffect(id);state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;},id);
 assert.equal(await p.evaluate(()=>state.P.sparkGraph.fieldConverge),6.5);
 // 不从测试存档交付：重新打开正式推荐参数，然后烘焙和连续播放。
 await p.evaluate(async()=>{graphOpen('rocket');state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;if(state.P.sparkGraph.fieldConverge!==4.5||!state.P.cameraMotion)throw Error('正式入口配方不一致');state.bake=await bakeFinal(state.P,1,null);state.bakeGen=state.gen;state.dirty=false;setViewSeg('export');state.t=.9;state.disp='fit';});
 await p.locator('summary').filter({hasText:/全局气流/}).evaluate(e=>e.parentElement.open=true);await p.screenshot({path:path.join(out,'正式入口回放.png')});
 await p.evaluate(()=>{state.playing=true;state.rate=1;});const ticks=[];for(let i=0;i<22;i++){await p.waitForTimeout(300);ticks.push(await p.evaluate(()=>state.t));}await p.evaluate(()=>state.playing=false);assert(ticks.filter((t,i)=>i&&t<ticks[i-1]).length>=2);
 await p.locator('label.field').filter({has:p.locator('.fk').filter({hasText:/^全局气流$/})}).locator('select').selectOption('0');assert.equal(await p.evaluate(()=>state.P.sparkGraph.fieldEnabled),0);assert.equal(await p.getByRole('spinbutton',{name:'轴向收束率（1/s） 数值',exact:true}).isVisible(),false);
 await p.locator('label.field').filter({has:p.locator('.fk').filter({hasText:/^全局气流$/})}).locator('select').selectOption('1');assert.equal(await p.evaluate(()=>state.P.sparkGraph.fieldConverge),4.5);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'界面检查.json'),JSON.stringify({pass:true,saveReload:true,undoRedo:true,independentToggle:true,ticks,errors,version:await p.evaluate(()=>VERSION)},null,2));console.log('统一入口/撤销重做/保存刷新/连续回放通过');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
