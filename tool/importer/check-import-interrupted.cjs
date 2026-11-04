const assert=require('node:assert/strict'),fs=require('node:fs');
const {loadBackend}=require('./import-backend.cjs');
const plain=v=>JSON.parse(JSON.stringify(v));
(async()=>{
 const b=loadBackend(async()=>{throw Error('No actual UE calls');});
 const item={assets:{'tex:t':'/Game/Effects/Common/Texture/Fireworks/T_Fixture',ps:'/Game/Effects_HD/Props_HD/FireWorks_HD/P_Fixture_HD'},spec:{emitters:[{name:'Test',modules:[]}]},targets:[{key:'tex:t',exists:true,class:'Texture2D',editable:true,tag:'',diskHash:''},{key:'ps',exists:false,class:'',editable:true,diskHash:''}]};
 assert.deepEqual(plain(b.validateUpdateTargets(item)),[],'Interrupted package must recover existing textures and create its missing particle');console.log('PASS partial package is not trapped between new and update');
 const policy=fs.readFileSync(__dirname+'/fireworks-policy.js','utf8');assert(!policy.includes("set_editor_property('pixel_format'"),'PixelFormat is native read-only');console.log('PASS no read-only Python PixelFormat setter');
 const missing=plain(item);missing.targets[0].exists=false;assert(b.validateUpdateTargets(missing).some(x=>/新建/.test(x)));console.log('PASS wholly absent package still directs user to new');
 const corrupt=plain(item);corrupt.targets[1].diskHash='unreadable';assert(b.validateUpdateTargets(corrupt).some(x=>/无法加载/.test(x)));console.log('PASS unreadable disk particle cannot be overwritten');
 const badType=plain(item);badType.targets[0].class='Material';assert(b.validateUpdateTargets(badType).some(x=>/类型/.test(x)));console.log('PASS wrong asset class remains blocked');
 const locked=plain(item);locked.targets[0].editable=false;assert(b.validateUpdateTargets(locked).some(x=>/不可写/.test(x)));console.log('PASS locked partial targets remain blocked');
 const {fixture}=require('./check-import-update-backend.cjs');
 const t=fixture({missingPS:true,missingMaterials:true,memoryOnly:true});await t.run();
 assert(t.calls.some(c=>c.body.args?.PythonCommand?.includes('create_asset(')));assert.equal(t.get(t.ps).Emitters.length,2);assert(!t.calls.some(c=>c.body.args?.PythonCommand?.includes('close_asset_editors')));console.log('PASS actual mixed update pipeline creates missing particle with safe cache');
 assert(t.calls.some(c=>c.body.function==='DuplicateAsset'),'Missing material must be created');assert.equal(t.it.importProgress.saved.length,3);console.log('PASS mixed package completion verifies every selected saved target');
 const saveFailure=fixture({missingPS:true,memoryOnly:true,saveFail:true});await assert.rejects(saveFailure.run(),/保存失败/);assert(!saveFailure.it.importProgress.particleRestored);console.log('PASS new recovery particle never rolls back a nonexistent old particle');
 const failed=fixture({scFailure:true});await assert.rejects(failed.run(),/版本管理/);assert.equal(failed.it.importProgress.added.length,0);console.log('PASS saved file with failed version control never reports completion');
 const code=fs.readFileSync(__dirname+'/fireworks-update.js','utf8');assert(code.includes('if not os.path.isfile(filename): continue'));console.log('PASS memory-only targets defer add until files are saved');
 const {JSDOM,VirtualConsole}=require('jsdom');let writes=[];const spec=t.it.spec;
 const original=fs.readFileSync(__dirname+'/../df-fx-workbench_v2_locmai.html','utf8');const start=original.indexOf('  async function importOne(it){'),end=original.indexOf('  async function execute(){',start);
 const html=original.slice(0,start)+'async function importOne(it){window.__writes.push(it);}\n'+original.slice(end);
 const dom=new JSDOM(html,{url:'http://isolated.invalid/partial',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:new VirtualConsole(),beforeParse(w){w.__writes=writes;w.confirm=()=>false;w.fetch=async(_,opts)=>{
  const r=JSON.parse(opts.body);let data={return_value:'True'};
  if(r.function==='GetPlatformName')data.return_value='Windows';
  else if(r.function==='DoesAssetExist')data.return_value=r.args.AssetPath.includes('/T_')?'True':'False';
  else if(r.function==='ExecutePythonCommandEx'){
   const code=r.args.PythonCommand;let tag,payload;
   if(require('./mock-import-policy.cjs').simulatePolicy(code)){}
   else if(code.includes("print('FWLJSON:'")){tag='FWLJSON:';payload={spec,exists:{main:true},sourceHash:'fixed',textureHashes:{main:'fixed'}};}
   else if(code.includes("print('FWLTARGETS:'")){tag='FWLTARGETS:';const entries=JSON.parse(code.match(/entries = (\[.*\])\n/)[1]);payload=entries.map(([key,pkg])=>({key,pkg,exists:key.startsWith('tex:'),class:key.startsWith('tex:')?'Texture2D':'',tag:'',diskHash:'',dirty:key.startsWith('tex:'),editable:true,sc:'untracked'}));}
   else throw Error('Unexpected read-only fixture request');
   if(tag)data.out_LogOutput='Output='+JSON.stringify(tag+JSON.stringify(payload));
  }else if(r.path)data={properties:{}};else throw Error('Unexpected native fixture write');
  return{ok:true,json:async()=>({success:true,data})};
 };}});
 try{
  const w=dom.window,api=()=>w.eval('FwImporter'),el=s=>w.document.getElementById('fwimp-'+s),pause=()=>new Promise(r=>setTimeout(r,20));
  const settle=async()=>{for(let i=0;i<200;i++){await pause();if(!w.eval('Workbench.busy'))break;}};
  await pause();api().edit('bulk');el('editText').value='D:/fixture/partial | Partial_01';w.document.querySelector('#fwimp-editor .btn').click();await settle();
  assert.match(el('reviewContent').textContent,/目标已存在/);assert(el('btnConfirmNames').disabled);console.log('PASS new mode blocks overwriting already imported texture');
  const mode=el('mode');mode.value='update';mode.dispatchEvent(new w.Event('change'));await api().preview();
  assert(!el('btnConfirmNames').disabled,el('reviewContent').textContent);assert.match(el('reviewContent').textContent,/同名更新/);assert.match(el('reviewContent').textContent,/新增/);assert.equal(writes.length,0);console.log('PASS partial update preview offers existing updates and missing additions together');
  api().confirmNames();await api().execute();assert.equal(writes.length,1);assert.equal(writes[0].mode,'update');assert.equal(writes[0].as,'Partial_01');console.log('PASS confirmation executes partial recovery without changing asset number');
 }finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
