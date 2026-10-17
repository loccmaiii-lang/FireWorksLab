// 纯数据检查（不开浏览器）：4.9.113 资源规范统一第三步——出包前给 cascade*.json 补四项（tool/src/js/62_resource_rules.js）
//   ① system.fixed_bounds（固定包围盒）② 方形大序列 FacingCameraPosition ③ required.uv_flip ④ 序列材质 emissive_dissolve 0.98
// 用法：node analysis/scripts/resource_rules_check.mjs [--corpus 素材包目录]   退出码 0 = 全过
//   单元用例 + 出包（63_gate.js packFinalize）接线 + 仓库里的真实包 + 本机素材包目录（analysis/local/输出/素材包，没有就跳过）
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const ctx = vm.createContext({ console, crypto: globalThis.crypto, TextEncoder, TextDecoder, Blob, structuredClone });
const load = n => vm.runInContext(fs.readFileSync(path.join(root, 'tool/src/js', n + '.js'), 'utf8'), ctx, { filename: n });
vm.runInContext("const utf8 = s => new TextEncoder().encode(s); const FW_TEX_PREFIX = 'T_EFX_FireWorks_';", ctx);
load('62_resource_rules'); load('63_gate');
const R = (j, o) => JSON.parse(JSON.stringify(vm.runInContext("fwlApplyResourceRules", ctx)(structuredClone(j), o)));     // 换回本 realm 的对象（deepStrictEqual 认原型）
let pass = 0; const fails = [];
const t = (name, fn) => { try { fn(); pass++; console.log('✅', name); } catch (e) { fails.push(name); console.log('❌', name, '—', e.message.split('\n')[0]); } };
const SYM = [{ P: { type: 'chrysanthemum', pattern: 'sphere', tilt: 0, wind: 0 }, L: null }];

// ---- 代表配置 ----
const seqMat = { role: 'flipbook_rgba', textures: { main: 'seq', ramp: 'ramp' }, scalars: { rows: 4, cols: 4 } };
const tex = { seq: { file: 'T_EFX_FireWorks_X_4x4_01_HD.png', class: 'flipbook', cols: 4, rows: 4, channels: 4, frames: 64 }, ramp: { file: 'T_EFX_FireWorks_X_R.png', class: 'ramp' } };
const plane = (size = [20000, 20000, 1], extra = {}) => ({ name: 'Main', material: 'main', gpu: false,
  required: { screen_alignment: 'Rectangle', duration_s: 3, loops: 1, delay_s: 0, max_draw_count: 1, pivot_offset: [-0.5, -0.5], ...extra.rq },
  spawn: { rate: { const: 0 }, bursts: [[0, 1]] },
  modules: [{ m: 'Lifetime', Lifetime: { const: 3 } }, { m: 'InitialSize', StartSize: { const: size } }, { m: 'InitialLocation', StartLocation: { const: [0, 0, -1000] } },
    ...(extra.mods || []), { m: 'DynamicParameter', params: { frame: { curve: [[0, 0], [1, 63.99]] } } }, { m: 'ColorOverLife', ColorOverLife: { const: [1, 1, 1] }, AlphaOverLife: { const: 1 } }] });
const flash = { name: 'Flash', material: 'flash', gpu: false, required: { screen_alignment: 'Square', duration_s: 0.2, loops: 1, delay_s: 0 }, spawn: { rate: { const: 0 }, bursts: [[0, 1]] },
  modules: [{ m: 'Lifetime', Lifetime: { const: 0.2 } }, { m: 'InitialSize', StartSize: { const: [3000, 3000, 1] } }, { m: 'InitialLocation', StartLocation: { const: [0, 0, -1000] } }] };
const cfg = (emitters, mats = { main: seqMat }) => ({ format: 'fwl.cascade/1', name: 'X', platform: 'pc', textures: tex, materials: mats, system: { preview_distance_cm: 30000 }, emitters });

