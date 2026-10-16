// 网格垂柳 · UE 沙盒导入与实测（对话框网格垂柳，用户 10-16 06:20 同意沙盒写入）
// 一条命令一轮，前一步读回对了再走下一步（项目记忆「UE 测试铁律」），后台跑：
//   node run.mjs check      只读：UE 在不在、状态清单里有没有别人的 UE 单写登记
//   node run.mjs import     导入轴向试件 + 三档网格 + 条带贴图到沙盒（不保存）
//   node run.mjs assets     复制材质实例 / 粒子系统到沙盒（不保存）
//   node run.mjs edit       改沙盒粒子系统（只写沙盒包里的对象），改完读回核对
//   node run.mjs shoot      放临时发射器、按时刻冻结、换机位截图（不存地图）
//   node run.mjs cleanup    删临时发射器、机位还原
//   node run.mjs remove     删沙盒资产（都没保存过）
// 护栏：/object/set 只许写沙盒目录里的对象；/object/call 只放行 LoadAsset、DoesAssetExist、ExecutePythonCommandEx（mw_ue.py）；
//       一次一个请求；别人登记了 UE 单写时除 check 外一律不跑。
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const ME = '网格垂柳';
const SANDBOX = '/Game/Effects_HD/_Sandbox/MeshWillow_20261016';
const MESH_DIR = path.join(ROOT, 'analysis/local/MESH_WILLOW_20261016/网格').replace(/\\/g, '/');
const SHOT_DIR = path.join(ROOT, 'analysis/local/MESH_WILLOW_20261016/UE截图').replace(/\\/g, '/');
const OUT = path.join(ROOT, 'analysis/results/MESH_WILLOW_20261016/UE'); fs.mkdirSync(OUT, { recursive: true });
const COUNTS = [200, 300, 400];
const MESH = n => `SM_EFX_FireWorks_MeshWillow_N${n}`, STRIP = 'T_EFX_FireWorks_MeshWillow_Strip', MI = 'MI_EFX_FireWorks_MeshWillow_01';
const PS_SRC = '/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_Hero_HD', MI_SRC = '/Game/Effects/Common/MaterialInstance/Fireworks/MI_EFX_FireWork_Trail_01';
const PSV = [...COUNTS.map(n => ({ name: `P_EFX_FireWorks_MeshWillow_N${n}`, n, rt: false })), { name: 'P_EFX_FireWorks_MeshWillow_N400_RT', n: 400, rt: true }];
const META = JSON.parse(fs.readFileSync(path.join(MESH_DIR, '生成摘要.json'), 'utf8'));
const LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary', PYLIB = '/Script/PythonScriptPlugin.Default__PythonScriptLibrary';
const LOG = [];
function once(route, payload, timeout) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(payload)), t0 = Date.now();
    const q = http.request('http://127.0.0.1:17780/gpcli' + route, { agent: false, method: 'POST', headers: { 'Content-Type': 'text/plain', 'Content-Length': body.length } }, r => {
      let text = ''; r.setEncoding('utf8'); r.on('data', c => text += c); r.on('end', () => {
        try { const v = JSON.parse(text), ok = r.statusCode === 200 && v.success !== false; LOG.push({ t: new Date().toISOString(), route, path: payload.path, fn: payload.function, ms: Date.now() - t0, ok }); if (!ok) throw Error(v.message || text.slice(0, 300)); resolve(v.data ?? v); } catch (e) { reject(e); }
      });
    });
    q.on('error', reject); q.setTimeout(timeout, () => q.destroy(Error('UE 请求超时 ' + route))); q.end(body);
  });
}
async function request(route, payload, timeout = 120000) {
  if (!['/object/get', '/object/set', '/object/call'].includes(route)) throw Error('白名单外的路由 ' + route);
  if (route === '/object/set' && !String(payload.path).startsWith(SANDBOX + '/')) throw Error('不在沙盒里的对象，不写：' + payload.path);
  if (route === '/object/call' && !['LoadAsset', 'DoesAssetExist', 'ExecutePythonCommandEx'].includes(payload.function)) throw Error('白名单外的函数 ' + payload.function);
  return once(route, payload, timeout);
}
const get = async (p, props) => (await request('/object/get', props ? { path: p, properties: props } : { path: p })).properties;
async function set(p, properties) { const r = await request('/object/set', { path: p, properties }); if ((r.failed_properties || []).length) throw Error('写入失败 ' + p + ' ' + JSON.stringify(r.failed_properties)); return r; }
const UE_SRC = fs.readFileSync(path.join(HERE, 'mw_ue.py'), 'utf8');
async function ue(call, timeout = 300000) {
  const code = UE_SRC + `\nimport json as _j\n_r = ${call}\nprint('FWLMW:' + _j.dumps(_r))\n`;
  const r = await request('/object/call', { path: PYLIB, function: 'ExecutePythonCommandEx', args: { PythonCommand: code, ExecutionMode: 'ExecuteFile', FileExecutionScope: 'Private' } }, timeout);
  const d = r.data || r, lines = [], re = /Output="((?:[^"\\]|\\.)*)"/g; let m;
  while ((m = re.exec(d.out_LogOutput || ''))) lines.push(m[1].replace(/\\(.)/g, (a, c) => c === 'n' ? '\n' : c === 't' ? '\t' : c));
  const line = lines.find(l => l.startsWith('FWLMW:'));
  if (!line) throw Error('Python 没有回结果：' + String(d.out_CommandResult || '').slice(-1500) + ' | ' + lines.slice(-5).join(' | ').slice(-1500));
  return JSON.parse(line.slice(6));
}
const pyJson = v => `json.loads(${JSON.stringify(JSON.stringify(v))})`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function othersLock() {
  const s = fs.readFileSync(path.join(ROOT, '协作/状态清单.json'), 'utf8');
  return [...s.matchAll(/UE 写入 \/ 播放：([^，,"]+)[，,]?[^"]{0,40}/g)].map(m => m[0]).filter(x => !x.includes(ME));
}
const pathOf = v => v && typeof v === 'object' && v.path ? v.path : null;
const curve = pts => `(Points=(${pts.map(([t, v]) => `(InVal=${t},OutVal=${v},ArriveTangent=0,LeaveTangent=0,InterpMode=CIM_Linear)`).join(',')}),bIsLooped=False,LoopKeyOffset=0)`;
const mode = process.argv[2];
const save = (name, obj) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 1));
if (mode !== 'check') { const L = othersLock(); if (L.length) { console.log('有别人的 UE 单写登记，不跑：', L.join(' | ')); process.exit(2); } }

