/* 通过已预检的正式HTTP入口检查爆后气流；不改用户浏览器存储或UE。 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require(process.env.FW_PLAYWRIGHT||'playwright');
const R=path.resolve(__dirname,'../..'),O=path.join(R,'analysis/results/GoldRayBurst');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=d3d11']});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript('window.requestAnimationFrame=()=>0');await p.goto('http://127.0.0.1:8034/baker?fast');await p.waitForFunction(()=>window.__fw);
 const r=await p.evaluate(()=>{
  state.autoBake=false;clearTimeout(bakeTimer);state.playing=false;state.stillBusy=true;
  if(typeof burstFlowActive!=='function')throw Error('缺少爆后扰动总开关');
  const P={...defaultsFor('kiku',40).P,type:'kiku',stars:24,engine:'gpu',burstFlowOn:1,burstFlowStart:.4,burstFlowFade:.3,burstFlowWind:1.2,burstFlowScale:8};
  const a=new Sim({...P,burstFlowOn:0}),b=new Sim(P),repeat=new Sim(P);let pre=0,post=0;
  for(let i=0;i<480;i++){
   a.step(1/240);b.step(1/240);repeat.step(1/240);
   if(JSON.stringify(b.all)!==JSON.stringify(repeat.all))throw Error('相同配方轨迹不确定');
   for(let j=0;j<a.all.length;j++){const x=a.all[j],y=b.all[j],d=Math.hypot(x.x-y.x,x.y-y.y,x.z-y.z);if(i<96)pre=Math.max(pre,d);else post=Math.max(post,d);}
  }
  if(pre!==0||post<.001)throw Error('主星起效时刻错误：'+JSON.stringify({pre,post}));
  const test=t=>sparkLateStep(P,[20,12,0],[4,2,0],[0,0,0],[0,-2,0],3,0,t,.02,2)[0];
  const off={...P,burstFlowOn:0},base=t=>sparkLateStep(off,[20,12,0],[4,2,0],[0,0,0],[0,-2,0],3,0,t,.02,2)[0];
  if(JSON.stringify(test(.1))!==JSON.stringify(base(.1)))throw Error('爆后起点之前火花变化');
  if(Math.hypot(...test(.8).map((x,i)=>x-base(.8)[i]))<1e-6)throw Error('燃尽前火花没受爆后场影响');
  const z=burstFlowAir(P,20,12,.4),n=burstFlowAir(P,20,12,.40001);
  if(Math.hypot(...z)!==0||Math.hypot(...n)>1e-6)throw Error('气流渐入不连续');
  if(!unitBlockReason(P)||!burstFlowOutputReason(P,'dots'))throw Error('无法表达的粒子产物没有拦截');
  const legacy={...P};for(const k of ['burstFlowStart','burstFlowFade','burstFlowWind','burstFlowScale'])delete legacy[k];if(!burstFlowActive(legacy)||JSON.stringify(burstFlowAir(legacy,20,12,.8))!==JSON.stringify(burstFlowAir(P,20,12,.8)))throw Error('旧存档缺少参数时，实际缺省与面板显示不同');
  const T=retimeP(structuredClone(P),2);if(T.burstFlowStart!==.2||T.burstFlowFade!==.15||T.burstFlowWind!==2.4)throw Error('节奏未同步气流');
  return{pass:true,version:VERSION,preStartMaxM:pre,postStartMaxM:post,deterministic:true,particlesBeforeBurn:true,continuous:true,unsupportedBlocked:true,tempo:true};
 });
 const pictures=await p.evaluate(async()=>{const d=defaultsFor('kiku',40),P={...d.P,type:'kiku',stars:24,burstFlowOn:1,burstFlowStart:.4,burstFlowFade:.3,burstFlowWind:1.2,burstFlowScale:8};const f=measure(P),opt={px:384,cx:(f.x0+f.x1)/2,cy:(f.y0+f.y1)/2,half:Math.max(f.x1-f.x0,f.y1-f.y0)*.53,times:[.3,1.5]};return {on:(await renderStills40(P,d.M,opt)).map(x=>x.png),off:(await renderStills40({...P,burstFlowOn:0},d.M,opt)).map(x=>x.png)};});
 assert.equal(pictures.on[0],pictures.off[0],'开启后，开始时刻之前GPU画面变化');assert.notEqual(pictures.on[1],pictures.off[1],'GPU画面没有爆后扰动');r.gpuBeforeSame=true;r.gpuAfterChanged=true;
 assert.deepEqual(errors,[]);fs.mkdirSync(O,{recursive:true});fs.writeFileSync(path.join(O,'气流行为检查.json'),JSON.stringify({...r,errors},null,2));console.log(JSON.stringify(r));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
