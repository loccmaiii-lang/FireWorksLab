const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),zlib=require('node:zlib');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const dir=path.resolve(__dirname,'../outputs');fs.mkdirSync(dir,{recursive:true});
const url=process.env.THREE_LAB_URL||'http://127.0.0.1:18767/experiments/ultra-threejs/';
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11']});
  const page=await browser.newPage({viewport:{width:1600,height:1100}});
  const errors=[],report={effects:[],errors};
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(url);await page.waitForFunction(()=>window.THREE_LAB&&!THREE_LAB.state.loading,{},{timeout:120000});
  await page.evaluate(()=>{THREE_LAB.state.playing=false;document.querySelector('#resolution').value='1024';});
  for(const [id,times]of [['JM',[.8,1.6,3.6]],['V14',[2.5,6,8.8,10.3]],['V13',[3.5,5.8,9.5,12.3]],['TR2S',[2,7]],['TR2M',[2,7]],['TR2L',[2,8]]]) {
    const loaded=await page.evaluate(id=>THREE_LAB.select(id),id);assert.equal(loaded,true,id+' loads');
    await page.evaluate(()=>THREE_LAB.state.playing=false);
    const frames=[];
    for(const t of times)frames.push(await page.evaluate(t=>{
      const l=THREE_LAB,start=performance.now();l.renderAt(t,{width:1024,ss:1,output:'bytes'});
      const a=l.engine.readOutput();let sum=0,lit=0,max=0;
      for(let i=0;i<a.length;i+=4){const v=a[i]+a[i+1]+a[i+2];sum+=v;max=Math.max(max,v);if(v>20)lit++;}
      l.renderAt(t,{width:1024,ss:1,output:null});
      return {t,lit,sum,max,ms:performance.now()-start,gl:l.engine.renderer.getContext().getError(),mem:l.engine.renderer.info.memory};
    },t));
    for(const f of frames)assert.equal(f.gl,0,id+' GL');
    assert.ok(frames.some(f=>f.lit>100),id+' visible');
    if(id==='V14')assert.ok(frames[1].lit>30000,'V14 continuous tails must render, not only star heads');
    // A fixed meaningful time for each screenshot, not the last almost-black frame.
    await page.evaluate(t=>THREE_LAB.renderAt(t,{width:2048,ss:1,output:null}),times[Math.min(1,times.length-1)]);
    await page.screenshot({path:path.join(dir,id+'-page.png')});
    report.effects.push({id,frames});
    console.log(id,JSON.stringify(frames.map(({t,lit,ms})=>({t,lit,ms}))));
  }
  await page.evaluate(()=>THREE_LAB.select('JM'));
  await page.evaluate(()=>{THREE_LAB.state.playing=false;THREE_LAB.state.busy=true;});
  report.cancel=await page.evaluate(async()=>{
    const l=THREE_LAB,c=new AbortController();
    try{await l.bake(l.engine,{size:2048,frames:64,ss:1,samples:1},p=>{if(p.frame===3)c.abort();},c.signal);return false;}
    catch(e){return e.name==='AbortError';}
  });assert.equal(report.cancel,true);
  report.bake=await page.evaluate(async()=>{
    const l=THREE_LAB,result=await l.bake(l.engine,{size:2048,frames:64,ss:2,samples:4});
    l.state.result=result;l.state.player=new l.AtlasPlayer(l.engine,result);
    const a=result.outputs[0].pixels,L=result.metadata.layout;
    const channels=[0,1,2,3].map(c=>{let sum=0,max=0;for(let i=c;i<a.length;i+=4){sum+=a[i];max=Math.max(max,a[i]);}return {sum,max};});
    l.state.player.render(1.6,{width:1024,output:'bytes'});
    const p=l.engine.readOutput();let lit=0;for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2]>20)lit++;
    const blob=await l.rawPNG(L.size,L.size,a),buffer=await blob.arrayBuffer();
    // Save the raw atlas for a PNG decoder assertion outside the browser.
    const base64=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(blob);});
    return {channels,layout:L,lit,gl:l.engine.renderer.getContext().getError(),png:base64,bytes:buffer.byteLength};
  });
  const png=Buffer.from(report.bake.png,'base64');delete report.bake.png;fs.writeFileSync(path.join(dir,'JM-2K-atlas.png'),png);
  assert.ok(report.bake.channels.every(c=>c.max>0),'all four channel banks populated');assert.ok(report.bake.lit>100);assert.equal(report.bake.gl,0);
  report.snapshot=await page.evaluate(()=>{
    const l=THREE_LAB;l.renderAt(1.6,{width:4096,height:4096,ss:1,output:'bytes'});
    return {width:l.engine.output.width,height:l.engine.output.height,gl:l.engine.renderer.getContext().getError()};
  });assert.equal(report.snapshot.width,4096);assert.equal(report.snapshot.gl,0);
  await page.evaluate(()=>{const l=THREE_LAB;l.state.busy=false;l.state.player.render(1.6,{width:2048});l.state.mode='atlas';l.state.dirty=false;});
  await page.screenshot({path:path.join(dir,'JM-baked-page.png')});
  await page.evaluate(()=>{THREE_LAB.state.mode='live';THREE_LAB.state.playing=false;});
  await page.evaluate(()=>THREE_LAB.enableComparison());
  report.comparison=await page.evaluate(()=>{
    const l=THREE_LAB;l.renderAt(1.6,{width:1024,ss:1,output:null});
    return l.legacy().render(1.6,1024,1);
  });assert.equal(report.comparison.glError,0);
  await page.screenshot({path:path.join(dir,'JM-comparison-page.png')});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2));
  console.log('PASS bake, cancel, 4K, six effects and original-engine comparison');
  await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
