// 金曜菊-B 网格：轨迹（tracks.mjs 从烘焙器核出的）→ 预览页 + UE 测试包（高配 / 低配 / 手游 × 两层）。
// 用法：node gen.mjs [--tracks <tracks_baker.json>] [--out <UE 包目录>] [--page <index.html>]
// 预览页核心 MWK 住在 tool/prototypes/mesh-kiku-b-v1/template.html 里的 <script id="mw-core">，这里用 vm 载入同一段，保证预览和资产同一份算法。
// OBJ 坐标按本机 UE 4.24 实测的导入映射写：UE = (obj.x, −obj.y, obj.z)（Convert Scene 开），并写显式共享法线（不写会被拆成三角角点，顶点数 ≈ 三角数 × 3）。
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('/opt/npm-tools/node_modules/sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const RES = path.join(root, 'analysis/results/MESH_WILLOW_20261016/金曜菊B');
const TRACKS = arg('--tracks', path.join(RES, 'tracks_baker.json'));
const OUT = arg('--out', path.join(RES, 'UE测试包'));
const PAGE = arg('--page', path.join(root, 'tool/prototypes/mesh-kiku-b-v1/index.html'));
const TPL = path.join(root, 'tool/prototypes/mesh-kiku-b-v1/template.html');
const EPS0 = 0.15, BAKER_HALF = 217.56325568487944;       // 内嵌轨迹的压缩精度（m）；烘焙器同秒对照的取景半高（m，见 看法.md）
const W = +arg('--width', '2');                            // 带宽（m）：按烘焙器同秒图的覆盖率标定（金锦层 2.0 s：2 m 与烘焙器 17.7 / 11.8 / 9.7 % 对 19.7 / 13.8 / 9.3 %）
const tpl = fs.readFileSync(TPL, 'utf8');
const core = tpl.split('<script id="mw-core">')[1].split('</script>')[0];
const ctx = { Math, Float32Array, Float64Array, Uint8Array, Uint32Array, Array, Error, console }; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(core, ctx);
const C = ctx.MWK;
const T = JSON.parse(fs.readFileSync(TRACKS, 'utf8'));

// ---------- 1. 压缩轨迹（每颗星按 EPS0 分段，只留关键点；两端点保留；不放宽开花初期）----------
function decimate(s, dt) {
  const n = s.p.length / 3, times = new Float64Array(n); for (let k = 0; k < n; k++) times[k] = s.t0 + k * dt;
  times[n - 1] = Math.max(times[n - 2] + 1e-3, s.be);
  const err = (i, j, k) => { const u = (times[k] - times[i]) / (times[j] - times[i]); let q = 0; for (let a = 0; a < 3; a++) { const e = s.p[i * 3 + a] + (s.p[j * 3 + a] - s.p[i * 3 + a]) * u - s.p[k * 3 + a]; q += e * e; } return Math.sqrt(q); };
  const fits = (i, j) => { for (let k = i + 1; k < j; k++) if (err(i, j, k) > EPS0) return false; return true; };
  const keep = [0]; let i = 0; while (i < n - 1) { let j = i + 1; while (j + 1 < n && fits(i, j + 1)) j++; keep.push(j); i = j; }
  return { id: s.id, t: keep.map(k => +times[k].toFixed(4)), p: keep.flatMap(k => [+s.p[k * 3].toFixed(2), +s.p[k * 3 + 1].toFixed(2), +s.p[k * 3 + 2].toFixed(2)]), be: +s.be.toFixed(3) };
}
const SHORT = ['橙引线层', '金锦层'];
const data = { meta: { recipe: T.recipe, version: T.烘焙器, recipeSaved: T.配方存档, eps0: EPS0, bakerZoom: +(Math.atan(1.05) / Math.atan(BAKER_HALF / 1000)).toFixed(3) }, layers: [] };
for (const [i, L] of T.layers.entries()) data.layers.push({ short: SHORT[i], name: L.name, P: L.P, M: L.M, stars: L.stars.map(s => decimate(s, L.dt)) });
const nPts = data.layers.map(L => L.stars.reduce((a, s) => a + s.t.length, 0));
console.log('压缩后关键点：', data.layers.map((L, i) => `${L.short} ${L.stars.length} 星 ${nPts[i]} 点（原 ${T.layers[i].stars.reduce((a, s) => a + s.p.length / 3, 0)}）`).join('；'));

// ---------- 2. 预览页 ----------
fs.mkdirSync(path.dirname(PAGE), { recursive: true });
fs.writeFileSync(PAGE, tpl.replace('__KB_DATA__', JSON.stringify(data)).replace('__VERSION__', T.烘焙器));
console.log('预览页', path.relative(root, PAGE), (fs.statSync(PAGE).size / 1e3).toFixed(0) + ' KB');

// ---------- 3. 三档 × 两层 的网格 ----------
const stars = data.layers.map(L => C.fromData(L));
const ord0 = C.fpsOrder(stars[0]), ids = ord0.map(i => stars[0][i].id);
const orders = stars.map(S => { const by = new Map(S.map((s, i) => [s.id, i])); return ids.filter(id => by.has(id)).map(id => by.get(id)); });
const TIERS = [
  { key: 'High', name: '高配', mode: 'cross', eps: 0.78, axes: 'world', n: () => orders[0].length },
  { key: 'Low', name: '低配', mode: 'lock', eps: 1.5, axes: 'lock', n: () => 150 },
  { key: 'Mobile', name: '手游', mode: 'lock', eps: 3, axes: 'lock', budget: 2000 },
];
// 模拟坐标（右手、y 朝上、+z 朝观众）→ OBJ（cm）。UE 导入（Convert Scene 开）实测：UE = (obj.x, −obj.y, obj.z)
// 世界固定：想要 UE = (x, z, y)（Z 朝上）→ obj = (x, −z, y)；锁 Z：想要 UE = (y, x, z)（本地 X 朝上、本地 Z 正面）→ obj = (y, −x, z)
const AX = { world: (x, y, z) => [x, -z, y], lock: (x, y, z) => [y, -x, z] };
const UEAX = { world: (x, y, z) => [x, z, y], lock: (x, y, z) => [y, x, z] };
fs.mkdirSync(OUT, { recursive: true });
function writeObj(file, mesh, n, ax, note) {
  const vEnd = mesh.vertEnd[n - 1], iEnd = mesh.strandEnd[n - 1], S = mesh.S;
  const p = [], vt = [];
  for (let i = 0; i < vEnd; i++) { const v = mesh.verts.subarray(i * 5, i * 5 + 5); p.push(AX[ax](v[0] * 100, v[1] * 100, v[2] * 100)); vt.push(`vt ${v[3]} ${(1 - v[4] / S).toFixed(6)}`); }
  const nr = p.map(() => [0, 0, 0]);
  for (let i = 0; i < iEnd; i += 3) {
    const a = mesh.idx[i], b = mesh.idx[i + 1], c = mesh.idx[i + 2], u = p[b].map((x, k) => x - p[a][k]), w = p[c].map((x, k) => x - p[a][k]);
    const f = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; for (const q of [a, b, c]) for (let k = 0; k < 3; k++) nr[q][k] += f[k];
  }
  const lines = [`# ${note}`, `# 单位 cm；导入：Import Uniform Scale 1、Convert Scene 开、Force Front X 关、Use Full Precision UVs 开、Normal Import Method = Import Normals`, `# 顶点 ${vEnd}，三角 ${iEnd / 3}`, 'o KKB', 's 1'];
  for (const q of p) lines.push(`v ${q[0].toFixed(2)} ${q[1].toFixed(2)} ${q[2].toFixed(2)}`);
  lines.push(...vt);
  for (const q of nr) { const l = Math.hypot(...q) || 1; lines.push(`vn ${(q[0] / l).toFixed(5)} ${(q[1] / l).toFixed(5)} ${(q[2] / l).toFixed(5)}`); }
  for (let i = 0; i < iEnd; i += 3) { const a = mesh.idx[i] + 1, b = mesh.idx[i + 1] + 1, c = mesh.idx[i + 2] + 1; lines.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`); }
  fs.writeFileSync(path.join(OUT, file), lines.join('\n') + '\n');
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const q of p) { const u = [q[0], -q[1], q[2]]; for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], u[k]); mx[k] = Math.max(mx[k], u[k]); } }
  return { 文件: file, 顶点: vEnd, 三角: iEnd / 3, UE包围盒_cm: { min: mn.map(Math.round), max: mx.map(Math.round) } };
}
const strips = data.layers.map(L => C.buildStrip(L.P, L.M));
const lives = stars.map((S, i) => Math.ceil((Math.max(...S.map(s => s.be)) + strips[i].Amax + 0.3) * 10) / 10);
const tiers = [];
for (const t of TIERS) {
  const meshes = stars.map((S, i) => { const m = C.buildMesh(S, orders[i], t.mode, W, t.eps); m.S = strips[i].S; return m; });
  const n = t.budget ? C.fitBudget(meshes, t.budget) : Math.min(t.n(), orders[0].length);
  const files = meshes.map((m, i) => writeObj(`SM_KKB_Lyr${i}_${t.key}_${t.mode === 'cross' ? 'Cross' : 'LockZ'}.obj`, m, n, t.axes, `金曜菊-B ${SHORT[i]} · ${t.name} · ${t.mode === 'cross' ? '十字 · 世界固定' : '单片 · 锁 Z 轴朝相机'} · ${n} 束 · ε ${t.eps} m`));
  const errs = meshes.map(m => { const a = Float64Array.from(m.lateErr).sort(); return a.length ? +a[Math.floor(a.length * 0.95)].toFixed(2) : 0; });
  tiers.push({ 档: t.name, 朝向: t.mode === 'cross' ? '十字 · 世界固定' : '单片 · 锁 Z 轴', 每层束数: n, 精度ε_m: t.eps, 位置误差p95_m: errs, 网格: files, 合计顶点: files.reduce((a, f) => a + f.顶点, 0), 合计三角: files.reduce((a, f) => a + f.三角, 0), 预算: t.budget || null });
}
console.log(tiers.map(t => `${t.档}：${t.每层束数} 束/层 · ${t.网格.map(f => f.顶点).join(' + ')} = ${t.合计顶点} 顶点 · ${t.合计三角} 三角（${t.朝向}）`).join('\n'));

// 轴向试件（映射按实测写）：导入后应是 X 10 m、Y 20 m、Z（朝上）30 m；三根杆都在 +X / +Y / +Z 一侧
{
  const L = ['# 轴向试件：UE 里应为 X 10 m、Y 20 m、Z 30 m（朝上），杆都向 +X / +Y / +Z 方向长', 'o AxisTest'], VT = [], F = []; let n = 0;
  const bar = (axis, len, sgn) => {
    const w = 50, P = (t, a, b) => { const q = [0, 0, 0]; q[axis] = t * sgn; const o = [(axis + 1) % 3, (axis + 2) % 3]; q[o[0]] += a; q[o[1]] += b; return q; };
    for (const [a, b] of [[[-w, 0], [w, 0]], [[0, -w], [0, w]]]) {
      const q = [P(0, ...a), P(0, ...b), P(len, ...a), P(len, ...b)];
      for (const [k, p] of q.entries()) { L.push(`v ${p[0]} ${p[1]} ${p[2]}`); VT.push(`vt ${k % 2} ${1 - (k >> 1)}`); }
      F.push(`f ${n + 1}/${n + 1} ${n + 2}/${n + 2} ${n + 3}/${n + 3}`, `f ${n + 2}/${n + 2} ${n + 4}/${n + 4} ${n + 3}/${n + 3}`); n += 4;
    }
  };
  bar(0, 1000, 1); bar(1, 2000, -1); bar(2, 3000, 1);   // obj +x → UE +X 10 m；obj −y → UE +Y 20 m；obj +z → UE +Z 30 m
  fs.writeFileSync(path.join(OUT, 'SM_KKB_AxisTest.obj'), [...L, ...VT, ...F].join('\n') + '\n');
}

// ---------- 4. 贴图：条带 RGB 写线性值（sRGB 关）；颗粒 sRGB 开 ----------
const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const toSrgb = c => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
for (const [i, s] of strips.entries()) {
  const d = Buffer.from(s.data); for (let k = 0; k < d.length; k += 4) for (let c = 0; c < 3; c++) d[k + c] = Math.round(255 * toLin(d[k + c]));
  await sharp(d, { raw: { width: s.TW, height: s.TH, channels: 4 } }).png().toFile(path.join(OUT, `T_KKB_Strip_Lyr${i}.png`));
}
{ const G = C.buildGrain(11), g = Buffer.from(G.data); for (let i = 0; i < g.length; i += 4) { const v = Math.round(255 * toSrgb(g[i] / 255)); g[i] = g[i + 1] = g[i + 2] = v; }
  await sharp(g, { raw: { width: G.GW, height: G.GH, channels: 4 } }).png().toFile(path.join(OUT, 'T_KKB_Grain.png')); }

// ---------- 5. params.json ----------
const params = {
  来源: { 配方: T.recipe, 烘焙器: T.烘焙器, 配方存档: T.配方存档, 说明: '星头轨迹由烘焙器模拟核（tool/src/js/20_sim.js）逐星记录点火后的位置；尾巴亮度曲线按烘焙器火花公式算（整条火花云平均）。不含点灭星层（闪点，没有尾巴）' },
  带宽_m: W, 内嵌轨迹压缩精度_m: EPS0,
  层: data.layers.map((L, i) => {
    const s = strips[i], life = lives[i];
    return { 名: L.short, 条带贴图: `T_KKB_Strip_Lyr${i}.png`, 尺寸: `${s.TW}x${s.TH}`, 星头行_H: +s.H.toFixed(6), 秒每V_S: +s.S.toFixed(4), 最长年龄_s: +s.Amax.toFixed(3), 粒子寿命_s: life,
      DP0_UVIncrement: { 曲线: [[0, +s.H.toFixed(4)], [1, +(s.H - life / s.S).toFixed(4)]], 说明: '相对寿命 0→1 线性；Use Emitter Time 关' },
      NoiseUVParam: [C.KU, +(s.S / C.G_SEC).toFixed(4), 0, 0], Alpha: [[0, 1], [+((life - 0.3) / life).toFixed(4), 1], [1, 0]],
      Ramp: ['ramp0', 'ramp1', 'ramp2', 'ramp3'].map(k => L.M[k]), 烘焙器参数摘要: Object.fromEntries(['sparkLife', 'sparkLifeEnd', 'sparkLifeJit', 'T0', 'cooling', 'sparkRate', 'sparkRateEnd', 'sparkStop', 'sparkRamp', 'ignDelay', 'burn', 'twinkle', 'exposure'].map(k => [k, L.P[k]])) };
  }),
  颗粒: { Hardness: C.UE_GRAIN.hardness, Param2: C.UE_GRAIN.param2, Progress: 0, DissolveOffset: 0, 公式: 'A = Noise.r + DissolveOffset + 2·(Param2 + Progress)；mask = smoothstep(h, 1−h, A)（本机读回母材质）' },
  档位: tiers,
};
fs.writeFileSync(path.join(OUT, 'params.json'), JSON.stringify(params, null, 1));
console.log('UE 包', path.relative(root, OUT));
