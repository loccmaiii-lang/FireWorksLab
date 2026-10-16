// 用 v2 页面里同一套模拟 / 分段函数，算手游 2000 顶点能放几束
import fs from 'fs'; import vm from 'vm';
const html = fs.readFileSync(new URL('../../../tool/prototypes/mesh-willow-v2/index.html', import.meta.url),'utf8');
const core = html.split('<script id="mw-core">')[1].split('</script>')[0];
const ctx = {Math, Float32Array, Float64Array, Uint8Array, Uint32Array, Array, Error, console}; ctx.globalThis = ctx;
vm.createContext(ctx); vm.runInContext(core, ctx);
const C = ctx.MWCore; ctx.simulate = C.simulate; ctx.fpsOrder = C.fpsOrder; ctx.segment = C.segment;
const stars = ctx.simulate({N:400,v0:345,vt:34,gm:1,burn:7.3,burnJit:6,spd:20,seed:7});
const order = ctx.fpsOrder(stars);
const rows=[];
for (const E of [0.78, 1.5, 3, 5, 8]) {
  const segs = order.map(i=>ctx.segment(stars[i],E).keep.length-1);
  const lateP95 = (()=>{const a=[];order.slice(0,150).forEach(i=>a.push(...ctx.segment(stars[i],E).late));a.sort((x,y)=>x-y);return a[Math.floor(a.length*0.95)];})();
  const avg = segs.reduce((a,b)=>a+b,0)/segs.length;
  const vPer = (avg+1)*2;
  rows.push(`ε ${E} m（${(E/1.56).toFixed(1)} px@800m）: 每束 ${avg.toFixed(1)} 段 → 单片每束 ${vPer.toFixed(1)} 顶点；2000 顶点 ≈ 单片 ${Math.floor(2000/vPer)} 束 / 十字 ${Math.floor(1000/vPer)} 束；p95 误差 ${lateP95.toFixed(2)} m`);
}
console.log(rows.join('\n'));
