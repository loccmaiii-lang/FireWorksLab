/* 129 组合检查：只操作独立HTML中的控件样本，不加载参数或执行真实业务。 */
(() => {
  'use strict';
  const CHANNEL = 'fwl-style-picker/1';
  const LABELS = {
    C01:'按钮与图标按钮', C02:'字段、搜索与参数行', C03:'滑杆', C04:'下拉选择',
    C05:'复选框与混选', C06:'单选组', C07:'即时布尔开关', C08:'任务页签与短选项分段',
    C09:'折叠、摘要与帮助', C11:'命令菜单与参数显示菜单', C12:'对话框与表单弹层',
    C16:'进度与进行中反馈', TREE:'结构树与观察动作', COLOR:'颜色、Ramp与寿命曲线'
  };
  const IDS = Object.keys(LABELS), lab = document.getElementById('combo-lab');
  const familyMap = window.__COMBO_LAB_MAP || {};
  if (!(lab instanceof HTMLDialogElement)) throw new Error('129组件检查缺少原生dialog #combo-lab');
  let selectedFamily = 'C01', appliedFamilies = [], opener = null;
  const treeControllers = [];
  const mainStatus = () => document.getElementById('picker-sample-status');

  const tools = document.createElement('div');
  tools.className = 'top combo-inspect-tools'; tools.id = 'combo-inspect-tools';
  const inspectButton = document.createElement('button');
  inspectButton.type = 'button'; inspectButton.textContent = '检查组合组件';
  inspectButton.dataset.mbComponent = 'button'; inspectButton.dataset.comboInspect = 'true';
  const toolsLabel = document.createElement('label'); toolsLabel.textContent = '组件 ';
  const toolsSelect = document.createElement('select');
  toolsSelect.setAttribute('aria-label','选择要检查的组件'); toolsSelect.dataset.mbComponent = 'select';
  const modeNote = document.createElement('span'); modeNote.className = 'combo-mode-note';
  toolsLabel.append(toolsSelect); tools.append(inspectButton, toolsLabel, modeNote);
  document.body.insertBefore(tools, document.querySelector('.picker-sample-app'));

  const labHeader = lab.querySelector('header') || lab.prepend(document.createElement('header')) || lab.firstElementChild;
  const familyLabel = document.createElement('label'); familyLabel.className = 'combo-family-label';
  familyLabel.append(document.createTextNode('检查组件 '));
  const familySelect = document.createElement('select'); familySelect.className = 'u-select';
  familySelect.dataset.comboFamilySelect = 'true'; familySelect.setAttribute('aria-label','当前检查组件');
  for (const id of IDS) {
    const option = document.createElement('option'); option.value = id; option.textContent = id + ' · ' + LABELS[id];
    familySelect.append(option); toolsSelect.append(option.cloneNode(true));
  }
  familyLabel.append(familySelect); labHeader.append(familyLabel);
  const labStatus = document.createElement('p'); labStatus.id = 'combo-lab-status';
  labStatus.className = 'u-help'; labStatus.setAttribute('role','status'); labHeader.after(labStatus);

  function report(message) {
    labStatus.textContent = message;
    const status = mainStatus(); if (status) status.textContent = message;
  }
  function active() { return document.body.dataset.comboActive === 'true'; }
  function actualPresence() {
    return Object.fromEntries(IDS.map(id => {
      const sections = (familyMap[id] || []).map(key => document.getElementById(key)).filter(node => node && lab.contains(node));
      const wrappers = [...lab.querySelectorAll('[data-combo-family]')].filter(node => node.dataset.comboFamily === id);
      const controls = new Set(wrappers.flatMap(node => [...node.querySelectorAll('button,input,select,textarea,summary,progress,[role="treeitem"],[role="menuitem"]')]));
      return [id, {sections:sections.map(node => node.id), wrappers:wrappers.length, controls:controls.size,
        present:sections.length > 0 && wrappers.length > 0 && controls.size > 0}];
    }));
  }
  function labReady(presence = actualPresence()) { return IDS.every(id => presence[id].present); }
  function closeNested() {
    lab.querySelectorAll('dialog[open]').forEach(dialog => dialog.close('outer-close'));
    lab.querySelectorAll('details[data-u-menu][open]').forEach(menu => { menu.open = false; });
  }
  function closeLab() { closeNested(); if (lab.open) lab.close('close'); }
  function inspectFamily(id, target = document.activeElement) {
    if (!active()) { report('请先切到“我的组合”启用组合样式，再检查组件。'); return false; }
    if (!IDS.includes(id) || !actualPresence()[id].present) { report('此组件样本未载入；未打开空白检查页。'); return false; }
    closeNested(); selectedFamily = id; familySelect.value = id; toolsSelect.value = id;
    lab.dataset.currentFamily = id;
    lab.querySelectorAll('[data-combo-family]').forEach(section => { section.hidden = section.dataset.comboFamily !== id; });
    report((active() ? '组合样式检查' : '原始样板检查：组合样式尚未启用') + ' · ' + LABELS[id] + '。仅页面内控件交互；未验证烘焙、保存或导出。');
    if (!lab.open) { opener = target instanceof HTMLElement ? target : inspectButton; lab.showModal(); }
    familySelect.focus({preventScroll:true});
    lab.scrollTop = 0;
    parent.postMessage({channel:CHANNEL,type:'family-inspected',family:id,active:active()},'*');
    return true;
  }
  inspectButton.addEventListener('click',() => inspectFamily(toolsSelect.value,inspectButton));
  toolsSelect.addEventListener('change',() => { selectedFamily = toolsSelect.value; });
  familySelect.addEventListener('change',() => inspectFamily(familySelect.value,familySelect));
  lab.querySelectorAll('[data-combo-lab-close]').forEach(button => button.addEventListener('click',closeLab));
  lab.addEventListener('cancel',event => { if (event.target === lab) { event.preventDefault(); closeLab(); } });
  lab.addEventListener('close',event => {
    if (event.target !== lab) return;
    const target = opener; opener = null;
    if (target?.isConnected && !target.disabled && target.getClientRects().length) target.focus({preventScroll:true});
    parent.postMessage({channel:CHANNEL,type:'combo-inspector-closed',version:'129'},'*');
  });

  function setupTree(host, options) {
    if (!host) return;
    const rows = [...host.querySelectorAll(options.row)], initialHidden = new WeakMap(rows.map(row => [row,row.hidden]));
    const collapsed = new Set(rows.filter(row => row.getAttribute('aria-expanded') === 'false'));
    let solo = null;
    const rowName = row => row.querySelector(options.name)?.textContent.trim() || '当前节点';
    const level = row => Number(row.getAttribute('aria-level')) || 1;
    const index = row => rows.indexOf(row);
    const descendants = row => {
      const result = []; for (let i=index(row)+1;i<rows.length && level(rows[i])>level(row);i++) result.push(rows[i]);
      return result;
    };
    function renderCollapse() {
      const parents = [];
      for (const row of rows) {
        while (parents.length && level(parents.at(-1)) >= level(row)) parents.pop();
        row.hidden = initialHidden.get(row) || parents.some(parentRow => collapsed.has(parentRow));
        if (row.hasAttribute('aria-expanded')) row.setAttribute('aria-expanded',String(!collapsed.has(row)));
        parents.push(row);
      }
    }
    let restore = options.restore;
    if (options.lab) {
      const bar = document.createElement('div'); bar.className = 'combo-tree-sample-tools';
      restore = document.createElement('button'); restore.type = 'button'; restore.className = 'u-button u-quiet';
      restore.textContent = '恢复全部观察'; restore.dataset.comboTreeRestore = 'true'; bar.append(restore); host.before(bar);
      rows.forEach(row => {
        if (descendants(row).length) {
          row.setAttribute('aria-expanded','true');
          const caret = document.createElement('button'); caret.type = 'button'; caret.className = 'v5-tw sample-tree-caret';
          caret.dataset.comboTreeAct = 'tw'; caret.setAttribute('aria-label','展开或收起'+rowName(row));
          const glyph = document.createElement('span'); glyph.className = 'fw-icon'; glyph.dataset.fwIcon = 'expand';
          glyph.setAttribute('aria-hidden','true'); caret.append(glyph); window.FWIcons.apply(caret);
          row.prepend(caret);
        }
        const source = document.querySelector('#v5Tree button.v5-solo');
        if (!source) throw new Error('128快照缺少原观察控件，不能用文字替代');
        const button = document.createElement('button'); button.type = 'button'; button.className = 'v5-ic v5-solo sample-tree-solo';
        button.replaceChildren(...[...source.childNodes].map(node => node.cloneNode(true)));
        button.dataset.comboTreeAct = 'solo'; button.setAttribute('aria-pressed','false');
        button.setAttribute('aria-label','只看样板'+rowName(row)); row.append(button);
      });
    }
    function renderObservation() {
      rows.forEach(row => {
        const button = row.querySelector(options.solo);
        if (button && button.getAttribute('aria-disabled') !== 'true') {
          button.setAttribute('aria-pressed',String(row === solo)); button.classList.toggle('on',row === solo);
        }
      });
      if (restore) restore.disabled = !solo;
      if (!options.lab) {
        const status = document.querySelector('#v5TreeBox .mb-observe-state');
        if (status) { status.hidden = !solo; status.textContent = solo ? '样本只看：'+rowName(solo) : ''; }
      }
    }
    function restoreAll() { if (!active()) return; solo = null; renderObservation(); report('已恢复树样本的全部观察；眼睛状态、参数和配方均未改动。'); }
    restore?.addEventListener('click',event => { event.preventDefault(); event.stopImmediatePropagation(); restoreAll(); },true);
    const eventTarget = options.lab ? host : document;
    eventTarget.addEventListener('click',event => {
      if (!active()) return;
      const button = event.target.closest('button'), row = button?.closest(options.row);
      if (!button || !row || !host.contains(row)) return;
      if (button.disabled || button.getAttribute('aria-disabled') === 'true' || button.closest('.inert')) return;
      const action = button.dataset.comboTreeAct || button.dataset.act || (button.matches(options.name) ? 'pick' : button.matches(options.eye) ? 'eye' : '');
      if (!['pick','tw','eye','solo'].includes(action)) return;
      event.preventDefault(); event.stopPropagation();
      if (!options.lab) event.stopImmediatePropagation();
      if (action === 'pick') {
        rows.forEach(item => {
          const on = row === item; item.classList.toggle(options.selected,on); item.setAttribute('aria-selected',String(on));
          const name = item.querySelector(options.name); if (name) name.tabIndex = on ? 0 : -1;
        });
        report('树样本高亮：'+rowName(row)+'。参数仍为原128快照；没有加载此节点参数。');
      } else if (action === 'tw') {
        collapsed.has(row) ? collapsed.delete(row) : collapsed.add(row); renderCollapse();
        report(descendants(row).length ? '已切换树样本的子节点显示；层级与参数未改变。' : '此快照不含该节点的子项；只切换折叠状态，不补造参数。');
      } else if (action === 'eye') {
        // 实验室已有原选择/眼睛控制器，读取它的结果；真实DOM快照没有业务控制器。
        const on = options.lab ? button.getAttribute('aria-pressed') === 'true' : button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed',String(on)); button.classList.toggle('on',on); row.classList.toggle('off',!on);
        const icon = button.querySelector('[data-fw-icon]');
        if (icon) { icon.dataset.fwIcon = on ? 'preview' : 'hidden'; window.FWIcons.apply(button); }
        report('已切换 '+rowName(row)+' 的眼睛样本状态；没有改变真实输出、配方或临时只看。');
      } else if (action === 'solo') {
        solo = solo === row ? null : row; renderObservation();
        report(solo ? '样本只看：'+rowName(row)+'；眼睛和参数保持原样，未运行真实预览。' : '已退出样本只看；眼睛和参数保持原样。');
      }
    },!options.lab);
    host.addEventListener('keydown',event => {
      if (!active()) return;
      const name = event.target.closest(options.name), row = name?.closest(options.row); if (!row) return;
      const visible = rows.filter(item => !item.hidden), at = visible.indexOf(row); let next;
      if (event.key === 'ArrowDown') next = visible[(at+1)%visible.length];
      if (event.key === 'ArrowUp') next = visible[(at+visible.length-1)%visible.length];
      if (event.key === 'Home') next = visible[0]; if (event.key === 'End') next = visible.at(-1);
      if (event.key === 'ArrowLeft') {
        if (row.hasAttribute('aria-expanded') && !collapsed.has(row)) { collapsed.add(row); renderCollapse(); next = row; }
        else next = [...visible.slice(0,at)].reverse().find(item => level(item)<level(row));
      }
      if (event.key === 'ArrowRight') {
        if (row.hasAttribute('aria-expanded') && collapsed.has(row)) { collapsed.delete(row); renderCollapse(); next = row; }
        else next = descendants(row).find(item => !item.hidden);
      }
      if (!next) return; event.preventDefault(); next.querySelector(options.name)?.focus({preventScroll:true});
    });
    renderCollapse(); renderObservation();
    treeControllers.push({kind:options.lab ? 'lab' : 'scene',getState:() => ({selected:rows.find(row => row.getAttribute('aria-selected') === 'true')?.dataset.n || rowName(rows.find(row => row.getAttribute('aria-selected') === 'true') || rows[0]),solo:solo ? rowName(solo) : null,
      eyes:rows.map(row => ({name:rowName(row),pressed:row.querySelector(options.eye)?.getAttribute('aria-pressed') || null})),collapsed:rows.filter(row => collapsed.has(row)).map(rowName)})});
  }
  setupTree(document.getElementById('v5Tree'),{row:'.v5-row',name:'.v5-name',eye:'.v5-eye',solo:'.v5-solo',selected:'sel',restore:document.querySelector('#v5TreeBox .mb-observe-reset'),lab:false});
  setupTree(lab.querySelector('.sample-tree'),{row:'.sample-tree-row',name:'.sample-tree-name',eye:'.sample-tree-eye',solo:'.sample-tree-solo',selected:'selected',lab:true});
  const treeToggle = document.querySelector('#v5TreeBox .mb-tree-toggle');
  treeToggle?.addEventListener('click',event => {
    if (!active()) return;
    event.preventDefault(); event.stopImmediatePropagation(); const tree = document.getElementById('v5Tree');
    tree.hidden = !tree.hidden; treeToggle.setAttribute('aria-expanded',String(!tree.hidden));
    treeToggle.textContent = tree.hidden ? '展开结构' : '收起结构'; report('仅切换树样本的可见性；参数未改变。');
  },true);

  // 原生details菜单在真实快照中保留；只提供导航/关闭，不执行命令。
  document.querySelectorAll('#right details.ab-more,#right details.mb-display').forEach(details => {
    const summary = details.querySelector(':scope>summary');
    const enabled = () => [...details.querySelectorAll('button,input,select')].filter(node => !node.disabled && !node.hidden && node.getClientRects().length);
    details.addEventListener('keydown',event => {
      if (!active()) return;
      if (event.key === 'Escape' && details.open) { event.preventDefault(); details.open = false; summary?.focus(); return; }
      if (event.target === summary && ['ArrowDown','ArrowUp'].includes(event.key)) { event.preventDefault(); details.open = true; const nodes = enabled(); (event.key === 'ArrowUp' ? nodes.at(-1) : nodes[0])?.focus(); return; }
      const nodes = enabled(); if (!nodes.length) return;
      const at = nodes.indexOf(event.target); if (at < 0) return; let to;
      if (event.key === 'ArrowDown') to = (at+1)%nodes.length; if (event.key === 'ArrowUp') to = (at+nodes.length-1)%nodes.length;
      if (event.key === 'Home') to = 0; if (event.key === 'End') to = nodes.length-1;
      if (to !== undefined) { event.preventDefault(); nodes[to].focus(); }
    });
    details.addEventListener('click',event => {
      if (!active()) return;
      const button = event.target.closest('button'); if (!button || button.disabled || !details.contains(button)) return;
      event.preventDefault(); event.stopImmediatePropagation(); details.open = false; summary?.focus();
      report('已选择菜单样本项“'+button.textContent.trim()+'”；保存、导出、连接目录等业务没有执行。');
    },true);
  });

  function applyMessage(message) {
    const presence = actualPresence();
    appliedFamilies = active() && typeof message.css === 'string' && message.css.length > 0
      ? [...new Set(Array.isArray(message.familyIds) ? message.familyIds : [])].filter(id => IDS.includes(id) && presence[id].present) : [];
    modeNote.textContent = active() ? '组合样式已加载 · 样本检查' : '128基线 · 组合样式未启用';
    inspectButton.disabled = !active(); toolsSelect.disabled = !active();
    if (!active()) closeLab();
    const state = {channel:CHANNEL,type:'combo-applied',version:'129',familyIds:[...appliedFamilies],labReady:labReady(presence),actualPresence:presence,
      boundary:'仅组件CSS及独立控件样本，不代表真实参数切换、烘焙、保存或导出已验证'};
    parent.postMessage(state,'*'); return state;
  }
  window.addEventListener('message',event => {
    const message = event.data;
    if (event.source !== parent || !message || message.channel !== CHANNEL) return;
    if (message.type === 'inspect-family' && IDS.includes(message.family)) inspectFamily(message.family,inspectButton);
  });
  window.Combo129 = Object.freeze({applyMessage,inspectFamily,getState:() => ({active:active(),labReady:labReady(),familyIds:[...appliedFamilies],actualPresence:actualPresence(),currentFamily:selectedFamily,labOpen:lab.open,trees:treeControllers.map(controller => ({kind:controller.kind,...controller.getState()})),
    boundary:'页面内控件样本；原128参数快照、disabled/inert与真实业务均保留'})});
  lab.querySelectorAll('[data-combo-family]').forEach(section => { section.hidden = section.dataset.comboFamily !== selectedFamily; });
  inspectButton.disabled = true; toolsSelect.disabled = true;
  modeNote.textContent = '128基线 · 组合样式未启用';
})();
