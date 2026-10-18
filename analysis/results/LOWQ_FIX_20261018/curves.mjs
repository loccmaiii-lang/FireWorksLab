// 只读：读 RiseLoop 的 SizeMultiplyLife 曲线点、寿命、Required 时长
import fs from 'node:fs';
import { request } from '../资源规范统一_20261016/采集/ue_ro.mjs';
const o = JSON.parse(fs.readFileSync(new URL('probe.json', import.meta.url), 'utf8')); const out = {};
for (const [k, r] of Object.entries(o)) for (const e of r.emitters) {
  const rec = out[k + ':' + e.name] = { duration: e.required.EmitterDuration, loops: e.required.EmitterLoops };
  for (const m of e.modules) { if (!m.p) continue;
    if (m.cls === 'ParticleModuleLifetime') rec.life = m.p.Lifetime;
    if (m.cls === 'ParticleModuleSizeMultiplyLife') { const d = m.p.LifeMultiplier.Distribution.path; rec.sizeLife = (await request('/object/get', { path: d })).properties; }
  }
}
fs.writeFileSync(new URL('curves.json', import.meta.url), JSON.stringify(out, null, 1));
for (const [k, r] of Object.entries(out)) { console.log('\n#', k, 'dur', r.duration, 'loops', r.loops, 'life', JSON.stringify(r.life && (r.life.detail || r.life)).slice(0, 250));
  const pts = r.sizeLife && r.sizeLife.ConstantCurve && r.sizeLife.ConstantCurve.Points; if (pts) console.log('  sizeY pts', pts.map(p => p.InVal.toFixed(3) + ':' + p.OutVal.Y.toFixed(4)).join(' ')); }
