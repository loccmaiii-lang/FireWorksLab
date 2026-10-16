// 从预览页的 mw-core 直接导出 UE 测试包（同一份算法）
import fs from 'fs'; import vm from 'vm'; import path from 'path';
import { createRequire } from 'module'; const sharp = createRequire(import.meta.url)('/opt/npm-tools/node_modules/sharp');
const HERE = path.dirname(new URL(import.meta.url).pathname); const REPO = path.resolve(HERE, '../../..');
const html = fs.readFileSync(path.join(REPO, 'tool/prototypes/mesh-willow-v2/index.html'), 'utf8');
const core = html.split('<script id="mw-core">')[1].split('</script>')[0];
const ctx = { Math, Float32Array, Float64Array, Uint8Array, Uint32Array, Array, Error, console }; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(core, ctx);
const C = ctx.MWCore;
const OUT = process.argv[2] || path.join(REPO, 'analysis/results/MESH_WILLOW_20261016/v2_UE测试包'); fs.mkdirSync(OUT, { recursive: true });
const recipe = { N: 400, v0: 345, vt: 34, gm: 1, burn: 7.3, burnJit: 6, spd: 20, seed: 7 };
const trail = { hot: 2, tail: 7, ember: 0.22 };
const W = 4;
const stars = C.simulate(recipe), order = C.fpsOrder(stars);
const strip = C.buildStrip(trail, false);
const beMax = Math.max(...stars.map(s => s.be)), L = Math.ceil((beMax + trail.tail + 0.3) * 10) / 10;
const S = strip.S, H = strip.H;
// OBJ：UE 的 FBX/OBJ 导入（Convert Scene 开）预计做 UE(X,Y,Z) = OBJ(x,z,y)，并把 V 翻成 1−V → 这里先翻好
function writeObj(file, mesh, nStr, mapAxes, note) {
  const vEnd = mesh.vertEnd[nStr - 1], iEnd = mesh.strandEnd[nStr - 1];
  const lines = [`# ${note}`, `# 单位 cm；导入：Import Uniform Scale 1、Convert Scene 开、Force Front X 关、Use Full Precision UVs 开、Compute Normals`, `# 顶点 ${vEnd}，三角 ${iEnd / 3}`, 'o MeshWillow'];
  const vt = [];
  for (let i = 0; i < vEnd; i++) {
    const v = mesh.verts.subarray(i * 5, i * 5 + 5), p = mapAxes(v[0] * 100, v[1] * 100, v[2] * 100);
    lines.push(`v ${p[0].toFixed(2)} ${p[1].toFixed(2)} ${p[2].toFixed(2)}`);
    vt.push(`vt ${v[3]} ${(1 - v[4] / S).toFixed(6)}`);
  }
  lines.push(...vt);
  for (let i = 0; i < iEnd; i += 3) { const a = mesh.idx[i] + 1, b = mesh.idx[i + 1] + 1, c = mesh.idx[i + 2] + 1; lines.push(`f ${a}/${a} ${b}/${b} ${c}/${c}`); }
  fs.writeFileSync(path.join(OUT, file), lines.join('\n') + '\n');
  // 包围盒（UE 坐标，按预计映射）
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < vEnd; i++) { const v = mesh.verts.subarray(i * 5, i * 5 + 3), p = mapAxes(v[0] * 100, v[1] * 100, v[2] * 100), u = [p[0], p[2], p[1]]; for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], u[k]); mx[k] = Math.max(mx[k], u[k]); } }
  return { file, verts: vEnd, tris: iEnd / 3, ueBoundsCm: { min: mn.map(Math.round), max: mx.map(Math.round) } };
}
const worldAxes = (x, y, z) => [x, y, z];     // 世界固定：sim(x, y上, z) → UE(X=x, Y=z, Z=y)
const lockAxes = (x, y, z) => [y, z, x];      // 锁 Z：UE 本地 X = 上（锁在世界 Z），本地 Z = 正面（转向相机），本地 Y = 侧向
const cross = C.buildMesh(stars, order, 'cross', W, 0.78), single = C.buildMesh(stars, order, 'single', W, 0.78), mobile = C.buildMesh(stars, order, 'single', W, 3);
const meshes = [
  writeObj('SM_MW_Cross_N400.obj', cross, 400, worldAxes, '十字 · 世界固定 · 400 束 · ε 0.78 m'),
  writeObj('SM_MW_Single_N400_LockZ.obj', single, 400, lockAxes, '单片 · 锁 Z 轴朝相机 · 400 束 · ε 0.78 m（本地 X 朝上、本地 Z 是正面）'),
  writeObj('SM_MW_Single_N130_LockZ_Mobile.obj', mobile, 130, lockAxes, '手游试件：单片 · 锁 Z · 130 束 · ε 3 m'),
];
// 轴向试件：导入后应是 X 10 m、Y 20 m、Z（朝上）30 m；Z 杆的 UV：底 V=0、顶 V=1（UE 里）
{
  const L = [`# 轴向试件：UE 里应为 X 10 m、Y 20 m、Z 30 m（朝上）`, 'o AxisTest'], VT = [], F = []; let n = 0;
  const bar = (axis, len) => { // 两片十字，宽 1 m
    const w = 50; const pts = [];
    const P = (t, a, b) => { const p = [0, 0, 0]; p[axis] = t; const o = [(axis + 1) % 3, (axis + 2) % 3]; p[o[0]] += a; p[o[1]] += b; return p; };
    for (const [a, b] of [[[-w, 0], [w, 0]], [[0, -w], [0, w]]]) {
      const q = [P(0, ...a), P(0, ...b), P(len, ...a), P(len, ...b)];
      for (const [k, p] of q.entries()) { L.push(`v ${p[0]} ${p[1]} ${p[2]}`); VT.push(`vt ${k % 2} ${1 - (k >> 1)}`); }
      F.push(`f ${n + 1}/${n + 1} ${n + 2}/${n + 2} ${n + 3}/${n + 3}`, `f ${n + 2}/${n + 2} ${n + 4}/${n + 4} ${n + 3}/${n + 3}`); n += 4;
    }
  };
  bar(0, 1000); bar(2, 2000); bar(1, 3000); // OBJ x→UE X 10 m；OBJ z→UE Y 20 m；OBJ y→UE Z 30 m
  fs.writeFileSync(path.join(OUT, 'SM_MW_AxisTest.obj'), [...L, ...VT, ...F].join('\n') + '\n');
}
// 条带贴图：RGB 写线性值（配合 sRGB 关，和原 T_EFX_ShellTrail_02 同口径），A 线性；PNG 第一行 = V 0（最老一端），最后几行是星头
const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const toSrgb = c => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
{
  const d = Buffer.from(strip.data); for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.round(255 * toLin(d[i + k]));
  await sharp(d, { raw: { width: strip.TW, height: strip.TH, channels: 4 } }).png().toFile(path.join(OUT, 'T_MW_Strip.png'));
  const G = C.buildGrain(11), g = Buffer.from(G.data); for (let i = 0; i < g.length; i += 4) { const v = Math.round(255 * toSrgb(g[i] / 255)); g[i] = g[i + 1] = g[i + 2] = v; }
  await sharp(g, { raw: { width: G.GW, height: G.GH, channels: 4 } }).png().toFile(path.join(OUT, 'T_MW_Grain.png'));
}
const params = {
  配方: { 名称: '截图 AI·HK10 原始（近似模拟核，非烘焙器源码）', ...recipe }, 尾迹: trail, 带宽_m: W,
  寿命_s: L, 条带: { 尺寸: `${strip.TW}x${strip.TH}`, 星头行_H: +H.toFixed(6), 秒每V_S: +S.toFixed(4), 最长年龄_s: strip.Amax },
  DP0_UVIncrement: { 曲线: [[0, +H.toFixed(4)], [1, +(H - L / S).toFixed(4)]], 说明: '相对寿命 0→1 线性；Use Emitter Time 关' },
  噪声: { NoiseUVParam: [C.KU, +(S / C.G_SEC).toFixed(4), 0, 0], 说明: 'U 每束错开（U 取 [s, s+1]），V 一个周期 = 星头经过 1.6 s' },
  颜色倍数_ColorScaleOverLife: [9, 9, 9], Alpha: [[0, 1], [+((L - 0.3) / L).toFixed(4), 1], [1, 0]],
  网格: meshes,
};
fs.writeFileSync(path.join(OUT, 'params.json'), JSON.stringify(params, null, 1));
console.log(JSON.stringify(params, null, 1));
