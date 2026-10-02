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
      <span class="tx"><b>${i + 1} · ${layerName(i)}</b><small>开始 ${(+L.delay || 0).toFixed(2)} s · 时长 ${dur.toFixed(2)} s · 缩放 ${(+L.scale || 1).toFixed(2)}${e && e.editSig ? ' · <em>已调</em>' : ''}</small></span>
      <span class="lb"><button type="button" class="mini${solo ? ' on' : ''}" data-solo="${i}" aria-pressed="${solo}">独看</button><button type="button" class="mini${mute ? ' on' : ''}" data-mute="${i}" aria-pressed="${mute}">静音</button></span></div>`;
  });
  box.innerHTML = `<div class="lc-h"><b>观察图层</b><small>点一层改它的参数（画面仍是整朵）。独看 / 静音只影响观察。</small></div>
    <div class="lrow whole${state.comboSel < 0 ? ' cur' : ''}" data-i="-1" tabindex="0" role="button"><span class="th whole">${state.layers.length}</span><span class="tx"><b>整体</b><small>各层的位置、延迟、时间倍率、颜色</small></span></div>${rows.join('')}`;
  box.querySelectorAll('.lrow').forEach(r => {
    const go = ev => { if (ev.target.closest('button')) return; selectComboLayer(+r.dataset.i); };
    r.addEventListener('click', go); r.addEventListener('keydown', ev => { if (ev.key === 'Enter') go(ev); });
  });
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
  $('#abChg').hidden = !changed; $('#abChg').textContent = wb.sig ? '已改动 · 未保存' : '';
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
  wbPut(list); wb.src = { kind: 'mine', id: it.id }; wb.sig = wbSig(); wbSync();
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
      list.push(it); wbPut(list); await wbLoad(it.id);
    } catch (e) { flash('导入失败：' + e.message, true); }
  };
  rd.readAsText(file);
}
function initWorkbench() {
  $('#abSrc').addEventListener('change', e => wbLoad(e.target.value));
  $('#abSave').addEventListener('click', () => wbSave(false));
  $('#abSaveAs').addEventListener('click', () => wbSave(true));
  $('#abExport').addEventListener('click', () => state.tab === 'combo' ? exportCombo() : $('#btnExport').click());
  const close = () => document.querySelector('.ab-more').removeAttribute('open');
  $('#abCopyDiff').addEventListener('click', () => { close(); wbCopyDiff(); });
  $('#abExportFile').addEventListener('click', () => { close(); wbExportFile(); });
  $('#abImportFile').addEventListener('click', () => { close(); $('#abFile').click(); });
  $('#abFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) wbImportFile(f); e.target.value = ''; });
  $('#abRename').addEventListener('click', () => { close(); const list = wbList(), s = list.find(x => x.id === wb.src.id); if (!s) return; const n = prompt('新名字', s.name); if (n == null) return; s.name = n.trim() || s.name; wbPut(list); wbSync(); });
  $('#abDelete').addEventListener('click', () => { close(); const list = wbList(), s = list.find(x => x.id === wb.src.id); if (!s || !confirm(`删除你的版本「${s.name}」？（不影响 AI 版）`)) return; wbPut(list.filter(x => x !== s)); wbLoadAI(); });
  $('#pReview').addEventListener('click', e => { const n = e.target.closest('.rnote'); if (n) n.classList.toggle('full'); });
  document.addEventListener('click', e => { const m = document.querySelector('.ab-more'); if (m && m.open && !m.contains(e.target)) m.removeAttribute('open'); });
}
