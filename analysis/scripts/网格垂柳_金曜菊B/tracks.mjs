// 金曜菊-B 两条引菊层的星头轨迹：载入烘焙器模拟核（tool/src/js/20_sim.js，vm，不开浏览器），逐星记录点火后的真实位置。
// 用法：node tracks.mjs [配方.json] [输出.json]
// 输出 fwl.star-tracks/2（在 /1 的基础上多了每颗星的起点时刻 t0：延时点火的层，星点火前不画）：
//   { format, recipe, layers:[{ name, P:{…关键参数}, dt, stars:[{ id, t0, p:[x,y,z,…], be }] }] }  单位米，y 朝上，爆点为原点
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { performance } from 'node:perf_hooks'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const REC = process.argv[2] || path.join(root, 'analysis/我的配方/my_fxmv7lp8ci/金曜菊-B__fxmv7lp8ci.json');
const OUT = process.argv[3] || path.join(root, 'analysis/results/MESH_WILLOW_20261016/金曜菊B/tracks_baker.json');
const LAYERS = (process.argv[4] || '0,1').split(',').map(Number);   // 第 2 层是点灭星（没有尾巴），不做网格
const ctx = vm.createContext({ console, setTimeout, window: {}, REFS: {}, performance, TextEncoder, structuredClone });
for (const n of ['00_util', '05_quality', '10_types', '20_sim']) vm.runInContext(fs.readFileSync(path.join(root, 'tool/src/js', n + '.js'), 'utf8'), ctx, { filename: n });
const VERSION = vm.runInContext('VERSION', ctx);
const rec = JSON.parse(fs.readFileSync(REC, 'utf8'));
const out = { format: 'fwl.star-tracks/2', recipe: rec.name, 烘焙器: VERSION, 配方存档: rec.at, layers: [] };
for (const li of LAYERS) {
  const layer = rec.snap.layers[li], P0 = layer.P; ctx.__P = P0;
  const r = vm.runInContext(`(()=>{
    const P={...__P,engine:'gpu'}, s=new Sim(P), h=1/240, n=Math.ceil(P.duration/h), out=new Map();
    const stop = P.sparkStop > 0 && !(P.emberFrac > 0 && P.emberAll) ? P.sparkStop : 1e9;
    for(let i=0;i<n;i++){ s.step(h); if((i+1)%4) continue;
      for(const st of s.stars){ if(st.kind===5 || !st.alive) continue;
        const ign = st.ign || 0, a = st.age - ign; if (a < 0) continue;
        const endAge = Math.min(st.burn, ign + stop); if (st.age > endAge + 1e-6) continue;
        let q=out.get(st.id); if(!q) out.set(st.id,q={ t0: +s.t.toFixed(5), p:[], be: +endAge.toFixed(4), ign, burn: st.burn });
        q.p.push(+st.x.toFixed(3),+st.y.toFixed(3),+st.z.toFixed(3)); } }
    return [...out.entries()];
  })()`, ctx);
  const stars = r.filter(([, q]) => q.p.length >= 9).map(([id, q]) => ({ id, t0: q.t0, p: q.p, be: q.be }));
  const pick = ['v0', 'vt', 'grav', 'burn', 'burnJit', 'speedJit', 'dirJit', 'stars', 'ignDelay', 'ignJit', 'sparkRate', 'sparkRateEnd', 'sparkStop', 'sparkRamp', 'sparkLife', 'sparkLifeEnd', 'sparkLifeJit', 'sparkSize', 'sparkSpread', 'sparkInherit', 'sparkDrag', 'sparkGrav', 'T0', 'cooling', 'sparkBright', 'twinkle', 'tailDiffuse', 'headBright', 'headSize', 'exposure', 'duration', 'emberFrac', 'seed'];
  out.layers.push({ name: layer.L.title || ('层' + li), index: li, P: Object.fromEntries(pick.map(k => [k, P0[k]])), M: layer.M, dt: 1 / 60, stars });
  const ts = stars.map(s => s.t0), be = stars.map(s => s.be), mx = stars.map(s => Math.hypot(...s.p.slice(-3)));
  const f = (a, d = 2) => `${Math.min(...a).toFixed(d)}–${Math.max(...a).toFixed(d)}`;
  console.log(`层${li} ${layer.L.title}：${stars.length} 颗星  点火 t0 ${f(ts)} s  发光结束 ${f(be)} s  末端距爆点 ${f(mx, 1)} m  点数/星 ${Math.round(stars.reduce((a, s) => a + s.p.length / 3, 0) / stars.length)}`);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out));
console.log('烘焙器', VERSION, '→', path.relative(root, OUT), (fs.statSync(OUT).size / 1e6).toFixed(2) + ' MB');