t('方形大序列 → FacingCameraPosition，单独一张 + 闪光 → 两个都 RandomFlipUOnly；序列材质 0.98、圆点不写', () => {
  const j = R(cfg([plane(), flash], { main: seqMat, flash: { role: 'soft_dot' } }), { recipes: SYM });
  assert.equal(j.emitters[0].required.screen_alignment, 'FacingCameraPosition');
  assert.equal(j.emitters[1].required.screen_alignment, 'Square');
  assert.deepEqual(j.emitters.map(e => e.required.uv_flip), ['RandomFlipUOnly', 'RandomFlipUOnly']);
  assert.equal(j.materials.main.emissive_dissolve, 0.98); assert.equal(j.materials.flash.emissive_dissolve, undefined);
  assert.equal(j.materials.main.scalars.rows, 4, 'scalars 不动（旧导入器不认的数值参数会拒收）');
});
t('包围盒：面片半对角线 + 出生位置 + 10 % + 10 cm 向外取整', () => {
  const j = R(cfg([plane()]), { recipes: SYM }), b = j.system.fixed_bounds, r = Math.hypot(10000, 10000);     // 中心在 z = −1000
  assert.deepEqual(b.min.slice(0, 2), [-Math.ceil(r * 1.1 / 10) * 10, -Math.ceil(r * 1.1 / 10) * 10]);
  assert.equal(b.max[2], Math.ceil((r - 1000) * 1.1 / 10) * 10); assert.equal(b.min[2], -Math.ceil((r + 1000) * 1.1 / 10) * 10);
  assert.equal(j.system.preview_distance_cm, 30000, '原 system 字段保留');
});
t('Pivot 偏移、Size By Life 放大都算进面片伸出范围', () => {
  const j = R(cfg([plane([10000, 10000, 1], { rq: { pivot_offset: [-0.5, -1] }, mods: [{ m: 'SizeByLife', LifeMultiplier: { curve: [[0, [0.2, 0.2, 1]], [1, [2, 2, 1]]] } }] })]), { recipes: SYM });
  const w = 20000, rr = Math.hypot(0.5 * w, 1 * w);     // 角点：横 0.5w，竖 |−0.5 − (−1)| + 0.5 = 1h
  assert.ok(j.system.fixed_bounds.max[0] >= rr * 1.1 - 10 && j.system.fixed_bounds.max[0] <= rr * 1.1 + 10, j.system.fixed_bounds.max[0] + ' vs ' + rr * 1.1);
  assert.equal(j.emitters[0].required.screen_alignment, 'FacingCameraPosition', 'X、Y 同比放大仍是方形');
});
t('横竖不同 / 只放大一个轴 / 锁 Z 轴 / GPU / 单束 → 保持原朝向', () => {
  const a = R(cfg([plane([20000, 30000, 1])]), { recipes: SYM }).emitters[0].required.screen_alignment;
  const b = R(cfg([plane(undefined, { mods: [{ m: 'SizeByLife', LifeMultiplier: { curve: [[0, [1, 0.5, 1]], [1, [1, 1, 1]]] }, MultiplyX: false, MultiplyY: true }] })]), { recipes: SYM }).emitters[0].required.screen_alignment;
  const c = R(cfg([plane(undefined, { mods: [{ m: 'OrientationAxisLock', flags: 'EPAL_ROTATE_Z' }] })]), { recipes: SYM }).emitters[0].required.screen_alignment;
  const g = cfg([plane()]); g.emitters[0].gpu = true; const d = R(g, { recipes: SYM }).emitters[0].required.screen_alignment;
  const u = cfg([plane()], { main: { role: 'beam_flipbook', textures: { main: 'seq', ramp: 'ramp' } } }); const e = R(u, { recipes: SYM });
  assert.deepEqual([a, b, c, d, e.emitters[0].required.screen_alignment], ['Rectangle', 'Rectangle', 'Rectangle', 'Rectangle', 'Rectangle']);
  assert.equal(e.materials.main.emissive_dissolve, 0.98, '单束材质也查 Ramp');
});
t('锁 Z 轴的长条（尾缀远段）：Z 按面片高度和 Pivot，水平只按宽度', () => {
  const j = R(cfg([plane([2000, 40000, 1], { rq: { pivot_offset: [-0.5, -1], local_space: true }, mods: [{ m: 'OrientationAxisLock', flags: 'EPAL_ROTATE_Z' }] })]), { recipes: SYM });
  const b = j.system.fixed_bounds;     // 中心 z = −1000 + (−0.5 + 1)·40000 = 19000，高 40000 → z ∈ [−1000, 39000]；水平 ±1000
  assert.equal(b.max[2], Math.ceil(39000 * 1.1 / 10) * 10); assert.equal(b.min[2], -1100); assert.equal(b.max[0], 1100);
});
t('配方左右不对称（倾斜 / 风 / 文字 / 镜像层）或不知道配方 → 全部 None 并写原因', () => {
  for (const [rec, why] of [[[{ P: { tilt: 25 } }], '倾斜'], [[{ P: { wind: 2 } }], '风'], [[{ P: { pattern: 'text' } }], '文字'], [[{ P: {}, L: { mirror: true } }], '镜像'], [null, '不知道']]) {
    const j = R(cfg([plane(), flash], { main: seqMat, flash: { role: 'soft_dot' } }), { recipes: rec });
    assert.deepEqual(j.emitters.map(e => e.required.uv_flip), ['None', 'None'], why); assert.match(j.resource_rules.uv_flip_none_reason, new RegExp(why));
  }
});
t('同一系统两张序列（星头 / 尾巴拆层、尾缀接力）→ 都 None；序列 + 对位光点 → 序列 None、圆点 U Only', () => {
  const tail = { ...plane(), name: 'Tail', material: 'main' };
  assert.deepEqual(R(cfg([plane(), tail]), { recipes: SYM }).emitters.map(e => e.required.uv_flip), ['None', 'None']);
  const dots = { name: 'L2_Dots', material: 'dot', gpu: true, required: { screen_alignment: 'Square', duration_s: 3, loops: 1, delay_s: 0 }, spawn: { rate: { const: 0 }, bursts: [[0, 80]] },
    modules: [{ m: 'Lifetime', Lifetime: { const: 3 } }, { m: 'InitialSize', StartSize: { const: [200, 200, 1] } }, { m: 'SphereLocation', StartRadius: { const: 100 }, SurfaceOnly: true, Velocity: true, VelocityScale: { const: 30 } }] };
  assert.deepEqual(R(cfg([plane(), dots], { main: seqMat, dot: { role: 'soft_dot' } }), { recipes: SYM }).emitters.map(e => e.required.uv_flip), ['None', 'RandomFlipUOnly']);
});
const mover = (mods, extra = {}) => ({ name: 'P', material: 'dot', gpu: false, required: { screen_alignment: 'Square', duration_s: 1, loops: 1, delay_s: 0 }, spawn: { rate: { const: 0 }, bursts: [[0, 10]] },
  modules: [{ m: 'InitialSize', StartSize: { const: [20, 20, 1] } }, ...mods], ...extra });
