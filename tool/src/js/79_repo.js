// =====================================================================
//  4.2.4 存进仓库文件夹（用户 2026-10-03 00:25：公司环境可能不让开本地服务 → 不开服务器）
//  浏览器自带的「文件系统访问」：第一次在资产栏 ⋯ 里选一下仓库根目录（FireWorksLab），以后每次「保存」
//  顺便写一份 JSON 到 analysis/我的配方/_待上传/<效果>/<版本名>__<编号>.json；
//  后台脚本（每 10 分钟那个）把它挪进 analysis/我的配方/<效果>/ 并推上去，AI 直接从 git 读，不用再「复制我的改动」。
//  授权（文件夹句柄）存在这台电脑的浏览器里（IndexedDB）；浏览器重开后第一次保存会再问一次「允许」。
// =====================================================================
const repoDir = { h: null, name: '', ok: false };
function idbOpen() {
  return new Promise((res, rej) => { const r = indexedDB.open('fwl', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
async function idbGet(k) { const db = await idbOpen(); return new Promise((res, rej) => { const t = db.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); }); }
async function idbSet(k, v) { const db = await idbOpen(); return new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
async function repoInit() {
  const read = $('#abRepoRead'); if (read) read.addEventListener('click', () => { const menu = $('#abMore'); if (menu) menu.open = false; repoRead({ interactive: true }); });
  try { if (typeof indexedDB !== 'undefined') { const h = await idbGet('repoDir'); if (h) { repoDir.h = h; repoDir.name = h.name; await repoPerm(false); } } } catch (e) { }
  repoSync();
  if (repoDir.ok) await repoRead({ interactive: false });
}
// 认一下是不是仓库根目录：里面有「协作/状态清单.json」
async function repoCheck(h) { try { const c = await h.getDirectoryHandle('协作'); await c.getFileHandle('状态清单.json'); return true; } catch (e) { return false; } }
async function repoUse(h) {
  if (!(await repoCheck(h))) { flash('这个文件夹不是 FireWorksLab 仓库根目录（里面应该有「协作/状态清单.json」）', true); return false; }
  repoDir.h = h; repoDir.name = h.name; repoDir.ok = true;
  try { await idbSet('repoDir', h); } catch (e) { }
  repoSync(); return true;
}
async function repoPick() {
  if (typeof showDirectoryPicker !== 'function') { flash('这个浏览器不能写文件夹（请用 Chrome 或 Edge 打开烘焙器）', true); return false; }
  let h; try { h = await showDirectoryPicker({ id: 'fwlRepo', mode: 'readwrite' }); } catch (e) { return false; }   // 取消了
  if (!(await repoUse(h))) return false;
  await repoRead({ interactive: true });
  return true;
}
async function repoPerm(ask) {
  const h = repoDir.h; if (!h) return false;
  try { const o = { mode: 'readwrite' }; let p = h.queryPermission ? await h.queryPermission(o) : 'granted'; if (p !== 'granted' && ask && h.requestPermission) p = await h.requestPermission(o); repoDir.ok = p === 'granted'; }
  catch (e) { repoDir.ok = false; }
  repoSync(); return repoDir.ok;
}
const repoSafe = s => String(s).replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^[_.]+|[_.]+$/g, '').slice(0, 60) || 'x';
function repoPath(key, item) { return ['analysis', '我的配方', '_待上传', repoSafe(key), `${repoSafe(item.name)}__${repoSafe(item.id)}.json`]; }
async function repoWrite(key, item) {
  if (!repoDir.h || !(await repoPerm(false))) return null;
  const parts = repoPath(key, item); let d = repoDir.h;
  for (const part of parts.slice(0, -1)) d = await d.getDirectoryHandle(part, { create: true });
  const f = await d.getFileHandle(parts[parts.length - 1], { create: true }), w = await f.createWritable();
  await w.write(JSON.stringify({ format: 'fwl.myrecipe/1', key, tool: VERSION, savedFrom: location.pathname.split('/').slice(-3).join('/'), ...item }, null, 1));
  await w.close();
  return parts.join('/');
}
function repoSync() {
  const read = $('#abRepoRead'); if (read) read.disabled = !!repoDir.reading;
  const b = $('#abRepo'); if (!b) return;
  b.textContent = !repoDir.h ? '连接仓库文件夹（保存时顺便存进 git）…' : repoDir.ok ? `仓库文件夹：${repoDir.name} ✓（保存时顺便写进去；点这里换一个）` : `仓库文件夹：${repoDir.name}（要重新允许：点这里）`;
}
async function repoMenu() {
  if (repoDir.h && !repoDir.ok) { if (await repoPerm(true)) { await repoRead({ interactive: true }); return; } }
  await repoPick();
}

// 读取只恢复到当前浏览器，不写仓库。相同编号有差异时保留本地，用户可另加仓库副本。
function repoRecipe(doc) {
  const obj = x => x && typeof x === 'object' && !Array.isArray(x);
  if (!obj(doc) || doc.format !== 'fwl.myrecipe/1' || typeof doc.id !== 'string' || !/^fx[a-z0-9_]+$/i.test(doc.id) || doc.key !== 'my:' + doc.id || typeof doc.name !== 'string') throw new Error('配方标识不完整');
  if (!obj(doc.snap) || doc.snap.kind !== 'combo' || !Array.isArray(doc.snap.layers) || !doc.snap.layers.length || doc.snap.layers.length > 100) throw new Error('图层数据不完整');
  for (const l of doc.snap.layers) if (!obj(l) || !Object.hasOwn(TYPES, l.type) || !obj(l.P) || !obj(l.M) || !obj(l.L)) throw new Error('图层类型或参数不完整');
  if (doc.links != null && (!Array.isArray(doc.links) || doc.links.some(g => !Array.isArray(g) || g.some(x => typeof x !== 'string')))) throw new Error('图层联动数据不完整');
  return { id: doc.id, name: doc.name, created: doc.at || '', updated: doc.at || '', snap: structuredClone(doc.snap), links: structuredClone(doc.links || []), ...(doc.from ? { from: structuredClone(doc.from) } : {}) };
}
function repoRecipeSig(rec) {
  const stable = x => Array.isArray(x) ? x.map(stable) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, stable(x[k])])) : x;
  return JSON.stringify(stable({ name: rec.name, snap: rec.snap, links: rec.links || [] }));
}
async function repoRead({ interactive = false } = {}) {
  if (repoDir.reading) return;
  if (!repoDir.h) { if (interactive) await repoPick(); return; }
  if (!(await repoPerm(interactive))) { if (interactive) flash('请先允许访问仓库文件夹，再点「读取仓库中的我的效果」', true); return; }
  repoDir.reading = true; repoSync();
  let added = 0, same = 0, conflicts = 0, bad = 0;
  try {
    let root;
    try { root = await (await repoDir.h.getDirectoryHandle('analysis')).getDirectoryHandle('我的配方'); }
    catch (e) { if (e.name !== 'NotFoundError') throw e; flash('已连接仓库；里面还没有个人配方。保存效果后会写进去'); return; }
    const latest = new Map();
    async function walk(d, depth, pending = false) {
      const entries = []; for await (const e of d.values()) entries.push(e); entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const e of entries) {
        if (e.kind === 'directory' && depth < 2) { await walk(e, depth + 1, pending || e.name === '_待上传'); continue; }
        if (e.kind !== 'file' || !e.name.endsWith('.json')) continue;
        try {
          const f = await e.getFile(); if (f.size > 4 * 1024 * 1024) throw new Error('配方过大');
          const doc = JSON.parse(await f.text());
          if (typeof doc.key === 'string' && !doc.key.startsWith('my:')) continue; // 旧的单条目个人版本不混进效果库
          const rec = repoRecipe(doc), stamp = String(doc.at || ''), old = latest.get(rec.id);
          if (!old || stamp > old.stamp || (stamp === old.stamp && (Number(pending) > Number(old.pending) || (pending === old.pending && f.lastModified > old.modified)))) latest.set(rec.id, { rec, doc, stamp, pending, modified: f.lastModified });
        } catch (e) { bad++; }
      }
    }
    await walk(root, 0);
    const seen = store.get('repoReadCopies', {});
    for (const { rec, doc } of latest.values()) {
      const sig = repoRecipeSig(rec), local = myAll()[rec.id];
      if (local && repoRecipeSig(local) === sig) { same++; continue; }
      // 读取期间用户正在编辑的同编号效果也视为冲突，不换正在编辑的画面。
      const editing = typeof lib !== 'undefined' && lib.my && lib.my.id === rec.id;
      if (local || editing) {
        const savedCopy = seen[rec.id];
        if (savedCopy && savedCopy.sig === sig && myAll()[savedCopy.id]) { same++; continue; }
        conflicts++;
        // 4.9.4：应用内确认框（askConfirm，79_workbench.js）；没有它时（隔离检查）退回 confirm
        const q = `「${rec.name}」与本浏览器的版本不同或正在打开。`, qn = `保留本浏览器的效果和当前画面，另加一份「${rec.name} · 仓库版本」？取消：这次不读取这一项。`;
        if (!interactive || !(typeof askConfirm === 'function' ? await askConfirm(q, qn, '另加一份', '这次不读') : confirm(q + '\n' + qn))) continue;
        const sourceId = rec.id; let id;
        do { id = 'fx' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); } while (myAll()[id]);
        rec.id = id; rec.name += ' · 仓库版本'; rec.snap.name = rec.name; seen[sourceId] = { sig, id };
      }
      myPut(rec);
      if (!myAll()[rec.id] || repoRecipeSig(myAll()[rec.id]) !== repoRecipeSig(rec)) throw new Error('浏览器保存空间不足，配方仍保留在仓库');
      if (doc.ue && typeof doc.ue.base === 'string' && Array.isArray(doc.ue.layers)) setPackNames('my:' + rec.id, doc.ue.base, doc.ue.layers);
      added++;
    }
    store.set('repoReadCopies', seen); if (added) renderLib();
    flash(`仓库读取完成：新增 ${added} 个效果，已有 ${same} 个${conflicts ? `；${conflicts} 个有差异（本地已保留）` : ''}${bad ? `；${bad} 个文件无法读取` : ''}${!added && !same && !conflicts ? '。仓库中暂无可恢复的我的效果' : ''}`);
  } catch (e) { if (added) renderLib(); flash('读取仓库未完成：' + (e.message || e) + '。本浏览器已有内容保留', true); }
  finally { repoDir.reading = false; repoSync(); }
}
