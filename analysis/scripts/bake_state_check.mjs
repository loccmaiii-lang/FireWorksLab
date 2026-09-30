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
  assert.deepEqual(JSON.parse(f.run('JSON.stringify([state.P.cols, state.P.rows, state.P.chans])')), [8, 8, 4]);
  assert.equal(f.run('state.bake.meta.L.F'), 256);
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
await check('render version: new templates are 40, existing entries and V5 are 37', async f => {
  assert.equal(f.run("defaultsFor('kiku').P.renderVer"), 40);
  for (const type of ['trailS', 'trailM', 'trailL']) assert.equal(f.run(`defaultsFor('${type}').P.renderVer`), 37);
  for (const id of ['JM4', 'TR2S', 'TR2M', 'TR2L']) assert.equal(f.run(`replicaPM('${id}').P.renderVer`), 37, id);
});
await check('stored recipes: legacy import and rollback; explicit version survives diff save', async f => {
  vm.runInContext(fs.readFileSync(path.join(root, 'tool/src/js/75_iter.js'), 'utf8'), f.ctx);
  f.run('renderRecipes = () => {}; renderVersions = () => {};');
  assert.equal(f.run("storedParams({ type: 'kiku' }).renderVer"), 37);
  assert.equal(f.run("storedParams({ type: 'kiku', renderVer: 40 }).renderVer"), 40);
  assert.equal(f.run("resolveRecipe({ type: 'kiku', diff: { P: {}, M: {} } }).P.renderVer"), 37);
  f.run("rollback({ P: { type: 'kiku' }, M: {}, name: 'old', n: 1 });");
  assert.equal(f.run('state.P.renderVer'), 37);
  f.run("state.P = defaultsFor('kiku').P; state.M = defaultsFor('kiku').M; saveRecipe('new');");
  assert.equal(f.run('state.recipes[0].diff.P.renderVer'), 40);
  assert.equal(f.run('resolveRecipe(state.recipes[0]).P.renderVer'), 40);
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
console.log(JSON.stringify(result, null, 2));
const outIndex = process.argv.indexOf('--out');
if (outIndex >= 0) {
  const target = process.argv[outIndex + 1];
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
}
if (result.some(r => !r.pass)) process.exitCode = 1;