t('重力按最小组件缩放 0.65 放大（重力不跟 EffectScale 缩）', () => {
  const j = R(cfg([mover([{ m: 'Lifetime', Lifetime: { const: 2 } }, { m: 'ConstAcceleration', Acceleration: [0, 0, -980] }])], { dot: { role: 'soft_dot' } }), { recipes: SYM });
  const fall = 0.5 * 980 / 0.65 * 4 + Math.hypot(10, 10);
  assert.ok(j.system.fixed_bounds.min[2] <= -fall * 1.1 + 1 && j.system.fixed_bounds.min[2] >= -fall * 1.1 - 20, String(j.system.fixed_bounds.min[2]));
});
t('线性阻力：位移 = v0 (1 − e^(−kT)) / k，不按无阻力放大', () => {
  const j = R(cfg([mover([{ m: 'Lifetime', Lifetime: { const: 5 } }, { m: 'InitialVelocity', StartVelocity: { const: [1000, 0, 0] } }, { m: 'Drag', DragCoefficientRaw: { const: 2 } }])], { dot: { role: 'soft_dot' } }), { recipes: SYM });
  const x = 1000 * (1 - Math.exp(-10)) / 2 + Math.hypot(10, 10);
  assert.ok(Math.abs(j.system.fixed_bounds.max[0] - Math.ceil(x * 1.1 / 10) * 10) <= 10, String(j.system.fixed_bounds.max[0]));
});
t('Velocity/Life（Absolute）按曲线积分', () => {
  const j = R(cfg([mover([{ m: 'Lifetime', Lifetime: { const: 2 } }, { m: 'VelocityOverLife', VelOverLife: { curve: [[0, [0, 0, 3000]], [1, [0, 0, 0]]] }, Absolute: true }])], { dot: { role: 'soft_dot' } }), { recipes: SYM });
  const z = 3000 * 2 / 2 + Math.hypot(10, 10);     // 线性减到 0：平均 1500 cm/s × 2 s
  assert.ok(Math.abs(j.system.fixed_bounds.max[2] - Math.ceil(z * 1.1 / 10) * 10) <= 20, String(j.system.fixed_bounds.max[2]));
});
t('事件链：子粒子从母粒子范围出发 + 继承速度；有事件的发射器 UV None', () => {
  const gen = mover([{ m: 'Lifetime', Lifetime: { const: 1 } }, { m: 'InitialVelocity', StartVelocity: { const: [0, 0, 1000] } }, { m: 'EventGenerator', Events: [{ Type: 'EPET_Death', CustomName: 'BloomA', Frequency: 1, ParticleFrequency: 1 }] }], { name: 'Gen' });
  const rec = mover([{ m: 'Lifetime', Lifetime: { const: 1 } }, { m: 'SphereLocation', StartRadius: { const: 500 } }, { m: 'EventReceiverSpawn', EventGeneratorType: 'EPET_Death', EventName: 'BloomA', SpawnCount: { const: 1 }, bUseParticleTime: false, bUsePSysLocation: false, bInheritVelocity: true, InheritVelocityScale: { const: [0.5, 0.5, 0.5] } }], { name: 'Rec', spawn: { rate: { const: 0 }, bursts: [] } });
  const j = R(cfg([gen, rec], { dot: { role: 'soft_dot' } }), { recipes: SYM });
  const z = 1000 + 500 + 500 * 1 + Math.hypot(10, 10);     // 母粒子到 10 m，子粒子半径 5 m，继承 0.5 × 1000 cm/s × 1 s
  assert.ok(j.system.fixed_bounds.max[2] >= z * 1.1 - 10, String(j.system.fixed_bounds.max[2]));
  assert.deepEqual(j.emitters.map(e => e.required.uv_flip), ['None', 'None']);
});
t('不认识会动位置的模块 → 不写盒、写原因（导入器照旧 ±1000 m）', () => {
  const j = R(cfg([plane(undefined, { mods: [{ m: 'Orbit', OffsetAmount: { const: [100, 0, 0] } }] })]), { recipes: SYM });
  assert.equal(j.system.fixed_bounds, undefined); assert.match(j.resource_rules.fixed_bounds, /Orbit/);
});
t('关掉的发射器不算、不写', () => {
  const off = { ...plane([90000, 90000, 1]), name: 'Off', enabled: false };
  const j = R(cfg([plane(), off]), { recipes: SYM });
  assert.ok(j.system.fixed_bounds.max[0] < 20000); assert.equal(j.emitters[1].required.uv_flip, undefined); assert.equal(j.emitters[0].required.uv_flip, 'RandomFlipUOnly');
});

