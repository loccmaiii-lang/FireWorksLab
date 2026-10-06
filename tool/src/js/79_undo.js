// =====================================================================
//  4.2.9 撤销 / 重做（走查 4.2 的实施顺序：参数栏改版 + 梭形 → 撤销 → 分平台导出）
//  · 记的是整个资产的样子（单层：参数 + 颜色；多层：每层的位置 / 延迟 / 参数 / 颜色），和「保存」「草稿」同一个快照（wbSnap）
//  · 一次操作算一步（4.9.7，对话框23 参数栏交互第 8 条）：一次拖动（按下到松开，中途停多久都算一次）、一次输入提交（回车 / 离开）、一次选择 / 点击；
//    按住方向键调滑杆，松开才算一步；拾色器拖色，关掉才算一步。以前按「停手 0.6 秒」算：连着改两个参数会并成一步，拖到一半停一下会拆成两步
//  · 最多 60 步；打开别的效果 / 换版本就重新开始
//  · 多层：只把变了的那几层改回去、只重烘那几层（不整朵重来）；层数或层的来源变了（加层 / 删层）才整体重放
//  · Ctrl+Z 撤销，Ctrl+Shift+Z 或 Ctrl+Y 重做；光标在文字 / 数字输入框里时留给输入框自己的撤销
// =====================================================================
const undo = { last: '', pend: null, timer: 0, back: [], fwd: [], applying: false, ptr: false, key: false, color: false };
const UNDO_MAX = 60;
function undoReset() { clearTimeout(undo.timer); undo.pend = null; undo.back = []; undo.fwd = []; undo.last = wbSig(); undoSync(); }
// 改了东西就调一下（onParam、右栏的输入事件）：记下改之前的样子。手还没放开（按着鼠标 / 按着方向键 / 拾色器开着）就先攒着，放开才算一步；
// 点一下、选一项、输入框回车这类一下就完的，这一轮事件处理完就算一步（两个参数紧挨着改也是两步）
const undoHeld = () => undo.ptr || undo.key || undo.color;
function undoNote() {
  if (undo.applying || !undo.last) return;
  if (undo.pend == null) undo.pend = undo.last;
  clearTimeout(undo.timer); if (!undoHeld()) undo.timer = setTimeout(undoCommit, 0);
}
// 手放开：这一次操作结束（等这一轮的 change 事件处理完再记）
function undoRelease(what) {
  if (!undo[what]) return; undo[what] = false;
  if (!undoHeld() && undo.pend != null) { clearTimeout(undo.timer); undo.timer = setTimeout(undoCommit, 0); }
}
function undoCommit() {
  clearTimeout(undo.timer);
  const cur = wbSig();
  if (undo.pend != null && cur && undo.pend !== cur) { undo.back.push(undo.pend); if (undo.back.length > UNDO_MAX) undo.back.shift(); undo.fwd = []; }
  undo.pend = null; if (cur) undo.last = cur; undoSync();
}
async function undoStep(dir) {
  if (undo.applying) return;
  if (undo.pend != null) undoCommit();
  const from = dir < 0 ? undo.back : undo.fwd, to = dir < 0 ? undo.fwd : undo.back;
  if (!from.length) { flash(dir < 0 ? '没有可以撤销的改动' : '没有可以重做的改动'); return; }
  const sig = from.pop(); to.push(undo.last);
  undo.applying = true;
  try { await undoApply(JSON.parse(sig)); } catch (e) { flash('撤销没做成：' + (e.message || e), true); }
  finally { undo.applying = false; }
  clearTimeout(undo.timer); undo.pend = null; undo.last = wbSig() || sig; undoSync();
  flash(dir < 0 ? `已撤销（还能撤 ${undo.back.length} 步）` : `已重做（还能重做 ${undo.fwd.length} 步）`);
}
async function undoApply(snap) {
  const cur = wbSnap();
  if (snap.kind !== cur.kind) return;
  if (snap.kind !== 'combo') {
    state.P = structuredClone(snap.P); state.M = structuredClone(snap.M); if (snap.repId) state.repId = snap.repId;
    buildMasterPanel(); onParam(); return;
  }
  const same = snap.layers.length === state.layers.length && snap.layers.every((x, i) => { const e = layerEntryOf(state.layers[i]) || {}; return (x.id || null) === (e.rep || null) && (x.type || null) === (e.type || null); });
  if (!same) { await wbApply(snap); return; }     // 加层 / 删层 / 换了来源：整体重放
  const put = (o, v) => { for (const k of Object.keys(o)) delete o[k]; Object.assign(o, structuredClone(v)); };
  snap.layers.forEach((x, i) => {
    const L = state.layers[i], e = layerEntryOf(L), c = cur.layers[i];
    if (JSON.stringify(x.L) !== JSON.stringify(c.L)) { const lb = L.lib; put(L, x.L); L.lib = lb; }
    if (e && x.M && JSON.stringify(x.M) !== JSON.stringify(c.M)) put(e.M, x.M);
    if (e && x.P && JSON.stringify(x.P) !== JSON.stringify(c.P)) { put(e.P, x.P); derive(e.P); state.bakeError = null; queueLayerBake(e, 0); }
  });
  if (state.comboSel >= 0) buildMasterPanel(); else buildComboPanel();
  if (typeof syncComboPanels === 'function') syncComboPanels();
}
function undoSync() {
  const u = $('#abUndo'), r = $('#abRedo'); if (!u || !r) return;
  const nb = undo.back.length + (undo.pend != null ? 1 : 0);
  u.disabled = !nb; r.disabled = !undo.fwd.length;
  u.title = nb ? `撤销（Ctrl+Z，还能撤 ${nb} 步）` : '撤销（Ctrl+Z）：还没有改动'; r.title = undo.fwd.length ? `重做（Ctrl+Shift+Z，${undo.fwd.length} 步）` : '重做（Ctrl+Shift+Z）';
}
// 右栏的输入事件：拾色器拖色时一直有 input，关掉拾色器（change）才算一步；别的照常
function undoInput(e) { if (e && e.target && e.target.type === 'color') undo.color = true; undoNote(); }
function undoChange(e) { undoNote(); if (e && e.target && e.target.type === 'color') undoRelease('color'); }
function bindUndo() {
  $('#abUndo').addEventListener('click', () => undoStep(-1)); $('#abRedo').addEventListener('click', () => undoStep(1));
  // 右栏所有输入（滑杆、颜色、下拉、层的位置 / 延迟…）都算改动；搜索框、「只看改过的」这些不改快照，提交时比一下就不记
  for (const id of ['right', 'pMaster', 'pCombo']) { const el = document.getElementById(id); if (el) { el.addEventListener('input', undoInput); el.addEventListener('change', undoChange); } }
  // 4.9.7 一次操作 = 一步：按下鼠标到松开是一次（滑杆、时间轴拖点、层轨道……中途停多久都算一次）
  window.addEventListener('pointerdown', e => { if (e.button === 0) undo.ptr = true; }, true);
  for (const ev of ['pointerup', 'pointercancel']) window.addEventListener(ev, () => undoRelease('ptr'), true);
  // 按住方向键 / PageUp 调滑杆：松开键才算一步
  window.addEventListener('keydown', e => { const t = e.target; if (t && t.type === 'range' && /^(Arrow|Page|Home|End)/.test(e.key)) undo.key = true; }, true);
  window.addEventListener('keyup', () => undoRelease('key'), true);
  window.addEventListener('blur', () => { undoRelease('ptr'); undoRelease('key'); undoRelease('color'); });
  // 4.9.4 快捷键登记表（68_keys.js）：光标在文字 / 数字输入框里时留给输入框自己的撤销（表里 guard: text）
  keyBind('undo', e => { e.preventDefault(); undoStep(-1); }); keyBind('redo', e => { e.preventDefault(); undoStep(1); });
  undoSync();
}
