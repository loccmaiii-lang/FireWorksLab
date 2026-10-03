// =====================================================================
//  4.2.7 新建效果 / 组合（用户 2026-10-02 19:41「我要开始批量出素材了……没地方创建组合与添加图层」；走查 B18：替换旧的组合编辑器）
//  「我的效果」= 你自己搭的多层效果：第一层从花型模板或现有效果的某一层开始，之后加层、删层、复制、改名、上下挪；
//  每层是独立的一份参数（不跟着模板或原条目变）；哪几层是「同一批星」（轨迹参数一起变）由你勾，不再靠猜。
//  存在这台电脑的浏览器里；连了仓库文件夹，「保存」顺便写进 analysis/我的配方/my_<编号>/（后台脚本推上去，AI 能直接读）。
//  英文名（UE 资产名：效果名 + 每层名）在「查看交付」里改，和其它效果同一套命名规则。
// =====================================================================
const myAll = () => store.get('myEffects', {});
function myPut(rec) { const all = myAll(); all[rec.id] = rec; store.set('myEffects', all); }
function myDelete(id) { const all = myAll(); delete all[id]; store.set('myEffects', all); }
const myLid = () => 'l' + Math.random().toString(36).slice(2, 7);
// 层的来源：花型模板 key / 'rep:<正式库>' / 'rv:<条目>' → { type, P, M, title }（参数复制一份，以后各改各的）
function mySrc(key) {
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
// 新建：先在花型库里选第一层（模板或现有效果的层），再起名字
function myNew() { pkOpen({ mode: 'newEffect', title: '新建效果 · 先选第一层（之后可以再加层）', onPick: myCreate }); }
async function myCreate(key) {
  const n = Object.keys(myAll()).length + 1, name = prompt('新效果叫什么？（中文名，之后在资产栏 ⋯ 里能改；英文名在「查看交付」里改）', `新效果 ${n}`);
  if (name == null) return;
  const s = mySrc(key), id = 'fx' + Date.now().toString(36);
  const rec = { id, name: name.trim() || `新效果 ${n}`, created: wbNow(), updated: wbNow(), links: [],
    snap: { kind: 'combo', name: name.trim(), layers: [{ id: null, type: s.type, P: s.P, M: s.M, L: { title: s.title, lid: myLid(), scale: 1, delay: 0, rate: 1, mirror: false } }] } };
  myPut(rec); await openMyEffect(id);
  flash(`已新建「${rec.name}」：右栏「观察图层」里加层、改名；调好了点资产栏「保存」`);
}
async function openMyEffect(id, o = {}) {
  const rec = myAll()[id]; if (!rec) { flash('找不到这个效果', true); return; }
  if (!o.keep) beforeOpen(null);
  setQueuedView(false); lib.effect = null; lib.formal = null; lib.my = { ...rec, linksLive: structuredClone(rec.links || []) }; wb.entry = undefined; lib.key = 'my:' + id; store.set('lastKey', lib.key);
  setReview(null); state.comboSel = -1; state.layerView = { solo: -1, mute: [] };
  await setTab('combo', { lazy: true }); syncComboPanels();
  await myApplySnap(rec.snap);
  renderLib(); crumb('我的效果', rec.name); wbRefresh();
}
// 按快照搭层：每层一份自己的参数（libOwn 烘焙），层上带名字、稳定编号
async function myApplySnap(snap) {
  await applyCombo({ name: snap.name, layers: snap.layers.map(x => ({ src: { type: x.type, P: x.P, M: x.M }, ...structuredClone(x.L), lid: (x.L && x.L.lid) || myLid() })) });
}
function mySnap() { const s = wbSnap(); s.layers.forEach((x, i) => { x.id = null; const L = state.layers[i]; x.L.title = L.title || layerName(i); x.L.lid = L.lid || (L.lid = myLid()); }); return s; }
// 保存 = 覆盖这个效果；另存为 = 复制成一个新效果
async function mySave(asNew) {
  const rec = myRec(); if (!rec) return;
  if (repoDir.h && !repoDir.ok) await repoPerm(true);
  let out = rec;
  if (asNew) { const nm = prompt('另存为新效果，叫什么？', rec.name + ' 副本'); if (nm == null) return; out = { ...structuredClone(rec), id: 'fx' + Date.now().toString(36), name: nm.trim() || rec.name + ' 副本', created: wbNow() }; }
  Object.assign(out, { updated: wbNow(), snap: mySnap(), links: myLinksLid() }); delete out.linksLive;
  myPut(out);
  const drafts = wbList().filter(x => x.draft); if (drafts.length && !asNew) wbPut(wbList().filter(x => !x.draft));   // 存了就不要草稿了
  let path = null; try { path = await repoWrite('my:' + out.id, { id: out.id, name: out.name, at: out.updated, base: '我的效果', snap: out.snap, links: out.links, ue: packNamesFor('my:' + out.id, null, state.layers.length, 'MyFx') }); } catch (e) { flash('存进仓库文件夹失败：' + (e.message || e), true); }
  if (asNew) { await openMyEffect(out.id, { keep: true }); }
  else { lib.my = { ...out, linksLive: structuredClone(out.links) }; wb.src = { kind: 'ai' }; wb.sig = wbSig(); wbSync(); renderLib(); }
  flash(path ? `已保存「${out.name}」：浏览器里一份 + 仓库 analysis/我的配方/my_${out.id}/` : `已保存「${out.name}」（这台电脑的浏览器里；⋯「连接仓库文件夹」后会顺便存进 git）`);
}
function myRename() {
  const rec = myRec(); if (!rec) return; const n = prompt('效果的中文名', rec.name); if (n == null) return;
  rec.name = n.trim() || rec.name; myPut(rec); lib.my.name = rec.name; state.comboName = rec.name; crumb('我的效果', rec.name); wbSync(); renderLib();
}
function myRemove() {
  const rec = myRec(); if (!rec || !confirm(`删除你的效果「${rec.name}」？（只删这台电脑浏览器里的；已推进 git 的文件不动）`)) return;
  myDelete(rec.id); wbPut([]); lib.my = null; openType('kiku');
}
// ---------------- 层：加、删、复制、改名、上下挪 ----------------
function myAddLayer() { pkOpen({ mode: 'addLayer', title: '加一层 · 选花型模板，或现有效果里的某一层（参数复制一份）', onPick: myAddLayerFrom }); }
async function myAddLayerFrom(key) {
  const s = mySrc(key), e = await libOwn({ type: s.type, P: s.P, M: s.M });
  state.layers.push(newLayer(e, { title: s.title, lid: myLid() }));
  myLayersChanged(); selectComboLayer(state.layers.length - 1); flash(`加了第 ${state.layers.length} 层「${s.title}」`);
}
async function myDupLayer(i) {
  const L = state.layers[i], e = layerEntryOf(L); if (!e) return;
  const f = libFork(e), { lib: _l, ...rest } = structuredClone(L);
  state.layers.splice(i + 1, 0, { ...rest, lib: f.name, title: (L.title || layerName(i)) + ' 副本', lid: myLid() });
  myLayersChanged(); selectComboLayer(i + 1);
}
function myDelLayer(i) {
  if (state.layers.length <= 1) { flash('至少留一层', true); return; }
  if (!confirm(`删掉第 ${i + 1} 层「${layerName(i)}」？（保存前都能用「版本 → 已保存」找回）`)) return;
  const L = state.layers.splice(i, 1)[0], e = state.lib.find(x => x.name === L.lib);
  if (e && e.own && !state.layers.some(x => x.lib === e.name)) { dropLibBake(e); state.lib.splice(state.lib.indexOf(e), 1); }
  state.comboSel = -1; myLayersChanged(); syncComboPanels();
}
function myMoveLayer(i, d) {
  const j = i + d; if (j < 0 || j >= state.layers.length) return;
  const a = state.layers; [a[i], a[j]] = [a[j], a[i]];
  const sel = state.comboSel === i ? j : state.comboSel === j ? i : state.comboSel; state.comboSel = sel; myLayersChanged();
}
function myRenameLayer(i) {
  const L = state.layers[i]; const n = prompt('这一层的中文名（英文名在「查看交付」里改）', L.title || layerName(i)); if (n == null) return;
  L.title = n.trim() || L.title; buildLayerCard(); if (state.comboSel === i) buildLayerHead(i); stage2.tlSig = '';
}
function myLayersChanged() {
  computeLinks(); buildComboPanel(); buildLayerCard(); if (state.comboSel >= 0) buildLayerHead(state.comboSel);
  stage2.tlSig = ''; wbSync();
}
// ---------------- 同一批星（明确勾选，不靠猜） ----------------
// lib.my.linksLive：[[lid, lid, …], …]（按层的稳定编号记，层挪位置、加删都不乱）；同一组里的层轨迹参数（种子、星数、初速、终端速度、重力、离散…）一起变
function myLinksLid() { return ((lib.my && lib.my.linksLive) || []).map(g => g.filter(l => state.layers.some(L => L.lid === l))).filter(g => g.length > 1); }
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
  return `<div class="lh-link">同一批星（勾上 = 种子、星数、初速、终端速度、重力、离散这些决定轨迹的参数和这一层一起变；勾的时候按这一层的值）：${others.map(([L, j]) => `<label class="check"><input type="checkbox" data-link="${j}"${linked.has(j) ? ' checked' : ''}> 第 ${j + 1} 层 · ${layerName(j)}</label>`).join('')}</div>`;
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
function myLibGroup(host) {
  const list = Object.values(myAll()).filter(r => libMatch(r.name, r.id)).sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
  const g = libGroup(host, 'myfx', '我的效果', list.length);
  if (!list.length) g.insertAdjacentHTML('beforeend', '<p class="lsub">还没有。点最下面「＋ 新建效果」：先选第一层（花型模板或现有效果的层），再加层、改名、调参数。</p>');
  for (const r of list) {
    const t = r.snap && r.snap.layers[0] ? r.snap.layers[0].type : 'kiku', ue = packNamesFor('my:' + r.id, null, (r.snap.layers || []).length, 'MyFx').base;
    libItem(g, 'my:' + r.id, `<span class="th" style="${typeThumbStyle(t)}"></span><span class="tx"><b>${r.name}</b><small>${ue} · ${(r.snap.layers || []).length} 层 · ${r.updated || ''}</small><span class="bds"><span class="badge">我的效果</span></span></span>`, () => openMyEffect(r.id));
  }
}
