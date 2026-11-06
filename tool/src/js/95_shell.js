/* =====================================================================
   烟花工坊 5.0 外壳（tool/src/js/95_shell.js；对话框9 · S，2026-11-05）
   只进 tool/烟花工坊.html（build.py 不把 95_shell*.js 放进 FireworkBaker.html），单独一个 <script>，在烘焙器脚本后面：
   烘焙器脚本出错时外壳照样起来；外壳出错也不影响烘焙器。
   依据：E 样板 v3.7（= E 样板 4.0）外壳 script_shell.js、说明_v3_外壳.md；交互宪章 0.9。这一版：
   - 顶栏「烟花工坊」+「FireWorksLab 5.0.0」（点开更新记录）｜「● UE 已连接」（FWLImporter.status()，断开原地「重新连接」）｜「显卡 · 型号」（WebGL）｜「编排节目 →」变灰
   - 状态栏左端「导出 文件夹名」「备份 ● 未选」：导出文件夹是外壳自己的浏览器文件夹授权（IndexedDB 记住）；备份 = 烘焙器 79_repo.js 的仓库文件夹
   - 资源交付页：FWLImporter（tool/importer/API_5.0.md）publish / scan / precheck / importPkg；导入模块没加载或出错时写原因、「导入」变灰，导出照常
   - 运行时注入：页面里有 v3.7 的槽位（#shell、#stShell、#wsBaker、#ovlApp、[data-exp=deliv]）就用；没有（现在的 4.9 界面）就自己搭（body.sh-fb）
   1 小工具与浮层  2 状态  3 导入模块与 UE  4 文件夹  5 顶栏与状态栏  6 资源交付  7 导出  8 事件  9 启动
   ===================================================================== */
(() => {
'use strict';
if (window.__fwShell) return;
window.__fwShell = true;
const SHELL_VER = '5.0.01';

/* ---------- 1 小工具与浮层（同样板 script_shell.js 第 1 节） ---------- */
const q = (s, r = document) => r.querySelector(s);
const qq = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad2 = n => String(n).padStart(2, '0');
const hhmm = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
/* 图标：制作区 v3.7 的 #iconDefs 有 i-back / i-x / i-check 就用它的，没有用外壳自带的 sh-i-* */
const symId = id => (q(`symbol[id="i-${id}"]`) ? 'i-' : 'sh-i-') + id;
const ic = (id, cls = '') => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#${symId(id)}"/></svg>`;
let FB = false;   /* true = 制作区还是 4.9 界面，外壳自己搭顶栏、状态栏（body.sh-fb） */
const app = () => q('#app') || document.body;
const ovlOf = () => q('#ovlApp') || document.body;
const VIEW = () => ({left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight});
const hostOf = () => (app() === document.body ? VIEW() : app().getBoundingClientRect());
const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 存不了就不记 */ } };
const SH = {menu: null, anchor: null, onMenuClose: null, dlg: null, toast: null, toastO: null, toastT: 0, hint: null, hintT: 0, bub: null, replay: false};

