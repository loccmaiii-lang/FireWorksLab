/* 样板内存交互；不读取存档，不产生网络、文件或真实任务。 */
(() => {
  'use strict';
  const kit = window.UnifiedKit;
  const feedback = document.querySelector('#catalog-feedback');
  const say = message => { feedback.textContent = message; };
  kit.enhance(document);

  document.querySelectorAll('[data-catalog-density]').forEach(button => button.addEventListener('click', () => {
    document.body.dataset.density = button.dataset.catalogDensity;
    document.querySelectorAll('[data-catalog-density]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    say(`已切换${button.textContent}密度：字阶、行高和间距随同一基础变化。`);
  }));
  document.querySelectorAll('[data-catalog-action]').forEach(button => button.addEventListener('click', () => {
    say(`${button.dataset.catalogAction} · 仅界面演示，没有真实任务。`);
  }));
  const busy = document.querySelector('#busy-button');
  busy.addEventListener('click', () => {
    busy.disabled = true; busy.setAttribute('aria-busy', 'true'); busy.textContent = '处理中 · 示例';
    document.querySelector('#busy-caption').textContent = '演示进行中，当前不能重复触发。';
    setTimeout(() => {
      busy.disabled = false; busy.removeAttribute('aria-busy'); busy.textContent = '再次体验';
      document.querySelector('#busy-caption').textContent = '进行中状态演示结束，没有执行真实任务。';
      say('进行中状态演示结束；这不是烘焙、检查或导入成功。');
    }, 650);
  });

  const name = document.querySelector('#example-name');
  const nameError = document.querySelector('#name-error');
  const validateName = () => {
    name.classList.toggle('is-modified', name.value !== name.defaultValue);
    kit.setFieldError(name, name.value.trim() ? '' : '请填写示例名称；当前输入已保留。', nameError);
  };
  name.addEventListener('input', () => name.classList.toggle('is-modified', name.value !== name.defaultValue));
  name.addEventListener('blur', validateName);
  const search = document.querySelector('#sample-search');
  const items = ['节奏','层长','线条宽度'];
  search.addEventListener('input', () => {
    const matches = items.filter(item => item.includes(search.value.trim()));
    const list = document.querySelector('#sample-results'); list.replaceChildren();
    matches.forEach(item => { const li = document.createElement('li'); li.textContent = item; list.append(li); });
    document.querySelector('#search-result').textContent = matches.length ? `当前节点 · ${matches.length}项` : '当前节点 · 0项，没有匹配参数。清空搜索恢复全部。';
  });
  let commits = 0;
  document.querySelector('#sample-slider').addEventListener('u:commit', event => {
    commits += 1; document.querySelector('#slider-commits').textContent = `已提交${commits}次；上次 ${event.detail.previous} → ${event.detail.value}。`;
  });
  const parent = document.querySelector('#parent-check');
  const children = [...document.querySelectorAll('.child-check')];
  function updateChecks() {
    const count = children.filter(item => item.checked).length;
    parent.checked = count === children.length; parent.indeterminate = count > 0 && count < children.length;
    document.querySelector('#check-state').textContent = `${parent.indeterminate ? '混选' : parent.checked ? '全部选择' : '全部未选'} · 已选择${count}/2`;
  }
  children.forEach(item => item.addEventListener('change', updateChecks));
  parent.addEventListener('change', () => { children.forEach(item => { item.checked = parent.checked; }); updateChecks(); });
  updateChecks();
  document.querySelectorAll('[name="sample-framing"]').forEach(input => input.addEventListener('change', () => {
    document.querySelector('#radio-state').textContent = `当前选择：${input.value}`;
  }));
  document.querySelector('#sample-switch').addEventListener('change', event => {
    document.querySelector('#switch-state').textContent = `辅助线${event.target.checked ? '开启' : '关闭'}；不影响示例参数或导出。`;
  });
  document.querySelector('[data-u-segments]').addEventListener('u:selection', event => {
    document.querySelector('#segment-state').textContent = `当前选择：${event.detail.value}。观察示例不改变参数。`;
  });
  document.querySelector('#sample-select').addEventListener('change', event => {
    document.querySelector('#select-state').textContent = `当前选择：${event.target.selectedOptions[0].textContent}`;
  });
  const dialog = document.querySelector('#sample-dialog');
  document.querySelector('#dialog-open').addEventListener('click', event => kit.openDialog(dialog, event.currentTarget));
  document.querySelector('[data-dialog-close]').addEventListener('click', () => kit.closeDialog(dialog, 'cancel'));
  document.querySelector('#dialog-confirm').addEventListener('click', () => {
    const input = document.querySelector('#dialog-name');
    if (!input.value.trim()) { input.setCustomValidity('请填写示例名称。'); input.reportValidity(); return; }
    input.setCustomValidity(''); kit.closeDialog(dialog, 'confirm');
    say(`已确认页面内示例名称“${input.value}”；没有保存文件。`);
  });
  document.querySelector('#dialog-name').addEventListener('input', event => event.target.setCustomValidity(''));
})();
