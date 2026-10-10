// 4.9.60: final ZIP bytes are published by the local directory service; UE writes remain in the original importer.
const DeliveryWorkspace = (() => {
  let session = null, resources = [], last = null, active = false, busyDelivery = false, importerBusy = false, importerCurrent = null;
  const node = id => document.getElementById(id);
  const message = (text, error = false) => { const n = node('deliveryStatus'); n.textContent = text; n.dataset.error = String(error); };
  const destination = () => node('deliveryDestination').value;
  const importLabel = state => ({ready:'检查通过，待确认',conflict:'检查冲突，需处理',error:'检查失败',done:'导入已报告完成',partial:'部分完成',checking:'检查中',queued:'待检查',pending:'待检查',importing:'导入中',stopped:'已停止',saved:'UE 已报告保存'}[state] || '状态待核对');
  const api = async (path, body, contentType = 'application/json') => {
    const response = await fetch(path, body === undefined ? {} : { method: 'POST', headers: {'Content-Type': contentType, 'X-Workspace-Token': session?.token || ''}, body: contentType === 'application/json' ? JSON.stringify(body) : body });
    const data = await response.json(); if (!response.ok) throw Error(data.error || '本机服务请求失败'); return data;
  };
  async function connect() {
    if (!/^https?:$/.test(location.protocol)) throw Error('请启动 tool/local_delivery/start.cmd，并打开 http://127.0.0.1:8034/baker');
    session = await api('/api/session'); node('deliveryRoot').value = session.outputRoot || '';
    node('deliveryFrame').hidden = !session.importerAvailable;
    node('deliveryImporterMissing').hidden = session.importerAvailable;
    if (session.importerAvailable && !node('deliveryFrame').getAttribute('src')) node('deliveryFrame').src = '/importer';
    return session;
  }
  function show(open) {
    active = open; document.querySelector('.app').classList.toggle('delivery-active',open); node('deliveryWorkspace').hidden = !open;
    node('main').inert = open; node('main').setAttribute('aria-hidden', String(open));
    node('deliveryOpen').hidden = open; node('deliveryMake').hidden = !open;
    const focus = node(open?'deliveryWorkspace':'deliveryOpen'); focus.focus({preventScroll:true});
  }
  async function open() { show(true);message('正在恢复资源与导入工作区…');try { await connect(); await refresh(); if(!last && !importerCurrent && resources.length)await select(resources[resources.length-1]); else if(last)await sendToImporter();else if(importerCurrent)message('已恢复当前素材。请使用下方导入工作区检查、核对并确认名称。');if(!last && !importerCurrent)message(session.outputRoot?'已恢复导出目录。选择已交付修订，或回效果制作导出新资源。':'首次使用请先选择资源导出目录。'); } catch(e) { message(e.message, true); } }
  async function refresh() { resources = (await api('/api/resources')).resources; if(importerCurrent)presentCurrent();render(); }
  function render() {
    const list = node('deliveryList'); list.replaceChildren();
    if (!resources.length) { const p = document.createElement('p'); p.textContent = '尚无交付资源。回到效果制作，使用“导出素材包”。'; list.append(p); }
    for (const r of [...resources].reverse()) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'delivery-resource fw-button';
      const title = document.createElement('b'); title.textContent = r.name;
      const detail = document.createElement('small'); detail.textContent = r.revisionId.slice(0,8) + ' · ' + r.packages.map(p=>p.platform.toUpperCase()).join(' / ');
      const result = document.createElement('small'); result.textContent = r.importReceipt ? '导入记录：' + [...new Set(r.importReceipt.rows.map(x=>importLabel(x.state)))].join(' / ') : '资源已交付 · 待导入检查';
      button.append(title, detail, result); button.setAttribute('aria-pressed', String(last?.deliveryId === r.deliveryId));
      button.disabled=importerBusy; button.addEventListener('click', ()=>{if(!importerBusy)select(r).then(()=>node('deliveryOptions').open=false).catch(e=>message(e.message,true));}); list.append(button);
    }
  }
  function presentReceipt(receipt) {
    last = receipt; render();
    node('deliveryTitle').textContent=receipt.name;
    node('deliveryContext').textContent=`修订 ${receipt.revisionId.slice(0,8)} · ${receipt.packages.map(p=>p.platform==='mobile'?'手机':'PC').join(' / ')} · ${receipt.files.length} 个文件`;
    node('deliveryReceipt').textContent = `${receipt.name} · 修订 ${receipt.revisionId}\n${receipt.directory}\n${receipt.files.length} 个文件，${receipt.packages.length} 份平台配置。原文件已校验；UE 状态见下方导入清单。`;
    const img = node('deliveryThumbnail'); img.hidden = receipt.thumbnail.status !== 'ready';
    if (!img.hidden) img.src = '/api/deliveries/' + receipt.deliveryId + '/' + receipt.thumbnail.file;
    node('deliveryThumbnailMissing').hidden = !img.hidden;
    node('deliveryCheck').disabled = importerBusy || !session?.importerAvailable;
  }
  async function select(receipt) {
    presentReceipt(receipt);
    await sendToImporter();
  }
  function presentCurrent() {
    const current=importerCurrent,receipt=current&&resources.find(r=>r.deliveryId===current.deliveryId);
    if(receipt){presentReceipt(receipt);node('deliveryContext').textContent=`修订 ${receipt.revisionId.slice(0,8)} · 当前 ${current.platform==='mobile'?'手机':'PC'} 包`;}
    else if(current){last=null;node('deliveryTitle').textContent=current.name||'其他素材';node('deliveryContext').textContent=`手动素材 · 当前 ${current.platform==='mobile'?'手机':'PC'} 包`;node('deliveryReceipt').textContent=`手动素材\n${current.dir||''}\n请使用下方原导入工作区检查此素材包。`;node('deliveryThumbnail').hidden=true;node('deliveryThumbnailMissing').hidden=true;node('deliveryCheck').disabled=true;}
  }
  async function sendToImporter() {
    if (!last || !session?.importerAvailable) return;
    try {
      const frame = node('deliveryFrame').contentWindow;
      if (!frame.FwDeliveryBridge) { message('资源已保存，正在打开导入工作区…'); return; }
      const result = await frame.FwDeliveryBridge.accept(last);
      message(result.queued ? '资源已保存；当前检查或编辑结束后自动接收。' : '已接入导入清单。请核对检查结果与名称，点击下方原导入按钮执行。');
    } catch(e) { message('资源已保存；导入检查未完成：' + e.message, true); }
  }
  async function publish(blob, name, metadata) {
    if (busyDelivery) throw Error('正在交付另一份资源，请等待完成');
    busyDelivery = true;
    try {
      show(true); await connect();
      if (!session.outputRoot) throw Error('请先在资源交付区选择导出目录，再回制作页导出');
      message('正在写入并校验完整资源…');
      const json = new TextEncoder().encode(JSON.stringify(metadata || {})), count = new Uint8Array(4);
      new DataView(count.buffer).setUint32(0, json.length, true);
      const receipt = await api('/api/deliveries?name=' + encodeURIComponent(name), new Blob([count,json,blob]), 'application/vnd.fireworkslab.delivery');
      await refresh(); await select(receipt); return receipt;
    } catch(e) { message('交付失败：' + e.message + '。现有修订保留，可重试导出。', true); throw e; }
    finally { busyDelivery = false; }
  }
  function init() {
    node('deliveryWorkspace').addEventListener('keydown',e=>e.stopPropagation());
    document.querySelector('.delivery-nav').addEventListener('keydown',e=>{if(active)e.stopPropagation();});
    node('deliveryOpen').addEventListener('click', open); node('deliveryMake').addEventListener('click', ()=>show(false));
    node('deliveryRefresh').addEventListener('click', ()=>refresh().catch(e=>message(e.message,true)));
    node('deliveryCheck').addEventListener('click', ()=>sendToImporter());
    node('deliveryFrame').addEventListener('load', sendToImporter);
    for (const [id, picker] of [['deliveryPick',true],['deliverySaveRoot',false]]) node(id).addEventListener('click', async()=>{
      const button=node(id); button.disabled=true;
      try { const requested=node('deliveryRoot').value; await connect(); const root=await api(picker?'/api/output-root/pick':'/api/output-root',picker?{}:{outputRoot:requested}); session.outputRoot=root.outputRoot; node('deliveryRoot').value=root.outputRoot||''; await refresh(); message(root.cancelled?'已取消，原目录保留。':'目录已保存，之后导出直接写入此目录。'); }
      catch(e) { message(e.message,true); } finally { button.disabled=false; }
    });
    new ResizeObserver(()=>document.documentElement.style.setProperty('--delivery-top',document.querySelector('header.top').getBoundingClientRect().height+'px')).observe(document.querySelector('header.top'));
    node('deliveryOptions').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();node('deliveryOptions').open=false;node('deliveryOptions').querySelector('summary').focus();}});
    window.addEventListener('message', async e=>{
      if (e.origin!==location.origin||e.source!==node('deliveryFrame').contentWindow) return;
      if(e.data?.type==='workspace-view-state'){
        importerBusy=!!e.data.busy;node('deliveryMake').disabled=importerBusy;
        for(const id of ['deliveryPick','deliverySaveRoot','deliveryCheck','deliveryDestination'])node(id).disabled=importerBusy;
        importerCurrent=e.data.current||null;presentCurrent();
        render();return;
      }
      if(e.data?.type!=='workspace-import-state')return;
      for (const [id,state] of Object.entries(e.data.receipts||{})) try { await api('/api/import-receipts/'+id,state); } catch(error) { message('导入记录保存失败：'+error.message,true); }
      try { await refresh(); } catch(error) { message(error.message,true); }
    });
  }
  return {init,open,publish,destination};
})();

function deliveryMetadata(b = null) {
  const result = {bakerVersion:VERSION, sourceKey:wbKey(), recipe:wbSnap(), duration:curDuration(), sizePlan:typeof exportScalePlan==='function'?exportScalePlan(state.P):null};
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
