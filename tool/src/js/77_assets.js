// =====================================================================
//  素材页：打开一个结果文件夹（里面有 预览.json + 贴图），按引擎的方式播放
//  帧号曲线 → 取整、不混合；自然色 RGB 直接显示，灰度 RGBA 接力按 Ramp(v) × v × Color Over Life 上色；
//  粒子的出生、位置、速度、阻力、重力、大小、旋转、寿命按清单里的发射器参数（与 Cascade 参数表一致）。
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
// 一个发射器、一套贴图 → 每帧一张小画布
async function assetFrames(tex) {
  const img = await assetImage(asset.files.has(tex.file) ? tex.file : tex.file + '#R'), cw = img.width / tex.cols, ch = img.height / tex.rows, S = ASSET_CELL, per = tex.cols * tex.rows, out = [];
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
    const c = document.createElement('canvas'); c.width = S; c.height = SH; const g = c.getContext('2d'); const id = g.createImageData(S, SH), d = id.data;
    const lut = new Uint8ClampedArray(256 * 3), gm = tex.gamma || 1;
    // tone 'baker'：和烘焙器「导出效果」一样——材质亮度 Ramp(v)·v·颜色·4，显示 1 − e^(−x) 再 gamma 2.2（导出母版用）；否则直接 sRGB（单元贴图用）
    for (let v = 0; v < 256; v++) {
      const x = Math.pow(v / 255, gm), vi = Math.round(x * 255), rc = ramp ? ramp[Math.min(255, vi)] : [1, 1, 1];
      for (let j = 0; j < 3; j++) { const l = rc[j] * x * col[j]; lut[v * 3 + j] = Math.round((tex.tone === 'baker' ? Math.pow(1 - Math.exp(-4 * l), 1 / 2.2) : lin2s(Math.min(1, l))) * 255); }
    }
    for (let y = 0; y < SH; y++) for (let x = 0; x < S; x++) {
      const v = src[(r * SH + y) * W + q * S + x], o = (y * S + x) * 4;
      d[o] = lut[v * 3]; d[o + 1] = lut[v * 3 + 1]; d[o + 2] = lut[v * 3 + 2]; d[o + 3] = 255;
    }
    g.putImageData(id, 0, 0); out.push(c);
  }
  return out;
}
// 按发射器参数生成粒子（与参数表同一套规则；种子固定，每次一样）
function assetSpawn() {
  asset.parts = [];
  for (const e of asset.emit) {
    const rnd = mulberry(e.def.seed || 1), sp = e.def.sphere || { r: 0, vel: 0 };
    for (const [t0, n] of e.def.bursts || [[0, 1]]) for (let i = 0; i < n; i++) {
      let p = [0, 0, 0];
      if (sp.r > 0) {
        const g = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
        p = [g(), g(), g()]; const L = Math.hypot(...p) || 1, R = sp.surface ? sp.r : sp.r * Math.cbrt(rnd()); p = p.map(x => x / L * R);
      }
      const [s0, s1] = e.def.size || [10, 10], [l0, l1] = e.def.life || [2, 2];
      asset.parts.push({ e, t0, p, v: p.map(x => x * (sp.vel || 0)), size: s0 + (s1 - s0) * rnd(), rot: e.def.rot ? rnd() * Math.PI * 2 : 0, life: l0 + (l1 - l0) * rnd() });
    }
  }
}
async function assetLoadVariant() {
  asset.ready = false; busy(true, '准备素材预览…', 0);
  try {
    let i = 0;
    for (const e of asset.emit) {
      const tex = e.def.tex[asset.variant] || e.def.tex[Object.keys(e.def.tex)[0]];
      e.tex = tex; e.frames = await assetFrames(tex);
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
  const t = state.t, pxm = Math.min(W, H) / (asset.man.view || 150); let alive = 0, area = 0; const fr = {};
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, asset.gain);
  for (const b of asset.parts) {
    const e = b.e; if (!asset.on[e.def.name]) continue;
    const age = t - b.t0; if (age < 0 || age >= b.life) continue;
    const k = e.def.drag || 0, s1 = k > 0 ? (1 - Math.exp(-k * age)) / k : age, acc = e.def.accel || [0, 0, 0];
    const gz = k > 0 ? acc[2] / k * (age - s1) : 0.5 * acc[2] * age * age, gx = k > 0 ? acc[0] / k * (age - s1) : 0.5 * acc[0] * age * age;
    const x = b.p[0] + b.v[0] * s1 + gx, z = b.p[2] + b.v[2] * s1 + gz;
    const u = age / b.life, f = Math.max(0, Math.min(e.frames.length - 1, Math.floor(curveAt(e.tex.keys, u))));
    const tx = e.tex, zk = tx.sizeKeys ? (v => Array.isArray(v) ? v[0] : v)(curveAt(tx.sizeKeys, u)) : 1, off = tx.offset || [0, 0];
    const sw = (tx.wh ? tx.wh[0] : b.size) * zk * pxm, sh = (tx.wh ? tx.wh[1] : b.size) * zk * pxm;
    const cx = W / 2 + (x + off[0]) * pxm, cy = H / 2 - (z + off[1]) * pxm;
    g.save(); g.translate(cx, cy); g.rotate(b.rot); g.drawImage(e.frames[f], -sw / 2, -sh / 2, sw, sh);
    if (asset.cutout && e.cut) { g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.18; g.drawImage(e.cut, -sw / 2, -sh / 2, sw, sh); g.globalAlpha = Math.min(1, asset.gain); g.globalCompositeOperation = 'lighter'; }
    g.restore();
    alive++; area += sw * sh; fr[e.def.name] = f;
  }
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  const fs = Object.values(fr); hudText = `${(asset.man.variants || {})[asset.variant] || asset.variant} · 粒子 ${alive} · 帧 ${fs.length ? Math.min(...fs) + (Math.max(...fs) !== Math.min(...fs) ? '–' + Math.max(...fs) : '') : '-'} · 面片合计 ${(area / (W * H) * 100).toFixed(0)}% 画面`;
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
    const n = (e.def.bursts || [[0, 1]]).reduce((s, [, c]) => s + c, 0);
    const l = document.createElement('label'); l.className = 'check';
    l.innerHTML = `<input type="checkbox" ${asset.on[e.def.name] ? 'checked' : ''}> ${e.def.name}（${n} 颗，${e.tex ? e.tex.frames + ' 帧' : ''}）`;
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
