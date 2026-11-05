// 烟花工坊 5.0 导入模块（dist/fwl-importer.js）的隔离检查：内存文件夹 + 模拟 UE，真引擎（只把最底层 importOne 换成记录）。
// node check-fwl-importer.cjs        需要 jsdom（见 README「如何运行检查」）；不连网络、不连 UE、不写磁盘。
// 有本机导出根 D:/ProjectTextures/FireWorksLab 时，另做「新旧两种方式导出，内容一致」对照（只读）。
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto'), { execFileSync } = require('node:child_process');
const { JSDOM, VirtualConsole } = require('jsdom');
const os = require('node:os');

let passed = 0, failedCount = 0;
async function check(name, fn) { try { await fn(); passed++; console.log('PASS', name); } catch (e) { failedCount++; console.log('FAIL', name, '\n   ', (e && e.stack || String(e)).split('\n').slice(0, 4).join('\n    ')); } }
const sha = u8 => crypto.createHash('sha256').update(u8).digest('hex');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- 引擎：用 build-5.0.py 现生成，再把 importOne 换成记录 ----------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fwl50-check-'));
execFileSync('python', ['-X', 'utf8', '-B', path.join(__dirname, 'build-5.0.py'), '--engine-html', path.join(tmp, 'engine.html'), '--out', path.join(tmp, 'fwl-importer.js')], { stdio: 'pipe' });
let engineHtml = fs.readFileSync(path.join(tmp, 'engine.html'), 'utf8');
{ const a = engineHtml.indexOf('  async function importOne(it){'), b = engineHtml.indexOf('  async function execute(){', a); assert(a > 0 && b > a); engineHtml = engineHtml.slice(0, a) + '  async function importOne(it){await window.__fwlWrite(it);}\n' + engineHtml.slice(b); }
const host = fs.readFileSync(path.join(__dirname, 'fwl50/host.js'), 'utf8')
  .replace("/*__ENGINE_HTML__*/''", () => JSON.stringify(engineHtml).replace(/</g, '\\u003c')).replace("/*__ENGINE_VERSION__*/''", () => '"test"').replace("/*__MODULE_VERSION__*/''", () => '"5.0.0"');
const distSource = fs.readFileSync(path.join(__dirname, 'dist/fwl-importer.js'), 'utf8');

// ---------- 内存文件夹（File System Access API 的最小实现）----------
class MemFile { constructor(name, data = new Uint8Array()) { this.kind = 'file'; this.name = name; this.data = data; }
  async getFile() { const d = this.data; return { size: d.length, arrayBuffer: async () => d.slice().buffer }; }
  async createWritable() { const f = this, parts = []; return { async write(x) { parts.push(new Uint8Array(x instanceof ArrayBuffer ? x : x.buffer ? new Uint8Array(x.buffer, x.byteOffset, x.byteLength) : x)); }, async close() { const n = parts.reduce((a, p) => a + p.length, 0), u = new Uint8Array(n); let o = 0; for (const p of parts) { u.set(p, o); o += p.length; } f.data = u; } }; }
}
class MemDir { constructor(name = 'root', perm = 'granted') { this.kind = 'directory'; this.name = name; this.children = new Map(); this.perm = perm; }
  async queryPermission() { return this.perm; }
  async getDirectoryHandle(n, o = {}) { let c = this.children.get(n); if (!c) { if (!o.create) throw Object.assign(new Error('nf ' + n), { name: 'NotFoundError' }); c = new MemDir(n); this.children.set(n, c); } if (c.kind !== 'directory') throw Object.assign(new Error('tm'), { name: 'TypeMismatchError' }); return c; }
  async getFileHandle(n, o = {}) { let c = this.children.get(n); if (!c) { if (!o.create) throw Object.assign(new Error('nf ' + n), { name: 'NotFoundError' }); c = new MemFile(n); this.children.set(n, c); } if (c.kind !== 'file') throw Object.assign(new Error('tm'), { name: 'TypeMismatchError' }); return c; }
  async removeEntry(n) { if (!this.children.delete(n)) throw Object.assign(new Error('nf'), { name: 'NotFoundError' }); }
  async *entries() { for (const e of [...this.children]) yield e; }
}
function memFiles(dir, prefix = '', out = {}) { for (const [n, c] of dir.children) { if (c.kind === 'directory') memFiles(c, prefix + n + '/', out); else out[prefix + n] = c.data; } return out; }
const memRead = (dir, rel) => memFiles(dir)[rel];

