// =====================================================================
//  状态与界面
// =====================================================================
const state = {
  tab: 'master', view: 'live', atlasLayer: 'head', atlasSeg: -1,
  ...defaultsFor('kiku'), name: 'Kiku_01',
  t: 0, playing: true, speed: 1, expo: 1, disp: 'game', dist: 1000, exportResolution: true, platform: 'pc',
  bake: null, baking: false, rebake: false, dirty: true, gen: 0,
  bakeGen: null, failedGen: -1, bakeError: null,
  lib: [], layers: [], comboName: '八重芯变色菊', libReady: false,
  locks: new Set(), activeStage: 0, repId: null,
  B: null,                              // A/B 对比的 B：{ P, M, bake, name }
  ref: { mode: 0, el: null, kind: '', t0: 0, alpha: 0.5, scale: 1, ox: 0, oy: 0, wipe: 0.5, aspect: 1, tex: null },
  versions: [], recipes: [], metricRef: 'V05',
  comboSel: -1, layerView: { solo: -1, mute: [] }   // 多层效果：正在调哪一层（-1 = 整体）；独看 / 静音只影响观察
};
const live = { sim: null, gen: -1, track: null, tgen: -1, tw: 0, E: null, egen: -1, simB: null, trackB: null, EB: null, genB: -1 };
let hdrT = null, rgT = null;

function busy(on, text, p) {
  $('#busy').hidden = !on;
  if (on) { if (text) $('#busyText').textContent = text; if (p != null) $('#busyBar').style.width = Math.round(p * 100) + '%'; }
}
let flashTimer = 0;
function flash(msg, bad) { const s = $('#status'); s.textContent = msg; s.className = bad ? '' : 'on'; clearTimeout(flashTimer); flashTimer = setTimeout(() => { s.textContent = ''; s.className = ''; }, 3500); }
function setStatus(msg) { const s = $('#status'); s.textContent = msg; s.className = msg ? 'on' : ''; }

