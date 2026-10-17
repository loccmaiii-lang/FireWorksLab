// 在本机预检通过的HTTP正式入口运行参数副本；不写共享源码或用户配方。
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'analysis/results/SparklerMotion');
const inputs=['基线参数.json','候选参数.json'].map(n=>JSON.parse(fs.readFileSync(path.join(out,n),'utf8')));
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});try{
 const p=await b.newPage({viewport:{width:1500,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript('window.requestAnimationFrame=()=>0');
 await p.goto('http://127.0.0.1:8034/baker?fast');await p.waitForFunction(()=>window.__fw&&typeof SparkGraph!=='undefined');
 const report=await p.evaluate(async inputs=>{state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;state.stillBusy=true;
  const median=a=>a.sort((x,y)=>x-y)[Math.floor(a.length/2)],rows=[];
  for(const [index,{P,M}]of inputs.entries()){
   const G=SparkGraph.build(P.sparkGraph),stats=[];
   for(const e of P.sparkGraph.emitters){const arr=G.byId.get(e.id),sample=arr.filter((q,i)=>i%Math.max(1,Math.floor(arr.length/300))===0),initial=[],retention=[];
    for(const q of sample){initial.push(Math.hypot(...q.v));const a=q.life*.15,z=q.life*.85,A=SparkGraph.sample(q,a).v,B=SparkGraph.sample(q,z).v;
     // 投影到初速方向分离重力引起的后段增速，观察原抛射动量是否衰减。
     const v0=Math.hypot(...q.v)||1,pa=A.reduce((s,v,i)=>s+v*q.v[i]/v0,0),pb=B.reduce((s,v,i)=>s+v*q.v[i]/v0,0);if(pa>1e-6)retention.push(pb/pa);
    }
    const sorted=initial.sort((a,b)=>a-b);stats.push({id:e.id,name:e.name,count:arr.length,speedMedian:median([...initial]),speedP10:sorted[Math.floor(sorted.length*.1)],speedP90:sorted[Math.floor(sorted.length*.9)],forwardRetentionMedian:median(retention)});
   }
   const shot=structuredClone(P);shot.sparkGraph.bounds=inputs[1].P.sparkGraph.bounds;
   const pictures=await renderStills40(shot,M,{px:768,times:[.24,.4,.89,1.3,1.73]});
   rows.push({index,count:G.all.length,stats,pictures:pictures.map(x=>({t:x.t,png:x.png}))});
  }return{version:VERSION,rows};},inputs);
 for(const r of report.rows)for(const [i,f] of r.pictures.entries())fs.writeFileSync(path.join(out,(r.index?'候选':'基线')+'-'+i+'.png'),Buffer.from(f.png.split(',')[1],'base64'));
 report.rows.forEach(r=>delete r.pictures);assert.equal(report.rows[0].count,report.rows[1].count);assert.deepEqual(errors,[]);report.errors=errors;
 fs.writeFileSync(path.join(out,'速度诊断.json'),JSON.stringify(report,null,2));console.log('候选同13形态同数量，5时刻同取景对照与速度诊断完成，HTTP版本',report.version);
 if(process.argv.includes('--export')){const v=await p.evaluate(async({P,M})=>{const start=performance.now(),a=await __fw.exportFiles(P,M,'EFX_FireWorks_Sparkler_Motion_Test',{naming:false,size:'none'});let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return{base64:btoa(s),P,M,version:VERSION,ms:performance.now()-start};},inputs[1]);fs.writeFileSync(path.join(out,'候选素材包.zip'),Buffer.from(v.base64,'base64'));delete v.base64;fs.writeFileSync(path.join(out,'候选导出.json'),JSON.stringify(v,null,2));console.log('候选实际PC/手机素材包生成完成');}
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
