// 4.9.66: local importer UI does not require the directory service; maker and delivery stay in one document, including local-file entry.
const DeliveryWorkspace = (() => {
  const localUI=location.protocol==='file:', frameOrigin=localUI?'null':location.origin;
  const frameTarget=localUI?'*':frameOrigin;
  let session=null,resources=[],last=null,active=false,busyDelivery=false,importerBusy=false,importerCurrent=null;
  let connecting=null,preparing=null,prepared=false,viewAnimation=null,desiredDeliveryId='',hostReady=false,readyWait=null,exportHome=null;
  const channel=crypto.randomUUID(),requests=new Map();
  const hostOrigin=location.protocol==='file:'?'http://127.0.0.1:8034':location.origin;
  const node=id=>document.getElementById(id);
  const message=(text,error=false)=>{const n=node('deliveryStatus');n.textContent=text;n.dataset.error=String(error);};
  const destination=()=>node('deliveryDestination').value;
  const importLabel=state=>({ready:'检查通过，待确认',conflict:'检查冲突，需处理',error:'检查失败',done:'导入已报告完成',partial:'部分完成',checking:'检查中',queued:'待检查',pending:'待检查',importing:'导入中',stopped:'已停止',saved:'UE 已报告保存'}[state]||'状态待核对');
  function updateRootControls(){
    for(const id of ['deliveryPick','deliverySaveRoot','deliveryDestination','deliveryRoot'])node(id).disabled=importerBusy||busyDelivery||!!exportHome;
    node('deliveryCheck').disabled=importerBusy||!last||!session?.importerAvailable;
  }
  function rpc(command,payload={},timeout=10000){
    return new Promise((resolve,reject)=>{
      const id=crypto.randomUUID(),timer=setTimeout(()=>{requests.delete(id);reject(Error(command==='publish'?'资源写入等待超时，可能仍在进行；请先刷新资源核对修订，再决定是否重新导出':'本机交付服务未响应，请启动 tool/启动烘焙器.cmd 后在此页重试'));},timeout);
      requests.set(id,{resolve,reject,timer});node('deliveryFrame').contentWindow.postMessage({type:'workspace-host-request',channel,id,command,payload},frameTarget);
    });
  }
  function waitForHost(retry=false){
    if(hostReady)return Promise.resolve();
    if(readyWait)return readyWait.promise;
    let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    const timer=setTimeout(()=>{readyWait=null;reject(Error('本机导入界面未就绪，请运行 tool/启动烘焙器.cmd --no-browser 修复本机组件后重试'));},8000);
    readyWait={promise,resolve,timer};
    if(retry||!node('deliveryFrame').getAttribute('src'))node('deliveryFrame').src=(localUI?new URL('local_delivery/runtime/importer.html',location.href).href:hostOrigin+'/delivery-host')+(retry?'?retry='+Date.now():'')+'#'+channel;
    return promise;
  }
  async function connect(retry=false){
    if(session&&!retry&&!session.directoryError)return session;
    if(connecting)return connecting;
    connecting=(async()=>{
      await waitForHost(retry);session=await rpc('session',{},15000);
      node('deliveryRoot').value=session.outputRoot||'';node('deliveryFrame').hidden=!session.importerAvailable;
      node('deliveryImporterMissing').hidden=session.importerAvailable;node('deliveryLoading').hidden=true;node('deliveryRetry').hidden=true;
      updateRootControls();
      return session;
    })();try{return await connecting;}finally{connecting=null;}
  }
  function connectionError(error){node('deliveryLoading').hidden=true;node('deliveryRetry').hidden=false;message(error.message,true);}
  function show(open){
    if(active===open)return;
    viewAnimation?.cancel();viewAnimation=null;active=open;
    document.querySelector('.app').classList.toggle('delivery-active',open);node('deliveryWorkspace').hidden=!open;
    node('main').inert=open;node('main').setAttribute('aria-hidden',String(open));
    node('deliveryOpen').hidden=open;node('deliveryMake').hidden=!open;
    placeExportProgress();
    const view=node(open?'deliveryWorkspace':'main');
    if(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&view.animate)
      viewAnimation=view.animate([{opacity:.45,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:160,easing:'cubic-bezier(.2,0,0,1)'});
    node(open?'deliveryMake':'deliveryOpen').focus({preventScroll:true});
  }
  function placeExportProgress(){
    if(!exportHome)return;
    const progress=node('busy');
    if(active)node('deliveryWorkspace').append(progress);
    else exportHome.parent.insertBefore(progress,exportHome.next);
  }
  async function beginExport(target){
    if(target==='zip')return;
    const progress=node('busy');exportHome={parent:progress.parentNode,next:progress.nextSibling};
    show(true);placeExportProgress();message('正在准备交付资源…');
    updateRootControls();
    // Paint the destination and the existing cancellable progress before CPU/GPU work.
    await new Promise(resolve=>window.requestAnimationFrame?window.requestAnimationFrame(()=>window.requestAnimationFrame(resolve)):setTimeout(resolve,0));
    await connect();if(session.directoryError)throw Error(session.directoryError);
    if(!session.outputRoot)throw Error('请先在资源目录与版本中指定导出目录');
  }
  function exportFailed(error){if(exportHome)message('导出未完成：'+error.message,true);}
  function finishExport(){
    if(exportHome){exportHome.parent?.insertBefore(node('busy'),exportHome.next);exportHome=null;}
    updateRootControls();
  }
  async function prepare(){
    if(prepared)return;if(preparing)return preparing;
    preparing=(async()=>{
      await connect();if(session.directoryError)throw Error(session.directoryError);await refresh();
      const remembered=!last&&resources.find(r=>r.deliveryId===importerCurrent?.deliveryId);
      if(remembered&&!importerBusy)await select(remembered);
      else if(!last&&!importerCurrent&&resources.length)await select(resources[resources.length-1]);
      else if(last)await sendToImporter();
      else if(importerCurrent)message('已恢复当前素材。核对清单后确认导入。');
      if(!last&&!importerCurrent)message(session.outputRoot?'选择已交付修订，或回效果制作导出新资源。':'首次使用请先选择资源导出目录。');
      prepared=true;
    })();try{return await preparing;}finally{preparing=null;}
  }
  async function open(){
    show(true);if(!prepared)message('正在恢复资源与导入工作区…');
    try{await prepare();if(active&&session.importerAvailable)await rpc('focus.restore');}catch(e){connectionError(e);}
  }
  async function refresh(){resources=(await rpc('resources')).resources;if(importerCurrent)presentCurrent();render();}
  function render() {
    const list = node('deliveryList'); list.replaceChildren();
    if (!resources.length) { const p = document.createElement('p'); p.textContent = '尚无交付资源。回到效果制作，使用“导出素材包”。'; list.append(p); }
    for (const r of [...resources].reverse()) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'delivery-resource fw-button';
      const title = document.createElement('b'); title.textContent = r.name;
      const detail = document.createElement('small'); detail.textContent = r.revisionId.slice(0,8) + ' · ' + r.packages.map(p=>p.platform==='mobile'?'手机':p.platform.toUpperCase()).join(' / ') + (r.latestExport?' · ZIP v'+String(r.latestExport.sequence).padStart(3,'0'):'');
      const result = document.createElement('small'); result.textContent = r.importReceipt ? '导入记录：' + [...new Set(r.importReceipt.rows.map(x=>importLabel(x.state)))].join(' / ') : '资源已交付 · 待导入检查';
      button.append(title, detail, result); button.setAttribute('aria-pressed', String(last?.deliveryId === r.deliveryId));
      button.disabled=importerBusy; button.addEventListener('click', ()=>{if(!importerBusy)select(r).then(()=>node('deliveryOptions').open=false).catch(e=>message(e.message,true));}); list.append(button);
    }
  }
  function presentReceipt(receipt) {
    last = receipt; render();
    const sourceName=receipt.metadata?.recipe?.name||receipt.metadata?.name;
    node('deliveryTitle').textContent=sourceName&&sourceName!==receipt.name?sourceName+' · '+receipt.name:receipt.name;
    node('deliveryContext').textContent=`修订 ${receipt.revisionId.slice(0,8)} · ${receipt.packages.map(p=>p.platform==='mobile'?'手机':'PC').join(' / ')} · ${receipt.files.length} 个文件`;
    node('deliveryReceipt').textContent = `${receipt.name} · 修订 ${receipt.revisionId}\n${receipt.directory}\n${receipt.files.length} 个文件，${receipt.packages.length} 份平台配置。原文件已校验；UE 状态见下方导入清单。`;
    if(receipt.latestExport){const x=receipt.latestExport;node('deliveryReceipt').textContent+=`\nZIP v${String(x.sequence).padStart(3,'0')} · ${x.status==='missing'?'留档文件缺失':'已留档'}\n${x.path}`;}
    const img = node('deliveryThumbnail'); img.hidden = receipt.thumbnail.status !== 'ready';
    if (!img.hidden) img.src = hostOrigin + '/api/deliveries/' + receipt.deliveryId + '/' + receipt.thumbnail.file;
    node('deliveryThumbnailMissing').hidden = !img.hidden;
    node('deliveryCheck').disabled = importerBusy || !session?.importerAvailable;
  }
  async function select(receipt) {
    const previous=last;desiredDeliveryId=receipt.deliveryId;last=receipt;
    const result=await sendToImporter();
    if(result?.queued||result?.failed){desiredDeliveryId='';last=previous;presentCurrent();render();}
    else presentReceipt(receipt);
  }
  function presentCurrent() {
    const current=importerCurrent,receipt=current&&resources.find(r=>r.deliveryId===current.deliveryId);
    if(desiredDeliveryId&&current?.deliveryId!==desiredDeliveryId)return;
    if(current?.deliveryId===desiredDeliveryId)desiredDeliveryId='';
    if(receipt){presentReceipt(receipt);}
    else if(current){last=null;node('deliveryTitle').textContent=current.name||'其他素材';node('deliveryContext').textContent=`手动素材 · 当前 ${current.platform==='mobile'?'手机':'PC'} 包`;node('deliveryReceipt').textContent=`手动素材\n${current.dir||''}\n请使用下方原导入工作区检查此素材包。`;node('deliveryThumbnail').hidden=true;node('deliveryThumbnailMissing').hidden=true;node('deliveryCheck').disabled=true;}
  }
  async function sendToImporter() {
    if(!last||!session?.importerAvailable)return;
    try{
      const result=await rpc('accept',{deliveryId:last.deliveryId},30000);
      message(result.queued?'资源已保存；当前任务结束后自动接收新修订。':'已接入导入清单。核对名称与处理方式后确认导入。');
      return result;
    }catch(e){desiredDeliveryId='';message('资源已保存；导入检查未完成：'+e.message,true);return{failed:true};}
  }
  async function publish(blob,name,metadata){
    if(busyDelivery)throw Error('正在交付另一份资源，请等待完成');busyDelivery=true;
    updateRootControls();
    try{
      show(true);await connect();message('正在写入并校验完整资源…');
      const receipt=await rpc('publish',{blob,name,metadata},120000);
      await select(receipt);prepared=true;return receipt;
    }catch(e){connectionError(e);message('交付失败：'+e.message+'。现有修订保留，可重试导出。',true);throw e;}
    finally{busyDelivery=false;updateRootControls();}
  }
  function init(){
    window.addEventListener('message',e=>{
      const data=e.data;if(e.source!==node('deliveryFrame').contentWindow||(localUI?!['null','file://'].includes(e.origin):e.origin!==frameOrigin)||data?.channel!==channel)return;
      if(data.type==='workspace-host-ready'){hostReady=true;node('deliveryFrame').hidden=false;node('deliveryLoading').hidden=true;if(readyWait){clearTimeout(readyWait.timer);readyWait.resolve();readyWait=null;}return;}
      if(data.type==='workspace-host-response'){
        const pending=requests.get(data.id);if(!pending)return;requests.delete(data.id);clearTimeout(pending.timer);
        if(data.ok)pending.resolve(data.value);else pending.reject(Error(data.error||'本机交付请求失败'));return;
      }
      if(data.type==='workspace-host-state'){
        importerBusy=!!data.busy;importerCurrent=data.current||null;
        node('deliveryMake').disabled=false;
        updateRootControls();
        presentCurrent();render();return;
      }
      if(data.type==='workspace-host-resources'){resources=data.resources||[];presentCurrent();render();return;}
      if(data.type==='workspace-host-error')connectionError(Error(data.error));
    });
    node('deliveryWorkspace').addEventListener('keydown',e=>e.stopPropagation());
    document.querySelector('.delivery-nav').addEventListener('keydown',e=>{if(active)e.stopPropagation();});
    node('deliveryOpen').addEventListener('click',open);node('deliveryMake').addEventListener('click',()=>show(false));
    node('deliveryRetry').addEventListener('click',async()=>{
      const button=node('deliveryRetry');button.disabled=true;message('正在重新连接本机交付服务…');
      try{await connect(true);if(!prepared)await prepare();else message('本机交付服务已连接，当前清单与操作记录保留。');}
      catch(e){connectionError(e);}finally{button.disabled=false;}
    });
    node('deliveryRefresh').addEventListener('click',()=>refresh().catch(connectionError));
    node('deliveryCheck').addEventListener('click',sendToImporter);
    for(const [id,picker] of [['deliveryPick',true],['deliverySaveRoot',false]])node(id).addEventListener('click',async()=>{
      const button=node(id);button.disabled=true;
      try{const requested=node('deliveryRoot').value;await connect();const root=await rpc(picker?'root.pick':'root.save',picker?{}:{outputRoot:requested},120000);
        session.outputRoot=root.outputRoot;node('deliveryRoot').value=root.outputRoot||'';await refresh();message(root.cancelled?'已取消，原目录保留。':'目录已保存，之后导出直接写入此目录。');}
      catch(e){connectionError(e);}finally{updateRootControls();}
    });
    new ResizeObserver(()=>document.documentElement.style.setProperty('--delivery-top',document.querySelector('header.top').getBoundingClientRect().height+'px')).observe(document.querySelector('header.top'));
    node('deliveryOptions').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();node('deliveryOptions').open=false;node('deliveryOptions').querySelector('summary').focus();}});
    // Preparation loads one hidden shell; it does not select, confirm or execute a package.
    connect().catch(()=>{});
    if(['#delivery','#delivery-from-file','#delivery-export-from-file'].includes(location.hash))open();
  }
  return{init,open,publish,destination,beginExport,finishExport,exportFailed,get active(){return active;}};
})();

