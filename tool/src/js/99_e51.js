// 烟花工坊 5.0.01（本机「烟花工坊（5.0）」，用户 11-06 审阅意见：37 条里 34 条按推荐，V02 一屏、V03 删实拍对照、T04 不改）
// 照 E 样板 4.0 把结构上还是旧的地方改掉。只挪位置、改样子：参数、烘焙、导出一行不动；旧部件只藏不删（别的脚本照旧读它们）。
// 条目编号对应审阅页（analysis/local/20261106_烟花工坊5.0_审阅/）和 CHANGELOG 4.9.136。
(function e51() {
  if (typeof document === 'undefined') return;
  const $q = s => document.querySelector(s), $a = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const ico = id => `<svg class="i" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const ready = () => typeof state !== 'undefined' && state && state.P && $q('#params');
  const sec = g => $q(`#params section.egrp[data-g="${g}"]`);
  const modOf = (g, m) => { const s = sec(g); return s ? [...s.querySelectorAll(':scope > details.mod')].find(d => d._mod === m) : null; };
  const rowOf = k => { if (typeof panelRows === 'undefined') return null; const x = panelRows.find(([r, it]) => (Array.isArray(it) ? it[0] : it.sel || it.text || it.curve || (it.info ? 'info:' + it.info : '')) === k); return x ? x[0] : null; };
  const layerView = () => typeof pview !== 'undefined' && (pview.tabNow === '效果' || pview.tabNow === '输出');

  // ---- 0) 借住：放进参数栏的共用节点（花型行、颜色、出生方式……）。参数栏重建（清空 #params）前先放回原处，不然会被一起删掉 ----
  const moved = [];
  function borrow(node, ref, how) {
    if (!node || !ref || node === ref) return;
    if (!moved.some(m => m.node === node)) moved.push({ node, parent: node.parentNode, next: node.nextSibling });
    if (how === 'before') ref.before(node); else if (how === 'after') ref.after(node); else if (how === 'first') ref.prepend(node); else ref.appendChild(node);
  }
  function giveBack() {
    for (const m of moved.splice(0).reverse()) { if (!m.parent) continue; try { m.parent.insertBefore(m.node, m.next && m.next.parentNode === m.parent ? m.next : null); } catch (e) { } }
  }
  if (typeof panelSharedHome === 'function') { const f = panelSharedHome; panelSharedHome = function () { giveBack(); return f.apply(this, arguments); }; }
  if (typeof buildLayerHead === 'function') { const f = buildLayerHead; buildLayerHead = function () { giveBack(); const r = f.apply(this, arguments); setTimeout(post, 0); return r; }; }

  // ---- 1) 层检查器（R02）：选「效果」「输出」时两块一起出现 = 点层行看到的东西；结构树不再列这两个节点（97_e40_layout.js） ----
  function layerSections() {
    const host = $q('#params'); if (!host) return;
    const on = layerView(), auto = !!(pview.q || pview.changed);
    host.classList.toggle('e51-layer', on && !auto);
    if (!on || auto) return;
    for (const g of ['效果', '输出']) { const s = sec(g); if (s && ([...s.querySelectorAll(':scope > details.sec')].some(d => !d.hidden) || s.querySelector('.pm-ident, .e51-out'))) s.hidden = false; }
  }

  // ---- 2) 层检查器里的各块排好（R03 / R05 / R10 / R12） ----
  function placeAll() {
    const eff = sec('效果'), out = sec('输出'); if (!eff) return;
    const ident = $q('.pm-ident');
    // 2a 时间与缩放 + 出生方式（多层的层）
    const pos = $q('#params #lhPos');
    for (const [id, k] of [['lhPos', '层›时间与缩放'], ['lhLink', '层›轨迹联动'], ['eventInstancePanel', '层›出生方式'], ['colorControls', '层›颜色']]) { const d = $q('#' + id); if (d) { d.classList.add('mod'); if (!d._key) d._key = k; if (!d._mod) d._mod = k.split('›')[1]; } }
    if (pos) {
      const sm = pos.querySelector(':scope > summary'); if (sm && sm.textContent !== '时间与缩放') { sm.textContent = '时间与缩放'; sm.title = ''; }
      const ev = $q('#eventInstancePanel');
      if (ev && ev.parentElement === pos) borrow(ev, pos, 'after');
      if (ev) {
        ev.classList.add('mod', 'e51-birth');
        const es = ev.querySelector(':scope > summary'); if (es && !es.querySelector('.msum')) { es.textContent = '出生方式'; es.insertAdjacentHTML('beforeend', '<span class="msum"></span>'); }
        const cb = ev.querySelector('[data-event-enable]'); if (cb) birthSeg(ev, cb);
        const mir = [...pos.querySelectorAll(':scope > label.check')].find(l => /水平镜像/.test(l.textContent)); if (mir) borrow(mir, ev.querySelector('.e51-seg-row') || ev.querySelector(':scope > summary'), 'after');
        const ms = es && es.querySelector('.msum'); if (ms) { const t = (cb && cb.checked ? '飞行后' : '单次') + (ev.querySelector('label.check input:checked') && /水平镜像/.test((ev.querySelector('label.check input:checked').closest('label') || {}).textContent || '') ? '　水平镜像' : ''); if (ms.textContent !== t) ms.textContent = t; }
      }
    }
    // 2b 花型 → 规格模块第一行；导出尺寸 → 规格模块
    const spec = modOf('效果', '规格');
    if (spec && ident) {
      const tb = ident.querySelector('.typebtn'), tf = tb && tb.closest('.field, label, .row2 > *') || tb;
      if (tf && !spec.contains(tf)) borrow(tf, spec.querySelector(':scope > summary'), 'after');
      sizeRow(spec);
    }
    // 2c 颜色（R10）：只在层检查器里出现一次，放在「效果」这一块的最后（输出前面）
    const cc = $q('#colorControls');
    if (cc && cc.parentElement !== eff) borrow(cc, eff, 'append');
    if (cc) colorUI(cc);
    // 2d 输出并成一个模块（R12 / R13）
    if (out) outModule(out, ident);
  }

  // 出生方式：勾选「飞行后出现」→ 分段「单次 / 飞行后」
  function birthSeg(ev, cb) {
    let row = ev.querySelector(':scope > .e51-seg-row');
    if (!row) {
      row = document.createElement('div'); row.className = 'e51-seg-row';
      row.innerHTML = '<span class="fk">序列方式</span><span class="e51-seg" role="group" aria-label="序列方式"><button type="button" data-v="0">单次</button><button type="button" data-v="1">飞行后</button></span>';
      ev.querySelector(':scope > summary').after(row);
      row.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; const want = b.dataset.v === '1'; if (cb.checked !== want) { cb.checked = want; cb.dispatchEvent(new Event('change', { bubbles: true })); } });
      const lab = cb.closest('label'); if (lab) lab.classList.add('e51-gone');
    }
    for (const b of row.querySelectorAll('[data-v]')) b.setAttribute('aria-pressed', String((b.dataset.v === '1') === cb.checked));
  }

  // 导出尺寸（原交付清单顶上那一行）：规格模块里一行下拉，说明进悬停
  let sizeSig = '';
  function sizeRow(spec) {
    if (typeof sizeSpecSelectHTML !== 'function' || typeof sizeSpecLine !== 'function') return;
    const combo = state.tab === 'combo';
    let row = spec.querySelector(':scope > .e51-size');
    let sel = '', line = '';
    try { sel = sizeSpecSelectHTML(combo); line = sizeSpecLine(combo); } catch (e) { sel = ''; }
    const sig = sel + '|' + line;
    if (!sel) { if (row) row.remove(); return; }
    if (row && sig === sizeSig && row.isConnected) return; sizeSig = sig;
    if (!row) { row = document.createElement('label'); row.className = 'field e51-size'; spec.appendChild(row); }
    const tip = line.replace(/：/, '\n');     // 第一行「导出尺寸「坝顶·金芒菊」」，换算在第二行
    row.innerHTML = `<span class="fk" data-tip="${esc(tip)}">导出尺寸</span>${sel}`;
    const s = row.querySelector('select'); if (s) { s.removeAttribute('id'); s.addEventListener('change', () => { const pk = sizePickKey(sizeSpecKeyNow()), all = store.get('sizeSpecPick', {}); if (!pk) return; if (s.value) all[pk] = s.value; else delete all[pk]; store.set('sizeSpecPick', all); sizeSig = ''; if (typeof refreshPanelValues === 'function') refreshPanelValues(); post(); }); }
  }

  // ---- 3) 输出：一个模块（R12），常用的露出来，少改的收进「+N」（R13） ----
  let outOpen = typeof store !== 'undefined' ? store.get('e51OutOpen', true) : true;
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#params .e50-fold')) setTimeout(() => { const w = $q('#params .e51-out'); if (w) { outOpen = w.open; store.set('e51OutOpen', outOpen); } }, 0); });
  const OUT_KEYS = ['outPC', 'outMobile', 'info:specBox', 'outCell', 'pageTarget', 'info:outSummary', 'exposure'];
  function outModule(out, ident) {
    let w = out.querySelector(':scope > details.e51-out');
    if (!w) {
      w = document.createElement('details'); w.className = 'sec mod e51-out'; w._mod = '输出'; w._g = '输出'; w._key = '输出›输出'; w._ph = true;
      w.open = outOpen;
      w.innerHTML = '<summary>输出<button type="button" class="e51-n" hidden></button><span class="msum"></span></summary><div class="e51-more" hidden></div>';     // 常用的行直接放在模块里（和别的模块一样的行样式），少改的在 .e51-more
      w.querySelector(':scope > summary').addEventListener('click', e => { if (e.target.closest('.e51-n')) return; outOpen = !w.open; store.set('e51OutOpen', outOpen); });     // 只记人点的（参数栏重建时 p43DefaultOpen 会把模块都收起）
      w.querySelector('.e51-n').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); const m = w.querySelector('.e51-more'); m.hidden = !m.hidden; store.set('e51OutMore', !m.hidden); if (!w.open) w.open = true; nSync(w); });
      const first = out.querySelector(':scope > details.mod, :scope > details.sec'); if (first) first.before(w); else out.appendChild(w);
      w.querySelector('.e51-more').hidden = !(store.get('e51OutMore', null) ?? true);
    }
    const more = w.querySelector(':scope > .e51-more'), inW = n => n.parentElement === w;
    { const want = pview.q || pview.changed ? true : outOpen; if (w.open !== want) w.open = want; }
    // 产物（大面片 / 分段）、英文名（导出名）
    if (ident) {
      const fs = ident.querySelector('#x-form'), ff = fs && fs.closest('label, .field'); if (ff && !inW(ff)) borrow(ff, more, 'before');
      const en = ident.querySelector('.enname'), ef = en && (en.closest('label, .field') || en); if (ef && ef !== ident && !inW(ef)) borrow(ef, more, 'before');
    }
    // 多层的层：PC / 手机（层页头「导出方案」那两个下拉）
    //   #lhOut 整块放进来（标题藏起来），两个下拉和单帧 / 光点 / 单束的设置都还在 #lhOut 里（别的脚本按 #lhOut 找）
    const lo = $q('#lhOut'); if (lo) { if (!inW(lo)) borrow(lo, more, 'before'); lo.classList.add('e51-lhout'); if (!lo.open) lo.open = true; }
    // 顺序：产物、英文名、PC / 手机、贴图、格子、单格、张数、结果、曝光；和现在不一样才重排（重排会让正在输入的框失焦）
    const want = [ident && ident.querySelector('#x-form') && ident.querySelector('#x-form').closest('label, .field'), ident && ident.querySelector('.enname') && ident.querySelector('.enname').closest('label, .field'), lo,
      ...OUT_KEYS.map(k => rowOf(k))].filter((n, i, a) => n && a.indexOf(n) === i && (inW(n) || out.contains(n)));
    const now = [...w.children].filter(c => want.includes(c));
    if (now.length !== want.length || now.some((c, i) => c !== want[i])) for (const n of want) more.before(n);
    const fs = $q('#x-form'); if (fs) segSel(fs, { master: '大面片', segments: '分段', trail: '尾缀序列', emitset: '循环 + 粒子', phys: '物理', unit: '星头循环', loop: '地面循环' });     // 产物：分段控件（值不变）
    // 少改的参数收进「+N」分组，独立的「数据」模块留在输出下面。
    for (const d of out.querySelectorAll(':scope > details.mod, :scope > details.sec')) if (d !== w && !d.classList.contains('e52-data')) more.appendChild(d);
    for (const d of more.querySelectorAll(':scope > details')) { const s = d.querySelector(':scope > summary'); if (s && s.firstChild && s.firstChild.nodeType === 3 && /^(直接调|算出来的)$/.test(s.firstChild.textContent.trim())) s.firstChild.textContent = s.firstChild.textContent.trim() === '直接调' ? '范围与缩放' : '结果'; }     // 审阅 R12：这两个名字不要了
    if (pview.q || pview.changed) more.hidden = false;
    nSync(w);
    const ms = w.querySelector(':scope > summary > .msum'); if (ms) { const t = outSumText(); if (ms.textContent !== t) ms.textContent = t; }
  }
  // 下拉 → 分段控件（只给选项少、名字短的）：点一段 = 选那一项、照旧触发 change
  function segSel(s, names) {
    let g = s.nextElementSibling && s.nextElementSibling.classList.contains('e51-seg') ? s.nextElementSibling : null;
    if (!g) { g = document.createElement('span'); g.className = 'e51-seg e51-segsel'; g.setAttribute('role', 'group'); g.setAttribute('aria-label', s.getAttribute('aria-label') || ''); s.after(g); s.classList.add('e51-swsel');
      g.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b || b.disabled) return; e.preventDefault(); if (s.value !== b.dataset.v) { s.value = b.dataset.v; s.dispatchEvent(new Event('change', { bubbles: true })); } }); }
    const opts = [...s.options].filter(o => !o.hidden), h = opts.map(o => `<button type="button" data-v="${esc(o.value)}"${o.disabled ? ' disabled' : ''}${names[o.value] ? '' : ` data-tip="${esc(o.text)}"`}>${esc(names[o.value] || o.text.replace(/[（(].*$/, '').trim())}</button>`).join('');
    if (g.dataset.h !== h) { g.dataset.h = h; g.innerHTML = h; }
    for (const b of g.querySelectorAll('[data-v]')) b.setAttribute('aria-pressed', String(b.dataset.v === s.value));
  }
  function nSync(w) {
    const more = w.querySelector('.e51-more'), b = w.querySelector('.e51-n');
    const n = [...more.querySelectorAll('.sl, .field, .spechost')].filter(r => !r.hidden && !r.closest('[hidden]') && !r.classList.contains('e51-gone') && !r.classList.contains('rnd-row')).length;
    b.hidden = !n; const t = more.hidden ? `+${n}` : '收起'; if (b.textContent !== t) b.textContent = t;
    b.dataset.tip = more.hidden ? `${n} 个参数已隐藏，点开显示` : '收起少改的参数';
  }
  function outSumText() {
    let cell = ''; try { cell = typeof outCalc === 'function' ? outCalc().cell + ' px' : ''; } catch (e) { cell = ''; }
    const ro = $a('#params .e51-out .e50-ro'); const pages = ro.map(r => r.textContent).find(t => /^贴图/.test(t));
    const n = pages ? (pages.match(/(\d+)\s*张/) || [])[1] : '';
    return [cell, n ? n + ' 张' : ''].filter(Boolean).join('　');
  }

  // ---- 4) 颜色（R10）：色带 + 当前段、「焰色 ▾」、渐变图四个色块 ----
  function colorUI(cc) {
    const sm = cc.querySelector(':scope > summary'); if (sm && !sm.dataset.e51) { sm.dataset.e51 = '1'; sm.textContent = '颜色'; sm.insertAdjacentHTML('beforeend', '<span class="msum"></span>'); }
    cc.classList.add('mod', 'e51-color');
    const st = cc.querySelector('#stages'); if (!st) return;
    const rows = [...st.querySelectorAll('.stage-row')], M = state.M, dur = Math.max(1, Math.ceil(+state.P.duration || 1));
    if (!rows.length || !M || !Array.isArray(M.stages)) return;
    let band = cc.querySelector('.e51-band-row');
    if (!band) {
      band = document.createElement('div'); band.className = 'e51-band-row';
      band.innerHTML = '<span class="fk">色段</span><span class="e51-band" role="group" aria-label="颜色随时间"></span><button type="button" class="btn btn-icon e51-add" aria-label="加一段" data-tip="加一段">' + ico('plus') + '</button>';
      st.before(band);
      band.addEventListener('click', e => {
        const s = e.target.closest('[data-st]'); if (s) { const r = [...st.querySelectorAll('.stage-row')][+s.dataset.st]; const rd = r && r.querySelector('input[type=radio]'); if (rd) { rd.checked = true; rd.dispatchEvent(new Event('change', { bubbles: true })); } colorUI(cc); return; }
        if (e.target.closest('.e51-add')) { const a = [...st.querySelectorAll('.line2 button')].find(b => /加一段/.test(b.textContent)); if (a && !a.disabled) a.click(); setTimeout(() => colorUI(cc), 0); }
      });
    }
    const cur = Math.min(Math.max(0, state.activeStage || 0), rows.length - 1);
    const segs = M.stages.map((s, i) => { const t0 = +s[0] || 0, t1 = i + 1 < M.stages.length ? +M.stages[i + 1][0] : dur; return { i, l: t0 / dur * 100, w: Math.max(0.5, (t1 - t0) / dur * 100), c: s[1], t0 }; });
    const sig = JSON.stringify([segs, cur]);
    const bd = band.querySelector('.e51-band');
    if (bd.dataset.sig !== sig) { bd.dataset.sig = sig; bd.innerHTML = segs.map(s => `<button type="button" data-st="${s.i}" class="${s.i === cur ? 'cur' : ''}" style="left:${s.l}%;width:${s.w}%;background:${esc(s.c)}" aria-label="第 ${s.i + 1} 段" data-tip="第 ${s.i + 1} 段　${s.t0.toFixed(2)} s 起&#10;${esc(String(s.c).toUpperCase())}"></button>`).join(''); }
    rows.forEach((r, i) => { r.classList.toggle('e51-cur', i === cur); if (!r.querySelector(':scope > .e51-sl')) r.insertAdjacentHTML('afterbegin', `<span class="fk e51-sl">第 ${i + 1} 段</span>`); });
    const add = [...st.querySelectorAll('.line2 button')].find(b => /加一段/.test(b.textContent)); const ab = band.querySelector('.e51-add'); if (add && ab) ab.disabled = add.disabled;
    // 焰色 ▾：12 个预设 + 开头加点火色（都给当前段上色 / 加段）
    const fl = cc.querySelector('#flames');
    if (fl) {
      let fr = cc.querySelector('.e51-flame');
      const chips = [...fl.querySelectorAll('.chip')];
      if (!fr && chips.length) {
        fr = document.createElement('label'); fr.className = 'field e51-flame';
        fr.innerHTML = `<span class="fk" data-tip="给当前段上色">焰色</span><select aria-label="焰色"><option value="">选一个…</option>${chips.map((c, i) => `<option value="${i}">${esc(c.textContent.trim())}</option>`).join('')}<option value="ign">开头加点火色</option></select>`;
        band.after(fr);
        fr.querySelector('select').addEventListener('change', e => { const v = e.target.value; e.target.value = ''; if (v === 'ign') { const b = [...st.querySelectorAll('.line2 button')].find(x => /点火/.test(x.textContent)); if (b && !b.disabled) b.click(); }
          else if (v !== '') { const c = [...fl.querySelectorAll('.chip')][+v]; if (c) c.click(); } setTimeout(() => colorUI(cc), 0); });
      }
    }
    const ex = cc.querySelector('.color-extra'); if (ex && !ex.open) ex.open = true;
    const mss = cc.querySelector(':scope > summary > .msum'); if (mss) { const t = `${M.stages.length} 段`; if (mss.textContent !== t) mss.textContent = t; }
  }

  // ---- 5) 参数行的样子：开关（R06）、随机画在滑杆上（R07）、「自动」图标（R08）、单位「倍」（R09）、换算注进悬停（R18） ----
  const SW = [['关闭', '开启'], ['关', '开'], ['未锁定', '已锁定'], ['隐藏', '显示'], ['不烘', '烘进']];
  function switches(root) {
    for (const s of $a('select', root)) {
      if (s.options.length !== 2) continue;
      const a = s.options[0].text.trim(), b = s.options[1].text.trim();
      const p = SW.find(([x, y]) => (x === a && y === b) || (x === b && y === a)); if (!p) continue;
      const onVal = s.options[a === p[1] ? 0 : 1].value;
      let sw = s.nextElementSibling && s.nextElementSibling.classList.contains('e51-sw') ? s.nextElementSibling : null;
      if (!sw) { sw = document.createElement('button'); sw.type = 'button'; sw.className = 'e51-sw'; sw.setAttribute('role', 'switch'); s.after(sw); s.classList.add('e51-swsel');
        sw.addEventListener('click', e => { e.preventDefault(); const want = s.value === onVal ? [...s.options].find(o => o.value !== onVal).value : onVal; s.value = want; s.dispatchEvent(new Event('change', { bubbles: true })); sync1(); }); }
      const sync1 = () => { const on = s.value === onVal; sw.setAttribute('aria-checked', String(on)); sw.setAttribute('aria-label', (s.getAttribute('aria-label') || '') + (on ? ' 开' : ' 关')); sw.disabled = s.disabled; };
      sync1();
    }
    // 勾选框的开关：文字包进 span，开关放控件列
    for (const l of $a('label.check', root)) {
      if (l.closest('#tlBars, .tlx, #expMenu') || l.classList.contains('e51-gone')) continue;
      if (!l.querySelector(':scope > .e51-ck')) { const tn = [...l.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()); if (tn.length) { const sp = document.createElement('span'); sp.className = 'e51-ck'; sp.textContent = tn.map(n => n.textContent).join('').trim(); tn.forEach(n => n.remove()); l.appendChild(sp); l.classList.add('e51-swl'); } }
    }
  }
  function rowLook() {
    if (typeof panelRows === 'undefined') return;
    const P = state.P;
    for (const [row, it] of panelRows) {
      if (!row || !row.isConnected) continue;
      // R09 单位「×」→「倍」
      const u = row.querySelector(':scope > .punit'); if (u && /^×/.test(u.textContent)) u.textContent = u.textContent.replace(/^×\s*/, '倍');
      const k = row.querySelector(':scope > .k, :scope > .fk'); if (k && k.firstChild && k.firstChild.nodeType === 3 && / ×$/.test(k.firstChild.textContent)) k.firstChild.textContent = k.firstChild.textContent.replace(/ ×$/, '');
      // R18 换算注进数值的悬停
      const vw = row.querySelector(':scope > .vwnote'); if (vw) { const n = row.querySelector('.num'); if (n && vw.textContent && n.title !== vw.textContent) n.title = vw.textContent.replace(/^=\s*/, ''); }
      // V07 预览光晕只留画面右键菜单那个
      if (it && it.sel === 'previewBloom') row.classList.add('e51-gone');
      // R08 跟着算 → 槽位里的「自动」图标
      const ch = row.querySelector(':scope > .adef .chain');
      if (ch) { let b = row.querySelector(':scope > .e51-chain');
        if (!b) { b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-icon e50-auto e51-chain'; b.innerHTML = ico('auto'); b.addEventListener('click', e => { e.preventDefault(); const c = row.querySelector(':scope > .adef .chain'); if (c) c.click(); }); row.appendChild(b); }
        const on = row.classList.contains('adef-on'); b.setAttribute('aria-pressed', String(on)); const t = (ch.title || '').replace(/^跟着算：/, '自动：'); if (b.dataset.tip !== t) b.dataset.tip = t; b.setAttribute('aria-label', on ? '自动（点一下固定）' : '已固定（点一下改回自动）'); }
      // R07 随机：滑杆上画范围，悬停出「分布」
      if (row._rndb && row._rands) band(row, P);
    }
    for (const u of $a('#right .sl > .punit')) if (/^×/.test(u.textContent)) u.textContent = u.textContent.replace(/^×\s*/, '倍');     // 颜色里那几条滑杆不在 panelRows 里
  }
  function band(row, P) {
    const inp = row.querySelector(':scope > input[type=range]'); if (!inp) return;
    const lo = +inp.min, hi = +inp.max, v = +P[row._it[0]]; let s = 0;
    for (const [, it] of row._rands) { const r = +P[it[0]]; if (!isFinite(r) || !r) continue; s = Math.max(s, it[2] === '%' ? Math.abs(v) * r / 100 : r); }
    let b = row.querySelector(':scope > .e51-rb'); if (!b) { b = document.createElement('i'); b.className = 'e51-rb'; b.setAttribute('aria-hidden', 'true'); inp.before(b); }
    const ok = s > 0 && hi > lo && isFinite(v);
    b.hidden = !ok; if (ok) { const f = x => Math.max(0, Math.min(1, (x - lo) / (hi - lo))); b.style.setProperty('--b0', f(v - s)); b.style.setProperty('--b1', f(v + s)); }
    let d = row.querySelector(':scope > .e51-dist');
    if (!d) { d = document.createElement('button'); d.type = 'button'; d.className = 'e51-dist'; d.addEventListener('click', e => { e.preventDefault(); row._rndb.click(); }); row.appendChild(d); }
    const open = !!pview.ropen[row._it[0]], t = '分布 ' + (open ? '▴' : '▾'); if (d.textContent !== t) d.textContent = t;
    d.classList.toggle('on', open); d.dataset.tip = open ? '收起随机范围' : '随机范围' + (s > 0 ? ' ±' + (+s.toFixed(3)) : '');
  }

  // ---- 6) 发射器里没有参数的「颜色」模块不出现（R11） ----
  function colorLinkMods() {
    for (const d of $a('#params details.mod')) {
      if (!d.querySelector(':scope > .clink') && !(d._mod === '颜色' && d.id !== 'colorControls')) continue;
      const has = [...d.children].some(c => c.tagName !== 'SUMMARY' && !c.classList.contains('clink') && !c.hidden && (c.matches('.sl, .field, .infohost, .spechost')));
      d.classList.toggle('e51-gone', !has);
    }
    for (const g of $a('#params .mgo')) g.classList.add('e51-gone');
  }

  // ---- 7) 分层粒子图（R17）：X / Y / Z 三行并一行，下限 / 上限并成区间；层名在结构树双击改 ----
  const TRI = [['X', 'Y', 'Z'], ['横向', '纵深', '竖直']];
  function graphRows() {
    if (!state.P || !state.P.sparkGraph || typeof panelRows === 'undefined') return;
    for (const d of $a('#params details.mod')) {
      const rows = [...d.children].filter(r => r.classList && r.classList.contains('sl') && r._lab && !r.classList.contains('e51-merged'));
      const by = new Map();
      for (const r of rows) { const m = /^(.*?)\s*·\s*(\S+)$/.exec(String(r._lab)); if (!m) continue; if (!by.has(m[1])) by.set(m[1], {}); by.get(m[1])[m[2]] = r; }
      for (const [base, g] of by) {
        const tri = TRI.find(t => t.every(x => g[x])), rng = g['下限'] && g['上限'];
        if (tri) merge(d, base, tri.map(x => g[x]), 'tri');
        else if (rng) merge(d, base, [g['下限'], g['上限']], 'rng');
      }
    }
    for (const [row, it] of panelRows) if (it && it.text && /\.name$/.test(String(it.text)) && row.isConnected) row.classList.add('e51-gone');     // 层名称 → 结构树双击改
  }
  // 收起时的摘要：并起来的行按「寿命 0.015 – 0.065 s」「源中心 0 0 0 m」写
  if (typeof modSummaryText === 'function') { const f = modSummaryText; modSummaryText = function (d) {
    const ms = [...d.children].filter(r => r.classList && r.classList.contains('e51-mrow') && !r.hidden); if (!ms.length) return f.apply(this, arguments);
    return ms.slice(0, 2).map(r => { const ns = [...r.querySelectorAll('.num')].map(n => n.value), u = (r.querySelector('.punit') || {}).textContent || '';
      return `${r.dataset.base} ${r.classList.contains('e51-rng') ? ns.join(' – ') : ns.join(' ')}${u ? ' ' + u : ''}`; }).join(' · '); }; }
  function merge(d, base, parts, kind) {
    const first = parts[0];
    let m = d.querySelector(`:scope > .e51-mrow[data-base="${window.CSS.escape(base)}"]`);
    if (!m) {
      m = document.createElement('div'); m.className = 'sl e51-mrow e51-' + kind; m.dataset.base = base;
      const u = (first.querySelector(':scope > .punit') || {}).textContent || '';
      m.innerHTML = `<label class="k">${esc(base)}</label><span class="e51-nums">${parts.map((p, i) => `${kind === 'rng' && i ? '<span class="e51-dash">–</span>' : ''}<input class="num" type="number" step="${(p.querySelector('.num') || {}).step || 'any'}" data-i="${i}" aria-label="${esc(base)} ${esc(String(p._lab).split('·').pop().trim())}">`).join('')}</span><span class="punit">${esc(u.replace(/^×\s*/, '倍'))}</span>`;
      first.before(m);
      m.addEventListener('change', e => { const i = e.target.dataset.i; if (i == null) return; const n = parts[+i].querySelector('.num'); n.value = e.target.value; n.dispatchEvent(new Event('change', { bubbles: true })); });
    }
    parts.forEach((p, i) => { p.classList.add('e51-merged'); const src = p.querySelector('.num'), dst = m.querySelector(`input[data-i="${i}"]`); if (src && dst && document.activeElement !== dst && dst.value !== src.value) dst.value = src.value; });
    m.hidden = parts.every(p => p.hidden);
  }
  document.addEventListener('dblclick', async e => {
    const r = e.target.closest && e.target.closest('#tree .trow[data-em]'); if (!r || !state.P || !state.P.sparkGraph || typeof askText !== 'function') return;
    if (typeof selectEmitTab === 'function') selectEmitTab(r.dataset.em);
    setTimeout(async () => {
      const x = typeof panelRows !== 'undefined' && panelRows.find(([row, it]) => it && it.text && /\.name$/.test(String(it.text)) && row.isConnected && !row.closest('[hidden]'));
      const inp = x && x[0].querySelector('input'); if (!inp) return;
      const v = await askText('改层名', '', inp.value, '改名'); if (v == null || v === inp.value) return;
      inp.value = v; inp.dispatchEvent(new Event('change', { bubbles: true }));
    }, 50);
  });

  // ---- 8) 参数说明压短（R16）：英文名和单位一行、作用一句、范围和打开时一行、UE 一行、「注意」只留第一句 ----
  const first = t => { const s = String(t || '').replace(/<[^>]+>/g, '').trim(); const m = /^(.+?[。；;])/.exec(s); return (m ? m[1] : s).replace(/[。；;]$/, ''); };
  if (typeof panelHelp === 'function') panelHelp = function (row) {
    const h = $q('#pHelp'); if (!h) return;
    if (!row) { h.innerHTML = ''; return; }
    const it = row._it, B = typeof panelBaseP === 'function' ? panelBaseP() : null, k = Array.isArray(it) ? it[0] : it.sel || it.text, nm = row._nm;
    const unit = Array.isArray(it) && it[2] ? ` <small>${esc(String(it[2]).replace(/^×\s*/, '倍'))}</small>` : '';
    const rng = Array.isArray(it) ? `范围 ${it[3]} – ${it[4]}` : '', base = B && B[k] != null ? `打开时 ${Array.isArray(it) ? fmtV(B[k], it[5]) : esc(B[k])}` : '';
    const head = nm ? `<b>${esc(nm.en || nm.cn)}</b>${nm.en && nm.cn ? ` <span class="ph-cn">${esc(nm.cn)}</span>` : ''}${unit}` : `<b>${esc(row._lab)}</b>${unit}`;
    const desc = nm ? first(nm.desc) : first(row._detail);
    h.innerHTML = head + (desc ? `<span class="ph-d">${esc(desc)}</span>` : '') + (rng || base ? `<span class="ph-meta">${[rng, base].filter(Boolean).join('　')}</span>` : '')
      + (row._inert ? `<span class="ph-inert">${esc(typeof whyShort === 'function' ? whyShort(row._inert) : row._inert)}</span>` : '')
      + (nm && nm.ue ? `<span class="ph-x">UE：${esc(first(nm.ue))}</span>` : '') + (nm && nm.note ? `<span class="ph-x">注意：${esc(first(nm.note))}</span>` : '');
  };

  // ---- 9) 多层效果根：「整体」（R04）——总时长只读 + 每层一行（点了到那一层）；各层参数只在层里改 ----
  function rootPanel() {
    const pc = $q('#pCombo'); if (!pc) return;
    const on = state.tab === 'combo' && state.comboSel < 0 && !pc.hidden;
    let r = $q('#e51Root');
    if (!r) { r = document.createElement('div'); r.id = 'e51Root'; pc.prepend(r);
      r.addEventListener('click', e => { const x = e.target.closest('[data-li]'); if (!x) return; selectComboLayer(+x.dataset.li); if (typeof selectEmitTab === 'function') selectEmitTab('效果'); }); }
    pc.classList.add('e51-rooted'); if (!on) return;
    let total = 0; try { total = typeof comboDuration === 'function' ? comboDuration() : 0; } catch (e) { total = 0; }
    const rows = state.layers.map((L, i) => { const e = typeof layerEntryOf === 'function' ? layerEntryOf(L) : null, dur = e && e.bake ? bakeTotal(e.bake) / (L.rate || 1) : 0;
      return `<button type="button" class="e51-lrow" data-li="${i}"><span class="no">${i + 1}</span><span class="nm">${esc(typeof layerName === 'function' ? layerName(i) : 'L' + (i + 1))}</span><span class="v">${(+L.delay || 0).toFixed(2)} s 起</span><span class="v">${dur.toFixed(2)} s</span></button>`; }).join('');
    const h = `<section class="e51-whole"><h4>整体</h4><div class="e51-ro"><span class="fk" data-tip="由最晚结束的层决定">总时长</span><span class="d"></span><b>${total.toFixed(2)} s</b></div></section>`
      + `<section class="e51-whole"><h4>层</h4><div class="e51-lhead"><span></span><span>名称</span><span>开始</span><span>时长</span></div>${rows}</section>`;
    if (r.dataset.h !== h) { r.dataset.h = h; r.innerHTML = h; }
  }

  // ---- 10) 画面：删实拍对照（V03）、尾缀分层看进右键（V04）、取景框四角（V05）、旧贴图提示（V06）、序列贴图一屏（V02） ----
  if (typeof setRefVideo === 'function') { const f = setRefVideo; setRefVideo = function () { const r = f.apply(this, arguments); refOff(); return r; }; }
  if (typeof refToggle === 'function') refToggle = () => { };
  function refOff() {
    const b = $q('#btnRef'); if (b) b.hidden = true;
    const box = $q('#refBox'); if (box && !box.hidden) { box.hidden = true; const v = $q('#refVid'); if (v) try { v.pause(); } catch (e) { } }
    const t = $q('#simTag'); if (t) t.hidden = true;
    const cw = $q('.canvas-wrap'); if (cw && cw.classList.contains('split')) cw.classList.remove('split');
  }
  function corners() { const b = $q('#box'); if (!b || b.querySelector(':scope > .e51-corner')) return; b.insertAdjacentHTML('beforeend', ['tl', 'tr', 'bl', 'br'].map(k => `<i class="e51-corner ${k}" aria-hidden="true"></i>`).join('')); }
  // 右键菜单「只看」：尾缀的各段（原画面上方那排按钮）
  document.addEventListener('contextmenu', e => {
    if (!(e.target.closest && e.target.closest('#box'))) return;
    setTimeout(() => {
      const menu = $q('#vfCtx'), bar = $q('#rtLayerBar'); if (!menu) return;
      let s = menu.querySelector('.e51-only'); if (s) s.remove();
      const bs = bar ? [...bar.querySelectorAll('[data-k]')] : [];
      const show = bs.length && typeof isEmit === 'function' && isEmit(state.P) && state.tab !== 'combo' && (state.view === 'live' || state.view === 'export');
      if (!show) return;
      s = document.createElement('div'); s.className = 'e51-only'; s.setAttribute('role', 'group'); s.setAttribute('aria-label', '只看');
      const off = typeof rtShow !== 'undefined' ? rtShow.off : new Set();
      s.innerHTML = '<span class="e51-ml">只看</span>' + bs.map(b => `<button type="button" class="e51-mi" data-k="${esc(b.dataset.k)}" role="menuitemcheckbox" aria-checked="${!off.has(b.dataset.k)}">${esc((b.childNodes[0] || {}).textContent || b.dataset.k)}</button>`).join('') + '<button type="button" class="e51-mi" data-all="1">全部</button>';
      menu.appendChild(s);
      s.addEventListener('click', ev => { const x = ev.target.closest('button'); if (!x) return; if (x.dataset.all) bar.querySelector('[data-all]').click(); else { const b = bar.querySelector(`[data-k="${window.CSS.escape(x.dataset.k)}"]`); if (b) b.click(); }
        const o = typeof rtShow !== 'undefined' ? rtShow.off : new Set(); for (const y of s.querySelectorAll('[data-k]')) y.setAttribute('aria-checked', String(!o.has(y.dataset.k))); });
    }, 0);
  });
  // V02 序列贴图：左边当前格 + 整张贴图 + 帧号（原来那一页，不分开），右边交付表（原「交付清单」的产物表），下面翻页
  let delivSig = '';
  function atlasSide() {
    const cw = $q('.canvas-wrap'); if (!cw) return;
    const on = state.view === 'atlas' && !state.showcase && state.tab !== 'asset' && !(typeof stage2 !== 'undefined' && stage2.deliv);
    cw.classList.toggle('e51-atlas', on);
    let p = $q('#e51Deliv');
    if (!p) { p = document.createElement('aside'); p.id = 'e51Deliv'; p.className = 'e51-deliv'; p.setAttribute('aria-label', '交付表'); cw.appendChild(p);
      p.addEventListener('change', e => { const s = e.target.closest('select[data-prod]'); if (s && typeof setProduct === 'function') { setProduct(+s.dataset.i, s.dataset.prod, s.value); delivSig = ''; } });
      p.addEventListener('click', e => { if (e.target.closest('select, button, a')) return; const tr = e.target.closest('tr[data-li]'); if (tr && state.tab === 'combo') selectComboLayer(+tr.dataset.li); }); }
    p.hidden = !on; pager(on);
    if (!on || typeof prodTableHTML !== 'function' || typeof curLayerBakes !== 'function') return;
    const combo = state.tab === 'combo';
    let xs = []; try { xs = curLayerBakes(); if (combo && typeof comboMobilePlan === 'function') comboMobilePlan(xs).forEach((pl, k) => { xs[k].mob = pl; }); } catch (e) { return; }
    const sig = JSON.stringify([state.gen, combo ? state.comboSel : -2, xs.map(x => [x.i, !!x.b, x.b && x.b.N, typeof layerOut === 'function' && x.L ? layerOut(x.L) : null]), state.P && [state.P.outPC, state.P.outMobile]]);
    if (sig === delivSig && p.innerHTML) { mark(p); return; } delivSig = sig;
    let t = ''; try { t = prodTableHTML(xs, combo); } catch (e) { t = `<p class="hint">${esc(e.message)}</p>`; }
    p.innerHTML = `<div class="e51-dh"><b>交付表</b><span>每层导出什么</span></div>${t}`;
    p.querySelectorAll('.dv-prod tbody tr').forEach((tr, k) => { if (xs[k]) tr.dataset.li = xs[k].i; });
    const th = p.querySelector('.dv-prod thead th'); if (th) { th.textContent = '层'; th.removeAttribute('title'); }
    if (!combo) { const td = p.querySelector('.dv-prod tbody tr td'), nm = ($q('#abIdName') || {}).textContent; if (td && nm && td.firstChild && td.firstChild.nodeType === 3) { td.dataset.tip = td.firstChild.textContent; td.firstChild.textContent = nm.trim(); } }
    mark(p);
  }
  const mark = p => p.querySelectorAll('tr[data-li]').forEach(tr => tr.classList.toggle('cur', state.tab === 'combo' && +tr.dataset.li === state.comboSel));
  function pager(on) {
    const ts = $q('#texSeg'), cw = $q('.canvas-wrap'); if (!ts || !cw) return;
    let pg = $q('#e51Pager');
    if (!pg) { pg = document.createElement('div'); pg.id = 'e51Pager'; pg.className = 'e51-pager'; pg.innerHTML = '<button type="button" class="btn btn-icon" data-d="-1" aria-label="上一张">‹</button><span class="t"></span><span class="n"></span><button type="button" class="btn btn-icon" data-d="1" aria-label="下一张">›</button>'; cw.appendChild(pg);
      pg.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b) return; const bs = [...ts.querySelectorAll('button')]; if (!bs.length) return; let i = bs.findIndex(x => x.getAttribute('aria-pressed') === 'true'); i = (Math.max(0, i) + +b.dataset.d + bs.length) % bs.length; bs[i].click(); }); }
    const bs = [...ts.querySelectorAll('button')], show = on && bs.length > 1 && !ts.hidden;
    pg.hidden = !show; if (!show) return;
    const i = Math.max(0, bs.findIndex(x => x.getAttribute('aria-pressed') === 'true'));
    const t = bs[i].textContent.replace('（跟时间）', ''), n = `${i + 1} / ${bs.length}`;
    if (pg.querySelector('.t').textContent !== t) pg.querySelector('.t').textContent = t;
    if (pg.querySelector('.n').textContent !== n) pg.querySelector('.n').textContent = n;
  }

  // ---- 11) 时间轴：时间滑杆去掉后，刻度尺能拖（T02）；单层的行名写效果名（T05） ----
  document.addEventListener('pointerdown', e => {
    const tr = e.target.closest && e.target.closest('#tlBars .tlr-track'); if (!tr) return;
    const set = ev => { const r = tr.getBoundingClientRect(); state.t = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * curDuration(); };
    const mv = ev => set(ev), up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  }, true);
  function tlNames() {
    if (state.tab === 'combo') return;
    const n = $q('#tlBars .tlb-n'), nm = ($q('#abIdName') || {}).textContent; if (n && nm && n.textContent !== nm.trim()) { n.dataset.tip = n.textContent; n.textContent = nm.trim(); }
  }

  // ---- 12) 效果库（L01）：花型筛选 + 一个列表 + 状态词；「待验收」能单看 ----
  const CATS = [['all', '全部'], ['review', '待验收'], ['aerial', '球花'], ['rise', '尾缀'], ['fan', '扇形'], ['ground', '地面']];
  let libCat = (() => { try { return localStorage.getItem('fw.e51.libCat') || 'all'; } catch (e) { return 'all'; } })();
  function catOf(key) {
    const ef = typeof EFFS === 'function' ? EFFS().find(x => 'ef:' + x.key === key) : null; if (!ef) return '';
    const e = typeof effMainEntry === 'function' ? effMainEntry(ef) : null;
    let t = e && (e.base || (e.p && e.p.type)) || ''; if (!t && e && e.kind === 'combo' && e.layerIds && typeof entryById === 'function') { const l = entryById(e.layerIds[0]); t = l && (l.base || '') || ''; }
    if (/fan|扇/i.test(t + ef.名)) return 'fan';
    try { return t && typeof familyOf === 'function' ? familyOf(t) : ''; } catch (err) { return ''; }
  }
  function libFlat() {
    const pane = $q('#libPane'), body = $q('#libBody'); if (!pane || !body) return;
    const on = pane.dataset.lt === '效果'; pane.classList.toggle('e51-lib', on);
    let bar = $q('#e51LibCats');
    if (!bar) { bar = document.createElement('div'); bar.id = 'e51LibCats'; bar.className = 'e51-seg e51-cats'; bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', '筛选'); pane.querySelector('.side-head').before(bar);
      bar.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; libCat = b.dataset.c; try { localStorage.setItem('fw.e51.libCat', libCat); } catch (err) { } libFlat(); }); }
    bar.hidden = !on; if (!on) return;
    const items = $a('#libBody :is(.lg-review, .lg-wip, .lg-myfx) .li[data-key]'), seen = new Set(), have = new Set(['all']);
    for (const it of items) {
      const k = it.dataset.key, g = it.closest('.lg-review') ? 'review' : it.closest('.lg-wip') ? 'wip' : 'myfx';
      const dup = seen.has(k); seen.add(k); it.classList.toggle('e51-dup', dup);
      if (!it.dataset.e51) {
        it.dataset.e51 = '1';
        const small = it.querySelector('.tx small'), nr = small && small.querySelector('em.nr'), bds = it.querySelector('.bds');
        const why = [nr && nr.textContent, bds && [...bds.querySelectorAll('.badge')].map(b => b.textContent + (b.title ? '：' + b.title : '')).join('\n')].filter(Boolean).join('\n');
        if (why) it.dataset.tip = why;
        if (nr) { const br = nr.previousElementSibling; if (br && br.tagName === 'BR') br.remove(); nr.remove(); }
        if (small) small.textContent = small.textContent.replace(/^(候选|通过版|工作版) /, '').replace(/ · /g, '　');
        const isNew = bds && [...bds.querySelectorAll('.badge')].some(b => /新/.test(b.textContent)), unstarted = bds && /未开始/.test(bds.textContent);
        const word = unstarted ? '未开始' : isNew ? '新' : g === 'review' ? '待验收' : g === 'wip' ? '制作中' : k.startsWith('ef:') ? '已通过' : '';
        const tx = it.querySelector('.tx'); if (tx && word) tx.insertAdjacentHTML('beforeend', `<span class="e51-st${/待验收|新/.test(word) ? ' hi' : ''}">${word}</span>`);
        it.dataset.cat = catOf(k); it.dataset.grp = g;
      }
      if (it.dataset.cat) have.add(it.dataset.cat); if (it.dataset.grp === 'review') have.add('review');
      it.classList.toggle('e51-out', !dup && libCat !== 'all' && !(libCat === 'review' ? it.dataset.grp === 'review' : it.dataset.cat === libCat));
    }
    if (!have.has(libCat)) libCat = 'all';
    const h = CATS.filter(([c]) => have.has(c)).map(([c, t]) => `<button type="button" data-c="${c}" aria-pressed="${c === libCat}">${t}</button>`).join('');
    if (bar.innerHTML !== h) bar.innerHTML = h;
  }

  // ---- 13) 导出 ▾（M02）：摘要写需不需要重新导出、原因、导出文件夹；「导出素材包」叫「导出全部」；导入范围挪进来（原交付清单）；去掉「看交付清单」 ----
  const prevSum = window.e40ExpSummary;
  window.e40ExpSummary = el => {
    if (!el) return;
    const chips = [...document.querySelectorAll('#abIdChips .idc')].map(c => ({ t: c.textContent.trim(), warn: c.classList.contains('warn'), d: c.getAttribute('title') || c.dataset.tipT || '' }));
    const st = chips.find(c => c.warn && /过期|重导/.test(c.t)), ok = chips.some(c => /✓/.test(c.t));
    let where = '';
    try { const S = window.SHELL && window.SHELL.S; if (S && S.exp && S.exp.st === 'ok') where = S.exp.name || '导出文件夹'; else if (S) where = '下载 ZIP'; } catch (e) { where = ''; }
    if (!where) { let dest = ''; try { dest = typeof DeliveryWorkspace !== 'undefined' && DeliveryWorkspace.destination ? DeliveryWorkspace.destination() : ''; } catch (e) { } where = dest === 'zip' ? '下载 ZIP' : dest ? '导出根目录' : ''; }
    const warn = (window.__e50Warn || []);
    el.innerHTML = `<div class="mline"><b>${st ? '<span class="sdot" aria-hidden="true"></span>需重新导出' : ok ? ico('check') + '已导出，和这一版一致' : '还没导出这一版'}</b></div>`
      + `<dl>${st && st.d ? `<dt>原因</dt><dd>${esc(String(st.d).split('\n')[0])}</dd>` : ''}${warn.length ? `<dt>自检</dt><dd class="warn">${esc(warn.join('；'))}</dd>` : ''}${where ? `<dt>位置</dt><dd>${esc(where)}</dd>` : ''}</dl>`;
  };
  function expMenu() {
    const m = $q('#expMenu'); if (!m) return;
    const pack = m.querySelector('[data-exp=pack]'); if (pack && pack.textContent !== '导出全部') { pack.textContent = '导出全部'; pack.title = 'PC + 手机，按交付表'; }
    const list = m.querySelector('[data-exp=list]'); if (list) list.hidden = true;
    const fo = m.querySelector('[data-exp=folder]'); if (fo && window.SHELL && !fo.dataset.e51) { fo.dataset.e51 = '1'; fo.hidden = false; fo.addEventListener('click', e => { e.stopImmediatePropagation(); m.hidden = true; const b = $q('#stShell [data-fk="exp"]'); if (b) b.click(); }, true); }
    let sc = m.querySelector('.e51-scope');
    if (!sc && typeof delivImportScope !== 'undefined') {
      sc = document.createElement('label'); sc.className = 'e51-scope';
      sc.innerHTML = '<span data-tip="导入器替换哪些&#10;只换贴图 = 粒子系统、材质实例都不动">导入范围</span><select aria-label="导入范围"><option value="all">全部</option><option value="textures">只换贴图</option><option value="textures-pc">只换 PC 贴图</option><option value="textures-mobile">只换手机贴图</option></select>';
      m.appendChild(sc); const s = sc.querySelector('select'); s.addEventListener('change', () => { delivImportScope = s.value; const o = $q('#dvScope'); if (o) o.value = s.value; });
    }
    if (sc) { const s = sc.querySelector('select'); if (document.activeElement !== s && s.value !== delivImportScope) s.value = delivImportScope; }
  }

  // ---- 14) 状态栏右端「已保存 20:31 / 未保存」（M03） ----
  function savedStat() {
    const r = $q('#statusBar .st-r'); if (!r) return;
    let s = $q('#e51Saved'); if (!s) { s = document.createElement('span'); s.id = 'e51Saved'; s.className = 'e51-saved'; const k = r.querySelector('#keysBtn, [data-k=keys], .keys-btn') || r.lastElementChild; if (k) k.before(s); else r.appendChild(s); }
    const dirty = $q('#abChg') && !$q('#abChg').hidden;
    let t = ''; if (dirty) t = '未保存'; else if (typeof lib !== 'undefined' && lib.my && typeof myRec === 'function') { const u = (myRec() || {}).updated || ''; const m = /(\d{1,2}:\d{2})/.exec(u); t = m ? '已保存 ' + m[1] : '已保存'; }
    if (s.textContent !== t) s.textContent = t; s.classList.toggle('dirty', dirty);
  }

  // ---- 15) 英文名「修改」：交付清单没有了，原地改（R03 / V01） ----
  document.addEventListener('click', async e => {
    const b = e.target.closest && e.target.closest('#enNameEdit'); if (!b) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (typeof renderDeliv !== 'function' || typeof askText !== 'function') return;
    try { renderDeliv(); } catch (err) { }
    const host = $q('#delivView'), inp = host && host.querySelector('#dvBase'); if (!inp) return;
    const v = await askText('英文名', '素材包、贴图、UE 资产都用这个名字；只用英文字母、数字和下划线', inp.value, '保存'); if (v == null) return;
    inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true }));
    const ok = typeof saveDelivNames === 'function' ? saveDelivNames(host, wbKey()) : false;
    const st = host.querySelector('#dvNameStatus'); if (typeof flash === 'function') flash(st && st.textContent ? st.textContent : ok ? '英文名已保存' : '英文名没保存', !ok);
    if (typeof syncEnName === 'function') syncEnName(); post();
  }, true);

  // 自己画的几块的折叠摘要（modSummarySync 会按普通模块把它们写空，最后再写一次）
  function sums() {
    const set = (d, t) => { const ms = d && d.querySelector(':scope > summary > .msum'); if (ms && ms.textContent !== t) ms.textContent = t; };
    const w = $q('#params .e51-out'); if (w) set(w, outSumText());
    const cc = $q('#colorControls'); if (cc && state.M && Array.isArray(state.M.stages)) set(cc, `${state.M.stages.length} 段`);
    const ev = $q('#eventInstancePanel'); if (ev) { const cb = ev.querySelector('[data-event-enable]'), mir = [...ev.querySelectorAll('label.check')].find(l => /水平镜像/.test(l.textContent)); set(ev, (cb && cb.checked ? '飞行后' : '单次') + (mir && mir.querySelector('input').checked ? '　水平镜像' : '')); }
  }
  // 参数栏重建时，保留「输出」外层的开合选择。
  if (typeof p43DefaultOpen === 'function') { const f = p43DefaultOpen; p43DefaultOpen = function () { const r = f.apply(this, arguments); const w = $q('#params .e51-out'); if (w) w.open = outOpen; return r; }; }
  // ---- 合在一起：参数栏刷新后、和每 0.4 s 跟一次 ----
  let busy = false;
  function post() {
    if (busy || !ready()) return; busy = true;
    try {
      refOff(); corners();
      layerSections(); placeAll(); rowLook(); switches($q('#right')); colorLinkMods(); graphRows(); rootPanel();
      atlasSide(); tlNames(); libFlat(); expMenu(); savedStat();
      if (typeof modSummarySync === 'function') modSummarySync();
      sums();
    } catch (err) { console.error('e51', err); }
    busy = false;
  }
  if (typeof refreshVisibility === 'function') { const f = refreshVisibility; refreshVisibility = function () { const r = f.apply(this, arguments); post(); return r; }; }
  const start = () => { if (!ready()) return setTimeout(start, 200); post(); setInterval(() => { if (!document.hidden) post(); }, 400); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.e51Post = post;
})();
