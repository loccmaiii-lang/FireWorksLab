// 帧号点数 · 当前计划：用烘焙器源码（tool/src/js，不开浏览器、不烘贴图）给每个资源算帧计划，统计帧号曲线点数和停留节奏。
// 资源：花型模板（TYPE_GROUPS）、多层花型模板（MULTI_TYPES 每层）、待我验收（FW_EFFECTS 阶段 = 待验收 的候选条目，组合按层）。
// 「我的效果」在用户浏览器里（localStorage fwb.myEffects），另传 --mine <json>（{ id: rec } 或 [rec]）。
// 注意：导出时还会按烘出来的亮度裁掉首尾全黑帧再重算一次（50_bake.js），这里没有显卡、不裁——点数和节奏的结论不受影响，帧数会略多。
// 用法：node analysis/scripts/帧号点数_当前计划.mjs [--mine my.json] [--out 结果.json]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const context = vm.createContext({ console, setTimeout, window: {}, REFS: {}, performance, TextEncoder, structuredClone });
const run = code => vm.runInContext(code, context);
const load = name => vm.runInContext(fs.readFileSync(path.join(root, 'tool/src/js', name + '.js'), 'utf8'), context, { filename: name });
for (const name of ['00_util', '05_quality', '10_types', '20_sim', '30_plan']) load(name);
vm.runInContext(fs.readFileSync(path.join(root, 'tool/data/review.js'), 'utf8'), context);
for (const name of ['14_pending', '15_replica', '31_plan40']) load(name);
const glSource = fs.readFileSync(path.join(root, 'tool/src/js/40_gl.js'), 'utf8');
run(glSource.slice(glSource.indexOf('function sizeAt'), glSource.indexOf('// 合并输出（星头')));
{ const a = glSource.indexOf('function sparkEff'); run(glSource.slice(a, glSource.indexOf('\n', a))); }     // sparkTailEnd（多层模板时长）要用
for (const name of ['48_render40', '49_playback', '50_bake', '60_export', '65_cascade', '66_fwlcascade', '70_ui', '79_curves', '18_multitypes']) {
  try { load(name); } catch (e) { console.error('载入 ' + name + ' 出错：' + e.message); }
}
const VERSION = run('VERSION');
if (arg('--mine')) context.MINE = JSON.parse(fs.readFileSync(arg('--mine'), 'utf8'));