function placeNear(el, anchor, align = 'left') {
  const a = anchor.getBoundingClientRect(), H = hostOf(), w = el.offsetWidth, h = el.offsetHeight;
  let x = align === 'right' ? a.right - w : a.left;
  x = clamp(x, H.left + 8, H.right - w - 8);
  let y = a.bottom + 4;
  if (y + h > H.bottom - 8) y = a.top - h - 4;
  el.style.left = x + 'px'; el.style.top = Math.max(H.top + 8, y) + 'px';
}
const dropTips = () => qq('.ovl > .tip:not(.hint)').forEach(t => t.remove());
function closeMenu(refocus) {
  if (!SH.menu) return;
  SH.menu.remove(); SH.menu = null;
  const a = SH.anchor; SH.anchor = null;
  if (a) a.setAttribute('aria-expanded', 'false');
  const f = SH.onMenuClose; SH.onMenuClose = null; if (f) f(a);
  if (refocus && a && a.isConnected) a.focus();
}
function openMenu(anchor, html, o = {}) {
  closeMenu(); dropTips();
  const m = document.createElement('div');
  m.className = 'menu sb-auto' + (o.cls ? ' ' + o.cls : ''); m.setAttribute('role', o.role || 'menu');
  if (o.label) m.setAttribute('aria-label', o.label);
  m.innerHTML = html; ovlOf().appendChild(m);
  placeNear(m, anchor, o.align || 'left');
  m.addEventListener('click', ev => { const b = ev.target.closest('[data-mi]'); if (!b || b.disabled) return; const f = o.acts && o.acts[b.dataset.mi]; closeMenu(); if (f) f(); });
  m.addEventListener('keydown', ev => {
    const bs = qq('[data-mi]:not(:disabled)', m), i = bs.indexOf(document.activeElement);
    if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && bs.length) { ev.preventDefault(); bs[(i + (ev.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus(); }
    if (ev.key === 'Escape') { ev.preventDefault(); closeMenu(true); }
    if (ev.key === 'Tab') closeMenu();
    ev.stopPropagation();
  });
  SH.menu = m; SH.anchor = anchor; SH.onMenuClose = o.onClose || null;
  anchor.setAttribute('aria-expanded', 'true');
  const f = q('[data-mi]:not(:disabled)', m); if (f) f.focus();
  return m;
}
/* 对话框：同样板 .scrim + .dialog，主按钮在右，Esc 关闭，Tab 在框内循环 */
function closeDlg() { if (SH.dlg) { SH.dlg.forEach(x => x.remove()); SH.dlg = null; } }
function openDlg(o) {
  closeMenu(); closeDlg(); closeBub(false); dropTips();
  const H = hostOf(), ov = ovlOf();
  const sc = document.createElement('div'); sc.className = 'scrim';
  Object.assign(sc.style, {left: H.left + 'px', top: H.top + 'px', width: H.width + 'px', height: H.height + 'px'});
  const d = document.createElement('div'); d.className = 'dialog sh-dlg' + (o.cls ? ' ' + o.cls : '');
  d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'shDlgT');
  if (o.id) d.dataset.dlg = o.id;
  d.innerHTML = `<h2 id="shDlgT">${esc(o.title)}</h2>${o.body ? `<p>${o.body}</p>` : ''}${o.extra || ''}`
    + `<div class="acts">${o.cancel === false ? '' : `<button class="btn btn-2" data-r="0" type="button">${esc(o.cancel || '取消')}</button>`}<button class="btn btn-1" data-r="1" type="button">${esc(o.ok)}</button></div>`;
  ov.append(sc, d);
  d.style.left = (H.left + (H.width - d.offsetWidth) / 2) + 'px';
  d.style.top = (H.top + Math.max(16, Math.min(H.height * .3, H.height - d.offsetHeight - 16))) + 'px';
  const back = document.activeElement;
  const done = ok => { closeDlg(); if (back && back.isConnected && back.focus) back.focus({preventScroll: true}); const f = ok ? o.onOk : o.onCancel; if (f) f(); };
  d.addEventListener('click', ev => { const b = ev.target.closest('[data-r]'); if (b) done(b.dataset.r === '1'); });
  d.addEventListener('keydown', ev => {
    ev.stopPropagation();
    if (ev.key === 'Escape') { ev.preventDefault(); done(false); return; }
    if (ev.key === 'Tab') { const fs = qq('button', d).filter(x => !x.disabled), i = fs.indexOf(document.activeElement); ev.preventDefault(); fs[(i + (ev.shiftKey ? fs.length - 1 : 1)) % fs.length].focus(); }
  });
  sc.addEventListener('click', () => done(false));
  SH.dlg = [sc, d];
  const f = q('[data-r="1"]', d); if (f) f.focus();
  return d;
}
/* 提示条：外壳提示区（顶栏下方、当前页工具行下 8 px，居中），一次一条；人已在目标页时按钮收起 */
const WSN = {baker: '制作', import: '导入'};
function closeToast() { clearTimeout(SH.toastT); if (SH.toast) { SH.toast.remove(); SH.toast = null; SH.toastO = null; } }
function placeToast() {
  const t = SH.toast, o = SH.toastO || {}; if (!t || !t.isConnected) return;
  const b = q('[data-r="act"]', t); if (b && o.action) b.hidden = !!o.action.ws && o.action.ws === S.ws;
  const A = hostOf(), sh = q('#shell'), ws = curWsEl(), tool = ws && q(':scope > .topbar', ws);
  const top = Math.max(sh ? sh.getBoundingClientRect().bottom : A.top, tool && tool.getClientRects().length ? tool.getBoundingClientRect().bottom : 0);
  t.style.left = clamp(A.left + (A.width - t.offsetWidth) / 2, A.left + 8, A.right - t.offsetWidth - 8) + 'px';
  t.style.top = clamp(top + 8, A.top, A.bottom - t.offsetHeight - 8) + 'px';
}
function toast(text, o = {}) {
  closeToast();
  const ov = ovlOf(); qq(':scope > .toast', ov).forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast sh-toast'; t.setAttribute('role', 'status');
  const msg = o.from && WSN[o.from] ? `${WSN[o.from]}：${text}` : text;
  t.innerHTML = `<span>${esc(msg)}</span>${o.action ? `<button class="btn btn-text tbtn sm" data-r="act" type="button">${esc(o.action.label)}</button>` : ''}<button class="btn btn-icon sm" data-r="x" type="button" aria-label="关闭">${ic('x')}</button>`;
  ov.appendChild(t);
  SH.toast = t; SH.toastO = o; placeToast();
  t.addEventListener('click', ev => { const b = ev.target.closest('[data-r]'); if (!b) return; closeToast(); if (b.dataset.r === 'act' && o.action) o.action.fn(); });
  const arm = () => { clearTimeout(SH.toastT); SH.toastT = setTimeout(closeToast, o.ms || 12000); };
  t.addEventListener('mouseenter', () => clearTimeout(SH.toastT));
  t.addEventListener('mouseleave', arm);
  arm();
  return t;
}
/* 操作处短提示：同样板提示框（离触发点 8 px，小三角对着触发点中线） */
function placeBub(el, anchor, align) {
  const a = anchor.getBoundingClientRect(), H = hostOf(), w = el.offsetWidth, h = el.offsetHeight;
  let x = align === 'right' ? a.right - w : a.left;
  x = clamp(x, H.left + 8, H.right - w - 8);
  let y = a.bottom + 8, up = false;
  if (y + h > H.bottom - 8) { y = a.top - h - 8; up = true; }
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.classList.toggle('is-up', up);
  el.style.setProperty('--ax', clamp(a.left + a.width / 2 - x - 4, 8, w - 16) + 'px');
}
function hint(el, text) {
  clearTimeout(SH.hintT); if (SH.hint) { SH.hint.remove(); SH.hint = null; }
  const anchor = el && el.isConnected && el.getClientRects().length ? el : q('#shell'); if (!anchor) return;
  const t = document.createElement('div');
  t.className = 'tip sm hint sh-hint'; t.setAttribute('role', 'status'); t.textContent = text;
  ovlOf().appendChild(t); placeBub(t, anchor, 'left');
  const up = t.classList.contains('is-up'); t.classList.remove('is-up'); t.classList.toggle('at-below', !up); t.classList.toggle('at-above', up);
  SH.hint = t; SH.hintT = setTimeout(() => { t.remove(); if (SH.hint === t) SH.hint = null; }, 2400);
}
/* 重新允许访问的气泡（文件夹标签或用到文件夹的按钮旁） */
function closeBub(cancel) { if (!SH.bub) return; const b = SH.bub; SH.bub = null; b.el.remove(); if (cancel && b.onX) b.onX(); }
function bubble(anchor, k, o = {}) {
  if (!anchor || !anchor.isConnected) return;
  closeBub(false);
  const el = document.createElement('div');
  el.className = 'sh-bub'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>浏览器重开后，${esc(folderOf(k).name)} 需重新允许访问</span><button class="btn btn-text tbtn sm" data-r="allow" type="button">允许访问</button><button class="btn btn-icon sm" data-r="x" type="button" aria-label="关闭">${ic('x')}</button>`;
  ovlOf().appendChild(el); placeBub(el, anchor, o.align || 'left');
  el.addEventListener('click', ev => {
    const b = ev.target.closest('[data-r]'); if (!b) return;
    if (b.dataset.r === 'allow') { closeBub(false); allowFolder(k, anchor).then(ok => { if (ok && o.onAllow) o.onAllow(); }); }
    else closeBub(true);
  });
  SH.bub = {el, anchor, sticky: !!o.sticky, onX: o.onX};
}
/* 变灰一律写原因：.is-disabled + aria-disabled（不用 disabled 属性，悬停要能出原因） */
function setDis(b, why) {
  if (!b) return;
  if (!('tip0' in b.dataset)) b.dataset.tip0 = b.dataset.tip || '';
  b.classList.toggle('is-disabled', !!why);
  if (why) { b.setAttribute('aria-disabled', 'true'); b.dataset.tip = why; }
  else { b.removeAttribute('aria-disabled'); if (b.dataset.tip0) b.dataset.tip = b.dataset.tip0; else delete b.dataset.tip; }
}
const isDis = b => !!b && b.getAttribute('aria-disabled') === 'true';
/* 4.9 界面没有 [data-tip] 悬停提示：外壳自己的元素把提示同时写进 title */
function tipSync() {
  if (!FB) return;
  [q('#shell'), q('#stShell'), q('#wsImport'), q('#shFbSt'), q('.sh-delivb')].filter(Boolean).forEach(r => {
    [r, ...qq('*', r)].forEach(e => { if (e.dataset && e.dataset.tip) e.title = e.dataset.tip; else if (e.title && e.dataset && 'tip0' in e.dataset) e.removeAttribute('title'); });
  });
}
function copyText(s) { try { const p = navigator.clipboard && navigator.clipboard.writeText(s); if (p && p.catch) p.catch(() => {}); } catch (e) { /* 剪贴板不可用时不报错 */ } }

/* ---------- 2 状态 ---------- */
const S = {
  ws: 'baker',
  ue: {k: 'wait', detail: ''}, cd: 0, retrying: false, lastOn: '',
  exp: {st: 'none', name: '', h: null},
  bak: {st: 'none', name: ''},
  imp: {pkgs: null, sel: null, loading: false, err: '', errCode: '', pre: {}, writing: null, just: null, failed: {}, written: {}, thumbs: {}},
  bakOwn: null,
  gpu: {raw: '', model: '未知'}
};
const WS = [['baker', '#wsBaker'], ['import', '#wsImport']];
const curWsEl = () => q((WS.find(w => w[0] === S.ws) || WS[0])[1]);

/* ---------- 3 导入模块与 UE ---------- */
/* build.py 写 window.__FWL_IMPORTER_KIND：real = tool/importer/dist/fwl-importer.js；mock = 本机替身 fwl-importer.mock.js；none = 都没有 */
const MOD = {kind: String(window.__FWL_IMPORTER_KIND || 'none'), err: String(window.__FWL_IMPORTER_ERR || '')};
const KIND_TXT = {real: '', mock: '导入模块：替身'};
function modWhy() {
  if (MOD.err) return MOD.err;
  if (!window.FWLImporter) return '导入模块未加载';
  return '';
}
const IMP = () => (modWhy() ? null : window.FWLImporter);
const modVer = () => { const I = IMP(); return I ? `${I.version || '?'}${KIND_TXT[MOD.kind] ? '（替身）' : ''}` : modWhy(); };
const UE_MAP = {connected: 'on', disconnected: 'off', unavailable: 'na', checking: 'wait', connecting: 'wait'};
function applyUE(s) {
  if (!s || typeof s !== 'object') return;
  const k = UE_MAP[s.ue] || 'na', was = S.ue.k;
  if (s.lastConnectedAt) S.lastOn = fmtTime(s.lastConnectedAt); else if (k === 'on' && !S.lastOn) S.lastOn = hhmm();
  S.ue = {k, detail: String(s.detail || ''), endpoint: String(s.endpoint || ''), busy: !!s.busy};
  if (k === 'off') S.cd = Number(s.retryInSec) > 0 ? Math.round(Number(s.retryInSec)) : 0;
  renderAll();
  if (k === 'on' && was !== 'on' && S.ws === 'import') precheck();   /* 连上了：选中的包补做预检 */
}
async function readUE() {
  const I = IMP(); if (!I) { S.ue = {k: 'none', detail: modWhy()}; return; }
  try { applyUE(await I.status()); } catch (e) { S.ue = {k: 'na', detail: '读 UE 状态出错：' + (e && e.message || e)}; renderAll(); }
}
function liveUE() {
  const w = S.imp.writing;
  if (w) return {k: 'write', n: w.i, tot: w.tot};
  if (S.retrying) return {k: 'wait'};
  return S.ue;
}
async function retryUE() {
  const I = IMP(); if (!I || S.retrying) return;
  S.retrying = true; renderAll();
  try { const r = await I.reconnect(); if (r && typeof r === 'object' && r.ue) applyUE(r); } catch (e) { hint(q('#shell [data-sh="retry"]'), '没连上：' + (e && e.message || e)); }
  S.retrying = false; await readUE(); renderAll();
}
/* 自动重试的倒计时只写在「重新连接」的悬停提示里；倒计时由导入模块给（retryInSec），这里只往下数 */
setInterval(() => {
  if (S.ue.k === 'off' && S.cd > 0) { S.cd -= 1; qq('[data-sh="retry"]').forEach(c => { c.dataset.tip = retryTip(); if (FB) c.title = c.dataset.tip; }); }
}, 1000);
const retryTip = () => (S.cd > 0 ? `${S.cd} 秒后自动重新连接` : '重新连接 UE');

/* ---------- 4 文件夹 ---------- */
/* 导出文件夹：外壳自己的浏览器文件夹授权，记在 IndexedDB「fwl-shell」（和烘焙器的「fwl」分开）。
   这一版烘焙器写目录还走本机服务（8034）；同事电脑上没有服务，外壳把导出方式设为 ZIP，导出写完后交给导入模块 publish 写进这里（见第 7 节）。
   备份文件夹：见 loadBak（外壳自己选的优先，没有就用烘焙器 79_repo.js 的仓库文件夹） */
const FS_OK = typeof window.showDirectoryPicker === 'function';
const FOLD = {exp: '导出文件夹', bak: '备份文件夹'}, FOLDK = {exp: '导出', bak: '备份'};
const DB = {
  open: () => new Promise((res, rej) => { const r = indexedDB.open('fwl-shell', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }),
  async get(k) { const db = await DB.open(); return new Promise((res, rej) => { const t = db.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); }); },
  async set(k, v) { const db = await DB.open(); return new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
};
async function permOf(h, ask) {
  if (!h) return false;
  try { const o = {mode: 'readwrite'}; let p = h.queryPermission ? await h.queryPermission(o) : 'granted'; if (p !== 'granted' && ask && h.requestPermission) p = await h.requestPermission(o); return p === 'granted'; }
  catch (e) { return false; }
}
async function loadExp() {
  if (!FS_OK) { S.exp = {st: 'na', name: '', h: null}; return; }
  let h = null; try { h = await DB.get('exportDir'); } catch (e) { h = null; }
  if (!h) { S.exp = {st: 'none', name: '', h: null}; return; }
  S.exp = {st: (await permOf(h, false)) ? 'ok' : 'perm', name: h.name, h};
}
function readBak() {
  if (S.bakOwn) return {st: S.bakOwnOk ? 'ok' : 'perm', name: S.bakOwn.name, own: true};
  let o = null;
  try {
    if (typeof repoFolderInfo === 'function') o = repoFolderInfo();   // eslint-disable-line no-undef
    else if (typeof repoDir !== 'undefined') o = {handle: repoDir.h, name: repoDir.name, ok: !!repoDir.ok};   // eslint-disable-line no-undef
  } catch (e) { o = null; }
  if (!FS_OK) return {st: 'na', name: ''};
  if (!o) return {st: 'none', name: ''};
  return {st: !o.handle ? 'none' : o.ok ? 'ok' : 'perm', name: o.name || ''};
}
const folderOf = k => (k === 'exp' ? S.exp : S.bak);
async function pickFolder(k, anchor) {
  if (k === 'bak') return pickBak(anchor);
  if (!FS_OK) { hint(anchor, '仅 Chrome、Edge 能读写文件夹'); return false; }
  let h; try { h = await window.showDirectoryPicker({id: 'fwlExport', mode: 'readwrite'}); } catch (e) { return false; }   /* 取消了 */
  try { await DB.set('exportDir', h); } catch (e) { /* 记不住也照用这一次 */ }
  S.exp = {st: 'ok', name: h.name, h};
  S.imp.pkgs = null; S.imp.pre = {}; S.imp.err = '';
  renderAll();
  hint(foldEl('exp') || anchor, `已选择 ${h.name}`);
  if (S.ws === 'import') scan();
  return true;
}
/* 备份文件夹（导入覆盖前的备份位置，API importPkg 的 backupDir）：外壳自己选的（IndexedDB「fwl-shell」backupDir）优先；
   没选过就沿用烘焙器的仓库文件夹（79_repo.js 钩子 repoFolderInfo()）。点「备份」选的是外壳自己的：同事电脑上没有仓库，仓库文件夹要求是 FireWorksLab 根目录 */
async function loadBak() {
  if (!FS_OK) return;
  let h = null; try { h = await DB.get('backupDir'); } catch (e) { h = null; }
  if (h) { S.bakOwn = h; S.bakOwnOk = await permOf(h, false); }
  S.bak = readBak();
}
async function pickOwnBak(anchor) {
  if (!FS_OK) { hint(anchor, '仅 Chrome、Edge 能读写文件夹'); return false; }
  let h; try { h = await window.showDirectoryPicker({id: 'fwlBackup', mode: 'readwrite'}); } catch (e) { return false; }
  try { await DB.set('backupDir', h); } catch (e) { /* 记不住也照用这一次 */ }
  S.bakOwn = h; S.bakOwnOk = true; S.bak = readBak(); renderAll();
  hint(foldEl('bak') || anchor, `已选择 ${h.name}`);
  return true;
}
async function pickBak(anchor) {
  if (S.bakOwn || FS_OK) return pickOwnBak(anchor);
  /* 备份 = 烘焙器的仓库文件夹：选法、核对（要是 FireWorksLab 仓库根目录）都按烘焙器 79_repo.js 原样 */
  const before = readBak().st;
  try {
    if (before === 'ok' && typeof repoPick === 'function') await repoPick();   // eslint-disable-line no-undef
    else if (typeof repoMenu === 'function') await repoMenu();   // eslint-disable-line no-undef
    else { hint(anchor, '备份文件夹不可用'); return false; }
  } catch (e) { hint(anchor, '没选上：' + (e && e.message || e)); return false; }
  S.bak = readBak(); renderAll();
  if (S.bak.st === 'ok' && before !== 'ok') hint(foldEl('bak') || anchor, `已选择 ${S.bak.name}`);
  return S.bak.st === 'ok';
}
async function allowFolder(k, anchor) {
  if (k === 'bak') {
    if (!S.bakOwn) return pickBak(anchor);
    S.bakOwnOk = await permOf(S.bakOwn, true); S.bak = readBak(); renderAll();
    if (S.bakOwnOk) hint(foldEl('bak') || anchor, `已允许访问 ${S.bakOwn.name}`);
    return S.bakOwnOk;
  }
  const ok = await permOf(S.exp.h, true);
  S.exp.st = ok ? 'ok' : 'perm'; renderAll();
  if (ok) { hint(foldEl('exp') || anchor, `已允许访问 ${S.exp.name}`); if (S.ws === 'import') scan(); }
  return ok;
}
function folderMenu(a, k) {
  const f = folderOf(k);
  openMenu(a, `<div class="mh">${FOLD[k]}　${esc(f.name)}</div>${k === 'exp' ? '<button class="mi" data-mi="deliv" type="button">资源交付</button>' : ''}<button class="mi" data-mi="change" type="button">换文件夹…</button>`,
    {acts: {deliv: () => openDeliv(), change: () => (k === 'exp' ? pickFolder('exp', a) : pickOwnBak(a))}});
}
/* 外壳给制作区用：导出文件夹句柄（已授权时），没选 / 没授权返回 null */
async function expHandle(ask) {
  if (S.exp.st === 'ok') return S.exp.h;
  if (S.exp.st === 'perm' && ask && await allowFolder('exp')) return S.exp.h;
  return null;
}

/* ---------- 5 顶栏与状态栏（规范第 11 节；样板 v3.5 第 9、10 条） ---------- */
const SPIN = '<span class="spin" aria-hidden="true"></span>';
const UPD = () => (typeof UPDATES !== 'undefined' && Array.isArray(UPDATES) ? UPDATES : []);   // eslint-disable-line no-undef
function unread() {
  const L = UPD(); if (!L.length) return 0;
  const i = L.findIndex(u => u.title === lsGet('fw50.updSeen'));
  return i < 0 ? L.length : i;
}
const cntHTML = (n, tip) => `<span class="sh-cnt"${tip ? ` data-tip="${esc(tip)}"` : ''}>${n > 9 ? '9+' : n}</span>`;
function ueTip(base) { const m = KIND_TXT[MOD.kind] || ''; return [base, m].filter(Boolean).join('　'); }
function ueHTML(v) {
  const addr = [S.ue.endpoint || '127.0.0.1:17780', v.detail].filter(Boolean).join('　');
  const tip = ueTip(`${addr}${S.lastOn ? `　上次连上 ${S.lastOn}` : ''}`);
  if (v.k === 'wait') return `<span class="sh-stat sh-ue st-cell is-busy" data-tip="${esc(ueTip(addr))}">${SPIN}UE <span class="sh-sv">连接中</span></span>`;
  if (v.k === 'on') return `<span class="sh-stat sh-ue st-cell is-dot" data-tone="ok" data-tip="${esc(tip)}">UE <span class="sh-sv is-on">已连接</span></span>`;
  if (v.k === 'off') return `<span class="sh-stat sh-ue st-cell is-dot" data-tone="warn" data-tip="${esc(tip)}">UE <span class="sh-sv is-off">未连接</span></span><button class="btn btn-text tbtn sh-retry" data-sh="retry" type="button" data-tip="${retryTip()}">重新连接</button>`;
  if (v.k === 'write') return `<button class="btn btn-text tbtn sh-stat sh-ue st-cell is-write is-busy" data-sh="toImport" type="button" data-tip="${esc(ueTip('打开资源交付'))}">${SPIN}UE <span class="sh-sv">写入中 <span class="sh-n">${v.n} / ${v.tot}</span></span></button>`;
  return `<span class="sh-stat sh-ue st-cell is-na" data-tip="${esc(ueTip(v.detail || '导入模块未加载'))}">UE <span class="sh-sv">不可用</span></span>`;
}
const foldTip = (k, f) => f.st === 'none' ? `选择${FOLD[k]}` : f.st === 'ok' ? `更换${FOLD[k]}　${f.name}` : f.st === 'perm' ? `允许访问${FOLD[k]}　${f.name}` : '仅 Chrome、Edge 能读写文件夹';
function foldHTML(k) {
  const f = folderOf(k), st = f.st;
  let tone = 'warn', cls = '', v, pop = '';
  if (st === 'none') v = '<span class="sh-sv is-warn">未选</span>';
  else if (st === 'ok') { tone = 'ok'; v = `<span class="sh-sv is-name">${esc(f.name)}</span>`; pop = ' aria-haspopup="menu" aria-expanded="false"'; }
  else if (st === 'perm') v = `<span class="sh-sv is-name">${esc(f.name)}</span><span class="sh-sv is-warn">需允许访问</span>`;
  else { tone = ''; cls = ' is-na'; v = '<span class="sh-sv">不可用</span>'; }
  const lab = `${FOLD[k]} ${st === 'none' ? '未选' : st === 'na' ? '不可用' : esc(f.name)}${st === 'perm' ? ' 需允许访问' : ''}`;
  return `<span class="sh-fp"><button class="btn btn-text tbtn sh-stat sh-fold st-cell${cls}"${tone ? ` data-tone="${tone}"` : ''} data-sh="fold" data-fk="${k}" data-st="${st}" type="button" data-tip="${esc(foldTip(k, f))}" aria-label="${lab}"${st === 'na' ? ' aria-disabled="true"' : ''}${pop}><span class="sh-fk">${FOLDK[k]}</span>${v}</button></span>`;
}
/* 「编排节目 →」这一版变灰（用户 2026-11-05 20:51：编排短期不会用到），悬停写原因 */
const WB_WHY = '编排节目下一版接入';
const wbEntryHTML = () => `<button class="sh-pg sh-go is-disabled" type="button" data-sh="pg" data-pg="wb" aria-disabled="true" aria-pressed="false" data-tip="${WB_WHY}"><span data-w="编排节目">编排节目</span><svg class="i sh-arr" aria-hidden="true"><use href="#${symId('back')}"/></svg></button>`;
function barHTML() {
  const n = unread();
  return `<div class="sh-brand"><b class="tx">烟花工坊</b><button class="sh-ver" data-sh="ver" type="button" aria-haspopup="dialog" aria-expanded="false" data-tip="更新记录"${n ? ` aria-label="FireWorksLab ${SHELL_VER}，更新记录 ${n} 条没看过"` : ''}>FireWorksLab ${SHELL_VER}${n ? cntHTML(n, `${n} 条未读更新`) : ''}</button></div><span class="sp"></span>`
    + `<div class="sh-r"><div class="sh-g sh-g-st" role="group" aria-label="UE"><div class="sh-ueg">${ueHTML(liveUE())}</div></div>`
    + `<div class="sh-g sh-g-gpu"><span class="gpu sh-gpu" aria-label="显卡 ${esc(S.gpu.model)}" data-tip="${esc(S.gpu.raw || '取不到显卡名')}"><span class="sh-gk">显卡</span><span class="sh-gd" aria-hidden="true">·</span><span class="sh-gv">${esc(S.gpu.model)}</span></span></div>`
    + `<div class="sh-g sh-g-pg">${wbEntryHTML()}</div></div>`;
}
const foldEl = k => { const w = curWsEl(); return (w && q(`[data-sh="fold"][data-fk="${k}"]`, w)) || q(`#stShell [data-fk="${k}"]`); };
function renderShell() {
  const h = q('#shell'), slots = qq('#stShell, .sh-stf');
  const a0 = SH.menu && SH.anchor, keep = a0 && (h && h.contains(a0) || slots.some(x => x.contains(a0))) ? a0.dataset.sh + (a0.dataset.fk || '') : '';
  if (h) { h.innerHTML = barHTML(); h.setAttribute('aria-label', '烟花工坊'); }
  slots.forEach(x => { x.innerHTML = foldHTML('exp') + foldHTML('bak'); x.setAttribute('role', 'group'); x.setAttribute('aria-label', '文件夹'); x.classList.add('sh-stg'); });
  if (keep) { const a = [h, ...slots].filter(Boolean).flatMap(r => qq('[data-sh]', r)).find(x => x.getClientRects().length && x.dataset.sh + (x.dataset.fk || '') === keep); if (a) { SH.anchor = a; a.setAttribute('aria-expanded', 'true'); } }
  const ms = KIND_TXT[MOD.kind] || '', why = modWhy();
  qq('.sh-modst').forEach(m => { m.textContent = why || ms; m.classList.toggle('is-warn', !!why); m.dataset.tip = why ? '资源交付的导入不可用，导出照常' : ms ? '导入不连 UE，列表是假数据' : ''; });
  fillDeliv();
}
/* 「资源交付」入口的计数：待导入的包数（0 个时隐藏）；v3.7 的导出菜单每次打开都是新画的，打开时再填一次 */
const pendingN = () => (S.exp.st === 'ok' && Array.isArray(S.imp.pkgs) ? S.imp.pkgs.filter(p => p.state !== '已导入').length : 0);
function fillDeliv() {
  const n = pendingN();
  qq('#expDelivN').forEach(c => { c.textContent = n ? String(n) : ''; c.hidden = !n; c.dataset.tip = n ? `${n} 个素材包待导入` : ''; });
  qq('[data-exp="deliv"]').forEach(b => { if (n) b.setAttribute('aria-label', `资源交付，${n} 个素材包待导入`); else b.removeAttribute('aria-label'); });
}
function dock(el, on) {
  const b = q('#wsBaker'), parts = q('#shParts');
  if (b) { if (on && el.parentNode !== b.parentNode) b.after(el); else if (!on && parts && el.parentNode !== parts) parts.appendChild(el); return; }
  if (on && el.parentNode !== document.body) document.body.appendChild(el);   /* 4.9 界面：叠在制作区那一格上（shell_fb.css） */
}
function setWS(ws) {
  if (!WS.some(w => w[0] === ws)) return;
  const changed = S.ws !== ws; S.ws = ws;
  WS.forEach(([k, sel]) => { const el = q(sel); if (el) { el.hidden = k !== ws; if (k !== 'baker') dock(el, k === ws); } });
  document.body.classList.toggle('sh-on-import', ws === 'import');
  if (changed) { closeMenu(); closeBub(false); dropTips(); }
  if (ws === 'baker' && changed) window.dispatchEvent(new Event('resize'));
  if (changed) placeToast();
}
/* 更新记录（点版本号）：新内容、各部分版本号、「全部记录」「复制版本」；打开过就算看过 */
function browserName() {
  const ua = navigator.userAgent || '', e = ua.match(/Edg\/(\d+)/), c = ua.match(/Chrome\/(\d+)/), f = ua.match(/Firefox\/(\d+)/);
  return e ? `Edge ${e[1]}` : c ? `Chrome ${c[1]}` : f ? `Firefox ${f[1]}，不支持` : '其他浏览器';
}
const bakerVer = () => (typeof VERSION === 'string' ? VERSION : '?');   // eslint-disable-line no-undef
function versRows() {
  return [['烟花工坊', SHELL_VER], ['制作', `烘焙器 ${bakerVer()}`], ['资源交付', `导入模块 ${modVer()}`], ['编排节目', '下一版接入'], ['浏览器', browserName()], ['显卡', S.gpu.raw || '未知']];
}
function verMenu(a) {
  const L = UPD(), n = unread();
  const log = L.length ? `<ul class="sh-log">${L.slice(0, 5).map(u => `<li>${esc(u.title)}</li>`).join('')}</ul>` : '<ul class="sh-log"><li>还没有更新记录</li></ul>';
  openMenu(a, `<div class="mh">${SHELL_VER}　${n ? `新内容 ${n} 条` : '更新记录'}</div>${log}<div class="msum sh-vers"><dl>${versRows().map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div><button class="mi" data-mi="all" type="button">全部记录</button><button class="mi" data-mi="copy" type="button">复制版本</button>`,
    {cls: 'sh-about', role: 'dialog', label: '更新记录',
     acts: {all: () => allUpdates(), copy: () => { copyText(versRows().map(([k, v]) => `${k} ${v}`).join('；')); hint(q('#shell [data-sh="ver"]'), '已复制版本'); }},
     onClose: () => { const t = L[0] && L[0].title; if (t && lsGet('fw50.updSeen') !== t) { lsSet('fw50.updSeen', t); renderShell(); tipSync(); } }});
}
function allUpdates() {
  const L = UPD(), md = typeof mdLite === 'function' ? mdLite : (t => `<p>${esc(t)}</p>`);   // eslint-disable-line no-undef
  openDlg({id: 'upd', cls: 'sh-upd', title: '更新记录', ok: '关闭', cancel: false,
    extra: `<div class="sh-updl sb-auto">${L.length ? L.map(u => `<h3>${esc(u.title)}</h3>${md(u.body || '')}`).join('') : '<p>还没有更新记录。</p>'}</div>`});
}
/* 显卡：WebGL 取真实显卡名，只显示型号；取不到写「未知」 */
function readGPU() {
  let raw = '';
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      raw = String((ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || '');
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    }
  } catch (e) { raw = ''; }
  if (!raw) return {raw: '', model: '未知'};
  if (/swiftshader|llvmpipe|software|basic render/i.test(raw)) return {raw, model: '软件渲染'};
  const m = raw.replace(/^ANGLE \((.*)\)$/, '$1').split(',').map(x => x.trim()).find(x => /geforce|radeon|rtx|gtx|quadro|arc|iris|uhd|apple|mali|adreno/i.test(x)) || raw;
  const model = m.replace(/\s*\(0x[0-9a-f]+\)/i, '').replace(/\s*(Direct3D|vs_|ps_|OpenGL|Metal).*$/i, '').replace(/^NVIDIA\s+|^AMD\s+|^Intel\(R\)\s+/i, '').trim();
  return {raw, model: model || '未知'};
}

/* ---------- 6 资源交付（样板 v3.3 第 17 条；数据来自 FWLImporter，接口见 tool/importer/API_5.0.md） ---------- */
const STATE_WAIT = s => s !== '已导入';
const PLAT = {pc: 'PC', mobile: '手机'};
const pkgById = id => (S.imp.pkgs || []).find(p => p.id === id);
const fmtPlat = p => (Array.isArray(p.platforms) ? p.platforms.map(x => PLAT[x] || x).join('、') : String(p.platform || ''));
const fmtTime = t => { const d = new Date(t); return isNaN(d) ? String(t || '') : `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const errCode = e => (e && e.code) || '';
const errMsg = e => String((e && e.message) || e || '');
/* 回放缩略图：thumbnailURL(pkgId)（同步或 Promise 都接），按包缓存 */
function thumbOf(p) {
  const T = S.imp.thumbs; if (p.id in T) return T[p.id] || '';
  T[p.id] = '';
  const I = IMP(); if (!I || !p.hasThumb || typeof I.thumbnailURL !== 'function') return '';
  try {
    const r = I.thumbnailURL(p.id);
    if (r && typeof r.then === 'function') r.then(u => { T[p.id] = u || ''; if (u) renderImport(); }, () => {});
    else T[p.id] = r || '';
  } catch (e) { T[p.id] = ''; }
  return T[p.id];
}
const emptyHTML = (b, s, btn, act) => `<div class="empty"><b>${esc(b)}</b>${s ? `<span>${esc(s)}</span>` : ''}${btn ? `<button class="btn btn-2" data-sh="${act}" type="button">${esc(btn)}</button>` : ''}</div>`;
function pkgHTML(p, sel) {
  const im = thumbOf(p), just = S.imp.just && S.imp.just.id === p.id;
  return `<div class="lib-item sh-pkg${sel ? ' is-sel' : ''}" role="option" aria-selected="${sel}" tabindex="${sel ? 0 : -1}" data-sh="pkg" data-id="${esc(p.id)}"${p.stateDetail ? ` data-tip="${esc(p.stateDetail)}"` : ''}><div class="th">${im ? `<img src="${esc(im)}" alt="">` : ''}</div>`
    + `<div class="li-t"><div class="sh-l1"><span class="li-n">${esc(p.name)}</span><span class="st${STATE_WAIT(p.state) ? ' is-wait' : ''}">${esc(p.state || '')}</span></div>`
    + `<div class="li-s"><span>${just ? `刚导出 ${S.imp.just.t}` : `${esc(fmtTime(p.exportedAt))} 导出`}</span><span>${esc(fmtPlat(p))}</span></div></div></div>`;
}
const factsHTML = (t, rows) => `<section class="sh-mod" aria-label="${t}"><h3 class="sh-mt">${t}</h3><dl class="sh-dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></section>`;
const assetKey = a => `${a.platform || ''}|${a.key || a.name}`;
function assetTable(p, w) {
  const r = S.imp.pre[p.id], A = r && Array.isArray(r.assets) ? r.assets : Array.isArray(p.assets) ? p.assets : [], fail = S.imp.failed[p.id] || {}, done = S.imp.written[p.id] || {};
  const rows = A.map(a => {
    const k = assetKey(a), f = fail[k];
    const s = f ? '' : done[k] ? 'done' : (w && w.cur === a.name) ? 'run' : (!w && p.state === '已导入') ? 'done' : '';
    const c0 = s === 'done' ? `<span aria-label="已写入">${ic('check')}</span>` : s === 'run' ? '<span class="spin" aria-label="写入中"></span>' : '';
    return `<tr><td>${esc(a.name)}</td><td>${esc(a.kind || '')}</td><td>${esc(PLAT[a.platform] || a.platform || '')}</td><td${a.action === '新建' || !a.action ? ' class="sh-new"' : ''}>${esc(a.action || '—')}</td><td class="sh-path">${esc(a.uePath || '')}</td>${f ? `<td class="sh-fail">${esc(f)}</td>` : `<td class="sh-new">${esc(a.note || '')}</td>`}<td class="sh-wr">${c0}</td></tr>`;
  }).join('');
  return `<table class="sh-at"><thead><tr><th>名称</th><th>类型</th><th>平台</th><th>动作</th><th>UE 路径</th><th>说明</th><th class="sh-wr">写入</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function preRows(p) {
  const r = S.imp.pre[p.id];
  if (!r) return [['预检', '还没做']];
  if (r.loading) return [['预检', `${SPIN} ${esc(r.text || '预检中')}`]];
  if (r.err) return [['预检', `<span class="sh-fail">没做成：${esc(r.err)}</span>`]];
  const n = k => Number(r[k]) || 0;
  return [['预检', r.ok ? '通过' : '没通过'], ['新建', `${n('newCount')} 个`], ['覆盖', `${n('overwriteCount')} 个`]].concat(n('reuseCount') ? [['复用', `${n('reuseCount')} 个`]] : [], n('unchangedCount') ? [['不变', `${n('unchangedCount')} 个`]] : []);
}
function issuesHTML(p) {
  const r = S.imp.pre[p.id], L = r && Array.isArray(r.issues) ? r.issues : [];
  if (!L.length) return '';
  return `<ul class="sh-iss">${L.map(x => `<li class="${x.level === 'error' ? 'is-error' : x.level === 'warn' ? 'is-warn' : ''}">${x.platform ? esc(PLAT[x.platform] || x.platform) + '：' : ''}${esc(x.text || '')}</li>`).join('')}</ul>`;
}
function pkgDetailHTML(p) {
  const w = S.imp.writing && S.imp.writing.pkg === p.id ? S.imp.writing : null, r = S.imp.pre[p.id];
  const A = r && Array.isArray(r.assets) ? r.assets : Array.isArray(p.assets) ? p.assets : [];
  const st = w ? `<span class="st">${SPIN}${esc(w.text || '写入中')} ${w.i} / ${w.tot}</span>` : `<span class="st${STATE_WAIT(p.state) ? ' is-wait' : ''}"${p.stateDetail ? ` data-tip="${esc(p.stateDetail)}"` : ''}>${esc(p.state || '')}</span>`;
  const im = thumbOf(p), tt = Number(p.thumbTime);
  return `<div class="sh-mh"><b>${esc(p.name)}</b>${st}</div>`
    + `<div class="sh-det sb-auto"><div class="sh-hero">`
    + `<figure class="sh-pvw"><div class="sh-pvi${im ? '' : ' is-none'}">${im ? `<img src="${esc(im)}" alt="${esc(p.name)} 回放缩略图">` : '<span>回放缩略图没生成</span>'}</div><figcaption class="sh-cap">引擎回放${Number.isFinite(tt) && p.thumbTime != null ? ` ${tt.toFixed(2)} s` : ''}</figcaption></figure>`
    + factsHTML('修订', [['编号', esc(String(p.revisionId || p.revision || '').slice(0, 10))], ['导出', esc(fmtTime(p.exportedAt))], ['烘焙器', esc(p.bakerVersion || '')], ['平台', esc(fmtPlat(p))]])
    + `<div>${factsHTML('检查', preRows(p))}${issuesHTML(p)}</div>`
    + `</div><section class="sh-mod sh-assets" aria-label="资产"><h3 class="sh-mt">资产<span class="cnt">${A.length} 个</span></h3><div class="sh-tblw">${assetTable(p, w)}</div></section></div>`;
}
function importWhy() {
  const m = modWhy(); if (m) return m;
  if (S.exp.st === 'na') return '仅 Chrome、Edge 能读写文件夹';
  if (S.exp.st === 'none') return '未选导出文件夹';
  if (S.exp.st === 'perm') return '导出文件夹需允许访问';
  const k = liveUE().k;
  if (k === 'off') return 'UE 未连接，GPUECli 启动后自动连上';
  if (k === 'wait') return 'UE 连接中';
  if (k === 'na' || k === 'none') return S.ue.detail || 'UE 不可用';
  if (S.ue.busy) return '正在导入另一个包';
  const p = pkgById(S.imp.sel); if (!p) return '未选素材包';
  const r = S.imp.pre[p.id];
  if (!r || r.loading) return '预检中';
  if (r.err) return '预检没做成：' + r.err;
  if (!r.ok) { const e = (r.issues || []).find(x => x.level === 'error'); return e ? e.text : '预检没通过'; }
  return '';
}
function renderImport() {
  const w = q('#wsImport'); if (!w) return;
  const go = q('#impGo'), wr = S.imp.writing;
  if (wr) { setDis(go, ''); go.classList.add('is-loading'); go.innerHTML = `${SPIN}导入中`; }
  else { go.classList.remove('is-loading'); go.textContent = '导入'; setDis(go, importWhy()); }
  const rf = q('#impRefresh');
  setDis(rf, modWhy() ? modWhy() : S.exp.st === 'na' ? '仅 Chrome、Edge 能读写文件夹' : S.exp.st === 'none' ? '未选导出文件夹' : '');
  rf.classList.toggle('is-loading', S.imp.loading);
  const k = S.ue.k, why = q('#impWhy');
  why.hidden = !(IMP() && (k === 'off' || k === 'na') && !S.retrying);
  q('#impWhyT').textContent = k === 'off' ? 'UE 未连接，GPUECli 启动后自动连上' : (S.ue.detail || 'UE 不可用');
  const rt = q('#impWhy [data-sh="retry"]'); if (rt) rt.hidden = k !== 'off';
  const fv = q('#impFolder');
  fv.textContent = S.exp.st === 'na' ? '导出文件夹不可用' : S.exp.st === 'none' ? '未选导出文件夹' : S.exp.name;
  fv.dataset.tip = S.exp.st === 'ok' || S.exp.st === 'perm' ? `导出文件夹　${S.exp.name}` : '';
  const list = q('#impList'), cnt = q('#impCount'), mc = q('#impMC');
  const mw = modWhy();
  cnt.textContent = '';
  if (mw) { list.innerHTML = ''; mc.innerHTML = `<div class="sh-none">${emptyHTML(mw, '资源交付里的导入不可用；制作和导出照常。')}</div>`; return; }
  if (S.exp.st === 'na') { list.innerHTML = emptyHTML('仅 Chrome、Edge 能读写文件夹', '', '复制地址', 'copyUrl'); mc.innerHTML = ''; return; }
  if (S.exp.st === 'none') { list.innerHTML = emptyHTML('未选导出文件夹', '导出的素材包写在这里，资源交付也从这里读。', '选择…', 'pickExp'); mc.innerHTML = ''; return; }
  if (S.exp.st === 'perm') { list.innerHTML = emptyHTML(`浏览器重开后，${S.exp.name} 需重新允许访问`, '', '允许访问', 'allowExp'); mc.innerHTML = ''; return; }
  if (S.imp.err) { list.innerHTML = emptyHTML(S.imp.err, '', S.imp.errCode === 'NOT_EXPORT_ROOT' ? '换文件夹…' : '重试', S.imp.errCode === 'NOT_EXPORT_ROOT' ? 'pickExp' : 'impRefresh'); mc.innerHTML = ''; return; }
  if (!Array.isArray(S.imp.pkgs)) { list.innerHTML = `<div class="empty"><b>${SPIN} 读取中</b></div>`; mc.innerHTML = ''; return; }
  const P = S.imp.pkgs;
  cnt.textContent = `${P.length} 个素材包`;
  if (!P.length) { list.innerHTML = emptyHTML('导出文件夹里还没有素材包', '在制作里导出后会出现在这里。'); mc.innerHTML = ''; return; }
  list.innerHTML = P.map(p => pkgHTML(p, p.id === S.imp.sel)).join('');
  const p = pkgById(S.imp.sel);
  mc.innerHTML = p ? pkgDetailHTML(p) : `<div class="sh-none">${emptyHTML('选一个包查看')}</div>`;
}
/* 列表：刚导出的排最前，其余按要处理的、已导入，再按导出时间新→旧 */
function sortPkgs(P) {
  const j = S.imp.just && S.imp.just.id;
  return P.slice().sort((a, b) => (b.id === j ? 1 : 0) - (a.id === j ? 1 : 0) || (STATE_WAIT(a.state) ? 0 : 1) - (STATE_WAIT(b.state) ? 0 : 1) || String(b.exportedAt || '').localeCompare(String(a.exportedAt || '')));
}
function setPkgs(L, o = {}) {
  const P = (Array.isArray(L) ? L : []).filter(p => p && p.id != null).map(p => Object.assign({}, p, {id: String(p.id)}));
  if (o.pick) { const hit = P.find(p => p.id === o.pick) || P.find(p => p.name === o.pickName); if (hit) { S.imp.sel = hit.id; S.imp.just = {id: hit.id, t: hhmm()}; } }
  const old = S.imp.pkgs || [];
  P.forEach(p => { const q0 = old.find(x => x.id === p.id); if (q0 && (q0.revisionId !== p.revisionId || q0.state !== p.state)) delete S.imp.pre[p.id]; });
  S.imp.pkgs = sortPkgs(P);
  if (!pkgById(S.imp.sel)) S.imp.sel = (S.imp.pkgs.find(p => STATE_WAIT(p.state)) || S.imp.pkgs[0] || {}).id || null;
}
let scanN = 0;
async function scan(o = {}) {
  const I = IMP(); if (!I || S.exp.st !== 'ok') { renderAll(); return; }
  const my = ++scanN;
  S.imp.loading = true; S.imp.err = ''; S.imp.errCode = ''; renderAll();
  try {
    const L = await I.scan(S.exp.h);
    if (my !== scanN) return;
    S.imp.pre = {};
    setPkgs(L, o);
  } catch (e) {
    if (my !== scanN) return;
    S.imp.errCode = errCode(e);
    if (S.imp.errCode === 'NO_PERMISSION') { S.exp.st = 'perm'; S.imp.err = ''; }
    else S.imp.err = S.imp.errCode === 'NOT_EXPORT_ROOT' ? `${S.exp.name} 不是烟花工坊的导出文件夹` : '读不到导出文件夹：' + errMsg(e);
    S.imp.pkgs = null;
  } finally { if (my === scanN) S.imp.loading = false; }
  renderAll();
  if (o.say) hint(q('#impRefresh'), S.imp.err ? '没读到' : `已刷新：${(S.imp.pkgs || []).length} 个素材包`);
  precheck();
}
/* 预检（API：precheck(pkgId, {platforms}) → {ok, planToken, needBackup, assets, issues, …}）；要 UE 连着 */
async function precheck(force) {
  const I = IMP(), p = pkgById(S.imp.sel); if (!I || !p || (S.imp.pre[p.id] && !force)) return;
  if (S.ue.k !== 'on') { delete S.imp.pre[p.id]; renderAll(); return; }
  S.imp.pre[p.id] = {loading: true}; renderAll();
  try { const r = await I.precheck(p.id, {platforms: p.platforms}); S.imp.pre[p.id] = Object.assign({}, r || {ok: false, issues: [{level: 'error', text: '预检没有结果'}]}); }
  catch (e) { S.imp.pre[p.id] = errCode(e) === 'UE_DISCONNECTED' ? undefined : {err: errMsg(e)}; if (!S.imp.pre[p.id]) delete S.imp.pre[p.id]; }
  renderAll();
}
/* 备份文件夹：导入要覆盖 UE 里已有的资产时要（API：importPkg 的 backupDir）。外壳自己选过的优先，没有就用烘焙器的仓库文件夹（79_repo.js） */
async function backupHandle() {
  if (S.bakOwn && await permOf(S.bakOwn, true)) return S.bakOwn;
  let o = null; try { if (typeof repoFolderInfo === 'function') o = repoFolderInfo(); } catch (e) { o = null; }   // eslint-disable-line no-undef
  return o && o.ok && o.handle ? o.handle : null;
}
function askBackup(n, then, cancel) {
  openDlg({id: 'bak', title: '覆盖前选择备份位置', body: `将覆盖 UE 里已有的 ${n} 个资产，原文件先存进备份文件夹。<b>备份位置不能在 UE 工程里。</b>`, ok: '选择…', cancel: '取消导入',
    onOk: () => pickOwnBak(q('#impGo')).then(ok => (ok ? then() : cancel && cancel())), onCancel: () => cancel && cancel()});
}
function startImport() {
  const p = pkgById(S.imp.sel); if (!p) return;
  const r = S.imp.pre[p.id] || {}, nOv = Number(r.overwriteCount) || 0;
  const no = () => toast('已取消，没有写入任何资产', {from: 'import'});
  const go = async () => {
    const bak = r.needBackup || nOv ? await backupHandle() : null;
    if ((r.needBackup || nOv) && !bak) { askBackup(nOv, () => doImport(p), no); return; }
    doImport(p, bak);
  };
  if (!nOv) { go(); return; }
  openDlg({id: 'ov', title: '覆盖 UE 里已有的资产', body: `「${esc(p.name)}」会覆盖 UE 里已有的 ${nOv} 个资产，覆盖前先备份。`, ok: '导入', cancel: '取消', onOk: go, onCancel: no});
}
async function doImport(p, bak) {
  const I = IMP(); if (!I || S.imp.writing) return;
  const r = S.imp.pre[p.id] || {};
  if (bak === undefined && (r.needBackup || Number(r.overwriteCount))) bak = await backupHandle();
  S.imp.writing = {pkg: p.id, i: 0, tot: 1, text: '写入中', cur: ''}; S.imp.failed[p.id] = {}; S.imp.written[p.id] = {};
  renderAll();
  const onProgress = ev => {
    const w = S.imp.writing; if (!w || !ev || (ev.pkgId && ev.pkgId !== p.id)) return;
    if (Number.isFinite(+ev.done)) w.i = +ev.done; if (Number.isFinite(+ev.total) && +ev.total > 0) w.tot = +ev.total;
    w.text = ev.phase === 'import' ? '写入中' : (ev.text || '写入中'); w.cur = ev.phase === 'import' ? String(ev.text || '').replace(/^\S+\s/, '') : '';
    renderShell(); renderImport(); tipSync();
  };
  let res = null, err = null;
  try { res = await I.importPkg(p.id, {planToken: r.planToken, platforms: p.platforms, onProgress, backupDir: bak || undefined}); } catch (e) { err = e; }
  S.imp.writing = null;
  const c = errCode(err);
  if (c === 'PLAN_STALE') { await precheck(true); toast('检查结果过期了，已重新检查，请再点「导入」', {from: 'import'}); return; }
  if (c === 'NEED_BACKUP_DIR') { renderAll(); askBackup(Number(r.overwriteCount) || 0, () => doImport(p), () => toast('已取消，没有写入任何资产', {from: 'import'})); return; }
  const failed = res && Array.isArray(res.failed) ? res.failed : [], written = res && Array.isArray(res.written) ? res.written : [];
  failed.forEach(f => { S.imp.failed[p.id][assetKey(f)] = f.reason || '没写进'; });
  written.forEach(x => { S.imp.written[p.id][assetKey(x)] = true; });
  if (err) toast(c === 'BUSY' ? '正在导入另一个包，写完再试' : `没导入：${errMsg(err)}`, {from: 'import'});
  else if (failed.length) toast(`已写入 ${written.length} 个资产，${failed.length} 个没写进：${failed[0].name} ${failed[0].reason || ''}`, {from: 'import', action: {label: '查看', ws: 'import', fn: () => setWS('import')}});
  else toast(`已写入 ${written.length} 个资产${res && res.backup ? `，覆盖的 ${res.backup.files} 个已备份` : ''}${res && res.gpuRestartNeeded ? '；要重启 UE 编辑器后再收尾一次' : ''}`, {from: 'import', action: {label: '查看', ws: 'import', fn: () => { S.imp.sel = p.id; setWS('import'); renderAll(); }}});
  const keepF = S.imp.failed[p.id], keepW = S.imp.written[p.id];
  await scan();
  S.imp.failed[p.id] = keepF; S.imp.written[p.id] = keepW;
  renderAll();
}
const openDeliv = (o = {}) => {
  setWS('import'); renderAll();
  if (IMP() && S.exp.st === 'ok' && !Array.isArray(S.imp.pkgs)) scan(o);
  const row = q(`#impList [data-id="${S.imp.sel}"]`); if (row) row.scrollIntoView({block: 'nearest'});
};

/* ---------- 7 导出 ---------- */
/* 导出前先看导出文件夹：第一次没选 → 对话框；要重新允许 → 按钮旁一句；浏览器不支持读写文件夹 → 照常出 ZIP 下载（不拦） */
const EXP_BTNS = '#expBtn [data-act="export"], #deliv [data-act="exportChecked"], #abExportPack, #btnExport, #btnExportCombo';
function exportEntry(t) {
  const btn = t.closest(EXP_BTNS);
  if (btn) return {el: btn, anchor: btn.closest('#expBtn') || btn, replay: () => { if (btn.isConnected) btn.click(); }};
  const mi = t.closest('.menu .mi[data-exp]');
  if (mi && mi.dataset.exp !== 'deliv') return {el: mi, anchor: q('#expBtn') || mi, menu: true, replay: null};
  return null;
}
function askExpFolder(then, o = {}) {
  openDlg({id: 'exp', title: '选择导出文件夹', body: '导出的贴图和配置写在这里，资源交付也从这里读取。之后自动记住。', ok: '选择…', cancel: '取消',
    onOk: () => { pickFolder('exp', o.anchor).then(ok => { if (ok && then) then(); else if (!ok && o.cancelMsg) hint(o.anchor, o.cancelMsg); }); },
    onCancel: () => { if (o.cancelMsg) hint(o.anchor, o.cancelMsg); }});
}
/* 导出写完（67_delivery.js 的钩子调一次）：ZIP 方式时交给导入模块 publish(导出文件夹, blob, name, metadata) 写进导出文件夹（原 8034 的交付），
   再打开资源交付、选中刚导出的包。导入模块没加载或没选文件夹时只有浏览器下载的那份 ZIP */
/* 4.9.132：导出文件夹选好了（且允许访问）、导入模块在 → 制作区不再下载 ZIP，这里写进文件夹 */
window.shellWillPublish = () => !!IMP() && S.exp.st === 'ok';
window.shellAfterExport = async (info = {}) => {
  const name = String(info.name || '').replace(/\.zip$/i, '');
  const I = IMP();
  let pick = '', bad = '';
  if (info.destination === 'zip' && info.blob instanceof Blob) {
    if (!I) bad = `${modWhy()}：只下载了 ZIP，没写进导出文件夹`;
    else {
      const h = await expHandle(false);
      if (!h) bad = S.exp.st === 'na' ? '' : `只下载了 ZIP，没写进导出文件夹：${S.exp.st === 'none' ? '未选导出文件夹' : '导出文件夹需允许访问'}`;
      else {
        try { const rc = await I.publish(h, info.blob, info.name, info.metadata || {}); pick = String((rc && (rc.pkgId || rc.deliveryId)) || ''); }
        catch (e) { bad = errCode(e) === 'NOT_EXPORT_ROOT' ? `${S.exp.name} 不是烟花工坊的导出文件夹，没写进去` : '没写进导出文件夹：' + errMsg(e); }
      }
    }
  }
  /* 没下载过（交给这里写）却没写进去：补下载这一份，不丢导出 */
  if (bad && info.downloaded === false && info.blob instanceof Blob && typeof window.download === 'function') { try { window.download(info.blob, info.name); } catch (e) { } bad = bad.replace(/^只下载了 ZIP，/, '').replace(/^没写进导出文件夹/, '没写进导出文件夹') + '，已改为下载 ZIP'; }
  const ov = q('#ovlApp'); if (ov) qq(':scope > .toast', ov).forEach(t => t.remove());
  setWS('import');
  if (I && S.exp.st === 'ok') await scan({pick, pickName: name}); else renderAll();
  if (bad) toast(bad, {from: 'baker'});
  else toast(`已导出 ${name}${pick ? `，写进 ${S.exp.name}` : ''}`, {from: 'baker', action: {label: '返回制作', ws: 'baker', fn: () => setWS('baker')}});
};
window.shellOpenDelivery = () => openDeliv();
window.shellToast = (text, o = {}) => toast(text, o);
window.shellExportFolderName = () => (S.exp.st === 'na' ? '不可用' : S.exp.st === 'none' ? '未选' : S.exp.name);
window.shellExportFolderHandle = ask => expHandle(!!ask);
window.shellPickExportFolder = () => {
  const a = foldEl('exp');
  if (S.exp.st === 'na') { hint(a || q('#expBtn'), '仅 Chrome、Edge 能读写文件夹'); return; }
  if (S.exp.st === 'none') { pickFolder('exp', a); return; }
  if (S.exp.st === 'perm') { closeBub(false); allowFolder('exp', a); return; }
  if (a) setTimeout(() => folderMenu(a, 'exp'), 0);
};

/* ---------- 8 事件 ---------- */
/* 导出入口：捕获阶段先看导出文件夹（制作区的导出在冒泡阶段执行） */
document.addEventListener('click', e => {
  if (SH.replay || !e.target.closest) return;
  const x = exportEntry(e.target); if (!x || isDis(x.el) || x.el.disabled) return;
  if (S.exp.st === 'ok' || S.exp.st === 'na') return;
  e.stopPropagation(); e.preventDefault();
  const replay = () => { if (!x.replay) { hint(x.anchor, '已选好导出文件夹，再点一次导出'); return; } SH.replay = true; try { x.replay(); } finally { SH.replay = false; } };
  if (S.exp.st === 'none') askExpFolder(replay, {anchor: x.anchor, cancelMsg: '未导出：未选导出文件夹'});
  else bubble(x.anchor, 'exp', {align: 'right', onAllow: replay});
}, true);
/* 「资源交付」入口（v3.7：导出菜单第一项 [data-exp=deliv]；4.9 界面：外壳插在「导出素材包」旁边） */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-exp="deliv"]');
  if (!b || b.disabled || isDis(b)) return;
  setTimeout(() => { if (S.ws !== 'import') openDeliv(); }, 0);
});
/* 切到资源交付时，制作区的单键快捷键不作用到看不见的画面 */
document.addEventListener('keydown', e => {
  if (S.ws === 'baker' || SH.dlg) return;
  const t = e.target;
  if (t.closest && t.closest('.tab, .seg, .menu, input, textarea, select, .field, .sh-bub, .dialog, dialog')) return;
  const k = e.key, mod = e.ctrlKey || e.metaKey;
  const block = mod ? /^[zys]$/i.test(k) : [' ', 'r', 'R', 's', 'S', 'h', 'H', 'f', 'F', 'l', 'L', 'p', 'P', 'b', 'B', '[', ']', '?', 'ArrowLeft', 'ArrowRight', 'Delete', 'Backspace', 'F2'].includes(k);
  if (block) { e.stopPropagation(); if (mod) e.preventDefault(); }
}, true);
document.addEventListener('pointerdown', e => {
  if (SH.menu && !SH.menu.contains(e.target) && !(SH.anchor && SH.anchor.contains(e.target))) closeMenu();
  if (SH.bub && !SH.bub.sticky && !SH.bub.el.contains(e.target) && !(SH.bub.anchor && SH.bub.anchor.contains(e.target))) closeBub(false);
});
document.addEventListener('click', e => {
  const t = e.target; if (!t.closest) return;
  const a = t.closest('[data-sh]'); if (!a || !a.closest('#shell, #stShell, #wsImport, #shFbSt')) return;
  if (isDis(a)) { e.stopPropagation(); if (a.dataset.tip) hint(a, a.dataset.tip); return; }
  const act = a.dataset.sh;
  const A = {
    back: () => setWS('baker'),
    ver: () => (SH.menu && SH.anchor === a ? closeMenu() : verMenu(a)),
    retry: () => retryUE(),
    toImport: () => openDeliv(),
    fold: () => {
      const k = a.dataset.fk, st = a.dataset.st;
      if (st === 'none') pickFolder(k, a);
      else if (st === 'perm') { closeBub(false); allowFolder(k, a); }
      else if (st === 'ok') { if (SH.menu && SH.anchor === a) closeMenu(); else folderMenu(a, k); }
    },
    impRefresh: () => { if (S.exp.st === 'perm') { bubble(a, 'exp', {align: 'right'}); return; } scan({say: true}); },
    impGo: () => { if (S.imp.writing) return; if (S.exp.st === 'perm') { bubble(a, 'exp', {align: 'right'}); return; } startImport(); },
    pkg: () => { if (S.imp.sel !== a.dataset.id) { S.imp.sel = a.dataset.id; renderAll(); precheck(); const r = q(`#impList [data-id="${a.dataset.id}"]`); if (r) r.focus({preventScroll: true}); } },
    pickExp: () => pickFolder('exp', a),
    allowExp: () => allowFolder('exp', a),
    copyUrl: () => { copyText(location.href); hint(a, '已复制地址'); }
  };
  if (A[act]) { e.stopPropagation(); A[act](); }
});
/* 列表的键盘：↑ ↓ 换行、Enter 选中 */
function listKeys(e) {
  const t = e.target; if (!t.classList || !t.classList.contains('lib-item')) return;
  if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) return;
  e.stopPropagation(); e.preventDefault();
  if (e.key === 'Enter' || e.key === ' ') { t.click(); return; }
  const box = t.parentElement, its = qq('.lib-item', box), j = its.indexOf(t), nx = its[clamp(j + (e.key === 'ArrowDown' ? 1 : -1), 0, its.length - 1)];
  if (nx && nx !== t) { const id = nx.dataset.id; nx.click(); const f = box.isConnected && q(`[data-id="${id}"]`, box); if (f) f.focus(); }
}
function renderAll() { renderShell(); renderImport(); tipSync(); }

