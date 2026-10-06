// =====================================================================
//  4.2.9 撤销 / 重做（走查 4.2 的实施顺序：参数栏改版 + 梭形 → 撤销 → 分平台导出）
//  · 记的是整个资产的样子（单层：参数 + 颜色；多层：每层的位置 / 延迟 / 参数 / 颜色），和「保存」「草稿」同一个快照（wbSnap）
//  · 停手 0.6 秒算一步（拖滑杆、连按方向键不会记成几十步）；最多 60 步；打开别的效果 / 换版本就重新开始
//  · 多层：只把变了的那几层改回去、只重烘那几层（不整朵重来）；层数或层的来源变了（加层 / 删层）才整体重放
//  · Ctrl+Z 撤销，Ctrl+Shift+Z 或 Ctrl+Y 重做；光标在文字 / 数字输入框里时留给输入框自己的撤销
// =====================================================================
const undo = { last: '', pend: null, timer: 0, back: [], fwd: [], applying: false };
const UNDO_MAX = 60;
function undoReset() { clearTimeout(undo.timer); undo.pend = null; undo.back = []; undo.fwd = []; undo.last = wbSig(); undoSync(); }
// 改了东西就调一下（onParam、右栏的输入事件）：记下改之前的样子，停手 0.6 秒才算一步
function undoNote() {
  if (undo.applying || !undo.last) return;
  if (undo.pend == null) undo.pend = undo.last;
  clearTimeout(undo.timer); undo.timer = setTimeout(undoCommit, 600);
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
function bindUndo() {
  $('#abUndo').addEventListener('click', () => undoStep(-1)); $('#abRedo').addEventListener('click', () => undoStep(1));
  // 右栏所有输入（滑杆、颜色、下拉、层的位置 / 延迟…）都算改动；搜索框、「只看改过的」这些不改快照，提交时比一下就不记
  for (const id of ['right', 'pMaster', 'pCombo']) { const el = document.getElementById(id); if (el) { el.addEventListener('input', undoNote); el.addEventListener('change', undoNote); } }
  // 4.9.4 快捷键登记表（68_keys.js）：光标在文字 / 数字输入框里时留给输入框自己的撤销（表里 guard: text）
  keyBind('undo', e => { e.preventDefault(); undoStep(-1); }); keyBind('redo', e => { e.preventDefault(); undoStep(1); });
  undoSync();
}