// 上升类的序列时长跟随到顶时间
function derive(P) {
  // 紧凑取景已禁用（2026-09-29 引擎实测会抖，spec/pipeline_v1.md）：旧配方里的 tight 一律按 Zoom 处理
  if (P.zoom === 'tight') P.zoom = 'on';
  if (familyOf(P.type) === 'rise' && P.form === 'phys') { P.duration = +(P.phT + 3.5).toFixed(2); return P; }
  if (familyOf(P.type) === 'rise' && P.form === 'emitset') { P.duration = rtDuration(P); return P; }
  if (familyOf(P.type) === 'rise') P.duration = P.form === 'trail' ? +(riseInfo(P).ta + 64 / 20 + 0.3).toFixed(2) : +(riseInfo(P).ta + 1.2).toFixed(2);
  if (familyOf(P.type) === 'ground') P.duration = P.loopT;
  return P;
}
// 预览烘焙（调参后自动）
let bakeTimer = 0;
function scheduleBake() { clearTimeout(bakeTimer); bakeTimer = setTimeout(runPreviewBake, 380); }
async function runPreviewBake() {
  clearTimeout(bakeTimer);
  if (state.tab === 'combo' && state.comboSel >= 0) return runLayerBake();
  if (state.baking) { state.rebake = true; return; }
  if (!state.dirty || state.failedGen === state.gen) return;
  state.baking = true; state.rebake = false;
  const gen = state.gen, P = structuredClone(state.P); let pending=null;
  try {
    const phys = isPhys(P);
    const b = pending = phys ? physBake(P) : await bake(P, 1, p => {
      if (gen === state.gen) setStatus(`预览烘焙… ${Math.round(p * 100)}%`);
    });
    if(!phys && state.platform==='mobile' && gen===state.gen)b.mobile=await bakeMobileFor(b,p=>{
      if(gen===state.gen)setStatus(`手机独立烘焙… ${Math.round(p*100)}%`);
    });
    // 旧任务连贴图 / 统计 / 缩略图也不能发布，且必须释放其显卡资源。
    if (gen !== state.gen) { disposeBake(b); pending=null; return; }
    disposeBake(state.bake); state.bake = b; state.bakeGen = gen; pending=null;
    state.dirty = false; state.failedGen = -1; state.bakeError = null; syncBakeError();
    if (phys) $('#stats').innerHTML = physStats(P);
    else { showStats(b); afterBake(b); }
    // 自动选格子改了列 × 行：同步到界面（帧数不变，不触发重烘）
    if (!phys && (b.meta.L.cols !== state.P.cols || b.meta.L.rows !== state.P.rows)) { state.P.cols = b.meta.L.cols; state.P.rows = b.meta.L.rows; syncExport(); }
    setStatus('');
  } catch (e) {
    if(pending)disposeBake(pending);
    console.error(e);
    if (gen === state.gen) {
      state.dirty = true; state.failedGen = gen;
      state.bakeError = { gen, message: e.message || String(e) };
      $('#stats').textContent = '最新参数烘焙失败；修改参数或点击重试。';
      setStatus(''); syncBakeError();
    }
  } finally {
    state.baking = false; state.rebake = false;
    if (state.dirty && state.failedGen !== state.gen) runPreviewBake();
  }
}
// 多层效果里调某一层（2026-10-02 用户 07:43）：state.P 就是这一层的参数（组合库条目 e.P），改了只重烘这一层；
// 画面一直是整朵（实时模拟按 e.P 现算，引擎回放 / 贴图用新烘的 e.bake）。调过的层记进 state.layerEdits，换版本 / 保存时用。
async function runLayerBake() {
  const i = state.comboSel, L = state.layers[i], e = L && state.lib.find(x => x.name === L.lib);
  if (!e) return;
  if (state.baking) { state.rebake = true; return; }
  if (!state.dirty || state.failedGen === state.gen) return;
  state.baking = true; state.rebake = false;
  const gen = state.gen; let pending = null;
  e.rev = (e.rev || 0) + 1;            // 实时模拟马上按新参数重算
  try {
    const b = pending = await bake(libP(e.P, true), 1, p => { if (gen === state.gen) setStatus(`重烘第 ${i + 1} 层… ${Math.round(p * 100)}%`); });
    if (gen !== state.gen || state.comboSel !== i || state.tab !== 'combo') { disposeBake(b); pending = null; return; }
    disposeBake(e.bake); e.bake = b; pending = null;
    if (e.rep) { state.layerEdits = state.layerEdits || {}; state.layerEdits[e.rep] = { P: e.P, M: e.M }; e.editSig = JSON.stringify([e.P, e.M]); }
    state.dirty = false; state.failedGen = -1; state.bakeError = null; syncBakeError();
    showStats(b); setStatus('');
    await syncLinkedLayers(i);
    if (state.platform === 'mobile') await ensureComboMobile();
    if (typeof buildLayerCard === 'function') buildLayerCard();
  } catch (err) {
    if (pending) disposeBake(pending);
    console.error(err);
    if (gen === state.gen) { state.dirty = true; state.failedGen = gen; state.bakeError = { gen, message: err.message || String(err) }; $('#stats').textContent = '这一层的新参数烘焙失败；修改参数或点击重试。'; setStatus(''); syncBakeError(); }
  } finally {
    state.baking = false; state.rebake = false;
    if (state.dirty && state.failedGen !== state.gen) runPreviewBake();
  }
}
// 同一批星（种子、星数、初速、终端速度都一样）的层：决定轨迹的参数改一处、几层一起变（用户 2026-10-02 13:09：两层共用的参数要两层一起改，以前没有联动）
const LINK_KEYS = ['seed', 'stars', 'v0', 'vt', 'grav', 'speedJit', 'dirJit', 'burstR0', 'pattern', 'tilt', 'ringFrac', 'wind', 'turb', 'turbScale', 'massLoss', 'shellVx', 'shellVy', 'shellSpin', 'shellNo'];
function computeLinks() {
  const g = new Map(); state.links = [];
  state.layers.forEach((L, i) => { const e = state.lib.find(x => x.name === L.lib); if (!e || familyOf(e.P.type) !== 'aerial') return; const k = [e.P.seed, e.P.stars, e.P.v0, e.P.vt].join('|'); if (!g.has(k)) g.set(k, []); g.get(k).push(i); });
  for (const arr of g.values()) if (arr.length > 1) state.links.push(arr);
}
const linkedWith = i => ((state.links || []).find(a => a.includes(i)) || []).filter(j => j !== i);
async function syncLinkedLayers(i) {
  if (state.linkOff) return;
  const e = state.lib.find(x => x.name === state.layers[i].lib), done = [];
  for (const j of linkedWith(i)) {
    const e2 = state.lib.find(x => x.name === state.layers[j].lib); if (!e2 || e2 === e) continue;
    const diff = LINK_KEYS.filter(k => e.P[k] !== undefined && JSON.stringify(e.P[k]) !== JSON.stringify(e2.P[k]));
    if (!diff.length) continue;
    for (const k of diff) e2.P[k] = structuredClone(e.P[k]);
    e2.rev = (e2.rev || 0) + 1;
    try { const b = await bake(libP(e2.P, true), 1, p => setStatus(`联动：重烘第 ${j + 1} 层 ${Math.round(p * 100)}%`)); disposeBake(e2.bake); e2.bake = b; } catch (err) { flash('联动重烘失败：' + err.message, true); }
    if (e2.rep) { state.layerEdits = state.layerEdits || {}; state.layerEdits[e2.rep] = { P: e2.P, M: e2.M }; e2.editSig = JSON.stringify([e2.P, e2.M]); }
    done.push(`第 ${j + 1} 层（${diff.join('、')}）`);
  }
  setStatus(''); if (done.length) flash('联动：同步了 ' + done.join('；'));
}
function syncBakeError() {
  const e = state.bakeError; $('#bakeError').hidden = !e;
  if (!e) return;
  const shown = state.bake ? `当前保留的是 v${state.bakeGen == null ? '?' : state.bakeGen} 的烘焙` : '当前没有可用的烘焙';
  $('#bakeErrorText').textContent = `${shown}。${e.gen === state.gen ? '最新参数' : '此前参数 v' + e.gen}烘焙失败：${e.message}${e.gen !== state.gen ? '；正在尝试新参数。' : ''}`;
}
function retryPreviewBake() {
  if (state.baking) return;
  state.failedGen = -1; state.dirty = true; runPreviewBake();
}
function onParam() { derive(state.P); state.gen++; state.dirty = true; $('#stats').textContent = '烘焙中…'; syncBakeError(); scheduleBake(); refreshVisibility(); }
function showStats(b) {
  if (b.form === 'emitset') { $('#stats').innerHTML = rtStatsHTML(b); return; }
  const m = b.meta, L = m.L, P = b.P, cls = ok => ok ? 'ok' : 'warn', c = m.check || {};
  const parts=bakeParts(b),totalFrames=parts.reduce((n,s)=>n+s.meta.L.F,0);
  const nTex = parts.reduce((n,s)=>n+(s.tail?2:1),0), mb = (P.texW * P.texH * nTex / 1048576).toFixed(1);
  const rows = [];
  rows.push(`${FORM_NAMES[b.form]} · 共 <b>${totalFrames}</b> 帧${b.next ? ' · '+parts.length+' 段' : ''} · 单格 <b>${+L.cellW.toFixed(1)}×${+L.cellH.toFixed(1)}</b>${L.cellW % 1 ? '（不是整数像素：格子边界落在像素中间，格子四周有留空，引擎里确认一次不串格）' : ''} · ${L.chans === 4 ? 'RGBA 接力' : '单通道'}`);
  if (m.loop) rows.push(`循环周期 <b>${m.duration.toFixed(2)} s</b> · ${m.avgFps.toFixed(1)} fps · 接缝 <span class="${cls(c.seam == null || c.seam < 1.6)}">${c.seam == null ? '—' : c.seam.toFixed(2)}</span>（≈1 无缝）`);
  else if (m.budget) rows.push((m.budget.fps ? `帧预算 · 开花段 <b>${m.budget.fps[0]}</b> / 燃烧段 <b>${m.budget.fps[1]}</b> / 淡出段 <b>${m.budget.fps[2]}</b> fps（淡出从 ${m.budget.fadeAt.toFixed(2)} s）` : `帧预算 · ${m.budget.mode === 'full' ? '全程 30 fps' : '按运动分配'} · 每帧停 <b>${m.budget.holdMin}–${m.budget.holdMax}</b> 个 tick（${(30 / m.budget.holdMin).toFixed(0)}–${(30 / m.budget.holdMax).toFixed(1)} fps）· 共 <b>${m.budget.pages}</b> 张`) + `${isFinite(m.budget.strobeFrom)?` · 点灭期间 ${m.budget.strobeFps} fps`:''} · 燃烧段最低 <span class="${cls(m.minFps >= 12)}">${m.minFps.toFixed(1)} fps</span> · 每帧最大位移 <span class="${cls(m.maxDisp <= 6)}">${m.maxDisp.toFixed(1)} px</span>`);
  else rows.push(`平均 <b>${m.avgFps.toFixed(1)}</b> fps · 最低 <span class="${cls(m.minFps >= 24)}">${m.minFps.toFixed(1)} fps</span> · 每帧最大位移 <span class="${cls(m.maxDisp <= 3)}">${m.maxDisp.toFixed(1)} px</span>`);
  rows.push(`精灵 ${m.Ww.toFixed(1)}×${m.Wh.toFixed(1)} m · 贴图 ${nTex} 张 · BC7 约 ${mb} MB`);
  if (b.form === 'master' || b.form === 'segments') rows.push(`平均面片面积 <b>${Math.round(m.area * 100)}%</b>${m.tight ? '（紧凑取景）' : m.zoom ? '（随开花放大）' : '（固定大小）'}${b.next ? ` · 分段时刻 ${parts.slice(1).map(s=>s.meta.t0.toFixed(2)).join(' / ')} s` : ''}`);
  const fl = []; for (let s = b; s; s = s.next) if (s.meta.fill) fl.push(s.meta.fill);
  if (fl.length) { const avg = fl.reduce((a, q) => a + q.avg, 0) / fl.length, p10 = Math.min(...fl.map(q => q.p10)), mn = Math.min(...fl.map(q => q.min));
    rows.push(`画面占比${m.unit ? '（单元序列星头固定在锚点，以 overdraw 为准）' : ''} 平均 <span class="${cls(avg >= 0.9 || m.unit)}">${Math.round(avg * 100)}%</span> · 最差 10% 的帧 ≥ <span class="${cls(p10 >= 0.85)}">${Math.round(p10 * 100)}%</span> · 最低 ${Math.round(mn * 100)}%`); }
  if (m.unit) { const f = m.fit, R = f.v0 / f.k * (1 - Math.exp(-f.k * m.duration)), ua = P.stars * m.Ww * m.Wh * m.area, ba = (2 * R + m.Wh) ** 2;
    rows.push(`轨迹拟合：初速 ${f.v0.toFixed(0)} m/s · 阻力 ${f.k.toFixed(3)} · 误差 <span class="${cls(f.err < 0.05)}">${(f.err * 100).toFixed(1)}%</span>`);
    rows.push(`overdraw：${P.stars} 个单元 ≈ 大面片的 <span class="${cls(ua < ba)}">${Math.round(ua / ba * 100)}%</span>`); }
  if (m.trail) { rows.push(`弹道：${m.fit.v0.toFixed(0)} m/s（线性拟合）· ${m.T.toFixed(2)} s 到 ${m.fit.H.toFixed(0)} m · 上升结束播到循环第 ${m.fEnd} 帧`);
    rows.push(`消散：30 fps ${(64 / 30).toFixed(2)} s / 20 fps ${(64 / 20).toFixed(2)} s · 接力差值 <span class="${cls(Math.max(...m.relay) < 0.5)}">${m.relay.join(' / ')}</span>（0 = 逐像素一致） · 尾迹长 ${m.trailLen.toFixed(1)} m · 引擎亮度 ×${P.trBright}`); }
  if (m.riseLoop) rows.push(`弹道：${m.ri.v0.toFixed(0)} m/s 出膛 · ${m.fit.T.toFixed(2)} s 到 ${m.fit.H.toFixed(0)} m · 拟合误差 ${(m.fit.err * 100).toFixed(1)}%`);
  rows.push(`模拟内核 ${P.engine === 'gpu' ? 'GPU · 火花 ' + (m.sparkSlots || 0).toLocaleString() + ' 颗' : 'CPU'} · 烘焙 ${(m.bakeMs / 1000).toFixed(1)} s`);
  const warn = [];
  if (c.clipFrames && c.clipFrames.length) warn.push(`${c.clipFrames.length} 帧过曝`);
  if (c.edgeFrames && c.edgeFrames.length) warn.push(`${c.edgeFrames.length} 帧碰到格子边缘`);
  if (c.chanUse && c.chanUse.some(u => !u)) warn.push('有空通道');
  if (m.darkTail > L.F * 0.05) warn.push(`末尾 ${m.darkTail} 帧全黑，可缩短到 ${m.times[L.F - m.darkTail].toFixed(2)} s`);
  if (c.similar > L.F * 0.15 && !m.loop) warn.push(`${c.similar} 对近似帧（可改「按画面变化」取帧）`);
  rows.push(warn.length ? `<span class="warn">自检：${warn.join('；')}</span>` : '<span class="ok">自检：过曝、边缘、通道布局都正常</span>');
  $('#stats').innerHTML = rows.join('<br>');
}
const GRID_OPTS = [1, 2, 4, 8, 16, 32];
function formOptions(P) {
  const fam = familyOf(P.type);
  if (fam === 'ground') return [['loop', '地面循环（周期性烘焙，首尾无缝）']];
  if (fam === 'rise' && P.form === 'phys') return [['phys', '实时物理模拟（贴图用 trail_phys_bake.py 导出）']];
  if (fam === 'rise') return [['emitset', '循环层 + 粒子发射器（星头白热段循环 + GPU 火星，4.1）'], ['trail', '尾缀序列（循环 + 消散，速度朝向）'], ['unit', '星头循环 + 弹道与火花发射器参数'], ['master', '整段上升序列（大面片）']];
  const o = [['master', '大面片母版'], ['segments', renderVersion(P)>=40?'分段母版（按实际帧数分配贴图）':'分段母版（开花段 + 下垂段两张贴图）']];
  if (unitAllowed(P)) o.push(['unit', '单元序列（每颗星一个粒子，省 overdraw）']);
  return o;
}
const FORM_NOTES = {
  master: '整朵花烘成一张序列，一个面片播放。远景、大型礼花的主层。',
  segments: '长时花型（锦冠、柳）帧数不够时，把开花段和下垂段分成两张贴图、两个发射器，各自分配帧数。',
  unit: '贴图里只有一颗星的星头和拖尾（沿速度方向），Cascade 按拟合的轨迹发射每颗星。菊类最省 overdraw。',
  loop: '周期内的火花按周期性编号生成，最后一帧直接接回第一帧。Cascade 里 Emitter Loops = 0 无限循环。',
  emitset: '循环层 + 粒子发射器：星头和白热段烘成一个速度朝向的循环面片（开花后换贴图动态消散），火星、落火、烟带是 Cascade 软圆点发射器（PC GPU / 手机 CPU），每颗自己的寿命、错落熄灭；出生位置和初速按弹道曲线。',
  trail: '升空尾缀：星头 + 尾迹整条烘进细长面片（速度朝向）。循环 64 帧真循环；开花后换消散序列（30 fps / 20 fps 两个版本），第 0 帧就是上升结束那一帧。'
};
function syncExport() {
  const P = state.P;
  for (const id of ['x-cols', 'x-rows']) { const el = $('#' + id); if (!el.options.length) for (const n of GRID_OPTS) el.add(new Option(n, n)); }
  const fs = $('#x-form'); fs.innerHTML = ''; for (const [v, l] of formOptions(P)) fs.add(new Option(l, v));
  if (![...fs.options].some(o => o.value === P.form)) P.form = fs.options[0].value;
  fs.value = P.form;
  const k = bakeKind(P);
  $('#formNote').textContent = FORM_NOTES[k === 'riseLoop' ? 'unit' : k] + (k === 'riseLoop' ? ' 上升：贴图是弹体随体坐标里的星头与尾迹循环，弹道和尾迹火花由 Cascade 发射器完成。' : '');
  $('#x-size').value = `${P.texW}x${P.texH}`; $('#x-cols').value = P.cols; $('#x-rows').value = P.rows;
  $('#x-chans').value = P.chans; $('#x-out').value = P.outMode; $('#x-enc').value = P.encGamma; $('#x-frame').value = P.frameMode; $('#x-zoom').value = P.zoom; $('#x-engine').value = P.engine;
  $('#x-flip').checked = !!P.unitFlip; $('#flipBox').hidden = !(k === 'unit' || k === 'riseLoop');
  $('#x-autogrid').checked = !!P.autoGrid; $('#gridBox').hidden = k === 'master' || k === 'segments';
  $('#x-zoom').disabled = k !== 'master' && k !== 'segments'; $('#x-frame').disabled = k === 'loop' || k === 'riseLoop';
  const tickPlan=usesTickPlan40(P);$('#x-frame').querySelector('[value="tick30"]').hidden=!tickPlan;
  if(tickPlan){$('#x-frame').value='tick30';$('#x-frame').disabled=true;}
  $('#btnVariants').disabled = k !== 'master';
}

