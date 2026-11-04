const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(__dirname+'/../df-fx-workbench_v2_locmai.html','utf8');
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
const pause=()=>new Promise(r=>setTimeout(r,20));
function boot(width=1366){
 const errors=[],writes=[],calls=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const start=html.indexOf('  async function importOne(it){'),end=html.indexOf('  async function execute(){',start);
 const isolated=html.slice(0,start)+'async function importOne(it){window.__writes.push(it.as);}\n'+html.slice(end);
 const spec={format:'fwl.cascade/1',name:'Fixture',textures:{},materials:{m:{role:'soft_dot'}},emitters:[{name:'Spark',material:'m',modules:[]}]};
 const dom=new JSDOM(isolated,{url:'http://isolated.invalid/material',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  Object.defineProperty(w,'innerWidth',{value:width,writable:true});w.__writes=writes;w.confirm=()=>false;
  w.fetch=async(_,opts)=>{const request=JSON.parse(opts.body);calls.push(request);let data={return_value:'True'};
   if(request.function==='DoesAssetExist')data={return_value:'False'};
   else if(request.function==='GetPlatformName')data={return_value:'Windows'};
   else if(request.function==='ExecutePythonCommandEx'){
    if(require('./mock-import-policy.cjs').simulatePolicy(request.args.PythonCommand))return{ok:true,json:async()=>({success:true,data})};
    if(request.args.PythonCommand.includes("print('FWLJSON:'"))data.out_LogOutput='Output='+JSON.stringify('FWLJSON:'+JSON.stringify({spec,exists:{}}));
    else throw Error('Unexpected native operation');
   }else throw Error('Unexpected engine write: '+request.function);
   return{ok:true,json:async()=>({success:true,data})};
  };
 }});
 return{w:dom.window,errors,writes,calls,close:()=>dom.window.close()};
}
const el=(w,id)=>w.document.getElementById('fwimp-'+id);
const api=w=>w.eval('FwImporter');
async function add(w){api(w).edit('bulk');el(w,'editText').value='F:/packs/a | MaterialA_01\nF:/packs/b | MaterialB_01';await api(w).workspacePrimary();}

