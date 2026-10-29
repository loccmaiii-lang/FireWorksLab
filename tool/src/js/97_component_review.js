// B 的组件适配只标记真实控件，不接管值、业务显隐、校验、撤销或保存。
(() => {
  'use strict';
  if (document.body?.dataset.ui !== 'material-b') return;
  const wrapped = new WeakSet();
  let queued = false;
  const structural = '#v5Tree button,.v5-seg button,.seg button,.mb-tabs button,#mbInspectModes button,.mb-inspect-layer,.li,.tier,.tile,.pk-card,.typebtn,.k,.fk,.pg-n,.ewhat,.tlb-n,.tlb-observe,.chip';
  function mark(node, kind) {
    if (node.dataset.mbComponent !== kind) node.dataset.mbComponent = kind;
  }
  function fill(input) {
    const low = Number(input.min), high = Number(input.max), value = Number(input.value);
    const ratio = high > low && Number.isFinite(value) ? Math.max(0, Math.min(100, (value - low) / (high - low) * 100)) : 0;
    const text = ratio.toFixed(3) + '%';
    if (input.style.getPropertyValue('--mb-fill') !== text) input.style.setProperty('--mb-fill', text);
  }
  function instant(input) {
    if (input.matches('.v5-sw,.fw-switch,[role="switch"]')) return true;
    if (input.closest('#lhLink,.lh-link,.lh-link-details,.my-link,#assetEmit,.mb-rt-observe-check')) return false;
    return input.matches('#autoBakeChk,#loopChk') || !!input.closest('#right label.check,#previewSettings label,#timeTools label,.tlchecks label,.scene label');
  }
  function icon(button, name) {
    const uri = window.FWTypeIconAssets?.[name]; if (!uri) return;
    let image = button.querySelector(':scope > .mb-action-icon');
    if (!image) {
      image = document.createElement('span'); image.className = 'mb-action-icon';
      image.setAttribute('aria-hidden', 'true'); button.replaceChildren(image);
    }
    image.style.setProperty('--mb-type-icon', 'url("' + uri + '")');
  }
  function controls(root = document) {
    root.querySelectorAll('button,summary,select,input,textarea,[role="button"]').forEach(node => {
      if (node.tagName === 'INPUT') {
        if (node.type === 'hidden' || node.type === 'file') return;
        if (node.type === 'range') { mark(node, 'slider'); fill(node); }
        else if (node.type === 'checkbox') {
          const toggle = instant(node);
          node.classList.toggle('mb-toggle', toggle); node.classList.toggle('mb-check', !toggle);
          mark(node, toggle ? 'switch' : 'checkbox');
          if (toggle && !node.hasAttribute('role')) node.setAttribute('role', 'switch');
        } else if (node.type === 'radio') { mark(node, 'radio'); node.classList.add('mb-radio'); }
        else mark(node, node.type === 'color' ? 'color' : 'input');
      } else if (node.tagName === 'SELECT') mark(node, 'select');
      else if (node.tagName === 'SUMMARY') mark(node, 'summary');
      else if (node.tagName === 'TEXTAREA') mark(node, 'textarea');
      else {
        const special = node.matches(structural);
        if (special) node.dataset.mbStructural = 'true';
        mark(node, node.matches('.rrst,.mreset,.lk,.shelp,.v5-ico,.v5-ic,.focus-reset') ? 'icon-button' : 'button');
      }
    });
    root.querySelectorAll('#right .sl').forEach(row => {
      if (row.querySelector(':scope > input[type="range"]') && row.querySelector(':scope > .num')) row.classList.add('mb-value-row');
      const label = row.querySelector(':scope > .k'), unit = row.querySelector(':scope > .punit');
      if (label && unit?.textContent.trim() === '×') {
        const text = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
        if (text && /\s*×\s*$/.test(text.nodeValue)) text.nodeValue = text.nodeValue.replace(/\s*×\s*$/, '');
      }
      // 层头/出生/材质等不在 panelRows 中，也要在原刷新之后同步轨道。
      if (!wrapped.has(row) && typeof row._refresh === 'function') {
        const original = row._refresh;
        row._refresh = function () {
          const result = original.apply(this, arguments); row.querySelectorAll('input[type="range"]').forEach(fill);
          row.querySelectorAll('.lk').forEach(button => icon(button, button.getAttribute('aria-pressed') === 'true' ? 'lock' : 'lock-open'));
          return result;
        };
        wrapped.add(row);
      }
    });
    root.querySelectorAll('#right .field').forEach(row => row.classList.add('mb-choice-row'));
    root.querySelectorAll('#right .num').forEach(node => node.classList.add('mb-value-number'));
    root.querySelectorAll('#right .punit').forEach(node => node.classList.add('mb-value-unit'));
    root.querySelectorAll('#right .rrst').forEach(node => node.classList.add('mb-value-reset'));
    root.querySelectorAll('#right .lk').forEach(button => icon(button, button.getAttribute('aria-pressed') === 'true' ? 'lock' : 'lock-open'));
    root.querySelectorAll('#right .shelp').forEach(button => icon(button, 'help-circle'));
    root.querySelectorAll('#right .rrst,#right .mreset').forEach(button => icon(button, 'arrow-back-up'));
  }
  function sync() { controls(); }
  function schedule() {
    if (queued) return; queued = true;
    setTimeout(() => { queued = false; sync(); }, 0);
  }
  function getState() {
    const counts = {}, unclassified = [];
    document.querySelectorAll('button,summary,select,input,textarea,[role="button"]').forEach(node => {
      if (node.matches('input[type="hidden"],input[type="file"]')) return;
      const kind = node.dataset.mbComponent;
      if (kind) counts[kind] = (counts[kind] || 0) + 1;
      else if (node.getClientRects().length) unclassified.push({ tag: node.tagName, id: node.id, type: node.type || '', name: (node.getAttribute('aria-label') || node.textContent || '').slice(0, 60) });
    });
    return { counts, unclassified, boundary: '仅当前B文档；系统文件/颜色选择器及嵌入导入器iframe内部不由父文档组件样式接管' };
  }
  function init() {
    sync();
    new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes].some(node => node.nodeType === Node.ELEMENT_NODE))) schedule();
    }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('input', event => { if (event.target.matches('input[type="range"]')) fill(event.target); }, true);
    document.addEventListener('change', schedule, true);
    document.addEventListener('click', schedule, true);
    document.addEventListener('toggle', schedule, true);
  }
  window.MaterialBComponents = Object.freeze({ sync, getState });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
