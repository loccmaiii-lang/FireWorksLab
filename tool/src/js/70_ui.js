// =====================================================================
//  状态与界面
// =====================================================================
const state = {
  tab: 'master', view: 'live', atlasLayer: 'head', atlasSeg: -1,
  ...defaultsFor('kiku'), name: 'Kiku_01',
  t: 0, playing: true, speed: 1, expo: 1, disp: 'game', dist: 1000, exportResolution: true, platform: 'pc',
  bake: null, baking: false, rebake: false, dirty: true, gen: 0,
  bakeGen: null, failedGen: -1, bakeError: null,
  lib: [], layers: [], comboName: '多层效果',
  locks: new Set(), activeStage: 0, repId: null,
  ref: { mode: 0, el: null, kind: '', t0: 0, alpha: 0.5, scale: 1, ox: 0, oy: 0, wipe: 0.5, aspect: 1, tex: null },
  versions: [], recipes: [],
  comboSel: -1, layerView: { solo: -1, mute: [] }   // 多层效果：正在调哪一层（-1 = 整体）；独看 / 静音只影响观察
};
const live = { sim: null, gen: -1, track: null, tgen: -1, tw: 0, E: null, egen: -1 };
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
// ---- 4.2.16 按需烘焙（用户 2026-10-03 12:59「abc 一起做」，12:27 #1「每动一个参数就自动重新渲染一次，特别影响效率」）----
// A 自动烘焙开关：关（默认）= 改参数只更新实时模拟，贴图标「旧」；按 B、切到引擎回放 / 贴图、导出时才烘。开 = 停手 0.38 s 自动烘（和以前一样）。
// B 烘焙可中断：烘到一半参数又变了，这次在下一个进度点直接丢掉，不再等它烘完再烘一遍。
// C 收紧取景（refineBake）只在手动烘、打开效果、导出时做；自动烘只烘预览。手动烘一次就做完，引擎回放看到的就是导出的样子。
// 打开效果 / 换版本照常烘（换了东西必须有贴图看）。自动化（Playwright，navigator.webdriver）默认开：本机任务、检查脚本按「打开 → 等烘完」走，不受影响；网址 ?autobake=0 / 1 强制。
const BAKE_ABORT = Object.assign(new Error('烘焙作废：参数又变了'), { abort: true });
const isAbort = e => !!(e && e.abort);
const bakeMode = { auto: null, demand: false };
function autoBakeOn() {
  if (bakeMode.auto == null) {
    const q = typeof location !== 'undefined' ? location.search : '';
    // 不在浏览器里（node 检查脚本）、或自动化（Playwright）：自动烘焙开，和以前的行为一样
    bakeMode.auto = /[?&]autobake=1/.test(q) ? true : /[?&]autobake=0/.test(q) ? false
      : typeof store === 'undefined' || typeof navigator === 'undefined' || navigator.webdriver ? true : !!store.get('autoBake', false);
  }
  return bakeMode.auto;
}
function setAutoBake(on) {
  bakeMode.auto = !!on; if (typeof store !== 'undefined') store.set('autoBake', !!on);
  const c = $('#autoBakeChk'); if (c) c.checked = !!on;
  if (on) {                                   // 打开自动：攒着的改动按自动的规矩烘（不收紧）
    if (state.tab === 'combo') { for (const e of [...(state.staleLayers || [])]) if (layerStale(e)) { state.staleLayers.delete(e); queueLayerBake(e, 0, true); } }
    else if (state.dirty) scheduleBake();
  }
  syncStale();
}
// 现在打开的是什么：换了东西（打开别的效果 / 模板 / 切单层 ↔ 多层）一定要烘
function bakeSubject() { return [typeof lib !== 'undefined' ? lib.key : '', state.repId || '', state.P && state.P.type, state.tab].join('|'); }
const layerStale = e => !!(e && e.bake && (e.pRev || 0) !== (e.bakeRev || 0));
function bakeStale() {
  if (state.tab === 'combo') return state.layers.some(L => layerStale(layerEntryOf(L)));
  return !!(state.bake && state.dirty && state.failedGen !== state.gen);
}
// 不用再点就会跑的活（排着的烘焙 / 收紧）；自动烘焙关时攒着的改动不算（那是「贴图旧了」，等你按 B）
function bakesPending() {
  if (state.tab === 'combo') return !!((state.layerQueue && state.layerQueue.size) || (state.layerRefine && state.layerRefine.size));
  return !!((state.dirty && state.failedGen !== state.gen && (autoBakeOn() || bakeMode.demand || !state.bake)) || state.refineDue);
}
// 手动烘：B、切到引擎回放 / 贴图、「烘焙」按钮、重试。烘到最新为止（中途又改了接着烘），带收紧取景
function bakeNow(o = {}) {
  bakeMode.demand = true;
  if (state.tab === 'combo') {
    if (state.comboSel >= 0 && state.dirty) { state.dirty = false; const le = layerEntryOf(state.layers[state.comboSel]); if (le) queueLayerBake(le, 0, true); }
    for (const L of state.layers) { const e = layerEntryOf(L); if (layerStale(e) && !(state.layerQueue && state.layerQueue.has(e))) queueLayerBake(e, 0, true); }
    if (state.staleLayers) state.staleLayers.clear();
    for (const L of state.layers) { const e = layerEntryOf(L); if (e && e.bake && e.bake.meta && !e.bake.meta.fitted && e.bake.meta.plan && !layerStale(e)) queueLayerRefine(e); }
    if (!state.baking) runLayerQueue();
  } else {
    if (state.dirty) { clearTimeout(bakeTimer); if (!state.baking) runPreviewBake(); }
    else if (state.bake && state.bake.meta && !state.bake.meta.fitted && state.bake.meta.plan) scheduleRefine(0);
  }
  bakeSettle(); syncStale();
  if (!o.quiet && !bakeMode.demand) flash('贴图已经是最新的');
}
function bakeIfStale() { if (bakeStale() || bakesPending()) bakeNow({ quiet: true }); }
// 导出前：把攒着的改动都烘完（多层导出直接拿每层的贴图）
async function bakeFlush() {
  if (bakeStale() || bakesPending()) bakeNow({ quiet: true });
  for (let i = 0; i < 6000 && (state.baking || bakesPending()); i++) await new Promise(r => setTimeout(r, 50));
}
// 烘完、收紧都结束了：手动烘的「烘到最新为止」到此为止
function bakeSettle() { if (!state.baking && !bakesPending()) bakeMode.demand = false; syncStale(); }
let staleSig = '';
function syncStale() {
  if (typeof document === 'undefined') return;
  const btn = $('#bakeNow'), bar = $('#staleBar'); if (!btn || !bar) return;
  const stale = bakeStale(), busyB = state.baking || bakesPending(), auto = autoBakeOn(), view = state.view;
  const sig = [stale, busyB, auto, view].join('|'); if (sig === staleSig) return; staleSig = sig;
  btn.classList.toggle('stale', stale && !busyB); btn.classList.toggle('run', busyB);
  btn.textContent = busyB ? '烘焙中…' : stale ? '烘焙 ●' : '贴图最新';
  btn.title = (stale ? '贴图还是旧参数：' : '') + '按当前参数烘焙贴图（B）' + (auto ? '' : '；自动烘焙关着：改参数只更新实时模拟');
  const c = $('#autoBakeChk'); if (c) c.checked = auto;
  bar.hidden = !(stale && view !== 'live' && state.tab !== 'asset');
  if (!bar.hidden) $('#staleText').textContent = busyB ? '贴图按新参数烘焙中…' : '贴图还是旧参数（实时模拟已是新的）';
  $('#staleBake').hidden = busyB;
}
// 预览烘焙
let bakeTimer = 0;
function scheduleBake() { clearTimeout(bakeTimer); bakeTimer = setTimeout(runPreviewBake, 380); }
async function runPreviewBake() {
  clearTimeout(bakeTimer);
  if (state.tab === 'combo' && state.comboSel >= 0) { const le = state.lib.find(x => state.layers[state.comboSel] && x.name === state.layers[state.comboSel].lib); if (le && state.dirty) { state.dirty = false; queueLayerBake(le, 0); } return; }
  if (state.baking) { state.rebake = true; return; }
  if (!state.dirty || state.failedGen === state.gen) { bakeSettle(); return; }
  // 4.2.16：自动烘焙关、不是手动要的、打开的还是同一个东西 → 不烘，贴图标旧（实时模拟已经按新参数在画）
  const subj = bakeSubject(), opened = !state.bake || state.bakeSubj !== subj || !state.bake.P || state.bake.P.type !== state.P.type;
  if (!autoBakeOn() && !bakeMode.demand && !opened) { syncStale(); return; }
  state.baking = true; state.rebake = false; syncStale();
  const gen = state.gen, P = structuredClone(state.P), full = bakeMode.demand || opened; let pending=null;
  try {
    const phys = isPhys(P);
    const b = pending = phys ? physBake(P) : await bake(P, 1, p => {
      if (gen !== state.gen) throw BAKE_ABORT;          // 4.2.16：参数又变了，这次作废
      setStatus(`预览烘焙… ${Math.round(p * 100)}%`);
    });
    if(!phys && state.platform==='mobile' && gen===state.gen)b.mobile=await bakeMobileFor(b,p=>{
      if(gen!==state.gen)throw BAKE_ABORT;
      setStatus(`手机独立烘焙… ${Math.round(p*100)}%`);
    });
    // 旧任务连贴图 / 统计 / 缩略图也不能发布，且必须释放其显卡资源。
    if (gen !== state.gen) { disposeBake(b); pending=null; return; }
    disposeBake(state.bake); state.bake = b; state.bakeGen = gen; state.bakeSubj = subj; pending=null;
    state.dirty = false; state.failedGen = -1; state.bakeError = null; syncBakeError();
    if (phys) $('#stats').innerHTML = physStats(P);
    else { showStats(b); afterBake(b); if (full) scheduleRefine(0); }     // 4.2.16 C：收紧取景只在手动烘 / 打开时
    // 自动选格子改了列 × 行：同步到界面（帧数不变，不触发重烘）
    // （4.2.0：「格子按帧数」「单格」是每次按帧数现算的，不写回列 × 行，否则下次容量就变小了）
    if (!phys && !b.meta.L.fit && !(+state.P.outCell > 0) && state.P.outPack !== 'fit' && (b.meta.L.cols !== state.P.cols || b.meta.L.rows !== state.P.rows)) { state.P.cols = b.meta.L.cols; state.P.rows = b.meta.L.rows; syncExport(); }
    setStatus('');
  } catch (e) {
    if(pending)disposeBake(pending);
    if (isAbort(e)) { setStatus(''); return; }        // 作废不算失败；finally 里按最新参数接着走
    console.error(e);
    if (gen === state.gen) {
      state.dirty = true; state.failedGen = gen;
      state.bakeError = { gen, message: e.message || String(e) };
      $('#stats').textContent = '最新参数烘焙失败；修改参数或点击重试。';
      setStatus(''); syncBakeError();
    }
  } finally {
    state.baking = false; state.rebake = false;
    if (state.layerQueue && state.layerQueue.size) runLayerQueue();
    else if (state.dirty && state.failedGen !== state.gen) runPreviewBake();
    bakeSettle();
  }
}
// 多层效果里调某一层（2026-10-02 用户 07:43）：state.P 就是这一层的参数（组合库条目 e.P），改了只重烘这一层；
// 画面一直是整朵（实时模拟按 e.P 现算，引擎回放 / 贴图用新烘的 e.bake）。调过的层记进 state.layerEdits，换版本 / 保存时用。
// 4.2.3（走查 A4）：每层自己排队重烘。以前只有「当前选中的层」能烘：改完一层马上点别的层（或拖别的层的点），
// 这次重烘被丢掉，参数是新的、贴图是旧的，导出包和参数不一致。现在每层记一个参数版本号 pRev，改了就进队列；
// 烘的是哪层就发布到哪层，和现在选中谁无关；烘的时候又改了，烘完不发布、按最新参数再烘一次。
function dropLibBake(e) { if (e && e.bake && !state.lib.some(x => x !== e && x.bake === e.bake)) disposeBake(e.bake); if (e) e.bake = null; }
function queueLayerBake(e, delay = 380, noBump = false) {
  if (!e) return;
  if (!noBump) { e.pRev = (e.pRev || 0) + 1; e.rev = (e.rev || 0) + 1; }      // rev：实时模拟马上按新参数重算
  // 4.2.16：自动烘焙关、不是手动要的、这一层已经有贴图 → 先攒着（贴图标旧），按 B / 切视图 / 导出时再烘
  if (!autoBakeOn() && !bakeMode.demand && e.bake && !(state.layerQueue && state.layerQueue.has(e) && state.baking)) { (state.staleLayers = state.staleLayers || new Set()).add(e); syncStale(); return; }
  (state.layerQueue = state.layerQueue || new Set()).add(e);
  clearTimeout(state.layerQueueTimer); state.layerQueueTimer = setTimeout(runLayerQueue, delay);
}
// 4.2.5 取景按实测收紧：预览先按估计的取景烘（快）；停手 0.7 秒后在后台按这次贴图量出来的范围收紧再烘一次，参数没再变才换上
let refineTimer = 0;
function scheduleRefine(delay = 700) { clearTimeout(refineTimer); state.refineDue = true; refineTimer = setTimeout(runRefine, delay); }
async function runRefine() {
  clearTimeout(refineTimer); state.refineDue = false;
  if (state.baking) { scheduleRefine(); return; }
  const b0 = state.bake; if (state.tab === 'combo' || !b0 || state.dirty || !b0.meta || b0.meta.fitted || !b0.meta.plan) { bakeSettle(); return; }
  const gen = state.gen; state.baking = true; let nb = null;
  try {
    nb = await refineBake(b0, p => { if (gen !== state.gen) throw BAKE_ABORT; setStatus(`收紧取景… ${Math.round(p * 100)}%`); });
    if (nb && gen === state.gen && state.bake === b0 && state.platform === 'mobile') nb.mobile = await bakeMobileFor(nb);
    if (nb && gen === state.gen && state.bake === b0) { disposeBake(b0); state.bake = nb; nb = null; showStats(state.bake); afterBake(state.bake); }
  } catch (err) { if (!isAbort(err)) console.error(err); }
  finally {
    if (nb) disposeBake(nb);          // 参数又变了：这次收紧作废
    state.baking = false; setStatus('');
    if (state.layerQueue && state.layerQueue.size) runLayerQueue(); else if (state.dirty && state.failedGen !== state.gen) runPreviewBake();
    bakeSettle();
  }
}
function queueLayerRefine(e) {
  (state.layerRefine = state.layerRefine || new Set()).add(e);
  clearTimeout(state.layerQueueTimer); state.layerQueueTimer = setTimeout(runLayerQueue, 700);
}
async function runLayerQueue() {
  clearTimeout(state.layerQueueTimer);
  const q = state.layerQueue = state.layerQueue || new Set(), rq = state.layerRefine = state.layerRefine || new Set();
  if (state.baking) return;                      // 正在烘的那次结束时会再叫这里
  if (!q.size) {                                 // 没有要按新参数烘的层：后台收紧取景（4.2.5）
    const e = rq.values().next().value; if (!e) { bakeSettle(); return; }
    rq.delete(e);
    if (!state.lib.includes(e) || !e.bake || !e.bake.meta || e.bake.meta.fitted || !e.bake.meta.plan || layerStale(e)) return runLayerQueue();
    const b0 = e.bake, rev = e.pRev, i0 = state.layers.findIndex(L => L.lib === e.name); state.baking = true; let nb = null; syncStale();
    try {
      nb = await refineBake(b0, p => { if (e.pRev !== rev) throw BAKE_ABORT; setStatus(`收紧取景：第 ${i0 + 1} 层 ${Math.round(p * 100)}%`); });
      if (nb && state.lib.includes(e) && e.bake === b0 && e.pRev === rev) {
        dropLibBake(e); e.bake = nb; nb = null;
        if (state.tab === 'combo' && state.comboSel >= 0 && state.layers[state.comboSel] && state.layers[state.comboSel].lib === e.name) showStats(e.bake);
        if (state.platform === 'mobile' && !q.size) await ensureComboMobile();
        if (typeof buildLayerCard === 'function') buildLayerCard();
      }
    } catch (err) { if (!isAbort(err)) console.error(err); }
    finally { if (nb) disposeBake(nb); state.baking = false; setStatus(''); if (q.size || rq.size) runLayerQueue(); else if (state.dirty && state.failedGen !== state.gen && !(state.tab === 'combo' && state.comboSel >= 0)) runPreviewBake(); bakeSettle(); }
    return;
  }
  const e = q.values().next().value;
  if (!state.lib.includes(e) || e.failedRev === e.pRev) { q.delete(e); return runLayerQueue(); }
  state.baking = true; syncStale();
  const rev = e.pRev, full = bakeMode.demand || !e.bake, idx = () => state.layers.findIndex(L => L.lib === e.name), isCur = () => state.tab === 'combo' && state.comboSel >= 0 && state.layers[state.comboSel] && state.layers[state.comboSel].lib === e.name;
  let pending = null;
  try {
    const b = pending = await bake(libP(e.P, true), 1, p => { if (e.pRev !== rev) throw BAKE_ABORT; setStatus(`重烘第 ${idx() + 1} 层… ${Math.round(p * 100)}%`); });
    pending = null;
    if (!state.lib.includes(e)) { disposeBake(b); q.delete(e); return; }
    if (e.pRev !== rev) { disposeBake(b); return; }                          // 烘的时候又改了：留在队列里，按最新参数再烘
    dropLibBake(e); e.bake = b; e.bakeRev = rev; q.delete(e); e.failedRev = -1; if (state.staleLayers) state.staleLayers.delete(e);
    if (e.rep) { state.layerEdits = state.layerEdits || {}; state.layerEdits[e.rep] = { P: e.P, M: e.M }; e.editSig = JSON.stringify([e.P, e.M]); }
    if (isCur()) { state.failedGen = -1; state.bakeError = null; syncBakeError(); showStats(b); }
    setStatus('');
    const i = idx(); if (i >= 0) syncLinkedLayers(i);
    if (full) queueLayerRefine(e);                    // 4.2.16 C：收紧取景只在手动烘 / 第一次烘
    if (state.platform === 'mobile' && !q.size) await ensureComboMobile();
    if (typeof buildLayerCard === 'function') buildLayerCard();
  } catch (err) {
    if (pending) disposeBake(pending);
    if (isAbort(err)) { setStatus(''); return; }        // 作废：e 还在队列里，finally 接着按最新参数烘
    console.error(err);
    if (e.pRev === rev) {
      e.failedRev = rev; q.delete(e);
      if (isCur()) { state.failedGen = state.gen; state.bakeError = { gen: state.gen, message: err.message || String(err) }; $('#stats').textContent = '这一层的新参数烘焙失败；修改参数或点击重试。'; syncBakeError(); }
      else flash(`第 ${idx() + 1} 层烘焙失败：${err.message || err}`, true);
      setStatus('');
    }
  } finally {
    state.baking = false; state.rebake = false;
    if (q.size) runLayerQueue();
    else if (state.dirty && state.failedGen !== state.gen && !(state.tab === 'combo' && state.comboSel >= 0)) runPreviewBake();
    else if (state.layerRefine && state.layerRefine.size) { clearTimeout(state.layerQueueTimer); state.layerQueueTimer = setTimeout(runLayerQueue, 700); }
    bakeSettle();
  }
}
// 同一批星（种子、星数、初速、终端速度都一样）的层：决定轨迹的参数改一处、几层一起变（用户 2026-10-02 13:09：两层共用的参数要两层一起改，以前没有联动）
const LINK_KEYS = ['seed', 'stars', 'v0', 'vt', 'grav', 'speedJit', 'dirJit', 'burstR0', 'pattern', 'tilt', 'ringFrac', 'wind', 'turb', 'turbScale', 'tailDiffuse', 'tailDiffuseScale', 'massLoss', 'shellVx', 'shellVy', 'shellSpin', 'shellNo'];
function computeLinks() {
  if (typeof lib !== 'undefined' && lib.my) { state.links = myLinkIdx(); return; }    // 我的效果：同一批星是你勾的（4.2.7）
  const g = new Map(); state.links = [];
  // 复制出来的层（同一个母版用了两次，4.2.3）是另一发，不按「同一批星」联动
  state.layers.forEach((L, i) => { const e = state.lib.find(x => x.name === L.lib); if (!e || familyOf(e.P.type) !== 'aerial') return; const k = [e.P.seed, e.P.stars, e.P.v0, e.P.vt, e.fork ? e.name : ''].join('|'); if (!g.has(k)) g.set(k, []); g.get(k).push(i); });
  for (const arr of g.values()) if (arr.length > 1) state.links.push(arr);
}
const linkedWith = i => ((state.links || []).find(a => a.includes(i)) || []).filter(j => j !== i);
function syncLinkedLayers(i) {
  if (state.linkOff) return;
  const e = state.lib.find(x => x.name === state.layers[i].lib), done = [];
  for (const j of linkedWith(i)) {
    const e2 = state.lib.find(x => x.name === state.layers[j].lib); if (!e2 || e2 === e) continue;
    const diff = LINK_KEYS.filter(k => e.P[k] !== undefined && JSON.stringify(e.P[k]) !== JSON.stringify(e2.P[k]));
    if (!diff.length) continue;
    for (const k of diff) e2.P[k] = structuredClone(e.P[k]);
    queueLayerBake(e2, 0);
    done.push(`第 ${j + 1} 层（${diff.join('、')}）`);
  }
  if (done.length) flash('联动：同步了 ' + done.join('；'));
}
function syncBakeError() {
  const e = state.bakeError; $('#bakeError').hidden = !e;
  if (!e) return;
  const shown = state.bake ? `当前保留的是 v${state.bakeGen == null ? '?' : state.bakeGen} 的烘焙` : '当前没有可用的烘焙';
  $('#bakeErrorText').textContent = `${shown}。${e.gen === state.gen ? '最新参数' : '此前参数 v' + e.gen}烘焙失败：${e.message}${e.gen !== state.gen ? '；正在尝试新参数。' : ''}`;
}
function retryPreviewBake() {
  if (state.baking) return;
  bakeMode.demand = true;
  if (state.tab === 'combo' && state.comboSel >= 0) { const le = state.lib.find(x => state.layers[state.comboSel] && x.name === state.layers[state.comboSel].lib); if (le) { le.failedRev = -1; state.failedGen = -1; state.bakeError = null; syncBakeError(); queueLayerBake(le, 0); } return; }
  state.failedGen = -1; state.dirty = true; runPreviewBake();
}
function onParam() {
  derive(state.P); state.gen++; $('#stats').textContent = '烘焙中…';
  // 组合里正在调某一层：这一层马上进自己的重烘队列（4.2.3 走查 A4：不等防抖，切层也不会丢）
  const le = state.tab === 'combo' && state.comboSel >= 0 && state.layers[state.comboSel] ? state.lib.find(x => x.name === state.layers[state.comboSel].lib) : null;
  if (le && le.P === state.P) { state.bakeError = null; syncBakeError(); queueLayerBake(le); }
  else { state.dirty = true; syncBakeError(); scheduleBake(); }
  refreshVisibility();
  if (typeof undoNote === 'function') undoNote();
}
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
  if (m.drop) warn.push(`有东西超出上限没画：${[m.drop.stars ? `${m.drop.stars} 颗星（显卡贴图边长）` : '', m.drop.heads ? '星头缓冲满了（星头 / 闪光太多）' : '', m.drop.sparks ? 'CPU 火花池满了' : ''].filter(Boolean).join('、')}；减少星数 / 子星数，或换 GPU 内核`);
  const bud = m.plan && m.plan.budget || m.budget; if (bud && bud.strobeAlias) warn.push(`点灭最快约 ${bud.strobeAlias} Hz，30 fps 的序列会混叠（看起来变成慢闪）；要这么快的点灭建议做成粒子层或降低「点灭频率」`);
  rows.push(warn.length ? `<span class="warn">自检：${warn.join('；')}</span>` : '<span class="ok">自检：过曝、边缘、通道布局都正常</span>');
  $('#stats').innerHTML = rows.join('<br>');
}
const GRID_OPTS = [1, 2, 4, 8, 16, 32];
function formOptions(P) {
  const fam = familyOf(P.type);
  if (fam === 'ground') return [['loop', '地面循环（周期性烘焙，首尾无缝）']];
  // 4.3（清理清单 A6）：升空尾缀只留 V5 形式（尾缀序列）。打开的条目本身是别的形式（RT4 循环层 + 粒子、旧的物理 / 单元）时，保留它自己那一种，免得改坏
  if (fam === 'rise') {
    const ALL = { trail: '尾缀序列（V5：循环 + 消散，速度朝向）', emitset: '循环层 + 粒子发射器（RT4 用的形式）', phys: '实时物理模拟（旧，贴图用 trail_phys_bake.py 导出）', unit: '星头循环 + 弹道与火花发射器参数（旧）', master: '整段大面片（旧）' };
    const o = [['trail', ALL.trail]]; if (P.form && P.form !== 'trail' && ALL[P.form]) o.push([P.form, ALL[P.form]]); return o;
  }
  const o = [['master', '大面片母版'], ['segments', '分段母版（按实际帧数分配贴图）']];
  if (unitAllowed(P)) o.push(['unit', '单元序列（每颗星一个粒子，省 overdraw）']);
  return o;
}
const FORM_NOTES = {
  master: '整朵花烘成一张序列，一个面片播放。远景、大型礼花的主层。',
  segments: '长时花型（锦冠、柳）帧数不够时，把开花段和下垂段分成两张贴图、两个发射器，各自分配帧数。',
  unit: '贴图里只有一颗星的星头和尾迹（沿速度方向），Cascade 按拟合的轨迹发射每颗星。菊类最省 overdraw。',
  loop: '周期内的火花按周期性编号生成，最后一帧直接接回第一帧。Cascade 里 Emitter Loops = 0 无限循环。',
  emitset: '循环层 + 粒子发射器：星头和白热段烘成一个速度朝向的循环面片（开花后换贴图动态消散），火花、落火、烟带是 Cascade 软圆点发射器（PC GPU / 手机 CPU），每颗自己的寿命、错落熄灭；出生位置和初速按弹道曲线。',
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
  // 4.2.6 贴图尺寸放开（用户 2026-10-02 19:41「不要强制 2048」）：宽、高各自选；配方里不在列表里的尺寸也照样显示
  for (const [id, v] of [['x-texW', P.texW], ['x-texH', P.texH]]) { const el = $('#' + id), opts = [...new Set([512, 1024, 2048, 4096, +v])].sort((a, b) => a - b); const h = opts.join(); if (el.dataset.h !== h) { el.innerHTML = ''; for (const n of opts) el.add(new Option(n + (n === 4096 ? '（母版）' : ''), n)); el.dataset.h = h; } el.value = String(v); }
  $('#x-cols').value = P.cols; $('#x-rows').value = P.rows;
  // 列 × 行：单格要 ≥ 512（PC 下限），放不下的列数 / 行数灰掉；实际用的写在旁边（取帧计划按这个夹）
  if (['master', 'segments'].includes(P.form)) {
    const mc = Math.max(1, Math.floor(P.texW / 512)), mr = Math.max(1, Math.floor(P.texH / 512)), oc = +P.outCell > 0;
    for (const [id, m] of [['x-cols', mc], ['x-rows', mr]]) for (const o of $('#' + id).options) o.disabled = !oc && +o.value > m;
    const ec = oc ? Math.max(1, Math.floor(P.texW / Math.max(512, +P.outCell))) : Math.min(P.cols, mc), er = oc ? Math.max(1, Math.floor(P.texH / Math.max(512, +P.outCell))) : Math.min(P.rows, mr);
    let n = $('#x-gridNote'); if (!n) { n = document.createElement('small'); n.id = 'x-gridNote'; n.className = 'note'; $('#x-rows').closest('label').appendChild(n); }
    n.textContent = ec !== P.cols || er !== P.rows ? `实际 ${ec} × ${er}（单格 ${Math.round(P.texW / ec)} px${oc ? '，按「单格」' : '，单格不小于 512'}）` : '';
  }
  $('#x-chans').value = P.chans; $('#x-out').value = P.outMode; $('#x-enc').value = P.encGamma; $('#x-frame').value = P.frameMode; $('#x-zoom').value = P.zoom;
  $('#x-flip').checked = !!P.unitFlip; $('#flipBox').hidden = !(k === 'unit' || k === 'riseLoop');
  $('#x-autogrid').checked = !!P.autoGrid; $('#gridBox').hidden = k === 'master' || k === 'segments';
  $('#x-zoom').disabled = k !== 'master' && k !== 'segments'; $('#x-frame').disabled = k === 'loop' || k === 'riseLoop';
  const tickPlan=usesTickPlan40(P);$('#x-frame').querySelector('[value="tick30"]').hidden=!tickPlan;
  if(tickPlan){$('#x-frame').value='tick30';$('#x-frame').disabled=true;}
  $('#btnVariants').disabled = k !== 'master';
}

