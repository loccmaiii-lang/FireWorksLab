// =====================================================================
//  花型与参数
// =====================================================================
const VERSION = '4.5.10';     // 4.4.0 包含 4.3.8（对话框17）；4.4.2 单层导出方案；4.4.3 静态检查进构建、火花闪烁频率；4.4.4 点灭光点方波；4.4.5 升空尾缀 RT5 选项；4.5.0 工作台快改（不改画面）；4.5.1 升空尾缀 RT6 近段 + 远段 + GPU 预算；4.5.2 升空尾缀分层看；4.5.3 远段上移速度、出点提示、左栏精简；4.5.4 尾缀曲线精简、标准检查认远段；4.5.5 多层花型模板（对话框新花型，只加不改）；4.5.9 缩略图换成示意图、多层模板第 13 个（对话框新花型）；4.5.10 = 原定 4.5.8 的九处 bug + 五条小修（对话框15；4.5.9 已被对话框新花型先发）
// 影响产物的烘焙器输出版本（按产物种类）：取景、格子、命名、编码规则改了就升这一种的号 → 旧导出、旧标准检查在「待我验收」里算过期（用户 2026-10-02 23:34「按证据把关」）
// master = 大面片 / 分段（4.2.3 Zoom 逐帧阶梯、4.2.5 取景按实测收紧、4.2.7 收紧受过曝 / 空帧约束）；emitset = 循环层 + 粒子（4.2.2）
// 4.3：尾缀 V5（trail）、地面循环（loop）、上升循环（riseLoop）从 3.7 画法换到现在的画法，贴图变了 → 升号
const OUTPUT_VER = { master: '4.3.3', emitset: '4.4',     // 4.4：升空尾缀（循环层 + 粒子）循环层 / 消散面片同样全长（不再 Size By Life 压短）、循环层出场淡入
   riseLoop: '4.3', trail: '4.3', unit: '4.3', loop: '4.3',
   dots: '4.4.4' };     // dots = 导出成 GPU 光点的层（不是烘焙种类，另加一档）：4.4.4 点灭（strobeHz > 0）的光点 Color Over Life 改成亮灭方波；4.3.3：大面片开花闪光改成柔光（开头几帧变了）→ master 4.3.3；4.3：所有产物都要用 4.3 重新导出（只剩一个渲染核；固定取景用 Pivot 对齐爆点；碰边放大；单束补第二段、随机、风；尾缀末段爆亮颜色键）
// 家族：aerial = 空中开花（大面片或单元序列）；rise = 上升段；ground = 地面循环类
const TYPE_INFO = {
  blank: ['空白发射器', 'Blank', 'aerial'],
  kiku: ['菊', 'Kiku', 'aerial'], botan: ['牡丹（芯）', 'Botan', 'aerial'], kamuro: ['锦冠', 'Kamuro', 'aerial'], yanagi: ['柳', 'Yanagi', 'aerial'],
  senrin: ['千轮', 'Senrin', 'aerial'], hachi: ['蜂', 'Hachi', 'aerial'], palm: ['椰子', 'Palm', 'aerial'], henka: ['变色菊（5 段）', 'Henka', 'aerial'],
  strobe: ['点灭星', 'Strobe', 'aerial'], glitter: ['辉星', 'Glitter', 'aerial'], crackle: ['爆裂星', 'Crackle', 'aerial'], matsuba: ['松叶', 'Matsuba', 'aerial'],
  crossette: ['分裂（十字）', 'Crossette', 'aerial'], ochiba: ['落叶', 'Ochiba', 'aerial'], jisa: ['时差（延时点火）', 'Jisa', 'aerial'],
  ring: ['环', 'Ring', 'aerial'], saturn: ['土星', 'Saturn', 'aerial'], kata: ['型物', 'Kata', 'aerial'], water: ['水中花火', 'Water', 'aerial'],
  rise: ['上升（曲导）', 'Rise', 'rise'],
  physS: ['升空尾缀 · 物理 小', 'PhysTrailS', 'rise'], physM: ['升空尾缀 · 物理 中', 'PhysTrailM', 'rise'], physL: ['升空尾缀 · 物理 大', 'PhysTrailL', 'rise'],
  tailS: ['升空尾缀 · 循环层 + 粒子 小', 'RiseTailS', 'rise'], tailM: ['升空尾缀 · 循环层 + 粒子 中', 'RiseTailM', 'rise'], tailL: ['升空尾缀 · 循环层 + 粒子 大', 'RiseTailL', 'rise'],
  trailS: ['升空尾缀 · 小（V5）', 'TrailS', 'rise'], trailM: ['升空尾缀（V5）', 'TrailM', 'rise'], trailL: ['升空尾缀 · 大（V5）', 'TrailL', 'rise'],
  fountain: ['喷泉', 'Fountain', 'ground'], falls: ['瀑布', 'Falls', 'ground'], wheel: ['转轮', 'Wheel', 'ground'],
  fan: ['扇形', 'Fan', 'ground'], barrage: ['连发', 'Barrage', 'ground'], shikake: ['仕掛け（文字/图案）', 'Shikake', 'ground']
};
const TYPE_GROUPS = [
  ['从零搭', ['blank']],     // 4.3（需求重梳 2026-10-03 第 6 条）：空白发射器，只有星，其余模块按需「+ 添加模块」
  ['礼花', ['kiku', 'botan', 'kamuro', 'yanagi', 'senrin', 'hachi', 'palm', 'henka']],
  ['效果星', ['strobe', 'glitter', 'crackle', 'matsuba', 'crossette', 'ochiba', 'jisa']],
  ['形状', ['ring', 'saturn', 'kata', 'water']],
  ['升空尾缀', ['trailM']],      // 4.3（清理清单 A6）：上升 / 尾缀的 10 个模板合成一个入口（V5 形式），小 / 中 / 大在「尾缀序列 · 形态」里切；其余形式的定义留着（RT4 等条目要用）
  ['地面 · 循环', ['fountain', 'falls', 'wheel', 'fan', 'barrage', 'shikake']]
];
const FAMILY_LABEL = { aerial: '礼花', rise: '升空尾缀', ground: '地面 · 循环' };
const TYPE_NAMES = Object.fromEntries(Object.entries(TYPE_INFO).map(([k, v]) => [k, v[0]]));
const TYPE_EN = Object.fromEntries(Object.entries(TYPE_INFO).map(([k, v]) => [k, v[1]]));
const familyOf = t => (TYPE_INFO[t] || TYPE_INFO.kiku)[2];
// 空白发射器能加的模块：add = 加上时填的值（按菊的模板，加了马上看得到），off = 去掉时恢复成不起作用的值
const BLANK_MODS = {
  '火花': { add: { sparkRate: 95 }, off: { sparkRate: 0, emberFrac: 0 }, what: '星烧的时候喷出的火花（子发射器）：生成率、寿命、继承速度、阻力、大小、亮度' },
  '尾迹外形': { needs: '火花', add: {}, off: { tailJit: 0, tailShoulder: 0, tailWidth: 1, tailPinchHead: 0, tailPinchTail: 0, tailBellyAt: 0.45, headTear: 0, tailDiffuse: 0, sparkRise: 0, starBright: 0, tailHaze: 0 }, what: '火花连成的尾迹：粗细、收尖、亮肩、线间底光、扩散' },
  '烟花特性': { add: {}, off: { strobeHz: 0, glitter: 0, crackle: 0, branch: 0, flutter: 0, emberFrac: 0 }, what: '点灭、辉星、爆裂、松叶分叉、飘落、余烬（加了以后各项默认 0，拨哪项开哪项）' },
};
const isBlank = P => !!P && P.type === 'blank';
const blankHas = (P, mod) => !isBlank(P) || !BLANK_MODS[mod] || (P.mods || []).includes(mod);
function blankAddModule(P, mod) {
  const d = BLANK_MODS[mod]; if (!isBlank(P) || !d || (P.mods || []).includes(mod)) return false;
  if (d.needs && !(P.mods || []).includes(d.needs)) blankAddModule(P, d.needs);
  P.mods = [...(P.mods || []), mod]; Object.assign(P, d.add); return true;
}
function blankRemoveModule(P, mod) {
  const d = BLANK_MODS[mod]; if (!isBlank(P) || !d || !(P.mods || []).includes(mod)) return false;
  for (const [m, x] of Object.entries(BLANK_MODS)) if (x.needs === mod) blankRemoveModule(P, m);
  P.mods = (P.mods || []).filter(m => m !== mod); Object.assign(P, d.off); return true;
}

