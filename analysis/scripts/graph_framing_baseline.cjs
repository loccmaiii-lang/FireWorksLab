/* 取景修复的默认像素基线：正式 HTTP、隔离浏览器、同一份冻结参数；不导出完整序列、不改用户资料。 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const R=path.resolve(__dirname,'../..'),O=path.join(R,'analysis/results/GraphFraming'),beforeFile=path.join(O,'默认基线前.json'),compare=process.argv.includes('--compare');
const BASELINE_REF='cd525fb0b98fdbfd8d1cd8072261f81b172e518c'; // 修复前4.9.117，固定参照，提交后不随HEAD漂移。
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
async function mapping(){
 execFileSync('python',['-X','utf8','tool/local_http/preflight.py','--tool','baker','--start'],{cwd:R,stdio:'inherit'});
 const unchanged={};for(const f of ['30_plan.js','31_plan40.js']){const file='tool/src/js/'+f;unchanged[file]=fs.readFileSync(path.join(R,file),'utf8').replace(/\r\n/g,'\n')===execFileSync('git',['show',BASELINE_REF+':'+file],{cwd:R,encoding:'utf8',maxBuffer:8e6}).replace(/\r\n/g,'\n');}
 const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});try{const p=await b.newPage();await p.addInitScript('window.requestAnimationFrame=()=>0');await p.goto('http://127.0.0.1:8034/baker?fast');await p.waitForFunction(()=>window.__fw);
 const report=await p.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;state.stillBusy=true;const rows=[],entries=[],missing=[],seen=new Map();
  for(const ef of FW_EFFECTS.filter(e=>['待验收','已通过'].includes(e.阶段))){const id=ef.待验收版||ef.主条目,e=entryById(id);if(!e){missing.push(id);continue;}const ids=e.formal?[e.formal.id]:e.kind==='combo'?e.layerIds||[]:[e.id];entries.push({effect:ef.key,stage:ef.阶段,entry:id,layers:ids});for(const x of ids){if(!REPLICA_BY_ID[x])missing.push(id+':'+x);else if(!seen.has(x))seen.set(x,replicaPM(x));}}
  for(const [id,{P}]of seen){let graphPlanSame=null;const plans=[];
   if(P.sparkGraph){const old=loopPlan(P,P.sparkGraph.bounds,P.sparkGraph.period),F=old.L.F;old.keys=F>1?[[0,.02],[(F-1)/F,F-1+.02],[1,F-.01]]:[[0,0]];old.frameTiming='loop-tick-start';const now=graphPlan(P),take=x=>({cx:x.cx||0,cy:x.cy,HX:x.HX,HY:x.HY,Ww:x.Ww,Wh:x.Wh,px:x.px,py:x.py,times:x.times,keys:x.keys,sizeKeys:x.sizeKeys});graphPlanSame=JSON.stringify(take(old))===JSON.stringify(take(now));plans.push(now);
   }else{
    // 非粒子图的取景/时间计划函数源码不变：检查其不含cx的元数据在任意合法横竖缩放下的默认映射。
    // 这里不假装重跑全部昂贵的取景测量；使用覆盖固定/Zoom/横竖独立/路径的计划形态。
    const base={duration:P.duration||P.loopT||1,cy:7.25,HX:13.75,HY:21.5,Ww:27.5,Wh:43,zoom:false,sizeKeys:[[0,.1],[1,1]]};
    plans.push(base,{...base,zoom:true},{...base,zoom:true,anchor:true},{...base,aniso:true,sizeKeysX:[[0,.2],[1,1]],sizeKeysY:[[0,.4],[1,1]]},{...base,path:{x0:1,y0:2,vx:3,vy:4,ax:.5,ay:9.81,k:.2}});
   }
   let max=0;for(const pl of plans)for(let i=0;i<=64;i++){const t=pl.duration*i/64,s=sizeXY(pl,t),old=pl.path?pathXY(pl.path,clamp(t,0,pl.duration)):[0,pl.cy*s[1]],now=centerAt(pl,t);max=Math.max(max,...now.map((x,j)=>Math.abs(x-old[j])));}
   rows.push({id,type:P.type,graph:!!P.sparkGraph,graphPlanSame,defaultMappingMaxDiff:max,planFormsChecked:plans.length,sampleTimesPerForm:65});
  }
  return{version:VERSION,entries,rows,missing,pass:!missing.length&&rows.every(r=>r.defaultMappingMaxDiff===0&&r.graphPlanSame!==false)};
 });report.unchangedNonGraphPlanSources=unchanged;report.pass&&=Object.values(unchanged).every(Boolean);report.scope='所有现行待验收/已通过条目及组合层；粒子图实际计划；其余计划函数源码等同与固定/Zoom/独立横竖/路径的默认cx映射数学核对，不是全量真实取景重测。';fs.writeFileSync(path.join(O,'全现行条目默认映射检查.json'),JSON.stringify(report,null,2)+'\n');console.log('现行条目映射',report.entries.length,'条目',report.rows.length,'独立层',report.pass);assert(report.pass);
 }finally{await b.close();}
}
async function batchCompare(){
 execFileSync('python',['-X','utf8','tool/local_http/preflight.py','--tool','baker','--start'],{cwd:R,stdio:'inherit'});
 const legacySource=execFileSync('git',['show',BASELINE_REF+':tool/src/js/46_graph_model.js'],{cwd:R,encoding:'utf8',maxBuffer:8e6}).split('// =====================================================================')[0];
 assert(!legacySource.includes('onBatch'),'参照必须取分批修复前模拟核');
 const reference=legacySource.replace('n>8192||out.length/12+n>1500000','n>8192');assert(reference!==legacySource,'测试参照未找到旧内存上限');
 const forced=process.argv.includes('--forced-batch'),streamingSource=forced?fs.readFileSync(path.join(R,'tool/src/js/46_graph_model.js'),'utf8').split('// =====================================================================')[0].replace('>1500000','>75000'):null;
 const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript('window.requestAnimationFrame=()=>0');await p.goto('http://127.0.0.1:8034/baker?fast');await p.waitForFunction(()=>window.__fw);
 await p.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;state.stillBusy=true;});const rows=[];
 for(const id of ['SGS1','SGR1','SGRS1']){const r=await p.evaluate(async({id,reference,streamingSource})=>{if(!String(SparkGraph.cameraGeometry).includes('onBatch'))throw Error('页面尚未构建分批修复');
  const actualGeometry=SparkGraph.cameraGeometry;if(streamingSource)SparkGraph.cameraGeometry=eval('(()=>{'+streamingSource+';return SparkGraph})()').cameraGeometry;
  const Legacy=eval('(()=>{'+reference+';return SparkGraph})()'),{P,M}=replicaPM(id),at=.89,px=512,pl=graphPlan(P),view=frameView40(pl,at),q=qualityOf(P),ppm=px*q.ss/(2*view[2]),ppmY=px*q.ss/(2*view[3]),g=SparkGraph.build(P.sparkGraph),parts=[];
  const expected=Legacy.cameraGeometry(g,at,P,Math.max(ppm,ppmY)),current=SparkGraph.cameraGeometry(g,at,P,Math.max(ppm,ppmY),null,data=>parts.push(data));parts.push(current.data);
  let max=0,i=0;for(const a of parts)for(const v of a){max=Math.max(max,Math.abs(v-expected.data[i++]));}if(i!==expected.data.length)throw Error('分批样本数不同');
  const actualDraw=drawCameraGraph,render=async()=>{const[f]=await renderStills40(P,M,{px,times:[at]});const im=await createImageBitmap(await(await fetch(f.png)).blob()),a=new OffscreenCanvas(px,px),ctx=a.getContext('2d');ctx.drawImage(im,0,0);im.close();return ctx.getImageData(0,0,px,px).data;};let a,z;
  try{a=await render();drawCameraGraph=function(graph,P,time,view,ppm,weight,only){cameraGraphInit();const settings=LIVE_VIEW?{...P,cameraQuality:'fast'}:P,geo=Legacy.cameraGeometry(graph,time,settings,Math.max(ppm,PPMY||ppm),only);return drawCameraItems(geo.data,P,view,ppm,weight);};z=await render();}finally{drawCameraGraph=actualDraw;SparkGraph.cameraGeometry=actualGeometry;}
  let maxPixel=0,changed=0;for(let j=0;j<a.length;j++){const d=Math.abs(a[j]-z[j]);maxPixel=Math.max(maxPixel,d);if(d)changed++;}
  return{id,version:VERSION,bounds:P.sparkGraph.bounds,at,px,samples:expected.data.length/12,batches:parts.map(a=>a.length/12),geometryMaxDiff:max,geometryCountSame:i===expected.data.length,maxPixel,changedChannels:changed,pass:max===0&&maxPixel===0};
 },{id,reference,streamingSource});rows.push(r);console.log('分批软件对照',id,r.samples,r.batches,'max=',r.maxPixel);fs.writeFileSync(path.join(O,forced?'镜头强制分批严格对照.json':'镜头分批严格对照.json'),JSON.stringify({htmlSHA256:hash(fs.readFileSync(path.join(R,'tool/FireworkBaker.html'))),forcedThreshold:forced?75000:null,scope:'实际当前SGS1/SGR1/SGRS1，512px和原质量，.89秒；测试参照仅移除旧内存上限，以同样全量样本单批绘制，不改生产。'+(forced?' 为覆盖多次draw分支，仅在测试页将批次上限设75000，样本、曝光权重与顺序不变。':''),complete:rows.length===3,pass:rows.every(x=>x.pass),rows,errors},null,2)+'\n');assert(r.pass);}
 assert.deepEqual(errors,[]);
 }finally{await b.close();}
}
async function diagnose(){
 execFileSync('python',['-X','utf8','tool/local_http/preflight.py','--tool','baker','--start'],{cwd:R,stdio:'inherit'});
 const baseline=JSON.parse(fs.readFileSync(beforeFile,'utf8')),rows=[];
 const software=process.argv.includes('--software');
 const b=await chromium.launch({channel:'msedge',headless:true,args:software?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--use-angle=d3d11']});
 try{const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript('window.requestAnimationFrame=()=>0');await p.goto('http://127.0.0.1:8034/baker?fast');await p.waitForFunction(()=>window.__fw);
  await p.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;state.stillBusy=true;});
  const renderer=await p.evaluate(()=>{const e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
  if(process.argv.includes('--no-dither'))await p.evaluate(()=>gl.disable(gl.DITHER));
  const readback=process.argv.includes('--diagnose-readback');
  const samples=readback?baseline.cases.filter(c=>['template:kiku','entry:SGS1','saved:rocket-main'].includes(c.id)):baseline.cases;
  for(const c of samples){const r=await p.evaluate(async({c,readback})=>{
   const current={centerAt,graphPlan,bakeView,squareView};const at=c.times[Math.min(1,c.times.length-1)];
   const old={
    centerAt:function(m,age){if(m.path)return pathXY(m.path,clamp(age,0,m.duration));const s=sizeXY(m,age);return[0,m.cy*s[1]];},
    graphPlan:function(P){const b=P.sparkGraph.bounds,pl=loopPlan(P,b,P.sparkGraph.period),F=pl.L.F;pl.keys=F>1?[[0,.02],[(F-1)/F,F-1+.02],[1,F-.01]]:[[0,0],[1,0]];pl.frameTiming='loop-tick-start';return pl;},
    bakeView:function(m,sc=1){return[0,m.cy,m.HX*sc,m.HY*sc];},
    squareView:function(m){const h=Math.max(m.Ww,m.Wh)/2;return[0,m.cy,h,h];}
   };
   const set=x=>{centerAt=x.centerAt;graphPlan=x.graphPlan;bakeView=x.bakeView;squareView=x.squareView;};
   const run=async(P,M)=>{const original=canvas.toDataURL,oldMetrics=linearCellMetrics40;let raw=null,doublePNG=null,f,linear=null;
    if(readback)canvas.toDataURL=function(...args){raw=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,raw);doublePNG=original.apply(this,args);return original.apply(this,args);};
    if(readback)linearCellMetrics40=function(cell){linear=new Float32Array(cell.w*cell.h*4);cell.bind();gl.readPixels(0,0,cell.w,cell.h,gl.RGBA,gl.FLOAT,linear);return oldMetrics(cell);};
    try{[f]=await renderStills40(P,M,{px:c.px,times:[at],metrics:readback});}finally{canvas.toDataURL=original;linearCellMetrics40=oldMetrics;}
    const blob=await(await fetch(f.png)).blob(),im=await createImageBitmap(blob),a=new OffscreenCanvas(c.px,c.px),ctx=a.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);im.close();const pixels=ctx.getImageData(0,0,c.px,c.px).data;
    const digest=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(v=>v.toString(16).padStart(2,'0')).join('');
    return{png:f.png,doublePNG,rawSHA:raw?await digest(raw):null,linear,pixels,linearSHA:linear?await digest(linear):null,pixelSHA:await digest(pixels),pngSHA:await digest(await blob.arrayBuffer())};};
   const diff=(a,b)=>{let max=0,changedChannels=0,changedPixels=0,sum=0;for(let i=0;i<a.pixels.length;i+=4){let any=false;for(let j=0;j<4;j++){const d=Math.abs(a.pixels[i+j]-b.pixels[i+j]);max=Math.max(max,d);sum+=d;if(d){any=true;changedChannels++;}}if(any)changedPixels++;}return{same:max===0,max,changedPixels,changedChannels,totalPixels:c.px*c.px,sumAbs:sum};};
   let one,two,round,legacy;
   try{one=await run(c.P,c.M);two=await run(c.P,c.M);round=await run(JSON.parse(JSON.stringify(c.P)),JSON.parse(JSON.stringify(c.M)));set(old);legacy=await run(c.P,c.M);}finally{set(current);}
   return{id:c.id,at,version:VERSION,pngSHA:[one.pngSHA,two.pngSHA,round.pngSHA,legacy.pngSHA],rawSHA:[one.rawSHA,two.rawSHA,round.rawSHA,legacy.rawSHA],pixelSHA:[one.pixelSHA,two.pixelSHA,round.pixelSHA,legacy.pixelSHA],repeat:diff(one,two),jsonRoundTrip:diff(one,round),oldVsNew:diff(legacy,one),...(readback?{linearSHA:[one,two,round,legacy].map(x=>x.linearSHA),linearRepeat:diff({pixels:one.linear},{pixels:two.linear}),linearOldVsNew:diff({pixels:one.linear},{pixels:legacy.linear}),pngs:[one,two,round,legacy].map(x=>[x.png,x.doublePNG])}:{})};
  },{c,readback});
   if(readback){const {PNG}=require('pngjs'),pixels=r.pngs.map(pair=>pair.map(x=>PNG.sync.read(Buffer.from(x.split(',')[1],'base64')).data)),diff=(a,b)=>{let max=0,changed=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);max=Math.max(max,d);if(d)changed++;}return{max,changed,same:max===0};};r.nodePngDecode={sameFrameTwoEncodes:pixels.map(pair=>diff(...pair)),repeat:diff(pixels[0][0],pixels[1][0]),oldVsNew:diff(pixels[0][0],pixels[3][0])};delete r.pngs;}
   rows.push(r);console.log(c.id+' repeat='+r.repeat.max+' json='+r.jsonRoundTrip.max+' old/new='+r.oldVsNew.max+(readback?' rawSame='+r.rawSHA.every(x=>x===r.rawSHA[0]):''));
   fs.writeFileSync(path.join(O,(readback?'默认基线读回诊断':'默认基线诊断')+(process.argv.includes('--no-dither')?'_关闭抖色':'')+(software?'_软件':'')+'.json'),JSON.stringify({baselineHTML:baseline.htmlSHA256,currentHTML:hash(fs.readFileSync(path.join(R,'tool/FireworkBaker.html'))),renderer,legacyFunctions:'4.9.117 centerAt / graphPlan / bakeView / squareView；仅在隔离测试页面临时恢复',ditherDisabled:process.argv.includes('--no-dither'),complete:rows.length===samples.length,pass:rows.every(r=>r.repeat.same&&r.jsonRoundTrip.same&&r.oldVsNew.same),rows,errors},null,2)+'\n');
  }
  assert.deepEqual(errors,[]);
  if(software)assert(rows.every(r=>r.repeat.same&&r.jsonRoundTrip.same&&r.oldVsNew.same),'软件确定性对照必须逐像素零差，不允许容差');
 }finally{await b.close();}
}
function loadSaved(file,id){const raw=fs.readFileSync(path.join(R,file)),d=JSON.parse(raw),s=d.snap;
 assert(s.kind==='single'||s.kind==='combo'&&s.layers.length===1,'样本只接受单层或一个恒等组合层');
 const x=s.kind==='single'?s:s.layers[0];if(s.kind==='combo')assert.deepEqual([x.scale??1,x.delay??0,x.rate??1,x.mirror??false],[1,0,1,false]);
 return{id,source:file,sourceSHA256:hash(raw),P:x.P,M:{...(s.M||{}),...(x.M||{})},px:512,times:[.4,.89,1.73]};}
async function main(){
 execFileSync('python',['-X','utf8','tool/local_http/preflight.py','--tool','baker','--start'],{cwd:R,stdio:'inherit'});
 fs.mkdirSync(O,{recursive:true});const html=fs.readFileSync(path.join(R,'tool/FireworkBaker.html'));
 const prior=compare?JSON.parse(fs.readFileSync(beforeFile,'utf8')):null;
 const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});
 try{const p=await b.newPage({viewport:{width:1200,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript('window.requestAnimationFrame=()=>0');await p.goto('http://127.0.0.1:8034/baker?fast');await p.waitForFunction(()=>window.__fw);
  await p.evaluate(()=>{state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;state.stillBusy=true;});
  const version=await p.evaluate(()=>VERSION);let cases;
  if(compare)cases=prior.cases.map(({result,...c})=>c);
  else{
   cases=await p.evaluate(()=>{const a=[];
    for(const type of ['kiku','botan','kamuro','senrin','strobe','crackle']){const d=defaultsFor(type,40),P=derive({...structuredClone(d.P),type});a.push({id:'template:'+type,P,M:structuredClone(d.M),px:256,times:(type==='crackle'?[.12,.53,.6]:[.12,.35,.7]).map(f=>+(P.duration*f).toFixed(3))});}
    // 当前候选从正式入口数据解析；不使用旧仙女棒实验参数。
    for(const id of ['SGS1','SGR1','SGRS1']){const q=replicaPM(id);a.push({id:'entry:'+id,...q,px:512,times:[.4,.89,1.73]});}
    const selected=['JM4-40','QA20','HK10','JQ7','FC10R','CSLRC','JMB1'];
    for(const id of selected){const e=entryById(id);if(!e)throw Error('代表条目不存在：'+id);let i=0;
     for(const layerId of e.layerIds||[e.id]){if(!REPLICA_BY_ID[layerId])continue;const q=replicaPM(layerId);if(q.P.sparkGraph||isTrail(q.P)||isEmit(q.P)||familyOf(q.P.type)!=='aerial')continue;
      a.push({id:'representative:'+id+':'+layerId,...q,px:256,times:[.35,.7].map(f=>+(q.P.duration*f).toFixed(3))});if(++i>=1)break;}
    }
    return a;
   });
   for(const [file,id]of [
    ['analysis/我的配方/my_fxmv96inysff36h/正式资产-窜天猴尾焰__fxmv96inysff36h.json','saved:rocket-main'],
    ['analysis/我的配方/my_fxmv9h8webs6bnz/正式资产-窜天猴尾焰-粒子__fxmv9h8webs6bnz.json','saved:rocket-particles'],
    ['analysis/我的配方/my_fxrockettailsoft20261018/正式资产-窜天猴尾焰-柔光暗底__fxrockettailsoft20261018.json','saved:rocket-soft']])cases.push(loadSaved(file,id));
  }
  let n=0;
  for(const c of cases){const got=await p.evaluate(async c=>{const pl=displayPlan40(c.P),frames=await renderStills40(c.P,c.M,{px:c.px,times:c.times,plan:pl});
    const pick={cx:pl.cx||0,cy:pl.cy||0,HX:pl.HX,HY:pl.HY,Ww:pl.Ww,Wh:pl.Wh,zoom:!!pl.zoom,anchor:!!pl.anchor,L:pl.L,times:pl.times,keys:pl.keys,sizeKeys:pl.sizeKeys,views:c.times.map(t=>frameView40(pl,t))};
    return{plan:pick,frames:frames.map(f=>({t:f.t,png:f.png,shutter:f.shutter,exposure:f.exposure}))};},c);
   c.result={plan:got.plan,frames:got.frames.map(f=>{const raw=Buffer.from(f.png.split(',')[1],'base64');return{t:f.t,sha256:hash(raw),pngBytes:raw.length,shutter:f.shutter,exposure:f.exposure};})};
   if(compare){const old=prior.cases.find(x=>x.id===c.id);c.result.planSame=JSON.stringify(old.result.plan)===JSON.stringify(c.result.plan);c.result.pixelsSame=JSON.stringify(old.result.frames)===JSON.stringify(c.result.frames);}
   console.log((++n)+'/'+cases.length+' '+c.id+' '+(compare?(c.result.planSame&&c.result.pixelsSame?'一致':'变化'):'已捕获'));
   // 每完成一项即落盘，以免长渲染中断丢掉修复前证据。
   fs.writeFileSync(path.join(O,compare?'默认基线后.json':'默认基线前.json'),JSON.stringify({format:'fwl.graph-framing-baseline/1',version,htmlSHA256:hash(html),capturedAt:new Date().toISOString(),compareTo:prior?.htmlSHA256,complete:n===cases.length,pass:!compare||cases.slice(0,n).every(x=>x.result.planSame&&x.result.pixelsSame),scope:'六模板、三个当前粒子图候选、用户三份尾焰存档及现行空中代表；真实渲染少量定帧，未替代完整素材包/UE验收。',cases,errors},null,2)+'\n');
  }
  assert.deepEqual(errors,[]);if(compare)assert(cases.every(x=>x.result.planSame&&x.result.pixelsSame),'默认像素或帧计划发生变化');console.log('默认基线'+(compare?'对比通过':'捕获完成')+'：'+version+'，'+cases.length+'个样本');
 }finally{await b.close();}
}
(process.argv.includes('--mapping')?mapping():process.argv.includes('--batch-compare')?batchCompare():process.argv.some(x=>x.startsWith('--diagnose'))?diagnose():main()).catch(e=>{console.error(e);process.exitCode=1});
