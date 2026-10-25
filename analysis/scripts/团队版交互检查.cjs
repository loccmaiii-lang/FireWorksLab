// 团队版 T3 交互检查（4.9.121 起，团队版（云端），用户 2026-10-25 00:00「全批准」）：执行真实源码里的函数，隔离 DOM / 浏览器存储，不开浏览器、不连 UE。
//   ③ 本机交付服务没连上 → 重连对话框（重试接着导出 / 先导出 ZIP / 取消照旧报错）；没有对话框的隔离环境照旧直接报错
//   ④ 「我的效果」导出全部 / 导入：同一份记录来回一致、重复导入不重复加、同编号不同内容另加一份、⋯配方文件（fwl.recipe/1）直接新增、我的模板一起带
//   ⑤ 新建效果填英文名：字符集和导出拦截同一条、建议名不重名、对话框桩只回中文名时用建议名、MyFx 导出前拦下
//   ⑥ 运行时标题、页面上没有「烘培」错字
//   ② 粒子层加 / 复制 / 删 / 改母粒（4.9.123）：图始终成立、母粒在子粒前、删连子粒、改母粒不成环、从空白粒子图搭出仙女棒
//   ⑥ 稍后烘焙（4.9.123）：不点照旧、点了停下且后面的不烘、层算「贴图旧了」、每次打开重新问
//   ① 花型模板「粒子图」分组（4.9.122）：三个模板在分组里、仙女棒 / 尾焰和 SGS1 / SGR1 逐键一样且不读 review.js、↺ 还原回自己的图
// 用法：node analysis/scripts/团队版交互检查.cjs（标准检查.py --ui-state-only 里也跑）
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), path = require('node:path');
const root = path.join(__dirname, '../../tool/src/js/');
const src = f => fs.readFileSync(root + f, 'utf8');
function fn(file, name) {
  const s = src(file), m = new RegExp('^(?:async )?function ' + name + '\\(', 'm').exec(s);
  assert(m, '缺少函数 ' + name);
  const tail = s.slice(m.index), next = /\r?\n(?:function |async function |const |let |if \(|setInterval\(|window\.|\/\/ =====)/.exec(tail);
  return next ? tail.slice(0, next.index) : tail;
}
const line = (file, re) => { const m = src(file).match(re); assert(m, file + ' 缺少 ' + re); return m[0]; };
const plain = x => JSON.parse(JSON.stringify(x));
const checks = [], failures = [];
async function check(name, f) { try { await f(); checks.push(name); console.log('PASS ' + name); } catch (e) { failures.push(name + '：' + (e && e.stack || e)); } }

// ---------------- ④ ⑤ 我的效果的沙盒 ----------------
const memory = {}, messages = [], downloads = [];
let ask = null;     // 新建对话框怎么回答：函数 (title, note, init, action, o) => 结果
const ctx = vm.createContext({ console, structuredClone, Date, Math, JSON, Blob, Object, Array, String, Number, Set, Map, RegExp, Promise, Error,
  VERSION: 'T3', TYPES: { kiku: { p: {} }, botan: { p: {} }, tailS: { p: {} }, sparkgraph: { p: {} } },
  TYPE_EN: { kiku: 'Kiku', botan: 'Botan', tailS: 'RiseTrail', sparkgraph: 'SparkGraph' }, TYPE_NAMES: { kiku: '菊', botan: '牡丹（芯）', tailS: '升空尾缀 · 小', sparkgraph: '分层火星' },
  store: { get(k, d) { return structuredClone(memory[k] ?? d); }, set(k, v) { memory[k] = structuredClone(v); return true; } },
  lib: { q: '', key: '', open: {}, my: null, effect: null, review: null }, state: { tab: 'master', P: { type: 'kiku' }, layers: [] },
  flash: (msg, bad) => messages.push({ msg: String(msg), bad: !!bad }), renderLib() { }, wbNow: () => '2026-10-25 08:00', syncEnName() { },
  download: (blob, name) => downloads.push({ blob, name }),
  familyOf: t => /^tail/.test(t) ? 'rise' : t === 'sparkgraph' ? 'ground' : 'aerial', isEmit: p => p.form === 'emitset', rtPcFull: p => p.outPC === 'full',
  sizeSpecPicks: () => ctx.store.get('sizeSpecPick', {}), sizeSpecKeyNow: () => ({ key: '', entry: '', wk: ctx.lib.key }), sizePickKey: o => o.wk,
  EFFS: () => [], effectOfEntry: () => null, entryById: () => null, document: { createElement: () => ({ click() { } }), getElementById: () => null },
  askSaveName: (...a) => Promise.resolve(ask(...a)),
});
vm.runInContext(src('61_naming.js'), ctx);
vm.runInContext(src('79_myfx.js'), ctx);
vm.runInContext(src('79_repo.js'), ctx);
vm.runInContext(line('79_assetops.js', /^const tplAll = .*$/m) + '\n' + fn('79_assetops.js', 'tplPut'), ctx);
vm.runInContext(fn('79_workbench.js', 'askNewFxNames'), ctx);
const myAllX = () => vm.runInContext('myAll()', ctx);     // const 不挂在 ctx 上
ctx.openMyEffect = async id => { ctx.lib.my = { ...myAllX()[id] }; ctx.lib.key = 'my:' + id; };     // 打开只记身份（不烘焙、不建面板）
ctx.mySrc = key => { const type = String(key).replace(/^(rv|rep|type):/, ''); return { type: ctx.TYPES[type] ? type : 'kiku', P: { type: ctx.TYPES[type] ? type : 'kiku', stars: 90 }, M: { ramp0: '#000000' }, title: '起点' }; };

(async () => {
  await check('⑤ 英文名字符集和导出拦截同一条（FW_NAME_RE），MyFx 不收', () => {
    const gate = /^T_EFX_FireWorks_[A-Za-z0-9]+(_[A-Za-z0-9]+)*$/;
    for (const ok of ['Impact_Steel_M_01', 'Muzzle_DragonBreath_M_01', 'Kiku_01', 'A1']) { assert.equal(ctx.enNameWhy(ok), '', ok); assert(gate.test('T_EFX_FireWorks_' + ok)); }
    for (const bad of ['', ' ', 'MyFx', 'kiku 01', '金芒菊', 'A__B', '_A', 'A_', 'A-B', 'Ä']) assert.notEqual(ctx.enNameWhy(bad), '', bad);
    assert.match(ctx.enNameWhy('MyFx'), /缺省/);
  });
  await check('⑤ 建议名 = 来源英文名 + 序号，避开已用的名字', () => {
    memory.packNames = { 'my:a': { base: 'Kiku_01', layers: [], system: 'Kiku_01' } };
    memory.myEffects = { fxa: { id: 'fxa', name: 'a', snap: { kind: 'combo', layers: [] }, ue: { base: 'Kiku_02', layers: [], system: 'Kiku_02' } } };
    assert.equal(ctx.enNameSuggest('Kiku'), 'Kiku_03'); assert.equal(ctx.enNameSuggest('kiku'), 'Kiku_03', '首字母大写');
    assert.equal(ctx.enNameSuggest('MyFx'), 'Fx_01', '缺省名不当建议'); assert.equal(ctx.enNameSuggest('金芒菊'), 'Fx_01');
    delete memory.packNames; delete memory.myEffects;
  });
  await check('⑤ 新建效果：对话框带英文名一行，填的名字写进效果记录和交付清单名字', async () => {
    let seen = null; ask = (t, n, init, action, o) => { seen = o; return { cn: '钢命中', en: 'Impact_Steel_M_01' }; };
    await ctx.myCreate('kiku'); const rec = myAllX()[ctx.lib.my.id];
    assert.equal(seen.en, 'Kiku_01', '建议值'); assert.equal(rec.name, '钢命中'); assert.deepEqual(plain(rec.ue), { base: 'Impact_Steel_M_01', layers: [], system: 'Impact_Steel_M_01' });
    assert.equal(memory.packNames['my:' + rec.id].system, 'Impact_Steel_M_01');
    const nm = ctx.packNamesFor('my:' + rec.id, null, 1, 'MyFx', ''); assert.equal(nm.base, 'Impact_Steel_M_01'); assert.equal(ctx.exportNameBlock(nm), '');
  });
  await check('⑤ 检查脚本的桩只回中文名 / 填了不合法的英文名：用建议名，不会落成 MyFx', async () => {
    ask = (t, n, init) => '检查版本'; await ctx.myCreate('botan'); let rec = myAllX()[ctx.lib.my.id];
    assert.equal(rec.name, '检查版本'); assert.equal(rec.ue.base, 'Botan_01');
    ask = () => ({ cn: '坏名字', en: 'my fx!!' }); await ctx.myCreate('botan'); rec = myAllX()[ctx.lib.my.id]; assert.equal(rec.ue.base, 'Botan_02');
    ask = () => null; const n = Object.keys(myAllX()).length; await ctx.myCreate('botan'); assert.equal(Object.keys(myAllX()).length, n, '取消不新建');
  });
  await check('⑤ 我的效果英文名还是 MyFx：导出前拦下、写在哪改；别的效果不拦', () => {
    ctx.lib.my = { id: 'fxold' }; const nm = ctx.packNamesFor('my:fxold', null, 2, 'MyFx', '');
    assert.equal(nm.base, 'MyFx'); assert.match(ctx.exportNameBlock(nm), /MyFx.*交付清单.*英文名/);
    ctx.lib.my = null; assert.equal(ctx.exportNameBlock(nm), '', '不是我的效果（AI 条目 / 模板）不拦');
    for (const [f, fnName] of [['60_export.js', 'exportMaster'], ['60_export.js', 'exportVariants'], ['70_ui.js', 'exportCombo']]) {
      const body = fn(f, fnName), i = body.indexOf('exportNameBlock(job.naming)'), j = body.indexOf('DeliveryWorkspace.beginExport'); assert(i > 0 && i < j, fnName + ' 要在交付前拦'); }
  });
  let bundle = null;
  await check('④ 导出全部：一个 fwl.mybundle/1，每个效果 fwl.myrecipe/1（带英文名），我的模板 fwl.mytemplate/1', async () => {
    memory.myTemplates = { t1: { id: 't1', name: '我的金菊', type: 'kiku', P: { type: 'kiku', stars: 120 }, M: { ramp0: '#111111' }, at: '2026-10-25 07:00' } };
    downloads.length = 0; bundle = plain(ctx.myExportAll());
    assert.equal(downloads.length, 1); assert.match(downloads[0].name, /^我的效果_全部_.*\.json$/);
    const parsed = JSON.parse(await downloads[0].blob.text()); assert.deepEqual(parsed, bundle);
    assert.equal(bundle.format, 'fwl.mybundle/1'); assert.equal(bundle.effects.length, Object.keys(memory.myEffects).length); assert.equal(bundle.templates.length, 1);
    for (const d of bundle.effects) { assert.equal(d.format, 'fwl.myrecipe/1'); assert.equal(d.key, 'my:' + d.id); assert(d.ue && d.ue.base); ctx.repoRecipe(d); }
    assert.equal(bundle.templates[0].format, 'fwl.mytemplate/1');
  });
  await check('④ 换一个空浏览器导入：效果、英文名、模板原样回来；再导一次不重复加', async () => {
    const before = structuredClone(memory.myEffects), tplBefore = structuredClone(memory.myTemplates), namesBefore = structuredClone(memory.packNames);
    for (const k of Object.keys(memory)) delete memory[k];
    const r = ctx.myImportDocs(ctx.myImportUnpack(structuredClone(bundle)));
    assert.equal(r.fx, Object.keys(before).length); assert.equal(r.tpl, 1); assert.equal(r.bad.length, 0);
    for (const [id, rec] of Object.entries(before)) { const got = memory.myEffects[id]; assert(got, id); assert.deepEqual(plain(got.snap), plain(rec.snap)); assert.equal(got.name, rec.name);
      assert.equal(ctx.packNamesFor('my:' + id, null, 1, 'MyFx', '').base, namesBefore['my:' + id].base, '英文名跟着来'); }
    assert.deepEqual(memory.myTemplates, tplBefore);
    const again = ctx.myImportDocs(ctx.myImportUnpack(structuredClone(bundle))); assert.equal(again.fx, 0, JSON.stringify(again) + JSON.stringify(Object.values(memory.myEffects).map(x => x.name))); assert.equal(again.same, Object.keys(before).length); assert.equal(again.tpl, 0); assert.equal(again.tplSame, 1);
    assert.equal(Object.keys(memory.myEffects).length, Object.keys(before).length);
  });
  await check('④ 同编号但内容不同：另加一份「· 导入」，本地的不动', () => {
    const d = structuredClone(bundle.effects[0]); d.snap.layers[0].P.stars = 333; const local = structuredClone(memory.myEffects[d.id]);
    const r = ctx.myImportDocs([d]); assert.equal(r.fx, 1); assert.equal(r.copy, 1); assert.deepEqual(memory.myEffects[d.id], local);
    const copy = Object.values(memory.myEffects).find(x => x.name === d.name + ' · 导入'); assert(copy && copy.id !== d.id); assert.equal(copy.snap.layers[0].P.stars, 333);
  });
  await check('④ ⋯「导出配方文件」的 fwl.recipe/1 直接新增：单层礼花包成一层、原生尾缀保持单层、多层照旧；不用先打开同形态', () => {
    const n0 = Object.keys(memory.myEffects).length;
    const single = { format: 'fwl.recipe/1', key: 'type:kiku', name: 'AI 版', base: 'kiku', snap: { kind: 'single', P: { type: 'kiku', stars: 70 }, M: { ramp0: '#222222' }, repId: null } };
    const tail = { format: 'fwl.recipe/1', key: 'ef:trail_phys', name: '我的尾缀', base: 'RT6S', snap: { kind: 'single', P: { type: 'tailS', form: 'emitset', outPC: 'seq' }, M: {}, repId: 'RT6S' } };
    const combo = { format: 'fwl.recipe/1', key: 'ef:hiki', name: '两层', base: 'HN2', snap: { kind: 'combo', name: '两层', layers: [{ id: 'HN2-O', type: 'kiku', P: { type: 'kiku' }, M: {}, L: { lib: 'x', delay: 0.2 } }, { id: null, type: 'botan', P: { type: 'botan' }, M: {}, L: {} }] } };
    const r = ctx.myImportDocs([single, tail, combo]); assert.equal(r.fx, 3, JSON.stringify(r.bad)); assert.equal(Object.keys(memory.myEffects).length, n0 + 3);
    const got = Object.values(memory.myEffects).filter(x => /（导入）$/.test(x.name));
    const s1 = got.find(x => x.from.key === 'type:kiku'), t1 = got.find(x => x.from.key === 'ef:trail_phys'), c1 = got.find(x => x.from.key === 'ef:hiki');
    assert.equal(s1.snap.kind, 'combo'); assert.equal(s1.snap.layers.length, 1); assert.equal(s1.snap.layers[0].P.stars, 70); assert.match(s1.ue.base, /^Kiku_\d\d$/);
    assert.equal(t1.snap.kind, 'single'); assert.equal(t1.snap.P.form, 'emitset');
    assert.equal(c1.snap.layers.length, 2); assert.equal(c1.snap.layers[0].L.delay, 0.2); assert.equal(c1.snap.layers[0].id, null); assert(c1.snap.layers.every(l => l.L.lid));
    assert.equal(ctx.exportNameBlock(ctx.packNamesFor('my:' + c1.id, null, 2, 'MyFx', '')), '', '导进来的不落成 MyFx');
  });
  await check('④ 坏文件写明原因，好的照样导入；不认识的格式不导', () => {
    assert.throws(() => ctx.myImportUnpack({ format: 'other/1' }), /不认识的格式/);
    const r = ctx.myImportDocs([{ format: 'fwl.myrecipe/1', id: 'fxbad', key: 'my:fxbad', name: '坏', snap: { kind: 'combo', layers: [{ type: 'nope', P: {}, M: {}, L: {} }] } }, structuredClone(bundle.templates[0])]);
    assert.equal(r.fx, 0); assert.equal(r.bad.length, 1); assert.match(r.bad[0], /类型或参数不完整/); assert.equal(r.tplSame, 1); assert(messages.at(-1).bad);
  });
  await check('④ 仓库里真实的我的配方（analysis/我的配方/）都能导入', () => {
    const dir = path.join(__dirname, '../我的配方'); if (!fs.existsSync(dir)) return;
    const docs = []; for (const d of fs.readdirSync(dir)) { const p = path.join(dir, d); if (!fs.statSync(p).isDirectory() || d.startsWith('_')) continue; for (const f of fs.readdirSync(p)) if (f.endsWith('.json')) docs.push(JSON.parse(fs.readFileSync(path.join(p, f), 'utf8'))); }
    for (const k of Object.keys(memory)) delete memory[k];
    for (const d of docs) for (const l of d.snap.kind === 'single' ? [d.snap.P] : d.snap.layers || []) if (l && l.type) ctx.TYPES[l.type] = { p: {} };     // 真实配方的花型各种各样：这里只查记录结构
    const r = ctx.myImportDocs(docs.filter(d => d.format === 'fwl.myrecipe/1' && String(d.key).startsWith('my:')));
    assert.equal(r.bad.length, 0, r.bad.join('；')); assert(r.fx > 0);
  });

  // ---------------- ③ 重连对话框（真实 67_delivery.js + 交付页隔离夹具） ----------------
  const { fixture } = require('../../tool/local_delivery/test_baker_handoff.cjs');
  const dialog = (f, answer) => { const d = f.node('reconnectDlg'), shown = []; d.showModal = function () { shown.push(f.node('reconnectDetail').textContent); queueMicrotask(() => { this.returnValue = answer(shown.length); this.listeners.close(); }); }; return shown; };
  await check('③ 服务没连上：弹重连对话框，选「先导出 ZIP」这次改成 ZIP、回到制作页', async () => {
    const f = fixture({ offline: true }), shown = dialog(f, () => 'zip');
    const r = await f.api.beginExport('directory', 'Impact_Steel_M_01');
    assert.equal(r, 'zip'); assert.equal(shown.length, 1); assert.match(shown[0], /原因/); assert.equal(f.node('deliveryWorkspace').hidden, true); f.api.finishExport();
  });
  await check('③ 照步骤把服务起来后点「重试连接」：连上就接着导出到指定目录', async () => {
    const f = fixture({ offline: true }), shown = dialog(f, n => { if (n === 1) f.recover(); return 'retry'; });
    const r = await f.api.beginExport('directory', 'Impact_Steel_M_01');
    assert.equal(r, 'directory'); assert.equal(shown.length, 1); assert(f.calls.some(x => x.command === 'session')); f.api.finishExport();
  });
  await check('③ 重试还连不上：再问一次并写「重试了 1 次」；「取消导出」照旧报错、停在失败页可重试', async () => {
    const f = fixture({ offline: true }), shown = dialog(f, n => n === 1 ? 'retry' : 'cancel'); let err = null;
    try { await f.api.beginExport('directory', 'X'); } catch (e) { err = e; }
    assert(err); assert.equal(shown.length, 2); assert.match(shown[1], /重试了 1 次/);
    f.api.exportFailed(err); f.api.finishExport(); assert.equal(f.node('deliveryRetry').hidden, false); assert.equal(f.node('deliveryBlocked').hidden, false);
  });
  await check('③ 没有对话框（旧的隔离环境）：行为和以前一样直接报错；ZIP 导出不连服务', async () => {
    const f = fixture({ offline: true }); let err = null; try { await f.api.beginExport('directory', 'X'); } catch (e) { err = e; } assert(err);
    const z = fixture({ offline: true }), shown = dialog(z, () => 'retry'); assert.equal(await z.api.beginExport('zip'), undefined); assert.equal(shown.length, 0);
  });
  await check('③ 对话框里的步骤：双击 tool/启动烘焙器.cmd、看窗口、点重试，并有「先导出 ZIP」', () => {
    const b = fs.readFileSync(path.join(__dirname, '../../tool/src/body.html'), 'utf8'), d = b.slice(b.indexOf('id="reconnectDlg"'), b.indexOf('</dialog>', b.indexOf('id="reconnectDlg"')));
    for (const w of ['启动烘焙器.cmd', '重试连接', '先导出 ZIP', '取消导出', '8034']) assert(d.includes(w), w);
    assert(fs.existsSync(path.join(__dirname, '../../tool/启动烘焙器.cmd')), '说的那个 .cmd 要在');
  });
  // ---------------- ⑥ 错字 ----------------
  await check('⑥ 运行时标题和顶栏写「烟花烘焙器」，源码里没有「烘培」', () => {
    for (const f of ['../body.html', '90_events.js']) assert(!src(f).includes('烟花烘培器'), f);
    assert(src('90_events.js').includes("document.title = '烟花烘焙器 · v'"));
  });
  // ---------------- ① 花型模板「粒子图」分组（4.9.122）----------------
  const G = vm.createContext({ console, structuredClone, Math, JSON, Object, Array, Number, String, Set, Map, Error, TYPES: { fountain: { p: { form: 'loop' }, m: {} } }, SCHEMA: [], EMIT_DEF: {}, PEMIT: { E: [] } });
  for (const f of ['17_graph_presets.js', '46_graph_model.js', '46_graph_templates.js']) vm.runInContext(src(f), G, { filename: f });
  const GT = vm.runInContext('GRAPH_TEMPLATES', G), GP = vm.runInContext('GRAPH_PRESETS', G), SG = vm.runInContext('SparkGraph', G);
  const review = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(__dirname, '../../tool/data/review.js'), 'utf8') + ';this.R = typeof FW_REVIEW !== "undefined" ? FW_REVIEW : window.FW_REVIEW', c); const R = c.R; return Array.isArray(R) ? R : R.entries || R.list || Object.values(R); })();
  await check('① 「粒子图」分组：仙女棒、窜天猴尾焰、空白粒子图，在花型库 / 新建效果 / 顶栏下拉（TYPE_GROUPS）里', () => {
    const groups = line('10_types.js', /\['粒子图', \[[^\]]*\]\]/); for (const t of ['sgSparkler', 'sgRocket', 'sgBlank']) { assert(groups.includes(`'${t}'`), t); assert(new RegExp(`\\b${t}: \\[`).test(src('10_types.js')), 'TYPE_INFO ' + t); assert(new RegExp(`\\b${t}: \\[`).test(src('72_picker.js')), 'TYPE_META ' + t); assert(vm.runInContext(`!!TYPES.${t} && TYPES.${t}.p.sparkGraph === GRAPH_TEMPLATES.${t}.graph`, G), 'TYPES ' + t); }
  });
  await check('① 仙女棒 / 窜天猴尾焰 = SGS1 / SGR1 那一套（逐键），写在源码里、不读 review.js；三张图都成立', () => {
    for (const [t, id, ver] of [['sgSparkler', 'SGS1', 'c6f38fb9'], ['sgRocket', 'SGR1', '79964198']]) { const e = review.find(x => x.id === id); if (!e || e.ver !== ver) continue;     // 条目以后改了不影响模板（抄的是这一版）
      assert.deepEqual(plain(GT[t].graph), plain(e.p.sparkGraph), t + ' 的粒子图和 ' + id + ' 不一样'); }
    assert(!/FW_REVIEW|REPLICA_BY_ID|replicaPM|review\.js'/.test(src('46_graph_templates.js').replace(/^\s*\/\/.*$/mg, '')), '模板不能读条目数据');
    for (const t of Object.keys(GT)) SG.validate(structuredClone(GT[t].graph));
    assert.equal(GT.sgBlank.graph.emitters.length, 1); assert.equal(GT.sgBlank.graph.emitters[0].parent, null);
  });
  await check('① ↺ 还原 / 双击恢复默认：新模板回自己的图；旧 sparkgraph 形态照旧按预设（SGS1 / SGR1 打开参数不变）', () => {
    const of = P => vm.runInContext('graphTemplateOf', G)(P);
    assert.deepEqual(plain(of({ type: 'sgBlank', sparkGraph: { presetKey: 'blank', emitters: [] } })), plain(GT.sgBlank.graph));
    assert.equal(of({ type: 'sparkgraph', sparkGraph: { presetKey: 'sparkler' } }), GP.sparkler); assert.equal(of({ type: 'sparkgraph', sparkGraph: { presetKey: 'rocket' } }), GP.rocket);
    assert.equal(of({ type: 'sparkgraph', sparkGraph: { presetKey: 'nope' } }), null); assert.equal(of({ type: 'kiku' }), null);
    assert(src('79_assetops.js').includes('graphTemplateOf(P)) || GRAPH_PRESETS[P.sparkGraph.presetKey] || GRAPH_PRESETS.rocket'), '还原的老路径保留');
  });
  // ---------------- ② 粒子层加 / 复制 / 删 / 改母粒（4.9.123）----------------
  vm.runInContext(src('79_graph_tree.js'), G, { filename: '79_graph_tree.js' });
  const GTr = vm.runInContext('GraphTree', G), ok = g => { SG.validate(g); const seen = new Set(); for (const e of g.emitters) { assert(!e.parent || seen.has(e.parent), e.id + ' 的母粒要在前面'); seen.add(e.id); } return g; };
  await check('② 加粒子层 / 加子粒 / 复制：新编号不重、种子换一个、子粒挂在母粒那一支后面，图都成立', () => {
    const g = structuredClone(GT.sgSparkler.graph), n0 = g.emitters.length;
    const a = GTr.add(g, null); ok(g); assert.equal(a.parent, null); assert.equal(g.emitters.at(-1), a); assert(!GT.sgSparkler.graph.emitters.some(e => e.id === a.id));
    const c = GTr.add(g, 'e05'); ok(g); assert.equal(c.parent, 'e05'); assert.equal(c.count, 0); assert(c.children >= 1);
    const br = GTr.subtree(g, 'e05').map(e => e.id); assert.deepEqual(br.slice(0, 1), ['e05']); assert(br.includes(c.id) && br.includes('e08'), '子粒、孙粒都算这一支');
    assert.equal(g.emitters.at(-1), c, '新子粒加在最后（母粒在前面）');
    const d = GTr.dup(g, 'e03'); ok(g); const o = g.emitters.find(e => e.id === 'e03');
    assert.notEqual(d.seed, o.seed); assert.notEqual(d.id, o.id); assert.equal(d.parent, o.parent); assert.equal(d.count, o.count); assert.match(d.name, /中等金丝 副本$/);
    assert.equal(new Set(g.emitters.map(e => e.id)).size, n0 + 3); assert.equal(new Set(g.emitters.map(e => e.seed)).size, n0 + 3);
  });
  await check('② 删：连子粒一起删、至少留一层；改母粒：整支挪过去、不能挂到自己的子孙上', () => {
    const g = structuredClone(GT.sgSparkler.graph);
    const gone = GTr.remove(g, 'e05').map(e => e.id); ok(g); assert.deepEqual(plain(gone.sort()), ['e05', 'e06', 'e07', 'e08']); assert(!g.emitters.some(e => gone.includes(e.id) || gone.includes(e.parent)));
    const b = structuredClone(GT.sgBlank.graph); assert.throws(() => GTr.remove(b, 'e01'), /至少/);
    const h = structuredClone(GT.sgSparkler.graph);
    assert.throws(() => GTr.reparent(h, 'e05', 'e08'), /子粒/); assert.throws(() => GTr.reparent(h, 'e05', 'e05'), /子粒/);
    assert.equal(GTr.parentChoices(h, 'e05').some(e => ['e05', 'e06', 'e07', 'e08'].includes(e.id)), false);
    assert(GTr.reparent(h, 'e06', 'e02')); ok(h); assert.equal(h.emitters.find(e => e.id === 'e06').parent, 'e02'); assert.equal(h.emitters.find(e => e.id === 'e08').parent, 'e06', '孙粒跟着走');
    assert(GTr.reparent(h, 'e06', null)); ok(h); assert.equal(h.emitters.find(e => e.id === 'e06').parent, null);
    assert(GTr.reparent(h, 'e01', 'e03')); ok(h); assert(h.emitters.find(e => e.id === 'e01').children >= 1);
    assert.equal(GTr.reparent(h, 'e01', 'e03'), false, '没变不算改');
  });
  await check('② 从空白粒子图零起步搭出仙女棒：加 / 加子粒得到同一棵 13 层树，填上参数后和仙女棒模板逐键一样', () => {
    const want = GT.sgSparkler.graph, g = structuredClone(GT.sgBlank.graph);
    // 按仙女棒的树一层一层加：根用「＋ 粒子层」，子粒用「＋ 子粒」（母粒按仙女棒里的母粒）
    for (const e of want.emitters.slice(1)) GTr.add(g, e.parent);
    ok(g); assert.deepEqual(plain(g.emitters.map(e => [e.id, e.parent])), plain(want.emitters.map(e => [e.id, e.parent])), '树的形状');
    // 再像在右栏里一样逐项填值（每层每个字段、整张图的字段），结果就是仙女棒
    for (const [i, e] of want.emitters.entries()) for (const [k, v] of Object.entries(e)) g.emitters[i][k] = structuredClone(v);
    for (const [k, v] of Object.entries(want)) if (k !== 'emitters') g[k] = structuredClone(v);
    ok(g); assert.deepEqual(plain(g), plain(want));
  });
  // ---------------- ⑥ 打开 / 新建多层效果「稍后烘焙」（4.9.123）----------------
  await check('⑥ 稍后烘焙：不点照旧烘；点了正在烘的停下、后面的不烘、层标 later 算「贴图旧了」（按 B 烘）；每次打开重新问', async () => {
    const btn = { hidden: true, disabled: false, textContent: '', addEventListener(k, f) { this.click = f; } }, busyEl = { hidden: false, querySelector: () => btn._in ? btn : null, appendChild(x) { x._in = true; } };
    const L = vm.createContext({ console, Error, Promise, setTimeout, $: id => id === '#busy' ? busyEl : null, document: { createElement: () => btn }, flash() { } });
    vm.runInContext(line('70_ui.js', /^const openLater = .*$/m) + '\n' + line('70_ui.js', /^const BAKE_LATER = .*$/m) + '\n' + fn('70_ui.js', 'laterButton') + '\n' + fn('70_ui.js', 'bakeOrLater') + '\n' + line('70_ui.js', /^const layerStale = .*$/m) + '\nthis.ol = openLater; this.stale = layerStale;', L);
    let runs = 0; const job = chk => { runs++; return Promise.resolve(chk(1) && 'B'); };
    assert.equal(await L.bakeOrLater(job), 'B'); assert.equal(runs, 1); assert.equal(btn.hidden, false, '烘的时候按钮露出来');
    const slow = async chk => { runs++; btn.click(); chk(.5); return 'B'; };     // 烘到一半点了「稍后烘焙」
    assert.equal(await L.bakeOrLater(slow), null); assert.equal(await L.bakeOrLater(job), null, '后面的层不烘'); assert.equal(runs, 2); assert.equal(L.ol.n, 2);
    assert.equal(L.stale({ later: true, bake: null }), true); assert.equal(L.stale({ later: true, bake: {}, pRev: 1, bakeRev: 1 }), false); assert.equal(L.stale({ bake: null }), false, '没点过的层照旧');
    assert.match(src('79_library.js'), /function libOpenBegin\(\) \{ if \(typeof openLater !== 'undefined'\) \{ openLater\.want = false;/, '每次打开重新问');
    assert.match(src('79_workbench.js'), /return e && \(e\.bake \|\| e\.later\);/, '稍后烘焙的层不挡导出按钮');
  });
  console.log(`团队版交互：${checks.length}/${checks.length + failures.length} 通过`); for (const s of failures) console.error('FAIL ' + s); if (failures.length) process.exitCode = 1;
})();
