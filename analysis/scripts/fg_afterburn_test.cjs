// 普通火花燃尽后阶段与积分的数值检查；不依赖界面或GPU。
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'../..'),file=path.join(root,'tool/src/js/19_spark_late.js');
assert.ok(fs.existsSync(file),'缺少普通火花燃尽后控制');
const ctx=vm.createContext({console,Math});vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
vm.runInContext(`
const P={sparkLateWind:.6,sparkLateScale:1.5,sparkLateFade:.4};
if(sparkLateGate(P,.8,1)!==0||sparkLateGate(P,1,1)!==0||sparkLateGate(P,1.4,1)<.999999)throw Error('燃尽阶段错误');
if(sparkLateCurve(P,()=>.2,.8,.2,2,1)!==1)throw Error('前段曲线改变');
if(sparkLateCurve(P,()=>.2,1.5,.2,2,1)>.201)throw Error('末段曲线没生效');
const A=sparkLateAir(P,2,3,.8,1);if(A.some(x=>x!==0))throw Error('提前扰动');
function run(dt){let p=[0,3,0],v=[2,1,.2],t=1;while(t<2-1e-9){const h=Math.min(dt,2-t);[p,v]=sparkLateStep(P,p,v,[.1,0,0],[0,-2.4525,0],5.5,.77,t,h,1);t+=h;}return [...p,...v];}
const a=run(1/60),b=run(1/120);if(Math.max(...a.map((x,i)=>Math.abs(x-b[i])))>.003)throw Error('积分未收敛');
const c=run(1/60);if(JSON.stringify(a)!==JSON.stringify(c))throw Error('重复求值不一致');
`,ctx);console.log('PASS 燃尽阶段、前段保护、曲线、确定性、积分收敛');
const simctx=vm.createContext({console,window:{},REFS:{},HDR:'',performance,TextEncoder,structuredClone});
for(const f of ['00_util','05_quality','10_types','12_tempo','19_spark_late','20_sim','30_plan'])vm.runInContext(fs.readFileSync(path.join(root,'tool/src/js',f+'.js'),'utf8'),simctx);
simctx.template=JSON.parse(fs.readFileSync(path.join(root,'analysis/results/FG_Sync_4984/anchor-parameters.json'),'utf8')).P;
const cpuResult=vm.runInContext(`(()=>{const base={...BASE,...template,engine:'cpu',stars:12,sparkRate:20},a=new Sim(base),b=new Sim({...base,sparkLateWind:.6,sparkLateScale:1.5,sparkLateFade:.4,sparkTailAfterBurn:1,emberBrightCurve:'0:1,1:.5'});let pre=0,head=0;const burn=Math.min(...a.all.map(s=>s.birth+(s.vis??s.burn)));
for(let i=0;i<1440;i++){a.step(H_STEP);b.step(H_STEP);if(a.t<=burn){if(a.sp.n!==b.sp.n)throw Error('CPU出生数量改变');for(let k=0;k<a.sp.n*3;k++)if(a.sp.p[k]!==b.sp.p[k]||a.sp.v[k]!==b.sp.v[k])throw Error('CPU燃尽前运动改变');pre++;}
if(a.all.length!==b.all.length)throw Error('主星数改变');for(let j=0;j<a.all.length;j++){const x=a.all[j],y=b.all[j];if(x.x!==y.x||x.y!==y.y||a.headI(x)!==b.headI(y))throw Error('主星改变');}head++;}
const q={...base,sparkLateWind:.6,sparkLateFade:.4,sparkLateScale:1.5};retimeP(q,2);if(q.sparkLateWind!==1.2||q.sparkLateFade!==.2||q.sparkLateScale!==1.5)throw Error('节奏单位换算遗漏');return {preSteps:pre,headSteps:head,tempo:true};})()`,simctx);
console.log('PASS CPU前段、亮头、节奏单位',cpuResult);
fs.mkdirSync(path.join(root,'analysis/results/FG_Afterburn'),{recursive:true});fs.writeFileSync(path.join(root,'analysis/results/FG_Afterburn/CPU检查.json'),JSON.stringify({pass:true,tests:['燃尽阶段','前段曲线','时空场渐入','确定性','步长收敛','CPU前段运动','主星亮头','节奏单位'],...cpuResult},null,2));
