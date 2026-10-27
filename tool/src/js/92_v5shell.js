// =====================================================================
//  4.9.125 V5：右栏一列（结构在上、这一项的参数在下）+ 中栏顶行放效果操作（对话框9；用户 2026-10-27 18:33–21:24）
//  · 资产栏不再单独占一行：↶ ↷ 还原 保存 另存 导出 ▾ 挪到中栏最上面一行（精简旁边）；名字、状态、⋯ 放进右栏顶上的结构栏
//  · 右栏：结构栏 →（待我验收 / 正式库）审阅条 → 树（层 › 发射器 / 粒子层 / 输出）→ 分隔条（拖动；双击收起；记在这台电脑）→ 参数
//  · 树每行两个开关（用户 20:37 第 1 条「看不见就不导出」）：
//      眼睛 = 「显示这层」（配方：关了不画、不烘、不导出，进撤销）——只有现成开关的行能点：粒子图 / 火焰的层（enabled）、自定义发射器（x1On / x2On）；
//      ◎ = 只看这一个（只影响画面，不改参数、不影响导出）——多层的层、粒子图的层、尾缀「输出」下面的几份。
//      其余行灰着、悬停写原因：新加开关要先记参数变更、等用户批（CLAUDE.md 第 4 节），这一版不加
//  · 只改位置和入口：元素 id、事件、参数、导出都不变（界面状态检查 / 合入门禁照旧找得到 ab* / dvExport / selectEmitTab）
// =====================================================================
var V5_SVG = {
  eye: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>',
  eyeOff: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.8 5.6C1.9 6.8 1.5 8 1.5 8S3.9 12.5 8 12.5c1 0 1.9-.3 2.7-.7M6.2 3.8c.6-.2 1.2-.3 1.8-.3 4.1 0 6.5 4.5 6.5 4.5s-.6 1.2-1.7 2.4M2 2l12 12"/></svg>',
  solo: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><circle class="f" cx="8" cy="8" r="2"/></svg>',
  more: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle class="f" cx="3.5" cy="8" r="1.2"/><circle class="f" cx="8" cy="8" r="1.2"/><circle class="f" cx="12.5" cy="8" r="1.2"/></svg>',
  caret: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>',
  cam: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 5.5h2.5l1.2-2h4.6l1.2 2H14v7.5H2z"/><circle cx="8" cy="9" r="2.3"/></svg>',
  clock: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="9" r="5"/><path d="M8 6.5V9l1.8 1.2M6.5 1.8h3M8 1.8V4"/></svg>',
  reset: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4v3.2h3.2"/><path d="M3.4 7A5 5 0 1 1 4.6 11.6"/></svg>',
  plus: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>',
  back: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 3.5L5 8l4.5 4.5"/></svg>'
};
const V5_RH = 28;                 // 树一行的高度（px）
const V5_KEEP = 380;              // 参数区保底：一项参数通常要这么高（Lap 看板的规则）
const V5_WHY = {
  layer: '多层的层还没有「显示这层」开关：要新加参数（先记参数变更、等你批）。只看某一层用右边的 ◎',
  single: '单层效果只有这一层：关了就没有东西可导出',
  emit: '这个发射器还没有「显示这层」开关：要新加参数（先记参数变更、等你批）',
  soloEmit: '这种发射器还不能单独画（只看）',
  out: '这一份导不导出：在交付清单「每层出什么」里选',
  last: '至少要显示一层'
};
var v5 = { built: false, timer: 0, sig: '', key: '', xOff: new Set(), open: store.get('v5Open', {}), h: +store.get('v5TreeH', 0) || 0, min: !!store.get('v5TreeMin', false), selKey: '' };
function v5esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
// 右栏里滚动的那一块（V5 以后参数在 #rScroll 里滚；以前是整个右栏）
function rScroller() { return document.getElementById('rScroll') || document.getElementById('right'); }
function v5Sched() { if (!v5 || !v5.built || v5.timer) return;     // 面板在这个文件跑到之前就会建一次（v5 还是 undefined）
  v5.timer = setTimeout(() => { v5.timer = 0; try { v5Sync(); } catch (e) { console.error(e); } }, 0); }

