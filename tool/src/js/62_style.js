// =====================================================================
//  全局风格层（用户 2026-10-02 13:26：「如果不会改坏就出全局，留参数接口给我，我来调」）
//  叠在每个效果自己的参数上：倍数（尾长、尾缀粗细、散布、星头大小、火花亮度、闪烁）+ 三个外形量（粗细随机、亮肩、泪滴星头）。
//  · 全部是默认值（倍数 1、外形 0）时返回原对象，烘焙、实时模拟、导出逐像素不变——这是「不会改坏」的保证（回归检查比对）。
//  · 默认不作用于已通过的效果（正式库、已通过版），开关在风格面板里。
//  · 存在这台电脑的浏览器里（localStorage「globalStyle」）；本机显卡的导出任务不读它，AI 的导出不受影响。「复制风格参数」发给 AI 可以写进项目。
// =====================================================================
const STYLE_DEF = [
  ['tailLen', '尾长', '×', 0.3, 3, 0.01, 1, '火花寿命 × 这个数：尾巴整体变长 / 变短'],
  ['tailWidth', '尾缀粗细', '×', 0.3, 3, 0.01, 1, '每粒火花的大小 × 这个数'],
  ['tailSpread', '尾缀散布', '×', 0.3, 3, 0.01, 1, '火花离开星体时的随机速度 × 这个数：尾巴变宽、变松散'],
  ['headSize', '星头大小', '×', 0.3, 3, 0.01, 1, '星头亮核直径 × 这个数'],
  ['sparkBright', '火花亮度', '×', 0.3, 3, 0.01, 1, '尾缀火花亮度 × 这个数'],
  ['twinkle', '闪烁', '×', 0, 3, 0.01, 1, '火花明暗闪动 × 这个数'],
  ['widthJit', '粗细随机', '', 0, 1, 0.01, 0, '0 = 每颗星的尾巴一样粗；越大，星与星、火花与火花之间粗细差别越明显'],
  ['shoulder', '亮肩（头宽尾细）', '', -1, 1, 0.01, 0, '正值：靠近星头的新火花更大更亮，尾巴末端更细更暗；负值反过来'],
  ['tear', '泪滴星头', '', 0, 1, 0.01, 0, '0 = 圆点；越大，星头沿运动方向拉出越长的尖尾（速度越快越长）']
];
const STYLE_NEUTRAL = Object.fromEntries(STYLE_DEF.map(d => [d[0], d[6]]));
const gStyle = { v: { ...STYLE_NEUTRAL }, approved: false, rev: 0, cache: new Map() };
function loadStyle() { try { const s = store.get('globalStyle', null); if (s) { gStyle.v = { ...STYLE_NEUTRAL, ...(s.v || {}) }; gStyle.approved = !!s.approved; } } catch (e) { } }
function saveStyle() { store.set('globalStyle', { v: gStyle.v, approved: gStyle.approved }); }
const styleNeutral = () => STYLE_DEF.every(([k, , , , , , d]) => Math.abs((+gStyle.v[k]) - d) < 1e-9);
// 当前打开的是不是「已通过」的东西（正式库条目、效果的已通过版）
function styleExemptNow() {
  if (gStyle.approved || typeof lib === 'undefined') return false;
  if (lib.formal) return true;
  const ef = lib.effect, e = lib.review;
  return !!(ef && e && ef.已通过版 && ef.已通过版.replace(/^rep:/, '') === e.id);
}
function styledP(P) {
  if (!P || P._styled || styleNeutral() || styleExemptNow() || familyOf(P.type) !== 'aerial') return P;
  const key = gStyle.rev + '|' + JSON.stringify(P); let o = gStyle.cache.get(key);
  if (o) return o;
  const v = gStyle.v; o = { ...P, _styled: 1 };
  o.sparkLife = P.sparkLife * v.tailLen; if (P.emberLife) o.emberLife = P.emberLife * v.tailLen;
  o.sparkSize = P.sparkSize * v.tailWidth; o.sparkSpread = P.sparkSpread * v.tailSpread;
  o.headSize = P.headSize * v.headSize; o.sparkBright = P.sparkBright * v.sparkBright; o.twinkle = (P.twinkle || 0) * v.twinkle;
  o._styJit = +v.widthJit || 0; o._styShoulder = +v.shoulder || 0; o._styTear = +v.tear || 0;
  if (gStyle.cache.size > 64) gStyle.cache.clear();
  gStyle.cache.set(key, o); return o;
}
// 风格变了：单层重烘；多层每层都重烘（实时模拟按 e.rev 刷新）
async function restyleAll() {
  gStyle.rev++; gStyle.cache.clear(); saveStyle();
  if (state.tab === 'combo') {
    for (const L of state.layers) {
      const e = state.lib.find(x => x.name === L.lib); if (!e) continue;
      e.rev = (e.rev || 0) + 1;
      try { const b = await bake(libP(e.P, true), 1, p => setStatus(`风格：重烘 ${L.lib} ${Math.round(p * 100)}%`)); disposeBake(e.bake); e.bake = b; } catch (err) { flash('风格重烘失败：' + err.message, true); }
    }
    setStatus(''); if (state.platform === 'mobile') await ensureComboMobile();
    if (state.comboSel >= 0) { const e = state.lib.find(x => x.name === state.layers[state.comboSel].lib); if (e && e.bake) showStats(e.bake); }
  } else onParam();
}
function styleText() {
  return '全局风格（烘焙器 v' + VERSION + '）\n' + STYLE_DEF.map(([k, lab, unit]) => `- ${lab}：${+(+gStyle.v[k]).toFixed(3)}${unit}`).join('\n') + `\n- 作用于已通过的效果：${gStyle.approved ? '是' : '否'}`;
}
function renderStylePanel() {
  const host = $('#styleBody'); host.innerHTML = '';
  for (const [k, lab, unit, mn, mx, st, d, hint] of STYLE_DEF) {
    const row = slider(host, 'sty-' + k, lab, unit, mn, mx, st, () => gStyle.v[k], v => { gStyle.v[k] = v; scheduleRestyle(); }, d);
    if (row) row.title = hint;
    host.insertAdjacentHTML('beforeend', `<p class="hint">${hint}</p>`);
  }
  $('#styleApproved').checked = gStyle.approved;
  $('#styleState').textContent = styleNeutral() ? '全部是默认值：所有效果和原来完全一样' : styleExemptNow() ? '当前打开的是已通过的效果：没有套用（可在下面打开）' : '已套用到当前效果';
}
let restyleTimer = 0;
function scheduleRestyle() { clearTimeout(restyleTimer); restyleTimer = setTimeout(() => { restyleAll(); renderStylePanel(); }, 450); }
function initStyle() {
  loadStyle();
  $('#styleBtn').addEventListener('click', () => { $('#styleDlg').hidden = !$('#styleDlg').hidden; if (!$('#styleDlg').hidden) renderStylePanel(); });
  $('#styleClose').addEventListener('click', () => { $('#styleDlg').hidden = true; });
  $('#styleReset').addEventListener('click', () => { gStyle.v = { ...STYLE_NEUTRAL }; renderStylePanel(); restyleAll(); });
  $('#styleApproved').addEventListener('change', e => { gStyle.approved = e.target.checked; renderStylePanel(); restyleAll(); });
  $('#styleCopy').addEventListener('click', async () => { const t = styleText(); try { await navigator.clipboard.writeText(t); flash('已复制风格参数'); } catch (e) { flash(t); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#styleDlg').hidden) $('#styleDlg').hidden = true; });
  $('#styleBtn').classList.toggle('on', !styleNeutral());
}
