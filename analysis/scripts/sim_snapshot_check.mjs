// 4.1.2：实时模拟倒回时从快照接着算，必须和从 0 算逐位相同。
// 用真实 Sim / 采样（drawFrameSamples40），只把 GPU 画点换成「记下星头缓冲」，比较两条路径每个样本的星头数据。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const load = (ctx, n) => vm.runInContext(fs.readFileSync(path.join(root, 'tool/src/js', n + '.js'), 'utf8'), ctx, { filename: n });
const recipe = JSON.parse(fs.readFileSync(path.join(root, 'analysis/迭代/条目.json'), 'utf8'));
const ids = process.argv.slice(2).filter(a => !a.startsWith('--'));
const pick = ids.length ? ids : ['HK10-1', 'HK10-2', 'QN11-2', 'JM4-40', 'QC7-1', 'PK4-2', 'HK5-2'];
let bad = 0;
for (const id of pick) {
  const e = recipe.entries.find(x => x.id === id); if (!e) { console.log(id, '找不到，跳过'); continue; }
  const rec = [];
  const ctx = vm.createContext({ console, window: {}, REFS: {}, performance, structuredClone, TextEncoder, setTimeout, PPMY: 0,
    bufH: new Float32Array(4 * 30000), bufT: new Float32Array(4 * 450000),
    buildTrack: () => ({ total: 0 }), disposeTrack: () => {},
    drawPoints: (b, n, view, ppm, mask) => { if (mask[0]) rec.push(Array.from(b.subarray(0, n * 4))); }, drawSparksGPU: () => {} });
  for (const n of ['00_util', '05_quality', '10_types', '20_sim', '30_plan', '31_plan40', '48_render40', '50_bake']) load(ctx, n);
  ctx.input = e;
  vm.runInContext(`var P = {...defaultsFor(input.base, 40).P, ...input.p, type: input.base}; var pl = plan(P, measure(P));`, ctx);
  const times = [0.02, 0.5, 0.517, 0.533, 2, 2.0167, 2.0333, 5, 5.0167, 7.9, 7.9167, 7.95, 1.2, 1.2167];   // 前进 + 一次大幅倒回（拖时间轴）
  const run = fresh => { rec.length = 0; vm.runInContext(`var R0 = makeRenderer(P, 'burst');`, ctx);
    for (const t of times) { ctx.tt = t; vm.runInContext(fresh ? `R0.dispose(); R0 = makeRenderer(P, 'burst'); drawFrameSamples40(P, pl, R0, tt, [0,0,600,600], 1);` : `drawFrameSamples40(P, pl, R0, tt, [0,0,600,600], 1);`, ctx); }
    return rec.map(a => a.slice()); };
  const a = run(false), b = run(true);
  let diff = a.length !== b.length ? 1 : 0;
  for (let i = 0; !diff && i < a.length; i++) { if (a[i].length !== b[i].length) diff = 1; else for (let j = 0; j < a[i].length; j++) if (a[i][j] !== b[i][j]) { diff = 1; break; } }
  console.log(`${id}: ${a.length} 个样本，${diff ? '❌ 和从 0 算不一致' : '✅ 逐位一致'}`); bad += diff;
}
if (process.argv.includes('--check')) assert.equal(bad, 0, '快照接着算和从 0 算不一致');
