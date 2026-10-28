(() => {
  'use strict';
  const text={
    graphite:['A / 低彩度石墨表面 · 精密边框 · 薄荷指示','制作效率优先，品牌表现较克制。'],
    porcelain:['B / 暖瓷白纸面 · 编辑式层级 · 墨绿操作','白天阅读清晰，暗室明暗反差较强。'],
    indigo:['C / 墨靛色阶 · 圆润容器 · 熏衣草强调','夜间创作鲜明，强调色存在感更强。'],
    baseline:['V5 原版 / 蓝灰与青绿 · 原始视觉基线','原版布局、密度与全部交互用于等条件比较。']
  };
  const url=new URL(location.href),frame=document.querySelector('#preview');
  let direction=text[url.searchParams.get('direction')]?url.searchParams.get('direction'):'graphite';
  let page=url.searchParams.get('page')||'editor',density=url.searchParams.get('density')==='compact'?'compact':'regular';
  const notes=document.querySelector('#notes'),toggle=document.querySelector('#show-notes');
  function showNotes(open){notes.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)document.querySelector('#close-notes').focus();else toggle.focus();}
  function update(){
    document.querySelectorAll('[data-direction]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.direction===direction)));
    document.querySelector('#direction-line').textContent=text[direction][0];document.querySelector('#direction-tradeoff').textContent=text[direction][1];
    const params=new URLSearchParams({direction,page,density});
    document.querySelector('#open-preview').href='preview.html?'+params;
    history.replaceState(null,'','?'+params);
  }
  frame.src='preview.html?'+new URLSearchParams({direction,page,density});
  document.querySelectorAll('[data-direction]').forEach(button=>button.addEventListener('click',()=>{
    direction=button.dataset.direction;
    frame.contentWindow.postMessage({type:'set-visual',direction},'*');update();
    if(button.classList.contains('choose'))showNotes(false);
  }));
  window.addEventListener('message',event=>{
    if(event.source!==frame.contentWindow||event.data?.type!=='visual-state')return;
    page=event.data.page;density=event.data.density;direction=event.data.direction;update();
  });
  toggle.addEventListener('click',()=>showNotes(notes.hidden));
  document.querySelector('#close-notes').addEventListener('click',()=>showNotes(false));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!notes.hidden)showNotes(false);});
  update();
})();