// ---------------- 搭架子：只搬元素（id、事件不变）----------------
function v5Build() {
  if (v5.built || !$('#right') || !$('#viewbar')) return;
  const R = $('#right'), vb = $('#viewbar'), mk = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  document.querySelector('.app').classList.add('fw-scope');
  // 中栏顶行：↶ ↷ 还原 保存 另存 导出 ▾（精简左边）
  const acts = mk('div', 'v5-acts'); acts.id = 'v5Acts'; acts.setAttribute('role', 'group'); acts.setAttribute('aria-label', '效果操作');
  const rs = $('#abReset'), rsm = rs && rs.querySelector('summary');
  if (rsm) { rsm.innerHTML = V5_SVG.reset + '<span class="v5-t">还原</span>'; rsm.setAttribute('aria-label', '还原'); }
  $('#abSaveAs').textContent = '另存';
  const ex = $('#abExportPack'); ex.textContent = '导出';
  ex.title = '导出整个效果的素材包：按交付清单「每层出什么」出 PC + 手机（多层时在哪一层点都是整个效果）';
  const exw = mk('div', 'v5-export'); exw.id = 'v5Export';
  const exm = mk('details', 'ab-more v5-exp-more', `<summary class="btn" aria-label="更多导出方式" title="更多导出方式">${V5_SVG.caret}</summary><div class="ab-menu"><span class="menu-label">导出</span></div>`); exm.id = 'v5ExpMore';
  const va = $('#btnVariants'); if (va) { va.className = ''; va.textContent = '导出种子变体 V1–V3（大面片母版）'; exm.querySelector('.ab-menu').appendChild(va); }
  exw.append(ex, exm);
  acts.append($('#abUndo'), $('#abRedo'), rs, $('#abSave'), $('#abSaveAs'), exw);
  vb.insertBefore(acts, $('#btnFocus'));
  for (const id of ['btnFocus', 'btnRight', 'btnSide']) { const b = $('#' + id); if (b) { const t = b.querySelector('.tl'); if (t && !b.getAttribute('aria-label')) b.setAttribute('aria-label', t.textContent); } }
  // 右栏：结构栏
  const bar = mk('div', 'v5-bar'); bar.id = 'v5Bar';
  const r1 = mk('div', 'v5-r1'), r2 = mk('div', 'v5-r2'); r2.id = 'v5Status';
  const nm = $('#abIdName'); nm.classList.add('v5-name');
  const more = $('#abMore'); more.classList.add('v5-more');
  const ms = more.querySelector('summary'); ms.innerHTML = V5_SVG.more; ms.setAttribute('aria-label', '这个效果的更多操作'); ms.title = '配方文件、参数、模板、协作、工具、删除';
  const menu = more.querySelector('.ab-menu');
  // ⋯ 菜单补齐：参数（导入参数 JSON、随机微调）、工具页、删除（以前在资产栏 / 右栏底部）
  const lab = t => mk('span', 'menu-label', v5esc(t));
  const imp = $('#btnImport'), jit = $('#btnJitter'), del = $('#abDel');
  if (imp && jit) { imp.className = ''; imp.textContent = '导入参数 JSON…'; jit.className = ''; const pl = lab('参数'), at = [...menu.querySelectorAll('.menu-label')].find(x => x.textContent.trim() === '保存设置') || null; menu.insertBefore(pl, at); pl.after(imp, jit); }
  const tools = mk('button', '', '工具：快捷键 · 显卡测速 · 旧版本'); tools.type = 'button'; tools.id = 'v5Tools';
  tools.addEventListener('click', () => paneGo('tools'));
  menu.append(lab('工具'), tools);
  if (del) { del.className = 'v5-danger'; menu.append(mk('span', 'menu-label v5-del-label', '删除'), del); }
  menu.addEventListener('click', e => { if (e.target.closest('button') && !e.target.closest('input')) setTimeout(() => { more.open = false; }, 0); });
  exm.querySelector('.ab-menu').addEventListener('click', e => { if (e.target.closest('button')) setTimeout(() => { exm.open = false; }, 0); });
  const close = $('#rightClose'); close.className = 'btn ghost v5-close'; close.textContent = '收起';
  r1.append(nm, mk('span', 'v5-sp'), more, close);
  r2.append($('#abIdChips'), $('#abState'), $('#abBakeCancel'));
  bar.append(r1, r2);
  // 审阅条（待我验收 / 正式库）、换页后的「← 参数」
  const rv = mk('div', 'v5-review'); rv.id = 'v5Review'; rv.hidden = true;
  const back = mk('div', 'v5-back', `<button type="button" class="btn ghost v5-backb">${V5_SVG.back}<span>参数</span></button><b class="v5-backt"></b>`); back.id = 'v5Back'; back.hidden = true;
  back.querySelector('button').addEventListener('click', () => paneGo('params'));
  // 树
  const tb = mk('section', 'v5-treebox'); tb.id = 'v5TreeBox'; tb.setAttribute('aria-label', '效果结构');
  const tt = mk('div', 'v5-tools', `<span class="v5-path" id="v5Path" hidden></span><span class="v5-sp"></span><span class="v5-colh" title="眼睛 = 显示这层：关了不画、不烘、不导出（进撤销）">显示</span><span class="v5-colh" title="◎ = 只看这一个：只影响画面，不改参数、不影响导出">只看</span>`);
  const add = $('#abAddLayer'); add.className = 'btn ghost v5-add'; add.innerHTML = V5_SVG.plus + '<span>加层</span>'; tt.prepend(add);
  const tree = mk('div', 'v5-tree'); tree.id = 'v5Tree'; tree.setAttribute('role', 'tree'); tree.setAttribute('aria-label', '层、发射器和输出：点名字改它的参数');
  tb.append(tt, tree);
  const sp = mk('div', 'v5-split'); sp.id = 'v5Split'; sp.setAttribute('role', 'separator'); sp.setAttribute('aria-orientation', 'horizontal'); sp.tabIndex = 0;
  sp.setAttribute('aria-label', '结构区和参数区的分隔：拖动调整高度，双击收起 / 展开（↑ ↓ 键也能调）'); sp.title = '拖动调整结构区高度；双击收起 / 展开';
  // 参数区：右栏原来的内容整体放进一个滚动块（右栏 id 不变）
  const sc = mk('div', 'v5-scroll'); sc.id = 'rScroll';
  for (const c of [...R.children]) if (!c.classList.contains('right-head')) sc.appendChild(c);
  R.append(bar, rv, back, tb, sp, sc); R.classList.add('v5');
  // 参数区底部那组按钮：导出留在顶上一个（20:37 第 3 条），恢复到打开时在「还原」菜单里；元素留着（导出、检查脚本还用）
  for (const id of ['btnExport', 'btnReset', 'btnExportCombo']) { const b = $('#' + id); if (b) b.classList.add('v5-gone'); }
  // 时间轴：生成缩略图、时间工具只留图标（19:22）
  const tts = document.querySelector('#timeTools > summary'); if (tts) { tts.innerHTML = V5_SVG.clock; tts.setAttribute('aria-label', '时间工具'); tts.title = '时间工具：±1 tick、跳到开花 / 展开 / 衰减、快捷键'; tts.classList.add('v5-ico'); }
  v5Splitter(sp); v5TreeBind(tree);
  v5.built = true;
  v5Sync();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => v5Heights()).observe(R);
}
// 生成缩略图按钮在 DOMContentLoaded 才建（19_thumbsvg.js）
function v5ThumbIcon() {
  const g = $('#thGrab'); if (!g || g.dataset.v5) return; g.dataset.v5 = '1';
  g.innerHTML = V5_SVG.cam; g.setAttribute('aria-label', '生成缩略图'); g.classList.add('v5-ico');
}

