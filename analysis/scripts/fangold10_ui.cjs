const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});try{const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('tool/FireworkBaker.html')).href+'?fast');await p.waitForFunction(()=>window.__fw&&__fw.idle());
 await p.evaluate(()=>{openReview(FW_REVIEW_LIST.find(e=>e.id==='FC6O'));state.autoBake=false;clearTimeout(bakeTimer);});
 const original=await p.evaluate(()=>({id:state.repId,burn:state.P.burn,spread:state.P.sparkSpread}));
 // 仅全新测试浏览器中操作，未连接用户配方目录。
 await p.evaluate(()=>{state.P.sparkSpread=.26;onParam();clearTimeout(bakeTimer);});
 await p.locator('#abSave').click();await p.locator('#saveNameInput').fill('FC6O 临时验证副本');await p.locator('#saveNameSubmit').click();
 await p.waitForFunction(()=>lib.my&&lib.my.id);const saved=await p.evaluate(()=>({id:lib.my.id}));
 await p.reload();await p.waitForFunction(()=>window.__fw&&__fw.idle());
 const reopened=await p.evaluate(async s=>{await openMyEffect(s.id);clearTimeout(bakeTimer);const r=layerEntryOf(state.layers[0]);return{spread:r.P.sparkSpread,burn:r.P.burn};},saved);
 if(reopened.spread!==.26||reopened.burn!==1.2)throw Error('保存刷新不一致');
 await p.goto(pathToFileURL(path.resolve('analysis/results/FC6O_FanGold10/对照回放.html')).href);
 await p.waitForFunction(()=>document.getElementById('left').naturalWidth>0);await p.locator('#play').click();await p.locator('#time').fill('45');await p.locator('#time').dispatchEvent('input');
 const before=await p.locator('#stamp').innerText();await p.locator('#play').click();await p.waitForFunction(()=>document.getElementById('stamp').textContent!=='1.50 s');await p.locator('#play').click();
 await p.locator('#plat').selectOption('Mobile');await p.locator('#time').fill('45');await p.locator('#time').dispatchEvent('input');
 await p.screenshot({path:'analysis/local/CS3-FanGold10/viewer-mobile.png'});
 fs.writeFileSync('analysis/results/FC6O_FanGold10/页面操作核对.json',JSON.stringify({original,reopened,saveRefresh:true,export:'baseline/perstar 已通过真实 __fw.exportFiles 生成 PC/手机 ZIP；标准未通过，非正式交付',viewer:{before,play:true,mobile:true},errors},null,2));console.log('UI checked',errors);
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