// 4.9.115 用户 10-18 永远的禁忌：导出拦截见到 NeverStream 就拦
t('导出拦截：贴图要求 NeverStream → 拦下；正常配置不报', () => {
  const gate = vm.runInContext('packGateConfig', ctx), ok = cfg([plane()]), bad = structuredClone(ok); bad.textures.seq.never_stream = true;
  assert.equal(gate('cascade.json', ok, '', {}).filter(x => /NeverStream/.test(x)).length, 0);
  assert.ok(gate('cascade.json', bad, '', {}).some(x => /NeverStream/.test(x)));
});

// ---- 出包接线：packFinalize 之后每份配置都有四项（旧导入器不认的地方没动：scalars、format）----
const finalize = async (files, o) => vm.runInContext('packFinalize', ctx)(files, { noThrow: true, known: null, sourceKey: '', ...o });
const dec = new TextDecoder(), enc = new TextEncoder();
const fakePNG = (w, h) => { const u = new Uint8Array(33); u.set([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]); const dv = new DataView(u.buffer); dv.setUint32(16, w); dv.setUint32(20, h); return u; };
await (async () => {
  const name = 'packFinalize 出包前套规则（PC + 手机；recipes 从导出任务传入）';
  try {
    const pc = cfg([plane(), flash], { main: seqMat, flash: { role: 'soft_dot' } }), mob = { ...structuredClone(pc), name: 'X_M', platform: 'mobile', tier: 'M' };
    mob.emitters.forEach(e => { e.max_alive = 1; }); mob.textures.seq.file = 'T_EFX_FireWorks_X_4x4_01.png';
    const files = [['cascade.json', enc.encode(JSON.stringify(pc))], ['cascade_mobile.json', enc.encode(JSON.stringify(mob))],
      ['T_EFX_FireWorks_X_4x4_01_HD.png', fakePNG(2048, 2048)], ['T_EFX_FireWorks_X_4x4_01.png', fakePNG(1024, 1024)], ['T_EFX_FireWorks_X_R.png', fakePNG(256, 8)], ['X_Cascade参数.txt', enc.encode('【Main】Screen Alignment = Rectangle')]];
    const out = await finalize(files, { recipes: SYM });
    for (const f of ['cascade.json', 'cascade_mobile.json']) {
      const j = JSON.parse(dec.decode(out.find(([n]) => n === f)[1]));
      assert.ok(j.system && j.system.fixed_bounds, f + ' 没有 fixed_bounds'); assert.equal(j.emitters[0].required.screen_alignment, 'FacingCameraPosition', f);
      assert.equal(j.emitters[0].required.uv_flip, 'RandomFlipUOnly', f); assert.equal(j.materials.main.emissive_dissolve, 0.98, f);
      assert.equal(j.format, 'fwl.cascade/1'); assert.ok(j.textures.seq.sha256, 'sha256 照写');
    }
    const txt = dec.decode(out.find(([n]) => n === 'X_Cascade参数.txt')[1]);
    assert.match(txt, /【资源规范四项 · cascade\.json】[\s\S]*Main = FacingCameraPosition[\s\S]*【资源规范四项 · cascade_mobile\.json】/, '参数说明末尾补最终四项');
    const gate = vm.runInContext('packGateLast', ctx); assert.equal(gate.bad.length, 0, '导出拦截不因新字段报错：' + gate.bad.join('；'));
    const noRec = JSON.parse(dec.decode((await finalize(files, {})).find(([n]) => n === 'cascade.json')[1]));
    assert.equal(noRec.emitters[0].required.uv_flip, 'None', '不知道配方 → None');
    pass++; console.log('✅', name);
  } catch (e) { fails.push(name); console.log('❌', name, '—', e.message.split('\n')[0]); }
})();

