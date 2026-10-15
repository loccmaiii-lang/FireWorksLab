// 灯光交付用的现场数据（16.0.40，本机同步 8，用户 10-15 23:22 灯光交接）。
// 来源：同事交接包 FireworkLight_Handover（tool/fwlight）。坐标是 UE 世界坐标（cm），
// 由 tool/fwlight/lib/uepkg.py 直接解析 MA5_FireworkOnDam_Night.umap 得到：同事机器 10-15 22:38 读数，
// 本机 E:/loc_ma5 的 umap（10-09）读数逐项相同。工作台舞台里的点位是设计坐标，不能拿来算灯光。
// 模型参数、四盏灯的复用关系照搬交接 config.json（SpotLight / SpotLight3 复用 SpotLight2，SkyLight = SpotLight2 × 0.003846）。
// 改这里要同步 tool/fwlight/config.json，tests/light-curve.test.mjs 会对照 Python 结果。
export const LIGHT_RIG = Object.freeze({
  format: 'fwlight.rig/1',
  level: '/Game/Maps/Dam_Iris_Long3/DynamicRequest/Event/MA5_FireworkOnDam/MA5_FireworkOnDam_Night',
  sequence: {
    asset: '/Game/BluePrints/ShowDirector/Instance/Ma5_NewYearFireworks/Seq_NewYear_TestShowTemplate_2',
    fps: 30,
    endS: 240.4667,
    timeOffsetS: 0,
  },
  points: {B0:[399287.40625,-788278.125,-3400.95556640625],B1:[391912.0625,-794879.3125,-3400.95556640625],B2:[384259.71875,-800540.4375,-3400.95556640625],B3:[375319.0,-803979.875,-3400.962890625],B4:[368476.6875,-806582.875,-3400.95947265625],B5:[359850.3125,-809370.375,-3400.9560546875],B6:[350417.34375,-810297.9375,-3400.95751953125],B7:[343357.09375,-810282.8125,-3400.95751953125],F0:[377577.46875,-794925.3125,-11796.7109375],F1:[374930.875,-795934.1875,-11796.7109375],F2:[371938.625,-797076.0,-11796.7109375],F3:[369217.65625,-798112.3125,-11796.7109375],F4:[366474.3125,-799158.4375,-11796.7109375],F5:[363710.6875,-800212.3125,-11796.7109375],F6:[360683.34375,-801367.0,-11796.7109375],Lm0:[349223.34375,-808200.375,-7268.28662109375],Lm1:[351369.75,-807940.6875,-7268.28857421875],Lm2:[353452.3125,-807775.75,-7268.29150390625],Lm3:[355930.78125,-807476.0,-7268.29150390625],Lm4:[357735.375,-807305.875,-7268.29052734375],Lm5:[360149.1875,-807032.625,-7268.2900390625],P0:[401961.75,-784978.0,-3400.95556640625],P1:[396541.34375,-791666.6875,-3400.95556640625],P2:[387785.3125,-797932.0625,-3400.95556640625],P3:[378483.4375,-802753.25,-3400.962890625],P4:[371995.21875,-805151.0625,-3400.962890625],P5:[364805.40625,-808027.875,-3400.95947265625],P6:[355148.28125,-809832.75,-3400.95751953125],P7:[345764.5625,-810646.875,-3400.95751953125],P8:[340579.90625,-809862.9375,-3400.95751953125],Rm0:[391095.5625,-792831.375,-7093.736328125],Rm1:[389087.40625,-794157.5,-7093.73681640625],Rm2:[387363.78125,-795295.75,-7093.7373046875],Rm3:[385558.9375,-796487.6875,-7093.73681640625],Rm4:[383838.09375,-797624.0625,-7093.7373046875],Rm5:[381883.4375,-798914.8125,-7093.7373046875]},
  actors: {SpotLight2:[344383.78125,-800521.625,-1016.63037109375],SpotLight3:[394225.90625,-777683.875,-2558.85302734375],SpotLight_1:[372900.90625,-796930.125,-1501.5693359375]},
  lights: [
    {light: 'SpotLight2', binding: 'SpotLight2', component: 'LightComponent0', levelActor: 'SpotLight2'},
    {light: 'SpotLight', binding: 'SpotLight', component: 'LightComponent0', levelActor: 'SpotLight_1', curveFrom: 'SpotLight2'},
    {light: 'SpotLight3', binding: 'SpotLight3', component: 'LightComponent0', levelActor: 'SpotLight3', curveFrom: 'SpotLight2'},
    // 用户 10-15「skylight 的峰值要控制在 10 以内」：maxIntensity 是硬上限（超了不让下载）；峰值本身由 intensityScale × i_peak 决定。
    {light: 'SkyLight', binding: 'SkyLight', component: 'SkyLightComponent0', curveFrom: 'SpotLight2', intensityScale: 0.003846, maxIntensity: 10},
  ],
  model: {fps: 30, i_peak: 1800.0, gamma: 0.72, r0_m: 300.0, size_exp: 2.5, sat_boost: 1.3, int_tol: 0.015, col_tol: 0.03, seed: 20261231, flash_tau_s: 0.09, fan_power_per_beam: 0.04, comet_power: 0.06, fan_height_m: 60.0, launch_flash: 0.1, rise_glow: 0.025, dark_color_hold: 0.03, start_color: '#f0d69d'},
});
