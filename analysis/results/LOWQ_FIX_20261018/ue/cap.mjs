// 用法：node cap.mjs begin <cfg.json> | status | cleanup | restore | cfgs
import fs from 'node:fs'; import { py } from './fue.mjs';
const mode = process.argv[2]; let expr;
if (mode === 'cfgs') {     // 早期 4 组（Rise / 金芒菊 冷热）：预热时组件已生成，流送有提前量，结论不用；正式证据用提交的 cfg_rise_live / cfg_gold_live / cfg_rise_far（spawnLate + investigate，由这里的配置派生）
  const P = '/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_', ps = n => P + n + '.P_EFX_FireWorks_' + n, mi = n => '/Engine/Transient.FWL18_MI_' + n;
  const base = 'F:/FireWorksLab/analysis/local/LOWQ_FIX_20261018/';
  const L = ps('RiseTrail_L_HD'), M = ps('RiseTrail_M_HD'), G = ps('GoldRayChry_HD');
  // 机位同画质复核（约 271 m，正对，抬头 30°）；从左到右：L 现状 / L NoMip / L NoMip+1024 / M 现状 / M NoMip / M NoMip+1024
  const rise = name => ({ name, folder: base + name, camera: [[374000, -778000, 0], [30, -90, 0]], fov: 90, w: 1920, h: 1080, warm: 20,
    items: [{ source: L, location: [359000, -805150, -3400] }, { source: L, location: [365000, -805150, -3400], materials: [[0, mi('LLoop_NoMip')]] }, { source: L, location: [371000, -805150, -3400], materials: [[0, mi('LLoop_NoMip1k')]] },
      { source: M, location: [377000, -805150, -3400] }, { source: M, location: [383000, -805150, -3400], materials: [[0, mi('MLoop_NoMip')]] }, { source: M, location: [389000, -805150, -3400], materials: [[0, mi('MLoop_NoMip1k')]] }],
    times: [0.3, 1.0, 1.5, 2.5, 3.2, 3.8, 4.3, 5.0, 6.0, 6.8, 7.3], end: 7.6 });
  // 金芒菊约 800 m、300 m 高；从左到右：现状 / NoMip / NoMip+1024
  const gold = name => ({ name, folder: base + name, camera: [[374000, -778000, 0], [20.6, -90, 0]], fov: 90, w: 1920, h: 1080, warm: 20,
    items: [{ source: G, location: [348000, -858000, 30000] }, { source: G, location: [374000, -858000, 30000], materials: [[0, mi('Gold_NoMip')]] }, { source: G, location: [400000, -858000, 30000], materials: [[0, mi('Gold_NoMip1k')]] }],
    times: [0.05, 0.1, 0.2, 0.3, 0.5, 0.8, 1.2, 2.0, 3.0, 4.2], end: 4.9 });
  for (const c of [rise('rise_cold'), rise('rise_warm'), gold('gold_cold'), gold('gold_warm')]) fs.writeFileSync(new URL('./cfg_' + c.name + '.json', import.meta.url), JSON.stringify(c, null, 1));
  console.log('ok'); process.exit(0);
}
if (mode === 'begin') { const cfg = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')); fs.mkdirSync(cfg.folder, { recursive: true }); expr = 'begin(json.loads(' + JSON.stringify(JSON.stringify(cfg)) + '))'; }
else if (mode === 'status') expr = 'status()';
else if (mode === 'cleanup') expr = 'cleanup()';
else if (mode === 'restore') { const b = JSON.parse(fs.readFileSync(new URL('./state-before.json', import.meta.url), 'utf8')); expr = 'restore(' + JSON.stringify(b.camera[0]) + ',' + JSON.stringify(b.camera[1]) + ',' + JSON.stringify(b.selected) + ')'; }
else throw Error('mode');
const code = fs.readFileSync(new URL('./cap.py', import.meta.url), 'utf8');
const r = await py('import sys,types,json\nm=sys.modules.get("fwl18_capmod")\nif m is None:\n m=types.ModuleType("fwl18_capmod");sys.modules["fwl18_capmod"]=m\nexec(compile(' + JSON.stringify(code) + ',"fwl18_capmod","exec"),m.__dict__)\nprint("FWL18:"+json.dumps(eval(' + JSON.stringify(expr) + ',m.__dict__)))', 120000);
if (mode === 'status') console.log({ ...r, shots: r.shots?.map(s => s.file + '@' + s.age) });
else console.log(r);
