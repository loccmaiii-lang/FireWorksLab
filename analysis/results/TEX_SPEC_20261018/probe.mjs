import { request } from '../资源规范统一_20261016/采集/ue_ro.mjs';
const LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const T = '/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD/T_EFX_FireWorks_RiseTrail_L_Loop_16x1_01_HD';
const M = '/Game/Effects_HD/Common_HD/MaterialInstance_HD/FireWorks_HD/MI_EFX_FireWorks_RiseTrail_L_Loop_01_HD';
for (const p of [T, M]) {
  await request('/object/call', { path: LIB, function: 'LoadAsset', args: { AssetPath: p } });
  const r = await request('/object/get', { path: p + '.' + p.split('/').pop(), properties: p === T ? ['LODGroup', 'NeverStream', 'MipGenSettings', 'AddressX', 'AddressY', 'Filter', 'MaxTextureSize', 'CompressionSettings', 'SRGB', 'MipLoadOptions'] : ['Parent', 'TextureParameterValues', 'BasePropertyOverrides'] });
  console.log(JSON.stringify(r).slice(0, 900));
}
const ref = await request('/object/call', { path: LIB, function: 'FindPackageReferencersForAsset', args: { AssetPath: T } });
console.log('referencers', JSON.stringify(ref).slice(0, 500));
