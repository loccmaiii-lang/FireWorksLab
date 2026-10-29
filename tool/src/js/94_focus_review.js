// Material B 评审布局：只投影真实参数模块，不维护另一份参数或改写业务显隐。
(() => {
  'use strict';
  if (!document.body || document.body.dataset.ui !== 'material-b') return;

  const groups = [
    ['all', '全部'], ['shape', '外形'], ['motion', '运动'], ['look', '光色'], ['output', '输出']
  ];
  const modules = {
    shape: new Set(['规格', '玉体', '场景', '整体调整', '生成', '形状', '大小', '形态', '分叉调整', '随机', '火花']),
    motion: new Set(['环境', '初速', '受力', '寿命', '弹道', '上升', '自转与喷射', '自转', '扭动', '飘落', '蜂', '全局气流', '阻力重力', '生成与运动', '运动', '消散']),
    look: new Set(['颜色', '亮度', '闪烁', '点灭', '光晕', '燃气焰', '辉星', '闪光', '拖影']),
    output: new Set(['直接调', '算出来的', '导出方案', '入点出点', '取景', '帧', '贴图', '编码', '画质', '曝光光晕', '手机', '镜头', '镜头成像'])
  };
  const selection = new Map();
  let scope = '', task = 'all', queued = false, reopenEnglish = false;
  let inDelivery = false, deliveryEditing = false;
  let filterReturn = null;
  let last = { scope: '', task: 'all', filtering: false, counts: {}, unmapped: [], members: [] };

  function taskOf(mod) {
    if (mod._g === '输出') return 'output';
    for (const [name, names] of Object.entries(modules)) if (names.has(mod._mod)) return name;
    return ''; // 未映射的专业模块仍在“全部”，不猜它的物理含义。
  }
  function keyOf(it) { return Array.isArray(it) ? String(it[0]) : String(it.sel || it.text || it.curve || ''); }
  function subjectKey() { return [lib.key || '', state.tab, state.comboSel].join('|'); }
  function rememberFilter() {
    if (!filterReturn && !pview.q && !pview.changed) filterReturn = { subject: subjectKey(), top: rScroller().scrollTop };
  }
  function setHidden(node, hidden) { if (node.hidden !== hidden) node.hidden = hidden; }
  function prepareTools(host) {
    const tools = host.querySelector(':scope > .ptools');
    if (!tools) return null;
    // 移动原上下文而不复制：scopeSync、祖先路径按钮及发射器状态仍由原面板维护。
    const context = host.querySelector('.pscope');
    if (context && context.parentElement !== tools) {
      context.classList.add('mb-context'); tools.prepend(context);
    }
    let menu = tools.querySelector(':scope > .mb-display');
    if (!menu) {
      menu = document.createElement('details'); menu.className = 'mb-display';
      const summary = document.createElement('summary'); summary.textContent = '参数显示';
      const body = document.createElement('div'); body.className = 'mb-display-menu';
      menu.append(summary, body);
      tools.querySelectorAll(':scope > .pchg').forEach(label => body.appendChild(label));
      tools.appendChild(menu);
    }
    let status = tools.querySelector(':scope > .mb-filter-state');
    if (!status) {
      status = document.createElement('div'); status.className = 'mb-filter-state';
      status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); tools.appendChild(status);
      const copy = document.createElement('span'); copy.className = 'mb-filter-copy';
      const clear = document.createElement('button'); clear.className = 'mb-filter-clear'; clear.type = 'button'; clear.textContent = '清除筛选';
      clear.addEventListener('click', () => {
        // 经过原输入监听清除搜索与仅改动，保留英文名偏好及筛选前的任务分组。
        const search = host.querySelector('.ptools input[type="search"]');
        if (search?.value) { search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true })); }
        const changed = host.querySelector('.ptools .pchg input:not([data-en])');
        if (changed?.checked) { changed.checked = false; changed.dispatchEvent(new Event('change', { bubbles: true })); }
        sync(); search?.focus({ preventScroll: true });
      });
      status.append(copy, clear);
    }
    let nav = tools.querySelector(':scope > .mb-tabs');
    if (!nav) {
      nav = document.createElement('div'); nav.className = 'mb-tabs';
      nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', '当前对象的参数任务分组');
      for (const [id, name] of groups) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'mb-tab';
        button.dataset.mbTask = id; button.setAttribute('role', 'tab'); button.textContent = name;
        button.addEventListener('click', () => { task = id; selection.set(scope, id); sync(); }); nav.appendChild(button);
      }
      nav.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const buttons = [...nav.querySelectorAll('.mb-tab:not(:disabled)')], index = buttons.indexOf(document.activeElement);
        if (index < 0) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next].click(); buttons[next].focus({ preventScroll: true });
      });
      tools.appendChild(nav);
    }
    if (reopenEnglish) {
      reopenEnglish = false; menu.open = true;
      menu.querySelector('[data-en]')?.focus({ preventScroll: true });
    }
    return { tools, menu, status, nav };
  }
  function treeHeading() {
    const tools = document.querySelector('#v5TreeBox .v5-tools');
    if (tools && !tools.querySelector('.mb-tree-title')) {
      const title = document.createElement('span'); title.className = 'mb-tree-title'; title.textContent = '配方结构';
      tools.prepend(title);
    }
    if (tools && !tools.querySelector('.mb-tree-toggle')) {
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'mb-tree-toggle';
      toggle.addEventListener('click', () => {
        v5.min = !v5.min; store.set('v5TreeMin', v5.min); v5Heights(); sync();
      });
      tools.appendChild(toggle);
    }
    const toggle = tools?.querySelector('.mb-tree-toggle');
    if (toggle) { toggle.textContent = v5.min ? '展开结构' : '收起结构'; toggle.setAttribute('aria-expanded', String(!v5.min)); }
    document.getElementById('right')?.classList.toggle('mb-tree-auto', !v5.h);
  }
  function contextSync(context) {
    if (!context) return;
    const tree = document.getElementById('v5Tree'), selected = tree?.querySelector('.v5-row.sel');
    const viewport = tree?.getBoundingClientRect(), row = selected?.getBoundingClientRect();
    const visible = row && viewport && row.bottom > viewport.top + 4 && row.top < viewport.bottom - 4;
    // 树内选中态足够时不重复身份；折叠/滚出后才提供原路径。
    setHidden(context, !!visible && !v5.min);
  }
  function workspaceSync() {
    const saveNames = document.getElementById('dvSaveNames');
    if (saveNames && saveNames.textContent !== '保存名称') saveNames.textContent = '保存名称';
    const delivery = typeof stage2 !== 'undefined' && !!stage2.deliv;
    if (delivery && !inDelivery) deliveryEditing = false;
    inDelivery = delivery;
    document.body.classList.toggle('mb-delivery-peek', delivery && !deliveryEditing);
    document.body.classList.toggle('mb-delivery-edit', delivery && deliveryEditing);
    const button = document.getElementById('btnRight');
    if (button) button.setAttribute('aria-pressed', String(delivery ? deliveryEditing : panels.right));
  }
  function sync() {
    if (document.body.dataset.ui !== 'material-b') return;
    const host = document.querySelector('#params'), right = document.querySelector('#right');
    if (!host || !right || typeof panelRows === 'undefined' || typeof pview === 'undefined') return;
    treeHeading(); workspaceSync();
    const ui = prepareTools(host);
    if (!ui) return;
    contextSync(ui.tools.querySelector('.mb-context'));
    const filtering = !!pview.q || !!pview.changed;
    if (!filtering) {
      const nextScope = [typeof lib !== 'undefined' ? lib.key || '' : '', state.tab, state.comboSel, pview.tabNow || '全部'].join('|');
      if (nextScope !== scope) { scope = nextScope; task = selection.get(scope) || 'all'; }
    }
    const visibleModules = [...host.querySelectorAll('section.egrp > details.mod')].filter(mod => !mod.hidden && !mod.parentElement.hidden);
    const byModule = new Map(visibleModules.map(mod => [mod, []]));
    for (const [row, it] of panelRows) {
      const mod = row.closest('details.mod'); // 随机子行会搬到本体后，原 panelRows 模块引用可能已过时。
      if (byModule.has(mod) && !row.hidden && keyOf(it)) byModule.get(mod).push({ id: keyOf(it), row });
    }
    const counts = Object.fromEntries(groups.map(([id]) => [id, 0]));
    const members = [], unmapped = [];
    for (const [mod, rows] of byModule) {
      const group = taskOf(mod); counts.all += rows.length;
      if (group) counts[group] += rows.length;
      else if (rows.length) unmapped.push({ emitter: mod._g, module: mod._mod, count: rows.length });
      rows.forEach(item => members.push({ id: item.id, emitter: mod._g, module: mod._mod, task: group || 'all' }));
    }
    if (!filtering && task !== 'all' && !counts[task]) { task = 'all'; selection.set(scope, task); }
    const grouped = pview.tabNow === '全部' && !filtering;
    setHidden(ui.nav, !grouped);
    const shown = grouped ? task : 'all';
    host.querySelectorAll('section.egrp > details.mod').forEach(mod => {
      mod.classList.toggle('mb-task-hidden', shown !== 'all' && taskOf(mod) !== shown);
    });
    for (const [id, name] of groups) {
      const button = ui.nav.querySelector(`[data-mb-task="${id}"]`), selected = id === shown;
      if (button.textContent !== name) button.textContent = name;
      button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
      button.disabled = id !== 'all' && (filtering || !counts[id]);
      button.title = filtering && id !== 'all' ? '搜索或仅改动覆盖全部分组；退出筛选后可切换' : name + '参数';
    }
    const messages = [];
    if (pview.q) messages.push('搜索覆盖全部分组 · ' + counts.all + ' 项');
    if (pview.changed) messages.push('仅改动');
    if (filtering && !counts.all) messages.push('没有匹配参数');
    if (pview.en) messages.push('英文名');
    const rest = unmapped.reduce((n, item) => n + item.count, 0);
    if (!filtering && shown !== 'all' && rest) messages.push('另有 ' + rest + ' 项在「全部」');
    const status = messages.join(' · ');
    const copy = ui.status.querySelector('.mb-filter-copy');
    if (copy.textContent !== status) copy.textContent = status;
    setHidden(ui.status.querySelector('.mb-filter-clear'), !filtering);
    setHidden(ui.status, !status);
    last = { scope, task, shown, filtering, counts, unmapped, members };
    if (!filtering && filterReturn) {
      const back = filterReturn; filterReturn = null;
      setTimeout(() => { if (!pview.q && !pview.changed && subjectKey() === back.subject) rScroller().scrollTop = back.top; }, 0);
    }
  }
  function schedule() {
    if (queued) return;
    queued = true; setTimeout(() => { queued = false; sync(); }, 0);
  }
  function init() {
    const host = document.querySelector('#params'), right = document.querySelector('#right');
    if (!host || !right) return;
    const observer = new MutationObserver(records => {
      if (records.some(record => record.type === 'attributes'
        ? record.oldValue !== record.target.getAttribute(record.attributeName)
        : [...record.addedNodes].some(node => node.nodeType === Node.ELEMENT_NODE))) schedule();
    });
    observer.observe(host, { childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['hidden'] });
    host.addEventListener('input', event => {
      if (event.target.matches('input[type="search"]') && event.target.value.trim()) rememberFilter();
    }, true);
    host.addEventListener('change', event => {
      if (event.target.matches('.mb-display .pchg input:not([data-en])') && event.target.checked) rememberFilter();
    }, true);
    document.getElementById('pFoot')?.addEventListener('click', event => { if (event.target.closest('.pf-chg')) rememberFilter(); }, true);
    const tree = document.getElementById('v5Tree'), stage = document.querySelector('.stage');
    if (tree) {
      new MutationObserver(schedule).observe(tree, { childList: true });
      tree.addEventListener('scroll', schedule, { passive: true });
    }
    if (stage) new MutationObserver(schedule).observe(stage, { attributes: true, attributeFilter: ['class'] });
    const deliveryView = document.getElementById('delivView');
    if (deliveryView) new MutationObserver(schedule).observe(deliveryView, { childList: true });
    const splitter = document.getElementById('v5Split');
    splitter?.addEventListener('pointerdown', () => right.classList.remove('mb-tree-auto'), true);
    splitter?.addEventListener('pointerup', schedule); splitter?.addEventListener('keydown', schedule);
    document.getElementById('btnRight')?.addEventListener('click', event => {
      if (!stage2.deliv) return;
      event.preventDefault(); event.stopImmediatePropagation(); deliveryEditing = !deliveryEditing; workspaceSync();
    }, true); // 交付页只临时收编辑栏，不写面板偏好；离开即恢复原状态。
    document.getElementById('rightClose')?.addEventListener('click', event => {
      if (!stage2.deliv) return;
      event.preventDefault(); event.stopImmediatePropagation(); deliveryEditing = false; workspaceSync();
    }, true);
    right.addEventListener('input', event => { if (event.target.matches('#params input[type="search"]')) schedule(); });
    right.addEventListener('change', schedule);
    // 英文名会重建面板；保留显示菜单和键盘位置，而不复制原监听或偏好状态。
    document.addEventListener('change', event => {
      if (event.target.matches('#params .mb-display [data-en]')) reopenEnglish = true;
    }, true);
    document.addEventListener('click', event => {
      const menu = host.querySelector('.mb-display'); if (menu?.open && !menu.contains(event.target)) menu.open = false;
      if (stage2.deliv && deliveryEditing && DRAWER.right.matches && !event.target.closest('#right,#btnRight')) { deliveryEditing = false; workspaceSync(); }
    });
    document.addEventListener('keydown', event => {
      const menu = host.querySelector('.mb-display');
      if (event.key === 'Escape' && menu?.open && menu.contains(event.target)) {
        event.preventDefault(); event.stopImmediatePropagation(); menu.open = false; menu.querySelector('summary').focus(); return;
      }
      const typing = event.target.closest('input,textarea,select,[contenteditable=true]');
      if (stage2.deliv && !typing && (event.key.toLowerCase() === 'p' || event.key === 'Escape' && deliveryEditing && !document.querySelector('.ab-more[open]'))) {
        event.preventDefault(); event.stopImmediatePropagation(); deliveryEditing = event.key === 'Escape' ? false : !deliveryEditing; workspaceSync();
      }
    }, true);
    sync();
  }
  window.MaterialBReview = Object.freeze({ sync, getState: () => JSON.parse(JSON.stringify(last)) });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
