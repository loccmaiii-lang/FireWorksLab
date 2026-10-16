// 网格垂柳生成器（试点，2026-10-16，对话框网格垂柳）
// 用烘焙器模拟核（tool/src/js/20_sim.js，vm 载入，不开浏览器、不烘贴图）跑配方主层，每颗星的星头轨迹做成一束「十字带」：
//   - 世界固定朝向（Cascade Required = PSA_Square，网格不跟镜头转），两片带沿平行移动标架互相垂直 → 任何方向看都不会变成一条棱；
//   - V = 星头经过这里的时刻 / S，材质 UV 匀速流动（Dynamic Parameter 0 = h − t / S）时星头按真实速度走，尾巴亮度 = 条带贴图按年龄给；
//   - 条带贴图横向分 4 列变体（尾长 / 星头亮度 / 余烬错落），每束随机取一列。
// 用法：node analysis/scripts/网格垂柳_生成.mjs [--recipe <我的配方.json>] [--counts 200,300,400] [--px 0.5] [--out <目录>] [--preview <目录>]
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import zlib from 'node:zlib';
import { performance } from 'node:perf_hooks'; import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const RECIPE = arg('--recipe', path.join(root, 'analysis/我的配方/my_fxmuxsrd36/鸿巢四尺玉_·_我的_·_大小与造型_·_我的__fxmuxsrd36.json'));
const COUNTS = arg('--counts', '200,300,400').split(',').map(Number);
const PX = +arg('--px', '0.5');                       // 星头位置误差（像素，800 m、1080p，标准 2.1 的游戏内大小）
const OUT = arg('--out', path.join(root, 'analysis/local/MESH_WILLOW_20261016/网格'));
const PREVIEW = arg('--preview', path.join(root, 'tool/prototypes/mesh-willow-v1/data'));
const W = +arg('--width', '5');                       // 每片带宽（m），横向是软边，看得见的芯约 W / 3
const S = 4.8, H = 0.75;                              // 条带贴图：年龄 0 在 V = H（星头前留 25 % 透明区，贴图缩小时 mip 不会把星头的亮度混进「还没飞到」的那段），往下到 V = 0 是年龄 H × S = 3.6 s
const L = 11.0;                                       // 网格粒子寿命（s）
const ALPHA = [[0, 1], [8.8, 1], [10.8, 0]];           // 整朵透明度（秒）：最后一批星头约 9.8 s 熄灭（含生长错落），余烬随整朵淡掉
const EARLY = 0.6, EARLY_K = 4;                       // 开花 0.6 s 内（过曝白球期）误差放宽 4 倍
const GROW = +arg("--grow", "0.15");                  // 生长错落：每束播放速度 × (1 ± GROW)，像初速不同（用户 10-16 06:20「每一束不要生长过于均匀」）
const TRIM_P = +arg("--trimP", "0.45"), TRIM = +arg("--trim", "0.14");   // 熄灭错落：45 % 的束随机提前 4 %…(4 + 14) % 熄灭（「uv 最后有一些随机错落」）
const TEX_W = 64, TEX_H = 512, VARIANTS = 4;
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(PREVIEW, { recursive: true });

