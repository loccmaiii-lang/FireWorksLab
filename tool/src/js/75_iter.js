// =====================================================================
//  迭代：A/B、实拍叠加、数值对比、版本、配方、测速
// =====================================================================
const PARAM_LABEL = (() => {
  const o = { type: '花型', form: '产物', texW: '贴图宽', texH: '贴图高', cols: '列', rows: '行', chans: '通道', outMode: '输出', encGamma: '编码', frameMode: '取帧', engine: '内核', zoom: '面片大小', unitFlip: '星头朝下' };
  for (const s of SCHEMA) for (const it of s.items) { if (Array.isArray(it)) o[it[0]] = typeof it[1] === 'function' ? it[0] : it[1]; else if (it.sel) o[it.sel] = it.label; else if (it.text) o[it.text] = it.label; }
  return o;
})();
const fmtP = v => typeof v === 'number' ? (Number.isInteger(v) ? String(v) : (+v.toFixed(3)).toString()) : String(v);
function diffParams(a, b) {
  const out = [];
  for (const k of Object.keys({ ...a, ...b })) { if (k.startsWith('_')) continue; if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push([k, a[k], b[k]]); }
  return out;
}
function diffM(a, b) { const d = []; if (JSON.stringify(a.stages) !== JSON.stringify(b.stages)) d.push(['颜色分段', a.stages.length + ' 段', b.stages.length + ' 段']); for (const k of ['ramp0', 'ramp1', 'ramp2', 'ramp3', 'headInt', 'tailInt', 'xw']) if (a[k] !== b[k]) d.push([k, a[k], b[k]]); return d; }
const cloneM = M => ({ ...M, stages: M.stages.map(s => [...s]) });
const store = {
  get(k, d) { try { const v = localStorage.getItem('fwb.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('fwb.' + k, JSON.stringify(v)); } catch (e) { } }
};

// ---------------- A/B ----------------
let abCounter = 0;
function abSet() {
  if (!state.bake || state.dirty) { flash('等当前烘焙完成再存 B', true); return; }
  if (state.B) disposeBake(state.B.bake);
  state.B = { P: { ...state.P }, M: cloneM(state.M), bake: state.bake, name: state.name + '（B）', id: 'B' + (++abCounter) };
  state.bake = null; state.dirty = true; state.gen++; runPreviewBake();
  abInfo(); flash('已存为 B：现在改参数就是 A');
}
function abSwap() {
  if (!state.B || !state.bake || state.dirty) { flash('需要 B 且 A 已烘焙完成', true); return; }
  const A = { P: state.P, M: state.M, bake: state.bake, name: state.name };
  state.P = state.B.P; state.M = state.B.M; state.bake = state.B.bake; state.name = state.B.name.replace(/（B）$/, '');
  state.B = { ...A, name: A.name + '（B）', id: 'B' + (++abCounter) };
  state.gen++; state.dirty = false; buildMasterPanel(); showStats(state.bake); afterBake(state.bake); abInfo();
}
function abClear() { if (state.B) { disposeBake(state.B.bake); state.B = null; } abInfo(); }
function abInfo() {
  const B = state.B;
  $('#abInfo').textContent = B ? `B = ${B.name}（${TYPE_NAMES[B.P.type]}）。画面左 A 右 B。` : '还没有 B。';
  if (!B) { $('#abDiff').innerHTML = ''; return; }
  const d = [...diffParams(B.P, state.P), ...diffM(B.M, state.M)];
  $('#abDiff').innerHTML = d.length ? d.map(([k, b, a]) => `${PARAM_LABEL[k] || k}：B ${fmtP(b)} → A ${fmtP(a)}`).join('<br>') : '参数相同';
}

// ---------------- 实拍 / 截图 ----------------
function loadRef(file) {
  const R = state.ref, url = URL.createObjectURL(file);
  if (R.el && R.el.src) URL.revokeObjectURL(R.el.src);
  if (file.type.startsWith('video')) {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    v.addEventListener('loadedmetadata', () => { R.aspect = v.videoWidth / v.videoHeight; buildRefSliders(); });
    R.el = v; R.kind = 'video';
  } else {
    const im = new Image(); im.onload = () => { R.aspect = im.width / im.height; buildRefSliders(); }; im.src = url; R.el = im; R.kind = 'image';
  }
  $('#refName').textContent = file.name; if (!R.mode) setRefMode(1);
}
function setRefMode(m) { state.ref.mode = m; for (const x of $('#refMode').children) x.setAttribute('aria-pressed', String(+x.dataset.rm === m)); }
function buildRefSliders() {
  const R = state.ref, host = $('#refSliders'); host.innerHTML = '';
  if (R.kind === 'video') slider(host, 'r-t0', '开花时刻', 's', 0, Math.max(1, R.el.duration || 30), 0.01, () => R.t0, v => R.t0 = v, 0);
  slider(host, 'r-a', '透明度', '', 0, 1, 0.01, () => R.alpha, v => R.alpha = v, 0.5);
  slider(host, 'r-s', '缩放', '×', 0.2, 4, 0.01, () => R.scale, v => R.scale = v, 1);
  slider(host, 'r-x', '偏移 X', '', -0.6, 0.6, 0.005, () => R.ox, v => R.ox = v, 0);
  slider(host, 'r-y', '偏移 Y', '', -0.6, 0.6, 0.005, () => R.oy, v => R.oy = v, 0);
  slider(host, 'r-w', '卷帘位置', '', 0, 1, 0.01, () => R.wipe, v => R.wipe = v, 0.5);
}

// ---------------- 数值测量对比 ----------------
// 来自 analysis/measure.json（实拍视频逐帧测量，视频秒可能是慢放，只比无量纲指标）
const REFS = {
  V05: { name: 'V05 金芒菊（银白）', t50: 0.157, t80: 0.416, t90: 0.551, droop: -0.002, bt: 1.15, kieguchi: 0.297, burn: 6.17 },
  V14: { name: 'V14 鸿巢四尺玉', diameter: 800, t50: 0.192, t80: 0.446, t90: 0.569, droop: 0.158, bt: 1.58, kieguchi: 0.354, burn: 8.67 },
  V06: { name: 'V06 锦冠', t50: null, t80: 0.419, t90: 0.571, droop: 0.229, bt: 1.38, kieguchi: 0.823, burn: 6.77 },
  V12: { name: 'V12 多色锦冠', t50: 0.109, t80: 0.265, t90: 0.348, droop: 0.171, bt: 1.37, kieguchi: 0.656, burn: 10.07 },
  V11: { name: 'V11 十寸三重芯', t50: 0.185, t80: 0.366, t90: 0.401, droop: null, bt: null, kieguchi: 0.222, burn: 5.87 },
  V01: { name: 'V01 变色菊·红银点灭', t50: 0.19, t80: 0.456, t90: 0.57, droop: 0.294, bt: 2.95, kieguchi: 0.228, burn: 2.63 },
  V02: { name: 'V02 红牡丹带芯', t50: null, t80: 0.109, t90: 0.283, droop: 0.435, bt: 2.54, kieguchi: 0.174, burn: 1.53 },
  V03: { name: 'V03 绿芯变色牡丹', t50: 0.17, t80: 0.443, t90: 0.568, droop: -0.095, bt: 0.88, kieguchi: 0.409, burn: 2.93 },
  V04: { name: 'V04 变色菊·金黄绿', t50: 0.092, t80: 0.237, t90: 0.408, droop: -0.187, bt: 0.73, kieguchi: 0.289, burn: 2.53 }
};
const metricCache = { gen: -1, A: null, Bid: null, B: null };
function simMetrics(P, b) {
  if (familyOf(P.type) !== 'aerial') return null;
  // 大面片母版：直接测烘焙出的贴图（与实拍同口径）；其它产物退回物理量估计
  // 大型礼花在贴图里星点很小，亮部掩码会漏掉外圈：贴图测出的花径明显小于物理花径时，改用物理量
  const fm = measure({ ...P }), ph = metricsOf(P, fm); if (ph) ph.src = '物理';
  const im = bakeMetrics(b); if (im && (!ph || im.diameter > 0.6 * ph.diameter)) { im.src = '贴图'; im.physDiameter = ph ? ph.diameter : null; return im; }
  return ph;
}
function renderMetrics() {
  const host = $('#metricTable'); if (!state.bake) { host.textContent = '等待烘焙…'; return; }
  if (metricCache.gen !== state.gen) { metricCache.A = simMetrics(state.P, state.bake); metricCache.gen = state.gen; }
  if (state.B && metricCache.Bid !== state.B.id) { metricCache.B = simMetrics(state.B.P, state.B.bake); metricCache.Bid = state.B.id; }
  const A = metricCache.A, B = state.B ? metricCache.B : null, R = REFS[state.metricRef];
  if (!A) { host.textContent = '只有空中开花类可以和实拍比较。'; return; }
  const row = (k, lab, d = 3) => {
    const r = R[k], a = A[k], ok = r == null ? '' : Math.abs(a - r) <= Math.max(0.05, Math.abs(r) * 0.2) ? '<span class="ok">✓</span>' : '<span class="warn">✗</span>';
    return `<tr><td>${lab}</td><td>${a == null ? '—' : a.toFixed(d)}</td>${B ? `<td>${B[k] == null ? '—' : B[k].toFixed(d)}</td>` : ''}<td>${r == null ? '—' : r.toFixed(d)}</td><td>${ok}</td></tr>`;
  };
  host.innerHTML = `<table class="mt"><tr><th>指标</th><th>A</th>${B ? '<th>B</th>' : ''}<th>实拍</th><th></th></tr>` +
    row('t50', 't50') + row('t80', 't80') + row('t90', 't90') + row('droop', '下坠/R') + row('bt', '下/上') +
    row('kieguchi', '消え口') +
    `<tr><td>燃烧</td><td>${A.burn.toFixed(2)} s</td>${B ? `<td>${B.burn.toFixed(2)} s</td>` : ''}<td>${R.burn ? R.burn.toFixed(2) + ' s' : '—'}</td><td>${R.burn ? (Math.abs(A.burn - R.burn) <= R.burn * 0.15 ? '<span class="ok">✓</span>' : '<span class="warn">✗</span>') : ''}</td></tr>` +
    `<tr><td>花径</td><td>${A.diameter.toFixed(0)} m</td>${B ? `<td>${B.diameter.toFixed(0)} m</td>` : ''}<td>${R.diameter ? '约 ' + R.diameter + ' m' : '—'}</td><td>${R.diameter ? (Math.abs(A.diameter - R.diameter) <= R.diameter * 0.2 ? '<span class="ok">✓</span>' : '<span class="warn">✗</span>') : ''}</td></tr>` +
    `</table>` +
    `<span class="note">✓ 只表示这一行的指标与实拍差距在 20%（或 0.05）以内，不代表整体已经还原；「—」表示该视频这一项测量不可靠（如 V06、V02 的 t50）。A 的数据来自${A.src === '贴图' ? '烘焙出的贴图（与实拍视频同一套算法）' : '物理模拟的星体位置'}。</span>`;
}

// ---------------- 版本、缩略图、批注 ----------------
let pendingThumb = null;
function thumbFromCanvas() {
  const c = document.createElement('canvas'); c.width = c.height = 132; const x = c.getContext('2d');
  x.drawImage(canvas, 0, 0, 132, 132); return c.toDataURL('image/jpeg', 0.72);
}
function recordVersion(label, note) {
  const prev = state.versions[state.versions.length - 1];
  const v = { n: (prev ? prev.n : 0) + 1, time: new Date().toLocaleString('zh-CN', { hour12: false }), label, note: note || '', name: state.name, P: { ...state.P }, M: cloneM(state.M), thumb: '' };
  v.diff = prev ? [...diffParams(prev.P, v.P), ...diffM(prev.M, v.M)].map(([k, a, b]) => `${PARAM_LABEL[k] || k}：${fmtP(a)} → ${fmtP(b)}`) : ['初始版本'];
  state.versions.push(v); if (state.versions.length > 60) state.versions.shift();
  pendingThumb = url => { v.thumb = url; saveVersions(); renderVersions(); };
  saveVersions(); renderVersions();
  return v;
}
function saveVersions() { store.set('versions', state.versions.slice(-40)); }
function rollback(v) {
  state.P = storedParams(v.P); state.M = normalizeM(v.M, v.P.type); state.name = v.name;
  buildMasterPanel(); onParam(); flash(`已回滚到 v${v.n}`);
}
function renderVersions() {
  const host = $('#verList'); host.innerHTML = '';
  for (const v of [...state.versions].reverse()) {
    const it = document.createElement('div'); it.className = 'it';
    it.innerHTML = `<span title="${v.diff.join('\n').replace(/"/g, '&quot;')}"><b>v${v.n}</b> ${v.label}${v.note ? ' · ' + v.note : ''}<br><small>${v.time} · ${v.diff.length === 1 && v.diff[0] === '初始版本' ? '初始版本' : '改了 ' + v.diff.length + ' 项'}</small></span>`;
    const rb = document.createElement('button'); rb.className = 'x'; rb.textContent = '回滚'; rb.addEventListener('click', () => rollback(v));
    const nt = document.createElement('button'); nt.className = 'x'; nt.textContent = '批注';
    nt.addEventListener('click', () => { const s = prompt(`v${v.n} 的批注`, v.note); if (s != null) { v.note = s; saveVersions(); renderVersions(); } });
    it.append(rb, nt); host.appendChild(it);
  }
  const th = $('#thumbs'); th.innerHTML = '';
  for (const v of [...state.versions].reverse().slice(0, 18)) {
    if (!v.thumb) continue;
    const f = document.createElement('figure'); f.title = `v${v.n} ${v.label}${v.note ? '\n' + v.note : ''}\n点击回滚`;
    f.innerHTML = `<img alt="v${v.n} 缩略图" src="${v.thumb}"><figcaption>v${v.n}${v.note ? ' ✎' : ''}</figcaption>`;
    f.addEventListener('click', () => rollback(v)); th.appendChild(f);
  }
}

// ---------------- 派生配方 ----------------
function resolveRecipe(r, depth = 0) {
  const parent = r.parent && depth < 16 ? state.recipes.find(x => x.name === r.parent) : null;
  const base = parent ? resolveRecipe(parent, depth + 1) : { ...defaultsFor(r.type), P: storedParams({ type: r.type }) };
  const P = { ...base.P, ...r.diff.P }, M = normalizeM({ ...base.M, ...r.diff.M }, r.type);
  return { P, M };
}
let recParent = null;
function saveRecipe(name) {
  name = (name || '').trim() || `${TYPE_EN[state.P.type]}_${state.recipes.length + 1}`;
  const parent = recParent && state.recipes.find(x => x.name === recParent && x.name !== name);
  const base = parent ? resolveRecipe(parent) : defaultsFor(state.P.type);
  const dP = {}, dM = {};
  for (const [k, , b] of diffParams(base.P, state.P)) dP[k] = b;
  dP.renderVer = renderVersion(state.P); // 等于模板默认值时也必须保存。
  for (const k of Object.keys(state.M)) if (JSON.stringify(state.M[k]) !== JSON.stringify(base.M[k])) dM[k] = JSON.parse(JSON.stringify(state.M[k]));
  const r = { name, parent: parent ? parent.name : null, type: state.P.type, diff: { P: dP, M: dM } };
  const i = state.recipes.findIndex(x => x.name === name); if (i >= 0) state.recipes[i] = r; else state.recipes.push(r);
  store.set('recipes', state.recipes); renderRecipes(); flash(`配方「${name}」只记录了 ${Object.keys(dP).length + Object.keys(dM).length} 项差异`);
}
function renderRecipes() {
  const host = $('#recList'); host.innerHTML = '';
  if (!state.recipes.length) { host.innerHTML = '<p class="note">还没有配方。</p>'; return; }
  for (const r of state.recipes) {
    const it = document.createElement('div'); it.className = 'it';
    const n = Object.keys(r.diff.P).length + Object.keys(r.diff.M).length;
    it.innerHTML = `<span title="${Object.entries(r.diff.P).map(([k, v]) => (PARAM_LABEL[k] || k) + ' = ' + fmtP(v)).join('\n')}">${recParent === r.name ? '★ ' : ''}${r.name}<br><small>${r.parent ? '派生自 ' + r.parent : TYPE_NAMES[r.type] + ' 默认值'} · ${n} 项差异</small></span>`;
    const ld = document.createElement('button'); ld.className = 'x'; ld.textContent = '载入';
    ld.addEventListener('click', () => { const { P, M } = resolveRecipe(r); state.P = P; state.M = M; state.name = r.name; recParent = r.name; buildMasterPanel(); onParam(); renderRecipes(); });
    const dv = document.createElement('button'); dv.className = 'x'; dv.textContent = '派生';
    dv.title = '以它为父配方：载入后改参数，再「存为配方」只记差异';
    dv.addEventListener('click', () => { const { P, M } = resolveRecipe(r); state.P = P; state.M = M; recParent = r.name; state.name = r.name + '_派生'; $('#recName').value = state.name; buildMasterPanel(); onParam(); renderRecipes(); });
    const del = document.createElement('button'); del.className = 'x'; del.textContent = '删';
    del.addEventListener('click', () => { if (state.recipes.some(x => x.parent === r.name)) { flash('有子配方依赖它，先删子配方', true); return; } state.recipes = state.recipes.filter(x => x !== r); if (recParent === r.name) recParent = null; store.set('recipes', state.recipes); renderRecipes(); });
    it.append(ld, dv, del); host.appendChild(it);
  }
}

// ---------------- 显卡测速 ----------------
const perf = { acc: 0, n: 0, fps: 0 };
function perfTick(dt) { perf.acc += dt; perf.n++; if (perf.acc > 1) { perf.fps = perf.n / perf.acc; perf.acc = 0; perf.n = 0; } }
async function runPerf() {
  const out = $('#perfOut'); out.textContent = '测试中…（约 20 秒，期间画面会卡）';
  // 先实测 1.5 秒的预览帧率
  const fps = await new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); });
  perf.fps = fps;
  const lines = [`显卡：${$('#gpu').title || $('#gpu').textContent}`, `当前预览帧率：${perf.fps.toFixed(0)} fps（${canvas.width}² 画布）`];
  const t = new Target(1024, 1024, gl.RGBA16F), view = [0, 0, 150, 150], ppm = 1024 / 300;
  try {
    for (const target of [30000, 100000, 300000, 1000000, 3000000]) {
      const P = { ...defaultsFor('kiku').P, stars: 300, burn: 2.5, sparkLife: 0.8, duration: 3 };
      P.sparkRate = Math.max(1, Math.round(target / (P.stars * P.sparkLife)));
      const tr = buildTrack(P); t.clear(); t.bind(); additive(true);
      drawSparksGPU(tr, 1.5, view, ppm, [0, 1, 0, 0], 1, 0); gl.finish();
      const t0 = performance.now(); const K = 8;
      for (let i = 0; i < K; i++) drawSparksGPU(tr, 1.2 + i * 0.05, view, ppm, [0, 1, 0, 0], 1, i);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, new Float32Array(4));
      const ms = (performance.now() - t0) / K; additive(false);
      const alive = Math.round(P.stars * P.sparkRate * P.sparkLife);
      lines.push(`同屏约 ${alive.toLocaleString()} 颗火花：${ms.toFixed(2)} ms/帧（≈ ${(1000 / Math.max(ms, 0.01)).toFixed(0)} fps 上限）`);
      disposeTrack(tr); out.innerHTML = lines.join('<br>'); await nextTick();
    }
    const t0 = performance.now(); const b = await bake({ ...state.P }, 1, null); const ms = performance.now() - t0; disposeBake(b);
    lines.push(`当前母版 ${state.P.texW}×${state.P.texH} 完整烘焙：${(ms / 1000).toFixed(2)} s`);
  } catch (e) { lines.push('出错：' + e.message); }
  t.dispose(); out.innerHTML = lines.join('<br>');
}

