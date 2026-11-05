
/* =====================================================================
   烟花工坊 5.0 外壳（script_shell.js，E 样板 v3.5）：交互宪章 0.9 ①–⑧ + 用户 2026-11-05 改定、15:50 再改、17:05 补充；设计规范 v3 第 11、12 节；
   E样板_v3.3_改动单.md 第 16–19 条；E样板_v3.4_改动单.md 第 1–3 条（导出、备份文件夹放到状态栏左端 #stShell；「资源交付」从顶栏
   去掉，改由「导出 ▾」菜单第一项 [data-exp=deliv] 打开；顶栏右侧只放「UE」｜显卡全名｜入口），第 13 条（滚动区加 .sb-auto）；
   E样板_v3.5_改动单.md 第 9 条（「显卡 · GeForce RTX 5080」；UE 前面 6 px 状态圆点，已连接薄荷、未连接琥珀）、第 10 条（「编排工作台」改名「编排节目」，入口画 1 px 线框）
   单独一个 <script>，不在样板的闭包里：样板的内部函数调不到。菜单、提示条、对话框、操作处提示
   按样板的 DOM 与类名（.menu / .toast / .scrim + .dialog / .tip.sm.hint）另写一份；悬停提示仍用样板的 [data-tip]。
   1 小工具与浮层  2 状态与数据  3 外壳顶栏与状态栏左端  4 资源交付（导入）  5 编排节目  6 编排预览与另存  7 首次使用  8 样板开关
   9 事件  10 全表一节  11 启动
   ===================================================================== */
