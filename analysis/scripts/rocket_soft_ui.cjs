/* 统一入口、真正的副本文件、保存刷新、三周期回放；使用隔离测试浏览器。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const R=path.resolve(__dirname,'../..'),O=path.join(R,'analysis/results/RocketSoft'),candidate=JSON.parse(fs.readFileSync(path.join(O,'候选参数.json'),'utf8'));
const mine=path.join(R,'analysis/我的配方/my_fxrockettailsoft20261018/正式资产-窜天猴尾焰-柔光暗底__fxrockettailsoft20261018.json');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});try{const p=await b.newPage({viewport:{width:1600,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8034/baker?fast');await p.waitForFunction(()=>window.__fw);
 await p.evaluate(()=>{openReview(entryById('SGRS1'));state.playing=false;});await p.waitForFunction(()=>state.P?.sparkGraph?.name==='窜天猴尾焰 · 柔光暗底'&&wbIdle()&&!!undo.last,null,{timeout:120000});
 assert(await p.evaluate(c=>JSON.stringify(state.P.sparkGraph)===JSON.stringify(c.P.sparkGraph),candidate));await p.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);});
 await p.locator('summary:visible').filter({hasText:/整体调整/}).evaluate(e=>e.parentElement.open=true);const gain=p.getByRole('spinbutton',{name:'粒子亮度（×） 数值',exact:true});await gain.fill('.85');await gain.press('Tab');assert.equal(await p.evaluate(()=>state.P.sparkGraph.scaleGain),.85);
 await p.evaluate(()=>undoStep(-1));assert.equal(await p.evaluate(()=>pGet(state.P,'sparkGraph.scaleGain')),1);await p.evaluate(()=>undoStep(1));assert.equal(await p.evaluate(()=>state.P.sparkGraph.scaleGain),.85);
 await p.locator('#abSave').click();await p.locator('#saveNameInput').fill('柔光暗底自动检查');await p.locator('#saveNameSubmit').click();await p.waitForFunction(()=>lib.my?.name==='柔光暗底自动检查');const id=await p.evaluate(()=>lib.my.id);
 await p.reload();await p.waitForFunction(()=>window.__fw);await p.evaluate(async id=>{await openMyEffect(id);state.playing=false;},id);assert.equal(await p.evaluate(()=>state.P.sparkGraph.scaleGain),.85);
 // 仓库存档走repoRecipe（不是只接受fwl.recipe/1的文件按钮）；调用与仓库载入相同的解析/打开入口。
 await p.evaluate(async doc=>{const rec=repoRecipe(doc);if(!myPut(rec))throw Error('副本未存入测试浏览器');await openMyEffect(rec.id);},JSON.parse(fs.readFileSync(mine,'utf8')));await p.waitForFunction(()=>pGet(state.P,'sparkGraph.scaleGain')===1&&state.P.sparkGraph.name==='窜天猴尾焰 · 柔光暗底');
 assert(await p.evaluate(c=>JSON.stringify(state.P.sparkGraph)===JSON.stringify(c.P.sparkGraph),candidate));for(const k of ['ramp0','ramp1','ramp2','ramp3'])assert.equal(await p.evaluate(k=>state.M[k],k),candidate.M[k]);
 await p.locator('#abFile').setInputFiles(path.join(O,'窜天猴尾焰_柔光暗底.recipe.json'));await p.waitForFunction(()=>wbIdle()&&!!state.bake&&!state.dirty,null,{timeout:120000});
 await p.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);setViewSeg('export');state.disp='fit';state.t=.89;state.playing=false;});await p.screenshot({path:path.join(O,'统一入口-柔层回放.png')});
 await p.evaluate(()=>{state.playing=true;state.rate=1;});const ticks=[];for(let i=0;i<24;i++){await p.waitForTimeout(300);ticks.push(await p.evaluate(()=>state.t));}assert(ticks.filter((v,i)=>i&&v<ticks[i-1]).length>=2);await p.evaluate(()=>state.playing=false);assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(O,'统一入口检查.json'),JSON.stringify({pass:true,version:await p.evaluate(()=>VERSION),entry:true,independentEdit:true,undoRedo:true,saveReload:true,repositoryCopyParseOpen:true,nativeRecipeImport:true,ticks,errors},null,2));console.log('独立入口、亮度编辑/撤销、保存刷新、仓库副本解析打开/原生recipe导入、三周期回放通过');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
