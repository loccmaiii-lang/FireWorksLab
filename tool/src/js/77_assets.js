// =====================================================================
//  素材页：打开一个结果文件夹（里面有 预览.json + 贴图），按引擎的方式播放
//  帧号曲线 → 取整、不混合；自然色 RGB 直接显示，灰度 RGBA 接力按 Ramp(v) × v × Color Over Life 上色；
//  粒子的出生、位置、速度、阻力、重力、大小、旋转、寿命按清单里的发射器参数（与 Cascade 参数表一致）。
//  清单 hdr: true（4.0.1）：所有粒子先按线性亮度累加（像素值 = Σ 颜色 × 贴图值，和引擎一样），最后统一做显示映射 1 − e^(−4x)；
//  软圆点发射器（dot: true，材质 soft_dot）不需要贴图，颜色 / 大小按寿命取曲线。清单不开 hdr 的旧条目行为不变。
// =====================================================================
const asset = { man: null, files: null, variant: 'A', emit: [], parts: [], on: {}, cutout: false, sky: 'black', gain: 1, ready: false, dir: '' };
const ASSET_CELL = 256;   // 预览时每帧缩到的尺寸（只影响预览清晰度，不影响贴图）

function mulberry(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function curveAt(keys, u) {   // 线性插值（Constant Curve）
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u <= keys[i][0]) { const [a, va] = keys[i - 1], [b, vb] = keys[i], k = (u - a) / Math.max(1e-9, b - a); return Array.isArray(va) ? va.map((x, j) => x + (vb[j] - x) * k) : va + (vb - va) * k; }
  return keys[keys.length - 1][1];
}
const lin2s = x => x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
const s2lin = x => x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);

