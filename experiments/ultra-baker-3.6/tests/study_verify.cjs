const {chromium}=require('C:/Users/locmai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'..'),out=path.join(root,'studies'),url='http://127.0.0.1:18766/experiments/ultra-baker-3.6/';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11']});const p=await browser.newPage({viewport:{width:1600,height:1120}});p.setDefaultTimeout(120000);const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url+'tool/FireworkBaker.html?fast');await p.waitForFunction(()=>window.__fw);
 const physics=await p.evaluate(()=>{
  state.stillBusy=true;const P={...defaultsFor('kiku').P,stars:8,sparkRate:0,flash:0},R=makeRenderer(P,'burst'),T=new Target(32,32,gl.RGBA16F);
  let steps=0,resets=0;const step=Sim.prototype.step;Sim.prototype.step=function(h){steps++;return step.call(this,h)};const reset=R.reset;R.reset=()=>{resets++;reset()};
  try {T.clear();T.bind();for(let i=0;i<960;i++)R.draw(i/960,[0,0,100,100],.16,1,0);const forward={steps,resets};R.draw(.25,[0,0,100,100],.16,1,0);const rewound={steps,resets};return{forward,rewound,gl:gl.getError()};}finally{Sim.prototype.step=step;R.dispose();T.dispose();}
 });assert.equal(physics.forward.resets,0);assert(physics.forward.steps<=481);assert.equal(physics.rewound.resets,1);assert.equal(physics.gl,0);
 const meta={physics,variants:[],gallery:[],errors};
 for(const id of ['JM','V14','V13']){const m=JSON.parse(fs.readFileSync(path.join(out,id+'-study.json')));for(const [v,x]of Object.entries(m.variants)){for(const l of x.layers)for(const s of l.segments){assert.equal(s.meta.L.F,256);assert.equal(s.N,x.size);assert.equal(s.N/s.meta.L.cols,x.size/8);assert.equal(l.glError,0);}meta.variants.push({id,v,layers:x.layers.length,textures:x.layers.reduce((n,l)=>n+l.segments.length,0),ms:Math.round(x.layers.reduce((n,l)=>n+l.ms,0)),view:x.view});}
  if(id==='JM'){const base=m.variants['original-2k'].layers[0];for(const x of Object.values(m.variants)){assert.deepEqual(x.layers[0].segments[0].meta.times,base.segments[0].meta.times);assert.deepEqual(x.layers[0].expo,base.expo);assert.deepEqual(x.view,base.view)}}
  for(const x of Object.values(m.variants))for(const l of x.layers)if(l.segments.length===2)assert.equal(l.segments[0].meta.t0+l.segments[0].meta.duration,l.segments[1].meta.t0);
 }
 await p.goto(url+'studies/');await p.waitForFunction(()=>window.studyUI&&!studyUI.busy&&studyUI.players[1].ready);
 for(const id of ['JM','V14','V13']){
  await p.locator('#effect').selectOption(id);await p.waitForFunction(id=>document.querySelector('#effect').value===id&&!studyUI.busy&&studyUI.players[1].ready,id);
  await p.waitForFunction(id=>{const v=document.querySelector('video'),t0={JM:.867,V14:4.2,V13:5.7}[id];return v.readyState>=2&&!v.seeking&&Math.abs(v.currentTime-t0-studyUI.time)<.04},id);await p.waitForTimeout(100);await p.screenshot({path:path.join(out,id+'-overview.png'),fullPage:true});
  await p.locator('#quality').selectOption('fine-8k');await p.waitForFunction(()=>!studyUI.busy&&studyUI.players[1].ready);await p.waitForTimeout(250);
  const shots=await p.evaluate(id=>{const times=id==='JM'?[.35,.8,1.6,2.5,3.2,4]:id==='V14'?[.35,1.4,3.25,5.1,7,8.8]:[.5,1.9,3.4,4.9,6.5,9.5];return times.map(t=>{studyUI.players[1].render(t);return document.querySelector('#enhanced').toDataURL()})},id);
  shots.forEach((s,i)=>fs.writeFileSync(path.join(out,id+'-8k-proof-'+i+'.png'),Buffer.from(s.split(',')[1],'base64')));
  if(id==='JM'){const base=await p.evaluate(()=>{studyUI.players[0].render(1.6);return document.querySelector('#original').toDataURL()});fs.writeFileSync(path.join(out,'JM-baseline-no-bloom.png'),Buffer.from(base.split(',')[1],'base64'));}
  await p.locator('#zoom').click();await p.screenshot({path:path.join(out,id+'-detail.png')});await p.locator('#zoom').click();
  await p.locator('#play').click();const before=await p.evaluate(()=>studyUI.time);await p.waitForTimeout(500);const after=await p.evaluate(()=>studyUI.time);assert(after>before);await p.locator('#play').click();
  meta.gallery.push({id,playing:true,errors:await p.evaluate(()=>studyUI.players.map(p=>p.g.getError()))});
 }
 await p.setViewportSize({width:700,height:1000});await p.screenshot({path:path.join(out,'mobile-gallery.png'),fullPage:true});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.goto(url+'tool/FireworkBaker.html?fast&study=V13&layer=0');await p.waitForFunction(()=>window.__fw&&__fw.state.P.type==='senrin'&&__fw.idle());assert.equal(await p.evaluate(()=>__fw.state.P.subStars),100);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(meta,null,2));await browser.close();console.log('PASS',JSON.stringify(meta));
})().catch(e=>{console.error(e);process.exit(1)});
