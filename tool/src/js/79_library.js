// =====================================================================
//  左栏「库」+ 右栏「审阅」+ 实拍并排对照 + 面板宽度
//  库：迭代区（tool/data/review.js，做完等你看的）/ 正式库（15_replica.js，确认过的）/ 组合 / 花型
//  审阅：通过 / 要改 + 意见，存在这台电脑的浏览器里；「复制意见」贴给 Claude
// =====================================================================
const lib = { q: '', key: '', review: null, open: { rv: true, rep: true, combo: false, types: false } };
const ref2 = { on: store.get('refOn', true), off: 0 };

async function setTab(tab) {
  const changed = tab !== state.tab;
  state.tab = tab; if (changed) state.t = 0;
  $('#pMaster').hidden = tab !== 'master'; $('#pCombo').hidden = tab !== 'combo'; $('#pIter').hidden = tab !== 'iter'; $('#pAsset').hidden = tab !== 'asset';
  $('#viewSeg').hidden = tab === 'combo' || tab === 'asset'; $('#assetCv').hidden = tab !== 'asset';
  $('#ptabs').hidden = !(tab === 'master' || tab === 'iter');
  for (const b of $('#ptabs').children) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
  if (!changed) return;
  if (tab === 'combo') { await ensureLibrary(); if (!state.layers.length) applyCombo(COMBOS[0]); else buildComboPanel(); }
  if (tab === 'iter') { renderMetrics(); abInfo(); renderVersions(); }
  if (tab === 'asset') assetPanel();
}

// ---------------- 审阅记录 ----------------
const rvGet = () => store.get('review', {});
function rvSet(id, patch) { const all = rvGet(); all[id] = { ...(all[id] || {}), ...patch, at: new Date().toISOString().slice(0, 16).replace('T', ' ') }; store.set('review', all); }
function rvBadge(e) {
  const r = rvGet()[e.id] || {}, seen = store.get('rvSeen', []);
  if (r.st === 'ok') return '<span class="badge ok">通过</span>';
  if (r.st === 'fix') return '<span class="badge fix">要改</span>';
  return seen.includes(e.id) ? '<span class="badge">待定</span>' : '<span class="badge new">新</span>';
}
function rvText() {
  const all = rvGet(), lines = [];
  for (const e of FW_REVIEW_LIST) {
    const r = all[e.id]; if (!r || (!r.st && !r.txt)) continue;
    lines.push(`- ${e.id} ${e.name}：${r.st === 'ok' ? '通过' : r.st === 'fix' ? '要改' : '未定'}${r.txt ? ' —— ' + r.txt.replace(/\n+/g, '；') : ''}`);
  }
  return lines.length ? `审阅意见（烘焙器 v${VERSION}，${new Date().toLocaleString('zh-CN', { hour12: false })}）\n` + lines.join('\n') : '';
}
async function rvCopy() {
  const t = rvText(); if (!t) { flash('还没有写任何审阅意见', true); return; }
  let ok = false;
  try { await navigator.clipboard.writeText(t); ok = true; } catch (e) {
    const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch (e2) { } ta.remove();
  }
  $('#updList').innerHTML = `<section class="upd-it new"><h3>审阅意见${ok ? '（已复制，直接粘贴到对话里）' : '（请手动全选复制）'}</h3><pre style="white-space:pre-wrap;font:12.5px/1.6 var(--sans)">${t.replace(/</g, '&lt;')}</pre></section>`;
  $('#updDlg').hidden = false;
}