// ---- 真实包：仓库里的 + 本机素材包目录（只读；套规则后不能有「没写盒」，盒要包住旧的出生位置）----
const corpus = [];
const walk = (d, depth = 0) => { if (!fs.existsSync(d) || depth > 4) return; for (const n of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, n.name); if (n.isDirectory()) walk(p, depth + 1); else if (/^cascade(_mobile)?\.json$/.test(n.name)) corpus.push(p); } };
for (const d of ['analysis/results/PRISM3R2_20261016', 'spec/UE实测包']) walk(path.join(root, d));
walk(arg('--corpus', path.join(root, 'analysis/local/输出/素材包')));
const rows = []; let noBox = 0, bad = 0;
for (const f of corpus) {
  let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { continue; }
  if (!Array.isArray(j.emitters) || !j.emitters.length) continue;
  const r = R(j, { recipes: SYM }), b = r.system && r.system.fixed_bounds;
  if (!b) { noBox++; rows.push(`  ⚠ ${path.relative(root, f)}：${r.resource_rules.fixed_bounds}`); continue; }
  const finite = [...b.min, ...b.max].every(Number.isFinite) && b.min.every((v, i) => v < b.max[i]);
  if (!finite) { bad++; rows.push(`  ❌ ${path.relative(root, f)}：盒不合法 ${JSON.stringify(b)}`); }
  else rows.push(`  · ${path.basename(path.dirname(f))}/${path.basename(f)}：±${(Math.max(...b.max.slice(0, 2).map(Math.abs), ...b.min.slice(0, 2).map(Math.abs)) / 100).toFixed(0)} m 水平，Z ${(b.min[2] / 100).toFixed(0)}…${(b.max[2] / 100).toFixed(0)} m；FCP ${r.resource_rules.facing_camera_position.length}；U Only ${r.emitters.filter(e => e.required && e.required.uv_flip === 'RandomFlipUOnly').length}/${r.emitters.length}`);
}
t(`真实包 ${corpus.length} 份：全部算得出合法的盒（不认识模块 ${noBox} 份、非法 ${bad} 份）`, () => { assert.equal(bad, 0); assert.equal(noBox, 0); });
// 回归：套规则前后逐项比，只许四项的字段变（其余 cascade 内容逐字不变 = 模拟 / 贴图 / 帧计划都没动）
const ALLOW = [/^\/system\/fixed_bounds$/, /^\/resource_rules$/, /^\/emitters\/\d+\/required\/uv_flip$/, /^\/emitters\/\d+\/required\/screen_alignment$/, /^\/materials\/[^/]+\/emissive_dissolve$/];
const diffs = (a, b, p = '', out = []) => {
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diffs(a[k], b[k], p + '/' + k, out); return out; }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push([p, a, b]); return out; };
const stray = [], fcpOk = [];
for (const f of corpus) {
  let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { continue; }
  if (!Array.isArray(j.emitters) || !j.emitters.length) continue;
  for (const [p, a, b] of diffs(j, R(j, { recipes: SYM }))) {
    if (!ALLOW.some(re => re.test(p))) stray.push(`${path.relative(root, f)} ${p}`);
    else if (/screen_alignment$/.test(p)) { if (a === 'Rectangle' && b === 'FacingCameraPosition') fcpOk.push(p); else stray.push(`${path.relative(root, f)} ${p}: ${a} → ${b}`); }
  }
}
t(`回归：真实包套规则前后只有四项字段变（Rectangle → FCP ${fcpOk.length} 处，别的 ${stray.length} 处）`, () => assert.equal(stray.length, 0, stray.slice(0, 5).join('；')));
if (process.argv.includes('--list') || fails.length) console.log(rows.join('\n'));
console.log(`\n${pass} 项通过，${fails.length} 项失败${fails.length ? '：' + fails.join('；') : ''}`);
process.exit(fails.length ? 1 : 0);
