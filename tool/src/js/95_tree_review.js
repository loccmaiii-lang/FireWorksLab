// B 评审：观察回到结构树。沿用 layerView / graphSolo / rtShow，绝不改写配方显示与导出开关。
(() => {
  'use strict';
  if (document.body?.dataset.ui !== 'material-b') return;

  let cached = null, queued = false, barP = null, barVersion = '';
  const originalOuts = v5TrailOuts, originalTree = v5Tree, originalTabs = syncStageTabs;
  const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  const hide = (node, value) => { if (node.hidden !== value) node.hidden = value; };

  // 只取已有模型与产物口径的名字，不生成出生表、不烘焙，也不读取上一帧生成的按钮反推输出。
  function metadata() {
    const P = state.P, mobile = state.platform === 'mobile', live = state.view === 'live';
    if (!P || !isEmit(P)) return { items: [], note: '', platform: mobile ? '手机' : 'PC', live };
    const signature = [state.gen, state.view, state.platform, P.outPC, P.outMobile, P.rtFar, P.rtFullFx].join('|');
    if (cached?.P === P && cached.signature === signature) return cached.value;
    const platform = mobile ? '手机' : 'PC', output = mobile ? P.outMobile : P.outPC;
    const full = mobile ? rtMobFull(P) : rtPcFull(P), items = [], notes = [];
    const add = (k, name, gpu = false) => items.push({ k, name: name || RT_LAYER_CN[k] || k, gpu, cpu: !gpu && !['near', 'far', 'full'].includes(k) });
    const none = output === 'off';
    if (none && (!live || mobile)) notes.push(platform + '当前设为不出，没有可观察的输出。');
    else if (!live && rtHeadOnly(P) && (rtHeadOut(P) || mobile)) {
      add('full', mobile || output === 'dots' ? '独立星头 · CPU 粒子' : '独立星头 · 单帧');
      notes.push('纯星头没有近段或远段尾迹；这里只观察星头。');
    } else if (!live && full) {
      add('full', '合成一张 · 近段与远段');
      notes.push(platform + '合成一张，近段与远段不能分别观察；切回实时模拟可分层检查。');
    } else {
      add('near', rtIsFar(P) ? '近段' : '循环层');
      if (rtIsFar(P) && !mobile) add('far');
      if (mobile) notes.push(RT_MOBILE_PARTICLES ? '手机不包含独立远段；粒子按手机产物规则列出。' : '手机当前只有近段循环；不包含独立远段或 GPU 粒子。');
      else if (!rtIsFar(P)) notes.push('当前未启用近段与远段，没有独立远段。');
      if (live && full) notes.push('实时模拟分层检查；当前' + platform + '产物会合成一张。');
      if (none && live) notes.push('PC 当前不导出；这里仍可观察实时模拟。');
      const Q = live && full ? { ...P, rtGpuF: 0, rtGpuM: 0, rtGpuC: 0 } : P;
      const ES = rtBuildES(Q);
      if (live && full) {
        if (rtFxOn(P)) {
          ES.emitters.filter(e => RT_FX_NAMES.has(e.name)).forEach(e => add(e.name, '', !!e.gpu));
          if (rtTexDraw(Q, rtLoopInfo(Q)).some(c => c.k === 'E')) add('EmbersTex');
        }
      } else if (!mobile) ES.emitters.forEach(e => add(e.name, '', !!e.gpu));
      else if (RT_MOBILE_PARTICLES) {
        const pk = rtMobilePick(ES, P.rtMobile == null ? BASE.rtMobile : P.rtMobile, ES.T, 1 + (rtIsFar(P) ? 0 : 1));
        if (pk.glow) add(pk.glow.name, '', false);
        if (pk.spark) add(pk.spark.name, '', false);
      }
    }
    const value = { items, note: notes.join(' '), platform, live };
    cached = { P, signature, value }; return value;
  }

  function prepareBar(data = metadata()) {
    const bar = document.getElementById('rtLayerBar');
    if (!bar || !isEmit(state.P)) return;
    bar.dataset.mbObservationBackend = 'true';
    const signature = data.items.map(item => item.k).join(',');
    const version = [state.gen, state.view, state.platform, state.P.outPC, state.P.outMobile, signature].join('|');
    if (barP !== state.P || barVersion !== version || rtShow.sig !== signature || data.items.some(item => ![...bar.querySelectorAll('[data-k]')].some(b => b.dataset.k === item.k))) {
      rtLayerBarSync(data.items.map(item => [item.k, null, item.gpu]));
      barP = state.P; barVersion = version; // 新对象/参数没有实际颗数时留空，不沿用上一对象的帧统计。
    }
  }
  function originalButton(key) {
    prepareBar();
    return [...document.querySelectorAll('#rtLayerBar [data-k]')].find(button => button.dataset.k === key);
  }
  function proxy(key, solo = false) {
    const button = originalButton(key); if (!button) return;
    if (solo) button.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); else button.click();
    v5Sched(); schedule();
  }
  function restoreAll() {
    if (state.layerView) { state.layerView.solo = -1; state.layerView.mute = []; }
    graphSolo = null;
    prepareBar();
    const all = document.querySelector('#rtLayerBar [data-all]');
    if (all) all.click(); else rtShow.off.clear();
    buildLayerCard(); scopeSync(); v5Sched(); schedule();
  }
  function currentStatus() {
    const labels = [];
    if (state.tab === 'combo' && state.layerView?.solo >= 0) labels.push(layerName(state.layerView.solo));
    if (state.P?.sparkGraph && graphSolo) labels.push(state.P.sparkGraph.emitters.find(e => e.id === graphSolo)?.name || graphSolo);
    if (isEmit(state.P)) {
      const items = metadata().items, hidden = items.filter(item => rtShow.off.has(item.k));
      if (hidden.length) {
        const visible = items.filter(item => !rtShow.off.has(item.k));
        labels.push(visible.length === 1 ? visible[0].name : visible.length ? '自定 ' + visible.length + ' 项' : '全部暂不看');
      }
    }
    const muted = state.tab === 'combo' ? state.layerView?.mute?.length || 0 : 0;
    if (muted) labels.push('暂不看 ' + muted + ' 层');
    return labels.length ? '只看：' + labels.join(' / ') : '';
  }
  function tools() {
    const box = document.getElementById('v5TreeBox'), head = box?.querySelector('.v5-tools');
    if (!head) return;
    box.classList.add('mb-tree-observation');
    let group = head.querySelector('.mb-tree-observe-tools');
    if (!group) {
      group = document.createElement('span'); group.className = 'mb-tree-observe-tools';
      const stateLine = document.createElement('span'); stateLine.className = 'mb-observe-state'; stateLine.setAttribute('role', 'status');
      const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'mb-observe-reset'; reset.textContent = '恢复全部';
      reset.title = '恢复全部临时观察，不改变眼睛的配方显示或导出设置'; reset.addEventListener('click', restoreAll);
      group.append(stateLine, reset); head.appendChild(group);
    }
    const status = currentStatus(), stateLine = group.querySelector('.mb-observe-state');
    text(stateLine, status); hide(stateLine, !status);
    group.querySelector('.mb-observe-reset').disabled = !status;
    let note = box.querySelector('.mb-rt-observe-note');
    if (!note) { note = document.createElement('p'); note.className = 'mb-rt-observe-note'; box.appendChild(note); }
    const explanation = metadata().note; text(note, explanation); hide(note, !explanation);
  }

  // 从原可见节点推导视觉注解。只读 lv/key/sel；不重排、补造或扁平化物理层级。
  function structureRows(nodes) {
    const stack = [], rows = nodes.map((node, index) => {
      const depth = Number.isInteger(node.lv) && node.lv >= 0 ? node.lv : 0;
      stack.length = depth;
      const ancestors = stack.slice(); stack[depth] = index;
      return { node, index, depth, ancestors };
    });
    const selected = rows.find(row => row.node.sel);
    const path = selected ? [...selected.ancestors, selected.index].filter(Number.isInteger) : [];
    const edges = path.slice(1).map((end, index) => ({ start: path[index], end, level: rows[end].depth }));
    const nextSiblings = rows.map(row => {
      for (let next = row.index + 1; next < rows.length; next++) {
        if (rows[next].depth <= row.depth) return rows[next].depth === row.depth;
      }
      return false;
    });
    return rows.map(row => {
      const guides = [];
      for (let level = 1; level <= row.depth; level++) {
        const branch = level === row.depth;
        if (!branch && !nextSiblings[row.ancestors[level]]) continue;
        const edge = edges.find(item => item.level === level && item.start < row.index && row.index <= item.end);
        guides.push({ level, branch, continues: branch && nextSiblings[row.index], active: !!edge,
          turn: !!edge && row.index === edge.end, below: !!edge && row.index < edge.end });
      }
      return { ...row, onPath: path.includes(row.index), guides };
    });
  }
  function nodeRole(node) {
    if (node.kind === 'layer') return state.tab === 'combo' ? 'layer' : 'effect';
    if (node.kind === 'emit') return 'emitter';
    if (node.kind === 'out' || node.key === 't:输出') return 'output';
    if (node.kind === 'group') return node.key === 'g:graph' ? 'graph' : 'group';
    if (node.kind === 'add') return 'add';
    return node.key === 'whole' ? 'effect' : 'settings';
  }
  const typeIcons = Object.freeze({ effect: 'sparkles', layer: 'stack-2', emitter: 'circles', graph: 'hierarchy-2',
    group: 'hierarchy-2', output: 'package', settings: 'adjustments-horizontal', add: 'circles' });
  function presentStructure(row, info, nodes) {
    const { node, depth, ancestors, onPath, guides } = info, role = nodeRole(node);
    row.dataset.mbKind = node.kind; row.dataset.mbDepth = String(depth); row.dataset.mbRole = role;
    row.dataset.mbNodeKey = node.key; row.dataset.mbOnPath = String(onPath);
    row.dataset.mbAncestor = String(onPath && !node.sel);
    row.dataset.mbParentKey = nodes[ancestors[depth - 1]]?.key || '';
    let lines = row.querySelector(':scope > .mb-tree-guides');
    if (!lines) { lines = document.createElement('span'); lines.className = 'mb-tree-guides'; lines.setAttribute('aria-hidden', 'true'); row.prepend(lines); }
    const signature = JSON.stringify(guides);
    if (lines.dataset.mbGuideSignature !== signature) {
      const segments = guides.map(guide => {
        const line = document.createElement('span');
        line.className = 'mb-tree-guide' + (guide.branch ? ' is-branch' : '') + (guide.continues ? ' continues' : '')
          + (guide.active ? ' is-active' : '') + (guide.turn ? ' active-turn' : '') + (guide.below ? ' active-below' : '');
        line.style.setProperty('--mb-guide-level', String(guide.level)); return line;
      });
      lines.replaceChildren(...segments); lines.dataset.mbGuideSignature = signature;
    }
    const name = row.querySelector('.v5-name'); if (!name) return;
    let icon = name.querySelector(':scope > .mb-node-type'), label = name.querySelector(':scope > .mb-node-label');
    if (!icon || !label) {
      // 原 button 实例、data-act/data-n、焦点和监听不变；读屏仍读完整原名称。
      if (!name.hasAttribute('aria-label')) name.setAttribute('aria-label', node.name);
      icon = document.createElement('span'); icon.className = 'mb-node-type'; icon.setAttribute('aria-hidden', 'true');
      label = document.createElement('span'); label.className = 'mb-node-label'; name.replaceChildren(icon, label);
    }
    const iconName = typeIcons[role], uri = window.FWTypeIconAssets?.[iconName];
    icon.dataset.mbTypeIcon = iconName;
    if (uri) {
      const value = 'url("' + uri + '")';
      if (icon.style.getPropertyValue('--mb-type-icon') !== value) icon.style.setProperty('--mb-type-icon', value);
    }
    // 仅去原渲染器添加的层序号、分组符号；真实名称中的 01、数字和字样均保留。
    const displayName = node.kind === 'layer' && state.tab === 'combo' && Number.isInteger(node.i)
      ? String(layerName(node.i)) : node.kind === 'group' ? node.name.replace(/^◆\s*/, '') : node.name;
    text(label, displayName);
  }
  function syncTreeUI() {
    const tree = document.getElementById('v5Tree'); if (!tree) return;
    tools();
    const nodes = v5.nodes || [], structure = structureRows(nodes);
    tree.querySelectorAll('.v5-row').forEach(row => {
      const info = structure[+row.dataset.n], node = info?.node; if (!node) return;
      presentStructure(row, info, nodes);
      const eye = row.querySelector('[data-act="eye"]');
      if (eye && !eye.querySelector('[data-fw-icon]') && window.FWIcons) {
        const icon = document.createElement('span'); icon.className = 'fw-icon';
        icon.dataset.fwIcon = node.eye?.on === false ? 'hidden' : 'preview'; eye.replaceChildren(icon);
      }
      if (node.kind !== 'out' || !node.key.startsWith('o:')) return;
      const key = node.key.slice(2), icons = row.querySelector('.v5-icons'); if (!icons) return;
      let label = icons.querySelector('.mb-rt-observe-check');
      if (!label) {
        label = document.createElement('label'); label.className = 'mb-rt-observe-check';
        const input = document.createElement('input'); input.type = 'checkbox'; input.dataset.mbRtObserve = key;
        input.dataset.act = 'observe'; input.dataset.n = row.dataset.n;
        input.setAttribute('aria-label', '观察：' + node.name);
        const caption = document.createElement('span'); caption.textContent = '观察';
        label.title = '临时观察：勾选开/关；双击行名只看这一份。不会改变配方或导出。'; label.append(input, caption);
        if (eye) eye.replaceWith(label); else icons.prepend(label);
      }
      label.querySelector('input').checked = rtOn(key);
    });
    if (window.FWIcons) window.FWIcons.apply(tree);
  }
  function schedule() {
    if (queued) return; queued = true;
    setTimeout(() => { queued = false; syncTreeUI(); }, 0);
  }

  // 保留原树节点与 solo.go，只替换新皮肤中尾缀输出的取数来源。
  v5TrailOuts = function () {
    if (!isEmit(state.P)) return originalOuts.apply(this, arguments);
    const data = metadata(); prepareBar(data);
    return data.items.map(item => {
      const button = [...document.querySelectorAll('#rtLayerBar [data-k]')].find(b => b.dataset.k === item.k);
      return { ...item, n: button?.querySelector('.n')?.textContent || '' };
    });
  };
  v5Tree = function () { const result = originalTree.apply(this, arguments); syncTreeUI(); return result; };
  syncStageTabs = function () { const result = originalTabs.apply(this, arguments); v5Sched(); return result; };

  function init() {
    const tree = document.getElementById('v5Tree'); if (!tree) return;
    new MutationObserver(schedule).observe(tree, { childList: true }); // 只观察原树重建，不观察自己补入的控件。
    tree.addEventListener('change', event => { const input = event.target.closest('[data-mb-rt-observe]'); if (input) proxy(input.dataset.mbRtObserve); });
    tree.addEventListener('dblclick', event => {
      const name = event.target.closest('.v5-name'); if (!name) return;
      const node = v5.nodes?.[+name.dataset.n]; if (node?.kind === 'out') proxy(node.key.slice(2), true);
    });
    const bar = document.getElementById('rtLayerBar');
    bar?.addEventListener('click', () => { v5Sched(); schedule(); });
    bar?.addEventListener('dblclick', () => { v5Sched(); schedule(); });
    v5Sync();
  }
  window.MaterialBTreeReview = Object.freeze({ sync: () => { v5Sync(); },
    getState: () => ({ ...metadata(), items: metadata().items.map(item => ({ ...item, observed: rtOn(item.k) })), status: currentStatus() }) });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
