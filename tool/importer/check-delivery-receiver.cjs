const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'../df-fireworks-delivery_locmai.html'),'utf8');
const basic={format:'fwl.cascade/1',name:'Human Display 名称',textures:{ramp:{class:'ramp',file:'T_EFX_FireWorks_Shared_R.png',asset:'T_EFX_FireWorks_Shared_R',hash:'a'.repeat(20)}},materials:{m:{role:'soft_dot'}},emitters:[{name:'Spark',material:'m',modules:[]}]};
const mobile={...basic,name:'GoldChrysanthemum_M',platform:'mobile',tier:'M',emitters:[{name:'Spark',material:'m',max_alive:1,modules:[]}]};
let writes=0,gateReject=false,packReads=0;const vc=new VirtualConsole();
const options={url:'http://isolated-test.invalid/delivery',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.confirm=()=>false;w.fetch=async(url,opt)=>{const request=JSON.parse(opt.body);let data;
 if(request.function==='ExecutePythonCommandEx'&&require('./mock-import-policy.cjs').simulatePolicy(request.args.PythonCommand))return{ok:true,json:async()=>({success:true,data:{return_value:'True'}})};
 if(request.function==='GetPlatformName')data={return_value:'Windows'};
 else if(request.function==='DoesAssetExist')data={return_value:'False'};
 else if(request.function==='ExecutePythonCommandEx'&&request.args.PythonCommand.includes('# FWL_DELIVERY_GATE'))data={return_value:'True',out_LogOutput:'Output='+JSON.stringify('FWLDELIVERYGATE:'+JSON.stringify({ok:!gateReject,registry:{},problems:gateReject?['手机名称包含 _Mobile_HD']:[]}))};
 else if(request.function==='ExecutePythonCommandEx'&&request.args.PythonCommand.includes("print('FWLJSON:'")){packReads++;data={return_value:'True',out_LogOutput:'Output='+JSON.stringify('FWLJSON:'+JSON.stringify({spec:request.args.PythonCommand.includes('cascade_mobile.json')?mobile:basic,exists:{ramp:true},textureHashes:{ramp:'b'.repeat(64)},sourceHash:'c'.repeat(64)}))};}
 else{writes++;throw Error('Unexpected write blocked');}
 return{ok:true,json:async()=>({success:true,data})};
 };
}};
const dom=new JSDOM(html,options);
const w=dom.window,api=()=>w.eval('FwImporter'),receipt={format:'df.firework-resource/1',status:'complete',resourceId:'test',revisionId:'rev1',deliveryId:'test-rev1',name:'GoldChrysanthemum',packages:[{name:'不合法显示名称',platform:'pc',directory:'F:/test/revisions/rev1',configFile:'cascade.json'},{name:'GoldChrysanthemum_M',platform:'mobile',directory:'F:/test/revisions/rev1',configFile:'cascade_mobile.json'}]};
(async()=>{
 await new Promise(r=>setTimeout(r,30));
 await api().acceptDelivery(receipt);
 const rows=api().deliveryState()[receipt.deliveryId].rows;
 assert.equal(rows.length,2);assert.equal(rows[0].as,'GoldChrysanthemum_01');assert.equal(rows[1].as,'GoldChrysanthemum_M_01');assert(rows.every(r=>r.state==='ready'),JSON.stringify(rows));
 assert.equal(rows[1].assets.ps,'/Game/Effects/Props/FireWorks/P_EFX_FireWorks_GoldChrysanthemum_M');
 assert.equal(w.document.getElementById('fwimp-btnExec').disabled,true);assert.equal(writes,0);
 await api().acceptDelivery(receipt);assert.equal(api().deliveryState()[receipt.deliveryId].rows.length,2);
 api().edit('add');assert.equal((await api().acceptDelivery({...receipt,deliveryId:'test-rev2',revisionId:'rev2'})).queued,true);assert.equal(api().deliveryState()['test-rev2'],undefined);
 await assert.rejects(api().acceptDelivery({...receipt,status:'writing'}).then(result=>{if(result.queued)throw Error('busy');}));
 const persisted=w.localStorage.getItem('fwimp.delivery.v1');const originalBefore=options.beforeParse;const restored=new JSDOM(html,{...options,beforeParse(window){window.localStorage.setItem('fwimp.delivery.v1',persisted);originalBefore(window)}});await new Promise(r=>setTimeout(r,30));try{await restored.window.eval('FwImporter').acceptDelivery(receipt);assert(restored.window.eval('FwImporter').deliveryState()[receipt.deliveryId].rows.every(r=>r.state==='ready'),'refresh receipt must rerun original read-only check');assert.equal(writes,0)}finally{restored.window.close()}
 api().cancelWorkspaceEdit();
 await api().acceptDelivery({...receipt,deliveryId:'test-rev2',revisionId:'rev2'});
 assert.equal(api().deliveryState()['test-rev2'].rows.length,2,'待确认旧批次不能锁住新修订');
 assert.equal(Object.keys(api().deliveryState()).length,2,'旧批次需保留在历史');
 gateReject=true;const beforeReads=packReads;
 await api().acceptDelivery({...receipt,deliveryId:'test-invalid',revisionId:'invalid'});
 const rejected=api().deliveryState()['test-invalid'].rows;
 assert(rejected.every(r=>r.state==='error'&&r.errs.some(e=>e.includes('_Mobile_HD'))));
 assert.equal(packReads,beforeReads,'包级预检失败不能继续读取配置');
 assert.equal(w.document.getElementById('fwimp-btnExec').disabled,true);
 assert.equal(writes,0);dom.window.close();console.log('7组交付接收检查通过：自动预检、手游命名、重复修订、忙时排队、刷新重检、待确认切换、失败拦截；UE写入0。');
})().catch(e=>{dom.window.close();console.error(e);process.exitCode=1;});
