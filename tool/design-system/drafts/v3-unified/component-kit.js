/* 仅增强显式 data-u-* 样板。没有配方、持久化、网络、导入或UE接口。 */
(() => {
  'use strict';
  const enhanced = new WeakSet();
  const dialogOpeners = new WeakMap();
  const menus = new Set();
  const query = (root, selector) => [...(root.matches?.(selector) ? [root] : []), ...root.querySelectorAll(selector)];

  function setFieldError(input, message, error) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (error) {
      error.textContent = message;
      error.hidden = !message;
      if (message && error.id) {
        const refs = new Set((input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
        refs.add(error.id); input.setAttribute('aria-describedby', [...refs].join(' '));
      }
    }
  }
  function openDialog(dialog, opener = document.activeElement) {
    if (!(dialog instanceof HTMLDialogElement) || dialog.open) return false;
    dialogOpeners.set(dialog, opener);
    dialog.addEventListener('close', () => {
      const target = dialogOpeners.get(dialog);
      if (target?.isConnected) target.focus();
      dialogOpeners.delete(dialog);
    }, {once:true});
    dialog.showModal(); return true;
  }
  function closeDialog(dialog, value = '') {
    if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close(value);
  }
  function enableOnce(node, setup) {
    if (enhanced.has(node)) return;
    enhanced.add(node); setup(node);
  }
  function setupSlider(group) {
    const range = group.querySelector('input[type="range"]');
    const number = group.querySelector('input[type="number"]');
    const error = group.querySelector('[data-u-slider-error]');
    if (!range || !number) return;
    let previous = number.value;
    const start = () => { previous = number.value; };
    range.addEventListener('pointerdown', start);
    range.addEventListener('focus', start);
    number.addEventListener('focus', start);
    const sync = source => {
      const valid = source.value !== '' && source.validity.valid;
      setFieldError(number, valid ? '' : `请输入 ${number.min}–${number.max} 范围内、步长为 ${number.step} 的数值。`, error);
      if (!valid) return false;
      (source === range ? number : range).value = source.value;
      number.classList.toggle('is-modified', number.value !== (number.defaultValue || '1'));
      return true;
    };
    range.addEventListener('input', () => sync(range));
    number.addEventListener('input', () => sync(number));
    const commit = source => {
      if (!sync(source) || previous === number.value) return;
      group.dispatchEvent(new CustomEvent('u:commit', {bubbles:true, detail:{previous, value:number.value}}));
      previous = number.value;
    };
    range.addEventListener('change', () => commit(range));
    number.addEventListener('change', () => commit(number));
    number.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); number.value = previous; sync(number);
    });
  }
  function setupSegments(group) {
    const buttons = [...group.querySelectorAll('button')];
    function select(button, moveFocus = false) {
      buttons.forEach(item => {
        const selected = item === button;
        item.setAttribute('aria-checked', String(selected)); item.tabIndex = selected ? 0 : -1;
      });
      if (moveFocus) button.focus();
      group.dispatchEvent(new CustomEvent('u:selection', {bubbles:true, detail:{value:button.dataset.value || button.textContent.trim()}}));
    }
    buttons.forEach(button => button.addEventListener('click', () => select(button)));
    group.addEventListener('keydown', event => {
      const available = buttons.filter(button => !button.disabled);
      const index = available.indexOf(event.target);
      if (index < 0) return;
      let next;
      if (['ArrowRight','ArrowDown'].includes(event.key)) next = (index + 1) % available.length;
      if (['ArrowLeft','ArrowUp'].includes(event.key)) next = (index + available.length - 1) % available.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = available.length - 1;
      if (next === undefined) return;
      event.preventDefault(); select(available[next], true);
    });
  }
  function setupMenu(details) {
    const summary = details.querySelector('summary');
    const enabled = () => [...details.querySelectorAll('[role="menuitem"]')].filter(item => !item.disabled);
    menus.add(details);
    details.querySelectorAll('[role="menuitem"]').forEach(item => { item.tabIndex = -1; });
    details.addEventListener('toggle', () => {
      summary?.setAttribute('aria-expanded', String(details.open));
      if (details.open && document.activeElement === summary) enabled()[0]?.focus();
    });
    details.addEventListener('keydown', event => {
      const items = enabled();
      if (!items.length) return;
      if (event.target === summary && ['ArrowDown','ArrowUp'].includes(event.key)) {
        event.preventDefault(); details.open = true;
        items[event.key === 'ArrowDown' ? 0 : items.length - 1].focus(); return;
      }
      if (event.key === 'Escape' && details.open) {
        event.preventDefault(); details.open = false; summary?.focus(); return;
      }
      if (event.key === 'Tab' && details.open) {
        const focusable = [...document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')]
          .filter(item => !item.disabled && item.tabIndex >= 0 && item.getClientRects().length && !details.contains(item));
        const before = focusable.filter(item => item.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING);
        const after = focusable.filter(item => item.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_PRECEDING);
        const target = event.shiftKey ? before.at(-1) : after[0];
        event.preventDefault(); details.open = false; (target || summary)?.focus(); return;
      }
      const index = items.indexOf(event.target);
      if (index < 0) return;
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % items.length;
      if (event.key === 'ArrowUp') next = (index + items.length - 1) % items.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = items.length - 1;
      if (next === undefined) return;
      event.preventDefault(); items[next].focus();
    });
    details.addEventListener('click', event => {
      if (!event.target.closest('[role="menuitem"]:not(:disabled)')) return;
      details.open = false; summary?.focus();
    });
    details.addEventListener('focusout', event => {
      if (!details.contains(event.relatedTarget)) details.open = false;
    });
  }
  function enhance(root = document) {
    query(root, '[data-u-slider]').forEach(node => enableOnce(node, setupSlider));
    query(root, '[data-u-segments]').forEach(node => enableOnce(node, setupSegments));
    query(root, '[data-u-menu]').forEach(node => enableOnce(node, setupMenu));
    window.FWIcons?.apply(root);
  }
  document.addEventListener('pointerdown', event => menus.forEach(details => {
    if (!details.isConnected) { menus.delete(details); return; }
    if (details.open && !details.contains(event.target)) details.open = false;
  }));
  window.UnifiedKit = Object.freeze({enhance, setFieldError, openDialog, closeDialog});
})();
