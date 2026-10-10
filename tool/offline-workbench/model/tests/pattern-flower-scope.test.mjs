import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {migrateNumbering} from '../src/point-numbering.mjs';
import {migrateSubTemplates} from '../src/subtemplate-model.mjs';
import {migrateChoreography,saveChoreography,placeChoreography} from '../src/choreography-model.mjs';
import {captureChoreography} from '../src/choreography-capture.mjs';
import * as model from '../src/pattern-preview.mjs';
const seed=migrateNumbering(JSON.parse(fs.readFileSync(new URL('../public/data/score24-v05.json',import.meta.url))));
const source=JSON.parse(fs.readFileSync(new URL('../public/data/subtemplate-source.json',import.meta.url)));
const doc=migrateChoreography(migrateSubTemplates(seed.doc,source.catalog));
const captured=captureChoreography({...seed,doc},['M4Q003','M4Q004'],{id:'CH_FLOWER_SCOPE',name:'混合八调用'});
const mixed=structuredClone(captured);mixed.calls[0]=model.replaceCallTemplate(doc,mixed.calls[0],'P_LIME');
mixed.calls[0].pointIds=['P0','P8','P1','P2','P3','P4','P6','P5','P7'];
mixed.calls[0].profiles={medium:['P0','P2','P4','P6','P8'],low:['P0','P4','P8']};
mixed.calls[0].launchJitter={maxS:1,seed:37};
const replace=(pattern,options)=>model.replacePatternTemplate(doc,pattern,options);

test('whole-pattern lime replacement removes every other actual binding, not merely hiding seven calls',()=>{
 const before=structuredClone(mixed),next=replace(mixed,{scope:'all',templateId:'P_LIME'});
 assert.equal(next.calls.length,8);assert.deepEqual(new Set(next.calls.map(c=>c.templateId)),new Set(['P_LIME']));
 assert(next.calls.every(c=>c.recipeRef==='ST_P_LIME@1'));assert.deepEqual(mixed,before);
 const p=model.buildPatternPreview(doc,next);assert.equal(p.events.length,16);
 assert(p.events.every(e=>e.templateId==='P_LIME'));assert(p.preview.events.every(e=>e.recipeKey==='ST_P_LIME@1'));
});
test('whole replacement preserves call identity, offsets, chosen point order, profiles and deterministic jitter',()=>{
 const next=replace(mixed,{scope:'all',templateId:'P_LIME'});
 for(let i=0;i<8;i++)for(const key of ['id','label','offsetS','order','gap','pointIds','profiles','preserveSourceTiming','launchJitter'])assert.deepEqual(next.calls[i][key],mixed.calls[i][key]);
 for(let i=1;i<8;i++)assert.equal(next.calls[i].eventAdjustments,undefined);
 const h=model.buildPatternPreview(doc,next),m=model.buildPatternPreview(doc,next,{tier:'medium'}),l=model.buildPatternPreview(doc,next,{tier:'low'});
 for(const e of [...m.events,...l.events])assert.equal(e.effectiveLaunch,h.events.find(v=>v.id===e.id).effectiveLaunch);
});
test('explicit single-call replacement keeps other flowers and fixed recipe bindings unchanged',()=>{
 const next=replace(mixed,{scope:'current',callId:mixed.calls[1].id,templateId:'P_LIME'});
 assert.equal(next.calls[1].templateId,'P_LIME');assert.deepEqual(next.calls[0],mixed.calls[0]);assert.deepEqual(next.calls.slice(2),mixed.calls.slice(2));
 assert.deepEqual(new Set(model.buildPatternPreview(doc,next).events.map(e=>e.templateId)),new Set(['P_LIME','P_SILVER','P_MG']));
});
test('same flower can be applied again to repair a mixed copy; exact selected fixed version applies to every call',()=>{
 const altered=structuredClone(doc),old=structuredClone(doc.subTemplateLibrary.find(s=>s.key==='ST_P_LIME@1'));old.key='ST_P_LIME@2';old.version=2;
 altered.subTemplateLibrary.push(old);altered.templateLibrary.find(t=>t.id==='P_LIME').subTemplateRef=old.key;
 const next=model.replacePatternTemplate(altered,mixed,{scope:'all',templateId:'P_LIME',recipeRef:'ST_P_LIME@1'});
 assert(next.calls.every(c=>c.recipeRef==='ST_P_LIME@1'));assert.equal(next.calls[0].templateId,mixed.calls[0].templateId);
});
test('incompatible whole replacement fails atomically with the exact call and points, never silently trimming them',()=>{
 const before=structuredClone(mixed);
 assert.throws(()=>replace(mixed,{scope:'all',templateId:'F_LIME'}),/第 1 次调用.*P0/);assert.deepEqual(mixed,before);
 assert.throws(()=>replace(mixed,{scope:'all',templateId:doc.templateLibrary.find(t=>t.kind==='fan').id}),/不兼容/);assert.deepEqual(mixed,before);
 const next=replace(mixed,{scope:'current',callId:mixed.calls[0].id,templateId:'F_LIME'});assert.deepEqual(next.calls[0].pointIds,[]);
});
test('invalid scope, call and unrelated fixed version reject without modifying the draft',()=>{
 const before=structuredClone(mixed);
 assert.throws(()=>replace(mixed,{scope:'bad',templateId:'P_LIME'}),/范围/);
 assert.throws(()=>replace(mixed,{scope:'current',callId:'missing',templateId:'P_LIME'}),/调用/);
 assert.throws(()=>replace(mixed,{scope:'all',templateId:'P_LIME',recipeRef:'ST_P_MG@1'}),/固定版本/);
 assert.deepEqual(mixed,before);
});
test('whole preview, newly saved version and placed cues use only lime; original version and programme stay intact',()=>{
 const d=saveChoreography(doc,mixed),v1=d.choreographyLibrary.at(-1),before=structuredClone(d);
 const next=replace(v1,{scope:'all',templateId:'P_LIME'}),saved=saveChoreography(d,next),v2=saved.choreographyLibrary.at(-1);
 const placed=placeChoreography({...seed,doc:saved,tier:'high'},v2,{anchorShowS:80});
 assert.equal(v2.version,2);assert.deepEqual(saved.choreographyLibrary.find(p=>p.key===v1.key),v1);assert.deepEqual(d,before);
 assert.equal(placed.newIds.length,8);const events=placed.doc.events.filter(e=>placed.newIds.includes(e.cueId));
 assert.equal(events.length,16);assert(events.every(e=>e.templateId==='P_LIME'&&e.recipeRef==='ST_P_LIME@1'));
 assert.deepEqual(placed.doc.events.filter(e=>doc.events.some(v=>v.id===e.id)),doc.events);
});

test('single-call reselecting the same flower keeps its pinned old version instead of silently upgrading',()=>{
 const d=structuredClone(doc),v2=structuredClone(d.subTemplateLibrary.find(r=>r.key==='ST_P_LIME@1'));v2.key='ST_P_LIME@2';v2.version=2;d.subTemplateLibrary.push(v2);d.templateLibrary.find(t=>t.id==='P_LIME').subTemplateRef=v2.key;
 const next=model.replacePatternTemplate(d,mixed,{scope:'current',callId:mixed.calls[0].id,templateId:'P_LIME'});assert.deepEqual(next.calls[0],mixed.calls[0]);
});