/* ---------- 9 启动：把各块搬进槽位，没有槽位就自己搭 ---------- */
function size1366() { if (FB) document.body.classList.toggle('s1366', innerWidth < 1600); }
function mount() {
  FB = !q('#shell');
  const parts = q('#shParts');
  const svg = parts && q(':scope > svg', parts); if (svg) document.body.appendChild(svg);   /* 外壳自带图标放到看得见的地方（隐藏容器里的 symbol 有的浏览器不画） */
  if (FB) {
    document.body.classList.add('sh-fb');
    const h = document.createElement('header'); h.id = 'shell'; h.className = 'shell'; document.body.prepend(h);
    ['header.top .brand', '#gpu', 'header.top .delivery-nav', '#updBtn'].forEach(s => qq(s).forEach(el => el.classList.add('sh-dup')));
    if (!q('#stShell')) {
      const f = document.createElement('footer'); f.id = 'shFbSt'; f.className = 'status';
      f.innerHTML = '<div class="st-l"><span id="stShell"></span></div><div class="st-r"><span class="sh-modst"></span></div>';
      document.body.appendChild(f);
    }
    /* 旧顶栏收掉重复的几样后只剩提示文字 #status：把它搬到外壳状态栏右边（烘焙器按 id 写字，照常），整条旧顶栏收起 */
    const top = q('header.top'), st = q('#status');
    if (top && st && top.contains(st) && ![...top.children].some(c => c !== st && !c.classList.contains('sh-dup') && c.getBoundingClientRect().width > 1)) {
      q('#shFbSt .st-r').prepend(st); top.classList.add('sh-dup');
    }
    if (!q('[data-exp="deliv"]')) {
      const ex = q('#abExportPack');
      const b = document.createElement('button'); b.type = 'button'; b.className = (ex ? ex.className.replace(/\bprimary\b/, '') : 'btn') + ' sh-delivb'; b.dataset.exp = 'deliv'; b.dataset.tip = '查看导出文件夹里的包，导入 UE';
      b.innerHTML = '资源交付<span class="sh-cnt" id="expDelivN" hidden></span>';
      if (ex) ex.after(b); else q('#shell').appendChild(b);
    }
    size1366(); window.addEventListener('resize', size1366);
  }
  /* 外壳的浮层（菜单、对话框、提示条）放在自己的一层里：制作区没有 #ovlApp 时自己建 */
  if (!q('#ovlApp')) { const o = document.createElement('div'); o.id = 'ovlApp'; o.className = 'ovl'; document.body.appendChild(o); }
  qq('use[data-ic]').forEach(u => u.setAttribute('href', '#' + symId(u.dataset.ic)));
  const wi = q('#wsImport'); if (wi) wi.addEventListener('keydown', listKeys);
  /* 这一版导出写成 ZIP（同事电脑上没有本机交付服务 8034），写完由外壳存进导出文件夹 */
  const dst = q('#deliveryDestination'); if (dst && [...dst.options].some(o => o.value === 'zip')) dst.value = 'zip';
  /* v3.7：「导出 ▾」菜单每次打开都是新画的，出现计数位时填上 */
  const ov = q('#ovlApp'); if (ov && !FB) new MutationObserver(() => { const c = q('#expDelivN'); if (c && !c.dataset.shN) { c.dataset.shN = '1'; fillDeliv(); tipSync(); } }).observe(ov, {childList: true});
  window.addEventListener('resize', () => { placeToast(); closeMenu(); });
  S.gpu = readGPU();
  S.bak = readBak();
  document.title = '烟花工坊 ' + SHELL_VER;     /* 4.9.134：浏览器标签页写产品名（以前是烘焙器的「烟花烘焙器 · v4.9.x」，和顶栏对不上；烘焙器内部版本在版本号菜单里） */
  if (!IMP()) S.ue = {k: 'none', detail: modWhy()};
  renderAll();
  loadBak().then(() => renderAll());
  loadExp().then(() => { renderAll(); if (IMP() && S.exp.st === 'ok') scan(); });
  const I = IMP();
  if (I) {
    const sub = (ev, f) => { try { if (typeof I.on === 'function') I.on(ev, f); } catch (e) { /* 没有这个事件就靠轮询 */ } };
    sub('status', s => applyUE(s));
    sub('packages', L => { if (S.exp.st === 'ok' && Array.isArray(L)) { setPkgs(L); renderAll(); precheck(); } });
    sub('progress', ev => { if (!ev || S.imp.writing) return; const r = S.imp.pre[ev.pkgId]; if (r && r.loading) { r.text = ev.text || '预检中'; renderImport(); } });
    readUE();
    setInterval(() => { if (!S.retrying && !S.imp.writing) readUE(); }, 5000);
  }
  /* 备份文件夹（烘焙器的仓库文件夹）是烘焙器自己读的：隔一会儿看一次，变了才重画 */
  setInterval(() => { const b = readBak(); if (b.st !== S.bak.st || b.name !== S.bak.name) { S.bak = b; renderAll(); } }, 2000);
  /* 浏览器的提示（file:// 页面第一次连本机 UE 时 Chrome 可能问一次「允许访问本机设备」）由导入模块处理，外壳只显示状态 */
  window.SHELL = {S, MOD, ws: setWS, render: renderAll, scan, openDeliv, state: () => ({ws: S.ws, fb: FB, ue: liveUE(), exp: S.exp.st, bak: S.bak.st, mod: MOD.kind, modWhy: modWhy(), n: (S.imp.pkgs || []).length, sel: S.imp.sel, writing: S.imp.writing && {i: S.imp.writing.i, tot: S.imp.writing.tot}})};
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