// ---------- ZIP（和烘焙器一样：不压缩、UTF-8 文件名）----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u8 => { let c = 0xFFFFFFFF; for (const b of u8) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function makeZip(files) {
  const parts = [], central = []; let offset = 0;
  for (const [name, data] of files) {
    const nm = Buffer.from(name, 'utf8'), crc = crc32(data), lh = Buffer.alloc(30 + nm.length);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nm.length, 26); nm.copy(lh, 30);
    const ch = Buffer.alloc(46 + nm.length); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nm.length, 28); ch.writeUInt32LE(offset, 42); nm.copy(ch, 46);
    parts.push(lh, Buffer.from(data)); central.push(ch); offset += lh.length + data.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...parts, cd, end]));
}
function png(w, h, seed = 0) { const b = Buffer.alloc(64 + seed); Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).copy(b, 0); b.writeUInt32BE(13, 8); b.write('IHDR', 12); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); b[40 + seed] = seed & 255; return new Uint8Array(b); }
function texHash(u8) { let f = 0x811c9dc5; for (const b of u8) { f ^= b; f = Math.imul(f, 0x01000193) >>> 0; } return crc32(u8).toString(16).padStart(8, '0') + f.toString(16).padStart(8, '0') + u8.length.toString(16); }
function fixtureZip(name = 'TestFlower', opts = {}) {
  const main = png(2048, 2048, 1), ramp = png(256, 1, 2), mmain = png(opts.mobileTex || 1024, opts.mobileTex || 1024, 3);
  const pc = { format: 'fwl.cascade/1', name, textures: { main: { class: 'flipbook', file: `T_EFX_FireWorks_${name}_8x8_HD.png`, asset: `T_EFX_FireWorks_${name}_8x8_HD`, sha256: sha(main), cols: 8, rows: 8 }, ramp: { class: 'ramp', file: `T_EFX_FireWorks_${name}_Ramp_HD.png`, asset: `T_EFX_FireWorks_${name}_Ramp_HD`, hash: texHash(ramp) } },
    materials: { m: { role: 'flipbook_rgba', textures: { main: 'main', ramp: 'ramp' } } }, emitters: [{ name: 'Burst', material: 'm', max_alive: 40, required: { duration_s: 3, loops: 1 }, modules: [] }] };
  const mobile = { ...pc, name: name + '_M', platform: 'mobile', tier: 'M', textures: { main: { ...pc.textures.main, file: `T_EFX_FireWorks_${name}_M_8x8.png`, asset: `T_EFX_FireWorks_${name}_M_8x8`, sha256: sha(mmain) }, ramp: { ...pc.textures.ramp, file: `T_EFX_FireWorks_${name}_M_Ramp.png`, asset: `T_EFX_FireWorks_${name}_M_Ramp` } } };
  if (opts.mobileEmitters) mobile.emitters = Array.from({ length: opts.mobileEmitters }, (_, i) => ({ ...pc.emitters[0], name: 'E' + i }));
  if (opts.neverStream) pc.textures.main.NeverStream = true;
  const files = [[`${name}/cascade.json`, Buffer.from(JSON.stringify(pc))], [`${name}/cascade_mobile.json`, Buffer.from(JSON.stringify(mobile))],
    [`${name}/${pc.textures.main.file}`, main], [`${name}/${pc.textures.ramp.file}`, ramp], [`${name}/${mobile.textures.main.file}`, mmain], [`${name}/${mobile.textures.ramp.file}`, ramp], [`${name}/recipe.json`, Buffer.from('{"r":1}')]];
  return makeZip(files);
}

