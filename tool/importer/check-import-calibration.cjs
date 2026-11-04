const assert=require('node:assert/strict');
const {loadBackend}=require('./import-backend.cjs');
const nodes=new Map(),calls=[];let counter=0;
async function fake(route,body){
  calls.push({route,body});
  if(route==='/object/get')return {success:true,data:{properties:{ForcePlatformSettings:[],LODDistances:[0],LODSettings:[{}],Emitters:[],SoloTracking:[],...(nodes.get(body.path)||{})}}};
  if(route==='/object/set'){
   if(require('./mock-import-policy.cjs').simulateTexturePolicyWrite(body,nodes))return {data:{failed_properties:[]}};
    if('bUseLocalSpace' in body.properties)return {data:{failed_properties:['bUseLocalSpace']}};
    const properties=JSON.parse(JSON.stringify(body.properties));
    for(const key of ['RequiredModule','SpawnModule','TypeDataModule'])if(typeof properties[key]==='string')properties[key]={path:properties[key]};
    if(properties.Emitters)properties.Emitters=[...properties.Emitters.matchAll(/ParticleSpriteEmitter'([^']+)'/g)].map(m=>({path:m[1]}));
    if(typeof properties.LODDistances==='string')properties.LODDistances=[0];
    if(typeof properties.LODSettings==='string')properties.LODSettings=[{}];
    nodes.set(body.path,{...(nodes.get(body.path)||{}),...properties});return {data:{failed_properties:[]}};
  }
  if(route==='/object/container'){
    const node=nodes.get(body.path)||{};
    const match=body.container_path.match(/^SoloTracking\[(\d+)\]\.SoloEnableSetting$/);
    const holder=match?node.SoloTracking[Number(match[1])]:node,key=match?'SoloEnableSetting':body.container_path;
    if(body.op==='array_remove')holder[key].splice(body.index,1);
    else holder[key]=[...(holder[key]||[]),key==='SoloTracking'?{SoloEnableSetting:[]}:typeof body.value==='number'?body.value:{path:body.value}];
    nodes.set(body.path,node);
    return {data:{ok:true}};
  }
  if(body.function==='SpawnObject'){
    const path=body.args.Outer+':'+body.args.ObjectClass.split('.').pop()+'_'+counter++;
    nodes.set(path,{});return {data:{return_value:path}};
  }
  if(body.function==='ExecutePythonCommandEx'){
    let output='';if(body.args.PythonCommand.includes("print('FWLP:'"))output='Output='+JSON.stringify('FWLP:'+body.args.PythonCommand.match(/lod = unreal.find_object\(None, '([^']+)'/)[1]);
    if(body.args.PythonCommand.includes("print('FWLSAVE:'")){
      const entries=JSON.parse(body.args.PythonCommand.match(/entries = (\[.*\])\n/)[1]);
      output='Output='+JSON.stringify('FWLSAVE:'+JSON.stringify(entries.map(([key,pkg])=>({key,pkg,saved:true,sc:'added'}))));
    }
    return {data:{return_value:'True',out_LogOutput:output}};
  }
  if(['SetMetadataTag','SaveAsset'].includes(body.function))return {data:{return_value:'True'}};
  throw Error('Unexpected fixture operation '+JSON.stringify(body));
}
(async()=>{
  const backend=loadBackend(fake,()=>{},{original:process.argv.includes('--original')});
  const spec={format:'fwl.cascade/1',name:'CalibrationFixture',textures:{},materials:{dot:{role:'soft_dot'}},
    emitters:[{name:'Rise',material:'dot',gpu:false,required:{duration_s:3.5,delay_s:0,loops:1,screen_alignment:'Velocity',local_space:true,pivot_offset:[-.5,-.0113]},
      spawn:{rate:{const:0},bursts:[[0,1]]},modules:[{m:'Lifetime',Lifetime:{const:3.5}}]}]};
  const assets=backend.makePlan(spec,'CalibrationFixture_01');
  await backend.importOne({as:'CalibrationFixture_01',dir:'D:/fixtures',spec,assets});
  const required=[...nodes.entries()].find(([path])=>path.includes('ParticleModuleRequired_'))[1];
  assert.equal(required.bUseInLocalSpace,true);
  assert.equal(required.EmitterDuration,3.5);
  const pivot=[...nodes.entries()].find(([path])=>path.includes('ParticleModulePivotOffset_'))[1];
  assert.equal(pivot.PivotOffset,'(X=0.000000,Y=0.488700)');
  assert(calls.some(c=>c.route==='/object/container'&&c.body.container_path==='Modules'&&c.body.value.includes('ParticleModulePivotOffset_')));
  assert(calls.filter(c=>c.body.function==='SaveAsset').every(c=>c.body.args.bOnlyIfIsDirty===false));
  console.log('Native local-space, pivot linkage, duration and persistence fixture passed; no UE writes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
