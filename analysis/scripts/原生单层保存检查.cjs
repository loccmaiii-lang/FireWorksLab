// 原生尾缀保存回归：执行真实控制器，隔离 DOM、浏览器存储和文件夹，不打开浏览器或 UE。
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = __dirname + '/../../tool/src/js/';
function fn(file, name) {
  const s = fs.readFileSync(root + file, 'utf8'), m = new RegExp('^(?:async )?function ' + name + '\\(', 'm').exec(s);
  assert(m, '缺少函数 ' + name);
  const tail = s.slice(m.index), next = /\r?\n(?:function |async function |const |let |if \(|setInterval\(|window\.)/.exec(tail);
  return next ? tail.slice(0, next.index) : tail;
}
function dir(entries = {}) { return { kind: 'directory', name: 'FireWorksLab', async queryPermission() { return 'granted'; }, async getDirectoryHandle(n) { if (!entries[n]) throw Object.assign(Error(n), { name: 'NotFoundError' }); return entries[n]; }, async *values() { for (const [name, e] of Object.entries(entries)) yield { name, ...e }; } }; }
function file(doc) { return { kind: 'file', async getFile() { const text = JSON.stringify(doc); return { size: text.length, lastModified: 1, async text() { return text; } }; } }; }
const nodes = new Map(), messages = [], memory = {}, writes = [];
const el = id => nodes.get(id) || (nodes.set(id, { textContent: id === '#abName' ? '正式资源-升空尾缀' : '', disabled: false, hidden: false, title: '', children: [], dataset: {}, querySelector() { return null; }, insertAdjacentHTML() {}, addEventListener() {} }), nodes.get(id));
let failKey = '', failRepo = false, failOpen = false, dialogs = 0, bakeCalls = 0, comboCalls = 0;
const native = { kind: 'single', P: { type: 'tailS', form: 'emitset', outPC: 'seq', outMobile: 'seq', rtH: 190, duration: 6.4, art: { seed: 18, stars: 12 } }, M: { tint: [1, .5, .2], glow: 2 }, repId: 'RT6S' };
const ctx = vm.createContext({ console, structuredClone, Date, Math,
  setTimeout() {}, clearTimeout() {},
  state: { tab: 'master', P: structuredClone(native.P), M: structuredClone(native.M), repId: native.repId, layers: [], links: [], name: 'RT6S', layerView: {} },
  lib: { q: '', key: 'ef:trail_phys', effect: { key: 'trail_phys', 名: '升空尾缀', 英文名: 'RiseTrail' }, review: { id: 'RT6S' }, my: null },
  wb: { key: 'ef:trail_phys', src: { kind: 'ai' }, sig: 'old' },
  TYPES: { tailS: {}, tailM: {}, tailL: {}, kiku: {} }, TYPE_EN: { tailS: 'RiseTrail', tailM: 'RiseTrail', tailL: 'RiseTrail', kiku: 'Kiku' }, TYPE_NAMES: {}, REPLICA_BY_ID: { RT6S: { name: '原生尾缀' } },
  store: { get(k, d) { return structuredClone(memory[k] ?? d); }, set(k, v) { if (failKey === k) return false; memory[k] = structuredClone(v); return true; } },
  $: el, flash: (msg, bad) => messages.push({ msg, bad }), syncEnName() {},
  familyOf: t => /^tail/.test(t) ? 'rise' : 'aerial', isEmit: p => p.form === 'emitset', rtPcFull: p => p.outPC === 'full',
  askSaveName: async () => { dialogs++; return '正式资源-升空尾缀-Tiny'; }, wbNow: () => '2026-10-14 20:00',
  wbKey: () => ctx.lib.key, wbBaseId: () => ctx.lib.my?.name || 'RT6S', wbAll: () => ctx.store.get('mySaves', {}), wbList: () => ctx.store.get('mySaves', {})[ctx.wb.key] || [], wbSig: () => JSON.stringify(ctx.wbSnap()),
  wbSync() {}, wbRefresh() { ctx.wb.key = ctx.lib.key; ctx.wb.src = { kind: 'ai' }; }, renderLib() { if (failOpen) throw Error('列表刷新测试失败'); },
  beforeOpen() { ctx.lib.my = null; }, migBegin() {}, migEnd() {}, setQueuedView() {}, setReview(r) { ctx.lib.review = r; }, syncComboPanels() {}, crumb() {},
  setTab: async t => { ctx.state.tab = t; ctx.state.comboSel = -1; }, migrate37: p => p, buildMasterPanel() {}, onParam() { bakeCalls++; }, bakeMode: {},
  applyCombo: async s => { comboCalls++; ctx.state.layers = s.layers.map(x => ({ ...x, ...x.src })); }, layerEntryOf: l => l?.P ? l : null, layerName: i => '层' + i, selectComboLayer() {},
  sizeSpecKeyNow: () => ({ key: ctx.lib.my?.sizeSource?.key || ctx.lib.effect?.key || '', entry: ctx.lib.my?.sizeSource?.entry || ctx.lib.review?.id || '', wk: ctx.lib.key }),
  sizePickKey: o => o.wk.startsWith('my:') ? o.wk : o.key || o.entry || o.wk,
  sizeSpecPicks: () => ctx.store.get('sizeSpecPick', {}), EFFS: () => [],
  thUser: () => '', thSnapStyle: () => '', typeThumbStyle: () => '', libMatch: () => true, libGroup: () => el('group'), libItem: (g, k, html) => { el(k).html = html; },
  pkOpen() {}, deleteLabel: () => '', mtOpenId: () => null,
  sizeClassById: id => id === 'cls:h:front:62' ? { id, burst_m: 62 } : null,
  window: { SIZE_SPEC: { version: 1, specs: { TR_SMALL: { burst_m: 190 } }, map: { trail_phys: ['TR_SMALL'] } } },
  document: { querySelector: el, documentElement: { style: { setProperty() {} } } }, ResizeObserver: class { observe() {} },
  layoutRef() {}, rvCopy() {}, initWorkbench() {}, initPanels() {}, effIsNew: () => false, FW_REVIEW_LIST: [], location: { search: '' },
});
vm.runInContext(fs.readFileSync(root + '61_naming.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(root + '79_myfx.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync(root + '79_repo.js', 'utf8'), ctx);
const sizeSource = fs.readFileSync(root + '66_fwlcascade.js', 'utf8');
vm.runInContext(fn('66_fwlcascade.js', 'sizeSpecKeyNow') + '\n' + fn('66_fwlcascade.js', 'sizeSpecIds') + '\n' + fn('66_fwlcascade.js', 'sizeSpecFor') + '\n' + sizeSource.match(/^const sizePickKey = .*;$/m)[0] + '\n' + sizeSource.match(/^const sizeSpecTable = .*;$/m)[0], ctx);
for (const name of ['wbSnap', 'wbPut', 'wbSave', 'wbSaveVersion']) if (new RegExp('function ' + name + '\\(').test(fs.readFileSync(root + '79_workbench.js', 'utf8'))) vm.runInContext(fn('79_workbench.js', name), ctx);
for (const name of ['wbDeriveMine', 'addLayerAnywhere', 'syncAssetOps']) vm.runInContext(fn('79_assetops.js', name), ctx);
ctx.repoWrite = async (key, rec) => { writes.push({ key, rec: structuredClone(rec) }); if (failRepo) throw Error('仓库写入测试失败'); return 'analysis/我的配方/' + key; };
// 4.9.101：ef:trail_phys 是分档效果（小 / 中 / 大共用这一条名字），手动名要记下保存时的档（entry）才是这一档的最终名；没记档的旧记录只当基础名（见 打开代次命名回归.cjs）
ctx.store.set('packNames', { 'ef:trail_phys': { base: 'Tiny', system: 'Tiny', layers: ['Trail'], entry: 'RT6S' } });
ctx.store.set('sizeSpecPick', { trail_phys: 'cls:h:front:62' });
const checks = [], failures = [];
async function check(name, f) { try { await f(); checks.push(name); } catch (e) { failures.push(name + '：' + e.message); } }
const plain = x => JSON.parse(JSON.stringify(x));
(async () => {
  let saved;
  await check('保存入口将全套尾缀存成独立效果，不退回原效果版本', async () => {
    saved = await ctx.wbSave(true);
    assert(saved?.id?.startsWith('fx')); assert.equal(Object.keys(memory.myEffects || {}).length, 1);
    assert.equal(ctx.state.tab, 'master'); assert.deepEqual(plain(saved.snap), native); assert.equal((memory.mySaves?.['ef:trail_phys'] || []).length, 0);
  });
  await check('原生单层打开走单层烘焙，保持全部参数和形态', async () => {
    assert(saved); await ctx.openMyEffect(saved.id); assert.equal(ctx.state.tab, 'master');
    assert.deepEqual(plain(ctx.state.P), native.P); assert.deepEqual(plain(ctx.state.M), native.M); assert.equal(ctx.state.repId, native.repId); assert.equal(comboCalls, 0); assert(bakeCalls > 0);
  });
  await check('副本继承最终英文名与尺寸，尺寸选择不会回写来源', () => {
    assert(saved); assert.equal(memory.packNames['my:' + saved.id].system, 'Tiny'); assert.equal(memory.sizeSpecPick['my:' + saved.id], 'cls:h:front:62');
    ctx.store.set('sizeSpecPick', { ...memory.sizeSpecPick, ['my:' + saved.id]: 'none' }); assert.equal(memory.sizeSpecPick.trail_phys, 'cls:h:front:62');
    const spec = ctx.sizeSpecKeyNow(); assert.equal(spec.key, 'trail_phys'); assert.equal(ctx.sizeSpecFor(spec.key, spec.entry, undefined, spec.wk).off, true);
    assert.equal(ctx.sizeSpecFor('trail_phys', 'RT6S', undefined, 'ef:trail_phys').burst_m, 62);
  });
  await check('再次另存保留原记录，名称和当前尺寸随新副本保存', async () => {
    assert(saved); const before = structuredClone(memory.myEffects[saved.id]); ctx.state.P.rtH = 62;
    const copy = await ctx.wbSave(true); assert(copy && copy.id !== saved.id); assert.deepEqual(memory.myEffects[saved.id], before);
    assert.equal(copy.snap.P.rtH, 62); assert.equal(copy.sizePick, 'none'); assert.equal(memory.packNames['my:' + copy.id].system, 'Tiny'); saved = copy;
  });
  await check('保存当前单层覆盖自身，不增加副本，不改变来源', async () => {
    assert(saved); const n = Object.keys(memory.myEffects).length; ctx.state.P.duration = 3.5; const out = await ctx.wbSave(false);
    assert.equal(out.id, saved.id); assert.equal(Object.keys(memory.myEffects).length, n); assert.equal(out.snap.P.duration, 3.5); assert.equal(out.from.key, 'ef:trail_phys');
  });
  await check('左栏单层列表不读取不存在的 layers，加层按钮明确禁用', () => {
    ctx.myLibGroup(el('host')); assert.match(el('my:' + saved.id).html, /单层/); ctx.syncAssetOps(); assert.equal(el('#abAddLayer').disabled, true);
  });
  await check('单层配方可从仓库恢复，参数、命名、尺寸均保留', async () => {
    assert(saved); const doc = { format: 'fwl.myrecipe/1', ...writes.at(-1).rec, key: writes.at(-1).key }; const parsed = ctx.repoRecipe(doc);
    assert.deepEqual(plain(parsed.snap), plain(memory.myEffects[saved.id].snap)); assert.equal(parsed.sizePick, 'none');
    assert.throws(() => ctx.repoRecipe({ ...doc, snap: { ...doc.snap, P: { type: 'bad' } } }));
  });
  await check('存储失败保留当前编辑与原记录，不写仓库或提示成功', async () => {
    const before = structuredClone(memory.myEffects), n = writes.length; failKey = 'myEffects'; messages.length = 0; ctx.state.P.duration = 4;
    assert.equal(await ctx.wbSave(false), null); failKey = ''; assert.deepEqual(memory.myEffects, before); assert.equal(writes.length, n); assert(messages.at(-1)?.bad); assert.equal(ctx.state.P.duration, 4);
  });
  await check('仓库失败不会覆盖失败提示，浏览器副本仍可找到', async () => {
    failRepo = true; messages.length = 0; const out = await ctx.wbSave(false); failRepo = false;
    assert(out && memory.myEffects[out.id]); assert(messages.at(-1).bad); assert.match(messages.at(-1).msg, /仓库.*失败/);
  });
  await check('列表刷新失败区分参数已保存，恢复后可打开', async () => {
    failOpen = true; messages.length = 0; const out = await ctx.wbSave(true); failOpen = false;
    assert(out && memory.myEffects[out.id]); assert.match(messages.at(-1).msg, /已保存.*刷新.*失败/); await ctx.openMyEffect(out.id); saved = out;
  });
  await check('名称缓存失败时记录仍含最终名称，重试可恢复，不退回默认名', async () => {
    failKey = 'packNames'; messages.length = 0; const copy = await ctx.wbSave(true); failKey = '';
    assert(copy); assert.equal(memory.myEffects[copy.id].ue.system, 'Tiny'); assert(messages.at(-1).bad);
    await ctx.openMyEffect(copy.id); assert.equal(memory.packNames['my:' + copy.id].system, 'Tiny'); saved = copy;
  });
  await check('尺寸缓存失败时选择仍在记录中，重试可恢复，不回写来源', async () => {
    failKey = 'sizeSpecPick'; messages.length = 0; const copy = await ctx.wbSave(true); failKey = '';
    assert(copy); assert.equal(memory.myEffects[copy.id].sizePick, 'none'); assert(messages.at(-1).bad);
    await ctx.openMyEffect(copy.id); assert.equal(memory.sizeSpecPick['my:' + copy.id], 'none'); assert.equal(memory.sizeSpecPick.trail_phys, 'cls:h:front:62'); saved = copy;
  });
  await check('取消另存没有创建新记录或写文件，按钮恢复可点击', async () => {
    const ask = ctx.askSaveName, n = Object.keys(memory.myEffects).length, nw = writes.length; ctx.askSaveName = async () => null;
    assert.equal(await ctx.wbSave(true), null); ctx.askSaveName = ask; assert.equal(Object.keys(memory.myEffects).length, n); assert.equal(writes.length, nw); assert.equal(el('#abSaveAs').disabled, false);
  });
  await check('保存后展开我的效果，旧搜索不会隐藏新副本', async () => {
    const match = ctx.libMatch; ctx.lib.q = '旧效果搜索'; ctx.libMatch = () => false;
    await ctx.wbSave(false); assert.equal(ctx.lib.q, ''); assert.equal(ctx.lib.seg, 'passed'); assert.equal(el('#libSearch').value, ''); ctx.libMatch = match;
  });
  await check('保存中重复点击只开启一次命名，不创建重复副本', async () => {
    const ask = ctx.askSaveName, before = dialogs; let resolve; ctx.askSaveName = () => { dialogs++; return new Promise(r => resolve = r); };
    const first = ctx.wbSave(true); await Promise.resolve(); await Promise.resolve(); assert(resolve); assert.equal(el('#abSave').disabled, true);
    await ctx.wbSave(true); assert.equal(dialogs, before + 1); resolve('第二份Tiny'); await first; ctx.askSaveName = ask; assert.equal(el('#abSave').disabled, false);
  });
  const legacy = { id: 'old1', name: '正式资源-升空尾缀-Tiny', at: '2026-10-14 19:05', base: 'RT6S', snap: structuredClone(native) };
  await check('旧人工版本按同源同名同参数去重恢复，保留原版本并跳过草稿/导出', () => {
    const list = [legacy, { ...legacy, id: 'old2', at: '2026-10-14 19:07' }, { ...legacy, id: 'draft', draft: true }, { ...legacy, id: 'auto', auto: 'export' }];
    ctx.store.set('mySaves', { 'ef:trail_phys': list }); const n = Object.keys(memory.myEffects).length;
    ctx.myMigrateSingleSaves(); assert.equal(Object.keys(memory.myEffects).length, n + 1); assert.deepEqual(memory.mySaves['ef:trail_phys'], list);
    ctx.myMigrateSingleSaves(); assert.equal(Object.keys(memory.myEffects).length, n + 1);
  });
  await check('旧版本的仓库读取与浏览器恢复使用同一编号，不自动写文件', async () => {
    const before = writes.length, n = Object.keys(memory.myEffects).length, doc = { format: 'fwl.myrecipe/1', key: 'ef:trail_phys', ...legacy };
    ctx.root = dir({ analysis: dir({ 我的配方: dir({ ef_trail_phys: dir({ 'old.json': file(doc), 'draft.json': file({ ...doc, draft: true }) }) }) }) });
    await vm.runInContext('repoDir.h = root; repoRead({ interactive: false })', ctx);
    assert.equal(writes.length, before); assert.equal(Object.keys(memory.myEffects).length, n);
    delete memory.myEffects[ctx.myRecoverSingle(doc.key, doc).id];
    await vm.runInContext('repoRead({ interactive: false })', ctx); assert.equal(Object.keys(memory.myEffects).length, n - 1, '启动不复活主动删除的恢复副本');
    await vm.runInContext('repoRead({ interactive: true })', ctx); assert.equal(Object.keys(memory.myEffects).length, n);
  });
  await check('V5及物理尾缀也按原形态打开，合成一张和普通多层保存路径仍可用', async () => {
    for (const form of ['trail', 'unit', 'loop']) {
      const sn = { ...structuredClone(native), P: { ...native.P, form } }; await ctx.myApplySnap(sn); assert.equal(ctx.state.tab, 'master'); assert.deepEqual(plain(ctx.state.P), sn.P);
    }
    const sn = { kind: 'combo', name: '普通多层', layers: [{ type: 'kiku', P: { type: 'kiku' }, M: { color: 1 }, L: { title: 'Main', lid: 'l1' } }] };
    await ctx.setTab('combo'); await ctx.myApplySnap(sn); assert.equal(ctx.state.layers.length, 1); assert.equal(ctx.mySnap().kind, 'combo');
  });
  await check('真实启动入口按 lastKey 重新打开保存的原生单层', async () => {
    ctx.store.set('lastKey', 'my:' + saved.id); ctx.lib.my = null; ctx.lib.key = ''; ctx.state.P = { type: 'kiku' };
    const open = ctx.openMyEffect; let pending; ctx.openMyEffect = id => pending = open(id);
    vm.runInContext(fn('79_library.js', 'initLibrary'), ctx); ctx.initLibrary(); assert(pending); await pending; ctx.openMyEffect = open;
    assert.equal(ctx.state.tab, 'master'); assert.deepEqual(plain(ctx.state.P), memory.myEffects[saved.id].snap.P);
  });
  await check('多层保存与另存仍保留所有图层、联动和原副本', async () => {
    const sn = { kind: 'combo', name: '多层', layers: ['l1', 'l2'].map(lid => ({ type: 'kiku', P: { type: 'kiku', seed: lid }, M: { color: 1 }, L: { title: lid, lid } })) };
    const rec = { id: 'fxcombo_test', name: '多层', snap: sn, links: [['l1', 'l2']] }; ctx.myPut(rec); await ctx.openMyEffect(rec.id);
    const out = await ctx.wbSave(false), before = structuredClone(memory.myEffects[rec.id]); assert.equal(out.snap.layers.length, 2); assert.deepEqual(plain(out.links), rec.links);
    const copy = await ctx.wbSave(true); assert(copy.id !== rec.id); assert.deepEqual(memory.myEffects[rec.id], before); assert.equal(copy.snap.layers.length, 2); assert.deepEqual(plain(copy.links), rec.links);
  });
  const actualDir = __dirname + '/../我的配方/_待上传/ef_trail_phys';
  const actualFiles = fs.existsSync(actualDir) ? fs.readdirSync(actualDir).filter(n => /^正式资源-升空尾缀-Tiny__.*\.json$/.test(n)) : [];
  if (actualFiles.length >= 2) await check('两份实际 Tiny 保存文件逐字保留参数，恢复为同一个效果', () => {
    const docs = actualFiles.map(n => JSON.parse(fs.readFileSync(actualDir + '/' + n, 'utf8')));
    const ids = docs.map(d => { const r = ctx.myRecoverSingle(d.key, d); assert(r); assert.deepEqual(plain(r.snap), d.snap); return r.id; }); assert.equal(new Set(ids).size, 1);
  });
  console.log(`原生单层保存：${checks.length}/${checks.length + failures.length} 通过`); for (const s of failures) console.error('FAIL ' + s); if (failures.length) process.exitCode = 1;
})();