(() => {
'use strict';

/* ---------- 1 小工具与浮层 ---------- */
const q = (s, r = document) => r.querySelector(s);
const qq = (s, r = document) => [...r.querySelectorAll(s)];
const ic = (id, cls = '') => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad2 = n => String(n).padStart(2, '0');
const hhmm = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const app = () => q('#app');
const inSheet = el => !!(el && el.closest && el.closest('#kitSheet'));
const ovlOf = el => (inSheet(el) ? q('#ovlSheet') : q('#ovlApp')) || document.body;
const VIEW = () => ({left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight});
const hostOf = el => (inSheet(el) || !app() ? VIEW() : app().getBoundingClientRect());
const VER = '5.0.3';

const SH = {scale: 1, menu: null, anchor: null, onMenuClose: null, dlg: null, dlgO: null, toast: null, toastT: 0, hint: null, hintT: 0, bub: null, timers: {}, replay: false};
const T = ms => Math.max(10, Math.round(ms * SH.scale));
const later = (key, fn, ms) => { clearTimeout(SH.timers[key]); SH.timers[key] = setTimeout(fn, T(ms)); };
const stopT = key => { clearTimeout(SH.timers[key]); delete SH.timers[key]; };

/* 文案自查（走查脚本用）：window.__shCopyLog 是数组时，浮层出现时把文字按类别记下来；SHELL.copy() 取当前可见文字和悬停提示 */
const txt1 = s => (s || '').replace(/\s+/g, ' ').trim();
/* 整个元素看得见的文字：各段之间按排版补一个空格（「资源交付 2」「导出 FWL_Export」），标点前后不补 */
const txtSp = e => { const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let out = '', n;
  while ((n = w.nextNode())) { const s = txt1(n.textContent); if (!s) continue; if (out && !/[（「：，、]$/.test(out) && !/^[，。：、）」]/.test(s)) out += ' '; out += s; }
  return out; };
function copyParts(kind, el) {
  const out = [], add = (c, s) => { s = txt1(s); if (s) out.push([kind, c, s]); };
  if (typeof el === 'string') add(kind === '就地报错' ? '原因' : '提示条', el);
  else if (kind === '提示条' || kind === '气泡') { const sp = q(':scope > span', el); add('提示条', sp && sp.textContent); qq('button', el).forEach(b => add('按钮', b.textContent || b.getAttribute('aria-label'))); }
  else if (kind === '对话框') { const h = q('h2', el); add('对话框标题', h && h.textContent); qq('p, .ms2', el).forEach(p => add('对话框正文', p.textContent)); qq('.sh-lab, .sh-opt > span', el).forEach(x => add('标签', x.textContent)); qq('.acts button:not(.sh-kitb)', el).forEach(b => add('按钮', b.textContent)); }
  else if (kind === '菜单') { qq('.mh, .msum b', el).forEach(x => add('菜单标题', x.textContent)); qq('dt', el).forEach(x => add('标签', x.textContent)); qq('dd', el).forEach(x => add('信息', x.textContent)); qq('.mi', el).forEach(x => add(x.matches('[data-mi]') ? '菜单项' : '信息', x.textContent)); }
  return out;
}
function logCopy(kind, el) { const L = window.__shCopyLog; if (Array.isArray(L) && el) L.push(...copyParts(kind, el)); }
const COPY_CLS = [['.sh-mt, .sh-dl dt, .sh-gk', '标签'], ['.sh-dl dd, .sh-cap', '信息'], ['.sh-pass, .sh-pvi span', '状态'], ['.sh-brand b, .sh-ver', '名称'], ['.sh-fold, .sh-ue', '状态'], ['button, .tab, .sh-pg', '按钮'], ['.empty b', '空状态'], ['.sh-why > span, .sh-pv.is-err > span:not(.sh-pvk)', '原因'], ['th', '表头'], ['.sh-st, .st, .st-ok, .conn, .sh-fx, .sh-cd, .sh-pv > span', '状态'], ['.li-n, .sh-mh b, .sh-brand, .gpu, .sh-gv', '名称'], ['.lbl, .li-s span, .sh-hv, .sh-mh .mute, .cnt, td', '信息']];
function snapCopy() {
  const out = [], add = (w, c, s) => { s = txt1(s); if (s) out.push([w, c, s]); };
  [['#shell', '顶栏'], ['#stShell', '状态栏'], ['#wsImport', '资源交付'], ['#wsWB', '编排节目'], ['#sbPreview', '状态栏']].forEach(([sel, w]) => {
    const r = q(sel); if (!r || !r.getClientRects().length) return;
    qq('[data-tip]', r).forEach(e => { if (!e.getClientRects().length) return; add(w, isDis(e) ? '原因' : '悬停', e.dataset.tip); if (e.dataset.key) add(w, '悬停（第二行）', e.dataset.key); });
    qq('input[placeholder]', r).forEach(e => add(w, '占位文字', e.placeholder));
    qq('*', r).forEach(e => {
      if (!e.getClientRects().length || e.closest('#saveSt, .sh-ph, .sh-at tbody td:first-child, .sh-gd')) return;   /* 逐资产清单的资产名是数据，不是文案；「显卡 · 型号」的间隔点是排版 */
      if (e.parentElement && e.parentElement.closest('button, .tab, .sh-fold, .sh-ue')) return;
      const m = COPY_CLS.find(([s]) => e.matches(s)), whole = m && ['按钮', '名称', '状态'].includes(m[1]) && e.matches('button, .tab, .sh-fold, .sh-ue');
      const own = whole ? txtSp(e) : [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
      if (txt1(own)) add(w, m ? m[1] : '文字', own);
    });
  });
  return out;
}
function placeNear(el, anchor, align = 'left') {
  const a = anchor.getBoundingClientRect(), H = hostOf(anchor), w = el.offsetWidth, h = el.offsetHeight;
  let x = align === 'right' ? a.right - w : align === 'center' ? a.left + (a.width - w) / 2 : a.left;
  x = clamp(x, H.left + 8, H.right - w - 8);
  let y = a.bottom + 4;
  if (y + h > H.bottom - 8) y = a.top - h - 4;
  el.style.left = x + 'px'; el.style.top = Math.max(H.top + 8, y) + 'px';
}
/* 打开外壳的浮层前，把正在显示的悬停提示收掉（样板的提示也在同一个浮层容器里） */
const dropTips = () => qq('.ovl > .tip:not(.hint)').forEach(t => t.remove());

function closeMenu(refocus) {
  if (!SH.menu) return;
  SH.menu.remove(); SH.menu = null;
  let a = SH.anchor; SH.anchor = null;
  if (a) a.setAttribute('aria-expanded', 'false');
  const f = SH.onMenuClose; SH.onMenuClose = null; if (f) f(a);
  /* onClose 可能重画了顶栏或状态栏（看过更新记录后去掉未读数）：焦点回到重画后的同一个入口 */
  if (a && !a.isConnected && a.dataset.sh) a = (a.dataset.fk ? foldEl(a.dataset.fk) : q(`#shell [data-sh="${a.dataset.sh}"]`)) || a;
  if (refocus && a && a.isConnected) a.focus();
}
function openMenu(anchor, html, o = {}) {
  closeMenu(); dropTips();
  const m = document.createElement('div');
  m.className = 'menu sb-auto' + (o.cls ? ' ' + o.cls : '');   /* v3.4 第 13 条：滚动条只在滚动时出现（制作区的通用类） */ m.setAttribute('role', o.role || 'menu');
  if (o.label) m.setAttribute('aria-label', o.label);
  m.innerHTML = html; ovlOf(anchor).appendChild(m);
  placeNear(m, anchor, o.align || 'left');
  m.addEventListener('click', ev => {
    const b = ev.target.closest('[data-mi]'); if (!b || b.disabled) return;
    const f = o.acts && o.acts[b.dataset.mi]; closeMenu(); if (f) f();
  });
  m.addEventListener('keydown', ev => {
    const bs = qq('[data-mi]:not(:disabled)', m), i = bs.indexOf(document.activeElement);
    if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && bs.length) { ev.preventDefault(); bs[(i + (ev.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus(); }
    if (ev.key === 'Escape') { ev.preventDefault(); closeMenu(true); }
    if (ev.key === 'Tab') closeMenu();
    ev.stopPropagation();
  });
  SH.menu = m; SH.anchor = anchor; SH.onMenuClose = o.onClose || null;
  anchor.setAttribute('aria-expanded', 'true');
  const f = q('[data-mi]:not(:disabled)', m); if (f && !o.noFocus) f.focus();
  logCopy('菜单', m);
  return m;
}

/* 对话框：结构同样板的确认弹窗（.scrim + .dialog，主按钮在右，Esc 关闭，Tab 在框内循环） */
function dlgHTML(o, live = true) {
  return `<h2${live ? ' id="shDlgT"' : ''}>${esc(o.title)}</h2>${o.body ? `<p>${o.body}</p>` : ''}${o.extra || ''}`
    + `<div class="sh-dmsg f-msg" role="alert"${o.err ? '' : ' hidden'}><span>${o.err ? esc(o.err) : ''}</span></div>`
    + `<div class="acts">${o.kit ? `<button class="btn btn-text tbtn sm sh-kitb" data-r="kit" type="button" data-tip="样板：选到 UE 工程里">${esc(o.kit)}</button>` : ''}<button class="btn btn-2" data-r="0" type="button">${esc(o.cancel || '取消')}</button><button class="btn btn-1" data-r="1" type="button">${esc(o.ok)}</button></div>`;
}
function closeDlg() { if (SH.dlg) { SH.dlg.forEach(x => x.remove()); SH.dlg = null; SH.dlgO = null; } }
function dlgErr(d, text) {
  const m = q('.sh-dmsg', d); if (!m) return;
  m.hidden = !text; q('span', m).textContent = text || '';
  if (text) logCopy('就地报错', text);
}
function openDlg(o) {
  closeMenu(); closeDlg(); closeBub(false); dropTips();
  const host = o.host || app() || document.body, H = hostOf(host), ov = ovlOf(host);
  const sc = document.createElement('div'); sc.className = 'scrim';
  Object.assign(sc.style, {left: H.left + 'px', top: H.top + 'px', width: H.width + 'px', height: H.height + 'px'});
  const d = document.createElement('div'); d.className = 'dialog sh-dlg';
  d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'shDlgT');
  if (o.id) d.dataset.dlg = o.id;
  d.innerHTML = dlgHTML(o);
  ov.append(sc, d);
  d.style.left = (H.left + (H.width - d.offsetWidth) / 2) + 'px';
  d.style.top = (H.top + Math.max(16, Math.min(H.height * .3, H.height - d.offsetHeight - 16))) + 'px';
  const back = document.activeElement;
  const done = ok => { const val = o.val; closeDlg(); if (back && back.isConnected && back.focus) back.focus({preventScroll: true}); const f = ok ? o.onOk : o.onCancel; if (f) f(val); };
  d.addEventListener('click', ev => {
    const b = ev.target.closest('[data-r]'); if (!b) return;
    if (b.dataset.r === 'kit') { if (o.onKit) o.onKit(d); return; }
    if (b.dataset.r === '1' && o.check && o.check(d, o) === false) return;
    done(b.dataset.r === '1');
  });
  d.addEventListener('keydown', ev => {
    ev.stopPropagation();
    if (ev.key === 'Escape') { ev.preventDefault(); done(false); return; }
    if (ev.key === 'Enter' && ev.target.matches('input[type=text]')) { ev.preventDefault(); q('[data-r="1"]', d).click(); return; }
    if (ev.key === 'Tab') {
      const fs = qq('button, input', d).filter(x => !x.disabled && x.offsetParent !== null), i = fs.indexOf(document.activeElement);
      ev.preventDefault(); fs[(i + (ev.shiftKey ? fs.length - 1 : 1)) % fs.length].focus();
    }
  });
  sc.addEventListener('click', () => done(false));
  SH.dlg = [sc, d]; SH.dlgO = o;
  logCopy('对话框', d);
  const f = o.focus ? q(o.focus, d) : q('[data-r="1"]', d);
  if (f) { f.focus(); if (f.select) f.select(); }
  return d;
}

/* 提示条（走查 P8；规范第 12 节）：外壳统一一个提示区，在外壳顶栏下方、当前页面顶部居中，不出屏；切页面时跟着挪过去，
   已经过时的按钮（人已经在那一页）收起。跨页面的结果写明来自哪里：o.from = baker / import / wb →「导入：已写入 14 个资产」。
   一次只留一条，悬停不消失；全表里出在全表底部。样板自己的提示条要进同一个提示区时调 window.shellToast(text, o) */
const WSN = {baker: '制作', import: '导入', wb: '编排'};
const mainOf = ws => q({baker: '#mid', import: '#impMain', wb: '#wsWB .sh-wbmid'}[ws]);
function closeToast() { clearTimeout(SH.toastT); if (SH.toast) { SH.toast.remove(); SH.toast = null; SH.toastO = null; } }
function placeToast() {
  const t = SH.toast, o = SH.toastO || {}; if (!t || !t.isConnected) return;
  const b = q('[data-r="act"]', t); if (b && o.action) b.hidden = !!o.action.ws && o.action.ws === S.ws;
  const sheet = q('#kitSheet:not([hidden])');
  if (sheet || inSheet(o.near)) {
    const H = hostOf(sheet || o.near);
    t.style.left = clamp(H.left + (H.width - t.offsetWidth) / 2, H.left + 8, H.right - t.offsetWidth - 8) + 'px';
    t.style.top = (H.bottom - t.offsetHeight - 12) + 'px';
    return;
  }
  /* 外壳提示区（规范第 12 节）：外壳顶栏下方、当前页面顶部（工具行下面）居中 */
  const A = app().getBoundingClientRect(), sh = q('#shell'), ws = curWsEl(), tool = ws && q(':scope > .topbar', ws);
  const top = Math.max(A.top + (sh ? sh.offsetHeight : 0), tool && tool.getClientRects().length ? tool.getBoundingClientRect().bottom : 0);
  t.style.left = clamp(A.left + (A.width - t.offsetWidth) / 2, A.left + 8, A.right - t.offsetWidth - 8) + 'px';
  t.style.top = clamp(top + 8, A.top, A.bottom - t.offsetHeight - 8) + 'px';
}
function toast(text, o = {}) {
  closeToast();
  const sheet = q('#kitSheet:not([hidden])'), host = (o.near && inSheet(o.near) && o.near) || sheet || app();
  if (!host) return null;
  const ov = ovlOf(host); qq('.toast', ov).forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast sh-toast'; t.setAttribute('role', 'status');
  const msg = o.from && WSN[o.from] ? `${WSN[o.from]}：${text}` : text;
  t.innerHTML = `<span>${esc(msg)}</span>${o.action ? `<button class="btn btn-text tbtn sm" data-r="act" type="button">${esc(o.action.label)}</button>` : ''}<button class="btn btn-icon sm" data-r="x" type="button" aria-label="关闭">${ic('x')}</button>`;
  ov.appendChild(t);
  SH.toast = t; SH.toastO = o; placeToast();
  t.addEventListener('click', ev => { const b = ev.target.closest('[data-r]'); if (!b) return; closeToast(); if (b.dataset.r === 'act' && o.action) o.action.fn(); });
  const arm = () => { clearTimeout(SH.toastT); SH.toastT = setTimeout(closeToast, T(o.ms || 12000)); };
  t.addEventListener('mouseenter', () => clearTimeout(SH.toastT));
  t.addEventListener('mouseleave', arm);
  arm();
  logCopy('提示条', t);
  return t;
}
/* 操作处短提示 + 短暂高亮（同样板的撤销反馈） */
function hint(el, text) {
  clearTimeout(SH.hintT); if (SH.hint) { SH.hint.remove(); SH.hint = null; }
  if (el && el.isConnected) { el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash'); setTimeout(() => el.classList.remove('is-flash'), 1000); }
  const anchor = el && el.isConnected && el.getClientRects().length ? el : (mainOf(S.ws) || app()); if (!anchor) return;
  const t = document.createElement('div');
  t.className = 'tip sm hint sh-hint'; t.setAttribute('role', 'status'); t.textContent = text;
  ovlOf(anchor).appendChild(t); placeTip(t, anchor);
  SH.hint = t; SH.hintT = setTimeout(() => { t.remove(); if (SH.hint === t) SH.hint = null; }, 1800);
  logCopy('操作处提示', text);
}
/* 重新授权气泡：文件夹标签下方一次；用到文件夹的按钮旁就地出同一句 */
const bubHTML = name => `<span>浏览器重开后，${esc(name)} 需重新允许访问</span><button class="btn btn-text tbtn sm" data-r="allow" type="button">允许访问</button><button class="btn btn-icon sm" data-r="x" type="button" aria-label="关闭">${ic('x')}</button>`;
/* 气泡（规范第 12 节）：离触发点 8 px，6 px 小三角对着触发点的中线；下面放不下就放上面 */
function placeBub(el, anchor, align) {
  const a = anchor.getBoundingClientRect(), H = hostOf(anchor), w = el.offsetWidth, h = el.offsetHeight;
  let x = align === 'right' ? a.right - w : a.left;
  x = clamp(x, H.left + 8, H.right - w - 8);
  let y = a.bottom + 8, up = false;
  if (y + h > H.bottom - 8) { y = a.top - h - 8; up = true; }
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.classList.toggle('is-up', up);
  el.style.setProperty('--ax', clamp(a.left + a.width / 2 - x - 4, 8, w - 16) + 'px');
}
/* 操作处短提示：同样板的提示框（规范第 12 节）：离触发点 8 px，小三角对着触发点中线；下面放不下放上面 */
function placeTip(el, anchor) {
  placeBub(el, anchor, 'left');
  const up = el.classList.contains('is-up'); el.classList.remove('is-up');
  el.classList.toggle('below', !up); el.classList.toggle('above', up);
}
function closeBub(cancel) {
  if (!SH.bub) return;
  const b = SH.bub; SH.bub = null; b.el.remove();
  if (cancel && b.onX) b.onX();
}
function bubble(anchor, k, o = {}) {
  if (!anchor || !anchor.isConnected) return;
  closeBub(false);
  clearTimeout(SH.hintT); if (SH.hint) { SH.hint.remove(); SH.hint = null; }   /* 同一处的操作提示收掉，不叠在气泡上 */
  const el = document.createElement('div');
  el.className = 'sh-bub'; el.setAttribute('role', 'status'); el.dataset.fk = k;
  el.innerHTML = bubHTML(k === 'exp' ? S.expName : S.bakName);
  ovlOf(anchor).appendChild(el); placeBub(el, anchor, o.align || 'left');
  el.addEventListener('click', ev => {
    const b = ev.target.closest('[data-r]'); if (!b) return;
    if (b.dataset.r === 'allow') { closeBub(false); allowFolder(k, anchor); if (o.onAllow) o.onAllow(); }
    else closeBub(true);
  });
  SH.bub = {el, anchor, sticky: !!o.sticky, onX: o.onX};
  logCopy('气泡', el);
}

/* ---------- 2 状态与数据 ---------- */
const S = {
  ws: 'baker', ue: 'on', exp: 'ok', bak: 'none', br: 'chrome', pv: 'ok',
  expName: 'FWL_Export', bakName: 'FWL_Backup', upd: 2, cd: 12, retrying: false, lastUE: '22:41',
  imp: {sub: '烟花导入', sel: 'cs3c', writing: null, refreshing: false},
  wb: {big: '模板', sub: '基础模板', chip: '全部', q: '', sel: 'kiku', busy: null},
  job: null, pvErr: null, remember: {}
};
const IMGS = {}; let FILM = [];
/* 素材包：交付索引里已有的信息（spec/workspace_resource_v1.md）：rev = 修订编号（revisionId 前 10 位），bv = 导出时的烘焙器版本，
   tt = 回放缩略图取的引擎回放时刻（metadata.thumbnailTime）；资源交付主区放大显示（v3.3 第 17 条），不另加业务功能 */
const PKG = [
  {id: 'cs3c', name: 'Comet 3.0 红头金尾', img: 'cs3c', en: 'Comet30_RedGold', t: '11-04 21:12', pc: 2, mb: 2, st: 'wait', rev: '7c41e0b9d2', bv: '4.9.129', tt: 0.8},
  {id: 'rt6', name: '升空尾缀 RT6', img: 'rt6', en: 'RiseTrail_RT6', t: '11-04 20:05', pc: 3, mb: 1, st: 'wait', rev: '2be85f1a60', bv: '4.9.129', tt: 1.1},
  {id: 'kiku', name: '金曜菊-B 稀簇辉闪', img: 'kiku', en: 'KinyoKiku_B', t: '11-04 19:46', pc: 3, mb: 3, st: 'done', imp: '11-04 19:58', rev: 'e5d0c93a47', bv: '4.9.128', tt: 2.0},
  {id: 'mang', name: '金芒菊 规格', img: 'mang', en: 'KinMang_KM06', t: '11-03 18:40', pc: 6, mb: 3, st: 'done', imp: '11-03 18:52', rev: '91fa3c07be', bv: '4.9.121', tt: 1.6},
  {id: 'cs3s', name: 'Silver 3.0 银白长尾', img: 'cs3s', en: 'Silver30_LongTail', t: '11-02 16:20', pc: 2, mb: 2, st: 'done', imp: '11-02 16:31', rev: '5d28b4e19c', bv: '4.9.118', tt: 0.9}
];
/* 基础模板：rfx = ResourceFX 行名（空 = 未进 UE，副信息写英文名）；gen = 生成预览中；fail = 预览没生成的原因；newVer = 有新版本 */
const mkBT = () => [
  {id: 'kiku', name: '金曜菊-B', img: 'kiku', film: true, cat: '球花', rfx: 'RFX_KinyoKiku_B', en: 'KinyoKiku_B'},
  {id: 'cs3c', name: 'Comet 3.0 红头金尾', img: 'cs3c', cat: '尾缀', rfx: 'RFX_Comet30_RedGold', en: 'Comet30_RedGold'},
  {id: 'cs3s', name: 'Silver 3.0 银白长尾', img: 'cs3s', cat: '尾缀', rfx: '', en: 'Silver30_LongTail'},
  {id: 'mang', name: '金芒菊 规格', img: 'mang', cat: '球花', rfx: 'RFX_KinMang_KM06', en: 'KinMang_KM06', newVer: true},
  {id: 'rt6', name: '升空尾缀 RT6', img: '', cat: '尾缀', rfx: 'RFX_RiseTrail_RT6', en: 'RiseTrail_RT6', gen: true},
  {id: 'spk', name: '仙女棒', img: '', cat: '', rfx: 'RFX_Sparkler_SP01', en: 'Sparkler_SP01', fail: '存储空间不足'},
  {id: 'copy', name: '金曜菊-A 密簇', img: 'kiku', cat: '球花', rfx: '', en: 'KinyoKiku_A', newVer: true}   /* v2.3 第 19 条：不放测试数据 */
];
const BT = mkBT();
const btByName = n => BT.find(r => r.name === n);
const pkgById = id => PKG.find(p => p.id === id);
const readable = () => S.br !== 'other' && S.exp === 'ok';
const pendingN = () => (readable() ? PKG.filter(p => p.st === 'wait').length : 0);
const shortOf = () => { const n = (q('#effName') && q('#effName').textContent.trim()) || '金曜菊-B'; return n.split(' ')[0]; };

/* 逐资产清单：PC 贴图、手机贴图、材质实例、粒子系统；覆盖 3 个（PC 第 3 张贴图（不足 3 张取最后一张）、第一个材质实例、PC 粒子系统） */
function assetsOf(p) {
  const n = p.en, A = [{nm: `T_${n}_Ramp`, ty: '贴图', pl: 'PC、手机', act: '新建'}], ov = Math.min(3, p.pc);
  for (let i = 1; i <= p.pc; i++) A.push({nm: `T_${n}_${pad2(i)}`, ty: '贴图', pl: 'PC', act: i === ov ? '覆盖' : '新建'});
  for (let i = 1; i <= p.mb; i++) A.push({nm: `T_${n}_M_${pad2(i)}`, ty: '贴图', pl: '手机', act: '新建'});
  for (let i = 1; i <= 3; i++) A.push({nm: `MI_${n}_${pad2(i)}`, ty: '材质实例', pl: 'PC、手机', act: i === 1 ? '覆盖' : '新建'});
  A.push({nm: `P_${n}`, ty: '粒子系统', pl: 'PC', act: '覆盖'}, {nm: `P_${n}_M`, ty: '粒子系统', pl: '手机', act: '新建'});
  return A;
}
const thumb = (k, film) => `<div class="th"${film && FILM.length ? ' data-film="1"' : ''}>${IMGS[k] ? `<img src="${IMGS[k]}" alt="">` : ''}</div>`;

/* 显示用的 UE 状态 */
function liveUE() {
  if (S.br === 'other') return {k: 'na'};
  const w = S.imp.writing;
  if (w) return {k: 'write', n: w.i, tot: w.tot, by: 'import'};
  if (S.wb.busy) return {k: 'write', by: 'wb', what: S.wb.busy};
  if (S.ue === 'off') return S.retrying ? {k: 'wait'} : {k: 'off', cd: S.cd};
  return {k: S.ue};
}
const ueBlocked = () => { const k = liveUE().k; return k === 'off' || k === 'wait' || k === 'na'; };
const WHY = {
  br: '仅 Chrome、Edge 能导入',
  brUE: '仅 Chrome、Edge 能连 UE',
  brFold: '仅 Chrome、Edge 能读写文件夹',
  off: 'UE 未连接，GPUECli 启动后自动连上',
  offWB: 'UE 未连接，GPUECli 启动后自动连上',
  wait: 'UE 连接中',
  impW: '导入正在写 UE，写完后可用',
  wbW: '编排正在写 UE，写完后可用',
  noExp: '未选导出文件夹',
  noPkg: '未选素材包'
};
function importWhy() {
  if (S.br === 'other') return WHY.br;
  if (S.exp === 'none') return WHY.noExp;
  const k = liveUE().k;
  if (k === 'off') return WHY.off;
  if (k === 'wait') return WHY.wait;
  if (S.wb.busy) return WHY.wbW;
  if (!S.imp.writing && !pkgById(S.imp.sel)) return WHY.noPkg;
  return '';
}
function wbWhy(v) {
  if (S.br === 'other') return WHY.brUE;
  const k = liveUE().k;
  if (k === 'off') return WHY.offWB;
  if (k === 'wait') return WHY.wait;
  if (S.imp.writing) return WHY.impW;
  if (S.wb.busy && S.wb.busy !== v) return WHY.wbW;
  return '';
}
/* 变灰一律写原因：不用 disabled 属性（悬停要能出原因），用 .is-disabled + aria-disabled */
function setDis(b, why) {
  if (!b) return;
  if (!('tip0' in b.dataset)) b.dataset.tip0 = b.dataset.tip || '';
  b.classList.toggle('is-disabled', !!why);
  if (why) { b.setAttribute('aria-disabled', 'true'); b.dataset.tip = why; }
  else { b.removeAttribute('aria-disabled'); if (b.dataset.tip0) b.dataset.tip = b.dataset.tip0; else delete b.dataset.tip; }
}
const isDis = b => b && b.getAttribute('aria-disabled') === 'true';

/* ---------- 3 外壳顶栏与状态栏左端（宪章 0.9「用户 2026-11-05 15:50 再改」；设计规范 v3 第 11 节；v3.4 改动单第 1–3 条） ----------
   顶栏左：「烟花工坊」+「FireWorksLab 5.0.3 [2]」，点版本号打开更新记录（有未读时后面跟计数框）。
   顶栏右只放三项，组间 24 px、正中 1 px 竖线（高 16）：「● UE 已连接」｜「显卡 · GeForce RTX 5080」｜「编排节目 →」（v3.4 第 3 条，v3.5 第 9、10 条）。
   UE 前面一个 6 px 状态圆点：已连接薄荷、「已连接」主文字色；断开时圆点琥珀，原地「● UE 未连接」+ 命令「重新连接」，不挪到别处（v3.5 第 9 条）。
   导出、备份文件夹在状态栏左端（v3.4 第 1 条）：制作区 #status 里的槽位 #stShell，两页自己的状态栏 .sh-stf；槽位不在时安静跳过。
   「资源交付」不在顶栏（v3.4 第 2 条）：「导出 ▾」菜单第一项 [data-exp=deliv] 打开，计数 #expDelivN 是待导入的包数（0 个时隐藏）。
   再点一次框线亮着的「编排节目」或页面工具行左端「← 返回制作」回到制作 */
const WS = [['baker', '制作', '#wsBaker'], ['import', '资源交付', '#wsImport'], ['wb', '编排节目', '#wsWB']];
const PGN = {import: '资源交付', wb: '编排节目'};
const FOLD = {exp: '导出文件夹', bak: '备份文件夹'}, FOLDK = {exp: '导出', bak: '备份'};
const GPU = 'GeForce RTX 5080';   /* v1 的样板数据；写全名（v3.4 第 3 条）；顶栏前面加弱色「显卡 ·」（v3.5 第 9 条，照用户的参考图） */
const fullPath = name => `D:\\FireWorksLab\\${name}`;
/* 状态：弱色字；只有要处理的（未选、需允许访问）在那个词前面画琥珀圆点、那个词用琥珀（v3.2 第 11 条；v3.4 第 1 条写法「备份 ● 未选」）；
   UE 例外（v3.5 第 9 条）：整项前面一个 6 px 状态圆点，已连接薄荷、「已连接」主文字色；未连接琥珀、「未连接」琥珀；
   进行中（连接中、写入中）圆点的位置换成转圈。data-tone：ok = 正常，warn = 要处理 */
const SPIN = '<span class="spin" aria-hidden="true"></span>';
const retryTip = cd => `${cd == null ? 12 : cd} 秒后自动重新连接`;
function ueHTML(v) {
  const tip = `127.0.0.1:17780　上次连上 ${S.lastUE}`;   /* 一行写完：样板的提示第二行 data-key 只给快捷键 */
  if (v.k === 'wait') return `<span class="sh-stat sh-ue st-cell is-busy" data-tip="127.0.0.1:17780">${SPIN}UE <span class="sh-sv">连接中</span></span>`;
  if (v.k === 'on') return `<span class="sh-stat sh-ue st-cell is-dot" data-tone="ok" data-tip="${tip}">UE <span class="sh-sv is-on">已连接</span></span>`;
  if (v.k === 'off') return `<span class="sh-stat sh-ue st-cell is-dot" data-tone="warn" data-tip="${tip}">UE <span class="sh-sv is-off">未连接</span></span><button class="btn btn-text tbtn sh-retry" data-sh="retry" type="button" data-tip="${retryTip(v.cd)}">重新连接</button>`;
  if (v.k === 'write' && v.by === 'wb') return `<button class="btn btn-text tbtn sh-stat sh-ue st-cell is-write is-busy" data-sh="toWB" type="button" data-tip="打开编排节目">${SPIN}UE <span class="sh-sv">写入中</span></button>`;
  if (v.k === 'write') return `<button class="btn btn-text tbtn sh-stat sh-ue st-cell is-write is-busy" data-sh="toImport" type="button" data-tip="打开资源交付">${SPIN}UE <span class="sh-sv">写入中 <span class="sh-n">${v.n} / ${v.tot}</span></span></button>`;
  return `<span class="sh-stat sh-ue st-cell is-na" data-tip="${WHY.brUE}">UE <span class="sh-sv">不可用</span></span>`;
}
/* 「导出 FWL_Export」「备份 ● 未选」：状态样子（小号弱色字），整项是一个命令（v3.3 第 16 条的点法，v3.4 第 1 条搬到状态栏左端）：
   静止时只是状态；悬停出底色，悬停写点了做什么：
   未选 →「选择备份文件夹」，点了直接选；已选 →「更换导出文件夹」+ 完整路径（名字过长时省略号，路径在这里看全），点开「换文件夹…」；
   需允许访问 →「允许访问导出文件夹」+ 完整路径，点了即允许；不可用 → 停用，悬停写原因。
   已选不画圆点；未选（导出、备份都是）、需允许访问 → 琥珀圆点 + 琥珀词 */
const foldTip = (k, st, name) => st === 'none' ? `选择${FOLD[k]}` : st === 'ok' ? `更换${FOLD[k]}　${fullPath(name)}` : st === 'perm' ? `允许访问${FOLD[k]}　${fullPath(name)}` : WHY.brFold;
function foldHTML(k, st, name) {
  let tone = 'warn', cls = '', v, pop = '';
  if (st === 'none') v = '<span class="sh-sv is-warn">未选</span>';
  else if (st === 'ok') { tone = 'ok'; v = `<span class="sh-sv is-name">${esc(name)}</span>`; pop = ' aria-haspopup="menu" aria-expanded="false"'; }
  else if (st === 'perm') v = `<span class="sh-sv is-name">${esc(name)}</span><span class="sh-sv is-warn">需允许访问</span>`;
  else { tone = ''; cls = ' is-na'; v = '<span class="sh-sv">不可用</span>'; }
  const lab = `${FOLD[k]} ${st === 'none' ? '未选' : st === 'na' ? '不可用' : esc(name)}${st === 'perm' ? ' 需允许访问' : ''}`;
  return `<span class="sh-fp"><button class="btn btn-text tbtn sh-stat sh-fold st-cell${cls}"${tone ? ` data-tone="${tone}"` : ''} data-sh="fold" data-fk="${k}" data-st="${st}" type="button" data-tip="${esc(foldTip(k, st, name))}" aria-label="${lab}"${st === 'na' ? ' aria-disabled="true"' : ''}${pop}><span class="sh-fk">${FOLDK[k]}</span>${v}</button></span>`;
}
/* 状态栏左端的两项（「复制意见」排在它们后面，由制作区摆） */
const stFoldHTML = s => foldHTML('exp', s.exp, s.expName || S.expName) + foldHTML('bak', s.bak, s.bakName || S.bakName);
/* 计数（方框只表示数量，v3.2 第 13 条）：小号数字放在 1 px 方框里，跟在名称后面；悬停写它数的是什么 */
const cntHTML = (n, tip) => `<span class="sh-cnt"${tip ? ` data-tip="${tip}"` : ''}>${n}</span>`;
/* 「编排节目 →」（v3.4 第 3 条；v3.5 第 10 条改名、加框）：进入另一个工作区的入口。1 px 线框，高 28，圆角 2，左右内边距 12；次文字色、正文字号；
   悬停出浮层底色、字亮一级，箭头右移 2 px、变薄荷；打开着编排节目时框线薄荷 + 600（预留 600 的宽度，换字重不挤动顶栏）。
   箭头 = 样板 #i-back 左右翻转（16 px 画布，按 v3.5 第 1 条的规格画） */
function wbEntryHTML(cur, hov) {
  const on = cur === 'wb', t = PGN.wb;
  return `<button class="sh-pg sh-go${hov ? ' is-hover' : ''}" type="button" data-sh="pg" data-pg="wb" aria-pressed="${on}" data-tip="${on ? '返回制作' : `打开${t}`}"><span data-w="${t}">${t}</span><svg class="i sh-arr" aria-hidden="true"><use href="#i-back"/></svg></button>`;
}
function barHTML(s) {
  return `<div class="sh-brand"><b class="tx">烟花工坊</b><button class="sh-ver" data-sh="ver" type="button" aria-haspopup="dialog" aria-expanded="false" data-tip="更新记录"${s.upd ? ` aria-label="FireWorksLab ${VER}，更新记录 ${s.upd} 条没看过"` : ''}>FireWorksLab ${VER}${s.upd ? cntHTML(s.upd, `${s.upd} 条未读更新`) : ''}</button></div><span class="sp"></span>`
    + `<div class="sh-r"><div class="sh-g sh-g-st" role="group" aria-label="UE"><div class="sh-ueg">${ueHTML(s.ueV)}</div></div>`
    + `<div class="sh-g sh-g-gpu"><span class="gpu sh-gpu" aria-label="显卡 ${GPU}"><span class="sh-gk">显卡</span><span class="sh-gd" aria-hidden="true">·</span><span class="sh-gv">${GPU}</span></span></div>`
    + `<div class="sh-g sh-g-pg">${wbEntryHTML(s.ws)}</div></div>`;
}
const liveBar = () => ({ws: S.ws, impN: pendingN(), ueV: liveUE(), exp: S.br === 'other' ? 'na' : S.exp, bak: S.br === 'other' ? 'na' : S.bak, upd: S.upd});
/* 文件夹两项的槽位：制作区状态栏 #stShell（制作区留的），两页状态栏 .sh-stf（外壳自己的） */
const stSlots = () => qq('#stShell, .sh-stf');
/* 当前页面里看得见的那一个文件夹项（制作区槽位不在时为 null，调用方退回别的锚点） */
const foldEl = k => { const w = curWsEl(); return (w && q(`[data-sh="fold"][data-fk="${k}"]`, w)) || q(`#stShell [data-fk="${k}"]`); };
function renderShell() {
  const h = q('#shell'), slots = stSlots();
  const a0 = SH.menu && SH.anchor, keep = a0 && (h && h.contains(a0) || slots.some(x => x.contains(a0))) ? a0.dataset.sh + (a0.dataset.fk || '') : '';
  const L = liveBar();
  if (h) { h.innerHTML = barHTML(L); h.setAttribute('aria-label', '烟花工坊'); }
  slots.forEach(x => { x.innerHTML = stFoldHTML(L); x.setAttribute('role', 'group'); x.setAttribute('aria-label', '文件夹'); x.classList.add('sh-stg'); });
  if (keep) { const a = [h, ...slots].filter(Boolean).flatMap(r => qq('[data-sh]', r)).find(x => x.getClientRects().length && x.dataset.sh + (x.dataset.fk || '') === keep); if (a) { SH.anchor = a; a.setAttribute('aria-expanded', 'true'); } }
  fillDeliv();
}
/* 「导出 ▾」菜单第一项「资源交付」的计数（v3.4 第 2 条）：待导入的包数，0 个时隐藏；菜单每次打开都是新画的，打开时再填一次 */
function fillDeliv() {
  const n = pendingN();
  qq('#expDelivN').forEach(c => { c.textContent = n ? String(n) : ''; c.hidden = !n; c.dataset.tip = n ? `${n} 个素材包待导入` : ''; });
  qq('[data-exp="deliv"]').forEach(b => { if (n) b.setAttribute('aria-label', `资源交付，${n} 个素材包待导入`); else b.removeAttribute('aria-label'); });
}
const curWsEl = () => q((WS.find(w => w[0] === S.ws) || WS[0])[2]);
/* 两页切到哪个才搬进 #app（放在 #wsBaker 后面），没打开的放回 #shParts：
   #app 里只有制作区和当前页，样板按 #app 全屏统计的规则（分段控件、悬停提示字数）不会数到藏着的页面 */
function dock(el, on) {
  const b = q('#wsBaker'), parts = q('#shParts');
  if (!b || el === b || !parts) return;
  if (on && el.parentNode !== b.parentNode) b.after(el);
  else if (!on && el.parentNode !== parts) parts.appendChild(el);
}
/* 打开一页 / 回到制作：只换显示，不丢参数、草稿、选择和滚动（0.4） */
function setWS(ws) {
  if (!WS.some(w => w[0] === ws)) return;
  const changed = S.ws !== ws; S.ws = ws;
  WS.forEach(([k, , sel]) => { const el = q(sel); if (el) { el.hidden = k !== ws; dock(el, k === ws); } });
  qq('#shell [data-sh="pg"]').forEach(t => { const on = t.dataset.pg === ws; t.setAttribute('aria-pressed', String(on)); t.dataset.tip = on ? '返回制作' : `打开${PGN[t.dataset.pg]}`; });
  if (changed) { closeMenu(); closeBub(false); dropTips(); }
  if (ws === 'baker' && changed) window.dispatchEvent(new Event('resize'));
  if (changed) placeToast();
}
/* 更新记录（点版本号）：新内容、各部分版本号（原「关于」并进来）、「全部记录」「复制版本」；打开过就算看过 */
const UPD_LOG = '<ul class="sh-log"><li>合并为烟花工坊</li><li>保存时可放进编排</li></ul>';
const versDL = br => `<dl><dt>制作</dt><dd>烘焙器 4.9.129</dd><dt>资源交付</dt><dd>导入器 v2.31</dd><dt>编排节目</dt><dd>16.0.37</dd><dt>浏览器</dt><dd>${br}</dd><dt>显卡</dt><dd>${GPU}</dd></dl>`;
function verMenu(a) {
  const n = S.upd, br = S.br === 'other' ? 'Firefox 132，不支持' : 'Chrome 131';
  openMenu(a, `<div class="mh">${VER}　${n ? `新内容 ${n} 条` : '更新记录'}</div>${UPD_LOG}<div class="msum sh-vers">${versDL(br)}</div><button class="mi" data-mi="all" type="button">全部记录</button><button class="mi" data-mi="copy" type="button">复制版本</button>`,
    {cls: 'sh-about', role: 'dialog', label: '更新记录', acts: {all: () => hint(a, '样板不打开全部记录'), copy: () => { copyText(`FireWorksLab ${VER}；烘焙器 4.9.129；导入器 v2.31；编排节目 16.0.37；${br}；${GPU}`); hint(q('#shell [data-sh="ver"]'), '已复制版本'); }},
     onClose: () => { if (S.upd) { S.upd = 0; renderShell(); } }});
}
function folderMenu(a, k) {
  const name = k === 'exp' ? S.expName : S.bakName;
  openMenu(a, `<div class="mh">${FOLD[k]}　${esc(fullPath(name))}</div><button class="mi" data-mi="change" type="button">换文件夹…</button>`,
    {acts: {change: () => { const nm = k === 'exp' ? (S.expName === 'FWL_Export' ? 'FWL_Export_2' : 'FWL_Export') : (S.bakName === 'FWL_Backup' ? 'FWL_Backup_2' : 'FWL_Backup'); if (k === 'exp') S.expName = nm; else S.bakName = nm; renderAll(); hint(foldEl(k), `已换成 ${nm}`); }}});
}
function allowFolder(k, anchor) {
  if (k === 'exp') S.exp = 'ok'; else S.bak = 'ok';
  renderAll();
  hint(foldEl(k) || anchor, `已允许访问 ${k === 'exp' ? S.expName : S.bakName}`);
}
function pickFolder(k, anchor) {
  if (k === 'exp') S.exp = 'ok'; else S.bak = 'ok';
  renderAll();
  hint(foldEl(k) || anchor, `已选择 ${k === 'exp' ? S.expName : S.bakName}`);
}
function retryUE() {
  stopT('cd'); stopT('retry');
  if (S.ue !== 'off' || S.br === 'other') return;
  S.retrying = true; renderAll();
  later('retry', () => { S.retrying = false; if (S.ue === 'off') { S.cd = 12; renderAll(); tickCD(); } }, 1200);
}
/* 自动重试的倒计时写在「重新连接」的悬停提示里（顶栏原地只放「UE ● 未连接」和「重新连接」两样） */
function tickCD() {
  later('cd', () => {
    if (S.ue !== 'off' || S.br === 'other' || S.retrying) return;
    S.cd -= 1;
    if (S.cd <= 0) { retryUE(); return; }
    qq('#shell .sh-retry').forEach(c => { c.dataset.tip = retryTip(S.cd); });
    tickCD();
  }, 1000);
}

/* ---------- 4 资源交付（原导入工作区） ---------- */
function pkgHTML(p, sel) {
  const wait = p.st === 'wait';
  return `<div class="lib-item sh-pkg${sel ? ' is-sel' : ''}" role="option" aria-selected="${sel}" tabindex="${sel ? 0 : -1}" data-sh="pkg" data-id="${p.id}">${thumb(p.img)}`
    + `<div class="li-t"><div class="sh-l1"><span class="li-n">${esc(p.name)}</span><span class="st${wait ? ' is-wait' : ''}">${wait ? '待导入' : '已导入'}</span></div>`
    + `<div class="li-s"><span>${p.just ? `刚导出 ${p.t}` : `${p.t} 导出`}</span><span>PC ${p.pc} 张、手机 ${p.mb} 张</span></div></div></div>`;
}
const emptyHTML = (b, s, btn, act) => `<div class="empty"><b>${esc(b)}</b>${s ? `<span>${esc(s)}</span>` : ''}${btn ? `<button class="btn btn-2" data-sh="${act}" type="button">${esc(btn)}</button>` : ''}</div>`;
function sortPkgs() { PKG.sort((a, b) => (b.just ? 1 : 0) - (a.just ? 1 : 0) || (a.st === 'wait' ? 0 : 1) - (b.st === 'wait' ? 0 : 1) || (b.t > a.t ? 1 : b.t < a.t ? -1 : 0)); }
/* 逐资产清单：资产名在第一列，和「资产」标题左对齐；「预检」正常写「通过」弱色字，不再每行一个勾（只标例外，v3.2 第 11 条的做法）；
   最后一列「写入」：写完打勾、正在写转圈，没开始写空着（先预检、再写入，从左往右读） */
function assetTable(p, A, w) {
  const done = p.st === 'done' && !w;
  const rows = A.map((a, i) => {
    const s = w ? (i < w.i ? 'done' : i === w.i ? 'run' : '') : done ? 'done' : '';
    const c0 = s === 'done' ? `<span aria-label="已写入">${ic('check')}</span>` : s === 'run' ? '<span class="spin" aria-label="写入中"></span>' : '';
    return `<tr><td>${esc(a.nm)}</td><td>${a.ty}</td><td>${a.pl}</td><td${a.act === '新建' ? ' class="sh-new"' : ''}>${a.act}</td><td class="sh-path"><i class="sh-ph" style="width:${58 + (i * 37) % 34}%"></i></td><td class="sh-pass">通过</td><td class="sh-wr">${c0}</td></tr>`;
  }).join('');
  return `<table class="sh-at"><thead><tr><th>资产</th><th>类型</th><th>平台</th><th>动作</th><th>UE 路径</th><th>预检</th><th class="sh-wr">写入</th></tr></thead><tbody>${rows}</tbody></table>`;
}
/* 资源交付主区（v3.3 第 17 条）：只用已有的信息排版。
   选中一个包：标题行（包名大号 600 + 右端状态）→ 回放缩略图放大（同制作的「引擎回放」画面，下面小字写取的时刻）+「修订」「检查」两组摘要 →「资产」逐资产清单。
   模块标题中号 600，上空 16、下空 6，靠空白分组（v3.3 第 6 条）；摘要的名称、数值都是中号（名称次文字色、数值主文字色），读数和计数小号。
   没选中：主区中间一行「选一个包查看」。读不到导出文件夹时原因写在左栏，主区不另写 */
const fmtPlat = p => [p.pc ? `PC ${p.pc} 张` : '', p.mb ? `手机 ${p.mb} 张` : ''].filter(Boolean).join('、');
const factsHTML = (t, rows, cls = '') => `<section class="sh-mod${cls}" aria-label="${t}"><h3 class="sh-mt">${t}</h3><dl class="sh-dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></section>`;
function pkgDetailHTML(p, w) {
  const A = assetsOf(p), nOv = A.filter(a => a.act === '覆盖').length;
  const st = w ? `<span class="st"><span class="spin" aria-hidden="true"></span>写入中 ${w.i} / ${w.tot}</span>`
    : p.st === 'done' ? `<span class="st">已导入 ${esc(p.imp || '')}</span>` : '<span class="st is-wait">待导入</span>';
  const im = IMGS[p.img];
  return `<div class="sh-mh"><b>${esc(p.name)}</b>${st}</div>`
    + `<div class="sh-det sb-auto"><div class="sh-hero">`
    + `<figure class="sh-pvw"><div class="sh-pvi${im ? '' : ' is-none'}">${im ? `<img src="${im}" alt="${esc(p.name)} 回放缩略图">` : '<span>回放缩略图没生成</span>'}</div><figcaption class="sh-cap">引擎回放 ${(p.tt || 1).toFixed(2)} s</figcaption></figure>`
    + factsHTML('修订', [['编号', esc(p.rev || '')], ['导出', esc(p.t)], ['烘焙器', esc(p.bv || '')], ['平台', fmtPlat(p)]])
    + factsHTML('检查', [['预检', `通过 ${A.length} / ${A.length}`], ['新建', `${A.length - nOv} 个`], ['覆盖', `${nOv} 个`]])
    + `</div><section class="sh-mod sh-assets" aria-label="资产"><h3 class="sh-mt">资产<span class="cnt">${A.length} 个</span></h3><div class="sh-tblw">${assetTable(p, A, w)}</div></section></div>`;
}
function rfxPH() {
  const r = n => Array.from({length: n}, (_, i) => `<div style="display:flex;gap:24px;align-items:center;height:calc(var(--h-row) + 4px);border-top:1px solid var(--line)"><i class="sh-ph" style="width:18%"></i><i class="sh-ph" style="width:${22 + (i * 13) % 18}%"></i><i class="sh-ph" style="width:12%"></i><i class="sh-ph" style="width:16%"></i></div>`).join('');
  return `<div class="sh-mh" aria-hidden="true"><i class="sh-ph" style="width:160px;height:14px"></i><span class="sp"></span><i class="sh-ph" style="width:220px;height:var(--h-ctl)"></i></div><div style="padding:0 var(--s3)" aria-hidden="true">${r(14)}</div>`;
}
function impMainHTML() {
  if (S.imp.sub === 'ResourceFX 配表') return rfxPH();
  if (!readable()) return '';
  const p = pkgById(S.imp.sel);
  if (!p) return `<div class="sh-none">${emptyHTML('选一个包查看')}</div>`;
  return pkgDetailHTML(p, S.imp.writing && S.imp.writing.pkg === p.id ? S.imp.writing : null);
}
function renderImport() {
  const w = q('#wsImport'); if (!w) return;
  qq('[data-sh="impSub"]', w).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.imp.sub)));
  const go = q('#impGo'), wr = S.imp.writing;
  if (wr) { setDis(go, ''); go.classList.add('is-loading'); go.innerHTML = '<span class="spin" aria-hidden="true"></span>导入中'; }
  else { go.classList.remove('is-loading'); go.textContent = '导入'; setDis(go, importWhy()); }
  const rf = q('#impRefresh');
  setDis(rf, S.br === 'other' ? WHY.brFold : S.exp === 'none' ? WHY.noExp : '');
  rf.classList.toggle('is-loading', S.imp.refreshing);
  q('#impWhy').hidden = !(S.br !== 'other' && S.ue === 'off');
  const rt = q('#impWhy [data-sh="retry"]');
  if (rt) { rt.classList.toggle('is-loading', S.retrying); rt.innerHTML = S.retrying ? '<span class="spin" aria-hidden="true"></span>连接中' : '重新连接'; }
  const fv = q('#impFolder'); fv.textContent = S.br === 'other' ? '导出文件夹不可用' : S.exp === 'none' ? WHY.noExp : S.expName; fv.dataset.tip = S.br !== 'other' && S.exp !== 'none' ? `导出文件夹　${fullPath(S.expName)}` : '';
  const list = q('#impList'), cnt = q('#impCount');
  if (S.br === 'other') { list.innerHTML = emptyHTML(WHY.brFold, '', '复制地址', 'copyUrl'); cnt.textContent = ''; }
  else if (S.exp === 'none') { list.innerHTML = emptyHTML(WHY.noExp, '', '选择…', 'pickExp'); cnt.textContent = ''; }
  else if (S.exp === 'perm') { list.innerHTML = emptyHTML(`浏览器重开后，${S.expName} 需重新允许访问`, '', '允许访问', 'allowExp'); cnt.textContent = ''; }
  else {
    sortPkgs();
    list.innerHTML = PKG.map(p => pkgHTML(p, p.id === S.imp.sel)).join('');
    cnt.textContent = `${PKG.length} 个素材包`;
  }
  q('#impMC').innerHTML = impMainHTML();
}
/* 导入（走查 P9）：点「导入」先用预检结果看要覆盖几个；要备份、备份文件夹又没选好（未选 / 要重新允许）时，
   先问，一个资产都不写；选好才开始写，取消就什么都不写 */
function startImport() {
  const p = pkgById(S.imp.sel); if (!p) return;
  const A = assetsOf(p), nOv = A.filter(a => a.act === '覆盖').length;
  const go = () => { if (S.imp.writing || S.ue !== 'on') return; S.imp.writing = {pkg: p.id, i: 0, tot: A.length, nOv}; renderAll(); later('imp', stepImport, 280); };
  const no = () => toast('已取消，没有写入任何资产', {from: 'import'});
  if (!nOv || S.bak === 'ok') { go(); return; }
  if (S.bak === 'none') askBackup(nOv, go, no);
  else bubble(q('#impGo'), 'bak', {align: 'right', sticky: true, onAllow: go, onX: no});
}
function stepImport() {
  const w = S.imp.writing; if (!w || w.held) return;
  w.i += 1;
  if (w.i >= w.tot) { finishImport(); return; }
  renderAll(); later('imp', stepImport, 280);
}
function finishImport() {
  const w = S.imp.writing, p = w && pkgById(w.pkg); S.imp.writing = null; stopT('imp');
  if (p) { p.st = 'done'; p.imp = hhmm(); p.just = false; }
  renderAll();
  if (p) toast(`已写入 ${w.tot} 个资产${w.nOv ? `，覆盖的 ${w.nOv} 个已备份` : ''}`, {from: 'import', action: {label: '查看', ws: 'import', fn: () => { S.imp.sel = p.id; setWS('import'); renderImport(); }}});
}
function holdImportAt3() {
  const p = pkgById(S.imp.sel) || PKG[0], A = assetsOf(p);
  stopT('imp');
  S.imp.writing = {pkg: p.id, i: Math.max(0, A.findIndex(a => a.act === '覆盖')), tot: A.length, nOv: 0, held: true};
}
function upsertPkg(name, pc, mb) {
  let p = PKG.find(x => x.name === name || x.name.split(' ')[0] === name);
  if (!p) { p = {id: 'p' + Date.now(), name, img: name.startsWith('金曜菊') ? 'kiku' : '', en: 'FX_' + Date.now().toString(36), t: '', pc, mb, st: 'wait', tt: 2}; PKG.push(p); }
  PKG.forEach(x => { x.just = false; });
  /* 每次导出是一个新修订（样板用时间凑一个 10 位编号）；烘焙器版本取当前 */
  const rev = Date.now().toString(16).padStart(10, '0').slice(-10);
  Object.assign(p, {pc: pc || p.pc, mb: mb || p.mb, st: 'wait', t: hhmm(), just: true, rev, bv: '4.9.129'});
  S.imp.sel = p.id;
  return p;
}

/* ---------- 5 编排节目（v3.4 第 3 条由「资源编排」改名「编排工作台」，v3.5 第 10 条再改名「编排节目」） ---------- */
function btStHTML(r) {
  const st = [];
  if (!r.rfx) st.push(`<span class="sh-st warn" data-tip="未配 ResourceFX 行：导演表、UE 里预览不可用">未进 UE</span>`);
  if (r.newVer && !r.gen && !r.fail) st.push(`<span class="sh-st is-new">有新版本<button class="btn btn-text tbtn sh-lnk${r.upd ? ' is-loading' : ''}" data-sh="btUpd" type="button" data-tip="换新预览，引用处同步更新">${r.upd ? '更新中' : '更新'}</button></span>`);
  if (r.gen) st.push('<span class="sh-st"><span class="spin" aria-hidden="true"></span>生成预览中</span>');
  else if (r.fail) st.push(`<span class="sh-st err" data-tip="${esc(r.fail)}">预览没生成<button class="btn btn-text tbtn sh-lnk" data-sh="btRetry" type="button">重试</button></span>`);
  return st.length ? `<div class="sh-btst">${st.join('')}</div>` : '';
}
function btHTML(r, sel) {
  const th = r.img ? thumb(r.img, r.film)
    : r.fail ? `<div class="th sh-thp is-fail" data-tip="${esc(r.fail)}"></div>`
    : r.gen ? '<div class="th sh-thp" aria-label="生成预览中"><span class="spin" aria-hidden="true"></span></div>' : '<div class="th"></div>';
  const sub = r.fail && !r.img ? `<span class="sh-err" data-tip="${esc(r.rfx || r.en)}">${esc(r.fail)}</span>` : `<span>${esc(r.rfx || r.en)}</span>`;
  return `<div class="lib-item sh-bt${sel ? ' is-sel' : ''}" role="option" aria-selected="${sel}" tabindex="${sel ? 0 : -1}" data-sh="bt" data-id="${r.id}">${th}<div class="li-t"><div class="li-n">${esc(r.name)}</div><div class="li-s">${sub}</div></div>${btStHTML(r)}</div>`;
}
const phRows = n => Array.from({length: n}, (_, i) => `<div class="sh-phrow" aria-hidden="true"><i class="sh-ph"></i><div><i class="sh-ph" style="width:${52 + (i * 19) % 30}%"></i><i class="sh-ph" style="width:${30 + (i * 11) % 20}%;height:8px"></i></div></div>`).join('');
function btFiltered() {
  const qv = S.wb.q.trim();
  return BT.filter(r => (S.wb.chip === '全部' || r.cat === S.wb.chip) && (!qv || [r.name, r.rfx, r.en].some(x => x && x.includes(qv))));
}
function renderWB() {
  const w = q('#wsWB'); if (!w) return;
  qq('[data-sh="wbUE"]', w).forEach(b => {
    const busy = S.wb.busy === b.dataset.v;
    setDis(b, busy ? '' : wbWhy(b.dataset.v));
    b.classList.toggle('is-loading', busy);
    b.innerHTML = busy ? `<span class="spin" aria-hidden="true"></span>${esc(b.dataset.v)}` : esc(b.dataset.v);
  });
  qq('#wbBig .tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.v === S.wb.big)));
  q('#wbSub').hidden = S.wb.big !== '模板';
  qq('#wbSub .tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.v === S.wb.sub)));
  qq('#wbChips button').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.v === S.wb.chip)));
  const inp = q('#wbQ input'); if (inp && inp.value !== S.wb.q) inp.value = S.wb.q;
  q('#wbQ').classList.toggle('has-val', !!S.wb.q);
  const list = q('#wbList');
  if (S.wb.big === '模板' && S.wb.sub === '基础模板') {
    const rows = btFiltered();
    list.innerHTML = rows.length ? rows.map(r => btHTML(r, r.id === S.wb.sel)).join('')
      : emptyHTML(S.wb.q ? `没有找到「${S.wb.q}」` : `没有「${S.wb.chip}」基础模板`, '', S.wb.q ? '清除搜索' : '显示全部', 'wbAll');
  } else list.innerHTML = phRows(7);
}
function startWBWrite(v, btn) {
  S.wb.busy = v; renderAll();
  later('wb', () => { S.wb.busy = null; renderAll(); const b = qq('#wbTool [data-sh="wbUE"]').find(x => x.dataset.v === v); hint(b, v === 'UE 里预览' ? '已在 UE 里播放' : `已写入 UE：${v}`); }, 2400);
}
function revealBT(name) {
  const r = btByName(name); if (!r) return;
  Object.assign(S.wb, {big: '模板', sub: '基础模板', chip: '全部', q: '', sel: r.id});
  setWS('wb'); renderWB();
  const el = q(`#wbList [data-id="${r.id}"]`);
  if (el) { el.scrollIntoView({block: 'nearest'}); el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash'); setTimeout(() => el.classList.remove('is-flash'), 1000); el.focus({preventScroll: true}); }
}
function updateBT(r, el, rerender) {
  if (r.upd) return;
  r.upd = true; rerender();
  setTimeout(() => { r.upd = false; r.newVer = false; rerender(); hint(el && el.isConnected ? el : null, `已换新预览：${r.name}`); }, T(1200));
}
function retryBT(r, rerender, outcome) {
  r.fail = null; r.gen = true; rerender();
  setTimeout(() => { r.gen = false; if ((outcome || S.pv) === 'ok') { r.img = r.img0 || r.img || ''; if (!r.img) r.img = 'spk'; } else r.fail = '存储空间不足'; rerender(); }, T(2000));
}

/* ---------- 6 编排预览（状态栏）与另存 ---------- */
const PCT = [6, 14, 23, 31, 38, 47, 58, 69, 80, 91, 100];
function pvHTML(job, err) {
  if (job) return `<span class="sh-pv" role="status"><span class="spin" aria-hidden="true"></span><span>生成编排预览 <span class="sh-pvn">${job.pct}%</span></span><button class="btn btn-text tbtn sm" data-sh="pvCancel" type="button">取消</button></span>`;
  if (err) return `<span class="sh-pv is-err" role="alert"><span>编排预览没生成：${esc(err.why || '存储空间不足')}</span><span class="sh-pvk">${err.src === 'export' ? '已导出' : '效果已保存'}</span><button class="btn btn-text tbtn sm" data-sh="pvRetry" type="button">重试</button><button class="btn btn-text tbtn sm lnk" data-sh="pvMore" type="button" aria-haspopup="menu" aria-expanded="false">详情</button><button class="btn btn-icon sm" data-sh="pvX" type="button" aria-label="关掉这条">${ic('x')}</button></span>`;
  return '';
}
function renderPV() {
  const h = pvHTML(S.job, S.pvErr);
  qq('#sbPreview, #wsImport [data-pvm], #wsWB [data-pvm]').forEach(e => { if (e.innerHTML !== h) e.innerHTML = h; });
}
function startPreview(name, src, img) {
  stopT('pv'); S.pvErr = null;
  if (S.job) { const j = S.job; S.job = null; j.row.gen = false; }
  let r = btByName(name); const isNew = !r || !r.img;   /* 上次没生成成功的那一行（还没有预览）也算第一次放进编排 */
  if (!r) { r = {id: 'b' + Date.now(), name, img: '', img0: img || '', film: img === 'kiku', cat: '球花', rfx: '', en: enName(name)}; BT.unshift(r); }
  const prev = {gen: r.gen, fail: r.fail, newVer: r.newVer};
  r.gen = true; r.fail = null;
  S.job = {name, src, pct: PCT[0], k: 0, row: r, isNew, prev};
  renderAll();
  const step = () => {
    const j = S.job; if (!j) return;
    j.k += 1; j.pct = PCT[Math.min(j.k, PCT.length - 1)];
    if (j.k >= PCT.length - 1) { finishPreview(); return; }
    renderPV(); later('pv', step, 360);
  };
  later('pv', step, 360);
}
/* 没勾「放进编排」、这个效果又已经在编排里：编排里那一项标「有新版本　更新」，由用户决定换不换 */
function markNewVer(name) { const r = btByName(name); if (r && !r.gen) { r.newVer = true; renderWB(); } }
function enName(name) {
  if (name.startsWith('金曜菊-B')) return 'KinyoKiku_B' + (name.includes('副本') ? '_Copy' : '');
  return 'FX_' + Date.now().toString(36).slice(-5);
}
function finishPreview() {
  const j = S.job; S.job = null; stopT('pv'); if (!j) return;
  const r = j.row; r.gen = false;
  if (S.pv === 'ok') {
    r.fail = null;
    /* 勾了「放进编排」（走查 P4）：第一次新增；已在编排里的直接换成新预览，不再标「有新版本」、不用点「更新」 */
    if (j.isNew) r.img = r.img0 || 'kiku'; else { r.img = r.img || r.img0 || 'kiku'; r.newVer = false; }
    S.pvErr = null; renderAll();
    toast(`${j.isNew ? '已放进编排' : '已更新编排'}：${j.name}`, {ms: 10000, action: {label: '去编排看', ws: 'wb', fn: () => revealBT(j.name)}});
  } else {
    r.fail = '存储空间不足';
    S.pvErr = {name: j.name, src: j.src, why: '存储空间不足'};
    renderAll();
  }
}
function cancelPreview() {
  const j = S.job; if (!j) return;
  S.job = null; stopT('pv');
  if (j.isNew) { const i = BT.indexOf(j.row); if (i >= 0) BT.splice(i, 1); } else Object.assign(j.row, j.prev);
  renderAll();
  hint(q('#saveSt') || curWsEl(), `已取消编排预览，${j.src === 'export' ? '已导出' : '效果已保存'}`);
}
function pvMoreMenu(a) {
  const e = S.pvErr; if (!e) return;
  openMenu(a, `<div class="msum"><b>编排预览没生成：${esc(e.name)}</b><dl><dt>原因</dt><dd>存储已用 4.8 / 5 GB</dd><dt>${e.src === 'export' ? '导出' : '效果'}</dt><dd>${e.src === 'export' ? '已导出' : '已保存'}</dd></dl></div><button class="mi" data-mi="retry" type="button">重试</button><button class="mi" data-mi="wb" type="button">去编排看</button>`,
    {align: 'center', acts: {retry: () => startPreview(e.name, e.src), wb: () => revealBT(e.name)}});
}
const saveExtra = (name, chk) => `<label class="sh-fl"><span class="lbl sh-lab">名称</span><span class="field"><input type="text" value="${esc(name)}" aria-label="名称" maxlength="40"></span></label>`
  + `<label class="ckl sh-opt"><input class="chk" type="checkbox" data-sh="saveWB"${chk ? ' checked' : ''}><span>同时放进编排</span></label><p class="sh-optd">第一次新增，之后直接更新编排里的这一项。生成预览约 10 秒。未配 ResourceFX 行的先用英文名，标「未进 UE」。</p>`;
function openSaveDialog(o = {}) {
  const name0 = `${shortOf()} 副本`;
  const chk0 = name0 in S.remember ? S.remember[name0] : !!btByName(name0);   /* 第一次不勾；已放进编排的默认勾上，按效果记住（待裁决 4） */
  const names = qq('#libList .lib-item .li-n').map(e => e.textContent.trim());
  return openDlg({id: 'save', title: '另存', extra: saveExtra(name0, chk0), ok: '保存', cancel: '取消', focus: 'input[type=text]', host: o.host,
    check: (d, me) => {
      const inp = q('input[type=text]', d), v = inp.value.trim(), f = inp.closest('.field');
      const err = !v ? '名称为空' : names.includes(v) ? '已有同名效果' : '';
      f.classList.toggle('is-error', !!err); dlgErr(d, err);
      if (err) { inp.focus(); return false; }
      me.val = {name: v, wb: q('[data-sh="saveWB"]', d).checked};
      return true;
    },
    onOk: v => {
      if (o.onOk) { o.onOk(v); return; }
      S.remember[v.name] = v.wb;
      hint(q('#saveSt'), `已另存「${v.name}」 ${hhmm()}`);
      if (v.wb) startPreview(v.name, 'save', 'kiku'); else markNewVer(v.name);
    }});
}

/* ---------- 7 首次使用 ---------- */
const DLG = {
  exp: {title: '选择导出文件夹', body: '导出的贴图和配置写在这里。导入和编排也从这里读取。之后自动记住。', ok: '选择…', cancel: '取消'},
  bak: n => ({title: '覆盖前选择备份位置', body: `将覆盖 UE 里已有的 ${n} 个资产，原文件存为 .uasset.bak。<b>备份位置不能在 UE 工程里。</b>`, ok: '选择…', cancel: '取消导入', kit: '模拟误选'}),
  bakErr: 'FX_Backup 在 UE 工程里，不能用',
  br: {title: '仅支持 Chrome、Edge', body: '此浏览器不能读写文件夹，也连不上 UE。导出、导入不可用，制作和编排可查看。', ok: '复制地址', cancel: '继续查看'}
};
function askExpFolder(then, o = {}) {
  openDlg(Object.assign({id: 'exp', host: o.host}, DLG.exp, {
    onOk: () => { if (!o.host) pickFolder('exp'); if (then) then(); },
    onCancel: () => { if (o.cancelMsg) hint(o.cancelAt || curWsEl(), o.cancelMsg); }
  }));
}
function askBackup(n, then, cancel, host) {
  openDlg(Object.assign({id: 'bak', host}, DLG.bak(n), {
    onKit: d => dlgErr(d, DLG.bakErr),
    onOk: () => { if (!host) { S.bak = 'ok'; renderAll(); hint(foldEl('bak'), `已选择 ${S.bakName}`); } if (then) then(); },
    onCancel: () => { if (cancel) cancel(); }
  }));
}
function copyText(s) { try { const p = navigator.clipboard && navigator.clipboard.writeText(s); if (p && p.catch) p.catch(() => {}); } catch (e) { /* 剪贴板不可用时不提示错误 */ } }
function askBrowser(host) {
  openDlg(Object.assign({id: 'br', host}, DLG.br, {
    onOk: () => { copyText(location.href); hint(host || q('#shell [data-sh="ver"]'), '已复制地址'); }
  }));
}

/* 导出：外壳的事。导出前检查文件夹（第一次没选 → 对话框；要重新授权 → 按钮旁就地一句；浏览器不支持 → 变灰写原因） */
function exportEntry(t) {
  const btn = t.closest('#expBtn [data-act="export"], #deliv [data-act="exportChecked"]');
  if (btn) return {el: btn, anchor: btn.closest('#expBtn') || btn, replay: () => { const b = q(btn.matches('#expBtn *') ? '#expBtn [data-act="export"]' : '#deliv [data-act="exportChecked"]'); if (b) b.click(); }};
  const mi = t.closest('.menu .mi[data-i]'), m = mi && mi.closest('.menu');
  if (mi && m.querySelector('#expAlsoWB') && mi.dataset.exp !== 'deliv' && (mi.dataset.exp || /^(只|重新)?导出/.test(mi.textContent.trim()))) {   /* 「资源交付」不是导出，不拦 */   /* 样板 v2.2 起导出项带 data-exp */
    const i = mi.dataset.i;
    return {el: mi, anchor: q('#expBtn'), menu: true, replay: () => { if (window.KIT && window.KIT.openExport) window.KIT.openExport(); const b = q(`.menu .mi[data-i="${i}"]`); if (b) b.click(); }};
  }
  return null;
}
function patchExport() {
  const why = S.br === 'other' ? WHY.brFold : '';
  qq('#expBtn .btn, #deliv [data-act="exportChecked"]').forEach(b => {
    if (why) { if (!('tip0' in b.dataset)) b.dataset.tip0 = b.dataset.tip || ''; b.classList.add('is-disabled'); b.setAttribute('aria-disabled', 'true'); b.dataset.tip = why; }
    else if ('tip0' in b.dataset) { b.classList.remove('is-disabled'); b.removeAttribute('aria-disabled'); if (b.dataset.tip0) b.dataset.tip = b.dataset.tip0; else delete b.dataset.tip; delete b.dataset.tip0; }
  });
}

/* 样板调用：导出写完并核对后（③） */
window.shellAfterExport = (a = {}) => {
  const name = a.name || shortOf();
  const go = () => {
    const ov = q('#ovlApp'); if (ov) qq('.toast', ov).forEach(t => t.remove());   /* 样板在制作区出的「已导出」提示收掉，换成导入区这一条 */
    upsertPkg(name, a.pc, a.mobile);
    S.remember[name] = !!a.alsoWB;
    setWS('import'); renderAll();
    const row = q(`#impList [data-id="${S.imp.sel}"]`); if (row) row.scrollIntoView({block: 'nearest'});
    /* 同样板的「已导出」提示条：一两层写层名，再多写效果名；没导出的平台不写 */
    const L = Array.isArray(a.layers) ? a.layers : [], who = L.length && L.length <= 2 ? L.join('、') : name;
    const what = [a.pc ? `PC ${a.pc} 张` : '', a.mobile ? `手机 ${a.mobile} 张` : ''].filter(Boolean).join('、');
    toast(`已导出 ${who}，${what}`, {from: 'baker', action: {label: '返回制作', ws: 'baker', fn: () => setWS('baker')}});
    if (a.alsoWB) startPreview(name, 'export', 'kiku'); else markNewVer(name);
  };
  if (S.br === 'other') return;
  if (S.exp === 'none') { askExpFolder(go); return; }   /* 正常走不到：导出前已经问过 */
  go();
};
window.openSaveDialog = () => { openSaveDialog(); };
/* 「导出 ▾」菜单第一项「资源交付」（v3.4 第 2 条，制作区画 [data-exp=deliv]）：点了打开资源交付页。样板的菜单照常收起（它的点击在冒泡阶段），
   这里只在冒泡阶段之后换页；键盘 Enter 也是一次 click。制作区也可以直接调 window.shellOpenDelivery() */
const openDeliv = () => { setWS('import'); renderAll(); const row = q(`#impList [data-id="${S.imp.sel}"]`); if (row) row.scrollIntoView({block: 'nearest'}); };
window.shellOpenDelivery = openDeliv;
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-exp="deliv"]');
  if (!b || b.disabled || isDis(b) || inSheet(b)) return;
  setTimeout(() => { if (S.ws !== 'import') openDeliv(); }, 0);
});
/* 样板调用：提示条进外壳提示区（顶栏下方、当前页面顶部居中）；o 同外壳的 toast：{action: {label, fn, ws}, from, ms} */
window.shellToast = (text, o = {}) => toast(text, o);
/* 样板调用：导出摘要里写的导出文件夹名 */
window.shellExportFolderName = () => (S.br === 'other' ? '不可用' : S.exp === 'none' ? '未选' : S.expName);
/* 样板调用：导出面板里「换文件夹」。同点状态栏左端的导出文件夹项：未选 → 选文件夹；已选 → 标签下面出「换一个文件夹」菜单；要重新授权 → 允许访问 */
window.shellPickExportFolder = () => {
  const a = foldEl('exp');
  if (S.br === 'other') { hint(a || q('#expBtn'), WHY.brFold); return; }
  if (S.exp === 'none') { pickFolder('exp', a); return; }
  if (S.exp === 'perm') { closeBub(false); allowFolder('exp', a); return; }
  if (a) setTimeout(() => folderMenu(a, 'exp'), 0);   /* 等调用方的菜单先收起、这次点击结束，再打开 */
};

