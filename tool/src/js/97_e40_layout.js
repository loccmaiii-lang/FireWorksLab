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
  const emitters = () => [...document.querySelectorAll('#params .etabs .et[data-e]')].filter(b => b.dataset.e !== '全部' && !b.hidden)
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
    // 5.0.0：自定义发射器行尾一个 ×（原来在参数栏发射器框右上角，发射器框的标题藏起来了）
    const tree = $q('#tree'), emRows = cur => m.em.map(x => { const xi = /^自定义 (\d+)$/.exec(x.e);
      return `<div class="trow lv2${x.on && cur ? ' cur' : ''}" role="treeitem" tabindex="0" data-em="${esc(x.e)}">${ico(EMIT_ICO[x.e] || 'star')}<span class="nm">${esc(x.e)}</span>`
        + (xi ? `<span class="ta"><button type="button" class="btn btn-icon" data-exdel="${xi[1]}" aria-label="去掉「${esc(x.e)}」" title="去掉这个发射器&#10;Ctrl+Z 撤销">${ico('x')}</button></span>` : '') + '</div>'; }).join('');
    let h = '';
    if ($q('#assetBar') && $q('#assetBar').hidden) h = '<div class="tree-empty">在下面的效果库里打开一个效果</div>';
    else if (m.combo) {
      for (const L of m.layers) {
        const cur = L.i === m.sel;
        const solo = state.layerView && state.layerView.solo === L.i;
        h += `<div class="trow lv1${cur ? ' cur' : ''}${L.off ? ' off' : ''}" role="treeitem" tabindex="0" aria-selected="${cur}" data-layer="${L.i}" data-tip="${esc(layerTip(L.i))}"><span class="no">${L.i + 1}</span><span class="nm">${esc(L.name)}</span>`
          + `<span class="ta${L.off || solo ? ' keep' : ''}"><button type="button" class="btn btn-icon eye" data-ta="mute" aria-pressed="${!L.off}" aria-label="显示第 ${L.i + 1} 层" title="${L.off ? '显示' : '隐藏'}这一层（只影响观察）">${ico(L.off ? 'eyeoff' : 'eye')}</button>`
          + `<button type="button" class="btn btn-icon solo" data-ta="solo" aria-pressed="${solo}" aria-label="只看第 ${L.i + 1} 层" title="${solo ? '取消只看' : '只看这一层'}（只影响观察）">${ico(solo ? 'soloon' : 'solo')}</button>`
          + `<button type="button" class="btn btn-icon" data-ta="more" aria-label="第 ${L.i + 1} 层的更多操作" aria-haspopup="menu" title="时间、排序、改名、复制、删除">${ico('more')}</button></span></div>`;
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
    const ta = e.target.closest && e.target.closest('#tree .ta [data-ta]');
    if (ta) {
      const i = +ta.closest('.trow').dataset.layer, v = state.layerView, k = ta.dataset.ta;
      if (k === 'mute' && v) v.mute = v.mute.includes(i) ? v.mute.filter(x => x !== i) : [...v.mute, i];
      else if (k === 'solo' && v) v.solo = v.solo === i ? -1 : i;
      if ((k === 'mute' || k === 'solo') && typeof buildLayerCard === 'function') buildLayerCard();
      if (k === 'more') { e.stopImmediatePropagation(); if (pop && pop.dataset.li === String(i)) closePop(); else layerMenu(ta, i); return; }     // 5.0.0：图层管理卡片去掉，层的操作在这里
      setTimeout(() => render(true), 0); return;
    }
    const xd = e.target.closest && e.target.closest('#tree [data-exdel]');
    if (xd) { if (typeof exRemoveSlot === 'function') exRemoveSlot(+xd.dataset.exdel); setTimeout(() => render(true), 0); return; }
    const t = e.target.closest && e.target.closest('#tree .trow, #path [data-path], #treeHead .ab-id'); if (!t) return;
    if (t.id === 'abId') { if (state.tab === 'combo' && typeof selectComboLayer === 'function') selectComboLayer(-1); setTimeout(() => render(true), 0); return; }
    if (t.dataset.layer != null && typeof selectComboLayer === 'function') selectComboLayer(+t.dataset.layer);
    else if (t.dataset.em && typeof selectEmitTab === 'function') selectEmitTab(t.dataset.em);
    else if (t.dataset.path === 'root' && typeof selectComboLayer === 'function') selectComboLayer(-1);
    else if (t.dataset.path === 'layer') { const b = emitters().find(x => x.e === '效果'); if (b && typeof selectEmitTab === 'function') selectEmitTab(b.e); }
    setTimeout(() => render(true), 0);
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('#tree .trow[data-layer], #tree .trow[data-em]')) { e.preventDefault(); e.target.click(); } });
  // 5.0.0 层行的悬停提示（原图层管理卡片上的开始、时长）
  function layerDur(i) { const L = state.layers && state.layers[i], x = L && typeof layerEntryOf === 'function' ? layerEntryOf(L) : null; return x && x.bake && typeof bakeTotal === 'function' ? bakeTotal(x.bake) / (L.rate || 1) : null; }
  function layerTip(i) { const L = state.layers && state.layers[i]; if (!L) return ''; const d = layerDur(i); return `开始 ${(+L.delay || 0).toFixed(2)} s，时长 ${d == null ? '—' : d.toFixed(2) + ' s'}`; }
  // 5.0.0 层的「⋯」菜单（原图层管理卡片上的：上移 / 下移 / 改名 / 复制 / 删除只对我的效果；时间与缩放在这一层的「效果」里）
  function layerMenu(btn, i) {
    closePop(); const my = typeof lib !== 'undefined' && !!lib.my, n = state.layers.length, why = my ? '' : ' disabled data-tip="先存成我的效果"';
    pop = document.createElement('div'); pop.className = 'e40-pop'; pop.setAttribute('role', 'menu');
    pop.innerHTML = `<button type="button" class="mi" role="menuitem" data-lm="time">${ico('timer')}时间与缩放</button><hr>`
      + `<button type="button" class="mi" role="menuitem" data-lm="up"${!my ? why : i === 0 ? ' disabled' : ''}>${ico('cu')}上移</button>`
      + `<button type="button" class="mi" role="menuitem" data-lm="down"${!my ? why : i === n - 1 ? ' disabled' : ''}>${ico('cd')}下移</button>`
      + `<button type="button" class="mi" role="menuitem" data-lm="ren"${why}>${ico('file')}改名…</button>`
      + `<button type="button" class="mi" role="menuitem" data-lm="dup"${why}>${ico('plus')}复制</button>`
      + `<button type="button" class="mi" role="menuitem" data-lm="del"${why}>${ico('x')}删除</button>`;
    let r = btn.getBoundingClientRect(); if (!r.width) r = btn.closest('.trow').getBoundingClientRect(); const side = $q('#side').getBoundingClientRect();
    pop.style.left = Math.max(4, r.right - side.left - 180) + 'px'; pop.style.top = (r.bottom - side.top + 2) + 'px'; pop.dataset.li = i;
    $q('#side').append(pop); const f = pop.querySelector('.mi:not(:disabled)'); if (f) f.focus({ preventScroll: true });
  }
  document.addEventListener('click', e => {
    const it = e.target.closest && e.target.closest('.e40-pop [data-lm]'); if (!it || it.disabled) return;
    const i = +it.closest('.e40-pop').dataset.li, k = it.dataset.lm; closePop();
    if (k === 'time') { if (typeof selectComboLayer === 'function' && state.comboSel !== i) selectComboLayer(i); if (typeof selectEmitTab === 'function') selectEmitTab('效果');
      setTimeout(() => { const p = $q('#lhPos'); if (p) { p.open = true; p.scrollIntoView({ block: 'nearest' }); const nn = p.querySelector('input.num'); if (nn) nn.focus({ preventScroll: true }); } }, 30); }
    else if (k === 'up' && typeof myMoveLayer === 'function') myMoveLayer(i, -1); else if (k === 'down' && typeof myMoveLayer === 'function') myMoveLayer(i, 1);
    else if (k === 'ren' && typeof myRenameLayer === 'function') myRenameLayer(i); else if (k === 'dup' && typeof myDupLayer === 'function') myDupLayer(i); else if (k === 'del' && typeof myDelLayer === 'function') myDelLayer(i);
    setTimeout(() => render(true), 0);
  });
  setInterval(() => { if (!document.hidden) { render(); syncSave(); syncStale(); syncMods(); syncIcons(); } }, 250);

  // ---- 需重新导出（v3.7 第 1 条）：资产栏「素材包过期 / 要重导」→ 效果名后、导出按钮里各一个琥珀小点；原因写在悬停提示和导出菜单里 ----
  const chipInfo = () => [...document.querySelectorAll('#abIdChips .idc')].map(c => ({ t: c.textContent.trim(), warn: c.classList.contains('warn'), d: c.getAttribute('title') || c.dataset.tipT || '' }));
  const staleChip = () => chipInfo().find(c => c.warn && /过期|重导/.test(c.t));
  let staleSig = '';
  function syncStale() {
    const st = staleChip(), info = chipInfo(), id = $q('#abId'), ex = $q('#abExportPack'); if (!id || !ex) return;
    const tip = info.map(c => c.t + (c.d && c.d !== c.t ? '：' + c.d : '')).join('\n'); if (id.dataset.tip !== tip) id.dataset.tip = tip;
    const sig = st ? st.t + '|' + st.d : ''; if (sig === staleSig && !!$q('#e40Stale') === !!st && !!ex.querySelector('.exb') === !!st) return; staleSig = sig;
    let hit = $q('#e40Stale');
    if (st && !hit) { hit = document.createElement('span'); hit.id = 'e40Stale'; hit.className = 'stl-hit'; hit.innerHTML = '<span class="stl" aria-hidden="true"></span>'; id.after(hit); }
    if (hit) { hit.hidden = !st; if (st) { hit.dataset.tip = st.t + '：' + st.d; hit.setAttribute('aria-label', '需重新导出'); } }
    const dot = ex.querySelector('.exb');
    if (st && !dot) ex.insertAdjacentHTML('beforeend', '<span class="exb" aria-hidden="true"></span>'); else if (!st && dot) dot.remove();
    ex.setAttribute('aria-label', st ? '导出素材包，需重新导出' : '导出素材包');
  }
  window.e40ExpSummary = el => {
    if (!el) return; const st = staleChip(), info = chipInfo();
    let dest = ''; try { dest = typeof DeliveryWorkspace !== 'undefined' && DeliveryWorkspace.destination ? DeliveryWorkspace.destination() : ''; } catch (e) { }
    const where = dest === 'zip' ? '打成 ZIP 下载' : dest ? '交到导出根目录（资源交付）' : '';
    el.innerHTML = `<div class="mline"><b>${st ? '<span class="sdot" aria-hidden="true"></span>素材包需重新导出' : ico('check') + (info.some(c => /✓/.test(c.t)) ? '素材包和这一版一致' : '导出交付清单产物表上的东西')}</b></div>`
      + `<dl>${(window.__e50Warn || []).length ? `<dt>自检</dt><dd class="warn">${esc(window.__e50Warn.join('；'))}</dd>` : ''}${st && st.d ? `<dt>原因</dt><dd>${esc(st.d)}</dd>` : ''}${where ? `<dt>位置</dt><dd>${esc(where)}</dd>` : ''}<dt>内容</dt><dd>按交付清单</dd></dl>`;
  };

  // ---- 检查器：改过的模块在摘要前写「+N」（N = 这个模块里改过的参数行） ----
  function syncMods() {
    for (const sm of document.querySelectorAll('#params details.mod>summary')) {
      const ms = sm.querySelector('.msum'); if (!ms) continue;
      const n = sm.classList.contains('mchg') ? sm.parentElement.querySelectorAll(':scope > .sl.chg, :scope > .field.chg').length : 0;
      const v = n ? String(n) : null; if (ms.getAttribute('data-e40n') !== v) { if (v) ms.setAttribute('data-e40n', v); else ms.removeAttribute('data-e40n'); }
    }
  }
  // ---- 播放条上的「生成缩略图」画成相机图标（文字收进悬停提示） ----
  function syncIcons() {
    const g = $q('#thGrab'); if (g && !g.querySelector('svg')) { g.innerHTML = ico('camera'); g.classList.add('btn-icon'); g.setAttribute('aria-label', '生成缩略图'); }
  }

  // ---- 效果名行「＋」：加层 / 加发射器 ----
  let pop = null;
  const closePop = () => { if (pop) { pop.remove(); pop = null; } };
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#e40Add');
    if (b) {
      if (pop) { closePop(); return; }
      const al = $q('#abAddLayer'), ex = $q('#exAdd');
      pop = document.createElement('div'); pop.className = 'e40-pop'; pop.setAttribute('role', 'menu');
      pop.innerHTML = `<button type="button" class="mi" role="menuitem" data-a="layer"${!al || al.disabled || al.hidden ? ' disabled' : ''}>${ico('layer')}加层</button><button type="button" class="mi" role="menuitem" data-a="emit"${ex ? '' : ' disabled title="这一层不能加发射器"'}>${ico('star')}加发射器</button>`;
      const r = b.getBoundingClientRect(), side = $q('#side').getBoundingClientRect();
      pop.style.left = Math.max(4, r.right - side.left - 160) + 'px'; pop.style.top = (r.bottom - side.top + 2) + 'px';
      $q('#side').append(pop); return;
    }
    const it = e.target.closest && e.target.closest('.e40-pop .mi');
    if (it) { const a = it.dataset.a; closePop(); if (a === 'layer') $q('#abAddLayer').click(); else if (a === 'emit' && $q('#exAdd')) $q('#exAdd').click(); return; }
    if (pop && !(e.target.closest && e.target.closest('.e40-pop'))) closePop();
  });

  // ---- 「保存」后的未保存点（v3.4 第 4 条）：资产栏「参数已变 · 未保存」亮着时 ----
  function syncSave() {
    const chg = $q('#abChg'), sv = $q('#abSave'); if (!chg || !sv) return;
    const dirty = !chg.hidden; sv.classList.toggle('e-dirty', dirty);
    const lab = dirty ? '保存（有没保存的改动）' : '保存'; if (sv.getAttribute('aria-label') !== lab) sv.setAttribute('aria-label', lab);
    const vs = $q('#versionSummary'), vh = vs && vs.parentElement; if (vh) { const t = '版本记录' + (vs.textContent.trim() ? '\n现在：' + vs.textContent.trim() : ''); if (vh.dataset.tip !== t) { vh.dataset.tip = t; vh.removeAttribute('title'); } }
  }

  // ---- 导出 ▾：资源交付（外壳接管）、导出素材包、看交付清单、导出配方文件 ----
  const menu = () => $q('#expMenu'), dd = () => $q('#expMenuBtn');
  function closeExp() { const m = menu(); if (m && !m.hidden) { m.hidden = true; dd().setAttribute('aria-expanded', 'false'); } }
  function openExp() {
    const m = menu(); if (!m) return;
    if (typeof window.e40ExpSummary === 'function') { try { window.e40ExpSummary($q('#expSum')); } catch (err) { console.error(err); } }
    const fo = m.querySelector('[data-exp="folder"]'); if (fo) fo.hidden = typeof window.shellPickExportFolder !== 'function';     // 外壳提供时才有
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
      else if (k === 'folder' && typeof window.shellPickExportFolder === 'function') window.shellPickExportFolder();
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
  // ---- 效果库一级标签「效果 / 模板」（记住）----
  function initLibTabs() {
    const pane = $q('#libPane'), tabs = $q('#libTabs'); if (!pane || !tabs) return;
    let cur = '效果'; try { cur = JSON.parse(localStorage.getItem('fw.e40.libTab')) || '效果'; } catch (e) { }
    const set = v => { pane.dataset.lt = v; for (const b of tabs.children) b.setAttribute('aria-selected', String(b.dataset.lt === v)); try { localStorage.setItem('fw.e40.libTab', JSON.stringify(v)); } catch (e) { } };
    set(cur === '模板' ? '模板' : '效果');
    tabs.addEventListener('click', e => { const b = e.target.closest('[data-lt]'); if (!b) return; set(b.dataset.lt); $q('#side').classList.remove('lib-closed'); });
  }
  const init = () => { initSplit(); initLibTabs(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
