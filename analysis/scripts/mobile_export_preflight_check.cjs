// 手机手动序列冲突：用真实方案和导出入口，验证在资源交付/重烘前阻止，且不改选择。
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), rows = [];
const page = { begin: 0, bake: 0, publish: 0, capture: 0, focus: '', view: false, messages: [] };
const cx = vm.createContext({ console, structuredClone, TextEncoder, setTimeout,
  state: { tab: 'combo' }, busyJob: { on: false }, layerStale: e => !!e.stale,
  curLayerBakes: () => cx.sample, toggleDeliv: on => { page.view = on; },
  $: () => ({ querySelector: selector => ({ focus: () => { page.focus = selector; } }) }),
  flash: s => page.messages.push(s), busyCan: on => { if (on && cx.busyJob.on) return false; cx.busyJob.on = on; return true; }, busy: on => { if (!on) cx.busyJob.on = false; },
  captureExportJob: () => { page.capture++; return { name: 'GlitterChry', system: 'GlitterChry', layers: [], destination: 'directory' }; },
  comboPackFiles: async () => { page.bake++; return []; }, utf8: s => new TextEncoder().encode(s),
  makeZip: async () => ({}), deliverResource: async () => { page.publish++; },
  FW_TEX_PREFIX: 'T_EFX_FireWorks_', packTidyNote: () => '',
  DeliveryWorkspace: { beginExport: async () => { page.begin++; }, exportFailed: e => page.messages.push(e.message) }
});
const run = s => vm.runInContext(s, cx);
run(fs.readFileSync(path.join(root, 'tool/src/js/67_fwlcombo.js'), 'utf8'));
// 只替换昂贵的下游打包边界；方案函数和exportCombo保留实际源码。
cx.comboPackFiles = async () => { page.bake++; return []; };
const ui = fs.readFileSync(path.join(root, 'tool/src/js/70_ui.js'), 'utf8'), at = ui.indexOf('async function exportCombo()');
run(ui.slice(at, ui.indexOf('\n}', at) + 2));
const fresh = () => [1, 2, 2].map((n, i) => {
  let b;
  for (let k = n - 1; k >= 0; k--) b = { form: 'master', P: {}, meta: { t0: i * .3 + k, duration: 1 }, next: b };
  return { i, L: { rate: 1.5, delay: 0, out: { mobile: 'seq', mobileManual: true } }, b, e: { stale: false } };
});
const value = code => JSON.parse(run('JSON.stringify(' + code + ')'));
const check = async (name, f) => { try { await f(); rows.push({ name, pass: true }); } catch (e) { rows.push({ name, pass: false, error: e.message }); } };
(async () => {
  cx.sample = fresh();
  await check('手动三层序列定位全部冲突层', () => assert.deepEqual(value('comboMobileConflicts(sample)'), [0, 1, 2]));
  await check('说明具体层和自动省层取舍', () => {
    const text = run('comboMobileConflictText(sample)'); assert.match(text, /1、2、3/); assert.match(text, /自动/); assert.match(text, /省略/);
  });
  await check('冲突提前阻止，不进入资源交付、不捕获任务、不重烘', async () => {
    const before = JSON.stringify(cx.sample); await run('exportCombo()');
    assert.equal(page.begin, 0); assert.equal(page.capture, 0); assert.equal(page.bake, 0); assert.equal(page.publish, 0);
    assert.equal(page.view, true); assert.match(page.focus, /data-prod="mobile"/); assert.match(page.focus, /data-i="0"/);
    assert.equal(JSON.stringify(cx.sample), before);
  });
  await check('自动维持既有按层序取舍', () => {
    cx.sample = fresh(); cx.sample.forEach(x => { delete x.L.out; });
    assert.deepEqual(value('comboMobilePlan(sample).map(x=>x.kind)'), ['seq', 'off', 'off']);
    assert.deepEqual(value('comboMobileConflicts(sample)'), []);
  });
  await check('旧存档未标手动的seq仍按自动', () => {
    cx.sample = fresh(); cx.sample.forEach(x => { delete x.L.out.mobileManual; });
    assert.deepEqual(value('comboMobileConflicts(sample)'), []);
  });
  await check('只选一层手机不冲突，其他层明确off保持', () => {
    cx.sample = fresh(); cx.sample[0].L.out.mobile = 'off'; cx.sample[2].L.out.mobile = 'off';
    assert.deepEqual(value('comboMobileConflicts(sample)'), []);
  });
  await check('手动/自动混合仍能指出实际冲突', () => {
    cx.sample = fresh(); delete cx.sample[0].L.out;
    assert.deepEqual(value('comboMobileConflicts(sample)'), [0, 1, 2]);
  });
  await check('不重叠的前后接力允许导出', () => {
    cx.sample = fresh(); cx.sample.forEach((x, i) => { x.L.delay = i * 5; });
    assert.deepEqual(value('comboMobileConflicts(sample)'), []);
  });
  await check('1ms内四舍五入接缝不误判', () => {
    cx.sample = fresh().slice(0, 2); cx.sample.forEach(x => { x.b.next = null; x.b.meta.t0 = 0; x.b.meta.duration = 1; x.L.rate = 1; });
    cx.sample[1].L.delay = .9999; assert.deepEqual(value('comboMobileConflicts(sample)'), []);
    cx.sample[1].L.delay = .998; assert.deepEqual(value('comboMobileConflicts(sample)'), [0, 1]);
  });
  await check('缺失/过期缓存不提前拒绝', () => {
    cx.sample = fresh(); cx.sample[1].e.stale = true; cx.sample[2].b = null;
    assert.deepEqual(value('comboMobileConflicts(sample)'), []);
  });
  await check('一层PC分页多不能冒充实际手机发射器数', () => {
    cx.sample = fresh().slice(0, 1); let b = cx.sample[0].b;
    for (let i = 1; i < 8; i++) b = b.next = { ...b, meta: { t0: i, duration: 1 } };
    assert.deepEqual(value('comboMobileConflicts(sample)'), []);
  });
  await check('单帧/尾缀交给原有最终门禁，不按普通序列误判', () => {
    cx.sample = fresh(); cx.sample[0].L.out.mobile = 'frame'; cx.sample[1].b.form = 'emitset'; cx.sample[1].b.P.outMobile = 'off';
    assert.deepEqual(value('comboMobileConflicts(sample)'), []);
  });
  await check('空输入允许，读取不改L/P/M或烘焙缓存', () => {
    assert.deepEqual(value('comboMobileConflicts([])'), []); cx.sample = fresh();
    const before = JSON.stringify(cx.sample); run('comboMobileConflictText(sample)'); assert.equal(JSON.stringify(cx.sample), before);
  });
  await check('改为合法选择后导出入口恢复且未改PC/参数', async () => {
    cx.sample = fresh(); cx.sample.forEach(x => { delete x.L.out; });
    const before = JSON.stringify(cx.sample), start = { ...page };
    await run('exportCombo()');
    assert.equal(page.begin, start.begin + 1); assert.equal(page.bake, start.bake + 1); assert.equal(page.publish, start.publish + 1);
    assert.equal(JSON.stringify(cx.sample), before); assert.equal(cx.busyJob.on, false);
  });
  await check('已有导出进行时不抢焦点也不重复启动', async () => {
    cx.sample = fresh(); cx.busyJob.on = true; const start = { ...page };
    await run('exportCombo()'); assert.equal(page.begin, start.begin); assert.equal(page.focus, start.focus);
    cx.busyJob.on = false;
  });
  const report = { pass: rows.every(x => x.pass), rows };
  const out = process.argv[process.argv.indexOf('--out') + 1];
  if (process.argv.includes('--out')) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); }
  for (const r of rows) console.log((r.pass ? '✅ ' : '❌ ') + r.name + (r.error ? '：' + r.error : ''));
  process.exitCode = report.pass ? 0 : 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