// ---------- 1. 模拟（和烘焙器同一份源码） ----------
const ctx = vm.createContext({ console, setTimeout, window: {}, REFS: {}, performance, TextEncoder, structuredClone });
for (const n of ['00_util', '05_quality', '10_types', '20_sim']) vm.runInContext(fs.readFileSync(path.join(root, 'tool/src/js', n + '.js'), 'utf8'), ctx, { filename: n });
const VERSION = vm.runInContext('VERSION', ctx);
const rec = JSON.parse(fs.readFileSync(RECIPE, 'utf8'));
const layer = rec.snap.layers[0], P0 = layer.P, LM = layer.L;
ctx.__P = P0;
const sim = vm.runInContext(`(()=>{
  const P={...__P,engine:'gpu'}, s=new Sim(P), h=1/240, n=Math.ceil(P.duration/h), out=new Map();
  for(let i=0;i<n;i++){ s.step(h); if((i+1)%4) continue;
    for(const st of s.stars){ if(st.kind===5) continue; const I=st.alive?s.headI(st):0; if(!(I>0)) continue;
      let q=out.get(st.id); if(!q) out.set(st.id,q=[]); q.push([+s.t.toFixed(5),st.x,st.y,st.z]); } }
  return [...out.entries()];
})()`, ctx);
const tracks = sim.filter(([, q]) => q.length > 2).map(([id, q]) => ({ id, q: [[0, 0, 0, 0], ...q] }));   // 前面补开花点（t = 0）
console.log('烘焙器', VERSION, '配方', rec.name, '星头轨迹', tracks.length);

// ---------- 2. 嵌套子集：按初速方向最远点取样（200 ⊂ 300 ⊂ 400 ⊂ 600） ----------
const dir = t => { const p = t.q[Math.min(3, t.q.length - 1)], r = Math.hypot(p[1], p[2], p[3]) || 1; return [p[1] / r, p[2] / r, p[3] / r]; };
const D = tracks.map(dir), order = [0], used = new Uint8Array(tracks.length); used[0] = 1;
const best = D.map(d => 2 - 2 * (d[0] * D[0][0] + d[1] * D[0][1] + d[2] * D[0][2]));
while (order.length < tracks.length) {
  let k = -1, m = -1; for (let i = 0; i < D.length; i++) if (!used[i] && best[i] > m) { m = best[i]; k = i; }
  order.push(k); used[k] = 1; for (let i = 0; i < D.length; i++) if (!used[i]) { const e = 2 - 2 * (D[i][0] * D[k][0] + D[i][1] * D[k][1] + D[i][2] * D[k][2]); if (e < best[i]) best[i] = e; }
}

// ---------- 3. 分段：一段内按时间线性插值（= UV 匀速），最大位置误差 ≤ eps ----------
const pxPerM = 360 / 700 * 1000 / 800, EPS = PX / pxPerM;
function segment(q) {
  const keep = [0]; let i = 0;
  while (i < q.length - 1) {
    let ok = i + 1;
    for (let j = i + 2; j < q.length; j++) {
      let bad = false; const a = q[i], b = q[j];
      for (let k = i + 1; k < j; k++) {
        const u = (q[k][0] - a[0]) / (b[0] - a[0]);
        const e = Math.hypot(q[k][1] - (a[1] + (b[1] - a[1]) * u), q[k][2] - (a[2] + (b[2] - a[2]) * u), q[k][3] - (a[3] + (b[3] - a[3]) * u));
        if (e > (q[k][0] < EARLY ? EARLY_K * EPS : EPS)) { bad = true; break; }
      }
      if (bad) break; ok = j;
    }
    keep.push(ok); i = ok;
  }
  return keep.map(k => q[k]);
}
// 星头位置误差自检：每个原始采样点和「段内按时间插值」的距离
function maxErr(q, s) {
  let worst = 0, worstLate = 0, j = 0;
  for (const p of q) { while (j < s.length - 2 && s[j + 1][0] < p[0]) j++; const a = s[j], b = s[j + 1], u = Math.min(1, Math.max(0, (p[0] - a[0]) / (b[0] - a[0] || 1)));
    const e = Math.hypot(p[1] - (a[1] + (b[1] - a[1]) * u), p[2] - (a[2] + (b[2] - a[2]) * u), p[3] - (a[3] + (b[3] - a[3]) * u)); if (p[0] < EARLY) worst = Math.max(worst, e); else worstLate = Math.max(worstLate, e); }
  return [worst, worstLate];
}