// 每次烘焙完成
function afterBake(b) {
  if (state.tab === 'iter') renderMetrics(); else metricCache.gen = -1;
  abInfo();
}
function initIter() {
  state.versions = store.get('versions', []); state.recipes = store.get('recipes', []);
  const rs = $('#refMetric'); for (const [k, v] of Object.entries(REFS)) rs.add(new Option(v.name, k)); rs.value = state.metricRef;
  rs.addEventListener('change', () => { state.metricRef = rs.value; renderMetrics(); });
  $('#abSet').addEventListener('click', abSet); $('#abSwap').addEventListener('click', abSwap); $('#abClear').addEventListener('click', abClear);
  $('#refLoad').addEventListener('click', () => $('#refFile').click());
  $('#refFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) loadRef(f); e.target.value = ''; });
  $('#refMode').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setRefMode(+b.dataset.rm); });
  buildRefSliders();
  $('#verSave').addEventListener('click', () => { recordVersion('手动存档', $('#verNote').value); $('#verNote').value = ''; flash('已存版本'); });
  $('#verExport').addEventListener('click', () => download(new Blob([JSON.stringify({ tool: '烟花母版烘焙器 ' + VERSION, versions: state.versions }, null, 2)], { type: 'application/json' }), `${safeName()}_版本.json`));
  $('#verImport').addEventListener('click', () => $('#verFile').click());
  $('#verFile').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()); state.versions = (j.versions || []).concat(); saveVersions(); renderVersions(); flash('已导入版本'); } catch (err) { flash('导入失败', true); } e.target.value = ''; });
  $('#recSave').addEventListener('click', () => saveRecipe($('#recName').value));
  $('#recExport').addEventListener('click', () => download(new Blob([JSON.stringify({ tool: '烟花母版烘焙器 ' + VERSION, recipes: state.recipes }, null, 2)], { type: 'application/json' }), '配方库.json'));
  $('#recImport').addEventListener('click', () => $('#recFile').click());
  $('#recFile').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()); for (const r of j.recipes || []) { const i = state.recipes.findIndex(x => x.name === r.name); if (i >= 0) state.recipes[i] = r; else state.recipes.push(r); } store.set('recipes', state.recipes); renderRecipes(); flash('已导入配方'); } catch (err) { flash('导入失败', true); } e.target.value = ''; });
  $('#perfRun').addEventListener('click', runPerf);
  renderVersions(); renderRecipes(); abInfo();
}