// ---------- 模拟 UE（GPUECli + Python）----------
function makeUE() {
  const ue = { vfs: new Map(), calls: [], writes: [], assets: new Map(), unknown: [], down: false };   // assets：UE 里已有的资产路径 → 当时的导入名
  const lit = (code, name) => { const m = code.match(new RegExp(name + ' = u"((?:[^"\\\\]|\\\\.)*)"')); return m ? JSON.parse('"' + m[1] + '"') : null; };
  const b64json = code => JSON.parse(Buffer.from(code.match(/base64\.b64decode\('([A-Za-z0-9+/=]*)'\)\.decode/)[1], 'base64').toString('utf8'));
  const out = (tag, v) => ({ return_value: 'True', out_LogOutput: 'Output=' + JSON.stringify(tag + (typeof v === 'string' ? v : JSON.stringify(v))) });
  const under = p => [...ue.vfs.keys()].filter(k => k === p || k.startsWith(p + '/'));
  ue.fetch = async (url, opt) => {
    if (ue.down) throw new TypeError('Failed to fetch');
    assert.equal(opt.headers['Content-Type'], 'text/plain', '必须是简单请求');
    const b = JSON.parse(opt.body); ue.calls.push(b.function); let data;
    if (b.function === 'GetPlatformName') data = { return_value: 'Windows' };
    else if (b.function === 'DoesAssetExist') data = { return_value: ue.assets.has(b.args.AssetPath.split('.')[0]) ? 'True' : 'False' };
    else if (b.function === 'ExecutePythonCommandEx') {
      const code = b.args.PythonCommand;
      if (require('./mock-import-policy.cjs').simulatePolicy(code)) data = { return_value: 'True' };
      else if (code.includes("print('FWLTEMP:'")) data = out('FWLTEMP:', JSON.stringify('C:/Users/测试/AppData/Local/Temp/fwl50'));
      else if (code.includes("print('FWLSAME:'")) { const d = lit(code, 'd'), m = ue.vfs.get(d + '/.fwl50-manifest.json'); data = out('FWLSAME:', JSON.stringify(!!m && Buffer.from(m).toString() === JSON.stringify(b64json(code)))); }
      else if (code.includes('os.makedirs(d)') && code.includes('shutil.rmtree(d)')) { for (const k of under(lit(code, 'd'))) ue.vfs.delete(k); data = { return_value: 'True' }; }
      else if (/o = open\(p, '(wb|ab)'\)/.test(code)) {
        const m = code.match(/p = os\.path\.join\(u"((?:[^"\\]|\\.)*)", u"((?:[^"\\]|\\.)*)"\)/), p = JSON.parse('"' + m[1] + '"') + '/' + JSON.parse('"' + m[2] + '"');
        const chunk = Buffer.from(code.match(/b64decode\('([A-Za-z0-9+/=]*)'\)\); o\.close/)[1], 'base64'), prev = code.includes("'ab'") ? ue.vfs.get(p) || new Uint8Array() : new Uint8Array();
        ue.vfs.set(p, new Uint8Array(Buffer.concat([Buffer.from(prev), chunk]))); data = { return_value: 'True' };
      }
      else if (code.includes("print('FWLCHECK:'")) { const d = lit(code, 'd'), want = b64json(code), bad = Object.entries(want).filter(([n, h]) => !ue.vfs.has(d + '/' + n) || sha(ue.vfs.get(d + '/' + n)) !== h).map(([n]) => n); if (!bad.length) ue.vfs.set(d + '/.fwl50-manifest.json', Buffer.from(JSON.stringify(want))); data = out('FWLCHECK:', bad); }
      else if (code.includes('shutil.rmtree(d)')) { for (const k of under(lit(code, 'd'))) ue.vfs.delete(k); data = { return_value: 'True' }; }
      else if (code.includes("print('FWLJSON:' + json.dumps(result))") && code.includes('config_file = ')) {
        const dir = lit(code, 'p'), cf = lit(code, 'config_file'), raw = ue.vfs.get(dir + '/' + cf), result = { directory: dir, candidates: [] };
        if (!raw) result.error = 'missing_cascade';
        else {
          const spec = JSON.parse(Buffer.from(raw).toString('utf8')), exists = {}, hashes = {};
          for (const [k, t] of Object.entries(spec.textures || {})) { const f = ue.vfs.get(dir + '/' + t.file); exists[k] = !!f; if (f) { hashes[k] = sha(f); if (t.hash && ['ramp', 'cutout'].includes(t.class) && texHash(f) !== t.hash) { result.error = 'invalid_cascade'; result.reason = 'Texture content fingerprint mismatch: ' + k; } } }
          if (!result.error) Object.assign(result, { spec, configFile: cf, exists, sourceHash: sha(raw), textureHashes: hashes });
        }
        data = out('FWLJSON:', result);
      }
      else if (code.includes("print('FWLTARGETS:'")) {
        // 只读：同名目标是否存在、来源标识、磁盘哈希、版本管理（这里关着）
        const entries = JSON.parse(code.match(/^entries = (.*)$/m)[1]);
        data = out('FWLTARGETS:', entries.map(([key, pkg]) => { const as = ue.assets.get(pkg); return { key, pkg, exists: !!as, class: !as ? '' : key === 'ps' ? 'ParticleSystem' : key.startsWith('mat:') ? 'MaterialInstanceConstant' : 'Texture2D', tag: as ? 'fwl.cascade/1 test -> ' + as : '', diskHash: as ? 'a'.repeat(64) : '', dirty: false, sc: 'disabled', editable: true }; }));
      }
      else { ue.unknown.push(code.slice(0, 160)); throw new Error('模拟 UE 没处理这段 Python：' + code.slice(0, 80)); }
    } else { ue.writes.push(b.function); throw new Error('模拟 UE 拦下写入：' + b.function); }
    return { ok: true, json: async () => ({ success: true, data }) };
  };
  // 只读的 /object/get：已导入的粒子系统 = 1 个发射器、1 级 LOD
  const call = ue.fetch;
  ue.fetch = async (url, opt) => {
    if (!String(url).endsWith('/object/get')) return call(url, opt);
    if (ue.down) throw new TypeError('Failed to fetch');
    const b = JSON.parse(opt.body), p = b.path; ue.calls.push('get');
    const props = p.includes(':') ? (p.endsWith('.L0') ? { bEnabled: true, RequiredModule: { path: p + '.R' }, SpawnModule: { path: p + '.S' } } : /:E0$/.test(p) ? { LODLevels: [{ path: p + '.L0' }] } : {}) : { Emitters: [{ path: p + ':E0' }] };
    return { ok: true, json: async () => ({ success: true, data: { properties: props } }) };
  };
  return ue;
}

