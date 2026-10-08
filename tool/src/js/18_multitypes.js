// =====================================================================
//  4.5.5 多层花型模板（对话框新花型；用户 2026-10-05 17:18「增加多层花型库（譬如参考图这种），参考之前花型库的实现方式……需要有现实理论配方依据」）
//  写法和花型模板（10_types.js 的 TYPES）一样：每层 = 现有花型 + 参数覆盖 p + 颜色 m，另外有层名、英文层名、延迟、显示强度。
//  不加新的模拟能力：每层就是一个普通的单层花型，多层效果的查看器、引擎回放、导出（一个包、每层一个发射器）都是现成的。
//  依据（芯物结构、同开同灭、半径比、发色剂、评判标准、每个模板的出处和核实状态）：analysis/原理/多层花型库.md
//  · 芯的初速按目标半径反推：v0 = v0For(R × 半径比, 终端速度, 燃烧时间)（二次阻力，和号数表 applyShellNo 同一个公式）
//  · 同一个模板所有层同一燃烧时间、燃烧离散小（同时熄灭 = 消え口）；变色时刻各层一样（変化の揃い）
//  · 只有亲星层带开花闪光（几层都闪会叠成过曝）
//  · 打开 = 多层查看器（lib.key = 'mt:<id>'）；「保存」= 存成「我的效果（派生自 ×）」，和花型模板同一条路
// =====================================================================
// 渐变图：彩色星的颜色由 Color Over Life（stages）给，渐变图用中性（配方总表 1.2：Ramp 中性）；炭火金尾用暖色
const MT_RAMP_NEUTRAL = { ramp0: '#000000', ramp1: '#4a4f5c', ramp2: '#c9ced9', ramp3: '#ffffff' };
const MT_RAMP_GOLD = { ramp0: '#000000', ramp1: '#8a3a10', ramp2: '#ffc979', ramp3: '#fff6e8' };
const MT_RAMP_SILVER = { ramp0: '#000000', ramp1: '#5d6680', ramp2: '#dfe6ff', ramp3: '#ffffff' };
// 焰色（发色剂见原理文档第 2 节；sRGB 起点，按游戏内大小看过调）
const MT_COL = { red: '#ff3b2a', magenta: '#ff66c4', pink: '#ff7ac4', green: '#5cff66', lime: '#b4ff4a', blue: '#4f7bff', purple: '#b35cff',
  yellow: '#ffc53a', orange: '#ff8a2e', silver: '#eef2ff', gold: '#ffd29a', warm: '#fff0da',
  lemon: '#eaff52', mint: '#c8ffb0', redOrange: '#ff5a2a', amber: '#ffa640',
  violetBlue: '#6a4dff' };     // 4.9.15 参考图 1 的铜蓝（相机里偏紫，光晕 RGB ≈ 62, 36, 151）     // 4.9.6 第二批：柠黄 / 白绿（球形 D 的四段）、橙红点火药（球形 C 的芯）、橙金芯
