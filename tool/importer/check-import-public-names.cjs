const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {JSDOM,VirtualConsole}=require('jsdom');
const {loadBackend}=require('./import-backend.cjs');
const source=__dirname+'/research/naming-20261005/cascade-before.json';
const bytes=fs.readFileSync(source),spec=JSON.parse(bytes);
const backend=loadBackend(async()=>{throw Error('Native calls forbidden');});
const naming={baseName:'YonshakuKamuro',assetIndex:'01',particleNumbered:false,assetNaming:'formal'};
const plan=backend.makePlan(spec,'YonshakuKamuro_01',naming);
const basename=p=>p.split('/').pop();
const plain=x=>JSON.parse(JSON.stringify(x));
const objectPath=p=>p+'.'+basename(p);
const clone=plain;
const html=fs.readFileSync(__dirname+'/../df-fx-workbench_v2_locmai.html','utf8');
const oldHtml=__dirname+'/backups/2026-10-05-public-asset-naming/df-fx-workbench_v2_locmai.html';
const oldBackend=loadBackend(async()=>{throw Error('Native calls forbidden');},()=>{},{htmlFile:oldHtml});
const oldPlan=plain(oldBackend.makePlan(spec,'YonshakuKamuro_01',naming));
const checks=[];
let passed=0;
function check(name,fn){fn();checks.push(name);console.log('PASS '+name);passed++;}
check('实际包所有贴图直接使用导出asset，无内部标识/重复前缀',()=>{
 for(const [key,t]of Object.entries(spec.textures))assert.equal(basename(plan['tex:'+key]),t.asset);
});
check('材质由主贴图正式层名及分段号生成，非内部键',()=>{
 assert.equal(basename(plan['mat:L1_mainA']),'MI_EFX_FireWorks_YonshakuKamuro_Main_01_HD');
 assert.equal(basename(plan['mat:L1_mainB']),'MI_EFX_FireWorks_YonshakuKamuro_Main_02_HD');
});
check('原始v2.11真实失败可复现，源键确实被暴露为名字',()=>{
 assert.notEqual(basename(oldPlan['tex:L1_seqA']),spec.textures.L1_seqA.asset);
 assert.match(oldPlan['mat:L1_mainA'],/L1_mainA_HD$/);
});
check('省略新策略时，实际后端默认采用正式asset',()=>assert.deepEqual(plain(backend.makePlan(spec,'YonshakuKamuro_01',{...naming,assetNaming:undefined})),plain(plan)));
check('内部引用键保留，真实包通过原有参数校验',()=>{
 assert.deepEqual(plain(backend.validate(spec)),[]);assert.deepEqual(Object.keys(plan).sort(),Object.keys(oldPlan).sort());
 assert(!Object.values(plan).some(p=>/L1_(?:seq|cutout|main)[AB]/.test(p)));
});
check('不同基础名/回退编号不改正式依赖名，粒子按自己设置',()=>{
 const p=backend.makePlan(spec,'Different_09',{...naming,baseName:'Different',assetIndex:'09'});
 for(const key of Object.keys(plan).filter(k=>k!=='ps'))assert.equal(p[key],plan[key]);
 assert.equal(basename(p.ps),'P_EFX_FireWorks_Different_HD');
 assert.equal(basename(backend.makePlan(spec,'Different_09',{...naming,baseName:'Different',assetIndex:'09',particleNumbered:true}).ps),'P_EFX_FireWorks_Different_09_HD');
});
check('显式legacy策略逐项保持旧版目标路径',()=>assert.deepEqual(plain(backend.makePlan(spec,'YonshakuKamuro_01',{...naming,assetNaming:'legacy'})),oldPlan));
const noAsset={format:'fwl.cascade/1',name:'OldFixture',textures:{main:{class:'flipbook',file:'main.png',cols:4,rows:4},other:{class:'flipbook',file:'other.png',cols:8,rows:2}},materials:{loop:{role:'flipbook_rgba',textures:{main:'main'},scalars:{cols:4,rows:4}},fade:{role:'flipbook_rgba',textures:{main:'other'},scalars:{cols:8,rows:2}}},emitters:[{name:'Loop',material:'loop',modules:[]},{name:'Fade',material:'fade',modules:[]}]};
check('未声明asset的旧多贴图包完全保持旧名与真实网格',()=>{
 const args={baseName:'Legacy',assetIndex:'07',particleNumbered:true};
 assert.deepEqual(plain(backend.makePlan(noAsset,'Legacy_07',args)),plain(oldBackend.makePlan(noAsset,'Legacy_07',args)));
});
check('部分贴图携带正式asset的旧包可混用，引用继续按源键',()=>{
 const mixed=clone(noAsset);mixed.textures.main.asset='T_Public_Main_4x4_01_HD';
 const p=backend.makePlan(mixed,'Mixed');assert.equal(basename(p['tex:main']),'T_Public_Main_4x4_01_HD');
 assert.equal(basename(p['mat:loop']),'MI_Public_Main_01_HD');assert.match(p['tex:other'],/Mixed_Other_8x2_01$/);
});
check('多层多段正式名各自保留层名与段号，无内部层号',()=>{
 const multi=clone(spec);multi.naming.layers.push('Red');
 for(const [key,t]of Object.entries(spec.textures))multi.textures[key.replace('L1_','L2_')]={...t,asset:t.asset.replace('_Main_','_Red_'),file:t.file.replace('_Main_','_Red_')};
 for(const key of ['L1_mainA','L1_mainB'])multi.materials[key.replace('L1_','L2_')]={...clone(spec.materials[key]),textures:Object.fromEntries(Object.entries(spec.materials[key].textures).map(([k,v])=>[k,v.replace('L1_','L2_')]))};
 const p=backend.makePlan(multi,'Multilayer');assert.equal(new Set(Object.values(p).map(x=>x.toLowerCase())).size,Object.keys(p).length);
 assert.equal(basename(p['mat:L2_mainA']),'MI_EFX_FireWorks_YonshakuKamuro_Red_01_HD');assert.equal(basename(p['mat:L2_mainB']),'MI_EFX_FireWorks_YonshakuKamuro_Red_02_HD');
});
check('对象顺序变化不影响正式名称',()=>{
 const reversed=clone(spec);reversed.textures=Object.fromEntries(Object.entries(reversed.textures).reverse());reversed.materials=Object.fromEntries(Object.entries(reversed.materials).reverse());
 const p=backend.makePlan(reversed,'YonshakuKamuro_01',naming);for(const key of Object.keys(plan))assert.equal(p[key],plan[key]);
});
check('内部标识更名但正式asset和关联不变时，目标名称不漂移',()=>{
 const renamed=clone(spec),keys=Object.fromEntries(Object.keys(renamed.textures).map((k,i)=>[k,'private texture '+i]));
 renamed.textures=Object.fromEntries(Object.entries(renamed.textures).map(([k,t])=>[keys[k],t]));
 for(const m of Object.values(renamed.materials))m.textures=Object.fromEntries(Object.entries(m.textures||{}).map(([k,t])=>[k,keys[t]]));
 for(const em of renamed.emitters)if(em.required.cutout)em.required.cutout=keys[em.required.cutout];
 assert.deepEqual(Object.values(backend.makePlan(renamed,'YonshakuKamuro_01',naming)).sort(),Object.values(plan).sort());
});
check('显式材质asset优先，实例前缀和_HD不重复添加',()=>{
 const s=clone(spec);s.materials.L1_mainA.asset='MI_Public_Custom_03_HD';assert.equal(basename(backend.makePlan(s,'YonshakuKamuro_01',naming)['mat:L1_mainA']),'MI_Public_Custom_03_HD');
});
check('单个新材质加复用GPU材质仍只创建自己的正式名',()=>{
 const s=clone(spec);delete s.materials.L1_mainB;delete s.textures.L1_seqB;delete s.textures.L1_cutoutB;s.emitters=s.emitters.filter(e=>e.material!=='L1_mainB');
 const p=backend.makePlan(s,'YonshakuKamuro_01',naming);assert.equal(Object.keys(p).filter(k=>k.startsWith('mat:')).length,1);assert.equal(basename(p['mat:L1_mainA']),'MI_EFX_FireWorks_YonshakuKamuro_Main_01_HD');assert(!p['mat:L2_dot']);
});
check('纯GPU/复用材质的包不凭空生成贴图或MI',()=>{
 const s={format:'fwl.cascade/1',name:'Dots',textures:{},materials:{m:{role:'soft_dot'}},emitters:[{name:'Dots',material:'m',gpu:true,modules:[]}]};
 assert.deepEqual(Object.keys(backend.makePlan(s,'Dots')),['ps']);
});
check('缺失明确声明的asset不会静默回退内部键',()=>{
 const s=clone(spec);delete s.textures.L1_seqA.asset;assert(backend.validate(s).some(e=>/缺少正式 asset/.test(e)));assert.throws(()=>backend.makePlan(s,'YonshakuKamuro_01',naming),/缺少正式 asset/);
});
check('非法/空/路径/扩展名asset预览校验与直接规划都拒绝',()=>{
 for(const value of ['',null,123,'bad name',' bad','bad.png','/Game/Foo','x/y',"x');print('oops",'中文',"X\nY"]){
  const s=clone(spec);s.textures.L1_seqA.asset=value;assert(backend.validate(s).some(e=>/asset.*完整资产名/.test(e)),JSON.stringify(value));assert.throws(()=>backend.makePlan(s,'YonshakuKamuro_01',naming),/asset.*完整资产名/);
 }
 const s=clone(spec);s.materials.L1_mainA.asset='MI_bad.name';assert(backend.validate(s).some(e=>e.includes('材质 L1_mainA')));assert.throws(()=>backend.makePlan(s,'YonshakuKamuro_01',naming),/材质 L1_mainA/);
});
check('不同源键的同名/大小写正式贴图冲突中止而不是合并覆盖',()=>{
 for(const lower of [false,true]){const s=clone(spec);s.textures.L1_seqB.asset=lower?s.textures.L1_seqA.asset.toLowerCase():s.textures.L1_seqA.asset;assert.throws(()=>backend.makePlan(s,'YonshakuKamuro_01',naming),/目标重名/);}
});
check('同主图两个独立材质会中止，需要明确不同asset才通过',()=>{
 const s=clone(spec);s.materials.L1_extra=clone(s.materials.L1_mainA);assert.throws(()=>backend.makePlan(s,'YonshakuKamuro_01',naming),/目标重名/);
 s.materials.L1_extra.asset='MI_Public_Extra_HD';const p=backend.makePlan(s,'YonshakuKamuro_01',naming);assert.equal(basename(p['mat:L1_extra']),'MI_Public_Extra_HD');
});
check('未知命名策略被拒绝，不能默认选另一种写入',()=>assert.throws(()=>backend.makePlan(spec,'YonshakuKamuro_01',{...naming,assetNaming:'invalid'}),/资产命名规则无效/));
check('正式包的回退编号变化不应把同一路径依赖误报为另一名称来源',()=>{
 const n={...naming,assetIndex:'09'},assets=plain(backend.makePlan(spec,'YonshakuKamuro_09',n));
 const item={as:'YonshakuKamuro_09',naming:n,spec,assets,targets:Object.entries(assets).map(([key,pkg])=>({key,pkg,exists:true,class:key==='ps'?'ParticleSystem':key.startsWith('tex:')?'Texture2D':'MaterialInstanceConstant',tag:'fwl.cascade/1 HK10 -> YonshakuKamuro_01',editable:true,lodCounts:key==='ps'?[1]:undefined}))};
 assert.deepEqual(plain(backend.validateUpdateTargets(item)),[]);
});
check('正式依赖来源匹配仅放宽同基础名和同一正式目标，旧包/跨名仍拒绝',()=>{
 const n={...naming,assetIndex:'09'},assets=plain(backend.makePlan(spec,'YonshakuKamuro_09',n));
 const target={key:'tex:L1_seqA',pkg:assets['tex:L1_seqA'],exists:true,class:'Texture2D',tag:'fwl.cascade/1 HK10 -> Other_01',editable:true};
 const ps={key:'ps',pkg:assets.ps,exists:true,class:'ParticleSystem',tag:'fwl.cascade/1 HK10 -> YonshakuKamuro_01',editable:true,lodCounts:[1]};
 const item={as:'YonshakuKamuro_09',naming:n,spec,assets,targets:[ps,target]};
 assert(backend.validateUpdateTargets(item).some(e=>e.includes('来源标识')));
 target.tag='fwl.cascade/1 HK10 -> YonshakuKamuro_01';item.naming={...n,assetNaming:'legacy'};assert(backend.validateUpdateTargets(item).some(e=>e.includes('来源标识')));
 item.naming=n;target.pkg=target.pkg+'_Changed';assert(backend.validateUpdateTargets(item).some(e=>e.includes('来源标识')));
 target.pkg=assets['tex:L1_seqA'];target.tag='untrusted -> YonshakuKamuro_01';assert(backend.validateUpdateTargets(item).some(e=>e.includes('来源标识')));
 const oldAssets=plain(backend.makePlan(noAsset,'Old_09',{baseName:'Old',assetIndex:'09',particleNumbered:false}));
 const oldItem={as:'Old_09',naming:{baseName:'Old',assetIndex:'09',particleNumbered:false,assetNaming:'formal'},spec:noAsset,assets:oldAssets,targets:[{...ps,pkg:oldAssets.ps,tag:'fwl.cascade/1 OldFixture -> Old_01'},{...target,key:'tex:main',pkg:oldAssets['tex:main'],tag:'fwl.cascade/1 OldFixture -> Old_01'}]};
 assert(backend.validateUpdateTargets(oldItem).some(e=>e.includes('来源标识')));
});