function fmtV(v, step) { const d = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3; return (+v).toFixed(d); }
// 4.3.2（渲染基础问题 H16）：「负数 = 默认」的参数以前只能把滑杆拖到 -1，中间那段负数没意义、也看不出默认是多少。
// 改成行里一个「默认」勾选：勾上 = 存 -1（模拟照旧按默认算），滑杆变灰、显示默认的实际值；去掉勾 = 从默认的实际值开始调，滑杆只在有效范围。
// [滑杆下限, 默认的实际值（按当前参数）, 说明]
const AUTO_DEF = {
  subKeep: [0, P => P.subPattern === 'cross' ? 0.25 : 0.35, '小球（千轮）0.35、十字（分裂）0.25'],
  subSpeedJit: [0, P => +P.speedJit || 0, '跟主层的初速随机'],
  subGrav: [0, P => P.grav == null ? 1 : +P.grav, '跟主层的重力'],
  subFlash: [0, P => +(+P.flash * 0.3).toFixed(3), '主层开花闪光 × 0.3'],
};
function autoDefRow(row, k, step) {
  const a = AUTO_DEF[k]; if (!a) return;
  const inp = row.querySelector('input[type=range]'), num = row.querySelector('.num');
  inp.min = a[0];
  const lb = document.createElement('label'); lb.className = 'adef'; lb.title = '勾上 = 用默认（' + a[2] + '）；去掉勾再调';
  lb.innerHTML = '<input type="checkbox"> 用默认（' + a[2] + '）'; row.appendChild(lb);
  const cb = lb.querySelector('input');
  const sync = () => { const on = !(+state.P[k] >= 0); cb.checked = on; inp.disabled = on; num.disabled = on; row.classList.toggle('adef-on', on);
    if (on) { const v = a[1](state.P); inp.value = v; num.value = fmtV(v, step); } };
  cb.addEventListener('change', () => { state.P[k] = cb.checked ? -1 : Math.max(a[0], +a[1](state.P)); onParam(); sync(); });
  row.querySelector('.k').addEventListener('dblclick', () => setTimeout(sync, 0));     // 双击恢复默认 = 勾上
  const r0 = row._refresh; row._refresh = () => { r0(); sync(); }; sync();
}
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
function placeSpecBox() {
  const box = $('#specBox'), host = document.querySelector('#params [data-info=specBox]'), det = host && host.closest('details');
  const where = host && det && det.style.display !== 'none' && !det.hidden ? host : $('#specHome');
  if (box && box.parentElement !== where) where.appendChild(box);
}
function itemVisible(it, P) { const f = Array.isArray(it) ? it[6] : it.show; return !f || f(P); }
// ---------------- 参数栏（4.3 定稿：只有一种面板，按 Cascade 发射器的模块排，名字全用新名，analysis/命名/参数名称表.json）----------------
// 4.4：发射器 → 模块 → 参数（71_panel43.js、analysis/命名/发射器表.json）；顶上一排发射器标签，一次看一个；随机收在本体参数的「随机」下；
// 没有「更多」；搜索认短名、全名、英文名、发射器名和说明，跨所有发射器；「只看改过的」和打开时的版本比。说明条点参数名才换（不跟鼠标跳）。
function splitLab(lab) {
  const s = String(lab), i = s.search(/[（(]/);
  return [i > 0 ? s.slice(0, i).trim() : s, i > 0 ? s.slice(i + 1).replace(/[）)]\s*$/, '').trim() : ''];
}
const pview = { q: '', changed: false, ready: false };
function pviewInit() { if (pview.ready) return; pview.ready = true; pview.changed = !!store.get('pChanged', false);   // store 在后面的文件里定义：用到时再读
  pview.en = !!store.get('pEN', false); pview.mopen = store.get('pModOpen', {});
  // 4.3.5：4.3.4 打开时只展开「运动」一组，期间点过的分组开关多半是在找参数；一次性清掉分组（@ 开头）的开关记录，回到默认全展开。模块自己的开关不动
  if (store.get('pGrpReset', 0) < 435) { for (const k of Object.keys(pview.mopen)) if (k.startsWith('@')) delete pview.mopen[k]; store.set('pModOpen', pview.mopen); store.set('pGrpReset', 435); }
  pview.ropen = store.get('pRandOpen', {}); pview.tab = store.get('pEmitTab', {}); }   // 英文名、模块 / 随机 / 更多展开