// 半径比（芯 / 亲星）：参考图（八重芯）量到 1 : 0.61 : 0.32；层数多时每层间距按同样的比例收（原理文档第 3 节）
const MT_RATIO = { 1: [0.55], 2: [0.61, 0.32], 3: [0.70, 0.48, 0.27], 4: [0.74, 0.55, 0.38, 0.22], 5: [0.78, 0.62, 0.47, 0.33, 0.19] };
// 芯星比亲星小 → 终端速度低（vt ∝ √星径）；层越靠里越小
const MT_VT = [21, 18, 16.5, 15.5, 14.5, 13.5];
// 组：左栏「多层花型模板」里的小标题
const MT_GROUPS = ['芯物（同心多重芯）', '冠 · 效果芯', '中式复合', '半割物 · 千轮', '单层变体（颜色 / 尾）', '型物 · 分簇（万華鏡 / 染分）'];     // 后两组 4.9.6 第二批；最后一组 4.9.16（分簇 + 整套簇转角）
// 一层：c = 颜色（字符串，或 stages 数组），ramp = 渐变图；k = 半径比（亲星 1）
const mtL = (title, en, type, k, p = {}, c = MT_COL.warm, ramp = MT_RAMP_NEUTRAL, o = {}) => ({ title, en, type, k, p, m: { stages: Array.isArray(c) ? c : [[0, c]], xw: 0.1, ...ramp }, ...o });
// 芯（无尾牡丹星）：内层小而密——星数按半径比收得比面积慢（芯星小、排得密），星头略小于亲星
const mtCore = (title, en, k, c, p = {}, o = {}) => mtL(title, en, 'botan', k, { stars: Math.round(Math.max(90, 400 * Math.pow(k, 0.5))), headSize: +(0.78 + 0.25 * k).toFixed(2), sparkRate: 0, flicker: 0.15, ...p }, c, MT_RAMP_NEUTRAL, o);
// 亲星 · 菊（带尾）：炭火短尾；前段「引」（橙色带尾、星头暗）→ 色光无尾，用 sparkStop + headDim（和青柠星同一个机制）
// 4.9.17 老火花先暗（用户 10-06 17:57 第 5 条）：4.7.0 起火花按年龄降温，亲星菊的尾比 4.6.0 短（亮面积少 7–11%）；
// 本机 NF3 扫冷却倍数，面积回到旧版的倍数 0.74–0.76（芯入菊 / 八重芯 / 三重芯）→ 冷却 0.42 × 0.76 ≈ 0.32
const MT_KIKU_COOL = 0.32, MT_KAMURO_COOL = 0.26;     // 锦冠层：花型模板默认 0.35，扫出来 0.755 倍（芯入锦冠菊，面积少 12–19%）→ 0.26
const mtOyaKiku = (title, en, c, p = {}, ramp = MT_RAMP_GOLD) => mtL(title, en, 'kiku', 1, { stars: 380, headSize: 1.0, headBright: 1.5, sparkRate: 130, sparkLife: 0.36, sparkSpread: 1.8, T0: 2400, cooling: MT_KIKU_COOL, ...p }, c, ramp);
const mtOyaBotan = (title, en, c, p = {}) => mtL(title, en, 'botan', 1, { stars: 360, headSize: 1.05, sparkRate: 0, flicker: 0.15, ...p }, c, MT_RAMP_NEUTRAL);
// 一组芯：colors 从外到内，按层数取半径比
const mtCores = (colors, p = {}) => colors.map((c, i) => { const k = MT_RATIO[colors.length][i]; return mtCore('芯 ' + (i + 1) + ' · ' + c[0], c[1], k, c[2], p); });
// 变色时刻（引 → 第一色 → 第二色），一个模板里各层共用
const HK = { hiki: 0.5, c2: 1.55, c3: 2.35 };     // c3：4.9.22 八重芯变化菊多一段
// ---------------- 4.9.22 配方系统（对话框新花型；用户 10-07 00:33「每个配方都考究一些，动态效果明显一些，造型更丰富一些
//（譬如菊和银菊你就是直接复制，改颜色）连造型速度星数量这些一点都不动」）。依据：协作/花型配方总表.md 1.1 号数、1.3 尾的成分；原理 analysis/原理/多层花型库.md 5.2 ----------------
// 尾的药（星外层的火花药）：金 = 木炭（负氧平衡，炭粒甩在后面慢慢烧，金→橙、尾长后段暗）；錦 = 木炭 + 钛（火花更多更久、下坠成帘）；
// 銀 = 钛（白、亮、短、颗粒粗、会分叉迸开、一闪一闪）；白 = 铝（白、细、比钛顺、不分叉）。数值是 6 号起点，号数大了按下面 mtGoScale 缩放
const MT_MAT = {
  kin: { T0: 2400, cooling: MT_KIKU_COOL, sparkRate: 130, sparkLife: 0.36, sparkSpread: 1.8, sparkInherit: 0.2, sparkGrav: 1, twinkle: 0.6 },
  nishiki: { T0: 2150, cooling: 0.22, sparkRate: 170, sparkLife: 0.85, sparkLifeJit: 35, sparkSpread: 1.2, sparkInherit: 0.12, sparkGrav: 0.55, sparkDrag: 2.4, twinkle: 0.35, tailShoulder: 0.25 },
  gin: { T0: 2950, cooling: 0.55, sparkRate: 150, sparkLife: 0.3, sparkLifeJit: 50, sparkSpread: 3.4, sparkSize: 0.3, sparkInherit: 0.28, branch: 1, branchAt: 0.55, twinkle: 0.9, sparkBright: 1.3 },
  haku: { T0: 3050, cooling: 0.45, sparkRate: 150, sparkLife: 0.46, sparkSpread: 1.5, sparkSize: 0.28, sparkInherit: 0.25, twinkle: 0.45, sparkBright: 1.15 }
};
// 号数（go）：模板以前的数值都是按「约 6 号」（亲星熄灭半径 95 m、燃烧 2.9 s）定的。模板写了 go 就按号数表（10_types.js SHELL_NO）缩放：
//   半径 = 表里开花直径 / 2 × 0.95；燃烧和所有时刻（变色、尾停、星头先暗、点火延迟、子花开花、余烬）× 燃烧比；
//   星数 ×（星数比）^0.6（贴图分辨率固定，按表线性加会糊成一片）；星头、子星 × 星头比；终端速度 × 表里的比；
//   火花寿命 × 燃烧比（尾占花径的比例不变）、火花密度 ÷ 燃烧比（每颗星同时活着的火花数不变）；火花颗粒 × 直径比^0.6（大玉细节更细）。
// 没写 go 的模板（照参考调过的）一个数都不动
function mtGoScale(go) {
  const r = shellRow(go), b = shellRow(6);
  return { R: r[1] / 2 * 0.95, kR: r[1] / b[1], kT: r[4] / b[4], kStar: Math.pow(r[3] / b[3], 0.6), kHead: r[6] / b[6], kVt: r[5] / b[5] };
}
// 4.9.37 金蕊柠（kinzuiLime）：两个模拟（同种子 / 星数 / 初速 / 终端速度 / 燃烧 → 同一模拟拆出来的两层星位重合）。按实拍花径拟合（analysis/原理/金蕊青柠星.md「物理」）：
//   外层 +0.4 / 1.2 / 2.0 / 2.8 / 3.6 s 的花径比 0.54 : 1 : 1.24 : 1.38 : 1.46；芯星很快停下来（+1.3 s 以后不再张大、几乎不坠，约外层 +1.2 s 的 0.41）
const MT_JQ = {
  out: { seed: 23, stars: 450, v0: 160, vt: 18, grav: 1, speedJit: 2, dirJit: 1.5, burn: 3.8, burnJit: 4, fade: 0.15, lastFlare: 0, ignDelay: 0 },
  core: { seed: 31, stars: 300, v0: 130, vt: 9.5, grav: 0.5, speedJit: 3, dirJit: 1.5, burn: 2.15, burnJit: 6, lastFlare: 0, ignDelay: 0.06, ignJit: 10 }
};
const MT_RAMP_WARM = { ramp0: '#000000', ramp1: '#8a3a10', ramp2: '#ffa850', ramp3: '#fff6e0' };     // 橙引尾：暖色（灰色渐变图会把橙压成褐，青柠星 QN12 看过；中段偏黄一点，JQ4E1 橙尾偏红）
const MT_RAMP_GOLD_HOT = { ramp0: '#000000', ramp1: '#b8681e', ramp2: '#ffe0a0', ramp3: '#ffffff' };     // 金蕊：比 MT_RAMP_GOLD 亮（暗的火花不发褐），亮处到白
const MT_TIME_KEYS = ['sparkLife', 'sparkStop', 'sparkStart', 'headDimUntil', 'ignDelay', 'subDelay', 'subBurn', 'emberLife', 'crackleDelay'];
const MULTI_TYPES = [
  // ---------------- 芯物 ----------------
  { id: 'shinKiku', name: '芯入菊', en: 'ShinKiku', group: 0, burn: 2.9, go: 5,
    note: '亲星金菊（木炭短尾）+ 1 层青色芯。芯物最基本的形式：同一爆点同时开、同时灭，芯约为亲星半径的 0.55。5 号玉（开花直径约 160 m、燃烧约 2.6 s）：芯物里最小最快的一发。',
    src: 'Walkerplus「芯」解说：亲星不计入芯数，1 层芯 = 芯入', layers: [
      mtOyaKiku('亲星 · 金菊', 'Kiku', MT_COL.gold),
      ...mtCores([['青', 'Blue', MT_COL.blue]])] },
  { id: 'shinBotan', name: '芯入牡丹', en: 'ShinBotan', group: 0, burn: 2.8, go: 4,
    note: '红牡丹（无尾）+ 1 层绿芯。红（锶）绿（钡）对比色，最常见的芯入牡丹配色。4 号小玉（开花直径约 120 m、燃烧约 2.3 s），星头一闪一闪（闪烁 0.25）。',
    src: '牡丹 = 无尾星（Walkerplus 花火の種類）；红 / 绿发色剂见原理第 2 节', layers: [
      mtOyaBotan('亲星 · 红牡丹', 'Red', MT_COL.red, { flicker: 0.25 }),
      ...mtCores([['绿', 'Green', MT_COL.green]])] },
  { id: 'yaeshin', name: '八重芯 · 银菊洋红绿', en: 'Yaeshin', group: 0, burn: 2.9, go: 7,
    note: '参考图：外层银菊 + 洋红芯 + 绿芯，三圈同心。4.9.22：银菊的尾换成钛火花——白、亮、短、颗粒粗，一部分火花半路迸成两粒、一闪一闪（不再是金菊改个颜色）；7 号玉（开花直径约 210 m）。八重芯 = 亲星 + 2 层芯（「八重」是「多重」的意思，不是 8 层）。半径比按参考图量的 1 : 0.61 : 0.32。',
    src: '用户参考图（2026-10-05）；All About「八重芯変化菊」、Walkerplus 八重芯 / 三重芯解说', layers: [
      mtOyaKiku('亲星 · 银菊（钛火花）', 'Kiku', MT_COL.warm, { ...MT_MAT.gin, headBright: 2 }, MT_RAMP_SILVER),
      mtCore('芯 1 · 洋红', 'Magenta', MT_RATIO[2][0], MT_COL.magenta, { stars: 360, headSize: 1.0 }),
      mtCore('芯 2 · 绿', 'Green', MT_RATIO[2][1], MT_COL.lime, { stars: 200 })] },
  { id: 'yaeBlueBotan', name: '八重芯青牡丹 · 金银芯', en: 'YaeshinBlueBotan', group: 0, burn: 2.9,
    note: '用户参考图 1（4.9.15 按 3D 重做）：亲星青牡丹（无尾，偏紫的铜蓝）；金线是单独一层金菊，112 颗星分成 14 簇（立方 6 轴 + 8 角），顺轴看就是 8 束——轴向 4 束长、对角 4 束短，对着镜头的 2 簇缩进中心；整套按参考图转 14°，每簇星数、方向略有随机（4.9.17）；金色火花亮得久、几乎不动，整条飞行路径留在空中；里面一圈橙色短尾芯、中心一团过曝的银白芯。',
    src: '用户参考图 1（2026-10-05 20:43、10-06 14:55 / 15:22 指出金线分 8 簇）；伊势神宫奉纳花火大会玉名「八重芯ブルー牡丹」；原理 analysis/原理/多层花型库.md 1c', layers: [
      mtOyaBotan('亲星 · 青牡丹', 'Blue', MT_COL.violetBlue, { headSize: 1.0, stars: 420 }),
      // 金线：分簇（14 簇 × 8 颗；倾斜 3° 让对角两簇微微错开、不完全重合；金星终端速度试过 26：早期飞不到参考的 0.9，退回默认）；火花几乎不继承星速、散得少、下坠小、冷却很慢、寿命长 → 从中心到星头一整条亮线（4.7.0 起老火花先暗，冷却要很慢才连得回中心）
      // 4.9.17：整套转 14°（参考图 8 束方位 12 / 65 / 105 / 153 / 197 / 238 / 285 / 323°，比轴向平均多转约 15°）；每簇星数 ±30%、方向随机 3°（手工装的一撮撮不一样多、不完全对齐）
      mtL('金线 · 金菊（分簇）', 'GoldSpokes', 'kiku', 0.9, { stars: 112, pattern: 'cluster', clusterLayout: 'cube', clusterCone: 7, tilt: 3, clusterRoll: 14, clusterStarsJit: 30, clusterDirJit: 3, headSize: 0.75, headBright: 0.6,
        sparkRate: 300, sparkLife: 2.0, sparkLifeJit: 20, sparkSpread: 0.35, sparkInherit: 0.02, sparkGrav: 0.15, sparkDrag: 4, T0: 2250, cooling: 0.1 }, MT_COL.gold, MT_RAMP_GOLD),
      mtL('芯 1 · 橙菊（毛圈）', 'Orange', 'kiku', 0.58, { stars: 320, headSize: 0.8, headBright: 1.2, sparkRate: 130, sparkLife: 0.32, T0: 2150, cooling: 0.4 }, MT_COL.amber, MT_RAMP_GOLD),
      mtL('芯 2 · 银白菊', 'Silver', 'kiku', 0.4, { stars: 340, headSize: 1.0, headBright: 1.4, sparkRate: 170, sparkLife: 0.35, T0: 2800, cooling: 0.3 }, MT_COL.silver, MT_RAMP_SILVER, { hi: 1.6 })] },
  { id: 'yaeHenka', name: '八重芯变化菊', en: 'YaeshinHenka', group: 0, burn: 3.0, go: 8,
    note: '亲星先「引」（橙色带尾、星头暗）再变红 → 绿 → 黄（三段变化，多度変化）；两层芯同一时刻跟着变（青 → 银白 → 红、黄 → 红 → 绿）。各层同开、同变、同灭（変化の揃い是评分点）。8 号玉（开花直径约 240 m、燃烧约 3.5 s），时刻跟燃烧一起放大。',
    src: '大曲 / 土浦競技大会常见玉名「八重芯変化菊」；变色星 = 分层星（外层先烧）', layers: [
      mtOyaKiku('亲星 · 引 → 红 → 绿 → 黄', 'Henka', [[0, MT_COL.orange], [HK.hiki, MT_COL.red], [HK.c2, MT_COL.green], [HK.c3, MT_COL.yellow]], { sparkStop: HK.hiki, headDim: 0.18, headDimUntil: HK.hiki, sparkLife: 0.5, sparkRate: 150 }, MT_RAMP_NEUTRAL),
      mtCore('芯 1 · 青 → 银白 → 红', 'BlueSilverRed', MT_RATIO[2][0], [[0, MT_COL.blue], [HK.c2, MT_COL.silver], [HK.c3, MT_COL.red]]),
      mtCore('芯 2 · 黄 → 红 → 绿', 'YellowRedGreen', MT_RATIO[2][1], [[0, MT_COL.yellow], [HK.c2, MT_COL.red], [HK.c3, MT_COL.green]])] },
  { id: 'mieshin', name: '三重芯 · 银红青', en: 'Mieshin', group: 0, burn: 3.0, go: 10,
    note: '亲星錦菊（木炭 + 钛：火花多、寿命长、慢慢往下坠，尾比金菊长一倍多、后段暗红）+ 银 / 红 / 青三层芯（四圈）。大曲「芯入割物の部」要求三重芯以上（10 号玉）：尺玉，开花直径约 300 m、燃烧约 3.9 s，星多、动作慢。',
    src: 'All About 三重芯实例「銀、紅、青」；about-fireworks 大曲芯入割物の部（10 号、三重芯以上）', layers: [
      mtOyaKiku('亲星 · 錦菊（木炭 + 钛）', 'Kiku', MT_COL.gold, { ...MT_MAT.nishiki, sparkLife: 0.6 }),     // 4.9.22 錦：尾长、往下坠；芯多，寿命比纯錦（0.85）短一点，里面几圈看得清
      ...mtCores([['银白', 'Silver', MT_COL.silver], ['红', 'Red', MT_COL.red], ['青', 'Blue', MT_COL.blue]])] },
  { id: 'yoeshin', name: '四重芯 · 红绿紫桃', en: 'Yoeshin', group: 0, burn: 3.0, go: 10,
    note: '亲星银白牡丹（铝白星，星头一闪一闪）+ 红 / 绿 / 紫 / 桃四层芯（五圈）。层间距按半径比收，内圈小而密。尺玉（开花直径约 300 m）。',
    src: 'All About 四重芯实例「紅、緑、紫、ピンク」', layers: [
      mtOyaBotan('亲星 · 银白（铝）', 'Silver', MT_COL.silver, { flicker: 0.45, headBright: 1.3 }),
      ...mtCores([['红', 'Red', MT_COL.red], ['绿', 'Green', MT_COL.green], ['紫', 'Purple', MT_COL.purple], ['桃', 'Pink', MT_COL.pink]])] },
  { id: 'itsueHenka', name: '五重芯变化菊', en: 'ItsueshinHenka', group: 0, burn: 3.1, go: 10,
    note: '亲星「引 → 红 → 绿」+ 五层芯（六圈），芯和亲星同一时刻变色。竞技大会最高难度的芯物（尺玉）：星排得很匀、速度和燃烧几乎一样（初速离散 2%、燃烧离散 2%、方向离散 0.6°）→ 六个圈又圆又薄、同时灭。游戏里 6 个发射器，内圈面片小。',
    src: '土浦全国花火競技大会 10 号玉「昇り曲導付五重芯変化菊」（野村花火工業）等；about-fireworks：2017 年起五重芯（六圈）参赛', layers: [
      mtOyaKiku('亲星 · 引 → 红 → 绿', 'Henka', [[0, MT_COL.orange], [HK.hiki, MT_COL.red], [HK.c2, MT_COL.green]], { sparkStop: HK.hiki, headDim: 0.18, headDimUntil: HK.hiki, sparkLife: 0.5, sparkRate: 150 }, MT_RAMP_NEUTRAL),
      ...[['黄 → 青', 'YellowBlue', [[0, MT_COL.yellow], [HK.c2, MT_COL.blue]]], ['银白 → 红', 'SilverRed', [[0, MT_COL.silver], [HK.c2, MT_COL.red]]],
        ['紫 → 黄', 'PurpleYellow', [[0, MT_COL.purple], [HK.c2, MT_COL.yellow]]], ['绿 → 桃', 'GreenPink', [[0, MT_COL.green], [HK.c2, MT_COL.pink]]], ['红 → 银白', 'RedSilver', [[0, MT_COL.red], [HK.c2, MT_COL.silver]]]]
        .map((c, i) => mtCore('芯 ' + (i + 1) + ' · ' + c[0], c[1], MT_RATIO[5][i], c[2]))].map(l => ({ ...l, p: { ...l.p, speedJit: 2, burnJit: 2, dirJit: 0.6 } })) },     // 4.9.22 竞技玉：圆、薄、齐
  { id: 'yaeStrobe', name: '八重芯 · 银点灭', en: 'YaeshinStrobe', group: 0, burn: 3.2, go: 6,
    note: '亲星银白点灭（后半程一明一灭）+ 红、青两层芯。PC 的点灭层默认导出成 GPU 光点（方波，不混叠），手机仍是序列。',
    src: '土浦 10 号玉「昇曲付五重芯銀点滅」（层数减为八重芯，游戏开销小）；点灭化学与频率见配方总表 1.4（Corbel 2013）', layers: [
      mtL('亲星 · 银点灭', 'Strobe', 'strobe', 1, { stars: 320, headSize: 1.0, strobeHz: 9, strobeDuty: 0.32, strobeStart: 0.32 }, [[0, MT_COL.orange], [0.45, MT_COL.silver]], MT_RAMP_SILVER, { out: { pc: 'dots', mobile: 'seq' } }),
      ...mtCores([['红', 'Red', MT_COL.red], ['青', 'Blue', MT_COL.blue]])] },
  // ---- 4.9.6 第二批（对话框新花型，用户 10-06 07:18「开始做不用依赖新功能的」）：只用现有能力（延时点火、火花停、星头先暗、点灭、辉星、千轮……）----
  { id: 'jisaShinBotan', name: '芯入变化牡丹 · 时差', en: 'ShinBotanJisa', group: 0, burn: 2.9,
    note: '球形 C 那种：芯先开（开头一圈橙红短放射、过亮发白，再变青柠绿），亲星开花时是暗的、0.4 s 后才点亮（时差 = 星外面先烧一层不发光的引药），银白短尾 → 金 → 橙，最后一颗颗陆续熄灭。开花闪光放在芯上（亲星开头是暗的，闪光放亲星上会留出中间空帧）。',
    src: '项目参考视频 vidio/球形C.mp4（analysis/原理/球形C.md 逐时刻）；時差 = 延时点火（配方总表 0.2「时间 · 時差」）', layers: [
      mtL('亲星 · 时差 银 → 金 → 橙', 'Jisa', 'botan', 1, { stars: 300, headSize: 1.05, flicker: 0.15, ignDelay: 0.4, ignJit: 10, burnJit: 25, sparkRate: 110, sparkLife: 0.3, sparkSpread: 1.6, sparkStop: 1.9, flash: 0 },
        [[0, MT_COL.silver], [1.4, MT_COL.gold], [2.3, MT_COL.orange]], MT_RAMP_NEUTRAL),
      mtCore('芯 · 橙红 → 白 → 青柠', 'LimeCore', 0.45, [[0, MT_COL.redOrange], [0.25, '#ffffff'], [0.4, MT_COL.lime]], { burn: 2.0, flash: 1, sparkRate: 120, sparkLife: 0.2, sparkSpread: 2, sparkStop: 0.25, fade: 0.3 })] },
  { id: 'henkaKikuShin', name: '芯入变化菊 · 四段', en: 'ShinHenkaKiku4', group: 0, burn: 4.2,
    note: '球形 D 那种：亲星金色长尾菊（0.9 s 尾停）→ 柠黄 → 白绿 → 绿 → 银白四段变色；橙金芯（无尾），1.8 s 前后先灭。实拍最后 +3 s 起的银色细短线没做（是否相机拖影还没定，见球形 D 原理第「请你核对」3）。',
    src: '项目参考视频 vidio/球形D.mp4（analysis/原理/球形D.md 逐时刻）；変化菊 = 分层星多段变色', layers: [
      mtOyaKiku('亲星 · 金 → 柠黄 → 绿 → 银白', 'Henka4', [[0, MT_COL.gold], [0.9, MT_COL.lemon], [1.1, MT_COL.mint], [1.3, MT_COL.green], [2.6, MT_COL.silver]], { sparkStop: 0.9, sparkLife: 0.45, sparkRate: 150 }, MT_RAMP_NEUTRAL),     // 中性渐变图：尾只在金色段，银白段不被金色渐变图染暖
      mtCore('芯 · 橙金', 'Orange', 0.55, MT_COL.amber, { burn: 1.8, stars: 380, fade: 0.3 })] },
  // ---- 4.9.37（对话框新花型，用户 10-07 23:02「金蕊青柠星的参考，可以重新拆解帧数，用现有的模板进行分层调试，给我出一个模板，起名尽量用3字，每个名字能看到结构与颜色造型」）----
  // 逐帧拆解：analysis/原理/金蕊青柠星.md；对着实拍调的条目 JQ<n>（analysis/scripts/金蕊柠.py 从这里取参数生成，模板 = 待验收的那一版）。
  // 两个模拟（外层 / 芯）各拆两层（头尾异色：一个发射器只有一条颜色曲线），层名 = 颜色 + 造型 + 位置；数值都是照参考调的，不走号数缩放
  { id: 'kinzuiLime', name: '金蕊柠', en: 'GoldCoreLime', group: 0, burn: 3.8,
    note: '金蕊青柠星：外层是分层星——开花先拉一团橙红放射尾（橙引尾，星头暗着），+0.4 s 起尾巴尖上的星头从暗亮起来（起势）、+1 s 全亮、之后转柠绿，越烧越小越暗，+3.85–4.0 s 一起熄灭，星后面拖一条很淡的青绿细线（柠点星）；'
      + '芯是金色木炭尾的小菊（金菊蕊：+1.2 s 前淡黄白 → 金 → 琥珀橙，一根根金丝从芯心到星头，+2.7 s 前收完），芯星的星头 +0.9 s 起在芯外缘一颗颗淡紫白小点（红点蕊）。四层一个素材包。',
    src: '项目参考视频 vidio/2.0/金蕊青柠星_B.mp4、金蕊青柠星.mp4（analysis/原理/金蕊青柠星.md 逐帧）；外层和青柠星（analysis/原理/青柠星.md，QN12）同一种分层星', layers: [
      // 4.9.40 按打点重做（用户 10-08 08:34 / 08:58 / 09:06）：analysis/原理/金蕊青柠星/拆解卡.md 逐项量 → 候选对比（analysis/scripts/候选对比.py，NFJV1–5，同一把尺子和实拍比，看法在 analysis/results/NFJV*/）
      { title: '橙引尾', en: 'LeadTail', type: 'botan', k: 1, p: { ...MT_JQ.out, burn: 1.1, fade: 0.03, flash: 0.6, headSize: 0.8, headBright: 0.02, flicker: 0.15, duration: 1.3,     // 只画火花：星位和柠点星一样（同种子），这一层的星活到 1.1 s 就够
        sparkRate: 1800, sparkRateEnd: 0.12, sparkStop: 0.85, sparkLife: 0.45, sparkLifeJit: 20, sparkSize: 0.36, sparkSpread: 0.22, sparkInherit: 0.05, sparkBright: 3.5, T0: 2200, cooling: 0.2, tailHaze: 0.04, twinkle: 0.2 },     // 火花密、颗粒大、温度高 → 连成丝（实拍沿线起伏 0.06–0.13）；线带 0.48–0.92 R；一直出到 +0.85 s、越来越少（实拍 +0.8 s 橙红线还淡淡地连着星头，+0.5 s 就停的话线和星头之间断开一截；末段 0.35 时靠星头那段太亮）
        m: { stages: [[0, '#ff6a20'], [0.5, '#ff6a20'], [0.78, '#a83812']], xw: 0.15, ramp0: '#000000', ramp1: '#7a2a08', ramp2: '#ff8a3a', ramp3: '#ffd0a0' }, hi: 1.6 },     // 橙红、半透明（实拍里段色相 21°、外段 10–20°），亮端不到白（线尖的亮点是柠点星的星头）；+0.5 s 起慢慢暗成暗红（实拍 +0.3 s 最亮、+0.5 → 1.0 s 慢慢暗）
      { title: '柠点星', en: 'LimeStar', type: 'botan', k: 1, p: { ...MT_JQ.out, burn: 3.9, burnJit: 1.5, fade: 0.04, flash: 0, headSize: 1.55, headBright: 1.6, flicker: 0.5, shutter: 0.5, duration: 4.5,     // 集中熄灭（+3.85–4.0 s）；快门拉长 = 前段快时略拉长、后段圆（实拍拉长比 1.26 → 1.06）；flicker 让星头亮度各自轻微起伏
        coreProfile: 1, haloFrac: 0.45, haloR: 3,     // 白芯 + 小光晕（实拍光晕能量 0.05–0.12）
        starBrightCurve: '0:0.03, 0.07:0.05, 0.1:0.35, 0.14:0.6, 0.2:0.85, 0.26:1, 0.41:1, 0.62:0.9, 0.82:0.78, 0.92:0.62, 1:0.4',     // 起势：+0.3 s 起亮（+0.47 s 橙尾尖上已经看得到小亮点）、+0.55 s 六成、+1.0 s 全亮；之后慢慢暗
        starSizeCurve: '0:0.6, 0.14:0.75, 0.26:1, 0.3:1, 0.5:0.93, 0.75:0.8, 0.92:0.72, 1:0.68',     // 起势时星头小；燃烧中变小（实拍 FWHM 5.5 → 2.9 px）
        sparkStart: 0.9, sparkStop: 2.0, sparkRate: 400, sparkLife: 0.9, sparkLifeJit: 20, sparkSpread: 0.3, sparkInherit: 0, sparkGrav: 0.1, sparkDrag: 3, sparkBright: 0.08, sparkSize: 0.2, T0: 2000, cooling: 0.05 },     // 青绿细线：星后面很淡、细、直、越拉越长的受光烟迹（+1.0–2.7 s）；横向散 0.3（缺省 2.5 会毛成一团）
        m: { stages: [[0, '#ffd8a0'], [0.6, '#fff2c8'], [1.2, '#fff0c8'], [2.0, '#fcffe8'], [2.8, '#fffff4']], xw: 0.2, ramp0: '#000000', ramp1: '#5a6e0c', ramp2: '#e8f048', ramp3: '#ffffff' }, hi: 1.9 },     // 色在渐变图（暗端干净的柠绿、亮端白），颜色曲线近白：早期偏暖（晕 49°）→ 后来柠绿（69°）
      { title: '金菊蕊', en: 'GoldCore', type: 'kiku', k: 0.4, p: { ...MT_JQ.core, flash: 0, fade: 0.25, headSize: 0.75, headBright: 0.6, flicker: 0.15, duration: 2.9,
        sparkRate: 900, sparkRateEnd: 0.4, sparkStop: 1.7, sparkLife: 1.7, sparkLifeEnd: 0.6, sparkLifeJit: 20, sparkSize: 0.35, sparkSpread: 0.5, sparkInherit: 0.05, sparkGrav: 0.3, sparkDrag: 3, sparkBright: 1.5, T0: 2300, cooling: 0.15, tailHaze: 0.03, twinkle: 0.15 },     // 早出的火花活得长（+1.8 s 金丝还从芯心连到星头），晚出的短（+2.7 s 前收完）；底光 0.03（再多芯就成一整块白盘）
        m: { stages: [[0, '#fff0c8'], [1.2, '#ffe2a8'], [1.45, '#ffb050'], [1.7, '#b0663a'], [2.05, '#6a3016'], [2.4, '#2a1006']], xw: 0.3, ...MT_RAMP_GOLD_HOT }, hi: 2.4 },     // +1.2 s 前淡黄白 → 金 → +1.8 s 琥珀（实拍 27°）→ +2.2 s 暗红橙 → +2.5 s 几乎黑。颜色本身要压暗：芯这时 v 接近 1，亮的颜色 × 4 × 显示强度在显示端会饱和成黄白（每段在 ±0.15 s 里过渡，段时刻要比想要的早一点）
      { title: '红点蕊', en: 'RedCore', type: 'botan', k: 0.4, p: { ...MT_JQ.core, flash: 0, fade: 0.3, headSize: 1.0, headBright: 1.6, flicker: 0.15, sparkRate: 0, duration: 2.6, coreProfile: 1, haloFrac: 0.3, haloR: 2.5 },
        m: { stages: [[0, '#fff0d0'], [0.9, '#f4c8ff']], xw: 0.25, ...MT_RAMP_NEUTRAL }, hi: 5.5 }] },     // 芯外缘一颗颗淡紫白小点（光晕大了会糊成一圈洋红光环）
  { id: 'mieStrobeKiku', name: '三重芯点灭菊', en: 'MieshinStrobeKiku', group: 0, burn: 3.0, go: 10,
    note: '亲星先是金色带尾的菊，1.0 s 尾停、星头变银白开始一明一灭（点灭菊）；里面红 / 绿 / 青三层芯（芯的颜色玉名没写，按常见配色）。亲星有尾，所以导出走序列（不走光点）。',
    src: '伊势神宫奉纳花火大会玉名「三重芯点滅菊」（伊势市 PDF）；点灭化学与频率见配方总表 1.4', layers: [
      mtOyaKiku('亲星 · 金菊 → 银点灭', 'StrobeKiku', [[0, MT_COL.gold], [1.0, MT_COL.silver]], { sparkStop: 1.0, sparkLife: 0.4, strobeHz: 9, strobeDuty: 0.32, strobeStart: 0.34 }, MT_RAMP_NEUTRAL),
      ...mtCores([['红', 'Red', MT_COL.red], ['绿', 'Green', MT_COL.green], ['青', 'Blue', MT_COL.blue]])] },
  { id: 'mieKamuroSaki', name: '三重芯锦冠先变化菊', en: 'MieshinKamuroSaki', group: 0, burn: 3.4, go: 12,
    note: '亲星前段是金锦冠（长火花慢慢下垂、星头暗），2.2 s 火花停、星头亮起来变红、2.9 s 变绿（「先变化」= 星的末段变色）；尾和星头颜色不同，亲星拆成同一模拟的两层（尾 / 星头）。里面银白 / 青 / 绿三层芯（金色火花里红芯看不清，芯避开红）。',
    src: '伊势神宫奉纳花火大会玉名「三重芯錦冠先変化菊」（伊势市 PDF）；锦冠见配方总表 1.3', layers: [
      // 星头和尾颜色不同（尾金、星头后段红 → 绿）：一个发射器只有一条颜色曲线 → 拆成同一模拟的两层（同种子、同初速、同星数，星位重合；球形 D 的 YD1 / YD2 同一做法）。
      // 尾层用金色渐变图（火花冷却的暖色过渡），星头层用中性渐变图（红、绿不被染暖）
      mtL('亲星 · 金锦冠（尾）', 'KamuroTail', 'kamuro', 1, { stars: 150, vt: 24, seed: 41, cooling: MT_KAMURO_COOL, sparkStop: 2.2, headBright: 0.06, emberFrac: 0.3 }, MT_COL.gold, MT_RAMP_GOLD, { hi: 0.7 }),
      mtL('亲星 · 星头 金 → 红 → 绿（同一批星）', 'KamuroHead', 'kamuro', 1, { stars: 150, vt: 24, seed: 41, cooling: MT_KAMURO_COOL, sparkRate: 0, headBright: 1.3, headDim: 0.35, headDimUntil: 2.2, flash: 0 }, [[0, MT_COL.gold], [2.2, MT_COL.red], [2.9, MT_COL.green]], MT_RAMP_NEUTRAL, { hi: 1.5 }),     // 先变化那一段要从金色冠尾里跳出来：星头层显示强度 1.5（定帧看过 1.0 不够）
      ...mtCores([['银白', 'Silver', MT_COL.silver], ['青', 'Blue', MT_COL.blue], ['绿', 'Green', MT_COL.green]]).map(l => ({ ...l, hi: 1.4 }))] },
  // ---- 4.9.16（对话框新花型，用户 10-06 17:57「现在能做的3个一起做了」）----
  { id: 'yoeshinKoro', name: '四重芯菊先紫光露', en: 'YoeshinKikuSakiKoro', group: 0, burn: 3.0, go: 10,
    note: '亲星先是金色带尾的菊，2.0 s 尾停、星头变紫（菊先紫），燃烧最后 0.2 s 星头变白、猛地一亮再灭（光露：星熄灭前像挂着露珠一样「ピカッ」一闪；燃烧时间几乎一样，所以整圈差不多同时闪）。尾和星头颜色不同，亲星拆成同一模拟的两层（尾 / 星头）。里面青 / 红 / 绿 / 银白四层芯（芯的颜色玉名没写，按常见配色），和亲星同时灭。',
    src: '伊势神宫奉纳花火大会玉名「四重芯菊先紫光露」（伊势市 PDF）；「露」= 星が消える直前に先端が露を持ったようにピカッと一瞬強く光って消える（UMK テレビ宮崎 2026-08「花火用語に隠された気象の要素」）', layers: [
      // 同一批星（同种子、同终端速度、同燃烧离散）：尾层只画尾，星头层只画星头。燃烧离散收到 2.5%（±0.08 s），光露差不多同时闪
      mtL('亲星 · 金菊（尾）', 'KikuTail', 'kiku', 1, { stars: 360, vt: MT_VT[0], seed: 41, burnJit: 2.5, headSize: 1.0, headBright: 0.06, sparkRate: 130, sparkLife: 0.36, sparkSpread: 1.8, T0: 2400, cooling: MT_KIKU_COOL, sparkStop: 2.0 }, MT_COL.gold, MT_RAMP_GOLD),
      // 光露：星头亮度随寿命在 90% 之后冲到 2.8 倍、保持到 97.5%、最后 2.5% 灭；大小同时放大 1.5 倍。不用「末端爆亮」（lastFlare 只有 0.05 s，烘焙帧抓不稳），也关掉末段淡出（fade，不然闪的那一下被淡掉）。
      // 曝光按紫色那一段量（燃烧 72–86%），光露那一闪本来就该过曝发白
      mtL('亲星 · 星头 金 → 紫 → 光露（同一批星）', 'KikuHead', 'kiku', 1, { stars: 360, vt: MT_VT[0], seed: 41, burnJit: 2.5, headSize: 1.0, headBright: 1.5, sparkRate: 0, flash: 0, fade: 0,
        starBrightCurve: '0:1, 0.9:1, 0.935:2.8, 0.975:2.8, 1:0', starSizeCurve: '0:1, 0.9:1, 0.935:1.5, 1:1.2' }, [[0, MT_COL.gold], [2.0, MT_COL.purple], [2.72, '#ffffff']], MT_RAMP_NEUTRAL, { hi: 1.4, expoAt: [0.72, 0.8, 0.86] }),
      ...mtCores([['青', 'Blue', MT_COL.blue], ['红', 'Red', MT_COL.red], ['绿', 'Green', MT_COL.green], ['银白', 'Silver', MT_COL.silver]])] },
  // ---------------- 冠 · 效果芯 ----------------
  { id: 'kamuroShin', name: '芯入锦冠菊 · 绿芯', en: 'KamuroShin', group: 1, burn: 3.8, go: 15,
    note: '亲星金锦冠（长火花、慢慢下垂成冠，后面拖着很暗很长的木炭余烬）+ 绿芯。1 尺 5 寸（15 号，开花直径约 400 m、燃烧约 6 s）：冠一般做大玉。芯是普通色星（燃烧短），先灭；冠尾留到最后。金冠里用绿芯（钡）对比最强，红芯会被金色火花淹掉。',
    src: '锦冠（炭 + 钛长尾下垂）见配方总表 1.3、鸿巢四尺玉返工；「芯入錦冠菊」为常见玉名', layers: [
      mtL('亲星 · 金锦冠', 'Kamuro', 'kamuro', 1, { stars: 150, vt: 24, cooling: MT_KAMURO_COOL, emberFrac: 0.35, emberLife: 3.5 }, MT_COL.gold, MT_RAMP_GOLD, { hi: 0.55 }),     // 锦冠火花多而暗、色芯亮：冠压一点，芯才不被冠的火花淹掉
      mtCore('芯 · 绿', 'Green', 0.45, MT_COL.green, { burn: 2.4, vt: 17, stars: 260, headSize: 1.05 }, { hi: 1.5 })] },
  { id: 'crackleShin', name: '霹雳蕊牡丹', en: 'CrackleShin', group: 1, burn: 2.8, go: 5,
    note: '洋红牡丹 + 金色霹雳芯（芯星烧完一起噼啪爆裂）。中式叫法「蕊」= 芯。',
    src: '永丰 10 寸「四色牡丹霹雳蕊」的蕊（配方总表 2.1 霹雳芯）；霹雳星化学见配方总表 1.4', layers: [
      mtOyaBotan('亲星 · 洋红牡丹', 'Magenta', MT_COL.magenta),
      mtL('蕊 · 金霹雳', 'Crackle', 'crackle', 0.42, { stars: 110, headSize: 0.85, crackleDelay: 0.5 }, MT_COL.gold, MT_RAMP_GOLD)] },
  { id: 'strobeShin', name: '点灭芯牡丹', en: 'StrobeShin', group: 1, burn: 3.0, go: 6,
    note: '紫牡丹 + 白色点灭芯（芯后半程一明一灭）。PC 的点灭芯默认 GPU 光点。',
    src: '点灭芯 / 白闪蕊（配方总表 2.3）；各星不同相（齐闪要补「统一相位」能力，原理第 6 节）', layers: [
      mtOyaBotan('亲星 · 紫牡丹', 'Purple', MT_COL.purple),
      mtL('芯 · 白点灭', 'Strobe', 'strobe', 0.5, { stars: 220, headSize: 0.9, strobeHz: 9, strobeDuty: 0.32, strobeStart: 0.3 }, MT_COL.silver, MT_RAMP_SILVER, { out: { pc: 'dots', mobile: 'seq' } })] },
  { id: 'kiraShin', name: 'キラ芯牡丹 · 红', en: 'KiraShin', group: 1, burn: 2.8, go: 6,
    note: '红牡丹 + 金色辉星芯（芯星边飞边留下一闪一闪的金色小亮点）。キラ芯 = 芯用辉星（glitter）星。',
    src: '玉名「キラ芯」（配方总表 0.1 芯段）；辉星化学见配方总表 1.4', layers: [
      mtOyaBotan('亲星 · 红牡丹', 'Red', MT_COL.red),
      mtL('芯 · 金辉星', 'Glitter', 'glitter', 0.5, { stars: 200, headSize: 0.8 }, MT_COL.gold, MT_RAMP_GOLD)] },
  { id: 'shiyuShin', name: '雌雄芯菊', en: 'ShiyuShin', group: 1, burn: 2.9, go: 7,
    note: '白菊（铝火花：白、细、顺，不分叉——和八重芯的钛银菊不一样）+ 粗细两种星混在一起的芯（雄 = 少量粗亮红星、雌 = 很多细小黄星，同一半径），像花蕊。具体做法没查实（⚠），按「粗细星混合」的描述做；粗星终端速度高，初速按同一半径分别反推。',
    src: '淀川花火「雌雄芯」释义（配方总表 0.1）⚠ 做法未核实', layers: [
      mtOyaKiku('亲星 · 白菊（铝火花）', 'Kiku', MT_COL.warm, { ...MT_MAT.haku }, MT_RAMP_SILVER),
      mtCore('芯 · 雄（粗星）· 红', 'Male', 0.5, MT_COL.red, { stars: 70, headSize: 1.5, vt: 19 }),
      mtCore('芯 · 雌（细星）· 黄', 'Female', 0.5, MT_COL.yellow, { stars: 420, headSize: 0.55, vt: 13.5 })] },
  { id: 'palmShin', name: '椰子芯入 · 红芯', en: 'PalmShin', group: 1, burn: 3.4, go: 7,
    note: '金椰子（十几颗粗亮星，粗金尾下垂成椰子叶）+ 红芯。芯是普通色星，燃烧短，先灭；椰子的尾留到最后。',
    src: '椰子 = 少数粗星、粗尾（配方总表 0.2 半割物）；「椰子芯入」常见玉名 〇', layers: [
      mtL('亲星 · 金椰子', 'Palm', 'palm', 1, { stars: 16, vt: 30 }, MT_COL.gold, MT_RAMP_GOLD),
      mtCore('芯 · 红', 'Red', 0.42, MT_COL.red, { burn: 2.4, stars: 300, headSize: 1.0 }, { hi: 1.4 })] },
  // ---------------- 中式复合 ----------------
  { id: 'fourColorCrackle', name: '四色牡丹霹雳蕊', en: 'FourColorCrackle', group: 2, burn: 2.8, go: 10,
    note: '同一爆点四组色星（粉 / 绿 / 蓝 / 金，混合分布）+ 霹雳蕊。中式名字就是配方：颜色 + 主体 + 蕊。实拍的扇区分色（色分け）和交叉环还没有能力，见原理第 6 节。',
    src: '永丰 10 寸「四色牡丹霹雳蕊带交叉环」（vidio/3.0，配方总表 2.1 / 2.3 中式复合花）', layers: [
      ...[['粉', 'Pink', MT_COL.pink], ['绿', 'Green', MT_COL.green], ['蓝', 'Blue', MT_COL.blue], ['金', 'Gold', MT_COL.yellow]].map((c, i) =>
        mtL('亲星 · ' + c[0] + '组', c[1], 'botan', 1, { stars: 95, headSize: 1.05, sparkRate: 0, flicker: 0.15, seed: 61 + i, flash: i ? 0 : 1, vt: MT_VT[0] }, c[2], MT_RAMP_NEUTRAL)),
      mtL('蕊 · 金霹雳', 'Crackle', 'crackle', 0.42, { stars: 110, headSize: 0.85, crackleDelay: 0.5, vt: MT_VT[1] }, MT_COL.gold, MT_RAMP_GOLD)] },
  // ---------------- 半割物 · 千轮（4.9.6）----------------
  { id: 'colorSenrin', name: '彩色千轮', en: 'ColorSenrin', group: 3, burn: 0.9, peers: true, go: 8,
    note: '8 号玉（开花直径约 240 m）里抛出三十个小玉，约 1 s 后各自开成小花，开得有先有后（±30%，噼噼啪啪连着开，不是一齐）；四组小玉各一种颜色（红 / 绿 / 青 / 黄），混在一起。每组一层（同一时刻开）；比花型模板「千轮」小玉飞得开、小花小，一朵一色看得清。',
    src: '千輪 / 彩色千輪（配方总表 0.2 半割物；云端配方预览「彩色千轮」四组色）', layers:
      [['红', 'Red', MT_COL.red], ['绿', 'Green', MT_COL.green], ['青', 'Blue', MT_COL.blue], ['黄', 'Yellow', MT_COL.yellow]].map((c, i) =>
        // 小花要分得开、一朵一色：小玉比星重（终端速度 30）、飞得开（约 70 m），小花本身小（子星初速 24 → 半径约 15 m）。
        // 花型模板「千轮」的小花大（子星初速 45）、小玉近，四组叠在一起每朵都成了混色（第一次定帧看到的）
        mtL('小花 · ' + c[0], c[1], 'senrin', 1, { stars: 6, v0: 120, vt: 30, burn: 0.9, subSpeed: 24, subStars: 30, subJit: 30, duration: 3.2, seed: 71 + 7 * i }, c[2], MT_RAMP_NEUTRAL)) },
  { id: 'kowariUkimoyo', name: '锦冠菊小割浮模様', en: 'KamuroKowariUkimoyo', group: 3, burn: 3.8, go: 15,
    note: '亲星金锦冠菊开花后，同时抛出的二十几个小玉还留在里面（约亲星半径的 0.38），1.5–1.75 s 在中间一朵朵开成红 / 绿 / 青的小花（带一点短尾的小菊），浮在金冠里（浮模様）；小花小（半径约亲星的 0.12）、开得稍有先后。每种颜色一层（千轮）。',
    src: '玉名「錦冠菊小割浮模様」一类（小割 = 小玉装在大玉里，浮模様 = 小花在主花中间浮出一片图样，配方总表 0.2 半割物）；项目 analysis/原理/引菊转锦.md 实拍「开花后约 3 s 的彩色小割（浮模様）」', layers: [
      mtL('亲星 · 金锦冠菊', 'Kamuro', 'kamuro', 1, { stars: 150, vt: 24, cooling: MT_KAMURO_COOL, emberFrac: 0.3 }, MT_COL.gold, MT_RAMP_GOLD, { hi: 0.55 }),     // 同芯入锦冠菊：冠压一点，彩色小花才不被金火花淹掉
      // 小玉：比星重（终端速度 30）、初速按 1.5 s 飞到亲星半径 0.38 反推（burn = 小玉飞行时间，千轮的星头不走 burn）；小花：子星初速 20、燃烧 1.0 s；三色开花时刻差 0.12 s，各自 ±12%
      ...[['红', 'Red', MT_COL.red], ['绿', 'Green', MT_COL.green], ['青', 'Blue', MT_COL.blue]].map((c, i) =>
        // 4.9.17（NF1 定帧：小花子星 0.6 m、燃烧 1.0 s，在金冠里只剩几粒暗点）：子星 1.1 m、亮度 1.5、32 颗、带一点短尾（小菊）、燃烧 1.4 s，显示强度 1.7
        mtL('小割 · ' + c[0], c[1], 'senrin', 0.38, { stars: 9, vt: 30, burn: 1.5, subDelay: +(1.5 + 0.12 * i).toFixed(2), subJit: 12, subSpeed: 22, subStars: 32, subBurn: 1.4, subSize: 1.1, subBright: 1.5, carrierTail: 12, subTail: 18, flash: 0, seed: 71 + 7 * i, duration: 4.0 }, c[2], MT_RAMP_NEUTRAL, { hi: 1.7 }))] },
  // ---------------- 单层变体（4.9.6）：花型模板换颜色 / 换尾的常见玉名，一层 ----------------
  { id: 'ginKamuro', name: '银冠', en: 'GinKamuro', group: 4, burn: 3.8, go: 20,
    note: '钛冠：冠的星外层是钛粉为主——火花白、亮、颗粒粗，飞出去一段就迸成两粒、一闪一闪，寿命比木炭短，所以冠「垂」得没那么长，是一片噼啪发亮的银帘；不拖暗红余烬（金冠是木炭：金橙、慢慢烧、长长地往下坠、后面拖余烬）。2 尺玉（开花直径约 460 m、燃烧约 7 s）：冠一般做大玉。',
    src: '銀冠（配方总表 0.2）；尾的成分（配方总表 1.3：钛 = 白、短、亮、锐，2700–3000 K）', layers: [
      mtL('银冠（钛）', 'GinKamuro', 'kamuro', 1, { stars: 150, vt: 24, T0: 2850, cooling: 0.45, sparkLife: 0.8, sparkLifeJit: 50, sparkSpread: 2.4, sparkSize: 0.26, branch: 1, branchAt: 0.45, twinkle: 0.9, sparkBright: 1.3, sparkRate: 200 }, MT_COL.silver, MT_RAMP_SILVER)] },     // 温度只比金冠（1950）高一点：太热了按最亮处归一后冷下来的火花相对太暗，冠尾变短（T0 2600 试过）
  { id: 'ginYanagi', name: '银柳', en: 'GinYanagi', group: 4, burn: 5.2, go: 10,
    note: '铝 / 钛柳：壳只裂开，星慢慢落下，火花白、细、密、一闪一闪；铝火花比木炭烧得快，柳丝比金柳短（寿命约金柳的 0.6），下坠快一点——像一阵银雨，不是长长的金丝。尺玉（燃烧约 7 s）。',
    src: '柳 / 銀柳（配方总表 0.2 ポカ物）；尾的成分（配方总表 1.3：铝 / 钛 = 白、短、亮）', layers: [
      mtL('银柳（铝）', 'GinYanagi', 'yanagi', 1, { v0: 95, vt: 9, T0: 2950, cooling: 0.3, sparkLife: 1.9, sparkRate: 280, sparkSize: 0.22, sparkGrav: 0.6, twinkle: 0.75, sparkBright: 1.2 }, MT_COL.silver, MT_RAMP_SILVER)] },     // 4.9.22：不再是金柳改颜色
  { id: 'yanagiTips', name: '金柳 · 红先', en: 'YanagiRedTips', group: 4, burn: 5.2, go: 10,
    note: '金柳垂到最后（4.2 s）火花停、星头亮起来变红：金色柳丝末端一串红点（西方目录叫「willow with red tips」）。柳丝和星头颜色不同，拆成同一模拟的两层。',
    src: '柳 + 先（星末段变色，配方总表 0.1「先」）；「Willow with color tips」为常见商品名 〇', layers: [
      // 柳丝（火花）一直是金色、只有星头末段变红：一个发射器只有一条颜色曲线 → 拆成同一模拟的两层（同种子、同初速，星位重合）。
      // 定帧看过一层的做法：4.2 s 后整棵柳连垂下来的金丝一起变红，不对
      mtL('金柳（柳丝）', 'YanagiTail', 'yanagi', 1, { v0: 95, vt: 9, seed: 41, sparkStop: 4.2, headBright: 0.06 }, MT_COL.gold, MT_RAMP_GOLD),
      // 曝光按亮起来的那一段量（expoAt：燃烧 90% / 98%）：按燃烧中段量的话中段星头是压暗的，归一后柳丝里一串亮白点（定帧看过）
      mtL('星头 → 红先（同一批星）', 'YanagiTips', 'yanagi', 1, { v0: 95, vt: 9, seed: 41, sparkRate: 0, headBright: 1.3, headDim: 0.3, headDimUntil: 4.2, flash: 0 }, [[0, MT_COL.gold], [4.2, MT_COL.red]], MT_RAMP_NEUTRAL, { hi: 1.4, expoAt: [0.9, 0.98] })] },
  { id: 'hikiSakiKiku', name: '引先变化菊', en: 'HikiSakiKiku', group: 4, burn: 3.0, go: 7,
    note: '「引」：先拉 0.5 s 橙色炭火尾（星头暗）→ 星头亮起变红 → 1.55 s 变绿，无尾。和多层「八重芯变化菊」的亲星同一套，单独一层。',
    src: '引 / 引先（配方总表 0.1、0.2）；云端配方预览「引先菊」', layers: [
      mtOyaKiku('引 → 红 → 绿', 'HikiSaki', [[0, MT_COL.orange], [HK.hiki, MT_COL.red], [HK.c2, MT_COL.green]], { sparkStop: HK.hiki, headDim: 0.18, headDimUntil: HK.hiki, sparkLife: 0.5, sparkRate: 150 }, MT_RAMP_NEUTRAL)] },
  { id: 'henkaBotan', name: '变化牡丹 · 红绿黄', en: 'HenkaBotan', group: 4, burn: 2.8, go: 5,
    note: '无尾牡丹星分层变色：红 → 1.0 s 绿 → 1.9 s 黄（分层星外层先烧）。花型库只有「变色菊」，变化牡丹没单列。',
    src: '変化牡丹（配方总表 0.2 割物）', layers: [
      mtOyaBotan('红 → 绿 → 黄', 'HenkaBotan', [[0, MT_COL.red], [1.0, MT_COL.green], [1.9, MT_COL.yellow]])] },
  // ---------------- 型物 · 分簇（4.9.16，对话框新花型）：星分簇装（4.9.15 分簇）+ 整套簇转角（4.9.16）；看的方向固定，簇排在画面平面里 ----------------
  { id: 'mangekyo', name: '万華鏡 · 红绿金', en: 'Mangekyo', group: 5, burn: 2.8, go: 8,
    note: '星不铺满球壳，一小撮一小撮装在对称位置：外圈 8 瓣（红 4 瓣、绿 4 瓣交替，每瓣一种颜色、瓣之间留空），里圈 8 束金色短尾菊插在外圈两束中间，中心一团银白芯。像从万花筒里看到的对称图样。整套排在画面平面里（烘出来的面片是固定视角，正对着看最整齐）。',
    src: 'Walkerplus 花火の種類「万華鏡を覗いたような形状」（型物一类）；分簇装法见原理 analysis/原理/多层花型库.md 1c', layers: [
      // 4.9.17（NF1 定帧：星速一样时每簇投影成一道切向短划）：速度离散 14% → 每簇沿径向拉开成一片花瓣
      mtL('外圈 · 红束（4 簇）', 'RedSpokes', 'botan', 1, { stars: 120, vt: MT_VT[0], pattern: 'cluster', clusterLayout: 'ring', clusterN: 4, clusterCone: 9, speedJit: 14, clusterRoll: 0, headSize: 1.0, sparkRate: 0, flicker: 0.15 }, MT_COL.red, MT_RAMP_NEUTRAL),
      mtL('外圈 · 绿束（4 簇，错开 45°）', 'GreenSpokes', 'botan', 1, { stars: 120, vt: MT_VT[0], pattern: 'cluster', clusterLayout: 'ring', clusterN: 4, clusterCone: 9, speedJit: 14, clusterRoll: 45, headSize: 1.0, sparkRate: 0, flicker: 0.15 }, MT_COL.green, MT_RAMP_NEUTRAL),
      mtL('里圈 · 金菊（8 簇，错开 22.5°）', 'GoldSpokes', 'kiku', 0.55, { stars: 160, pattern: 'cluster', clusterLayout: 'ring', clusterN: 8, clusterCone: 6, clusterRoll: 22.5, headSize: 0.8, headBright: 1.2, sparkRate: 130, sparkLife: 0.35, T0: 2300, cooling: 0.4 }, MT_COL.gold, MT_RAMP_GOLD),
      mtCore('芯 · 银白', 'Silver', 0.24, MT_COL.silver, { stars: 160 })] },
  { id: 'somewakeBotan', name: '染分牡丹 · 红绿', en: 'SomewakeBotan', group: 5, burn: 2.8, go: 6,
    note: '一发牡丹左半红、右半绿（染分 / 色分け：装药时两种颜色的星各装半个壳）。每半一层：一簇、张角 90°（= 半球），整套簇转角 +90° / −90° 摆成左右两半；两层星数、速度、燃烧一样，同开同灭。分界是竖的（转角改了就是别的方向）。',
    src: '色分け / 染め分け（配方总表 0.2 割物「色分け（四色牡丹扇区）」，永丰「四色牡丹」实拍是扇区分色）；四色扇区（每层四分之一）用圆锥簇拼不严，没做', layers: [
      mtL('左半 · 红', 'RedHalf', 'botan', 1, { stars: 190, vt: MT_VT[0], pattern: 'cluster', clusterLayout: 'ring', clusterN: 1, clusterCone: 90, clusterRoll: 90, headSize: 1.05, sparkRate: 0, flicker: 0.15 }, MT_COL.red, MT_RAMP_NEUTRAL),
      mtL('右半 · 绿', 'GreenHalf', 'botan', 1, { stars: 190, vt: MT_VT[0], pattern: 'cluster', clusterLayout: 'ring', clusterN: 1, clusterCone: 90, clusterRoll: -90, headSize: 1.05, sparkRate: 0, flicker: 0.15 }, MT_COL.green, MT_RAMP_NEUTRAL)] },
];
const MULTI_BY_ID = Object.fromEntries(MULTI_TYPES.map(r => [r.id, r]));
// 每层贴图曝光（analysis/scripts/多层模板曝光.py 按 autoExposure40 算的，和花型模板 EXPOSURE40 同一算法）；没有就用花型模板的
// 4.9.39 金蕊柠（kinzuiLime）：后三层 = 本机 autoExposure40（条目曝光.py，NFJL4，和待验收条目 JQ<n> 同一组数）；橙引尾不用自动的 0.0102（按开花头 0.1 s 的闪光定，0.3–0.6 s 的橙尾只剩四分之一亮度），用 0.0445（只开花头几格中心过曝，回放检查过）
// 4.9.42 金蕊柠：金菊蕊 0.1423 → 0.075（4.9.40 起芯的火花多、寿命长，0.1423 时最亮那几帧到顶 6.6%，回放检查上限 2%；analysis/scripts/过曝估算.py NFX-J1：0.075 估 0.6%），显示强度 1.7 → 2.4 补回（NFJV8 看过观感不变）；其它三层照旧（估算：橙引尾 0.25%、柠点星 / 红点蕊 0）
const MT_EXPOSURE = {"kinzuiLime": [0.0445, 1.158, 0.075, 0.4388], "shinKiku": [0.766, 2.48], "shinBotan": [2.62, 2.47], "yaeshin": [0.396, 2.22, 1.69], "yaeHenka": [1.91, 2.52, 1.8], "mieshin": [0.741, 2.68, 2.39, 1.43], "yoeshin": [2.39, 2.73, 2.51, 1.91, 1.35], "itsueHenka": [2.08, 2.75, 2.63, 2.32, 1.94, 1.32], "yaeStrobe": [2.22, 2.52, 1.66], "kamuroShin": [2.85, 1.62], "crackleShin": [2.67, 1.83], "strobeShin": [2.87, 1.71], "fourColorCrackle": [3.23, 3.34, 3.3, 3.31, 1.89], "jisaShinBotan": [2.07, 2.37], "henkaKikuShin": [2.06, 2.26], "mieStrobeKiku": [1.51, 2.68, 2.39, 1.43], "kiraShin": [2.9, 0.631], "shiyuShin": [0.369, 2.52, 2.78], "palmShin": [0.306, 1.42], "hikiSakiKiku": [1.94], "henkaBotan": [2.67], "mieKamuroSaki": [3.07, 2.54, 2.5, 2.28, 1.55], "ginKamuro": [0.566], "ginYanagi": [0.107], "colorSenrin": [1.32, 1.33, 1.74, 1.25], "yanagiTips": [0.757, 2.39], "yaeBlueBotan": [2.92, 0.207, 0.81, 0.136], "yoeshinKoro": [1.19, 2.03, 2.75, 2.53, 1.97, 1.41], "somewakeBotan": [2.85, 2.83], "kowariUkimoyo": [2.82, 0.548, 0.426, 0.585], "mangekyo": [2.73, 2.47, 0.39, 1.41]};
// 每层的显示强度（Color Over Life 倍数）：各层贴图都按自己最亮处归一，这里按游戏内大小看过定层间明暗（亲星最亮、芯略暗）
// 彩色芯按颜色的亮度补：铜蓝、锶红、紫这些亮度低的色给高一点，柠檬绿、黄、银白不补（(0.45 / 相对亮度)^0.5，夹在 0.9–1.45）
const mtLum = hex => { const c = hexToLin(hex); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const mtHeadInt = (r, i) => { const l = r.layers[i]; if (l.hi != null) return l.hi; if (i === 0 && !r.peers) return 1;     // peers：几层平级、没有亲星（4.9.6 彩色千轮）
  const L = l.m.stages.reduce((a, s) => a + mtLum(s[1]), 0) / l.m.stages.length; return +clamp(Math.sqrt(0.45 / Math.max(0.05, L)), 0.9, 1.45).toFixed(2); };
// 一个模板 → 每层的完整参数（P）和颜色（M）。不改界面状态；探针 / 标准检查 / 缩略图脚本也用它
function mtLayers(id) {
  const r = MULTI_BY_ID[id]; if (!r) throw new Error('没有这个多层模板：' + id);
  const g = r.go ? mtGoScale(r.go) : null;     // 4.9.22 号数缩放（没写 go = 以前的数值原样）
  const R = g ? g.R : r.R || 95;     // 亲星熄灭时的半径（米）：和花型库的菊（约 83 m）同一量级，约 5–6 号；锦冠这类大花型可以单独给
  return r.layers.map((l, i) => {
    const d = defaultsFor(l.type), kT = g ? g.kT : 1;
    const burn0 = l.p.burn != null ? l.p.burn : r.burn, vt0 = l.p.vt != null ? l.p.vt : MT_VT[Math.min(i, MT_VT.length - 1)];
    const burn = g ? +(burn0 * kT).toFixed(3) : burn0, vt = g ? +(vt0 * g.kVt).toFixed(2) : vt0;
    const v0 = Math.round(clamp(v0For(R * l.k, vt, burn), 12, 600));
    let lp = l.p;
    if (g) {     // 4.9.22 号数缩放：层上写的值和花型默认值一起缩（默认值也是按约 6 号定的）
      const base = { ...d.P, ...l.p }; lp = { ...l.p, burn, vt };
      for (const k of MT_TIME_KEYS) if (+base[k] > 0) lp[k] = +(base[k] * kT).toFixed(3);
      if (+base.sparkRate > 0) lp.sparkRate = Math.round(base.sparkRate / kT);
      lp.stars = Math.max(4, Math.round(base.stars * g.kStar));
      lp.headSize = +(base.headSize * g.kHead).toFixed(3);
      if (+base.subSize > 0) lp.subSize = +(base.subSize * g.kHead).toFixed(3);
      if (+base.sparkSize > 0) lp.sparkSize = +(base.sparkSize * Math.pow(g.kR, 0.6)).toFixed(3);
      if (+base.subSpeed > 0) lp.subSpeed = +(base.subSpeed * g.kR / kT).toFixed(1);
      if (+base.subVt > 0) lp.subVt = +(base.subVt * g.kVt).toFixed(1);
      if (l.p.v0 != null) lp.v0 = Math.round(clamp(l.p.v0 * g.kR / kT, 12, 600));     // 写死初速的层（柳、千轮小玉）：低阻力时半径 ≈ 初速 × 时间
      if (l.p.duration != null) lp.duration = +(l.p.duration * kT).toFixed(2);     // 层上写死的时长（千轮）跟燃烧一起放大
    }
    const P = derive({ ...d.P, renderVer: 40, seed: 41 + 11 * i, burn, burnJit: 4, fade: 0.14, lastFlare: 0, vt, v0, burstR0: 0, speedJit: 3, dirJit: 1.2,
      duration: +(Math.max(burn, lp.burn || 0) + (l.type === 'kamuro' ? 1.6 : 0.55) * kT).toFixed(2), flash: i ? 0 : 1, ...lp });
    if (l.type === 'kamuro') P.duration = Math.max(P.duration, g ? +(d.P.duration * kT).toFixed(2) : d.P.duration);
    // 4.7.0 起结尾等火花自然灭完（不再最后整体淡出）：时长盖到这一层最后一批火花（和花型模板同一口径，sparkTailEnd）
    if (+P.sparkRate > 0 && typeof sparkTailEnd === 'function') { const end = sparkTailEnd(P); if (end > P.duration) P.duration = +(end + 0.05).toFixed(2); }
    const ex = MT_EXPOSURE[id] && MT_EXPOSURE[id][i]; if (ex) P.exposure = ex;
    const lm = g && kT !== 1 && l.m.stages ? { ...l.m, stages: l.m.stages.map(([t, c]) => [+(t * kT).toFixed(3), c]) } : l.m;     // 4.9.22 变色时刻跟燃烧一起缩放
    const M = normalizeM({ ...d.M, ...lm }, l.type);
    return { title: l.title, en: l.en, type: l.type, P, M, delay: l.delay || 0, headInt: mtHeadInt(r, i), tailInt: 1, out: l.out, expoAt: l.expoAt };
  });
}
// 多层查看器要的组合：每层自带参数（src），层名、延迟、显示强度、导出方案
function mtCombo(id) {
  const r = MULTI_BY_ID[id];
  return { name: r.name, layers: mtLayers(id).map(x => ({ src: { type: x.type, P: x.P, M: x.M }, title: x.title, lid: myLid(), scale: 1, delay: x.delay, rate: 1, mirror: false,
    headInt: x.headInt, tailInt: x.tailInt, ...(x.out ? { out: structuredClone(x.out) } : {}) })) };
}
// 打开一个多层模板：和打开花型模板一样是「从头调」的起点；改了点「保存」= 存成我的效果
async function openMultiType(id) {
  const r = MULTI_BY_ID[id]; if (!r) { flash('没有这个多层模板', true); return; }
  beforeOpen(null); setQueuedView(false); wb.entry = undefined;
  lib.effect = null; lib.formal = null; lib.key = 'mt:' + id;
  const pn = store.get('packNames', {})['mt:' + id]; if (!pn) setPackNames('mt:' + id, r.en, r.layers.map(l => l.en));     // UE 资产名默认用模板英文名（「查看交付」里能改）
  setReview(null); state.comboSel = -1; state.layerView = { solo: -1, mute: [] };
  await setTab('combo', { lazy: true }); syncComboPanels();
  await applyCombo(mtCombo(id));
  renderLib(); crumb('多层花型', r.name); wbRefresh();
  if (state.layers.length && layerEntryOf(state.layers[0])) selectComboLayer(0);
  flash(`${r.name}：${r.layers.length} 层。${r.note}`);
}
// 「＋ 新建效果」选了多层模板：直接存成一个我的效果（每层参数复制一份）
async function mtCreateMine(id) {
  const r = MULTI_BY_ID[id]; if (!r) return;
  const n = Object.keys(myAll()).length + 1, name = await askText('新效果叫什么？', '中文名，之后在资产栏 ⋯ 里能改；英文名在「交付清单」里设。', r.name, '新建');     // 4.9.6 应用内对话框（对话框15）
  if (name == null) return;
  const recId = 'fx' + Date.now().toString(36), layers = mtLayers(id);
  const rec = { id: recId, name: name.trim() || `新效果 ${n}`, created: wbNow(), updated: wbNow(), links: [], from: { key: 'mt:' + id, name: r.name, base: r.name, ver: VERSION },
    snap: { kind: 'combo', name: name.trim() || r.name, layers: layers.map(x => { const M = x.M; return { id: null, type: x.type, P: x.P, M,
      L: { title: x.title, lid: myLid(), scale: 1, delay: x.delay, rate: 1, mirror: false, stages: M.stages.map(s => [...s]), xw: M.xw, ramp0: M.ramp0, ramp1: M.ramp1, ramp2: M.ramp2, ramp3: M.ramp3, headInt: x.headInt, tailInt: x.tailInt, ...(x.out ? { out: structuredClone(x.out) } : {}) } }; }) } };
  myPut(rec); setPackNames('my:' + recId, r.en, r.layers.map(l => l.en)); await openMultiTypeMine(recId);
}
async function openMultiTypeMine(recId) { await openMyEffect(recId); flash('已按多层模板新建：右栏「观察图层」里加层、改名；调好了点资产栏「保存」'); }
// 缩略图：同心圆示意图（19_thumbsvg.js，用户 10-05 20:43「现在的缩略图就很好了，不用出新的缩略图」）
function mtThumbStyle(id) { return MULTI_BY_ID[id] ? (thUser('mt:' + id) || thStyleFor('mt:' + id, () => mtLayers(id).map(l => thLayerOf(l.P, l.M)))) : ''; }     // 4.9.6 自己截的优先
// 左栏「多层花型模板」一组（花型模板下面）
function mtLibGroup(host) {
  const list = MULTI_TYPES.filter(r => libMatch(r.name, r.en, r.note, MT_GROUPS[r.group], '多层'));
  if (!list.length && lib.q) return;
  const g = libGroup(host, 'mtypes', '多层花型模板', list.length);
  let last = -1, grid = null;
  for (const r of list) {
    if (r.group !== last) { g.insertAdjacentHTML('beforeend', `<p class="lsub">${MT_GROUPS[r.group]}</p>`); grid = document.createElement('div'); grid.className = 'tiles'; g.appendChild(grid); last = r.group; }
    const k = 'mt:' + r.id, d = document.createElement('button'); d.type = 'button'; d.className = 'tile' + (k === lib.key ? ' cur' : ''); d.dataset.key = k;
    d.title = `${r.name}（${r.layers.length} 层）：${r.note}\n依据：${r.src}`;
    d.innerHTML = `<span class="im" style="${mtThumbStyle(r.id)}"></span><span class="nm">${r.name}</span>`;
    d.addEventListener('click', () => openMultiType(r.id)); grid.appendChild(d);
  }
}
// 花型库（「＋ 新建效果」/ 打开）里的多层模板；加一层时不列（一次加整套层用「新建效果」）
function pkMultiItems(mode) {
  if (mode === 'addLayer') return [];
  return MULTI_TYPES.map(r => ({ key: 'mt:' + r.id, name: r.name, cat: '多层模板', desc: `${r.layers.length} 层 · ${r.note}`, tags: ['多层', MT_GROUPS[r.group].replace(/（.*）/, '')], thumbStyle: mtThumbStyle(r.id) }));
}
// 定帧（实时模拟口径，所有层画在同一个画面里再色调映射）：缩略图、云端审看用。opt: { times, px, half, cy }
async function mtRenderStills(id, opt) { return mtRenderLayers(mtLayers(id), opt); }
// 4.9.16：任意几层画进同一画面（层 = { P, M, delay, headInt, scale?, rate? }）；本机渲染缩略图（analysis/scripts/渲染缩略图_截图法.py）给效果的组合用。
// 缩放 / 时间倍率和多层观察里一样（层的取景除以缩放、年龄乘倍率）；多层模板都是 1，算术和以前一样
async function mtRenderLayers(layers, opt) {
  const px = opt.px || 512, out = [];
  const saved = { hdr: hdrT, rg: rgT, mode: state.ref.mode, expo: state.expo, busy: state.stillBusy };
  state.stillBusy = true; await nextTick(); gl.activeTexture(gl.TEXTURE0);
  const P0 = layers[0].P, sub = ['senrin', 'crossette'].includes(P0.type);     // 千轮 / 分裂：外圈 = 小玉飞到的地方 + 小花半径
  const R0 = sub ? reachOf(P0.v0, P0.vt, P0.subDelay) + reachOf(P0.subSpeed, +P0.subVt > 0 ? +P0.subVt : P0.vt, P0.subBurn) : reachOf(P0.v0, P0.vt, P0.burn), half = opt.half || R0 * 1.22, cy = opt.cy != null ? opt.cy : -R0 * 0.1;
  const rs = layers.map(l => ({ l, pl: displayPlan40(l.P), R: makeRenderer(l.P, familyOf(l.P.type) === 'ground' ? 'loop' : 'burst'), q: qualityOf(l.P) }));
  let H = null; const tg = [];
  try {
    H = new Target(px, px, gl.RGBA16F, true); canvas.width = canvas.height = px; hdrT = H; state.ref.mode = 0; state.expo = opt.expo == null ? 1 : opt.expo;
    for (const t of opt.times.slice().sort((a, b) => a - b)) {
      H.clear();
      for (const x of rs) {
        const sc = +x.l.scale > 0 ? +x.l.scale : 1, tl = (t - (x.l.delay || 0)) * (+x.l.rate > 0 ? +x.l.rate : 1); if (tl < 0) continue;
        const samples = new Target(px * x.q.ss, px * x.q.ss, gl.RGBA16F), cell = new Target(px, px, gl.RGBA16F); tg.push(samples, cell); rgT = cell;
        const view = [0, cy / sc, half / sc, half / sc]; renderCell40(x.l.P, x.pl, x.R, tl, samples, cell, view);
        H.bind(); additive(true); try { shadeView40(x.l.P, { ...x.l.M, headInt: x.l.headInt }, cell, tl, view, H); } finally { additive(false); }
        samples.dispose(); cell.dispose(); tg.length = 0;
      }
      post(-1, layers[0].P); out.push({ t, png: canvas.toDataURL('image/png') }); await nextTick();
    }
  } finally {
    for (const x of tg) x.dispose(); H && H.dispose(); for (const x of rs) x.R.dispose();
    hdrT = saved.hdr; rgT = saved.rg; state.ref.mode = saved.mode; state.expo = saved.expo; state.stillBusy = saved.busy;
  }
  return out;
}
