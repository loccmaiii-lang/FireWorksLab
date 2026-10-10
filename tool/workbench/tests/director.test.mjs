import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {migrateNumbering} from '../src/point-numbering.mjs';import {qualityEvents} from '../src/editing-model.mjs';
import {compileDirector} from '../src/director-model.mjs';
const seed=migrateNumbering(JSON.parse(fs.readFileSync(new URL('../public/data/score24-v05.json',import.meta.url))));
const sub={TemplateName:'Real',Entries:[{FXResourceId:'existing-id',LocalTimeOffset:0,PositionOffset:{X:0,Y:0,Z:0},RotationOffset:{Pitch:0,Yaw:0,Roll:0},EffectScale:{X:1,Y:1,Z:1},RandomPositionRange:{X:0,Y:0,Z:0},RandomRotationRange:{Pitch:0,Yaw:0,Roll:0},RandomScaleRatio:0,Filter:{PlatformFlags:14,MinQualityLevel:'EQuality_VeryLow'}}]};
const target={config:{EffectSubTemplates:[sub],EffectTemplates:[{TemplateName:'OLD'}],EffectScheduleGroups:[{GroupName:'OLD'}]},catalog:[{key:'real',sub}],points:seed.doc.points.map(p=>({pointId:p.id,bindings:[{GroupName:p.id[0],SlotIndex:+p.id.slice(1)}]}))};
const mapping=Object.fromEntries(seed.doc.templateLibrary.map(t=>[t.id,{source:'real',mode:'whole'}]));
test('three-array replacement expands to exact active score times/slots, without old schedule',()=>{for(const tier of ['high','medium','low']){
 const events=qualityEvents(seed.doc,seed.profiles,tier),before=JSON.stringify(target),r=compileDirector(seed.doc,events,target,mapping);
 assert.deepEqual(r.issues,[]);assert.equal(JSON.stringify(target),before);assert.equal(r.summary.eventCount,events.length);
 assert.deepEqual(r.arrays.EffectScheduleGroups.map(g=>g.GroupName),['P','B','F']);
 const expanded=r.arrays.EffectScheduleGroups.flatMap(g=>g.Slots.flatMap(s=>r.arrays.EffectTemplates.find(t=>t.TemplateName===s.TemplateName).Entries.map(e=>({point:g.GroupName+e.SlotIndex,time:Math.round((s.StartTime+e.LocalTimeOffset)*1e6)/1e6}))));
 const sort=a=>a.map(x=>JSON.stringify(x)).sort();assert.deepEqual(sort(expanded),sort(events.map(e=>({point:e.pointId,time:e.effectiveLaunch}))));
 assert(!JSON.stringify(r.arrays).includes('OLD'));assert(r.arrays.EffectTemplates.every(t=>[9,8,7].includes(t.RequiredPointCount)));
}});
test('missing source, missing slot, duplicate slot and unknown fan mode block property output',()=>{
 assert(compileDirector(seed.doc,seed.doc.events,target,{}).issues.length);
 const bad=structuredClone(target);bad.points.pop();assert(compileDirector(seed.doc,seed.doc.events,bad,mapping).issues.length);
 bad.points=structuredClone(target.points);bad.points.push(bad.points[0]);assert(compileDirector(seed.doc,seed.doc.events,bad,mapping).issues.length);
 const m=structuredClone(mapping);m.G_GOLD.mode='';assert(compileDirector(seed.doc,seed.doc.events,target,m).issues.length);
});
