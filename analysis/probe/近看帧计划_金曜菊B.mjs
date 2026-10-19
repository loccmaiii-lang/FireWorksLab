// 近看（30 m）金曜菊-B 各层：帧计划、每帧跳几像素、每帧停留期间半径长多少、单束合适度（导出（23），用户 10-20 00:32）。
// 只用烘焙器源码（tool/src/js），不开浏览器、不烘贴图；导出时会按烘出来的亮度裁首尾全黑帧再算一次，帧数会略少。
// 换算：模拟单位 × 0.1027 m（S1 的大小标定：311.7 → 32 m）× 935.3 / 30 px/m（1080p、竖直视角 60°，65_cascade.js 同一口径，30 m）。
// 用法：node analysis/probe/近看帧计划_金曜菊B.mjs [配方.json]
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { performance } from 'node:perf_hooks'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const context = vm.createContext({ console, setTimeout, window: {}, REFS: {}, performance, TextEncoder, structuredClone });
const run = code => vm.runInContext(code, context);
const load = name => vm.runInContext(fs.readFileSync(path.join(root, 'tool/src/js', name + '.js'), 'utf8'), context, { filename: name });
for (const name of ['00_util', '05_quality', '10_types', '12_tempo', '19_spark_late', '20_sim', '30_plan']) load(name);
vm.runInContext(fs.readFileSync(path.join(root, 'tool/data/review.js'), 'utf8'), context);
for (const name of ['14_pending', '15_replica', '31_plan40']) load(name);
const glSource = fs.readFileSync(path.join(root, 'tool/src/js/40_gl.js'), 'utf8');
run(glSource.slice(glSource.indexOf('function sizeAt'), glSource.indexOf('// 合并输出（星头')));
{ const a = glSource.indexOf('function sparkEff'); run(glSource.slice(a, glSource.indexOf('\n', a))); }
for (const name of ['48_render40', '49_playback', '50_bake', '60_export', '65_cascade', '66_fwlcascade', '70_ui', '79_curves', '18_multitypes']) { try { load(name); } catch (e) { console.error('load ' + name + ': ' + e.message); } }
const rec = JSON.parse(fs.readFileSync(process.argv[2] || path.join(root, 'analysis/我的配方/my_fxglitterb_s1/金曜菊-B_·_疏点游闪（首选）__fxglitterb_s1.json'), 'utf8'));
context.__layers = rec.snap.layers.map(l => ({ title: l.L.title, rate: l.L.rate, P: { type: l.type, ...l.P } }));

context.__K = 0.1027 * 935.3 / 30;   // 每个模拟单位在 30 m、1080p（竖直 60°）上几像素
const res = run(`(()=>{
const out=[];
for(const l of __layers){
  const P0=derive({...l.P});const fm=measure(P0);
  const cutIn=+P0.cutIn>0?+P0.cutIn:0, cutOut=+P0.cutOut>cutIn?Math.min(+P0.cutOut,P0.duration):P0.duration;
  const prof=fm.prof;
  const rAt=t=>{let b=prof[0];for(const q of prof){if(q[0]<=t)b=q;else break;}return b[2];};
  const vAt=t=>speedAt(fm,t);
  const variants={asSaved:{},S1fixed:{frameBudget:'fixed',holdTicks:0,cols:4,rows:4},motion1024:{frameBudget:'motion',cols:2,rows:2},count16:{frameBudget:'count',frameCount:16,cols:2,rows:2},count24:{frameBudget:'count',frameCount:24,cols:2,rows:2},count32:{frameBudget:'count',frameCount:32,cols:2,rows:2}};
  const vr={};
  for(const [k,o] of Object.entries(variants)){
    const P={...P0,...o};let pl;try{pl=plan(P,fm,cutIn,cutOut);}catch(e){vr[k]={err:e.message};continue;}
    const T=pl.times.map(t=>t+(+pl.t0||0)),D=pl.dur;
    const jumps=T.map((t0,f)=>{const d=D[f],n=Math.max(2,Math.ceil(d*120));let m=0;for(let i=0;i<n;i++)m+=vAt(t0+(i+0.5)*d/n)*d/n;return m*__K;});
    const grow=T.map((t0,f)=>{const a=rAt(t0),b=rAt(t0+D[f]);return a>1?b/a:null;});
    vr[k]={F:pl.L.F,pages:splitPlan40(pl).length,cell:pl.L.cellW,holdsTicks:D.map(d=>Math.round(d*30)).join(','),
      times:T.map(t=>+t.toFixed(3)),jumpPx:jumps.map(x=>+x.toFixed(1)),growPct:grow.map(g=>g?+((g-1)*100).toFixed(1):null)};
  }
  const samp=[0,0.05,0.1,0.15,0.2,0.3,0.4,0.5,0.7,1,1.3,1.6,2,2.33,3,4,5,6].filter(t=>t<=P0.duration).map(t=>[t,+rAt(t).toFixed(1),+vAt(t).toFixed(1)]);
  out.push({title:l.title,rate:l.rate,cut:[cutIn,cutOut],strobe:[P0.strobeHz,P0.strobeStart,P0.burn],samp,vr});
}
return out;})()`);

for(const L of res){console.log('== '+L.title+' rate '+L.rate+' cut '+L.cut+' strobe '+L.strobe);console.log(' r/v(sim):',JSON.stringify(L.samp));
 for(const [k,v] of Object.entries(L.vr)){if(v.err){console.log(' ',k,'ERR',v.err);continue;}console.log(' ',k,'F',v.F,'pages',v.pages,'cell',v.cell);console.log('    holds',v.holdsTicks);console.log('    jump',v.jumpPx.join(' '));console.log('    grow%',v.growPct.join(' '));}}

const fit = run(`__layers.map(l=>{const P=derive({...l.P});const f=unitFit(P);return {title:l.title,level:f&&f.level,px800:f&&f.px,pxAt30:f&&f.devM!=null?+(f.devM*__K).toFixed(1):null};})`);
console.log('单束合适度（直尾偏离，800 m 口径 / 30 m 换算）：'+JSON.stringify(fit));
