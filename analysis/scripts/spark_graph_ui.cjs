// 从正式入口走实时、编辑、保存恢复、重新烘焙与回放；收集页面错误。
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'analysis/results/SparkGraph');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.join(root,'tool/FireworkBaker.html')).href+'?fast');await p.waitForFunction(()=>window.__fw&&typeof graphOpen==='function');
 const results=[];
 for(const [key,label] of [['rocket','窜天猴尾焰'],['sparkler','仙女棒全形态']]){
  await p.getByRole('button',{name:label,exact:true}).click();await p.waitForTimeout(1000);
  const original=await p.getByLabel('粒子直径 m',{exact:true}).inputValue();await p.getByLabel('粒子直径 m',{exact:true}).fill(String(+original*1.1));await p.getByLabel('粒子直径 m',{exact:true}).press('Tab');
  await p.getByRole('button',{name:'保存当前候选',exact:true}).click();await p.reload();await p.getByRole('button',{name:label,exact:true}).click();
  const restored=await p.getByLabel('粒子直径 m',{exact:true}).inputValue();assert(Math.abs(+restored-(+original*1.1))<1e-6,JSON.stringify({key,original,restored,saved:await p.evaluate(()=>JSON.parse(localStorage.getItem('fwl.sparkgraph.rocket')).P.sparkGraph.emitters[0].width)}));
  await p.getByLabel('选择粒子层').selectOption('5');assert.equal(await p.getByLabel('每周期粒子数',{exact:true}).count(),0);
  await p.getByRole('button',{name:'只看这一层',exact:true}).click();await p.waitForTimeout(200);await p.getByRole('button',{name:'恢复全部形态',exact:true}).click();
  // 恢复推荐参数；使用同一烘焙入口，保留真实播放循环进行截屏。
  await p.evaluate(async key=>{graphOpen(key);if(!state.P.cameraMotion||!state.P.cameraDof)throw Error('快捷入口没有打开推荐镜头配方');const intended=replicaPM(key==='rocket'?'SGR1':'SGS1').P;if(JSON.stringify(state.P.sparkGraph)!==JSON.stringify(intended.sparkGraph))throw Error('实际配方与候选不同');state.playing=false;state.bake=await bakeFinal(state.P,1,null);state.bakeGen=state.gen;state.dirty=false;setViewSeg('export');state.t=.7;state.disp='fit';},key);
  await p.waitForTimeout(200);await p.screenshot({path:path.join(out,key+'-正式入口回放.png')});
  const info=await p.evaluate(key=>({version:VERSION,ver:entryVer(FW_REVIEW_LIST.find(e=>e.id===(key==='rocket'?'SGR1':'SGS1'))),canvas:[canvas.width,canvas.height],frame:frameIdx(state.bake.meta,state.t),hud:hudText,frames:state.bake.meta.L.F}),key);
  await p.evaluate(()=>{state.playing=true;state.rate=1;});const progression=[];for(let i=0;i<22;i++){await p.waitForTimeout(300);progression.push(await p.evaluate(()=>state.t));}await p.evaluate(()=>{state.playing=false;});assert(new Set(progression.map(t=>Math.floor(t*30))).size>12);const wraps=progression.filter((t,i)=>i&&t<progression[i-1]).length;assert(wraps>=2);
  results.push({key,...info,savedAndRestored:true,playbackSeconds:6.6,wraps,progression});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'界面检查.json'),JSON.stringify({pass:true,results,errors},null,2));console.log(results);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