// ---------- 页面：外壳页 + 引擎（jsdom 不跑 srcdoc，这里接一个独立 jsdom 当引擎 iframe）----------
function boot(source = host, ue = makeUE()) {
  const errors = [], vc = new VirtualConsole(); vc.on('jsdomError', e => errors.push(e.message)); const writes = [];
  const page = new JSDOM('<!doctype html><body></body>', { url: 'http://isolated-test.invalid/shell', runScripts: 'outside-only', virtualConsole: vc, pretendToBeVisual: true, beforeParse(w) {} }).window;
  Object.assign(page, { fetch: ue.fetch, Blob, Response, TextEncoder, TextDecoder, DecompressionStream });
  Object.defineProperty(page, 'crypto', { value: crypto.webcrypto });
  page.URL.createObjectURL = b => 'blob:test/' + Math.random().toString(36).slice(2);
  const engines = [];
  Object.defineProperty(page.HTMLIFrameElement.prototype, 'srcdoc', { configurable: true, set(html) {
    const name = this.name;
    const ew = new JSDOM(html, { url: 'http://isolated-test.invalid/engine', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, beforeParse(w) {
      w.name = name; w.__FWL50_HOSTS = page.__FWL50_HOSTS; w.fetch = ue.fetch; w.confirm = () => false;
      w.__fwlWrite = async it => { writes.push(JSON.parse(JSON.stringify({ as: it.as, assets: it.assets, mode: it.mode, keys: it.selectedAssetKeys }))); for (const k of it.selectedAssetKeys || Object.keys(it.assets)) ue.assets.set(it.assets[k], it.as); it.importProgress = { stage: '粒子系统', saved: [], added: [], edited: [] }; };
    } }).window;
    engines.push(ew);
  } });
  page.__FWL50_TEST__ = true;
  page.eval(source);
  return { page, api: page.FWLImporter, ue, writes, errors, engines, close() { engines.forEach(e => e.close()); page.close(); } };
}

