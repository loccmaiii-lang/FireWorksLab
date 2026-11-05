// 烟花工坊 5.0 · 导入模块宿主。dist/fwl-importer.js 由 tool/importer/build-5.0.py 用本文件生成（把导入引擎 HTML 填进占位符）。
// 接口见 tool/importer/API_5.0.md。只挂 window.FWLImporter：不碰页面 DOM（除了一个看不见的引擎 iframe）、不加样式。
// 不需要 8034 / local_http / Python：导出文件夹用浏览器文件夹句柄直接读写，导入前拦截在网页里跑，文件经 GPUECli 分块传进 UE 系统临时目录。
(function () {
  'use strict';
  if (window.FWLImporter && !window.FWLImporter.__mock) return;

  const ENGINE_HTML = /*__ENGINE_HTML__*/'';
  const ENGINE_VERSION = /*__ENGINE_VERSION__*/'';
  const VERSION = /*__MODULE_VERSION__*/'';
  const GPCLI = 'http://127.0.0.1:17780/gpcli';
  const ENDPOINT = '127.0.0.1:17780';
  const PYLIB = '/Script/PythonScriptPlugin.Default__PythonScriptLibrary';
  const GAMEPLAY = '/Script/Engine.Default__GameplayStatics';
  const FORMAT = 'df.firework-resource/1';
  const CHUNK = 1 << 20;          // 阶段 0（方案 7.1）：Chrome 单次 4 MB 都能过；1 MB 一块约 0.5 s，UE 不卡
  const READBACK = 4 << 20;       // UE → 网页一次 4 MB（16 MB 实测也行）
  const RETRY_SEC = 12, ALIVE_SEC = 20;
  const CATEGORIES = { firework: '烟花', tail: '尾缀' };
  const SIZES = { small: '小', medium: '中', large: '大', unclassified: '未分类' };
  const PLATFORMS = { pc: 'PC', mobile: '手机', low: '低配' };
  const PLATFORM_KEY = { pc: 'pc', mobile: 'mobile', low: 'low' };
  const TEX_KIND = { flipbook: '序列贴图', ramp: 'Ramp', cutout: '轮廓图', dissolve: '溶解图' };

  const config = { sandbox: '', lsKey: '' };
  const listeners = { status: new Set(), progress: new Set(), packages: new Set(), log: new Set() };
  const emit = (ev, v) => listeners[ev].forEach(cb => { try { cb(v); } catch (e) { console.error(e); } });
  const fail = (code, text) => Object.assign(new Error(text), { code });
  const nowISO = () => new Date().toISOString();
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ---------- 小工具 ----------
  const enc = new TextEncoder(), dec = new TextDecoder();
  const utf8 = s => enc.encode(s);
  const text = u8 => dec.decode(u8).replace(/^\uFEFF/, '');
  async function sha256(u8) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', u8))].map(x => x.toString(16).padStart(2, '0')).join(''); }
  function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 32766) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32766)); return btoa(s); }
  function unb64(s) { const bin = atob(s), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; }
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  // Python 2.7 / 3 字符串字面量（和导入引擎 pyStr 同一写法）
  const pyJson = v => "json.loads(base64.b64decode('" + b64(utf8(JSON.stringify(v))) + "').decode('utf-8'))";
  const pyStr = s => 'u"' + String(s).replace(/\\/g, '/').replace(/"/g, '\\"').replace(/[\u0080-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')) + '"';
  // 和 store.py 同一修订号：json.dumps(sorted(files), sort_keys=True)（默认分隔符、ensure_ascii）
  function pyAscii(s) { return JSON.stringify(s).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')); }
  const canonicalFiles = files => '[' + [...files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
    .map(f => '{"bytes": ' + f.bytes + ', "path": ' + pyAscii(f.path) + ', "sha256": ' + pyAscii(f.sha256) + '}').join(', ') + ']';
  function safeRelative(value) {
    if (typeof value !== 'string' || value.includes('\\') || value.includes(':')) throw fail('BAD_PATH', '资源路径无效');
    const parts = value.split('/');
    if (!value || value.startsWith('/') || parts.some(x => x === '..' || x === '.')) throw fail('BAD_PATH', '资源路径不能离开交付目录');
    for (const part of parts) {
      if (!part || part.replace(/[ .]+$/, '') !== part || /[<>"|?*\x00-\x1f]/.test(part)) throw fail('BAD_PATH', '资源文件名不适用于 Windows');
      if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i.test(part)) throw fail('BAD_PATH', '资源文件名为保留名称');
    }
    return parts;
  }
  const join = (...xs) => xs.flatMap(x => String(x).split('/')).filter(x => x && x !== '.').join('/');
  const parentOf = p => { const i = p.lastIndexOf('/'); return i < 0 ? '.' : p.slice(0, i); };
  const baseOf = p => p.slice(p.lastIndexOf('/') + 1);
  const pngSize = u8 => u8.length >= 24 && u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4E && u8[3] === 0x47 ? [new DataView(u8.buffer, u8.byteOffset).getUint32(16), new DataView(u8.buffer, u8.byteOffset).getUint32(20)] : null;

  // ---------- 文件夹（外壳给的句柄；本模块不弹选择框）----------
  async function permitted(handle, mode) {
    if (!handle || handle.kind !== 'directory') throw fail('NO_PERMISSION', '没有拿到文件夹');
    if (typeof handle.queryPermission === 'function' && await handle.queryPermission({ mode }) !== 'granted') throw fail('NO_PERMISSION', '文件夹需要允许访问（' + (mode === 'readwrite' ? '读写' : '读取') + '）');
  }
  async function dirAt(root, rel, create = false) {
    let d = root; for (const part of rel ? safeRelative(rel) : []) d = await d.getDirectoryHandle(part, { create }); return d;
  }
  async function fileAt(root, rel) { const parts = safeRelative(rel); const d = await dirAt(root, parts.slice(0, -1).join('/')); return d.getFileHandle(parts[parts.length - 1]); }
  async function readBytes(root, rel) { return new Uint8Array(await (await (await fileAt(root, rel)).getFile()).arrayBuffer()); }
  async function readJSON(root, rel, fallback) { try { return JSON.parse(text(await readBytes(root, rel))); } catch (e) { if (e.name === 'NotFoundError' || e.name === 'TypeMismatchError') return fallback; throw e; } }
  async function exists(root, rel) { try { await fileAt(root, rel); return true; } catch { try { await dirAt(root, rel); return true; } catch { return false; } } }
  async function writeBytes(root, rel, u8) {
    const parts = safeRelative(rel), d = await dirAt(root, parts.slice(0, -1).join('/'), true);
    const w = await (await d.getFileHandle(parts[parts.length - 1], { create: true })).createWritable();
    await w.write(u8); await w.close();     // Chrome 先写交换文件，close 时才替换，单个文件是原子的
  }
  const writeJSON = (root, rel, v, indent = 2) => writeBytes(root, rel, utf8(JSON.stringify(v, null, indent)));
  async function removeEntry(root, rel) { const parts = safeRelative(rel); const d = await dirAt(root, parts.slice(0, -1).join('/')); await d.removeEntry(parts[parts.length - 1], { recursive: true }); }
  async function listFiles(dir, prefix = '', out = []) {
    for await (const [name, h] of dir.entries()) {
      if (h.kind === 'directory') { if (name !== '.workspace') await listFiles(h, prefix + name + '/', out); }
      else out.push(prefix + name);
    }
    return out;
  }

  // ---------- ZIP（烘焙器写的是不压缩的 ZIP；也认 deflate）----------
  async function unzip(blob) {
    const u8 = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(u8.buffer);
    let eocd = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw fail('BAD_ZIP', '不是有效的 ZIP');
    const count = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true); const out = [];
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw fail('BAD_ZIP', 'ZIP 目录损坏');
      const method = dv.getUint16(p + 10, true), crc = dv.getUint32(p + 16, true), csize = dv.getUint32(p + 20, true), size = dv.getUint32(p + 24, true);
      const nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), local = dv.getUint32(p + 42, true);
      const ext = dv.getUint32(p + 38, true), name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      p += 46 + nlen + xlen + clen;
      if (name.endsWith('/')) { out.push({ name, dir: true }); continue; }
      if (((ext >>> 16) & 0xF000) === 0xA000) throw fail('BAD_ZIP', '资源包含链接：' + name);
      const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
      let data = u8.subarray(start, start + csize);
      if (method === 8) data = new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      else if (method !== 0) throw fail('BAD_ZIP', '不支持的 ZIP 压缩方式：' + name);
      if (data.length !== size || crc32(data) !== crc) throw fail('BAD_ZIP', 'ZIP 文件校验失败：' + name);
      out.push({ name, data });
    }
    return out;
  }

  // ---------- 导出文件夹：发布（原 tool/local_delivery/store.py + layout.py 搬进网页，格式不变）----------
  function classification(metadata) {
    const v = metadata.classification || {};
    if (typeof v !== 'object' || Array.isArray(v)) throw fail('BAD_META', '资源分类格式不正确');
    const category = v.category || 'firework', size = v.size || 'unclassified';
    if (!CATEGORIES[category] || !SIZES[size]) throw fail('BAD_META', '资源分类必须使用已定义的类型与尺寸');
    return { category, size };
  }
  let publishing = Promise.resolve();
  function publish(root, blob, name, metadata) {
    const run = publishing.then(() => publishNow(root, blob, name, metadata));
    publishing = run.catch(() => {});
    return run;
  }
  async function publishNow(root, blob, name, metadata) {
    await permitted(root, 'readwrite');
    if (!(blob instanceof Blob)) throw fail('BAD_ARGS', '交付资源请求无效');
    metadata = { ...(metadata || {}) };
    const group = classification(metadata);
    name = String(name || '').replace(/\.zip$/i, ''); safeRelative(name);
    if (name.includes('/')) throw fail('BAD_ARGS', '包名不能含目录');
    const entries = await unzip(blob);
    if (entries.length > 10000 || entries.reduce((a, e) => a + (e.data ? e.data.length : 0), 0) > 2 * 1024 ** 3) throw fail('BAD_ZIP', '资源包过大');
    const files = [], bytesOf = new Map(), seen = new Set();
    for (const e of entries) {
      if (e.dir) { safeRelative(e.name.replace(/\/$/, '')); continue; }
      safeRelative(e.name); const key = e.name.toLowerCase();
      if (seen.has(key)) throw fail('BAD_ZIP', '资源包含重名文件或链接');
      seen.add(key);
      if (['workspace-resource.json', 'workspace-thumbnail.png'].includes(baseOf(e.name))) throw fail('BAD_ZIP', '资源包不能覆盖交付索引');
      files.push({ path: e.name, bytes: e.data.length, sha256: await sha256(e.data) }); bytesOf.set(e.name, e.data);
    }
    const packages = [];
    for (const f of files) {
      if (!/(^|\/)cascade(_mobile|_low)?\.json$/.test(f.path)) continue;
      const conf = JSON.parse(text(bytesOf.get(f.path)));
      if (conf.format !== 'fwl.cascade/1' || !conf.emitters || !conf.emitters.length) throw fail('BAD_ZIP', '不是完整的 Cascade 资源配置：' + f.path);
      for (const t of [...Object.values(conf.textures || {}), ...Object.values(conf.extras || {})]) {
        if (!t || typeof t !== 'object' || !t.file) continue;
        safeRelative(t.file); const ref = join(parentOf(f.path), t.file);
        if (!seen.has(ref.toLowerCase())) throw fail('BAD_ZIP', '配置引用缺文件：' + ref);
      }
      const configFile = baseOf(f.path);
      packages.push({ relativeDirectory: parentOf(f.path), configFile, platform: configFile.includes('_mobile') ? 'mobile' : configFile.includes('_low') ? 'low' : 'pc', name: conf.name || name });
    }
    if (!packages.length) throw fail('BAD_ZIP', '资源包中没有完整的 cascade.json 配置');
    const revision = (await sha256(utf8(canonicalFiles(files)))).slice(0, 20);
    const resourceId = (await sha256(utf8(name.toLowerCase()))).slice(0, 16), deliveryId = resourceId + '-' + revision;
    const index = await readIndex(root);
    if (index.some(r => r.deliveryId === deliveryId)) {
      const data = await receipt(root, deliveryId);
      await archive(root, blob, data);
      return { ...(await receipt(root, deliveryId)), pkgId: deliveryId };
    }
    const relative = [CATEGORIES[group.category], SIZES[group.size], name].join('/') + '/revisions/' + revision;
    // 修订号由内容决定：同号的残留目录（上次写到一半）内容相同，删掉重写；不会删别的修订。
    if (await exists(root, relative)) await removeEntry(root, relative);
    let archived = null;
    try {
      const { written, platformPackages } = await arrange(root, relative, files, packages, bytesOf);
      const data = { format: FORMAT, resourceId, revisionId: revision, deliveryId, name, createdAt: nowISO(), status: 'complete',
        relativeDirectory: relative, files: written, sourceFiles: files, packages: platformPackages, metadata, classification: group,
        thumbnail: { status: 'missing', reason: '尚未生成同修订引擎回放缩略图' } };
      const thumb = metadata.thumbnailData; delete metadata.thumbnailData;
      if (thumb) {
        if (typeof thumb !== 'string' || !thumb.startsWith('data:image/png;base64,')) throw fail('BAD_META', '缩略图格式无效');
        const pixels = unb64(thumb.split(',', 2)[1]);
        if (pixels.length > 8 * 1024 ** 2 || !pngSize(pixels)) throw fail('BAD_META', '缩略图格式无效');
        await writeBytes(root, relative + '/workspace-thumbnail.png', pixels);
        data.files.push({ path: 'workspace-thumbnail.png', bytes: pixels.length, sha256: await sha256(pixels) });
        data.thumbnail = { status: 'ready', file: 'workspace-thumbnail.png', source: 'baker-final-product-replay', revisionId: revision };
      }
      await writeJSON(root, relative + '/workspace-resource.json', data);
      archived = await archive(root, blob, data);
      index.push({ deliveryId, resourceId, revisionId: revision, relativeDirectory: relative, name });
      await writeJSON(root, 'workspace-resources.json', { format: FORMAT, resources: index });
    } catch (e) {
      try { if (archived) { await removeEntry(root, archived.path).catch(() => {}); await writeJSON(root, archived.log, { exports: archived.previous }); } }
      finally { await removeEntry(root, relative).catch(() => {}); }
      throw e;
    }
    const r = await receipt(root, deliveryId);
    refreshSoon(root);
    return { ...r, pkgId: deliveryId };
  }
  // 每个平台放完整配置和引用贴图（原导入器禁止跨包目录引用，共用贴图各放一份）；其余文件放「资料」。
  async function arrange(root, base, files, packages, bytesOf) {
    const by = new Map(files.map(f => [f.path, f])), consumed = new Set(), written = new Map(), platformPackages = [];
    async function copy(original, rel) {
      const item = by.get(original), key = rel.toLowerCase();
      if (written.has(key)) { if (written.get(key).sha256 !== item.sha256) throw fail('BAD_ZIP', '平台分类产生重名文件：' + rel); return; }
      await writeBytes(root, base + '/' + rel, bytesOf.get(original));
      if (await sha256(await readBytes(root, base + '/' + rel)) !== item.sha256) throw fail('WRITE_FAILED', '平台文件写入校验失败：' + rel);
      written.set(key, { ...item, path: rel });
    }
    for (const pkg of packages) {
      const originalDir = pkg.relativeDirectory, outputDir = join(PLATFORMS[pkg.platform], originalDir), configName = join(originalDir, pkg.configFile);
      const conf = JSON.parse(text(bytesOf.get(configName))), names = new Set([configName]);
      for (const t of [...Object.values(conf.textures || {}), ...Object.values(conf.extras || {})]) if (t && typeof t === 'object' && t.file) names.add(join(originalDir, t.file));
      for (const n of [...names].sort()) await copy(n, join(outputDir, originalDir === '.' ? n : n.slice(originalDir.length + 1)));
      names.forEach(n => consumed.add(n));
      platformPackages.push({ ...pkg, relativeDirectory: outputDir });
    }
    for (const f of files) if (!consumed.has(f.path)) await copy(f.path, '资料/' + f.path);
    return { written: [...written.values()].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0), platformPackages };
  }
  async function archive(root, blob, data) {
    const logRel = '.workspace/exports/' + data.resourceId + '.json';
    const previous = (await readJSON(root, logRel, { exports: [] })).exports || [];
    const folder = data.relativeDirectory.split('/revisions/')[0] + '/ZIP';
    const platforms = [...new Set(data.packages.map(p => p.platform))].sort((a, b) => ['pc', 'mobile', 'low'].indexOf(a) - ['pc', 'mobile', 'low'].indexOf(b));
    const prefix = data.name + '_' + platforms.map(p => ({ pc: 'PC', mobile: 'Mobile', low: 'Low' })[p]).join('-') + '_v';
    const versions = [];
    try { for await (const [n] of (await dirAt(root, folder)).entries()) { const m = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)\\.zip$', 'i').exec(n); if (m) versions.push(+m[1]); } } catch {}
    const sequence = Math.max(0, ...previous.map(x => x.sequence), ...versions) + 1;
    const path = folder + '/' + prefix + String(sequence).padStart(3, '0') + '.zip';
    if (await exists(root, path)) throw fail('WRITE_FAILED', 'ZIP 留档已存在，不覆盖：' + path);
    const raw = new Uint8Array(await blob.arrayBuffer()), digest = await sha256(raw);
    await writeBytes(root, path, raw);
    if (await sha256(await readBytes(root, path)) !== digest) { await removeEntry(root, path).catch(() => {}); throw fail('WRITE_FAILED', 'ZIP 留档写入校验失败'); }
    const record = { sequence, deliveryId: data.deliveryId, revisionId: data.revisionId, relativePath: path, bytes: raw.length, sha256: digest, platforms, createdAt: nowISO() };
    await writeJSON(root, logRel, { exports: [...previous, record] });
    return { path, log: logRel, previous };
  }
  async function readIndex(root) {
    const idx = await readJSON(root, 'workspace-resources.json', null);
    if (idx === null) return [];
    if (!idx || !Array.isArray(idx.resources)) throw fail('NOT_EXPORT_ROOT', 'workspace-resources.json 格式不对，这不是烟花工坊的导出文件夹');
    return idx.resources;
  }
  // 读一个修订的回执；verify = 'sha' 核对每个文件的 sha256，'size' 只核对大小
  async function receipt(root, deliveryId, verify = 'sha') {
    const r = (await readIndex(root)).find(x => x.deliveryId === deliveryId);
    if (!r) throw fail('NOT_FOUND', '交付记录不存在');
    safeRelative(r.relativeDirectory);
    const data = await readJSON(root, r.relativeDirectory + '/workspace-resource.json', null);
    if (!data) throw fail('FILES_CHANGED', '资源已缺失或变更：workspace-resource.json');
    const missing = [], changed = [];
    for (const f of data.files || []) {
      const rel = r.relativeDirectory + '/' + f.path; safeRelative(f.path);
      try {
        const file = await (await fileAt(root, rel)).getFile();
        if (file.size !== f.bytes || (verify === 'sha' && await sha256(new Uint8Array(await file.arrayBuffer())) !== f.sha256)) changed.push(f.path);
      } catch { missing.push(f.path); }
    }
    data.directory = r.relativeDirectory;
    data.fileCheck = { ok: !missing.length && !changed.length, missing, changed };
    data.importReceipt = await readJSON(root, '.workspace/receipts/' + deliveryId + '.json', null);
    const own = ((await readJSON(root, '.workspace/exports/' + data.resourceId + '.json', { exports: [] })).exports || []).filter(x => x.deliveryId === deliveryId);
    data.exportCount = own.length; data.latestExport = own.length ? { ...own[own.length - 1], path: own[own.length - 1].relativePath, status: await exists(root, own[own.length - 1].relativePath) ? 'saved' : 'missing' } : null;
    if (verify === 'sha' && !data.fileCheck.ok) throw fail('FILES_CHANGED', '资源已缺失或变更：' + [...missing, ...changed].slice(0, 3).join('、'));
    return data;
  }

  // ---------- 导入前拦截（原 tool/local_delivery/fx_gate.py，规则逐条照搬；和烘焙器 63_gate.js 同一套）----------
  const GATE = { TIER: { M: 3, H: 6 }, MAX_ALIVE: 50, MOBILE_TEX: 1024, PREFIX: 'T_EFX_FireWorks_', REGISTRY: '.workspace/texture-fingerprints.json', REUSE: ['ramp', 'cutout'] };
  const assetOf = t => t.asset || baseOf(String(t.file || '')).replace(/\.[^.]*$/, '');
  function checkConfig(name, j, png) {
    const bad = [], d = parentOf(name) === '.' ? '' : parentOf(name) + '/', tag = baseOf(name);
    const mobile = tag.includes('_mobile') || j.platform === 'mobile';
    const texs = Object.entries(j.textures || {}).filter(([, t]) => t && typeof t === 'object' && !Array.isArray(t) && t.file);
    const ems = (j.emitters || []).filter(e => e.enabled !== false);
    for (const [, t] of texs) {
      const got = png[d + t.file];
      if (!got) bad.push(`${tag}：配置引用的贴图不在包里：${t.file}`);
      else if (t.sha256 && t.sha256 !== got.sha256) bad.push(`${tag}：${t.file} 的内容和配置里记的 sha256 不一致（包被改过）`);
    }
    // 用户 2026-10-18 永远的禁忌：任何贴图都不许要求 NeverStream；PC / 手机都查
    for (const [k, t] of texs) if (Object.keys(t).some(kk => /^never_?stream$/i.test(kk) && t[kk])) bad.push(`${tag}：贴图 ${k} 要求 NeverStream，项目永远不勾（会常驻、不能流送）`);
    const der = j.derived || {};
    if (der.from) {
      const stem = GATE.PREFIX + der.from, wrong = texs.map(([, t]) => assetOf(t)).filter(a => !a.startsWith(stem));
      if (wrong.length) bad.push(`${tag}：派生资源开了新贴图名 ${wrong.join('、')}（应沿用 ${stem}_…，规范 §2）`);
    }
    if (!mobile) return bad;
    const nm = String(j.name || ''), tier = j.tier;
    if (/_HD(_|$)/i.test(nm) || /_Mobile(_|$)/i.test(nm)) bad.push(`${tag}：手机包名字「${nm}」带 _HD / _Mobile（规范 §2：<名>_H / _M）`);
    if (!(tier in GATE.TIER)) bad.push(`${tag}：档位「${tier !== undefined && tier !== null ? tier : '没写'}」不是 H / M（规范 §2，不做 _L）`);
    else if (!nm.endsWith('_' + tier)) bad.push(`${tag}：手机包名字「${nm}」不是以 _${tier} 结尾`);
    const lim = GATE.TIER[tier] || GATE.TIER.M;
    if (ems.length > lim) bad.push(`${tag}：发射器 ${ems.length} 个，超过 _${tier in GATE.TIER ? tier : 'M'} 上限 ${lim}（规范 §6）`);
    const gpu = ems.filter(e => e.gpu).map(e => e.name);
    if (gpu.length) bad.push(`${tag}：有 GPU 发射器 ${gpu.join('、')}（手游不能有 GPU）`);
    const noAlive = ems.filter(e => e.max_alive === undefined || e.max_alive === null).map(e => e.name);
    const over = ems.filter(e => e.max_alive !== undefined && e.max_alive !== null && Number(e.max_alive) > GATE.MAX_ALIVE).map(e => `${e.name} ${e.max_alive}`);
    if (noAlive.length) bad.push(`${tag}：发射器没写 max_alive：${noAlive.join('、')}`);
    if (over.length) bad.push(`${tag}：同时活着的粒子超过 ${GATE.MAX_ALIVE}：${over.join('、')}`);
    const textures = j.textures || {}, mats = j.materials || {};
    const flip = k => textures[k] && typeof textures[k] === 'object' && textures[k].class === 'flipbook';
    const seq = [];
    for (const e of ems) {
      const m = ((mats[e.material] || {}).textures) || {};
      if (Object.values(m).some(flip)) { const r = e.required || {}, d0 = Number(r.delay_s || 0); seq.push([e.name, d0, d0 + Number(r.duration_s || 0)]); }
    }
    let most = 0, who = [];
    for (const [, a] of seq) { const live = seq.filter(s => s[1] <= a + 1e-6 && s[2] > a + 1e-6); if (live.length > most) { most = live.length; who = live.map(s => s[0]); } }
    if (most > 1) bad.push(`${tag}：同一时刻有 ${most} 张大序列（${who.join(' + ')}）；手游中低配只能 1 张（规范 §6）`);
    const hd = texs.map(([, t]) => assetOf(t)).filter(a => /_HD(_|$)/i.test(a));
    if (hd.length) bad.push(`${tag}：手机材质引用了 _HD 贴图 ${hd.join('、')}（规范 §3）`);
    const big = [];
    for (const [, t] of texs) { const s = (png[d + t.file] || {}).size; if (s && Math.max(...s) > GATE.MOBILE_TEX) big.push(`${assetOf(t)}（${s[0]}×${s[1]}）`); }
    if (big.length) bad.push(`${tag}：手机贴图超过 ${GATE.MOBILE_TEX}：${big.join('、')}（新出一张 1024，或复制 PC 那张到手游目录、最大尺寸设 1024）`);
    return bad;
  }
  async function loadRegistry(root) {
    const reg = await readJSON(root, GATE.REGISTRY, null);
    if (!reg) return { format: 'df.texture-fingerprints/1', textures: {} };
    // 旧登记把资源写成修订号；只通过交付索引恢复归属，不按贴图名猜。
    const choices = {};
    for (const r of await readIndex(root).catch(() => [])) if (r.revisionId && r.name) (choices[r.revisionId] = choices[r.revisionId] || new Set()).add(r.name);
    for (const rec of Object.values(reg.textures || {})) if (!rec.resourceName && choices[rec.resource] && choices[rec.resource].size === 1) rec.resourceName = [...choices[rec.resource]][0];
    reg.textures = reg.textures || {};
    return reg;
  }
  function checkRegistry(classes, pngByAsset, registry, source, resourceName, iterationOf) {
    const bad = [], info = [], known = registry.textures || {};
    const proof = iterationOf && typeof iterationOf === 'object' ? iterationOf : {};
    let approved = proof.sourceKey === source && (proof.deliveryName || proof.resourceName) === resourceName ? proof.assets || [] : [];
    if (!Array.isArray(approved)) approved = [];
    const bySha = {};
    for (const [a, v] of Object.entries(known)) (bySha[v.sha256] = bySha[v.sha256] || []).push(a);
    for (const [a, v] of Object.entries(pngByAsset)) {
      const k = known[a], sameSource = !!(k && k.source && source && k.source === source);
      const item = { file: a + '.png', before: k ? k.sha256 : undefined, after: v.sha256, sourceKey: (k && k.source) || '', resource: (k && k.resourceName) || '' };
      const norm = v => v === undefined ? null : v;
      const explicit = approved.some(x => x && typeof x === 'object' && Object.entries(item).every(([key, val]) => norm(x[key]) === norm(val)));
      if (k && k.sha256 !== v.sha256 && !sameSource && !explicit) bad.push(`${a}：和已登记的贴图撞名但内容不同（那份来自 ${k.resource || k.source}）`);
      const same = (bySha[v.sha256] || []).filter(x => x !== a);
      if (same.length && !k) {
        if (GATE.REUSE.includes(classes[a])) info.push(`${a}：内容和已登记的 ${same[0]} 相同，导入器会复用那张`);
        else bad.push(`${a}：内容和已登记的 ${same[0]} 相同（规范 §3 同一内容只留一份）：改用 ${same[0]}`);
      }
    }
    return { bad, info };
  }
  async function gateCheck(root, deliveryId) {
    const r = (await readIndex(root)).find(x => x.deliveryId === deliveryId);
    if (!r) throw fail('NOT_FOUND', '交付记录不存在');
    const files = {};
    for (const p of await listFiles(await dirAt(root, r.relativeDirectory))) files[p] = await readBytes(root, r.relativeDirectory + '/' + p);
    const png = {};
    for (const [f, d] of Object.entries(files)) if (/\.png$/i.test(f)) png[f] = { sha256: await sha256(d), size: pngSize(d) };
    const bad = [], cfgs = [];
    for (const f of Object.keys(files).sort()) {
      if (!/(^|\/)cascade(_mobile(_h)?|_low)?\.json$/.test(f)) continue;
      let j; try { j = JSON.parse(text(files[f])); } catch (e) { bad.push(`${f}：不是 JSON（${e.message}）`); continue; }
      cfgs.push([f, j]); bad.push(...checkConfig(f, j, png));
    }
    if (!cfgs.length) bad.push('包里没有 cascade*.json');
    const classes = {}, byAsset = {};
    for (const [f, j] of cfgs) {
      const d = parentOf(f) === '.' ? '' : parentOf(f) + '/';
      for (const t of Object.values(j.textures || {})) if (t && typeof t === 'object' && t.file && png[d + t.file]) { const a = assetOf(t); classes[a] = t.class; byAsset[a] = png[d + t.file]; }
    }
    const doc = files['workspace-resource.json'] ? JSON.parse(text(files['workspace-resource.json'])) : {};
    let exported = files['workspace-export.json'] ? JSON.parse(text(files['workspace-export.json'])) : {};
    if (exported.format !== 'df.firework-export/1') exported = {};
    const metadata = files['workspace-resource.json'] ? doc.metadata || {} : exported;
    const resourceName = files['workspace-resource.json'] ? doc.name || '' : exported.resourceName || '';
    const source = metadata.sourceKey || '';
    const registry = await loadRegistry(root);
    const reg = checkRegistry(classes, byAsset, registry, source, resourceName, metadata.iterationOf);
    const textures = {}; for (const [a, v] of Object.entries(byAsset)) textures[a] = { ...v, class: classes[a] };
    return { ok: !(bad.length || reg.bad.length), problems: [...bad, ...reg.bad], info: reg.info, configs: cfgs.map(([f]) => f), textures, source, resourceName, package: r.relativeDirectory, registry };
  }
  async function gateRegister(root, result, packageName, proofs) {
    const reg = await loadRegistry(root), now = nowISO();
    for (const [a, v] of Object.entries(result.textures)) {
      const old = reg.textures[a];
      const sameResource = !!(old && result.resourceName && old.resourceName && old.resourceName.toLowerCase() === result.resourceName.toLowerCase());
      if (!old || sameResource || (old.source && old.source === result.source))
        reg.textures[a] = { sha256: v.sha256, size: v.size, class: v.class, source: result.source || '', resource: packageName, resourceName: result.resourceName || '', first_seen: old ? old.first_seen || now : now, updated_at: now };
    }
    reg.ueProofs = { ...(reg.ueProofs || {}), ...(proofs || {}) };
    await writeJSON(root, GATE.REGISTRY, reg, 1);
    return reg;
  }

  // ---------- UE（GPUECli，HTTP 直连；Content-Type 必须是 text/plain，OPTIONS 预检 GPUECli 回 404）----------
  async function ueCall(body, timeoutMs = 30000) {
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(GPCLI + '/object/call', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body), signal: ctrl.signal });
      return await r.json();
    } catch (e) { throw fail('UE_DISCONNECTED', e && e.name === 'AbortError' ? 'UE 在 ' + Math.round(timeoutMs / 1000) + ' 秒内没有响应' : 'UE 未连接：' + ENDPOINT + ' 没有响应（UE 编辑器开着吗？）'); }
    finally { clearTimeout(timer); }
  }
  // 逐字扫描 Output="…"：原导入器的正则在 8 MB 以上的输出会栈溢出（阶段 0 实测）
  function logLines(d) {
    const s = (d && d.out_LogOutput) || '', lines = []; let i = 0;
    while ((i = s.indexOf('Output="', i)) >= 0) {
      i += 8; const parts = []; let j = i;
      while (j < s.length && s[j] !== '"') {
        if (s[j] === '\\') { const c = s[j + 1]; parts.push(c === 'n' ? '\n' : c === 't' ? '\t' : c); j += 2; }
        else { const q = s.indexOf('"', j), b = s.indexOf('\\', j), e = Math.min(q < 0 ? s.length : q, b < 0 ? s.length : b); parts.push(s.slice(j, e)); j = e; }
      }
      lines.push(parts.join('')); i = j + 1;
    }
    return lines;
  }
  async function uePy(code, timeoutMs = 120000) {
    const r = await ueCall({ path: PYLIB, function: 'ExecutePythonCommandEx', args: {
      PythonCommand: '# -*- coding: utf-8 -*-\nimport unreal, sys, io, os, json, base64, hashlib\n' + code, ExecutionMode: 'ExecuteFile', FileExecutionScope: 'Private' } }, timeoutMs);
    const d = (r && r.data) || {};
    if (d.return_value !== 'True') throw fail('UE_PYTHON', 'UE Python 出错：' + String(d.out_CommandResult || JSON.stringify(r)).slice(-400));
    return logLines(d);
  }
  const tagged = (lines, tag) => { const l = lines.find(x => x.startsWith(tag)); if (l === undefined) throw fail('UE_PYTHON', '没拿到 UE 输出 ' + tag); return l.slice(tag.length); };

  // 连接状态：打开就连，断了 12 秒后自动重试；连着时 20 秒探一次（导入进行中不探）
  const conn = { ue: 'checking', detail: '正在连接 UE…', lastConnectedAt: null, retryAt: 0, timer: null, probing: null };
  let busy = false, opLock = null;
  function status() {
    return { ue: conn.ue, detail: conn.detail, busy, endpoint: ENDPOINT, lastConnectedAt: conn.lastConnectedAt,
      retryInSec: conn.ue === 'disconnected' ? Math.max(0, Math.ceil((conn.retryAt - Date.now()) / 1000)) : null };
  }
  function setConn(ue, detail) { const changed = ue !== conn.ue || detail !== conn.detail; conn.ue = ue; conn.detail = detail; if (ue === 'connected') conn.lastConnectedAt = nowISO(); if (changed) emit('status', status()); }
  function schedule(sec) { clearTimeout(conn.timer); conn.retryAt = Date.now() + sec * 1000; conn.timer = setTimeout(() => probe().catch(() => {}), sec * 1000); }
  function probe() {
    if (conn.probing) return conn.probing;
    if (typeof fetch !== 'function') { setConn('unavailable', '这个浏览器不能连 UE（请用 Chrome / Edge）'); return Promise.resolve(status()); }
    conn.probing = (async () => {
      if (busy) { schedule(ALIVE_SEC); return status(); }
      try {
        const r = await ueCall({ path: GAMEPLAY, function: 'GetPlatformName' }, 5000);
        if (r && r.success) { setConn('connected', '已连接 UE（' + ((r.data && r.data.return_value) || '本机') + '）'); schedule(ALIVE_SEC); }
        else { setConn('disconnected', 'UE 回应异常：' + String((r && (r.message || r.errorCode)) || '').slice(0, 80)); schedule(RETRY_SEC); }
      } catch (e) { setConn('disconnected', e.message); schedule(RETRY_SEC); }
      return status();
    })().finally(() => { conn.probing = null; });
    return conn.probing;
  }
  async function reconnect() { clearTimeout(conn.timer); if (conn.ue !== 'connected') setConn('checking', '正在连接 UE…'); return probe(); }
  async function needUE() { if (conn.ue !== 'connected') await probe(); if (conn.ue !== 'connected') throw fail('UE_DISCONNECTED', conn.detail); }

  // UE 系统临时目录（不在 UE 工程里）；用户名带中文也按 unicode 处理
  let ueTempRoot = null;
  async function ueTemp() {
    if (ueTempRoot) return ueTempRoot;
    const out = tagged(await uePy(`import tempfile
t = tempfile.gettempdir()
if not isinstance(t, unicode): t = t.decode(sys.getfilesystemencoding() or 'mbcs')
print('FWLTEMP:' + json.dumps(os.path.join(t, u'fwl50').replace(u'\\\\', u'/')))
`, 30000), 'FWLTEMP:');
    ueTempRoot = JSON.parse(out);
    return ueTempRoot;
  }
  // 把一个平台目录的文件传进 UE 临时目录；内容没变（清单一致）就跳过。返回实际传了多少字节。
  async function uploadDir(target, files, onChunk) {
    const manifest = Object.fromEntries(files.map(f => [f.name, f.sha256]));
    const same = tagged(await uePy(`d = ${pyStr(target)}
m = os.path.join(d, u'.fwl50-manifest.json')
ok = False
if os.path.isfile(m):
 try: ok = json.loads(io.open(m, encoding='utf-8').read()) == ${pyJson(manifest)}
 except Exception: ok = False
print('FWLSAME:' + json.dumps(ok))
`, 30000), 'FWLSAME:');
    if (JSON.parse(same)) return 0;
    await uePy(`import shutil
d = ${pyStr(target)}
assert u'/fwl50/' in d.replace(u'\\\\', u'/'), 'refuse'
if os.path.isdir(d): shutil.rmtree(d)
os.makedirs(d)
`, 30000);
    let sent = 0; const total = files.reduce((a, f) => a + f.data.length, 0);
    for (const f of files) {
      for (let i = 0; i < f.data.length || i === 0; i += CHUNK) {
        const part = f.data.subarray(i, i + CHUNK);
        await uePy(`import base64
p = os.path.join(${pyStr(target)}, ${pyStr(f.name)})
if not os.path.isdir(os.path.dirname(p)): os.makedirs(os.path.dirname(p))
o = open(p, '${i ? 'ab' : 'wb'}'); o.write(base64.b64decode('${b64(part)}')); o.close()
`, 60000);
        sent += part.length; if (onChunk) onChunk(sent, total, f.name);
        if (!f.data.length) break;
      }
    }
    const check = JSON.parse(tagged(await uePy(`import hashlib
d = ${pyStr(target)}
want = ${pyJson(manifest)}
bad = []
for n, h in want.items():
 s = hashlib.sha256(); f = open(os.path.join(d, n), 'rb')
 while True:
  b = f.read(1 << 20)
  if not b: break
  s.update(b)
 f.close()
 if s.hexdigest() != h: bad.append(n)
if not bad: io.open(os.path.join(d, u'.fwl50-manifest.json'), 'w', encoding='utf-8').write(unicode(json.dumps(want)))
print('FWLCHECK:' + json.dumps(bad))
`, 120000), 'FWLCHECK:'));
    if (check.length) throw fail('UPLOAD_FAILED', '传进 UE 临时目录的文件校验不一致：' + check.join('、'));
    return sent;
  }
  async function ueRemove(target) {
    await uePy(`import shutil
d = ${pyStr(target)}
assert u'/fwl50/' in d.replace(u'\\\\', u'/'), 'refuse'
if os.path.isdir(d): shutil.rmtree(d)
`, 60000).catch(() => {});
  }

  // ---------- 导入引擎（原导入器，跑在一个看不见的 iframe 里）----------
  const HOST_KEY = 'fwl50engine_' + Math.random().toString(36).slice(2);
  let engineWin = null, enginePromise = null, current = null;   // current = { root, packages: Map }
  const dirMap = new Map();          // UE 临时目录 → { deliveryId }
  const gateInfo = new Map();        // deliveryId → 最近一次拦截的 info
  let activeImport = null;           // { deliveryId, backupDir, backups: [] }
  function engine() {
    if (enginePromise) return enginePromise;
    if (!ENGINE_HTML) return Promise.reject(fail('NO_ENGINE', '导入引擎没有打包进来（请用 build-5.0.py 生成的 dist/fwl-importer.js）'));
    enginePromise = new Promise((resolve, reject) => {
      const hosts = window.__FWL50_HOSTS = window.__FWL50_HOSTS || {};
      const timer = setTimeout(() => reject(fail('NO_ENGINE', '导入引擎 20 秒没有就绪')), 20000);
      hosts[HOST_KEY] = {
        sandbox: config.sandbox, lsKey: config.lsKey || (config.sandbox ? 'fwl50.importer.sandbox.v1' : 'fwl50.importer.v1'),
        engineReady(win) { clearTimeout(timer); engineWin = win; resolve(win.__fwl50Engine); },
        onLog(message, kind) { emit('log', { at: nowISO(), text: message, kind }); },
        gate: hostGate, saveBackup: hostBackup,
      };
      const f = document.createElement('iframe');
      f.name = HOST_KEY; f.title = '烟花工坊导入引擎'; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true');
      f.style.cssText = 'position:fixed;left:-10000px;top:0;width:1200px;height:800px;border:0;opacity:0;pointer-events:none;';
      f.srcdoc = ENGINE_HTML;
      (document.body || document.documentElement).appendChild(f);
    });
    enginePromise.catch(() => { enginePromise = null; });
    return enginePromise;
  }
  async function hostGate(directory, register, proofs) {
    const entry = dirMap.get(String(directory).replace(/\\/g, '/').replace(/\/+$/, ''));
    if (!entry || !current) throw new Error('这个目录不是烟花工坊传进 UE 的交付包：' + directory);
    const result = await gateCheck(current.root, entry.deliveryId);
    gateInfo.set(entry.deliveryId, result.info);
    if (register && result.ok) { const reg = await gateRegister(current.root, result, entry.packageName, proofs); result.registry = reg; }
    return result;
  }
  async function hostBackup(it, backup) {
    if (!activeImport || !activeImport.backupDir) throw new Error('要覆盖 UE 里已有的资产，但没有选备份文件夹；资产没有改动');
    activeImport.backups.push(await copyBackup(activeImport.backupDir, it, backup));
  }
  async function copyBackup(backupDir, it, backup) {
    const dirName = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-') + '_' + it.as;
    const records = [];
    for (const row of backup.assets || []) {
      for (const kind of ['original', 'before_update']) {
        const src = row[kind]; if (!src) continue;
        const info = JSON.parse(tagged(await uePy(`import hashlib
p = ${pyStr(src)}
s = hashlib.sha256(); f = open(p, 'rb')
while True:
 b = f.read(1 << 20)
 if not b: break
 s.update(b)
f.close()
print('FWLSTAT:' + json.dumps({'size': os.path.getsize(p), 'sha': s.hexdigest()}))
`, 60000), 'FWLSTAT:'));
        const parts = [];
        for (let off = 0; off < info.size; off += READBACK) {
          const piece = tagged(await uePy(`import base64
f = open(${pyStr(src)}, 'rb'); f.seek(${off}); b = f.read(${READBACK}); f.close()
print('FWLB64:' + base64.b64encode(b))
`, 120000), 'FWLB64:');
          parts.push(unb64(piece));
        }
        const all = new Uint8Array(info.size); let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
        if (await sha256(all) !== info.sha) throw new Error('备份读回校验失败：' + baseOf(src.replace(/\\/g, '/')));
        const name = baseOf(src.replace(/\\/g, '/')) + '.bak';   // .uasset.bak：误放进工程目录 UE 也不会当资产读
        await writeBytes(backupDir, dirName + '/' + name, all);
        if (await sha256(await readBytes(backupDir, dirName + '/' + name)) !== info.sha) throw new Error('备份写入校验失败：' + name);
        records.push({ key: row.key, pkg: row.pkg, kind, file: name, bytes: info.size, sha256: info.sha });
      }
    }
    await writeJSON(backupDir, dirName + '/manifest.json', { format: 'fwl50.asset-backup/1', createdAt: nowISO(), asName: it.as, records });
    // 备份已核对写进用户的文件夹，UE 临时目录里的副本删掉
    await uePy(`for p in ${pyJson((backup.assets || []).flatMap(r => [r.original, r.before_update]).filter(Boolean))} + [${pyStr(backup.manifest || '')}]:
 if p and os.path.isfile(p) and u'/fwl50/' in p.replace(u'\\\\', u'/'): os.remove(p)
`, 30000).catch(() => {});
    return { dir: dirName + '/', files: records.length };
  }

  // ---------- 包列表 ----------
  const thumbs = new Map();
  function resetRoot(root) {
    if (current && current.root === root) return;
    for (const u of thumbs.values()) try { URL.revokeObjectURL(u); } catch {}
    thumbs.clear(); current = { root, packages: new Map() };
  }
  function rowsDone(rows) { return rows.filter(r => ['done', 'pending', 'saved'].includes(r.state)); }
  function importState(receiptRows) {
    if (!receiptRows || !receiptRows.length) return null;
    const done = rowsDone(receiptRows).length, failed = receiptRows.filter(r => r.state === 'failed').length;
    return done && !failed ? '已导入' : done ? '部分导入' : failed ? '导入失败' : null;
  }
  const kindOf = (key, spec) => key === 'ps' ? '粒子系统' : key.startsWith('mat:') ? '材质实例' : TEX_KIND[((spec.textures || {})[key.slice(4)] || {}).class] || '贴图';
  async function previewAssets(data) {
    let E; try { E = await engine(); } catch { return []; }
    const out = [];
    for (const p of data.packages || []) {
      if (!['pc', 'mobile'].includes(p.platform)) continue;
      let spec; try { spec = JSON.parse(text(await readBytes(current.root, data.relativeDirectory + '/' + p.relativeDirectory + '/' + p.configFile))); } catch { continue; }
      const plan = E.FwImporter.fwl50PlanPreview(spec, p.platform === 'mobile' ? p.name : data.name);
      if (!plan || plan.error) continue;
      for (const [key, uePath] of Object.entries(plan)) out.push({ key, platform: p.platform, kind: kindOf(key, spec), name: baseOf(uePath), uePath, action: null, note: '' });
    }
    return out;
  }
  async function scan(dirHandle) {
    await permitted(dirHandle, 'read');
    resetRoot(dirHandle);
    const index = await readIndex(dirHandle), byResource = new Map();
    for (const r of index) {
      let data;
      try { data = await receipt(dirHandle, r.deliveryId, 'size'); }
      catch (e) { data = { ...r, createdAt: '', metadata: {}, packages: [], files: [], fileCheck: { ok: false, missing: ['workspace-resource.json'], changed: [] }, importReceipt: null, thumbnail: { status: 'missing' } }; }
      (byResource.get(r.resourceId) || byResource.set(r.resourceId, []).get(r.resourceId)).push(data);
    }
    const list = [];
    for (const revs of byResource.values()) {
      revs.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      const d = revs[0], meta = d.metadata || {}, mine = importState(d.importReceipt && d.importReceipt.rows);
      const olderImported = revs.slice(1).find(x => importState(x.importReceipt && x.importReceipt.rows));
      const state = mine || (olderImported ? '有新版本' : '待导入');
      const when = x => x && x.reportedAt ? new Date(x.reportedAt).toLocaleString('zh-CN', { hour12: false }) : '';
      const stateDetail = mine ? (mine === '已导入' ? '上次导入 ' : mine + ' ') + when(d.importReceipt) : olderImported ? '已导入的是 ' + String(olderImported.createdAt).slice(0, 10) + ' 的修订' : '';
      const pkg = {
        id: d.deliveryId, resourceId: d.resourceId, revisionId: d.revisionId, name: d.name,
        category: CATEGORIES[(d.classification || {}).category] || '烟花', size: SIZES[(d.classification || {}).size] || '未分类',
        platforms: [...new Set((d.packages || []).map(p => PLATFORM_KEY[p.platform]).filter(Boolean))],
        exportedAt: d.createdAt, bakerVersion: meta.bakerVersion || '',
        durationSec: Number.isFinite(meta.artifactDuration) ? meta.artifactDuration : Number.isFinite(meta.duration) ? meta.duration : null,
        thumbTime: Number.isFinite(meta.thumbnailTime) ? meta.thumbnailTime : null,
        hasThumb: !!(d.thumbnail && d.thumbnail.status === 'ready'), state, stateDetail,
        revisions: revs.map(x => ({ revisionId: x.revisionId, exportedAt: x.createdAt, imported: !!importState(x.importReceipt && x.importReceipt.rows) })),
        files: d.fileCheck, assets: d.packages && d.packages.length ? await previewAssets(d) : [],
      };
      current.packages.set(pkg.id, { pkg, data: d });
      list.push(pkg);
    }
    list.sort((a, b) => String(b.exportedAt).localeCompare(String(a.exportedAt)));
    emit('packages', JSON.parse(JSON.stringify(list)));
    return list;
  }
  let refreshTimer = null;
  function refreshSoon(root) { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => scan(root).catch(() => {}), 50); }
  async function thumbnailURL(pkgId) {
    if (thumbs.has(pkgId)) return thumbs.get(pkgId);
    const e = current && current.packages.get(pkgId); if (!e || !e.pkg.hasThumb) return null;
    try { const u = URL.createObjectURL(new Blob([await readBytes(current.root, e.data.relativeDirectory + '/' + e.data.thumbnail.file)], { type: 'image/png' })); thumbs.set(pkgId, u); return u; }
    catch { return null; }
  }

  // ---------- 检查与导入 ----------
  function lock(name) { if (opLock) throw fail('BUSY', opLock === 'import' ? '正在导入另一个包' : '正在检查另一个包，稍等'); opLock = name; }
  function unlock() { opLock = null; }
  const progress = (pkgId, phase, done, total, txt, cb) => { const v = { pkgId, phase, done, total, text: txt }; emit('progress', v); if (cb) try { cb(v); } catch {} };
  async function stage(pkgId, onProgress) {
    const entry = current && current.packages.get(pkgId);
    if (!entry) throw fail('NOT_FOUND', '找不到这个包，请先读导出文件夹');
    const data = await receipt(current.root, pkgId, 'sha');
    const tmp = await ueTemp(), base = tmp + '/' + pkgId, packages = []; let uploaded = 0;
    const plats = (data.packages || []).filter(p => ['pc', 'mobile'].includes(p.platform));
    const work = [];
    for (const p of plats) {
      const rel = data.relativeDirectory + '/' + p.relativeDirectory, names = await listFiles(await dirAt(current.root, rel)), files = [];
      for (const n of names) { const u8 = await readBytes(current.root, rel + '/' + n); files.push({ name: n, data: u8, sha256: await sha256(u8) }); }
      work.push({ p, files, target: base + '/' + p.platform });
    }
    const total = work.reduce((a, w) => a + w.files.reduce((x, f) => x + f.data.length, 0), 0); let before = 0;
    for (const w of work) {
      uploaded += await uploadDir(w.target, w.files, (sent) => progress(pkgId, 'upload', before + sent, total, '传到 UE 临时目录 ' + Math.round((before + sent) / 1048576 * 10) / 10 + ' / ' + Math.round(total / 1048576 * 10) / 10 + ' MB', onProgress));
      before += w.files.reduce((x, f) => x + f.data.length, 0);
      dirMap.set(w.target, { deliveryId: pkgId, packageName: data.relativeDirectory.split('/').slice(-1)[0] });
      packages.push({ platform: w.p.platform, name: w.p.name, configFile: w.p.configFile, relativeDirectory: w.p.relativeDirectory, directory: w.target });
    }
    return { data, uploaded, base, receipt: { format: FORMAT, status: 'complete', resourceId: data.resourceId, revisionId: data.revisionId, deliveryId: data.deliveryId, name: data.name, metadata: data.metadata || {}, packages } };
  }
  function snapshot(E, pkgId) { return E.FwImporter.fwl50Snapshot(pkgId); }
  async function idle(E, ms = 300000) { const t0 = Date.now(); while (E.Workbench.busy) { if (Date.now() - t0 > ms) throw fail('BUSY', '导入引擎一直在忙'); await sleep(100); } }
  function planOf(snap) {
    const rows = snap.rows.filter(r => r.selected && !r.finished);
    return { rows, token: 'p-' + JSON.stringify(rows.map(r => [r.id, r.fingerprint, r.mode, r.assets.filter(a => a.selected).map(a => a.key)])) };
  }
  async function tokenOf(snap) { return 'p-' + (await sha256(utf8(planOf(snap).token))).slice(0, 24); }
  async function precheck(pkgId, opts = {}) {
    lock('check');
    try {
      await needUE();
      const E = await engine(); await idle(E);
      const { data, uploaded, receipt: rec } = await stage(pkgId, opts.onProgress);
      progress(pkgId, 'check', 0, 1, '检查素材与名称', opts.onProgress);
      const accepted = await E.FwImporter.acceptDelivery(rec);
      if (accepted && accepted.queued) throw fail('BUSY', '导入引擎正在编辑别的内容');
      await idle(E);
      const want = opts.platforms ? opts.platforms.filter(p => rec.packages.some(x => x.platform === p)) : null;
      E.FwImporter.fwl50Activate(pkgId, want);
      let snap = snapshot(E, pkgId);
      const recheck = snap.rows.filter(r => !r.finished).map(r => r.id);
      if (recheck.length) { await E.FwImporter.preview(recheck); await idle(E); }
      snap = snapshot(E, pkgId);
      // UE 里已有同名资产 → 按原导入器的「更新同名」走（覆盖前备份），和用户在原界面点「更新同名资源」一样
      const notes = [];
      const toUpdate = snap.rows.filter(r => r.selected && !r.finished && r.mode !== 'update' && r.errs.length && r.errs.every(e => /目标已存在/.test(e)));
      if (toUpdate.length) {
        for (const r of toUpdate) E.FwImporter.prepareUpdate(r.id);
        await E.FwImporter.preview(toUpdate.map(r => r.id)); await idle(E); snap = snapshot(E, pkgId);
        notes.push({ level: 'info', platform: null, text: 'UE 里已有同名资产，按「更新同名」覆盖；覆盖前会备份到你选的备份文件夹' });
      }
      const sel = snap.rows.filter(r => (r.selected || r.finished) && (!want || want.includes(r.platform)));
      const assets = sel.flatMap(r => r.assets.map(a => ({ key: a.key, platform: r.platform, kind: ({ '颜色 Ramp': 'Ramp', '序列／单帧贴图': '序列贴图', '溶解图（线性）': '溶解图' })[a.type] || a.type, name: a.name, uePath: a.directory + '/' + a.name,
        action: r.finished ? '不变' : a.action, note: a.selected ? (['新增', '同名更新'].includes(a.engineAction) ? '' : a.engineAction) : '不导入' })));
      const issues = [...notes];
      for (const r of sel) for (const e of r.errs) issues.push({ level: r.finished ? 'info' : 'error', platform: r.platform, text: e });
      for (const t of gateInfo.get(pkgId) || []) issues.push({ level: 'info', platform: null, text: t });
      const pending = sel.filter(r => !r.finished);
      if (!pending.length) issues.push({ level: 'info', platform: null, text: sel.length ? '这个修订已经导入过，没有要写的' : '没有选平台' });
      const count = k => assets.filter(a => a.action === k).length;
      const ok = pending.length > 0 && pending.every(r => r.checked) && !issues.some(i => i.level === 'error');
      progress(pkgId, 'check', 1, 1, ok ? '检查通过' : '检查没通过', opts.onProgress);
      return { ok, planToken: ok ? await tokenOf(snap) : null, newCount: count('新建'), overwriteCount: count('覆盖'), reuseCount: count('复用'), unchangedCount: count('不变'),
        needBackup: count('覆盖') > 0, assets, issues, checkedAt: nowISO(), uploadedBytes: uploaded, platforms: [...new Set(sel.map(r => r.platform))] };
    } finally { unlock(); }
  }
  async function importPkg(pkgId, opts = {}) {
    lock('import');
    let E;
    try {
      await needUE();
      E = await engine(); await idle(E, 5000);
      await permitted(current.root, 'readwrite');     // 导入后要在导出文件夹写贴图登记和导入回执
      let snap = snapshot(E, pkgId);
      if (!snap || !snap.active || !opts.planToken || await tokenOf(snap) !== opts.planToken) throw fail('PLAN_STALE', '检查结果已过期，请重新检查');
      const plan = planOf(snap);
      const overwrite = plan.rows.some(r => r.assets.some(a => a.selected && a.action === '覆盖'));
      if (overwrite) { if (!opts.backupDir) throw fail('NEED_BACKUP_DIR', '要覆盖 UE 里已有的资产，请先选备份文件夹（不要选 UE 工程里的目录）'); await permitted(opts.backupDir, 'readwrite'); }
      // 检查后 UE 临时目录里的文件被清了就重传（内容按清单核对，不变不传）
      await stage(pkgId, opts.onProgress);
      if (E.FwImporter.fwl50ConfirmAll(pkgId) !== plan.rows.length) throw fail('PLAN_STALE', '检查结果已过期，请重新检查');
      busy = true; emit('status', status());
      activeImport = { deliveryId: pkgId, backupDir: opts.backupDir || null, backups: [] };
      const poll = setInterval(() => {
        const s = snapshot(E, pkgId); if (!s) return;
        const rs = s.rows.filter(r => plan.rows.some(p => p.id === r.id)), done = rs.filter(r => r.finished).length, running = rs.find(r => r.state === 'running');
        progress(pkgId, 'import', done, rs.length, running ? (running.platform === 'mobile' ? '手机 · ' : 'PC · ') + ((running.importProgress && running.importProgress.stage) || '写入中') : '导入中', opts.onProgress);
      }, 400);
      try { await E.FwImporter.execute(); await idle(E, 3600000); } finally { clearInterval(poll); }
      snap = snapshot(E, pkgId);
      const written = [], failed = [];
      for (const p of plan.rows) {
        const r = snap.rows.find(x => x.id === p.id); if (!r) continue;
        const done = new Set(r.completedAssetKeys);
        for (const a of p.assets.filter(a => a.selected)) {
          const row = { key: a.key, platform: r.platform, name: a.name, uePath: a.directory + '/' + a.name };
          if (r.finished && done.has(a.key)) written.push({ ...row, action: a.action });
          else if (!r.finished) failed.push({ ...row, reason: r.errs[0] || r.label || '没有完成' });
        }
      }
      progress(pkgId, 'register', 0, 1, '写导入回执', opts.onProgress);
      const rows = (E.FwImporter.deliveryState()[pkgId] || { rows: [] }).rows;
      await writeJSON(current.root, '.workspace/receipts/' + pkgId + '.json', { deliveryId: pkgId, reportedAt: nowISO(), source: 'fwl50-importer', engine: ENGINE_VERSION, enginePlaybackVerified: false, rows });
      progress(pkgId, 'register', 1, 1, '导入回执已写', opts.onProgress);
      if (!failed.length) await ueRemove((await ueTemp()) + '/' + pkgId);
      refreshSoon(current.root);
      return { ok: !failed.length && written.length > 0, written, failed,
        backup: activeImport.backups.length ? { dir: activeImport.backups.map(b => b.dir).join('、'), files: activeImport.backups.reduce((a, b) => a + b.files, 0) } : null,
        receiptPath: '.workspace/receipts/' + pkgId + '.json', gpuRestartNeeded: snap.rows.some(r => plan.rows.some(p => p.id === r.id) && r.state === 'pending'), finishedAt: nowISO() };
    } finally { activeImport = null; busy = false; unlock(); emit('status', status()); }
  }

  window.FWLImporter = {
    version: VERSION || '5.0.0', engineVersion: ENGINE_VERSION,
    status, reconnect,
    publish(dirHandle, blob, name, metadata) { resetRoot(dirHandle); return publish(dirHandle, blob, name, metadata); },
    scan, precheck, importPkg, thumbnailURL,
    on(event, cb) { if (!listeners[event]) throw fail('BAD_EVENT', '没有这个事件：' + event); listeners[event].add(cb); return () => listeners[event].delete(cb); },
    // 只给开发和沙盒验收用：引擎创建前设置，写入目录整体挪到 sandbox 下（例 '/Game/FWL50_Sandbox'）
    configure(opts) { if (enginePromise) throw fail('TOO_LATE', '导入引擎已经启动，要在第一次使用前设置'); if (opts && typeof opts.sandbox === 'string') { if (opts.sandbox && !/^\/Game\/[A-Za-z0-9_]+(\/[A-Za-z0-9_]+)*$/.test(opts.sandbox)) throw fail('BAD_ARGS', '沙盒目录要像 /Game/FWL50_Sandbox'); config.sandbox = opts.sandbox; } return { ...config }; },
  };
  if (window.__FWL50_TEST__) window.FWLImporter.__test = { copyBackup, gateCheck, pyStr };
  setTimeout(() => probe().catch(() => {}), 0);
})();
