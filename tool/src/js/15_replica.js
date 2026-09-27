// =====================================================================
//  实拍复刻：按你发来的 14 段视频逐个复刻
//  有测量数据的（V01–V06、V11、V12、V14）初速、燃烧、消え口、下垂由自动校准得到；其余按视频目测
//  每个复刻 = 基础花型 + 号数 + 参数覆盖 + 分段颜色；ref = 对应的实拍测量（数值对比默认用它）
// =====================================================================
const C = { red: '#ff2a1c', pink: '#ff7ab8', orange: IGNITE_ORANGE, gold: '#ffb45a', yellow: '#ffc53a', green: '#52ff5e', cyan: '#35e0c8', blue: '#3d6cff', purple: '#b44dff', silver: '#eef2ff', white: '#fff3dc' };
const REPLICAS = [
  { id: 'V01', name: 'V01 变色菊·红银点灭', base: 'kiku', shell: 7, ref: 'V01',
    note: '开花红点火 → 银白拖尾 → 转橙 → 后段变红 → 末尾银色点灭',
    p: { v0: 212, burn: 2.74, burnJit: 14, fade: 0.49, grav: 1.3, massLoss: 0.35, strobeHz: 12, strobeDuty: 0.35, strobeStart: 0.84, sparkRate: 110, T0: 2250 },
    m: { stages: [[0, C.red], [0.3, C.silver], [0.65, C.gold], [1.7, C.red], [2.25, C.silver]] } },
  { id: 'V02', name: 'V02 红牡丹（主层）', base: 'botan', shell: 5, ref: 'V02',
    note: '白色开花迅速转红，下垂重；配银芯见组合「V02 红牡丹·银芯」',
    p: { v0: 240, burn: 1.5, burnJit: 12, grav: 1.5, massLoss: 0.45, fade: 0.2, duration: 2.3 },
    m: { stages: [[0, C.silver], [0.3, C.red], [0.5, C.pink], [0.85, C.silver]] } },
  { id: 'V03', name: 'V03 变色牡丹（主层）', base: 'botan', shell: 6, ref: 'V03',
    note: '橙色点火 → 白 → 银，熄灭拖得很长；配绿芯见组合「V03 绿芯变色牡丹」',
    p: { v0: 179, burn: 2.8, burnJit: 26, fade: 0.45, grav: 0.6, massLoss: 0.3, shellVy: 10, duration: 3.9 },
    m: { stages: [[0, C.orange], [0.25, C.white], [0.6, C.silver]] } },
  { id: 'V04', name: 'V04 变色菊·金黄绿', base: 'kiku', shell: 8, ref: 'V04',
    note: '金 → 橙 → 黄 → 绿，开花极快；带上升尾迹',
    p: { v0: 240, burn: 2.4, burnJit: 12, fade: 0.3, shellVy: 10, sparkRate: 80 },
    m: { stages: [[0, C.gold], [0.2, C.orange], [1.1, C.yellow], [1.85, C.green]] } },
  { id: 'V05', name: 'V05 金芒菊·银白', base: 'kiku', shell: 10, ref: 'V05',
    note: '银白长芒拖尾，几乎不下垂，燃烧很长',
    p: { v0: 318, burn: 6.27, burnJit: 18, fade: 0.36, grav: 0.8, sparkRate: 240, sparkLife: 1.2, sparkSpread: 1.1, sparkInherit: 0.15, T0: 2450, cooling: 0.3, headBright: 0.8, lastFlare: 0.1, duration: 7 },
    m: { stages: [[0, C.silver], [0.8, C.white], [3.4, C.silver]], ramp1: '#6a6a78', ramp2: '#d8dcff', ramp3: '#ffffff' } },
  { id: 'V06', name: 'V06 锦冠·金', base: 'kamuro', shell: 10, ref: 'V06',
    note: '金色锦冠，熄灭非常缓（消え口 80%）',
    p: { v0: 380, burn: 6.2, burnJit: 20, fade: 0.9, massLoss: 0.18, shellVy: 2.5, duration: 7.8 },
    m: { stages: [[0, C.red], [0.5, '#ffd0a0'], [1.2, '#fff0d8']] } },
  { id: 'V07', name: 'V07 城市秀·金千轮', base: 'senrin', shell: 5, ref: null,
    note: '城市烟花秀里的金色千轮；辉星见「V07 城市秀·辉星」',
    p: { subTail: 60, carrierTail: 60, subStars: 30 },
    m: { stages: [[0, C.gold]] } },
  { id: 'V07b', name: 'V07 城市秀·辉星', base: 'glitter', shell: 5, ref: null, note: '金色辉星', p: {}, m: { stages: [[0, C.gold]] } },
  { id: 'V08', name: 'V08 水中花火·青绿', base: 'water', shell: 5, ref: null,
    note: '贴水面的青绿色半球 + 倒影；彩色版见「V08 水中花火·彩色」',
    p: { stars: 140, waterRefl: 0.5 },
    m: { stages: [[0, C.cyan], [1.2, C.green]] } },
  { id: 'V08b', name: 'V08 水中花火·彩色', base: 'water', shell: 5, ref: null, note: '多色牡丹齐射贴水面', p: { stars: 160, waterRefl: 0.5, sparkRate: 0 },
    m: { stages: [[0, C.pink], [0.7, C.cyan], [1.3, C.yellow]] } },
  { id: 'V09r', name: 'V09 银色长曲导', base: 'rise', shell: 10, ref: null, note: '银色长尾曲导，轻微弯曲', p: { riseStyle: 'silver', wobble: 3, wobbleHz: 0.8 }, m: { stages: [[0, C.silver]] } },
  { id: 'V09', name: 'V09 红牡丹 → 金锦冠', base: 'kamuro', shell: 10, ref: null,
    note: '先红（牡丹）后金（锦冠）的大型双色；地面扇形见「V09 地面扇形」',
    p: { burn: 4.5, sparkRate: 200 }, m: { stages: [[0, C.red], [1.1, C.pink], [1.6, C.gold]] } },
  { id: 'V09f', name: 'V09 地面扇形·红', base: 'fan', shell: 0, ref: null, note: '低矮的红色扇形连发', p: { nozzles: 9, fanAngle: 100, shotRate: 6, shotSpeed: 45, cometBurn: 0.9 }, m: { stages: [[0, C.red]] } },
  { id: 'V10', name: 'V10 地面扇形·金', base: 'fountain', shell: 0, ref: null,
    note: '一排喷泉排成扇面，高而密的金色火花',
    p: { nozzles: 13, spacing: 0.8, fanAngle: 110, jetSpeed: 55, jetCone: 3, sparkRate: 900, sparkLife: 1.5, sparkDrag: 0.55, sparkSpread: 0.6, sparkSize: 0.25, shutter: 1, headSize: 0.3, headBright: 0.35, T0: 2250, cooling: 0.4, loopT: 1.2, duration: 1.2 },
    m: { stages: [[0, C.gold]] } },
  { id: 'V11', name: 'V11 十寸三重芯·五段变色（主层）', base: 'kiku', shell: 10, ref: 'V11',
    note: '橙 → 蓝 → 粉紫 → 银（辉） → 金，末尾白色点灭；芯见组合，曲导见「V11 银色摆动曲导」',
    p: { v0: 381, burn: 5.4, burnJit: 16, fade: 0.49, shellVy: 12, glitter: 0.35, glitterDelay: 0.35, strobeHz: 10, strobeStart: 0.86, sparkRate: 150, duration: 6.6 },
    m: { stages: [[0, C.orange], [0.8, C.blue], [2.0, '#c86bff'], [2.9, C.silver], [5.0, C.gold]] } },
  { id: 'V11r', name: 'V11 银色摆动曲导', base: 'rise', shell: 10, ref: null, note: '银色曲导，轻微摆动', p: { riseStyle: 'silver', wobble: 5, wobbleHz: 1.4 }, m: { stages: [[0, C.silver]] } },
  { id: 'V12', name: 'V12 多色变色锦冠·银', base: 'kamuro', shell: 8, ref: 'V12',
    note: '金 → 蓝金混色 → 银，之后 10 秒银色长垂',
    p: { v0: 355, burn: 9.2, burnJit: 16, fade: 0.77, massLoss: 0.38, grav: 1.15, shellVy: -5, sparkLife: 1.6, T0: 2300, duration: 11 },
    m: { stages: [[0, C.gold], [1.0, C.blue], [2.4, C.silver]], ramp1: '#6a6a78', ramp2: '#d8dcff', ramp3: '#ffffff' } },
  { id: 'V12r', name: 'V12 之字形金曲导', base: 'rise', shell: 8, ref: null, note: '强烈之字形摆动的金色曲导', p: { riseStyle: 'gold', wobble: 16, wobbleHz: 2.2 }, m: { stages: [[0, C.gold]] } },
  { id: 'V13', name: 'V13 片贝四尺玉（主层）', base: 'kamuro', shell: 40, ref: null,
    note: '紫粉芯 + 浓密金橙锦冠，辉星多、烟重；芯见组合',
    p: { burn: 9, burnJit: 20, fade: 0.7, glitter: 0.5, glitterDelay: 0.4, sparkRate: 60 }, m: { stages: [[0, C.gold], [2.0, C.orange]] } },
  { id: 'V13r', name: 'V13 细红曲导（四尺玉）', base: 'rise', shell: 40, ref: null, note: '细长红色曲导', p: { riseStyle: 'gold', sparkRate: 300 }, m: { stages: [[0, C.red]] } },
  { id: 'V14', name: 'V14 鸿巢四尺玉（主层）', base: 'kiku', shell: 40, ref: 'V14',
    note: '橙点火 → 白 → 金长拖尾，末尾红色点灭；小橙芯见组合',
    p: { v0: 291, burn: 8.7, burnJit: 20, fade: 0.25, grav: 0.68, shellVy: 7.5, strobeHz: 8, strobeStart: 0.86, strobeDuty: 0.4, sparkRate: 45 },
    m: { stages: [[0, C.orange], [0.7, '#ffffff'], [2.8, '#ffc98a'], [7.5, C.red]] } }
];
// 星自己带颜色的复刻用中性渐变图（颜色全由 Color Over Life 给）；金色锦冠类用暖色渐变图（冷却时发红），颜色分段用浅色
const NEUTRAL_RAMP = { ramp0: '#000000', ramp1: '#4a4a52', ramp2: '#c8c8d0', ramp3: '#ffffff' };
const WARM_RAMP = { ramp0: '#000000', ramp1: '#8a3208', ramp2: '#ffc266', ramp3: '#fff0d2' };
const WARM_IDS = new Set(['V06', 'V07', 'V07b', 'V09', 'V10', 'V13']);
const REPLICA_BY_ID = Object.fromEntries(REPLICAS.map(r => [r.id, r]));
// 复刻 → { P, M }
function replicaPM(id) {
  const r = REPLICA_BY_ID[id], d = defaultsFor(r.base), P = { ...d.P };
  if (r.shell) applyShellNo(P, r.shell);
  Object.assign(P, r.p);
  if (familyOf(r.base) === 'aerial' && P.duration < P.burn * 1.15 + 0.4) P.duration = +(P.burn * 1.15 + 0.5).toFixed(2);
  const M = normalizeM({ ...d.M, ...(WARM_IDS.has(id) ? WARM_RAMP : NEUTRAL_RAMP), ...r.m }, r.base);
  return { P: derive(P), M };
}
// 组合里的复刻层
const REPLICA_COMBOS = [
  { name: 'V02 红牡丹·银芯', layers: [{ m: 'rep:V02', scale: 1 }, { m: 'botan', scale: 0.45, stages: [[0, C.silver]] }] },
  { name: 'V03 绿芯变色牡丹', layers: [{ m: 'rep:V03', scale: 1 }, { m: 'botan', scale: 0.45, stages: [[0, C.green]] }] },
  { name: 'V09 红牡丹 → 金锦冠', layers: [{ m: 'rep:V09', scale: 1 }] },
  { name: 'V11 十寸三重芯', layers: [{ m: 'rep:V11', scale: 1 }, { m: 'botan', scale: 0.9, stages: [[0, C.orange], [0.4, C.blue], [1.1, C.silver]] }, { m: 'botan', scale: 0.5, stages: [[0, C.pink], [0.9, C.silver]] }] },
  { name: 'V13 片贝四尺玉', layers: [{ m: 'rep:V13', scale: 1 }, { m: 'botan', scale: 1.5, stages: [[0, C.purple], [0.6, C.pink]] }] },
  { name: 'V14 鸿巢四尺玉', layers: [{ m: 'rep:V14', scale: 1 }, { m: 'botan', scale: 0.5, stages: [[0, C.orange]] }] }
];
