// 纯数据检查：真实模拟 / 取帧 / 回放 / 导出源码；不启动浏览器或伪称像素验收。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const context=vm.createContext({console,setTimeout,window:{},REFS:{},performance,TextEncoder,structuredClone});
const run=code=>vm.runInContext(code,context);
const load=name=>vm.runInContext(fs.readFileSync(path.join(root,'tool/src/js',name+'.js'),'utf8'),context,{filename:name});
for(const name of ['00_util','05_quality','10_types','20_sim','30_plan'])load(name);
vm.runInContext(fs.readFileSync(path.join(root,'tool/data/review.js'),'utf8'),context);
for(const name of ['14_pending','15_replica'])load(name);
if(fs.existsSync(path.join(root,'tool/src/js/31_plan40.js')))load('31_plan40');
const glSource=fs.readFileSync(path.join(root,'tool/src/js/40_gl.js'),'utf8');
run(glSource.slice(glSource.indexOf('function sizeAt'),glSource.indexOf('// 合并输出（星头')));
for(const name of ['48_render40','49_playback','50_bake','60_export','65_cascade','66_fwlcascade','70_ui','17_cloudrecipes','80_render','82_showcase'])load(name);
const data=code=>JSON.parse(run('JSON.stringify('+code+')'));
const checks=[];
async function check(name,fn){try{await fn();checks.push({name,pass:true});}catch(e){checks.push({name,pass:false,error:e.message});}}

const cases=data(`['kiku','botan','kamuro','yanagi','senrin','strobe'].map(type=>({name:type,P:defaultsFor(type,40).P}))
  .concat(CLOUD_RECIPES.filter(r=>r.layers).flatMap(r=>cloudRecipe(r.id).layers.map(l=>({name:r.id+'/'+l.name,P:l.P}))))`);
