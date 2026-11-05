// E 4.0（= E 样板 v3.7）P1：骨架上的新部件（4.9.128，对话框9 P）——结构树、面包屑、导出 ▾、状态栏、左栏上下分隔。
// 只读状态、调用已有的函数（selectComboLayer / selectEmitTab / keysShow / 按钮 click），不碰参数、烘焙、导出。
(function e40Layout() {
  if (typeof document === 'undefined') return;
  const $q = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ico = id => `<svg class="i" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const EMIT_ICO = { '星': 'star', '火花': 'spark', '余烬': 'ember', '分叉火花': 'frag', '爆裂': 'frag', '尾迹': 'trail', '尾缀': 'tail', '效果': 'layer', '输出': 'out', '开花闪光': 'star' };
  const ready = () => typeof state !== 'undefined' && state && document.getElementById('tree');

  // ---- 结构树 + 面包屑：效果 › 层 › 发射器（发射器 = 参数栏里的发射器标签） ----
  const emitters = () => [...document.querySelectorAll('#params .etabs .et[data-e]')].filter(b => b.dataset.e !== '全部')
    .map(b => ({ e: b.dataset.e, on: b.classList.contains('on') || b.getAttribute('aria-selected') === 'true', b }));
  const effName = () => { const n = $q('#abIdName'); return (n && n.textContent.trim()) || (typeof safeName === 'function' ? '' : ''); };
  function model() {
    const combo = state.tab === 'combo' && Array.isArray(state.layers) && state.layers.length > 0;
    const layers = combo ? state.layers.map((L, i) => ({ i, name: typeof layerName === 'function' ? layerName(i) : 'L' + (i + 1), off: !!(state.layerView && state.layerView.mute && state.layerView.mute.includes(i)) })) : [];
    return { combo, sel: combo ? state.comboSel : -2, layers, em: emitters(), name: effName(), tab: state.tab };
  }
  let sig = '';
  function render(force) {
    if (!ready()) return;
    const m = model(), s = JSON.stringify([m.combo, m.sel, m.layers, m.em.map(x => [x.e, x.on]), m.name, m.tab, !!$q('#assetBar') && $q('#assetBar').hidden]);
    if (!force && s === sig) return; sig = s;
    const tree = $q('#tree'), emRows = cur => m.em.map(x => `<button type="button" class="trow lv2${x.on && cur ? ' cur' : ''}" role="treeitem" data-em="${esc(x.e)}">${ico(EMIT_ICO[x.e] || 'star')}<span class="nm">${esc(x.e)}</span></button>`).join('');
    let h = '';
    if ($q('#assetBar') && $q('#assetBar').hidden) h = '<div class="tree-empty">在下面的效果库里打开一个效果</div>';
    else if (m.combo) {
      for (const L of m.layers) {
        const cur = L.i === m.sel;
        h += `<button type="button" class="trow lv1${cur ? ' cur' : ''}${L.off ? ' off' : ''}" role="treeitem" aria-selected="${cur}" data-layer="${L.i}"><span class="no">${L.i + 1}</span><span class="nm">${esc(L.name)}</span></button>`;
        if (cur) h += emRows(true);
      }
    } else h = emRows(true);
    tree.innerHTML = h;
    // 面包屑：效果 › 层 › 发射器（末项大号 600）
    const parts = [{ t: m.name || '效果', act: m.combo ? 'root' : '' }];
    if (m.combo && m.sel >= 0 && m.layers[m.sel]) parts.push({ t: m.layers[m.sel].name, act: 'layer' });
    const ce = m.em.find(x => x.on); if (ce && !(m.combo && m.sel < 0)) parts.push({ t: ce.e, act: '' });
    const th = $q('#treeHead'); if (th) th.classList.toggle('cur', m.combo && m.sel < 0);
    $q('#path').innerHTML = parts.map((p, i) => i === parts.length - 1 ? `<span class="cur">${esc(p.t)}</span>` : `<button type="button" data-path="${p.act}">${esc(p.t)}</button><span class="sep" aria-hidden="true">›</span>`).join('');
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('#tree .trow, #path [data-path], #treeHead .ab-id'); if (!t) return;
    if (t.id === 'abId') { if (state.tab === 'combo' && typeof selectComboLayer === 'function') selectComboLayer(-1); setTimeout(() => render(true), 0); return; }
    if (t.dataset.layer != null && typeof selectComboLayer === 'function') selectComboLayer(+t.dataset.layer);
    else if (t.dataset.em && typeof selectEmitTab === 'function') selectEmitTab(t.dataset.em);
    else if (t.dataset.path === 'root' && typeof selectComboLayer === 'function') selectComboLayer(-1);
    else if (t.dataset.path === 'layer') { const b = emitters().find(x => x.e === '效果'); if (b && typeof selectEmitTab === 'function') selectEmitTab(b.e); }
    setTimeout(() => render(true), 0);
  });
  setInterval(() => { if (!document.hidden) { render(); syncSave(); } }, 250);

  // ---- 「保存」后的未保存点（v3.4 第 4 条）：资产栏「参数已变 · 未保存」亮着时 ----
  function syncSave() {
    const chg = $q('#abChg'), sv = $q('#abSave'); if (!chg || !sv) return;
    const dirty = !chg.hidden; sv.classList.toggle('e-dirty', dirty);
    const lab = dirty ? '保存（有没保存的改动）' : '保存'; if (sv.getAttribute('aria-label') !== lab) sv.setAttribute('aria-label', lab);
  }

  // ---- 导出 ▾：资源交付（外壳接管）、导出素材包、看交付清单、导出配方文件 ----
  const menu = () => $q('#expMenu'), dd = () => $q('#expMenuBtn');
  function closeExp() { const m = menu(); if (m && !m.hidden) { m.hidden = true; dd().setAttribute('aria-expanded', 'false'); } }
  function openExp() {
    const m = menu(); if (!m) return;
    if (typeof window.e40ExpSummary === 'function') { try { window.e40ExpSummary($q('#expSum')); } catch (err) { console.error(err); } }
    m.hidden = false; dd().setAttribute('aria-expanded', 'true');
  }
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#expMenuBtn');
    if (b) { if (menu().hidden) openExp(); else closeExp(); return; }
    const it = e.target.closest && e.target.closest('#expMenu [data-exp]');
    if (it) {
      const k = it.dataset.exp; closeExp();
      if (k === 'deliv') { const sh = $q('#shell'); if (!(sh && sh.children.length)) { const o = $q('#deliveryOpen'); if (o) o.click(); } }     // 有外壳时外壳按 data-exp="deliv" 接管
      else if (k === 'pack') $q('#abExportPack').click();
      else if (k === 'list') $q('#abDeliv').click();
      else if (k === 'recipe') $q('#abExportFile').click();
      return;
    }
    if (menu() && !menu().hidden && !(e.target.closest && e.target.closest('#expMenu'))) closeExp();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeExp(); }, true);

  // ---- 状态栏：快捷键 ----
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#keysBtn') && typeof keysShow === 'function') keysShow(); });

  // ---- 左栏上下分隔：拖动改结构树高度、双击收起 / 展开效果库（记住） ----
  function initSplit() {
    const sp = $q('#splitter'), side = $q('#side'); if (!sp || !side) return;
    const get = (k, d) => { try { const v = localStorage.getItem('fw.e40.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
    const put = (k, v) => { try { localStorage.setItem('fw.e40.' + k, JSON.stringify(v)); } catch (e) { } };
    const apply = h => { if (h) side.style.setProperty('--tree-h', Math.round(h) + 'px'); };
    apply(get('treeH', 0)); side.classList.toggle('lib-closed', !!get('libClosed', false));
    sp.addEventListener('pointerdown', e0 => {
      e0.preventDefault(); sp.setPointerCapture(e0.pointerId); sp.classList.add('is-active');
      const top = side.getBoundingClientRect().top, max = side.clientHeight - 120;
      const mv = e => apply(Math.max(80, Math.min(max, e.clientY - top)));
      const up = e => { sp.classList.remove('is-active'); sp.removeEventListener('pointermove', mv); sp.removeEventListener('pointerup', up); const h = parseFloat(side.style.getPropertyValue('--tree-h')); if (h) put('treeH', h); };
      sp.addEventListener('pointermove', mv); sp.addEventListener('pointerup', up);
    });
    sp.addEventListener('dblclick', () => { const c = !side.classList.contains('lib-closed'); side.classList.toggle('lib-closed', c); put('libClosed', c); });
    sp.addEventListener('keydown', e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); const h = $q('#treePane').offsetHeight + (e.key === 'ArrowUp' ? -16 : 16); apply(Math.max(80, h)); put('treeH', Math.max(80, h)); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSplit); else initSplit();
})();
