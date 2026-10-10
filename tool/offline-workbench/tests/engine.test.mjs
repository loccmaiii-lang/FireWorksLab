import test from 'node:test';
import assert from 'node:assert/strict';
import {engineRequest,readDirector,prepareImport,executeImport,same,normalizePath} from '../engine.mjs';
const arrays={EffectSubTemplates:[{TemplateName:'TEST',Entries:[]}],EffectTemplates:[],EffectScheduleGroups:[]};
const before={...arrays,TotalDuration:8,KeepSetting:'unchanged'};
function fixture(options={}){
 let config=structuredClone(before),active=false;const calls=[];
 const transport=async(route,payload)=>{calls.push({route,payload});if(route==='/object/get')return {path:'/Game/Test.Test_C',properties:{DefaultConfig:structuredClone(config),DirectorId:7,bShowActive:active}};
 if(route==='/object/set'){if(options.failWrite)throw Error('write failed');config={...config,...JSON.parse(payload.properties.DefaultConfig)};if(options.failReadback)config.TotalDuration=999;return {failed_properties:[]};}
 if(route==='/object/call'){if(options.failSave)throw Error('save failed');return {return_value:'True'};}
 throw Error('unexpected route');};
 return {transport,calls,get config(){return config},set config(v){config=v},set active(v){active=v}};
}
const options=f=>({request:f.transport,serialize:JSON.stringify});
test('uses importer POST/text/plain and permits only loopback service',async()=>{
 let actual;await engineRequest('/object/get',{path:'/Game/X'}, {fetch:async(url,init)=>{actual={url,init};return {ok:true,json:async()=>({success:true,data:{ok:true}})}}});
 assert.equal(actual.url,'http://127.0.0.1:17780/gpcli/object/get');assert.equal(actual.init.method,'POST');assert.equal(actual.init.headers['Content-Type'],'text/plain');
 await assert.rejects(engineRequest('/object/get',{}, {base:'https://external.invalid/gpcli'}),/本机/);
 await assert.rejects(engineRequest('/object/call',{function:'ExecutePythonCommandEx'}),/不允许/);
});
test('path distinguishes BP assets and level actors without truncation',()=>{
 assert.equal(normalizePath("Blueprint'/Game/Test.Test'"),'/Game/Test.Test');
 assert.equal(normalizePath('/Game/Maps/Stage.Stage:PersistentLevel.Director'),'/Game/Maps/Stage.Stage:PersistentLevel.Director');
 assert.throws(()=>normalizePath('https://bad/path'),/路径/);
});
test('engine errors are surfaced instead of success labels',async()=>{
 await assert.rejects(engineRequest('/object/get',{}, {fetch:async()=>({ok:true,json:async()=>({success:false,message:'offline'})})}),/offline/);
});
test('readDirector resolves BP CDO and reads only matching real point actors',async()=>{
 const calls=[];const request=async(route,p)=>{calls.push(route);if(route==='/object/search')return {objects:[{path:'/Game/Map.Map:PersistentLevel.Point'},{path:'/Game/A.Default__Point_C'}]};
 if(p.path==='/Game/Test.Test')return {properties:{GeneratedClass:{path:'/Game/Test.Test_C'}}};
 if(p.path.includes('Default__'))return {path:p.path,properties:{DefaultConfig:before,DirectorId:7}};
 return {path:p.path,properties:{PointId:0,DirectorId:7,Bindings:[{GroupName:'P',SlotIndex:0}]}}};
 const r=await readDirector('/Game/Test',{request});assert.equal(r.target.path,'/Game/Test.Default__Test_C');assert.equal(r.points.length,1);assert(calls.every(x=>x==='/object/get'||x==='/object/search'));
});
test('wrong target or active director blocks import',()=>{
 assert.throws(()=>prepareImport({target:{path:'/Game/T'},config:{}},arrays,10),/三表/);
 assert.throws(()=>prepareImport({target:{path:'/Game/T'},config:before,active:true},arrays,10),/播放/);
});
function plan(){return prepareImport({target:{path:'/Game/Test.Default__Test_C',assetPath:'/Game/Test'},config:before,active:false},arrays,10)}
test('concurrent configuration change stops before any write',async()=>{
 const f=fixture();f.config={...before,KeepSetting:'changed'};await assert.rejects(executeImport(plan(),options(f)),/已改变/);assert(!f.calls.some(c=>c.route==='/object/set'));
});
test('director becoming active stops before any write',async()=>{
 const f=fixture();f.active=true;await assert.rejects(executeImport(plan(),options(f)),/播放/);assert(!f.calls.some(c=>c.route==='/object/set'));
});
test('only three arrays and duration change; verified then save BP',async()=>{
 const f=fixture(),r=await executeImport(plan(),options(f));assert.equal(r.saved,true);assert.equal(f.config.KeepSetting,'unchanged');assert.equal(f.config.TotalDuration,10);
 const write=f.calls.find(c=>c.route==='/object/set');assert.deepEqual(Object.keys(JSON.parse(write.payload.properties.DefaultConfig)).sort(),['EffectScheduleGroups','EffectSubTemplates','EffectTemplates','TotalDuration']);
 const order=f.calls.map(c=>c.route);assert.deepEqual(order,['/object/get','/object/set','/object/get','/object/call','/object/get']);
});
test('save failure preserves verified-write status without false success',async()=>{
 const f=fixture({failSave:true}),r=await executeImport(plan(),options(f));assert.equal(r.verified,true);assert.equal(r.saved,false);assert.match(r.saveError,/save failed/);
});
test('level actor is not silently saved as blueprint or entire level',async()=>{
 const p=plan();delete p.assetPath;p.path='/Game/Maps/M.M:PersistentLevel.D';const f=fixture();const r=await executeImport(p,options(f));assert.equal(r.saved,false);assert.equal(r.needsLevelSave,true);assert(!f.calls.some(c=>c.route==='/object/call'));
});
test('write failure has no false success',async()=>{
 const f=fixture({failWrite:true});await assert.rejects(executeImport(plan(),options(f)),/write failed/);
});
test('native structs/key order and harmless native float precision compare correctly',()=>{
 assert(same({X:1.2,Y:2,_struct:'Vector'},{Y:2,X:1.20000001}));assert(!same({X:1},{X:2}));
});
test('partial known write is rolled back and read back without saving',async()=>{
 let config=structuredClone(before),writes=0,saves=0;
 const request=async(route,p)=>{
  if(route==='/object/get')return {properties:{DefaultConfig:structuredClone(config),bShowActive:false}};
  if(route==='/object/call'){saves++;throw Error('must not save')}
  if(route==='/object/set'){writes++;const next=JSON.parse(p.properties.DefaultConfig);config={...config,...next};return {failed_properties:writes===1?['EffectTemplates']:[]};}
 };
 const error=await executeImport(plan(),{request,serialize:JSON.stringify}).catch(e=>e);
 assert.equal(error.rollbackVerified,true);assert(same(config,before));assert.equal(writes,2);assert.equal(saves,0);
});
test('foreign edit during failed write is not overwritten by rollback',async()=>{
 let config=structuredClone(before),writes=0;
 const request=async(route,p)=>{
  if(route==='/object/get')return {properties:{DefaultConfig:structuredClone(config),bShowActive:false}};
  if(route==='/object/set'){writes++;config={...config,...JSON.parse(p.properties.DefaultConfig),KeepSetting:'foreign edit'};return {failed_properties:['EffectTemplates']};}
 };
 const error=await executeImport(plan(),{request,serialize:JSON.stringify}).catch(e=>e);
 assert.equal(error.rollbackVerified,undefined);assert.equal(config.KeepSetting,'foreign edit');assert.equal(writes,1);
});
test('unknown readback values are not guessed or rolled back',async()=>{
 const f=fixture({failReadback:true});const error=await executeImport(plan(),options(f)).catch(e=>e);
 assert.match(error.message,/不一致/);assert.equal(error.rollbackVerified,undefined);assert.equal(f.config.TotalDuration,999);assert.equal(f.calls.filter(c=>c.route==='/object/set').length,1);
});
test('timed-out write does not retry or save because execution status is unknown',async()=>{
 const calls=[];const request=async(route)=>{calls.push(route);if(route==='/object/get')return {properties:{DefaultConfig:before,bShowActive:false}};throw Error('UE 请求超时')};
 await assert.rejects(executeImport(plan(),{request,serialize:JSON.stringify}),/超时/);assert.deepEqual(calls,['/object/get','/object/set']);
});
