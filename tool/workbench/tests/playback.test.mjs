import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playRequest,isMusicTime} from '../src/playback.mjs';
const {doc}=JSON.parse(readFileSync(new URL('../public/data/score24-v05.json',import.meta.url)));
const cue=doc.cues.find(c=>c.templateId==='F_GOLD'&&c.start>40);
test('programme clock remains authoritative before music, after its end, and without an audio file',()=>{assert.equal(isMusicTime(2,3,2),false);assert.equal(isMusicTime(3,3,2),true);assert.equal(isMusicTime(5,3,2),false);assert.equal(isMusicTime(22,0,2),false);assert.equal(isMusicTime(0,0,0),false)});
test('cue play/replay seeks actual first launch and stops at last extinction',()=>{
 const events=doc.events.filter(e=>e.cueId===cue.id);
 const a=Math.min(...events.map(e=>e.launch+(e.dt||0))),b=Math.max(...events.map(e=>e.end+(e.dt||0)));
 const result=playRequest(doc,cue.id,'selection',a+1,true);
 assert.ok(Math.abs(result.time-a)<1e-6);assert.ok(Math.abs(result.end-b)<1e-6);
 assert.equal(playRequest(doc,cue.id,'selection',a+1,false).time,a+1);
 assert.ok(Math.abs(playRequest(doc,cue.id,'selection',b,false).time-a)<1e-6);
});
test('show playback resumes current time, replay starts at zero, missing selection fails',()=>{
 assert.equal(playRequest(doc,cue.id,'show',58,false).time,58);
 assert.equal(playRequest(doc,cue.id,'show',58,true).time,0);
 assert.equal(playRequest(doc,cue.id,'show',doc.meta.duration,false).time,0);
 assert.throws(()=>playRequest(doc,'missing','selection',0,true));
});
