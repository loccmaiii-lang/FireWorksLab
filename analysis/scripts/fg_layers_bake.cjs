const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const O=path.resolve('analysis/results/FG_Layers');fs.mkdirSync(O,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});try{
 const p=await b.newPage();p.on('pageerror',e=>console.error(e.message));await p.goto(pathToFileURL(path.resolve('tool/FireworkBaker.html')).href+'?fast');await p.waitForFunction(()=>window.__fw&&__fw.idle(),null,{timeout:180000});
 await p.evaluate(()=>{clearTimeout(bakeTimer);state.stillBusy=true;state.autoBake=false;state.playing=false});
 for(const variant of ['template','anchor']){
 const r=await p.evaluate(async variant=>{const r=replicaPM('FC6O');r.P.zoom=variant==='anchor'?'anchor':'on';const ver=entryVer(FW_REVIEW_LIST.find(e=>e.id==='FC6O'));const bytes=await __fw.exportFiles(r.P,r.M,'FanGold_Layers',{entry:'FC6O'});let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return{...r,version:VERSION,entryVersion:ver,zip:btoa(s)};},variant);fs.writeFileSync(path.join(O,variant+'.zip'),Buffer.from(r.zip,'base64'));delete r.zip;fs.writeFileSync(path.join(O,variant+'-parameters.json'),JSON.stringify(r,null,2));console.log(variant,'exported');
 }
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
