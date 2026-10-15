// 隔离浏览器验证默认兼容、真实存档拨参、统一面板、完整PC/手机导出。
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),{execFileSync}=require('child_process'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'analysis/results/SparkScales'),local=path.join(root,'analysis/local/SparkScales');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(local,{recursive:true});
const source=path.join(root,'analysis/我的配方/my_fxmv9h8webs6bnz/正式资产-窜天猴尾焰-粒子__fxmv9h8webs6bnz.json'),raw=fs.readFileSync(source),saved=JSON.parse(raw);
const keys=['scaleCone','scaleCount','scaleWidth','scaleLife','scaleGain'];
const report={source:path.relative(root,source),sourceSHA:crypto.createHash('sha256').update(raw).digest('hex'),defaultFrames:0,effective:[],errors:[]};
const png=(name,url)=>fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(url.split(',')[1],'base64'));
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});try{
 const old=path.join(local,'baseline-4.9.104.html');fs.writeFileSync(old,execFileSync('git',['show','4d251718:tool/FireworkBaker.html'],{cwd:root,maxBuffer:20e6}).toString('utf8').replace('<head>','<head><base href="../../../tool/">'));
 const pages=[];for(const file of [old,path.join(root,'tool/FireworkBaker.html')]){const p=await browser.newPage();await p.addInitScript('window.requestAnimationFrame=()=>0');await p.goto(pathToFileURL(file).href+'?fast');await p.waitForFunction(()=>window.__fw);await p.evaluate(()=>{clearTimeout(bakeTimer);state.autoBake=false;state.playing=false;state.stillBusy=true;});pages.push(p);}
 for(const id of ['SGR1','SGS1'])for(const camera of [0,1])for(const flow of [0,1]){
  const images=[];for(const [i,p]of pages.entries())images.push(await p.evaluate(async({id,camera,flow,i,keys})=>{const {P,M}=replicaPM(id);P.cameraMotion=camera;P.cameraDof=camera;P.sparkGraph.fieldEnabled=flow;if(i)keys.forEach(k=>P.sparkGraph[k]=1);return (await renderStills40(P,M,{px:512,times:[.4,.9,1.75]})).map(f=>f.png);},{id,camera,flow,i,keys}));
  assert.deepEqual(images[0],images[1]);report.defaultFrames+=3;console.log('默认相同',id,camera,flow);
 }
 const p=pages[1];
 const impact=await p.evaluate(async({saved,keys})=>{const {P,M}=saved.snap.layers[0],original=JSON.stringify(P),r=[];
  const base=(await renderStills40(P,M,{px:512,times:[.4,.9,1.75]})).map(f=>f.png);
  for(const key of keys){const changed=structuredClone(P);changed.sparkGraph[key]=key==='scaleCone'?.65:key==='scaleLife'?1.25:1.5;const pics=(await renderStills40(changed,M,{px:512,times:[.4,.9,1.75]})).map(f=>f.png);r.push({key,value:changed.sparkGraph[key],changed:pics.some((s,i)=>s!==base[i]),png:pics[1]});}
  if(JSON.stringify(P)!==original)throw Error('存档副本原始值发生变化');return{base:base[1],r};},{saved,keys});
 png('用户存档-默认1',impact.base);for(const r of impact.r){assert(r.changed,r.key+'无画面变化');png('用户存档-'+r.key,r.png);delete r.png;report.effective.push(r);}console.log('真实存档五项拨参均有效');
 await Promise.all(pages.map(p=>p.close()));
 const ui=await browser.newPage({viewport:{width:1600,height:1000}});ui.on('pageerror',e=>report.errors.push(e.message));await ui.goto(pathToFileURL(path.join(root,'tool/FireworkBaker.html')).href+'?fast');await ui.waitForFunction(()=>window.__fw);await ui.evaluate(()=>{graphOpen('rocket');state.playing=false;});await ui.waitForFunction(()=>wbIdle()&&!!wb.sig&&!!undo.last,null,{timeout:120000});await ui.waitForTimeout(500);await ui.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);});
 await ui.locator('summary:visible').filter({hasText:/整体调整/}).evaluate(e=>e.parentElement.open=true);
 const width=ui.getByRole('spinbutton',{name:'粒子直径倍率（×） 数值',exact:true});assert.equal(Number(await width.inputValue()),1);await width.fill('1.3');await width.press('Tab');await ui.waitForTimeout(150);assert.equal(await ui.evaluate(()=>state.P.sparkGraph.scaleWidth),1.3);
 await ui.evaluate(()=>undoStep(-1));assert.equal(await ui.evaluate(()=>pGet(state.P,'sparkGraph.scaleWidth')),1);await ui.evaluate(()=>undoStep(1));assert.equal(await ui.evaluate(()=>state.P.sparkGraph.scaleWidth),1.3);
 await ui.locator('.sl').filter({has:width}).locator('.rrst').click();assert.equal(await ui.evaluate(()=>pGet(state.P,'sparkGraph.scaleWidth')),1);
 await width.fill('1.3');await width.press('Tab');await ui.waitForTimeout(150);
 const cone=ui.getByRole('spinbutton',{name:'半锥角倍率（×） 数值',exact:true});await cone.fill('100');await cone.press('Tab');assert.equal(await ui.evaluate(()=>pGet(state.P,'sparkGraph.scaleCone')),1);
 await ui.locator('#abSave').click();await ui.locator('#saveNameInput').fill('整体倍率自动检查');await ui.locator('#saveNameSubmit').click();await ui.waitForFunction(()=>lib.my&&lib.my.name==='整体倍率自动检查');const myId=await ui.evaluate(()=>lib.my.id);
 await ui.reload();await ui.waitForFunction(()=>window.__fw);await ui.evaluate(async id=>{await openMyEffect(id);state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;},myId);assert.equal(await ui.evaluate(()=>state.P.sparkGraph.scaleWidth),1.3);
 await ui.locator('summary:visible').filter({hasText:/整体调整/}).evaluate(e=>e.parentElement.open=true);await ui.screenshot({path:path.join(out,'统一右栏.png')});
 const inert=await ui.evaluate(()=>{const P=structuredClone(state.P);P.sparkGraph.emitters.forEach(e=>e.directionMode='sphere');return inertWhy('sparkGraph.scaleCone',P);});assert(inert.includes('球形'));report.ui={edit:true,undoRedo:true,reset:true,saveReload:true,invalidAngleRejected:true,sphereInert:true};console.log('统一入口/撤销/还原/保存刷新通过');
 // 测试副本：五项非1一起经过正式导出，不覆盖任何推荐候选或用户资源。
 const exported=await ui.evaluate(async()=>{state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;state.stillBusy=true;const {P,M}=replicaPM('SGR1');Object.assign(P.sparkGraph,{scaleCone:.8,scaleCount:1.2,scaleWidth:1.1,scaleLife:1.1,scaleGain:.9});const start=performance.now(),bytes=await __fw.exportFiles(P,M,'SparkScales_Check',{naming:false,size:'none'});let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return{base64:btoa(s),P,M,version:VERSION,exportMs:performance.now()-start};});
 fs.writeFileSync(path.join(out,'倍率样例.zip'),Buffer.from(exported.base64,'base64'));delete exported.base64;fs.writeFileSync(path.join(out,'倍率样例-导出参数.json'),JSON.stringify(exported,null,2));report.exportMs=exported.exportMs;report.version=exported.version;
 assert.deepEqual(report.errors,[]);assert(fs.readFileSync(source).equals(raw),'用户原存档发生变化');report.pass=true;fs.writeFileSync(path.join(out,'入口与默认回归.json'),JSON.stringify(report,null,2));console.log('默认24帧、存档拨参、统一入口、非1正式PC/手机包已生成');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