/* ---------- 8 样板开关 ---------- */
function setKit(k, v) {
  closeMenu(); closeBub(false);
  if (k === 'ue') {
    stopT('cd'); stopT('retry'); S.retrying = false;
    if (v === 'write') { if (!S.imp.writing) holdImportAt3(); S.ue = 'on'; }
    else {
      const w = S.imp.writing;
      if (w && (w.held || v !== 'on')) { stopT('imp'); S.imp.writing = null; if (!w.held) toast(`UE 断开，写到 ${w.i} / ${w.tot} 中断`, {from: 'import'}); }
      S.ue = v;
      if (v === 'off') { S.cd = 12; tickCD(); }
    }
  }
  if (k === 'exp') S.exp = v;
  if (k === 'bak') S.bak = v;
  if (k === 'br') { S.br = v; if (v === 'other') { stopT('imp'); S.imp.writing = null; S.wb.busy = null; stopT('cd'); } else if (S.ue === 'off') { S.cd = 12; tickCD(); } }
  if (k === 'pv') S.pv = v;
  renderAll();
  if ((k === 'exp' || k === 'bak') && v === 'perm' && S.br !== 'other') { const f = foldEl(k); if (f) bubble(f, k); }
  if (k === 'br' && v === 'other') askBrowser();
}
function syncKit() {
  const v = {ue: S.imp.writing ? 'write' : S.ue, exp: S.exp, bak: S.bak, br: S.br, pv: S.pv};
  qq('#shKit select[data-shk]').forEach(s => { if (s.value !== v[s.dataset.shk]) s.value = v[s.dataset.shk]; });
}
function renderAll() { renderShell(); renderImport(); renderWB(); renderPV(); patchExport(); syncKit(); }

