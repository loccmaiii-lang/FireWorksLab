(function () {
  "use strict";
  let nextError = 0;
  const errors = new WeakMap();
  const dialogs = new WeakMap();
  const notifications = new WeakMap();

  function setFieldError(input, message) {
    let error = errors.get(input);
    if (!error && message) {
      if (!input.parentElement) throw new Error('Field must be attached to a parent');
      error = document.createElement('p');
      error.className = 'fw-field-error';
      error.id = 'fw-field-error-' + (++nextError);
      error.setAttribute('aria-live', 'polite');
      input.parentElement.append(error);
      errors.set(input, error);
    }
    const described = new Set((input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      error.textContent = message;
      error.hidden = false;
      described.add(error.id);
    } else {
      input.removeAttribute('aria-invalid');
      if (error) { error.hidden = true; error.textContent = ''; described.delete(error.id); }
    }
    if (described.size) input.setAttribute('aria-describedby', [...described].join(' '));
    else input.removeAttribute('aria-describedby');
  }

  function notify(host, message, action) {
    // Queue notifications so one undo opportunity cannot silently replace another.
    let queue = notifications.get(host);
    if (!queue) { queue = []; notifications.set(host, queue); }
    const item = {message, action, trigger: document.activeElement};
    queue.push(item);
    if (queue.length === 1) showNotification(host, queue);
  }

  function showNotification(host, queue) {
    host.replaceChildren();
    const item = queue[0];
    if (!item) return;
    const toast = document.createElement('div');
    toast.className = 'fw-toast';
    const message = document.createElement('p');
    message.className = 'fw-toast-message';
    message.setAttribute('role', 'status');
    message.textContent = item.message;
    toast.append(message);
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      const restore = toast.contains(document.activeElement);
      queue.shift();
      showNotification(host, queue);
      if (restore) {
        const next = host.querySelector('button');
        if (next) next.focus();
        else if (item.trigger && item.trigger.isConnected) item.trigger.focus();
      }
    }
    if (item.action) {
      const action = document.createElement('button');
      action.type = 'button'; action.className = 'fw-button'; action.textContent = item.action.label;
      action.addEventListener('click', () => { item.action.run(); finish(); });
      toast.append(action);
    }
    const dismiss = document.createElement('button');
    dismiss.type = 'button'; dismiss.className = 'fw-button fw-button--quiet'; dismiss.textContent = '关闭提示';
    dismiss.addEventListener('click', finish);
    toast.append(dismiss); host.append(toast);
  }

  function openDialog(dialog, trigger) {
    if (dialog.open) return;
    if (!dialogs.has(dialog)) {
      dialogs.set(dialog, null);
      dialog.addEventListener('close', () => {
        const owner = dialogs.get(dialog);
        if (owner && owner.isConnected) owner.focus();
      });
    }
    dialogs.set(dialog, trigger || document.activeElement);
    dialog.returnValue = '';
    dialog.showModal();
    const first = dialog.querySelector('[autofocus], button:not(:disabled), input:not(:disabled)');
    if (first) first.focus();
  }

  window.FWDesign = Object.freeze({setFieldError, notify, openDialog});
})();
