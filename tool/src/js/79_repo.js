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
  try { if (typeof indexedDB !== 'undefined') { const h = await idbGet('repoDir'); if (h) { repoDir.h = h; repoDir.name = h.name; await repoPerm(false); } } } catch (e) { }
  repoSync();
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
  flash(`已连接仓库文件夹「${h.name}」：以后「保存」会顺便存一份到 analysis/我的配方/，后台脚本推上去`);
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
  const b = $('#abRepo'); if (!b) return;
  b.textContent = !repoDir.h ? '连接仓库文件夹（保存时顺便存进 git）…' : repoDir.ok ? `仓库文件夹：${repoDir.name} ✓（保存时顺便写进去；点这里换一个）` : `仓库文件夹：${repoDir.name}（要重新允许：点这里）`;
}
async function repoMenu() {
  if (repoDir.h && !repoDir.ok) { if (await repoPerm(true)) { flash(`仓库文件夹「${repoDir.name}」可以写了`); return; } }
  await repoPick();
}
