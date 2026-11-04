const assert=require('node:assert/strict');
const fs=require('node:fs');
const {loadBackend}=require('./import-backend.cjs');

// Frozen historical RT4 export; user iterations must not change the old failure fixture.
const realSpec=JSON.parse(fs.readFileSync(__dirname+'/research/module-support-20261005/RT4L-regression-cascade.json','utf8'));
const savedHtml=__dirname+'/backups/2026-10-04-import-failure/df-fx-workbench_v2_locmai.html';

function fixture(spec,options={}){
  const nodes=new Map(),calls=[];let next=0,backend;
  const reply=line=>({data:{return_value:'True',out_LogOutput:'Output='+JSON.stringify(line)}});
  async function fake(route,body){
    calls.push({route,body});
    if(route==='/object/get')return {data:{properties:{ForcePlatformSettings:[],LODDistances:[0],LODSettings:[{}],Emitters:[],SoloTracking:[],...(nodes.get(body.path)||{})}}};
    if(route==='/object/set'){
      if(require('./mock-import-policy.cjs').simulateTexturePolicyWrite(body,nodes))return {data:{failed_properties:[]}};
      const bad=Object.keys(body.properties).filter(k=>['note','_note','bUseLocalSpace','UnexpectedNativeField'].includes(k));
      if(bad.length)return {data:{failed_properties:bad}};
      const properties=JSON.parse(JSON.stringify(body.properties));
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
    if(body.function==='DuplicateAsset')return {data:{return_value:'True'}};
    if(body.function==='ExecutePythonCommandEx'){
      const code=body.args.PythonCommand;
   if(require('./mock-import-policy.cjs').simulatePolicy(code,nodes))return reply('');
      if(code.includes('import_asset_tasks'))return reply('FWLJSON:'+JSON.stringify(Object.keys(spec.textures||{}).map(k=>{const pkg=backend.makePlan(spec,'Fixture_01')['tex:'+k];return [pkg+'.'+pkg.split('/').pop()];})));
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
        return reply('FWLSAVE:'+JSON.stringify(entries.map(([key,pkg])=>({key,pkg,saved:!options.missingDisk,
          sc:options.missingDisk?'missing':options.addFail?'failed':options.disabled?'disabled':'added',reason:options.addFail?'Fixture P4 rejection':''}))));
      }
      return reply('');
    }
    if(body.function==='SetMetadataTag')return {data:{return_value:'True'}};
    if(body.function==='SaveAsset')return {data:{return_value:options.saveFail?'False':'True'}};
    throw Error('Unexpected fixture operation '+JSON.stringify(body));
  }
  backend=loadBackend(fake,()=>{},options.old?{htmlFile:savedHtml}:{});
  const it={as:'Fixture_01',dir:'D:/fixtures',spec,assets:backend.makePlan(spec,'Fixture_01')};
  return {backend,it,nodes,calls,run:()=>backend.importOne(it)};
}

(async()=>{
  const original=fixture(realSpec,{old:true});
  await assert.rejects(original.run(),/note/);
  const linked=[...original.nodes.values()].filter(n=>n.EmitterName).length;
  assert.equal(linked,2);assert.equal(original.calls.filter(c=>c.body.function==='SaveAsset').length,0);
  console.log('PASS historical RT4 package stops on note in the third emitter before final saving');
  if(process.argv.includes('--reproduce'))return;

  const real=fixture(realSpec);await real.run();
  assert.equal(real.nodes.get(real.it.assets.ps+'.'+real.it.assets.ps.split('/').pop()).Emitters.length,10);
  assert.equal([...real.nodes.keys()].filter(p=>p.includes(':ParticleModulePivotOffset_')).length,2);
  for(const [path,node] of [...real.nodes.entries()].filter(([p])=>p.includes(':ParticleModulePivotOffset_'))){
    assert.equal(node.PivotOffset,'(X=0.000000,Y=0.484600)');
    const links=[...real.nodes.values()].flatMap(n=>n.Modules||[]).filter(m=>m.path===path);
    assert.equal(links.length,1,'Each Pivot must be linked exactly once');
  }
  assert.equal(real.it.importProgress.saved.length,8);assert.equal(real.it.importProgress.added.length,8);
  assert(real.calls.filter(c=>c.body.function==='SaveAsset').every(c=>c.body.args.bOnlyIfIsDirty===false));
  assert(!real.calls.some(c=>c.route==='/object/set'&&('note'in c.body.properties||'_note'in c.body.properties)));
  console.log('PASS all 10 emitters, both pivots and 8 saved / added assets use the actual HTML importer');

  const simple={format:'fwl.cascade/1',name:'Fixture',textures:{},materials:{dot:{role:'soft_dot'}},emitters:[{name:'Rise',material:'dot',required:{local_space:true},modules:[{m:'InitialVelocity',StartVelocity:{const:[0,0,1]},note:'metadata',_note:'metadata'}]}]};
  const space=fixture(simple);await space.run();
  assert([...space.nodes.values()].some(n=>n.bUseInLocalSpace===true));
  console.log('PASS local-space field and both documented note fields');

  const typo=JSON.parse(JSON.stringify(realSpec));typo.emitters[2].modules[4].UnexpectedNativeField=1;
  const interrupted=fixture(typo);await assert.rejects(interrupted.run(),/UnexpectedNativeField/);
  assert.equal(interrupted.it.importProgress.saved.length,7);
  assert(!interrupted.calls.some(c=>c.body.function==='SaveAsset'&&c.body.args.AssetToSave===interrupted.it.assets.ps));
  console.log('PASS genuine invalid property still fails; dependencies survive; partial particle is not saved');

  const missing=fixture(simple,{missingDisk:true});await assert.rejects(missing.run(),/磁盘|文件/);
  const denied=fixture(simple,{addFail:true});await assert.rejects(denied.run(),/添加|版本管理/);
  const failed=fixture(simple,{saveFail:true});await assert.rejects(failed.run(),/保存失败/);
  const disabled=fixture(simple,{disabled:true});await disabled.run();assert.equal(disabled.it.importProgress.saved.length,1);assert.equal(disabled.it.importProgress.added.length,0);
  console.log('PASS absent disk file, rejected addition, save failure and disabled source control remain distinct');
  const centeredSpec=JSON.parse(JSON.stringify(realSpec));centeredSpec.emitters=[centeredSpec.emitters[0]];
  centeredSpec.emitters[0].required.pivot_offset=[-.5,-.5];
  const centered=fixture(centeredSpec);await centered.run();
  const centerPivots=[...centered.nodes.entries()].filter(([p])=>p.includes(':ParticleModulePivotOffset_'));
  assert.equal(centerPivots.length,1);assert.equal(centerPivots[0][1].PivotOffset,'(X=0.000000,Y=0.000000)');
  console.log('PASS internal center offset maps to native module zero');
  const omittedSpec=JSON.parse(JSON.stringify(centeredSpec));delete omittedSpec.emitters[0].required.pivot_offset;
  const omitted=fixture(omittedSpec);await omitted.run();
  assert.equal([...omitted.nodes.keys()].filter(p=>p.includes(':ParticleModulePivotOffset_')).length,0);
  console.log('PASS omitted pivot does not create a module');
  console.log('7 recovery checks passed with simulated UE; no engine writes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