/* ---------- 9 事件 ---------- */
/* 导出入口：捕获阶段先看文件夹（样板的导出在冒泡阶段执行） */
document.addEventListener('click', e => {
  if (SH.replay || !e.target.closest) return;
  const x = exportEntry(e.target); if (!x) return;
  if (S.br === 'other') { e.stopPropagation(); e.preventDefault(); hint(x.anchor || x.el, WHY.brFold); return; }
  if (S.exp === 'ok') return;
  e.stopPropagation(); e.preventDefault();
  const replay = () => { SH.replay = true; try { x.replay(); } finally { SH.replay = false; } };
  if (x.menu) document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));   /* 先收起样板的导出菜单 */
  if (S.exp === 'none') askExpFolder(replay, {cancelMsg: '未导出：未选导出文件夹', cancelAt: q('#expBtn')});
  else bubble(x.anchor, 'exp', {align: 'right', onAllow: replay});
}, true);

/* 直接保存（不弹对话框）：按这个效果记住的勾选执行（待裁决 3） */
function afterDirectSave() { const n = shortOf(); setTimeout(() => (S.remember[n] ? startPreview(n, 'save', 'kiku') : markNewVer(n)), 0); }
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#toolRow [data-act="save"]')) afterDirectSave(); });
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && S.ws === 'baker' && !SH.dlg && !(e.target.matches && e.target.matches('textarea, input[type=search], .ren, .field input')) && !(q('#kitMain') && q('#kitMain').hidden)) afterDirectSave();
});

