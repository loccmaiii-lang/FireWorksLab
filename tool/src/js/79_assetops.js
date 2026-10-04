// =====================================================================
//  4.5.0 资产操作（用户 2026-10-05 01:28 #5 / #6 / #7 / #8，方案 协作/方案_底层统一与参数宪章_2026-10.md 6.9）
//  · 删除放到眼前：左栏「我的效果 / 我的模板 / 我的版本」每项一个删除；资产栏「删除」；删了 6 秒内能撤销（不再弹确认框）
//  · AI 做的效果不能删，可以「从左栏隐藏」（不动仓库里的东西）
//  · 还原：资产栏「↺ 还原」= 回到打开时 / 回到模板默认 / 只还原某个发射器；面板上每个改过的模块、发射器也有 ↺
//  · AI 效果 / 花型模板 / 正式库调了「保存」= 存成「我的效果（派生自 ×）」：之后能加层、删层、改名、删除（以前存成「AI 效果下的我的版本」，层数锁着）
//  · 「＋ 加层」在资产栏，任何效果都能点（不是你的效果时先存成你的效果）
//  · 我的模板：把调好的一层存成模板；花型库里有「我的模板」「我的效果的层」两类，都能收藏；左栏有「我的模板」
// =====================================================================

// ---- 删了能撤销 ----
let undoToastTimer = 0;
function undoToast(msg, onUndo) {
  let t = $('#undoToast');
  if (!t) { t = document.createElement('div'); t.id = 'undoToast'; t.className = 'undo-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.innerHTML = `<span></span><button type="button" class="btn mini">撤销</button>`; t.querySelector('span').textContent = msg;
  t.querySelector('button').addEventListener('click', () => { clearTimeout(undoToastTimer); t.classList.remove('on'); onUndo(); });
  t.classList.add('on'); clearTimeout(undoToastTimer); undoToastTimer = setTimeout(() => t.classList.remove('on'), 6000);
}

// ---- 我的模板（单层：type + P + M）----
const tplAll = () => store.get('myTemplates', {});
function tplPut(rec) { const all = tplAll(); all[rec.id] = rec; store.set('myTemplates', all); }
function tplDelete(id) { const all = tplAll(); delete all[id]; store.set('myTemplates', all); }
// 当前这一层（单层 = 整个；多层 = 选中的那层）
function curLayerForTemplate() {
  if (state.tab === 'combo') {
    const i = state.comboSel, L = state.layers[i], e = L && layerEntryOf(L);
    if (!e) return null;
    const M = {}; for (const k of ['stages', 'xw', 'ramp0', 'ramp1', 'ramp2', 'ramp3', 'headInt', 'tailInt']) if (L[k] !== undefined) M[k] = structuredClone(L[k]);
    return { type: e.P.type, P: structuredClone(e.P), M: { ...structuredClone(e.M || {}), ...M }, title: L.title || layerName(i) };
  }
  return { type: state.P.type, P: structuredClone(state.P), M: structuredClone(state.M), title: (lib.tpl && lib.tpl.name) || $('#abName').textContent || TYPE_NAMES[state.P.type] };
}
async function saveLayerAsTemplate() {
  const s = curLayerForTemplate();
  if (!s) { flash('多层效果里先点一层（层轨道或「图层管理」里），再把那一层存为模板', true); return; }
  const nm = await askSaveName('把这一层存为模板', '存成你自己的花型模板：以后「新建效果」「加一层」「花型库」里都能选（在「我的模板」里），也能收藏。', s.title + ' · 模板', '存为模板');
  if (nm == null) return;
  const rec = { id: 't' + Date.now().toString(36), name: nm.trim() || s.title, type: s.type, P: s.P, M: s.M, at: wbNow(), from: $('#abName').textContent || '' };
  tplPut(rec); renderLib(); flash(`已存为模板「${rec.name}」：花型库 / 加一层里的「我的模板」，左栏「我的模板」`);
}
function updateTemplate() {
  if (!lib.tpl || state.tab === 'combo') return;
  const rec = tplAll()[lib.tpl.id]; if (!rec) return;
  Object.assign(rec, { P: structuredClone(state.P), M: structuredClone(state.M), at: wbNow() }); tplPut(rec); lib.tpl = rec;
  wb.sig = wbSig(); wbSync(); renderLib(); flash(`已更新模板「${rec.name}」`);
}
function openTemplate(id) {
  const rec = tplAll()[id]; if (!rec) { flash('找不到这个模板', true); return; }
  beforeOpen(null); wb.entry = undefined; lib.effect = null; lib.formal = null; lib.tpl = rec; setQueuedView(false);
  lib.key = 'tpl:' + id; store.set('lastKey', lib.key);
  setType(rec.type); setTab('master');
  state.P = derive(structuredClone(rec.P)); state.M = structuredClone(rec.M); buildMasterPanel(); onParam();
  setReview(null); renderLib(); crumb('我的模板', rec.name);
}
function renameTemplate(id) {
  const rec = tplAll()[id]; if (!rec) return; const n = prompt('模板的名字', rec.name); if (n == null) return;
  rec.name = n.trim() || rec.name; tplPut(rec); if (lib.tpl && lib.tpl.id === id) { lib.tpl = rec; crumb('我的模板', rec.name); wbSync(); } renderLib();
}
function removeTemplate(id) {
  const rec = tplAll()[id]; if (!rec) return;
  tplDelete(id); renderLib(); if (typeof pkRender === 'function' && !$('#picker').hidden) pkRender();
  undoToast(`已删除模板「${rec.name}」`, () => { tplPut(rec); renderLib(); if (!$('#picker').hidden) pkRender(); });
}
// 层的来源键（花型库 / 加一层用）：tpl:<id> = 我的模板；myl:<效果>:<层> = 我的效果里的某一层
function assetSrc(key) {
  if (key.startsWith('tpl:')) { const r = tplAll()[key.slice(4)]; if (!r) throw new Error('找不到模板'); return { type: r.type, P: derive(structuredClone(r.P)), M: structuredClone(r.M), title: r.name }; }
  if (key.startsWith('myl:')) {
    const [, fx, lid] = key.split(':'), rec = myAll()[fx], x = rec && rec.snap.layers.find(l => l.L && l.L.lid === lid); if (!x) throw new Error('找不到这一层');
    const M = {}; for (const k of ['stages', 'xw', 'ramp0', 'ramp1', 'ramp2', 'ramp3', 'headInt', 'tailInt']) if (x.L[k] !== undefined) M[k] = structuredClone(x.L[k]);
    return { type: x.type, P: derive(structuredClone(x.P)), M: { ...structuredClone(x.M || {}), ...M }, title: `${rec.name} · ${x.L.title || '层'}` };
  }
  return null;
}
function pkMyItems(mode) {
  const out = [];
  for (const r of Object.values(tplAll())) out.push({ key: 'tpl:' + r.id, name: r.name, cat: 'mytpl', desc: `我的模板 · 基于${TYPE_NAMES[r.type] || r.type}${r.from ? ' · 来自 ' + r.from : ''}`, tags: ['我的', '模板'], thumbType: r.type });
  if (mode !== 'open') for (const rec of Object.values(myAll())) for (const x of (rec.snap && rec.snap.layers) || []) {
    if (!x.L || !x.L.lid || !x.P) continue;
    out.push({ key: `myl:${rec.id}:${x.L.lid}`, name: `${rec.name} · ${x.L.title || '层'}`, cat: 'myfxl', desc: `我的效果里的一层 · 基于${TYPE_NAMES[x.type] || x.type}`, tags: ['我的'], thumbType: x.type });
  }
  return out;
}

// ---- 我的效果：派生（AI 效果 / 模板 / 正式库调了保存）----
async function wbDeriveMine(o = {}) {
  if (repoDir.h && !repoDir.ok) await repoPerm(true);
  const fromName = (lib.tpl && lib.tpl.name) || $('#abName').textContent || wbBaseId();
  const from = { key: wb.key, name: fromName, base: wbBaseId(), ver: (lib.review && lib.review.ver) || '' };
  const nm = await askSaveName(o.title || '保存成我的效果', `存成你自己的效果（派生自「${fromName}」），原来的不动。之后能加层、删层、改名、删除，在左栏「我的效果」里。`, `${fromName} · 我的`, o.action || '保存');
  if (nm == null) return null;
  const name = nm.trim() || `${fromName} · 我的`;
  let snap;
  if (state.tab === 'combo') {
    snap = wbSnap();
    snap.layers.forEach((x, i) => { const L = state.layers[i]; x.id = null; x.type = x.type || (x.P && x.P.type); x.L.title = L.title || layerName(i); x.L.lid = L.lid || (L.lid = myLid()); });
  } else {
    snap = { kind: 'combo', layers: [{ id: null, type: state.P.type, P: structuredClone(state.P), M: structuredClone(state.M), L: { title: fromName, lid: myLid(), scale: 1, delay: 0, rate: 1, mirror: false } }] };
  }
  snap.name = name;
  const links = state.tab === 'combo' ? (state.links || []).map(g => g.map(i => snap.layers[i] && snap.layers[i].L.lid).filter(Boolean)).filter(g => g.length > 1) : [];
  const rec = { id: 'fx' + Date.now().toString(36), name, created: wbNow(), updated: wbNow(), links, from, snap };
  myPut(rec);
  // 导出名（UE 资产名）跟着原来的走：派生自引菊 → 锦的，贴图照样叫 HikiNishiki_Hiki / _Nishiki（「查看交付」里能改）
  const combo = state.tab === 'combo', pn = packNamesFor(wb.key, lib.effect, snap.layers.length, combo ? 'MyFx' : (TYPE_EN[state.P.type] || 'MyFx'), combo ? '' : state.P.type);
  setPackNames('my:' + rec.id, pn.base, pn.layers);
  const drafts = wbList().filter(x => x.draft); if (drafts.length) wbPut(wbList().filter(x => !x.draft));
  wb.sig = wbSig();     // 原来那个效果算「没改过」（不再存草稿）
  try { await repoWrite('my:' + rec.id, { id: rec.id, name: rec.name, at: rec.updated, base: '我的效果', from, snap: rec.snap, links: rec.links, ue: packNamesFor('my:' + rec.id, null, snap.layers.length, 'MyFx') }); } catch (e) { }
  await openMyEffect(rec.id, { keep: true });
  flash(`已存成你的效果「${rec.name}」（派生自「${fromName}」，原来的不动）：现在能加层、删层、改名、删除`);
  return rec;
}
async function addLayerAnywhere() {
  if (!lib.my) { const r = await wbDeriveMine({ title: '先存成我的效果，再加层', action: '存好并加层' }); if (!r) return; }
  myAddLayer();
}

// ---- 删除（当前打开的 / 左栏某一项）----
function removeMyFx(id) {
  const rec = myAll()[id]; if (!rec) return;
  const cur = lib.my && lib.my.id === id;
  myDelete(id); if (cur) { lib.my = null; wbPut([]); openType('kiku'); } else renderLib();
  undoToast(`已删除你的效果「${rec.name}」`, async () => { myPut(rec); renderLib(); if (cur) await openMyEffect(id); });
}
function removeVersion(key, id) {
  const all = wbAll(), list = all[key] || [], s = list.find(x => x.id === id); if (!s) return;
  const idx = list.indexOf(s); list.splice(idx, 1); all[key] = list; store.set('mySaves', all);
  const cur = wb.key === key && wb.src.kind === 'mine' && wb.src.id === id;
  renderLib(); if (cur) wbLoadAI(); else wbSync();
  undoToast(`已删除版本「${s.name}」`, () => { const a2 = wbAll(), l2 = a2[key] || []; l2.splice(Math.min(idx, l2.length), 0, s); a2[key] = l2; store.set('mySaves', a2); renderLib(); wbSync(); });
}
function deleteCurrent() {
  if (lib.my) return removeMyFx(lib.my.id);
  if (lib.tpl) return removeTemplate(lib.tpl.id);
  if (wb.src.kind === 'mine') return removeVersion(wb.key, wb.src.id);
}
function deleteLabel() {
  if (lib.my) return '删除这个效果';
  if (lib.tpl) return '删除这个模板';
  if (wb.src.kind === 'mine') { const s = wbList().find(x => x.id === wb.src.id); return s && s.draft ? '删除草稿' : '删除这个版本'; }
  return '';
}

// ---- AI 效果从左栏隐藏 ----
const libHidden = () => new Set(store.get('libHidden', []));
function setLibHidden(key, on) { const s = libHidden(); if (on) s.add(key); else s.delete(key); store.set('libHidden', [...s]); renderLib(); }
function hideCurrentEffect() {
  const ef = lib.effect; if (!ef) return;
  setLibHidden(ef.key, true);
  undoToast(`「${ef.名}」从左栏隐藏了（仓库里的东西没动；左栏组标题上「已隐藏」能找回）`, () => setLibHidden(ef.key, false));
}

// ---- 还原 ----
const MAT_KEYS = ['stages', 'xw', 'ramp0', 'ramp1', 'ramp2', 'ramp3', 'headInt', 'tailInt'];
function resetToDefaults() {
  if (state.tab === 'combo' && state.comboSel < 0) { flash('先选一层（「整体」没有模板默认）', true); return; }
  const P = state.P, d = defaultsFor(P.type), keep = { type: P.type, form: P.form };
  putObj(P, derive({ ...structuredClone(d.P), ...keep }));
  for (const k of MAT_KEYS) if (d.M[k] !== undefined) state.M[k] = structuredClone(d.M[k]);
  buildMasterPanel(); onParam(); if (state.tab === 'combo') buildLayerHead(state.comboSel);
  flash(`已回到「${TYPE_NAMES[P.type]}」模板的默认值${state.tab === 'combo' ? `（第 ${state.comboSel + 1} 层）` : ''}；Ctrl+Z 能撤销`);
}
// 只还原一个发射器（m 给了就只还原那个模块）到「打开时」：AI 版 / 你保存的样子 / 模板默认
function resetScope(e, m) {
  const B = panelBaseP(), P = state.P; let n = 0;
  for (const [row, it, sec, det] of panelRows) {
    if (det._g !== e || (m && det._mod !== m) || !row.classList.contains('chg')) continue;
    const k = Array.isArray(it) ? it[0] : it.sel; if (!k || B[k] === undefined) continue;
    P[k] = structuredClone(B[k]); n++;
  }
  if (!n) { flash('这里没有改过的参数'); return; }
  derive(P); refreshPanelValues(); refreshVisibility(); onParam();
  flash(`已把「${e}${m ? ' › ' + m : ''}」的 ${n} 项还原到打开时；Ctrl+Z 能撤销`);
}
function changedByEmitter() { const n = {}; for (const [row, , , det] of panelRows) if (row.classList.contains('chg')) n[det._g] = (n[det._g] || 0) + 1; return n; }
function renderResetMenu() {
  const host = $('#abResetMenu'), combo = state.tab === 'combo', lay = combo && state.comboSel >= 0, chg = changedByEmitter();
  const items = [];
  if (!combo || lay) items.push(['open', lay ? `第 ${state.comboSel + 1} 层回到打开时` : '回到打开时', '打开时 = AI 版 / 你保存的样子 / 模板默认']);
  if (combo) items.push(['openAll', '所有层回到打开时', '整个效果回到打开时的样子']);
  if (!combo || lay) items.push(['def', `回到「${TYPE_NAMES[state.P.type]}」模板默认`, '这一层的参数和颜色换成花型模板的默认值']);
  const es = Object.entries(chg).filter(([, n]) => n > 0);
  host.innerHTML = items.map(([k, t, d]) => `<button type="button" data-reset="${k}" title="${d}">${t}</button>`).join('')
    + (es.length ? `<span class="menu-label">只还原一个发射器（到打开时）</span>` + es.map(([e, n]) => `<button type="button" data-reset-e="${e}">「${e}」· ${n} 项改过</button>`).join('') : (!combo || lay ? '<p class="hint">和打开时比还没改过参数</p>' : ''))
    + '<p class="hint">都能用 Ctrl+Z 撤销。模块标题右边的 ↺ 只还原那一个模块。</p>';
  host.querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', () => { $('#abReset').open = false; const k = b.dataset.reset;
    if (k === 'open') resetToOpened(); else if (k === 'openAll') { let s = null; try { s = JSON.parse(wb.sig); } catch (e) { } if (s) { wbApply(s); flash('已恢复到打开时（所有层）'); } } else if (k === 'def') resetToDefaults(); }));
  host.querySelectorAll('[data-reset-e]').forEach(b => b.addEventListener('click', () => { $('#abReset').open = false; resetScope(b.dataset.resetE); }));
}
// 面板上：改过的模块标题右边一个 ↺、发射器头上「N 项改过」可以点（refreshVisibility 每次调）
function syncScopeResets() {
  const nMod = {};
  for (const [row, , , det] of panelRows) if (row.classList.contains('chg')) nMod[det._key] = (nMod[det._key] || 0) + 1;
  document.querySelectorAll('#params details.mod').forEach(d => {
    const sm = d.querySelector(':scope > summary'); if (!sm) return;
    let b = sm.querySelector('.mreset');
    if (!b) { b = document.createElement('span'); b.className = 'mreset'; b.setAttribute('role', 'button'); b.tabIndex = 0; b.textContent = '↺';
      const go = ev => { ev.preventDefault(); ev.stopPropagation(); resetScope(d._g, d._mod); };
      b.addEventListener('click', go); b.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') go(ev); }); sm.appendChild(b); }
    const n = nMod[d._key] || 0; b.hidden = !n; b.title = `把「${d._g} › ${d._mod}」改过的 ${n} 项还原到打开时`;
  });
  document.querySelectorAll('#params section.egrp .pg-n').forEach(b => { if (b.dataset.bound) return; b.dataset.bound = '1'; b.setAttribute('role', 'button'); b.tabIndex = 0;
    b.title = '把这个发射器改过的参数都还原到打开时'; const g = b.closest('section.egrp');
    const go = ev => { ev.preventDefault(); ev.stopPropagation(); resetScope(g.dataset.g); };
    b.addEventListener('click', go); b.addEventListener('keydown', ev => { if (ev.key === 'Enter') go(ev); }); });
}

function initAssetOps() {
  const close = () => document.querySelectorAll('.ab-more[open]').forEach(m => m.open = false);
  $('#abReset').addEventListener('toggle', () => { if ($('#abReset').open) renderResetMenu(); });
  $('#abAddLayer').addEventListener('click', () => addLayerAnywhere());
  $('#abDel').addEventListener('click', () => deleteCurrent());
  $('#abSaveTpl').addEventListener('click', () => { close(); saveLayerAsTemplate(); });
  $('#abUpdTpl').addEventListener('click', () => { close(); updateTemplate(); });
  $('#abHide').addEventListener('click', () => { close(); hideCurrentEffect(); });
}
// 资产栏上这几个按钮什么时候出现（wbSync 调）
function syncAssetOps() {
  const dl = deleteLabel(), combo = state.tab === 'combo';
  $('#abDel').hidden = !dl; $('#abDel').textContent = dl ? '删除' : ''; $('#abDel').title = dl ? dl + '（删了 6 秒内能撤销）' : '';
  $('#abAddLayer').title = lib.my ? '加一层：花型模板、我的模板，或现有效果里的某一层（参数复制一份）' : '加一层：先把现在的样子存成你的效果（原来的不动），再加层';
  $('#abSaveTpl').hidden = combo && state.comboSel < 0; $('#abSaveTpl').textContent = combo ? `把第 ${state.comboSel + 1} 层存为模板` : '把这一层存为模板';
  $('#abUpdTpl').hidden = !(lib.tpl && !combo); $('#abUpdTpl').textContent = lib.tpl ? `更新模板「${lib.tpl.name}」` : '';
  $('#abHide').hidden = !lib.effect;
}
