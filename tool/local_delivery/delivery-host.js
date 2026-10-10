// Native importer adapter: local UI stays usable without directory service.
(() => {
  'use strict';
  const channel=location.hash.slice(1),localUI=location.protocol==='file:';
  const requests=new Map();
  let parentOrigin=null, session=null, resources=[], view={busy:false,current:null}, contextId='', focused=null;
  const commands=new Set(['session','resources','publish','accept','root.save','root.pick','focus.restore']);
  function trustedParent(event){
    if(event.source!==parent||!/^[-a-f0-9]{36}$/i.test(channel)||event.data?.channel!==channel)return false;
    if(parentOrigin!==null)return event.origin===parentOrigin;
    if(!localUI&&event.origin===location.origin)return true;
    // An opaque parent is accepted only as the direct local-file ancestor.
    const ancestors=Array.from(location.ancestorOrigins||[]);
    return ['null','file://'].includes(event.origin)&&!document.referrer&&ancestors.length===1&&['null','file://'].includes(ancestors[0]);
  }
  const post=data=>{if(parentOrigin!==null)parent.postMessage({channel,...data},['null','file://'].includes(parentOrigin)?'*':parentOrigin);};
  async function api(path,body,contentType='application/json',retry=true){
    if(localUI)return window.FwDirectoryApi(path,body,contentType);
    let response;
    try{response=await fetch(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':contentType,'X-Workspace-Token':session?.token||''},body:contentType==='application/json'?JSON.stringify(body):body});}
    catch(_){throw Error('本机交付服务未连接，请启动 tool/启动烘焙器.cmd 后在此页重试');}
    if(response.status===403&&body!==undefined&&retry){session=await api('/api/session');return api(path,body,contentType,false);}
    const data=await response.json();if(!response.ok)throw Error(data.error||'本机交付请求失败');return data;
  }
  function contextForCurrent(){
    const receipt=resources.find(r=>r.deliveryId===view.current?.deliveryId);
    if(receipt&&contextId!==receipt.deliveryId&&window.FwDeliveryPresentation){window.FwDeliveryPresentation.setContext(presentationReceipt(receipt));contextId=receipt.deliveryId;}
  }
  function presentationReceipt(receipt){
    const thumbnailURL=receipt.thumbnail?.status==='ready'?(localUI?'http://127.0.0.1:8034':location.origin)+'/api/deliveries/'+encodeURIComponent(receipt.deliveryId)+'/'+receipt.thumbnail.file.split('/').map(encodeURIComponent).join('/'):null;
    return{...receipt,thumbnailURL};
  }
  async function refresh(){resources=(await api('/api/resources')).resources;contextForCurrent();return{resources};}
  function importer(){if(!window.FwDeliveryBridge)throw Error('原导入工作区入口无效，请核对本机配置');return window;}
  async function command(name,payload){
    if(name==='session'){
      try{session=await api('/api/session');}
      catch(error){if(!localUI)throw error;session={importerAvailable:true,outputRoot:'',directoryError:error.message};}
      if(localUI)session.importerAvailable=true;
      if(session.importerAvailable){importer();
        if(typeof FwImporter!=='undefined'){const current=FwImporter.deliveryView();view={busy:!!current.busy,current:current.current||null};}}
      post({type:'workspace-host-state',...view});
      const {token,...publicSession}=session;return publicSession;
    }
    if(!session)throw Error('请先连接本机交付服务');
    if(name==='resources')return refresh();
    if(name==='focus.restore'){
      if(focused?.isConnected&&!focused.disabled)focused.focus({preventScroll:true});return{};
    }
    if(name==='root.save'||name==='root.pick'){
      if(view.busy)throw Error('当前导入任务结束后才能更改目录');
      const result=await api(name==='root.pick'?'/api/output-root/pick':'/api/output-root',name==='root.pick'?{}:{outputRoot:payload.outputRoot});session.outputRoot=result.outputRoot;return result;
    }
    if(name==='publish'){
      if(!(payload.blob instanceof Blob)||typeof payload.name!=='string')throw Error('交付资源请求无效');
      session={...await api('/api/session'),importerAvailable:localUI||session.importerAvailable};
      if(!session.outputRoot)throw Error('请先在资源交付区选择导出目录，再回制作页导出');
      const json=new TextEncoder().encode(JSON.stringify(payload.metadata||{})),count=new Uint8Array(4);
      new DataView(count.buffer).setUint32(0,json.length,true);
      const receipt=await api('/api/deliveries?name='+encodeURIComponent(payload.name),new Blob([count,json,payload.blob]),'application/vnd.fireworkslab.delivery');
      // Publication already returns a fully verified receipt. Do not rehash every historic package twice.
      resources=resources.filter(r=>r.deliveryId!==receipt.deliveryId);resources.push(receipt);
      post({type:'workspace-host-resources',resources});return receipt;
    }
    if(name==='accept'){
      if(!session.importerAvailable)return{unavailable:true};
      let receipt=resources.find(r=>r.deliveryId===payload.deliveryId);
      if(!receipt){await refresh();receipt=resources.find(r=>r.deliveryId===payload.deliveryId);}
      if(!receipt)throw Error('交付修订不在当前目录索引中，请刷新资源');
      const child=importer(),result=await child.FwDeliveryBridge.accept(receipt);
      if(!result.queued){child.FwDeliveryPresentation?.setContext(presentationReceipt(receipt));contextId=receipt.deliveryId;}
      return result;
    }
  }
  window.addEventListener('message',async event=>{
    if(event.source===window&&(localUI?['null','file://'].includes(event.origin):event.origin===location.origin)){
      const data=event.data;
      if(data?.type==='workspace-view-state'){view={busy:!!data.busy,current:data.current||null};contextForCurrent();post({type:'workspace-host-state',...view});}
      if(data?.type==='workspace-import-state'){
        try{
          // The native importer keeps history across roots. Only the active directory owns these receipts.
          const entries=Object.entries(data.receipts||{}).filter(([id])=>resources.some(r=>r.deliveryId===id));
          for(const [id,state] of entries)await api('/api/import-receipts/'+encodeURIComponent(id),state);
          if(entries.length)post({type:'workspace-host-resources',...await refresh()});
        }catch(error){post({type:'workspace-host-error',error:'导入记录保存失败：'+error.message});}
      }return;
    }
    const data=event.data;
    if(!trustedParent(event)||data?.type!=='workspace-host-request'||!commands.has(data.command)||typeof data.id!=='string'||data.id.length>100)return;
    parentOrigin=event.origin;
    // Only a publish request is retained: duplicate messages cannot publish twice.
    let pending=data.command==='publish'&&requests.get(data.id);
    if(!pending){pending=command(data.command,data.payload||{}).then(value=>({ok:true,value}),error=>({ok:false,error:error.message}));
      if(data.command==='publish'){requests.set(data.id,pending);if(requests.size>128)requests.delete(requests.keys().next().value);}}
    post({type:'workspace-host-response',id:data.id,...await pending});
  });
  document.addEventListener('focusin',event=>{focused=event.target;});
  // Readiness contains no session data. The maker pins this exact frame and origin.
  parent.postMessage({type:'workspace-host-ready',channel},'*');
})();
