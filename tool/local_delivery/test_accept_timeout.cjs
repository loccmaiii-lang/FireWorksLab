// N23-20261016-01: real delivery controller, fake time/RPC. No browser/UE/GPU.
const STAMP={sha256:'c'.repeat(64),mtime:'2026-10-19T12:01:00',file:'importer.html'};     // 4.9.119 交付页回报的导入器来源戳（和服务回报的一致 = 副本是新的）
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const source=fs.readFileSync(__dirname+'/../src/js/67_delivery.js','utf8');
async function flush(){for(let i=0;i<30;i++)await Promise.resolve();}
function fixture({delay=45000,business='',queryError='',silent=false}={}){
 let now=100000,next=0,channel='',accepts=0,reads=0;
 const timers=new Map(),listeners={},nodes=new Map(),calls=[];
 const set=(fn,ms)=>{const id=++next;timers.set(id,{fn,at:now+ms});return id;},clear=id=>timers.delete(id);
 async function tick(ms){const end=now+ms;await flush();while(true){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush();}now=end;await flush();}
 const A={deliveryId:'a',name:'Alpha',revisionId:'12345678',directory:'root/Alpha',files:[],packages:[{platform:'pc'}],thumbnail:{status:'missing'}};
 const B={...A,deliveryId:'b',name:'Beta',revisionId:'87654321'};
 const emit=d=>listeners.message?.({data:d,source:frame,origin:'null'});
 const frame={postMessage(q){calls.push(q);const reply=(ok,value,error)=>emit({type:'workspace-host-response',channel:q.channel,id:q.id,ok,value,error});
  if(q.command==='accept'){accepts++;if(silent)return;const wait=typeof delay==='function'?delay(q.payload.deliveryId):delay;set(()=>reply(!business,{queued:false},business),wait);return;}
  if(q.command==='resources'){reads++;queueMicrotask(()=>reply(!queryError,{resources:[A,B]},queryError));return;}
  const value=q.command==='session'?{outputRoot:'root',importerAvailable:true,importerSource:STAMP,loadedImporter:STAMP}:q.command==='publish'?A:{};
  queueMicrotask(()=>{if(q.command==='publish')emit({type:'workspace-host-resources',channel:q.channel,resources:[A,B]});reply(true,value)});
 }};
 function node(id){if(!nodes.has(id))nodes.set(id,{id,hidden:false,inert:false,disabled:false,value:'',dataset:{},attrs:{},listeners:{},children:[],textContent:'',
  classList:{toggle(){}},addEventListener(t,f){this.listeners[t]=f},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]||null},focus(){},
  append(...a){this.children.push(...a);for(const c of a)c.parentNode=this},replaceChildren(...a){this.children=a},
  insertBefore(c){c.parentNode=this},getBoundingClientRect(){return {height:50}},querySelector(){return node('summary')}});
  return nodes.get(id);
 }
 node('deliveryFrame').contentWindow=frame;node('busy').parentNode=node('home');
 Object.defineProperty(node('deliveryFrame'),'src',{set(v){this.attrs.src=v;channel=new URL(v,'file:///repo/tool/FireworkBaker.html').hash.slice(1);queueMicrotask(()=>emit({type:'workspace-host-ready',channel}))}});
 const ctx=vm.createContext({document:{getElementById:node,querySelector:node,createElement:t=>({ ...node('created-'+(++next)),listeners:{},children:[]}),addEventListener(){},documentElement:{style:{setProperty(){}}}},
  window:{addEventListener(t,f){listeners[t]=f},matchMedia:()=>({matches:true})},
  location:{protocol:'file:',href:'file:///repo/tool/FireworkBaker.html',origin:'null',hash:''},
  crypto:{randomUUID},URL,Blob,TextEncoder,Uint8Array,DataView,
  Date:class extends Date{static now(){return now}},setTimeout:set,clearTimeout:clear,ResizeObserver:class{observe(){}}});
 vm.runInContext(source,ctx);const api=vm.runInContext('DeliveryWorkspace',ctx);api.init();
 return {api,node,tick,A,B,calls,listeners,get accepts(){return accepts},get reads(){return reads},
  status(){return node('deliveryStatus').textContent},
  async start(){await flush();/* Select explicitly: initial restore may pick the latest resource. */node('deliveryList').children.find(n=>n.children?.[0]?.textContent==='Alpha')?.listeners.click();await flush();},
  async boot(){await flush();},
  async publish(){const p=api.publish(new Blob(),'Alpha',{});await flush();return {promise:p}},
  async choose(name){const b=node('deliveryList').children.find(n=>n.children?.[0]?.textContent===name);assert(b,'resource button '+name);b.listeners.click();await flush();}
 };
}
(async()=>{
 let f=fixture();await f.boot();const p=(await f.publish()).promise;await f.tick(30001);
 assert.match(f.status(),/仍在检查|结果未知/,'30s is not evidence of an offline importer');
 assert.doesNotMatch(f.status(),/没接进导入器|请启动/);assert.equal(f.accepts,1);
 await f.tick(15000);await p;assert.match(f.status(),/已接入/);assert.equal(f.accepts,1);
 console.log('PASS slow >30s success retains the original request and late response');
 f=fixture({silent:true,queryError:'本机交付服务未连接'});await f.boot();const unknown=(await f.publish()).promise;await f.tick(30001);await unknown;
 await f.node('deliveryRefresh').listeners.click();await flush();assert.equal(f.accepts,1);assert.match(f.status(),/结果未知/);assert.match(f.status(),/服务未连接|连接|不可达/);
 await f.node('deliveryCheck').listeners.click();await flush();assert.equal(f.accepts,1,'manual refresh/check only queries an unresolved accept');
 console.log('PASS disconnected read preserves unknown result, refresh never resends accept');
 f=fixture({delay:id=>id==='a'?80000:1});await f.boot();const old=(await f.publish()).promise;await f.tick(30001);await old;
 await f.choose('Beta');await f.tick(2);const status=f.status();assert.match(f.node('deliveryTitle').textContent,/Beta/);
 await f.tick(50000);assert.match(f.node('deliveryTitle').textContent,/Beta/);assert.equal(f.status(),status,'old result must not overwrite a new revision');
 console.log('PASS switching revisions rejects stale receipt presentation');
 f=fixture({delay:1,business:'材质名称冲突：CaseSensitive'});await f.boot();const bad=(await f.publish()).promise;await f.tick(2);await bad;
 assert.match(f.status(),/材质名称冲突：CaseSensitive/);assert.doesNotMatch(f.status(),/请启动/);const count=f.reads;await f.tick(20000);assert.equal(f.reads,count);
 console.log('PASS explicit business failure preserves its reason and starts no polling');
 f=fixture({silent:true});await f.boot();const leave=(await f.publish()).promise;await f.tick(30001);await leave;
 f.node('deliveryMake').listeners.click();const n=f.reads;await f.tick(60000);assert.equal(f.reads,n,'exit cleans scheduled polling');
 console.log('PASS exit stops read polling');
 f=fixture({silent:true});await f.boot();const hide=(await f.publish()).promise;await f.tick(30001);await hide;
 f.listeners.pagehide?.();const n2=f.reads;await f.tick(60000);assert.equal(f.reads,n2,'page disposal cleans read polling');
 console.log('PASS page disposal stops read polling');
 f=fixture({silent:true});await f.boot();const started=f.api.beginExport('directory');await f.tick(151);await started;
 const cancelled=(await f.publish()).promise;await f.tick(30001);await cancelled;f.api.exportFailed(Error('用户取消本次导出'));f.api.finishExport();
 const n3=f.reads;await f.tick(60000);assert.equal(f.reads,n3,'cancel/failure cleans polling');assert.match(f.status(),/用户取消本次导出/);assert.equal(f.accepts,1);
 console.log('PASS export cancellation/failure stops polling and preserves its reason');
 f=fixture({silent:true});await f.boot();const bounded=(await f.publish()).promise;await f.tick(90000);await bounded;
 const n4=f.reads;await f.tick(60000);assert.equal(f.reads,n4,'automatic read polling is bounded');assert.equal(f.accepts,1);
 console.log('PASS unknown-result automatic polling is bounded');
 console.log('8 accept deadline contracts passed (all fake time, no UE/GPU/browser).');
})().catch(e=>{console.error(e);process.exitCode=1;});
