// =====================================================================
//  4.9.30 节奏（整体快慢）（对话框新花型；用户 10-07 12:58「有些预设你做出来的我想要一个整体快一些的，我要调好多参数……为了更方便得调整节奏，
//  从而让帧率更可控」，13:31「1.加……5.现在这个节奏就是我测试进游戏的功能，不能等之后做」；方案 协作/方案_节奏_2026-10-07.md 4.1）
//  · 含义：同一朵花放快 / 放慢，大小、形状、颜色、亮度不变。k = 新节奏 ÷ 现在的节奏（> 1 快）。
//    时刻、时长 ÷k；速度 ×k；每秒的量（频率、生成率、线性阻力、转速）×k；重力 ×k²；方向乱飘（随机游走）×√k；变色时刻、过渡宽度 ÷k。
//    不变：终端速度 vt（模拟里是阻力系数 c = G / vt²，按米算，放快时位置一样 → c 不变）、按寿命 / 燃烧比例的量（冷却、淡出比例、点灭开始、× 寿命）、
//    星数、大小、亮度、曝光、帧率设置（fps / tick 是游戏里的时间，帧按新的整段重新排）。
//  · 和「号数」一样直接改写存的参数（面板上看到的就是实际的数，Ctrl+Z 一步）；P.tempo 记现在是原样的几倍，改回 1 = 换算回原样。
//    模拟 / 烘焙 / 导出不用改：节奏变了照常重烘。
//  · 整个效果一个值：多层时所有空中层一起换算，层的开始时间从最早那一层算起 ÷k（升空等别的层不动）。
//  · 多层「位置与时间」里的「时间倍率」（L.rate）是另一回事：只是播放快慢（不重烘、帧不重排、开始时间不跟着），这里不动它。
// =====================================================================
const TEMPO_T = ['duration', 'burn', 'flashTau', 'flashLife', 'ignDelay', 'afterBurn', 'headDimUntil', 'sparkLife', 'sparkStop', 'sparkStart', 'sparkRamp', 'sparkRise',
  'emberLife', 'emberFollow', 'emberEnd', 'subDelay', 'subBurn', 'glitterDelay', 'glitterW', 'crackleDelay', 'crackleLife', 'crackleTau', 'branchLife',
  'x1T', 'x1Delay', 'x1Life', 'x2T', 'x2Delay', 'x2Life', 'cutIn', 'cutOut', 'visTo', 'preFrom', 'burstSec', 'fadeAt'];     // 秒：> 0 才换算（0 / −1 = 自动 / 关）
const TEMPO_V = ['v0', 'wind', 'turb', 'tailDiffuse', 'shellVx', 'shellVy', 'sparkSpread', 'subSpeed', 'crackleV', 'branchV', 'flutter', 'x1V', 'x2V', 'beeSpeed'];     // 米 / 秒
const TEMPO_F = ['strobeHz', 'twinkleHz', 'flutterHz', 'x1FlickHz', 'x2FlickHz', 'sparkRate', 'subTail', 'carrierTail', 'x1Rate', 'x2Rate',
  'sparkDrag', 'x1Drag', 'x2Drag', 'spin', 'shellSpin'];     // 每秒：赫兹、个 / 秒、1 / 秒（线性阻力）、转速
