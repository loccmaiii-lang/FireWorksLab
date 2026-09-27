// =====================================================================
//  实拍复刻：按你发来的 14 段视频逐个复刻
//  有测量数据的（V01–V06、V11、V12、V14）初速、燃烧、消え口、下垂由自动校准得到；其余按视频目测
//  每个复刻 = 基础花型 + 号数 + 参数覆盖 + 分段颜色；ref = 对应的实拍测量（数值对比默认用它）
// =====================================================================
const C = { red: '#ff2a1c', pink: '#ff7ab8', orange: IGNITE_ORANGE, gold: '#ffb45a', yellow: '#ffc53a', green: '#52ff5e', cyan: '#35e0c8', blue: '#3d6cff', purple: '#b44dff', silver: '#eef2ff', white: '#fff3dc' };
// 3.1 的 V01–V14 「复刻」只是在现成花型上改了几个数、没有还原尾缀和密度，已撤下；
// 现在按「一个视频一个效果、用对照图和数值确认后再加」的方式重做。每项：
//   id, name, base（基础花型）, video（参考视频）, note, tags, status, P（完整参数覆盖）, m（颜色）, thumbRef（实拍缩略图）
const REPLICAS = [];

// 星自己带颜色的复刻用中性渐变图（颜色全由 Color Over Life 给）；金色锦冠类用暖色渐变图（冷却时发红），颜色分段用浅色
const NEUTRAL_RAMP = { ramp0: '#000000', ramp1: '#4a4a52', ramp2: '#c8c8d0', ramp3: '#ffffff' };
const WARM_RAMP = { ramp0: '#000000', ramp1: '#8a3208', ramp2: '#ffc266', ramp3: '#fff0d2' };
const WARM_IDS = new Set(['V06', 'V07', 'V07b', 'V09', 'V10', 'V13']);
const REPLICA_BY_ID = Object.fromEntries(REPLICAS.map(r => [r.id, r]));
// 复刻 → { P, M }
function replicaPM(id) {
  const r = REPLICA_BY_ID[id], d = defaultsFor(r.base), P = { ...d.P };
  if (r.shell) applyShellNo(P, r.shell);
  Object.assign(P, r.p || {}, { type: r.base });
  if (familyOf(r.base) === 'aerial' && P.duration < P.burn * 1.15 + 0.4) P.duration = +(P.burn * 1.15 + 0.5).toFixed(2);
  const M = normalizeM({ ...d.M, ...(WARM_IDS.has(id) ? WARM_RAMP : NEUTRAL_RAMP), ...r.m }, r.base);
  return { P: derive(P), M };
}
// 组合里的复刻层（多层的复刻做好后加在这里）
const REPLICA_COMBOS = [];

