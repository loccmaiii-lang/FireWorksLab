const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'analysis/results/SparkGraph');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});try{
const p=await browser.newPage({viewport:{width:1500,height:1000}});p.on('pageerror',e=>console.log('PAGEERROR',e.stack));p.on('console',msg=>{if(msg.type()==='error')console.log('CONSOLE',msg.text())});
await p.goto(pathToFileURL(path.join(out,'烘焙器.html')).href+'?fast');await p.waitForFunction(()=>typeof graphOpen==='function'&&state.P.sparkGraph,null,{timeout:30000});
for(const key of ['rocket','sparkler']){
 await p.evaluate(key=>{graphOpen(key);clearTimeout(bakeTimer);state.autoBake=false;state.playing=false;state.stillBusy=true;state.t=.87;},key);
 const result=await p.evaluate(async()=>{const P=state.P,M=state.M,R=makeGraphRenderer(P),pl=graphPlan(P),N=800;canvas.width=N;canvas.height=N;hdrT&&hdrT.dispose();hdrT=new Target(N,N,gl.RGBA16F,true);const cell=new Target(N,N,gl.RGBA16F),samples=new Target(N,N,gl.RGBA16F);const times=[.1,.23,.4,.69,.9,1.3,1.56,1.9],images=[];
 for(const t of times){renderCell40(P,pl,R,t,samples,cell);hdrT.clear();hdrT.bind();shadeCell40(P,M,cell,t);post();images.push(canvas.toDataURL());}R.dispose();cell.dispose();samples.dispose();return{images,times,version:VERSION,P,M};});
 result.images.forEach((u,i)=>fs.writeFileSync(path.join(out,key+'-'+i+'.png'),Buffer.from(u.split(',')[1],'base64')));delete result.images;fs.writeFileSync(path.join(out,key+'-参数.json'),JSON.stringify(result,null,2));await p.screenshot({path:path.join(out,key+'-界面.png')});console.log(key,'captured');
} }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
