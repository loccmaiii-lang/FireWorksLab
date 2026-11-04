const fs=require('node:fs'),assert=require('node:assert/strict');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(__dirname+'/../df-fx-workbench_v2_locmai.html','utf8');
const real=JSON.parse(fs.readFileSync('D:/ProjectTextures/FireWorksLab/RiseTrail_L/cascade.json','utf8'));
const spec={format:'fwl.cascade/1',name:'SelectFixture',textures:{main:{class:'flipbook',file:'main.png',cols:1,rows:1},spare:{class:'flipbook',file:'spare.png',cols:1,rows:1},cut:{class:'cutout',file:'cut.png',cols:1,rows:1}},materials:{m:{role:real.materials.loop.role,textures:{main:'main'},scalars:{cols:1,rows:1}}},emitters:[{name:'One',material:'m',required:{cutout:'cut'},modules:[]}]};
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
    else if(c.includes("print('FWLJSON:'"))data.out_LogOutput='Output='+JSON.stringify('FWLJSON:'+JSON.stringify({spec,exists:{main:true,spare:true,cut:true}}));
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
 await select(t.w,'tex:cut',false);assert(!el(t.w,'btnConfirmNames').disabled,'Unchecked optional cutout must not remain required');assert.match(el(t.w,'reviewContent').textContent,/不使用轮廓图/);console.log('PASS unchecked cutout is omitted without dependency error');
 await select(t.w,'tex:cut',true);assert(!el(t.w,'btnConfirmNames').disabled);console.log('PASS rechecking imports and uses cutout');
 await select(t.w,'tex:cut',false);const reuse=t.w.document.querySelector('[data-asset-reuse-key="tex:cut"]');assert(reuse);reuse.checked=true;reuse.dispatchEvent(new t.w.Event('change',{bubbles:true}));await settle(t.w);assert(el(t.w,'btnConfirmNames').disabled);assert.match(row(t.w).errs.join(' '),/依赖资产不存在/);assert.deepEqual(row(t.w).optionalReuseAssetKeys,['tex:cut']);console.log('PASS explicit missing cutout reuse blocks instead of silently importing');
 const saved=state(t.w),paths=plain(row(t.w).assets);t.close();
 const exists={[paths['tex:cut']]:true},restored=boot(saved,exists);await pause();await api(restored.w).preview();assert(!el(restored.w,'btnConfirmNames').disabled);assert(restored.w.document.querySelector('[data-asset-reuse-key="tex:cut"]').checked);el(restored.w,'btnConfirmNames').click();await api(restored.w).execute();assert.equal(restored.writes.length,1);assert(!restored.writes[0].selectedAssetKeys.includes('tex:cut'));assert.deepEqual(restored.writes[0].optionalReuseAssetKeys,['tex:cut']);restored.close();console.log('PASS refresh preserves reuse and keeps it outside write scope');
 const changed=boot(saved,exists);await pause();await api(changed.w).preview();el(changed.w,'btnConfirmNames').click();api(changed.w).reviewNames();await api(changed.w).setAssetReuse(row(changed.w).id,'tex:cut',false);api(changed.w).closeNameReview();assert(el(changed.w,'btnExec').disabled);assert.deepEqual(row(changed.w).optionalReuseAssetKeys,[]);changed.close();console.log('PASS changing reuse invalidates confirmation');
 const locked=boot(saved,exists);await pause();await api(locked.w).preview();let release;const busy=locked.w.eval('Workbench').run('busy fixture',()=>new Promise(resolve=>release=resolve));await api(locked.w).setAssetReuse(row(locked.w).id,'tex:cut',false);assert.deepEqual(row(locked.w).optionalReuseAssetKeys,['tex:cut']);release();await busy;locked.close();console.log('PASS busy execution locks optional reuse');
 const gone=boot(saved,exists);await pause();await api(gone.w).preview();el(gone.w,'btnConfirmNames').click();delete exists[paths['tex:cut']];await api(gone.w).execute();assert.equal(gone.writes.length,0);assert.match(row(gone.w).errs.join(' '),/依赖资产不存在/);gone.close();console.log('PASS reused cutout disappearance invalidates execution');
 const wrong=boot(saved,{[paths['tex:cut']]:true},{[paths['tex:cut']]:'Material'});await pause();await api(wrong.w).preview();assert(el(wrong.w,'btnConfirmNames').disabled);assert.match(row(wrong.w).errs.join(' '),/依赖资产类型不符/);wrong.close();console.log('PASS wrong class cutout reuse blocks');
 const omitted=boot();await pause();api(omitted.w).edit('bulk');el(omitted.w,'editText').value='D:/packs/select | SelectFixture_01';omitted.w.document.querySelector('#fwimp-editor .btn').click();await settle(omitted.w);await select(omitted.w,'tex:cut',false);el(omitted.w,'btnConfirmNames').click();api(omitted.w).reviewNames();await select(omitted.w,'tex:cut',true);api(omitted.w).closeNameReview();assert(el(omitted.w,'btnExec').disabled);assert.deepEqual(row(omitted.w).optionalReuseAssetKeys,[]);omitted.close();console.log('PASS selection changes invalidate prior confirmation and clear reuse');
 const {fixture}=require('./check-import-update-backend.cjs');
 function setup(){const t=fixture();t.it.spec.textures.cut={class:'cutout',file:'cut.png',cols:1,rows:1};for(const e of t.it.spec.emitters)e.required={cutout:'cut',sub_images:[16,1]};t.it.assets=t.b.makePlan(t.it.spec,t.it.as);t.it.selectedAssetKeys=['ps'];return t;}
 const noCut=setup(),source=plain(noCut.it.spec);await noCut.run();const required=noCut.calls.filter(c=>c.body.properties?.Material).map(c=>c.body.properties);assert(required.length===2);assert(required.every(p=>!p.CutoutTexture));assert(required.every(p=>p.SubImages_Horizontal===16));assert.deepEqual(noCut.it.spec,source);assert(!noCut.calls.some(c=>c.body.args?.PythonCommand?.includes('import_asset_tasks')));assert(noCut.calls.filter(c=>c.body.args?.PythonCommand?.includes('# FWL_SELECTION_REUSE')).every(c=>!c.body.args.PythonCommand.includes('tex:cut')));console.log('PASS full update omits cutout reference and write without changing source or frame grid');
 for(const mode of ['create','update']){const full=setup();full.it.mode=mode;full.it.selectedAssetKeys=['ps','mat:m','tex:main'];await full.run();assert.equal(full.it.importProgress.saved.length,3);assert(!full.it.importProgress.saved.includes(full.it.assets['tex:cut']));assert(full.calls.filter(c=>c.body.properties?.Material).every(c=>!c.body.properties.CutoutTexture));const importer=full.calls.find(c=>c.body.args?.PythonCommand?.includes('import_asset_tasks'));assert(importer&&!importer.body.args.PythonCommand.includes('cut.png'));}console.log('PASS full create and update skip optional cutout at import/reference/save stages');
 const mandatory=setup();mandatory.it.spec.materials.m.textures.extra='cut';await mandatory.b.importEmitters(mandatory.it,mandatory.ps,{m:mandatory.it.assets['mat:m']});assert(mandatory.calls.filter(c=>c.body.properties?.Material).every(c=>c.body.properties.CutoutTexture));console.log('PASS cutout also used by material stays mandatory');
 const yesCut=setup();yesCut.it.optionalReuseAssetKeys=['tex:cut'];await yesCut.run();assert(yesCut.calls.filter(c=>c.body.properties?.Material).every(c=>c.body.properties.CutoutTexture));assert(!yesCut.it.importProgress.saved.includes(yesCut.it.assets['tex:cut']));console.log('PASS explicit reuse references cutout without saving or importing it');
 const selected=setup();selected.it.selectedAssetKeys=['ps','tex:cut'];await selected.b.importEmitters(selected.it,selected.ps,{m:selected.it.assets['mat:m']});assert(selected.calls.filter(c=>c.body.properties?.Material).every(c=>c.body.properties.CutoutTexture));console.log('PASS selected cutout remains wired to emitter');
 const invalid=setup();invalid.it.optionalReuseAssetKeys=['tex:main'];await assert.rejects(invalid.run(),/轮廓图复用选择已失效/);assert.equal(invalid.calls.length,0);console.log('PASS invalid optional reuse is rejected before engine requests');
 console.log('All checks use mocked UE, no actual asset writes');
})().catch(e=>{console.error(e);process.exitCode=1;});
