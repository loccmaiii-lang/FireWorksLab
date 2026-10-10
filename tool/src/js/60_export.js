// =====================================================================
//  导出：PNG / ZIP
// =====================================================================
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8, crc = 0xFFFFFFFF) { for (let i = 0; i < u8.length; i++) crc = CRC[(crc ^ u8[i]) & 255] ^ (crc >>> 8); return crc; }
async function deflate(u8) { const s = new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate')); return new Uint8Array(await new Response(s).arrayBuffer()); }
function readRGBA8(t) { t.bind(); const b = new Uint8Array(t.w * t.h * 4); gl.readPixels(0, 0, t.w, t.h, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; }
// 自写 PNG 编码：canvas 会预乘 alpha，A 通道存帧数据时会毁掉 RGB，所以不能用 toBlob
async function encodePNG(rgba, w, h) {
  const stride = w * 4, raw = new Uint8Array((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * stride, dst = y * (stride + 1);   // GL 自下而上 → PNG 自上而下
    raw[dst] = 1;                                               // Sub 过滤，压缩率更好
    for (let x = 0; x < stride; x++) raw[dst + 1 + x] = (rgba[src + x] - (x >= 4 ? rgba[src + x - 4] : 0)) & 255;
  }
  const idat = await deflate(raw);
  const chunk = (type, data) => {
    const out = new Uint8Array(12 + data.length), dv = new DataView(out.buffer);
    dv.setUint32(0, data.length); for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8); dv.setUint32(8 + data.length, (crc32(out.subarray(4, 8 + data.length)) ^ 0xFFFFFFFF) >>> 0); return out;
  };
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w); dv.setUint32(4, h); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))]);
}
const utf8 = s => new TextEncoder().encode(s);
async function makeZip(files) {
  { const r = await packTidy(files); files = r.files; packTidyLast = r.report; }     // 4.9.38 Ramp / Cutout 去重、几乎不省的 Cutout 不出
  const parts = [], central = []; let offset = 0;
  const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  for (const [name, content] of files) {
    const data = content instanceof Blob ? new Uint8Array(await content.arrayBuffer()) : content;
    const nm = utf8(name), crc = (crc32(data) ^ 0xFFFFFFFF) >>> 0;
    const lh = new Uint8Array(30 + nm.length), lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint16(8, 0, true);
    lv.setUint16(10, time, true); lv.setUint16(12, date, true); lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true);
    lv.setUint16(26, nm.length, true); lv.setUint16(28, 0, true); lh.set(nm, 30);
    const ch = new Uint8Array(46 + nm.length), cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true); cv.setUint16(14, date, true); cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
    cv.setUint16(28, nm.length, true); cv.setUint32(42, offset, true); ch.set(nm, 46);
    parts.push(lh, data); central.push(ch); offset += lh.length + data.length;
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0), end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }

