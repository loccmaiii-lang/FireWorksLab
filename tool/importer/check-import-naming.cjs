const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const {loadBackend}=require('./import-backend.cjs');
const html=fs.readFileSync(__dirname+'/../df-fx-workbench_v2_locmai.html','utf8');
const spec={format:'fwl.cascade/1',name:'Fixture',textures:{main:{class:'flipbook',file:'main.png',cols:4,rows:4},cut:{class:'cutout',file:'cut.png'},ramp:{class:'ramp',file:'ramp.png'}},materials:{m:{role:'flipbook_rgba',textures:{main:'main',ramp:'ramp'},scalars:{rows:4,cols:4}}},emitters:[{name:'Spark',material:'m',required:{cutout:'cut'},modules:[]}]};
const backend=loadBackend(async()=>{throw Error('Native calls forbidden');});
const plain=x=>JSON.parse(JSON.stringify(x));
const basename=p=>p.split('/').pop();
const options=(baseName,assetIndex='01',particleNumbered=false)=>({baseName,assetIndex,particleNumbered});
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
const pause=()=>new Promise(resolve=>setTimeout(resolve,15));
const el=(w,id)=>w.document.getElementById('fwimp-'+id);
const api=w=>w.eval('FwImporter');
const state=w=>JSON.parse(w.localStorage.getItem('fwimp.workbench.v2'));
const rows=w=>{const s=state(w);return s.batches.find(b=>b.id===s.active).rows;};
async function idle(w){for(let n=0;n<180&&w.eval('Workbench.busy');n++)await pause();assert.equal(w.eval('Workbench.busy'),false);}
function boot(config={}){
 const errors=[],calls=[],writes=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const start=html.indexOf('  async function importOne(it){'),end=html.indexOf('  async function execute(){',start);
 const code=html.slice(0,start)+'  async function importOne(it){await window.__write(it);}\n'+html.slice(end);
 const dom=new JSDOM(code,{url:'https://isolated-test.invalid/naming',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.confirm=()=>false;w.__write=it=>{writes.push(plain(it));return config.onWrite?.(it);};
  if(config.state)w.localStorage.setItem('fwimp.workbench.v2',JSON.stringify(config.state));
  if(config.legacy)w.localStorage.setItem('fwimp.v1',JSON.stringify(config.legacy));
  w.fetch=async(url,opt)=>{
   const body=JSON.parse(opt.body);calls.push(body);let data;
   if(body.function==='ExecutePythonCommandEx'&&require('./mock-import-policy.cjs').simulatePolicy(body.args.PythonCommand))return{ok:true,json:async()=>({success:true,data:{return_value:'True'}})};
   if(body.function==='GetPlatformName')data={return_value:'Windows'};
   else if(body.function==='DoesAssetExist')data={return_value:config.existing?'True':'False'};
   else if(body.function==='ExecutePythonCommandEx'){
    const code=body.args.PythonCommand;let tag,payload;
    if(code.includes("print('FWLJSON:'")){tag='FWLJSON:';payload={spec,exists:{main:true,cut:true,ramp:true},sourceHash:'fixture',textureHashes:{main:'1',cut:'2',ramp:'3'}};}
    else if(code.includes("print('FWLTARGETS:'")){
     tag='FWLTARGETS:';const entries=JSON.parse(code.match(/entries = (\[.*\])\n/)[1]);
     payload=entries.map(([key,pkg])=>({key,pkg,exists:key==='ps'||!config.newDependencies,class:key==='ps'?'ParticleSystem':key.startsWith('tex:')?'Texture2D':'MaterialInstanceConstant',tag:config.tag||'',diskHash:key==='ps'||!config.newDependencies?'same':'',sc:'disabled',dirty:false,editable:true}));
    }else throw Error('Unexpected native call blocked: '+body.function);
    data={return_value:'True',out_LogOutput:'Output='+JSON.stringify(tag+JSON.stringify(payload))};
   }else if(body.path){data={properties:body.path.endsWith(':Old.LOD0')?{bEnabled:true,Modules:[]}:body.path.endsWith(':Old')?{EmitterName:'Old',LODLevels:[{path:body.path+'.LOD0'}]}:{Emitters:[{path:body.path+':Old',class:'ParticleSpriteEmitter'}],LODDistances:[0],LODSettings:[{}]}};}
   else throw Error('Unexpected native call blocked: '+body.function);
   return{ok:true,json:async()=>({success:true,data})};
  };
 }});
 return{w:dom.window,calls,writes,errors,close:()=>dom.window.close()};
}
async function addSingle(w,name,index='01',numbered=false,dir='D:/packs/one'){
 api(w).edit('add');el(w,'editDir').value=dir;el(w,'editAs').value=name;el(w,'editIndex').value=index;el(w,'editParticleNumbered').checked=numbered;
 w.document.querySelector('#fwimp-editor .btn').click();await idle(w);
}
async function bulk(w,text){api(w).edit('bulk');el(w,'editText').value=text;w.document.querySelector('#fwimp-editor .btn').click();await idle(w);}
function input(w,id,value){const e=el(w,id);e.focus();e.value=value;e.dispatchEvent(new w.Event('input'));return e;}
function legacyState(records){return{batches:[{id:'batch',title:'Legacy fixture',rows:records}],active:'batch'};}
function legacyRow(name='Legacy_05',status='done'){return{id:'legacy',dir:'D:/packs/old',as:name,mode:'create',state:status,selected:true,errs:[],assets:plain(backend.makePlan(spec,name))};}
(async()=>{
 check('基础名称无数字后缀可生成全部分类名称',()=>{
  const p=backend.makePlan(spec,'GoldSpark');assert.equal(basename(p.ps),'P_EFX_FireWorks_GoldSpark_HD');
  assert.equal(basename(p['mat:m']),'MI_EFX_FireWorks_GoldSpark_01_HD');assert.equal(basename(p['tex:main']),'T_EFX_FireWorks_GoldSpark_4x4_01');
  assert.equal(basename(p['tex:cut']),'T_EFX_FireWorks_GoldSpark_4x4_01C');assert.equal(basename(p['tex:ramp']),'T_EFX_FireWorks_GoldSpark_01Ramp');
 });
 check('历史直接调用保留数字粒子路径，显式新选项取消数字',()=>{assert.equal(basename(backend.makePlan(spec,'GoldSpark_05').ps),'P_EFX_FireWorks_GoldSpark_05_HD');assert.equal(basename(backend.makePlan(spec,'GoldSpark_05',options('GoldSpark','05')).ps),'P_EFX_FireWorks_GoldSpark_HD');});
 check('修改依赖编号不会改变无编号粒子目标',()=>{const a=backend.makePlan(spec,'GoldSpark_01',options('GoldSpark')),b=backend.makePlan(spec,'GoldSpark_02',options('GoldSpark','02'));assert.equal(a.ps,b.ps);for(const key of Object.keys(a).filter(k=>k!=='ps'))assert.notEqual(a[key],b[key]);});
 check('基础名中的数字保留，只移除粒子模板编号占位',()=>{assert.equal(basename(backend.makePlan(spec,'Effect_2026_01',options('Effect_2026_01')).ps),'P_EFX_FireWorks_Effect_2026_01_HD');});
 check('空/不完整/非数字编号与非法基础名明确拦截',()=>{for(const idx of ['','1','001','x1'])assert.throws(()=>backend.makePlan(spec,'X',options('X',idx)),/贴图.*材质.*两位/);assert.throws(()=>backend.makePlan(spec,'Bad',options('Bad name')),/基础名/);});
 check('源配置不变，纹理原标识继续绑定独立目标',()=>{const before=JSON.stringify(spec);const p=backend.makePlan(spec,'GoldSpark');assert(p['tex:main']&&p['mat:m']);assert.equal(JSON.stringify(spec),before);});
 const t=boot();await pause();await addSingle(t.w,'GoldSpark');
 check('单项添加只填基础名，默认编号01且粒子不编号',()=>{const r=rows(t.w)[0];assert.equal(r.baseName,'GoldSpark');assert.equal(r.assetIndex,'01');assert.equal(r.particleNumbered,false);assert.equal(r.state,'ready');assert.equal(basename(r.assets.ps),'P_EFX_FireWorks_GoldSpark_HD');assert.equal(t.writes.length,0);assert.equal(el(t.w,'btnExec').disabled,true);});
 check('预览分别说明基础名、依赖编号与粒子规则',()=>{const text=el(t.w,'reviewContent').textContent;assert.match(text,/贴图.*材质编号/);assert.match(text,/粒子.*不带.*编号/);for(const path of Object.values(rows(t.w)[0].assets))assert(text.includes(basename(path)));});
 api(t.w).confirmNames();const original=plain(rows(t.w)[0].assets),index=input(t.w,'index','02');
 check('改编号立即撤销确认及目标，保留输入焦点',()=>{assert.equal(rows(t.w)[0].assetIndex,'02');assert.equal(rows(t.w)[0].state,'unchecked');assert.equal(el(t.w,'btnExec').disabled,true);assert.equal(el(t.w,'index'),index);assert.equal(t.w.document.activeElement,index);assert.deepEqual(rows(t.w)[0].assets,{});});
 await api(t.w).execute();assert.equal(t.writes.length,0);await api(t.w).preview();
 check('再次预览粒子保持原名，依赖变为02且仍需确认',()=>{assert.equal(rows(t.w)[0].assets.ps,original.ps);assert.notEqual(rows(t.w)[0].assets['mat:m'],original['mat:m']);assert.equal(el(t.w,'btnExec').disabled,true);});
 api(t.w).confirmNames();el(t.w,'particleNumbered').click();
 check('切换粒子编号也撤销原计划，选择值已保存',()=>{assert.equal(rows(t.w)[0].particleNumbered,true);assert.equal(rows(t.w)[0].state,'unchecked');assert.equal(el(t.w,'btnExec').disabled,true);});
 await api(t.w).preview();assert.equal(basename(rows(t.w)[0].assets.ps),'P_EFX_FireWorks_GoldSpark_02_HD');api(t.w).confirmNames();
 const base=input(t.w,'name','Silver');
 check('修改基础名即时作废，输入控件保持，编号不被重置',()=>{assert.equal(rows(t.w)[0].baseName,'Silver');assert.equal(rows(t.w)[0].assetIndex,'02');assert.equal(el(t.w,'name'),base);assert.equal(t.w.document.activeElement,base);assert.equal(el(t.w,'btnExec').disabled,true);});
 await api(t.w).preview();const reviewed=plain(rows(t.w)[0].assets);api(t.w).confirmNames();await api(t.w).execute();
 check('最终仅执行逐项确认过的相同目标，并取消勾选',()=>{assert.equal(t.writes.length,1);assert.deepEqual(t.writes[0].assets,reviewed);assert.equal(t.writes[0].naming.baseName,'Silver');assert.equal(rows(t.w)[0].state,'done');assert.equal(rows(t.w)[0].selected,false);assert.deepEqual(t.errors,[]);});t.close();
 const partial=boot();await pause();await addSingle(partial.w,'Partial');api(partial.w).confirmNames();input(partial.w,'index','');const partialState=state(partial.w);partial.close();
 const restored=boot({state:partialState});await pause();
 check('刷新保留明确清空的编号，不偷偷恢复01或旧计划',()=>{assert.equal(rows(restored.w)[0].assetIndex,'');assert.equal(el(restored.w,'index').value,'');assert.equal(el(restored.w,'btnExec').disabled,true);});
 await api(restored.w).preview();check('空编号在读取素材前失败且不能确认',()=>{assert.equal(rows(restored.w)[0].state,'error');assert.match(rows(restored.w)[0].errs[0],/两位/);assert(!restored.calls.some(c=>c.function==='ExecutePythonCommandEx'));assert.equal(el(restored.w,'btnConfirmNames').disabled,true);});restored.close();
 const old=boot({existing:true,state:legacyState([legacyRow()]),tag:'fwl.cascade/1 Fixture -> Legacy_05'});await pause();
 check('历史完成项保留05粒子路径和编号设置，不自动改资产',()=>{const r=rows(old.w)[0];assert.equal(r.baseName,'Legacy');assert.equal(r.assetIndex,'05');assert.equal(r.particleNumbered,true);assert.equal(basename(r.assets.ps),'P_EFX_FireWorks_Legacy_05_HD');assert.equal(el(old.w,'particleNumbered').checked,true);assert.equal(old.writes.length,0);});
 api(old.w).prepareUpdate('legacy');await api(old.w).preview();
 check('历史同名更新仍指向原编号PS，并要求重新确认',()=>{assert.equal(rows(old.w)[0].state,'ready');assert.equal(basename(rows(old.w)[0].assets.ps),'P_EFX_FireWorks_Legacy_05_HD');assert.equal(el(old.w,'btnExec').disabled,true);});
 api(old.w).closeNameReview();input(old.w,'name','Changed');input(old.w,'index','09');el(old.w,'particleNumbered').click();api(old.w).cancelUpdate('legacy');
 check('取消未执行更新恢复原基础名、编号及PS规则',()=>{const r=rows(old.w)[0];assert.equal(r.state,'done');assert.equal(r.baseName,'Legacy');assert.equal(r.assetIndex,'05');assert.equal(r.particleNumbered,true);assert.equal(basename(r.assets.ps),'P_EFX_FireWorks_Legacy_05_HD');});old.close();
 const oldPending=boot({state:legacyState([legacyRow('Legacy_05','pending')])});await pause();check('历史GPU待办的粒子命名同样不漂移',()=>assert.equal(rows(oldPending.w)[0].particleNumbered,true));oldPending.close();
 const oldFailed=boot({state:legacyState([legacyRow('Legacy_05','failed')])});await pause();api(oldFailed.w).edit('bulk');const oldBulk=el(oldFailed.w,'editText').value;
 check('历史批量编辑显式保留原编号规则',()=>{assert.match(oldBulk,/Legacy\s*\|\s*05\s*\|\s*带编号/);});oldFailed.w.document.querySelector('#fwimp-editor .btn').click();await idle(oldFailed.w);
 check('原样保存历史批量清单不改粒子路径或记录ID',()=>{assert.equal(rows(oldFailed.w)[0].id,'legacy');assert.equal(rows(oldFailed.w)[0].particleNumbered,true);assert.equal(basename(rows(oldFailed.w)[0].assets.ps),'P_EFX_FireWorks_Legacy_05_HD');});oldFailed.close();
 const batch=boot();await pause();await bulk(batch.w,'D:/packs/a | Plain\nD:/packs/b | OldStyle_07\nD:/packs/c | Explicit | 08 | 带编号');
 check('批量支持无后缀、旧组合写法和显式粒子编号',()=>{const r=rows(batch.w);assert.deepEqual(r.map(x=>x.baseName),['Plain','OldStyle','Explicit']);assert.deepEqual(r.map(x=>x.assetIndex),['01','07','08']);assert.deepEqual(r.map(x=>x.particleNumbered),[false,false,true]);assert(r.every(x=>x.state==='ready'));});
 api(batch.w).closeNameReview();await bulk(batch.w,'D:/packs/a | Same | 01\nD:/packs/b | Same | 02');
 check('相同基础名不同依赖编号仍识别粒子冲突并给正确处理方向',()=>{assert(rows(batch.w).every(r=>r.state==='conflict'));assert(rows(batch.w).every(r=>r.errs.some(e=>/粒子.*修改贴图.*不能/.test(e))));assert.equal(el(batch.w,'btnExec').disabled,true);});
 api(batch.w).closeNameReview();await bulk(batch.w,'D:/packs/a | Same | 01 | 带编号\nD:/packs/b | Same | 02 | 带编号');
 check('用户明确使用粒子编号后，可区分两个版本目标',()=>{assert(rows(batch.w).every(r=>r.state==='ready'));assert.notEqual(rows(batch.w)[0].assets.ps,rows(batch.w)[1].assets.ps);});batch.close();
 const custom=boot();await pause();await addSingle(custom.w,'Name_01','05');api(custom.w).closeNameReview();api(custom.w).edit('bulk');
 check('分离字段允许有意义的数字基础名，批量往返不会误拆',()=>assert.match(el(custom.w,'editText').value,/Name_01\s*\|\s*05\s*\|\s*不带编号/));custom.w.document.querySelector('#fwimp-editor .btn').click();await idle(custom.w);assert.equal(rows(custom.w)[0].baseName,'Name_01');custom.close();
 const update=boot({existing:true,newDependencies:true,tag:'fwl.cascade/1 Fixture -> GoldSpark_01'});await pause();await addSingle(update.w,'GoldSpark','02');api(update.w).closeNameReview();const mode=el(update.w,'mode');mode.value='update';mode.dispatchEvent(new update.w.Event('change'));await api(update.w).preview();
 check('无编号PS更新依赖编号时允许同基础名的旧来源标签',()=>{assert.equal(rows(update.w)[0].state,'ready');assert.equal(basename(rows(update.w)[0].assets.ps),'P_EFX_FireWorks_GoldSpark_HD');assert.equal(basename(rows(update.w)[0].assets['mat:m']),'MI_EFX_FireWorks_GoldSpark_02_HD');});update.close();
 check('放宽仅针对无编号PS同基础名，跨名/编号PS/依赖标签仍拦截',()=>{
  const assets=plain(backend.makePlan(spec,'GoldSpark',options('GoldSpark','02'))),item={as:'GoldSpark_02',naming:options('GoldSpark','02'),assets,spec,targets:[{key:'ps',pkg:assets.ps,exists:true,class:'ParticleSystem',editable:true,lodCounts:[1],tag:'fwl.cascade/1 Fixture -> Other_01'}]};
  assert(backend.validateUpdateTargets(item).some(e=>e.includes('来源标识')));
  item.targets[0].tag='fwl.cascade/1 Fixture -> GoldSpark_01';assert.equal(backend.validateUpdateTargets(item).length,0);
  item.naming.particleNumbered=true;assert(backend.validateUpdateTargets(item).some(e=>e.includes('来源标识')));
  item.naming.particleNumbered=false;item.targets.push({key:'mat:m',pkg:assets['mat:m'],exists:true,class:'MaterialInstanceConstant',editable:true,tag:'fwl.cascade/1 Fixture -> GoldSpark_01'});assert(backend.validateUpdateTargets(item).some(e=>e.includes('来源标识')));
 });
 const legacySource=boot({legacy:{src:'D:/packs/old | Legacy_05'}});await pause();check('旧fwimp.v1清单迁入也保留带数字的粒子规则',()=>assert.equal(rows(legacySource.w)[0].particleNumbered,true));legacySource.close();
 const changedLegacy=legacyRow('Changed_02','unchecked');changedLegacy.mode='update';changedLegacy.previousSuccess=legacyRow('Legacy_05');
 const oldCancel=boot({state:legacyState([changedLegacy])});await pause();api(oldCancel.w).cancelUpdate('legacy');
 check('刷新后取消旧版暂存更新，恢复原编号规则与目标',()=>{const r=rows(oldCancel.w)[0];assert.equal(r.baseName,'Legacy');assert.equal(r.assetIndex,'05');assert.equal(r.particleNumbered,true);assert.equal(basename(r.assets.ps),'P_EFX_FireWorks_Legacy_05_HD');assert.equal(r.state,'done');});oldCancel.close();
 const defaults=boot();await pause();await addSingle(defaults.w,'RestoreNew');api(defaults.w).confirmNames();const newState=state(defaults.w);defaults.close();
 const newRestored=boot({state:newState});await pause();
 check('新版草稿刷新保留无编号规则，旧确认失效',()=>{assert.equal(rows(newRestored.w)[0].particleNumbered,false);assert.equal(rows(newRestored.w)[0].baseName,'RestoreNew');assert.equal(el(newRestored.w,'btnExec').disabled,true);});
 api(newRestored.w).edit('add');el(newRestored.w,'editParticleNumbered').click();
 check('添加表单的粒子规则说明实时更新，所有标签与ID唯一',()=>{assert.match(el(newRestored.w,'editParticleNumberedHint').textContent,/名称会随编号变化/);const ids=[...newRestored.w.document.querySelectorAll('[id]')].map(e=>e.id);assert.equal(ids.length,new Set(ids).size);for(const id of ['editAs','editIndex','editParticleNumbered'])assert(newRestored.w.document.querySelector('label[for="fwimp-'+id+'"]'));});newRestored.close();
 const caseClash=boot();await pause();await bulk(caseClash.w,'D:/packs/a | CaseName | 01\nD:/packs/b | casename | 02');
 check('粒子目标按大小写不敏感检查冲突',()=>assert(rows(caseClash.w).every(r=>r.state==='conflict')));caseClash.close();
 const unavailable=boot();await pause();await addSingle(unavailable.w,'Stored');api(unavailable.w).confirmNames();unavailable.w.Storage.prototype.setItem=function(){throw Error('Fixture full');};input(unavailable.w,'index','02');await api(unavailable.w).execute();
 check('命名修改保存失败时保留错误提示并禁止使用旧计划',()=>{assert.match(el(unavailable.w,'status').textContent,/无法保存/);assert.equal(el(unavailable.w,'btnExec').disabled,true);assert.equal(unavailable.writes.length,0);});unavailable.close();
 let release;const locked=boot({onWrite:()=>new Promise(resolve=>release=resolve)});await pause();await addSingle(locked.w,'Locked');api(locked.w).confirmNames();const oldInput=el(locked.w,'name'),running=api(locked.w).execute();for(let n=0;n<150&&!release;n++)await pause();assert(release);oldInput.value='ChangedDuringExecution';oldInput.dispatchEvent(new locked.w.Event('input'));
 check('执行期间命名被锁住，旧输入事件也不能更改当前目标',()=>{assert.equal(rows(locked.w)[0].baseName,'Locked');assert.equal(locked.writes.length,1);assert.equal(locked.writes[0].naming.baseName,'Locked');});release();await running;locked.close();
 console.log('\n'+passed+' import naming checks passed. All UE interfaces mocked; no native writes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
