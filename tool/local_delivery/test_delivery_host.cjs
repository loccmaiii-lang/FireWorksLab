const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'delivery-host.js'),'utf8');
const channel='12345678-1234-4234-8234-123456789abc',origin='http://127.0.0.1:8034';
function fixture({ancestors=['null'],referrer='',parentOrigin='null',queued=false,local=false,offline=false}={}){
  const messages=[],calls=[],listeners={},accepted=[],contexts=[];let token='token-one';
  const receipt={deliveryId:'known',directory:'trusted-root',metadata:{},packages:[]};
  const bridge={accept:async r=>{accepted.push(r);return{queued}},state:()=>({})};
  const child={FwDeliveryBridge:bridge,FwDeliveryPresentation:{setContext:r=>contexts.push(r.deliveryId)},addEventListener(t,fn){listeners[t]=fn}};
  const parent={postMessage:(data,target)=>messages.push({data,target})};
  child.FwDirectoryApi=async path=>{if(offline)throw Error('目录服务离线');return path==='/api/session'?{outputRoot:'trusted-root'}:{resources:[receipt]};};
  const ctx=vm.createContext({window:child,parent,location:{protocol:local?'file:':'http:',origin:local?'null':origin,hash:'#'+channel,ancestorOrigins:ancestors},document:{referrer,addEventListener(){}},Blob,TextEncoder,DataView,Uint8Array,setTimeout,clearTimeout,
    fetch:async(url,opt)=>{calls.push({url,opt});const data=url==='/api/session'?{token,outputRoot:'trusted-root',importerAvailable:true}:url==='/api/resources'?{resources:[receipt]}:url.startsWith('/api/deliveries?')?receipt:{};return{ok:true,status:200,json:async()=>data}}});
  vm.runInContext(source,ctx);
  const send=async(command,payload={},id='r-'+messages.length,from=parentOrigin,who=parent)=>{await listeners.message({source:who,origin:from,data:{type:'workspace-host-request',channel,id,command,payload}});return messages.findLast(x=>x.data.id===id)?.data};
  return{send,messages,calls,accepted,contexts,child,receipt,rotate(){token='token-two'},native(data){return listeners.message({source:child,origin,data})}};
}
(async()=>{
  let f=fixture();let r=await f.send('session');assert.equal(r.ok,true);assert.equal(r.value.token,undefined);assert(!JSON.stringify(f.messages).includes('token-one'));console.log('PASS opaque direct file parent connects without receiving credentials');
  f=fixture({ancestors:['null','https://evil.example']});assert.equal(await f.send('session'),undefined);assert.equal(f.calls.length,0);console.log('PASS remote sandbox ancestry is rejected');
  f=fixture({ancestors:[origin],parentOrigin:origin,referrer:origin+'/baker'});await f.send('session');const original=f.child.FwDeliveryBridge;f.rotate();await f.send('session');assert.equal(f.child.FwDeliveryBridge,original);assert(!/\.src\s*=|location\.reload/.test(source));console.log('PASS reauthentication retains the original native importer without navigation');
  assert.equal(await f.send('session',{},'forged',origin,{}),undefined);assert.equal(await f.send('execute',{},'bad'),undefined);console.log('PASS source pinning and command allowlist do not expose UE execution');
  await f.send('resources');await f.send('accept',{deliveryId:'known',directory:'forged-root'});assert.equal(f.accepted[0].directory,'trusted-root');r=await f.send('accept',{deliveryId:'unknown'});assert.equal(r.ok,false);console.log('PASS acceptance uses indexed receipts instead of parent paths');
  const payload={blob:new Blob(['ZIP']),name:'Test',metadata:{}};await Promise.all([f.send('publish',payload,'one-publish'),f.send('publish',payload,'one-publish')]);assert.equal(f.calls.filter(x=>x.url.startsWith('/api/deliveries?')).length,1);console.log('PASS repeated publication messages write once');
  f=fixture({queued:true});await f.send('session');await f.send('resources');await f.native({type:'workspace-view-state',busy:true,current:{deliveryId:'older'}});await f.send('accept',{deliveryId:'known'});assert.equal(f.contexts.length,0);await f.native({type:'workspace-view-state',busy:false,current:{deliveryId:'known'}});assert.deepEqual(f.contexts,['known']);console.log('PASS queued export does not replace running identity and adopts its context later');
  await f.native({type:'workspace-import-state',receipts:{known:{rows:[]}}});assert.equal(f.calls.filter(x=>x.url==='/api/import-receipts/known').length,1);assert(f.messages.some(x=>x.data.type==='workspace-host-resources'));console.log('PASS original native receipts persist in the host and refresh parent resources');
  f=fixture({local:true,offline:true});r=await f.send('session');assert.equal(r.ok,true);assert.equal(r.value.importerAvailable,true);assert.match(r.value.directoryError,/离线/);assert.equal(f.calls.length,0);assert(f.child.FwDeliveryBridge);console.log('PASS local UI is ready even when directory transport is down');
  f=fixture({local:true,offline:true,parentOrigin:'file://',ancestors:['file://']});r=await f.send('session');assert.equal(r.ok,true);assert.equal(f.messages.at(-1).target,'*');console.log('PASS serialized file origin still uses wildcard reply with source/channel pinning');
  console.log('10 embedded host contracts passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