function deliveryClassification(recipe, plan, spec) {
  const parameters=recipe.kind==='combo'?(recipe.layers||[]).map(l=>l.P||{type:l.type}):[recipe.P||{}];
  const tail=parameters.length>0&&parameters.every(p=>familyOf(p.type)==='rise');
  const sizes={tailS:'small',tailM:'medium',tailL:'large'};
  let size=plan?.spec&&['small','medium','large'].includes(spec?.kind)?spec.kind:'unclassified';
  if(size==='unclassified'&&tail&&!plan?.spec){const values=new Set(parameters.map(p=>sizes[p.type]||'unclassified'));if(values.size===1)size=[...values][0];}
  return {category:tail?'tail':'firework',size};
}
function deliveryMetadata(b = null) {
  const result = {bakerVersion:VERSION, sourceKey:wbKey(), recipe:wbSnap(), duration:curDuration(), sizePlan:typeof exportScalePlan==='function'?exportScalePlan(state.P):null};
  result.classification=deliveryClassification(result.recipe,result.sizePlan,typeof sizeSpecOf==='function'?sizeSpecOf():null);
  result.artifactDuration = b ? bakeTotal(b) : comboContentEnd();
  result.boundsM = b ? {width:b.meta.Ww*(result.sizePlan?.k||1),height:b.meta.Wh*(result.sizePlan?.k||1)} : null;
  // Render the completed product with the existing engine replay, then restore the editing state.
  const saved = Object.fromEntries(['t','view','disp','bake','tab','dirty','stillBusy','platform'].map(k=>[k,state[k]]));
  try {
    state.stillBusy=true; state.view='export'; state.disp='fit'; state.platform='pc'; state.dirty=false;
    if(b) { state.bake=b; state.tab='master'; state.t=engineTick((b.meta.t0||0)+b.meta.duration*0.45); }
    else state.t=engineTick(comboContentEnd()*0.45);
    ensureTargets(); if(b)renderExport();else renderCombo();
    const thumbnail=document.createElement('canvas'); thumbnail.width=320; thumbnail.height=240;
    const ctx=thumbnail.getContext('2d'); ctx.fillStyle='#000';ctx.fillRect(0,0,320,240);
    const k=Math.min(320/canvas.width,240/canvas.height);ctx.drawImage(canvas,(320-canvas.width*k)/2,(240-canvas.height*k)/2,canvas.width*k,canvas.height*k);
    result.thumbnailData=thumbnail.toDataURL('image/png'); result.thumbnailTime=state.t;
  } catch(e) { result.thumbnailError=e.message; } finally { Object.assign(state,saved); }
  return result;
}

async function deliverResource(blob, name, metadata, destination) {
  if (destination === 'zip') return download(blob,name);
  return DeliveryWorkspace.publish(blob,name,metadata);
}
document.addEventListener('DOMContentLoaded',()=>DeliveryWorkspace.init());
