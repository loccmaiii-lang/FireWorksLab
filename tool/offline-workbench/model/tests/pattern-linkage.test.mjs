import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {migrateNumbering} from '../src/point-numbering.mjs';
import {migrateSubTemplates} from '../src/subtemplate-model.mjs';
import {migrateChoreography,saveChoreography,placeChoreography} from '../src/choreography-model.mjs';
import {duplicateCue,applyCue,qualityEvents} from '../src/editing-model.mjs';
import {makeBackup,parseBackup} from '../src/workbench-data.mjs';
import {saveAndPlacePattern,patternLink,patternInstances,updatePatternInstance} from '../src/pattern-linkage.mjs';
const seed=migrateNumbering(JSON.parse(fs.readFileSync(new URL('../public/data/score24-v05.json',import.meta.url))));
const source=JSON.parse(fs.readFileSync(new URL('../public/data/subtemplate-source.json',import.meta.url)));
const doc=migrateChoreography(migrateSubTemplates(seed.doc,source.catalog));
const state={...seed,doc,tier:'high'};
const t=doc.templateLibrary.find(t=>t.id==='P_LIME');
const draft={id:'CH_LINK_TEST',name:'联动测试',calls:[['one',['P0','P8'],0],['two',['P4'],.4]].map(([id,pointIds,offsetS])=>({id,label:id,templateId:t.id,recipeRef:t.subTemplateRef,pointIds,offsetS,order:'together',gap:0,profiles:{medium:pointIds.slice(0,1),low:pointIds.slice(-1)}}))};
const make=()=>saveAndPlacePattern(state,draft,{anchorShowS:80});

test('reordered and added calls keep their own identities without remapping collisions',()=>{
 const p=make(),saved=p.doc.choreographyLibrary.at(-1),changed=structuredClone(saved);
 changed.calls=[changed.calls[1],{...structuredClone(changed.calls[0]),id:'three',label:'third',offsetS:1.2},changed.calls[0]];
 const d=saveChoreography(p.doc,changed),next=updatePatternInstance({...p,doc:d},p.instanceId,d.choreographyLibrary.at(-1).key);
 assert.equal(new Set(next.newIds).size,3);
 assert.equal(next.doc.cues.find(c=>c.choreographyCallId==='one'&&c.choreographyInstance===p.instanceId).id,p.newIds[0]);
 assert.equal(next.doc.cues.find(c=>c.choreographyCallId==='two'&&c.choreographyInstance===p.instanceId).id,p.newIds[1]);
 assert.equal(patternInstances(next.doc,draft.id)[0].cueIds.length,3);
});

test('entry-aligned update follows the same call when the template calls are reordered',()=>{
 const doc=saveChoreography(state.doc,draft),saved=doc.choreographyLibrary.at(-1);
 const p=placeChoreography({...state,doc},saved,{anchorShowS:80,alignment:'entry',alignedCallIndex:1,alignedEntryIndex:0});
 const changed=structuredClone(saved);changed.calls.reverse();
 const d=saveChoreography(p.doc,changed),next=updatePatternInstance({...p,doc:d},p.instanceId,d.choreographyLibrary.at(-1).key);
 const aligned=next.doc.cues.find(c=>c.choreographyInstance===p.instanceId&&c.choreographyCallId==='two');
 assert.equal(aligned.alignedCallIndex,0);assert.equal(aligned.anchorShowS,80);
 const old=p.doc.events.find(e=>e.cueId===p.newIds[1]),updated=next.doc.events.find(e=>e.cueId===aligned.id);
 assert.equal(updated.effectiveLaunch,old.effectiveLaunch);
});

