import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {migrateNumbering} from '../src/point-numbering.mjs';
import {qualityEvents,validateDoc,validateProfiles} from '../src/editing-model.mjs';
const old=JSON.parse(fs.readFileSync(new URL('./fixtures/legacy/score24-v05.json',import.meta.url)));
test('zero migration is atomic, idempotent and preserves actual show and tiers',()=>{
 const before=structuredClone(old),next=migrateNumbering(old),map=id=>id[0]+(Number(id.slice(1))-1);
 assert.deepEqual(old,before);assert.deepEqual(migrateNumbering(next),next);
 for(let i=0;i<old.doc.points.length;i++)assert.deepEqual(next.doc.points[i],{...old.doc.points[i],id:map(old.doc.points[i].id),name:map(old.doc.points[i].id)});
 for(let i=0;i<old.doc.events.length;i++)assert.deepEqual(next.doc.events[i],{...old.doc.events[i],pointId:map(old.doc.events[i].pointId),point:map(old.doc.events[i].point)});
 for(const tier of ['high','medium','low'])assert.deepEqual(qualityEvents(next.doc,next.profiles,tier).map(e=>e.id),qualityEvents(old.doc,old.profiles,tier).map(e=>e.id));
 assert.deepEqual(validateDoc(next.doc),[]);assert.deepEqual(validateProfiles(next.doc,next.profiles),[]);
 assert.deepEqual(next.doc.cues.map(c=>c.pointIds),old.doc.cues.map(c=>c.pointIds.map(map)));
 assert.equal(next.doc.meta.pointNumbering,0);
});
test('ambiguous mixed numbering is rejected instead of double decrement',()=>{
 const bad=structuredClone(old);bad.doc.points[0].id='P0';assert.throws(()=>migrateNumbering(bad),/编号/);
});
