const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'../df-fireworks-delivery_locmai.html'),'utf8');
const multi=JSON.parse(fs.readFileSync('D:/ProjectTextures/FireWorksLab/TR2L_____V5/cascade.json','utf8'));
const basic={format:'fwl.cascade/1',name:'Fixture',textures:{},materials:{m:{role:'soft_dot'}},emitters:[{name:'Spark',material:'m',max_alive:1,required:{duration_s:3},modules:[]}]};
let passed=0;
const check=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const pause=()=>new Promise(r=>setTimeout(r,15));
const api=w=>w.eval('FwImporter');
const el=(w,id)=>w.document.getElementById('fwimp-'+id);
const state=w=>JSON.parse(w.localStorage.getItem('fwimp.delivery.v1'));
const rows=w=>{const s=state(w);return s.batches.find(b=>b.id===s.active).rows;};
function boot(options={}){
 const calls=[],writes=[],errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const start=html.indexOf('  async function importOne(it){'),end=html.indexOf('  async function execute(){',start);
 const code=html.slice(0,start)+'  async function importOne(it){await window.__write(it);}\n'+html.slice(end);
 const dom=new JSDOM(code,{url:'http://isolated-test.invalid/confirmation',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.confirm=()=>false;w.__write=async it=>{writes.push(JSON.parse(JSON.stringify(it)));it.importProgress={stage:'粒子系统',saved:['t','m','p'],added:['t','m','p'],edited:[]};if(options.write)await options.write(it,writes.length);};
  if(options.state)w.localStorage.setItem('fwimp.delivery.v1',JSON.stringify(options.state));
  w.fetch=async(url,opt)=>{const request=JSON.parse(opt.body);calls.push(request);let data;
   if(request.function==='ExecutePythonCommandEx'&&require('./mock-import-policy.cjs').simulatePolicy(request.args.PythonCommand))return{ok:true,json:async()=>({success:true,data:{return_value:'True'}})};
   if(request.function==='GetPlatformName')data={return_value:'Windows'};
   else if(request.function==='DoesAssetExist')data={return_value:options.occupied?.()?'True':'False'};
   else if(request.function==='ExecutePythonCommandEx'&&request.args.PythonCommand.includes('# FWL_DELIVERY_GATE')){
    const register=request.args.PythonCommand.includes("u\"--register\"");
    data=options.registerError&&register?{return_value:'False',out_CommandResult:'模拟登记子进程不可用'}:{return_value:'True',out_LogOutput:'Output='+JSON.stringify('FWLDELIVERYGATE:'+JSON.stringify({ok:true,registry:{}}))};
   }
   else if(request.function==='ExecutePythonCommandEx'&&request.args.PythonCommand.includes("print('FWLJSON:'")){
    const spec=JSON.parse(JSON.stringify(options.spec?.()||basic));if(request.args.PythonCommand.includes('cascade_mobile.json')){spec.name='CliSample_M';spec.platform='mobile';spec.tier='M';}
    const exists=Object.fromEntries(Object.keys(spec.textures).map(k=>[k,true]));
    data={return_value:'True',out_LogOutput:'Output='+JSON.stringify('FWLJSON:'+JSON.stringify({spec,exists}))};
   }else throw Error('Unexpected engine write blocked: '+request.function);
   return{ok:true,json:async()=>({success:true,data})};
  };
 }});
 return{w:dom.window,calls,writes,errors,close:()=>dom.window.close()};
}
async function add(w,text){api(w).edit('bulk');el(w,'editText').value=text;w.document.querySelector('#fwimp-editor .btn').click();for(let n=0;n<150&&w.eval('Workbench.busy');n++)await pause();}
function confirm(w,ids){api(w).reviewNames(ids);el(w,'btnConfirmNames').click();}

