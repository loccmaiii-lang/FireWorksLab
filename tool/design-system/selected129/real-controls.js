// 完整129的组件交互补充：只补真实树菜单键盘，不接管业务动作或参数。
(() => {
  let anchor = null;
  document.addEventListener('click', event => {
    const button = event.target.closest('#v5Tree [data-act="menu"]');
    if (button) anchor = button;
  }, true);
  document.addEventListener('keydown', event => {
    const menu = event.target.closest('#v5Pop[role="menu"]');
    if (!menu || !menu.matches(':popover-open')) return;
    const items = [...menu.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    if (!items.length) return;
    const index = items.indexOf(document.activeElement);
    let next = null;
    if (event.key === 'ArrowDown') next = items[(index + 1) % items.length];
    if (event.key === 'ArrowUp') next = items[(index - 1 + items.length) % items.length];
    if (event.key === 'Home') next = items[0];
    if (event.key === 'End') next = items[items.length - 1];
    if (next) {
      event.preventDefault(); event.stopPropagation(); next.focus();
    } else if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); menu.hidePopover();
      if (anchor?.isConnected) anchor.focus();
    }
  });
})();
