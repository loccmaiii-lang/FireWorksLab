// =====================================================================
//  5.0.0-a1（team/external 分支，用户 10-27 17:28「做一个对外精简后的版本……可能会合入到主干升级到5.0」）
//  · 随包案例：data/team_cases.js（window.FW_CASES，fwl.mybundle/1，tool/team/build_cases.py 从用户「我的效果 → 导出全部」里挑）
//    首次打开（这个浏览器里还没有这些编号的我的效果）用「我的效果 → 导入…」同一个函数（myImportDocs）放进我的效果；
//    左栏最上面一组「案例」，打开 / 保存 / 另存为 / 导出都和我的效果一样，「我的效果」组里不重复列；删掉的不自动回来，组头「恢复案例」放回。
//    只看有没有案例数据（内部版不加载 team_cases.js = 没有这一组，行为不变）。
//  · 对外精简模式（TEAM_MODE，tool/build.py --team）：顶栏「对外版」、首屏提示、「资源交付」换成离线导入说明、导出（只下载 ZIP）后提示。
//    藏起来的内部入口（审阅页签、复制我的意见、更新记录、仓库文件夹……）在 style.css「5.0.0-a1 对外精简」一节。
// =====================================================================
const caseDocs = () => typeof FW_CASES !== 'undefined' && FW_CASES && Array.isArray(FW_CASES.effects) ? FW_CASES.effects : [];
let caseIdSet = null;
function caseHas(id) { if (!caseIdSet) caseIdSet = new Set(caseDocs().map(d => d.id)); return caseIdSet.has(id); }
// all = true：组头「恢复案例」，删掉的也放回（已有的同编号不动）
function casesImport(all) {
  const docs0 = caseDocs(); if (!docs0.length) return 0;
  const mine = myAll(), done = store.get('casesDone', {}) || {};
  const docs = docs0.filter(d => d && d.id && !mine[d.id] && (all || !done[d.id]));
  if (!docs.length) return 0;
  const r = myImportDocs(structuredClone(docs)), now = myAll(); let n = 0;
  for (const d of docs) if (now[d.id]) { done[d.id] = (FW_CASES && FW_CASES.at) || true; n++; }
  store.set('casesDone', done);
  if (r && r.bad && r.bad.length) flash(`案例放进了 ${n} 个，${r.bad.length} 个没放进去：${r.bad.slice(0, 2).join('；')}`, true, 14000, true);
  else if (n) flash(`已放进 ${n} 个案例：左栏最上面「案例」，点一个打开看效果`, false, 9000, true);
  return n;
}
function caseLibGroup(host) {
  teamSync();
  const docs = caseDocs(); if (!docs.length) return;
  const mine = myAll(), recs = docs.map(d => mine[d.id]).filter(r => r && libMatch(r.name, r.id)), missing = docs.filter(d => !mine[d.id]).length;
  if (lib.q && !recs.length) return;
  const restore = missing && !lib.q ? `<button type="button" class="lg-hid" data-case-restore title="把删掉的案例重新放回来（已有的不动）">恢复案例 ${missing}</button>` : '';
  const g = libGroup(host, 'cases', '案例', recs.length, false, restore);
  if (!lib.q) g.insertAdjacentHTML('beforeend', '<p class="lsub">点一个打开看效果。想改：改完点资产栏「另存为…」存成自己的效果，案例本身不动。</p>');
  for (const r of recs) myLibItem(g, r, '案例');
  const b = g.querySelector('[data-case-restore]'); if (b) b.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); casesImport(true); });
}
// ---------------- 对外精简模式 ----------------
function teamSync() { if (!TEAM_MODE) return; const w = $('#teamWelcome'); if (w) w.hidden = !!lib.key; }     // 打开了任何东西，首屏提示就收起
function teamInit() {
  if (!TEAM_MODE) return;
  $('#brandTeam').hidden = false;
  try { casesImport(false); } catch (e) { console.error(e); flash('案例没放进去：' + (e.message || e), true, 12000, true); }
  teamSync();
}
function teamImportHelp() { const d = $('#teamImportDlg'); if (d && !d.open && typeof d.showModal === 'function') d.showModal(); }
// DeliveryWorkspace.init 在对外版里只做这一件：顶栏「资源交付」→「导入 UE」（离线说明），不加载交付页、不连 8034
function teamDeliveryInit() {
  const b = $('#deliveryOpen'); if (b) { b.textContent = '导入 UE'; b.title = '导出的 ZIP 怎么导入 UE（离线，不用开本机服务）'; b.addEventListener('click', teamImportHelp); }
  $('#teamExportHelp').addEventListener('click', teamImportHelp);
  $('#teamExportClose').addEventListener('click', () => { $('#teamExportBar').hidden = true; });
}
function teamExported(name) { $('#teamExportName').textContent = name || '素材包'; $('#teamExportBar').hidden = false; }
