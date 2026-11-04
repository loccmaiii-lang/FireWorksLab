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
   if(code.includes('# FWL_TEXTURE_FINGERPRINT')){
    const pkg=code.match(/pkg = u?["']([^"']+)["']/)[1];
    return reply('FWLFINGERPRINT:'+JSON.stringify({pkg,exists:true,class:'Texture2D',dirty:false,diskHash:sha(Buffer.from(pkg))}));
   }
   if(require('./mock-import-policy.cjs').simulatePolicy(code,nodes))return reply('');
   // 按实际下发的导入任务返回；同内容Ramp会去重，不能按合同键数伪造任务数。
   if(code.includes('import_asset_tasks')){
    const dirs=[...code.matchAll(/set_editor_property\('destination_path', '([^']+)'\)/g)].map(m=>m[1]);
    const names=[...code.matchAll(/set_editor_property\('destination_name', '([^']+)'\)/g)].map(m=>m[1]);
    return reply('FWLJSON:'+JSON.stringify(dirs.map((d,i)=>[d+'/'+names[i]+'.'+names[i]])));
   }
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
 // 对照本次改动前的实际2.26产物，旧模块的原生写入计划必须逐项不变。
 const legacy=simple([{m:'Lifetime',Lifetime:{const:2.5}},
  {m:'InitialSize',StartSize:{uniform:[[95,0,0],[105,0,0]]}},vel(),size(),
  {m:'ColorScaleOverLife',ColorScaleOverLife:{const:[1,.8,.4]},AlphaScaleOverLife:{const:.7}}]);
 const prior=fixture(legacy,path.join(__dirname,'backups/prism3-events-before/df-fx-workbench_v2_locmai.html')),now=fixture(legacy);
 await prior.run();await now.run();assert.deepEqual(clone([...now.nodes]),clone([...prior.nodes]));
 console.log('PASS 改动前2.26/当前2.27旧模块写入计划逐项相同');
 const source={m:'EventGenerator',Events:[{Type:'EPET_Death',CustomName:'BloomA',Frequency:1,ParticleFrequency:1}]};
 const receive={m:'EventReceiverSpawn',EventGeneratorType:'EPET_Death',EventName:'BloomA',SpawnCount:{const:1},bUseParticleTime:false,bUsePSysLocation:false,bInheritVelocity:true,InheritVelocityScale:{const:[.2,.2,.2]}};
 const spec=simple([source]);spec.emitters.push({...clone(spec.emitters[0]),name:'Bloom',spawn:{rate:{const:0},bursts:[]},modules:[receive]});
 const f=fixture(spec);assert.deepEqual(clone(f.backend.validate(spec)),[],'事件合同必须被识别');
 await f.run();
 assert.equal(f.modulesOf('Test','ParticleModuleEventGenerator').length,1);
 assert.equal(f.modulesOf('Bloom','ParticleModuleEventReceiverSpawn').length,1);
 const gen=f.modulesOf('Test','ParticleModuleEventGenerator')[0];
 assert.match(gen.properties.Events,/Type=EPET_Death/);assert.match(gen.properties.Events,/CustomName="BloomA"/);
 assert.equal(f.lodOf('Test').EventGenerator,gen.path);
 const recv=f.modulesOf('Bloom','ParticleModuleEventReceiverSpawn')[0];
 assert.equal(recv.properties.bUsePSysLocation,false);assert.equal(recv.properties.bInheritVelocity,true);
 const zero=clone(spec);zero.emitters[0].modules[0].Events[0].Frequency=0;zero.emitters[0].modules[0].Events[0].ParticleFrequency=0;
 assert.deepEqual(clone(fixture(zero).backend.validate(zero)),[],'原资产0频率必须可用');
 for(const change of [x=>x.emitters[0].gpu=true,x=>x.emitters[1].modules[0].EventName='Missing',x=>x.emitters[0].modules.push(clone(source)),x=>x.emitters[0].modules[0].Events[0].Frequency=-1,x=>x.emitters[1].modules[0].bUsePSysLocation='false']){const bad=clone(spec);change(bad);const t=fixture(bad);assert(t.backend.validate(bad).length>0);await assert.rejects(t.run());assert.equal(t.calls.length,0);}
 if(process.argv[2]){
   const actual=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),a=fixture(actual),report=[];
   a.item.textureHashes=Object.fromEntries(Object.entries(actual.textures).map(([k,t])=>[k,sha(fs.readFileSync(path.join(path.dirname(process.argv[2]),t.file)))]));
   assert.deepEqual(clone(a.backend.validate(actual)),[]);await a.run();
   for(const em of actual.emitters){
     const row={emitter:em.name};
     for(const md of em.modules){
       if(md.m==='EventGenerator'){
         const g=a.modulesOf(em.name,'ParticleModuleEventGenerator');assert.equal(g.length,1);
         assert.equal(a.lodOf(em.name).EventGenerator,g[0].path);
         for(const ev of md.Events)assert(g[0].properties.Events.includes('CustomName="'+ev.CustomName+'"'));
         row.generator={Events:g[0].properties.Events,LOD_reference_matches:true};
       }
       if(md.m==='EventReceiverSpawn'){
         const r=a.modulesOf(em.name,'ParticleModuleEventReceiverSpawn');assert.equal(r.length,1);
         for(const k of ['EventGeneratorType','EventName','bUseParticleTime','bUsePSysLocation','bInheritVelocity'])assert.equal(r[0].properties[k],md[k]);
         const count=a.distOf(r[0],'SpawnCount').properties,scale=a.distOf(r[0],'InheritVelocityScale').properties;
         assert.equal(count.Constant,md.SpawnCount.const);
         assert.deepEqual(vector(scale.Constant),md.InheritVelocityScale.const);
         row.receiver={properties:r[0].properties,SpawnCount:count.Constant,InheritVelocityScale:vector(scale.Constant)};
       }
     }
     report.push(row);
   }
   const output={status:'离线模拟导入通过；不是UE写入/读回',input_sha256:sha(fs.readFileSync(process.argv[2])),
     legacyRegression:{baseline_version:'2.26',current_version:'2.27',
      tested_modules:['Lifetime','InitialSize','VelocityOverLife','SizeByLife','ColorScaleOverLife'],
      baseline_plan_sha256:sha(Buffer.from(JSON.stringify([...prior.nodes]))),current_plan_sha256:sha(Buffer.from(JSON.stringify([...now.nodes]))),identical:true},emitters:report};
   if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(output,null,2));
   console.log('PASS 实际彩千轮候选'+actual.emitters.length+'发射器：原生模块/属性/分布/LOD引用；未连接UE');
 }
 console.log('PASS 事件创建、原生字段、LOD挂接、位置继承、5种非法输入；全部UE调用为模拟');
})().catch(e=>{console.error(e);process.exitCode=1;});