// ---------------- 每次刷新：结构栏、审阅条、树 ----------------
function v5Sync() {
  if (!v5.built) return;
  v5ThumbIcon();
  const R = $('#right'), ab = $('#assetBar'), on = !!ab && !ab.hidden;
  $('#v5Acts').hidden = !on;
  const nm = $('#abIdName'); if (!on) { const t = typeof scopeLayerName === 'function' ? scopeLayerName() : ''; if (nm.textContent !== t) nm.textContent = t; }
  nm.title = nm.textContent;
  // 审阅条：setReview 每次重画 #pReview，把里面的条搬上来
  const box = $('#pReview'), rv = $('#v5Review'), strip = box && box.querySelector(':scope > .rstrip');
  if (strip) { rv.replaceChildren(strip); }
  if (box && box.hidden) rv.replaceChildren();
  rv.hidden = !rv.firstChild;
  const rb = rv.querySelector('[data-pane]'); if (rb) { const inRv = lib.pane === 'review'; rb.textContent = inRv ? '回到参数' : '审阅'; rb.setAttribute('aria-pressed', String(inRv)); if (!rb._v5) { rb._v5 = true; rb.addEventListener('click', ev => { if (lib.pane === 'review') { ev.stopImmediatePropagation(); paneGo('params'); } }, true); } }
  // 换页（审阅 / 工具）：树收起来，顶上「← 参数」
  const pane = state.tab === 'asset' ? 'params' : lib.pane || 'params', back = $('#v5Back');
  back.hidden = pane === 'params'; back.querySelector('.v5-backt').textContent = pane === 'review' ? '审阅' : pane === 'tools' ? '工具' : '';
  R.classList.toggle('v5-pane', pane !== 'params');
  v5Tree();
  v5GraphTools();
  v5Heights();
}
// 树高：参数区保底 V5_KEEP，剩下的给树；至少 5 行、至多右栏一半、不超过树本身。拖过就按拖的（存这台电脑），双击收起
function v5Heights() {
  if (!v5.built) return;
  const R = $('#right'), tree = $('#v5Tree'), sc = $('#rScroll'); if (!R || !tree) return;
  const H = R.clientHeight, top = tree.getBoundingClientRect().top - R.getBoundingClientRect().top, content = tree.scrollHeight ? Math.max(V5_RH, tree.querySelectorAll('.v5-row').length * V5_RH + 4) : 0;
  const room = H - top - 8 - V5_KEEP, auto = Math.min(content, Math.floor(H / 2), Math.max(5 * V5_RH, room));
  const max = Math.max(2 * V5_RH, H - top - 8 - 140);
  let h = v5.h > 0 ? Math.min(v5.h, max, content) : auto;
  h = Math.max(Math.min(2 * V5_RH, content), h);
  R.classList.toggle('v5-min', v5.min);
  tree.style.height = (v5.min ? 0 : h) + 'px';
  const sp = $('#v5Split'); sp.setAttribute('aria-valuenow', String(v5.min ? 0 : h)); sp.setAttribute('aria-valuemin', '0'); sp.setAttribute('aria-valuemax', String(max));
  if (sc) sc.style.setProperty('--v5-top', '0px');
}
function v5Splitter(sp) {
  let y0 = 0, h0 = 0, drag = false;
  const tree = () => $('#v5Tree');
  sp.addEventListener('pointerdown', e => { if (e.button !== 0) return; drag = true; y0 = e.clientY; h0 = v5.min ? 0 : tree().offsetHeight; sp.setPointerCapture(e.pointerId); sp.classList.add('on'); e.preventDefault(); });
  sp.addEventListener('pointermove', e => { if (!drag) return; const h = Math.max(0, h0 + e.clientY - y0); if (h < V5_RH) { if (!v5.min) { v5.min = true; v5Heights(); } return; } v5.min = false; v5.h = Math.round(h); v5Heights(); });
  const end = () => { if (!drag) return; drag = false; sp.classList.remove('on'); store.set('v5TreeH', v5.h); store.set('v5TreeMin', v5.min); };
  sp.addEventListener('pointerup', end); sp.addEventListener('pointercancel', end);
  sp.addEventListener('dblclick', () => { v5.min = !v5.min; store.set('v5TreeMin', v5.min); v5Heights(); });
  sp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { v5.min = !v5.min; store.set('v5TreeMin', v5.min); v5Heights(); e.preventDefault(); return; }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    v5.min = false; v5.h = Math.max(2 * V5_RH, (tree().offsetHeight || 0) + (e.key === 'ArrowDown' ? V5_RH : -V5_RH)); store.set('v5TreeH', v5.h); store.set('v5TreeMin', false); v5Heights(); e.preventDefault();
  });
}

