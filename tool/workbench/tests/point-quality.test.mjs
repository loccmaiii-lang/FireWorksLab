import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pointSelection} from '../src/editor-state.mjs';
import {qualityEvents,setQualityPoints} from '../src/editing-model.mjs';
const {doc,profiles}=JSON.parse(readFileSync(new URL('../public/data/score24-v05.json',import.meta.url)));
test('single toggles selection; double toggles isolation independently of preceding click events',()=>{
 assert.deepEqual(pointSelection({point:'',solo:false},'F1','single'),{point:'F1',solo:false});
 assert.deepEqual(pointSelection({point:'F1',solo:false},'F1','single'),{point:'',solo:false});
 assert.deepEqual(pointSelection({point:'F1',solo:false},'F1','double'),{point:'F1',solo:true});
 assert.deepEqual(pointSelection({point:'F1',solo:true},'F1','double'),{point:'F1',solo:false});
 assert.deepEqual(pointSelection({point:'F1',solo:true},'F2','double'),{point:'F2',solo:true});
});
test('real quality tiers filter point programs without modifying shared timing',()=>{
 const before=JSON.stringify({doc,profiles});
 const [high,medium,low]=['high','medium','low'].map(t=>qualityEvents(doc,profiles,t));
 assert.equal(high.length,doc.events.length);assert.ok(low.length<medium.length&&medium.length<high.length);
 for(const e of [...medium,...low])assert.equal(e,doc.events.find(s=>s.id===e.id));
 const cue=doc.cues[0],next=setQualityPoints(doc,profiles,'low',cue.id,[]);
 assert.equal(qualityEvents(doc,next,'low').filter(e=>e.cueId===cue.id).length,0);
 assert.deepEqual(qualityEvents(doc,next,'high'),high);
 assert.equal(JSON.stringify({doc,profiles}),before);
});
