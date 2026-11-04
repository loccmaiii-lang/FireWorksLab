const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(__dirname+'/../df-fx-workbench_v2_locmai.html','utf8');
const real=JSON.parse(fs.readFileSync('D:/ProjectTextures/FireWorksLab/RiseTrail_L/cascade.json','utf8'));
const spec={format:'fwl.cascade/1',name:'SelectFixture',textures:{main:{class:'flipbook',file:'main.png',cols:1,rows:1},spare:{class:'flipbook',file:'spare.png',cols:1,rows:1}},materials:{m:{role:real.materials.loop.role,textures:{main:'main'},scalars:{cols:1,rows:1}}},emitters:[{name:'One',material:'m',modules:[]}]};
const pause=()=>new Promise(r=>setTimeout(r,15)),plain=v=>JSON.parse(JSON.stringify(v));
function boot(saved,existing={},classes={}){
 const writes=[],requests=[],errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const start=html.indexOf('  async function importOne(it){'),end=html.indexOf('  async function execute(){',start);
 const code=html.slice(0,start)+'  async function importOne(it){window.__write(it);}\n'+html.slice(end);
 const dom=new JSDOM(code,{url:'http://isolated.invalid/select',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  if(saved)w.localStorage.setItem('fwimp.workbench.v2',JSON.stringify(saved));w.confirm=()=>false;w.__write=it=>writes.push(plain(it));
  w.fetch=async(_,o)=>{const r=JSON.parse(o.body);requests.push(r);let data={return_value:'True'};
   if(r.function==='GetPlatformName')data.return_value='Windows';
   else if(r.function==='DoesAssetExist')data.return_value=existing[r.args.AssetPath]?'True':'False';
   else if(r.function==='ExecutePythonCommandEx'){
    const c=r.args.PythonCommand;
    if(require('./mock-import-policy.cjs').simulatePolicy(c)){}
    else if(c.includes('# FWL_SELECTION_REUSE')){const entries=JSON.parse(c.match(/entries = (\[.*\])/)[1]);data.out_LogOutput='Output='+JSON.stringify('FWLREUSE:'+JSON.stringify(entries.map(([key,pkg])=>({key,pkg,exists:!!existing[pkg],class:classes[pkg]|| (key.startsWith('tex:')?'Texture2D':'MaterialInstanceConstant')}))));}
    else if(c.includes("print('FWLJSON:'"))data.out_LogOutput='Output='+JSON.stringify('FWLJSON:'+JSON.stringify({spec,exists:{main:true,spare:true}}));
    else throw Error('Unexpected request blocked');
   }else throw Error('Unexpected engine request: '+r.function);
   return{ok:true,json:async()=>({success:true,data})};
  };
 }});return{w:dom.window,writes,errors,requests,close:()=>dom.window.close()};
}
const api=w=>w.eval('FwImporter'),el=(w,s)=>w.document.getElementById('fwimp-'+s),state=w=>JSON.parse(w.localStorage.getItem('fwimp.workbench.v2'));
const row=w=>{const s=state(w);return s.batches.find(b=>b.id===s.active).rows[0];};
async function settle(w){for(let i=0;i<200&&(w.eval('Workbench.busy')||el(w,'btnConfirmNames').textContent.includes('检查中'));i++)await pause();await pause();}
async function select(w,key,value){const input=w.document.querySelector('[data-asset-key="'+key+'"]');assert(input,'asset checkbox '+key);input.checked=value;input.dispatchEvent(new w.Event('change',{bubbles:true}));await settle(w);}
(async()=>{
 const t=boot();await pause();api(t.w).edit('bulk');el(t.w,'editText').value='D:/packs/select | SelectFixture_01';t.w.document.querySelector('#fwimp-editor .btn').click();await settle(t.w);
 assert.equal(el(t.w,'reviewContent').querySelectorAll('[data-asset-key]').length,4,'Each asset must be selectable');console.log('PASS per-asset preview controls');
 await select(t.w,'tex:spare',false);assert.deepEqual(row(t.w).excludedAssetKeys,['tex:spare']);assert(!el(t.w,'btnConfirmNames').disabled);console.log('PASS optional unused asset excluded');
 await select(t.w,'tex:main',false);assert(el(t.w,'btnConfirmNames').disabled);assert.match(el(t.w,'reviewContent').textContent,/依赖.*不存在|缺少.*依赖/);await api(t.w).execute();assert.equal(t.writes.length,0);console.log('PASS missing material texture dependency blocks');
 await select(t.w,'mat:m',false);assert(el(t.w,'btnConfirmNames').disabled);console.log('PASS missing particle material dependency blocks');
 await select(t.w,'ps',false);assert(el(t.w,'btnConfirmNames').disabled);console.log('PASS empty selection blocked');
 await select(t.w,'tex:spare',true);assert(!el(t.w,'btnConfirmNames').disabled);el(t.w,'btnConfirmNames').click();assert(!el(t.w,'btnExec').disabled);
 api(t.w).reviewNames();await select(t.w,'tex:main',true);api(t.w).closeNameReview();assert(el(t.w,'btnExec').disabled);console.log('PASS changing scope invalidates old confirmation');
 const saved=state(t.w);t.close();const restored=boot(saved);await pause();await api(restored.w).preview();assert.deepEqual(row(restored.w).excludedAssetKeys.sort(),['mat:m','ps']);assert(!restored.w.document.querySelector('[data-asset-key="ps"]').checked);console.log('PASS exclusions survive reload and recheck');
 el(restored.w,'btnConfirmNames').click();await api(restored.w).execute();assert.equal(restored.writes.length,1);assert.deepEqual(restored.writes[0].selectedAssetKeys.sort(),['tex:main','tex:spare']);assert.equal(row(restored.w).state,'done');assert.deepEqual(restored.errors,[]);console.log('PASS partial scope delivered to executor');restored.close();
 const {fixture}=require('./check-import-update-backend.cjs');
 const only=fixture();only.it.selectedAssetKeys=['tex:main'];const old=plain(only.get(only.ps));await only.run();assert.deepEqual(only.get(only.ps),old);assert.deepEqual(plain(only.it.importProgress.saved),[only.it.assets['tex:main']]);assert(!only.calls.some(c=>c.body.function==='DuplicateAsset'||c.body.function==='SpawnObject'));const backup=only.calls.find(c=>c.body.args?.PythonCommand?.includes("print('FWLBACKUP:'")).body.args.PythonCommand;assert(!backup.includes('"ps"')&&!backup.includes('"mat:m"'));console.log('PASS texture-only update never saves or rebuilds skipped assets');
 const particle=fixture();particle.it.selectedAssetKeys=['ps'];await particle.run();assert.equal(particle.it.importProgress.saved.length,1);assert.equal(particle.it.importProgress.emittersRebuilt,2);assert(!particle.calls.some(c=>c.body.function==='DuplicateAsset'||c.body.args?.PythonCommand?.includes('import_asset_tasks')));console.log('PASS particle-only update reuses existing material');
 const mi=fixture();mi.it.selectedAssetKeys=['mat:m'];await mi.run();assert.equal(mi.it.importProgress.saved.length,1);assert(!mi.calls.some(c=>c.body.function==='SpawnObject'||c.body.args?.PythonCommand?.includes('import_asset_tasks')));console.log('PASS material-only update reuses existing texture');
 for(const opts of [{missingDependency:true},{wrongDependency:true}]){const t=fixture(opts);t.it.selectedAssetKeys=['ps'];await assert.rejects(t.run(),/依赖资产不存在|依赖资产类型不符/);assert(!t.calls.some(c=>['SaveAsset','DuplicateAsset','SpawnObject'].includes(c.body.function)||/import_asset_tasks|FWLBACKUP/.test(c.body.args?.PythonCommand||'')));}console.log('PASS missing or wrong-type reuse blocked before writes');
 const nativeCreate=fixture();nativeCreate.it.mode='create';nativeCreate.it.selectedAssetKeys=['mat:m'];await nativeCreate.run();assert(!nativeCreate.calls.some(c=>c.body.args?.PythonCommand?.includes('create_asset(')));assert.deepEqual(plain(nativeCreate.it.importProgress.saved),[nativeCreate.it.assets['mat:m']]);console.log('PASS material-only creation never creates skipped PS');
 const invalid=fixture();invalid.it.selectedAssetKeys=['missing-key'];await assert.rejects(invalid.run(),/选择已失效/);assert.equal(invalid.calls.length,0);console.log('PASS invalid selection cannot write');
 const empty=fixture();empty.it.selectedAssetKeys=[];await assert.rejects(empty.run(),/未选择任何资产/);assert.equal(empty.calls.length,0);console.log('PASS direct empty selection cannot write');
 const seed=boot();await pause();api(seed.w).edit('bulk');el(seed.w,'editText').value='D:/packs/select | SelectFixture_01';seed.w.document.querySelector('#fwimp-editor .btn').click();await settle(seed.w);const full=state(seed.w),paths=plain(row(seed.w).assets);seed.close();
 full.batches[0].rows[0].excludedAssetKeys=['tex:main','tex:spare'];full.batches[0].rows[0].state='unchecked';
 const existing={[paths['tex:main']]:true},reuse=boot(full,existing);await pause();await api(reuse.w).preview();assert(!el(reuse.w,'btnConfirmNames').disabled);assert.match(el(reuse.w,'reviewContent').textContent,/复用现有依赖/);el(reuse.w,'btnConfirmNames').click();await api(reuse.w).execute();assert.equal(reuse.writes.length,1);assert.deepEqual(reuse.writes[0].selectedAssetKeys.sort(),['mat:m','ps']);assert.match(el(reuse.w,'list').textContent,/其余跳过/);reuse.close();console.log('PASS new package reuses checked existing texture without overwriting');
 const gone=boot(full,existing);await pause();await api(gone.w).preview();el(gone.w,'btnConfirmNames').click();delete existing[paths['tex:main']];await api(gone.w).execute();assert.equal(gone.writes.length,0);assert.match(row(gone.w).errs.join(' '),/依赖资产不存在/);gone.w.document.querySelector('#fwimp-list input').click();assert.equal(row(gone.w).state,'failed');gone.close();console.log('PASS dependency removed after confirmation blocks execution and preserves failure');
 const wrong=boot(full,{[paths['tex:main']]:true},{[paths['tex:main']]:'Material'});await pause();await api(wrong.w).preview();assert(el(wrong.w,'btnConfirmNames').disabled);assert.match(el(wrong.w,'reviewContent').textContent,/依赖资产类型不符/);wrong.close();console.log('PASS wrong existing class cannot be reused');
 const locked=boot();await pause();api(locked.w).edit('bulk');el(locked.w,'editText').value='D:/packs/select | SelectFixture_01';locked.w.document.querySelector('#fwimp-editor .btn').click();await settle(locked.w);let release;const work=locked.w.eval('Workbench').run('mock busy',()=>new Promise(r=>release=r));const before=plain(row(locked.w).excludedAssetKeys);await api(locked.w).setAssetSelected(row(locked.w).id,'ps',false);assert.deepEqual(row(locked.w).excludedAssetKeys,before);release();await work;locked.close();console.log('PASS busy task cannot change its selection');
 const skipChange=fixture();skipChange.it.selectedAssetKeys=['tex:main'];skipChange.it.targets=await skipChange.b.readUpdateTargets(skipChange.it);skipChange.nodes.set(skipChange.oldPaths[0],{...skipChange.get(skipChange.oldPaths[0]),EmitterName:'UserManualChange'});await skipChange.run();assert.equal(skipChange.get(skipChange.oldPaths[0]).EmitterName,'UserManualChange');console.log('PASS changes to skipped PS neither block unrelated update nor get overwritten');
 console.log('Selection tests use mocked UE only');
})().catch(e=>{console.error(e);process.exitCode=1;});
