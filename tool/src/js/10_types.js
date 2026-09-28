// =====================================================================
//  花型与参数
// =====================================================================
const VERSION = '3.4';
// 家族：aerial = 空中开花（大面片或单元序列）；rise = 上升段；ground = 地面循环类
const TYPE_INFO = {
  kiku: ['菊', 'Kiku', 'aerial'], botan: ['牡丹（芯）', 'Botan', 'aerial'], kamuro: ['锦冠', 'Kamuro', 'aerial'], yanagi: ['柳', 'Yanagi', 'aerial'],
  senrin: ['千轮', 'Senrin', 'aerial'], hachi: ['蜂', 'Hachi', 'aerial'], palm: ['椰子', 'Palm', 'aerial'], henka: ['变色菊（5 段）', 'Henka', 'aerial'],
  strobe: ['点灭星', 'Strobe', 'aerial'], glitter: ['辉星', 'Glitter', 'aerial'], crackle: ['爆裂星', 'Crackle', 'aerial'], matsuba: ['松叶', 'Matsuba', 'aerial'],
  crossette: ['分裂（十字）', 'Crossette', 'aerial'], ochiba: ['落叶', 'Ochiba', 'aerial'], jisa: ['时差（延时点火）', 'Jisa', 'aerial'],
  ring: ['环', 'Ring', 'aerial'], saturn: ['土星', 'Saturn', 'aerial'], kata: ['型物', 'Kata', 'aerial'], water: ['水中花火', 'Water', 'aerial'],
  rise: ['上升（曲导）', 'Rise', 'rise'],
  trailS: ['升空尾缀 · 小', 'TrailS', 'rise'], trailM: ['升空尾缀 · 中', 'TrailM', 'rise'], trailL: ['升空尾缀 · 大', 'TrailL', 'rise'],
  fountain: ['喷泉', 'Fountain', 'ground'], falls: ['瀑布', 'Falls', 'ground'], wheel: ['转轮', 'Wheel', 'ground'],
  fan: ['扇形', 'Fan', 'ground'], barrage: ['连发', 'Barrage', 'ground'], shikake: ['仕掛け（文字/图案）', 'Shikake', 'ground']
};
const TYPE_GROUPS = [
  ['礼花', ['kiku', 'botan', 'kamuro', 'yanagi', 'senrin', 'hachi', 'palm', 'henka']],
  ['效果星', ['strobe', 'glitter', 'crackle', 'matsuba', 'crossette', 'ochiba', 'jisa']],
  ['形状', ['ring', 'saturn', 'kata', 'water']],
  ['上升', ['rise', 'trailS', 'trailM', 'trailL']],
  ['地面 · 循环', ['fountain', 'falls', 'wheel', 'fan', 'barrage', 'shikake']]
];
const TYPE_NAMES = Object.fromEntries(Object.entries(TYPE_INFO).map(([k, v]) => [k, v[0]]));
const TYPE_EN = Object.fromEntries(Object.entries(TYPE_INFO).map(([k, v]) => [k, v[1]]));
const familyOf = t => (TYPE_INFO[t] || TYPE_INFO.kiku)[2];

