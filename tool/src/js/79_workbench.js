// =====================================================================
//  工作台（2026-10-02 用户 07:43 / 07:47）：每个条目都是完整资产——
//  · 多层效果一个查看器：右栏「观察图层」选整体或某一层，选中层下面就是这一层的完整参数，画面一直是整朵；独看 / 静音只影响观察
//  · 画面上方资产栏：看哪个版本（AI 版 / 你保存的版本）、保存、另存为、导出 / 导入配方文件、复制改动、导出素材包
//  你的版本存在这台电脑的浏览器里（localStorage「mySaves」），按效果分；导出配方文件可以长期保留或发给 AI。
// =====================================================================

// ---------------- 观察图层 ----------------
function layerEntryOf(L) { return L && state.lib.find(x => x.name === L.lib); }
function layerName(i) {
  const L = state.layers[i], e = layerEntryOf(L), names = (lib.review && lib.review.kind === 'combo' && lib.review.layerNames) || [];
  const le = e && e.rep ? FW_REVIEW_LIST.find(x => x.id === e.rep) : null;
  return names[i] || (le ? le.name : L ? L.lib : '');
}
function buildLayerCard() {
  const box = $('#layerCard'), on = state.tab === 'combo' && state.layers.length > 0 && !state.showcase;
  box.hidden = !on; if (!on) { box.innerHTML = ''; return; }
  const v = state.layerView;
  const rows = state.layers.map((L, i) => {
    const e = layerEntryOf(L), le = e && e.rep ? FW_REVIEW_LIST.find(x => x.id === e.rep) : null;
    const dur = e && e.bake ? bakeTotal(e.bake) / (L.rate || 1) : 0, solo = v.solo === i, mute = v.mute.includes(i);
    return `<div class="lrow${state.comboSel === i ? ' cur' : ''}${mute || (v.solo >= 0 && !solo) ? ' muted' : ''}" data-i="${i}" tabindex="0" role="button">
      ${le ? thumbHTML(le) : `<span class="th" style="${e ? typeThumbStyle(e.type) : ''}"></span>`}
      <span class="tx"><b>${i + 1} · ${layerName(i)}</b><small>开始 <input class="lst" type="number" min="0" max="10" step="0.01" value="${(+L.delay || 0).toFixed(2)}" data-st="${i}" aria-label="第 ${i + 1} 层开始时间"> s · 时长 ${dur.toFixed(2)} s${e && e.editSig ? ' · <em>已调</em>' : ''}</small></span>
      <span class="lb"><button type="button" class="mini${solo ? ' on' : ''}" data-solo="${i}" aria-pressed="${solo}">独看</button><button type="button" class="mini${mute ? ' on' : ''}" data-mute="${i}" aria-pressed="${mute}">静音</button></span></div>`;
  });
  box.innerHTML = `<div class="lc-h"><b>观察图层</b><small>点一层改它的参数（画面仍是整朵）。独看 / 静音只影响观察。</small></div>
    <div class="lrow whole${state.comboSel < 0 ? ' cur' : ''}" data-i="-1" tabindex="0" role="button"><span class="th whole">${state.layers.length}</span><span class="tx"><b>整体</b><small>各层的位置、延迟、时间倍率、颜色</small></span></div>${rows.join('')}`;
  box.querySelectorAll('.lrow').forEach(r => {
    const go = ev => { if (ev.target.closest('button,input')) return; selectComboLayer(+r.dataset.i); };
    r.addEventListener('click', go); r.addEventListener('keydown', ev => { if (ev.key === 'Enter') go(ev); });
  });
  box.querySelectorAll('[data-st]').forEach(inp => inp.addEventListener('change', () => { const i = +inp.dataset.st, L = state.layers[i]; L.delay = clamp(+inp.value || 0, 0, 10); if (state.comboSel === i) buildLayerHead(i); else if (state.comboSel < 0) buildComboPanel(); buildLayerCard(); }));
  box.querySelectorAll('[data-solo]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.solo; v.solo = v.solo === i ? -1 : i; buildLayerCard(); }));
  box.querySelectorAll('[data-mute]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.mute; v.mute = v.mute.includes(i) ? v.mute.filter(x => x !== i) : [...v.mute, i]; buildLayerCard(); }));
}
function selectComboLayer(i) {
  if (state.tab !== 'combo') return;
  const L = state.layers[i], e = layerEntryOf(L);
  if (i >= 0 && !e) return;
  state.comboSel = i;
  if (i >= 0) {
    // 参数面板直接绑这一层：state.P = 这层的模拟参数，state.M = 这层在整朵里的颜色（组合层 L，和单层的颜色字段同名）
    state.P = e.P; state.M = L; state.repId = e.rep || null; state.activeStage = 0;
    state.gen++; state.dirty = false; state.failedGen = -1; state.bakeError = null; syncBakeError();
    buildMasterPanel(); buildLayerHead(i);
    if (e.bake) showStats(e.bake);
  } else buildComboPanel();
  syncComboPanels(); buildLayerCard();
  $('#right').scrollTop = 0;
}
function buildLayerHead(i) {
  const L = state.layers[i], host = $('#layerHead'); host.innerHTML = '';
  host.insertAdjacentHTML('beforeend', `<div class="lh-t"><button class="btn mini" type="button" id="lhBack">← 整体</button><b>正在调：第 ${i + 1} 层 · ${layerName(i)}</b></div>
    <p class="hint">下面是这一层的全部参数。改了只重烘这一层，画面仍是整朵；「贴图」视图显示这一层的贴图。颜色（预览材质）改的是这一层在整朵里的颜色。</p>`);
  const pos = document.createElement('details'); pos.className = 'sec'; pos.open = true; pos.innerHTML = '<summary>在整朵里的位置</summary>'; host.appendChild(pos);
  slider(pos, `lh${i}-scale`, '缩放', '×', 0.1, 6, 0.01, () => L.scale, v => L.scale = v, 1);
  slider(pos, `lh${i}-delay`, '延迟', 's', 0, 10, 0.01, () => L.delay, v => L.delay = v, 0);
  slider(pos, `lh${i}-rate`, '时间倍率', '×', 0.3, 2, 0.01, () => L.rate, v => L.rate = v, 1);
  const mir = document.createElement('label'); mir.className = 'check'; mir.innerHTML = '<input type="checkbox"> 水平镜像';
  const cb = mir.querySelector('input'); cb.checked = !!L.mirror; cb.addEventListener('change', () => L.mirror = cb.checked); pos.appendChild(mir);
  host.querySelector('#lhBack').addEventListener('click', () => selectComboLayer(-1));
}
function syncComboPanels() {
  const combo = state.tab === 'combo', lay = combo && state.comboSel >= 0;
  if (combo) { $('#pMaster').hidden = !lay; $('#pCombo').hidden = lay; }
  $('#pMaster').classList.toggle('layermode', lay); $('#layerHead').hidden = !lay;
  $('#pCombo').classList.toggle('effmode', combo && !!(lib.review && lib.review.kind === 'combo'));
}

// ---------------- 你的版本（保存 / 切换 / 文件） ----------------
const wb = { key: '', entry: null, src: { kind: 'ai' }, sig: '', arm: 0 };
function wbKey() {
  if (lib.review && lib.review.layerOf) return 'rv:' + lib.review.id;
  if (lib.effect) return 'ef:' + lib.effect.key;
  if (lib.review) return 'rv:' + lib.review.id;
  if (lib.formal) return 'rep:' + lib.formal.id;
  return lib.key || '';
}
function wbBaseId() { return lib.review ? lib.review.id : lib.formal ? lib.formal.id : lib.key === 'combo' ? '组合编辑器' : state.P.type; }
const wbAll = () => store.get('mySaves', {});
const wbList = () => (wbAll()[wb.key] || []);
function wbPut(list) { const all = wbAll(); all[wb.key] = list; store.set('mySaves', all); }
function wbSnap() {
  if (state.tab === 'combo') return { kind: 'combo', name: state.comboName, layers: state.layers.map(L => { const e = layerEntryOf(L) || {}; const { lib: _l, ...Lr } = L; return { id: e.rep || null, type: e.type || null, L: structuredClone(Lr), P: e.P ? structuredClone(e.P) : null, M: e.M ? structuredClone(e.M) : null }; }) };
  return { kind: 'single', P: structuredClone(state.P), M: structuredClone(state.M), repId: state.repId || null };
}
function wbSig() { try { return JSON.stringify(wbSnap()); } catch (e) { return ''; } }
const wbIdle = () => !state.baking && !state.dirty && $('#busy').hidden && (state.tab !== 'combo' || (state.layers.length && state.layers.every(L => { const e = layerEntryOf(L); return e && e.bake; })));
// 打开 / 换版本后，等烘焙稳定了再记「没改过」的样子（烘焙会自动补一些派生字段，不算你的改动）
function wbArm() {
  const n = ++wb.arm; wb.sig = '';
  const tick = () => { if (n !== wb.arm) return; if (wbIdle()) { wb.sig = wbSig(); wbSync(); } else setTimeout(tick, 400); };
  setTimeout(tick, 300);
}
function wbVisible() { return !state.showcase && !!(lib.review ? lib.review.kind !== 'queued' : lib.formal || /^(type:|combo$)/.test(lib.key || '')); }
function wbRefresh() {
  const k = wbKey();
  if (k !== wb.key || lib.review !== wb.entry) { wb.key = k; wb.entry = lib.review; wb.src = { kind: 'ai' }; wbArm(); }
  wbSync();
}
function wbSync() {
  const bar = $('#assetBar'); bar.hidden = !wbVisible(); if (bar.hidden) return;
  const ef = lib.effect, e = lib.review, combo = state.tab === 'combo';
  $('#abName').textContent = ef ? ef.名 : e ? e.name : lib.formal ? lib.formal.name : lib.key === 'combo' ? '组合编辑器' : TYPE_NAMES[state.P.type] || '';
  $('#abSub').textContent = [wbBaseId(), combo ? state.layers.length + ' 层' : '单层', ef ? ef.阶段 : lib.formal ? '正式库' : e ? '条目' : '花型模板'].join(' · ');
  const th = ef && ef.thumb ? `<i style="background-image:url(${ef.thumb})"></i>` : '';
  const thHost = $('#abThumb'); if (thHost.dataset.k !== wb.key) { thHost.dataset.k = wb.key; thHost.innerHTML = th || (e ? thumbHTML(e).replace(/^<span class="th"/, '<span class="th in"') : `<span class="th in" style="${typeThumbStyle(state.P.type)}"></span>`); }
  const list = wbList(), sel = $('#abSrc'), cur = wb.src.kind === 'mine' ? wb.src.id : 'ai';
  const opts = [['ai', `AI 版 · ${wbBaseId()}`], ...list.map(s => [s.id, `我的 · ${s.name}（${s.at.slice(5)}）`])];
  const html = opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  if (sel.dataset.h !== html) { sel.innerHTML = html; sel.dataset.h = html; }
  sel.value = cur;
  const changed = !!wb.sig && wbSig() !== wb.sig;
  $('#abChg').hidden = !changed; $('#abChg').textContent = wb.src.kind === 'mine' ? '参数已变 · 未保存到「' + ((list.find(x => x.id === wb.src.id) || {}).name || '') + '」' : '参数已变 · 未保存'; wb.changed = changed;
  $('#abSave').classList.toggle('primary', changed); $('#abSave').title = wb.src.kind === 'mine' ? `覆盖保存「${(list.find(s => s.id === wb.src.id) || {}).name || ''}」` : '存成你的一个版本（起个名字）';
  $('#abRename').hidden = $('#abDelete').hidden = wb.src.kind !== 'mine';
}
setInterval(() => { if (!document.hidden && !$('#assetBar').hidden) wbSync(); }, 1000);

function wbNow() { return new Date().toLocaleString('zh-CN', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-'); }
function wbSave(asNew) {
  const list = wbList(), mine = wb.src.kind === 'mine' && list.find(s => s.id === wb.src.id);
  let it = !asNew && mine;
  if (!it) {
    const name = prompt('给这个版本起个名字（存在这台电脑的浏览器里）', `我的 ${list.length + 1}`);
    if (name == null) return;
    it = { id: Date.now().toString(36), name: name.trim() || `我的 ${list.length + 1}` }; list.push(it);
  }
  Object.assign(it, { at: wbNow(), base: wbBaseId(), baseVer: lib.review && lib.review.ver || '', snap: wbSnap() });
  wbPut(list); wb.src = { kind: 'mine', id: it.id }; wb.sig = wbSig(); wbSync(); renderLib();
  flash(`已保存「${it.name}」（这台电脑的浏览器里；想长期留或发给 AI 用「⋯ → 导出配方文件」）`);
}
// 回到 AI 版：丢掉这个效果里调过的层，重新打开条目
async function wbLoadAI() {
  const e = lib.review;
  if (state.layerEdits) {
    const ids = e && e.kind === 'combo' ? e.layerIds || [] : e ? [e.id] : [];
    for (const id of ids) { delete state.layerEdits[id]; const le = state.lib.find(x => x.rep === id); if (le && le.editSig) { disposeBake(le.bake); state.lib.splice(state.lib.indexOf(le), 1); } }
  }
  if (e) await openReview(e, lib.effect); else if (lib.formal) openFormal(lib.formal, lib.effect); else if ((lib.key || '').startsWith('type:')) openType(lib.key.slice(5));
  wb.src = { kind: 'ai' }; wbArm(); wbSync();
}
async function wbLoad(id) {
  if (id === 'ai') return wbLoadAI();
  const s = wbList().find(x => x.id === id); if (!s) return;
  await wbApply(s.snap); wb.src = { kind: 'mine', id }; wbArm(); wbSync(); flash(`正在看你的版本「${s.name}」`);
}
async function wbApply(snap) {
  if (snap.kind === 'combo') {
    if (state.tab !== 'combo') { flash('这个版本是多层效果，当前打开的是单层', true); return; }
    state.layerEdits = state.layerEdits || {};
    for (const x of snap.layers) if (x.id && x.P) state.layerEdits[x.id] = { P: structuredClone(x.P), M: structuredClone(x.M) };
    state.comboSel = -1; syncComboPanels();
    await applyCombo({ name: snap.name || state.comboName, layers: snap.layers.map(x => ({ m: x.id ? 'rep:' + x.id : x.type, ...structuredClone(x.L) })) });
  } else {
    if (state.tab === 'combo') { flash('这个版本是单层，当前打开的是多层效果', true); return; }
    state.P = structuredClone(snap.P); state.M = structuredClone(snap.M); state.repId = snap.repId || state.repId;
    buildMasterPanel(); onParam();
  }
}
// 和 AI 版比，列出改动（层 / 参数：旧 → 新），发给 AI 用
function wbDiff() {
  const out = [], fmt = v => typeof v === 'number' ? +v.toFixed(4) : JSON.stringify(v);
  const cmp = (a, b, pre) => { for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) { if (k === 'lib') continue; const x = (a || {})[k], y = (b || {})[k]; if (JSON.stringify(x) !== JSON.stringify(y)) out.push(`${pre}${k}：${fmt(x)} → ${fmt(y)}`); } };
  const e = lib.review;
  if (state.tab === 'combo' && e && e.kind === 'combo') {
    state.layers.forEach((L, i) => {
      const le = layerEntryOf(L), id = le && le.rep, oL = (e.combo.layers || [])[i] || {}, nm = `第 ${i + 1} 层（${layerName(i)}${id ? ' · ' + id : ''}）`;
      const { m: _m, ...o } = oL, base = newLayer({ M: (id && REPLICA_BY_ID[id] ? replicaPM(id).M : le.M) }, structuredClone(o));
      const { lib: _l, ...cur } = L; delete base.lib; cmp(base, cur, nm + ' 整朵 · ');
      if (id && REPLICA_BY_ID[id]) cmp(replicaPM(id).P, le.P, nm + ' 参数 · ');
    });
  } else {
    const id = state.repId, base = id && REPLICA_BY_ID[id] ? replicaPM(id) : defaultsFor(state.P.type);
    cmp(base.P, state.P, '参数 · '); cmp(base.M, state.M, '颜色 · ');
  }
  return out;
}
async function wbCopyDiff() {
  const d = wbDiff(), nm = $('#abName').textContent;
  const t = d.length ? `${nm}（基于 ${wbBaseId()}，版本 ${(lib.review && lib.review.ver) || '—'}）我改过的地方：\n` + d.map(x => '- ' + x).join('\n') : '';
  if (!t) { flash('和 AI 版比没有改动'); return; }
  let ok = false; try { await navigator.clipboard.writeText(t); ok = true; } catch (e) { }
  $('#updList').innerHTML = `<section class="upd-it new"><h3>我的改动${ok ? '（已复制，直接粘贴到对话里）' : '（请手动全选复制）'}</h3><pre style="white-space:pre-wrap;font:12.5px/1.6 var(--mono)">${t.replace(/</g, '&lt;')}</pre></section>`;
  $('#updDlg').hidden = false;
}
function wbExportFile() {
  const s = wb.src.kind === 'mine' ? wbList().find(x => x.id === wb.src.id) : null;
  const doc = { format: 'fwl.recipe/1', key: wb.key, name: s ? s.name : 'AI 版', base: wbBaseId(), baseVer: lib.review && lib.review.ver || '', at: wbNow(), baker: VERSION, snap: wbSnap(), changes: wbDiff() };
  const fn = `${(wbBaseId() + '_' + doc.name).replace(/[\\/:*?"<>| ]+/g, '_')}.json`;
  download(new Blob([JSON.stringify(doc, null, 1)], { type: 'application/json' }), fn); flash('已导出配方文件 ' + fn);
}
function wbImportFile(file) {
  const rd = new FileReader();
  rd.onload = async () => {
    try {
      const doc = JSON.parse(rd.result); if (doc.format !== 'fwl.recipe/1' || !doc.snap) throw new Error('不是烘焙器导出的配方文件');
      if ((doc.snap.kind === 'combo') !== (state.tab === 'combo')) throw new Error(doc.snap.kind === 'combo' ? '这是多层效果的配方，请先打开那个效果' : '这是单层的配方，当前打开的是多层效果');
      const list = wbList(), it = { id: Date.now().toString(36), name: (doc.name || '导入') + '（导入）', at: wbNow(), base: doc.base, baseVer: doc.baseVer, snap: doc.snap };
      list.push(it); wbPut(list); renderLib(); await wbLoad(it.id);
    } catch (e) { flash('导入失败：' + e.message, true); }
  };
  rd.readAsText(file);
}
function initWorkbench() {
  $('#abSrc').addEventListener('change', e => wbLoad(e.target.value));
  $('#abSave').addEventListener('click', () => wbSave(false));
  $('#abSaveAs').addEventListener('click', () => wbSave(true));
  $('#abDeliv').addEventListener('click', () => toggleDeliv());
  initStage();
  const close = () => document.querySelector('.ab-more').removeAttribute('open');
  $('#abCopyDiff').addEventListener('click', () => { close(); wbCopyDiff(); });
  $('#abExportFile').addEventListener('click', () => { close(); wbExportFile(); });
  $('#abImportFile').addEventListener('click', () => { close(); $('#abFile').click(); });
  $('#abFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) wbImportFile(f); e.target.value = ''; });
  $('#abRename').addEventListener('click', () => { close(); const list = wbList(), s = list.find(x => x.id === wb.src.id); if (!s) return; const n = prompt('新名字', s.name); if (n == null) return; s.name = n.trim() || s.name; wbPut(list); wbSync(); renderLib(); });
  $('#abDelete').addEventListener('click', () => { close(); const list = wbList(), s = list.find(x => x.id === wb.src.id); if (!s || !confirm(`删除你的版本「${s.name}」？（不影响 AI 版）`)) return; wbPut(list.filter(x => x !== s)); renderLib(); wbLoadAI(); });
  $('#pReview').addEventListener('click', e => { const n = e.target.closest('.rnote'); if (n) n.classList.toggle('full'); });
  document.addEventListener('click', e => { const m = document.querySelector('.ab-more'); if (m && m.open && !m.contains(e.target)) m.removeAttribute('open'); });
}


// =====================================================================
//  画面区（按用户的浏览器草稿，2026-10-02 08:36 用户要求交互一次做完）：
//  画面标题（看的是哪个版本 · 哪个视图 · 整体 / 哪一层）、画面工具（构图网格 / 记录当前帧 / 展开大画面）、
//  画面脚注（平台 · 单格 · 帧数 · 张数 | 30 fps · tick）、时间轴（±1 tick、循环 / 播放一遍、开花 / 展开 / 衰减、每层时段条）、
//  查看交付（素材包里的每个文件：层、段、平台、单格、延迟）、通过门槛（独看 / 静音、显示曝光、改过参数时不能通过）
// =====================================================================
const stage2 = { deliv: false, tlSig: '', last: 0 };
const VIEW_NAMES = { live: '实时模拟', export: '引擎回放', atlas: '贴图' };
function curLayerBakes() {
  if (state.tab === 'combo') return state.layers.map((L, i) => { const e = layerEntryOf(L); return { i, L, e, b: e && e.bake, name: layerName(i) }; });
  return [{ i: 0, L: { delay: 0, rate: 1, scale: 1 }, e: null, b: state.bake, name: state.repId ? (REPLICA_BY_ID[state.repId] || {}).name || state.name : TYPE_NAMES[state.P.type] }];
}
function srcLabel() {
  if (!wbVisible()) return '';
  const s = wb.src.kind === 'mine' && wbList().find(x => x.id === wb.src.id);
  return (s ? `我的「${s.name}」` : `AI 版 ${wbBaseId()}`) + (wb.changed ? ' · 参数已变' : '');
}
function scopeLabel() {
  if (state.tab !== 'combo') return '';
  const v = state.layerView;
  if (state.view === 'atlas') return ` · 第 ${comboAtlasLayer() + 1} 层贴图`;
  if (v.solo >= 0) return ` · 独看第 ${v.solo + 1} 层（仅观察）`;
  if (v.mute.length) return ` · 静音 ${v.mute.map(i => i + 1).join('、')} 层（仅观察）`;
  return state.comboSel >= 0 ? ` · 整体（正在调第 ${state.comboSel + 1} 层）` : ' · 整体 · 全部层';
}
function specLabel() {
  const plat = state.platform === 'mobile' ? '手机' : 'PC';
  const bs = curLayerBakes().filter(x => x.b), pick = state.tab === 'combo' ? bs.find(x => x.i === comboAtlasLayer()) || bs[0] : bs[0];
  if (!pick) return plat + ' · 还没烘好';
  const b = previewBake(pick.b) || pick.b, parts = bakeParts(b), F = parts.reduce((n, s) => n + s.meta.L.F, 0), L = b.meta.L;
  return `${plat} · 单格 ${Math.round(L.cellW)} px · ${F} 帧 · ${parts.length} 张${state.tab === 'combo' ? `（第 ${pick.i + 1} 层）` : ''}`;
}
// 开花 / 展开 / 衰减：取主层（最大的一层）的帧预算：展开 = 开始淡出的时刻（花开到最大），衰减 = 淡出段中间
function jumpTimes() {
  const xs = curLayerBakes().filter(x => x.b && x.b.meta);
  if (!xs.length) { const D = curDuration(); return { open: 0, full: 0.4 * D, fade: 0.75 * D }; }
  const main = xs.reduce((a, x) => ((+x.L.scale || 1) > (+a.L.scale || 1) ? x : a), xs[0]), m = main.b.meta, r = +main.L.rate || 1, d = +main.L.delay || 0;
  const end = bakeTotal(main.b), fa = m.budget && isFinite(m.budget.fadeAt) ? m.budget.fadeAt : 0.6 * end;
  return { open: d, full: d + fa / r, fade: d + (fa + (end - fa) / 2) / r };
}
function buildTlBars() {
  const D = curDuration(), rows = curLayerBakes();
  const sig = D.toFixed(3) + '|' + rows.map(x => [x.name, +x.L.delay || 0, +x.L.rate || 1, x.b ? bakeTotal(x.b).toFixed(3) : '-', state.tab !== 'combo' || layerShown(x.i)].join(',')).join(';') + '|' + state.tab;
  if (sig === stage2.tlSig) return; stage2.tlSig = sig;
  const host = $('#tlBars');
  if (state.tab === 'asset' || state.showcase || !rows.length) { host.innerHTML = ''; return; }
  host.innerHTML = rows.map(x => {
    const a = (+x.L.delay || 0) / D * 100, w = x.b ? bakeTotal(x.b) / (+x.L.rate || 1) / D * 100 : 0;
    return `<div class="tlb${state.tab !== 'combo' || layerShown(x.i) ? '' : ' off'}"><span class="tlb-n" title="${x.name}">${state.tab === 'combo' ? x.i + 1 + ' · ' : ''}${x.name}</span><span class="tlb-t" data-i="${x.i}"><i style="left:${a}%;width:${Math.min(100 - a, w)}%"></i></span></div>`;
  }).join('') + '<span class="tlb-ph" aria-hidden="true"></span>';
  host.querySelectorAll('.tlb-t').forEach(t => t.addEventListener('pointerdown', ev => { const r = t.getBoundingClientRect(); state.t = clamp((ev.clientX - r.left) / r.width, 0, 1) * curDuration(); }));
}
// 每帧调用（80_render 的主循环）：tick 号、播放头；标题 / 脚注 / 时段条 / 通过门槛每 1/4 秒刷新
function stageTick(D) {
  $('#vfTick').textContent = `30 fps · tick ${Math.floor(engineTick(Math.min(state.t, D)) * 30 + 1e-6)}`;
  const host = $('#tlBars'), tr = host.querySelector('.tlb-t');
  if (tr) host.style.setProperty('--ph', `${tr.offsetLeft + clamp(state.t / D, 0, 1) * tr.offsetWidth}px`);
  const now = performance.now(); if (now - stage2.last < 250) return; stage2.last = now;
  $('#vfTitle').textContent = `${srcLabel() || (lib.key === 'combo' ? '组合编辑器' : '')}${srcLabel() ? ' · ' : ''}${state.tab === 'asset' ? '贴图回放' : VIEW_NAMES[state.view] || ''}${scopeLabel()}`;
  $('#vfSpec').textContent = state.tab === 'asset' ? '' : specLabel();
  buildTlBars(); syncGate();
  const ab = $('#abState'); if (ab) { const st = state.bakeError ? ['bad', '烘焙失败 · 保留上次成功'] : state.baking || state.dirty ? ['busy', '烘焙中…'] : ['', '']; ab.className = 'ab-state ' + st[0]; ab.textContent = st[1]; }
  if (stage2.deliv && !$('#delivView').hidden && stage2.delivSig !== stage2.tlSig) renderDeliv();
}
// 通过门槛：只影响「通过」按钮（意见、要改照常）
function gateReasons() {
  const r = [], v = state.layerView || { solo: -1, mute: [] };
  if (state.tab === 'combo' && (v.solo >= 0 || v.mute.length)) r.push('正在独看 / 静音：恢复整体后再验收');
  if (Math.abs(state.expo - 1) > 1e-3) r.push('显示曝光不是 1×');
  if (wb.src.kind === 'mine' || wb.changed) r.push('你看的是改过的参数 / 你的版本；「通过」针对 AI 版，切回 AI 版再点');
  return r;
}
function syncGate() {
  const r = gateReasons(), box = $('#pReview');
  box.querySelectorAll('.okb').forEach(b => { b.disabled = !!r.length && b.getAttribute('aria-pressed') !== 'true'; b.title = r.length ? '现在不能通过：' + r.join('；') : '通过（整体达到预期）'; });
  box.querySelectorAll('.gate').forEach(g => { g.hidden = !r.length; g.textContent = r.length ? '不能通过：' + r.join('；') : ''; });
}
// 记录当前帧：把观察条件写进意见（审阅页的意见框），没有条目时复制到剪贴板
function frameContext() {
  return `[+${engineTick(state.t).toFixed(2)} s · tick ${Math.floor(engineTick(state.t) * 30 + 1e-6)} · ${state.tab === 'asset' ? '贴图回放' : VIEW_NAMES[state.view]} · ${state.platform === 'mobile' ? '手机' : 'PC'} · ${state.disp === 'game' ? state.dist + ' m' : state.disp === 'px' ? '1:1 像素' : '适应窗口'}${scopeLabel().replace(/^ · /, ' · ')} · ${srcLabel() || '花型模板'}${lib.review && lib.review.ver ? ' · 版本 ' + lib.review.ver : ''}]`;
}
async function noteFrame() {
  const t = frameContext(), ta = document.querySelector('#rvTxt');
  if (ta && lib.review && lib.review.kind !== 'queued') {
    lib.pane = 'review'; syncPtabs();
    ta.value = (ta.value ? ta.value.replace(/\s*$/, '\n') : '') + t + ' ';
    ta.dispatchEvent(new Event('input')); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    flash('已把当前帧写进意见，接着写哪里不对');
  } else { try { await navigator.clipboard.writeText(t); flash('已复制当前帧的观察条件'); } catch (e) { flash(t); } }
}
// 查看交付：素材包里的每个文件（按当前烘焙推算；导出时手机版独立烘焙）
function delivName() {
  if (state.tab === 'combo') { const rv = lib.review && lib.review.kind === 'combo' ? lib.review.id : ''; return (rv || state.comboName || 'Combo').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'Combo'; }
  return state.name;
}
function renderDeliv() {
  const host = $('#delivView'), name = delivName(), rows = [], combo = state.tab === 'combo';
  for (const x of curLayerBakes()) {
    if (!x.b) { rows.push(`<tr><td colspan="4" class="dim">${x.name}：还没烘好</td></tr>`); continue; }
    const parts = bakeParts(x.b), delay = +x.L.delay || 0, rate = +x.L.rate || 1, ln = combo ? comboLayerName(name, x.i) : name, mn = combo ? comboLayerName(name + '_Mobile', x.i) : name + '_Mobile';
    let mobCell = '—'; try { const mp = mobileParams({ ...x.b.P, cols: x.b.meta.L.cols, rows: x.b.meta.L.rows }); mobCell = Math.round(layoutOf(mp).cellW) + ' px'; } catch (e) { }
    if (combo) rows.push(`<tr class="grp"><td colspan="4">第 ${x.i + 1} 层 · ${x.name}${layerShown(x.i) ? '' : '（观察里隐藏了，导出照旧包含）'}</td></tr>`);
    parts.forEach((s, k) => {
      const seg = bakeSegmentName(x.b, k), d0 = delay + (s.meta.t0 || 0) / rate, tag = seg ? '_' + seg : '';
      const tex = s.tail ? ['Head', 'Tail'] : [''];
      for (const tt of tex) {
        rows.push(`<tr><td>${TN(ln, joinPart(seg, tt))}.png</td><td>PC · 单格 ${Math.round(s.meta.L.cellW)} px · ${s.meta.L.F} 帧</td><td>${d0.toFixed(2)} s</td><td>${(s.meta.duration / rate).toFixed(2)} s</td></tr>`);
        rows.push(`<tr><td>${TN(mn, joinPart(seg, tt))}.png</td><td>手机 · 单格 ${mobCell}</td><td>${d0.toFixed(2)} s</td><td>${(s.meta.duration / rate).toFixed(2)} s</td></tr>`);
      }
      rows.push(`<tr class="dim"><td>${TN(ln, joinPart(seg, 'Cutout'))}.png · ${TN(ln, joinPart(seg, 'FrameTest'))}.png</td><td>轮廓 · 帧号检查图</td><td></td><td></td></tr>`);
    });
    rows.push(`<tr class="dim"><td>${TN(ln, 'Ramp')}.png · ${TN(mn, 'Ramp')}.png</td><td>颜色 Ramp（PC / 手机）</td><td></td><td></td></tr>`);
  }
  rows.push(`<tr class="grp"><td colspan="4">cascade.json（PC）· cascade_mobile.json（手机）：每层每段一个发射器，同一个爆点，按上面的延迟出生</td></tr>`);
  host.innerHTML = `<div class="dv-h"><div><b>一个效果 · 一个素材包</b><small>包名 <code>${name}</code> · 最终 UE 资产名由你本机的导入工具生成</small></div><span class="sp"></span>
    <button class="btn primary" type="button" id="dvExport">导出素材包（PC + 手机）</button><button class="btn" type="button" id="dvBack">返回画面</button></div>
    <table class="dv-t"><thead><tr><th>包内文件</th><th>平台 · 规格</th><th>延迟</th><th>时长</th></tr></thead><tbody>${rows.join('')}</tbody></table>
    <p class="hint">按当前烘焙推算；导出时手机版按单格下限独立烘焙。独看 / 静音不影响导出。</p>`;
  host.querySelector('#dvExport').addEventListener('click', () => combo ? exportCombo() : $('#btnExport').click());
  host.querySelector('#dvBack').addEventListener('click', () => toggleDeliv(false));
  stage2.delivSig = stage2.tlSig;
}
function toggleDeliv(on) {
  stage2.deliv = on == null ? !stage2.deliv : on;
  $('#delivView').hidden = !stage2.deliv; $('#viewFrame').hidden = stage2.deliv;
  $('#abDeliv').setAttribute('aria-pressed', String(stage2.deliv)); $('#abDeliv').textContent = stage2.deliv ? '返回画面' : '查看交付';
  if (stage2.deliv) renderDeliv();
}
function tickStep(n) { state.playing = false; $('#play').textContent = '播放'; state.t = Math.max(0, Math.min(curDuration(), engineTick(state.t + 1e-6) + n / 30)); }
function initStage() {
  $('#tickPrev').addEventListener('click', () => tickStep(-1));
  $('#tickNext').addEventListener('click', () => tickStep(1));
  state.loopPlay = store.get('loopPlay', true); $('#loopChk').checked = state.loopPlay;
  $('#loopChk').addEventListener('change', e => { state.loopPlay = e.target.checked; store.set('loopPlay', state.loopPlay); });
  document.querySelectorAll('.jumps [data-jump]').forEach(b => b.addEventListener('click', () => { state.playing = false; $('#play').textContent = '播放'; state.t = jumpTimes()[b.dataset.jump]; }));
  $('#vtGrid').addEventListener('click', () => { const on = !document.querySelector('.canvas-wrap').classList.contains('grid'); document.querySelector('.canvas-wrap').classList.toggle('grid', on); $('#vtGrid').setAttribute('aria-pressed', String(on)); });
  $('#vtNote').addEventListener('click', noteFrame);
  $('#vtBig').addEventListener('click', () => toggleFocus());
  document.addEventListener('keydown', e => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); tickStep(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); tickStep(1); }
  });
}