const metrics=[];
for(const entry of cases){
  context.input=entry.P;
  const row=data(`(()=>{const P=input,pl=plan(P,measure(P));const seen=new Set();let maxTimeError=0,shrink=0,startError=0,maxHold=0,prevF=-1;
    for(let i=Math.ceil(pl.t0*30-1e-8);i/30<pl.t0+pl.duration-1e-8;i++){
      const age=i/30-pl.t0,f=frameIdx(pl,age);if(f<0)continue;seen.add(f);
      // 4.0 帧预算：一帧可以持续多个 tick；每帧第一次出现必须正好在它的烘焙时刻，持帧期间内容只能随 Zoom 变大、不能变小
      if(f!==prevF){startError=Math.max(startError,Math.abs(age-pl.times[f]));prevF=f;}
      const ratio=sizeAt(pl,age)/sizeAt(pl,pl.times[f]);shrink=Math.max(shrink,1-ratio);
      maxTimeError=Math.max(maxTimeError,age-pl.times[f]);maxHold=Math.max(maxHold,pl.dur[f]);
    }
    return {duration:pl.duration,frames:pl.L.F,shown:seen.size,maxTimeError,startError,shrink,maxHold,budget:pl.budget||null};})()`);
  metrics.push({name:entry.name,...row});
  await check(entry.name+': every 30 Hz pose is available without Zoom time mismatch',()=>{
    assert.equal(row.shown,row.frames,'all active frames must be displayed');
    assert.ok(row.startError<1e-7,`frame first shown ${row.startError.toFixed(6)} s away from its baked pose`);
    assert.ok(row.maxTimeError<=row.maxHold+1e-7,`held pose older than its hold: ${row.maxTimeError.toFixed(4)} s`);
    assert.ok(row.shrink<1e-7,`content shrinks during hold by ${(100*row.shrink).toFixed(3)}%`);
  });
}
await check('200 frames use 4 unique pages and a partial last page',()=>{
  const pages=data(`(()=>{const P={...defaultsFor('kiku',40).P,duration:200/30,frameBudget:'full'},fm=measure(P);return splitPlan40(plan(P,fm));})()`);
  assert.deepEqual(pages.map(p=>p.L.F),[64,64,64,8]);
  for(let i=0;i<pages.length;i++){
    assert.ok(pages[i].L.cellW>=512);
    assert.equal(pages[i].times.length,pages[i].L.F);
    if(i)assert.ok(Math.abs(pages[i-1].t0+pages[i-1].duration-pages[i].t0)<1e-8);
  }
  context.pages=pages;
  assert.equal(run(`(()=>{const chain=pages.map(meta=>({P:defaultsFor('kiku',40).P,meta,head:{}}));chain.forEach((b,i)=>b.next=chain[i+1]);return fwlMaster('Motion',chain[0],defaultsFor('kiku').M,false).emitters.length;})()`),4);
  const files=data(`(()=>{const chain=pages.map(meta=>({P:defaultsFor('kiku',40).P,meta,head:{}}));chain.forEach((b,i)=>b.next=chain[i+1]);return Object.values(fwlMaster('Motion',chain[0],defaultsFor('kiku').M,false).textures).map(t=>t.file);})()`);
  assert.equal(new Set(files).size,files.length,'no missing/duplicate C/D texture names');
  assert.equal(run(`(()=>{const chain=pages.map(meta=>({P:defaultsFor('kiku',40).P,meta,head:{}}));chain.forEach((b,i)=>b.next=chain[i+1]);return Object.values(fwlMaster('Motion',chain[0],defaultsFor('kiku').M,false).textures).filter(t=>t.class==='flipbook').length;})()`),4);
  const frames=data(`(()=>{const chain=pages.map(meta=>({P:defaultsFor('kiku',40).P,meta,head:{}}));chain.forEach((b,i)=>b.next=chain[i+1]);return masterJSON(chain[0],'Motion',defaultsFor('kiku').M).segments.map(s=>s.frames);})()`);
  assert.deepEqual(frames,[64,64,64,8]);
  assert.equal(run(`(()=>{const chain=pages.map(meta=>({P:defaultsFor('kiku',40).P,meta,head:{}}));chain.forEach((b,i)=>b.next=chain[i+1]);state.atlasSeg=3;return atlasSegOf(chain[0]).meta.L.F;})()`),8);
});
await check('segment transforms use the same world envelope at every boundary',()=>{
  const error=run(`(()=>{const P=defaultsFor('yanagi',40).P,all=plan(P,measure(P)),pages=splitPlan40(all);let error=0;
    for(const page of pages)for(let i=0;i<page.L.F;i++){
      const t=page.t0+page.times[i],a=frameView40(all,t),b=frameView40(page,t);
      error=Math.max(error,...a.map((v,k)=>Math.abs(v-b[k])));
    }return error;})()`);
  assert.ok(error<1e-7,`world envelope mismatch ${error}`);
});
await check('world projection of a static marker stays within half a display pixel',()=>{
  context.viewportRects=[];context.gl={viewport(...rect){context.viewportRects.push(rect);}};
  context.shadeCellOriginal=run('shadeCell40');run('shadeCell40=()=>{};');
  try{
    run(`for(const radius of [40,63.4,88.8])shadeView40({},null,null,0,[0,0,radius,radius],{w:1080,h:1080},[0,0,100,100]);`);
    for(let i=0;i<context.viewportRects.length;i++){
      const r=context.viewportRects[i],radius=[40,63.4,88.8][i];
      const x=r[0]+(20+radius)/(2*radius)*r[2];
      assert.ok(Math.abs(x-648)<=.5,`static world marker moved to ${x}`);
    }
  }finally{run('shadeCell40=shadeCellOriginal;');}
});
await check('live preview keeps its world camera fixed while bake framing grows',()=>{
  context.canvas={width:1080,height:1080};context.displayViews=[];
  context.gl={activeTexture(){}};context.Target=class{constructor(w,h){this.w=w;this.h=h;}dispose(){}clear(){}bind(){}};
  run(`disposeTrack=()=>{};disposeEmitter=()=>{};post=()=>{};renderCell40=()=>{};makeRenderer=()=>({dispose(){}});
    shadeView40=(P,M,cell,t,view,target,camera)=>displayViews.push({time:t,framing:view,camera});
    hdrT=new Target(1080,1080);state.P={...defaultsFor('strobe',40).P,zoom:'on'};state.M=defaultsFor('strobe').M;
    state.gen++;state.bake=null;state.disp='game';state.exportResolution=true;state.platform='pc';
    for(const t of [2,3,4]){state.t=t;renderLive40();}`);
  const views=JSON.parse(JSON.stringify(context.displayViews));
  assert.ok(views.every(v=>v.camera),'live shading must receive a world camera instead of filling the viewport with each cell');
  assert.deepEqual(views[0].camera,views[1].camera);
  assert.deepEqual(views[1].camera,views[2].camera);
  assert.notEqual(views[0].framing[2],views[2].framing[2],'test must exercise growing bake framing');
});
await check('37 physical simulation and plans equal a707b63',()=>{
  const old=vm.createContext({console,setTimeout,window:{}});
  for(const file of ['00_util','05_quality','10_types','20_sim','30_plan']){
    vm.runInContext(execFileSync('git',['show',`a707b63:tool/src/js/${file}.js`],{cwd:root,encoding:'utf8'}),old);
  }
  for(const id of ['kiku','botan','kamuro','senrin','strobe','JM4','TR2S','TR2M','TR2L']){
    const P=data(`REPLICA_BY_ID['${id}']?replicaPM('${id}').P:defaultsFor('${id}',37).P`);context.legacyP=P;old.legacyP=P;
    const code='JSON.stringify((()=>{const fm=measure(legacyP);return {fm,pl:plan(legacyP,fm)};})())';
    const a=run(code),b=vm.runInContext(code,old);
    assert.equal(createHash('sha256').update(a).digest('hex'),createHash('sha256').update(b).digest('hex'),id);
  }
});

