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
const pass=checks.every(c=>c.pass);console.log(JSON.stringify({pass,checks},null,1));process.exit(pass?0:1);
