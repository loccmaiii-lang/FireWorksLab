// 网格垂柳 · 几何自检（第一轮方案 §6 第 2 步「自检脚本」，10-16 对照复核后补）
// 读生成器输出的 OBJ + 旁注 JSON，量：
//  1. 退化三角、UV 范围（V = k·τ / S，U 在 4 列变体内）、嵌套子集（200 ⊂ 300 ⊂ 400）；
//  2. 不穿帮：每一节十字（两片带）在一组视线方向下的投影宽度 ÷ 名义宽度，取「两片里较宽那片」的最小值；
//     同时算「同一位置只用单片世界固定带」会怎样（证明单片会消失、十字不会）；
//  3. 透明像素：1000 m、1080p（标准 2.1 游戏内大小：700 m ≈ 360 px）下，整根带光栅化面积，十字 vs 单片朝相机。
// 用法：node analysis/scripts/网格垂柳_自检.mjs [--dir 网格目录] [--out 结果.json]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DIR = arg('--dir', path.join(root, 'analysis/local/MESH_WILLOW_20261016/网格'));
const OUT = arg('--out', path.join(root, 'analysis/results/MESH_WILLOW_20261016/自检.json'));
const names = fs.readdirSync(DIR).filter(f => /^SM_EFX_FireWorks_MeshWillow_N\d+.*\.obj$/.test(f)).map(f => f.replace('.obj', ''));
function readObj(f) {
  const v = [], vt = [], tri = [];
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (line.startsWith('v ')) { const a = line.slice(2).split(' ').map(Number); v.push([a[0] / 100, a[1] / 100, a[2] / 100]); }
    else if (line.startsWith('vt ')) { const a = line.slice(3).split(' ').map(Number); vt.push([a[0], 1 - a[1]]); }
    else if (line.startsWith('f ')) tri.push(line.slice(2).trim().split(' ').map(x => +x.split('/')[0] - 1));
  }
  return { v, vt, tri };
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = a => Math.hypot(a[0], a[1], a[2]);
const nrm = a => { const l = len(a) || 1; return a.map(x => x / l); };
// 视线：玩家在地面，花在高处 → 仰视 0–60°（含正下方附近 85°），方位 0–360°，每 15°（模拟坐标 y 朝上）
const views = [];
for (let el = 0; el <= 60; el += 10) for (let az = 0; az < 360; az += 15) { const e = el * Math.PI / 180, a = az * Math.PI / 180; views.push({ el, d: [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)] }); }
for (let az = 0; az < 360; az += 45) { const e = 85 * Math.PI / 180, a = az * Math.PI / 180; views.push({ el: 85, d: [Math.cos(e) * Math.cos(a), Math.sin(e), Math.cos(e) * Math.sin(a)] }); }
// 一片带在屏幕上的「粗细」：带宽方向 w 投到垂直于视线、也垂直于线条屏幕方向的那根轴上
function apparent(w, T, d) {
  const tp = sub(T, d.map(x => x * dot(T, d))); if (len(tp) < 0.15) return null;   // 线几乎正对视线：屏幕上很短，不判
  const sn = nrm(crs(d, nrm(tp)));   // 屏幕上垂直于线条的方向
  return Math.abs(dot(w, sn));
}
const res = { 时间: new Date().toISOString(), 口径: { 视线: '仰视 0–60°每 10° × 方位每 15°，另加仰视 85°（近正下方）', 判定: '十字：两片中较宽那片的投影粗细 ÷ 名义宽度；单片（对照）：只用第一片', 线正对视线: '线在屏幕上的长度 < 15 % 的节不判' }, 网格: {} };
let sets = {};
for (const name of names) {
  const side = JSON.parse(fs.readFileSync(path.join(DIR, name + '.json'), 'utf8'));
  const { v, vt, tri } = readObj(path.join(DIR, name + '.obj'));
  sets[name] = side.星编号;
  let degen = 0, area = 0;
  for (const [a, b, c] of tri) { const A = len(crs(sub(v[b], v[a]), sub(v[c], v[a]))) / 2; if (A < 1e-4) degen++; area += A; }
  const U = vt.map(x => x[0]), V = vt.map(x => x[1]);
  // 截面：每 4 个顶点一节（片 A 两点、片 B 两点）；生成器按束顺序写，节在束内连续
  const cross = [], single = [];
  // 切线和生成器一样用前后两节的中心差（标架就是按它算的）；束的首尾节用单边差
  const C = i => v[i].map((x, k) => (x + v[i + 1][k]) / 2), same = (i, j) => j >= 0 && j + 3 < v.length && vt[j][1] >= vt[i][1] - 1e-6 === (j > i) && Math.abs(vt[i][1] - vt[j][1]) < 0.5 && Math.abs(vt[i][0] - vt[j][0]) < 1e-6;
  for (let i = 0; i + 3 < v.length; i += 4) {
    const ip = same(i, i - 4) && vt[i - 4][1] <= vt[i][1] ? i - 4 : i, in_ = same(i, i + 4) && vt[i + 4][1] >= vt[i][1] ? i + 4 : i;
    if (ip === in_) continue;
    const d0 = sub(C(in_), C(ip)); if (len(d0) < 1e-3) continue; const T = nrm(d0);
    const wA = nrm(sub(v[i + 1], v[i])), wB = nrm(sub(v[i + 3], v[i + 2]));
    for (const vw of views) { const a = apparent(wA, T, vw.d); if (a == null) continue; const b = apparent(wB, T, vw.d); cross.push(Math.max(a, b)); single.push(a); }
  }
  const q = (a, f) => { const s = a.slice().sort((x, y) => x - y); return +s[Math.floor(f * (s.length - 1))].toFixed(3); };
  // 透明像素：整根带每帧都光栅化（透明部分也算），1000 m 游戏内大小
  const ppm = 360 / 700, W = side.带宽_m, segLen = area / (2 * W);   // 十字两片，面积 / (2W) = 带长
  res.网格[name] = {
    束数: side.束数, 顶点: side.顶点, 三角: side.三角, 退化三角: degen, 带宽_m: W,
    U范围: [Math.min(...U), Math.max(...U)].map(x => +x.toFixed(4)), V范围: [Math.min(...V), Math.max(...V)].map(x => +x.toFixed(4)),
    投影粗细_十字: { 最小: q(cross, 0), p1: q(cross, 0.01), p50: q(cross, 0.5) }, 投影粗细_单片对照: { 最小: q(single, 0), p1: q(single, 0.01), p5: q(single, 0.05), 低于03占比: +(single.filter(x => x < 0.3).length / single.length).toFixed(3) },
    透明像素_1000m: { 十字_平均投影: Math.round(segLen * W * (4 / Math.PI) * ppm * ppm), 单片朝相机_同宽对照: Math.round(segLen * W * ppm * ppm), 说明: '十字两片斜着看，平均投影 = 4/π × W ≈ 1.27 W；上限估计（正交、无遮挡剔除）' },
    误差: side.误差,
  };
  console.log(name, JSON.stringify(res.网格[name]));
}
const nest = (a, b) => sets[a] && sets[b] ? sets[a].every(x => sets[b].includes(x)) : null;
res.嵌套 = { '200⊂300': nest('SM_EFX_FireWorks_MeshWillow_N200', 'SM_EFX_FireWorks_MeshWillow_N300'), '300⊂400': nest('SM_EFX_FireWorks_MeshWillow_N300', 'SM_EFX_FireWorks_MeshWillow_N400') };
res.通过 = Object.values(res.网格).every(m => m.退化三角 === 0 && m.投影粗细_十字.最小 >= 0.7 && m.U范围[0] >= 0 && m.U范围[1] <= 1) && res.嵌套['200⊂300'] && res.嵌套['300⊂400'];
fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
console.log('嵌套', JSON.stringify(res.嵌套), '通过', res.通过);