// 贴图来源：打开的文件夹（File）或迭代区的 preview.js（data URL）
async function assetBlob(name) {
  const f = asset.files.get(name); if (!f) throw new Error('缺少 ' + name);
  return typeof f === 'string' ? await (await fetch(f)).blob() : f;
}
// 帧号曲线反查：第 f 帧在相对寿命的哪个时刻（取颜色用）
function frameU(keys, f) { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (curveAt(keys, m) < f) lo = m; else hi = m; } return hi; }
async function assetImage(name) { return await createImageBitmap(await assetBlob(name)); }
function pixelsOf(img, w = img.width, h = img.height) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h); return g.getImageData(0, 0, w, h).data;
}
// 缩小链（mipmap）：远处的面片只有一两个像素宽，直接把 256 像素的帧画上去浏览器只取几个点，细亮线会整根丢掉；
// 每帧预先逐级减半（每级 2×2 平均），画的时候取和屏幕尺寸最接近的那一级
function mipChain(c) {
  const out = [c]; let cur = c;
  while (cur.width > 2 && cur.height > 2) {
    const n = document.createElement('canvas'); n.width = Math.max(1, cur.width >> 1); n.height = Math.max(1, cur.height >> 1);
    const g = n.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(cur, 0, 0, n.width, n.height); out.push(n); cur = n;
  }
  return out;
}
// 一个发射器、一套贴图 → 每帧一张小画布
async function assetFrames(tex) {
  const img = await assetImage(asset.files.has(tex.file) ? tex.file : tex.file + '#R'), cw = img.width / tex.cols, ch = img.height / tex.rows, per = tex.cols * tex.rows, out = [];
  const S = Math.max(16, Math.min(ASSET_CELL, Math.round(1024 * cw / ch)));   // 细长格子（尾缀星头 1:16）按长边 1024 缩，不按宽边放大
  if (tex.mode === 'rgb') {
    for (let f = 0; f < tex.frames; f++) {
      const c = document.createElement('canvas'); c.width = c.height = S; const r = Math.floor(f / tex.cols), q = f % tex.cols;
      c.getContext('2d').drawImage(img, q * cw, r * ch, cw, ch, 0, 0, S, S); out.push(c);
    }
    return out;
  }
  // 灰度 RGBA 接力：先缩到每格 S，再按通道取值。
  //   浏览器解 PNG 时会用 A 预乘 RGB（A = 0 的地方 RGB 被清零），所以 preview.js 里每个通道单独存一张灰度图（文件名 + '#R' 等）
  const SH = Math.max(1, Math.round(S * ch / cw)), W = tex.cols * S, H = tex.rows * SH;
  const chanData = [];
  const readGray = async blob => {
    const bm = await createImageBitmap(blob, { colorSpaceConversion: 'none', resizeWidth: W, resizeHeight: H, resizeQuality: 'high' });
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g0 = cv.getContext('2d', { willReadFrequently: true }); g0.drawImage(bm, 0, 0);
    const d = g0.getImageData(0, 0, W, H).data, o = new Uint8Array(W * H); for (let i = 0; i < o.length; i++) o[i] = d[i * 4]; return o;
  };
  if (asset.files.has(tex.file + '#R')) {
    for (const c of 'RGBA'.slice(0, tex.chans || 4)) chanData.push(asset.files.has(tex.file + '#' + c) ? await readGray(await assetBlob(tex.file + '#' + c)) : null);
  } else {
    const bm = await createImageBitmap(await assetBlob(tex.file), { premultiplyAlpha: 'none', colorSpaceConversion: 'none', resizeWidth: W, resizeHeight: H, resizeQuality: 'high' });
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g0 = cv.getContext('2d', { willReadFrequently: true }); g0.drawImage(bm, 0, 0);
    const d = g0.getImageData(0, 0, W, H).data;
    for (let c = 0; c < 4; c++) { const o = new Uint8Array(W * H); for (let i = 0; i < o.length; i++) o[i] = d[i * 4 + c]; chanData.push(o); }
  }
  let ramp = null;
  if (tex.ramp) { const ri = await assetImage(tex.ramp), rp = pixelsOf(ri, 256, 1); ramp = []; for (let i = 0; i < 256; i++) ramp.push([s2lin(rp[i * 4] / 255), s2lin(rp[i * 4 + 1] / 255), s2lin(rp[i * 4 + 2] / 255)]); }
  const perChan = tex.chans === 1 ? tex.frames : per;
  for (let f = 0; f < tex.frames; f++) {
    const chn = Math.floor(f / perChan), cell = f % perChan, r = Math.floor(cell / tex.cols), q = cell % tex.cols, src = chanData[chn] || chanData[0];
    const u = frameU(tex.keys, f), col = tex.col ? curveAt(tex.col, u) : [1, 1, 1];
    const lin = new Float32Array(256 * 3), gm = tex.gamma || 1, baker = tex.tone === 'baker';
    // tone 'baker'：和烘焙器「导出效果」一样——材质亮度 Ramp(v)·v·颜色·4，显示 1 − e^(−x) 再 gamma 2.2（导出母版用）；否则直接 sRGB（单元贴图用）
    for (let v = 0; v < 256; v++) {
      const x = Math.pow(v / 255, gm), vi = Math.round(x * 255), rc = ramp ? ramp[Math.min(255, vi)] : [1, 1, 1];
      for (let j = 0; j < 3; j++) lin[v * 3 + j] = rc[j] * x * col[j];
    }
    // 先存线性亮度，再显示：缩小链在线性亮度上平均、每级各自做显示映射（像相机一样先积分再截断，细亮线缩小后仍然过曝）
    const L = new Float32Array(S * SH * 3);
    for (let y = 0; y < SH; y++) for (let x = 0; x < S; x++) {
      const v = src[(r * SH + y) * W + q * S + x], o = (y * S + x) * 3;
      L[o] = lin[v * 3]; L[o + 1] = lin[v * 3 + 1]; L[o + 2] = lin[v * 3 + 2];
    }
    const toCanvas = (A, w, h) => {
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const gg = cv.getContext('2d'), im = gg.createImageData(w, h), dd = im.data;
      for (let i = 0, n = w * h; i < n; i++) for (let j = 0; j < 3; j++) { const l = A[i * 3 + j]; dd[i * 4 + j] = Math.round((baker ? Math.pow(1 - Math.exp(-4 * l), 1 / 2.2) : lin2s(Math.min(1, l))) * 255); }
      for (let i = 0, n = w * h; i < n; i++) dd[i * 4 + 3] = 255;
      gg.putImageData(im, 0, 0); return cv;
    };
    const hdr = !!(asset.man && asset.man.hdr), linKeep = [];      // hdr：留线性亮度的缩小链（只留宽 ≤ 64 的几级，省内存）
    const chain = hdr ? [] : [toCanvas(L, S, SH)]; let A = L, w = S, h = SH;
    if (hdr && w <= 64) linKeep.push({ w, h, d: A });
    while (w > 2 && h > 2) {
      const w2 = w >> 1, h2 = h >> 1, B = new Float32Array(w2 * h2 * 3);
      for (let y = 0; y < h2; y++) for (let x = 0; x < w2; x++) for (let j = 0; j < 3; j++) {
        const a = ((2 * y) * w + 2 * x) * 3 + j, b = ((2 * y + 1) * w + 2 * x) * 3 + j;
        B[(y * w2 + x) * 3 + j] = 0.25 * (A[a] + A[a + 3] + A[b] + A[b + 3]);
      }
      if (hdr) { if (w2 <= 64) linKeep.push({ w: w2, h: h2, d: B }); } else chain.push(toCanvas(B, w2, h2));
      A = B; w = w2; h = h2;
    }
    if (hdr) { out.push(null); (out.lin = out.lin || []).push(linKeep); (out.mips = out.mips || []).push([]); continue; }
    out.push(chain[0]); (out.mips = out.mips || []).push(chain);
  }
  return out;
}
// 按发射器参数生成粒子（与参数表同一套规则；种子固定，每次一样）
//   bursts：某时刻一次出 n 个；spawn：{rate, t0, t1} 按发射器时间连续出生（Spawn Rate）
//   locCurve / velCurve / accCurve：按「出生时的发射器时间」取的曲线（Cascade 的 Initial Location / Initial Velocity / Acceleration）
//   velJit：初速 × (1 ± velJit)；dragRange：Drag 在区间里随机；velLife：Velocity/Life（Absolute），粒子沿这条速度曲线积分出路径
//   spawn.curve：Spawn Rate 曲线（按发射器时间，[[t, 每秒个数], …]）；velAdd：[[x,y,z]下限, [x,y,z]上限] 再加一个均匀随机初速（第二个 Initial Velocity）
function assetSpawn() {
  asset.parts = [];
  for (const e of asset.emit) {
    const d = e.def, rnd = mulberry(d.seed || 1), sp = d.sphere || { r: 0, vel: 0 };
    const [s0, s1] = d.size || [10, 10], [l0, l1] = d.life || [2, 2];
    const make = (t0) => {
      let p = [0, 0, 0];
      if (sp.r > 0) {
        const g = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
        p = [g(), g(), g()]; const L = Math.hypot(...p) || 1, R = sp.surface ? sp.r : sp.r * Math.cbrt(rnd()); p = p.map(x => x / L * R);
      }
      let v = p.map(x => x * (sp.vel || 0));
      if (d.locCurve) p = curveAt(d.locCurve, t0).map((x, i) => x + p[i]);
      if (d.velCurve) { const j = 1 + (d.velJit || 0) * (2 * rnd() - 1); v = curveAt(d.velCurve, t0).map(x => x * j); }
      if (d.velAdd) v = v.map((x, i) => x + d.velAdd[0][i] + (d.velAdd[1][i] - d.velAdd[0][i]) * rnd());
      const part = { e, t0, p, v, size: s0 + (s1 - s0) * rnd(), rot: d.rot ? rnd() * Math.PI * 2 : 0, life: l0 + (l1 - l0) * rnd() };
      if (d.dragRange) part.k = d.dragRange[0] + (d.dragRange[1] - d.dragRange[0]) * rnd();
      if (d.accCurve) part.acc = curveAt(d.accCurve, t0);
      asset.parts.push(part);
    };
    if (d.spawn && d.spawn.curve) {
      const c = d.spawn.curve, tEnd = c[c.length - 1][0], dt = 1 / 240; let acc = 0;
      for (let t = c[0][0]; t < tEnd; t += dt) { acc += Math.max(0, curveAt(c, t)) * dt; while (acc >= 1) { make(t + rnd() * dt); acc -= 1; } }
    } else if (d.spawn) { const { rate, t0 = 0, t1 = 1 } = d.spawn, n = Math.floor(rate * (t1 - t0)); for (let i = 0; i < n; i++) make(t0 + (i + rnd()) / rate); }
    for (const [t0, n] of d.bursts || (d.spawn ? [] : [[0, 1]])) for (let i = 0; i < n; i++) make(t0);
    // Velocity/Life（Absolute）：按寿命积分出路径（每 1/120 秒一个点：x, z, vx, vz）
    e.path = null;
    if (d.velLife) {
      const L = l1 || l0, dt = 1 / 120, n = Math.ceil(L / dt) + 1, path = []; let x = 0, z = 0;
      for (let i = 0; i < n; i++) { const v = curveAt(d.velLife, Math.min(1, i * dt / L)); path.push([x, z, v[0], v[2]]); x += v[0] * dt; z += v[2] * dt; }
      e.path = path;
    }
  }
}
async function assetLoadVariant() {
  asset.ready = false; busy(true, '准备素材预览…', 0);
  try {
    let i = 0;
    for (const e of asset.emit) {
      if (e.def.dot) { e.tex = null; e.frames = []; e.mips = []; e.lin = null; e.cut = null; busy(true, null, ++i / asset.emit.length); continue; }
      const tex = e.def.tex[asset.variant] || e.def.tex[Object.keys(e.def.tex)[0]];
      e.tex = tex; e.frames = await assetFrames(tex); e.lin = e.frames.lin || null; e.mips = e.frames.mips || e.frames.map(mipChain);
      const cf = tex.cutout || e.def.cutout; e.cut = cf && asset.files.has(cf) ? await assetImage(cf) : null;
      busy(true, null, ++i / asset.emit.length);
    }
    asset.ready = true;
  } catch (err) { console.error(err); flash('素材读取失败：' + err.message, true); }
  busy(false); assetPanel();
}
// 迭代区条目：注入 preview.js（file:// 下 <script> 可以读相对路径），它调用 FW_ASSET_LOADED 交回清单和贴图
const assetCache = {};
window.FW_ASSET_LOADED = (id, data) => { assetCache[id] = data; };
function loadAssetEntry(e) {
  const go = async d => {
    asset.man = d.manifest; asset.files = new Map(Object.entries(d.images)); asset.dir = e.task;
    const vs = Object.keys(asset.man.variants || { A: '' }); if (!vs.includes(asset.variant)) asset.variant = vs[0];
    asset.emit = asset.man.emitters.map(x => ({ def: x })); asset.on = {}; for (const x of asset.emit) asset.on[x.def.name] = true;
    assetSpawn(); state.t = 0; await assetLoadVariant();
  };
  if (assetCache[e.id]) { go(assetCache[e.id]); return; }
  busy(true, '读取 ' + e.name + '…', 0.1);
  const sc = document.createElement('script'); sc.src = e.src + '?v=' + Date.now();
  sc.onload = () => { busy(false); const d = assetCache[e.id]; if (d) go(d); else flash('预览数据格式不对：' + e.src, true); };
  sc.onerror = () => { busy(false); flash('读不到 ' + e.src + '（先 git pull，再刷新烘焙器）', true); };
  document.head.appendChild(sc);
}
async function assetOpen(fileList) {
  const files = new Map(); let dir = '';
  for (const f of fileList) { files.set(f.name, f); if (!dir && f.webkitRelativePath) dir = f.webkitRelativePath.split('/')[0]; }
  const mf = files.get('预览.json');
  if (!mf) { flash('这个文件夹里没有 预览.json（请选 analysis/results/ 下的任务文件夹）', true); return; }
  try { asset.man = JSON.parse(await mf.text()); } catch (e) { flash('预览.json 读不了：' + e.message, true); return; }
  asset.files = files; asset.dir = dir;
  const vs = Object.keys(asset.man.variants || { A: '' }); if (!vs.includes(asset.variant)) asset.variant = vs[0];
  asset.emit = asset.man.emitters.map(d => ({ def: d })); asset.on = {}; for (const e of asset.emit) asset.on[e.def.name] = true;
  assetSpawn(); state.t = 0; state.playing = true;
  await assetLoadVariant();
  flash('已打开：' + (asset.man.title || dir));
}
function assetDuration() { return asset.man ? asset.man.duration || 3 : 3; }
function renderAssets() {
  const cv = $('#assetCv'), box = $('#box'), dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = Math.round(box.clientWidth * dpr), H = Math.round(box.clientHeight * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const g = cv.getContext('2d'); cv.style.filter = state.expo !== 1 ? `brightness(${state.expo})` : '';
  g.globalCompositeOperation = 'source-over'; g.fillStyle = asset.sky === 'sky' ? '#34466e' : '#020306'; g.fillRect(0, 0, W, H);
  if (!asset.man) { g.fillStyle = '#9aa0b4'; g.font = `${14 * dpr}px sans-serif`; g.textAlign = 'center'; g.fillText('在左栏「迭代区」点一个素材条目', W / 2, H / 2); hudText = ''; return; }
  if (!asset.ready) return;
  if (asset.man.hdr) { renderAssetsHDR(cv, g, W, H); return; }
  const t = engineTick(state.t), fitPPM=Math.min(W,H)/(asset.man.view||150), pxm = state.disp==='game'?gamePixelsPerMeter(asset.man,asset.man.diameter||asset.man.view||150,Math.min(W,H)):fitPPM, c0 = asset.man.center || [0, 0]; let alive = 0, area = 0; const fr = {};
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, asset.gain); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  for (const b of asset.parts) {
    const e = b.e; if (!asset.on[e.def.name] || e.def.dot) continue;
    const age = t - b.t0; if (age < 0 || age >= b.life) continue;
    let x, z, ang = b.rot;
    if (e.path) {                  // Velocity/Life：沿积分好的路径走；速度朝向的面片转到速度方向（面片上端朝前）
      const q = e.path[Math.min(e.path.length - 1, Math.floor(age * 120))]; x = b.p[0] + q[0]; z = b.p[2] + q[1];
      if (e.def.align === 'velocity') ang = Math.atan2(q[2], q[3]);
    } else {
      const k = b.k != null ? b.k : (e.def.drag || 0), acc = b.acc || e.def.accel || [0, 0, 0], s1 = k > 0 ? (1 - Math.exp(-k * age)) / k : age;
      const gz = k > 0 ? acc[2] / k * (age - s1) : 0.5 * acc[2] * age * age, gx = k > 0 ? acc[0] / k * (age - s1) : 0.5 * acc[0] * age * age;
      x = b.p[0] + b.v[0] * s1 + gx; z = b.p[2] + b.v[2] * s1 + gz;
    }
    const u = age / b.life, f = Math.max(0, Math.min(e.frames.length - 1, Math.floor(curveAt(e.tex.keys, u))));
    const tx = e.tex, zk = tx.sizeKeys ? (v => Array.isArray(v) ? v[0] : v)(curveAt(tx.sizeKeys, u)) : 1, off = tx.offset || [0, 0];
    const wk = tx.whKeys ? curveAt(tx.whKeys, u) : [1, 1], pv = tx.pivot || [0.5, 0.5];
    const sw = (tx.wh ? tx.wh[0] : b.size) * zk * wk[0] * pxm, sh = (tx.wh ? tx.wh[1] : b.size) * zk * wk[1] * pxm;
    const cx = W / 2 + (x - c0[0] + off[0]) * pxm, cy = H / 2 - (z - c0[1] + off[1]) * pxm;
    if (cx < -sw - sh || cx > W + sw + sh || cy < -sw - sh || cy > H + sw + sh) continue;
    const mc = e.mips ? e.mips[f] : [e.frames[f]], lv = Math.max(0, Math.min(mc.length - 1, Math.floor(Math.log2(Math.max(1, Math.min(mc[0].width / Math.max(1, sw), mc[0].height / Math.max(1, sh)))))));
    g.save(); g.translate(cx, cy); g.rotate(ang); g.drawImage(mc[lv], -pv[0] * sw, -pv[1] * sh, sw, sh);
    if (asset.cutout && e.cut) { g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.18; g.drawImage(e.cut, -pv[0] * sw, -pv[1] * sh, sw, sh); g.globalAlpha = Math.min(1, asset.gain); g.globalCompositeOperation = 'lighter'; }
    g.restore();
    alive++; area += sw * sh; fr[e.def.name] = f;
  }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  const fs = Object.values(fr); hudText = `${(asset.man.variants || {})[asset.variant] || asset.variant} · 粒子 ${alive} · 帧 ${fs.length ? Math.min(...fs) + (Math.max(...fs) !== Math.min(...fs) ? '–' + Math.max(...fs) : '') : '-'} · 面片合计 ${(area / (W * H) * 100).toFixed(0)}% 画面`;
}
// 粒子在年龄 age 时的位置（和非 hdr 路径同一套运动：线性阻力 + 恒定加速度的解析解；Velocity/Life 沿积分路径）
function assetPos(b, age) {
  const e = b.e;
  if (e.path) { const q = e.path[Math.min(e.path.length - 1, Math.floor(age * 120))]; return [b.p[0] + q[0], b.p[2] + q[1], e.def.align === 'velocity' ? Math.atan2(q[2], q[3]) : b.rot]; }
  const k = b.k != null ? b.k : (e.def.drag || 0), acc = b.acc || e.def.accel || [0, 0, 0], s1 = k > 0 ? (1 - Math.exp(-k * age)) / k : age;
  const gz = k > 0 ? acc[2] / k * (age - s1) : 0.5 * acc[2] * age * age, gx = k > 0 ? acc[0] / k * (age - s1) : 0.5 * acc[0] * age * age;
  return [b.p[0] + b.v[0] * s1 + gx, b.p[2] + b.v[2] * s1 + gz, b.rot];
}
// hdr：先在浮点缓冲里按线性亮度累加（引擎的加色混合），最后一次显示映射 1 − e^(−4x)、gamma 2.2，再叠到天空底色上。
//   软圆点：高斯，σ = 面片尺寸 / 4，中心值 = 颜色；小于半个像素时按总光量守恒摊开（σ 至少 0.5 像素）。
//   序列面片：取线性亮度缩小链里和屏幕尺寸最接近的一级，逐像素取样累加（支持旋转）。
const assetHDR = { buf: null, w: 0, h: 0, cv: null };
function renderAssetsHDR(cv, g, W, H) {
  const sc = Math.min(1, Math.sqrt(1.3e6 / (W * H))), w = Math.max(1, Math.round(W * sc)), h = Math.max(1, Math.round(H * sc));
  if (!assetHDR.buf || assetHDR.w !== w || assetHDR.h !== h) { assetHDR.buf = new Float32Array(w * h * 3); assetHDR.w = w; assetHDR.h = h; assetHDR.cv = document.createElement('canvas'); assetHDR.cv.width = w; assetHDR.cv.height = h; }
  const buf = assetHDR.buf; buf.fill(0);
  const t = engineTick(state.t), fitPPM = Math.min(W, H) / (asset.man.view || 150);
  const pxm = (state.disp === 'game' ? gamePixelsPerMeter(asset.man, asset.man.diameter || asset.man.view || 150, Math.min(W, H)) : fitPPM) * sc, c0 = asset.man.center || [0, 0];
  let alive = 0; const fr = {};
  for (const b of asset.parts) {
    const e = b.e; if (!asset.on[e.def.name]) continue;
    const age = t - b.t0; if (age < 0 || age >= b.life) continue;
    const u = age / b.life, [x, z, ang] = assetPos(b, age), cx = w / 2 + (x - c0[0]) * pxm, cy = h / 2 - (z - c0[1]) * pxm;
    if (e.def.dot) {
      const zk = e.def.sizeLife ? curveAt(e.def.sizeLife, u) : 1, st = b.size * zk * pxm / 4, sg = Math.max(0.5, st), col = e.def.col ? curveAt(e.def.col, u) : [1, 1, 1];
      const amp = (st / sg) * (st / sg), R = Math.ceil(3 * sg), x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(w - 1, Math.ceil(cx + R)), y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(h - 1, Math.ceil(cy + R));
      if (x0 > x1 || y0 > y1) continue;
      const k2 = -0.5 / (sg * sg), r0 = col[0] * amp, g0 = col[1] * amp, b0 = col[2] * amp;
      for (let yy = y0; yy <= y1; yy++) { const dy = yy + 0.5 - cy; for (let xx = x0; xx <= x1; xx++) { const dx = xx + 0.5 - cx, f = Math.exp((dx * dx + dy * dy) * k2), o = (yy * w + xx) * 3; buf[o] += r0 * f; buf[o + 1] += g0 * f; buf[o + 2] += b0 * f; } }
      alive++; fr[e.def.name] = '·'; continue;
    }
    const f = Math.max(0, Math.min(e.frames.length - 1, Math.floor(curveAt(e.tex.keys, u)))), tx = e.tex;
    const zk = tx.sizeKeys ? (v => Array.isArray(v) ? v[0] : v)(curveAt(tx.sizeKeys, u)) : 1, wk = tx.whKeys ? curveAt(tx.whKeys, u) : [1, 1], pv = tx.pivot || [0.5, 0.5], off = tx.offset || [0, 0];
    const sw = (tx.wh ? tx.wh[0] : b.size) * zk * wk[0] * pxm, sh = (tx.wh ? tx.wh[1] : b.size) * zk * wk[1] * pxm;
    const levels = (e.lin && e.lin[f]) || []; if (!levels.length || sw < 0.05 || sh < 0.05) continue;
    const L = levels.reduce((best, l) => Math.abs(Math.log(l.w / Math.max(1, sw))) < Math.abs(Math.log(best.w / Math.max(1, sw))) ? l : best, levels[0]);
    const pcx = cx + off[0] * pxm, pcy = cy - off[1] * pxm, ca = Math.cos(ang), sa = Math.sin(ang), hx = Math.abs(sw * ca) + Math.abs(sh * sa), hy = Math.abs(sw * sa) + Math.abs(sh * ca);
    const x0 = Math.max(0, Math.floor(pcx - hx)), x1 = Math.min(w - 1, Math.ceil(pcx + hx)), y0 = Math.max(0, Math.floor(pcy - hy)), y1 = Math.min(h - 1, Math.ceil(pcy + hy));
    // 面积守恒：面片比一个像素窄时（远处的细长星头），按覆盖比例把亮度摊到落到的像素上
    const cov = Math.min(1, sw) * Math.min(1, sh), sx = Math.max(sw, 1), sy = Math.max(sh, 1);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const dx = xx + 0.5 - pcx, dy = yy + 0.5 - pcy, lx = (dx * ca + dy * sa) / sx + pv[0], ly = (-dx * sa + dy * ca) / sy + pv[1];
      if (lx < 0 || lx >= 1 || ly < 0 || ly >= 1) continue;
      const si = (Math.floor(ly * L.h) * L.w + Math.floor(lx * L.w)) * 3, o = (yy * w + xx) * 3;
      buf[o] += L.d[si] * cov; buf[o + 1] += L.d[si + 1] * cov; buf[o + 2] += L.d[si + 2] * cov;
    }
    alive++; fr[e.def.name] = f;
  }
  const sky = asset.sky === 'sky' ? [0x34, 0x46, 0x6e] : [2, 3, 6], ctx = assetHDR.cv.getContext('2d'), im = ctx.createImageData(w, h), dd = im.data;
  for (let i = 0, n = w * h; i < n; i++) for (let j = 0; j < 3; j++) { const v = buf[i * 3 + j]; dd[i * 4 + j] = Math.min(255, sky[j] + (v > 0 ? Math.round(Math.pow(1 - Math.exp(-4 * v), 1 / 2.2) * 255) : 0)); }
  for (let i = 3; i < dd.length; i += 4) dd[i] = 255;
  ctx.putImageData(im, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.imageSmoothingEnabled = true; g.drawImage(assetHDR.cv, 0, 0, W, H);
  hudText = `${(asset.man.variants || {})[asset.variant] || asset.variant} · 粒子 ${alive} · 线性累加后统一曝光（引擎同款加色）· ${Object.entries(fr).map(([k, v]) => k + (v === '·' ? '' : ' 帧 ' + v)).join(' · ')}`;
}
function assetPanel() {
  const m = asset.man, box = $('#assetInfo');
  if (!m) { box.innerHTML = '<p class="hint">在左栏「迭代区」点一个素材条目；临时看别的结果文件夹用左栏底部的「打开结果文件夹」。</p>'; $('#assetOpts').hidden = true; return; }
  $('#assetOpts').hidden = false;
  box.innerHTML = `<p><b>${m.title || asset.dir}</b></p>${m.note ? `<p class="hint">${m.note}</p>` : ''}<p class="hint">贴图和参数表：仓库 analysis/results/${asset.dir}/（*_Cascade参数.txt）</p>`;
  const vs = $('#assetVar'); vs.innerHTML = '';
  for (const [k, l] of Object.entries(m.variants || { A: 'A' })) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.setAttribute('aria-pressed', String(k === asset.variant));
    b.addEventListener('click', async () => { if (k === asset.variant) return; asset.variant = k; await assetLoadVariant(); }); vs.appendChild(b);
  }
  const el = $('#assetEmit'); el.innerHTML = '';
  for (const e of asset.emit) {
    const n = asset.parts.reduce((s, p) => s + (p.e === e ? 1 : 0), 0);
    const l = document.createElement('label'); l.className = 'check';
    l.innerHTML = `<input type="checkbox" ${asset.on[e.def.name] ? 'checked' : ''}> ${e.def.name}（${n} 颗，${e.tex ? e.tex.frames + ' 帧' : e.def.dot ? '软圆点' : ''}）`;
    l.querySelector('input').addEventListener('change', ev => { asset.on[e.def.name] = ev.target.checked; }); el.appendChild(l);
  }
}
function initAssets() {
  $('#assetOpen').addEventListener('click', () => $('#assetDir').click());
  $('#assetOpen2').addEventListener('click', () => $('#assetDir').click());
  $('#assetDir').addEventListener('change', e => { if (e.target.files.length) { setReview(null); setTab('asset'); assetOpen(e.target.files); } e.target.value = ''; });
  $('#assetCut').addEventListener('change', e => { asset.cutout = e.target.checked; });
  $('#assetSky').addEventListener('change', e => { asset.sky = e.target.checked ? 'sky' : 'black'; });
  assetPanel();
}
