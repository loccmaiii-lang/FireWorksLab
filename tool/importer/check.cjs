const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.dirname(__dirname);
const html=fs.readFileSync(path.join(root,'df-fx-workbench_v2_locmai.html'),'utf8').replace(/\r\n/g,'\n');
const original=fs.readFileSync(path.join(root,'df-fx-copier-suite_v1.0.1_locmai.html'),'utf8').replace(/\r\n/g,'\n');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
const norm=s=>s.replaceAll('AssetCopier.doParse(null, /*silent*/true);','doParse(null, /*silent*/true);').replaceAll('MaterialCopier.doParse(null, /*silent*/true);','doParse(null, /*silent*/true);');
for(const [a,b]of [['const AssetCopier','const MaterialCopier'],['const MaterialCopier','const WeaponConfig'],['const WeaponConfig','const ResourceFX']])assert.equal(norm(html.slice(html.indexOf(a),html.indexOf(b))),original.slice(original.indexOf(a),original.indexOf(b)),a+' engine changed');
const importBody=s=>s.slice(s.indexOf('  async function importOne(it){'),s.indexOf('  async function execute(){',s.indexOf('const FwImporter'))).trim();
assert(html.includes(fs.readFileSync(path.join(__dirname,'fireworks-import.js'),'utf8').replace(/\r\n/g,'\n').trim()),'Generated HTML must contain the reviewed import implementation');
assert(!importBody(html).includes('rd.bUseLocalSpace'),'Incorrect local-space field remains');
assert.equal(html.slice(html.indexOf('const ResourceFX'),html.indexOf('const Workbench')).trim(),original.slice(original.indexOf('const ResourceFX'),original.indexOf('// 嵌入模式：')).trim(),'ResourceFX engine changed');
let passed=2;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
const pause=()=>new Promise(r=>setTimeout(r,25));
function boot(options={}){
 const errors=[],calls=[],writes=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 let code=html;
 if(options.stubImport){const start=code.indexOf('  async function importOne(it){'),end=code.indexOf('  async function execute(){',start);code=code.slice(0,start)+`  async function importOne(it){await window.__import(it);if(it.spec.emitters.some(e=>e.gpu)){const st=loadLS();st.pending=[...(st.pending||[]),objPath(it.assets.ps)];saveLS(st);renderPending();}}\n`+code.slice(end);}
 const dom=new JSDOM(code,{url:'http://isolated-test.invalid/df-fx-workbench.html',runScripts:'dangerously',virtualConsole:vc,pretendToBeVisual:true,beforeParse(w){
  w.confirm=()=>false;w.__import=async it=>{writes.push(it.as);if(options.onImport)await options.onImport(w,it);};
  const timer=w.setTimeout.bind(w);w.setTimeout=(fn,ms,...args)=>timer(fn,ms===3000?1:ms,...args);
  if(options.state)w.localStorage.setItem('fwimp.workbench.v2',JSON.stringify(options.state));
  if(options.legacy)w.localStorage.setItem('fwimp.v1',JSON.stringify(options.legacy));
  w.fetch=async(url,opt)=>{const request=JSON.parse(opt.body);calls.push(request);let data;
   if(request.function==='ExecutePythonCommandEx'&&require('./mock-import-policy.cjs').simulatePolicy(request.args.PythonCommand))return{ok:true,json:async()=>({success:true,data:{return_value:'True'}})};
    if(options.offline)return{ok:true,json:async()=>({success:false,data:{}})};
    if(request.function==='GetPlatformName')data={return_value:'Windows'};
    else if(request.function==='DoesAssetExist')data=options.ambiguousExists?{}:{return_value:options.exists?.(request.args?.AssetPath)?'True':'False'};
    else if(request.function==='ExecutePythonCommandEx'&&request.args.PythonCommand.includes("print('FWLJSON:'")){
      const gpu=request.args.PythonCommand.includes('gpu-pack');
      const spec=options.fixture||{format:'fwl.cascade/1',name:options.specName?.()||'Fixture',textures:{},materials:{m:{role:'soft_dot'}},emitters:[{name:'Spark',material:'m',gpu,spawn:{rate:{const:0},bursts:[[0,1]]},required:{loops:1,duration_s:1},modules:[{m:'Lifetime',Lifetime:{const:1}}]}]};
      const exists=Object.fromEntries(Object.keys(spec.textures||{}).map(k=>[k,true]));
      const output='FWLJSON:'+JSON.stringify({spec,exists});
      data={return_value:'True',out_LogOutput:'Output='+JSON.stringify(output)};
    }else if(options.finish&&request.function==='ExecutePythonCommandEx'){
      const cmd=request.args.PythonCommand;
      if(cmd.includes("print('FWLN:"))data={return_value:'True',out_LogOutput:'Output="FWLN:0"'};
      else if(cmd.includes('open_editor_for_assets'))data={return_value:options.finishFail?'False':'True',out_CommandResult:'Simulated editor failure'};
      else if(cmd.includes('close_asset_editors'))data={return_value:'True'};
      else throw Error('Unexpected finish call');
    }else if(options.finish&&request.function==='SaveAsset')data={return_value:'True'};
    else throw Error('Unexpected engine call blocked by test: '+JSON.stringify(request));
    return{ok:true,json:async()=>({success:true,data})};
  };
 }});
 return{dom,w:dom.window,errors,calls,writes,close:()=>dom.window.close()};
}
const api=w=>w.eval('FwImporter');
const state=w=>JSON.parse(w.localStorage.getItem('fwimp.workbench.v2'));
const activeRows=w=>{const s=state(w);return s.batches.find(b=>b.id===s.active).rows;};
async function add(w,text){api(w).edit('bulk');w.document.getElementById('fwimp-editText').value=text;w.document.querySelector('#fwimp-editor .btn').click();for(let n=0;n<100&&w.eval('Workbench.busy');n++)await pause();}
function confirmNames(w){api(w).reviewNames();w.document.getElementById('fwimp-btnConfirmNames').click();}
(async()=>{
 const t=boot({stubImport:true});const {w}=t;await pause();
 check('页面启动，无脚本异常、重复 ID 或缺失原控件',()=>{assert.deepEqual(t.errors,[]);const ids=[...w.document.querySelectorAll('[id]')].map(x=>x.id);assert.equal(new Set(ids).size,ids.length);const originalDOM=new JSDOM(original);for(const el of originalDOM.window.document.querySelectorAll('[id]'))if(!el.id.startsWith('fwimp-'))assert(w.document.getElementById(el.id),'Missing '+el.id);originalDOM.window.close();});
 check('五个模块导航与左右栏均可用',()=>{for(const name of ['asset','material','weapon','resfx','fwimp']){w.eval(`switchPanel('${name}')`);assert.equal(w.document.querySelector('.sidebar .active').dataset.panel,name);assert.notEqual(w.document.getElementById('panel-'+name).style.display,'none');if(name!=='fwimp'){assert(w.document.querySelector('#panel-'+name+' .tool-input .card'));assert(w.document.querySelector('#panel-'+name+' .tool-output .card'));}}});
 await add(w,'F:/packs/cpu | Alpha_01\nF:/packs/gpu-pack | Beta_02');
 check('真实素材读取和命名检查生成两个待确认计划',()=>{assert.deepEqual(activeRows(w).map(r=>r.state),['ready','ready']);assert.equal(w.document.getElementById('fwimp-btnExec').disabled,true);assert(t.calls.some(c=>c.function==='ExecutePythonCommandEx'));});
 api(w).closeNameReview();
 const checks=w.document.querySelectorAll('#fwimp-list input');checks[1].click();
 w.document.querySelectorAll('#fwimp-list button')[1].click();
 check('查看行不改变勾选',()=>assert.deepEqual(activeRows(w).map(r=>r.selected),[true,false]));
 await api(w).preview();
 check('重新检查保留勾选状态',()=>assert.deepEqual(activeRows(w).map(r=>r.selected),[true,false]));
 api(w).closeNameReview();api(w).selectAll(true);confirmNames(w);await api(w).execute();
 check('只执行已检查项，GPU 进入独立待办',()=>{assert.deepEqual(t.writes,['Alpha_01','Beta_02']);assert.deepEqual(activeRows(w).map(r=>r.state),['done','pending']);assert.equal(state(w).pending.length,1);assert.equal(w.document.getElementById('fwimp-btnExec').disabled,true);});
 api(w).newBatch();
 check('新建批次保留历史和 GPU 待办',()=>{assert.equal(state(w).batches.length,2);assert.equal(state(w).pending.length,1);assert.equal(activeRows(w).length,0);});
 await add(w,'F:/packs/a | Clash_01\nF:/packs/b | Clash_01');
 check('同批目标重复阻止执行',()=>{assert(activeRows(w).every(r=>r.state==='conflict'));assert(w.document.getElementById('fwimp-btnExec').disabled);});
 api(w).edit('bulk');w.document.getElementById('fwimp-editText').value='F:/packs/a | Clash | 01 | 带编号\nF:/packs/b | Clash | 02 | 带编号';w.document.querySelector('#fwimp-editor .btn').click();while(w.eval('Workbench.busy'))await pause();
 check('批量修改同步行名称并重新检查',()=>{assert.deepEqual(activeRows(w).map(r=>r.as),['Clash_01','Clash_02']);assert(activeRows(w).every(r=>r.state==='ready'));});
 const name=w.document.getElementById('fwimp-name');name.value='Renamed';name.dispatchEvent(new w.Event('input'));const index=w.document.getElementById('fwimp-index');index.value='03';index.dispatchEvent(new w.Event('input'));
 check('单项改名立即作废旧计划，列表同步',()=>{assert.equal(activeRows(w)[0].state,'unchecked');assert.equal(activeRows(w)[0].as,'Renamed_03');assert(w.document.getElementById('fwimp-list').textContent.includes('Renamed'));});
 await api(w).preview();
 const recovered=boot({state:state(w),stubImport:true});await pause();
 check('刷新页面恢复批次和待办，旧检查结果不能直接执行',()=>{assert.equal(state(recovered.w).pending.length,1);assert(activeRows(recovered.w).every(r=>r.state==='unchecked'));assert(recovered.w.document.getElementById('fwimp-btnExec').disabled);});recovered.close();t.close();
 const fail=boot({stubImport:true,onImport:()=>{throw Error('模拟连接中断');}});await pause();await add(fail.w,'F:/packs/a | FailA_01\nF:/packs/b | FailB_02');confirmNames(fail.w);await api(fail.w).execute();
 check('中途失败停止后续项且保留失败原因',()=>{assert.deepEqual(fail.writes,['FailA_01']);assert.deepEqual(activeRows(fail.w).map(r=>r.state),['failed','unchecked']);assert(activeRows(fail.w)[0].errs.some(e=>e.includes('模拟连接中断')));});fail.close();
 const stop=boot({stubImport:true,onImport:async(w)=>api(w).stop()});await pause();await add(stop.w,'F:/packs/a | StopA_01\nF:/packs/b | StopB_02');confirmNames(stop.w);await api(stop.w).execute();
 check('停止只在完整素材包之间生效',()=>{assert.deepEqual(stop.writes,['StopA_01']);assert.deepEqual(activeRows(stop.w).map(r=>r.state),['done','unchecked']);});stop.close();
 const existing=boot({stubImport:true,exists:()=>true});await pause();await add(existing.w,'F:/packs/a | Existing_01');
 check('已有目标阻止覆盖',()=>{assert.equal(activeRows(existing.w)[0].state,'conflict');assert(existing.w.document.getElementById('fwimp-btnExec').disabled);assert.equal(existing.writes.length,0);});existing.close();
 const real=boot();await pause();await add(real.w,'F:/packs/a | ReadOnly_01');check('原始引擎搭配新 UI 的检查路径可运行，未触发写入',()=>{assert.deepEqual(real.errors,[]);assert.equal(activeRows(real.w)[0].state,'ready');assert(real.calls.every(c=>['GetPlatformName','DoesAssetExist','ExecutePythonCommandEx'].includes(c.function)));});real.close();
 const unknown=boot({ambiguousExists:true});await pause();await add(unknown.w,'F:/packs/a | Unknown_01');check('接口缺少存在性结果时阻止执行',()=>{assert.equal(activeRows(unknown.w)[0].state,'error');assert(unknown.w.document.getElementById('fwimp-btnExec').disabled);});unknown.close();
 const offline=boot({offline:true});await pause();await add(offline.w,'F:/packs/a | Offline_01');check('UE 离线显示原因并阻止导入',()=>{assert.equal(offline.w.document.getElementById('conn').textContent,'未连接 UE');assert.equal(activeRows(offline.w)[0].state,'error');assert.deepEqual(offline.errors,[]);});offline.close();
 let occupied=false;const race=boot({stubImport:true,exists:()=>occupied});await pause();await add(race.w,'F:/packs/a | Race_01');confirmNames(race.w);occupied=true;await api(race.w).execute();check('检查后出现同名目标，在写入前再次拦截',()=>{assert.equal(race.writes.length,0);assert.equal(activeRows(race.w)[0].state,'failed');});race.close();
 let specName='Before';const sourceChange=boot({stubImport:true,specName:()=>specName});await pause();await add(sourceChange.w,'F:/packs/a | Changed_01');confirmNames(sourceChange.w);specName='After';await api(sourceChange.w).execute();check('素材包在检查后变化，禁止使用过期计划',()=>{assert.equal(sourceChange.writes.length,0);assert(activeRows(sourceChange.w)[0].errs[0].includes('发生变化'));});sourceChange.close();
 let release;const single=boot({stubImport:true,onImport:()=>new Promise(r=>release=r)});await pause();await add(single.w,'F:/packs/a | Single_01');confirmNames(single.w);const execution=api(single.w).execute();while(!release)await pause();const before=state(single.w).batches.length;api(single.w).newBatch();await api(single.w).execute();check('执行中锁定设置并拦截重复执行',()=>{assert.equal(single.writes.length,1);assert.equal(state(single.w).batches.length,before);assert([...single.w.document.querySelectorAll('.tool-fieldset')].every(x=>x.disabled));});release();await execution;single.close();
 const disk=boot({stubImport:true});await pause();await add(disk.w,'F:/packs/a | Disk_01');confirmNames(disk.w);disk.w.Storage.prototype.setItem=function(){throw Error('Storage full');};await api(disk.w).execute();check('本地记录无法保存时不开始写入',()=>{assert.equal(disk.writes.length,0);assert(disk.w.document.getElementById('fwimp-btnExec').disabled);});disk.close();
 const gpu=boot({stubImport:true,finish:true});await pause();await add(gpu.w,'F:/packs/gpu-pack | Gpu_01');confirmNames(gpu.w);await api(gpu.w).execute();await api(gpu.w).finish();check('未确认重启时不能收尾',()=>assert.equal(state(gpu.w).pending.length,1));gpu.w.document.getElementById('fwimp-restarted').checked=true;await api(gpu.w).finish();check('GPU 收尾成功后才移除待办并更新批次',()=>{assert.equal(state(gpu.w).pending.length,0);assert.equal(activeRows(gpu.w)[0].state,'done');});gpu.close();
 const gpuFail=boot({stubImport:true,finish:true,finishFail:true});await pause();await add(gpuFail.w,'F:/packs/gpu-pack | GpuFail_01');confirmNames(gpuFail.w);await api(gpuFail.w).execute();gpuFail.w.document.getElementById('fwimp-restarted').checked=true;await api(gpuFail.w).finish();check('GPU 收尾失败保留待办',()=>{assert.equal(state(gpuFail.w).pending.length,1);assert.equal(activeRows(gpuFail.w)[0].state,'pending');});gpuFail.close();
 const multiSpec=JSON.parse(fs.readFileSync('D:/ProjectTextures/FireWorksLab/TR2L_____V5/cascade.json','utf8'));
 const multi=boot({fixture:multiSpec,stubImport:true});await pause();await add(multi.w,'D:/ProjectTextures/FireWorksLab/TR2L_____V5 | FireWorks_Trail_High_01');
 check('真实多贴图包通过完整界面检查，显示 8 项且需确认',()=>{const r=activeRows(multi.w)[0];assert.equal(r.state,'ready');assert.deepEqual(r.errs,[]);assert.equal(Object.keys(r.assets).length,8);assert.equal(new Set(Object.values(r.assets).map(p=>p.toLowerCase())).size,8);assert.equal(multi.w.document.getElementById('fwimp-btnExec').disabled,true);assert.deepEqual(multi.errors,[]);});
 confirmNames(multi.w);await api(multi.w).execute();check('多贴图包的已确认计划传入执行流程',()=>{assert.deepEqual(multi.writes,['FireWorks_Trail_High_01']);assert.equal(activeRows(multi.w)[0].state,'done');});
 api(multi.w).newBatch();await add(multi.w,'D:/ProjectTextures/FireWorksLab/TR2L_____V5 | Clash_01\nD:/ProjectTextures/FireWorksLab/TR2L_____V5 | Clash_01');
 check('跨包重名仍拦截，并准确说明修改哪一类名称',()=>{assert(activeRows(multi.w).every(r=>r.state==='conflict'));assert(activeRows(multi.w).every(r=>r.errs.some(e=>e.includes('不同素材包生成同一目标'))));assert(multi.w.document.getElementById('fwimp-btnExec').disabled);});multi.close();
 console.log('\n'+passed+' checks passed. All engine traffic was mocked; no real UE writes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
