// 5.0 接口检查：替身和真模块都要过同一套（node check-api-5.0.cjs [dist/fwl-importer.mock.js|dist/fwl-importer.js]）。
// 只在 Node 里用最小 window 加载，不连网络、不碰文件夹（真模块的连 UE 部分用假 fetch）。
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = path.resolve(__dirname, process.argv[2] || 'dist/fwl-importer.mock.js');
const src = fs.readFileSync(file, 'utf8');
let passed = 0, failed = 0;
const check = async (name, fn) => { try { await fn(); passed++; console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, '\n  ', e && e.stack || e); } };

const sandbox = { console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON, Promise, encodeURIComponent, TextEncoder, TextDecoder, URL, Blob: globalThis.Blob, crypto: globalThis.crypto };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
sandbox.fetch = async () => { throw new Error('offline (check-api-5.0)'); };
sandbox.document = { createElement: () => ({ style: {}, setAttribute() {}, addEventListener() {} }), body: { appendChild() {} }, readyState: 'complete', addEventListener() {} };
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: file });
const api = sandbox.FWLImporter;
const isMock = !!(api && api.__mock);

(async () => {
  await check('挂上 window.FWLImporter，接口版本 5.0.x', () => {
    assert(api, '没有 window.FWLImporter');
    assert.match(api.version, /^5\.0\.\d+$/);
    for (const k of ['status', 'reconnect', 'publish', 'scan', 'precheck', 'importPkg', 'thumbnailURL', 'on', 'configure']) assert.equal(typeof api[k], 'function', k);
  });
  await check('status() 同步返回，字段齐全', () => {
    const s = api.status();
    assert(!(s instanceof Promise));
    assert(['connected', 'disconnected', 'unavailable', 'checking'].includes(s.ue), s.ue);
    for (const k of ['detail', 'busy', 'endpoint']) assert(k in s, k);
    assert.equal(s.endpoint, '127.0.0.1:17780');
  });
  await check('on() 拒绝未知事件，返回取消订阅函数', () => {
    assert.throws(() => api.on('nope', () => {}));
    const off = api.on('status', () => {}); assert.equal(typeof off, 'function'); off();
  });
  if (!isMock) { console.log(`\n${passed} 过 / ${failed} 失败（真模块的离线部分；其余见 check-fwl-importer.cjs）`); process.exit(failed ? 1 : 0); }

  await check('scan 返回包列表，字段按 API_5.0.md', async () => {
    const list = await api.scan(null);
    assert(list.length >= 3);
    for (const p of list) {
      for (const k of ['id', 'resourceId', 'revisionId', 'name', 'category', 'size', 'platforms', 'exportedAt', 'state', 'revisions', 'files', 'assets']) assert(k in p, k);
      assert.equal(p.id, p.resourceId + '-' + p.revisionId);
      assert(['待导入', '有新版本', '已导入', '部分导入', '导入失败'].includes(p.state));
      for (const a of p.assets) { assert(['ps', 'tex:main', 'tex:ramp', 'mat:M0'].includes(a.key)); assert.equal(a.action, null); assert(a.uePath.startsWith('/Game/')); }
      assert(await api.thumbnailURL(p.id));
    }
  });
  await check('precheck → importPkg 走通，progress 有事件', async () => {
    const [p] = await api.scan(null); const prog = [];
    const off = api.on('progress', v => prog.push(v));
    const pc = await api.precheck(p.id);
    assert(pc.ok && pc.planToken && pc.newCount > 0 && Array.isArray(pc.issues));
    assert(pc.assets.every(a => a.action));
    const r = await api.importPkg(p.id, { planToken: pc.planToken });
    off();
    assert(r.ok && r.written.length && !r.failed.length);
    assert(prog.some(x => x.phase === 'upload') && prog.some(x => x.phase === 'import'));
    assert.equal((await api.scan(null)).find(x => x.id === p.id).state, '已导入');
  });
  await check('planToken 不对 → PLAN_STALE；有覆盖没给备份 → NEED_BACKUP_DIR', async () => {
    const list = await api.scan(null), p = list.find(x => x.state === '有新版本');
    await assert.rejects(api.importPkg(p.id, { planToken: 'x' }), e => e.code === 'PLAN_STALE');
    const pc = await api.precheck(p.id); assert(pc.needBackup && pc.overwriteCount > 0);
    await assert.rejects(api.importPkg(p.id, { planToken: pc.planToken }), e => e.code === 'NEED_BACKUP_DIR');
    const r = await api.importPkg(p.id, { planToken: pc.planToken, backupDir: {} }); assert(r.ok && r.backup);
  });
  await check('场景 blocked：precheck ok=false，有 error', async () => {
    await api.__mock.scenario('blocked'); const [p] = await api.scan(null);
    const pc = await api.precheck(p.id); assert.equal(pc.ok, false); assert(pc.issues.some(i => i.level === 'error'));
  });
  await check('场景 ue-down：状态 disconnected、有倒计时，precheck 抛 UE_DISCONNECTED', async () => {
    await api.__mock.scenario('ue-down');
    const s = api.status(); assert.equal(s.ue, 'disconnected'); assert(s.retryInSec > 0);
    const [p] = await api.scan(null); await assert.rejects(api.precheck(p.id), e => e.code === 'UE_DISCONNECTED');
  });
  await check('场景 fail：importPkg 有 failed 项，ok=false', async () => {
    await api.__mock.scenario('fail');
    const [p] = await api.scan(null); const pc = await api.precheck(p.id);
    const r = await api.importPkg(p.id, { planToken: pc.planToken }); assert.equal(r.ok, false); assert(r.failed.length === 1 && r.failed[0].reason);
  });
  await check('publish 把包加进列表并发 packages 事件', async () => {
    await api.__mock.scenario('empty'); let got = null;
    const off = api.on('packages', v => { got = v; });
    const rec = await api.publish(null, null, 'NewThing.zip', {}); off();
    assert.equal(rec.format, 'df.firework-resource/1'); assert(rec.pkgId);
    assert(got && got[0].name === 'NewThing' && got[0].state === '待导入');
    await api.__mock.scenario('default');
  });
  console.log(`\n${passed} 过 / ${failed} 失败`);
  process.exit(failed ? 1 : 0);
})();