const receipt={format:'df.firework-resource/1',status:'complete',resourceId:'cli-test',revisionId:'rev1',deliveryId:'cli-test-rev1',name:'CliSample',packages:[{platform:'pc',name:'CliSample',directory:'F:/test/cli',configFile:'cascade.json'},{platform:'mobile',name:'CliSample_M',directory:'F:/test/cli',configFile:'cascade_mobile.json'}]};
(async()=>{
 let releaseFirst,releaseSecond;const firstGate=new Promise(r=>releaseFirst=r),secondGate=new Promise(r=>releaseSecond=r);
 const fixture=boot({write:async(it,n)=>n===1?firstGate:secondGate});const w=fixture.w;await pause();await api(w).acceptDelivery(receipt);
 w.FwDeliveryPresentation.setContext({...receipt,thumbnail:{status:'ready',file:'workspace-thumbnail.png'},thumbnailURL:'http://127.0.0.1:8034/api/deliveries/cli-test-rev1/workspace-thumbnail.png'});await pause();
 check('缩略图使用宿主提供的可信绝对地址',()=>assert.equal(w.document.getElementById('delivery-resource-thumbnail').src,'http://127.0.0.1:8034/api/deliveries/cli-test-rev1/workspace-thumbnail.png'));
 const thumb=w.document.getElementById('delivery-resource-thumbnail');let srcWrites=0;const observeSrc=new w.MutationObserver(ms=>srcWrites+=ms.filter(m=>m.attributeName==='src').length);observeSrc.observe(thumb,{attributes:true});
 w.FwDeliveryPresentation.sync(api(w).deliveryView());await pause();check('同修订刷新不重新请求图片',()=>assert.equal(srcWrites,0));observeSrc.disconnect();
 thumb.dispatchEvent(new w.Event('error'));w.FwDeliveryPresentation.sync(api(w).deliveryView());await pause();check('图片失败保留占位而非反复破图',()=>{assert(thumb.hidden);assert(!w.document.getElementById('delivery-thumbnail-fallback').hidden);});
 check('真实UE状态与原重连控件在可见流程栏',()=>{assert(w.document.querySelector('.delivery-connection #conn'));assert(w.document.querySelector('.delivery-connection #wb-reconnect'));assert.equal(w.document.getElementById('conn').textContent,'已连接 UE');});
 const before=JSON.stringify(rows(w));w.document.getElementById('delivery-platform-mobile').click();await pause();
 check('正式四步和平台队列来自真实包，不沿用旧批次布局',()=>{assert.equal(w.document.querySelectorAll('#delivery-flow li').length,4);assert.equal(w.document.querySelector('#delivery-flow-check small').textContent,'0 / 2 包已确认');assert.equal(w.document.querySelector('#fwimp-list .fw-item.inspect strong').textContent,'手机资源包');assert(w.document.getElementById('delivery-full-settings'));assert(w.document.querySelector('#delivery-full-settings #fwimp-index'));assert(w.document.querySelector('#fwimp-detail #fwimp-name'));});
 check('PC/手机分段只切真实对象，不改勾选/配置/确认',()=>{assert.equal(api(w).deliveryView().current.platform,'mobile');assert.equal(JSON.stringify(rows(w)),before);assert.equal(fixture.writes.length,0);});
 api(w).confirmCurrent();api(w).confirmCurrent();
 check('逐包确认零写入，两个真实包都可执行',()=>{assert.equal(fixture.writes.length,0);assert.equal(el(w,'btnExec').disabled,false);});
 const run=api(w).execute();for(let n=0;n<100&&fixture.writes.length<1;n++)await pause();
 check('真正执行才自动打开CLI日志，单进度无副标题',()=>{assert(!w.document.querySelector('.logcard').classList.contains('is-folded'));assert.equal(w.document.getElementById('delivery-log-title').textContent,'操作日志');assert.equal(w.document.querySelector('.logcard').querySelectorAll('progress').length,1);assert.equal(w.document.getElementById('delivery-log-progress').value,0);assert.equal(w.document.activeElement.id,'delivery-log-title');assert(w.document.getElementById('delivery-platform-pc').disabled);});
 w.eval('WorkbenchLog').setOpen(false);releaseFirst();for(let n=0;n<100&&fixture.writes.length<2;n++)await pause();
 check('收起不停执行，按已完成真包累计进度',()=>{assert.equal(fixture.writes.length,2);assert.equal(w.document.getElementById('delivery-log-progress').value,1);assert(w.document.querySelector('.logcard').classList.contains('is-folded'));});
 releaseSecond();await run;
 check('完成后两包保留，进度实际为2/2，无UI异常',()=>{assert(rows(w).every(r=>r.state==='done'));assert.equal(w.document.getElementById('delivery-log-progress').value,2);assert.deepEqual(fixture.errors,[]);});fixture.close();
 const failed=boot({write:async(it,n)=>{if(n===2){failed.w.eval('WorkbenchLog').setOpen(false);throw Error('isolated mobile failure');}}});await pause();await api(failed.w).acceptDelivery(receipt);api(failed.w).confirmCurrent();api(failed.w).confirmCurrent();await api(failed.w).execute();
 check('手机失败保留PC完成，收起后自动展开且按钮同步，1/2实际进度',()=>{assert.equal(rows(failed.w)[0].state,'done');assert.equal(rows(failed.w)[1].state,'failed');assert.equal(failed.w.document.getElementById('delivery-log-progress').value,1);assert(!failed.w.document.querySelector('.logcard').classList.contains('is-folded'));assert.equal(failed.w.document.getElementById('wb-log-toggle').textContent,'收起');assert.deepEqual(failed.errors,[]);});failed.close();
 const registration=boot({registerError:true});await pause();await api(registration.w).acceptDelivery(receipt);api(registration.w).confirmCurrent();api(registration.w).confirmCurrent();await api(registration.w).execute();
 check('资产保存后登记失败展示实际阶段与数量，不误报粒子未完成或继续第二包',()=>{
  const r=rows(registration.w)[0];assert.equal(registration.writes.length,1);assert.equal(r.state,'failed');assert.equal(r.importProgress.stage,'交付登记');assert.equal(r.importProgress.saved.length,3);
  assert(r.errs[0].includes('资产已保存'));assert(r.errs[1].includes('未完成的是交付登记'));assert(!r.errs.join('').includes('未完成的粒子系统'));
  assert.equal(api(registration.w).deliveryView().current.platform,'pc');assert(el(registration.w,'reviewContent').textContent.includes('交付登记失败'));
  assert(registration.w.document.body.textContent.includes('交付登记中止'));assert.deepEqual(registration.errors,[]);
 });registration.close();
 let release;const stopped=boot({write:()=>new Promise(r=>release=r)});await pause();await api(stopped.w).acceptDelivery(receipt);api(stopped.w).confirmCurrent();api(stopped.w).confirmCurrent();const stopRun=api(stopped.w).execute();for(let n=0;n<100&&!release;n++)await pause();api(stopped.w).stop();release();await stopRun;
 check('包间停止只写一包，原待检查规则保持',()=>{assert.equal(stopped.writes.length,1);assert.equal(rows(stopped.w)[0].state,'done');assert.equal(rows(stopped.w)[1].state,'unchecked');assert.equal(stopped.w.document.getElementById('delivery-log-progress').value,1);assert.deepEqual(stopped.errors,[]);});stopped.close();
 const fields=boot();await pause();await api(fields.w).acceptDelivery(receipt);await pause();
 const fw=fields.w,settings=fw.document.getElementById('delivery-full-settings');settings.open=true;
 // Browsers blur a focused control as soon as hidden is set; JSDOM does not.
 const focusPrimary=el(fw,'primary'),hidden=Object.getOwnPropertyDescriptor(fw.HTMLElement.prototype,'hidden');
 Object.defineProperty(focusPrimary,'hidden',{get(){return hidden.get.call(this);},set(value){hidden.set.call(this,value);if(value&&fw.document.activeElement===this)this.blur();}});
 api(fw).confirmCurrent();api(fw).confirmCurrent();await pause();
 check('最后一包确认后焦点落到真实执行按钮，不停留在隐藏旧主按钮',()=>{assert.equal(fw.document.activeElement.id,'fwimp-btnExec');assert.equal(fields.writes.length,0);});
 const name=el(fw,'name');name.focus();name.value='EditedSample';name.dispatchEvent(new fw.Event('input',{bubbles:true}));await pause();
 check('搬动原字段后改名仍立即撤销确认并保留焦点；原高级设置完整且无重复',()=>{assert(el(fw,'btnExec').disabled);assert.equal(fw.document.activeElement.id,'fwimp-name');for(const id of ['name','index','dir','configFile','assetNaming','particleNumbered'])assert.equal(fw.document.querySelectorAll('#fwimp-'+id).length,1);assert.equal(fw.document.querySelectorAll('.fw-gpu-policy').length,1);assert.equal(fields.writes.length,0);assert.deepEqual(fields.errors,[]);});fields.close();
 console.log(passed+' production CLI interaction checks passed; every UE interface mocked.');
})().catch(e=>{console.error(e);process.exit(1)});
