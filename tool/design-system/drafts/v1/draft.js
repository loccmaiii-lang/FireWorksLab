/* 本文件为全新审阅控制器：仅切页、密度、折叠、选择；不接模拟、文件、保存、导出、导入或 UE。 */
(() => {
  'use strict';
  const pages = new Set(['editor','delivery','rt6','particle','workbench','importer','components']);
  const query = new URLSearchParams(location.search);
  const cleanPage = value => pages.has(value) ? value : 'editor';
  const cleanDensity = value => value === 'compact' ? 'compact' : 'regular';
  const escape = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  // 密度选择只出现在独立设计审阅工具栏，不新增产品设置入口。
  if (document.querySelector('#review-frame')) {
    let page = cleanPage(query.get('page'));
    let density = cleanDensity(query.get('density'));
    const select = document.querySelector('#review-page');
    function updateReview() {
      const url = `screen.html?page=${page}&density=${density}`;
      select.value = page;
      document.querySelector('#review-frame').src = url;
      document.querySelector('#review-open').href = url;
      document.querySelectorAll('[data-review-density]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.reviewDensity === density)));
      history.replaceState(null, '', `?page=${page}&density=${density}`);
    }
    select.addEventListener('change', () => { page = cleanPage(select.value); updateReview(); });
    document.querySelectorAll('[data-review-density]').forEach(button => button.addEventListener('click', () => { density = cleanDensity(button.dataset.reviewDensity); updateReview(); }));
    window.addEventListener('message', event => {
      if (event.source !== document.querySelector('#review-frame').contentWindow || event.data?.type !== 'draft-page') return;
      page = cleanPage(event.data.page);
      select.value = page;
      document.querySelector('#review-open').href = `screen.html?page=${page}&density=${density}`;
      history.replaceState(null, '', `?page=${page}&density=${density}`);
    });
    updateReview();
    return;
  }

  const state = {
    page:cleanPage(query.get('page')), density:cleanDensity(query.get('density')),
    selected:query.get('page')==='editor'||!query.get('page')||query.get('page')==='delivery'?'main':'core', hidden:new Set(), solo:null, collapsed:new Set(), importPane:'review',
    linked:new Set(['core','tail']), importFiles:new Set(['demo-gold','demo-tail']),
    timelineZoom:'overview', selectedClip:'c2', editorReturn:'editor',
    scrollByPage:new Map(), treeView:'expanded', selectedAsset:query.get('page')==='rt6'?'rt6':query.get('page')==='particle'?'particle':'gold', unreadyNotice:false,
    disclosures:new Map(), parameterSearch:new Map(), librarySearch:''
  };
  // 窄档只切呈现窗格，业务对象、选择与参数上下文仍是同一份。
  state.bakerPane='preview'; state.workbenchPane='preview'; state.deliveryPane='preview';
  state.deliveryInspector=false; state.demoValues=new Map(); state.locked=new Set(); state.onlyModified=false; state.english=false; state.searchRestore=new Map(); state.selectionByPage=new Map(); state.treeHeight=216;
  const names = {editor:'编辑',delivery:'预览优先交付',rt6:'RT6 · 升空尾缀',particle:'粒子图',workbench:'编排主台',importer:'导入核对',components:'组件规格 / 四层'};
  document.body.dataset.density = state.density;
  const app = document.querySelector('#app');
  const icon = name => `<span data-fw-icon="${name}" aria-hidden="true"></span>`;
  // 实际旧原型图标的 SVG 数据，仅保留图形资产，不复用其布局或控制器。
  const soloIcon = '<svg class="draft-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><circle class="fill" cx="8" cy="8" r="2"/></svg>';
  const moreIcon = '<svg class="draft-icon" viewBox="0 0 16 16" aria-hidden="true"><circle class="fill" cx="3.5" cy="8" r="1.2"/><circle class="fill" cx="8" cy="8" r="1.2"/><circle class="fill" cx="12.5" cy="8" r="1.2"/></svg>';
  const inert = (label, cls = '', title = '设计示意：未接业务，此处不可执行') => `<button type="button" class="${cls}" disabled title="${title}">${label}</button>`;
  const numericLabels = new Set(['发射数量','粒子寿命','速度','扩散角度','阻力','亮度','持续时间','拖尾长度','单帧尺寸','开始时间','朝向']);
  const field = (label, value, unit = '', options = null) => `<label class="field-row"><span class="field-label">${label}</span>${options ? `<select aria-label="${label}（设计示意）">${options.map(item => `<option${item === value ? ' selected' : ''}>${item}</option>`).join('')}</select>` : `<span class="unit-field"><input${numericLabels.has(label) ? ' type="number" class="draft-number" step="any"' : ' type="text"'} aria-label="${label}（设计示意）" value="${value}" readonly>${unit ? `<span>${unit}</span>` : ''}</span>`}</label>`;
  const module = (title, summary, content, open = true) => `<details class="param-module"${open ? ' open' : ''}><summary><span>${title}</span><span class="helper">${summary}</span></summary><div class="module-body">${content}</div></details>`;
  const pair = (label, value) => `<div class="data-pair"><span class="muted">${label}</span><span>${value}</span></div>`;
  const status = (text, type='pending') => `<div class="status-line status-${type}"><span class="status-dot" aria-hidden="true"></span><span>${text}</span></div>`;
  function appbar(tool) {
    return `<header class="appbar"><span class="brand"><b class="df-mark">DF</b> 特效工作台</span><span class="muted">/</span><div class="appbar-context"><span>${tool}</span><span class="helper">设计候选稿 · 未连接项目</span></div><div class="appbar-tools"><span class="badge badge-demo">设计示意</span><button type="button" class="btn-ghost" data-route="components">组件规格</button></div></header>`;
  }
  function paneSwitcher(tool) {
    const delivery=state.page==='delivery';
    const entries=delivery ? [['preview','预览','draft-delivery-preview'],['checklist','清单','draft-delivery-checklist']] : tool==='workbench' ? [['library','库','draft-library'],['preview','预览','draft-preview'],['timeline','时间线','draft-timeline'],['inspector','参数','draft-inspector']] : [['library','库','draft-library'],['preview','预览','draft-preview'],['inspector','结构 / 参数','draft-inspector']];
    const current=delivery?state.deliveryPane:tool==='workbench'?state.workbenchPane:state.bakerPane;
    const attribute=delivery?'data-delivery-pane':tool==='workbench'?'data-workbench-pane':'data-baker-pane';
    return `<div class="segmented pane-switcher" role="group" aria-label="工作区窗格，仅切换呈现">${entries.map(([id,label,target])=>`<button type="button" ${attribute}="${id}" aria-controls="${target}" aria-pressed="${current===id}">${label}</button>`).join('')}</div>`;
  }
  const assets = [
    ['gold','金曜菊-B','GLB-S1 · 三层','preview-gold.png'],['rt6','升空尾缀','RT6M · 循环层与粒子','preview-rt6.jpg'],['particle','窜天猴尾焰','SGR1 · 分层粒子图','preview-sgs1.png'],['jm4','金芒菊','JM4 · 旧缩略参考','thumb-jm4.jpg'],['hk','鸿巢四尺玉','HK · 旧缩略参考','thumb-hk.jpg'],['hn','引菊→锦','HN · 旧缩略参考','thumb-hn.jpg'],['qn','萤柠星','QN · 旧缩略参考','thumb-qn.jpg'],['qc','翠芯银辉','QC · 旧缩略参考','thumb-qc.jpg'],['qd','橙芯四变菊','QD · 旧缩略参考','thumb-qd.jpg'],['qa','金樱菊（球形A）','QA · 旧缩略参考','thumb-qa.jpg'],['prism','万彩千轮','PRISM · 旧缩略参考','thumb-prism.jpg']
  ];
  function library(workbench = false) {
    return `<aside id="draft-library" class="library" aria-label="${workbench ? '基础模板库' : '效果库'}"><h2 class="pane-heading">${workbench ? '基础模板库' : '效果库'}<span class="helper">样例 ${assets.length}</span></h2><label class="sr-only" for="library-search">搜索${workbench ? '基础模板' : '效果'}</label><input id="library-search" class="library-search" type="search" placeholder="搜索名称 / 编号" autocomplete="off"><div class="segmented" role="group" aria-label="示意库范围"><button type="button" aria-pressed="true" data-library-tab="all">全部</button><button type="button" aria-pressed="false" data-library-tab="recent">最近</button></div><div class="library-list">${assets.map(([id,name,meta,img]) => `<button type="button" class="library-item" data-asset="${id}" data-search="${name} ${meta}" aria-pressed="${state.selectedAsset === id}"><img src="assets/${img}" alt="${name}旧静态缩略参考"><span><strong>${name}</strong><small>${meta}</small></span></button>`).join('')}<button type="button" class="library-unready" data-unready-asset="true"><span>鸿巢（Mesh）</span><span class="helper">缺配方提示 · 状态样板</span></button></div><div class="library-footer helper">缩略图为旧静态参考。<br>本稿不代表当前资产、质量或输出结果。</div></aside>`;
  }
  function toolbar(page) {
    const delivery=page==='delivery';
    return `<div class="center-toolbar"><div class="segmented view-tabs" role="group" aria-label="工作视图"><button type="button" data-route="${state.editorReturn}" aria-pressed="${!delivery}">实时模拟</button>${inert('引擎回放','draft-secondary','设计稿仅展示布局，未连接引擎')}${inert('贴图流转','draft-secondary','设计稿未生成贴图')}<button type="button" data-route="delivery" aria-pressed="${delivery}">交付清单</button></div><div class="center-actions">${inert('保存')}${inert('另存')}${delivery?`<button type="button" data-toggle-inspector aria-pressed="${state.deliveryInspector}" class="btn-ghost">${state.deliveryInspector?'收起编辑栏':'打开编辑栏'}</button>`:''}<button type="button" data-role="package-export" class="btn-primary" disabled title="尚未生成可导出的素材包；本设计稿未接业务">导出素材包</button></div></div>`;
  }
  function observation(page) {
    const current=nodesFor(page).find(n=>n.id===state.solo);
    return `<div class="observation-row"><details class="observation-menu"><summary>观察…</summary><div class="menu-commands">${nodesFor(page).filter(n=>!n.noObservation).map(n=>`<button type="button" data-solo="${n.id}" aria-pressed="${state.solo===n.id}">只看 ${n.name}<small>仅临时观察，不改变配方或输出</small></button>`).join('')}<button type="button" data-clear-solo>恢复全部观察</button><details><summary>保留的临时观察能力</summary><p class="helper">正式实施时把现有多项临时观察选项迁入此入口。此稿演示节点只看，不复制其业务逻辑。</p></details></div></details><span class="helper">${current?'只看：'+escape(current.name):'观察：全部'}</span>${current?'<button type="button" data-clear-solo class="btn-ghost">恢复全部</button>':''}<span class="helper observation-scope">只看不改导出</span></div>`;
  }
  function preview(page, delivery = false) {
    const ref = page === 'rt6' ? 'preview-rt6.jpg' : page === 'particle' ? 'preview-sgs1.png' : 'preview-gold.png';
    return `<div class="preview" id="draft-preview" aria-label="旧静态渲染参考"><img class="preview-img" src="assets/${ref}" alt="旧静态渲染参考，仅审阅工作区比例，不是本轮实时预览"><div class="preview-meta"><span class="badge">设计示意 · 静态参考</span><span class="preview-caption">静态截帧 · 未接模拟</span></div><span class="preview-axis">${page === 'rt6' ? '升空尾焰 · 旧静态帧' : '正视 · 适配视口'}</span></div>`;
  }
  function playback() {
    const page=state.page==='delivery'?state.editorReturn:state.page;
    const layers=page==='rt6'?['近景尾焰','远景尾焰']:page==='particle'?['火星组','烟雾组','爆点组']:['橙引线层','金锦层','点灭星'];
    return `<div class="playback-area"><div class="playback">${inert(icon('play'),'btn-play','播放：只有静态截帧，未接模拟')}<span class="nowrap">静态参考</span><div class="progress" aria-hidden="true"><span></span></div><span class="helper">未计算时间</span>${inert(icon('refresh'),'icon-button btn-ghost','重播：未接模拟')}</div><details class="layer-timeline"${innerHeight>700?' open':''}><summary>图层与时间 · 布局示意</summary>${layers.map((name,i)=>`<div class="demo-layer-track"><span>${i+1} · ${name}</span><div class="demo-track-bar"><span style="width:${[76,90,42][i]}%"></span></div></div>`).join('')}</details></div>`;
  }
  function nodesFor(page) {
    if(page==='rt6')return [{"id":"effect","name":"升空尾缀 · 循环层 + 粒子 小 / 中 / 大","level":0,"kind":"图层","branch":true,"noVisibility":true,"noObservation":false,"sourceKey":"L0"},{"id":"core","name":"星头","level":1,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"t:星头"},{"id":"t:白热火花","name":"白热火花","level":1,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"t:白热火花"},{"id":"g:火花共用","name":"火花共用","level":1,"kind":"分组","branch":true,"noVisibility":true,"noObservation":true,"sourceKey":"g:火花共用"},{"id":"t:细火花","name":"细火花","level":2,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"t:细火花"},{"id":"t:中火花","name":"中火花","level":2,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"t:中火花"},{"id":"t:粗火花","name":"粗火花","level":2,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"t:粗火花"},{"id":"t:落火","name":"落火","level":1,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"t:落火"},{"id":"t:烟带","name":"烟带","level":1,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"t:烟带"},{"id":"t:爆亮","name":"爆亮","level":1,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"t:爆亮"},{"id":"t:发射口","name":"发射口","level":1,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"t:发射口"},{"id":"t:输出","name":"输出","level":1,"kind":"设置","branch":true,"noVisibility":true,"noObservation":true,"sourceKey":"t:输出"},{"id":"o:near","name":"近段","level":2,"kind":"输出","branch":false,"noVisibility":true,"noObservation":false,"sourceKey":"o:near"},{"id":"o:far","name":"远段","level":2,"kind":"输出","branch":false,"noVisibility":true,"noObservation":false,"sourceKey":"o:far"},{"id":"o:parts","name":"粒子发射器 · 8","level":2,"kind":"分组","branch":true,"noVisibility":true,"noObservation":true,"sourceKey":"o:parts"},{"id":"o:SparksFine","name":"细火花","level":3,"kind":"输出","branch":false,"noVisibility":true,"noObservation":false,"sourceKey":"o:SparksFine"},{"id":"o:SparksTwinkle","name":"闪烁火花","level":3,"kind":"输出","branch":false,"noVisibility":true,"noObservation":false,"sourceKey":"o:SparksTwinkle"},{"id":"o:SparksCoarse","name":"粗火花","level":3,"kind":"输出","branch":false,"noVisibility":true,"noObservation":false,"sourceKey":"o:SparksCoarse"},{"id":"o:Embers","name":"落火","level":3,"kind":"输出","branch":false,"noVisibility":true,"noObservation":false,"sourceKey":"o:Embers"},{"id":"o:HeadGlow","name":"星头光晕","level":3,"kind":"输出","branch":false,"noVisibility":true,"noObservation":false,"sourceKey":"o:HeadGlow"},{"id":"o:SparkPops","name":"末段爆亮","level":3,"kind":"输出","branch":false,"noVisibility":true,"noObservation":false,"sourceKey":"o:SparkPops"},{"id":"o:LaunchGlow","name":"发射口闪光","level":3,"kind":"输出","branch":false,"noVisibility":true,"noObservation":false,"sourceKey":"o:LaunchGlow"},{"id":"o:LaunchSparks","name":"发射口火花","level":3,"kind":"输出","branch":false,"noVisibility":true,"noObservation":false,"sourceKey":"o:LaunchSparks"}];
    if(page==='particle')return [{"id":"effect","name":"窜天猴尾焰 · 分层喷射","level":0,"kind":"图层","branch":true,"noVisibility":true,"noObservation":false,"sourceKey":"L0"},{"id":"g:graph","name":"粒子图 · 整体","level":1,"kind":"分组","branch":true,"noVisibility":true,"noObservation":true,"sourceKey":"g:graph"},{"id":"core","name":"01｜燃烧核心","level":2,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"p:e01"},{"id":"p:e02","name":"02｜细长暗丝","level":2,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"p:e02"},{"id":"p:e03","name":"03｜中等金丝","level":2,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"p:e03"},{"id":"p:e04","name":"04｜粗亮短火星","level":2,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"p:e04"},{"id":"p:e05","name":"05｜分裂母粒","level":2,"kind":"发射器","branch":true,"noVisibility":false,"noObservation":false,"sourceKey":"p:e05"},{"id":"p:e06","name":"06｜一级分叉","level":3,"kind":"发射器","branch":true,"noVisibility":false,"noObservation":false,"sourceKey":"p:e06"},{"id":"p:e08","name":"08｜二级碎火星","level":4,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"p:e08"},{"id":"p:e07","name":"07｜延迟分叉","level":3,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"p:e07"},{"id":"p:e09","name":"09｜不规则粗碎片","level":2,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"p:e09"},{"id":"p:e10","name":"10｜暗红余烬","level":2,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"p:e10"},{"id":"p:e11","name":"11｜圆形余烬","level":2,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"p:e11"},{"id":"p:e12","name":"12｜近远景粗火星","level":2,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"p:e12"},{"id":"p:e13","name":"13｜燃烧头炽热点","level":2,"kind":"发射器","branch":false,"noVisibility":false,"noObservation":false,"sourceKey":"p:e13"},{"id":"t:输出","name":"输出","level":1,"kind":"设置","branch":false,"noVisibility":true,"noObservation":true,"sourceKey":"t:输出"}];
    return [
      {id:'effect',name:'金曜菊-B',level:0,kind:'效果',branch:true},
      {id:'orange',name:'引菊→锦 · 橙引线层',level:1,kind:'图层',branch:true},
      {id:'orangeStar',name:'星',level:2,kind:'发射器'},
      {id:'main',name:'引菊→锦 · 金锦层',level:1,kind:'图层',branch:true},
      {id:'core',name:'星',level:2,kind:'发射器'},
      {id:'tail',name:'火花',level:2,kind:'发射器'},
      {id:'afterglow',name:'点灭星',level:1,kind:'图层',branch:true},
      {id:'halo',name:'星',level:2,kind:'发射器'},
      {id:'output',name:'输出设置',level:1,kind:'设置',noVisibility:true}
    ];
  }
  function visibleNodes(page) {
    const nodes = nodesFor(page);
    let hiddenLevel = Infinity;
    return nodes.filter(node => {
      if (node.level <= hiddenLevel) hiddenLevel = Infinity;
      const visible = node.level <= hiddenLevel;
      if (visible && node.branch && state.collapsed.has(node.id)) hiddenLevel = node.level;
      return visible;
    });
  }
  function treeActions(node) {
    const eye=node.noVisibility?'<span class="tree-action-placeholder" aria-hidden="true"></span>':`<button type="button" class="tree-action" data-eye="${node.id}" aria-pressed="${!state.hidden.has(node.id)}" aria-label="${state.hidden.has(node.id)?'显示':'隐藏'}${node.name}（影响配方与输出的语义示意）" title="眼睛：正式语义影响配方和输出，本稿仅切换示意状态">${icon(state.hidden.has(node.id)?'hidden':'preview')}</button>`;
    const solo=node.noObservation?'<span class="tree-action-placeholder" aria-hidden="true"></span>':`<button type="button" class="tree-action" data-solo="${node.id}" aria-pressed="${state.solo===node.id}" aria-label="只看${node.name}（仅预览）" title="只看：仅临时观察，不改配方或输出">${soloIcon}</button>`;
    return eye+solo;
  }
  function tree(page) {
    if(state.treeView==='path')return `<div class="tree-pane"><div class="tree-heading"><h2>结构</h2><button type="button" data-tree-view="expanded" class="btn-ghost">展开结构</button></div><div class="helper">${escape(selectedPath(page))}</div></div>`;
    return `<div class="tree-pane"><div class="tree-heading"><h2>结构</h2><span class="tree-columns helper">显示 / 只看</span><button type="button" data-tree-view="path" class="btn-ghost">收为路径</button></div><ul class="tree-list" role="tree" aria-label="效果结构">${visibleNodes(page).map(node=>`<li class="tree-row${state.hidden.has(node.id)?' is-hidden':''}" role="treeitem" aria-level="${node.level+1}" aria-selected="${node.id===state.selected}"${node.branch?` aria-expanded="${!state.collapsed.has(node.id)}"`:''} style="--draft-level:${node.level}"><button type="button" class="tree-toggle"${node.branch?` data-collapse="${node.id}" aria-label="${state.collapsed.has(node.id)?'展开':'折叠'}${node.name}"`:' disabled aria-hidden="true" tabindex="-1"'}>${node.branch?`<span style="display:inline-flex;transform:rotate(${state.collapsed.has(node.id)?'-90':'0'}deg)">${icon('expand')}</span>`:''}</button><button type="button" class="tree-name" data-select-node="${node.id}" title="${node.name}" tabindex="${node.id===state.selected?0:-1}">${node.name}</button><span class="tree-type">${node.kind}</span>${treeActions(node)}</li>`).join('')}</ul><p class="tree-help">眼睛影响配方/输出，靶心只作临时观察。<br>输出子项只有只看入口。本稿不修改业务数据。</p></div>`;
  }
  function selectedNode(page) { return nodesFor(page).find(node => node.id === state.selected) || nodesFor(page).find(n=>n.id==='core') || nodesFor(page)[0]; }
  function shortSelectedPath(page) {
    const stack=[];const target=selectedNode(page);
    for(const node of nodesFor(page)){stack.length=node.level;stack[node.level]=node.id==='effect'?(page==='rt6'?'RT6M':page==='particle'?'SGR1':node.name):node.name;if(node.id===target.id)return stack.slice(-2).join(' › ');}return target.name;
  }
  function selectedPath(page) {
    const stack=[];
    const selected=selectedNode(page);
    for(const node of nodesFor(page)) {
      stack.length=node.level;
      stack[node.level]=node.name;
      if(node.id===selected.id) return stack.join(' / ');
    }
    return selected.name;
  }
  function linkedRows() {
    return `<div class="check-list"><div class="check-list-head"><strong>联动对象</strong><span class="helper" data-linked-count>已选 ${state.linked.size} / 3 · 样例</span></div><p class="field-help">每项独立勾选；只演示选择排版，不更改配方。</p>${[['core','橙引线层','第1层'],['tail','金锦层','第2层'],['halo','点灭星','第3层']].map(([id,label,group]) => `<label class="checkbox-row"><input type="checkbox" data-linked="${id}"${state.linked.has(id) ? ' checked' : ''}><span>${label}</span><span class="helper">${group}</span></label>`).join('')}</div>`;
  }
  const sampleParams=[['count','星数','starCount',240,'颗',0,500,1],['delay','点火延迟','igniteDelay',0,'s',0,5,.01],['size','颗粒大小','adjSparkSize',1,'×',0,2,.01],['tempo','节奏','tempo',1,'×',.2,2,.01],['duration','层长','durationScale',1,'×',.2,2,.01],['spread','线条宽度','adjSpread',1,'×',0,2,.01]];
  function paramRow(p) {
    const [id,label,en,initial,unit,min,max,step]=p;const key=parameterContext()+':'+id,value=state.demoValues.has(key)?state.demoValues.get(key):initial,changed=Number(value)!==initial,locked=state.locked.has(key);
    return `<div class="parameter-grid${changed?' is-modified':''}" data-param-row data-param-id="${id}" data-param-key="${key}" data-param-label="${label} ${en}" data-modified="${changed}"><label for="param-${id}" title="${en}"><span class="modification-dot" aria-label="${changed?'已修改':'未修改'}">${changed?'●':''}</span>${state.english?en:label}</label><input class="draft-range" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-range="${id}" aria-label="${label}示意滑杆"${locked?' disabled':''}><input id="param-${id}" class="draft-number" type="number" min="${min}" max="${max}" step="${step}" value="${value}" data-number="${id}" aria-label="${label}示意数值"${locked?' readonly':''}><span class="param-unit">${unit}</span><button type="button" class="row-action btn-ghost" data-reset-param="${id}" title="还原${label}示意值" aria-label="还原${label}">↺</button><button type="button" class="row-action btn-ghost" data-lock-param="${id}" aria-pressed="${locked}" aria-label="${locked?'解锁':'锁定'}${label}" title="${locked?'解锁':'锁定'}${label}">${locked?'解':'锁'}</button><button type="button" class="row-action btn-ghost" data-help-param="${id}" title="${label}帮助" aria-label="${label}帮助">?</button><p class="param-row-help helper" data-help-for="${id}" hidden>${label}（${en}） · 单位${unit}。本稿只演示控件排版与局部状态，不计算或保存配方。</p></div>`;
  }
  function paramContent(page) {
    const current=selectedNode(page);
    if(['输出','设置'].includes(current.kind))return module('输出设置','只读状态示意',field('当前输出',current.name)+field('平台','PC / 手机同源')+status('当前烘焙：未接业务')+status('已有素材包：未验证')+'<p class="helper">此项只看仅影响观察。输出字段仍由现有生成器负责，此稿不编造完成值。</p>');
    const layer=['图层','分组','效果'].includes(current.kind);
    return module(layer?'整体调整':'生成',layer?'75 帧 · 5 张 · 示意':'星数240 · 示意',(layer?sampleParams.slice(3):sampleParams.slice(0,3)).map(paramRow).join('')+(layer?'<div class="metric-line"><span class="metric-unit">3.57 s</span><span>·</span><span class="metric-unit">75 帧</span><span>·</span><span class="metric-unit">5 张</span></div><p class="helper">示意摘要，非当前参数计算结果</p><div class="preset-row" role="group" aria-label="节奏预设示意">'+[.8,1,1.25,1.5,2].map(n=>`<button type="button" data-tempo-preset="${n}" aria-pressed="${Number(state.demoValues.get(parameterContext()+':tempo')||1)===n}">${n===1?'原样':'×'+n}</button>`).join('')+'</div>':'')) + module('形状','球形 · 示意',field('出生方式','单次序列','',['单次序列','连续发射'])+field('发射形状','球形','',['球形','锥形','点']),false) + module('运动与亮度','保持物理层级',field('速度','18.0','m/s')+field('亮度','1.0'),false)+module('关联图层','独立选择',linkedRows()+'<details class="help-disclosure"><summary>联动范围与说明</summary><p>将现有种子、星数、速度等联动范围集中说明；每层独立完整点击行，不删真实物理层级。</p></details>',false)+module('输出与资源','未计算 / 未生成',status('配方：示意值，未保存')+status('当前烘焙：未接业务')+status('已有素材包：未验证'),false);
  }
  function inspector(page) {
    const node=selectedNode(page);
    return `<aside id="draft-inspector" class="inspector" aria-label="结构与参数" style="--draft-tree-height:${state.treeHeight}px"><div class="inspector-identity"><strong>${page==='rt6'?'升空尾缀 / RT6M':page==='particle'?'粒子图 / 示例结构':'金曜菊-B / GLB-S1'}</strong><div class="helper">设计示意 · 未计算 · 未生成资源</div>${state.unreadyNotice?'<p class="unready-notice" role="status">未切换：鸿巢（Mesh）缺可用配方；当前仍编辑'+escape(selectedPath(page))+'。</p>':''}</div>${tree(page)}<div class="splitter" role="separator" tabindex="0" aria-label="结构与参数高度" aria-orientation="horizontal" aria-valuemin="128" aria-valuemax="420" aria-valuenow="${state.treeHeight}"></div><section class="parameters" aria-label="当前节点参数"><div class="param-context"><div class="path" title="${escape(selectedPath(page))}">当前编辑：${escape(shortSelectedPath(page))}</div><div class="parameter-search-row"><label class="sr-only" for="parameter-search">搜索当前节点参数</label><input id="parameter-search" type="search" placeholder="搜索当前节点参数" autocomplete="off"><button type="button" class="btn-ghost" data-clear-search>清空</button></div><div class="parameter-filters"><label><input type="checkbox" data-only-modified${state.onlyModified?' checked':''}>仅改动</label><label><input type="checkbox" data-english${state.english?' checked':''}>英文名</label></div><div class="search-feedback helper" role="status" hidden></div></div><div class="param-modules">${paramContent(page)}</div><p class="no-search-results helper" hidden>当前节点没有匹配参数。可清空搜索或选择其他节点。</p></section></aside>`;
  }
  function delivery() {
    return `<div class="delivery-body" data-delivery-pane="${state.deliveryPane}"><div class="delivery-preview" id="draft-delivery-preview">${preview(state.editorReturn,true)}${playback()}</div><section class="delivery-checklist" id="draft-delivery-checklist" aria-label="交付核对"><h2>交付清单</h2><p class="helper">编辑栏已暂收；返回编辑恢复原上下文。</p><section class="delivery-section"><h3>名称</h3><label class="sr-only" for="delivery-name">保存名称</label><div class="delivery-name-form"><input id="delivery-name" value="金曜菊-B_PC_示例" readonly aria-describedby="delivery-name-help">${inert('保存名称','btn-ghost','设计示意；此处仅保存名称，不代替顶栏配方保存')}</div><p id="delivery-name-help" class="helper">名称未保存 · 设计示意</p></section><section class="delivery-section"><h3>每层输出</h3>${[['橙引线层','同源输出 · 未计算'],['金锦层','75 帧 · 5 张'],['点灭星','同源输出 · 未计算']].map(([name,summary])=>`<div class="output-layer">${pair(name,`<span class="metric-unit">${summary}</span>`)}</div>`).join('')}<p class="helper">张数为排版样例，PC/手机沿用同一配方来源。</p><details><summary>尺寸与平台明细</summary>${pair('单帧尺寸','512 × 512 px · 示例')}${pair('PC / 手机','未生成 / 未生成')}</details></section><section class="delivery-section"><h3>包内容与预检</h3><label class="checkbox-row"><input type="checkbox" checked data-demo-check><span>PC 资源</span></label><label class="checkbox-row"><input type="checkbox" checked data-demo-check><span>手机资源</span></label>${status('配方：示意值，未保存')}${status('当前烘焙：未接业务')}${status('已有素材包：未验证')}<p class="status-warning helper">当前不能导出：未生成素材包。</p><details><summary>预检明细</summary><p class="helper">尚未运行检查；可导出与画质通过分别显示，不伪造通过状态。</p></details></section><section class="delivery-section"><h3>导入范围</h3><p>当前配方的选中图层</p><details><summary>包含哪些内容</summary><p class="helper">层输出、平台清单和版本信息按同一来源记录；此稿不生成文件、不连接UE。</p></details></section></section></div>`;
  }
  function renderBaker() {
    const page = state.page;
    const contentPage = page === 'delivery' ? state.editorReturn : page;
    return `<div class="app">${appbar('烟花烘焙器')}${paneSwitcher('baker')}<main class="workspace" data-page="${page}" data-active-pane="${state.bakerPane}" data-edit-open="${state.deliveryInspector}">${library()}<section class="center" aria-label="预览工作区">${toolbar(page)}${page === 'delivery' ? delivery() : `<div class="editor-body">${observation(page)}${preview(page)}${playback()}</div>`}</section>${inspector(contentPage)}</main></div>`;
  }
  const clips = [
    {id:'c1',name:'金蕊凝 · 主花',short:'金蕊凝',track:0,left:2,width:14},
    {id:'c2',name:'升空尾焰 · 近景',short:'升空尾焰',track:0,left:20,width:24},
    {id:'c3',name:'红冠 · 连发一',short:'红冠',track:0,left:48,width:7},
    {id:'c4',name:'青凝 · 远景',short:'青凝',track:0,left:60,width:5},
    {id:'c5',name:'金蕊凝 · 尾段',short:'金蕊凝',track:1,left:8,width:18},
    {id:'c6',name:'银冠 · 连发二',short:'银冠',track:1,left:31,width:10},
    {id:'c7',name:'粒子图 · 火星组',short:'火星组',track:1,left:45,width:28},
    {id:'c8',name:'暖金花 · 收尾',short:'暖金花',track:2,left:76,width:19}
  ];
  function stage() {
    return `<div class="stage" id="draft-preview"><svg viewBox="0 0 1000 500" aria-label="编排舞台结构示意，不是引擎画面" role="img"><g class="stage-grid"><path d="M80 400H920M150 350H850M220 300H780M290 250H710M360 200H640M430 150H570M500 100L80 400M500 100L220 400M500 100L360 400M500 100L500 400M500 100L640 400M500 100L780 400M500 100L920 400"/></g><path class="stage-extent" d="M290 250L360 200H640L710 250L640 300H360Z"/><g class="stage-nodes"><circle cx="380" cy="260" r="5"/><circle cx="440" cy="260" r="5"/><circle cx="500" cy="260" r="7"/><circle cx="560" cy="260" r="5"/><circle cx="620" cy="260" r="5"/></g><g fill="currentColor" font-size="14"><text x="485" y="237">发射位 03</text><text x="86" y="426">左</text><text x="904" y="426">右</text></g></svg><span class="stage-label badge">舞台结构示意 · 无引擎连接</span><span class="stage-note helper">点位及轨道均为布局样例<br>不代表编排、仿真或可交付结果</span></div>`;
  }
  function timeline() {
    return `<section id="draft-timeline" class="timeline" aria-label="时间线布局示意"><div class="timeline-toolbar"><h2>时间线 <span class="helper">布局样例 · 20 s</span></h2><div class="segmented" role="group" aria-label="时间线显示比例"><button type="button" data-timeline-zoom="overview" aria-pressed="${state.timelineZoom === 'overview'}">总览</button><button type="button" data-timeline-zoom="detail" aria-pressed="${state.timelineZoom === 'detail'}">细看</button></div><span class="helper">缩放只示意标签层级，不改片段时序</span></div><div class="timeline-scroll"><div class="timeline-ruler"><span class="track-name">轨道 / 秒</span><div class="ruler-line">${['0','2','4','6','8','10','12','14','16','18','20'].map(n=>`<span>${n}</span>`).join('')}</div></div>${[0,1,2].map(track => `<div class="timeline-track"><span class="track-name">${['主花组','辅花组','收尾组'][track]}</span><div class="clip-lane">${clips.filter(c=>c.track===track).map(c=>`<button type="button" class="timeline-clip" data-clip="${c.id}" data-full="${c.name}" data-short="${c.short}" aria-label="${c.name}（时间布局样例）" aria-pressed="${state.selectedClip === c.id}" style="--draft-left:${c.left}%;--draft-width:${c.width}%"><span></span></button>`).join('')}</div></div>`).join('')}</div></section>`;
  }
  function renderWorkbench() {
    const clip = clips.find(c=>c.id===state.selectedClip);
    return `<div class="app">${appbar('烟花编排工作台')}${paneSwitcher('workbench')}<main class="workbench" data-active-pane="${state.workbenchPane}">${library(true)}<section class="stage-and-timeline"><div class="center-toolbar"><strong>编排主台</strong><span class="helper">未连接项目</span><div class="center-actions">${inert(icon('undo'),'icon-button')}${inert('保存')}${inert('导出编排','btn-primary')}</div></div>${stage()}${timeline()}</section><aside id="draft-inspector" class="workbench-inspector"><div class="param-context"><div class="path">样例编排 / ${clip.name}</div><h2>${clip.name}</h2><span class="badge">未接资产</span></div><div class="param-modules">${module('片段','时间布局样例',field('轨道',['主花组','辅花组','收尾组'][clip.track]) + field('开始时间','4.0','s') + field('持续时间','4.8','s') + '<p class="field-help">选择只切换审阅上下文；数值不驱动舞台或轨道。</p>')}${module('发射点','样例',field('发射位置','03') + field('朝向','90','°'))}${module('资产绑定','尚未检查',status('交付资源：未绑定') + status('参数版本：未知') + status('资源可用性：未检查') + '<p class="field-help">基础模板库与烘焙器交付资源分开命名；不把模板当作产物。</p>')}${module('显示与预览','语义分开','<label class="checkbox-row"><input type="checkbox" checked data-demo-check><span>显示此片段（设计示意）</span></label><label class="checkbox-row"><input type="checkbox" data-demo-check><span>只看此片段（仅预览）</span></label>',false)}</div></aside></main></div>`;
  }
  function renderImporter() {
    return `<div class="app importer-app">${appbar('资源导入器')}<main class="importer-main"><header class="import-context"><h1>导入前核对</h1><span class="badge badge-demo">设计示意 · 不可执行</span><span class="step-summary">选目录 → 检查 → 核对 → 确认前停止</span><span class="helper">示例目录与目标均未连接，以下不是实际检查结果。</span></header><div class="segmented import-pane-tabs" role="tablist" aria-label="导入步骤面板">${[['queue','队列'],['settings','设置'],['review','核对']].map(([id,label])=>`<button type="button" role="tab" id="tab-${id}" aria-controls="pane-${id}" aria-selected="${state.importPane===id}" tabindex="${state.importPane===id?0:-1}" data-import-pane="${id}">${label}</button>`).join('')}</div><div class="import-columns"><section id="pane-queue" class="import-pane${state.importPane==='queue'?' is-active':''}" role="tabpanel" aria-labelledby="tab-queue" tabindex="0"><h2 id="queue-heading">资源队列 <span class="helper">2 个样例</span></h2>${inert('选择目录','btn-ghost','设计稿不打开文件或目录选择器')}<p class="helper">尚未读取实际目录</p>${[['demo-gold','金蕊凝 · PC','示例包 / 未检查'],['demo-tail','升空尾焰 · PC','示例包 / 未检查']].map(([id,label,meta])=>`<label class="import-file"><input type="checkbox" data-import-file="${id}"${state.importFiles.has(id)?' checked':''}><span><strong>${label}</strong><span class="helper">${meta}</span></span></label>`).join('')}<p class="helper">勾选仅演示队列选择，不是检查通过。</p></section><section id="pane-settings" class="import-pane${state.importPane==='settings'?' is-active':''}" role="tabpanel" aria-labelledby="tab-settings" tabindex="0"><h2 id="settings-heading">目标与规则</h2>${field('目标项目','未连接')}${field('目标目录','示例目标 / 未连接')}${field('同名处理','询问后处理','',['询问后处理','跳过同名'])}<p class="field-help">此处无真实路径、资产名或写入目标。</p>${module('导入选项','样例', '<label class="checkbox-row"><input type="checkbox" checked data-demo-check><span>包含纹理布局</span></label><label class="checkbox-row"><input type="checkbox" checked data-demo-check><span>包含参数描述</span></label><p class="helper">只演示选项排版；无文件操作。</p>')}${inert('检查目录与目标','btn-ghost','设计稿不请求检查接口')}</section><section id="pane-review" class="import-pane import-review${state.importPane==='review'?' is-active':''}" role="tabpanel" aria-labelledby="tab-review" tabindex="0"><h2 id="review-heading">核对</h2><div class="import-review-summary">${pair('选中资源','<span data-import-count>2</span> 项样例')}${pair('检查状态','<span class="status-warning">尚未实际检查</span>')}${pair('目标','未连接 · 无写入权限请求')}</div><table class="review-table"><thead><tr><th scope="col">核对项</th><th scope="col">设计示意状态</th></tr></thead><tbody><tr><th scope="row">资源清单</th><td>2 项样例，真实性未知</td></tr><tr><th scope="row">命名与同名冲突</th><td class="status-pending">待检查</td></tr><tr><th scope="row">参数与布局匹配</th><td class="status-pending">待检查</td></tr><tr><th scope="row">纹理 / 交付资源</th><td class="status-pending">未验证</td></tr><tr><th scope="row">UE 目标</th><td class="status-pending">未连接</td></tr></tbody></table><div class="confirm-checks"><label class="checkbox-row"><input type="checkbox" data-demo-check><span>已核对资源与目标（仅交互示意）</span></label><label class="checkbox-row"><input type="checkbox" data-demo-check><span>了解同名处理规则（仅交互示意）</span></label><p class="helper">示意勾选不会使导入按钮可用。</p></div></section></div><div class="import-actions"><span class="helper">设计稿不发送请求；真实检查、确认与执行均未发生。</span><div class="action-end"><button type="button" data-import-pane="settings" class="btn-ghost">返回设置</button><button type="button" class="btn-primary" data-role="import-execute" disabled title="设计稿未接业务，不能执行导入">执行导入 · 未接业务</button></div></div><div><details class="import-log"><summary>检查记录 · 尚无真实记录</summary><p>此处仅展示可折叠记录区。核对区最少保留 176 CSS px；高度不足时整页滚动，操作栏不固定遮挡内容。</p></details><div class="import-status">设计示意 / 执行 0 / UE 调用 0 / 未验证任何参数与资产</div></div></main></div>`;
  }
  // 与既有规格 C01-C29 保持编号一致，状态矩阵只作设计说明。
  // 与既有规格 C01-C29 保持编号一致，状态矩阵只作设计说明。
  const componentRows = [
  [
    "C01",
    "按钮/图标按钮",
    "40 / 32",
    "可选图标；完整动作名；可选作用范围/忙状态<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：Tab进入；Enter/Space只触发当前聚焦按钮；不增加全局快捷键；执行按钮不绑定全局Enter；禁用不执行，原因在邻近文本可读</p><p>文案：动词+对象，例：重新检查、确认手机包、导入已确认的2包；只用图标时提供中文aria-label与同义提示；导出主入口仍只有V5中栏顶行一个</p><p>适用：瞬时动作、菜单触发、已有主要/次要/危险/图标变体。</p><p>不适用：不拿按钮模拟独立布尔参数；不凭点击就写成功状态。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：不适用；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：不适用；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R01 / R07 / R08 / R11</p></details>"
  ],
  [
    "C02",
    "文本/数值/搜索/多行字段",
    "40 / 32",
    "关联标签；输入值；单位或搜索/清除附属按钮；就地帮助与错误<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：Tab进出；编辑键保留系统行为；Enter按现有提交事务确认，Esc按既有规则取消当前编辑；数值方向键只在字段获得焦点时按已有step工作</p><p>文案：标签不重复单位；实际值不能只省略；路径长值可横向滚动/复制，完整内容可达；非法值保留输入并说明范围，不静默钳制或写回默认</p><p>适用：自由输入、精确数值、搜索与原有多行批量路径输入。</p><p>不适用：不用字段承载不可编辑状态；只读值用同组件只读变体但保留可读对比度。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R03 / R09 / R11 / R12</p></details>"
  ],
  [
    "C03",
    "滑杆+数值",
    "40 / 32",
    "同一个值模型；滑杆；精确数值字段；独立单位；条件/来源摘要<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：Tab分别访问滑杆与数值；方向键遵循既有step；Home/End仅按滑杆原范围，不新加参数范围；拖动过程立即预览，释放后合并为一次既有撤销事务</p><p>文案：精度与单位来自参数schema；派生/跟随值明确来源；不能把联动值当手填值；不生效时保留值、变灰并写原因</p><p>适用：连续数值且有实际预览/计算作用。</p><p>不适用：不为枚举、无意义参数或不可变结果造滑杆；不改物理上下限。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：不适用；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R03 / R09 / R12</p></details>"
  ],
  [
    "C04",
    "下拉选择",
    "40 / 32",
    "标签；当前完整值；展开标记；选项/选项说明<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：保留原生Select的方向键、首字定位、Enter/Space和Esc；展开与关闭恢复焦点；禁用项原因可读</p><p>文案：2–3个短互斥值优先分段；二值参数优先方形开关；长选项可换行或有完整提示，不缩字藏义；不支持选项写原因，不静默删值</p><p>适用：较多、较长或需逐项说明的离散选项。</p><p>不适用：不把多选当单选Select；不在选择视图时隐式授权导入。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R01 / R07 / R11 / R12</p></details>"
  ],
  [
    "C05",
    "勾选项",
    "按内容 / 角色 / 按内容 / 角色",
    "勾选图形；可点击标签；可选短状态/原因<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：原生Checkbox语义；Tab定位，Space切换；不拦截方向键或新增Shift范围选择</p><p>文案：标签写被选择的对象/动作；只读/禁用原因在同一行下方；不要求悬停才可知；mixed仅表示真实混选，不等于未知</p><p>适用：独立选项、资源选择与关联目标。</p><p>不适用：不将长期启用状态、页面切换、导入确认混作通用勾选。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R02 / R07 / R11</p></details>"
  ],
  [
    "C06",
    "单选组",
    "按内容 / 角色 / 按内容 / 角色",
    "组标签；同一命名组的选项；选项说明/禁用原因<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：Tab进入组；方向键切选，Space确认当前项；保留原生radio行为；组内只有一个实际值，焦点与选择分开测试</p><p>文案：选项名称保持同词性；无值写未选择，不编默认选项</p><p>适用：需要同时比较的少量互斥方案。</p><p>不适用：不替代二值开关或两个不同动作。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R01 / R07 / R11</p></details>"
  ],
  [
    "C07",
    "方形开关",
    "按内容 / 角色 / 按内容 / 角色",
    "明确参数名；开/关图形；可读状态/禁用原因<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：Tab定位；Space切换；aria-checked跟实际值；不从只看状态推断显示/导出开关</p><p>文案：说明开启后影响什么；显示这层、只看、是否导出各有原业务语义，不重命名混用</p><p>适用：两个值、即时生效的现有布尔参数。</p><p>不适用：不新增参数；不在参数区重复树上显示这层；不可用于最终执行确认。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R01 / R04 / R08</p></details>"
  ],
  [
    "C08",
    "分段选择",
    "40 / 32",
    "可访问组名；2–3个短互斥选项；单一选中标记<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：按实际语义用radio-group或tablist；radio方向键切值；tab按约定方向键移动焦点/Enter选页；不把导航与改参数混进同组</p><p>文案：短名完整；放不下时整组改Select，不让单项文字竖排；选中状态只取真实当前值</p><p>适用：少量短枚举、现有PC/手机或模式切换。</p><p>不适用：不放四五个长选项；不自动改平台产物或启动导入。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R01 / R07 / R11</p></details>"
  ],
  [
    "C09",
    "模块折叠/子分组",
    "按内容 / 角色 / 按内容 / 角色",
    "展开箭头；模块名；真实摘要；改动数/复位入口；平面内容区<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：Enter/Space开合；Tab访问复位与参数；开合不修改参数，搜索结束恢复原开合</p><p>文案：默认摘要短而有单位，缺值写未计算；长说明进入按需帮助；不在展开后再套更多/卡片</p><p>适用：参数模块和已存在子组。</p><p>不适用：不把每一参数行包成独立卡片；不以折叠隐藏仍需核对的错误。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：不适用；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R03 / R04 / R09 / R12</p></details>"
  ],
  [
    "C10",
    "页签/窗格导航",
    "40 / 32",
    "有名称的tablist；当前页签；对应tabpanel<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：方向键/Home/End移动本地页签焦点，Enter选中；Tab进入内容；切回恢复该窗格滚动、选择与焦点</p><p>文案：页签表示展示区域，不表示已确认或已导入；窄屏只切呈现窗格，不改资源/平台/草稿</p><p>适用：中栏视图、工作台工作区、窄屏导入队列/设置/核对。</p><p>不适用：V5右栏保持树在上参数在下，不新加发射器页签或第二套版本页。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R04 / R05 / R11</p></details>"
  ],
  [
    "C11",
    "菜单",
    "按内容 / 角色 / 按内容 / 角色",
    "触发按钮；平面选项列表；可选分组分隔；危险项与原因<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：方向键/Home/End；Enter激活；Esc关闭并回触发器；不自造全局快捷键，已有快捷键才显示</p><p>文案：明确对象与动作；库外/危险/不可用项不悄悄消失，按现有权限显示原因</p><p>适用：结构栏⋯、还原/导出等已有附属动作。</p><p>不适用：不用菜单隐藏唯一主动作；不将危险执行藏在普通选择项中自动触发。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：不适用；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R01 / R04 / R11</p></details>"
  ],
  [
    "C12",
    "对话框",
    "按内容 / 角色 / 按内容 / 角色",
    "标题与作用对象；必要正文/表单；主要与取消动作；错误定位<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：焦点进入、Tab局部循环；Esc按原业务取消；关闭恢复触发焦点；不可取消任务须明确原因，不假造取消回滚</p><p>文案：描述真实范围与后果；最终执行不默认勾同意，不用模糊的确定；设计稿无真实执行接口</p><p>适用：既有阻断决策、连接恢复、需集中编辑的任务。</p><p>不适用：不把每次选项修改改成弹窗；不新增未授权确认步骤。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：不适用；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R01 / R08 / R11</p></details>"
  ],
  [
    "C13",
    "悬停提示/F1帮助",
    "按内容 / 角色 / 按内容 / 角色",
    "关联触发器；短提示或按需长帮助；关闭/返回<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：焦点和悬停都能获取同义短提示；F1沿用已登记行为；Esc关闭，保留入口焦点</p><p>文案：禁用原因/错误不能仅存在提示里；不把标签、数值、单位藏进悬停</p><p>适用：术语、完整长名、计算口径与可选说明。</p><p>不适用：不承载必做步骤、确认范围或唯一错误原因。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：不适用；selected：不适用；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：不适用；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R02 / R03 / R09 / R11</p></details>"
  ],
  [
    "C14",
    "提示条/撤销条",
    "40 / 32",
    "状态词/图标；简短结果与范围；可选撤销/重试/关闭<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：可键盘访问动作/关闭；非阻断提示不抢焦点；可撤销消息不自动消失或被后续消息顶掉</p><p>文案：真实成功才写已保存/已导出；撤销写明范围；不能暗示Ctrl+Z能回滚UE写入</p><p>适用：局部反馈、可恢复删除、既有工作流结果。</p><p>不适用：不用短暂toast代替持续错误；不预先显示成功。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：不适用；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R08 / R11</p></details>"
  ],
  [
    "C15",
    "身份/状态标签",
    "24 / 20",
    "明确状态词；可选对象/版本/证据范围；可访问详情<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：纯展示不进Tab；确有详情动作才成为有名称的按钮；不得仅用颜色传达状态</p><p>文案：新建/更新/复用/跳过属于计划，不是成功；已检查、已导出、UE已保存、用户认可严格分开；未知/未验证显示原词，不画成通过</p><p>适用：草稿、资源修订、连接、检查及实际回执身份。</p><p>不适用：不把选中态、可执行、模拟完成当资产导入或用户认可。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：不适用；focus：不适用；pressed：不适用；selected：不适用；disabled：不适用；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：显示真实错误/未知范围与可行下一步，沿用124对应状态外观；不得为纯展示元素设置伪造的输入invalid语义。</p><p>问题根因：R07 / R08</p></details>"
  ],
  [
    "C16",
    "进度/进行中",
    "40 / 32",
    "真实阶段名；计数/已知进度；可用取消/停止动作；保留上次有效结果<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：状态更新不抢焦点；aria-busy/live限必要阶段；停止/取消只调用既有任务边界，不改其语义</p><p>文案：有总量才给比例，没有总量写正在检查/处理中；执行结束、检查通过、用户认可不是同一结果</p><p>适用：烘焙、目录导出、检查、导入等真实长作业。</p><p>不适用：不编时长/百分比；不把停止显示成全部回滚或完成。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：不适用；focus：不适用；pressed：不适用；selected：不适用；disabled：不适用；readonly：不适用；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：显示真实错误/未知范围与可行下一步，沿用124对应状态外观；不得为纯展示元素设置伪造的输入invalid语义。</p><p>问题根因：R08 / R11</p></details>"
  ],
  [
    "C17",
    "滚动区域/滚动条",
    "按内容 / 角色 / 按内容 / 角色",
    "真实内容视口；明确滚动边界；124方头滚动条角色<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：滚动区域可本地聚焦，PageUp/Down/方向键不截获输入编辑；回到区域恢复原位置</p><p>文案：只在溢出时滚动，不造多个空滚动壳；日志选中阅读时暂停自动跟随</p><p>适用：参数区、树、队列、资产表、日志各自职责明确的内容。</p><p>不适用：避免卡片里再套卡片滚动；常驻栏必须占真实空间。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：不适用；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：不适用；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R04 / R05 / R09 / R11</p></details>"
  ],
  [
    "C18",
    "可调分隔条",
    "按内容 / 角色 / 按内容 / 角色",
    "可拖动分隔线；可聚焦命中区域；当前区域比例/折叠状态<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：沿用V5↑↓调高；Enter折为路径/展开；双击同义；可读aria-valuenow/min/max；不改变对象选择</p><p>文案：写明调整树/参数或时间轴高度；高度不够时保证内容而非强制固定栏</p><p>适用：V5树/参数、中间预览/时间轴等已有可调区域。 命中区可扩入无控件留白，但不得覆盖相邻输入；可见线宽/圆角仍来自124冻结角色。</p><p>不适用：不新增装饰性拖拽条；不允许拖到核对/参数完全不可见。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：不适用；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：不适用；loading：不适用；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R04 / R05 / R11</p></details>"
  ],
  [
    "C19",
    "结构树行",
    "按内容 / 角色 / 按内容 / 角色",
    "展开箭头槽；类型/层号；名称；改动/输出摘要；显示这层；只看；⋯<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：V5↑↓/Home/End走行，←→折叠展开；Enter按现有选择语义；行选择与眼睛/只看动作分别可达且不重复触发；树行局部roving tabindex，不增加全局键</p><p>文案：长名允许受控两行，操作列固定；完整名称可达；显示这层影响配方/烘焙/导出，只看只影响画面；不支持开关写原因；不新增被禁业务能力</p><p>适用：层、发射器、粒子层、尾缀输出和既有工作台结构。</p><p>不适用：不用树再造第二套参数/版本导航；不在每行套卡片。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R04 / R07 / R08 / R10 / R11</p></details>"
  ],
  [
    "C20",
    "资源/效果列表行",
    "按内容 / 角色 / 按内容 / 角色",
    "同修订缩略图或有原因占位；名称；来源/版本/平台/规格；实际状态；选择与现有附属动作<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：单击只选择；双击/Enter仅沿现有定位/打开语义；附属动作独立焦点，资源列表不在双击间自动跳动</p><p>文案：长中文名受控多行，不把省略号当完整值；缩略图缺失就写缺失，不能借旧图冒充同版本；素材库与交付资源库按实际职责命名</p><p>适用：烘焙器库、导入队列、交付修订、编排资源列表。</p><p>不适用：不把选择当加入节目/确认导入；不混用框架模板和已绑定资源状态。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R07 / R08 / R09 / R10 / R11</p></details>"
  ],
  [
    "C21",
    "资产/产物表",
    "按内容 / 角色 / 按内容 / 角色",
    "完整列头；按作用范围分组的数据行；PC/手机或类型列；选择/计划/真实结果；展开详情<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：使用表格语义；可交互单元可Tab到达；窄屏优先显示必要列，其余在同一行详情展开；不丢实际资产名</p><p>文案：计划列用新增/更新/复用/跳过，结果列来自回执；不可用项写原因，未知值不补0或成功；行或平台选择变化作废对应旧确认</p><p>适用：每层产物表、导入资产核对、交付引用表。</p><p>不适用：不在单元格内放多层卡片或长文段；不以字段更窄隐藏确认信息。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R03 / R05 / R08 / R09 / R10</p></details>"
  ],
  [
    "C22",
    "版本/修订列表",
    "按内容 / 角色 / 按内容 / 角色",
    "对象/修订标识；来源指纹范围；当前引用/新版本状态；显式打开/应用动作<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：Tab访问打开/应用；选择修订与应用为不同动作；关闭返回原对象及视野</p><p>文案：配方版本、导出修订、UE回执、演出固定引用分开；新修订不静默替换当前节目引用</p><p>适用：版本历史、不可变导出修订、演出引用升级。</p><p>不适用：不创建第二套版本系统；不把当前列表行选中画成已应用/已导入。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R08 / R10 / R11</p></details>"
  ],
  [
    "C23",
    "数值/单位摘要",
    "32 / 24",
    "标签；原子值+单位组；组间语义分隔；来源/新旧状态<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：只读摘要默认不进Tab；确有帮助时单独提供可访问入口；复制文本按完整语义顺序</p><p>文案：75 帧 · 5 张为布局样例，不是实际计算结果；数字与单位不拆行，允许只在组间换行；预计/上次/当前/待计算必须跟实际指纹状态</p><p>适用：帧数/张数、时长、计数、节奏/产物摘要。</p><p>不适用：不从帧数猜张数；不把估算或旧结果标成检查通过。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：不适用；focus：不适用；pressed：不适用；selected：不适用；disabled：不适用；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：显示真实错误/未知范围与可行下一步，沿用124对应状态外观；不得为纯展示元素设置伪造的输入invalid语义。</p><p>问题根因：R03 / R08 / R12</p></details>"
  ],
  [
    "C24",
    "流程步骤/阶段摘要",
    "40 / 32",
    "当前步骤名；当前实际进度；已完成的证据范围；当前可用下一步<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：只显示的步骤不进Tab；可回访步骤才用按钮；回访核对不会自动确认或执行</p><p>文案：目录导出、核对、导入、登记是不同阶段；窄高压成一步/总步数及当前名，不重复画大页头</p><p>适用：目录交付/核对/执行前流程。</p><p>不适用：不以浏览到下一页就勾完成；不让步骤条压没核对内容。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：不适用；focus：不适用；pressed：不适用；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：不适用；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：显示真实错误/未知范围与可行下一步，沿用124对应状态外观；不得为纯展示元素设置伪造的输入invalid语义。</p><p>问题根因：R05 / R08</p></details>"
  ],
  [
    "C25",
    "空/错误/只读信息区",
    "按内容 / 角色 / 按内容 / 角色",
    "明确当前状态；真实原因/范围；可行下一步；可展开详情<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：必要动作可达，阻断错误可定位首个字段；非阻断空状态不抢焦点</p><p>文案：空库、未连接、未检查、失败、只读分别描述；不能用空白或伪造资源遮掩读取失败</p><p>适用：无数据、连接断开、检查错误、只读模板说明。</p><p>不适用：不默认再套一张高亮大卡；不把无数据当正常通过。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：不适用；focus：不适用；pressed：不适用；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：不适用；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：显示真实错误/未知范围与可行下一步，沿用124对应状态外观；不得为纯展示元素设置伪造的输入invalid语义。</p><p>问题根因：R05 / R08 / R09 / R11</p></details>"
  ],
  [
    "C26",
    "颜色段/Ramp领域外框",
    "按内容 / 角色 / 按内容 / 角色",
    "标题/当前层来源→原有色段编辑→真实预览→按需帮助；只统一标题、边界、焦点、选择与错误位置<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：沿用现有领域编辑键盘，不新增全局快捷键；编辑点与视图操作的焦点/撤销范围分别定义并保持现有模型</p><p>文案：名称/单位/当前对象完整可达；预览、计算、UE验证和用户认可分开</p><p>适用：已有领域编辑器与同类任务。</p><p>不适用：不为统一外框重写模拟/曲线插值/粒子模型/时间数据；不套多层卡片。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R07 / R09 / R12</p></details>"
  ],
  [
    "C27",
    "曲线领域外框",
    "按内容 / 角色 / 按内容 / 角色",
    "标题/单位→原有曲线画布→关键点/数值→范围与错误；只统一标题、边界、焦点、选择与错误位置<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：沿用现有领域编辑键盘，不新增全局快捷键；编辑点与视图操作的焦点/撤销范围分别定义并保持现有模型</p><p>文案：名称/单位/当前对象完整可达；预览、计算、UE验证和用户认可分开</p><p>适用：已有领域编辑器与同类任务。</p><p>不适用：不为统一外框重写模拟/曲线插值/粒子模型/时间数据；不套多层卡片。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R07 / R09 / R12</p></details>"
  ],
  [
    "C28",
    "粒子图领域外框",
    "按内容 / 角色 / 按内容 / 角色",
    "当前粒子图身份→原有画布或结构树→选中项参数→原有预览；只统一标题、边界、焦点、选择与错误位置<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：沿用现有领域编辑键盘，不新增全局快捷键；编辑点与视图操作的焦点/撤销范围分别定义并保持现有模型</p><p>文案：名称/单位/当前对象完整可达；预览、计算、UE验证和用户认可分开</p><p>适用：已有领域编辑器与同类任务。</p><p>不适用：不为统一外框重写模拟/曲线插值/粒子模型/时间数据；不套多层卡片。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R04 / R07 / R10 / R12</p></details>"
  ],
  [
    "C29",
    "Timeline领域外框",
    "按内容 / 角色 / 按内容 / 角色",
    "工具/范围→时间尺→原有轨道与片段→选中项详情→缩放与状态；只统一标题、边界、焦点、选择与错误位置<details class=\"help-disclosure\"><summary>状态、键盘、文案与边界</summary><p>键盘：沿用现有领域编辑键盘，不新增全局快捷键；编辑点与视图操作的焦点/撤销范围分别定义并保持现有模型</p><p>文案：名称/单位/当前对象完整可达；预览、计算、UE验证和用户认可分开</p><p>适用：已有领域编辑器与同类任务。</p><p>不适用：不为统一外框重写模拟/曲线插值/粒子模型/时间数据；不套多层卡片。</p><p>边界：只提出结构与规格；业务值、撤销、保存、导出、确认指纹及执行接口仍由现有控制器负责。</p><p>状态矩阵：default：显示真实当前值、对象与作用范围。；hover：沿用124文字/边框变化，不增光环、阴影或缩放。；focus：键盘焦点可见且不被相邻裁剪容器截去。；pressed：按下状态与业务完成分开；不靠按下就改变完成标签。；selected：由真实选中/布尔值驱动，并提供对应aria状态。；disabled：保留当前值与就地原因；不能只靠悬停解释，也不能把未知状态当false。；readonly：完整显示可复制值及来源，避免伪装为低对比度禁用输入。；loading：保留已有值，标真实进行中与作用范围，阻止重复提交；未有进度时不编百分比。；error：原因、影响范围与可执行下一步就地显示；值不丢失，关联aria-describedby/invalid。</p><p>问题根因：R06 / R07 / R10 / R11</p></details>"
  ]
];
  function renderComponents() {
    return `<div class="app spec-app">${appbar('组件规格 / 设计提案')}<main class="spec-main"><header class="spec-lead"><h1>同一套 124 画风，完整覆盖三工具</h1><p>保持 124 实际颜色、边框、角色圆角与高亮；沿用 125 左库、中预览、右上结构 / 右下参数布局。通过字阶、留白、信息顺序和内容高度解决拥挤，不另探索品牌。</p><span class="badge badge-demo">候选规格 · 待用户审阅 · 非正式组件库</span></header><section class="spec-section"><h2>四层组织</h2><div class="layer-grid"><div><h3>01 基础</h3><p>冻结角色颜色、1px边框、角色圆角、字阶、间距、焦点与减弱动效。</p></div><div><h3>02 组件</h3><p>按钮、字段、选择器、复选行、结构树、摘要、状态、库条目和核对表。</p></div><div><h3>03 模式</h3><p>固定参数路径、同级模块、联动清单、原子摘要、交付预览、Timeline标签与安全核对。</p></div><div><h3>04 页面模板</h3><p>编辑、交付、RT6、粒子图、编排、导入；共享结构，业务语义各自保留。</p></div></div></section><section class="spec-section"><h2>整页密度对比</h2><div class="density-comparison"><div><h3>常规 · 推荐默认</h3><p>正文14/22，字段13/20，标题18/26，控件40，树行32，模块间距24。更利于持续阅读与核对。</p></div><div><h3>紧凑 · 对比稿</h3><p>正文13/20，字段12/18，标题16/24，控件32，树行28，模块间距16。结构与状态保持一致。</p></div></div><p class="helper">密度只在外层审阅工具栏切换。两档均覆盖整页；窄档与200%不偷偷把常规字号降成紧凑。</p></section><section class="spec-section"><h2>冻结角色与真实圆角</h2><div class="swatches">${[['背景','var(--draft-bg)'],['低层','var(--draft-low)'],['控件','var(--draft-panel)'],['高层','var(--draft-high)'],['主色','var(--draft-primary)'],['选中','var(--draft-primary-bg)'],['边框','var(--draft-border)'],['警告','var(--draft-warn)']].map(([label,color])=>`<span class="swatch"><i style="--draft-swatch:${color}"></i>${label}</span>`).join('')}</div><p class="helper">采样基线 975ee142：操作按钮 / 输入4px、来源选择器5px、参数选择器0px、幽灵 / 播放6px、分段0px、开关2px、菜单7px、菜单项5px。外层工作区以分隔线建立层级。</p></section><section class="spec-section"><h2>状态矩阵 · 控件样板</h2><div class="state-samples"><button type="button" data-sample-button>默认</button><button type="button" class="btn-primary" data-sample-button>主要操作样板</button><button type="button" class="sample-focus" data-sample-button>焦点外观样板</button><button type="button" disabled>禁用 · 未连接</button><input aria-label="只读样板" value="只读值" readonly><input class="sample-error" aria-label="错误外观样板，非实际结果" aria-invalid="true" value="错误文案样板" readonly><span class="status-warning">待检查</span><span class="status-pending">未知</span><label class="checkbox-row"><button type="button" class="draft-switch" role="switch" aria-label="开关状态样板" aria-checked="false" data-sample-switch></button><span>开关状态样板</span></label></div><p class="helper">适用状态：默认、悬停、焦点、按下、选中、禁用、只读、错误、未知/待处理。此处展示外观与语义；不代表运行时矩阵已经通过。</p></section><section class="spec-section"><h2>组件边界与密度</h2><table class="spec-table"><thead><tr><th scope="col">编号 / 组件</th><th scope="col">常规 / 紧凑</th><th scope="col">结构与边界</th></tr></thead><tbody>${componentRows.map(([id,name,size,boundary])=>`<tr><td><span class="helper">${id}</span> ${name}</td><td>${size}</td><td>${boundary}</td></tr>`).join('')}</tbody></table></section><section class="spec-section"><h2>键盘与安全边界</h2><p>原生按钮用 Enter / Space，复选用 Space；结构选择用上下、Home / End，左右展开收起。按钮与模块标题保留各自2px主色轮廓，结构动作/分段/模块标题使用旧角色内偏移；数值框和参数搜索只变主色边框、outline:none。参数搜索和库搜索仅过滤当前示意内容；页面无保存、文件、导出、导入、UE或网络请求逻辑。</p><p>1366交付模式临时收起编辑右栏，回编辑恢复节点与滚动上下文；交付预览约占中央工作区2/3。核对区至少176 CSS px，不够时整页滚动。Timeline根据片段可用宽度显示完整名、短名、编号或标记，总览优先选中项。</p><p class="helper">本稿已在真实HTTP完成Chrome/Edge三档、200%等效视口与代表键盘检查；详细边界见设计说明；旧图与设计样板不作通过证据。</p></section></main></div>`;
  }

  function saveScroll() {
    const positions = {};
    ['.library','.tree-pane','.param-modules','.parameters','.delivery-checklist','.workbench-inspector','.timeline-scroll'].forEach(selector => { const el=app.querySelector(selector); if(el) positions[selector]=el.scrollTop; });
    state.scrollByPage.set(state.page,positions);
  }
  function parameterContext() { return `${state.page==='delivery'?state.editorReturn:state.page}:${state.selected}`; }
  function restoreDetailsAndSearch() {
    app.querySelectorAll('details.param-module').forEach(details=>{
      const key=`${parameterContext()}:${details.querySelector('summary span')?.textContent}`;
      if(state.disclosures.has(key)) details.open=state.disclosures.get(key);
    });
    const parameterSearch=app.querySelector('#parameter-search');
    if(parameterSearch) { const keyword=state.parameterSearch.get(parameterContext())||''; parameterSearch.value=keyword; filterParameters(keyword); }
    const librarySearch=app.querySelector('#library-search');
    if(librarySearch) { librarySearch.value=state.librarySearch; app.querySelectorAll('[data-search]').forEach(el=>el.hidden=!el.dataset.search.toLowerCase().includes(state.librarySearch.toLowerCase())); }
  }
  function filterParameters(keyword) {
    const host=app.querySelector('.parameters');if(!host)return;const area=host.querySelector('.param-modules'),key=parameterContext(),active=!!keyword||state.onlyModified;
    if(active&&!state.searchRestore.has(key)) state.searchRestore.set(key,{top:area.scrollTop,open:[...area.querySelectorAll('.param-module')].map(d=>d.open)});
    let count=0;area.querySelectorAll('.param-module').forEach(section=>{
      let matches=0;section.querySelectorAll('[data-param-row],.field-row,.checkbox-row').forEach(row=>{const text=row.dataset.paramLabel||row.textContent;const match=(!keyword||text.toLowerCase().includes(keyword.toLowerCase()))&&(!state.onlyModified||row.dataset.modified==='true');row.hidden=active&&!match;if(match)matches++;});
      section.hidden=active&&!matches;if(active&&matches)section.open=true;count+=matches;
      section.querySelectorAll('.field-help,.help-disclosure,.metric-line,.preset-row,.check-list-head,.status-line').forEach(el=>el.hidden=active);
    });
    const feedback=host.querySelector('.search-feedback');feedback.hidden=!active;feedback.textContent=`范围：当前节点 · ${count} 项匹配${state.onlyModified?' · 仅改动':''}`;host.querySelector('.no-search-results').hidden=!active||count>0;
    if(!active&&state.searchRestore.has(key)){const saved=state.searchRestore.get(key);[...area.querySelectorAll('.param-module')].forEach((d,i)=>d.open=saved.open[i]);area.scrollTop=saved.top;state.searchRestore.delete(key);}
  }
  function restoreScroll() { const positions=state.scrollByPage.get(state.page)||{}; Object.entries(positions).forEach(([selector,top])=>{ const el=app.querySelector(selector); if(el) el.scrollTop=top; }); }
  function announce(text) { document.querySelector('#draft-announcement').textContent=text; }
  function render() {
    if(['editor','rt6','particle','delivery'].includes(state.page)){const page=state.page==='delivery'?state.editorReturn:state.page;if(!nodesFor(page).some(n=>n.id===state.selected))state.selected='core';}
    app.innerHTML = state.page==='workbench' ? renderWorkbench() : state.page==='importer' ? renderImporter() : state.page==='components' ? renderComponents() : renderBaker();
    restoreDetailsAndSearch();
    document.title=`FireWorksLab · ${names[state.page]} · 设计示意`;
    if(window.FWIcons) window.FWIcons.apply(app);
    restoreScroll();
    requestAnimationFrame(updateTimelineLabels);
  }
  function route(page) {
    saveScroll();
    const next=cleanPage(page);
    if (['editor','rt6','particle'].includes(state.page)) state.editorReturn=state.page;
    if(state.page!=='delivery') state.selectionByPage.set(state.page,state.selected);
    if(next!=='delivery' && state.selectionByPage.has(next)) state.selected=state.selectionByPage.get(next);
    if(next==='delivery') state.deliveryInspector=false;
    if(['editor','rt6','particle'].includes(next))state.selectedAsset=next==='editor'?'gold':next;
    state.page=next;
    history.replaceState(null,'',`?page=${next}&density=${state.density}`);
    if(parent!==window) parent.postMessage({type:'draft-page',page:next},'*');
    render();
    announce(`已切换至${names[next]}，设计示意`);
  }
  function rerenderWithFocus(selector) { saveScroll(); render(); if(selector) app.querySelector(selector)?.focus(); }
  function updateTimelineLabels() {
    app.querySelectorAll('.timeline-clip').forEach(button=>{
      const width=button.clientWidth-12;
      const selected=button.getAttribute('aria-pressed')==='true';
      const full=button.dataset.full, short=button.dataset.short;
      // 只改标签，不改片段时间、位置、宽度；缩放示意使用同一套几何。
      let label='';
      const measure=document.createElement('canvas').getContext('2d');
      measure.font='12px "Microsoft YaHei", sans-serif';
      if(state.timelineZoom==='overview'&&!selected) label='';
      else if(measure.measureText(full).width<=width) label=full;
      else if(width>=72&&measure.measureText(short).width<=width) label=short;
      else if(width>=24&&measure.measureText(button.dataset.clip.toUpperCase()).width<=width) label=button.dataset.clip.toUpperCase();
      button.querySelector('span').textContent=label;
      button.title=`${full} · 设计示意${!label?' · 当前宽度仅显示标记':''}`;
      button.dataset.labelLevel=label===full?'full':label===short?'short':label?'id':'marker';
    });
  }
  app.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button||button.disabled) return;
    if(button.dataset.route) return route(button.dataset.route);
    if(button.dataset.bakerPane) {state.bakerPane=button.dataset.bakerPane;return rerenderWithFocus(`[data-baker-pane="${state.bakerPane}"]`);}
    if(button.dataset.workbenchPane) {state.workbenchPane=button.dataset.workbenchPane;return rerenderWithFocus(`[data-workbench-pane="${state.workbenchPane}"]`);}
    if(button.dataset.deliveryPane) {state.deliveryPane=button.dataset.deliveryPane;return rerenderWithFocus(`[data-delivery-pane="${state.deliveryPane}"]`);}
    if(button.hasAttribute('data-toggle-inspector')) {state.deliveryInspector=!state.deliveryInspector;if(innerWidth<900)state.bakerPane=state.deliveryInspector?'inspector':'preview';return rerenderWithFocus('[data-toggle-inspector]');}
    if(button.hasAttribute('data-clear-solo')) {state.solo=null;return rerenderWithFocus('.observation-menu summary');}
    if(button.hasAttribute('data-clear-search')) {const input=app.querySelector('#parameter-search');input.value='';state.parameterSearch.set(parameterContext(),'');filterParameters('');return input.focus();}
    if(button.dataset.resetParam) {state.demoValues.delete(parameterContext()+':'+button.dataset.resetParam);return rerenderWithFocus(`[data-reset-param="${button.dataset.resetParam}"]`);}
    if(button.dataset.lockParam) {const key=parameterContext()+':'+button.dataset.lockParam;state.locked.has(key)?state.locked.delete(key):state.locked.add(key);return rerenderWithFocus(`[data-lock-param="${button.dataset.lockParam}"]`);}
    if(button.dataset.helpParam) {const help=app.querySelector(`[data-help-for="${button.dataset.helpParam}"]`);help.hidden=!help.hidden;return;}
    if(button.dataset.tempoPreset) {state.demoValues.set(parameterContext()+':tempo',Number(button.dataset.tempoPreset));return rerenderWithFocus(`[data-tempo-preset="${button.dataset.tempoPreset}"]`);}

    if(button.dataset.selectNode) { state.selected=button.dataset.selectNode; return rerenderWithFocus(`[data-select-node="${state.selected}"]`); }
    if(button.dataset.collapse) { const id=button.dataset.collapse; state.collapsed.has(id)?state.collapsed.delete(id):state.collapsed.add(id); const page=state.page==='delivery'?state.editorReturn:state.page; if(!visibleNodes(page).some(n=>n.id===state.selected)) state.selected=id; return rerenderWithFocus(`[data-select-node="${state.selected}"]`); }
    if(button.dataset.eye) { const id=button.dataset.eye; state.hidden.has(id)?state.hidden.delete(id):state.hidden.add(id); rerenderWithFocus(`[data-eye="${id}"]`); return announce('仅示意显隐状态，未修改配方或输出'); }
    if(button.dataset.solo) { const id=button.dataset.solo; state.solo=state.solo===id?null:id; rerenderWithFocus(button.classList.contains('tree-action')?`.tree-action[data-solo="${id}"]`:'.observation-menu summary'); return announce('仅示意只看状态，未修改预览或输出'); }
    if(button.dataset.treeView) { state.treeView=button.dataset.treeView; return rerenderWithFocus('[data-tree-view]'); }
    if(button.dataset.unreadyAsset) { state.unreadyNotice=true; rerenderWithFocus('[data-unready-asset]'); return announce('状态样板：缺可用配方，未切换，保留当前编辑上下文'); }
    if(button.dataset.asset) { const id=button.dataset.asset;if(['editor','delivery','rt6','particle'].includes(state.page)){if(['gold','rt6','particle'].includes(id))return route(id==='gold'?'editor':id);return announce('此条目仅供库行排版审阅；本稿未展开它的参数，当前编辑对象保持不变');}state.selectedAsset=id;app.querySelectorAll('[data-asset]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));return announce('已选择模板样例，尚未加入编排'); }
    if(button.dataset.libraryTab) { app.querySelectorAll('[data-library-tab]').forEach(el=>el.setAttribute('aria-pressed',String(el===button))); return announce('库范围样板已切换，当前均为静态样例'); }
    if(button.dataset.importPane) { state.importPane=button.dataset.importPane; return rerenderWithFocus(`[role="tab"][data-import-pane="${state.importPane}"]`); }
    if(button.dataset.timelineZoom) { state.timelineZoom=button.dataset.timelineZoom; app.querySelectorAll('[data-timeline-zoom]').forEach(el=>el.setAttribute('aria-pressed',String(el===button))); updateTimelineLabels(); return; }
    if(button.dataset.clip) { state.selectedClip=button.dataset.clip; return rerenderWithFocus(`[data-clip="${state.selectedClip}"]`); }
    if(button.hasAttribute('data-sample-switch')) { button.setAttribute('aria-checked',String(button.getAttribute('aria-checked')!=='true')); return announce('开关仅切换状态样板，未修改产品设置'); }
    if(button.hasAttribute('data-sample-button')) announce('控件外观样板，无业务动作');
  });
  app.addEventListener('change',event=>{
    const input=event.target;
    if(input.hasAttribute('data-only-modified')) {state.onlyModified=input.checked;filterParameters(app.querySelector('#parameter-search').value);return;}
    if(input.hasAttribute('data-english')) {state.english=input.checked;return rerenderWithFocus('[data-english]');}
    if(input.dataset.linked) { input.checked?state.linked.add(input.dataset.linked):state.linked.delete(input.dataset.linked); app.querySelector('[data-linked-count]').textContent=`已选 ${state.linked.size} / 3 · 样例`; announce('已更新示意选择，未修改配方'); }
    if(input.dataset.importFile) { input.checked?state.importFiles.add(input.dataset.importFile):state.importFiles.delete(input.dataset.importFile); app.querySelector('[data-import-count]').textContent=state.importFiles.size; announce('已更新示意队列，未读取或检查资源'); }
  });
  app.addEventListener('input',event=>{
    const id=event.target.dataset.range||event.target.dataset.number;
    if(id) {const key=parameterContext()+':'+id;state.demoValues.set(key,event.target.value);const row=event.target.closest('[data-param-row]');row.querySelectorAll('input').forEach(el=>{if(el!==event.target)el.value=event.target.value;});const original=sampleParams.find(p=>p[0]===id)[3];const modified=Number(event.target.value)!==original;row.dataset.modified=String(modified);row.classList.toggle('is-modified',modified);row.querySelector('.modification-dot').textContent=modified?'●':'';return;}

    if(event.target.id==='library-search') { const keyword=event.target.value.trim().toLowerCase(); state.librarySearch=event.target.value; app.querySelectorAll('[data-search]').forEach(el=>el.hidden=!el.dataset.search.toLowerCase().includes(keyword)); }
    if(event.target.id==='parameter-search') { const keyword=event.target.value.trim(); state.parameterSearch.set(parameterContext(),keyword); filterParameters(keyword); }
  });
  app.addEventListener('toggle',event=>{
    const details=event.target;
    if(details.matches('.observation-menu')&&details.open){const menu=details.querySelector('.menu-commands');menu.style.maxHeight=Math.max(80,innerHeight-details.getBoundingClientRect().bottom-12)+'px';}
    if(details.matches('details.param-module')) state.disclosures.set(`${parameterContext()}:${details.querySelector('summary span')?.textContent}`,details.open);
  },true);
  app.addEventListener('keydown',event=>{
    if(event.key==='Escape'){const menu=app.querySelector('.observation-menu[open]');if(menu){event.preventDefault();menu.open=false;menu.querySelector('summary').focus();return;}}
    if(event.target.matches('.tree-name')) {
      const buttons=[...app.querySelectorAll('.tree-name')];
      const index=buttons.indexOf(event.target); let target;
      if(event.key==='ArrowDown') target=buttons[Math.min(index+1,buttons.length-1)];
      if(event.key==='ArrowUp') target=buttons[Math.max(0,index-1)];
      if(event.key==='Home') target=buttons[0]; if(event.key==='End') target=buttons.at(-1);
      if(target) { event.preventDefault(); state.selected=target.dataset.selectNode; return rerenderWithFocus(`[data-select-node="${state.selected}"]`); }
      if(['ArrowLeft','ArrowRight'].includes(event.key)) {
        const node=nodesFor(state.page==='delivery'?state.editorReturn:state.page).find(n=>n.id===event.target.dataset.selectNode);
        if(event.key==='ArrowLeft'&&!node?.branch){const nodes=nodesFor(state.page==='delivery'?state.editorReturn:state.page),at=nodes.findIndex(n=>n.id===node?.id);const parent=nodes.slice(0,at).reverse().find(n=>n.level<node.level);if(parent){event.preventDefault();state.selected=parent.id;return rerenderWithFocus(`[data-select-node="${parent.id}"]`);}}
        if(node?.branch) { event.preventDefault(); event.key==='ArrowLeft'?state.collapsed.add(node.id):state.collapsed.delete(node.id); rerenderWithFocus(`[data-select-node="${node.id}"]`); }
      }
    }
    if(event.target.matches('[role="tab"][data-import-pane]')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault(); const ids=['queue','settings','review']; const at=ids.indexOf(state.importPane); state.importPane=event.key==='Home'?ids[0]:event.key==='End'?ids[2]:ids[(at+(event.key==='ArrowRight'?1:2))%3]; rerenderWithFocus(`[role="tab"][data-import-pane="${state.importPane}"]`);
    }
  });
  app.addEventListener('pointerdown',event=>{
    const separator=event.target.closest('.splitter');if(!separator)return;event.preventDefault();separator.setPointerCapture(event.pointerId);const start=event.clientY,original=state.treeHeight;
    const move=e=>{state.treeHeight=Math.max(128,Math.min(420,original+e.clientY-start));separator.closest('.inspector').style.setProperty('--draft-tree-height',state.treeHeight+'px');separator.setAttribute('aria-valuenow',state.treeHeight);};
    const stop=()=>{separator.removeEventListener('pointermove',move);separator.removeEventListener('pointerup',stop);};separator.addEventListener('pointermove',move);separator.addEventListener('pointerup',stop);
  });
  app.addEventListener('keydown',event=>{if(event.target.matches('.splitter')&&['ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();state.treeHeight=event.key==='Home'?128:event.key==='End'?420:Math.max(128,Math.min(420,state.treeHeight+(event.key==='ArrowDown'?16:-16)));event.target.closest('.inspector').style.setProperty('--draft-tree-height',state.treeHeight+'px');event.target.setAttribute('aria-valuenow',state.treeHeight);}});
  window.addEventListener('resize',updateTimelineLabels);
  render();
})();