function fmtV(v, step) { const d = step >= 1 ? 0 : step >= 0.1 ? 1 : 2; return (+v).toFixed(d); }
function slider(host, id, label, unit, min, max, step, get, set, def, lockKey) {
  const row = document.createElement('div'); row.className = 'sl' + (lockKey ? '' : ' nolock');
  row.innerHTML = (lockKey ? `<button class="lk" type="button" title="锁定：切换号数、随机微调时不变" aria-label="锁定 ${label}" aria-pressed="false">●</button>` : '') +
    `<label class="k" for="${id}" title="${label}${unit ? '（' + unit + '）' : ''}；双击恢复默认">${label}${unit ? `<small>${unit}</small>` : ''}</label>` +
    `<input type="range" id="${id}" min="${min}" max="${max}" step="${step}"><input class="num" type="number" step="${step}" aria-label="${label} 数值">`;
  const inp = row.querySelector('input[type=range]'), num = row.querySelector('.num');
  const show = () => { num.value = fmtV(get(), step); };
  inp.value = get(); show();
  inp.addEventListener('input', () => { set(+inp.value); show(); });
  // 数值框：可以直接输入，允许超出滑杆范围（滑杆停在两端）
  num.addEventListener('change', () => { const v = parseFloat(num.value); if (!isFinite(v)) { show(); return; } set(v); inp.value = v; show(); });
  num.addEventListener('keydown', e => { if (e.key === 'Enter') num.blur(); });
  row.querySelector('.k').addEventListener('dblclick', () => { if (def == null) return; set(def); inp.value = def; show(); });
  if (lockKey) {
    const lk = row.querySelector('.lk'), upd = () => { const on = state.locks.has(lockKey); lk.setAttribute('aria-pressed', String(on)); row.classList.toggle('locked', on); };
    lk.addEventListener('click', () => { state.locks.has(lockKey) ? state.locks.delete(lockKey) : state.locks.add(lockKey); upd(); }); upd();
  }
  row._refresh = () => { inp.value = get(); show(); };
  host.appendChild(row); return row;
}
function colorPair(host, label, keys, obj, onChange) {
  const k = document.createElement('span'); k.textContent = label; k.style.fontSize = '12.5px';
  const d = document.createElement('div'); d.className = 'pair';
  keys.forEach(([key, cap], i) => {
    if (i) d.appendChild(Object.assign(document.createElement('span'), { textContent: '→' }));
    const c = document.createElement('input'); c.type = 'color'; c.value = obj[key]; c.title = cap; c.setAttribute('aria-label', label + ' ' + cap);
    c.addEventListener('input', () => { obj[key] = c.value; onChange && onChange(); }); d.appendChild(c);
  });
  host.append(k, d);
}
// 分段变色编辑器：最多 5 段；点焰色预设给当前选中的段上色
function stageEditor(host, M, maxT, onChange, compact) {
  host.innerHTML = '';
  const redraw = () => stageEditor(host, M, maxT, onChange, compact);
  M.stages.forEach((s, i) => {
    const row = document.createElement('div'); row.className = 'stage-row';
    const sel = document.createElement('input'); sel.type = 'radio'; sel.name = compact ? 'stg-' + compact : 'stg'; sel.checked = state.activeStage === i && !compact; sel.title = '选中后点焰色预设上色';
    sel.addEventListener('change', () => { state.activeStage = i; });
    const c = document.createElement('input'); c.type = 'color'; c.value = s[1]; c.setAttribute('aria-label', `第 ${i + 1} 段颜色`);
    c.addEventListener('input', () => { s[1] = c.value; onChange && onChange(); });
    const r = document.createElement('input'); r.type = 'range'; r.min = 0; r.max = maxT; r.step = 0.01; r.value = s[0]; r.disabled = i === 0; r.setAttribute('aria-label', `第 ${i + 1} 段开始时刻`);
    const o = document.createElement('output'); o.textContent = i === 0 ? '0 s 起' : s[0].toFixed(2) + ' s';
    r.addEventListener('input', () => { s[0] = +r.value; o.textContent = s[0].toFixed(2) + ' s'; onChange && onChange(); });
    r.addEventListener('change', () => { M.stages.sort((a, b) => a[0] - b[0]); redraw(); });
    const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.title = '删除这一段'; x.disabled = i === 0;
    x.addEventListener('click', () => { M.stages.splice(i, 1); state.activeStage = 0; redraw(); onChange && onChange(); });
    row.append(sel, c, r, o, x); host.appendChild(row);
  });
  const line = document.createElement('div'); line.className = 'line2';
  const add = document.createElement('button'); add.className = 'btn ghost'; add.textContent = '+ 加一段'; add.disabled = M.stages.length >= 5;
  add.addEventListener('click', () => { const last = M.stages[M.stages.length - 1]; M.stages.push([Math.min(maxT, last[0] + 0.5), last[1]]); state.activeStage = M.stages.length - 1; redraw(); onChange && onChange(); });
  const ign = document.createElement('button'); ign.className = 'btn ghost'; ign.textContent = '开头加点火橙色';
  ign.title = '实拍里几乎所有星开头都有一段约 10–17% 燃烧时长的橙色点火期';
  ign.disabled = M.stages.length >= 5 || M.stages[0][1].toLowerCase() === IGNITE_ORANGE;
  ign.addEventListener('click', () => { const tb = Math.max(0.15, (state.P.burn || 2) * 0.13); M.stages.forEach(s => { if (s[0] < tb) s[0] = tb; }); M.stages.unshift([0, IGNITE_ORANGE]); redraw(); onChange && onChange(); });
  line.append(add, ign); host.appendChild(line);
}
function flameChips(host, getM, onChange) {
  host.innerHTML = '';
  for (const [nm, col] of FLAME) {
    const b = document.createElement('button'); b.className = 'chip'; b.type = 'button'; b.innerHTML = `<i style="background:${col}"></i>${nm}`;
    b.addEventListener('click', () => { const M = getM(), i = Math.min(state.activeStage, M.stages.length - 1); M.stages[i][1] = col; onChange && onChange(); });
    host.appendChild(b);
  }
}

