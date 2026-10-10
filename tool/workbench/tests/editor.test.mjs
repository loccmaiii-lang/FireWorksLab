import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {editCue,fitHeight} from '../src/editor-state.mjs';
import {normalize,validateDoc} from '../src/editing-model.mjs';
const doc=normalize(JSON.parse(readFileSync(new URL('../public/data/score24-v05.json',import.meta.url))).doc);
const cue=doc.cues.find(c=>c.templateId==='F_GOLD'&&c.start>40);
const events=d=>d.events.filter(e=>e.cueId===cue.id);
test('launch and first bloom move only selected cue while retaining flight and overlap',()=>{
 for(const field of ['start','burstStart']){
  const next=editCue(doc,cue.id,{[field]:cue[field]+2});
  for(const e of events(doc)){
   const n=events(next).find(n=>n.id===e.id);
   for(const k of ['launch','burst','end'])assert.ok(Math.abs(n[k]-e[k]-2)<1e-5);
   assert.equal(n.dt,e.dt);
  }
  assert.deepEqual(next.events.filter(e=>e.cueId!==cue.id),doc.events.filter(e=>e.cueId!==cue.id));
  assert.deepEqual(validateDoc(next),[]);
 }
});
test('gap changes actual point spacing in original order and preserves repeats',()=>{
 const next=editCue(doc,cue.id,{gap:.37});
 const starts=cue.pointIds.map(p=>Math.min(...events(next).filter(e=>e.pointId===p).map(e=>e.launch))).sort((a,b)=>a-b);
 for(let i=1;i<starts.length;i++)assert.ok(Math.abs(starts[i]-starts[i-1]-.37)<1e-5);
 assert.equal(events(next).length,events(doc).length);
 assert.deepEqual(validateDoc(next),[]);
});
test('point membership updates events; last point and invalid timing rejected',()=>{
 const next=editCue(doc,cue.id,{pointIds:[cue.pointIds[0]]});
 assert.ok(events(next).every(e=>e.pointId===cue.pointIds[0]));
 assert.throws(()=>editCue(next,cue.id,{pointIds:[]}));
 assert.throws(()=>editCue(doc,cue.id,{start:-1}));
 assert.throws(()=>editCue(doc,cue.id,{burstStart:doc.meta.duration}));
 assert.throws(()=>editCue(doc,cue.id,{gap:-1}));
 assert.throws(()=>editCue(doc,cue.id,{start:''}));
 assert.throws(()=>editCue(doc,cue.id,{pointIds:['P1']}));
 assert.deepEqual(validateDoc(doc),[]);
});
test('splitter protects both panes at desktop and laptop heights',()=>{
 assert.equal(fitHeight(9999,768),349);
 assert.equal(fitHeight(-20,768),240);
 assert.equal(fitHeight(450,972),450);
});
test('direction changes preserve flight, and simultaneous starts clear unused interval',()=>{
 const spaced=editCue(doc,cue.id,{gap:.37});
 const right=editCue(spaced,cue.id,{order:'right'});
 const first=p=>Math.min(...events(right).filter(e=>e.pointId===p).map(e=>e.launch));
 assert.ok(first(cue.pointIds[0])>first(cue.pointIds.at(-1)));
 const together=editCue(right,cue.id,{order:'together'});
 assert.equal(together.cues.find(c=>c.id===cue.id).gap,0);
 assert.equal(new Set(events(together).map(e=>e.launch)).size,1);
 assert.deepEqual(validateDoc(together),[]);
});