/* 切到导入 / 编排时，制作区的单键快捷键不作用到看不见的画面（切换只换显示） */
document.addEventListener('keydown', e => {
  if (S.ws === 'baker' || SH.dlg || !q('#wsBaker') || (q('#kitMain') && q('#kitMain').hidden)) return;
  const t = e.target;
  if (t.closest && t.closest('.tab, .seg, .menu, input, textarea, select, .field, .sh-bub, .dialog')) return;
  const k = e.key, mod = e.ctrlKey || e.metaKey;
  const block = mod ? /^[zys]$/i.test(k) : [' ', 'r', 'R', 's', 'S', 'h', 'H', 'f', 'F', 'l', 'L', 'p', 'P', '[', ']', '?', 'ArrowLeft', 'ArrowRight', 'Delete', 'Backspace', 'F2'].includes(k);
  if (block) { e.stopPropagation(); if (mod) e.preventDefault(); }
}, true);

document.addEventListener('pointerdown', e => {
  if (SH.menu && !SH.menu.contains(e.target) && !(SH.anchor && SH.anchor.contains(e.target))) closeMenu();
  if (SH.bub && !SH.bub.sticky && !SH.bub.el.contains(e.target) && !(SH.bub.anchor && SH.bub.anchor.contains(e.target))) closeBub(false);
});

