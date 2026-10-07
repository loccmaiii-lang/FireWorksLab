// ---- 4.9.29 低端包：单帧 + 溶解图（对话框23；用户 10-07 09:41「我还希望有一个单帧导出功能，与单帧溶解图功能……单帧图可以输出带颜色的太阳，
//   溶解图和别的层譬如cut图，如果有多种这种功能图就合并成一张，命名后缀我来填」；09:54 默认某一帧、长曝光可选、两种并排对比、产物表加低端列、要出现顺序图；
//   12:40「单独一份低端包，贴图名尾巴加_MB;其它按推荐的一样」「先做能做的」。设计：协作/补充_单帧与溶解图_2026-10-07.md 第 8 节）----
// 低端机会把 2048 再压到 512：4×4 序列每格只剩 128，单帧整张给一个画面。没有动态 → 引擎里 Size By Life 长大、Alpha 淡出；
// 功能图让它按火花的真实先后亮起 / 熄灭（D 溶解 = 最后亮着的时刻，A 出现顺序 = 第一次亮的时刻，C 轮廓），合并成一张、后缀你填。
// 现成的溶解材质还没对上（对话框5 在查角色名 / 通道 / 阈值方向）：cascade_low.json 的发射器先用现有序列材质（1 × 1 格灰度 + Ramp，马上能用），
// 彩色单帧和功能图随包放在 extras 里（导入器不导），引擎回放里「溶解预览」按功能图画。
// 4.9.35（用户 10-07 18:50「低端这个分类应该不需要，直接合入产物表里」）：单帧是产物表里一层的一种产物（PC / 手机都能选），写进 cascade.json / cascade_mobile.json；没有低端列、cascade_low.json 了
const LOW_MAP_ORDER = 'DCA', LOW_MAP_NAMES = { D: '溶解（熄灭顺序）', C: '轮廓（Cut）', A: '出现顺序' }, LOW_TH = 3, LOW_MAP_MAX = 512;
// 单帧的设置：单层从 P、多层从层 L 读（和光点大小同一套）
function lowOf(src) {
  const s = src || {}, raw = s.lowMaps == null ? LOW_MAP_ORDER : String(s.lowMaps).toUpperCase();
  const maps = [...LOW_MAP_ORDER].filter(c => raw.includes(c)).join('');
  return { pick: s.lowPick === 'expo' ? 'expo' : 'frame', at: Math.max(0, +s.lowAt || 0), size: [512, 1024, 2048].includes(+s.lowSize) ? +s.lowSize : 1024,
    jit: clamp(s.lowJit == null || s.lowJit === '' ? 0.3 : +s.lowJit, 0, 1), maps, suffix: String(s.lowSuffix || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || maps };
}
const lowSig = (lo, M) => JSON.stringify([lo.pick, lo.at, lo.size, lo.jit, lo.maps, M && [M.stages, M.xw, M.ramp0, M.ramp1, M.ramp2, M.ramp3, M.headInt]]);
// 序列里每一帧：哪一张、第几格、从什么时刻开始、停多久、那一帧的取景
function lowFrames(b) {
  const out = [];
  for (const s of bakeParts(b)) { const m = s.meta, t0 = m.t0 || 0;
    // 4.0 起帧从 tick 开始（times = 这一帧开始、也是烘的那一刻）；更早的计划 times 是帧中点
    m.times.forEach((tc, f) => { const d = m.dur[f], sxy = sizeXY(m, tc), c = centerAt(m, tc); out.push({ s, f, t: t0 + tc - (m.frameTiming === 'tick-start' ? 0 : d / 2), at: t0 + tc, d, tc, view: [c[0], c[1], m.HX * sxy[0], m.HY * sxy[1]] }); }); }
  return out;
}
// 一格的像素读法（GL 自下而上；RGBA 接力）：返回 (u, v) → 0–255
function lowCellReader(s, img, f) {
  const L = s.meta.L, N = s.N, ch = L.chans === 4 ? Math.floor(f / L.per) : 0, k = f % L.per, col = k % L.cols, row = Math.floor(k / L.cols), cw = s.cw, chh = s.chh, x0 = col * cw, y0 = s.NH - (row + 1) * chh;
  return (u, v) => { if (u < 0 || u >= 1 || v < 0 || v >= 1) return 0; const x = x0 + Math.floor(u * cw), y = y0 + Math.floor(v * chh); return img[(y * N + x) * 4 + ch]; };
}
// 烘单帧（灰度，S × S）：和序列同一次模拟、同一个曝光。items = [{ tc（这一张里的时刻）, view（要的取景，缺省 = 那一刻序列的取景）}]，按时间先后；
// 几个时刻（长曝光）每个像素取最亮
async function lowRenderAt(s, items, S, onProg) {
  const P1 = { ...s.P, cols: 1, rows: 1, chans: 1, texW: S, texH: S, outMode: 'combined', cellPad: 0 }, R = makeRenderer(P1, 'burst'), out = new Uint8Array(S * S);
  try {
    for (let i = 0; i < items.length; i++) {
      const { tc, view } = items[i], m = s.meta, sv = sizeXY(m, tc);
      // 换取景：半宽 / 半高 / 中心换成参考的（同一个爆点）；ppm 按 Ww / Wh 算，一起换
      const vm = view ? { HX: view[2] / sv[0], HY: view[3] / sv[1], Ww: 2 * view[2] / sv[0], Wh: 2 * view[3] / sv[1], ...(m.path ? {} : { cy: view[1] / sv[1] }) } : {};
      const pl1 = { ...m, ...vm, L: layoutOf(P1), times: [tc], dur: [1 / 30] };
      const bk = await bakeFrames(P1, 1, p => onProg && onProg((i + p) / items.length), pl1, R, { expo: [s.meta.expoH, s.meta.expoT] });
      const px = readRGBA8(bk.head); bk.head.dispose(); bk.tail && bk.tail.dispose();
      for (let j = 0; j < S * S; j++) if (px[j * 4] > out[j]) out[j] = px[j * 4];     // 长曝光：每个像素取最亮
      if (i % 4 === 3) await nextTick();
    }
  } finally { R.dispose(); }
  return out;
}
// 主体：算单帧 + 功能图 + Size By Life / Alpha 曲线。b = 这一层的大面片烘焙（PC），M = 这一层的颜色
async function bakeLow(b, lo, M, onProg) {
  const fr = lowFrames(b); if (!fr.length) throw new Error('序列是空的，出不了单帧');
  const tIn = fr[0].t, tOut = fr[fr.length - 1].t + fr[fr.length - 1].d, D = Math.max(1 / 30, tOut - tIn);
  const imgs = new Map(); for (const s of bakeParts(b)) imgs.set(s, [readRGBA8(s.head), s.tail ? readRGBA8(s.tail) : null]);
  const rd = fr.map(q => { const [h, t] = imgs.get(q.s), a = lowCellReader(q.s, h, q.f), c = t ? lowCellReader(q.s, t, q.f) : null; return c ? (u, v) => Math.max(a(u, v), c(u, v)) : a; });
  // 每帧亮的面积、亮度（自动挑「花开得最大」那一刻；Size By Life / Alpha 曲线）
  const G = 64, cov = [], lum = [];
  fr.forEach((q, i) => { let n = 0, l = 0; for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) { const v = rd[i]((x + 0.5) / G, (y + 0.5) / G); if (v >= LOW_TH) { n++; l += Math.pow(v / 255, q.s.P.encGamma || 1); } }
    const a = 4 * q.view[2] * q.view[3] / (G * G); cov.push(n * a); lum.push(l * a); });
  let iStar = 0; if (lo.at > 0) { const ta = clamp(lo.at, tIn, tOut - 1e-4); iStar = Math.max(0, fr.findIndex((q, i) => ta < q.t + q.d || i === fr.length - 1)); } else cov.forEach((c, i) => { if (c > cov[iStar] * 1.0001) iStar = i; });
  const st = fr[iStar], tStar = st.at;
  // 取景：单帧整张都给内容——按亮的范围收紧（序列的取景要装下整个寿命，单帧只要那一刻；长曝光要装下入点 → 出点所有亮过的地方）。
  // 横向左右对称（爆点在中线上，和大面片一样只用 Pivot Offset 的 Y），留 6 % 边
  const box = idxs => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const g = 160;
    for (const i of idxs) { const vw = fr[i].view, r = rd[i]; for (let y = 0; y < g; y++) for (let x = 0; x < g; x++) { const u = (x + 0.5) / g, v = (y + 0.5) / g; if (r(u, v) < LOW_TH) continue;
      const wx = vw[0] + (2 * u - 1) * vw[2], wy = vw[1] + (2 * v - 1) * vw[3]; if (wx < x0) x0 = wx; if (wx > x1) x1 = wx; if (wy < y0) y0 = wy; if (wy > y1) y1 = wy; } }
    return x1 > x0 ? [x0, x1, y0, y1] : null; };
  const bb = box(lo.pick === 'expo' ? fr.map((q, i) => i) : [iStar]), pad = 1.06;
  const view = bb ? [0, (bb[2] + bb[3]) / 2, Math.max(Math.abs(bb[0]), Math.abs(bb[1]), 0.5) * pad, Math.max((bb[3] - bb[2]) / 2, 0.5) * pad] : st.view, S = lo.size;
  onProg && onProg(0.05);
  let gray;
  if (lo.pick === 'expo') {     // 长曝光：入点 → 出点均匀取 ≤ 24 帧逐个烘（按参考取景）、每像素取最亮
    const K = Math.min(24, fr.length), parts = bakeParts(b), by = new Map(); let done = 0;
    for (let k = 0; k < K; k++) { const q = fr[Math.round(k * (fr.length - 1) / Math.max(1, K - 1))]; if (!by.has(q.s)) by.set(q.s, []); const a = by.get(q.s); if (!a.some(x => x.tc === q.tc)) a.push({ tc: q.tc, view }); }
    gray = new Uint8Array(S * S);
    for (const s of parts) { const a = by.get(s); if (!a) continue;
      const g = await lowRenderAt(s, a, S, p => onProg && onProg(0.05 + 0.6 * (done + p * a.length) / K));
      for (let j = 0; j < g.length; j++) if (g[j] > gray[j]) gray[j] = g[j]; done += a.length; }
  } else gray = await lowRenderAt(st.s, [{ tc: st.tc, view }], S, p => onProg && onProg(0.05 + 0.6 * p));
  // 彩色单帧：和序列材质同一个算法（灰度查 Ramp × 灰度 × 这一刻的颜色），sRGB；Alpha = 灰度。亮度倍数留给 Color Over Life
  const tint = tintAt(M, tStar), tmax = Math.max(1e-6, ...tint), rgba = new Uint8Array(S * S * 4), RL = []; for (let v = 0; v < 256; v++) RL.push(rampAt(M, v / 255));
  for (let j = 0; j < S * S; j++) { const v = gray[j], r = RL[v], k = v / 255; rgba[j * 4] = srgb8(r[0] * k * tint[0] / tmax); rgba[j * 4 + 1] = srgb8(r[1] * k * tint[1] / tmax); rgba[j * 4 + 2] = srgb8(r[2] * k * tint[2] / tmax); rgba[j * 4 + 3] = v; }
  onProg && onProg(0.7);
  // 功能图（MS × MS，≤ 512）：每个像素第一次 / 最后一次亮着的时刻，按入点 → 出点归一。按参考取景把每一帧的格子对上（Zoom 取景时每帧取景不同）
  const MS = Math.min(LOW_MAP_MAX, S), first = new Float32Array(MS * MS).fill(-1), last = new Float32Array(MS * MS).fill(-1), peak = new Uint8Array(MS * MS);
  for (let i = 0; i < fr.length; i++) { const q = fr[i], r = rd[i], vw = q.view;
    for (let y = 0; y < MS; y++) { const wy = view[1] + ((y + 0.5) / MS * 2 - 1) * view[3], v = ((wy - vw[1]) / vw[3] + 1) / 2;
      for (let x = 0; x < MS; x++) { const wx = view[0] + ((x + 0.5) / MS * 2 - 1) * view[2], u = ((wx - vw[0]) / vw[2] + 1) / 2, val = r(u, v); if (val < LOW_TH) continue;
        const j = y * MS + x; if (first[j] < 0) first[j] = q.t; last[j] = q.t + q.d; if (val > peak[j]) peak[j] = val; } }
    if (i % 8 === 7) { onProg && onProg(0.7 + 0.25 * i / fr.length); await nextTick(); } }
  // 错落：按 2 × 2 像素一小块给熄灭时刻加随机（亮的地方本来就晚灭：亮度高 → 在阈值上停得久）
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263 + 0x9e3779b9) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // 4.9.31（用户 10-07 14:56「如果网友单帧效果了，就需要开了」）：溶解图按现有序列母材质的方向存（对话框5 查本机配置：读 R、fade = 1 − saturate(D + 2P − 1)，值大的先消失）
  //   → D = 1 − 熄灭时刻（早灭的值大）、亮过的 ≤ 254，没亮过 255（一开始就消失，本来也是黑的）。出现顺序 A 照旧存时刻（材质没有这个输入，留给以后）
  const Dm = new Uint8Array(MS * MS).fill(255), Am = new Uint8Array(MS * MS), Cm = new Uint8Array(MS * MS);
  for (let y = 0; y < MS; y++) for (let x = 0; x < MS; x++) { const j = y * MS + x; if (first[j] < 0) { Am[j] = 255; continue; }
    const a = clamp((first[j] - tIn) / D, 0, 1), d0 = clamp((last[j] - tIn) / D, 0, 1), d = clamp(d0 + lo.jit * 0.12 * (2 * hash(x >> 1, y >> 1) - 1), a + 1 / 255, 1);
    Am[j] = Math.round(a * 255); Dm[j] = Math.min(254, Math.round((1 - d) * 255)); }
  // 轮廓：单帧有内容的地方外扩 3 像素（和现在的 Cutout 同一口径）
  for (let y = 0; y < MS; y++) for (let x = 0; x < MS; x++) { const gy = Math.floor((y + 0.5) / MS * S), gx = Math.floor((x + 0.5) / MS * S); if (gray[gy * S + gx] < LOW_TH) continue;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < MS && xx >= 0 && xx < MS) Cm[yy * MS + xx] = 255; } }
  // 合并：按 D → C → A 的顺序放进 R、G、B（只勾一种就只有 R）
  const chans = {}, mapRGBA = new Uint8Array(MS * MS * 4), src = { D: Dm, C: Cm, A: Am };
  [...lo.maps].forEach((c, k) => { chans[c] = 'RGB'[k]; const a = src[c]; for (let j = 0; j < MS * MS; j++) mapRGBA[j * 4 + k] = a[j]; });
  for (let j = 0; j < MS * MS; j++) mapRGBA[j * 4 + 3] = 255;
  // Size By Life：开花到单帧那一刻按亮的面积开方长大，之后 1；Alpha：单帧那一刻以后按亮度淡出（入点 → 出点归一的相对寿命）
  const R0 = Math.sqrt(Math.max(1e-9, cov[iStar])), u = i => clamp((fr[i].t + fr[i].d / 2 - tIn) / D, 0, 1);
  const sz = [[0, clamp(Math.sqrt(cov[0]) / R0, 0.05, 1)]]; for (let i = 0; i <= iStar; i++) sz.push([u(i), clamp(Math.sqrt(cov[i]) / R0, 0.05, 1)]); sz.push([u(iStar), 1], [1, 1]);
  // Alpha 只往下走（闪烁、噼啪的亮度起伏不进曲线，那是序列才有的）
  const al = [[0, 1], [u(iStar), 1]]; let amin = 1; for (let i = iStar + 1; i < fr.length; i++) { amin = Math.min(amin, clamp(lum[i] / Math.max(1e-9, lum[iStar]), 0, 1)); al.push([u(i), amin]); } al.push([1, 0]);
  const clean = (k, n) => { const s = simplify(k.filter((p, i) => i === 0 || p[0] > k[i - 1][0] + 1e-6), n, 0.02); return s.map(([a, v]) => [+a.toFixed(4), +v.toFixed(3)]); };
  onProg && onProg(1);
  return { S, MS, tIn, tOut, tStar, pick: lo.pick, at: lo.at, view, gray, rgba, maps: lo.maps, suffix: lo.suffix, chans, mapRGBA, cover: { first: Am, last: Dm },
    sizeKeys: clean(sz, 6), alphaKeys: clean(al, 8), tint: tint.map(v => +v.toFixed(4)), tmax: +tmax.toFixed(4), jit: lo.jit, tex: null };
}
// 引擎回放用的贴图（第一次画的时候建）
function lowTextures(lw) {
  if (lw.tex) return lw.tex;
  const mk = (w, h, fmt, data) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
  const g4 = new Uint8Array(lw.S * lw.S * 4); for (let j = 0; j < lw.S * lw.S; j++) g4[j * 4] = g4[j * 4 + 1] = g4[j * 4 + 2] = g4[j * 4 + 3] = lw.gray[j];
  const nn = (t) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); return t; };
  lw.tex = { gray: mk(lw.S, lw.S, gl.RGBA8, g4), color: mk(lw.S, lw.S, gl.SRGB8_ALPHA8, lw.rgba), maps: nn(mk(lw.MS, lw.MS, gl.RGBA8, lw.mapRGBA)) };
  return lw.tex;
}
function disposeLow(lw) { if (lw && lw.tex) { for (const t of Object.values(lw.tex)) gl.deleteTexture(t); lw.tex = null; } }
// 缓存在大面片烘焙上（同一份烘焙按设置 + 颜色各一份，最多 3 份）
function lowCached(b, lo, M) { const c = b && b.lowCache, k = lowSig(lo, M); return c && c.has(k) ? c.get(k) : null; }
async function lowFor(b, lo, M, onProg) {
  const hit = lowCached(b, lo, M); if (hit) return hit;
  const lw = await bakeLow(b, lo, M, onProg); if (!b.lowCache) b.lowCache = new Map();
  b.lowCache.set(lowSig(lo, M), lw); if (b.lowCache.size > 3) { const k0 = b.lowCache.keys().next().value; disposeLow(b.lowCache.get(k0)); b.lowCache.delete(k0); }
  return lw;
}
// 后台烘（和单束一样等别的烘焙让出来）
let lowTask = null;
function ensureLow(b, lo, M) {
  if (lowTask || !b || lowCached(b, lo, M)) return;
  lowTask = (async () => {
    // 先让出这一帧：ensureLow 是画面里调的，马上读回贴图会把显卡的渲染目标换掉，这一帧剩下的东西就画到别的贴图上了
    await new Promise(r => setTimeout(r, 0));
    while (state.baking) await new Promise(r => setTimeout(r, 300));
    state.baking = true;
    try { await lowFor(b, lo, M, p => setStatus(`单帧 + 功能图… ${Math.round(p * 100)}%`)); } catch (err) { console.error(err); flash('单帧烘焙失败：' + (err.message || err), true); }
    finally { state.baking = false; setStatus(''); lowTask = null; if (state.layerQueue && state.layerQueue.size) runLayerQueue(); }
  })();
}
// 引擎回放画一层单帧：dissolve = false 只看 Size By Life + Alpha（导入器没开溶解时 UE 里的样子）；true 再按现有序列母材质的溶解公式
//   fade = 1 − saturate(D + 2P − 1)（P = 入点 → 出点 0 → 1，D = 溶解图 R；对话框5 10-07 查本机配置）——软过渡，一块要大约半个寿命才消失
function drawLowLayer(lw, L, M, t, view, dissolve) {
  const age = (engineTick(t) - (+L.delay || 0)) * (+L.rate || 1), u = (age - lw.tIn) / Math.max(1e-6, lw.tOut - lw.tIn);
  if (u < 0 || u >= 1) return -1;
  const tx = lowTextures(lw), pr = PR.low; gl.useProgram(pr.p);
  // 面片绕爆点缩放（Pivot Offset）；母材质没有出现顺序输入，溶解时照样 Size By Life
  const sc = (+L.scale || 1) * evalKeys(lw.sizeKeys, u), v = lw.view, mir = L.mirror ? -1 : 1;
  const r = [mir * (v[0] - v[2]) * sc, (v[1] - v[3]) * sc, mir * (v[0] + v[2]) * sc, (v[1] + v[3]) * sc];
  gl.uniform4fv(pr.u.uRect, [Math.min(r[0], r[2]), r[1], Math.max(r[0], r[2]), r[3]]); gl.uniform4fv(pr.u.uView, view); gl.uniform1f(pr.u.uMirror, L.mirror ? 1 : 0);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx.gray); gl.uniform1i(pr.u.uC, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tx.maps); gl.uniform1i(pr.u.uMap, 1);
  const mask = c => { const k = lw.chans[c]; return k ? [k === 'R' ? 1 : 0, k === 'G' ? 1 : 0, k === 'B' ? 1 : 0, 0] : [0, 0, 0, 0]; };
  gl.uniform4fv(pr.u.uDm, mask('D')); gl.uniform4fv(pr.u.uAm, mask('A')); gl.uniform1f(pr.u.uHasD, lw.chans.D ? 1 : 0); gl.uniform1f(pr.u.uHasA, lw.chans.A ? 1 : 0);
  gl.uniform1f(pr.u.uMode, dissolve ? 1 : 0); gl.uniform1f(pr.u.uP, u); gl.uniform1f(pr.u.uAlpha, evalKeys(lw.alphaKeys, u)); gl.uniform1f(pr.u.uInv, 0);
  setMatUniforms(pr, M, age);
  gl.bindVertexArray(quadVAO); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.activeTexture(gl.TEXTURE0);
  return 0;
}
// ---- 导出：cascade.json / cascade_mobile.json 里的一个单帧层（name = 内部层名），文件（内部名，applyPackNaming 再换成正式名）----
function fwlLowLayer(name, lw, M, L, pre) {
  const life = lw.tOut - lw.tIn, rate = +L.rate > 0 ? +L.rate : 1, sc = +L.scale > 0 ? +L.scale : 1, v = lw.view, W = 2 * v[2] * sc, H = 2 * v[3] * sc, cy = v[1] * sc;
  const pivot = Math.abs(cy) > 1e-4;
  const textures = { [pre + 'frame']: { file: TN(name, 'Frame') + '.png', class: 'flipbook', cols: 1, rows: 1, channels: 1, frames: 1 }, [pre + 'cutout']: { file: TN(name, 'Frame_Cutout') + '.png', class: 'cutout' }, [pre + 'ramp']: { file: TN(name, 'Ramp') + '.png', class: 'ramp' } };
  // 4.9.31 溶解（用户 10-07 14:56「这个一律不开溶解是因为之前都是序列……如果网友单帧效果了，就需要开了」）：只有这种发射器带 dissolve 标记，
  //   导入器只对带标记的开溶解（序列、单束、别的一律照旧不开）。现有序列母材质：溶解图读 R、进度 = 动态参数 dissolve（第 3 个、index 2）、
  //   fade = 1 − saturate(D + 2P − 1)（值大的先消失）→ 溶解图 D = 1 − 熄灭时刻；进度 0 → 1 = 入点 → 出点。对话框5 加好之前，导进去是不开溶解的样子（Size By Life + Alpha）
  const dis = !!(lw.maps && lw.chans.D);
  if (lw.maps) textures[pre + 'dmap'] = { file: TN(name, 'Frame_Maps') + '.png', class: 'dissolve', srgb: false, suffix: lw.suffix,
    channels: Object.fromEntries(Object.entries(lw.chans).map(([c, k]) => [k, LOW_MAP_NAMES[c]])) };
  const materials = { [pre + 'main']: { role: 'flipbook_rgba', textures: { main: pre + 'frame', ramp: pre + 'ramp', ...(dis ? { dissolve: pre + 'dmap' } : {}) }, scalars: { rows: 1, cols: 1 } } };
  const emitter = { name: pre + 'Frame', material: pre + 'main', gpu: false, layer: L.layerNo || 1,
    required: { screen_alignment: 'Rectangle', duration_s: r4(life / rate), loops: 1, delay_s: r4((+L.delay || 0) + lw.tIn / rate), cutout: pre + 'cutout', max_draw_count: 1, ...(pivot ? { pivot_offset: [-0.5, r4(-0.5 - cy / H)] } : {}) },
    spawn: { rate: { const: 0 }, bursts: [[0, 1]] },
    modules: [
      { m: 'Lifetime', Lifetime: { const: r4(life / rate) } },
      { m: 'InitialSize', StartSize: { const: [r1(W * 100), r1(H * 100), 1] } },
      { m: 'InitialLocation', StartLocation: { const: [0, 0, pivot ? 0 : r1(cy * 100)] } },
      { m: 'SizeByLife', LifeMultiplier: { curve: lw.sizeKeys.map(([u, s]) => [r4(u), [r4(s), r4(s), 1]]) }, MultiplyX: true, MultiplyY: true, MultiplyZ: false },
      { m: 'DynamicParameter', params: { frame: { const: 0 }, ...(dis ? { dissolve: { curve: [[0, 0], [1, 1]] } } : {}) } },
      { m: 'ColorOverLife', ColorOverLife: { curve: fwlColor(M, life, lw.tIn, intOr1(M.headInt)) }, AlphaOverLife: { curve: lw.alphaKeys.map(([u, a]) => [r4(u), r4(a)]) } }
    ],
    ...(dis ? { dissolve: { enable: true, texture: pre + 'dmap', channel: lw.chans.D, param: 'dissolve', progress: '0 → 1 = 入点 → 出点（相对寿命，线性）',
      encoding: 'D = 1 − 熄灭时刻（归一到入点 → 出点）：早灭的值大；没亮过 = 1', formula: 'fade = 1 − saturate(D + 2P − 1)（现有序列母材质，对话框5 10-07 查本机配置；软过渡）',
      rule: '只给带这个标记的发射器开溶解（用户 10-07 14:56）；序列、单束、别的效果照旧不开', unverified: true } } : {}),
    notes: [`单帧（${lw.pick === 'expo' ? '长曝光：入点 → 出点每个像素取最亮' : `某一帧：${lw.tStar.toFixed(2)} s`}）：一张 ${lw.S} × ${lw.S} 灰度 + Ramp，走现有序列材质（1 × 1 格、帧号 0）；Size By Life 从开花长到那一刻、之后按亮度 Alpha 淡出（未经 UE 验证）`,
      dis ? `溶解：用户 10-07 14:56 授权「单帧要开」。溶解图 ${lw.chans.D} 通道 = 1 − 熄灭时刻，进度 dissolve 0 → 1；导入器只对带 dissolve 标记的发射器开（对话框5 在加），加好之前导进去是不开溶解的样子` : '没勾溶解图（D）：不开溶解'] };
  const extras = { [pre + 'color']: { file: TN(name, 'Frame_Color') + '.png', what: '彩色单帧（sRGB；Alpha = 灰度），亮度倍数在 Color Over Life；要用得等你指定能吃彩色单帧的材质', size: [lw.S, lw.S] } };
  return { textures, materials, emitter, extras };
}
async function lowFiles(name, lw, M) {
  // 数组都是 GL 自下而上，encodePNG 自己翻成 PNG 自上而下。灰度单帧和序列一样只用 R（1 通道）
  const g4 = new Uint8Array(lw.S * lw.S * 4); for (let j = 0; j < lw.S * lw.S; j++) { g4[j * 4] = g4[j * 4 + 1] = g4[j * 4 + 2] = lw.gray[j]; g4[j * 4 + 3] = 255; }
  const files = [[`${TN(name, 'Frame')}.png`, await encodePNG(g4, lw.S, lw.S)], [`${TN(name, 'Frame_Color')}.png`, await encodePNG(lw.rgba, lw.S, lw.S)]];
  files.push(...await cutoutFiles([g4], lw.S, lw.S, { cols: 1, rows: 1, chans: 1 }, TN(name, 'Frame_Cutout'), null));
  if (lw.maps) files.push([`${TN(name, 'Frame_Maps')}.png`, await encodePNG(lw.mapRGBA, lw.MS, lw.MS)]);
  files.push([`${TN(name, 'Ramp')}.png`, await encodePNG(rampPixels(M), 256, 8)]);
  return files;
}
// 「贴图流转」看单帧：左 = 单帧（彩色），中 = 溶解图（熄灭顺序），右 = 出现顺序；伪彩色 早 = 蓝、晚 = 红（检查是不是从里往外）
function renderLowAtlas(lw, M) {
  // 4.9.35 贴图流转的画布是长方形（铺满画面区）：三块正方形横排、居中
  const tx = lowTextures(lw), pr = PR.low, W = canvas.width, H = canvas.height, gp = Math.round(Math.min(W, H) * 0.02), w = Math.round(Math.min((W - 4 * gp) / 3, H - 2 * gp)), x0 = Math.round((W - 3 * w - 2 * gp) / 2), panels = [['color', null], ['D', 'D'], ['A', 'A']];
  gl.useProgram(pr.p); gl.uniform4fv(pr.u.uRect, [0, 0, 1, 1]); gl.uniform4fv(pr.u.uView, [0.5, 0.5, 0.5, 0.5]); gl.uniform1f(pr.u.uMirror, 0);
  setMatUniforms(pr, M, lw.tStar); gl.uniform1f(pr.u.uK, 1); gl.uniform3fv(pr.u.uTint, [1, 1, 1]); gl.uniform1f(pr.u.uHI, 1);
  panels.forEach(([k, c], i) => {
    gl.viewport(x0 + i * (w + gp), Math.round((H - w) / 2), w, w);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx.color); gl.uniform1i(pr.u.uC, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tx.maps); gl.uniform1i(pr.u.uMap, 1);
    const ch = c && lw.chans[c]; if (c && !ch) return;
    const msk = k => k ? [k === 'R' ? 1 : 0, k === 'G' ? 1 : 0, k === 'B' ? 1 : 0, 0] : [0, 0, 0, 0];
    // 左边整张彩色单帧（不溶解）；中 / 右：伪彩色，uDm（熄灭）> 0 = 亮过
    gl.uniform4fv(pr.u.uAm, msk(ch)); gl.uniform4fv(pr.u.uDm, msk(lw.chans.D)); gl.uniform1f(pr.u.uHasD, c && lw.chans.D ? 1 : 0); gl.uniform1f(pr.u.uHasA, 0); gl.uniform1f(pr.u.uP, 0.5);
    gl.uniform1f(pr.u.uInv, c === 'D' ? 1 : 0);     // 溶解图存的是 1 − 熄灭时刻：伪彩色翻回「早 = 蓝、晚 = 红」
    gl.uniform1f(pr.u.uMode, c ? 2 : 3);     // 3 = 彩色单帧原样
    gl.bindVertexArray(quadVAO); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
  gl.activeTexture(gl.TEXTURE0); gl.viewport(0, 0, canvas.width, canvas.height);
  hudText = `单帧 ${lw.S}×${lw.S}（${lw.pick === 'expo' ? '长曝光' : `某一帧 ${lw.tStar.toFixed(2)} s`}）· 中：溶解图（熄灭顺序）· 右：出现顺序 · 伪彩色 早 = 蓝、晚 = 红 · 功能图 ${lw.MS}×${lw.MS}，后缀 _${lw.suffix}${lw.chans.D ? '' : '（没勾 D）'}${lw.chans.A ? '' : '（没勾 A）'}`; hudB = '';
}
