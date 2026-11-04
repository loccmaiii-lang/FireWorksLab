const WorkbenchLog=(()=>{
  let following=true;
  const card=()=>document.querySelector('.logcard'),history=()=>document.getElementById('log');
  function measure(){
    const el=card(),height=el.getBoundingClientRect().height|| (el.classList.contains('is-folded')?56:236);
    document.documentElement.style.setProperty('--wb-log-height',Math.ceil(height)+'px');
  }
  function setOpen(open){
    card().classList.toggle('is-folded',!open);
    const toggle=document.getElementById('wb-log-toggle');toggle.setAttribute('aria-expanded',String(open));toggle.title=open?'收起操作记录':'展开操作记录';
    measure();if(open&&following)history().scrollTop=history().scrollHeight;
  }
  function latest(){const selection=window.getSelection();if(selection&&!selection.isCollapsed&&history().contains(selection.anchorNode))selection.removeAllRanges();following=true;history().scrollTop=history().scrollHeight;document.getElementById('wb-log-latest').hidden=true;}
  function beforeAppend(){const el=history(),selection=window.getSelection(),selecting=selection&&!selection.isCollapsed&&el.contains(selection.anchorNode);return{top:el.scrollTop,follow:!selecting&&(following||el.scrollHeight-el.clientHeight-el.scrollTop<=12)};}
  function afterAppend(message,kind,snapshot){
    const summary=document.getElementById('wb-last-log');summary.textContent=message;summary.className=kind||'';summary.title=message;
    following=snapshot.follow;
    if(kind==='err')setOpen(true);
    if(following)history().scrollTop=history().scrollHeight;else history().scrollTop=snapshot.top;
    document.getElementById('wb-log-latest').hidden=following;
  }
  function clear(){document.getElementById('wb-last-log').textContent='暂无操作记录';document.getElementById('wb-last-log').className='';document.getElementById('wb-last-log').title='';latest();}
  function init(open){
    const el=card();el.setAttribute('aria-label','操作记录');
    const h=history();h.tabIndex=0;h.setAttribute('aria-label','操作记录历史');
    const button=document.createElement('button');button.type='button';button.id='wb-log-latest';button.className='btn ghost btn-small';button.textContent='回到最新';button.hidden=true;button.onclick=()=>{setOpen(true);latest();};el.querySelector('.head').insertBefore(button,el.querySelector('.head').lastElementChild);
    h.addEventListener('scroll',()=>{following=h.scrollHeight-h.clientHeight-h.scrollTop<=12;button.hidden=following;});
    setOpen(open);window.addEventListener('resize',measure);
    if(typeof ResizeObserver==='function')new ResizeObserver(measure).observe(el);
    document.getElementById('wb-last-log').textContent='暂无操作记录';
  }
  return{init,setOpen,beforeAppend,afterAppend,clear,latest};
})();
