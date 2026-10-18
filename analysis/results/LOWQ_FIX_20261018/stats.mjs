// 只读统计：ResourceFX 3.0 行用到的贴图，按 主序列 / Ramp / Cutout 和 PC / 手游 分，估三种情况下的常驻显存。不写任何东西。
// 估算口径：PC BC7 / DXT5 / BC5 = 1 B/像素，DXT1 = 0.5；手游 ASTC 6x6 ≈ 0.444 B/像素（128 bit / 36 像素）；带 mip 链 × 4/3。
// 「可流送」的图没出现时只留 64²～128²，按 0 计。
import fs from 'node:fs';
import { request } from '../资源规范统一_20261016/采集/ue_ro.mjs';
const LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const pre = JSON.parse(fs.readFileSync(new URL('../TEX_SPEC_20261018/preflight.json', import.meta.url), 'utf8'));
const tg = JSON.parse(fs.readFileSync(new URL('../TEX_SPEC_20261018/targets.json', import.meta.url), 'utf8'));
const before = Object.fromEntries(tg.targets.map(t => [t.path, t.before]));
const rows = [];
for (const [p, r] of Object.entries(pre.textures)) {
  if (!r.now) continue;
  await request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: p } });
  const n = (await request('/object/get', { path: p + '.' + p.split('/').pop(), properties: ['ImportedSize', 'MaxTextureSize', 'CompressionSettings', 'MipGenSettings', 'NeverStream', 'LODGroup', 'ForcePlatformSettings'] })).properties;
  const hd = /_HD$/i.test(p.split('/').pop()) || p.includes('/Effects_HD/');
  const role = r.ramp ? 'ramp' : r.params.every(x => x === 'CutoutTexture') ? 'cutout' : 'main';
  let w = n.ImportedSize.X, h = n.ImportedSize.Y; const cap = n.MaxTextureSize || 0;
  if (cap && Math.max(w, h) > cap) { const k = Math.max(w, h) / cap; w = Math.round(w / k); h = Math.round(h / k); }
  const fmt = (n.ForcePlatformSettings || []).find(x => x.key === 'Android')?.value?.PixelFormat;
  const bpp = hd ? (n.CompressionSettings === 'TC_Default' ? 1 : 1) : (fmt === 'PF_ASTC_6x6' ? 128 / 36 / 8 : fmt === 'PF_ASTC_4x4' ? 1 : fmt === 'PF_ASTC_8x8' ? 0.25 : 1);
  const mb = w * h * bpp / 1048576;
  rows.push({ path: p, hd, role, shared: !!r.shared, w, h, comp: n.CompressionSettings, fmt: fmt || null, mip: n.MipGenSettings, never: n.NeverStream, neverBefore: before[p]?.NeverStream ?? n.NeverStream, group: n.LODGroup, mb });
}
const sum = f => +rows.filter(f).reduce((a, r) => a + r.mb, 0).toFixed(1), cnt = f => rows.filter(f).length;
const out = {};
for (const hd of [true, false]) {
  const k = hd ? 'PC' : '手游', M = r => r.hd === hd && r.role === 'main';
  out[k] = {
    主序列张数: cnt(M), 其中共享: cnt(r => M(r) && r.shared), 已NoMip: cnt(r => M(r) && r.mip === 'TMGS_NoMipmaps'),
    '主序列 原尺寸合计 MB（=全部 NoMip 后常驻）': sum(M),
    '10-18 前 NeverStream 的主序列常驻 MB（带 mip）': +(sum(r => M(r) && r.neverBefore === true) * 4 / 3).toFixed(1),
    '现在主序列常驻 MB（只有 NoMip 的）': sum(r => M(r) && r.mip === 'TMGS_NoMipmaps'),
    Ramp张数: cnt(r => r.hd === hd && r.role === 'ramp'), 'Ramp 常驻 MB': sum(r => r.hd === hd && r.role === 'ramp'),
    尺寸分布: rows.filter(M).reduce((a, r) => (a[r.w + 'x' + r.h] = (a[r.w + 'x' + r.h] || 0) + 1, a), {}),
    压缩: rows.filter(M).reduce((a, r) => (a[(r.hd ? r.comp : r.fmt)] = (a[(r.hd ? r.comp : r.fmt)] || 0) + 1, a), {}),
  };
}
fs.writeFileSync(new URL('stats.json', import.meta.url), JSON.stringify({ at: new Date().toISOString(), summary: out, rows }, null, 1));
console.log(JSON.stringify(out, null, 1));
