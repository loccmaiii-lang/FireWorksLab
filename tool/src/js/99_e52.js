// 5.0.01 预览（组件库 E 4.1，2026-11-06 用户 17:01 / 17:06）：
// 1) 输出栏常用 / 少改的一起露出来（不再收进「+N」），方便整套查阅；
// 2) 「数据」模块：烘焙结果（原底部统计框 #stats：产物 · 帧数 · 单格、帧预算、精灵 · 贴图 · MB、面片面积、画面占比、模拟内核、自检）放进输出栏，紧跟「输出」模块。
(() => {
  if (typeof document === 'undefined') return;
  const $q = s => document.querySelector(s);
  try { if (typeof store !== 'undefined' && store.get('e51OutMore', null) === null) store.set('e51OutMore', true); } catch (e) {}
  let rows = null, dataEl = null;     // null = 还没烘焙
  const html = () => rows && rows.length
    ? rows.map(r => `<div class="e52-r">${r}</div>`).join('')
    : '<div class="e52-r e52-none">还没烘焙。烘好后这里写：产物 · 帧数 · 单格 · 通道、帧预算、精灵尺寸 · 贴图张数 · 显存、面片面积、画面占比、模拟内核、自检。</div>';
  function ensure() {
    const out = $q('#params .e51-out'); if (!out || !out.parentElement) return;
    let d = dataEl;
    if (!d) {
      d = dataEl = document.createElement('details'); d.className = 'sec mod e52-data'; d._mod = '数据'; d._g = '输出'; d._key = '输出›数据'; d._autoOpen = true; d.open = true;
      d.innerHTML = '<summary>数据<span class="msum"></span></summary><div class="e52-rows"></div>';
      d.querySelector('summary').addEventListener('click', () => { d._user = true; });
    }
    if (!d._user && !d.open) d.open = true;     // 参数栏重建时默认收起的逻辑会关掉它；你没点过就保持展开
    document.querySelectorAll('#params details.e52-data').forEach(x => { if (x !== d) x.remove(); });
    if (d.previousElementSibling !== out) out.after(d);
    // 查阅用：输出栏下面的各个小模块第一次见到时都展开（之后你开合按你的）
    out.parentElement.querySelectorAll('details.mod').forEach(m => { if (!m._e52) { m._e52 = true; m._autoOpen = true; if (!m.open && !m.hidden) m.open = true; } });
    const box = d.querySelector('.e52-rows'), h = html(); if (d._h !== h) { d._h = h; box.innerHTML = h; }
    const sum = d.querySelector('.msum'); if (sum) { const tx = rows && rows.length ? (rows.some(r => r.includes('class="warn"')) ? '自检有提示' : '自检正常') : '未烘焙'; if (sum.textContent !== tx) sum.textContent = tx; }
  }
  if (typeof showStats === 'function') {
    const f = showStats;
    showStats = function () { const r = f.apply(this, arguments); const st = $q('#stats'); rows = st ? st.innerHTML.split(/<br\s*\/?>/i).filter(Boolean) : null; ensure(); return r; };
  }
  let t = 0; const later = () => { clearTimeout(t); t = setTimeout(ensure, 60); };
  const go = () => { const p = $q('#params'); if (!p) return setTimeout(go, 200); new MutationObserver(later).observe(p, { childList: true, subtree: true }); later(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();

// 5.0.01 预览 · 工具条前一版（用户 17:44）：视图条第二行「画面　[适应窗口 | 1:1 | 实机窗口]　[距离 ↔]　[预览曝光 ↔]」
(() => {
  if (typeof document === 'undefined') return;
  const $q = s => document.querySelector(s); let n = 0;
  const go = () => {
    const vb = $q('#viewbar'), disp = $q('#dispSeg'), read = $q('#vfRead');
    if (!vb || !disp || !read) { if (n++ < 300) setTimeout(go, 100); return; }
    if (vb.querySelector('.p501-br')) return;
    const br = document.createElement('i'); br.className = 'p501-br';
    const k = document.createElement('span'); k.className = 'p501-k'; k.textContent = '画面';
    vb.append(br, k, disp, read);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