const BASE = {
  duration: 3.2, seed: 7, stars: 150, burstR0: 0, v0: 150, vt: 18, grav: 1, speedJit: 3, dirJit: 1.5,
  burn: 2.5, burnJit: 12, fade: 0.2, lastFlare: 0.35, flash: 1,
  headSize: 1.0, headBright: 1, flicker: 0.25,
  sparkRate: 95, sparkRateEnd: 1, sparkLife: 0.55, sparkSize: 0.35, sparkSpread: 2.5, sparkInherit: 0.2, sparkDrag: 2.2, sparkGrav: 1,
  T0: 2050, cooling: 0.42, sparkBright: 1, twinkle: 0.6,
  subDelay: 0.9, subJit: 10, subStars: 36, subSpeed: 40, subBurn: 0.9, subTail: 0, carrierTail: 30, subPattern: 'sphere',
  spin: 14, chaos: 0.8, beeSpeed: 28,
  // 物理
  shellNo: 0, wind: 0, turb: 0, turbScale: 60, massLoss: 0, shellVx: 0, shellVy: 0, shellSpin: 0,
  // 形状
  pattern: 'sphere', tilt: 0, ringFrac: 0.45, text: '祭', waterRefl: 0,
  // 星效果
  ignDelay: 0, ignJit: 10, strobeHz: 0, strobeDuty: 0.35, strobeStart: 0.4, glitter: 0, glitterDelay: 0.25,
  crackle: 0, crackleDelay: 0.3, branch: 0, branchAt: 0.45, flutter: 0, flutterHz: 0.7,
  // 上升
  riseH: 250, vtShell: 55, riseStyle: 'gold', wobble: 0, wobbleHz: 1.6, kobanaN: 4, bunpoN: 3,
  // 升空尾缀序列（上升产物「尾缀序列」）：弹体随体坐标里的星头 + 多层火花，周期性发射（真循环），开花后消散
  trV: 43.5, trFps: 30, trInh: 0.1, trDrag: 3, trGrav: 0.3, trCool: 1,
  trFRate: 2600, trFLife: 0.6, trFSpread: 0.45, trFSize: 0.1, trFBright: 0.03,
  trMRate: 600, trMLife: 0.75, trMSpread: 0.8, trMSize: 0.14, trMBright: 0.05,
  trCRate: 60, trCLife: 0.9, trCSpread: 1.2, trCSize: 0.18, trCBright: 0.12,
  trWRate: 0, trWLife: 0.12, trWSpread: 14, trWSize: 0.06, trWBright: 0.06,
  trHeadSize: 0.26, trHeadBright: 1.2, trHalo: 3, trHaloBright: 0.15,
  trTwist: 0.35, trTwistN: 5, trWiggle: 0.08, trTwistLag: 0.35, trFollow: 0, trBright: 1.6, trExport4K: 1, trIgnite: 0,
  // 地面循环
  loopT: 1, nozzles: 1, fanAngle: 70, spacing: 6, shotRate: 3, shotSpeed: 70, cometBurn: 1.4, burstStars: 0,
  wheelR: 3, jetSpeed: 28, jetCone: 10, jetDir: 90, groundH: 0,
  // 取帧与输出
  shutter: 0.6, fpsFloor: 24,
  texW: 2048, texH: 2048, cols: 8, rows: 8, chans: 4, outMode: 'combined', encGamma: 1, frameMode: 'auto', zoom: 'tight', engine: 'gpu',
  form: 'master', segAt: 0, unitElev: 0, unitFlip: 0, cellPad: 2, autoGrid: 1
};
const RAMP_POS = [0, 0.3, 0.65, 1];
// 颜色：stages = [[时刻 s, 颜色], …]，最多 5 段；xw = 变色过渡时长
const MAT_BASE = { stages: [[0, '#ffffff']], xw: 0.08, ramp0: '#000000', ramp1: '#7a1e04', ramp2: '#ffa53a', ramp3: '#fff3dc', headInt: 1, tailInt: 1 };
// 焰色预设（sRGB）：按常见发色剂
const FLAME = [
  ['锶红', '#ff2a1c'], ['钙橙', '#ff7a1e'], ['钠黄', '#ffc53a'], ['钡绿', '#52ff5e'], ['铜蓝', '#3d6cff'],
  ['紫（锶+铜）', '#b44dff'], ['银白（镁铝）', '#eef2ff'], ['金（炭）', '#ffb45a'], ['粉', '#ff7ab8']
];
const IGNITE_ORANGE = '#ff8a2e';
const GROUND_RAMP = { ramp1: '#8a3208', ramp2: '#ffc266', ramp3: '#fff0d2' };
const TYPES = {
  kiku: { p: {}, m: {} },
  botan: { p: { duration: 2.8, stars: 90, sparkRate: 0, headSize: 1.4, burn: 2.4, flicker: 0.2, lastFlare: 0.3 }, m: { stages: [[0, '#ffc766'], [1.35, '#dfe8ff']] } },
  kamuro: { p: { duration: 5.2, stars: 110, v0: 220, vt: 24, burn: 3.8, burnJit: 7, fade: 0.55, lastFlare: 0, headBright: 0.5, headSize: 0.9, sparkRate: 230, sparkLife: 1.1, sparkSpread: 1.4, sparkInherit: 0.25, sparkDrag: 1.5, T0: 1950, cooling: 0.35, sparkSize: 0.3, massLoss: 0.3 }, m: { ramp1: '#8a3208', ramp2: '#ffc266', ramp3: '#fff0d2' } },
  yanagi: { p: { duration: 6.5, stars: 90, v0: 95, vt: 9, grav: 1.25, burn: 5.2, burnJit: 8, fade: 0.6, lastFlare: 0, headBright: 0.45, headSize: 0.8, sparkRate: 200, sparkLife: 1.8, sparkSpread: 0.5, sparkInherit: 0.45, sparkDrag: 0.8, T0: 1900, cooling: 0.33, sparkSize: 0.28, massLoss: 0.4 }, m: { ramp1: '#7e2e08', ramp2: '#ffbb5c', ramp3: '#ffedcc' } },
  senrin: { p: { duration: 2.8, stars: 18, v0: 95, vt: 20, burn: 0.9, burnJit: 6, sparkRate: 0, headBright: 1, headSize: 0.6, lastFlare: 0.2, subDelay: 0.85, subStars: 40, subSpeed: 45, subBurn: 0.95, subTail: 25, carrierTail: 40 }, m: { stages: [[0, '#ff7fb5'], [1.4, '#ffe27a']] } },
  hachi: { p: { duration: 2.6, stars: 60, v0: 110, vt: 30, burn: 1.7, burnJit: 8, fade: 0.2, lastFlare: 0, headBright: 0.8, headSize: 0.7, sparkRate: 170, sparkLife: 0.35, sparkSpread: 3, sparkInherit: 0.08, sparkDrag: 3, T0: 2450, cooling: 0.5 }, m: { stages: [[0, '#ffffff'], [9, '#dfe6ff']], ramp1: '#b0602c', ramp2: '#ffe2b8', ramp3: '#ffffff' } },
  palm: { p: { duration: 4.6, stars: 9, v0: 120, vt: 30, dirJit: 6, burn: 3.4, burnJit: 5, headSize: 2.2, headBright: 1.3, sparkRate: 900, sparkLife: 1.3, sparkSpread: 1.2, sparkInherit: 0.3, sparkDrag: 1.2, sparkSize: 0.45, T0: 2000, cooling: 0.36, massLoss: 0.5, fade: 0.3, lastFlare: 0 }, m: { ramp1: '#8a3208', ramp2: '#ffc266', ramp3: '#fff0d2' } },
  henka: { p: { duration: 3.6, burn: 3.0 }, m: { stages: [[0, IGNITE_ORANGE], [0.5, '#3d6cff'], [1.15, '#ff2a1c'], [1.4, '#b44dff'], [1.65, '#eef2ff']] } },
  strobe: { p: { duration: 4.2, stars: 120, sparkRate: 0, headSize: 1.1, burn: 3.4, flicker: 0.1, lastFlare: 0, strobeHz: 11, strobeDuty: 0.3, strobeStart: 0.35 }, m: { stages: [[0, IGNITE_ORANGE], [0.5, '#eef2ff']] } },
  glitter: { p: { duration: 3.8, stars: 120, burn: 2.8, headBright: 0.7, sparkRate: 110, sparkLife: 1.0, sparkSpread: 1.5, sparkGrav: 1.4, glitter: 1, glitterDelay: 0.3, T0: 2250, cooling: 0.2 }, m: { ramp1: '#9a4a10', ramp2: '#ffd27a', ramp3: '#fffaf0' } },
  crackle: { p: { duration: 3.4, stars: 70, burn: 1.6, sparkRate: 40, sparkLife: 0.3, crackle: 18, crackleDelay: 0.35, lastFlare: 0 }, m: { ramp1: '#9a4a10', ramp2: '#ffe2a8', ramp3: '#ffffff' } },
  matsuba: { p: { duration: 3.0, stars: 130, burn: 2.2, sparkRate: 120, sparkLife: 0.5, sparkSpread: 4, branch: 3, branchAt: 0.5, T0: 2350, cooling: 0.45 }, m: { ramp1: '#9a4a10', ramp2: '#ffcf80', ramp3: '#fffaf0' } },
  crossette: { p: { duration: 3.2, stars: 26, v0: 110, burn: 0.85, burnJit: 5, subDelay: 0.85, subStars: 4, subSpeed: 34, subBurn: 1.3, subTail: 160, carrierTail: 170, subPattern: 'cross', headSize: 0.8, sparkLife: 0.5 }, m: { ramp1: '#8a3208', ramp2: '#ffc266', ramp3: '#fff0d2' } },
  ochiba: { p: { duration: 6, stars: 60, v0: 70, vt: 6, grav: 1, burn: 5.2, burnJit: 12, sparkRate: 0, headSize: 1.1, flicker: 0.4, flutter: 3, flutterHz: 0.7, lastFlare: 0, fade: 0.4 }, m: { stages: [[0, '#ffb45a'], [2.5, '#ff7a1e']] } },
  jisa: { p: { duration: 3.3, stars: 110, burn: 1.1, burnJit: 10, sparkRate: 0, headSize: 1.1, lastFlare: 0.2, ignDelay: 1.1, ignJit: 55 }, m: { stages: [[0, '#eef2ff']] } },
  ring: { p: { duration: 2.8, stars: 70, pattern: 'ring', dirJit: 0.6, sparkRate: 0, headSize: 1.3, burn: 2.2, tilt: 25 }, m: { stages: [[0, '#52ff5e']] } },
  saturn: { p: { duration: 2.9, stars: 130, pattern: 'saturn', dirJit: 0.6, sparkRate: 0, headSize: 1.2, burn: 2.3, tilt: 70, ringFrac: 0.45 }, m: { stages: [[0, '#3d6cff'], [1.2, '#eef2ff']] } },
  kata: { p: { duration: 2.7, stars: 90, pattern: 'heart', dirJit: 0.4, speedJit: 1, sparkRate: 0, headSize: 1.2, burn: 2.0, v0: 110 }, m: { stages: [[0, '#ff7ab8']] } },
  water: { p: { duration: 3.0, stars: 110, v0: 90, vt: 16, pattern: 'half', waterRefl: 0.4, burn: 2.0, sparkRate: 60, flash: 1.4 }, m: { stages: [[0, '#ffc766'], [0.9, '#52ff5e']] } },
  rise: { p: { duration: 5.2, riseH: 250, vtShell: 55, sparkRate: 600, sparkLife: 1.5, sparkSpread: 1.4, sparkInherit: 0.05, sparkDrag: 1.4, sparkSize: 0.45, sparkBright: 1.6, headSize: 1.4, headBright: 1.4, burn: 99, flicker: 0.35, T0: 2100, cooling: 0.3, zoom: 'off', form: 'unit', cols: 8, rows: 2, chans: 1, texW: 1024, texH: 1024 }, m: GROUND_RAMP },
  // 升空尾缀三档：长度 约 20 / 40 / 90 m，粗细 1 : 1.5 : 2.5，亮度 1 : 1.6 : 2.5，火星数 1 : 2 : 4；扭动 几乎直 / 轻微波浪 / 明显螺旋
  trailS: { p: { form: 'trail', riseH: 120, vtShell: 35, trV: 33.7, trInh: 0.12, trDrag: 2.8,
    trGrav: 0.4, trFRate: 1950, trFLife: 0.3168, trFSpread: 0.22758, trFSize: 0.0875, trFBright: 0.04,
    trMRate: 400, trMLife: 0.3125, trMSpread: 0.69231, trMSize: 0.1125, trMBright: 0.0355, trCRate: 260,
    trCLife: 0.6, trCSpread: 1.56, trCSize: 0.15625, trCBright: 0.1521, trWRate: 0, trHeadSize: 0.07168,
    trHeadBright: 0.84615, trHalo: 2.2, trHaloBright: 0.1, trTwist: 0.09113, trTwistN: 6, trWiggle: 0.04,
    trBright: 1, zoom: 'off', cols: 16, rows: 1, chans: 4, texW: 2048,
    texH: 2048, shutter: 0.6 },
    m: { stages: [[0, '#ffffff']], ramp0: '#ff8755', ramp1: '#ffbe6e', ramp2: '#ffeabb', ramp3: '#fff8ec' } },
  trailM: { p: { form: 'trail', riseH: 200, vtShell: 45, trV: 43.5, trInh: 0, trDrag: 3,
    trGrav: 0.25, trCool: 0.83333, trIgnite: 0.04, trFRate: 3900, trFLife: 0.8928, trFSpread: 0.455,
    trFSize: 0.19531, trFBright: 0.02692, trMRate: 1040, trMLife: 0.9, trMSpread: 0.6, trMSize: 0.15,
    trMBright: 0.03077, trCRate: 41.42, trCLife: 0.85, trCSpread: 1.69, trCSize: 0.25, trCBright: 0.169,
    trWRate: 0, trHeadSize: 0.128, trHeadBright: 0.92308, trHalo: 2.6, trHaloBright: 0.08888, trTwist: 0.25926,
    trTwistN: 5, trWiggle: 0.08, trBright: 1.6, zoom: 'off', cols: 16, rows: 1,
    chans: 4, texW: 2048, texH: 2048, shutter: 0.15 },
    m: { stages: [[0, '#ffffff']], ramp0: '#ffaa75', ramp1: '#ffe9b8', ramp2: '#ffecb9', ramp3: '#fff8ec' } },
  trailL: { p: { form: 'trail', riseH: 600, vtShell: 90, trV: 74.7, trInh: 0.22, trDrag: 1.76,
    trGrav: 0.3, trFRate: 7800, trFLife: 0.45, trFSpread: 0.8, trFSize: 0.375, trFBright: 0.0455,
    trMRate: 1230.8, trMLife: 0.8, trMSpread: 2.028, trMSize: 0.73242, trMBright: 0.08788, trCRate: 400,
    trCLife: 1.05, trCSpread: 1.8, trCSize: 0.425, trCBright: 0.13, trWRate: 260, trWLife: 0.14,
    trWSpread: 16, trWSize: 0.12, trWBright: 0.07, trHeadSize: 0.2816, trHeadBright: 0.8284, trHalo: 3.2,
    trHaloBright: 0.09876, trTwist: 2.295, trTwistN: 4, trWiggle: 0.45563, trBright: 2.5, zoom: 'off',
    cols: 16, rows: 1, chans: 4, texW: 2048, texH: 2048, shutter: 0.45 },
    m: { stages: [[0, '#ffffff']], ramp0: '#ff7c3a', ramp1: '#ffc069', ramp2: '#fff7bb', ramp3: '#fff8ec' } },
  fountain: { p: { duration: 1, loopT: 1, nozzles: 1, fanAngle: 0, jetSpeed: 26, jetCone: 11, jetDir: 90, sparkRate: 1600, sparkLife: 1.6, sparkDrag: 1.1, sparkSize: 0.22, T0: 2150, cooling: 0.5, headSize: 0.6, zoom: 'off', form: 'loop', cols: 8, rows: 4, chans: 1, texW: 2048, texH: 1024 }, m: GROUND_RAMP },
  falls: { p: { duration: 1.2, loopT: 1.2, nozzles: 14, spacing: 3, groundH: 18, jetSpeed: 4, jetCone: 25, jetDir: -80, sparkRate: 220, sparkLife: 2.6, sparkDrag: 0.9, sparkGrav: 1.1, sparkSize: 0.22, T0: 2100, cooling: 0.35, zoom: 'off', form: 'loop', cols: 8, rows: 4, chans: 1, texW: 2048, texH: 1024 }, m: GROUND_RAMP },
  wheel: { p: { duration: 0.8, loopT: 0.8, nozzles: 4, wheelR: 2.5, groundH: 8, headSize: 0.35, headBright: 0.45, jetSpeed: 24, jetCone: 6, sparkRate: 900, sparkLife: 0.9, sparkDrag: 1.2, sparkSize: 0.22, T0: 2250, cooling: 0.5, zoom: 'off', form: 'loop', cols: 8, rows: 4, chans: 1, texW: 2048, texH: 2048 }, m: GROUND_RAMP },
  fan: { p: { duration: 2, loopT: 2, nozzles: 7, fanAngle: 70, spacing: 1.5, shotRate: 3.5, shotSpeed: 75, cometBurn: 1.5, vt: 30, headSize: 1.2, sparkRate: 260, sparkLife: 0.8, sparkSpread: 1.6, sparkInherit: 0.1, sparkDrag: 2, sparkSize: 0.3, zoom: 'off', form: 'loop', cols: 8, rows: 8, chans: 1, texW: 2048, texH: 2048 }, m: GROUND_RAMP },
  barrage: { p: { duration: 2, loopT: 2, nozzles: 1, fanAngle: 8, shotRate: 3, shotSpeed: 90, cometBurn: 1.6, vt: 32, burstStars: 14, subSpeed: 22, subBurn: 0.9, headSize: 1.1, sparkRate: 220, sparkLife: 0.7, sparkSpread: 1.5, sparkInherit: 0.1, sparkDrag: 2, zoom: 'off', form: 'loop', cols: 8, rows: 8, chans: 1, texW: 2048, texH: 2048 }, m: { stages: [[0, '#ffffff']], ramp1: '#8a3208', ramp2: '#ffc266', ramp3: '#fff0d2' } },
  shikake: { p: { duration: 1, loopT: 1, text: '祭', pattern: 'text', stars: 260, spacing: 30, groundH: 10, headSize: 0.9, flicker: 0.5, sparkRate: 30, sparkLife: 0.9, sparkSpread: 0.6, sparkDrag: 1.5, sparkSize: 0.2, jetSpeed: 0.6, jetCone: 60, jetDir: -90, zoom: 'off', form: 'loop', cols: 4, rows: 4, chans: 1, texW: 2048, texH: 1024 }, m: { stages: [[0, '#ff7a1e']] } }
};
function defaultsFor(type) {
  const t = TYPES[type] || TYPES.kiku;
  const M = { ...MAT_BASE, ...t.m }; M.stages = (t.m.stages || MAT_BASE.stages).map(s => [...s]);
  return { P: { ...BASE, ...t.p, type }, M };
}
// 旧版颜色（colA → colB，chg 秒）换成分段
function normalizeM(M, type) {
  const d = defaultsFor(type || 'kiku').M, o = { ...d, ...M };
  if (!Array.isArray(o.stages) || !o.stages.length) {
    if (M && M.colA) o.stages = M.colA === M.colB || !(M.chg < 9) ? [[0, M.colA]] : [[0, M.colA], [M.chg, M.colB]];
    else o.stages = d.stages.map(s => [...s]);
  }
  delete o.colA; delete o.colB; delete o.chg;
  o.stages = o.stages.slice(0, 5).map(([t, c]) => [+t, c]).sort((a, b) => a[0] - b[0]); o.stages[0][0] = 0;
  return o;
}

