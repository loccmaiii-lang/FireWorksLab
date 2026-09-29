const {chromium}=require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');const lab=path.resolve(__dirname,'..'),out=path.join(lab,process.argv.includes('--filaments')?'studies/filaments':'studies/motion'),url='http://127.0.0.1:18766/experiments/ultra-baker-3.6/';
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11']});const p=await b.newPage({viewport:{width:1600,height:1100}});p.setDefaultTimeout(120000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url+'tool/FireworkBaker.html?fast');await p.waitForFunction(()=>window.__fw);
 const physics=await p.evaluate(()=>{
  state.stillBusy=true;state.playing=false;
  const base={...defaultsFor('kiku').P,stars:24,sparkRate:0,burn:9,seed:141};
  const a=new Sim(base),c=new Sim({...base,ignDelay:8,ignitionSeed:14193,visibleEvery:4});
  let pathError=0;for(let i=0;i<24;i++)for(const k of ['vx','vy','vz'])pathError=Math.max(pathError,Math.abs(a.stars[i][k]-c.stars[i][k]));
  for(let i=0;i<480;i++){a.step(H_STEP);c.step(H_STEP);}for(let i=0;i<24;i++)for(const k of ['x','y','z'])pathError=Math.max(pathError,Math.abs(a.stars[i][k]-c.stars[i][k]));
  const P={...defaultsFor('senrin').P,stars:1,subStars:6,subDelay:.1,subJit:0,subVt:19,subGrav:.55,carrierHead:0,subKeep:.45,subScaleJit:18,subTail:0},s=new Sim(P);
  for(let i=0;i<120;i++)s.step(H_STEP);const children=s.all.filter(x=>x.kind===2);
  return{pathError,hiddenCarrier:s.all[0].I,childCount:children.length,childDrag:children.map(x=>x.c),expectedDrag:G/19**2,childGravity:children.map(x=>x.grav),gl:gl.getError()};
 });assert.equal(physics.pathError,0);assert.equal(physics.hiddenCarrier,0);assert.equal(physics.childCount,6);assert(physics.childDrag.every(c=>Math.abs(c-physics.expectedDrag)<1e-12));assert(physics.childGravity.every(g=>g===.55));assert.equal(physics.gl,0);
 await p.goto(url+'studies/'+(process.argv.includes('--filaments')?'filaments':'motion')+'/');await p.waitForFunction(()=>motionCards.length===2&&motionCards.every(c=>c.ready));
 const videos=[];
 for(const cardIndex of [0,1])for(const kind of ['comparison','comparison-half-speed','reference-breakdown','fine-8k-playback']){
  await p.locator('article select').nth(cardIndex).selectOption(kind);await p.waitForFunction(i=>motionCards[i].ready,cardIndex);
  const info=await p.evaluate(async i=>{const c=motionCards[i],v=c.video;v.currentTime=Math.min(3,v.duration/2);await new Promise(r=>v.addEventListener('seeked',r,{once:true}));const start=v.currentTime;v.muted=true;await v.play();await new Promise(r=>setTimeout(r,250));v.pause();return{id:c.id,kind:c.select.value,width:v.videoWidth,height:v.videoHeight,duration:v.duration,seeked:start,playedTo:v.currentTime,canPlay:v.readyState}},cardIndex);
  assert(info.playedTo>info.seeked);assert(info.width>0&&info.height>0);videos.push(info);
 }
 for(const i of [0,1])await p.locator('article select').nth(i).selectOption('comparison');await p.waitForFunction(()=>motionCards.every(c=>c.ready));
 await p.screenshot({path:path.join(out,'gallery.png'),fullPage:true});await p.setViewportSize({width:700,height:1000});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify({physics,videos,errors,mobileOverflow:false},null,2));await b.close();console.log('PASS',JSON.stringify({physics,videos}));
})().catch(e=>{console.error(e);process.exit(1)});
