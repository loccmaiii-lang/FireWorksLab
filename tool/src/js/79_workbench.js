// =====================================================================
//  工作台（2026-10-02 用户 07:43 / 07:47）：每个条目都是完整资产——
//  · 多层效果一个查看器：右栏「观察图层」选整体或某一层，选中层下面就是这一层的完整参数，画面一直是整朵；独看 / 静音只影响观察
//  · 画面上方资产栏：看哪个版本（AI 版 / 你保存的版本）、保存、另存为、导出 / 导入配方文件、复制改动、导出素材包
//  你的版本存在这台电脑的浏览器里（localStorage「mySaves」），按效果分；导出配方文件可以长期保留或发给 AI。
// =====================================================================

// ---------------- 观察图层 ----------------
function layerEntryOf(L) { return L && state.lib.find(x => x.name === L.lib); }
function layerName(i) {
  const L = state.layers[i]; if (L && L.title) return L.title;      // 我的效果：层自己的名字（4.2.7）
  const e = layerEntryOf(L), names = (lib.review && lib.review.kind === 'combo' && lib.review.layerNames) || [];
  const le = e && e.rep ? FW_REVIEW_LIST.find(x => x.id === e.rep) : null;
  return names[i] || (le ? le.name : L ? L.lib : '');
}
function buildLayerCard() {
  const box = $('#layerCard'), on = state.tab === 'combo' && state.layers.length > 0 && !state.showcase;
  box.hidden = !on; if (!on) { box.innerHTML = ''; return; }
  const v = state.layerView;
  const rows = state.layers.map((L, i) => {
    const e = layerEntryOf(L), le = e && e.rep ? FW_REVIEW_LIST.find(x => x.id === e.rep) : null;
    const dur = e && e.bake ? bakeTotal(e.bake) / (L.rate || 1) : 0, solo = v.solo === i, mute = v.mute.includes(i);
    return `<div class="lrow${state.comboSel === i ? ' cur' : ''}${mute || (v.solo >= 0 && !solo) ? ' muted' : ''}" data-i="${i}" tabindex="0" role="button">
      ${le ? thumbHTML(le) : `<span class="th" style="${e ? typeThumbStyle(e.type) : ''}"></span>`}
      <span class="tx"><b>${i + 1} · ${layerName(i)}</b><small>开始 <input class="lst" type="number" min="0" max="10" step="0.01" value="${(+L.delay || 0).toFixed(2)}" data-st="${i}" aria-label="第 ${i + 1} 层开始时间"> s · 时长 ${dur.toFixed(2)} s${e && e.editSig ? ' · <em>已调</em>' : ''}</small></span>
      <span class="lb"><button type="button" class="mini${solo ? ' on' : ''}" data-solo="${i}" aria-pressed="${solo}">独看</button><button type="button" class="mini${mute ? ' on' : ''}" data-mute="${i}" aria-pressed="${mute}">静音</button></span>${lib.my ? myLayerTools(i) : ''}</div>`;
  });
  if (lib.my) rows.push(`<button type="button" class="btn mini myadd" id="myAdd" title="加一层：花型模板，或现有效果里的某一层（参数复制一份）">＋ 加一层</button>`);
  box.innerHTML = `<summary>图层管理 · ${state.layers.length} 层${lib.my ? ' · 加层 / 排序 / 复制' : ''}</summary><div class="lc-h"><small>时间轴点一层改参数；显示 / 独看只影响观察。${lib.my ? '每层是这个效果自己的一份参数（从模板 / 原效果复制来的），改了不影响原来的效果。' : ''}</small></div>
    <div class="lrow whole${state.comboSel < 0 ? ' cur' : ''}" data-i="-1" tabindex="0" role="button"><span class="th whole">${state.layers.length}</span><span class="tx"><b>整体</b><small>各层的位置、延迟、时间倍率、颜色</small></span></div>${rows.join('')}`;
  box.querySelectorAll('.lrow').forEach(r => {
    const go = ev => { if (ev.target.closest('button,input')) return; selectComboLayer(+r.dataset.i); };
    r.addEventListener('click', go); r.addEventListener('keydown', ev => { if (ev.key === 'Enter') go(ev); });
  });
  box.querySelectorAll('[data-st]').forEach(inp => inp.addEventListener('change', () => { const i = +inp.dataset.st, L = state.layers[i]; L.delay = clamp(+inp.value || 0, 0, 10); if (state.comboSel === i) buildLayerHead(i); else if (state.comboSel < 0) buildComboPanel(); buildLayerCard(); }));
  box.querySelectorAll('[data-solo]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.solo; v.solo = v.solo === i ? -1 : i; buildLayerCard(); }));
  box.querySelectorAll('[data-mute]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.mute; v.mute = v.mute.includes(i) ? v.mute.filter(x => x !== i) : [...v.mute, i]; buildLayerCard(); }));
  if (lib.my) bindMyLayerTools(box);
}
function selectComboLayer(i) {
  if (state.tab !== 'combo') return;
  const L = state.layers[i], e = layerEntryOf(L);
  if (i >= 0 && !e) return;
  state.comboSel = i;
  if (i >= 0) {
    // 参数面板直接绑这一层：state.P = 这层的模拟参数，state.M = 这层在整朵里的颜色（组合层 L，和单层的颜色字段同名）
    state.P = e.P; state.M = L; state.repId = e.rep || null; state.activeStage = 0;
    state.gen++; state.dirty = false; state.failedGen = -1; state.bakeError = null; syncBakeError();
    buildMasterPanel(); buildLayerHead(i);
    if (e.bake) showStats(e.bake);
  } else buildComboPanel();
  syncComboPanels(); buildLayerCard();
  $('#right').scrollTop = 0;
}
// 导出方案的说明：这个方案在这一层上会少什么
function outNote(L, e) {
  const o = layerOut(L), P = e && e.P, w = [];
  if (o.pc === 'off' && o.mobile === 'off') return '两个平台都不出这一层（画面里照样看得到，导出时跳过）';
  if (o.pc === 'unit' && P && !unitAllowed(P)) w.push('这种花型 / 图案不能出单束（千轮、分裂、蜂、非球形图案），导出时 PC 按序列出');
  // XU1 试导（引菊 → 锦的锦层）：单束的尾巴是直的、沿速度方向；星下垂以后速度朝下，长尾巴都指向花心上方同一点（线性阻力的几何性质），后段像辐条。长尾、下垂多的层用序列
  if (o.pc === 'unit' && P && unitAllowed(P) && (['kamuro', 'yanagi'].includes(P.type) || +P.emberFrac > 0 || (+P.sparkLife || 0) * Math.max(1, +P.sparkLifeEnd || 1) > 1.2 || (+P.burn || 0) > 4))
    w.push('这一层尾迹长 / 烧得久（锦冠、柳、余烬这类）：单束的尾迹是沿速度的直线，下垂以后会都指向花心上方、像辐条；这种层建议用序列');
  if (o.pc === 'dots' && P) {
    if (familyOf(P.type) !== 'aerial') w.push('这种花型不是礼花，光点没法表达，PC 请用序列');
    if (!(+P.headBright > 0)) w.push('这一层星头不发光（星头亮度 0，只有尾迹 / 火花）：光点什么都出不来，PC 请用序列');
    if (+P.sparkRate > 0 || +P.emberFrac > 0) w.push('这一层有尾迹：PC 光点只出星头，尾迹没有（要尾迹就用序列，或另加一层序列只出尾迹）');
    if (P.pattern && P.pattern !== 'sphere') w.push('图案不是球：光点按球面放射，形状会不对');
    if (+P.strobeHz > 0) w.push('点灭：光点不会闪（spec 10.B 的点灭星另配）');
    if (+P.subStars > 0 && ['senrin', 'crossette'].includes(P.type)) w.push('千轮 / 分裂的子花不在光点里');
  }
  const s = `PC：${o.pc === 'seq' ? '这一层的序列' : o.pc === 'unit' ? `单束（每颗星一个面片，${Math.round(+(P && P.stars) || 0)} 个；贴图是一颗星的序列，引擎回放第一次要烘一会儿）` : o.pc === 'dots' ? `GPU 光点（约 ${P ? dotsCount(P) : 0} 颗，软圆点材质，没有贴图）` : '不出'} · 手机：${o.mobile === 'seq' ? '序列（纯图片）' : '不出'}`;
  return s + (w.length ? '。注意：' + w.join('；') : '');
}
function buildLayerHead(i) {
  const L = state.layers[i], host = $('#layerHead'); host.innerHTML = '';
  host.insertAdjacentHTML('beforeend', `<div class="lh-t"><button class="btn mini" type="button" id="lhBack">← 整体</button><b title="第 ${i + 1} 层 · ${layerName(i)}">当前图层 · ${layerName(i)}</b><button class="shelp" type="button" id="lhHelp" title="这一层怎么调">？</button></div>
    <p class="hint" id="lhHelpText" hidden>下面是这一层的全部参数。改了只重烘这一层，画面仍是整朵；「贴图」视图显示这一层的贴图。颜色（预览材质）改的是这一层在整朵里的颜色。时间轴下面的层轨道上，每一层的入点 / 出点（白色把手）和点火 / 寿命结束 / 火花停止（圆点）都可以直接拖。每层有自己的输出（贴图尺寸、格子、帧数），在下面「输出」一节改；合并输出由整朵统一定。</p>
    ${lib.my || linkedWith(i).length ? `<details class="lh-link-details"><summary>轨迹联动${linkedWith(i).length ? ' · 第 ' + linkedWith(i).map(j => j + 1).join('、') + ' 层' : ' · 关联图层'}</summary>${lib.my ? myLinkHTML(i) : `<p class="lh-link">和第 ${linkedWith(i).map(j => j + 1).join('、')} 层是同一批星——种子、星数、初速、终端速度、重力、随机等决定轨迹的参数改一处，几层一起变。<label class="check"><input type="checkbox" id="lhLinkOff"${state.linkOff ? ' checked' : ''}> 暂时不联动</label></p>`}</details>` : ''}`);
  const pos = document.createElement('details'); pos.className = 'sec lh-position'; pos.open = false; pos.innerHTML = '<summary>位置与时间 · 缩放 / 延迟 / 镜像</summary>'; host.appendChild(pos);
  slider(pos, `lh${i}-scale`, '缩放', '×', 0.1, 6, 0.01, () => L.scale, v => L.scale = v, 1);
  slider(pos, `lh${i}-delay`, '延迟', 's', 0, 10, 0.01, () => L.delay, v => L.delay = v, 0);
  slider(pos, `lh${i}-rate`, '时间倍率', '×', 0.3, 2, 0.01, () => L.rate, v => L.rate = v, 1);
  const mir = document.createElement('label'); mir.className = 'check'; mir.innerHTML = '<input type="checkbox"> 水平镜像';
  const cb = mir.querySelector('input'); cb.checked = !!L.mirror; cb.addEventListener('change', () => L.mirror = cb.checked); pos.appendChild(mir);
  // 4.2.12 导出方案（用户 10-02 20:04：PC 序列 + 粒子、手机纯图片，导出前在图层上选）
  const ex = document.createElement('details'); ex.className = 'sec'; ex.open = true; ex.id = 'lhOut';
  ex.innerHTML = `<summary>导出方案</summary><div class="lh-out"><label class="field">PC<select data-out="pc">${OUT_PC.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label><label class="field">手机<select data-out="mobile">${OUT_MOBILE.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label></div><div id="lhDots"></div><details class="lh-out-info"><summary>随整包导出 · 方案说明</summary><p class="note" id="lhOutNote"></p></details>`;
  host.insertBefore(ex, host.querySelector('.lh-t').nextSibling);
  // 4.2.15 光点的大小 / 亮度（XD2：默认偏大偏亮）：只在 PC 选「光点」时出现；1 = 不写进层（没动过的层和以前逐字一样）
  const dh = ex.querySelector('#lhDots'), dset = k => v => { if (Math.abs(v - 1) < 1e-9) delete L[k]; else L[k] = v; };
  slider(dh, `lh${i}-dotSize`, '光点大小', '× 星头', 0.2, 4, 0.05, () => L.dotSize > 0 ? +L.dotSize : 1, dset('dotSize'), 1);
  slider(dh, `lh${i}-dotBright`, '光点亮度', '×', 0.1, 4, 0.05, () => L.dotBright > 0 ? +L.dotBright : 1, dset('dotBright'), 1);
  const syncOut = () => { const o = layerOut(L), le = layerEntryOf(L); ex.querySelector('[data-out=pc]').value = o.pc; ex.querySelector('[data-out=mobile]').value = o.mobile; $('#lhOutNote').textContent = outNote(L, le); dh.hidden = o.pc !== 'dots';
    const info = ex.querySelector('.lh-out-info'), warn = $('#lhOutNote').textContent.includes('注意：') || (o.pc === 'off' && o.mobile === 'off'); info.open = warn; info.classList.toggle('warn', warn);
    const uo = ex.querySelector('[data-out=pc] option[value=unit]'); if (uo && le) { uo.disabled = !unitAllowed(le.P) && o.pc !== 'unit'; uo.title = unitAllowed(le.P) ? '' : '千轮、分裂、蜂、非球形图案不能出单束'; } };
  ex.querySelectorAll('[data-out]').forEach(sel => sel.addEventListener('change', () => { L.out = { ...layerOut(L), [sel.dataset.out]: sel.value }; if (L.out.pc === 'seq' && L.out.mobile === 'seq') delete L.out; syncOut(); if (stage2.deliv) renderDeliv(); wbSync(); }));
  syncOut();
  host.querySelector('#lhHelp').addEventListener('click', () => { const p = $('#lhHelpText'); p.hidden = !p.hidden; });
  // 4.2.13：以前这里有「导出这一层的单束包」按钮（另出一个包）；单束现在是下面「导出方案」的一个选项，跟着整包导出（走查 B9）
  host.querySelector('#lhBack').addEventListener('click', () => selectComboLayer(-1));
  const lo = host.querySelector('#lhLinkOff'); if (lo) lo.addEventListener('change', () => { state.linkOff = lo.checked; });
  host.querySelectorAll('[data-link]').forEach(cb => cb.addEventListener('change', () => mySetLinked(i, +cb.dataset.link, cb.checked)));
}
function syncComboPanels() {
  const combo = state.tab === 'combo', lay = combo && state.comboSel >= 0;
  if (combo) { $('#pMaster').hidden = !lay; $('#pCombo').hidden = lay; }
  $('#pMaster').classList.toggle('layermode', lay); $('#layerHead').hidden = !lay;
  $('#pCombo').classList.toggle('effmode', combo && (!!(lib.review && lib.review.kind === 'combo') || !!lib.my || /^mt:/.test(lib.key || '')));   // 我的效果、多层花型模板（4.5.5）也不要旧预设（4.2.7）
}

// ---------------- 你的版本（保存 / 切换 / 文件） ----------------
const wb = { key: '', entry: null, src: { kind: 'ai' }, sig: '', arm: 0 };
function wbKey() {
  if (lib.review && lib.review.layerOf) return 'rv:' + lib.review.id;
  if (lib.effect) return 'ef:' + lib.effect.key;
  if (lib.review) return 'rv:' + lib.review.id;
  if (lib.formal) return 'rep:' + lib.formal.id;
  const k = lib.key || '', m = /^mine:(.+):[^:]+$/.exec(k);     // 从左栏「我的版本」打开的：归到原来那个键（组合编辑器 / 花型模板）
  return m ? m[1] : k;
}
function wbBaseId() { return lib.my ? lib.my.name : lib.review ? lib.review.id : lib.formal ? lib.formal.id : lib.key === 'combo' ? '组合编辑器' : mtOpenId() ? MULTI_BY_ID[mtOpenId()].name : state.P.type; }
// 4.5.5：现在打开的是不是多层花型模板（lib.key = 'mt:<id>'，18_multitypes.js）
function mtOpenId() { const m = /^mt:(.+)$/.exec(wbKey()); return m && MULTI_BY_ID[m[1]] ? m[1] : null; }
const wbAll = () => store.get('mySaves', {});
const wbList = () => (wbAll()[wb.key] || []);
function wbPut(list) { const all = wbAll(); all[wb.key] = list; store.set('mySaves', all); }
function wbSnap() {
  if (state.tab === 'combo') return { kind: 'combo', name: state.comboName, layers: state.layers.map(L => { const e = layerEntryOf(L) || {}; const { lib: _l, ...Lr } = L; return { id: e.rep || null, type: e.type || null, L: structuredClone(Lr), P: e.P ? structuredClone(e.P) : null, M: e.M ? structuredClone(e.M) : null }; }) };
  return { kind: 'single', P: structuredClone(state.P), M: structuredClone(state.M), repId: state.repId || null };
}
function wbSig() { try { return JSON.stringify(wbSnap()); } catch (e) { return ''; } }
const wbIdle = () => !state.baking && !state.dirty && !(state.layerQueue && state.layerQueue.size) && $('#busy').hidden && (state.tab !== 'combo' || (state.layers.length && state.layers.every(L => { const e = layerEntryOf(L); return e && e.bake; })));
// 打开 / 换版本后，等烘焙稳定了再记「没改过」的样子（烘焙会自动补一些派生字段，不算你的改动）
function wbArm() {
  const n = ++wb.arm; wb.sig = '';
  const tick = () => { if (n !== wb.arm) return; if (wbIdle()) { wb.sig = wbSig(); wbSync(); if (typeof undoReset === 'function') undoReset(); } else setTimeout(tick, 400); };
  setTimeout(tick, 300);
}
function wbVisible() { return !state.showcase && !!(lib.review ? lib.review.kind !== 'queued' : lib.formal || /^(type:|combo$|my:|tpl:|mt:)/.test(wbKey())); }
function wbRefresh() {
  const k = wbKey();
  if (k !== wb.key || lib.review !== wb.entry) { wb.key = k; wb.entry = lib.review; wb.src = { kind: 'ai' }; wbArm(); }
  wbSync();
}
function wbSync() {
  const bar = $('#assetBar'); bar.hidden = !wbVisible(); $('#versionHistory').hidden = bar.hidden; if (bar.hidden) return;
  const ef = lib.effect, e = lib.review, combo = state.tab === 'combo';
  const mtId = mtOpenId();
  $('#abName').textContent = lib.my ? lib.my.name : lib.tpl ? lib.tpl.name : ef ? ef.名 : e ? e.name : lib.formal ? lib.formal.name : lib.key === 'combo' ? '组合编辑器' : mtId ? MULTI_BY_ID[mtId].name : TYPE_NAMES[state.P.type] || '';
  $('#abSub').textContent = lib.my ? [packNamesFor(wb.key, null, state.layers.length, 'MyFx').base, state.layers.length + ' 层', '我的效果' + (lib.my.from ? ' · 派生自 ' + lib.my.from.name : '')].join(' · ')
    : lib.tpl ? [TYPE_NAMES[lib.tpl.type] || lib.tpl.type, '我的模板'].join(' · ')
    : mtId ? [state.layers.length + ' 层', '多层花型模板'].join(' · ')
    : [wbBaseId(), combo ? state.layers.length + ' 层' : '单层', ef ? ef.阶段 : lib.formal ? '正式库' : e ? '条目' : '花型模板'].join(' · ');
  $('#abMyRename').hidden = $('#abMyDelete').hidden = !lib.my;
  const th = ef && ef.thumb ? `<i style="background-image:url(${ef.thumb})"></i>` : '';
  const thHost = $('#abThumb'); if (thHost.dataset.k !== wb.key) { thHost.dataset.k = wb.key; thHost.innerHTML = th || (e ? thumbHTML(e).replace(/^<span class="th"/, '<span class="th in"') : `<span class="th in" style="${typeThumbStyle(state.P.type)}"></span>`); }
  const list = wbList(), sel = $('#abSrc'), cur = wb.src.kind === 'mine' ? wb.src.id : 'ai';
  const opts = [['ai', lib.my ? `已保存 · ${(myRec() || {}).updated || ''}` : `AI 版 · ${wbBaseId()}`], ...list.map(s => [s.id, s.auto ? `导出时 · ${s.at.slice(5)}${s.label ? ' · ' + s.label : ''}` : `我的 · ${s.name}（${s.at.slice(5)}）`])];
  const html = opts.map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
  if (sel.dataset.h !== html) { sel.innerHTML = html; sel.dataset.h = html; }
  sel.value = cur;
  const changed = !!wb.sig && wbSig() !== wb.sig;
  $('#abChg').hidden = !changed; $('#abChg').textContent = wb.src.kind === 'mine' ? '参数已变 · 未保存到「' + ((list.find(x => x.id === wb.src.id) || {}).name || '') + '」' : '参数已变 · 未保存'; wb.changed = changed;
  $('#abSave').title = lib.my ? '保存当前效果' : '存成你的效果（原来的不动；之后能加层、删层、改名、删除）';
  $('#abSaveAs').title = lib.my ? '另存为新效果，保留当前效果' : '存成你的效果（和「保存」一样）';
  if (typeof syncAssetOps === 'function') syncAssetOps();
  $('#versionSummary').textContent = changed ? '未保存' : wb.src.kind === 'mine' ? '我的版本' : lib.my ? '已保存' : '原始版本';
  $('#versionSummary').classList.toggle('changed', changed);
  $('#abExportPack').disabled = !$('#busy').hidden || state.baking || (combo && !wbIdle());
  $('#abRename').hidden = $('#abDelete').hidden = wb.src.kind !== 'mine';
}
setInterval(() => { if (!document.hidden && !$('#assetBar').hidden) wbSync(); }, 1000);

// 4.2.3（走查 A5）：切走 / 刷新前，没保存的改动自动存成这个效果的「草稿」（每个效果一份，再切走就覆盖），资产栏「版本」里能选回来
function autoDraft() {
  if (!wb.key || !wb.sig || !wbVisible()) return false;
  let sig; try { sig = wbSig(); } catch (e) { return false; }
  if (!sig || sig === wb.sig) return false;
  const list = wbList(); let d = list.find(x => x.draft);
  if (!d) { d = { id: 'draft', name: '草稿（没保存就切走了）', draft: true }; list.push(d); }
  Object.assign(d, { at: wbNow(), base: wbBaseId(), baseVer: lib.review && lib.review.ver || '', from: wb.src.kind === 'mine' ? wb.src.id : 'ai', snap: wbSnap() });
  wbPut(list); wb.sig = sig;
  flash('没保存的改动存成了「草稿」：回到这个效果，在资产栏「版本」里选它');
  return true;
}
if (window.addEventListener) window.addEventListener('beforeunload', () => { try { autoDraft(); } catch (e) { } });
function wbNow() { return new Date().toLocaleString('zh-CN', { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-'); }
function askSaveName(title, note, initial, action = '保存') {
  const dlg = $('#saveNameDlg'), input = $('#saveNameInput');
  $('#saveNameTitle').textContent = title; $('#saveNameNote').textContent = note; $('#saveNameSubmit').textContent = action;
  input.value = initial; dlg.returnValue = 'cancel';
  return new Promise(resolve => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'save' ? input.value.trim() : null), { once: true });
    dlg.showModal(); input.focus(); input.select();
  });
}
async function wbSave(asNew) {
  if (lib.my) return mySave(asNew);                         // 我的效果：保存 = 覆盖这个效果，另存为 = 复制成新效果（4.2.7）
  // 4.5.0（用户 10-05 #7「你制作的效果，我重新调参保存后，我想再增加别的层数，无法增加」）：其它来源保存 = 存成「我的效果（派生自 ×）」
  if (typeof wbDeriveMine === 'function') return wbDeriveMine();
  if (repoDir.h && !repoDir.ok) await repoPerm(true);      // 连过仓库文件夹：先趁这次点击问一下「允许」（浏览器重开后第一次）
  const list = wbList(), mine = wb.src.kind === 'mine' && list.find(s => s.id === wb.src.id);
  let it = !asNew && mine && !mine.draft && !mine.auto && mine;        // 草稿、导出时自动存的不覆盖：存成正式的一个版本（起名字）；草稿删掉
  if (mine && mine.draft && !asNew) list.splice(list.indexOf(mine), 1);
  if (!it) {
    const name = await askSaveName(asNew ? '另存为新版本' : '保存我的版本', '保存当前全部图层和参数，原始版本保留。版本存在这台电脑；连接仓库文件夹后会同时写入文件。', `我的 ${list.length + 1}`, asNew ? '另存为' : '保存');
    if (name == null) return;
    it = { id: Date.now().toString(36), name: name.trim() || `我的 ${list.length + 1}` }; list.push(it);
  }
  Object.assign(it, { at: wbNow(), base: wbBaseId(), baseVer: lib.review && lib.review.ver || '', snap: wbSnap() });
  wbPut(list); wb.src = { kind: 'mine', id: it.id }; wb.sig = wbSig(); wbSync(); renderLib();
  let path = null; try { path = await repoWrite(wb.key, it); } catch (e) { flash('存进仓库文件夹失败：' + (e.message || e), true); return; }
  flash(path ? `已保存「${it.name}」：浏览器里一份 + 仓库 ${path.replace(/^analysis\/我的配方\/_待上传\//, 'analysis/我的配方/')}（后台脚本推上去，AI 能直接读）`
    : `已保存「${it.name}」（这台电脑的浏览器里；资产栏 ⋯「连接仓库文件夹」后会顺便存进 git，AI 能直接读）`);
}
// 4.2.10 版本只留一套（走查 B8）：导出时在这个效果的「版本」里自动存一份（以前存在工具页「版本与回滚」，全局一个列表，回滚会把别的效果的参数塞进来）。
// 每个效果只留最近 3 份；不进左栏「我的版本」；不写仓库文件夹（那是你主动保存的）。
const WB_AUTO_MAX = 3;
function wbAutoExport(label) {
  try {
    const list = wbList(), it = { id: 'x' + Date.now().toString(36), name: '导出时', auto: 'export', label: String(label || ''), at: wbNow(), base: wbBaseId(), baseVer: lib.review && lib.review.ver || '', snap: wbSnap() };
    list.push(it); const autos = list.filter(s => s.auto); for (const s of autos.slice(0, Math.max(0, autos.length - WB_AUTO_MAX))) list.splice(list.indexOf(s), 1);
    wbPut(list); wbSync();
  } catch (e) { console.warn('导出时存版本失败', e); }
}
// 回到 AI 版：丢掉这个效果里调过的层，重新打开条目
async function wbLoadAI() {
  if (lib.my) { await openMyEffect(lib.my.id, { keep: true }); wb.src = { kind: 'ai' }; wbArm(); wbSync(); return; }   // 我的效果：回到已保存的样子
  const e = lib.review;
  if (state.layerEdits) {
    const ids = e && e.kind === 'combo' ? e.layerIds || [] : e ? [e.id] : [];
    for (const id of ids) { delete state.layerEdits[id]; const le = state.lib.find(x => x.rep === id); if (le && le.editSig) { dropLibBake(le); state.lib.splice(state.lib.indexOf(le), 1); } }
  }
  if (e) await openReview(e, lib.effect); else if (lib.formal) openFormal(lib.formal, lib.effect); else if ((lib.key || '').startsWith('type:')) openType(lib.key.slice(5)); else if (mtOpenId()) await openMultiType(mtOpenId());
  wb.src = { kind: 'ai' }; wbArm(); wbSync();
}
async function wbLoad(id) {
  if (id === 'ai') return wbLoadAI();
  const s = wbList().find(x => x.id === id); if (!s) return;
  await wbApply(s.snap); wb.src = { kind: 'mine', id }; wbArm(); wbSync(); flash(`正在看你的版本「${s.name}」`);
}
async function wbApply(snap) {
  bakeMode.demand = true;          // 4.2.16：换版本 / 恢复 = 打开，照常烘（自动烘焙关也烘）
  if (snap.kind === 'combo') {
    if (state.tab !== 'combo') { flash('这个版本是多层效果，当前打开的是单层', true); return; }
    state.layerEdits = state.layerEdits || {};
    for (const x of snap.layers) if (x.id && x.P) state.layerEdits[x.id] = { P: structuredClone(x.P), M: structuredClone(x.M) };
    state.comboSel = -1; syncComboPanels();
    await applyCombo({ name: snap.name || state.comboName, layers: snap.layers.map(x => ({ ...(x.id ? { m: 'rep:' + x.id } : x.P ? { src: { type: x.type, P: x.P, M: x.M } } : { m: x.type }), ...structuredClone(x.L) })) });
  } else {
    if (state.tab === 'combo') { flash('这个版本是单层，当前打开的是多层效果', true); return; }
    state.P = migrate37(structuredClone(snap.P)); state.M = structuredClone(snap.M); state.repId = snap.repId || state.repId;
    buildMasterPanel(); onParam();
  }
}
// 和 AI 版比，列出改动（层 / 参数：旧 → 新），发给 AI 用
function wbDiff() {
  const out = [], fmt = v => typeof v === 'number' ? +v.toFixed(4) : JSON.stringify(v);
  const cmp = (a, b, pre) => { for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) { if (k === 'lib') continue; const x = (a || {})[k], y = (b || {})[k]; if (JSON.stringify(x) !== JSON.stringify(y)) out.push(`${pre}${k}：${fmt(x)} → ${fmt(y)}`); } };
  const e = lib.review;
  if (state.tab === 'combo' && e && e.kind === 'combo') {
    state.layers.forEach((L, i) => {
      const le = layerEntryOf(L), id = le && le.rep, oL = (e.combo.layers || [])[i] || {}, nm = `第 ${i + 1} 层（${layerName(i)}${id ? ' · ' + id : ''}）`;
      const { m: _m, ...o } = oL, base = newLayer({ M: (id && REPLICA_BY_ID[id] ? replicaPM(id).M : le.M) }, structuredClone(o));
      const { lib: _l, ...cur } = L; delete base.lib; cmp(base, cur, nm + ' 整朵 · ');
      if (id && REPLICA_BY_ID[id]) cmp(replicaPM(id).P, le.P, nm + ' 参数 · ');
    });
  } else {
    const id = state.repId, base = id && REPLICA_BY_ID[id] ? replicaPM(id) : defaultsFor(state.P.type);
    cmp(base.P, state.P, '参数 · '); cmp(base.M, state.M, '颜色 · ');
  }
  return out;
}
async function wbCopyDiff() {
  const d = wbDiff(), nm = $('#abName').textContent;
  const t = d.length ? `${nm}（基于 ${wbBaseId()}，版本 ${(lib.review && lib.review.ver) || '—'}）我改过的地方：\n` + d.map(x => '- ' + x).join('\n') : '';
  if (!t) { flash('和 AI 版比没有改动'); return; }
  let ok = false; try { await navigator.clipboard.writeText(t); ok = true; } catch (e) { }
  $('#updList').innerHTML = `<section class="upd-it new"><h3>我的改动${ok ? '（已复制，直接粘贴到对话里）' : '（请手动全选复制）'}</h3><pre style="white-space:pre-wrap;font:12.5px/1.6 var(--mono)">${t.replace(/</g, '&lt;')}</pre></section>`;
  $('#updDlg').hidden = false;
}
function wbExportFile() {
  const s = wb.src.kind === 'mine' ? wbList().find(x => x.id === wb.src.id) : null;
  const doc = { format: 'fwl.recipe/1', key: wb.key, name: s ? s.name : 'AI 版', base: wbBaseId(), baseVer: lib.review && lib.review.ver || '', at: wbNow(), baker: VERSION, snap: wbSnap(), changes: wbDiff() };
  const fn = `${(wbBaseId() + '_' + doc.name).replace(/[\\/:*?"<>| ]+/g, '_')}.json`;
  download(new Blob([JSON.stringify(doc, null, 1)], { type: 'application/json' }), fn); flash('已导出配方文件 ' + fn);
}
function wbImportFile(file) {
  const rd = new FileReader();
  rd.onload = async () => {
    try {
      const doc = JSON.parse(rd.result); if (doc.format !== 'fwl.recipe/1' || !doc.snap) throw new Error('不是烘焙器导出的配方文件');
      if ((doc.snap.kind === 'combo') !== (state.tab === 'combo')) throw new Error(doc.snap.kind === 'combo' ? '这是多层效果的配方，请先打开那个效果' : '这是单层的配方，当前打开的是多层效果');
      const list = wbList(), it = { id: Date.now().toString(36), name: (doc.name || '导入') + '（导入）', at: wbNow(), base: doc.base, baseVer: doc.baseVer, snap: doc.snap };
      list.push(it); wbPut(list); renderLib(); await wbLoad(it.id);
    } catch (e) { flash('导入失败：' + e.message, true); }
  };
  rd.readAsText(file);
}
function initWorkbench() {
  if (typeof bindUndo === 'function') bindUndo();
  $('#abSrc').addEventListener('change', e => wbLoad(e.target.value));
  $('#abSave').addEventListener('click', () => wbSave(false));
  $('#abSaveAs').addEventListener('click', () => wbSave(true));
  $('#abExportPack').addEventListener('click', exportCurrentPack);
  $('#abUndo').innerHTML = uiIcon('arrow-back-up'); $('#abRedo').innerHTML = uiIcon('arrow-forward-up');
  $('#abUnit > summary').innerHTML = uiIcon('chevron-down');
  initStage();
  const close = () => document.querySelectorAll('.ab-more[open]').forEach(m => m.open = false);
  $('#abCopyDiff').addEventListener('click', () => { close(); wbCopyDiff(); });
  $('#abRepo').addEventListener('click', () => { close(); repoMenu(); });
  $('#abMyRename').addEventListener('click', () => { close(); myRename(); });
  $('#abMyDelete').addEventListener('click', () => { close(); if (lib.my) removeMyFx(lib.my.id); });
  initAssetOps();
  repoInit();
  $('#abExportFile').addEventListener('click', () => { close(); wbExportFile(); });
  $('#abImportFile').addEventListener('click', () => { close(); $('#abFile').click(); });
  $('#abFile').addEventListener('change', e => { const f = e.target.files[0]; if (f) wbImportFile(f); e.target.value = ''; });
  $('#abRename').addEventListener('click', () => { close(); const list = wbList(), s = list.find(x => x.id === wb.src.id); if (!s) return; const n = prompt('新名字', s.name); if (n == null) return; s.name = n.trim() || s.name; wbPut(list); wbSync(); renderLib(); });
  $('#abDelete').addEventListener('click', () => { close(); if (wb.src.kind === 'mine') removeVersion(wb.key, wb.src.id); });
  $('#pReview').addEventListener('click', e => { const n = e.target.closest('.rnote'); if (n) n.classList.toggle('full'); });
  document.addEventListener('click', e => { document.querySelectorAll('.ab-more[open]').forEach(m => { if (!m.contains(e.target)) m.open = false; }); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}


// =====================================================================
//  画面区（按用户的浏览器草稿，2026-10-02 08:36 用户要求交互一次做完）：
//  画面标题（看的是哪个版本 · 哪个视图 · 整体 / 哪一层）、画面工具（构图网格 / 记录当前帧 / 展开大画面）、
//  画面脚注（平台 · 单格 · 帧数 · 张数 | 30 fps · tick）、时间轴（±1 tick、循环 / 播放一遍、开花 / 展开 / 衰减、每层时段条）、
//  查看交付（素材包里的每个文件：层、段、平台、单格、延迟）、通过门槛（独看 / 静音、显示曝光、改过参数时不能通过）
// =====================================================================
const stage2 = { deliv: false, tlSig: '', last: 0 };
const VIEW_NAMES = { live: '实时模拟', export: '引擎回放', atlas: '贴图' };
// 流转仍是贴图视图的播放方式；交付清单是覆盖页，不给渲染器增加新的视图状态。
function syncStageTabs() {
  const view = stage2.deliv ? 'delivery' : state.view === 'atlas' && state.atlasFlow ? 'flow' : state.view;
  $('#viewSeg').querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  $('#flowSeg').querySelectorAll('[data-flow]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.flow === '1') === !!state.atlasFlow)));
}
function selectStageView(view) {
  if (view === 'delivery') { toggleDeliv(true); return; }
  toggleDeliv(false);
  state.view = view === 'flow' ? 'atlas' : view;
  if (state.view === 'atlas') { state.atlasFlow = view === 'flow'; flowTrail.length = 0; $('#qlabels').dataset.key = ''; }
  if (state.view !== 'live') bakeIfStale();
  syncStale(); syncStageTabs();
}
function exportCurrentPack() {
  if (!$('#busy').hidden || state.baking) return;
  if (state.tab === 'combo') { if (wbIdle()) exportCombo(); else flash('请等所有图层烘焙完成后导出', true); }
  else $('#btnExport').click();
}
function curLayerBakes() {
  if (state.tab === 'combo') return state.layers.map((L, i) => { const e = layerEntryOf(L); return { i, L, e, b: e && e.bake, name: layerName(i) }; });
  return [{ i: 0, L: { delay: 0, rate: 1, scale: 1 }, e: null, b: state.bake, name: state.repId ? (REPLICA_BY_ID[state.repId] || {}).name || state.name : TYPE_NAMES[state.P.type] }];
}
function srcLabel() {
  if (!wbVisible()) return '';
  const s = wb.src.kind === 'mine' && wbList().find(x => x.id === wb.src.id);
  return (s ? `我的「${s.name}」` : lib.my ? `我的效果「${lib.my.name}」` : `AI 版 ${wbBaseId()}`) + (wb.changed ? ' · 参数已变' : '');     // 4.3.3：自己搭的效果不写「AI 版」
}
function scopeLabel() {
  if (state.tab !== 'combo') return '';
  const v = state.layerView;
  if (state.view === 'atlas') return ` · 第 ${comboAtlasLayer() + 1} 层贴图`;
  if (v.solo >= 0) return ` · 独看第 ${v.solo + 1} 层（仅观察）`;
  if (v.mute.length) return ` · 静音 ${v.mute.map(i => i + 1).join('、')} 层（仅观察）`;
  return state.comboSel >= 0 ? ` · 整体（正在调第 ${state.comboSel + 1} 层）` : ' · 整体 · 全部层';
}
function specLabel() {
  const plat = state.platform === 'mobile' ? '手机' : 'PC';
  const bs = curLayerBakes().filter(x => x.b), pick = state.tab === 'combo' ? bs.find(x => x.i === comboAtlasLayer()) || bs[0] : bs[0];
  if (!pick) return plat + ' · 还没烘好';
  const b = previewBake(pick.b) || pick.b, parts = bakeParts(b), F = parts.reduce((n, s) => n + s.meta.L.F, 0), L = b.meta.L;
  return `${plat} · 单格 ${Math.round(L.cellW)} px · ${F} 帧 · ${parts.length} 张${state.tab === 'combo' ? `（第 ${pick.i + 1} 层）` : ''}`;
}
// 开花 / 展开 / 衰减：取主层（最大的一层）的帧预算：展开 = 开始淡出的时刻（花开到最大），衰减 = 淡出段中间
function jumpTimes() {
  const xs = curLayerBakes().filter(x => x.b && x.b.meta);
  if (!xs.length) { const D = curDuration(); return { open: 0, full: 0.4 * D, fade: 0.75 * D }; }
  const main = xs.reduce((a, x) => ((+x.L.scale || 1) > (+a.L.scale || 1) ? x : a), xs[0]), m = main.b.meta, r = +main.L.rate || 1, d = +main.L.delay || 0;
  const end = bakeTotal(main.b), fa = m.budget && isFinite(m.budget.fadeAt) ? m.budget.fadeAt : 0.6 * end;
  return { open: d, full: d + fa / r, fade: d + (fa + (end - fa) / 2) / r };
}
// 时段条：每层一条。实色 = 贴图在播（入点 → 出点），斜纹 = 入点前放大（停在第 0 帧），淡色 = 整段可见范围（剔掉全黑帧后）；
// 下面一行是入点 / 出点按钮（单层直接用；多层要先在观察图层选一层）
function editLayerP() { if (state.tab !== 'combo') return state.tab === 'master' && usesTickPlan40(state.P) ? state.P : null; const L = state.layers[state.comboSel], e = L && layerEntryOf(L); return e && usesTickPlan40(e.P) ? e.P : null; }
function layerSpans(x) {
  const m = x.b && x.b.meta; if (!m) return null;
  const r = +x.L.rate || 1, d = +x.L.delay || 0, t0 = m.t0 || 0, pre = m.pre;
  // 4.5.3：贴图还是旧参数（自动烘焙关、改了序列时长 / 入出点还没按 B）时，轨道按现在的参数画，不再停在旧贴图的长度
  const Pc = layerPOf(x), stale = !!(Pc && x.b.P && ['duration', 'cutIn', 'cutOut'].some(k => Math.abs((+x.b.P[k] || 0) - (+Pc[k] || 0)) > 1e-6));
  const end = stale ? (+Pc.cutOut > 0 ? Math.min(+Pc.cutOut, +Pc.duration) : +Pc.duration) : bakeTotal(x.b);
  const vis = stale ? [+Pc.cutIn > 0 ? +Pc.cutIn : (pre ? pre.from : t0), end] : m.vis || [pre ? pre.from : t0, end];
  return { d, r, t0, end, pre, vis, at: t => d + t / r };
}
// 层轨道（用户 2026-10-02 13:09 a：接力关系藏在每层的参数里，找不到）：把决定「这一层什么时候亮、什么时候停」的参数画在时段条上，
// 可编辑的那一层（单层 / 观察图层里选中的层）能直接拖。时间都是这一层自己的时间（相对开花），画的时候按组合延迟 / 时间倍率换到总时间。
// 每层同一套时刻（4.2.0，用户 16:22「为什么只有橙引线才有停止拖动？这才是应有的组合修改体验」）：
//   上排圆点 = 星：点火、燃烧结束（第二段结束、星头压暗到、光丝熄灭有才显示）；
//   中间菱形 = 火花：火花开始、火花停——没开的也画在默认位置（空心：开始 = 点火、停 = 燃烧结束），拖动就打开，拖回默认位置就关掉。
// auto = 默认位置（空心），不和别的层粘在一起。
function phasesOf(P) {
  if (!P || familyOf(P.type) !== 'aerial') return [];
  const ign = +P.ignDelay || 0, burnEnd = ign + (+P.burn || 0), after = +P.afterBurn > 0, lifeEnd = burnEnd + (after ? +P.afterBurn : 0);
  const r2 = v => Math.round(v * 100) / 100, out = [], igOf = () => +P.ignDelay || 0;
  out.push({ k: 'ign', row: 's', t: ign, lab: '点火延迟', set: t => P.ignDelay = r2(Math.max(0, t)) });
  // 燃烧结束拖到火花停之前：火花停跟着收到燃烧结束（仍是打开的，接力关系不断）
  out.push({ k: 'burn', row: 's', t: burnEnd, lo: ign + 0.05, lab: after ? '主段结束（第二段从这里亮）' : '寿命结束', set: t => { P.burn = r2(Math.max(0.05, t - igOf())); if (+P.sparkStop > 0 && +P.sparkStop > P.burn) P.sparkStop = P.burn; if (+P.sparkStart > 0 && +P.sparkStart > P.burn - 1 / 15) P.sparkStart = r2(Math.max(0, P.burn - 1 / 15)); } });
  if (after) out.push({ k: 'after', row: 's', t: lifeEnd, lab: '第二段结束', set: t => P.afterBurn = r2(Math.max(0.05, t - igOf() - (+P.burn || 0))) });
  if (+P.headDim < 1 && +P.headDimUntil > 0) out.push({ k: 'dim', row: 's', t: +P.headDimUntil, lab: '前段结束', set: t => P.headDimUntil = r2(Math.max(0.05, t)) });
  if (+P.emberFrac > 0 && +P.emberEnd > 0) out.push({ k: 'ember', row: 's', t: +P.emberEnd, lab: '余烬熄灭时刻', set: t => P.emberEnd = r2(Math.max(0.05, t)) });
  if (+P.sparkRate > 0 || +P.emberFrac > 0) {
    const ss = +P.sparkStart || 0, st = +P.sparkStop || 0, endNow = () => (+P.burn || 0) + (+P.afterBurn > 0 ? +P.afterBurn : 0);
    out.push({ k: 'sstart', row: 'f', t: ign + ss, auto: !(ss > 0), lab: ss > 0 ? '火花开始时刻' : '火花开始时刻（= 点火，拖动就打开）',
      lo: ign, hi: (st > 0 ? ign + st : lifeEnd) - 1 / 15,
      set: t => { const v = t - igOf(); P.sparkStart = v < 1 / 30 ? 0 : r2(Math.min(v, (+P.sparkStop > 0 ? +P.sparkStop : endNow()) - 1 / 15)); } });
    // 火花停：没打开时（空心）只能往前拖；打开以后往后拖过燃烧结束，燃烧结束跟着往后推（保持原来星头比火花多亮的那一小段）
    out.push({ k: 'sstop', row: 'f', t: st > 0 ? ign + st : lifeEnd, auto: !(st > 0), lab: st > 0 ? '火花停止时刻' : '火花停止时刻（= 寿命结束，拖动就打开）',
      lo: ign + ss + 1 / 15, hi: st > 0 ? Infinity : lifeEnd,
      set: t => { const v = t - igOf(), was = +P.sparkStop || 0;
        if (!(was > 0)) { P.sparkStop = v >= endNow() - 1 / 30 ? 0 : r2(Math.max((+P.sparkStart || 0) + 1 / 15, 0.05, v)); return; }
        const gap = Math.max(0, endNow() - was); P.sparkStop = r2(Math.max((+P.sparkStart || 0) + 1 / 15, 0.05, v));
        if (P.sparkStop + gap > endNow()) P.burn = r2(P.sparkStop + gap - (+P.afterBurn > 0 ? +P.afterBurn : 0)); } });
  }
  return out;
}
// 这一层最后看得见的时刻（估算）：星头燃尽、火花 / 光丝寿命走完。拖时刻时序列时长跟着平移这么多（用户 16:22 第 4 条）
function layerEndOf(P) {
  const ign = +P.ignDelay || 0, head = ign + (+P.burn || 0) + (+P.afterBurn > 0 ? +P.afterBurn : 0);
  const life = (+P.sparkLife || 0) * Math.max(1, +P.sparkLifeEnd || 1);
  const spark = +P.sparkRate > 0 ? (+P.sparkStop > 0 ? ign + +P.sparkStop : head) + life : 0;
  const ember = +P.emberFrac > 0 ? (+P.emberEnd > 0 ? +P.emberEnd : head + (+P.emberLife || 0)) : 0;
  return Math.max(head, spark, ember);
}
function followDuration(P, end0) {
  const d = layerEndOf(P) - end0; if (Math.abs(d) < 1e-3) return 0;
  const dur = clamp(+(+P.duration + d).toFixed(3), 0.8, 16), dd = dur - P.duration; P.duration = dur;     // 3 位小数：滑杆连续拖时一步步累加，不能每步舍到 0.01
  if (+P.cutOut > 0) P.cutOut = +Math.min(+P.cutOut + (+P.cutOut >= P.duration - dd - 0.05 ? dd : 0), P.duration).toFixed(4);
  if (+P.visTo > 0) P.visTo = +clamp(+P.visTo + dd, 0, P.duration).toFixed(4);
  return dd;
}
function layerPOf(x) { return state.tab === 'combo' ? x.e && x.e.P : state.P; }
// ---- 4.2.9 滑杆、数值框、轨道拖动同一套时间规则（走查 B10–B11） ----
// 改「什么时候亮 / 停」的参数，不管是拖轨道上的点还是拖右栏滑杆：
//   ① 序列时长跟着这一层最后看得见的时刻平移（以前只有拖才这样，滑杆改燃烧会把星截掉）；
//   ② 和同一批星的另一层粘在同一时刻的点一起动（接力：引线火花停 = 锦点火）；
//   ③ 点火推后 / 提前，入点（和入点前放大的起点）跟着平移——入出点是这一层自己的时间，内容整体挪了，入点也要挪。
const PHASE_KEY = { ignDelay: 'ign', burn: 'burn', afterBurn: 'after', sparkStart: 'sstart', sparkStop: 'sstop', headDimUntil: 'dim', emberEnd: 'ember' };
const TIMING_KEYS = new Set([...Object.keys(PHASE_KEY), 'sparkLife', 'sparkLifeEnd', 'emberLife']);
function followIgn(P, d) {
  if (+P.cutIn > 0) P.cutIn = +Math.max(0, +P.cutIn + d).toFixed(4);
  if (P.preFrom != null && +P.preFrom >= 0) P.preFrom = +Math.max(0, +P.preFrom + d).toFixed(4);
}
// 4.5.0（用户 10-05 #17「出入点与锦层出现时间似乎是无法调整的……参数能让我可控都让我可控」）：两条自动规则做成看得见、能关的开关（时间轴下面一行）：
//   state.followOff：改时间点时序列时长 / 入点不跟着走；state.glueOff：同一批星的几层在同一时刻的点不再一起动（各改各的）
state.followOff = !!store.get('tlFollowOff', false); state.glueOff = !!store.get('tlGlueOff', false);
function timingEdit(P, li, apply) {
  if (!P || familyOf(P.type) !== 'aerial') { apply(); return { dd: 0, moved: new Set() }; }
  const x = curLayerBakes().find(r => r.i === li), sp = x && layerSpans(x);
  const glue0 = sp ? phasesOf(P).filter(z => !z.auto).map(z => ({ k: z.k, at: sp.at(z.t), partners: gluePartners(li, sp.at(z.t)) })).filter(z => z.partners.length) : [];
  const end0 = layerEndOf(P), ign0 = +P.ignDelay || 0;
  apply();
  const di = (+P.ignDelay || 0) - ign0; if (Math.abs(di) > 1e-9 && !state.followOff) followIgn(P, di);
  const dd = state.followOff ? 0 : followDuration(P, end0), moved = new Set();
  if (sp) {
    const ph1 = phasesOf(P);
    for (const g0 of glue0) {
      const z1 = ph1.find(z => z.k === g0.k); if (!z1 || z1.auto) continue;
      const at1 = sp.at(z1.t); if (Math.abs(at1 - g0.at) < 1e-3) continue;
      for (const g of g0.partners) { const e0 = layerEndOf(g.P), i0 = +g.P.ignDelay || 0; g.q.set((at1 - g.sp.d) * g.sp.r); const d2 = (+g.P.ignDelay || 0) - i0; if (!state.followOff) { if (Math.abs(d2) > 1e-9) followIgn(g.P, d2); followDuration(g.P, e0); } moved.add(g.i); }
    }
  }
  return { dd, moved };
}
// 右栏滑杆 / 数值框改时间参数：换算成轨道上那个点的时刻，走和拖动完全一样的 set（燃烧结束收到火花停前面时火花停也收、火花停推过燃烧结束时燃烧结束跟着推…）
function setTimingParam(k, v) {
  const P = state.P, li = state.tab === 'combo' ? state.comboSel : 0, pk = PHASE_KEY[k];
  const q = pk && phasesOf(P).find(z => z.k === pk), ign = +P.ignDelay || 0;
  const at = { ign: v, burn: ign + v, after: ign + (+P.burn || 0) + v, sstart: ign + v, sstop: ign + v, dim: v, ember: v }[pk];
  const before = JSON.stringify([P.duration, P.cutIn, P.cutOut, P.burn, P.sparkStart, P.sparkStop]);
  const { moved } = timingEdit(P, li, () => { if (q && !(pk === 'sstart' && !(v > 0)) && !(pk === 'sstop' && !(v > 0))) q.set(at); else P[k] = v; });
  if (JSON.stringify([P.duration, P.cutIn, P.cutOut, P.burn, P.sparkStart, P.sparkStop]) !== before) refreshPanelValues();
  onParam();
  if (moved.size) { for (const j of moved) { const e2 = state.layers[j] && state.lib.find(x => x.name === state.layers[j].lib); if (e2) queueLayerBake(e2); } stage2.tlSig = ''; }
}
// 「恢复」= 回到打开时的版本（AI 版 / 你保存的版本，wbArm 记下的样子），不是花型模板默认（走查 B12）；多层时只恢复正在调的这一层
function putObj(o, v) { for (const k of Object.keys(o)) delete o[k]; Object.assign(o, structuredClone(v)); }
function resetToOpened() {
  let s = null; try { s = wb.sig ? JSON.parse(wb.sig) : null; } catch (e) { }
  if (!s) { setType(state.P.type); flash('还没记下打开时的样子：恢复成花型模板默认'); return; }
  if (s.kind !== 'combo') { if (state.tab === 'combo') return; wbApply(s); flash('已恢复到打开时的参数'); return; }
  if (state.tab !== 'combo') return;
  if (state.comboSel < 0) { wbApply(s); flash('已恢复到打开时（所有层）'); return; }
  const x = s.layers[state.comboSel], e = layerEntryOf(state.layers[state.comboSel]);
  if (!x || !e || !x.P) { flash('这一层是打开以后加的，没有「打开时」的样子', true); return; }
  // 4.2.16（10-03 复现）：按时间规则恢复——和这一层粘在同一时刻的另一层（接力：引线火花停 = 锦点火）跟着回去；之后这一层再按快照逐字放回
  const { moved } = timingEdit(e.P, state.comboSel, () => { putObj(e.P, x.P); derive(e.P); });
  putObj(e.P, x.P); if (x.M && e.M) putObj(e.M, x.M); derive(e.P);
  buildMasterPanel(); onParam();
  for (const j of moved) { const e2 = layerEntryOf(state.layers[j]); if (e2) queueLayerBake(e2); }
  if (moved.size) stage2.tlSig = '';
  flash(`已把第 ${state.comboSel + 1} 层恢复到打开时的参数${moved.size ? `（接力的第 ${[...moved].map(j => j + 1).join('、')} 层跟着回去）` : ''}`);
}
// 4.4.1 的「发射器行」（每个发射器一行生成 / 寿命 / ✂）和 4.2.18 的曲线视图 4.5.0 删掉了（用户 10-05 01:28 #4：「新增的时间轴没什么用，而且影响我笔记本画布屏占比」）。
// 底部只留：刻度 + 每层一条轨道（阶段点、入点 / 出点把手、帧刻度）+ 一行入出点按钮。序列被切掉的提示仍在「效果 › 规格 › 火花灭完」。
function buildTlBars() {
  if (stage2.drag) return;   // 拖动中不重建（否则手上的把手被换掉，拖到一半断开）
  const D = curDuration(), rows = curLayerBakes(), P = editLayerP();
  const sig = D.toFixed(3) + '|' + rows.map(x => { const sp = layerSpans(x), lp = layerPOf(x); return [x.name, sp ? [sp.d, sp.r, sp.t0, sp.end, sp.pre ? sp.pre.from : '', sp.vis].join('/') : '-', state.tab !== 'combo' || layerShown(x.i), state.comboSel, phasesOf(lp).map(q => q.t.toFixed(2)).join(':'), lp ? [lp.cutIn, lp.cutOut].join('/') : '', x.b ? bakeParts(x.b).map(s => (s.meta.L && s.meta.L.F) + '@' + (s.meta.t0 || 0).toFixed(3)).join('+') : ''].join(','); }).join(';') + '|' + state.tab + '|' + (P ? [P.cutIn, P.cutOut, P.preRoll].join('/') : '-') + '|' + state.layerView.solo + '/' + state.layerView.mute.join(',') + '|' + state.followOff + state.glueOff;
  if (sig === stage2.tlSig) return; stage2.tlSig = sig;
  const host = $('#tlBars');
  if (state.tab === 'asset' || state.showcase || !rows.length) { host.innerHTML = ''; return; }
  const glued = gluedPhases(rows);
  const pct = t => clamp(t / D * 100, 0, 100), seg = (a, b, cls, title) => b > a ? `<i class="${cls}" style="left:${pct(a)}%;width:${Math.max(0.3, pct(b) - pct(a))}%"${title ? ` title="${title}"` : ''}></i>` : '';
  const step = Math.max(1, Math.ceil(D / 12)), ticks = Array.from({ length: Math.floor(D / step) + 1 }, (_, i) => i * step);
  const ruler = `<header class="tlr"><span>图层与时间</span><div class="tlr-track" title="点刻度跳到对应时间">${ticks.map(t => `<span style="left:${pct(t)}%">${t}s</span>`).join('')}</div></header>`;
  host.innerHTML = ruler + rows.map(x => {
    const sp = layerSpans(x), on = state.tab !== 'combo' || layerShown(x.i), sel = state.tab === 'combo' && state.comboSel === x.i, lp = layerPOf(x);
    const bars = !sp ? '' : seg(sp.at(sp.vis[0]), sp.at(sp.vis[1]), 'vis', '整段可见范围（全黑帧已剔掉）')
      + (sp.pre ? seg(sp.at(sp.pre.from), sp.at(sp.t0), 'pre', `入点前：第 1 帧从 ${Math.round(sp.pre.keys[0][1] * 100)}% 放大`) : '')
      + seg(sp.at(sp.t0), sp.at(sp.end), 'main', `贴图在播：${sp.t0.toFixed(2)} – ${sp.end.toFixed(2)} s（这一层自己的时间）`);
    const cutOK = sp && lp && usesTickPlan40(lp) && !(sp.vis[1] - sp.vis[0] < 0.2);
    const cuts = !cutOK ? '' : [['in', sp.t0, '入点', +lp.cutIn > 0], ['out', sp.end, '出点', +lp.cutOut > 0]].map(([k, t, lab, set]) => `<b class="cut cut-${k}${set ? ' set' : ''}" data-cut2="${k}" data-li="${x.i}" style="left:${pct(sp.at(t))}%" title="${lab}：${t.toFixed(2)} s${set ? '' : '（自动）'}——左右拖动修改；拖回尽头 = 自动"></b>`).join('');
    const ph = sp ? phasesOf(lp).map(q => `<b class="ph ph-${q.k} row-${q.row}${q.auto ? ' auto' : ''}${glued.has(x.i + ':' + q.k) ? ' glued' : ''}" data-ph="${q.k}" data-li="${x.i}" style="left:${pct(sp.at(q.t))}%" title="${q.lab}：${q.t.toFixed(2)} s（左右拖动修改${glued.has(x.i + ':' + q.k) ? '；和同一批星的另一层在同一时刻，一起动' : ''}）"></b>`).join('') : '';
    // 帧刻度：每一帧从哪个 tick 开始（密 = 帧率高）；换张的地方刻度长一点
    const comb = !sp || !x.b ? '' : bakeParts(x.b).map((s, pi) => (s.meta.times || []).map((t, f) => `<i class="fc${f === 0 && pi > 0 ? ' pg' : ''}" style="left:${pct(sp.at((s.meta.t0 || 0) + t))}%"></i>`).join('')).join('');
    const combo = state.tab === 'combo', mute = state.layerView.mute.includes(x.i), solo = state.layerView.solo === x.i;
    return `<div class="tlb${on ? '' : ' off'}${sel ? ' sel' : ''}"><div class="tlb-label"><span class="tlb-number">${x.i + 1}</span>${combo ? `<button class="tlb-observe" type="button" data-track-mute="${x.i}" aria-label="显示第 ${x.i + 1} 层" aria-pressed="${!mute}" title="${mute ? '显示' : '隐藏'}这一层（只影响观察）">${uiIcon(mute ? 'eye-off' : 'eye')}</button>` : ''}<button type="button" class="tlb-n" data-i="${x.i}" title="点一下切换图层参数">${x.name}</button>${combo ? `<button class="tlb-observe solo" type="button" data-track-solo="${x.i}" aria-label="独看第 ${x.i + 1} 层" aria-pressed="${solo}" title="独看这一层（只影响观察）">S</button>` : ''}</div><span class="tlb-t" data-i="${x.i}">${bars}<span class="fcs">${comb}</span>${ph}${cuts}</span></div>`;
  }).join('') + '<span class="tlb-ph" aria-hidden="true"></span>'
    + (P || state.tab === 'combo' ? `<div class="tlcut" title="轨道上：上排圆点 = 星（点火、燃烧结束…），菱形 = 火花（开始、停；空心 = 默认位置，拖动就打开），白色把手 = 入点 / 出点，都能左右拖；细刻度 = 每一帧从哪个 tick 开始">${P ? `<button type="button" class="mini" data-cut="in" title="把当前时刻设成入点：帧从这里开始">设为入点</button><button type="button" class="mini" data-cut="out" title="把当前时刻设成出点">设为出点</button><button type="button" class="mini" data-cut="clear">清除</button>
      <span>入点 ${+P.cutIn > 0 ? (+P.cutIn).toFixed(2) + ' s' : '自动'} · 出点 ${+P.cutOut > 0 ? (+P.cutOut).toFixed(2) + ' s' : '自动'}${+P.cutIn > 0 ? ' · 入点前' + (+P.preRoll === 0 ? '不显示' : '从小放大') : ''}</span>` : '<span>点一层的轨道或名字改那一层的入点 / 出点</span>'}
      <label class="check tlopt" title="开：拖 / 改点火、燃烧结束这些时间点时，序列时长跟着这一层最后看得见的时刻伸缩，入点跟着点火平移。关：只改你动的那个参数"><input type="checkbox" data-tlopt="follow"${state.followOff ? '' : ' checked'}> 时长 / 入点跟着走</label>${state.tab === 'combo' && (state.links || []).length ? `<label class="check tlopt" title="开：同一批星的几层在同一时刻的点（例：引线火花停 = 锦点火）粘在一起，动一个另一个跟着动（轨道上带链条的点）。关：各改各的"><input type="checkbox" data-tlopt="glue"${state.glueOff ? '' : ' checked'}> 同一时刻的点一起动</label>` : ''}</div>` : '');
  // 点轨道（不是把手）：跳到那个时刻；多层时顺便切到这一层（用户 16:22 第 3 条）
  host.querySelectorAll('.tlb-t').forEach(t => t.addEventListener('pointerdown', ev => { if (ev.target !== t && !ev.target.matches('i, .fcs')) return; const r = t.getBoundingClientRect(); state.t = clamp((ev.clientX - r.left) / r.width, 0, 1) * curDuration(); if (state.tab === 'combo' && state.comboSel !== +t.dataset.i) selectComboLayer(+t.dataset.i); }));
  host.querySelectorAll('.tlb-n[data-i]').forEach(n => n.addEventListener('click', () => { if (state.tab === 'combo') selectComboLayer(state.comboSel === +n.dataset.i ? -1 : +n.dataset.i); }));
  host.querySelector('.tlr-track').addEventListener('pointerdown', ev => { const r = ev.currentTarget.getBoundingClientRect(); state.t = clamp((ev.clientX - r.left) / r.width, 0, 1) * curDuration(); });
  host.querySelectorAll('[data-track-mute]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.trackMute, v = state.layerView; v.mute = v.mute.includes(i) ? v.mute.filter(x => x !== i) : [...v.mute, i]; buildLayerCard(); }));
  host.querySelectorAll('[data-track-solo]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.trackSolo, v = state.layerView; v.solo = v.solo === i ? -1 : i; buildLayerCard(); }));
  host.querySelectorAll('[data-cut]').forEach(b => b.addEventListener('click', () => setCut(b.dataset.cut)));
  host.querySelectorAll('[data-tlopt]').forEach(c => c.addEventListener('change', () => { const off = !c.checked;
    if (c.dataset.tlopt === 'follow') { state.followOff = off; store.set('tlFollowOff', off); flash(off ? '改时间点时序列时长 / 入点不再跟着走' : '改时间点时序列时长 / 入点跟着走'); }
    else { state.glueOff = off; store.set('tlGlueOff', off); flash(off ? '同一批星的几层：时间点各改各的' : '同一批星的几层：同一时刻的点一起动'); }
    stage2.tlSig = ''; buildTlBars(); }));
  host.querySelectorAll('.ph, .cut').forEach(h => h.addEventListener('pointerdown', ev => trackDrag(ev, h)));
  document.querySelectorAll('[data-info=outSummary]').forEach(r => r._refresh && r._refresh());
}
// 拖层轨道（用户 2026-10-02 14:46：「每层轨道出入点我看到了，但是没法拖」）：任何一层的入点 / 出点把手、阶段点都能直接拖。
// 多层时按下就切到那一层（右栏换成那一层的参数）；拖的时候只移动把手，松手才改参数、只重烘那一层。
function trackDrag(ev, h) {
  if (ev.button > 0) return;
  ev.preventDefault(); ev.stopPropagation();
  const li = +h.dataset.li;
  if (state.tab === 'combo' && state.comboSel !== li) selectComboLayer(li);
  const track = h.parentElement, x = curLayerBakes().find(r => r.i === li), sp = x && layerSpans(x), P = x && layerPOf(x); if (!sp || !P) return;
  const cut = h.dataset.cut2, q = cut ? null : phasesOf(P).find(z => z.k === h.dataset.ph); if (!cut && !q) return;
  const lab = cut ? (cut === 'in' ? '入点' : '出点') : q.lab, t0 = cut ? (cut === 'in' ? sp.t0 : sp.end) : q.t;
  // 入点只能在「看得见」的范围里、早于出点；出点晚于入点
  let lo = 0, hi = Infinity;
  if (cut === 'in') { lo = sp.vis[0]; hi = Math.min(sp.vis[1], +P.cutOut > 0 ? +P.cutOut : sp.end) - 1 / 15; }
  if (cut === 'out') { lo = Math.max(sp.vis[0], +P.cutIn > 0 ? +P.cutIn : sp.t0) + 1 / 15; hi = sp.vis[1]; }
  if (q) { if (q.lo != null) lo = Math.max(lo, q.lo); if (q.hi != null) hi = Math.min(hi, q.hi); }
  const D = curDuration(), toLayer = cx => { const r = track.getBoundingClientRect(); return clamp((clamp((cx - r.left) / r.width, 0, 1) * D - sp.d) * sp.r, lo, hi); };
  stage2.drag = true; h.classList.add('on'); try { h.setPointerCapture(ev.pointerId); } catch (e) { }
  let tl = t0;
  const mv = e => { tl = toLayer(e.clientX); h.style.left = clamp((sp.d + tl / sp.r) / D * 100, 0, 100) + '%'; h.title = `${lab}：${tl.toFixed(2)} s`; state.t = sp.d + tl / sp.r; setStatus(`${lab} → ${tl.toFixed(2)} s（松手后重烘）`); };
  const up = () => {
    h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
    stage2.drag = false; h.classList.remove('on'); setStatus(''); stage2.tlSig = '';
    if (Math.abs(tl - t0) < 0.005) return;
    if (cut) { applyCut(P, sp, cut, tl, true); return; }
    // 同一批星的另一层在同一时刻的点（接力：引线火花停 = 锦点火；四尺玉燃烧结束 = 红点亮起）一起移动。
    // 不只是拖的这个点：这一层里因为它跟着变的点（拖点火时燃烧结束、火花停都跟着走；燃烧结束收到火花停前面时火花停也收）也带着各自的接力点走
    const { dd, moved } = timingEdit(P, li, () => q.set(tl));     // 4.2.9：和右栏滑杆同一套规则（时长跟着、接力一起动、入点跟着点火）
    const q1 = phasesOf(P).find(z => z.k === q.k); tl = q1 ? q1.t : tl;   // set 可能夹住 / 改回默认：按实际落点
    refreshPanelValues(); refreshVisibility(); onParam();
    if (moved.size) rebakeLayers([...moved]);
    flash(`${q.lab} 改到 ${tl.toFixed(2)} s${dd ? `，序列时长跟着${dd > 0 ? '加' : '减'} ${Math.abs(dd).toFixed(2)} s` : ''}${moved.size ? `；第 ${[...moved].map(j => j + 1).join('、')} 层接力的点一起动` : ''}，正在重烘`);
  };
  h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
}
// 「输出」一节顶上的结果（4.2.0）：入出点之间多少 tick → 烘了多少帧 → 每张怎么装、帧率多少；有问题直接写出来
function outSummaryHTML() {
  const x = curLayerBakes().find(r => state.tab !== 'combo' || r.i === state.comboSel), b = x && x.b, P = state.P;
  if (!b || !b.meta || b.meta.frameTiming !== 'tick-start') return '<p class="hint">烘好以后这里显示：入点到出点之间多少 tick、烘了多少帧、怎么装进贴图、帧率多少。</p>';
  const parts = bakeParts(b), F = parts.reduce((n, s) => n + s.meta.L.F, 0), m0 = parts[0].meta, end = bakeTotal(b), N = Math.round((end - (m0.t0 || 0)) * 30);
  let maxF = 0, minF = 99; for (const s of parts) for (const d of s.meta.dur || []) { const f = 1 / Math.max(d, 1 / 30); maxF = Math.max(maxF, f); minF = Math.min(minF, f); }
  const burnMin = Math.min(...parts.map(s => s.meta.minFps || 30));
  const used = parts.reduce((n, s) => n + s.meta.L.F, 0), cap = parts.reduce((n, s) => n + s.meta.L.cols * s.meta.L.rows * s.meta.L.chans, 0);
  const sheet = s => { const L = s.meta.L; return `${L.cols}×${L.rows}${L.chans === 4 ? '×RGBA' : ''} · ${Math.round(L.cols * L.cellW)}×${Math.round(L.rows * L.cellH)}`; };
  const mode = { motion: '自动', lean: '最省', count: '手动', tiers: '分段帧率', full: '全程 30 fps' }[P.frameBudget || 'motion'] || '';
  const warn = [];
  if (burnMin < 10 - 0.05) warn.push(`燃烧段最慢 ${burnMin.toFixed(1)} fps，低于标准的 10 fps`);
  if (minF < 7.5 - 0.05) warn.push(`最慢 ${minF.toFixed(1)} fps，低于标准的 7.5 fps`);
  if (P.outPack !== 'fit' && used < cap * 0.5) warn.push(`贴图里一半以上的格子是空的（用了 ${used} / ${cap}）：可以把「格子」改成「按帧数选最小贴图」，或「帧数」改成「最省」`);
  return `<div class="osum"><div><b>${F} 帧</b>（${mode}）· 入点 ${(m0.t0 || 0).toFixed(2)} → 出点 ${end.toFixed(2)} s，${N} 个 tick${m0.cut && (m0.cut.in || m0.cut.out) ? '（用了你设的入出点）' : '（自动：第一次到最后一次看得见）'}</div>
    <div>帧率 ${maxF.toFixed(0)} fps → 最慢 ${minF.toFixed(1)} fps（燃烧段最慢 ${burnMin.toFixed(1)}）</div>
    <div>${parts.length} 张：${parts.map(sheet).join('；')} · 单格 ${Math.round(m0.L.cellW)} px · 格子用了 ${used} / ${cap}</div>
    ${warn.map(w => `<div class="ow">⚠ ${w}</div>`).join('')}</div>`;
}
// 单束（4.2.0，用户 16:22「单束输出藏得太死」）：资产栏「单束」菜单、层参数顶上的按钮、交付页，三处都能导
function unitTargets() {
  const xs = curLayerBakes().filter(x => x.b && layerPOf(x) && unitAllowed(layerPOf(x))), combo = state.tab === 'combo';
  return xs.map(x => ({ i: x.i, label: combo ? `第 ${x.i + 1} 层 · ${x.name}` : (state.name || '这个效果') }));
}
// 4.2.13（走查 B9：单束两条路、产物不同）：多层效果里「单束」= 把这一层的 PC 导出方案改成单束，导出整包时就在里面（手机仍是序列）；
// 单层效果照旧出单束包，包里加了 cascade.json（PC）
function setLayerUnit(i) {
  const L = state.layers[i]; if (!L) return;
  L.out = { ...layerOut(L), pc: 'unit' }; if (typeof undoNote === 'function') undoNote();
  if (state.comboSel === i) buildLayerHead(i); if (stage2.deliv) renderDeliv(); wbSync();
  flash(`第 ${i + 1} 层的 PC 导出方案改成单束：导出整包时 PC 这一层是每颗星一个面片，手机仍是序列（层页头「导出方案」里能改回）`);
}
function unitExportLayer(i) {
  const combo = state.tab === 'combo', xs = curLayerBakes(), x = combo ? xs.find(r => r.i === i) : xs[0]; if (!x) return;
  if (combo) { setLayerUnit(i); return; }
  const nm = packNamesFor(wbKey(), lib.effect, xs.length, delivName(), !combo && x.b ? x.b.P.type : '');
  exportUnitPack(layerPOf(x), combo ? x.L : state.M, nm.base + (combo && nm.layers[x.i] ? '_' + nm.layers[x.i] : ''));
}
function renderUnitMenu() {
  const host = $('#abUnitMenu'), ts = unitTargets(), combo = state.tab === 'combo';
  host.innerHTML = `<p class="hint">单束 = 只导一颗星的序列（星头 + 尾缀），Cascade 里按初速放射发射多条；比大面片省 overdraw。</p>`
    + (ts.length ? ts.map(t => `<button type="button" data-u="${t.i}">${combo ? `${t.label}：PC 改成单束（导出整包时在里面）` : `导出 ${t.label} 的单束包`}</button>`).join('') : '<p class="hint">当前效果没有能出单束的层（千轮、分裂、蜂和非球形排布不行）。</p>')
    + (!combo && ts.length && state.P.form !== 'unit' ? '<button type="button" id="abUnitView">把产物改成单束（在画面里看）</button>' : '');
  host.querySelectorAll('[data-u]').forEach(b => b.addEventListener('click', () => { $('#abUnit').open = false; unitExportLayer(+b.dataset.u); }));
  const v = host.querySelector('#abUnitView'); if (v) v.addEventListener('click', () => { $('#abUnit').open = false; setForm('unit'); refreshPanelValues(); syncExport(); flash('产物改成「单元序列」（单束）：每颗星一个粒子'); });
}
// 粘在一起的点：同一批星（联动）的几层里，非默认位置、总时间相差 < 0.02 s 的点
function gluePartners(li, at) {
  if (state.tab !== 'combo' || state.linkOff || state.glueOff) return [];
  const out = [];
  for (const j of linkedWith(li)) {
    const x2 = curLayerBakes().find(r => r.i === j), sp2 = x2 && layerSpans(x2), P2 = x2 && layerPOf(x2); if (!sp2 || !P2) continue;
    for (const q2 of phasesOf(P2)) if (!q2.auto && Math.abs(sp2.at(q2.t) - at) < 0.02) out.push({ i: j, P: P2, sp: sp2, q: q2 });
  }
  return out;
}
function gluedPhases(rows) {
  const set = new Set(); if (state.tab !== 'combo' || state.linkOff || state.glueOff) return set;
  for (const x of rows) { const sp = layerSpans(x), P = layerPOf(x); if (!sp || !P) continue;
    for (const q of phasesOf(P)) if (!q.auto && gluePartners(x.i, sp.at(q.t)).length) set.add(x.i + ':' + q.k); }
  return set;
}
// 重烘没选中的几层（粘在一起被带着动的层）：进每层的重烘队列（4.2.3 走查 A4）
function rebakeLayers(idxs) {
  for (const j of idxs) { const e2 = state.layers[j] && state.lib.find(x => x.name === state.layers[j].lib); if (e2) queueLayerBake(e2, 0); }
  stage2.tlSig = ''; if (typeof buildLayerCard === 'function') buildLayerCard();
}
// 入点 / 出点 = 这一层自己的时间（相对开花）。第一次设入点时，把当前烘焙的「第一次看得见」记成 preFrom（入点前从这里开始放大）
function setCut(kind) {
  const P = editLayerP(); if (!P) return;
  const x = curLayerBakes().find(r => state.tab !== 'combo' || r.i === state.comboSel), sp = x && layerSpans(x);
  if (kind === 'clear') { P.cutIn = 0; P.cutOut = 0; P.preFrom = -1; P.visTo = 0; stage2.tlSig = ''; refreshPanelValues(); refreshVisibility(); onParam(); flash('已清除入点 / 出点（回到自动）'); return; }
  applyCut(P, sp, kind, Math.max(0, (state.t - (sp ? sp.d : 0)) * (sp ? sp.r : 1)), false);
}
// drag = 拖把手：拖回可见范围的尽头就是「自动」
function applyCut(P, sp, kind, tl, drag) {
  const t = engineTick(tl + 1e-6), first = !(+P.cutIn > 0) && !(+P.cutOut > 0);
  if (kind === 'in') {
    if (sp && t < sp.vis[0] - 1e-6) { flash('入点要在看得见的范围里（' + sp.vis[0].toFixed(2) + ' s 以后）', true); return; }
    if (+P.cutOut > 0 && t >= +P.cutOut - 1 / 30) { flash('入点要早于出点', true); return; }
    if (first && sp) { P.preFrom = +sp.vis[0].toFixed(4); P.visTo = +sp.vis[1].toFixed(4); }
    P.cutIn = drag && sp && t <= sp.vis[0] + 1 / 60 ? 0 : +t.toFixed(4);
  } else {
    if (t <= (+P.cutIn || (sp ? sp.vis[0] : 0)) + 1 / 30) { flash('出点要晚于入点', true); return; }
    if (first && sp) { P.preFrom = +sp.vis[0].toFixed(4); P.visTo = +sp.vis[1].toFixed(4); }
    P.cutOut = drag && sp && t >= sp.vis[1] - 1 / 60 ? 0 : +t.toFixed(4);
  }
  if (!(+P.cutIn > 0) && !(+P.cutOut > 0)) { P.preFrom = -1; P.visTo = 0; }
  stage2.tlSig = ''; refreshPanelValues(); refreshVisibility(); onParam();
  const v = kind === 'in' ? +P.cutIn : +P.cutOut;
  flash(`${kind === 'in' ? '入点' : '出点'}${v > 0 ? `设在 ${v.toFixed(2)} s` : '回到自动'}，正在重新分帧烘焙`);
}
// 每帧调用（80_render 的主循环）：tick 号、播放头；标题 / 脚注 / 时段条 / 通过门槛每 1/4 秒刷新
function stageTick(D) {
  const playing = String(state.playing), play = $('#play');
  if (play.dataset.playing !== playing || !play.querySelector('.ui-icon')) { play.dataset.playing = playing; play.innerHTML = uiIcon(state.playing ? 'player-pause' : 'player-play'); play.setAttribute('aria-label', state.playing ? '暂停' : '播放'); play.title = state.playing ? '暂停（空格）' : '播放（空格）'; }
  $('#vfTick').textContent = `30 fps · tick ${Math.floor(engineTick(Math.min(state.t, D)) * 30 + 1e-6)}`;
  // 4.2.22 播放头：轨道的位置每 1/4 秒量一次（offsetLeft 每帧强制排版），播放头用 transform 挪（不触发排版）
  const now = performance.now(), host = $('#tlBars'), ph = host.querySelector('.tlb-ph');
  if (ph && (!stage2.trBox || now - stage2.last >= 250)) { const tr = host.querySelector('.tlb-t'); stage2.trBox = tr ? [tr.offsetLeft, tr.offsetWidth] : null; }
  if (ph && stage2.trBox) ph.style.transform = `translateX(${(stage2.trBox[0] + clamp(state.t / D, 0, 1) * stage2.trBox[1]).toFixed(1)}px)`;
  if (now - stage2.last < 250) return; stage2.last = now;
  $('#vfTitle').textContent = `${srcLabel() || (lib.key === 'combo' ? '组合编辑器' : '')}${srcLabel() ? ' · ' : ''}${state.tab === 'asset' ? '贴图回放' : VIEW_NAMES[state.view] || ''}${scopeLabel()}`;
  $('#vfSpec').textContent = state.tab === 'asset' ? '' : specLabel();
  buildTlBars(); syncGate();
  const ab = $('#abState'); if (ab) { const st = state.bakeError ? ['bad', '烘焙失败 · 保留上次成功'] : state.baking || state.dirty ? ['is-baking', '烘焙中…'] : ['', '']; ab.className = 'ab-state ' + st[0]; ab.textContent = st[1]; }
  if (stage2.deliv && !$('#delivView').hidden && stage2.delivSig !== stage2.tlSig) renderDeliv();
}
// 通过门槛：只影响「通过」按钮（意见、要改照常）
function gateReasons() {
  const r = [], v = state.layerView || { solo: -1, mute: [] };
  if (state.tab === 'combo' && (v.solo >= 0 || v.mute.length)) r.push('正在独看 / 静音：恢复整体后再验收');
  if (Math.abs(state.expo - 1) > 1e-3) r.push('显示曝光不是 1×');
  if (wb.src.kind === 'mine' || wb.changed) r.push('你看的是改过的参数 / 你的版本；「通过」针对 AI 版，切回 AI 版再点');
  return r;
}
function syncGate() {
  const r = gateReasons(), box = $('#pReview');
  box.querySelectorAll('.okb').forEach(b => { b.disabled = !!r.length && b.getAttribute('aria-pressed') !== 'true'; b.title = r.length ? '现在不能通过：' + r.join('；') : '通过（整体达到预期）'; });
  box.querySelectorAll('.gate').forEach(g => { g.hidden = !r.length; g.textContent = r.length ? '不能通过：' + r.join('；') : ''; });
}
// 记录当前帧：把观察条件写进意见（审阅页的意见框），没有条目时复制到剪贴板
function frameContext() {
  return `[+${engineTick(state.t).toFixed(2)} s · tick ${Math.floor(engineTick(state.t) * 30 + 1e-6)} · ${state.tab === 'asset' ? '贴图回放' : VIEW_NAMES[state.view]} · ${state.platform === 'mobile' ? '手机' : 'PC'} · ${state.disp === 'game' ? state.dist + ' m' : state.disp === 'px' ? '1:1 像素' : '适应窗口'}${scopeLabel().replace(/^ · /, ' · ')} · ${srcLabel() || '花型模板'}${lib.review && lib.review.ver ? ' · 版本 ' + lib.review.ver : ''}]`;
}
async function noteFrame() {
  const t = frameContext(), ta = document.querySelector('#rvTxt');
  if (ta && lib.review && lib.review.kind !== 'queued') {
    lib.pane = 'review'; syncPtabs();
    ta.value = (ta.value ? ta.value.replace(/\s*$/, '\n') : '') + t + ' ';
    ta.dispatchEvent(new Event('input')); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    flash('已把当前帧写进意见，接着写哪里不对');
  } else { try { await navigator.clipboard.writeText(t); flash('已复制当前帧的观察条件'); } catch (e) { flash(t); } }
}
// 查看交付：素材包里的每个文件（按当前烘焙推算；导出时手机版独立烘焙）
function delivName() {
  if (lib.my) return 'MyFx';
  if (state.tab === 'combo') { const rv = lib.review && lib.review.kind === 'combo' ? lib.review.id : ''; return (rv || state.comboName || 'Combo').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'Combo'; }
  return state.name;
}
function renderDeliv() {
  const host = $('#delivView'), name = delivName(), rows = [], combo = state.tab === 'combo', xs = curLayerBakes();
  const nm = packNamesFor(wbKey(), lib.effect, xs.length, name, xs.length === 1 && xs[0].b ? xs[0].b.P.type : ''), useNew = xs.every(x => !x.b || namingApplies(x.b));
  for (const x of xs) {
    if (!x.b) { rows.push(`<tr><td colspan="4" class="dim">${x.name}：还没烘好</td></tr>`); continue; }
    if (!namingApplies(x.b)) { rows.push(`<tr><td colspan="4" class="dim">${x.name}：这种产物（${FORM_NAMES[x.b.form] || x.b.form}）的素材包按它自己的导出规则生成，文件清单以导出的包为准</td></tr>`); continue; }
    if (x.b.form === 'emitset') {   // 循环层 + 粒子：循环 / 消散两张序列 + 粒子发射器（没有贴图）
      const m = x.b.meta, ly = combo ? nm.layers[x.i] : '';
      for (const [, L, sub, n] of namingSheets(x.b)) {
        const fa = sub === 'Far' ? x.b.far.meta.far : null, d0 = fa ? fa.t0 : sub === 'Fade' ? m.T : 0, life = fa ? fa.Dtot : sub === 'Fade' ? m.fadeSeconds : m.T;
        rows.push(`<tr><td>${fwTexName(nm.base, joinPart(ly, sub), L, n, 'tex', false)}.png</td><td>PC · ${sub === 'Loop' ? '循环层（近段）' : sub === 'Far' ? '远段（全程）' : '消散'} · 单格 ${Math.round(L.cellW)} px · ${L.F} 帧</td><td>${d0.toFixed(2)} s</td><td>${life.toFixed(2)} s</td></tr>`);
        rows.push(`<tr><td>${fwTexName(nm.base, joinPart(ly, sub), L, n, 'tex', true)}.png</td><td>手机</td><td>${d0.toFixed(2)} s</td><td>${life.toFixed(2)} s</td></tr>`);
        rows.push(`<tr class="dim"><td>${fwTexName(nm.base, joinPart(ly, sub), L, n, 'C')}.png</td><td>Cut（PC / 手机共用，512）</td><td></td><td></td></tr>`);
      }
      rows.push(`<tr class="dim"><td>${fwTexName(nm.base, ly, null, 0, 'R')}.png</td><td>颜色 Ramp（PC / 手机共用）</td><td></td><td></td></tr>`);
      rows.push(`<tr class="dim"><td colspan="4">粒子发射器（火花、落火）没有贴图：用软圆点材质，数值在 cascade.json</td></tr>`);
      continue;
    }
    const parts = bakeParts(x.b), delay = +x.L.delay || 0, rate = +x.L.rate || 1, ly = combo ? nm.layers[x.i] : '';
    const ln = combo ? comboLayerName(name, x.i) : name, mn = combo ? comboLayerName(name + '_Mobile', x.i) : name + '_Mobile';
    let mobCell = '—'; try { const mp = mobileParams({ ...x.b.P, cols: x.b.meta.L.cols, rows: x.b.meta.L.rows }); mobCell = Math.round(layoutOf(mp).cellW) + ' px'; } catch (e) { }
    const o = combo ? layerOut(x.L) : { pc: 'seq', mobile: 'seq' };      // 4.2.12：每层的导出方案
    if (combo) rows.push(`<tr class="grp"><td colspan="4">第 ${x.i + 1} 层 · ${x.name} · PC ${OUT_PC.find(q => q[0] === o.pc)[1]} · 手机 ${OUT_MOBILE.find(q => q[0] === o.mobile)[1]}${layerShown(x.i) ? '' : '（观察里隐藏了，导出照旧包含）'}</td></tr>`);
    if (o.pc === 'dots') rows.push(`<tr><td class="dim">（没有贴图）</td><td>PC · GPU 光点约 ${dotsCount(layerPOf(x))} 颗 · 软圆点材质 · 只出星头</td><td>${delay.toFixed(2)} s</td><td>${((+layerPOf(x).ignDelay || 0) + (+layerPOf(x).burn || 0)).toFixed(2)} s</td></tr>`);
    if (o.pc === 'unit' && unitAllowed(layerPOf(x))) rows.push(`<tr><td>${useNew ? fwTexName(nm.base, ly, { cols: 16, rows: 2 }, 1, 'tex', false) : TN(ln) + '（单束）'}.png</td><td>PC · 单束 · 每颗星一个面片 × ${Math.round(+layerPOf(x).stars || 0)} · 16 × 2 格（列 × 行以导出为准）</td><td>${delay.toFixed(2)} s</td><td>${(unitDuration(layerPOf(x)) / rate).toFixed(2)} s</td></tr>`);
    if (o.pc === 'off' && o.mobile === 'off') { rows.push('<tr><td colspan="4" class="dim">两个平台都不出这一层</td></tr>'); continue; }
    const pre = x.b.meta.pre;
    parts.forEach((s, k) => {
      const seg = bakeSegmentName(x.b, k), d0 = delay + ((k === 0 && pre ? pre.from : s.meta.t0) || 0) / rate, life = (s.meta.duration + (k === 0 && pre ? pre.dur : 0)) / rate, L = s.meta.L;
      for (const tt of s.tail ? ['Head', 'Tail'] : ['tex']) {
        const pc = useNew ? fwTexName(nm.base, ly, L, k + 1, tt, false) : TN(ln, joinPart(seg, tt === 'tex' ? '' : tt)), mb = useNew ? fwTexName(nm.base, ly, L, k + 1, tt, true) : TN(mn, joinPart(seg, tt === 'tex' ? '' : tt));
        if (o.pc === 'seq' || (o.pc === 'unit' && !unitAllowed(layerPOf(x)))) rows.push(`<tr><td>${pc}.png</td><td>PC · 单格 ${Math.round(L.cellW)} px · ${L.F} 帧${k === 0 && pre ? ` · 入点前放大 ${pre.dur.toFixed(2)} s` : ''}</td><td>${d0.toFixed(2)} s</td><td>${life.toFixed(2)} s</td></tr>`);
        if (o.mobile === 'seq') rows.push(`<tr><td>${mb}.png</td><td>手机 · 单格 ${mobCell}</td><td>${d0.toFixed(2)} s</td><td>${life.toFixed(2)} s</td></tr>`);
      }
      if (o.pc === 'seq' || o.mobile === 'seq') rows.push(`<tr class="dim"><td>${useNew ? fwTexName(nm.base, ly, L, k + 1, 'C') : TN(ln, joinPart(seg, 'Cutout'))}.png</td><td>Cut（PC / 手机共用，512）</td><td></td><td></td></tr>`);
    });
    if (o.pc === 'seq' || o.mobile === 'seq') rows.push(`<tr class="dim"><td>${useNew ? fwTexName(nm.base, ly, null, 0, 'R') : TN(ln, 'Ramp')}.png</td><td>颜色 Ramp（PC / 手机共用）</td><td></td><td></td></tr>`);
  }
  rows.push(`<tr class="grp"><td colspan="4">cascade.json（PC）· cascade_mobile.json（手机）：每层每段一个发射器，同一个爆点，按上面的延迟出生 · 帧号测试图在 _检查/（不导入）· 命名对照.txt</td></tr>`);
  const lyInputs = combo ? xs.map(x => `<label>第 ${x.i + 1} 层<input type="text" data-ly="${x.i}" value="${nm.layers[x.i]}" placeholder="L${x.i + 1}" title="${x.name}"></label>`).join('') : '';
  host.innerHTML = `<div class="dv-h"><div><b>一个效果 · 一个素材包</b><small>${useNew ? '命名：T_EFX_FireWorks_名称' + (combo ? '_层' : '') + '_列x行_序号（PC 加 _HD）；Cut _C、Ramp _R 两个平台共用' : '这种产物沿用原来的命名'}</small></div><span class="sp"></span>
    <button class="btn primary" type="button" id="dvExport">导出素材包（PC + 手机）</button><button class="btn" type="button" id="dvBack">返回画面</button></div>
    ${useNew ? `<div class="dv-names"><label>名称（礼花英文名）<input type="text" id="dvBase" value="${nm.base}"></label>${lyInputs}<button class="btn" type="button" id="dvSaveNames">保存名称</button>${nm.custom ? '<button class="btn ghost" type="button" id="dvResetNames">恢复默认</button>' : ''}<small>只能用英文字母、数字和下划线；名称存在这台电脑的浏览器里，按效果记。</small></div>` : ''}
    <table class="dv-t"><thead><tr><th>包内文件</th><th>平台 · 规格</th><th>延迟</th><th>时长</th></tr></thead><tbody>${rows.join('')}</tbody></table>
    <p class="hint">按当前烘焙推算；导出时手机版按单格下限独立烘焙。独看 / 静音不影响导出。</p>
    ${unitHTML(xs, combo)}`;
  host.querySelector('#dvExport').addEventListener('click', () => combo ? exportCombo() : $('#btnExport').click());
  host.querySelector('#dvBack').addEventListener('click', () => toggleDeliv(false));
  host.querySelectorAll('[data-unit]').forEach(b => b.addEventListener('click', () => unitExportLayer(+b.dataset.unit)));
  const tu = host.querySelector('#dvToUnit'); if (tu) tu.addEventListener('click', () => { setForm('unit'); refreshPanelValues(); syncExport(); flash('产物改成「单元序列」（单束）：每颗星一个粒子，Cascade 里放射发射'); });
  const sv = host.querySelector('#dvSaveNames');
  if (sv) sv.addEventListener('click', () => {
    const base = asciiName(host.querySelector('#dvBase').value), layers = [...host.querySelectorAll('[data-ly]')].map(i => asciiName(i.value));
    if (!base) { flash('名称不能为空（英文字母 / 数字）', true); return; }
    const dup = layers.filter(Boolean).find((v, i, a) => a.indexOf(v) !== i); if (dup) { flash('层名重复：' + dup, true); return; }
    setPackNames(wbKey(), base, layers); renderDeliv(); flash('名称已保存');
  });
  const rs = host.querySelector('#dvResetNames'); if (rs) rs.addEventListener('click', () => { const all = store.get('packNames', {}); delete all[wbKey()]; store.set('packNames', all); renderDeliv(); });
  stage2.delivSig = stage2.tlSig;
}
// 单束（单元序列：一颗星一条序列，Cascade 里每颗星一个粒子按初速放射发射——用户 2026-10-02 13:09 问「单束输出没了」）
function unitHTML(xs, combo) {
  const ok = xs.filter(x => x.b && layerPOf(x) && unitAllowed(layerPOf(x)));
  if (!ok.length) return '';
  if (!combo && state.P.form === 'unit') return '<p class="hint dv-unit">现在的产物就是单束（单元序列）：上面的导出就是单束包（贴图 + 弹道与发射参数表）。</p>';
  return `<div class="dv-unit"><b>单束（每颗星一个粒子）</b><small>只导一颗星的序列（星头 + 尾缀），Cascade 里按初速放射发射多条；比大面片省 overdraw。参数表里写了初速、阻力、重力、星数和寿命。</small>
    ${combo ? ok.filter(x => layerOut(x.L).pc !== 'unit').map(x => `<button class="btn" type="button" data-unit="${x.i}">第 ${x.i + 1} 层 PC 改成单束</button>`).join('') + '<small>（多层效果的单束跟着整包导出：层页头「导出方案」）</small>' : `<button class="btn" type="button" data-unit="0">导出单束包</button><button class="btn ghost" type="button" id="dvToUnit">把产物改成单束（在画面里看）</button>`}</div>`;
}
async function exportUnitPack(P0, M, name) {
  const P = { ...P0, form: 'unit', cols: 16, rows: 2, chans: 4, frameMode: 'auto', autoGrid: 1 };
  busy(true, '单束：烘焙一颗星的序列…', 0);
  let b = null;
  try {
    b = await bake(P, 1, p => busy(true, `单束：烘焙 ${Math.round(p * 100)}%`, p * 0.9));
    const nmU = name + '_Unit', files = await texFiles(b, nmU);
    files.push([`${TN(nmU, 'Ramp')}.png`, await encodePNG(rampPixels(M), 256, 8)]);
    files.push([`${nmU}_Cascade参数.txt`, utf8(cascadeText(nmU, b, M))]);
    // 4.2.13（走查 B9）：单束包也带 cascade.json（PC；手机不用每颗星一个粒子，手机请导大面片序列）
    const u = fwlUnit(nmU, b, M, { scale: 1, rate: 1, delay: 0 });
    files.push(['cascade.json', utf8(JSON.stringify({ format: FWL_FORMAT, name: nmU, platform: 'pc', source: { tool: '烟花母版烘焙器 ' + VERSION, type: b.P.type, form: 'unit' },
      textures: u.textures, materials: u.materials, system: { preview_distance_cm: 30000, preview_warmup_s: 0 }, emitters: [u.emitter], notes: ['手机版不出单束（手机不用每颗星一个粒子）：手机请导这个效果的大面片序列'] }, null, 1))]);
    files.push([`${nmU}.json`, utf8(JSON.stringify(masterJSON(b, nmU, M), null, 2))]);
    busy(true, '打包 ZIP…', 1); download(await makeZip(files), `${nmU}.zip`); flash('已导出单束包 ' + nmU);
  } catch (e) { console.error(e); flash('单束导出失败：' + e.message, true); }
  finally { if (b) disposeBake(b); busy(false); }
}
function toggleDeliv(on) {
  stage2.deliv = on == null ? !stage2.deliv : on;
  $('#delivView').hidden = !stage2.deliv; $('#viewFrame').hidden = stage2.deliv;
  syncStageTabs();
  if (stage2.deliv) renderDeliv();
}
function tickStep(n) { state.playing = false; $('#play').textContent = '播放'; state.t = Math.max(0, Math.min(curDuration(), engineTick(state.t + 1e-6) + n / 30)); }
// 重播（4.2.0，用户 16:22）：回到 0 秒并播放；快捷键 R
function replay() { state.t = 0; state.playing = true; $('#play').textContent = '暂停'; }
function initStage() {
  $('#replay').innerHTML = uiIcon('refresh'); $('#replay').setAttribute('aria-label', '重播');
  $('#replay').addEventListener('click', replay);
  $('#abUnit').addEventListener('toggle', () => { if ($('#abUnit').open) renderUnitMenu(); });
  $('#tickPrev').addEventListener('click', () => tickStep(-1));
  $('#tickNext').addEventListener('click', () => tickStep(1));
  state.loopPlay = store.get('loopPlay', true); $('#loopChk').checked = state.loopPlay;
  $('#loopChk').addEventListener('change', e => { state.loopPlay = e.target.checked; store.set('loopPlay', state.loopPlay); });
  document.querySelectorAll('.jumps [data-jump]').forEach(b => b.addEventListener('click', () => { state.playing = false; $('#play').textContent = '播放'; state.t = jumpTimes()[b.dataset.jump]; }));
  $('#vtGrid').addEventListener('click', () => { const on = !document.querySelector('.canvas-wrap').classList.contains('grid'); document.querySelector('.canvas-wrap').classList.toggle('grid', on); $('#vtGrid').setAttribute('aria-pressed', String(on)); });
  $('#vtNote').addEventListener('click', noteFrame);
  document.addEventListener('keydown', e => {
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); tickStep(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); tickStep(1); }
    else if (e.key.toLowerCase() === 'r') { e.preventDefault(); replay(); }
    else if (e.key.toLowerCase() === 'b') { e.preventDefault(); bakeNow(); }        // 4.2.16 按需烘焙
  });
}
