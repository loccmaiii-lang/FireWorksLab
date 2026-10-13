const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'analysis/results/SparkGraph');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});try{
 const p=await browser.newPage();p.on('pageerror',e=>console.log('PAGE',e.message));await p.goto(pathToFileURL(path.join(root,'tool/FireworkBaker.html')).href+'?fast');await p.waitForFunction(()=>window.__fw&&REPLICA_BY_ID.SGR1);
 for(const key of ['rocket','sparkler']){
  const result=await p.evaluate(async key=>{clearTimeout(bakeTimer);state.autoBake=false;state.playing=false;state.stillBusy=true;const id=key==='rocket'?'SGR1':'SGS1',{P,M}=replicaPM(id),entry=FW_REVIEW_LIST.find(e=>e.id===id),name=key==='rocket'?'RocketTail_Graph':'Sparkler_Graph';const a=await __fw.exportFiles(P,M,name,{naming:false,size:'none',entry:id});let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return{base64:btoa(s),P,M,entry:id,ver:entryVer(entry),version:VERSION};},key);
  fs.writeFileSync(path.join(out,key+'.zip'),Buffer.from(result.base64,'base64'));delete result.base64;fs.writeFileSync(path.join(out,key+'-导出参数.json'),JSON.stringify(result,null,2));console.log(key,'exported');
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