/* 外壳的点击：只处理产品区里的；全表的静态样子不响应，可操作实例另行处理 */
document.addEventListener('click', e => {
  const t = e.target; if (!t.closest) return;
  const live = t.closest('[data-shlive]'); if (live) { sheetLive(live, t, e); return; }
  const demo = t.closest('[data-shdemo]'); if (demo) { sheetDemo(demo); return; }
  const a = t.closest('[data-sh]'); if (!a || !a.closest('#app')) return;
  if (isDis(a)) return;
  const act = a.dataset.sh;
  const A = {
    pg: () => setWS(S.ws === a.dataset.pg ? 'baker' : a.dataset.pg),   /* 再点一次亮着的标签 = 回到制作 */
    back: () => setWS('baker'),
    ver: () => (SH.menu && SH.anchor === a ? closeMenu() : verMenu(a)),
    retry: () => retryUE(),
    toImport: () => setWS('import'),
    toWB: () => setWS('wb'),
    fold: () => {
      const k = a.dataset.fk, st = a.dataset.st;
      if (st === 'none') pickFolder(k, a);   /* 未选：点了直接选文件夹（浏览器的选文件夹窗口） */
      else if (st === 'perm') { closeBub(false); allowFolder(k, a); }
      else if (st === 'ok') { if (SH.menu && SH.anchor === a) closeMenu(); else folderMenu(a, k); }
    },
    impSub: () => { S.imp.sub = a.dataset.v; renderImport(); },
    impRefresh: () => {
      if (S.exp === 'perm') { bubble(a, 'exp', {align: 'right'}); return; }
      S.imp.refreshing = true; renderImport();
      later('rf', () => { S.imp.refreshing = false; renderImport(); hint(q('#impRefresh'), `已刷新：${PKG.length} 个素材包`); }, 600);
    },
    impGo: () => {
      if (S.imp.writing) { setWS('import'); return; }
      if (S.exp === 'perm') { bubble(a, 'exp', {align: 'right'}); return; }
      startImport();
    },
    pkg: () => { if (S.imp.sel !== a.dataset.id) { S.imp.sel = a.dataset.id; renderImport(); renderShell(); const r = q(`#impList [data-id="${a.dataset.id}"]`); if (r) r.focus({preventScroll: true}); } },
    pickExp: () => pickFolder('exp', a),
    allowExp: () => allowFolder('exp', a),
    copyUrl: () => { copyText(location.href); hint(a, '已复制地址'); },
    wbUE: () => startWBWrite(a.dataset.v, a),
    wbBig: () => { S.wb.big = a.dataset.v; renderWB(); },
    wbSub: () => { S.wb.sub = a.dataset.v; renderWB(); },
    wbChip: () => { S.wb.chip = a.dataset.v; renderWB(); },
    wbAll: () => { S.wb.q = ''; S.wb.chip = '全部'; renderWB(); },
    wbNew: () => hint(a, '基础模板由制作的保存、导出生成'),
    bt: () => { if (t.closest('[data-sh="btUpd"], [data-sh="btRetry"]')) return; S.wb.sel = a.dataset.id; renderWB(); const r = q(`#wbList [data-id="${a.dataset.id}"]`); if (r) r.focus({preventScroll: true}); },
    btUpd: () => { const id = a.closest('[data-id]').dataset.id, r = BT.find(x => x.id === id); updateBT(r, a.closest('.lib-item'), () => { renderWB(); }); },
    btRetry: () => { const id = a.closest('[data-id]').dataset.id, r = BT.find(x => x.id === id); retryBT(r, () => renderWB()); },
    pvCancel: () => cancelPreview(),
    pvRetry: () => { const er = S.pvErr; if (er) startPreview(er.name, er.src); },
    pvMore: () => (SH.menu && SH.anchor === a ? closeMenu() : pvMoreMenu(a)),
    pvX: () => { S.pvErr = null; renderPV(); }
  };
  if (A[act]) { e.stopPropagation(); A[act](); }
});
/* 列表的键盘：↑ ↓ 换行、Enter 选中；先于样板的全局键盘处理（样板按效果库行理解 .lib-item） */
function listKeys(e) {
  const t = e.target; if (!t.classList || !t.classList.contains('lib-item')) return;
  if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) return;
  e.stopPropagation(); e.preventDefault();
  if (e.key === 'Enter' || e.key === ' ') { t.click(); return; }
  const box = t.parentElement, its = qq('.lib-item', box), j = its.indexOf(t), nx = its[clamp(j + (e.key === 'ArrowDown' ? 1 : -1), 0, its.length - 1)];
  if (nx && nx !== t) { const id = nx.dataset.id; nx.click(); const f = box.isConnected && q(`[data-id="${id}"]`, box); if (f) f.focus(); }   /* 点了会重画列表，按 id 重新找 */
}
document.addEventListener('input', e => {
  const t = e.target;
  if (t.closest && t.closest('#wbQ')) { S.wb.q = t.value; renderWB(); }
});
document.addEventListener('change', e => {
  const s = e.target; if (!s.matches || !s.matches('#shKit select[data-shk]')) return;
  setKit(s.dataset.shk, s.value);
});
/* 缩略图悬停播放（来自制作的真实效果；样板只有金曜菊-B 的帧） */
let filmT = 0, filmEl = null;
document.addEventListener('pointerover', e => {
  const th = e.target.closest && e.target.closest('.th[data-film]');
  if (th === filmEl) return;
  if (filmEl) { clearInterval(filmT); const im = q('img', filmEl); if (im && im.dataset.src0) im.src = im.dataset.src0; filmEl = null; }
  if (!th || !FILM.length) return;
  const im = q('img', th); if (!im) return;
  filmEl = th; im.dataset.src0 = im.dataset.src0 || im.src; let i = 0;
  filmT = setInterval(() => { if (!im.isConnected) { clearInterval(filmT); filmEl = null; return; } im.src = FILM[i++ % FILM.length]; }, 80);
});

