// Deterministic checks against the actual UI controller, without a GPU or timers
// racing a browser. Run: node analysis/scripts/bake_state_check.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function fixture() {
  const elements = new Map(), timers = new Set(), disposed = [], published = [];
  const ctx = vm.createContext({ console: { error() {} }, structuredClone,
    PREVIEW_SCALE: 0.5, REFS: {}, window: {},
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)), riseInfo: () => ({ ta: 4 }),
    setTimeout(fn, ms) { const t = setTimeout(fn, ms); timers.add(t); return t; },
    clearTimeout(t) { clearTimeout(t); timers.delete(t); },
    $(id) {
      if (!elements.has(id)) elements.set(id, { hidden: true, textContent: '', innerHTML: '', value: '', style: {} });
      return elements.get(id);
    },
    disposeBake(b) { if (b) disposed.push(b.id); },
    afterBake(b) { published.push(b.id); },
  });
  const run = code => vm.runInContext(code, ctx);
  for (const f of ['tool/data/review.js', 'tool/src/js/10_types.js', 'tool/src/js/14_pending.js', 'tool/src/js/15_replica.js', 'tool/src/js/70_ui.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  }
  run('showStats = () => {}; syncExport = () => {}; buildMasterPanel = () => {}; refreshVisibility = () => {};');
  return { ctx, run, elements, disposed, published,
    async close() {
      run('state.dirty = false; state.rebake = false;');
      await sleep(15);
      for (const t of timers) clearTimeout(t);
    }
  };
}
const result = [];
async function check(name, fn) {
  const f = fixture();
  try { await fn(f); result.push({ name, pass: true }); }
  catch (e) { result.push({ name, pass: false, error: e.message }); }
  finally { await f.close(); }
}
await check('F0: delayed trail cannot overwrite JM4 grid or publish stale bake', async f => {
  let finishOld;
  const calls = [];
  f.ctx.bake = async P => {
    const input = structuredClone(P); calls.push(input);
    if (calls.length === 1) await new Promise(resolve => { finishOld = resolve; });
    return { id: calls.length === 1 ? 'old-trail' : 'JM4', P: input,
      meta: { L: { cols: input.cols, rows: input.rows, chans: input.chans, F: input.cols * input.rows * input.chans } } };
  };
  f.run("state.P = defaultsFor('trailS').P; state.dirty = true;");
  const pending = f.run('runPreviewBake()');
  f.run("setReplica('JM4'); runPreviewBake();");
  finishOld(); await pending; await sleep(20);
  // 4.3：JM4（3.7 时代的记录）打开时迁移成 4×4 × 4 通道（和 JM4-40 同一套迁法）；关键是没被先前那次尾缀烘焙的 16×1 盖掉
  assert.deepEqual(JSON.parse(f.run('JSON.stringify([state.P.cols, state.P.rows, state.P.chans])')), [4, 4, 4]);
  assert.equal(f.run('state.bake.meta.L.F'), 64);
  assert.deepEqual(f.published, ['JM4']);
  assert.ok(f.disposed.includes('old-trail'), 'stale GPU resources must be released');
  assert.equal(calls.length, 2);
  assert.equal(f.run('state.dirty'), false);
});
await check('F1: failure stops; retained bake and persistent error survive all views', async f => {
  let calls = 0;
  f.ctx.bake = async () => { calls++; await sleep(5); throw new Error('injected framebuffer failure'); };
  f.run("state.bake = { id: 'previous' }; state.bakeGen = 3; state.gen = 4; state.dirty = true;");
  await f.run('runPreviewBake()'); await sleep(70);
  assert.equal(calls, 1, 'one failed generation must not be retried automatically');
  assert.equal(f.run('state.bake.id'), 'previous');
  assert.equal(f.run('state.dirty'), true);
  for (const view of ['live', 'export', 'atlas']) {
    f.run(`state.view = '${view}';`);
    const bar = f.elements.get('#bakeError');
    assert.ok(bar && !bar.hidden, `error visible in ${view}`);
    assert.match(f.elements.get('#bakeErrorText')?.textContent || '', /v3.*injected framebuffer failure/);
  }
  await f.run('runPreviewBake()');
  assert.equal(calls, 1, 'duplicate queued callbacks must not retry');
  f.ctx.bake = async P => { calls++; return { id: 'recovered', P, meta: { L: { cols: P.cols, rows: P.rows } } }; };
  f.run('onParam();'); await f.run('runPreviewBake()');
  assert.equal(calls, 2);
  assert.equal(f.run('state.dirty'), false);
  assert.equal(f.elements.get('#bakeError').hidden, true);
});
// 4.3（清理清单 C1）：只有一套画法；3.7 时代的存档（V5 正式库的原始记录、没写 renderVer 的旧配方）读进来时迁移，曝光不再是没标定的 1
await check('render version: one core; old (3.7) records migrate with calibrated exposure', async f => {
  for (const type of ['kiku', 'trailS', 'trailM', 'trailL', 'fountain', 'rise']) assert.equal(f.run(`defaultsFor('${type}').P.renderVer`), 40, type);
  for (const id of ['TR2S', 'TR2M', 'TR2L']) {
    // 4.3：V5 在新核上用 3.7 光点核（总光量），曝光是 3.7 在 1 倍尺寸下自动曝光的火花曝光（约 1e-3），星头另记 trHeadExpo（3.7 星头 / 火花曝光之比）
    const r = f.run(`(() => { const P = replicaPM('${id}').P; return { v: P.renderVer, mig: P._mig37, e: P.exposure, k: P.trHeadExpo, hb: P.trHeadBright }; })()`);
    assert.equal(r.v, 40, id); assert.equal(r.mig, 1, id); assert.ok(r.e > 5e-4 && r.e < 5e-3, id + ' exposure ' + r.e); assert.ok(r.k > 5 && r.k < 60, id + ' trHeadExpo ' + r.k); assert.ok(r.hb < 4, id + ' trHeadBright 不该被乘');
  }
  assert.equal(f.run("typeof renderVersion"), 'undefined');
});
// 4.2.10（走查 B8）：工具页的回滚 / 存为配方去掉了，旧配方只在导入时展开成花型模板的版本；展开时按配方自己的渲染版本（没写 = 37）
await check('stored recipes: legacy import resolves with its own renderVer', async f => {
  vm.runInContext(fs.readFileSync(path.join(root, 'tool/src/js/75_iter.js'), 'utf8'), f.ctx);
  f.run('state.recipes = [];');
  assert.equal(f.run("storedParams({ type: 'kiku' }).renderVer"), 40);
  assert.equal(f.run("storedParams({ type: 'kiku' })._mig37"), 1);          // 没写版本 = 3.7 时代的：迁移、曝光换成模板的
  assert.equal(f.run("storedParams({ type: 'kiku' }).exposure"), f.run('EXPOSURE40.kiku'));
  assert.equal(f.run("storedParams({ type: 'kiku', renderVer: 40, exposure: 0.7 }).exposure"), 0.7);     // 新存档原样
  assert.equal(f.run("storedParams({ type: 'kiku', renderVer: 40 })._mig37"), undefined);
  assert.equal(f.run("resolveRecipe({ type: 'kiku', diff: { P: {}, M: {} } }).P._mig37"), 1);
  assert.equal(f.run("resolveRecipe({ type: 'kiku', diff: { P: { renderVer: 40 }, M: {} } }).P._mig37"), undefined);
  f.run("state.recipes = [{ name: 'p', type: 'kiku', diff: { P: { renderVer: 40, stars: 99 }, M: {} } }];");
  assert.equal(f.run("resolveRecipe({ name: 'c', parent: 'p', type: 'kiku', diff: { P: { burn: 1.7 }, M: {} } }).P.stars"), 99);
  assert.equal(f.run("typeof rollback"), 'undefined');
});
await check('F1: obsolete failure does not block a newer recipe', async f => {
  let rejectOld;
  let calls = 0;
  f.ctx.bake = async P => {
    calls++;
    if (calls === 1) await new Promise((_, reject) => { rejectOld = reject; });
    return { id: 'new', P, meta: { L: { cols: P.cols, rows: P.rows } } };
  };
  const pending = f.run('runPreviewBake()');
  f.run('onParam();'); rejectOld(new Error('old generation failure'));
  await pending; await sleep(20);
  assert.equal(f.run('state.dirty'), false);
  assert.equal(f.run('state.bakeError'), null);
  assert.deepEqual(f.published, ['new']);
});

// Match direct ID/class layout rules without opening a browser. This catches an
// asset status accidentally inheriting the full-canvas task overlay's class.
function directStyles(id, className) {
  const css = fs.readFileSync(path.join(root, 'tool/src/style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const classes = new Set(className.split(/\s+/)), out = new Map(); let order = 0;
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const selector0 of rule[1].split(',')) {
      const selector = selector0.trim(), tokens = selector.match(/[.#][\w-]+/g) || [];
      if (selector !== '*' && (!tokens.length || tokens.join('') !== selector)) continue;
      if (!tokens.every(t => t[0] === '#' ? t.slice(1) === id : classes.has(t.slice(1)))) continue;
      const specificity = tokens.reduce((n, t) => n + (t[0] === '#' ? 100 : 10), 0);
      for (const declaration of rule[2].split(';')) {
        const colon = declaration.indexOf(':'); if (colon < 0) continue;
        const key = declaration.slice(0, colon).trim(), value = declaration.slice(colon + 1).trim();
        const weight = specificity + (/!important\b/.test(value) ? 10000 : 0), previous = out.get(key);
        if (!previous || weight >= previous.weight) out.set(key, { value: value.replace(/\s*!important\b/, ''), weight, order: order++ });
      }
    }
  }
  return Object.fromEntries([...out].map(([key, entry]) => [key, entry.value]));
}
await check('asset status: editing/baking/failure stay in flow; only task overlay covers the canvas', async f => {
  f.ctx.setInterval = () => 0; // Polling is unrelated; exercise stageTick explicitly below.
  vm.runInContext(fs.readFileSync(path.join(root, 'tool/src/js/79_workbench.js'), 'utf8'), f.ctx);
  let now = 0; f.ctx.performance = { now: () => now += 300 };
  f.ctx.engineTick = t => Math.floor(t * 30) / 30;
  f.elements.set('#tlBars', { querySelector: () => null, style: {} });
  f.run("srcLabel = () => 'AI 版 HN2'; specLabel = () => ''; buildTlBars = () => {}; syncGate = () => {};");
  const statuses = [
    { dirty: true, baking: false, error: false, text: '烘焙中…' },
    { dirty: true, baking: true, error: false, text: '烘焙中…' },
    { dirty: true, baking: false, error: true, text: '烘焙失败 · 保留上次成功' },
    { dirty: false, baking: false, error: false, text: '' },
  ];
  for (const row of statuses) {
    f.run(`state.dirty = ${row.dirty}; state.baking = ${row.baking}; state.bakeError = ${row.error ? '{}' : 'null'}; stageTick(4.2);`);
    const badge = f.elements.get('#abState'), style = directStyles('abState', badge.className);
    assert.equal(badge.textContent, row.text);
    assert.ok(!['absolute', 'fixed'].includes(style.position), `${row.text || 'idle'} status covers the page (${badge.className})`);
    assert.equal(style.inset, undefined, 'asset status must not stretch over its containing block');
  }
  const overlay = directStyles('busy', 'busy');
  assert.equal(overlay.position, 'absolute', 'explicit export/library task overlay must keep its position');
  assert.equal(overlay.inset, '0', 'task overlay remains bounded by the canvas');
});
console.log(JSON.stringify(result, null, 2));
const outIndex = process.argv.indexOf('--out');
if (outIndex >= 0) {
  const target = process.argv[outIndex + 1];
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
}
if (result.some(r => !r.pass)) process.exitCode = 1;
