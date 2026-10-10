// Local importer UI exists independently of this hidden directory-only transport.
(() => {
  if(location.protocol!=='file:')return;
  const origin='http://127.0.0.1:8034',channel=crypto.randomUUID(),pending=new Map();
  let frame=null,ready=false,waiting=null;
  function connect(){
    if(ready)return Promise.resolve();if(waiting)return waiting;
    waiting=new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{waiting=null;window.removeEventListener('message',receive);reject(Error('目录服务未运行，已有素材仍可在下方检查和导入；指定目录导出请启动 tool/启动烘焙器.cmd --no-browser 后重试。'));},2000);
      const receive=event=>{
        if(event.source!==frame.contentWindow||event.origin!==origin||event.data?.channel!==channel||event.data.type!=='directory-ready')return;
        clearTimeout(timeout);window.removeEventListener('message',receive);ready=true;waiting=null;resolve();
      };
      window.addEventListener('message',receive);
      // Recreate only the transport after a failed load; never reload the importer.
      frame?.remove();frame=document.createElement('iframe');frame.hidden=true;frame.title='目录传输';
      frame.src=origin+'/directory-transport#'+channel;document.body.append(frame);
    });return waiting;
  }
  window.addEventListener('message',event=>{
    const data=event.data;
    if(event.source!==frame?.contentWindow||event.origin!==origin||data?.channel!==channel||data.type!=='directory-response')return;
    const request=pending.get(data.id);if(!request)return;pending.delete(data.id);clearTimeout(request.timeout);
    if(data.ok)request.resolve(data.value);else{ready=false;request.reject(Error(data.error));}
  });
  window.FwDirectoryApi=async(path,body,contentType='application/json')=>{
    await connect();
    return new Promise((resolve,reject)=>{
      const id=crypto.randomUUID(),timeout=setTimeout(()=>{pending.delete(id);ready=false;reject(Error('目录服务未响应；资源写入可能仍在进行，请刷新修订后决定是否重导。'));},120000);
      pending.set(id,{resolve,reject,timeout});
      frame.contentWindow.postMessage({type:'directory-request',channel,id,path,body,contentType},origin);
    });
  };
})();