// 一层：算帧计划 → 分张 → 每张帧号曲线点数 + 停留节奏
run(`
function __flips(hs){let f=0,dp=0;for(let i=1;i<hs.length;i++){const d=Math.sign(hs[i]-hs[i-1]);if(d&&dp&&d!==dp)f++;if(d)dp=d;}return f;}
function __layer(P){
  P=derive({...P});
  if(!usesTickPlan40(P))return {skip:'不是大面片序列（'+(P.form||'')+'）'};
  const fm=measure(P),cutIn=+P.cutIn>0?Math.min(+P.cutIn,P.duration-1/30):0,cutOut=+P.cutOut>cutIn?Math.min(+P.cutOut,P.duration):0;
  const pl=plan(P,fm,cutIn||0,cutOut||P.duration),pages=splitPlan40(pl);
  const holds=pl.dur.map(d=>Math.round(d*30)),hs=holds.slice(0,-1);
  const hist={};hs.forEach(h=>hist[h]=(hist[h]||0)+1);
  const led=typeof frameLedger==='function'?frameLedger(P,fm,pl):null;
  // 试算：把最慢帧率抬高以后要几张贴图、帧账本还超几帧（只改 maxHoldBurn / maxHold，不改别的；固定机位 / 手动帧数不试）
  const alt={};
  if((P.frameBudget||'motion')==='motion')for(const [k,hb,hf] of [['b15f10',2,3],['b15f15',2,2]]){
    const Q={...P,maxHoldBurn:hb,maxHold:hf},p2=plan(Q,fm,cutIn||0,cutOut||P.duration),l2=typeof frameLedger==='function'?frameLedger(Q,fm,p2):null;
    alt[k]={F:p2.L.F,pages:splitPlan40(p2).length,over:l2?l2.over:null,pts:Math.max(...splitPlan40(p2).map(p=>p.keys.length))};
  }
  // 每帧星跳多少像素（停 ≥ 2 tick 的帧）：游戏内 1080p / 1000 m，和「适配」放大（面片宽铺满 1080 像素，用户在烘焙器里放大看的尺度）
  let jump=null;
  if(typeof framePxSteps==='function'){
    const T=pl.times.map(t=>t+(+pl.t0||0)),g=framePxSteps(P,fm,T,pl.dur,1000),k=1080/Math.max(1e-6,pl.Ww)/Math.max(1e-9,gamePixelsPerMeter(P,0,1080,1000));
    const held=g.map((v,i)=>[v,Math.round(pl.dur[i]*30)]).filter(x=>x[1]>=2).map(x=>x[0]).sort((a,b)=>a-b);
    const q=p=>held.length?held[Math.min(held.length-1,Math.floor(p*held.length))]:0;
    jump={game1000_p50:+q(.5).toFixed(2),game1000_max:+q(1).toFixed(2),fit_p50:+(q(.5)*k).toFixed(1),fit_max:+(q(1)*k).toFixed(1)};
  }
  return {jump,alt,budget:P.frameBudget||'motion',zoom:P.zoom==='on',F:pl.L.F,pages:pages.length,ticks:pl.nTicks,
    framePts:pages.map(p=>p.keys.length),sizePts:pages.map(p=>p.sizeKeys.length),
    holdChanges:hs.filter((h,i)=>i&&h!==hs[i-1]).length,holdFlips:__flips(hs),hist,minFps:+(30/Math.max(...hs,1)).toFixed(2),
    seq:holds.map(h=>Math.min(h,9)).join(''),over:led?led.over:null,
    glitter:+P.glitter||0,twinkle:+P.twinkle||0,flicker:+P.flicker||0,strobeHz:+P.strobeHz||0,glitterW:+P.glitterW||0};
}
`);
const rows = [];
const add = (group, id, name, layer, P, out) => {
  context.__P = P;
  let r; try { r = run('__layer(__P)'); } catch (e) { r = { error: e.message }; }
  rows.push({ group, id, name, layer, out: out || 'seq', ...r });
};
// 1 花型模板
for (const [g, ts] of run('TYPE_GROUPS')) for (const t of ts) {
  context.__t = t; const P = run('defaultsFor(__t).P'); add('花型模板', 'type:' + t, run('TYPE_NAMES[__t]'), 0, P);
}
// 2 多层花型模板
for (const r of run('MULTI_TYPES.map(r=>({id:r.id,name:r.name}))')) {
  context.__id = r.id; const ls = run('mtLayers(__id).map(l=>({title:l.title,P:l.P,out:l.out}))');
  ls.forEach((l, i) => add('多层花型模板', 'mt:' + r.id, r.name + ' · ' + l.title, i + 1, l.P, l.out && l.out.pc));
}
// 3 待我验收（状态清单 → review.js 的 FW_EFFECTS）
for (const ef of run('FW_EFFECTS.filter(ef=>ef.阶段==="待验收"&&ef.待验收版).map(ef=>({key:ef.key,name:ef.名,id:ef.待验收版}))')) {
  context.__id = String(ef.id).replace(/^rep:/, '');
  const ls = run(`(()=>{const e=FW_REVIEW_LIST.find(x=>x.id===__id);if(!e)return [];const ids=e.kind==='combo'?(e.layerIds||[]):[e.id];
    return ids.map((lid,i)=>{let P=null;try{P=replicaPM(lid).P;}catch(err){}const o=e.combo&&e.combo.layers&&e.combo.layers[i]&&e.combo.layers[i].out;return {lid,P,out:o&&o.pc};});})()`);
  if (!ls.length) rows.push({ group: '待我验收', id: ef.id, name: ef.name, error: '找不到候选条目' });
  ls.forEach((l, i) => l.P ? add('待我验收', ef.id, ef.name + ' · ' + l.lid, i + 1, l.P, l.out) : rows.push({ group: '待我验收', id: ef.id, name: ef.name + ' · ' + l.lid, error: '没有参数' }));
}
// 4 我的效果（可选）
if (context.MINE) {
  const recs = Array.isArray(context.MINE) ? context.MINE : Object.values(context.MINE);
  for (const rec of recs) {
    const snap = rec.snap || {}; const ls = snap.kind === 'combo' ? snap.layers || [] : [{ type: snap.type, P: snap.P, L: {} }];
    ls.forEach((l, i) => { if (!l || !l.P) return; const o = l.L && l.L.out; add('我的效果', 'my:' + rec.id, (rec.name || rec.id) + ' · ' + ((l.L && l.L.title) || l.type || ''), i + 1, { type: l.type, ...l.P }, o && o.pc); });
  }
}
const out = arg('--out');
if (out) fs.writeFileSync(out, JSON.stringify({ version: VERSION, rows }, null, 1));
// 汇总
const seq = rows.filter(r => r.framePts && !['dots', 'off', 'frame', 'unit'].includes(r.out));
console.log(`烘焙器 ${VERSION}：${rows.length} 层，其中大面片序列 ${seq.length} 层`);
for (const g of ['花型模板', '多层花型模板', '待我验收', '我的效果']) {
  const L = seq.filter(r => r.group === g); if (!L.length) continue;
  const pts = L.map(r => Math.max(...r.framePts)).sort((a, b) => a - b), fl = L.map(r => r.holdFlips).sort((a, b) => a - b);
  console.log(`${g}：${L.length} 层 · 帧号点数 ${pts[0]}–${pts[pts.length - 1]}（中位 ${pts[pts.length >> 1]}）· 节奏来回切 ${fl[0]}–${fl[fl.length - 1]}（中位 ${fl[fl.length >> 1]}）· 预算 ${[...new Set(L.map(r => r.budget))].join('/')}`);
}
