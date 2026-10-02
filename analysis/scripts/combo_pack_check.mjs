// 纯数据检查（不开浏览器）：多层效果导出成一个 cascade.json（4.0-c）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const context=vm.createContext({console,setTimeout,window:{},REFS:{},performance,TextEncoder,structuredClone});
const run=code=>vm.runInContext(code,context);
const load=name=>vm.runInContext(fs.readFileSync(path.join(root,'tool/src/js',name+'.js'),'utf8'),context,{filename:name});
for(const name of ['00_util','05_quality','10_types','20_sim','30_plan'])load(name);
vm.runInContext(fs.readFileSync(path.join(root,'tool/data/review.js'),'utf8'),context);
for(const name of ['14_pending','15_replica','31_plan40'])load(name);
const glSource=fs.readFileSync(path.join(root,'tool/src/js/40_gl.js'),'utf8');
run(glSource.slice(glSource.indexOf('function sizeAt'),glSource.indexOf('// 合并输出（星头')));
// 粒子发射器组（46_emitset.js）里不碰 WebGL 的部分：出生表 + 导出（4.2.12 光点层用）
const esSrc=fs.readFileSync(path.join(root,'tool/src/js/46_emitset.js'),'utf8');
run(esSrc.slice(0,esSrc.indexOf('// 带颜色的高斯软圆点'))); run(esSrc.slice(esSrc.indexOf('// ---- 导出：fwl.cascade/1')));
for(const name of ['48_render40','49_playback','50_bake','60_export','65_cascade','66_fwlcascade','67_fwlcombo','70_ui'])load(name);
const checks=[];const check=(n,f)=>{try{f();checks.push({n,pass:true});}catch(e){checks.push({n,pass:false,e:e.message});}};
const j=run(`(()=>{
  const mk=(type,dur)=>{const P={...defaultsFor(type,40).P,duration:dur},pl=plan(P,measure(P)),pages=splitPlan40(pl);
    const chain=pages.map(meta=>({P,meta,head:{},form:'master'}));chain.forEach((b,i)=>b.next=chain[i+1]);return chain[0];};
  const M=defaultsFor('kiku').M;
  const L=(o)=>({...newLayerLike(),...o});
  function newLayerLike(){return {scale:1,delay:0,rate:1,mirror:false,stages:M.stages,xw:M.xw,ramp0:M.ramp0,ramp1:M.ramp1,ramp2:M.ramp2,ramp3:M.ramp3,headInt:1,tailInt:1};}
  const a=mk('kamuro',9),b=mk('botan',2.8);
  const out=fwlCombo('Test',[{L:L({}),b:a},{L:L({delay:1.5,scale:0.5,rate:2}),b:b}],false);
  const single=fwlMaster('X',b,M,false);
  return JSON.stringify({out,single,aPages:(()=>{let n=0;for(let s=a;s;s=s.next)n++;return n;})()});})()`);
