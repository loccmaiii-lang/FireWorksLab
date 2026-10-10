// Isolated same-document contracts; no browser, disk resources or UE writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/js/67_delivery.js'),'utf8');
function fixture({protocol='file:',motion=false,reduced=false,offline=false,directoryOffline=false,queued=false,acceptFailure=false}={}){
  const nodes=new Map(),calls=[],listeners={};let channel='',failure=offline;
  const receipt={deliveryId:'known',name:'Test',revisionId:'12345678',directory:'trusted-root/Test',files:[],packages:[{platform:'pc'}],thumbnail:{status:'missing'}};
  const origin='http://127.0.0.1:8034';
  const emit=(data,source=frame,from=protocol==='file:'?'null':origin)=>listeners.message?.({data,source,origin:from});
  const frame={postMessage(request,target){calls.push({command:request.command,target,payload:request.payload});if(failure)return;
    const value=({session:{outputRoot:'trusted-root',importerAvailable:true},resources:{resources:[]},publish:receipt,accept:{queued},'focus.restore':{}})[request.command]||{};
    if(request.command==='publish')queueMicrotask(()=>emit({type:'workspace-host-resources',channel:request.channel,resources:[receipt]}));
    queueMicrotask(()=>emit({type:'workspace-host-response',channel:request.channel,id:request.id,ok:!((directoryOffline&&request.command==='resources')||(acceptFailure&&request.command==='accept')),error:'检查服务不可用',value}));}};
  function node(id){if(!nodes.has(id))nodes.set(id,{id,hidden:false,inert:false,disabled:false,value:'original-value',dataset:{},listeners:{},attrs:{},classList:{toggle(){}},
    addEventListener(type,fn){this.listeners[type]=fn},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]||null},focus(){calls.push({focus:id})},append(...children){for(const child of children)child.parentNode=this},insertBefore(child){child.parentNode=this},replaceChildren(){},
    getBoundingClientRect(){return{height:50}},querySelector(){return node('summary')}});return nodes.get(id)}
  node('deliveryFrame').contentWindow=frame;node('busy').parentNode=node('progressHome');node('busy').nextSibling=null;
  Object.defineProperty(node('deliveryFrame'),'src',{set(value){calls.push({src:value});this.attrs.src=value;channel=new URL(value,'file:///repo/tool/FireworkBaker.html').hash.slice(1);if(!failure)queueMicrotask(()=>emit({type:'workspace-host-ready',channel}))}});
  node('deliveryWorkspace').hidden=true;
  if(motion)for(const id of ['main','deliveryWorkspace'])node(id).animate=(_,options)=>{calls.push({animation:id,duration:options.duration});return{cancel(){calls.push({cancel:id})}}};
  const ctx=vm.createContext({document:{getElementById:node,querySelector:node,createElement:node,addEventListener(){},documentElement:{style:{setProperty(){}}}},location:{protocol,href:protocol==='file:'?'file:///repo/tool/FireworkBaker.html':origin+'/baker',hash:'',origin:protocol==='file:'?'null':origin},
    window:{matchMedia:()=>({matches:reduced}),addEventListener(type,fn){listeners[type]=fn},open(){throw Error('No new window is permitted')},close(){throw Error('No closing the maker')}},
    localStorage:new Proxy({},{get(){throw Error('No storage migration')}}),fetch(){throw Error('Only embedded HTTP host can call directory APIs')},crypto:{randomUUID},URL,Blob,TextEncoder,Uint8Array,DataView,
    setTimeout: (fn,ms)=>setTimeout(fn,offline?Math.min(ms,20):ms),clearTimeout,ResizeObserver:class{observe(){}}});
  vm.runInContext(source,ctx);const api=vm.runInContext('DeliveryWorkspace',ctx);api.init();
  return{api,node,calls,receipt,state(data,source,from){emit({type:'workspace-host-state',channel,...data},source,from)},recover(){failure=false;emit({type:'workspace-host-ready',channel})}};
}
async function run(){
  let f=fixture();await f.api.open();assert.equal(f.node('deliveryWorkspace').hidden,false);assert.equal(f.node('main').inert,true);assert.match(f.calls.find(x=>x.src).src,/local_delivery\/runtime\/importer.html#/);console.log('PASS file entry stays in the maker document');
  f.node('deliveryMake').listeners.click();await f.api.open();assert.equal(f.calls.filter(x=>x.command==='resources').length,1);assert.equal(f.calls.filter(x=>x.src).length,1);assert.equal(f.node('main').value,'original-value');console.log('PASS repeated navigation retains maker values and one importer instance');
  f.state({busy:true,current:null});assert.equal(f.node('deliveryMake').disabled,false);f.node('deliveryMake').listeners.click();assert.equal(f.node('main').inert,false);assert.equal(f.node('deliveryPick').disabled,true);console.log('PASS return to maker remains available during native work');
  f.state({busy:false}, {}, 'https://evil.example');assert.equal(f.node('deliveryPick').disabled,true);console.log('PASS forged host events cannot change native task guards');
  f=fixture({protocol:'http:',motion:true});await f.api.open();f.node('deliveryMake').listeners.click();await f.api.open();assert.equal(f.calls.filter(x=>x.cancel).length,2);assert(f.calls.some(x=>x.command==='focus.restore'));console.log('PASS interruptible motion and host-owned focus restore');
  f=fixture({motion:true,reduced:true});await f.api.open();f.node('deliveryMake').listeners.click();assert.equal(f.calls.filter(x=>x.animation).length,0);console.log('PASS reduced motion preserves the same view behavior');
  f=fixture({offline:true});await f.api.open();assert.equal(f.node('deliveryRetry').hidden,false);assert.equal(f.node('deliveryWorkspace').hidden,false);f.node('deliveryMake').listeners.click();assert.equal(f.node('main').inert,false);f.recover();await f.node('deliveryRetry').listeners.click();assert.equal(f.node('deliveryRetry').hidden,true);assert.equal(f.node('main').value,'original-value');console.log('PASS cold service failure has in-place retry and a working maker return');
  f=fixture({directoryOffline:true});await f.api.open();assert.equal(f.node('deliveryFrame').hidden,false);assert.equal(f.node('deliveryWorkspace').hidden,false);assert.match(f.calls.find(x=>x.src).src,/local_delivery\/runtime\/importer.html#/);console.log('PASS directory outage leaves the actual local importer visible');
  console.log('8 single-document navigation contracts passed.');
}
module.exports={fixture};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