// Actual baker orchestration with a recorder replacing only GPU work.
await check('PC/mobile baker consumes partial pages once; failed page disposes prior pages',async()=>{
  context.recorded=[];context.released=[];
  run(`makeRenderer=()=>({dispose(){}});disposeBake=b=>{for(let s=b;s;s=s.next)released.push(s.meta.t0);};
    bakeFrames=async(P,scale,onProg,pl,R,opt={})=>{recorded.push({F:pl.L.F,t0:pl.t0,noFade:!!opt.noFade,times:pl.times,page:pl.pageIndex,count:pl.pageCount});
      return {P,meta:pl,head:{},cw:pl.L.cellW,chh:pl.L.cellH};};`);
  await run(`(async()=>{const P={...defaultsFor('kiku',40).P,frameBudget:'full',duration:200/30,trimLead:0};const b=await bake(P,1);await bakeMobileFor(b);})()`);
  const calls=JSON.parse(JSON.stringify(context.recorded));
  assert.deepEqual(calls.map(c=>c.F),[64,64,64,8,64,64,64,8]);
  assert.deepEqual(calls.slice(0,4),calls.slice(4),'mobile copies time and fade, not physical capacity');
  context.recorded=[];
  run(`bakeFrames=async(P,scale,onProg,pl)=>{recorded.push(pl.t0);if(recorded.length===3)throw Error('injected page failure');return {P,meta:pl};};`);
  await assert.rejects(run(`bake({...defaultsFor('kiku',40).P,frameBudget:'full',duration:200/30,trimLead:0},1)`),/injected page failure/);
  assert.equal(context.released.length,2);
});
await check('trim encoded leading/trailing dark frames without changing world framing or fade',async()=>{
  context.recorded=[];context.released=[];
  run(`bakeFrames=async(P,scale,onProg,pl)=>{recorded.push(pl);
    return {P,meta:{...pl,frameMaxes:pl.times.map(t=>(pl.t0+t>=.4-1e-8&&pl.t0+t<5.2-1e-8)?100:0)},head:{}};};`);
  const result=await run(`bake({...defaultsFor('kiku',40).P,frameBudget:'full',duration:200/30},1)`);
  assert.deepEqual(JSON.parse(JSON.stringify(result.meta.times.slice(0,2))),[0,1/30]);
  assert.ok(Math.abs(result.meta.t0-.4)<1e-8);
  assert.deepEqual(data('recorded.map(p=>p.L.F)'),[64,64,64,8,64,64,16]);
  assert.equal(result.meta.fadeEnd,200/30);
  assert.equal(run(`frameFade40(recorded[0],2)`),1,'intermediate pages must not fade out');
  assert.equal(run(`frameFade40(recorded[0],6.5)`),run(`frameFade40(recorded[3],6.5)`),'fade is evaluated on the original whole duration');
  assert.equal(context.released.length,4);
});

