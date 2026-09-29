// =====================================================================
//  左栏「库」+ 右栏「审阅」+ 实拍并排对照 + 面板宽度
//  库：迭代区（tool/data/review.js，做完等你看的）/ 正式库（15_replica.js，确认过的）/ 组合 / 花型
//  审阅：通过 / 要改 + 意见，存在这台电脑的浏览器里；「复制意见」贴给 Claude
// =====================================================================
const lib = { q: '', key: '', review: null, open: store.get('libOpen', { rv: true, rep: true, combo: false, types: true }) };
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
  if (e.kind === 'queued') return '<span class="badge q">排队</span>';
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
  det.addEventListener('toggle', () => { if (!lib.q) { lib.open[id] = det.open; store.set('libOpen', lib.open); } });
  host.appendChild(det); return det;
}
function renderLib() {
  const host = $('#libBody'); host.innerHTML = '';
  const all = rvGet();
  // 迭代区
  const rv = FW_REVIEW_LIST.filter(e => libMatch(e.id, e.task, e.name, e.tags || '', e.note || ''));
  const undecided = FW_REVIEW_LIST.filter(e => e.kind !== 'queued' && !(all[e.id] || {}).st).length;
  const g1 = libGroup(host, 'rv', '迭代区', undecided ? undecided + ' 待看' : FW_REVIEW_LIST.length, undecided > 0, '<button class="mini" id="rvCopy" type="button" title="把通过 / 要改和意见复制下来，贴到对话里">复制意见</button>');
  g1.querySelector('#rvCopy').addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); rvCopy(); });
  if (!rv.length) g1.insertAdjacentHTML('beforeend', `<p class="lsub">${FW_REVIEW_LIST.length ? '没有匹配的条目' : '现在没有等你看的东西'}</p>`);
  let qHead = false;
  for (const e of rv) {
    if (e.kind === 'queued' && !qHead) { g1.insertAdjacentHTML('beforeend', '<p class="lsub">排队中：在你电脑上跑完后自动出现在上面</p>'); qHead = true; }
    const sub = e.kind === 'queued' ? `${e.task} · 等你跑` : `${e.task} · ${e.kind === 'asset' ? '素材' : '花型'} · ${(e.date || '').slice(5)}`;
    const q = e.kind === 'queued';
    const it = libItem(g1, 'rv:' + e.id, (q ? '' : thumbHTML(e)) + `<span class="tx"><b>${e.name}</b>${q ? '' : `<small>${sub}</small>`}</span>` + (q ? `<span class="badge q">${e.task}</span>` : rvBadge(e)), () => openReview(e), q);
    if (q) it.classList.add('queued');
  }
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
    libItem(g3, 'combo', `<span class="tx"><b>组合编辑器</b><small>一个菊 + 几层缩小的牡丹 = 八重芯 / 三重芯</small></span>`, () => { setQueuedView(false); lib.key = 'combo'; setReview(null); setTab('combo'); renderLib(); crumb('组合', '组合编辑器'); }, true);
  }
  // 花型（基础）
  const types = []; for (const [gname, ts] of TYPE_GROUPS) for (const t of ts) { const m = TYPE_META[t] || ['', '']; if (libMatch(TYPE_NAMES[t], TYPE_EN[t], m[0], m[1], gname)) types.push([gname, t, m]); }
  const g4 = libGroup(host, 'types', '花型（从头调）', types.length);
  let last = '', grid = null;
  for (const [gname, t, m] of types) {
    if (gname !== last) { g4.insertAdjacentHTML('beforeend', `<p class="lsub">${gname}</p>`); grid = document.createElement('div'); grid.className = 'tiles'; g4.appendChild(grid); last = gname; }
    const k = 'type:' + t, d = document.createElement('button'); d.type = 'button'; d.className = 'tile' + (k === lib.key ? ' cur' : ''); d.dataset.key = k; d.title = `${TYPE_NAMES[t]}：${m[0]}`;
    d.innerHTML = `<span class="im" style="${typeThumbStyle(t)}"></span><span class="nm">${TYPE_NAMES[t]}</span>`;
    d.addEventListener('click', () => openType(t)); grid.appendChild(d);
  }
}
function libReveal() {
  lib.open.types = true; store.set('libOpen', lib.open); setPanels({ side: true }); renderLib();
  const el = document.querySelector('#libBody .tile.cur') || document.querySelector('#libBody .tiles');
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

// ---------------- 打开条目 ----------------
function crumb(where, name, badge) { $('#crumb').innerHTML = `<span>${where}</span>›<b>${name}</b>${badge || ''}`; }
function openReview(e) {
  lib.key = 'rv:' + e.id; store.set('lastKey', lib.key);
  const seen = store.get('rvSeen', []); if (!seen.includes(e.id)) { seen.push(e.id); store.set('rvSeen', seen); }
  setQueuedView(e.kind === 'queued');
  if (e.kind === 'queued') { setReview(e); renderLib(); crumb('迭代区 · 排队', e.name); return; }
  if (e.kind === 'asset') { setTab('asset'); loadAssetEntry(e); }
  else { setReplica(e.id); setTab('master'); }
  setReview(e); renderLib(); crumb('迭代区 · ' + e.task, e.name);
}
function openFormal(r) { setQueuedView(false); lib.key = 'rep:' + r.id; setReplica(r.id); setTab('master'); setReview(null, r); renderLib(); crumb('正式库', r.name); }
function openType(t) { setQueuedView(false); lib.key = 'type:' + t; setType(t); setTab('master'); setReview(null); renderLib(); crumb('花型', TYPE_NAMES[t]); }

// 排队中的条目：还没有结果，只放实拍（要对的目标），右栏只留审阅卡
function setQueuedView(on) {
  document.querySelector('.canvas-wrap').classList.toggle('refonly', on); $('#right').classList.toggle('qmode', on);
  ref2.on = on ? true : store.get('refOn', true);
  $('#refTag').dataset.q = on ? '1' : '';
}
// ---------------- 右栏审阅卡 ----------------
function setReview(e, formal) {
  lib.review = e || null; const box = $('#pReview');
  const vidEntry = e || (formal && formal.video ? { id: 'rep:' + formal.id, video: '../' + formal.video, vmeta: (typeof FW_VMETA !== 'undefined' && FW_VMETA['../' + formal.video]) || null } : null);
  setRefVideo(vidEntry);
  if (!e) { box.hidden = true; box.innerHTML = ''; return; }
  const r = rvGet()[e.id] || {};
  box.hidden = false;
  box.innerHTML = `<div class="rh"><span class="badge">迭代区 · ${e.task}</span><b>${e.name}</b><small>${e.date || ''}</small></div>
    <p>${e.note || ''}</p>
    ${e.look && e.look.length ? `<div class="rt">看什么</div><ul>${e.look.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
    ${e.opinion ? `<div class="rt">${e.kind === 'queued' ? '这一版改了什么' : 'Claude 的看法'}</div><p class="op">${e.opinion}</p>` : ''}
    ${e.kind === 'queued' ? '<p class="qnote">还没跑。在你电脑上双击 <b>analysis/local/跑任务_并行.bat</b>（3 个进程同时跑），跑完会自动推上来；pull 后刷新烘焙器，这一条就能看了。</p>' : ''}
    <div class="ra"${e.kind === 'queued' ? ' hidden' : ''}><button class="btn okb" type="button" aria-pressed="${r.st === 'ok'}">✓ 通过，放进正式库</button><button class="btn fixb" type="button" aria-pressed="${r.st === 'fix'}">✗ 要改</button></div>
    <textarea id="rvTxt"${e.kind === 'queued' ? ' hidden' : ''} placeholder="意见：哪里不像、要改什么（写完会自动保存）">${(r.txt || '').replace(/</g, '&lt;')}</textarea>
    <div class="saved" id="rvSaved"${e.kind === 'queued' ? ' hidden' : ''}>${r.at ? '已保存 ' + r.at + ' · 左栏「迭代区」右边「复制意见」贴给 Claude' : '意见存在这台电脑的浏览器里；写完点左栏「复制意见」贴给 Claude'}</div>`;
  const setSt = st => { const cur = (rvGet()[e.id] || {}).st; rvSet(e.id, { st: cur === st ? '' : st }); setReview(e); renderLib(); };
  box.querySelector('.okb').addEventListener('click', () => setSt('ok'));
  box.querySelector('.fixb').addEventListener('click', () => setSt('fix'));
  let tm = 0; box.querySelector('#rvTxt').addEventListener('input', ev => { clearTimeout(tm); tm = setTimeout(() => { rvSet(e.id, { txt: ev.target.value }); $('#rvSaved').textContent = '已保存 · 左栏「迭代区」右边「复制意见」贴给 Claude'; renderLib(); }, 500); });
  refRestoreOffset(e);
}

// ---------------- 实拍并排 ----------------
//   条目带实拍视频时，顶栏出现「实拍对照」开关（R）；开：左实拍右模拟，关：模拟画布占满。开关状态全局记住。
//   对齐：画布上的 −/+ 按钮微调实拍时间，每个条目各记各的。
function refName(src) { try { return decodeURIComponent(src).split('/').pop().replace(/\.mp4$/i, ''); } catch (e) { return ''; } }
function setRefVideo(e) {
  ref2.entry = e && e.video ? e : null;
  const has = !!ref2.entry, show = has && ref2.on, v = $('#refVid');
  $('#btnRef').hidden = !has; $('#btnRef').setAttribute('aria-pressed', String(show));
  $('#refBox').hidden = !show; $('#simTag').hidden = !show;
  document.querySelector('.canvas-wrap').classList.toggle('split', show);
  if (!show) { v.pause(); return; }
  if (v.dataset.src !== e.video) { v.dataset.src = e.video; v.src = e.video; v.load(); }
  $('#refTag').textContent = ($('#refTag').dataset.q ? '要对的实拍 · ' : '实拍 · ') + refName(e.video);
  refRestoreOffset(e);
  requestAnimationFrame(layoutRef);
}
function refToggle(on) {
  if (!ref2.entry) return;
  ref2.on = on == null ? !ref2.on : on; store.set('refOn', ref2.on); setRefVideo(ref2.entry);
  flash(ref2.on ? '实拍对照：开' : '实拍对照：关（按 R 再打开）');
}
function refRestoreOffset(e) { ref2.off = (store.get('refOff', {})[e.id]) || 0; refShowOffset(); }
function refShowOffset() { const o = ref2.off; $('#refOffOut').textContent = `对齐 ${o > 0 ? '+' : o < 0 ? '−' : ''}${Math.abs(o).toFixed(2)} s`; }
function refNudge(d) {
  if (!ref2.entry) return;
  ref2.off = d === 0 ? 0 : Math.round((ref2.off + d) * 100) / 100;
  const o = store.get('refOff', {}); o[ref2.entry.id] = ref2.off; store.set('refOff', o); refShowOffset();
}
function layoutRef() {
  const v = $('#refVid'), box = $('#refBox'); if (box.hidden || !v.videoWidth) return;
  const S = box.clientWidth, vm = physRefMeta((ref2.entry && ref2.entry.vmeta) || { cx: 0.5, cy: 0.5, half: 0.5 }, state.P);
  const asp = v.videoWidth / v.videoHeight, half = vm.half || 0.5;
  const Hd = S / (2 * half), Wd = Hd * asp;
  Object.assign(v.style, { width: Wd + 'px', height: Hd + 'px', left: (S / 2 - vm.cx * Wd) + 'px', top: (S / 2 - vm.cy * Hd) + 'px' });
}
function refSync() {
  const box = $('#refBox'); if (box.hidden) return;
  const v = $('#refVid'); if (!v.duration || v.readyState < 2) return;
  if (ref2.entry && ref2.entry.vmeta && ref2.entry.vmeta.follow) layoutRef();   // 物理尾缀：实拍逐帧跟着星头取景
  const vm = (ref2.entry && ref2.entry.vmeta) || { t0: 0 };
  const want = (vm.t0 || 0) + ref2.off + state.t, tgt = Math.max(0, Math.min(v.duration - 0.05, want));
  box.classList.toggle('out', want < 0 || want > v.duration);   // 实拍这一刻没有画面（比视频开头早或晚）
  if (state.playing) {
    if (v.playbackRate !== state.speed) v.playbackRate = Math.max(0.0625, state.speed);
    if (v.paused) v.play().catch(() => { });
    if (Math.abs(v.currentTime - tgt) > 0.15 && !v.seeking) v.currentTime = tgt;
  } else {
    if (!v.paused) v.pause();
    if (Math.abs(v.currentTime - tgt) > 0.03 && !v.seeking) v.currentTime = tgt;
  }
}

// ---------------- 面板：左栏、右栏、专注、宽度 ----------------
const panels = { side: store.get('sideOn', true), right: store.get('rightOn', true), before: null };
function setPanels(o) {
  Object.assign(panels, o);
  const m = $('#main'); m.classList.toggle('noside', !panels.side); m.classList.toggle('noright', !panels.right);
  store.set('sideOn', panels.side); store.set('rightOn', panels.right);
  $('#btnSide').setAttribute('aria-pressed', String(panels.side)); $('#btnRight').setAttribute('aria-pressed', String(panels.right));
  $('#btnFocus').setAttribute('aria-pressed', String(!panels.side && !panels.right));
}
function toggleFocus() {
  if (!panels.side && !panels.right) setPanels(panels.before || { side: true, right: true });
  else { panels.before = { side: panels.side, right: panels.right }; setPanels({ side: false, right: false }); flash('专注：F 或双击画布恢复'); }
}
function initPanels() {
  const root = document.documentElement;
  root.style.setProperty('--sideW', store.get('sideW', 268) + 'px'); root.style.setProperty('--rightW', store.get('rightW', 390) + 'px');
  const drag = (el, fn) => el.addEventListener('pointerdown', e0 => {
    e0.preventDefault(); el.setPointerCapture(e0.pointerId); el.classList.add('drag'); document.body.classList.add('dragging');
    const mv = e => fn(e.clientX), up = () => { el.classList.remove('drag'); document.body.classList.remove('dragging'); el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
  });
  drag($('#gutL'), x => { const lim = window.innerWidth - (panels.right ? $('#right').offsetWidth : 0) - 420, w = Math.round(Math.max(210, Math.min(460, lim, x))); root.style.setProperty('--sideW', w + 'px'); store.set('sideW', w); });
  drag($('#gutR'), x => { const lim = window.innerWidth - (panels.side ? $('#side').offsetWidth : 0) - 420, w = Math.round(Math.max(330, Math.min(700, lim, window.innerWidth - x))); root.style.setProperty('--rightW', w + 'px'); store.set('rightW', w); });
  $('#gutL').addEventListener('dblclick', () => { root.style.setProperty('--sideW', '268px'); store.set('sideW', 268); });
  $('#gutR').addEventListener('dblclick', () => { root.style.setProperty('--rightW', '390px'); store.set('rightW', 390); });
  $('#btnSide').addEventListener('click', () => setPanels({ side: !panels.side }));
  $('#btnRight').addEventListener('click', () => setPanels({ right: !panels.right }));
  $('#btnFocus').addEventListener('click', toggleFocus);
  $('#btnRef').addEventListener('click', () => refToggle());
  $('#refClose').addEventListener('click', () => refToggle(false));
  document.querySelector('.refctl').addEventListener('click', e => { const b = e.target.closest('button'); if (b) refNudge(+b.dataset.d); });
  document.querySelector('.canvas-wrap').addEventListener('dblclick', e => { if (!e.target.closest('button')) toggleFocus(); });
  const cw = document.querySelector('.canvas-wrap');
  new ResizeObserver(() => { const W = cw.clientWidth, H = cw.clientHeight; cw.classList.toggle('stack', Math.min(W, H / 2) > Math.min(W / 2, H)); layoutRef(); }).observe(cw);
  document.addEventListener('keydown', e => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'f') { e.preventDefault(); toggleFocus(); }
    else if (k === 'r') { e.preventDefault(); refToggle(); }
    else if (k === 'l') { e.preventDefault(); setPanels({ side: !panels.side }); }
    else if (k === 'p') { e.preventDefault(); setPanels({ right: !panels.right }); }
    else if (k === 'escape' && !panels.side && !panels.right && $('#updDlg').hidden && $('#picker').hidden) toggleFocus();
    else if ((k === 'arrowdown' || k === 'arrowup') && lib.key.startsWith('rv:')) {   // ↑ ↓ 在迭代区条目之间切换
      const i = FW_REVIEW_LIST.findIndex(x => 'rv:' + x.id === lib.key), j = i + (k === 'arrowdown' ? 1 : -1);
      if (FW_REVIEW_LIST[j]) { e.preventDefault(); openReview(FW_REVIEW_LIST[j]); const el = document.querySelector(`#libBody .li[data-key="rv:${FW_REVIEW_LIST[j].id}"]`); el && el.scrollIntoView({ block: 'nearest' }); }
    }
  });
  setPanels({});
}
function initLibrary() {
  $('#libSearch').addEventListener('input', e => { lib.q = e.target.value; renderLib(); });
  $('#libSearch').addEventListener('keydown', e => { if (e.key === 'Escape') { e.target.value = ''; lib.q = ''; renderLib(); e.target.blur(); } });
  for (const b of $('#ptabs').children) b.addEventListener('click', () => setTab(b.dataset.tab));
  $('#refVid').addEventListener('loadedmetadata', layoutRef);
  initPanels();
  // 打开时：有没看过的迭代区条目就先打开最新的一条；否则回到上次看的
  const seen = store.get('rvSeen', []), fresh = FW_REVIEW_LIST.find(e => e.kind !== 'queued' && !seen.includes(e.id));
  const lastKey = store.get('lastKey', ''), lastRv = FW_REVIEW_LIST.find(e => 'rv:' + e.id === lastKey);
  renderLib();
  if (/[?&]fast/.test(location.search)) return;     // 本地任务的自动化（compare.py）不自动打开条目
  if (fresh) openReview(fresh); else if (lastRv) openReview(lastRv); else crumb('花型', TYPE_NAMES[state.P.type]);
}
