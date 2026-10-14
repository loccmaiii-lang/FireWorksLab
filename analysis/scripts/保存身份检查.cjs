// 保存身份与命名反馈回归：运行真实控制器函数，使用隔离 DOM/存储，不启动浏览器或 UE。
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = __dirname + '/../../tool/src/js/';
function fn(file, name) {
  const s = fs.readFileSync(root + file, 'utf8'), r = new RegExp('^(?:async )?function ' + name + '\\(', 'm'), m = r.exec(s);
  assert(m, '缺少函数 ' + name);
  const tail = s.slice(m.index), next = /\r?\n(?:function |async function |const |let |if \(|setInterval\(|window\.)/.exec(tail);
  return next ? tail.slice(0, next.index) : tail;
}
class El {
  constructor() { this.hidden = false; this.disabled = false; this.value = ''; this.textContent = ''; this.dataset = {}; this.children = []; this.handlers = {}; this.classList = { add() {}, remove() {}, toggle() {} }; }
  set innerHTML(v) { this.html = v; this.children = []; }
  get innerHTML() { return this.html || ''; }
  appendChild(c) { this.children.push(c); return c; }
  setAttribute(k, v) { this[k] = v; }
  addEventListener(k, v) { this.handlers[k] = v; }
  querySelector(s) { return this.parts?.[s] || (s === '.fav' ? this.fav ||= new El() : null); }
  querySelectorAll(s) { return this.lists?.[s] || []; }
  focus() {}
}
const memory = { packNames: { 'rv:QA20': { base: 'GlitterChry', layers: ['Chry'] } }, userThumbs: {} }, messages = [], nodes = new Map();
const node = k => nodes.get(k) || (nodes.set(k, new El()), nodes.get(k));
let failWrite = false, captures = 0;
const ctx = vm.createContext({ console, structuredClone, Date, setTimeout, clearTimeout, TextEncoder, TextDecoder, Uint8Array,
  utf8: s => new TextEncoder().encode(s), performance: { now: () => 10000 },
  uiIcon: () => '', engineTick: t => t || 0, srcLabel: () => '', scopeLabel: () => '', specLabel: () => '', VIEW_NAMES: {}, buildTlBars() {}, syncGate() {}, abStateSync() {},
  state: { P: { type: 'glitter' }, layers: [], layerView: { solo: -1, mute: [] }, tab: 'master', view: 'live', repId: 'QA20' },
  lib: { key: 'rv:QA20', review: { id: 'QA20' }, effect: null, formal: null, my: null }, wb: { key: 'rv:QA20' },
  pk: { cat: 'all', recent: [], fav: new Set(), mode: 'open', onPick: null }, PK_CATS: [], TYPE_EN: { strobe: 'Strobe' }, TYPE_NAMES: { strobe: '点灭星' },
  REPLICA_BY_ID: { STROBE: { id: 'STROBE', base: 'strobe', name: '点灭星' } },
  store: { get(k, d) { return structuredClone(memory[k] ?? d); }, set(k, v) { if (failWrite) return false; memory[k] = structuredClone(v); return true; } },
  $: node, document: { createElement: () => new El(), getElementById: k => node('#' + k) },
  flash: (msg, bad, ms, hold) => messages.push({ msg, bad, hold }), syncEnName() {},
  beforeOpen() { ctx.lib.my = null; ctx.lib.tpl = null; }, effectOfEntry: () => null, setQueuedView() {}, renderLib() {}, crumb() {}, migEnd() {},
  setType(t) { ctx.state.repId = t.startsWith('rep:') ? t.slice(4) : null; ctx.state.P.type = t.startsWith('rep:') ? ctx.REPLICA_BY_ID[t.slice(4)].base : t; },
  setReplica(id) { ctx.state.repId = id; ctx.state.P.type = ctx.REPLICA_BY_ID[id].base; }, setTab: t => { ctx.state.tab = t; }, curSig: () => 'params',
  setReview(e) { ctx.lib.review = e; ctx.wb.key = ctx.wbKey(); }, wbVisible: () => true,
  pkFiltered: () => [{ key: 'rep:STROBE', name: '点灭星', desc: '', tags: [] }], pkItems: () => [], thUser: () => '', typeThumbStyle: () => '', pkClose() {},
  thUserAll: () => structuredClone(memory.userThumbs), thUserPrune: a => a, thUserPut(a) { if (failWrite) return false; memory.userThumbs = structuredClone(a); return true; }, thUserChanged: () => { captures++; }, wbNow: () => 'now',
  thGrab: async () => ({ img: 'data:image/jpeg;base64,new', t: 1.2 }),
  renderDeliv: () => { captures++; }, stage2: {}, sizeSpecCombo: () => ({ id: 'cls:d:dam:90', picked: true }), sizeSpecNow: () => ({ id: 'cls:d:dam:90', picked: true })
});
vm.runInContext(fn('79_workbench.js', 'wbKey') + '\n' + fn('79_library.js', 'openType') + '\n' + fn('79_library.js', 'openFormal') + '\n' + fn('72_picker.js', 'pkRender'), ctx);
vm.runInContext(fs.readFileSync(root + '61_naming.js', 'utf8'), ctx);
vm.runInContext(fn('19_thumbsvg.js', 'thUserKeys') + '\n' + fn('19_thumbsvg.js', 'thCapture'), ctx);
const failures = [], checks = [];
async function check(name, run) { try { await run(); checks.push(name); } catch (e) { failures.push(name + ': ' + e.message); } }
(async () => {
  await check('正式库卡片切换当前身份，保存不再落到 QA20', () => {
    ctx.pkRender(); node('#pkGrid').children[0].handlers.click();
    assert.equal(ctx.wbKey(), 'rep:STROBE'); assert.equal(ctx.lib.review, null);
    assert.equal(ctx.thUserKeys()[0], 'rep:STROBE');
  });
  await check('保存名称失败返回 false，旧名保留', () => {
    failWrite = true;
    assert.equal(ctx.setPackNames('rv:QA20', 'Wrong', ['Main']), false);
    assert.equal(memory.packNames['rv:QA20'].base, 'GlitterChry'); failWrite = false;
  });
  failWrite = false;
  await check('手动保存 Strobe，90m 导出仍是 Strobe', () => {
    assert.equal(ctx.setPackNames('my:new', 'Strobe', ['Main'], { system: 'Strobe' }), true);
    const nm = ctx.packNamesFor('my:new', null, 1, 'Fallback', 'strobe');
    assert.equal(ctx.packSysName(nm.base, 'strobe', { id: 'cls:d:dam:90', picked: true }, nm.system), 'Strobe');
  });
  await check('未指定最终名称仍按自动派生规则', () => {
    ctx.setPackNames('type:strobe', 'Strobe', [], { system: '' });
    const nm = ctx.packNamesFor('type:strobe', null, 1, 'Fallback', 'strobe');
    assert.equal(ctx.packSysName(nm.base, 'strobe', { id: 'cls:d:dam:90', picked: true }, nm.system), 'Strobe_D90');
  });
  await check('既有已保存名称按用户新指令不附加尺寸', () => {
    const nm = ctx.packNamesFor('rv:QA20', null, 1, 'Fallback', 'kiku');
    assert.equal(ctx.packSysName(nm.base, 'kiku', { id: 'cls:d:dam:90', picked: true }, nm.system), 'GlitterChry');
  });
  const thSrc = fs.readFileSync(root + '19_thumbsvg.js', 'utf8');
  if (/function thFeedback\(/.test(thSrc)) vm.runInContext(fn('19_thumbsvg.js', 'thFeedback'), ctx);
  await check('截图按钮立即显示等待，捕获成功才显示保存', async () => {
    ctx.lib.key = 'my:capture'; ctx.lib.review = null; ctx.lib.formal = null;
    let resolve; ctx.thGrab = () => new Promise(r => { resolve = r; });
    const task = ctx.thCapture();
    assert.match(node('#thGrab').textContent, /生成中|保存中/); assert.equal(node('#thGrab').disabled, true);
    resolve({ img: 'data:image/jpeg;base64,new', t: 1.2 });
    assert.equal(await task, true); assert.equal(node('#thGrab').disabled, false);
    assert.match(node('#thSaveStatus').textContent, /已保存|换成/);
  });
  await check('等待期间换效果，不把新画面写到旧条目', async () => {
    ctx.lib.key = 'my:old'; let resolve; ctx.thGrab = () => new Promise(r => { resolve = r; });
    const task = ctx.thCapture(); ctx.lib.key = 'my:other'; resolve({ img: 'data:image/jpeg;base64,other', t: 2 });
    assert.equal(await task, false); assert.equal(memory.userThumbs['my:old'], undefined);
  });
  const saveSource = fs.readFileSync(root + '79_workbench.js', 'utf8');
  if (/function saveDelivNames\(/.test(saveSource)) vm.runInContext(fn('79_workbench.js', 'delivNameFeedback') + '\n' + fn('79_workbench.js', 'saveDelivNames'), ctx);
  const host = new El(), input = new El(), layer = new El(), status = new El(); input.value = 'NewStrobe'; layer.value = 'Main';
  host.parts = { '#dvBase': input, '#dvNameStatus': status }; host.lists = { '[data-ly]': [layer] };
  await check('过期清单不能给新效果保存旧名', () => {
    ctx.lib.key = 'my:other'; assert.equal(ctx.saveDelivNames(host, 'my:old'), false);
    assert.equal(memory.packNames['my:other'], undefined);
  });
  await check('名称写入失败保留输入，就地显示失败', () => {
    ctx.lib.key = 'my:other'; failWrite = true; const before = captures;
    assert.equal(ctx.saveDelivNames(host, 'my:other'), false); assert.equal(input.value, 'NewStrobe');
    assert.equal(captures, before); assert.match(status.textContent, /没存上|未保存|失败/); failWrite = false;
  });
  await check('名称保存成功，系统名与字段相同且不影响旧效果', () => {
    assert.equal(ctx.saveDelivNames(host, 'my:other'), true);
    assert.equal(memory.packNames['my:other'].system, 'NewStrobe'); assert.equal(memory.packNames['rv:QA20'].base, 'GlitterChry');
  });
  await check('验证失败不重绘、不清掉输入', () => {
    const before = captures; input.value = '中文'; assert.equal(ctx.saveDelivNames(host, 'my:other'), false);
    assert.equal(input.value, '中文'); assert.equal(captures, before); assert.match(status.textContent, /未保存/); input.value = 'NewStrobe';
    host.lists['[data-ly]'] = [layer, layer]; assert.equal(ctx.saveDelivNames(host, 'my:other'), false); assert.match(status.textContent, /重复/);
    host.lists['[data-ly]'] = [layer];
  });
  await check('名称持久写入与显示失败分开反馈', () => {
    const render = ctx.renderDeliv; ctx.renderDeliv = () => { throw Error('展示失败'); };
    assert.equal(ctx.saveDelivNames(host, 'my:other'), true); assert.match(status.textContent, /已保存.*刷新失败/);
    ctx.renderDeliv = render;
  });
  await check('黑帧和写入失败均就地提示，旧缩略图不丢', async () => {
    ctx.lib.key = 'my:capture'; const old = structuredClone(memory.userThumbs['my:capture']); ctx.thGrab = async () => null;
    assert.equal(await ctx.thCapture(), false); assert.match(node('#thSaveStatus').textContent, /黑/);
    ctx.thGrab = async () => ({ img: 'data:image/jpeg;base64,wrong', t: 2 }); failWrite = true;
    assert.equal(await ctx.thCapture(), false); assert.match(node('#thSaveStatus').textContent, /没存上/); assert.deepEqual(memory.userThumbs['my:capture'], old); failWrite = false;
  });
  await check('截图持久写入与显示失败分开反馈', async () => {
    const changed = ctx.thUserChanged; ctx.thUserChanged = () => { throw Error('展示失败'); };
    assert.equal(await ctx.thCapture(), true); assert.match(node('#thSaveStatus').textContent, /已保存.*刷新失败/);
    ctx.thUserChanged = changed;
  });
  vm.runInContext(fn('79_workbench.js', 'stageTick'), ctx);
  await check('同样时长切到新效果也重绘清单', () => {
    const before = captures; Object.assign(ctx.stage2, { deliv: true, delivKey: 'rv:QA20', delivSig: 'same', tlSig: 'same', last: 0 });
    ctx.stageTick(5); assert.equal(captures, before + 1);
  });
  await check('烘焙刷新时不抢走名称输入和保存按钮', () => {
    ctx.stage2.delivKey = ctx.wbKey(); ctx.stage2.delivSig = 'old'; ctx.stage2.last = 0;
    ctx.document.activeElement = { closest: () => host }; const before = captures;
    ctx.stageTick(5); assert.equal(captures, before); delete ctx.document.activeElement;
  });
  // 真正执行命名生成器：PC/手机配置与文件名必须同源，而不是只断言 UI 标签。
  ctx.TN = (n, sub = '') => 'T_' + n + (sub ? '_' + sub : ''); ctx.joinPart = (...s) => s.filter(Boolean).join('_');
  ctx.bakeParts = b => [b]; ctx.bakeSegmentName = () => '';
  await check('手动名称进入真实 PC/手机配置和贴图，不残留旧名/D90', () => {
    const enc = ctx.utf8, config = { name: 'Internal', textures: { seq: { file: 'T_Internal.png' } }, materials: {}, emitters: [] };
    const mobile = { ...config, textures: { seq: { file: 'T_Internal_Mobile.png' } } };
    const b = { form: 'master', meta: { L: { cols: 4, rows: 4 } } }, nm = ctx.packNamesFor('my:other', null, 1, 'Fallback', 'strobe');
    const out = ctx.applyPackNaming([['cascade.json', enc(JSON.stringify(config))], ['cascade_mobile.json', enc(JSON.stringify(mobile))], ['T_Internal.png', new Uint8Array([1])]], nm.base, [{ ln: 'Internal', mn: 'Internal_Mobile', b, layer: 'Main' }], { sys: ctx.packSysName(nm.base, 'strobe', ctx.sizeSpecNow(), nm.system) });
    const pc = JSON.parse(new TextDecoder().decode(out.find(([f]) => f === 'cascade.json')[1])), mb = JSON.parse(new TextDecoder().decode(out.find(([f]) => f === 'cascade_mobile.json')[1]));
    assert.equal(pc.naming.system || pc.naming.base, 'NewStrobe'); assert.equal(mb.name, 'NewStrobe_M');
    assert.equal(pc.textures.seq.asset, 'T_EFX_FireWorks_NewStrobe_Main_4x4_01_HD'); assert(!JSON.stringify([pc, mb]).includes('D90'));
  });
  checks.forEach(x => console.log('PASS ' + x)); failures.forEach(x => console.error('FAIL ' + x));
  console.log(`${checks.length} 通过，${failures.length} 失败`); if (failures.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
