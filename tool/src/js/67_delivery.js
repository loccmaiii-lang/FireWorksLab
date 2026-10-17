// 4.9.66: local importer UI does not require the directory service; maker and delivery stay in one document, including local-file entry.
const DeliveryWorkspace = (() => {
  const localUI=location.protocol==='file:', frameOrigin=localUI?'null':location.origin;
  const frameTarget=localUI?'*':frameOrigin;
  let session=null,resources=[],last=null,active=false,busyDelivery=false,importerBusy=false,importerCurrent=null;
  let connecting=null,preparing=null,prepared=false,viewAnimation=null,desiredDeliveryId='',hostReady=false,readyWait=null,exportHome=null,queuedDelivery=null,exportFailedState=false;     // 4.9.69 queuedDelivery：导出了、但导入器还在处理别的（排队中）
  const channel=crypto.randomUUID(),requests=new Map(),acceptChecks=new Map();
  let acceptCheck=null,selectionEpoch=0;
  let exportName='',exportPrevious=null;
  const hostOrigin=location.protocol==='file:'?'http://127.0.0.1:8034':location.origin;
  const node=id=>document.getElementById(id);
  const message=(text,error=false)=>{const n=node('deliveryStatus');n.textContent=text;n.dataset.error=String(error);};
  const destination=()=>node('deliveryDestination').value;
  const importLabel=state=>({ready:'检查通过，待确认',conflict:'检查冲突，需处理',error:'检查失败',done:'导入已报告完成',partial:'部分完成',checking:'检查中',queued:'待检查',pending:'待检查',importing:'导入中',stopped:'已停止',saved:'UE 已报告保存'}[state]||'状态待核对');
  function updateRootControls(){
    for(const id of ['deliveryPick','deliverySaveRoot','deliveryDestination','deliveryRoot'])node(id).disabled=importerBusy||busyDelivery||!!exportHome;
    node('deliveryCheck').disabled=importerBusy||exportFailedState||!last||!session?.importerAvailable;
    const blocked=exportFailedState&&!importerBusy;node('deliveryFrame').inert=blocked;
    if(session)node('deliveryFrame').hidden=blocked||!session.importerAvailable;
  }
  function rpc(command,payload={},timeout=10000,watch=null){
    return new Promise((resolve,reject)=>{
      const id=crypto.randomUUID(),pending={resolve,reject,timer:null,timedOut:false,late:watch?.late};
      pending.timer=setTimeout(()=>{
        pending.timedOut=true;
        // An accept deadline does not cancel the native check. Keep its late reply
        // only while this revision is being observed; exiting removes the waiter.
        if(command!=='accept'||!watch)requests.delete(id);
        const error=Error(command==='accept'?'检查请求已超过等待时间，结果未知':command==='publish'?'资源写入等待超时，可能仍在进行；请先刷新资源核对修订，再决定是否重新导出':'本机交付服务未响应，请检查连接后重读状态');
        error.code='DELIVERY_RPC_TIMEOUT';error.command=command;reject(error);
      },timeout);
      if(watch)watch.cancel=()=>{clearTimeout(pending.timer);requests.delete(id);const e=Error('停止观察检查结果');e.code='DELIVERY_OBSERVER_CANCELLED';reject(e);};
      requests.set(id,pending);node('deliveryFrame').contentWindow.postMessage({type:'workspace-host-request',channel,id,command,payload},frameTarget);
    });
  }
  const currentCheck=op=>acceptCheck===op&&!op.disposed&&last?.deliveryId===op.id&&selectionEpoch===op.epoch;
  function stopAcceptObservation(){
    const op=acceptCheck;if(!op)return;op.disposed=true;clearTimeout(op.pollTimer);
    op.watch?.cancel?.();op.queryWatch?.cancel?.();acceptCheck=null;
    // Preserve the unresolved identity: returning or refreshing may query it,
    // but must not repeat accept after an unknown outcome.
    if(!op.resolved)op.waiting=true;
  }
  function unknownCheck(op,extra=''){
    if(currentCheck(op))message('「'+op.receipt.name+'」已保存，导入检查仍在进行或结果未知。刷新只读取当前回执，不会重复接入。'+(extra?'\n'+extra:''),true);
  }
  function scheduleCheck(op){
    clearTimeout(op.pollTimer);
    if(active&&currentCheck(op)&&op.attempts<3)op.pollTimer=setTimeout(()=>readAcceptStatus(op),5000);
  }
  async function readAcceptStatus(op){
    if(!currentCheck(op))return;
    if(op.reading)return op.reading;
    clearTimeout(op.pollTimer);op.queryWatch={};op.attempts++;
    op.reading=(async()=>{
      try{
        const value=await rpc('resources',{},10000,op.queryWatch);
        if(!currentCheck(op))return;
        resources=value.resources||[];render();
        const receipt=resources.find(r=>r.deliveryId===op.id),rows=receipt?.importReceipt?.rows||[];
        // A resource receipt can be an older UI report, without a request token.
        // Show its state, but do not claim it completed this particular accept.
        unknownCheck(op,rows.length?'当前记录：'+[...new Set(rows.map(r=>importLabel(r.state)))].join(' / '):'尚无可归属到本次请求的检查回执。');
        scheduleCheck(op);
      }catch(e){
        if(currentCheck(op)){clearTimeout(op.pollTimer);unknownCheck(op,'读取状态失败：'+e.message);node('deliveryRetry').hidden=false;}
      }finally{op.reading=null;}
    })();
    return op.reading;
  }
  function finishAccept(op,result,error){
    const visible=currentCheck(op);op.resolved=true;clearTimeout(op.pollTimer);
    op.queryWatch?.cancel?.();acceptChecks.delete(op.id);
    if(acceptCheck===op)acceptCheck=null;
    if(!visible)return{stale:true};
    if(error){desiredDeliveryId='';message('「'+op.receipt.name+'」已保存，导入检查明确失败：'+error.message,true);return{failed:true};}
    const running=importerCurrent?.name||'上一份素材';
    if(result.queued){queuedDelivery={deliveryId:op.id,name:op.receipt.name,behind:running};
      message('「'+op.receipt.name+'」已保存（修订 '+op.receipt.revisionId.slice(0,8)+'），导入器还在处理「'+running+'」，新修订已排队；下方仍是当前素材。',true);}
    else{queuedDelivery=null;message('已接入导入清单。核对名称与处理方式后确认导入。');}
    return result;
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
    if(!open)stopAcceptObservation();
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
  async function beginExport(target,name=''){
    if(target==='zip')return;
    exportName=name;exportPrevious=last?{name:last.name,revisionId:last.revisionId}:null;
    const progress=node('busy');exportHome={parent:progress.parentNode,next:progress.nextSibling};
    show(true);placeExportProgress();message((name?'正在导出「'+name+'」…':'正在准备交付资源…')+'（导出完成前，下方导入区还是上一份素材）');
    updateRootControls();
    // Paint the destination and the existing cancellable progress before CPU/GPU work.
    // 4.9.80（导出排查）：标签页在后台时浏览器不出帧，两帧 rAF 永远等不到 → 导出一直挂着；最多等 150 ms
    await new Promise(resolve=>{setTimeout(resolve,150);if(window.requestAnimationFrame)window.requestAnimationFrame(()=>window.requestAnimationFrame(resolve));});
    await connect();if(session.directoryError)throw Error(session.directoryError);
    if(!session.outputRoot)throw Error('请先在资源目录与版本中指定导出目录');
    try{await refresh();}catch(e){}     // 4.9.69 导出拦截要按最新的已有资源查撞名
  }
  function exportFailed(error){
    stopAcceptObservation();
    if(!exportHome)return;exportFailedState=true;updateRootControls();
    presentExportFailure();
    message((exportName?'「'+exportName+'」':'')+'本次未导出；'+(exportPrevious?'上次成功为「'+exportPrevious.name+'」，旧修订 '+exportPrevious.revisionId.slice(0,8)+'。':'当前没有新的成功修订。')+'旧清单已停止确认与执行。请修正后重新导出，或在历史中明确选择要查看的修订。\n'+error.message,true);
  }
  function presentExportFailure(){
    node('deliveryTitle').textContent=(exportName||'本次导出')+' · 本次未导出';
    node('deliveryContext').textContent=exportPrevious?'上次成功：「'+exportPrevious.name+'」 · 修订 '+exportPrevious.revisionId.slice(0,8):'尚无本次成功交付';
    node('deliveryThumbnail').hidden=true;node('deliveryThumbnailMissing').hidden=true;
  }
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
  async function refresh(){if(acceptCheck?.waiting&&currentCheck(acceptCheck))return readAcceptStatus(acceptCheck);resources=(await rpc('resources')).resources;if(importerCurrent)presentCurrent();render();}
  function render() {
    const list = node('deliveryList'); list.replaceChildren();
    if (!resources.length) { const p = document.createElement('p'); p.textContent = '尚无交付资源。回到效果制作，使用“导出素材包”。'; list.append(p); }
    for (const r of [...resources].reverse()) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'delivery-resource fw-button';
      const title = document.createElement('b'); title.textContent = r.name;
      const detail = document.createElement('small'); detail.textContent = r.revisionId.slice(0,8) + ' · ' + r.packages.map(p=>p.platform==='mobile'?'手机':p.platform.toUpperCase()).join(' / ') + (r.latestExport?' · ZIP v'+String(r.latestExport.sequence).padStart(3,'0'):'');
      const result = document.createElement('small'); result.textContent = queuedDelivery?.deliveryId === r.deliveryId ? `排队中：等导入器处理完「${queuedDelivery.behind}」` : r.importReceipt ? '导入记录：' + [...new Set(r.importReceipt.rows.map(x=>importLabel(x.state)))].join(' / ') : '资源已交付 · 待导入检查';     // 4.9.69 排队的那份写明
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
    node('deliveryCheck').disabled = importerBusy || exportFailedState || !session?.importerAvailable;
  }
  async function select(receipt) {
    stopAcceptObservation();const epoch=++selectionEpoch;
    const previous=last;desiredDeliveryId=receipt.deliveryId;last=receipt;
    const result=await sendToImporter();
    if(epoch!==selectionEpoch||result?.stale)return result;
    if(result?.queued||result?.failed){desiredDeliveryId='';last=previous;presentCurrent();render();}
    else {exportFailedState=false;updateRootControls();presentReceipt(receipt);}
  }
  function presentCurrent() {
    if(exportFailedState){presentExportFailure();return;}
    const current=importerCurrent,receipt=current&&resources.find(r=>r.deliveryId===current.deliveryId);
    if(desiredDeliveryId&&current?.deliveryId!==desiredDeliveryId)return;
    if(current?.deliveryId===desiredDeliveryId)desiredDeliveryId='';
    if(queuedDelivery&&current?.deliveryId===queuedDelivery.deliveryId){queuedDelivery=null;message('已接入导入清单。核对名称与处理方式后确认导入。');}     // 4.9.69 导入器接手了排队的那份
    if(receipt){presentReceipt(receipt);}
    else if(current){last=null;node('deliveryTitle').textContent=current.name||'其他素材';node('deliveryContext').textContent=`手动素材 · 当前 ${current.platform==='mobile'?'手机':'PC'} 包`;node('deliveryReceipt').textContent=`手动素材\n${current.dir||''}\n请使用下方原导入工作区检查此素材包。`;node('deliveryThumbnail').hidden=true;node('deliveryThumbnailMissing').hidden=true;node('deliveryCheck').disabled=true;}
  }
  async function sendToImporter() {
    if(!last||!session?.importerAvailable)return;
    const receipt=last,id=receipt.deliveryId,known=acceptChecks.get(id);
    if(known){
      if(!known.waiting&&!known.disposed)return known.completion;
      known.disposed=false;known.epoch=selectionEpoch;acceptCheck=known;
      unknownCheck(known);await readAcceptStatus(known);return{unknown:true};
    }
    stopAcceptObservation();
    const op={id,receipt,epoch:selectionEpoch,attempts:0,disposed:false,resolved:false,waiting:false,watch:{}};
    acceptCheck=op;acceptChecks.set(id,op);
    op.watch.late=(value,error)=>finishAccept(op,value,error);
    op.completion=(async()=>{
      try{return finishAccept(op,await rpc('accept',{deliveryId:id},30000,op.watch));}
      catch(e){
        if(e.code==='DELIVERY_OBSERVER_CANCELLED')return{unknown:true,stale:true};
        if(e.code==='DELIVERY_RPC_TIMEOUT'){op.waiting=true;unknownCheck(op);scheduleCheck(op);return{unknown:true};}
        return finishAccept(op,null,e);
      }
    })();
    return op.completion;
  }
  async function publish(blob,name,metadata){
    if(busyDelivery)throw Error('正在交付另一份资源，请等待完成');busyDelivery=true;
    updateRootControls();
    try{
      show(true);await connect();message('正在写入并校验完整资源…');
      if(typeof exportClockMark==='function')exportClockMark('写入交付目录（本机服务）');     // 4.9.72 计时
      const receipt=await rpc('publish',{blob,name,metadata},120000);
      if(typeof exportClockMark==='function')exportClockMark('导入器接收 + 检查');
      await select(receipt);prepared=true;return receipt;
    }catch(e){connectionError(e);message('交付失败：'+e.message+'。现有修订保留，可重试导出。',true);throw e;}
    finally{busyDelivery=false;updateRootControls();}
  }
  function init(){
    window.addEventListener('message',e=>{
      const data=e.data;if(e.source!==node('deliveryFrame').contentWindow||(localUI?!['null','file://'].includes(e.origin):e.origin!==frameOrigin)||data?.channel!==channel)return;
      if(data.type==='workspace-host-ready'){hostReady=true;node('deliveryFrame').hidden=false;node('deliveryLoading').hidden=true;updateRootControls();if(readyWait){clearTimeout(readyWait.timer);readyWait.resolve();readyWait=null;}return;}
      if(data.type==='workspace-host-response'){
        const pending=requests.get(data.id);if(!pending)return;requests.delete(data.id);clearTimeout(pending.timer);
        const error=data.ok?null:Error(data.error||'本机交付请求失败');
        if(pending.timedOut&&pending.late)pending.late(data.value,error);
        else if(data.ok)pending.resolve(data.value);else pending.reject(error);return;
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
    window.addEventListener('pagehide',stopAcceptObservation);
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
  // 4.9.69 导出拦截用：交付目录里已有资源的贴图（文件名 → 内容 SHA256、来自哪个效果），按名字查撞名
  // 4.9.72 导出计时等附加说明：接在状态行后面（不盖掉排队 / 检查的提示）
  function note(text){const n=node('deliveryStatus');if(!n||!text)return;n.textContent=(n.textContent?n.textContent+'\n':'')+text;}
  function knownTextures(){const m=new Map();for(const r of [...(resources||[])].reverse())for(const f of r.files||[]){if(!/\.png$/i.test(f.path||''))continue;const k=f.path.replace(/^.*\//,'');if(!m.has(k))m.set(k,{sha256:f.sha256,resource:r.name,sourceKey:(r.metadata||{}).sourceKey||'',iterationOf:r.metadata?.iterationOf||null});}return m;}
  return{init,open,publish,destination,beginExport,finishExport,exportFailed,knownTextures,note,get active(){return active;}};
})();

function deliveryClassification(recipe, plan, spec) {
  const parameters=recipe.kind==='combo'?(recipe.layers||[]).map(l=>l.P||{type:l.type}):[recipe.P||{}];
  const tail=parameters.length>0&&parameters.every(p=>familyOf(p.type)==='rise');
  const sizes={tailS:'small',tailM:'medium',tailL:'large'};
  let size=plan?.spec&&['small','medium','large'].includes(spec?.kind)?spec.kind:'unclassified';
  // 4.9.80（对话框手游编排 10-12 23:14 请 23 修）：尾缀档 kind = trail，按开花高度分大小（≤ 150 小、≤ 210 中、更高大；XS / S80 → 小、Hero → 大），以前全落「尾缀 / 未分类」
  if(size==='unclassified'&&plan?.spec&&plan.spec.what==='height'&&+plan.spec.target>0){const h=+plan.spec.target;size=h<=150?'small':h<=210?'medium':'large';}
  if(size==='unclassified'&&tail&&!plan?.spec){const values=new Set(parameters.map(p=>sizes[p.type]||'unclassified'));if(values.size===1)size=[...values][0];}
  return {category:tail?'tail':'firework',size};
}
function deliveryMetadata(b = null, job = null, lb = null, unitHolder = null) {
  if (typeof exportClockMark === 'function') exportClockMark('缩略图（引擎回放截一帧）');
  const comboPlan = () => { const sk = typeof sizeSpecCombo === 'function' ? sizeSpecCombo(state.layers) : null; return { k: sk ? sk.k : 1, keep: false, spec: sk || null, sfx: '' }; };
  const result = job ? structuredClone(job.metadata) : { bakerVersion: VERSION, sourceKey: wbKey(), recipe: wbSnap(), duration: curDuration(), sizePlan: !b && state.tab === 'combo' ? comboPlan() : typeof exportScalePlan === 'function' ? exportScalePlan(state.P) : null };
  if (!job) result.classification = deliveryClassification(result.recipe, result.sizePlan, typeof sizeSpecOf === 'function' ? sizeSpecOf() : null);
  if (!job && typeof delivImportScopeMeta === 'function') { const scope = delivImportScopeMeta(); if (scope) result.importScope = scope; }     // 4.9.115 导入范围（有导出任务时已在 job.metadata 里）
  result.artifactDuration = b ? bakeTotal(b) : lb ? Math.max(.5, ...lb.map(x => (+x.L.delay || 0) + bakeTotal(x.b) / (+x.L.rate || 1))) : comboContentEnd();
  result.boundsM = b ? { width: b.meta.Ww * (result.sizePlan?.k || 1), height: b.meta.Wh * (result.sizePlan?.k || 1) } : null;
  // Only synchronous rendering sees this temporary view. No global is held across await.
  const keys = ['t','view','disp','bake','tab','dirty','stillBusy','platform','P','M','layers','lib','comboName','layerView','layerQueue','exportUnitHolder'];
  const saved = keys.map(k => [k, Object.hasOwn(state, k), state[k]]);
  try {
    if (job) {
      state.P = structuredClone(job.P); state.M = structuredClone(job.M); state.comboName = job.comboName;
      state.exportUnitHolder = unitHolder; state.layerView = { solo: -1, mute: [] };
      if (lb) {
        state.layers = lb.map((x, i) => ({ ...structuredClone(x.L), lib: '__export_' + i }));
        state.lib = lb.map((x, i) => ({ ...x.e, name: '__export_' + i, P: x.b.P, bake: x.b }));
        state.layerQueue = new Set(state.lib); // thumbnail must not enqueue UI rebakes
      }
    }
    state.stillBusy = true; state.view = 'export'; state.disp = 'fit'; state.platform = 'pc'; state.dirty = false;
    if (b) { state.bake = b; state.tab = 'master'; state.t = engineTick((b.meta.t0 || 0) + b.meta.duration * .45); }
    else { state.tab = 'combo'; state.t = engineTick(result.artifactDuration * .45); }
    ensureTargets(); if (b) renderExport(); else renderCombo();
    const thumbnail = document.createElement('canvas'); thumbnail.width = 320; thumbnail.height = 240;
    const ctx = thumbnail.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 320, 240);
    const k = Math.min(320 / canvas.width, 240 / canvas.height); ctx.drawImage(canvas, (320 - canvas.width * k) / 2, (240 - canvas.height * k) / 2, canvas.width * k, canvas.height * k);
    result.thumbnailData = thumbnail.toDataURL('image/png'); result.thumbnailTime = state.t;
  } catch (e) { result.thumbnailError = e.message; }
  finally { for (const [k, had, value] of saved) { if (had) state[k] = value; else delete state[k]; } }
  return result;
}


async function deliverResource(blob, name, metadata, destination) {
  const iterationOf = typeof packIterationInfo !== 'undefined' ? packIterationInfo.get(blob) : null;
  if (iterationOf) metadata = { ...metadata, iterationOf: { ...structuredClone(iterationOf), deliveryName: name.replace(/\.zip$/i, '') } };
  if (destination === 'zip') return download(blob,name);
  return DeliveryWorkspace.publish(blob,name,metadata);
}
document.addEventListener('DOMContentLoaded',()=>DeliveryWorkspace.init());