await check('4.0 frame budget (opt-in tiers 30/15/10): integer tick holds, tiers by phase, strobe raised, fewer pages than full 30 fps',()=>{
  const r=data(`(()=>{const out={};for(const type of ['kiku','kamuro','strobe']){const P={...defaultsFor(type,40).P,frameBudget:'tiers',fpsActive:15,fpsFade:10},fm=measure(P),pl=plan(P,fm);
    const holds=pl.dur.map(d=>Math.round(d*30));const full=Math.ceil(pl.duration*30);
    out[type]={F:pl.L.F,full,pages:pl.budget.pages,fullPages:Math.ceil(full/pl.capacityFrames),holds:[...new Set(holds)],
      intHolds:pl.dur.every(d=>Math.abs(d*30-Math.round(d*30))<1e-9),burst:pl.times.filter(t=>pl.t0+t<pl.budget.burstEnd).length,
      strobeFrom:pl.budget.strobeFrom,strobeHold:pl.ticks.length?Math.max(...pl.ticks.map((k,f)=>[k,f]).filter(([k])=>pl.t0+k/30>=pl.budget.strobeFrom).map(([k,f])=>Math.round(pl.dur[f]*30)),0):0};}
    return out;})()`);
  for(const [type,x] of Object.entries(r)){
    assert.ok(x.intHolds,type+': every frame holds an integer number of ticks');
    assert.ok(x.holds.every(h=>h>=1&&h<=4),type+': holds within 1..4 ticks');
    assert.ok(x.pages<=x.fullPages,type+': budget never needs more pages than full 30 fps');
    assert.ok(type==='strobe'?x.F<=x.full:x.F<x.full,type+': budget uses fewer frames than full 30 fps');
  }
  assert.ok(r.kiku.burst>=14,'opening 0.5 s keeps 30 fps');
  assert.ok(isFinite(r.strobe.strobeFrom)&&r.strobe.strobeHold<=1,'strobe 10 Hz forces 30 fps during strobing');
});
await check('4.0 frame budget: maxPages coarsens tiers to fit, never below floors',()=>{
  const r=data(`(()=>{const P={...defaultsFor('kamuro',40).P,frameBudget:'tiers',duration:12,maxPages:2},pl=plan(P,measure(P));return {pages:Math.ceil(pl.L.F/pl.capacityFrames),fps:pl.budget.fps};})()`);
  assert.ok(r.fps[0]>=15&&r.fps[1]>=10&&r.fps[2]>=7.5,'floors respected: '+r.fps);
  assert.ok(r.pages<=3,'pages reduced toward the cap: '+r.pages);
});

await check('4.0.2 default budget (motion): fits one sheet when it can, 30 fps opening, holds step up by at most 1 tick, never beyond maxHold',()=>{
  const r=data(`(()=>{const out={};for(const id of ['JM4-40','kiku','botan','kamuro','yanagi','senrin','crossette','palm','glitter']){
    const P=id.includes('-')?replicaPM(id).P:defaultsFor(id,40).P,pl=plan(P,measure(P));const h=pl.dur.map(d=>Math.round(d*30));
    let up=0;for(let i=1;i<h.length-1;i++)up=Math.max(up,h[i]-h[i-1]);
    out[id]={pages:pl.budget.pages,F:pl.L.F,dur:pl.duration,P:P.duration,open:pl.times.filter(t=>pl.t0+t<.5).length,hmax:Math.max(...h),hburn:Math.max(...h.filter((_,f)=>pl.t0+pl.times[f]<pl.budget.fadeAt)),up,ticks:pl.nTicks,tickSum:h.reduce((a,c)=>a+c,0)};}return out;})()`);
  for(const [id,x] of Object.entries(r)){
    assert.equal(x.pages,id==='yanagi'?2:1,id+(id==='yanagi'?': 6.5 s willow needs 2 sheets at ≥10 fps burn':': fits one sheet'));
    assert.ok(x.open>=14,id+': first 0.5 s every tick ('+x.open+')');
    assert.ok(x.hmax<=4,id+': hold ≤ 4 ticks (fade ≥ 7.5 fps)');
    assert.ok(x.hburn<=3,id+': burn hold ≤ 3 ticks (≥ 10 fps)');
    assert.ok(x.up<=1,id+': hold steps up by ≤ 1');
    assert.equal(x.tickSum,x.ticks,id+': frames cover every tick');
    assert.ok(Math.abs(x.dur-x.P)<0.04,id+': full duration kept ('+x.dur+' vs '+x.P+')');
  }
  assert.equal(r['JM4-40'].F,64,'JM4-40: 4.56 s in one 4×4×RGBA sheet (user: smooth in game)');
});
await check('strobe keeps ≥ 0.4 × strobe rate even if it needs a second sheet',()=>{
  const r=data(`(()=>{const P=defaultsFor('strobe',40).P,pl=plan(P,measure(P));return {pages:pl.budget.pages,h:Math.max(...pl.dur.filter((d,f)=>pl.t0+pl.times[f]>=P.strobeStart).map(d=>Math.round(d*30)))};})()`);
  assert.ok(r.h<=1,'11 Hz strobe → 30 fps during strobing'); 
});

const output=process.argv[2];
const report={kind:'offline source/data checks; no GPU pixels or browser playback',pass:checks.every(c=>c.pass),metrics,checks};
if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({pass:report.pass,checks:checks.length,failed:checks.filter(c=>!c.pass),shrinkMax:Math.max(...metrics.map(m=>m.shrink)),frames:metrics.slice(0,6).map(m=>[m.name,m.frames,m.budget&&m.budget.pages,m.budget&&(m.budget.fps?m.budget.fps.join("/"):m.budget.mode+" hold "+m.budget.holdMin+"-"+m.budget.holdMax)])},null,2));
if(!report.pass)process.exitCode=1;
