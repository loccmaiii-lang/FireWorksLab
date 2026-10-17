// 只读：GPUECli 活着没有、当前地图（只取一个已知资产是否存在，不做 World 枚举）。
import { request } from '../采集/ue_ro.mjs';
const LIB = '/Script/EditorScriptingUtilities.Default__EditorAssetLibrary';
const t0 = Date.now();
try {
  const r = await request('/object/call', { path: LIB, function: 'DoesAssetExist', args: { AssetPath: '/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_FanSilver_01_HD' } }, 15000, 0);
  console.log('ok', Date.now() - t0, 'ms', JSON.stringify(r).slice(0, 200));
} catch (e) { console.log('fail', Date.now() - t0, 'ms', String(e.message || e)); }
