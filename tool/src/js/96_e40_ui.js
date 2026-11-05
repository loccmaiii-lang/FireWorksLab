// E 4.0（= E 样板 v3.7）P0：全局外观脚本（4.9.127，对话框9 P）。只管外观：滚动条显隐、滑杆已填部分、悬停提示。不碰参数、烘焙、导出。
(function e40Base() {
  if (typeof document === 'undefined') return;
  // 滚动条只在滚动时出现（v3.4 第 13 条）：正在滚的元素加 .is-scrolling，停 800 ms 去掉
  const scrolling = new Map();
  document.addEventListener('scroll', e => {
    const el = e.target && e.target.nodeType === 1 ? e.target : null; if (!el) return;
    el.classList.add('is-scrolling'); clearTimeout(scrolling.get(el));
    scrolling.set(el, setTimeout(() => { el.classList.remove('is-scrolling'); scrolling.delete(el); }, 800));
  }, true);

  // 滑杆已填部分（--v）：拖的时候立刻跟，脚本改值的由定时同步补上（只看页面上显示着的）
  const fill = r => {
    const lo = +r.min || 0, hi = r.max === '' ? 100 : +r.max, v = +r.value;
    const pc = hi > lo ? Math.min(100, Math.max(0, (v - lo) / (hi - lo) * 100)) : 0, s = pc.toFixed(2) + '%';
    if (r.__eV !== s) { r.__eV = s; r.style.setProperty('--v', s); }
  };
  document.addEventListener('input', e => { if (e.target && e.target.type === 'range') fill(e.target); }, true);
  const syncRanges = () => { if (document.hidden) return; for (const r of document.querySelectorAll('input[type=range]')) if (r.offsetParent) fill(r); };
  setInterval(syncRanges, 300); document.addEventListener('DOMContentLoaded', syncRanges);

  // 悬停提示（§12）：旧界面的 title 接过来画成 E 的提示框；悬停时临时把 title 收进 data-tip-t（不弹浏览器原生提示），移开还回去
  let tip = null, tipEl = null, tipT = 0;
  const hide = () => {
    clearTimeout(tipT); if (tip) { tip.remove(); tip = null; }
    if (tipEl) { if (tipEl.dataset.tipT != null && !tipEl.hasAttribute('title')) tipEl.setAttribute('title', tipEl.dataset.tipT); delete tipEl.dataset.tipT; tipEl = null; }
  };
  const show = el => {
    const text = el.dataset.tip || el.dataset.tipT; if (!text || !el.isConnected) return;
    tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); tip.textContent = text;
    const k = el.dataset.key; if (k) { const s = document.createElement('span'); s.className = 'k'; s.textContent = k; tip.append(s); }
    document.body.append(tip);
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, vw = innerWidth, vh = innerHeight;
    let x = Math.round(Math.min(vw - w - 8, Math.max(8, r.left + r.width / 2 - w / 2))), y = Math.round(r.bottom + 8);
    if (y + h > vh - 8) { y = Math.round(r.top - 8 - h); tip.classList.add('at-above'); }
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    tip.style.setProperty('--ax', Math.round(Math.min(w - 16, Math.max(8, r.left + r.width / 2 - x - 4))) + 'px');
  };
  document.addEventListener('pointerover', e => {
    const el = e.target && e.target.closest ? e.target.closest('[title],[data-tip]') : null;
    if (el === tipEl) return; hide(); if (!el || el.closest('#iconDefs')) return;
    tipEl = el; if (el.hasAttribute('title')) { el.dataset.tipT = el.getAttribute('title'); el.removeAttribute('title'); }
    tipT = setTimeout(() => show(el), 450);
  }, true);
  document.addEventListener('pointerdown', hide, true);
  document.addEventListener('keydown', hide, true);
  window.addEventListener('blur', hide);
  document.addEventListener('pointerleave', hide);
})();
