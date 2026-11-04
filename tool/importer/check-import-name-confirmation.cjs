const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'../df-fx-workbench_v2_locmai.html'),'utf8');
const multi=JSON.parse(fs.readFileSync('D:/ProjectTextures/FireWorksLab/TR2L_____V5/cascade.json','utf8'));
const basic={format:'fwl.cascade/1',name:'Fixture',textures:{},materials:{m:{role:'soft_dot'}},emitters:[{name:'Spark',material:'m',modules:[]}]};
let passed=0;
const check=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const pause=()=>new Promise(r=>setTimeout(r,15));
const api=w=>w.eval('FwImporter');
const el=(w,id)=>w.document.getElementById('fwimp-'+id);
const state=w=>JSON.parse(w.localStorage.getItem('fwimp.workbench.v2'));
const rows=w=>{const s=state(w);return s.batches.find(b=>b.id===s.active).rows;};
function boot(options={}){
 const calls=[],writes=[],errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const start=html.indexOf('  async function importOne(it){'),end=html.indexOf('  async function execute(){',start);
 const code=html.slice(0,start)+'  async function importOne(it){window.__write(it);}\n'+html.slice(end);
 const dom=new JSDOM(code,{url:'http://isolated-test.invalid/confirmation',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.confirm=()=>false;w.__write=it=>writes.push(JSON.parse(JSON.stringify(it)));
  if(options.state)w.localStorage.setItem('fwimp.workbench.v2',JSON.stringify(options.state));
  w.fetch=async(url,opt)=>{const request=JSON.parse(opt.body);calls.push(request);let data;
   if(request.function==='ExecutePythonCommandEx'&&require('./mock-import-policy.cjs').simulatePolicy(request.args.PythonCommand))return{ok:true,json:async()=>({success:true,data:{return_value:'True'}})};
   if(request.function==='GetPlatformName')data={return_value:'Windows'};
   else if(request.function==='DoesAssetExist')data={return_value:options.occupied?.()?'True':'False'};
   else if(request.function==='ExecutePythonCommandEx'&&request.args.PythonCommand.includes("print('FWLJSON:'")){
    const spec=options.spec?.()||basic,exists=Object.fromEntries(Object.keys(spec.textures).map(k=>[k,true]));
    data={return_value:'True',out_LogOutput:'Output='+JSON.stringify('FWLJSON:'+JSON.stringify({spec,exists}))};
   }else throw Error('Unexpected engine write blocked: '+request.function);
   return{ok:true,json:async()=>({success:true,data})};
  };
 }});
 return{w:dom.window,calls,writes,errors,close:()=>dom.window.close()};
}
async function add(w,text){api(w).edit('bulk');el(w,'editText').value=text;w.document.querySelector('#fwimp-editor .btn').click();for(let n=0;n<150&&w.eval('Workbench.busy');n++)await pause();}
function confirm(w,ids){api(w).reviewNames(ids);el(w,'btnConfirmNames').click();}
(async()=>{
 const first=boot();await pause();await add(first.w,'F:/packs/a | Review_01');
 check('检查通过仍需明确名称确认，直接调用执行也不能写入',()=>{assert.equal(rows(first.w)[0].state,'ready');assert.equal(el(first.w,'btnExec').disabled,true);assert.equal(el(first.w,'nameReview').hidden,false);assert.match(el(first.w,'list').textContent,/待确认名称/);});
 await api(first.w).execute();check('未确认时零写入',()=>assert.equal(first.writes.length,0));
 api(first.w).closeNameReview();const callCount=first.calls.length;api(first.w).reviewNames();
 check('打开名称预览只展示已检查的计划',()=>{assert.equal(first.calls.length,callCount);assert.match(el(first.w,'nameReview').textContent,/基础名/);assert.match(el(first.w,'nameReview').textContent,/Review/);assert.match(el(first.w,'nameReview').textContent,/01/);assert.equal(el(first.w,'btnConfirmNames').disabled,false);});
 api(first.w).closeNameReview();api(first.w).confirmNames();
 check('返回修改或在没有预览时确认都不授权执行',()=>{assert.equal(el(first.w,'nameReview').hidden,false);assert.equal(el(first.w,'main').hidden,false);assert.equal(el(first.w,'btnExec').disabled,true);assert.equal(first.writes.length,0);});
 const shown=JSON.parse(JSON.stringify(rows(first.w)[0].assets));confirm(first.w);
 check('确认不自动导入，明确开放执行按钮',()=>{assert.equal(el(first.w,'btnExec').disabled,false);assert.equal(el(first.w,'nameReview').hidden,false);assert.equal(el(first.w,'main').hidden,false);assert.equal(first.writes.length,0);assert.match(el(first.w,'list').textContent,/名称已确认/);});
 api(first.w).reviewNames();await api(first.w).execute();
 check('再次打开预览期间，即使以前确认过也不能直接导入',()=>{assert.equal(first.writes.length,0);assert.equal(el(first.w,'btnExec').disabled,true);});api(first.w).closeNameReview();
 await api(first.w).execute();check('执行使用已预览的同一目标计划',()=>{assert.equal(first.writes.length,1);assert.deepEqual(first.writes[0].assets,shown);assert.equal(rows(first.w)[0].state,'done');assert.deepEqual(first.errors,[]);});first.close();

 const textures=boot({spec:()=>multi});await pause();await add(textures.w,'D:/packs/tail | FireWorks_Trail_High_01');
 check('真实多贴图包逐项展示完整名称、来源与目录',()=>{const r=rows(textures.w)[0],body=el(textures.w,'nameReview');assert.equal(Object.keys(r.assets).length,8);assert.equal(body.querySelectorAll('tbody tr').length,8);for(const p of Object.values(r.assets)){assert(body.textContent.includes(p.slice(p.lastIndexOf('/')+1)));assert(body.textContent.includes(p.slice(0,p.lastIndexOf('/'))));}for(const t of Object.values(multi.textures))assert(body.textContent.includes(t.file));assert(body.textContent.includes('P_EFX_FireWorks_FireWorks_Trail_High_HD'));assert(body.textContent.includes('材质标识：loop'));});
 confirm(textures.w);const name=el(textures.w,'name');name.focus();name.value='Trail_Large';name.dispatchEvent(new textures.w.Event('input'));
 check('改名立即作废确认和旧名称预览，并保留输入焦点',()=>{assert.equal(el(textures.w,'btnExec').disabled,true);assert.equal(rows(textures.w)[0].state,'unchecked');assert(!el(textures.w,'detail').textContent.includes('P_EFX_FireWorks_FireWorks_Trail_High_HD'));assert.equal(el(textures.w,'name'),name);assert.equal(textures.w.document.activeElement,name);});
 await api(textures.w).execute();await api(textures.w).preview();
 check('重新检查生成新预览，旧确认不能复用',()=>{assert.equal(textures.writes.length,0);assert.equal(el(textures.w,'btnExec').disabled,true);assert(el(textures.w,'nameReview').textContent.includes('P_EFX_FireWorks_Trail_Large_HD'));});
 confirm(textures.w);await api(textures.w).preview();api(textures.w).closeNameReview();
 check('重新检查即使基础名没变也要求再次确认',()=>assert.equal(el(textures.w,'btnExec').disabled,true));textures.close();

 const replacement=boot();await pause();await add(replacement.w,'F:/packs/old | SameName_01');confirm(replacement.w);const oldId=rows(replacement.w)[0].id;
 await add(replacement.w,'F:/packs/new | SameName_01');await api(replacement.w).execute();
 check('更换素材路径但保持名称也会失效，不能沿用旧包的确认',()=>{assert.notEqual(rows(replacement.w)[0].id,oldId);assert.equal(replacement.writes.length,0);assert.equal(el(replacement.w,'btnExec').disabled,true);assert(el(replacement.w,'nameReview').textContent.includes('F:/packs/new'));});replacement.close();

 const mix=boot();await pause();await add(mix.w,'F:/packs/a | MixA_01\nF:/packs/b | MixB_02');confirm(mix.w,[rows(mix.w)[0].id]);await api(mix.w).execute();
 check('混合勾选有未确认项时整次执行拦截，不静默跳过',()=>{assert.equal(mix.writes.length,0);assert.equal(el(mix.w,'btnExec').disabled,true);assert.match(el(mix.w,'execHint').textContent,/1.*待确认/);});
 mix.w.document.querySelectorAll('#fwimp-list input')[1].click();
 check('取消未确认项后可执行已确认项，勾选与确认相互独立',()=>{assert.equal(el(mix.w,'btnExec').disabled,false);assert.equal(rows(mix.w)[1].selected,false);});
 api(mix.w).selectAll(true);confirm(mix.w);const checkedState=state(mix.w);await api(mix.w).execute();
 check('一页批量确认后两项都可执行',()=>assert.deepEqual(mix.writes.map(x=>x.as),['MixA_01','MixB_02']));
 const restored=boot({state:checkedState});await pause();await api(restored.w).execute();
 check('刷新恢复记录但不继承会话内确认',()=>{assert.equal(restored.writes.length,0);assert.equal(el(restored.w,'btnExec').disabled,true);assert(rows(restored.w).every(r=>r.state==='unchecked'));});restored.close();mix.close();

 let changed=false;const source=boot({spec:()=>({...basic,name:changed?'Changed':'Before'})});await pause();await add(source.w,'F:/packs/a | Source_01');confirm(source.w);changed=true;await api(source.w).execute();
 check('已确认后素材内容变化仍被写入前核对拦截',()=>{assert.equal(source.writes.length,0);assert.equal(rows(source.w)[0].state,'failed');assert.match(rows(source.w)[0].errs[0],/发生变化/);assert.equal(el(source.w,'btnExec').disabled,true);});source.close();
 let occupied=false;const target=boot({occupied:()=>occupied});await pause();await add(target.w,'F:/packs/a | Target_01');confirm(target.w);occupied=true;await api(target.w).execute();
 check('已确认后同名资产出现仍禁止覆盖',()=>{assert.equal(target.writes.length,0);assert.equal(rows(target.w)[0].state,'failed');});target.close();
 const invalid=boot();await pause();await add(invalid.w,'F:/packs/a | Bad Name');
 check('无有效计划时可返回修改，不能确认名称',()=>{assert.equal(el(invalid.w,'btnConfirmNames').disabled,true);assert.equal(el(invalid.w,'btnExec').disabled,true);assert.match(el(invalid.w,'nameReview').textContent,/基础名需/);});api(invalid.w).confirmNames();await api(invalid.w).execute();assert.equal(invalid.writes.length,0);invalid.close();
 const disk=boot();await pause();await add(disk.w,'F:/packs/a | Disk_01');disk.w.Storage.prototype.setItem=function(){throw Error('Storage full');};api(disk.w).confirmNames();await api(disk.w).execute();
 check('存储失败时确认与执行都不授权',()=>{assert.equal(disk.writes.length,0);assert.equal(el(disk.w,'btnExec').disabled,true);});disk.close();
 const escaped=JSON.parse(JSON.stringify(multi));escaped.textures.loop.file='T_<img src=x onerror=bad>.png';const safe=boot({spec:()=>escaped});await pause();await add(safe.w,'F:/packs/a | Safe_01');
 check('来源文件名按文字转义，不生成额外DOM',()=>{assert.equal(el(safe.w,'nameReview').querySelectorAll('img').length,0);assert(el(safe.w,'nameReview').textContent.includes(escaped.textures.loop.file));assert.deepEqual(safe.errors,[]);});safe.close();
 console.log('\n'+passed+' naming-confirmation checks passed. All UE interfaces were mocked; no real writes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
