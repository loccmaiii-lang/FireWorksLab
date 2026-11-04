const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {loadBackend}=require('./import-backend.cjs');
// Regression uses the original failing export, not a later user revision.
const source=__dirname+'/research/preroll-20261004/cascade-before.json';
const sourceBytes=fs.readFileSync(source),realSpec=JSON.parse(sourceBytes);
const backup=__dirname+'/backups/2026-10-04-preroll/df-fx-workbench_v2_locmai.html';
const clone=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
let passed=0;
function check(name,fn){fn();console.log('PASS '+name);passed++;}

function fixture(spec,old=false){
 const nodes=new Map(),calls=[];let next=0,backend,item;
 const reply=line=>({data:{return_value:'True',out_LogOutput:'Output='+JSON.stringify(line)}});
 async function fake(route,body){
  calls.push({route,body});
  if(route==='/object/get')return {data:{properties:{ForcePlatformSettings:[],LODDistances:[0],LODSettings:[{}],Emitters:[],SoloTracking:[],...(nodes.get(body.path)||{})}}};
  if(route==='/object/set'){
      if(require('./mock-import-policy.cjs').simulateTexturePolicyWrite(body,nodes))return {data:{failed_properties:[]}};
   const bad=Object.keys(body.properties).filter(k=>['preRoll','note','_note','UnexpectedNativeField'].includes(k));
   if(bad.length)return {data:{failed_properties:bad}};
   const properties=clone(body.properties);
   for(const key of ['RequiredModule','SpawnModule','TypeDataModule'])if(typeof properties[key]==='string')properties[key]={path:properties[key]};
   if(properties.Emitters)properties.Emitters=[...properties.Emitters.matchAll(/ParticleSpriteEmitter'([^']+)'/g)].map(m=>({path:m[1]}));
   if(typeof properties.LODDistances==='string')properties.LODDistances=[0];
   if(typeof properties.LODSettings==='string')properties.LODSettings=[{}];
   nodes.set(body.path,{...(nodes.get(body.path)||{}),...properties});return {data:{failed_properties:[]}};
  }
  if(route==='/object/container'){
   const node=nodes.get(body.path)||{LODDistances:[0],LODSettings:[{}],Emitters:[]};
   const match=body.container_path.match(/^SoloTracking\[(\d+)\]\.SoloEnableSetting$/);
   const holder=match?node.SoloTracking[Number(match[1])]:node,key=match?'SoloEnableSetting':body.container_path;
   if(body.op==='array_remove')holder[key].splice(body.index,1);
   else holder[key]=[...(holder[key]||[]),key==='SoloTracking'?{SoloEnableSetting:[]}:typeof body.value==='number'?body.value:{path:body.value}];
   nodes.set(body.path,node);return {data:{ok:true}};
  }
  if(body.function==='SpawnObject'){
   const path=body.args.Outer+':'+body.args.ObjectClass.split('.').pop()+'_'+next++;
   nodes.set(path,{});return {data:{return_value:path}};
  }
  if(body.function==='DuplicateAsset'||body.function==='SetMetadataTag'||body.function==='SaveAsset')return {data:{return_value:'True'}};
  if(body.function==='ExecutePythonCommandEx'){
   const code=body.args.PythonCommand;
   if(require('./mock-import-policy.cjs').simulatePolicy(code,nodes))return reply('');
   if(code.includes('import_asset_tasks'))return reply('FWLJSON:'+JSON.stringify(Object.keys(spec.textures||{}).map(k=>{
    const pkg=item.assets['tex:'+k];return [pkg+'.'+pkg.split('/').pop()];
   })));
   if(code.includes("print('FWLP:'"))return reply('FWLP:'+code.match(/lod = unreal.find_object\(None, '([^']+)'/)[1]);
   if(code.includes('L.update_material_instance')){
    const path=code.match(/mi = unreal.load_object\(None, '([^']+)'/)[1];
    const textures=[...code.matchAll(/texture_parameter_value\(mi, '([^']+)', unreal.load_object\(None, '([^']+)'/g)]
      .map(m=>({ParameterInfo:{Name:m[1]},ParameterValue:{path:m[2]}}));
    const scalars=[...code.matchAll(/scalar_parameter_value\(mi, '([^']+)', ([\d.e+-]+)\)/g)]
      .map(m=>({ParameterInfo:{Name:m[1]},ParameterValue:Number(m[2])}));
    nodes.set(path,{TextureParameterValues:textures,ScalarParameterValues:scalars});
   }
   if(code.includes("print('FWLSAVE:'")){
    const entries=JSON.parse(code.match(/entries = (\[.*\])\n/)[1]);
    return reply('FWLSAVE:'+JSON.stringify(entries.map(([key,pkg])=>({key,pkg,saved:true,sc:'added',reason:''}))));
   }
   return reply('');
  }
  throw Error('Unexpected fixture operation '+JSON.stringify(body));
 }
 backend=loadBackend(fake,()=>{},old?{htmlFile:backup}:{});
 const naming={baseName:'YonshakuKamuro',assetIndex:'01',particleNumbered:false};
 item={as:'YonshakuKamuro_01',naming,dir:'D:/fixtures',spec,assets:backend.makePlan(spec,'YonshakuKamuro_01',naming)};
 const psPath=item.assets.ps+'.'+item.assets.ps.split('/').pop();
 const lodOf=name=>{
  const emitter=[...nodes.values()].find(n=>n.EmitterName===name);
  assert(emitter,'Emitter '+name+' missing');return nodes.get(emitter.LODLevels[0].path);
 };
 const modulesOf=(name,cls)=>lodOf(name).Modules.filter(m=>m.path.includes(':'+cls+'_')).map(m=>({path:m.path,properties:nodes.get(m.path)}));
 const distOf=(module,prop)=>{
  const path=module.properties[prop]?.match(/Distribution=[^']+'([^']+)'/)?.[1];
  assert(path,'Distribution '+prop+' missing');return {path,properties:nodes.get(path)};
 };
 return {backend,item,nodes,calls,psPath,lodOf,modulesOf,distOf,run:()=>backend.importOne(item)};
}

const vectorKeys=text=>[...text.matchAll(/\(InVal=([^,]+),OutVal=\(X=([^,]+),Y=([^,]+),Z=([^)]+)\)/g)]
 .map(m=>[Number(m[1]),[Number(m[2]),Number(m[3]),Number(m[4])]]);
const scalarKeys=text=>[...text.matchAll(/\(InVal=([^,]+),OutVal=([^,]+),/g)].map(m=>[Number(m[1]),Number(m[2])]);
const rounded=keys=>keys.map(([t,v])=>[Number(t.toFixed(6)),Array.isArray(v)?v.map(n=>Number(n.toFixed(6))):Number(v.toFixed(6))]);
const simple=marker=>({format:'fwl.cascade/1',name:'Fixture',textures:{},materials:{m:{role:'soft_dot'}},emitters:[{
 name:'Test',material:'m',modules:[{m:'SizeByLife',...marker,LifeMultiplier:{curve:[[0,[.02,.02,1]],[1,[1,1,1]]]},MultiplyX:true,MultiplyY:true,MultiplyZ:false}]
}]});

(async()=>{
 const old=fixture(clone(realSpec),true);await assert.rejects(old.run(),/preRoll/);
 check('old actual package fails on preRoll after seven dependencies are saved',()=>{
  assert.equal(old.item.importProgress.saved.length,7);assert.equal(old.item.importProgress.added.length,7);
  assert(!old.calls.some(c=>c.body.function==='SaveAsset'&&c.body.args.AssetToSave===old.item.assets.ps));
  assert(![...old.nodes.values()].some(n=>n.EmitterName));
 });
 if(process.argv.includes('--reproduce'))return;

 const fixed=fixture(clone(realSpec));
 check('actual package passes validation',()=>assert.equal(fixed.backend.validate(realSpec).length,0));
 await fixed.run();
 check('all three intended emitters are linked and all eight assets are saved',()=>{
  assert.equal(fixed.nodes.get(fixed.psPath).Emitters.length,3);
  assert.equal(fixed.item.importProgress.saved.length,8);assert.equal(fixed.item.importProgress.added.length,8);
  assert.equal(fixed.nodes.get(fixed.psPath).Emitters.map(e=>fixed.nodes.get(e.path).EmitterName).join(','),realSpec.emitters.map(e=>e.name).join(','));
 });
 check('preRoll remains source metadata and is never sent as a native property',()=>{
  assert(!fixed.calls.some(c=>c.route==='/object/set'&&Object.hasOwn(c.body.properties,'preRoll')));
  assert.equal(fixed.item.spec.emitters[0].modules.find(m=>m.preRoll).preRoll,true);
 });
 const sizes=fixed.modulesOf('L1_MainA','ParticleModuleSizeMultiplyLife');
 check('growth module is retained exactly once with its original axis flags',()=>{
  assert.equal(sizes.length,1);
  assert.equal(sizes[0].properties.MultiplyX,true);assert.equal(sizes[0].properties.MultiplyY,true);assert.equal(sizes[0].properties.MultiplyZ,false);
 });
 check('all ten original growth curve keys survive on a vector constant curve',()=>{
  const distribution=fixed.distOf(sizes[0],'LifeMultiplier');assert(distribution.path.includes(':DistributionVectorConstantCurve_'));
  const expected=realSpec.emitters[0].modules.find(m=>m.preRoll).LifeMultiplier.curve;
  assert.equal(expected.length,10);assert.deepEqual(vectorKeys(distribution.properties.ConstantCurve),rounded(expected));
  assert.equal(distribution.properties.bCanBeBaked,false);
 });
 check('all emitter durations and delays are unchanged',()=>{
  for(const emitter of realSpec.emitters){const req=fixed.nodes.get(fixed.lodOf(emitter.name).RequiredModule.path);
   assert.equal(req.EmitterDuration,emitter.required.duration_s);assert.equal(req.EmitterDelay,emitter.required.delay_s);assert.equal(req.EmitterLoops,emitter.required.loops);
  }
 });
 check('both frame curves including the pre-roll first-frame hold are preserved',()=>{
  const dyn=fixed.backend.MAP.dynamic_params,frameName=dyn.names[dyn.roles.frame];
  for(const emitter of realSpec.emitters.filter(e=>e.modules.some(m=>m.m==='DynamicParameter'))){
   const md=emitter.modules.find(m=>m.m==='DynamicParameter'),module=fixed.modulesOf(emitter.name,'ParticleModuleParameterDynamic')[0];
   const params=[...module.properties.DynamicParams.matchAll(/ParamName="([^"]+)"[^']+Distribution=[^']+'([^']+)'/g)];
   const frame=params.find(p=>p[1]===frameName);assert(frame);
   assert.deepEqual(scalarKeys(fixed.nodes.get(frame[2]).ConstantCurve),rounded(md.params.frame.curve));
  }
 });
 check('second emitter pivot conversion remains correct',()=>{
  const pivots=fixed.modulesOf('L1_MainB','ParticleModulePivotOffset');assert.equal(pivots.length,1);assert.equal(pivots[0].properties.PivotOffset,'(X=0.000000,Y=0.093300)');
 });
 check('GPU emitter and three-row SoloTracking cache remain linked',()=>{
  assert(fixed.lodOf('L2_Dots').TypeDataModule.path.includes(':ParticleModuleTypeDataGpu_'));
  assert.equal(JSON.stringify(fixed.nodes.get(fixed.psPath).SoloTracking),JSON.stringify([{SoloEnableSetting:[1]},{SoloEnableSetting:[1]},{SoloEnableSetting:[1]}]));
 });
 const explicitFalse=fixture(simple({preRoll:false}));await explicitFalse.run();
 check('false marker retains an ordinary SizeByLife module',()=>assert.equal(explicitFalse.modulesOf('Test','ParticleModuleSizeMultiplyLife').length,1));
 const omitted=fixture(simple({note:'description',_note:'description'}));await omitted.run();
 check('omitted marker and both note metadata fields still work',()=>{
  assert.equal(omitted.modulesOf('Test','ParticleModuleSizeMultiplyLife').length,1);
  assert(!omitted.calls.some(c=>c.route==='/object/set'&&('note' in c.body.properties||'_note' in c.body.properties)));
 });
 check('string marker is caught during validation',()=>assert(fixed.backend.validate(simple({preRoll:'true'})).some(e=>e.includes('preRoll')&&e.includes('布尔'))));
 const misplaced=simple({preRoll:true});misplaced.emitters[0].modules[0].m='InitialSize';
 check('marker on an unrelated module is rejected before execution',()=>assert(fixed.backend.validate(misplaced).some(e=>e.includes('preRoll')&&e.includes('SizeByLife'))));
 const typo=simple({preRoll:true,UnexpectedNativeField:1}),interrupted=fixture(typo);
 await assert.rejects(interrupted.run(),/UnexpectedNativeField/);
 check('a genuine invalid property still stops the import without saving a partial particle',()=>{
  assert(!interrupted.calls.some(c=>c.body.function==='SaveAsset'&&c.body.args.AssetToSave===interrupted.item.assets.ps));
 });
 check('source package bytes and in-memory specification are unchanged',()=>{
  assert.equal(hash(fs.readFileSync(source)),hash(sourceBytes));assert.deepEqual(fixed.item.spec,realSpec);
 });
 console.log(passed+' preRoll checks passed; all native writes simulated.');
})().catch(error=>{console.error(error);process.exitCode=1;});
