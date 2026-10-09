(function () {
  "use strict";
  const byId = id => document.getElementById(id);
  const notice = byId('notice-host');
  FWIcons.apply();

  document.querySelectorAll('[data-density-choice]').forEach(button => {
    button.addEventListener('click', () => {
      document.body.dataset.density = button.dataset.densityChoice;
      document.querySelectorAll('[data-density-choice]').forEach(peer => {
        peer.setAttribute('aria-pressed', String(peer === button));
      });
    });
  });

  const nameInput = byId('resource-name');
  nameInput.addEventListener('input', () => {
    FWDesign.setFieldError(nameInput, ''); byId('name-result').textContent = '';
  });
  byId('sample-form').addEventListener('submit', event => {
    event.preventDefault();
    const valid = /^[A-Za-z][A-Za-z0-9_]{0,47}$/.test(nameInput.value);
    FWDesign.setFieldError(nameInput, valid ? '' : '请输入字母开头的英文名，仅含字母、数字、下划线，最多48字符。');
    byId('name-result').textContent = valid ? '示例名称通过校验；未检查磁盘或 UE 重名。' : '';
    if (!valid) nameInput.focus();
  });

  const slider = byId('duration-slider');
  const number = byId('duration-number');
  const history = [];
  let committed = 6;
  let current = 6;
  function paintDuration(value) {
    current = value;
    slider.value = String(value); number.value = String(value);
    byId('duration-summary').textContent = value.toFixed(1) + ' s';
    byId('duration-undo').disabled = !history.length;
    FWDesign.setFieldError(number, '');
  }
  function commit(value) {
    if (value !== committed) { history.push(committed); committed = value; }
    paintDuration(value);
  }
  slider.addEventListener('input', () => paintDuration(Number(slider.value)));
  slider.addEventListener('change', () => commit(current));
  function commitNumber() {
    const value = Number(number.value);
    if (!number.value.trim() || !Number.isFinite(value) || value < 1 || value > 12 || Math.abs(value * 10 - Math.round(value * 10)) > 1e-7) {
      FWDesign.setFieldError(number, '请输入1–12之间的数，步长0.1秒。'); return;
    }
    commit(value);
  }
  number.addEventListener('change', commitNumber);
  number.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); commitNumber(); } });
  byId('duration-reset').addEventListener('click', () => commit(6));
  byId('duration-undo').addEventListener('click', () => {
    if (!history.length) return;
    committed = history.pop(); paintDuration(committed);
  });

  const resources = [{id: 'example-001', name: 'Golden_Peony', revision: 'example-r003', selected: true}];
  const selection = byId('sample-select');
  function paintResources() {
    const list = byId('sample-list'); list.replaceChildren();
    byId('empty-list').hidden = resources.length !== 0;
    selection.disabled = !resources.length;
    selection.checked = resources.length ? resources[0].selected : false;
    resources.forEach(resource => {
      const row = document.createElement('div'); row.className = 'fw-resource'; row.dataset.selected = String(resource.selected); row.dataset.resourceId = resource.id;
      const content = document.createElement('div');
      const name = document.createElement('p'); name.className = 'fw-resource-name'; name.textContent = resource.name;
      const meta = document.createElement('p'); meta.className = 'fw-helper'; meta.textContent = resource.revision + ' · 示例资源'; content.append(name, meta);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'fw-button fw-button--danger'; remove.textContent = '移除示例';
      remove.addEventListener('click', () => {
        const index = resources.indexOf(resource); if (index < 0) return;
        resources.splice(index, 1); paintResources();
        FWDesign.notify(notice, '已移除示例资源 ' + resource.name, {label: '撤销移除', run() {
          resources.splice(index, 0, resource); paintResources();
          byId('sample-list').querySelector('button').focus();
        }});
        notice.querySelector('button').focus();
      });
      row.append(content, remove); list.append(row);
    });
  }
  selection.addEventListener('change', () => { if (resources[0]) resources[0].selected = selection.checked; paintResources(); });
  paintResources();
  byId('show-notice').addEventListener('click', () => FWDesign.notify(notice, '提示样板：未操作本机文件或 UE。'));
  const dialog = byId('review-dialog');
  byId('open-review').addEventListener('click', event => FWDesign.openDialog(dialog, event.currentTarget));
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'confirm') FWDesign.notify(notice, '已确认样板；未执行资源导入。');
  });
  dialog.addEventListener('cancel', () => { dialog.returnValue = 'cancel'; });
})();