// ---------------- 左栏 ----------------
function thumbHTML(e) {
  if (e.thumbRef || e.thumbSim) return `<span class="th">${e.thumbRef ? `<i style="background-image:url(${e.thumbRef})"></i>` : ''}${e.thumbSim ? `<i style="background-image:url(${e.thumbSim})"></i>` : ''}</span>`;
  return `<span class="th" style="${typeThumbStyle(e.key || e.id)}"></span>`;
}
function libMatch(...txt) { const q = lib.q.trim().toLowerCase(); return !q || txt.join(' ').toLowerCase().includes(q); }
function libItem(host, key, html, onClick, plain) {
  const d = document.createElement('div'); d.className = 'li' + (plain ? ' plain' : '') + (key === lib.key ? ' cur' : ''); d.tabIndex = 0; d.setAttribute('role', 'button'); d.dataset.key = key;
  d.innerHTML = html; d.addEventListener('click', onClick); d.addEventListener('keydown', ev => { if (ev.key === 'Enter') onClick(); });
  host.appendChild(d); return d;
}
function libGroup(host, id, title, count, hot, extra) {
  const det = document.createElement('details'); det.className = 'lg'; det.open = lib.q ? true : lib.open[id];
  det.innerHTML = `<summary>${title}<span class="n${hot ? ' hot' : ''}">${count}</span><span class="sp"></span>${extra || ''}</summary>`;
  det.addEventListener('toggle', () => { if (!lib.q) lib.open[id] = det.open; });
  host.appendChild(det); return det;
}
function renderLib() {
  const host = $('#libBody'); host.innerHTML = '';
  const all = rvGet();
  // 迭代区
  const rv = FW_REVIEW_LIST.filter(e => libMatch(e.id, e.task, e.name, e.tags || '', e.note || ''));
  const undecided = FW_REVIEW_LIST.filter(e => !(all[e.id] || {}).st).length;
  const g1 = libGroup(host, 'rv', '迭代区', undecided ? undecided + ' 待看' : FW_REVIEW_LIST.length, undecided > 0, '<button class="mini" id="rvCopy" type="button" title="把通过 / 要改和意见复制下来，贴到对话里">复制意见</button>');
  g1.querySelector('#rvCopy').addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); rvCopy(); });
  if (!rv.length) g1.insertAdjacentHTML('beforeend', `<p class="lsub">${FW_REVIEW_LIST.length ? '没有匹配的条目' : '现在没有等你看的东西'}</p>`);
  for (const e of rv) libItem(g1, 'rv:' + e.id, thumbHTML(e) + `<span class="tx"><b>${e.name}</b><small>${e.task} · ${e.kind === 'asset' ? '素材' : '花型'} · ${(e.date || '').slice(5)}</small></span>` + rvBadge(e), () => openReview(e));
  // 正式库
  const formal = REPLICAS.filter(r => !r.fromReview && libMatch(r.id, r.name, r.tags || '', r.note || ''));
  const passed = FW_REVIEW_LIST.filter(e => (all[e.id] || {}).st === 'ok' && libMatch(e.id, e.name));
  const g2 = libGroup(host, 'rep', '正式库', formal.length + passed.length);
  for (const r of formal) libItem(g2, 'rep:' + r.id, thumbHTML({ ...r, key: 'rep:' + r.id }) + `<span class="tx"><b>${r.name}</b><small>${r.task || r.id} · 已确认</small></span>`, () => openFormal(r));
  for (const e of passed) libItem(g2, 'rv:' + e.id, thumbHTML(e) + `<span class="tx"><b>${e.name}</b><small>你已通过，等 Claude 正式入库</small></span><span class="badge ok">待入库</span>`, () => openReview(e));
  if (!formal.length && !passed.length) g2.insertAdjacentHTML('beforeend', '<p class="lsub">没有匹配的条目</p>');
  // 组合
  if (libMatch('组合 芯 八重芯 三重芯 叠加')) {
    const g3 = libGroup(host, 'combo', '组合', 1);
    libItem(g3, 'combo', `<span class="tx"><b>组合编辑器</b><small>一个菊 + 几层缩小的牡丹 = 八重芯 / 三重芯</small></span>`, () => { lib.key = 'combo'; setReview(null); setTab('combo'); renderLib(); crumb('组合', '组合编辑器'); }, true);
  }
  // 花型（基础）
  const types = []; for (const [gname, ts] of TYPE_GROUPS) for (const t of ts) { const m = TYPE_META[t] || ['', '']; if (libMatch(TYPE_NAMES[t], TYPE_EN[t], m[0], m[1], gname)) types.push([gname, t, m]); }
  const g4 = libGroup(host, 'types', '花型（从头调）', types.length);
  let last = '';
  for (const [gname, t, m] of types) {
    if (gname !== last) { g4.insertAdjacentHTML('beforeend', `<p class="lsub">${gname}</p>`); last = gname; }
    libItem(g4, 'type:' + t, `<span class="tx"><b>${TYPE_NAMES[t]}</b><small>${m[0]}</small></span>`, () => openType(t), true);
  }
}
function libReveal() { lib.open.types = true; if ($('#main').classList.contains('noside')) toggleSide(true); renderLib(); $('#libSearch').focus(); }

