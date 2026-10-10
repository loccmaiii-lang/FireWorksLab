import test from 'node:test';
import assert from 'node:assert/strict';
import {engineRequest,readDirector,prepareImport,executeImport,same} from '../src/engine.mjs';

const bp='/Game/Shows/BP_Show.BP_Show',klass='/Game/Shows/BP_Show.BP_Show_C',cdo='/Game/Shows/BP_Show.Default__BP_Show_C';
const actor='/Game/Maps/Stage.Stage:PersistentLevel.Director_7';
const arrays=id=>({EffectSubTemplates:[{TemplateName:'Flower',Entries:[{FXResourceId:id}]}],EffectTemplates:[],EffectScheduleGroups:[]});
const desired=arrays('P_EFX_FireWorks_GoldCoreLime');
function fixture({currentActor=false,failActor=false,propagate=false,multiple=false}={}){
 const states=new Map([[cdo,{...arrays('P_EFX_FireWorks_FanComet_01'),TotalDuration:8,Keep:'blueprint'}],[actor,{...arrays(currentActor?'P_EFX_FireWorks_GoldCoreLime':'P_old'),TotalDuration:currentActor?10:8,Keep:'actor'}]]),calls=[],active=new Set();
 const request=async(route,p)=>{
  calls.push({route,...p});
  if(route==='/object/search')return {objects:p.class==='DFMShowDirector'?[{path:actor,class:'BP_Show_C'},...(multiple?[{path:actor+'2',class:'BP_Show_C'}]:[]),{path:'/Engine/Transient.World:PersistentLevel.Preview',class:'BP_Show_C'}]:[]};
  if(route==='/object/get'){
   if(p.path===bp)return {path:bp,properties:{GeneratedClass:{path:klass}}};
   const key=p.path===actor+'2'?actor:p.path;
   if(!states.has(key))throw Error('unexpected target '+p.path);
   return {path:p.path,class:klass,properties:{DefaultConfig:structuredClone(states.get(key)),DirectorId:'NewYear',ActorLabel:'Director_2',bShowActive:active.has(p.path)}};
  }
  if(route==='/object/set'){
   if(failActor&&p.path===actor)throw Error('actor write failed');
   const effects=JSON.parse(p.properties.DefaultConfig);states.set(p.path,{...states.get(p.path),...effects});
   if(propagate&&p.path===cdo)states.set(actor,{...states.get(actor),...effects});
   return {failed_properties:[]};
  }
  if(route==='/object/call'){assert.equal(p.args.AssetToSave,'/Game/Shows/BP_Show');return {return_value:'True'}}
  throw Error('unexpected route');
 };
 return {states,calls,request,active};
}
test('选场景会读取所属蓝图CDO，保留两个真实资源基线',async()=>{
 const f=fixture(),r=await readDirector(actor,{request:f.request});
 assert.equal(r.relatedTargets.length,1);assert.equal(r.relatedTargets[0].target.path,cdo);
 assert.equal(r.relatedTargets[0].config.EffectSubTemplates[0].Entries[0].FXResourceId,'P_EFX_FireWorks_FanComet_01');
 assert(f.calls.every(c=>c.route!=='/object/set'));
});
test('选蓝图找到唯一正式实例，排除预览世界；多个实例要求明确选择',async()=>{
 const f=fixture(),r=await readDirector(bp,{request:f.request});assert.equal(r.relatedTargets.length,1);assert.equal(r.relatedTargets[0].target.path,actor);
 await assert.rejects(readDirector(bp,{request:fixture({multiple:true}).request}),/多个.*实例/);
});
test('场景已新蓝图仍旧时只写旧CDO，回执不能漏蓝图',async()=>{
 const f=fixture({currentActor:true}),target=await readDirector(actor,{request:f.request}),plan=prepareImport(target,desired,10);
 const receipt=await executeImport(plan,{request:f.request,serialize:JSON.stringify});
 assert.equal(receipt.targets.length,2);assert(receipt.verified);assert(receipt.saved);assert(receipt.needsLevelSave);
 assert.deepEqual(f.calls.filter(c=>c.route==='/object/set').map(c=>c.path),[cdo]);
 assert.equal(f.states.get(cdo).EffectSubTemplates[0].Entries[0].FXResourceId,'P_EFX_FireWorks_GoldCoreLime');
 assert.equal(f.states.get(cdo).Keep,'blueprint');assert.equal(f.states.get(actor).Keep,'actor');
});
test('两个目标预检全部通过才写，关联目标并发变动或正在播放均阻止',async()=>{
 for(const playing of [false,true]){const f=fixture(),plan=prepareImport(await readDirector(actor,{request:f.request}),desired,10);
  if(playing)f.active.add(cdo);else f.states.get(cdo).Keep='foreign';
  await assert.rejects(executeImport(plan,{request:f.request,serialize:JSON.stringify}),playing?/播放/:/已改变/);
  assert.equal(f.calls.filter(c=>c.route==='/object/set').length,0);
 }
});
test('默认值传播后实例已有正确结果可跳过；未传播则两端完整写入核对',async()=>{
 for(const propagate of [false,true]){const f=fixture({propagate}),plan=prepareImport(await readDirector(bp,{request:f.request}),desired,10);
  const r=await executeImport(plan,{request:f.request,serialize:JSON.stringify});assert(r.verified);assert.equal(r.targets.length,2);
  assert.equal(f.calls.filter(c=>c.route==='/object/set').length,propagate?1:2);
  for(const config of f.states.values())assert(same(config.EffectSubTemplates,desired.EffectSubTemplates));
 }
});
test('第二目标明确写失败时恢复本轮第一目标，不保存半套节目',async()=>{
 const f=fixture({failActor:true}),before=structuredClone(f.states.get(cdo)),plan=prepareImport(await readDirector(bp,{request:f.request}),desired,10);
 const error=await executeImport(plan,{request:f.request,serialize:JSON.stringify}).catch(e=>e);
 assert.match(error.message,/actor write failed/);assert(same(f.states.get(cdo),before));assert.equal(f.calls.filter(c=>c.route==='/object/call').length,0);
});

