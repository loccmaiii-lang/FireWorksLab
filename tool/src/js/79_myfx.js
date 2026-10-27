// =====================================================================
//  4.2.7 新建效果 / 组合（用户 2026-10-02 19:41「我要开始批量出素材了……没地方创建组合与添加图层」；走查 B18：替换旧的组合编辑器）
//  「我的效果」= 独立的原生单层或多层效果；多层从第一层开始，之后加层、删层、复制、改名、上下挪；
//  每层是独立的一份参数（不跟着模板或原条目变）；哪几层是「同一批星」（轨迹参数一起变）由你勾，不再靠猜。
//  存在这台电脑的浏览器里；连了仓库文件夹，「保存」顺便写进 analysis/我的配方/my_<编号>/（后台脚本推上去，AI 能直接读）。
//  英文名（UE 资产名：效果名 + 每层名）在「查看交付」里改，和其它效果同一套命名规则。
// =====================================================================
const myAll = () => store.get('myEffects', {});
function myPut(rec) { const all = myAll(); all[rec.id] = rec; return store.set('myEffects', all); }
function myDelete(id) { const all = myAll(); delete all[id]; store.set('myEffects', all); }
const myLid = () => 'l' + Math.random().toString(36).slice(2, 7);
// 4.9.100：我的效果也可保存原生单层；不能进多层的尾缀仍使用原单层烘焙与导出。
function myId() { let id; do { id = 'fx' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); } while (myAll()[id]); return id; }
const myLayerCount = snap => snap && snap.kind === 'single' ? 1 : (snap && snap.layers || []).length;
function myCapturePrefs() {
  const combo = state.tab === 'combo', n = combo ? state.layers.length : 1, s = sizeSpecKeyNow(), rec = myRec(), picks = sizeSpecPicks(), pickKey = sizePickKey(s);
  return { ue: !store.get('packNames', {})[wbKey()] && rec && rec.ue ? structuredClone(rec.ue) : packNamesFor(wbKey(), lib.effect, n, combo ? 'MyFx' : TYPE_EN[state.P.type], combo ? '' : state.P.type),
    sizeSource: { key: s.key || '', entry: s.entry || '' }, sizePick: Object.hasOwn(picks, pickKey) ? picks[pickKey] : (rec && rec.sizePick) || '' };
}
// 参数、命名与尺寸先一起写入记录。4.9.101：英文名以效果记录为准（交付清单「保存名称 / 恢复默认」同时改记录），缓存只是镜像——
//   4.9.100 是「缓存优先」，旧恢复写进缓存的 RiseTrail_M（最终名）一直盖着用户填的 RiseTrail_Tiny，导出会按同名迭代覆盖已通过的中号尾缀。
//   尺寸选择仍是缓存优先（交付清单的尺寸下拉只写缓存，保存效果时才进记录）。
const myNamesSame = (a, b) => !!a && !!b && JSON.stringify([a.base || '', a.layers || [], a.system === undefined ? a.base || '' : a.system || '']) === JSON.stringify([b.base || '', b.layers || [], b.system === undefined ? b.base || '' : b.system || '']);
function myRestorePrefs(rec) {
  const key = 'my:' + rec.id;
  if (rec.ue && !myNamesSame(store.get('packNames', {})[key], rec.ue) && !setPackNames(key, rec.ue.base, rec.ue.layers || [], rec.ue)) throw new Error('英文名缓存未保存，记录中的名称仍保留');
  if (typeof rec.sizePick === 'string') {
    const all = sizeSpecPicks();
    if (!Object.hasOwn(all, key)) { all[key] = rec.sizePick; if (!store.set('sizeSpecPick', all)) throw new Error('尺寸选择缓存未保存，记录中的选择仍保留'); }
  }
}
// 4.9.101 交付清单改我的效果的英文名：同时写进效果记录（ue = null 是「恢复默认」：记录里删掉，重开 / 保存不再复活）。不是我的效果 → 不用写，返回 true
function myRecordNames(key, ue) {
  const m = /^my:(.+)$/.exec(key || ''); if (!m) return true;
  const all = myAll(), rec = all[m[1]]; if (!rec) return true;
  if (ue) rec.ue = structuredClone(ue); else delete rec.ue;
  if (!myPut(rec)) return false;
  if (lib.my && lib.my.id === rec.id) { if (ue) lib.my.ue = structuredClone(ue); else delete lib.my.ue; }
  return true;
}
// 4.9.101 启动时按记录对齐一次英文名缓存（左栏列表在打开前就显示对的名字）；只动记录里有名字、且和缓存不同的
function mySyncNames() {
  let failed = 0;
  for (const rec of Object.values(myAll())) { if (!rec || !rec.ue) continue; try { myRestorePrefs({ id: rec.id, ue: rec.ue }); } catch (e) { failed++; } }
  return failed;
}
// 4.9.101 尺寸来源只按派生来源（rec.from）认：4.9.100 保存时从界面现读，旧条目没关干净就记成了别的效果（用户的 Tiny 派生自 ef:trail_phys，记成 qiuxing_a / QA20）
function mySizeSource(rec) {
  const s = rec && rec.sizeSource, f = String((rec && rec.from && rec.from.key) || ''), keep = () => (s ? structuredClone(s) : undefined);
  if (f.startsWith('ef:')) {
    const key = f.slice(3); if (s && s.key === key) return keep();
    const id = (rec.snap && rec.snap.kind === 'single' && rec.snap.repId) || (rec.from && rec.from.base) || '';
    return { key, entry: typeof entryById === 'function' && entryById(id) ? id : '' };
  }
  if (/^(rv|rep):/.test(f)) {
    const entry = f.slice(f.indexOf(':') + 1); if (s && s.entry === entry) return keep();
    const ef = typeof effectOfEntry === 'function' ? effectOfEntry({ id: entry }) : null; return { key: ef ? ef.key : '', entry };
  }
  return keep();
}
function myRecoverSingle(key, sv) {
  const sn = sv && sv.snap, obj = x => x && typeof x === 'object' && !Array.isArray(x);
  if (!/^(ef:|rv:|rep:|type:|tpl:)/.test(key || '') || !sv.id || sv.draft || sv.auto || typeof sv.name !== 'string' ||
      !obj(sn) || sn.kind !== 'single' || !obj(sn.P) || !Object.hasOwn(TYPES, sn.P.type) || !obj(sn.M) || !multiLayerBlock(sn.P)) return null;
  // 与旧文件编号无关：同源、同名、同参数重复保存只恢复一个副本。
  const stable = x => Array.isArray(x) ? x.map(stable) : obj(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, stable(x[k])])) : x;
  const sig = JSON.stringify(stable({ key, name: sv.name, snap: sn })); let a = 2166136261, b = 5381;
  for (let i = 0; i < sig.length; i++) { a = Math.imul(a ^ sig.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ sig.charCodeAt(i); }
  const id = 'fxsingle_' + (a >>> 0).toString(36) + '_' + (b >>> 0).toString(36), efKey = key.startsWith('ef:') ? key.slice(3) : '';
  const ef = typeof EFFS === 'function' ? EFFS().find(e => e.key === efKey) : null, entry = sn.repId || (/^(rv:|rep:)/.test(key) ? key.slice(key.indexOf(':') + 1) : '');
  return { id, name: sv.name, created: sv.at || '', updated: sv.at || '', snap: structuredClone(sn), links: [],
    from: { key, name: (ef && ef.名) || sv.base || key, base: sv.base || '', ver: sv.baseVer || '' },
    ue: sv.ue || packNamesFor(key, ef, 1, TYPE_EN[sn.P.type], sn.P.type, entry),
    sizeSource: { key: efKey, entry }, sizePick: sizeSpecPicks()[efKey || entry || key] || '' };
}
function myMigrateSingleSaves() {
  const done = store.get('nativeSaveRecovery', {}); let n = 0, failed = false;
  for (const [key, list] of Object.entries(store.get('mySaves', {}))) for (const sv of Array.isArray(list) ? list : []) {
    const rec = myRecoverSingle(key, sv); if (!rec || done[rec.id]) continue;
    if (!myAll()[rec.id]) { if (!myPut(rec)) { failed = true; continue; } n++; }
    done[rec.id] = true;
    try { myRestorePrefs(rec); } catch (e) { failed = true; }
  }
  if (n || Object.keys(done).length) { if (!store.set('nativeSaveRecovery', done)) failed = true; }
  if (n || failed) setTimeout(() => flash(`旧单层版本已恢复 ${n} 个到左栏「我的效果」，原版本保留${failed ? '；部分浏览器写入失败，请保留原记录后重试' : ''}`, failed, 12000, true), 1500);
}
// 写文件、更新列表和打开分开报告；部分失败不能被一句“已保存”覆盖。
async function myFinishSave(rec, open) {
  const errors = []; let path = null;
  try { myRestorePrefs(rec); } catch (e) { errors.push(e.message || String(e)); }
  try {
    path = await repoWrite('my:' + rec.id, { id: rec.id, name: rec.name, at: rec.updated, base: '我的效果', from: rec.from,
      snap: rec.snap, links: rec.links, ue: rec.ue, sizeSource: rec.sizeSource, sizePick: rec.sizePick });
    if (repoDir.h && !path) errors.push('仓库未写入：尚未取得文件夹写入权限');
  } catch (e) { errors.push('仓库写入失败：' + (e.message || e)); }
  // 保存完成时展开目标分组；若旧搜索把新名字过滤掉，清除搜索后定位新副本。
  lib.seg = 'passed';
  if (lib.q && !libMatch(rec.name, rec.id)) { lib.q = ''; const search = $('#libSearch'); if (search) search.value = ''; }
  try { renderLib(); } catch (e) { errors.push('列表刷新失败：' + (e.message || e)); }
  try {
    if (open) await openMyEffect(rec.id, { keep: true });
    else { lib.my = { ...rec, linksLive: structuredClone(rec.links) }; wb.src = { kind: 'ai' }; wb.sig = wbSig(); wbSync(); }
  } catch (e) { errors.push('打开或显示刷新失败：' + (e.message || e)); }
  flash(`已保存「${rec.name}」到左栏「我的效果」${path ? '，仓库文件也已写入' : '（浏览器中）'}${errors.length ? '；' + errors.join('；') : ''}`, !!errors.length, 12000, true);
  return rec;
}
// 层的来源：花型模板 key / 'rep:<正式库>' / 'rv:<条目>' → { type, P, M, title }（参数复制一份，以后各改各的）
function mySrc(key) {
  const a = typeof assetSrc === 'function' ? assetSrc(key) : null; if (a) return a;     // 4.5.0 我的模板 / 我的效果的层
  if (key.startsWith('rep:') || key.startsWith('rv:')) {
    const id = key.replace(/^(rep|rv):/, ''), r = REPLICA_BY_ID[id]; if (!r) throw new Error('找不到 ' + id);
    const { P, M } = replicaPM(id), e = FW_REVIEW_LIST.find(x => x.id === id);
    return { type: r.base, P: structuredClone(P), M: structuredClone(M), title: (e && e.name) || r.name };
  }
  const d = defaultsFor(key); return { type: key, P: derive(structuredClone(d.P)), M: structuredClone(d.M), title: TYPE_NAMES[key].replace(/（.*）/, '') };
}
const myRec = () => lib.my ? myAll()[lib.my.id] || lib.my : null;
// 4.3（清理清单 C2）：组合编辑器去掉了。以前在编辑器里存的版本（mySaves['combo']）一次性搬成「我的效果」，参数和层都在
function myMigrateComboSaves() {
  const all = store.get('mySaves', {}), list = all.combo; if (!list || !list.length) return;
  let n = 0;
  for (const sv of list) {
    const sn = sv && sv.snap; if (!sn || sn.kind !== 'combo' || !(sn.layers || []).length) continue;
    const id = 'fx' + Date.now().toString(36) + (n++);
    myPut({ id, name: '组合编辑器 · ' + (sv.name || id), created: sv.at || wbNow(), updated: sv.at || wbNow(), links: [],
      snap: { kind: 'combo', name: sv.name || sn.name, layers: sn.layers.map(x => ({ ...x, id: null, L: { ...(x.L || {}), lid: (x.L && x.L.lid) || myLid() } })) } });
  }
  delete all.combo; store.set('mySaves', all);
  if (n) setTimeout(() => flash(`组合编辑器去掉了：你在里面存的 ${n} 个版本搬到了左栏「我的效果」`), 1500);
}
// 4.9.121：英文名建议从哪来：现有效果的层 = 那个效果的英文名，模板 = 花型的英文名
function myEnSource(key, s) {
  const m = /^(rv|rep):(.+)$/.exec(key || ''), ef = m && typeof effectOfEntry === 'function' ? effectOfEntry({ id: m[2] }) : null;
  return (ef && ef.英文名) || (s && TYPE_EN[s.type]) || 'Fx';
}
// 新建：先在花型库里选第一层（模板或现有效果的层），再起名字
function myNew() { pkOpen({ mode: 'newEffect', title: '新建效果 · 先选第一层（之后可以再加层）', onPick: myCreate }); }
// 4.9.89（导出排查 A12）：多层 / 我的效果里的尾缀层只认「PC：近段 + 远段合成一张」。别的尾缀形态（RT6 全套、V5、上升循环、物理尾缀）多层的烘焙 / 导出 / 回放没接，
//   以前被当成空中大面片烘，画面和导出都不对 → 只拦多层加层；4.9.100 原生单层我的效果不转换形态。
function multiLayerBlock(P) {
  if (!P || familyOf(P.type) !== 'rise' || (isEmit(P) && rtPcFull(P))) return '';
  return isEmit(P) ? '这个全套尾缀可以独立保存和导出，但不能放进多层。需要加层时，请另存副本后，在交付清单里将 PC 改为「近段 + 远段合成一张」'
    : '这种尾缀（V5 / 上升循环 / 物理尾缀）可以独立保存和导出，但多层尚不支持这种形态，暂不能加层';
}
async function myCreate(key) {
  { const why = multiLayerBlock(mySrc(key).P); if (why) { flash(why, true, 9000); return; } }
  // 4.9.121（团队版 ⑤）：新建时一起填英文名（UE 资产名），建议值 = 来源的英文名 + 序号；以前缺省都是 MyFx，几个效果导出互相覆盖
  const s = mySrc(key), n = Object.keys(myAll()).length + 1;
  const ask = await askNewFxNames('新效果叫什么？', '中文名在左栏、资产栏显示，之后在资产栏 ⋯ 里能改；英文名是导出的资产名，之后在「交付清单」里也能改。', `新效果 ${n}`, enNameSuggest(myEnSource(key, s)));
  if (ask == null) return;
  const en = enNameWhy(ask.en) ? enNameSuggest(myEnSource(key, s)) : ask.en.trim(), name = ask.cn, id = 'fx' + Date.now().toString(36);
  const rec = { id, name: name.trim() || `新效果 ${n}`, created: wbNow(), updated: wbNow(), links: [], ue: { base: en, layers: [], system: en },
    snap: { kind: 'combo', name: name.trim(), layers: [{ id: null, type: s.type, P: s.P, M: s.M, L: { title: s.title, lid: myLid(), scale: 1, delay: 0, rate: 1, mirror: false } }] } };
  myPut(rec); setPackNames('my:' + id, en, [], { system: en }); await openMyEffect(id);
  flash(`已新建「${rec.name}」：右栏「观察图层」里加层、改名；调好了点资产栏「保存」`);
}
async function openMyEffect(id, o = {}) {
  const rec = myAll()[id]; if (!rec) { flash('找不到这个效果', true); return; }
  if (!o.keep) beforeOpen(null); else if (typeof migBegin === 'function') migBegin();
  const alive = (typeof libOpenBegin === 'function' ? libOpenBegin() : () => true);     // 4.9.101 打开代次：烘焙中又点了别的（或同一个再点一次）→ 这次停下，不装层、不换面包屑
  setQueuedView(false); lib.effect = null; lib.formal = null; lib.tpl = null; lib.my = { ...rec, sizeSource: mySizeSource(rec), linksLive: structuredClone(rec.links || []) }; wb.entry = undefined; lib.key = 'my:' + id; store.set('lastKey', lib.key);
  setReview(null); state.comboSel = -1; state.layerView = { solo: -1, mute: [] };
  try {
    await setTab(rec.snap.kind === 'single' ? 'master' : 'combo', { lazy: true }); if (!alive()) return false; syncComboPanels();
    try { myRestorePrefs(rec); } catch (e) { flash(e.message || String(e), true, 12000, true); }
    if (!(await myApplySnap(rec.snap, alive)) || !alive()) return false;
    renderLib(); crumb('我的效果', rec.name); wbRefresh();
    // 4.3.3：多层打开即选第 1 层；原生单层的参数由 buildMasterPanel 直接显示。
    if (state.tab === 'combo' && state.layers.length && layerEntryOf(state.layers[0])) selectComboLayer(0);
    return true;
  } finally { if (alive() && typeof migEnd === 'function') migEnd(); }
}
// 按快照搭层：每层一份自己的参数（libOwn 烘焙），层上带名字、稳定编号；alive = 打开代次（过期返回 false）
async function myApplySnap(snap, alive = () => true) {
  if (snap.kind === 'single') {
    await setTab('master', { lazy: true }); if (!alive()) return false; bakeMode.demand = true;
    state.P = migrate37(structuredClone(snap.P)); state.M = structuredClone(snap.M); state.repId = snap.repId || null; state.activeStage = 0;
    const rep = REPLICA_BY_ID[state.repId];
    state.name = rep ? state.repId + '_' + rep.name.replace(/^V\d+b?r?f?\s*/, '').replace(/[（）·→ ]+/g, '_').replace(/_+$/, '') : (TYPE_EN[state.P.type] || 'Firework') + '_01';
    buildMasterPanel(); onParam(); return true;
  }
  return applyCombo({ name: snap.name, layers: snap.layers.map(x => ({ src: { type: x.type, P: x.P, M: x.M }, ...structuredClone(x.L), lid: (x.L && x.L.lid) || myLid() })) }, alive);
}
function mySnap() { const s = wbSnap(); if (s.kind === 'combo') s.layers.forEach((x, i) => { x.id = null; const L = state.layers[i]; x.L.title = L.title || layerName(i); x.L.lid = L.lid || (L.lid = myLid()); }); return s; }
// 保存 = 覆盖这个效果；另存为 = 复制成一个新效果
async function mySave(asNew) {
  const rec = myRec(); if (!rec) return;
  if (repoDir.h && !repoDir.ok) await repoPerm(true);
  let out = structuredClone(rec);
  if (asNew) { const nm = await askSaveName('另存为新效果', '复制当前全部图层、参数和联动关系，保留原效果。新效果会出现在左侧「我的效果」。', rec.name + ' 副本', '另存为'); if (nm == null) return null; out = { ...out, id: myId(), name: nm.trim() || rec.name + ' 副本', created: wbNow() }; }
  Object.assign(out, { updated: wbNow(), snap: mySnap(), links: myLinksLid(), ...myCapturePrefs() }); delete out.linksLive;
  if (out.snap.kind === 'combo') out.snap.name = out.name;
  if (!myPut(out)) { flash('未保存：浏览器里没存上，当前编辑和原效果仍保留', true, 12000, true); return null; }
  const drafts = wbList().filter(x => x.draft); if (drafts.length && !asNew) wbPut(wbList().filter(x => !x.draft));   // 存了就不要草稿了
  return myFinishSave(out, asNew);
}
async function myRename() {
  const rec = myRec(); if (!rec) return; const n = await askText('重命名这个效果', '效果的中文名（左栏、顶栏显示的名字）；英文名在「交付清单」里设。', rec.name, '改名'); if (n == null) return;
  rec.name = n.trim() || rec.name; myPut(rec); lib.my.name = rec.name; state.comboName = rec.name; crumb('我的效果', rec.name); wbSync(); renderLib();
}
function myRemove() { const rec = myRec(); if (rec) removeMyFx(rec.id); }     // 4.5.0：不弹确认，删了 8 秒内能撤销（79_assetops.js）
// ---------------- 层：加、删、复制、改名、上下挪 ----------------
function myAddLayer() { if (state.tab !== 'combo') { flash(multiLayerBlock(state.P) || '请先从资产栏「加层」存成多层副本', true, 10000, true); return; } pkOpen({ mode: 'addLayer', title: '加一层 · 选花型模板，或现有效果里的某一层（参数复制一份）', onPick: myAddLayerFrom }); }
async function myAddLayerFrom(key) {
  if (state.tab !== 'combo') return;
  const s = mySrc(key); { const why = multiLayerBlock(s.P); if (why) { flash(why, true, 9000); return; } }     // 4.9.89 A12
  const e = await libOwn({ type: s.type, P: s.P, M: s.M });
  state.layers.push(newLayer(e, { title: s.title, lid: myLid() }));
  myLayersChanged(); selectComboLayer(state.layers.length - 1); flash(`加了第 ${state.layers.length} 层「${s.title}」`);
}
async function myDupLayer(i) {
  const L = state.layers[i], e = layerEntryOf(L); if (!e) return;
  const f = libFork(e), { lib: _l, ...rest } = structuredClone(L);
  state.layers.splice(i + 1, 0, { ...rest, lib: f.name, title: (L.title || layerName(i)) + ' 副本', lid: myLid() });
  myLayersChanged(); selectComboLayer(i + 1);
}
// 4.5.8（20-03）：删层不弹框，进 Ctrl+Z（以前弹确认框、不进撤销，提示说「版本 → 已保存」能找回，其实只能找回更旧的）
function myDelLayer(i) {
  if (state.layers.length <= 1) { flash('至少留一层', true); return; }
  if (typeof undoNote === 'function') { undoCommit(); undoNote(); }
  const nm = layerName(i), L = state.layers.splice(i, 1)[0], e = state.lib.find(x => x.name === L.lib);
  if (e && e.own && !state.layers.some(x => x.lib === e.name)) { dropLibBake(e); state.lib.splice(state.lib.indexOf(e), 1); }
  state.comboSel = -1; myLayersChanged(); syncComboPanels();
  if (typeof undoCommit === 'function') undoCommit();
  flash(`删掉了第 ${i + 1} 层「${nm}」：Ctrl+Z（或资产栏撤销）能撤回`);
}
function myMoveLayer(i, d) {
  const j = i + d; if (j < 0 || j >= state.layers.length) return;
  const a = state.layers; [a[i], a[j]] = [a[j], a[i]];
  const sel = state.comboSel === i ? j : state.comboSel === j ? i : state.comboSel; state.comboSel = sel; myLayersChanged();
}
async function myRenameLayer(i) {
  const L = state.layers[i]; const n = await askText('这一层叫什么？', '这一层的中文名；英文名在「交付清单」里设。', L.title || layerName(i), '改名'); if (n == null) return;
  L.title = n.trim() || L.title; buildLayerCard(); if (state.comboSel === i) buildLayerHead(i); stage2.tlSig = '';
}
function myLayersChanged() {
  computeLinks(); buildComboPanel(); buildLayerCard(); if (state.comboSel >= 0) buildLayerHead(state.comboSel);
  stage2.tlSig = ''; wbSync();
  if (typeof undoNote === 'function') undoNote();      // 4.5.8：加层 / 复制 / 挪层也进撤销
}
// ---------------- 同一批星（明确勾选，不靠猜） ----------------
// lib.my.linksLive：[[lid, lid, …], …]（按层的稳定编号记，层挪位置、加删都不乱）；同一组里的层轨迹参数（种子、星数、初速、终端速度、重力、离散…）一起变
function myLinksLid() { return state.tab !== 'combo' ? [] : ((lib.my && lib.my.linksLive) || []).map(g => g.filter(l => state.layers.some(L => L.lid === l))).filter(g => g.length > 1); }
function myLinkIdx() {
  const byLid = new Map(state.layers.map((L, i) => [L.lid, i]));
  return myLinksLid().map(g => g.map(l => byLid.get(l)).filter(i => i != null)).filter(g => g.length > 1);
}
function mySetLinked(i, j, on) {
  const a = state.layers[i].lid, b = state.layers[j].lid; let groups = myLinksLid().map(g => [...g]);
  if (on) {
    const gi = groups.find(g => g.includes(a)), gj = groups.find(g => g.includes(b));
    if (gi && gj && gi !== gj) { gi.push(...gj); groups = groups.filter(g => g !== gj); }
    else if (gi) { if (!gi.includes(b)) gi.push(b); } else if (gj) { if (!gj.includes(a)) gj.push(a); } else groups.push([a, b]);
    // 勾上的那一刻：被勾的层（j）的轨迹参数改成和当前层（i）一样
    const e = layerEntryOf(state.layers[i]), e2 = layerEntryOf(state.layers[j]);
    if (e && e2) { let ch = false; for (const k of LINK_KEYS) if (e.P[k] !== undefined && JSON.stringify(e.P[k]) !== JSON.stringify(e2.P[k])) { e2.P[k] = structuredClone(e.P[k]); ch = true; } if (ch) queueLayerBake(e2, 0); }
  } else { const g = groups.find(x => x.includes(a)); if (g && g.includes(b)) g.splice(g.indexOf(b), 1); }
  lib.my.linksLive = groups.filter(g => g.length > 1);
  computeLinks(); buildLayerHead(i); buildLayerCard(); stage2.tlSig = '';
}
// 层参数页头：和其它哪几层是同一批星（勾上 = 轨迹参数一起变）
function myLinkHTML(i) {
  const me = layerEntryOf(state.layers[i]); if (!me || familyOf(me.P.type) !== 'aerial') return '';
  const others = state.layers.map((L, j) => [L, j]).filter(([L, j]) => j !== i && (e => e && familyOf(e.P.type) === 'aerial')(layerEntryOf(L)));
  if (!others.length) return '';
  const linked = new Set(linkedWith(i));
  return `<div class="lh-link">同一批星（勾上 = 种子、星数、初速、终端速度、重力、随机这些决定轨迹的参数和这一层一起变；勾的时候按这一层的值）：${others.map(([L, j]) => `<label class="check"><input type="checkbox" data-link="${j}"${linked.has(j) ? ' checked' : ''}> 第 ${j + 1} 层 · ${layerName(j)}</label>`).join('')}</div>`;
}
// 层卡片（观察图层）里每层一排小按钮；底下「＋ 加一层」
function myLayerTools(i) {
  return `<span class="mytools"><button type="button" class="mini" data-my="up" data-i="${i}" title="上移" aria-label="上移">↑</button><button type="button" class="mini" data-my="down" data-i="${i}" title="下移" aria-label="下移">↓</button><button type="button" class="mini" data-my="ren" data-i="${i}" title="改这一层的中文名">改名</button><button type="button" class="mini" data-my="dup" data-i="${i}" title="复制这一层（参数独立）">复制</button><button type="button" class="mini" data-my="del" data-i="${i}" title="删掉这一层">删</button></span>`;
}
function bindMyLayerTools(box) {
  box.querySelectorAll('[data-my]').forEach(b => b.addEventListener('click', ev => {
    ev.stopPropagation(); const i = +b.dataset.i, k = b.dataset.my;
    if (k === 'up') myMoveLayer(i, -1); else if (k === 'down') myMoveLayer(i, 1); else if (k === 'ren') myRenameLayer(i); else if (k === 'dup') myDupLayer(i); else if (k === 'del') myDelLayer(i);
  }));
  const add = box.querySelector('#myAdd'); if (add) add.addEventListener('click', myAddLayer);
}
// 左栏「我的效果」
// 4.5.3（用户 10-05 18:02）：通过的 AI 效果（nPassed 个，renderPassed 画）排在最上面；每项不再挂「删除」，删除在资产栏 ⋯ 里
function myLibGroup(host, nPassed = 0, renderPassed = null, nHidden = 0) {
  const list = Object.values(myAll()).filter(r => !(typeof caseHas === 'function' && caseHas(r.id)) && libMatch(r.name, r.id)).sort((a, b) => String(b.updated).localeCompare(String(a.updated)));     // 5.0.0-a1：随包案例在「案例」组里列，这里不重复
  // 4.9.121（团队版 ④）：组头「导出全部」「导入…」——一个文件带走这台浏览器里全部我的效果和我的模板，换浏览器 / 发给同事后导入就新增
  const io = `<button type="button" class="lg-hid lg-io" data-myio="export" title="把这台浏览器里全部「我的效果」和「我的模板」存成一个 .json 文件（fwl.myrecipe/1），换浏览器 / 换电脑 / 发给同事用">导出全部</button><button type="button" class="lg-hid lg-io" data-myio="import" title="选一个或几个 .json（导出全部的文件、analysis/我的配方/ 里的配方、⋯「导出配方文件」导出的），直接新增为我的效果 / 我的模板；不用先打开同形态的效果">导入…</button>`;
  const g = libGroup(host, 'myfx', '我的效果', list.length + nPassed, false, (nHidden ? `<button type="button" class="lg-hid" data-myhid="1" title="${lib.showHidden ? '收起隐藏的效果' : '显示隐藏的效果'}">${lib.showHidden ? '收起隐藏' : '已隐藏 ' + nHidden}</button>` : '') + io);
  const hb = g.querySelector('[data-myhid]'); if (hb) hb.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); lib.showHidden = !lib.showHidden; renderLib(); });
  for (const k of ['export', 'import']) { const b = g.querySelector(`[data-myio="${k}"]`); if (b) b.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); if (k === 'export') myExportAll(); else myImportPick(); }); }
  if (renderPassed && nPassed) renderPassed(g);
  if (!list.length && !nPassed) g.insertAdjacentHTML('beforeend', TEAM_MODE ? '<p class="lsub">还没有自己的效果：打开上面的案例改参数后点资产栏「另存为…」，或点最下面「＋ 新建效果」。存在这个浏览器里，记得定期点组头「导出全部」备份。</p>'
    : '<p class="lsub">还没有。点最下面「＋ 新建效果」：先选第一层（花型模板或现有效果的层），再加层、改名、调参数。你通过的效果也会出现在这里。</p>');
  for (const r of list) myLibItem(g, r);
}
// 左栏一行我的效果（「我的效果」组和 5.0.0-a1「案例」组共用）；badge = 右下角的小标签
function myLibItem(g, r, badge = '我的效果') {
  const single = r.snap && r.snap.kind === 'single', t = single ? r.snap.P.type : r.snap && r.snap.layers && r.snap.layers[0] ? r.snap.layers[0].type : 'kiku';
  const count = myLayerCount(r.snap), ue = packNamesFor('my:' + r.id, null, count, single ? TYPE_EN[t] : 'MyFx', single ? t : '').base;
  return libItem(g, 'my:' + r.id, `<span class="th" style="${thUser('my:' + r.id) || thSnapStyle('my:' + r.id + '@' + (r.updated || ''), r.snap) || typeThumbStyle(t)}"></span><span class="tx"><b>${r.name}</b><small>${ue} · ${single ? '原生单层' : count + ' 层'}${r.from && badge !== '案例' ? ' · 派生自 ' + r.from.name : ''} · ${r.updated || ''}</small><span class="bds"><span class="badge">${badge}</span></span></span>`, () => openMyEffect(r.id));
}
// =====================================================================
//  4.9.121（团队版 ④，用户 10-25 00:00「全批准」）：「我的效果」组头「导出全部 / 导入…」
//  · 导出全部：一个 .json（fwl.mybundle/1），里面每个效果一份 fwl.myrecipe/1（和保存时写进仓库 analysis/我的配方/ 的同一种），每个我的模板一份 fwl.mytemplate/1
//  · 导入：选一个或几个 .json——导出全部的文件、analysis/我的配方/ 里的配方（fwl.myrecipe/1）、⋯「导出配方文件」导出的（fwl.recipe/1）、我的模板（fwl.mytemplate/1）
//    → 直接新增为我的效果 / 我的模板（不用先打开同形态的效果）。和本地一模一样的不重复加；同编号但内容不同的另加一份「· 导入」，本地的不动。
//    导入不进 Ctrl+Z（不是参数）；导进来的效果和别的我的效果一样能删（8 秒撤销）
// =====================================================================
const MY_BUNDLE = 'fwl.mybundle/1';
function myRecipeDoc(r) {
  return { format: 'fwl.myrecipe/1', key: 'my:' + r.id, tool: VERSION, id: r.id, name: r.name, at: r.updated || r.created || '', created: r.created || '', base: '我的效果', from: r.from, snap: r.snap, links: r.links || [],
    ue: r.ue || store.get('packNames', {})['my:' + r.id], sizeSource: r.sizeSource, sizePick: r.sizePick };
}
function myBundle() {
  const effects = Object.values(myAll()).filter(r => r && r.id && r.snap).map(r => JSON.parse(JSON.stringify(myRecipeDoc(r))));
  const templates = Object.values(typeof tplAll === 'function' ? tplAll() : {}).filter(t => t && t.id).map(t => ({ format: 'fwl.mytemplate/1', tool: VERSION, ...structuredClone(t) }));
  return { format: MY_BUNDLE, tool: VERSION, at: wbNow(), effects, templates };
}
function myExportAll() {
  const b = myBundle();
  if (!b.effects.length && !b.templates.length) { flash('这台浏览器里还没有我的效果 / 我的模板，没什么可导出'); return null; }
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-'), fn = `我的效果_全部_${stamp}.json`;
  download(new Blob([JSON.stringify(b, null, 1)], { type: 'application/json' }), fn);
  flash(`已导出 ${b.effects.length} 个我的效果、${b.templates.length} 个我的模板：${fn}（换浏览器 / 发给同事后在「我的效果」组头点「导入…」）`, false, 9000);
  return b;
}
function myImportPick() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json'; inp.multiple = true;
  inp.addEventListener('change', () => { const fs = [...(inp.files || [])]; if (fs.length) myImportFiles(fs); });
  inp.click();
}
async function myImportFiles(files) {
  const docs = [], bad = [];
  for (const f of files) {
    try { if (f.size > 64 * 1024 * 1024) throw new Error('文件太大'); docs.push(...myImportUnpack(JSON.parse(await f.text()))); }
    catch (e) { bad.push(`${f.name}：${e.message || e}`); }
  }
  return myImportDocs(docs, bad);
}
// 一个文件里有哪些东西（导出全部的包拆开）；不认识的格式报错
function myImportUnpack(doc) {
  if (!doc || typeof doc !== 'object') throw new Error('不是烘焙器的文件');
  if (doc.format === MY_BUNDLE) return [...(doc.effects || []), ...(doc.templates || [])];
  if (['fwl.myrecipe/1', 'fwl.mytemplate/1', 'fwl.recipe/1'].includes(doc.format)) return [doc];
  throw new Error('不认识的格式「' + (doc.format || '没写') + '」（要 fwl.mybundle/1、fwl.myrecipe/1、fwl.mytemplate/1 或 fwl.recipe/1）');
}
// fwl.recipe/1（⋯「导出配方文件」）→ 我的效果记录：单层的礼花包成一层的多层效果（和「保存成我的效果」同一个做法），原生单层（尾缀全套等）保持单层
function myRecFromRecipe(doc) {
  const sn = doc && doc.snap, obj = x => x && typeof x === 'object' && !Array.isArray(x);
  if (!obj(sn)) throw new Error('图层数据不完整');
  const name = String(doc.name && doc.name !== 'AI 版' ? doc.name : doc.base || '导入的效果') + '（导入）';
  let snap;
  if (sn.kind === 'single') {
    if (!obj(sn.P) || !Object.hasOwn(TYPES, sn.P.type) || !obj(sn.M)) throw new Error('单层类型或参数不完整');
    snap = multiLayerBlock(sn.P) ? { kind: 'single', P: structuredClone(sn.P), M: structuredClone(sn.M), repId: sn.repId || null }
      : { kind: 'combo', name, layers: [{ id: null, type: sn.P.type, P: structuredClone(sn.P), M: structuredClone(sn.M), L: { title: String(doc.base || TYPE_NAMES[sn.P.type] || '第 1 层'), lid: myLid(), scale: 1, delay: 0, rate: 1, mirror: false } }] };
  } else if (sn.kind === 'combo') {
    snap = { kind: 'combo', name, layers: (sn.layers || []).map((x, i) => { if (!obj(x)) throw new Error('图层数据不完整'); const type = x.type || (x.P && x.P.type);
      return { id: null, type, P: structuredClone(x.P), M: structuredClone(x.M), L: { scale: 1, delay: 0, rate: 1, mirror: false, ...structuredClone(x.L || {}), title: (x.L && x.L.title) || `第 ${i + 1} 层`, lid: (x.L && x.L.lid) || myLid() } }; }) };
  } else throw new Error('配方形态不完整');
  const id = myId(), first = snap.kind === 'single' ? snap.P.type : snap.layers[0] && snap.layers[0].type, en = enNameSuggest(TYPE_EN[first] || 'Fx');
  const rec = repoRecipe({ format: 'fwl.myrecipe/1', id, key: 'my:' + id, name, at: doc.at || wbNow(), snap, links: [], from: { key: doc.key || '', name: doc.base || doc.key || '配方文件', base: doc.base || '', ver: doc.baseVer || '' },
    ue: { base: en, layers: [], system: en } });     // 和仓库读取同一套校验（类型、参数、层）
  rec.created = wbNow(); rec.updated = wbNow(); return rec;
}
function myImportDocs(docs, bad = []) {
  const n = { fx: 0, same: 0, copy: 0, tpl: 0, tplSame: 0 }, stable = x => Array.isArray(x) ? x.map(stable) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, stable(x[k])])) : x;
  for (const doc of docs) {
    try {
      if (doc.format === 'fwl.mytemplate/1') {
        const { format, tool, ...t } = doc, obj = x => x && typeof x === 'object' && !Array.isArray(x);
        if (typeof t.name !== 'string' || !Object.hasOwn(TYPES, t.type) || !obj(t.P) || !obj(t.M)) throw new Error('我的模板「' + (t.name || '?') + '」类型或参数不完整');
        const all = tplAll(), sig = JSON.stringify(stable(t)), local = t.id && all[t.id];
        if (local && JSON.stringify(stable(local)) === sig) { n.tplSame++; continue; }
        const rec = { ...structuredClone(t) }; if (!rec.id || local) { rec.id = 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); if (local) rec.name += ' · 导入'; }
        if (!tplPut(rec)) throw new Error('浏览器存储写不进去（空间不够？）'); n.tpl++; continue;
      }
      let rec;
      if (doc.format === 'fwl.recipe/1') rec = myRecFromRecipe(doc);
      else if (typeof doc.key === 'string' && !doc.key.startsWith('my:')) { rec = myRecoverSingle(doc.key, doc); if (!rec) throw new Error('「' + (doc.name || doc.key) + '」不是我的效果（只是某个效果的版本记录）'); }
      else rec = repoRecipe(doc);
      if (doc.created) rec.created = doc.created;
      const local = myAll()[rec.id];
      if (local && repoRecipeSig(local) === repoRecipeSig(rec)) { n.same++; continue; }
      if (local || (lib.my && lib.my.id === rec.id)) { rec.id = myId(); rec.name += ' · 导入'; if (rec.snap.kind === 'combo') rec.snap.name = rec.name; n.copy++; }
      if (!myPut(rec) || !myAll()[rec.id]) throw new Error('浏览器存储写不进去（空间不够？）');
      try { myRestorePrefs(rec); } catch (e) { bad.push(`「${rec.name}」的英文名缓存没写上：${e.message || e}`); }
      n.fx++;
    } catch (e) { bad.push(e.message || String(e)); }
  }
  if (n.fx || n.tpl) { lib.open.myfx = true; if (n.tpl) lib.open.mytpl = true; store.set('libOpen2', lib.open); renderLib(); }
  const parts = [`新增我的效果 ${n.fx} 个${n.copy ? `（其中 ${n.copy} 个和本地同编号但内容不同，另加了一份「· 导入」，本地的没动）` : ''}`];
  if (n.same) parts.push(`${n.same} 个和本地一模一样，没重复加`);
  if (n.tpl || n.tplSame) parts.push(`我的模板新增 ${n.tpl} 个${n.tplSame ? `、${n.tplSame} 个已有` : ''}`);
  if (bad.length) parts.push(`${bad.length} 项没导入：${bad.slice(0, 3).join('；')}${bad.length > 3 ? '…' : ''}`);
  flash('导入完成：' + parts.join('；'), !!bad.length, 12000, true);
  return { ...n, bad };
}
