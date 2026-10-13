// FanGold 只读物理诊断：真实 Sim、解析对照；不修改配方或 Blender 文件。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=process.argv[2] || 'D:/Blender/Firework_FX_Lab';
const out=path.join(root,'analysis/results/FC6O_Blender');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const P=read(path.join(out,'完整参数.json')).P;
const reference=read(path.join(source,'assets/Fan_Gold_Comets/V04_Draft/parameters.json'));
const context=vm.createContext({console,setTimeout,window:{},REFS:{},performance,TextEncoder,structuredClone,input:P});
for(const n of ['00_util','05_quality','10_types','20_sim']) vm.runInContext(fs.readFileSync(path.join(root,'tool/src/js',n+'.js'),'utf8'),context,{filename:n});
// GPU 配方的真实主星模拟；这里只测轨迹，不执行 GPU 渲染或像素验收。
const population=vm.runInContext(`(()=>{
 const sim=new Sim({...input,engine:'gpu'}), dt=1/480;
 const initial=sim.all.map(s=>({id:s.id,burn:s.burn,vx:s.vx,vy:s.vy,vz:s.vz}));
 const fallen=new Set(), frames=[];
 for(let n=1;n<=3120;n++){
   sim.step(dt);
   for(const s of sim.all) if(s.alive && s.vy<0) fallen.add(s.id);
   if([816,1104,1440,1680,1920].includes(n)){
     const live=sim.all.filter(s=>s.alive);
     frames.push({time:n*dt,alive:live.length,descending:live.filter(s=>s.vy<0).length,minVy:live.length?Math.min(...live.map(s=>s.vy)):null});
   }
 }
 return {count:initial.length,everDescendingWhileAlive:fallen.size,burnRange:[Math.min(...initial.map(s=>s.burn)),Math.max(...initial.map(s=>s.burn))],frames};
})()`,context);
// 单星由同一 Sim 积分；延长寿命只为找顶点，绝非当前效果的可见轨迹。
function baker(v0,angle,g=P.grav,dt=1/480){
 context.test={v0,angle,g,dt};
 return vm.runInContext(`(()=>{
  const sim=new Sim({...input,engine:'gpu',turb:0,wind:0,flutter:0}), s=sim.all[0], t=test;
  sim.stars=[s];sim.all=[s];s.x=s.y=s.z=0;s.vx=t.v0*Math.sin(t.angle*Math.PI/180);s.vy=t.v0*Math.cos(t.angle*Math.PI/180);s.vz=0;s.age=0;s.birth=0;s.burn=20;s.grav=t.g;
  const samples=[];let apex=null;
  for(let i=1;i<=Math.round(10/t.dt);i++){
   sim.step(t.dt);const time=i*t.dt;
   if(apex===null && s.vy<=0)apex=time;
   if(i%Math.round(.1/t.dt)===0)samples.push({age:+time.toFixed(6),x:s.x,y:s.y,vx:s.vx,vy:s.vy});
  }
  return {apex,samples};
 })()`,context);
}
function linear(v0,angle,g=.7,k=.95){
 const vx=v0*Math.sin(angle*Math.PI/180),vy=v0*Math.cos(angle*Math.PI/180);
 return {apex:Math.log(1+k*vy/g)/k,samples:Array.from({length:100},(_,i)=>{
  const age=(i+1)/10,e=Math.exp(-k*age),a=(1-e)/k,b=(age-a)/k;
  return {age,x:vx*a,y:vy*a-g*b,vx:vx*e,vy:vy*e-g*a};
 })};
}
const nativeOuter=reference.systems[0].emitters[0].parameters;
const files=['production/fan_gold_motion_v04.py','production/fan_gold_shedding.py','src/fxlab/nodes/analytic.py','assets/Fan_Gold_Comets/V04_Draft/parameters.json'];
const hashes=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(fs.readFileSync(path.join(source,p))).digest('hex')]));
const a=baker(27,48), b=baker(27,48,P.grav,1/960);
const result={scope:'CPU 轨迹诊断；非本次 Blender 执行或 GPU 像素验证。年龄从各星出生起算。顶点外推延长了寿命。',population,gravity:{blenderMain:.7,bakerMain:9.81*P.grav,blenderGrain:.7,bakerGrain:9.81*P.sparkGrav},nativeOuter,actualRecipes:{blender:linear(19.584,48),baker:a},sameInitialVelocityAndGravity:{blender:linear(19.584,48,.6867),baker:baker(19.584,48)},stepConvergence:{apex480:a.apex,apex960:b.apex,deltaYAt3s:Math.abs(a.samples[29].y-b.samples[29].y)},grainGravityOnly:[.5,1,1.5,2].map(age=>({age,blenderDrop:.7/5.5*(age-(1-Math.exp(-5.5*age))/5.5),bakerDrop:9.81*P.sparkGrav/5.5*(age-(1-Math.exp(-5.5*age))/5.5)})),sourceHashes:hashes};
fs.writeFileSync(path.join(out,'扰动与物理数值.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({population,gravity:result.gravity,apex:{blender:result.actualRecipes.blender.apex,baker:a.apex},sameVelocityApices:{linear:result.sameInitialVelocityAndGravity.blender.apex,quadratic:result.sameInitialVelocityAndGravity.baker.apex},at3s:{blender:result.actualRecipes.blender.samples[29],baker:a.samples[29]},stepConvergence:result.stepConvergence,grainGravityOnly:result.grainGravityOnly},null,2));
