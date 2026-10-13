// 分层视觉核对：每层按30fps选可见数量最多的帧，复用正式渲染与曝光。
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'analysis/results/SparkGraph');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});try{
 const p=await browser.newPage();await p.goto(pathToFileURL(path.join(root,'tool/FireworkBaker.html')).href+'?fast');await p.waitForFunction(()=>window.__fw&&REPLICA_BY_ID.SGS1);
 const a=await p.evaluate(async()=>{state.stillBusy=true;const {P,M}=replicaPM('SGS1'),R=makeGraphRenderer(P),pl=graphPlan(P),N=512;canvas.width=N;canvas.height=N;hdrT?.dispose();hdrT=new Target(N,N,gl.RGBA16F,true);const cell=new Target(N,N,gl.RGBA16F),samples=new Target(N,N,gl.RGBA16F),rows=[];
 for(const e of P.sparkGraph.emitters){let max=-1,t=0;for(let i=0;i<64;i++){const n=R.graph.byId.get(e.id).filter(q=>SparkGraph.mod(i/30-q.birth,pl.duration)<q.life).length;if(n>max){max=n;t=i/30;}}R.solo=e.id;renderCell40(P,pl,R,t,samples,cell);hdrT.clear();hdrT.bind();shadeCell40(P,M,cell,t);post();rows.push({id:e.id,name:e.name,t,count:max,image:canvas.toDataURL()});}return rows;});
 for(const x of a){fs.writeFileSync(path.join(out,'形态-'+x.id+'.png'),Buffer.from(x.image.split(',')[1],'base64'));delete x.image;}fs.writeFileSync(path.join(out,'形态对照.json'),JSON.stringify(a,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
