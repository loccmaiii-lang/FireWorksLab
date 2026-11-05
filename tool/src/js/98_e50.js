// 烟花工坊 5.0.0（本机「烟花工坊（5.0）」，2026-11-05 夜）：全新 5.0 的界面收口——只挪位置、改样子、改字，不碰参数、烘焙、导出。
// 1) 画面读数（规范 v4 §7）：右下「距离 1000 m　预览曝光 1.00 倍」，一直显示；左右拖动改数值，单击输入。底下仍是原来的 #dist / #expo 滑杆（事件照旧）。
// 2) 画面右键菜单（§7「预览设置按钮已去掉」）：原「预览设置」里的 贴图最新（B）/ 自动烘焙 / 按导出分辨率 / 预览泛光 挪进来（原节点整个搬，监听照旧）。
(function e50Stage() {
  if (typeof document === 'undefined') return;
  const $q = s => document.querySelector(s);
  const ready = () => $q('#dist') && $q('#expo') && $q('.vf-foot') && $q('#box');

  // ---- 1) 读数 ----
  const READS = [
    { id: 'dist', box: '#distBox', lab: '距离', val: () => (typeof state !== 'undefined' ? state.dist : 1000), text: v => Math.round(v) + ' m',
      toSlider: v => sliderFromDist(Math.max(DIST_MIN, Math.min(DIST_MAX, v))), parse: s => parseFloat(s), tip: '左右拖动改距离，单击输入' },
    { id: 'expo', box: '#expoBox', lab: '预览曝光', val: () => (typeof state !== 'undefined' ? +state.expo || 1 : 1), text: v => (+v).toFixed(2) + ' 倍',
      toSlider: v => v, parse: s => parseFloat(s), tip: '左右拖动改曝光，单击输入；只影响预览' },
  ];
  function mount() {
    const foot = $q('.vf-foot'); if (!foot || $q('#vfRead')) return;
    const box = document.createElement('span'); box.id = 'vfRead'; box.className = 'vf-read';
    box.innerHTML = READS.map(r => `<span class="vr" data-r="${r.id}" tabindex="0" role="spinbutton" aria-label="${r.lab}" data-tip="${r.tip}"><span class="vr-k">${r.lab}</span><span class="vr-v"></span></span>`).join('');
    foot.appendChild(box);
    for (const r of READS) bind(box.querySelector(`[data-r="${r.id}"]`), r);
    sync();
  }
  function setVal(r, v) {
    const inp = $q('#' + r.id), min = +inp.min, max = +inp.max;
    inp.value = String(Math.max(min, Math.min(max, r.toSlider(v)))); inp.dispatchEvent(new Event('input', { bubbles: true })); sync();
  }
  function bind(el, r) {
    let x0 = 0, s0 = 0, moved = false;
    el.addEventListener('pointerdown', e => {
      if (e.button !== 0 || el.querySelector('input')) return;
      const inp = $q('#' + r.id); x0 = e.clientX; s0 = +inp.value; moved = false; el.setPointerCapture(e.pointerId); el.classList.add('drag');
      const span = (+inp.max - +inp.min) / 300;     // 拖 300 px 走完整个范围
      const mv = ev => { const dx = ev.clientX - x0; if (!moved && Math.abs(dx) < 3) return; moved = true;
        inp.value = String(Math.max(+inp.min, Math.min(+inp.max, s0 + dx * span * (ev.shiftKey ? 0.2 : 1)))); inp.dispatchEvent(new Event('input', { bubbles: true })); sync(); };
      const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.classList.remove('drag'); if (!moved) edit(el, r); };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
    el.addEventListener('keydown', e => {
      if (el.querySelector('input')) return;
      if (e.key === 'Enter') { e.preventDefault(); edit(el, r); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const inp = $q('#' + r.id); inp.value = String(+inp.value + (e.key === 'ArrowRight' ? 1 : -1) * (+inp.step || 1) * (e.shiftKey ? 10 : 1)); inp.dispatchEvent(new Event('input', { bubbles: true })); sync(); }
    });
    el.addEventListener('dblclick', () => { const inp = $q('#' + r.id); inp.dispatchEvent(new Event('dblclick')); if (r.id === 'expo') setVal(r, 1); sync(); });
  }
  function edit(el, r) {
    const v = el.querySelector('.vr-v'), input = document.createElement('input');
    input.type = 'text'; input.className = 'vr-in'; input.value = r.id === 'expo' ? (+r.val()).toFixed(2) : String(Math.round(r.val())); input.setAttribute('aria-label', r.lab);
    v.replaceWith(input); input.focus(); input.select();
    let done = false;
    const end = ok => { if (done) return; done = true; const n = r.parse(input.value);
      if (ok && !Number.isFinite(n)) { input.classList.add('bad'); done = false; return; }
      input.replaceWith(v); if (ok) setVal(r, n); sync(); el.focus(); };
    input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') end(true); else if (e.key === 'Escape') end(false); });
    input.addEventListener('blur', () => end(true));
  }
  function sync() {
    for (const r of READS) {
      const el = $q(`#vfRead [data-r="${r.id}"]`); if (!el) continue;
      const box = $q(r.box); el.hidden = !!(box && box.hidden);
      const v = el.querySelector('.vr-v'); if (v) { const t = r.text(r.val()); if (v.textContent !== t) v.textContent = t; }
      el.classList.toggle('chg', r.id === 'expo' ? Math.abs(r.val() - 1) > 1e-3 : Math.round(r.val()) !== 1000);
    }
  }

  // ---- 2) 画面右键菜单 ----
  let menu = null;
  function buildMenu() {
    menu = document.createElement('div'); menu.id = 'vfCtx'; menu.className = 'e50-ctx'; menu.setAttribute('role', 'menu'); menu.hidden = true;
    for (const id of ['#bakeCtl', '#resolutionBox', '#bloomBox']) { const n = $q(id); if (n) menu.appendChild(n); }
    document.body.appendChild(menu);
    const ps = $q('#previewSettings'); if (ps) ps.hidden = true;
    menu.addEventListener('click', e => { if (e.target.closest('#bakeNow')) closeMenu(); });
  }
  const closeMenu = () => { if (menu && !menu.hidden) menu.hidden = true; };
  function openMenu(x, y) {
    if (!menu) buildMenu();
    const c = $q('#previewBloomChk'); if (c && typeof state !== 'undefined' && state.P) c.checked = !!+state.P.previewBloom;
    menu.hidden = false; const w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = Math.min(x, innerWidth - w - 4) + 'px'; menu.style.top = Math.min(y, innerHeight - h - 4) + 'px';
    const f = menu.querySelector('button:not([disabled]), input'); if (f) f.focus({ preventScroll: true });
  }
  document.addEventListener('contextmenu', e => {
    const box = e.target.closest && e.target.closest('#box'); if (!box) return;
    e.preventDefault(); openMenu(e.clientX, e.clientY);
  });
  document.addEventListener('pointerdown', e => { if (menu && !menu.hidden && !(e.target.closest && e.target.closest('#vfCtx'))) closeMenu(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu && !menu.hidden) { closeMenu(); e.stopPropagation(); } }, true);

  const start = () => { if (!ready()) return setTimeout(start, 200); mount(); buildMenu(); setInterval(() => { if (!document.hidden) sync(); }, 250); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

// ===================== 检查器（右栏「参数」）：规范 v4 §10 =====================
// 搜索行 = 搜索框 ＋「筛选 ▾」（仅改动 / 英文名 / 全部参数）＋「全部折叠」＋「⋯」（恢复发射器 / 恢复本层 / 随机微调 / 导入参数）。
// 「现在改的是」、发射器标签（结构树代替）、发射器说明行（进面包屑悬停提示）、模块「？」说明（进模块标题悬停提示）、空模块说明、底部统计、底部按钮、「和打开时一样」这一条：
// 只藏不删（脚本照旧读它们），功能都在上面这几处还能做（见 协作/方案/烟花工坊5.0_界面盘点_2026-11-05.md「已删除」）。
(function e50Inspector() {
  if (typeof document === 'undefined') return;
  const $q = s => document.querySelector(s), $a = (s, r = document) => [...r.querySelectorAll(s)];
  const ico = id => `<svg class="i" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const first = t => { const s = String(t || '').replace(/\s+/g, ' ').trim(); const m = /^(.{4,60}?[。；;])/.exec(s); return (m ? m[1].replace(/[。；;]$/, '') : s.slice(0, 60)).trim(); };

  // ---- 搜索行 ----
  function toolbar() {
    const bar = $q('#params > .ptools.ps-search'); if (!bar || bar.dataset.e50) return;
    bar.dataset.e50 = '1';
    const qi = bar.querySelector('input[type=search]'); if (qi) { qi.placeholder = '参数名'; const w = document.createElement('span'); w.className = 'e50-q'; w.innerHTML = ico('search'); qi.before(w); w.appendChild(qi); }
    const labs = $a(':scope > label.pchg', bar);
    const lab0 = labs[0], lab1 = labs.find(l => l.classList.contains('pen'));
    if (lab0) { lab0.lastChild.textContent = ' 仅改动'; lab0.title = '只显示改过的参数'; }
    if (lab1) { lab1.lastChild.textContent = ' 英文名'; lab1.title = '参数名用英文'; }
    const filt = document.createElement('details'); filt.className = 'ab-more e50-filt';
    filt.innerHTML = `<summary class="btn" data-tip="仅改动、英文名、全部参数">筛选${ico('cd')}</summary><div class="ab-menu e50-menu" role="menu"></div>`;
    const m = filt.querySelector('.ab-menu'); labs.forEach(l => m.appendChild(l));
    const all = document.createElement('label'); all.className = 'pchg pall'; all.title = '所有发射器的参数排在一起';
    all.innerHTML = '<input type="checkbox" data-pall> 全部参数'; m.appendChild(all);
    all.querySelector('input').addEventListener('change', e => {
      if (typeof selectEmitTab !== 'function') return;
      if (e.target.checked) { if (pview.tabNow !== '全部') pview._e50prev = pview.tabNow; selectEmitTab('全部'); }
      else selectEmitTab(pview._e50prev && pview._e50prev !== '全部' ? pview._e50prev : '');
    });
    const fold = document.createElement('button'); fold.type = 'button'; fold.className = 'btn e50-fold'; fold.textContent = '全部折叠';
    fold.addEventListener('click', () => { const ds = openable(), any = ds.some(d => d.open); ds.forEach(d => { if (d.open === any) { d.open = !any; } }); syncFold(); });
    const more = document.createElement('details'); more.className = 'ab-more e50-more';
    more.innerHTML = `<summary class="btn btn-icon" aria-label="更多" data-tip="恢复、随机微调、导入参数">${ico('more')}</summary><div class="ab-menu e50-menu right" role="menu">`
      + `<button type="button" class="mi" data-pm="emit">恢复发射器</button><button type="button" class="mi" data-pm="layer">恢复本层</button><hr>`
      + `<button type="button" class="mi" data-pm="jitter">随机微调</button><button type="button" class="mi" data-pm="import">导入参数…</button></div>`;
    more.addEventListener('toggle', () => { if (more.open) syncMore(more); });
    more.addEventListener('click', e => {
      const b = e.target.closest('[data-pm]'); if (!b || b.disabled) return; more.open = false; const k = b.dataset.pm;
      if (k === 'emit') { const t = pview.tabNow; if (t && t !== '全部' && typeof resetScope === 'function') resetScope(t); }
      else if (k === 'layer') $q('#btnReset') && $q('#btnReset').click();
      else if (k === 'jitter') $q('#btnJitter') && $q('#btnJitter').click();
      else if (k === 'import') $q('#btnImport') && $q('#btnImport').click();
    });
    bar.append(filt, fold, more);
    for (const d of [filt, more]) d.addEventListener('keydown', e => { if (e.key === 'Escape' && d.open) { d.open = false; d.querySelector('summary').focus(); e.stopPropagation(); } });
  }
  function syncMore(more) {
    const t = pview.tabNow, one = !!t && t !== '全部', n = one ? ((pview.nChg || {})[t] || 0) : 0, all = pview.nChgAll || 0;
    const e = more.querySelector('[data-pm=emit]'), l = more.querySelector('[data-pm=layer]'), j = more.querySelector('[data-pm=jitter]');
    e.hidden = !one; e.disabled = !n; e.dataset.tip = n ? `「${t}」改过 ${n} 项` : '没有改动';
    l.textContent = state.tab === 'combo' ? '恢复本层' : '恢复效果'; l.disabled = !all; l.dataset.tip = all ? `改过 ${all} 项` : '没有改动';
    const jb = $q('#btnJitter'); j.hidden = !jb || jb.hidden; j.disabled = !!(jb && jb.disabled);
  }
  const openable = () => $a('#params > section.egrp:not([hidden]) > details.mod').filter(d => !d.hidden && d.offsetParent);
  function syncFold() { const b = $q('#params .e50-fold'); if (!b) return; const t = openable().some(d => d.open) ? '全部折叠' : '全部展开'; if (b.textContent !== t) b.textContent = t; }
  function syncFilt() {
    const f = $q('#params .e50-filt'); if (!f) return;
    const pa = f.querySelector('[data-pall]'), all = pview.tabNow === '全部'; if (pa && pa.checked !== all) pa.checked = all;
    const n = $a('input[type=checkbox]', f).filter(c => c.checked).length, sm = f.querySelector('summary');
    sm.classList.toggle('on', n > 0); const tip = n ? `筛选：${n} 项开着` : '仅改动、英文名、全部参数'; if (sm.dataset.tip !== tip) sm.dataset.tip = tip;
  }

  // ---- 模块：「？」说明 → 标题悬停提示；模块里的长说明段落收起 ----
  function modules() {
    for (const d of $a('#params details.mod')) {
      if (d.dataset.e50) continue; d.dataset.e50 = '1';
      const sm = d.querySelector(':scope > summary'), hp = d.querySelector(':scope > p.hint');
      if (sm && hp) { const t = first(hp.textContent); if (t) sm.dataset.tip = t; }
    }
    // 发射器说明（「父级 · 开花那一刻一次生成……」）→ 面包屑末项的悬停提示
    const cur = pview && pview.tabNow, g = cur && cur !== '全部' ? $q(`#params > section.egrp[data-g="${cur}"]`) : null, last = $q('#path .cur');
    if (last && g) { const w = g.querySelector('.ehead .ewhat'), lv = g.querySelector('.ehead .elv'), tip = [lv ? lv.textContent.trim() : '', w ? first(w.textContent) : ''].filter(Boolean).join('：'); if (tip && last.dataset.tip !== tip) last.dataset.tip = tip; }
  }

  // ---- 「建议曝光（按最亮时刻）」→「贴图曝光」那一行标签和滑杆之间的图标命令（§10） ----
  function exposure() {
    const src = $q('#suggestExposure'), box = $q('#exposureControls'); if (!src) return;
    const row = $a('#params .sl').find(r => r._it && Array.isArray(r._it) && r._it[0] === 'exposure'); if (!row) return;
    let b = row.querySelector(':scope > .e50-auto');
    if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-icon e50-auto'; b.innerHTML = ico('auto'); b.setAttribute('aria-label', '按最亮时刻设曝光');
      b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); src.click(); }); row.querySelector(':scope > .k').after(b); row.classList.add('has-auto'); }
    const off = src.disabled || (box && box.hidden); b.disabled = !!src.disabled; b.hidden = !!(box && box.hidden);
    const t = src.disabled ? '曝光已锁定' : '按最亮时刻设曝光'; if (b.dataset.tip !== t) b.dataset.tip = t; void off;
  }

  // ---- 「星头朝下」「自动选格子」跟着「贴图」规格块走（规格块每次重建前会放回原处，不会被清掉） ----
  function specBits() { const sm = $q('#specMore'); if (!sm) return; for (const id of ['#flipBox', '#gridBox']) { const n = $q(id); if (n && n.parentElement !== sm) sm.appendChild(n); } }

  // ---- 「导出种子变体」挪进「导出 ▾」菜单（原底部按钮藏起来） ----
  function variantsItem() {
    const m = $q('#expMenu'), src = $q('#btnVariants'); if (!m || !src) return;
    let it = m.querySelector('[data-exp="variants"]');
    if (!it) { it = document.createElement('button'); it.className = 'mi'; it.type = 'button'; it.setAttribute('role', 'menuitem'); it.dataset.exp = 'variants'; it.textContent = '导出种子变体';
      const after = m.querySelector('[data-exp="list"]') || m.querySelector('[data-exp="pack"]'); (after ? after.after(it) : m.appendChild(it));
      it.addEventListener('click', () => { m.hidden = true; const dd = $q('#expMenuBtn'); if (dd) dd.setAttribute('aria-expanded', 'false'); src.click(); }); }
    const hide = state.tab === 'combo'; if (it.hidden !== hide) it.hidden = hide; it.disabled = !!src.disabled; it.dataset.tip = src.disabled ? '只有大面片母版能出种子变体' : 'V1–V3 三张贴图';
  }

  // ---- 「恢复本模块」（§10：只在悬停标题时出现；模块里有改过的参数才有）：逐行还原到打开时，每一行都能 Ctrl+Z ----
  function modReset() {
    for (const d of $a('#params details.mod')) {
      const sm = d.querySelector(':scope > summary'); if (!sm) continue;
      let b = sm.querySelector(':scope > .e50-mrst');
      const chg = $a(':scope > .sl.chg, :scope > .field.chg', d);
      if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-icon e50-mrst'; b.innerHTML = ico('reset'); b.setAttribute('aria-label', '恢复本模块');
        // 同旧的「↺」（79_assetops.js syncScopeResets → resetScope）：一次还原整个模块，Ctrl+Z 一步撤回；旧的那个常驻琥珀「↺」藏了
        b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (typeof resetScope === 'function' && d._g) { resetScope(d._g, d._mod); return; } if (typeof resetRow !== 'function') return; for (const r of $a(':scope > .sl.chg, :scope > .field.chg', d)) resetRow(r); });
        const ms = sm.querySelector('.msum'); ms ? ms.before(b) : sm.appendChild(b); }
      b.hidden = !chg.length; const t = chg.length ? `恢复本模块（${chg.length} 项）` : ''; if (b.dataset.tip !== t) b.dataset.tip = t;
    }
  }
  // ---- 状态句一行显示，全文进悬停提示；「产物」的说明进它的标签提示；本层颜色里的两段说明进各自标题的悬停提示 ----
  function hintTips() {
    { const sm = $q('#colorControls details.color-extra > summary'); if (sm && sm.dataset.tip !== '只影响预览，不参与烘焙') sm.dataset.tip = '只影响预览，不参与烘焙'; }
    // 层的导出方案说明（原「随整包导出 · 方案说明」）→「导出方案」标题的悬停提示；有问题时那一句照样露出来（琥珀色一行）
    //   标题提示只写下拉里看不出来的那一句：「注意：」后第一句，或手机「自动」为什么不出（「手机不出：和第 1 层同时播」）；全文在琥珀那一行的提示里
    { const n = $q('#lhOutNote'), sm = $q('#lhOut > summary'); if (n && sm) { const t = n.textContent.trim(), ix = typeof state !== 'undefined' ? state.comboSel : -1;
        const mp = ix >= 0 && typeof comboMobileNow === 'function' ? comboMobileNow(ix) : null, w = (t.split('注意：')[1] || '').split(/[；。（]/)[0].trim();
        const tip = w || (mp && mp.auto && mp.kind === 'off' && mp.why ? '手机不出：' + mp.why.split('，')[0] : '');
        if (tip) { if (sm.dataset.tip !== tip) sm.dataset.tip = tip; } else if (sm.dataset.tip) delete sm.dataset.tip;
        const p = n.closest('.lh-out-info'); if (p && n.dataset.tip !== t) n.dataset.tip = t; } }
    // 导出方案那句（「PC：…· 手机：…」）→ 模块标题的悬停提示（下面的 PC 导出、手机导出两行已经写着选了什么）
    for (const p of $a('#params .infohost[data-info=schemeNote] p.hint')) { const sm = p.closest('details.mod') && p.closest('details.mod').querySelector(':scope > summary'), t = p.textContent.trim(); if (sm && sm.dataset.tip !== t) sm.dataset.tip = t; }
    for (const p of $a('#params .infohost p.hint')) { const t = p.textContent.trim(); if (p.dataset.tip !== t && !p.title) p.dataset.tip = t; }
    const fn = $q('#formNote'), lab = $q('#x-form') && $q('#x-form').closest('.field');
    if (fn && lab) { const t = first(fn.textContent); if (lab.dataset.tip !== t) lab.dataset.tip = t; }
  }
  let sig = '';
  function run() {
    if (typeof state === 'undefined' || !state || !$q('#params')) return;
    toolbar(); modules(); exposure(); specBits(); syncFilt(); syncFold(); variantsItem(); hintTips(); modReset();
  }
  const start = () => { if (!$q('#params')) return setTimeout(start, 200);
    new MutationObserver(() => { if (sig) return; sig = 'p'; queueMicrotask(() => { sig = ''; run(); }); }).observe($q('#params'), { childList: true });
    run(); setInterval(() => { if (!document.hidden) run(); }, 400); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