const BASE = {
  renderVer: 40,
  exposure: 1, exposureLock: 0, exposureTarget: .96, coreProfile: 0, haloFrac: .22, haloR: 3, previewBloom: 0,
  trimTail: 1,
  mods: [],     // 空白发射器加了哪些模块（别的花型不用）
  duration: 3.2, seed: 7, stars: 150, burstR0: 0, v0: 150, vt: 18, grav: 1, speedJit: 3, dirJit: 1.5,
  burn: 2.5, burnJit: 12, fade: 0.2, lastFlare: 0.35, flash: 1, flashSize: 1,
  outPC: 'seq', outMobile: 'seq', dotSize: 1, dotBright: 1,     // 4.4.2：单层效果的导出方案（多层效果在层页头选，存在层上 L.out / L.dotSize / L.dotBright）
  endMode: 'fade', coolMode: 0,     // 4.4：结尾 / 火花冷却的开关，缺省 = 以前的做法（现有效果、导出都不变）
  headSize: 1.0, headBright: 1, flicker: 0.25,
  sparkRate: 95, sparkRateEnd: 1, sparkStop: 0, sparkStart: 0, sparkRamp: 0, sparkRampJit: 30, sparkLife: 0.55, sparkLifeEnd: 1, sparkLifeJit: 45, sparkSize: 0.35, sparkSpread: 2.5, sparkInherit: 0.2, sparkDrag: 2.2, sparkGrav: 1,
  T0: 2050, cooling: 0.42, sparkBright: 1, twinkle: 0.6, twinkleHz: 0,
  subDelay: 0.9, subJit: 10, subStars: 36, subSpeed: 40, subBurn: 0.9, subTail: 0, carrierTail: 30, subPattern: 'sphere',
  spin: 14, chaos: 0.8, beeSpeed: 28,
  // 物理
  shellNo: 0, wind: 0, turb: 0, turbScale: 60, massLoss: 0, shellVx: 0, shellVy: 0, shellSpin: 0,
  // 形状
  pattern: 'sphere', tilt: 0, ringFrac: 0.45, text: '祭', waterRefl: 0,
  // 星效果
  ignDelay: 0, ignJit: 10, ignSeed: 0, keepFrac: 1, afterBurn: 0, afterJit: 15, headDim: 1, headDimUntil: 0,
  emberFrac: 0, emberLife: 3, emberBright: 0.1, emberFollow: 0, emberSize: 1, emberAll: 0, emberEnd: 0,
  carrierHead: 0.4, subKeep: -1, subSpeedJit: -1, trimLead: 1, tailJit: 0, tailShoulder: 0, tailWidth: 1, tailPinchHead: 0, tailPinchTail: 0, tailBellyAt: 0.45, headTear: 0, tailDiffuse: 0, tailDiffuseScale: 20, sparkRise: 0, starBright: 0, tailHaze: 0, tailHazeR: 6, frameCount: 24, outPack: 'grid', outCell: 0, cutIn: 0, cutOut: 0, preRoll: 1, preFrom: -1, visTo: 0, preScale0: 0, prePivot: 0, subScaleJit: 0, subVt: 0, subGrav: -1, subFlash: -1,
  strobeHz: 0, strobeDuty: 0.35, strobeStart: 0.4, glitter: 0, glitterDelay: 0.25,
  crackle: 0, crackleDelay: 0.3, crackleR: 3.5, crackleV: 0, branch: 0, branchAt: 0.45, flutter: 0, flutterHz: 0.7,
  // 上升
  riseH: 250, vtShell: 55, riseStyle: 'gold', wobble: 0, wobbleHz: 1.6, kobanaN: 4, bunpoN: 3,
  // 升空尾缀序列（上升产物「尾缀序列」）：弹体随体坐标里的星头 + 多层火花，周期性发射（真循环），开花后消散
  trV: 43.5, trFps: 30, trInh: 0.1, trDrag: 3, trGrav: 0.3, trCool: 1,
  trFRate: 2600, trFLife: 0.6, trFSpread: 0.45, trFSize: 0.1, trFBright: 0.03,
  trMRate: 600, trMLife: 0.75, trMSpread: 0.8, trMSize: 0.14, trMBright: 0.05,
  trCRate: 60, trCLife: 0.9, trCSpread: 1.2, trCSize: 0.18, trCBright: 0.12,
  trWRate: 0, trWLife: 0.12, trWSpread: 14, trWSize: 0.06, trWBright: 0.06,
  trHeadSize: 0.26, trHeadBright: 1.2, trHeadExpo: 1, trHalo: 3, trHaloBright: 0.15,     // trHeadExpo：星头相对火花的曝光（4.3：3.7 的星头、火花各自曝光，迁到一个固定曝光后靠它保持原来的比例；不在面板上）
  trTwist: 0.35, trTwistN: 5, trWiggle: 0.08, trTwistLag: 0.35, trFollow: 0, trBright: 1.6, trExport4K: 1, trIgnite: 0, trPhys: 0,
  // 升空尾缀 · 循环层 + 粒子发射器（产物 form 'emitset'，47_risetail.js；原理 analysis/原理/升空尾缀.md 第 7c–7e 节）。默认值 = 中档
  rtH: 265, rtT: 5, rtVb: 16, rtLean: 0, rtD: 0.14, rtBurstD: 190,
  rtSpin: 2.0, rtSpinPh: 0, rtFling: 3.0, rtJet: 27, rtCone: 2.5, rtPulse: 0.2, rtPulseHz: 6,
  rtHeadSize: 0.55, rtHeadI: 3, rtHeadFl: 0.8, rtHeadFlI: 0.6,
  rtARate: 10000, rtALife: 0.7, rtALsig: 0.35, rtAJet: 33, rtAKd: 14, rtACone: 0.6, rtASize: 0.22, rtAI: 0.5, rtAWarm: 1.2,
  rtFRate: 2500, rtFLife: 0.9, rtFJit: 40, rtFSize: 0.25, rtFI: 2.6, rtFKd: 5,
  rtMRate: 900, rtMLife: 1.5, rtMJit: 35, rtMSize: 0.38, rtMI: 4.0, rtMKd: 3.6,
  rtCRate: 180, rtCLife: 2.4, rtCJit: 30, rtCSize: 0.55, rtCI: 6.0, rtCKd: 2.4,
  rtFdT: 0, rtMdT: 0, rtCdT: 0, rtSizeJit: 25, rtKdJit: 20, rtConeSoft: 0,
  rtStreakT: 0, rtStreakMax: 6, rtFStreak: 1, rtMStreak: 1, rtCStreak: 1, rtTurb: 0, rtTurbL: 30, rtTurbS: 0,
  rtT0: 2450, rtTb: 2150, rtTc: 0.35, rtTend: 1450, rtTw: 0.3, rtShrink: 0.5,
  rtERate: 10, rtELife: 3, rtESize: 0.8, rtEI: 4, rtEKd: 1.0,
  rtSmoke: 0.003, rtSmokeRate: 25, rtSmokeLife: 3.5, rtSmokeSize: 2.5, rtSmokeGrow: 4,
  rtBright: 1, rtDotGain: 1, rtMobile: 0.2, rtDissolve: 1, rtFadeFps: 0,
  // 4.2.2（第 4 版）：细火星烘进循环层贴图的比例和贴图亮度；引擎里加的星头光晕 / 末段爆亮 / 发射口；格子（0 自动）、手机贴图边长比例。默认关 = 旧条目效果不变
  rtFTex: 0, rtTexI: 10, rtGlow: 0, rtGlowSize: 4, rtPopRate: 0, rtPopI: 20, rtPopSize: 0.5, rtPopAt: 0.85,
  rtLaunch: 0, rtLaunchSize: 8, rtLaunchN: 0, rtLaunchV: 30, rtLaunchCone: 20, rtLaunchI: 8, rtGrid: 0, rtMobileTex: 0.5,
  // 4.4.5（RT5）：物理弹道、循环层长度跟尾迹、GPU 兼容（UE 4.24）、中火花进贴图、贴图火花亮度口径（H4）、GPU 粒子上限。缺省 = 旧做法（RT1–RT4 不变）
  rtBall: 0, rtVt: 0, rtLoopSize: 0, rtLoopMin: 0.25, rtGpuSafe: 0, rtMTex: 0, rtTexCal: 0, rtGpuMax: 0,
  // 4.5.1（RT6，用户 10-05 01:28「合并渲染再加 800 个 cascade 粒子」、02:25 同意「近段 + 远段 + 800 GPU」）：近段循环（年轻）+ 远段全程序列（年老，世界坐标）+ GPU 按档预算；缺省关 = RT5 不变
  rtFar: 0, rtNearA0: 0.6, rtNearA1: 1.0, rtGpuF: 150, rtGpuM: 200, rtGpuC: 300, rtGpuTw: 0.8, rtGpuDisp: 0, rtGpuGain: 1, rtNearExpo: 1, rtFarVz: 0.5,
  // 地面循环
  loopT: 1, nozzles: 1, fanAngle: 70, spacing: 6, shotRate: 3, shotSpeed: 70, cometBurn: 1.4, burstStars: 0,
  wheelR: 3, jetSpeed: 28, jetCone: 10, jetDir: 90, groundH: 0,
  // 取帧与输出
  shutter: 0.6, fpsFloor: 24,
  // 4.0 帧预算（31_plan40.js）：开花段 / 燃烧段 / 淡出段帧率（引擎 30 fps 下按整数 tick 持帧），淡出起点 0 = 自动；贴图张数上限 0 = 不限
  // 默认按运动分配、先放进 1 张（用户 2026-10-01 实测：4.56 s 的金芒菊放一张 4×4×RGBA 在游戏里就流畅）：开花段每 tick 一帧，
  // 慢下来每帧多停几个 tick（最多 maxHold 个），放不下才自动加张。三档帧率 / 全程 30 fps 是可选的预算方式。
  frameBudget: 'motion', pageTarget: 1, maxHold: 4, maxHoldBurn: 3,
  fpsBurst: 30, burstSec: 0.5, fpsActive: 15, fpsFade: 10, fadeAt: 0, maxPages: 0, fitPages: 1,
  qSS: 2, qHz: 300, qMaxSub: 16,   // 画质（05_quality.js）
  texW: 2048, texH: 2048, cols: 8, rows: 8, chans: 4, outMode: 'combined', encGamma: 1, frameMode: 'auto', zoom: 'on', engine: 'gpu',
  form: 'master', unitElev: 0, unitFlip: 0, cellPad: 2, autoGrid: 1
};
const RAMP_POS = [0, 0.3, 0.65, 1];
// 颜色：stages = [[时刻 s, 颜色], …]，最多 5 段；xw = 变色过渡时长
const MAT_BASE = { stages: [[0, '#ffffff']], xw: 0.08, ramp0: '#000000', ramp1: '#7a1e04', ramp2: '#ffa53a', ramp3: '#fff3dc', headInt: 1, tailInt: 1 };
// 焰色预设（sRGB）：按常见发色剂
const FLAME = [
  ['锶红', '#ff2a1c'], ['钙橙', '#ff7a1e'], ['钠黄', '#ffc53a'], ['钡绿', '#52ff5e'], ['铜蓝', '#3d6cff'],
  ['紫（锶+铜）', '#b44dff'], ['银白（镁铝）', '#eef2ff'], ['金（炭）', '#ffb45a'], ['粉', '#ff7ab8'],
  ['洋红', '#ff3cc8'], ['青绿', '#30ffd8'], ['柠檬', '#e6ff3a']
];
const IGNITE_ORANGE = '#ff8a2e';
const GROUND_RAMP = { ramp1: '#8a3208', ramp2: '#ffc266', ramp3: '#fff0d2' };
const TYPES = {
  // 空白发射器：只有星（发射器、生成、寿命、形状、初速、阻力重力、星头）；火花、尾迹外形、烟花特性没加之前不起作用（火花生成率 0、特性全 0）
  blank: { p: { stars: 60, sparkRate: 0, emberFrac: 0, lastFlare: 0, flash: 0.6, burnJit: 8, mods: [] }, m: { stages: [[0, '#ffd797']] } },
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
  // 升空尾缀 · 循环层 + 粒子（原理 7e 的三档：小 ≈ 比十寸更直、中 ≈ 十寸、大 ≈ 用户图 1）
  tailS: { p: { rtGpuSafe: 1, renderVer: 40, form: 'emitset', texW: 2048, texH: 2048, cols: 16, rows: 1, chans: 4, outMode: 'combined', encGamma: 1, frameMode: 'uniform', zoom: 'off', engine: 'gpu', autoGrid: 0, cellPad: 2, shutter: 0.5, exposure: 0.45, rtBright: 4, haloFrac: 0.04, haloR: 2, seed: 7, rtH: 190, rtT: 3.5, rtVb: 24, rtD: 0.10, rtBurstD: 110, rtSpin: 1.6, rtFling: 2.0,
    rtHeadSize: 0.45, rtHeadI: 3, rtHeadFl: 0.6, rtARate: 9000, rtALife: 0.6,
    rtCone: 5.5, rtFRate: 2400, rtFLife: 0.7, rtFSize: 0.13, rtMRate: 850, rtMLife: 1.1, rtMSize: 0.2, rtCRate: 150, rtCLife: 1.8, rtCSize: 0.28,
    rtERate: 3, rtELife: 2.5, rtESize: 0.7,
    // 第 2 / 3 版（对话框11，10-02：RT2 火星数量大小 + RT3 白黄对比、线状拖影、空气乱流）
    rtACone: 5, rtASize: 0.42, rtAI: 1.1, rtAWarm: 0.8, rtFI: 5, rtMI: 10, rtCI: 24, rtCKd: 1.8, rtT0: 2700, rtTb: 2450, rtEKd: 2.5, rtSmoke: 0, rtMobile: 0.12, rtFdT: -400, rtCdT: 500, rtSizeJit: 45, rtKdJit: 35, rtConeSoft: 1, rtStreakT: 0.02, rtFStreak: 0.3, rtTurb: 1, rtTurbL: 20, rtTurbS: 0.6,
    // 第 4 版（对话框11，10-02 19:25：一半细火星烘进贴图、星头光晕、末段爆亮、发射口）
    rtFTex: 0.5, rtTexI: 40, rtGlow: 0.3, rtGlowSize: 6, rtPopRate: 15, rtPopSize: 0.4, rtLaunch: 1.0, rtLaunchSize: 6, rtLaunchN: 60, rtLaunchV: 25 }, m: { stages: [[0, '#ffffff']], xw: 0.08, ramp0: '#000000', ramp1: '#8a3a0c', ramp2: '#ffbe5c', ramp3: '#fff6e6', headInt: 1, tailInt: 1 } },
  tailM: { p: { rtGpuSafe: 1, renderVer: 40, form: 'emitset', texW: 2048, texH: 2048, cols: 16, rows: 1, chans: 4, outMode: 'combined', encGamma: 1, frameMode: 'uniform', zoom: 'off', engine: 'gpu', autoGrid: 0, cellPad: 2, shutter: 0.5, exposure: 0.3, rtBright: 6, haloFrac: 0.04, haloR: 2, seed: 7,
    // 第 2 / 3 版（对话框11，10-02：RT2 火星数量大小 + RT3 白黄对比、线状拖影、空气乱流）
    rtCone: 7, rtACone: 6, rtASize: 0.5, rtAI: 1.1, rtAWarm: 0.8, rtFRate: 3000, rtFSize: 0.15, rtFI: 5, rtMRate: 1100, rtMSize: 0.23, rtMI: 10, rtCRate: 200, rtCSize: 0.32, rtCI: 24, rtCKd: 1.8, rtT0: 2700, rtTb: 2450, rtERate: 5, rtEKd: 2.5, rtSmoke: 0, rtMobile: 0.1, rtFdT: -400, rtCdT: 500, rtSizeJit: 45, rtKdJit: 35, rtConeSoft: 1, rtStreakT: 0.02, rtFStreak: 0.3, rtTurb: 1, rtTurbL: 20, rtTurbS: 0.6,
    // 第 4 版（对话框11，10-02 19:25：一半细火星烘进贴图、星头光晕、末段爆亮、发射口）
    rtFTex: 0.5, rtTexI: 40, rtGlow: 0.35, rtGlowSize: 9, rtPopRate: 30, rtPopSize: 0.5, rtLaunch: 1.2, rtLaunchSize: 8, rtLaunchN: 100, rtLaunchV: 30 }, m: { stages: [[0, '#ffffff']], xw: 0.08, ramp0: '#000000', ramp1: '#8a3a0c', ramp2: '#ffbe5c', ramp3: '#fff6e6', headInt: 1, tailInt: 1 } },
  tailL: { p: { rtGpuSafe: 1, renderVer: 40, form: 'emitset', texW: 2048, texH: 2048, cols: 16, rows: 1, chans: 4, outMode: 'combined', encGamma: 1, frameMode: 'uniform', zoom: 'off', engine: 'gpu', autoGrid: 0, cellPad: 2, shutter: 0.5, exposure: 0.3, rtBright: 6, haloFrac: 0.04, haloR: 2, seed: 7, rtH: 410, rtT: 8, rtVb: 4, rtD: 0.30, rtBurstD: 290, rtSpin: 2.6, rtFling: 5.0,
    rtHeadSize: 0.7, rtHeadI: 3.2, rtHeadFl: 1.2, rtARate: 12000, rtALife: 0.9,
    rtCone: 9.5, rtFRate: 4200, rtFLife: 1.2, rtFSize: 0.18, rtMRate: 1600, rtMLife: 2.2, rtMSize: 0.27, rtCRate: 300, rtCLife: 3.4, rtCSize: 0.38,
    rtERate: 8, rtELife: 3.5, rtESize: 0.9, rtSmokeRate: 35, rtMobile: 0.06,
    // 第 2 / 3 版（对话框11，10-02：RT2 火星数量大小 + RT3 白黄对比、线状拖影、空气乱流）
    rtACone: 7, rtASize: 0.6, rtAI: 1.1, rtAWarm: 0.8, rtFI: 5, rtMI: 10, rtCI: 24, rtCKd: 1.8, rtT0: 2700, rtTb: 2450, rtEKd: 2.5, rtSmoke: 0, rtFdT: -400, rtCdT: 500, rtSizeJit: 45, rtKdJit: 35, rtConeSoft: 1, rtStreakT: 0.02, rtFStreak: 0.3, rtTurb: 1, rtTurbL: 20, rtTurbS: 0.6,
    // 第 4 版（对话框11，10-02 19:25：一半细火星烘进贴图、星头光晕、末段爆亮、发射口）
    rtFTex: 0.5, rtTexI: 40, rtGlow: 0.45, rtGlowSize: 14, rtPopRate: 50, rtPopSize: 0.6, rtLaunch: 1.5, rtLaunchSize: 12, rtLaunchN: 160, rtLaunchV: 40 }, m: { stages: [[0, '#ffffff']], xw: 0.08, ramp0: '#000000', ramp1: '#8a3a0c', ramp2: '#ffbe5c', ramp3: '#fff6e6', headInt: 1, tailInt: 1 } },
  // 升空尾缀三档：用户认可的 V5 / TR2 导出快照；不按目标长度重新拟合。
  trailS: { p: { seed: 7, riseH: 120, vtShell: 35, trV: 33.7, trFps: 30, trInh: 0.12,
    trDrag: 3.5, trGrav: 0.4, trCool: 0.46297, trFRate: 12000, trFLife: 0.65692, trFSpread: 1.85647,
    trFSize: 0.0192, trFBright: 0.03077, trMRate: 3200, trMLife: 0.54, trMSpread: 0.53255, trMSize: 0.01638,
    trMBright: 0.06828, trCRate: 2704, trCLife: 0.78, trCSpread: 1.2, trCSize: 0.02048, trCBright: 0.77115,
    trWRate: 0, trWLife: 0.12, trWSpread: 14, trWSize: 0.06, trWBright: 0.06, trHeadSize: 0.08961,
    trHeadBright: 0.84614, trHalo: 2.2, trHaloBright: 0.13499, trTwist: 0.22422, trTwistN: 6, trWiggle: 0.13287,
    trTwistLag: 0.15, trFollow: 1, trBright: 1, trExport4K: 1, trIgnite: 0, shutter: 0.05,
    texW: 2048, texH: 2048, cols: 16, rows: 1, chans: 4, outMode: 'combined',
    encGamma: 1, frameMode: 'uniform', zoom: 'off', engine: 'gpu', form: 'trail', cellPad: 2,
    autoGrid: 0 },
    m: {stages: [[0, '#ffffff']], xw: 0.08, ramp0: '#ffe096', ramp1: '#ffe8cb', ramp2: '#fff6e4', ramp3: '#fff8ec', headInt: 1, tailInt: 1} },
  trailM: { p: { seed: 7, riseH: 200, vtShell: 45, trV: 43.5, trFps: 30, trInh: 0,
    trDrag: 4.6875, trGrav: 0.25, trCool: 0.38583, trFRate: 18461.53846, trFLife: 1.07136, trFSpread: 0.99964,
    trFSize: 0.024, trFBright: 0.035, trMRate: 8320, trMLife: 1.08, trMSpread: 1.71366, trMSize: 0.0131,
    trMBright: 0.169, trCRate: 331.361, trCLife: 0.92083, trCSpread: 2.197, trCSize: 0.02048, trCBright: 0.6591,
    trWRate: 0, trWLife: 0.12, trWSpread: 14, trWSize: 0.06, trWBright: 0.06, trHeadSize: 0.12,
    trHeadBright: 1.2, trHalo: 2.6, trHaloBright: 0.08888, trTwist: 0.35, trTwistN: 5, trWiggle: 0.1458,
    trTwistLag: 0.35, trFollow: 1, trBright: 1.6, trExport4K: 1, trIgnite: 0.04, shutter: 0.05,
    texW: 2048, texH: 2048, cols: 16, rows: 1, chans: 4, outMode: 'combined',
    encGamma: 1, frameMode: 'uniform', zoom: 'off', engine: 'gpu', form: 'trail', cellPad: 2,
    autoGrid: 0 },
    m: {stages: [[0, '#ffffff']], xw: 0.08, ramp0: '#ffe5a4', ramp1: '#ffe9cb', ramp2: '#ffecd7', ramp3: '#fff8ec', headInt: 1, tailInt: 1} },
  trailL: { p: { seed: 7, riseH: 600, vtShell: 90, trV: 74.7, trFps: 30, trInh: 0,
    trDrag: 1.76, trGrav: 0.3, trCool: 0.463, trFRate: 36413.29085, trFLife: 0.18085, trFSpread: 0.61542,
    trFSize: 0.024, trFBright: 0.035, trMRate: 11360.94692, trMLife: 1.152, trMSpread: 4.45552, trMSize: 0.04,
    trMBright: 0.156, trCRate: 6240, trCLife: 1.365, trCSpread: 1.08, trCSize: 0.02048, trCBright: 1,
    trWRate: 260, trWLife: 0.14, trWSpread: 16, trWSize: 0.12, trWBright: 0.07, trHeadSize: 0.0768,
    trHeadBright: 1.82, trHalo: 3.2, trHaloBright: 0.13334, trTwist: 1.08439, trTwistN: 4, trWiggle: 0.56051,
    trTwistLag: 0.45, trFollow: 1, trBright: 2.5, trExport4K: 1, trIgnite: 0.08, shutter: 0.05,
    texW: 2048, texH: 2048, cols: 16, rows: 1, chans: 4, outMode: 'combined',
    encGamma: 1, frameMode: 'uniform', zoom: 'off', engine: 'gpu', form: 'trail', cellPad: 2,
    autoGrid: 0 },
    m: {stages: [[0, '#ffffff']], xw: 0.08, ramp0: '#ffd481', ramp1: '#ffeac2', ramp2: '#fff7e4', ramp3: '#fff8ec', headInt: 1, tailInt: 1} },
  fountain: { p: { duration: 1, loopT: 1, nozzles: 1, fanAngle: 0, jetSpeed: 26, jetCone: 11, jetDir: 90, sparkRate: 1600, sparkLife: 1.6, sparkDrag: 1.1, sparkSize: 0.22, T0: 2150, cooling: 0.5, headSize: 0.6, zoom: 'off', form: 'loop', cols: 8, rows: 4, chans: 1, texW: 2048, texH: 1024 }, m: GROUND_RAMP },
  falls: { p: { duration: 1.2, loopT: 1.2, nozzles: 14, spacing: 3, groundH: 18, jetSpeed: 4, jetCone: 25, jetDir: -80, sparkRate: 220, sparkLife: 2.6, sparkDrag: 0.9, sparkGrav: 1.1, sparkSize: 0.22, T0: 2100, cooling: 0.35, zoom: 'off', form: 'loop', cols: 8, rows: 4, chans: 1, texW: 2048, texH: 1024 }, m: GROUND_RAMP },
  wheel: { p: { duration: 0.8, loopT: 0.8, nozzles: 4, wheelR: 2.5, groundH: 8, headSize: 0.35, headBright: 0.45, jetSpeed: 24, jetCone: 6, sparkRate: 900, sparkLife: 0.9, sparkDrag: 1.2, sparkSize: 0.22, T0: 2250, cooling: 0.5, zoom: 'off', form: 'loop', cols: 8, rows: 4, chans: 1, texW: 2048, texH: 2048 }, m: GROUND_RAMP },
  fan: { p: { duration: 2, loopT: 2, nozzles: 7, fanAngle: 70, spacing: 1.5, shotRate: 3.5, shotSpeed: 75, cometBurn: 1.5, vt: 30, headSize: 1.2, sparkRate: 260, sparkLife: 0.8, sparkSpread: 1.6, sparkInherit: 0.1, sparkDrag: 2, sparkSize: 0.3, zoom: 'off', form: 'loop', cols: 8, rows: 8, chans: 1, texW: 2048, texH: 2048 }, m: GROUND_RAMP },
  barrage: { p: { duration: 2, loopT: 2, nozzles: 1, fanAngle: 8, shotRate: 3, shotSpeed: 90, cometBurn: 1.6, vt: 32, burstStars: 14, subSpeed: 22, subBurn: 0.9, headSize: 1.1, sparkRate: 220, sparkLife: 0.7, sparkSpread: 1.5, sparkInherit: 0.1, sparkDrag: 2, zoom: 'off', form: 'loop', cols: 8, rows: 8, chans: 1, texW: 2048, texH: 2048 }, m: { stages: [[0, '#ffffff']], ramp1: '#8a3208', ramp2: '#ffc266', ramp3: '#fff0d2' } },
  shikake: { p: { duration: 1, loopT: 1, text: '祭', pattern: 'text', stars: 260, spacing: 30, groundH: 10, headSize: 0.9, flicker: 0.5, sparkRate: 30, sparkLife: 0.9, sparkSpread: 0.6, sparkDrag: 1.5, sparkSize: 0.2, jetSpeed: 0.6, jetCone: 60, jetDir: -90, zoom: 'off', form: 'loop', cols: 4, rows: 4, chans: 1, texW: 2048, texH: 1024 }, m: { stages: [[0, '#ff7a1e']] } }
};
// 4.0 花型库模板的固定曝光（analysis/scripts/模板曝光.py 算的；菊按定帧对照人工调到 ×3，柳、椰子按改过的参数人工看过定，和「建议曝光」按钮同一算法：燃烧段最亮的一刻 99.8% 分位 → 0.96）。
// 只给新建的模板用；存下来的 4.0 配方按自己存的曝光（没存就是 1，和以前一样）。
const EXPOSURE40 = {"kiku": 3, "botan": 3.1, "kamuro": 4.0, "yanagi": 2, "senrin": 2.4, "hachi": 0.89, "palm": 2, "henka": 2.3, "strobe": 2.8, "glitter": 1.1, "crackle": 3.4, "matsuba": 1.4, "crossette": 1.8, "ochiba": 2.9, "jisa": 3.8, "ring": 3.3, "saturn": 2.9, "kata": 3.0, "water": 1.8, "trailS": 0.000976819, "trailM": 0.00167152, "trailL": 0.00244725, "fountain": 0.3476, "falls": 1.1293, "wheel": 0.1962, "fan": 5.2794, "barrage": 3.194, "shikake": 0.886, "rise": 0.6847};
// 4.0 新建模板的参数改动（只给新建的模板；旧配方、3.7 不变）。看 4.0 定帧对照后补的：
//   柳：原模板拖尾短、看不出垂柳 → 火花寿命长、冷却慢、几乎不继承星速、阻力大 → 火花停在空中慢慢下垂，形成一条条垂下的金丝（曝光 ×2 人工看过）
//   椰子：9 颗星太稀、拖尾细 → 14 颗星、拖尾更长更密、下垂成弧（曝光 ×2 人工看过）
const TEMPLATE40 = {
  yanagi: { sparkLife: 3.2, cooling: 0.16, sparkInherit: 0.15, sparkDrag: 2.5, sparkGrav: 0.35 },
  palm: { stars: 14, sparkLife: 2.6, cooling: 0.18, sparkInherit: 0.12, sparkDrag: 2.2, sparkGrav: 0.3, sparkRate: 1200 },
  // 4.3（清理清单 C1）：升空尾缀 V5、地面循环、上升以前是 3.7 画法（每次烘焙按画面自动曝光，星头和火花各自归一）。
  // 换到现在的画法后按同一口径量了一次（星头 99.8% 分位 → 0.92、火花 99.6% 分位 → 0.55），写成固定曝光（EXPOSURE40）+ 星头亮度；
  // 尾缀的火花曝光再 ×1.05（3.7 的点有 0.55 px 下限，亚像素火星多摊开一点，平均亮度高约 5%）。预览带光晕（和 3.7 的预览一样）
  trailS: {"trHeadExpo": 40.4011, "previewBloom": 1},
  trailM: {"trHeadExpo": 32.8159, "previewBloom": 1},
  trailL: {"trHeadExpo": 8.9465, "previewBloom": 1},
  fountain: {"headBright": 7.142, "previewBloom": 1},
  falls: {"headBright": 2.8017, "previewBloom": 1},
  wheel: {"headBright": 8.7684, "previewBloom": 1},
  fan: {"headBright": 1.2846, "previewBloom": 1},
  barrage: {"headBright": 1.2195, "previewBloom": 1},
  shikake: {"headBright": 1.6659, "previewBloom": 1},
  rise: {"headBright": 6.9842, "previewBloom": 1},
};
// 4.3：只有一套画法（以前叫「4.0 渲染核」；3.7 的画法去掉了，清理清单 C1）。renderVer 只当存档里的标记：
// 没写或 < 40 的旧存档（3.7 时代的配方、浏览器里的旧版本、旧 JSON、正式库 V5 的原始记录）读进来时按 migrate37 迁移。
function defaultsFor(type, _unused, stored = false) {
  const t = TYPES[type] || TYPES.kiku;
  const M = { ...MAT_BASE, ...t.m }; M.stages = (t.m.stages || MAT_BASE.stages).map(s => [...s]);
  const P = { ...BASE, ...t.p, type, renderVer: 40 };
  if (familyOf(type) === 'aerial' && t.p.cols == null) { P.cols = 4; P.rows = 4; }
  // 新建：固定取景（用户 2026-10-01 22:28 指出 Zoom 在抖：面片连续放大，贴图一帧停几个 tick，换帧时花缩回去，一胀一缩 1–3%）
  if (!stored && familyOf(type) === 'aerial' && t.p.zoom == null) P.zoom = 'off';
  if (!stored) { Object.assign(P, TEMPLATE40[type] || {}); if (t.p.exposure == null && EXPOSURE40[type]) P.exposure = EXPOSURE40[type]; }
  return { P, M };
}
function usesTickPlan40(P) { return familyOf(P.type)==='aerial' && ['master','segments'].includes(P.form); }
// 旧存档 → 现在的画法。3.7 的贴图曝光是每次烘焙按画面自动定的（存档里的 exposure 没起作用），这里换成固定曝光：
// 空中花型用模板的曝光（EXPOSURE40），格子按 4×4、固定取景（和 JM4 → JM4-40 同一套迁法）；升空尾缀 / 地面 / 上升用 CAL40
// （按 3.7 自动曝光的口径在新画法下量出来的：曝光 + 星头亮度倍数）。迁过的存档带 _mig37，界面提示「亮度请看一眼」。
const CAL40 = {"trailS": {"exposure": 0.000976819, "headK": 40.4011, "previewBloom": 1}, "trailM": {"exposure": 0.00167152, "headK": 32.8159, "previewBloom": 1}, "trailL": {"exposure": 0.00244725, "headK": 8.9465, "previewBloom": 1}, "fountain": {"exposure": 0.3476, "headK": 7.142, "previewBloom": 1}, "falls": {"exposure": 1.1293, "headK": 2.8017, "previewBloom": 1}, "wheel": {"exposure": 0.1962, "headK": 19.4854, "previewBloom": 1}, "fan": {"exposure": 5.2794, "headK": 1.2846, "previewBloom": 1}, "barrage": {"exposure": 3.194, "headK": 1.2195, "previewBloom": 1}, "shikake": {"exposure": 0.886, "headK": 1.6659, "previewBloom": 1}, "rise": {"exposure": 0.6847, "headK": 4.9887, "previewBloom": 1}};
function migrate37(P, ...given) {      // given[0]：原始存档的版本（显式传 undefined = 没写版本 = 3.7 时代的）；不传就看 P 自己的
  const srcVer = given.length ? given[0] : P && P.renderVer;
  if (P) P.engine = 'gpu';      // 4.3.2（H12）：只剩 GPU 模拟内核；存档里的 'cpu' 一律换成 GPU
  if (!P || +srcVer >= 40) { if (P) P.renderVer = 40; return P; }
  const fam = familyOf(P.type), c = CAL40[P.type];
  if (fam === 'aerial') {
    if (['master', 'segments'].includes(P.form || 'master')) { if ((+P.cols || 8) * (+P.rows || 8) > 16) { P.cols = 4; P.rows = 4; } P.autoGrid = 0; if (P.zoom !== 'off') P.zoom = 'off'; }
    P.exposure = EXPOSURE40[P.type] || 1;
  } else if (c) {
    P.exposure = c.exposure;
    if (c.headK && isTrail(P)) P.trHeadExpo = c.headK;      // 尾缀：星头亮度参数不动，另记星头曝光（取景按原始亮度量，和 3.7 一样）
    else if (c.headK) P.headBright = +((P.headBright == null ? 1 : +P.headBright) * c.headK).toFixed(5);
    if (c.previewBloom != null && P.previewBloom == null) P.previewBloom = c.previewBloom;
  }
  P.renderVer = 40; P._mig37 = 1; return P;
}
function storedParams(p, type = p.type) {
  const P = migrate37({ ...defaultsFor(type, null, true).P, ...p, type }, p.renderVer);
  if (P.frameMode === 'content') P.frameMode = 'auto';     // 4.3：「按画面变化」去掉了（从来没生效过，和「自动」一样）
  return P;
}
// 旧版颜色（colA → colB，chg 秒）换成分段
function normalizeM(M, type) {
  const d = defaultsFor(type || 'kiku').M, o = { ...d, ...M };
  if (!Array.isArray(o.stages) || !o.stages.length) {
    if (M && M.colA) o.stages = M.colA === M.colB || !(M.chg < 9) ? [[0, M.colA]] : [[0, M.colA], [M.chg, M.colB]];
    else o.stages = d.stages.map(s => [...s]);
  }
  delete o.colA; delete o.colB; delete o.chg;
  // 先按时刻排序再截到 5 段（问题清单 E10：以前先截后排，丢的是列表里第 6 个而不是最晚的一段）
  o.stages = o.stages.map(([t, c]) => [+t, c]).sort((a, b) => a[0] - b[0]).slice(0, 5); o.stages[0][0] = 0;
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
const isPhys = P => familyOf(P.type) === 'rise' && P.form === 'phys';
const isEmit = P => familyOf(P.type) === 'rise' && P.form === 'emitset';   // 循环层 + 粒子发射器（47_risetail.js）
const isSeq = P => !isTrail(P) && !isPhys(P) && !isEmit(P);
// 4.4.2：单层效果的「导出方案」只给空中礼花的大面片 / 分段（多层效果在层页头；尾缀、地面、上升循环没有光点 / 单束）
const singleSchemeOn = P => !!P && familyOf(P.type) === 'aerial' && isSeq(P) && P.form !== 'unit' && (typeof state === 'undefined' || state.tab !== 'combo');   // 普通花型（非尾缀序列、非物理尾缀、非循环层 + 粒子）
const PATTERNS = [['sphere', '球'], ['half', '半球（贴水面）'], ['ring', '环'], ['saturn', '土星（球 + 环）'], ['heart', '心形'], ['smile', '笑脸'], ['star5', '五角星'], ['text', '文字']];
const RISE_STYLES = [['gold', '金色曲导'], ['silver', '银竜（银色长火花）'], ['dark', '暗升（无尾）'], ['kobana', '昇り小花'], ['bunpo', '分砲（空中分叉）'], ['fue', '笛（鸣笛）'], ['spiral', '螺旋']];
const SCHEMA = [
  { sec: '规格', show: isSeq, items: [
    { sel: 'shellNo', label: '号数', show: P => !isGround(P), options: [[0, '手动'], ...SHELL_NO.map(r => [r[0], r[0] === 40 ? '40 号（四尺玉）' : r[0] === 10 ? '10 号（尺玉）' : r[0] + ' 号'])], hint: '按号数自动推算初速、星数、寿命、星头大小（以本花型默认值约 5 号为基准）' }
  ] },
  { sec: '开花与燃烧', show: isAir, items: [
    ['duration', '序列时长', 's', 0.8, 16, 0.05],
    { sel: 'endMode', label: '结尾', options: [['fade', '最后 0.3 s 整体淡出（旧）'], ['natural', '不淡出，等火花自然灭完']] },
    { info: 'endInfo' },
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
    ['flash', '开花闪光', '', 0, 3, 0.05],
    ['flashSize', '开花闪光大小', '×', 0.3, 3, 0.05]
  ] },
  { sec: '形状', show: P => isAir(P) || P.type === 'shikake', items: [
    { sel: 'pattern', label: '星的排布', options: PATTERNS, show: isAir },
    { sel: 'pattern', label: '图案', options: PATTERNS.filter(p => ['ring', 'heart', 'smile', 'star5', 'text'].includes(p[0])), show: P => P.type === 'shikake' },
    { text: 'text', label: '文字', show: P => P.pattern === 'text' },
    ['tilt', '倾斜', '°', 0, 89, 1, P => P.pattern !== 'sphere' && P.pattern !== 'half'],
    ['ringFrac', '环上星的比例', '', 0.1, 0.9, 0.01, P => P.pattern === 'saturn'],
    ['waterRefl', '水面倒影', '', 0, 1, 0.01, isAir]
  ] },
  { sec: '物理扰动', show: P => !isGround(P) && isSeq(P), hint: '风与湍流：星和火花都受影响；GPU 火花用「发射点处的气流」做衰减偏移近似。', items: [
    ['wind', '风速（+ 向右）', 'm/s', -15, 15, 0.1],
    ['turb', '湍流强度', 'm/s', 0, 12, 0.1],
    ['turbScale', '湍流尺度', 'm', 5, 300, 1],
    ['tailDiffuse', '尾迹扩散（老火花被空气扰流慢慢吹散；0 = 关）', 'm/s', 0, 4, 0.05, isAir],
    ['tailDiffuseScale', '扰流尺度（大 = 相邻火花一起飘成一缕；小 = 各自散开）', 'm', 2, 120, 1, P => isAir(P) && +P.tailDiffuse > 0],
    ['massLoss', '燃烧减质量', '', 0, 0.9, 0.01, isAir],
    ['shellVx', '残余速度（水平）', 'm/s', -30, 30, 0.5, isAir],
    ['shellVy', '残余速度（竖直）', 'm/s', -30, 30, 0.5, isAir],
    ['shellSpin', '玉体自旋', 'rad/s', 0, 80, 0.5, isAir]
  ] },
  { sec: '星效果', show: isAir, hint: '可叠加在任何花型上。松叶分叉只在 GPU 内核里有。', items: [
    ['ignDelay', '延时点火', 's', 0, 10, 0.01],
    ['ignJit', '点火离散', '%', 0, 100, 1],
    ['ignSeed', '点火离散用独立随机（0 关；非 0 时和同种子的另一层星位一一对应）', '', 0, 999, 1, P => P.ignDelay > 0],
    ['keepFrac', '只让一部分星发光（轨迹不变，和同种子的主层同位）', '×', 0.02, 1, 0.01],
    ['afterBurn', '第二段：主段烧完后接着亮几秒（0 关；主段期间不发光）', 's', 0, 8, 0.05],
    ['afterJit', '第二段时长离散', '%', 0, 60, 1, P => P.afterBurn > 0],
    ['headDim', '前段星头亮度（1 = 不压暗）', '×', 0, 1, 0.01],
    ['headDimUntil', '前段压暗到第几秒（分层星外层 = 引き）', 's', 0, 6, 0.05],
    ['strobeHz', '点灭频率（0 关）', 'Hz', 0, 30, 0.1],
    ['strobeDuty', '点灭亮占比', '', 0.05, 0.9, 0.01, P => P.strobeHz > 0],
    ['strobeStart', '点灭开始', '×燃烧', 0, 1, 0.01, P => P.strobeHz > 0],
    ['glitter', '辉星（延迟闪光火花）', '', 0, 1, 0.01],
    ['glitterDelay', '辉星闪光延迟', 's', 0.05, 1.5, 0.01, P => P.glitter > 0],
    ['crackle', '爆裂（每颗星）', '粒', 0, 40, 1],
    ['crackleDelay', '爆裂延迟', 's', 0.05, 1, 0.01, P => P.crackle > 0],
    ['crackleR', '爆裂范围', 'm', 0.5, 20, 0.1, P => P.crackle > 0],
    ['crackleV', '爆裂速度', 'm/s', 0, 30, 0.5, P => P.crackle > 0],
    ['branch', '松叶分叉（每粒火花）', '支', 0, 4, 1],
    ['branchAt', '分叉时刻', '×寿命', 0.1, 0.9, 0.01, P => P.branch > 0],
    ['flutter', '飘落摆动', 'm/s', 0, 10, 0.1],
    ['flutterHz', '摆动频率', 'Hz', 0.1, 3, 0.05, P => P.flutter > 0]
  ] },
  { sec: '炭头（星头）', show: isSeq, items: [
    ['headSize', '炭头大小', 'm', 0.15, 6, 0.05],
    ['headBright', '炭头亮度', '×', 0, 3, 0.05],
    ['flicker', '闪烁强度', '', 0, 1, 0.01]
  ] },
  { sec: '尾缀（炭火火花）', show: isSeq, hint: '可见尾长由星体运动、火花跟随、寿命和冷却共同决定。末段寿命控制后来出生的火花，不改变已有火花。', items: [
    ['sparkRate', '火花密度', '个/秒', 0, 3000, 1],
    ['sparkRateEnd', '末段火花密度', '×', 0, 2, 0.01, isAir],
    ['sparkStop', '火花只在前几秒（分层星外层，0 = 全程）', 's', 0, 3, 0.01, isAir],
    ['sparkStart', '火花从第几秒开始（分层星内层 / 末段短尾，0 = 一开始就有）', 's', 0, 6, 0.01, isAir],
    // 4.2.17 火花起势（用户 10-03 12:59；12:27 #3 锦段「参考是先零星出现再形成一条线」）：开始出火花后，密度从零星到满要多久；每颗星快慢随机
    ['sparkRamp', '火花起势（开始出火花后用几秒从零星到满密度：先零零星星、再连成线；0 = 一开始就满密度）', 's', 0, 2, 0.01, isAir],
    ['sparkRampJit', '火花起势随机（每颗星起势快慢不同，± 百分比，均匀分布）', '%', 0, 100, 1, P => isAir(P) && +P.sparkRamp > 0],
    ['sparkLife', '火花寿命', 's', 0.05, 4, 0.01],
    ['sparkLifeEnd', '末段出生火花的寿命', '×', 0.05, 2, 0.01, P => familyOf(P.type) === 'aerial'],
    ['sparkLifeJit', '火花寿命离散', '%', 0, 80, 1, P => familyOf(P.type) === 'aerial'],
    ['sparkSpread', '尾缀粗细（散布）', 'm/s', 0, 15, 0.1],
    ['sparkSize', '颗粒大小', 'm', 0.05, 2, 0.01],
    ['sparkInherit', '跟随星体', '', 0, 1, 0.01],
    ['sparkDrag', '火花阻力', '1/s', 0, 8, 0.05],
    ['sparkGrav', '火花下坠', '×', 0, 3, 0.05],
    ['T0', '初始温度', 'K', 1500, 2800, 10],
    ['cooling', '冷却速度', '', 0, 0.8, 0.01],
    { sel: 'coolMode', label: '冷却方式', show: isAir, options: [[0, '按各自寿命（旧：线上随机灭）'], [1, '按实际时间（老的先暗）']] },
    ['sparkBright', '火花亮度', '×', 0, 3, 0.05],
    ['emberFrac', '余烬长尾比例（锦冠木炭余烬 / 受光烟迹：暗而长的轨迹线，0 关）', '', 0, 0.9, 0.01, isAir],
    ['emberLife', '余烬长尾寿命', 's', 0.3, 8, 0.05, P => isAir(P) && P.emberFrac > 0],
    ['emberBright', '余烬长尾亮度（× 新火花）', '×', 0.005, 1, 0.005, P => isAir(P) && P.emberFrac > 0],
    ['emberFollow', '随母星熄灭（受光烟迹：星灭后几秒内淡掉，0 = 按自身寿命）', 's', 0, 3, 0.05, P => isAir(P) && P.emberFrac > 0],
    ['emberSize', '余烬长尾粗细（× 颗粒）', '×', 0.2, 2, 0.01, P => isAir(P) && P.emberFrac > 0],
    ['emberEnd', '光丝整体熄灭时刻（受光烟迹：星转点灭、色光变弱后烟迹一起暗掉，0 关）', 's', 0, 10, 0.05, P => isAir(P) && P.emberFrac > 0],
    ['emberAll', '余烬贯穿整个燃烧期（1 = 不受「火花只在前几秒」限制：外层引き火花先停，光丝一直跟到星头）', '', 0, 1, 1, P => isAir(P) && P.emberFrac > 0],
    ['twinkle', '火花闪烁', '', 0, 1, 0.01],
    ['twinkleHz', '火花闪烁频率（0 = 每个时间片随机）', 'Hz', 0, 30, 0.5, P => +P.twinkle > 0]
  ] },
  { sec: '尾迹外形', show: P => isSeq(P) && familyOf(P.type) === 'aerial', hint: '每个效果（多层时每一层）自己的外形量，0 = 原样，不影响别的效果。尾长、尾缀粗细、星头大小、亮度、闪烁就是上面的「火花寿命」「尾缀粗细（散布）」「颗粒大小」「星头大小」「火花亮度」「火花闪烁」。', items: [
    ['tailJit', '粗细随机（星与星、火花与火花之间的粗细差别）', '', 0, 1, 0.01],
    ['tailShoulder', '亮肩（正：靠近星头的火花更大更亮、尾端更细更暗；负：反过来）', '', -1, 1, 0.01],
    ['tailWidth', '尾迹粗细（火花横向散开和颗粒大小的倍数；1 = 原样）', '×', 0.3, 3, 0.01],
    ['tailPinchHead', '星头端收尖（梭形：靠星头那截细，0 = 原样，1 = 最尖）', '', 0, 1, 0.01],
    ['tailPinchTail', '尾端收尖（梭形：尾巴末端细，0 = 原样，1 = 最尖）', '', 0, 1, 0.01],
    ['tailBellyAt', '最粗处（沿尾迹：0 = 星头，1 = 尾端）', '', 0.1, 0.9, 0.01, P => +P.tailPinchHead > 0 || +P.tailPinchTail > 0],
    ['headTear', '泪滴星头（沿运动方向拉出尖尾，速度越快越长）', '', 0, 1, 0.01],
    ['sparkRise', '火花烧旺时间（刚离开星时还没烧旺：靠星头那截暗、偏红，中段最亮；0 = 一出来就最亮）', 's', 0, 1, 0.01],
    ['starBright', '每颗星亮度离散（有的线亮、有的线暗；对数标准差）', '', 0, 1, 0.01],
    ['tailHaze', '线间底光（受光的烟 / 分辨不出的细火花，把线之间的黑填一点）', '', 0, 0.2, 0.001],
    ['tailHazeR', '线间底光半径', 'm', 1, 30, 0.5, P => +P.tailHaze > 0]
  ] },
  { sec: '千轮 / 分裂', show: P => P.type === 'senrin' || P.type === 'crossette', items: [
    { sel: 'subPattern', label: '子星排布', options: [['sphere', '小球（千轮）'], ['cross', '十字（分裂）']] },
    ['subDelay', '子花开花时刻', 's', 0.2, 8, 0.01],
    ['subJit', '开花时刻离散', '%', 0, 40, 0.5],
    ['subStars', '每朵子花星数', '颗', 2, 120, 1],
    ['subSpeed', '子花初速', 'm/s', 5, 120, 1],
    ['subBurn', '子花燃烧时间', 's', 0.2, 8, 0.05],
    ['subTail', '子花火花密度', '个/秒', 0, 400, 1],
    ['carrierTail', '子弹尾迹密度', '个/秒', 0, 400, 1],
    ['carrierHead', '子弹（小割玉）亮度（0 = 飞行时不可见）', '×', 0, 1, 0.01],
    ['subKeep', '子花继承子弹速度（-1 = 默认：十字排布 0.25，其它 0.35）', '', -1, 1, 0.01],
    ['subScaleJit', '每朵子花大小离散', '%', 0, 50, 1],
    ['subSpeedJit', '子星初速离散（-1 = 同主星的初速离散）', '%', -1, 40, 1],
    ['subVt', '子星终端速度（0 = 同主层）', 'm/s', 0, 80, 0.5],
    ['subGrav', '子星下坠（-1 = 同主层）', '×', -1, 3, 0.05],
    ['subFlash', '子花开花闪光（-1 = 默认）', '', -1, 1, 0.01]
  ] },
  { sec: '蜂', show: P => P.type === 'hachi', items: [
    ['spin', '旋转速度', 'rad/s', 0, 40, 0.5],
    ['chaos', '乱飞程度', '', 0, 3, 0.05],
    ['beeSpeed', '推进速度', 'm/s', 5, 80, 1]
  ] },
  { sec: '上升', show: P => isRise(P) && !isPhys(P) && !isEmit(P), hint: '模拟从地面到开花高度的整段上升。导出默认是「星头循环 + 弹道拟合 + 火花发射器参数」。', items: [
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
    { sel: '_trailTier', label: '档位', options: [['trailS', '小（对照尾缀C）'], ['trailM', '中（对照尾缀B）'], ['trailL', '大（对照尾缀A）']], show: P => !state.repId, hint: '三档的默认参数不同（开花高度、弹速、火花密度）；切换 = 换成那一档的模板参数' },
    ['trPhys', '粒子模型（0 = V5 原版，1 = 物理：物理尾缀的三层喷出物）', '', 0, 1, 1],
    ['trV', '上升速度（烘焙时）', 'm/s', 10, 150, 0.5],
    ['trInh', '火花跟随弹体', '', 0, 0.8, 0.01, P => !isPhysBody(P)],
    ['trDrag', '火花阻力', '1/s', 0.3, 10, 0.05, P => !isPhysBody(P)],
    ['trGrav', '火花下坠', '×', 0, 2, 0.01, P => !isPhysBody(P)],
    ['trCool', '冷却快慢', '×', 0.3, 2, 0.01, P => !isPhysBody(P)],
    ['trIgnite', '火花燃旺时间', 's', 0, 0.6, 0.005, P => !isPhysBody(P)],
    ['trTwist', '螺旋扭动幅度', 'm', 0, 6, 0.01, P => !isPhysBody(P)],
    ['trTwistN', '每个循环扭几圈', '圈', 1, 8, 1, P => !isPhysBody(P)],
    ['trWiggle', '细碎抖动', 'm', 0, 1, 0.01, P => !isPhysBody(P)],
    ['trTwistLag', '扭动滞后（星头走直线，火花离开后多久漂到波形上）', 's', 0, 1.5, 0.01, P => !isPhysBody(P)],
    ['trFollow', '快门跟拍（1 = 火星拖成短竖线，像跟拍的实拍；0 = 固定机位，火星是圆点）', '', 0, 1, 1],
    ['seed', '随机种子', '', 1, 999, 1]
  ] },
  { sec: '尾缀序列 · 星头', show: P => isTrail(P) && !isPhysBody(P), items: [
    ['trHeadSize', '星头大小', 'm', 0.03, 2, 0.01],
    ['trHeadBright', '星头亮度', '×', 0, 4, 0.05],
    ['trHalo', '光晕大小（× 星头）', '×', 1, 8, 0.1],
    ['trHaloBright', '光晕亮度', '×', 0, 1, 0.01]
  ] },
  { sec: '尾缀序列 · 火花（四层）', show: P => isTrail(P) && !isPhysBody(P), hint: '白热细火花 = 星头后面连续的白亮段；金色火花 = 中段的团块；橙色大火花 = 末段一颗颗的点；星头丝火花 = 大型礼花星头周围甩出的细丝。长度 ≈ 上升速度 × 寿命，粗细看散布和颗粒大小。', items: [
    ['trFRate', '白热细火花 · 密度', '个/秒', 0, 20000, 10], ['trFLife', '白热细火花 · 寿命', 's', 0.03, 2, 0.01], ['trFSpread', '白热细火花 · 散布', 'm/s', 0, 6, 0.01], ['trFSize', '白热细火花 · 颗粒', 'm', 0.02, 1, 0.005], ['trFBright', '白热细火花 · 亮度', '×', 0, 0.5, 0.001],
    ['trMRate', '金色火星 · 密度', '个/秒', 0, 8000, 10], ['trMLife', '金色火星 · 寿命', 's', 0.05, 3, 0.01], ['trMSpread', '金色火星 · 散布', 'm/s', 0, 8, 0.01], ['trMSize', '金色火星 · 颗粒', 'm', 0.02, 1, 0.005], ['trMBright', '金色火星 · 亮度', '×', 0, 0.5, 0.001],
    ['trCRate', '橙色大火星 · 密度', '个/秒', 0, 3000, 5], ['trCLife', '橙色大火星 · 寿命', 's', 0.05, 4, 0.01], ['trCSpread', '橙色大火星 · 散布', 'm/s', 0, 10, 0.01], ['trCSize', '橙色大火星 · 颗粒', 'm', 0.02, 1.5, 0.005], ['trCBright', '橙色大火星 · 亮度', '×', 0, 1, 0.001],
    ['trWRate', '星头丝火花 · 密度（0 关）', '个/秒', 0, 3000, 5], ['trWLife', '星头丝火花 · 寿命', 's', 0.03, 0.6, 0.01], ['trWSpread', '星头丝火花 · 速度', 'm/s', 0, 40, 0.1], ['trWSize', '星头丝火花 · 颗粒', 'm', 0.02, 0.5, 0.005], ['trWBright', '星头丝火花 · 亮度', '×', 0, 0.5, 0.001]
  ] },
  { sec: '尾缀序列 · 引擎', show: isTrail, hint: '循环 64 帧（30 fps，2.13 s）；消散两个版本：30 fps（2.13 s）与 20 fps（3.2 s），都是 64 帧。贴图 2048×2048、16 列 × 1 行、单格 128×2048、RGBA 接力。', items: [
    ['trBright', '引擎亮度倍数（Color Over Life）', '×', 0.2, 5, 0.05],
    { sel: 'trExport4K', label: '导出 4K 母版', options: [[1, '同时导出 4096×4096'], [0, '只导出 2K']] }
  ] },
  { sec: '物理尾缀 · 镜头', show: isPhys, hint: '地面坐标实时模拟（trail_phys.py 的移植）：尾迹是停在空中的火花，镜头跟着星头走；实拍面板按同一比例跟拍。贴图导出仍用 analysis/scripts/trail_phys_bake.py。', items: [
    ['phView', '视野高度', 'm', 20, 400, 1],
    ['phHead', '星头在画面的位置（离顶）', '', 0.05, 0.6, 0.01],
    ['phExpo', '曝光倍数', '×', 0.1, 8, 0.05]
  ] },
  { sec: '物理尾缀 · 弹道与空气', show: P => isPhys(P) || isPhysBody(P), items: [
    ['phV0', '出膛速度', 'm/s', 40, 200, 0.5, isPhys],
    ['phK', '弹体空气阻力 k', '1/m', 0.0005, 0.01, 0.00005, isPhys],
    ['phT', '开花时刻（飞行时间）', 's', 1, 10, 0.05, isPhys],
    ['phWob', '弹体摆动（尾迹大波浪）', 'm', 0, 3, 0.01],
    ['phSpinF', '弹体自转', '转/秒', 0, 20, 0.1],
    ['phSpinA', '自转带出的横向速度（细碎小波纹）', 'm/s', 0, 8, 0.05],
    ['phWind', '风速（+ 向右）', 'm/s', -8, 8, 0.05],
    ['phTurb', '冻结湍流', 'm/s', 0, 1.5, 0.01],
    ['seed', '随机种子', '', 1, 999, 1]
  ] },
  { sec: '物理尾缀 · 星头燃气焰', show: P => isPhys(P) || isPhysBody(P), hint: '泪滴形：长度 = 静止长度 + 系数 × 速度。', items: [
    ['phFlL0', '静止长度', 'm', 0, 8, 0.05], ['phFlLv', '随速度变长', 's', 0, 0.15, 0.001],
    ['phFlW', '半宽', 'm', 0.02, 1, 0.01], ['phFlI', '亮度', '', 0, 6, 0.05]
  ] },
  { sec: '物理尾缀 · 火粉（白热段）', show: P => isPhys(P) || isPhysBody(P), hint: '极密、极短命的细火花，连成星头后面的过曝白热段；长度 ≈ 喷出后的相对速度 × 寿命。', items: [
    ['phARate', '密度', '颗/秒', 0, 40000, 100], ['phALife', '寿命', 's', 0.03, 1, 0.01], ['phAJet', '向后喷出速度', 'm/s', 0, 80, 0.5],
    ['phACone', '横向散开', 'm/s', 0, 8, 0.05], ['phAKd', '阻力', '1/s', 1, 60, 0.5], ['phAT0', '温度', 'K', 1800, 3000, 10],
    ['phAI', '亮度', '', 0, 0.05, 0.0002], ['phAR', '发光半径', 'm', 0.005, 0.1, 0.001]
  ] },
  { sec: '物理尾缀 · 金火星（木炭）', show: P => isPhys(P) || isPhysBody(P), hint: '一簇一簇喷出；寿命对数正态（寿命 ∝ 粒径²）；出喷口 T0 很热，离开燃气约 tc 秒降到空气中的燃烧温度 Tb，快烧完才降到熄灭温度。', items: [
    ['phBRate', '密度', '颗/秒', 0, 8000, 10], ['phBPuff', '每簇颗数', '颗', 1, 8, 1], ['phBLife', '寿命中位', 's', 0.2, 5, 0.01],
    ['phBLsig', '寿命离散（对数标准差）', '', 0, 1.5, 0.01], ['phBJet', '向后喷出速度', 'm/s', 0, 80, 0.5], ['phBCone', '横向散开', 'm/s', 0, 8, 0.05],
    ['phBKd', '阻力', '1/s', 1, 60, 0.5], ['phBT0', '出喷口温度 T0', 'K', 1800, 3000, 10], ['phBTb', '空气中燃烧温度 Tb', 'K', 1500, 2700, 5],
    ['phBTc', '降到 Tb 的时间 tc', 's', 0.02, 2, 0.01], ['phBTend', '熄灭温度', 'K', 900, 2000, 10], ['phBPm', '烧到最后才暗（指数）', '', 0.1, 2, 0.01],
    ['phBI', '亮度', '', 0, 0.3, 0.0005], ['phBTw', '闪烁', '', 0, 1, 0.01], ['phBR', '发光半径', 'm', 0.01, 0.3, 0.005]
  ] },
  { sec: '物理尾缀 · 落火', show: P => isPhys(P) || isPhysBody(P), hint: '少量长寿大颗，下坠快，零星掉在尾迹下方。', items: [
    ['phCRate', '密度', '颗/秒', 0, 200, 1], ['phCLife', '寿命', 's', 0.2, 5, 0.05], ['phCKd', '阻力', '1/s', 0.5, 20, 0.1],
    ['phCI', '亮度', '', 0, 3, 0.01], ['phCR', '发光半径', 'm', 0.01, 0.3, 0.005]
  ] },
  { sec: '尾缀 · 弹道与规格', show: isEmit, hint: '弹体按 Cascade 的线性阻力飞（和引擎里的循环层粒子同一条弹道，粒子出生位置也取这条）：给定开花高度、升空时间、开花时速度，反解出膛速度和阻力。小 / 中档在还往上冲时开花，大档接近顶点。', items: [
    { sel: 'rtBall', label: '弹道', options: [[0, '线性阻力（给升空时间反解，旧）'], [1, '物理（弹径定终端速度、平方阻力）']] },
    ['rtH', '开花高度', 'm', 50, 700, 1],
    ['rtT', '升空时间', 's', 1, 12, 0.05, P => +P.rtBall !== 1],
    ['rtVb', '开花时弹体速度', 'm/s', 0.5, 80, 0.5],
    ['rtLean', '弹道倾角（+ 向右）', '°', -15, 15, 0.1],
    ['rtD', '弹径（喷口离转轴的距离 = 半径）', 'm', 0.05, 0.8, 0.01],
    ['rtVt', '终端速度（0 = 按弹径算）', 'm/s', 0, 200, 1, P => +P.rtBall === 1],
    { info: 'ballInfo' },
    ['rtBurstD', '开花直径（定游戏内大小的比例）', 'm', 40, 600, 1],
    ['seed', '随机种子', '', 1, 999, 1]
  ] },
  { sec: '尾缀 · 自转螺旋与喷射', show: isEmit, hint: '弹体出膛就带着自转（全程转速不变）；喷口在弹体外缘跟着转圈，把火花切向甩出 → 尾迹上的螺旋：波长 = 弹体速度 ÷ 转速，能看见的圈数 = 转速 × 火花寿命，波幅 ≈ 甩出速度 ÷ 火花阻力。', items: [
    ['rtSpin', '自转转速', '转/秒', 0, 8, 0.05],
    ['rtSpinPh', '起始相位', '圈', 0, 1, 0.01],
    ['rtFling', '切向甩出速度', 'm/s', 0, 15, 0.05],
    ['rtJet', '火星向后喷出速度', 'm/s', 0, 80, 0.5],
    ['rtCone', '火星横向散开', 'm/s', 0, 8, 0.05],
    ['rtPulse', '喷射脉动（星头、白热段、出生率一起忽明忽暗，0 关）', '', 0, 1, 0.01],
    ['rtPulseHz', '脉动频率（按循环周期取整）', 'Hz', 0.5, 20, 0.1, P => P.rtPulse > 0]
  ] },
  { sec: '尾缀 · 星头（循环层）', show: isEmit, hint: '星头 = 曲导筒口的燃烧焰：远处是一个亮点，近处是一小团向后的短焰（不是长棍子）。光晕多为空气 / 镜头散射，不烘进贴图。', items: [
    ['rtHeadSize', '亮核直径', 'm', 0.05, 3, 0.01],
    ['rtHeadI', '亮度', '×', 0, 10, 0.05],
    ['rtHeadFl', '短焰长度（0 = 只有亮点）', 'm', 0, 5, 0.05],
    ['rtHeadFlI', '短焰亮度（× 亮核）', '×', 0, 2, 0.01, P => P.rtHeadFl > 0]
  ] },
  { sec: '尾缀 · 白热段火粉（循环层）', show: isEmit, hint: '极密、极短命的细火花，连成星头后面过曝的白热段（按相机观感：白热时间更长）。循环层贴图在弹体随体坐标里烘，引擎里按弹体速度缩放长度。', items: [
    ['rtARate', '密度', '颗/秒', 0, 40000, 100],
    ['rtALife', '白热时间（中位）', 's', 0.05, 2.5, 0.01],
    ['rtALsig', '白热时间离散（对数标准差）', '', 0, 1.2, 0.01],
    ['rtAJet', '向后喷出速度', 'm/s', 0, 80, 0.5],
    ['rtAKd', '阻力', '1/s', 1, 60, 0.5],
    ['rtACone', '横向散开', 'm/s', 0, 6, 0.05],
    ['rtASize', '颗粒直径', 'm', 0.02, 1, 0.01],
    ['rtAI', '亮度', '×', 0, 5, 0.01],
    ['rtAWarm', '变暗快慢（越大越早变金、变暗）', '', 0.2, 4, 0.05]
  ] },
  { sec: '尾缀 · 金火星（GPU 粒子 · 三档粒径）', show: isEmit, hint: '木炭火花按粒径分三档（细 / 中 / 粗）：越粗越亮、越长寿、阻力越小（d² 定律）→ 有亮有暗、各自错落熄灭。每档在引擎里是一个 GPU 软圆点发射器（手机版 CPU），出生位置、初速按发射器时间取弹道曲线。', items: [
    ['rtFRate', '细 · 出生率', '颗/秒', 0, 8000, 10], ['rtFLife', '细 · 寿命', 's', 0.1, 6, 0.01], ['rtFJit', '细 · 寿命离散', '%', 0, 90, 1], ['rtFSize', '细 · 粒子尺寸', 'm', 0.05, 5, 0.01], ['rtFI', '细 · 亮度', '×', 0, 40, 0.01], ['rtFKd', '细 · 阻力', '1/s', 0.2, 30, 0.05],
    ['rtMRate', '中 · 出生率', '颗/秒', 0, 4000, 5], ['rtMLife', '中 · 寿命', 's', 0.1, 6, 0.01], ['rtMJit', '中 · 寿命离散', '%', 0, 90, 1], ['rtMSize', '中 · 粒子尺寸', 'm', 0.05, 5, 0.01], ['rtMI', '中 · 亮度', '×', 0, 40, 0.01], ['rtMKd', '中 · 阻力', '1/s', 0.2, 30, 0.05],
    ['rtCRate', '粗 · 出生率', '颗/秒', 0, 2000, 1], ['rtCLife', '粗 · 寿命', 's', 0.1, 8, 0.01], ['rtCJit', '粗 · 寿命离散', '%', 0, 90, 1], ['rtCSize', '粗 · 粒子尺寸', 'm', 0.05, 5, 0.01], ['rtCI', '粗 · 亮度', '×', 0, 40, 0.01], ['rtCKd', '粗 · 阻力', '1/s', 0.2, 30, 0.05],
    ['rtSizeJit', '尺寸离散（远处亮度 ∝ 尺寸²）', '±%', 0, 90, 1], ['rtKdJit', '阻力离散', '±%', 0, 90, 1],
    ['rtConeSoft', '散开分布（0 均匀 = 边缘一刀切；1 两个均匀相加 = 中间密、边缘软）', '', 0, 1, 1, P => +P.rtGpuSafe !== 1],
    { sel: 'rtGpuSafe', label: 'GPU 兼容', options: [[0, '旧（GPU 也写 Acceleration 乱流、软边散开写 2 个）'], [1, 'UE 4.24 实测：GPU 不写 Acceleration、Initial Velocity ≤ 2']] }
  ] },
  { sec: '尾缀 · 贴图里的火星（循环层）', show: isEmit, hint: '细火花的一部分烘进循环层贴图（随体坐标，和白热段火花同一套真循环；运动、散开、小涡、拖影和 GPU 细火花同一套公式），其余留在 GPU（细火花出生率 × (1 − 比例)）。细火花寿命短、在面片长度以内就烧完，适合进贴图；中 / 粗火花飞得远、留在 GPU。贴图亮度是灰度 + Ramp 口径（暗的是橙红、亮的是金白），和 GPU 的倍数不通用：1 = 一颗细火花是一颗白热段火花光量的 1%。', items: [
    { sel: 'rtFar', label: '贴图怎么分', options: [[0, '旧：循环层（细 / 中火花按比例进贴图，其余 GPU）'], [1, '近段 + 远段：年轻的进循环层、年老的进远段全程序列，GPU 按档预算再加']] },
    ['rtFTex', '细火星烘进贴图的比例（0 = 全在 GPU）', '', 0, 1, 0.05, P => +P.rtFar !== 1],
    ['rtMTex', '中火星烘进贴图的比例（0 = 全在 GPU）', '', 0, 1, 0.05, P => +P.rtFar !== 1],
    ['rtNearA0', '近段 → 远段：开始交接的年龄', 's', 0.1, 3, 0.05, P => +P.rtFar === 1],
    ['rtNearA1', '近段 → 远段：交接完的年龄', 's', 0.2, 4, 0.05, P => +P.rtFar === 1],
    ['rtNearExpo', '近段贴图曝光（× 实时模拟的曝光；引擎里亮度补回）', '×', 0.2, 1, 0.01, P => +P.rtFar === 1],
    ['rtFarVz', '远段面片上移速度（UE 速度朝向要有速度才竖直）', 'm/s', 0.05, 5, 0.05, P => +P.rtFar === 1],
    ['rtGpuC', '粗火花 · GPU 颗数（同时活着）', '颗', 0, 5000, 10, P => +P.rtFar === 1],
    ['rtGpuM', '闪烁火花（中）· GPU 颗数', '颗', 0, 5000, 10, P => +P.rtFar === 1],
    ['rtGpuF', '细火花 · GPU 颗数', '颗', 0, 5000, 10, P => +P.rtFar === 1],
    ['rtGpuTw', '闪烁火花的闪烁', '', 0, 1, 0.01, P => +P.rtFar === 1 && P.rtGpuM > 0],
    ['rtGpuDisp', 'GPU 火花远看直径（0 = 真实大小；放大时光量不变）', 'm', 0, 6, 0.05],
    ['rtGpuGain', 'GPU 火花远看增益（× 光量不变时的亮度）', '×', 0.1, 20, 0.05, P => P.rtGpuDisp > 0],
    ['rtTexI', '贴图火星亮度', '×', 0, 2000, 0.1, P => P.rtFTex > 0 || P.rtMTex > 0 || +P.rtFar === 1],
    { sel: 'rtTexCal', label: '贴图火星亮度口径', show: P => P.rtFTex > 0 || P.rtMTex > 0 || +P.rtFar === 1, options: [[0, '旧（温度偏移越低越亮，H4）'], [1, '燃烧温度处 = 1（和温度偏移无关）']] },
    ['rtGpuMax', 'PC 上 GPU 粒子同时活着上限（0 = 不限）', '颗', 0, 20000, 50]
  ] },
  { sec: '尾缀 · 引擎里加的效果', show: isEmit, hint: '都是软圆点（不新增材质）。星头光晕：星头强光被空气 / 烟散射成的一团柔光，贴图格子窄放不下，引擎里单独一颗跟着弹道走、亮度跟喷射脉动。末段爆亮：木炭 + 硫的熔渣粒烧到最后微爆、闪一下（线香花火「松叶」同一机理），和粗火花同一套运动。发射口：发射药在炮筒口一闪 + 一把向上喷的火花。', items: [
    ['rtGlow', '星头光晕亮度（0 关）', '×', 0, 5, 0.01], ['rtGlowSize', '星头光晕直径', 'm', 0.5, 30, 0.1, P => P.rtGlow > 0],
    ['rtPopRate', '末段爆亮 · 出生率（0 关）', '颗/秒', 0, 400, 1], ['rtPopI', '末段爆亮 · 亮度', '×', 0, 80, 0.1, P => P.rtPopRate > 0], ['rtPopSize', '末段爆亮 · 尺寸', 'm', 0.05, 3, 0.01, P => P.rtPopRate > 0], ['rtPopAt', '末段爆亮 · 在寿命的哪里闪', '', 0.2, 0.95, 0.01, P => P.rtPopRate > 0],
    ['rtLaunch', '发射口闪光亮度（0 关）', '×', 0, 10, 0.01], ['rtLaunchSize', '发射口闪光直径', 'm', 1, 40, 0.1, P => P.rtLaunch > 0], ['rtLaunchN', '发射口火星颗数', '颗', 0, 1000, 1, P => P.rtLaunch > 0],
    ['rtLaunchV', '发射口火星速度', 'm/s', 2, 80, 0.5, P => P.rtLaunch > 0 && P.rtLaunchN > 0], ['rtLaunchCone', '发射口火星张角', '°', 2, 60, 1, P => P.rtLaunch > 0 && P.rtLaunchN > 0], ['rtLaunchI', '发射口火星亮度', '×', 0, 40, 0.1, P => P.rtLaunch > 0 && P.rtLaunchN > 0]
  ] },
  { sec: '尾缀 · 火星明暗与线状', show: isEmit, hint: '白 / 黄分开：每档火花一个温度偏移（粗粒更热更亮 → 相机里过曝发白；细粒偏金偏暗）。线状：看的人（和相机）盯着星头走，火花相对星头往下退 → 拖影长度 = 相对星头的速度 × 拖影时间（快门 / 视觉暂留）；老火花几乎停在空中，拖得最长。引擎里 Screen Alignment = Rectangle（沿屏幕竖直）、Size By Life 的 Y 按寿命拉长；光量守恒（拖得越长单位长度越暗，要更亮才过曝发白）。', items: [
    ['rtFdT', '细 · 温度偏移', 'K', -800, 800, 10], ['rtMdT', '中 · 温度偏移', 'K', -800, 800, 10], ['rtCdT', '粗 · 温度偏移', 'K', -800, 800, 10],
    ['rtStreakT', '拖影时间（0 = 全是圆点）', 's', 0, 0.2, 0.002],
    ['rtStreakMax', '最长拉长倍数（× 粒子尺寸）', '×', 1, 30, 0.1, P => P.rtStreakT > 0],
    ['rtFStreak', '细 · 拖影倍数（0 = 圆点）', '×', 0, 3, 0.05, P => P.rtStreakT > 0], ['rtMStreak', '中 · 拖影倍数', '×', 0, 3, 0.05, P => P.rtStreakT > 0], ['rtCStreak', '粗 · 拖影倍数', '×', 0, 3, 0.05, P => P.rtStreakT > 0]
  ] },
  { sec: '尾缀 · 空气乱流', show: isEmit, hint: '火花出生后被阻力拉向周围空气的速度：空气有阵风，火花就跟着漂，越老漂得越远 → 尾迹下段慢慢松开、轻轻弯（不是冻住的硬边）。火花寿命远小于大涡的周转时间，所以每颗火花一直跟着「出生那团空气」：大涡 = 同一时刻出生的一起漂（Acceleration 按发射器时间），小涡 / 弹体尾流 = 每颗随机。引擎里加速度 = 阻力 × 空气速度（Acceleration 模块未经 UE 验证）。', items: [
    ['rtTurb', '大涡阵风（均方根，0 关）', 'm/s', 0, 4, 0.05, P => +P.rtGpuSafe !== 1],
    ['rtTurbL', '大涡尺度', 'm', 3, 200, 1, P => P.rtTurb > 0 && +P.rtGpuSafe !== 1],
    ['rtTurbS', '小涡 / 尾流（均方根，0 关）', 'm/s', 0, 4, 0.05]
  ] },
  { sec: '尾缀 · 火星颜色与熄灭', show: isEmit, hint: '颜色按黑体温度：出喷口很热（白），约 tc 秒降到空气中的燃烧温度（金），寿命最后一段降到熄灭温度（橙 → 暗）。闪烁写进 Color Over Life，每颗寿命不同所以相位错开。', items: [
    ['rtT0', '出喷口温度', 'K', 1600, 3000, 10],
    ['rtTb', '燃烧温度', 'K', 1500, 2800, 10],
    ['rtTc', '降到燃烧温度的时间', 's', 0.02, 2, 0.01],
    ['rtTend', '熄灭温度', 'K', 900, 2200, 10],
    ['rtTw', '闪烁', '', 0, 1, 0.01],
    ['rtShrink', '烧到最后的大小（× 出生时）', '×', 0.05, 1.5, 0.01]
  ] },
  { sec: '尾缀 · 落火', show: isEmit, hint: '少量长寿大颗，阻力小、下坠，零星掉在尾迹下方（0 关）。', items: [
    ['rtERate', '出生率', '颗/秒', 0, 200, 1], ['rtELife', '寿命', 's', 0.2, 8, 0.05], ['rtESize', '粒子尺寸', 'm', 0.05, 5, 0.01], ['rtEI', '亮度', '×', 0, 10, 0.01], ['rtEKd', '阻力', '1/s', 0.1, 10, 0.05]
  ] },
  { sec: '尾缀 · 烟带', show: isEmit, hint: '曲导燃烧留下的淡烟，被火花照亮（夜里是散射光，用加法软圆点做成很淡的发光烟，不新增材质）。慢慢变大、变淡（0 关）。', items: [
    ['rtSmoke', '亮度（0 关）', '×', 0, 0.5, 0.001],
    ['rtSmokeRate', '出生率', '团/秒', 1, 200, 1, P => P.rtSmoke > 0],
    ['rtSmokeLife', '寿命', 's', 0.5, 10, 0.05, P => P.rtSmoke > 0],
    ['rtSmokeSize', '出生尺寸', 'm', 0.2, 20, 0.1, P => P.rtSmoke > 0],
    ['rtSmokeGrow', '变大到（× 出生尺寸）', '×', 1, 10, 0.1, P => P.rtSmoke > 0]
  ] },
  { sec: '尾缀 · 引擎与导出', show: isEmit, hint: '循环层：一个速度朝向的序列面片（CPU，1 颗），星头在面片上端（Pivot Offset 放在粒子位置，和 V5 尾缀一样），面片只包住看得见的部分；格子按长宽比在 16×1 / 8×2 / 4×4 里挑（单格 = 512² 像素），RGBA 64 帧真循环。开花后换「贴图动态消散」序列（每颗火花 / 火花按自己的寿命熄灭），格子一样大、贴图按帧数挑最小、四个通道用满；另写 dissolve 动态参数。手机贴图边长 × 比例（默认一半 = 单格 256² 像素）。粒子层：PC 用 GPU、手机用 CPU 并按比例减量。', items: [
    { sel: 'rtLoopSize', label: '循环层长度', options: [[0, '全程不变（4.4，出场淡入）'], [1, '跟真实尾迹（起步从短长出来、减速变短）']] },
    ['rtLoopMin', '循环层最短（× 面片长）', '×', 0.05, 1, 0.01, P => +P.rtLoopSize === 1],
    ['rtGrid', '格子（0 自动；1 = 16×1，2 = 8×2，3 = 4×4）', '', 0, 3, 1],
    ['rtMobileTex', '手机贴图边长比例', '×', 0.25, 1, 0.05],
    ['rtBright', '循环层引擎亮度（Color Over Life）', '×', 0.1, 10, 0.05],
    ['rtDotGain', '粒子层亮度总倍数', '×', 0, 10, 0.01],
    ['rtMobile', '手机版粒子数比例（0 = 手机只有循环层 + 光晕）', '×', 0, 1, 0.01],
    ['rtDissolve', '消散发射器的溶解终值（0 = 不写 dissolve）', '', 0, 1, 0.01],
    ['rtFadeFps', '消散序列帧率（0 = 自动，≤ 30）', 'fps', 0, 30, 1],
    ['shutter', '循环层运动模糊（占每帧显示时间的比例）', '', 0, 1, 0.01],
    ['cellPad', '格子留边', 'px', 0, 8, 1]
  ] },
  { sec: '地面 · 循环', show: isGround, hint: '循环周期内的火花按周期性编号生成，首尾严格接上，不需要交叉淡化。', items: [
    ['loopT', '循环周期', 's', 0.3, 4, 0.05],
    ['seed', '随机种子', '', 1, 999, 1],
    ['nozzles', P => P.type === 'shikake' ? '（无）' : '喷口数', '个', 1, 24, 1, P => P.type !== 'shikake'],
    ['spacing', P => P.type === 'shikake' ? '图案宽度' : '喷口间距', 'm', 0.5, 80, 0.5, P => ['falls', 'fan', 'shikake', 'fountain', 'barrage'].includes(P.type)],
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
  // 入点 / 出点（用户 2026-10-02 13:26 选 B）：先整段模拟、剔掉全黑帧；你在可见范围里选入点、出点，帧预算只分给入点到出点；
  // 入点之前在引擎里用入点那一帧从小放大（Size By Life，比例按花径自动算），或不显示；出点之后直接结束。
  // 4.4.2（用户 10-04 21:17「为什么有些星可以导出成 Cascade 的 GPU 粒子，牡丹星不行？做成通用导出选项」）：以前只有多层效果的层页头有「导出方案」，
  // 单层效果（花型模板、单层条目）只能出序列。现在单层也有，和层页头同一套：PC 序列 / 单束 / GPU 光点 / 不出，手机 序列 / 不出
  { sec: '导出方案', show: P => singleSchemeOn(P), items: [
    { sel: 'outPC', label: 'PC 导出', options: [['seq', '序列（大面片）'], ['unit', '单束（每颗星一个面片，带尾迹）'], ['dots', 'GPU 光点（只出星头）'], ['off', '不出']] },
    { sel: 'outMobile', label: '手机导出', options: [['seq', '序列'], ['off', '不出']] },
    ['dotSize', '光点大小（× 星头）', '×', 0.2, 4, 0.05, P => P.outPC === 'dots'],
    ['dotBright', '光点亮度', '×', 0.1, 4, 0.05, P => P.outPC === 'dots'],
    { info: 'schemeNote' }
  ] },
  { sec: '入点与出点（导出）', show: usesTickPlan40, hint: '时间轴下面的时段条上有「设为入点 / 设为出点」：先看整段（全黑帧已剔掉），在想开始、结束的那一刻点一下。0 = 自动（第一次 / 最后一次看得见）。', items: [
    ['cutIn', '入点（帧从这里开始分配；0 = 第一次看得见）', 's', 0, 30, 0.0333],
    ['cutOut', '出点（0 = 最后一次看得见）', 's', 0, 30, 0.0333],
    { sel: 'preRoll', label: '入点之前', show: P => +P.cutIn > 0, options: [[1, '用入点那一帧从小放大（Size By Life）'], [0, '不显示（发射器延迟到入点）']] },
    ['preScale0', '开始放大时的大小（0 = 按花径自动）', '×', 0, 1, 0.01, P => +P.cutIn > 0 && +P.preRoll !== 0],
    { sel: 'prePivot', label: '放大的中心', show: P => +P.cutIn > 0 && +P.preRoll !== 0, options: [[0, '面片中心（UE 一定支持；花小的时候会偏向面片中心）'], [1, '爆点（用 Pivot Offset，更准，未经 UE 验证）']] }
  ] },
  // 4.2.0（用户 2026-10-02 16:22「单层输出成多少总帧数我也无法控制……能不能梳理一下」）：一节里定「多少帧 → 怎么装进贴图」，顶上一行实时显示结果
  { sec: '输出：帧数 · 格子 · 贴图（导出）', show: isSeq, hint: '帧号由 Dynamic Parameter 的帧号通道给出（通道按本机导入配置，实测第 0 通道）、不做帧间混合。顺序：入点 → 出点之间有多少 tick → 按下面的「帧数」挑出要烘的帧 → 按「格子」装进贴图（RGBA 接力，先填满 R）。改了入出点、寿命，帧数和格子会自动重算；时间轴每层轨道上的小刻度就是每一帧从哪个 tick 开始。', items: [
    { info: 'outSummary', show: usesTickPlan40 },
    { info: 'specBox' },
    ['fpsFloor', '最低帧率', 'fps', 8, 60, 1, P => !isGround(P) && !usesTickPlan40(P)],
    { sel: 'frameBudget', label: '帧数', show: usesTickPlan40, options: [['motion','自动：放得下就每 tick 一帧，放不下按运动分（开花快的地方密）'],['lean','最省：只用到下面「最慢帧率」需要的帧（短的层常常十几二十帧就够）'],['count','手动：自己定总帧数（按运动分配）'],['tiers','分段帧率（开花 / 燃烧 / 淡出各定帧率）'],['full','全程 30 fps（每个 tick 一帧，最费贴图）']] },
    ['frameCount', '总帧数（手动）', '帧', 4, 256, 1, P => usesTickPlan40(P) && P.frameBudget === 'count'],
    { sel: 'outPack', label: '格子', show: usesTickPlan40, options: [['grid','固定：按贴图尺寸和列 × 行（帧少时空格子留着）'],['fit','按帧数选最小贴图：单格不变，格子 1×1 / 2×1 / 2×2 / 4×2 / 4×4 里挑最小的放得下的']] },
    { sel: 'outCell', label: '单格', show: usesTickPlan40, options: [[0,'跟贴图尺寸 ÷ 列数'],[512,'512 px（PC 下限）'],[1024,'1024 px'],[2048,'2048 px']] },
    ['pageTarget', '先放进几张贴图（放不下自动加）', '张', 1, 8, 1, P => usesTickPlan40(P) && (P.frameBudget || 'motion') === 'motion'],
    { sel: 'maxHoldBurn', label: '燃烧段最慢帧率', show: P => usesTickPlan40(P) && ['motion', 'lean', 'count'].includes(P.frameBudget || 'motion'), options: [[2,'15 fps（停 2 tick）'],[3,'10 fps（停 3 tick，默认）'],[4,'7.5 fps（停 4 tick）']] },
    { sel: 'maxHold', label: '淡出段最慢帧率', show: P => usesTickPlan40(P) && ['motion', 'lean', 'count'].includes(P.frameBudget || 'motion'), options: [[2,'15 fps（停 2 tick）'],[3,'10 fps（停 3 tick）'],[4,'7.5 fps（停 4 tick）'],[5,'6 fps（停 5 tick）']] },
    { sel: 'fpsBurst', label: '开花段帧率', show: P => usesTickPlan40(P) && P.frameBudget === 'tiers', options: [[30,'30 fps'],[15,'15 fps']] },
    ['burstSec', '开花段时长（这段每 tick 一帧）', 's', 0, 2, 0.05, usesTickPlan40],
    { sel: 'fpsActive', label: '燃烧段帧率', show: P => usesTickPlan40(P) && P.frameBudget === 'tiers', options: [[30,'30 fps'],[15,'15 fps'],[10,'10 fps']] },
    { sel: 'fpsFade', label: '淡出段帧率', show: P => usesTickPlan40(P) && P.frameBudget === 'tiers', options: [[30,'30 fps'],[15,'15 fps'],[10,'10 fps'],[7.5,'7.5 fps']] },
    ['fadeAt', '淡出段从第几秒开始（0 = 自动：花径到头且速度降下来）', 's', 0, 20, 0.05, P => usesTickPlan40(P) && P.frameBudget !== 'full'],
    ['maxPages', '贴图张数上限（0 = 不限；超了自动降帧率）', '张', 0, 12, 1, P => usesTickPlan40(P) && P.frameBudget === 'tiers'],
    ['shutter', '运动模糊（占每帧显示时间的比例）', '', 0, 1, 0.01],
    ['trimLead', '开头空白不烘（1 = 贴图从第一次看得见开始，引擎用发射器延迟补上；0 = 从开花起烘）', '', 0, 1, 1, P => P.form === 'master' || usesTickPlan40(P)],
    ['unitElev', '代表星仰角', '°', -60, 60, 1, P => P.form === 'unit' && isAir(P)],
    ['cellPad', '格子留边', 'px', 0, 8, 1]
  ] },
  { sec: '光点与曝光（4.0）', show: () => true, hint: '尺寸表示亮核直径。曝光固定，不随亮度和尺寸自动改变；光晕与亮核分开调。', items: [
    { sel: 'coreProfile', label: '亮核分布', options: [[0,'均匀亮核（兼容）'],[1,'渐变亮核']] },
    ['exposure', '贴图曝光', '×', .001, 20, .001, P => !P.exposureLock],
    ['exposureTarget', '建议亮部目标', '', .5, .98, .01],
    { sel: 'exposureLock', label: '锁定曝光', options: [[0,'未锁定（曝光仍固定）'],[1,'已锁定']] },
    ['haloFrac', '光晕能量占比', '', 0, .85, .01],
    ['haloR', '光晕半径 / 亮核半径', '×', 1, 8, .1],
    { sel: 'previewBloom', label: '额外预览光晕', options: [[0,'关闭（UE Bloom 另算）'],[1,'开启']] }
  ] },
  { sec: '画质（烘焙采样）', show: P => isSeq(P) || isEmit(P), hint: '空间超采样和快门子样本。光点按像素覆盖积分画（亚像素的点总光量也对）。', items: [
    ['qSS', '空间超采样（每边）', '×', 1, 8, 1],
    ['qHz', '快门采样频率', 'Hz', 120, 1920, 30],
    ['qMaxSub', '每帧最多子样本', '次', 1, 128, 1]
  ] }
];