const {out,single,aPages}=JSON.parse(j);
// 4.2.6（用户 2026-10-02 19:41「不要强制 2048」）：多层里每层的贴图尺寸、格子跟这一层自己的参数；单格仍 ≥ 512
check('layer texture size follows the layer, cell stays >= 512',()=>{
  const r=JSON.parse(run(`(()=>{const P={...defaultsFor('botan',40).P,texW:1024,texH:1024,cols:2,rows:2},Q={...defaultsFor('botan',40).P,texW:4096,texH:2048,cols:8,rows:4};
    const a=libP(P,true),b=libP(Q,true),pa=plan(a,measure(a)),pb=plan(b,measure(b));
    return JSON.stringify({a:[a.texW,a.texH,a.cols,a.rows],b:[b.texW,b.texH],la:[pa.L.cols,pa.L.rows,pa.L.cellW],lb:[pb.L.cols,pb.L.rows,pb.L.cellW,pb.L.cellH]});})()`));
  assert.deepEqual(r.a,[1024,1024,2,2]);assert.deepEqual(r.b,[4096,2048]);
  assert.deepEqual(r.la,[2,2,512]);assert.ok(r.lb[2]>=512&&r.lb[3]>=512,'cell >= 512: '+r.lb);
});
check('one cascade.json with an emitter per layer page',()=>{assert.equal(out.emitters.length,aPages+single.emitters.length);});
check('texture / material / emitter keys unique and referenced',()=>{
  const names=out.emitters.map(e=>e.name);assert.equal(new Set(names).size,names.length);
  for(const e of out.emitters){assert.ok(out.materials[e.material],'material '+e.material);assert.ok(out.textures[e.required.cutout],'cutout '+e.required.cutout);
    for(const t of Object.values(out.materials[e.material].textures))assert.ok(out.textures[t],'texture '+t);}
  const files=Object.values(out.textures).map(t=>t.file);assert.equal(new Set(files).size,files.length,'file names unique');
});
check('layer delay, time rate and scale applied',()=>{
  const l2=out.emitters.filter(e=>e.layer===2),s0=single.emitters[0];
  assert.ok(Math.abs(l2[0].required.delay_s-(1.5+s0.required.delay_s/2))<1e-3,'delay = combo delay + page t0 / rate');
  assert.ok(Math.abs(l2[0].required.duration_s-s0.required.duration_s/2)<1e-3,'duration / rate');
  const lt=l2[0].modules.find(m=>m.m==='Lifetime').Lifetime.const;assert.ok(Math.abs(lt-s0.modules.find(m=>m.m==='Lifetime').Lifetime.const/2)<1e-3);
  const sz=l2[0].modules.find(m=>m.m==='InitialSize').StartSize.const,s1=s0.modules.find(m=>m.m==='InitialSize').StartSize.const;
  assert.ok(Math.abs(sz[0]-s1[0]*0.5)<0.2&&Math.abs(sz[1]-s1[1]*0.5)<0.2,'size × scale');
});
check('layer 1 pages chain in time (delays increase)',()=>{const d=out.emitters.filter(e=>e.layer===1).map(e=>e.required.delay_s);for(let i=1;i<d.length;i++)assert.ok(d[i]>d[i-1]);});
// 4.2.12 分平台导出方案（用户 10-02 20:04：PC 可以序列 + 粒子，手机只能纯图片；导出前在图层上选方案；走查 D21–D22）
// 每层 L.out = { pc: 'seq' | 'dots' | 'off', mobile: 'seq' | 'off' }；不写 = 两边都是序列（和以前完全一样）
check('platform scheme: default unchanged; PC dots layer = GPU soft_dot emitter without textures; off layers absent; mobile keeps sequence',()=>{
  const r=JSON.parse(run(`(()=>{
    if(typeof layerOut!=='function'||typeof fwlDots!=='function')return JSON.stringify({missing:true});
    const mk=(type,dur)=>{const P={...defaultsFor(type,40).P,duration:dur},pl=plan(P,measure(P)),pages=splitPlan40(pl);
      const chain=pages.map(meta=>({P,meta,head:{},form:'master'}));chain.forEach((b,i)=>b.next=chain[i+1]);return chain[0];};
    const M=defaultsFor('kiku').M, base={scale:1,delay:0,rate:1,mirror:false,stages:M.stages,xw:M.xw,ramp0:M.ramp0,ramp1:M.ramp1,ramp2:M.ramp2,ramp3:M.ramp3,headInt:1,tailInt:1};
    const a=mk('kamuro',9),b=mk('botan',2.8);
    const L1={...base},L2={...base,delay:0.4,out:{pc:'dots',mobile:'seq'}},L3={...base,out:{pc:'seq',mobile:'off'}};
    const def=layerOut({}), pcE=comboEntries([{L:L1,b:a},{L:L2,b},{L:L3,b}],false), mbE=comboEntries([{L:L1,b:a},{L:L2,b},{L:L3,b}],true);
    const pc=fwlCombo('T',pcE,false), mob=fwlCombo('T_Mobile',mbE,true);
    const plain=fwlCombo('T',[{L:{...base},b:a},{L:{...base,delay:0.4},b}],false), plain2=fwlCombo('T',comboEntries([{L:{...base},b:a},{L:{...base,delay:0.4},b}],false),false);
    return JSON.stringify({def,pc,mob,same:JSON.stringify(plain)===JSON.stringify(plain2),fm:measure(b.P).prof.filter((q,i)=>i%4===0).map(q=>[q[0],q[2]]),P:{burn:b.P.burn,ign:b.P.ignDelay||0,v0:b.P.v0,vt:b.P.vt,stars:b.P.stars}});})()`));
  assert.ok(!r.missing,'layerOut / fwlDots / comboEntries 还没有');
  assert.deepEqual(r.def,{pc:'seq',mobile:'seq'});
  assert.ok(r.same,'没设方案的层：输出和以前逐字一样');
  const d=r.pc.emitters.filter(e=>e.layer===2);
  assert.equal(d.length,1,'PC 光点层只有一个发射器'); assert.equal(d[0].gpu,true); assert.equal(r.pc.materials[d[0].material].role,'soft_dot');
  assert.ok(!Object.keys(r.pc.textures).some(k=>k.startsWith('L2_')),'PC 光点层不带贴图');
  assert.ok(r.pc.emitters.some(e=>e.layer===3),'PC 第 3 层是序列'); assert.ok(!r.mob.emitters.some(e=>e.layer===3),'手机不出第 3 层');
  assert.ok(r.mob.emitters.filter(e=>e.layer===2).every(e=>!e.gpu&&r.mob.textures[r.mob.materials[e.material].textures.main]),'手机第 2 层是纯序列');
  assert.ok(r.mob.emitters.every(e=>!e.gpu),'手机没有 GPU 发射器');
  const sp=d[0].spawn.bursts.reduce((n,x)=>n+x[1],0); assert.equal(sp,r.P.stars,'星数 = 爆发粒子数');
  assert.ok(Math.abs(d[0].required.delay_s-0.4)<1e-3,'层延迟');
  // 轨迹：线性阻力拟合的半径 r(t) = v / k (1 − e^(−kt)) 和模拟里星的半径差 ≤ 15%（燃烧期中后段）
  const m=Object.fromEntries(d[0].modules.map(x=>[x.m,x])), dg=m.Drag.DragCoefficientRaw, k=dg.const!=null?dg.const:(dg.uniform[0]+dg.uniform[1])/2, R0=m.SphereLocation.StartRadius.const;
  const vs=m.SphereLocation.VelocityScale.uniform, v=(vs[0]+vs[1])/2*R0/100;      // VelocityScale × 半径 = 速度（cm/s）→ m/s
  const life=m.Lifetime.Lifetime.uniform, lm=(life[0]+life[1])/2; assert.ok(Math.abs(lm-(r.P.ign+r.P.burn))<0.05*(r.P.ign+r.P.burn),'寿命 = 点火 + 燃烧');
  for(const [t,rr] of r.fm){ if(t<r.P.ign+0.3*r.P.burn||t>r.P.ign+r.P.burn)continue; const rf=R0/100+v/k*(1-Math.exp(-k*t)); assert.ok(Math.abs(rf-rr)<=0.15*rr,'t='+t.toFixed(2)+' 半径 '+rf.toFixed(1)+' vs 模拟 '+rr.toFixed(1)); }
});
check('platform scheme: pack naming keeps mobile cutout / ramp when the PC side has no textures',()=>{
  const src=fs.readFileSync(path.join(root,'tool/src/js/61_naming.js'),'utf8');
  assert.ok(/pcTex/.test(src),'applyPackNaming 要知道某层 PC 没有贴图（不然手机的 Cutout / Ramp 被当成和 PC 共用丢掉）');
});
// 4.2.13：光点什么时候亮按模拟里每颗星的星头亮度（XD1：鸿巢红点层是「第二段」，主段期间不发光，按点火 + 燃烧算会从开花就亮）
check('platform scheme: dots follow the simulated head visibility (second stage dark during the main burn)',()=>{
  const r=JSON.parse(run(`(()=>{const M=defaultsFor('kiku').M, L={scale:1,delay:0,rate:1,stages:M.stages,xw:M.xw,ramp2:M.ramp2,ramp3:M.ramp3,headInt:1};
    const P={...defaultsFor('botan',40).P,duration:5,burn:2,afterBurn:1.5,burnJit:0}; const e=fwlDots(L,P,comboLayerM(L));
    const m=Object.fromEntries(e.modules.map(x=>[x.m,x])); return JSON.stringify({life:m.Lifetime.Lifetime.uniform,col:m.ColorOverLife.ColorOverLife.curve});})()`));
  const lm=(r.life[0]+r.life[1])/2; assert.ok(Math.abs(lm-3.5)<0.25,'寿命 = 主段 + 第二段（'+lm+'）');
  const at=u=>{const c=r.col;for(let i=1;i<c.length;i++)if(u<=c[i][0]){const k=(u-c[i-1][0])/Math.max(1e-9,c[i][0]-c[i-1][0]);return c[i-1][1].map((x,j)=>x+(c[i][1][j]-x)*k).reduce((a,b)=>a+b,0);}return c[c.length-1][1].reduce((a,b)=>a+b,0);};
  assert.ok(at(0.3)<0.02*at(0.8),'主段期间不亮：u=0.3 '+at(0.3).toFixed(3)+' vs u=0.8 '+at(0.8).toFixed(3));
});
// 4.2.13 单束进组合包（用户 10-02 20:04「有些效果我也想导出面片 + 单束 + 粒子」；走查 D21 / B9）：PC 选「单束」的层 = 每颗星一个沿速度拉长的面片（单元序列），手机仍是序列
check('platform scheme: PC unit layer = velocity-aligned beam_flipbook emitter (one particle per star), scaled by layer delay / rate / scale; mobile stays a sequence',()=>{
  const r=JSON.parse(run(`(()=>{
    if(typeof fwlUnit!=='function')return JSON.stringify({missing:true});
    const P={...defaultsFor('botan',40).P,duration:2.8},pl=plan(P,measure(P)),pages=splitPlan40(pl),chain=pages.map(meta=>({P,meta,head:{},form:'master'}));chain.forEach((b,i)=>b.next=chain[i+1]);
    const ub={form:'unit',P:{...P,form:'unit'},head:{},meta:{unit:true,fit:{v0:120,k:1.2,a:6},duration:3.4,keys:[[0,0.01],[1,63.99]],sizeKeysX:[[0,0.5],[1,1]],sizeKeysY:[[0,0.3],[1,1]],Ww:6,Wh:40,hb:0.92,area:0.6,L:{cols:16,rows:2,chans:4,F:64,cellW:128,cellH:1024}}};
    const M=defaultsFor('kiku').M, base={scale:1,delay:0,rate:1,mirror:false,stages:M.stages,xw:M.xw,ramp0:M.ramp0,ramp1:M.ramp1,ramp2:M.ramp2,ramp3:M.ramp3,headInt:1,tailInt:1};
    const L2={...base,delay:0.5,rate:2,scale:0.5,out:{pc:'unit',mobile:'seq'}};
    const ents=comboEntries([{L:{...base},b:chain[0]},{L:L2,b:chain[0],unit:ub}],false), mob=comboEntries([{L:{...base},b:chain[0]},{L:L2,b:chain[0]}],true);
    const pc=fwlCombo('T',ents,false), mb=fwlCombo('T_Mobile',mob,true);
    return JSON.stringify({pc,mb,stars:P.stars,opts:OUT_PC.map(o=>o[0])});})()`));
  assert.ok(!r.missing,'fwlUnit 还没有');
  assert.ok(r.opts.includes('unit'),'PC 方案里有「单束」');
  const u=r.pc.emitters.filter(e=>e.layer===2); assert.equal(u.length,1,'PC 单束层一个发射器');
  const e=u[0], mat=r.pc.materials[e.material], m=Object.fromEntries(e.modules.map(x=>[x.m,x]));
  assert.equal(e.required.screen_alignment,'Velocity'); assert.equal(mat.role,'beam_flipbook'); assert.ok(r.pc.textures[mat.textures.main]&&r.pc.textures[mat.textures.main].cols===16,'单束贴图 16 列');
  assert.ok(r.pc.textures[e.required.cutout],'单束 Cut'); assert.ok(Array.isArray(e.required.pivot_offset)&&Math.abs(e.required.pivot_offset[1]-(-(1-0.92)))<1e-3,'Pivot = 星头位置');
  assert.equal(e.spawn.bursts.reduce((n,x)=>n+x[1],0),r.stars,'每颗星一个粒子');
  assert.ok(Math.abs(e.required.delay_s-0.5)<1e-3,'层延迟');
  const lt=m.Lifetime.Lifetime.uniform; assert.ok(Math.abs((lt[0]+lt[1])/2-3.4/2)<0.02,'寿命 ÷ 时间倍率');
  assert.ok(Math.abs(m.InitialSize.StartSize.const[1]-40*100*0.5)<1,'面片 × 缩放');
  const dg=m.Drag.DragCoefficientRaw; assert.ok(Math.abs((dg.const!=null?dg.const:dg.uniform[0])-1.2*2)<1e-3,'阻力 × 时间倍率');
  assert.ok(Math.abs(m.ConstAcceleration.Acceleration[2]-(-6*100*0.5*4))<1,'重力 × 缩放 × 倍率²');
  const vs=m.SphereLocation.VelocityScale, R=m.SphereLocation.StartRadius.const, vv=(vs.const!=null?vs.const:(vs.uniform[0]+vs.uniform[1])/2)*R;
  assert.ok(Math.abs(vv-120*100*0.5*2)<2,'初速 × 缩放 × 倍率: '+vv);
  assert.ok(m.DynamicParameter&&m.DynamicParameter.params.frame,'帧号');
  assert.ok(!r.mb.emitters.some(x=>x.required.screen_alignment==='Velocity')&&r.mb.emitters.some(x=>x.layer===2),'手机第 2 层是序列');
});
const pass=checks.every(c=>c.pass);console.log(JSON.stringify({pass,checks},null,1));process.exit(pass?0:1);