test('写入及保存允许UE在20秒后完成，读取与显式短超时仍会中止',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const fetch=async(_url,{signal})=>new Promise((resolve,reject)=>{
  signal.addEventListener('abort',()=>reject(Object.assign(Error('aborted'),{name:'AbortError'})),{once:true});
  setTimeout(()=>resolve({ok:true,json:async()=>({success:true,data:{done:true}})}),20000);
 });
 for(const [route,payload,options,expected] of [
  ['/object/set',{properties:{DefaultConfig:'()'}},{},'success'],
  ['/object/call',{path:'/Script/EditorScriptingUtilities.Default__EditorAssetLibrary',function:'SaveAsset'},{},'success'],
  ['/object/get',{}, {},'timeout'],
  ['/object/set',{properties:{DefaultConfig:'()'}},{timeout:2000},'timeout']
 ]){
  const pending=engineRequest(route,payload,{fetch,...options}).catch(e=>e);
  t.mock.timers.tick(20000);const result=await pending;
  if(expected==='success')assert.equal(result.done,true);else assert.match(result.message,/超时/);
 }
});

test('超时后已执行的写入必须先重读，重新检查后跳过两端写入并保存',async()=>{
 const f=fixture({currentActor:true}),plan=prepareImport(await readDirector(actor,{request:f.request}),desired,10);
 const timedRequest=async(route,p)=>{const r=await f.request(route,p);if(route==='/object/set')throw Error('UE 请求超时');return r};
 await assert.rejects(executeImport(plan,{request:timedRequest,serialize:JSON.stringify}),/超时/);
 assert.equal(f.calls.filter(c=>c.route==='/object/set').length,1);
 assert.equal(f.calls.filter(c=>c.route==='/object/call').length,0);
 const checked=prepareImport(await readDirector(actor,{request:f.request}),desired,10);
 const receipt=await executeImport(checked,{request:f.request,serialize:JSON.stringify});
 assert(receipt.saved);assert(receipt.targets.every(t=>t.skipped));
 assert.equal(f.calls.filter(c=>c.route==='/object/set').length,1);
});
