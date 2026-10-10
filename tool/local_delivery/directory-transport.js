// Same-origin file API transport. No importer, rendering, UE commands or credentials in parent.
(() => {
  const channel=location.hash.slice(1),requests=new Map();let token='',pinned=null;
  function trusted(event){
    if(event.source!==parent||event.data?.channel!==channel||!/^[-a-f0-9]{36}$/i.test(channel))return false;
    if(pinned!==null)return event.origin===pinned;
    const ancestors=Array.from(location.ancestorOrigins||[]);
    return event.origin===location.origin||(['null','file://'].includes(event.origin)&&!document.referrer&&ancestors.length===2&&ancestors.every(x=>['null','file://'].includes(x)));
  }
  function allowed(path,body,contentType){
    if(typeof path!=='string')return false;
    if(body===undefined)return ['/api/session','/api/resources'].includes(path);
    if(contentType==='application/vnd.fireworkslab.delivery')return /^\/api\/deliveries\?name=[^#]*$/.test(path)&&body instanceof Blob;
    return contentType==='application/json'&&(['/api/output-root','/api/output-root/pick'].includes(path)||/^\/api\/import-receipts\/[a-f0-9-]+$/i.test(path));
  }
  async function api(path,body,contentType,retry=true){
    if(body!==undefined&&!token)await api('/api/session');
    let response;
    try{response=await fetch(path,{...(body===undefined?{}:{method:'POST',headers:{'Content-Type':contentType,'X-Workspace-Token':token},body:contentType==='application/json'?JSON.stringify(body):body})});}
    catch(_){throw Error('目录服务已断开；导入界面和当前清单保留。启动本机服务后重试目录操作。');}
    if(response.status===403&&body!==undefined&&retry){token='';return api(path,body,contentType,false);}
    const result=await response.json();if(!response.ok)throw Error(result.error||'目录请求失败');
    if(path==='/api/session'){token=result.token;const {token:secret,...publicSession}=result;return publicSession;}
    return result;
  }
  window.addEventListener('message',async event=>{
    const data=event.data;
    if(!trusted(event)||data?.type!=='directory-request'||typeof data.id!=='string'||data.id.length>100||!allowed(data.path,data.body,data.contentType))return;
    pinned=event.origin;
    let result=requests.get(data.id);
    if(!result){result=api(data.path,data.body,data.contentType).then(value=>({ok:true,value}),error=>({ok:false,error:error.message}));
      requests.set(data.id,result);if(requests.size>128)requests.delete(requests.keys().next().value);}
    parent.postMessage({type:'directory-response',channel,id:data.id,...await result},['null','file://'].includes(pinned)?'*':pinned);
  });
  parent.postMessage({type:'directory-ready',channel},'*');
})();
