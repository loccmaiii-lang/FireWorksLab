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
const pass=checks.every(c=>c.pass);console.log(JSON.stringify({pass,checks},null,1));process.exit(pass?0:1);
