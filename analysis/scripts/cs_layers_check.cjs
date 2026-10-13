// RT6 合并尾部：曲线、独立余烬、燃尽门限和确定性积分。
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'../..');
const ctx=vm.createContext({console,window:{},REFS:{},HDR:'',performance,TextEncoder,structuredClone});
for(const f of ['00_util','05_quality','10_types','20_sim','30_plan','45_physbody','46_emitset','47_risetail']) { let s=fs.readFileSync(path.join(root,'tool/src/js',f+'.js'),'utf8'); if(f==='46_emitset')s=s.slice(0,s.indexOf('// 4.9.32')); vm.runInContext(s,ctx); }
vm.runInContext(`
const p={...BASE,rtFar:1,rtFRate:50,rtMRate:0,rtCRate:0,rtGpuF:0,rtERate:0};
const li=rtLoopInfo(p), c=rtTexClasses({...p,rtFBrightCurve:'0:0.5,1:0.5'},li)[0];
if(!c.brightCurve) throw Error('合并贴图遗漏亮度曲线');
if(rtTailCurve(c.brightCurve,.4,1)!==.5) throw Error('亮度曲线未求值');
if(rtTailCurve(c.brightCurve,.4,0)!==1) throw Error('燃尽前曲线改变了亮度');
const e=rtTexClasses({...p,rtETex:1,rtERate:8},li).find(x=>x.k==='E');
if(!e||rtTexClasses({...p,rtERate:8},li).some(x=>x.k==='E')) throw Error('余烬分配开关失效');
const q=rtTexSparkOf(p,c,0), xyz=[0,0,10], T=2, a=3;
const m=rtLateMotion({...p,rtLateWind:.6},xyz,2,30,q,a,T,.1);
const fine=rtLateMotion({...p,rtLateWind:.6},xyz,2,30,q,a,T,.1,1/120);
if(Math.max(...m.map((v,i)=>Math.abs(v-fine[i])))>.002) throw Error('积分未收敛');
if(JSON.stringify(m)!==JSON.stringify(rtLateMotion({...p,rtLateWind:.6},xyz,2,30,q,a,T,.1))) throw Error('重复求值不确定');
const z=rtLateMotion(p,xyz,2,30,q,a,T,.1), exp=Math.exp(-q.kd*a), s=(1-exp)/q.kd;
if(z[0]!==xyz[0]+.1*Math.cos(q.ph)+2*s+q.wx*(a-s)) throw Error('关闭气流不等于原解析解');
`,ctx);
console.log('PASS 曲线接线、前段门限、余烬开关、确定性、步长收敛、关闭解析解');
// 捕获生产渲染器送给 GPU 的全部光点，直接验证前段的位置、大小、亮度及头层。
ctx.PPMY=0;ctx.bufT=new Float32Array(2000000);ctx.bufH=new Float32Array(20000);
ctx.drawPoints=(buf,n)=>{ctx.captured.push(Array.from(buf.slice(0,n*4)));};
ctx.original=JSON.parse(fs.readFileSync(path.join(root,'analysis/原理/条目_CometSilver3.json'),'utf8')).entries;
ctx.candidates=JSON.parse(fs.readFileSync(path.join(root,'analysis/原理/条目_CometSilverLayers.json'),'utf8')).entries;
const results=vm.runInContext(`(()=>{
 const result=[];
 function capture(P,t){captured=[];const b=rtBallistic(P);drawRiseTailLive(P,rtLoopInfo(P),b,t,[0,45,50,50],4.8);return JSON.stringify(captured);}
 for(let i=0;i<original.length;i++){
  const before={...BASE,...original[i].p},after={...BASE,...candidates[i].p},T=rtBallistic(before).T;
  let samples=0;for(let t=0;t<=T;t+=1/30){if(capture(before,t)!==capture(after,t))throw Error('前段光点改变 '+original[i].id+' '+t);samples++;}
  if(i!==1){
   for(const key of ['rtLateWind','rtETex'])if(capture(after,T+1)===capture({...after,[key]:0},T+1))throw Error('控件无效 '+key);
   if(capture(after,T+1)===capture({...after,rtFBrightCurve:'',rtFSizeCurve:''},T+1))throw Error('曲线无效');
  }
  result.push({id:candidates[i].id,preburn_samples:samples,preburn_points_exact:true,controls_change_tail:i!==1});
 }
 return result;
})()`,ctx);
fs.writeFileSync(path.join(root,'analysis/results/CS3_Layers/内核检查.json'),JSON.stringify({pass:true,tests:'曲线、余烬、气流、步长减半、重复求值和关闭解析解',results},null,2));
console.log('PASS 全部前段 GPU 光点逐值一致，独立控制均改变末段',results);
