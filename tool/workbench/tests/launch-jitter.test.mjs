import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {migrateNumbering} from '../src/point-numbering.mjs';import {migrateSubTemplates,previewSubTemplates} from '../src/subtemplate-model.mjs';
import {migrateChoreography,placeFlower,saveChoreography,placeChoreography} from '../src/choreography-model.mjs';
import {editCue} from '../src/editor-state.mjs';import {qualityEvents,normalize,validateDoc} from '../src/editing-model.mjs';
import {newProgram,packProject,preflightProject} from '../src/program-project.mjs';import {captureChoreography} from '../src/choreography-capture.mjs';import {compileDirector} from '../src/director-model.mjs';
const read=n=>JSON.parse(fs.readFileSync(new URL('../public/data/'+n+'.json',import.meta.url))),seed=migrateNumbering(read('score24-v05')),state={...seed,doc:migrateChoreography(migrateSubTemplates(seed.doc,read('subtemplate-source').catalog))};
const empty=()=>newProgram(state,{name:'错开测试',id:'jitter',duration:120});
const t=state.doc.templateLibrary.find(t=>t.id==='P_LIME');
const flower=(config)=>({id:'ONE',name:'齐发微错开',calls:[{id:'one',label:'花型',templateId:t.id,recipeRef:t.subTemplateRef,pointIds:['P0','P4','P8'],offsetS:0,order:'together',gap:0,launchJitter:config,profiles:{medium:['P4','P8'],low:['P4']}}]});
test('multi-point together accepts optional jitter and shifts complete native flowers deterministically',()=>{
 const s=placeFlower(empty(),flower({maxS:.2,seed:17}),{anchorShowS:20});assert.deepEqual(validateDoc(s.doc),[]);const e=s.doc.events;assert.equal(new Set(e.map(x=>x.effectiveLaunch)).size,3);for(const x of e){assert(x.effectiveLaunch>=20&&x.effectiveLaunch<=20.2);assert(Math.abs(x.effectiveBurst-x.effectiveLaunch-(x.burst-x.launch))<1e-6)}
 assert.deepEqual(normalize(s.doc),s.doc);assert.deepEqual(placeFlower(empty(),flower({maxS:.2,seed:17}),{anchorShowS:20}).doc.events,e);
 for(const q of ['medium','low'])for(const x of qualityEvents(s.doc,s.profiles,q))assert.equal(x.effectiveLaunch,e.find(y=>y.id===x.id).effectiveLaunch);
 const r=compileDirector(s.doc,e);assert.deepEqual(r.issues,[]);const expanded=[];for(const g of r.arrays.EffectScheduleGroups)for(const slot of g.Slots)for(const parent of r.arrays.EffectTemplates.find(p=>p.TemplateName===slot.TemplateName).Entries)for(const n of r.arrays.EffectSubTemplates.find(p=>p.TemplateName===parent.SubTemplateName).Entries)expanded.push(+(slot.StartTime+parent.LocalTimeOffset+n.LocalTimeOffset).toFixed(6));assert.deepEqual(expanded.sort(),previewSubTemplates(s.doc,e).events.map(x=>x.effectiveLaunch).sort());
});
test('edit/reseed/disable jitter do not accumulate, alter original dt or change unrelated cues',()=>{
 const s=placeFlower(empty(),flower(undefined),{anchorShowS:20}),id=s.selectedCue,base=s.doc.events.map(e=>e.launch);const d=editCue(s.doc,id,{launchJitter:{maxS:.3,seed:1}});assert(new Set(d.events.map(e=>e.effectiveLaunch)).size>1);const n=editCue(d,id,{launchJitter:{maxS:.3,seed:2}});assert.notDeepEqual(n.events.map(e=>e.effectiveLaunch),d.events.map(e=>e.effectiveLaunch));const off=editCue(n,id,{launchJitter:{maxS:0,seed:2}});assert.deepEqual(off.events.map(e=>e.effectiveLaunch),base);assert.deepEqual(off.events.map(e=>e.dt),s.doc.events.map(e=>e.dt));assert.deepEqual(d.subTemplateLibrary,s.doc.subTemplateLibrary);
 const move=editCue(d,id,{start:30});assert.equal(Math.min(...move.events.map(e=>e.effectiveLaunch)),30);
});
test('jitter programme roundtrip and deliberate capture preserve actual starts without rerandomization',()=>{
 const s=placeFlower(empty(),flower({maxS:.15,seed:9}),{anchorShowS:20}),file=packProject(s,seed,{version:1}),restored=preflightProject(JSON.stringify(file),seed);assert.deepEqual(restored.doc.events,s.doc.events);const p=captureChoreography(s,[s.selectedCue],{id:'CAP',name:'已保存错开'}),d=saveChoreography(s.doc,p),n=placeChoreography({...s,doc:d},d.choreographyLibrary.at(-1),{anchorShowS:40});assert.equal(d.choreographyLibrary.length,4);const zero=Math.min(...s.doc.events.map(e=>e.effectiveLaunch));assert.deepEqual(n.doc.events.filter(e=>n.newIds.includes(e.cueId)).map(e=>+(e.effectiveLaunch-40).toFixed(6)).sort(),s.doc.events.map(e=>+(e.effectiveLaunch-zero).toFixed(6)).sort());
 const bad=structuredClone(file);bad.payload.doc.cues[0].launchJitter={maxS:-1,seed:9};assert.throws(()=>preflightProject(JSON.stringify(bad),seed),/随机错开/);
 for(const mutate of [b=>b.payload.doc.cues[0].launchJitter.seed++,b=>b.payload.doc.events[0].launchJitterS=-1,b=>b.payload.doc.events[0].launchJitterS=null]){const corrupt=structuredClone(file);mutate(corrupt);assert.throws(()=>preflightProject(JSON.stringify(corrupt),seed),/随机错开/)}
});
test('invalid jitter and past-show delays are rejected atomically; zero defaults keep old show identical',()=>{
 const s=empty(),before=JSON.stringify(s);for(const config of [{maxS:-1,seed:1},{maxS:Infinity,seed:1},{maxS:.2,seed:NaN}])assert.throws(()=>placeFlower(s,flower(config),{anchorShowS:20}),/随机错开/);assert.equal(JSON.stringify(s),before);
 assert.throws(()=>placeFlower(s,flower({maxS:60,seed:1}),{anchorShowS:115}),/超过/);
 const legacy=structuredClone(state.doc);assert.deepEqual(normalize(legacy),state.doc);assert.equal(state.doc.choreographyLibrary.length,3);
});
