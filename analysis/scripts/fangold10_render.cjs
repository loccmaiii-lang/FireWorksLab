const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const variant=process.argv[2]||'baseline',only=process.argv[3]||'all';
const out=path.resolve('analysis/local/CS3-FanGold10');fs.mkdirSync(out,{recursive:true});
const result=path.resolve('analysis/results/FC6O_FanGold10');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});try{
 const p=await b.newPage();p.on('pageerror',e=>console.error(e.message));
 const html=variant==='baseline'?'tool/FireworkBaker.html':path.join(out,variant+'.html');
 await p.goto(pathToFileURL(path.resolve(html)).href+'?fast');await p.waitForFunction(()=>window.__fw&&__fw.idle(),null,{timeout:180000});
 const meta=await p.evaluate(()=>{clearTimeout(bakeTimer);state.stillBusy=true;state.autoBake=false;state.playing=false;const r=__fw.replicaPM('FC6O');state.P=r.P;state.M=r.M;const pl=displayPlan40(derive({...fxP(r.P)}));return{...r,version:VERSION,ver:entryVer(FW_REVIEW_LIST.find(e=>e.id==='FC6O')),plan:pl};});
 fs.writeFileSync(path.join(result,variant+'-parameters.json'),JSON.stringify(meta,null,2));
 if(only!=='export'){
 const frames=await p.evaluate(async()=>{const r=__fw.replicaPM('FC6O');return __fw.renderStills(r.P,r.M,{times:[.5,1,1.5,2,2.3,2.6,2.9,3.1],px:640,half:24,cy:16});});
 for(const f of frames)fs.writeFileSync(path.join(out,variant+'-'+f.t+'.png'),Buffer.from(f.png.split(',')[1],'base64'));
 console.log(variant,'stills done');}
 if(only!=='stills'){
 const r=await p.evaluate(async()=>{const r=__fw.replicaPM('FC6O'),buf=await __fw.exportFiles(r.P,r.M,'FanGold10',{entry:'FC6O'});let s='';for(let i=0;i<buf.length;i+=32768)s+=String.fromCharCode(...buf.subarray(i,i+32768));return btoa(s);});
 fs.writeFileSync(path.join(out,variant+'.zip'),Buffer.from(r,'base64'));console.log(variant,'export done');}
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
