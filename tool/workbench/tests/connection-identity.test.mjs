import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDirector} from '../src/connection.mjs';
const config={EffectSubTemplates:[],EffectTemplates:[],EffectScheduleGroups:[]};
test('导演实例使用场景显示名，保留内部路径与真实DirectorId',async()=>{
 const path='/Game/Maps/Test.Test:PersistentLevel.BP_Director_7';
 const r=await resolveDirector(path,{request:async()=>({path,name:'BP_Director_7',class:'BP_Director_2_C',properties:{ActorLabel:'BP_Director_2',DirectorId:'FailedNewYear',DefaultConfig:config}})});
 assert.equal(r.name,'BP_Director_2');assert.equal(r.objectName,'BP_Director_7');assert.equal(r.path,path);assert.equal(r.directorId,'FailedNewYear');assert.equal(r.assetPath,null);
});
test('蓝图名称与无ActorLabel实例回退可用',async()=>{
 const path='/Game/BP_2.BP_2',r=await resolveDirector(path,{request:async(_,p)=>p.path===path?{properties:{GeneratedClass:{path:'/Game/BP_2.BP_2_C'}}}:{path:'/Game/BP_2.Default__BP_2_C',properties:{ActorLabel:'默认对象',DirectorId:'D',DefaultConfig:config}}});
 assert.equal(r.name,'BP_2');assert.equal(r.assetPath,'/Game/BP_2');
 const a=await resolveDirector('/Game/Map.Map:PersistentLevel.Actor_7',{request:async()=>({properties:{DirectorId:'D',DefaultConfig:config}})});assert.equal(a.name,'Actor_7');
});
