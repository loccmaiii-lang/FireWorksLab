/* 草稿 C：先扫描参数差异，再在当前行下精调。状态、值和历史由共用外壳持有。 */
(() => {
  'use strict';

  const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const valueAt = (values, param) => own(values, param.id) ? values[param.id] : param.default;
  const same = (a, b) => typeof a === 'number' && typeof b === 'number'
    ? Object.is(a, b) || a === b
    : String(a ?? '') === String(b ?? '');
  const domId = value => `ledger-${Array.from(String(value), char => char.codePointAt(0).toString(16)).join('-')}`;

  function readable(value, param) {
    if (typeof value === 'boolean') return value ? '开启' : '关闭';
    if (value === null || value === undefined || value === '') return '—';
    if (Array.isArray(value)) return value.join(' · ');
    if (typeof value === 'object') return JSON.stringify(value);
    const option = param.options?.find?.(item => String(item.value ?? item.id ?? item) === String(value));
    return String(option?.label ?? option?.name ?? value);
  }

  function sourceText(source) {
    if (typeof source === 'string') return source;
    if (Array.isArray(source)) return source.map(sourceText).join('\n');
    if (source && typeof source === 'object') return [source.file && `${source.file}${source.line ? `:${source.line}` : ''}`, source.role].filter(Boolean).join(' · ');
    return '';
  }

  function render(ctx) {
    const esc = ctx.escape;
    const params = Array.isArray(ctx.params) ? ctx.params : [];
    const groups = Array.isArray(ctx.groups) ? ctx.groups : [];
    const initial = ctx.initialValues || {};
    const values = ctx.values || {};
    const saved = ctx.savedValues || initial;
    const errorFor = param => ctx.errors?.[param.id] || '';
    const changed = param => !same(valueAt(values, param), valueAt(initial, param));
    const unsaved = param => !same(valueAt(values, param), valueAt(saved, param));
    const query = String(ctx.search || '').trim().toLocaleLowerCase();
    const activeGroup = ctx.activeGroup || 'all';
    const matches = param => (!query || [param.label, param.en, param.id, param.help, param.unit]
      .some(value => String(value || '').toLocaleLowerCase().includes(query)))
      && (!ctx.onlyChanged || changed(param));
    const available = params.filter(matches);
    const visible = available.filter(param => activeGroup === 'all' || param.group === activeGroup);
    const selectedId = typeof ctx.selectedParam === 'object' ? ctx.selectedParam?.id : ctx.selectedParam;
    const nodeName = ctx.selectedNode?.name || '当前对象';
    const selected = visible.find(param => param.id === selectedId);
    const changedCount = params.filter(changed).length;
    const errorCount = params.filter(param => errorFor(param)).length;
    const groupLabel = id => groups.find(group => group.id === id)?.label || id || '其他参数';

    function groupButton(group) {
      const count = available.filter(param => param.group === group.id).length;
      return `<button type="button" class="ledger-group" data-group="${esc(group.id)}" aria-pressed="${activeGroup === group.id}" title="${esc(group.description || `查看${group.label}参数`)}"><span>${esc(group.label)}</span><span class="ledger-group-count">${count}</span></button>`;
    }

    function detail(param) {
      const key = domId(param.id);
      const minmax = [param.min, param.max].every(value => value !== undefined && value !== null)
        ? `${readable(param.min, param)}–${readable(param.max, param)}${param.unit ? ` ${param.unit}` : ''}` : '';
      const hasStep = param.step !== undefined && param.step !== null;
      const initialText = `${readable(valueAt(initial, param), param)}${param.unit ? ` ${param.unit}` : ''}`;
      return `<tr class="ledger-detail-row"><td colspan="4"><section class="ledger-detail" id="${key}-detail" aria-labelledby="${key}-detail-title">
        <div class="ledger-detail-top"><h4 id="${key}-detail-title"><span class="ledger-detail-kicker">精调</span>${esc(param.label)}</h4><span class="ledger-detail-mode">${changed(param) ? '相对原配方已改' : '相对原配方未改'}</span></div>
        <div class="ledger-detail-field">${ctx.renderField(param, {hideLabel:true, hideMeta:true, instance:'ledger-detail'})}</div>
        ${(minmax || hasStep) ? `<p class="ledger-range">${minmax ? `<span>滑杆 ${esc(minmax)}</span>` : ''}${hasStep ? `<span>增量 ${esc(param.step)}</span>` : ''}<span>原配方 ${esc(initialText)}</span></p>` : ''}
        <p class="ledger-detail-help" id="${key}-help">${esc(param.help || '修改只作用于上方选中的当前对象。')}</p>
        ${param.source ? `<details class="ledger-provenance"><summary>查看参数来源</summary><p class="ledger-source">${esc(sourceText(param.source))}</p></details>` : ''}
        ${unsaved(param) ? '<p class="ledger-save-note">当前值尚未保存到本 Demo。</p>' : ''}
      </section></td></tr>`;
    }

    function row(param) {
      const key = domId(param.id);
      const isSelected = selected?.id === param.id;
      const isChanged = changed(param);
      const error = errorFor(param);
      const initialText = readable(valueAt(initial, param), param);
      return `<tr class="ledger-row${isSelected ? ' is-selected' : ''}${isChanged ? ' is-changed' : ''}${error ? ' has-error' : ''}" data-ledger-param="${esc(param.id)}">
        <th scope="row" id="${key}-name"><button type="button" class="ledger-param-name" data-select-param="${esc(param.id)}" aria-pressed="${isSelected}" aria-label="${esc(`精调${param.label}`)}"${isSelected ? ` aria-controls="${key}-detail"` : ''}><span class="ledger-expand" aria-hidden="true">${ctx.icon('expand')}</span><span class="ledger-param-label">${esc(param.label)}${ctx.english && param.en ? `<span class="ledger-param-en" lang="en">${esc(param.en)}</span>` : ''}</span></button></th>
        <td class="ledger-reference" headers="ledger-col-reference ${key}-name"><span class="ledger-mobile-label" aria-hidden="true">原配方</span><span class="ledger-reference-number" title="${esc(initialText)}">${esc(initialText)}</span>${param.unit ? `<span class="ledger-unit">${esc(param.unit)}</span>` : ''}</td>
        <td class="ledger-current" headers="ledger-col-current ${key}-name"><span class="ledger-mobile-label" aria-hidden="true">当前值</span><div class="ledger-cell-field">${ctx.renderField(param, {numericOnly:true, hideLabel:true, hideMeta:true, instance:'ledger-cell'})}</div></td>
        <td class="ledger-state" headers="ledger-col-state ${key}-name"><span class="ledger-change-label">${error ? '需修正' : isChanged ? '已改' : '未改'}</span>${isChanged ? `<button type="button" class="ledger-reset" data-reset-param="${esc(param.id)}" aria-label="${esc(`恢复${param.label}到原配方 ${initialText}${param.unit ? ` ${param.unit}` : ''}`)}" title="恢复到原配方">${ctx.icon('undo')}</button>` : ''}</td>
      </tr>${error ? `<tr class="ledger-error-row"><td colspan="4"><p class="ledger-error" id="${key}-error" role="status">${esc(param.label)}：${esc(typeof error === 'string' ? error : error.message || String(error))}</p></td></tr>` : ''}${isSelected ? detail(param) : ''}`;
    }

    const body = [...new Set(visible.map(param => param.group))].map(groupId => {
      const groupParams = visible.filter(param => param.group === groupId);
      const count = groupParams.filter(changed).length;
      const headingId = domId(`group-${groupId}`);
      return `<tbody aria-labelledby="${headingId}"><tr class="ledger-group-row"><th id="${headingId}" colspan="4" scope="rowgroup"><span>${esc(groupLabel(groupId))}</span><span class="ledger-group-summary">${groupParams.length} 项${count ? ` · ${count} 项已改` : ''}</span></th></tr>${groupParams.map(row).join('')}</tbody>`;
    }).join('');

    return `<div class="ledger-panel">
      <div class="ledger-intro"><h3>参数对照</h3><span class="ledger-overview-count">${changedCount}<span>${query || ctx.onlyChanged ? ' 项筛选内改动' : ' 项已改'}</span>${errorCount ? `<span class="ledger-overview-error"> · ${errorCount} 项需修正</span>` : ''}</span></div>
      <div class="ledger-scan"><nav class="ledger-groups" aria-label="参数分组"><button type="button" class="ledger-group" data-group="all" aria-pressed="${activeGroup === 'all'}"><span>全部</span><span class="ledger-group-count">${available.length}</span></button>${groups.map(groupButton).join('')}</nav></div>
      <p class="ledger-sr-hint" id="ledger-table-hint">当前值可直接修改；点参数名展开精调。</p>
      <table class="ledger-table" aria-label="${esc(nodeName)}参数与原配方的值对照" aria-describedby="ledger-table-hint"><colgroup><col class="ledger-col-name"><col class="ledger-col-reference"><col class="ledger-col-current"><col class="ledger-col-state"></colgroup>
        <thead><tr><th id="ledger-col-name" scope="col">参数</th><th id="ledger-col-reference" scope="col">原配方</th><th id="ledger-col-current" scope="col">当前值</th><th id="ledger-col-state" scope="col">改动</th></tr></thead>
        ${body || `<tbody><tr class="ledger-empty"><td colspan="4"><strong>没有符合条件的参数</strong><p>${query ? `未找到“${esc(ctx.search)}”，可修改上方搜索词或切换分组。` : ctx.onlyChanged ? '当前筛选内没有相对原配方的改动，可关闭上方“仅改动”查看全部。' : '可切换到“全部”查看当前对象的参数。'}</p><button type="button" class="ledger-empty-action" data-group="all">查看全部分组</button></td></tr></tbody>`}
      </table>
      <p class="ledger-baseline-note">“原配方”是固定的初始配方参考；保存或刷新 Demo 后仍保留此对照。</p>
    </div>`;
  }

  function afterRender(host, ctx) {
    const params = new Map((ctx.params || []).map(param => [String(param.id), param]));
    host.querySelectorAll('.ledger-panel [data-param]').forEach(control => {
      if (!control.matches('input,select,textarea')) return;
      const param = params.get(String(control.dataset.param));
      if (!param) return;
      const key = domId(param.id);
      if (!control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby')) control.setAttribute('aria-label', `${param.label}，当前值${param.unit ? `，单位 ${param.unit}` : ''}${control.type === 'range' ? '，粗调滑杆' : ''}`);
      if (control.type === 'number') control.title = `${param.label}：${readable(valueAt(ctx.values, param), param)}${param.unit ? ` ${param.unit}` : ''}`;
      const descriptions = new Set((control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
      if (host.querySelector(`#${key}-help`)) descriptions.add(`${key}-help`);
      if (host.querySelector(`#${key}-error`)) {
        descriptions.add(`${key}-error`);
        control.setAttribute('aria-invalid', 'true');
      }
      if (descriptions.size) control.setAttribute('aria-describedby', [...descriptions].join(' '));
    });
  }

  window.PanelDesigns = window.PanelDesigns || {};
  window.PanelDesigns.ledger = {render, afterRender};
})();