// Isolated DOM tests exercise the delivered page and its actual confirmation
// flow. The only import function replacement records plans; fetch has no network.
const pause=()=>new Promise(resolve=>setTimeout(resolve,12));
const element=(w,id)=>w.document.getElementById('fwimp-'+id);
const api=w=>w.eval('FwImporter');
const state=w=>JSON.parse(w.localStorage.getItem('fwimp.workbench.v2'));
const rows=w=>{const st=state(w);return st.batches.find(b=>b.id===st.active).rows;};
const storage=rs=>({version:2,batches:[{id:'batch',title:'Naming fixture',rows:rs}],active:'batch'});
function oldRow(status='done'){return{id:'old',dir:'D:/fixture',as:'YonshakuKamuro_01',baseName:'YonshakuKamuro',assetIndex:'01',particleNumbered:false,mode:'create',state:status,selected:true,errs:[],assets:clone(oldPlan)};}
function boot(config={}){
 const calls=[],writes=[],errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const start=html.indexOf('  async function importOne(it){'),end=html.indexOf('  async function execute(){',start);
 const code=html.slice(0,start)+'  async function importOne(it){await window.__write(it);}\n'+html.slice(end);
 const dom=new JSDOM(code,{url:'https://isolated-test.invalid/public-names',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.confirm=()=>false;w.__write=it=>{writes.push(plain(it));return config.onWrite?.(it);};
  if(config.state)w.localStorage.setItem('fwimp.workbench.v2',JSON.stringify(config.state));
  if(config.legacy)w.localStorage.setItem('fwimp.v1',JSON.stringify(config.legacy));
  w.fetch=async(_,options)=>{
   const body=JSON.parse(options.body);calls.push(body);let data;
   if(body.function==='ExecutePythonCommandEx'&&require('./mock-import-policy.cjs').simulatePolicy(body.args.PythonCommand))return{ok:true,json:async()=>({success:true,data:{return_value:'True'}})};
   if(body.function==='GetPlatformName')data={return_value:'Windows'};
   else if(body.function==='DoesAssetExist')data={return_value:'False'};
   else if(body.function==='ExecutePythonCommandEx'){
    const code=body.args.PythonCommand;let tag,payload;
    if(code.includes("print('FWLJSON:'")){tag='FWLJSON:';const s=config.spec||spec;payload={spec:s,exists:Object.fromEntries(Object.keys(s.textures||{}).map(k=>[k,true])),sourceHash:config.sourceHash?.()||'fixed',textureHashes:Object.fromEntries(Object.keys(s.textures||{}).map(k=>[k,'same']))};}
    else if(code.includes("print('FWLTARGETS:'")){
     tag='FWLTARGETS:';const entries=JSON.parse(code.match(/entries = (\[.*\])\n/)[1]);payload=entries.map(([key,pkg])=>({key,pkg,exists:config.psOnly?key==='ps':true,class:key==='ps'?'ParticleSystem':key.startsWith('mat:')?'MaterialInstanceConstant':'Texture2D',tag:config.psOnly&&key!=='ps'?'':'fwl.cascade/1 HK10 -> YonshakuKamuro_01',sc:'disabled',diskHash:config.psOnly&&key!=='ps'?'':'fixed',dirty:false,editable:true}));
    }else throw Error('Unmocked operation blocked: '+body.function);
    data={return_value:'True',out_LogOutput:'Output='+JSON.stringify(tag+JSON.stringify(payload))};
   }else if(body.path){data={properties:body.path.endsWith(':Old.LOD0')?{bEnabled:true,Modules:[]}:body.path.endsWith(':Old')?{EmitterName:'Old',LODLevels:[{path:body.path+'.LOD0'}]}:body.path.includes('/P_EFX_')?{Emitters:[{path:body.path+':Old',class:'ParticleSpriteEmitter'}],LODDistances:[0],LODSettings:[{}]}:{}};}
   else throw Error('Unmocked operation blocked: '+body.function);
   return{ok:true,json:async()=>({success:true,data})};
  };
 }});
 return{w:dom.window,calls,writes,errors,close:()=>dom.window.close()};
}
async function idle(w){for(let i=0;i<250&&w.eval('Workbench.busy');i++)await pause();assert.equal(w.eval('Workbench.busy'),false);}
async function add(w){api(w).edit('add');element(w,'editDir').value='D:/fixture';element(w,'editAs').value='YonshakuKamuro';w.document.querySelector('#fwimp-editor .btn').click();await idle(w);}
function rule(w,value){const e=element(w,'assetNaming');e.focus();e.value=value;e.dispatchEvent(new w.Event('change'));return e;}