// ---------------- 树 ----------------
const V5_GROUPS = { '火花共用': ['细火花', '中火花', '粗火花'] };      // 升空尾缀：「火花共用」管细 / 中 / 粗三档（Q4）
function v5Tabs() { return [...document.querySelectorAll('#params .etabs [data-e]')].filter(b => !b.hidden).map(b => b.dataset.e); }
function v5IsOpen(k, def = true) { return v5.open[k] == null ? def : !!v5.open[k]; }
function v5Nodes() {
  const N = [], P = state.P; if (!P || state.tab === 'asset' || state.showcase) return N;
  const combo = state.tab === 'combo' && state.layers && state.layers.length > 0, tabs = v5Tabs(), cur = pview.tabNow || '', has = t => tabs.includes(t);
  const nChg = pview.nChg || {}, sg = typeof sgOn === 'function' && sgOn();
  const emitNode = (t, lv, x = {}) => ({ key: 't:' + t, lv, kind: 'emit', name: t, tab: t, sel: cur === t, chg: nChg[t] || 0, eye: { can: false, why: V5_WHY.emit }, solo: { can: false, why: V5_WHY.soloEmit }, ...x });
  const pageNode = (t, lv, x = {}) => ({ key: 't:' + t, lv, kind: 'page', name: t, tab: t, sel: cur === t, chg: nChg[t] || 0, ...x });
  const kids = lv => {
    const done = new Set();
    for (const t of tabs) {
      if (done.has(t) || t === '效果' || t === '全部' || t === '输出') continue;
      if (sg && sgIdOfTab(t)) continue;                       // 粒子层放在「◆ 粒子图 · 整体」下面
      if (t === '分层粒子图' && sg) { v5GraphNodes(N, lv, cur, nChg); continue; }
      const gk = Object.keys(V5_GROUPS).find(g => g === t || V5_GROUPS[g].includes(t));
      if (gk) {
        const mem = V5_GROUPS[gk].filter(has); done.add(gk); mem.forEach(m => done.add(m));
        const gOpen = v5IsOpen('g:' + gk);
        N.push(has(gk) ? pageNode(gk, lv, { kind: 'group', key: 'g:' + gk, name: '◆ ' + gk, title: `${gk}：${mem.join(' · ')} 共用的设置`, tw: gOpen ? 'open' : 'closed' }) : { key: 'g:' + gk, lv, kind: 'group', name: '◆ ' + gk, tw: gOpen ? 'open' : 'closed' });
        if (gOpen) for (const m of mem) N.push(emitNode(m, lv + 1));
        continue;
      }
      const xm = /^自定义 (\d)$/.exec(t);
      if (xm) { N.push(emitNode(t, lv, { eye: v5XEye(+xm[1], true) })); continue; }
      N.push(emitNode(t, lv));
    }
    for (const i of [...v5.xOff]) if (!(+P['x' + i + 'On'] > 0)) N.push(emitNode('自定义 ' + i, lv, { off: true, sel: false, eye: v5XEye(i, false), title: '「显示这层」关着：不画、不烘、不导出；点眼睛打开' }));
    if (document.getElementById('exAdd')) N.push({ key: 'x:+', lv, kind: 'add', name: '＋ 加发射器', title: '加一个自定义发射器：挂在星熄灭 / 开花 / 某个时刻 / 沿路上，生成光点或星', click: () => exAddSlot() });     // 原来在发射器标签行末尾
    if (has('输出')) { const oOpen = v5IsOpen('t:输出', false), outs = v5TrailOuts(); N.push(pageNode('输出', lv, { tw: outs.length ? (oOpen ? 'open' : 'closed') : '', title: '这一层的贴图、格子、曝光、取景；PC / 手机出什么在交付清单' }));
      if (outs.length && oOpen) v5TrailNodes(N, lv + 1, outs); }
    if (has('全部')) N.push(pageNode('全部', lv, { title: '这一层所有发射器排在一起（搜索、只看改过的也在这里）' }));
  };
  if (combo) {
    N.push({ key: 'whole', lv: 0, kind: 'page', name: `整体 · ${state.layers.length} 层`, title: '各层在整朵里的位置、延迟、时间倍率、颜色', sel: state.comboSel < 0, click: () => selectComboLayer(-1) });
    const v = state.layerView || { solo: -1, mute: [] };
    state.layers.forEach((L, i) => {
      const me = state.comboSel === i, open = me && v5IsOpen('L' + i), muted = (v.mute || []).includes(i);
      N.push({ key: 'L' + i, lv: 0, kind: 'layer', name: `${i + 1} · ${layerName(i)}`, sel: me && (cur === '效果' || !has('效果') && !cur), chg: me ? pview.nChgAll || 0 : 0, tw: me ? (open ? 'open' : 'closed') : 'closed', i,
        title: `第 ${i + 1} 层 · ${layerName(i)}：点名字 = 这一层的整体（这一层在整朵里、整体调整、本层颜色）${muted ? '\n时间轴上把这一层设成了「先不看」（只影响观察）' : ''}`,
        eye: { can: false, why: V5_WHY.layer }, solo: { can: true, on: v.solo === i, why: v.solo === i ? '只看这一层中：再点一下回到全部（只影响画面）' : '只看这一层（只影响画面，不改参数、不影响导出）', go: () => { v.solo = v.solo === i ? -1 : i; buildLayerCard(); v5Sched(); } },
        menu: lib.my ? i : null, click: () => v5PickLayer(i) });
      if (open) kids(1);
    });
  } else {
    const open = v5IsOpen('L0');
    N.push({ key: 'L0', lv: 0, kind: 'layer', name: (typeof scopeLayerName === 'function' && scopeLayerName()) || '这一层', sel: cur === '效果', chg: pview.nChgAll || 0, tw: open ? 'open' : 'closed',
      title: '这个效果（单层）：点名字 = 效果页（花型、产物、整体调整、尾迹外形）', eye: { can: false, why: V5_WHY.single }, solo: null, click: () => selectEmitTab(has('效果') ? '效果' : tabs[0]) });
    if (open) kids(1);
  }
  return N;
}
// 粒子图：「◆ 粒子图 · 整体」（整张图共用的倍率 / 分叉 / 生成与运动 / 气流）+ 下面的粒子层（母子缩进）+ 「＋ 加粒子层」
function v5GraphNodes(N, lv, cur, nChg) {
  const g = state.P.sparkGraph, open = v5IsOpen('g:graph'), on = g.emitters.filter(e => e.enabled !== false).length;
  N.push({ key: 'g:graph', lv, kind: 'group', name: '◆ 粒子图 · 整体', tab: '分层粒子图', sel: cur === '分层粒子图', chg: nChg['分层粒子图'] || 0, tw: open ? 'open' : 'closed', title: '整张粒子图共用：整体调整、分叉调整、生成与运动、全局气流（管下面所有粒子层）' });
  if (!open) return;
  for (const { e, depth } of GraphTree.rows(g)) {
    const tab = graphTabName(g, e), off = e.enabled === false, solo = typeof graphSolo !== 'undefined' && graphSolo === e.id;
    N.push({ key: 'p:' + e.id, lv: lv + 1 + depth, kind: 'emit', name: e.name || e.id, tab, sel: cur === tab, chg: nChg[tab] || 0, off,
      title: (e.parent ? '子粒层：母粒 ' + GraphTree.short(g.emitters.find(x => x.id === e.parent) || { id: e.parent }) : '粒子层（独立出生）') + (off ? '\n「显示这层」关着：不画、不烘、不导出（子粒照样生成）' : ''),
      eye: { can: true, on: !off, why: off ? '显示这层：打开（重新画、烘、导出）' : on <= 1 ? V5_WHY.last : '显示这层：关掉（不画、不烘、不导出；子粒照样生成；Ctrl+Z 撤销）', go: () => v5GraphEye(e.id) },
      solo: { can: !off, on: solo, why: off ? '这一层没显示：先点眼睛打开' : solo ? '只看这一层中：再点一下回到全部（只影响画面）' : '实时模拟只画这一层（只影响画面，不改参数；导出照旧）', go: () => { graphSolo = graphSolo === e.id ? null : e.id; if (typeof scopeSync === 'function') scopeSync(); v5Sched(); } } });
  }
  N.push({ key: 'p:+', lv: lv + 1, kind: 'add', name: '＋ 加粒子层', title: '加一个独立出生的粒子层（值照空白粒子图那一层）', click: () => sgEdit(gg => GraphTree.add(gg, null), e => `加了粒子层「${e.name}」：值照空白粒子图那一层，在下面改`) });
}
function v5GraphEye(id) {
  const g = state.P.sparkGraph, e = g.emitters.find(x => x.id === id); if (!e) return;
  const on = e.enabled !== false;
  if (on && g.emitters.filter(x => x.enabled !== false).length <= 1) { flash(V5_WHY.last, true); return; }
  if (on && typeof graphSolo !== 'undefined' && graphSolo === id) graphSolo = null;
  sgEdit(gg => { const x = gg.emitters.find(y => y.id === id); x.enabled = !on; return [x]; }, `${on ? '隐藏' : '显示'}了「${GraphTree.short(e)}」：${on ? '不画、不烘、不导出（子粒照样生成）' : '重新画、烘、导出'}（Ctrl+Z 撤销）`);
}
// 自定义发射器：x1On / x2On 就是它的「显示这层」（参数留着，再打开照旧）
function v5XEye(i, on) {
  return { can: true, on, why: on ? '显示这层：关掉（不画、不烘、不导出；参数留着；Ctrl+Z 撤销）' : '显示这层：打开', go: () => {
    state.P['x' + i + 'On'] = on ? 0 : 1; if (on) v5.xOff.add(i); else v5.xOff.delete(i);
    buildMasterPanel(); onParam(); if (!on) selectEmitTab('自定义 ' + i);
    flash(`${on ? '隐藏' : '显示'}了「自定义 ${i}」${on ? '：不画、不烘、不导出（参数留着）' : ''}（Ctrl+Z 撤销）`); } };
}
// 升空尾缀「输出」下面：导出去的那几份（近段 / 远段 / 合成一张 + 粒子发射器），只给 ◎（只看），导不导出在产物表里选（走查 H2）
function v5TrailOuts() {
  const bar = $('#rtLayerBar'); if (!bar || !isEmit(state.P)) return [];
  return [...bar.querySelectorAll('[data-k]')].map(b => ({ k: b.dataset.k, name: (typeof RT_LAYER_CN !== 'undefined' && RT_LAYER_CN[b.dataset.k]) || b.dataset.k, n: (b.querySelector('.n') || {}).textContent || '', gpu: /^GPU/.test(b.title), cpu: /^CPU/.test(b.title) }));
}
function v5TrailNodes(N, lv, outs) {
  const all = outs.map(o => o.k), only = k => rtShow.off.size === all.length - 1 && !rtShow.off.has(k);
  const node = (o, l) => ({ key: 'o:' + o.k, lv: l, kind: 'out', name: o.name, cnt: o.n, title: o.gpu ? 'GPU 粒子发射器' : o.cpu ? 'CPU 软圆点' : o.k === 'near' ? '近段 = 循环层贴图（跟着弹体走的年轻火花 + 星头 + 白热段）' : o.k === 'far' ? '远段 = 全程序列贴图（停在空中的老火花，开花后全部火花）' : o.k === 'full' ? '合成一张（星头 + 全部火花）' : '',
    eye: { can: false, why: V5_WHY.out }, solo: { can: true, on: only(o.k), why: only(o.k) ? '只看这一份中：再点一下回到全部（只影响画面）' : '只看这一份（只影响画面，不改参数、不影响导出）', go: () => { if (only(o.k)) rtShow.off.clear(); else rtShow.off = new Set(all.filter(x => x !== o.k)); v5Sched(); } } });
  const tex = outs.filter(o => !o.gpu && !o.cpu && ['near', 'far', 'full'].includes(o.k)), parts = outs.filter(o => !tex.includes(o));
  for (const o of tex) N.push(node(o, lv));
  if (parts.length) { const op = v5IsOpen('o:parts', false); N.push({ key: 'o:parts', lv, kind: 'group', name: `粒子发射器 · ${parts.length}`, tw: op ? 'open' : 'closed', title: '引擎里的粒子发射器（GPU / CPU），不在贴图里' }); if (op) for (const o of parts) N.push(node(o, lv + 1)); }
}
function v5PickLayer(i) {
  if (state.comboSel !== i) selectComboLayer(i);
  const tabs = v5Tabs(); if (tabs.includes('效果')) selectEmitTab('效果');
  v5.open['L' + i] = true; v5Sched();
}
function v5Row(n, i) {
  const ico = (o, kind) => {
    if (!o) return '<span class="v5-ic v5-none"></span>';
    const svg = kind === 'eye' ? (o.can && o.on === false ? V5_SVG.eyeOff : V5_SVG.eye) : V5_SVG.solo;
    const lab = kind === 'eye' ? '显示这层' : '只看这一个';
    return `<button type="button" class="v5-ic v5-${kind}${o.can ? '' : ' na'}${o.on ? ' on' : ''}" data-act="${kind}" data-n="${i}" aria-label="${lab}：${v5esc(n.name)}" ${o.can ? `aria-pressed="${kind === 'eye' ? !!o.on : !!o.on}"` : 'aria-disabled="true"'} title="${v5esc(o.why || '')}">${svg}</button>`;
  };
  const tw = n.tw ? `<button type="button" class="v5-tw" data-act="tw" data-n="${i}" aria-label="${n.tw === 'open' ? '收起' : '展开'}" tabindex="-1">${V5_SVG.caret}</button>` : '<span class="v5-tw v5-none"></span>';
  const chg = n.chg ? `<span class="v5-chg" title="和打开时比改过 ${n.chg} 项">${n.chg}</span>` : '';
  const cnt = n.cnt ? `<span class="v5-cnt" title="这一刻的颗数">${v5esc(n.cnt)}</span>` : '';
  const menu = n.menu != null ? `<button type="button" class="v5-ic v5-menu" data-act="menu" data-n="${i}" aria-label="这一层的操作" title="上移 / 下移 / 改名 / 复制 / 删除这一层">${V5_SVG.more}</button>` : '';
  const leaf = n.kind === 'add' ? '' : `${ico(n.eye, 'eye')}${ico(n.solo, 'solo')}`;
  return `<div class="v5-row k-${n.kind}${n.sel ? ' sel' : ''}${n.off ? ' off' : ''}" role="treeitem" aria-level="${n.lv + 1}"${n.tw ? ` aria-expanded="${n.tw === 'open'}"` : ''} aria-selected="${!!n.sel}" data-n="${i}" style="--lv:${n.lv}" title="${v5esc(n.title || '')}">`
    + `${tw}<button type="button" class="v5-name" data-act="pick" data-n="${i}" tabindex="${n.sel ? 0 : -1}">${v5esc(n.name)}</button>${chg}${cnt}${menu}${n.kind === 'add' ? '' : `<span class="v5-icons">${leaf}</span>`}</div>`;
}
function v5Tree() {
  const tree = $('#v5Tree'); if (!tree) return;
  const key = (lib.key || '') + '|' + state.tab; if (key !== v5.key) { v5.key = key; v5.xOff.clear(); }
  const N = v5Nodes(); v5.nodes = N;
  const html = N.map(v5Row).join('');
  if (html !== v5.sig) {
    const had = tree.contains(document.activeElement) ? document.activeElement : null, hk = had && had.closest('.v5-row') ? [had.dataset.act, N[+had.dataset.n] && N[+had.dataset.n].key] : null;
    tree.innerHTML = html; v5.sig = html;
    if (hk) { const j = N.findIndex(x => x.key === hk[1]); const f = j >= 0 && tree.querySelector(`[data-act="${hk[0]}"][data-n="${j}"]`); if (f) f.focus({ preventScroll: true }); }
  }
  const s = N.find(x => x.sel), sk = s ? s.key : '';
  if (sk !== v5.selKey) { v5.selKey = sk; const el = tree.querySelector('.v5-row.sel'); if (el && tree.clientHeight) { const r = el.getBoundingClientRect(), t = tree.getBoundingClientRect(); if (r.top < t.top || r.bottom > t.bottom) tree.scrollTop += r.top < t.top ? r.top - t.top - 2 : r.bottom - t.bottom + 2; } }
  if (!tree.querySelector('[tabindex="0"]')) { const f = tree.querySelector('.v5-name'); if (f) f.tabIndex = 0; }
  // 收起时一行路径
  const path = $('#v5Path'); if (path) { const pt = (s ? (state.tab === 'combo' && state.comboSel >= 0 ? layerName(state.comboSel) + ' › ' : '') + s.name.replace(/^◆ /, '') : ''); path.textContent = pt; path.hidden = true; }     // 收起时路径写在参数区顶上（ps-path），这里不重复
  // 整个树里没有一行能关 / 只看时，列头也灰（单层花型）
  //   这时整列不画（一列灰图标太乱），列头灰着、悬停写为什么
  const any = k => N.some(n => n[k] && n[k].can), eye = any('eye'), solo = any('solo');
  tree.classList.toggle('no-eye', !eye); tree.classList.toggle('no-solo', !solo);
  document.querySelectorAll('#v5TreeBox .v5-colh').forEach((h, j) => { const on = j ? solo : eye; h.classList.toggle('na', !on);
    h.title = j ? (on ? '◎ = 只看这一个：只影响画面，不改参数、不影响导出' : '这个效果没有能单独看的层（多层的层、粒子图的层、尾缀输出的几份才能只看）')
      : (on ? '眼睛 = 显示这层：关了不画、不烘、不导出（进撤销）' : '这个效果的层 / 发射器还没有「显示这层」开关：要新加参数（先记参数变更、等你批）'); });
}
function v5TreeBind(tree) {
  tree.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const n = (v5.nodes || [])[+b.dataset.n]; if (!n) return; const a = b.dataset.act;
    if (a === 'tw') { if (n.kind === 'layer' && state.tab === 'combo' && state.comboSel !== n.i) { v5PickLayer(n.i); return; } v5.open[n.key] = n.tw !== 'open'; store.set('v5Open', v5.open); v5Sched(); setTimeout(v5Heights, 0); return; }
    if (a === 'eye' || a === 'solo') { const o = n[a]; if (!o || !o.can) { if (o && o.why) flash(o.why, true); return; } o.go(); return; }
    if (a === 'menu') { v5LayerMenu(b, n.i); return; }
    if (a === 'pick') { if (n.click) n.click(); else if (n.tab) { if (n.off) { flash('「显示这层」关着：先点眼睛打开', true); return; } selectEmitTab(n.tab); } else if (n.tw) { v5.open[n.key] = n.tw !== 'open'; store.set('v5Open', v5.open); v5Sched(); } }
  });
  tree.addEventListener('dblclick', e => { const b = e.target.closest('[data-act="pick"]'); if (!b) return; const n = v5.nodes[+b.dataset.n]; if (n && n.tw) { v5.open[n.key] = n.tw !== 'open'; store.set('v5Open', v5.open); v5Sched(); } });
  tree.addEventListener('keydown', e => {
    const b = e.target.closest('.v5-name'); if (!b) return;
    const all = [...tree.querySelectorAll('.v5-name')], i = all.indexOf(b), n = v5.nodes[+b.dataset.n];
    const go = j => { const t = all[Math.max(0, Math.min(all.length - 1, j))]; if (t) { all.forEach(x => x.tabIndex = -1); t.tabIndex = 0; t.focus(); } e.preventDefault(); };
    if (e.key === 'ArrowDown') return go(i + 1); if (e.key === 'ArrowUp') return go(i - 1); if (e.key === 'Home') return go(0); if (e.key === 'End') return go(all.length - 1);
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && n && n.tw) { const want = e.key === 'ArrowRight'; if ((n.tw === 'open') !== want) { v5.open[n.key] = want; store.set('v5Open', v5.open); v5Sched(); } e.preventDefault(); }
  });
}
// 层行 ⋯（我的效果）：上移 / 下移 / 改名 / 复制 / 删除这一层（原来图层管理卡片里的）
function v5LayerMenu(anchor, i) {
  let pop = $('#v5Pop');
  if (!pop) { pop = document.createElement('div'); pop.id = 'v5Pop'; pop.className = 'v5-pop'; pop.setAttribute('popover', 'auto'); pop.setAttribute('role', 'menu'); document.body.appendChild(pop);
    pop.addEventListener('click', e => { const b = e.target.closest('[data-my]'); if (!b) return; const k = b.dataset.my, j = +pop.dataset.i; try { pop.hidePopover(); } catch (err) { } if (k === 'up') myMoveLayer(j, -1); else if (k === 'down') myMoveLayer(j, 1); else if (k === 'ren') myRenameLayer(j); else if (k === 'dup') myDupLayer(j); else if (k === 'del') myDelLayer(j); v5Sched(); }); }
  const n = state.layers.length;
  pop.dataset.i = i;
  pop.innerHTML = `<span class="menu-label">第 ${i + 1} 层 · ${v5esc(layerName(i))}</span><button type="button" role="menuitem" data-my="up"${i ? '' : ' disabled'}>上移</button><button type="button" role="menuitem" data-my="down"${i < n - 1 ? '' : ' disabled'}>下移</button><button type="button" role="menuitem" data-my="ren">改名…</button><button type="button" role="menuitem" data-my="dup">复制这一层</button><span class="menu-div"></span><button type="button" role="menuitem" class="v5-danger" data-my="del"${n > 1 ? '' : ' disabled'}>删除这一层</button>`;
  try { pop.showPopover(); } catch (err) { return; }
  const r = anchor.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  pop.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
  pop.style.top = (r.bottom + 4 + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 4) : r.bottom + 4) + 'px';
  const f = pop.querySelector('button:not([disabled])'); if (f) f.focus();
}
// 选中粒子层时，参数最上面一行：母粒 ▾ · 复制 · ＋ 子粒 · 删（4.9.123 结构弹层里的，挪到这里）
function v5GraphTools() {
  const old = $('#v5GTools'), sg = typeof sgOn === 'function' && sgOn(), id = sg ? sgIdOfTab(pview.tabNow) : null;
  const g = id && state.P.sparkGraph, e = g && g.emitters.find(x => x.id === id), host = e && [...document.querySelectorAll('#params section.egrp')].find(x => x.dataset.g === pview.tabNow);
  if (!host) { if (old) old.remove(); return; }
  const opts = [['', '无（独立出生）'], ...GraphTree.parentChoices(g, id).map(x => [x.id, x.name || x.id])], kids = GraphTree.subtree(g, id).length - 1;
  const sig = JSON.stringify([id, e.parent, opts, kids]);
  if (old && old.dataset.sig === sig && old.parentElement === host) return;
  const box = old || document.createElement('div'); box.id = 'v5GTools'; box.className = 'v5-gtools'; box.dataset.sig = sig; box.setAttribute('role', 'group'); box.setAttribute('aria-label', '这一层的结构');
  box.innerHTML = `<label class="v5-gpar">母粒<select aria-label="这一层的母粒">${opts.map(([v, t]) => `<option value="${v5esc(v)}"${(e.parent || '') === v ? ' selected' : ''}>${v5esc(t)}</option>`).join('')}</select></label><span class="v5-sp"></span>`
    + `<button type="button" class="btn mini" data-g="dup" title="复制这一层（参数一样、种子换一个；子粒不跟着复制）">复制</button><button type="button" class="btn mini" data-g="child" title="在这一层下面加一个子粒层（母粒在寿命一半时分出）">＋ 子粒</button><button type="button" class="btn mini v5-danger" data-g="del" title="删掉这一层${kids ? `和它的 ${kids} 个子粒层` : ''}（Ctrl+Z 能撤销）">删除</button>`;
  if (!box._bound) { box._bound = true;
    box.addEventListener('click', ev => { const b = ev.target.closest('[data-g]'); if (!b) return; const cur = sgIdOfTab(pview.tabNow); if (!cur) return;
      if (b.dataset.g === 'dup') sgEdit(gg => GraphTree.dup(gg, cur), x => `复制了一层「${x.name}」（种子换了一个）`);
      else if (b.dataset.g === 'child') sgEdit(gg => GraphTree.add(gg, cur), x => `加了子粒层「${x.name}」`);
      else if (b.dataset.g === 'del') sgDelete(cur); });
    box.addEventListener('change', ev => { const s = ev.target.closest('select'); if (!s) return; const cur = sgIdOfTab(pview.tabNow); if (!cur) return;
      sgEdit(gg => GraphTree.reparent(gg, cur, s.value || null) ? gg.emitters.find(x => x.id === cur) : null, x => x.parent ? `「${GraphTree.short(x)}」的母粒改成了「${GraphTree.short(state.P.sparkGraph.emitters.find(y => y.id === x.parent) || {})}」` : `「${GraphTree.short(x)}」改成独立出生的粒子层`); }); }
  const head = host.querySelector(':scope > .ehead'); if (head) head.after(box); else host.prepend(box);
}

