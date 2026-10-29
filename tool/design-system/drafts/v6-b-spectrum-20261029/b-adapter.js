/* 组件外观适配。B拥有全部值、校验、事务和预览；此处不注册参数值事件。 */
(() => {
  'use strict';
  const root = document.querySelector('#app');
  const own = new URL('../v6-b-spectrum-20261029/', document.baseURI);
  let queued = false;
  const add = (nodes, ...classes) => nodes.forEach(node => node.classList.add(...classes));

  function enhance() {
    if (!root.querySelector('.app')) return;
    const bar = root.querySelector('.review-bar');
    if (bar && !bar.dataset.bSpectrumMounted) {
      bar.dataset.bSpectrumMounted = 'true';
      const home = bar.querySelector('a');
      home.href = new URL('index.html', own); home.textContent = '← B两版比较';
      const nav = bar.querySelector('.concept-nav');
      nav.setAttribute('aria-label', 'B组件版本');
      nav.replaceChildren();
      for (const [label, path, current] of [
        ['原B · 保留', new URL('b.html', document.baseURI), false],
        ['B · Adobe组件', new URL('b.html', own), true],
        ['Material统一稿', new URL('../v3-unified/components.html', document.baseURI), false]
      ]) {
        const link = document.createElement('a'); link.textContent = label; link.href = path;
        if (current) link.setAttribute('aria-current','page');
        nav.append(link);
      }
      bar.querySelector('.review-note').textContent = '同一真实B · 参数/预览保留';
      const label = document.createElement('label'); label.className='b-density-select';
      label.append(document.createTextNode('密度'));
      const select=document.createElement('select'); select.setAttribute('aria-label','B控件密度');
      for (const [value, text] of [['compact','紧凑 32'],['regular','常规 40']]) {
        const option=document.createElement('option'); option.value=value; option.textContent=text; select.append(option);
      }
      const initial=new URLSearchParams(location.search).get('density');
      document.body.dataset.density=initial==='regular'?'regular':'compact';
      select.value=document.body.dataset.density;
      select.addEventListener('change',()=>{
        document.body.dataset.density=select.value;
        const url=new URL(location.href);url.searchParams.set('density',select.value);
        history.replaceState(null,'',url);
      });
      label.append(select);bar.append(label);
      document.title='B · 分组聚焦 · Adobe统一组件 — FireWorksLab Demo';
    }
    root.querySelectorAll('button').forEach(button=>{
      if(button.matches('.splitter,.node-name,.library-item,.focus-group-tab') || button.closest('.tree-row')) return;
      button.classList.add('u-button');
      if(button.classList.contains('primary')) button.classList.add('u-primary');
      if(button.classList.contains('quiet') || button.matches('.search-clear,.focus-reset')) button.classList.add('u-quiet');
      if(button.classList.contains('icon-button')) button.classList.add('u-icon');
    });
    add(root.querySelectorAll('input:not([type=range]):not([type=checkbox]):not([type=radio]),textarea'),'u-input');
    add(root.querySelectorAll('input[type=range]'),'u-slider');
    add(root.querySelectorAll('select'),'u-select');
    add(root.querySelectorAll('input[type=checkbox]'),'u-checkbox');
    root.querySelectorAll('input[type=checkbox]').forEach(input=>input.closest('label')?.classList.add('u-check-row'));
    add(root.querySelectorAll('.focus-param-title'),'u-label');
    add(root.querySelectorAll('.field-meta,.field-required-meta,.focus-param-en'),'u-help');
    add(root.querySelectorAll('.param-error'),'u-field-error');
    add(root.querySelectorAll('.focus-help>summary,.focus-group-description>summary'),'u-summary');
    add(root.querySelectorAll('.focus-group-tabs'),'u-segments');
    add(root.querySelectorAll('.focus-group-tab'),'u-segment');
    add(root.querySelectorAll('dialog'),'u-dialog');
    root.querySelectorAll('.focus-param').forEach(row=>{
      row.querySelectorAll('.u-input,.u-select').forEach(input=>input.classList.toggle('is-modified',row.classList.contains('is-changed')));
    });
  }
  function schedule() {
    if(queued) return;
    queued=true;requestAnimationFrame(()=>{queued=false;enhance();});
  }
  // 忽略时间轴的纯文本刷新，不在播放每一帧重扫参数区。
  const observer=new MutationObserver(records=>{
    if(records.some(record=>record.type==='attributes'
      ?record.oldValue!==record.target.getAttribute(record.attributeName)
      :[...record.addedNodes].some(node=>node.nodeType===Node.ELEMENT_NODE))) schedule();
  });
  observer.observe(root,{childList:true,subtree:true,attributes:true,attributeOldValue:true,
    attributeFilter:['disabled','readonly','aria-invalid','aria-pressed','aria-selected']});
  enhance();
  window.BSpectrum=Object.freeze({enhance,storageKey:'fwl.workflow-demo.20261029.spectrum-b.focus',componentBehaviour:'B domain controller preserved; no v3 numeric kit attached'});
})();
