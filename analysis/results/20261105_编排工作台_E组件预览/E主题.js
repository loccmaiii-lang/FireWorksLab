/* 编排工作台 · E 样板 v3.6 组件预览：不改布局的小脚本（对话框9，2026-11-05）
   1. 图标：把工作台的 Phosphor / Material 填充图标换成 E 图标表的线框图标（16 px 画布、12 px 可画区、1.5 线宽、方头尖角）。
      不删 React 画的 <path>（只隐藏），在同一个 <svg> 里追加 <g class="e-ico">，React 以后增删自己的节点不受影响；
      图标换了（播放 → 暂停）时按新的 path 重新换。
   2. 滚动条只在滚动时出现：滚动中的元素加 data-e-scrolling，停 800 ms 后去掉（E 的 .sb-auto 做法；用属性不用类，React 改 className 时不会冲掉）。
   3. 滑杆已填部分：把比例写进 --e-v（E主题.css 用它画薄荷 2 px 填充）。 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  /* E 图标表（analysis/results/20261104_E样板/src/body_main.html 的 <symbol>，原样抄） */
  var E = {
    search: '<circle cx="6.75" cy="6.75" r="4"/><path d="m9.9 9.9 3 3"/>',
    x: '<path d="m4.3 4.3 7.4 7.4m0-7.4-7.4 7.4"/>',
    plus: '<path d="M8 2.75v10.5M2.75 8h10.5"/>',
    cd: '<path d="M3.1 5.55 8 10.45l4.9-4.9"/>',
    cr: '<path d="M5.55 3.1 10.45 8l-4.9 4.9"/>',
    back: '<path d="M7.85 3.25 3.1 8l4.75 4.75"/><path d="M3.6 8h9.65"/>',
    settings: '<path d="M2.75 4.5h2.5m3.5 0h4.5M2.75 11.5h6m3.5 0h1"/><path d="M5.25 2.75h3.5v3.5h-3.5zm3.5 7h3.5v3.5h-3.5z"/>',
    check: '<path d="M3.06 7.7 6.56 11.2l6.38-6.38"/>',
    info: '<circle cx="8" cy="8" r="5.25"/><path d="M8 7.25V11M8 4.75v.5"/>',
    file: '<path d="M3.75 2.75h5.5l3 3v7.5h-8.5z"/><path d="M9.25 2.75v3h3"/>',
    out: '<path d="M2.75 9.75v3.5h10.5v-3.5"/><path d="M8 3.1v7.4M5.25 5.85 8 3.1l2.75 2.75"/>',
    layer: '<path d="M8 4.1 12.3 6.25 8 8.4 3.7 6.25z"/><path d="M3.7 9.75 8 11.9l4.3-2.15"/>',
    undo: '<path d="M5.8 3.05 3.1 5.75l2.7 2.7"/><path d="M3.6 5.75h5.9a3.75 3.75 0 0 1 0 7.5H5.25"/>',
    redo: '<path d="m10.2 3.05 2.7 2.7-2.7 2.7"/><path d="M12.4 5.75H6.5a3.75 3.75 0 0 0 0 7.5h4.25"/>',
    reset: '<path d="M2.75 8a5.25 5.25 0 1 0 5.25-5.25 5.7 5.7 0 0 0-3.95 1.6L3.3 5.2"/><path d="M2.75 2.75v3h3"/>',
    play: '<path d="M4.25 3.25v9.5L12.05 8z"/>',
    pause: '<path d="M4.25 2.75h1.5v10.5h-1.5zm6 0h1.5v10.5h-1.5z"/>',
    loop: '<path d="M9 5.25h4.25v7.5H2.75v-7.5h4"/><path d="M5.1 3.6l1.65 1.65L5.1 6.9"/>',
    /* E 图标表里没有的，按同一规格新画（对照表里单列，等用户定要不要收进图标表） */
    fwd: '<path d="M8.15 3.25 12.9 8l-4.75 4.75"/><path d="M12.4 8H2.75"/>',
    reload: '<path d="M13.25 8a5.25 5.25 0 1 1-5.25-5.25 5.7 5.7 0 0 1 3.95 1.6l.75.85"/><path d="M13.25 2.75v3h-3"/>',
    copy: '<path d="M5.75 5.75h7.5v7.5h-7.5z"/><path d="M2.75 10.25v-7.5h7.5"/>',
    trash: '<path d="M2.75 4.25h10.5M6.25 4.25v-1.5h3.5v1.5M4.25 4.25l.75 9h6l.75-9"/>',
    pin: '<path d="M8 13.25S3.75 9.35 3.75 6a4.25 4.25 0 0 1 8.5 0c0 3.35-4.25 7.25-4.25 7.25z"/><circle cx="8" cy="6" r="1.5"/>',
    expand: '<path d="M9.25 2.75h4v4M13.25 2.75 9 7M6.75 13.25h-4v-4M2.75 13.25 7 9"/>',
    speaker: '<path d="M2.75 6h2.5l3.5-3v10l-3.5-3h-2.5z"/><path d="M10.75 6a2.5 2.5 0 0 1 0 4M12.25 4a5 5 0 0 1 0 8"/>',
    mute: '<path d="M2.75 6h2.5l3.5-3v10l-3.5-3h-2.5z"/><path d="m10.5 6.25 2.75 3.5m0-3.5-2.75 3.5"/>',
    music: '<path d="M6.25 11.5V3.75l7-1V10.5"/><circle cx="4.5" cy="11.5" r="1.75"/><circle cx="11.5" cy="10.5" r="1.75"/>',
    pencil: '<path d="M10.5 3 13 5.5 5.75 12.75h-2.5v-2.5z"/>',
    down: '<path d="M2.75 9.75v3.5h10.5v-3.5"/><path d="M8 2.75v7.4M5.25 7.4 8 10.15l2.75-2.75"/>',
    extout: '<path d="M7.25 2.75h-4.5v10.5h10.5v-4.5"/><path d="M9.25 2.75h4v4M13.25 2.75 7.5 8.5"/>',
    phone: '<path d="M4.75 2.75h6.5v10.5h-6.5z"/><path d="M7.25 11h1.5"/>',
    screen: '<path d="M2.75 3.75h10.5v7h-10.5z"/><path d="M5.5 13.25h5"/>',
    /* 警告：6 px 琥珀小点，不用三角（用户 2026-11-05 20:17） */
    wdot: '<circle class="e-fill" cx="8" cy="8" r="3"/>'
  };
  /* 工作台图标（path d 的开头）→ E 图标名。顺序有关：先比长的 */
  var MAP = [
    ['M240,56v48a8,8,0,0,1-8,8', 'reload'],           // ArrowClockwise
    ['M224,128a96,96,0,0,1-94.', 'reset'],             // ArrowCounterClockwise
    ['M224,128a8,8,0,0,1-8,8H5', 'back'],              // ArrowLeft
    ['M221.66,133.66l-72,72a8,', 'fwd'],               // ArrowRight
    ['M224,104a8,8,0,0,1-16,0V', 'extout'],            // ArrowSquareOut
    ['M232,144a64.07,64.07,0,0', 'undo'],              // ArrowUUpLeft
    ['M170.34,130.34,204.69,96', 'redo'],              // ArrowUUpRight
    ['M216,48V96a8,8,0,0,1-16,', 'expand'],            // ArrowsOutSimple
    ['M213.66,101.66l-80,80a8,', 'cd'],                // CaretDown
    ['M181.66,133.66l-80,80a8,', 'cr'],                // CaretRight
    ['M229.66,77.66l-128,128a8', 'check'],             // Check
    ['M173.66,98.34a8,8,0,0,1,', 'check'],             // CheckCircle（E 的「已完成」只有勾）
    ['M168,152a8,8,0,0,1-8,8H9', 'file'],              // ClipboardText（节目）
    ['M216,32H88a8,8,0,0,0-8,8', 'copy'],              // Copy
    ['M229.66,218.34l-50.07-50', 'search'],            // MagnifyingGlass
    ['M128,64a40,40,0,1,0,40,4', 'pin'],               // MapPin
    ['M212.92,17.69a8,8,0,0,0-', 'music'],             // MusicNotes
    ['M200,32H160a16,16,0,0,0-', 'pause'],             // Pause
    ['M227.31,73.37,182.63,28.', 'pencil'],            // PencilSimple
    ['M232.4,114.49,88.32,26.3', 'play'],              // Play
    ['M240,128a15.74,15.74,0,0', 'play'],              // Play（fill）
    ['M224,128a8,8,0,0,1-8,8H1', 'plus'],              // Plus
    ['M24,128A72.08,72.08,0,0,', 'loop'],              // Repeat
    ['M40,88H73a32,32,0,0,0,62', 'settings'],          // SlidersHorizontal（E「设置」就是两根滑杆）
    ['M155.51,24.81a8,8,0,0,0-', 'speaker'],           // SpeakerHigh
    ['M53.92,34.62A8,8,0,1,0,4', 'mute'],              // SpeakerSlash
    ['M230.91,172A8,8,0,0,1,22', 'layer'],             // Stack
    ['M216,48H176V40a24,24,0,0', 'trash'],             // Trash
    ['M205.66,194.34a8,8,0,0,1', 'x'],                 // X
    ['M382-240 154-468l57-57 1', 'check'],             // Material check
    ['M280-40q-33 0-56.5-23.5T', 'phone'],             // Material smartphone
    ['M80-120q-17 0-28.5-11.5T', 'screen']             // Material computer
  ];
  function nameFor(d) {
    if (d.indexOf('M224,144v64a8,8,0,0,1-8,') === 0) return d.indexOf('Zm-101.66') > 0 ? 'down' : 'out';   // DownloadSimple / UploadSimple
    if (d.indexOf('M128,24A104,104,0,1,0,23') === 0) return d.indexOf('Zm-8-80V80') > 0 ? 'wdot' : 'check';   // WarningCircle（regular）→ 琥珀小点；CheckCircle（fill，选中卡片、载入提示）→ 勾
    for (var i = 0; i < MAP.length; i++) if (d.indexOf(MAP[i][0]) === 0) return MAP[i][1];
    return null;
  }
  function own(svg) { var g = null; for (var c = svg.firstElementChild; c; c = c.nextElementSibling) if (c.classList && c.classList.contains('e-ico')) g = c; return g; }
  function proc(svg) {
    var vb = svg.getAttribute('viewBox');
    if (vb !== '0 0 256 256' && vb !== '0 -960 960 960') return;
    var d = '', c;
    for (c = svg.firstElementChild; c; c = c.nextElementSibling) {
      if (c.classList && c.classList.contains('e-ico')) continue;
      if (c.tagName === 'path' && !d) d = c.getAttribute('d') || '';
    }
    var name = nameFor(d), g = own(svg);
    if (svg.getAttribute('data-e-ico') === name && g) return;
    if (g) svg.removeChild(g);
    if (!name || !E[name]) { svg.removeAttribute('data-e-ico'); return; }
    g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'e-ico');
    g.setAttribute('transform', vb === '0 0 256 256' ? 'scale(16)' : 'translate(0 -960) scale(60)');
    g.innerHTML = E[name];
    svg.appendChild(g);
    svg.setAttribute('data-e-ico', name);
  }
  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.tagName === 'svg') proc(root);
    var list = root.querySelectorAll ? root.querySelectorAll('svg') : [];
    for (var i = 0; i < list.length; i++) proc(list[i]);
  }
  function fillRanges() {
    var rs = document.querySelectorAll('.app input[type=range]');
    for (var i = 0; i < rs.length; i++) {
      var r = rs[i], lo = parseFloat(r.min || 0), hi = parseFloat(r.max || 100), v = parseFloat(r.value);
      var pct = hi > lo ? Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100)) : 0;
      var s = pct.toFixed(2) + '%';
      if (r.style.getPropertyValue('--e-v') !== s) r.style.setProperty('--e-v', s);
    }
  }
  function start() {
    scan(document.body);
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'attributes') { var s = m.target.closest && m.target.closest('svg'); if (s) proc(s); continue; }
        for (var j = 0; j < m.addedNodes.length; j++) {
          var n = m.addedNodes[j];
          if (n.nodeType === 1 && n.classList && n.classList.contains('e-ico')) continue;
          if (n.nodeType === 1 && n.closest && n.closest('svg') && n.tagName !== 'svg') { proc(n.closest('svg')); continue; }
          scan(n);
        }
      }
    }).observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['d']});
    document.addEventListener('input', function (e) { if (e.target && e.target.type === 'range') fillRanges(); }, true);
    fillRanges();
    setInterval(fillRanges, 200);   // 播放时 React 直接改 value，不发 input 事件
    var timers = new WeakMap();
    document.addEventListener('scroll', function (e) {
      var el = e.target === document ? document.documentElement : e.target;
      if (!el || el.nodeType !== 1) return;
      el.setAttribute('data-e-scrolling', '');
      clearTimeout(timers.get(el));
      timers.set(el, setTimeout(function () { el.removeAttribute('data-e-scrolling'); }, 800));
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
