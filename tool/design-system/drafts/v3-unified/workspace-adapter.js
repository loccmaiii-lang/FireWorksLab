/* 候选薄适配：只绑定统一控件角色，不取代Demo的值、历史和保存控制器。 */
(() => {
  'use strict';
  const actions = {undo:'撤销示例修改',redo:'重做示例修改',play:'播放时间演示',rewind:'时间归零'};
  function enhance(root = document) {
    root.querySelectorAll('button').forEach(button => {
      if (button.matches('.tree-name,.tree-toggle,.tree-action,.library-item,.timeline-clip')) {
        button.classList.add('u-domain-action');
        return;
      }
      button.classList.add('u-button');
      if(button.matches('.btn-primary,.btn-play')) button.classList.add('u-primary');
      if(button.matches('.btn-ghost')) button.classList.add('u-quiet');
      if(button.matches('.icon-button')) button.classList.add('u-icon');
      if(button.matches('.row-action')) button.classList.add('u-inline');
      if(button.closest('.segmented')) button.classList.add('u-segment');
      if(actions[button.dataset.demoAction] && !button.hasAttribute('aria-label')) button.setAttribute('aria-label',actions[button.dataset.demoAction]);
      if(button.disabled && button.title && !button.getAttribute('aria-describedby')) {
        button.dataset.unavailableReason = button.title;
      }
    });
    root.querySelectorAll('input,textarea').forEach(input => {
      input.classList.add(input.type==='range'?'u-slider':input.type==='checkbox'?'u-checkbox':input.type==='radio'?'u-radio':'u-input');
    });
    root.querySelectorAll('select').forEach(select=>select.classList.add('u-select'));
    root.querySelectorAll('summary').forEach(summary=>summary.classList.add('u-summary'));
    root.querySelectorAll('.observation-menu>summary').forEach(summary=>summary.classList.add('u-button','u-inline','u-quiet'));
    root.querySelectorAll('.helper,.field-help').forEach(node=>node.classList.add('u-help'));
    root.querySelectorAll('.demo-param-error,.param-row-help.status-error').forEach(node=>node.classList.add('u-field-error'));
    root.querySelectorAll('.parameter-grid[data-param-row]').forEach(row=>{
      row.querySelectorAll('.row-action').forEach((button,index)=>button.dataset.uRowAction=String(index));
    });
    if(root.matches?.('dialog')) root.classList.add('u-dialog');
    window.UnifiedKit?.enhance(root);
  }
  window.UnifiedWorkspace = Object.freeze({enhance});
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-u-open-catalog]');
    if(button){event.preventDefault();event.stopImmediatePropagation();location.href='components.html';}
  },true);
  document.addEventListener('DOMContentLoaded',()=>enhance(document));
})();