if (mode === 'check') {
  console.log('别人的 UE 单写登记：', othersLock());
  const t0 = Date.now(); const r = await request('/object/call', { path: LIB, function: 'DoesAssetExist', args: { AssetPath: PS_SRC } }, 20000);
  console.log('UE 在线', r.return_value, Date.now() - t0, 'ms');
  const sb = await request('/object/call', { path: LIB, function: 'DoesAssetExist', args: { AssetPath: SANDBOX + '/' + MESH(400) } }, 20000);
  console.log('沙盒里已有 N400 网格：', sb.return_value);
} else if (mode === 'import') {
  const cfg = { sandbox: SANDBOX, meshes: [[MESH_DIR + '/SM_EFX_FireWorks_MeshWillow_AxisTest.obj', 'SM_EFX_FireWorks_MeshWillow_AxisTest'], ...COUNTS.map(n => [MESH_DIR + '/' + MESH(n) + '.obj', MESH(n)])], strip: [MESH_DIR + '/' + STRIP + '.png', STRIP] };
  const r = await ue(`import_all(${pyJson(cfg)})`); save('import.json', r); console.log(JSON.stringify(r, null, 1));
  // 轴向试件：模拟坐标 x 10 m / y(上) 20 m / z 30 m —— 读回看 UE 里哪根轴是「上」
  const a = r.meshes.SM_EFX_FireWorks_MeshWillow_AxisTest; if (a) console.log('轴向试件包围盒（cm）', a.min, a.max, '→ 期望 Z 方向长 2000（朝上），另两轴 1000 / 3000');
} else if (mode === 'assets') {
  const r = await ue(`make_assets(${pyJson({ sandbox: SANDBOX, mi: MI, mi_src: MI_SRC, strip: STRIP, ps: PSV.map(p => p.name), ps_src: PS_SRC })})`); save('assets.json', r); console.log(JSON.stringify(r, null, 1));
} else if (mode === 'edit') {
  const L = META.寿命, S = META.S, H = META.H, A = META.透明度随时间, K = [18, 8.2, 1.8];
  const report = {};
  for (const pv of PSV) {
    const sys = `${SANDBOX}/${pv.name}.${pv.name}`;
    await request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: sys.split('.')[0] } });
    const ps = await get(sys); const rep = { emitters: [] };
    const em = [];
    for (const e of ps.Emitters) { const ep = await get(e.path); const lods = []; for (const l of ep.LODLevels) lods.push({ path: l.path, p: await get(l.path) }); em.push({ path: e.path, name: ep.EmitterName, lods }); }
    const meshIdx = em.findIndex(e => /Mesh/.test(e.lods[0].p.TypeDataModule?.class || ''));
    if (meshIdx < 0) throw Error('找不到网格发射器 ' + sys);
    // 系统：全程 LOD0、固定盒 ±1000 m、更新模式
    await set(sys, { LODDistances: [0, 10000000, 10000000, 10000000], bUseFixedRelativeBoundingBox: true, FixedRelativeBoundingBox: '(Min=(X=-100000,Y=-100000,Z=-100000),Max=(X=100000,Y=100000,Z=100000),IsValid=1)', ...(pv.rt ? { SystemUpdateMode: 'EPSUM_RealTime' } : {}) });
    const done = new Set();
    for (const [i, e] of em.entries()) {
      if (i === meshIdx) continue;
      for (const l of e.lods) { await set(l.path, { bEnabled: false }); if (l.p.RequiredModule?.path && !done.has(l.p.RequiredModule.path)) { done.add(l.p.RequiredModule.path); await set(l.p.RequiredModule.path, { bEnabled: false }); } }
      rep.emitters.push([i, e.name, '关']);
    }
    const meshP = `${SANDBOX}/${MESH(pv.n)}.${MESH(pv.n)}`, miP = `${SANDBOX}/${MI}.${MI}`;
    for (const l of em[meshIdx].lods) {
      const td = l.p.TypeDataModule.path, req = l.p.RequiredModule.path;
      if (!done.has(td)) { done.add(td); await set(td, { Mesh: meshP, bOverrideMaterial: true }); }
      if (!done.has(req)) { done.add(req); await set(req, { Material: miP, EmitterDuration: 1, EmitterLoops: 1 }); }
      for (const m of l.p.Modules) {
        if (done.has(m.path)) continue; done.add(m.path);
        const c = m.class.replace(/.*\./, ''), mp = await get(m.path);
        const dist = async (field, props) => { const dpath = pathOf(mp[field]?.Distribution); if (!dpath) throw Error('没有分布 ' + m.path + ' ' + field); await set(dpath, { ...props, bIsDirty: true }); };
        if (c === 'ParticleModuleLifetime') await dist('Lifetime', { Constant: L });
        else if (c === 'ParticleModuleSize') await dist('StartSize', { Constant: '(X=1,Y=1,Z=1)' });
        else if (c === 'ParticleModuleSizeMultiplyLife') await set(m.path, { bEnabled: false });
        else if (c === 'ParticleModuleColorOverLife' || c === 'ParticleModuleColorScaleOverLife') {
          await dist('ColorScaleOverLife', { Constant: `(X=${K[0]},Y=${K[1]},Z=${K[2]})` });
          await dist('AlphaScaleOverLife', { ConstantCurve: curve(A.map(([t, a]) => [+(t / L).toFixed(4), a])) });
        } else if (c === 'ParticleModuleParameterDynamic') {
          const dp = mp.DynamicParams; const d0 = pathOf(dp[0].ParamValue.Distribution), d1 = pathOf(dp[1].ParamValue.Distribution);
          await set(d0, { ConstantCurve: curve([[0, H], [1, +(H - L / S).toFixed(5)]]), bIsDirty: true });
          await set(d1, { ConstantCurve: curve([[0, 1.02], [1, 1.02]]), bIsDirty: true });
        }
        rep[c] = (rep[c] || 0) + 1;
      }
    }
    const tw = (await get(sys, ['ThumbnailWarmup'])).ThumbnailWarmup; await set(sys, { ThumbnailWarmup: tw });   // 触发 PostEditChange，按新值重建（26 / tail-restore 同一写法）
    report[pv.name] = rep; console.log(pv.name, JSON.stringify(rep));
  }
  save('edit.json', report);
} else if (mode === 'verify') {
  const out = {};
  for (const pv of PSV) {
    const sys = `${SANDBOX}/${pv.name}.${pv.name}`; const ps = await get(sys, ['SystemUpdateMode', 'UpdateTime_FPS', 'LODDistances', 'bUseFixedRelativeBoundingBox', 'FixedRelativeBoundingBox', 'Emitters']);
    const row = { system: { SystemUpdateMode: ps.SystemUpdateMode, FPS: ps.UpdateTime_FPS, LOD: ps.LODDistances, box: ps.FixedRelativeBoundingBox }, emitters: [] };
    for (const e of ps.Emitters) {
      const ep = await get(e.path); const l0 = await get(ep.LODLevels[0].path); const r = { name: ep.EmitterName, enabled: l0.bEnabled };
      if (/Mesh/.test(l0.TypeDataModule?.class || '')) {
        r.mesh = (await get(l0.TypeDataModule.path, ['Mesh', 'MeshAlignment'])); r.material = (await get(l0.RequiredModule.path, ['Material', 'ScreenAlignment']));
        for (const m of l0.Modules) { const mp = await get(m.path); const c = m.class.replace(/.*\./, '').replace('ParticleModule', ''); const dd = {};
          for (const [k, v] of Object.entries(mp)) { const p = pathOf(v?.Distribution); if (p) { const dv = await get(p); dd[k] = dv.Constant ?? dv.ConstantCurve?.Points?.map(x => [x.InVal, x.OutVal]); } }
          if (c === 'ParameterDynamic') for (const [i, x] of mp.DynamicParams.entries()) { const dv = await get(pathOf(x.ParamValue.Distribution)); dd['DP' + i] = dv.Constant ?? dv.ConstantCurve?.Points?.map(q => [q.InVal, q.OutVal]); }
          r[c] = { enabled: mp.bEnabled, ...dd }; }
      }
      row.emitters.push(r);
    }
    out[pv.name] = row;
  }
  save('verify.json', out); console.log(JSON.stringify(out, null, 1).slice(0, 6000));
} else if (mode === 'shoot') {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const Lc = [0, 0, 200000];                                   // 开花点（26 的临时测试也放这里）
  const deg = Math.PI / 180, cam = (name, dist, elev, az) => { const e = elev * deg, a = az * deg; const h = dist * Math.cos(e);
    return { name, loc: [Lc[0] - h * Math.cos(a), Lc[1] - h * Math.sin(a), Lc[2] - dist * Math.sin(e)], rot: [elev, az, 0] }; };
  const cams = [cam('game', 107700, 21.8, 0), cam('game90', 107700, 21.8, 90), cam('below', 40000, 89, 0), cam('side', 100000, 0, 45)];
  const T = [1.0, 2.4, 3.3, 5.3, 7.0, 8.3, 9.3];
  const actors = PSV.map(p => ({ key: p.name.replace('P_EFX_FireWorks_MeshWillow_', ''), system: `${SANDBOX}/${p.name}.${p.name}`, loc: Lc }));
  const runs = actors.map(a => ({ id: a.key, actors: [a.key], dur: META.寿命 + 0.5, shots: T.map(t => ({ t, dir: SHOT_DIR, cams: a.key === 'N400' ? cams : [cams[0]] })) }));
  console.log(JSON.stringify(await ue(`start(${pyJson({ res: '1280x720', actors, runs })})`)));
  for (let i = 0; i < 600; i++) { await sleep(1500); const s = await ue('status()'); if (i % 6 === 0) console.log(JSON.stringify(s)); if (s.error) throw Error('UE 里出错：' + s.error); if (!s.running) break; }
  const full = await ue('status(True)'); save('shoot.json', full); console.log('截图', full.shots, '张 →', SHOT_DIR);
  console.log(JSON.stringify(await ue('cleanup()')));
} else if (mode === 'cleanup') {
  console.log(JSON.stringify(await ue('cleanup()')));
} else if (mode === 'remove') {
  console.log(JSON.stringify(await ue(`remove_assets(${pyJson({ sandbox: SANDBOX, names: [...PSV.map(p => p.name), MI, STRIP, 'SM_EFX_FireWorks_MeshWillow_AxisTest', ...COUNTS.map(MESH)] })})`)));
} else throw Error('mode? check | import | assets | edit | verify | shoot | cleanup | remove');
fs.writeFileSync(path.join(OUT, `log_${mode}.json`), JSON.stringify(LOG));