/* ---------- 10 全表「外壳与 5.0 入口」 ---------- */
const tbl = (cols, rows) => `<table class="ks-t"><thead><tr><th></th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(([lab, cells]) => `<tr><th scope="row">${lab}</th>${cells.map((c, i) => `<td${i === cells.length - 1 ? ' class="live"' : ''}>${c == null ? '<span class="na">—</span>' : c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const blk = (h, sub, body, c = '') => `<div class="ks-blk"${c ? ` style="${c}"` : ''}><h3>${h}<span>${sub}</span></h3>${body}</div>`;
const demoBtn = (id, t) => `<button class="btn btn-2 sm" data-shdemo="${id}" type="button" style="margin-top:8px">${t}</button>`;
const staticBar = (s, cls = '') => `<div class="sh-sbar${cls}"><header class="shell sh-static">${barHTML(s)}</header></div>`;
const LBT = mkBT();   /* 全表可操作列表自己的一份 */
const sheetPV = {job: null, err: null, out: 'ok'};
function sheetHTML() {
  const B = (ueV, o) => Object.assign({ws: 'baker', impN: 2, ueV, exp: 'ok', bak: 'none', upd: 2}, o);
  const bars = [
    ['UE 连接中（转圈在圆点的位置）　「显卡 · GeForce RTX 5080」　「编排节目 →」线框　版本号后面的 [2] = 未读更新条数', B({k: 'wait'})],
    ['UE 已连接：薄荷圆点、「已连接」主文字色　打开着「编排节目」：框线薄荷 + 600　更新记录都看过', B({k: 'on'}, {ws: 'wb', upd: 0})],
    ['UE 未连接：圆点琥珀，原地「UE 未连接」+ 命令「重新连接」；自动重试的倒计时写在「重新连接」的悬停提示里', B({k: 'off', cd: 12})],
    ['UE 写入中 3 / 12，点一下打开资源交付（资源交付页不在顶栏，顶栏入口不亮）', B({k: 'write', n: 3, tot: 12, by: 'import'}, {ws: 'import'})]
  ];
  const b1366 = [
    ['1366：最长的组合，UE 未连接 + 重新连接', B({k: 'off', cd: 12})],
    ['1366：Chrome、Edge 以外的浏览器；UE 不可用', B({k: 'na'}, {impN: 0, exp: 'na', bak: 'na'})]
  ];
  /* 状态栏左端（v3.4 第 1 条）：导出、备份两项，「复制意见」排在后面 */
  const stBar = (s, cls = '') => `<footer class="status sh-sstat sh-sstl${cls}"><div class="st-l"><span class="sh-stg" role="group" aria-label="文件夹">${stFoldHTML(s)}</span><button class="btn tbtn" type="button">复制意见</button></div><div class="st-r"><button class="btn btn-text tbtn sm" type="button">已保存 20:31</button></div></footer>`;
  const stBars = [
    ['导出已选（正常：不画圆点）　备份未选：「备份 ● 未选」，琥珀点 + 琥珀词', B(null, {})],
    ['导出未选：点这一项直接选文件夹　备份已选', B(null, {exp: 'none', bak: 'ok'})],
    ['都需允许访问：点一下即允许', B(null, {exp: 'perm', bak: 'perm'})],
    ['很长的文件夹名：截断加省略号，悬停看完整路径', B(null, {exp: 'ok', bak: 'perm', expName: 'Export_NewYear_2026_Final_Review', bakName: 'Backup_NewYear_2026_Final_Review'})],
    ['Chrome、Edge 以外的浏览器：两项都写「不可用」', B(null, {exp: 'na', bak: 'na'})]
  ];
  const stHTML = `<div class="sh-sbars" id="shSheetSt">${stBars.map(([c, s]) => `<div><span class="ks-cap">${c}</span>${stBar(s)}</div>`).join('')}</div>`;
  const barsHTML = `<div class="sh-sbars" id="shSheetBars">${bars.map(([c, s]) => `<div><span class="ks-cap">${c}</span>${staticBar(s)}</div>`).join('')}</div>`
    + `<div class="sh-sbars" id="shSheetBars1366" style="margin-top:20px">${b1366.map(([c, s]) => `<div><span class="ks-cap">${c}</span>${staticBar(s, ' s1366')}</div>`).join('')}</div>`;

  const ue = v => `<div class="sh-ueg">${ueHTML(v)}</div>`;
  const ueT = tbl(['连接中', '已连接', '未连接', '写入中', '不可用：其他浏览器', '可操作：点状态换下一种'],
    [['UE 状态', [ue({k: 'wait'}), ue({k: 'on'}), ue({k: 'off', cd: 12}) + `<span class="sh-cell-n">「重新连接」悬停：${retryTip(12)}</span>`, ue({k: 'write', n: 3, tot: 12, by: 'import'}) + '<span class="sh-cell-n">编排写时只写「UE 写入中」</span>', ue({k: 'na'}), `<div data-shlive="ue" data-st="on">${ue({k: 'on'})}</div>`]]]);
  const fo = (k, st, nm) => foldHTML(k, st, nm || (k === 'exp' ? 'FWL_Export' : 'FWL_Backup'));
  const hov = h => h.replace('sh-fold st-cell', 'sh-fold st-cell is-hover');   /* 静态的悬停样子（整项出底色） */
  const foT = tbl(['未选', '已选', '需允许访问', '不可用：其他浏览器', '可操作：点了照产品行为走'],
    [['导出文件夹', [fo('exp', 'none'), fo('exp', 'ok'), fo('exp', 'perm'), fo('exp', 'na'), `<div data-shlive="fold" data-fk="exp" data-st="none">${fo('exp', 'none')}</div>`]],
     ['悬停：整项出底色', [hov(fo('exp', 'none')) + `<span class="sh-cell-n">${foldTip('exp', 'none')}</span>`, hov(fo('exp', 'ok')) + `<span class="sh-cell-n">${esc(foldTip('exp', 'ok', 'FWL_Export'))}</span>`, hov(fo('exp', 'perm')) + `<span class="sh-cell-n">${esc(foldTip('exp', 'perm', 'FWL_Export'))}</span>`, null, null]],
     ['备份文件夹', [fo('bak', 'none'), fo('bak', 'ok'), fo('bak', 'perm'), fo('bak', 'na'), `<div data-shlive="fold" data-fk="bak" data-st="none">${fo('bak', 'none')}</div>`]],
     ['名称过长：170 px 宽', [null, `<div class="sh-lim">${fo('exp', 'ok', 'Export_NewYear_2026')}</div>`, `<div class="sh-lim">${fo('exp', 'perm', 'Export_NewYear_2026')}</div>`, null, null]]]);
  const pgDemo = (cur, hov, live) => `<div class="sh-pgdemo"${live ? ' data-shlive="pg"' : ''}>${wbEntryHTML(cur, hov)}</div>`;
  const pgT = tbl(['常态：在制作或资源交付', '悬停：浮层底色，箭头右移 2 px、变薄荷', '打开着编排节目：框线、箭头薄荷', '可操作：点一下打开，再点回到制作'],
    [['编排节目 →', [pgDemo('baker'), pgDemo('baker', true), pgDemo('wb'), pgDemo('baker', false, true)]]]);

  const BACK = `<button class="btn btn-text tbtn sh-back" type="button">${ic('back')}返回制作</button>`;
  const why = `<div class="sh-why"><span>${WHY.off}</span><button class="btn btn-text tbtn" type="button">重新连接</button></div>`;
  const leftImp = `<section class="sh-left" style="grid-column:1;grid-row:2"><div class="sh-lh"><span class="sh-hv">FWL_Export</span><span class="lbl">5 个素材包</span></div></section>`;
  const impTool = `<div class="topbar sh-hd" style="grid-template-columns:var(--sh-wl) minmax(0,1fr)"><div class="sh-hs sh-hl">${BACK}</div><div class="sh-hs sh-hm"><div class="modeseg" role="group"><button aria-pressed="true" type="button">烟花导入</button><button aria-pressed="false" type="button">ResourceFX 配表</button></div><span class="sp"></span><div class="tgrp"><button class="btn btn-text tbtn" type="button">刷新</button><button class="btn btn-1 is-disabled" aria-disabled="true" data-tip="${esc(WHY.off)}" type="button">导入</button></div></div></div>`;
  const leftWB = `<section class="sh-left" style="grid-column:1;grid-row:2"><div class="tabs tabs-lg" role="tablist"><button class="tab" role="tab" data-t="效果" aria-selected="false" type="button">效果</button><button class="tab" role="tab" data-t="模板" aria-selected="true" type="button">模板</button></div></section>`;
  const wbTool = `<div class="topbar sh-hd" style="grid-template-columns:var(--sh-wl) minmax(0,1fr) var(--w-right)"><div class="sh-hs sh-hl">${BACK}</div><div class="sh-hs sh-hm"><i class="sh-ph" style="width:148px"></i><span class="sp"></span><i class="sh-ph" style="width:56px"></i></div><div class="sh-hs sh-hr" style="border-left:1px solid var(--line)"><span class="sp"></span><div class="tgrp">${['导演表', '灯光', 'UE 里预览'].map(v => `<button class="btn btn-text tbtn is-disabled" aria-disabled="true" type="button" data-tip="${WHY.impW}">${v}</button>`).join('')}</div></div></div>`;
  const wsFrame = (cols, rows, inner) => `<div class="ks-frame sh-ws" style="--pw:1366px;display:grid;grid-template-columns:${cols};grid-template-rows:var(--h-top) ${rows}">${inner}</div>`;
  const tipS = s => `<div class="tip static sm" style="margin-top:6px">${esc(s)}</div>`;
  const disBlk = `<div class="ks-row"><div><span class="ks-cap">资源交付：UE 未连接</span><button class="btn btn-1 is-disabled" aria-disabled="true" type="button" data-tip="${esc(WHY.off)}">导入</button>${tipS(WHY.off)}</div>`
    + `<div><span class="ks-cap">编排节目：导入正在写 UE，三个按钮一起变灰</span><div style="display:flex;gap:2px">${['导演表', '灯光', 'UE 里预览'].map(v => `<button class="btn btn-text tbtn is-disabled" aria-disabled="true" type="button" data-tip="${WHY.impW}">${v}</button>`).join('')}</div>${tipS(WHY.impW)}</div>`
    + `<div><span class="ks-cap">资源交付：编排正在写 UE，双向互锁</span><button class="btn btn-1 is-disabled" aria-disabled="true" type="button" data-tip="${WHY.wbW}">导入</button>${tipS(WHY.wbW)}</div>`
    + `<div><span class="ks-cap">制作：其他浏览器，导出变灰</span><div class="split"><button class="btn btn-1 is-disabled" aria-disabled="true" type="button" data-tip="${WHY.brFold}">导出</button><button class="btn btn-1 is-disabled" aria-disabled="true" type="button" aria-label="导出选项" data-tip="${WHY.brFold}">${ic('cd')}</button></div>${tipS(WHY.brFold)}</div>`
    + `<div><span class="ks-cap">可操作：悬停看原因</span><button class="btn btn-1 is-disabled" aria-disabled="true" type="button" data-tip="${esc(WHY.off)}">导入</button></div></div>`;

  const sd = o => `<div class="dialog static sh-dlg" style="width:400px">${dlgHTML(o, false)}</div>`;
  const dlgs = `<div class="ks-cols" style="--c:3">`
    + blk('第一次导出，还没选导出文件夹', '对话框；选好后接着导出，之后会记住', sd(DLG.exp) + demoBtn('exp', '打开'))
    + blk('第一次要覆盖 UE 里已有的资产', '资源交付的对话框；点「导入」后、写入任何资产之前弹出，取消就一个都不写', sd(DLG.bak(3)) + demoBtn('bak', '打开'))
    + blk('选到 UE 工程里面', '就地报错，对话框不关；打开后点「模拟误选」', sd(Object.assign({err: DLG.bakErr}, DLG.bak(3))) + demoBtn('bak', '打开'))
    + blk('用 Chrome / Edge 以外的浏览器打开', '打开时一次对话框；之后文件夹标签写「不可用」，用到文件夹和 UE 的按钮变灰写原因', sd(DLG.br) + demoBtn('br', '打开'))
    + blk('重开浏览器后要重新允许访问', '不弹框：状态栏那一项变「需允许访问」，旁边一次小气泡（下面放不下放上面），小三角对着那一项；导出、导入、刷新时按钮旁出同一句', `<div>${fo('exp', 'perm')}</div><div class="sh-bub static">${bubHTML('FWL_Export')}</div><div data-shlive="bub" style="margin-top:12px">${fo('exp', 'perm')}</div><span class="sh-cell-n">可操作：点标签或气泡里的「允许访问」</span>`)
    + blk('另存、第一次保存', '名称下面一行勾选；第一次不勾，已放进编排的默认勾上，按效果记住', sd({title: '另存', extra: saveExtra('金曜菊-B 副本', false), ok: '保存'}) + demoBtn('save', '打开'))
    + `</div>`;

  const st = inner => `<footer class="status sh-sstat"><div class="st-l"></div><div class="st-r"><button class="btn btn-text tbtn sm" type="button">已保存 20:31</button><span>${inner}</span></div></footer>`;
  const toastS = (t, act) => `<div class="toast static"><span>${t}</span><button class="btn btn-text tbtn sm" type="button">${act}</button><button class="btn btn-icon sm" type="button" aria-label="关闭">${ic('x')}</button></div>`;
  const pvBlk = `<div class="ks-cols" style="--c:2"><div class="ks-blk"><h3>编排预览：进度、失败、成功<span>状态栏右侧、紧跟保存状态；对话框关掉后不挡操作；失败一直留到重试成功或关掉</span></h3>`
    + `<span class="ks-cap">生成中：约 4 秒，可取消</span>${st(pvHTML({pct: 38}))}`
    + `<span class="ks-cap" style="margin-top:14px">失败：另存后；红色字，不填底色</span>${st(pvHTML(null, {src: 'save'}))}`
    + `<span class="ks-cap" style="margin-top:14px">失败：导出后</span>${st(pvHTML(null, {src: 'export'}))}`
    + `<span class="ks-cap" style="margin-top:14px">成功：第一次放进编排；10 秒后消失；「去编排看」打开编排节目并高亮那一行</span>${toastS('已放进编排：金曜菊-B', '去编排看')}`
    + `<span class="ks-cap" style="margin-top:14px">成功：已在编排里的直接更新那一项，不标「有新版本」</span>${toastS('已更新编排：金曜菊-B', '去编排看')}`
    + `<span class="ks-cap" style="margin-top:14px">导出后自动打开资源交付；提示条在外壳提示区，写明来自制作</span>${toastS('制作：已导出 金锦层，PC 5 张、手机 3 张', '返回制作')}`
    + `<span class="ks-cap" style="margin-top:14px">人在别的页面时导入写完：提示条出在当前页面顶部</span>${toastS('导入：已写入 14 个资产，覆盖的 3 个已备份', '查看')}`
    + `</div><div class="ks-blk"><h3>可操作<span>按下面的按钮在这条状态栏里跑一次</span></h3><div data-shlive="pv">${st('')}</div><div style="display:flex;gap:8px;margin-top:8px">${demoBtn('pvOk', '演示成功')}${demoBtn('pvFail', '演示失败')}</div></div></div>`;

  const frame = (rows, w, cls = '', live = '') => `<div class="ks-frame${cls}" style="--pw:${w}px"${live}><div class="lib-list" style="padding:4px 6px">${rows}</div></div>`;
  const statRows = mkBT().map((r, i) => btHTML(r, i === 0)).join('');
  const btBlk = `<div class="ks-row"><div><span class="ks-cap">1920，372 px：正常 / 正常 / 未进 UE / 有新版本 / 生成预览中 / 预览没生成 / 未进 UE + 有新版本</span>${frame(statRows, 372)}</div>`
    + `<div><span class="ks-cap">1366，332 px</span>${frame(statRows, 332, ' s1366')}</div>`
    + `<div><span class="ks-cap">可操作：点「更新」「重试」，悬停金曜菊-B 的缩略图播放</span>${frame(LBT.map((r, i) => btHTML(r, i === 0)).join(''), 372, '', ' data-shlive="bt"')}</div></div>`;

  const p1 = Object.assign({}, PKG[2], {st: 'wait', t: '22:41', just: true}), p2 = PKG[0], p3 = PKG[3];
  const A = assetsOf(p1);
  const pkgBlk = `<div class="ks-row"><div><span class="ks-cap">包列表：刚导出的包用选中底色，不用绿框</span>${frame([pkgHTML(p1, true), pkgHTML(p2, false), pkgHTML(p3, false)].join(''), 372)}</div>`
    + `<div style="flex:1;min-width:0"><span class="ks-cap">主区：选中一个包，回放缩略图放大 +「修订」「检查」摘要 +「资产」逐资产清单（写入中 3 / ${A.length}；备份在点「导入」时就选好了）</span><div class="ks-frame sh-ws" style="--pw:100%;max-width:1180px;height:auto;padding-bottom:8px">${pkgDetailHTML(p1, {pkg: p1.id, i: 3, tot: A.length})}</div>`
    + `<span class="ks-cap" style="margin-top:14px">主区：没选中包</span><div class="ks-frame sh-ws" style="--pw:100%;max-width:1180px;--ph:120px"><div class="sh-none">${emptyHTML('选一个包查看')}</div></div></div></div>`;

  const br = 'Chrome 131';
  const menus = `<div class="ks-row"><div><span class="ks-cap">更新记录：点版本号；2 = 没看过的条数，看过就消失；各部分版本号也在这里</span><div class="menu static sh-about"><div class="mh">${VER}　新内容 2 条</div>${UPD_LOG}<div class="msum sh-vers">${versDL(br)}</div><div class="mi">全部记录</div><div class="mi">复制版本</div></div></div>`
    + `<div><span class="ks-cap">导出文件夹已选：点开</span><div class="menu static" style="min-width:240px"><div class="mh">导出文件夹　D:\\FireWorksLab\\FWL_Export</div><div class="mi is-hover">换文件夹…</div></div></div>`
    + `<div><span class="ks-cap">编排预览没生成：详情</span><div class="menu static" style="max-width:340px"><div class="msum"><b>编排预览没生成：金曜菊-B 副本</b><dl><dt>原因</dt><dd>存储已用 4.8 / 5 GB</dd><dt>效果</dt><dd>已保存</dd></dl></div><div class="mi">重试</div><div class="mi">去编排看</div></div></div></div>`;

  return `<h2>外壳与 5.0 入口</h2><p class="lead">烟花工坊 5.0，交互宪章 0.9（以「用户 2026-11-05 15:50 再改」「17:05 补充」为准）、设计规范 v3 第 11、12 节、v3.4 改动单第 1–3 条、v3.5 改动单第 9、10 条：外壳顶栏、状态栏左端的导出和备份文件夹、资源交付和编排节目两页、导出和另存之后的去向、首次使用。没有工作区切换，默认画面就是制作；资源交付由「导出 ▾」菜单第一项打开（有待导入的包时带数字），导出完成后也自动打开。静态画出每个状态；带底色的一列和「打开」按钮可以真点。主屏的状态用样板控制条里的「UE / 导出文件夹 / 备份文件夹 / 浏览器 / 预览结果」切换。</p>`
    + `<h3>外壳顶栏<span>1920 高 40 px、1366 高 36 px，栏头面色，底边一条 1 px 线；左边「烟花工坊」大号 600 +「FireWorksLab 5.0.3 [2]」小号弱色，点版本号打开更新记录；右侧只放三项，组间 24 px、正中 1 px 竖线（高 16）：「● UE 已连接」｜「显卡 · GeForce RTX 5080」｜「编排节目 →」；方框只表示数量，悬停写数的是什么</span></h3>${barsHTML}`
    + blk('UE 状态', '前面一个 6 px 状态圆点，「UE」弱色：已连接薄荷圆点、「已连接」主文字色；未连接琥珀圆点、「未连接」琥珀，后面紧跟命令「重新连接」；进行中圆点的位置是转圈；悬停写地址和上次连上时间；写入中点一下打开那一页', ueT, 'margin-top:8px')
    + blk('编排节目入口', '1 px 线框，高 28 px，圆角 2 px，左右内边距 12 px；次文字色、正文字号，名称后面一个向右的箭头（16 px 画布）；悬停出浮层底色，箭头右移 2 px、变薄荷；打开着编排节目时框线、箭头薄荷 + 600；再点一次回到制作', pgT)
    + `<h3>状态栏左端：导出、备份文件夹<span>v3.4 第 1 条：从顶栏搬到状态栏最左边，「复制意见」排在后面；制作、资源交付、编排节目三页的状态栏都有；样子和点法同 v3.3 第 16 条</span></h3>${stHTML}`
    + blk('文件夹', '状态样子（小号弱色字），整项是命令：悬停出底色，悬停写点了做什么。未选（导出、备份都是）「备份 ● 未选」琥珀点 + 琥珀词，悬停「选择导出文件夹」，点了直接选；已选不画圆点，悬停「更换导出文件夹」+ 完整路径，点开「换文件夹…」；需允许访问：琥珀，点一下即允许', foT, 'margin-top:8px')
    + blk('页面工具行：资源交付、编排节目', '工具行占满宽，栏头面色，底边一条线；左段「← 返回制作」，分段和下面的栏对齐，栏与栏之间是同一条 1 px 线；命令用文字按钮，标签弱色', `${wsFrame('var(--sh-wl) minmax(0,1fr)', '28px', impTool + leftImp + '<div style="grid-column:2;grid-row:2"></div>')}<div style="height:12px"></div>${wsFrame('var(--sh-wl) minmax(0,1fr) var(--w-right)', '28px', wbTool + leftWB + '<div style="grid-column:2;grid-row:2"></div>')}`)
    + blk('原因', '资源交付主区最上面一行，主文字色，不填底色；UE 未连接时出现，包列表、逐资产清单和预检照常', wsFrame('var(--sh-wl) minmax(0,1fr)', 'auto', impTool + leftImp + `<div class="sh-main" style="grid-column:2;grid-row:2;padding-bottom:12px">${why}</div>`))
    + blk('变灰按钮 + 原因', '停用一律降透明度，悬停写原因；按钮不隐藏；同一时间只一处写 UE', disBlk)
    + `<h3>首次使用与另存对话框<span>同一份对话框样式；默认焦点在主按钮，Esc 关闭</span></h3>${dlgs}`
    + pvBlk
    + `<h3>编排节目「基础模板」条目<span>一行依次是缩略图、名称、副信息、右侧状态；「未进 UE」会挡住导演表、UE 里预览，琥珀色字；「预览没生成」是错误，红色字；都不画图形；两种状态同时出现时「未进 UE」在上</span></h3>${btBlk}`
    + `<h3>资源交付：包列表与主区<span>导出后自动打开资源交付并选中刚导出的包；主区放大显示选中的包（v3.3 第 17 条），没选中写一行「选一个包查看」；点「导入」先预检，要覆盖又没选备份位置时，写之前先问</span></h3>${pkgBlk}`
    + `<h3>外壳浮层<span>同样板的菜单样式：浮层面色、1 px 线、阴影</span></h3>${menus}`;
}
function renderSheet() {
  const s = q('#sheetShell'); if (!s) return;
  s.innerHTML = sheetHTML();
}
/* 全表的可操作实例：各自一份状态，不动主屏 */
function sheetLive(box, t, e) {
  const kind = box.dataset.shlive;
  if (kind === 'ue') {
    const order = ['wait', 'on', 'off', 'write'], cur = box.dataset.st;
    if (t.closest('[data-sh="retry"]')) { box.dataset.st = 'wait'; box.innerHTML = `<div class="sh-ueg">${ueHTML({k: 'wait'})}</div>`; later('sheetUE', () => { box.dataset.st = 'on'; box.innerHTML = `<div class="sh-ueg">${ueHTML({k: 'on'})}</div>`; }, 1200); return; }
    if (!t.closest('.sh-ue')) return;
    const nx = order[(order.indexOf(cur) + 1) % order.length]; box.dataset.st = nx;
    box.innerHTML = `<div class="sh-ueg">${ueHTML(nx === 'write' ? {k: 'write', n: 3, tot: 12, by: 'import'} : {k: nx, cd: 12})}</div>`;
    return;
  }
  if (kind === 'fold' || kind === 'bub') {
    const b = t.closest('.sh-fold'); if (!b) return;
    const k = box.dataset.fk || 'exp', st = kind === 'bub' ? 'perm' : box.dataset.st, nm = k === 'exp' ? 'FWL_Export' : 'FWL_Backup';
    if (kind === 'bub') { bubbleSheet(b, box); return; }
    if (st === 'none') { box.dataset.st = 'ok'; box.innerHTML = foldHTML(k, 'ok', nm); hint(q('.sh-fold', box), `已选择 ${nm}`); }
    else if (st === 'ok') openMenu(b, `<div class="mh">${FOLD[k]}　${nm}</div><button class="mi two" data-mi="perm" type="button"><span class="mt2"><span>换文件夹…</span><span class="ms2">样板：改成需允许访问</span></span></button>`, {acts: {perm: () => { box.dataset.st = 'perm'; box.innerHTML = foldHTML(k, 'perm', nm); }}});
    else { box.dataset.st = 'ok'; box.innerHTML = foldHTML(k, 'ok', nm); hint(q('.sh-fold', box), `已允许访问 ${nm}`); }
    return;
  }
  if (kind === 'pg') {
    const tb = t.closest('.sh-pg'); if (!tb) return;
    const on = tb.getAttribute('aria-pressed') !== 'true';
    qq('.sh-pg', box).forEach(x => x.setAttribute('aria-pressed', String(on && x === tb)));
    return;
  }
  if (kind === 'bt') {
    const row = t.closest('.lib-item'); if (!row) return;
    const r = LBT.find(x => x.id === row.dataset.id), rer = () => { q('.lib-list', box).innerHTML = LBT.map(x => btHTML(x, x.id === box.dataset.sel)).join(''); };
    box.dataset.sel = r.id;
    if (t.closest('[data-sh="btUpd"]')) { updateBT(r, row, rer); return; }
    if (t.closest('[data-sh="btRetry"]')) { retryBT(r, rer, 'ok'); return; }
    rer(); return;
  }
  if (kind === 'pv') {
    const a = t.closest('[data-sh]'); if (!a) return;
    if (a.dataset.sh === 'pvCancel') { sheetPV.job = null; stopT('sheetPV'); renderSheetPV(); hint(q('.st-r', box), '已取消编排预览，效果已保存'); }
    if (a.dataset.sh === 'pvRetry') runSheetPV('ok');
    if (a.dataset.sh === 'pvX') { sheetPV.err = null; renderSheetPV(); }
    if (a.dataset.sh === 'pvMore') openMenu(a, `<div class="msum"><b>编排预览没生成：金曜菊-B 副本</b><dl><dt>原因</dt><dd>存储已用 4.8 / 5 GB</dd><dt>效果</dt><dd>已保存</dd></dl></div><button class="mi" data-mi="retry" type="button">重试</button>`, {align: 'center', acts: {retry: () => runSheetPV('ok')}});
  }
}
function bubbleSheet(anchor, box) {
  closeBub(false);
  const el = document.createElement('div'); el.className = 'sh-bub'; el.innerHTML = bubHTML('FWL_Export');
  ovlOf(anchor).appendChild(el); placeBub(el, anchor, 'left');
  el.addEventListener('click', ev => { const b = ev.target.closest('[data-r]'); if (!b) return; closeBub(false); if (b.dataset.r === 'allow') { box.innerHTML = foldHTML('exp', 'ok', 'FWL_Export'); hint(q('.sh-fold', box), '已允许访问 FWL_Export'); } });
  SH.bub = {el, anchor, sticky: false};
}
function renderSheetPV() { const b = q('#sheetShell [data-shlive="pv"] .st-r > span'); if (b) b.innerHTML = pvHTML(sheetPV.job, sheetPV.err); }
function runSheetPV(out) {
  sheetPV.err = null; sheetPV.job = {pct: PCT[0], k: 0}; renderSheetPV();
  const step = () => {
    const j = sheetPV.job; if (!j) return;
    j.k += 1; j.pct = PCT[Math.min(j.k, PCT.length - 1)];
    if (j.k >= PCT.length - 1) { sheetPV.job = null; if (out === 'ok') { renderSheetPV(); toast('已放进编排：金曜菊-B 副本', {ms: 10000, near: q('#kitSheet'), action: {label: '去编排看', fn: () => toast('样板全表里不切换页面', {near: q('#kitSheet')})}}); } else { sheetPV.err = {src: 'save'}; renderSheetPV(); } return; }
    renderSheetPV(); later('sheetPV', step, 360);
  };
  later('sheetPV', step, 360);
}
function sheetDemo(d) {
  const host = q('#kitSheet'), id = d.dataset.shdemo;
  if (id === 'exp') askExpFolder(() => hint(d, '已选择 FWL_Export'), {host});
  if (id === 'bak') askBackup(3, () => hint(d, '已选择 FWL_Backup'), () => hint(d, '已取消，没有写入任何资产'), host);
  if (id === 'br') askBrowser(host);
  if (id === 'save') openSaveDialog({host, onOk: v => hint(d, `已另存「${v.name}」`)});
  if (id === 'pvOk') runSheetPV('ok');
  if (id === 'pvFail') runSheetPV('fail');
}

/* ---------- 11 启动：把各块搬进槽位 ---------- */
function mount() {
  const parts = q('#shParts');
  /* 缩略图、胶片帧：从样板已经画出来的效果库和胶片条里取，不再内嵌一份 */
  qq('#libList .lib-item[data-lib]').forEach(it => { const im = q('.th img', it); if (im) IMGS[it.dataset.lib] = im.src; });
  FILM = qq('#tlw .film-c img').map(i => i.src).filter(Boolean);
  /* 导入、编排先留在 #shParts，切过去时再搬进 #app（dock） */
  [q('#wsImport'), q('#wsWB')].forEach(w => { if (w) w.addEventListener('keydown', listKeys); });
  const sbar = q('#sbarShell'), kit = q('#shKit');
  if (sbar && kit) sbar.appendChild(kit);
  if (parts && !parts.children.length) parts.remove();
  const sheet = q('#sheetShell');
  if (sheet) sheet.addEventListener('keydown', listKeys);
  /* 浏览器不支持时：样板重画导出按钮后再变灰一次 */
  ['#expBtn', '#deliv'].forEach(s => { const el = q(s); if (el) new MutationObserver(patchExport).observe(el, {childList: true}); });
  /* 「导出 ▾」菜单每次打开都是新画的：出现「资源交付」的计数位 #expDelivN 时填上待导入的包数（v3.4 第 2 条；计数位不在时什么都不做） */
  const ov = q('#ovlApp'); if (ov) new MutationObserver(() => { const c = q('#expDelivN'); if (c && !c.dataset.shN) { c.dataset.shN = '1'; fillDeliv(); } }).observe(ov, {childList: true});
  renderAll();
  /* 全表一节在第一次切到全表时才生成（同样板的全表正文），主屏时页面里没有这些静态样子 */
  const ks = q('#kitSheet');
  if (ks && !ks.hidden) renderSheet();
  else if (ks) { const mo = new MutationObserver(() => { if (!ks.hidden) { mo.disconnect(); renderSheet(); } }); mo.observe(ks, {attributes: true, attributeFilter: ['hidden']}); }
  window.SHELL = {
    S, BT, PKG, set: setKit, ws: setWS, speed: k => { SH.scale = k; }, render: renderAll,
    save: () => openSaveDialog(), copy: snapCopy, state: () => ({ws: S.ws, ue: liveUE(), exp: S.exp, bak: S.bak, br: S.br, pv: S.pv, job: S.job && S.job.pct, err: !!S.pvErr, imp: S.imp.writing && {i: S.imp.writing.i, tot: S.imp.writing.tot, paused: !!S.imp.writing.paused}})
  };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();

