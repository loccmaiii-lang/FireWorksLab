// 只代理现有发射器按钮，参数、条件和撤销均由原生页处理。
(() => {
  const reference=window.FW_EMITTER_RAIL_REFERENCE,main=document.querySelector('main'),right=document.getElementById('right');
  const originalTabs=()=>document.querySelector('#params .etabs');
  const originalButton=name=>[...(originalTabs()?.querySelectorAll('[data-e]')||[])].find(button=>button.dataset.e===name);
  const disableBusiness=()=>{
    const ids=['abSave','abSaveAs','abAddLayer','abDel','abExportPack','abMore','deliveryOpen','updBtn','newRecipe','versionHistory','rvCopy','verCompare','bakeNow','staleBake','autoBakeChk','btnExport','btnVariants','btnImport','fileIn','enNameEdit','btnThumb'];
    for(const id of ids){const element=document.getElementById(id);if(element?.matches('button,input,select')){element.disabled=true;element.title='草稿只使用本页内存；正式保存、导出与交付请使用生产页';}}
    document.querySelectorAll('#viewSeg button').forEach(button=>{button.disabled=button.dataset.view!=='live';});
    document.querySelectorAll('#ptabs [data-tab]').forEach(button=>{button.disabled=button.dataset.tab!=='master';});
  };
  // 原生撤销、参数编辑、新增发射器与预览继续可用；文件操作被隔离。
  document.addEventListener('click',event=>{
    const target=event.target.closest('button,a');if(!target)return;
    if(target.closest('.delivery-nav,.side-foot,#updBtn')||target.matches('a[download]')||target.closest('#assetBar')&&!target.closest('#abId')&&!target.closest('#abUndo,#abRedo')){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&['s','o'].includes(event.key.toLowerCase())||['b','B'].includes(event.key)&&!event.target.matches('input,textarea')){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  const first=typeof entryById==='function'&&entryById('FC6O');
  if(first)openReview(first);else openType('kamuro');
  clearTimeout(bakeTimer);bakeMode.auto=false;state.dirty=false;state.view='live';state.playing=false;state.t=curDuration()*.12;
  selectEmitTab('效果');wbSync();syncStageTabs();disableBusiness();
  if(reference)return;
  document.body.classList.add('emitter-rail-draft');
  const rail=document.createElement('nav');rail.id='emitterRail';rail.setAttribute('aria-label','当前层发射器');
  const heading=document.createElement('div');heading.className='emitter-rail-heading';heading.textContent='发射器';
  const tabs=document.createElement('div');tabs.className='emitter-rail-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','选择发射器或输出');tabs.setAttribute('aria-orientation','vertical');
  const list=document.createElement('div');list.className='emitter-rail-list';
  const footer=document.createElement('div');footer.className='emitter-rail-footer';
  const add=document.createElement('button');add.id='railAdd';add.className='emitter-rail-add';add.type='button';add.textContent='＋';add.setAttribute('aria-label','新增发射器');
  add.addEventListener('click',()=>document.querySelector('#params #exAdd')?.click());
  tabs.append(list,footer);rail.append(heading,tabs,add);right.before(rail);
  const buttons=new Map();let pending=false,lastNames='',lastSelected='';
  function render(){
    pending=false;const bar=originalTabs();if(!bar){rail.hidden=true;return;}rail.hidden=false;
    const originals=[...bar.querySelectorAll('[data-e]')].filter(button=>!button.hidden&&button.dataset.e!=='全部');
    const names=originals.map(button=>button.dataset.e),sig=JSON.stringify(names),hadFocus=rail.contains(document.activeElement);
    if(sig!==lastNames){
      list.replaceChildren();footer.replaceChildren();buttons.clear();lastNames=sig;
      for(const name of names){
        const button=document.createElement('button');button.type='button';button.className='emitter-rail-tab';button.dataset.emitter=name;button.setAttribute('role','tab');
        const label=document.createElement('span');label.className='emitter-rail-label';label.textContent=name;
        const count=document.createElement('span');count.className='emitter-rail-count';button.append(label,count);
        button.addEventListener('click',()=>originalButton(name)?.click());
        (name==='输出'?footer:list).append(button);buttons.set(name,button);
      }
    }
    for(const native of originals){
      const button=buttons.get(native.dataset.e),selected=native.classList.contains('on');
      button.classList.toggle('on',selected);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected||!pview.tabNow&&native.dataset.e===names[0]?0:-1;button.title=native.title;
      const nativeCount=native.querySelector('.et-n'),count=button.querySelector('.emitter-rail-count');count.textContent=nativeCount?.textContent||'';count.hidden=!nativeCount||nativeCount.hidden;
    }
    const nativeAdd=bar.querySelector('#exAdd'),slotsFull=typeof EX_SLOTS!=='undefined'&&names.filter(name=>name.startsWith('自定义 ')).length>=EX_SLOTS;
    add.disabled=!nativeAdd||nativeAdd.disabled||nativeAdd.hidden||slotsFull;
    add.title=slotsFull?`当前层已有${EX_SLOTS}个自定义发射器，已达到源码上限`:add.disabled?'当前效果不支持新增自定义发射器':nativeAdd.title;
    if(hadFocus&&sig===lastNames&&!rail.contains(document.activeElement))buttons.get(pview.tabNow)?.focus({preventScroll:true});
    const selected=buttons.get(pview.tabNow);if(selected&&selected.parentElement===list&&(sig!==rail.dataset.names||pview.tabNow!==lastSelected))selected.scrollIntoView({block:'nearest'});
    lastSelected=pview.tabNow;
    rail.dataset.names=sig;disableBusiness();
  }
  const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(render);}};
  new MutationObserver(schedule).observe(document.getElementById('params'),{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','aria-selected','class']});
  tabs.addEventListener('keydown',event=>{
    if(!event.target.matches('[data-emitter]')||!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    const entries=[...tabs.querySelectorAll('[data-emitter]')],index=entries.indexOf(event.target);
    const next=event.key==='Home'?0:event.key==='End'?entries.length-1:(index+(event.key==='ArrowDown'?1:-1)+entries.length)%entries.length;
    event.preventDefault();event.stopPropagation();entries[next]?.click();entries[next]?.focus({preventScroll:true});
  });
  const version=document.querySelector('.brand small');if(version)version.append(' · 左栏草稿');
  render();
})();