// 号数（日本礼花规格，参考值）：开花直径、打上高度、星数、燃烧时间、星的终端速度、星头视觉大小
const SHELL_NO = [
  // 号, 直径 m, 高度 m, 星数, 燃烧 s, 终端速度 m/s, 星头 m
  [3, 60, 120, 60, 1.4, 17, 0.6], [4, 130, 160, 85, 1.7, 18, 0.8], [5, 170, 190, 110, 1.9, 19, 0.95],
  [6, 200, 220, 140, 2.1, 20, 1.05], [7, 220, 250, 170, 2.3, 21, 1.15], [8, 250, 280, 200, 2.5, 22, 1.25],
  [10, 320, 330, 280, 2.8, 24, 1.45], [12, 360, 380, 350, 3.1, 26, 1.6], [15, 420, 430, 450, 3.4, 28, 1.8],
  [20, 480, 500, 700, 3.9, 32, 2.1], [30, 550, 600, 1200, 4.5, 36, 2.5], [40, 780, 750, 2000, 5.2, 40, 3.0]
];
function shellRow(n) {
  let a = SHELL_NO[0], b = SHELL_NO[SHELL_NO.length - 1];
  for (let i = 0; i < SHELL_NO.length - 1; i++) if (n >= SHELL_NO[i][0] && n <= SHELL_NO[i + 1][0]) { a = SHELL_NO[i]; b = SHELL_NO[i + 1]; break; }
  const k = b[0] === a[0] ? 0 : clamp((n - a[0]) / (b[0] - a[0]), 0, 1);
  return a.map((v, i) => v + (b[i] - v) * k);
}
// 水平方向二次阻力：x(T) = ln(1 + c·v0·T) / c，反解 v0
const reachOf = (v0, vt, T) => { const c = G / (vt * vt); return Math.log(1 + c * v0 * T) / c; };
const v0For = (R, vt, T) => { const c = G / (vt * vt); return (Math.exp(c * R) - 1) / (c * T); };
// 以本花型默认值（约 5 号）为基准，按号数缩放
function applyShellNo(P, n) {
  const d = defaultsFor(P.type).P, fam = familyOf(P.type), r5 = shellRow(5), r = shellRow(n);
  P.shellNo = n;
  if (!n) return P;
  if (fam === 'rise') { P.riseH = Math.round(r[2]); P.headSize = +(d.headSize * r[6] / r5[6]).toFixed(2); return P; }
  if (fam !== 'aerial') return P;
  const kT = r[4] / r5[4], kR = r[1] / r5[1];
  P.vt = +(d.vt * r[5] / r5[5]).toFixed(1);
  P.burn = +(d.burn * kT).toFixed(2);
  if (P.type === 'senrin' || P.type === 'crossette') P.subDelay = +(d.subDelay * kT).toFixed(2);
  const T = P.type === 'senrin' || P.type === 'crossette' ? P.subDelay : P.burn;
  const R0 = reachOf(d.v0, d.vt, P.type === 'senrin' || P.type === 'crossette' ? d.subDelay : d.burn);
  P.v0 = Math.round(clamp(v0For(R0 * kR, P.vt, T), 20, 600));
  P.stars = Math.round(clamp(d.stars * r[3] / r5[3], 4, 3000));
  P.headSize = +(d.headSize * r[6] / r5[6]).toFixed(2);
  // 尾缀长度 ≈ 星速 × 火花可见时间；星速 ∝ 半径 / 燃烧时间，所以火花寿命跟燃烧时间同比例、火花密度跟星速同比例，
  // 这样号数变大时尾缀占花径的比例不变（旧版按 √ 缩放，号数越大尾缀相对越短）
  P.sparkLife = +(d.sparkLife * kT).toFixed(2);
  P.sparkRate = Math.round(d.sparkRate * kR / kT);
  P.sparkSize = +(d.sparkSize * Math.sqrt(r[6] / r5[6])).toFixed(2);
  P.duration = +(d.duration * kT).toFixed(2);
  P.riseH = Math.round(r[2]);
  // 大型礼花：开花闪光按比例减弱（否则头几帧过曝）；时长长，默认分两段各拿一张贴图，保证帧率
  if (n >= 20) { P.flash = +(d.flash * 0.6).toFixed(2); if (P.form === 'master') P.form = 'segments'; }
  return P;
}