// ---------- 4. 十字带（平行移动标架） ----------
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
function buildStrand(sec, id, k) {     // k：这一束的播放快慢（星头在虚拟时刻 k·τ 到达轨迹上 τ 那一点）
  const pts = sec.map(p => [p[1], p[2], p[3]]), T = pts.map((p, i) => nrm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)])));
  let up = Math.abs(T[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  let n = nrm(crs(crs(T[0], up), T[0]));
  const a0 = hash(id, 7) * Math.PI;                 // 每束十字转一个随机角，不让全部十字对齐成同一种花纹
  const b0 = crs(T[0], n); n = nrm([n[0] * Math.cos(a0) + b0[0] * Math.sin(a0), n[1] * Math.cos(a0) + b0[1] * Math.sin(a0), n[2] * Math.cos(a0) + b0[2] * Math.sin(a0)]);
  const variant = Math.floor(hash(id, 3) * VARIANTS), u0 = variant / VARIANTS, u1 = (variant + 1) / VARIANTS;
  const V = [], UV = [], IDX = [];
  for (let i = 0; i < pts.length; i++) {
    if (i) { n = sub(n, T[i].map(x => x * dot(n, T[i]))); n = nrm(n); }
    const b = crs(T[i], n), r = Math.hypot(...pts[i]), w = W / 2 * (0.25 + 0.75 * ss(0, 40, r));   // 开花点 40 m 内收细，减少中心堆叠
    const v = k * sec[i][0] / S;
    for (const e of [n, b]) for (const sgn of [-1, 1]) { V.push(pts[i][0] + sgn * w * e[0], pts[i][1] + sgn * w * e[1], pts[i][2] + sgn * w * e[2]); UV.push(sgn < 0 ? u0 : u1, v); }
  }
  for (let i = 0; i < pts.length - 1; i++) for (const r of [0, 2]) { const a = i * 4 + r, c = (i + 1) * 4 + r; IDX.push(a, a + 1, c + 1, a, c + 1, c); }
  return { V, UV, IDX, variant, nSec: pts.length, tEnd: k * sec[sec.length - 1][0], k };
}

// ---------- 5. 条带贴图（火花 / 余烬按烘焙器同一套规则算「亮度 vs 年龄」） ----------
function randn(i, j) { const u = Math.max(1e-9, hash(i, j)), v = hash(i, j + 101); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const pn = (v, d) => v == null || v === '' || !isFinite(+v) ? d : +v;
const PV = { T0: pn(P0.T0, 2050), cooling: pn(P0.cooling, 0.42), sparkLife: pn(P0.sparkLife, 1), lj: pn(P0.sparkLifeJit, 45) / 100, ef: pn(P0.emberFrac, 0), eLife: pn(P0.emberLife, 3), elj: pn(P0.emberLifeJit, 0.2), edk: pn(P0.emberDecay, 2), efa: Math.min(0.99, pn(P0.emberFadeAt, 0.75)), eB: pn(P0.emberBright, 0.3) };
const VAR = [{ tail: 0.8, head: 1.15, brk: 0.35, seed: 11 }, { tail: 0.95, head: 0.9, brk: 0.5, seed: 23 }, { tail: 1.1, head: 1.0, brk: 0.25, seed: 37 }, { tail: 1.3, head: 0.8, brk: 0.45, seed: 53 }];
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const RAMP = ['ramp0', 'ramp1', 'ramp2', 'ramp3'].map(k => hex(LM[k] || '#000000'));
const rampAt = v => { const x = Math.min(1, Math.max(0, v)) * 3, i = Math.min(2, Math.floor(x)), f = x - i; return [0, 1, 2].map(c => RAMP[i][c] + (RAMP[i + 1][c] - RAMP[i][c]) * f); };
function profile(vr) {
  const N = 6000, g = T => { const x = (T - 900) / 1150; return x > 0 ? x * x * x : 0; }, ages = [];
  for (let y = 0; y < TEX_H; y++) ages.push((H - (y + 0.5) / TEX_H) * S);
  const B = ages.map(a => {
    if (a < 0) return 0; let sum = 0;
    for (let i = 0; i < N; i++) {
      if (hash(i, 1) < PV.ef) { const life = PV.eLife * vr.tail * Math.exp(PV.elj * randn(i, 5)); if (a >= life) continue; const x = a / life;
        sum += g(PV.T0) * PV.eB * Math.exp(-PV.edk * x) * (1 - ss(0, 1, (x - PV.efa) / (1 - PV.efa))); }
      else { const life = PV.sparkLife * vr.tail * Math.exp(PV.lj * randn(i, 9)); if (a >= life) continue;
        const T = PV.T0 * (1 - PV.cooling * a / (PV.sparkLife * vr.tail)); const x = (a / life - 0.7) / 0.3; sum += g(T) * (x <= 0 ? 1 : 1 - ss(0, 1, x)); }
    }
    return sum / N;
  });
  const b0 = Math.max(...B) || 1;
  return ages.map((a, y) => {
    if (a < 0) return 0;
    let v = B[y] / b0;
    v *= 1 - vr.brk * Math.max(0, Math.sin(a * 13.1 + vr.seed) * Math.sin(a * 5.3 + vr.seed * 1.7)) * ss(0.25, 0.9, a);   // 余烬随机错落（年龄 0.25 s 以后）
    v = 1 - Math.exp(-3 * v);                                       // 软曝光：星头饱和、尾巴落在 Ramp 的褐金段
    if (a < 0.05) v = Math.max(v, Math.min(1, 0.8 + 0.2 * vr.head));     // 星头不暗于紧跟着的尾巴；变体只改亮多少
    return v * ss(0, 0.012, a) * (1 - ss(H * S - 0.35, H * S - 0.05, a));
  });
}
if (process.argv.includes('--debug')) VAR.forEach((vr, k) => { const pr = profile(vr); console.log('变体', k, [0, 0.02, 0.05, 0.1, 0.2, 0.4, 0.76, 1, 1.5, 2, 2.5, 3, 3.5].map(a => { const y = Math.min(TEX_H - 1, Math.max(0, Math.floor((H - a / S) * TEX_H))); return a + 's:' + pr[y].toFixed(2); }).join(' ')); });
const img = Buffer.alloc(TEX_W * TEX_H * 4), colW = TEX_W / VARIANTS;
VAR.forEach((vr, k) => {
  const prof = profile(vr);
  for (let y = 0; y < TEX_H; y++) {
    const v = prof[y], c = rampAt(v), aV = Math.min(1, v * 1.25);
    for (let x = 0; x < colW; x++) {
      const u = (x + 0.5) / colW, across = x === 0 || x === colW - 1 ? 0 : Math.exp(-0.5 * ((u - 0.5) / 0.17) ** 2);
      const o = (y * TEX_W + k * colW + x) * 4;
      img[o] = Math.round(c[0] * 255); img[o + 1] = Math.round(c[1] * 255); img[o + 2] = Math.round(c[2] * 255); img[o + 3] = Math.round(aV * across * 255);
    }
  }
});
function png(w, h, rgba) {
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const stripPng = png(TEX_W, TEX_H, img), STRIP = 'T_EFX_FireWorks_MeshWillow_Strip.png';
fs.writeFileSync(path.join(OUT, STRIP), stripPng);
fs.writeFileSync(path.join(PREVIEW, 'strip.js'), `window.MESH_WILLOW_STRIP='data:image/png;base64,${stripPng.toString('base64')}';\n`);

// ---------- 6. 每档：网格 + 旁注 + 预览数据 ----------
const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const summary = [];
for (const N of COUNTS) {
  const pick = order.slice(0, N).map(i => tracks[i]);
  const strands = [], errs = [];
  for (const t of pick) {
    const k = 1 + GROW * (hash(t.id, 41) + hash(t.id, 43) - 1);                       // 三角分布：多数接近 1，少数快 / 慢到 ±GROW
    let q = t.q;
    if (hash(t.id, 47) < TRIM_P) { const cut = q[q.length - 1][0] * (1 - 0.04 - TRIM * hash(t.id, 53)); q = q.filter(p => p[0] <= cut); }
    const sec = segment(q); errs.push(maxErr(q, sec)); strands.push(buildStrand(sec, t.id, k));
  }
  const nv = strands.reduce((s, x) => s + x.V.length / 3, 0), nt = strands.reduce((s, x) => s + x.IDX.length / 3, 0);
  const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(nt * 3);
  let ov = 0, oi = 0; for (const s of strands) { pos.set(s.V, ov * 3); uv.set(s.UV, ov * 2); for (let k = 0; k < s.IDX.length; k++) idx[oi + k] = s.IDX[k] + ov; ov += s.V.length / 3; oi += s.IDX.length; }
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < nv; i++) for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c], pos[i * 3 + c]); mx[c] = Math.max(mx[c], pos[i * 3 + c]); }
  const name = `SM_EFX_FireWorks_MeshWillow_N${N}`;
  // OBJ：模拟坐标（右手、y 朝上），单位 cm（UE 的 FBX / OBJ 导入按 Y-up 转 Z-up；轴向以试件读回为准）
  let obj = `# ${name}  烘焙器 ${VERSION}  配方 ${rec.name}  ${N} 束 × 十字带  顶点 ${nv} 三角 ${nt}\n# V = 星头经过时刻 / ${S}s；UV 流动 DP0 = ${H} - t/${S}\n`;
  const lines = [];
  for (let i = 0; i < nv; i++) lines.push(`v ${(pos[i * 3] * 100).toFixed(2)} ${(pos[i * 3 + 1] * 100).toFixed(2)} ${(pos[i * 3 + 2] * 100).toFixed(2)}`);
  for (let i = 0; i < nv; i++) lines.push(`vt ${uv[i * 2].toFixed(5)} ${(1 - uv[i * 2 + 1]).toFixed(6)}`);   // OBJ 的 v 朝上，UE 读进来再翻成朝下
  for (let i = 0; i < nt; i++) { const a = idx[i * 3] + 1, b = idx[i * 3 + 1] + 1, c = idx[i * 3 + 2] + 1; lines.push(`f ${a}/${a} ${b}/${b} ${c}/${c}`); }
  fs.writeFileSync(path.join(OUT, name + '.obj'), obj + lines.join('\n') + '\n');
  const e0 = errs.map(e => e[0]).sort((a, b) => a - b), e1 = errs.map(e => e[1]).sort((a, b) => a - b), q = (a, f) => a[Math.min(a.length - 1, Math.floor(f * a.length))];
  const side = {
    format: 'df.mesh-willow/1', name, 烘焙器: VERSION, 配方: rec.name, 配方文件: path.relative(root, RECIPE).replace(/\\/g, '/'), 配方存档时间: rec.at, 配方工具版本: rec.tool,
    束数: N, 星编号: pick.map(t => t.id), 顶点: nv, 三角: nt, 每束平均段数: +(strands.reduce((s, x) => s + x.nSec - 1, 0) / N).toFixed(1),
    包围盒_m: { min: mn.map(v => +v.toFixed(1)), max: mx.map(v => +v.toFixed(1)), 说明: '模拟坐标：y 朝上，开花点 = 原点' },
    朝向: '世界固定（Required.ScreenAlignment = PSA_Square，不跟镜头转）；每束两片互相垂直的带（平行移动标架）', 带宽_m: W,
    错落: { 生长_每束快慢: `× (1 ± ${GROW})，三角分布`, 熄灭: `${TRIM_P * 100}% 的束提前 4–${4 + TRIM * 100}%`, 说明: '用户 10-16 06:20 要的错落；--grow 0 --trimP 0 = 和烘焙器模拟逐星一致' },
    UV: { V: `k × 星头经过时刻 / ${S}`, U: `贴图 4 列变体，每束一列`, S, H, 动态参数0: `相对寿命 0 → ${H}，1 → ${+(H - L / S).toFixed(4)}（线性），寿命 ${L} s` },
    误差: { 口径: `段内按时间线性插值的星头位置误差；${PX} px @800 m = ${EPS.toFixed(2)} m，开花 ${EARLY} s 内放宽 ${EARLY_K} 倍`, 开花早段_p95_m: +q(e0, 0.95).toFixed(2), 之后_p95_m: +q(e1, 0.95).toFixed(2), 之后_最大_m: +e1[e1.length - 1].toFixed(2) },
    熄灭时刻_s: (a => ({ p5: +q(a, 0.05).toFixed(2), p50: +q(a, 0.5).toFixed(2), p95: +q(a, 0.95).toFixed(2) }))(strands.map(s => s.tEnd).sort((a, b) => a - b)),
    条带贴图: STRIP, 变体: VAR,
  };
  fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(side, null, 1));
  fs.writeFileSync(path.join(PREVIEW, `N${N}.js`), `(window.MESH_WILLOW=window.MESH_WILLOW||{})['N${N}']={meta:${JSON.stringify({ ...side, 星编号: undefined })},pos:'${b64(pos)}',uv:'${b64(uv)}',idx:'${b64(idx)}'};\n`);
  summary.push({ N, 顶点: nv, 三角: nt, 段: side.每束平均段数, 误差: side.误差, 熄灭: side.熄灭时刻_s, 包围盒: side.包围盒_m });
  console.log(`N${N}: 顶点 ${nv} 三角 ${nt} 平均 ${side.每束平均段数} 段  误差 p95 早 ${side.误差.开花早段_p95_m} / 后 ${side.误差.之后_p95_m} m（最大 ${side.误差.之后_最大_m}）  包围盒 ${JSON.stringify(side.包围盒_m.min)}…${JSON.stringify(side.包围盒_m.max)}`);
}
// 轴向 / 单位试件：X 10 m、Y 20 m、Z 30 m 三根带（模拟坐标；UE 里按 Y-up → Z-up 转换后应为 X 1000 / Z 2000 / Y 3000 cm 之类，以读回为准）
{
  const segs = [[[0, 0, 0], [10, 0, 0], [0, 0, 1]], [[0, 0, 0], [0, 20, 0], [1, 0, 0]], [[0, 0, 0], [0, 0, 30], [0, 1, 0]]];
  let o = '# 轴向试件：x 10 m / y 20 m / z 30 m（单位 cm，模拟坐标 y 朝上）\n', vi = 1;
  for (const [a, b, e] of segs) { const w = 0.5; const P4 = [[a, -1], [a, 1], [b, 1], [b, -1]].map(([p, s]) => p.map((x, c) => (x + s * w * e[c]) * 100));
    for (const p of P4) o += `v ${p[0]} ${p[1]} ${p[2]}\n`; o += `vt 0 0\nvt 1 0\nvt 1 1\nvt 0 1\nf ${vi}/${vi} ${vi + 1}/${vi + 1} ${vi + 2}/${vi + 2} ${vi + 3}/${vi + 3}\n`; vi += 4; }
  fs.writeFileSync(path.join(OUT, 'SM_EFX_FireWorks_MeshWillow_AxisTest.obj'), o);
}
fs.writeFileSync(path.join(OUT, '生成摘要.json'), JSON.stringify({ 烘焙器: VERSION, 配方: rec.name, 时间: new Date().toISOString(), 带宽_m: W, S, H, 寿命: L, 颜色随寿命: LM.stages, 透明度随时间: ALPHA, Ramp: RAMP, 档: summary }, null, 1));
fs.writeFileSync(path.join(PREVIEW, 'meta.js'), `window.MESH_WILLOW_META=${JSON.stringify({ 烘焙器: VERSION, 配方: rec.name, S, H, L, W, stages: LM.stages, alpha: ALPHA, counts: COUNTS })};\n`);
console.log('输出', OUT, '预览数据', PREVIEW);
