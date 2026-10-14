// 正式API导出唯一候选与关闭新控制的回归包；不改用户库。
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const O=path.resolve('analysis/results/FG_Afterburn'),baseline=JSON.parse(fs.readFileSync('analysis/results/FG_Sync_4984/anchor-parameters.json','utf8'));fs.mkdirSync(O,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('tool/FireworkBaker.html')).href+'?fast');await p.waitForFunction(()=>window.__fw&&__fw.idle(),null,{timeout:180000});
 await p.evaluate(()=>{clearTimeout(bakeTimer);state.stillBusy=true;state.autoBake=false;state.playing=false});
 for(const variant of ['baseline','anchor']){const start=Date.now();
 const r=await p.evaluate(async ({variant,baseline})=>{const r=variant==='baseline'?{P:{...baseline.P},M:{...baseline.M}}:replicaPM('FC6O');const ver=variant==='baseline'?baseline.entryVersion:entryVer(FW_REVIEW_LIST.find(e=>e.id==='FC6O'));const bytes=await __fw.exportFiles(r.P,r.M,'FanComet_Gold',{entry:'FC6O'});let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return{...r,version:VERSION,entryVersion:ver,zip:btoa(s)};},{variant,baseline});fs.writeFileSync(path.join(O,variant+'.zip'),Buffer.from(r.zip,'base64'));delete r.zip;r.seconds=(Date.now()-start)/1000;fs.writeFileSync(path.join(O,variant+'-parameters.json'),JSON.stringify(r,null,2));console.log(variant,'exported',r.seconds+'s');}
 if(errors.length)throw Error(errors.join('\n'));
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