const srgb8 = c => Math.round(255 * clamp(c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055, 0, 1));
function rampAt(M, v) {
  const C = [M.ramp0, M.ramp1, M.ramp2, M.ramp3].map(hexToLin);
  for (let i = 1; i < 4; i++) if (v <= RAMP_POS[i]) { const k = (v - RAMP_POS[i - 1]) / (RAMP_POS[i] - RAMP_POS[i - 1]); return C[i - 1].map((a, j) => a + (C[i][j] - a) * k); }
  return C[3];
}
// 4.9.31（用户 10-07 14:34 对分裂星的护栏试用：「可以做了，做的很好，太好了，后面所有导出都这样做」，对话框21 排来）：
//   Ramp 256×8，第 0–254 格照旧、第 255 格放黑（护栏）；序列编码封顶 253（FS_ENC）。项目材质读 Ramp 时 v≈0 若混到最后一格就出「线框」，
//   有了黑格不出线；最亮的值落在 253 格以内，星芯是满的热色。对话框5 本机读回说 Ramp 绑定是 Clamp、线框原因未定论，护栏两种情况都安全
function rampPixels(M, w = 256, h = 8) {
  const a = new Uint8Array(w * h * 4);
  for (let x = 0; x < w; x++) { const c = x === w - 1 ? [0, 0, 0] : rampAt(M, x / (w - 1)).map(srgb8); for (let y = 0; y < h; y++) { const i = (y * w + x) * 4; a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; a[i + 3] = 255; } }
  return a;
}
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// 分段变色：每段在 [t − xw/2, t + xw/2] 内平滑过渡
function tintAt(c, age) {
  const st = c.stages || [[0, '#ffffff']], xw = c.xw || 0.08; let col = hexToLin(st[0][1]);
  for (let i = 1; i < st.length; i++) { const k = smooth(st[i][0] - xw / 2, st[i][0] + xw / 2, age); if (k <= 0) break; const B = hexToLin(st[i][1]); col = col.map((a, j) => a + (B[j] - a) * k); }
  return col;
}
// Color Over Life 关键帧（相对 [t0, t0 + D] 这一段）
function colorKeys(M, D, t0 = 0) {
  const st = M.stages || [[0, '#ffffff']], xw = M.xw || 0.08, f = v => v.map(x => +x.toFixed(4)), keys = [[0, f(tintAt(M, t0))]];
  for (let i = 1; i < st.length; i++) {
    const a = (st[i][0] - xw / 2 - t0) / D, b = (st[i][0] + xw / 2 - t0) / D;
    if (b <= 0 || a >= 1) continue;
    if (a > 0) keys.push([+a.toFixed(4), f(tintAt(M, st[i][0] - xw / 2))]);
    if (b < 1) keys.push([+b.toFixed(4), f(tintAt(M, st[i][0] + xw / 2))]);
  }
  keys.push([1, f(tintAt(M, t0 + D))]);
  const out = []; for (const k of keys) if (!out.length || k[0] > out[out.length - 1][0] + 1e-5) out.push(k);
  if (out.length === 2 && out[0][1].join() === out[1][1].join()) return out;
  return out;
}
function curvesCSV(b, M) {
  if (b.form === 'emitset') return rtCurvesCSV(b, M);
  const rows = ['段,曲线,相对时间,值1,值2,值3'];
  for (let s = b, i = 0; s; s = s.next, i++) {
    const m = s.meta, seg = bakeSegmentName(b,i);
    const fk = m.riseLoop ? sawKeys(m, m.fit.T) : m.trail ? sawKeys(m, m.T) : m.keys;
    if (m.trail) for (const [u, v] of m.sizeKeysRise) rows.push(`${seg},上升_SizeByLife_Y倍数,${u},${v},,`);
    for (const [u, v] of fk) rows.push(`${seg},DynamicParameter_帧号通道,${u},${v},,`);
    for (const [u, c] of colorKeys(M, m.riseLoop ? m.fit.T : m.duration, m.t0 || 0)) rows.push(`${seg},ColorOverLife_线性RGB,${u},${c[0]},${c[1]},${c[2]}`);
    if (m.zoom) for (const [u, v] of m.sizeKeys) rows.push(`${seg},SizeByLife_XY倍数,${u},${v},,`);
    if (m.aniso) { for (const [u, v] of m.sizeKeysX) rows.push(`${seg},SizeByLife_X倍数,${u},${v},,`); for (const [u, v] of m.sizeKeysY) rows.push(`${seg},SizeByLife_Y倍数,${u},${v},,`); }
    for (const [u, v] of m.lightKeys) rows.push(`${seg},Light_BrightnessOverLife,${u},${v},,`);
  }
  return '﻿' + rows.join('\n') + '\n';
}
// 上升星头循环：帧号锯齿曲线（每个周期两个关键帧，周期末尾直接跳回 0）
function sawKeys(m, T) {
  const F = m.L.F, Tp = m.duration, n = Math.ceil(T / Tp), keys = [];
  for (let i = 0; i < n; i++) { const a = i * Tp / T, b = Math.min(1, (i + 1) * Tp / T); keys.push([+a.toFixed(5), 0]); keys.push([+Math.max(a, b - 1e-4).toFixed(5), +(F * Math.min(1, (b - a) * T / Tp) - 0.01).toFixed(3)]); }     // 4.3（D9③）：和 cascade.json 一样写「帧数 − 0.01」
  return keys;
}

