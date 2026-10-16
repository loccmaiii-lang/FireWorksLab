// 第 2 步 · 3 个代表在内存里改、编辑器里放一遍看（+ D1：一个横竖不同的面片临时改 FacingCameraPosition，看完改回）。
// 用法（一条命令一轮，后台跑）：node rep_test.mjs phase1 | phase2 | wait | cleanup
//   phase1：原样（只把盒临时改成动态，好量粒子实际范围）放 爆裂星 Crackle_HD、低位尾缀 XS（Rectangle），截图
//   phase2：在内存里改上 爆裂星（材质 0.98 / 朝向 FCP / 翻转 U）、金垂柳 GoldKamuro（材质 0.98）、中尾缀 RiseTrail_M（材质 0.98）、
//           XS 临时 FCP（D1），截图 + 量动态包围盒
// 不保存任何资产 / 地图；临时发射器标签 RSU26_tmp_*，cleanup 删掉。
import fs from 'node:fs';
import { saveLog, sleep } from './ue_rw.mjs';
import { ue, pyJson, TMP, SYS, setDynamic, setEmitters, setMI, misOf } from './ops.mjs';
const mode = process.argv[2];
const L = [0, 0, 200000];
const OUT = new URL('./代表测试/', import.meta.url); fs.mkdirSync(OUT, { recursive: true });
const deg = Math.atan2(1, 1) / 45;
function cams(name, s, wanted) {
  const b = SYS[name].bounds; const C = [0, 1, 2].map(i => L[i] + s * (b.min[i] + b.max[i]) / 2), H = [0, 1, 2].map(i => s * (b.max[i] - b.min[i]) / 2);
  const R = Math.max(...H); const d = H[1] + 1.15 * Math.max(H[0], H[2] / Math.tan(29 * deg));
  const all = {
    side: { loc: [C[0], C[1] - d, C[2]], rot: [0, 90, 0] },
    low: { loc: [C[0], C[1] - 0.85 * d, C[2] - 1.1 * H[2]], rot: [Math.atan2(1.1 * H[2], 0.85 * d) / deg, 90, 0] },
    edge: { loc: [C[0], C[1] - 0.8 * d, C[2]], rot: [0, 90 + 25, 0] },
    diag: { loc: [C[0] - 0.7 * d, C[1] - 0.7 * d, C[2] + 0.25 * H[2]], rot: [-Math.atan2(0.25 * H[2], 0.99 * d) / deg, 45, 0] },
  };
  return { list: wanted.map(n => ({ name: n, ...all[n] })), box: { center: C, extent: H, color: [0, 1, 0, 1], thickness: Math.max(20, R * 0.004) } };
}
function run(id, key, name, s, dur, plan, dir) {
  const r = { id, actors: [key], dur, shots: [], boxes: [] };
  for (const [t, wanted] of plan) { const c = cams(name, s, wanted); r.shots.push({ t, dir, cams: c.list }); r.boxes = [c.box]; }
  return r;
}
async function waitDone(tag) {
  for (let i = 0; i < 400; i++) {
    await sleep(1500);
    const s = await ue('status()');
    if (i % 4 === 0) console.log(tag, JSON.stringify(s));
    if (s.error) throw Error('UE 里出错：' + s.error);
    if (!s.running) return s;
  }
  throw Error('等太久');
}
async function finish(tag) {
  const s = await waitDone(tag);
  const f = TMP + '/' + tag + '_result.json';
  console.log(JSON.stringify(await ue(`dump(${JSON.stringify(f)})`)));
  fs.copyFileSync(f, new URL(tag + '_result.json', OUT));
  console.log(JSON.stringify(await ue('cleanup()')));
  return s;
}
const S = 1.6;
if (mode === 'phase1') {
  const dir = TMP + '/A';
  fs.mkdirSync(dir, { recursive: true });
  for (const n of ['P_EFX_FireWorks_Crackle_HD', 'P_EFX_FireWorks_RiseTrail_XS_HD']) await setDynamic(n);
  const cfg = {
    res: '1280x720',
    actors: [{ key: 'crackle_before', system: SYS.P_EFX_FireWorks_Crackle_HD.system, loc: L, s: S },
             { key: 'xs_rect', system: SYS.P_EFX_FireWorks_RiseTrail_XS_HD.system, loc: L, s: S }],
    runs: [run('A1_Crackle_before', 'crackle_before', 'P_EFX_FireWorks_Crackle_HD', S, 5.6, [[0.5, ['side', 'low', 'edge']], [1.3, ['side', 'low', 'edge']], [2.3, ['side', 'low', 'edge']]], dir),
           run('A2_XS_rect', 'xs_rect', 'P_EFX_FireWorks_RiseTrail_XS_HD', S, 3.6, [[1.0, ['side', 'low']], [2.0, ['side', 'low']]], dir)],
  };
  console.log(JSON.stringify(await ue(`start(${pyJson(cfg)})`)));
  await finish('phase1');
} else if (mode === 'phase2') {
  const dir = TMP + '/B';
  fs.mkdirSync(dir, { recursive: true });
  const log = {};
  // 改内存：材质 0.98
  const mis = [...new Set(['P_EFX_FireWorks_Crackle_HD', 'P_EFX_FireWorks_GoldKamuro_HD', 'P_EFX_FireWorks_RiseTrail_M_HD'].flatMap(misOf))];
  log.mi = await setMI(mis, 0.98);
  // 爆裂星：朝向 FCP + 翻转 U（按 targets）
  log.crackle = await setEmitters('P_EFX_FireWorks_Crackle_HD', 'final');
  // XS：D1 临时 FCP（只改朝向）
  const xs = SYS.P_EFX_FireWorks_RiseTrail_XS_HD; const ix = xs.emitters[0].index;
  log.xs = await setEmitters('P_EFX_FireWorks_RiseTrail_XS_HD', 'custom', { [ix]: { ScreenAlignment: 'PSA_FacingCameraPosition' } });
  for (const n of ['P_EFX_FireWorks_GoldKamuro_HD', 'P_EFX_FireWorks_RiseTrail_M_HD']) await setDynamic(n);
  fs.writeFileSync(new URL('phase2_memory_changes.json', OUT), JSON.stringify(log, null, 1));
  console.log(JSON.stringify(log).slice(0, 1500));
  const cfg = {
    res: '1280x720',
    actors: [{ key: 'crackle_after', system: SYS.P_EFX_FireWorks_Crackle_HD.system, loc: L, s: S },
             { key: 'kamuro', system: SYS.P_EFX_FireWorks_GoldKamuro_HD.system, loc: L, s: S },
             { key: 'rtm', system: SYS.P_EFX_FireWorks_RiseTrail_M_HD.system, loc: L, s: S },
             { key: 'xs_fcp', system: SYS.P_EFX_FireWorks_RiseTrail_XS_HD.system, loc: L, s: S }],
    runs: [run('B1_Crackle_after', 'crackle_after', 'P_EFX_FireWorks_Crackle_HD', S, 5.6, [[0.5, ['side', 'low', 'edge']], [1.3, ['side', 'low', 'edge']], [2.3, ['side', 'low', 'edge']]], dir),
           run('B2_GoldKamuro', 'kamuro', 'P_EFX_FireWorks_GoldKamuro_HD', S, 11.0, [[2.0, ['side', 'low', 'diag']], [3.6, ['side', 'low']], [3.9, ['side', 'low']], [6.6, ['side', 'low']], [6.9, ['side', 'low']], [9.0, ['side', 'low']]], dir),
           run('B3_RiseTrail_M', 'rtm', 'P_EFX_FireWorks_RiseTrail_M_HD', S, 7.5, [[1.5, ['side', 'low']], [3.5, ['side', 'low']], [5.5, ['side', 'low']]], dir),
           run('B4_XS_fcp', 'xs_fcp', 'P_EFX_FireWorks_RiseTrail_XS_HD', S, 3.6, [[1.0, ['side', 'low']], [2.0, ['side', 'low']]], dir)],
  };
  console.log(JSON.stringify(await ue(`start(${pyJson(cfg)})`)));
  await finish('phase2');
} else if (mode === 'cleanup') {
  console.log(JSON.stringify(await ue('cleanup()')));
} else if (mode === 'status') {
  console.log(JSON.stringify(await ue('status()')));
} else throw Error('mode?');
saveLog('log_rep_' + mode + '.json');
