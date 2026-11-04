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
 const t=boot();await pause();
 check('three panes share a fixed workspace',()=>{assert(t.w.document.querySelector('.fw-workspace'));assert(el(t.w,'list').closest('.fw-workspace'));assert(el(t.w,'detail').closest('.fw-workspace'));assert(el(t.w,'nameReview').closest('.fw-workspace'));assert(el(t.w,'primary'));});
 await add(t.w,'F:/packs/a | WorkA_01\nF:/packs/b | WorkB_01');
 check('preview keeps queue and settings visible',()=>{assert(!el(t.w,'main').hidden);assert(!el(t.w,'detail').hidden);assert.equal(el(t.w,'reviewContent').querySelectorAll('.fw-review-pack').length,1);});
 const ids=rows(t.w).map(r=>r.id);
 await api(t.w).workspacePrimary();
 check('current confirmation advances without writing',()=>{assert.equal(t.writes.length,0);assert.match(el(t.w,'execHint').textContent,/1.*待确认/);assert.equal(t.w.document.querySelector('#fwimp-list .inspect').dataset.id,ids[1]);assert(el(t.w,'reviewContent').textContent.includes('WorkB'));});
 await api(t.w).workspacePrimary();
 check('all confirmed exposes explicit execution',()=>{assert.equal(t.writes.length,0);assert.equal(el(t.w,'primary').dataset.action,'execute');assert(!el(t.w,'btnExec').disabled);});
 const input=el(t.w,'name');input.focus();input.value='WorkBChanged';input.dispatchEvent(new t.w.Event('input'));
 check('editing invalidates only current plan and preserves focus',()=>{assert.equal(el(t.w,'name'),input);assert.equal(t.w.document.activeElement,input);assert(el(t.w,'btnExec').disabled);assert.equal(el(t.w,'primary').dataset.action,'check');assert.match(el(t.w,'list').textContent,/名称已确认/);});
 await api(t.w).workspacePrimary();await api(t.w).workspacePrimary();
 check('rechecking and confirmation do not silently execute',()=>{assert.equal(t.writes.length,0);assert.equal(el(t.w,'primary').dataset.action,'execute');});
 await api(t.w).workspacePrimary();
 check('explicit execute writes both exact selected packages',()=>{assert.deepEqual(t.writes.map(x=>x.as),['WorkA_01','WorkBChanged_01']);assert.deepEqual(t.errors,[]);});
 t.close();
 const cancel=boot();await pause();await add(cancel.w,'F:/packs/a | CancelA_01');const before=state(cancel.w);api(cancel.w).edit('add');el(cancel.w,'editDir').value='F:/unused';api(cancel.w).cancelWorkspaceEdit();
 check('cancel addition keeps original batch',()=>{assert.deepEqual(state(cancel.w),before);assert(el(cancel.w,'editor').hidden);assert(!el(cancel.w,'detail').hidden);});cancel.close();
 const select=boot();await pause();await add(select.w,'F:/packs/a | SelectA_01\nF:/packs/b | SelectB_01');select.w.document.querySelectorAll('#fwimp-list input')[1].click();select.w.document.querySelectorAll('#fwimp-list .fw-item-name')[1].click();
 check('inspect unselected package does not select or authorize it',()=>{assert(!rows(select.w)[1].selected);assert.equal(el(select.w,'primary').dataset.action,'next');assert.equal(select.writes.length,0);});await api(select.w).workspacePrimary();
 check('next returns to selected unconfirmed package',()=>assert(el(select.w,'reviewContent').textContent.includes('SelectA')));
 let release;const busy=select.w.eval('Workbench').run('fixture lock',()=>new Promise(r=>release=r));await api(select.w).workspacePrimary();
 check('busy primary cannot confirm or write',()=>{assert(el(select.w,'primary').disabled);assert.equal(select.writes.length,0);assert(el(select.w,'btnExec').disabled);});release();await busy;select.close();
 const filtered=boot();await pause();await add(filtered.w,'F:/packs/a | FilterA_01\nF:/packs/b | FilterB_01');api(filtered.w).filter('errors');await api(filtered.w).workspacePrimary();
 check('advancing reveals selected package even after error filter',()=>{assert.equal(filtered.w.document.querySelector('#fwimp-list .inspect').dataset.id,rows(filtered.w)[1].id);assert.match(el(filtered.w,'list').textContent,/FilterB/);});
 api(filtered.w).toggleWorkspacePaths();
 check('full target paths and source settings remain available',()=>{assert(el(filtered.w,'reviewContent').classList.contains('fw-show-paths'));assert.equal(el(filtered.w,'paths').getAttribute('aria-expanded'),'true');for(const path of Object.values(rows(filtered.w)[1].assets)){assert(el(filtered.w,'reviewContent').textContent.includes(path.slice(0,path.lastIndexOf('/'))));}});
 const restoredState=state(filtered.w);filtered.close();const restored=boot({state:restoredState});await pause();
 check('reload keeps selected records but requires new checks',()=>{assert.equal(rows(restored.w).length,2);assert(rows(restored.w).every(r=>r.selected&&r.state==='unchecked'));assert(el(restored.w,'btnExec').disabled);assert.equal(el(restored.w,'primary').dataset.action,'check');});restored.close();
 const empty=boot();await pause();
 check('empty workspace points to addition and cannot write',()=>{assert.equal(el(empty.w,'primary').dataset.action,'add');assert(el(empty.w,'btnExec').disabled);assert(!el(empty.w,'main').hidden);});
 await api(empty.w).workspacePrimary();
 check('addition occupies middle pane without hiding queue or preview',()=>{assert(!el(empty.w,'editor').hidden);assert(el(empty.w,'detail').hidden);assert(!el(empty.w,'main').hidden);assert(el(empty.w,'editor').closest('.fw-settings-pane'));assert.equal(el(empty.w,'primary').dataset.action,'save');});empty.close();
 const css=fs.readFileSync(__dirname+'/fireworks-workspace.css','utf8');
 check('scoped viewport local scroll and fixed footer rules exist',()=>{assert.match(css,/grid-template-columns/);assert.match(css,/overflow:auto/);assert.match(css,/min-height:0/);assert.match(css,/\.fw-actions/);assert.match(css,/1100px/);assert.match(css,/600px/);});
 console.log(passed+' workspace checks; all UE mocked, no browser geometry verified');
})().catch(e=>{console.error(e);process.exitCode=1;});