// Full actual importer mock: dependency path and Required bindings are read back
// from written mock nodes, rather than assuming that planning alone is sufficient.
function nativeFixture(){
 const nodes=new Map(),calls=[],python=[];let sequence=0,b,item;
 const reply=line=>({data:{return_value:'True',out_LogOutput:'Output='+JSON.stringify(line)}});
 async function fake(route,body){
  calls.push({route,body});
  if(route==='/object/get')return{data:{properties:{ForcePlatformSettings:[],LODDistances:[0],LODSettings:[{}],Emitters:[],SoloTracking:[],...(nodes.get(body.path)||{})}}};
  if(route==='/object/set'){
   if(require('./mock-import-policy.cjs').simulateTexturePolicyWrite(body,nodes))return {data:{failed_properties:[]}};
   const p=plain(body.properties);if(Object.keys(p).some(k=>['preRoll','note','_note','UnexpectedNativeField'].includes(k)))throw Error('Invalid native property');
   for(const key of ['RequiredModule','SpawnModule','TypeDataModule'])if(typeof p[key]==='string')p[key]={path:p[key]};
   if(p.Emitters)p.Emitters=[...p.Emitters.matchAll(/ParticleSpriteEmitter'([^']+)'/g)].map(m=>({path:m[1]}));
   if(typeof p.LODDistances==='string')p.LODDistances=[0];if(typeof p.LODSettings==='string')p.LODSettings=[{}];
   nodes.set(body.path,{...(nodes.get(body.path)||{}),...p});return{data:{failed_properties:[]}};
  }
  if(route==='/object/container'){
   const node=nodes.get(body.path)||{LODDistances:[0],LODSettings:[{}],Emitters:[],SoloTracking:[]},match=body.container_path.match(/^SoloTracking\[(\d+)\]\.SoloEnableSetting$/);
   const holder=match?node.SoloTracking[Number(match[1])]:node,key=match?'SoloEnableSetting':body.container_path;
   if(body.op==='array_remove')holder[key].splice(body.index,1);
   else holder[key]=[...(holder[key]||[]),key==='SoloTracking'?{SoloEnableSetting:[]}:typeof body.value==='number'?body.value:{path:body.value}];
   nodes.set(body.path,node);return{data:{ok:true}};
  }
  if(body.function==='SpawnObject'){const p=body.args.Outer+':'+body.args.ObjectClass.split('.').pop()+'_'+sequence++;nodes.set(p,{});return{data:{return_value:p}};}
  if(['DuplicateAsset','SetMetadataTag','SaveAsset'].includes(body.function))return{data:{return_value:'True'}};
  if(body.function==='ExecutePythonCommandEx'){
   const code=body.args.PythonCommand;python.push(code);
   if(require('./mock-import-policy.cjs').simulatePolicy(code,nodes))return reply('');
   if(code.includes('import_asset_tasks'))return reply('FWLJSON:'+JSON.stringify(Object.keys(spec.textures).map(k=>[objectPath(item.assets['tex:'+k])])));
   if(code.includes("print('FWLP:'"))return reply('FWLP:'+code.match(/lod = unreal.find_object\(None, '([^']+)'/)[1]);
   if(code.includes('L.update_material_instance')){
    const p=code.match(/mi = unreal.load_object\(None, '([^']+)'/)[1];
    const textures=[...code.matchAll(/texture_parameter_value\(mi, '([^']+)', unreal.load_object\(None, '([^']+)'/g)].map(m=>({ParameterInfo:{Name:m[1]},ParameterValue:{path:m[2]}}));
    const scalars=[...code.matchAll(/scalar_parameter_value\(mi, '([^']+)', ([\d.e+-]+)\)/g)].map(m=>({ParameterInfo:{Name:m[1]},ParameterValue:Number(m[2])}));
    nodes.set(p,{TextureParameterValues:textures,ScalarParameterValues:scalars});
   }
   if(code.includes("print('FWLSAVE:'")){const entries=JSON.parse(code.match(/entries = (\[.*\])\n/)[1]);return reply('FWLSAVE:'+JSON.stringify(entries.map(([key,pkg])=>({key,pkg,saved:true,sc:'added',reason:''}))));}
   return reply('');
  }
  throw Error('Unmocked native operation blocked');
 }
 b=loadBackend(fake);item={as:'YonshakuKamuro_01',naming,dir:'D:/fixture',spec:clone(spec),assets:plain(plan)};
 return{b,item,nodes,calls,python,run:()=>b.importOne(item)};
}

(async()=>{
 const fresh=boot();await pause();await add(fresh.w);
 check('新增任务默认formal，预览全部实际正式名称且不执行',()=>{
  const r=rows(fresh.w)[0];assert.equal(r.assetNaming,'formal');assert.equal(r.state,'ready');assert.deepEqual(r.assets,plain(plan));assert.equal(fresh.writes.length,0);assert(element(fresh.w,'btnExec').disabled);
  const names=[...fresh.w.document.querySelectorAll('#fwimp-reviewContent .fw-final-name')].map(e=>e.textContent);assert.deepEqual(names.sort(),Object.values(plan).map(basename).sort());assert(names.every(n=>!n.includes('L1_')));
 });
 check('预览说明正式包名称/分段编号来自导出包，未误导改基础名',()=>{const text=element(fresh.w,'reviewContent').textContent;assert.match(text,/主贴图.*层名.*分段号/);assert.match(text,/烘焙器.*交付名/);});
 api(fresh.w).confirmNames();rule(fresh.w,'legacy');
 check('改命名方式立即撤销确认、保存新策略、禁止旧计划执行',()=>{const r=rows(fresh.w)[0];assert.equal(r.assetNaming,'legacy');assert.equal(r.state,'unchecked');assert.deepEqual(r.assets,{});assert(element(fresh.w,'btnExec').disabled);assert.match(element(fresh.w,'assetNamingHint').textContent,/旧资产仍保留/);});
 await api(fresh.w).execute();assert.equal(fresh.writes.length,0);await api(fresh.w).preview();
 check('显式切换legacy仅重新预览旧名，尚不写入',()=>{assert.deepEqual(rows(fresh.w)[0].assets,oldPlan);assert(element(fresh.w,'btnExec').disabled);});
 api(fresh.w).closeNameReview();rule(fresh.w,'formal');await api(fresh.w).preview();api(fresh.w).confirmNames();const verified=plain(rows(fresh.w)[0].assets);await api(fresh.w).execute();
 check('最终执行与用户确认的正式规划一致，成功保留策略并取消勾选',()=>{assert.equal(fresh.writes.length,1);assert.deepEqual(fresh.writes[0].assets,verified);assert.equal(fresh.writes[0].naming.assetNaming,'formal');assert.equal(rows(fresh.w)[0].state,'done');assert.equal(rows(fresh.w)[0].selected,false);assert.deepEqual(fresh.errors,[]);});
 const freshState=state(fresh.w);fresh.close();const reload=boot({state:freshState});await pause();
 check('新版成功任务刷新仍为formal，无自动降回旧名',()=>{assert.equal(rows(reload.w)[0].assetNaming,'formal');assert.deepEqual(rows(reload.w)[0].assets,plain(plan));assert(element(reload.w,'assetNaming').disabled);});reload.close();
 const indexUpdate=boot({state:freshState});await pause();api(indexUpdate.w).prepareUpdate(rows(indexUpdate.w)[0].id);const fallback=element(indexUpdate.w,'index');fallback.value='09';fallback.dispatchEvent(new indexUpdate.w.Event('input'));await api(indexUpdate.w).preview();
 check('正式成功任务改回退编号后更新预览仍通过且所有目标保持',()=>{assert.equal(rows(indexUpdate.w)[0].state,'ready',rows(indexUpdate.w)[0].errs.join('\n'));assert.deepEqual(rows(indexUpdate.w)[0].assets,plain(plan));assert(element(indexUpdate.w,'btnExec').disabled);assert.equal(indexUpdate.writes.length,0);});
 api(indexUpdate.w).confirmNames();await api(indexUpdate.w).execute();check('确认后正式同名更新仍使用固定目标及formal策略',()=>{assert.equal(indexUpdate.writes.length,1);assert.equal(indexUpdate.writes[0].mode,'update');assert.deepEqual(indexUpdate.writes[0].assets,plain(plan));assert.equal(rows(indexUpdate.w)[0].state,'done');});indexUpdate.close();

 const history=boot({state:storage([oldRow()])});await pause();
 check('旧完成任务恢复legacy且保留精确旧目标，不自动迁移',()=>{assert.equal(rows(history.w)[0].assetNaming,'legacy');assert.deepEqual(rows(history.w)[0].assets,oldPlan);assert.equal(history.writes.length,0);assert(element(history.w,'assetNaming').disabled);});
 api(history.w).prepareUpdate('old');await api(history.w).preview();
 check('旧完成任务同名更新规划仍逐项指向原目标',()=>{assert.equal(rows(history.w)[0].state,'ready');assert.deepEqual(rows(history.w)[0].assets,oldPlan);assert(element(history.w,'btnExec').disabled);assert.equal(rows(history.w)[0].previousSuccess.assetNaming,'legacy');});
 api(history.w).closeNameReview();rule(history.w,'formal');const staged=state(history.w);history.close();
 const stagedReload=boot({state:staged});await pause();api(stagedReload.w).cancelUpdate('old');
 check('刷新后取消切换中的旧资源更新，恢复原策略/路径/状态',()=>{const r=rows(stagedReload.w)[0];assert.equal(r.assetNaming,'legacy');assert.equal(r.state,'done');assert.deepEqual(r.assets,oldPlan);assert.equal(stagedReload.writes.length,0);});stagedReload.close();

 const failedRow=oldRow('failed');failedRow.importProgress={stage:'粒子系统',saved:Object.keys(oldPlan).filter(k=>k!=='ps')};
 const failed=boot({state:storage([failedRow])});await pause();
 check('旧失败任务保留legacy和已保存路径，避免隐式补导另一套资源',()=>{assert.equal(rows(failed.w)[0].assetNaming,'legacy');assert.deepEqual(rows(failed.w)[0].assets,oldPlan);assert(element(failed.w,'assetNaming').disabled===false);});
 api(failed.w).edit('bulk');failed.w.document.querySelector('#fwimp-editor .btn').click();await idle(failed.w);
 check('历史失败记录原样批量编辑后策略与旧名称不漂移',()=>{assert.equal(rows(failed.w)[0].assetNaming,'legacy');assert.deepEqual(rows(failed.w)[0].assets,oldPlan);});failed.close();
 const interrupted=boot({state:storage([oldRow('running')])});await pause();check('旧中断运行恢复为失败并保留legacy',()=>{assert.equal(rows(interrupted.w)[0].state,'failed');assert.equal(rows(interrupted.w)[0].assetNaming,'legacy');});interrupted.close();
 const pending=boot({state:storage([oldRow('pending')])});await pause();check('旧GPU待办策略和路径保持',()=>{assert.equal(rows(pending.w)[0].assetNaming,'legacy');assert.deepEqual(rows(pending.w)[0].assets,oldPlan);});pending.close();
 const draft=boot({state:storage([oldRow('ready')])});await pause();await api(draft.w).preview();check('旧未执行草稿重新检查使用正式规则且旧确认失效',()=>{assert.equal(rows(draft.w)[0].assetNaming,'formal');assert.deepEqual(rows(draft.w)[0].assets,plain(plan));assert(element(draft.w,'btnExec').disabled);});draft.close();
 const legacy=boot({legacy:{src:'D:/fixture | YonshakuKamuro_01'}});await pause();check('fwimp.v1原始清单迁移保留legacy粒子/依赖路径规则',()=>{assert.equal(rows(legacy.w)[0].assetNaming,'legacy');assert.equal(rows(legacy.w)[0].particleNumbered,true);});legacy.close();
 const explicit=boot({state:storage([oldRow()]),psOnly:true});await pause();api(explicit.w).prepareUpdate('old');rule(explicit.w,'formal');await api(explicit.w).preview();
 check('用户明确切换旧更新为正式规则，PS路径保持、依赖作为新增预览',()=>{const r=rows(explicit.w)[0];assert.equal(r.state,'ready',r.errs.join('\n'));assert.equal(r.assets.ps,oldPlan.ps);assert.deepEqual(r.assets,plain(plan));assert.match(element(explicit.w,'reviewContent').textContent,/新增/);assert(element(explicit.w,'btnExec').disabled);assert.equal(explicit.writes.length,0);});explicit.close();

 const clash=boot();await pause();api(clash.w).edit('bulk');element(clash.w,'editText').value='D:/fixture/a | First\nD:/fixture/b | Second | 02';clash.w.document.querySelector('#fwimp-editor .btn').click();await idle(clash.w);
 check('不同粒子名但共享正式依赖发生批内冲突，提示重导/单选而非改序号',()=>{assert(rows(clash.w).every(r=>r.state==='conflict'));assert(rows(clash.w).every(r=>r.errs.some(e=>/修改基础名或编号不会改变/.test(e))));assert(element(clash.w,'btnExec').disabled);assert.equal(clash.writes.length,0);});clash.close();
 const invalidSpec=clone(spec);invalidSpec.textures.L1_seqA.asset='Invalid.png';const invalid=boot({spec:invalidSpec});await pause();await add(invalid.w);await api(invalid.w).execute();
 check('非法asset的界面预览不能确认或执行',()=>{assert.equal(rows(invalid.w)[0].state,'error');assert(element(invalid.w,'btnConfirmNames').disabled);assert.equal(invalid.writes.length,0);});invalid.close();
 let revision='first';const changed=boot({sourceHash:()=>revision});await pause();await add(changed.w);api(changed.w).confirmNames();revision='second';await api(changed.w).execute();check('确认后源配置改变仍在写入之前中止',()=>{assert.equal(changed.writes.length,0);assert.equal(rows(changed.w)[0].state,'failed');assert.match(rows(changed.w)[0].errs[0],/发生变化/);});changed.close();
 let release;const locked=boot({onWrite:()=>new Promise(resolve=>release=resolve)});await pause();await add(locked.w);api(locked.w).confirmNames();const select=element(locked.w,'assetNaming'),running=api(locked.w).execute();for(let i=0;i<200&&!release;i++)await pause();assert(release);select.value='legacy';select.dispatchEvent(new locked.w.Event('change'));
 check('执行期间旧选择器事件无法改变已确认策略',()=>{assert.equal(rows(locked.w)[0].assetNaming,'formal');assert.equal(locked.writes[0].naming.assetNaming,'formal');});release();await running;locked.close();

 const native=nativeFixture();await native.run();
 check('完整导入代码5个贴图destination_name逐项等于正式asset',()=>{
  const code=native.python.find(s=>s.includes('import_asset_tasks'));assert.equal((code.match(/unreal.AssetImportTask\(\)/g)||[]).length,5);
  for(const t of Object.values(spec.textures))assert(code.includes("destination_name', '"+t.asset+"'"));
 });
 check('两张MI分别绑定正确分段主图并共用正式Ramp',()=>{
  const duplicates=native.calls.filter(c=>c.body.function==='DuplicateAsset');assert.deepEqual(duplicates.map(c=>c.body.args.DestinationAssetPath).sort(),[plan['mat:L1_mainA'],plan['mat:L1_mainB']].sort());
  for(const key of ['L1_mainA','L1_mainB']){const node=native.nodes.get(objectPath(plan['mat:'+key]));for(const [param,ref]of Object.entries(spec.materials[key].textures)){const name=param==='main'?'MainTex':'EmissiveRampTex';assert.equal(node.TextureParameterValues.find(t=>t.ParameterInfo.Name===name).ParameterValue.path,objectPath(plan['tex:'+ref]));}}
 });
 check('实际构建发射器Required材质/轮廓引用均使用确认正式目标',()=>{
  const ps=native.nodes.get(objectPath(plan.ps));assert.equal(ps.Emitters.length,spec.emitters.length);
  for(const [index,e]of spec.emitters.entries()){
   const em=native.nodes.get(ps.Emitters[index].path),lod=native.nodes.get(em.LODLevels[0].path),req=native.nodes.get(lod.RequiredModule.path);
   assert.equal(req.Material,e.material==='L2_dot'?native.b.MAP.material_roles.soft_dot.use:objectPath(plan['mat:'+e.material]));
   if(e.required.cutout)assert.equal(req.CutoutTexture,objectPath(plan['tex:'+e.required.cutout]));
  }
 });
 check('完整保存阶段仍核对所有8项目标，没有另算旧路径',()=>{assert.equal(native.item.importProgress.saved.length,8);assert.equal(native.item.importProgress.added.length,8);assert.deepEqual(plain(native.item.importProgress.saved).sort(),Object.values(plan).sort());});
 check('正式命名与完整模拟导入不修改源配置、内部键或文件',()=>{assert.deepEqual(native.item.spec,spec);assert(fs.readFileSync(source).equals(bytes));});
 check('原生模块与保存包含完整已批准v2.25修复，迁移不删减',()=>{
  const approved=fs.readFileSync(__dirname+'/backups/20261010-import-audit-4967/df-fx-workbench_v2_locmai.html','utf8').replace(/\r\n/g,'\n');
  const baselineVersion=approved.match(/工作台 v([0-9.]+)/)[1];
  for(const file of ['fireworks-import.js','fireworks-pack.js','fireworks-update.js','presentation.js','presentation.css','shell.html','shell.js','show-plan.js','show-ui.js']){
   const source=fs.readFileSync(__dirname+'/'+file,'utf8').replace(/\r\n/g,'\n').replaceAll('{{VERSION}}',baselineVersion);
   assert(approved.includes(source),file+' differs from approved pre-audit entry');
  }
 });
 const releaseVersion=fs.readFileSync(__dirname+'/build.py','utf8').match(/^VERSION = '([^']+)'/m)?.[1];
 check('生成文件页头/标题一致为当前发布版本，入口未换位置',()=>{assert(releaseVersion);assert(html.includes('<title>DF 特效工作台 · v'+releaseVersion+'</title>')||html.includes('<title>烘焙器 · 资源交付</title>'));assert(html.includes('工作台 v'+releaseVersion));});
 const report={time:new Date().toISOString(),passed,checks,toolVersion:releaseVersion,sourceSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),plannedAssets:plain(plan),legacyAssets:oldPlan,nativeWrites:false,browserVisualQA:false,fullImporterMock:true};
 fs.writeFileSync(__dirname+'/research/naming-20261005/verification.json',JSON.stringify(report,null,2));
 console.log('\n'+passed+' public asset naming checks passed. All UE interfaces mocked; no native writes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
