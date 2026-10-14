// 只读 GPUECli 请求（写法照 analysis/scripts/workbench_engine_acceptance.mjs 的 request()），路由白名单，不含任何写入路由。
import http from 'node:http';
const ALLOW=new Set(['/datatable/search','/datatable/rows','/object/get','/object/search','/object/call']);
const CALL_ALLOW=new Set(['LoadAsset','DoesAssetExist','ListAssets']); // 均为 EditorAssetLibrary 只读函数
export function request(route,payload,timeout=60000){
 if(!ALLOW.has(route))throw Error('只读白名单外的路由：'+route);
 if(route==='/object/call'&&!CALL_ALLOW.has(payload.function))throw Error('只读白名单外的函数：'+payload.function);
 return new Promise((resolve,reject)=>{
  const body=Buffer.from(JSON.stringify(payload));
  const q=http.request('http://127.0.0.1:17780/gpcli'+route,{agent:false,method:'POST',headers:{'Content-Type':'text/plain','Content-Length':body.length}},r=>{
   let text='';r.setEncoding('utf8');r.on('data',c=>text+=c);r.on('end',()=>{try{const value=JSON.parse(text);if(r.statusCode!==200||value.success===false)throw Error(value.message||text.slice(0,300));resolve(value.data??value)}catch(e){reject(e)}});
  });q.on('error',reject);q.setTimeout(timeout,()=>q.destroy(Error('UE读取超时')));q.end(body);
 });
}