// ---------------- 参数下拉：只有开 / 关 → 方形开关；2–3 个短选项 → 分段；其余照旧下拉（用户 10-27 20:50 / 21:18）----------------
//  下拉本身留着（藏起来）：改值还是走它的 change，检查脚本、摘要、撤销都不变
function selEnhance(row, s, it) {
  if (!row || !s || !it || !Array.isArray(it.options) || it.options.length < 2 || it.options.length > 3 ) return;
  const labs = it.options.map(([v, l]) => [String(v), splitLab(l)[0], splitLab(l)[1], l]);
  const name = (row._lab || '').replace(/"/g, '');
  if (labs.length === 2) {
    const offI = labs.findIndex(x => /^(关闭|关|不|未|否|隐藏|无)/.test(x[1])), onI = labs.findIndex(x => /^(开启|开|已|显示|跟随|是|有|烘进)/.test(x[1]));
    if (offI >= 0 && onI >= 0 && offI !== onI) {
      const sw = document.createElement('input'); sw.type = 'checkbox'; sw.className = 'fw-switch v5-sw'; sw.setAttribute('role', 'switch'); sw.setAttribute('aria-label', name);
      const sync = () => { sw.checked = s.value === labs[onI][0]; sw.disabled = s.disabled; sw.title = (labs[sw.checked ? onI : offI][3] || '').replace(/（/, '：').replace(/）$/, ''); };
      sw.addEventListener('change', () => { s.value = labs[sw.checked ? onI : offI][0]; s.dispatchEvent(new Event('change', { bubbles: true })); sync(); });
      s.after(sw); row.classList.add('v5-enh', 'v5-has-sw'); row._segSync = sync; v5WrapRefresh(row); sync();
      if (/\.enabled$/.test(String(it.sel))) row.classList.add('v5-dup');     // 「显示这层」= 树上的眼睛（19:26「显示这一层和小眼睛重复了」）
      return;
    }
  }
  const total = labs.reduce((a, x) => a + [...x[1]].reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 2 : 1.1), 0), 0);
  if (total > 24 || labs.some(x => !x[1])) return;
  const seg = document.createElement('div'); seg.className = 'v5-seg'; seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', name);
  seg.innerHTML = labs.map(([v, sh, det]) => `<button type="button" role="radio" data-v="${v5esc(v)}" title="${v5esc(det || sh)}">${v5esc(sh)}</button>`).join('');
  const bs = [...seg.children];
  const sync = () => { for (const b of bs) { const o = [...s.options].find(x => x.value === b.dataset.v), on = s.value === b.dataset.v; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; b.disabled = !!(o && o.disabled) || s.disabled; b.hidden = !!(o && o.hidden); if (o && o.title) b.title = o.title; } };
  seg.addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b || b.disabled || s.value === b.dataset.v) return; s.value = b.dataset.v; s.dispatchEvent(new Event('change', { bubbles: true })); sync(); });
  seg.addEventListener('keydown', e => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return; const ok = bs.filter(b => !b.disabled && !b.hidden), i = ok.indexOf(document.activeElement);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? ok.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + ok.length) % ok.length; if (ok[j]) { ok[j].click(); ok[j].focus(); } e.preventDefault(); });
  s.after(seg); row.classList.add('v5-enh', 'v5-has-seg'); row._segSync = sync; v5WrapRefresh(row); sync();
}
function v5WrapRefresh(row) { const r0 = row._refresh; if (row._v5r) return; row._v5r = true; row._refresh = function () { if (r0) r0.apply(this, arguments); if (row._segSync) row._segSync(); }; }

// ---------------- 启动 ----------------
function v5Init() { try { v5Build(); } catch (e) { console.error('V5 右栏没搭起来：', e); } }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', v5Init); else v5Init();
