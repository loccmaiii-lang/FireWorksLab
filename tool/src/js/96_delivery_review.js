// B 评审的贴图与交付工作区：共用原预览与清单，只保存布局偏好。
(() => {
  'use strict';
  if (document.body?.dataset.ui !== 'material-b') return;
  const oldSelect = selectStageView, oldToggle = toggleDeliv, oldTabs = syncStageTabs;
  const oldRender = renderDeliv, oldLowReplay = showLowReplay;
  let mode = store.get('mbInspectMode', 'atlas') === 'export' ? 'export' : 'atlas';
  let collapsed = false, split = null, modes = null, stage = null;
  let width = Number(store.get('mbDeliveryWidth', 0)) || 0;

  function bounds() {
    const css = stage && getComputedStyle(stage);
    const available = stage ? stage.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) : 900;
    return { min: Math.min(320, available * .45), max: Math.max(320, available * .6) };
  }
  function resize(value, save = false) {
    if (!stage || !split) return;
    const { min, max } = bounds();
    const wanted = value || Math.min(420, Math.max(320, (max / .6) * .3));
    const current = Math.round(Math.max(min, Math.min(max, wanted)));
    stage.style.setProperty('--mb-delivery-width', current + 'px');
    split.setAttribute('aria-valuemin', String(Math.round(min)));
    split.setAttribute('aria-valuemax', String(Math.round(max)));
    split.setAttribute('aria-valuenow', String(current));
    split.setAttribute('aria-valuetext', '交付清单宽 ' + current + ' 像素');
    if (save) { width = current; store.set('mbDeliveryWidth', width); }
    boxRectAt = -1e9;
  }
  function sync() {
    if (!stage || !modes || !split) return;
    const on = !!stage2.deliv;
    stage.classList.toggle('mb-flow-workspace', on && mode === 'atlas');
    stage.classList.toggle('mb-delivery-workspace', on && mode === 'export');
    stage.classList.toggle('mb-delivery-collapsed', on && collapsed);
    stage2.inspectFlow = on && mode === 'atlas';
    modes.hidden = !on; split.hidden = !on || collapsed;
    modes.querySelectorAll('[data-mb-inspect]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.mbInspect === mode));
    });
    const show = document.getElementById('mbDeliveryShow');
    show.hidden = !on || !collapsed;
    const close = document.getElementById('dvBack');
    if (close) { close.textContent = '收起清单'; close.title = '收起清单，继续查看贴图或回放'; }
    document.querySelectorAll('[data-mb-inspect-layer]').forEach(button => {
      const current = mode === 'atlas' && +button.dataset.mbInspectLayer === comboAtlasLayer();
      button.setAttribute('aria-current', String(current));
    });
    window.MaterialBReview?.sync();
  }
  function layerLinks() {
    if (state.tab !== 'combo') return;
    // prodTableHTML 与原层顺序相同，包括关眼睛/未烘焙行，不依赖是否有产物下拉。
    document.querySelectorAll('#delivView .dv-prod tbody > tr').forEach((row, index) => {
      const cell = row.cells[0]; if (!cell || !state.layers[index] || cell.querySelector('[data-mb-inspect-layer]')) return;
      const button = document.createElement('button'); button.type = 'button';
      button.dataset.mbInspectLayer = String(index); button.className = 'mb-inspect-layer';
      button.title = '查看这一层的贴图；不改变配方或输出';
      button.setAttribute('aria-label', '查看第 ' + (index + 1) + ' 层贴图：' + layerName(index));
      const names = [...cell.childNodes].filter(node => node.nodeType === Node.TEXT_NODE);
      cell.prepend(button); names.forEach(node => button.appendChild(node));
      button.addEventListener('click', () => { selectComboLayer(index); preview('atlas'); });
    });
  }
  function preview(next) {
    mode = next === 'export' ? 'export' : 'atlas';
    store.set('mbInspectMode', mode);
    state.view = mode;
    if (mode === 'atlas') { state.atlasFlow = true; flowTrail.length = 0; $('#qlabels').dataset.key = ''; }
    bakeIfStale(); syncStale(); syncStageTabs(); sync();
  }
  function enter(next = mode) {
    collapsed = false;
    oldToggle(true); preview(next); resize(width);
  }
  // 原交付入口、命名跳转也进入同一工作区；旧关闭命令仍能离开。
  toggleDeliv = function (on) {
    const open = on == null ? !stage2.deliv : on;
    if (open) enter();
    else { oldToggle(false); stage2.inspectFlow = false; sync(); }
  };
  selectStageView = function (view) {
    if (view === 'flow' || view === 'delivery') { enter(); return; }
    oldSelect.apply(this, arguments); sync();
  };
  syncStageTabs = function () {
    const result = oldTabs.apply(this, arguments);
    if (stage2.deliv) document.querySelectorAll('#viewSeg [data-view]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.view === 'flow'));
    });
    return result;
  };
  renderDeliv = function () { const result = oldRender.apply(this, arguments); layerLinks(); sync(); return result; };
  showLowReplay = function () {
    if (stage2.deliv) { preview('export'); return; }
    return oldLowReplay.apply(this, arguments);
  };
  function init() {
    stage = document.querySelector('.stage');
    const controls = document.querySelector('#viewFrame .preview-controls');
    if (!stage || !controls) return;
    const flow = document.querySelector('#viewSeg [data-view="flow"]');
    flow.textContent = '贴图与交付'; flow.title = '当前帧、整张贴图、流转曲线和同源交付清单';
    document.getElementById('abDeliv').hidden = true;
    modes = document.createElement('div'); modes.id = 'mbInspectModes'; modes.setAttribute('role', 'group');
    modes.setAttribute('aria-label', '贴图与交付中的预览');
    [['export', '引擎回放'], ['atlas', '贴图流转']].forEach(([value, name]) => {
      const button = document.createElement('button'); button.type = 'button';
      button.dataset.mbInspect = value; button.textContent = name;
      button.addEventListener('click', () => preview(value)); modes.appendChild(button);
    });
    const show = document.createElement('button'); show.id = 'mbDeliveryShow'; show.type = 'button';
    show.className = 'btn mini'; show.textContent = '显示清单';
    show.addEventListener('click', () => { collapsed = false; sync(); resize(width); });
    controls.prepend(modes); modes.after(show);
    split = document.createElement('div'); split.id = 'mbDeliverySplit'; split.tabIndex = 0;
    split.setAttribute('role', 'separator'); split.setAttribute('aria-orientation', 'vertical');
    split.setAttribute('aria-label', '预览与交付清单宽度');
    split.title = '拖动调整宽度；← → 键微调；Home / End 到边界；双击复位';
    document.getElementById('viewFrame').after(split);
    let startX = 0, startWidth = 0;
    split.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault(); startX = event.clientX;
      startWidth = document.getElementById('delivView').getBoundingClientRect().width;
      split.setPointerCapture(event.pointerId); split.setAttribute('aria-grabbed', 'true');
      document.body.classList.add('mb-delivery-dragging');
    });
    split.addEventListener('pointermove', event => {
      if (split.hasPointerCapture(event.pointerId)) resize(startWidth + startX - event.clientX);
    });
    const finish = event => {
      if (!split.hasPointerCapture(event.pointerId)) return;
      split.releasePointerCapture(event.pointerId); split.removeAttribute('aria-grabbed');
      document.body.classList.remove('mb-delivery-dragging');
      resize(Number(split.getAttribute('aria-valuenow')), true);
    };
    split.addEventListener('pointerup', finish); split.addEventListener('pointercancel', finish);
    split.addEventListener('dblclick', () => { width = 0; store.set('mbDeliveryWidth', 0); resize(0); });
    split.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const { min, max } = bounds();
      const value = Number(split.getAttribute('aria-valuenow'));
      resize(event.key === 'Home' ? min : event.key === 'End' ? max : value + (event.key === 'ArrowLeft' ? 16 : -16), true);
    });
    document.getElementById('delivView').addEventListener('click', event => {
      if (!stage2.deliv || !event.target.closest('#dvBack')) return;
      event.preventDefault(); event.stopImmediatePropagation(); collapsed = true; sync();
    }, true);
    new MutationObserver(sync).observe(document.getElementById('delivView'), { childList: true });
    new ResizeObserver(() => { if (stage2.deliv) resize(width); }).observe(stage);
    sync(); resize(width);
  }
  window.MaterialBDeliveryReview = Object.freeze({ getState: () => ({ mode, collapsed, width, active: stage2.deliv }) });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
