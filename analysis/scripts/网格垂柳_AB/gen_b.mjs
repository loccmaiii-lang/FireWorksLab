// 网格垂柳 A/B：从预览页 tool/prototypes/mesh-willow-ab/index.html 里的 mw-core + ab-core 直接导出 B 的本机 UE 测试包（同一份算法）。
// 用法：node gen_b.mjs [--style v3|v2] [--meshes 0|1] [--out <目录>] [--amt 0.8] [--shL 0.55] [--hard 0.3] [--dotPx 1.75] [--twHz 4] [--l3rate 600] [--dist 725] [--fov 60] [--res 1080]
// 第 3 版（默认，10-22）：条带按升空尾缀的火花冷却重画、颗粒按亮度渐稀、ColorPower 2；网格和第 2 版一样，默认不重复写（--meshes 1 才写）。
// 数值和页面默认一致（页面滑杆改过的话，把同样的值传进来）。
// OBJ 按本机 UE 4.24 实测的导入映射：UE = (obj.x, −obj.y, obj.z)（Convert Scene 开）；锁 Z 网格 obj = (y, −x, z) × 100 cm；显式共享法线（MESH_WILLOW_20261016/UE_v2_verify）。
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('/opt/npm-tools/node_modules/sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const STYLE = arg('style', 'v3'), V3 = STYLE === 'v3';
const OUT = arg('out', path.join(root, 'analysis/results/WILLOW_SPARK_AB_20261019', V3 ? 'UE测试包_v3' : 'UE测试包_v2'));
const WRITE_MESH = arg('meshes', V3 ? '0' : '1') === '1';
const html = fs.readFileSync(path.join(root, 'tool/prototypes/mesh-willow-ab/index.html'), 'utf8');
const grab = id => html.split(`<script id="${id}">`)[1].split('</script>')[0];
const ctx = { Math, Float32Array, Float64Array, Uint8Array, Uint32Array, Array, Error, console, Object }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(grab('mw-core'), ctx); vm.runInContext(grab('ab-core'), ctx);
const C = ctx.MWCore, AB = ctx.ABCore;

// ---------- 和页面同一套常数（tool/prototypes/mesh-willow-ab 的 app 段） ----------
const P = { amt: +arg('amt', 0.8), shL: +arg('shL', 0.55), hard: +arg('hard', 0.3), dotPx: +arg('dotPx', 1.75), twHz: +arg('twHz', 4), l3rate: +arg('l3rate', 600), dist: +arg('dist', 725), fov: +arg('fov', 60), res: +arg('res', 1080) };
const PROD = { L: 14.25, scale: 0.5, dp0: [0.9941, -1.2049], cs: [10, 4.188829, 1.278419] };
const R_T = 16.1 / PROD.L, V_TAU = 31.2 * PROD.scale, P2_END_T = 14, L3_WIN = { t0: 1, t1: 11 };
const TR = { hot: 2, tail: 7, ember: 0.22 };
const stars = C.simulate({ N: 400, v0: 345, vt: 34, gm: 1, burn: 7.3, burnJit: 6, spd: 20, seed: 7 }), order = C.fpsOrder(stars);
const S0 = C.buildStrip(TR, false).S;
const k = +(S0 / (11.5 * R_T / (1 - 10 / 1024))).toFixed(4);
const K = V3 ? AB.V3.K : 5, CP = V3 ? AB.V3.cp : 1;
const noise = V3 ? AB.buildNoise(31, AB.V3.noise) : AB.buildNoise(31), mComp = V3 ? 1 : AB.maskMean(noise, P.hard, 0);
const strip = V3
  ? AB.buildStripV3({ S0, k, r: R_T, K, dmap: AB.densityMap(noise, P.hard, K), tr: TR, shoulder: P.shL, feat: { rand: true }, vars: AB.variants(77, P.amt) })
  : AB.buildStrip({ S0, k, r: R_T, K, mComp, gain: 2, tr: TR, shoulder: P.shL, feat: { tear: true, rand: true }, vars: AB.variants(77, P.amt) });
const traits = AB.beamTraits(order.length, 91, P.amt);
const fovR = P.fov * Math.PI / 180, ppm = P.res / (2 * P.dist * Math.tan(fovR / 2)), dotM = P.dotPx / ppm, dTau = dotM / V_TAU;
const nuv = [AB.noiseU(true), S0 * (noise.dotTexel / noise.NW) / dTau, P.twHz * noise.dotTexel / noise.NW, 0];
const dp0Start = +strip.H.toFixed(4), dp0End = +(strip.H - k * (PROD.dp0[0] - PROD.dp0[1])).toFixed(4);   // 星头行 H：泪滴头前面多留 10 行
const r4 = v => +(+v).toFixed(4);
const p2Keys = [[0, 0], [12, 0], [P2_END_T, -0.06], [PROD.L, -0.06]].map(([t, v]) => [r4(t / PROD.L), v]);
const env = AB.headEnvelope(stars, PROD.scale, R_T), Q = AB.L3_SPEC;
const kt = []; for (let t = L3_WIN.t0; t <= L3_WIN.t1 + 1e-9; t += 1) kt.push(t);

// ---------- 网格 ----------
fs.mkdirSync(OUT, { recursive: true });
const lockObj = (x, y, z) => [y, -x, z];
function writeObj(file, mesh, n, note) {
  const vEnd = mesh.vertEnd[n - 1], iEnd = mesh.strandEnd[n - 1], p = [], vt = [];
  for (let i = 0; i < vEnd; i++) { const v = mesh.verts.subarray(i * 5, i * 5 + 5); p.push(lockObj(v[0] * 100, v[1] * 100, v[2] * 100)); vt.push(`vt ${+v[3].toFixed(6)} ${(1 - v[4] / S0).toFixed(6)}`); }
  const nr = p.map(() => [0, 0, 0]);
  for (let i = 0; i < iEnd; i += 3) {
    const a = mesh.idx[i], b = mesh.idx[i + 1], c = mesh.idx[i + 2], u = p[b].map((x, q) => x - p[a][q]), w = p[c].map((x, q) => x - p[a][q]);
    const f = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]; for (const q of [a, b, c]) for (let m = 0; m < 3; m++) nr[q][m] += f[m];
  }
  const L = [`# ${note}`, '# 单位 cm；导入：Import Uniform Scale 1、Convert Scene 开、Force Front X 关、Use Full Precision UVs 开、Normal Import Method = Import Normals', `# 顶点 ${vEnd}，三角 ${iEnd / 3}`, 'o MeshWillowB', 's 1'];
  for (const q of p) L.push(`v ${q[0].toFixed(2)} ${q[1].toFixed(2)} ${q[2].toFixed(2)}`);
  L.push(...vt);
  for (const q of nr) { const l = Math.hypot(...q) || 1; L.push(`vn ${(q[0] / l).toFixed(5)} ${(q[1] / l).toFixed(5)} ${(q[2] / l).toFixed(5)}`); }
  for (let i = 0; i < iEnd; i += 3) { const a = mesh.idx[i] + 1, b = mesh.idx[i + 1] + 1, c = mesh.idx[i + 2] + 1; L.push(`f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}`); }
  fs.writeFileSync(path.join(OUT, file), L.join('\n') + '\n');
  return { 文件: file, 顶点: vEnd, 三角: iEnd / 3 };
}
const meshes = !WRITE_MESH ? [{ 文件: '../UE测试包_v2/SM_MW_B_PC.obj', 顶点: 10988, 三角: 10188, 说明: '和第 2 版同一个网格，不用重导' }, { 文件: '../UE测试包_v2/SM_MW_B_Mobile.obj', 顶点: 1998, 三角: 1738 }] : [
  writeObj('SM_MW_B_PC.obj', AB.buildMeshB(stars, order, 4, 0.78, traits, true), 400, 'B · PC：单片 · 锁 Z · 400 束 · ε 0.78 m · 每束选条带变体（U 跨 1/8）+ 宽细 ±35 %；分段和顶点数同 SM_EFX_FireWork_Hero_PC'),
  writeObj('SM_MW_B_Mobile.obj', AB.buildMeshB(stars, order, 4, 3, traits, true), 130, 'B · 手游：单片 · 锁 Z · 130 束 · ε 3 m；分段和顶点数同 SM_EFX_FireWork_Hero_Mobile'),
];

