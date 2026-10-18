/* 金芒菊·大 淡紫试色（烟花编排（22）-本机，用户 10-18 22:05「淡紫ramp需要你在烘培器做一个出来给我试试……你复制一个弄」）。
   以 JMB1 实际导出的 P/M 为底：--probe 量花径 + 出对比定帧；--export 按坝顶中号 150 m 档导出推荐色。只读烘焙器，不改源码。 */
const fs=require('node:fs'),path=require('node:path'),{chromium}=require(process.env.FW_PLAYWRIGHT||'playwright');
const R=path.resolve(__dirname,'../..'),O=path.join(R,'analysis/results/JMBV_淡紫试色_20261018'),W=path.join(O,'work');fs.mkdirSync(W,{recursive:true});
const base=JSON.parse(fs.readFileSync(path.join(R,'analysis/results/GoldRayBurst/候选参数.json'),'utf8'));
const plan=JSON.parse(fs.readFileSync(path.join(O,'试色方案.json'),'utf8'));
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});try{
 const pg=await b.newPage(),errors=[];pg.on('pageerror',e=>errors.push(e.message));await pg.addInitScript('window.requestAnimationFrame=()=>0');
 await pg.goto('http://127.0.0.1:8034/baker?fast');await pg.waitForFunction(()=>window.__fw);
 await pg.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;state.stillBusy=true;});
 if(process.argv.includes('--probe')){
  const info=await pg.evaluate(({base,plan})=>{const m=(P)=>metricsOf(P,measure(P));const core=__fw.replicaPM(plan.coreFrom),outer=__fw.replicaPM(plan.coreOuterRef);
   return{version:VERSION,jmb1:m(base.P),core:m(core.P),coreOuter:m(outer.P),coreP:{stars:core.P.stars,v0:core.P.v0,burn:core.P.burn,ignDelay:core.P.ignDelay,type:core.P.type},coreM:core.M};},{base,plan});
  fs.writeFileSync(path.join(W,'量值.json'),JSON.stringify(info,null,2));console.log(JSON.stringify(info));
  const times=plan.times;
  for(const v of plan.variants){const M={...base.M,...v.m};const pics=await pg.evaluate(async({P,M,times})=>(await renderStills40(P,M,{px:384,times})).map(f=>f.png),{P:base.P,M,times});
   pics.forEach((p,i)=>fs.writeFileSync(path.join(W,`${v.id}-${i}.png`),Buffer.from(p.split(',')[1],'base64')));}
  if(plan.combo&&!process.argv.includes("--nocombo")){const pics=await pg.evaluate(async({base,plan,times})=>{const core=__fw.replicaPM(plan.coreFrom);const layers=[{P:base.P,M:base.M,delay:0,headInt:base.M.headInt,scale:1},{P:core.P,M:{...core.M,...plan.combo.coreM},delay:plan.combo.delay||0,headInt:(plan.combo.coreM.headInt!=null?plan.combo.coreM.headInt:core.M.headInt),scale:plan.combo.coreScale}];
    return (await mtRenderLayers(layers,{px:384,times})).map(f=>f.png);},{base,plan,times});
   pics.forEach((p,i)=>fs.writeFileSync(path.join(W,`combo-${i}.png`),Buffer.from(p.split(',')[1],'base64')));
   const gold=await pg.evaluate(async({base,times})=>(await mtRenderLayers([{P:base.P,M:base.M,delay:0,headInt:base.M.headInt,scale:1}],{px:384,times})).map(f=>f.png),{base,times});
   gold.forEach((p,i)=>fs.writeFileSync(path.join(W,`combogold-${i}.png`),Buffer.from(p.split(',')[1],'base64')));}
 }
 if(process.argv.includes('--export')){const v=plan.variants.find(x=>x.id===plan.pick);const M={...base.M,...v.m};
  const out=await pg.evaluate(async({P,M,name,size})=>{const bytes=await __fw.exportFiles(P,M,name,{naming:false,size});let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return{base64:btoa(s),version:VERSION,P,M};},{P:base.P,M,name:plan.exportName,size:plan.exportSize});
  fs.writeFileSync(path.join(O,plan.exportName+'.zip'),Buffer.from(out.base64,'base64'));delete out.base64;fs.writeFileSync(path.join(O,'实包参数.json'),JSON.stringify(out,null,2));
  const ramps=await pg.evaluate(async rs=>{const o={};for(const [k,M] of Object.entries(rs)){const u8=await encodePNG(rampPixels(M),256,8);const ab=u8 instanceof Blob?new Uint8Array(await u8.arrayBuffer()):u8;let s='';for(let i=0;i<ab.length;i+=32768)s+=String.fromCharCode(...ab.subarray(i,i+32768));o[k]=btoa(s);}return o;},plan.ramps);
  for(const [k,b64] of Object.entries(ramps))fs.writeFileSync(path.join(O,k+'.png'),Buffer.from(b64,'base64'));
  for(const [tag,coreM] of [['芯_原金菊蕊',null],['芯_淡紫',plan.combo.coreM]]){const o=await pg.evaluate(async({id,coreM,name})=>{const r=__fw.replicaPM(id);const M=coreM?{...r.M,...coreM}:r.M;const bytes=await __fw.exportFiles(r.P,M,name,{naming:false,size:'none'});let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);},{id:plan.coreFrom,coreM,name:'EFX_FireWorks_JMBV_'+(coreM?'CoreLilac':'CoreGold')});fs.writeFileSync(path.join(W,tag+'.zip'),Buffer.from(o,'base64'));}
 }
 if(errors.length)throw Error(errors.join('\n'));console.log('ok',errors.length);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
