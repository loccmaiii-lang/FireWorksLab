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

  // E 4.1：样例页与正式参数面板共用。这里只管理关键点，数据格式和撤销由调用方负责。
  function createCurveEditor(host, {label = '倍率', value = [], onCommit}) {
    const copy = v => v.map(p => [+p[0], +p[1]]);
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const round = v => +v.toFixed(4);
    let stored = copy(value), points = [], selected = 0, drag = null, numericDrag = null, disabled = false;
    host.classList.add('fw-curve');
    host.innerHTML = '<div class="fw-curve-wrap"><div class="fw-curve-axis" aria-hidden="true"><span></span><span></span></div><div class="fw-curve-plot" aria-label="寿命曲线，拖动关键点，双击空白处加点"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="fw-curve-grid" d="M25 0V100M50 0V100M75 0V100M0 50H100M0 0H100M0 100H100"/><polyline/></svg><div class="fw-curve-points"></div></div></div><div class="fw-curve-read"><span class="fw-curve-count"></span><label>寿命<input type="text" inputmode="decimal" data-axis="0" aria-label="关键点寿命百分比"><span>%</span></label><label><span class="fw-curve-label"></span><input type="text" inputmode="decimal" data-axis="1"><span>倍</span></label></div><span class="fw-curve-error" role="status" hidden></span>';
    host.querySelector('.fw-curve-label').textContent = label;
    const plot = host.querySelector('.fw-curve-plot'), dots = host.querySelector('.fw-curve-points');
    const inputs = [...host.querySelectorAll('input')], count = host.querySelector('.fw-curve-count');
    inputs[1].setAttribute('aria-label', '关键点' + label + '倍数');
    const error = host.querySelector('.fw-curve-error');
    const extent = () => [Math.min(0, ...points.map(p => p[1])), Math.max(1, ...points.map(p => p[1]))];
    function clearError() { error.hidden = true; inputs.forEach(i => i.removeAttribute('aria-invalid')); }
    function bounds(i) {
      // 端点为 0 / 1 时固定寿命；旧存档中非边界的首末点保留原位置和编辑能力。
      const x = points[i][0];
      if ((i === 0 && x === 0) || (i === points.length - 1 && x === 1)) return [x, x];
      return [i ? points[i - 1][0] + .0001 : 0, i < points.length - 1 ? points[i + 1][0] - .0001 : 1];
    }
    function draw(focus = false) {
      selected = clamp(selected, 0, points.length - 1);
      const [lo, hi] = drag ? drag.extent : extent(), Y = y => (1 - (y - lo) / (hi - lo)) * 100;
      const extended = [[0, points[0][1]], ...points, [1, points[points.length - 1][1]]];
      plot.querySelector('polyline').setAttribute('points', extended.map(p => p[0] * 100 + ',' + Y(p[1])).join(' '));
      const axes = host.querySelectorAll('.fw-curve-axis span'); axes[0].textContent = round(hi); axes[1].textContent = round(lo);
      while (dots.children.length > points.length) dots.lastElementChild.remove();
      while (dots.children.length < points.length) {
        const dot = document.createElement('button'); dot.type = 'button'; dot.className = 'fw-curve-point'; dots.append(dot);
      }
      [...dots.children].forEach((dot, i) => {
        const p = points[i]; dot.dataset.index = i; dot.style.left = p[0] * 100 + '%'; dot.style.top = Y(p[1]) + '%';
        dot.classList.toggle('is-selected', i === selected); dot.setAttribute('aria-pressed', String(i === selected));
        dot.setAttribute('aria-label', `关键点 ${i + 1}，寿命 ${round(p[0] * 100)}%，${label} ${p[1]} 倍`);
        dot.title = '拖动调整；方向键微调；Shift 加速；Delete 删除中间点；Esc 取消拖动'; dot.disabled = disabled;
      });
      count.textContent = `关键点 ${selected + 1}/${points.length}`;
      const p = points[selected];
      inputs.forEach((input, i) => { if (document.activeElement !== input) input.value = round(p[i] * (i ? 1 : 100)); input.disabled = disabled; });
      if (focus) dots.children[selected].focus({preventScroll: true});
    }
    function load(v) {
      stored = copy(v || []); points = stored.length ? copy(stored) : [[0, 1], [1, 1]];
      clearError(); draw();
    }
    function commit(before) {
      if (same(before, points)) return;
      const next = copy(points);
      if (onCommit(next) === false) { load(stored); return; }
      stored = next; clearError(); draw();
    }
    function pick(e) {
      const r = plot.getBoundingClientRect(), [lo, hi] = drag ? drag.extent : extent();
      return [round(clamp((e.clientX - r.left) / r.width, 0, 1)), round(clamp(hi - (e.clientY - r.top) / r.height * (hi - lo), lo, hi))];
    }
    plot.addEventListener('pointerdown', e => {
      const dot = e.target.closest('.fw-curve-point'); if (!dot || disabled || e.button !== 0) return;
      e.preventDefault(); selected = +dot.dataset.index;
      drag = {id: e.pointerId, before: copy(points), extent: extent(), x0: e.clientX};
      plot.setPointerCapture(e.pointerId); draw(true);
    });
    plot.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      const p = pick(e), [lo, hi] = bounds(selected);
      p[0] = Math.abs(e.clientX - drag.x0) < 3 ? drag.before[selected][0] : round(clamp(p[0], lo, hi));
      points[selected] = p; draw();
    });
    function finish(cancel) {
      if (!drag) return;
      const d = drag; drag = null;
      if (plot.hasPointerCapture(d.id)) plot.releasePointerCapture(d.id);
      if (cancel) points = d.before; else commit(d.before);
      draw(true);
    }
    function finishNumber(cancel) {
      if (!numericDrag) return;
      const d = numericDrag; numericDrag = null;
      if (d.input.hasPointerCapture(d.id)) d.input.releasePointerCapture(d.id);
      d.input.classList.remove('is-dragging');
      if (cancel) points = d.before; else if (d.moved) commit(d.before);
      draw();
      if (!d.moved && !cancel) { d.input.focus(); d.input.select(); }
    }
    plot.addEventListener('pointerup', () => finish(false));
    plot.addEventListener('pointercancel', () => finish(true));
    plot.addEventListener('lostpointercapture', () => { if (drag) finish(true); });
    plot.addEventListener('dblclick', e => {
      if (disabled || e.target.closest('.fw-curve-point')) return;
      e.preventDefault(); const p = pick(e);
      const near = points.findIndex(v => Math.abs(v[0] - p[0]) < .0001);
      if (near >= 0) { selected = near; draw(true); return; }
      const before = copy(points); points.push(p); points.sort((a, b) => a[0] - b[0]); selected = points.indexOf(p); commit(before); draw(true);
    });
    host.addEventListener('keydown', e => {
      if (e.key === 'Escape' && (drag || numericDrag)) { e.preventDefault(); e.stopPropagation(); finish(true); finishNumber(true); return; }
      const dot = e.target.closest('.fw-curve-point'); if (!dot || disabled) return;
      selected = +dot.dataset.index; const before = copy(points), p = points[selected], step = e.shiftKey ? .1 : .01;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault(); e.stopPropagation();
        if (selected === 0 || selected === points.length - 1 || points.length <= 2) return;
        points.splice(selected, 1); selected--;
      } else if (/^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
        e.preventDefault(); e.stopPropagation(); const [lo, hi] = bounds(selected);
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') p[0] = round(clamp(p[0] + (e.key === 'ArrowLeft' ? -step : step), lo, hi));
        else p[1] = round(Math.max(extent()[0], p[1] + (e.key === 'ArrowDown' ? -step : step)));
      } else return;
      commit(before); draw(true);
    });
    for (const input of inputs) {
      const axis = +input.dataset.axis;
      input.title = '单击输入，横向拖动调整，Shift 精调，Esc 取消';
      input.addEventListener('pointerdown', e => {
        if (disabled || e.button !== 0 || document.activeElement === input) return;
        e.preventDefault(); numericDrag = {input, axis, id: e.pointerId, x0: e.clientX, before: copy(points), moved: false, anchor: points[selected][axis], shift: e.shiftKey};
        input.setPointerCapture(e.pointerId);
      });
      input.addEventListener('pointermove', e => {
        const d = numericDrag; if (!d || d.input !== input || e.pointerId !== d.id) return;
        const dx = e.clientX - d.x0; if (!d.moved && Math.abs(dx) < 3) return;
        d.moved = true; input.classList.add('is-dragging');
        if (d.shift !== e.shiftKey) { d.shift = e.shiftKey; d.x0 = e.clientX; d.anchor = points[selected][axis]; return; }
        const step = (axis ? .01 : .001) * (e.shiftKey ? .1 : 1), limits = axis ? [Math.min(0, ...points.map(p => p[1])), Infinity] : bounds(selected);
        points[selected][axis] = round(clamp(d.anchor + dx * step, ...limits)); draw();
      });
      input.addEventListener('pointerup', () => finishNumber(false));
      input.addEventListener('pointercancel', () => finishNumber(true));
      input.addEventListener('lostpointercapture', () => { if (numericDrag) finishNumber(true); });
      function valid() {
        const text = input.value.trim(), n = Number(text) / (axis ? 1 : 100), b = bounds(selected);
        const ok = /^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(text) && Number.isFinite(n) && (axis ? n >= Math.min(0, ...points.map(p => p[1])) : n >= b[0] && n <= b[1]);
        input.setAttribute('aria-invalid', String(!ok)); error.hidden = ok;
        if (!ok) error.textContent = axis ? '请输入有效的倍率' : `寿命范围 ${round(b[0] * 100)}–${round(b[1] * 100)} %`;
        return ok ? n : null;
      }
      function submit() {
        const v = valid(); if (v === null) return false;
        const before = copy(points); points[selected][axis] = round(v); commit(before); return true;
      }
      input.addEventListener('input', valid);
      input.addEventListener('change', submit);
      input.addEventListener('blur', () => { input.value = round(points[selected][axis] * (axis ? 1 : 100)); clearError(); });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (submit()) input.blur(); }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); input.value = round(points[selected][axis] * (axis ? 1 : 100)); clearError(); input.blur(); }
      });
    }
    load(value);
    return {
      setValue(v) { if (!drag && !numericDrag && !same(stored, v || [])) load(v || []); },
      setDisabled(v) { disabled = !!v; if (disabled) { finish(true); finishNumber(true); } draw(); },
      getValue() { return copy(stored); }
    };
  }

  window.FWDesign = Object.freeze({setFieldError, notify, openDialog, createCurveEditor});
})();
