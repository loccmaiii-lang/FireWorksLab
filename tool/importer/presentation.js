// Presentation only: keep the original controls, controllers and data intact.
const WorkbenchPresentation = (() => {
  const pages = ['asset', 'material', 'weapon', 'resfx', 'fwimp', 'show'];
  const prefixes = {material: 'mat'};
  const helpSources = new Map();
  const helpNotes = {
    asset: '先选择源资产和复制目标，再检查右侧完整计划。复制完成后的优化操作可按需展开；执行仍使用原来的检查与复制流程。',
    material: '先选方向，再设置源材质与目标目录。目标母材质留空时沿用源母材质；预览中的黄色提示和未知资产状态请逐项核对。',
    weapon: '七张表可在右侧逐表查看。切换标签不会改变写入范围；执行仍按原来的七表顺序写入，任何一步失败即停止。',
    resfx: '平台标签只筛选当前显示的行；隐藏行的编辑仍会保留，并一起参与原计划的执行。双端同步的对端空路径是待回填占位。',
    fwimp: '先填写基础名称和素材路径，检查并预览，再确认完整名称。查看素材详情与勾选导入是两个独立操作；确认名称后才允许执行。',
    show: '左侧填写参数，右侧查看原有节奏与轮廓预览。预览是本地编排示意；模板名称和资源信息有效后，使用底部原有的复制、下载或存入素材库操作。'
  };
  let active = 'fwimp', previousFocus = null, platform = 'ALL', resourcePathRow = null;
  const el = id => document.getElementById(id);
  function node(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function button(text, fn, className = 'btn ghost') {
    const b = node('button', className, text);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }
  function flow(field, labels, name) {
    const list = node('ol', 'wb-flow');
    list.setAttribute('aria-label', '操作流程');
    labels.forEach((label, i) => {
      const item = node('li');
      item.append(node('span', 'wb-flow-index', String(i + 1)), node('span', 'wb-flow-label', label));
      if (i === 0) item.setAttribute('aria-current', 'step');
      list.append(item);
    });
    field.prepend(list);
    const prefix = prefixes[name] || name;
    const source = el(prefix + '-src');
    const plan = el(prefix + (name === 'asset' || name === 'material' ? '-previewTable' : '-plan'));
    const action = el(prefix + '-btnExec');
    const update = () => {
      const copying = name === 'asset' || name === 'material';
      const hasRows = plan.querySelector('tbody tr');
      const ready = copying ? plan.style.display !== 'none' && Boolean(hasRows) && !action.disabled
        : !action.disabled && Boolean(hasRows);
      const executing = Workbench.busy && el('wb-task').textContent.startsWith('执行任务');
      let current = executing ? labels.length - 1 : ready ? labels.length - 2 : 0;
      if (!ready && !executing && copying && source.value.trim()) current = name === 'material' ? 2 : 1;
      [...list.children].forEach((item, i) => {
        item.toggleAttribute('aria-current', i === current);
        if (i === current) item.setAttribute('aria-current', 'step');
        item.classList.toggle('is-done', i < current);
      });
    };
    field.addEventListener('input', update);
    field.addEventListener('change', update);
    new MutationObserver(update).observe(plan, {childList:true, subtree:true, attributes:true, attributeFilter:['style']});
    new MutationObserver(update).observe(action, {attributes:true, attributeFilter:['disabled']});
    new MutationObserver(update).observe(el('wb-task'), {childList:true, subtree:true});
    document.addEventListener('workbench-idle', update);
    update();
  }
  function setupCopyLayout(name) {
    const prefix = prefixes[name] || name;
    const refresh = el(prefix + '-btnPreview');
    const row = refresh.parentElement;
    const card = refresh.closest('.card');
    const heading = node('div', 'wb-preview-heading');
    card.prepend(heading); heading.append(card.querySelector('h2'), refresh);
    if (!row.children.length) row.remove();
    const empty = el(prefix + '-previewEmpty');
    const original = empty.textContent;
    empty.replaceChildren(node('strong', 'wb-empty-title', '预览复制计划'),
      node('span', 'wb-empty-instruction', name === 'asset' ? '在左侧粘贴源资产路径，选择复制目标，再点击「预览」。' : '选择复制方向，粘贴源材质实例路径，再点击「预览」。'),
      node('span', '', original));
    if (name === 'asset') {
      const grades = el('asset-ck_H').closest('.chips');
      grades.classList.add('wb-copy-grades');
      const extras = node('div', 'wb-copy-extras'); grades.after(extras);
      extras.append(el('asset-ckCustomSuffix').closest('label'), el('asset-ckRemoveFrag').closest('label'));
      el('asset-dirInplace').closest('.chips').parentElement.classList.add('wb-inline-setting');
      el('asset-ckMobileMat').closest('label').parentElement.classList.add('wb-inline-setting');
    } else {
      el('mat-ckNoSuffix').closest('.chips').classList.add('wb-copy-extras');
      el('mat-ckDirKeep').closest('.chips').classList.add('wb-material-directories');
      setupMaterialPreview();
    }
  }
  function setupMaterialPreview() {
    const table = el('mat-previewTable');
    table.classList.add('wb-material-preview');
    const decorate = () => {
      const labels = [...table.querySelectorAll('thead th')].map(n => n.textContent.trim());
      for (const row of table.querySelectorAll('tbody tr')) {
        row.classList.add('wb-material-row');
        [...row.cells].forEach((cell, index) => {
          const label = labels[index] || '';
          if (cell.dataset.label !== label) cell.dataset.label = label;
        });
      }
    };
    new MutationObserver(decorate).observe(table, {childList:true, subtree:true});
    decorate();
  }
  function moveExecution(name) {
    const prefix = prefixes[name] || name;
    const field = el('panel-' + name).querySelector('.tool-fieldset');
    const action = el(prefix + '-btnExec');
    const card = action.closest('.card');
    const footer = node('footer', 'wb-execution');
    footer.setAttribute('aria-label', '执行操作');
    if (name === 'asset' || name === 'material') {
      card.classList.add('wb-execution-content');
      footer.append(card);
    } else {
      footer.append(node('p', 'wb-execution-note', name === 'weapon'
        ? '确认七张表的计划后执行。写入后请在 UE 中重载对应数据表。'
        : '确认行名、中文描述与资源路径后执行。写入范围以完整预览计划为准。'));
      footer.append(action.closest('.row'));
      card.classList.remove('execution-card');
    }
    field.append(footer);
  }
  function setupForms() {
    for (const name of pages.slice(0, 4)) {
      const panel = el('panel-' + name);
      const field = panel.querySelector('.tool-fieldset');
      field.classList.add('wb-form');
      flow(field, name === 'weapon' ? ['新枪参数', '预览', '执行写表']
        : name === 'resfx' ? ['资源路径', '预览', '执行写表']
        : name === 'material' ? ['方向', '源材质实例', '目标设置', '预览', '执行']
        : ['源资产', '目标设置', '预览', '执行'], name);
      moveExecution(name);
      panel.querySelectorAll('.tool-input, .tool-output').forEach(n => n.classList.add('wb-surface'));
      // Keep the original table (and event handlers) inside its scroll region.
      panel.querySelectorAll('table').forEach(table => {
        if (!table.closest('.table-scroll')) {
          const wrap = node('div', 'table-scroll');
          table.before(wrap); wrap.append(table);
        }
      });
      panel.querySelectorAll('.btn:not(.ghost)').forEach(b => {
        if (b !== el((prefixes[name] || name) + '-btnExec')) b.classList.add('wb-secondary');
      });
    }
    const direction = el('mat-dirPc2Mobile').closest('.card');
    direction.classList.add('wb-direction');
    el('panel-material').querySelector('.tool-layout').before(direction);
    const optimization = el('asset-ckDelEmitter').parentElement.parentElement.parentElement;
    const titleRow = optimization.firstElementChild;
    const title = titleRow.firstElementChild;
    const details = node('details', 'wb-options');
    const summary = node('summary', '', title.textContent.trim());
    const section = node('div', 'wb-options-section');
    const preset = titleRow.querySelector('button');
    optimization.before(section); section.append(details, preset); details.append(summary, optimization);
    title.classList.add('wb-sr-only');
    optimization.classList.add('wb-options-body');
    // If an optimization preset enables an option, expose those choices immediately.
    el('panel-asset').addEventListener('click', e => {
      if (e.target.closest('[onclick="AssetCopier.onMobileOptimize()"]')) details.open = true;
    });
    const weaponFields = el('weapon-en').parentElement.parentElement;
    weaponFields.classList.add('wb-weapon-fields');
    const weaponPreview = el('weapon-btnDry');
    el('panel-weapon').querySelector('.tool-input').append(weaponPreview);
    const resourcePreview = el('resfx-btnParse');
    el('panel-resfx').querySelector('.tool-input').append(resourcePreview);
    setupCopyLayout('asset'); setupCopyLayout('material');
    const emptyMessages = ['asset-previewEmpty', 'mat-previewEmpty', 'weapon-plan', 'resfx-plan'];
    emptyMessages.forEach(id => el(id).classList.add('wb-plan-region'));
    setupWeaponPlan(); setupResourcePlan();
  }
  function setupWeaponPlan() {
    const plan = el('weapon-plan');
    let selected = 0, decorating = false;
    const decorate = () => {
      if (decorating) return;
      const groups = [...plan.children].filter(n => n.classList.contains('plan-tbl'));
      if (!groups.length) return;
      decorating = true;
      const nav = node('div', 'wb-table-nav');
      nav.setAttribute('role', 'tablist');
      nav.setAttribute('aria-label', '七张表的预览');
      nav.setAttribute('aria-orientation', 'vertical');
      const body = node('div', 'wb-table-body');
      const workspace = node('div', 'wb-table-workspace');
      const tabs = groups.map((group, i) => {
        const title = group.querySelector('.plan-tbl-title')?.textContent || '表 ' + (i + 1);
        const tab = button(title.replace(/\s*[—–]\s*\d+\s*行.*$/, ''), () => select(i), 'wb-table-tab');
        tab.id = 'wb-weapon-tab-' + i;
        tab.setAttribute('role', 'tab');
        group.id = 'wb-weapon-table-' + i;
        group.setAttribute('role', 'tabpanel');
        group.setAttribute('aria-labelledby', tab.id);
        tab.setAttribute('aria-controls', group.id);
        tab.addEventListener('keydown', e => {
          let next;
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % groups.length;
          if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i + groups.length - 1) % groups.length;
          if (e.key === 'Home') next = 0;
          if (e.key === 'End') next = groups.length - 1;
          if (next !== undefined) {e.preventDefault(); select(next); tabs[next].focus();}
        });
        nav.append(tab); body.append(group); return tab;
      });
      function select(index) {
        selected = index;
        tabs.forEach((tab, i) => {tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; groups[i].hidden = i !== index;});
      }
      workspace.append(nav, body); plan.append(workspace);
      select(Math.min(selected, groups.length - 1));
      decorating = false;
    };
    new MutationObserver(decorate).observe(plan, {childList: true});
    decorate();
  }
  function setupResourcePlan() {
    const plan = el('resfx-plan');
    const tools = node('div', 'wb-resource-tools');
    const tabs = node('div', 'wb-platforms');
    tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', '预览平台筛选');
    [['ALL', '全部'], ['PC', 'PC'], ['MB', '手游']].forEach(([key, label]) => {
      const b = button(label, () => setPlatform(key), 'wb-platform');
      b.id = 'wb-resfx-' + key; b.dataset.label = label;
      b.setAttribute('aria-pressed', String(key === platform)); tabs.append(b);
    });
    const toggle = button('展开路径与详细字段', () => {
      const open = !plan.classList.contains('wb-resource-expanded');
      plan.classList.toggle('wb-resource-expanded', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '收起路径与详细字段' : '展开路径与详细字段';
    }, 'wb-detail-toggle');
    toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'resfx-plan');
    const pathBox = node('section', 'wb-resource-path');
    pathBox.id = 'wb-resource-path'; pathBox.hidden = true;
    const pathTitle = node('h3', '', '主路径 · FxSP');
    const pathValue = node('code'); pathValue.id = 'wb-resource-path-value';
    pathBox.append(pathTitle, pathValue);
    tools.append(tabs); plan.before(tools); plan.after(pathBox, toggle);
    const selectPath = e => {
      const row = e.target.closest('tr[data-wb-main-row]');
      if (row) showResourcePath(row);
    };
    plan.addEventListener('click', selectPath); plan.addEventListener('focusin', selectPath);
    const decorate = () => {
      const counts = {ALL: 0, PC: 0, MB: 0};
      plan.querySelectorAll('table').forEach(table => {
        if (!table.dataset.wbColumns) {
          const head = table.querySelector('thead tr');
          if (!head || head.children.length !== 8) return;
          const order = [0, 3, 4, 5, 6, 1, 2, 7];
          const reorder = row => {
            const cells = [...row.children];
            order.forEach((index, i) => {
              if (i >= 6) cells[index].classList.add('wb-extra-cell');
              if (index === 7) cells[index].dataset.wbField = 'fxsp';
              row.append(cells[index]);
            });
          };
          reorder(head);
          let lastPlatform = '';
          table.querySelectorAll('tbody tr').forEach(row => {
            if (row.children.length === 8) {
              lastPlatform = row.children[2].textContent.trim();
              row.dataset.wbPlatform = lastPlatform; row.dataset.wbMainRow = 'true';
              reorder(row);
            } else {
              row.dataset.wbPlatform = lastPlatform;
              row.classList.add('wb-resource-note');
              [...row.children].slice(0, -1).forEach(cell => cell.classList.add('wb-extra-cell'));
              const detail = row.lastElementChild;
              if (detail) detail.colSpan = 6;
            }
          });
          table.dataset.wbColumns = 'ready';
        }
        table.querySelectorAll('tr[data-wb-main-row]').forEach(row => {
          counts.ALL++; if (Object.hasOwn(counts, row.dataset.wbPlatform)) counts[row.dataset.wbPlatform]++;
        });
      });
      for (const key of ['ALL', 'PC', 'MB']) {
        const b = el('wb-resfx-' + key); b.textContent = b.dataset.label + ' · ' + counts[key];
      }
      setPlatform(platform);
    };
    new MutationObserver(decorate).observe(plan, {childList: true});
    decorate();
  }
  function setPlatform(key) {
    if (!['ALL', 'PC', 'MB'].includes(key)) return;
    platform = key;
    document.querySelectorAll('#resfx-plan tr[data-wb-platform]').forEach(row => {
      row.hidden = key !== 'ALL' && row.dataset.wbPlatform !== key;
    });
    for (const p of ['ALL', 'PC', 'MB']) el('wb-resfx-' + p)?.setAttribute('aria-pressed', String(p === key));
    showResourcePath(resourcePathRow?.isConnected && !resourcePathRow.hidden ? resourcePathRow
      : [...document.querySelectorAll('#resfx-plan tr[data-wb-main-row]')].find(row => !row.hidden));
  }
  function showResourcePath(row) {
    const box = el('wb-resource-path');
    if (!box) return;
    resourcePathRow = row || null;
    box.hidden = !row;
    document.querySelectorAll('#resfx-plan tr[data-wb-main-row]').forEach(item => item.classList.toggle('wb-resource-selected', item === row));
    if (row) el('wb-resource-path-value').textContent = row.querySelector('[data-wb-field=fxsp]')?.textContent.trim() || '（资源路径留空，待回填）';
  }
  function setupImport() {
    // The import workspace owns its local steps and fixed primary action.
    el('fwimp-work').classList.add('wb-import-workspace');
  }
  function setupShow() {
    const panel = el('panel-show');
    const preview = panel.querySelector('.df-preview');
    const scene = el('df-pattern-scene');
    const meta = el('df-pattern-meta');
    meta.after(scene);
    const options = preview.querySelector('.df-play-options');
    options.after(el('df-pattern-timeline'));
    preview.querySelector('.df-preview-heading').append(meta);
    preview.querySelector('.df-playbar').append(options);
    preview.append(panel.querySelector('.df-numbers'), preview.querySelector('.df-export'));
    const footer = panel.querySelector('.df-footer');
    const statusGroup = node('div', 'wb-show-footer-status');
    while (footer.firstChild) statusGroup.append(footer.firstChild);
    footer.append(statusGroup, el('df-pattern-copy').closest('.df-export-actions'));
    const contour = el('df-pattern-fan-contour');
    const details = node('details', 'wb-contour');
    details.append(node('summary', '', '扇形轮廓'));
    contour.before(details); details.append(contour);
    const heading = contour.querySelector('h3');
    if (heading) heading.classList.add('wb-sr-only');
  }
  function setupHelp() {
    const heading = document.querySelector('.page-heading');
    const actions = node('div', 'wb-heading-actions');
    actions.append(el('wb-task'));
    const trigger = button('使用说明', openHelp);
    trigger.id = 'wb-design-help'; trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', 'wb-help-dialog'); actions.append(trigger); heading.append(actions);
    actions.prepend(el('panel-show').querySelector('.df-local-status'));
    for (const name of pages) {
      const panel = el('panel-' + name), field = panel.querySelector('.tool-fieldset');
      const original = [...(field || panel).children].find(n => n.matches('details.usage') && !n.querySelector('input,textarea,select,button'));
      if (original) {helpSources.set(name, original); original.classList.add('wb-help-source');}
    }
    const dialog = node('div', 'wb-help-backdrop');
    dialog.id = 'wb-help-dialog'; dialog.hidden = true;
    const sheet = node('section', 'wb-help-sheet');
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-labelledby', 'wb-help-title');
    const head = node('header', 'wb-help-head');
    const title = node('h2'); title.id = 'wb-help-title';
    const close = button('关闭说明', closeHelp); close.id = 'wb-help-close';
    head.append(title, close);
    const content = node('div', 'wb-help-content'); content.id = 'wb-help-content';
    sheet.append(head, content); dialog.append(sheet); document.body.append(dialog);
    const scrim = button('', () => toggleTools(false), 'wb-tools-scrim');
    scrim.id = 'wb-tools-scrim'; scrim.hidden = true; scrim.tabIndex = -1;
    scrim.setAttribute('aria-label', '关闭工具菜单'); document.body.append(scrim);
    dialog.addEventListener('click', e => {if (e.target === dialog) closeHelp();});
    document.addEventListener('keydown', e => {
      if (dialog.hidden) {
        if (e.key === 'Escape') toggleTools(false);
        if (e.key === 'Tab' && document.body.classList.contains('wb-tools-open')) {
          const controls = [...el('wb-tools').querySelectorAll('button,summary')].filter(n => !n.disabled && (!n.matches('.tab') || n.closest('details').open));
          const first = controls[0], last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) {e.preventDefault(); last.focus();}
          if (!e.shiftKey && document.activeElement === last) {e.preventDefault(); first.focus();}
        }
        return;
      }
      if (e.key === 'Escape') {e.preventDefault(); closeHelp();}
      if (e.key === 'Tab') {
        const focusable = [...sheet.querySelectorAll('button,a[href],[tabindex="0"]')].filter(n => !n.disabled && !n.hidden);
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {e.preventDefault(); last.focus();}
        if (!e.shiftKey && document.activeElement === last) {e.preventDefault(); first.focus();}
      }
    });
  }
  function openHelp() {
    const dialog = el('wb-help-dialog');
    if (!dialog.hidden) return;
    previousFocus = document.activeElement;
    el('wb-help-title').textContent = el('wb-title').textContent + ' · 使用说明';
    const content = el('wb-help-content'); content.replaceChildren(node('p', 'wb-help-intro', helpNotes[active]));
    const original = helpSources.get(active);
    if (original) for (const child of original.children) {
      if (child.tagName === 'SUMMARY') continue;
      const copy = child.cloneNode(true);
      copy.removeAttribute('id'); copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      content.append(copy);
    }
    dialog.hidden = false;
    document.body.classList.add('wb-help-open');
    document.querySelector('.app')?.setAttribute('inert', '');
    el('wb-help-close').focus();
  }
  function closeHelp() {
    if (!el('wb-help-dialog') || el('wb-help-dialog').hidden) return;
    el('wb-help-dialog').hidden = true;
    document.body.classList.remove('wb-help-open');
    document.querySelector('.app')?.removeAttribute('inert');
    if (previousFocus?.isConnected) previousFocus.focus();
  }
  function toggleTools(force) {
    const wasOpen = document.body.classList.contains('wb-tools-open');
    const open = force === undefined ? !document.body.classList.contains('wb-tools-open') : Boolean(force);
    document.body.classList.toggle('wb-tools-open', open);
    el('wb-tools-toggle').setAttribute('aria-expanded', String(open));
    if (el('wb-tools-scrim')) el('wb-tools-scrim').hidden = !open;
    document.querySelector('.content').toggleAttribute('inert', open);
    document.querySelector('.connection').toggleAttribute('inert', open);
    if (!open && wasOpen && el('wb-tools').contains(document.activeElement)) el('wb-tools-toggle').focus();
    if (open) (el('wb-tools').querySelector('.active:not(:disabled)') || el('wb-tools').querySelector('.wb-tools-close')).focus();
  }
  function syncPage() {
    active = document.querySelector('.sidebar .tab.active')?.dataset.panel || 'fwimp';
    pages.forEach(name => el('panel-' + name).classList.toggle('wb-active-page', name === active));
    const breadcrumb = el('wb-breadcrumb');
    const group = active === 'show' ? '编排设计' : active === 'weapon' || active === 'resfx' ? '数据配表' : '资产处理';
    breadcrumb.textContent = group + ' / ' + el('wb-title').textContent;
    document.querySelector('.wb-heading-actions .df-local-status').hidden = active !== 'show';
    el('wb-design-help').setAttribute('aria-label', el('wb-title').textContent + '使用说明');
    toggleTools(false);
  }
  function init() {
    setupForms(); setupImport(); setupShow(); setupHelp();
    const original = switchPanel;
    switchPanel = function(...args) {const result = original.apply(this, args); syncPage(); return result;};
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1100 && document.body.classList.contains('wb-tools-open')) toggleTools(false);
    });
    syncPage();
  }
  return {init, openHelp, closeHelp, toggleTools, setPlatform};
})();