// 「改过的」和谁比：打开时的版本（AI 版 / 你保存的版本，wbArm 记下的样子）；没有就和花型模板默认值比
function panelBaseP() {
  try {
    const s = typeof wb !== 'undefined' && wb.sig ? JSON.parse(wb.sig) : null;
    if (s && s.kind === 'single' && s.P) return s.P;
    if (s && s.kind === 'combo' && state.comboSel >= 0 && s.layers[state.comboSel] && s.layers[state.comboSel].P) return s.layers[state.comboSel].P;
  } catch (e) { }
  return defaultsFor(state.P.type).P;
}
function rowChanged(it, P, B) {
  if (Array.isArray(it)) { const k = it[0], a = +P[k], b = +B[k]; if (!isFinite(a) && !isFinite(b)) return false; return !(Math.abs((isFinite(a) ? a : 0) - (isFinite(b) ? b : 0)) <= (+it[5] || 0) / 2 + 1e-9); }
  if (it.sel) return String(P[it.sel]) !== String(B[it.sel]);
  if (it.text) return String(P[it.text]) !== String(B[it.text]);
  return false;
}
function rowMatches(row, it, sec, q) {
  if (!q) return true;
  const nm = row._nm, x = row._x;      // 4.4：短名、全名、英文名、发射器 / 模块名和说明
  return [row._lab || '', x ? x.e + ' ' + x.m + ' ' + x.n : '', nm ? [nm.cn, nm.en, nm.men, nm.desc].join(' ') : row._detail || ''].join(' ').toLowerCase().includes(q);
}
// 4.3（渲染基础问题 F7）：大小类参数说明里换算成导出贴图上的像素（按现在烘好的取景：面片宽 ÷ 单格像素）
const SIZE_KEYS = { headSize: 1, sparkSize: 1, emberSize: 'sparkSize', subScale: 0 };
function sizePxNote(k) {
  if (!(k in SIZE_KEYS)) return '';
  const b = state.bake, m = b && b.meta, P = state.P; if (!m || !m.L || !(m.Ww > 0) || !(m.L.cellW > 0)) return '';
  const mpp = m.Ww / m.L.cellW, v = SIZE_KEYS[k] === 'sparkSize' ? (+P.sparkSize || 0) * (+P.emberSize || 1) : +P[k];
  if (!(v > 0) || SIZE_KEYS[k] === 0) return '';
  return `<span class="ph-x">导出贴图上 1 像素 ≈ ${mpp < 0.1 ? mpp.toFixed(3) : mpp.toFixed(2)} m（面片 ${m.Ww.toFixed(0)} m ÷ 单格 ${Math.round(m.L.cellW)} 像素）：现在约 ${(v / mpp).toFixed(1)} 像素${v / mpp < 1 ? '（不到 1 像素：再调小主要是变暗）' : ''}</span>`;
}
// 4.5.0 参数说明（用户 10-05 01:28 #9 / 02:25「做个过渡动效，停留 1.5 s 出现」）：鼠标在参数名上停 1.5 s 才淡入，显示在参数栏下方；
// 移开 0.3 s 后淡出（移进说明里看长文字不会消失）；点参数名 = 钉住（再点、点 ×、按 Esc 解除）。4.4 是点了才出、出了就一直在
const HELP_DELAY = 1500, HELP_LEAVE = 300, helpSt = { timer: 0, hide: 0, pinned: null };
function helpShow(row, pin) {
  clearTimeout(helpSt.timer); clearTimeout(helpSt.hide);
  const h = $('#pHelp'); if (!h || !row) return;
  panelHelp(row); if (pin) helpSt.pinned = row;
  if (helpSt.pinned) h.insertAdjacentHTML('afterbegin', '<button type="button" class="ph-close" aria-label="关闭说明" title="关闭（Esc）">×</button>');
  h.classList.add('on'); h.classList.toggle('pinned', !!helpSt.pinned);
}
function helpHide(force) {
  clearTimeout(helpSt.timer); clearTimeout(helpSt.hide);
  if (helpSt.pinned && !force) return;
  helpSt.pinned = null; const h = $('#pHelp'); if (h) h.classList.remove('on', 'pinned');
}
function helpBind(name, row) {
  name.addEventListener('pointerenter', () => { if (helpSt.pinned) return; clearTimeout(helpSt.hide); clearTimeout(helpSt.timer); helpSt.timer = setTimeout(() => helpShow(row), HELP_DELAY); });
  name.addEventListener('pointerleave', () => { clearTimeout(helpSt.timer); if (!helpSt.pinned) helpSt.hide = setTimeout(() => helpHide(), HELP_LEAVE); });
  name.addEventListener('click', () => { if (helpSt.pinned === row) helpHide(true); else { helpSt.pinned = null; helpShow(row, true); } });
}
function panelHelp(row) {
  const h = $('#pHelp'); if (!h) return;
  if (!row) { h.innerHTML = ''; return; }
  const it = row._it, B = panelBaseP(), k = Array.isArray(it) ? it[0] : it.sel || it.text;
  if (row._nm) {      // 4.3：第一行「English · 中文 — 说明」，下面调大 / 调小、随机怎么取、UE 里对应、注意、现在不起作用的原因
    const nm = row._nm, unit = Array.isArray(it) && it[2] ? ` <small>${it[2]}</small>` : '', rng = Array.isArray(it) ? `范围 ${it[3]}–${it[4]}` : '';
    const base = B && B[k] != null ? ` · 打开时 ${Array.isArray(it) ? fmtV(B[k], it[5]) : B[k]}` : '', iw = row._inert;
    h.innerHTML = `<b>${nm.en}</b> · <b>${nm.cn}</b>${unit} — ${nm.desc}<span class="ph-meta">${rng}${base} · ${row._x ? row._x.e + ' › ' + row._x.m : nm.mcn || nm.tag}</span>`
      + (iw ? `<span class="ph-inert">现在不起作用：${iw}</span>` : '')
      + (nm.ud ? `<span class="ph-d">${nm.ud}</span>` : '') + (nm.rnd ? `<span class="ph-x">随机：${nm.rnd}</span>` : '')
      + (nm.ue ? `<span class="ph-x">UE：${nm.ue}</span>` : '') + (nm.note ? `<span class="ph-x">注意：${nm.note}</span>` : '')
      + sizePxNote(k);
    return;
  }
  const unit = Array.isArray(it) && it[2] ? ` <small>${it[2]}</small>` : '', rng = Array.isArray(it) ? ` · 范围 ${it[3]}–${it[4]}` : '';
  const base = B && B[k] != null ? ` · 打开时 ${Array.isArray(it) ? fmtV(B[k], it[5]) : B[k]}` : '';
  h.innerHTML = `<b>${row._lab}</b>${unit}<span class="ph-meta">${rng}${base}</span>${row._inert ? `<span class="ph-inert">现在不起作用：${row._inert}</span>` : ''}${row._detail ? `<span class="ph-d">${row._detail}</span>` : ''}`;
}
function buildMasterPanel() {
  pviewInit();
  const P = state.P, D = defaultsFor(P.type).P;
  const box = $('#specBox'); if (box && $('#params').contains(box)) $('#specHome').appendChild(box);   // 规格框先放回原处，别跟着旧的面板一起被清掉
  const host = $('#params'); host.innerHTML = ''; panelRows = [];
  // 顶上：搜索 + 只看改过的 + 英文名
  host.insertAdjacentHTML('beforeend', `<div class="ptools"><input type="search" placeholder="搜参数：名字 / 英文名 / 说明里的字" aria-label="搜参数" value="${pview.q.replace(/"/g, '&quot;')}"><label class="pchg" title="只显示和打开时（AI 版 / 你保存的版本）不一样的参数"><input type="checkbox"${pview.changed ? ' checked' : ''}> 只看改过的</label>`
    + `<label class="pchg" title="参数名显示英文名（Cascade / Niagara 的叫法；说明条第一行总有英文）"><input type="checkbox" data-en${pview.en ? ' checked' : ''}> 英文名</label></div>`);
  const qi = host.querySelector('.ptools input[type=search]'), ci = host.querySelector('.ptools .pchg:first-of-type input');
  qi.addEventListener('input', () => { pview.q = qi.value.trim(); refreshVisibility(); });
  qi.addEventListener('keydown', e => { if (e.key === 'Escape' && qi.value) { qi.value = ''; pview.q = ''; refreshVisibility(); e.stopPropagation(); } });
  ci.addEventListener('change', () => { pview.changed = ci.checked; store.set('pChanged', pview.changed); refreshVisibility(); });
  host.querySelector('[data-en]').addEventListener('change', e => { pview.en = e.target.checked; store.set('pEN', pview.en); buildMasterPanel(); });
  // 发射器标签（一次看一个发射器；refreshVisibility 按适用的行显示 / 隐藏、标改过几项）
  const tabs = document.createElement('div'); tabs.className = 'etabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', '发射器'); host.appendChild(tabs);
  p43BlankControls(host, P);
  const place = p43Skeleton(host);
  for (const sec of SCHEMA) {
    for (const it of sec.items) {
      let row;
      const ikey = Array.isArray(it) ? it[0] : it.sel || it.text || (it.info ? 'info:' + it.info : ''), nm = ikey ? pnameOf(sec.sec, ikey, Array.isArray(it) ? (typeof it[1] === 'function' ? it[1](P) : it[1]) : it.label) : null;
      const det = place(sec, it, ikey, nm), ex = emitOf(nm, sec);          // 这一行放进它的发射器 › 模块
      if (Array.isArray(it)) {
        const [k, label, unit, min, max, step] = it, lab = typeof label === 'function' ? label(P) : label, [short0, detail0] = splitLab(lab), short = nm ? p43Label(nm, short0) : short0, detail = nm ? nm.desc : detail0;
        row = slider(det, 'p-' + k + '-' + panelRows.length, short, unit, min, max, step, () => state.P[k], v => { if (TIMING_KEYS.has(k)) setTimingParam(k, v); else { state.P[k] = v; onParam(); } }, D[k], k);
        autoDefRow(row, k, step);
        const kl = row.querySelector('.k'); kl.title = (nm ? `${nm.en} · ${nm.cn}` : short) + (unit ? `（${unit}）` : '') + '；双击恢复默认';
        row._lab = short; row._detail = detail; row._nm = nm;
      } else if (it.sel) {
        const [short0, detail0] = splitLab(it.label), short = nm ? p43Label(nm, short0) : short0, detail = nm ? nm.desc : detail0;
        row = document.createElement('label'); row.className = 'field';
        row.innerHTML = `<span class="fk" title="${(nm ? `${nm.en} · ${nm.cn}` : short).replace(/"/g, '&quot;')}">${short}</span><select></select>`;
        row._lab = short; row._detail = detail; row._nm = nm;
        const s = row.querySelector('select'); for (const [v, l] of it.options) s.add(new Option(l, v));
        s.value = String(it.sel === '_trailTier' ? P.type : P[it.sel]);
        s.addEventListener('change', () => {
          if (it.sel === '_trailTier') { openType(s.value); return; }     // 4.3：升空尾缀一个入口，档位切换 = 打开那一档的模板
          const v = typeof D[it.sel] === 'number' ? +s.value : s.value;
          if (it.sel === 'shellNo') { applyShellLocked(v); buildMasterPanel(); onParam(); return; }
          // 4.4：结尾选「不淡出」→ 序列时长加长到火花约 98% 灭完（只加不减）
          if (it.sel === 'endMode') { state.P.endMode = v; const e = v === 'natural' && typeof sparkTailEnd === 'function' ? sparkTailEnd(state.P) : 0; if (e > +state.P.duration + 0.04 && !(+state.P.cutOut > 0)) { setTimingParam('duration', e); refreshPanelValues(); flash(`序列时长加长到 ${e.toFixed(2)} s（火花灭完）`); } else onParam(); return; }
          state.P[it.sel] = v; onParam();
        });
        row._refresh = () => { s.value = String(it.sel === '_trailTier' ? state.P.type : state.P[it.sel]); };
        det.appendChild(row);
      } else if (it.info === 'specBox') {   // 4.2.6：规格框（贴图尺寸、列 × 行、通道…）放进「帧与贴图」
        row = document.createElement('div'); row.className = 'spechost'; row.dataset.info = 'specBox'; det.appendChild(row);
      } else if (it.info) {   // 只读的结果行（例：「帧与贴图」顶上的「多少帧、怎么装」）
        row = document.createElement('div'); row.className = 'infohost'; row.dataset.info = it.info;
        row._refresh = () => { row.innerHTML = it.info === 'outSummary' && typeof outSummaryHTML === 'function' ? outSummaryHTML() : it.info === 'endInfo' && typeof endInfoHTML === 'function' ? endInfoHTML() : it.info === 'schemeNote' && typeof singleSchemeNote === 'function' ? `<p class="hint endinfo">${singleSchemeNote(state.P)}</p>` : it.info === 'ballInfo' && typeof rtBallInfoHTML === 'function' ? rtBallInfoHTML(state.P) : ''; };
        if (it.info === 'endInfo') row.addEventListener('click', e => { const b = e.target.closest('[data-endfit]'); if (b) { setTimingParam('duration', +b.dataset.endfit); refreshPanelValues(); flash('序列时长已加长到火花灭完'); } });
        row._refresh(); det.appendChild(row);
      } else if (it.text) {
        row = document.createElement('label'); row.className = 'field'; row.innerHTML = `<span class="fk">${nm ? p43Label(nm, it.label) : it.label}</span><input type="text" maxlength="6">`; row._lab = nm ? p43Label(nm, it.label) : it.label; row._detail = nm ? nm.desc : ''; row._nm = nm;
        const inp = row.querySelector('input'); inp.value = P[it.text];
        inp.addEventListener('change', () => { state.P[it.text] = inp.value || '祭'; onParam(); });
        row._refresh = () => { inp.value = state.P[it.text]; };
        det.appendChild(row);
      }
      if (row._lab != null) {      // 4.5.0：参数名上停 1.5 s 出说明、移开消失、点一下钉住（helpBind）
        row._it = it; row._x = ex; row._bm = nm && nm.mcn;
        const name = row.querySelector('.k, .fk'); if (name) { name.classList.add('phelp-on'); helpBind(name, row); }
      }
      panelRows.push([row, it, sec, det]);
    }
  }
  // 模块里按发射器表的先后排（表里常用的在前），再把随机行挂到本体下面
  host.querySelectorAll('section.egrp > details.mod').forEach(d => [...d.children].filter(c => c._x).sort((a, b) => a._x.i - b._x.i).forEach(r => d.appendChild(r)));
  p43RandLinks(); emitTabs(tabs);
  if (!$('#pHelp')) { const h = document.createElement('div'); h.id = 'pHelp'; h.className = 'phelp'; h.setAttribute('aria-live', 'polite'); host.parentElement.insertBefore(h, host.nextSibling);
    h.addEventListener('pointerenter', () => clearTimeout(helpSt.hide)); h.addEventListener('pointerleave', () => { if (!helpSt.pinned) helpSt.hide = setTimeout(() => helpHide(), HELP_LEAVE); });
    h.addEventListener('click', e => { if (e.target.closest('.ph-close')) helpHide(true); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && helpSt.pinned) { helpHide(true); e.stopImmediatePropagation(); } }, true); }
  helpHide(true); panelHelp(null);
  refreshVisibility();
  const MD = defaultsFor(P.type).M;
  const redrawColors = () => { stageEditor($('#stages'), state.M, Math.max(1, Math.ceil(state.P.duration)), null); };
  redrawColors();
  flameChips($('#flames'), () => state.M, redrawColors);
  const mc = $('#matColors'); mc.innerHTML = '';
  colorPair(mc, '渐变图', [['ramp0', '暗'], ['ramp1', '中暗'], ['ramp2', '中亮'], ['ramp3', '亮']], state.M);
  const ms = $('#matSliders'); ms.innerHTML = '<p class=hint>显示强度写入 Color Over Life，不改变灰度贴图。先在「曝光光晕」降低贴图曝光、保留亮部，再在这里补足亮度；合并输出作用于整层；分开输出时两项分别调星头和尾迹。</p>';
  slider(ms, 'm-xw', '变色过渡', 's', 0.01, 0.5, 0.01, () => state.M.xw, v => state.M.xw = v, MD.xw);
  slider(ms, 'm-hi', '显示强度', '×', 0, 20, 0.05, () => state.M.headInt, v => state.M.headInt = v, 1);
  slider(ms, 'm-ti', '尾迹显示强度', '×', 0, 20, 0.05, () => state.M.tailInt, v => state.M.tailInt = v, 1);
  $('#type').value = state.repId ? 'rep:' + state.repId : P.type; $('#mname').value = state.name; syncExport();
  syncTypeButton();
}
function refreshVisibility() {
  pviewInit();
  const P = state.P, q = (pview.q || '').toLowerCase(), B = panelBaseP(), nChg = {}, appl = {};
  $('#suggestExposure').disabled = !!P.exposureLock;
  $('#exposureControls').hidden = isTrail(P) || isPhys(P) || isEmit(P);     // 「建议曝光」只会算空中花型和地面循环
  for (const [row, it, sec, det] of panelRows) {
    // 适用 = 这个花型有这一项（空白发射器没加的部分也算不适用）；适用的发射器才有标签
    const vis = itemVisible(it, P) && !(sec.show && !sec.show(P)) && blankHas(P, row._bm), chg = vis && rowChanged(it, P, B);
    if (vis) appl[det._g] = true;
    row.classList.toggle('chg', chg); if (chg) nChg[det._g] = (nChg[det._g] || 0) + 1;
    // 4.3：不起作用的参数变灰、写原因（不藏：藏了反而找不到）；随机行收在本体参数的「随机」下面
    const key = Array.isArray(it) ? it[0] : it.sel || '', iw = vis && key ? inertWhy(key, P) : '';
    row._inert = iw; row.classList.toggle('inert', !!iw); if (iw) row.title = '现在不起作用：' + iw; else row.removeAttribute('title');
    const folded = row._randOf && !pview.ropen[row._randOf] && !q && !(pview.changed && chg);
    row.hidden = !vis || folded || !rowMatches(row, it, sec, q) || (pview.changed && !chg);
  }
  p43RandSync(P); p43BlankSync(P);
  // 搜索 / 只看改过的时：所有发射器里有结果的都显示、模块自动展开（记 _autoOpen，清空后收回到用户自己的开合）
  const auto = !!(q || pview.changed);
  const autoOpen = (d, on, mine) => { if (on) { if (!d.open) { d._autoOpen = true; d._auto = true; d.open = true; setTimeout(() => d._auto = false, 0); } }
    else if (d._autoOpen) { d._autoOpen = false; d._auto = true; d.open = mine; setTimeout(() => d._auto = false, 0); } };
  document.querySelectorAll('#params details.sec').forEach(det => { det.hidden = ![...det.children].some(c => c.tagName !== 'SUMMARY' && c.tagName !== 'P' && !c.hidden);
    autoOpen(det, auto && !det.hidden, det._key && pview.mopen[det._key] != null ? pview.mopen[det._key] : true); });
  const tab = emitTabNow(appl);
  document.querySelectorAll('#params section.egrp').forEach(g => {
    const e = g.dataset.g, has = [...g.querySelectorAll(':scope > details.sec')].some(d => !d.hidden);
    g.hidden = !has || (!auto && tab !== '全部' && e !== tab);
    const n = nChg[e] || 0, b = g.querySelector('.pg-n'); b.textContent = n ? `${n} 项改过` : ''; b.hidden = !n;
  });
  document.querySelectorAll('#params .etabs [data-e]').forEach(b => { const e = b.dataset.e, n = e === '全部' ? 0 : nChg[e] || 0;
    b.hidden = e !== '全部' && !appl[e]; b.classList.toggle('on', !auto && e === tab); b.setAttribute('aria-selected', String(!auto && e === tab));
    const c = b.querySelector('.et-n'); if (c) { c.textContent = n || ''; c.hidden = !n; } });
  const host = $('#params'), none = host && ![...host.querySelectorAll('section.egrp')].some(g => !g.hidden);
  if (host && none && !host.querySelector('.pempty')) host.insertAdjacentHTML('beforeend', `<p class="pempty hint"></p>`);
  if (host) { const e = host.querySelector('.pempty'); if (e) { e.hidden = !none; e.textContent = pview.changed && !q ? '和打开时比，还没改过参数' : `没有找到「${pview.q}」`; } }
  document.querySelectorAll('#params [data-info=endInfo], #params [data-info=schemeNote], #params [data-info=ballInfo]').forEach(r => r._refresh && r._refresh());
  if (typeof syncScopeResets === 'function') syncScopeResets();     // 4.5.0 改过的模块 / 发射器上的 ↺
  placeSpecBox();
}
// 发射器标签：按发射器表的顺序，每个发射器一个（适用的才显示），最后一个「全部」
function emitTabs(bar) {
  const es = [...document.querySelectorAll('#params section.egrp')].map(g => g.dataset.g);
  bar.innerHTML = es.concat('全部').map(e => { const d = EMIT_DEF[e]; return `<button type="button" role="tab" class="et" data-e="${e}" title="${d ? (d.lv ? d.lv + '：' : '') + d.what : '所有发射器排在一起'}">${e}<span class="et-n" hidden></span></button>`; }).join('');
  bar.querySelectorAll('[data-e]').forEach(b => b.addEventListener('click', () => selectEmitTab(b.dataset.e)));
}
// 现在看哪个发射器：按花型族记住上次选的；没选过 / 这个花型没有它 → 第一个不是「效果」「输出」的发射器
function emitTabFamily() { return isEmit(state.P) ? 'emit' : isTrail(state.P) ? 'trail' : isPhys(state.P) ? 'phys' : familyOf(state.P.type); }
function emitTabNow(appl) {
  const fam = emitTabFamily(), want = pview.tab[fam];
  if (want === '全部' || (want && appl[want])) return want;
  const order = (typeof PEMIT !== 'undefined' ? PEMIT.E : []).map(e => e.n).filter(e => appl[e]);
  return order.find(e => e !== '效果' && e !== '输出') || order[0] || '全部';
}
// 点标签：清掉搜索 / 只看改过的（不然点了看不到那一页），换到那个发射器、滚到顶。不改参数
function selectEmitTab(e) {
  pviewInit();
  pview.tab[emitTabFamily()] = e; store.set('pEmitTab', pview.tab);
  if (pview.q || pview.changed) { pview.q = ''; pview.changed = false; store.set('pChanged', false); const i = $('#params .ptools input[type=search]'); if (i) i.value = ''; const c = $('#params .ptools .pchg input'); if (c) c.checked = false; }
  refreshVisibility();
  const bar = $('#params .etabs'), right = $('#right'), head = document.querySelector('.right-head');
  if (bar && right && bar.getBoundingClientRect().top < right.getBoundingClientRect().top + (head ? head.offsetHeight : 0)) right.scrollTop += bar.getBoundingClientRect().top - right.getBoundingClientRect().top - (head ? head.offsetHeight : 0) - 8;
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
      const [k, , , min, max, step] = it; if (state.locks.has(k) || ['duration', 'fpsFloor', 'shutter', 'segAt', 'cellPad', 'loopT', 'riseH', 'exposure', 'exposureTarget'].includes(k)) continue;
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
// 组合用的母版：2048（1024 时每帧只有 128 像素，组合页糊得没法看——用户 2026-09-30）；组合页默认实时模拟，贴图只在「导出效果」页用
// 组合用的母版：迭代 / 正式库条目（rep:）保持条目自己的输出方式（合并输出 = 引擎里的样子：灰度查 Ramp），这样组合页「导出效果」和导出的素材一致；
// 花型库默认母版仍用分开输出（组合里星头 / 尾巴亮度可以分开调）。window.FW_LIB_TEX：云端软件渲染自检时临时改小贴图。
// 4.2.6：多层里每层的贴图尺寸、格子也按这一层自己的（不再强制 2048 / 最多 4×4；单格 ≥ 512 由取帧计划保证）
const libP = (P, keep) => ({ ...P, texW: window.FW_LIB_TEX || P.texW || 2048, texH: window.FW_LIB_TEX || P.texH || 2048, cols: P.cols, rows: P.rows, chans: 4, outMode: keep && P.outMode ? P.outMode : 'combined', form: 'master', zoom: P.zoom === 'on' ? 'on' : 'off' });
const defaultLibName = t => TYPE_NAMES[t].replace(/（.*）/, '') + ' · 默认';
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
    if (ed && e) { const sig = JSON.stringify([ed.P, ed.M]); if (e.editSig !== sig) { dropLibBake(e); state.lib.splice(state.lib.indexOf(e), 1); } }
  }
  const need = [...new Set(keys)].filter(k => !libByType(k));
  for (let i = 0; i < need.length; i++) {
    const k = need[i];
    if (k.startsWith('rep:')) {
      const id = k.slice(4), r = REPLICA_BY_ID[id], ed = state.layerEdits && state.layerEdits[id], { P, M } = ed ? { P: migrate37(ed.P), M: ed.M } : replicaPM(id);
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
// 4.2.3（走查 A3）：同一个母版被第二层用到时复制一份（参数、颜色各自独立；贴图先共用，哪层改了哪层自己重烘）
function libFork(e) {
  const base = e.name.replace(/ #\d+$/, ''); let n = 2; while (state.lib.some(x => x.name === `${base} #${n}`)) n++;
  const f = { ...e, name: `${base} #${n}`, P: structuredClone(e.P), M: structuredClone(e.M), fork: true, pRev: 0, rev: 0, bakeRev: 0 };
  delete f.rep; delete f.editSig; state.lib.push(f); return f;
}
function layerEntryFor(e, used) { return used.has(e) || state.layers.some(L => L.lib === e.name) ? libFork(e) : e; }
// 4.2.3（走查 A2）：保存的版本里不是条目的层（默认母版、编辑器里调过的层）带着自己的参数，恢复时按它重烘，不再变回「默认」
async function libOwn(src) {
  const t = src.type || src.P.type, base = (TYPE_NAMES[t] || t).replace(/（.*）/, '') + ' · 我的'; let n = 1; while (state.lib.some(x => x.name === `${base} ${n}`)) n++;
  const P = migrate37(structuredClone(src.P)), M = structuredClone(src.M || defaultsFor(t).M);
  const b = await bake(libP(P, true), 1, p => busy(true, `烘焙你的层：${base} ${n}`, p)); busy(false);
  const e = { name: `${base} ${n}`, type: t, P, M, bake: b, own: true }; state.lib.push(e); return e;
}
async function applyCombo(c) {
  await ensureLibEntries(c.layers.filter(l => !l.src).map(l => l.m));
  const used = new Set(), layers = [];
  for (const l of c.layers) {
    let e = l.src ? await libOwn(l.src) : libByType(l.m);
    if (!l.src && used.has(e)) e = libFork(e);
    used.add(e);
    const { m, src, ...rest } = l; if (rest.stages) rest.stages = rest.stages.map(s => [...s]);
    layers.push(newLayer(e, rest));
  }
  state.layers = layers;
  for (const e of used) if (e.bake && e.bake.meta && !e.bake.meta.fitted && e.bake.meta.plan && typeof queueLayerRefine === 'function') queueLayerRefine(e);   // 4.2.5：各层在后台收紧取景
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
    slider(card, `l${i}-hi`, '显示强度', '×', 0, 20, 0.05, () => L.headInt, v => L.headInt = v, 1);
    slider(card, `l${i}-ti`, '尾迹显示强度', '×', 0, 20, 0.05, () => L.tailInt, v => L.tailInt = v, 1);
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
  if (!state.layers.length) host.innerHTML = '<p class="note">还没有图层。</p>';
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
    if (typeof wbAutoExport === 'function') wbAutoExport(pk);     // 4.2.10：存进这个效果的「版本」（导出时）
    flash('已导出组合素材包 ' + name);
  } catch (e) { console.error(e); flash('组合导出失败：' + e.message, true); }
  finally { busy(false); }
}