// ---------------- 打开条目 ----------------
function crumb(where, name, badge) { $('#crumb').innerHTML = `<span>${where}</span>›<b>${name}</b>${badge || ''}`; }
function openReview(e) {
  lib.key = 'rv:' + e.id;
  const seen = store.get('rvSeen', []); if (!seen.includes(e.id)) { seen.push(e.id); store.set('rvSeen', seen); }
  if (e.kind === 'asset') { setTab('asset'); loadAssetEntry(e); }
  else { setReplica(e.id); setTab('master'); }
  setReview(e); renderLib(); crumb('迭代区 · ' + e.task, e.name);
}
function openFormal(r) { lib.key = 'rep:' + r.id; setReplica(r.id); setTab('master'); setReview(null, r); renderLib(); crumb('正式库', r.name); }
function openType(t) { lib.key = 'type:' + t; setType(t); setTab('master'); setReview(null); renderLib(); crumb('花型', TYPE_NAMES[t]); }

// ---------------- 右栏审阅卡 ----------------
function setReview(e, formal) {
  lib.review = e || null; const box = $('#pReview');
  const vidEntry = e || (formal && formal.video ? { id: formal.id, video: '../' + formal.video, vmeta: null } : null);
  setRefVideo(vidEntry);
  if (!e) { box.hidden = true; box.innerHTML = ''; return; }
  const r = rvGet()[e.id] || {};
  box.hidden = false;
  box.innerHTML = `<div class="rh"><span class="badge">迭代区 · ${e.task}</span><b>${e.name}</b><small>${e.date || ''}</small></div>
    <p>${e.note || ''}</p>
    ${e.look && e.look.length ? `<div class="rt">看什么</div><ul>${e.look.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
    ${e.opinion ? `<div class="rt">Claude 的看法</div><p class="op">${e.opinion}</p>` : ''}
    ${e.video ? `<div class="ref"><label class="check"><input type="checkbox" id="rvRef" ${ref2.on ? 'checked' : ''}> 实拍并排对照（左实拍、右模拟，时间同步）</label>
      <div class="sl nolock" id="rvOffRow"><label class="k">实拍对齐<small>s</small></label><input type="range" id="rvOff" min="-1.5" max="1.5" step="0.02"><input class="num" type="number" id="rvOffN" step="0.02"></div></div>` : ''}
    <div class="ra"><button class="btn okb" type="button" aria-pressed="${r.st === 'ok'}">✓ 通过，放进正式库</button><button class="btn fixb" type="button" aria-pressed="${r.st === 'fix'}">✗ 要改</button></div>
    <textarea id="rvTxt" placeholder="意见：哪里不像、要改什么（写完会自动保存）">${(r.txt || '').replace(/</g, '&lt;')}</textarea>
    <div class="saved" id="rvSaved">${r.at ? '已保存 ' + r.at + ' · 左栏「迭代区」右边「复制意见」贴给 Claude' : '意见存在这台电脑的浏览器里；写完点左栏「复制意见」贴给 Claude'}</div>`;
  const setSt = st => { const cur = (rvGet()[e.id] || {}).st; rvSet(e.id, { st: cur === st ? '' : st }); setReview(e); renderLib(); };
  box.querySelector('.okb').addEventListener('click', () => setSt('ok'));
  box.querySelector('.fixb').addEventListener('click', () => setSt('fix'));
  let tm = 0; box.querySelector('#rvTxt').addEventListener('input', ev => { clearTimeout(tm); tm = setTimeout(() => { rvSet(e.id, { txt: ev.target.value }); $('#rvSaved').textContent = '已保存 · 左栏「迭代区」右边「复制意见」贴给 Claude'; renderLib(); }, 500); });
  if (e.video) {
    box.querySelector('#rvRef').addEventListener('change', ev => { ref2.on = ev.target.checked; store.set('refOn', ref2.on); setRefVideo(e); });
    const offs = store.get('refOff', {}), sl = box.querySelector('#rvOff'), nm = box.querySelector('#rvOffN');
    ref2.off = offs[e.id] || 0; sl.value = nm.value = ref2.off;
    const upd = v => { ref2.off = v; sl.value = v; nm.value = (+v).toFixed(2); const o = store.get('refOff', {}); o[e.id] = v; store.set('refOff', o); };
    sl.addEventListener('input', () => upd(+sl.value)); nm.addEventListener('change', () => upd(+nm.value || 0));
  }
}

// ---------------- 实拍并排 ----------------
function setRefVideo(e) {
  const v = $('#refVid'), show = !!(e && e.video && ref2.on);
  ref2.entry = e; $('#refBox').hidden = !show; $('#simTag').hidden = !show;
  document.querySelector('.canvas-wrap').classList.toggle('split', show);
  if (!show) { v.pause(); return; }
  const src = e.video;
  if (v.dataset.src !== src) { v.dataset.src = src; v.src = src; v.load(); }
  requestAnimationFrame(layoutRef);
}
function layoutRef() {
  const v = $('#refVid'), box = $('#refBox'); if (box.hidden || !v.videoWidth) return;
  const S = box.clientWidth, vm = (ref2.entry && ref2.entry.vmeta) || { cx: 0.5, cy: 0.5, half: 0.5 };
  const asp = v.videoWidth / v.videoHeight, half = vm.half || 0.5;
  const Hd = S / (2 * half), Wd = Hd * asp;
  Object.assign(v.style, { width: Wd + 'px', height: Hd + 'px', left: (S / 2 - vm.cx * Wd) + 'px', top: (S / 2 - vm.cy * Hd) + 'px' });
}
function refSync() {
  const box = $('#refBox'); if (box.hidden) return;
  const v = $('#refVid'); if (!v.duration || v.readyState < 2) return;
  const vm = (ref2.entry && ref2.entry.vmeta) || { t0: 0 };
  const tgt = Math.max(0, Math.min(v.duration - 0.05, (vm.t0 || 0) + ref2.off + state.t));
  if (state.playing) {
    if (v.playbackRate !== state.speed) v.playbackRate = Math.max(0.0625, state.speed);
    if (v.paused) v.play().catch(() => { });
    if (Math.abs(v.currentTime - tgt) > 0.15 && !v.seeking) v.currentTime = tgt;
  } else {
    if (!v.paused) v.pause();
    if (Math.abs(v.currentTime - tgt) > 0.03 && !v.seeking) v.currentTime = tgt;
  }
}

// ---------------- 面板宽度、收起左栏 ----------------
function toggleSide(show) {
  const m = $('#main'); m.classList.toggle('noside', !show); $('#sideShow').hidden = show; store.set('sideOn', show);
  requestAnimationFrame(layoutRef);
}
function initGutters() {
  const root = document.documentElement, sw = store.get('sideW', 268), rw = store.get('rightW', 390);
  root.style.setProperty('--sideW', sw + 'px'); root.style.setProperty('--rightW', rw + 'px');
  const drag = (el, fn) => el.addEventListener('pointerdown', e0 => {
    el.setPointerCapture(e0.pointerId); el.classList.add('drag');
    const mv = e => fn(e.clientX), up = () => { el.classList.remove('drag'); el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); layoutRef(); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
  });
  drag($('#gutL'), x => { const w = Math.max(200, Math.min(460, x)); root.style.setProperty('--sideW', w + 'px'); store.set('sideW', w); layoutRef(); });
  drag($('#gutR'), x => { const w = Math.max(330, Math.min(700, window.innerWidth - x)); root.style.setProperty('--rightW', w + 'px'); store.set('rightW', w); layoutRef(); });
  $('#sideHide').addEventListener('click', () => toggleSide(false));
  $('#sideShow').addEventListener('click', () => toggleSide(true));
  toggleSide(store.get('sideOn', true));
  window.addEventListener('resize', layoutRef);
}
function initLibrary() {
  $('#libSearch').addEventListener('input', e => { lib.q = e.target.value; renderLib(); });
  for (const b of $('#ptabs').children) b.addEventListener('click', () => setTab(b.dataset.tab));
  $('#refVid').addEventListener('loadedmetadata', layoutRef);
  initGutters();
  // 打开时：有没看过的迭代区条目就先打开最新的一条
  const seen = store.get('rvSeen', []), fresh = FW_REVIEW_LIST.find(e => !seen.includes(e.id));
  renderLib();
  if (fresh) openReview(fresh); else crumb('花型', TYPE_NAMES[state.P.type]);
}
