// Opaque file-origin export relay. Mock windows/API only: no browser/file access or UE.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/js/67_delivery.js'),'utf8');
const origin='http://127.0.0.1:8034';
function boot(protocol,hash=''){
 const nodes=new Map(),events={},docEvents={},calls=[],posted=[],timeouts=new Map();let nextTimer=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,value:id==='deliveryDestination'?'directory':'',hidden:false,dataset:{},listeners:{},classList:{toggle(){}},addEventListener(k,f){this.listeners[k]=f;},setAttribute(){},getAttribute(){return null;},focus(){},append(){},replaceChildren(){},getBoundingClientRect(){return{height:50}},querySelector(){return node('summary')}});return nodes.get(id)};
 const child={closed:false,focus(){calls.push('focus')},postMessage(data,target){posted.push({data,target})}},opener={postMessage(data,target){posted.push({data,target})},focus(){}};
 const receipt={deliveryId:'new-rev',name:'Example',revisionId:'abcdef01',directory:'test-root/new-rev',packages:[{platform:'pc'}],files:[],thumbnail:{status:'missing'}};
 const context=vm.createContext({document:{getElementById:node,querySelector:node,createElement:node,addEventListener(k,f){docEvents[k]=f},documentElement:{style:{setProperty(){}}}},
 location:{protocol,hash,origin:protocol==='file:'?'null':origin},window:{opener:protocol==='http:'?opener:null,addEventListener(k,f){events[k]=f},open(url){calls.push({open:url});return child},close(){}},
 Blob,TextEncoder,Uint8Array,DataView,crypto:require('node:crypto').webcrypto,ResizeObserver:class{observe(){}},setTimeout(f){timeouts.set(++nextTimer,f);return nextTimer},clearTimeout(n){timeouts.delete(n)},
 localStorage:new Proxy({},{get(){throw Error('No parent storage migration')}}),
 fetch:async(url,opt)=>{assert.equal(protocol,'http:','File parent never reads HTTP APIs');calls.push({url,opt});return{ok:true,json:async()=>url==='/api/session'?{token:'child-only',outputRoot:'test-root',importerAvailable:false}:url==='/api/resources'?{resources:[]}:url.startsWith('/api/deliveries?')?receipt:assert.fail(url)}}});
 vm.runInContext(source,context);const api=vm.runInContext('DeliveryWorkspace',context);api.init();
 return{api,node,events,docEvents,calls,posted,child,opener,receipt,timeouts};
}
const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
 let f=boot('file:');f.docEvents.click({target:{closest(){return{id:'dvExport'}}}});
 assert.equal(f.calls[0].open,origin+'/baker#delivery-export-from-file');
 const blob=new Blob(['fixture-zip']),run=f.api.publish(blob,'Example.zip',{recipe:{name:'Example'}});await flush();
 assert.equal(f.posted.at(-1).data.type,'workspace-export-handshake');const id=f.posted.at(-1).data.id;
 await f.events.message({source:{},origin,data:{type:'workspace-export-ready',id}});
 assert.equal(f.posted.filter(p=>p.data.type==='workspace-export-publish').length,0);
 await f.events.message({source:f.child,origin:'https://wrong.invalid',data:{type:'workspace-export-ready',id}});
 assert.equal(f.posted.filter(p=>p.data.type==='workspace-export-publish').length,0);
 await f.events.message({source:f.child,origin,data:{type:'workspace-export-ready',id}});
 assert.equal(f.posted.at(-1).data.blob,blob);assert.equal(f.posted.at(-1).target,origin);
 await f.events.message({source:f.child,origin,data:{type:'workspace-export-result',id,ok:true,receipt:f.receipt}});
 assert.equal((await run).deliveryId,'new-rev');assert.equal(f.calls.filter(x=>x.url).length,0);assert.equal(f.timeouts.size,0);
 console.log('PASS export click reserves/reuses child; pinned source+origin handshake publishes Blob without parent HTTP/storage');
 f=boot('file:');const early=f.api.publish(blob,'Example.zip',{});await flush();const earlyId=f.posted[0].data.id;
 await f.events.message({source:f.child,origin,data:{type:'workspace-export-ready'}});
 assert.equal(f.posted.at(-1).data.type,'workspace-export-publish');
 await f.events.message({source:f.child,origin,data:{type:'workspace-export-result',id:earlyId,ok:true,receipt:f.receipt}});await early;
 console.log('PASS child boot readiness receives an export completed before its message listener was ready');
 f=boot('http:','#delivery-export-from-file');await flush();
 const payload={type:'workspace-export-publish',id:'job-1',blob:new Blob(['fixture']),name:'Example.zip',metadata:{}};
 await f.events.message({source:{},origin:'null',data:payload});assert.equal(f.calls.filter(x=>x.opt?.method==='POST').length,0);
 await f.events.message({source:f.opener,origin:'https://wrong.invalid',data:payload});assert.equal(f.calls.filter(x=>x.opt?.method==='POST').length,0);
 await f.events.message({source:f.opener,origin:'null',data:payload});await flush();
 await f.events.message({source:f.opener,origin:'null',data:payload});await flush();
 const writes=f.calls.filter(x=>x.opt?.method==='POST');assert.equal(writes.length,1);assert.equal(writes[0].opt.headers['X-Workspace-Token'],'child-only');
 assert.equal(f.posted.at(-1).data.ok,true);assert.equal(f.posted.at(-1).data.receipt.deliveryId,'new-rev');
 assert(!JSON.stringify(f.posted).includes('child-only'));
 console.log('PASS HTTP child accepts only its opaque-origin opener; repeated job writes once, credentials stay in child');
 f=boot('file:');const fail=f.api.publish(new Blob(['fixture']),'Example.zip',{});await flush();[...f.timeouts.values()][0]();
 await assert.rejects(fail,/本机交付页/);assert.equal(f.node('main').inert,undefined);
 console.log('PASS unavailable child times out recoverably; maker and existing revisions stay intact');
 console.log('4 secure file export relay contracts passed; real file-browser integration remains untested.');
})().catch(e=>{console.error(e);process.exitCode=1});
