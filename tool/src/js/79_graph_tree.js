// =====================================================================
//  4.9.123 粒子层加 / 复制 / 删 / 改母粒 + 路径条与结构弹层（团队版（云端）T3 ②，用户 10-25 00:00 交互 ①–⑧「全批准」）
//  · 照 10-15 层级线稿 V1「路径条 + 结构弹层」的最小可用版：右栏顶上「现在改的是」那一行 = 路径条
//    （效果 › 层 › 母粒 › 这一层 ▾），点它（或 Ctrl+/）在右栏里展开结构弹层：整棵粒子层树，母子缩进；
//    每行：名字（点 = 改这一层）、显示 / 隐藏、改过几项、复制、加子粒、删、母粒（下拉）。粒子层不再挤在「4 个标签 + 更多 N」里
//  · 只动分层粒子图的结构（P.sparkGraph.emitters 的增删、母子），每一步都是普通的参数改动：进撤销、草稿、保存，和改一个滑杆一样；
//    没有动过结构的效果打开参数和导出都不变
//  · 只对有分层粒子图的效果（仙女棒 / 窜天猴尾焰 / 空白粒子图 / SGS1 / SGR1 …）；别的效果的发射器标签照旧
// =====================================================================
const GraphTree = (() => {
  const short = e => String(e.name || e.id).replace(/^\d+\s*[｜|]\s*/, '');
  // 这一层和它所有的子孙（按图里的顺序）
  function subtree(g, id) {
    const out = new Set([id]);
    for (const e of g.emitters) if (e.parent && out.has(e.parent)) out.add(e.id);     // 图里母粒一定在子粒前面，一遍就够
    return g.emitters.filter(e => out.has(e.id));
  }
  function depthOf(g, id) { let d = 0, e = g.emitters.find(x => x.id === id); const seen = new Set(); while (e && e.parent && !seen.has(e.id)) { seen.add(e.id); d++; e = g.emitters.find(x => x.id === e.parent); } return d; }
  // 显示顺序：根按图里的顺序，子粒跟在母粒下面（深度优先）
  function rows(g) {
    const kids = new Map(), out = [];
    for (const e of g.emitters) { const k = e.parent || ''; if (!kids.has(k)) kids.set(k, []); kids.get(k).push(e); }
    const walk = (k, d) => { for (const e of kids.get(k) || []) { out.push({ e, depth: d }); walk(e.id, d + 1); } };
    walk('', 0); return out;
  }
  const newId = g => { let n = g.emitters.length + 1, id; do id = 'e' + String(n++).padStart(2, '0'); while (g.emitters.some(e => e.id === id)); return id; };
  const nextNo = g => Math.max(0, ...g.emitters.map(e => +(/^(\d+)\s*[｜|]/.exec(String(e.name || '')) || [0, 0])[1])) + 1;
  const newName = (g, nm) => String(nextNo(g)).padStart(2, '0') + '｜' + nm;
  const newSeed = g => { let s = Math.max(1, ...g.emitters.map(e => +e.seed || 0)) + 7919; while (g.emitters.some(e => e.seed === s)) s += 7919; return s; };
  // 一层放到母粒那一支的最后（母粒必须在子粒前面）
  function insertAfterBranch(g, list, parentId) {
    if (!parentId) { g.emitters.push(...list); return; }
    const br = subtree(g, parentId), last = br[br.length - 1], i = g.emitters.indexOf(last);
    g.emitters.splice(i + 1, 0, ...list);
  }
  // 新的一层：照空白粒子图那一层的值（GRAPH_TEMPLATES.sgBlank），子粒默认每颗母粒在寿命一半时分出 1 颗
  function blankLayer(g, parentId) {
    const src = typeof GRAPH_TEMPLATES !== 'undefined' ? GRAPH_TEMPLATES.sgBlank.graph.emitters[0] : g.emitters[0];
    const e = structuredClone(src);
    Object.assign(e, { id: newId(g), name: newName(g, parentId ? '新子粒' : '新粒子层'), parent: parentId || null, seed: newSeed(g), enabled: true });
    if (parentId) Object.assign(e, { count: 0, children: Math.max(1, Math.round(+e.children || 1)), event: .5, probability: 1, inherit: 1 });
    // 寿命上限要小于循环周期（周期改短过的图）
    if (e.life[1] >= g.period) { e.life[1] = +(g.period * .9).toFixed(4); e.life[0] = Math.min(e.life[0], e.life[1]); }
    return e;
  }
  // 新层加在图的最后（母粒一定在它前面；图里的顺序 = 加的先后，结构弹层按母子缩进显示）
  function add(g, parentId) { const e = blankLayer(g, parentId); g.emitters.push(e); return e; }
  // 复制：只复制这一层（子粒不跟着），种子换一个（不然两层的粒子完全重合、只是亮一倍）
  function dup(g, id) {
    const o = g.emitters.find(e => e.id === id); if (!o) return null;
    const e = structuredClone(o); Object.assign(e, { id: newId(g), name: newName(g, short(o) + ' 副本'), seed: newSeed(g) });
    const br = subtree(g, id), last = br[br.length - 1]; g.emitters.splice(g.emitters.indexOf(last) + 1, 0, e);     // 放在原层那一支后面（同一个母粒下）
    return e;
  }
  // 删：连它的子粒一起删（子粒离了母粒没法生成）；至少留一层
  function remove(g, id) {
    const br = subtree(g, id); if (!br.length) return [];
    if (br.length >= g.emitters.length) throw Error('至少要留一个粒子层');
    const gone = new Set(br.map(e => e.id)); g.emitters = g.emitters.filter(e => !gone.has(e.id)); return br;
  }
  // 能当母粒的：不是它自己、也不是它的子孙
  function parentChoices(g, id) { const own = new Set(subtree(g, id).map(e => e.id)); return g.emitters.filter(e => !own.has(e.id)); }
  // 改母粒：这一支（它和子孙）整体挪到新母粒那一支的后面；根 → 子粒时「每周期粒子数」不再起作用（子粒按母粒数 × 每颗分出几颗）
  function reparent(g, id, parentId) {
    const e = g.emitters.find(x => x.id === id); if (!e) return false;
    parentId = parentId || null; if ((e.parent || null) === parentId) return false;
    if (parentId && !parentChoices(g, id).some(x => x.id === parentId)) throw Error('不能把自己或自己的子粒当母粒');
    e.parent = parentId;
    if (parentId && !(+e.children > 0)) e.children = 1;
    if (!parentId && !(+e.count > 0)) e.count = 100;
    const at = g.emitters.indexOf(e), pi = parentId ? g.emitters.findIndex(x => x.id === parentId) : -1;
    if (pi > at) { const br = subtree(g, id), gone = new Set(br.map(x => x.id)); g.emitters = g.emitters.filter(x => !gone.has(x.id)); insertAfterBranch(g, br, parentId); }     // 新母粒在后面：这一支挪到它那一支后面；否则顺序不动
    return true;
  }
  return { short, subtree, depthOf, rows, add, dup, remove, parentChoices, reparent };
})();

