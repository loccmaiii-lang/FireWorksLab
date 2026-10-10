import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {migrateNumbering} from '../src/point-numbering.mjs';
import {migrateSubTemplates} from '../src/subtemplate-model.mjs';
import {migrateChoreography,saveChoreography,placeChoreography} from '../src/choreography-model.mjs';
import {captureChoreography} from '../src/choreography-capture.mjs';
import {buildPatternPreview,replaceCallTemplate} from '../src/pattern-preview.mjs';
const seed=migrateNumbering(JSON.parse(fs.readFileSync(new URL('../public/data/score24-v05.json',import.meta.url))));
const source=JSON.parse(fs.readFileSync(new URL('../public/data/subtemplate-source.json',import.meta.url)));
const doc=migrateChoreography(migrateSubTemplates(seed.doc,source.catalog));
const original=captureChoreography({...seed,doc},['M4Q003','M4Q004'],{id:'CH_PREVIEW_TEST',name:'八调用复制测试'});
const changed=structuredClone(original);changed.calls[0]=replaceCallTemplate(doc,changed.calls[0],'P_LG');
changed.calls[0].pointIds=['P0','P2','P8'];changed.calls[0].profiles={medium:['P2'],low:[]};
changed.calls[0].order='together';changed.calls[0].launchJitter={maxS:.5,seed:42};

test('copy retains all eight calls, replacing one does not rewrite other flowers or source data',()=>{
 assert.equal(original.calls.length,8);assert.deepEqual(changed.calls.slice(1),original.calls.slice(1));
 assert.equal(original.calls[0].templateId,'P_SILVER');assert.equal(changed.calls[0].templateId,'P_LG');
 assert.equal(changed.calls[0].eventAdjustments,undefined);
 assert.equal(changed.calls[0].offsetS,original.calls[0].offsetS);
});
test('current-call preview excludes all seven other calls and every original-show event',()=>{
 const before=structuredClone(doc),p=buildPatternPreview(doc,changed,{scope:'current',callId:changed.calls[0].id});
 assert.equal(p.state.doc.cues.length,1);assert.equal(p.events.length,3);
 assert(p.events.every(e=>e.templateId==='P_LG'));assert.deepEqual(new Set(p.events.map(e=>e.pointId)),new Set(['P0','P2','P8']));
 assert(p.preview.events.every(e=>e.recipeKey==='ST_P_LG@1'));assert.deepEqual(doc,before);
 assert(!p.events.some(e=>doc.events.some(v=>v.id===e.id)));assert.equal(p.callCount,1);
});
test('all-call preview deliberately includes the retained flowers, ten launches, and pinned versions',()=>{
 const p=buildPatternPreview(doc,changed,{scope:'all'});assert.equal(p.state.doc.cues.length,8);assert.equal(p.events.length,10);
 assert.deepEqual(new Set(p.events.map(e=>e.templateId)),new Set(['P_LG','P_SILVER',doc.cues.find(c=>c.id==='M4Q004').templateId]));
 assert.equal(p.callCount,8);assert(p.preview.events.every(e=>e.recipeKey.endsWith('@1')));
});
test('three tiers filter the same deterministic times; zero-participation tier has a finite empty preview',()=>{
 const options={scope:'current',callId:changed.calls[0].id},h=buildPatternPreview(doc,changed,options),m=buildPatternPreview(doc,changed,{...options,tier:'medium'}),l=buildPatternPreview(doc,changed,{...options,tier:'low'});
 assert.equal(m.events.length,1);assert.equal(m.events[0].effectiveLaunch,h.events.find(e=>e.pointId==='P2').effectiveLaunch);
 assert.equal(m.begin,h.begin);assert.equal(l.events.length,0);assert.equal(l.empty,true);assert(Number.isFinite(l.end));
});
test('an unfinished other call does not block current-call audition, but whole preview and save still reject it',()=>{
 const p=structuredClone(changed);p.calls[1].pointIds=[];p.calls[1].profiles={medium:[],low:[]};
 assert.equal(buildPatternPreview(doc,p,{scope:'current',callId:p.calls[0].id}).events.length,3);
 assert.throws(()=>buildPatternPreview(doc,p,{scope:'all'}),/兼容|点位/);assert.throws(()=>saveChoreography(doc,p),/兼容|点位/);
 assert.throws(()=>buildPatternPreview(doc,p,{scope:'current',callId:'missing'}),/调用/);
});
test('replacement filters incompatible P/F/B points across all tiers, preserves jitter and exact timing',()=>{
 const c={...original.calls[0],launchJitter:{maxS:.5,seed:29}};const before=structuredClone(c),next=replaceCallTemplate(doc,c,'F_SILVER');
 assert.deepEqual(next.pointIds,[]);assert.deepEqual(next.profiles,{medium:[],low:[]});assert.deepEqual(next.launchJitter,c.launchJitter);
 assert.equal(next.offsetS,c.offsetS);assert.deepEqual(c,before);assert.equal(next.eventAdjustments,undefined);
 assert.throws(()=>replaceCallTemplate(doc,c,'not-a-flower'),/花型/);
});
test('selecting the same flower retains extracted transforms and fixed old version',()=>{
 const c={...original.calls[0],eventAdjustments:{scale:.4,dz:-70,tilt:12}};
 const same=replaceCallTemplate(doc,c,c.templateId);assert.deepEqual(same,c);assert.notEqual(same,c);
});
test('retained extracted transforms apply only to their source calls, new flower uses its own scale and offset',()=>{
 const p=buildPatternPreview(doc,changed,{scope:'all'});const cues=p.state.doc.cues;
 const newCue=cues.find(c=>c.choreographyCallId===changed.calls[0].id);
 for(const e of p.events.filter(e=>e.cueId===newCue.id)){assert.equal(e.scale,1);assert.equal(e.dz,0)}
 const retainedCue=cues.find(c=>c.choreographyCallId===changed.calls[1].id);
 assert.equal(p.events.find(e=>e.cueId===retainedCue.id).scale,original.calls[1].eventAdjustments.scale);
 const saved=saveChoreography(doc,changed),placed=placeChoreography({...seed,doc:saved,tier:'high'},saved.choreographyLibrary.at(-1),{anchorShowS:80});
 assert.equal(placed.newIds.length,8);assert.equal(placed.doc.events.length,doc.events.length+10);
 assert.equal(doc.choreographyLibrary.length,3);
});
test('negative and late relative calls can audition without inheriting programme time bounds',()=>{
 const p=structuredClone(changed);p.calls=p.calls.slice(0,2);p.calls[0].offsetS=-4.2;p.calls[1].offsetS=600;
 const v=buildPatternPreview(doc,p,{scope:'all'});assert.equal(v.callCount,2);assert(v.end>600);assert(Number.isFinite(v.begin));
});
