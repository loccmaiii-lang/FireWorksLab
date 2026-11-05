/* =====================================================================
   导入模块临时替身（tool/src/shell/fwl-importer.shim.js；对话框9 · S，2026-11-05）
   只在 tool/importer/dist/ 里既没有真模块 fwl-importer.js、也没有本机替身 fwl-importer.mock.js 时，由 build.py 放进 tool/烟花工坊.html。
   接口按「协作/提示词/烟花工坊5.0_本机开工_明天离线单文件_2026-11-05.md」建议的 window.FWLImporter；本机推上 API_5.0.md 后以它为准。
   不连 UE、不写任何文件：scan 读到的是假数据（外加这次打开后导出过的包名），precheck / importPkg 按假数据走一遍。
   走查用的开关：FWLImporter.__mock.set({ue: 'connected' | 'disconnected' | 'unavailable'})、__mock.failNext = '原因'
   ===================================================================== */
(() => {
'use strict';
if (window.FWLImporter) return;
const listeners = {status: [], progress: []};
const emit = (ev, v) => (listeners[ev] || []).forEach(f => { try { f(v); } catch (e) { /* 监听方出错不影响替身 */ } });
const st = {ue: 'connected', detail: '替身：不连 UE', retryInSec: 0};
const pad2 = n => String(n).padStart(2, '0');
const nowStr = () => { const d = new Date(); return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const assets = (en, pc, mb, ov) => {
  const A = [{name: `T_${en}_Ramp`, kind: '贴图', uePath: `/Game/VFX/Fireworks/${en}/Textures`, action: '新建'}];
  for (let i = 1; i <= pc; i++) A.push({name: `T_${en}_${pad2(i)}`, kind: '贴图', uePath: `/Game/VFX/Fireworks/${en}/Textures`, action: ov && i === 1 ? '覆盖' : '新建'});
  for (let i = 1; i <= mb; i++) A.push({name: `T_${en}_M_${pad2(i)}`, kind: '贴图', uePath: `/Game/VFX/Fireworks/${en}/Textures`, action: '新建'});
  A.push({name: `MI_${en}_01`, kind: '材质实例', uePath: `/Game/VFX/Fireworks/${en}/Materials`, action: ov ? '覆盖' : '新建'});
  A.push({name: `P_${en}`, kind: '粒子系统', uePath: `/Game/VFX/Fireworks/${en}/Particles`, action: ov ? '覆盖' : '新建'});
  if (mb) A.push({name: `P_${en}_M`, kind: '粒子系统', uePath: `/Game/VFX/Fireworks/${en}/Particles`, action: '新建'});
  return A;
};
const PKG = [
  {id: 'mock-comet30', name: 'Comet 3.0 红头金尾', revision: '7c41e0b9d2a4', platform: 'PC、手机', exportedAt: '11-04 21:12', thumb: '', state: '待导入', bakerVersion: '4.9.126', assets: assets('Comet30_RedGold', 2, 2, false)},
  {id: 'mock-kinmang', name: '金芒菊 规格', revision: '91fa3c07be11', platform: 'PC、手机', exportedAt: '11-03 18:40', thumb: '', state: '有新版本', bakerVersion: '4.9.121', assets: assets('KinMang_KM06', 3, 1, true)},
  {id: 'mock-silver30', name: 'Silver 3.0 银白长尾', revision: '5d28b4e19c07', platform: 'PC', exportedAt: '11-02 16:20', thumb: '', state: '已导入', bakerVersion: '4.9.118', assets: assets('Silver30_LongTail', 2, 0, false)}
];
const byId = id => PKG.find(p => p.id === id);
const clone = o => JSON.parse(JSON.stringify(o));
const wait = ms => new Promise(r => setTimeout(r, ms));
const mock = {
  set(o) { Object.assign(st, o || {}); if (st.ue === 'disconnected' && !st.retryInSec) st.retryInSec = 12; emit('status', clone(st)); },
  failNext: '',
  delay: 120,
  noteExport(info) {   /* 外壳在导出完成后告诉替身：把这次导出的包放进列表（真模块从导出文件夹里读出来） */
    const name = (info && info.name || '').replace(/\.zip$/i, ''); if (!name) return;
    let p = PKG.find(x => x.name === name);
    if (!p) { p = {id: 'mock-' + Date.now().toString(36), name, revision: Date.now().toString(16).slice(-12), platform: 'PC、手机', exportedAt: '', thumb: '', state: '待导入', bakerVersion: typeof VERSION === 'string' ? VERSION : '', assets: assets(name.replace(/[^\w]+/g, '_').slice(0, 40) || 'FX', 2, 1, false)}; PKG.unshift(p); }
    p.exportedAt = nowStr(); p.state = '待导入';
  }
};
window.FWLImporter = {
  version: '5.0.0-shim',
  mock: true,
  __mock: mock,
  status() { return clone(st); },
  async reconnect() { await wait(mock.delay * 3); if (st.ue === 'disconnected') { st.ue = 'connected'; st.retryInSec = 0; } emit('status', clone(st)); return clone(st); },
  async scan(dirHandle) {
    if (!dirHandle) throw new Error('没有导出文件夹');
    await wait(mock.delay);
    return clone(PKG);
  },
  async precheck(pkgId) {
    await wait(mock.delay);
    const p = byId(pkgId); if (!p) throw new Error('找不到这个包：' + pkgId);
    const ov = p.assets.filter(a => a.action === '覆盖').length;
    return {ok: true, newCount: p.assets.filter(a => a.action === '新建').length, overwriteCount: ov,
      issues: ov ? [{level: 'warn', text: `会覆盖 UE 里已有的 ${ov} 个资产`}] : []};
  },
  async importPkg(pkgId, o = {}) {
    const p = byId(pkgId); if (!p) throw new Error('找不到这个包：' + pkgId);
    if (st.ue !== 'connected') throw new Error('UE 未连接');
    const tot = p.assets.length, failed = [];
    for (let i = 0; i < tot; i++) {
      await wait(mock.delay);
      if (st.ue !== 'connected') { failed.push({name: p.assets[i].name, reason: 'UE 断开'}); break; }
      const ev = {pkgId, done: i + 1, total: tot, name: p.assets[i].name};
      if (o.onProgress) o.onProgress(ev);
      emit('progress', ev);
    }
    if (mock.failNext) { failed.push({name: p.assets[tot - 1].name, reason: mock.failNext}); mock.failNext = ''; }
    if (!failed.length) p.state = '已导入';
    return {ok: !failed.length, written: tot - failed.length, failed};
  },
  on(ev, cb) { (listeners[ev] = listeners[ev] || []).push(cb); return () => { listeners[ev] = listeners[ev].filter(f => f !== cb); }; }
};
})();