// ---- 界面：路径条（70_ui.js scopeSync 调 sgPathParts）、标签行只留当前粒子层（inspectorNavSync 调 sgNavNames）、结构弹层 ----
const sgOn = () => !!(state.P && state.P.sparkGraph && Array.isArray(state.P.sparkGraph.emitters));
const sgTabOf = id => { const g = state.P && state.P.sparkGraph, e = g && g.emitters.find(x => x.id === id); return e ? graphTabName(g, e) : ''; };
const sgIdOfTab = tab => (EMIT_DEF[tab] && EMIT_DEF[tab].graph) || null;
// 路径条里「›」后面那几段：当前粒子层的母粒链（根 → 这一层），没选粒子层时 null（照旧只写发射器名）
function sgPathParts(tab) {
  if (!sgOn()) return null; const id = sgIdOfTab(tab); if (!id) return null;
  const g = state.P.sparkGraph, out = []; let e = g.emitters.find(x => x.id === id); const seen = new Set();
  while (e && !seen.has(e.id)) { seen.add(e.id); out.unshift(e); e = e.parent ? g.emitters.find(x => x.id === e.parent) : null; }
  return out.map(x => ({ id: x.id, tab: graphTabName(g, x), name: GraphTree.short(x) }));
}
// 标签行：粒子层不再一个一个排（13 层只露 4 个 + 「更多 13」）；只留当前那一层，其余在结构弹层里
function sgNavNames(names, current) {
  if (!sgOn()) return null;
  const isG = n => !!sgIdOfTab(n), other = names.filter(n => !isG(n)), cur = isG(current) ? [current] : [];
  return { shown: [...other.filter(n => n !== '全部'), ...cur, ...other.filter(n => n === '全部')], more: [], graph: names.filter(isG).length };
}
const sgPop = { open: false, key: '', sig: '' };
// 路径条后面的「结构 ▾」：只有分层粒子图有；换了效果就关掉弹层
function sgTreeButton(sc) {
  const row = sc.querySelector('.ps-row'); if (!row) return;
  let b = row.querySelector('.ps-tree'); const on = sgOn(), key = typeof lib !== 'undefined' ? lib.key + '|' + state.tab + '|' + state.comboSel : '';
  if (sgPop.key !== key) { sgPop.key = key; sgPop.open = false; sgPop.sig = ''; }
  if (!on) { if (b) b.hidden = true; sgPopRender(); return; }
  if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'ps-tree'; b.setAttribute('aria-haspopup', 'dialog'); b.addEventListener('click', () => sgPopToggle()); const p = row.querySelector('.ps-path'); p.after(b);
    p.addEventListener('click', ev => { if (sgOn() && !ev.target.closest('.ps-anc')) sgPopToggle(true); }); }
  const n = state.P.sparkGraph.emitters.length, t = `粒子层 ${n} ▾`;
  b.hidden = false; if (b.textContent !== t) b.textContent = t; b.title = '粒子层结构：整棵树（母子缩进），加 / 复制 / 删 / 改母粒（Ctrl+/）'; b.setAttribute('aria-expanded', String(sgPop.open));
  sgPopRender();
}
function sgPopToggle(on = !sgPop.open) {
  if (on && !sgOn()) return false;
  sgPop.open = on; const el = document.querySelector('#params .sg-pop');
  if (!on) { if (el) el.hidden = true; const b = document.querySelector('#params .pscope .ps-tree'); if (b) b.setAttribute('aria-expanded', 'false'); return true; }
  sgPopRender(); const p = document.querySelector('#params .sg-pop'); if (p) { const cur = p.querySelector('.sg-row.on .sg-name') || p.querySelector('.sg-name'); if (cur) cur.focus({ preventScroll: true }); }
  return true;
}
function sgPopRender() {
  const sc = document.querySelector('#params .pscope'); if (!sc) return;
  let pop = sc.querySelector('.sg-pop');
  if (!sgOn()) { if (pop) pop.hidden = true; sgPop.open = false; return; }
  if (!pop) { pop = document.createElement('div'); pop.className = 'sg-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', '粒子层结构'); sc.appendChild(pop); sgPopBind(pop); }
  const tb = sc.querySelector('.ps-tree'); if (tb) tb.setAttribute('aria-expanded', String(sgPop.open));
  pop.hidden = !sgPop.open; if (!sgPop.open) { sgPop.sig = ''; return; }
  const g = state.P.sparkGraph, cur = sgIdOfTab(pview.tabNow), nChg = pview.nChg || {};
  const sig = JSON.stringify([cur, g.emitters.map(e => [e.id, e.name, e.parent, e.enabled]), g.emitters.map(e => nChg[graphTabName(g, e)] || 0)]);
  if (sig === sgPop.sig && pop.firstChild) return; sgPop.sig = sig;     // 右栏每次刷新都会走到这里：没变就不重画（不抢焦点）
  const keep = pop.contains(document.activeElement) ? (document.activeElement.closest('.sg-row') || {}).dataset : null, keepOp = pop.contains(document.activeElement) ? document.activeElement.dataset.sgo : null;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const rowsH = GraphTree.rows(g).map(({ e, depth }) => { const tab = graphTabName(g, e), n = nChg[tab] || 0, off = e.enabled === false;
    return `<li class="sg-row${e.id === cur ? ' on' : ''}" data-id="${e.id}" style="--d:${depth}"><button type="button" class="sg-name" data-sgo="pick" aria-current="${e.id === cur}" title="${esc(e.parent ? '子粒层：母粒 ' + GraphTree.short(g.emitters.find(x => x.id === e.parent) || { id: e.parent }) : '粒子层（独立出生）')}">${depth ? '<span class="sg-tw" aria-hidden="true">└</span>' : ''}${esc(e.name || e.id)}</button>${off ? '<span class="sg-tag" title="「显示这层」关着：不画、不导出这一层（子粒照样生成）">隐藏</span>' : ''}${n ? `<span class="sg-n" title="和打开时比改过 ${n} 项">${n}</span>` : ''}</li>`; }).join('');
  const ce = cur && g.emitters.find(x => x.id === cur), opts = ce ? [['', '无（独立出生的粒子层）'], ...GraphTree.parentChoices(g, cur).map(x => [x.id, x.name || x.id])] : [];
  const kids = ce ? GraphTree.subtree(g, cur).length - 1 : 0;
  const acts = `<div class="sg-acts">${ce ? `<span class="sg-cur">这一层：<b>${esc(GraphTree.short(ce))}</b>${ce.parent ? `<span class="sg-of">（母粒 ${esc(GraphTree.short(g.emitters.find(x => x.id === ce.parent) || { id: ce.parent }))}）</span>` : ''}</span><button type="button" class="btn mini" data-sgo="dup" title="复制这一层（参数一样、种子换一个；子粒不跟着复制）">复制</button><button type="button" class="btn mini" data-sgo="child" title="在这一层下面加一个子粒层（母粒在寿命一半时分出）">＋ 子粒</button><button type="button" class="btn mini sg-del" data-sgo="del" title="删掉这一层${kids ? `和它的 ${kids} 个子粒层` : ''}（Ctrl+Z 能撤销）">删</button><label class="sg-par">母粒<select data-sgo="par" aria-label="这一层的母粒">${opts.map(([v, t]) => `<option value="${esc(v)}"${(ce.parent || '') === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>` : '<span class="sg-cur">先在下面点一层，再复制 / 加子粒 / 删 / 改母粒</span>'}<button type="button" class="btn mini sg-add" data-sgo="add" title="加一个独立出生的粒子层（值照空白粒子图那一层）">＋ 粒子层</button></div>`;
  pop.innerHTML = `<div class="sg-head"><b>粒子层结构</b><span class="sg-sub">${g.emitters.length} 层 · 子粒缩进在母粒下面</span><button type="button" class="sg-x" data-sgo="close" aria-label="关掉粒子层结构（Esc）">×</button></div>`
    + acts + `<ul class="sg-list" role="list" aria-label="粒子层（点一层 = 改它的参数）">${rowsH}</ul>`
    + `<p class="hint sg-hint">改结构和改参数一样进撤销（Ctrl+Z）、草稿和保存；删一层会连它的子粒一起删。Ctrl+/ 打开 / 关掉，Esc 关掉。</p>`;
  { const on = pop.querySelector('.sg-row.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' }); }
  if (keepOp) { const f = (keep && keep.id ? pop.querySelector(`.sg-row[data-id="${keep.id}"] [data-sgo="${keepOp}"]`) : null) || pop.querySelector(`.sg-acts [data-sgo="${keepOp}"]`); if (f) f.focus({ preventScroll: true }); }
}
if (typeof keyBind === 'function') {
  keyBind('tree', e => { const vt = document.getElementById('v5Tree'); if (vt && vt.offsetParent) { const f = vt.querySelector('.v5-row.sel .v5-name') || vt.querySelector('.v5-name'); if (f) { e.preventDefault(); f.focus(); } return; }     // 4.9.125 V5：Ctrl+/ = 跳到右栏的结构树
    if (!sgOn()) return; e.preventDefault(); const was = sgPop.open; sgPopToggle(); if (was) { const t = document.querySelector('#params .pscope .ps-tree'); if (t) t.focus(); } });
  keyBind('esc', () => { if (!sgPop.open) return false; sgPopToggle(false); return true; }, 5);
}
if (typeof document !== 'undefined') document.addEventListener('pointerdown', ev => {     // 点弹层外面 = 关掉（点路径条、结构按钮自己处理）
  if (!sgPop.open || !ev.target || !ev.target.closest) return;
  if (ev.target.closest('#params .sg-pop, #params .pscope .ps-tree, #params .pscope .ps-path, dialog')) return;
  sgPopToggle(false);
}, true);
function sgPopBind(pop) {
  pop.addEventListener('click', ev => {
    const b = ev.target.closest('[data-sgo]'); if (!b || b.tagName === 'SELECT') return;
    const op = b.dataset.sgo, row = b.closest('.sg-row'), cur = sgIdOfTab(pview.tabNow);
    if (op === 'close') { sgPopToggle(false); const t = document.querySelector('#params .pscope .ps-tree'); if (t) t.focus(); return; }
    if (op === 'pick' && row) { selectEmitTab(sgTabOf(row.dataset.id)); sgPopRender(); const f = pop.querySelector(`.sg-row[data-id="${row.dataset.id}"] .sg-name`); if (f) f.focus({ preventScroll: true }); return; }
    if (op === 'add') return sgEdit(g => GraphTree.add(g, null), e => `加了粒子层「${e.name}」：值照空白粒子图那一层，在右边改`);
    if (!cur) return;
    if (op === 'dup') return sgEdit(g => GraphTree.dup(g, cur), e => `复制了一层「${e.name}」（种子换了一个）`);
    if (op === 'child') return sgEdit(g => GraphTree.add(g, cur), e => `在「${GraphTree.short(state.P.sparkGraph.emitters.find(x => x.id === e.parent) || {})}」下面加了子粒层「${e.name}」`);
    if (op === 'del') return sgDelete(cur);
  });
  pop.addEventListener('change', ev => {
    const s = ev.target.closest('select[data-sgo="par"]'); if (!s) return; const cur = sgIdOfTab(pview.tabNow); if (!cur) return;
    sgEdit(g => GraphTree.reparent(g, cur, s.value || null) ? g.emitters.find(x => x.id === cur) : null, e => e.parent ? `「${GraphTree.short(e)}」的母粒改成了「${GraphTree.short(state.P.sparkGraph.emitters.find(x => x.id === e.parent) || {})}」（每颗母粒分出几颗看「生成」里的子粒数）` : `「${GraphTree.short(e)}」改成独立出生的粒子层（数量看「生成」里的每周期粒子数）`);
  });
  pop.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); sgPopToggle(false); const t = document.querySelector('#params .pscope .ps-tree'); if (t) t.focus(); return; }
    if (!ev.target.matches('.sg-name') || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(ev.key)) return;
    const bs = [...pop.querySelectorAll('.sg-name')], i = bs.indexOf(ev.target), j = ev.key === 'Home' ? 0 : ev.key === 'End' ? bs.length - 1 : Math.max(0, Math.min(bs.length - 1, i + (ev.key === 'ArrowDown' ? 1 : -1)));
    ev.preventDefault(); if (bs[j]) bs[j].focus();
  });
}
// 改结构 = 改参数：改坏了（图不成立）就原样退回并说为什么；成了就重建右栏、重烘、记撤销，选到新的那一层
function sgEdit(fn, msg) {
  if (!sgOn()) return null;
  const P = state.P, before = structuredClone(P.sparkGraph); let r;
  try { r = fn(P.sparkGraph); if (!r) { P.sparkGraph = before; return null; } SparkGraph.validate(P.sparkGraph); }
  catch (e) { P.sparkGraph = before; flash('没改：' + e.message, true); return null; }
  if (typeof graphSolo !== 'undefined' && graphSolo && !P.sparkGraph.emitters.some(x => x.id === graphSolo)) graphSolo = null;
  const pick = Array.isArray(r) ? null : r;
  buildMasterPanel(); onParam();
  const tab = pick ? sgTabOf(pick.id) : ''; if (tab) selectEmitTab(tab); else if (typeof scopeSync === 'function') scopeSync();
  sgPopRender(); const f = document.querySelector('#params .sg-pop .sg-row.on .sg-name'); if (f && sgPop.open) f.focus({ preventScroll: true });
  if (msg) flash(typeof msg === 'function' ? msg(r) : msg);
  return r;
}
async function sgDelete(id) {
  const g = state.P.sparkGraph, e = g.emitters.find(x => x.id === id); if (!e) return;
  const br = GraphTree.subtree(g, id), kids = br.length - 1;
  if (br.length >= g.emitters.length) { flash('至少要留一个粒子层', true); return; }
  if (kids && !(await askConfirm(`删掉「${GraphTree.short(e)}」和它的 ${kids} 个子粒层？`, `子粒离了母粒没法生成，所以一起删：${br.slice(1).map(x => x.name || x.id).join('、')}。Ctrl+Z 能撤销。`, '一起删'))) return;
  const parent = e.parent, idx = g.emitters.indexOf(e);
  sgEdit(gg => { GraphTree.remove(gg, id); return gg.emitters.find(x => x.id === parent) || gg.emitters[Math.min(idx, gg.emitters.length - 1)]; }, () => `删了「${GraphTree.short(e)}」${kids ? `和 ${kids} 个子粒层` : ''}（Ctrl+Z 撤销）`);
}
