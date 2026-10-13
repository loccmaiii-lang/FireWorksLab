// 只读参数作用核对，不修改配方，也不代表 GPU 视觉验收。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir=path.join(root,'analysis/results/CS3_RT6');
const raw=JSON.parse(fs.readFileSync(path.join(dir,'完整参数.json'),'utf8'));
const ctx=vm.createContext({console,window:{},REFS:{},performance,TextEncoder,structuredClone});
for(const f of ['00_util','05_quality','10_types','20_sim','30_plan','45_physbody','47_risetail']) vm.runInContext(fs.readFileSync(path.join(root,'tool/src/js',f+'.js'),'utf8'),ctx,{filename:f});
const result={};
for(const id of ['CS3C','CS3S']){
 ctx.P=raw[id].layers?raw[id].layers[0].P:raw[id].P;
 result[id]=vm.runInContext(`(()=>{
  const base=rtLoopInfo(P),cl=rtTexClasses(P,base),q=rtTexSparkOf(P,cl[0],100),rows=[];
  for(const spin of [0,.46875,.5,.9375,1]){
   const p={...P,rtSpin:spin},li=rtLoopInfo(p);
   rows.push({spin,cycle:li.Tl,frames:li.F,loopFps:li.fps});
  }
  const motion=p=>{const li=rtLoopInfo(p),c=rtTexClasses(p,li)[0],q=rtTexSparkOf(p,c,100);return {q,xy:rtTexSparkAt(p,q,.7,25,p.rtD/2,[])}};
  const a=motion(P),b=motion({...P,rtTurb:P.rtTurb+10,rtTurbL:2}),c=motion({...P,rtTurbS:0});
  return {baselinePeriod:base.Tl,loopSweep:rows,
   largeTurbDoesNotChangeTextureSample:JSON.stringify(a)===JSON.stringify(b),
   smallTurbChangesTextureSample:JSON.stringify(a)!==JSON.stringify(c),
   fineSizeBrightnessCurvesDoNotChangeTextureClasses:JSON.stringify(cl)===JSON.stringify(rtTexClasses({...P,rtFSizeCurve:'0:0.1,1:0.1',rtFBrightCurve:'0:0.1,1:0.1'},base)),
   classAmplitudes:cl.map(c=>({class:c.k,nominalKd:c.kd,spinEnvelopeMetres:P.rtFling/c.kd,randomSpreadScaleMetres:P.rtCone/c.kd})),
   baselineFlingTerm:-(P.rtFling||0)*Math.sin(q.ph),noParticlePixelsTested:true};
 })()`,ctx);
}
fs.writeFileSync(path.join(dir,'动态参数核对.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
