// 仅在隔离 srcdoc 运行，不修改烘焙器生产文件。
(() => {
  const channel='baker-parameter-context',api=window.__fw,origin=new URL(document.baseURI).origin;
  if(!api)throw Error('当前烘焙器未提供样板接口');
  document.body.classList.add('parameter-context');
  const panel=document.createElement('iframe');panel.id='parameterSample';panel.title='当前图层参数';
  const url=new URL('../refined-sample/',window.FW_PARAMETER_CONTEXT_BASE);url.searchParams.set('embedded','1');url.searchParams.set('layout',window.FW_PARAMETER_LAYOUT);
  panel.src=url;document.getElementById('right').append(panel);
  let ready=false,lastKey='',activeIndex=0,applying=false;
  const send=(kind,values={})=>ready&&panel.contentWindow.postMessage({channel,kind,...values},origin);
  const snap=()=>{
    const actual=typeof wbSnap==='function'?wbSnap():null;
    const layers=actual?.kind==='combo'?(actual.layers||[]).filter(l=>l.P).map((l,i)=>({id:String(i),name:layerName(i)||'图层 '+(i+1),P:structuredClone(l.P),M:structuredClone({...l.M,...l.L}),L:{delay:l.L.delay||0,scale:l.L.scale??1,rate:l.L.rate??1,mirror:!!l.L.mirror}})):[{id:'0',name:'主层',P:structuredClone(api.state.P),M:structuredClone(api.state.M),L:{delay:0,scale:1,rate:1,mirror:false}}];
    const index=api.state.comboSel>=0?api.state.comboSel:0;
    return {sourceKind:actual?.kind,type:layers[index]?.P.type,name:document.getElementById('abIdName')?.textContent||TYPE_NAMES[api.state.P.type],key:lib.key||'type:'+api.state.P.type,layers,index};
  };
  const contextKey=()=>[lib.key,state.tab,state.comboName,api.state.P.type,api.state.comboSel,state.layers.map(L=>L.lib).join(','),document.getElementById('abIdName')?.textContent].join('|');
  const publish=()=>{
    if(!ready||applying)return;
    // 素材回放／排队条目沿用原生只读页面，不能把上一个效果的参数放在新名称下。
    const native=state.tab==='asset'||lib.review?.kind==='queued';document.body.classList.toggle('native-context',native);panel.hidden=native;
    if(native){lastKey='';return;}
    if(!document.getElementById('busy').hidden){panel.hidden=true;document.getElementById('right').setAttribute('aria-busy','true');return;}
    const key=contextKey();if(key===lastKey)return;
    const current=snap();
    // 组合母版初始化是异步的；完整快照到齐后再更新身份和基线。
    if(!current.layers.length||!current.type||current.layers.length!==(state.tab==='combo'?state.layers.length:1)){panel.hidden=true;document.getElementById('right').setAttribute('aria-busy','true');return;}
    panel.hidden=false;document.getElementById('right').removeAttribute('aria-busy');lastKey=key;activeIndex=current.index;send('source',current);
  };
  const disableBusiness=()=>{
    const ids=['abSave','abSaveAs','abReset','abAddLayer','abDelete','abExportPack','abMore','abUndo','abRedo','deliveryOpen','updBtn','newRecipe','versionHistory','rvCopy','verCompare','bakeNow','staleBake','autoBakeChk'];
    for(const id of ids){const element=document.getElementById(id);if(!element)continue;if(element.matches('button,input,select'))element.disabled=true;element.title='此参数样板只编辑隔离副本；保存、导出与原生交付继续使用生产页';}
    // 参数写入统一经过样板历史；外壳保留预览寻帧，不另开一条无法撤销的编辑路径。
    document.querySelectorAll('#previewBloomChk,[data-cut],[data-tlopt]').forEach(element=>{element.disabled=true;});
    document.querySelectorAll('#ptabs button').forEach(button=>{button.disabled=button.dataset.tab!=='master';});
    document.querySelectorAll('#viewSeg button').forEach(button=>{button.disabled=button.dataset.view!=='live';if(button.disabled)button.title='此样板验证参数与实时模拟；回放及交付继续使用生产页';});
  };
  // 拦截外壳的业务操作，不影响真实暂停、拖时间轴、素材库或窗格调整。
  document.addEventListener('click',event=>{
    const target=event.target.closest('button,a');if(!target)return;
    if(target.closest('#assetBar')&&!target.closest('#abId')||target.closest('.delivery-nav')||target.closest('.side-foot')||target.closest('#updBtn')||target.matches('a[download]')){event.preventDefault();event.stopImmediatePropagation();}
  },true);
  document.addEventListener('pointerdown',event=>{if(event.target.closest('#tlBars .ph,#tlBars .cut')){event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||['b','B','Delete'].includes(event.key)){event.stopImmediatePropagation();if(event.ctrlKey||event.metaKey)event.preventDefault();}},true);
  window.addEventListener('message',event=>{
    if(event.source!==panel.contentWindow||event.data?.channel!==channel)return;
    const message=event.data;
    if(message.kind==='ready'){ready=true;lastKey='';publish();return;}
    if(message.kind==='layout'){parent.postMessage(message,origin);return;}
    if(message.kind==='choose-type'){applying=true;openType(message.type);bakeCancel();clearTimeout(bakeTimer);state.dirty=false;applying=false;lastKey='';publish();return;}
    if(message.kind==='edit'){
      if(message.key!==(lib.key||'type:'+state.P.type))return;
      applying=true;activeIndex=message.index;
      if(state.tab==='combo'){
        // 历史可能恢复另一层；把整个会话快照同步到预览，避免只恢复当前层。
        message.layers.forEach((value,i)=>{const L=state.layers[i],entry=L&&layerEntryOf(L);if(!entry)return;const changed=JSON.stringify(entry.P)!==JSON.stringify(value.P);entry.P=structuredClone(value.P);Object.assign(L,value.M,value.L);if(changed)entry.pRev=(entry.pRev||0)+1;});
        const L=state.layers[activeIndex],entry=L&&layerEntryOf(L);
        if(entry){state.comboSel=activeIndex;state.P=entry.P;state.M=L;}
      }else {state.P=structuredClone(message.layers[0].P);state.M=structuredClone(message.layers[0].M);}
      // 保留源实时模拟核和材质；不产生烘焙回执或文件。
      derive(state.P);state.gen++;state.dirty=false;state.t=Math.min(state.t,state.P.duration);lastKey=contextKey();
      refreshVisibility();wbSync();syncStageTabs();disableBusiness();applying=false;
    }
  });
  openType('senrin');clearTimeout(bakeTimer);bakeMode.auto=false;state.dirty=false;state.view='live';
  wbSync();syncStageTabs();disableBusiness();
  const selected=document.querySelector('#libBody [data-key="type:senrin"]');selected?.scrollIntoView({block:'center'});
  setInterval(()=>{disableBusiness();publish();},250);
})();
