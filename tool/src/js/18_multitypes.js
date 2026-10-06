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
  lemon: '#eaff52', mint: '#c8ffb0', redOrange: '#ff5a2a', amber: '#ffa640' };     // 4.9.6 第二批：柠黄 / 白绿（球形 D 的四段）、橙红点火药（球形 C 的芯）、橙金芯
// 半径比（芯 / 亲星）：参考图（八重芯）量到 1 : 0.61 : 0.32；层数多时每层间距按同样的比例收（原理文档第 3 节）
const MT_RATIO = { 1: [0.55], 2: [0.61, 0.32], 3: [0.70, 0.48, 0.27], 4: [0.74, 0.55, 0.38, 0.22], 5: [0.78, 0.62, 0.47, 0.33, 0.19] };
// 芯星比亲星小 → 终端速度低（vt ∝ √星径）；层越靠里越小
const MT_VT = [21, 18, 16.5, 15.5, 14.5, 13.5];
// 组：左栏「多层花型模板」里的小标题
const MT_GROUPS = ['芯物（同心多重芯）', '冠 · 效果芯', '中式复合', '半割物 · 千轮', '单层变体（颜色 / 尾）'];     // 后两组 4.9.6 第二批
// 一层：c = 颜色（字符串，或 stages 数组），ramp = 渐变图；k = 半径比（亲星 1）
const mtL = (title, en, type, k, p = {}, c = MT_COL.warm, ramp = MT_RAMP_NEUTRAL, o = {}) => ({ title, en, type, k, p, m: { stages: Array.isArray(c) ? c : [[0, c]], xw: 0.1, ...ramp }, ...o });
// 芯（无尾牡丹星）：内层小而密——星数按半径比收得比面积慢（芯星小、排得密），星头略小于亲星
const mtCore = (title, en, k, c, p = {}, o = {}) => mtL(title, en, 'botan', k, { stars: Math.round(Math.max(90, 400 * Math.pow(k, 0.5))), headSize: +(0.78 + 0.25 * k).toFixed(2), sparkRate: 0, flicker: 0.15, ...p }, c, MT_RAMP_NEUTRAL, o);
// 亲星 · 菊（带尾）：炭火短尾；前段「引」（橙色带尾、星头暗）→ 色光无尾，用 sparkStop + headDim（和青柠星同一个机制）
const mtOyaKiku = (title, en, c, p = {}, ramp = MT_RAMP_GOLD) => mtL(title, en, 'kiku', 1, { stars: 380, headSize: 1.0, headBright: 1.5, sparkRate: 130, sparkLife: 0.36, sparkSpread: 1.8, T0: 2400, cooling: 0.42, ...p }, c, ramp);
const mtOyaBotan = (title, en, c, p = {}) => mtL(title, en, 'botan', 1, { stars: 360, headSize: 1.05, sparkRate: 0, flicker: 0.15, ...p }, c, MT_RAMP_NEUTRAL);
// 一组芯：colors 从外到内，按层数取半径比
const mtCores = (colors, p = {}) => colors.map((c, i) => { const k = MT_RATIO[colors.length][i]; return mtCore('芯 ' + (i + 1) + ' · ' + c[0], c[1], k, c[2], p); });
// 变色时刻（引 → 第一色 → 第二色），一个模板里各层共用
const HK = { hiki: 0.5, c2: 1.55 };
const MULTI_TYPES = [
  // ---------------- 芯物 ----------------
  { id: 'shinKiku', name: '芯入菊', en: 'ShinKiku', group: 0, burn: 2.9,
    note: '亲星金菊（炭火短尾）+ 1 层青色芯。芯物最基本的形式：同一爆点同时开、同时灭，芯约为亲星半径的 0.55。',
    src: 'Walkerplus「芯」解说：亲星不计入芯数，1 层芯 = 芯入', layers: [
      mtOyaKiku('亲星 · 金菊', 'Kiku', MT_COL.gold),
      ...mtCores([['青', 'Blue', MT_COL.blue]])] },
  { id: 'shinBotan', name: '芯入牡丹', en: 'ShinBotan', group: 0, burn: 2.8,
    note: '红牡丹（无尾）+ 1 层绿芯。红（锶）绿（钡）对比色，最常见的芯入牡丹配色。',
    src: '牡丹 = 无尾星（Walkerplus 花火の種類）；红 / 绿发色剂见原理第 2 节', layers: [
      mtOyaBotan('亲星 · 红牡丹', 'Red', MT_COL.red),
      ...mtCores([['绿', 'Green', MT_COL.green]])] },
  { id: 'yaeshin', name: '八重芯 · 银菊洋红绿', en: 'Yaeshin', group: 0, burn: 2.9,
    note: '参考图：外层暖白短尾菊 + 洋红芯 + 绿芯，三圈同心。八重芯 = 亲星 + 2 层芯（「八重」是「多重」的意思，不是 8 层）。半径比按参考图量的 1 : 0.61 : 0.32。',
    src: '用户参考图（2026-10-05）；All About「八重芯変化菊」、Walkerplus 八重芯 / 三重芯解说', layers: [
      mtOyaKiku('亲星 · 银白菊', 'Kiku', MT_COL.warm, { T0: 2550, sparkLife: 0.28, sparkRate: 140, headBright: 2 }, { ...MT_RAMP_GOLD, ramp2: '#ffdcb0', ramp3: '#fffbf5' }),
      mtCore('芯 1 · 洋红', 'Magenta', MT_RATIO[2][0], MT_COL.magenta, { stars: 360, headSize: 1.0 }),
      mtCore('芯 2 · 绿', 'Green', MT_RATIO[2][1], MT_COL.lime, { stars: 200 })] },
  { id: 'yaeBlueBotan', name: '八重芯青牡丹 · 金银芯', en: 'YaeshinBlueBotan', group: 0, burn: 2.9,
    note: '用户参考图 1：亲星是青色牡丹（无尾的铜蓝光点），芯 1 金色长尾菊（金线就是芯星的炭火尾），芯 2 银白短尾菊（中心一团白）。和「八重芯 · 银菊洋红绿」反过来：外层无尾、里面带尾。',
    src: '用户参考图 1（2026-10-05 20:43）；伊势神宫奉纳花火大会玉名「八重芯ブルー牡丹」（伊势市 PDF）', layers: [
      mtOyaBotan('亲星 · 青牡丹', 'Blue', MT_COL.blue, { headSize: 1.15, stars: 320 }),
      // 金线要直、要长：火花几乎不继承星速、少下坠、寿命长（留在出生的地方连成线）
      mtL('芯 1 · 金长尾菊', 'Gold', 'kiku', 0.8, { stars: 120, headSize: 0.85, headBright: 1.2, sparkRate: 260, sparkLife: 1.15, sparkSpread: 1.0, sparkInherit: 0.06, sparkGrav: 0.35, T0: 2250, cooling: 0.36 }, MT_COL.gold, MT_RAMP_GOLD),
      mtL('芯 2 · 银白菊', 'Silver', 'kiku', 0.38, { stars: 300, headSize: 1.0, headBright: 1.4, sparkRate: 170, sparkLife: 0.35, T0: 2800, cooling: 0.3 }, MT_COL.silver, MT_RAMP_SILVER, { hi: 1.6 })] },
  { id: 'yaeHenka', name: '八重芯变化菊', en: 'YaeshinHenka', group: 0, burn: 3.0,
    note: '亲星先「引」（橙色带尾、星头暗，0.5 s）再变红、1.55 s 变绿；两层芯同一时刻变色（青 → 银白、黄 → 红）。各层同开、同变、同灭。',
    src: '大曲 / 土浦競技大会常见玉名「八重芯変化菊」；变色星 = 分层星（外层先烧）', layers: [
      mtOyaKiku('亲星 · 引 → 红 → 绿', 'Henka', [[0, MT_COL.orange], [HK.hiki, MT_COL.red], [HK.c2, MT_COL.green]], { sparkStop: HK.hiki, headDim: 0.18, headDimUntil: HK.hiki, sparkLife: 0.5, sparkRate: 150 }, MT_RAMP_NEUTRAL),
      mtCore('芯 1 · 青 → 银白', 'BlueSilver', MT_RATIO[2][0], [[0, MT_COL.blue], [HK.c2, MT_COL.silver]]),
      mtCore('芯 2 · 黄 → 红', 'YellowRed', MT_RATIO[2][1], [[0, MT_COL.yellow], [HK.c2, MT_COL.red]])] },
  { id: 'mieshin', name: '三重芯 · 银红青', en: 'Mieshin', group: 0, burn: 3.0,
    note: '亲星金菊 + 银 / 红 / 青三层芯（四圈）。大曲「芯入割物の部」要求三重芯以上（10 号玉）。',
    src: 'All About 三重芯实例「銀、紅、青」；about-fireworks 大曲芯入割物の部（10 号、三重芯以上）', layers: [
      mtOyaKiku('亲星 · 金菊', 'Kiku', MT_COL.gold, { sparkLife: 0.3 }),     // 芯多：亲星尾短一点，里面几圈看得清
      ...mtCores([['银白', 'Silver', MT_COL.silver], ['红', 'Red', MT_COL.red], ['青', 'Blue', MT_COL.blue]])] },
  { id: 'yoeshin', name: '四重芯 · 红绿紫桃', en: 'Yoeshin', group: 0, burn: 3.0,
    note: '亲星银白牡丹 + 红 / 绿 / 紫 / 桃四层芯（五圈）。层间距按半径比收，内圈小而密。',
    src: 'All About 四重芯实例「紅、緑、紫、ピンク」', layers: [
      mtOyaBotan('亲星 · 银白', 'Silver', MT_COL.silver),
      ...mtCores([['红', 'Red', MT_COL.red], ['绿', 'Green', MT_COL.green], ['紫', 'Purple', MT_COL.purple], ['桃', 'Pink', MT_COL.pink]])] },
  { id: 'itsueHenka', name: '五重芯变化菊', en: 'ItsueshinHenka', group: 0, burn: 3.1,
    note: '亲星「引 → 红 → 绿」+ 五层芯（六圈），芯和亲星同一时刻变色。竞技大会最高难度的芯物；游戏里 6 个发射器，内圈面片小。',
    src: '土浦全国花火競技大会 10 号玉「昇り曲導付五重芯変化菊」（野村花火工業）等；about-fireworks：2017 年起五重芯（六圈）参赛', layers: [
      mtOyaKiku('亲星 · 引 → 红 → 绿', 'Henka', [[0, MT_COL.orange], [HK.hiki, MT_COL.red], [HK.c2, MT_COL.green]], { sparkStop: HK.hiki, headDim: 0.18, headDimUntil: HK.hiki, sparkLife: 0.5, sparkRate: 150 }, MT_RAMP_NEUTRAL),
      ...[['黄 → 青', 'YellowBlue', [[0, MT_COL.yellow], [HK.c2, MT_COL.blue]]], ['银白 → 红', 'SilverRed', [[0, MT_COL.silver], [HK.c2, MT_COL.red]]],
        ['紫 → 黄', 'PurpleYellow', [[0, MT_COL.purple], [HK.c2, MT_COL.yellow]]], ['绿 → 桃', 'GreenPink', [[0, MT_COL.green], [HK.c2, MT_COL.pink]]], ['红 → 银白', 'RedSilver', [[0, MT_COL.red], [HK.c2, MT_COL.silver]]]]
        .map((c, i) => mtCore('芯 ' + (i + 1) + ' · ' + c[0], c[1], MT_RATIO[5][i], c[2]))] },
  { id: 'yaeStrobe', name: '八重芯 · 银点灭', en: 'YaeshinStrobe', group: 0, burn: 3.2,
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
  { id: 'mieStrobeKiku', name: '三重芯点灭菊', en: 'MieshinStrobeKiku', group: 0, burn: 3.0,
    note: '亲星先是金色带尾的菊，1.0 s 尾停、星头变银白开始一明一灭（点灭菊）；里面红 / 绿 / 青三层芯（芯的颜色玉名没写，按常见配色）。亲星有尾，所以导出走序列（不走光点）。',
    src: '伊势神宫奉纳花火大会玉名「三重芯点滅菊」（伊势市 PDF）；点灭化学与频率见配方总表 1.4', layers: [
      mtOyaKiku('亲星 · 金菊 → 银点灭', 'StrobeKiku', [[0, MT_COL.gold], [1.0, MT_COL.silver]], { sparkStop: 1.0, sparkLife: 0.4, strobeHz: 9, strobeDuty: 0.32, strobeStart: 0.34 }, MT_RAMP_NEUTRAL),
      ...mtCores([['红', 'Red', MT_COL.red], ['绿', 'Green', MT_COL.green], ['青', 'Blue', MT_COL.blue]])] },
  { id: 'mieKamuroSaki', name: '三重芯锦冠先变化菊', en: 'MieshinKamuroSaki', group: 0, burn: 3.4, R: 120,
    note: '亲星前段是金锦冠（长火花慢慢下垂、星头暗），2.2 s 火花停、星头亮起来变红、2.9 s 变绿（「先变化」= 星的末段变色）；尾和星头颜色不同，亲星拆成同一模拟的两层（尾 / 星头）。里面银白 / 青 / 绿三层芯（金色火花里红芯看不清，芯避开红）。',
    src: '伊势神宫奉纳花火大会玉名「三重芯錦冠先変化菊」（伊势市 PDF）；锦冠见配方总表 1.3', layers: [
      // 星头和尾颜色不同（尾金、星头后段红 → 绿）：一个发射器只有一条颜色曲线 → 拆成同一模拟的两层（同种子、同初速、同星数，星位重合；球形 D 的 YD1 / YD2 同一做法）。
      // 尾层用金色渐变图（火花冷却的暖色过渡），星头层用中性渐变图（红、绿不被染暖）
      mtL('亲星 · 金锦冠（尾）', 'KamuroTail', 'kamuro', 1, { stars: 150, vt: 24, seed: 41, sparkStop: 2.2, headBright: 0.06 }, MT_COL.gold, MT_RAMP_GOLD, { hi: 0.7 }),
      mtL('亲星 · 星头 金 → 红 → 绿（同一批星）', 'KamuroHead', 'kamuro', 1, { stars: 150, vt: 24, seed: 41, sparkRate: 0, headBright: 1.3, headDim: 0.35, headDimUntil: 2.2, flash: 0 }, [[0, MT_COL.gold], [2.2, MT_COL.red], [2.9, MT_COL.green]], MT_RAMP_NEUTRAL, { hi: 1.5 }),     // 先变化那一段要从金色冠尾里跳出来：星头层显示强度 1.5（定帧看过 1.0 不够）
      ...mtCores([['银白', 'Silver', MT_COL.silver], ['青', 'Blue', MT_COL.blue], ['绿', 'Green', MT_COL.green]]).map(l => ({ ...l, hi: 1.4 }))] },
  // ---------------- 冠 · 效果芯 ----------------
  { id: 'kamuroShin', name: '芯入锦冠菊 · 绿芯', en: 'KamuroShin', group: 1, burn: 3.8, R: 130,
    note: '亲星金锦冠（长火花、慢慢下垂成冠）+ 绿芯。芯是普通色星（燃烧短），先灭；冠尾留到最后。金冠里用绿芯（钡）对比最强，红芯会被金色火花淹掉。',
    src: '锦冠（炭 + 钛长尾下垂）见配方总表 1.3、鸿巢四尺玉返工；「芯入錦冠菊」为常见玉名', layers: [
      mtL('亲星 · 金锦冠', 'Kamuro', 'kamuro', 1, { stars: 150, vt: 24 }, MT_COL.gold, MT_RAMP_GOLD, { hi: 0.55 }),     // 锦冠火花多而暗、色芯亮：冠压一点，芯才不被冠的火花淹掉
      mtCore('芯 · 绿', 'Green', 0.45, MT_COL.green, { burn: 2.4, vt: 17, stars: 260, headSize: 1.05 }, { hi: 1.5 })] },
  { id: 'crackleShin', name: '霹雳蕊牡丹', en: 'CrackleShin', group: 1, burn: 2.8,
    note: '洋红牡丹 + 金色霹雳芯（芯星烧完一起噼啪爆裂）。中式叫法「蕊」= 芯。',
    src: '永丰 10 寸「四色牡丹霹雳蕊」的蕊（配方总表 2.1 霹雳芯）；霹雳星化学见配方总表 1.4', layers: [
      mtOyaBotan('亲星 · 洋红牡丹', 'Magenta', MT_COL.magenta),
      mtL('蕊 · 金霹雳', 'Crackle', 'crackle', 0.42, { stars: 110, headSize: 0.85, crackleDelay: 0.5 }, MT_COL.gold, MT_RAMP_GOLD)] },
  { id: 'strobeShin', name: '点灭芯牡丹', en: 'StrobeShin', group: 1, burn: 3.0,
    note: '紫牡丹 + 白色点灭芯（芯后半程一明一灭）。PC 的点灭芯默认 GPU 光点。',
    src: '点灭芯 / 白闪蕊（配方总表 2.3）；各星不同相（齐闪要补「统一相位」能力，原理第 6 节）', layers: [
      mtOyaBotan('亲星 · 紫牡丹', 'Purple', MT_COL.purple),
      mtL('芯 · 白点灭', 'Strobe', 'strobe', 0.5, { stars: 220, headSize: 0.9, strobeHz: 9, strobeDuty: 0.32, strobeStart: 0.3 }, MT_COL.silver, MT_RAMP_SILVER, { out: { pc: 'dots', mobile: 'seq' } })] },
  { id: 'kiraShin', name: 'キラ芯牡丹 · 红', en: 'KiraShin', group: 1, burn: 2.8,
    note: '红牡丹 + 金色辉星芯（芯星边飞边留下一闪一闪的金色小亮点）。キラ芯 = 芯用辉星（glitter）星。',
    src: '玉名「キラ芯」（配方总表 0.1 芯段）；辉星化学见配方总表 1.4', layers: [
      mtOyaBotan('亲星 · 红牡丹', 'Red', MT_COL.red),
      mtL('芯 · 金辉星', 'Glitter', 'glitter', 0.5, { stars: 200, headSize: 0.8 }, MT_COL.gold, MT_RAMP_GOLD)] },
  { id: 'shiyuShin', name: '雌雄芯菊', en: 'ShiyuShin', group: 1, burn: 2.9,
    note: '银白菊 + 粗细两种星混在一起的芯（雄 = 少量粗亮红星、雌 = 很多细小黄星，同一半径），像花蕊。具体做法没查实（⚠），按「粗细星混合」的描述做；粗星终端速度高，初速按同一半径分别反推。',
    src: '淀川花火「雌雄芯」释义（配方总表 0.1）⚠ 做法未核实', layers: [
      mtOyaKiku('亲星 · 银白菊', 'Kiku', MT_COL.warm, { T0: 2550, sparkLife: 0.3, sparkRate: 140 }, { ...MT_RAMP_GOLD, ramp2: '#ffdcb0', ramp3: '#fffbf5' }),
      mtCore('芯 · 雄（粗星）· 红', 'Male', 0.5, MT_COL.red, { stars: 70, headSize: 1.5, vt: 19 }),
      mtCore('芯 · 雌（细星）· 黄', 'Female', 0.5, MT_COL.yellow, { stars: 420, headSize: 0.55, vt: 13.5 })] },
  { id: 'palmShin', name: '椰子芯入 · 红芯', en: 'PalmShin', group: 1, burn: 3.4,
    note: '金椰子（十几颗粗亮星，粗金尾下垂成椰子叶）+ 红芯。芯是普通色星，燃烧短，先灭；椰子的尾留到最后。',
    src: '椰子 = 少数粗星、粗尾（配方总表 0.2 半割物）；「椰子芯入」常见玉名 〇', layers: [
      mtL('亲星 · 金椰子', 'Palm', 'palm', 1, { stars: 16, vt: 30 }, MT_COL.gold, MT_RAMP_GOLD),
      mtCore('芯 · 红', 'Red', 0.42, MT_COL.red, { burn: 2.4, stars: 300, headSize: 1.0 }, { hi: 1.4 })] },
  // ---------------- 中式复合 ----------------
  { id: 'fourColorCrackle', name: '四色牡丹霹雳蕊', en: 'FourColorCrackle', group: 2, burn: 2.8,
    note: '同一爆点四组色星（粉 / 绿 / 蓝 / 金，混合分布）+ 霹雳蕊。中式名字就是配方：颜色 + 主体 + 蕊。实拍的扇区分色（色分け）和交叉环还没有能力，见原理第 6 节。',
    src: '永丰 10 寸「四色牡丹霹雳蕊带交叉环」（vidio/3.0，配方总表 2.1 / 2.3 中式复合花）', layers: [
      ...[['粉', 'Pink', MT_COL.pink], ['绿', 'Green', MT_COL.green], ['蓝', 'Blue', MT_COL.blue], ['金', 'Gold', MT_COL.yellow]].map((c, i) =>
        mtL('亲星 · ' + c[0] + '组', c[1], 'botan', 1, { stars: 95, headSize: 1.05, sparkRate: 0, flicker: 0.15, seed: 61 + i, flash: i ? 0 : 1, vt: MT_VT[0] }, c[2], MT_RAMP_NEUTRAL)),
      mtL('蕊 · 金霹雳', 'Crackle', 'crackle', 0.42, { stars: 110, headSize: 0.85, crackleDelay: 0.5, vt: MT_VT[1] }, MT_COL.gold, MT_RAMP_GOLD)] },
  // ---------------- 半割物 · 千轮（4.9.6）----------------
  { id: 'colorSenrin', name: '彩色千轮', en: 'ColorSenrin', group: 3, burn: 0.9, peers: true,
    note: '一发里抛出二十多个小玉，0.85 s 后各自开成小花；四组小玉各一种颜色（红 / 绿 / 青 / 黄），混在一起。每组一层（同一时刻开）；比花型模板「千轮」小玉飞得开、小花小，一朵一色看得清。',
    src: '千輪 / 彩色千輪（配方总表 0.2 半割物；云端配方预览「彩色千轮」四组色）', layers:
      [['红', 'Red', MT_COL.red], ['绿', 'Green', MT_COL.green], ['青', 'Blue', MT_COL.blue], ['黄', 'Yellow', MT_COL.yellow]].map((c, i) =>
        // 小花要分得开、一朵一色：小玉比星重（终端速度 30）、飞得开（约 70 m），小花本身小（子星初速 24 → 半径约 15 m）。
        // 花型模板「千轮」的小花大（子星初速 45）、小玉近，四组叠在一起每朵都成了混色（第一次定帧看到的）
        mtL('小花 · ' + c[0], c[1], 'senrin', 1, { stars: 6, v0: 120, vt: 30, burn: 0.9, subSpeed: 24, subStars: 30, duration: 3.2, seed: 71 + 7 * i }, c[2], MT_RAMP_NEUTRAL)) },
  // ---------------- 单层变体（4.9.6）：花型模板换颜色 / 换尾的常见玉名，一层 ----------------
  { id: 'ginKamuro', name: '银冠', en: 'GinKamuro', group: 4, burn: 3.8, R: 130,
    note: '锦冠的银色版：长火花慢慢下垂成冠，火花是银白（钛 / 铝系）。参数和花型模板「锦冠」一样，只换火花颜色（渐变图）、温度略高。',
    src: '銀冠（配方总表 0.2：银冠、冠柳现在能做）', layers: [
      mtL('银冠', 'GinKamuro', 'kamuro', 1, { stars: 150, vt: 24, T0: 2050 }, MT_COL.silver, MT_RAMP_SILVER)] },     // 温度只比金冠（1950）高一点：太热了按最亮处归一后冷下来的火花相对太暗，冠尾变短（T0 2600 试过）
  { id: 'ginYanagi', name: '银柳', en: 'GinYanagi', group: 4, burn: 5.2,
    note: '柳的银色版：壳只裂开，银白长火花慢慢垂下来。参数和花型模板「柳」一样（初速、终端速度、燃烧都沿用），只换火花颜色和温度。',
    src: '柳 / 銀柳（配方总表 0.2 ポカ物）', layers: [
      mtL('银柳', 'GinYanagi', 'yanagi', 1, { v0: 95, vt: 9, T0: 2000 }, MT_COL.silver, MT_RAMP_SILVER)] },     // 同银冠：温度只比金柳（1900）高一点，柳丝长度不变
  { id: 'yanagiTips', name: '金柳 · 红先', en: 'YanagiRedTips', group: 4, burn: 5.2,
    note: '金柳垂到最后（4.2 s）火花停、星头亮起来变红：柳枝末端一串红点（西方目录叫「willow with red tips」）。',
    src: '柳 + 先（星末段变色，配方总表 0.1「先」）；「Willow with color tips」为常见商品名 〇', layers: [
      mtL('金柳 → 红先', 'YanagiTips', 'yanagi', 1, { v0: 95, vt: 9, sparkStop: 4.2, headBright: 1.3, headDim: 0.3, headDimUntil: 4.2 }, [[0, MT_COL.gold], [4.2, MT_COL.red]], MT_RAMP_GOLD)] },
  { id: 'hikiSakiKiku', name: '引先变化菊', en: 'HikiSakiKiku', group: 4, burn: 3.0,
    note: '「引」：先拉 0.5 s 橙色炭火尾（星头暗）→ 星头亮起变红 → 1.55 s 变绿，无尾。和多层「八重芯变化菊」的亲星同一套，单独一层。',
    src: '引 / 引先（配方总表 0.1、0.2）；云端配方预览「引先菊」', layers: [
      mtOyaKiku('引 → 红 → 绿', 'HikiSaki', [[0, MT_COL.orange], [HK.hiki, MT_COL.red], [HK.c2, MT_COL.green]], { sparkStop: HK.hiki, headDim: 0.18, headDimUntil: HK.hiki, sparkLife: 0.5, sparkRate: 150 }, MT_RAMP_NEUTRAL)] },
  { id: 'henkaBotan', name: '变化牡丹 · 红绿黄', en: 'HenkaBotan', group: 4, burn: 2.8,
    note: '无尾牡丹星分层变色：红 → 1.0 s 绿 → 1.9 s 黄（分层星外层先烧）。花型库只有「变色菊」，变化牡丹没单列。',
    src: '変化牡丹（配方总表 0.2 割物）', layers: [
      mtOyaBotan('红 → 绿 → 黄', 'HenkaBotan', [[0, MT_COL.red], [1.0, MT_COL.green], [1.9, MT_COL.yellow]])] },
];
const MULTI_BY_ID = Object.fromEntries(MULTI_TYPES.map(r => [r.id, r]));
// 每层贴图曝光（analysis/scripts/多层模板曝光.py 按 autoExposure40 算的，和花型模板 EXPOSURE40 同一算法）；没有就用花型模板的
const MT_EXPOSURE = {"shinKiku": [0.833, 2.49], "shinBotan": [2.9, 2.49], "yaeshin": [0.613, 2.45, 1.62], "yaeHenka": [1.97, 2.54, 1.64], "mieshin": [0.843, 2.58, 2.5, 1.49], "yoeshin": [2.87, 2.63, 2.54, 1.79, 1.4], "itsueHenka": [1.97, 2.68, 2.57, 2.03, 1.67, 1.38], "yaeStrobe": [2.91, 2.52, 1.66], "kamuroShin": [2.26, 2.57], "crackleShin": [2.9, 1.86], "strobeShin": [2.87, 2.23], "fourColorCrackle": [3.07, 3.04, 3.07, 3.07, 1.73], "yaeBlueBotan": [2.78, 0.546, 0.136], "jisaShinBotan": [2.07, 2.37], "henkaKikuShin": [2.06, 2.45], "mieStrobeKiku": [1.95, 2.58, 2.5, 1.49], "kiraShin": [2.9, 0.684], "shiyuShin": [0.647, 2.51, 2.82], "palmShin": [0.284, 1.62], "yanagiTips": [0.769], "hikiSakiKiku": [1.97], "henkaBotan": [2.9], "mieKamuroSaki": [2.6, 3.21, 2.76, 2.52, 1.88], "ginKamuro": [1.79]};
// 每层的显示强度（Color Over Life 倍数）：各层贴图都按自己最亮处归一，这里按游戏内大小看过定层间明暗（亲星最亮、芯略暗）
// 彩色芯按颜色的亮度补：铜蓝、锶红、紫这些亮度低的色给高一点，柠檬绿、黄、银白不补（(0.45 / 相对亮度)^0.5，夹在 0.9–1.45）
const mtLum = hex => { const c = hexToLin(hex); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const mtHeadInt = (r, i) => { const l = r.layers[i]; if (l.hi != null) return l.hi; if (i === 0 && !r.peers) return 1;     // peers：几层平级、没有亲星（4.9.6 彩色千轮）
  const L = l.m.stages.reduce((a, s) => a + mtLum(s[1]), 0) / l.m.stages.length; return +clamp(Math.sqrt(0.45 / Math.max(0.05, L)), 0.9, 1.45).toFixed(2); };
// 一个模板 → 每层的完整参数（P）和颜色（M）。不改界面状态；探针 / 标准检查 / 缩略图脚本也用它
function mtLayers(id) {
  const r = MULTI_BY_ID[id]; if (!r) throw new Error('没有这个多层模板：' + id);
  const R = r.R || 95;     // 亲星熄灭时的半径（米）：和花型库的菊（约 83 m）同一量级，约 5–6 号；锦冠这类大花型可以单独给
  return r.layers.map((l, i) => {
    const d = defaultsFor(l.type), burn = l.p.burn != null ? l.p.burn : r.burn, vt = l.p.vt != null ? l.p.vt : MT_VT[Math.min(i, MT_VT.length - 1)];
    const v0 = Math.round(clamp(v0For(R * l.k, vt, burn), 12, 600));
    const P = derive({ ...d.P, renderVer: 40, seed: 41 + 11 * i, burn, burnJit: 4, fade: 0.14, lastFlare: 0, vt, v0, burstR0: 0, speedJit: 3, dirJit: 1.2,
      duration: +(Math.max(burn, l.p.burn || 0) + (l.type === 'kamuro' ? 1.6 : 0.55)).toFixed(2), flash: i ? 0 : 1, ...l.p });
    if (l.type === 'kamuro') P.duration = Math.max(P.duration, d.P.duration);
    // 4.7.0 起结尾等火花自然灭完（不再最后整体淡出）：时长盖到这一层最后一批火花（和花型模板同一口径，sparkTailEnd）
    if (+P.sparkRate > 0 && typeof sparkTailEnd === 'function') { const end = sparkTailEnd(P); if (end > P.duration) P.duration = +(end + 0.05).toFixed(2); }
    const ex = MT_EXPOSURE[id] && MT_EXPOSURE[id][i]; if (ex) P.exposure = ex;
    const M = normalizeM({ ...d.M, ...l.m }, l.type);
    return { title: l.title, en: l.en, type: l.type, P, M, delay: l.delay || 0, headInt: mtHeadInt(r, i), tailInt: 1, out: l.out };
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
async function mtRenderStills(id, opt) {
  const layers = mtLayers(id), px = opt.px || 512, out = [];
  const saved = { hdr: hdrT, rg: rgT, mode: state.ref.mode, expo: state.expo, busy: state.stillBusy };
  state.stillBusy = true; await nextTick(); gl.activeTexture(gl.TEXTURE0);
  const P0 = layers[0].P, sub = ['senrin', 'crossette'].includes(P0.type);     // 千轮 / 分裂：外圈 = 小玉飞到的地方 + 小花半径
  const R0 = sub ? reachOf(P0.v0, P0.vt, P0.subDelay) + reachOf(P0.subSpeed, +P0.subVt > 0 ? +P0.subVt : P0.vt, P0.subBurn) : reachOf(P0.v0, P0.vt, P0.burn), half = opt.half || R0 * 1.22, cy = opt.cy != null ? opt.cy : -R0 * 0.1;
  const rs = layers.map(l => ({ l, pl: displayPlan40(l.P), R: makeRenderer(l.P, 'burst'), q: qualityOf(l.P) }));
  let H = null; const tg = [];
  try {
    H = new Target(px, px, gl.RGBA16F, true); canvas.width = canvas.height = px; hdrT = H; state.ref.mode = 0; state.expo = opt.expo == null ? 1 : opt.expo;
    for (const t of opt.times.slice().sort((a, b) => a - b)) {
      H.clear();
      for (const x of rs) {
        const tl = t - x.l.delay; if (tl < 0) continue;
        const samples = new Target(px * x.q.ss, px * x.q.ss, gl.RGBA16F), cell = new Target(px, px, gl.RGBA16F); tg.push(samples, cell); rgT = cell;
        const view = [0, cy, half, half]; renderCell40(x.l.P, x.pl, x.R, tl, samples, cell, view);
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
