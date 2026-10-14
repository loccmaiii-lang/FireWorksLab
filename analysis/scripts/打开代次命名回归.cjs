// 4.9.101 打开代次与命名回归：执行真实打开 / 组合装载 / 我的效果 / 命名控制器，隔离 DOM、浏览器存储和烘焙（烘焙改成手动放行的 Promise），不开浏览器、不连 UE。
// 复现用户 10-14 实况（Chrome 配置 7 存档只读取证）：页面打开自动开「新」候选 QA20（组合，慢烘）→ 烘完前点「我的效果」Tiny
//   → 旧任务晚回 setReview(QA20) → wbKey = rv:QA20 → Tiny 的英文名 / 尺寸来源 / 缩略图记到 QA20 名下，交付清单显示别人的名字。
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = __dirname + '/../../tool/src/js/';
const src = f => fs.readFileSync(root + f, 'utf8');
function fn(file, name) {
  const s = src(file), m = new RegExp('^(?:async )?function ' + name + '\\(', 'm').exec(s);
  if (!m) return null;
  const tail = s.slice(m.index), next = /\r?\n(?:function |async function |const |let |if \(|setInterval\(|window\.|\/\/ )/.exec(tail);
  return next ? tail.slice(0, next.index) : tail;
}
const constLine = (file, name) => { const m = new RegExp('^const ' + name + ' = .*;$', 'm').exec(src(file)); return m ? m[0] : ''; };

// ---------- 隔离环境 ----------
const memory = {}, crumbs = [], flashes = [], pending = [];
const store = { get(k, d) { return structuredClone(memory[k] ?? d); }, set(k, v) { memory[k] = structuredClone(v); return true; } };
const node = new Map(), $ = k => node.get(k) || (node.set(k, { hidden: false, disabled: false, value: '', textContent: '', dataset: {}, title: '', querySelector: () => null, addEventListener() {} }), node.get(k));
const ef_qa = { key: 'qiuxing_a', 名: '球形A', 阶段: '待验收', 待验收版: 'QA20', 主条目: 'QA20', 英文名: 'TriColorChrysanthemum', 方案: [] };
const ef_tr = { key: 'trail_phys', 名: '升空尾缀', 阶段: '已通过', 已通过版: 'RT6M', 主条目: 'RT6M', 英文名: 'RiseTrail', 方案: [{ id: 'RT6S', label: '小' }, { id: 'RT6M', label: '中' }, { id: 'RT6L', label: '大' }] };
const QA20 = { id: 'QA20', kind: 'combo', name: '球形A · 核时间', combo: { name: 'QA20', layers: [{ m: 'rep:QA19' }, { m: 'rep:QA19B' }] } };
const pAir = n => ({ type: 'kiku', mark: n }), pTail = n => ({ type: 'tailS', form: 'emitset', mark: n });
const ctx = vm.createContext({
  console, structuredClone, Date, Math, JSON, setTimeout, clearTimeout, Promise, Set, Map, Object, Array, String, Number,
  store, $, document: { getElementById: k => $('#' + k), activeElement: null },
  window: { SIZE_SPEC: { version: 1, specs: { T_S: { name: '小', burst_m: 150 }, T_F: { name: 'XS', burst_m: 62, system_tag: 'XS' }, T_M: { burst_m: 210 }, T_L: { burst_m: 330 } }, map: { RT6S: ['T_S', 'T_F'], RT6M: 'T_M', RT6L: 'T_L' } } },
  state: { tab: 'master', P: pTail('init'), M: {}, layers: [], lib: [], view: 'live', layerView: { solo: -1, mute: [] }, comboSel: -1, platform: 'pc' },
  wb: { key: '', entry: null, src: { kind: 'ai' }, sig: '' }, stage2: {}, bakeMode: {}, MIG_ON: false, MIG_LOG: [],
  FW_EFFECTS: [ef_qa, ef_tr], FW_REVIEW_LIST: [QA20, { id: 'RT6S' }, { id: 'RT6M' }, { id: 'RT6L' }], EFF_PREFIX: [],
  REPLICA_BY_ID: { QA19: { id: 'QA19', name: 'QA19 层', base: 'kiku' }, QA19B: { id: 'QA19B', name: 'QA19 B', base: 'kiku' }, RT6S: { id: 'RT6S', name: 'RT6S 小', base: 'tailS' }, STROBE: { id: 'STROBE', name: '点灭星', base: 'strobe' } },
  MULTI_BY_ID: { mtA: { id: 'mtA', name: '多层模板A', en: 'MtA', layers: [{ en: 'X' }, { en: 'Y' }], note: '' } },
  TYPES: { kiku: {}, tailS: {}, tailM: {}, tailL: {}, strobe: {} }, TYPE_NAMES: { kiku: '菊', tailS: '尾缀小', tailM: '尾缀中', tailL: '尾缀大', strobe: '点灭' }, TYPE_EN: { kiku: 'Kiku', tailS: 'RiseTrail', tailM: 'RiseTrail', tailL: 'RiseTrail', strobe: 'Strobe' },
  bake: P => new Promise(r => pending.push({ P, r })), busy() {}, disposeBake() {}, flash: (m, bad) => flashes.push({ m, bad }),
  replicaPM: id => ({ P: { type: 'kiku', rep: id }, M: { stages: [] } }), defaultsFor: t => ({ P: { type: t }, M: { stages: [] } }), migrate37: p => p, derive: p => p,
  toggleDeliv() {}, syncStageTabs() {}, syncComboPanels() {}, computeLinks() {}, buildComboPanel() {}, buildLayerCard() {}, ensureComboMobile: async () => {},
  setTab: async t => { ctx.state.tab = t; }, setQueuedView() {}, renderLib() {}, crumb: (a, b) => crumbs.push(b), migBegin() {}, migEnd() {}, migNoteHide() {}, autoDraft: () => false,
  dropEffectEdits() {}, rememberLayerEdit() {}, setReplica: id => { ctx.state.repId = id; ctx.state.P = { type: ctx.REPLICA_BY_ID[id].base }; }, buildMasterPanel() {}, onParam() {}, curSig: () => 'sig', loadAssetEntry() {}, setType() {},
  setReview: e => { ctx.lib.review = e || null; ctx.wbRefresh(); }, wbRefresh: () => { ctx.wb.key = ctx.wbKey(); }, wbArm() {}, wbSync() {}, renderDeliv() {}, syncEnName() {},
  layerEntryOf: L => L && ctx.state.lib.find(x => x.name === L.lib), selectComboLayer() {}, layerName: i => '层' + i, myLid: () => 'l' + Math.random().toString(36).slice(2, 7),
  mtCombo: id => ({ name: id, layers: [{ src: { type: 'kiku', P: pAir('mt1'), M: { stages: [] } }, title: 'X' }, { src: { type: 'kiku', P: pAir('mt2'), M: { stages: [] } }, title: 'Y' }] }),
  sizeClassById: () => null, familyOf: t => /^tail/.test(t) ? 'rise' : 'aerial', isEmit: p => p && p.form === 'emitset', rtPcFull: () => false, wbNow: () => 'now', repoDir: {},
  thUser: () => '', thSnapStyle: () => '', typeThumbStyle: () => '', libMatch: () => true, libGroup: () => ({}), libItem() {}, EFFS: () => ctx.FW_EFFECTS,
});
ctx.lib = { q: '', key: '', review: null, tpl: null, effect: null, formal: null, my: null };
const load = code => { if (code) vm.runInContext(code, ctx); };
for (const n of ['libOpenBegin', 'libOpenAlive', 'beforeOpen', 'openEffect', 'openReview', 'openComboEntry', 'openFormal', 'openType', 'effectOfEntry', 'entryById']) load(fn('79_library.js', n));
load(constLine('70_ui.js', 'libP')); load(constLine('70_ui.js', 'defaultLibName'));
for (const n of ['dropLibBake', 'libByType', 'rtFxMatP', 'ensureLibEntries', 'newLayer', 'libFork', 'libOwn', 'applyCombo']) load(fn('70_ui.js', n));     // 4.9.102 rtFxMatP：组合母版按层颜色烘（隔离环境里没有 rtFxOn，原样返回）
load(src('61_naming.js')); load(src('79_myfx.js'));
load(fn('18_multitypes.js', 'openMultiType'));
for (const n of ['wbKey', 'wbLoadAI', 'wbLoad', 'wbApply', 'delivNameFeedback', 'saveDelivNames', 'resetDelivNames']) load(fn('79_workbench.js', n));
load(constLine('79_workbench.js', 'wbAll')); load(constLine('79_workbench.js', 'wbList'));
load(fn('66_fwlcascade.js', 'sizeSpecKeyNow') + '\n' + fn('66_fwlcascade.js', 'sizeSpecIds') + '\n' + fn('66_fwlcascade.js', 'sizeSpecFor') + '\n' + constLine('66_fwlcascade.js', 'sizePickKey') + '\n' + constLine('66_fwlcascade.js', 'sizeSpecTable') + '\n' + constLine('66_fwlcascade.js', 'sizeSpecPicks') + '\nglobalThis.sizePickKey = sizePickKey;');

const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };
async function release(pred = () => true) { for (let round = 0; round < 40; round++) { const hit = pending.filter(x => pred(x.P)); if (!hit.length) { await tick(); if (!pending.some(x => pred(x.P))) return; continue; } for (const x of hit) { pending.splice(pending.indexOf(x), 1); x.r({ meta: { duration: 1, t0: 0 }, P: x.P }); } await tick(); } }
function reset(o = {}) {
  for (const k of Object.keys(memory)) delete memory[k]; pending.length = 0; crumbs.length = 0; flashes.length = 0;
  Object.assign(ctx.lib, { key: '', review: null, tpl: null, effect: null, formal: null, my: null });
  Object.assign(ctx.state, { tab: 'master', P: pTail('init'), M: {}, layers: [], lib: [], layerEdits: undefined });
  ctx.wb.key = ''; ctx.wb.src = { kind: 'ai' };
  memory.myEffects = {
    Tiny: { id: 'Tiny', name: '正式资源-升空尾缀-Tiny', snap: { kind: 'single', P: pTail('tiny'), M: {}, repId: 'RT6S' }, links: [],
      from: { key: 'ef:trail_phys', name: '升空尾缀', base: 'RT6S' }, ue: { base: 'RiseTrail_Tiny', layers: [''], system: 'RiseTrail_Tiny' },
      sizeSource: { key: 'qiuxing_a', entry: 'QA20' }, sizePick: 'cls:h:front:62' },
    A: { id: 'A', name: '多层A', snap: { kind: 'combo', name: '多层A', layers: [{ type: 'kiku', P: pAir('A1'), M: { stages: [] }, L: { title: 'A1', lid: 'a1' } }, { type: 'kiku', P: pAir('A2'), M: { stages: [] }, L: { title: 'A2', lid: 'a2' } }] }, links: [] },
    B: { id: 'B', name: '多层B', snap: { kind: 'combo', name: '多层B', layers: [{ type: 'kiku', P: pAir('B1'), M: { stages: [] }, L: { title: 'B1', lid: 'b1' } }] }, links: [] },
  };
  // 用户存档实况：Tiny 自己的缓存键被旧恢复写成 RiseTrail_M（最终名），用户填的 RiseTrail_Tiny 落在 rv:QA20；整组尾缀存过旧名 RiseTrail_M（没写 system）
  memory.packNames = { 'my:Tiny': { base: 'RiseTrail_M', layers: [''], system: 'RiseTrail_M' }, 'rv:QA20': { base: 'RiseTrail_Tiny', layers: [], system: 'RiseTrail_Tiny' }, 'ef:trail_phys': { base: 'RiseTrail_M', layers: [] }, ...(o.packNames || {}) };
}
const titles = () => Array.from(ctx.state.layers, L => L.title || (ctx.layerEntryOf(L) || {}).P?.mark);
const ownCount = () => ctx.state.lib.filter(e => e.own).length;
const checks = [], failures = [];
async function check(name, run) { try { reset(); await run(); checks.push(name); console.log('PASS ' + name); } catch (e) { failures.push(name + '：' + (e && e.message || e)); console.log('FAIL ' + name + '：' + (e && e.message || e)); } }

process.on('beforeExit', () => { if (!globalThis.__done) { console.log('FAIL 有打开任务一直没结束（Promise 悬空）'); process.exitCode = 1; } });
(async () => {
  await check('慢组合 QA20 → 我的效果 Tiny：旧任务晚回不改当前身份 / 画面', async () => {
    const p1 = ctx.openEffect(ef_qa); await tick();
    assert(pending.length > 0, '组合应在等烘焙');
    await ctx.openMyEffect('Tiny'); const layersAtTiny = titles();
    await release(); await p1; await tick();
    assert.equal(ctx.lib.review, null, 'lib.review 被旧任务改回 ' + (ctx.lib.review && ctx.lib.review.id));
    assert.equal(ctx.wbKey(), 'my:Tiny'); assert.equal(ctx.lib.my && ctx.lib.my.id, 'Tiny'); assert.equal(ctx.state.tab, 'master');
    assert.deepEqual(titles(), layersAtTiny, '旧组合的层被装进当前画面'); assert.equal(crumbs[crumbs.length - 1], '正式资源-升空尾缀-Tiny');
  });
  await check('当前是我的效果时，残留的 review 不能抢走命名 / 尺寸键', async () => {
    await ctx.openMyEffect('Tiny'); ctx.lib.review = QA20;     // 模拟任何别的入口留下的旧条目
    assert.equal(ctx.wbKey(), 'my:Tiny');
    const s = ctx.sizeSpecKeyNow(); assert.equal(s.key, 'trail_phys'); assert.equal(s.entry, 'RT6S'); assert.equal(ctx.sizePickKey(s), 'my:Tiny');
  });
  await check('当前是我的模板时同样优先（不被残留条目带走）', async () => {
    ctx.lib.tpl = { id: 't1', name: '模板' }; ctx.lib.review = QA20; ctx.lib.effect = ef_qa;
    assert.equal(ctx.wbKey(), 'tpl:t1');
  });
  await check('我的多层 A（慢）→ 我的多层 B：A 晚回不覆盖 B 的层，A 自己的烘焙释放', async () => {
    const pa = ctx.openMyEffect('A'); await tick();
    const pb = ctx.openMyEffect('B'); await tick();
    await release(P => /^B/.test(P.mark)); await pb;
    await release(); await pa; await tick();
    assert.deepEqual(titles(), ['B1']); assert.equal(ctx.lib.my.id, 'B'); assert.equal(crumbs[crumbs.length - 1], '多层B');
    assert.equal(ownCount(), 1, '旧任务的层残留在 state.lib：' + ownCount());
  });
  await check('同一个我的效果快速点两次：只留最后一次的层，不重复烘焙残留', async () => {
    const p1 = ctx.openMyEffect('A'); await tick();
    const p2 = ctx.openMyEffect('A'); await tick();
    await release(); await Promise.all([p1, p2]); await tick();
    assert.deepEqual(titles(), ['A1', 'A2']); assert.equal(ownCount(), 2, 'state.lib 自有层 ' + ownCount());
    assert(ctx.state.layers.every(L => ctx.layerEntryOf(L)), '当前层指向已释放的烘焙');
  });
  await check('慢多层模板 → 正式库：模板晚回不换面包屑和层', async () => {
    const pm = ctx.openMultiType('mtA'); await tick();
    ctx.openFormal(ctx.REPLICA_BY_ID.STROBE); const atFormal = titles();
    await release(); await pm; await tick();
    assert.equal(ctx.wbKey(), 'rep:STROBE'); assert.equal(crumbs[crumbs.length - 1], '点灭星'); assert.deepEqual(titles(), atFormal);
  });
  await check('换版本（多层）还在烘时切到别的效果：版本晚回不写进新对象', async () => {
    { const pa = ctx.openMyEffect('A'); await release(); await pa; await tick(); }
    memory.mySaves = { 'my:A': [{ id: 'v1', name: '旧版', at: 'x', snap: { kind: 'combo', name: '旧版', layers: [{ type: 'kiku', P: pAir('V1'), M: { stages: [] }, L: { title: 'V1' } }] } }] };
    const pv = ctx.wbLoad('v1'); await tick();
    await ctx.openMyEffect('Tiny');
    await release(); await pv; await tick();
    assert.equal(ctx.wbKey(), 'my:Tiny'); assert.equal(ctx.wb.src.kind, 'ai', '旧版本把 wb.src 设到了新对象'); assert.equal(ctx.state.tab, 'master');
    assert(!titles().includes('V1'), '旧版本的层装进了当前画面');
  });
  await check('分档效果（RT6 小 / 中 / 大）共用的旧名不把三档压成一个名字', async () => {
    const S = ctx.packNamesFor('ef:trail_phys', ef_tr, 1, 'RiseTrail', 'tailS', 'RT6S'), L = ctx.packNamesFor('ef:trail_phys', ef_tr, 1, 'RiseTrail', 'tailL', 'RT6L');
    assert.equal(S.base, 'RiseTrail_S'); assert.equal(L.base, 'RiseTrail_L');
    assert.equal(ctx.packSysName(S.base, 'tailS', { id: 'T_F', system_tag: 'XS', picked: true }, S.system), 'RiseTrail_XS');
  });
  await check('分档效果在某一档手动保存的名字：只作这一档的最终名，别的档不同名', async () => {
    ctx.setPackNames('ef:trail_phys', 'RiseTrail_Tiny', [], { system: 'RiseTrail_Tiny', entry: 'RT6S' });
    const S = ctx.packNamesFor('ef:trail_phys', ef_tr, 1, 'RiseTrail', 'tailS', 'RT6S'), M = ctx.packNamesFor('ef:trail_phys', ef_tr, 1, 'RiseTrail', 'tailM', 'RT6M');
    assert.equal(ctx.packSysName(S.base, 'tailS', { id: 'T_F', system_tag: 'XS', picked: true }, S.system), 'RiseTrail_Tiny');
    assert.notEqual(ctx.packSysName(M.base, 'tailM', null, M.system), 'RiseTrail_Tiny');
  });
  await check('不分档的对象：手动名仍是最终名（用户 10-14「不自动加尺寸后缀」）', async () => {
    ctx.setPackNames('my:new', 'Strobe', ['Main'], { system: 'Strobe' });
    const nm = ctx.packNamesFor('my:new', null, 1, 'Fallback', 'strobe');
    assert.equal(ctx.packSysName(nm.base, 'strobe', { id: 'cls:d:dam:90', picked: true }, nm.system), 'Strobe');
  });
  await check('我的效果名字以效果记录为准：Tiny 打开后是 RiseTrail_Tiny，不是缓存里的 RiseTrail_M', async () => {
    if (typeof ctx.mySyncNames === 'function') ctx.mySyncNames();
    const listName = ctx.packNamesFor('my:Tiny', null, 1, 'RiseTrail', 'tailS').base; assert.equal(listName, 'RiseTrail_Tiny', '左栏 ' + listName);
    await ctx.openMyEffect('Tiny');
    const nm = ctx.packNamesFor(ctx.wbKey(), null, 1, 'RiseTrail', 'tailS'); assert.equal(nm.base, 'RiseTrail_Tiny'); assert.equal(nm.system, 'RiseTrail_Tiny');
  });
  await check('我的效果「保存名称」写进记录，「恢复默认」不会在重开 / 保存时复活', async () => {
    assert.equal(typeof ctx.saveDelivNames, 'function'); assert.equal(typeof ctx.resetDelivNames, 'function', '缺少 resetDelivNames');
    await ctx.openMyEffect('Tiny');
    const inp = { value: 'RiseTrail_Tiny2' }, status = { textContent: '', dataset: {} }, host = { querySelector: s => s === '#dvBase' ? inp : s === '#dvNameStatus' ? status : null, querySelectorAll: () => [] };
    assert.equal(ctx.saveDelivNames(host, 'my:Tiny'), true); assert.equal(memory.myEffects.Tiny.ue.base, 'RiseTrail_Tiny2', '记录没更新');
    assert.equal(ctx.resetDelivNames(host, 'my:Tiny'), true);
    await ctx.openMyEffect('Tiny');
    assert.equal(memory.packNames['my:Tiny'], undefined, '恢复默认后重开又写回了旧名');
    assert.notEqual(ctx.myCapturePrefs().ue.base, 'RiseTrail_Tiny2');
  });
  await check('尺寸来源按派生来源认：Tiny 记成 qiuxing_a / QA20 的打开后改回 trail_phys / RT6S', async () => {
    await ctx.openMyEffect('Tiny');
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.lib.my.sizeSource)), { key: 'trail_phys', entry: 'RT6S' });
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.myCapturePrefs().sizeSource)), { key: 'trail_phys', entry: 'RT6S' });
    assert.equal(ctx.sizeSpecFor('trail_phys', 'RT6S', '', 'my:Tiny').id, 'T_S');
  });
  globalThis.__done = true;
  console.log(`\n打开代次与命名：${checks.length}/${checks.length + failures.length} 通过`);
  if (failures.length) { for (const f of failures) console.log('  ✗ ' + f); process.exitCode = 1; }
})();
