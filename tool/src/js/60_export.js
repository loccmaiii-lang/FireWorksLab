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
function rampPixels(M, w = 256, h = 8) {
  const a = new Uint8Array(w * h * 4);
  for (let x = 0; x < w; x++) { const c = rampAt(M, x / (w - 1)).map(srgb8); for (let y = 0; y < h; y++) { const i = (y * w + x) * 4; a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; a[i + 3] = 255; } }
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
  const rows = ['段,曲线,相对时间,值1,值2,值3'];
  for (let s = b, i = 0; s; s = s.next, i++) {
    const m = s.meta, seg = b.next ? 'AB'[i] : '';
    const fk = m.riseLoop ? sawKeys(m, m.fit.T) : m.keys;
    for (const [u, v] of fk) rows.push(`${seg},DynamicParameter_第三通道_帧号,${u},${v},,`);
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
  for (let i = 0; i < n; i++) { const a = i * Tp / T, b = Math.min(1, (i + 1) * Tp / T); keys.push([+a.toFixed(5), 0]); keys.push([+Math.max(a, b - 1e-4).toFixed(5), +(F * Math.min(1, (b - a) * T / Tp) - 0.001).toFixed(3)]); }
  return keys;
}

const safeName = () => (state.name || 'Firework').replace(/[^\w\-]+/g, '_');
async function texFiles(b, name) {
  const files = [];
  for (let s = b, i = 0; s; s = s.next, i++) {
    const sx = b.next ? '_' + 'AB'[i] : '';
    if (s.tail) {
      files.push([`T_${name}${sx}_Head.png`, await encodePNG(readRGBA8(s.head), s.N, s.NH)]);
      files.push([`T_${name}${sx}_Tail.png`, await encodePNG(readRGBA8(s.tail), s.N, s.NH)]);
    } else files.push([`T_${name}${sx}.png`, await encodePNG(readRGBA8(s.head), s.N, s.NH)]);
  }
  return files;
}
function masterJSON(b, name, M) {
  const P = b.P, m = b.meta, L = m.L;
  const seg = s => ({
    t0: s.meta.t0 || 0, duration: s.meta.duration, frames: L.F, frameCurve: { channel: 'Dynamic Parameter 第三通道', keys: s.meta.riseLoop ? sawKeys(s.meta, s.meta.fit.T) : s.meta.keys },
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
async function exportMaster() {
  const name = safeName();
  busy(true, '准备导出…', 0);
  let own = false, b = null;
  try {
    b = state.bake && state.bake.scale === 1 && !state.dirty ? state.bake : null;
    own = !b;
    if (own) b = await bake(state.P, 1, p => busy(true, `烘焙 ${state.P.texW}×${state.P.texH}… ${Math.round(p * 100)}%`, p * 0.9));
    busy(true, '编码 PNG…', 0.93);
    const files = await texFiles(b, name);
    files.push([`T_${name}_Ramp.png`, await encodePNG(rampPixels(state.M), 256, 8)]);
    files.push([`${name}_Cascade参数.txt`, utf8(cascadeText(name, b, state.M))]);
    files.push([`${name}_曲线.csv`, utf8(curvesCSV(b, state.M))]);
    files.push([`${name}_声音节点.json`, utf8(JSON.stringify({ note: '时间为相对开花（上升类为相对发射）的秒数；游戏里按「距离 ÷ 343 m/s」再延迟', events: soundEvents(b) }, null, 2))]);
    files.push([`${name}.json`, utf8(JSON.stringify(masterJSON(b, name, state.M), null, 2))]);
    busy(true, '打包 ZIP…', 1);
    download(await makeZip(files), `${name}.zip`);
    recordVersion('导出 ' + name);
    flash('已导出 ' + name);
  } catch (e) { console.error(e); flash('导出失败：' + e.message, true); }
  if (own && b) disposeBake(b);
  busy(false);
}
// 种子变体：V1–V3 三张贴图，共用一套参数表
async function exportVariants() {
  const name = safeName();
  if (bakeKind(state.P) !== 'master') { flash('种子变体只用于大面片母版', true); return; }
  busy(true, '烘焙种子变体…', 0);
  let bs = [];
  try {
    bs = await bakeVariants(state.P, 1, p => busy(true, `烘焙种子变体 ${Math.round(p * 100)}%`, p * 0.9));
    const files = [];
    for (let i = 0; i < bs.length; i++) for (const [fn, blob] of await texFiles(bs[i], name)) files.push([fn.replace(`T_${name}`, `T_${name}_V${i + 1}`), blob]);
    files.push([`T_${name}_Ramp.png`, await encodePNG(rampPixels(state.M), 256, 8)]);
    files.push([`${name}_Cascade参数.txt`, utf8(cascadeText(name, bs[0], state.M) + `\n【种子变体】\nT_${name}_V1/V2/V3 共用上面的取景、帧号曲线和尺寸，只换贴图；同屏多发时轮换使用，避免一模一样。种子：${bs.map(b => b.P.seed).join('、')}\n`)]);
    files.push([`${name}_曲线.csv`, utf8(curvesCSV(bs[0], state.M))]);
    files.push([`${name}.json`, utf8(JSON.stringify({ ...masterJSON(bs[0], name, state.M), variants: bs.map((b, i) => ({ texture: `T_${name}_V${i + 1}`, seed: b.P.seed })) }, null, 2))]);
    download(await makeZip(files), `${name}_V1-V3.zip`);
    flash('已导出三个种子变体');
  } catch (e) { console.error(e); flash('导出失败：' + e.message, true); }
  bs.forEach(disposeBake); busy(false);
}