(async()=>{
 const t=boot();await pause();
 const beforeHtml=fs.readFileSync(__dirname+'/backups/20261009-material-before.html','utf8'),crypto=require('node:crypto'),protectedFiles=JSON.parse(fs.readFileSync(__dirname+'/backups/20261009-material-protected.json','utf8'));
 check('native and planning sources are byte-for-byte preserved',()=>{for(const [file,hash] of Object.entries(protectedFiles))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(__dirname+'/'+file)).digest('hex'),hash,file);for(const [a,b]of [['const AssetCopier','const MaterialCopier'],['const MaterialCopier','const WeaponConfig'],['const WeaponConfig','const ResourceFX'],['const ResourceFX','const Workbench'],['const ShowBlueprintData','\nWorkbench.init();']]){const end=a==='const ShowBlueprintData'?b:b;assert.equal(html.slice(html.indexOf(a),html.indexOf(end)),beforeHtml.slice(beforeHtml.indexOf(a),beforeHtml.indexOf(end)),a);}});

 check('selected Material implementation is initialized',()=>assert.equal(t.w.document.body.dataset.designSystem,'material3'));
 check('official offline icons and clear group semantics',()=>{assert(t.w.document.querySelectorAll('.sidebar .md-icon').length>=6);assert.equal(t.w.document.querySelector('.sidebar .tab.active').getAttribute('aria-current'),'page');});
 check('three real panes remain visible on desktop',()=>{for(const selector of ['.fw-queue-pane','.fw-settings-pane','.fw-name-review'])assert(!t.w.document.querySelector(selector).hidden);assert(t.w.document.querySelector('.md-pane-tabs').hidden);});
 check('click feedback does not replace core action',()=>{const button=el(t.w,'primary');button.dispatchEvent(new t.w.MouseEvent('pointerdown',{bubbles:true,clientX:8,clientY:8}));assert(button.querySelector('.md-ripple'));assert.equal(t.writes.length,0);});
 api(t.w).edit('add');await api(t.w).workspacePrimary();
 check('invalid required field is described and focused without losing input',()=>{assert.equal(el(t.w,'editDir').getAttribute('aria-invalid'),'true');assert.equal(t.w.document.activeElement,el(t.w,'editDir'));assert(t.w.document.getElementById(el(t.w,'editDir').getAttribute('aria-describedby')).textContent);assert.equal(t.writes.length,0);});
 el(t.w,'editDir').value='F:/pack';el(t.w,'editDir').dispatchEvent(new t.w.Event('input',{bubbles:true}));
 check('editing clears only display validation feedback',()=>assert(!el(t.w,'editDir').hasAttribute('aria-invalid')));
 api(t.w).cancelWorkspaceEdit();await add(t.w);
 check('asset planned actions are neutral and names stay complete',()=>{const names=t.w.document.querySelectorAll('.fw-final-name');assert(names.length);assert([...names].every(n=>n.textContent===n.title));assert(t.w.document.querySelector('.fw-operation').dataset.actionRole);});
 await api(t.w).workspacePrimary();
 check('confirmation is explicit and never imports',()=>{assert.equal(t.writes.length,0);assert.match(el(t.w,'execSummary').textContent,/已确认 1 \/ 2/);});
 el(t.w,'name').value='Changed';el(t.w,'name').dispatchEvent(new t.w.Event('input',{bubbles:true}));
 check('changing the next package still invalidates confirmation',()=>{assert.equal(el(t.w,'primary').dataset.action,'check');assert(el(t.w,'btnExec').disabled);});
 let release;const busy=t.w.eval('Workbench').run('fixture',()=>new Promise(r=>release=r));
 check('async operation has busy semantics and duplicate action is disabled',()=>{assert.equal(t.w.document.querySelector('.content').getAttribute('aria-busy'),'true');assert(el(t.w,'primary').disabled);});release();await busy;
 check('busy state clears correctly',()=>assert.equal(t.w.document.querySelector('.content').getAttribute('aria-busy'),'false'));
 t.w.eval('MaterialWorkbench').toast('目标路径已复制。');
 check('result is announced in a dismissible toast',()=>{const toast=t.w.document.getElementById('md-toast');assert(!toast.hidden);assert.equal(toast.getAttribute('role'),'status');assert.match(toast.textContent,/已复制/);toast.querySelector('button').click();assert(toast.hidden);});
 check('log text selection pauses auto follow',()=>{const h=t.w.document.getElementById('log');h.textContent='test selected log';const selection=t.w.getSelection(),range=t.w.document.createRange();range.selectNodeContents(h);selection.removeAllRanges();selection.addRange(range);assert.equal(t.w.eval('WorkbenchLog').beforeAppend().follow,false);t.w.eval('WorkbenchLog').latest();assert(selection.isCollapsed);assert.equal(t.w.eval('WorkbenchLog').beforeAppend().follow,true);});
 check('no isolated startup script errors',()=>assert.deepEqual(t.errors,[]));t.close();

 const narrow=boot(900);await pause();
 check('narrow view shows accessible pane navigation',()=>{assert(!narrow.w.document.querySelector('.md-pane-tabs').hidden);assert.equal(narrow.w.document.querySelectorAll('.fw-workspace>section:not([hidden])').length,1);});
 narrow.w.document.getElementById('wb-tools-toggle').click();narrow.w.dispatchEvent(new narrow.w.Event('resize'));
 check('tablet drawer stays open until explicitly closed',()=>assert(narrow.w.document.body.classList.contains('wb-tools-open')));narrow.w.document.getElementById('wb-tools-scrim').click();
 const material=narrow.w.eval('MaterialWorkbench');
 material.setPane('queue');
 check('view switch cannot select or authorize packages',()=>{assert(!narrow.w.document.querySelector('.fw-queue-pane').hidden);assert.equal(narrow.writes.length,0);assert.equal(narrow.w.document.querySelector('#md-pane-queue').getAttribute('aria-selected'),'true');});
 const queueTab=narrow.w.document.getElementById('md-pane-queue');queueTab.focus();queueTab.dispatchEvent(new narrow.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
 check('pane tab keyboard navigation follows visual order',()=>{assert.equal(narrow.w.document.activeElement.id,'md-pane-settings');assert(!narrow.w.document.querySelector('.fw-settings-pane').hidden);});
 await add(narrow.w);
 check('finished check reveals preview on narrow screen without writing',()=>{assert(!narrow.w.document.querySelector('.fw-name-review').hidden);assert.equal(narrow.writes.length,0);});
 material.setPane('settings');await pause();
 const create=narrow.w.document.querySelector('.md-segmented [data-md-mode=create]');create.dispatchEvent(new narrow.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));await pause();
 check('visible segmented mode updates original controller and invalidates plan',()=>{assert.equal(el(narrow.w,'mode').value,'update');assert.equal(el(narrow.w,'primary').dataset.action,'check');assert.equal(narrow.w.document.querySelectorAll('.fw-workspace>section:not([hidden])').length,1);assert(!narrow.w.document.querySelector('.fw-settings-pane').hidden);assert.equal(narrow.w.document.querySelector('.md-segmented [aria-checked=true]').dataset.mdMode,'update');assert.equal(narrow.writes.length,0);});
 const update=narrow.w.document.querySelector('.md-segmented [data-md-mode=update]');update.dispatchEvent(new narrow.w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));await pause();
 check('radio arrow navigation cycles without retaining stale focus',()=>{assert.equal(el(narrow.w,'mode').value,'create');assert.equal(narrow.w.document.activeElement.dataset.mdMode,'create');});
 material.setPane('queue');api(narrow.w).refresh();
 check('rerender preserves one chosen responsive pane',()=>{assert.equal(narrow.w.document.querySelectorAll('.fw-workspace>section:not([hidden])').length,1);assert(!narrow.w.document.querySelector('.fw-queue-pane').hidden);});
 narrow.w.innerWidth=1400;narrow.w.dispatchEvent(new narrow.w.Event('resize'));
 check('return to desktop restores all panes without data loss',()=>{assert.equal(narrow.w.document.querySelectorAll('.fw-workspace>section:not([hidden])').length,3);assert.equal(JSON.parse(narrow.w.localStorage.getItem('fwimp.workbench.v2')).batches[0].rows.length,2);});
 narrow.close();
 const css=fs.readFileSync(__dirname+'/material.css','utf8');
 check('semantic theme, typography and feedback are centralized',()=>{for(const token of ['--md-surface:','--md-primary:','--md-on-primary:','--md-secondary-container:','--md-error-container:'])assert(css.includes(token));assert.match(css,/focus-visible/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/\.nav-group>summary[^}]*font-size:18px/);});
 console.log(passed+' Material presentation checks; simulated browser only, no visual/UE claim.');
})().catch(e=>{console.error(e);process.exitCode=1;});