test('save then instantiate atomically; each cue points to an actual immutable template version',()=>{
 const before=structuredClone(state),p=make();
 assert.equal(p.patternKey,'CH_LINK_TEST@1');assert.equal(p.savedTemplate,true);
 for(const id of p.newIds){const link=patternLink(p.doc,id);assert.equal(link.pattern.key,p.patternKey);assert.equal(link.cueIds.length,2)}
 assert.deepEqual(state,before);assert.equal(patternInstances(p.doc,draft.id).length,1);
 assert.deepEqual(parseBackup(JSON.stringify(makeBackup(p,seed)),seed).doc,p.doc);
});
test('reusing the exact version does not save another; edited draft cannot masquerade as saved version',()=>{
 const p=make(),saved=p.doc.choreographyLibrary.at(-1),second=saveAndPlacePattern(p,saved,{anchorShowS:100});
 assert.equal(second.savedTemplate,false);assert.equal(second.doc.choreographyLibrary.length,p.doc.choreographyLibrary.length);
 const dirty={...saved,name:'新版'},next=saveAndPlacePattern(p,dirty,{anchorShowS:110});
 assert.equal(next.patternKey,'CH_LINK_TEST@2');assert.equal(patternLink(next.doc,p.newIds[0]).pattern.key,'CH_LINK_TEST@1');
 assert.throws(()=>placeChoreography(p,dirty,{anchorShowS:100}),/保存|版本/);
});
test('placement failure saves neither an unused version nor half an instance',()=>{
 const before=structuredClone(state);assert.throws(()=>saveAndPlacePattern(state,draft,{anchorShowS:500}),/超过/);
 assert.throws(()=>saveAndPlacePattern(state,{...draft,calls:[{...draft.calls[0],pointIds:[]}]},{anchorShowS:80}),/点位/);
 assert.deepEqual(state,before);
});
test('explicit update preserves programme position, cue identity and membership; unrelated instance stays pinned',()=>{
 let p=make();p=saveAndPlacePattern(p,p.doc.choreographyLibrary.at(-1),{anchorShowS:110});const other=p.newIds;
 const first=patternInstances(p.doc,draft.id).find(g=>g.id!==p.instanceId),firstIds=first.cueIds;
 p.doc.cues.find(c=>c.id===firstIds[0]).programSectionId=p.doc.sections[0].id;
 const revised=structuredClone(draft);revised.name='新版联动';revised.calls[1].offsetS=.8;
 p={...p,doc:saveChoreography(p.doc,revised)};
 assert.equal(patternLink(p.doc,firstIds[0]).latest.version,2);
 const next=updatePatternInstance(p,first.id,'CH_LINK_TEST@2');
 assert.deepEqual(next.newIds,firstIds);assert.equal(next.doc.cues.find(c=>c.id===firstIds[1]).start,80.8);
 assert.equal(next.doc.cues.find(c=>c.id===firstIds[0]).programSectionId,p.doc.sections[0].id);
 assert(other.every(id=>patternLink(next.doc,id).pattern.version===1));
 for(const tier of ['medium','low'])assert(qualityEvents(next.doc,next.profiles,tier).filter(e=>firstIds.includes(e.cueId)).length>0);
 assert.equal(patternLink(p.doc,firstIds[0]).pattern.version,1);
});
test('copied/deleted/individually edited calls cannot cause an accidental whole-instance upgrade',()=>{
 const p=make(),copied=duplicateCue(p.doc,p.newIds[0]);const copy=copied.cues.find(c=>c.sourceCueId===p.newIds[0]);
 assert.notEqual(copy.choreographyInstance,p.instanceId);assert.equal(patternLink(copied,copy.id).cueIds.length,1);
 const revised=saveChoreography(copied,{...draft,name:'新版'}),s={...p,doc:revised};
 assert.throws(()=>updatePatternInstance(s,copy.choreographyInstance,'CH_LINK_TEST@2'),/完整|调用/);
 const edited={...p,doc:saveChoreography(applyCue(p.doc,p.newIds[0],{start:81}),{...draft,name:'新版'})};
 assert.throws(()=>updatePatternInstance(edited,p.instanceId,'CH_LINK_TEST@2'),/独立调整/);
 assert.equal(patternLink(doc,doc.cues[0].id),null);
});
test('out-of-show update is atomic and mixed versions in an instance are rejected',()=>{
 const p=make(),changed=structuredClone(draft);changed.calls[1].offsetS=300;
 const s={...p,doc:saveChoreography(p.doc,changed)},before=structuredClone(s);
 assert.throws(()=>updatePatternInstance(s,p.instanceId,'CH_LINK_TEST@2'),/超过/);assert.deepEqual(s,before);
 const bad=structuredClone(s);bad.doc.cues.find(c=>c.id===p.newIds[1]).choreographyRef='CH_LINK_TEST@2';
 assert.throws(()=>updatePatternInstance(bad,p.instanceId,'CH_LINK_TEST@2'),/版本|完整/);
});