// ---------------- 参数面板 ----------------
let panelRows = [];
function itemVisible(it, P) { const f = Array.isArray(it) ? it[6] : it.show; return !f || f(P); }
function buildMasterPanel() {
  const P = state.P, D = defaultsFor(P.type, renderVersion(P)).P;
  const host = $('#params'); host.innerHTML = ''; panelRows = [];
  for (const sec of SCHEMA) {
    const det = document.createElement('details'); det.className = 'sec'; det.open = !['物理扰动', '星效果', '规格'].includes(sec.sec) || sec.sec === '规格';
    det.innerHTML = `<summary>${sec.sec}</summary>` + (sec.hint ? `<p class="hint">${sec.hint}</p>` : '');
    for (const it of sec.items) {
      let row;
      if (Array.isArray(it)) {
        const [k, label, unit, min, max, step] = it, lab = typeof label === 'function' ? label(P) : label;
        row = slider(det, 'p-' + k + '-' + panelRows.length, lab, unit, min, max, step, () => state.P[k], v => { state.P[k] = v; onParam(); }, D[k], k);
      } else if (it.sel) {
        row = document.createElement('label'); row.className = 'field';
        row.innerHTML = `${it.label}<select></select>` + (it.hint ? `<span class="note">${it.hint}</span>` : '');
        const s = row.querySelector('select'); for (const [v, l] of it.options) s.add(new Option(l, v));
        s.value = String(P[it.sel]);
        s.addEventListener('change', () => {
          const v = typeof D[it.sel] === 'number' ? +s.value : s.value;
          if (it.sel === 'shellNo') { applyShellLocked(v); buildMasterPanel(); onParam(); return; }
          state.P[it.sel] = v; onParam();
        });
        row._refresh = () => { s.value = String(state.P[it.sel]); };
        det.appendChild(row);
      } else if (it.text) {
        row = document.createElement('label'); row.className = 'field'; row.innerHTML = `${it.label}<input type="text" maxlength="6">`;
        const inp = row.querySelector('input'); inp.value = P[it.text];
        inp.addEventListener('change', () => { state.P[it.text] = inp.value || '祭'; onParam(); });
        row._refresh = () => { inp.value = state.P[it.text]; };
        det.appendChild(row);
      }
      panelRows.push([row, it, sec, det]);
    }
    det._sec = sec; host.appendChild(det);
  }
  refreshVisibility();
  const MD = defaultsFor(P.type).M;
  const redrawColors = () => { stageEditor($('#stages'), state.M, Math.max(1, Math.ceil(state.P.duration)), null); };
  redrawColors();
  flameChips($('#flames'), () => state.M, redrawColors);
  const mc = $('#matColors'); mc.innerHTML = '';
  colorPair(mc, '渐变图', [['ramp0', '暗'], ['ramp1', '中暗'], ['ramp2', '中亮'], ['ramp3', '亮']], state.M);
  const ms = $('#matSliders'); ms.innerHTML = '';
  slider(ms, 'm-xw', '变色过渡', 's', 0.01, 0.5, 0.01, () => state.M.xw, v => state.M.xw = v, MD.xw);
  slider(ms, 'm-hi', '星头亮度', '×', 0, 4, 0.05, () => state.M.headInt, v => state.M.headInt = v, 1);
  slider(ms, 'm-ti', '拖尾亮度', '×', 0, 4, 0.05, () => state.M.tailInt, v => state.M.tailInt = v, 1);
  $('#type').value = state.repId ? 'rep:' + state.repId : P.type; $('#mname').value = state.name; syncExport();
  syncTypeButton();
  $('#repNote').textContent = state.repId ? '实拍复刻：' + REPLICA_BY_ID[state.repId].note : ''; $('#repNote').hidden = !state.repId;
}
function refreshVisibility() {
  const P = state.P;
  $('#exposureControls').hidden = renderVersion(P)<40;
  $('#suggestExposure').disabled = !!P.exposureLock;
  for (const [row, it, sec, det] of panelRows) row.hidden = !itemVisible(it, P);
  document.querySelectorAll('#params details.sec').forEach(det => { const s = det._sec; det.hidden = !!(s.show && !s.show(P)) || ![...det.children].some(c => c.tagName !== 'SUMMARY' && c.tagName !== 'P' && !c.hidden); });
}
function refreshPanelValues() { for (const [row] of panelRows) row._refresh && row._refresh(); }
function applyShellLocked(n) {
  const keep = {}; for (const k of state.locks) keep[k] = state.P[k];
  applyShellNo(state.P, n); Object.assign(state.P, keep);
}
function jitterParams() {
  const P = state.P, r = new RNG((Date.now() & 0xffff) ^ P.seed);
  for (const sec of SCHEMA) {
    if (sec.show && !sec.show(P)) continue;
    for (const it of sec.items) {
      if (!Array.isArray(it) || !itemVisible(it, P)) continue;
      const [k, , , min, max, step] = it; if (state.locks.has(k) || ['duration', 'fpsFloor', 'shutter', 'segAt', 'cellPad', 'loopT', 'riseH', 'exposure'].includes(k)) continue;
      if (k === 'seed') { if (!state.locks.has('seed')) P.seed = 1 + Math.floor(r.u() * 998); continue; }
      if (!P[k]) continue;
      P[k] = clamp(Math.round(P[k] * (1 + 0.1 * (2 * r.u() - 1)) / step) * step, min, max);
    }
  }
  refreshPanelValues(); onParam(); flash('已随机微调未锁定的参数（±10%）');
}
function setType(t) {
  if (t.startsWith('rep:')) { setReplica(t.slice(4)); return; }
  state.repId = null;
  const keep = {}; for (const k of state.locks) keep[k] = state.P[k];
  const d = defaultsFor(t); state.P = derive({ ...d.P, ...keep, type: t }); state.M = d.M; state.activeStage = 0;
  state.name = TYPE_EN[t] + '_01'; buildMasterPanel(); onParam(); state.t = 0;
}
// 实拍复刻：换成对应的花型、号数、参数和颜色；数值对比默认对照这段视频
function setReplica(id) {
  const r = REPLICA_BY_ID[id]; if (!r) return;
  const { P, M } = replicaPM(id); state.P = P; state.M = M; state.activeStage = 0; state.repId = id;
  state.name = id + '_' + r.name.replace(/^V\d+b?r?f?\s*/, '').replace(/[（）·→ ]+/g, '_').replace(/_+$/, '');
  if (r.ref && REFS[r.ref]) { state.metricRef = r.ref; const s = $('#refMetric'); if (s) s.value = r.ref; }
  buildMasterPanel(); $('#type').value = 'rep:' + id; onParam(); state.t = 0;
  flash(r.note);
}
// 切换产物时给出合适的格子
function setForm(f) {
  const P = state.P, fam = familyOf(P.type);
  P.form = f;
  if (fam === 'aerial') {
    if (f === 'unit') Object.assign(P, { cols: 16, rows: 2, chans: 4, frameMode: 'auto', autoGrid: 1 });
    else if (P.rows * P.cols !== 64) Object.assign(P, { cols: 8, rows: 8, chans: 4 });
  }
  if (fam === 'rise') {
    if (f === 'master') Object.assign(P, { cols: 16, rows: 2, chans: 4, texW: 2048, texH: 2048, zoom: 'off' });
    else if (f === 'trail') Object.assign(P, { cols: 16, rows: 1, chans: 4, texW: 2048, texH: 2048, zoom: 'off' });
    else Object.assign(P, { cols: 8, rows: 2, chans: 1, texW: 1024, texH: 1024 });
  }
  syncExport(); onParam();
}