const safeName = () => ((typeof effEnCustom === 'function' && effEnCustom()) || state.name || 'Firework').replace(/[^\w\-]+/g, '_');     // 4.9.4：交付清单里设了英文名就用它（一个效果一个英文名）
// 帧号测试图：和正式贴图同样的格子、RGBA 接力、取景（面片移动 / 缩放完全相同），内容换成
//   ① 左上角帧号（贴在格子上）；② 以爆点为中心、固定世界尺寸的圆和十字；③ 固定世界间距的网格。
// 在引擎里把材质实例的贴图换成它播放：帧号应当连续递增不倒退；圆应当不动、不胀缩、不变扁。哪一项不对，就知道是帧号曲线 / 材质、尺寸曲线还是对齐方式的问题。
async function debugAtlasPNG(s) {
  const m = s.meta, L = m.L, N = s.N, NH = s.NH, cw = N / L.cols, chh = NH / L.rows;
  const R0 = 0.4 * Math.min(m.HX, m.HY);
  const cvs = Array.from({ length: L.chans }, () => { const c = document.createElement('canvas'); c.width = N; c.height = NH; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, N, NH); return g; });
  for (let f = 0; f < L.F; f++) {
    const ch = Math.floor(f / L.per), k = f % L.per, col = k % L.cols, row = Math.floor(k / L.cols);
    const g = cvs[ch], tc = m.times[f], [sx, sy] = sizeXY(m, tc), c = centerAt(m, tc), hx = m.HX * sx, hy = m.HY * sy;
    const X = w => col * cw + (w - (c[0] - hx)) / (2 * hx) * cw, Y = w => row * chh + (1 - (w - (c[1] - hy)) / (2 * hy)) * chh;
    g.save(); g.beginPath(); g.rect(col * cw, row * chh, cw, chh); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1;
    for (let i = -10; i <= 10; i++) { const w = i * R0 / 2; g.beginPath(); g.moveTo(X(w), row * chh); g.lineTo(X(w), (row + 1) * chh); g.moveTo(col * cw, Y(w)); g.lineTo((col + 1) * cw, Y(w)); g.stroke(); }
    g.strokeStyle = '#fff'; g.lineWidth = Math.max(2, cw / 100);
    g.beginPath(); g.ellipse(X(0), Y(0), Math.abs(X(R0) - X(0)), Math.abs(Y(R0) - Y(0)), 0, 0, 2 * Math.PI); g.stroke();
    g.beginPath(); g.moveTo(X(-R0 * 0.25), Y(0)); g.lineTo(X(R0 * 0.25), Y(0)); g.moveTo(X(0), Y(-R0 * 0.25)); g.lineTo(X(0), Y(R0 * 0.25)); g.stroke();
    g.fillStyle = '#fff'; g.font = `bold ${Math.round(Math.min(cw, chh) * 0.22)}px sans-serif`; g.textBaseline = 'top'; g.fillText(String(f), col * cw + 6, row * chh + 4);
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.strokeRect(col * cw + 1.5, row * chh + 1.5, cw - 3, chh - 3);
    g.restore();
  }
  const out = new Uint8Array(N * NH * 4);
  cvs.forEach((g, ch) => { const d = g.getImageData(0, 0, N, NH).data; for (let y = 0; y < NH; y++) { const a = y * N * 4, b = (NH - 1 - y) * N * 4; for (let x = 0; x < N; x++) out[b + x * 4 + ch] = d[a + x * 4]; } });
  for (let i = 0; i < out.length; i += 4) { if (L.chans === 1) out[i + 1] = out[i + 2] = out[i]; if (L.chans < 4) out[i + 3] = 255; }
  return encodePNG(out, N, NH);
}
// Cutout 遮罩：给 Cascade Required 的 Cutout Texture，引擎按它生成 8 顶点的包围多边形，裁掉面片上的空白（减少 overdraw）。
//   一张图：把要导出的所有帧（含 RGBA 各通道、Head/Tail）叠在一起，512×512，白 = 有内容；Sub Images 1×1，不用 SubUV 模块。
//   编码值 ≥ 3/255 算有内容，再向外扩 3 个遮罩像素，光晕的边不会被切掉。
function cutoutMask(srcs, N, NH, L) {
  const U = 512, cw = N / L.cols, ch = NH / L.rows, thr = 3, dil = 3, m = new Uint8Array(U * U);
  for (const rgba of srcs) for (let c = 0; c < L.chans; c++) for (let y = 0; y < NH; y++) {
    const row = Math.floor(y / ch), my = Math.min(U - 1, Math.floor((y - row * ch) * U / ch)), base = (NH - 1 - y) * N;   // y：PNG 自上而下；源数据 GL 自下而上
    for (let x = 0; x < N; x++) {
      if (rgba[(base + x) * 4 + c] < thr) continue;
      const col = Math.floor(x / cw); if (c * L.per + row * L.cols + col >= L.F) continue;
      m[my * U + Math.min(U - 1, Math.floor((x - col * cw) * U / cw))] = 1;
    }
  }
  const out = new Uint8Array(U * U * 4), rows = new Array(U).fill(null); let n = 0;
  for (let j = 0; j < U; j++) for (let i = 0; i < U; i++) {
    let on = 0;
    for (let dj = -dil; dj <= dil && !on; dj++) for (let di = -dil; di <= dil; di++) { const a = i + di, b2 = j + dj; if (a >= 0 && a < U && b2 >= 0 && b2 < U && m[b2 * U + a]) { on = 1; break; } }
    if (on) { const o = ((U - 1 - j) * U + i) * 4; out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 255; n++; const r = rows[j]; if (!r) rows[j] = [i, i]; else r[1] = i; }
  }
  return { U, img: out, cov: n / (U * U), save: cutoutSaveEst(rows, U) };
}
// ---- 4.9.38 Cutout 能省多少（估）：引擎按 Cutout 生成 8 顶点的包围多边形（Required：Eight Vertices、Alpha Threshold 0.1），
//   面片上多边形外面那块不画。这里照同一个思路估：轮廓的凸包 → 每次去掉「补进来面积最小」的一条边，收到 8 个顶点 → 裁进方格 → 省 = 1 − 面积。
//   和 UE 的算法不保证逐位相同，只用来判断「几乎不省」（用户 10-07 23:2x 定门槛 10%）
function cutoutSaveEst(rows, U) {
  const pts = []; for (let y = 0; y < U; y++) { const r = rows[y]; if (r) pts.push([r[0], y], [r[0], y + 1], [r[1] + 1, y], [r[1] + 1, y + 1]); }
  if (pts.length < 3) return 1;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lo = [], hi = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  let v = lo.slice(0, -1).concat(hi.slice(0, -1));     // 凸包（逆时针）
  const X = (a, b, c, d) => { const r = [b[0] - a[0], b[1] - a[1]], q = [d[0] - c[0], d[1] - c[1]], den = r[0] * q[1] - r[1] * q[0]; if (Math.abs(den) < 1e-12) return null; const t = ((c[0] - a[0]) * q[1] - (c[1] - a[1]) * q[0]) / den; return [a[0] + t * r[0], a[1] + t * r[1]]; };
  while (v.length > 8) {
    const N = v.length; let best = -1, bA = Infinity, bX = null;
    for (let i = 0; i < N; i++) {
      const a = v[(i - 1 + N) % N], b = v[i], c = v[(i + 1) % N], d = v[(i + 2) % N], x = X(a, b, d, c); if (!x) continue;
      if ((x[0] - b[0]) * (b[0] - a[0]) + (x[1] - b[1]) * (b[1] - a[1]) < -1e-9 || (x[0] - c[0]) * (c[0] - d[0]) + (x[1] - c[1]) * (c[1] - d[1]) < -1e-9) continue;
      const A = Math.abs(cr(b, c, x)) / 2; if (A < bA) { bA = A; best = i; bX = x; }
    }
    if (best < 0) { let x0 = U, x1 = 0, y0 = U, y1 = 0; for (const p of v) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return Math.max(0, 1 - (x1 - x0) * (y1 - y0) / (U * U)); }
    const nv = []; for (let k = 0; k < N; k++) { if (k === best) nv.push(bX); else if (k !== (best + 1) % N) nv.push(v[k]); } v = nv;
  }
  // 裁进方格 [0, U]²（UE 也把顶点夹在面片里）
  for (const [ax, sg] of [[0, 1], [0, -1], [1, 1], [1, -1]]) {
    const lim = sg > 0 ? 0 : U, inside = p => sg > 0 ? p[ax] >= lim : p[ax] <= lim, nv = [];
    for (let k = 0; k < v.length; k++) { const P = v[k], Q = v[(k + 1) % v.length], pi = inside(P), qi = inside(Q);
      if (pi) nv.push(P); if (pi !== qi) { const t = (lim - P[ax]) / (Q[ax] - P[ax]); nv.push([P[0] + t * (Q[0] - P[0]), P[1] + t * (Q[1] - P[1])]); } }
    v = nv; if (v.length < 3) return 1;
  }
  let A = 0; for (let k = 0; k < v.length; k++) { const P = v[k], Q = v[(k + 1) % v.length]; A += P[0] * Q[1] - Q[0] * P[1]; }
  return clamp(1 - Math.abs(A) / 2 / (U * U), 0, 1);
}
// 贴图命名（用户 2026-09-29 晚改：按 spec 示例）：T_<效果名>[_<部件>].png，固定不变，不带日期 / 版本 / 格子（格子写在 cascade.json 里），
// 这样重新烘焙后引擎里右键「重新导入」就能更新。种子变体第 2、3 张加 _V2 / _V3。引擎里的正式名字由本机导入工具指定。
// （2026-09-28 的 T_EFX_FireWorks_<名>_<部件>_<列>x<行>_<序号> 已作废；第二个参数 L 保留只为兼容旧调用）
const TEX_PREFIX = 'T_';
function TN(name, part, L, idx = 1) {
  return TEX_PREFIX + name + (part ? '_' + part : '') + (idx > 1 ? '_V' + idx : '');
}
const joinPart = (...a) => a.filter(Boolean).join('_');
async function cutoutFiles(srcs, N, NH, L, file, meta) {
  const r = cutoutMask(srcs, N, NH, L), png = await encodePNG(r.img, r.U, r.U);
  CUTOUT_INFO.set(png, { save: r.save, cover: r.cov });
  if (meta) meta.cutout = { size: r.U, cover: +r.cov.toFixed(3), save: +r.save.toFixed(3), file };
  return [[`${file}.png`, png]];
}
// ---- 4.9.38 素材包整理（用户 10-07 23:23「很多ramp图与cut图都是重复或者有些图本身就占的很满了……自动判别去掉重复的或者没有意义的cut图」；
//   23:2x 选「导出时自动去重 + 没用的 Cutout 不出」「导入器按指纹复用」、门槛 10%）。打 ZIP 前统一做（makeZip），所有导出路径都经过：
//   ① Cutout 估省 < 10%：不出这张，cascade.json 里删掉这张贴图和发射器 required.cutout（引擎里就不设 Cutout Texture）；
//   ② 同一个包里内容一模一样的 Ramp / Cutout（多层颜色一样、PC / 手机、变体）只留一张，别的引用改指它；
//   ③ 每张 Ramp / Cutout 在 textures 里写 hash（内容指纹），导入器按它复用已经导入过的同一张（对话框5）；做了什么写进 texture_tidy、命名对照.txt
const CUTOUT_MIN_SAVE = 0.10;
const CUTOUT_INFO = new WeakMap();     // Cutout PNG（Blob）→ { save, cover }
let packTidyLast = null;
function texHash(u8) { let f = 0x811c9dc5; for (let i = 0; i < u8.length; i++) { f ^= u8[i]; f = Math.imul(f, 0x01000193) >>> 0; } return ((crc32(u8) ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0') + f.toString(16).padStart(8, '0') + u8.length.toString(16); }
async function packTidy(files) {
  const dec = new TextDecoder(), dirOf = f => f.slice(0, f.lastIndexOf('/') + 1), base = f => f.slice(f.lastIndexOf('/') + 1);
  const J = files.map(([f, d], i) => /(^|\/)cascade(_mobile|_low)?\.json$/.test(f) ? { i, f, dir: dirOf(f), j: JSON.parse(dec.decode(d)), merged: [], dropped: [] } : null).filter(Boolean);
  const report = { merged: [], dropped: [] };
  if (!J.length) return { files, report };
  const at = new Map(files.map(([f, d], i) => [f, i])), refs = x => [...Object.entries(x.j.textures || {}), ...Object.entries(x.j.extras || {})].filter(([, t]) => t && t.file && (t.class === 'ramp' || t.class === 'cutout'));
  const before = new Set(); for (const x of J) for (const [, t] of refs(x)) before.add(x.dir + t.file);
  // ① 几乎不省的 Cutout
  for (const x of J) for (const [key, t] of refs(x)) {
    if (t.class !== 'cutout') continue; const k = at.get(x.dir + t.file), info = k != null ? CUTOUT_INFO.get(files[k][1]) : null;
    if (!info || !(info.save < CUTOUT_MIN_SAVE)) { if (info) t.save_est = +info.save.toFixed(3); continue; }
    delete (x.j.textures || {})[key]; for (const em of x.j.emitters || []) if (em.required && em.required.cutout === key) delete em.required.cutout;
    x.dropped.push([t.file, +info.save.toFixed(3)]); if (!report.dropped.some(r => r[0] === x.dir + t.file)) report.dropped.push([x.dir + t.file, info.save]);
  }
  // ② 内容一样的只留一张（同一个目录里；按文件在包里的先后，先出现的留下）+ ③ 指纹
  const hashOf = new Map(), clsOf = new Map();
  for (const x of J) for (const [, t] of refs(x)) { const p = x.dir + t.file, k = at.get(p); if (k == null || hashOf.has(p)) continue; const d = files[k][1]; clsOf.set(p, t.class); hashOf.set(p, texHash(d instanceof Blob ? new Uint8Array(await d.arrayBuffer()) : d)); }
  const canon = new Map();     // 目录 + class + hash → 留下的路径
  for (const p of [...hashOf.keys()].sort((a, b) => at.get(a) - at.get(b))) { const key = dirOf(p) + '|' + clsOf.get(p) + '|' + hashOf.get(p); if (!canon.has(key)) canon.set(key, p); }
  for (const x of J) for (const [, t] of refs(x)) {
    const p = x.dir + t.file, h = hashOf.get(p); if (!h) continue; const c = canon.get(x.dir + '|' + clsOf.get(p) + '|' + h);
    if (c && c !== p) { x.merged.push([t.file, base(c)]); if (!report.merged.some(r => r[0] === p)) report.merged.push([p, c]); t.file = base(c); t.asset = t.file.replace(/\.png$/i, ''); }
    t.hash = h;
  }
  const after = new Set(); for (const x of J) for (const [, t] of refs(x)) after.add(x.dir + t.file);
  const gone = new Set([...before].filter(p => !after.has(p)));
  const out = [];
  for (let i = 0; i < files.length; i++) {
    const [f, d] = files[i]; if (gone.has(f)) continue;
    const x = J.find(q => q.i === i);
    if (x) { x.j.texture_tidy = { rule: 'Cutout 估省 < ' + Math.round(CUTOUT_MIN_SAVE * 100) + '%（8 顶点多边形外的面积）不出、发射器不设 Cutout Texture；同一个包里内容一样的 Ramp / Cutout 只留一张；textures[].hash = 内容指纹，导入时已有同 hash 的资产可直接复用', cutout_min_save: CUTOUT_MIN_SAVE, merged: x.merged, cutout_dropped: x.dropped, baker: typeof VERSION !== 'undefined' ? VERSION : '' }; out.push([f, utf8(JSON.stringify(x.j, null, 1))]); continue; }
    if (base(f) === '命名对照.txt' && (report.merged.length || report.dropped.length)) {
      const mine = p => dirOf(p) === dirOf(f), lines = [...report.merged.filter(([p]) => mine(p)).map(([p, c]) => `${base(p)} → 和 ${base(c)} 一模一样，不出（引用改指它）`), ...report.dropped.filter(([p]) => mine(p)).map(([p, s]) => `${base(p)} → Cutout 估只省 ${(s * 100).toFixed(1)}%，不出`)];
      out.push([f, utf8(dec.decode(d instanceof Blob ? new Uint8Array(await d.arrayBuffer()) : d) + (lines.length ? '\n素材包整理（4.9.38）：\n' + lines.join('\n') + '\n' : ''))]); continue;
    }
    out.push([f, d]);
  }
  return { files: out, report };
}
function packTidyNote() {
  const r = packTidyLast; if (!r || (!r.merged.length && !r.dropped.length)) return '';
  return `；整理：${r.merged.length ? `重复的 Ramp / Cutout ${r.merged.length} 张没出` : ''}${r.merged.length && r.dropped.length ? '、' : ''}${r.dropped.length ? `Cutout ${r.dropped.length} 张几乎不省（< ${Math.round(CUTOUT_MIN_SAVE * 100)}%）没出` : ''}（命名对照.txt 里有清单）`;
}
async function texFiles(b, name, sfx = '', idx = 1) {
  // sfx：'_4K' 表示 4K 母版；idx：种子变体的序号（01、02、03）
  if (b.form === 'emitset') return rtTexFiles(b, name, sfx, idx);
  const files = [], k4 = sfx ? sfx.replace(/^_/, '') : '';
  if (b.form === 'trail') {
    const L = b.meta.L;
    const lp = readRGBA8(b.head); files.push([`${TN(name, joinPart('Loop', k4), L, idx)}.png`, await encodePNG(lp, b.N, b.NH)]);
    if (!sfx) files.push(...await cutoutFiles([lp], b.N, b.NH, L, TN(name, 'Loop_Cutout', null, idx), b.meta));
    for (const f of b.fades) {
      const fp = readRGBA8(f.head); files.push([`${TN(name, joinPart('Fade' + f.fps, k4), L, idx)}.png`, await encodePNG(fp, f.N, f.NH)]);
      if (!sfx) files.push(...await cutoutFiles([fp], f.N, f.NH, L, TN(name, `Fade${f.fps}_Cutout`, null, idx), f));
    }
    return files;
  }
  for (let s = b, i = 0; s; s = s.next, i++) {
    const seg = bakeSegmentName(b,i), L = s.meta.L;
    const hd = readRGBA8(s.head), tl = s.tail ? readRGBA8(s.tail) : null;
    if (tl) {
      files.push([`${TN(name, joinPart(seg, 'Head', k4), L, idx)}.png`, await encodePNG(hd, s.N, s.NH)]);
      files.push([`${TN(name, joinPart(seg, 'Tail', k4), L, idx)}.png`, await encodePNG(tl, s.N, s.NH)]);
    } else files.push([`${TN(name, joinPart(seg, k4), L, idx)}.png`, await encodePNG(hd, s.N, s.NH)]);
    if (!sfx) {
      files.push([`${TN(name, joinPart(seg, 'FrameTest'), null, idx)}.png`, await debugAtlasPNG(s)]);
      files.push(...await cutoutFiles(tl ? [hd, tl] : [hd], s.N, s.NH, L, TN(name, joinPart(seg, 'Cutout'), null, idx), s.meta));
    }
  }
  if (b.vars) for (const [k, v] of b.vars.entries()) files.push(...await texFiles(v, name, sfx, idx + k + 1));     // 4.9.28 单束变体：第 2–4 张（内部名 _V2…，素材包里是序号 02…）
  return files;
}
function masterJSON(b, name, M) {
  if (b.form === 'emitset') return rtJSON(b, name, M);
  const P = b.P, m = b.meta, L = m.L;
  const seg = s => ({
    ...(s.meta.frameTiming?{frameTiming:s.meta.frameTiming,frameFps:s.meta.frameFps}:{}),
    t0: s.meta.t0 || 0, duration: s.meta.duration, frames: s.meta.L.F, frameCurve: { channel: 'Dynamic Parameter 帧号通道', keys: s.meta.riseLoop ? sawKeys(s.meta, s.meta.fit.T) : s.meta.keys },
    trail: s.meta.trail ? { riseSeconds: s.meta.T, loopSeconds: s.meta.Tp, relayLoopFrame: s.meta.fEnd, riseSizeByLifeY: s.meta.sizeKeysRise, fades: (b.fades || []).map(f => ({ fps: f.fps, frames: L.F, seconds: +(L.F / f.fps).toFixed(3) })), relayDiff: s.meta.relay, trailLengthM: +s.meta.trailLen.toFixed(2), engineBrightness: P.trBright, riseFit: s.meta.fit, pivotHead: s.meta.hb, fill: s.meta.fill ? { avg: s.meta.fill.avg, p10: s.meta.fill.p10, x: s.meta.fill.x, y: s.meta.fill.y } : null, seam: s.meta.check && s.meta.check.seam } : undefined,
    frameTimes: s.meta.times.map(v => +v.toFixed(4)), avgFps: +s.meta.avgFps.toFixed(2), minFps: +s.meta.minFps.toFixed(2), maxDispPx: +s.meta.maxDisp.toFixed(2),
    spriteSizeCm: [+(s.meta.Ww * 100).toFixed(1), +(s.meta.Wh * 100).toFixed(1)], burstOffsetZcm: +(s.meta.cy * 100).toFixed(1), pivotUV: [s.meta.px, +s.meta.py.toFixed(4)],
    sizeByLife: s.meta.zoom ? s.meta.sizeKeys : null, averageQuadArea: +s.meta.area.toFixed(3), darkTailFrames: s.meta.darkTail,
    colorOverLife: colorKeys(M, s.meta.duration, s.meta.t0 || 0), lightKeys: s.meta.lightKeys, selfCheck: s.meta.check
  });
  const segs = []; for (let s = b; s; s = s.next) segs.push(seg(s));
  return {
    name, type: P.type, typeName: TYPE_NAMES[P.type], form: b.form, tool: '烟花母版烘焙器 ' + VERSION, engine: P.engine,
    texture: { width: P.texW, height: P.texH, cols: L.cols, rows: L.rows, channels: L.chans, frames: L.F, cellPx: [L.cellW, L.cellH],
      order: L.chans === 4 ? '先填满 R 的全部格子再接 G、B、A；格子行优先，左上为第 0 帧' : '单通道，行优先，左上为第 0 帧',
      encoding: P.encGamma === 1 ? '线性灰度' : `gamma ${P.encGamma}`, output: b.tail ? 'split' : 'combined' },
    ...segs[0], segments: segs.length > 1 ? segs : undefined,
    unitFit: m.fit || undefined, sizeByLifeXY: m.aniso ? { x: m.sizeKeysX, y: m.sizeKeysY } : undefined,
    events: soundEvents(b), metrics: bakeMetrics(b) || (b.fm && b.fm.stat ? metricsOf(P, b.fm) : null),
    params: P, materialDefaults: M
  };
}
async function platformFiles(name,b,M,onProg=null) {
  const mobile=b.mobile||await bakeMobileFor(b,onProg);
  try {
    const files=await texFiles(mobile,name+'_Mobile');
    files.push([`${TN(name+'_Mobile','Ramp')}.png`,await encodePNG(rampPixels(M),256,8)]);
    files.push([`${name}_Mobile.json`,utf8(JSON.stringify(masterJSON(mobile,name+'_Mobile',M),null,2))]);
    files.push(...fwlFiles(name,b,M,mobile));
    return files;
  }finally{if(!b.mobile)disposeBake(mobile);}
}
// 4.4.2 单层效果按「导出方案」出包（文件名规则、版本记录和普通单层导出一样）
async function exportSingleScheme(name, b, destination) {
  const r = await singleSchemeFiles(name, b, state.M, p => busy(true, '按导出方案烘焙…', 0.93 + 0.05 * p)), files = r.files, so = singleOut(state.P);
  const kindCN = k => ({ seq: '序列', unit: '单束', dots: 'GPU 光点', frame: '单帧', off: '不出' })[k];
  files.push([`${name}_Cascade参数.txt`, utf8(`导出方案：PC ${kindCN(so.pc)} · 手机 ${kindCN(so.mobile)}（烘焙器 ${VERSION}）\n完整数值见 cascade.json / cascade_mobile.json。\n` + (so.pc === 'seq' ? cascadeText(name, b, state.M) : '') + '\n' + singleSchemeNote(state.P) + '\n')]);
  files.push([`${name}.json`, utf8(JSON.stringify({ ...masterJSON(b, name, state.M), exportScheme: so }, null, 2))]);
  busy(true, '打包 ZIP…', 1);
  let zipName = name, out = files;
  if (namingApplies(b)) { const nm = packNamesFor(wbKey(), lib.effect, 1, name, state.P.type); out = applyPackNaming(files, nm.base, [{ ln: r.ln, mn: r.mn, b: r.ub || b, mb: r.mb || b, layer: '', pcTex: r.pcTex, frame: r.frame }]); zipName = nm.base; }
  { const sp = exportScalePlan(state.P); out = scaleCascadeFiles(out, sp.k, sp.keep, sp.spec); zipName += sp.sfx; }     // 4.9.31 导出缩放
  await deliverResource(await makeZip(out), `${zipName}.zip`, deliveryMetadata(b), destination);
  wbAutoExport(zipName);
  flash(`已导出 ${name}（PC ${kindCN(so.pc)} · 手机 ${kindCN(so.mobile)}）${packTidyNote()}`, false, packTidyNote() ? 8000 : 0);
}
async function exportMaster() {
  const name = safeName();
  const destination = DeliveryWorkspace.destination();
  if (!busyCan(true)) return;
  busy(true, '准备导出…', 0);
  let own = false, b = null;
  try {
    b = state.bake && state.bake.scale === 1 && !state.dirty ? state.bake : null;
    if (b) { const nb = await refineBake(b, p => busy(true, `取景收紧… ${Math.round(p * 100)}%`, p * 0.9)); if (nb) { disposeBake(b); state.bake = b = nb; showStats(nb); } }   // 4.2.5：导出用收紧后的取景
    own = !b;
    if (own) b = await bakeFinal(state.P, 1, p => busy(true, `烘焙 ${state.P.texW}×${state.P.texH}… ${Math.round(p * 100)}%`, p * 0.9));
    busy(true, '编码 PNG…', 0.93);
    // 4.4.2：单层效果选了别的导出方案（GPU 光点 / 单束 / 不出，或手机不出）→ 和多层层页头同一套
    const so = typeof singleOut === 'function' ? singleOut(state.P) : { pc: 'seq', mobile: 'seq' };
    if ((so.pc !== 'seq' || so.mobile !== 'seq') && (b.form === 'master' || b.form === 'segments')) { await exportSingleScheme(name, b, destination); if (own && b) disposeBake(b); busy(false); return; }
    const files = await texFiles(b, name);
    if (b.form === 'trail' && state.P.trExport4K) {
      busy(true, '烘焙 4K 母版…', 0.94);
      const b4 = await bake(state.P, 2, p => busy(true, `烘焙 4K 母版… ${Math.round(p * 100)}%`, 0.94 + p * 0.04));
      try { files.push(...await texFiles(b4, name, '_4K')); } finally { disposeBake(b4); }
    }
    files.push([`${TN(name, 'Ramp')}.png`, await encodePNG(rampPixels(state.M), 256, 8)]);
    files.push([`${name}_Cascade参数.txt`, utf8(cascadeText(name, b, state.M))]);
    files.push([`${name}_曲线.csv`, utf8(curvesCSV(b, state.M))]);
    files.push([`${name}_声音节点.json`, utf8(JSON.stringify({ note: '时间为相对开花（上升类为相对发射）的秒数；游戏里按「距离 ÷ 343 m/s」再延迟', events: soundEvents(b) }, null, 2))]);
    files.push([`${name}.json`, utf8(JSON.stringify(masterJSON(b, name, state.M), null, 2))]);
    files.push(...await platformFiles(name, b, state.M,p=>busy(true,'手机独立烘焙…',p)));
    busy(true, '打包 ZIP…', 1);
    let zipName = name, out = files;
    if (namingApplies(b)) { const nm = packNamesFor(wbKey(), lib.effect, 1, name, state.P.type); out = applyPackNaming(files, nm.base, [{ ln: name, mn: name + '_Mobile', b, layer: '' }]); zipName = nm.base; }
    { const sp = exportScalePlan(state.P); out = scaleCascadeFiles(out, sp.k, sp.keep, sp.spec); zipName += sp.sfx; }     // 4.9.31 导出缩放
    await deliverResource(await makeZip(out), `${zipName}.zip`, deliveryMetadata(b), destination);
    wbAutoExport(zipName);     // 4.2.10：存进这个效果的「版本」（导出时），不再进工具页的全局版本列表
    flash('已导出 ' + name + packTidyNote(), false, packTidyNote() ? 8000 : 0);
  } catch (e) { console.error(e); flash('导出失败：' + e.message, true); }
  if (own && b) disposeBake(b);
  busy(false);
}
// 种子变体：V1–V3 三张贴图，共用一套参数表
async function exportVariants() {
  const name = safeName();
  const destination = DeliveryWorkspace.destination();
  if (bakeKind(state.P) !== 'master') { flash('种子变体只用于大面片母版', true); return; }
  if (!busyCan(true)) return;
  busy(true, '烘焙种子变体…', 0);
  let bs = [];
  try {
    bs = await bakeVariants(state.P, 1, p => busy(true, `烘焙种子变体 ${Math.round(p * 100)}%`, p * 0.9));
    const files = [];
    for (let i = 0; i < bs.length; i++) files.push(...await texFiles(bs[i], name, '', i + 1));
    files.push([`${TN(name, 'Ramp')}.png`, await encodePNG(rampPixels(state.M), 256, 8)]);
    files.push([`${name}_Cascade参数.txt`, utf8(cascadeText(name, bs[0], state.M) + `\n【种子变体】\n第 1 张（不带后缀）/ _V2 / _V3 三套贴图共用上面的取景、帧号曲线和尺寸，只换贴图；同屏多发时轮换使用，避免一模一样。种子：${bs.map(b => b.P.seed).join('、')}\n`)]);
    files.push([`${name}_曲线.csv`, utf8(curvesCSV(bs[0], state.M))]);
    files.push([`${name}.json`, utf8(JSON.stringify({ ...masterJSON(bs[0], name, state.M), variants: bs.map((b, i) => ({ index: String(i + 1).padStart(2, '0'), seed: b.P.seed })) }, null, 2))]);
    files.push(...fwlFiles(name, bs[0], state.M));
    await deliverResource(await makeZip(files), `${name}_V1-V3.zip`, deliveryMetadata(bs[0]), destination);
    flash('已导出三个种子变体');
  } catch (e) { console.error(e); flash('导出失败：' + e.message, true); }
  bs.forEach(disposeBake); busy(false);
}
