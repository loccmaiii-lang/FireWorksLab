const assert=require('node:assert/strict');
const fs=require('node:fs');
const {loadBackend}=require('./import-backend.cjs');
const real=JSON.parse(fs.readFileSync('D:/ProjectTextures/FireWorksLab/RiseTrail_L/cascade.json','utf8'));
const plain=value=>JSON.parse(JSON.stringify(value));
const objectPath=pkg=>pkg+'.'+pkg.split('/').pop();
const spec={format:'fwl.cascade/1',name:'Fixture',textures:{main:{class:'flipbook',file:'fixture.png',cols:1,rows:1}},materials:{m:{role:real.materials.loop.role,textures:{main:'main'},scalars:{rows:1,cols:1}}},emitters:[{name:'NewA',material:'m',modules:[{m:'InitialVelocity',StartVelocity:{const:[0,0,1]}}]},{name:'NewB',material:'m',modules:[]}]};
let passed=0;
async function check(name,fn){await fn();console.log('PASS '+name);passed++;}
function fixture(options={}){
 const nodes=new Map(),calls=[];let sequence=0,b,it,checkedOut=false;
 const reply=line=>({data:{return_value:'True',out_LogOutput:'Output='+JSON.stringify(line)}});
 const get=path=>plain(nodes.get(path)||{});
 async function api(route,body){
  calls.push({route,body});
  if(route==='/object/get'){
   const properties=get(body.path);
   if(body.properties?.includes("ForcePlatformSettings")&&!Object.hasOwn(properties,"ForcePlatformSettings"))properties.ForcePlatformSettings=[];
   if(options.badTextureReadback&&properties.ForcePlatformSettings)properties.ForcePlatformSettings=[];
   if(options.badMaterialReadback&&properties.BasePropertyOverrides)properties.BasePropertyOverrides.TwoSided=true;
   if(!body.properties)delete properties.SoloTracking;
   return {data:{properties}};
  }
  if(route==='/object/set'){
   if(require('./mock-import-policy.cjs').simulateTexturePolicyWrite(body,nodes))return {data:{failed_properties:[]}};
   const props=plain(body.properties);
   if('UnexpectedNativeField'in props)return {data:{failed_properties:['UnexpectedNativeField']}};
   if(props.Emitters){
    props.Emitters=[...props.Emitters.matchAll(/ParticleSpriteEmitter'([^']+)'/g)].map(m=>({path:m[1],class:'ParticleSpriteEmitter'}));
    if(options.swapFail&&props.Emitters.some(e=>e.path.includes('ParticleSpriteEmitter_')))return {data:{failed_properties:['Emitters']}};
   }
   if(typeof props.LODDistances==='string')props.LODDistances=props.LODDistances.replace(/[()]/g,'').split(',').filter(Boolean).map(Number);
   if(typeof props.LODSettings==='string')props.LODSettings=[{}];
   if(typeof props.SoloTracking==='string')props.SoloTracking=[...props.SoloTracking.matchAll(/SoloEnableSetting=\(([^)]*)\)/g)].map(m=>({SoloEnableSetting:m[1].split(',').map(Number)}));
   for(const key of ['RequiredModule','SpawnModule','TypeDataModule'])if(typeof props[key]==='string')props[key]={path:props[key]};
   nodes.set(body.path,{...get(body.path),...props});return {data:{failed_properties:[]}};
  }
  if(route==='/object/container'){
   if(options.cacheFail&&body.container_path==='SoloTracking'&&body.op==='array_append')return {data:{ok:false,error:'Fixture cache write rejected'}};
   const node=get(body.path),match=body.container_path.match(/^SoloTracking\[(\d+)\]\.SoloEnableSetting$/);
   const holder=match?node.SoloTracking[Number(match[1])]:node,key=match?'SoloEnableSetting':body.container_path;
   if(body.op==='array_remove')holder[key].splice(body.index,1);
   else holder[key]=[...(holder[key]||[]),key==='SoloTracking'?{SoloEnableSetting:[]}:typeof body.value==='number'?body.value:{path:body.value}];
   nodes.set(body.path,node);return {data:{ok:true}};
  }
  if(body.function==='SpawnObject'){
   const path=body.args.Outer+':'+body.args.ObjectClass.split('.').pop()+'_'+sequence++;nodes.set(path,{});return {data:{return_value:path}};
  }
  if(body.function==='SetMetadataTag')return {data:{return_value:'True'}};
  if(body.function==='SaveAsset'){
   const newPS=(get(objectPath(it.assets.ps)).Emitters||[]).some(e=>e.path.includes('ParticleSpriteEmitter_'));
   return {data:{return_value:options.saveFail&&body.args.AssetToSave===it.assets.ps&&newPS?'False':'True'}};
  }
  if(body.function==='DuplicateAsset')return {data:{return_value:'True'}};
  if(body.function!=='ExecutePythonCommandEx')throw Error('Unhandled fixture '+JSON.stringify(body));
  const code=body.args.PythonCommand;
  if(code.includes('# FWL_DELIVERY_GATE'))return reply('FWLDELIVERYGATE:'+JSON.stringify({ok:true,problems:[],registry:{}}));     // 只在测独立交付入口时出现（同 check-delivery-*）
   if(code.includes('# FWL_POLICY_DIRS')&&options.missingDir)throw Error('Destination directory does not exist; creation is forbidden');
   if(require('./mock-import-policy.cjs').simulatePolicy(code,nodes))return reply('');
  if(code.includes('# FWL_SELECTION_REUSE')){const entries=JSON.parse(code.match(/entries = (\[.*\])\n/)[1]);return reply('FWLREUSE:'+JSON.stringify(entries.map(([key,pkg])=>({key,pkg,exists:!options.missingDependency,class:options.wrongDependency?'Material':key.startsWith('tex:')?'Texture2D':'MaterialInstanceConstant'}))));}
  if(code.includes("print('FWLTARGETS:'")){
   const entries=JSON.parse(code.match(/entries = (\[.*\])\n/)[1]);
   return reply('FWLTARGETS:'+JSON.stringify(entries.map(([key,pkg])=>({key,pkg,exists:!(options.missingPS&&key==='ps'||options.missingMaterials&&key.startsWith('mat:')),class:options.wrongClass&&key.startsWith('tex:')?'Material':key==='ps'?'ParticleSystem':key.startsWith('tex:')?'Texture2D':'MaterialInstanceConstant',tag:'fwl.cascade/1 Fixture -> Fixture_01',diskHash:options.memoryOnly||options.missingPS&&key==='ps'||options.missingMaterials&&key.startsWith('mat:')?'':'fixture',sc:options.disabled?'disabled':checkedOut?'edited':'tracked',dirty:false,editable:!options.blocked,reason:''}))));
  }
  if(code.includes("print('FWLBACKUP:'")){
   if(options.backupFail)throw Error('Fixture backup storage failed');
   const entries=JSON.parse(code.match(/entries = (\[.*\])\n/)[1]);
   return reply('FWLBACKUP:'+JSON.stringify({directory:'D:/FXTools/DFWorkbench/workbench/asset-backups/Fixture_01_test',assets:entries.map(([key,pkg])=>({key,pkg,filename:'E:/fixture/'+pkg.split('/').pop()+'.uasset',original:'D:/fixture/original.uasset'}))}));
  }
  if(code.includes("print('FWLSAVE:'")){
   const entries=JSON.parse(code.match(/entries = (\[.*\])\n/)[1]);
   return reply('FWLSAVE:'+JSON.stringify(entries.map(([key,pkg])=>({key,pkg,saved:true,sc:options.scFailure?'failed':options.disabled?'disabled':'edited',reason:options.scFailure?'Checkout denied':''}))));
  }
  if(code.includes('assert sc.check_out_or_add_file')){if(options.checkoutFail)throw Error('Fixture checkout denied');checkedOut=true;}
  if(code.includes('ps = at.create_asset(')){nodes.set(objectPath(it.assets.ps),{Emitters:[],LODDistances:[],LODSettings:[],SoloTracking:[]});}
  if(code.includes('import_asset_tasks'))return reply('FWLJSON:'+JSON.stringify(Object.keys(it.spec.textures).filter(k=>it.selectedAssetKeys===undefined||it.selectedAssetKeys.includes('tex:'+k)).map(k=>[objectPath(it.assets['tex:'+k])])));
  if(code.includes("print('FWLP:'"))return reply('FWLP:'+code.match(/lod = unreal.find_object\(None, '([^']+)'/)[1]);
  if(code.includes('L.update_material_instance')){
   const path=code.match(/mi = unreal.load_object\(None, '([^']+)'/)[1];
   const parameters=[...code.matchAll(/texture_parameter_value\(mi, '([^']+)', unreal.load_object\(None, '([^']+)'/g)].map(m=>({ParameterInfo:{Name:m[1]},ParameterValue:{path:m[2]}}));
   const scalars=[...code.matchAll(/scalar_parameter_value\(mi, '([^']+)', ([\d.e+-]+)\)/g)].map(m=>({ParameterInfo:{Name:m[1]},ParameterValue:Number(m[2])}));
   nodes.set(path,{...get(path),TextureParameterValues:parameters,ScalarParameterValues:scalars,ObsoleteParameter:!code.includes('clear_all_material_instance_parameters')});
  }
  return reply('');
 }
 b=loadBackend(api,()=>{},options.htmlFile?{htmlFile:options.htmlFile}:{});     // htmlFile：可指定要测的入口（默认特效工作台 v2）
 it={as:'Fixture_01',dir:'D:/fixture',mode:'update',spec:plain(spec),assets:b.makePlan(spec,'Fixture_01')};
 const ps=objectPath(it.assets.ps),oldPaths=[ps+':OldA',ps+':OldB'];
 nodes.set(ps,{Emitters:oldPaths.map(path=>({path,class:'ParticleSpriteEmitter'})),LODDistances:[0],LODSettings:[{}],SoloTracking:oldPaths.map(()=>({SoloEnableSetting:[1]}))});
 if(options.missingPS)nodes.delete(ps);
 for(const path of oldPaths){const lod=path+':LOD';nodes.set(path,{EmitterName:path.split(':').pop(),LODLevels:[{path:lod}]});nodes.set(lod,{bEnabled:true,RequiredModule:{path:path+':Required'},SpawnModule:{path:path+':Spawn'},Modules:[]});nodes.set(path+':Required',{});nodes.set(path+':Spawn',{});}
 for(const [key,pkg]of Object.entries(it.assets))if(key!=='ps')nodes.set(objectPath(pkg),key.startsWith('mat:')?{ObsoleteParameter:true}:{});
 if(options.missingMaterials)for(const [key,pkg]of Object.entries(it.assets))if(key.startsWith('mat:'))nodes.delete(objectPath(pkg));
 nodes.set(objectPath(b.MAP.material_roles[spec.materials.m.role].template),{Parent:{path:'/Game/FixtureParent.FixtureParent'},TextureParameterValues:[],ScalarParameterValues:[],VectorParameterValues:[]});
 return {b,it,nodes,calls,ps,oldPaths,run:()=>b.importOne(it),get};
}
module.exports={fixture};
if(require.main===module)(async()=>{
 await check('完整更新保留PS对象，2个旧发射器全部替换且不先清空数组',async()=>{
  const t=fixture();await t.run();const paths=t.get(t.ps).Emitters.map(e=>e.path);assert.equal(paths.length,2);assert(paths.every(p=>!t.oldPaths.includes(p)));assert(!t.calls.some(c=>c.route==='/object/container'&&c.body.path===t.ps&&c.body.container_path==='Emitters'));assert(!t.calls.some(c=>c.body.args?.PythonCommand?.includes('create_asset(')));assert.equal(t.it.importProgress.edited.length,3);assert(t.it.backup.directory);
  const texture=t.calls.find(c=>c.body.args?.PythonCommand?.includes('import_asset_tasks')).body.args.PythonCommand;assert(texture.includes("'replace_existing', True"));assert.equal(t.get(objectPath(t.it.assets['mat:m'])).ObsoleteParameter,false);
 });
 await check('未知模块属性使暂存失败，旧发射器列表仍完整',async()=>{const t=fixture();t.it.spec.emitters[1].modules.push({m:'InitialVelocity',UnexpectedNativeField:1});await assert.rejects(t.run(),/UnexpectedNativeField/);assert.deepEqual(t.get(t.ps).Emitters.map(e=>e.path),t.oldPaths);assert(!t.calls.some(c=>c.body.properties?.Emitters));assert(t.it.backup);});
 await check('粒子保存失败会恢复旧引用，错误保留备份路径',async()=>{const t=fixture({saveFail:true});await assert.rejects(t.run(),/保存失败/);assert.deepEqual(t.get(t.ps).Emitters.map(e=>e.path),t.oldPaths);assert.equal(t.it.importProgress.particleRestored,true);});
 await check('替换接口拒绝时不会留下空或半套发射器',async()=>{const t=fixture({swapFail:true});await assert.rejects(t.run(),/写入失败/);assert.deepEqual(t.get(t.ps).Emitters.map(e=>e.path),t.oldPaths);});
 await check('他人锁定及类型不符在备份和覆盖之前阻止',async()=>{for(const options of [{blocked:true},{wrongClass:true}]){const t=fixture(options);await assert.rejects(t.run(),/不可写|类型不符/);assert(!t.calls.some(c=>c.body.function==='SaveAsset'||c.body.args?.PythonCommand?.includes('import_asset_tasks')));}});
 await check('备份失败或迁出失败不开始更新依赖',async()=>{for(const options of [{backupFail:true},{checkoutFail:true}]){const t=fixture(options);await assert.rejects(t.run(),/backup|checkout/);assert(!t.calls.some(c=>c.body.args?.PythonCommand?.includes('import_asset_tasks')));assert.deepEqual(t.get(t.ps).Emitters.map(e=>e.path),t.oldPaths);}});
 await check('预览后参数改变需重新确认，空发射器不能覆盖',async()=>{const t=fixture();t.it.targets=await t.b.readUpdateTargets(t.it);t.nodes.set(t.oldPaths[0],{...t.get(t.oldPaths[0]),EmitterName:'ChangedByUser'});await assert.rejects(t.run(),/发生变化/);assert(!t.calls.some(c=>c.body.function==='SaveAsset'));const empty=fixture();empty.it.spec.emitters=[];await assert.rejects(empty.run(),/没有发射器/);assert(!empty.calls.some(c=>c.body.function==='SaveAsset'));});
 await check('版本管理未启用可保存但不会冒称添加或编辑',async()=>{const t=fixture({disabled:true});await t.run();assert.equal(t.it.importProgress.saved.length,3);assert.equal(t.it.importProgress.added.length,0);assert.equal(t.it.importProgress.edited.length,0);});
 await check('增减发射器时同步隐藏的独奏缓存，不沿用旧数组长度',async()=>{
  for(const count of [1,3]){
   const t=fixture();t.it.spec.emitters=Array.from({length:count},(_,i)=>({name:'New'+i,material:'m',modules:[]}));
   await t.run();assert.equal(t.get(t.ps).SoloTracking.length,count);
   assert.deepEqual(t.get(t.ps).SoloTracking.map(row=>row.SoloEnableSetting),Array.from({length:count},()=>[1]));
   assert(t.calls.some(c=>c.body.container_path?.startsWith('SoloTracking')),'使用已实测的容器接口维护隐藏缓存');
   assert(t.calls.some(c=>c.route==='/object/get'&&c.body.properties?.includes('SoloTracking')),'必须显式读回隐藏缓存');
  }
 });
 await check('缓存写入被拒绝时不切换到新发射器',async()=>{
  const t=fixture({cacheFail:true});t.it.spec.emitters.push({name:'Extra',material:'m',modules:[]});
  await assert.rejects(t.run(),/cache write rejected/);assert.deepEqual(t.get(t.ps).Emitters.map(e=>e.path),t.oldPaths);assert.equal(t.get(t.ps).SoloTracking.length,2);
 });
 await check('旧禁用状态不会让重建后的新发射器被独奏缓存关闭',async()=>{
  const t=fixture();t.nodes.set(t.ps,{...t.get(t.ps),SoloTracking:[{SoloEnableSetting:[0]},{SoloEnableSetting:[1]}]});
  const lod=t.get(t.oldPaths[0]).LODLevels[0].path;t.nodes.set(lod,{...t.get(lod),bEnabled:false});
  await t.run();assert.deepEqual(t.get(t.ps).SoloTracking.map(x=>x.SoloEnableSetting),[[1],[1]]);
 });
 await check('原系统多级LOD在更新依赖之前拦截',async()=>{
  const t=fixture();t.nodes.set(t.oldPaths[0],{...t.get(t.oldPaths[0]),LODLevels:[...t.get(t.oldPaths[0]).LODLevels,{path:t.oldPaths[0]+':SecondLOD'}]});
  await assert.rejects(t.run(),/单级 LOD/);assert(!t.calls.some(c=>c.body.function==='SaveAsset'||c.body.args?.PythonCommand?.includes('import_asset_tasks')));
 });
 await check('新建系统先准备完整缓存再接入发射器',async()=>{
  const t=fixture();t.it.mode='create';t.nodes.set(t.ps,{Emitters:[],SoloTracking:[],LODDistances:[0],LODSettings:[{}]});
  await t.run();assert.equal(t.get(t.ps).Emitters.length,2);assert.deepEqual(t.get(t.ps).SoloTracking.map(x=>x.SoloEnableSetting),[[1],[1]]);
  assert(!t.calls.some(c=>c.route==='/object/container'&&c.body.path===t.ps&&c.body.container_path==='Emitters'));
 });
 console.log(passed+' backend update checks passed with simulated UE.');
})().catch(e=>{console.error(e);process.exitCode=1;});
