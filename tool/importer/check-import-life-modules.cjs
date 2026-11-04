const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {loadBackend}=require('./import-backend.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const root=path.join(__dirname,'research/module-support-20261005');
const backup=path.join(__dirname,'backups/2026-10-05-module-support/df-fx-workbench_v2_locmai.html');
const snapshots=['S','M','L'].flatMap(s=>['','_mobile'].map(p=>'RiseTail'+s+'_cascade'+p+'.json'));
let passed=0;
function check(name,fn){fn();console.log('PASS '+name);passed++;}
function fixture(spec,htmlFile){
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
   nodes.set(path,path.includes(':Distribution')?{bCanBeBaked:true}:{});return {data:{return_value:path}};
  }
  if(body.function==='DuplicateAsset'||body.function==='SetMetadataTag'||body.function==='SaveAsset')return {data:{return_value:'True'}};
  if(body.function==='ExecutePythonCommandEx'){
   const code=body.args.PythonCommand;
   if(code.includes('# FWL_DELIVERY_GATE'))return reply('FWLDELIVERYGATE:'+JSON.stringify({ok:true,problems:[],registry:{}}));     // 只在测独立交付入口时出现（同 check-delivery-*）
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
 backend=loadBackend(fake,()=>{},htmlFile?{htmlFile}:{});
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
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const vector=text=>[...text.matchAll(/[XYZ]=([\d.e+-]+)/g)].map(m=>Number(m[1]));
const simple=(modules,gpu=false)=>({format:'fwl.cascade/1',name:'LifeProbe',materials:{m:{role:'soft_dot'}},emitters:[{
 name:'Test',material:'m',gpu,required:{screen_alignment:'Rectangle',duration_s:2,loops:1,delay_s:0},
 spawn:{rate:{const:0},bursts:[[0,1]]},modules
}]});
const vel=(extra={})=>({m:'VelocityOverLife',VelOverLife:{curve:[[0,[10,0,10000]],[.4,[6,0,5000]],[1,[0,0,100]]],bake:false},Absolute:true,...extra});
const size=(extra={})=>({m:'SizeByLife',LifeMultiplier:{curve:[[0,[1,.03,1]],[.25,[1,1,1]],[1,[1,.4,1]]],bake:false},MultiplyX:false,MultiplyY:true,MultiplyZ:false,...extra});

(async()=>{
 const actual=JSON.parse(fs.readFileSync(path.join(root,snapshots[0])));
 const initial=fixture(clone(actual));
 check('actual RT5 export is accepted including both velocity-life modules',()=>assert.deepEqual(clone(initial.backend.validate(actual)),[]));
 if(process.argv.includes('--reproduce'))return;
 const previous=fixture(actual,backup);
 check('frozen v2.12 reproduces two unknown modules',()=>assert.equal(previous.backend.validate(actual).filter(x=>x.includes('VelocityOverLife')).length,2));
 const rt6Bytes=fs.readFileSync(path.join(root,'RT6L-current-cascade.json')),rt6Spec=JSON.parse(rt6Bytes),rt6=fixture(clone(rt6Spec));
 check('actual current RT6 package passes validation',()=>assert.deepEqual(clone(rt6.backend.validate(rt6Spec)),[]));
 await rt6.run();
 check('actual RT6 near/far and all ten emitters/cache are linked',()=>{
  const ps=rt6.nodes.get(rt6.psPath);assert.equal(ps.Emitters.length,10);assert.equal(ps.SoloTracking.length,10);
  assert.deepEqual(ps.Emitters.map(e=>rt6.nodes.get(e.path).EmitterName),rt6Spec.emitters.map(e=>e.name));
  assert(!rt6Spec.emitters.some(e=>e.name==='RiseFade'));
 });
 check('actual RT6 loop and glow retain complete velocity curves and Y-only size',()=>{
  for(const name of ['RiseLoop','HeadGlow']){
   const source=rt6Spec.emitters.find(e=>e.name===name).modules.find(m=>m.m==='VelocityOverLife'),module=rt6.modulesOf(name,'ParticleModuleVelocityOverLifetime')[0];
   assert.equal(module.properties.Absolute,true);assert.deepEqual(vectorKeys(rt6.distOf(module,'VelOverLife').properties.ConstantCurve),rounded(source.VelOverLife.curve));
  }
  const size=rt6.modulesOf('RiseLoop','ParticleModuleSizeMultiplyLife')[0],source=rt6Spec.emitters.find(e=>e.name==='RiseLoop').modules.find(m=>m.m==='SizeByLife');
  assert.equal(size.properties.MultiplyX,false);assert.equal(size.properties.MultiplyY,true);assert.equal(size.properties.MultiplyZ,false);
  assert.deepEqual(vectorKeys(rt6.distOf(size,'LifeMultiplier').properties.ConstantCurve),rounded(source.LifeMultiplier.curve));
 });
 check('actual RT6 far frame curve and independent pivot/delay remain unchanged',()=>{
  const far=rt6Spec.emitters.find(e=>e.name==='TrailFar'),req=rt6.nodes.get(rt6.lodOf('TrailFar').RequiredModule.path);
  assert.equal(req.ScreenAlignment,'PSA_Velocity');assert.equal(req.EmitterDelay,far.required.delay_s);
  assert.equal(rt6.modulesOf('TrailFar','ParticleModulePivotOffset')[0].properties.PivotOffset,'(X=0.000000,Y=0.000000)');
  const module=rt6.modulesOf('TrailFar','ParticleModuleParameterDynamic')[0],dyn=rt6.backend.MAP.dynamic_params,frameName=dyn.names[dyn.roles.frame];
  const params=[...module.properties.DynamicParams.matchAll(/ParamName="([^"]+)"[^']+Distribution=[^']+'([^']+)'/g)],frame=params.find(p=>p[1]===frameName);assert(frame);
  assert.deepEqual(scalarKeys(rt6.nodes.get(frame[2]).ConstantCurve),rounded(far.modules.find(m=>m.m==='DynamicParameter').params.frame.curve));
 });
 check('actual RT6 dependencies saved only at reviewed targets and source bytes untouched',()=>{
  const expected=Object.keys(rt6Spec.textures).length+Object.values(rt6Spec.materials).filter(m=>!rt6.backend.MAP.material_roles[m.role].use).length+1;
  assert.equal(rt6.item.importProgress.saved.length,expected);assert.equal(rt6.item.importProgress.added.length,expected);
  assert.equal(sha(fs.readFileSync(path.join(root,'RT6L-current-cascade.json'))),sha(rt6Bytes));assert.deepEqual(rt6.item.spec,rt6Spec);
 });
 for(const filename of snapshots){
  const bytes=fs.readFileSync(path.join(root,filename)),spec=JSON.parse(bytes),f=fixture(clone(spec));
  assert.deepEqual(clone(f.backend.validate(spec)),[]);await f.run();
  check(filename+' all emitters linked and cache matches',()=>{
   const ps=f.nodes.get(f.psPath);assert.equal(ps.Emitters.length,spec.emitters.length);
   assert.deepEqual(ps.Emitters.map(e=>f.nodes.get(e.path).EmitterName),spec.emitters.map(e=>e.name));
   assert.deepEqual(ps.SoloTracking,spec.emitters.map(()=>({SoloEnableSetting:[1]})));
  });
  check(filename+' CPU velocity curves and Absolute preserve every Linear key',()=>{
   for(const es of spec.emitters.filter(e=>e.modules.some(m=>m.m==='VelocityOverLife'))){
    assert.equal(es.gpu,false);const source=es.modules.find(m=>m.m==='VelocityOverLife');
    const modules=f.modulesOf(es.name,'ParticleModuleVelocityOverLifetime');assert.equal(modules.length,1);
    assert.equal(modules[0].properties.Absolute,source.Absolute);
    const dist=f.distOf(modules[0],'VelOverLife');assert(dist.path.includes(':DistributionVectorConstantCurve_'));
    assert.deepEqual(vectorKeys(dist.properties.ConstantCurve),rounded(source.VelOverLife.curve));
    assert.equal((dist.properties.ConstantCurve.match(/InterpMode=CIM_Linear/g)||[]).length,source.VelOverLife.curve.length);
    assert.equal(dist.properties.bCanBeBaked,false);
    assert.equal(f.modulesOf(es.name,'ParticleModuleAccelerationDrag').length,0);
    assert.equal(f.modulesOf(es.name,'ParticleModuleAccelerationConstant').length,0);
   }
  });
  check(filename+' only Y scales; each emitter retains its own Pivot/size/timing',()=>{
   const sx=f.modulesOf('RiseLoop','ParticleModuleSizeMultiplyLife');assert.equal(sx.length,1);
   const md=spec.emitters.find(e=>e.name==='RiseLoop').modules.find(m=>m.m==='SizeByLife');
   assert.equal(sx[0].properties.MultiplyX,false);assert.equal(sx[0].properties.MultiplyY,true);assert.equal(sx[0].properties.MultiplyZ,false);
   const sd=f.distOf(sx[0],'LifeMultiplier');assert.deepEqual(vectorKeys(sd.properties.ConstantCurve),rounded(md.LifeMultiplier.curve));assert.equal(sd.properties.bCanBeBaked,false);
   for(const es of spec.emitters){
    const req=f.nodes.get(f.lodOf(es.name).RequiredModule.path);
    assert.equal(req.EmitterDuration,es.required.duration_s);assert.equal(req.EmitterDelay,es.required.delay_s);assert.equal(req.EmitterLoops,es.required.loops);
    if(es.required.pivot_offset){const modules=f.modulesOf(es.name,'ParticleModulePivotOffset');assert.equal(modules.length,1);
     const [x,y]=es.required.pivot_offset;assert.equal(modules[0].properties.PivotOffset,'(X='+(x+.5).toFixed(6)+',Y='+(y+.5).toFixed(6)+')');}
    const source=es.modules.find(m=>m.m==='InitialSize');if(source.StartSize.const){assert.deepEqual(vector(f.distOf(f.modulesOf(es.name,'ParticleModuleSize')[0],'StartSize').properties.Constant),source.StartSize.const);}
   }
   assert.notEqual(spec.emitters.find(e=>e.name==='RiseLoop').required.pivot_offset[1],spec.emitters.find(e=>e.name==='RiseFade').required.pivot_offset[1]);
  });
  check(filename+' frame curves, CPU/GPU distribution defaults and save targets remain',()=>{
   for(const es of spec.emitters){
    const dyn=es.modules.find(m=>m.m==='DynamicParameter');if(dyn){
     const module=f.modulesOf(es.name,'ParticleModuleParameterDynamic')[0],frameName=f.backend.MAP.dynamic_params.names[f.backend.MAP.dynamic_params.roles.frame];
     const params=[...module.properties.DynamicParams.matchAll(/ParamName="([^"]+)"[^']+Distribution=[^']+'([^']+)'/g)],frame=params.find(p=>p[1]===frameName);
     assert(frame);assert.deepEqual(scalarKeys(f.nodes.get(frame[2]).ConstantCurve),rounded(dyn.params.frame.curve));
    }
    const colors=f.modulesOf(es.name,'ParticleModuleColorOverLife');if(colors.length){const d=f.distOf(colors[0],'ColorOverLife'),md=es.modules.find(m=>m.m==='ColorOverLife');
     assert.equal(d.properties.bCanBeBaked,md.ColorOverLife.bake??!!es.gpu);}
    assert.equal(!!f.lodOf(es.name).TypeDataModule,!!es.gpu);
   }
   const expected=Object.keys(spec.textures||{}).length+Object.values(spec.materials).filter(m=>!f.backend.MAP.material_roles[m.role].use).length+1;
   assert.equal(f.item.importProgress.saved.length,expected);assert.equal(f.item.importProgress.added.length,expected);
  });
  check(filename+' source package unchanged',()=>{assert.equal(sha(fs.readFileSync(path.join(root,filename))),sha(bytes));assert.deepEqual(f.item.spec,spec);});
 }
 for(const [name,distribution] of [['const',{const:[-100,0,2500]}],['uniform',{uniform:[[-10,-5,100],[10,5,200]]}],['curve',vel().VelOverLife]]){
  const f=fixture(simple([vel({VelOverLife:distribution,Absolute:false})]));await f.run();
  check(name+' vector distribution uses native class and preserves Absolute false',()=>{
   const m=f.modulesOf('Test','ParticleModuleVelocityOverLifetime')[0],d=f.distOf(m,'VelOverLife');assert.equal(m.properties.Absolute,false);
   assert(d.path.includes(':DistributionVector'+{const:'Constant',uniform:'Uniform',curve:'ConstantCurve'}[name]+'_'));
   assert.equal(d.properties.bCanBeBaked,false);
   if(name==='const')assert.deepEqual(vector(d.properties.Constant),distribution.const);
   if(name==='uniform'){assert.deepEqual(vector(d.properties.Min),distribution.uniform[0]);assert.deepEqual(vector(d.properties.Max),distribution.uniform[1]);}
  });
 }
 const omitted=vel();delete omitted.Absolute;const om=fixture(simple([omitted]));await om.run();
 check('omitted Absolute leaves native default untouched',()=>assert(!Object.hasOwn(om.modulesOf('Test','ParticleModuleVelocityOverLifetime')[0].properties,'Absolute')));
 for(const [name,edit] of [
  ['missing velocity',m=>delete m.VelOverLife],['scalar velocity',m=>m.VelOverLife={const:2}],
  ['short vector',m=>m.VelOverLife={const:[0,2]}],['nonfinite vector',m=>m.VelOverLife={const:[0,NaN,2]}],
  ['empty curve',m=>m.VelOverLife={curve:[]}],['time outside relative age',m=>m.VelOverLife={curve:[[0,[0,0,1]],[2,[0,0,2]]]}],
  ['unsorted times',m=>m.VelOverLife={curve:[[1,[0,0,1]],[0,[0,0,2]]]}],
  ['ambiguous distribution',m=>m.VelOverLife={const:[0,0,1],curve:[[0,[0,0,1]]]}],
  ['string Absolute',m=>m.Absolute='true'],['string bake',m=>m.VelOverLife.bake='false'],
  ['invalid uniform bounds',m=>m.VelOverLife={uniform:[[1,0,0],[0,1,1]]}]
 ]){
  const spec=simple([vel()]);edit(spec.emitters[0].modules[0]);const f=fixture(spec);
  check(name+' rejected during preview',()=>assert(f.backend.validate(spec).some(e=>e.includes('Test')&&e.includes('VelocityOverLife'))));
  await assert.rejects(f.run(),/素材配置检查失败/);
  check(name+' stops before any native or texture action',()=>assert.equal(f.calls.length,0));
 }
 for(const [name,module] of [['string axis',size({MultiplyY:'true'})],['scalar size',size({LifeMultiplier:{const:1}})],['empty size curve',size({LifeMultiplier:{curve:[]}})]]){
  const f=fixture(simple([module]));check(name+' rejected during preview',()=>assert(f.backend.validate(f.item.spec).some(e=>e.includes('SizeByLife'))));
 }
 const dense=Array.from({length:101},(_,i)=>[i/100,i%2?[25,3,2]:[0,0,0]]);
 const gpu=fixture(simple([{m:'SizeByLife',LifeMultiplier:{curve:[[0,[1,1,1]],[1,[1,.5,1]]]},MultiplyX:false,MultiplyY:true,MultiplyZ:false},
 {m:'ColorOverLife',ColorOverLife:{curve:dense},AlphaOverLife:{const:1}}],true));await gpu.run();
 check('dense GPU square-wave keys retained with lookup baking enabled',()=>{
  const d=gpu.distOf(gpu.modulesOf('Test','ParticleModuleColorOverLife')[0],'ColorOverLife');assert.deepEqual(vectorKeys(d.properties.ConstantCurve),rounded(dense));assert.equal(d.properties.bCanBeBaked,true);
  assert.equal(gpu.distOf(gpu.modulesOf('Test','ParticleModuleSizeMultiplyLife')[0],'LifeMultiplier').properties.bCanBeBaked,true);
 });
 const explicit=fixture(simple([size({LifeMultiplier:{const:[1,1,1],bake:true}})]));await explicit.run();
 check('explicit CPU bake true remains supported',()=>assert.equal(explicit.distOf(explicit.modulesOf('Test','ParticleModuleSizeMultiplyLife')[0],'LifeMultiplier').properties.bCanBeBaked,true));
 const far=simple([{m:'Lifetime',Lifetime:{const:4}},{m:'InitialSize',StartSize:{const:[2000,12000,1]}},{m:'InitialLocation',StartLocation:{const:[100,0,25000]}},
 {m:'InitialVelocity',StartVelocity:{const:[0,0,1]}},{m:'DynamicParameter',params:{frame:{curve:[[0,0],[.2,20],[.6,30],[1,63.99]]}}}]);
 far.emitters[0].name='TrailFar';far.emitters[0].required={screen_alignment:'Velocity',duration_s:4,loops:1,delay_s:1.5,pivot_offset:[-.5,-.5]};
 const tf=fixture(far);await tf.run();
 check('RT6 TrailFar contract retains independent geometry, direction, frame and delay',()=>{
  assert.equal(tf.nodes.get(tf.psPath).Emitters.length,1);assert.equal(tf.nodes.get(tf.lodOf('TrailFar').RequiredModule.path).ScreenAlignment,'PSA_Velocity');
  assert.equal(tf.nodes.get(tf.lodOf('TrailFar').RequiredModule.path).EmitterDelay,1.5);
  assert.equal(tf.modulesOf('TrailFar','ParticleModulePivotOffset')[0].properties.PivotOffset,'(X=0.000000,Y=0.000000)');
  assert.equal(tf.modulesOf('TrailFar','ParticleModuleSizeMultiplyLife').length,0);assert.equal(tf.modulesOf('TrailFar','ParticleModuleVelocityOverLifetime').length,0);
  assert.deepEqual(vector(tf.distOf(tf.modulesOf('TrailFar','ParticleModuleVelocity')[0],'StartVelocity').properties.Constant),[0,0,1]);
  assert.deepEqual(vector(tf.distOf(tf.modulesOf('TrailFar','ParticleModuleLocation')[0],'StartLocation').properties.Constant),[100,0,25000]);
 });
 const metadata=fixture(simple([vel({note:'info',_note:'info'}),size({preRoll:true,note:'info'})]));await metadata.run();
 check('life metadata filtered while all real modules retained',()=>{
  assert.equal(metadata.modulesOf('Test','ParticleModuleVelocityOverLifetime').length,1);assert.equal(metadata.modulesOf('Test','ParticleModuleSizeMultiplyLife').length,1);
  assert(!metadata.calls.some(c=>c.route==='/object/set'&&['preRoll','note','_note'].some(k=>Object.hasOwn(c.body.properties,k))));
 });
 const bad=fixture(simple([vel({UnexpectedNativeField:1})]));await assert.rejects(bad.run(),/UnexpectedNativeField/);
 check('genuine native write failure still stops before saving the particle',()=>assert(!bad.calls.some(c=>c.body.function==='SaveAsset'&&c.body.args.AssetToSave===bad.item.assets.ps)));
 const unknown=fixture(simple([{m:'UnrecognizedModule'}]));await assert.rejects(unknown.run(),/不认识的模块/);
 check('unknown module still blocked before execution',()=>assert.equal(unknown.calls.length,0));
 fs.writeFileSync(path.join(root,'life-checks.json'),JSON.stringify({passed,native:'all calls mocked',visual:'not tested'},null,2));
 console.log(passed+' life module checks passed; all native writes simulated.');
})().catch(e=>{console.error(e);process.exitCode=1;});