(async () => {
  await check('dist 是由当前源码生成的（host.js 改了要重新 build-5.0.py）', async () => {
    const fresh = fs.readFileSync(path.join(tmp, 'fwl-importer.js'), 'utf8');
    assert.equal(sha(Buffer.from(distSource)), sha(Buffer.from(fresh)), 'dist/fwl-importer.js 不是最新，请运行 python -X utf8 -B tool/importer/build-5.0.py');
  });
  await check('dist 能直接内联进 <script>：没有 </script、没有本机盘符路径、不连 8034', async () => {
    assert(!/<\/script/i.test(distSource)); assert(!distSource.includes('127.0.0.1:8034')); assert(!/['"`][A-Za-z]:[\\/]/.test(distSource.replace(/\\u003c/g, '<')));
  });

  const t = boot();
  await sleep(50);
  const root = new MemDir('FWL_Export');
  await check('打开就连 UE：status 变 connected，用 text/plain 简单请求', async () => {
    for (let i = 0; i < 20 && t.api.status().ue !== 'connected'; i++) await sleep(20);
    assert.equal(t.api.status().ue, 'connected'); assert.match(t.api.status().detail, /Windows/);
  });
  let receipt;
  await check('publish：写修订目录、索引、ZIP 留档、缩略图，平台分目录', async () => {
    const zip = fixtureZip();
    receipt = await t.api.publish(root, new Blob([zip]), 'TestFlower.zip', { bakerVersion: '4.9.126', sourceKey: 'k1', classification: { category: 'firework', size: 'medium' }, thumbnailData: 'data:image/png;base64,' + Buffer.from(png(320, 240, 9)).toString('base64'), thumbnailTime: 0.8, artifactDuration: 3.2 });
    const files = memFiles(root);
    assert.equal(receipt.format, 'df.firework-resource/1'); assert.equal(receipt.pkgId, receipt.deliveryId);
    assert(files['workspace-resources.json']); assert(files['.workspace/exports/' + receipt.resourceId + '.json']);
    const base = '烟花/中/TestFlower/revisions/' + receipt.revisionId + '/';
    for (const p of ['PC/TestFlower/cascade.json', '手机/TestFlower/cascade_mobile.json', '资料/TestFlower/recipe.json', 'workspace-resource.json', 'workspace-thumbnail.png']) assert(files[base + p], '缺 ' + p);
    assert(files['烟花/中/TestFlower/ZIP/TestFlower_PC-Mobile_v001.zip']);
    assert.equal(sha(files['烟花/中/TestFlower/ZIP/TestFlower_PC-Mobile_v001.zip']), sha(Buffer.from(zip)));
    assert.equal(receipt.thumbnail.status, 'ready'); assert(!('thumbnailData' in receipt.metadata));
  });
  await check('同内容再导出：同一修订，只多一个 _v002.zip', async () => {
    const again = await t.api.publish(root, new Blob([fixtureZip()]), 'TestFlower.zip', { classification: { category: 'firework', size: 'medium' } });
    assert.equal(again.deliveryId, receipt.deliveryId); assert(memFiles(root)['烟花/中/TestFlower/ZIP/TestFlower_PC-Mobile_v002.zip']);
    assert.equal(JSON.parse(Buffer.from(memRead(root, 'workspace-resources.json')).toString()).resources.length, 1);
  });
  let list;
  await check('scan：包列表字段按 API_5.0.md，资产名来自原导入器命名', async () => {
    list = await t.api.scan(root);
    assert.equal(list.length, 1); const p = list[0];
    assert.equal(p.id, receipt.deliveryId); assert.equal(p.state, '待导入'); assert.equal(JSON.stringify(p.platforms), '["pc","mobile"]');
    assert.equal(p.category, '烟花'); assert.equal(p.size, '中'); assert.equal(p.durationSec, 3.2); assert.equal(p.thumbTime, 0.8); assert(p.files.ok);
    assert(p.assets.some(a => a.key === 'ps' && a.platform === 'pc' && a.uePath === '/Game/Effects_HD/Props_HD/FireWorks_HD/P_EFX_FireWorks_TestFlower_HD'), JSON.stringify(p.assets));
    assert(p.assets.some(a => a.key === 'ps' && a.platform === 'mobile' && a.uePath.startsWith('/Game/Effects/Props/FireWorks/P_EFX_FireWorks_TestFlower_M')));
    assert(p.assets.every(a => a.action === null));
    assert(await t.api.thumbnailURL(p.id));
  });
  let pre;
  await check('precheck：传进 UE 临时目录（1 MB 一块）、跑原导入器检查和网页拦截，零写入', async () => {
    const prog = []; const off = t.api.on('progress', v => prog.push(v));
    pre = await t.api.precheck(list[0].id);
    off();
    assert(pre.ok, JSON.stringify(pre.issues)); assert(pre.planToken); assert.equal(pre.overwriteCount, 0); assert(pre.newCount >= 6, JSON.stringify(pre.assets));
    assert(pre.uploadedBytes > 0); assert(prog.some(x => x.phase === 'upload')); assert.equal(t.ue.writes.length, 0); assert.equal(t.writes.length, 0);
    assert([...t.ue.vfs.keys()].some(k => k.endsWith('/pc/cascade.json')) && [...t.ue.vfs.keys()].some(k => k.endsWith('/mobile/cascade_mobile.json')));
    assert(t.ue.calls.filter(c => c === 'ExecutePythonCommandEx').length > 4);
  });
  await check('再检查一次：UE 临时目录内容没变就不再传', async () => {
    const again = await t.api.precheck(list[0].id); assert(again.ok); assert.equal(again.uploadedBytes, 0); pre = again;
  });
  await check('planToken 不对 → PLAN_STALE，不写', async () => {
    await assert.rejects(t.api.importPkg(list[0].id, { planToken: 'p-wrong' }), e => e.code === 'PLAN_STALE'); assert.equal(t.writes.length, 0);
  });
  await check('importPkg：经原引擎写（这里记录）、登记贴图、写导入回执、清 UE 临时目录', async () => {
    const st = []; const off = t.api.on('status', s => st.push(s.busy));
    const r = await t.api.importPkg(list[0].id, { planToken: pre.planToken }); off();
    assert(r.ok, JSON.stringify(r)); assert.equal(r.failed.length, 0); assert.equal(t.writes.length, 2, '两个平台各写一次');
    assert(st.includes(true) && st[st.length - 1] === false, '导入时 busy');
    const rec = JSON.parse(Buffer.from(memRead(root, r.receiptPath)).toString()); assert.equal(rec.enginePlaybackVerified, false); assert(rec.rows.every(x => x.state === 'done'));
    const reg = JSON.parse(Buffer.from(memRead(root, '.workspace/texture-fingerprints.json')).toString()); assert(reg.textures['T_EFX_FireWorks_TestFlower_8x8_HD']);
    assert(![...t.ue.vfs.keys()].some(k => k.includes(list[0].id)), 'UE 临时目录要清掉');
    assert.equal(t.ue.writes.length, 0);
  });
  await check('导入后 scan：已导入；再 precheck 说已经导入过', async () => {
    const l = await t.api.scan(root); assert.equal(l[0].state, '已导入'); assert.match(l[0].stateDetail, /上次导入/);
    const again = await t.api.precheck(l[0].id); assert.equal(again.ok, false); assert(again.issues.some(i => /已经导入过/.test(i.text)));
  });
  await check('新修订：老修订已导入 → 有新版本；UE 里已有同名资产 → 自动按「更新同名」，要备份文件夹', async () => {
    const zip = fixtureZip('TestFlower', { mobileTex: 512 });
    await t.api.publish(root, new Blob([zip]), 'TestFlower.zip', { sourceKey: 'k1', classification: { category: 'firework', size: 'medium' } });
    const l = await t.api.scan(root); assert.equal(l.length, 1); assert.equal(l[0].state, '有新版本'); assert.equal(l[0].revisions.length, 2);
    const p = await t.api.precheck(l[0].id);
    assert(p.ok, JSON.stringify(p.issues)); assert(p.overwriteCount > 0 && p.needBackup, '新修订沿用上次的「更新同名」，要覆盖、要备份：' + JSON.stringify(p.assets.map(a => a.action)));
    await assert.rejects(t.api.importPkg(l[0].id, { planToken: p.planToken }), e => e.code === 'NEED_BACKUP_DIR');
    assert.equal(t.writes.length, 2, '没选备份文件夹不写');
  });
  await check('文件被改过 → precheck FILES_CHANGED', async () => {
    const l = await t.api.scan(root), files = memFiles(root);
    const key = Object.keys(files).find(k => k.includes(l[0].revisionId) && k.endsWith('cascade.json'));
    const d = key.split('/'); let dir = root; for (const x of d.slice(0, -1)) dir = dir.children.get(x); dir.children.get(d[d.length - 1]).data = Buffer.from('{"format":"x"}');
    await assert.rejects(t.api.precheck(l[0].id), e => e.code === 'FILES_CHANGED');
  });
  t.close();

  await check('导入前拦截（网页版 fx_gate）：手机发射器超上限、NeverStream 拦下，零写入', async () => {
    const b = boot(); const r2 = new MemDir();
    await b.api.publish(r2, new Blob([fixtureZip('BadFlower', { mobileEmitters: 4, neverStream: true })]), 'BadFlower.zip', {});
    const [p] = await b.api.scan(r2); const res = await b.api.precheck(p.id);
    assert.equal(res.ok, false); assert(res.issues.some(i => /超过 _M 上限 3/.test(i.text)), JSON.stringify(res.issues)); assert(res.issues.some(i => /NeverStream/.test(i.text)));
    assert.equal(b.writes.length, 0); assert.equal(b.ue.writes.length, 0); b.close();
  });
  await check('UE 没开：status disconnected + 倒计时，precheck 抛 UE_DISCONNECTED', async () => {
    const ue = makeUE(); ue.down = true; const b = boot(host, ue); await sleep(60);
    const s = b.api.status(); assert.equal(s.ue, 'disconnected'); assert(s.retryInSec > 0 && s.retryInSec <= 12);
    const r3 = new MemDir(); await b.api.publish(r3, new Blob([fixtureZip()]), 'X.zip', {});
    const [p] = await b.api.scan(r3); await assert.rejects(b.api.precheck(p.id), e => e.code === 'UE_DISCONNECTED');
    ue.down = false; assert.equal((await b.api.reconnect()).ue, 'connected'); b.close();
  });
  await check('没有读写权限 → NO_PERMISSION', async () => {
    const b = boot(); await assert.rejects(b.api.publish(new MemDir('x', 'prompt'), new Blob([fixtureZip()]), 'X.zip', {}), e => e.code === 'NO_PERMISSION'); b.close();
  });
  await check('沙盒：configure 后资产路径整体挪到 /Game/FWL50_Sandbox 下', async () => {
    const b = boot(); b.api.configure({ sandbox: '/Game/FWL50_Sandbox' }); const r4 = new MemDir();
    await b.api.publish(r4, new Blob([fixtureZip()]), 'TestFlower.zip', {});
    const [p] = await b.api.scan(r4); assert(p.assets.length && p.assets.every(a => a.uePath.startsWith('/Game/FWL50_Sandbox/')), JSON.stringify(p.assets.map(a => a.uePath)));
    const pc = await b.api.precheck(p.id); assert(pc.ok, JSON.stringify(pc.issues)); assert(pc.assets.every(a => a.uePath.startsWith('/Game/FWL50_Sandbox/')));
    assert.throws(() => b.api.configure({ sandbox: '/Game/X' }), e => e.code === 'TOO_LATE'); b.close();
  });
  await check('备份：从 UE 临时目录分块读回（4 MB 一块）、写进备份文件夹（.uasset.bak + manifest），哈希一致，删掉 UE 里的副本', async () => {
    const b = boot(); await sleep(30);
    const tmpDir = 'C:/Users/测试/AppData/Local/Temp/fwl50/backups', big = new Uint8Array(crypto.randomBytes(9 * 1024 * 1024 + 7)), small = new Uint8Array(crypto.randomBytes(1000));
    const orig = tmpDir + '/A_01_x_original_0_P_A.uasset', upd = tmpDir + '/A_01_x_before-update_0_P_A.uasset', man = tmpDir + '/A_01_x_manifest.json';
    b.ue.vfs.set(orig, big); b.ue.vfs.set(upd, small); b.ue.vfs.set(man, Buffer.from('{}'));
    const realFetch = b.ue.fetch; let removed = false, reads = 0;
    b.page.fetch = async (u, o) => { const body = JSON.parse(o.body), code = (body.args && body.args.PythonCommand) || '';
      const pm = code.match(/p = u"((?:[^"\\]|\\.)*)"/) || code.match(/open\(u"((?:[^"\\]|\\.)*)", 'rb'\)/), p = pm && JSON.parse('"' + pm[1] + '"');
      const reply = (tag, v) => ({ json: async () => ({ success: true, data: { return_value: 'True', out_LogOutput: 'Output=' + JSON.stringify(tag + v) } }) });
      if (code.includes("print('FWLSTAT:'")) { const d = b.ue.vfs.get(p); return reply('FWLSTAT:', JSON.stringify({ size: d.length, sha: sha(d) })); }
      if (code.includes("print('FWLB64:'")) { reads++; const d = b.ue.vfs.get(p), off = +code.match(/f\.seek\((\d+)\)/)[1], n = +code.match(/b = f\.read\((\d+)\)/)[1]; assert(n <= 4 << 20); return reply('FWLB64:', Buffer.from(d.subarray(off, off + n)).toString('base64')); }
      if (code.includes('os.remove(p)')) { assert(code.includes(b.page.FWLImporter.__test.pyStr(man))); removed = true; return { json: async () => ({ success: true, data: { return_value: 'True' } }) }; }
      return realFetch(u, o); };
    const bak = new MemDir('备份');
    const res = await b.api.__test.copyBackup(bak, { as: 'A_01' }, { manifest: man, assets: [{ key: 'ps', pkg: '/Game/X/P_A', original: orig, before_update: upd }] });
    const files = memFiles(bak), names = Object.keys(files);
    assert.equal(res.files, 2); assert.equal(reads, 4, '9 MB 读 3 块 + 1 KB 读 1 块');
    const o = names.find(n => n.endsWith('_original_0_P_A.uasset.bak')), w = names.find(n => n.endsWith('_before-update_0_P_A.uasset.bak'));
    assert(o && w && names.some(n => n.endsWith('/manifest.json')), names.join(','));
    assert.equal(sha(files[o]), sha(big)); assert.equal(sha(files[w]), sha(small));
    const m = JSON.parse(Buffer.from(files[names.find(n => n.endsWith('/manifest.json'))]).toString()); assert.equal(m.records.length, 2); assert.equal(m.records[0].sha256, sha(big));
    assert(removed, 'UE 临时目录里的备份副本要删');
    b.close();
  });
  await check('导入引擎里覆盖前的备份不再写 D 盘：写 UE 系统临时目录，再交给网页', async () => {
    assert(!engineHtml.includes('asset-backups')); assert(engineHtml.includes("root = os.path.join(root, u'fwl50', u'backups')"));
    assert(engineHtml.includes('await FWL50_HOST_WIN.__FWL50_HOST.saveBackup(it,backup);'));
    const i = engineHtml.indexOf('await FWL50_HOST_WIN.__FWL50_HOST.saveBackup(it,backup);'), j = engineHtml.indexOf("close_asset_editors", i);
    assert(j > i && j - i < 400, '备份交给网页之后才关编辑器、开始改资产');
  });

  // 新旧两种导出对照：本机有旧 8034 发布过的修订和它的原 ZIP 时才做（只读）
  const legacyRoot = 'D:/ProjectTextures/FireWorksLab', legacy = [['烟花/小/GlitterChry', '764b445a497bc137564a', 'GlitterChry_PC-Mobile_v003.zip']];
  for (const [dir, rev, zipName] of legacy) {
    const zipPath = path.join(legacyRoot, dir, 'ZIP', zipName), resPath = path.join(legacyRoot, dir, 'revisions', rev, 'workspace-resource.json');
    if (!fs.existsSync(zipPath) || !fs.existsSync(resPath)) { console.log('SKIP 新旧导出对照（本机没有 ' + zipPath + '）'); continue; }
    await check('新旧两种导出一致：' + dir + ' ' + rev + '（同 ZIP → 同修订号、同文件清单、同平台目录、文件逐字节相同）', async () => {
      const b = boot(), r = new MemDir(), old = JSON.parse(fs.readFileSync(resPath, 'utf8'));
      const rec = await b.api.publish(r, new Blob([new Uint8Array(fs.readFileSync(zipPath))]), old.name + '.zip', { classification: old.classification });
      assert.equal(rec.revisionId, rev); assert.equal(rec.resourceId, old.resourceId);
      const J = v => JSON.stringify(v);
      assert.equal(J(rec.sourceFiles), J(old.sourceFiles)); assert.equal(J(rec.packages), J(old.packages));
      const strip = fl => fl.filter(f => f.path !== 'workspace-thumbnail.png');
      assert.equal(J(strip(rec.files)), J(strip(old.files)));
      const mine = memFiles(r);
      for (const f of strip(old.files)) assert.equal(sha(mine[rec.relativeDirectory + '/' + f.path]), sha(fs.readFileSync(path.join(legacyRoot, dir, 'revisions', rev, f.path))), f.path);
      b.close();
    });
    await check('网页版拦截和 fx_gate.py 结论逐条一致：' + dir + ' ' + rev, async () => {
      let raw; try { raw = execFileSync('python', ['-X', 'utf8', '-B', path.join(__dirname, '../local_delivery/fx_gate.py'), path.join(legacyRoot, dir, 'revisions', rev), '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { raw = e.stdout; }
      const py = JSON.parse(raw);
      const b = boot(), r = new MemDir(), old = JSON.parse(fs.readFileSync(resPath, 'utf8'));
      const rec = await b.api.publish(r, new Blob([new Uint8Array(fs.readFileSync(zipPath))]), old.name + '.zip', { ...old.metadata, classification: old.classification });
      const js = await b.api.__test.gateCheck(r, rec.deliveryId); b.close();
      const J = v => JSON.stringify(v);
      assert.equal(js.ok, py.ok); assert.equal(J(js.problems), J(py.problems)); assert.equal(J(js.info), J(py.info));
      assert.equal(J(Object.keys(js.textures).sort()), J(Object.keys(py.textures).sort()));
      for (const k of Object.keys(py.textures)) { assert.equal(js.textures[k].sha256, py.textures[k].sha256); assert.equal(J(js.textures[k].size), J(py.textures[k].size)); }
    });
  }

  console.log(`\n${passed} 过 / ${failedCount} 失败`);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(failedCount ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

function page_Blob(t) { return t.page.Blob; }
