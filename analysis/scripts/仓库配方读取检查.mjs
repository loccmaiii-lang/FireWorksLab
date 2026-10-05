// 隔离检查仓库读取：真实个人配方 + 内存文件夹，不写用户文件。
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const files = fs.readdirSync('analysis/我的配方').filter(x => x.startsWith('my_')).flatMap(d => fs.readdirSync(`analysis/我的配方/${d}`).filter(x => x.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(`analysis/我的配方/${d}/${f}`, 'utf8'))));
function dir(entries = {}) { return { kind: 'directory', name: 'FireWorksLab', async getDirectoryHandle(n) { if (!entries[n] || entries[n].kind !== 'directory') throw Object.assign(new Error(n), { name: 'NotFoundError' }); return entries[n]; }, async *values() { for (const [n, v] of Object.entries(entries)) yield { ...v, name: n }; }, async queryPermission() { return 'granted'; } }; }
function file(doc) { return { kind: 'file', async getFile() { const s = typeof doc === 'string' ? doc : JSON.stringify(doc); return { size: s.length, lastModified: 0, async text() { return s; } }; } }; }
const memory = {}, messages = [];
const ctx = vm.createContext({ structuredClone, console, TYPES: Object.fromEntries(files.flatMap(d => d.snap.layers.map(l => [l.type, {}]))), lib: {}, store: { get(k, d) { return structuredClone(memory[k] ?? d); }, set(k, v) { memory[k] = structuredClone(v); } }, myAll() { return structuredClone(memory.myEffects || {}); }, myPut(r) { (memory.myEffects ||= {})[r.id] = structuredClone(r); }, setPackNames(k, base, layers) { (memory.packNames ||= {})[k] = { base, layers }; }, renderLib() {}, flash(s) { messages.push(s); }, confirm() { return false; }, $() { return null; } });
vm.runInContext(fs.readFileSync('tool/src/js/79_repo.js', 'utf8'), ctx);
assert.equal(vm.runInContext('typeof repoRead', ctx), 'function', '缺少仓库读取');
ctx.root = dir({ analysis: dir({ 我的配方: dir(Object.fromEntries(files.map((d, i) => ['my_' + d.id, dir({ [`${i}.json`]: file(d) })]))) }) });
await vm.runInContext('repoDir.h = root; repoRead({ interactive: false })', ctx);
assert.equal(Object.keys(memory.myEffects).length, files.length);
for (const d of files) { assert.deepEqual(memory.myEffects[d.id].snap, d.snap); assert.deepEqual(memory.myEffects[d.id].links, d.links || []); }
await vm.runInContext('repoRead({ interactive: false })', ctx);
assert.equal(Object.keys(memory.myEffects).length, files.length, '重复读取不得复制');
const d = files[0]; memory.myEffects[d.id].name = '本地修改';
await vm.runInContext('repoRead({ interactive: false })', ctx);
assert.equal(memory.myEffects[d.id].name, '本地修改', '自动读取不得覆盖');
await vm.runInContext('repoRead({ interactive: true })', ctx);
assert.equal(Object.keys(memory.myEffects).length, files.length, '取消冲突保留');
ctx.confirm = () => true;
await vm.runInContext('repoRead({ interactive: true })', ctx);
assert.equal(Object.keys(memory.myEffects).length, files.length + 1, '冲突保留成独立副本');
assert.equal(memory.myEffects[d.id].name, '本地修改');
await vm.runInContext('repoRead({ interactive: true })', ctx);
assert.equal(Object.keys(memory.myEffects).length, files.length + 1, '已读取副本不得重复添加');
ctx.root = dir({ analysis: dir({ 我的配方: dir({ bad: dir({ 'bad.json': file('{'), 'wrong.json': file({ ...d, key: 'my:other' }) }) }) }) });
await vm.runInContext('repoDir.h = root; repoRead({ interactive: false })', ctx);
assert.equal(Object.keys(memory.myEffects).length, files.length + 1, '坏文件不改本地');
ctx.root = { async queryPermission() { return 'denied'; } };
await vm.runInContext('repoDir.h = root; repoRead({ interactive: false })', ctx);
assert.equal(Object.keys(memory.myEffects).length, files.length + 1);
console.log('PASS: 四份真实配方、新资料恢复、重复读取、冲突拒绝/副本、坏文件、权限拒绝');
delete memory.myEffects; delete memory.repoReadCopies;
const newer = structuredClone(d); newer.name = '待上传新版本'; newer.at = '2099-01-01 00:00';
ctx.root = dir({ analysis: dir({ 我的配方: dir({ ['my_' + d.id]: dir({ 'old.json': file(d) }), _待上传: dir({ ['my_' + d.id]: dir({ 'new.json': file(newer) }) }) }) }) });
await vm.runInContext('repoDir.h = root; repoRead({ interactive: false })', ctx);
assert.equal(memory.myEffects[d.id].name, newer.name, '优先读最新待上传版本');
assert.deepEqual(structuredClone(memory.packNames['my:' + d.id]), { base: newer.ue.base, layers: newer.ue.layers });
delete memory.myEffects;
ctx.lib.my = { id: d.id }; ctx.confirm = () => false;
await vm.runInContext('repoRead({ interactive: true })', ctx);
assert.equal(Object.keys(memory.myEffects || {}).length, 0, '正在编辑不能自动替换');
ctx.lib.my = null;
ctx.store.set = () => {};
await vm.runInContext('repoRead({ interactive: false })', ctx); // myPut 模拟旧store需一并拒绝写入
ctx.myPut = () => {}; delete memory.myEffects;
await vm.runInContext('repoRead({ interactive: false })', ctx);
assert.ok(messages.at(-1).includes('未完成'), '存储失败要提示');
console.log('PASS: 待上传优先、UE命名恢复、当前编辑保护、存储失败提示');
ctx.store.set = (k, v) => { memory[k] = structuredClone(v); };
ctx.myPut = r => { (memory.myEffects ||= {})[r.id] = structuredClone(r); };
ctx.indexedDB = {};
await vm.runInContext('idbGet = async () => root; repoInit()', ctx);
assert.equal(memory.myEffects[d.id].name, newer.name, '已有授权重新打开自动恢复');
console.log('PASS: 已有仓库授权启动时自动恢复');
