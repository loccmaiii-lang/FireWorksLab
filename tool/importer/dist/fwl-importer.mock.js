// 烟花工坊 5.0 · 导入模块替身（fwl-importer.mock.js）
// 接口见 tool/importer/API_5.0.md。只返回假数据：不连 UE、不读写文件夹。给外壳先接「资源交付」页用。
(function () {
  'use strict';
  if (window.FWLImporter && !window.FWLImporter.__mock) return;   // 真模块已在，替身让路

  const listeners = { status: new Set(), progress: new Set(), packages: new Set() };
  const emit = (ev, v) => listeners[ev].forEach(cb => { try { cb(v); } catch (e) { console.error(e); } });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const iso = (minAgo) => new Date(Date.now() - minAgo * 60000).toISOString().replace(/\.\d+Z$/, 'Z');
  const hex = n => Array.from({ length: n }, () => '0123456789abcdef'[Math.random() * 16 | 0]).join('');
  const err = (code, text) => Object.assign(new Error(text), { code });

  let scenario = 'default', busy = false, retryTimer = null, retryAt = 0, plans = new Map();
  let ue = 'connected', lastConnectedAt = new Date().toISOString();

  function thumb(hue) {   // 小号 SVG 缩略图：黑底 + 一朵示意花
    const rays = Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2; return `<line x1="160" y1="110" x2="${160 + Math.cos(a) * 80}" y2="${110 + Math.sin(a) * 80}"/>`; }).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#000"/><g stroke="hsl(${hue},90%,65%)" stroke-width="2" stroke-linecap="round" opacity=".9">${rays}</g><circle cx="160" cy="110" r="6" fill="#fff"/></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function assetsFor(name, platforms, hd = true) {
    const out = [];
    for (const platform of platforms) {
      const pc = platform === 'pc', sfx = pc ? '_HD' : '';
      const ps = pc ? '/Game/Effects_HD/Props_HD/FireWorks_HD/' : '/Game/Effects/Props/FireWorks/';
      const tx = pc ? '/Game/Effects_HD/Common_HD/Texture_HD/FireWorks_HD/' : '/Game/Effects/Common/Texture/FireWorks/';
      const mi = pc ? '/Game/Effects_HD/Common_HD/MaterialInstance_HD/FireWorks_HD/' : '/Game/Effects/Common/MaterialInstance/Fireworks/';
      const nm = pc ? name : name + '_M';
      out.push(
        { key: 'tex:main', platform, kind: '序列贴图', name: `T_EFX_FireWorks_${nm}_01_8x8${sfx}`, uePath: `${tx}T_EFX_FireWorks_${nm}_01_8x8${sfx}`, action: null, note: '' },
        { key: 'tex:ramp', platform, kind: 'Ramp', name: `T_EFX_FireWorks_${nm}_Ramp${sfx}`, uePath: `${tx}T_EFX_FireWorks_${nm}_Ramp${sfx}`, action: null, note: '' },
        { key: 'mat:M0', platform, kind: '材质实例', name: `MI_EFX_FireWorks_${nm}${sfx}`, uePath: `${mi}MI_EFX_FireWorks_${nm}${sfx}`, action: null, note: '' },
        { key: 'ps', platform, kind: '粒子系统', name: `P_EFX_FireWorks_${nm}${sfx}`, uePath: `${ps}P_EFX_FireWorks_${nm}${sfx}`, action: null, note: '' },
      );
    }
    return out;
  }

  function pkg(name, opts) {
    const resourceId = hex(16), revisionId = hex(20), platforms = opts.platforms || ['pc', 'mobile'];
    return {
      id: resourceId + '-' + revisionId, resourceId, revisionId, name,
      category: opts.category || '烟花', size: opts.size || '中', platforms,
      exportedAt: iso(opts.ago || 5), bakerVersion: '4.9.126',
      durationSec: opts.duration ?? 3.2, thumbTime: opts.thumbTime ?? 0.8, hasThumb: true,
      state: opts.state || '待导入', stateDetail: opts.detail || '',
      revisions: [{ revisionId, exportedAt: iso(opts.ago || 5), imported: opts.state === '已导入' }].concat(
        opts.state === '有新版本' ? [{ revisionId: hex(20), exportedAt: iso(1440), imported: true }] : []),
      files: { ok: true, missing: [], changed: [] },
      assets: assetsFor(name, platforms),
      __thumb: thumb(opts.hue ?? 40),
    };
  }

  let packages = [];
  function seed() {
    packages = scenario === 'empty' ? [] : [
      pkg('GoldRayChry_L', { state: '待导入', ago: 3, size: '大', hue: 42 }),
      pkg('SilverStrobeChry_B', { state: '有新版本', ago: 40, detail: '上次导入的是 11-04 的修订', hue: 200 }),
      pkg('RiseTrail_M', { state: '已导入', ago: 300, category: '尾缀', size: '中', platforms: ['pc', 'mobile'], detail: '上次导入 11-05 18:02（PC、手机）', hue: 30, duration: null, thumbTime: 0.5 }),
    ];
  }
  seed();

  const clone = v => JSON.parse(JSON.stringify(v));
  const pub = p => { const { __thumb, ...rest } = p; return clone(rest); };
  const find = id => { const p = packages.find(x => x.id === id); if (!p) throw err('NOT_FOUND', '找不到这个包：' + id); return p; };

  function status() {
    return {
      ue, busy, endpoint: '127.0.0.1:17780', lastConnectedAt,
      detail: ue === 'connected' ? '已连接 UE（Windows）' : ue === 'checking' ? '正在连接 UE…' : 'UE 未连接：127.0.0.1:17780 没有响应（UE 编辑器开着吗？）',
      retryInSec: ue === 'disconnected' ? Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)) : null,
    };
  }
  function scheduleRetry() {
    clearTimeout(retryTimer); retryAt = Date.now() + 12000;
    retryTimer = setTimeout(() => reconnect(), 12000);
  }
  async function reconnect() {
    ue = 'checking'; emit('status', status()); await sleep(400);
    if (scenario === 'ue-down') { ue = 'disconnected'; scheduleRetry(); }
    else { ue = 'connected'; lastConnectedAt = new Date().toISOString(); clearTimeout(retryTimer); }
    emit('status', status()); return status();
  }

  async function publish(dirHandle, blob, name, metadata) {
    const n = String(name || 'Untitled').replace(/\.zip$/i, '');
    const p = pkg(n, { state: '待导入', ago: 0, hue: Math.random() * 360 | 0 });
    packages = packages.filter(x => x.name !== n); packages.unshift(p);
    emit('packages', packages.map(pub));
    return { format: 'df.firework-resource/1', status: 'complete', pkgId: p.id, deliveryId: p.id, resourceId: p.resourceId, revisionId: p.revisionId, name: n, createdAt: p.exportedAt, metadata: metadata || {}, packages: p.platforms.map(x => ({ platform: x, configFile: x === 'pc' ? 'cascade.json' : 'cascade_mobile.json' })) };
  }

  async function scan(dirHandle) {
    await sleep(150);
    return packages.map(pub);
  }

  async function precheck(pkgId, opts = {}) {
    const p = find(pkgId);
    if (ue !== 'connected') throw err('UE_DISCONNECTED', 'UE 未连接，连上后再检查');
    const platforms = (opts.platforms || p.platforms).filter(x => p.platforms.includes(x));
    const total = 6;
    for (let i = 1; i <= total; i++) { await sleep(120); emit('progress', { pkgId, phase: i < 4 ? 'upload' : 'check', done: i, total, text: i < 4 ? `传到 UE 临时目录 ${i}/3` : `检查 ${i - 3}/3` }); }
    const imported = p.state === '已导入' || p.state === '有新版本';
    const assets = p.assets.filter(a => platforms.includes(a.platform)).map(a => ({
      ...a,
      action: a.kind === 'Ramp' && a.platform === 'mobile' ? '复用' : imported ? (p.state === '已导入' ? '不变' : '覆盖') : '新建',
      note: a.kind === 'Ramp' && a.platform === 'mobile' ? '内容和已登记的 Ramp 相同，复用那张' : '',
    }));
    const issues = [];
    if (scenario === 'blocked') {
      issues.push({ level: 'error', platform: 'mobile', text: 'cascade_mobile.json：发射器 4 个，超过 _M 上限 3（规范 §6）' });
      issues.push({ level: 'error', platform: 'mobile', text: 'cascade_mobile.json：手机贴图超过 1024：T_EFX_FireWorks_' + p.name + '_M_01_8x8（2048×2048）' });
    }
    if (assets.some(a => a.action === '复用')) issues.push({ level: 'info', platform: 'mobile', text: 'Ramp 内容和已登记的贴图相同，导入器会复用那张' });
    const count = k => assets.filter(a => a.action === k).length;
    const planToken = 'p-' + hex(12);
    plans.set(pkgId, { planToken, platforms, assets });
    return {
      ok: !issues.some(i => i.level === 'error'), planToken,
      newCount: count('新建'), overwriteCount: count('覆盖'), reuseCount: count('复用'), unchangedCount: count('不变'),
      needBackup: count('覆盖') > 0, assets: clone(assets), issues, checkedAt: new Date().toISOString(),
      uploadedBytes: imported ? 0 : 6815744,
    };
  }

  async function importPkg(pkgId, opts = {}) {
    const p = find(pkgId), plan = plans.get(pkgId);
    if (busy) throw err('BUSY', '正在导入另一个包');
    if (ue !== 'connected') throw err('UE_DISCONNECTED', 'UE 未连接');
    if (!plan || plan.planToken !== opts.planToken) throw err('PLAN_STALE', '检查结果已过期，请重新检查');
    if (plan.assets.some(a => a.action === '覆盖') && !opts.backupDir) throw err('NEED_BACKUP_DIR', '要覆盖 UE 里已有的资产，请先选备份文件夹（不要选 UE 工程里的目录）');
    busy = true; emit('status', status());
    const prog = v => { emit('progress', v); if (typeof opts.onProgress === 'function') opts.onProgress(v); };
    const written = [], failed = [];
    try {
      const todo = plan.assets.filter(a => a.action !== '不变');
      if (plan.assets.some(a => a.action === '覆盖')) { prog({ pkgId, phase: 'backup', done: 1, total: 1, text: '备份要覆盖的资产' }); await sleep(300); }
      for (let i = 0; i < todo.length; i++) {
        const a = todo[i];
        prog({ pkgId, phase: 'import', done: i + 1, total: todo.length, text: `${a.action} ${a.name}` });
        await sleep(2000 / Math.max(1, todo.length));
        if (scenario === 'fail' && a.key === 'ps' && a.platform === 'mobile') failed.push({ key: a.key, platform: a.platform, name: a.name, reason: '保存失败：文件只读（版本管理没迁出）' });
        else written.push({ key: a.key, platform: a.platform, name: a.name, uePath: a.uePath, action: a.action });
      }
      prog({ pkgId, phase: 'register', done: 1, total: 1, text: '写导入回执' }); await sleep(150);
      p.state = failed.length ? '部分导入' : '已导入';
      p.stateDetail = (failed.length ? '部分导入 ' : '上次导入 ') + new Date().toLocaleString('zh-CN', { hour12: false });
      p.revisions[0].imported = !failed.length; plans.delete(pkgId);
      emit('packages', packages.map(pub));
      return {
        ok: !failed.length, written, failed,
        backup: plan.assets.some(a => a.action === '覆盖') ? { dir: '备份/' + new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '') + '_' + p.name + '/', files: plan.assets.filter(a => a.action === '覆盖').length } : null,
        receiptPath: '.workspace/receipts/' + p.id + '.json', gpuRestartNeeded: false, finishedAt: new Date().toISOString(),
      };
    } finally { busy = false; emit('status', status()); }
  }

  window.FWLImporter = {
    version: '5.0.0', engineVersion: 'mock', __mock: {
      scenario(name) { scenario = name; seed(); plans.clear(); emit('packages', packages.map(pub)); return reconnect().then(() => name); },   // 等连接状态落定再返回
      get name() { return scenario; },
    },
    status, reconnect, publish, scan, precheck, importPkg,
    thumbnailURL(pkgId) { const p = packages.find(x => x.id === pkgId); return p ? p.__thumb : null; },
    on(event, cb) { if (!listeners[event]) throw err('BAD_EVENT', '没有这个事件：' + event); listeners[event].add(cb); return () => listeners[event].delete(cb); },
  };
})();
