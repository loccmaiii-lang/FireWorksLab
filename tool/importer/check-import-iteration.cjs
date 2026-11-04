const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(__dirname+'/../df-fx-workbench_v2_locmai.html','utf8');
const spec={format:'fwl.cascade/1',name:'Fixture',textures:{},materials:{m:{role:'soft_dot'}},emitters:[{name:'Spark',material:'m',modules:[]}]};
const pause=()=>new Promise(r=>setTimeout(r,20));
let passed=0;
function check(name,fn){fn();console.log('PASS '+name);passed++;}
function boot(options={}){
 const errors=[],writes=[],calls=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const start=html.indexOf('  async function importOne(it){'),end=html.indexOf('  async function execute(){',start);
 const source=html.slice(0,start)+`async function importOne(it){window.__writes.push(it);}\n`+html.slice(end);
 const dom=new JSDOM(source,{url:'https://isolated-test.invalid/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.__writes=options.onImport?{push:it=>{writes.push(it);options.onImport(it);}}:writes;w.confirm=()=>false;
  if(options.rows)w.localStorage.setItem('fwimp.workbench.v2',JSON.stringify({batches:[{id:'b',title:'Fixture',rows:options.rows}],active:'b'}));
  w.fetch=async(url,opt)=>{
   const body=JSON.parse(opt.body);calls.push(body);let data;
   if(body.function==='ExecutePythonCommandEx'&&require('./mock-import-policy.cjs').simulatePolicy(body.args.PythonCommand))return{ok:true,json:async()=>({success:true,data:{return_value:'True'}})};
   if(body.function==='GetPlatformName')data={return_value:'Windows'};
   else if(body.function==='DoesAssetExist')data={return_value:options.existing?'True':'False'};
   else if(body.function==='ExecutePythonCommandEx'){
    const code=body.args.PythonCommand;let tag,payload;
    if(code.includes("print('FWLJSON:'")){tag='FWLJSON:';payload={spec,exists:{},sourceHash:options.sourceHash?.()||'same'};}
    else if(code.includes("print('FWLTARGETS:'")){
     tag='FWLTARGETS:';const entries=JSON.parse(code.match(/entries = (\[.*\])\n/)[1]);
     payload=entries.map(([key,pkg])=>({key,pkg,exists:true,class:'ParticleSystem',tag:'fwl.cascade/1 Fixture -> Existing_01',diskHash:'same',sc:'added',dirty:false,editable:true}));
    }else if(code.includes("print('FWLPACKERROR:'")){tag='FWLPACKERROR:';payload={error:'missing_cascade',directory:'D:/packs',candidates:['D:/packs/RiseTrail_M','D:/packs/RiseTrail_L']};}
    else throw Error('Unrecognized Python fixture');
    if(options.missing&&tag==='FWLJSON:'&&code.includes('p = u"D:/packs"')){tag='FWLPACKERROR:';payload={error:'missing_cascade',directory:'D:/packs',candidates:['D:/packs/RiseTrail_M','D:/packs/RiseTrail_L']};}
    data={return_value:'True',out_LogOutput:'Output='+JSON.stringify(tag+JSON.stringify(payload))};
   }else if(body.path){
    data={properties:body.path.endsWith(':Old.LOD0')?{bEnabled:true,Modules:[]}:
      body.path.endsWith(':Old')?{EmitterName:'Old',LODLevels:[{path:body.path+'.LOD0'}]}:
      {Emitters:[{path:body.path+':Old',class:'ParticleSpriteEmitter'}],LODDistances:[0],LODSettings:[{}]}};
   }
   else throw Error('Unexpected fixture');
   return{ok:true,json:async()=>({success:true,data})};
  };
 }});
 const w=dom.window,api=()=>w.eval('FwImporter');
 const rows=()=>{const s=JSON.parse(w.localStorage.getItem('fwimp.workbench.v2'));return s.batches.find(b=>b.id===s.active).rows;};
 return{dom,w,api,rows,errors,writes,calls,close:()=>w.close()};
}
const row=(id,state,selected=true)=>({id,dir:'D:/packs',as:id==='done'?'Existing_01':'Test_01',state,selected,assets:{},errs:state==='error'?['Fixture missing file']:[]});
(async()=>{
 const t=boot({rows:[row('error','error'),row('conflict','conflict'),row('done','done')]});await pause();
 check('失败和冲突项无需改名就可取消勾选',()=>{const inputs=t.w.document.querySelectorAll('#fwimp-list input');assert.equal(inputs[0].disabled,false);inputs[0].click();assert.equal(t.rows()[0].selected,false);assert.equal(inputs[1].disabled,false);inputs[1].click();assert.equal(t.rows()[1].selected,false);});
 check('恢复的已完成项自动取消勾选',()=>assert.equal(t.rows()[2].selected,false));
 check('全选待处理和取消全部不会修改名称',()=>{t.api().selectAll(true);assert.deepEqual(t.rows().map(r=>r.selected),[true,true,false]);const clear=t.w.document.getElementById('fwimp-clearSelection');assert(clear);clear.click();assert(t.rows().every(r=>!r.selected));assert.equal(t.rows()[0].as,'Test_01');});
 check('页头与浏览器标题版本一致',()=>{const version=fs.readFileSync(__dirname+'/build.py','utf8').match(/^VERSION = '([^']+)'/m)?.[1];assert(version,'Build version missing');assert(t.w.document.title.includes('v'+version));assert(t.w.document.querySelector('.user-tag').textContent.includes('v'+version));});
 t.w.document.querySelectorAll('#fwimp-list .fw-item-name')[2].click();
 check('已完成项可同名准备更新并可从批次移除',()=>{assert(t.w.document.querySelector('#fwimp-detail [data-action="update"]'));assert(t.w.document.querySelector('#fwimp-detail [data-action="remove"]'));});
 t.close();
 const missing=boot({missing:true,rows:[row('missing','unchecked')]});await pause();await missing.api().preview();
 check('总目录错误提示说明缺 cascade 并给可选子目录',()=>{assert(missing.rows()[0].errs.some(e=>e.includes('cascade.json')));missing.api().closeNameReview();missing.w.document.querySelector('#fwimp-list .fw-item-name').click();assert(missing.w.document.getElementById('fwimp-detail').textContent.includes('RiseTrail_M'));assert(missing.w.document.querySelector('[data-action="use-directory"]'));assert(!missing.w.document.getElementById('fwimp-detail').textContent.includes('Traceback'));});
 missing.w.document.querySelector('[data-action="use-directory"]').click();while(missing.w.eval('Workbench.busy'))await pause();
 check('点击正确子目录只重新检查，不自动执行',()=>{assert.equal(missing.rows()[0].dir,'D:/packs/RiseTrail_M');assert.equal(missing.rows()[0].state,'ready');assert.equal(missing.writes.length,0);assert(missing.w.document.getElementById('fwimp-btnExec').disabled);});missing.close();
 const update=boot({existing:true,rows:[row('done','done')]});await pause();update.api().prepareUpdate('done');await update.api().preview(['done']);
 check('同名更新通过检查且明确显示旧发射器将全部替换',()=>{assert.equal(update.rows()[0].mode,'update');assert.equal(update.rows()[0].as,'Existing_01');assert.equal(update.rows()[0].state,'ready');assert(update.w.document.getElementById('fwimp-reviewContent').textContent.includes('全部重建'));assert(update.w.document.getElementById('fwimp-btnExec').disabled);});
 update.api().confirmNames();await update.api().execute();
 check('确认后传入真正 update 计划并完成后取消勾选',()=>{assert.equal(update.writes.length,1);assert.equal(update.writes[0].mode,'update');assert.equal(update.rows()[0].state,'done');assert.equal(update.rows()[0].selected,false);});update.close();
 const mixed=boot({rows:[row('a','unchecked'),row('b','error')]});await pause();await mixed.api().preview(['a']);mixed.api().confirmNames();await mixed.api().execute();
 check('已选检查失败项不会被执行静默跳过',()=>assert.equal(mixed.writes.length,0));mixed.close();
 const cancel=boot({rows:[row('done','done')]});await pause();cancel.api().prepareUpdate('done');cancel.api().cancelUpdate('done');
 check('尚未执行的更新可取消并恢复完成记录，名称不变',()=>{assert.equal(cancel.rows()[0].state,'done');assert.equal(cancel.rows()[0].selected,false);assert.equal(cancel.rows()[0].as,'Existing_01');assert.equal(cancel.writes.length,0);});cancel.close();
 const partial=boot({existing:true,rows:[row('done','done')],onImport:it=>{const e=Error('Fixture partial update');e.importProgress={stage:'粒子系统',saved:['texture'],backup:'D:/fixture-backup'};throw e;}});await pause();partial.api().prepareUpdate('done');await partial.api().preview(['done']);partial.api().confirmNames();await partial.api().execute();partial.api().cancelUpdate('done');
 check('部分更新失败不能仅取消界面就恢复虚假的已完成状态',()=>{assert.equal(partial.rows()[0].state,'failed');assert.equal(partial.writes.length,1);assert.equal(partial.w.document.getElementById('fwimp-btnExec').disabled,true);});partial.close();
 let hash='before';const source=boot({rows:[row('source','unchecked')],sourceHash:()=>hash});await pause();await source.api().preview();source.api().confirmNames();hash='after';await source.api().execute();
 check('源文件指纹改变时旧确认不能写入',()=>{assert.equal(source.writes.length,0);assert.equal(source.rows()[0].state,'failed');assert(source.rows()[0].errs.some(e=>e.includes('发生变化')));});source.close();
 console.log(passed+' iteration UI checks passed; all UE traffic simulated.');
})().catch(e=>{console.error(e);process.exitCode=1;});
