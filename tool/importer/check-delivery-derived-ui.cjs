// 独立入口真实控制器隔离检查，不连接 UE，不授权或执行导入。
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'../df-fireworks-delivery_locmai.html'),'utf8');
const basic={format:'fwl.cascade/1',name:'Base_D150',derived:{from:'Base'},naming:{base:'Base',asset_names:'textures[].asset'},textures:{ramp:{file:'r.png',class:'ramp',asset:'T_EFX_FireWorks_Base_R',hash:'0123456789abcdef12'}},materials:{m:{role:'soft_dot'}},emitters:[{name:'Spark',material:'m',max_alive:1,modules:[]}]};
const receipt={format:'df.firework-resource/1',status:'complete',resourceId:'base',revisionId:'r1',deliveryId:'base-r1',name:'Base_D150',packages:[{platform:'pc',name:'Base_D150',directory:'F:/fixture',configFile:'cascade.json'},{platform:'mobile',name:'Base_D150_M',directory:'F:/fixture',configFile:'cascade_mobile.json'}]};
const pause=()=>new Promise(r=>setTimeout(r,15));
function boot({existing=false,different=false}={}){
 let writes=0;const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'http://isolated.invalid/derived-first',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.confirm=()=>false;w.fetch=async(url,opt)=>{
   const req=JSON.parse(opt.body);let data;
   const code=req.args?.PythonCommand||'';
   const tagged=(tag,value)=>({return_value:'True',out_LogOutput:'Output='+JSON.stringify(tag+JSON.stringify(value))});
   if(url.endsWith('/object/get'))data={properties:{Emitters:[]}};
   else if(req.function==='GetPlatformName')data={return_value:'Windows'};
   else if(req.function==='DoesAssetExist')data={return_value:'False'};
   else if(code.includes('# FWL_DELIVERY_GATE'))data=tagged('FWLDELIVERYGATE:',{ok:true,registry:{}});
   else if(code.includes('# FWL_DERIVED_FIRST')){
    const entries=JSON.parse(code.match(/^entries = (.+)$/m)[1]);data=tagged('FWLDERIVEDFIRST:',entries.map(([key,pkg])=>({key,pkg,exists:existing,saved:existing,class:existing?'Texture2D':''})));
   }else if(code.includes("print('FWLTARGETS:'")){
    const entries=JSON.parse(code.match(/^entries = (.+)$/m)[1]);data=tagged('FWLTARGETS:',entries.map(([key,pkg])=>({key,pkg,exists:true,class:key==='ps'?'ParticleSystem':key.startsWith('tex:')?'Texture2D':'MaterialInstanceConstant',editable:true,tag:'',diskHash:'fixture'})));
   }else if(code.includes("print('FWLJSON:'")){
    const mobile=code.includes('cascade_mobile.json'),spec=JSON.parse(JSON.stringify(basic));if(mobile){spec.platform='mobile';spec.tier='M';spec.name='Base_D150_M';}
    data=tagged('FWLJSON:',{spec,exists:{ramp:true},sourceHash:'source-'+mobile,textureHashes:{ramp:(mobile&&different?'b':'a').repeat(64)}});
   }else if(req.function==='ExecutePythonCommandEx'&&require('./mock-import-policy.cjs').simulatePolicy(code))data={return_value:'True'};
   else{writes++;throw Error('禁止未声明原生操作：'+req.function);}
   return{ok:true,json:async()=>({success:true,data})};
  };
 }});
 return{w:dom.window,api:()=>dom.window.eval('FwImporter'),rows:()=>JSON.parse(dom.window.localStorage.getItem('fwimp.delivery.v1')).batches.flatMap(b=>b.rows),get writes(){return writes;},close:()=>dom.window.close()};
}
(async()=>{
 const f=boot();try{await pause();await f.api().acceptDelivery(receipt);assert(f.rows().every(r=>r.state==='ready'),JSON.stringify(f.rows().map(r=>r.errs)));console.log('PASS 首次派生双平台均检查通过');
  const rows=f.rows();assert.notEqual(rows[0].assets.ps,rows[1].assets.ps);f.api().selectDeliveryPlatform('mobile');await pause();assert.match(f.w.document.getElementById('fwimp-reviewContent').textContent,/复用本批次贴图/);console.log('PASS 双平台粒子区分，共享贴图只在首包写一次');
  assert(f.w.document.getElementById('fwimp-btnExec').disabled);assert.equal(f.writes,0);console.log('PASS 未确认不能执行且真实写入为零');
  f.api().selectDeliveryPlatform('pc');await pause();
  const name=f.w.document.getElementById('fwimp-name');name.value='Alias';name.dispatchEvent(new f.w.Event('input',{bubbles:true}));
  for(let n=0;n<300&&f.w.eval('Workbench.busy');n++)await pause();
  const mode=f.w.document.getElementById('fwimp-mode');mode.value='update';mode.dispatchEvent(new f.w.Event('change',{bubbles:true}));
  for(let n=0;n<300&&f.w.eval('Workbench.busy');n++)await pause();
  await f.api().acceptDelivery({...receipt,deliveryId:'base-r2',revisionId:'r2'});
  const next=f.api().deliveryState()['base-r2'].rows;
  assert.equal(next[0].as,'Alias_01');assert.equal(next[0].mode,'update');assert(!next[0].completedAt);assert(!next[0].completedAssetKeys?.length);assert(f.w.document.getElementById('fwimp-btnExec').disabled);assert.equal(f.writes,0);console.log('PASS 新修订继承用户名称与操作，完成状态和确认不继承');
 }finally{f.close();}
 const e=boot({existing:true});try{await pause();await e.api().acceptDelivery(receipt);assert(e.rows().every(r=>r.state==='error'&&r.errs.length===1&&r.errs[0].includes('目标已存在')),JSON.stringify(e.rows().map(r=>r.errs)));assert.equal(e.writes,0);console.log('PASS 首项核验失败只显示根因，没有连带重名误报');}finally{e.close();}
 const d=boot({different:true});try{await pause();await d.api().acceptDelivery(receipt);assert(d.rows().every(r=>r.state==='conflict'));assert(d.rows().every(r=>r.errs.some(e=>/同一目标|目标相同/.test(e))),JSON.stringify(d.rows().map(r=>r.errs)));assert.equal(d.writes,0);console.log('PASS 真实同名不同内容仍在写入前拦截');}finally{d.close();}
 console.log('6 整页派生首次导入检查通过。');
})().catch(e=>{console.error(e);process.exitCode=1;});
