// =====================================================================
//  4.9.4 快捷键单一登记表（交互宪章 5：「快捷键单一登记表」）
//  以前 6 个文件各自往 document 上挂 keydown，同一个键谁先处理、在输入框里管不管各写各的；
//  R 曾经被「实拍对照」和「重播」抢过（10-02 16:22 改成 V）。现在：
//  - 所有全局快捷键都登记在 KEYMAP 这一张表里（键、给人看的写法、做什么、在哪里起作用）；
//  - 各模块用 keyBind(id, fn) 挂处理函数，只有一个 keydown 监听按表分发；
//  - 「工具」页和 ? 键看到的快捷键表就是这张表生成的，不会和实际行为对不上。
//  输入框里的回车 / Esc（搜索框清空、数值框回车）是那个输入框自己的，不算全局快捷键，不在这里。
// =====================================================================
const TYPING = el => !!el && /INPUT|SELECT|TEXTAREA/.test(el.tagName);
const TEXTY = el => !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /^(text|search|number|)$/.test(el.type || '')));
// guard：typing = 光标在任何输入控件（含滑杆、下拉）里不管；text = 只在文字 / 数字输入框里不管（留给输入框自己的撤销）；none = 总是看
const KEYMAP = [
  { id: 'play', label: '空格', what: '播放 / 暂停', where: '画面', guard: 'typing', test: e => e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey },
  { id: 'replay', label: 'R', what: '重播：回到 0 秒再播', where: '画面', guard: 'typing', test: e => plain(e) && e.key.toLowerCase() === 'r' },
  { id: 'tickPrev', label: '←', what: '退 1 个 tick（1/30 s）', where: '画面', guard: 'typing', test: e => plain(e) && e.key === 'ArrowLeft' },
  { id: 'tickNext', label: '→', what: '进 1 个 tick（1/30 s）', where: '画面', guard: 'typing', test: e => plain(e) && e.key === 'ArrowRight' },
  { id: 'bake', label: 'B', what: '按当前参数烘焙贴图（自动烘焙关着时用）', where: '画面', guard: 'typing', test: e => plain(e) && e.key.toLowerCase() === 'b' },
  { id: 'ref', label: 'V', what: '实拍对照：开 / 关', where: '画面', guard: 'typing', test: e => plain(e) && e.key.toLowerCase() === 'v' },
  { id: 'focus', label: 'F', what: '精简布局：左右栏一起收起 / 放回（双击画布也行）', where: '布局', guard: 'typing', test: e => plain(e) && e.key.toLowerCase() === 'f' },
  { id: 'side', label: 'L', what: '左栏（库）显示 / 隐藏', where: '布局', guard: 'typing', test: e => plain(e) && e.key.toLowerCase() === 'l' },
  { id: 'right', label: 'P', what: '右栏（参数）显示 / 隐藏', where: '布局', guard: 'typing', test: e => plain(e) && e.key.toLowerCase() === 'p' },
  { id: 'prevItem', label: '↑', what: '左栏上一个 AI 条目（打开的是 AI 条目时）', where: '左栏', guard: 'typing', test: e => plain(e) && e.key === 'ArrowUp' },
  { id: 'nextItem', label: '↓', what: '左栏下一个 AI 条目', where: '左栏', guard: 'typing', test: e => plain(e) && e.key === 'ArrowDown' },
  { id: 'undo', label: 'Ctrl+Z', what: '撤销（参数、加层 / 删层 / 挪层、删除效果）', where: '全局', guard: 'text', test: e => (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'z' },
  { id: 'redo', label: 'Ctrl+Shift+Z / Ctrl+Y', what: '重做', where: '全局', guard: 'text', test: e => (e.ctrlKey || e.metaKey) && !e.altKey && ((e.shiftKey && e.key.toLowerCase() === 'z') || e.key.toLowerCase() === 'y') },
  { id: 'esc', label: 'Esc', what: '关掉最上面的一样：钉住的说明 → 花型库 → 更新记录 → 打开的菜单 → 抽屉式的栏；都没有时切精简布局', where: '全局', guard: 'none', test: e => e.key === 'Escape' },
  { id: 'keys', label: '?', what: '看这张快捷键表', where: '全局', guard: 'typing', test: e => !e.ctrlKey && !e.metaKey && !e.altKey && e.key === '?' },
];
function plain(e) { return !e.ctrlKey && !e.metaKey && !e.altKey; }     // 和以前一样：按着 Shift 也算（R / F / V / L / P、方向键）
const KEY_FNS = {};
// 挂处理函数。Esc 这类一个键有几层意思的：按 prio 从小到大试，返回 true 的那个算处理了，后面的不再跑
function keyBind(id, fn, prio = 50) {
  if (!KEYMAP.some(k => k.id === id)) throw new Error('快捷键表里没有 ' + id + '（先登记到 68_keys.js 的 KEYMAP）');
  (KEY_FNS[id] = KEY_FNS[id] || []).push({ fn, prio }); KEY_FNS[id].sort((a, b) => a.prio - b.prio);
}
// 一个 keydown 监听按表分发。Esc 按 prio 从小到大试，处理函数返回 true = 关掉了一样，就停；别的键跑这个键挂的处理函数
function keyDispatch(e) {
  if (typeof document === 'undefined') return;
  const t = e.target && e.target.nodeType === 1 ? e.target : document.activeElement;
  if (document.querySelector('dialog[open]')) return;          // 应用内对话框开着：键留给对话框（Esc 由对话框自己关）
  const k = KEYMAP.find(x => x.test(e)); if (!k) return;
  if (k.guard === 'typing' && (TYPING(t) || TYPING(document.activeElement))) return;
  if (k.guard === 'text' && (TEXTY(t) || TEXTY(document.activeElement))) return;
  if (k.id === 'esc') { for (const h of KEY_FNS.esc || []) if (h.fn(e, t) === true) return; return; }
  for (const h of KEY_FNS[k.id] || []) h.fn(e, t);
}
if (typeof document !== 'undefined') document.addEventListener('keydown', keyDispatch);
// 快捷键表（工具页一节 + ? 键弹出）：直接由 KEYMAP 生成
function keysTableHTML() {
  return `<table class="keys-tbl"><tbody>${KEYMAP.map(k => `<tr><td><kbd>${k.label.replace(/ \/ /g, '</kbd> / <kbd>')}</kbd></td><td>${k.what}</td><td class="dim">${k.where}</td></tr>`).join('')}</tbody></table>`;
}
function keysShow() {
  const dlg = $('#keysDlg'); if (!dlg) return;
  $('#keysBody').innerHTML = keysTableHTML(); if (!dlg.open) dlg.showModal();
}
