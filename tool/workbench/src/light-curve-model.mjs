// 编排 → UE 灯光曲线（16.0.40，本机同步 8）。逐行移植 tool/fwlight/lib/light_model.py（同事 10-15 交接），
// 要求和 Python 逐键一致：随机相位用与 Python random.Random(seed) 相同的 MT19937，取整按 Python 的四舍六入五成双。
// 输出 fwlight.keys/2（tool/fwlight/ue/ue_apply_keys.py 直接读），交付包由 fwlight.py apply-pack 写进 UE。
import {LIGHT_RIG} from './light-rig.mjs';

// ---------------------------------------------------------------- Python 兼容的小工具
function pyRandom(seed) {
  const N = 624, M = 397, mt = new Uint32Array(N);
  let mti = N + 1;
  const initGenrand = s => {
    mt[0] = s >>> 0;
    for (mti = 1; mti < N; mti++) { const p = mt[mti - 1] ^ (mt[mti - 1] >>> 30); mt[mti] = (Math.imul(1812433253, p) + mti) >>> 0; }
  };
  const key = [];
  for (let s = Math.abs(Math.trunc(seed)); ; s = Math.floor(s / 4294967296)) { key.push(s % 4294967296); if (s < 4294967296) break; }
  initGenrand(19650218);
  let i = 1, j = 0;
  for (let k = Math.max(N, key.length); k; k--) {
    const p = mt[i - 1] ^ (mt[i - 1] >>> 30);
    mt[i] = ((mt[i] ^ Math.imul(p, 1664525)) + key[j] + j) >>> 0;
    i++; j++;
    if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
    if (j >= key.length) j = 0;
  }
  for (let k = N - 1; k; k--) {
    const p = mt[i - 1] ^ (mt[i - 1] >>> 30);
    mt[i] = ((mt[i] ^ Math.imul(p, 1566083941)) - i) >>> 0;
    i++;
    if (i >= N) { mt[0] = mt[N - 1]; i = 1; }
  }
  mt[0] = 0x80000000;
  const mag = y => (y & 1 ? 0x9908b0df : 0);
  function next() {
    let y;
    if (mti >= N) {
      let kk = 0;
      for (; kk < N - M; kk++) { y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff); mt[kk] = mt[kk + M] ^ (y >>> 1) ^ mag(y); }
      for (; kk < N - 1; kk++) { y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff); mt[kk] = mt[kk + (M - N)] ^ (y >>> 1) ^ mag(y); }
      y = (mt[N - 1] & 0x80000000) | (mt[0] & 0x7fffffff); mt[N - 1] = mt[M - 1] ^ (y >>> 1) ^ mag(y);
      mti = 0;
    }
    y = mt[mti++];
    y ^= y >>> 11; y ^= (y << 7) & 0x9d2c5680; y ^= (y << 15) & 0xefc60000; y ^= y >>> 18;
    return y >>> 0;
  }
  return () => { const a = next() >>> 5, b = next() >>> 6; return (a * 67108864 + b) / 9007199254740992; };
}
export const _pyRandomForTest = pyRandom;

// Python round(x)：五成双取整
function pyRoundInt(x) { const f = Math.floor(x), d = x - f; return d > 0.5 ? f + 1 : d < 0.5 ? f : (f % 2 === 0 ? f : f + 1); }
// Python round(x, n)：按 double 的精确十进制值，恰好一半时取偶
export function pyRound(x, n) {
  if (!Number.isFinite(x)) return x;
  const exact = Math.abs(x).toFixed(100), dot = exact.indexOf('.'), tail = exact.slice(dot + 1 + n);
  if (/^50*$/.test(tail)) {
    const head = exact.slice(0, dot + 1 + n).replace('.', ''), last = Number(head.at(-1));
    let v = BigInt(head) + (last % 2 ? 1n : 0n);
    const s = v.toString().padStart(n + 1, '0'), out = Number(n ? s.slice(0, -n) + '.' + s.slice(-n) : s);
    return x < 0 ? -out : out;
  }
  return Number(x.toFixed(n));
}