// ---------------- 组合 ----------------
const st2 = (a, b, t) => b && t < 9 ? [[0, a], [t, b]] : [[0, a]];
const COMBOS = [
  { name: '八重芯变色菊', layers: [{ m: 'kiku', scale: 1, stages: st2('#ff3a26', '#7cff6a', 1.25) }, { m: 'botan', scale: 0.5, stages: st2('#ffc766', '#dfe8ff', 1.35) }] },
  { name: '三重芯变色菊', layers: [{ m: 'kiku', scale: 1, stages: st2('#6f9dff', '#ff6fae', 1.25) }, { m: 'botan', scale: 0.62, stages: st2('#ffd36e') }, { m: 'botan', scale: 0.33, stages: st2('#ff3a2a', '#ffffff', 1.2) }] },
  { name: '五段变色三重芯（V11）', layers: [{ m: 'henka', scale: 1 }, { m: 'botan', scale: 0.55, stages: [[0, IGNITE_ORANGE], [0.4, '#eef2ff']] }, { m: 'botan', scale: 0.3, stages: st2('#ff2a1c', '#3d6cff', 1.0) }] },
  { name: '锦冠菊·银芯', layers: [{ m: 'kamuro', scale: 1 }, { m: 'botan', scale: 0.42, stages: st2('#e8eeff') }] },
  { name: '柳·红芯', layers: [{ m: 'yanagi', scale: 1 }, { m: 'botan', scale: 0.38, stages: st2('#ff3a26') }] },
  { name: '千轮菊', layers: [{ m: 'senrin', scale: 1 }] },
  { name: '蜂·彩芯', layers: [{ m: 'hachi', scale: 1 }, { m: 'botan', scale: 0.4, stages: st2('#7cff6a', '#ff6fae', 1.0) }] },
  { name: '点灭菊·红芯（V14 末期）', layers: [{ m: 'kiku', scale: 1, stages: [[0, IGNITE_ORANGE], [0.35, '#fff3dc']] }, { m: 'strobe', scale: 0.8, delay: 0.9, stages: st2('#ff2a1c') }] },
  { name: '四尺玉（主层 + 两层芯）', layers: [{ m: 'kiku', scale: 4.6, rate: 0.55, stages: [[0, IGNITE_ORANGE], [0.45, '#fff0d2']] }, { m: 'botan', scale: 2.6, rate: 0.6, stages: st2('#ffc766') }, { m: 'botan', scale: 1.3, rate: 0.65, stages: st2('#eef2ff') }] }
];
const LIB_TYPES = ['kiku', 'botan', 'kamuro', 'yanagi', 'senrin', 'hachi', 'henka', 'strobe'];
// 组合用的母版：2048（1024 时每帧只有 128 像素，组合页糊得没法看——用户 2026-09-30）；组合页默认实时模拟，贴图只在「导出效果」页用
// 组合用的母版：迭代 / 正式库条目（rep:）保持条目自己的输出方式（合并输出 = 引擎里的样子：灰度查 Ramp），这样组合页「导出效果」和导出的素材一致；
// 花型库默认母版仍用分开输出（组合里星头 / 尾巴亮度可以分开调）。window.FW_LIB_TEX：云端软件渲染自检时临时改小贴图。
const libP = (P, keep) => ({ ...P, texW: window.FW_LIB_TEX || 2048, texH: window.FW_LIB_TEX || 2048, cols: renderVersion(P)>=40?Math.min(4,P.cols):8, rows: renderVersion(P)>=40?Math.min(4,P.rows):8, chans: 4, outMode: keep && P.outMode ? P.outMode : renderVersion(P)>=40 ? 'combined' : 'split', form: 'master', zoom: renderVersion(P)>=40 ? (P.zoom === 'on' ? 'on' : 'off') : 'on' });
const defaultLibName = t => TYPE_NAMES[t].replace(/（.*）/, '') + ' · 默认';
async function ensureLibrary() {
  if (state.libReady) return;
  busy(true, '首次进入：烘焙默认母版…', 0);
  for (let i = 0; i < LIB_TYPES.length; i++) {
    const t = LIB_TYPES[i], nm = defaultLibName(t);
    if (state.lib.find(e => e.name === nm)) continue;
    const d = defaultsFor(t);
    const b = await bake(libP(d.P), 1, p => busy(true, `烘焙默认母版：${TYPE_NAMES[t]}（${i + 1}/${LIB_TYPES.length}）`, (i + p) / LIB_TYPES.length));
    state.lib.push({ name: nm, type: t, P: d.P, M: d.M, bake: b });
  }
  state.libReady = true; busy(false);
}
function libByType(t) {
  if (t.startsWith('rep:')) return state.lib.find(e => e.rep === t.slice(4));
  return state.lib.find(e => e.name === defaultLibName(t)) || state.lib.find(e => e.type === t);
}
// 组合里用到但还没烘焙的母版（实拍复刻层）现烘
async function ensureLibEntries(keys) {
  // 单独调过的层：参数变了就丢掉旧烘焙，按调过的参数重烘
  for (const k of new Set(keys)) {
    if (!k.startsWith('rep:')) continue;
    const ed = state.layerEdits && state.layerEdits[k.slice(4)], e = libByType(k);
    if (ed && e) { const sig = JSON.stringify([ed.P, ed.M]); if (e.editSig !== sig) { disposeBake(e.bake); state.lib.splice(state.lib.indexOf(e), 1); } }
  }
  const need = [...new Set(keys)].filter(k => !libByType(k));
  for (let i = 0; i < need.length; i++) {
    const k = need[i];
    if (k.startsWith('rep:')) {
      const id = k.slice(4), r = REPLICA_BY_ID[id], ed = state.layerEdits && state.layerEdits[id], { P, M } = ed || replicaPM(id);
      const b = await bake(libP(P, true), 1, p => busy(true, `烘焙组合用母版：${r.name}（${i + 1}/${need.length}）`, (i + p) / need.length));
      state.lib.push({ name: r.name, type: r.base, rep: id, P, M, bake: b, editSig: ed ? JSON.stringify([ed.P, ed.M]) : undefined });
    } else {
      const d = defaultsFor(k), b = await bake(libP(d.P), 1, p => busy(true, `烘焙组合用母版：${TYPE_NAMES[k]}`, (i + p) / need.length));
      state.lib.push({ name: defaultLibName(k), type: k, P: d.P, M: d.M, bake: b });
    }
  }
  busy(false);
}
function newLayer(entry, o = {}) {
  const M = entry.M;
  return { lib: entry.name, scale: 1, delay: 0, rate: 1, mirror: false, stages: M.stages.map(s => [...s]), xw: M.xw, ramp0: M.ramp0, ramp1: M.ramp1, ramp2: M.ramp2, ramp3: M.ramp3, headInt: M.headInt, tailInt: M.tailInt, ...o };
}
async function applyCombo(c) {
  await ensureLibEntries(c.layers.map(l => l.m));
  state.layers = c.layers.map(l => { const e = libByType(l.m); const { m, ...rest } = l; if (rest.stages) rest.stages = rest.stages.map(s => [...s]); return newLayer(e, rest); });
  state.comboName = c.name; state.t = 0; computeLinks(); buildComboPanel();
  if(state.platform==='mobile')await ensureComboMobile();
  if (typeof buildLayerCard === 'function') buildLayerCard();
}
function comboDuration() {
  let d = 0.5;
  for (const L of state.layers) { const e = state.lib.find(x => x.name === L.lib); if (e) d = Math.max(d, L.delay + bakeTotal(e.bake) / L.rate); }
  return d;
}
function bakeTotal(b) { let d = 0; for (let s = b; s; s = s.next) d = Math.max(d, (s.meta.t0 || 0) + s.meta.duration); return d; }
function buildComboPanel() {
  const pre = $('#presets'); pre.innerHTML = '';
  for (const c of [...COMBOS, ...REPLICA_COMBOS, ...(typeof FW_REVIEW_COMBOS !== 'undefined' ? FW_REVIEW_COMBOS : [])]) { const b = document.createElement('button'); b.className = 'btn' + (c.name.startsWith('V') ? ' rep' : ''); b.textContent = c.name; b.addEventListener('click', () => applyCombo(c)); pre.appendChild(b); }
  const host = $('#layers'); host.innerHTML = '';
  state.layers.forEach((L, i) => {
    const card = document.createElement('div'); card.className = 'card';
    const head = document.createElement('div'); head.className = 'head';
    head.innerHTML = `<b>${i + 1} · ${((typeof lib !== 'undefined' && lib.review && lib.review.layerNames) || [])[i] || '图层'}</b>`;
    const sel = document.createElement('select'); sel.setAttribute('aria-label', '母版');
    for (const e of state.lib) { const o = document.createElement('option'); o.value = e.name; o.textContent = e.name; sel.appendChild(o); }
    sel.value = L.lib; sel.addEventListener('change', () => { L.lib = sel.value; });
    const x = document.createElement('button'); x.className = 'x'; x.textContent = '删除'; x.addEventListener('click', () => { state.layers.splice(i, 1); buildComboPanel(); });
    const ed = document.createElement('button'); ed.className = 'btn mini lc-edit'; ed.type = 'button'; ed.textContent = '调这一层的参数 →'; ed.addEventListener('click', () => selectComboLayer(i));
    head.append(sel, ed, x); card.appendChild(head);
    slider(card, `l${i}-scale`, '缩放', '×', 0.1, 6, 0.01, () => L.scale, v => L.scale = v, 1);
    slider(card, `l${i}-delay`, '延迟', 's', 0, 3, 0.01, () => L.delay, v => L.delay = v, 0);
    slider(card, `l${i}-rate`, '时间倍率', '×', 0.3, 2, 0.01, () => L.rate, v => L.rate = v, 1);
    slider(card, `l${i}-hi`, '星头亮度', '×', 0, 4, 0.05, () => L.headInt, v => L.headInt = v, 1);
    slider(card, `l${i}-ti`, '拖尾亮度', '×', 0, 4, 0.05, () => L.tailInt, v => L.tailInt = v, 1);
    const sg = document.createElement('div'); sg.className = 'stages'; card.appendChild(sg);
    stageEditor(sg, L, 9, null, 'l' + i);
    const cc = document.createElement('div'); cc.className = 'colors'; cc.style.marginTop = '4px';
    colorPair(cc, '渐变图', [['ramp0', '暗'], ['ramp1', '中暗'], ['ramp2', '中亮'], ['ramp3', '亮']], L);
    card.appendChild(cc);
    const mir = document.createElement('label'); mir.className = 'check'; mir.style.marginTop = '6px';
    mir.innerHTML = `<input type="checkbox" id="l${i}-mir"> 水平镜像`;
    const cb = mir.querySelector('input'); cb.checked = L.mirror; cb.addEventListener('change', () => L.mirror = cb.checked);
    card.appendChild(mir);
    host.appendChild(card);
  });
  if (!state.layers.length) host.innerHTML = '<p class="note">还没有图层。点上面的预设，或「添加图层」。</p>';
  const libBox = $('#lib'); libBox.innerHTML = '';
  for (const e of state.lib) {
    const it = document.createElement('div'); it.className = 'it';
    it.innerHTML = `<span>${e.name}</span><small>${TYPE_NAMES[e.type]}</small>`;
    const add = document.createElement('button'); add.className = 'x'; add.textContent = '加入'; add.addEventListener('click', () => { state.layers.push(newLayer(e)); buildComboPanel(); });
    it.appendChild(add); libBox.appendChild(it);
  }
}
async function exportCombo() {
  // 4.0：多层效果导出成一个素材包（每层每段一个发射器 + 延迟），附上原来的组合说明 JSON
  const layers = state.layers.map(L => {
    const e = state.lib.find(x => x.name === L.lib);
    return { master: L.lib, masterType: e ? e.type : '', scale: L.scale, delay: L.delay, timeRate: L.rate, mirror: L.mirror,
      colorStages: L.stages, transition: L.xw, Ramp: [L.ramp0, L.ramp1, L.ramp2, L.ramp3], HeadInt: L.headInt, TailInt: L.tailInt,
      colorOverLife: e ? colorKeys(L, e.bake.meta.duration) : null,
      spriteSizeCm: e ? [+(e.bake.meta.Ww * L.scale * 100).toFixed(1), +(e.bake.meta.Wh * L.scale * 100).toFixed(1)] : null };
  });
  const json = { name: state.comboName, note: '每层一个面片，共用同一个爆点；Age = (礼花时间 − delay) × timeRate；颜色为 sRGB 十六进制，colorOverLife 为线性 RGB', layers };
  // 素材包名要是英文 / 数字（spec）：迭代区组合条目用条目号，否则用组合名里的英文数字部分
  const rv = typeof lib !== 'undefined' && lib.review && lib.review.kind === 'combo' ? lib.review.id : '';
  const name = (rv || state.comboName || 'Combo').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'Combo';
  busy(true, '组合素材包：准备各层…', 0);
  try {
    const files = await comboPackFiles(name, state.layers, p => busy(true, '组合素材包…', p));
    files.push([`${name}_组合说明.json`, utf8(JSON.stringify(json, null, 2))]);
    busy(true, '打包 ZIP…', 1);
    const pk = files.some(([f]) => f.startsWith(FW_TEX_PREFIX)) ? packNamesFor(wbKey(), lib.effect, state.layers.length, name).base : name;
    download(await makeZip(files.map(([f, d]) => [`${pk}/${f}`, d])), `${pk}.zip`);
    flash('已导出组合素材包 ' + name);
  } catch (e) { console.error(e); flash('组合导出失败：' + e.message, true); }
  finally { busy(false); }
}