// ---------- 贴图 ----------
// 条带：RGB 写线性值（sRGB 关，和正式 T_EFX_FireWorks_Hero_FlowFixed 同口径），A 线性；第 3 版 RGBA 再开 1/ColorPower 次方（材质里 Power 回来）
// PNG 第一行 = V 0（最老一端），最后几行是星头
const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const d = Buffer.from(strip.data);
for (let i = 0; i < d.length; i += 4) { for (let c = 0; c < 3; c++) d[i + c] = Math.round(255 * Math.pow(toLin(d[i + c]), 1 / CP)); if (CP !== 1) d[i + 3] = Math.round(255 * Math.pow(strip.data[i + 3] / 255, 1 / CP)); }
await sharp(d, { raw: { width: strip.TW, height: strip.TH, channels: 4 } }).png().toFile(path.join(OUT, 'T_MW_StripB.png'));
// 噪声：线性灰度（sRGB 关），256² 可平铺
await sharp(Buffer.from(noise.data), { raw: { width: noise.NW, height: noise.NW, channels: 4 } }).png().toFile(path.join(OUT, 'T_MW_SparkNoise.png'));

// ---------- 参数 ----------
const params = {
  说明: V3 ? '网格垂柳 B 第 3 版（研究总览 2026-10-22）：星头后按升空尾缀的火花冷却连续过渡、颗粒按亮度渐稀。和预览页默认值一致；页面改了滑杆就用同样的值重跑本脚本。未经 UE 实测。' : '网格垂柳 B 第 2 版（研究总览 2026-10-19）。和预览页默认值一致。未经 UE 实测。',
  样式: STYLE,
  页面设置: P, 推导: { 每米像素: r4(ppm), 颗粒沿轨迹_m: r4(dotM), 遮罩平均: r4(mComp), 寿命_s: PROD.L, 播放快于轨迹: r4(R_T) },
  贴图: {
    T_MW_StripB: { 尺寸: `${strip.TW}x${strip.TH}`, 变体: strip.nv, 设置: 'sRGB 关；Compression VectorDisplacementmap；NoMipmaps；Filter Bilinear；X Wrap / Y Clamp；Texture Group DistantVFX；不勾 Never Stream' },
    T_MW_SparkNoise: { 尺寸: `${noise.NW}x${noise.NW}`, 设置: 'sRGB 关；Compression Default（或 Grayscale）；开 mip（From Texture Group）；X / Y Wrap；Texture Group DistantVFX；不勾 Never Stream' },
  },
  材质实例_复制自_MI_EFX_Fireworks_Hero_FlowFixed_01: { MainTex: 'T_MW_StripB', ColorPower: CP, UVParam: [1, k, 0, 0], ColorIntensity: K, hardness: P.hard, NoiseMap: 'T_MW_SparkNoise', NoiseUVParam: nuv.map(r4), 其余: '不变（DissolveOffset 0、Progress 0、NoiseChannel R、AlphaChannel A、UVIncrementChannel G、OutlineWidth 0）' },
  网格发射器: { Mesh: { PC: 'SM_MW_B_PC', 手游: 'SM_MW_B_Mobile' }, DP0_UVIncrement: [[0, dp0Start], [1, dp0End]], DP1_Param2: p2Keys, ColorScaleOverLife: PROD.cs.map(c => r4(c / K)), 其余: '不变（Lifetime 14–14.5、Initial Size 0.5–0.55、Alpha 曲线、锁 Z、Mesh Rotation）' },
  L3_Sparkle_只PC: {
    做法: '复制 L2_Dots，改名 L3_Sparkle', 材质: 'MI_EFX_Spark_16_NoCameraDepthFade（不变）',
    Required: { EmitterDelay: L3_WIN.t0, EmitterDuration: L3_WIN.t1 - L3_WIN.t0, EmitterLoops: 1 },
    Spawn: { Rate: P.l3rate, Burst: '删掉' }, Lifetime: [Q.life0, Q.life1], InitialSize_cm: [Q.size0 * 100, Q.size1 * 100],
    SphereLocation: { SurfaceOnly: true, Velocity: true, VelocityScale: [Q.vs0, Q.vs1],
      StartRadius_UniformCurve_发射器秒_cm: kt.map(t => [t - L3_WIN.t0, Math.round(env(t).r * Q.r0 * 100), Math.round(env(t).r * Q.r1 * 100)]),
      StartLocation_Z_Curve_发射器秒_cm: kt.map(t => [t - L3_WIN.t0, Math.round(env(t).cy * 100)]) },
    InitialVelocity_cm_s: { min: [0, 0, Q.vz0 * 100], max: [0, 0, Q.vz1 * 100] }, ConstAcceleration_cm_s2: [0, 0, Q.g * 100], Drag: Q.drag,
    ColorOverLife: { 颜色: '照 L2_Dots', Alpha: AB.L3_ALPHA }, 同时活着约: Math.round(P.l3rate * (Q.life0 + Q.life1) / 2),
  },
  网格: meshes,
};
fs.writeFileSync(path.join(OUT, 'params.json'), JSON.stringify(params, null, 1) + '\n');
console.log(JSON.stringify(params, null, 1));