// ---------------------------------------------------------------- 颜色
const srgbToLin = c => { c = c / 255.0; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const hexLin = h => { h = h.replace(/^#/, ''); return [0, 2, 4].map(i => srgbToLin(parseInt(h.slice(i, i + 2), 16))); };
function boost(c, k) { const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; return c.map(x => Math.max(0.0, lum + (x - lum) * k)); }
const WHITE_CRACKLE = hexLin('#fff1d8'), TRAIL_COL = hexLin('#ffc47a'), LIFT_COL = hexLin('#ffd59a');

// ---------------------------------------------------------------- 花型光学档案（同 PROFILES，自上而下取第一个命中）
const PROFILES = [
  ['Kamuro', {fl: 0.70, body: 0.60, k: 0.85, kind: 'kamuro'}],
  ['Crackle', {fl: 1.00, body: 0.35, k: 1.6, kind: 'crackle'}],
  ['_CR_', {fl: 1.00, body: 0.35, k: 1.6, kind: 'crackle'}],
  ['Strobe', {fl: 0.80, body: 0.50, k: 1.0, kind: 'strobe'}],
  ['Glitter', {fl: 0.90, body: 0.50, k: 1.1, kind: 'glitter'}],
  ['MultiLayer', {fl: 1.00, body: 0.55, k: 1.4, kind: 'multi'}],
  ['Prism', {fl: 0.60, body: 0.35, k: 1.3, kind: 'prism'}],
  ['Spark', {fl: 0.90, body: 0.60, k: 1.1, kind: 'std'}],
  ['_GS_', {fl: 0.90, body: 0.60, k: 1.1, kind: 'std'}],
  ['Peony', {fl: 1.00, body: 0.50, k: 1.5, kind: 'std'}],
  ['Lime', {fl: 1.00, body: 0.50, k: 1.5, kind: 'std'}],
];
const DEFAULT_PROFILE = {fl: 1.00, body: 0.55, k: 1.3, kind: 'std'};
const profile = id => PROFILES.find(([key]) => id.includes(key))?.[1] ?? DEFAULT_PROFILE;
const fanBeams = id => [13, 9, 5, 1].find(n => id.includes('Red' + n) || id.includes('Silver' + n)) ?? 4;

// PC = 去掉只上手游的替身（mobile:'only'）；手游 = 去掉不上手机的（mobile:false）。同交接 keep()。
export function lightEvents(doc, platform = 'pc') {
  const cues = new Map(doc.cues.map(c => [c.id, c]));
  return doc.events.filter(e => { const mob = cues.get(e.cueId)?.mobile; return platform === 'pc' ? mob !== 'only' : mob !== false; });
}

// ---------------------------------------------------------------- 主计算（同 compute()）
export function computeLight(doc, lightName, {rig = LIGHT_RIG, model = rig.model, platform = 'pc'} = {}) {
  const li = rig.lights.find(l => l.light === lightName);
  const L = rig.actors[li?.levelActor];
  if (!L) throw Error(`关卡里找不到灯 ${lightName} 的坐标`);
  const m = model, FPS = m.fps, R0 = m.r0_m, TAU = m.flash_tau_s, sat = m.sat_boost, offset = rig.sequence.timeOffsetS || 0;
  const tpl = new Map(doc.templateLibrary.map(t => [t.id, t]));
  const rnd = pyRandom(m.seed);
  const wdist = (x, y, z) => { const dx = (x - L[0]) / 100.0, dy = (y - L[1]) / 100.0, dz = (z - L[2]) / 100.0, r2 = dx * dx + dy * dy + dz * dz; return R0 * R0 / (R0 * R0 + r2); };
  const events = lightEvents(doc, platform);
  const missing = [...new Set(events.map(e => e.pointId).filter(id => !rig.points[id]))].sort();
  if (missing.length) throw Error('关卡中缺少发射点：' + missing.join('、') + '（tool/fwlight 重新读 umap 后更新 light-rig.mjs）');
  const missingTpl = [...new Set(events.map(e => e.templateId).filter(id => !tpl.has(id)))];
  if (missingTpl.length) throw Error('花型库里缺少：' + missingTpl.join('、'));

  const nF = Math.trunc(Math.ceil(rig.sequence.endS * FPS)) + 1;
  const S = new Float64Array(nF), RGB = [new Float64Array(nF), new Float64Array(nF), new Float64Array(nF)];
  const add = (f, v, col) => { if (f >= 0 && f < nF && v > 0) { S[f] += v; RGB[0][f] += v * col[0]; RGB[1][f] += v * col[1]; RGB[2][f] += v * col[2]; } };

  for (const e of events) {
    const t = tpl.get(e.templateId);
    const [px, py, pz] = rig.points[e.pointId];
    const col = boost(hexLin(t.color), sat);
    const tl = e.effectiveLaunch + offset, tb = e.effectiveBurst + offset, te = e.effectiveEnd + offset;
    const life = Math.max(0.3, te - tb), fb = pyRoundInt(tb * FPS), fl = pyRoundInt(tl * FPS);
    if (t.kind === 'fan' || t.kind === 'comet') {
      const P = t.kind === 'fan' ? m.fan_power_per_beam * fanBeams(e.templateId) : m.comet_power;
      const amp = P * wdist(px, py, pz + m.fan_height_m * 100.0);
      for (let i = 0, n = Math.trunc(life * FPS) + 2; i < n; i++) {
        const tt = i / FPS, u = tt / life;
        const env = Math.min(1.0, tt / 0.15) * (u < 0.6 ? 1.0 : Math.max(0.0, 1 - (u - 0.6) / 0.4));
        add(fb + i, amp * env, col);
      }
      continue;
    }
    const P = (t.diameter / 150.0) ** m.size_exp;
    const hb = pz + t.flightHeight * 100.0;
    const amp = P * wdist(px, py, hb);
    const pr = profile(e.templateId);
    const wl = wdist(px, py, pz);
    add(fl, m.launch_flash * P * wl, LIFT_COL);
    add(fl + 1, 0.4 * m.launch_flash * P * wl, LIFT_COL);
    const riseN = Math.max(1, fb - fl);
    for (let i = 1; i < riseN; i++) {
      const u = i / riseN, wm = wdist(px, py, pz + (hb - pz) * u);
      add(fl + i, m.rise_glow * P * wm * Math.min(1.0, u * 4) * (1 - 0.5 * u), TRAIL_COL);
    }
    const phase = rnd() * 6.283;
    for (let i = 0, n = Math.trunc(life * FPS) + 2; i < n; i++) {
      const tt = i / FPS, u = Math.min(1.0, tt / life), flash = Math.exp(-tt / TAU);
      let body = Math.min(1.0, tt / 0.12) * (1 - u) ** pr.k;
      let v = pr.fl * flash + pr.body * body;
      const kind = pr.kind;
      if (kind === 'strobe') v = pr.fl * flash + pr.body * body * (0.65 + 0.35 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 6.0 * tt + phase)));
      else if (kind === 'glitter') v = pr.fl * flash + pr.body * body * (0.88 + 0.12 * Math.sin(2 * Math.PI * 9.0 * tt + phase));
      else if (kind === 'multi') v += 0.55 * (tt >= 0.30 ? Math.exp(-(tt - 0.30) / TAU) : 0) + 0.35 * (tt >= 0.60 ? Math.exp(-(tt - 0.60) / TAU) : 0);
      else if (kind === 'prism') { if (tt >= 1.0) v += 0.9 * Math.exp(-(tt - 1.0) / 0.45) * Math.min(1.0, (tt - 1.0) / 0.06); }
      else if (kind === 'kamuro') { body = Math.min(1.0, tt / 0.15) * (Math.exp(-tt / (0.42 * life)) * (1 - u) ** 0.5); v = pr.fl * flash + pr.body * body; }
      if (kind === 'crackle') {
        let ck = 0.0;
        for (const cu of [0.62, 0.72, 0.82]) ck += 0.35 * Math.exp(-(((u - cu) * life) ** 2) / (2 * 0.045 ** 2));
        if (ck > 0.01) add(fb + i, amp * ck, WHITE_CRACKLE);
      }
      add(fb + i, amp * v, col);
    }
  }

  let smax = -Infinity; for (let f = 0; f < nF; f++) if (S[f] > smax) smax = S[f];
  const I = Array.from(S, s => (s > 0 ? m.i_peak * (s / smax) ** m.gamma : 0.0));
  let last = boost(hexLin(m.start_color), sat);
  const m0 = Math.max(...last);
  last = last.map(x => x / m0);
  const thr = smax * 0.004, hold = m.dark_color_hold, cols = [];
  for (let f = 0; f < nF; f++) {
    if (S[f] > thr) {
      let c = [RGB[0][f] / S[f], RGB[1][f] / S[f], RGB[2][f] / S[f]];
      const mx = Math.max(...c);
      c = mx > 0 ? c.map(x => x / mx) : last;
      const a = Math.min(1.0, S[f] / (smax * hold));
      c = [0, 1, 2].map(k => last[k] + (c[k] - last[k]) * a);
      last = c;
    }
    cols.push([...last]);
  }
  return {light: lightName, params: m, lightPos: L, events, S, I, cols, nF, smax};
}

// ---------------------------------------------------------------- 关键帧精简（同 simplify / make_keys）
export function simplify(channels, tols, forced = []) {
  const n = channels[0].length, keep = [0], force = new Set(forced);
  let a = 0, b = 1;
  while (b < n) {
    let ok = true;
    if (b - a > 1) {
      for (let c = 0; c < channels.length && ok; c++) {
        const ch = channels[c], tol = tols[c], va = ch[a], vb = ch[b];
        for (let k = a + 1; k < b; k++) if (Math.abs(ch[k] - (va + (vb - va) * (k - a) / (b - a))) > tol) { ok = false; break; }
      }
    }
    if (!ok || (force.has(b - 1) && b - 1 !== a)) { keep.push(b - 1); a = b - 1; continue; }
    b++;
  }
  if (keep.at(-1) !== n - 1) keep.push(n - 1);
  return [...new Set(keep)].sort((x, y) => x - y);
}

export function makeKeys(R, li) {
  const m = R.params, {I, cols, nF} = R;
  const peaks = [];
  for (let f = 1; f < nF - 1; f++) if (I[f] > I[f - 1] && I[f] >= I[f + 1] && I[f] > m.i_peak * 0.02) peaks.push(f);
  const ik = simplify([I], [m.i_peak * m.int_tol], peaks);
  const ck = simplify([cols.map(c => c[0]), cols.map(c => c[1]), cols.map(c => c[2])], [m.col_tol, m.col_tol, m.col_tol]);
  const c0 = cols[ck[0]], ch = k => ({default: pyRound(c0[k], 4), keys: ck.map(f => [f, pyRound(cols[f][k], 4)])});
  return {
    format: 'fwlight.keys/2', light: li.light, binding: li.binding, component: li.component, fps: m.fps, interp: 'linear',
    intensity: {default: 0.0, keys: ik.map(f => [f, pyRound(I[f], 3)])},
    color: {R: ch(0), G: ch(1), B: ch(2), A: {default: 1.0, keys: []}},
    meta: {light_pos_cm: R.lightPos.map(v => pyRound(v, 2)), events: R.events.length, params: m, n_intensity: ik.length, n_color: ck.length, n_forced_peaks: peaks.length},
  };
}

function scaleKeys(keys, scale, offset = 0) {
  return {...keys, intensity: {default: pyRound(keys.intensity.default * scale + offset, 6), keys: keys.intensity.keys.map(([f, v]) => [f, pyRound(v * scale + offset, 6)])}};
}
const peakOf = keys => Math.max(keys.intensity.default ?? 0, ...keys.intensity.keys.map(k => k[1]));

// ---------------------------------------------------------------- 交付包（fwlight.pack/1）
// skyPeak：天光峰值（不填 = 交接现状 0.003846 × i_peak = 6.92）。峰值 = 全场最亮一帧，和编排疏密无关；上限按 rig 的 maxIntensity 硬拦。
export function buildLightDelivery(doc, {rig = LIGHT_RIG, skyPeak, platform = 'pc', programme = {}, generator = 'workbench', now = new Date()} = {}) {
  const lights = rig.lights.map(l => (l.light === 'SkyLight' && Number.isFinite(skyPeak) ? {...l, intensityScale: skyPeak / rig.model.i_peak} : l));
  const sources = new Map(), files = {}, rows = [], errors = [], warnings = [];
  for (const li of lights) {
    const src = li.curveFrom || li.light;
    if (!sources.has(src)) sources.set(src, computeLight(doc, src, {rig, platform}));
    const R = sources.get(src);
    let keys = {...makeKeys(R, li), light: li.light, binding: li.binding, component: li.component};
    if (li.curveFrom) keys = scaleKeys(keys, li.intensityScale ?? 1, li.intensityOffset ?? 0);
    keys.meta = {...keys.meta, generator, programme, platform, ...(li.curveFrom ? {curve_from: src, intensity_scale: li.intensityScale ?? 1, intensity_offset: li.intensityOffset ?? 0} : {})};
    const file = `keys_${li.light}.json`, peak = peakOf(keys);
    if (li.maxIntensity != null && peak > li.maxIntensity + 1e-9) errors.push(`${li.light} 峰值 ${peak.toFixed(2)} 超过上限 ${li.maxIntensity}`);
    files[file] = keys;
    rows.push({light: li.light, binding: li.binding, component: li.component, file, curveFrom: li.curveFrom || null, intensityScale: li.curveFrom ? li.intensityScale ?? 1 : 1,
      maxIntensity: li.maxIntensity ?? null, peak, intensityKeys: keys.intensity.keys.length, colorKeys: keys.color.R.keys.length});
  }
  const main = sources.get('SpotLight2') ?? [...sources.values()][0], FPS = rig.sequence.fps;
  const lastEnd = Math.max(0, ...main.events.map(e => e.effectiveEnd));
  if (lastEnd + (rig.sequence.timeOffsetS || 0) > rig.sequence.endS) warnings.push(`编排最后一发 ${lastEnd.toFixed(1)} s 结束，超过序列播放结束 ${rig.sequence.endS} s，后面的光会被截掉`);
  const peakFrame = main.I.indexOf(Math.max(...main.I));
  const sections = (doc.sections || []).map(s => {
    const seg = main.I.slice(Math.trunc(s.start * FPS), Math.trunc(s.end * FPS));
    return {name: String(s.name).split('｜').at(-1), start: s.start, end: s.end, mean: seg.length ? seg.reduce((a, b) => a + b, 0) / seg.length : 0, peak: seg.length ? Math.max(...seg) : 0};
  });
  const manifest = {
    format: 'fwlight.pack/1', generator, generatedAt: now.toISOString(), programme, platform,
    events: main.events.length, sequence: rig.sequence, level: rig.level, model: rig.model,
    peakAtS: pyRound(peakFrame / FPS, 2), sMax: main.smax,
    lights: rows, sections: sections.map(s => ({...s, mean: pyRound(s.mean, 2), peak: pyRound(s.peak, 2)})),
    errors, warnings,
    notes: ['光量按 PC 高配全部片段（去掉只上手游的替身）计算；序列只有一份，PC / 手游、高中低共用。',
      'Intensity 按全场最亮一帧归一：峰值 = i_peak × 比例，和编排疏密无关；编排变了，整场会一起缩放。',
      '写入 UE：python tool/fwlight/fwlight.py apply-pack <本目录>（先 P4 迁出序列；--no-save 只写内存）。'],
  };
  return {manifest, files, rows, sections, errors, warnings, curve: {fps: FPS, main: main.I, smax: main.smax}};
}

export function lightPackFiles(delivery) {
  const out = {'manifest.json': JSON.stringify(delivery.manifest, null, 1)};
  for (const [name, keys] of Object.entries(delivery.files)) out[name] = JSON.stringify(keys);
  out['使用说明.txt'] = [
    '灯光交付包（编排工作台 → 交付 → 灯光）',
    `编排：${delivery.manifest.programme?.name ?? ''} ${delivery.manifest.programme?.version ?? ''}`,
    '',
    '写进 UE（本机）：',
    '  1. P4 迁出 Seq_NewYear_TestShowTemplate_2，打开 UE 编辑器；按仓库规则在状态清单登记「UE 写入」',
    '  2. 把本包解压到纯英文路径，或直接用：',
    '     cd /d F:\\FireWorksLab\\tool\\fwlight',
    '     python fwlight.py apply-pack <解压目录> --no-save    （只写内存，在 Sequencer 里看）',
    '     python fwlight.py save                               （满意再保存）',
    '     或一步：python fwlight.py apply-pack <解压目录>      （备份 → 写入 → 保存 → 磁盘逐键核对）',
    '  3. 回滚：tool/fwlight/baseline/rollback_<灯>_before_20261015.json，或 backup/ 里每次写入前的自动备份',
    '',
    ...delivery.manifest.lights.map(l => `${l.light}: 强度键 ${l.intensityKeys}，颜色键 ${l.colorKeys}，峰值 ${l.peak}${l.maxIntensity != null ? `（上限 ${l.maxIntensity}）` : ''}${l.curveFrom ? `，复用 ${l.curveFrom} × ${pyRound(l.intensityScale, 6)}` : ''}`),
  ].join('\r\n');
  return out;
}
