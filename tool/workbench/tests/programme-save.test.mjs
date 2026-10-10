import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyProgrammeSettings} from '../src/programme-settings.mjs';
import {createProgrammeSaver} from '../src/programme-save.mjs';
const seed=JSON.parse(fs.readFileSync(new URL('../public/data/score24-v05.json',import.meta.url)));
test('rename commits both visible names without changing programme identity, file version or arrangement',()=>{
 const before=JSON.stringify(seed),next=applyProgrammeSettings(seed,{programName:'  我的节目  ',duration:seed.doc.meta.duration});
 assert.equal(next.doc.meta.programName,'我的节目');assert.equal(next.doc.meta.name,'我的节目');assert.deepEqual(next.doc.events,seed.doc.events);assert.deepEqual(next.profiles,seed.profiles);assert.equal(next.doc.meta.programFileVersion,seed.doc.meta.programFileVersion);assert.equal(JSON.stringify(seed),before);
 assert.throws(()=>applyProgrammeSettings(seed,{programName:'   '}),/名称/);assert.throws(()=>applyProgrammeSettings(seed,{duration:''}),/时长/);
});
test('manual and automatic saves serialize immutable snapshots and atomically store current plus programme records; failure can retry',async()=>{
 const writes=[];let release;let count=0;
 const save=createProgrammeSaver(async entries=>{count++;if(count===1)await new Promise(r=>release=r);if(count===3)throw Error('quota');writes.push(entries)},'draft',seed);
 const a=applyProgrammeSettings(seed,{programName:'A'}),first=save(a),b=applyProgrammeSettings(seed,{programName:'B'}),second=save(b);b.doc.meta.programName='later mutation';
 await new Promise(setImmediate);release();await Promise.all([first,second]);assert.equal(writes.length,2);assert.equal(JSON.parse(writes[1][0][1]).doc.meta.programName,'B');assert.equal(writes[1].length,2);assert.equal(writes[1][0][1],writes[1][1][1]);assert.equal(writes[1][0][0],'draft');
 await assert.rejects(save(a),/quota/);await save(a);assert.equal(writes.length,3);
});