// 滑杆：[键, 名称, 单位, 最小, 最大, 步长]；{ sel } 为下拉；{ text } 为文字
const isAir = P => familyOf(P.type) === 'aerial';
const isRise = P => familyOf(P.type) === 'rise';
const isGround = P => familyOf(P.type) === 'ground';
const hasComets = P => P.type === 'fan' || P.type === 'barrage';
const isTrail = P => familyOf(P.type) === 'rise' && P.form === 'trail';
const PATTERNS = [['sphere', '球'], ['half', '半球（贴水面）'], ['ring', '环'], ['saturn', '土星（球 + 环）'], ['heart', '心形'], ['smile', '笑脸'], ['star5', '五角星'], ['text', '文字']];
const RISE_STYLES = [['gold', '金色曲导'], ['silver', '银竜（银色长尾）'], ['dark', '暗升（无尾）'], ['kobana', '昇り小花'], ['bunpo', '分砲（空中分叉）'], ['fue', '笛（鸣笛）'], ['spiral', '螺旋']];
const SCHEMA = [
  { sec: '规格', show: P => !isTrail(P), items: [
    { sel: 'shellNo', label: '号数', options: [[0, '手动'], ...SHELL_NO.map(r => [r[0], r[0] === 40 ? '40 号（四尺玉）' : r[0] === 10 ? '10 号（尺玉）' : r[0] + ' 号'])], hint: '按号数自动推算初速、星数、燃烧时间、星头大小（以本花型默认值约 5 号为基准）' }
  ] },
  { sec: '开花与燃烧', show: isAir, items: [
    ['duration', '序列时长', 's', 0.8, 12, 0.05],
    ['seed', '随机种子', '', 1, 999, 1],
    ['stars', '星数', '颗', 4, 3000, 1],
    ['burstR0', '起始半径', 'm', 0, 300, 1],
    ['v0', '初速', 'm/s', 20, 600, 1],
    ['vt', '终端速度（阻力）', 'm/s', 4, 80, 0.5],
    ['grav', '重力倍率', '×', 0, 3, 0.05],
    ['speedJit', '初速离散', '%', 0, 20, 0.5],
    ['dirJit', '方向抖动', '°', 0, 15, 0.1],
    ['burn', '燃烧时间', 's', 0.2, 10, 0.05],
    ['burnJit', '消え口离散', '%', 0, 30, 0.1],
    ['fade', '渐隐比例', '', 0, 0.9, 0.01],
    ['lastFlare', '熄灭前闪亮', '', 0, 1.5, 0.05],
    ['flash', '开花闪光', '', 0, 3, 0.05]
  ] },
  { sec: '形状', show: P => isAir(P) || P.type === 'shikake', items: [
    { sel: 'pattern', label: '星的排布', options: PATTERNS, show: isAir },
    { sel: 'pattern', label: '图案', options: PATTERNS.filter(p => ['ring', 'heart', 'smile', 'star5', 'text'].includes(p[0])), show: P => P.type === 'shikake' },
    { text: 'text', label: '文字', show: P => P.pattern === 'text' },
    ['tilt', '倾斜', '°', 0, 89, 1, P => P.pattern !== 'sphere' && P.pattern !== 'half'],
    ['ringFrac', '环上星的比例', '', 0.1, 0.9, 0.01, P => P.pattern === 'saturn'],
    ['waterRefl', '水面倒影', '', 0, 1, 0.01, isAir]
  ] },
  { sec: '物理扰动', show: P => !isGround(P) && !isTrail(P), hint: '风与湍流：星和火花都受影响；GPU 火花用「发射点处的气流」做衰减偏移近似。', items: [
    ['wind', '风速（+ 向右）', 'm/s', -15, 15, 0.1],
    ['turb', '湍流强度', 'm/s', 0, 12, 0.1],
    ['turbScale', '湍流尺度', 'm', 5, 300, 1],
    ['massLoss', '燃烧减质量', '', 0, 0.9, 0.01, isAir],
    ['shellVx', '残余速度（水平）', 'm/s', -30, 30, 0.5, isAir],
    ['shellVy', '残余速度（竖直）', 'm/s', -30, 30, 0.5, isAir],
    ['shellSpin', '玉体自旋', 'rad/s', 0, 80, 0.5, isAir]
  ] },
  { sec: '星效果', show: isAir, hint: '可叠加在任何花型上。松叶分叉只在 GPU 内核里有。', items: [
    ['ignDelay', '延时点火', 's', 0, 3, 0.01],
    ['ignJit', '点火离散', '%', 0, 100, 1],
    ['strobeHz', '点灭频率（0 关）', 'Hz', 0, 30, 0.1],
    ['strobeDuty', '点灭亮占比', '', 0.05, 0.9, 0.01, P => P.strobeHz > 0],
    ['strobeStart', '点灭开始', '×燃烧', 0, 1, 0.01, P => P.strobeHz > 0],
    ['glitter', '辉星（延迟闪光火花）', '', 0, 1, 0.01],
    ['glitterDelay', '辉星闪光延迟', 's', 0.05, 1.5, 0.01, P => P.glitter > 0],
    ['crackle', '爆裂（每颗星）', '粒', 0, 40, 1],
    ['crackleDelay', '爆裂延迟', 's', 0.05, 1, 0.01, P => P.crackle > 0],
    ['branch', '松叶分叉（每粒火花）', '支', 0, 4, 1],
    ['branchAt', '分叉时刻', '×寿命', 0.1, 0.9, 0.01, P => P.branch > 0],
    ['flutter', '飘落摆动', 'm/s', 0, 10, 0.1],
    ['flutterHz', '摆动频率', 'Hz', 0.1, 3, 0.05, P => P.flutter > 0]
  ] },
  { sec: '炭头（星头）', show: P => !isTrail(P), items: [
    ['headSize', '炭头大小', 'm', 0.15, 6, 0.05],
    ['headBright', '炭头亮度', '×', 0, 3, 0.05],
    ['flicker', '闪烁强度', '', 0, 1, 0.01]
  ] },
  { sec: '尾缀（炭火火花）', show: P => !isTrail(P), hint: '尾缀粗细主要由「散布」和「颗粒大小」决定，长度由「火花寿命」决定。', items: [
    ['sparkRate', '火花密度', '个/秒', 0, 3000, 1],
    ['sparkRateEnd', '末段火花密度', '×', 0, 2, 0.01],
    ['sparkLife', '火花寿命', 's', 0.05, 4, 0.01],
    ['sparkSpread', '尾缀粗细（散布）', 'm/s', 0, 15, 0.1],
    ['sparkSize', '颗粒大小', 'm', 0.05, 2, 0.01],
    ['sparkInherit', '跟随星体', '', 0, 1, 0.01],
    ['sparkDrag', '火花阻力', '1/s', 0, 8, 0.05],
    ['sparkGrav', '火花下坠', '×', 0, 3, 0.05],
    ['T0', '初始温度', 'K', 1500, 2800, 10],
    ['cooling', '冷却速度', '', 0, 0.8, 0.01],
    ['sparkBright', '火花亮度', '×', 0, 3, 0.05],
    ['twinkle', '火花闪烁', '', 0, 1, 0.01]
  ] },
  { sec: '千轮 / 分裂', show: P => P.type === 'senrin' || P.type === 'crossette', items: [
    { sel: 'subPattern', label: '子星排布', options: [['sphere', '小球（千轮）'], ['cross', '十字（分裂）']] },
    ['subDelay', '子花开花时刻', 's', 0.2, 3, 0.01],
    ['subJit', '开花时刻离散', '%', 0, 40, 0.5],
    ['subStars', '每朵子花星数', '颗', 2, 120, 1],
    ['subSpeed', '子花初速', 'm/s', 5, 120, 1],
    ['subBurn', '子花燃烧时间', 's', 0.2, 3, 0.05],
    ['subTail', '子花火花密度', '个/秒', 0, 400, 1],
    ['carrierTail', '子弹尾迹密度', '个/秒', 0, 400, 1]
  ] },
  { sec: '蜂', show: P => P.type === 'hachi', items: [
    ['spin', '旋转速度', 'rad/s', 0, 40, 0.5],
    ['chaos', '乱飞程度', '', 0, 3, 0.05],
    ['beeSpeed', '推进速度', 'm/s', 5, 80, 1]
  ] },
  { sec: '上升', show: isRise, hint: '模拟从地面到开花高度的整段上升。导出默认是「星头循环 + 弹道拟合 + 火花发射器参数」。', items: [
    { sel: 'riseStyle', label: '曲导种类', options: RISE_STYLES, show: P => !isTrail(P) },
    ['riseH', '开花高度', 'm', 50, 800, 5],
    ['vtShell', '弹体终端速度', 'm/s', 20, 120, 1],
    ['seed', '随机种子', '', 1, 999, 1, P => !isTrail(P)],
    ['wobble', '摆动幅度', 'm/s', 0, 30, 0.1, P => !isTrail(P)],
    ['wobbleHz', '摆动频率', 'Hz', 0.2, 6, 0.05, P => !isTrail(P)],
    ['kobanaN', '小花数量', '朵', 1, 12, 1, P => P.riseStyle === 'kobana' && !isTrail(P)],
    ['bunpoN', '分叉数量', '支', 2, 6, 1, P => P.riseStyle === 'bunpo' && !isTrail(P)]
  ] },
  { sec: '尾缀序列 · 形态', show: isTrail, hint: '弹体随体坐标：星头在面片上端，火花向后拖成尾迹。火花按周期性编号发射，第 64 帧与第 0 帧逐像素相同（真循环）。', items: [
    ['trV', '上升速度（烘焙时）', 'm/s', 10, 150, 0.5],
    ['trInh', '火花跟随弹体', '', 0, 0.8, 0.01],
    ['trDrag', '火花阻力', '1/s', 0.3, 10, 0.05],
    ['trGrav', '火花下坠', '×', 0, 2, 0.01],
    ['trCool', '冷却快慢', '×', 0.3, 2, 0.01],
    ['trIgnite', '火花燃旺时间', 's', 0, 0.6, 0.005],
    ['trTwist', '螺旋扭动幅度', 'm', 0, 6, 0.01],
    ['trTwistN', '每个循环扭几圈', '圈', 1, 8, 1],
    ['trWiggle', '细碎抖动', 'm', 0, 1, 0.01],
    ['trTwistLag', '扭动滞后（星头走直线，火花离开后多久漂到波形上）', 's', 0, 1.5, 0.01],
    ['trFollow', '快门跟拍（1 = 火星拖成短竖线，像跟拍的实拍；0 = 固定机位，火星是圆点）', '', 0, 1, 1],
    ['seed', '随机种子', '', 1, 999, 1]
  ] },
  { sec: '尾缀序列 · 星头', show: isTrail, items: [
    ['trHeadSize', '星头大小', 'm', 0.03, 2, 0.01],
    ['trHeadBright', '星头亮度', '×', 0, 4, 0.05],
    ['trHalo', '光晕大小（× 星头）', '×', 1, 8, 0.1],
    ['trHaloBright', '光晕亮度', '×', 0, 1, 0.01]
  ] },
  { sec: '尾缀序列 · 火花（四层）', show: isTrail, hint: '白热细火花 = 星头后面连续的白亮段；金色火星 = 中段的团块；橙色大火星 = 末段一颗颗的点；星头丝火花 = 大型礼花星头周围甩出的细丝。长度 ≈ 上升速度 × 寿命，粗细看散布和颗粒大小。', items: [
    ['trFRate', '白热细火花 · 密度', '个/秒', 0, 20000, 10], ['trFLife', '白热细火花 · 寿命', 's', 0.03, 2, 0.01], ['trFSpread', '白热细火花 · 散布', 'm/s', 0, 6, 0.01], ['trFSize', '白热细火花 · 颗粒', 'm', 0.02, 1, 0.005], ['trFBright', '白热细火花 · 亮度', '×', 0, 0.5, 0.001],
    ['trMRate', '金色火星 · 密度', '个/秒', 0, 8000, 10], ['trMLife', '金色火星 · 寿命', 's', 0.05, 3, 0.01], ['trMSpread', '金色火星 · 散布', 'm/s', 0, 8, 0.01], ['trMSize', '金色火星 · 颗粒', 'm', 0.02, 1, 0.005], ['trMBright', '金色火星 · 亮度', '×', 0, 0.5, 0.001],
    ['trCRate', '橙色大火星 · 密度', '个/秒', 0, 3000, 5], ['trCLife', '橙色大火星 · 寿命', 's', 0.05, 4, 0.01], ['trCSpread', '橙色大火星 · 散布', 'm/s', 0, 10, 0.01], ['trCSize', '橙色大火星 · 颗粒', 'm', 0.02, 1.5, 0.005], ['trCBright', '橙色大火星 · 亮度', '×', 0, 1, 0.001],
    ['trWRate', '星头丝火花 · 密度（0 关）', '个/秒', 0, 3000, 5], ['trWLife', '星头丝火花 · 寿命', 's', 0.03, 0.6, 0.01], ['trWSpread', '星头丝火花 · 速度', 'm/s', 0, 40, 0.1], ['trWSize', '星头丝火花 · 颗粒', 'm', 0.02, 0.5, 0.005], ['trWBright', '星头丝火花 · 亮度', '×', 0, 0.5, 0.001]
  ] },
  { sec: '尾缀序列 · 引擎', show: isTrail, hint: '循环 64 帧（30 fps，2.13 s）；消散两个版本：30 fps（2.13 s）与 20 fps（3.2 s），都是 64 帧。贴图 2048×2048、16 列 × 1 行、单格 128×2048、RGBA 接力。', items: [
    ['trBright', '引擎亮度倍数（Color Over Life）', '×', 0.2, 5, 0.05],
    { sel: 'trExport4K', label: '导出 4K 母版', options: [[1, '同时导出 4096×4096'], [0, '只导出 2K']] }
  ] },
  { sec: '地面 · 循环', show: isGround, hint: '循环周期内的火花按周期性编号生成，首尾严格接上，不需要交叉淡化。', items: [
    ['loopT', '循环周期', 's', 0.3, 4, 0.05],
    ['seed', '随机种子', '', 1, 999, 1],
    ['nozzles', P => P.type === 'shikake' ? '（无）' : '喷口数', '个', 1, 24, 1, P => P.type !== 'shikake'],
    ['spacing', P => P.type === 'shikake' ? '图案宽度' : '喷口间距', 'm', 0.5, 80, 0.5, P => ['falls', 'fan', 'shikake', 'fountain'].includes(P.type)],
    ['groundH', '离地高度', 'm', 0, 60, 0.5, P => ['falls', 'wheel', 'shikake'].includes(P.type)],
    ['wheelR', '转轮半径', 'm', 0.5, 10, 0.1, P => P.type === 'wheel'],
    ['jetSpeed', '喷射速度', 'm/s', 0, 80, 0.5, P => !hasComets(P)],
    ['jetCone', '喷射散角', '°', 0, 90, 0.5, P => !hasComets(P)],
    ['jetDir', '喷射方向', '°', -90, 90, 1, P => ['fountain', 'falls'].includes(P.type)],
    ['fanAngle', '扇面角度', '°', 0, 160, 1, P => hasComets(P) || P.type === 'fountain'],
    ['shotRate', '发射频率', '发/秒', 0.5, 20, 0.1, hasComets],
    ['shotSpeed', '彗星初速', 'm/s', 10, 200, 1, hasComets],
    ['cometBurn', '彗星燃烧', 's', 0.2, 4, 0.05, hasComets],
    ['vt', '彗星终端速度', 'm/s', 5, 80, 0.5, hasComets],
    ['burstStars', '末端小花星数', '颗', 0, 40, 1, hasComets],
    ['subSpeed', '小花初速', 'm/s', 5, 80, 1, P => hasComets(P) && P.burstStars > 0],
    ['subBurn', '小花燃烧', 's', 0.2, 3, 0.05, P => hasComets(P) && P.burstStars > 0]
  ] },
  { sec: '取帧（导出）', show: P => !isTrail(P), hint: '帧号由 Dynamic Parameter 第三通道给出、不做帧间混合。自动取帧把帧集中在运动快的开花初期，同时保证整段不低于最低帧率。', items: [
    ['fpsFloor', '最低帧率', 'fps', 8, 60, 1, P => !isGround(P)],
    ['shutter', '运动模糊（快门）', '', 0, 1, 0.01],
    ['segAt', '分段时刻（0 = 自动）', 's', 0, 12, 0.05, P => P.form === 'segments'],
    ['unitElev', '代表星仰角', '°', -60, 60, 1, P => P.form === 'unit' && isAir(P)],
    ['cellPad', '格子留边', 'px', 0, 8, 1]
  ] }
];
