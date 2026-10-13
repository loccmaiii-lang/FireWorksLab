const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'analysis/results/CS3_LateMotion'),variant=process.argv[2]||'baseline';
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});try{
 const p=await b.newPage();p.on('pageerror',e=>console.error('PAGE',e.message));
 await p.goto(pathToFileURL(path.join(out,variant+'.html')).href+'?fast');await p.waitForFunction(()=>window.__fw&&__fw.idle(),null,{timeout:180000});
 await p.evaluate(()=>{clearTimeout(bakeTimer);state.stillBusy=true;state.autoBake=false;state.playing=false;});
 const probe=await p.evaluate(()=>{const ids=['CSLTC-T','CSLTC-H','CSLTS'];return Object.fromEntries(ids.map(id=>{const r=replicaPM(id),ball=rtBallistic(r.P);return[id,{...r,T:ball.T,peak:ball.pos(ball.T),version:VERSION}]}));});
 fs.writeFileSync(path.join(out,variant+'-参数.json'),JSON.stringify(probe,null,2));console.log(variant,'times',Object.fromEntries(Object.entries(probe).map(([id,r])=>[id,r.T])));
 for(const id of ['CSLTC','CSLTS']){
  const t0=performance.now();const data=await p.evaluate(async id=>{let u;if(id==='CSLTC'){
   state.tab='combo';const e=FW_REVIEW_LIST.find(e=>e.id===id);lib.effect=effectOfEntry(e);await applyCombo(e.combo);
   const files=await comboPackFiles('CometLate_Test',state.layers);u=new Uint8Array(await(await makeZip(files)).arrayBuffer());
  }else{const r=replicaPM(id);state.tab='master';state.P=r.P;state.M=r.M;u=await __fw.exportFiles(r.P,r.M,'SilverLate_Test',{entry:id});}
  let s='';for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode(...u.subarray(i,i+32768));return btoa(s);},id);
  fs.writeFileSync(path.join(out,variant+'-'+id+'.zip'),Buffer.from(data,'base64'));console.log(variant,id,'done ms',Math.round(performance.now()-t0));
 }
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
