// 只读运行真实控制器的预检；没有确认/执行入口，写端点与写 Python 全部拒绝。
const fs=require('fs'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom'),{request}=require('./engine_api.cjs');
const root='D:/ProjectTextures/FireWorksLab/烟花/中/GlitterChry_D150/revisions/b3238a7d06029a36a3ae';
const receipt=JSON.parse(fs.readFileSync(root+'/workspace-resource.json','utf8'));
receipt.packages=receipt.packages.map(p=>({...p,directory:root+'/'+p.relativeDirectory}));
let calls=0;const vc=new VirtualConsole();vc.on('jsdomError',e=>console.error('DOM:',e.message));
const dom=new JSDOM(fs.readFileSync(__dirname+'/../df-fireworks-delivery_locmai.html','utf8'),{url:'http://isolated.invalid/readonly-native-check',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.confirm=()=>false;w.fetch=async(url,opt)=>{
  const body=JSON.parse(opt.body),route=new URL(url,'http://127.0.0.1').pathname.replace(/^\/gpcli/,'');
  assert(['/object/get','/object/search','/object/call'].includes(route),'禁止写端点');
  if(route==='/object/call'){
   assert(['GetPlatformName','DoesAssetExist','ExecutePythonCommandEx'].includes(body.function),'禁止写方法 '+body.function);
   if(body.function==='ExecutePythonCommandEx'){
    const code=body.args.PythonCommand;
    assert(/FWL_DELIVERY_GATE|FWL_DERIVED_FIRST|FWL_TEXTURE_FINGERPRINT|FWL_POLICY_DIRS|FWL_SELECTION_REUSE|print\('FWLJSON:'/.test(code),'未知 Python 禁止执行');
    assert(!/--register|set_editor_property|save_asset|create_asset|import_asset_tasks|make_directory|makedirs|unlink|rmtree/.test(code),'禁止写 Python');
   }
  }
  calls++;return{ok:true,json:async()=>request(route,body,120000)};
 };
}});
(async()=>{try{
 await new Promise(r=>setTimeout(r,30));await dom.window.eval('FwImporter').acceptDelivery(receipt);
 const state=dom.window.eval('FwImporter').deliveryState()[receipt.deliveryId];
 const summary={checkedAt:new Date().toISOString(),calls,rows:state.rows.map(r=>({as:r.as,state:r.state,errs:r.errs,assets:r.assets})),executeDisabled:dom.window.document.getElementById('fwimp-btnExec').disabled,confirmed:false,UEWrites:0};
 const proofFile=__dirname+'/backups/20261014-derived-first-native.json';fs.writeFileSync(proofFile,JSON.stringify(summary,null,2));
 assert(state.rows.every(r=>r.state==='ready'),JSON.stringify(summary.rows.map(r=>r.errs)));
 assert(summary.executeDisabled);assert.notEqual(state.rows[0].assets.ps,state.rows[1].assets.ps);
 dom.window.eval('FwImporter').selectDeliveryPlatform('mobile');await new Promise(r=>setTimeout(r,30));
 const text=dom.window.document.getElementById('fwimp-reviewContent').textContent;
 assert.equal((text.match(/复用本批次贴图/g)||[]).length,2);
 console.log('实际用户包双平台只读预检：2 ready、0 error；手游2张共用贴图复用PC；未确认、不可执行、UE写入0。读取调用 '+calls+'；证据 '+proofFile);
}finally{dom.window.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
