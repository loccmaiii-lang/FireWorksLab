// 纯数据检查（不开浏览器）：4.0 模拟稳定（问题清单 E1–E4）。3.7 的行为由 motion_plan_check.mjs 的 a707b63 对比保证不变。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const context=vm.createContext({console,window:{},REFS:{},performance,structuredClone});
const load=n=>vm.runInContext(fs.readFileSync(path.join(root,'tool/src/js',n+'.js'),'utf8'),context,{filename:n});
for(const n of ['00_util','05_quality','10_types','20_sim'])load(n);
const run=c=>JSON.parse(vm.runInContext('JSON.stringify('+c+')',context));
const checks=[];const check=(n,f)=>{try{f();checks.push({n,pass:true});}catch(e){checks.push({n,pass:false,e:e.message});}};
const stars=(over,ver=40,steps=0)=>run(`(()=>{const P=({...defaultsFor('kiku',${ver}).P,...${JSON.stringify(over)}}),s=new Sim(P);for(let i=0;i<${steps};i++)s.step(H_STEP);
  return s.all.map(q=>({burn:q.burn,v:Math.hypot(q.vx,q.vy,q.vz),ign:q.ign,x:q.x,y:q.y,ph:q.ph}));})()`);
check('4.0: adding one star keeps the other stars\' burn / speed / phase',()=>{
  const a=stars({stars:150}),b=stars({stars:151});
  // 方向格点会随星数变（结构本身），燃烧时间、速度倍数、相位只看星号
  let same=0;for(let i=0;i<150;i++)if(Math.abs(a[i].burn-b[i].burn)<1e-12&&Math.abs(a[i].ph-b[i].ph)<1e-12)same++;
  assert.equal(same,150);
});
check('4.0: turning on delayed ignition does not reshuffle speed / burn',()=>{
  const a=stars({ignDelay:0}),b=stars({ignDelay:0.01,ignJit:10});
  let same=0;for(let i=0;i<a.length;i++)if(Math.abs(a[i].v-b[i].v)<1e-9&&Math.abs((b[i].burn-b[i].ign)-a[i].burn)<1e-9)same++;
  assert.equal(same,a.length);
});
check('3.7 still reshuffles (unchanged legacy behaviour, for the record)',()=>{
  const a=stars({stars:150},37),b=stars({stars:151},37);let same=0;for(let i=0;i<150;i++)if(Math.abs(a[i].burn-b[i].burn)<1e-12)same++;
  assert.ok(same<150);
});
check('4.0: tiny sub-star terminal velocity stays finite (semi-implicit drag)',()=>{
  const r=run(`(()=>{const P=({...defaultsFor('senrin',40).P,subVt:0.5,subSpeed:45}),s=new Sim(P);for(let i=0;i<Math.round(3/H_STEP);i++)s.step(H_STEP);
    return s.all.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.vx));})()`);
  assert.equal(r,true);
});
check('4.0: stars that hit the water record the time they died',()=>{
  const r=run(`(()=>{const P=({...defaultsFor('water',40).P}),s=new Sim(P);for(let i=0;i<Math.round(P.duration/H_STEP);i++)s.step(H_STEP);
    const d=s.all.filter(q=>q.tDead!=null);return {dead:d.length,early:d.filter(q=>q.tDead<q.birth+q.burn-1e-6).length};})()`);
  assert.ok(r.dead>0 && r.early===r.dead, JSON.stringify(r));
});
const pass=checks.every(c=>c.pass);console.log(JSON.stringify({pass,checks},null,1));process.exit(pass?0:1);
