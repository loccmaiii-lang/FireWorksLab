// 4.9.119（导出（23），用户 10-19 19:45 仙女棒手机包 Error 87「gpt……好像修错地方了」）：
// 文件入口的交付页加载本机副本 runtime/importer.html。副本比源文件旧（导入器修复只部署到源文件）时，
// 烘焙器要先让服务重新生成、把交付页重载一次；还旧就拦下导入并写清怎么修，不能悄悄跑旧导入器。
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/js/67_delivery.js'),'utf8');
const NEW={sha256:'b'.repeat(64),mtime:'2026-10-19T12:01:00',file:'df-fireworks-delivery_locmai.html'},OLD={sha256:'a'.repeat(64),mtime:'2026-10-18T01:50:00',file:'df-fireworks-delivery_locmai.html'};
function fixture({protocol='file:',loaded=[OLD,NEW],service=NEW,slow=0}={}){
  const nodes=new Map(),calls=[],listeners={};let channel='',loads=0;
  const origin='http://127.0.0.1:8034';
  const emit=(data,src=frame,from=protocol==='file:'?'null':origin)=>listeners.message?.({data,source:src,origin:from});
  const frame={postMessage(request){calls.push({command:request.command});
    const now=loaded[Math.min(loads-1,loaded.length-1)]||null;
    const value=({session:{outputRoot:'root',importerAvailable:true,importerSource:service,loadedImporter:now},resources:{resources:[]}})[request.command]||{};
    const page=loads,reply=()=>{calls.push({resp:request.command,page});emit({type:'workspace-host-response',channel:request.channel,id:request.id,ok:true,value});};
    calls[calls.length-1].page=page;if(slow&&request.command==='session')setTimeout(reply,slow);else queueMicrotask(reply);}};
  function node(id){if(!nodes.has(id))nodes.set(id,{id,hidden:false,inert:false,disabled:false,value:'',textContent:'',dataset:{},listeners:{},attrs:{},classList:{toggle(){}},
    addEventListener(type,fn){this.listeners[type]=fn},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]||null},focus(){},append(){},insertBefore(){},replaceChildren(){},
    getBoundingClientRect(){return{height:50}},querySelector(){return node('summary')}});return nodes.get(id)}
  node('deliveryFrame').contentWindow=frame;node('busy').parentNode=node('progressHome');node('busy').nextSibling=null;node('deliveryWorkspace').hidden=true;
  Object.defineProperty(node('deliveryFrame'),'src',{set(value){loads++;calls.push({src:value});this.attrs.src=value;channel=new URL(value,'file:///repo/tool/FireworkBaker.html').hash.slice(1);queueMicrotask(()=>emit({type:'workspace-host-ready',channel}))}});
  const ctx=vm.createContext({document:{getElementById:node,querySelector:node,createElement:node,addEventListener(){},documentElement:{style:{setProperty(){}}}},
    location:{protocol,href:protocol==='file:'?'file:///repo/tool/FireworkBaker.html':origin+'/baker',hash:'',origin:protocol==='file:'?'null':origin},
    window:{matchMedia:()=>({matches:true}),addEventListener(type,fn){listeners[type]=fn}},localStorage:{},fetch(){throw Error('no fetch')},crypto:{randomUUID},URL,Blob,TextEncoder,Uint8Array,DataView,
    setTimeout,clearTimeout,ResizeObserver:class{observe(){}}});
  vm.runInContext(source,ctx);const api=vm.runInContext('DeliveryWorkspace',ctx);api.init();
  return{api,node,calls,loads:()=>loads};
}
(async()=>{
  // 1 副本旧、服务已重新生成：重载一次，第二次加载的是新版，导入区照常
  let f=fixture({loaded:[OLD,NEW]});await f.api.open();
  assert.equal(f.loads(),2,'旧副本应重载一次交付页');assert.equal(f.node('deliveryFrame').hidden,false);assert.equal(f.node('deliveryStatus').dataset.error,'false');
  assert.match(f.node('deliveryStatus').textContent,/已更新到本机最新版/);console.log('PASS stale local importer copy is reloaded once after the service regenerates it');
  // 2 重载后还是旧的（服务没法重新生成、或副本在别的目录）：拦下导入，写清怎么修
  f=fixture({loaded:[OLD,OLD]});await f.api.open();
  assert.equal(f.loads(),2);assert.equal(f.node('deliveryFrame').hidden,true,'还旧就不能显示（不能导入）');assert.equal(f.node('deliveryCheck').disabled,true);
  assert.equal(f.node('deliveryStatus').dataset.error,'true');assert.match(f.node('deliveryStatus').textContent,/旧版本[\s\S]*启动烘焙器\.cmd/);console.log('PASS persistent stale copy blocks import with the fix');
  // 3 本来就是新的：不重载
  f=fixture({loaded:[NEW]});await f.api.open();assert.equal(f.loads(),1);assert.equal(f.node('deliveryFrame').hidden,false);console.log('PASS fresh copy loads once');
  // 4 HTTP 入口（服务现读源文件）不需要副本：戳一致，不重载
  f=fixture({protocol:'http:',loaded:[NEW]});await f.api.open();assert.equal(f.loads(),1);console.log('PASS HTTP entry unaffected');
  // 5 服务没回报来源（旧服务进程、目录服务离线）：照常显示，提示核对不了版本
  f=fixture({loaded:[OLD],service:null});await f.api.open();assert.equal(f.loads(),1);assert.equal(f.node('deliveryFrame').hidden,false);console.log('PASS unknown source keeps the importer usable');
  // 6 拦下后用户运行了 启动烘焙器.cmd（副本变新）再点「重试」：重载交付页、恢复导入
  f=fixture({loaded:[OLD,OLD,NEW]});await f.api.open();assert.equal(f.node('deliveryRetry').hidden,false);await f.node('deliveryRetry').listeners.click();
  assert.equal(f.loads(),3);assert.equal(f.node('deliveryFrame').hidden,false);assert.equal(f.node('deliveryCheck').disabled,true,'没有选中修订时检查按钮照旧不可点');assert.notEqual(f.node('deliveryStatus').dataset.error,'true');console.log('PASS retry after regeneration reloads and restores import');
  // 7 4.9.119 以前生成的副本（没有戳）+ 旧服务（不回报来源）：确认不了 → 拦下，叫用户运行 启动烘焙器.cmd（它会重新生成带戳的副本）
  f=fixture({loaded:[null],service:null});await f.api.open();assert.equal(f.node('deliveryFrame').hidden,true);assert.match(f.node('deliveryStatus').textContent,/没有版本戳[\s\S]*启动烘焙器\.cmd/);console.log('PASS unstamped copy with an old service is blocked');
  // 8 烘焙器启动时 init() 已经在连（connect），紧接着打开交付页（open → prepare → connect）：重载期间不许有人拿旧会话去问新页（4.9.119 端到端测出来的竞态）
  f=fixture({loaded:[OLD,NEW],slow:30});for(let i=0;i<100&&!f.calls.some(x=>x.resp==='session'&&x.page===1);i++)await new Promise(r=>setTimeout(r,5));await new Promise(r=>setTimeout(r,5));await f.api.open();
  const seq=f.calls.filter(x=>x.page===2||x.resp).map(x=>x.command?'req:'+x.command+'@'+x.page:'resp:'+x.resp+'@'+x.page);
  const iReq=seq.indexOf('req:resources@2'),iSess=seq.indexOf('resp:session@2');assert(iSess>=0&&iReq>iSess,'新页回会话以前就问了资源：'+seq.join(' '));console.log('PASS concurrent connect waits for the reload');
  console.log('8 importer freshness contracts passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
