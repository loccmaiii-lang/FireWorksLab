// 低画质方头 / 金芒菊绽放糊（用户 10-18）· 只读探查：发射器尺寸曲线、SubUV、朝向、寿命，主图源尺寸与流送状态。不写任何东西。
import fs from 'node:fs';
import { request } from '../资源规范统一_20261016/采集/ue_ro.mjs';
const LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const SYS = ['RiseTrail_L_HD', 'RiseTrail_M_HD', 'RiseTrail_S_HD', 'GoldRayChry_HD'].map(n => '/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_' + n);
const ref = v => v && typeof v === 'object' && v.path ? v.path : null;
const objOf = k => k + '.' + k.split('/').pop();
const get = async (p, props) => (await request('/object/get', { path: p, ...(props ? { properties: props } : {}) })).properties || {};
const out = {};
for (const ps of SYS) {
  await request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: ps } });
  const sp = await get(objOf(ps), ['Emitters', 'UpdateTime_FPS', 'bUseFixedRelativeBoundingBox']);
  const rec = out[ps.split('/').pop()] = { system: sp, emitters: [] };
  for (const e of sp.Emitters || []) {
    const ep = ref(e); const em = await get(ep, ['EmitterName', 'LODLevels']);
    const lp = ref((em.LODLevels || [])[0]); const lod = await get(lp, ['RequiredModule', 'SpawnModule', 'Modules']);
    const rq = await get(ref(lod.RequiredModule), ['Material', 'ScreenAlignment', 'SubImages_Horizontal', 'SubImages_Vertical', 'InterpolationMethod', 'EmitterDuration', 'EmitterLoops', 'bUseLocalSpace', 'CutoutTexture', 'BoundingMode', 'OpacitySourceMode']);
    const mods = [];
    for (const m of lod.Modules || []) { const mp = ref(m); if (!mp) continue; const cls = (m.class || '').split('.').pop();
      if (/Size|Lifetime|SubUV|Color|Velocity|Rotation/.test(cls)) mods.push({ cls, path: mp, p: await get(mp) }); else mods.push({ cls }); }
    rec.emitters.push({ name: em.EmitterName, required: rq, modules: mods });
  }
}
fs.writeFileSync(new URL('probe.json', import.meta.url), JSON.stringify(out, null, 1));
for (const [k, r] of Object.entries(out)) { console.log('\n#', k, JSON.stringify(r.system).slice(0, 200));
  for (const e of r.emitters) console.log(' ', e.name, e.required.ScreenAlignment, e.required.SubImages_Horizontal + 'x' + e.required.SubImages_Vertical, e.required.InterpolationMethod, '|', e.modules.map(m => m.cls).join(',')); }