const TEMPO_G = ['grav', 'sparkGrav', 'subGrav', 'x1Grav', 'x2Grav'];     // × 重力 → ×k²
const TEMPO_H = ['chaos'];     // 随机游走（每 √秒）→ ×√k
const TEMPO_MIN = 0.3, TEMPO_MAX = 3;
const tempoOf = P => { const v = P ? +P.tempo : NaN; return v > 0 && isFinite(v) ? v : 1; };
const tempoR = v => +(+v).toPrecision(7);
const tempoAir = P => !!P && familyOf(P.type) === 'aerial';
function tempoVal(P, k) { if (P[k] != null && P[k] !== '') return +P[k]; const d = typeof defaultsFor === 'function' ? defaultsFor(P.type).P[k] : undefined; return d != null ? +d : BASE[k] != null ? +BASE[k] : NaN; }
// 一层参数按 k 换算（就地改；只管空中花型）。不改 P.tempo（调用的人记）
function retimeP(P, k) {
  if (!tempoAir(P) || !(k > 0) || k === 1) return P;
  for (const q of TEMPO_T) { const v = tempoVal(P, q); if (v > 0) P[q] = tempoR(v / k); }
  for (const q of TEMPO_V) { const v = tempoVal(P, q); if (isFinite(v) && v !== 0) P[q] = tempoR(v * k); }
  for (const q of TEMPO_F) { const v = tempoVal(P, q); if (v > 0) P[q] = tempoR(v * k); }
  for (const q of TEMPO_G) { const v = tempoVal(P, q); if (isFinite(v) && v !== 0) P[q] = tempoR(v * k * k); }
  for (const q of TEMPO_H) { const v = tempoVal(P, q); if (v > 0) P[q] = tempoR(v * Math.sqrt(k)); }
  return P;
}
// 颜色（单层 state.M；多层每层自己的 L）：变色时刻、过渡宽度 ÷k
function retimeM(M, k) {
  if (!M || !(k > 0) || k === 1) return M;
  if (Array.isArray(M.stages)) M.stages = M.stages.map(s => [tempoR((+s[0] || 0) / k), ...s.slice(1)]);
  if (+M.xw > 0) M.xw = tempoR(+M.xw / k);
  return M;
}
// 号数（applyShellNo）从花型默认值改写的几个量（默认值 = 节奏 1）：按现在的节奏换算回来，其余参数本来就已经是这个节奏
function retimeShellKeys(P, t) {
  if (!tempoAir(P) || !(t > 0) || t === 1) return P;
  for (const q of ['burn', 'subDelay', 'sparkLife', 'duration']) if (+P[q] > 0) P[q] = tempoR(+P[q] / t);
  for (const q of ['v0', 'sparkRate']) if (+P[q] > 0) P[q] = tempoR(+P[q] * t);
  return P;
}
// 号数带默认节奏（用户 10-07 13:31「2.推荐用游戏紧凑做默认」；方案 4.2）：选号数时整段比「游戏紧凑」目标长，就按目标加快（只快不慢）；
// 目标整段 = 1.4 × 号数表这一号的燃烧 × 花型系数（柳、冠这类挂得久本来就是它的样子 × 1.6，点灭 / 时差 / 变色这类靠时间表演的 × 1.2–1.3）。
// 写实（号数表）= 把节奏改回 1。只在单层右栏选号数时用（多层、条目、模板不走这里）。
const TEMPO_TYPE_K = { yanagi: 1.6, kamuro: 1.6, palm: 1.5, ochiba: 1.5, strobe: 1.2, jisa: 1.25, henka: 1.3, glitter: 1.15, senrin: 1.3, crossette: 1.2 };
function tempoCompactEnd(P, n) { const r = typeof shellRow === 'function' ? shellRow(n) : null; return r ? 1.4 * r[4] * (TEMPO_TYPE_K[P.type] || 1) : 0; }
function tempoShellCompact(P, M, n) {
  if (!tempoAir(P) || !(n > 0)) return null;
  const t = tempoOf(P), end = tempoLayerEnd(P), want = tempoCompactEnd(P, n); if (!(want > 0) || !(end > want * 1.02)) return null;
  const T = clamp(tempoR(t * end / want), TEMPO_MIN, TEMPO_MAX), k = T / t; if (Math.abs(k - 1) < 1e-3) return null;
  retimeP(P, k); P.tempo = T; if (M) retimeM(M, k);
  return { T, end0: end, end1: tempoLayerEnd(P) };
}
// 这个效果的「整段」= 看得见的结尾：最后一颗星烧完 / 最后一批火花灭完（layerEndOf、sparkTailEnd），不超过序列时长（设了出点按出点）。
// 不直接用序列时长：有的层序列时长留得很长（鸿巢返工的红点灭层 18 s），导出时末尾全黑的帧会裁掉，按它算「整段想要几秒」会差很多。
// 多层 = 各层开始时间 + 自己的整段 ÷ 时间倍率，取最大
function tempoLayerEnd(P) {
  const d = +P.cutOut > 0 ? Math.min(+P.cutOut, +P.duration || 0) : +P.duration || 0; let v = 0;
  try { v = Math.max(typeof layerEndOf === 'function' ? layerEndOf(P) : 0, +P.sparkRate > 0 && typeof sparkTailEnd === 'function' ? sparkTailEnd(P) : 0); } catch (e) { v = 0; }
  return v > 0 ? Math.min(d, v) : d;
}
// 烘好了而且和现在的参数对得上：按烘焙的真长度（末尾全黑的帧已经裁掉；余烬这类越来越暗的长尾估不准，鸿巢返工的锦冠层估 18 s、烘出来 10 s）
function tempoBakeFresh(P, b) { return !!(b && b.meta && b.P && Math.abs((+b.P.duration || 0) - (+P.duration || 0)) < 1e-3 && Math.abs(tempoOf(b.P) - tempoOf(P)) < 1e-6 && Math.abs((+b.P.burn || 0) - (+P.burn || 0)) < 1e-6); }
function tempoEndOf(P, b) { return tempoBakeFresh(P, b) && typeof bakeTotal === 'function' ? bakeTotal(b) : tempoLayerEnd(P); }
function tempoEffectEnd() {
  if (state.tab === 'combo' && state.layers && state.layers.length) {
    let d = 0; for (const L of state.layers) { const e = typeof layerEntryOf === 'function' ? layerEntryOf(L) : null; if (e && e.P) d = Math.max(d, (+L.delay || 0) + tempoEndOf(e.P, e.bake) / (+L.rate > 0 ? +L.rate : 1)); }
    return d;
  }
  return state.P ? tempoEndOf(state.P, state.bake) : 0;
}
// 这次要换算的：单层 = 当前效果；多层 = 所有空中层
function tempoTargets() {
  if (state.tab === 'combo' && state.layers && state.layers.length) return state.layers.map((L, i) => ({ L, i, e: typeof layerEntryOf === 'function' ? layerEntryOf(L) : null }))
    .filter(x => x.e && tempoAir(x.e.P)).map(x => ({ ...x, P: x.e.P, Ms: [x.L, x.e.M] }));
  return tempoAir(state.P) ? [{ P: state.P, Ms: [state.M] }] : [];
}
// 设节奏（绝对值，1 = 原样）。返回 [换算前整段, 换算后整段]；没换返回 null
function applyTempo(T) {
  T = clamp(+T || 1, TEMPO_MIN, TEMPO_MAX); T = Math.abs(T - 1) < 1e-6 ? 1 : tempoR(T);
  const xs = tempoTargets(); if (!xs.length) return null;
  if (xs.every(x => Math.abs(tempoOf(x.P) - T) < 1e-6)) return null;
  const end0 = tempoEffectEnd(), k0 = T / tempoOf(xs[0].P), seen = new Set();
  const lay = xs.filter(x => x.L), d0 = lay.length ? Math.min(...lay.map(x => +x.L.delay || 0)) : 0;
  for (const x of xs) {
    const k = T / tempoOf(x.P);
    retimeP(x.P, k); x.P.tempo = T;
    for (const M of x.Ms) if (M && !seen.has(M)) { seen.add(M); retimeM(M, k); }
    if (x.L) x.L.delay = tempoR(d0 + ((+x.L.delay || 0) - d0) / k0);
    derive(x.P);
    if (x.e && x.P !== state.P && typeof queueLayerBake === 'function') queueLayerBake(x.e, 0);
  }
  if (typeof stage2 !== 'undefined') stage2.tlSig = '';
  onParam();
  if (typeof refreshPanelValues === 'function') refreshPanelValues();
  if (lay.length && typeof buildLayerCard === 'function') { try { buildLayerCard(); if (typeof buildLayerHead === 'function' && state.comboSel >= 0) buildLayerHead(state.comboSel); } catch (err) { } }
  const end1 = tempoEffectEnd();
  if (typeof flash === 'function') flash(`节奏 ×${(+T).toFixed(2)}${T === 1 ? '（原样）' : ''}：整段 ${end0.toFixed(2)} → ${end1.toFixed(2)} s${lay.length > 1 ? `（${lay.length} 层一起，开始时间跟着）` : ''}`);
  return [end0, end1];
}
// 按「整段想要几秒」反推节奏
function tempoForEnd(sec) { const end = tempoEffectEnd(), t = tempoOf(state.P); return end > 0 && sec > 0 ? clamp(t * end / sec, TEMPO_MIN, TEMPO_MAX) : t; }
// 这一层现在的烘焙：几帧、几张、平均几 fps（烘焙和现在的参数对不上就不写数）
function tempoBakeNow() {
  const x = typeof curLayerBakes === 'function' ? curLayerBakes().find(r => state.tab !== 'combo' || r.i === state.comboSel) : null, b = x && x.b;
  if (!b || !b.meta || !b.meta.L || !tempoBakeFresh(state.P, b)) return null;
  const parts = bakeParts(b), F = parts.reduce((n, s) => n + (s.meta.L ? s.meta.L.F : 0), 0), t0 = parts[0].meta.t0 || 0, D = Math.max(0.05, bakeTotal(b) - t0);
  return { F, pages: parts.length, D, fps: F / D };
}
// 试算（不烘，只排帧）：几档节奏下这一层的整段、帧数、张数、最慢 fps、每帧最多跳几像素
const tempoTrial = { sig: '', rows: null };
function tempoTrialRun() {
  const P0 = state.P, t = tempoOf(P0), rows = [];
  for (const T of [0.8, 1, 1.25, 1.5, 2]) {
    try {
      const P = derive(retimeP(structuredClone(P0), T / t)); P.tempo = T;
      const fm = measure(P), pl = plan(P, fm), L = typeof frameLedger === 'function' ? frameLedger(P, fm, pl) : null, cap = pl.capacityFrames || (pl.L && pl.L.F) || 64;
      const F = L ? L.F : pl.L.F;
      rows.push({ T, end: tempoLayerEnd(P), F, pages: Math.max(1, Math.ceil(F / Math.max(1, cap))), minFps: L ? L.minFps : null, max: L ? L.maxHeld : null, over: L ? L.over : null, cur: Math.abs(T - t) < 1e-6 });
    } catch (e) { rows.push({ T, err: String(e && e.message || e) }); }
  }
  tempoTrial.sig = JSON.stringify(P0); tempoTrial.rows = rows;
}
function tempoInfoHTML() {
  const P = state.P; if (!tempoAir(P)) return '';
  const t = tempoOf(P), end = tempoEffectEnd(), combo = state.tab === 'combo' && state.layers && state.layers.length > 1, now = tempoBakeNow();
  const f2 = v => (+v).toFixed(2), btn = T => `<button type="button" data-tempo="${T}"${Math.abs(T - t) < 1e-6 ? ' class="on" aria-pressed="true"' : ''}>${T === 1 ? '原样' : '×' + T}</button>`;
  const head = `<div>节奏 <b>×${f2(t)}</b>${t === 1 ? '（原样）' : t > 1 ? '（比原样快）' : '（比原样慢）'} · 整段 <b>${f2(end)} s</b>${combo ? '（整朵）' : ''}`
    + (now ? ` · ${combo ? '这一层 ' : ''}${now.F} 帧 / ${now.pages} 张 · 平均 ${now.fps.toFixed(0)} fps` : ' · 烘完写帧数') + '</div>';
  const quick = `<div class="tq">${[0.8, 1, 1.25, 1.5, 2].map(btn).join(' ')}</div>`;
  const target = `<div class="tt"><label>整段想要  <input type="number" data-tempo-target min="0.3" max="30" step="0.1" style="width:5.5em" value="${f2(end)}" aria-label="整段想要几秒"> s</label> <button type="button" data-tempo-go>用这个</button></div>`;
  const tr = tempoTrial.rows && tempoTrial.sig === JSON.stringify(P) ? tempoTrial.rows : null;
  const trial = tr ? `<div class="otrial"><div>试算（不烘，只排帧；跳 = 游戏里${typeof STEP_REF_DIST !== 'undefined' ? ` ${STEP_REF_DIST} m 外` : ''}每帧最多跳几像素，标定线 ${typeof STEP_REF_PX !== 'undefined' ? STEP_REF_PX : 0.77}${combo ? '；只算这一层' : ''}）：</div>${tr.map(r => r.err ? `<div>×${r.T}：算不出（${r.err}）</div>`
      : `<div class="${r.cur ? 'on' : ''}" style="flex-wrap:nowrap;align-items:flex-start">${r.cur ? '<b style="white-space:nowrap">现在</b>' : `<button type="button" class="btn mini" style="white-space:nowrap" data-tempo="${r.T}">用 ×${r.T}</button>`}<span style="flex:1 1 0;min-width:0">${r.cur ? '×' + r.T + ' · ' : ''}${f2(r.end)} s · ${r.pages} 张 ${r.F} 帧${r.minFps != null ? ` · 最慢 ${r.minFps.toFixed(r.minFps < 10 ? 1 : 0)} fps` : ''}${r.max != null ? ` · 跳 ${r.max.toFixed(2)} px` : ''}${r.over ? `（${r.over} 帧超线）` : ''}</span></div>`).join('')}</div>`
    : `<div><button type="button" data-tempo-trial>试算几档节奏的帧数</button></div>`;
  const note = `<p class="hint">同一朵花放快 / 放慢：时间 ÷、速度 ×、重力 ×²，大小形状不变；${combo ? '所有空中层一起换算，开始时间跟着。' : ''}贴图张数不变时，快了帧率就高、慢了就低。改回 1 = 原样。</p>`;
  return `<div class="tempoinfo">${head}${quick}${target}${trial}${note}</div>`;
}
function tempoInfoRefresh() { document.querySelectorAll('#params [data-info=tempoInfo]').forEach(r => r._refresh && r._refresh()); }
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('click', ev => {
    const b = ev.target && ev.target.closest ? ev.target.closest('[data-tempo],[data-tempo-go],[data-tempo-trial]') : null;
    if (!b || !b.closest('.tempoinfo')) return;
    if (b.hasAttribute('data-tempo-trial')) { b.disabled = true; b.textContent = '试算中…'; setTimeout(() => { tempoTrialRun(); tempoInfoRefresh(); }, 20); return; }
    if (b.hasAttribute('data-tempo-go')) { const i = b.closest('.tempoinfo').querySelector('[data-tempo-target]'), s = i ? +i.value : NaN; if (s > 0) applyTempo(tempoForEnd(s)); tempoInfoRefresh(); return; }
    applyTempo(+b.dataset.tempo); tempoInfoRefresh();
  });
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' || !ev.target || !ev.target.matches || !ev.target.matches('.tempoinfo [data-tempo-target]')) return;
    const s = +ev.target.value; if (s > 0) { applyTempo(tempoForEnd(s)); tempoInfoRefresh(); } ev.preventDefault();
  });
  // 烘完了「这一层几帧几张」要跟着变：只在这一行看得见时每秒比一次（烘焙对象换了才重画）
  let tempoSeen = null;
  setInterval(() => {
    const r = document.querySelector('#params [data-info=tempoInfo]'); if (!r || !r.offsetParent || !r._refresh || (document.activeElement && r.contains(document.activeElement))) return;
    const x = typeof curLayerBakes === 'function' ? (() => { try { return curLayerBakes().find(q => state.tab !== 'combo' || q.i === state.comboSel); } catch (e) { return null; } })() : null;
    const sig = x && x.b; if (sig !== tempoSeen) { tempoSeen = sig; r._refresh(); }
  }, 1000);
}
